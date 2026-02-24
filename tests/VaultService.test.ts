/**
 * Unit tests for VaultService
 */

import { App, TFile, TFolder, Vault, FileSystemAdapter } from 'obsidian';
import { VaultService } from '../src/services/VaultService';

describe('VaultService', () => {
  let app: App;
  let service: VaultService;

  beforeEach(() => {
    app = new App();
    service = new VaultService(app);
  });

  const createTFile = (path: string, mtime = 1000, size = 100): TFile => {
    const file = new TFile(path);
    file.stat = { mtime, size };
    return file;
  };

  describe('getFullPath', () => {
    it('should combine base path and relative path', () => {
      expect(service.getFullPath('project', 'docs/file.md')).toBe('project/docs/file.md');
    });

    it('should return normalized absolute path when relative path starts with /', () => {
      expect(service.getFullPath('project', '/absolute/file.md')).toBe('/absolute/file.md');
    });

    it('should normalize double slashes', () => {
      expect(service.getFullPath('project/', '/docs//file.md')).toBe('/docs/file.md');
    });
  });

  describe('readFile', () => {
    it('should read file content via cachedRead', async () => {
      const file = createTFile('test.md');
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(file);
      jest.spyOn(app.vault, 'cachedRead').mockResolvedValue('# Hello');

      const content = await service.readFile('test.md');
      expect(content).toBe('# Hello');
      expect(app.vault.cachedRead).toHaveBeenCalledWith(file);
    });

    it('should throw when file not found', async () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);

      await expect(service.readFile('missing.md')).rejects.toThrow('File not found');
    });

    it('should throw when path resolves to a folder', async () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(new TFolder('folder'));

      await expect(service.readFile('folder')).rejects.toThrow('File not found');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing TFile', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(createTFile('test.md'));
      expect(service.fileExists('test.md')).toBe(true);
    });

    it('should return false for TFolder', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(new TFolder('folder'));
      expect(service.fileExists('folder')).toBe(false);
    });

    it('should return false for null', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      expect(service.fileExists('missing.md')).toBe(false);
    });
  });

  describe('getFile', () => {
    it('should return TFile when found', () => {
      const file = createTFile('test.md');
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(file);
      expect(service.getFile('test.md')).toBe(file);
    });

    it('should return null for non-TFile', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(new TFolder('folder'));
      expect(service.getFile('folder')).toBeNull();
    });

    it('should return null when not found', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      expect(service.getFile('missing.md')).toBeNull();
    });
  });

  describe('getMarkdownFilesInFolder', () => {
    it('should return markdown files recursively', () => {
      const folder = new TFolder('docs');
      const mdFile = createTFile('docs/note.md');
      const txtFile = createTFile('docs/readme.txt');

      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(folder);
      jest.spyOn(Vault, 'recurseChildren').mockImplementation((_root, callback) => {
        callback(mdFile);
        callback(txtFile);
      });

      const result = service.getMarkdownFilesInFolder('docs');
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('docs/note.md');
    });

    it('should return empty array when folder not found', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      expect(service.getMarkdownFilesInFolder('missing')).toEqual([]);
    });

    it('should return empty array when path is a file', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(createTFile('file.md'));
      expect(service.getMarkdownFilesInFolder('file.md')).toEqual([]);
    });
  });

  describe('createBinaryFile', () => {
    const testData = new ArrayBuffer(8);

    it('should create new file when none exists', async () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      const createSpy = jest.spyOn(app.vault, 'createBinary').mockResolvedValue(createTFile('output/report.xlsx'));
      jest.spyOn(app.vault, 'createFolder').mockResolvedValue();

      const result = await service.createBinaryFile('output/report.xlsx', testData);
      expect(result.path).toBe('output/report.xlsx');
      expect(createSpy).toHaveBeenCalledWith('output/report.xlsx', testData);
    });

    it('should overwrite existing file', async () => {
      const existingFile = createTFile('output/report.xlsx');
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(existingFile);
      const modifySpy = jest.spyOn(app.vault, 'modifyBinary').mockResolvedValue();

      const result = await service.createBinaryFile('output/report.xlsx', testData);
      expect(result).toBe(existingFile);
      expect(modifySpy).toHaveBeenCalledWith(existingFile, testData);
    });
  });

  describe('ensureFolderExists', () => {
    it('should do nothing if folder already exists', async () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(new TFolder('existing'));
      const createSpy = jest.spyOn(app.vault, 'createFolder');

      await service.ensureFolderExists('existing');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should create folders recursively', async () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      const createSpy = jest.spyOn(app.vault, 'createFolder').mockResolvedValue();

      await service.ensureFolderExists('a/b/c');
      expect(createSpy).toHaveBeenCalledTimes(3);
      expect(createSpy).toHaveBeenCalledWith('a');
      expect(createSpy).toHaveBeenCalledWith('a/b');
      expect(createSpy).toHaveBeenCalledWith('a/b/c');
    });
  });

  describe('getVaultPath', () => {
    it('should return base path from FileSystemAdapter', () => {
      expect(service.getVaultPath()).toBe('/mock-vault');
    });

    it('should return empty string for non-FileSystemAdapter', () => {
      app.vault.adapter = {} as FileSystemAdapter;
      expect(service.getVaultPath()).toBe('');
    });
  });

  describe('getFileMtime', () => {
    it('should return mtime for existing file', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(createTFile('test.md', 12345));
      expect(service.getFileMtime('test.md')).toBe(12345);
    });

    it('should return null for missing file', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      expect(service.getFileMtime('missing.md')).toBeNull();
    });
  });

  describe('getFileStat', () => {
    it('should return stat for existing file', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(createTFile('test.md', 12345, 500));
      expect(service.getFileStat('test.md')).toEqual({ mtime: 12345, size: 500 });
    });

    it('should return null for missing file', () => {
      jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(null);
      expect(service.getFileStat('missing.md')).toBeNull();
    });
  });
});
