/**
 * Wrapper for Obsidian Vault API operations
 */

import { App, TFile, TFolder, Vault, normalizePath, FileSystemAdapter } from 'obsidian';

export class VaultService {
  constructor(private app: App) {}

  /**
   * Get full path relative to vault root
   */
  getFullPath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return normalizePath(relativePath);
    }
    return normalizePath(`${basePath}/${relativePath}`);
  }

  /**
   * Read file content using Obsidian's cached read
   */
  async readFile(path: string): Promise<string> {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${normalizedPath}`);
    }

    return await this.app.vault.cachedRead(file);
  }

  /**
   * Check if file exists
   */
  fileExists(path: string): boolean {
    const normalizedPath = normalizePath(path);
    return this.app.vault.getAbstractFileByPath(normalizedPath) instanceof TFile;
  }

  /**
   * Get a TFile by path
   */
  getFile(path: string): TFile | null {
    const normalizedPath = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    return file instanceof TFile ? file : null;
  }

  /**
   * Get all markdown files in a folder
   */
  getMarkdownFilesInFolder(folderPath: string): TFile[] {
    const normalizedPath = normalizePath(folderPath);
    const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!(folder instanceof TFolder)) {
      return [];
    }

    const files: TFile[] = [];
    Vault.recurseChildren(folder, (child) => {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child);
      }
    });

    return files;
  }

  /**
   * Create or overwrite a binary file (for Excel output)
   */
  async createBinaryFile(path: string, data: ArrayBuffer): Promise<TFile> {
    const normalizedPath = normalizePath(path);

    // Ensure parent directory exists
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (parentPath) {
      await this.ensureFolderExists(parentPath);
    }

    // Check if file exists
    const existingFile = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (existingFile instanceof TFile) {
      // Overwrite existing file
      await this.app.vault.modifyBinary(existingFile, data);
      return existingFile;
    }

    // Create new file
    return await this.app.vault.createBinary(normalizedPath, data);
  }

  /**
   * Ensure a folder exists, creating it if necessary
   */
  async ensureFolderExists(folderPath: string): Promise<void> {
    const normalizedPath = normalizePath(folderPath);

    if (this.app.vault.getAbstractFileByPath(normalizedPath)) {
      return; // Already exists
    }

    // Create folder recursively
    const parts = normalizedPath.split('/');
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(currentPath);

      if (!existing) {
        await this.app.vault.createFolder(currentPath);
      }
    }
  }

  /**
   * Get vault root path
   */
  getVaultPath(): string {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    return '';
  }

  /**
   * Get file modification time (mtime)
   * @returns mtime in milliseconds or null if file doesn't exist
   */
  getFileMtime(path: string): number | null {
    const file = this.getFile(path);
    return file?.stat.mtime ?? null;
  }

  /**
   * Get file stats
   * @returns File stats or null if file doesn't exist
   */
  getFileStat(path: string): { mtime: number; size: number } | null {
    const file = this.getFile(path);
    if (!file) return null;
    return {
      mtime: file.stat.mtime,
      size: file.stat.size,
    };
  }
}
