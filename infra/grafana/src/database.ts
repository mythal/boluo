import {
  DashboardBuilder,
  DashboardCursorSync,
  GridBuilder,
  gridItem,
} from '@grafana/grafana-foundation-sdk/dashboardv2';
import {
  QueryEditorMode,
  TooltipDisplayMode,
  dashboardTimeSettings,
  defaultAnnotations,
  statPanel,
  tablePanel,
  timeSeriesPanel,
} from './lib.js';
import {
  DATABASE_APP,
  DATABASE_NAME,
  backupMetric,
  databaseVolumeUtilization,
  memoryUtilization,
} from './metrics.js';

export const DATABASE_DASHBOARD_RESOURCE_NAME = 'd0f4f08d-8d6e-4afc-b738-f3d503c9e389';

const RATE_INTERVAL = '$__rate_interval';
const CACHE_RATIO_INTERVAL = '5m';
const CONNECTION_STATES = [
  'active',
  'disabled',
  'fastpath function call',
  'idle',
  'idle in transaction',
  'idle in transaction (aborted)',
];
const LOCK_MODES = [
  'AccessShareLock',
  'RowShareLock',
  'RowExclusiveLock',
  'ShareUpdateExclusiveLock',
  'ShareLock',
  'ShareRowExclusiveLock',
  'ExclusiveLock',
  'AccessExclusiveLock',
];
const panels = {
  connections: 'panel-4',
  transactions: 'panel-5',
  longestTransaction: 'panel-6',
  cacheHitRatio: 'panel-7',
  tupleOperations: 'panel-8',
  locks: 'panel-9',
  databaseErrors: 'panel-10',
  temporaryData: 'panel-11',
  databaseAndWalSize: 'panel-12',
  tableSizes: 'panel-13',
  deadTuples: 'panel-14',
  deadTupleCounts: 'panel-16',
  scanRate: 'panel-15',
  backupDuration: 'panel-17',
  backupSize: 'panel-18',
  walArchiving: 'panel-19',
  cpuUtilization: 'panel-20',
  memoryUtilization: 'panel-21',
  filesystemUtilization: 'panel-22',
} as const;

const tupleOperationMetrics = [
  ['fetched', 'pg_stat_database_tup_fetched'],
  ['inserted', 'pg_stat_database_tup_inserted'],
  ['updated', 'pg_stat_database_tup_updated'],
  ['deleted', 'pg_stat_database_tup_deleted'],
] as const;

function databaseMetric(metric: string): string {
  return `${metric}{app="${DATABASE_APP}",datname="${DATABASE_NAME}"}`;
}

function databaseRate(metric: string): string {
  return `rate(${databaseMetric(metric)}[${RATE_INTERVAL}])`;
}

export function buildDatabaseDashboard(datasourceUid: string): DashboardBuilder {
  return new DashboardBuilder('Boluo Database')
    .annotations([defaultAnnotations()])
    .cursorSync(DashboardCursorSync.Off)
    .editable(true)
    .element(
      panels.connections,
      timeSeriesPanel({
        id: 4,
        title: 'PostgreSQL connections by state',
        datasourceUid,
        tooltipMode: TooltipDisplayMode.Multi,
        seriesNames: CONNECTION_STATES,
        targets: [
          {
            refId: 'connections',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(state) (${databaseMetric('pg_stat_activity_count')})`,
            legendFormat: '{{state}}',
          },
        ],
      }),
    )
    .element(
      panels.transactions,
      timeSeriesPanel({
        id: 5,
        title: 'Transaction rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'commits',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${databaseRate('pg_stat_database_xact_commit')})`,
            legendFormat: 'commits',
          },
          {
            refId: 'rollbacks',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${databaseRate('pg_stat_database_xact_rollback')})`,
            legendFormat: 'rollbacks',
          },
        ],
      }),
    )
    .element(
      panels.longestTransaction,
      timeSeriesPanel({
        id: 6,
        title: 'Longest transaction',
        datasourceUid,
        unit: 's',
        seriesNames: CONNECTION_STATES,
        targets: [
          {
            refId: 'duration',
            editorMode: QueryEditorMode.Code,
            expr: `max by(state) (${databaseMetric('pg_stat_activity_max_tx_duration')})`,
            legendFormat: '{{state}}',
          },
        ],
      }),
    )
    .element(
      panels.cacheHitRatio,
      timeSeriesPanel({
        id: 7,
        title: 'Buffer cache hit ratio',
        description: 'Gaps mean there were no buffer reads in the rolling window.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'ratio',
            editorMode: QueryEditorMode.Code,
            expr: `sum(increase(${databaseMetric('pg_stat_database_blks_hit')}[${CACHE_RATIO_INTERVAL}])) / (sum(increase(${databaseMetric('pg_stat_database_blks_hit')}[${CACHE_RATIO_INTERVAL}])) + sum(increase(${databaseMetric('pg_stat_database_blks_read')}[${CACHE_RATIO_INTERVAL}])))`,
            legendFormat: 'cache hit ratio',
          },
        ],
      }),
    )
    .element(
      panels.tupleOperations,
      timeSeriesPanel({
        id: 8,
        title: 'Tuple operation rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: tupleOperationMetrics.map(([legendFormat, metric], index) => ({
          refId: String.fromCharCode(65 + index),
          editorMode: QueryEditorMode.Code,
          expr: `sum(${databaseRate(metric)})`,
          legendFormat,
        })),
      }),
    )
    .element(
      panels.locks,
      timeSeriesPanel({
        id: 9,
        title: 'Locks by mode',
        description: 'All observed PostgreSQL locks by mode, not only waiting locks.',
        datasourceUid,
        tooltipMode: TooltipDisplayMode.Multi,
        seriesNames: LOCK_MODES,
        targets: [
          {
            refId: 'locks',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(mode) (${databaseMetric('pg_locks_count')})`,
            legendFormat: '{{mode}}',
          },
        ],
      }),
    )
    .element(
      panels.databaseErrors,
      timeSeriesPanel({
        id: 10,
        title: 'Database error rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'deadlocks',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${databaseRate('pg_stat_database_deadlocks')})`,
            legendFormat: 'deadlocks',
          },
          {
            refId: 'conflicts',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${databaseRate('pg_stat_database_conflicts')})`,
            legendFormat: 'recovery conflicts',
          },
        ],
      }),
    )
    .element(
      panels.temporaryData,
      timeSeriesPanel({
        id: 11,
        title: 'Temporary data rate',
        datasourceUid,
        unit: 'Bps',
        targets: [
          {
            refId: 'bytes',
            editorMode: QueryEditorMode.Code,
            expr: `sum(${databaseRate('pg_stat_database_temp_bytes')})`,
            legendFormat: 'temporary data',
          },
        ],
      }),
    )
    .element(
      panels.databaseAndWalSize,
      timeSeriesPanel({
        id: 12,
        title: 'Database and WAL size',
        datasourceUid,
        unit: 'bytes',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'database',
            editorMode: QueryEditorMode.Code,
            expr: `max(${databaseMetric('pg_database_size_bytes')})`,
            legendFormat: 'database',
          },
          {
            refId: 'wal',
            editorMode: QueryEditorMode.Code,
            expr: `max(pg_wal_size_bytes{app="${DATABASE_APP}"})`,
            legendFormat: 'WAL directory',
          },
        ],
      }),
    )
    .element(
      panels.tableSizes,
      tablePanel({
        id: 13,
        title: 'Largest tables',
        description: 'Includes indexes and TOAST data.',
        datasourceUid,
        unit: 'bytes',
        targets: [
          {
            refId: 'tables',
            editorMode: QueryEditorMode.Code,
            expr: `topk(10, pg_stat_user_tables_size_bytes{app="${DATABASE_APP}",datname="${DATABASE_NAME}"})`,
            legendFormat: '{{schemaname}}.{{relname}}',
          },
        ],
      }),
    )
    .element(
      panels.deadTuples,
      timeSeriesPanel({
        id: 14,
        title: 'Tables with the highest dead tuple ratio',
        description: 'Estimated dead rows as a share of live and dead rows.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'dead-tuple-ratio',
            editorMode: QueryEditorMode.Code,
            expr: `topk(10, (pg_stat_user_tables_n_dead_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} / clamp_min(pg_stat_user_tables_n_live_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} + pg_stat_user_tables_n_dead_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"}, 1)) and (pg_stat_user_tables_n_live_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} + pg_stat_user_tables_n_dead_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} > 1000))`,
            legendFormat: '{{schemaname}}.{{relname}}',
          },
        ],
      }),
    )
    .element(
      panels.deadTupleCounts,
      tablePanel({
        id: 16,
        title: 'Tables with the most dead tuples',
        description: 'Estimated dead rows; tables with fewer than 1,000 total rows are excluded.',
        datasourceUid,
        unit: 'short',
        targets: [
          {
            refId: 'dead-tuples',
            editorMode: QueryEditorMode.Code,
            expr: `topk(10, pg_stat_user_tables_n_dead_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} and (pg_stat_user_tables_n_live_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} + pg_stat_user_tables_n_dead_tup{app="${DATABASE_APP}",datname="${DATABASE_NAME}"} > 1000))`,
            legendFormat: '{{schemaname}}.{{relname}}',
          },
        ],
      }),
    )
    .element(
      panels.scanRate,
      timeSeriesPanel({
        id: 15,
        title: 'Table scan rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'sequential',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(pg_stat_user_tables_seq_scan{app="${DATABASE_APP}",datname="${DATABASE_NAME}"}[${RATE_INTERVAL}]))`,
            legendFormat: 'sequential scans',
          },
          {
            refId: 'index',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(pg_stat_user_tables_idx_scan{app="${DATABASE_APP}",datname="${DATABASE_NAME}"}[${RATE_INTERVAL}]))`,
            legendFormat: 'index scans',
          },
        ],
      }),
    )
    .element(
      panels.backupDuration,
      statPanel({
        id: 17,
        title: 'Last backup duration',
        datasourceUid,
        unit: 's',
        targets: [
          {
            refId: 'duration',
            editorMode: QueryEditorMode.Code,
            expr: `max by(backup_type) (${backupMetric('pgbackrest_backup_last_duration_seconds', 'backup_type=~"full|diff"')})`,
            legendFormat: '{{backup_type}}',
          },
        ],
      }),
    )
    .element(
      panels.backupSize,
      statPanel({
        id: 18,
        title: 'Last backup repository size',
        description: 'Compressed bytes written by the latest backup.',
        datasourceUid,
        unit: 'bytes',
        targets: [
          {
            refId: 'size',
            editorMode: QueryEditorMode.Code,
            expr: `max by(backup_type) (${backupMetric('pgbackrest_backup_last_repo_delta_bytes', 'backup_type=~"full|diff"')})`,
            legendFormat: '{{backup_type}}',
          },
        ],
      }),
    )
    .element(
      panels.walArchiving,
      timeSeriesPanel({
        id: 19,
        title: 'WAL archiving rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'archived',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(pg_stat_archiver_archived_count{app="${DATABASE_APP}"}[${RATE_INTERVAL}]))`,
            legendFormat: 'archived',
          },
          {
            refId: 'failed',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(pg_stat_archiver_failed_count{app="${DATABASE_APP}"}[${RATE_INTERVAL}]))`,
            legendFormat: 'failed',
          },
        ],
      }),
    )
    .element(
      panels.cpuUtilization,
      timeSeriesPanel({
        id: 20,
        title: 'Database CPU utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'cpu',
            editorMode: QueryEditorMode.Code,
            expr: `1 - avg by(instance) (rate(fly_instance_cpu{app="${DATABASE_APP}",mode="idle"}[${RATE_INTERVAL}])) / 100`,
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.memoryUtilization,
      timeSeriesPanel({
        id: 21,
        title: 'Database memory utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'memory',
            editorMode: QueryEditorMode.Code,
            expr: memoryUtilization(DATABASE_APP),
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.filesystemUtilization,
      timeSeriesPanel({
        id: 22,
        title: 'Database volume utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'filesystem',
            editorMode: QueryEditorMode.Code,
            expr: databaseVolumeUtilization(),
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .layout(
      new GridBuilder().items([
        gridItem(panels.connections).x(0).y(0).width(12).height(6),
        gridItem(panels.transactions).x(12).y(0).width(12).height(6),
        gridItem(panels.cacheHitRatio).x(0).y(6).width(8).height(8),
        gridItem(panels.longestTransaction).x(8).y(6).width(8).height(8),
        gridItem(panels.databaseErrors).x(16).y(6).width(8).height(8),
        gridItem(panels.locks).x(0).y(14).width(8).height(8),
        gridItem(panels.temporaryData).x(8).y(14).width(8).height(8),
        gridItem(panels.databaseAndWalSize).x(16).y(14).width(8).height(8),
        gridItem(panels.tupleOperations).x(0).y(22).width(8).height(8),
        gridItem(panels.scanRate).x(8).y(22).width(8).height(8),
        gridItem(panels.walArchiving).x(16).y(22).width(8).height(8),
        gridItem(panels.tableSizes).x(0).y(30).width(12).height(8),
        gridItem(panels.deadTuples).x(12).y(30).width(12).height(8),
        gridItem(panels.deadTupleCounts).x(0).y(38).width(8).height(8),
        gridItem(panels.backupDuration).x(8).y(38).width(8).height(8),
        gridItem(panels.backupSize).x(16).y(38).width(8).height(8),
        gridItem(panels.cpuUtilization).x(0).y(46).width(8).height(8),
        gridItem(panels.memoryUtilization).x(8).y(46).width(8).height(8),
        gridItem(panels.filesystemUtilization).x(16).y(46).width(8).height(8),
      ]),
    )
    .links([])
    .preload(false)
    .tags(['boluo', 'database', 'postgresql', 'production', 'managed-by-code'])
    .timeSettings(dashboardTimeSettings('now-24h'))
    .variables([]);
}
