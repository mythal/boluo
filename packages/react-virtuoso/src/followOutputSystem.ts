import { contextSystem } from './contextSystem'
import { domIOSystem } from './domIOSystem'
import { initialTopMostItemIndexSystem } from './initialTopMostItemIndexSystem'
import { loggerSystem, LogLevel } from './loggerSystem'
import { propsReadySystem } from './propsReadySystem'
import { scrollIntoViewSystem } from './scrollIntoViewSystem'
import { scrollToIndexSystem } from './scrollToIndexSystem'
import { sizeSystem } from './sizeSystem'
import { stateFlagsSystem } from './stateFlagsSystem'
import * as u from './urx'

import type { FollowOutput, FollowOutputScalarType, ScrollIntoViewLocation } from './interfaces'

function normalizeFollowOutput(follow: FollowOutputScalarType): FollowOutputScalarType {
  if (follow === false) {
    return false
  }
  return follow === 'smooth' ? 'smooth' : 'auto'
}

const behaviorFromFollowOutput = (follow: FollowOutput, isAtBottom: boolean) => {
  if (typeof follow === 'function') {
    return normalizeFollowOutput(follow(isAtBottom))
  }
  return isAtBottom && normalizeFollowOutput(follow)
}

export const followOutputSystem = u.system(
  ([
    { listRefresh, totalCount, fixedItemSize, data },
    { atBottomState, isAtBottom },
    { scrollToIndex },
    { scrolledToInitialItem },
    { didMount, propsReady },
    { log },
    { scrollingInProgress, scrollTop, statefulScrollTop },
    { context },
    { scrollIntoView },
  ]) => {
    const followOutput = u.statefulStream<FollowOutput>(false)
    const autoscrollToBottom = u.stream<true>()
    let pendingScrollHandle: any = null
    let cancelPendingScrollOnUp: null | (() => void) = null
    let cancelSizeIncreaseTrap: null | (() => void) = null
    let sizeIncreaseTrapTimeout: null | ReturnType<typeof setTimeout> = null

    function scrollToBottom(followOutputBehavior: FollowOutputScalarType) {
      u.publish(scrollToIndex, {
        align: 'end',
        behavior: followOutputBehavior,
        index: 'LAST',
      })
    }

    function cancelPendingScroll() {
      if (pendingScrollHandle !== null) {
        pendingScrollHandle()
        pendingScrollHandle = null
      }
      if (cancelPendingScrollOnUp !== null) {
        cancelPendingScrollOnUp()
        cancelPendingScrollOnUp = null
      }
    }

    function cancelPendingSizeIncreaseTrap() {
      if (cancelSizeIncreaseTrap !== null) {
        cancelSizeIncreaseTrap()
        cancelSizeIncreaseTrap = null
      }
      if (sizeIncreaseTrapTimeout !== null) {
        clearTimeout(sizeIncreaseTrapTimeout)
        sizeIncreaseTrapTimeout = null
      }
    }

    function followAfterNextSizeRefresh() {
      cancelPendingScroll()
      const scrollTopAtRefresh = u.getValue(statefulScrollTop)

      pendingScrollHandle = u.handleNext(
        u.pipe(
          listRefresh,
          u.filter((changed) => changed)
        ),
        () => {
          pendingScrollHandle = null
          cancelPendingScrollOnUp?.()
          cancelPendingScrollOnUp = null
          u.getValue(log)('following output after refreshed item size', {}, LogLevel.DEBUG)
          scrollToBottom('auto')
        }
      )
      cancelPendingScrollOnUp = u.subscribe(scrollTop, (nextScrollTop) => {
        if (nextScrollTop < scrollTopAtRefresh) {
          cancelPendingScroll()
        }
      })
    }

    u.subscribe(
      u.pipe(
        u.duc(followOutput),
        u.filter((follow) => follow === false)
      ),
      () => {
        // cancelPendingScrollOnUp is only set for a deferred content follow.
        // Other pending operations, such as scrollIntoViewOnChange, are independent.
        if (cancelPendingScrollOnUp !== null) {
          cancelPendingScroll()
        }
        cancelPendingSizeIncreaseTrap()
      }
    )

    u.subscribe(
      u.pipe(
        u.combineLatest(u.pipe(u.duc(totalCount), u.skip(1)), didMount),
        u.withLatestFrom(u.duc(followOutput), isAtBottom, scrolledToInitialItem, scrollingInProgress),
        u.map(([[totalCount, didMount], followOutput, isAtBottom, scrolledToInitialItem, scrollingInProgress]) => {
          let shouldFollow = didMount && scrolledToInitialItem
          let followOutputBehavior: FollowOutputScalarType = 'auto'

          if (shouldFollow) {
            // if scrolling to index is in progress,
            // assume that a previous followOutput response is going
            followOutputBehavior = behaviorFromFollowOutput(followOutput, isAtBottom || scrollingInProgress)
            shouldFollow = shouldFollow && followOutputBehavior !== false
          }

          return { followOutputBehavior, shouldFollow, totalCount }
        }),
        u.filter(({ shouldFollow }) => shouldFollow)
      ),
      ({ followOutputBehavior, totalCount }) => {
        cancelPendingScroll()

        // if the items have fixed size, we can scroll immediately
        if (u.getValue(fixedItemSize) === undefined) {
          pendingScrollHandle = u.handleNext(listRefresh, () => {
            u.getValue(log)('following output to ', { totalCount }, LogLevel.DEBUG)
            scrollToBottom(followOutputBehavior)
            pendingScrollHandle = null
          })
        } else {
          requestAnimationFrame(() => {
            u.getValue(log)('following output to ', { totalCount }, LogLevel.DEBUG)
            scrollToBottom(followOutputBehavior)
          })
        }
      }
    )

    function trapNextSizeIncrease(followOutput: boolean) {
      cancelPendingSizeIncreaseTrap()
      if (!followOutput) {
        return
      }
      cancelSizeIncreaseTrap = u.handleNext(atBottomState, (state) => {
        cancelSizeIncreaseTrap = null
        if (sizeIncreaseTrapTimeout !== null) {
          clearTimeout(sizeIncreaseTrapTimeout)
          sizeIncreaseTrapTimeout = null
        }
        if (!state.atBottom && state.notAtBottomBecause === 'SIZE_INCREASED' && pendingScrollHandle === null) {
          u.getValue(log)('scrolling to bottom due to increased size', {}, LogLevel.DEBUG)
          scrollToBottom('auto')
        }
      })
      sizeIncreaseTrapTimeout = setTimeout(cancelPendingSizeIncreaseTrap, 100)
    }

    u.subscribe(
      u.pipe(
        u.combineLatest(u.duc(followOutput), totalCount, propsReady),
        u.filter(([follow, , ready]) => follow !== false && ready),
        u.scan(
          ({ value }, [, next]) => {
            return { refreshed: value === next, value: next }
          },
          { refreshed: false, value: 0 }
        ),
        u.filter(({ refreshed }) => refreshed),
        u.withLatestFrom(followOutput, totalCount)
      ),
      ([, followOutput]) => {
        // activate adjustment only if the initial item is already scrolled to
        if (u.getValue(scrolledToInitialItem)) {
          const shouldFollow = behaviorFromFollowOutput(followOutput, u.getValue(isAtBottom)) !== false
          if (shouldFollow && u.getValue(fixedItemSize) === undefined) {
            // Content-only data updates can commit later than the data prop itself.
            // Wait for the actual item measurement, coalescing rapid updates, and
            // cancel the follow if the reader moves upwards in the meantime.
            followAfterNextSizeRefresh()
          } else {
            cancelPendingScroll()
          }
        }
      }
    )

    u.subscribe(autoscrollToBottom, () => {
      trapNextSizeIncrease(u.getValue(followOutput) !== false)
    })

    u.subscribe(u.combineLatest(u.duc(followOutput), atBottomState), ([followOutput, state]) => {
      if (followOutput !== false && !state.atBottom && state.notAtBottomBecause === 'VIEWPORT_HEIGHT_DECREASING') {
        cancelPendingScroll()
        scrollToBottom('auto')
      }
    })

    const scrollIntoViewOnChange = u.statefulStream<
      | null
      | ((params: {
          context: unknown
          totalCount: number
          scrollingInProgress: boolean
        }) => ScrollIntoViewLocation | null | undefined | false)
    >(null)

    const tcOrDataChange = u.stream<number>()

    u.connect(
      u.merge(
        u.pipe(
          u.duc(data),
          u.map((data) => data?.length ?? 0)
        ),
        u.pipe(u.duc(totalCount))
      ),
      tcOrDataChange
    )

    u.subscribe(
      u.pipe(
        u.combineLatest(u.pipe(tcOrDataChange, u.skip(1)), didMount),
        u.withLatestFrom(u.duc(scrollIntoViewOnChange), scrolledToInitialItem, scrollingInProgress, context),
        u.map(([[totalCount, didMount], scrollIntoViewOnChange, scrolledToInitialItem, scrollingInProgress, context]) => {
          return didMount && scrolledToInitialItem && scrollIntoViewOnChange?.({ context, totalCount, scrollingInProgress })
        }),
        u.filter((viewLocation) => Boolean(viewLocation)),
        u.throttleTime(0)
      ),
      (viewLocation) => {
        cancelPendingScroll()

        // if the items have fixed size, we can scroll immediately
        if (u.getValue(fixedItemSize) === undefined) {
          pendingScrollHandle = u.handleNext(listRefresh, () => {
            u.getValue(log)('scrolling into view', {})
            u.publish(scrollIntoView, viewLocation)
            pendingScrollHandle = null
          })
        } else {
          requestAnimationFrame(() => {
            u.getValue(log)('scrolling into view', {})
            u.publish(scrollIntoView, viewLocation)
          })
        }
      }
    )

    return { autoscrollToBottom, followOutput, scrollIntoViewOnChange }
  },
  u.tup(
    sizeSystem,
    stateFlagsSystem,
    scrollToIndexSystem,
    initialTopMostItemIndexSystem,
    propsReadySystem,
    loggerSystem,
    domIOSystem,
    contextSystem,
    scrollIntoViewSystem
  )
)
