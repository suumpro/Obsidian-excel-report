/**
 * Data aggregation service
 * Coordinates loading data from multiple Obsidian files
 * Equivalent to Python aggregators/data_aggregator.py
 * v2.0 - Enhanced with ConfigManager support
 */

import { App } from 'obsidian';
import { VaultService } from './VaultService';
import { MarkdownParser } from './MarkdownParser';
import { CacheManager, createCacheKey } from './CacheManager';
import { ConfigManager } from './ConfigManager';
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
import { Feature, Priority } from '../types/models';
import { logger } from '../utils/logger';

export class DataAggregator {
  private vault: VaultService;
  private parser: MarkdownParser;
  private cacheManager: CacheManager;
  private configManager?: ConfigManager;

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
   * Get source path from config or legacy settings
   */
  private getSourcePath(key: string): string {
    if (this.configManager) {
      const sources = this.configManager.getSources();
      // Handle quarterly sources specially
      if (key.startsWith('q') && key.endsWith('Status')) {
        const quarter = `q${key.charAt(1)}` as 'q1' | 'q2' | 'q3' | 'q4';
        return sources.quarterly?.[quarter] || '';
      }
      return (sources as unknown as Record<string, string>)[key] || '';
    }
    return (this.settings.sources as unknown as Record<string, string>)[key] || '';
  }

  /**
   * Load dashboard data from PM Dashboard file
   */
  async loadDashboardData(): Promise<DashboardData> {
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
      const p0Tasks = allTasks.filter(t => t.priority === 'P0');
      const p1Tasks = allTasks.filter(t => t.priority === 'P1');
      const p2Tasks = allTasks.filter(t => t.priority === 'P2');

      logger.debug(`Loaded dashboard: ${allTasks.length} tasks (P0: ${p0Tasks.length}, P1: ${p1Tasks.length}, P2: ${p2Tasks.length})`);

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
      const p0Tasks = allTasks.filter(t => t.priority === 'P0');
      const p1Tasks = allTasks.filter(t => t.priority === 'P1');
      const p2Tasks = allTasks.filter(t => t.priority === 'P2');

      const completed = allTasks.filter(t => t.status);
      const pending = allTasks.filter(t => !t.status);
      const total = allTasks.length;
      const completionRate = total > 0 ? (completed.length / total) * 100 : 0;

      // Calculate per-priority breakdowns
      const p0Completed = p0Tasks.filter(t => t.status).length;
      const p1Completed = p1Tasks.filter(t => t.status).length;
      const p2Completed = p2Tasks.filter(t => t.status).length;

      logger.debug(`Loaded Q${quarter}: ${total} tasks, ${completionRate.toFixed(1)}% complete`);

      const data: QuarterlyData = {
        quarter,
        p0Tasks,
        p1Tasks,
        p2Tasks,
        completedTasks: completed,
        pendingTasks: pending,
        totalTasks: total,
        completionRate,
        p0Total: p0Tasks.length,
        p0Completed,
        p0InProgress: p0Tasks.length - p0Completed,
        p0Pending: p0Tasks.length - p0Completed,
        p1Total: p1Tasks.length,
        p1Completed,
        p1InProgress: p1Tasks.length - p1Completed,
        p1Pending: p1Tasks.length - p1Completed,
        p2Total: p2Tasks.length,
        p2Completed,
        p2InProgress: p2Tasks.length - p2Completed,
        p2Pending: p2Tasks.length - p2Completed,
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

      // Group by priority
      const byPriority: Record<Priority, Feature[]> = {
        P0: features.filter(f => f.priority === 'P0'),
        P1: features.filter(f => f.priority === 'P1'),
        P2: features.filter(f => f.priority === 'P2'),
      };

      // Group by status
      const byStatus: Record<string, Feature[]> = {};
      for (const f of features) {
        const status = f.status;
        if (!byStatus[status]) byStatus[status] = [];
        byStatus[status].push(f);
      }

      // Group by quarter (based on completion date)
      const q1Features = features.filter(f =>
        f.completionDate?.includes('Q1') ||
        f.completionDate?.includes('1월') ||
        f.completionDate?.includes('2월') ||
        f.completionDate?.includes('3월')
      );
      const q2Features = features.filter(f =>
        f.completionDate?.includes('Q2') ||
        f.completionDate?.includes('4월') ||
        f.completionDate?.includes('5월') ||
        f.completionDate?.includes('6월')
      );
      const q3Features = features.filter(f =>
        f.completionDate?.includes('Q3') ||
        f.completionDate?.includes('7월') ||
        f.completionDate?.includes('8월') ||
        f.completionDate?.includes('9월')
      );
      const q4Features = features.filter(f =>
        f.completionDate?.includes('Q4') ||
        f.completionDate?.includes('10월') ||
        f.completionDate?.includes('11월') ||
        f.completionDate?.includes('12월')
      );

      logger.debug(`Loaded roadmap: ${features.length} features`);

      const data: RoadmapData = {
        features,
        featuresByPriority: byPriority,
        featuresByStatus: byStatus,
        q1Features,
        q2Features,
        q3Features,
        q4Features,
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
        b.priority === '높음' || b.priority === 'High'
      );
      const mediumPriority = blockers.filter(b =>
        b.priority === '중간' || b.priority === 'Medium'
      );
      const lowPriority = blockers.filter(b =>
        b.priority === '낮음' || b.priority === 'Low'
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
      const p0Tasks = allTasks.filter(t => t.priority === 'P0');
      const p1Tasks = allTasks.filter(t => t.priority === 'P1');
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
      const tableRows = this.parser.parseTable(body, '분기별');
      if (tableRows.length === 0) {
        // Try English heading
        const tableRowsEn = this.parser.parseTable(body, 'Quarterly');
        tableRowsEn.forEach((row, i) => {
          quarterSummaries.push({
            quarter: i + 1,
            period: row['기간'] || row['Period'] || '',
            theme: row['테마'] || row['Theme'] || '',
            target: row['목표'] || row['Target'] || '',
            status: row['상태'] || row['Status'] || '',
          });
        });
      } else {
        tableRows.forEach((row, i) => {
          quarterSummaries.push({
            quarter: i + 1,
            period: row['기간'] || row['Period'] || '',
            theme: row['테마'] || row['Theme'] || '',
            target: row['목표'] || row['Target'] || '',
            status: row['상태'] || row['Status'] || '',
          });
        });
      }

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
        r.status === '✅' || r.status.includes('완료') || r.status.includes('Complete')
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
}
