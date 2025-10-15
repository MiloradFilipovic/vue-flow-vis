import { describe, expect, it } from 'vitest'
import { type DebuggerEvent, reactive, ref, toRef, watch } from 'vue'
import { debugEventValue } from './debugEventValue'

describe('debugEventValue (mocked/manual cases)', () => {
  it('extracts from plain object with matching key', () => {
    const target = { foo: 'bar' }
    const event = { target, key: 'foo' } as DebuggerEvent

    const result = debugEventValue(event)
    expect(result).toBe('bar')
  })

  it('returns undefined for unknown constructor type', () => {
    class SomethingElse {
    }

    const event = { target: new SomethingElse() } as DebuggerEvent
    const result = debugEventValue(event)
    expect(result).toBeUndefined()
  })

  it('returns undefined if target is missing', () => {
    const event = {} as DebuggerEvent
    const result = debugEventValue(event)
    expect(result).toBeUndefined()
  })
})

describe('debugEventValue (with real Vue DebuggerEvents)', () => {
  it('returns updated value onTrigger when ref changes', () => {
    const r = ref(1)
    let captured: unknown

    watch(
      r,
      () => {},
      {
        onTrigger(e) {
          captured = debugEventValue(e)
        },
      },
    )

    r.value = 99
    expect(captured).toBe(99)
  })

  it('handles ObjectRefImpl target from onTrigger', () => {
    const state = reactive({ count: 7 })
    const prop = toRef(state, 'count')
    let captured: unknown

    watch(
      prop,
      () => {},
      {
        onTrigger(e) {
          captured = debugEventValue(e)
        },
      },
    )
    state.count = 99

    expect(captured).toBe(99)
  })

  it('handles GetterRefImpl target from onTrigger', () => {
    const base = ref(10)
    const getter = toRef(() => base.value + 5)
    let captured: unknown

    watch(
      getter,
      () => {},
      {
        onTrigger(e) {
          captured = debugEventValue(e)
        },
      },
    )
    base.value = 20

    expect(captured).toBe(20)
  })
})
