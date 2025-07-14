import { DEFAULT_BATCH_WINDOW } from '../constants'
import type { Logger, RenderEventData } from '../types'

export class ConsoleLogger implements Logger {
  private batchLogs: boolean
  private useTable: boolean
  private batchWindow: number
  private componentEventBuffers = new Map<string, Array<{ type: string; data: RenderEventData; color: string }>>()
  private flushTimeout: ReturnType<typeof globalThis.setTimeout> | null = null
  
  constructor(options: { batchLogs?: boolean; useTable?: boolean, batchWindow?: number } = {}) {
    this.batchLogs = options.batchLogs ?? true
    this.useTable = options.useTable ?? false
    this.batchWindow = options.batchWindow ?? DEFAULT_BATCH_WINDOW
  }
  
  tracked(data: RenderEventData): void {
    this.logEvent('TRACKED', data, '#42b883')
  }
  
  triggered(data: RenderEventData): void {
    this.logEvent('TRIGGERED', data, '#ff6b6b')
  }
  
  error(error: Error, context?: unknown): void {
    console.error('[ComponentMonitor Error]', error, context)
  }
  
  private logEvent(type: string, data: RenderEventData, color: string): void {
    const { componentName } = data
    
    if (this.batchLogs) {
      // Buffer events by component and flush periodically
      if (!this.componentEventBuffers.has(componentName)) {
        this.componentEventBuffers.set(componentName, [])
      }
      
      this.componentEventBuffers.get(componentName)!.push({ type, data, color })
      
      // Debounce flush to group events that happen close together
      if (this.flushTimeout) {
        globalThis.clearTimeout(this.flushTimeout)
      }
      this.flushTimeout = globalThis.setTimeout(() => this.flushComponentEvents(), this.batchWindow)
    } else {
      this.logSingleEvent(type, data, color)
    }
  }
  
  private flushComponentEvents(): void {
    for (const [componentName, events] of this.componentEventBuffers.entries()) {
      if (events.length === 0) continue
      
      // Create a fresh group for this batch
      console.groupCollapsed(`%c🔄 ${componentName} (${events.length} events)`, 'font-weight: bold; color: #666')
      
      events.forEach(({ type, data, color }) => {
        this.logSingleEvent(type, data, color)
      })
      
      console.groupEnd()
    }
    
    // Clear all buffers
    this.componentEventBuffers.clear()
  }
  
  private logSingleEvent(type: string, data: RenderEventData, color: string): void {
    const { componentName, event, componentPath } = data
    
    console.log(
      `%c[${type}] ${componentName}`,
      `color: ${color}; font-weight: bold`
    )
    
    if (this.useTable) {
      const tableData: Record<string, unknown> = {
        'Component Path': componentPath,
        'Property': event.key as string,
        'Operation': event.type,
        'Target Type': event.target?.constructor?.name,
        ...(type === 'TRIGGERED' && 'oldValue' in event && {
          'Old Value': (event as { oldValue: unknown }).oldValue,
          'New Value': (event as { newValue: unknown }).newValue
        })
      }
      console.table(tableData)
      console.log(' [ORIGINAL EVENT]', event)
    } else {
      console.log('Event Details:', {
        path: componentPath,
        event: event,
        timestamp: new Date(data.timestamp).toISOString()
      })
    }
  }
}