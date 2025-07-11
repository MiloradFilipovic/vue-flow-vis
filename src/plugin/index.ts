import { getCurrentInstance, onRenderTracked, onRenderTriggered } from 'vue'
import type { App, DebuggerEvent } from 'vue'
import type { FlowVisOptions, FlowVisPluginType } from '../types'
import { ComponentMonitor } from '../core/ComponentMonitor'
import { ComponentIdentifier } from '../utils/componentIdentifier'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $componentMonitor: ComponentMonitor
  }
}

export const FlowVisPlugin: FlowVisPluginType = {
  install(app: App, options?: FlowVisOptions) {
    // Only enable in development
    if (!__DEV__) {
      console.warn('FlowVisPlugin is disabled in production')
      return
    }
    
    const monitor = new ComponentMonitor(options)
    
    // Global mixin
    app.mixin({
      created() {
        if (!monitor.options.enabled) return
        
        const instance = getCurrentInstance()
        if (!instance) return
        
        const componentName = ComponentIdentifier.getComponentName(instance)
        
        if (!monitor.shouldMonitorComponent(componentName)) return
        
        // Lazy path computation - only compute when first render event occurs
        let componentPath: string | undefined
        
        onRenderTracked((event: DebuggerEvent) => {
          if (!componentPath) {
            componentPath = ComponentIdentifier.getComponentPath(instance)
          }
          monitor.logRenderEvent('tracked', {
            componentName,
            componentPath,
            event,
            timestamp: Date.now(),
            instanceId: instance.uid,
            instance
          })
        })
        
        onRenderTriggered((event: DebuggerEvent) => {
          if (!componentPath) {
            componentPath = ComponentIdentifier.getComponentPath(instance)
          }
          monitor.logRenderEvent('triggered', {
            componentName,
            componentPath,
            event,
            timestamp: Date.now(),
            instanceId: instance.uid,
            instance
          })
        })
      },
    })
    
    // Make available globally
    app.config.globalProperties.$componentMonitor = monitor
    app.provide('componentMonitor', monitor)
  }
}