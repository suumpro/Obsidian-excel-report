/**
 * VaultScanner - Scans vault folders for tasks, features, and blockers
 * Core service for folder scan mode
 */

import { App, TFile } from 'obsidian';
import { VaultService } from './VaultService';
import { MarkdownParser } from './parsers';
import { CacheManager, createCacheKey } from './CacheManager';
import { logger } from '../utils/logger';
import type { Task, Feature, Blocker } from '../types/models';
import type {
  TaskWithSource,
  FeatureWithSource,
  BlockerWithSource,
  FileScanResult,
  ScanResult,
} from '../types/scan';

export class VaultScanner {
  private vault: VaultService;
  private parser: MarkdownParser;
  private cache: CacheManager;

  constructor(
    app: App,
    parser?: MarkdownParser,
    cache?: CacheManager,
  ) {
    this.vault = new VaultService(app);
    this.parser = parser || new MarkdownParser();
    this.cache = cache || new CacheManager();
  }

  /**
   * Scan a single folder for all markdown content
   */
  async scanFolder(folderPath: string): Promise<ScanResult> {
    const start = Date.now();
    const files = this.vault.getMarkdownFilesInFolder(folderPath);

    logger.info(`[VaultScanner] Scanning folder: ${folderPath} (${files.length} files)`);

    const allTasks: TaskWithSource[] = [];
    const allFeatures: FeatureWithSource[] = [];
    const allBlockers: BlockerWithSource[] = [];

    const settled = await Promise.allSettled(files.map(file => this.scanFile(file)));
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allTasks.push(...result.value.tasks);
        allFeatures.push(...result.value.features);
        allBlockers.push(...result.value.blockers);
      } else {
        logger.warn(`[VaultScanner] Failed to scan file: ${result.reason}`);
      }
    }

    const duration = Date.now() - start;
    logger.info(
      `[VaultScanner] Scan complete: ${files.length} files, ` +
      `${allTasks.length} tasks, ${allFeatures.length} features, ` +
      `${allBlockers.length} blockers (${duration}ms)`
    );

    return {
      tasks: allTasks,
      features: allFeatures,
      blockers: allBlockers,
      scannedFiles: files.length,
      scanDuration: duration,
    };
  }

  /**
   * Scan multiple folders and merge results
   */
  async scanMultipleFolders(folderPaths: string[]): Promise<ScanResult> {
    const start = Date.now();
    const allTasks: TaskWithSource[] = [];
    const allFeatures: FeatureWithSource[] = [];
    const allBlockers: BlockerWithSource[] = [];
    let totalFiles = 0;

    for (const folderPath of folderPaths) {
      const result = await this.scanFolder(folderPath);
      allTasks.push(...result.tasks);
      allFeatures.push(...result.features);
      allBlockers.push(...result.blockers);
      totalFiles += result.scannedFiles;
    }

    return {
      tasks: allTasks,
      features: allFeatures,
      blockers: allBlockers,
      scannedFiles: totalFiles,
      scanDuration: Date.now() - start,
    };
  }

  /**
   * Scan a single file with caching
   */
  private async scanFile(file: TFile): Promise<FileScanResult> {
    const cacheKey = createCacheKey('scan', file.path);
    const mtime = file.stat.mtime;

    // Check cache
    const cached = this.cache.get<FileScanResult>(cacheKey, mtime);
    if (cached) {
      return cached;
    }

    // Parse file
    const content = await this.vault.readFile(file.path);
    const { content: body } = this.parser.parseFile(content);

    const sourceFile = file.path;
    const sourceFolder = file.path.substring(0, file.path.lastIndexOf('/')) || '';

    // Extract tasks
    const rawTasks: Task[] = this.parser.extractTasks(body);
    const tasks: TaskWithSource[] = rawTasks.map(t => ({
      ...t,
      sourceFile,
      sourceFolder,
    }));

    // Extract features (from tables)
    let features: FeatureWithSource[] = [];
    try {
      const rawFeatures: Feature[] = this.parser.parseFeatures(body);
      features = rawFeatures.map(f => ({
        ...f,
        sourceFile,
      }));
    } catch (e) {
      if (logger.isDebugEnabled()) logger.debug(`[VaultScanner] No features in ${file.path}: ${e}`);
    }

    // Extract blockers
    let blockers: BlockerWithSource[] = [];
    try {
      const rawBlockers: Blocker[] = this.parser.parseBlockers(body);
      blockers = rawBlockers.map(b => ({
        ...b,
        sourceFile,
      }));
    } catch (e) {
      if (logger.isDebugEnabled()) logger.debug(`[VaultScanner] No blockers in ${file.path}: ${e}`);
    }

    const result: FileScanResult = { tasks, features, blockers };

    // Cache result
    this.cache.set(cacheKey, result, mtime);

    return result;
  }

  /**
   * Clear the scan cache
   */
  clearCache(): void {
    this.cache.invalidateByPattern('scan:');
  }
}
