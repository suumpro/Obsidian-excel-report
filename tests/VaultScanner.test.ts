/**
 * Unit tests for VaultScanner
 */

import { App, TFile } from 'obsidian';
import { VaultScanner } from '../src/services/VaultScanner';
import { MarkdownParser } from '../src/services/parsers';
import { CacheManager } from '../src/services/CacheManager';
import { VaultService } from '../src/services/VaultService';
import type { Task, Feature, Blocker } from '../src/types/models';

// Mock VaultService
jest.mock('../src/services/VaultService');

describe('VaultScanner', () => {
  let app: App;
  let parser: MarkdownParser;
  let cache: CacheManager;
  let scanner: VaultScanner;
  let mockVaultService: jest.Mocked<VaultService>;

  const createTFile = (path: string, mtime = 1000): TFile => {
    const file = new TFile(path);
    file.stat = { mtime };
    return file;
  };

  const createTask = (content: string, overrides?: Partial<Task>): Task => ({
    content,
    status: false,
    tags: [],
    priority: null,
    dueDate: null,
    category: null,
    owner: null,
    rawLine: `- [ ] ${content}`,
    ...overrides,
  });

  const createFeature = (id: string, name: string, overrides?: Partial<Feature>): Feature => ({
    id,
    name,
    priority: 'P1',
    status: 'In Progress',
    startDate: null,
    completionDate: null,
    progress: 50,
    cycle: null,
    blocker: null,
    ...overrides,
  });

  const createBlocker = (id: string, title: string, overrides?: Partial<Blocker>): Blocker => ({
    id,
    title,
    priority: 'High',
    status: 'Unresolved',
    owner: 'Team',
    targetDate: '2026-03-01',
    impact: 'Blocks deployment',
    description: null,
    ...overrides,
  });

  beforeEach(() => {
    (VaultService as jest.MockedClass<typeof VaultService>).mockClear();
    app = new App();
    parser = new MarkdownParser();
    cache = new CacheManager();
    scanner = new VaultScanner(app, parser, cache);

    // Get the mocked VaultService instance (mockClear resets instances array)
    mockVaultService = (VaultService as jest.MockedClass<typeof VaultService>).mock.instances[0] as jest.Mocked<VaultService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('scanFolder', () => {
    it('should scan all markdown files in a folder', async () => {
      const files = [
        createTFile('Projects/notes/W06.md'),
        createTFile('Projects/notes/W07.md'),
      ];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('# Test\n- [ ] Task 1');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: '- [ ] Task 1',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([
        createTask('Task 1'),
      ]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      const result = await scanner.scanFolder('Projects/notes');

      expect(result.scannedFiles).toBe(2);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].sourceFile).toBe('Projects/notes/W06.md');
      expect(result.tasks[0].sourceFolder).toBe('Projects/notes');
      expect(result.tasks[1].sourceFile).toBe('Projects/notes/W07.md');
      expect(result.scanDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty folder', async () => {
      mockVaultService.getMarkdownFilesInFolder.mockReturnValue([]);

      const result = await scanner.scanFolder('empty-folder');

      expect(result.scannedFiles).toBe(0);
      expect(result.tasks).toEqual([]);
      expect(result.features).toEqual([]);
      expect(result.blockers).toEqual([]);
    });

    it('should extract tasks, features, and blockers', async () => {
      const files = [createTFile('Projects/roadmap.md')];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('# Roadmap');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: '# Roadmap',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([
        createTask('Implement feature A', { priority: 'P0' }),
      ]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([
        createFeature('A1', 'Feature A'),
      ]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([
        createBlocker('B1', 'API limit'),
      ]);

      const result = await scanner.scanFolder('Projects');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].content).toBe('Implement feature A');
      expect(result.tasks[0].sourceFile).toBe('Projects/roadmap.md');

      expect(result.features).toHaveLength(1);
      expect(result.features[0].name).toBe('Feature A');
      expect(result.features[0].sourceFile).toBe('Projects/roadmap.md');

      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].title).toBe('API limit');
      expect(result.blockers[0].sourceFile).toBe('Projects/roadmap.md');
    });

    it('should handle files without features or blockers', async () => {
      const files = [createTFile('notes/daily.md')];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('- [ ] Buy milk');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: '- [ ] Buy milk',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([
        createTask('Buy milk'),
      ]);
      jest.spyOn(parser, 'parseFeatures').mockImplementation(() => {
        throw new Error('No feature table found');
      });
      jest.spyOn(parser, 'parseBlockers').mockImplementation(() => {
        throw new Error('No blocker section found');
      });

      const result = await scanner.scanFolder('notes');

      expect(result.tasks).toHaveLength(1);
      expect(result.features).toEqual([]);
      expect(result.blockers).toEqual([]);
    });

    it('should compute sourceFolder correctly for root-level files', async () => {
      const files = [createTFile('note.md')];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('- [ ] Root task');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: '- [ ] Root task',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([
        createTask('Root task'),
      ]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      const result = await scanner.scanFolder('');

      expect(result.tasks[0].sourceFolder).toBe('');
    });
  });

  describe('scanMultipleFolders', () => {
    it('should merge results from multiple folders', async () => {
      const folder1Files = [createTFile('ProjectA/tasks.md')];
      const folder2Files = [createTFile('ProjectB/tasks.md')];

      mockVaultService.getMarkdownFilesInFolder
        .mockReturnValueOnce(folder1Files)
        .mockReturnValueOnce(folder2Files);

      mockVaultService.readFile.mockResolvedValue('content');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: 'content',
      });

      const taskA = createTask('Task A');
      const taskB = createTask('Task B');

      jest.spyOn(parser, 'extractTasks')
        .mockReturnValueOnce([taskA])
        .mockReturnValueOnce([taskB]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      const result = await scanner.scanMultipleFolders(['ProjectA', 'ProjectB']);

      expect(result.scannedFiles).toBe(2);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].sourceFile).toBe('ProjectA/tasks.md');
      expect(result.tasks[1].sourceFile).toBe('ProjectB/tasks.md');
      expect(result.scanDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty folder list', async () => {
      const result = await scanner.scanMultipleFolders([]);

      expect(result.scannedFiles).toBe(0);
      expect(result.tasks).toEqual([]);
      expect(result.features).toEqual([]);
      expect(result.blockers).toEqual([]);
    });
  });

  describe('caching', () => {
    it('should cache scan results by file mtime', async () => {
      const files = [createTFile('cached/file.md', 5000)];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('- [ ] Cached task');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: '- [ ] Cached task',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([
        createTask('Cached task'),
      ]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      // First scan - should parse
      await scanner.scanFolder('cached');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(1);

      // Second scan - should use cache (same mtime)
      await scanner.scanFolder('cached');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(1);
    });

    it('should re-parse when file mtime changes', async () => {
      const file = createTFile('changing/file.md', 5000);

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue([file]);
      mockVaultService.readFile.mockResolvedValue('content');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: 'content',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      // First scan
      await scanner.scanFolder('changing');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(1);

      // Change mtime
      file.stat.mtime = 6000;

      // Second scan - should re-parse due to new mtime
      await scanner.scanFolder('changing');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(2);
    });

    it('should clear cache via clearCache()', async () => {
      const files = [createTFile('cached/file.md', 5000)];

      mockVaultService.getMarkdownFilesInFolder.mockReturnValue(files);
      mockVaultService.readFile.mockResolvedValue('content');

      jest.spyOn(parser, 'parseFile').mockReturnValue({
        frontmatter: {},
        content: 'content',
      });
      jest.spyOn(parser, 'extractTasks').mockReturnValue([]);
      jest.spyOn(parser, 'parseFeatures').mockReturnValue([]);
      jest.spyOn(parser, 'parseBlockers').mockReturnValue([]);

      // First scan
      await scanner.scanFolder('cached');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(1);

      // Clear cache
      scanner.clearCache();

      // Third scan - should re-parse after cache clear
      await scanner.scanFolder('cached');
      expect(mockVaultService.readFile).toHaveBeenCalledTimes(2);
    });
  });
});
