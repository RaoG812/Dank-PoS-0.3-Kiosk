import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { FileText, Eye, Download, Trash2, Search, ChevronUp, ChevronDown, XCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  client_name: string;
  total_amount: number;
}

interface InvoicesTableProps {
  invoices: Invoice[];
  onViewInvoice: (id: string) => void;
  onDeleteInvoice: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  onViewInvoice,
  onDeleteInvoice,
  formatCurrency,
}) => {
  // State variables for sorting, searching, and pagination
  const [invoicesSearchTerm, setInvoicesSearchTerm] = useState('');
  const [sortColumnInvoices, setSortColumnInvoices] = useState<'invoice_number' | 'date' | 'client_name' | 'total_amount' | null>(null);
  const [sortDirectionInvoices, setSortDirectionInvoices] = useState<'asc' | 'desc'>('asc');
  const [currentPageInvoices, setCurrentPageInvoices] = useState(1);
  const [itemsPerPageInvoices, setItemsPerPageInvoices] = useState(10);

  const handleSortInvoices = useCallback((column: 'invoice_number' | 'date' | 'client_name' | 'total_amount') => {
    setSortDirectionInvoices(prevDirection =>
      sortColumnInvoices === column ? (prevDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    );
    setSortColumnInvoices(column);
    setCurrentPageInvoices(1); // Reset to first page on sort change
  }, [sortColumnInvoices]);

  const filteredAndSortedInvoices = useMemo(() => {
    let filteredItems = invoices.filter(invoice => {
      const searchLower = invoicesSearchTerm.toLowerCase();
      return (
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        invoice.client_name.toLowerCase().includes(searchLower)
      );
    });

    if (sortColumnInvoices) {
      filteredItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumnInvoices) {
          case 'invoice_number':
            aValue = a.invoice_number;
            bValue = b.invoice_number;
            break;
          case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
          case 'client_name':
            aValue = a.client_name.toLowerCase();
            bValue = b.client_name.toLowerCase();
            break;
          case 'total_amount':
            aValue = a.total_amount;
            bValue = b.total_amount;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirectionInvoices === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return sortDirectionInvoices === 'asc' ? aValue - bValue : bValue - aValue;
        }
      });
    }

    return filteredItems;
  }, [invoices, invoicesSearchTerm, sortColumnInvoices, sortDirectionInvoices]);

  const indexOfLastInvoice = currentPageInvoices * itemsPerPageInvoices;
  const indexOfFirstInvoice = indexOfLastInvoice - itemsPerPageInvoices;
  const currentInvoices = filteredAndSortedInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPagesInvoices = Math.ceil(filteredAndSortedInvoices.length / itemsPerPageInvoices);
  const paginateInvoices = (pageNumber: number) => setCurrentPageInvoices(pageNumber);

  return (
    <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
     {/* Search Input with Clear Button */}
<div className="flex flex-wrap gap-4 mb-4 items-center">
    <div className="relative flex-grow max-w-xs md:max-w-64"> {/* Added relative and flex-grow for positioning */}
        <input
            type="text"
            placeholder="Search invoices..."
            value={invoicesSearchTerm}
            onChange={(e) => setInvoicesSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all duration-150 ease-in-out"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] w-5 h-5" />
        {invoicesSearchTerm && ( // Conditionally render clear button
            <button
                type="button"
                onClick={() => setInvoicesSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                aria-label="Clear Search"
            >
                <XCircle className="w-5 h-5" />
            </button>
        )}
    </div>
</div>


      {filteredAndSortedInvoices.length === 0 && !invoicesSearchTerm ? (
        <p className="text-center text-[var(--color-text-secondary)] py-10">No invoices currently.</p>
      ) : filteredAndSortedInvoices.length === 0 && invoicesSearchTerm ? (
        <p className="text-center text-[var(--color-text-secondary)] py-10">No invoices found matching your search.</p>
      ) : (
        <>
          <div className="overflow-x-auto mt-4 flex-grow">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    onClick={() => handleSortInvoices('invoice_number')}
                  >
                    <div className="flex items-center">
                      Invoice Number
                      {sortColumnInvoices === 'invoice_number' && (
                        sortDirectionInvoices === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    onClick={() => handleSortInvoices('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sortColumnInvoices === 'date' && (
                        sortDirectionInvoices === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    onClick={() => handleSortInvoices('client_name')}
                  >
                    <div className="flex items-center">
                      Client Name
                      {sortColumnInvoices === 'client_name' && (
                        sortDirectionInvoices === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    onClick={() => handleSortInvoices('total_amount')}
                  >
                    <div className="flex items-center">
                      Total Amount
                      {sortColumnInvoices === 'total_amount' && (
                        sortDirectionInvoices === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-bg-tertiary)] divide-y divide-gray-700">
                {currentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                      {format(new Date(invoice.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{invoice.client_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-primary)]">{formatCurrency(invoice.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onViewInvoice(invoice.id)}
                          className="text-blue-500 hover:text-[var(--color-info)] transition duration-150 ease-in-out"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onDeleteInvoice(invoice.id)}
                          className="text-red-500 hover:text-[var(--color-danger)] transition duration-150 ease-in-out"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPageInvoices" className="text-[var(--color-text-primary)] text-sm">Items per page:</label>
              <select
                id="itemsPerPageInvoices"
                value={itemsPerPageInvoices}
                onChange={(e) => {
                  setItemsPerPageInvoices(Number(e.target.value));
                  setCurrentPageInvoices(1);
                }}
                className="px-2 py-1 rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <nav className="flex items-center space-x-2" aria-label="Pagination">
              <button
                onClick={() => paginateInvoices(currentPageInvoices - 1)}
                disabled={currentPageInvoices === 1}
                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-[var(--color-text-primary)] text-sm px-3 py-1">
                Page {currentPageInvoices} of {totalPagesInvoices}
              </span>
              <button
                onClick={() => paginateInvoices(currentPageInvoices + 1)}
                disabled={currentPageInvoices === totalPagesInvoices}
                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};
