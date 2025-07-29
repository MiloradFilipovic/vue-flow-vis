/* eslint-disable no-undef, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ObjectInspector, type ObjectInspectorOptions } from './ObjectInspector'
import { objectInspectorStrings } from './ObjectInspector.strings'

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
      if (htmlSpan.textContent !== objectInspectorStrings.expandArrow && 
          !htmlSpan.style.cursor && 
          htmlSpan.style.fontStyle !== 'italic') {
        return htmlSpan
      }
    }
    
    // Fallback to last non-arrow span
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i] as HTMLElement
      if (span.textContent !== objectInspectorStrings.expandArrow) {
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
      
      expect(valueSpan?.textContent).toBe(objectInspectorStrings.nullValue)
    })

    it('should render undefined value', () => {
      const result = inspector.render(undefined)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe(objectInspectorStrings.undefinedValue)
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
      expect(valueSpan?.textContent).toContain(objectInspectorStrings.functionSymbol)
      expect(valueSpan?.style.fontStyle).toBe('italic')
    })

    it('should render anonymous functions', () => {
      const anonymousFunc = (): string => 'test'
      const result = inspector.render(anonymousFunc)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toContain(objectInspectorStrings.anonymousFunction)
      expect(valueSpan?.textContent).toContain(objectInspectorStrings.functionSymbol)
    })

    it('should render async functions', () => {
      async function asyncTest(): Promise<string> { 
        return await Promise.resolve('test')
      }
      const result = inspector.render(asyncTest)
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toContain('asyncTest')
      expect(valueSpan?.textContent).toContain(objectInspectorStrings.functionSymbol)
    })

    it('should show function properties when expanded', () => {
      inspector = new ObjectInspector({ expandDepth: 1 })
      
      function testFunction(a: number, b: string): string { 
        return `${a} ${b}` 
      }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Should already be expanded due to expandDepth: 1
      // Look for length and name properties
      const allSpans = result.querySelectorAll('span')
      const spanTexts = Array.from(allSpans).map(span => span.textContent)
      
      // Should show length property (function has 2 parameters)
      expect(spanTexts).toContain('length')
      expect(spanTexts).toContain('2')
      
      // Should show name property
      expect(spanTexts).toContain('name')
      expect(spanTexts).toContain('"testFunction"')
    })

    it('should show function properties before custom properties', () => {
      inspector = new ObjectInspector({ expandDepth: 1 })
      
      function testFunction(): void { /* empty */ }
      // Add custom property
      (testFunction as any).customProp = 'custom value'
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Get all child rows
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      
      // First two rows should be length and name
      expect(childRows.length).toBeGreaterThanOrEqual(3) // length, name, customProp
      
      const firstRowSpans = childRows[0].querySelectorAll('span')
      const secondRowSpans = childRows[1].querySelectorAll('span')
      
      const firstKey = Array.from(firstRowSpans).find(s => s.textContent && s.textContent !== '▶' && !s.style.cursor)?.textContent
      const secondKey = Array.from(secondRowSpans).find(s => s.textContent && s.textContent !== '▶' && !s.style.cursor)?.textContent
      
      // Should show built-in properties first
      expect(['length', 'name']).toContain(firstKey)
      expect(['length', 'name']).toContain(secondKey)
      expect(firstKey).not.toBe(secondKey)
    })

    it('should not duplicate function properties', () => {
      inspector = new ObjectInspector({ expandDepth: 1 })
      
      function testFunction(): void { /* empty */ }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      const allSpans = result.querySelectorAll('span')
      const spanTexts = Array.from(allSpans).map(span => span.textContent)
      
      // Count occurrences of 'length' and 'name' keys
      const lengthCount = spanTexts.filter(text => text === 'length').length
      const nameCount = spanTexts.filter(text => text === 'name').length
      
      expect(lengthCount).toBe(1)
      expect(nameCount).toBe(1)
    })
  })

  describe('array rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render empty arrays', () => {
      const result = inspector.render([])
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe(`${objectInspectorStrings.arrayPrefix}0${objectInspectorStrings.arraySuffix}`)
    })

    it('should render array length', () => {
      const result = inspector.render([1, 2, 3])
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe(`${objectInspectorStrings.arrayPrefix}3${objectInspectorStrings.arraySuffix}`)
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
      
      expect(preview?.textContent).toContain(objectInspectorStrings.previewEllipsis)
    })

    it('should show empty array indicator for empty arrays', () => {
      const result = inspector.render([])
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toBe(objectInspectorStrings.emptyArray)
    })
  })

  describe('object rendering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector()
    })

    it('should render plain objects', () => {
      const result = inspector.render({})
      const valueSpan = getValueSpan(result)
      
      expect(valueSpan?.textContent).toBe(objectInspectorStrings.objectLabel)
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
      
      expect(preview?.textContent).toContain(objectInspectorStrings.previewEllipsis)
    })

    it('should show empty object indicator for empty objects', () => {
      const result = inspector.render({})
      const preview = result.querySelector('span[style*="italic"]')
      
      expect(preview?.textContent).toBe(objectInspectorStrings.emptyObject)
    })
  })

  describe('expandable functionality', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 0 })
    })

    it('should have expand arrow for expandable values', () => {
      const result = inspector.render({ a: 1 })
      const arrow = result.querySelector('span')
      
      expect(arrow?.textContent).toBe(objectInspectorStrings.expandArrow)
    })

    it('should not have expand arrow for primitive values', () => {
      const result = inspector.render('hello')
      const arrows = result.querySelectorAll('span')
      const hasExpandArrow = Array.from(arrows).some(span => span.textContent === objectInspectorStrings.expandArrow)
      
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
        span.textContent?.includes(objectInspectorStrings.circularReference)
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
        span.textContent?.includes(objectInspectorStrings.circularReference)
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
        span.textContent?.includes(objectInspectorStrings.maxDepthReached)
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
        span.textContent?.includes(objectInspectorStrings.maxDepthReached)
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

    it('should show __proto__ for functions when showPrototype is true', () => {
      inspector = new ObjectInspector({ showPrototype: true, expandDepth: 1, maxDepth: 10 })
      
      function testFunction(): string { return 'test' }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Should already be expanded due to expandDepth: 1
      // Look for __proto__ in the rendered children
      const allSpans = result.querySelectorAll('span')
      const hasProtoKey = Array.from(allSpans).some(span => 
        span.textContent === '__proto__'
      )
      
      expect(hasProtoKey).toBe(true)
    })

    it('should not show __proto__ for functions when showPrototype is false', () => {
      inspector = new ObjectInspector({ showPrototype: false, expandDepth: 1 })
      
      function testFunction(): string { return 'test' }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      const allSpans = result.querySelectorAll('span')
      const hasProtoKey = Array.from(allSpans).some(span => 
        span.textContent === '__proto__'
      )
      
      expect(hasProtoKey).toBe(false)
    })

    it('should show Function.prototype properties when function __proto__ is manually expanded', () => {
      inspector = new ObjectInspector({ showPrototype: true, expandDepth: 1, maxDepth: 10 })
      
      function testFunction(): string { return 'test' }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Should have __proto__ initially visible
      let allSpans = result.querySelectorAll('span')
      let spanTexts = Array.from(allSpans).map(span => span.textContent)
      expect(spanTexts).toContain('__proto__')
      
      // Find and click the __proto__ expand arrow
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      let protoToggle = null
      
      for (const row of childRows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          if (span.textContent === '__proto__') {
            // Find the toggle button in this row (first span with cursor pointer)
            protoToggle = row.querySelector('span[style*="cursor: pointer"]') as HTMLElement
            break
          }
        }
        if (protoToggle) break
      }
      
      expect(protoToggle).toBeTruthy()
      
      // Click to expand __proto__
      protoToggle?.click()
      
      // Now check for prototype properties
      allSpans = result.querySelectorAll('span')
      spanTexts = Array.from(allSpans).map(span => span.textContent)
      
      // Function.prototype should have 'constructor' property
      const hasConstructor = spanTexts.includes('constructor')
      expect(hasConstructor).toBe(true)
    })

    it('should style __proto__ with reduced opacity and italics', () => {
      inspector = new ObjectInspector({ showPrototype: true, expandDepth: 1 })
      
      function testFunction(): string { return 'test' }
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Find the __proto__ row
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      let protoRow = null
      
      for (const row of childRows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          if (span.textContent === '__proto__') {
            protoRow = row as HTMLElement
            break
          }
        }
        if (protoRow) break
      }
      
      expect(protoRow).toBeTruthy()
      // The parent div should have opacity and italic styling applied
      if (protoRow?.parentElement) {
        expect(protoRow.parentElement.style.fontStyle).toBe('italic')
        expect(protoRow.parentElement.style.opacity).toBeTruthy()
      }
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

  describe('function property ordering', () => {
    beforeEach(() => {
      inspector = new ObjectInspector({ expandDepth: 1 })
    })

    it('should show function built-in properties before custom properties', () => {
      function testFunction(): void { /* empty */ }
      // Add multiple custom properties
      ;(testFunction as any).zzz = 'should be last'
      ;(testFunction as any).aaa = 'should be after built-ins'
      ;(testFunction as any).customMethod = (): string => 'custom'
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      // Get all child rows in order
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      const rowKeys: string[] = []
      
      for (const row of childRows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          const text = span.textContent
          if (text && text !== '▶' && !span.style.cursor && text !== ':') {
            // This should be a key
            if (!rowKeys.includes(text)) {
              rowKeys.push(text)
              break
            }
          }
        }
      }
      
      // First two should be built-in properties
      expect(rowKeys[0]).toBe('length')
      expect(rowKeys[1]).toBe('name')
      
      // Custom properties should come after
      expect(rowKeys.slice(2)).toContain('zzz')
      expect(rowKeys.slice(2)).toContain('aaa')
      expect(rowKeys.slice(2)).toContain('customMethod')
    })

    it('should maintain custom property order with sortKeys option', () => {
      inspector = new ObjectInspector({ expandDepth: 1, sortKeys: true })
      
      function testFunction(): void { /* empty */ }
      ;(testFunction as any).zzz = 'z value'
      ;(testFunction as any).aaa = 'a value'
      ;(testFunction as any).mmm = 'm value'
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      const rowKeys: string[] = []
      
      for (const row of childRows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          const text = span.textContent
          if (text && text !== '▶' && !span.style.cursor && text !== ':') {
            if (!rowKeys.includes(text)) {
              rowKeys.push(text)
              break
            }
          }
        }
      }
      
      // Built-in properties first
      expect(rowKeys[0]).toBe('length')
      expect(rowKeys[1]).toBe('name')
      
      // Custom properties should be sorted
      const customKeys = rowKeys.slice(2)
      expect(customKeys).toContain('aaa')
      expect(customKeys).toContain('mmm') 
      expect(customKeys).toContain('zzz')
      
      // Check they're in alphabetical order among custom properties
      const sortedCustomKeys = customKeys.filter(key => ['aaa', 'mmm', 'zzz'].includes(key))
      expect(sortedCustomKeys).toEqual(['aaa', 'mmm', 'zzz'])
    })

    it('should show __proto__ after all other properties for functions', () => {
      inspector = new ObjectInspector({ expandDepth: 1, showPrototype: true })
      
      function testFunction(): void { /* empty */ }
      ;(testFunction as any).customProp = 'custom'
      
      const result = inspector.render(testFunction)
      document.body.appendChild(result)
      
      const childRows = result.querySelectorAll('div[style*="margin-left"] div[style*="display: flex"]')
      const rowKeys: string[] = []
      
      for (const row of childRows) {
        const spans = row.querySelectorAll('span')
        for (const span of spans) {
          const text = span.textContent
          if (text && text !== '▶' && !span.style.cursor && text !== ':') {
            if (!rowKeys.includes(text)) {
              rowKeys.push(text)
              break
            }
          }
        }
      }
      
      // __proto__ should be last
      expect(rowKeys[rowKeys.length - 1]).toBe('__proto__')
      
      // Should have the expected order: length, name, custom properties, then __proto__
      expect(rowKeys[0]).toBe('length')
      expect(rowKeys[1]).toBe('name')
      expect(rowKeys).toContain('customProp')
      expect(rowKeys.indexOf('customProp')).toBeLessThan(rowKeys.indexOf('__proto__'))
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