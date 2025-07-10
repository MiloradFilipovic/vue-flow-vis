import { DEFAULT_BATCH_WINDOW } from '../constants'
import type { 
  FlowVisOptions, 
  RenderEventData, 
  Logger,
} from '../types'
import { ConsoleLogger } from '../utils/logger'
import { ComponentIdentifier } from '../utils/componentIdentifier'

export class ComponentMonitor {
  public options: Required<FlowVisOptions>
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
      customLogger: new ConsoleLogger({
        batchLogs: options.batchLogs,
        useTable: options.logToTable,
        batchWindow: options.batchWindow ?? DEFAULT_BATCH_WINDOW
      }),
      ...options
    }
    
    this.logger = this.options.customLogger!
  }
  
  shouldMonitorComponent(componentName: string): boolean {
    const { includeComponents, excludeComponents } = this.options
    
    // If include list is specified, only monitor included components
    if (includeComponents.length > 0) {
      return includeComponents.includes(componentName)
    }
    
    // Otherwise, monitor all except excluded
    return !excludeComponents.includes(componentName)
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