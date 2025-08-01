// app/page.tsx
// This is your main application file.
// Make sure this file is present at `your-project-root/app/page.tsx`

'use client'; // This is a Client Component

import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed, FileText,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, GripVertical, Atom, Search, MessageSquare, DollarSign, TrendingUp, TrendingDown // Icons for payment and new menu layouts
} from 'lucide-react';

import logo from '../logo.png';
// Corrected import path for the Clock component - assuming it's in app/components/Clock.tsx
import Clock from '../components/Clock';
import { InvoicesTab } from '../components/InvoicesTab/InvoicesTab';
import { debounce } from '@/utils/debounce';
import { initializeSupabaseClient, getClientSupabaseClient, getDefaultClientSupabase } from '@/lib/supabase/client';
import { useLoader } from '../contexts/LoaderContext';
import { useCustomAlert } from '../contexts/CustomAlertContext';
import ReportWidget from '../components/ReportWidget';
import CompanySettingsForm from '@/components/CompanySettingsForm';
import AdminConfirmModal from '../components/AdminConfirmModal'; // Import the new modal
import SalesOverviewPieChartWidget from '../components/SalesOverviewPieChartWidget';
import SparklineChart from '../components/SparklineChart'; // We will create this next
import TransactionLookupWidget from '../components/TransactionLookupWidget';
import TopSellingItemsWidget from '../components/TopSellingItemsWidget';
import TopMembersWidget from '../components/TopMembersWidget';
import ProfitMarginGauge from '../components/ProfitMarginGauge';
import RecentTransactionsWidget from '../components/RecentTransactionsWidget';



import { uploadPrescriptionPdf, getPrescriptionPdfUrl, deletePrescriptionPdf } from '@/utils/supabaseStorage';

// Stock Management helper
import { reserveStockForOrder, fulfillStockFromOrder, releaseStockFromOrder, updateStock } from '../components/StockManager'; // Make sure updateStock is also imported

import { formatUtcToBangkok } from '../utils/dateHelpers';
// Import Supabase client
// app/page.tsx
// This is your main application file.
// Make sure this file is present at `your-project-root/app/page.tsx`

// Assuming types are defined in '@/types'
import { InventoryItem, Transaction, Member, PricingOption, AdminUser, Order, MenuLayout, Invoice, CompanySettings, CompanySettingsFormData, MembershipTier, AppSettings } from '@/types';
import { printSticker } from '@/utils/printSticker';
import { useBarcodeScanner } from '@/utils/useBarcodeScanner';
import { fetchAppSettings, upsertAppSettings } from '@/utils/appSettings';

// Import new AI components
import CategoryIconSuggester from '../components/CategoryIconSuggester';
import SalesReportAI from '../components/SalesReportAI';
import DraggableCategoryLabel from '../components/DraggableCategoryLabel';
// Helper types for the App component's internal state structures, if different from API types
// These are not strictly necessary if type definitions are exhaustive, but can help for clarity
// or if the component uses a slightly different shape derived from the API types.

// --- Theme Context ---
type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme context
const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface AppMember extends Member {
    total_purchases: number;
}

interface AppInventoryItem extends InventoryItem {
    // InventoryItem already has pricing_options, available_stock, reserved_stock from types/index.ts
}
interface TransactionLineItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  quantity: number;
  subtotal: number;
  selectedOptionId: string;
  itemCost: number;
}
interface AppTransaction extends Transaction {
    items: Array<{
        id: string; // The ID of the item in the transaction, not necessarily inventory item ID
        name: string;
        price: number;
        unit: string;
        category: string;
        quantity: number;
        subtotal: number;
        selectedOptionId: string; // Store which pricing option was chosen
        itemCost: number;
        comment?: string;
        dealer_id?: string;
    }>;
}

interface AppOrder extends Order {
    // Orders will have a similar item structure for display
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

// New interface for Category (to be stored in Supabase)
interface Category {
    id: string;
    name: string;
    icon_name: string; // Storing the icon name as a string
}



// Map of icon names to Lucide React components
const iconMap: { [key: string]: React.ElementType } = {
    Flower: Flower,
    Syringe: Syringe,
    Cookie: Cookie,
    Cigarette: Cigarette,
    Megaphone: Megaphone,
    Leaf: Leaf,
    ShoppingBag: ShoppingBag,
    MoreHorizontal: MoreHorizontal,
    CircleDashed: CircleDashed,
    GripVertical: GripVertical, // For custom/suggested categories
};




// --- REVISED PRINTING LOGIC ---

    // New helper function to generate the receipt HTML string
    // companyName is now passed as a parameter
    // New helper function to generate the receipt HTML string
// companyName is now passed as a parameter
// New helper function to generate the receipt HTML string
// companyName is now passed as a parameter
const generateReceiptHtml = (
    transaction: AppTransaction,
    taxRate: number,
    members: Member[],
    formatCurrencyFunc: (amount: number) => string,
    formatUtcToBangkokFunc: (date: string) => string,
    membershipTiers: MembershipTier[],
    companyName: string // New parameter for company name
) => {
    // FIX: Provide a default empty string in case created_at is undefined
    const transactionDate = formatUtcToBangkokFunc(transaction.created_at || '');
    const member = members.find(m => m.uid === transaction.member_uid);

    const memberInfoHtml = member ? `
        <div class="separator"></div>
        <p style="font-weight: 600;">Member Information:</p>
        <p>Name: ${member.name || 'N/A'}</p>
        <p>Card Number: ${member.card_number || 'N/A'}</p>
        <p>Tier: ${member.tier || 'N/A'}</p>
        ` : '';

    const itemsHtml = transaction.items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 10px; line-height: 1.2; margin-bottom: 2px;">
            <span style="max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name} (x${item.quantity} ${item.unit})</span>
            <span>${formatCurrencyFunc(item.price)} each = ${formatCurrencyFunc(item.subtotal)}</span>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    margin: 0;
                    padding: 0;
                    color: black;
                }
                .receipt-container {
                    width: 80mm;
                    margin: 0 auto;
                    background: white;
                    color: black;
                    padding: 10px;
                    box-sizing: border-box;
                }
                .receipt-container div,
                .receipt-container p,
                .receipt-container span,
                .receipt-container h3,
                .receipt-container ul,
                .receipt-container li {
                    page-break-inside: avoid !important;
                    orphans: 2;
                    widows: 2;
                }
                h3 {
                    font-size: 16px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 8px;
                    page-break-after: avoid !important;
                }
                p, span, li, div {
                    font-size: 10.5px;
                    line-height: 1.3;
                    color: black;
                }
                .text-center {
                    text-align: center;
                }
                .flex-between {
                    display: flex;
                    justify-content: space-between;
                }
                .font-semibold {
                    font-weight: 600;
                }
                .total-line {
                    font-size: 18px;
                    font-weight: bold;
                    color: black;
                    padding-top: 8px;
                    border-top: 1px dashed #ccc;
                    page-break-before: avoid !important;
                }
                .separator {
                    border-top: 1px dashed #ccc;
                    margin: 10px 0;
                    page-break-after: avoid !important;
                    page-break-before: avoid !important;
                }
                ul {
                    list-style-type: none;
                    padding-left: 0;
                    margin: 0;
                }
                .italic {
                    font-style: italic;
                }
                .capitalize {
                    text-transform: capitalize;
                }

                @media print {
                    html, body {
                        width: 80mm;
                        min-height: auto;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    .receipt-container {
                        width: 80mm;
                        margin: 0 !important;
                        padding: 10px;
                        box-sizing: border-box;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <h3 class="text-center">${companyName}</h3>
                <p class="text-center">Transaction Date: ${transactionDate}</p>

                ${memberInfoHtml}

                <div class="separator"></div>

                <p style="font-weight: 600; margin-bottom: 8px;">Items:</p>
                ${itemsHtml}

                <div class="separator"></div>

                <div class="flex-between">
                    <span class="font-semibold">Subtotal:</span>
                    <span>${formatCurrencyFunc(transaction.subtotal)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Discount (${(transaction.discount_rate * 100).toFixed(0)}%):</span>
                    <span style="color: #cc0000;">- ${formatCurrencyFunc(transaction.discount_amount)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Tax (${(taxRate * 100).toFixed(0)}%):</span>
                    <span>${formatCurrencyFunc(transaction.tax_amount)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Payment Method:</span>
                    <span class="capitalize">${transaction.payment_method}</span>
                </div>

                <div class="separator total-line"></div>

                <div class="flex-between total-line">
                    <span>Total:</span>
                    <span>${formatCurrencyFunc(transaction.final_total)}</span>
                </div>

                <p class="text-center italic" style="margin-top: 15px;">Thank you for your business!</p>
            </div>
        </body>
        </html>
    `;
};

// Default categories with their Lucide React icons
const defaultItemCategories: { id: string; name: string; icon: React.ElementType | string }[] = [];

// Default menu layouts
const initialMenuLayouts: MenuLayout[] = [
    { id: 'wholesale-default', name: 'Wholesale', categories: defaultItemCategories.map(c => c.name) },
    { id: 'retail-default', name: 'Retail', categories: defaultItemCategories.map(c => c.name) },
];

// Default membership tiers used for initialization and resets
const defaultMembershipTiers: MembershipTier[] = [
    { name: 'Basic', rate: 0.1 },
    { name: 'Gold', rate: 0.2 },
    { name: 'Supreme', rate: 0.3 },
];

const generateBarcodeId = () => Math.random().toString(36).slice(2, 8);


function App() {

    
    // Authentication State
    const { showCustomAlert } = useCustomAlert();
        const [user, setUser] = useState<AdminUser | null>(null);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    // Theme State
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('sccTheme') as Theme) || 'dark';
        }
        return 'dark';
    });
    
    // Effect to apply theme class to body
    useEffect(() => {
        document.body.className = `${theme}-theme`;
        localStorage.setItem('sccTheme', theme);
    }, [theme]);


    
    // Authentication State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginNfcInput, setLoginNfcInput] = useState('');
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(true); // Start with login modal visible

    // App Data States
        const { showLoader, hideLoader } = useLoader();

    const [isLoggingIn, setIsLoggingIn] = useState(false); // New state for preventing double clicks
    const [showCompanySettingsForm, setShowCompanySettingsForm] = useState(false);
    const [companyName, setCompanyName] = useState('Noname Cannabis Store'); // Default value
    const [companySettings, setCompanySettings] = useState<CompanySettingsFormData | null>(null);

// Function to fetch company settings
    // Inside your App component in page.tsx

    const [shopName, setShopName] = useState('');
    const [shopUrl, setShopUrl] = useState('');
    const [shopAnonKey, setShopAnonKey] = useState('')

    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    
    
    const preCalculatedTotalRevenue = (transactions: Transaction[]): number => {
  return transactions.reduce((acc, t) => acc + t.final_total, 0);
};

    const [showAdminConfirmModal, setShowAdminConfirmModal] = useState(false);
    const [adminConfirmTitle, setAdminConfirmTitle] = useState('');
    const [adminConfirmMessage, setAdminConfirmMessage] = useState('');
    const [adminConfirmPhrase, setAdminConfirmPhrase] = useState('');
    const [adminConfirmAction, setAdminConfirmAction] = useState<(username: string, password: string) => void>(() => {});
const [invoices, setInvoices] = useState<Invoice[]>([]);

    
    
    const [strainSuggestions, setStrainSuggestions] = useState<Array<{
  name: string;
  type: string;
  thc_level: string;
  description: string;
}>>([]);
    
    const [members, setMembers] = useState<AppMember[]>([]);
    const [transactions, setTransactions] = useState<AppTransaction[]>([]);
    const [inventoryItems, setInventoryItems] = useState<AppInventoryItem[]>([]);
    const [orders, setOrders] = useState<AppOrder[]>([]); // New state for orders

    const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);

    const [itemTransactionManualPrice, setItemTransactionManualPrice] = useState<number>(0);
    const [itemSearchQueryInOrderModal, setItemSearchQueryInOrderModal] = useState<string>(''); // New state for this search field

     const [dealerId, setDealerId] = useState<string>('');

    // Strain Preview states
const [previewStrain, setPreviewStrain] = useState<{
  name: string;
  description: string;
} | null>(null);

    // PoS & Member Related States
    const [currentMember, setCurrentMember] = useState<AppMember | null>(null);
    const [currentTransactionItems, setCurrentTransactionItems] = useState<TransactionLineItem[]>([]);
    const [transactionSearchTerm, setTransactionSearchTerm] = useState<string>('');
    const [nfcInput, setNfcInput] = useState(''); // For PoS member scan
    const [nfcStatus, setNfcStatus] = useState('Ready to scan...');
    const [taxRate, setTaxRate] = useState(() => {
        if (typeof window !== 'undefined') {
            const storedTaxRate = localStorage.getItem('sccTaxRate');
            return storedTaxRate ? parseFloat(storedTaxRate) : 0;
        }
        return 0;
    }); // Client-side setting, stored in localStorage
    const [showReceipt, setShowReceipt] = useState(false); // Renamed to showReceiptModal to avoid confusion
    const [lastProcessedTransaction, setLastProcessedTransaction] = useState<AppTransaction | null>(null);
const [activeScreen, setActiveScreen] = useState<
    'pos' | 'members' | 'history' | 'settings' | 'inventory' | 'menu' | 'reports' | 'orders' | 'invoices'
>('pos');
    // Modals & Forms (General)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // For transaction history search
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); // This will control the visibility of the receipt modal
    const [showAiReportModal, setShowAiReportModal] = useState(false); // State for AI Sales Report Modal

    // Member Management Modals & Forms
    const [editMemberId, setEditMemberId] = useState<string | null>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [newMemberData, setNewMemberData] = useState({
        uid: '',
        cardNumber: '',
        name: '',
        tier: defaultMembershipTiers[0]?.name || 'Basic',
        phone: '',
        email: '',
        status: 'Active',
        prescription_url: '',
        prescription_path: ''
    });

    // Inventory Management Modals & Forms
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editInventoryItemId, setEditInventoryItemId] = useState<string | null>(null);
    const [newInventoryItemData, setNewInventoryItemData] = useState<{
        name: string;
        description: string;
        category: string;
        pricingOptions: PricingOption[];
        available_stock: number;
        reserved_stock: number;
        cost_price: number;
        barcode_id: string;
    }>({
        name: '',
        description: '',
        category: 'Other',
        pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }], // Default pricing option
        available_stock: 0,
        reserved_stock: 0,
        cost_price: 0,
        barcode_id: ''
    });
    const [showCategoryIconSuggester, setShowCategoryIconSuggester] = useState(false); // State for icon suggester modal
    const [suggestedIconName, setSuggestedIconName] = useState<string | null>(null); // State to store suggested icon name

    const [inventorySearchTerm, setInventorySearchTerm] = useState<string>('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
    const [historySortColumn, setHistorySortColumn] = useState<string | null>('transaction_date'); // Default sort by date
    const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc'); // Default descending for dates
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    
    // Member search and sort states
    const [memberSearchTerm, setMemberSearchTerm] = useState<string>('');
    const [memberSortColumn, setMemberSortColumn] = useState<string | null>(null);
    const [memberSortDirection, setMemberSortDirection] = useState<'asc' | 'desc'>('asc');

    // Pagination states for Members table
    const [currentPageMembers, setCurrentPageMembers] = useState(1);
    const [itemsPerPageMembers, setItemsPerPageMembers] = useState(10); // Default items per page
    
     const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

    const [currentPageInventory, setCurrentPageInventory] = useState(1);
    const [itemsPerPageInventory, setItemsPerPageInventory] = useState(10);
    const [inventorySortColumn, setInventorySortColumn] = useState('name');
    const [inventorySortDirection, setInventorySortDirection] = useState('asc');
    
    // PoS Item Selection States
    const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
    const [selectedItemForTransaction, setSelectedItemForTransaction] = useState<AppInventoryItem | null>(null);
    const [selectedPricingOption, setSelectedPricingOption] = useState<PricingOption | null>(null);
    const [itemTransactionQuantity, setItemTransactionQuantity] = useState(1);
const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

    useBarcodeScanner({
        onBarcodeScanned: (code: string) => {
            if (activeScreen === 'inventory') {
                setInventorySearchTerm(code);
            } else if (activeScreen === 'pos') {
                const item = inventoryItems.find(i => i.barcode_id === code || i.id === code);
                if (item) {
                    setShowItemSelectionModal(true);
                    setSelectedCategoryFilter(null);
                    setSelectedItemForTransaction(item);
                    setSelectedPricingOption(item.pricing_options[0] || null);
                    setItemSearchQuery('');
                }
            }
        },
        debounceTime: 50,
    });


    // Use a Map to store the expanded state for each transaction by its ID
const [expandedHistoryRows, setExpandedHistoryRows] = useState<Map<string, boolean>>(new Map());

// Function to toggle the expanded state for a specific transaction
const toggleHistoryRowExpand = useCallback((transactionId: string) => {
    setExpandedHistoryRows(prev => {
        const newMap = new Map(prev);
        newMap.set(transactionId, !newMap.get(transactionId));
        return newMap;
    });
}, []);
    
    const [showCommentField, setShowCommentField] = useState(false);
    const [transactionComment, setTransactionComment] = useState('');
    const [isDiscountApplied, setIsDiscountApplied] = useState(false);

    // State to manage if the current transaction is for fulfilling an order
    const [isFulfillingOrder, setIsFulfillingOrder] = useState(false);
    const [orderBeingFulfilledId, setOrderBeingFulfilledId] = useState<string | null>(null);
    const [ordersBeingFulfilledIds, setOrdersBeingFulfilledIds] = useState<string[]>([]); // Track multiple orders when bulk fulfilling
    const [bulkFulfillMemberUid, setBulkFulfillMemberUid] = useState(''); // Input for bulk fulfillment

    const clearTransaction = useCallback(() => {
        setCurrentTransactionItems([]); // Clear the items in the current transaction/cart
        setTransactionSearchTerm(''); // Clear any search term if applicable
        // Add any other state resets related to the transaction panel here
    }, []); // Empty dependency array means this function is stable and won't recreate unnecessarily

    // Order Management Modals & Forms
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);
    const [newOrderData, setNewOrderData] = useState<{
        memberUid: string;
        dealerId: string;
        comment: string;
        items: AppOrder['items'];
    }>({
        memberUid: '',
        dealerId: '',
        comment: '',
        items: [],
    });
    const [currentOrderMemberUID, setCurrentOrderMemberUID] = useState<string | null>(null); // To filter orders on PoS by scanned member
    const [orderToCancel, setOrderToCancel] = useState<AppOrder | null>(null);

    // Reports Specific States
    const [selectedReportMemberUid, setSelectedReportMemberUid] = useState<string | null>(null);
    const [reportStartDate, setReportStartDate] = useState<string>(''); //YYYY-MM-DD
    const [reportEndDate, setReportEndDate] = useState<string>('');   //YYYY-MM-DD
    // --- Helper Functions ---
    // Moved getDiscountRate to be part of the component state/settings
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
    };

  // --- Helper Functions for Date Shortcuts ---
    // Formats a Date object to YYYY-MM-DD string for input fields
    const formatDateToYYYYMMDD = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    
    const applyDateRange = useCallback((
        startDate: string,
        endDate: string,
        setStartDate: (date: string) => void,
        setEndDate: (date: string) => void
    ) => {
        setStartDate(startDate);
        setEndDate(endDate);
    }, []);

    // Get today's date range
    const getTodayRange = useCallback(() => {
        const today = new Date();
        return {
            startDate: formatDateToYYYYMMDD(today),
            endDate: '', // Empties the end date field for "Today"
        };
    }, [formatDateToYYYYMMDD]);

       // Get yesterday's date range
    const getYesterdayRange = useCallback(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // Go back one day
        const today = new Date(); // Get the current date for the end date
        return {
            startDate: formatDateToYYYYMMDD(yesterday),
            endDate: formatDateToYYYYMMDD(today), // Fill end date with the current date (today)
        };
    }, [formatDateToYYYYMMDD]);

    // Get current week's date range (Monday to Sunday, capped at today)
    const getThisWeekRange = useCallback(() => {
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const dayOfWeek = (now.getDay() + 6) % 7;
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        const calculatedEndOfWeek = new Date(startOfWeek);
        calculatedEndOfWeek.setDate(startOfWeek.getDate() + 6);
        calculatedEndOfWeek.setHours(23, 59, 59, 999);

        const finalEndDate = calculatedEndOfWeek > todayEnd ? todayEnd : calculatedEndOfWeek;

        return {
            startDate: formatDateToYYYYMMDD(startOfWeek),
            endDate: '',
        };
    }, [formatDateToYYYYMMDD]);

    // Get last week's date range (Monday to Sunday of the previous week)
    const getLastWeekRange = useCallback(() => {
        const today = new Date();
        const dayOfWeek = (today.getDay() + 6) % 7;

        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - dayOfWeek);
        startOfThisWeek.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);

        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);

        return {
            startDate: formatDateToYYYYMMDD(startOfLastWeek),
            endDate: formatDateToYYYYMMDD(endOfLastWeek),
        };
    }, [formatDateToYYYYMMDD]);

    // Get current month's date range (capped at today)
    const getThisMonthRange = useCallback(() => {
        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const calculatedEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        calculatedEndOfMonth.setHours(23, 59, 59, 999);

        const finalEndDate = calculatedEndOfMonth > todayEnd ? todayEnd : calculatedEndOfMonth;

        return {
            startDate: formatDateToYYYYMMDD(startOfMonth),
            endDate: '',
        };
    }, [formatDateToYYYYMMDD]);

    // Get last month's date range
    const getLastMonthRange = useCallback(() => {
        const today = new Date();
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
            startDate: formatDateToYYYYMMDD(startOfLastMonth),
            endDate: formatDateToYYYYMMDD(endOfLastMonth),
        };
    }, [formatDateToYYYYMMDD]);

    // Array of date shortcut buttons (reused for both screens)
    const dateShortcuts = useMemo(() => [
        { label: 'Today', handler: getTodayRange },
                { label: 'Yesterday', handler: getYesterdayRange },
        { label: 'This Week', handler: getThisWeekRange },
        { label: 'Last Week', handler: getLastWeekRange },
        { label: 'This Month', handler: getThisMonthRange },
        { label: 'Last Month', handler: getLastMonthRange },
    ], [getTodayRange, getYesterdayRange, getThisWeekRange, getLastWeekRange, getThisMonthRange, getLastMonthRange]);

    
    //  Specific States
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(() => {
        // Initialize from localStorage, default to 30 minutes
        if (typeof window !== 'undefined') {
            const storedTimeout = localStorage.getItem('sccIdleTimeoutMinutes');
            return storedTimeout ? parseInt(storedTimeout) : 30;
        }
        return 30;
    });

    // Custom Categories State (Used for Inventory Item forms and Menu Category buttons)
    const [allItemCategories, setAllItemCategories] = useState<Category[]>([]);

    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Membership tiers (names & discount rates)
    const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>(
        defaultMembershipTiers
    );
    const [newTierName, setNewTierName] = useState('');

    // Helper to get discount rate based on tier
    const getDiscountRate = useCallback((tier: string) => {
        const found = membershipTiers.find(t => t.name === tier);
        return found ? found.rate : 0;
    }, [membershipTiers]);

        // Custom discount
    const [customDiscountInput, setCustomDiscountInput] = useState<string>('');
    const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(0);
    const [customDiscountPercentage, setCustomDiscountPercentage] = useState<number>(0);
    const [isCustomDiscountApplied, setIsCustomDiscountApplied] = useState<boolean>(false);

    const [isMemberDiscountApplied, setIsMemberDiscountApplied] = useState<boolean>(false);

    // Menu Layouts State (for Menu tab variations)
    const [menuLayouts, setMenuLayouts] = useState<MenuLayout[]>(() => {
        if (typeof window !== 'undefined') {
            const storedLayouts = localStorage.getItem('sccMenuLayouts');
            return storedLayouts ? JSON.parse(storedLayouts) : initialMenuLayouts;
        }
        return initialMenuLayouts;
    });
    const [activeMenuLayoutId, setActiveMenuLayoutId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const storedLayouts = localStorage.getItem('sccMenuLayouts');
            const parsedLayouts = storedLayouts ? JSON.parse(storedLayouts) : initialMenuLayouts;
            const storedActiveId = localStorage.getItem('sccActiveMenuLayoutId');
            // Ensure the stored active ID refers to an existing layout, otherwise default to first.
            const initialId = storedActiveId && parsedLayouts.some((l: MenuLayout) => l.id === storedActiveId)
                ? storedActiveId
                : (parsedLayouts.length > 0 ? parsedLayouts[0].id : ''); // Default to first existing or empty
            return initialId;
        }
        return initialMenuLayouts[0].id;
    });
    const [showMenuLayoutModal, setShowMenuLayoutModal] = useState(false);
    const [editMenuLayoutData, setEditMenuLayoutData] = useState<MenuLayout | null>(null);


    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [paymentPromiseResolve, setPaymentPromiseResolve] = useState<((value: string) => void) | null>(null);
    const [paymentPromiseReject, setPaymentPromiseReject] = useState<((reason?: any) => void) | null>(null);


    // Loading & Error States
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    // Helper to get icon component by category name
    const getCategoryIcon = (categoryName: string) => {
        const category = allItemCategories.find(cat => cat.name === categoryName);
        return category && iconMap[category.icon_name] ? iconMap[category.icon_name] : CircleDashed;
    };

 
     // --- Authentication Logic ---
  const handleLogin = async () => {
    setLoginError(null);

    if (!loginNfcInput && (!loginUsername || !loginPassword)) {
        // Using a message box instead of alert()
        showCustomAlert('Login Failed.', 'Please enter NFC UID or Username and Password.');
        return;
    }

    // Prevent double submission and show loader
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    showLoader();

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: loginNfcInput,
                username: loginUsername,
                password: loginPassword,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setLoginError(errorData.error || 'Login failed. Please check your credentials.');
            return;
        }

        // The login API now returns supabase_url and supabase_anon_key
        const userData: AdminUser & { supabase_url: string; supabase_anon_key: string } = await response.json();
// Step 2: Fetch shop credentials using the authenticated user's shop_id
            // This assumes admin_users table has shop_id and shops table has URL/AnonKey
            const supabase = getDefaultClientSupabase();
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .select('name, supabase_url, supabase_anon_key')
                .eq('id', userData.shop_id) // Assuming shop_id is stored in admin_users
                .single();

            if (shopError || !shopData) {
                throw new Error(shopError?.message || 'Shop credentials not found for this user.');
            }

            setShopName(shopData.name);
            setCompanyName(shopData.name);
            setShopUrl(shopData.supabase_url);
            setShopAnonKey(shopData.supabase_anon_key);
        // Initialize the Supabase client with the shop-specific credentials
        initializeSupabaseClient(userData.supabase_url, userData.supabase_anon_key);

        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginNfcInput('');
        setLoginUsername('');
        setLoginPassword('');
        // Using a message box instead of alert()
        showCustomAlert(`Welcome, ${userData.username || 'User'}!`, `You are logged in as ${userData.role}.`);
        refreshData(); // Refresh data after successful login using the new client
        resetIdleTimer(); // Start idle timer on login
        setUser(userData);
// --- Session Logging: Login ---
try {
    const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userData.id,
            shopId: userData.shop_id,
            deviceInfo: navigator.userAgent, // Capture user agent as device info
        }),
    });

    if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setCurrentSessionId(sessionData.session_id); // Store the session ID
        console.log('Session logged:', sessionData);
    } else {
        const errorData = await sessionResponse.json();
        console.error('Failed to log session:', errorData.error);
    }
} catch (sessionErr) {
    console.error('Error logging session:', sessionErr);
}
// --- End Session Logging: Login ---
    } catch (err: any) {
        console.error('Login error:', err);
        setLoginError(err.message || 'An error occurred during login.');
    } finally {
        setIsLoggingIn(false);
        hideLoader();
    }
};

const handleLogout = async () => { // Make handleLogout async
    showLoader();

    // --- Session Logging: Logout ---
    if (currentSessionId) {
        try {
            const logoutResponse = await fetch('/api/sessions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    logoutTime: new Date().toISOString(), // Record current time as logout
                }),
            });

            if (logoutResponse.ok) {
                console.log('Session logout time updated successfully.');
            } else {
                const errorData = await logoutResponse.json();
                console.error('Failed to update session logout time:', errorData.error);
            }
        } catch (logoutErr) {
            console.error('Error updating session logout time:', logoutErr);
        } finally {
            setCurrentSessionId(null); // Clear session ID on logout
        }
    }
    // --- End Session Logging: Logout ---

    setIsLoggedIn(false);
    setShowLoginModal(true); // Show login modal on logout
    setCurrentMember(null);
    handleClearTransaction();
    setMembers([]);
    setTransactions([]);
    setInventoryItems([]);
    setOrders([]);
    if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
    }
    hideLoader(); // Hide loader after clearing data
};


// Initialize the debounced search function
    //Debounced strain search    
    const debouncedStrainSearch = useCallback(
  debounce(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setStrainSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        query: searchTerm,
        limit: '7'
      });
      
      const response = await fetch(`/api/strains/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch strains');
      
      const strains = await response.json();
      setStrainSuggestions(strains);
    } catch (error) {
      console.error('Error fetching strain suggestions:', error);
      setStrainSuggestions([]);
    }
  }, 300),
  []
);
    // -- IDLE TIMER LOGIC -- 
 const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        if (isLoggedIn && idleTimeoutMinutes > 0) {
            idleTimerRef.current = setTimeout(() => {
                handleLogout();
            }, idleTimeoutMinutes * 60 * 1000); // Convert minutes to milliseconds
        }
    }, [isLoggedIn, idleTimeoutMinutes, handleLogout]);

    useEffect(() => {
        // Save timeout to localStorage whenever it changes
        if (typeof window !== 'undefined') {
            localStorage.setItem('sccIdleTimeoutMinutes', idleTimeoutMinutes.toString());
        }
        resetIdleTimer(); // Reset timer on mount or timeout change

        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetIdleTimer));

        return () => {
            // Cleanup event listeners and timer
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            events.forEach(event => window.removeEventListener(event, resetIdleTimer));
        };
    }, [idleTimeoutMinutes, isLoggedIn, resetIdleTimer]);


 // --- Data Fetching & Refresh ---
 useEffect(() => {
    if (user && user.supabase_url && user.supabase_anon_key) {
      // This initializes the client-side Supabase instance for the logged-in user's shop
      initializeSupabaseClient(user.supabase_url, user.supabase_anon_key);
    }
  }, [user]);
    
 // Load company settings (updated to fetch all fields)
   // Load company settings (already correctly updated)
    useEffect(() => {
        const fetchCompanySettings = async () => {
            if (!isLoggedIn) return; // Only fetch if logged in

            try {
                const supabase = getClientSupabaseClient();
                const { data, error } = await supabase
                    .from('company_settings')
                    .select('company_name')
                    .eq('id', 'company_info')
                    .eq('shop_id', user?.shop_id)
                    .single();
                

                if (error) {
                    console.error('Error fetching company settings:', error);
                } else if (data) {
                    setCompanyName(data.company_name);
                }
            } catch (err) {
                console.error('Error fetching company settings:', err);
            }
        };
        fetchCompanySettings();
    }, [isLoggedIn]);

    // Load application settings from Supabase whenever user changes
    useEffect(() => {
        const loadAppSettings = async () => {
            if (!isLoggedIn || !user) {
                setMembershipTiers(defaultMembershipTiers);
                setTaxRate(0);
                return;
            }
            const data = await fetchAppSettings(user.shop_id!);
            if (data) {
                setTaxRate(data.tax_rate || 0);
                if (
                    Array.isArray(data.membership_discount_rates) &&
                    data.membership_discount_rates.length > 0
                ) {
                    setMembershipTiers(data.membership_discount_rates);
                } else {
                    setMembershipTiers(defaultMembershipTiers);
                }
            } else {
                setMembershipTiers(defaultMembershipTiers);
                setTaxRate(0);
            }
        };
        loadAppSettings();
    }, [isLoggedIn, user]);

    const fetchCategoriesFromSupabase = useCallback(async () => {
        try {
            const supabase = getClientSupabaseClient(); // <-- Use the shop-specific client
            const { data, error } = await supabase
                .from('categories')
                .select('*');
            if (error) {
                console.error('Error fetching categories:', error);
                setError('Failed to load categories.');
                return [];
            }
            const fetchedCategories: Category[] = data.map((d: any) => ({
                id: d.id,
                name: d.name,
                icon_name: d.icon_name || 'CircleDashed'
            }));
            return fetchedCategories;
        } catch (e) {
            console.error('Error in fetchCategoriesFromSupabase:', e);
            setError('Failed to load categories due to client initialization issue.');
            return [];
        }
    }, []);

        const fetchMembersFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getClientSupabaseClient(); // <-- CHANGE THIS LINE
            const { data, error } = await supabase.from('members').select('*');
            if (error) {
                console.error('Supabase error (GET members):', error);
                setError('Failed to load members.');
                return [];
            }
            return data as Member[];
        } catch (e) {
            console.error('Error fetching members:', e);
            setError('Failed to load members.');
            return [];
        }
    }, [isLoggedIn]);

    const fetchTransactionsFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getClientSupabaseClient();
            const { data, error } = await supabase.from('transactions').select('*');
            if (error) {
                console.error('Supabase error (GET transactions):', error);
                setError('Failed to load transactions.');
                return [];
            }
            // Parse items_json back to array of objects for each transaction
            const transactions = data.map(t => ({
                ...t,
                items_json: JSON.parse(t.items_json)
            }));
            return transactions as Transaction[];
        } catch (e) {
            console.error('Error fetching transactions:', e);
            setError('Failed to load transactions.');
            return [];
        }
    }, [isLoggedIn]);

    const fetchInventoryFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getClientSupabaseClient();
            const { data, error } = await supabase.from('inventory').select('*');
            if (error) {
                console.error('Supabase error (GET inventory):', error);
                setError('Failed to load inventory.');
                return [];
            }
            return data as InventoryItem[];
        } catch (e) {
            console.error('Error fetching inventory:', e);
            setError('Failed to load inventory.');
            return [];
        }
    }, [isLoggedIn]);

    const fetchOrdersFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getClientSupabaseClient();
            const { data, error } = await supabase.from('orders').select('*');
            if (error) {
                console.error('Supabase error (GET orders):', error);
                setError('Failed to load orders.');
                return [];
            }
            return data as Order[];
        } catch (e) {
            console.error('Error fetching orders:', e);
            setError('Failed to load orders.');
            return [];
        }
    }, [isLoggedIn]);

    const fetchInvoicesFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getClientSupabaseClient();
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false }); // Ensure this order by is supported by Supabase indexes
            if (error) {
                console.error('Supabase error (GET invoices):', error);
                setError('Failed to load invoices.');
                return [];
            }
            return data as Invoice[];
        } catch (e) {
            console.error('Error fetching invoices:', e);
            setError('Failed to load invoices.');
            return [];
        }
    }, [isLoggedIn]);

    const fetchAdminUsersFromSupabase = useCallback(async () => {
        if (!isLoggedIn) return [];
        try {
            const supabase = getDefaultClientSupabase();
            const { data, error } = await supabase.from('admin_users').select('*');
            if (error) {
                console.error('Supabase error (GET admin_users):', error);
                setError('Failed to load admin users.');
                return [];
            }
            // Filter out passwords before sending
            const safeData = data.map(user => {
                const { password, ...rest } = user;
                return rest;
            });
            return safeData as AdminUser[];
        } catch (e) {
            console.error('Error fetching admin users:', e);
            setError('Failed to load admin users.');
            return [];
        }
    }, [isLoggedIn]);
    
    // REFRESH DATA
    

    const refreshData = useCallback(async () => {
        if (!isLoggedIn) {
            hideLoader();
            return;
        }

        showLoader();
        setError(null);

        try {
            // Call the new dedicated fetch functions
            const [
                membersData,
                transactionsData,
                inventoryData,
                ordersData,
                categoriesData,
                invoicesData,
                adminUsersData,
            ] = await Promise.all([
                fetchMembersFromSupabase(),
                fetchTransactionsFromSupabase(),
                fetchInventoryFromSupabase(),
                fetchOrdersFromSupabase(),
                fetchCategoriesFromSupabase(),
                fetchInvoicesFromSupabase(),
                fetchAdminUsersFromSupabase(),
            ]);

            // Set all category and invoice data
            setAllItemCategories(categoriesData);
            setInvoices(invoicesData);
            setAdminUsers(adminUsersData);

            // Map and set members data
            setMembers(Array.isArray(membersData) ? membersData.map(m => ({
                ...m,
                total_purchases: (m as any).total_purchases || 0,
            })) : []);

            // Create a map for quick lookup of inventory items
            const inventoryMap = new Map<string, InventoryItem>();
            if (Array.isArray(inventoryData)) {
                inventoryData.forEach(item => {
                    inventoryMap.set(item.id, item);
                });
            }
            setInventoryItems(Array.from(inventoryMap.values()));

            // Map transaction items and calculate cost prices
            const transactionsWithCosts = Array.isArray(transactionsData) ? transactionsData.map(t => {
                const transactionItems = (Array.isArray(t.items_json) ? t.items_json : []).map((txItem: Transaction['items_json'][0]) => {
                    const fullItem = inventoryMap.get(txItem.itemId);
                    const selectedOption = fullItem?.pricing_options.find(option => option.id === txItem.selectedOptionId);
                    const itemCost = fullItem?.cost_price || 0;

                    return {
                        id: txItem.itemId,
                        name: fullItem?.name || 'Unknown Item',
                        price: txItem.price,
                        unit: selectedOption?.unit || fullItem?.pricing_options[0]?.unit || 'unit',
                        category: fullItem?.category || 'Other',
                        quantity: txItem.quantity,
                        subtotal: txItem.quantity * txItem.price,
                        selectedOptionId: txItem.selectedOptionId,
                        itemCost
                    };
                });
               
                const totalCostPrice = transactionItems.reduce((acc: number, item: { itemCost: number; quantity: number; }) => {
                    return acc + (item.itemCost || 0) * item.quantity;
                }, 0);

                return {
                    ...t,
                    items: transactionItems,
                    payment_method: t.payment_method || 'Unknown',
                    cost_price: totalCostPrice, // Add the total cost price to the transaction object
                };
            }) : [];

            setTransactions(transactionsWithCosts as any);


            // Process orders data
            setOrders(Array.isArray(ordersData) ? ordersData.map(o => {
                const orderItems = (Array.isArray(o.items_json) ? o.items_json : []).map((ordItem: Order['items_json'][0]) => {
                    const fullItem = inventoryMap.get(ordItem.itemId);
                    const selectedOption = fullItem?.pricing_options.find(option => option.id === ordItem.selectedOptionId);
                    return {
                        itemId: ordItem.itemId,
                        name: fullItem?.name || ordItem.name || 'Unknown Item',
                        quantity: ordItem.quantity,
                        price: ordItem.price,
                        unit: selectedOption?.unit || ordItem.unit || 'unit',
                        category: fullItem?.category || ordItem.category || 'Other',
                        selectedOptionId: ordItem.selectedOptionId,
                    };
                });
                return {
                    ...o,
                    items: orderItems,
                };
            }) : []);
} catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data. Please try again.');
        } finally {
            hideLoader();
        }
    }, [
        isLoggedIn, 
        hideLoader, 
        showLoader, 
        fetchCategoriesFromSupabase, // Keep this one as it's a direct Supabase call
    ]);
            
            
            // --- Calculate and set new report data here ---
                // Filtered Transactions for Reports Screen
   // Filtered Transactions for Reports Screen (This block remains as you provided)
    const filteredReportTransactions = transactions.filter(t => {
        // Filter by member UID
        const matchesMember = selectedReportMemberUid ? t.member_uid === selectedReportMemberUid : true;

        // Filter by date range
        const transactionDate = new Date(t.transaction_date);
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate) : null;

        const matchesDateRange = (!start || transactionDate >= start) &&
                                 (!end || transactionDate <= end); // End date inclusive

        return matchesMember && matchesDateRange;
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    // Calculate totals for filtered report transactions (This block remains as you provided)
    const totalReportTransactions = filteredReportTransactions.length;
    const totalReportRevenue = filteredReportTransactions.reduce((acc, t) => acc + t.final_total, 0);

    // Calculate sales by category for filtered report transactions (This block remains as you provided)
    const reportCategorySales = allItemCategories.map(cat => { // Use allItemCategories here
        const categorySales = filteredReportTransactions.reduce((acc, t) => {
            const itemsInCat = t.items.filter(item => item.category === cat.name);
            return acc + itemsInCat.reduce((sum, item) => sum + item.subtotal, 0);
        }, 0);
        return { name: cat.name, sales: categorySales };
        }).filter(cat => cat.sales > 0); // Keep this filter

    // Calculate top selling items for filtered report transactions (This block remains as you provided)
    const reportItemSalesMap = new Map<string, { quantity: number; revenue: number; name: string }>();
    filteredReportTransactions.forEach(t => {
        t.items.forEach(item => {
            const current = reportItemSalesMap.get(item.id) || { quantity: 0, revenue: 0, name: item.name };
            current.quantity += item.quantity;
            current.revenue += item.subtotal;
            reportItemSalesMap.set(item.id, current);
        });
    });
    const sortedReportItems = Array.from(reportItemSalesMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);


    
    const averageTransactionAmount = filteredReportTransactions.length > 0
        ? filteredReportTransactions.reduce((sum, t) => sum + t.final_total, 0) / filteredReportTransactions.length
        : 0;

    
    const salesByPaymentMethodMap = filteredReportTransactions.reduce((acc: { [key: string]: number }, t) => {
        const method = t.payment_method.charAt(0).toUpperCase() + t.payment_method.slice(1);
        acc[method] = (acc[method] || 0) + t.final_total;
        return acc;
    }, {});
    const reportSalesByPaymentMethod = Object.keys(salesByPaymentMethodMap).map(name => ({ name, sales: salesByPaymentMethodMap[name] }))
        .filter(item => item.sales > 0);

    
    const salesByMemberTierMap = filteredReportTransactions.reduce((acc: { [key: string]: number }, t) => {
        const member = members.find(m => m.uid === t.member_uid); // Use 'members' state for members lookup
        const tier = member?.tier || 'No Tier';
        acc[tier] = (acc[tier] || 0) + t.final_total;
        return acc;
    }, {});
    const reportSalesByMemberTier = Object.keys(salesByMemberTierMap).map(name => ({ name, sales: salesByMemberTierMap[name] }))
    .filter(item => item.sales > 0);

    // Top customers by revenue
    const customerRevenueMap = new Map<string, number>();
    filteredReportTransactions.forEach(t => {
        const member = members.find(m => m.uid === t.member_uid);
        const name = member ? member.name : 'Guest';
        customerRevenueMap.set(name, (customerRevenueMap.get(name) || 0) + t.final_total);
    });
    const topCustomers = Array.from(customerRevenueMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

     
    const dailyDataMap = new Map<string, { date: string; totalSales: number; totalProfit: number; transactionCount: number }>();

    filteredReportTransactions.forEach(t => {
        const dateStr = t.transaction_date.split('T')[0]; // YYYY-MM-DD
        const entry = dailyDataMap.get(dateStr) || { date: dateStr, totalSales: 0, totalProfit: 0, transactionCount: 0 };
        
        entry.totalSales += t.final_total;
        entry.totalProfit += (t.final_total - (t.cost_price || 0)); // Ensure cost_price is available
        entry.transactionCount += 1;
        dailyDataMap.set(dateStr, entry);
    });

    const sortedDailyData = Array.from(dailyDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Prepare data for Average Sales Amount sparkline
    const averageSalesSparklineData = sortedDailyData.map(d => ({
        date: d.date,
        value: d.transactionCount > 0 ? d.totalSales / d.transactionCount : 0
    })).slice(-30); // Last 30 days or fewer

    // Prepare data for Total Gross Profit sparkline
    const totalGrossProfitSparklineData = sortedDailyData.map(d => ({
        date: d.date,
        value: d.totalProfit
    })).slice(-30); // Last 30 days or fewer

    const calcPeriodChange = (
        getMetric: (t: typeof filteredReportTransactions[0]) => number,
        average: boolean = false
    ) => {
        const start = reportStartDate ? new Date(reportStartDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = reportEndDate ? new Date(reportEndDate) : new Date();
        end.setHours(23,59,59,999);
        const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) || 1;
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - days + 1);

        const prevSet = transactions
            .filter(t => {
                const d = new Date(t.transaction_date);
                return d >= prevStart && d <= prevEnd;
            });
        const prevTotal = prevSet.reduce((acc, t) => acc + getMetric(t), 0);
        const prevValue = average && prevSet.length > 0 ? prevTotal / prevSet.length : prevTotal;
        return prevValue;
    };

    const totalGrossProfit = filteredReportTransactions.reduce((acc, t) => acc + (t.final_total - (t.cost_price || 0)), 0);
    const totalCostOfGoodsSold = filteredReportTransactions.reduce((acc, t) => acc + (t.cost_price || 0), 0);

    const prevAvgSales = calcPeriodChange(t => t.final_total, true);
    const averageSalesChangePercent = prevAvgSales ? ((averageTransactionAmount - prevAvgSales) / prevAvgSales) * 100 : null;

    const prevGrossProfit = calcPeriodChange(t => t.final_total - (t.cost_price || 0));
    const totalGrossProfitChangePercent = prevGrossProfit ? ((totalGrossProfit - prevGrossProfit) / prevGrossProfit) * 100 : null;
    const profitMarginPercent = totalReportRevenue > 0 ? (totalGrossProfit / totalReportRevenue) * 100 : 0;

    const biggestSale = filteredReportTransactions.reduce((max, t) => Math.max(max, t.final_total), 0);
    const biggestDiscount = filteredReportTransactions.reduce((max, t) => Math.max(max, t.discount_amount), 0);
    const biggestProfit = filteredReportTransactions.reduce((max, t) => Math.max(max, t.final_total - (t.cost_price || 0)), 0);
    const topItemForTicker = sortedReportItems[0];
    const highscoreMessages = [
        `BIGGEST SALE: ${formatCurrency(biggestSale)}`,
        `BIGGEST DISCOUNT: ${formatCurrency(biggestDiscount)}`,
        `TOP ITEM: ${topItemForTicker ? topItemForTicker.name + ' ' + topItemForTicker.quantity + ' sold' : 'N/A'}`,
        `MAX PROFIT: ${formatCurrency(biggestProfit)}`
    ];
    
    // Initial Data Load on Mount
    useEffect(() => {
        // Tax rate is already initialized from localStorage
        // Membership discounts are already initialized from localStorage
        if (!isLoggedIn) {
            setShowLoginModal(true);
        }
    }, []);

    // Effect to refetch data when login state changes
    useEffect(() => {
        refreshData();
    }, [isLoggedIn, refreshData]);


    // Persist app settings to Supabase
    useEffect(() => {
        if (!isLoggedIn || !user) return;
        upsertAppSettings({
            shop_id: user.shop_id!,
            tax_rate: taxRate,
            membership_discount_rates: membershipTiers,
        });
    }, [taxRate, membershipTiers, isLoggedIn, user]);

    // Save menu layouts to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sccMenuLayouts', JSON.stringify(menuLayouts));
            localStorage.setItem('sccActiveMenuLayoutId', activeMenuLayoutId);
        }
    }, [menuLayouts, activeMenuLayoutId]);


    // --- Transaction Logic ---
       const handleAddItemToTransaction = (
        item: AppInventoryItem,
        selectedOption: PricingOption,
        quantity: number,
        manualPrice?: number // Add manualPrice as an optional parameter
    ) => {
        // Calculate the price to use: manualPrice if provided and valid, otherwise selectedOption.price
        const priceToUse = (typeof manualPrice === 'number' && !isNaN(manualPrice) && manualPrice >= 0)
            ? manualPrice
            : selectedOption.price;

        // Check for sufficient available stock before adding to transaction
        const currentReservedStock = item.reserved_stock ?? 0;
        const currentAvailableStock = item.available_stock;
        if (quantity > currentAvailableStock) {
            showCustomAlert('Insufficient Stock.', `Not enough available stock for ${item.name}. Only ${currentAvailableStock} ${selectedOption.unit} available.`);
            return;
        }

        setCurrentTransactionItems(prevItems => [
            ...prevItems,
            {
                id: item.id, // Use item.id as the unique ID for the inventory item
                name: item.name,
                price: priceToUse, // Use the determined price
                unit: selectedOption.unit,
                category: item.category,
                quantity: quantity,
                subtotal: priceToUse * quantity, // Calculate subtotal using the determined price
                selectedOptionId: selectedOption.id,
                itemCost: item.cost_price || 0,
            }
        ]);

        // Reset states after adding item
        setShowItemSelectionModal(false);
        setSelectedItemForTransaction(null);
        setSelectedPricingOption(null); // Reset selected pricing option
        setItemTransactionQuantity(1);
        setItemTransactionManualPrice(0); // Reset manual price after adding
        setSelectedCategoryFilter(null); // Reset filter
    };


    const handleRemoveItem = (indexToRemove: number) => {
        setCurrentTransactionItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
    };

    const handleClearTransaction = () => {
        setCurrentTransactionItems([]);
        setCurrentMember(null);
        setNfcInput('');
        setNfcStatus('Ready to scan...');
        setCurrentOrderMemberUID(null); // Clear pending orders for this member
        setShowItemSelectionModal(false);
        setSelectedItemForTransaction(null);
        setSelectedPricingOption(null);
        setItemTransactionQuantity(1);
        setSelectedCategoryFilter(null); // Reset filter
        setIsFulfillingOrder(false); // Reset order fulfillment state
        setOrderBeingFulfilledId(null); // Reset order ID
        setOrdersBeingFulfilledIds([]); // Reset bulk order IDs
        setBulkFulfillMemberUid(''); // Clear bulk member input
        setSelectedPaymentMethod(null); // Reset selection
        setIsDiscountApplied(false);
        setIsCustomDiscountApplied(false);
        setIsMemberDiscountApplied(false);
        setCustomDiscountAmount(0);
        setCustomDiscountPercentage(0);
        setCustomDiscountInput('');
    };

  const calculateTotals = useCallback(() => {
        const subtotal = currentTransactionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let calculatedDiscountAmount = 0;
        let calculatedDiscountRate = 0;

        if (isCustomDiscountApplied) {
            if (customDiscountPercentage > 0) {
                calculatedDiscountAmount = subtotal * customDiscountPercentage;
                calculatedDiscountRate = customDiscountPercentage;
            } else if (customDiscountAmount > 0) {
                calculatedDiscountAmount = customDiscountAmount;
                calculatedDiscountRate = subtotal > 0 ? customDiscountAmount / subtotal : 0;
            }
        } else if (currentMember && isMemberDiscountApplied) { // Only apply if currentMember exists AND isMemberDiscountApplied is true
            const memberDiscountRate = getDiscountRate(currentMember.tier);
            calculatedDiscountAmount = subtotal * memberDiscountRate;
            calculatedDiscountRate = memberDiscountRate;
        }

       // Ensure discount amount does not exceed subtotal
        calculatedDiscountAmount = Math.min(calculatedDiscountAmount, subtotal);
        
        const taxableAmount = subtotal - calculatedDiscountAmount;
        const taxAmount = taxableAmount * taxRate;
        const finalTotal = taxableAmount + taxAmount;

        return {
            subtotal,
            discountRate: calculatedDiscountRate,
            discountAmount: calculatedDiscountAmount,
            taxAmount,
            finalTotal
        };
    }, [currentTransactionItems, currentMember, taxRate, isCustomDiscountApplied, customDiscountAmount, customDiscountPercentage, isMemberDiscountApplied, getDiscountRate]);
    
    const handleInitiatePayment = async (): Promise<string> => {
    if (currentTransactionItems.length === 0) {
        throw new Error("No items in the transaction to process payment.");
    }

    if (!dealerId) { // New check for dealerId
        throw new Error("No active dealer. Please sign the transaction.");
    }

    return new Promise<string>((resolve, reject) => {
        setShowPaymentModal(true);
        setSelectedPaymentMethod(null); // Reset selection
        setPaymentPromiseResolve(() => resolve);
        setPaymentPromiseReject(() => reject);
    });
};

const handlePaymentMethodSelected = (method: string) => {
    setSelectedPaymentMethod(method);
    if (paymentPromiseResolve) {
        paymentPromiseResolve(method);
    }
    setShowPaymentModal(false);
    setPaymentPromiseResolve(null);
    setPaymentPromiseReject(null);
};

const handlePaymentModalClose = () => {
    if (paymentPromiseReject) {
        paymentPromiseReject(new Error("Payment selection cancelled."));
    }
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
    setPaymentPromiseResolve(null);
    setPaymentPromiseReject(null);
};


const handleProcessPayment = async () => {
    let paymentMethod: string;
    try {
        paymentMethod = await handleInitiatePayment();
    } catch (error: any) {
        // Payment initiation was cancelled or failed
        console.error("Payment initiation cancelled or failed:", error.message);
        showCustomAlert('Sign the Transaction', `Payment initiation failed: ${error.message}`);
        return;
    }

    showLoader();

    try {
        const { subtotal, discountRate, discountAmount, taxAmount, finalTotal } = calculateTotals();

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            member_uid: currentMember ? currentMember.uid : null,
            transaction_date: new Date().toISOString(), // Stores in UTC
            dealer_id: dealerId || null, // Add the dealer ID
            items_json: currentTransactionItems.map(item => ({
                itemId: item.id, // Use item.id as itemId
                name: item.name, // Add name from TransactionLineItem
                quantity: item.quantity,
                price: item.price,
                unit: item.unit, // Add unit from TransactionLineItem
                category: item.category, // Add category from TransactionLineItem
                selectedOptionId: item.selectedOptionId,
                itemCost: item.itemCost
            })),
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount_rate: parseFloat(discountRate.toFixed(4)), // Store as a decimal, e.g., 0.1 for 10%
            discount_amount: parseFloat(discountAmount.toFixed(2)),
            tax_amount: parseFloat(taxAmount.toFixed(2)),
            final_total: parseFloat(finalTotal.toFixed(2)),
            payment_method: paymentMethod,
            comment: transactionComment,
        };

        let stockUpdateSuccess = true;
        let stockUpdateMessage = "Stock updated successfully.";

        if (isFulfillingOrder && ordersBeingFulfilledIds.length > 0) {
            // This is an order fulfillment (single or bulk)
            const fulfillResult = await fulfillStockFromOrder(
                currentTransactionItems.map(item => ({ itemId: item.id, quantity: item.quantity })),
                inventoryItems
            );
            stockUpdateSuccess = fulfillResult.success;
            stockUpdateMessage = fulfillResult.message || "Failed to fulfill reserved stock.";

            if (stockUpdateSuccess) {
                // Mark the fulfilled orders as fulfilled
                const updatePayload = ordersBeingFulfilledIds.map(id => ({ id, status: 'fulfilled' as const }));
                const updateResponse = await fetch('/api/orders', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload),
                });
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    console.error('Failed to update fulfilled orders:', errorData.error || updateResponse.statusText);
                    showCustomAlert('Success!', `Order processed but failed to update order status: ${errorData.error || updateResponse.statusText}.`);
                } else {
                    setOrders(prev => prev.map(o => ordersBeingFulfilledIds.includes(o.id) ? { ...o, status: 'fulfilled' } : o));
                }
            } else {
                showCustomAlert('Transaction failed!', `${stockUpdateMessage}. Reserved stock not fully fulfilled.`);
                console.error('Order fulfillment stock update failed:', stockUpdateMessage);
                return; // Stop transaction process if stock fulfillment fails
            }
        } else {
            // This is a direct sale
            const stockUpdates: Partial<InventoryItem>[] = [];
            for (const item of currentTransactionItems) {
                const currentInvItem = inventoryItems.find(inv => inv.id === item.id);
                if (currentInvItem) {
                    stockUpdates.push({
                        ...currentInvItem,
                        id: item.id,
                        available_stock: (currentInvItem.available_stock ?? 0) - item.quantity,
                    });
                }
            }
            const directSaleStockUpdateResult = await updateStock(stockUpdates);
            stockUpdateSuccess = directSaleStockUpdateResult.success;
            stockUpdateMessage = directSaleStockUpdateResult.message || "Failed to update available stock during direct sale.";

            if (!stockUpdateSuccess) {
                showCustomAlert('Attention!', `Transaction processed, but failed to update available stock: ${stockUpdateMessage}. Please check inventory manually.`);
            }
        }

        // Proceed with transaction record creation if stock update was successful (or partially successful for direct sales)
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTransaction, items_json: JSON.stringify(newTransaction.items_json) }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to process transaction record: ${errorData.error || response.statusText}`);
        }

        // Update Member's Total Purchases
        if (currentMember) {
            const updatedTotalPurchases = (currentMember.total_purchases || 0) + finalTotal;
            const updatedMember: Partial<AppMember> = {
                id: currentMember.id,
                uid: currentMember.uid,
                total_purchases: parseFloat(updatedTotalPurchases.toFixed(2)),
            };

            const memberUpdateResponse = await fetch('/api/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([updatedMember]),
            });

            if (!memberUpdateResponse.ok) {
                const errorData = await memberUpdateResponse.json();
                console.error('Failed to update member purchases:', errorData.error || memberUpdateResponse.statusText);
                showCustomAlert('Attention!', `Transaction processed, but failed to update member purchases: ${errorData.error || memberUpdateResponse.statusText}.`);
            }
        }

        //* alert("Transaction processed successfully!");
        setLastProcessedTransaction({
            ...newTransaction,
            items: currentTransactionItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                unit: item.unit,
                category: item.category,
                quantity: item.quantity,
                subtotal: item.subtotal,
                selectedOptionId: item.selectedOptionId,
                itemCost: item.itemCost,
            })),
        });
        handleClearTransaction(); // Clears all transaction related states, including order fulfillment flags
        refreshData(); // Re-fetch all data including updated inventory and orders
        setIsReceiptModalOpen(true); // Open the receipt modal
        setDealerId(''); // Clear the field
        setTransactionComment(''); // Clear the comment field
        setShowCommentField(false); // Hide the comment field

    } catch (error: any) {
        showCustomAlert('Transaction failed:', `${error.message}`);
        console.error('Transaction error:', error);
    } finally {
        hideLoader();
    }
};
    // New function for printing logic, usable from multiple places
    const triggerPrint = useCallback(() => {
        if (!lastProcessedTransaction) {
            showCustomAlert('Print Error.', 'No receipt data available to print.');
            return;
        }

        // Generate the HTML content for the receipt, passing the company name
        const receiptHtml = generateReceiptHtml(
            lastProcessedTransaction,
            taxRate,
            members,
            formatCurrency,
            formatUtcToBangkok,
            membershipTiers,
            companyName // Pass the companyName state variable
        );

        // Open a new window and print the generated HTML
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(receiptHtml);
            printWindow.document.close();
            printWindow.focus();
            
            // Define a function to close the modal
            const closeReceiptModal = () => {
                setIsReceiptModalOpen(false);
            };

            // Use onafterprint for modern browsers
            printWindow.onafterprint = () => {
                printWindow.close();
                closeReceiptModal(); // Close the modal after print or cancel
            };

            // Fallback for browsers that don't support onafterprint or if it's not triggered
            // This setTimeout will run after a short delay and close the window/modal if still open.
            setTimeout(() => {
                if (!printWindow.closed) {
                    printWindow.close();
                    closeReceiptModal(); // Close the modal as a fallback
                }
            }, 1000); // Give a slightly longer delay (1 second) for user interaction

            printWindow.print(); // Initiate the print dialog

        } else {
            showCustomAlert('Print Error.', 'Could not open print window. Please allow pop-ups for this site.');
        }

        // Removed setShowReceipt(false) from here to prevent premature modal closure
        // The modal closure is now handled by onafterprint or the setTimeout fallback
    }, [lastProcessedTransaction, taxRate, members, formatCurrency, formatUtcToBangkok, membershipTiers, companyName]);

const handleApplyCustomDiscount = () => {
        const input = customDiscountInput.trim();
        if (!input) {
            setIsCustomDiscountApplied(false);
            setCustomDiscountAmount(0);
            setCustomDiscountPercentage(0);
            return;
        }

        const isPercentage = input.includes('%');
        const value = parseFloat(input.replace('%', ''));

        if (isNaN(value) || value < 0) {
            showCustomAlert('Invalid discount value.', 'Please enter a positive number or percentage (e.g., 10 or 10%).');
            return;
        }

        if (isPercentage) {
            if (value > 100) {
                showCustomAlert('Attention!', 'Percentage discount cannot exceed 100%.');
                return;
            }
            setCustomDiscountPercentage(value / 100);
            setCustomDiscountAmount(0); // Ensure amount is 0 if percentage is applied
            setIsCustomDiscountApplied(true);
            setIsMemberDiscountApplied(false);
        } else {
            setCustomDiscountAmount(value);
            setCustomDiscountPercentage(0); // Ensure percentage is 0 if amount is applied
            setIsCustomDiscountApplied(true);
            setIsMemberDiscountApplied(false);
        }
    };

    // Original PoS screen print button
    const handlePrintReceipt = () => {
        if (!lastProcessedTransaction) {
            // Using a simple message box instead of alert()
            showCustomAlert('Failed', 'No receipt available to print. Complete a transaction first.');
            return;
        }
        triggerPrint();
    };


    
    // --- New: Handle delete transaction from history ---
    const handleDeleteTransaction = (transactionId: string) => {
        setConfirmMessage("Are you sure you want to delete this transaction? This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/transactions/${transactionId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete transaction: ${errorData.error || response.statusText}`);
                }
                showCustomAlert('Success!', 'Transaction deleted successfully!');
                setShowConfirmModal(false);
                refreshData(); // Refresh data to show updated history
            } catch (error: any) {
                showCustomAlert('Failed', `Failed to delete transaction: ${error.message}`);
                console.error('Delete transaction error:', error);
            }
        });
        setShowConfirmModal(true);
    };

    
const handleClearAllTransactions = () => {
    setAdminConfirmTitle('Danger Zone: Delete All Transactions');
    setAdminConfirmMessage('This action is irreversible and will permanently delete all transaction history. This cannot be undone.');
    setAdminConfirmPhrase('DELETE ALL TRANSACTIONS');
    setAdminConfirmAction((username, password) => performClearAllTransactions(username, password));
    setShowAdminConfirmModal(true);
};
    // --- New: Handle clear all transactions ---
    // The main handler for the button click
// This function will be passed to the modal's onConfirm prop
const performClearAllTransactions = async (username: string, password: string) => {
    try {
        const response = await fetch('/api/transactions/clear', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }), 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to clear all transactions: ${errorData.error || response.statusText}`);
        }
        showCustomAlert('Success!', 'All transaction history cleared successfully!');
        refreshData();
    } catch (error: unknown) { // Add ': unknown' for clarity, though it's the default
        // Safely check if the error is an instance of the Error class
        if (error instanceof Error) {
            showCustomAlert('Error', `Failed to clear all transactions: ${error.message}`);
            console.error('Clear all transactions error:', error);
        } else {
            // Handle cases where the error is not a standard Error object
            showCustomAlert('Error', 'An unknown error occurred while clearing transactions.');
            console.error('Clear all transactions error:', error);
        }
    }
    setShowAdminConfirmModal(false);
};

    // --- NFC Simulation Logic ---
    const handleNfcScan = async () => {
        if (!nfcInput) {
            setNfcStatus('Please enter a UID to simulate scan.');
            return;
        }

        setNfcStatus('Scanning...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const foundMember = members.find(m => m.uid === nfcInput);

        if (foundMember) {
            setCurrentMember(foundMember);
            setCurrentOrderMemberUID(foundMember.uid); // Set UID for pending orders
            setNfcStatus(`Card Detected: ${foundMember.name} (${foundMember.tier})`);
        } else {
            setCurrentMember(null);
            setCurrentOrderMemberUID(null);
            setNfcStatus('Member not found. Please enter a valid UID.');
        }
    };

    const handleNfcRemove = () => {
    setCurrentMember(null);
    setNfcInput('');
    setNfcStatus('Card removed. Ready to scan...');
    setCurrentOrderMemberUID(null);
    setIsDiscountApplied(false);  // Reset discount state
};
    // --- Transaction History Filtering and Sorting Logic ---
        // --- Transaction History Filtering and Sorting Logic ---
    const handleHistorySort = (column: string) => {
    if (historySortColumn === column) {
        setHistorySortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
        setHistorySortColumn(column);
        // Default sort direction based on column type
        if (column === 'transaction_date' || column === 'final_total' || column === 'subtotal' || column === 'discount_amount') { // Removed tax_amount
            setHistorySortDirection('desc'); // Newer dates, higher values first
        } else {
            setHistorySortDirection('asc'); // Alphabetical for strings (member_name, comments, dealer_id)
        }
    }
};

  const filteredAndSortedTransactions = React.useMemo(() => {
    let filtered = transactions.filter(transaction => {
        const searchLower = historySearchTerm.toLowerCase();
        const member = members.find(m => m.uid === transaction.member_uid);
        const matchesMember = member ? member.name.toLowerCase().includes(searchLower) || (member.card_number?.toString() || '').toLowerCase().includes(searchLower) || (member.uid?.toString() || '').toLowerCase().includes(searchLower) : false;
        const matchesItems = Array.isArray(transaction.items_json) && transaction.items_json.some(item =>
            (item.name?.toLowerCase() || '').includes(searchLower) || // Safely access name
            (item.category?.toLowerCase() || '').includes(searchLower) // Safely access category
        );
        const matchesPaymentMethod = transaction.payment_method.toLowerCase().includes(searchLower);
        // Check if search term matches transaction ID, total price, comment, or dealer_id (converted to string)
        const matchesTransactionId = transaction.id.toLowerCase().includes(searchLower);
        const matchesTotal = transaction.final_total.toString().includes(searchLower);
        const matchesComment = (transaction.comment?.toLowerCase() || '').includes(searchLower);
        const matchesDealerId = (transaction.dealer_id?.toLowerCase() || '').includes(searchLower);

        // Date filtering logic
        const transactionDate = new Date(transaction.transaction_date);
        const start = historyStartDate ? new Date(historyStartDate) : null;
        const end = historyEndDate ? new Date(historyEndDate) : null;

        const isAfterStartDate = !start || transactionDate >= start;
        const isBeforeEndDate = !end || transactionDate <= end; // No need to add one day as transaction_date likely includes time

        return (
            (matchesMember || matchesItems || matchesPaymentMethod || matchesTransactionId || matchesTotal || matchesComment || matchesDealerId) &&
            isAfterStartDate &&
            isBeforeEndDate
        );
    });

    if (historySortColumn) {
        filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (historySortColumn) {
                case 'transaction_date':
                    aValue = new Date(a.transaction_date).getTime();
                    bValue = new Date(b.transaction_date).getTime();
                    break;
                case 'member_name':
                    aValue = members.find(m => m.uid === a.member_uid)?.name?.toLowerCase() || '';
                    bValue = members.find(m => m.uid === b.member_uid)?.name?.toLowerCase() || '';
                    break;
                case 'subtotal':
                    aValue = a.subtotal;
                    bValue = b.subtotal;
                    break;
                case 'discount_amount':
                    aValue = a.discount_amount;
                    bValue = b.discount_amount;
                    break;
                case 'comments':
                    aValue = a.comment?.toLowerCase() || '';
                    bValue = b.comment?.toLowerCase() || '';
                    break;
                case 'dealer_id':
                    aValue = a.dealer_id?.toLowerCase() || '';
                    bValue = b.dealer_id?.toLowerCase() || '';
                    break;
                case 'final_total':
                    aValue = a.final_total;
                    bValue = b.final_total;
                    break;
                case 'payment_method':
                    aValue = a.payment_method?.toLowerCase() || '';
                    bValue = b.payment_method?.toLowerCase() || '';
                    break;
                default:
                    // If no specific case, default to string comparison or 0 if undefined
                    aValue = (a as any)[historySortColumn]?.toString().toLowerCase() || '';
                    bValue = (b as any)[historySortColumn]?.toString().toLowerCase() || '';
            }

            // Ensure proper comparison for numbers and strings
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return historySortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            } else {
                return historySortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
        });
    }

    return filtered;
}, [transactions, historySearchTerm, historySortColumn, historySortDirection, members, historyStartDate, historyEndDate]); // Added historyStartDate and historyEndDate to dependency array
    
    // State for Transaction History Pagination
const [currentPageHistory, setCurrentPageHistory] = useState(1);
const [itemsPerPageHistory, setItemsPerPageHistory] = useState(10); // Default items per page for history

// Calculate total pages for history
const totalPagesHistory = useMemo(() => {
    return Math.ceil(filteredAndSortedTransactions.length / itemsPerPageHistory);
}, [filteredAndSortedTransactions.length, itemsPerPageHistory]);

// Get current transactions for the history table
const currentTransactions = useMemo(() => {
    const indexOfLastTransaction = currentPageHistory * itemsPerPageHistory;
    const indexOfFirstTransaction = indexOfLastTransaction - itemsPerPageHistory;
    return filteredAndSortedTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
}, [currentPageHistory, itemsPerPageHistory, filteredAndSortedTransactions]);

// Pagination handler for history
const paginateHistory = useCallback((pageNumber: number) => {
    setCurrentPageHistory(pageNumber);
}, []);

    // --- Member Management Logic ---
// Member mini-stats
const activeMembersCount = useMemo(() => {
        return members.filter(member => member.status === 'Active').length;
    }, [members]);

const topMemberName = useMemo(() => {
        const sortedMembers = [...members].sort((a, b) => {
            const purchasesA = a.total_purchases ?? 0; // Treat null/undefined as 0
            const purchasesB = b.total_purchases ?? 0;
            return purchasesB - purchasesA; // Descending order for top member
        });
        return sortedMembers.length > 0 ? sortedMembers[0].name : 'N/A';
    }, [members]);
    
    // --- Member Filtering and Sorting Logic ---
    const handleMemberSort = (column: string) => {
        if (memberSortColumn === column) {
            setMemberSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setMemberSortColumn(column);
            setMemberSortDirection('asc'); // Default to ascending when changing column
        }
    };

    const filteredAndSortedMembers = React.useMemo(() => {
        let filteredMembers = members.filter(member => {
            const searchLower = memberSearchTerm.toLowerCase();
            return (
                (member.card_number?.toString() || '').toLowerCase().includes(searchLower) || // Convert to string
                (member.uid?.toString() || '').toLowerCase().includes(searchLower) || // Convert to string
                member.name.toLowerCase().includes(searchLower) ||
                member.tier.toLowerCase().includes(searchLower) ||
                member.status.toLowerCase().includes(searchLower)
            );
        });

        if (memberSortColumn) {
            filteredMembers.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (memberSortColumn) {
                    case 'card_number':
                        aValue = a.card_number || '';
                        bValue = b.card_number || '';
                        break;
                    case 'uid':
                        aValue = a.uid || '';
                        bValue = b.uid || '';
                        break;
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'tier':
                        aValue = a.tier.toLowerCase();
                        bValue = b.tier.toLowerCase();
                        break;
                    case 'status':
                        aValue = a.status.toLowerCase();
                        bValue = b.status.toLowerCase();
                        break;
                    case 'total_purchases':
                        aValue = a.total_purchases ?? 0;
                        bValue = b.total_purchases ?? 0;
                        break;
                    default:
                        return 0;
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return memberSortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else {
                    // For numbers, direct comparison
                    return memberSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                }
            });
        }

        return filteredMembers;
    }, [members, memberSearchTerm, memberSortColumn, memberSortDirection]);

    // Pagination calculation for members
    const totalPagesMembers = Math.ceil(filteredAndSortedMembers.length / itemsPerPageMembers);
    const indexOfLastMember = currentPageMembers * itemsPerPageMembers;
    const indexOfFirstMember = indexOfLastMember - itemsPerPageMembers;
    const currentMembers = filteredAndSortedMembers.slice(indexOfFirstMember, indexOfLastMember);

    // Handler for changing page
    const paginateMembers = (pageNumber: number) => setCurrentPageMembers(pageNumber);

    // Add member
   // Add member
const handleAddMember = async () => {
    if (!newMemberData.uid || !newMemberData.cardNumber || !newMemberData.name) {
        showCustomAlert('Attention!', 'UID, Card Number, and Name are required for a new member.');
        hideLoader();
        return;
    }
    showLoader();
    try {
        const checkRes = await fetch(`/api/members`);
        const existingMembers = await checkRes.json();
        if (Array.isArray(existingMembers) && existingMembers.some((m: Member) => m.uid === newMemberData.uid || m.card_number === parseInt(newMemberData.cardNumber))) {
            showCustomAlert('Failed', 'Member with this UID or Card Number already exists.');
            hideLoader();
            return;
        }
    } catch (error) {
        console.error("Error checking existing members:", error);
        showCustomAlert('Error', 'Failed to check for existing members. Please try again.');
        hideLoader();
        return;
    }

    let prescriptionUrl = '';
    let prescriptionPath = '';
    const memberId = crypto.randomUUID(); // Generate ID early to use for filename

    if (prescriptionFile) {
        try {
            prescriptionPath = await uploadPrescriptionPdf(prescriptionFile, memberId);
            prescriptionUrl = await getPrescriptionPdfUrl(prescriptionPath);
        } catch (error) {
            console.error('Prescription upload error:', error);
            showCustomAlert('Attention!', 'Failed to upload prescription. Member will be added without one.');
        }
    }

    const memberToAdd: Member = {
        id: memberId,
        uid: newMemberData.uid,
        card_number: parseInt(newMemberData.cardNumber),
        name: newMemberData.name,
        tier: newMemberData.tier,
        phone: newMemberData.phone,
        email: newMemberData.email,
        status: newMemberData.status as Member['status'],
        total_purchases: 0.00,
        prescription_url: prescriptionUrl,
        prescription_path: prescriptionPath, // New field to store the path for future deletion
    };

    try {
        const response = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberToAdd),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to add member: ${errorData.error || response.statusText}`);
        }
        hideLoader();
        showCustomAlert('Success!', 'Member added successfully!');
        closeMemberModal();
        refreshData();
    } catch (error: any) {
        showCustomAlert('Error', `Failed to add member: ${error.message}`);
        console.error('Add member error:', error);
    } finally {
        hideLoader();
    }
};
    
    const handleUpdateMember = async () => {
    if (!editMemberId) return;

    showLoader(); // Show loader when invoice generation starts

    let prescriptionUrl = newMemberData.prescription_url;
    let prescriptionPath = newMemberData.prescription_path;

    // Handle file upload only if a new file is selected
    if (prescriptionFile) {
        try {
            if (newMemberData.prescription_path) {
                // If an old file exists, delete it first
                await deletePrescriptionPdf(newMemberData.prescription_path);
            }
            // Upload the new file
            prescriptionPath = await uploadPrescriptionPdf(prescriptionFile, editMemberId);
            prescriptionUrl = await getPrescriptionPdfUrl(prescriptionPath);
        } catch (error) {
            console.error('Prescription upload error:', error);
            showCustomAlert('Attention!', 'Failed to upload new prescription. Member will be updated without one.');
        }
    }

    // --- START OF MODIFICATION ---
    let existingTotalPurchases = 0; // Default value

    try {
        // Fetch the current member data to get the existing total_purchases
        const supabase = getClientSupabaseClient();
        const { data: existingMember, error: fetchError } = await supabase
            .from('members')
            .select('total_purchases')
            .eq('id', editMemberId)
            .single(); // Use .single() as we expect one member

        if (fetchError) {
            console.error('Error fetching existing member data:', fetchError);
            showCustomAlert('Error', 'Failed to retrieve existing member data.');
            hideLoader();
            return; // Stop execution if we can't get existing data
        }

        if (existingMember && typeof existingMember.total_purchases === 'number') {
            existingTotalPurchases = existingMember.total_purchases;
        }
    } catch (error: any) {
        console.error('API error fetching existing member:', error);
        showCustomAlert('Error', `Failed to fetch existing member: ${error.message}`);
        hideLoader();
        return;
    }
    // --- END OF MODIFICATION ---


    const memberToUpdate: Partial<Member> = {
        id: editMemberId,
        uid: newMemberData.uid,
        card_number: parseInt(newMemberData.cardNumber),
        name: newMemberData.name,
        tier: newMemberData.tier,
        phone: newMemberData.phone,
        email: newMemberData.email,
        status: newMemberData.status as Member['status'],
        prescription_url: prescriptionUrl,
        prescription_path: prescriptionPath, // Update the path as well
        // --- ADD THE EXISTING total_purchases HERE ---
        total_purchases: existingTotalPurchases,
    };

    try {
        const response = await fetch('/api/members', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([memberToUpdate]),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update member: ${errorData.error || response.statusText}`);
        }
        showCustomAlert('Success!', 'Member updated successfully!');
        closeMemberModal();
        refreshData();
    } catch (error: any) {
        showCustomAlert('Error', `Failed to update member: ${error.message}`);
        console.error('Update member error:', error);
    } finally {
        hideLoader(); // Hide loader after invoice generation
    }
};
const handleDeletePrescription = async (memberId: string, filePath: string) => {
    setConfirmMessage("Are you sure you want to delete this member's prescription? This action cannot be undone.");
    setConfirmAction(() => async () => {
        try {
            // Update the member record in the database first to remove the URL
            const response = await fetch('/api/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ id: memberId, prescription_url: null, prescription_path: null }]),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to remove prescription URL from member record: ${errorData.error || response.statusText}`);
            }

            // Now, delete the file from Supabase Storage
            await deletePrescriptionPdf(filePath);

            showCustomAlert('Success!', 'Prescription deleted successfully!');
            setShowConfirmModal(false);
            refreshData();
        } catch (error: any) {
            showCustomAlert('Error', `Failed to delete prescription: ${error.message}`);
            console.error('Delete prescription error:', error);
            setShowConfirmModal(false);
        }
    });
    setShowConfirmModal(true);
};

// Fulfill all pending orders for a specific member
const handleFulfillAllOrdersForMember = (memberUid: string) => {
    const member = members.find(m => m.uid === memberUid);
    if (!member) {
        showCustomAlert('Hmm...', 'Member not found.');
        return;
    }

    const ordersForMember = orders.filter(o => o.status === 'pending' && o.member_uid === memberUid);
    if (ordersForMember.length === 0) {
        showCustomAlert('Nothing to fulfill', 'This member has no pending orders.');
        return;
    }

    setConfirmMessage(`Load all ${ordersForMember.length} orders for ${member.name} into the PoS for fulfillment?`);
    setConfirmAction(() => () => {
        showLoader();
        const allItems = ordersForMember.flatMap(order =>
            order.items.map(orderItem => ({
                id: orderItem.itemId,
                name: orderItem.name,
                price: orderItem.price,
                unit: orderItem.unit,
                category: orderItem.category,
                quantity: orderItem.quantity,
                subtotal: orderItem.price * orderItem.quantity,
                selectedOptionId: orderItem.selectedOptionId,
                itemCost: inventoryItems.find(i => i.id === orderItem.itemId)?.cost_price || 0,
            }))
        );

        setCurrentTransactionItems(allItems);
        setCurrentMember(member);
        if (ordersForMember[0]?.dealer_id) {
            setDealerId(ordersForMember[0].dealer_id);
        }
        setIsFulfillingOrder(true);
        setOrderBeingFulfilledId(null); // indicator for bulk
        setOrdersBeingFulfilledIds(ordersForMember.map(o => o.id));
        setActiveScreen('pos');
        setShowConfirmModal(false);
        showCustomAlert('Processing...', `${ordersForMember.length} orders loaded into PoS. Click 'Process Payment' to complete fulfillment.`);
        hideLoader();
    });
    setShowConfirmModal(true);
};

    

const handleViewPrescription = (url: string) => {
    if (url) {
        window.open(url, '_blank');
    } else {
        showCustomAlert('Attention!', 'No prescription file available for this member.');
    }
};
    
   const handleDeleteMember = (memberId: string) => {
    setConfirmMessage("Are you sure you want to delete this member? This action cannot be undone.");
    setConfirmAction(() => async () => {
        showLoader();
        try {
            const response = await fetch(`/api/members/${memberId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to delete member: ${errorData.error || response.statusText}`);
            }
            // Using a simple message box instead of alert()
            showCustomAlert('Success!', 'Member deleted successfully!');
            setShowConfirmModal(false);
            refreshData();
        } catch (error: any) {
            // Using a simple message box instead of alert()
            showCustomAlert('Error', `Failed to delete member: ${error.message}`);
            console.error('Delete member error:', error);
        } finally {
            hideLoader();
        }
    });
    setShowConfirmModal(true);
};

    const openMemberForm = (member: AppMember | null = null) => {
    if (member) {
        setEditMemberId(member.id);
        setNewMemberData({
        uid: member.uid,
        cardNumber: member.card_number.toString(),
        name: member.name,
        tier: member.tier,
        phone: member.phone || '',
        email: member.email || '',
        status: member.status as 'Active' | 'Inactive' | 'Suspended',
        prescription_url: member.prescription_url || '',
        prescription_path: member.prescription_path || '',
    });
    } else {
        setEditMemberId(null);
        setNewMemberData({
            uid: '',
            cardNumber: '',
            name: '',
            tier: membershipTiers[0]?.name || '',
            phone: '',
            email: '',
            status: 'Active',
            prescription_url: '',
            prescription_path: ''
        });
    }
    setPrescriptionFile(null); // Reset file input
    setShowMemberModal(true);
};

    const closeMemberModal = () => {
    setShowMemberModal(false);
    setEditMemberId(null);
    setNewMemberData({
        uid: '',
        cardNumber: '',
        name: '',
        tier: membershipTiers[0]?.name || '',
        phone: '',
        email: '',
        status: 'Active',
        prescription_url: '',
        prescription_path: ''
    });
    setPrescriptionFile(null);
};

    // --- Inventory Management Logic ---
    // --- Inventory Filtering and Sorting Logic ---
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc'); // Default to ascending when changing column
        }
    };

    // This function can be placed with other function declarations (e.g., handleHistorySort)
const handleInventorySort = useCallback((column: 'name' | 'category' | 'available_stock' | 'reserved_stock') => {
    // If the same column is clicked, toggle the sort direction
    setInventorySortDirection(prevDirection =>
        inventorySortColumn === column ? (prevDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    );
    // Set the new sort column
    setInventorySortColumn(column);
    // Reset to the first page
    setCurrentPageInventory(1);
}, [inventorySortColumn]);

    const filteredAndSortedInventoryItems = React.useMemo(() => {
    let filteredItems = inventoryItems.filter(item => {
        const searchLower = inventorySearchTerm.toLowerCase();
        return (
            item.name.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.category.toLowerCase().includes(searchLower) ||
            item.id.toLowerCase().includes(searchLower) ||
            (item.barcode_id && item.barcode_id.toLowerCase().includes(searchLower)) ||
            item.pricing_options.some(option =>
                option.name.toLowerCase().includes(searchLower) ||
                option.unit.toLowerCase().includes(searchLower) ||
                option.price.toString().includes(searchLower)
            )
        );
    });

    if (inventorySortColumn) {
        filteredItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (inventorySortColumn) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    break;
                case 'category':
                    aValue = a.category?.toLowerCase() || '';
                    bValue = b.category?.toLowerCase() || '';
                    break;
                case 'available_stock':
                    aValue = a.available_stock ?? 0;
                    bValue = b.available_stock ?? 0;
                    break;
                case 'reserved_stock':
                    aValue = a.reserved_stock ?? 0;
                    bValue = b.reserved_stock ?? 0;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return inventorySortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return inventorySortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return filteredItems;
}, [inventoryItems, inventorySearchTerm, inventorySortColumn, inventorySortDirection]);

    const indexOfLastItemInventory = currentPageInventory * itemsPerPageInventory;
    const indexOfFirstItemInventory = indexOfLastItemInventory - itemsPerPageInventory;
    const currentInventoryItems = filteredAndSortedInventoryItems.slice(indexOfFirstItemInventory, indexOfLastItemInventory);
    const totalPagesInventory = Math.ceil(filteredAndSortedInventoryItems.length / itemsPerPageInventory);
    const paginateInventory = (pageNumber: number) => setCurrentPageInventory(pageNumber);

   const handleAddInventoryItem = async () => {
    if (!newInventoryItemData.name || newInventoryItemData.pricingOptions.length === 0 || newInventoryItemData.pricingOptions.some(p => !p.name || isNaN(p.price) || p.price <= 0 || !p.unit)) {
        // Using a simple message box instead of alert()
        showCustomAlert('Attention!', 'Item Name and at least one valid pricing option (with name, positive price, and unit) are required.');
        return;
    }

    showLoader();

    const itemToSave: InventoryItem = {
        id: editInventoryItemId || crypto.randomUUID(),
        name: newInventoryItemData.name,
        description: newInventoryItemData.description,
        category: newInventoryItemData.category,
        pricing_options: newInventoryItemData.pricingOptions,
        available_stock: newInventoryItemData.available_stock ?? 0,
        reserved_stock: newInventoryItemData.reserved_stock ?? 0,
        cost_price: newInventoryItemData.cost_price ?? 0,
        barcode_id: newInventoryItemData.barcode_id || generateBarcodeId(),
    };

    const method = editInventoryItemId ? 'PUT' : 'POST';
    const body = method === 'PUT' ? JSON.stringify([itemToSave]) : JSON.stringify(itemToSave);

    try {
        const response = await fetch('/api/inventory', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to ${editInventoryItemId ? 'update' : 'add'} inventory item: ${errorData.error || response.statusText}`);
        }
        // Using a simple message box instead of alert()
        showCustomAlert('Success!', `Inventory item ${editInventoryItemId ? `updated` : `added`} successfully!`);
        closeInventoryModal();
        refreshData();
    } catch (error: any) {
        // Using a simple message box instead of alert()
        showCustomAlert('Error', `Failed to ${editInventoryItemId ? 'update' : 'add'} item: ${error.message}`);
        console.error('Inventory item save error:', error);
    } finally {
        hideLoader();
    }
};

const handleDeleteInventoryItem = (itemId: string) => {
    setConfirmMessage("Are you sure you want to delete this inventory item? This action cannot be undone. This will also clear any associated reserved stock.");
    setConfirmAction(() => async () => {
        showLoader();
        try {
            const itemToDelete = inventoryItems.find(item => item.id === itemId);
            if (!itemToDelete) {
                throw new Error("Item not found.");
            }

            const response = await fetch(`/api/inventory/${itemId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to delete inventory item: ${errorData.error || response.statusText}`);
            }
            // Using a simple message box instead of alert()
            showCustomAlert('Success!', 'Inventory item deleted successfully!');
            setShowConfirmModal(false);
            refreshData();
        }
        catch (error: any) {
            // Using a simple message box instead of alert()
            showCustomAlert('Error', `Failed to delete item: ${error.message}`);
            console.error('Delete inventory item error:', error);
        } finally {
            hideLoader();
        }
    });
    setShowConfirmModal(true);
};

    const openInventoryForm = (item: AppInventoryItem | null) => { // Updated to accept null
        if (item) {
            setEditInventoryItemId(item.id);
            setNewInventoryItemData({
                name: item.name,
                description: item.description,
                category: item.category,
                pricingOptions: item.pricing_options.length > 0 ? item.pricing_options : [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
                available_stock: item.available_stock ?? 0,
                reserved_stock: item.reserved_stock || 0,
                cost_price: item.cost_price ?? 0,
                barcode_id: item.barcode_id || generateBarcodeId()

            });
        } else {
            setEditInventoryItemId(null);
            setNewInventoryItemData({
                name: '',
                description: '',
                category: 'Other',
                pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
                available_stock: 0,
                reserved_stock: 0,
                cost_price: 0,
                barcode_id: generateBarcodeId()

            });
        }
        setShowInventoryModal(true);
    };

    const closeInventoryModal = () => {
        setShowInventoryModal(false);
        setEditInventoryItemId(null);
        setNewInventoryItemData({
            name: '',
            description: '',
            category: 'Other',
            pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
            available_stock: 0,
            reserved_stock: 0,
            cost_price: 0,
            barcode_id: ''
        });
        setSuggestedIconName(null); // Clear suggested icon when closing modal
    };

    const handleAddPricingOption = () => {
        setNewInventoryItemData(prev => ({
            ...prev,
            pricingOptions: [...prev.pricingOptions, { id: crypto.randomUUID(), name: '', price: 0, unit: 'pieces' }]
        }));
    };

    const handleRemovePricingOption = (index: number) => {
        setNewInventoryItemData(prev => ({
            ...prev,
            pricingOptions: prev.pricingOptions.filter((_, i) => i !== index)
        }));
    };

    const handlePricingOptionChange = (index: number, field: keyof PricingOption, value: string | number) => {
        setNewInventoryItemData(prev => {
            const updatedOptions = [...prev.pricingOptions];
            if (field === 'price' && typeof value === 'string') {
                updatedOptions[index] = { ...updatedOptions[index], [field]: parseFloat(value) || 0 };
            } else {
                updatedOptions[index] = { ...updatedOptions[index], [field]: value };
            }
            return { ...prev, pricingOptions: updatedOptions };
        });
    };


    // --- Custom Category Logic ---
    const handleAddCategory = async () => {
        if (newCategoryName.trim() === '') {
            showCustomAlert('Attention!', 'Category name cannot be empty.');
            return;
        }
        if (allItemCategories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            showCustomAlert('Attention', 'Category already exists.');
            return;
        }

        const newCategory: Category = {
            id: crypto.randomUUID(),
            name: newCategoryName.trim(),
            icon_name: suggestedIconName || 'CircleDashed', // Use suggested icon name or default
        };

        try {
            const supabase = getClientSupabaseClient();
            const { data, error } = await supabase
                .from('categories')
                .insert([newCategory])
                .select(); // Use .select() to return the inserted data

            if (error) {
                throw new Error(error.message);
            }
            if (data && data.length > 0) {
                // Add the new category to the local state
                setAllItemCategories(prev => [...prev, data[0]]); // Supabase returns the inserted row
                showCustomAlert('Success!', 'Category added successfully!');
                setNewCategoryName('');
                setSuggestedIconName(null); // Clear suggested icon name
                setShowAddCategoryModal(false);
            } else {
                 throw new Error("Category insertion failed, no data returned.");
            }
        } catch (e: any) {
            console.error('Error adding category:', e);
            showCustomAlert('Error', 'Failed to add category: ${e.message}');
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        setConfirmMessage("Are you sure you want to delete this category? Items assigned to this category will revert to 'Other'. This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                 
                // First, reassign any inventory items in this category to 'Other'
                const itemsToUpdate = inventoryItems.filter(item => item.category === allItemCategories.find(cat => cat.id === categoryId)?.name);
                const updatePromises = itemsToUpdate.map(item =>
                    fetch('/api/inventory', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([{ ...item, id: item.id, category: 'Other' }]), // Pass item.id for update
                    })
                );
                await Promise.all(updatePromises);

                const supabase = getClientSupabaseClient();
                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', categoryId);

                if (error) {
                    throw new Error(error.message);
                }

                showCustomAlert('Success!', 'Category deleted successfully!');
                setShowConfirmModal(false);
                refreshData(); // Refresh all data to reflect category and inventory changes
            } catch (e: any) {
                console.error('Error deleting category:', e);
                showCustomAlert('Error', 'Failed to delete category: ${e.message}');
            }
        });
        setShowConfirmModal(true);
    };


    // --- Order Management Logic ---

const handleAddOrder = async () => {
    if (!newOrderData.dealerId) {
        showCustomAlert('Attention!', 'Dealer ID is required to create an order.');
        return;
    }

    if (!newOrderData.memberUid || newOrderData.items.length === 0) {
        showCustomAlert('Attention!', 'Member UID and at least one item are required for an order.');
        return;
    }

    // Check if there's enough available stock for each item in the order
    for (const orderItem of newOrderData.items) {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.itemId);
        // Displaying available_stock correctly without subtracting reserved_stock for order creation check
        if (!inventoryItem || (inventoryItem.available_stock ?? 0) < orderItem.quantity) {
            showCustomAlert('Stock Alert!', 'Not enough available stock for ${orderItem.name}. Only ${(inventoryItem?.available_stock ?? 0)}, Requested: ${orderItem.quantity}');
            return;
        }
    }

    showLoader();

    // Reserve stock for the order
    const reservationResult = await reserveStockForOrder(
        newOrderData.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
        inventoryItems
    );

    if (!reservationResult.success) {
        showCustomAlert('Failed', 'Failed to create order: ${reservationResult.message}');
        hideLoader();
        return;
    }

    const orderTotal = newOrderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderToSave: Order = {
        id: crypto.randomUUID(),
        member_uid: newOrderData.memberUid,
        dealer_id: newOrderData.dealerId || null,
        items_json: newOrderData.items.map(item => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            category: item.category,
            selectedOptionId: item.selectedOptionId,
        })),
        total_price: parseFloat(orderTotal.toFixed(2)),
        status: 'pending', // Set initial status to pending
        order_date: new Date().toISOString(),
        comment: newOrderData.comment || null, // Add the comment here
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...orderToSave, items_json: JSON.stringify(orderToSave.items_json) }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to add order: ${errorData.error || response.statusText}`);
        }
        showCustomAlert('Success!', 'Order added successfully!');
        closeOrderModal();
        refreshData();
    } catch (error: any) {
        // If order creation fails, attempt to release the reserved stock
        await releaseStockFromOrder(
            newOrderData.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
            inventoryItems
        );
        showCustomAlert('Error', `Failed to add order: ${error.message}. Reserved stock has been released.`);
        console.error('Add order error:', error);
    } finally {
        hideLoader();
    }
};

const handleOrderStatusChange = async (orderId: string, newStatus: 'pending' | 'fulfilled' | 'cancelled') => {
    try {
        const response = await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ id: orderId, status: newStatus }]),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || response.statusText);
        }
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error: any) {
        showCustomAlert('Error', `Failed to update order status: ${error.message}`);
        console.error('Update order status error:', error);
    }
};

const promptOrderStatusChange = (orderId: string, newStatus: 'pending' | 'fulfilled' | 'cancelled') => {
    setAdminConfirmTitle('Change Order Status');
    setAdminConfirmMessage(`Are you sure you want to mark order #${orderId.substring(0, 8)} as ${newStatus}?`);
    setAdminConfirmPhrase('CONFIRM STATUS');
    setAdminConfirmAction(async (_username, _password) => {
        showLoader();
        try {
            if (newStatus === 'cancelled') {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    const releaseResult = await releaseStockFromOrder(order.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })), inventoryItems);
                    if (!releaseResult.success) {
                        showCustomAlert('Error', releaseResult.message || 'Failed to release stock.');
                        return;
                    }
                }
            }
            await handleOrderStatusChange(orderId, newStatus);
            if (newStatus === 'cancelled') {
                showCustomAlert('Success!', 'Order cancelled and stock released successfully!');
            } else {
                showCustomAlert('Success!', `Order marked as ${newStatus}.`);
            }
        } catch (error: any) {
            showCustomAlert('Error', error.message);
            console.error('Order status change error:', error);
        } finally {
            hideLoader();
            setShowAdminConfirmModal(false);
        }
    });
    setShowAdminConfirmModal(true);
};


const handleCancelOrder = (order: AppOrder) => {
    setOrderToCancel(order);
    setConfirmMessage(`Are you sure you want to cancel order ${order.id}? This will release reserved stock.`);
    setConfirmAction(() => async () => {
        if (!orderToCancel) return;

        showLoader();

        const releaseResult = await releaseStockFromOrder(
            orderToCancel.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
            inventoryItems
        );

        if (releaseResult.success) {
            try {
                await handleOrderStatusChange(orderToCancel.id, 'cancelled');
                showCustomAlert('Success!', 'Order cancelled and stock released successfully!');
            } catch (error: any) {
                showCustomAlert('Error', `Failed to update order status: ${error.message}`);
                console.error('Order cancellation error:', error);
            }
        } else {
            // This is the corrected line for the 'else' block
            showCustomAlert('Error', `Failed to cancel order: ${releaseResult.message || 'Unknown error'}`);
        }
        setShowConfirmModal(false);
        setOrderToCancel(null);
        hideLoader();
    });
    setShowConfirmModal(true);
};

// Modified handleFulfillOrder to load items to PoS
const handleFulfillOrder = (orderToFulfill: AppOrder) => {
    const orderMember = members.find(m => m.uid === orderToFulfill.member_uid);
    if (!orderMember) {
        // Corrected code with the function call
        showCustomAlert('Hmm...', 'Member associated with this order not found. Cannot fulfill.');
        return;
    }

    setConfirmMessage(`Are you sure you want to load order #${orderToFulfill.id.substring(0, 8)} for ${orderMember.name || 'Unknown Member'} into the PoS for fulfillment?`);
    setConfirmAction(() => () => {
        showLoader();
        // Set transaction items from the order
        setCurrentTransactionItems(orderToFulfill.items.map(orderItem => {
            const invItem = inventoryItems.find(inv => inv.id === orderItem.itemId);
            const selectedOpt = invItem?.pricing_options.find(opt => opt.id === orderItem.selectedOptionId);
            return {
                id: orderItem.itemId,
                name: orderItem.name,
                price: orderItem.price,
                unit: orderItem.unit,
                category: orderItem.category,
                quantity: orderItem.quantity,
                subtotal: orderItem.price * orderItem.quantity,
                selectedOptionId: orderItem.selectedOptionId,
                itemCost: invItem?.cost_price || 0,
            };
        }));

        // Set current member
        setCurrentMember(orderMember);
        // Prefill dealer ID from order
        if (orderToFulfill.dealer_id) {
            setDealerId(orderToFulfill.dealer_id);
        }

        // Set flags for order fulfillment
        setIsFulfillingOrder(true);
        setOrderBeingFulfilledId(orderToFulfill.id);
        setOrdersBeingFulfilledIds([orderToFulfill.id]);

        // Navigate to PoS screen
        setActiveScreen('pos');
        setShowConfirmModal(false); // Close confirmation modal
        showCustomAlert('Processing...', `Order #${orderToFulfill.id.substring(0, 8)} loaded into PoS. Click 'Process Payment' to complete fulfillment.`);
        hideLoader();
    });
    setShowConfirmModal(true);
};

    const openOrderForm = (order: AppOrder | null = null) => {
        if (order) {
            setEditOrderId(order.id);
            setNewOrderData({
                memberUid: order.member_uid,
                dealerId: order.dealer_id || '',
                comment: order.comment || '',
                items: order.items,
            });
        } else {
            setEditOrderId(null);
            setNewOrderData({
                memberUid: '',
                dealerId: '',
                comment: '',
                items: [],
            });
        }
        setShowOrderModal(true);
    };

    const closeOrderModal = () => {
        setShowOrderModal(false);
        setEditOrderId(null);
        setNewOrderData({
            memberUid: '',
            dealerId: '',
            comment: '',
            items: [],
        });
    };

    const handleAddOrderItem = (item: AppInventoryItem, selectedOption: PricingOption, quantity: number, manualPrice: number) => {
  setNewOrderData(prev => ({
    ...prev,
    items: [
      ...prev.items,
      {
        itemId: item.id,
        name: item.name,
        quantity,
        price: manualPrice, // use manual price instead of selectedOption.price
        unit: selectedOption.unit,
        category: item.category,
        selectedOptionId: selectedOption.id,
      }
    ]
  }));
};


    const handleRemoveOrderItem = (indexToRemove: number) => {
        setNewOrderData(prev => ({
            ...prev,
            items: prev.items.filter((_, index) => index !== indexToRemove),
        }));
    };


    // --- UI Calculations for Current Transaction ---
    const { subtotal, discountRate, discountAmount, taxAmount, finalTotal } = calculateTotals();
// Handler for sorting columns in Orders table
   const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
const [sortColumnOrders, setSortColumnOrders] = useState<'id' | 'member_name' | 'total_price' | 'status' | 'created_at' | null>(null);
const [sortDirectionOrders, setSortDirectionOrders] = useState<'asc' | 'desc'>('asc');
const [currentPageOrders, setCurrentPageOrders] = useState(1);
const [itemsPerPageOrders, setItemsPerPageOrders] = useState(10);

const handleSortOrders = useCallback((column: 'id' | 'member_name' | 'total_price' | 'status' | 'created_at') => {
    setSortDirectionOrders(prevDirection =>
        sortColumnOrders === column ? (prevDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    );
    setSortColumnOrders(column);
    setCurrentPageOrders(1); // Reset to first page on sort change
}, [sortColumnOrders]);

const filteredAndSortedOrders = React.useMemo(() => {
    let filteredItems = orders.filter(order => {
        const searchLower = ordersSearchTerm.toLowerCase();
        const member = members.find(m => m.uid === order.member_uid);
        const memberName = member ? member.name.toLowerCase() : '';
        const memberUid = order.member_uid.toLowerCase();
        const itemsList = order.items.map(item => item.name).join(' ').toLowerCase();
        const itemsUidList = order.items.map(item => item.itemId).join(' ').toLowerCase();

        // Add created_at to the search filter
        const createdAtDate = order.created_at ? new Date(order.created_at).toLocaleString().toLowerCase() : '';

        return (
            order.id.toLowerCase().includes(searchLower) ||
            memberName.includes(searchLower) ||
            memberUid.includes(searchLower) ||
            (order.comment && order.comment.toLowerCase().includes(searchLower)) ||
            order.status.toLowerCase().includes(searchLower) ||
            itemsList.includes(searchLower) ||
            itemsUidList.includes(searchLower) ||
            createdAtDate.includes(searchLower) // Include created_at in search
        );
    });

    if (sortColumnOrders) {
        filteredItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortColumnOrders) {
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'member_name':
                    aValue = members.find(m => m.uid === a.member_uid)?.name?.toLowerCase() || '';
                    bValue = members.find(m => m.uid === b.member_uid)?.name?.toLowerCase() || '';
                    break;
                case 'total_price':
                    aValue = a.total_price;
                    bValue = b.total_price;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'created_at': 
                    // Convert to Date objects for proper chronological sorting
                    aValue = a.created_at ? new Date(a.created_at) : new Date(0); // Use epoch for null/invalid dates
                    bValue = b.created_at ? new Date(b.created_at) : new Date(0); // Use epoch for null/invalid dates
                    break;
                default:
                    return 0;
            }

            // Custom comparison logic for Date objects or mixed types
            if (sortColumnOrders === 'created_at') {
                if (sortDirectionOrders === 'asc') {
                    return aValue.getTime() - bValue.getTime();
                } else {
                    return bValue.getTime() - aValue.getTime();
                }
            } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirectionOrders === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else {
                // For numbers (like total_price) or other comparable types
                return sortDirectionOrders === 'asc' ? aValue - bValue : bValue - aValue;
            }
        });
    }

    return filteredItems;
}, [orders, ordersSearchTerm, members, sortColumnOrders, sortDirectionOrders]); // Add members to dependencies

const indexOfLastOrder = currentPageOrders * itemsPerPageOrders;
const indexOfFirstOrder = indexOfLastOrder - itemsPerPageOrders;
const currentOrders = filteredAndSortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);
const totalPagesOrders = Math.ceil(filteredAndSortedOrders.length / itemsPerPageOrders);
const paginateOrders = (pageNumber: number) => setCurrentPageOrders(pageNumber);


    
    // --- Filtered Transaction History ---
    const filteredTransactions = transactions.filter(t => {
        const member = members.find(m => m.uid === t.member_uid);
        const memberName = member ? member.name.toLowerCase() : '';
        const transactionItemsNames = Array.isArray(t.items) ? t.items.map(item => item.name.toLowerCase()).join(' ') : '';
        const searchLower = searchTerm.toLowerCase();

        return (
            JSON.stringify(t).toLowerCase().includes(searchLower) ||
            memberName.includes(searchLower) ||
            transactionItemsNames.includes(searchLower)
        );
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    
        // Define pendingOrders as a useMemo that filters allTransactions
    const pendingOrders = useMemo(() => {
        return orders.filter(order => order.status === 'pending');
    }, [orders]);
    
     const totalOrdersValue = useMemo(() => {
                      return pendingOrders.reduce((sum: number, order: AppOrder) => sum + order.total_price, 0);
                    }, [pendingOrders]);
                // Calculate total cost price for the transaction    // Filtered Pending Orders for Current Member (on PoS screen)
    const pendingOrdersForCurrentMember = orders.filter(order =>
        order.status === 'pending' && order.member_uid === currentOrderMemberUID
    );

    // Calculate total available and reserved stock for the Inventory tab header
    const totalAvailableStock = inventoryItems.reduce((sum, item) => sum + item.available_stock, 0);
    const totalReservedStock = inventoryItems.reduce((sum, item) => sum + (item.reserved_stock ?? 0), 0);
// THESE ARE THE LINES THAT MUST BE INSIDE THE App FUNCTION
    const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
    const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<number | null>(null);


    // --- Menu Layout Management Logic ---
    const handleAddMenuLayout = () => {
        if (!editMenuLayoutData?.name.trim()) {
            // Using a simple message box instead of alert()
            showCustomAlert('Attention', 'Menu layout name cannot be empty.');
            return;
        }
        if (menuLayouts.some(l => l.name.toLowerCase() === editMenuLayoutData.name.trim().toLowerCase() && l.id !== editMenuLayoutData.id)) {
            // Using a simple message box instead of alert()
            showCustomAlert('Attention', 'A menu layout with this name already exists.');
            return;
        }

        if (editMenuLayoutData.id) { // Editing existing layout
            setMenuLayouts(prev => prev.map(l => l.id === editMenuLayoutData.id ? editMenuLayoutData : l));
        } else { // Adding new layout
            setMenuLayouts(prev => [...prev, { ...editMenuLayoutData, id: crypto.randomUUID() }]);
        }
        setShowMenuLayoutModal(false);
        setEditMenuLayoutData(null);
    };

    const handleDeleteMenuLayout = (layoutId: string) => {
        setConfirmMessage("Are you sure you want to delete this menu layout? This action cannot be undone.");
        setConfirmAction(() => () => {
            setMenuLayouts(prev => prev.filter(l => l.id !== layoutId));
            // If the deleted layout was active, switch to the first available layout
            if (activeMenuLayoutId === layoutId && menuLayouts.length > 1) {
                // Ensure the new active ID is from the filtered list, not the old state.
                const remainingLayouts = menuLayouts.filter(l => l.id !== layoutId);
                setActiveMenuLayoutId(remainingLayouts.length > 0 ? remainingLayouts[0].id : '');
            } else if (menuLayouts.length === 1 && activeMenuLayoutId === layoutId) {
                setActiveMenuLayoutId(''); // No layouts left
            }
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    const openMenuLayoutForm = (layout: MenuLayout | null = null) => {
        setEditMenuLayoutData(layout ? { ...layout } : { id: '', name: '', categories: allItemCategories.map(c => c.name) }); // Default new layout to all categories
        setShowMenuLayoutModal(true);
    };

    const toggleCategoryInLayout = (categoryName: string) => {
        setEditMenuLayoutData(prev => {
            if (!prev) return null;
            const updatedCategories = prev.categories.includes(categoryName)
                ? prev.categories.filter(cat => cat !== categoryName)
                : [...prev.categories, categoryName];
            return { ...prev, categories: updatedCategories };
        });
    };

    // Get categories for the currently active menu layout
    const activeMenuCategories = activeMenuLayoutId
        ? menuLayouts.find(l => l.id === activeMenuLayoutId)?.categories || []
        : allItemCategories.map(c => c.name);

    // Handler for when an icon is suggested from the CategoryIconSuggester
    const handleIconSuggested = (iconName: string | null) => {
  if (iconName) {
    setSuggestedIconName(iconName);
  } else {
    setSuggestedIconName(null);
  }
  setShowCategoryIconSuggester(false);
};

    if (!isLoggedIn) {
        return (
            <div className="fixed inset-0 bg-[var(--color-bg-primary)] flex items-center justify-center z-50 p-4">
                <div className="bg-black-900 p-8 rounded-lg shadow-xl max-w-sm w-full border border-[var(--color-border)]">
                    <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)] text-center flex items-center justify-center">
                        <LogIn className="w-7 h-7 mr-2" />
                        Login
                    </h3>
                    {loginError && (
                        <p className="text-[var(--color-danger)] text-sm mb-4 text-center">{loginError}</p>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="loginNfcInput" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">NFC UID (Scan or Enter)</label>
                            <input
                                type="text"
                                id="loginNfcInput"
                                value={loginNfcInput}
                                onChange={(e) => {
                                    setLoginNfcInput(e.target.value);
                                    if (e.target.value) { // Clear username/password if UID is entered
                                        setLoginUsername('');
                                        setLoginPassword('');
                                    }
                                }}
                                placeholder="e.g., 0410C5D7A93F"
                                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm"
                            />
                        </div>
                        <div className="text-center text-[var(--color-text-secondary)]">- OR -</div>
                        <div>
                            <label htmlFor="loginUsername" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Username</label>
                            <input
                                type="text"
                                id="loginUsername"
                                value={loginUsername}
                                onChange={(e) => {
                                    setLoginUsername(e.target.value);
                                    if (e.target.value) setLoginNfcInput(''); // Clear UID if username is entered
                                }}
                                placeholder="Enter username"
                                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="loginPassword" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                id="loginPassword"
                                value={loginPassword}
                                onChange={(e) => {
                                    setLoginPassword(e.target.value);
                                    if (e.target.value) setLoginNfcInput(''); // Clear UID if password is entered
                                }}
                                placeholder="Enter password"
                                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="w-full px-5 py-3 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md flex items-center justify-center mt-6"
                        >
                            <LogIn className="w-5 h-5 mr-2" />
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] text-red-400 flex items-center justify-center">
                <p className="text-xl">Error: {error}. Please refresh the page.</p>
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter p-4 flex flex-col">
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-[var(--color-bg-secondary)] p-8 rounded-lg shadow-xl max-w-sm w-full border border-[var(--color-border)]">
                        <h3 className="text-xl font-semibold mb-4 text-[var(--color-primary)]">Confirm Action</h3>
                        <p className="text-[var(--color-text-primary)] mb-6">{confirmMessage}</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmAction) confirmAction();
                                }}
                                className="px-5 py-2 rounded-lg bg-[var(--color-danger)] hover:text-[var(--color-danger)] font-medium hover:hover:bg-[var(--color-danger)] transition-colors duration-200 shadow"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

             {/* Header Section */}
      <div className="flex justify-between items-center bg-[var(--color-bg-tertiary)] p-4 rounded-lg shadow-md mb-4 border border-[var(--color-border)]">
        <h1 className="text-3xl font-bold text-[var(--color-primary)] flex items-center">
    {/* Use your horizontal logo.png here */}
    <img
      src="/logo1.png" // Path to your horizontal logo in the public directory
      alt="Dank PoS"
      className="h-10 mr-2" // Adjust height (h-) as needed, width will auto-adjust to maintain aspect ratio
      style={{ width: 'auto' }} // Ensure width adjusts based on height and aspect ratio
    />
          {/* If using Next.js Image component (recommended for optimization) */}
          {/* <Image
            src="/Слой 1.png" // Path from public directory
            alt="Dank PoS Logo"
            width={40} // Specify width in pixels
            height={40} // Specify height in pixels
            className="mr-2" // Add margin for spacing
          /> */}
        </h1>
        <Clock />
        <div className="text-md text-[var(--color-text-secondary)] flex items-center">
          <span className="font-semibold text-[var(--color-text-secondary)] mr-2">Storage:</span> Supabase
          <button
            onClick={handleLogout}
            className="ml-4 px-3 py-1 bg-[var(--color-danger)] hover:text-[var(--color-danger)] rounded-md hover:hover:bg-[var(--color-danger)] transition-colors text-sm font-medium"
          >
            Logout
          </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={() => setActiveScreen('menu')}
                    className={`px-6 py-3 rounded-l-lg font-semibold transition-all duration-200 ${activeScreen === 'menu' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <Grid className="w-5 h-5 inline-block mr-2" />
                    Menu
                </button>
                <button
                    onClick={() => setActiveScreen('pos')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'pos' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <ShoppingCart className="w-5 h-5 inline-block mr-2" />
                    PoS
                </button>
                <button
                    onClick={() => setActiveScreen('members')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'members' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <Users className="w-5 h-5 inline-block mr-2" />
                    Members
                </button>
                <button
                    onClick={() => setActiveScreen('history')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'history' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <History className="w-5 h-5 inline-block mr-2" />
                    History
                </button>
                <button
                    onClick={() => setActiveScreen('inventory')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'inventory' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <Package className="w-5 h-5 inline-block mr-2" />
                    Inventory
                </button>
                <button
                    onClick={() => setActiveScreen('orders')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'orders' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <ShoppingBag className="w-5 h-5 inline-block mr-2" /> {/* Reusing ShoppingBag for orders */}
                    Orders
                </button>
                <button
                    onClick={() => setActiveScreen('reports')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'reports' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <PieChart className="w-5 h-5 inline-block mr-2" /> {/* New icon for reports */}
                    Reports
                </button>
                        <button
                            onClick={() => setActiveScreen('invoices')}
                            className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'invoices' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                                    >
                                    <FileText className="w-5 h-5 inline-block mr-2" />
                                Invoices
                        </button>
                <button
                    onClick={() => setActiveScreen('settings')}
                    className={`px-6 py-3 rounded-r-lg font-semibold transition-all duration-200 ${activeScreen === 'settings' ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-lg' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]'}`}
                >
                    <Settings className="w-5 h-5 inline-block mr-2" />
                    Settings
                </button>
            </div>

            {/* Main Content Area - Menu Screen */}
            {activeScreen === 'menu' && (
                <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
                    <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center justify-between">
                        <span className="flex items-center">
                            <Grid className="w-6 h-6 mr-2" />
                            Select a Menu Category
                        </span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1  pb-4">
                        {/* Display allItemCategories, filtered by activeMenuCategories */}
                        {allItemCategories
                            .filter(category => activeMenuCategories.includes(category.name))
                            .map(category => {
                                const IconComponent = getCategoryIcon(category.name);
                                return (
                                    <button
                                        key={category.id} // Use category.id as key
                                        onClick={() => {
                                            setSelectedCategoryFilter(category.name);
                                            setShowItemSelectionModal(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-[var(--color-bg-secondary)] rounded-xl shadow-lg hover:bg-[var(--color-border)] transition-colors duration-200 transform hover:scale-105 text-[var(--color-primary)] border border-[var(--color-border)]"
                                    >
                                        <IconComponent className="w-16 h-16 mb-3" />
                                        <span className="text-xl font-semibold text-[var(--color-text-primary)]">{category.name}</span>
                                    </button>
                                );
                            })}
                    </div>
                    {/* Menu Layout Switcher Buttons */}
                    <div className="mt-6 flex flex-wrap justify-center gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                        <span className="text-lg font-semibold text-[var(--color-text-primary)] mr-2">Switch Layout:</span>
                        {menuLayouts.map(layout => (
                            <button
                                key={layout.id}
                                onClick={() => setActiveMenuLayoutId(layout.id)}
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-200 ${activeMenuLayoutId === layout.id ? 'bg-[var(--color-primary)] text-[var(--color-text-tertiary)] shadow-md' : 'bg-[var(--color-border)] text-[var(--color-text-primary)] hover:hover:bg-[var(--color-border)]'}`}
                            >
                                {layout.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

                        {/* Main Content Area - PoS Screen */}
            {activeScreen === 'pos' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Member Info Panel */}
                    <div className="lg:col-span-1 flex flex-col bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)]">
                        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center">
                            <Users className="w-6 h-6 mr-2" />
                            Member Information
                        </h2>
                        <div className="mb-4">
                            <label className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Simulate NFC Scan (Enter UID):</label>
                            <input
                                type="text"
                                value={nfcInput}
                                onChange={(e) => setNfcInput(e.target.value)}
                                placeholder="e.g., 0410C5D7A93F"
                                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm"
                            />
                            
                            <div className="flex space-x-2 mt-3">
                                <button
                                    onClick={handleNfcScan}
                                    className="flex-1 bg-[var(--color-primary)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md flex items-center justify-center"
                                >
                                    <Scan className="w-5 h-5 mr-2" />
                                    Scan Card
                                </button>
                                <button
                                    onClick={handleNfcRemove}
                                    className="flex-1 bg-[var(--color-border)] text-[var(--color-text-primary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow-md flex items-center justify-center"
                                >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Remove Card
                                </button>
                            </div>
                        </div>
                        <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
                            NFC Status: <span className={nfcStatus.includes('Detected') ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>{nfcStatus}</span>
                        </div>
                        <div className="border-t border-[var(--color-border)] pt-4 flex-1 overflow-y-auto custom-scrollbar">
                            {currentMember ? (
                                <div className="space-y-3">
                                    <p className="text-xl font-bold text-[var(--color-primary)]">Name: {currentMember.name}</p>
                                    <p className="text-lg text-[var(--color-text-primary)]">Card No: {currentMember.card_number}</p>
                                    <p className="text-lg text-[var(--color-text-primary)]">Tier: <span className="font-semibold">{currentMember.tier}</span></p>
                                    <p className="text-lg text-[var(--color-text-primary)]">Discount: <span className="font-semibold text-red-400">{getDiscountRate(currentMember.tier) * 100}%</span></p>
                                    <p className="text-lg text-[var(--color-text-primary)]">Total Purchases: <span className="font-semibold">{formatCurrency(currentMember.total_purchases || 0)}</span></p>
                                    {/* Add the new Apply Discount button */}
                                   <button
    onClick={() => {
        if (isMemberDiscountApplied) {
            // If currently applied, remove it
            setIsMemberDiscountApplied(false);
        } else {
            // If not applied, try to apply
            if (currentMember) {
                setIsMemberDiscountApplied(true);
                setIsCustomDiscountApplied(false); // Ensure custom discount is removed if member discount is applied
                setCustomDiscountInput('');
                setCustomDiscountAmount(0);
                setCustomDiscountPercentage(0);
            } else {
                showCustomAlert('Attention', 'Please scan a member card or select a member to apply member discount.');
            }
        }
    }}
    className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-md flex items-center justify-center ${
        isMemberDiscountApplied
        ? 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-dark)]' // Changed hover styles
        : 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success-dark)]' // Changed hover styles
    }`}
>
    {isMemberDiscountApplied ? 'Remove Member Discount' : 'Apply Member Discount'}
</button>
                                    {/* Display Pending Orders for Current Member */}
                                    {pendingOrdersForCurrentMember.length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                                            <h3 className="text-xl font-bold text-[var(--color-warning)] mb-3">Pending Orders:</h3>
                                            <div className="space-y-3">
                                                {pendingOrdersForCurrentMember.map(order => (
                                                    <div key={order.id} className="bg-[var(--color-bg-secondary)] p-3 rounded-lg border border-[var(--color-border)]">
                                                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">Order ID: {order.id.substring(0, 8)}</p>
                                                        <p className="text-sm text-[var(--color-text-primary)]">Total: {formatCurrency(order.total_price)}</p>
                                                        <ul className="list-disc list-inside text-sm text-[var(--color-text-secondary)] mb-2">
                                                            {order.items.map((item, idx) => (
                                                                <li key={idx}>{item.name} ({item.quantity} {item.unit})</li>
                                                            ))}
                                                        </ul>
                                                        {order.comment && <p className="text-sm text-[var(--color-text-secondary)] italic">Comment: {order.comment}</p>}
                                                        <button
                                                            onClick={() => handleFulfillOrder(order)}
                                                            className="mt-2 w-full bg-[var(--color-success)] hover:text-[var(--color-danger)] px-3 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-success)] transition-colors"
                                                        >
                                                            Fulfill Order
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--color-text-secondary)] py-8">No member card scanned.</p>
                            )}
                        </div>
                    </div>

                    {/* Transaction Panel */}
                    <div className="lg:col-span-2 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
                        <div className="flex items-center justify-between mb-4"> {/* New flex container for heading and input */}
                            <h2 className="text-2xl font-bold text-[var(--color-primary)] flex items-center">
                                <ShoppingCart className="w-6 h-6 mr-2" />
                                Current Transaction
                                {isFulfillingOrder && ordersBeingFulfilledIds.length > 0 && (
                                    ordersBeingFulfilledIds.length === 1 ? (
                                        <span className="ml-3 px-3 py-1 bg-[var(--color-info)] hover:text-[var(--color-danger)] text-sm rounded-full">Fulfilling Order #{ordersBeingFulfilledIds[0].substring(0, 8)}</span>
                                    ) : (
                                        <span className="ml-3 px-3 py-1 bg-[var(--color-info)] hover:text-[var(--color-danger)] text-sm rounded-full">Fulfilling {ordersBeingFulfilledIds.length} Orders</span>
                                    )
                                )}
                            </h2>
                           {/* Dealer ID input and Comment button */}
                            <div className="flex-1 ml-4 flex items-center space-x-2 relative"> {/* Added space-x-2 for gap */}
                                <label htmlFor="dealer-id" className="sr-only">Dealer ID</label>
                                <input
                                    id="dealer-id"
                                    type="text"
                                    placeholder="Scan Dealer Card or enter Dealer ID"
                                    value={dealerId}
                                    onChange={(e) => setDealerId(e.target.value)}
                                    className="flex-grow px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm"
                                />
                                {dealerId && (
                                    <button
                                        type="button"
                                        onClick={() => setDealerId('')}
                                        className="absolute right-12 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                                        aria-label="Clear Dealer ID"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                )}
                                {/* New Comment Button */}
                                <button
                                    onClick={() => setShowCommentField(!showCommentField)}
                                    className="bg-[var(--color-accent)] text-white p-2 rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors duration-200 shadow-md flex items-center justify-center"
                                    title={showCommentField ? "Hide Comment" : "Add Comment"}
                                >
                                    <MessageSquare className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                       
                        {/* Retractable Comment Text Field */}
                                    {showCommentField && (
                                        <div className="mb-4 transition-all duration-300 ease-in-out transform origin-top"
                                            style={{ maxHeight: showCommentField ? '200px' : '0', overflow: 'hidden' }}> {/* Animation trick */}
                                            <label htmlFor="transaction-comment" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Transaction Comment:</label>
                                            <textarea
                                                id="transaction-comment"
                                                value={transactionComment}
                                                onChange={(e) => setTransactionComment(e.target.value)}
                                                placeholder="Add a comment for this transaction..."
                                                rows={3} // Adjust rows as needed
                                                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition duration-150 ease-in-out bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm custom-scrollbar"
                                            ></textarea>
                                        </div>
                                    )}
                        
                        {/* Current Items List */}
                        <div className="flex-1 overflow-y-auto border border-[var(--color-border)] rounded-lg mb-4 bg-[var(--color-bg-secondary)] custom-scrollbar">
                            {currentTransactionItems.length === 0 ? (
                                <p className="text-center text-[var(--color-text-secondary)] py-10">No items added yet. Select from menu or directly below.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-[var(--color-border)]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Qty ({'Unit'})</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Subtotal</th>
<th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[var(--color-bg-secondary)] divide-y divide-gray-700">
                                        {currentTransactionItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{item.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{formatCurrency(item.price)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{item.quantity} {item.unit}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-primary)]">{formatCurrency(item.subtotal)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Adjusted text-align */}
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-[var(--color-danger)] hover:text-[var(--color-danger)] transition duration-150 ease-in-out"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Totals Display */}
                        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border)] space-y-2 mb-4">
                            <div className="flex justify-between text-lg font-medium text-[var(--color-text-primary)]">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-[var(--color-text-primary)]">
                                <span>Discount ({currentMember ? (getDiscountRate(currentMember.tier) * 100).toFixed(0) : 0}%):</span>
                                <span className="text-red-400">- {formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-[var(--color-text-primary)]">
                                <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-[var(--color-text-primary)]">
                                <span>Payment Method:</span>
                                <span className="capitalize">{selectedPaymentMethod || 'N/A'}</span> {/* Display selected payment method */}
                            </div>
                            <div className="flex justify-between text-3xl font-bold text-[var(--color-primary)] pt-2 border-t border-[var(--color-border)]">
                                <span>Final Total:</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={handleClearTransaction}
                                className="bg-[var(--color-warning)] hover:text-[var(--color-danger)] px-5 py-3 rounded-lg font-semibold hover:hover:bg-[var(--color-warning)] transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5 inline-block mr-2" />
                                Clear Transaction
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                className="bg-[var(--color-primary)] text-[var(--color-text-tertiary)] px-5 py-3 rounded-lg font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <CheckCircle className="w-5 h-5 inline-block mr-2" />
                                Process Payment
                            </button>
                            <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                placeholder="Custom Discount (e.g., 10% or 50 THB)"
                                value={customDiscountInput}
                                onChange={(e) => setCustomDiscountInput(e.target.value)}
                                className="flex-grow p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-background-soft)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                            />
                            <button
                                onClick={handleApplyCustomDiscount}
                                className="bg-[var(--color-accent)] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[var(--color-accent-dark)] transition-colors duration-200 shadow-md"
                            >
                                Apply
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}


  {/* Main Content Area - Members Screen */}
{activeScreen === 'members' && (
    <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
        {/* Top Row: Title and Stats */}
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center justify-between">
            <span className="flex items-center">
                <Users className="w-6 h-6 mr-2" />
                Member Management
            </span>
            {/* Stats aligned to the right, similar to Inventory */}
            <div className="text-base font-normal text-[var(--color-text-primary)] flex items-center space-x-4">
                <span>Active Members: <span className="font-semibold text-[var(--color-primary)]">{activeMembersCount}</span></span>
                <span>Top Member: <span className="font-semibold text-[var(--color-success)]">{topMemberName}</span></span>
            </div>
        </h2>

        {/* Second Row: Buttons and Search Input */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
            {/* Buttons Group */}
            <button
                onClick={() => openMemberForm()}
                className="bg-[var(--color-primary)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
            >
                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                Add New Member
            </button>
            <button
                onClick={refreshData}
                className="px-5 py-2 rounded-lg bg-[var(--color-info)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-info)] transition-colors duration-200 shadow">
                Refresh
            </button>

            {/* Search Input with Clear Button - pushed to the right */}
            <div className="relative flex-grow max-w-xs md:max-w-64 ml-auto">
                <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] w-5 h-5" />
                {memberSearchTerm && (
                    <button
                        type="button"
                        onClick={() => setMemberSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                        aria-label="Clear Search"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        {/* ... rest of the Member Management content ... */}
        {filteredAndSortedMembers.length === 0 && memberSearchTerm !== '' ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No members found matching your search.</p>
        ) : filteredAndSortedMembers.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No members registered yet.</p>
        ) : (
            <div className="overflow-x-auto flex-grow custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-700 table-auto">
                    <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('card_number')}>
                                <div className="flex items-center">Card No. {memberSortColumn === 'card_number' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('uid')}>
                                <div className="flex items-center">UID {memberSortColumn === 'uid' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('name')}>
                                <div className="flex items-center">Name {memberSortColumn === 'name' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('tier')}>
                                <div className="flex items-center">Tier {memberSortColumn === 'tier' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('status')}>
                                <div className="flex items-center">Status {memberSortColumn === 'status' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]" onClick={() => handleMemberSort('total_purchases')}>
                                <div className="flex items-center">Total Purchases {memberSortColumn === 'total_purchases' && (memberSortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}</div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Prescription</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--color-bg-tertiary)] divide-y divide-gray-700">
                        {currentMembers.map((member) => (
                            <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{member.card_number}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{member.uid}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">{member.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{member.tier}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{member.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{formatCurrency(member.total_purchases || 0)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                    {member.prescription_url ? (
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleViewPrescription(member.prescription_url!)}
                                                className="text-[var(--color-info)] hover:text-blue-300 transition duration-150 ease-in-out"
                                            >
                                                <FileText className="w-4 h-4 inline-block mr-1" /> View
                                            </button>
                                            <button
                                                onClick={() => handleDeletePrescription(member.id, member.prescription_path!)}
                                                className="text-[var(--color-danger)] hover:text-red-700 transition duration-150 ease-in-out"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-[var(--color-text-secondary)]">No file</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                    <button
                                        onClick={() => openMemberForm(member)}
                                        className="text-[var(--color-primary)] hover:text-yellow-300 mr-3 transition duration-150 ease-in-out"
                                    >
                                        <Edit2 className="w-4 h-4 inline-block mr-1" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMember(member.id)}
                                        className="text-[var(--color-danger)] hover:text-[var(--color-danger)] transition duration-150 ease-in-out"
                                    >
                                        <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Smarter Pagination Controls for Members Table */}
                {totalPagesMembers > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="itemsPerPageMembers" className="text-[var(--color-text-primary)] text-sm">Items per page:</label>
                            <select
                                id="itemsPerPageMembers"
                                value={itemsPerPageMembers}
                                onChange={(e) => {
                                    setItemsPerPageMembers(Number(e.target.value));
                                    setCurrentPageMembers(1); // Reset to first page on items per page change
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
                                onClick={() => paginateMembers(currentPageMembers - 1)}
                                disabled={currentPageMembers === 1}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-[var(--color-text-primary)] text-sm px-3 py-1">
                                Page {currentPageMembers} of {totalPagesMembers}
                            </span>
                            <button
                                onClick={() => paginateMembers(currentPageMembers + 1)}
                                disabled={currentPageMembers === totalPagesMembers}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        )}
    </div>
)}


                             {/* Main Content Area - History Screen */}
{activeScreen === 'history' && (
    <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center">
            <History className="w-6 h-6 mr-2" />
            Transaction History
        </h2>

        {/* Adjusted Filter Controls for History Screen */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
            <button
                onClick={refreshData}
                className="px-5 py-2 rounded-lg bg-[var(--color-info)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-info)] transition-colors duration-200 shadow flex-shrink-0"
            >
                Refresh
            </button>

            <div className="flex items-center gap-4 flex-grow">
                <div>
                    <label htmlFor="historyStartDate" className="sr-only">Start Date</label>
                    <input
                        type="date"
                        id="historyStartDate"
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                        className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] w-full"
                        aria-label="Start Date"
                    />
                </div>
                <div>
                    <label htmlFor="historyEndDate" className="sr-only">End Date</label>
                    <input
                        type="date"
                        id="historyEndDate"
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                        className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] w-full"
                        aria-label="End Date"
                    />
                </div>

                
                {dateShortcuts.map((shortcut) => (
                    <button
                        key={`history-${shortcut.label}`} // Ensure unique key
                        onClick={() => {
                            const { startDate, endDate } = shortcut.handler();
                            // Use applyDateRange with history screen's setters
                            applyDateRange(startDate, endDate, setHistoryStartDate, setHistoryEndDate);
                        }}
                        className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-semibold hover:bg-[var(--color-border)] transition-colors duration-200 shadow-md flex-shrink-0"
                    >
                        {shortcut.label}
                    </button>
                ))}

                {/* Clear Filters Button for History */}
                <button
                    onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setHistorySearchTerm('');
                        setCurrentPageHistory(1);
                    }}
                    className="px-5 py-2 rounded-lg bg-[var(--color-danger)] text-white font-semibold hover:bg-[var(--color-danger-dark)] transition-colors duration-200 shadow-md flex items-center justify-center h-fit"
                    >
                    Clear Filters
                </button>
            </div>
            
            {/* History Search Bar with Clear Button */}
            <div className="flex-grow max-w-xs relative"> {/* Added relative for positioning */}
                <label htmlFor="historySearch" className="sr-only">Search Transactions</label>
                <input
                    type="text"
                    id="historySearch"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Search by ID, Member, or Item..."
                    className="w-full px-4 py-2 pl-10 pr-10 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] w-5 h-5" />
                {historySearchTerm && ( // Conditionally render clear button
                    <button
                        type="button"
                        onClick={() => setHistorySearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                        aria-label="Clear Search"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
            
        </div>
        {filteredAndSortedTransactions.length === 0 && historySearchTerm !== '' ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No transactions found matching your search criteria.</p>
        ) : filteredAndSortedTransactions.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No transactions found.</p>
        ) : (
            <div className="overflow-x-auto flex-grow custom-scrollbar"> {/* Added flex-grow */}
                <table className="min-w-full divide-y divide-gray-700 table-auto"> {/* Added table-auto */}
                    <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('transaction_date')}
                            >
                                <div className="flex items-center">
                                    Date
                                    {historySortColumn === 'transaction_date' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('member_name')}
                            >
                                <div className="flex items-center">
                                    Member
                                    {historySortColumn === 'member_name' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('subtotal')}
                            >
                                <div className="flex items-center">
                                    Subtotal
                                    {historySortColumn === 'subtotal' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('discount_amount')}
                            >
                                <div className="flex items-center">
                                    Discount
                                    {historySortColumn === 'discount_amount' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            {/* Removed Tax Column */}
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('dealer_id')} // New Dealer ID column
                            >
                                <div className="flex items-center">
                                    Dealer ID
                                    {historySortColumn === 'dealer_id' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('comments')} // New Comments column
                            >
                                <div className="flex items-center">
                                    Comments
                                    {historySortColumn === 'comments' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('final_total')}
                            >
                                <div className="flex items-center">
                                    Total
                                    {historySortColumn === 'final_total' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Items</th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)]"
                                onClick={() => handleHistorySort('payment_method')}
                            >
                                <div className="flex items-center">
                                    Payment
                                    {historySortColumn === 'payment_method' && (
                                        historySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--color-bg-tertiary)] divide-y divide-gray-700">
                        {currentTransactions.map((transaction) => { // Changed to currentTransactions for pagination
                            const member = members.find(m => m.uid === transaction.member_uid);
                            const isRowExpanded = expandedHistoryRows.get(transaction.id) || false;
                            const showExpandButton = Array.isArray(transaction.items_json) && transaction.items_json.length > 2;

                            return (
                                <tr key={transaction.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                        {formatUtcToBangkok(transaction.transaction_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                        {member ? `${member.name} (${member.card_number})` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{formatCurrency(transaction.subtotal)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">- {formatCurrency(transaction.discount_amount)}</td>
                                    {/* Removed Tax Amount Cell */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                        {transaction.dealer_id || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--color-text-primary)] max-w-xs overflow-hidden text-ellipsis">
                                        {transaction.comment || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[var(--color-primary)]">{formatCurrency(transaction.final_total)}</td>
                                    {/* Items Column with Expand/Collapse */}
                                    <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                                        <div
                                            style={{
                                                // Adjust max-height as needed to fit 1 or 2 lines of items initially
                                                maxHeight: isRowExpanded ? 'none' : '3em', // e.g., '3em' for approximately 2 lines
                                                overflow: 'hidden',
                                                transition: 'max-height 0.3s ease-in-out' // Smooth transition for expand/collapse
                                            }}
                                        >
                                            <ul className="list-disc list-inside">
                                                {Array.isArray(transaction.items_json) && transaction.items_json.map((item, i) => (
                                                    <li key={i}>{item.name} (x{item.quantity} {item.unit})</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {showExpandButton && (
                                            <button
                                                onClick={() => toggleHistoryRowExpand(transaction.id)}
                                                className="text-[var(--color-info)] hover:underline text-xs mt-1"
                                            >
                                                {isRowExpanded ? 'Show Less' : 'Show More'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)] capitalize">{transaction.payment_method}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setLastProcessedTransaction(transaction);
                                                setIsReceiptModalOpen(true);
                                            }}
                                            className="text-blue-500 hover:text-[var(--color-info)] mr-3 transition duration-150 ease-in-out"
                                        >
                                            <Printer className="w-4 h-4 inline-block mr-1" /> Print
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Smarter Pagination Controls for History Table */}
                {totalPagesHistory > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="itemsPerPageHistory" className="text-[var(--color-text-primary)] text-sm">Items per page:</label>
                            <select
                                id="itemsPerPageHistory"
                                value={itemsPerPageHistory}
                                onChange={(e) => {
                                    setItemsPerPageHistory(Number(e.target.value));
                                    setCurrentPageHistory(1); // Reset to first page on items per page change
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
                                onClick={() => paginateHistory(currentPageHistory - 1)}
                                disabled={currentPageHistory === 1}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-[var(--color-text-primary)] text-sm px-3 py-1">
                                Page {currentPageHistory} of {totalPagesHistory}
                            </span>
                            <button
                                onClick={() => paginateHistory(currentPageHistory + 1)}
                                disabled={currentPageHistory === totalPagesHistory}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        )}
    </div>
)}

{/* Main Content Area - Inventory Screen */}
{activeScreen === 'inventory' && (
    <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center justify-between">
            <span className="flex items-center">
                <Package className="w-6 h-6 mr-2" />
                Inventory Management
            </span>
            <div className="text-base font-normal text-[var(--color-text-primary)] flex items-center space-x-4">
                <span>Total Available: <span className="font-semibold text-[var(--color-success)]">{totalAvailableStock}</span></span>
                <span>Total Reserved: <span className="font-semibold text-[var(--color-warning)]">{totalReservedStock}</span></span>
            </div>
        </h2>
        <div className="flex flex-wrap gap-4 mb-4 items-center">
            <button
                onClick={() => openInventoryForm(null)}
                className="bg-[var(--color-primary)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
            >
                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                Add New Item
            </button>
            <button
                onClick={() => setShowAddCategoryModal(true)}
                className="bg-[var(--color-purple)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-purple)] transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
            >
                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                Add New Category
            </button>
            <button
                onClick={refreshData}
                className="px-5 py-2 rounded-lg bg-[var(--color-info)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-info)] transition-colors duration-200 shadow">
                Refresh
            </button>
            {/* Inventory Search Input with Clear Button */}
            <div className="relative flex-grow max-w-xs md:max-w-64 ml-auto"> {/* Added relative and flex-grow */}
                <input
                    type="text"
                    placeholder="Search inventory items (name, description, category, ID, barcode)"
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] w-5 h-5" />
                {inventorySearchTerm && ( // Conditionally render clear button
                    <button
                        type="button"
                        onClick={() => setInventorySearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                        aria-label="Clear Search"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
        {filteredAndSortedInventoryItems.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No inventory items found matching your criteria.</p>
        ) : (
            <div className="overflow-x-auto flex-grow custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                                onClick={() => handleInventorySort('name')}
                            >
                                <span className="flex items-center">
                                    Item Name
                                    {inventorySortColumn === 'name' && (
                                        inventorySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                                    )}
                                </span>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Price Options</th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                                onClick={() => handleInventorySort('category')}
                            >
                                <span className="flex items-center">
                                    Category
                                    {inventorySortColumn === 'category' && (
                                        inventorySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                                    )}
                                </span>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                                onClick={() => handleInventorySort('available_stock')}
                            >
                                <span className="flex items-center">
                                    Available
                                    {inventorySortColumn === 'available_stock' && (
                                        inventorySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </span>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                                onClick={() => handleInventorySort('reserved_stock')}
                            >
                                <span className="flex items-center">
                                    Reserved
                                    {inventorySortColumn === 'reserved_stock' && (
                                        inventorySortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </span>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--color-bg-tertiary)] divide-y divide-gray-700">
                        {currentInventoryItems.map((item) => {
                            const ItemIcon = getCategoryIcon(item.category);
                            return (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)] flex items-center">
                                        <ItemIcon className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                                        {item.pricing_options.map((option, idx) => (
                                            <div key={option.id || idx}>
                                                {option.name}: {formatCurrency(option.price)} / {option.unit}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{item.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-success)]">{item.available_stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-warning)]">{item.reserved_stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                        <button
                                            onClick={() => openInventoryForm(item)}
                                            className="text-[var(--color-primary)] hover:text-yellow-300 mr-3 transition duration-150 ease-in-out"
                                        >
                                            <Edit2 className="w-4 h-4 inline-block mr-1" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteInventoryItem(item.id)}
                                            className="text-[var(--color-danger)] hover:text-[var(--color-danger)] transition duration-150 ease-in-out"
                                        >
                                            <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Smarter Pagination Controls for Inventory Table */}
                {totalPagesInventory > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="itemsPerPageInventory" className="text-[var(--color-text-primary)] text-sm">Items per page:</label>
                            <select
                                id="itemsPerPageInventory"
                                value={itemsPerPageInventory}
                                onChange={(e) => {
                                    setItemsPerPageInventory(Number(e.target.value));
                                    setCurrentPageInventory(1); // Reset to first page on items per page change
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
                                onClick={() => paginateInventory(currentPageInventory - 1)}
                                disabled={currentPageInventory === 1}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-[var(--color-text-primary)] text-sm px-3 py-1">
                                Page {currentPageInventory} of {totalPagesInventory}
                            </span>
                            <button
                                onClick={() => paginateInventory(currentPageInventory + 1)}
                                disabled={currentPageInventory === totalPagesInventory}
                                className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                )}
            </div>
        )}
    </div>
)}



{/* Main Content Area - Orders Screen */}
{activeScreen === 'orders' && (
    <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
        <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center justify-between">
            <span className="flex items-center">
                <ShoppingBag className="w-6 h-6 mr-2" />
                Order Management
            </span>
            {/* New: Total Orders and Total Money in Orders */}
            <div className="text-base font-normal text-[var(--color-text-primary)] flex items-center space-x-4">
                <span>Total Orders: <span className="font-semibold text-[var(--color-primary)]">{pendingOrders.length}</span></span>
                <span>Total Value: <span className="font-semibold text-[var(--color-success)]">{formatCurrency(totalOrdersValue)}</span></span>
            </div>
        </h2>
        <div className="flex flex-wrap gap-4 mb-4 items-center">
            <button
                onClick={refreshData}
                className="px-5 py-2 rounded-lg bg-[var(--color-info)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-info)] transition-colors duration-200 shadow"
            >
                Refresh
            </button>
            <button
                onClick={() => openOrderForm()}
                className="bg-[var(--color-primary)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow-md w-fit flex items-center justify-center mr-3"
            >
                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                Create New Order
            </button>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Member UID"
                    value={bulkFulfillMemberUid}
                    onChange={(e) => setBulkFulfillMemberUid(e.target.value)}
                    className="px-4 py-2 pr-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                />
                {bulkFulfillMemberUid && (
                    <button
                        type="button"
                        onClick={() => setBulkFulfillMemberUid('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                        aria-label="Clear UID"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
            <button
                onClick={() => handleFulfillAllOrdersForMember(bulkFulfillMemberUid)}
                className="bg-[var(--color-success)] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[var(--color-success-dark)] transition-colors duration-200 shadow-md"
            >
                Fulfill All
            </button>

            {/* Search Field with Clear Button */}
            <div className="relative flex-grow max-w-xs md:max-w-64 ml-auto"> {/* Added relative and flex-grow */}
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={ordersSearchTerm}
                    onChange={(e) => setOrdersSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all duration-150 ease-in-out"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] w-5 h-5" />
                {ordersSearchTerm && ( // Conditionally render clear button
                    <button
                        type="button"
                        onClick={() => setOrdersSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                        aria-label="Clear Search"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        {filteredAndSortedOrders.length === 0 && !ordersSearchTerm ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No orders currently.</p>
        ) : filteredAndSortedOrders.length === 0 && ordersSearchTerm ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">No orders found matching your search.</p>
        ) : (
            <>
                <div className="overflow-x-auto mt-4 flex-grow custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[var(--color-bg-secondary)]">
                            <tr>
                                {/* Order ID Column */}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => handleSortOrders('id')}
                                >
                                    <div className="flex items-center">
                                        Order ID
                                        {sortColumnOrders === 'id' && (
                                            sortDirectionOrders === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                {/* Member Column */}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => handleSortOrders('member_name')}
                                >
                                    <div className="flex items-center">
                                        Member
                                        {sortColumnOrders === 'member_name' && (
                                            sortDirectionOrders === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Items</th>
                                {/* Total Price Column */}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => handleSortOrders('total_price')}
                                >
                                    <div className="flex items-center">
                                        Total Price
                                        {sortColumnOrders === 'total_price' && (
                                            sortDirectionOrders === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                {/* New Creation Date Column */}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => handleSortOrders('created_at')}
                                >
                                    <div className="flex items-center">
                                        Creation Date
                                        {sortColumnOrders === 'created_at' && (
                                            sortDirectionOrders === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Comment</th>
                                {/* Status Column */}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                                    onClick={() => handleSortOrders('status')}
                                >
                                    <div className="flex items-center">
                                        Status
                                        {sortColumnOrders === 'status' && (
                                            sortDirectionOrders === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--color-bg-tertiary)] divide-y divide-gray-700">
                            {currentOrders.map((order) => {
                                const member = members.find(m => m.uid === order.member_uid);
                                const rowClass = order.status !== 'pending' ? 'opacity-60 pointer-events-none' : '';
                                return (
                                    <tr key={order.id} className={rowClass}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{order.id.substring(0, 8)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                            {member ? `${member.name} (${member.card_number})` : `UID: ${order.member_uid}`}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                                            <ul className="list-disc list-inside">
                                                {order.items.map((item, i) => (
                                                    <li key={i}>{item.name} ({item.quantity} {item.unit})</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-primary)]">{formatCurrency(order.total_price)}</td>
                                        {/* Display Creation Date */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                                            {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--color-text-primary)] max-w-xs overflow-hidden text-ellipsis">{order.comment}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {order.status === 'pending' ? (
                                                <select
                                                    value={order.status}
                                                    onChange={e =>
                                                        promptOrderStatusChange(order.id, e.target.value as 'pending' | 'cancelled')
                                                    }
                                                    className="bg-transparent border-none focus:ring-0 text-sm text-yellow-500"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            ) : (
                                                <span
                                                    className={`text-sm ${
                                                        order.status === 'fulfilled'
                                                            ? 'text-green-500'
                                                            : 'text-red-500'
                                                    }`}
                                                >
                                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => handleFulfillOrder(order)}
                                                    className="mr-3 px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition duration-150 ease-in-out"
                                                >
                                                    Fulfill
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Smarter Pagination Controls for Orders Table */}
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="itemsPerPageOrders" className="text-[var(--color-text-primary)] text-sm">Items per page:</label>
                        <select
                            id="itemsPerPageOrders"
                            value={itemsPerPageOrders}
                            onChange={(e) => {
                                setItemsPerPageOrders(Number(e.target.value));
                                setCurrentPageOrders(1); // Reset to first page on items per page change
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
                            onClick={() => paginateOrders(currentPageOrders - 1)}
                            disabled={currentPageOrders === 1}
                            className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-[var(--color-text-primary)] text-sm px-3 py-1">
                            Page {currentPageOrders} of {totalPagesOrders}
                        </span>
                        <button
                            onClick={() => paginateOrders(currentPageOrders + 1)}
                            disabled={currentPageOrders === totalPagesOrders}
                            className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </nav>
                </div>
            </>
        )}
    </div>
)}


               {/* Main Content Area - Reports Screen */}
        {activeScreen === 'reports' && (
            <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
                <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-6 flex items-center">
                    <PieChart className="w-6 h-6 mr-2" />
                    Sales Reports
                </h2>

                {/* Filter Controls for Reports */}
                <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div>
                        <label htmlFor="memberFilter" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Filter by Member:</label>
                        <select
                            id="memberFilter"
                            value={selectedReportMemberUid || ''}
                            onChange={(e) => setSelectedReportMemberUid(e.target.value || null)}
                            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                        >
                            <option value="">All Members</option>
                            {members.map(member => (
                                <option key={member.uid} value={member.uid}>{member.name} ({member.card_number})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">End Date:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                        />
                    </div>

                    {/* Date Shortcut Buttons for Reports */}
                    {dateShortcuts.map((shortcut) => (
                        <button
                            key={shortcut.label}
                            onClick={() => {
                                const { startDate, endDate } = shortcut.handler();
                                applyDateRange(startDate, endDate, setReportStartDate, setReportEndDate);
                            }}
                            className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-semibold hover:bg-[var(--color-border)] transition-colors duration-200 shadow-md flex items-center justify-center h-fit"
                        >
                            {shortcut.label}
                        </button>
                    ))}

                    {/* Clear Filters Button for Reports */}
                    <button
                        onClick={() => {
                            setSelectedReportMemberUid(null);
                            setReportStartDate('');
                            setReportEndDate('');
                        }}
                            className="px-5 py-2 rounded-lg bg-[var(--color-danger)] text-white font-semibold hover:bg-[var(--color-danger-dark)] transition-colors duration-200 shadow-md flex items-center justify-center h-fit"
                        >

                        Clear Filters
                    </button>
                </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

           {/* UPDATED: Overall Sales Summary */}
                    <ReportWidget title="Overall Sales Summary" icon={PieChart}>
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center text-[var(--color-text-primary)]">
                                <ShoppingCart className="w-5 h-5 mr-2 text-[var(--color-accent)]" />
                                <span className="font-medium text-lg">Transactions:</span>
                                <span className="text-2xl font-bold ml-auto">{totalReportTransactions}</span>
                            </div>
                            <div className="flex items-center text-[var(--color-text-primary)]">
                                <DollarSign className="w-5 h-5 mr-2 text-[var(--color-success)]" />
                                <span className="font-medium text-lg">Revenue:</span>
                                <span className="text-2xl font-bold ml-auto">{formatCurrency(totalReportRevenue)}</span>
                            </div>
                            <div className="flex items-center text-[var(--color-text-primary)]">
                                <Coins className="w-5 h-5 mr-2 text-[var(--color-info)]" />
                                <span className="font-medium text-lg">COGS:</span>
                                <span className="text-2xl font-bold ml-auto">{formatCurrency(totalCostOfGoodsSold)}</span>
                            </div>
                        </div>
                        <ProfitMarginGauge marginPercent={profitMarginPercent} />
                        <p className="text-sm text-center mt-2 text-[var(--color-text-primary)]">
                            Profit Margin: {profitMarginPercent.toFixed(1)}%
                        </p>
                        <div className="overflow-hidden mt-2 text-xs text-[var(--color-text-primary)]">
                            <div className="animate-marquee space-x-8">
                                {highscoreMessages.map((msg, idx) => (
                                    <span key={idx}>{msg}</span>
                                ))}
                            </div>
                        </div>
                    </ReportWidget>

                    {/* UPDATED: Total Gross Profit with Sparkline */}
                    <ReportWidget
                        title="Total Gross Profit"
                        icon={CreditCard}
                        sparklineData={totalGrossProfitSparklineData} // Pass sparkline data
                        sparklineDataKey="value" // Key for the value in sparkline data
                        sparklineLineColor="var(--color-success)" // Match your theme's success color
                    >
                        <p className="text-4xl font-bold text-[var(--color-success)]">
                            {formatCurrency(totalGrossProfit)}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            {totalGrossProfitChangePercent !== null ? `${totalGrossProfitChangePercent.toFixed(1)}% from prev period` : 'N/A'}
                        </p>
                    </ReportWidget>

                    {/* UPDATED: Average Sales Amount with Sparkline */}
                    <ReportWidget
                        title="Average Sales Amount"
                        icon={Coins}
                        sparklineData={averageSalesSparklineData}
                        sparklineDataKey="value"
                        sparklineLineColor="var(--color-info)"
                    >
                        <p className="text-4xl font-bold text-[var(--color-info)]">
                            {formatCurrency(averageTransactionAmount)}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                            {averageSalesChangePercent !== null ? `${averageSalesChangePercent.toFixed(1)}% from prev period` : 'N/A'}
                        </p>
                    </ReportWidget>

             
            <SalesOverviewPieChartWidget
                categorySales={reportCategorySales}
                paymentMethodSales={reportSalesByPaymentMethod}
                memberTierSales={reportSalesByMemberTier}
            />

            <TopSellingItemsWidget items={sortedReportItems} formatCurrency={formatCurrency} />

                <TopMembersWidget members={topCustomers} formatCurrency={formatCurrency} />

                <TransactionLookupWidget transactions={filteredReportTransactions} />

                <RecentTransactionsWidget
                    transactions={filteredReportTransactions}
                    formatCurrency={formatCurrency}
                />

            </div>
        
        {/* AI Reports Section */}
        <div className="mt-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] shadow-md">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                <Atom className="w-5 h-5 mr-2" />
                AI Reports
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Leverage AI to get instant, data-driven insights and predictions.</p>
            <button
                onClick={() => setShowAiReportModal(true)}
                className="px-5 py-2 rounded-lg bg-[var(--color-info)] text-[var(--color-text-tertiary)] font-semibold hover:bg-[var(--color-info-hover)] transition-colors duration-200 shadow-md flex items-center justify-center"
            >
                <PieChart className="w-5 h-5 mr-2" />
                Generate AI Sales/Stock Report
            </button>
        </div>

    </div>
)}
                        {/* Main Content Area - Invoices Screen */}

{activeScreen === 'invoices' && (
    <InvoicesTab 
        formatCurrency={formatCurrency}
        invoices={invoices}
        setInvoices={setInvoices}
        refreshData={refreshData}
        inventoryItems={inventoryItems}
        members={members} // Pass members
        reserveStockForOrder={reserveStockForOrder} // Pass reserveStockForOrder
        releaseStockFromOrder={releaseStockFromOrder} // Pass releaseStockFromOrder
        isLoggedIn={isLoggedIn}
        user={user}
        companySettings={companySettings}
        showCustomAlert={showCustomAlert}    
        />
)}
            {/* Main Content Area - Settings Screen */}
            {activeScreen === 'settings' && (
                <div className="flex-1 bg-[var(--color-bg-tertiary)] p-6 rounded-lg shadow-md border border-[var(--color-border)] flex flex-col">
                    <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4 flex items-center">
                        <Settings className="w-6 h-6 mr-2" />
                        Settings
                    </h2>
                    {user && ( // Only display if user is logged in
                    <div className="text-md text-[var(--color-text-secondary)] font-semibold">
                        Logged in as: <span className="text-[var(--color-primary)]">{user.username}</span>
                    </div>
                )}
                    <div className="space-y-6">
                        {/* General Settings */}
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="taxRate" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        id="taxRate"
                                        value={taxRate * 100}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-full md:w-1/2 px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="idleTimeout" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Idle Logout Timeout (minutes)</label>
                                    <input
                                        type="number"
                                        id="idleTimeout"
                                        value={idleTimeoutMinutes}
                                        onChange={(e) => setIdleTimeoutMinutes(parseInt(e.target.value) || 0)}
                                        min="0"
                                        step="1"
                                        className="w-full md:w-1/2 px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    />
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Set to 0 to disable automatic logout.</p>
                                </div>
                                <div>
                                    <p className="text-[var(--color-text-primary)] text-sm font-medium mb-2">Storage Status:</p>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium hover:bg-[var(--color-info)] text-blue-200">
                                        <HardDrive className="w-4 h-4 mr-1" />
                                        Supabase (Cloud)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Membership Tier Settings */}
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Membership Tiers</h3>
                            <div className="space-y-4">
                                {membershipTiers.map((tier, idx) => (
                                    <div key={idx} className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={tier.name}
                                            onChange={(e) => setMembershipTiers(prev => prev.map((t,i) => i===idx ? { ...t, name: e.target.value } : t))}
                                            className="w-32 px-2 py-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                        />
                                        <input
                                            type="number"
                                            value={(tier.rate * 100).toFixed(0)}
                                            onChange={(e) => setMembershipTiers(prev => prev.map((t,i) => i===idx ? { ...t, rate: parseFloat(e.target.value)/100 || 0 } : t))}
                                            min="0" max="100" step="1"
                                            className="w-24 px-2 py-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                        />
                                        <span className="text-[var(--color-text-secondary)]">%</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    window.confirm('Remove this tier?')
                                                ) {
                                                    setMembershipTiers(prev =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }
                                            }}
                                            className="ml-1 text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        placeholder="New tier name"
                                        value={newTierName}
                                        onChange={(e) => setNewTierName(e.target.value)}
                                        className="w-32 px-2 py-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    />
                                    <button type="button" onClick={() => { if(newTierName.trim()) { setMembershipTiers(prev => [...prev, { name: newTierName.trim(), rate: 0 }]); setNewTierName(''); } }} className="px-2 py-1 border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] hover:bg-[var(--color-primary)]">Add</button>
                                </div>
                            </div>
                        </div>

                        {/* Menu Layout Management */}
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex justify-between items-center">
                                Menu Layouts
                                <button
                                    onClick={() => openMenuLayoutForm()}
                                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-tertiary)] rounded-lg text-sm font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4 inline-block mr-1" /> Add Layout
                                </button>
                            </h3>
                            {menuLayouts.length === 0 ? (
                                <p className="text-center text-[var(--color-text-secondary)] py-4">No menu layouts defined.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {menuLayouts.map(layout => (
                                        <li key={layout.id} className="flex items-center justify-between bg-[var(--color-border)] p-3 rounded-lg border border-[var(--color-border)]">
                                            <span className="text-lg font-medium text-[var(--color-text-primary)] flex items-center">
                                                {layout.name}
                                                {activeMenuLayoutId === layout.id && (
                                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 hover:text-[var(--color-danger)] rounded-full">Active</span>
                                                )}
                                            </span>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={() => setActiveMenuLayoutId(layout.id)}
                                                    className={`px-3 py-1 rounded-md text-sm font-medium ${activeMenuLayoutId === layout.id ? 'bg-[var(--color-success)] hover:text-[var(--color-danger)] cursor-not-allowed' : 'bg-[var(--color-info)] hover:text-[var(--color-danger)] hover:hover:bg-[var(--color-info)]'}`}
                                                    disabled={activeMenuLayoutId === layout.id}
                                                >
                                                    Set Active
                                                </button>
                                                <button
                                                    onClick={() => openMenuLayoutForm(layout)}
                                                    className="text-[var(--color-primary)] hover:text-yellow-300"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMenuLayout(layout.id)}
                                                    className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Category Management (New section) */}
                         <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex justify-between items-center">
                                Custom Categories
                                <button
                                    onClick={() => setShowAddCategoryModal(true)}
                                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-tertiary)] rounded-lg text-sm font-semibold hover:hover:bg-[var(--color-secondary)] transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4 inline-block mr-1" /> Add Category
                                </button>
                            </h3>
                            {/* Changed filter logic to compare by ID, assuming default categories have specific IDs */}
                            {allItemCategories.filter(cat => !defaultItemCategories.some(d => d.id === cat.id)).length === 0 ? (
                                <p className="text-center text-[var(--color-text-secondary)] py-4">No custom categories defined.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {/* Changed filter logic to compare by ID */}
                                    {allItemCategories
                                        .filter(cat => !defaultItemCategories.some(d => d.id === cat.id))
                                        .map(cat => {
                                            const IconComponent = getCategoryIcon(cat.name);
                                            return (
                                                <li key={cat.id} className="flex items-center justify-between bg-[var(--color-border)] p-3 rounded-lg border border-[var(--color-border)]">
                                                    <span className="text-lg font-medium text-[var(--color-text-primary)] flex items-center">
                                                        <IconComponent className="w-5 h-5 mr-2" />
                                                        {cat.name}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </div>


                        {/* AI Reports Section */}
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                                <Atom className="w-5 h-5 mr-2" />
                                AI Reports
                            </h3>
                            <button
                                onClick={() => setShowAiReportModal(true)}
                                className="px-5 py-2 rounded-lg bg-[var(--color-info)] hover:text-[var(--color-danger)] font-semibold hover:hover:bg-[var(--color-info)] transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <PieChart className="w-5 h-5 mr-2" />
                                Generate AI Sales/Stock Report
                            </button>
                        </div>
            
                        
                        
                        {/* Theme Settings */}
                        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                                <Settings className="w-5 h-5 mr-2" />
                                Theme Settings
                            </h3>
                            <div className="flex flex-col space-y-3">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        className="form-radio h-5 w-5 text-[var(--color-primary)]"
                                        name="theme-selector"
                                        value="dark"
                                        checked={theme === 'dark'}
                                        onChange={() => setTheme('dark')}
                                    />
                                    <span className="ml-2 text-[var(--color-text-primary)]">Dark Theme (Default)</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        className="form-radio h-5 w-5 text-[var(--color-primary)]"
                                        name="theme-selector"
                                        value="light"
                                        checked={theme === 'light'}
                                        onChange={() => setTheme('light')}
                                    />
                                    <span className="ml-2 text-[var(--color-text-primary)]">Light Theme</span>
                                </label>
                            </div>
                        </div>

                
                        {/* Danger Zone */}
                        <div className="p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
                            <h3 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h3>
                             {/* Button to show/hide Company Settings Form */}
                        <button
        onClick={() => setShowCompanySettingsForm(!showCompanySettingsForm)}
        className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center mb-4" // Added mb-4 for spacing
    >
        {showCompanySettingsForm ? (
            <>
                <XCircle className="w-5 h-5 inline-block mr-2" /> Hide Company Data Settings
            </>
        ) : (
            <>
                <Edit2 className="w-5 h-5 inline-block mr-2" /> Manage Company Data
            </>
        )}
    </button>

    {/* Conditionally render the CompanySettingsForm */}
    {showCompanySettingsForm && (
        <CompanySettingsForm
                    />
    )}   
                           
                           {/* Your new protected button */}
                        <button onClick={handleClearAllTransactions} className="px-5 py-2 rounded-lg bg-[var(--color-danger)] text-white font-medium hover:bg-red-700 transition-colors duration-200 shadow">
                            Clear All Transactions
                        </button>
                        
                        {/* The new AdminConfirmModal component */}
                        <AdminConfirmModal
                            isOpen={showAdminConfirmModal}
                            onClose={() => setShowAdminConfirmModal(false)}
                            title={adminConfirmTitle}
                            message={adminConfirmMessage}
                            confirmationPhrase={adminConfirmPhrase}
                            onConfirm={(u, p) => adminConfirmAction(u, p)}
                        />
                                                    
                        </div>
                    </div>
                </div>
            )}


            {/* Member Add/Edit Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-lg w-full border border-[var(--color-border)] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)]">{editMemberId ? 'Edit Member' : 'Add New Member'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="memberUid" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Card UID (Hexadecimal)</label>
                                <input
                                    type="text"
                                    id="memberUid"
                                    value={newMemberData.uid}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, uid: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    placeholder="e.g., 0410C5D7A93F"
                                    readOnly={!!editMemberId}
                                />
                                {editMemberId && <p className="text-sm text-[var(--color-text-secondary)] mt-1">Card UID cannot be changed after creation.</p>}
                            </div>
                            <div>
                                <label htmlFor="memberCardNumber" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Card Number (1-300)</label>
                                <input
                                    type="number"
                                    id="memberCardNumber"
                                    value={newMemberData.cardNumber}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, cardNumber: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    min="1" max="300"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberName" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Member Name</label>
                                <input
                                    type="text"
                                    id="memberName"
                                    value={newMemberData.name}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberTier" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Membership Tier</label>
                                <select
                                    id="memberTier"
                                    value={newMemberData.tier}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, tier: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                >
                                    {membershipTiers.map(t => (
                                        <option key={t.name} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="memberPhone" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Phone (Optional)</label>
                                <input
                                    type="text"
                                    id="memberPhone"
                                    value={newMemberData.phone}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberEmail" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    id="memberEmail"
                                    value={newMemberData.email}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberStatus" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Status</label>
                                <select
                                    id="memberStatus"
                                    value={newMemberData.status}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, status: e.target.value as Member['status'] })}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                            {/* New section for Prescription */}
<div className="space-y-2">
    <label htmlFor="prescriptionFile" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Prescription (PDF)</label>
    <input
        type="file"
        id="prescriptionFile"
        accept=".pdf"
        onChange={(e) => setPrescriptionFile(e.target.files ? e.target.files[0] : null)}
        className="w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-[var(--color-primary)] file:text-[var(--color-text-tertiary)]
                   hover:file:bg-[var(--color-secondary)] transition-colors duration-200"
    />
    {newMemberData.prescription_url && (
        <div className="flex items-center space-x-2 mt-2">
            <span className="text-[var(--color-text-secondary)] text-sm">Existing file:</span>
            <a href={newMemberData.prescription_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-info)] hover:underline">View Prescription</a>
            <button
                type="button"
                onClick={() => {
                    if (window.confirm("Are you sure you want to remove the existing prescription?")) {
                        setNewMemberData({ ...newMemberData, prescription_url: '', prescription_path: '' });
                    }
                }}
                className="text-[var(--color-danger)] hover:text-red-700 transition-colors duration-200"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )}
</div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={closeMemberModal}
                                className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editMemberId ? handleUpdateMember : handleAddMember}
                                className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow"
                            >
                                {editMemberId ? 'Update Member' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

           {/* Inventory Add/Edit Modal */}
{showInventoryModal && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-lg w-full border border-[var(--color-border)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)]">
                {editInventoryItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h3>
            <div className="space-y-4">
                {/* Category Selection - Moved to top */}
                <div>
                    <label htmlFor="inventoryItemCategory" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">
                        Category
                    </label>
                    <select
                        id="inventoryItemCategory"
                        value={newInventoryItemData.category}
                        onChange={(e) => {
                            const newCategory = e.target.value;
                                            // Define the initial state update
                           let updatedData = {
                ...newInventoryItemData,
                category: newCategory,
            };

            // If the new category is 'Flower', set all pricing units to 'grams'
            if (newCategory === 'Flower') {
                const updatedPricingOptions = newInventoryItemData.pricingOptions.map(option => ({
                    ...option,
                    unit: 'grams'
                }));
                updatedData = {
                    ...updatedData,
                    pricingOptions: updatedPricingOptions,
                    description: '' // Also keep the description reset
                };
            } else {
                // If it's not 'Flower', reset the description field
                updatedData = {
                    ...updatedData,
                    description: ''
                };
            }

            // Set the new state and clear suggestions
                        setNewInventoryItemData(updatedData);
                        setStrainSuggestions([]);
                    }}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                >
                    {allItemCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>

                {/* Smart Item Name Input with Strain Suggestions */}
                <div>
  <label htmlFor="inventoryItemName" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">
    Item Name
  </label>
  <div className="relative">
    <input
      type="text"
      id="inventoryItemName"
      value={newInventoryItemData.name}
      onChange={(e) => {
        const newName = e.target.value;
        setNewInventoryItemData({ ...newInventoryItemData, name: newName });
        if (newInventoryItemData.category === 'Flower') {
          debouncedStrainSearch(newName);
        }
      }}
      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
      placeholder={newInventoryItemData.category === 'Flower' ? "Start typing strain name..." : "e.g., Coffee Mug"}
    />
    
    {/* Preview text */}
    {previewStrain && (
      <div className="absolute inset-0 pointer-events-none">
        <input
          type="text"
          className="w-full px-4 py-2 bg-transparent text-[var(--color-text-secondary)]"
          value={previewStrain.name}
          readOnly
        />
      </div>
    )}
    
    {/* Strain Suggestions Dropdown */}
    {newInventoryItemData.category === 'Flower' && strainSuggestions.length > 0 && (
      <div className="absolute z-50 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
        {strainSuggestions.map((strain) => (
          <button
            key={strain.name}
            className="w-full px-4 py-2 text-left hover:bg-[var(--color-border)] text-[var(--color-text-primary)]"
            onMouseEnter={() => {
              setPreviewStrain({
                name: strain.name,
                description: `[${strain.type}]\n[${strain.thc_level}]\n${strain.description.slice(0, 150)}${strain.description.length > 150 ? '...' : ''}`
              });
            }}
            onMouseLeave={() => setPreviewStrain(null)}
            onClick={() => {
              setNewInventoryItemData({
                ...newInventoryItemData,
                name: strain.name,
                description: `[${strain.type}]\n[${strain.thc_level}]\n${strain.description.slice(0, 150)}${strain.description.length > 150 ? '...' : ''}`
              });
              setStrainSuggestions([]);
              setPreviewStrain(null);
            }}
          >
            <div className="font-medium">{strain.name}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">{strain.type} - THC: {strain.thc_level}</div>
          </button>
        ))}
      </div>
    )}
  </div>
</div>

{/* Description field with preview */}
<div>
  <label htmlFor="inventoryItemDescription" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">
    Description {newInventoryItemData.category !== 'Flower' && '(Optional)'}
  </label>
  <div className="relative">
    <textarea
      id="inventoryItemDescription"
      value={newInventoryItemData.description}
      onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, description: e.target.value })}
      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] resize-y"
      rows={3}
    ></textarea>
    
    {/* Preview text */}
    {previewStrain && (
      <div className="absolute inset-0 pointer-events-none">
        <textarea
          className="w-full px-4 py-2 bg-transparent text-[var(--color-text-secondary)] resize-none"
          value={previewStrain.description}
          rows={3}
          readOnly
        ></textarea>
      </div>
    )}
  </div>
</div>

                {/* Stock Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="availableStock" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Available Stock</label>
                        <input
                            type="number"
                            id="availableStock"
                            value={newInventoryItemData.available_stock}
                            onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, available_stock: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                            min="0"
                        />
                    </div>
                    <div>
                        <label htmlFor="reservedStock" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Reserved Stock</label>
                        <input
                            type="number"
                            id="reservedStock"
                            value={newInventoryItemData.reserved_stock}
                            onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, reserved_stock: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                            min="0"
                            readOnly={true}
                            disabled={true}
                        />
                    </div>
                </div>

             {/* Cost Price Field */}
<div className="mt-4">
    <label htmlFor="costPrice" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">
        Cost Price (THB)
    </label>
    <input
        type="number"
        id="costPrice"
        value={newInventoryItemData.cost_price || ''}
        onChange={(e) => setNewInventoryItemData({ 
            ...newInventoryItemData, 
            cost_price: parseFloat(e.target.value) || 0 
        })}
        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
        min="0"
        step="1"
        placeholder="Enter cost price"
    />
</div>

                {/* Pricing Options */}
                <div>
                    <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Pricing Options</h4>
                    <div className="space-y-3">
                        {newInventoryItemData.pricingOptions.map((option, index) => (
                            <div key={option.id} className="flex flex-wrap items-end gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                                <div className="flex-1 min-w-[120px]">
                                    <label htmlFor={`priceOptionName-${index}`} className="block text-[var(--color-text-secondary)] text-xs font-medium mb-1">Option Name</label>
                                    <input
                                        type="text"
                                        id={`priceOptionName-${index}`}
                                        value={option.name}
                                        onChange={(e) => handlePricingOptionChange(index, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                        placeholder="e.g., Gram, Piece"
                                    />
                                </div>
                                <div className="flex-1 min-w-[100px]">
                                    <label htmlFor={`priceOptionPrice-${index}`} className="block text-[var(--color-text-secondary)] text-xs font-medium mb-1">Price (THB)</label>
                                    <input
                                        type="number"
                                        id={`priceOptionPrice-${index}`}
                                        value={option.price}
                                        onChange={(e) => handlePricingOptionChange(index, 'price', e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                        step="1"
                                        min="0"
                                    />
                                </div>
                                <div className="flex-1 min-w-[80px]">
                                    <label htmlFor={`priceOptionUnit-${index}`} className="block text-[var(--color-text-secondary)] text-xs font-medium mb-1">Unit</label>
                                    <select
                                        id={`priceOptionUnit-${index}`}
                                        value={option.unit}
                                        onChange={(e) => handlePricingOptionChange(index, 'unit', e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                    >
                                        <option value="pieces">pieces</option>
                                        <option value="grams">grams</option>
                                        <option value="kg">kg</option>
                                        <option value="ml">ml</option>
                                        <option value="liter">liter</option>
                                        <option value="unit">unit</option>
                                    </select>
                                </div>
                                {newInventoryItemData.pricingOptions.length > 1 && (
                                    <button
                                        onClick={() => handleRemovePricingOption(index)}
                                        className="p-2 bg-[var(--color-danger)] hover:text-[var(--color-danger)] rounded-lg hover:hover:bg-[var(--color-danger)] transition-colors"
                                        title="Remove this pricing option"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleAddPricingOption}
                        className="mt-4 px-4 py-2 bg-[var(--color-info)] hover:text-[var(--color-danger)] rounded-lg hover:hover:bg-[var(--color-info)] transition-colors flex items-center"
                    >
                        <PlusCircle className="w-5 h-5 mr-2" /> Add Pricing Option
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
<div className="flex justify-end space-x-3 mt-6">
    {newInventoryItemData.category === 'Flower' && (
        <button
            onClick={() => {
                const type = newInventoryItemData.description.match(/\[(.*?)\]/)?.[1] || '';
                printSticker(
                    newInventoryItemData.name,
                    type,
                    newInventoryItemData.pricingOptions,
                    newInventoryItemData.barcode_id || editInventoryItemId || ''
                );
            }}
            className="px-5 py-2 rounded-lg bg-[var(--color-info)] hover:text-[var(--color-danger)] font-medium hover:bg-[var(--color-info)] transition-colors duration-200 shadow flex items-center"
        >
            <Printer className="w-5 h-5 mr-2" />
            Print Sticker
        </button>
    )}
    <button
        onClick={closeInventoryModal}
        className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
    >
        Cancel
    </button>
    <button
        onClick={handleAddInventoryItem}
        className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow"
    >
        {editInventoryItemId ? 'Update Item' : 'Add Item'}
    </button>
</div>
        </div>
    </div>
)}
            {/* Add New Category Modal */}
            {showAddCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-sm w-full border border-[var(--color-border)]">
                        <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)]">Add New Category</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newCategoryName" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Category Name</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        id="newCategoryName"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                        placeholder="e.g., Drinks"
                                    />
                                    <button
                                        onClick={() => setShowCategoryIconSuggester(true)}
                                        className="p-2 bg-[var(--color-info)] hover:text-[var(--color-danger)] rounded-lg hover:hover:bg-[var(--color-info)] transition-colors"
                                        title="Suggest Icon"
                                    >
                                        <Atom className="w-5 h-5" />
                                    </button>
                                </div>
                                {suggestedIconName && (
                                    <p className="text-sm text-[var(--color-success)] mt-2 flex items-center">
                                        Suggested Icon: {React.createElement(iconMap[suggestedIconName] || CircleDashed, { className: "w-4 h-4 mr-1" })} Icon Applied!
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddCategoryModal(false)}
                                className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCategory}
                                className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow"
                            >
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Icon Suggester Modal */}
            {showCategoryIconSuggester && (
                <CategoryIconSuggester
                    categoryName={newCategoryName}
                    onIconSuggested={handleIconSuggested}
                    onClose={() => setShowCategoryIconSuggester(false)}
                />
            )}

            {/* Sales Report AI Modal */}
            {showAiReportModal && (
 <SalesReportAI
        onClose={() => setShowAiReportModal(false)}
        transactions={transactions}
        inventoryItems={inventoryItems}
        members={members}
        orders={orders}
        formatCurrency={formatCurrency}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} // Ensure these are correctly passed
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''} // Ensure these are correctly passed
        preCalculatedTotalRevenue={preCalculatedTotalRevenue(transactions)} // Pass the pre-calculated value
  />
)}
           {/* Item Selection Modal (for PoS Screen) */}
{showItemSelectionModal && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        {/* Adjusted modal height to h-[90%] or h-[95%] to allow more vertical space */}
        <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-7xl w-full h-[90%] flex flex-col border border-[var(--color-border)]"> {/* Increased max-w-xl to max-w-5xl/7xl for more horizontal space */}
            <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)]">Select Item from Inventory {selectedCategoryFilter && `(${selectedCategoryFilter})`}</h3>
            
            {/* Search Input for Items - ENHANCED with clear button */}
            <div className="mb-6 relative flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                <input
                    type="text"
                    placeholder="Search items by name, description or ID..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="flex-grow p-3 pl-10 pr-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-background-soft)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                {itemSearchQuery && (
                    <button
                        type="button"
                        onClick={() => setItemSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors duration-200"
                        aria-label="Clear search query"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
                {allItemCategories
                    .filter(cat => activeMenuCategories.includes(cat.name))
                    .map(cat => {
                        const IconComponent = getCategoryIcon(cat.name);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCategoryFilter(cat.name);
                                    setSelectedItemForTransaction(null);
                                    setSelectedPricingOption(null);
                                    setItemTransactionQuantity(0);
                                    setItemTransactionManualPrice(0);
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200 ${selectedCategoryFilter === cat.name ? 'bg-[var(--color-secondary)] text-[var(--color-text-tertiary)]' : 'bg-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'}`}
                            >
                                <IconComponent className="w-5 h-5 mr-2" />
                                {cat.name}
                            </button>
                        );
                    })}
                <button
                    onClick={() => {
                        setSelectedCategoryFilter(null);
                        setSelectedItemForTransaction(null);
                        setSelectedPricingOption(null);
                        setItemTransactionQuantity(0);
                        setItemTransactionManualPrice(0);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200 ${selectedCategoryFilter === null ? 'bg-[var(--color-secondary)] text-[var(--color-text-tertiary)]' : 'bg-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'}`}
                >
                    <Grid className="w-5 h-5 mr-2" />
                    All Categories
                </button>
            </div>

            {inventoryItems.length === 0 ? (
                    <p className="text-center text-[var(--color-text-secondary)] py-10">No items in inventory. Please add items in the &apos;Inventory&apos; tab.</p>
            ) : (
                <div className="flex-1 overflow-y-auto overflow-x-hidden mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 custom-scrollbar"> {/* Changed lg:grid-cols-3 to xl:grid-cols-4 and added lg:grid-cols-3 back for smaller large screens */}
                    {inventoryItems.filter(item =>
                            (!selectedCategoryFilter || item.category === selectedCategoryFilter) &&
                            activeMenuCategories.includes(item.category) &&
                            (item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                item.description?.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                item.id.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                (item.barcode_id && item.barcode_id.toLowerCase().includes(itemSearchQuery.toLowerCase()))) &&
                            ((item.available_stock) > 0)
                        ).map((item) => {
                        const ItemIcon = getCategoryIcon(item.category);
                        const isSelected = selectedItemForTransaction?.id === item.id;

                        return (
                            <div
                                key={item.id}
                                className={`bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-lg border-2 ${isSelected ? 'border-yellow-400' : 'border-[var(--color-border)]'} flex flex-col cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedItemForTransaction(null);
                                        setSelectedPricingOption(null);
                                        setItemTransactionQuantity(0);
                                        setItemTransactionManualPrice(0);
                                    } else {
                                        setSelectedItemForTransaction(item);
                                        setSelectedPricingOption(item.pricing_options[0] || null);
                                        setItemTransactionQuantity(0);
                                        setItemTransactionManualPrice(item.pricing_options[0]?.price || 0);
                                    }
                                }}
                            >
                                <div className="flex items-center mb-3">
                                    <ItemIcon className="w-8 h-8 mr-3 text-[var(--color-primary)]" />
                                    <h4 className="text-xl font-semibold text-[var(--color-text-primary)]">{item.name}</h4>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)] mb-4 flex-1">{item.description}</p>
                                <p className="text-sm text-[var(--color-text-primary)] mb-2">Available: <span className="text-[var(--color-success)] font-semibold">{(item.available_stock ?? 0)}</span></p>
                                
                                <div className="border-t border-[var(--color-border)] pt-3 mt-auto">
                                    <h5 className="text-md font-semibold text-[var(--color-text-primary)] mb-2">Pricing:</h5>
                                    {item.pricing_options.length === 0 ? (
                                        <p className="text-red-400 text-sm">No pricing options set.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2"> {/* Still 2 columns for pricing options inside each item card */}
                                            {item.pricing_options.map((option, idx) => (
                                                <button
                                                    type="button"
                                                    key={option.id || idx}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemForTransaction(item);
                                                        setSelectedPricingOption(option);
                                                        setItemTransactionQuantity(0);
                                                        setItemTransactionManualPrice(option.price);
                                                    }}
                                                    className={`p-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${isSelected && selectedPricingOption?.id === option.id ? 'bg-[var(--color-info)] border-blue-600 hover:text-[var(--color-danger)] shadow-md' : 'bg-[var(--color-border)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] hover:border-blue-500'}`}
                                                >
                                                    {option.name}: {formatCurrency(option.price)} / {option.unit}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quantity and Custom Price Input (shown only if this item is selected) */}
                                {isSelected && selectedPricingOption && (
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
                                        <div>
                                            <label htmlFor={`itemQuantity-${item.id}`} className="block text-[var(--color-text-primary)] text-sm font-medium mb-1">Quantity:</label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    id={`itemQuantity-${item.id}`}
                                                    value={itemTransactionQuantity}
                                                    onChange={(e) => setItemTransactionQuantity(parseInt(e.target.value) || 0)}
                                                    min="0"
                                                    className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-[var(--color-text-secondary)]">{selectedPricingOption.unit}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor={`manualPrice-${item.id}`} className="block text-[var(--color-text-primary)] text-sm font-medium mb-1">Custom Price (Optional):</label>
                                            <input
                                                type="number"
                                                step="1"
                                                id={`manualPrice-${item.id}`}
                                                value={itemTransactionManualPrice}
                                                onChange={(e) => setItemTransactionManualPrice(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                                placeholder={formatCurrency(selectedPricingOption.price || 0)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (selectedItemForTransaction && selectedPricingOption && itemTransactionQuantity > 0) {
                                                    handleAddItemToTransaction(selectedItemForTransaction, selectedPricingOption, itemTransactionQuantity, itemTransactionManualPrice);
                                                } else {
                                                    showCustomAlert('Attention', 'Please select an item, pricing option, and valid quantity.');
                                                }
                                            }}
                                            className="w-full bg-[var(--color-success)] text-[var(--color-text-tertiary)] px-5 py-2 rounded-lg font-semibold hover:bg-[var(--color-success-hover)] transition-colors duration-200 shadow-md flex items-center justify-center"
                                        >
                                            <PlusCircle className="w-5 h-5 inline-block mr-2" />
                                            Add to List
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Message for unselected pricing option */}
            {!selectedPricingOption && selectedItemForTransaction && (
                <p className="text-[var(--color-warning)] mt-4 text-center">Please select a pricing option for &quot;{selectedItemForTransaction.name}&quot; to add it to the transaction.</p>
            )}

            <div className="flex justify-end space-x-3 mt-6">
                <button
                    onClick={() => {
                        setShowItemSelectionModal(false);
                        setSelectedItemForTransaction(null);
                        setSelectedPricingOption(null);
                        setItemTransactionQuantity(0);
                        setItemTransactionManualPrice(0);
                        setSelectedCategoryFilter(null);
                    }}
                    className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                >
                    Close
                </button>
            </div>
        </div>
    </div>
)}



            {/* Order Create/Edit Modal */}
           {/* Order Create/Edit Modal */}
{showOrderModal && (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        {/* Main modal content container - ADDED max-h-[90vh] and overflow-y-auto here */}
        <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-2xl w-full border border-[var(--color-border)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-semibold mb-6 text-[var(--color-secondary)]">{editOrderId ? 'Edit Order' : 'Create New Order'}</h3>
            <div className="space-y-4">
                <div>
                    <label htmlFor="orderDealerId" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Dealer ID</label>
                    <input
                        type="text"
                        id="orderDealerId"
                        value={newOrderData.dealerId}
                        onChange={(e) => setNewOrderData({ ...newOrderData, dealerId: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        placeholder="Enter dealer ID"
                    />
                </div>
                <div>
                    <label htmlFor="orderMemberUid" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Member UID</label>
                    <input
                        type="text"
                        id="orderMemberUid"
                        value={newOrderData.memberUid}
                        onChange={(e) => setNewOrderData({ ...newOrderData, memberUid: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                        placeholder="Enter member UID"
                        readOnly={!!editOrderId}
                    />
                    {editMemberId && <p className="text-sm text-[var(--color-text-secondary)] mt-1">Member UID cannot be changed for existing orders.</p>}
                </div>
                <div>
                    <label htmlFor="orderComment" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Comment (Optional)</label>
                    <textarea
                        id="orderComment"
                        value={newOrderData.comment}
                        onChange={(e) => setNewOrderData({ ...newOrderData, comment: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] resize-y"
                        rows={2}
                    ></textarea>
                </div>

                <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mt-6 mb-3">Order Items</h4>
                {newOrderData.items.length === 0 ? (
                    <p className="text-[var(--color-text-secondary)] text-center py-4">No items added to this order yet.</p>
                ) : (
                    <div className="max-h-60 overflow-y-auto border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-[var(--color-border)] sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase">Item</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase">Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-primary)] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {newOrderData.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 text-sm text-[var(--color-text-primary)]">{item.name} ({item.unit})</td>
                                        <td className="px-4 py-2 text-sm text-[var(--color-text-primary)]">{item.quantity}</td>
                                        <td className="px-4 py-2 text-sm text-[var(--color-text-primary)]">{formatCurrency(item.price)}</td>
                                        <td className="px-4 py-2 text-left">
                                            <button
                                                onClick={() => handleRemoveOrderItem(index)}
                                                className="text-[var(--color-danger)] hover:opacity-75 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)]">
                    <h5 className="text-md font-semibold text-[var(--color-primary)] mb-3">Add Item to Order:</h5>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search item by name..."
                            value={itemSearchQueryInOrderModal}
                            onChange={(e) => {
                                setItemSearchQueryInOrderModal(e.target.value);
                                setSelectedItemForTransaction(null);
                                setSelectedPricingOption(null);
                                setItemTransactionQuantity(0);
                                setItemTransactionManualPrice(0);
                            }}
                            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm"
                        />

                        {itemSearchQueryInOrderModal && !selectedItemForTransaction && (
                            <div className="absolute z-10 w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg custom-scrollbar">
                                {inventoryItems
                                    .filter(item =>
                                        item.name.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()) ||
                                        item.id.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()) ||
                                        (item.barcode_id && item.barcode_id.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()))
                                    )
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className="p-3 cursor-pointer hover:bg-[var(--color-border)] text-[var(--color-text-primary)] border-b border-[var(--color-border)] last:border-b-0"
                                            onClick={() => {
                                                setSelectedItemForTransaction(item);
                                                setSelectedPricingOption(item.pricing_options[0] || null);
                                                setItemTransactionQuantity(0);
                                                setItemTransactionManualPrice(item.pricing_options[0]?.price || 0);
                                                setItemSearchQueryInOrderModal('');
                                            }}
                                        >
                                            {item.name} (Avail: {item.available_stock ?? 0})
                                        </div>
                                    ))}
                                {inventoryItems.filter(item => item.name.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()) || item.id.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()) || (item.barcode_id && item.barcode_id.toLowerCase().includes(itemSearchQueryInOrderModal.toLowerCase()))).length === 0 && (
                                    <p className="p-3 text-[var(--color-text-secondary)] text-center">No items found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedItemForTransaction ? (
                        <>
                            <p className="text-[var(--color-text-primary)] text-md font-semibold mb-2">Selected Item: <span className="text-[var(--color-accent)]">{selectedItemForTransaction.name}</span></p>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-[var(--color-text-primary)] text-sm font-medium mb-1">Pricing Option</label>
                                    <select
                                        value={selectedPricingOption?.id || ''}
                                        onChange={(e) => {
                                            const selected = selectedItemForTransaction?.pricing_options.find(option => option.id === e.target.value);
                                            setSelectedPricingOption(selected || null);
                                            setItemTransactionManualPrice(selected?.price || 0);
                                        }}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                        disabled={!selectedItemForTransaction || selectedItemForTransaction.pricing_options.length === 0}
                                    >
                                        <option value="">-- Select Option --</option>
                                        {selectedItemForTransaction?.pricing_options.map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}: {formatCurrency(option.price)} / {option.unit}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedItemForTransaction.pricing_options.length === 0 && (
                                        <p className="text-red-400 text-sm mt-1">No pricing options set for this item.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-3 mb-4">
                                <label htmlFor="orderItemQuantity" className="text-[var(--color-text-primary)] font-medium">Quantity:</label>
                                <input
                                    type="number"
                                    id="orderItemQuantity"
                                    value={itemTransactionQuantity}
                                    onChange={(e) => setItemTransactionQuantity(parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="w-20 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                                />
                                <span className="text-[var(--color-text-secondary)]">{selectedPricingOption?.unit || 'unit'}</span>

                                <label htmlFor="orderItemManualPrice" className="text-[var(--color-text-primary)] font-medium">Custom Price:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    id="orderItemManualPrice"
                                    value={itemTransactionManualPrice}
                                    onChange={e => setItemTransactionManualPrice(Number(e.target.value))}
                                    className="w-24 px-2 py-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] shadow-sm"
                                    placeholder={formatCurrency(selectedPricingOption?.price || 0)}
                                />
                            </div>

                            <button
                                onClick={() => {
                                    if (selectedItemForTransaction && selectedPricingOption && itemTransactionQuantity > 0) {
                                        if (itemTransactionQuantity > (selectedItemForTransaction.available_stock ?? 0)) {
                                            showCustomAlert('Stock Alert!', 'Cannot add ${itemTransactionQuantity} of ${selectedItemForTransaction.name}. Only ${selectedItemForTransaction.available_stock ?? 0} available.');
                                            return;
                                        }
                                        handleAddOrderItem(selectedItemForTransaction, selectedPricingOption, itemTransactionQuantity, itemTransactionManualPrice);
                                        setSelectedItemForTransaction(null);
                                        setSelectedPricingOption(null);
                                        setItemTransactionQuantity(0);
                                        setItemTransactionManualPrice(0);
                                    } else {
                                        showCustomAlert('Attention', 'Please select an item, pricing option, and valid quantity to add.');
                                    }
                                }}
                                className="w-full bg-[var(--color-info)] hover:bg-[var(--color-info-dark)] text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-md flex items-center justify-center"
                                disabled={!selectedItemForTransaction || !selectedPricingOption || itemTransactionQuantity <= 0}
                            >
                                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                                Add Item
                            </button>
                        </>
                    ) : (
                        <p className="text-[var(--color-text-secondary)] text-center py-2">Search for an item to add it to the order.</p>
                    )}
                </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
                <button
                    onClick={closeOrderModal}
                    className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-border-dark)] transition-colors duration-200 shadow"
                >
                    Cancel
                </button>
                <button
                    onClick={handleAddOrder}
                    className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow"
                >
                    {editOrderId ? 'Save Changes' : 'Create Order'}
                </button>
            </div>
        </div>
    </div>
)}


            {/* Payment Method Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-sm w-full border border-[var(--color-border)]">
                        <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)] text-center">Select Payment Method</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handlePaymentMethodSelected('cash')}
                                className="flex flex-col items-center justify-center p-4 bg-[var(--color-success)] hover:text-[var(--color-danger)] rounded-lg font-semibold hover:hover:bg-[var(--color-success)] transition-colors shadow-md"
                            >
                                <Coins className="w-8 h-8 mb-2" />
                                Cash
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('credit_card')}
                                className="flex flex-col items-center justify-center p-4 bg-[var(--color-info)] hover:text-[var(--color-danger)] rounded-lg font-semibold hover:hover:bg-[var(--color-info)] transition-colors shadow-md"
                            >
                                <CreditCard className="w-8 h-8 mb-2" />
                                Credit Card
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('qr_code')}
                                className="flex flex-col items-center justify-center p-4 bg-[var(--color-purple)] hover:text-[var(--color-danger)] rounded-lg font-semibold hover:hover:bg-[var(--color-purple)] transition-colors shadow-md"
                            >
                                <QrCode className="w-8 h-8 mb-2" />
                                QR Code
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('crypto')}
                                className="flex flex-col items-center justify-center p-4 bg-[var(--color-warning)] hover:text-[var(--color-danger)] rounded-lg font-semibold hover:hover:bg-[var(--color-warning)] transition-colors shadow-md"
                            >
                                <Atom className="w-8 h-8 mb-2" />
                                Crypto
                            </button>
                        </div>
                        <div className="mt-6 text-center">
                            <button
                                onClick={handlePaymentModalClose}
                                className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                            >
                                Cancel Transaction
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Receipt Modal - Now primarily for display, printing handled by separate function */}
            {isReceiptModalOpen && lastProcessedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-lg w-full relative">
                        <button
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)]"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        <h3 className="text-3xl font-bold text-center text-[var(--color-primary)] mb-6">Receipt Preview</h3>

                        <div className="text-center text-[var(--color-text-primary)] mb-6">
                            <p className="font-semibold text-lg">{companyName}</p>
                            {/* Ensure consistent timezone for display */}
                            <p>Transaction Date: {new Date(lastProcessedTransaction.transaction_date).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}</p>
                        </div>

                        {lastProcessedTransaction.member_uid && (
                            <div className="mb-4 border-b border-[var(--color-border)] pb-4">
                                <p className="font-semibold">Member Information:</p>
                                <p>Name: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.name || 'N/A'}</p>
                                <p>Card Number: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.card_number || 'N/A'}</p>
                                <p>Tier: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.tier || 'N/A'}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="font-semibold mb-2">Items:</p>
                            {Array.isArray(lastProcessedTransaction.items) && lastProcessedTransaction.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-[var(--color-text-primary)] text-sm mb-1">
                                    <span>{item.name} (x{item.quantity} {item.unit})</span>
                                    <span>{formatCurrency(item.price)} each = {formatCurrency(item.subtotal)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-b border-[var(--color-border)] py-4 mb-4 space-y-2">
                            <div className="flex justify-between font-medium text-[var(--color-text-primary)]">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(lastProcessedTransaction.subtotal)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-[var(--color-text-primary)]">
                                <span>Discount ({lastProcessedTransaction.discount_rate * 100}%):</span>
                                <span className="text-red-400">- {formatCurrency(lastProcessedTransaction.discount_amount)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-[var(--color-text-primary)]">
                                <span>Tax ({taxRate * 100}%):</span>
                                <span>{formatCurrency(lastProcessedTransaction.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-[var(--color-text-primary)]">
                                <span>Payment Method:</span>
                                <span className="capitalize">{lastProcessedTransaction.payment_method}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-3xl font-bold text-[var(--color-primary)] mb-6">
                            <span>Total:</span>
                            <span>{formatCurrency(lastProcessedTransaction.final_total)}</span>
                        </div>

                        <p className="text-center text-[var(--color-text-secondary)] italic">Thank you for your business!</p>

                        <div className="mt-6 text-center">
                            <button
                                onClick={triggerPrint} // This will now trigger the new print function
                                className="bg-[var(--color-info)] hover:text-[var(--color-danger)] px-5 py-3 rounded-lg font-semibold hover:hover:bg-[var(--color-info)] transition-colors duration-200 shadow-md flex items-center justify-center mx-auto"
                            >
                                <Printer className="w-5 h-5 inline-block mr-2" />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}


                                 {/* Menu Layout Management Modal */}
            {showMenuLayoutModal && editMenuLayoutData && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--color-bg-tertiary)] p-8 rounded-lg shadow-xl max-w-lg w-full border border-[var(--color-border)]">
                        <h3 className="text-2xl font-semibold mb-6 text-[var(--color-primary)]">{editMenuLayoutData.id ? 'Edit Menu Layout' : 'Add New Menu Layout'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="layoutName" className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Layout Name</label>
                                <input
                                    type="text"
                                    id="layoutName"
                                    value={editMenuLayoutData.name}
                                    onChange={(e) => setEditMenuLayoutData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] shadow-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                    placeholder="e.g., Retail Layout"
                                />
                            </div>
                            <div>
                                <label className="block text-[var(--color-text-primary)] text-sm font-medium mb-2">Select and Reorder Categories for this Layout:</label>
                                <div className="grid grid-cols-2 gap-2 bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border)] max-h-60 overflow-y-auto custom-scrollbar">
                                    {/* Map over the categories currently selected in the layout for reordering */}
                                    {(editMenuLayoutData.categories || []) // <-- Defensive check here
                                        .map((categoryNameInLayout, layoutCategoryIndex) => {
                                            const cat = allItemCategories.find(c => c.name === categoryNameInLayout);
                                            if (!cat) return null; // Should not happen if data is consistent

                                            return (
                                                <DraggableCategoryLabel
                                                    key={cat.id} // Use category ID for a stable key
                                                    categoryName={cat.name}
                                                    isChecked={true} // It's always checked if it's in this array
                                                    layoutCategoryIndex={layoutCategoryIndex}
                                                    allCategories={allItemCategories} // Pass all categories for icon resolution
                                                    currentLayoutCategories={editMenuLayoutData.categories || []} // <-- Defensive check here again for the prop
                                                    toggleCategoryInLayout={toggleCategoryInLayout}
                                                    onReorderCategories={(fromIndex, toIndex) => {
                                                        setEditMenuLayoutData(prev => {
                                                            if (!prev) return null;
                                                            const updatedCategories = [...prev.categories];
                                                            const [movedItem] = updatedCategories.splice(fromIndex, 1);
                                                            updatedCategories.splice(toIndex, 0, movedItem);
                                                            return { ...prev, categories: updatedCategories };
                                                        });
                                                    }}
                                                />
                                            );
                                        })
                                        .filter(Boolean) // Filter out any nulls if a category wasn't found
                                    }

                                    {/* Then, add unselected categories at the bottom, not draggable/reorderable */}
                                    {allItemCategories
                                        .filter(cat => !(editMenuLayoutData.categories || []).includes(cat.name)) // <-- Defensive check here
                                        .sort((a, b) => a.name.localeCompare(b.name)) // Keep unselected sorted
                                        .map(cat => (
                                            <label
                                                key={cat.id}
                                                className="flex items-center text-[var(--color-text-primary)] p-2 rounded-md bg-[var(--color-bg-secondary)] opacity-60 cursor-not-allowed"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={false} // Unchecked
                                                    onChange={() => toggleCategoryInLayout(cat.name)} // Allows selecting them
                                                    className="form-checkbox h-5 w-5 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)] bg-[var(--color-border)] border-[var(--color-border)] cursor-pointer"
                                                />
                                                <span className="ml-2">{cat.name}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowMenuLayoutModal(false)}
                                className="px-5 py-2 rounded-lg bg-[var(--color-border)] text-[var(--color-text-primary)] font-medium hover:hover:bg-[var(--color-border)] transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddMenuLayout}
                                className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-tertiary)] font-medium hover:hover:bg-[var(--color-secondary)] transition-colors duration-200 shadow"
                            >
                                {editMenuLayoutData.id ? 'Update Layout' : 'Add Layout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
            </ThemeContext.Provider>
    );
}

export default App;
