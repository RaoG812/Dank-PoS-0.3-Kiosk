'use client';

import React, { useState } from 'react';
import { Users, CreditCard, Grid } from 'lucide-react';
import ReportWidget from './ReportWidget';
import PieChartComponent from './PieChartComponent';

interface ReportDataItem {
  name: string;
  sales: number;
}

interface SalesOverviewPieChartWidgetProps {
  categorySales: ReportDataItem[];
  paymentMethodSales: ReportDataItem[];
  memberTierSales: ReportDataItem[];
}

// UPDATED: Highly Distinct Color Palette for Maximum Contrast
const CHART_COLORS = [
    '#FFD700', // Gold - Bright, clear yellow
    '#FF4500', // OrangeRed - Vivid, high-contrast orange
    '#212121', // Grey 900 - Very dark, almost black, strong contrast
    '#757575', // Grey 600 - Medium grey, distinct from dark and light
    '#FFBF00', // Amber - A slightly warmer, deeper yellow than Gold
    '#BF360C', // Deep Orange 900 - Rich, dark orange for strong differentiation
    '#BDBDBD', // Grey 400 - Lighter grey, visually separate
    '#FFE0B2', // Orange 100 - Very light orange (for many categories, if needed)
    '#C5E1A5', // Light Green (as an outlier for extreme distinction if many categories)
];

const SalesOverviewPieChartWidget: React.FC<SalesOverviewPieChartWidgetProps> = ({
  categorySales,
  paymentMethodSales,
  memberTierSales,
}) => {
  const [activeCriteria, setActiveCriteria] = useState<'category' | 'payment' | 'tier'>('category');

  const getChartData = () => {
    switch (activeCriteria) {
      case 'category':
        return categorySales.map(item => ({ name: item.name, value: item.sales }));
      case 'payment':
        return paymentMethodSales.map(item => ({ name: item.name, value: item.sales }));
      case 'tier':
        return memberTierSales.map(item => ({ name: item.name, value: item.sales }));
      default:
        return [];
    }
  };

  const getIcon = () => {
    switch (activeCriteria) {
      case 'category': return Grid;
      case 'payment': return CreditCard;
      case 'tier': return Users;
      default: return Grid;
    }
  };

  const getTitle = () => {
    switch (activeCriteria) {
      case 'category': return "Sales by Category";
      case 'payment': return "Sales by Payment Method";
      case 'tier': return "Sales by Member Tier";
      default: return "Sales Overview";
    }
  };

  return (
    <ReportWidget title={getTitle()} icon={getIcon()}>
      <div className="flex justify-around mb-4 space-x-2">
        <button
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            activeCriteria === 'category'
              ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
          }`}
          onClick={() => setActiveCriteria('category')}
        >
          <Grid className="inline-block w-4 h-4 mr-1"/> Categories
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            activeCriteria === 'payment'
              ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
          }`}
          onClick={() => setActiveCriteria('payment')}
        >
          <CreditCard className="inline-block w-4 h-4 mr-1"/> Payment
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            activeCriteria === 'tier'
              ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
          }`}
          onClick={() => setActiveCriteria('tier')}
        >
          <Users className="inline-block w-4 h-4 mr-1"/> Member Tiers
        </button>
      </div>
      {/* UPDATED height to significantly reduce excess space above the chart */}
      <div className="h-[280px]"> {/* Changed from h-[320px] to h-[280px] */}
        <PieChartComponent data={getChartData()} colors={CHART_COLORS} />
      </div>
    </ReportWidget>
  );
};

export default SalesOverviewPieChartWidget;
