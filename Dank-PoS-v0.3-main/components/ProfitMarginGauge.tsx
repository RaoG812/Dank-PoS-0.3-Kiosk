'use client';
import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface ProfitMarginGaugeProps {
  marginPercent: number; // 0-100
}

const ProfitMarginGauge: React.FC<ProfitMarginGaugeProps> = ({ marginPercent }) => {
  const data = [
    { name: 'margin', value: Math.min(Math.max(marginPercent, 0), 100) },
  ];
  return (
    <div className="w-full h-32 mt-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="80%"
          outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={180}
          endAngle={-180}
        >
          <RadialBar dataKey="value" fill="var(--color-accent)" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[var(--color-text-primary)]">
        {marginPercent.toFixed(1)}%
      </div>
    </div>
  );
};

export default ProfitMarginGauge;
