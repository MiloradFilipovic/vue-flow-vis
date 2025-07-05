# `vue-flow-vis`

Vue 3 plugin that provides real-time monitoring of component renders using Vue's built-in debugging hooks.

![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Development](https://img.shields.io/badge/Environment-Development_Only-orange.svg)

## Features

- 🔍 **Automatic Component Tracking**: Monitor all components or specific ones with zero configuration
- 📊 **Reactive Dependency Tracking**: See exactly which reactive dependencies trigger renders
- ⚡ **Performance Monitoring**: Detect rapid re-renders
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
  logToTable?: boolean          // Use console.table for output (default: false)
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

### Development Debugging Setup (custom callback)

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

## License

MIT License - see LICENSE file for details