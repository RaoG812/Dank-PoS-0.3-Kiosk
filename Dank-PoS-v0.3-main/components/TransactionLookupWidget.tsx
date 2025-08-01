import React, { useState } from 'react';
import { Search } from 'lucide-react';
import ReportWidget from './ReportWidget';
import { Transaction } from '@/types';
import { formatUtcToBangkok } from '../utils/dateHelpers';

interface TransactionLookupWidgetProps {
  transactions: Transaction[];
}

const TransactionLookupWidget: React.FC<TransactionLookupWidgetProps> = ({ transactions }) => {
  const [timestamp, setTimestamp] = useState('');
  const [result, setResult] = useState<Transaction | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);

  const handleLookup = () => {
    if (!timestamp) {
      setResult(null);
      return;
    }
    const normalize = (str: string) => str.replace(/[ ,]/g, '').trim();
    const inputNorm = normalize(timestamp);
    const found = transactions.find(t =>
      normalize(formatUtcToBangkok(t.transaction_date)).startsWith(inputNorm)
    );
    setResult(found || null);
  };

  return (
    <ReportWidget title="Transaction Lookup" icon={Search}>
      <div className="space-y-2 text-sm">
        <div className="flex space-x-2">
          <input
            type="text"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            placeholder="DD/MM/YYYY HH:MM:SS"
            className="flex-1 px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
          />
          <button
            onClick={handleLookup}
            className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)]"
          >
            Lookup
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Format: DD/MM/YYYY HH:MM:SS
        </p>
        {result ? (
          <div className="space-y-1 mt-2 text-[var(--color-text-primary)]">
            <div>
              <span className="font-medium">Total:</span> {formatCurrency(result.final_total)}
            </div>
            <div>
              <span className="font-medium">Profit:</span>{' '}
              {formatCurrency(result.final_total - (result.cost_price ?? 0))}
            </div>
            <div className="font-medium">Items:</div>
            <ul className="list-disc list-inside">
              {(result.items || result.items_json).map((item: any, idx: number) => {
                const profit = (item.price - (item.itemCost ?? 0)) * item.quantity;
                const profitClass = profit >= 0 ? 'text-green-400' : 'text-red-400';
                return (
                  <li key={idx}>
                    {item.name} x {item.quantity} @ {formatCurrency(item.price)}
                    {" "}
                    <span className={profitClass}>({formatCurrency(profit)})</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          timestamp && (
            <p className="text-[var(--color-text-secondary)]">No transaction found</p>
          )
        )}
      </div>
    </ReportWidget>
  );
};

export default TransactionLookupWidget;
