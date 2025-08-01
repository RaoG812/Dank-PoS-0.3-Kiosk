// components/SparklineChart.tsx
'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface SparklineChartProps {
  data: Array<{ date: string; value: number }>; // Data should have a date and a value
  dataKey: string; // The key for the value in your data objects (e.g., 'value', 'avg', 'profit')
  lineColor: string; // The color of the line
}

const CustomSparklineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    return (
      <div className="p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-lg text-[var(--color-text-primary)] text-sm">
        <p className="font-medium">{data.date}</p>
        <p>Value: {value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

const SparklineChart: React.FC<SparklineChartProps> = ({ data, dataKey, lineColor }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-secondary)]">
        No trend data
      </div>
    );
  }

  return (
    // Fixed height for sparkline
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={2}
          dot={false} // No dots on the line
          isAnimationActive={true} // Enable animation
          animationDuration={600}
        />
        <Tooltip
          content={<CustomSparklineTooltip />}
          cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SparklineChart;
