# `vue-flow-vis`

Vue 3 plugin that provides real-time monitoring of component renders, reactive dependency tracking, and performance insights using Vue's built-in debugging hooks.

![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Development](https://img.shields.io/badge/Environment-Development_Only-orange.svg)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Understanding the Output](#understanding-the-output)
- [Advanced Usage](#advanced-usage)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🔍 **Automatic Component Tracking**: Monitor all components or specific ones with zero configuration
- 📊 **Reactive Dependency Tracking**: See exactly which reactive dependencies trigger renders
- ⚡ **Performance Monitoring**: Detect rapid re-renders and performance bottlenecks
- 🎯 **Granular Control**: Include/exclude specific components from monitoring
- 📝 **Flexible Logging**: Console tables, grouped logs, or custom loggers
- 🛠️ **TypeScript Support**: Fully typed for excellent IDE support
- 🚫 **Production Safe**: Automatically disabled in production builds
- 🎨 **Colored Console Output**: Easy-to-read, color-coded logging

## Installation

```bash
npm install vue-flow-vis --save-dev
# or
yarn add vue-flow-vis --dev
# or
pnpm add vue-flow-vis --dev
```

## Quick Start

```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { FlowVisPlugin } from 'vue-component-monitor'

const app = createApp(App)

// Basic usage with default settings
app.use(FlowVisPlugin)

app.mount('#app')
```

That's it! The plugin will automatically start monitoring all your components.

## Configuration Options

The plugin accepts a configuration object with the following options:

```typescript
type FlowVisOptions = {
  enabled?: boolean              // Enable/disable monitoring (default: true)
  logToConsole?: boolean        // Log events to console (default: true)
  logToTable?: boolean          // Use console.table for output (default: true)
  excludeComponents?: string[]  // Components to exclude from monitoring
  includeComponents?: string[]  // Only monitor these components (overrides exclude)
  trackRenderCycles?: boolean   // Track render events (default: true)
  trackMounts?: boolean         // Track component mounts (default: true)
  groupByComponent?: boolean    // Group console logs by component (default: false)
  performanceThreshold?: number // Time threshold in ms for performance warnings (default: 16)
  onRenderTracked?: (data: RenderEventData) => void   // Custom callback for tracked events
  onRenderTriggered?: (data: RenderEventData) => void // Custom callback for triggered events
  customLogger?: Logger         // Custom logger implementation
}
```

## Usage Examples

### Basic Monitoring

```typescript
// Monitor all components with default settings
app.use(FlowVisPlugin)
```

### Selective Component Monitoring

```typescript
// Only monitor specific components
app.use(FlowVisPlugin, {
  includeComponents: ['UserDashboard', 'DataGrid', 'Chart']
})

// Or exclude noisy components
app.use(FlowVisPlugin, {
  excludeComponents: ['BaseIcon', 'BaseButton', 'RouterView']
})
```

### Performance-Focused Configuration

```typescript
app.use(FlowVisPlugin, {
  performanceThreshold: 8, // Strict 120fps target
  groupByComponent: true,
  onRenderTriggered: (data) => {
    // Track components that re-render frequently
    performanceTracker.record(data.componentName, data.timestamp)
  }
})
```

### Development Debugging Setup

```typescript
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
```

### Custom Analytics Integration

```typescript
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
```

## Understanding the Output

### Console Output Examples

#### Render Tracked (Dependency Access)
```
[TRACKED] UserProfile
┌─────────────────┬────────────────────────────┐
│ Component Path  │ App → Layout → UserProfile │
│ Property        │ name                       │
│ Operation       │ get                        │
│ Target Type     │ Object                     │
└─────────────────┴────────────────────────────┘
```

This shows that the `UserProfile` component accessed the `name` property during render.

#### Render Triggered (State Change)
```
[TRIGGERED] UserProfile
┌─────────────────┬────────────────────────────┐
│ Component Path  │ App → Layout → UserProfile │
│ Property        │ name                       │
│ Operation       │ set                        │
│ Target Type     │ Object                     │
│ Old Value       │ John Doe                   │
│ New Value       │ Jane Doe                   │
└─────────────────┴────────────────────────────┘
```

This indicates that changing the `name` property triggered a re-render of `UserProfile`.

#### Performance Warning
```
⚠️ Component "DataTable" is re-rendering rapidly (50 times in 12ms)
```

## Advanced Usage

### Creating Custom Monitoring Boundaries

```vue
<!-- MonitoringBoundary.vue -->
<template>
  <div class="monitoring-boundary">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance, provide } from 'vue'

const props = defineProps<{
  name: string
  threshold?: number
}>()

const instance = getCurrentInstance()
const monitor = instance?.appContext.config.globalProperties.$componentMonitor

if (monitor) {
  // Create custom monitoring context
  provide('boundaryMonitor', {
    name: props.name,
    threshold: props.threshold ?? 16
  })
}
</script>
```

### Integration with Vue DevTools

```typescript
class DevToolsLogger implements Logger {
  tracked(data: RenderEventData): void {
    // Send to Vue DevTools
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('component-render-tracked', data)
    }
  }
  
  // ... other methods
}
```

### Testing with Component Monitor

```typescript
import { mount } from '@vue/test-utils'
import { FlowVisPlugin } from 'vue-component-monitor'

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
```

## License

MIT License - see LICENSE file for details