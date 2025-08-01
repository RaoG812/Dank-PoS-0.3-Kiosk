// types/index.ts
// This file defines the TypeScript interfaces for your data models.
// Make sure this file is present at `your-project-root/types/index.ts`

export interface PricingOption {
    id: string; // Unique ID for each pricing option within an item
    name: string; // e.g., "Per Gram", "Per Piece", "Half Ounce"
    price: number; // The price for this specific option
    unit: string; // e.g., "g", "piece", "oz"
}
// Assuming this is defined somewhere accessible, e.g., in '@/types'
export interface MenuLayout {
    id: string;
    name: string;
    categories: string[]; // Array of category names in the desired order
}

export interface CompanySettings {
  id: string; // Assuming a unique ID for the settings row, e.g., 'company_info' or '1'
  company_name: string;
  company_address: string;
  company_tax_id: string;
  receiver_name: string; // This is 'Samui Cannabis Club' in your default
  bank_name: string;
  account_number: string;
        shop_id: string;
}

// Optional: for the form state if you want to differentiate
export interface CompanySettingsFormData {
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  receiverName: string;
  bankName: string;
  accountNumber: string;
}

export interface MembershipTier {
  name: string;
  rate: number; // Stored as decimal (e.g., 0.1 for 10%)
}

export interface AppSettings {
  id: string;
  tax_rate: number;
  membership_discount_rates: MembershipTier[];
  shop_id?: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    date: string;
    company_name: string;
    company_address?: string;
    company_tax_id?: string;
    client_name: string;
    client_address?: string;
    client_tax_id?: string;
    items_json: Array<{
        description: string;
        price_per_unit: number;
        quantity: number;
        total: number;
    }>;
    subtotal: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;
    transaction_id?: string;
    created_at?: string;
    created_by?: string;
    pdf_url: string;
    receiver_name?: string;
    bank_name?: string;
    account_number?: string;
    shop_id?: string;
    is_tax_included?: boolean; // New field to indicate if tax is included in item prices

}



export interface InventoryItem {
    id: string;
    barcode_id?: string;
    name: string;
    pricing_options: PricingOption[]; // Array of detailed pricing options
    description: string;
    category: string;
    available_stock: number;
    reserved_stock: number| null;
    created_at?: string;
    cost_price?: number;

}

export interface Transaction {
    id: string;
    transaction_date: string;
    items_json: Array<{
        itemId: string;
        name?: string;
        quantity: number;
        price: number;
        unit?: string;
        category?: string;
        selectedOptionId: string;
        itemCost?: number;
      }>;
    items?: Array<{
        id: string;
        name: string;
        price: number;
        unit: string;
        category: string;
        quantity: number;
        subtotal: number;
        selectedOptionId: string;
        itemCost: number;
      }>;
    subtotal: number;
    dealer_id: string | null;
    discount_rate: number;
    discount_amount: number;
    tax_amount: number;
    final_total: number;
    member_uid: string | null;
    payment_method: string; // Explicitly added payment_method
    created_at?: string;
    cost_price?: number;
    comment?: string;
}

export interface Member {
    id: string;
    uid: string;
    card_number: number;
    name: string;
    tier: string; // Tier name is now dynamic
    phone?: string;
    email?: string;
    status: 'Active' | 'Inactive' | 'Suspended';
    total_purchases?: number;
    created_at?: string;
    prescription_url?: string;
    prescription_path?: string;
}

export interface AdminUser {
    id: string;
    uid?: string; // NFC card UID for login
    username?: string; // Manual login username
    password_hash?: string; // In production, this should be password_hash
    password?: string;
    role: 'admin' | 'staff';
    created_at?: string;
    shop_id?: string;
    supabase_url?: string;
    supabase_anon_key?: string;
    shop_name?: string; // Also include shop_name if you're returning it from login
}

export interface QuantityPickerProps {
  value: number;
  onChange: (value: number) => void;
}
export interface Order {
    id: string;
    member_uid: string;
    dealer_id: string | null;
    items_json: Array<{
        itemId: string;
        name: string;
        quantity: number;
        price: number;
        unit: string;
        category: string;
        selectedOptionId: string;
    }>;
    total_price: number;
    comment?: string | null; // Changed to allow string, null, or undefined
    status: 'pending' | 'fulfilled' | 'cancelled';
    created_at?: string;
    order_date?: string;
}


export type DataType = 'inventory' | 'transactions' | 'members' | 'orders';

export type ExportedData<T> = T[];
export type ImportedData<T> = T[];

// New interface for Menu Layouts
export interface MenuLayout {
    id: string;
    name: string;
    categories: string[]; // Array of category names included in this layout
}

// NEW: Interface for Shop
export interface Shop {
    id: string;
    name: string;
    address?: string;
    contact_info?: string;
    created_at?: string;
}
