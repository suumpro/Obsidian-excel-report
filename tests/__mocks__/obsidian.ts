/**
 * Mock for obsidian module
 * Provides minimal implementations for testing
 */

export class Notice {
  constructor(public message: string, public timeout?: number) {}
  hide() {}
  setMessage(message: string) {
    this.message = message;
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;
  stat: { mtime: number; size: number };

  constructor(path: string) {
    this.path = path;
    this.basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    this.extension = path.split('.').pop() || '';
    this.stat = { mtime: Date.now(), size: 0 };
  }
}

export class TFolder {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class FileSystemAdapter {
  getBasePath(): string {
    return '/mock-vault';
  }
}

export class Vault {
  adapter: FileSystemAdapter = new FileSystemAdapter();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    return null;
  }

  async read(file: TFile): Promise<string> {
    return '';
  }

  async cachedRead(file: TFile): Promise<string> {
    return '';
  }

  async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
    return new TFile(path);
  }

  async create(path: string, data: string): Promise<TFile> {
    return new TFile(path);
  }

  async createFolder(path: string): Promise<void> {}

  async modifyBinary(file: TFile, data: ArrayBuffer): Promise<void> {}

  getFiles(): TFile[] {
    return [];
  }

  static recurseChildren(root: TFolder, callback: (child: TFile | TFolder) => void): void {
    // No-op in mock - tests override via jest.spyOn
  }
}

export class App {
  vault: Vault;

  constructor() {
    this.vault = new Vault();
  }
}

export class Plugin {
  app: App;
  manifest: { id: string; name: string; version: string };

  constructor(app: App, manifest: { id: string; name: string; version: string }) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<unknown> {
    return {};
  }

  async saveData(data: unknown): Promise<void> {}

  addCommand(command: { id: string; name: string; callback: () => void }): void {}

  addRibbonIcon(icon: string, title: string, callback: () => void): void {}

  addSettingTab(tab: unknown): void {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {}
  hide(): void {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}
  setName(name: string): this { return this; }
  setDesc(desc: string): this { return this; }
  addText(cb: (text: unknown) => void): this { return this; }
  addToggle(cb: (toggle: unknown) => void): this { return this; }
  addDropdown(cb: (dropdown: unknown) => void): this { return this; }
}

export function addIcon(name: string, svg: string): void {}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}
