/**
 * Custom error classes for the Excel Automation Plugin
 * Provides specific error types with user-friendly messages and recovery hints
 */

/**
 * Base error for all plugin errors
 */
export abstract class PluginError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
  abstract readonly recoverable: boolean;
  readonly timestamp: Date = new Date();

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a JSON representation of the error for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
    };
  }

  /**
   * Get detailed error string for logging
   */
  toDetailedString(): string {
    let str = `[${this.code}] ${this.message}`;
    if (this.cause) {
      str += `\nCaused by: ${this.cause.message}`;
    }
    return str;
  }
}

/**
 * Error loading data from vault files
 */
export class DataLoadError extends PluginError {
  readonly code = 'DATA_LOAD_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly filePath: string,
    public readonly reason: 'not_found' | 'parse_error' | 'permission' | 'empty',
    cause?: Error
  ) {
    super(`Failed to load data from ${filePath}: ${reason}`, cause);
  }

  get userMessage(): string {
    switch (this.reason) {
      case 'not_found':
        return `파일을 찾을 수 없습니다: ${this.getFileName()}`;
      case 'parse_error':
        return `파일 파싱 오류: ${this.getFileName()}`;
      case 'permission':
        return `파일 접근 권한이 없습니다: ${this.getFileName()}`;
      case 'empty':
        return `파일이 비어있습니다: ${this.getFileName()}`;
    }
  }

  private getFileName(): string {
    return this.filePath.split('/').pop() || this.filePath;
  }
}

/**
 * Error generating Excel report
 */
export class ReportGenerationError extends PluginError {
  readonly code = 'REPORT_GEN_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly reportType: string,
    public readonly phase: 'init' | 'data' | 'sheet' | 'style' | 'buffer',
    public readonly sheetName?: string,
    cause?: Error
  ) {
    const location = sheetName ? `: ${sheetName}` : '';
    super(`Report generation failed at ${phase}${location}`, cause);
  }

  get userMessage(): string {
    const phaseMessages: Record<string, string> = {
      init: '리포트 초기화',
      data: '데이터 로딩',
      sheet: `시트 생성${this.sheetName ? ` (${this.sheetName})` : ''}`,
      style: '스타일 적용',
      buffer: '파일 생성',
    };
    return `${this.reportType} 리포트 생성 중 오류 발생 - ${phaseMessages[this.phase]}`;
  }
}

/**
 * Error writing file to vault
 */
export class FileWriteError extends PluginError {
  readonly code = 'FILE_WRITE_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly filePath: string,
    public readonly reason: 'permission' | 'disk_full' | 'invalid_path' | 'unknown',
    cause?: Error
  ) {
    super(`Failed to write file ${filePath}: ${reason}`, cause);
  }

  get userMessage(): string {
    switch (this.reason) {
      case 'permission':
        return '파일 저장 권한이 없습니다';
      case 'disk_full':
        return '디스크 공간이 부족합니다';
      case 'invalid_path':
        return '잘못된 저장 경로입니다';
      case 'unknown':
        return '파일 저장 중 오류가 발생했습니다';
    }
  }
}

/**
 * Error in settings or configuration validation
 */
export class ValidationError extends PluginError {
  readonly code = 'VALIDATION_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }

  get userMessage(): string {
    return `설정 오류: ${this.field} - ${this.reason}`;
  }
}

/**
 * Error in cache operations
 */
export class CacheError extends PluginError {
  readonly code = 'CACHE_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly operation: 'get' | 'set' | 'invalidate',
    public readonly key: string,
    cause?: Error
  ) {
    super(`Cache ${operation} failed for key: ${key}`, cause);
  }

  get userMessage(): string {
    return '캐시 작업 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

/**
 * Type guard to check if an error is a PluginError
 */
export function isPluginError(error: unknown): error is PluginError {
  return error instanceof PluginError;
}

/**
 * Type guard to check if an error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
  if (isPluginError(error)) {
    return error.recoverable;
  }
  return false;
}
