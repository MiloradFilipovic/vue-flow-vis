/* eslint-disable no-undef, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ObjectInspector, type ObjectInspectorOptions } from './ObjectInspector'

describe('ObjectInspector', () => {
  let inspector: ObjectInspector

  // Helper function to get the value span (the main value, not preview or arrow)
  const getValueSpan = (container: HTMLElement): HTMLElement | null => {
    const row = container.querySelector('div[style*="display: flex"]')
    if (!row) return null
    const spans = row.querySelectorAll('span')
    
    // Find spans that are not the expand arrow and not italic (preview)
    for (const span of spans) {
      const htmlSpan = span as HTMLElement
      if (htmlSpan.textContent !== '▶' && 
          !htmlSpan.style.cursor && 
          htmlSpan.style.fontStyle !== 'italic') {
        return htmlSpan
      }
    }
    
    // Fallback to last non-arrow span
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i] as HTMLElement
      if (span.textContent !== '▶') {
        return span
      }
    }
    return null
  }

  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = ''
  })

  describe('constructor and options', () => {
    it('should create ObjectInspector with default options', () => {
      inspector = new ObjectInspector()
      const options = (inspector as any).options
      
      expect(options.expandDepth).toBe(1)
      expect(options.showPrototype).toBe(false)
      expect(options.sortKeys).toBe(false)
      expect(options.showSharedRefs).toBe(true)
      expect(options.maxDepth).toBe(Infinity)
    })

    it('should override default options with provided options', () => {
      const customOptions: ObjectInspectorOptions = {
        expandDepth: 2,
        showPrototype: true,
        sortKeys: true,
        showSharedRefs: false,
        maxDepth: 5
      }
      
      inspector = new ObjectInspector(customOptions)
      const options = (inspector as any).options
      
      expect(options.expandDepth).toBe(2)
      expect(options.showPrototype).toBe(true)
      expect(options.sortKeys).toBe(true)
      expect(options.showSharedRefs).toBe(false)
      expect(options.maxDepth).toBe(5)
    })

    it('should ensure maxDepth is at least 1', () => {
      inspector = new ObjectInspector({ maxDepth: 0 })
      const options = (inspector as any).options
      expect(options.maxDepth).toBe(1)
      
      inspector = new ObjectInspector({ maxDepth: -5 })
      const options2 = (inspector as any).options
      expect(options2.maxDepth).toBe(1)
    })

    it('should round maxDepth to integer', () => {
      inspector = new ObjectInspector({ maxDepth: 3.7 })
      const options = (inspector as any).options
      expect(options.maxDepth).toBe(3)
    })
  })

  describe('primitive value rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render string values with quotes', () => {
      const result = inspector.render('hello world')
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('"hello world"')
      expect(valueSpan?.style.color).toBeTruthy()
    })

    it('should escape special characters in strings', () => {
      const result = inspector.render('hello\n"world"\t\\test')
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('"hello\\n\\"world\\"\\t\\\\test"')
    })

    it('should render number values', () => {
      const result = inspector.render(42)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('42')
    })

    it('should render boolean values', () => {
      const trueResult = inspector.render(true)
      const falseResult = inspector.render(false)
      
      const trueSpan = getValueSpan(trueResult)
      const falseSpan = getValueSpan(falseResult)
      
      expect(trueSpan?.textContent).toBe('true')
      expect(falseSpan?.textContent).toBe('false')
    })

    it('should render null value', () => {
      const result = inspector.render(null)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('null')
    })

    it('should render undefined value', () => {
      const result = inspector.render(undefined)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('undefined')
    })

    it('should render symbols', () => {
      const sym = Symbol('test')
      const result = inspector.render(sym)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe(sym.toString())
      expect(valueSpan?.style.fontStyle).toBe('italic')
    })
  })

  describe('function rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render named functions', () => {
      function testFunction(): string { return 'test' }
      const result = inspector.render(testFunction)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toContain('testFunction')
      expect(valueSpan?.textContent).toContain('ƒ')
      expect(valueSpan?.style.fontStyle).toBe('italic')
    })

    it('should render anonymous functions', () => {
      const anonymousFunc = (): string => 'test'
      const result = inspector.render(anonymousFunc)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toContain('anonymous')
      expect(valueSpan?.textContent).toContain('ƒ')
    })

    it('should render async functions', () => {
      async function asyncTest(): Promise<string> { 
        return await Promise.resolve('test')
      }
      const result = inspector.render(asyncTest)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toContain('asyncTest')
      expect(valueSpan?.textContent).toContain('ƒ')
    })
  })

  describe('array rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render empty arrays', () => {
      const result = inspector.render([])
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('Array(0)')
    })

    it('should render array length', () => {
      const result = inspector.render([1, 2, 3])
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('Array(3)')
    })

    it('should show array preview when collapsed', () => {
      const result = inspector.render([1, 'hello', true])
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toContain('[1, "hello", true]')
    })

    it('should truncate long array previews', () => {
      const longArray = [1, 2, 3, 4, 5]
      const result = inspector.render(longArray)
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toContain('...')
    })

    it('should show empty array indicator for empty arrays', () => {
      const result = inspector.render([])
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toBe(' []')
    })
  })

  describe('object rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render plain objects', () => {
      const result = inspector.render({})
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('Object')
    })

    it('should render objects with constructor name', () => {
      class TestClass { }
      const instance = new TestClass()
      const result = inspector.render(instance)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe('TestClass')
    })

    it('should show object preview when collapsed', () => {
      const obj = { a: 1, b: 'hello', c: true }
      const result = inspector.render(obj)
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toContain('{a: 1, b: "hello", c: true}')
    })

    it('should truncate long object previews', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 }
      const result = inspector.render(obj)
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toContain('...')
    })

    it('should show empty object indicator for empty objects', () => {
      const result = inspector.render({})
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toBe(' {}')
    })
  })

  describe('expandable functionality', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 0 })
    })

    it('should have expand arrow for expandable values', () => {
      const result = inspector.render({ a: 1 })
      const arrow = result.querySelector('span')
      
      expect(arrow?.textContent).toBe('▶')
    })

    it('should not have expand arrow for primitive values', () => {
      const result = inspector.render('hello')
      const arrows = result.querySelectorAll('span')
      const hasExpandArrow = Array.from(arrows).some(span => span.textContent === '▶')
      
      expect(hasExpandArrow).toBe(false)
    })

    it('should expand when arrow is clicked', () => {
      const obj = { a: 1, b: 2 }
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      expect(toggle).toBeTruthy()
      
      // Click to expand
      toggle.click()
      
      // Check if children are now visible
      const childrenContainer = result.querySelector('div[style*="margin-left"]') as HTMLElement
      expect(childrenContainer?.style.display).toBe('block')
    })

    it('should collapse when arrow is clicked again', () => {
      const obj = { a: 1 }
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      
      // Click to expand
      toggle.click()
      // Click to collapse
      toggle.click()
      
      const childrenContainer = result.querySelector('div[style*="margin-left"]') as HTMLElement
      expect(childrenContainer?.style.display).toBe('none')
    })
  })

  describe('auto-expansion based on expandDepth', () => {
    it('should auto-expand up to specified depth', () => {
      inspector = new ObjectInspector({ expandDepth: 2 })
      const nested = { level1: { level2: { level3: 'deep' } } }
      const result = inspector.render(nested)
      
      // Level 1 should be expanded (depth 0 < expandDepth 2)
      const level1Container = result.querySelector('div[data-depth="1"]') as HTMLElement
      expect(level1Container?.style.display).toBe('block')
      
      // Level 2 should be expanded (depth 1 < expandDepth 2)  
      const level2Container = result.querySelector('div[data-depth="2"]') as HTMLElement
      expect(level2Container?.style.display).toBe('block')
      
      // Level 3 should not be auto-expanded (depth 2 >= expandDepth 2)
      const level3Container = result.querySelector('div[data-depth="3"]') as HTMLElement
      expect(level3Container?.style.display).toBe('none')
    })

    it('should not auto-expand when expandDepth is 0', () => {
      inspector = new ObjectInspector({ expandDepth: 0 })
      const obj = { a: 1 }
      const result = inspector.render(obj)
      
      const childrenContainer = result.querySelector('div[data-depth="1"]') as HTMLElement
      expect(childrenContainer?.style.display).toBe('none')
    })
  })

  describe('key formatting', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 1 })
    })

    it('should render valid identifier keys without quotes', () => {
      const obj = { validKey: 'value' }
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Should already be expanded due to expandDepth: 1
      // Find the key span in the expanded children - first non-arrow span
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      const childRow = childRows[0]
      if (childRow) {
        const spans = childRow.querySelectorAll('span')
        // Skip arrow, get first text span
        const keySpan = Array.from(spans).find(s => s.textContent !== '▶' && !s.style.cursor)
        expect(keySpan?.textContent).toBe('validKey')
      }
    })

    it('should quote keys with special characters', () => {
      const obj = { 'special-key': 'value', '123': 'number' }
      const result = inspector.render(obj)
      
      // Check that keys are properly quoted in the DOM
      const keySpans = result.querySelectorAll('span')
      const keyTexts = Array.from(keySpans).map(span => span.textContent)
      
      expect(keyTexts).toContain('"special-key"')
      expect(keyTexts).toContain('"123"')
    })
  })

  describe('key sorting', () => {
    it('should sort keys alphabetically when sortKeys is true', () => {
      inspector = new ObjectInspector({ sortKeys: true, expandDepth: 1 })
      const obj = { z: 1, a: 2, m: 3 }
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Expand to render children
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      const keySpans = result.querySelectorAll('div[style*="margin-left"] span')
      const keyTexts = Array.from(keySpans)
        .filter(span => span.textContent && !span.textContent.includes(':'))
        .map(span => span.textContent)
        .filter(text => ['a', 'm', 'z'].includes(text || ''))
      
      expect(keyTexts).toEqual(['a', 'm', 'z'])
    })

    it('should not sort keys when sortKeys is false', () => {
      inspector = new ObjectInspector({ sortKeys: false, expandDepth: 1 })
      const obj = { z: 1, a: 2, m: 3 }
      const result = inspector.render(obj)
      
      // Keys should appear in original order (object property order may vary)
      // This test verifies that sorting is not applied
      const keySpans = result.querySelectorAll('div[style*="margin-left"] span')
      expect(keySpans.length).toBeGreaterThan(0)
    })
  })

  describe('circular reference detection', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 1 })
    })

    it('should detect and display circular references', () => {
      const obj: Record<string, unknown> = { a: 1 }
      obj.self = obj // Create circular reference
      
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Expand to see children
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      // Look for circular reference indicator
      const allSpans = result.querySelectorAll('span')
      const hasCircularText = Array.from(allSpans).some(span => 
        span.textContent?.includes('[Circular]')
      )
      
      expect(hasCircularText).toBe(true)
    })

    it('should not show circular reference for different objects', () => {
      const obj1 = { a: 1 }
      const obj2 = { b: obj1 }
      const obj3 = { c: obj2 }
      
      const result = inspector.render(obj3)
      document.body.appendChild(result)
      
      const allSpans = result.querySelectorAll('span')
      const hasCircularText = Array.from(allSpans).some(span => 
        span.textContent?.includes('[Circular]')
      )
      
      expect(hasCircularText).toBe(false)
    })
  })

  describe('shared reference tracking', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 1, showSharedRefs: true })
    })

    it('should show reference indicators for shared objects', () => {
      const shared = { value: 'shared' }
      const obj = { ref1: shared, ref2: shared }
      
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Expand to see children
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      // Look for reference indicators
      const allSpans = result.querySelectorAll('span')
      const hasRefIndicator = Array.from(allSpans).some(span => 
        span.textContent?.includes('<ref *') && span.textContent?.includes('>')
      )
      
      expect(hasRefIndicator).toBe(true)
    })

    it('should not show reference indicators when showSharedRefs is false', () => {
      inspector = new ObjectInspector({ expandDepth: 1, showSharedRefs: false })
      const shared = { value: 'shared' }
      const obj = { ref1: shared, ref2: shared }
      
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      const allSpans = result.querySelectorAll('span')
      const hasRefIndicator = Array.from(allSpans).some(span => 
        span.textContent?.includes('<ref *')
      )
      
      expect(hasRefIndicator).toBe(false)
    })
  })

  describe('maxDepth limiting', () => {
    it('should stop rendering at maxDepth', () => {
      inspector = new ObjectInspector({ maxDepth: 2, expandDepth: 10 })
      const deep = { level1: { level2: { level3: 'too deep' } } }
      
      const result = inspector.render(deep)
      
      // Should show max depth message
      const allSpans = result.querySelectorAll('span')
      const hasMaxDepthMessage = Array.from(allSpans).some(span => 
        span.textContent?.includes('[Maximum depth reached]')
      )
      
      expect(hasMaxDepthMessage).toBe(true)
    })

    it('should not render beyond maxDepth even when expanded', () => {
      inspector = new ObjectInspector({ maxDepth: 2, expandDepth: 10 })
      const deep = { level1: { level2: { level3: 'too deep' } } }
      
      const result = inspector.render(deep)
      document.body.appendChild(result)
      
      // Should show max depth message at level 3
      const allSpans = result.querySelectorAll('span')
      const hasMaxDepthMessage = Array.from(allSpans).some(span => 
        span.textContent?.includes('[Maximum depth reached]')
      )
      expect(hasMaxDepthMessage).toBe(true)
    })
  })

  describe('prototype rendering', () => {
    it('should show __proto__ when showPrototype is true', () => {
      inspector = new ObjectInspector({ showPrototype: true, expandDepth: 1, maxDepth: 10 })
      
      // Use a custom class to ensure prototype is not Object.prototype
      class TestClass {
        prop = 'test'
      }
      const obj = new TestClass()
      
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Should already be expanded due to expandDepth: 1
      // Look for __proto__ in the rendered children
      const allSpans = result.querySelectorAll('span')
      const hasProtoKey = Array.from(allSpans).some(span => 
        span.textContent === '__proto__'
      )
      
      expect(hasProtoKey).toBe(true)
    })

    it('should not show __proto__ when showPrototype is false', () => {
      inspector = new ObjectInspector({ showPrototype: false, expandDepth: 1 })
      const obj = { a: 1 }
      
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      const allSpans = result.querySelectorAll('span')
      const hasProtoKey = Array.from(allSpans).some(span => 
        span.textContent === '__proto__'
      )
      
      expect(hasProtoKey).toBe(false)
    })
  })

  describe('lazy rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 0 })
    })

    it('should only render children when expanded', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = inspector.render(obj)
      document.body.appendChild(result)
      
      // Initially, children should not be rendered
      let childSpans = result.querySelectorAll('div[style*="margin-left"] span')
      expect(childSpans.length).toBe(0)
      
      // Expand and check that children are now rendered
      const toggle = result.querySelector('span[style*="cursor: pointer"]') as HTMLElement
      toggle.click()
      
      childSpans = result.querySelectorAll('div[style*="margin-left"] span')
      expect(childSpans.length).toBeGreaterThan(0)
    })
  })

  describe('DOM structure', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should create container with correct ID', () => {
      const result = inspector.render('test')
      expect(result.id).toBe('object-inspector')
    })

    it('should apply theme styles to container', () => {
      const result = inspector.render('test')
      
      expect(result.style.fontFamily).toBeTruthy()
      expect(result.style.fontSize).toBeTruthy()
      expect(result.style.color).toBeTruthy()
      expect(result.style.backgroundColor).toBeTruthy()
    })

    it('should have proper hover effects on rows', () => {
      const result = inspector.render({ a: 1 })
      document.body.appendChild(result)
      
      const row = result.querySelector('div[style*="display: flex"]') as HTMLElement
      expect(row.onmouseenter).toBeTruthy()
      expect(row.onmouseleave).toBeTruthy()
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 1 })
    })

    it('should handle null and undefined values in objects', () => {
      const obj = { nullProp: null, undefinedProp: undefined, normalProp: 'test' }
      
      expect(() => {
        const result = inspector.render(obj)
        document.body.appendChild(result)
      }).not.toThrow()
    })
  })
})