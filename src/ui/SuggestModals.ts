/**
 * Suggest Modals for folder and file browsing
 * Used by Setup Wizard and Settings UI
 */

import { App, FuzzySuggestModal, TFolder, TFile } from 'obsidian';

/**
 * Modal for selecting a folder from the vault
 */
export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  private onSelect: (folder: TFolder) => void;

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder('Type to search folders...');
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const rootFolder = this.app.vault.getRoot();
    this.collectFolders(rootFolder, folders);
    return folders;
  }

  private collectFolders(folder: TFolder, result: TFolder[]): void {
    result.push(folder);
    if (folder.children) {
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          this.collectFolders(child, result);
        }
      }
    }
  }

  getItemText(item: TFolder): string {
    return item.path || '/';
  }

  onChooseItem(item: TFolder): void {
    this.onSelect(item);
  }
}

/**
 * Modal for selecting a markdown file from the vault
 */
export class FileSuggestModal extends FuzzySuggestModal<TFile> {
  private onSelect: (file: TFile) => void;
  private basePath: string;

  constructor(app: App, onSelect: (file: TFile) => void, basePath: string = '') {
    super(app);
    this.onSelect = onSelect;
    this.basePath = basePath;
    this.setPlaceholder('Type to search files...');
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !this.basePath || f.path.startsWith(this.basePath))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  getItemText(item: TFile): string {
    // Show path relative to basePath if applicable
    if (this.basePath && item.path.startsWith(this.basePath)) {
      return item.path.slice(this.basePath.length).replace(/^\//, '');
    }
    return item.path;
  }

  onChooseItem(item: TFile): void {
    this.onSelect(item);
  }
}
