import {
  DashboardBuilder,
  DashboardCursorSync,
  GridBuilder,
  RowBuilder,
  RowsBuilder,
  gridItem,
} from '@grafana/grafana-foundation-sdk/dashboardv2';
import {
  GraphDrawStyle,
  LineInterpolation,
  QueryEditorMode,
  StackingMode,
  TooltipDisplayMode,
  dashboardTimeSettings,
  defaultAnnotations,
  logsPanel,
  timeSeriesPanel,
} from './lib.js';
import { SERVER_APP as APP } from './metrics.js';

export const BOLUO_DASHBOARD_RESOURCE_NAME = 'c35465c7-1203-42c4-9bcc-5b5cb012d67b';
export const DEFAULT_PROMETHEUS_DATASOURCE_UID = 'bfuvhahaptkw0d';
export const DEFAULT_VICTORIALOGS_DATASOURCE_UID = 'victorialogs';

const RATE_INTERVAL = '$__rate_interval';
const HTTP_LATENCY_INTERVAL = '5m';
const CACHE_RATIO_INTERVAL = '30m';
const HTTP_STATUS_CODES = ['200', '204', '304', '400', '401', '403', '404', '429', '500', '502'];

const panels = {
  httpTraffic: 'panel-13',
  httpLatency: 'panel-14',
  networkIo: 'panel-34',
  cpuUtilization: 'panel-2',
  memoryUtilization: 'panel-3',
  appConnections: 'panel-7',
  applicationPool: 'panel-17',
  cacheHitRatio: 'panel-15',
  cacheCapacity: 'panel-39',
  spacePayloadCacheReads: 'panel-35',
  serializedPayloadSizes: 'panel-37',
  messages: 'panel-9',
  messageLatency: 'panel-16',
  diskCacheCapacity: 'panel-20',
  diskCacheIo: 'panel-21',
  diskCacheLatency: 'panel-22',
  queueDepths: 'panel-24',
  eventDelivery: 'panel-26',
  runtimePopulation: 'panel-27',
  snapshotPopulation: 'panel-31',
  processMemory: 'panel-29',
  websocketLifecycle: 'panel-33',
  applicationLogs: 'panel-30',
  frontendLogs: 'panel-38',
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
  return `histogram_quantile(${quantile}, sum by(le) (increase(${metric}_bucket{app="${APP}"${labels}}[${HTTP_LATENCY_INTERVAL}])))`;
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
  logsDatasourceUid = DEFAULT_VICTORIALOGS_DATASOURCE_UID,
): DashboardBuilder {
  return new DashboardBuilder('Boluo')
    .annotations([defaultAnnotations()])
    .cursorSync(DashboardCursorSync.Crosshair)
    .editable(true)
    .element(
      panels.httpTraffic,
      timeSeriesPanel({
        id: 13,
        title: 'HTTP request rate',
        description: 'Measured at the Fly edge.',
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
        description: 'Measured at the Fly edge over a rolling five-minute window.',
        datasourceUid,
        unit: 's',
        targets: [
          {
            refId: 'average',
            editorMode: QueryEditorMode.Code,
            expr: `sum(increase(fly_edge_http_response_time_seconds_sum{app="${APP}"}[${HTTP_LATENCY_INTERVAL}])) / sum(increase(fly_edge_http_response_time_seconds_count{app="${APP}"}[${HTTP_LATENCY_INTERVAL}]))`,
            legendFormat: 'avg',
          },
          {
            refId: 'p50',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.5, 'fly_edge_http_response_time_seconds'),
            legendFormat: 'p50',
          },
          {
            refId: 'p90',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.9, 'fly_edge_http_response_time_seconds'),
            legendFormat: 'p90',
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
      panels.networkIo,
      timeSeriesPanel({
        id: 34,
        title: 'Network I/O',
        description: 'Traffic through each Fly Machine eth0 interface; sent traffic is below zero.',
        datasourceUid,
        unit: 'Bps',
        fillOpacity: 20,
        stacking: StackingMode.Normal,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'received-total',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(fly_instance_net_recv_bytes{app="${APP}",device="eth0"}[${RATE_INTERVAL}]))`,
            legendFormat: 'Total received',
          },
          {
            refId: 'received-instances',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance, region) (rate(fly_instance_net_recv_bytes{app="${APP}",device="eth0"}[${RATE_INTERVAL}]))`,
            legendFormat: '{{instance}} - {{region}} received',
          },
          {
            refId: 'sent-total',
            editorMode: QueryEditorMode.Code,
            expr: `sum(rate(fly_instance_net_sent_bytes{app="${APP}",device="eth0"}[${RATE_INTERVAL}]))`,
            legendFormat: 'Total sent',
          },
          {
            refId: 'sent-instances',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance, region) (rate(fly_instance_net_sent_bytes{app="${APP}",device="eth0"}[${RATE_INTERVAL}]))`,
            legendFormat: '{{instance}} - {{region}} sent',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byRegexp', options: 'Total.*' },
            properties: [
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineWidth', value: 2 },
              { id: 'custom.stacking', value: { group: 'totals', mode: StackingMode.None } },
            ],
          },
          {
            matcher: { id: 'byFrameRefID', options: 'sent-total' },
            properties: [{ id: 'custom.transform', value: 'negative-Y' }],
          },
          {
            matcher: { id: 'byFrameRefID', options: 'sent-instances' },
            properties: [{ id: 'custom.transform', value: 'negative-Y' }],
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
        axisSoftMax: 0.2,
        targets: [
          {
            refId: 'usage',
            editorMode: QueryEditorMode.Code,
            expr: `1 - avg by(instance) (rate(fly_instance_cpu{app="${APP}",mode="idle"}[${RATE_INTERVAL}])) / 100`,
            legendFormat: '{{instance}}',
          },
          {
            refId: 'baseline',
            editorMode: QueryEditorMode.Code,
            expr: `mode(fly_instance_cpu_baseline{app="${APP}"}) / mode(count(fly_instance_cpu{app="${APP}",mode="idle"}) without(cpu_id, mode))`,
            legendFormat: 'baseline',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'baseline' },
            properties: [
              { id: 'color', value: { fixedColor: 'yellow', mode: 'fixed' } },
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineStyle', value: { fill: 'dot', dash: [0, 10] } },
              {
                id: 'custom.hideFrom',
                value: { legend: true, tooltip: false, viz: false },
              },
            ],
          },
        ],
      }),
    )
    .element(
      panels.memoryUtilization,
      timeSeriesPanel({
        id: 3,
        title: 'Machine memory',
        description:
          'Used memory per Fly Machine. Total is the most common Machine capacity and is not summed during overlapping deployments.',
        datasourceUid,
        unit: 'bytes',
        min: 0,
        legendCalcs: ['lastNotNull', 'max'],
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'total',
            editorMode: QueryEditorMode.Code,
            expr: `mode(fly_instance_memory_mem_total{app="${APP}"})`,
            legendFormat: 'Total',
          },
          {
            refId: 'used',
            editorMode: QueryEditorMode.Code,
            expr: `fly_instance_memory_mem_total{app="${APP}"} - fly_instance_memory_mem_available{app="${APP}"}`,
            legendFormat: '{{instance}} - {{region}} used',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byName', options: 'Total' },
            properties: [
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineStyle', value: { fill: 'dot', dash: [0, 10] } },
            ],
          },
          {
            matcher: { id: 'byFrameRefID', options: 'used' },
            properties: [
              { id: 'custom.lineStyle', value: { fill: 'solid' } },
              { id: 'custom.fillOpacity', value: 15 },
            ],
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
        lineInterpolation: LineInterpolation.StepAfter,
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
      panels.websocketLifecycle,
      timeSeriesPanel({
        id: 33,
        title: 'WebSocket lifecycle',
        description:
          'Connection opens and closes per second. Peer closes are grouped by normalized client reason; all other closes are grouped by outcome.',
        datasourceUid,
        unit: 'ops',
        min: 0,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'opened',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_websocket_connections_total'),
            legendFormat: 'opened/s',
          },
          {
            refId: 'non-peer-closes',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(outcome) (rate(boluo_server_websocket_closes_total{app="${APP}",outcome!="peer_close"}[${RATE_INTERVAL}]))`,
            legendFormat: 'closed {{outcome}}/s',
          },
          {
            refId: 'peer-closes',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(client_reason) (rate(boluo_server_websocket_closes_total{app="${APP}",outcome="peer_close"}[${RATE_INTERVAL}]))`,
            legendFormat: 'peer {{client_reason}}/s',
          },
        ],
      }),
    )
    .element(
      panels.cacheHitRatio,
      timeSeriesPanel({
        id: 15,
        title: 'In-process cache hit ratio',
        description: 'Idle caches have no hit-ratio series.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'hit-ratio',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(cache) (increase(boluo_server_cache_hits_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])) / (sum by(cache) (increase(boluo_server_cache_hits_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])) + sum by(cache) (increase(boluo_server_cache_misses_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])))`,
            legendFormat: '{{cache}} hit ratio',
          },
        ],
      }),
    )
    .element(
      panels.cacheCapacity,
      timeSeriesPanel({
        id: 39,
        title: 'In-process cache capacity',
        description: 'Current entries as a proportion of each cache capacity.',
        datasourceUid,
        unit: 'percentunit',
        min: 0,
        max: 1,
        lineInterpolation: LineInterpolation.StepAfter,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'capacity',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(cache) (boluo_server_cache_items{app="${APP}"}) / clamp_min(sum by(cache) (boluo_server_cache_capacity{app="${APP}"}), 1)`,
            legendFormat: '{{cache}} capacity',
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
        fillOpacity: 20,
        legendCalcs: ['lastNotNull', 'max'],
        lineInterpolation: LineInterpolation.StepAfter,
        stacking: StackingMode.Normal,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
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
          {
            refId: 'max',
            editorMode: QueryEditorMode.Code,
            expr: `sum(boluo_server_db_pool_connections_max{app="${APP}"})`,
            legendFormat: 'max',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'max' },
            properties: [
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineWidth', value: 2 },
              { id: 'custom.stacking', value: { group: 'B', mode: StackingMode.None } },
            ],
          },
        ],
      }),
    )
    .element(
      panels.spacePayloadCacheReads,
      timeSeriesPanel({
        id: 35,
        title: 'Space payload cache activity (30m)',
        description: 'Zero reads means the cache is idle, not that telemetry is missing.',
        datasourceUid,
        unit: 'ops',
        min: 0,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'reads',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(result) (increase(boluo_server_space_payload_cache_read_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}]))`,
            legendFormat: '{{result}} reads',
          },
          {
            refId: 'storage-errors',
            editorMode: QueryEditorMode.Code,
            expr: `sum(increase(boluo_server_space_payload_cache_storage_errors_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}]))`,
            legendFormat: 'storage errors',
          },
          {
            refId: 'hit-ratio',
            editorMode: QueryEditorMode.Code,
            expr: `sum(increase(boluo_server_space_payload_cache_read_total{app="${APP}",result=~"memory|disk"}[${CACHE_RATIO_INTERVAL}])) / clamp_min(sum(increase(boluo_server_space_payload_cache_read_total{app="${APP}"}[${CACHE_RATIO_INTERVAL}])), 1)`,
            legendFormat: 'hit ratio',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'reads' },
            properties: [
              { id: 'custom.fillOpacity', value: 20 },
              { id: 'custom.stacking', value: { group: 'reads', mode: StackingMode.Normal } },
            ],
          },
          {
            matcher: { id: 'byFrameRefID', options: 'storage-errors' },
            properties: [
              { id: 'color', value: { fixedColor: 'red', mode: 'fixed' } },
              { id: 'custom.drawStyle', value: GraphDrawStyle.Bars },
              { id: 'custom.fillOpacity', value: 50 },
              { id: 'custom.lineWidth', value: 0 },
            ],
          },
          {
            matcher: { id: 'byFrameRefID', options: 'hit-ratio' },
            properties: [
              { id: 'unit', value: 'percentunit' },
              { id: 'min', value: 0 },
              { id: 'max', value: 1 },
              { id: 'custom.axisPlacement', value: 'right' },
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineWidth', value: 2 },
              { id: 'custom.stacking', value: { group: 'ratio', mode: StackingMode.None } },
            ],
          },
        ],
      }),
    )
    .element(
      panels.messages,
      timeSeriesPanel({
        id: 9,
        title: 'Message operation rate',
        description: 'Includes transient preview and preview-diff updates.',
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
        title: 'Application operation latency',
        datasourceUid,
        unit: 'ms',
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
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
          {
            refId: 'encode-p95',
            editorMode: QueryEditorMode.Code,
            expr: `topk(3, ${summaryQuantile(0.95, 'boluo_server_events_encode_duration_ms')})`,
            legendFormat: '{{update}} encode p95',
          },
          {
            refId: 'mailbox-update-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_events_update_duration_ms'),
            legendFormat: '{{instance}} mailbox update p95',
          },
          {
            refId: 'position-action-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_pos_action_duration_ms'),
            legendFormat: '{{instance}} position action p95',
          },
          {
            refId: 'replay-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_events_push_initial_updates_duration_ms'),
            legendFormat: '{{instance}} initial replay p95',
          },
        ],
      }),
    )
    .element(
      panels.serializedPayloadSizes,
      timeSeriesPanel({
        id: 37,
        title: 'Serialized payload sizes',
        datasourceUid,
        unit: 'bytes',
        min: 0,
        legendCalcs: ['lastNotNull', 'max'],
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'update-p95',
            editorMode: QueryEditorMode.Code,
            expr: `topk(4, ${summaryQuantile(0.95, 'boluo_server_events_encoded_bytes')})`,
            legendFormat: '{{update}} update p95',
          },
          {
            refId: 'replay-p95',
            editorMode: QueryEditorMode.Code,
            expr: summaryQuantile(0.95, 'boluo_server_events_push_initial_updates_payload_bytes'),
            legendFormat: '{{instance}} replay p95',
          },
          {
            refId: 'response-p95',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.95, 'boluo_server_http_response_body_bytes'),
            legendFormat: 'HTTP response p95',
          },
          {
            refId: 'replay-in-flight',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_events_initial_updates_in_flight_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} replay in flight',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'replay-in-flight' },
            properties: [{ id: 'custom.lineInterpolation', value: LineInterpolation.StepAfter }],
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
        legendCalcs: ['lastNotNull', 'max'],
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
          'The WebSocket pending-updates series is a rolling p95; the other series are current values.',
        datasourceUid,
        unit: 'short',
        min: 0,
        legendCalcs: ['lastNotNull', 'max'],
        lineInterpolation: LineInterpolation.StepAfter,
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
        datasourceUid,
        drawStyle: GraphDrawStyle.Bars,
        fillOpacity: 50,
        stacking: StackingMode.Normal,
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
          {
            refId: 'log-output-dropped',
            editorMode: QueryEditorMode.Code,
            expr: summedRateOrZero('boluo_server_log_output_dropped_total'),
            legendFormat: 'log output dropped/s',
          },
        ],
      }),
    )
    .element(
      panels.runtimePopulation,
      timeSeriesPanel({
        id: 27,
        title: 'Runtime population',
        datasourceUid,
        unit: 'short',
        legendCalcs: ['lastNotNull', 'max'],
        lineInterpolation: LineInterpolation.StepAfter,
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
            refId: 'position-state-entries',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_pos_state_entries{app="${APP}"}`,
            legendFormat: '{{instance}} position state entries',
          },
          {
            refId: 'token-store',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_events_token_store_entries{app="${APP}"}`,
            legendFormat: '{{instance}} token store',
          },
          {
            refId: 'space-payload-cache-entries',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_payload_cache_memory_entries{app="${APP}"}`,
            legendFormat: '{{instance}} payload cache entries',
          },
          {
            refId: 'tokio-live-tasks',
            editorMode: QueryEditorMode.Code,
            expr: `tokio_live_tasks_count{app="${APP}"}`,
            legendFormat: '{{instance}} Tokio live tasks',
          },
          {
            refId: 'process-threads',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_threads{app="${APP}"}`,
            legendFormat: '{{instance}} process threads',
          },
        ],
      }),
    )
    .element(
      panels.processMemory,
      timeSeriesPanel({
        id: 29,
        title: 'Process and cache memory',
        description: 'mimalloc committed is address space, not RSS, and uses the right axis.',
        datasourceUid,
        unit: 'bytes',
        min: 0,
        legendCalcs: ['lastNotNull', 'max'],
        tooltipMode: TooltipDisplayMode.Multi,
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
            refId: 'swap',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_process_swap_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} process swap',
          },
          {
            refId: 'allocator-committed',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_allocator_committed_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} mimalloc committed',
          },
          {
            refId: 'space-payload-cache',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_payload_cache_memory_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} Space payload cache',
          },
          {
            refId: 'mailbox-cache',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_disk_cache_memory_bytes{app="${APP}"}`,
            legendFormat: '{{instance}} mailbox cache',
          },
        ],
        overrides: [
          {
            matcher: { id: 'byFrameRefID', options: 'allocator-committed' },
            properties: [
              { id: 'custom.axisPlacement', value: 'right' },
              { id: 'custom.axisLabel', value: 'mimalloc committed' },
            ],
          },
        ],
      }),
    )
    .element(
      panels.snapshotPopulation,
      timeSeriesPanel({
        id: 31,
        title: 'Loaded snapshot contents',
        datasourceUid,
        unit: 'short',
        min: 0,
        legendCalcs: ['lastNotNull', 'max'],
        lineInterpolation: LineInterpolation.StepAfter,
        tooltipMode: TooltipDisplayMode.Multi,
        targets: [
          {
            refId: 'snapshot-items',
            editorMode: QueryEditorMode.Code,
            expr: `boluo_server_space_runtime_snapshot_items{app="${APP}"}`,
            legendFormat: '{{instance}} {{kind}}',
          },
        ],
      }),
    )
    .element(
      panels.diskCacheLatency,
      timeSeriesPanel({
        id: 22,
        title: 'Disk cache latency',
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
    .element(
      panels.applicationLogs,
      logsPanel({
        id: 30,
        title: 'Application logs',
        datasourceUid: logsDatasourceUid,
        expr: `{app="${APP}"} -level:="info" -level:="debug" -event:="maintenance.token_rotated" -event:="frontend.log" -event:="frontend.exception"`,
      }),
    )
    .element(
      panels.frontendLogs,
      logsPanel({
        id: 38,
        title: 'Frontend logs',
        datasourceUid: logsDatasourceUid,
        expr: `{app="${APP}"} (event:="frontend.log" OR event:="frontend.exception") -frontend_exception_origin:="external_or_unknown"`,
      }),
    )
    .layout(
      new RowsBuilder().rows([
        new RowBuilder()
          .title('Logs')
          .collapse(false)
          .layout(
            new GridBuilder().items([
              gridItem(panels.applicationLogs).x(0).y(0).width(24).height(16),
              gridItem(panels.frontendLogs).x(0).y(16).width(24).height(16),
            ]),
          ),
        new RowBuilder()
          .title('Overview')
          .collapse(false)
          .layout(
            new GridBuilder().items([
              gridItem(panels.httpTraffic).x(0).y(0).width(8).height(6),
              gridItem(panels.httpLatency).x(8).y(0).width(8).height(6),
              gridItem(panels.networkIo).x(16).y(0).width(8).height(6),
              gridItem(panels.cpuUtilization).x(0).y(6).width(8).height(8),
              gridItem(panels.memoryUtilization).x(8).y(6).width(8).height(8),
              gridItem(panels.processMemory).x(16).y(6).width(8).height(8),
            ]),
          ),
        new RowBuilder()
          .title('Connections')
          .collapse(true)
          .layout(
            new GridBuilder().items([
              gridItem(panels.appConnections).x(0).y(0).width(12).height(8),
              gridItem(panels.websocketLifecycle).x(12).y(0).width(12).height(8),
            ]),
          ),
        new RowBuilder()
          .title('Runtime & caches')
          .collapse(true)
          .layout(
            new GridBuilder().items([
              gridItem(panels.runtimePopulation).x(0).y(0).width(12).height(8),
              gridItem(panels.snapshotPopulation).x(12).y(0).width(12).height(8),
              gridItem(panels.queueDepths).x(0).y(8).width(12).height(8),
              gridItem(panels.eventDelivery).x(12).y(8).width(12).height(8),
              gridItem(panels.cacheHitRatio).x(0).y(16).width(12).height(8),
              gridItem(panels.cacheCapacity).x(12).y(16).width(12).height(8),
              gridItem(panels.spacePayloadCacheReads).x(0).y(24).width(24).height(8),
            ]),
          ),
        new RowBuilder()
          .title('Messages')
          .collapse(true)
          .layout(
            new GridBuilder().items([
              gridItem(panels.messages).x(0).y(0).width(12).height(8),
              gridItem(panels.messageLatency).x(12).y(0).width(12).height(8),
              gridItem(panels.serializedPayloadSizes).x(0).y(8).width(24).height(8),
            ]),
          ),
        new RowBuilder()
          .title('Storage')
          .collapse(true)
          .layout(
            new GridBuilder().items([
              gridItem(panels.applicationPool).x(0).y(0).width(24).height(8),
              gridItem(panels.diskCacheCapacity).x(0).y(8).width(8).height(8),
              gridItem(panels.diskCacheIo).x(8).y(8).width(8).height(8),
              gridItem(panels.diskCacheLatency).x(16).y(8).width(8).height(8),
            ]),
          ),
      ]),
    )
    .links([])
    .preload(false)
    .tags(['boluo', 'production', 'managed-by-code'])
    .timeSettings(dashboardTimeSettings('now-6h'))
    .variables([]);
}
