// components/MemberPurchaseTracker.tsx
// This component displays a list of members sorted by total purchases.

import React from 'react';
import { Member } from '@/types'; // Assuming Member interface is correctly defined here

interface MemberPurchaseTrackerProps {
    members: Member[];
    formatCurrency: (value: number) => string;
}

const MemberPurchaseTracker: React.FC<MemberPurchaseTrackerProps> = ({ members, formatCurrency }) => {
    // Sort members by total_purchases in descending order
    // We use (member.total_purchases || 0) to ensure a fallback to 0 if total_purchases is undefined or null,
    // preventing the 'possibly undefined' type error during comparison.
    const sortedMembers = [...members].sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0));

    return (
        <div className="bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col h-full">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                Top Members by Purchase
            </h2>
            {sortedMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No members with purchase data yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tier</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Purchases</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {sortedMembers.map(member => (
                                <tr key={member.id} className="hover:bg-gray-700">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">{member.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300">{member.tier}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-400">
                                        {formatCurrency(member.total_purchases || 0)} {/* Also render with fallback */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MemberPurchaseTracker;
