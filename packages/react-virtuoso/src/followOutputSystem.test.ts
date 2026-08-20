import assert from 'node:assert/strict'
import { test } from 'node:test'

import { listSystem } from './listSystem'
import * as u from './urx'

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const setupContentRefresh = (atBottom: boolean) => {
  const system = u.init(listSystem)
  const scrollTargets: unknown[] = []
  u.subscribe(system.scrollToIndex, (target) => scrollTargets.push(target))

  u.publish(system.followOutput, 'auto')
  u.publish(system.propsReady, true)
  u.publish(system.scrolledToInitialItem, true)
  u.publish(system.atBottomThreshold, 64)
  u.publish(system.viewportHeight, 500)
  u.publish(system.scrollContainerState, {
    scrollHeight: 1_000,
    scrollTop: atBottom ? 500 : 300,
    viewportHeight: 500,
  })
  u.publish(system.data, [{ id: 1, text: 'initial' }])
  u.publish(system.sizeRanges, [{ endIndex: 0, size: 100, startIndex: 0 }])

  return { scrollTargets, system }
}

const publishContentRefresh = (
  system: ReturnType<typeof setupContentRefresh>['system'],
  text: string,
) => {
  u.publish(system.data, [{ id: 1, text }])
}

const publishMeasuredGrowth = (
  system: ReturnType<typeof setupContentRefresh>['system'],
  height: number,
) => {
  const scrollTop = u.getValue(system.statefulScrollTop)
  u.publish(system.scrollContainerState, {
    scrollHeight: 900 + height,
    scrollTop,
    viewportHeight: 500,
  })
  u.publish(system.sizeRanges, [{ endIndex: 0, size: height, startIndex: 0 }])
}

test('does not follow a content size increase when the reader is away from the bottom', () => {
  const { scrollTargets, system } = setupContentRefresh(false)

  publishContentRefresh(system, 'content grew')
  publishMeasuredGrowth(system, 120)

  assert.deepEqual(scrollTargets, [])
})

test('follows a content size increase when the reader was at the bottom', () => {
  const { scrollTargets, system } = setupContentRefresh(true)

  publishContentRefresh(system, 'content grew')
  // The 20px growth is smaller than atBottomThreshold. It should still keep
  // an already-following reader aligned with the exact bottom.
  publishMeasuredGrowth(system, 120)

  assert.deepEqual(scrollTargets, [{ align: 'end', behavior: 'auto', index: 'LAST' }])
})

test('coalesces rapid content refreshes into one bottom follow', () => {
  const { scrollTargets, system } = setupContentRefresh(true)

  for (let index = 0; index < 6; index++) {
    publishContentRefresh(system, `content update ${index}`)
  }
  publishMeasuredGrowth(system, 170)

  assert.deepEqual(scrollTargets, [{ align: 'end', behavior: 'auto', index: 'LAST' }])
})

test('waits for a deferred content size refresh', async () => {
  const { scrollTargets, system } = setupContentRefresh(true)

  publishContentRefresh(system, 'deferred content')
  await wait(120)
  publishMeasuredGrowth(system, 120)

  assert.deepEqual(scrollTargets, [{ align: 'end', behavior: 'auto', index: 'LAST' }])
})

test('cancels a pending content follow when the reader scrolls upwards', () => {
  const { scrollTargets, system } = setupContentRefresh(true)

  publishContentRefresh(system, 'content grew')
  u.publish(system.scrollContainerState, {
    scrollHeight: 1_000,
    scrollTop: 480,
    viewportHeight: 500,
  })
  publishMeasuredGrowth(system, 120)

  assert.deepEqual(scrollTargets, [])
})

test('cancels a pending content follow when followOutput is disabled', () => {
  const { scrollTargets, system } = setupContentRefresh(true)

  publishContentRefresh(system, 'content grew')
  u.publish(system.followOutput, false)
  publishMeasuredGrowth(system, 120)

  assert.deepEqual(scrollTargets, [])
})

test('cancels a pending content follow when the viewport height decreases', () => {
  const { scrollTargets, system } = setupContentRefresh(true)
  const logLabels: string[] = []
  u.publish(system.log, (label: string) => logLabels.push(label))

  publishContentRefresh(system, 'content grew')
  u.publish(system.viewportHeight, 300)
  assert.deepEqual(scrollTargets, [{ align: 'end', behavior: 'auto', index: 'LAST' }])
  publishMeasuredGrowth(system, 120)

  // The active scroll-to-index operation retries once after the measurement.
  // The canceled content follow must not start another operation of its own.
  assert.equal(scrollTargets.length, 2)
  assert.equal(logLabels.includes('following output after refreshed item size'), false)
})
