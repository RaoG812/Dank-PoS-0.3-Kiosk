'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartDataItem {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieChartDataItem[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#FFD700', '#FFBF00', '#FDD835', '#FFEB3B', '#BDB76B', '#424242', '#616161', '#9E9E9E'
];

const formatPercentage = (percentage: number) => {
  if (isNaN(percentage) || !isFinite(percentage) || percentage === 0) {
    return '0.00%';
  }
  const percentValue = percentage;
  if (percentValue > 0 && percentValue < 0.01) {
    return '<0.01%';
  }
  return `${percentValue.toFixed(2)}%`;
};

const CustomTooltip = ({ active, payload, totalValue }: any) => {
  if (active && payload && payload.length && totalValue !== undefined) {
    const data = payload[0].payload;
    const value = payload[0].value;

    let calculatedPercentage = 0;
    if (totalValue > 0) {
      calculatedPercentage = (value / totalValue) * 100;
    }

    return (
      <div className="p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-lg">
        <p className="text-[var(--color-text-primary)] font-medium">{data.name}</p>
        <p className="text-[var(--color-text-primary)]">Sales: {value.toFixed(2)} THB</p>
        <p className="text-[var(--color-text-secondary)]">Percentage: {formatPercentage(calculatedPercentage)}</p>
      </div>
    );
  }
  return null;
};

const PieChartComponent: React.FC<PieChartProps> = ({ data, colors = DEFAULT_COLORS }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex justify-center items-center h-full text-[var(--color-text-secondary)]">
        No data available for this selection.
      </div>
    );
  }

  const totalValue = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="40%"
          cy="50%"
          labelLine={false}
          // UPDATED: Further reduce outerRadius for more space
          outerRadius={70} // Changed from 80 to 70
          stroke="var(--color-bg-secondary)"
          strokeWidth={2}
          cornerRadius={5}
          dataKey="value"
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip totalValue={totalValue} />} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{
            paddingLeft: '10px',
            color: 'var(--color-text-primary)',
          }}
          iconSize={10}
          iconType="circle"
          formatter={(value) => <span className="text-[var(--color-text-primary)]">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
