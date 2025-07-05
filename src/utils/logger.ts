import type { Logger, RenderEventData, ComponentMetadata } from '../types'

export class ConsoleLogger implements Logger {
  private groupByComponent: boolean
  private useTable: boolean
  private componentGroups = new Map<string, boolean>()
  
  constructor(options: { groupByComponent?: boolean; useTable?: boolean } = {}) {
    this.groupByComponent = options.groupByComponent ?? false
    this.useTable = options.useTable ?? true
  }
  
  tracked(data: RenderEventData): void {
    this.logEvent('TRACKED', data, '#42b883')
  }
  
  triggered(data: RenderEventData): void {
    this.logEvent('TRIGGERED', data, '#ff6b6b')
  }
  
  mounted(metadata: ComponentMetadata): void {
    console.log(
      `%c[MOUNTED] ${metadata.name}`,
      'color: #4fc3f7; font-weight: bold',
      metadata
    )
  }
  
  error(error: Error, context?: any): void {
    console.error('[ComponentMonitor Error]', error, context)
  }
  
  private logEvent(type: string, data: RenderEventData, color: string): void {
    const { componentName, event, componentPath } = data
    
    if (this.groupByComponent) {
      if (!this.componentGroups.has(componentName)) {
        console.groupCollapsed(`%c${componentName}`, 'font-weight: bold')
        this.componentGroups.set(componentName, true)
      }
    }
    
    console.log(
      `%c[${type}] ${componentName}`,
      `color: ${color}; font-weight: bold`
    )
    
    if (this.useTable) {
      const tableData = {
        'Component Path': componentPath,
        'Property': event.key,
        'Operation': event.type,
        'Target Type': event.target?.constructor?.name,
        ...(type === 'TRIGGERED' && {
          'Old Value': (event as any).oldValue,
          'New Value': (event as any).newValue
        })
      }
      console.table(tableData)
    } else {
      console.log('Event Details:', {
        path: componentPath,
        event: event,
        timestamp: new Date(data.timestamp).toISOString()
      })
    }
  }
}