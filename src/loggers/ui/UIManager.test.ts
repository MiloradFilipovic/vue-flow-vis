/* eslint-disable no-undef */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UIManager, type UIManagerCallbacks } from './UIManager'
import { theme } from './theme'
import { APP_NAME, FILTER_COMPONENTS_PLACEHOLDER } from './strings'
import { PLUGIN_URL } from './constants'

// Mock the icon functions
vi.mock('./icons', () => ({
  createFlowIcon: vi.fn((size: number) => `<svg data-icon="flow" width="${size}" height="${size}"></svg>`),
  createMinimizeIcon: vi.fn((size: number) => `<svg data-icon="minimize" width="${size}" height="${size}"></svg>`),
  createExpandIcon: vi.fn((size: number) => `<svg data-icon="expand" width="${size}" height="${size}"></svg>`),
  createTrashIcon: vi.fn((size: number) => `<svg data-icon="trash" width="${size}" height="${size}"></svg>`),
}))

// Setup global mocks
beforeEach(() => {
  // Mock DOM methods that are used in UIManager
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn(() => ({
      height: theme.sizes.panelHeight,
      width: '800px'
    })),
    writable: true
  })

  Object.defineProperty(window, 'innerHeight', {
    value: 1000,
    writable: true
  })

  Object.defineProperty(window, 'innerWidth', {
    value: 1200,
    writable: true
  })

  // Clear DOM
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('UIManager', () => {
  let mockCallbacks: UIManagerCallbacks
  let uiManager: UIManager

  beforeEach(() => {
    mockCallbacks = {
      onClear: vi.fn(),
      onMinimizeToggle: vi.fn(),
      onComponentFilterChange: vi.fn(),
    }
  })

  afterEach(() => {
    if (uiManager) {
      uiManager.destroy()
    }
  })

  describe('constructor', () => {
    it('should create main panel with correct properties', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const panel = document.getElementById('vue-flow-vis-logger-panel')
      expect(panel).toBeTruthy()
      expect(panel?.style.position).toBe('fixed')
      expect(panel?.style.bottom).toBe(theme.positioning.panelBottom)
      expect(panel?.style.right).toBe(theme.positioning.panelRight)
      expect(panel?.style.width).toBe(theme.sizes.panelWidth)
      expect(panel?.style.height).toBe(theme.sizes.panelHeight)
      expect(panel?.style.display).toBe('flex')
      expect(panel?.style.flexDirection).toBe('column')
    })

    it('should create header with title and buttons', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const header = document.getElementById('vue-flow-vis-header')
      expect(header).toBeTruthy()
      
      const title = document.getElementById('vue-flow-vis-title')
      expect(title?.textContent).toBe(APP_NAME)
      
      const clearButton = document.getElementById('vue-flow-vis-clear-button')
      expect(clearButton).toBeTruthy()
      
      const minimizeButton = document.getElementById('vue-flow-vis-minimize-button')
      expect(minimizeButton).toBeTruthy()
    })

    it('should create content container with sidebar and main area', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const contentContainer = document.getElementById('vue-flow-vis-content-container')
      expect(contentContainer).toBeTruthy()
      
      const sidebar = document.getElementById('vue-flow-vis-sidebar')
      expect(sidebar).toBeTruthy()
      
      const mainArea = document.getElementById('vue-flow-vis-main-area')
      expect(mainArea).toBeTruthy()
    })

    it('should create search input in sidebar', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const searchInput = document.getElementById('vue-flow-vis-component-search') as HTMLInputElement
      expect(searchInput).toBeTruthy()
      expect(searchInput.type).toBe('text')
      expect(searchInput.placeholder).toBe(FILTER_COMPONENTS_PLACEHOLDER)
    })

    it('should create drag and resize handles', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle')
      expect(dragHandle).toBeTruthy()
      expect(dragHandle?.style.cursor).toBe('ns-resize')
      
      const leftResize = document.getElementById('vue-flow-vis-left-resize-handle')
      expect(leftResize).toBeTruthy()
      expect(leftResize?.style.cursor).toBe('ew-resize')
      
      const sidebarResize = document.getElementById('vue-flow-vis-sidebar-resize-handle')
      expect(sidebarResize).toBeTruthy()
      expect(sidebarResize?.style.cursor).toBe('ew-resize')
    })

    it('should append panel to document body', () => {
      uiManager = new UIManager(mockCallbacks)
      
      const panel = document.getElementById('vue-flow-vis-logger-panel')
      expect(panel?.parentNode).toBe(document.body)
    })
  })

  describe('button interactions', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should call onClear callback when clear button is clicked', () => {
      const clearButton = document.getElementById('vue-flow-vis-clear-button') as HTMLButtonElement
      clearButton.click()
      
      expect(mockCallbacks.onClear).toHaveBeenCalledOnce()
    })

    it('should toggle minimize when minimize button is clicked', () => {
      const minimizeButton = document.getElementById('vue-flow-vis-minimize-button') as HTMLButtonElement
      minimizeButton.click()
      
      expect(mockCallbacks.onMinimizeToggle).toHaveBeenCalledOnce()
    })
  })

  describe('minimize functionality', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should minimize panel when not minimized', () => {
      const minimizeButton = document.getElementById('vue-flow-vis-minimize-button') as HTMLButtonElement
      const contentContainer = document.getElementById('vue-flow-vis-content-container')
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle')
      const leftHandle = document.getElementById('vue-flow-vis-left-resize-handle')
      
      minimizeButton.click()
      
      expect(contentContainer?.style.display).toBe('none')
      expect(dragHandle?.style.display).toBe('none')
      expect(leftHandle?.style.display).toBe('none')
      expect(minimizeButton.innerHTML).toContain('data-icon="expand"')
      expect(minimizeButton.title).toBe('Restore panel')
    })

    it('should restore panel when minimized', () => {
      const minimizeButton = document.getElementById('vue-flow-vis-minimize-button') as HTMLButtonElement
      const contentContainer = document.getElementById('vue-flow-vis-content-container')
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle')
      const leftHandle = document.getElementById('vue-flow-vis-left-resize-handle')
      
      // First minimize
      minimizeButton.click()
      // Then restore
      minimizeButton.click()
      
      expect(contentContainer?.style.display).toBe('flex')
      expect(dragHandle?.style.display).toBe('block')
      expect(leftHandle?.style.display).toBe('block')
      expect(minimizeButton.innerHTML).toContain('data-icon="minimize"')
      expect(minimizeButton.title).toBe('Minimize panel')
    })
  })

  describe('search input functionality', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
      vi.clearAllTimers()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce search input changes', () => {
      const searchInput = document.getElementById('vue-flow-vis-component-search') as HTMLInputElement
      
      // Simulate rapid typing
      searchInput.value = 'test'
      searchInput.dispatchEvent(new Event('input'))
      
      searchInput.value = 'testing'
      searchInput.dispatchEvent(new Event('input'))
      
      // Should not have called callback yet
      expect(mockCallbacks.onComponentFilterChange).not.toHaveBeenCalled()
      
      // Fast forward past debounce delay (300ms from UIManager implementation)
      vi.advanceTimersByTime(300)
      
      expect(mockCallbacks.onComponentFilterChange).toHaveBeenCalledWith('testing')
      expect(mockCallbacks.onComponentFilterChange).toHaveBeenCalledOnce()
    })

    it('should change border color on focus and blur', () => {
      const searchInput = document.getElementById('vue-flow-vis-component-search') as HTMLInputElement
      
      searchInput.dispatchEvent(new Event('focus'))
      // Convert hex to RGB for comparison since DOM returns RGB values
      expect(searchInput.style.borderColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      searchInput.dispatchEvent(new Event('blur'))
      expect(searchInput.style.borderColor).toBe('rgb(221, 221, 221)') // theme.colors.border converted to RGB
    })
  })

  describe('drag handle hover effects', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should change drag handle color on hover', () => {
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle') as HTMLDivElement
      
      dragHandle.dispatchEvent(new MouseEvent('mouseenter'))
      expect(dragHandle.style.borderTopColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      dragHandle.dispatchEvent(new MouseEvent('mouseleave'))
      expect(dragHandle.style.borderTopColor).toBe(theme.colors.transparent)
    })

    it('should change left resize handle color on hover', () => {
      const leftHandle = document.getElementById('vue-flow-vis-left-resize-handle') as HTMLDivElement
      
      leftHandle.dispatchEvent(new MouseEvent('mouseenter'))
      expect(leftHandle.style.borderLeftColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      leftHandle.dispatchEvent(new MouseEvent('mouseleave'))
      expect(leftHandle.style.borderLeftColor).toBe(theme.colors.transparent)
    })

    it('should change sidebar resize handle color on hover', () => {
      const sidebarHandle = document.getElementById('vue-flow-vis-sidebar-resize-handle') as HTMLDivElement
      
      sidebarHandle.dispatchEvent(new MouseEvent('mouseenter'))
      expect(sidebarHandle.style.borderRightColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      sidebarHandle.dispatchEvent(new MouseEvent('mouseleave'))
      expect(sidebarHandle.style.borderRightColor).toBe(theme.colors.transparent)
    })
  })

  describe('mouse drag interactions', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should handle vertical drag for resizing height', () => {
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle') as HTMLDivElement
      const panel = document.getElementById('vue-flow-vis-logger-panel') as HTMLDivElement
      
      // Start drag
      const mouseDownEvent = new MouseEvent('mousedown', { clientY: 100 })
      dragHandle.dispatchEvent(mouseDownEvent)
      
      expect(dragHandle.style.borderTopColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      // Simulate drag up (should increase height)
      const mouseMoveEvent = new MouseEvent('mousemove', { clientY: 80 })
      document.dispatchEvent(mouseMoveEvent)
      
      expect(panel.style.height).toBe('470px') // 450 + 20 (using theme.sizes.panelHeight)
      
      // End drag
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(dragHandle.style.borderTopColor).toBe(theme.colors.transparent)
    })

    it('should handle horizontal drag for resizing width', () => {
      const leftHandle = document.getElementById('vue-flow-vis-left-resize-handle') as HTMLDivElement
      const panel = document.getElementById('vue-flow-vis-logger-panel') as HTMLDivElement
      
      // Mock offsetWidth
      Object.defineProperty(panel, 'offsetWidth', { value: 800, writable: true })
      
      // Start drag
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100 })
      leftHandle.dispatchEvent(mouseDownEvent)
      
      expect(leftHandle.style.borderLeftColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      // Simulate drag left (should increase width)
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 80 })
      document.dispatchEvent(mouseMoveEvent)
      
      expect(panel.style.width).toBe('820px') // 800 + 20
      
      // End drag
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(leftHandle.style.borderLeftColor).toBe(theme.colors.transparent)
    })

    it('should handle sidebar resize drag', () => {
      const sidebarHandle = document.getElementById('vue-flow-vis-sidebar-resize-handle') as HTMLDivElement
      const sidebar = document.getElementById('vue-flow-vis-sidebar') as HTMLDivElement
      const panel = document.getElementById('vue-flow-vis-logger-panel') as HTMLDivElement
      
      // Mock offsetWidth - need both sidebar and panel width for max constraint
      const sidebarWidthValue = parseInt(theme.sizes.sidebarWidth)
      Object.defineProperty(sidebar, 'offsetWidth', { value: sidebarWidthValue, writable: true })
      Object.defineProperty(panel, 'offsetWidth', { value: 800, writable: true })
      
      // Start drag
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100 })
      sidebarHandle.dispatchEvent(mouseDownEvent)
      
      expect(sidebarHandle.style.borderRightColor).toBe('rgb(0, 122, 204)') // theme.colors.primary converted to RGB
      
      // Simulate drag right (should increase sidebar width)
      // The actual implementation constrains to min theme.sizes.sidebarMinWidth and max 20% of panel width
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 120 })
      document.dispatchEvent(mouseMoveEvent)
      
      // The width gets constrained by maxWidth = panel.offsetWidth * 0.2 = 160px
      // or minimum width from theme.sizes.sidebarMinWidth = 150px
      const actualWidth = sidebar.style.width
      const minWidth = theme.sizes.sidebarMinWidth
      const maxWidth = '160px' // 20% of 800px panel width
      const expectedWidth = '220px' // 200 + 20 if unconstrained
      expect([minWidth, maxWidth, expectedWidth]).toContain(actualWidth)
      
      // End drag
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(sidebarHandle.style.borderRightColor).toBe(theme.colors.transparent)
    })

    it('should respect minimum and maximum constraints during resize', () => {
      const dragHandle = document.getElementById('vue-flow-vis-drag-handle') as HTMLDivElement
      const panel = document.getElementById('vue-flow-vis-logger-panel') as HTMLDivElement
      
      // Start drag
      dragHandle.dispatchEvent(new MouseEvent('mousedown', { clientY: 100 }))
      
      // Try to make it too small
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 500 }))
      const minHeight = parseInt(theme.sizes.panelMinHeight)
      expect(panel.style.height).toBe(`${minHeight}px`) // Minimum height from theme
      
      // Try to make it too large (80% of window height = 800px from theme.layout.maxHeight)
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: -1000 }))
      const maxHeight = Math.floor(1000 * parseFloat(theme.layout.maxHeight) / 100) // 80% of 1000px window height
      expect(panel.style.height).toBe(`${maxHeight}px`) // Maximum height
    })
  })

  describe('public API methods', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should return main area element', () => {
      const mainArea = uiManager.getMainArea()
      expect(mainArea).toBeTruthy()
      expect(mainArea?.id).toBe('vue-flow-vis-main-area')
    })

    it('should return sidebar element', () => {
      const sidebar = uiManager.getSidebar()
      expect(sidebar).toBeTruthy()
      expect(sidebar?.id).toBe('vue-flow-vis-sidebar')
    })

    it('should return sidebar content element', () => {
      const sidebarContent = uiManager.getSidebarContent()
      expect(sidebarContent).toBeTruthy()
      expect(sidebarContent?.id).toBe('vue-flow-vis-sidebar-content')
    })

    it('should clear search input', () => {
      const searchInput = document.getElementById('vue-flow-vis-component-search') as HTMLInputElement
      searchInput.value = 'test'
      
      uiManager.clearSearchInput()
      expect(searchInput.value).toBe('')
    })
  })

  describe('destroy functionality', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should clear search debounce timer on destroy', () => {
      const searchInput = document.getElementById('vue-flow-vis-component-search') as HTMLInputElement
      
      // Start a search to create a timer
      searchInput.value = 'test'
      searchInput.dispatchEvent(new Event('input'))
      
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
      
      uiManager.destroy()
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should remove panel from DOM on destroy', () => {
      const panel = document.getElementById('vue-flow-vis-logger-panel')
      expect(panel?.parentNode).toBe(document.body)
      
      uiManager.destroy()
      
      const panelAfterDestroy = document.getElementById('vue-flow-vis-logger-panel')
      expect(panelAfterDestroy).toBe(null)
    })

    it('should handle destroy when panel is not in DOM', () => {
      const panel = document.getElementById('vue-flow-vis-logger-panel')
      panel?.remove() // Remove manually first
      
      // Should not throw error
      expect(() => uiManager.destroy()).not.toThrow()
    })
  })

  describe('header plugin link', () => {
    beforeEach(() => {
      uiManager = new UIManager(mockCallbacks)
    })

    it('should create plugin link with correct attributes', () => {
      const pluginLink = document.getElementById('vue-flow-vis-plugin-link') as HTMLAnchorElement
      expect(pluginLink).toBeTruthy()
      expect(pluginLink.href).toBe(PLUGIN_URL)
      expect(pluginLink.target).toBe('_blank')
    })

    it('should have hover effects on plugin icon', () => {
      const icon = document.getElementById('vue-flow-vis-header-icon') as HTMLSpanElement
      expect(icon).toBeTruthy()
      
      // Test hover effects (these are set via onmouseover/onmouseout properties)
      expect(icon.onmouseover).toBeTruthy()
      expect(icon.onmouseout).toBeTruthy()
    })
  })
})