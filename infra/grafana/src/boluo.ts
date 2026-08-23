import {
  DashboardBuilder,
  DashboardCursorSync,
  GridBuilder,
  gridItem,
} from '@grafana/grafana-foundation-sdk/dashboardv2';
import { AxisPlacement } from '@grafana/grafana-foundation-sdk/common';
import {
  QueryEditorMode,
  TooltipDisplayMode,
  dashboardTimeSettings,
  defaultAnnotations,
  timeSeriesPanel,
} from './lib.js';
import { SERVER_APP as APP, memoryUtilization } from './metrics.js';

export const BOLUO_DASHBOARD_RESOURCE_NAME = 'c35465c7-1203-42c4-9bcc-5b5cb012d67b';
export const DEFAULT_PROMETHEUS_DATASOURCE_UID = 'bfuvhahaptkw0d';

const RATE_INTERVAL = '$__rate_interval';
const CACHE_RATIO_INTERVAL = '30m';
const HTTP_STATUS_CODES = ['200', '204', '304', '400', '401', '403', '404', '429', '500', '502'];
const CACHE_NAMES = ['CharacterVariables', 'Session', 'User', 'UserExt', 'UserSpaces'];

const panels = {
  httpTraffic: 'panel-13',
  httpLatency: 'panel-14',
  cpuUtilization: 'panel-2',
  memoryUtilization: 'panel-3',
  appConnections: 'panel-7',
  applicationPool: 'panel-17',
  cacheHitRatio: 'panel-15',
  cacheCapacityUtilization: 'panel-19',
  messages: 'panel-9',
  messageLatency: 'panel-16',
  diskCacheCapacity: 'panel-20',
  diskCacheIo: 'panel-21',
  diskCacheLatency: 'panel-22',
  queueDepths: 'panel-24',
  eventDelivery: 'panel-26',
  runtimePopulation: 'panel-27',
  processMemory: 'panel-29',
} as const;

const messageRateMetrics = [
  ['created', 'boluo_server_messages_created_total'],
  ['edited', 'boluo_server_messages_edited_total'],
  ['moved', 'boluo_server_messages_moved_total'],
  ['deleted', 'boluo_server_messages_deleted_total'],
  ['folded', 'boluo_server_messages_folded_total'],
  ['preview', 'boluo_server_events_preview_total'],
  ['preview diff', 'boluo_server_events_preview_diff_total'],
] as const;

function rate(metric: string): string {
  return `rate(${metric}{app="${APP}"}[${RATE_INTERVAL}])`;
}

function histogramQuantile(quantile: number, metric: string, extraLabels = ''): string {
  const labels = extraLabels ? `,${extraLabels}` : '';
  return `histogram_quantile(${quantile}, sum by(le) (rate(${metric}_bucket{app="${APP}"${labels}}[${RATE_INTERVAL}])))`;
}

function summaryQuantile(quantile: number, metric: string): string {
  return `${metric}{app="${APP}",quantile="${quantile}"}`;
}

function rateOrZero(metric: string): string {
  return `(${rate(metric)}) or vector(0)`;
}

function summedRateOrZero(metric: string, extraLabels = ''): string {
  const labels = extraLabels ? `,${extraLabels}` : '';
  return `(sum(rate(${metric}{app="${APP}"${labels}}[${RATE_INTERVAL}]))) or vector(0)`;
}

export function buildBoluoDashboard(
  datasourceUid = DEFAULT_PROMETHEUS_DATASOURCE_UID,
): DashboardBuilder {
  return new DashboardBuilder('Boluo')
    .annotations([defaultAnnotations()])
    .cursorSync(DashboardCursorSync.Off)
    .editable(true)
    .element(
      panels.httpTraffic,
      timeSeriesPanel({
        id: 13,
        title: 'HTTP request rate',
        datasourceUid,
        unit: 'reqps',
        seriesNames: HTTP_STATUS_CODES,
        targets: [
          {
            refId: 'responses',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(status) (rate(fly_edge_http_responses_count{app="${APP}"}[${RATE_INTERVAL}]))`,
            legendFormat: '{{status}}',
          },
        ],
      }),
    )
    .element(
      panels.httpLatency,
      timeSeriesPanel({
        id: 14,
        title: 'HTTP response latency',
        datasourceUid,
        unit: 's',
        targets: [
          {
            refId: 'p50',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.5, 'fly_edge_http_response_time_seconds'),
            legendFormat: 'p50',
          },
          {
            refId: 'p95',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.95, 'fly_edge_http_response_time_seconds'),
            legendFormat: 'p95',
          },
          {
            refId: 'p99',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.99, 'fly_edge_http_response_time_seconds'),
            legendFormat: 'p99',
          },
        ],
      }),
    )
    .element(
      panels.cpuUtilization,
      timeSeriesPanel({
        id: 2,
        title: 'CPU utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'usage',
            editorMode: QueryEditorMode.Code,
            expr: `1 - avg by(instance) (rate(fly_instance_cpu{app="${APP}",mode="idle"}[${RATE_INTERVAL}])) / 100`,
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.memoryUtilization,
      timeSeriesPanel({
        id: 3,
        title: 'Instance memory pressure',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'memory',
            editorMode: QueryEditorMode.Code,
            expr: memoryUtilization(APP),
            legendFormat: '{{instance}} memory',
          },
          {
            refId: 'swap',
            editorMode: QueryEditorMode.Code,
            expr: `(fly_instance_memory_swap_total{app="${APP}"} - fly_instance_memory_swap_free{app="${APP}"}) / clamp_min(fly_instance_memory_swap_total{app="${APP}"}, 1)`,
            legendFormat: '{{instance}} swap',
          },
        ],
      }),
    )
    .element(
      panels.appConnections,
      timeSeriesPanel({
        id: 7,
        title: 'Live connections',
        datasourceUid,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'tcp',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance) (boluo_server_tcp_connections_active{app="${APP}"})`,
            legendFormat: '{{instance}} tcp',
          },
          {
            refId: 'websocket',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance) (boluo_server_websocket_connections_active{app="${APP}"})`,
            legendFormat: '{{instance}} websocket',
          },
        ],
      }),
    )
    .element(
      panels.cacheHitRatio,
      timeSeriesPanel({
        id: 15,
        title: 'Cache hit ratio',
        description: '30-minute window; gaps mean no requests.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        targets: [
          {
            refId: 'ratio',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(cache) (increase(boluo_server_cache_hits_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])) / (sum by(cache) (increase(boluo_server_cache_hits_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])) + sum by(cache) (increase(boluo_server_cache_misses_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])))`,
            legendFormat: '{{cache}}',
          },
        ],
      }),
    )
    .element(
      panels.applicationPool,
      timeSeriesPanel({
        id: 17,
        title: 'Database pool connections',
        datasourceUid,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'total',
            editorMode: QueryEditorMode.Code,
            expr: `sum(boluo_server_db_pool_connections_total{app="${APP}"})`,
            legendFormat: 'total',
          },
          {
            refId: 'used',
            editorMode: QueryEditorMode.Code,
            expr: `sum(boluo_server_db_pool_connections_total{app="${APP}"} - boluo_server_db_pool_connections_idle{app="${APP}"})`,
            legendFormat: 'used',
          },
          {
            refId: 'idle',
            editorMode: QueryEditorMode.Code,
            expr: `sum(boluo_server_db_pool_connections_idle{app="${APP}"})`,
            legendFormat: 'idle',
          },
        ],
      }),
    )
    .element(
      panels.cacheCapacityUtilization,
      timeSeriesPanel({
        id: 19,
        title: 'Cache capacity utilization',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        tooltipMode: TooltipDisplayMode.Multi,
        seriesNames: CACHE_NAMES,
        targets: [
          {
            refId: 'utilization',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(cache) (boluo_server_cache_items{app="${APP}"}) / clamp_min(sum by(cache) (boluo_server_cache_capacity{app="${APP}"}), 1)`,
            legendFormat: '{{cache}}',
          },
        ],
      }),
    )
    .element(
      panels.messages,
      timeSeriesPanel({
        id: 9,
        title: 'Message operation rate',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: messageRateMetrics.map(([legendFormat, metric], index) => ({
          refId: String.fromCharCode(65 + index),
          editorMode: QueryEditorMode.Code,
          expr: `sum(${rate(metric)})`,
          legendFormat,
        })),
      }),
    )
    .element(
      panels.messageLatency,
      timeSeriesPanel({
        id: 16,
        title: 'Message operation latency',
        description: 'Per-instance rolling quantiles; gaps mean no recent operations.',
        datasourceUid,
        unit: 'ms',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'create-p50',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.5, 'boluo_server_messages_create_duration_ms'),
            legendFormat: '{{instance}} create p50',
          },
          {
            refId: 'create-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_messages_create_duration_ms'),
            legendFormat: '{{instance}} create p95',
          },
          {
            refId: 'edit-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_messages_edit_duration_ms'),
            legendFormat: '{{instance}} edit p95',
          },
        ],
      }),
    )
    .element(
      panels.diskCacheCapacity,
      timeSeriesPanel({
        id: 20,
        title: 'Disk cache utilization',
        description: 'Cache file size as a proportion of the configured high-water mark.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'utilization',
            editorMode: QueryEditorMode.Code,
            expr: `max by(instance) (boluo_server_disk_cache_file_bytes{app="${APP}"}) / clamp_min(max by(instance) (boluo_server_disk_cache_high_watermark_bytes{app="${APP}"}), 1)`,
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.diskCacheIo,
      timeSeriesPanel({
        id: 21,
        title: 'Disk cache I/O',
        description: 'Rates for redb reads, writes, and capacity rejections.',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'reads',
            editorMode: QueryEditorMode.Code,
            expr: `rate(boluo_server_mailbox_cache_read_operations_total{app="${APP}"}[${RATE_INTERVAL}])`,
            legendFormat: 'reads',
          },
          {
            refId: 'writes',
            editorMode: QueryEditorMode.Code,
            expr: `rate(boluo_server_disk_cache_write_operations_total{app="${APP}"}[${RATE_INTERVAL}])`,
            legendFormat: 'writes',
          },
          {
            refId: 'capacity-rejections',
            editorMode: QueryEditorMode.Code,
            expr: rateOrZero('boluo_server_disk_cache_capacity_rejections_total'),
            legendFormat: 'high-watermark rejections',
          },
        ],
      }),
    )
    .element(
      panels.queueDepths,
      timeSeriesPanel({
        id: 24,
        title: 'Queue depths',
        description:
          'Current pending work across WebSocket delivery, mailbox and space runtimes, disk cache, and Tokio.',
        datasourceUid,
        unit: 'short',
        min: 0,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'websocket-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_events_pending_updates'),
            legendFormat: '{{instance}} WebSocket pending p95',
          },
          {
            refId: 'mailbox-actions',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_events_mailbox_action_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} mailbox actions',
          },
          {
            refId: 'runtime-control',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_runtime_control_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} runtime control',
          },
          {
            refId: 'runtime-mutations',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_runtime_mutation_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} runtime mutations',
          },
          {
            refId: 'space-activity',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_activity_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} space activity',
          },
          {
            refId: 'disk-cache',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_disk_cache_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} disk cache',
          },
          {
            refId: 'tokio-global',
            editorMode: QueryEditorMode.Code,
            expr: `tokio_global_queue_depth{app="${APP}"}`,
            legendFormat: '{{instance}} Tokio global',
          },
        ],
      }),
    )
    .element(
      panels.eventDelivery,
      timeSeriesPanel({
        id: 26,
        title: 'Backpressure events',
        description:
          'Rates of dropped, rejected, or timed-out work caused by internal queues and consumers falling behind.',
        datasourceUid,
        unit: 'ops',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'broadcast-lagged',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_events_broadcast_lagged_total'),
            legendFormat: 'broadcast lagged updates/s',
          },
          {
            refId: 'mailbox-action-timeout',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_events_mailbox_actions_total', 'result="timeout"'),
            legendFormat: 'mailbox action timeouts/s',
          },
          {
            refId: 'runtime-mutation-rejected',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_space_runtime_mutation_rejected_total'),
            legendFormat: 'runtime mutation rejections/s',
          },
          {
            refId: 'runtime-read-timeout',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero(
              'boluo_server_space_runtime_read_wait_total',
              'result="timeout"',
            ),
            legendFormat: 'runtime read wait timeouts/s',
          },
          {
            refId: 'activity-dropped',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_space_activity_notifications_dropped_total'),
            legendFormat: 'activity notifications dropped/s',
          },
          {
            refId: 'disk-cache-queue-full',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_disk_cache_queue_full_total'),
            legendFormat: 'disk cache queue full/s',
          },
        ],
      }),
    )
    .element(
      panels.runtimePopulation,
      timeSeriesPanel({
        id: 27,
        title: 'Runtime population',
        description: 'In-memory application objects retained by each server instance.',
        datasourceUid,
        unit: 'short',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'loaded',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_runtime_loaded{app="${APP}"}`,
            legendFormat: '{{instance}} loaded spaces',
          },
          {
            refId: 'mailboxes',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_events_mailboxes{app="${APP}"}`,
            legendFormat: '{{instance}} mailboxes',
          },
          {
            refId: 'position-actors',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_pos_actors{app="${APP}"}`,
            legendFormat: '{{instance}} position actors',
          },
          {
            refId: 'token-store',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_events_token_store_entries{app="${APP}"}`,
            legendFormat: '{{instance}} token store',
          },
        ],
      }),
    )
    .element(
      panels.processMemory,
      timeSeriesPanel({
        id: 29,
        title: 'Process & allocator memory',
        description:
          'Linux /proc memory is authoritative for process RSS; mimalloc committed memory estimates allocator-owned address space.',
        datasourceUid,
        unit: 'bytes',
        min: 0,
        tooltipMode: TooltipDisplayMode.Multi,
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'allocator-committed' },
            properties: [{ id: 'custom.axisPlacement', value: AxisPlacement.Right }],
          },
        ],
        targets: [
          {
            refId: 'rss',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_memory_bytes{app="${APP}",kind="rss"}`,
            legendFormat: '{{instance}} RSS',
          },
          {
            refId: 'anonymous',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_memory_bytes{app="${APP}",kind="anonymous"}`,
            legendFormat: '{{instance}} anonymous',
          },
          {
            refId: 'file',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_memory_bytes{app="${APP}",kind="file"}`,
            legendFormat: '{{instance}} file',
          },
          {
            refId: 'allocator-committed',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_allocator_committed_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} allocator committed',
          },
          {
            refId: 'swap',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_swap_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} process swap',
          },
        ],
      }),
    )
    .element(
      panels.diskCacheLatency,
      timeSeriesPanel({
        id: 22,
        title: 'Disk cache latency',
        description: 'p95 latency for redb reads, writes, and compaction.',
        datasourceUid,
        unit: 'ms',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'read-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_mailbox_cache_read_duration_ms'),
            legendFormat: 'read p95 (ms)',
          },
          {
            refId: 'write-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_disk_cache_commit_duration_ms'),
            legendFormat: 'write p95 (ms)',
          },
          {
            refId: 'compact-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_disk_cache_compaction_duration_ms'),
            legendFormat: 'compact p95 (ms)',
          },
        ],
      }),
    )
    .layout(
      new GridBuilder().items([
        gridItem(panels.httpTraffic).x(0).y(0).width(12).height(6),
        gridItem(panels.httpLatency).x(12).y(0).width(12).height(6),
        gridItem(panels.cpuUtilization).x(0).y(6).width(8).height(8),
        gridItem(panels.memoryUtilization).x(8).y(6).width(8).height(8),
        gridItem(panels.processMemory).x(16).y(6).width(8).height(8),
        gridItem(panels.appConnections).x(0).y(14).width(8).height(8),
        gridItem(panels.applicationPool).x(8).y(14).width(8).height(8),
        gridItem(panels.runtimePopulation).x(16).y(14).width(8).height(8),
        gridItem(panels.cacheHitRatio).x(0).y(22).width(12).height(8),
        gridItem(panels.cacheCapacityUtilization).x(12).y(22).width(12).height(8),
        gridItem(panels.messages).x(0).y(30).width(12).height(8),
        gridItem(panels.messageLatency).x(12).y(30).width(12).height(8),
        gridItem(panels.queueDepths).x(0).y(38).width(12).height(8),
        gridItem(panels.eventDelivery).x(12).y(38).width(12).height(8),
        gridItem(panels.diskCacheCapacity).x(0).y(46).width(8).height(8),
        gridItem(panels.diskCacheIo).x(8).y(46).width(8).height(8),
        gridItem(panels.diskCacheLatency).x(16).y(46).width(8).height(8),
      ]),
    )
    .links([])
    .preload(false)
    .tags(['boluo', 'production', 'managed-by-code'])
    .timeSettings(dashboardTimeSettings('now-6h'))
    .variables([]);
}
