app.use(FlowVisPlugin, {
  enabled: process.env.NODE_ENV === 'development',
  logToTable: true,
  groupByComponent: true,
  excludeComponents: ['Transition', 'KeepAlive'],
  performanceThreshold: 16,
  onRenderTriggered: (data) => {
    // Breakpoint for specific component debugging
    if (data.componentName === 'ProblematicComponent') {
      debugger
    }
  }
})