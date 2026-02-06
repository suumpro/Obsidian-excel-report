/**
 * Error handling module exports
 */

export {
  PluginError,
  DataLoadError,
  ReportGenerationError,
  FileWriteError,
  ValidationError,
  CacheError,
  isPluginError,
  isRecoverable,
} from './PluginErrors';

export {
  handleError,
  withErrorHandling,
  withErrorHandlingSync,
  trySafe,
  trySafeSync,
  withRetry,
  type Result,
  type ErrorHandlerOptions,
} from './errorHandler';
