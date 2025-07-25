/* eslint-disable no-undef, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UILogger } from './UILogger'
import type { RenderEventData } from '../../types'
import { theme } from './theme'
import { MAIN_AREA_PLACEHOLDER } from './strings'

// Global mock state for callbacks
let mockCallbacks: {
  onClear: () => void
  onMinimizeToggle: () => void
  onComponentFilterChange: (filter: string) => void
} | null = null

let mockUIManagerInstance: {
  getMainArea: () => HTMLElement | null
  getSidebarContent: () => HTMLElement | null
  clearSearchInput: () => void
  destroy: () => void
} | null = null

// Mock dependencies
vi.mock('./UIManager', () => ({
  UIManager: vi.fn().mockImplementation((callbacks) => {
    mockCallbacks = callbacks
    mockUIManagerInstance = {
      getMainArea: vi.fn(() => document.getElementById('vue-flow-vis-main-area')),
      getSidebarContent: vi.fn(() => document.getElementById('vue-flow-vis-sidebar-content')),
      clearSearchInput: vi.fn(),
      destroy: vi.fn()
    }
    return mockUIManagerInstance
  })
}))

vi.mock('./icons', () => ({
  createComponentIcon: vi.fn((size: number) => `<svg data-icon="component" width="${size}" height="${size}"></svg>`),
  createTrackIcon: vi.fn((size: number) => `<svg data-icon="track" width="${size}" height="${size}"></svg>`),
  createTriggerIcon: vi.fn((size: number) => `<svg data-icon="trigger" width="${size}" height="${size}"></svg>`),
  createFlowIcon: vi.fn((size: number) => `<svg data-icon="flow" width="${size}" height="${size}"></svg>`)
}))

vi.mock('./EventFormatter', () => ({
  EventFormatter: {
    formatKey: vi.fn((key) => String(key)),
    formatTarget: vi.fn((target) => String(target)),
    formatValue: vi.fn((value) => String(value))
  }
}))

// Helper function to create mock event data
function createMockEventData(componentName = 'TestComponent', eventType: 'get' | 'set' = 'get'): RenderEventData {
  return {
    componentName,
    componentPath: `/components/${componentName}.vue`,
    event: {
      type: eventType,
      key: 'testKey',
      target: { reactive: true },
      oldValue: 'oldValue',
      newValue: 'newValue'
    } as any,
    timestamp: Date.now(),
    instanceId: 123
  }
}

// Setup DOM elements that UIManager would normally create
function setupMockDOM(): void {
  const mainArea = document.createElement('div')
  mainArea.id = 'vue-flow-vis-main-area'
  document.body.appendChild(mainArea)
  
  const sidebarContent = document.createElement('div')
  sidebarContent.id = 'vue-flow-vis-sidebar-content'
  document.body.appendChild(sidebarContent)
}

// Helper to convert hex colors to RGB for comparison
function hexToRgb(hex: string): string {
  // Handle hex colors with alpha (like #068261ff)
  const cleanHex = hex.replace(/ff$/, '') // Remove alpha if present
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
  if (!result) return hex
  
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  
  return `rgb(${r}, ${g}, ${b})`
}

describe('UILogger', () => {
  let uiLogger: UILogger

  beforeEach(() => {
    document.body.innerHTML = ''
    setupMockDOM()
    vi.clearAllMocks()
    mockCallbacks = null
    mockUIManagerInstance = null
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('constructor', () => {
    it('should create UILogger instance with UIManager', async () => {
      uiLogger = new UILogger()
      
      expect(uiLogger).toBeInstanceOf(UILogger)
      // Verify UIManager was called with callbacks
      const { UIManager } = await import('./UIManager')
      expect(UIManager).toHaveBeenCalledWith({
        onClear: expect.any(Function),
        onMinimizeToggle: expect.any(Function),
        onComponentFilterChange: expect.any(Function)
      })
    })

    it('should show placeholder text on initialization', () => {
      uiLogger = new UILogger()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const placeholder = mainArea?.querySelector('#vue-flow-vis-placeholder')
      const placeholderText = mainArea?.querySelector('#vue-flow-vis-placeholder-text')
      
      expect(placeholder).toBeTruthy()
      expect(placeholderText?.textContent).toBe(MAIN_AREA_PLACEHOLDER)
    })
  })

  describe('tracked() method', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should add tracked event to component group', () => {
      const eventData = createMockEventData('TestComponent')
      
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent')
      expect(componentItem).toBeTruthy()
      
      const eventCountSpan = componentItem?.querySelector('#vue-flow-vis-count-span-TestComponent')
      expect(eventCountSpan?.textContent).toBe('1 events')
    })

    it('should increment event count for multiple events', () => {
      const eventData = createMockEventData('TestComponent')
      
      uiLogger.tracked(eventData)
      uiLogger.tracked(eventData)
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const eventCountSpan = sidebarContent?.querySelector('#vue-flow-vis-count-span-TestComponent')
      expect(eventCountSpan?.textContent).toBe('3 events')
    })

    it('should create separate groups for different components', () => {
      const eventData1 = createMockEventData('Component1')
      const eventData2 = createMockEventData('Component2')
      
      uiLogger.tracked(eventData1)
      uiLogger.tracked(eventData2)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const component1Item = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-Component1')
      const component2Item = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-Component2')
      
      expect(component1Item).toBeTruthy()
      expect(component2Item).toBeTruthy()
    })
  })

  describe('triggered() method', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should add triggered event to component group', () => {
      const eventData = createMockEventData('TestComponent', 'set')
      
      uiLogger.triggered(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent')
      expect(componentItem).toBeTruthy()
      
      const eventCountSpan = componentItem?.querySelector('#vue-flow-vis-count-span-TestComponent')
      expect(eventCountSpan?.textContent).toBe('1 events')
    })

    it('should handle mixed tracked and triggered events', () => {
      const trackedEvent = createMockEventData('TestComponent', 'get')
      const triggeredEvent = createMockEventData('TestComponent', 'set')
      
      uiLogger.tracked(trackedEvent)
      uiLogger.triggered(triggeredEvent)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const eventCountSpan = sidebarContent?.querySelector('#vue-flow-vis-count-span-TestComponent')
      expect(eventCountSpan?.textContent).toBe('2 events')
    })
  })

  describe('component selection', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should display component events when component is selected', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      
      // Simulate component selection
      componentItem.click()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const componentHeader = mainArea?.querySelector('#vue-flow-vis-component-header-TestComponent')
      const componentTitle = mainArea?.querySelector('#vue-flow-vis-component-title-TestComponent')
      
      expect(componentHeader).toBeTruthy()
      expect(componentTitle?.textContent).toBe('/components/TestComponent.vue')
    })

    it('should update visual state when component is selected', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      
      componentItem.click()
      
      // Convert hex color to RGB for comparison
      const expectedColor = hexToRgb(theme.colors.backgroundHover)
      expect(componentItem.style.backgroundColor).toBe(expectedColor)
    })

    it('should show "No events recorded yet" when component has no events', () => {
      // Create component group without events by accessing private methods
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      // Clear events manually to test empty state
      const componentGroups = (uiLogger as any).componentGroups
      const group = componentGroups.get('TestComponent')
      if (group) {
        group.events = []
        group.eventCount = 0
      }
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const noEventsMessage = mainArea?.querySelector('#vue-flow-vis-no-events-TestComponent')
      expect(noEventsMessage?.textContent).toBe('No events recorded yet')
    })
  })

  describe('event filtering', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should toggle tracked events visibility', () => {
      const trackedEvent = createMockEventData('TestComponent', 'get')
      const triggeredEvent = createMockEventData('TestComponent', 'set')
      
      uiLogger.tracked(trackedEvent)
      uiLogger.triggered(triggeredEvent)
      
      // Select component to see events
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      // Check initial button state (should be enabled/colored)
      const trackedButton = document.getElementById('vue-flow-vis-tracked-button-TestComponent') as HTMLButtonElement
      // Button should initially be colored with the tracked color
      expect(trackedButton.style.color).toBe('rgb(6, 130, 97)')
      
      // Toggle tracked events off - this calls displayComponentEvents which recreates the buttons
      trackedButton.click()
      
      // Get the button again as it was recreated during displayComponentEvents
      const trackedButtonAfter = document.getElementById('vue-flow-vis-tracked-button-TestComponent') as HTMLButtonElement
      expect(trackedButtonAfter.style.color).toBe('rgb(204, 204, 204)')
    })

    it('should toggle triggered events visibility', () => {
      const triggeredEvent = createMockEventData('TestComponent', 'set')
      uiLogger.triggered(triggeredEvent)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      // Check initial button state (should be enabled/colored)
      const triggerButton = document.getElementById('vue-flow-vis-trigger-button-TestComponent') as HTMLButtonElement
      // Button should initially be colored with the triggered color
      expect(triggerButton.style.color).toBe('rgb(255, 152, 0)')
      
      // Toggle triggered events off - this calls displayComponentEvents which recreates the buttons
      triggerButton.click()
      
      // Get the button again as it was recreated during displayComponentEvents
      const triggerButtonAfter = document.getElementById('vue-flow-vis-trigger-button-TestComponent') as HTMLButtonElement
      expect(triggerButtonAfter.style.color).toBe('rgb(204, 204, 204)')
    })
  })

  describe('component filtering', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should filter components based on search input', () => {
      const eventData1 = createMockEventData('ComponentA')
      const eventData2 = createMockEventData('ComponentB')
      
      uiLogger.tracked(eventData1)
      uiLogger.triggered(eventData2)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentAItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-ComponentA') as HTMLDivElement
      const componentBItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-ComponentB') as HTMLDivElement
      
      // Initially both should be visible (display style is not set initially, so it should be empty or 'flex')
      expect(componentAItem.style.display).toBe('flex')
      expect(componentBItem.style.display).toBe('flex')
      
      // Simulate filter change using global mock callbacks (case-insensitive)
      mockCallbacks?.onComponentFilterChange('a')
      
      // After filtering, ComponentA should be visible, ComponentB should be hidden
      expect(componentAItem.style.display).toBe('flex')
      expect(componentBItem.style.display).toBe('none')
    })

    it('should show all components when filter is cleared', () => {
      const eventData1 = createMockEventData('ComponentA')
      const eventData2 = createMockEventData('ComponentB')
      
      uiLogger.tracked(eventData1)
      uiLogger.triggered(eventData2)
      
      // Apply filter
      mockCallbacks?.onComponentFilterChange('a')
      // Clear filter
      mockCallbacks?.onComponentFilterChange('')
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentAItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-ComponentA') as HTMLDivElement
      const componentBItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-ComponentB') as HTMLDivElement
      
      expect(componentAItem.style.display).toBe('flex')
      expect(componentBItem.style.display).toBe('flex')
    })
  })

  describe('event selection and details', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should show event details when event is selected', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      // Select component
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      // Select event
      const eventDiv = document.querySelector('#vue-flow-vis-event-TestComponent-0') as HTMLDivElement
      eventDiv.click()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const detailsArea = mainArea?.querySelector('#vue-flow-vis-event-details-area')
      expect(detailsArea).toBeTruthy()
      
      const eventTypeField = detailsArea?.querySelector('#vue-flow-vis-detail-field-event-type')
      expect(eventTypeField).toBeTruthy()
    })

    it('should update event visual state when selected', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      const eventDiv = document.querySelector('#vue-flow-vis-event-TestComponent-0') as HTMLDivElement
      eventDiv.click()
      
      const expectedColor = hexToRgb(theme.colors.backgroundHover)
      expect(eventDiv.style.backgroundColor).toBe(expectedColor)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should display error message in main area', () => {
      const error = new Error('Test error message')
      
      uiLogger.error(error)
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const errorDiv = mainArea?.querySelector('[id^="vue-flow-vis-error-"]')
      
      expect(errorDiv).toBeTruthy()
      expect(errorDiv?.textContent).toContain('Test error message')
      expect(errorDiv?.textContent).toContain('[Error]')
    })

    it('should handle errors gracefully when main area is not available', () => {
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      mainArea?.remove()
      
      const error = new Error('Test error')
      
      expect(() => uiLogger.error(error)).not.toThrow()
    })
  })

  describe('clear functionality', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should clear all components and reset state when clear is called', () => {
      const eventData1 = createMockEventData('Component1')
      const eventData2 = createMockEventData('Component2')
      
      uiLogger.tracked(eventData1)
      uiLogger.triggered(eventData2)
      
      // Simulate clear action
      mockCallbacks?.onClear()
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      expect(sidebarContent?.innerHTML).toBe('')
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const placeholder = mainArea?.querySelector('#vue-flow-vis-placeholder')
      expect(placeholder).toBeTruthy()
    })

    it('should clear search input when clear is called', () => {
      mockCallbacks?.onClear()
      
      expect(mockUIManagerInstance?.clearSearchInput).toHaveBeenCalled()
    })
  })

  describe('edge cases and robustness', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should handle component names with special characters', () => {
      const eventData = createMockEventData('Test-Component_123')
      
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-Test-Component-123')
      expect(componentItem).toBeTruthy()
    })

    it('should handle missing componentPath gracefully', () => {
      const eventData = createMockEventData('TestComponent')
      eventData.componentPath = ''
      
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      componentItem.click()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      const componentTitle = mainArea?.querySelector('#vue-flow-vis-component-title-TestComponent')
      expect(componentTitle?.textContent).toBe('TestComponent')
    })

    it('should handle undefined event properties gracefully', () => {
      const eventData = createMockEventData('TestComponent')
      eventData.event = {
        type: undefined,
        key: undefined,
        target: undefined
      } as any
      
      expect(() => uiLogger.tracked(eventData)).not.toThrow()
    })

    it('should handle DOM manipulation when sidebar content is not available', () => {
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      sidebarContent?.remove()
      
      const eventData = createMockEventData('TestComponent')
      
      expect(() => uiLogger.tracked(eventData)).not.toThrow()
    })
  })

  describe('hover effects', () => {
    beforeEach(() => {
      uiLogger = new UILogger()
    })

    it('should apply hover effect to sidebar items', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      
      // Simulate mouse enter
      componentItem.dispatchEvent(new MouseEvent('mouseenter'))
      const expectedHoverColor = hexToRgb(theme.colors.backgroundHover)
      expect(componentItem.style.backgroundColor).toBe(expectedHoverColor)
      
      // Simulate mouse leave
      componentItem.dispatchEvent(new MouseEvent('mouseleave'))
      const expectedTransparentColor = hexToRgb(theme.colors.transparent) || 'rgba(0, 0, 0, 0)'
      expect(componentItem.style.backgroundColor).toBe(expectedTransparentColor)
    })

    it('should maintain selected state during hover', () => {
      const eventData = createMockEventData('TestComponent')
      uiLogger.tracked(eventData)
      
      const sidebarContent = document.getElementById('vue-flow-vis-sidebar-content')
      const componentItem = sidebarContent?.querySelector('#vue-flow-vis-sidebar-item-TestComponent') as HTMLDivElement
      
      // Select component first
      componentItem.click()
      
      // Mouse leave should maintain selected background
      componentItem.dispatchEvent(new MouseEvent('mouseleave'))
      const expectedColor = hexToRgb(theme.colors.backgroundHover)
      expect(componentItem.style.backgroundColor).toBe(expectedColor)
    })
  })
})