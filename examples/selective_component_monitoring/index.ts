// Only monitor specific components
app.use(FlowVisPlugin, {
  includeComponents: ['UserDashboard', 'DataGrid', 'Chart']
})

// Or exclude noisy components
app.use(FlowVisPlugin, {
  excludeComponents: ['BaseIcon', 'BaseButton', 'RouterView']
})