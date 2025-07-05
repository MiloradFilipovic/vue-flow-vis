import type { ComponentInternalInstance } from 'vue'
import type { ComponentMetadata } from '../types'

export class ComponentIdentifier {
  static getComponentName(instance: ComponentInternalInstance | null): string {
    if (!instance) return 'Unknown'
    
    const strategies: Array<() => string | undefined> = [
      () => instance.type.name,
      () => instance.type.__name,
      () => (instance.type as any).__vccOpts?.name,
      () => instance.type.__file?.match(/([^/]+)\.vue$/)?.[1],
      () => this.getFileBasedName(instance),
      () => `Component-${instance.uid}`
    ]
    
    for (const strategy of strategies) {
      try {
        const name = strategy()
        if (name) return name
      } catch (e) {
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
        : Object.keys(instance.type.emits || {}),
      isSetup: !!(instance as any).setupState,
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