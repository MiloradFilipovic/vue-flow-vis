import type { 
  FlowVisOptions, 
  RenderEventData, 
  Logger,
  ComponentMetadata 
} from '../types'
import { ConsoleLogger } from '../utils/logger'

export class ComponentMonitor {
  public options: Required<FlowVisOptions>
  private logger: Logger
  private renderCounts = new Map<string, number>()
  private lastRenderTime = new Map<string, number>()
  
  constructor(options: FlowVisOptions = {}) {
    this.options = {
      enabled: true,
      logToTable: false,
      excludeComponents: [],
      includeComponents: [],
      trackRenderCycles: true,
      trackMounts: true,
      groupByComponent: false,
      performanceThreshold: 16,
      onRenderTracked: () => {},
      onRenderTriggered: () => {},
      customLogger: new ConsoleLogger({
        groupByComponent: options.groupByComponent,
        useTable: options.logToTable
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
      // Performance tracking
      const now = Date.now()
      const lastRender = this.lastRenderTime.get(data.componentName) || 0
      const renderDelta = now - lastRender
      
      if (renderDelta < this.options.performanceThreshold) {
        const count = (this.renderCounts.get(data.componentName) || 0) + 1
        this.renderCounts.set(data.componentName, count)
        
        if (count % 10 === 0) {
          console.warn(
            `⚠️ Component "${data.componentName}" is re-rendering rapidly (${count} times in ${renderDelta}ms)`
          )
        }
      } else {
        this.renderCounts.set(data.componentName, 0)
      }
      
      this.lastRenderTime.set(data.componentName, now)
      
      // Log the event
      if (type === 'tracked') {
        this.logger.tracked(data)
      } else {
        this.logger.triggered(data)
      }
      
      // Custom callbacks
      if (type === 'tracked') {
        this.options.onRenderTracked(data)
      } else {
        this.options.onRenderTriggered(data)
      }
    } catch (error) {
      this.logger.error(error as Error, { type, data })
    }
  }
  
  logMount(metadata: ComponentMetadata): void {
    if (!this.options.enabled || !this.options.trackMounts) return
    
    if (this.shouldMonitorComponent(metadata.name)) {
      this.logger.mounted(metadata)
    }
  }
  
  getRenderStats(): Map<string, number> {
    return new Map(this.renderCounts)
  }
  
  clearStats(): void {
    this.renderCounts.clear()
    this.lastRenderTime.clear()
  }
}