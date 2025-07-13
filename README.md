# `vue-flow-vis`

A Vue 3 development plugin that provides real-time insights into component rendering behavior. Monitor which components re-render, what triggers the updates, and track reactive dependencies using Vue's built-in debugging hooks ([`onRenderTriggered`](https://vuejs.org/api/composition-api-lifecycle.html#onrendertriggered) and [`onRenderTracked`](https://vuejs.org/api/composition-api-lifecycle.html#onrendertracked)).

![NPM Version](https://img.shields.io/npm/v/vue-flow-vis?style=for-the-badge&color=red)
![NPM Downloads](https://img.shields.io/npm/dw/vue-flow-vis?style=for-the-badge&color=red)
![Codecov (with branch)](https://img.shields.io/codecov/c/github/MiloradFilipovic/vue-flow-vis/main?style=for-the-badge&color=purple)
![Static Badge](https://img.shields.io/badge/Dependencies-0-pink?style=for-the-badge)


![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen.svg?style=for-the-badge&color=41B883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=for-the-badge)
![Development](https://img.shields.io/badge/Environment-Development_Only-red.svg?style=for-the-badge&color=yellow&label=ENV)



## Log Example

![image info](./static/README_screen.png)

In this example, a user interaction triggered the `Logo` component to re-render due to a change in the `size` reactive property.

Additionally, 30 render events from `Background` components were logged.

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
import { FlowVisPlugin } from 'vue-flow-vis'

const app = createApp(App)

// Basic usage with default settings
app.use(FlowVisPlugin)

app.mount('#app')
```

That's it! The plugin will automatically start monitoring all your components.

More examples can be found in [examples](./examples) directory.

## Configuration Options

The plugin accepts a configuration object with the following options:

```typescript
type FlowVisOptions = {
  enabled?: boolean             // Enable/disable monitoring (default: true)
  logToTable?: boolean          // Use console.table for output (default: false)
  excludeComponents?: string[]  // Components to exclude from monitoring
  includeComponents?: string[]  // Only monitor these components (overrides exclude)
  batchLogs?: boolean           // Group console logs by component (default: true)
  batchWindow?: number          // Delay in ms before flushing batched logs (default: 500)
  onRenderTracked?: (data: RenderEventData) => void   // Custom callback for tracked events
  onRenderTriggered?: (data: RenderEventData) => void // Custom callback for triggered events
  customLogger?: Logger         // Custom logger implementation
}
```

## Development setup
```bash
# Initialize husky hooks and install dependencies
npm run init
# Start watch mode
npm run dev
```

## Bug reports & feature requests
Feel free to submit github issue here and use appropriate labels (`bug-report`/`feature-request`).

Check if a similar issue already exists before submitting.

## License

MIT License - see [LICENSE](./LICENSE) file for details