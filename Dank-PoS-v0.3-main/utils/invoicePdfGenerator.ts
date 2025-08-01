// utils/invoicePdfGenerator.ts
import { jsPDF } from 'jspdf';
import { Invoice } from '@/types'; // Assuming Invoice type is updated in '@/types'

// Extend the Invoice interface to include payment details and tax inclusion status
// This is a local extension for the purpose of this file, assuming the main Invoice type in '@/types' will be updated.
interface ExtendedInvoice extends Invoice {
    receiver_name?: string;
    bank_name?: string;
    account_number?: string;
    is_tax_included?: boolean; // New field to indicate if tax is included in item prices
}

export const generateInvoicePdf = (invoice: ExtendedInvoice, logoBase64?: string): string => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const rightMargin = 20;
    const VAT_RATE = 0.07; // Define VAT rate here for consistency

    // Helper function to print multi-line text with word wrapping
    const printMultiLineText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7): number => {
        const lines: string[] = doc.splitTextToSize(text, maxWidth); // Explicitly type 'lines' as string array
        lines.forEach((line: string, index: number) => { // Explicitly type 'line' as string and 'index' as number
            doc.text(line, x, y + (index * lineHeight));
        });
        return y + (lines.length * lineHeight); // Return the next Y position
    };

    // Add company logo in the upper right corner
    if (logoBase64) {
        const logoWidth = 40; // Adjust as needed
        const logoHeight = 40; // Adjust as needed
        try {
            doc.addImage(logoBase64, 'PNG', pageWidth - rightMargin - logoWidth, 15, logoWidth, logoHeight);
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
        }
    } else {
        console.warn("No logoBase64 provided. Logo will not be displayed in PDF.");
    }

    // Add invoice header
    doc.setFont('helvetica', 'normal'); // Reset font for header
    doc.setFontSize(24);
    doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });

    // Add invoice details
    doc.setFontSize(12);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Number:`, 20, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.invoice_number}`, 20 + doc.getTextWidth('Invoice Number: '), 40);

    doc.setFont('helvetica', 'bold');
    doc.text(`Date:`, 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${new Date(invoice.date).toLocaleDateString('en-GB')}`, 20 + doc.getTextWidth('Date: '), 50);


    // Define starting Y-position for company and client info
    const infoStartY = 70;
    const lineSpacing = 10; // Base line spacing for standard lines

    // Company Information (Left side)
    let currentYCompany = infoStartY;
    const companyInfoX = 20;
    const companyAddressMaxWidth = (pageWidth / 2) - companyInfoX - 10;

    doc.setFont('helvetica', 'bold');
    doc.text('From:', companyInfoX, currentYCompany);
    doc.setFont('helvetica', 'normal');
    currentYCompany += lineSpacing;
    doc.text(invoice.company_name, companyInfoX, currentYCompany);
    currentYCompany += lineSpacing;

    if (invoice.company_address) {
        currentYCompany = printMultiLineText(invoice.company_address, companyInfoX, currentYCompany, companyAddressMaxWidth);
        if (invoice.company_tax_id) currentYCompany += 3; // Small extra space before tax ID
    }

    if (invoice.company_tax_id) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Tax ID:`, companyInfoX, currentYCompany);
        doc.setFont('helvetica', 'normal');
        doc.text(`${invoice.company_tax_id}`, companyInfoX + doc.getTextWidth('Tax ID: '), currentYCompany);
        currentYCompany += lineSpacing;
    }

    // Client Information (Right side - adjusted for better spacing)
    const clientInfoX = pageWidth / 2 + 10;
    const clientAddressMaxWidth = (pageWidth / 2) - rightMargin - 10;

    let currentYClient = infoStartY;
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', clientInfoX, currentYClient);
    doc.setFont('helvetica', 'normal');
    currentYClient += lineSpacing;
    doc.text(invoice.client_name, clientInfoX, currentYClient);
    currentYClient += lineSpacing;

    if (invoice.client_address) {
        currentYClient = printMultiLineText(invoice.client_address, clientInfoX, currentYClient, clientAddressMaxWidth);
        if (invoice.client_tax_id) currentYClient += 3; // Small extra space before tax ID
    }

    if (invoice.client_tax_id) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Tax ID:`, clientInfoX, currentYClient);
        doc.setFont('helvetica', 'normal');
        doc.text(`${invoice.client_tax_id}`, clientInfoX + doc.getTextWidth('Tax ID: '), currentYClient);
        currentYClient += lineSpacing;
    }

    // Determine the starting Y position for the payment details section
    let startY = Math.max(currentYCompany, currentYClient) + 10;

    // Add a horizontal line before payment details if any payment detail is present
    if (invoice.receiver_name || invoice.bank_name || invoice.account_number) {
        doc.setDrawColor(200, 200, 200); // Light gray color for the line
        doc.line(20, startY, pageWidth - rightMargin, startY); // Draw line from left margin to right margin
        startY += lineSpacing; // Move down after the line
    }
    
    // Payment Details Section (below company/client info, before items)
    const paymentDetailsX = 20;

    // Only print "Payment Details" header if any payment detail is available
    if (invoice.receiver_name || invoice.bank_name || invoice.account_number) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details:', paymentDetailsX, startY);
        doc.setFont('helvetica', 'normal');
        startY += lineSpacing;

        if (invoice.receiver_name) {
            doc.text(`Receiver Name (Company): ${invoice.receiver_name}`, paymentDetailsX, startY);
            startY += lineSpacing;
        }
        if (invoice.bank_name) {
            doc.text(`Bank: ${invoice.bank_name}`, paymentDetailsX, startY);
            startY += lineSpacing;
        }
        if (invoice.account_number) {
            doc.text(`Account #: ${invoice.account_number}`, paymentDetailsX, startY);
            startY += lineSpacing;
        }
        startY += 10; // Add some space before the items table
    }



    // Items Table
    const headers = ['Description', 'Qty', 'Price', 'Total'];
    const columnWidths = [100, 20, 30, 30];

    // Draw headers
    let currentX = 20;
    doc.setFont('helvetica', 'bold'); // Make headers bold
    headers.forEach((header, i) => {
        doc.rect(currentX, startY, columnWidths[i], 10);
        doc.text(header, currentX + 2, startY + 7);
        currentX += columnWidths[i];
    });
    doc.setFont('helvetica', 'normal'); // Reset to normal for item rows

    // Draw items
    let currentItemY = startY + 10;
    invoice.items_json.forEach((item) => {
        currentX = 20;

        doc.rect(currentX, currentItemY, columnWidths[0], 10);
        doc.text(item.description, currentX + 2, currentItemY + 7);
        currentX += columnWidths[0];

        doc.rect(currentX, currentItemY, columnWidths[1], 10);
        doc.text(item.quantity.toString(), currentX + 2, currentItemY + 7);
        currentX += columnWidths[1];

        doc.rect(currentX, currentItemY, columnWidths[2], 10);
        doc.text(item.price_per_unit.toFixed(2), currentX + 2, currentItemY + 7);
        currentX += columnWidths[2];

        doc.rect(currentX, currentItemY, columnWidths[3], 10);
        doc.text(item.total.toFixed(2), currentX + 2, currentItemY + 7);

        currentItemY += 10;
    });

    // Add totals
    currentItemY += 10; // Move down after the items table
    const totalsX = pageWidth - rightMargin - 50;
    const totalsValueX = pageWidth - rightMargin;

    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal ${invoice.is_tax_included ? '(excl. VAT)' : ''}:`, totalsX, currentItemY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.subtotal.toFixed(2), totalsValueX, currentItemY, { align: 'right' });

    currentItemY += 10; // Use currentItemY for consistent vertical flow
    doc.setFont('helvetica', 'bold');
    doc.text(`VAT (${(VAT_RATE * 100).toFixed(0)}%):`, totalsX, currentItemY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.vat_amount.toFixed(2), totalsValueX, currentItemY, { align: 'right' });

    currentItemY += 10; // Use currentItemY for consistent vertical flow
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total ${invoice.is_tax_included ? '(incl. VAT)' : ''}:`, totalsX, currentItemY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.total_amount.toFixed(2), totalsValueX, currentItemY, { align: 'right' });

    return doc.output('datauristring');
};
