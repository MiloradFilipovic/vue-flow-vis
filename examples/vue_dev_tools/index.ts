class DevToolsLogger implements Logger {
  tracked(data: RenderEventData): void {
    // Send to Vue DevTools
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('component-render-tracked', data)
    }
  }
  
  // ... other methods
}