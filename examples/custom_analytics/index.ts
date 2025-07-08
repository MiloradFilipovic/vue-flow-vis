app.use(FlowVisPlugin, {
  logToConsole: false, // Disable console logging
  onRenderTracked: (data) => {
    // Send to analytics
    analytics.track('component.dependency.tracked', {
      component: data.componentName,
      dependency: `${data.event.target.constructor.name}.${data.event.key}`,
      operation: data.event.type
    })
  },
  onRenderTriggered: (data) => {
    // Track state changes
    analytics.track('component.state.changed', {
      component: data.componentName,
      property: data.event.key,
      operation: data.event.type,
      hasOldValue: 'oldValue' in data.event,
      hasNewValue: 'newValue' in data.event
    })
  }
})