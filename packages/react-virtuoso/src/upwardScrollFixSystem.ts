import { find } from './AATree'
import { domIOSystem } from './domIOSystem'
import { listStateSystem } from './listStateSystem'
import { loggerSystem, LogLevel } from './loggerSystem'
import { recalcSystem } from './recalcSystem'
import { sizeSystem } from './sizeSystem'
import { stateFlagsSystem, UP } from './stateFlagsSystem'
import * as u from './urx'

import type { ListItem } from './interfaces'

export function isIOSWebKit() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const iPadOS = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1
  const iOS = /iP(ad|od|hone)/i.test(navigator.userAgent)
  return (iPadOS || iOS) && /WebKit/i.test(navigator.userAgent)
}

type UpwardFixState = [number, ListItem<any>[], number, number]
/**
 * Fixes upward scrolling by calculating and compensation from changed item heights, using scrollBy.
 */
export const upwardScrollFixSystem = u.system(
  ([
    { deviation, scrollBy, scrollingInProgress, scrollTo, scrollTop },
    { isAtBottom, isScrolling, lastJumpDueToItemResize, scrollDirection },
    { listState },
    { beforeUnshiftWith, gap, shiftWithOffset, sizes },
    { log },
    { recalcInProgress },
  ]) => {
    const iosScrollFixInProgress = u.statefulStream(false)
    const deviationOffset = u.streamFromEmitter(
      u.pipe(
        listState,
        u.withLatestFrom(lastJumpDueToItemResize),
        u.scan(
          ([, prevItems, prevTotalCount, prevTotalHeight], [{ bottom, items, offsetBottom, totalCount }, lastJumpDueToItemResize]) => {
            const totalHeight = bottom + offsetBottom

            let newDev = 0
            if (prevTotalCount === totalCount) {
              if (prevItems.length > 0 && items.length > 0) {
                const atStart = items[0]!.originalIndex === 0 && prevItems[0]!.originalIndex === 0
                if (!atStart) {
                  newDev = totalHeight - prevTotalHeight
                  if (newDev !== 0) {
                    newDev += lastJumpDueToItemResize
                  }
                }
              }
            }

            return [newDev, items, totalCount, totalHeight] as UpwardFixState
          },
          [0, [], 0, 0] as UpwardFixState
        ),
        u.filter(([amount]) => amount !== 0),
        u.withLatestFrom(scrollTop, scrollDirection, scrollingInProgress, isAtBottom, log, recalcInProgress),
        u.filter(([, scrollTop, scrollDirection, scrollingInProgress, , , recalcInProgress]) => {
          return !recalcInProgress && !scrollingInProgress && scrollTop !== 0 && scrollDirection === UP
        }),
        u.map(([[amount], , , , , log]) => {
          log('Upward scrolling compensation', { amount }, LogLevel.DEBUG)
          return amount
        })
      )
    )

    const mobileSafari = isIOSWebKit()

    function scrollByWith(offset: number) {
      if (offset > 0) {
        u.publish(scrollBy, { behavior: 'auto', top: -offset })
        u.publish(deviation, 0)
      } else {
        u.publish(deviation, 0)
        u.publish(scrollBy, { behavior: 'auto', top: -offset })
      }
    }

    u.subscribe(u.pipe(deviationOffset, u.withLatestFrom(deviation, isScrolling)), ([offset, deviationAmount, isScrolling]) => {
      if (isScrolling && mobileSafari) {
        u.publish(deviation, deviationAmount - offset)
      } else {
        scrollByWith(-offset)
      }
    })

    if (mobileSafari) {
      // Mobile Safari ignores or partially applies scroll corrections during momentum scrolling.
      // At either edge, temporarily lock the scroller and normalize the pending deviation.
      u.subscribe(
        u.combineLatest(scrollTop, deviation, scrollingInProgress, recalcInProgress, iosScrollFixInProgress),
        ([scrollTopValue, deviationValue, scrollingInProgressValue, recalcInProgressValue, iosScrollFixInProgressValue]) => {
          if (scrollingInProgressValue || recalcInProgressValue || iosScrollFixInProgressValue) {
            return
          }

          if (deviationValue > 0 && scrollTopValue < deviationValue) {
            u.publish(iosScrollFixInProgress, true)
            u.publish(scrollTo, { behavior: 'auto', top: 0 })
            setTimeout(() => {
              u.publish(deviation, 0)
              u.publish(iosScrollFixInProgress, false)
            })
          } else if (deviationValue < 0 && scrollTopValue <= 0) {
            u.publish(iosScrollFixInProgress, true)
            u.publish(deviation, 0)
            setTimeout(() => {
              u.publish(scrollTo, { behavior: 'auto', top: 0 })
              u.publish(iosScrollFixInProgress, false)
            })
          }
        }
      )

      // Once momentum scrolling ends, apply the deferred correction and remove the
      // visual deviation in the same frame. A second frame keeps Safari from
      // resuming its stale kinetic-scroll state while the scroller is unlocked.
      u.subscribe(
        u.pipe(
          u.combineLatest(
            u.statefulStreamFromEmitter(isScrolling, false),
            deviation,
            recalcInProgress,
            iosScrollFixInProgress
          ),
          u.filter(([isScrolling, deviation, recalcInProgress, iosScrollFixInProgress]) => {
            return !isScrolling && deviation !== 0 && !recalcInProgress && !iosScrollFixInProgress
          }),
          u.map(([, deviation]) => deviation),
          u.throttleTime(1)
        ),
        (deviationValue) => {
          u.publish(iosScrollFixInProgress, true)
          requestAnimationFrame(() => {
            u.publish(scrollBy, { behavior: 'auto', top: -deviationValue })
            u.publish(deviation, 0)
            requestAnimationFrame(() => {
              u.publish(iosScrollFixInProgress, false)
            })
          })
        }
      )
    }

    u.connect(
      u.pipe(
        shiftWithOffset,
        u.map((offset) => {
          return { top: -offset }
        })
      ),
      scrollBy
    )

    u.subscribe(
      u.pipe(
        beforeUnshiftWith,
        u.withLatestFrom(sizes, gap),
        u.map(([offset, { groupIndices, lastSize: defaultItemSize, sizeTree }, gap]) => {
          function getItemOffset(itemCount: number) {
            return itemCount * (defaultItemSize + gap)
          }
          if (groupIndices.length === 0) {
            return getItemOffset(offset)
          }

          let amount = 0
          const defaultGroupSize = find(sizeTree, 0)!

          let recognizedOffsetItems = 0
          let groupIndex = 0
          while (recognizedOffsetItems < offset) {
            // increase once for the group itself
            recognizedOffsetItems++
            amount += defaultGroupSize

            let groupItemCount =
              groupIndices.length === groupIndex + 1 ? Infinity : groupIndices[groupIndex + 1]! - groupIndices[groupIndex]! - 1

            // if the group is larger than the offset, we have an expanded group. remove the group size, and replace with 1 item.
            if (recognizedOffsetItems + groupItemCount > offset) {
              amount -= defaultGroupSize
              groupItemCount = offset - recognizedOffsetItems + 1
            }

            recognizedOffsetItems += groupItemCount
            amount += getItemOffset(groupItemCount)
            groupIndex++
          }

          return amount
        })
      ),
      (offset) => {
        u.publish(deviation, offset)
        requestAnimationFrame(() => {
          u.publish(scrollBy, { top: offset })
          requestAnimationFrame(() => {
            u.publish(deviation, 0)
            u.publish(recalcInProgress, false)
          })
        })
      }
    )

    return { deviation, iosScrollFixInProgress }
  },
  u.tup(domIOSystem, stateFlagsSystem, listStateSystem, sizeSystem, loggerSystem, recalcSystem)
)
