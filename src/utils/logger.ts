/**
 * Centralized logging utility
 * Replaces console.log/error/warn with a production-ready logger
 * Supports structured logging with log levels
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface StructuredLogData {
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
  level: LogLevel;
  [key: string]: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private logLevel: LogLevel = isDev ? 'debug' : 'info';

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'log', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  /**
   * Format structured log entry
   */
  private formatStructuredLog(level: LogLevel, message: string, data?: any, context?: string): StructuredLogData {
    const logData: StructuredLogData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      context: context || 'APP',
    };

    if (data) {
      // Flatten structured data
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.assign(logData, data);
      } else {
        logData.data = data;
      }
    }

    return logData;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  log(message: string, data?: any, context?: string) {
    if (!this.shouldLog('log')) return;

    const entry = this.formatMessage('log', message, data, context);
    this.logs.push(entry);

    if (isDev) {
      const structured = this.formatStructuredLog('log', message, data, context);
      console.log(JSON.stringify(structured, null, 2));
    }

    this.trimLogs();
  }

  error(message: string, error?: any, context?: string) {
    if (!this.shouldLog('error')) return;

    const entry = this.formatMessage('error', message, error, context);
    entry.severity = 'high'; // Default for errors
    this.logs.push(entry);
    
    // Format error for better console visibility
    const structured = this.formatStructuredLog('error', message, error, context);
    structured.severity = 'high';

    if (isDev) {
      if (error) {
        if (error instanceof Error) {
          // Properly log Error objects - their properties are not enumerable
          console.error(`[${entry.context || 'APP'}] ${message}:`, {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          });
        } else if (typeof error === 'object') {
          // Log error object with expanded details
          console.error(`[${entry.context || 'APP'}] ${message}:`, {
            ...error,
            // Ensure nested objects are visible
            _stringified: JSON.stringify(error, null, 2),
          });
        } else {
          console.error(`[${entry.context || 'APP'}]`, message, error);
        }
      } else {
        console.error(`[${entry.context || 'APP'}]`, message);
      }
    } else {
      // In production, log as structured JSON
      console.error(JSON.stringify(structured, null, 2));
    }
    
    this.trimLogs();
    
    // In production, send to error tracking service (handled by errorTracking)
    if (isProd && error) {
      this.reportError(error, context);
    }
  }

  warn(message: string, data?: any, context?: string) {
    if (!this.shouldLog('warn')) return;

    const entry = this.formatMessage('warn', message, data, context);
    entry.severity = 'medium';
    this.logs.push(entry);

    const structured = this.formatStructuredLog('warn', message, data, context);
    structured.severity = 'medium';

    if (isDev) {
      console.warn(`[${entry.context || 'APP'}]`, message, data || '');
    } else {
      console.warn(JSON.stringify(structured, null, 2));
    }

    this.trimLogs();
  }

  info(message: string, data?: any, context?: string) {
    if (!this.shouldLog('info')) return;

    const entry = this.formatMessage('info', message, data, context);
    this.logs.push(entry);

    const structured = this.formatStructuredLog('info', message, data, context);

    if (isDev) {
      console.info(`[${entry.context || 'APP'}]`, message, data || '');
    } else {
      console.info(JSON.stringify(structured, null, 2));
    }

    this.trimLogs();
  }

  debug(message: string, data?: any, context?: string) {
    if (!this.shouldLog('debug')) return;

    const entry = this.formatMessage('debug', message, data, context);
    this.logs.push(entry);

    const structured = this.formatStructuredLog('debug', message, data, context);

    if (isDev && import.meta.env.VITE_DEBUG === 'true') {
      console.debug(`[${entry.context || 'APP'}]`, message, data || '');
    } else if (import.meta.env.VITE_DEBUG === 'true') {
      console.debug(JSON.stringify(structured, null, 2));
    }

    this.trimLogs();
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private reportError(error: any, context?: string) {
    // Integration with error tracking service
    // Example: Sentry.captureException(error, { tags: { context } });
    // For now, we just log it
    if (isDev) {
      console.error('Error to report:', error, context);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
