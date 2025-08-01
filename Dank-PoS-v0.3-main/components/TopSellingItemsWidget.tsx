import React from 'react';
import { History } from 'lucide-react';
import ReportWidget from './ReportWidget';

interface Item {
  name: string;
  quantity: number;
  revenue: number;
}

interface Props {
  items: Item[];
  formatCurrency: (value: number) => string;
}

const TopSellingItemsWidget: React.FC<Props> = ({ items, formatCurrency }) => {
  return (
    <ReportWidget title="Top 5 Selling Items" icon={History}>
      {items.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">No data.</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-text-secondary)]">
              <th className="px-2 py-1">Item</th>
              <th className="px-2 py-1 text-right">Qty</th>
              <th className="px-2 py-1 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-t border-[var(--color-border)]">
                <td className="px-2 py-1">{item.name}</td>
                <td className="px-2 py-1 text-right">{item.quantity}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportWidget>
  );
};

export default TopSellingItemsWidget;
