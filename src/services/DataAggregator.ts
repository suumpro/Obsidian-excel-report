/**
 * Data aggregation service
 * Coordinates loading data from multiple Obsidian files
 * Equivalent to Python aggregators/data_aggregator.py
 * v2.0 - Enhanced with ConfigManager support
 */

import { App } from 'obsidian';
import { VaultService } from './VaultService';
import { MarkdownParser } from './parsers';
import { CacheManager, createCacheKey } from './CacheManager';
import { ConfigManager } from './ConfigManager';
import { VaultScanner } from './VaultScanner';
import { ExcelAutomationSettings, SourceMappings } from '../types/settings';
import {
  DashboardData,
  RoadmapData,
  BlockerData,
  QuarterlyData,
  TaskMasterData,
  CustomerRequestData,
  AnnualMasterData,
  emptyDashboardData,
  emptyRoadmapData,
  emptyBlockerData,
  emptyQuarterlyData,
  emptyTaskMasterData,
  emptyCustomerRequestData,
  emptyAnnualMasterData,
} from '../types/data';
import type { ScanResult } from '../types/scan';
import { Feature, Priority } from '../types/models';
import { logger } from '../utils/logger';
import { parseDate, getQuarter, getWeekNumber } from '../utils/dateUtils';
import { isCompleted } from '../utils/statusUtils';

export class DataAggregator {
  private vault: VaultService;
  private parser: MarkdownParser;
  private cacheManager: CacheManager;
  private configManager?: ConfigManager;
  private scanCache: {
    dashboard: DashboardData;
    roadmap: RoadmapData;
    blockers: BlockerData;
    quarterly: QuarterlyData;
  } | null = null;

  constructor(
    private app: App,
    private settings: ExcelAutomationSettings,
    configManagerOrCache?: ConfigManager | CacheManager,
    cacheManager?: CacheManager
  ) {
    this.vault = new VaultService(app);

    // Handle both old signature (settings, cacheManager) and new (settings, configManager, cacheManager)
    if (configManagerOrCache instanceof ConfigManager) {
      this.configManager = configManagerOrCache;
      this.parser = new MarkdownParser(this.configManager.getParsing());
      this.cacheManager = cacheManager || new CacheManager();
    } else {
      this.parser = new MarkdownParser();
      this.cacheManager = configManagerOrCache || new CacheManager();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cacheManager.clear();
    this.scanCache = null;
  }

  /**
   * Preload data from folder scan mode
   * After calling this, individual load methods return the cached scan data
   */
  async preloadFromScan(scanFolders: string[]): Promise<void> {
    const allData = await this.loadFromScan(scanFolders);
    this.scanCache = {
      dashboard: allData.dashboard,
      roadmap: allData.roadmap,
      blockers: allData.blockers,
      quarterly: allData.quarterly,
    };
  }

  /**
   * Get full path for a source file
   * Uses ConfigManager sources if available, falls back to legacy settings
   */
  private getFullPath(relativePath: string): string {
    const basePath = this.configManager?.getSources().basePath || this.settings.basePath;
    return this.vault.getFullPath(basePath, relativePath);
  }

  /**
   * Load dashboard data from PM Dashboard file
   */
  async loadDashboardData(): Promise<DashboardData> {
    if (this.scanCache) return this.scanCache.dashboard;
    const dashboardSource = this.configManager?.getSources().dashboard || this.settings.sources.dashboard;
    const path = this.getFullPath(dashboardSource);
    const cacheKey = createCacheKey('dashboard', path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Dashboard file not found: ${path}`);
      return emptyDashboardData();
    }

    // Check cache first
    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<DashboardData>(cacheKey, mtime);
      if (cached) {
        return cached;
      }
    }

    try {
      const content = await this.vault.readFile(path);
      const { metadata, content: body } = this.parser.parseFile(content);

      const currentWeek = this.parser.extractCurrentWeek(body) || 0;
      const currentCycle = this.parser.extractCurrentCycle(body) || 'C1';

      const allTasks = this.parser.extractTasks(body);
      const p0Tasks: typeof allTasks = [];
      const p1Tasks: typeof allTasks = [];
      const p2Tasks: typeof allTasks = [];
      const unassignedTasks: typeof allTasks = [];
      for (const t of allTasks) {
        if (t.priority === 'P0') p0Tasks.push(t);
        else if (t.priority === 'P1') p1Tasks.push(t);
        else if (t.priority === 'P2') p2Tasks.push(t);
        else unassignedTasks.push(t);
      }

      logger.debug(`Loaded dashboard: ${allTasks.length} tasks (P0: ${p0Tasks.length}, P1: ${p1Tasks.length}, P2: ${p2Tasks.length}, unassigned: ${unassignedTasks.length})`);

      // Parse extended data (coordination, milestones, playbook)
      const coordination = this.parser.parseCoordination(body);
      const milestones = this.parser.parseMilestones(body);
      const playbook = this.parser.parsePlaybook(body);

      logger.debug(`Extended data: coordination=${coordination.length}, milestones=${milestones.length}, playbook=${playbook.length}`);

      const data: DashboardData = {
        currentWeek,
        currentCycle,
        currentDate: (metadata['last_updated'] as string) || '',
        p0Tasks,
        p1Tasks,
        p2Tasks,
        unassignedTasks,
        allTasks,
        metadata,
        coordination,
        milestones,
        playbook,
      };

      // Cache the result
      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }

      return data;
    } catch (error) {
      logger.error(`Error loading dashboard: ${error}`);
      return emptyDashboardData();
    }
  }

  /**
   * Load quarterly status data
   */
  async loadQuarterlyData(quarter: number): Promise<QuarterlyData> {
    if (this.scanCache) return this.scanCache.quarterly;
    // Get source path from config or legacy settings
    let sourcePath = '';
    if (this.configManager) {
      const quarterly = this.configManager.getSources().quarterly;
      const quarterKey = `q${quarter}` as 'q1' | 'q2' | 'q3' | 'q4';
      sourcePath = quarterly?.[quarterKey] || '';
    } else {
      const sourceKey = `q${quarter}Status` as keyof SourceMappings;
      sourcePath = this.settings.sources[sourceKey] || '';
    }

    if (!sourcePath) {
      logger.warn(`No source path configured for Q${quarter}`);
      return emptyQuarterlyData(quarter);
    }

    const path = this.getFullPath(sourcePath);
    const cacheKey = createCacheKey(`quarterly-q${quarter}`, path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Q${quarter} file not found: ${path}`);
      return emptyQuarterlyData(quarter);
    }

    // Check cache first
    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<QuarterlyData>(cacheKey, mtime);
      if (cached) {
        return cached;
      }
    }

    try {
      const content = await this.vault.readFile(path);
      const { content: body } = this.parser.parseFile(content);

      const allTasks = this.parser.extractTasks(body);
      const p0Tasks: typeof allTasks = [];
      const p1Tasks: typeof allTasks = [];
      const p2Tasks: typeof allTasks = [];
      const unassignedTasks: typeof allTasks = [];
      const completed: typeof allTasks = [];
      const pending: typeof allTasks = [];
      let p0Completed = 0, p0InProgress = 0;
      let p1Completed = 0, p1InProgress = 0;
      let p2Completed = 0, p2InProgress = 0;
      for (const t of allTasks) {
        if (t.priority === 'P0') {
          p0Tasks.push(t);
          if (t.status === 'completed') p0Completed++;
          else if (t.status === 'in_progress') p0InProgress++;
        } else if (t.priority === 'P1') {
          p1Tasks.push(t);
          if (t.status === 'completed') p1Completed++;
          else if (t.status === 'in_progress') p1InProgress++;
        } else if (t.priority === 'P2') {
          p2Tasks.push(t);
          if (t.status === 'completed') p2Completed++;
          else if (t.status === 'in_progress') p2InProgress++;
        } else {
          unassignedTasks.push(t);
        }
        if (t.status === 'completed') completed.push(t); else pending.push(t);
      }
      const total = allTasks.length;
      const completionRate = total > 0 ? (completed.length / total) * 100 : 0;

      logger.debug(`Loaded Q${quarter}: ${total} tasks, ${completionRate.toFixed(1)}% complete`);

      const data: QuarterlyData = {
        quarter,
        p0Tasks,
        p1Tasks,
        p2Tasks,
        unassignedTasks,
        completedTasks: completed,
        pendingTasks: pending,
        totalTasks: total,
        completionRate,
        p0Total: p0Tasks.length,
        p0Completed,
        p0InProgress,
        p0Pending: p0Tasks.length - p0Completed - p0InProgress,
        p1Total: p1Tasks.length,
        p1Completed,
        p1InProgress,
        p1Pending: p1Tasks.length - p1Completed - p1InProgress,
        p2Total: p2Tasks.length,
        p2Completed,
        p2InProgress,
        p2Pending: p2Tasks.length - p2Completed - p2InProgress,
      };

      // Cache the result
      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }

      return data;
    } catch (error) {
      logger.error(`Error loading Q${quarter} data: ${error}`);
      return emptyQuarterlyData(quarter);
    }
  }

  /**
   * Load roadmap feature data
   */
  async loadRoadmapData(): Promise<RoadmapData> {
    if (this.scanCache) return this.scanCache.roadmap;
    const roadmapSource = this.configManager?.getSources().roadmap || this.settings.sources.roadmap;
    const path = this.getFullPath(roadmapSource);
    const cacheKey = createCacheKey('roadmap', path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Roadmap file not found: ${path}`);
      return emptyRoadmapData();
    }

    // Check cache first
    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<RoadmapData>(cacheKey, mtime);
      if (cached) {
        return cached;
      }
    }

    try {
      const content = await this.vault.readFile(path);
      const { content: body } = this.parser.parseFile(content);

      const features = this.parser.parseFeatures(body);
      const { byPriority, byStatus, byQuarter } = this.classifyFeatures(features);

      logger.debug(`Loaded roadmap: ${features.length} features`);

      const data: RoadmapData = {
        features,
        featuresByPriority: byPriority,
        featuresByStatus: byStatus,
        q1Features: byQuarter[1],
        q2Features: byQuarter[2],
        q3Features: byQuarter[3],
        q4Features: byQuarter[4],
      };

      // Cache the result
      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }

      return data;
    } catch (error) {
      logger.error(`Error loading roadmap: ${error}`);
      return emptyRoadmapData();
    }
  }

  /**
   * Load blocker tracking data
   */
  async loadBlockerData(): Promise<BlockerData> {
    if (this.scanCache) return this.scanCache.blockers;
    const blockersSource = this.configManager?.getSources().blockers || this.settings.sources.blockers;
    const path = this.getFullPath(blockersSource);
    const cacheKey = createCacheKey('blockers', path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Blockers file not found: ${path}`);
      return emptyBlockerData();
    }

    // Check cache first
    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<BlockerData>(cacheKey, mtime);
      if (cached) {
        return cached;
      }
    }

    try {
      const content = await this.vault.readFile(path);
      const { content: body } = this.parser.parseFile(content);

      const blockers = this.parser.parseBlockers(body);

      // Group by priority
      const highPriority = blockers.filter(b =>
        ['높음', 'High', '高', 'high'].includes(b.priority)
      );
      const mediumPriority = blockers.filter(b =>
        ['중간', 'Medium', '中', 'medium'].includes(b.priority)
      );
      const lowPriority = blockers.filter(b =>
        ['낮음', 'Low', '低', 'low'].includes(b.priority)
      );

      // Group by owner
      const byOwner: Record<string, typeof blockers> = {};
      for (const b of blockers) {
        const owner = b.owner || 'Unassigned';
        if (!byOwner[owner]) byOwner[owner] = [];
        byOwner[owner].push(b);
      }

      logger.debug(`Loaded blockers: ${blockers.length} total (High: ${highPriority.length}, Medium: ${mediumPriority.length}, Low: ${lowPriority.length})`);

      const data: BlockerData = {
        allBlockers: blockers,
        highPriority,
        mediumPriority,
        lowPriority,
        byOwner,
      };

      // Cache the result
      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }

      return data;
    } catch (error) {
      logger.error(`Error loading blockers: ${error}`);
      return emptyBlockerData();
    }
  }

  /**
   * Load Task Master data for a specific quarter (Q1-Q4)
   */
  async loadTaskMasterData(quarter: number): Promise<TaskMasterData> {
    // Get path from configManager or legacy settings
    let sourcePath = '';
    if (this.configManager) {
      const taskMasters = this.configManager.getSources().taskMasters;
      const key = `q${quarter}` as 'q1' | 'q2' | 'q3' | 'q4';
      sourcePath = taskMasters?.[key] || '';
    } else {
      const key = `q${quarter}TaskMaster` as keyof SourceMappings;
      sourcePath = (this.settings.sources[key] as string) || '';
    }

    if (!sourcePath) {
      logger.debug(`No Task Master path configured for Q${quarter}`);
      return emptyTaskMasterData(quarter);
    }

    const path = this.getFullPath(sourcePath);
    const cacheKey = createCacheKey(`taskmaster-q${quarter}`, path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Task Master file not found: ${path}`);
      return emptyTaskMasterData(quarter);
    }

    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<TaskMasterData>(cacheKey, mtime);
      if (cached) return cached;
    }

    try {
      const content = await this.vault.readFile(path);
      const { metadata, content: body } = this.parser.parseFile(content);

      const allTasks = this.parser.extractTasks(body);
      const p0Tasks: typeof allTasks = [];
      const p1Tasks: typeof allTasks = [];
      for (const t of allTasks) {
        if (t.priority === 'P0') p0Tasks.push(t);
        else if (t.priority === 'P1') p1Tasks.push(t);
      }
      const weeklyBreakdowns = this.parser.parseWeeklyBreakdowns(body);
      const milestones = this.parser.parseMilestones(body);

      const data: TaskMasterData = {
        quarter,
        theme: (metadata['theme'] as string) || '',
        targetAcceptance: Number(metadata['target_acceptance']) || 0,
        weeklyBreakdowns,
        allTasks,
        p0Tasks,
        p1Tasks,
        milestones,
        frontmatter: metadata,
      };

      logger.debug(`Loaded Task Master Q${quarter}: ${allTasks.length} tasks, ${weeklyBreakdowns.length} weeks`);

      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }
      return data;
    } catch (error) {
      logger.error(`Error loading Task Master Q${quarter}: ${error}`);
      return emptyTaskMasterData(quarter);
    }
  }

  /**
   * Load Annual Task Master Index data
   */
  async loadAnnualMasterData(): Promise<AnnualMasterData> {
    let sourcePath = '';
    if (this.configManager) {
      sourcePath = this.configManager.getSources().taskMasters?.index || '';
    } else {
      sourcePath = this.settings.sources.taskMasterIndex || '';
    }

    if (!sourcePath) {
      return emptyAnnualMasterData();
    }

    const path = this.getFullPath(sourcePath);
    const cacheKey = createCacheKey('annual-master', path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Annual Master file not found: ${path}`);
      return emptyAnnualMasterData();
    }

    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<AnnualMasterData>(cacheKey, mtime);
      if (cached) return cached;
    }

    try {
      const content = await this.vault.readFile(path);
      const { metadata, content: body } = this.parser.parseFile(content);

      const ganttItems = this.parser.parseMermaidGantt(body);

      // Parse quarterly summary table
      const quarterSummaries: { quarter: number; period: string; theme: string; target: string; status: string }[] = [];
      // Try English heading first, then Korean fallback
      let tableRows = this.parser.parseTable(body, 'Quarterly');
      if (tableRows.length === 0) {
        tableRows = this.parser.parseTable(body, '분기별');
      }
      tableRows.forEach((row, i) => {
        quarterSummaries.push({
          quarter: i + 1,
          period: row['기간'] || row['Period'] || '',
          theme: row['테마'] || row['Theme'] || '',
          target: row['목표'] || row['Target'] || '',
          status: row['상태'] || row['Status'] || '',
        });
      });

      const data: AnnualMasterData = {
        year: Number(metadata['year']) || new Date().getFullYear(),
        quarterSummaries,
        ganttItems,
      };

      logger.debug(`Loaded Annual Master: ${ganttItems.length} Gantt items, ${quarterSummaries.length} quarters`);

      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }
      return data;
    } catch (error) {
      logger.error(`Error loading Annual Master: ${error}`);
      return emptyAnnualMasterData();
    }
  }

  /**
   * Load Customer Request tracking data
   */
  async loadCustomerRequestData(): Promise<CustomerRequestData> {
    let sourcePath = '';
    if (this.configManager) {
      sourcePath = this.configManager.getSources().customerRequests || '';
    } else {
      sourcePath = this.settings.sources.customerRequests || '';
    }

    if (!sourcePath) {
      return emptyCustomerRequestData();
    }

    const path = this.getFullPath(sourcePath);
    const cacheKey = createCacheKey('customer-requests', path);

    if (!this.vault.fileExists(path)) {
      logger.warn(`Customer Requests file not found: ${path}`);
      return emptyCustomerRequestData();
    }

    const mtime = this.vault.getFileMtime(path);
    if (mtime) {
      const cached = this.cacheManager.get<CustomerRequestData>(cacheKey, mtime);
      if (cached) return cached;
    }

    try {
      const content = await this.vault.readFile(path);
      const { metadata, content: body } = this.parser.parseFile(content);

      const requests = this.parser.parseCustomerRequests(body);

      // Group by priority
      const byPriority: Record<number, typeof requests> = {};
      for (const req of requests) {
        if (!byPriority[req.priority]) byPriority[req.priority] = [];
        byPriority[req.priority].push(req);
      }

      const completedCount = requests.filter(r =>
        isCompleted(r.status)
      ).length;

      const data: CustomerRequestData = {
        customer: (metadata['customer'] as string) || '',
        totalRequests: Number(metadata['total_requests']) || requests.length,
        byPriority,
        completedCount,
        requests,
      };

      logger.debug(`Loaded Customer Requests: ${requests.length} requests for ${data.customer}`);

      if (mtime) {
        this.cacheManager.set(cacheKey, data, mtime);
      }
      return data;
    } catch (error) {
      logger.error(`Error loading Customer Requests: ${error}`);
      return emptyCustomerRequestData();
    }
  }

  /**
   * Load all data sources
   */
  async loadAllData(): Promise<{
    dashboard: DashboardData;
    roadmap: RoadmapData;
    blockers: BlockerData;
    quarterly: QuarterlyData;
    taskMaster: TaskMasterData;
    annualMaster: AnnualMasterData;
    customerRequests: CustomerRequestData;
  }> {
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

    const [dashboard, roadmap, blockers, quarterly, taskMaster, annualMaster, customerRequests] = await Promise.all([
      this.loadDashboardData(),
      this.loadRoadmapData(),
      this.loadBlockerData(),
      this.loadQuarterlyData(currentQuarter),
      this.loadTaskMasterData(currentQuarter),
      this.loadAnnualMasterData(),
      this.loadCustomerRequestData(),
    ]);

    return { dashboard, roadmap, blockers, quarterly, taskMaster, annualMaster, customerRequests };
  }

  /**
   * Load all data from folder scan mode
   * Scans specified folders and converts results to standard data types
   */
  async loadFromScan(scanFolders: string[]): Promise<{
    dashboard: DashboardData;
    roadmap: RoadmapData;
    blockers: BlockerData;
    quarterly: QuarterlyData;
    taskMaster: TaskMasterData;
    annualMaster: AnnualMasterData;
    customerRequests: CustomerRequestData;
  }> {
    const scanner = new VaultScanner(this.app, this.parser, this.cacheManager);
    const scan = await scanner.scanMultipleFolders(scanFolders);

    logger.info(
      `[DataAggregator] Scan complete: ${scan.scannedFiles} files, ` +
      `${scan.tasks.length} tasks, ${scan.features.length} features, ` +
      `${scan.blockers.length} blockers`
    );

    const dashboard = this.buildDashboardFromScan(scan);
    const roadmap = this.buildRoadmapFromScan(scan);
    const blockers = this.buildBlockerDataFromScan(scan);
    const quarterly = this.buildQuarterlyFromScan(scan);

    return {
      dashboard,
      roadmap,
      blockers,
      quarterly,
      taskMaster: emptyTaskMasterData(),
      annualMaster: emptyAnnualMasterData(),
      customerRequests: emptyCustomerRequestData(),
    };
  }

  private buildDashboardFromScan(scan: ScanResult): DashboardData {
    const allTasks = scan.tasks;
    const p0Tasks: typeof allTasks = [];
    const p1Tasks: typeof allTasks = [];
    const p2Tasks: typeof allTasks = [];
    const unassignedTasks: typeof allTasks = [];
    for (const t of allTasks) {
      if (t.priority === 'P0') p0Tasks.push(t);
      else if (t.priority === 'P1') p1Tasks.push(t);
      else if (t.priority === 'P2') p2Tasks.push(t);
      else unassignedTasks.push(t);
    }

    const now = new Date();
    const weekNumber = getWeekNumber(now);

    return {
      currentWeek: weekNumber,
      currentCycle: 'C1',
      currentDate: now.toISOString().split('T')[0],
      p0Tasks,
      p1Tasks,
      p2Tasks,
      unassignedTasks,
      allTasks,
      metadata: { scanMode: true, scannedFiles: scan.scannedFiles },
      coordination: [],
      milestones: [],
      playbook: [],
    };
  }

  private buildRoadmapFromScan(scan: ScanResult): RoadmapData {
    const features = scan.features;
    const { byPriority, byStatus, byQuarter } = this.classifyFeatures(features);

    return {
      features,
      featuresByPriority: byPriority,
      featuresByStatus: byStatus,
      q1Features: byQuarter[1],
      q2Features: byQuarter[2],
      q3Features: byQuarter[3],
      q4Features: byQuarter[4],
    };
  }

  private buildBlockerDataFromScan(scan: ScanResult): BlockerData {
    const allBlockers = scan.blockers;

    const highPriority = allBlockers.filter(b =>
      ['높음', 'High', '高', 'high'].includes(b.priority)
    );
    const mediumPriority = allBlockers.filter(b =>
      ['중간', 'Medium', '中', 'medium'].includes(b.priority)
    );
    const lowPriority = allBlockers.filter(b =>
      ['낮음', 'Low', '低', 'low'].includes(b.priority)
    );

    const byOwner: Record<string, typeof allBlockers> = {};
    for (const b of allBlockers) {
      const owner = b.owner || 'Unassigned';
      if (!byOwner[owner]) byOwner[owner] = [];
      byOwner[owner].push(b);
    }

    return { allBlockers, highPriority, mediumPriority, lowPriority, byOwner };
  }

  private buildQuarterlyFromScan(scan: ScanResult): QuarterlyData {
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
    const allTasks = scan.tasks;

    const p0Tasks: typeof allTasks = [];
    const p1Tasks: typeof allTasks = [];
    const p2Tasks: typeof allTasks = [];
    const unassignedTasks: typeof allTasks = [];
    const completed: typeof allTasks = [];
    const pending: typeof allTasks = [];
    let p0Completed = 0, p0InProgress = 0;
    let p1Completed = 0, p1InProgress = 0;
    let p2Completed = 0, p2InProgress = 0;
    for (const t of allTasks) {
      if (t.priority === 'P0') {
        p0Tasks.push(t);
        if (t.status === 'completed') p0Completed++;
        else if (t.status === 'in_progress') p0InProgress++;
      } else if (t.priority === 'P1') {
        p1Tasks.push(t);
        if (t.status === 'completed') p1Completed++;
        else if (t.status === 'in_progress') p1InProgress++;
      } else if (t.priority === 'P2') {
        p2Tasks.push(t);
        if (t.status === 'completed') p2Completed++;
        else if (t.status === 'in_progress') p2InProgress++;
      } else {
        unassignedTasks.push(t);
      }
      if (t.status === 'completed') completed.push(t); else pending.push(t);
    }
    const total = allTasks.length;
    const completionRate = total > 0 ? (completed.length / total) * 100 : 0;

    return {
      quarter: currentQuarter,
      p0Tasks,
      p1Tasks,
      p2Tasks,
      unassignedTasks,
      completedTasks: completed,
      pendingTasks: pending,
      totalTasks: total,
      completionRate,
      p0Total: p0Tasks.length,
      p0Completed,
      p0InProgress,
      p0Pending: p0Tasks.length - p0Completed - p0InProgress,
      p1Total: p1Tasks.length,
      p1Completed,
      p1InProgress,
      p1Pending: p1Tasks.length - p1Completed - p1InProgress,
      p2Total: p2Tasks.length,
      p2Completed,
      p2InProgress,
      p2Pending: p2Tasks.length - p2Completed - p2InProgress,
    };
  }

  /**
   * Get the quarter number for a feature based on its completion date
   */
  private getFeatureQuarter(f: Feature): number | null {
    if (!f.completionDate) return null;
    for (let q = 1; q <= 4; q++) {
      if (f.completionDate.includes(`Q${q}`)) return q;
    }
    const parsed = parseDate(f.completionDate);
    return parsed ? getQuarter(parsed) : null;
  }

  /**
   * Classify features by priority, status, and quarter in a single pass
   */
  private classifyFeatures(features: Feature[]): {
    byPriority: Record<Priority, Feature[]>;
    byStatus: Record<string, Feature[]>;
    byQuarter: Record<number, Feature[]>;
  } {
    const byPriority: Record<Priority, Feature[]> = { P0: [], P1: [], P2: [] };
    const byStatus: Record<string, Feature[]> = {};
    const byQuarter: Record<number, Feature[]> = { 1: [], 2: [], 3: [], 4: [] };

    for (const f of features) {
      if (byPriority[f.priority as Priority]) {
        byPriority[f.priority as Priority].push(f);
      }
      if (!byStatus[f.status]) byStatus[f.status] = [];
      byStatus[f.status].push(f);
      const q = this.getFeatureQuarter(f);
      if (q && byQuarter[q]) byQuarter[q].push(f);
    }

    return { byPriority, byStatus, byQuarter };
  }
}
