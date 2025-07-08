import type { ComponentInternalInstance } from 'vue'
import type { ComponentMetadata } from '../types'

export class ComponentIdentifier {
  static getComponentName(instance: ComponentInternalInstance | null): string {
    if (!instance) return 'Unknown'
    
    const strategies: Array<() => string | undefined> = [
      (): string | undefined => instance.type.name,
      (): string | undefined => instance.type.__name,
      (): string | undefined => (instance.type as { __vccOpts?: { name?: string } }).__vccOpts?.name,
      (): string | undefined => instance.type.__file?.match(/([^/]+)\.vue$/)?.[1],
      (): string | undefined => this.getFileBasedName(instance),
      (): string | undefined => `Component-${instance.uid}`
    ]
    
    for (const strategy of strategies) {
      try {
        const name = strategy()
        if (name) return name
      } catch {
        // Continue to next strategy
      }
    }
    
    return 'Anonymous'
  }
  
  static getComponentPath(instance: ComponentInternalInstance | null): string {
    const path: string[] = []
    let current = instance
    
    while (current) {
      path.unshift(this.getComponentName(current))
      current = current.parent
    }
    
    return path.join(' → ')
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
  
  private static getFileBasedName(instance: ComponentInternalInstance): string | undefined {
    const file = instance.type.__file
    if (!file) return undefined
    
    // Extract component name from file path
    const match = file.match(/([A-Z][a-zA-Z0-9]+)\.vue$/)
    return match?.[1]
  }
}