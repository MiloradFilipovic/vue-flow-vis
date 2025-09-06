import { type DebuggerEvent, isRef, toValue } from 'vue'

export function debugEventValue(event: DebuggerEvent): unknown {
  const type = event.target?.constructor?.name

  if (isRef(event.target as unknown)) {
    const target = event.target as { value: unknown }
    return target.value
  }

  if (type === 'Object') {
    const target = event.target as Record<string, unknown>
    return toValue(target[event.key as string])
  }
}