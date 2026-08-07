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
  timeSeriesPanel,
} from './lib.js';
import { SERVER_APP as APP, memoryUtilization } from './metrics.js';

export const BOLUO_DASHBOARD_RESOURCE_NAME = 'c35465c7-1203-42c4-9bcc-5b5cb012d67b';
export const DEFAULT_PROMETHEUS_DATASOURCE_UID = 'ferpuzyhrhh4wf';
export const PROMETHEUS_ENDPOINT = 'https://api.fly.io/prometheus/mythal/';

const RATE_INTERVAL = '$__rate_interval';
const CACHE_RATIO_INTERVAL = '30m';
const HTTP_STATUS_CODES = ['200', '204', '304', '400', '401', '403', '404', '429', '500', '502'];
const CACHE_NAMES = ['CharacterVariables', 'Session', 'User', 'UserExt', 'UserSpaces'];

const panels = {
  httpTraffic: 'panel-13',
  httpLatency: 'panel-14',
  cpuUtilization: 'panel-2',
  cpuBurstBudget: 'panel-18',
  memoryUtilization: 'panel-3',
  appConnections: 'panel-7',
  applicationPool: 'panel-17',
  cacheHitRatio: 'panel-15',
  cacheCapacityUtilization: 'panel-19',
  messages: 'panel-9',
  messageLatency: 'panel-16',
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
            expr: `sum by(status) (rate(fly_app_http_responses_count{app="${APP}"}[${RATE_INTERVAL}]))`,
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
            expr: histogramQuantile(0.5, 'fly_app_http_response_time_seconds'),
            legendFormat: 'p50',
          },
          {
            refId: 'p95',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.95, 'fly_app_http_response_time_seconds'),
            legendFormat: 'p95',
          },
          {
            refId: 'p99',
            editorMode: QueryEditorMode.Code,
            expr: histogramQuantile(0.99, 'fly_app_http_response_time_seconds'),
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
        seriesNames: CACHE_NAMES,
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
      panels.cpuBurstBudget,
      timeSeriesPanel({
        id: 18,
        title: 'CPU burst budget',
        description: 'Shared CPU instances only.',
        datasourceUid,
        unit: 's',
        min: 0,
        targets: [
          {
            refId: 'balance',
            editorMode: QueryEditorMode.Code,
            expr: `min_over_time(fly_instance_cpu_balance{app="${APP}"}[60s]) / count without(cpu_id, mode) (fly_instance_cpu{app="${APP}",mode="idle"}) / 100`,
            legendFormat: '{{instance}}',
          },
        ],
      }),
    )
    .element(
      panels.memoryUtilization,
      timeSeriesPanel({
        id: 3,
        title: 'Memory utilization',
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
        title: 'Application connections',
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
          {
            refId: 'concurrency',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance) (fly_app_concurrency{app="${APP}"})`,
            legendFormat: '{{instance}} concurrency',
          },
          {
            refId: 'fd',
            editorMode: QueryEditorMode.Code,
            expr: `sum by(instance) (boluo_server_file_descriptors_used{app="${APP}"})`,
            legendFormat: '{{instance}} fd',
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
        title: 'Application connection pool',
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
    .layout(
      new GridBuilder().items([
        gridItem(panels.httpTraffic).x(0).y(0).width(12).height(6),
        gridItem(panels.httpLatency).x(12).y(0).width(12).height(6),
        gridItem(panels.cpuUtilization).x(0).y(6).width(8).height(8),
        gridItem(panels.cpuBurstBudget).x(8).y(6).width(8).height(8),
        gridItem(panels.memoryUtilization).x(16).y(6).width(8).height(8),
        gridItem(panels.appConnections).x(0).y(14).width(12).height(8),
        gridItem(panels.applicationPool).x(12).y(14).width(12).height(8),
        gridItem(panels.cacheHitRatio).x(0).y(22).width(12).height(8),
        gridItem(panels.cacheCapacityUtilization).x(12).y(22).width(12).height(8),
        gridItem(panels.messages).x(0).y(30).width(12).height(8),
        gridItem(panels.messageLatency).x(12).y(30).width(12).height(8),
      ]),
    )
    .links([])
    .preload(false)
    .tags(['boluo', 'production', 'managed-by-code'])
    .timeSettings(dashboardTimeSettings('now-6h'))
    .variables([]);
}
