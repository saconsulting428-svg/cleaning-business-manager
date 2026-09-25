import { Bar, BarChart as RBarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional per-bar colour (e.g. status colours). */
  color?: string;
  /** Optional secondary line shown in the tooltip. */
  detail?: string;
}

const AXIS = { fontSize: 12, fill: '#64748b' };
export const CHART_PRIMARY = '#1d8194';

function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: Array<{ payload: BarDatum }>;
  format: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="font-medium text-slate-500">{d.label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{format(d.value)}</p>
      {d.detail && <p className="mt-0.5 text-slate-500">{d.detail}</p>}
    </div>
  );
}

/** Vertical column chart for a single series over categories or time. */
export function ColumnChart({
  data,
  format,
  axisFormat,
  height = 280,
  color = CHART_PRIMARY,
  showLabels = false,
  labelFormat,
}: {
  data: BarDatum[];
  format: (n: number) => string;
  axisFormat?: (n: number) => string;
  /** Formatter for the value labels above bars (defaults to `format`). */
  labelFormat?: (n: number) => string;
  height?: number;
  color?: string;
  showLabels?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: showLabels ? 22 : 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="0" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval="preserveStartEnd" />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={axisFormat ?? format}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: 'rgba(29,129,148,0.06)' }} content={<ChartTooltip format={format} />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} fill={color} animationDuration={600}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color ?? color} />
            ))}
            {showLabels && <LabelList dataKey="value" position="top" formatter={(v: unknown) => (labelFormat ?? format)(Number(v))} style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar chart — good for ranking categories with long names. */
export function HorizontalBarChart({
  data,
  format,
  color = CHART_PRIMARY,
}: {
  data: BarDatum[];
  format: (n: number) => string;
  color?: string;
}) {
  const height = Math.max(160, data.length * 44 + 20);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} layout="vertical" margin={{ top: 4, right: 72, left: 0, bottom: 4 }} barCategoryGap="26%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={128} />
          <Tooltip cursor={{ fill: 'rgba(29,129,148,0.06)' }} content={<ChartTooltip format={format} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} maxBarSize={26} animationDuration={600}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color ?? color} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => format(Number(v))} style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Job status colours — also shown with text labels so colour is never the only cue. */
export const STATUS_CHART_COLORS: Record<string, string> = {
  Scheduled: '#0ea5e9',
  'In Progress': '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#94a3b8',
};
