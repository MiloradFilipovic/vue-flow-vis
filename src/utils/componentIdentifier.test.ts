import { describe, it, expect, beforeEach } from 'vitest'
import type { ComponentInternalInstance } from 'vue'
import { ComponentIdentifier } from './componentIdentifier'

describe('ComponentIdentifier', () => {
  let mockInstance: Partial<ComponentInternalInstance>
  let mockParentInstance: Partial<ComponentInternalInstance>

  beforeEach(() => {
    // Clear caches before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    ;(ComponentIdentifier as any).nameCache = new WeakMap()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    ;(ComponentIdentifier as any).pathCache = new WeakMap()

    mockParentInstance = {
      uid: 0,
      type: { name: 'ParentComponent' },
      props: {},
      parent: null,
    }

    mockInstance = {
      uid: 1,
      type: { name: 'TestComponent' },
      props: { testProp: 'value' },
      parent: mockParentInstance as ComponentInternalInstance,
    }
  })

  describe('getComponentName', () => {
    it('should return "Unknown" for null instance', () => {
      const name = ComponentIdentifier.getComponentName(null)
      expect(name).toBe('Unknown')
    })

    it('should use type.name strategy first', () => {
      const instance = {
        uid: 1,
        type: { name: 'ComponentFromName' },
      }

      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('ComponentFromName')
    })

    it('should fall back to type.__name when type.name is not available', () => {
      const instance = {
        uid: 1,
        type: { __name: 'ComponentFromDunderName' },
      }

      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('ComponentFromDunderName')
    })

    it('should fall back to __vccOpts.name when previous strategies fail', () => {
      const instance = {
        uid: 1,
        type: { 
          __vccOpts: { name: 'ComponentFromVccOpts' }
        },
      }

      const name = ComponentIdentifier.getComponentName(instance as unknown as ComponentInternalInstance)
      expect(name).toBe('ComponentFromVccOpts')
    })

    it('should extract name from __file when other strategies fail', () => {
      const instance = {
        uid: 1,
        type: { 
          __file: '/src/components/ComponentFromFile.vue'
        },
      }

      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('ComponentFromFile')
    })

    it('should use file-based name strategy as fallback', () => {
      const instance = {
        uid: 1,
        type: { 
          __file: '/src/components/FileBasedComponent.vue'
        },
      }

      // Mock the private getFileBasedName method by using the __file pattern
      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('FileBasedComponent')
    })

    it('should fall back to uid-based name when all strategies fail', () => {
      const instance = {
        uid: 42,
        type: {},
      }

      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('Component-42')
    })

    it('should cache the resolved name', () => {
      const instance = {
        uid: 1,
        type: { name: 'CachedComponent' },
      }

      const name1 = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      const name2 = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)

      expect(name1).toBe('CachedComponent')
      expect(name2).toBe('CachedComponent')
      expect(name1).toBe(name2)
    })

    it('should handle errors in strategies gracefully', () => {
      const instance = {
        uid: 1,
        type: {
          get name(): string {
            throw new Error('Strategy error')
          },
          __name: 'FallbackName'
        },
      }

      const name = ComponentIdentifier.getComponentName(instance as ComponentInternalInstance)
      expect(name).toBe('FallbackName')
    })

    it('should prioritize strategies in correct order', () => {
      const instance = {
        uid: 1,
        type: { 
          name: 'FirstStrategy',
          __name: 'SecondStrategy',
          __vccOpts: { name: 'ThirdStrategy' },
          __file: '/src/FourthStrategy.vue'
        },
      }

      const name = ComponentIdentifier.getComponentName(instance as unknown as ComponentInternalInstance)
      expect(name).toBe('FirstStrategy')
    })
  })

  describe('getComponentPath', () => {
    it('should return "Unknown" for null instance', () => {
      const path = ComponentIdentifier.getComponentPath(null)
      expect(path).toBe('Unknown')
    })

    it('should return single component name for instance without parent', () => {
      const instance = {
        uid: 1,
        type: { name: 'RootComponent' },
        parent: null,
      }

      const path = ComponentIdentifier.getComponentPath(instance as ComponentInternalInstance)
      expect(path).toBe('RootComponent')
    })

    it('should build hierarchical path with parent components', () => {
      const grandParent = {
        uid: 0,
        type: { name: 'GrandParentComponent' },
        parent: null,
      }

      const parent = {
        uid: 1,
        type: { name: 'ParentComponent' },
        parent: grandParent,
      }

      const child = {
        uid: 2,
        type: { name: 'ChildComponent' },
        parent: parent,
      }

      const path = ComponentIdentifier.getComponentPath(child as ComponentInternalInstance)
      expect(path).toBe('GrandParentComponent → ParentComponent → ChildComponent')
    })

    it('should cache the resolved path', () => {
      const path1 = ComponentIdentifier.getComponentPath(mockInstance as ComponentInternalInstance)
      const path2 = ComponentIdentifier.getComponentPath(mockInstance as ComponentInternalInstance)

      expect(path1).toBe(path2)
      expect(path1).toBe('ParentComponent → TestComponent')
    })

    it('should handle complex component hierarchies', () => {
      const root = { uid: 0, type: { name: 'App' }, parent: null }
      const layout = { uid: 1, type: { name: 'Layout' }, parent: root }
      const page = { uid: 2, type: { name: 'Page' }, parent: layout }
      const widget = { uid: 3, type: { name: 'Widget' }, parent: page }

      const path = ComponentIdentifier.getComponentPath(widget as ComponentInternalInstance)
      expect(path).toBe('App → Layout → Page → Widget')
    })
  })

  describe('extractMetadata', () => {
    it('should extract complete metadata for component instance', () => {
      const instance = {
        uid: 42,
        type: { 
          name: 'TestComponent',
          __file: '/src/components/TestComponent.vue',
          emits: ['click', 'change']
        },
        props: { prop1: 'value1', prop2: 'value2' },
        setupState: { data: 'setup' },
        parent: mockParentInstance,
      }

      const metadata = ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)

      expect(metadata).toEqual({
        name: 'TestComponent',
        path: 'ParentComponent → TestComponent',
        uid: 42,
        file: '/src/components/TestComponent.vue',
        props: ['prop1', 'prop2'],
        emits: ['click', 'change'],
        isSetup: true,
        parentName: 'ParentComponent',
      })
    })

    it('should handle instance without parent', () => {
      const instance = {
        uid: 1,
        type: { name: 'RootComponent' },
        props: {},
        parent: null,
      }

      const metadata = ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)

      expect(metadata.parentName).toBeUndefined()
      expect(metadata.path).toBe('RootComponent')
    })

    it('should handle instance without props', () => {
      const instance = {
        uid: 1,
        type: { name: 'TestComponent' },
        props: null,
        parent: null,
      }

      const metadata = ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)

      expect(metadata.props).toEqual([])
    })

    it('should handle emits as object', () => {
      const instance = {
        uid: 1,
        type: { 
          name: 'TestComponent',
          emits: { click: null, change: (_value: string): boolean => true }
        },
        props: {},
        parent: null,
      }

      const metadata = ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)

      expect(metadata.emits).toEqual(['click', 'change'])
    })

    it('should handle missing emits', () => {
      const instance = {
        uid: 1,
        type: { name: 'TestComponent' },
        props: {},
        parent: null,
      }

      const metadata = ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)

      expect(metadata.emits).toEqual([])
    })

    it('should detect setup composition api usage', () => {
      const instanceWithSetup = {
        uid: 1,
        type: { name: 'TestComponent' },
        props: {},
        setupState: { data: 'value' },
        parent: null,
      }

      const instanceWithoutSetup = {
        uid: 2,
        type: { name: 'TestComponent' },
        props: {},
        parent: null,
      }

      const metadataWithSetup = ComponentIdentifier.extractMetadata(instanceWithSetup as unknown as ComponentInternalInstance)
      const metadataWithoutSetup = ComponentIdentifier.extractMetadata(instanceWithoutSetup as unknown as ComponentInternalInstance)

      expect(metadataWithSetup.isSetup).toBe(true)
      expect(metadataWithoutSetup.isSetup).toBe(false)
    })
  })

  describe('extractLazyMetadata', () => {
    it('should return a function that extracts metadata when called', () => {
      const lazyExtractor = ComponentIdentifier.extractLazyMetadata(mockInstance as ComponentInternalInstance)

      expect(typeof lazyExtractor).toBe('function')

      const metadata = lazyExtractor()
      expect(metadata).toEqual({
        name: 'TestComponent',
        path: 'ParentComponent → TestComponent',
        uid: 1,
        file: undefined,
        props: ['testProp'],
        emits: [],
        isSetup: false,
        parentName: 'ParentComponent',
      })
    })

    it('should create fresh metadata each time the function is called', () => {
      const lazyExtractor = ComponentIdentifier.extractLazyMetadata(mockInstance as ComponentInternalInstance)

      const metadata1 = lazyExtractor()
      const metadata2 = lazyExtractor()

      expect(metadata1).toEqual(metadata2)
      expect(metadata1).not.toBe(metadata2) // Different object instances
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle instances with circular parent references', () => {
      const parentInstance: Partial<ComponentInternalInstance> = {
        uid: 1,
        type: { name: 'Parent' },
        parent: null,
      }

      const childInstance: Partial<ComponentInternalInstance> = {
        uid: 2,
        type: { name: 'Child' },
        parent: parentInstance as ComponentInternalInstance,
      }

      // Create circular reference (shouldn't happen in real Vue, but let's be safe)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      ;(parentInstance as any).parent = childInstance

      // This test verifies that the algorithm doesn't get stuck in infinite loops
      // The actual behavior should detect and handle circular references
      const path = ComponentIdentifier.getComponentPath(childInstance as ComponentInternalInstance)
      expect(path).toContain('[CIRCULAR]')
    })

    it('should handle instances with undefined type properties', () => {
      const instance = {
        uid: 1,
        type: undefined,
        props: undefined,
        parent: null,
      }

      expect(() => {
        ComponentIdentifier.getComponentName(instance as unknown as ComponentInternalInstance)
      }).not.toThrow()

      expect(() => {
        ComponentIdentifier.extractMetadata(instance as unknown as ComponentInternalInstance)
      }).not.toThrow()
    })
  })
})