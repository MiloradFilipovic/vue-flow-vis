import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ComponentInternalInstance, DebuggerEvent } from 'vue'
import { ComponentMonitor } from './ComponentMonitor'
import type { Logger, RenderEventData } from '../types'

// Mock the constants module
vi.mock('../constants', () => ({
  DEFAULT_BATCH_WINDOW: 300,
}))

// Mock the logger module
vi.mock('../utils/logger', () => ({
  ConsoleLogger: vi.fn().mockImplementation(() => ({
    tracked: vi.fn(),
    triggered: vi.fn(),
    error: vi.fn(),
  })),
}))

// Mock the component identifier module
vi.mock('../utils/componentIdentifier', () => ({
  ComponentIdentifier: {
    extractMetadata: vi.fn().mockReturnValue({
      name: 'TestComponent',
      path: 'TestComponent',
      uid: 1,
      file: '/test/TestComponent.vue',
      props: ['testProp'],
      emits: ['testEvent'],
      isSetup: true,
      parentName: undefined,
    }),
  },
}))

describe('ComponentMonitor', () => {
  let mockLogger: Logger
  let mockInstance: Partial<ComponentInternalInstance>
  let mockEvent: DebuggerEvent

  beforeEach(() => {
    mockLogger = {
      tracked: vi.fn(),
      triggered: vi.fn(),
      error: vi.fn(),
    }

    mockInstance = {
      uid: 1,
      type: { name: 'TestComponent' },
      props: { testProp: 'value' },
      parent: null,
    }

    mockEvent = {
      type: 'get',
      key: 'testKey',
      target: {},
    } as DebuggerEvent
  })

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const monitor = new ComponentMonitor()

      expect(monitor.options.enabled).toBe(true)
      expect(monitor.options.logToTable).toBe(false)
      expect(monitor.options.excludeComponents).toEqual([])
      expect(monitor.options.includeComponents).toEqual([])
      expect(monitor.options.batchLogs).toBe(true)
      expect(monitor.options.batchWindow).toBe(300)
    })

    it('should merge provided options with defaults', () => {
      const customOptions = {
        enabled: false,
        logToTable: true,
        excludeComponents: ['ExcludedComponent'],
        includeComponents: ['IncludedComponent'],
        batchLogs: false,
        batchWindow: 500,
      }

      const monitor = new ComponentMonitor(customOptions)

      expect(monitor.options.enabled).toBe(false)
      expect(monitor.options.logToTable).toBe(true)
      expect(monitor.options.excludeComponents).toEqual(['ExcludedComponent'])
      expect(monitor.options.includeComponents).toEqual(['IncludedComponent'])
      expect(monitor.options.batchLogs).toBe(false)
      expect(monitor.options.batchWindow).toBe(500)
    })

    it('should set up custom logger when provided', () => {
      const customLogger = mockLogger
      const monitor = new ComponentMonitor({ customLogger })

      expect(monitor.options.customLogger).toBe(customLogger)
    })

    it('should set up custom callbacks when provided', () => {
      const onRenderTracked = vi.fn()
      const onRenderTriggered = vi.fn()

      const monitor = new ComponentMonitor({
        onRenderTracked,
        onRenderTriggered,
      })

      expect(monitor.options.onRenderTracked).toBe(onRenderTracked)
      expect(monitor.options.onRenderTriggered).toBe(onRenderTriggered)
    })
  })

  describe('shouldMonitorComponent', () => {
    it('should return true for all components when no filters are set', () => {
      const monitor = new ComponentMonitor()

      expect(monitor.shouldMonitorComponent('TestComponent')).toBe(true)
      expect(monitor.shouldMonitorComponent('AnotherComponent')).toBe(true)
    })

    it('should only monitor included components when include list is provided', () => {
      const monitor = new ComponentMonitor({
        includeComponents: ['TestComponent', 'AllowedComponent'],
      })

      expect(monitor.shouldMonitorComponent('TestComponent')).toBe(true)
      expect(monitor.shouldMonitorComponent('AllowedComponent')).toBe(true)
      expect(monitor.shouldMonitorComponent('NotAllowedComponent')).toBe(false)
    })

    it('should exclude specified components when exclude list is provided', () => {
      const monitor = new ComponentMonitor({
        excludeComponents: ['ExcludedComponent', 'BlockedComponent'],
      })

      expect(monitor.shouldMonitorComponent('TestComponent')).toBe(true)
      expect(monitor.shouldMonitorComponent('ExcludedComponent')).toBe(false)
      expect(monitor.shouldMonitorComponent('BlockedComponent')).toBe(false)
    })

    it('should prioritize include list over exclude list', () => {
      const monitor = new ComponentMonitor({
        includeComponents: ['TestComponent'],
        excludeComponents: ['TestComponent', 'OtherComponent'],
      })

      expect(monitor.shouldMonitorComponent('TestComponent')).toBe(true)
      expect(monitor.shouldMonitorComponent('OtherComponent')).toBe(false)
      expect(monitor.shouldMonitorComponent('RandomComponent')).toBe(false)
    })

    it('should exclude external components from node_modules', () => {
      const monitor = new ComponentMonitor()
      
      const externalInstance = {
        type: { 
          __file: '/path/to/project/node_modules/vue-router/dist/VueRouter.vue' 
        }
      } as ComponentInternalInstance
      
      const projectInstance = {
        type: { 
          __file: '/path/to/project/src/components/MyComponent.vue' 
        }
      } as ComponentInternalInstance

      expect(monitor.shouldMonitorComponent('VueRouter', externalInstance)).toBe(false)
      expect(monitor.shouldMonitorComponent('MyComponent', projectInstance)).toBe(true)
    })

    it('should not monitor components without __file property', () => {
      const monitor = new ComponentMonitor()
      
      const instanceWithoutFile = {
        type: {}
      } as ComponentInternalInstance

      expect(monitor.shouldMonitorComponent('TestComponent', instanceWithoutFile)).toBe(false)
    })

    it('should include external components when explicitly included', () => {
      const monitor = new ComponentMonitor({
        includeComponents: ['VueRouter']
      })
      
      const externalInstance = {
        type: { 
          __file: '/path/to/project/node_modules/vue-router/dist/VueRouter.vue' 
        }
      } as ComponentInternalInstance

      // External components should still be excluded even if in include list
      expect(monitor.shouldMonitorComponent('VueRouter', externalInstance)).toBe(false)
    })

    describe('wildcard pattern matching', () => {
      it('should support wildcard patterns in excludeComponents', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['El*', '*Button', '*Component*']
        })

        expect(monitor.shouldMonitorComponent('ElInput')).toBe(false)
        expect(monitor.shouldMonitorComponent('ElButton')).toBe(false)
        expect(monitor.shouldMonitorComponent('SubmitButton')).toBe(false)
        expect(monitor.shouldMonitorComponent('MyComponentCard')).toBe(false)
        expect(monitor.shouldMonitorComponent('MyComponent')).toBe(false)
        expect(monitor.shouldMonitorComponent('ComponentList')).toBe(false)
        
        expect(monitor.shouldMonitorComponent('MyCard')).toBe(true)
        expect(monitor.shouldMonitorComponent('UserForm')).toBe(true)
      })

      it('should support wildcard patterns in includeComponents', () => {
        const monitor = new ComponentMonitor({
          includeComponents: ['My*', '*Form', '*Component*']
        })

        expect(monitor.shouldMonitorComponent('MyButton')).toBe(true)
        expect(monitor.shouldMonitorComponent('MyCard')).toBe(true)
        expect(monitor.shouldMonitorComponent('LoginForm')).toBe(true)
        expect(monitor.shouldMonitorComponent('UserForm')).toBe(true)
        expect(monitor.shouldMonitorComponent('MyComponentCard')).toBe(true)
        expect(monitor.shouldMonitorComponent('ComponentList')).toBe(true)
        
        expect(monitor.shouldMonitorComponent('ElInput')).toBe(false)
        expect(monitor.shouldMonitorComponent('RandomCard')).toBe(false)
      })

      it('should handle exact matches without wildcards', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['ExactComponent']
        })

        expect(monitor.shouldMonitorComponent('ExactComponent')).toBe(false)
        expect(monitor.shouldMonitorComponent('ExactComponentCard')).toBe(true)
        expect(monitor.shouldMonitorComponent('MyExactComponent')).toBe(true)
      })

      it('should handle multiple wildcards in single pattern', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['*Test*Component*']
        })

        expect(monitor.shouldMonitorComponent('MyTestComponentCard')).toBe(false)
        expect(monitor.shouldMonitorComponent('TestComponentList')).toBe(false)
        expect(monitor.shouldMonitorComponent('UserTestComponent')).toBe(false)
        expect(monitor.shouldMonitorComponent('TestComponent')).toBe(false)
        
        expect(monitor.shouldMonitorComponent('TestCard')).toBe(true)
        expect(monitor.shouldMonitorComponent('ComponentTest')).toBe(true)
      })

      it('should be case-insensitive for wildcard patterns', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['el*', '*button', '*Component*']
        })

        expect(monitor.shouldMonitorComponent('ElInput')).toBe(false)
        expect(monitor.shouldMonitorComponent('ELINPUT')).toBe(false)
        expect(monitor.shouldMonitorComponent('elInput')).toBe(false)
        expect(monitor.shouldMonitorComponent('SubmitButton')).toBe(false)
        expect(monitor.shouldMonitorComponent('SUBMITBUTTON')).toBe(false)
        expect(monitor.shouldMonitorComponent('submitbutton')).toBe(false)
        expect(monitor.shouldMonitorComponent('MyComponentCard')).toBe(false)
        expect(monitor.shouldMonitorComponent('MYCOMPONENTCARD')).toBe(false)
        expect(monitor.shouldMonitorComponent('mycomponentcard')).toBe(false)
      })

      it('should be case-insensitive for exact matches', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['ExactComponent']
        })

        expect(monitor.shouldMonitorComponent('ExactComponent')).toBe(false)
        expect(monitor.shouldMonitorComponent('EXACTCOMPONENT')).toBe(false)
        expect(monitor.shouldMonitorComponent('exactcomponent')).toBe(false)
        expect(monitor.shouldMonitorComponent('ExactCOMPONENT')).toBe(false)
      })

      it('should handle empty patterns gracefully', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['', '*', '**']
        })

        expect(monitor.shouldMonitorComponent('TestComponent')).toBe(false) // '*' matches everything
        expect(monitor.shouldMonitorComponent('AnyComponent')).toBe(false) // '**' matches everything
      })

      it('should handle special regex characters in patterns', () => {
        const monitor = new ComponentMonitor({
          excludeComponents: ['Component[0-9]', 'Button+', 'Form.vue']
        })

        expect(monitor.shouldMonitorComponent('Component[0-9]')).toBe(false)
        expect(monitor.shouldMonitorComponent('Button+')).toBe(false)
        expect(monitor.shouldMonitorComponent('Form.vue')).toBe(false)
        expect(monitor.shouldMonitorComponent('Component1')).toBe(true) // Should not match regex pattern
        expect(monitor.shouldMonitorComponent('ButtonExtra')).toBe(true) // Should not match regex pattern
      })

      it('should prioritize include patterns over exclude patterns', () => {
        const monitor = new ComponentMonitor({
          includeComponents: ['My*'],
          excludeComponents: ['*Component']
        })

        expect(monitor.shouldMonitorComponent('MyComponent')).toBe(true) // Include takes priority
        expect(monitor.shouldMonitorComponent('MyButton')).toBe(true)
        expect(monitor.shouldMonitorComponent('UserComponent')).toBe(false) // Not in include list
        expect(monitor.shouldMonitorComponent('RandomCard')).toBe(false) // Not in include list
      })
    })
  })

  describe('logRenderEvent', () => {
    it('should not log when monitor is disabled', () => {
      const monitor = new ComponentMonitor({ 
        enabled: false,
        customLogger: mockLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      monitor.logRenderEvent('tracked', eventData)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.tracked).not.toHaveBeenCalled()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.triggered).not.toHaveBeenCalled()
    })

    it('should log tracked events when enabled', () => {
      const monitor = new ComponentMonitor({ 
        enabled: true,
        customLogger: mockLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      monitor.logRenderEvent('tracked', eventData)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.tracked).toHaveBeenCalledWith(
        expect.objectContaining({
          componentName: 'TestComponent',
          componentPath: 'TestComponent',
          event: mockEvent,
          metadata: expect.any(Object) as unknown,
        })
      )
    })

    it('should log triggered events when enabled', () => {
      const monitor = new ComponentMonitor({ 
        enabled: true,
        customLogger: mockLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      monitor.logRenderEvent('triggered', eventData)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.triggered).toHaveBeenCalledWith(
        expect.objectContaining({
          componentName: 'TestComponent',
          componentPath: 'TestComponent',
          event: mockEvent,
          metadata: expect.any(Object) as unknown,
        })
      )
    })

    it('should remove instance reference from logged data', () => {
      const monitor = new ComponentMonitor({ 
        enabled: true,
        customLogger: mockLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      monitor.logRenderEvent('tracked', eventData)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockTracked = mockLogger.tracked as ReturnType<typeof vi.fn>
      const loggedData = mockTracked.mock.calls[0]?.[0] as { instance?: ComponentInternalInstance }
      expect(loggedData?.instance).toBeUndefined()
    })

    it('should call custom callbacks when provided', () => {
      const onRenderTracked = vi.fn()
      const onRenderTriggered = vi.fn()

      const monitor = new ComponentMonitor({
        enabled: true,
        customLogger: mockLogger,
        onRenderTracked,
        onRenderTriggered,
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      monitor.logRenderEvent('tracked', eventData)
      expect(onRenderTracked).toHaveBeenCalledWith(
        expect.objectContaining({
          componentName: 'TestComponent',
          metadata: expect.any(Object) as unknown,
        })
      )

      monitor.logRenderEvent('triggered', eventData)
      expect(onRenderTriggered).toHaveBeenCalledWith(
        expect.objectContaining({
          componentName: 'TestComponent',
          metadata: expect.any(Object) as unknown,
        })
      )
    })

    it('should handle errors gracefully', () => {
      const throwingLogger: Logger = {
        tracked: vi.fn().mockImplementation(() => {
          throw new Error('Logger error')
        }),
        triggered: vi.fn(),
        error: vi.fn(),
      }

      const monitor = new ComponentMonitor({ 
        enabled: true,
        customLogger: throwingLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: mockInstance as ComponentInternalInstance,
      }

      expect(() => {
        monitor.logRenderEvent('tracked', eventData)
      }).not.toThrow()

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(throwingLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          type: 'tracked',
          data: eventData,
        })
      )
    })

    it('should handle missing instance gracefully', () => {
      const monitor = new ComponentMonitor({ 
        enabled: true,
        customLogger: mockLogger 
      })

      const eventData: RenderEventData = {
        componentName: 'TestComponent',
        componentPath: 'TestComponent',
        event: mockEvent,
        timestamp: Date.now(),
        instanceId: 1,
        instance: undefined,
      }

      monitor.logRenderEvent('tracked', eventData)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const mockTracked = mockLogger.tracked as ReturnType<typeof vi.fn>
      const loggedData = mockTracked.mock.calls[0]?.[0] as { metadata?: unknown }
      expect(loggedData?.metadata).toBeUndefined()
    })
  })
})