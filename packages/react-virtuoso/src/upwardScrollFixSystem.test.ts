import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { listSystem } from './listSystem'
import { UP } from './stateFlagsSystem'
import * as u from './urx'

import type { ListState } from './listStateSystem'

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalRequestAnimationFrame = globalThis.requestAnimationFrame

afterEach(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator)
  } else {
    Reflect.deleteProperty(globalThis, 'navigator')
  }
  globalThis.requestAnimationFrame = originalRequestAnimationFrame
})

function listState(totalHeight: number): ListState {
  return {
    bottom: totalHeight,
    firstItemIndex: 0,
    items: [{ index: 5, offset: totalHeight - 50, originalIndex: 5, size: 50 }],
    offsetBottom: 0,
    offsetTop: totalHeight - 50,
    top: totalHeight - 50,
    topItems: [],
    topListHeight: 0,
    totalCount: 10,
  }
}

function useIPadOSNavigator() {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      maxTouchPoints: 5,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
  })
}

function useAnimationFrameQueue() {
  const callbacks: FrameRequestCallback[] = []
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callbacks.push(callback)
    return callbacks.length
  }
  return {
    flush() {
      const callback = callbacks.shift()
      assert.ok(callback, 'expected a queued animation frame')
      callback!(performance.now())
    },
  }
}

function startUpwardMeasurementChange() {
  const system = u.init(listSystem)
  u.publish(system.scrollTop, 50)
  u.publish(system.scrollDirection, UP)
  u.publish(system.isScrolling, true)
  u.publish(system.listState, listState(1_000))
  u.publish(system.listState, listState(1_100))
  return system
}

test('keeps immediate upward correction outside iOS', () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      maxTouchPoints: 0,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
    },
  })
  const system = u.init(listSystem)
  const scrollByOffsets: number[] = []
  u.subscribe(system.scrollBy, ({ top }) => {
    if (top !== undefined) {
      scrollByOffsets.push(top)
    }
  })

  u.publish(system.scrollTop, 50)
  u.publish(system.scrollDirection, UP)
  u.publish(system.isScrolling, true)
  u.publish(system.listState, listState(1_000))
  u.publish(system.listState, listState(1_100))

  assert.deepEqual(scrollByOffsets, [100])
  assert.equal(u.getValue(system.deviation), 0)
  assert.equal(u.getValue(system.iosScrollFixInProgress), false)
})

test('defers iPadOS upward correction until scrolling stops', async () => {
  useIPadOSNavigator()
  const animationFrames = useAnimationFrameQueue()
  const system = startUpwardMeasurementChange()
  const events: string[] = []

  u.subscribe(system.deviation, (value) => {
    events.push(`deviation:${value}`)
  })
  u.subscribe(system.scrollBy, ({ top }) => {
    events.push(`scrollBy:${top}`)
  })

  assert.equal(u.getValue(system.deviation), -100)
  assert.deepEqual(events, ['deviation:-100'])

  u.publish(system.isScrolling, false)
  await new Promise((resolve) => setTimeout(resolve, 5))

  assert.deepEqual(events, ['deviation:-100'])
  assert.equal(u.getValue(system.iosScrollFixInProgress), true)

  animationFrames.flush()
  assert.deepEqual(events, ['deviation:-100', 'scrollBy:100', 'deviation:0'])

  animationFrames.flush()
  assert.equal(u.getValue(system.iosScrollFixInProgress), false)
})

test('normalizes a deferred correction that reaches the top edge', async () => {
  useIPadOSNavigator()
  useAnimationFrameQueue()
  const system = startUpwardMeasurementChange()
  const scrollTargets: number[] = []

  u.subscribe(system.scrollTo, ({ top }) => {
    if (top !== undefined) {
      scrollTargets.push(top)
    }
  })

  u.publish(system.scrollTop, 0)

  assert.equal(u.getValue(system.deviation), 0)
  assert.equal(u.getValue(system.iosScrollFixInProgress), true)

  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.deepEqual(scrollTargets, [0])
  assert.equal(u.getValue(system.iosScrollFixInProgress), false)
})
