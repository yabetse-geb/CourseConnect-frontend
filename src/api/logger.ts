/**
 * Logger service with toggleable logging
 * Logs API errors and important events
 */

interface LogDetails {
  [key: string]: any;
}

class Logger {
  private enabled: boolean;

  constructor() {
    // Check localStorage for logging preference, default to true
    this.enabled = localStorage.getItem('conceptbox_logging_enabled') !== 'false';
  }

  enable(): void {
    this.enabled = true;
    localStorage.setItem('conceptbox_logging_enabled', 'true');
    console.log('📝 ConceptBox logging enabled');
  }

  disable(): void {
    this.enabled = false;
    localStorage.setItem('conceptbox_logging_enabled', 'false');
    console.log('📝 ConceptBox logging disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  error(context: string, error: Error | string, details: LogDetails = {}): void {
    if (!this.enabled) return;
    
    console.error('❌ API Error:', {
      context,
      error: typeof error === 'string' ? error : error.message,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  warning(context: string, message: string, details: LogDetails = {}): void {
    if (!this.enabled) return;
    
    console.warn('⚠️ Warning:', {
      context,
      message,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  info(context: string, message: string, details: LogDetails = {}): void {
    if (!this.enabled) return;
    
    console.log('ℹ️ Info:', {
      context,
      message,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  success(context: string, message: string, details: LogDetails = {}): void {
    if (!this.enabled) return;
    
    console.log('✅ Success:', {
      context,
      message,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

export const logger = new Logger();