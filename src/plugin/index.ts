import { getCurrentInstance, onRenderTracked, onRenderTriggered } from 'vue'
import type { App, Plugin, DebuggerEvent } from 'vue'
import type { FlowVisOptions } from '../types'
import { ComponentMonitor } from '../core/ComponentMonitor'
import { ComponentIdentifier } from '../utils/componentIdentifier'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $componentMonitor: ComponentMonitor
  }
}

export const FlowVisPlugin: Plugin<FlowVisOptions> = {
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
        if (!monitor.options.enabled || !monitor.options.trackRenderCycles) return
        
        const instance = getCurrentInstance()
        if (!instance) return
        
        const componentName = ComponentIdentifier.getComponentName(instance)
        
        if (!monitor.shouldMonitorComponent(componentName)) return
        
        const componentPath = ComponentIdentifier.getComponentPath(instance)
        const metadata = ComponentIdentifier.extractMetadata(instance)
        
        onRenderTracked((event: DebuggerEvent) => {
          monitor.logRenderEvent('tracked', {
            componentName,
            componentPath,
            event,
            timestamp: Date.now(),
            instanceId: instance.uid,
            metadata
          })
        })
        
        onRenderTriggered((event: DebuggerEvent) => {
          monitor.logRenderEvent('triggered', {
            componentName,
            componentPath,
            event,
            timestamp: Date.now(),
            instanceId: instance.uid,
            metadata
          })
        })
      },
      
      mounted() {
        const instance = getCurrentInstance()
        if (!instance) return
        
        const metadata = ComponentIdentifier.extractMetadata(instance)
        monitor.logMount(metadata)
      }
    })
    
    // Make available globally
    app.config.globalProperties.$componentMonitor = monitor
    app.provide('componentMonitor', monitor)
  }
}