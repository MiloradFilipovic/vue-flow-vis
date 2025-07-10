import type { ComponentInternalInstance } from 'vue'
import type { ComponentMetadata } from '../types'

export class ComponentIdentifier {
  private static nameCache = new WeakMap<ComponentInternalInstance, string>()
  private static pathCache = new WeakMap<ComponentInternalInstance, string>()
  
  static getComponentName(instance: ComponentInternalInstance | null): string {
    if (!instance) return 'Unknown'
    
    // Check cache first
    const cached = this.nameCache.get(instance)
    if (cached) return cached
    
    const strategies: Array<() => string | undefined> = [
      (): string | undefined => instance.type.name,
      (): string | undefined => instance.type.__name,
      (): string | undefined => (instance.type as { __vccOpts?: { name?: string } }).__vccOpts?.name,
      (): string | undefined => instance.type.__file?.match(/([^/]+)\.vue$/)?.[1],
      (): string | undefined => this.getFileBasedName(instance),
      (): string | undefined => `Component-${instance.uid}`
    ]
    
    let name = 'Anonymous'
    for (const strategy of strategies) {
      try {
        const result = strategy()
        if (result) {
          name = result
          break
        }
      } catch {
        // Continue to next strategy
      }
    }
    
    // Cache the result
    this.nameCache.set(instance, name)
    return name
  }
  
  static getComponentPath(instance: ComponentInternalInstance | null): string {
    if (!instance) return 'Unknown'
    
    // Check cache first
    const cached = this.pathCache.get(instance)
    if (cached) return cached
    
    const path: string[] = []
    let current: ComponentInternalInstance | null = instance
    
    while (current) {
      path.unshift(this.getComponentName(current))
      current = current.parent
    }
    
    const pathString = path.join(' → ')
    // Cache the result
    this.pathCache.set(instance, pathString)
    return pathString
  }
  
  static extractMetadata(instance: ComponentInternalInstance): ComponentMetadata {
    return {
      name: this.getComponentName(instance),
      path: this.getComponentPath(instance),
      uid: instance.uid,
      file: instance.type.__file,
      props: Object.keys(instance.props || {}),
      emits: Array.isArray(instance.type.emits) 
        ? instance.type.emits 
        : Object.keys((instance.type.emits as Record<string, unknown>) || {}),
      isSetup: !!(instance as { setupState?: unknown }).setupState,
      parentName: instance.parent ? this.getComponentName(instance.parent) : undefined
    }
  }
  
  static extractLazyMetadata(instance: ComponentInternalInstance): () => ComponentMetadata {
    return () => this.extractMetadata(instance)
  }
  
  private static getFileBasedName(instance: ComponentInternalInstance): string | undefined {
    const file = instance.type.__file
    if (!file) return undefined
    
    // Extract component name from file path
    const match = file.match(/([A-Z][a-zA-Z0-9]+)\.vue$/)
    return match?.[1]
  }
}