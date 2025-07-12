import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConsoleLogger } from './logger'
import type { RenderEventData, ComponentMetadata } from '../types'

// Mock the constants module
vi.mock('../constants', () => ({
  DEFAULT_BATCH_WINDOW: 300,
}))

describe('ConsoleLogger', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    table: ReturnType<typeof vi.fn>
    groupCollapsed: ReturnType<typeof vi.fn>
    groupEnd: ReturnType<typeof vi.fn>
  }

  let mockSetTimeout: ReturnType<typeof vi.fn> & { lastCallback?: () => void; lastDelay?: number }
  let mockClearTimeout: ReturnType<typeof vi.fn>
  let mockEventData: RenderEventData
  let mockMetadata: ComponentMetadata

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      table: vi.fn(),
      groupCollapsed: vi.fn(),
      groupEnd: vi.fn(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    globalThis.console = mockConsole as any

    // Mock timer functions
    mockSetTimeout = vi.fn((callback: () => void, delay: number) => {
      // Store callback for manual execution in tests
      mockSetTimeout.lastCallback = callback
      mockSetTimeout.lastDelay = delay
      return 12345 // mock timer id
    }) as ReturnType<typeof vi.fn> & { lastCallback?: () => void; lastDelay?: number }
    mockClearTimeout = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    globalThis.setTimeout = mockSetTimeout as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    globalThis.clearTimeout = mockClearTimeout as any

    // Mock data
    mockEventData = {
      componentName: 'TestComponent',
      componentPath: 'App → TestComponent',
      event: {
        type: 'get',
        key: 'testProperty',
        target: { constructor: { name: 'Object' } },
      } as RenderEventData['event'],
      timestamp: 1234567890000,
      instanceId: 1,
    }

    mockMetadata = {
      name: 'TestComponent',
      path: 'App → TestComponent',
      uid: 1,
      file: '/src/TestComponent.vue',
      props: ['prop1'],
      emits: ['event1'],
      isSetup: true,
      parentName: 'App',
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const logger = new ConsoleLogger()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).batchLogs).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).useTable).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).batchWindow).toBe(300)
    })

    it('should apply provided options', () => {
      const logger = new ConsoleLogger({
        batchLogs: false,
        useTable: true,
        batchWindow: 500,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).batchLogs).toBe(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).useTable).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((logger as any).batchWindow).toBe(500)
    })
  })

  describe('tracked and triggered methods', () => {
    it('should call logEvent with correct parameters for tracked', () => {
      const logger = new ConsoleLogger({ batchLogs: false })
      
      logger.tracked(mockEventData)

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c[TRACKED] TestComponent',
        'color: #42b883; font-weight: bold'
      )
    })

    it('should call logEvent with correct parameters for triggered', () => {
      const logger = new ConsoleLogger({ batchLogs: false })
      
      logger.triggered(mockEventData)

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c[TRIGGERED] TestComponent',
        'color: #ff6b6b; font-weight: bold'
      )
    })
  })

  describe('mounted method', () => {
    it('should log mounted event with correct styling', () => {
      const logger = new ConsoleLogger()
      
      logger.mounted(mockMetadata)

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c[MOUNTED] TestComponent',
        'color: #4fc3f7; font-weight: bold',
        mockMetadata
      )
    })
  })

  describe('error method', () => {
    it('should log error with context', () => {
      const logger = new ConsoleLogger()
      const error = new Error('Test error')
      const context = { info: 'test context' }
      
      logger.error(error, context)

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ComponentMonitor Error]',
        error,
        context
      )
    })

    it('should log error without context', () => {
      const logger = new ConsoleLogger()
      const error = new Error('Test error')
      
      logger.error(error)

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ComponentMonitor Error]',
        error,
        undefined
      )
    })
  })

  describe('batching behavior', () => {
    it('should log immediately when batching is disabled', () => {
      const logger = new ConsoleLogger({ batchLogs: false })
      
      logger.tracked(mockEventData)

      expect(mockConsole.log).toHaveBeenCalled()
      expect(mockSetTimeout).not.toHaveBeenCalled()
    })

    it('should buffer events when batching is enabled', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      logger.tracked(mockEventData)

      expect(mockConsole.log).not.toHaveBeenCalled()
      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        300
      )
    })

    it('should debounce flush timeout for multiple events', () => {
      const logger = new ConsoleLogger({ batchLogs: true, batchWindow: 500 })
      
      logger.tracked(mockEventData)
      logger.triggered(mockEventData)

      expect(mockClearTimeout).toHaveBeenCalledWith(12345)
      expect(mockSetTimeout).toHaveBeenCalledTimes(2)
    })

    it('should group events by component when flushing', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      // Add events to buffer
      logger.tracked(mockEventData)
      logger.triggered(mockEventData)

      // Manually trigger flush
      const flushCallback = mockSetTimeout.lastCallback
      flushCallback?.()

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith(
        '%c🔄 TestComponent (2 events)',
        'font-weight: bold; color: #666'
      )
      expect(mockConsole.groupEnd).toHaveBeenCalled()
    })

    it('should log individual events within groups', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      logger.tracked(mockEventData)
      logger.triggered(mockEventData)

      // Manually trigger flush
      const flushCallback = mockSetTimeout.lastCallback
      flushCallback?.()

      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c[TRACKED] TestComponent',
        'color: #42b883; font-weight: bold'
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        '%c[TRIGGERED] TestComponent',
        'color: #ff6b6b; font-weight: bold'
      )
    })

    it('should clear buffers after flushing', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      logger.tracked(mockEventData)

      // First flush
      let flushCallback = mockSetTimeout.lastCallback
      flushCallback?.()

      expect(mockConsole.groupCollapsed).toHaveBeenCalledTimes(1)

      // Add another event
      logger.triggered(mockEventData)

      // Second flush should start fresh
      flushCallback = mockSetTimeout.lastCallback
      flushCallback?.()

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith(
        '%c🔄 TestComponent (1 events)',
        'font-weight: bold; color: #666'
      )
    })

    it('should skip empty buffers when flushing', () => {
      new ConsoleLogger({ batchLogs: true })
      
      // Manually trigger flush without adding events
      const flushCallback = mockSetTimeout.lastCallback || ((): void => {})
      flushCallback()

      expect(mockConsole.groupCollapsed).not.toHaveBeenCalled()
    })

    it('should handle multiple components in batches', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      const event1 = { ...mockEventData, componentName: 'Component1' }
      const event2 = { ...mockEventData, componentName: 'Component2' }

      logger.tracked(event1)
      logger.triggered(event2)

      // Manually trigger flush
      const flushCallback = mockSetTimeout.lastCallback
      flushCallback?.()

      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith(
        '%c🔄 Component1 (1 events)',
        'font-weight: bold; color: #666'
      )
      expect(mockConsole.groupCollapsed).toHaveBeenCalledWith(
        '%c🔄 Component2 (1 events)',
        'font-weight: bold; color: #666'
      )
    })
  })

  describe('table output mode', () => {
    it('should use console.table when useTable is true', () => {
      const logger = new ConsoleLogger({ 
        batchLogs: false, 
        useTable: true 
      })
      
      logger.tracked(mockEventData)

      expect(mockConsole.table).toHaveBeenCalledWith({
        'Component Path': 'App → TestComponent',
        'Property': 'testProperty',
        'Operation': 'get',
        'Target Type': 'Object',
      })
    })

    it('should include old/new values for triggered events in table mode', () => {
      const logger = new ConsoleLogger({ 
        batchLogs: false, 
        useTable: true 
      })
      
      const triggeredEvent = {
        ...mockEventData,
        event: {
          type: 'set',
          key: 'testProperty',
          target: { constructor: { name: 'Object' } },
          oldValue: 'old',
          newValue: 'new',
        } as RenderEventData['event'],
      }
      
      logger.triggered(triggeredEvent)

      expect(mockConsole.table).toHaveBeenCalledWith({
        'Component Path': 'App → TestComponent',
        'Property': 'testProperty',
        'Operation': 'set',
        'Target Type': 'Object',
        'Old Value': 'old',
        'New Value': 'new',
      })
    })

    it('should log original event in table mode', () => {
      const logger = new ConsoleLogger({ 
        batchLogs: false, 
        useTable: true 
      })
      
      logger.tracked(mockEventData)

      expect(mockConsole.log).toHaveBeenCalledWith(
        ' [ORIGINAL EVENT]', 
        mockEventData.event
      )
    })

    it('should use standard logging when useTable is false', () => {
      const logger = new ConsoleLogger({ 
        batchLogs: false, 
        useTable: false 
      })
      
      logger.tracked(mockEventData)

      expect(mockConsole.table).not.toHaveBeenCalled()
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Event Details:',
        {
          path: 'App → TestComponent',
          event: mockEventData.event,
          timestamp: '2009-02-13T23:31:30.000Z',
        }
      )
    })
  })

  describe('timeout management', () => {
    it('should use custom batch window', () => {
      const logger = new ConsoleLogger({ 
        batchLogs: true, 
        batchWindow: 1000 
      })
      
      logger.tracked(mockEventData)

      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        1000
      )
    })

    it('should clear existing timeout when new event arrives', () => {
      const logger = new ConsoleLogger({ batchLogs: true })
      
      logger.tracked(mockEventData)
      logger.triggered(mockEventData)

      expect(mockClearTimeout).toHaveBeenCalledWith(12345)
    })
  })
})