app.use(FlowVisPlugin, {
  enabled: process.env.NODE_ENV === 'development',
  logToTable: true,
  groupByComponent: true,
  excludeComponents: ['Transition', 'KeepAlive'],
  onRenderTriggered: (data) => {
    // Breakpoint for specific component debugging
    if (data.componentName === 'ProblematicComponent') {
      debugger
    }
  }
})