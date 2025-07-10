app.use(FlowVisPlugin, {
  groupByComponent: true,
  onRenderTriggered: (data) => {
    // Track components that re-render frequently
    performanceTracker.record(data.componentName, data.timestamp)
  }
})