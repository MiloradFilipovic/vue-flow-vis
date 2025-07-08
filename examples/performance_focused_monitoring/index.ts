app.use(FlowVisPlugin, {
  performanceThreshold: 8, // Strict 120fps target
  groupByComponent: true,
  onRenderTriggered: (data) => {
    // Track components that re-render frequently
    performanceTracker.record(data.componentName, data.timestamp)
  }
})