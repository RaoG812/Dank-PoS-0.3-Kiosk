// components/ReportWidget.tsx
import React from 'react';
import SparklineChart from './SparklineChart'; // Import the new SparklineChart component

interface ReportWidgetProps {
  title: string;
  icon: React.ElementType; // Icon component, e.g., PieChart from lucide-react
  children: React.ReactNode;
  sparklineData?: Array<{ date: string; value: number }>; // Optional data for sparkline
  sparklineDataKey?: string; // Optional dataKey for sparkline
  sparklineLineColor?: string; // Optional line color for sparkline
}

const ReportWidget: React.FC<ReportWidgetProps> = ({
  title,
  icon: Icon,
  children,
  sparklineData,
  sparklineDataKey,
  sparklineLineColor
}) => {
  return (
    <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
        <Icon className="w-5 h-5 mr-2" />
        {title}
      </h3>
      <div className="flex-grow flex flex-col justify-between"> {/* Use flex-col and justify-between */}
        <div> {/* Wrap content that stays at the top */}
            {children}
        </div>
        {sparklineData && sparklineDataKey && sparklineLineColor && (
          <div className="w-full mt-4 h-[80px]"> {/* Container for sparkline */}
            <SparklineChart
              data={sparklineData}
              dataKey={sparklineDataKey}
              lineColor={sparklineLineColor}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportWidget;
