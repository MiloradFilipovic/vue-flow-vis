import type { DebuggerEvent } from 'vue'

export type RenderTrackedEvent = DebuggerEvent
export type RenderTriggeredEvent = DebuggerEvent

export type FlowVisOptions = {
  enabled?: boolean
  logToTable?: boolean
  excludeComponents?: string[]
  includeComponents?: string[]
  trackRenderCycles?: boolean
  trackMounts?: boolean
  groupByComponent?: boolean
  performanceThreshold?: number
  onRenderTracked?: (data: RenderEventData) => void
  onRenderTriggered?: (data: RenderEventData) => void
  customLogger?: Logger
}

export type RenderEventData = {
  componentName: string
  componentPath: string
  event: DebuggerEvent
  timestamp: number
  instanceId: number
  metadata?: ComponentMetadata
}

export type ComponentMetadata = {
  name: string
  path: string
  uid: number
  file?: string
  props: string[]
  emits?: string[]
  isSetup: boolean
  parentName?: string
}

export type Logger = {
  tracked(data: RenderEventData): void
  triggered(data: RenderEventData): void
  mounted(metadata: ComponentMetadata): void
  error(error: Error, context?: any): void
}