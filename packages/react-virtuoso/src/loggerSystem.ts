import * as u from './urx'

declare global {
  var VIRTUOSO_LOG_LEVEL: LogLevel | undefined
}

/**
 * Log levels for controlling virtuoso diagnostic output.
 * Use with the `logLevel` prop to enable debugging information.
 *
 * @example
 * ```tsx
 * import { Virtuoso, LogLevel } from 'react-virtuoso'
 *
 * <Virtuoso
 *   totalCount={1000}
 *   logLevel={LogLevel.DEBUG}
 *   itemContent={(index) => <div>Item {index}</div>}
 * />
 * ```
 *
 * @group Common
 */
export const LogLevel = {
  /** Detailed debugging information including item measurements */
  DEBUG: 0,
  /** General informational messages */
  INFO: 1,
  /** Warning messages for potential issues */
  WARN: 2,
  /** Error messages for failures (default level) */
  ERROR: 3,
} as const

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]
export type Log = (label: string, message: any, level?: LogLevel) => void

const CONSOLE_METHOD_MAP = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.ERROR]: 'error',
  [LogLevel.INFO]: 'log',
  [LogLevel.WARN]: 'warn',
} as const

const getGlobalThis = () => (typeof globalThis === 'undefined' ? window : globalThis)

export const loggerSystem = u.system(
  () => {
    const logLevel = u.statefulStream<LogLevel>(LogLevel.ERROR)
    const log = u.statefulStream<Log>((label: string, message: any, level: LogLevel = LogLevel.INFO) => {
      const currentLevel = getGlobalThis().VIRTUOSO_LOG_LEVEL ?? u.getValue(logLevel)
      if (level >= currentLevel) {
        console[CONSOLE_METHOD_MAP[level]](
          '%creact-virtuoso: %c%s %o',
          'color: #0253b3; font-weight: bold',
          'color: initial',
          label,
          message
        )
      }
    })

    return {
      log,
      logLevel,
    }
  },
  [],
  { singleton: true }
)
