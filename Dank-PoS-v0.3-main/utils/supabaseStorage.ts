import { getClientSupabaseClient } from '@/lib/supabase/client'; // <--- UPDATED IMPORT

export const uploadInvoicePdf = async (pdfData: string, invoiceNumber: string) => {
    const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE: Get client-side client
    const base64Data = pdfData.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `invoices/${invoiceNumber}.pdf`;

    const { data, error } = await supabase
        .storage
        .from('invoices')
        .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (error) throw error;
    return fileName;
};

export const getInvoicePdfUrl = async (fileName: string) => {
    const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE
    const { data } = await supabase
        .storage
        .from('invoices')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

export const uploadPrescriptionPdf = async (pdfFile: File, memberId: string) => {
    const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE
    const fileName = `prescriptions/${memberId}.pdf`;
    const { data, error } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, pdfFile, {
            contentType: 'application/pdf',
            upsert: true
        });
    if (error) throw error;
    return data.path;
};

export const getPrescriptionPdfUrl = async (filePath: string) => {
    const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE
    const { data } = await supabase.storage
        .from('prescriptions')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

export const deletePrescriptionPdf = async (filePath: string) => {
    const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE
    const { error } = await supabase.storage
        .from('prescriptions')
        .remove([filePath]);
    if (error) throw error;
};
