/**
 * Unit tests for error handling modules
 */

import {
  PluginError,
  DataLoadError,
  ReportGenerationError,
  FileWriteError,
  ValidationError,
  CacheError,
  isPluginError,
  isRecoverable,
} from '../src/errors/PluginErrors';

import {
  handleError,
  withErrorHandling,
  withErrorHandlingSync,
  trySafe,
  trySafeSync,
  withRetry,
} from '../src/errors/errorHandler';

import { Notice } from 'obsidian';

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PluginErrors', () => {
  describe('DataLoadError', () => {
    it('should create error with not_found reason', () => {
      const error = new DataLoadError('/vault/data.json', 'not_found');

      expect(error.code).toBe('DATA_LOAD_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.filePath).toBe('/vault/data.json');
      expect(error.reason).toBe('not_found');
      expect(error.userMessage).toBe('파일을 찾을 수 없습니다: data.json');
      expect(error.message).toContain('Failed to load data from /vault/data.json');
    });

    it('should create error with parse_error reason', () => {
      const error = new DataLoadError('/vault/data.json', 'parse_error');
      expect(error.userMessage).toBe('파일 파싱 오류: data.json');
    });

    it('should create error with permission reason', () => {
      const error = new DataLoadError('/vault/data.json', 'permission');
      expect(error.userMessage).toBe('파일 접근 권한이 없습니다: data.json');
    });

    it('should create error with empty reason', () => {
      const error = new DataLoadError('/vault/data.json', 'empty');
      expect(error.userMessage).toBe('파일이 비어있습니다: data.json');
    });

    it('should extract filename from path', () => {
      const error = new DataLoadError('/vault/subfolder/nested/file.json', 'not_found');
      expect(error.userMessage).toContain('file.json');
    });

    it('should chain cause error', () => {
      const cause = new Error('Original error');
      const error = new DataLoadError('/vault/data.json', 'parse_error', cause);

      expect(error.cause).toBe(cause);
      expect(error.toDetailedString()).toContain('Caused by: Original error');
    });

    it('should serialize to JSON', () => {
      const error = new DataLoadError('/vault/data.json', 'not_found');
      const json = error.toJSON();

      expect(json.name).toBe('DataLoadError');
      expect(json.code).toBe('DATA_LOAD_ERROR');
      expect(json.recoverable).toBe(true);
      expect(json.timestamp).toBeDefined();
    });

    it('should include cause in JSON when present', () => {
      const cause = new Error('Original error');
      const error = new DataLoadError('/vault/data.json', 'parse_error', cause);
      const json = error.toJSON();

      expect(json.cause).toBe('Original error');
    });

    it('should create detailed string with cause', () => {
      const cause = new Error('File not readable');
      const error = new DataLoadError('/vault/data.json', 'permission', cause);
      const detailed = error.toDetailedString();

      expect(detailed).toContain('[DATA_LOAD_ERROR]');
      expect(detailed).toContain('Failed to load data from /vault/data.json');
      expect(detailed).toContain('Caused by: File not readable');
    });
  });

  describe('ReportGenerationError', () => {
    it('should create error at init phase', () => {
      const error = new ReportGenerationError('Weekly Report', 'init');

      expect(error.code).toBe('REPORT_GEN_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.reportType).toBe('Weekly Report');
      expect(error.phase).toBe('init');
      expect(error.userMessage).toBe('Weekly Report 리포트 생성 중 오류 발생 - 리포트 초기화');
    });

    it('should create error at data phase', () => {
      const error = new ReportGenerationError('Monthly', 'data');
      expect(error.userMessage).toBe('Monthly 리포트 생성 중 오류 발생 - 데이터 로딩');
    });

    it('should create error at sheet phase with sheet name', () => {
      const error = new ReportGenerationError('Quarterly', 'sheet', 'Q1 Summary');

      expect(error.sheetName).toBe('Q1 Summary');
      expect(error.userMessage).toBe('Quarterly 리포트 생성 중 오류 발생 - 시트 생성 (Q1 Summary)');
      expect(error.message).toContain(': Q1 Summary');
    });

    it('should create error at sheet phase without sheet name', () => {
      const error = new ReportGenerationError('Weekly', 'sheet');
      expect(error.userMessage).toBe('Weekly 리포트 생성 중 오류 발생 - 시트 생성');
      expect(error.sheetName).toBeUndefined();
    });

    it('should create error at style phase', () => {
      const error = new ReportGenerationError('Dashboard', 'style');
      expect(error.userMessage).toBe('Dashboard 리포트 생성 중 오류 발생 - 스타일 적용');
    });

    it('should create error at buffer phase', () => {
      const error = new ReportGenerationError('Export', 'buffer');
      expect(error.userMessage).toBe('Export 리포트 생성 중 오류 발생 - 파일 생성');
    });

    it('should chain cause error', () => {
      const cause = new Error('ExcelJS error');
      const error = new ReportGenerationError('Weekly', 'buffer', undefined, cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('FileWriteError', () => {
    it('should create error with permission reason', () => {
      const error = new FileWriteError('/vault/output.xlsx', 'permission');

      expect(error.code).toBe('FILE_WRITE_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.filePath).toBe('/vault/output.xlsx');
      expect(error.reason).toBe('permission');
      expect(error.userMessage).toBe('파일 저장 권한이 없습니다');
    });

    it('should create error with disk_full reason', () => {
      const error = new FileWriteError('/vault/output.xlsx', 'disk_full');
      expect(error.userMessage).toBe('디스크 공간이 부족합니다');
    });

    it('should create error with invalid_path reason', () => {
      const error = new FileWriteError('/vault/output.xlsx', 'invalid_path');
      expect(error.userMessage).toBe('잘못된 저장 경로입니다');
    });

    it('should create error with unknown reason', () => {
      const error = new FileWriteError('/vault/output.xlsx', 'unknown');
      expect(error.userMessage).toBe('파일 저장 중 오류가 발생했습니다');
    });

    it('should chain cause error', () => {
      const cause = new Error('ENOSPC');
      const error = new FileWriteError('/vault/output.xlsx', 'disk_full', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field and reason', () => {
      const error = new ValidationError('outputPath', '경로가 올바르지 않습니다');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.field).toBe('outputPath');
      expect(error.reason).toBe('경로가 올바르지 않습니다');
      expect(error.userMessage).toBe('설정 오류: outputPath - 경로가 올바르지 않습니다');
    });

    it('should include field and reason in message', () => {
      const error = new ValidationError('maxRetries', 'must be positive');
      expect(error.message).toContain('maxRetries');
      expect(error.message).toContain('must be positive');
    });
  });

  describe('CacheError', () => {
    it('should create error with get operation', () => {
      const error = new CacheError('get', 'dashboard-data');

      expect(error.code).toBe('CACHE_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.operation).toBe('get');
      expect(error.key).toBe('dashboard-data');
      expect(error.userMessage).toBe('캐시 작업 중 오류가 발생했습니다. 다시 시도해주세요.');
    });

    it('should create error with set operation', () => {
      const error = new CacheError('set', 'user-settings');
      expect(error.operation).toBe('set');
      expect(error.message).toContain('Cache set failed');
    });

    it('should create error with invalidate operation', () => {
      const error = new CacheError('invalidate', 'reports-*');
      expect(error.operation).toBe('invalidate');
      expect(error.message).toContain('Cache invalidate failed');
    });

    it('should chain cause error', () => {
      const cause = new Error('Storage quota exceeded');
      const error = new CacheError('set', 'large-data', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('isPluginError', () => {
    it('should return true for DataLoadError', () => {
      const error = new DataLoadError('/vault/data.json', 'not_found');
      expect(isPluginError(error)).toBe(true);
    });

    it('should return true for all PluginError subclasses', () => {
      expect(isPluginError(new ReportGenerationError('Test', 'init'))).toBe(true);
      expect(isPluginError(new FileWriteError('/test', 'unknown'))).toBe(true);
      expect(isPluginError(new ValidationError('field', 'reason'))).toBe(true);
      expect(isPluginError(new CacheError('get', 'key'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isPluginError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isPluginError('string')).toBe(false);
      expect(isPluginError(null)).toBe(false);
      expect(isPluginError(undefined)).toBe(false);
      expect(isPluginError(42)).toBe(false);
      expect(isPluginError({})).toBe(false);
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable errors', () => {
      const error = new DataLoadError('/vault/data.json', 'not_found');
      expect(isRecoverable(error)).toBe(true);
    });

    it('should return true for all recoverable error types', () => {
      expect(isRecoverable(new ValidationError('field', 'reason'))).toBe(true);
      expect(isRecoverable(new CacheError('get', 'key'))).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const error = new ReportGenerationError('Test', 'init');
      expect(isRecoverable(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isRecoverable(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isRecoverable('string')).toBe(false);
      expect(isRecoverable(null)).toBe(false);
      expect(isRecoverable(undefined)).toBe(false);
    });
  });
});

describe('errorHandler', () => {
  describe('trySafe', () => {
    it('should return success result for successful async function', async () => {
      const result = await trySafe(async () => 'success value');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success value');
      }
    });

    it('should return error result for failed async function', async () => {
      const error = new Error('Test error');
      const result = await trySafe(async () => {
        throw error;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('trySafeSync', () => {
    it('should return success result for successful sync function', () => {
      const result = trySafeSync(() => 42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should return error result for failed sync function', () => {
      const error = new Error('Sync error');
      const result = trySafeSync(() => {
        throw error;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const result = await withErrorHandling(
        async () => 'success',
        'testContext'
      );

      expect(result).toBe('success');
    });

    it('should return fallback value on error', async () => {
      const result = await withErrorHandling(
        async () => {
          throw new Error('Test error');
        },
        'testContext',
        'fallback value'
      );

      expect(result).toBe('fallback value');
    });

    it('should rethrow error when no fallback provided', async () => {
      const error = new Error('Test error');

      await expect(
        withErrorHandling(
          async () => {
            throw error;
          },
          'testContext'
        )
      ).rejects.toThrow('Test error');
    });
  });

  describe('withErrorHandlingSync', () => {
    it('should return result on success', () => {
      const result = withErrorHandlingSync(
        () => 'success',
        'testContext'
      );

      expect(result).toBe('success');
    });

    it('should return fallback value on error', () => {
      const result = withErrorHandlingSync(
        () => {
          throw new Error('Test error');
        },
        'testContext',
        'fallback value'
      );

      expect(result).toBe('fallback value');
    });

    it('should rethrow error when no fallback provided', () => {
      const error = new Error('Test error');

      expect(() => {
        withErrorHandlingSync(
          () => {
            throw error;
          },
          'testContext'
        );
      }).toThrow('Test error');
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-recoverable errors', async () => {
      const error = new ReportGenerationError('Test', 'init');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn, 3, 10)).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
