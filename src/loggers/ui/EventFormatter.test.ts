import { describe, it, expect } from 'vitest'
import { EventFormatter } from './EventFormatter'

// TODO: Might delete these since event formatting will be updated frequently
describe('EventFormatter', () => {
  describe('formatKey', () => {
    it('should format symbols correctly', () => {
      const sym = Symbol('test')
      expect(EventFormatter.formatKey(sym)).toBe(sym.toString())
    })

    it('should format strings with quotes', () => {
      expect(EventFormatter.formatKey('testKey')).toBe('"testKey"')
      expect(EventFormatter.formatKey('')).toBe('""')
    })

    it('should format numbers as strings', () => {
      expect(EventFormatter.formatKey(42)).toBe('42')
      expect(EventFormatter.formatKey(0)).toBe('0')
      expect(EventFormatter.formatKey(-1)).toBe('-1')
    })

    it('should format booleans as strings', () => {
      expect(EventFormatter.formatKey(true)).toBe('true')
      expect(EventFormatter.formatKey(false)).toBe('false')
    })

    it('should format null and undefined', () => {
      expect(EventFormatter.formatKey(null)).toBe('null')
      expect(EventFormatter.formatKey(undefined)).toBe('undefined')
    })

    it('should format objects as strings', () => {
      expect(EventFormatter.formatKey({})).toBe('[object Object]')
      expect(EventFormatter.formatKey([])).toBe('')
    })
  })

  describe('formatTarget', () => {
    it('should return "undefined" for falsy values', () => {
      expect(EventFormatter.formatTarget(null)).toBe('undefined')
      expect(EventFormatter.formatTarget(undefined)).toBe('undefined')
      expect(EventFormatter.formatTarget(false)).toBe('undefined')
      expect(EventFormatter.formatTarget(0)).toBe('undefined')
      expect(EventFormatter.formatTarget('')).toBe('undefined')
    })

    it('should return constructor name when available', () => {
      class TestClass {}
      const instance = new TestClass()
      expect(EventFormatter.formatTarget(instance)).toBe('TestClass')
    })

    it('should handle built-in constructors', () => {
      expect(EventFormatter.formatTarget(new Date())).toBe('Date')
      expect(EventFormatter.formatTarget([])).toBe('Array')
      expect(EventFormatter.formatTarget(new RegExp('test'))).toBe('RegExp')
    })

    it('should fall back to Object.prototype.toString for objects without proper constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const obj = Object.create(null)
      expect(EventFormatter.formatTarget(obj)).toBe('Object')
    })

    it('should handle arrays', () => {
      expect(EventFormatter.formatTarget([1, 2, 3])).toBe('Array')
    })

    it('should handle plain objects', () => {
      expect(EventFormatter.formatTarget({ key: 'value' })).toBe('Object')
    })

    it('should handle objects with null constructor', () => {
      const obj = { constructor: null }
      expect(EventFormatter.formatTarget(obj)).toBe('Object')
    })

    it('should handle objects with undefined constructor name', () => {
      const obj = { constructor: { name: undefined } }
      expect(EventFormatter.formatTarget(obj)).toBe('Object')
    })

    it('should handle primitive values', () => {
      expect(EventFormatter.formatTarget(42)).toBe('Number')
      expect(EventFormatter.formatTarget('test')).toBe('String')
      expect(EventFormatter.formatTarget(true)).toBe('Boolean')
    })

    it('should return "Unknown Object" for objects that throw errors', () => {
      const obj = {
        get constructor(): unknown {
          throw new Error('Access denied')
        }
      }
      expect(EventFormatter.formatTarget(obj)).toBe('Unknown Object')
    })
  })

  describe('formatValue', () => {
    it('should format null and undefined', () => {
      expect(EventFormatter.formatValue(null)).toBe('null')
      expect(EventFormatter.formatValue(undefined)).toBe('undefined')
    })

    it('should format strings with quotes', () => {
      expect(EventFormatter.formatValue('hello')).toBe('"hello"')
      expect(EventFormatter.formatValue('')).toBe('""')
      expect(EventFormatter.formatValue('with "quotes"')).toBe('"with "quotes""')
    })

    it('should format numbers', () => {
      expect(EventFormatter.formatValue(42)).toBe('42')
      expect(EventFormatter.formatValue(0)).toBe('0')
      expect(EventFormatter.formatValue(-1)).toBe('-1')
      expect(EventFormatter.formatValue(3.14)).toBe('3.14')
      expect(EventFormatter.formatValue(NaN)).toBe('NaN')
      expect(EventFormatter.formatValue(Infinity)).toBe('Infinity')
    })

    it('should format booleans', () => {
      expect(EventFormatter.formatValue(true)).toBe('true')
      expect(EventFormatter.formatValue(false)).toBe('false')
    })

    it('should format arrays with length indicator', () => {
      expect(EventFormatter.formatValue([])).toBe('Array(0)')
      expect(EventFormatter.formatValue([1, 2, 3])).toBe('Array(3)')
      expect(EventFormatter.formatValue(['a', 'b'])).toBe('Array(2)')
    })

    it('should format objects as JSON', () => {
      const obj = { key: 'value', num: 42 }
      const expected = JSON.stringify(obj, null, 2)
      expect(EventFormatter.formatValue(obj)).toBe(expected)
    })

    it('should handle nested objects', () => {
      const obj = { 
        name: 'test',
        nested: { 
          value: 123,
          array: [1, 2, 3]
        }
      }
      const expected = JSON.stringify(obj, null, 2)
      expect(EventFormatter.formatValue(obj)).toBe(expected)
    })

    it('should format functions', () => {
      const fn = function namedFunction(): void {}
      const arrow = (): void => {}
      const anonymous = function(): void {}

      expect(EventFormatter.formatValue(fn)).toBe('[Function]')
      expect(EventFormatter.formatValue(arrow)).toBe('[Function]')
      expect(EventFormatter.formatValue(anonymous)).toBe('[Function]')
    })

    it('should format symbols', () => {
      const sym = Symbol('test')
      expect(EventFormatter.formatValue(sym)).toBe(sym.toString())
    })

    it('should handle circular references gracefully', () => {
      const obj: { self?: unknown } = {}
      obj.self = obj
      expect(EventFormatter.formatValue(obj)).toBe('[Object]')
    })

    it('should handle objects that throw on JSON.stringify', () => {
      const obj = {
        get problematic(): unknown {
          throw new Error('Cannot access')
        }
      }
      expect(EventFormatter.formatValue(obj)).toBe('[Object]')
    })

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01')
      const expected = JSON.stringify(date, null, 2)
      expect(EventFormatter.formatValue(date)).toBe(expected)
    })

    it('should handle RegExp objects', () => {
      const regex = /test/gi
      const expected = JSON.stringify(regex, null, 2)
      expect(EventFormatter.formatValue(regex)).toBe(expected)
    })

    it('should handle bigint values', () => {
      const bigintValue = BigInt(123)
      expect(EventFormatter.formatValue(bigintValue)).toBe('[Object]')
    })

    it('should handle class instances', () => {
      class TestClass {
        prop = 'value'
      }
      const instance = new TestClass()
      const expected = JSON.stringify(instance, null, 2)
      expect(EventFormatter.formatValue(instance)).toBe(expected)
    })
  })
})