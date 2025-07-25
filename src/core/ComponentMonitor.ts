import { DEFAULT_BATCH_WINDOW } from '../constants'
import type { 
  FlowVisOptions, 
  RenderEventData, 
  Logger,
} from '../types'
import { ComponentIdentifier } from '../utils/componentIdentifier'
import { UILogger } from '../loggers/ui/UILogger'
import { ConsoleLogger } from '../loggers/console/ConsoleLogger'

// No-op logger for when logging is disabled
class NoOpLogger implements Logger {
  tracked(_data: RenderEventData): void {
    // Do nothing
  }
  
  triggered(_data: RenderEventData): void {
    // Do nothing
  }
  
  error(_error: Error, _context?: unknown): void {
    // Do nothing
  }
}

export class ComponentMonitor {
  public options: Required<Omit<FlowVisOptions, 'customLogger'>> & { customLogger?: Logger }
  private logger: Logger
  
  constructor(options: FlowVisOptions = {}) {
    this.options = {
      enabled: true,
      logToTable: false,
      excludeComponents: [],
      includeComponents: [],
      batchLogs: true,
      batchWindow: options.batchWindow ?? DEFAULT_BATCH_WINDOW,
      onRenderTracked: (): void => {},
      onRenderTriggered: (): void => {},
      logger: 'console',
      customLogger: undefined,
      ...options
    }
    
    this.logger = this.createLogger()
  }

  private createLogger(): Logger {
    // Custom logger takes precedence
    if (this.options.customLogger) {
      return this.options.customLogger
    }

    // Create logger based on type selection
    switch (this.options.logger) {
      case 'console':
        return new ConsoleLogger({
          batchLogs: this.options.batchLogs,
          useTable: this.options.logToTable,
          batchWindow: this.options.batchWindow
        })
      case 'ui':
        return new UILogger()
      case 'none':
        return new NoOpLogger()
      default:
        return new ConsoleLogger({
          batchLogs: this.options.batchLogs,
          useTable: this.options.logToTable,
          batchWindow: this.options.batchWindow
        })
    }
  }
  
  shouldMonitorComponent(componentName: string, instance?: import('vue').ComponentInternalInstance): boolean {
    const { includeComponents, excludeComponents } = this.options

    // Check if component is from external library (node_modules)
    if (instance && this.isExternalComponent(instance)) {
      return false
    }
    
    // If include list is specified, only monitor included components
    if (includeComponents.length > 0) {
      return this.matchesAnyPattern(componentName, includeComponents)
    }
    
    // Otherwise, monitor all except excluded
    return !this.matchesAnyPattern(componentName, excludeComponents)
  }

  private normalizePath(filePath: string): string {
    let normalized = filePath.replace(/\\/g, '/');
    // Remove trailing slash if present, unless it's just the root '/'
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  private matchesPattern(componentName: string, pattern: string): boolean {
    // If no wildcard, do case-insensitive exact match
    if (!pattern.includes('*')) {
      return componentName.toLowerCase() === pattern.toLowerCase();
    }
    
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\\\\?\*/g, '.*'); // Replace \* with .* for wildcard matching
    
    const regex = new RegExp(`^${regexPattern}$`, 'i'); // 'i' flag for case-insensitive
    return regex.test(componentName);
  }

  private matchesAnyPattern(componentName: string, patterns: string[]): boolean {
    return patterns.some(pattern => this.matchesPattern(componentName, pattern));
  }

  // TODO: Check if there is a better way to do this
  private isExternalComponent(instance: import('vue').ComponentInternalInstance): boolean {
    const file = instance.type?.__file
    if (!file) return true
    
    // Normalize file path for consistent checking
    const normalizedFile = this.normalizePath(file)
    
    // Check if the component file path contains node_modules
    if (normalizedFile.includes('node_modules')) return true
    
    // Check if file path indicates it's from a different project or external source
    // This covers CI/CD paths, temp directories, and other external locations
    const externalPatterns = [
      '/tmp/',
      '/temp/',
      '/home/runner/work/',
      '/github/workspace/',
      '/var/folders/',
      'C:/Users/',
      'C:/Windows/Temp/'
    ]
    
    if (externalPatterns.some(pattern => normalizedFile.includes(pattern))) {
      return true
    }
    
    // Check if file is in a dist/build directory of external dependencies
    const distPatterns = ['/dist/', '/build/', '/lib/', '/es/', '/umd/']
    if (distPatterns.some(pattern => normalizedFile.includes(pattern))) {
      // If it contains common external library indicators, it's likely external
      const hasExternalIndicators = normalizedFile.includes('/packages/') || 
                                  normalizedFile.includes('/node_modules/') || 
                                  normalizedFile.match(/\/[^/]+\/dist\//) || 
                                  normalizedFile.match(/\/[^/]+\/lib\//)
      if (hasExternalIndicators) {
        return true
      }
    }
    
    // Check for absolute paths that don't seem to be in the current project
    // (heuristic: if it's an absolute path but doesn't contain common project indicators)
    if (normalizedFile.startsWith('/') && !normalizedFile.includes('/src/') && !normalizedFile.includes('/components/')) {
      return true
    }
    
    // Check Vue-specific indicators using safe property access
    // External components often lack HMR IDs in development
    if (process.env.NODE_ENV === 'development' && instance.type) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const hmrId = (instance.type as any).__hmrId
      if (!hmrId) {
        // But only if the file suggests it's external (to avoid false positives)
        if (normalizedFile.includes('/') && !normalizedFile.includes('./') && !normalizedFile.includes('../')) {
          return true
        }
      }
    }
    
    // Check for non-standard scope ID patterns
    if (instance.type) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const scopeId = (instance.type as any).__scopeId
      if (scopeId && typeof scopeId === 'string' && typeof scopeId.startsWith === 'function' && !scopeId.startsWith('data-v-')) {
        return true
      }
    }
    
    // Check if it's a custom element using safe property access
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const isCE = (instance as any).isCE
    if (isCE === true) {
      return true
    }
    
    return false
  }
  
  logRenderEvent(type: 'tracked' | 'triggered', data: RenderEventData): void {
    if (!this.options.enabled) return
    
    try {
      // Lazy metadata extraction - only extract when logging
      const eventData: RenderEventData = {
        ...data,
        metadata: data.instance ? this.extractMetadataLazy(data.instance) : undefined
      }
      delete eventData.instance // Remove instance reference to avoid memory leaks
      
      // Log the event
      if (type === 'tracked') {
        this.logger.tracked(eventData)
      } else {
        this.logger.triggered(eventData)
      }
      
      // Custom callbacks
      if (type === 'tracked') {
        this.options.onRenderTracked(eventData)
      } else {
        this.options.onRenderTriggered(eventData)
      }
    } catch (error) {
      this.logger.error(error as Error, { type, data })
    }
  }
  
  private extractMetadataLazy(instance: import('vue').ComponentInternalInstance): import('../types').ComponentMetadata {
    return ComponentIdentifier.extractMetadata(instance)
  }
}