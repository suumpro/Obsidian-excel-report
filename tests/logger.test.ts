/**
 * Unit tests for Logger
 */

import { Logger } from '../src/utils/logger';

describe('Logger', () => {
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log info at default level', () => {
    const logger = new Logger();
    logger.info('test message');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
  });

  it('should not log debug at default INFO level', () => {
    const logger = new Logger();
    logger.debug('debug message');
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('should log debug when level is DEBUG', () => {
    const logger = new Logger('DEBUG');
    logger.debug('debug message');
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
  });

  it('should log warn', () => {
    const logger = new Logger();
    logger.warn('warn message');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'));
  });

  it('should log error', () => {
    const logger = new Logger();
    logger.error('error message');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('error message'));
  });

  it('should respect setLevel', () => {
    const logger = new Logger('ERROR');
    logger.info('should not appear');
    logger.warn('should not appear');
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    logger.setLevel('DEBUG');
    logger.debug('now visible');
    expect(debugSpy).toHaveBeenCalled();
  });

  it('should report isDebugEnabled correctly', () => {
    const logger = new Logger('INFO');
    expect(logger.isDebugEnabled()).toBe(false);

    logger.setLevel('DEBUG');
    expect(logger.isDebugEnabled()).toBe(true);
  });
});
