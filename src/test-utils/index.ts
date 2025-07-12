import type { ComponentInternalInstance, DebuggerEvent } from 'vue'
import { vi } from 'vitest'
import type { RenderEventData, ComponentMetadata } from '../types'

/**
 * Create a mock Vue ComponentInternalInstance for testing
 */
export function createMockInstance(options: {
  uid?: number
  name?: string
  file?: string
  props?: Record<string, unknown>
  emits?: string[] | Record<string, unknown>
  parent?: ComponentInternalInstance | null
  setupState?: unknown
}): ComponentInternalInstance {
  const {
    uid = 1,
    name = 'TestComponent',
    file,
    props = {},
    emits = [],
    parent = null,
    setupState,
  } = options

  return {
    uid,
    type: {
      name,
      __file: file,
      emits,
    },
    props,
    parent,
    setupState,
  } as unknown as ComponentInternalInstance
}

/**
 * Create a mock DebuggerEvent for testing
 */
export function createMockEvent(options: {
  type?: string
  key?: string | symbol
  target?: unknown
  oldValue?: unknown
  newValue?: unknown
}): DebuggerEvent {
  const {
    type = 'get',
    key = 'testProperty',
    target = { constructor: { name: 'Object' } },
    oldValue,
    newValue,
  } = options

  const event = {
    type,
    key,
    target,
  } as Record<string, unknown>

  if (oldValue !== undefined) {
    event.oldValue = oldValue
  }

  if (newValue !== undefined) {
    event.newValue = newValue
  }

  return event as DebuggerEvent
}

/**
 * Create mock RenderEventData for testing
 */
export function createMockEventData(options: {
  componentName?: string
  componentPath?: string
  event?: DebuggerEvent
  timestamp?: number
  instanceId?: number
  metadata?: ComponentMetadata
  instance?: ComponentInternalInstance
}): RenderEventData {
  const {
    componentName = 'TestComponent',
    componentPath = 'TestComponent',
    event = createMockEvent({}),
    timestamp = Date.now(),
    instanceId = 1,
    metadata,
    instance,
  } = options

  return {
    componentName,
    componentPath,
    event,
    timestamp,
    instanceId,
    metadata,
    instance,
  }
}

/**
 * Create mock ComponentMetadata for testing
 */
export function createMockMetadata(options: {
  name?: string
  path?: string
  uid?: number
  file?: string
  props?: string[]
  emits?: string[]
  isSetup?: boolean
  parentName?: string
}): ComponentMetadata {
  const {
    name = 'TestComponent',
    path = 'TestComponent',
    uid = 1,
    file,
    props = [],
    emits = [],
    isSetup = false,
    parentName,
  } = options

  return {
    name,
    path,
    uid,
    file,
    props,
    emits,
    isSetup,
    parentName,
  }
}

/**
 * Create a component hierarchy for testing complex path resolution
 */
export function createComponentHierarchy(names: string[]): ComponentInternalInstance[] {
  const instances: ComponentInternalInstance[] = []
  
  for (let i = 0; i < names.length; i++) {
    const parent = i > 0 ? instances[i - 1] : null
    const instance = createMockInstance({
      uid: i,
      name: names[i],
      parent,
    })
    instances.push(instance)
  }
  
  return instances
}

/**
 * Mock console methods for testing logger output
 */
export function mockConsole(): {
  mocks: {
    log: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    table: ReturnType<typeof vi.fn>
    groupCollapsed: ReturnType<typeof vi.fn>
    groupEnd: ReturnType<typeof vi.fn>
    warn: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
  }
  restore: () => void
} {
  const originalConsole = { ...console }
  
  const mocks = {
    log: vi.fn(),
    error: vi.fn(),
    table: vi.fn(),
    groupCollapsed: vi.fn(),
    groupEnd: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }
  
  Object.assign(console, mocks)
  
  return {
    mocks,
    restore: (): void => { Object.assign(console, originalConsole) },
  }
}

/**
 * Mock timer functions for testing batching behavior
 */
export function mockTimers(): {
  setTimeoutMock: ReturnType<typeof vi.fn>
  clearTimeoutMock: ReturnType<typeof vi.fn>
  executeTimeout: (id?: unknown) => void
  executeAllTimeouts: () => void
  restore: () => void
} {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  
  const callbacks = new Map<unknown, () => void>()
  let lastCallback: (() => void) | undefined
  // let lastDelay: number | undefined // Keeping for potential future use
  
  const setTimeoutMock = vi.fn((callback: () => void, _delay: number) => {
    const id = Math.random()
    lastCallback = callback
    // lastDelay = delay // Keeping for potential future use
    callbacks.set(id, callback)
    return id
  })
  
  const clearTimeoutMock = vi.fn((id: unknown) => {
    callbacks.delete(id)
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  globalThis.setTimeout = setTimeoutMock as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  globalThis.clearTimeout = clearTimeoutMock as any
  
  return {
    setTimeoutMock,
    clearTimeoutMock,
    executeTimeout: (id?: unknown): void => {
      if (id && callbacks.has(id)) {
        const callback = callbacks.get(id)
        callback?.()
      } else if (lastCallback) {
        lastCallback()
      }
    },
    executeAllTimeouts: (): void => {
      callbacks.forEach((callback: () => void) => {
        callback()
      })
    },
    restore: (): void => {
      globalThis.setTimeout = originalSetTimeout
      globalThis.clearTimeout = originalClearTimeout
    },
  }
}

