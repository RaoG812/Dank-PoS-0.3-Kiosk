// InvoicesTab (1).tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Loader } from 'lucide-react';
import { InvoicesTable } from './InvoicesTable';
import { InvoiceForm, InvoiceFormData } from './InvoiceForm';
import { generateInvoiceNumber } from '@/utils/invoiceHelpers';
import { generateInvoicePdf } from '@/utils/invoicePdfGenerator';
import { uploadInvoicePdf, getInvoicePdfUrl } from '@/utils/supabaseStorage';
import { Invoice, InventoryItem, Order, AdminUser } from '@/types';
import { Member } from '@/types';
import { getClientSupabaseClient } from '@/lib/supabase/client';
import { CompanySettings, CompanySettingsFormData } from '@/types';



interface AppOrder extends Order {
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    category: string;
    selectedOptionId: string;
  }>;
}

interface InvoicesTabProps {
  formatCurrency: (amount: number) => string;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  refreshData: () => Promise<void>;
  inventoryItems: InventoryItem[];
  members: Member[];
  reserveStockForOrder: (items: { itemId: string; quantity: number }[], inventory: InventoryItem[]) => Promise<{ success: boolean; message?: string }>;
  releaseStockFromOrder: (items: { itemId: string; quantity: number }[], inventory: InventoryItem[]) => Promise<{ success: boolean; message?: string }>;
  user: AdminUser | null;
  showCustomAlert: (title: string, message: string) => void;
  isLoggedIn: boolean;
    companySettings: CompanySettingsFormData | null;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
  formatCurrency,
  invoices,
  setInvoices,
  refreshData,
  inventoryItems,
  members,
  reserveStockForOrder,
  releaseStockFromOrder,
  user,
  showCustomAlert,
    companySettings,
  isLoggedIn,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/logo.png');
        if (!response.ok) {
          throw new Error('Failed to load logo.png');
        }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('Error loading logo for PDF:', err);
      }
    };
    loadLogo();
  }, []);

  const fetchInvoices = useCallback(async () => {
    if (!isLoggedIn || !user) { // Ensure user is also logged in
      setInvoices([]); // Clear invoices when not logged in
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
        const supabase = getClientSupabaseClient();

      // CRITICAL FIX: Filter invoices by the user's shop_id
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('shop_id', user.shop_id) // Filter by shop_id
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching invoices');
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user, setInvoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreateInvoice = async (formData: InvoiceFormData, createOrder: boolean, memberUid: string | null) => {
    try {
      setIsLoading(true);
      setError(null);

      const invoiceNumber = generateInvoiceNumber();


      const VAT_RATE = 0.07;
      let calculatedSubtotal = 0;
      let calculatedVatAmount = 0;
      let calculatedTotalAmount = 0;

      const itemsTotalSum = formData.items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);

      if (formData.isTaxIncluded) {
          calculatedTotalAmount = itemsTotalSum;
          calculatedSubtotal = itemsTotalSum / (1 + VAT_RATE);
          calculatedVatAmount = itemsTotalSum - calculatedSubtotal;
      } else {
          calculatedSubtotal = itemsTotalSum;
          calculatedVatAmount = calculatedSubtotal * VAT_RATE;
          calculatedTotalAmount = calculatedSubtotal + calculatedVatAmount;
      }

      const invoiceData: Invoice = {
        id: crypto.randomUUID(),
        invoice_number: invoiceNumber,
        date: new Date().toISOString(),
        company_name: formData.companyName,
        company_address: formData.companyAddress,
        company_tax_id: formData.companyTaxId,
        client_name: formData.clientName,
        client_address: formData.clientAddress,
        client_tax_id: formData.clientTaxId,
        items_json: formData.items.map(item => {
          return {
            description: item.description,
            price_per_unit: item.pricePerUnit,
            quantity: item.quantity,
            total: item.pricePerUnit * item.quantity
          };
        }),
        subtotal: calculatedSubtotal,
        vat_rate: VAT_RATE,
        vat_amount: calculatedVatAmount,
        total_amount: calculatedTotalAmount,
        pdf_url: '',
        receiver_name: formData.receiverName,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        is_tax_included: formData.isTaxIncluded,
        shop_id: user?.shop_id || undefined, // Include shop_id from the user object, can be undefined
      };

      const pdfDataUrl = generateInvoicePdf(invoiceData, logoBase64);
      const fileName = await uploadInvoicePdf(pdfDataUrl, invoiceData.invoice_number);
      const pdfUrl = await getInvoicePdfUrl(fileName);
      invoiceData.pdf_url = pdfUrl;

      const invoiceResponse = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!invoiceResponse.ok) {
        throw new Error('Failed to create invoice');
      }

      const newInvoice = await invoiceResponse.json();
      setInvoices(prev => [newInvoice, ...prev]);
      setIsFormOpen(false);
      showCustomAlert('Success', 'Invoice created successfully!');

      if (formData.sendEmail) {
        try {
          const emailResponse = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail: formData.recipientEmail,
              subject: `Invoice #${invoiceNumber} from ${formData.companyName}`,
              message: formData.emailMessage,
              pdfUrl: pdfUrl,
              invoiceNumber: invoiceNumber,
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            throw new Error(`Failed to send email: ${errorData.error || emailResponse.statusText}`);
          }
          showCustomAlert('Email Sent', 'Invoice created and email sent successfully!');
        } catch (emailError: any) {
          console.error('Error sending invoice email:', emailError);
          showCustomAlert('Email Failed', `Invoice created, but failed to send email: ${emailError.message}.`);
        }
      }


      if (createOrder && memberUid) {
        const orderItemsForStock = formData.items
          .filter((item) => item.inventoryId !== undefined)
          .map((item) => ({
            itemId: item.inventoryId as string, // Cast to string since we have filtered out undefined
            quantity: item.quantity,
          }));

        for (const orderItem of orderItemsForStock) {
            const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.itemId);
            if (!inventoryItem || (inventoryItem.available_stock ?? 0) < orderItem.quantity) {
              showCustomAlert('Stock Error', `Not enough available stock for ${inventoryItem?.name || 'an item'}. Only ${(inventoryItem?.available_stock ?? 0)}, Requested: ${orderItem.quantity}. Order will not be created.`);
              return;
            }
        }

        const reservationResult = await reserveStockForOrder(orderItemsForStock, inventoryItems);

        if (!reservationResult.success) {
          showCustomAlert('Order Creation Failed', `Invoice created, but failed to create order: ${reservationResult.message}. Please check stock manually.`);
          console.error('Order stock reservation failed:', reservationResult.message);
          return;
        }

        const orderTotal = invoiceData.total_amount;

        // Build the items array for the order from the filtered list
        const orderItems = orderItemsForStock.map(orderItem => {
          const originalInvoiceItem = formData.items.find(invItem => invItem.inventoryId === orderItem.itemId);
          const inventoryItem = inventoryItems.find(i => i.id === orderItem.itemId);
          const selectedOption = inventoryItem?.pricing_options.find(o => o.id === originalInvoiceItem?.selectedOptionId);
          return {
            itemId: orderItem.itemId,
            name: inventoryItem?.name || originalInvoiceItem?.description || 'Unknown Item',
            quantity: orderItem.quantity,
            price: originalInvoiceItem?.pricePerUnit || 0,
            unit: originalInvoiceItem?.unit || 'unit',
            category: inventoryItem?.category || 'Other',
            selectedOptionId: originalInvoiceItem?.selectedOptionId as string || 'default',
          };
        });

        const orderToSave: AppOrder = {
          id: crypto.randomUUID(),
          member_uid: memberUid,
          dealer_id: user?.id || null,
          items_json: orderItems,
          items: orderItems,
          total_price: parseFloat(orderTotal.toFixed(2)),
          status: 'pending',
          order_date: new Date().toISOString(),
          comment: `Invoice #${invoiceNumber}`,
        };

        try {
          const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...orderToSave, items_json: JSON.stringify(orderToSave.items_json) }),
          });

          if (!orderResponse.ok) {
            const errorData = await orderResponse.json();
            throw new Error(`Failed to add order: ${errorData.error || orderResponse.statusText}`);
          }
          showCustomAlert("Success", "Invoice created and associated order added successfully!");
          refreshData();
        } catch (orderError: any) {
          await releaseStockFromOrder(orderItemsForStock, inventoryItems);
          showCustomAlert('Order Failed', `Invoice created, but failed to create order: ${orderError.message}. Reserved stock has been released.`);
          console.error('Add order error:', orderError);
        }
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create invoice');
      console.error('Error creating invoice:', error);
      showCustomAlert('Error', 'Failed to create invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = async (id: string) => {
    try {
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice?.pdf_url) {
        window.open(invoice.pdf_url, '_blank');
      } else {
        throw new Error('PDF URL not found');
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      showCustomAlert('Error', 'Failed to open invoice PDF');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    // Replace window.confirm with a custom modal if needed, for now just a direct return
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }

      setInvoices(prev => prev.filter(invoice => invoice.id !== id));
      showCustomAlert('Success', 'Invoice deleted successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete invoice');
      console.error('Error deleting invoice:', error);
      showCustomAlert('Error', 'Failed to delete invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
          <FileText className="w-6 h-6 mr-2" />
          Invoices
        </h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-5 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center"
          disabled={isLoading}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Invoice
        </button>
      </div>

      {error && (
        <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-yellow-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">No invoices created yet.</p>
        </div>
      ) : (
        <InvoicesTable
          invoices={invoices}
          onViewInvoice={handleViewInvoice}
          onDeleteInvoice={handleDeleteInvoice}
          formatCurrency={formatCurrency}
        />
      )}

      {isFormOpen && (
        <InvoiceForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateInvoice}
          inventoryItems={inventoryItems}
          formatCurrency={formatCurrency}
          members={members}
          companySettings={companySettings}
        />
      )}
    </div>
  );
};
