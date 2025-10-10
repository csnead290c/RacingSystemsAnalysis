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

interface SpeedData {
  d_ft: number;
  t_s: number;
  v_mph: number;
}

interface SpeedChartProps {
  data: SpeedData[];
}

/**
 * Speed chart showing velocity vs distance.
 */
function SpeedChart({ data }: SpeedChartProps) {
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
          dataKey="v_mph"
          label={{ value: 'Speed (mph)', angle: -90, position: 'insideLeft' }}
          stroke="var(--color-text)"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
          }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="v_mph"
          stroke="var(--color-success)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-success)', r: 4 }}
          name="Speed (mph)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default SpeedChart;
