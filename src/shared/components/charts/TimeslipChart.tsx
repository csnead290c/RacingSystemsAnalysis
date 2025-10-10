import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TimeslipData {
  d_ft: number;
  t_s: number;
  v_mph: number;
}

interface TimeslipChartProps {
  data: TimeslipData[];
}

/**
 * Timeslip chart showing elapsed time vs distance.
 */
function TimeslipChart({ data }: TimeslipChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="d_ft"
          label={{ value: 'Distance (ft)', position: 'insideBottom', offset: -5 }}
          stroke="var(--color-text)"
        />
        <YAxis
          dataKey="t_s"
          label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }}
          stroke="var(--color-text)"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
          }}
          formatter={(value: number) => value.toFixed(3)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="t_s"
          stroke="var(--color-accent)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-accent)', r: 4 }}
          name="Elapsed Time (s)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TimeslipChart;
