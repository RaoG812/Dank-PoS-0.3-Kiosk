import React from 'react';
import { Clock } from 'lucide-react';
import ReportWidget from './ReportWidget';
import { Transaction } from '@/types';
import { formatUtcToBangkok } from '../utils/dateHelpers';

interface Props {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
}

const RecentTransactionsWidget: React.FC<Props> = ({ transactions, formatCurrency }) => {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5);

  return (
    <ReportWidget title="Recent Transactions" icon={Clock}>
      {recent.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">No data.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {recent.map((t, idx) => (
            <li key={idx} className="flex justify-between border-b border-[var(--color-border)] pb-1 last:border-b-0">
              <span>{formatUtcToBangkok(t.transaction_date)}</span>
              <span className="font-medium">{formatCurrency(t.final_total)}</span>
            </li>
          ))}
        </ul>
      )}
    </ReportWidget>
  );
};

export default RecentTransactionsWidget;
