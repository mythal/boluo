import type { Builder } from '@grafana/grafana-foundation-sdk/cog';
import {
  AnnotationQueryBuilder,
  FieldColorBuilder,
  FieldColorModeId,
  MappingType,
  PanelBuilder,
  QueryGroupBuilder,
  TargetBuilder,
  ThresholdsConfigBuilder,
  ThresholdsMode,
  TimeSettingsBuilder,
  type DataQueryKind,
  type DynamicConfigValue,
  type ValueMapping,
  type VizConfigKind,
} from '@grafana/grafana-foundation-sdk/dashboardv2';
import {
  AxisColorMode,
  AxisPlacement,
  BarAlignment,
  BigValueColorMode,
  BigValueGraphMode,
  BigValueJustifyMode,
  BigValueTextMode,
  GraphDrawStyle,
  GraphGradientMode,
  GraphThresholdsStyleConfigBuilder,
  GraphThresholdsStyleMode,
  HideSeriesConfigBuilder,
  LegendDisplayMode,
  LegendPlacement,
  LineInterpolation,
  LineStyleBuilder,
  LogsDedupStrategy,
  LogsSortOrder,
  ScaleDistribution,
  ScaleDistributionConfigBuilder,
  ReduceDataOptionsBuilder,
  SortOrder,
  StackingConfigBuilder,
  StackingMode,
  TableCellDisplayMode,
  TableCellHeight,
  TooltipDisplayMode,
  VisibilityMode,
  VizLegendOptionsBuilder,
  VizTextDisplayOptionsBuilder,
  VizTooltipOptionsBuilder,
} from '@grafana/grafana-foundation-sdk/common';
import { QueryEditorMode, QueryV2Builder } from '@grafana/grafana-foundation-sdk/prometheus';
import { VisualizationV2Builder } from '@grafana/grafana-foundation-sdk/timeseries';
import { VisualizationV2Builder as StatVisualizationBuilder } from '@grafana/grafana-foundation-sdk/stat';
import { VisualizationV2Builder as TableVisualizationBuilder } from '@grafana/grafana-foundation-sdk/table';
import { VisualizationV2Builder as LogsVisualizationBuilder } from '@grafana/grafana-foundation-sdk/logs';

export const GRAFANA_PLUGIN_VERSION = '12.4.2';

export interface PrometheusTarget {
  refId: string;
  expr: string;
  legendFormat: string;
  editorMode?: QueryEditorMode;
  hidden?: boolean;
  exemplar?: boolean;
  interval?: string;
  instant?: boolean;
  range?: boolean;
}

interface TimeSeriesPanelOptions {
  id: number;
  title: string;
  description?: string;
  datasourceUid: string;
  targets: PrometheusTarget[];
  unit?: string;
  min?: number;
  max?: number;
  fieldMinMax?: boolean;
  drawStyle?: GraphDrawStyle;
  fillOpacity?: number;
  legendCalcs?: string[];
  lineInterpolation?: LineInterpolation;
  stacking?: StackingMode;
  tooltipMode?: TooltipDisplayMode;
  tooltipSort?: SortOrder;
  seriesNames?: string[];
  scale?: ScaleDistribution;
  scaleLog?: number;
  overrides?: {
    __systemRef?: string;
    matcher: { id: string; options?: unknown };
    properties: DynamicConfigValue[];
  }[];
}

interface StatPanelOptions {
  id: number;
  title: string;
  description?: string;
  datasourceUid: string;
  targets: PrometheusTarget[];
  unit?: string;
  mappings?: ValueMapping[];
}

interface LogsPanelOptions {
  id: number;
  title: string;
  datasourceUid: string;
  expr: string;
  maxLines?: number;
}

type TimeSeriesOverride = NonNullable<TimeSeriesPanelOptions['overrides']>[number];

const LINE_STYLES = [
  { fill: 'solid' },
  { fill: 'dash', dash: [10, 6] },
  { fill: 'dot', dash: [2, 5] },
  { fill: 'dash', dash: [12, 4, 2, 4] },
  { fill: 'dot', dash: [2, 5] },
  { fill: 'solid' },
  { fill: 'dash', dash: [10, 6] },
  { fill: 'dot', dash: [2, 5] },
  { fill: 'dash', dash: [12, 4, 2, 4] },
  { fill: 'dot', dash: [2, 5] },
  { fill: 'solid' },
  { fill: 'dash', dash: [10, 6] },
] as const;

function valueBuilder<T>(value: T): Builder<T> {
  return { build: () => value };
}

function versionedVisualization(visualization: Builder<VizConfigKind>): Builder<VizConfigKind> {
  return {
    build: () => {
      const result = visualization.build();
      result.version = GRAFANA_PLUGIN_VERSION;
      return result;
    },
  };
}

function prometheusTarget(datasourceUid: string, target: PrometheusTarget): TargetBuilder {
  const query = new QueryV2Builder()
    .datasource({ name: datasourceUid })
    .editorMode(target.editorMode ?? QueryEditorMode.Builder)
    .expr(target.expr)
    .instant(target.instant ?? false)
    .legendFormat(target.legendFormat)
    .range(target.range ?? true);

  if (target.exemplar !== undefined) {
    query.exemplar(target.exemplar);
  }
  if (target.interval !== undefined) {
    query.interval(target.interval);
  }

  return new TargetBuilder()
    .query(query)
    .refId(target.refId)
    .hidden(target.hidden ?? false);
}

function seriesStyleOverrides(options: TimeSeriesPanelOptions): TimeSeriesOverride[] {
  const matchers =
    options.seriesNames?.map((name) => ({ id: 'byName', options: name })) ??
    (options.targets.length > 1
      ? options.targets.map((target) => ({ id: 'byFrameRefID', options: target.refId }))
      : []);
  if (matchers.length === 0) {
    return [];
  }
  return matchers.map((matcher, index) => {
    const lineStyle = LINE_STYLES[index % LINE_STYLES.length];
    if (lineStyle === undefined) {
      throw new Error('Missing line style.');
    }
    return {
      matcher,
      properties: [{ id: 'custom.lineStyle', value: lineStyle }],
    };
  });
}

export function timeSeriesPanel(options: TimeSeriesPanelOptions): PanelBuilder {
  const scale = new ScaleDistributionConfigBuilder().type(
    options.scale ?? ScaleDistribution.Linear,
  );
  if (options.scaleLog !== undefined) {
    scale.log(options.scaleLog);
  }

  const visualization = new VisualizationV2Builder()
    .thresholds(
      new ThresholdsConfigBuilder().mode(ThresholdsMode.Absolute).steps([
        { value: 0, color: 'green' },
        { value: 80, color: 'red' },
      ]),
    )
    .colorScheme(new FieldColorBuilder().mode(FieldColorModeId.PaletteClassic))
    .legend(
      new VizLegendOptionsBuilder()
        .calcs(options.legendCalcs ?? [])
        .displayMode(LegendDisplayMode.List)
        .placement(LegendPlacement.Bottom)
        .showLegend(true),
    )
    .tooltip(
      new VizTooltipOptionsBuilder()
        .hideZeros(false)
        .mode(options.tooltipMode ?? TooltipDisplayMode.Multi)
        .sort(options.tooltipSort ?? SortOrder.Descending),
    )
    .axisBorderShow(false)
    .axisCenteredZero(false)
    .axisColorMode(AxisColorMode.Text)
    .axisLabel('')
    .axisPlacement(AxisPlacement.Auto)
    .barAlignment(BarAlignment.Center)
    .barWidthFactor(0.6)
    .drawStyle(options.drawStyle ?? GraphDrawStyle.Line)
    .fillOpacity(options.fillOpacity ?? 0)
    .gradientMode(GraphGradientMode.None)
    .hideFrom(new HideSeriesConfigBuilder().legend(false).tooltip(false).viz(false))
    .insertNulls(false)
    .lineInterpolation(options.lineInterpolation ?? LineInterpolation.Linear)
    .lineWidth(1)
    .pointSize(5)
    .scaleDistribution(scale)
    .showPoints(VisibilityMode.Auto)
    .spanNulls(false)
    .stacking(new StackingConfigBuilder().group('A').mode(options.stacking ?? StackingMode.None))
    .thresholdsStyle(new GraphThresholdsStyleConfigBuilder().mode(GraphThresholdsStyleMode.Off));

  if (options.unit !== undefined) {
    visualization.unit(options.unit);
  }
  if (options.min !== undefined) {
    visualization.min(options.min);
  }
  if (options.max !== undefined) {
    visualization.max(options.max);
  }
  if (options.fieldMinMax !== undefined) {
    visualization.fieldMinMax(options.fieldMinMax);
  }
  if (options.fillOpacity !== undefined) {
    visualization.lineStyle(new LineStyleBuilder().fill('solid'));
  }
  const overrides = [...seriesStyleOverrides(options), ...(options.overrides ?? [])];
  if (overrides.length > 0) {
    visualization.overrides(overrides);
  }

  // The SDK does not expose Grafana's showValues option.
  const patchedVisualization = valueBuilder<VizConfigKind>(
    (() => {
      const result = visualization.build();
      const custom = result.spec.fieldConfig.defaults.custom as Record<string, unknown>;
      custom.showValues = false;
      return result;
    })(),
  );

  const panel = new PanelBuilder()
    .id(options.id)
    .title(options.title)
    .data(
      new QueryGroupBuilder().targets(
        options.targets.map((target) => prometheusTarget(options.datasourceUid, target)),
      ),
    )
    .visualization(versionedVisualization(patchedVisualization));
  if (options.description !== undefined) {
    panel.description(options.description);
  }
  return panel;
}

export function logsPanel(options: LogsPanelOptions): PanelBuilder {
  const query: DataQueryKind = {
    kind: 'DataQuery',
    group: 'victoriametrics-logs-datasource',
    version: 'v0',
    datasource: { name: options.datasourceUid },
    spec: {
      editorMode: 'code',
      expr: options.expr,
      maxLines: options.maxLines ?? 1000,
      queryType: 'instant',
    },
  };

  const visualization = new LogsVisualizationBuilder()
    .showLabels(false)
    .showCommonLabels(false)
    .showTime(true)
    .showLogContextToggle(true)
    .wrapLogMessage(true)
    .prettifyLogMessage(false)
    .enableLogDetails(true)
    .sortOrder(LogsSortOrder.Descending)
    .dedupStrategy(LogsDedupStrategy.None)
    .enableInfiniteScrolling(true)
    .showControls(true)
    .showFieldSelector(true)
    .syntaxHighlighting(true)
    .fontSize('default')
    .detailsMode('sidebar');

  return new PanelBuilder()
    .id(options.id)
    .title(options.title)
    .data(
      new QueryGroupBuilder().targets([
        new TargetBuilder().query(valueBuilder(query)).refId('logs').hidden(false),
      ]),
    )
    .visualization(versionedVisualization(visualization));
}

export function healthStatPanel(options: StatPanelOptions): PanelBuilder {
  const visualization = new StatVisualizationBuilder()
    .colorMode(BigValueColorMode.BackgroundSolid)
    .graphMode(BigValueGraphMode.None)
    .justifyMode(BigValueJustifyMode.Center)
    .textMode(BigValueTextMode.ValueAndName)
    .text(new VizTextDisplayOptionsBuilder().titleSize(14).valueSize(36))
    .wideLayout(false)
    .reduceOptions(new ReduceDataOptionsBuilder().values(false).calcs(['lastNotNull']))
    .thresholds(
      new ThresholdsConfigBuilder().mode(ThresholdsMode.Absolute).steps([
        { value: null, color: '#d81b3a' },
        { value: 1, color: '#76b900' },
      ]),
    )
    .colorScheme(new FieldColorBuilder().mode(FieldColorModeId.Thresholds))
    .mappings(
      options.mappings ?? [
        {
          type: MappingType.Value,
          options: {
            '0': { text: 'DOWN', color: '#d81b3a' },
            '1': { text: 'UP', color: '#76b900' },
          },
        },
      ],
    );

  const panel = new PanelBuilder()
    .id(options.id)
    .title(options.title)
    .data(
      new QueryGroupBuilder().targets(
        options.targets.map((target) =>
          prometheusTarget(options.datasourceUid, {
            ...target,
            instant: true,
            range: false,
          }),
        ),
      ),
    )
    .visualization(versionedVisualization(visualization));
  if (options.description !== undefined) {
    panel.description(options.description);
  }
  return panel;
}

export function statPanel(options: StatPanelOptions): PanelBuilder {
  const visualization = new StatVisualizationBuilder()
    .colorMode(BigValueColorMode.Value)
    .graphMode(BigValueGraphMode.Area)
    .justifyMode(BigValueJustifyMode.Center)
    .textMode(BigValueTextMode.ValueAndName)
    .wideLayout(false)
    .reduceOptions(new ReduceDataOptionsBuilder().values(false).calcs(['lastNotNull']));

  if (options.unit !== undefined) {
    visualization.unit(options.unit);
  }

  const panel = new PanelBuilder()
    .id(options.id)
    .title(options.title)
    .data(
      new QueryGroupBuilder().targets(
        options.targets.map((target) => prometheusTarget(options.datasourceUid, target)),
      ),
    )
    .visualization(versionedVisualization(visualization));
  if (options.description !== undefined) {
    panel.description(options.description);
  }
  return panel;
}

export function tablePanel(options: StatPanelOptions): PanelBuilder {
  const visualization = new TableVisualizationBuilder()
    .showHeader(true)
    .showTypeIcons(false)
    .cellHeight(TableCellHeight.Sm)
    .displayMode(TableCellDisplayMode.Auto)
    .filterable(true);
  if (options.unit !== undefined) {
    visualization.unit(options.unit);
  }

  const panel = new PanelBuilder()
    .id(options.id)
    .title(options.title)
    .data(
      new QueryGroupBuilder().targets(
        options.targets.map((target) =>
          prometheusTarget(options.datasourceUid, { ...target, instant: true, range: false }),
        ),
      ),
    )
    .visualization(versionedVisualization(visualization));
  if (options.description !== undefined) {
    panel.description(options.description);
  }
  return panel;
}

export function defaultAnnotations(): AnnotationQueryBuilder {
  const grafanaQuery: DataQueryKind = {
    kind: 'DataQuery',
    group: 'grafana',
    version: 'v0',
    datasource: { name: '-- Grafana --' },
    spec: {},
  };

  return new AnnotationQueryBuilder()
    .query(valueBuilder(grafanaQuery))
    .enable(true)
    .hide(true)
    .iconColor('rgba(0, 211, 255, 1)')
    .name('Annotations & Alerts')
    .builtIn(true)
    .legacyOptions({ type: 'dashboard' });
}

export function dashboardTimeSettings(from: string): TimeSettingsBuilder {
  return new TimeSettingsBuilder()
    .timezone('browser')
    .from(from)
    .to('now')
    .autoRefresh('30s')
    .autoRefreshIntervals(['15s', '30s', '1m', '5m', '15m', '30m', '1h'])
    .hideTimepicker(false)
    .fiscalYearStartMonth(0);
}

export {
  GraphDrawStyle,
  LineInterpolation,
  QueryEditorMode,
  ScaleDistribution,
  StackingMode,
  TooltipDisplayMode,
};
