import React from 'react';
import { Users } from 'lucide-react';
import ReportWidget from './ReportWidget';

interface MemberSummary {
  name: string;
  revenue: number;
}

interface Props {
  members: MemberSummary[];
  formatCurrency: (value: number) => string;
}

const TopMembersWidget: React.FC<Props> = ({ members, formatCurrency }) => {
  return (
    <ReportWidget title="Top Members" icon={Users}>
      {members.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">No data.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {members.map((m, idx) => (
            <li key={idx} className="flex justify-between border-b border-[var(--color-border)] pb-1 last:border-b-0">
              <span>{m.name === 'Guest' ? 'Guest (No Tier)' : m.name}</span>
              <span className="font-medium">{formatCurrency(m.revenue)}</span>
            </li>
          ))}
        </ul>
      )}
    </ReportWidget>
  );
};

export default TopMembersWidget;
