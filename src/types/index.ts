import type { App, DebuggerEvent } from 'vue'

export type RenderTrackedEvent = DebuggerEvent
export type RenderTriggeredEvent = DebuggerEvent

export type FlowVisOptions = {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean
  /**
   * Use console.table for output
   * @default false
   */
  logToTable?: boolean
  /**
   * Components to exclude from monitoring
   * If provided, these components will not be monitored
   * @default []
   */
  excludeComponents?: string[]
  /**
   * Components to include for monitoring
   * If provided, only these components will be monitored
   * @default []
   */
  includeComponents?: string[]
  /**
   * Whether to batch logs
   * If true, logs will be grouped by component and sent after a specified window
   * @default false
   */
  batchLogs?: boolean
  /**
   * Delay in ms before flushing batched logs
   * @default 500
   */
  batchWindow?: number
  /**
   * // Custom callback for tracked events
   */
  onRenderTracked?: (data: RenderEventData) => void
  /**
   * Custom callback for triggered events
   */
  onRenderTriggered?: (data: RenderEventData) => void
  /**
   * Logger type to use for output
   * - 'console': Uses ConsoleLogger for browser console output (default)
   * - 'visual': Uses VisualLogger for in-page visual panel
   * - 'none': Disables logging entirely
   * @default 'console'
   */
  logger?: 'console' | 'visual' | 'none'
  /**
   * Custom logger for handling logs
   * If provided, this logger will be used instead of the built-in logger option
   * Takes precedence over the 'logger' option
   */
  customLogger?: Logger
}

export type RenderEventData = {
  componentName: string
  componentPath: string
  event: DebuggerEvent
  timestamp: number
  instanceId: number
  metadata?: ComponentMetadata
  instance?: import('vue').ComponentInternalInstance
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
  error(error: Error, context?: unknown): void
}

export type FlowVisPluginType = {
  install(app: App, options?: FlowVisOptions): void
}