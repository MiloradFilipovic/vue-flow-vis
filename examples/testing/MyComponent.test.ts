import { mount } from '@vue/test-utils'
import { FlowVisPlugin } from 'vue-flow-vis'

describe('Component Performance', () => {
  it('should not re-render excessively', async () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [[FlowVisPlugin, { 
          performanceThreshold: 16 
        }]]
      }
    })
    
    const monitor = wrapper.vm.$componentMonitor
    
    // Trigger some actions
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    
    const stats = monitor.getRenderStats()
    const renderCount = stats.get('MyComponent') || 0
    
    expect(renderCount).toBeLessThan(5)
  })
})