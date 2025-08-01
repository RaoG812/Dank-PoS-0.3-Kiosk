import React, { useState, useEffect } from 'react';
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Loader2, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, Atom, Wand2,
    Book, Coffee, Utensils, Gamepad, Dumbbell, Home, Heart, Gift, Lightbulb, Truck,
    Box, Wine, Apple, Pizza, Music, Film, Microscope, FlaskConical,
    Diamond, Scale, Bolt, Sun, Cloud, Moon, Star, Bell, Building, Car, Award,
    BookOpen, Camera, Clipboard, Code, Compass, Database, Droplet, Egg, Factory,
    Feather, Flag, Glasses, Globe, Hammer, Hand, Hash, HeartHandshake,
    Key, LampCeiling, LeafyGreen, Link, Loader, Lock, Mail, MapPin, MessageCircle,
    Monitor, Mountain, Newspaper, Palette, PenTool, Phone, PiggyBank, Plane,
    Puzzle, Rocket, Scissors, Shield, Sparkles, Sprout, Tag, Tent, TreePalm,
    Umbrella, User, CheckCheck, VolumeX, Watch, Wifi, WineOff, Wrench, Zap, GripVertical
} from 'lucide-react';
import { InventoryItem, Transaction, Member, Order } from '@/types'; // Assuming types are defined in '@/types'

interface SalesReportAIProps {
    onClose: () => void;
    transactions: Transaction[];
    inventoryItems: InventoryItem[];
    members: Member[];
    orders: Order[];
    formatCurrency: (amount: number) => string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    preCalculatedTotalRevenue: number;
}

const SalesReportAI: React.FC<SalesReportAIProps> = ({
    onClose,
    transactions,
    inventoryItems,
    members,
    orders,
    formatCurrency,
    preCalculatedTotalRevenue // Destructure the new prop
}) => {
    const [reportContent, setReportContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        const generateReport = async () => {
            setIsLoading(true);
            setAiError(null);
            setReportContent('');

            try {
                console.log("Using data provided via props for AI report generation...");

                // Include the pre-calculated total revenue in the data sent to the AI
                const reportData = {
                    transactions: transactions,
                    inventoryItems: inventoryItems,
                    members: members,
                    orders: orders,
                    // Pass the accurate, pre-calculated total revenue
                    overallTotalRevenue: preCalculatedTotalRevenue,
                };

                const prompt = `
                    As an AI assistant for a cannabis dispensary POS system, your task is to generate a comprehensive sales and stock report in Markdown format.
                    Use the following JSON data to create the report. Do not make up any data.
                    All monetary values should be presented as formatted currency using the provided 'formatCurrency' function or a similar method if not explicitly passed, ensuring two decimal places (e.g., $123.45).

                    **Strict Calculation and Report Guidelines:**
                    - All calculations must be accurate based on the provided data.
                    - For sales figures (Total Revenue, Total Discount, Total Tax, Net Profit), iterate through the 'transactions' array, but **use 'overallTotalRevenue' for the Total Revenue field.**
                    - When calculating 'Total Revenue' and 'Net Profit', include transactions with all payment methods (Cash, Card, QR, Other). Specifically ensure 'QR' payments are counted.
                    - **Total Revenue**: Use the provided 'overallTotalRevenue' value directly.
                    - **Total Discount Given**: Sum of 'discount_amount' from all transactions.
                    - **Total Tax Collected**: Sum of 'tax_amount' from all transactions.
                    - **Cost of Goods Sold (COGS)**: For each item in a transaction, multiply its 'quantity' by its 'cost_price' (found in 'inventoryItems'). If an 'inventoryItem' does not have a 'cost_price', assume 0 for that item.
                    - **Net Profit**: overallTotalRevenue - Total Discount Given - Total COGS.
                    - **Average Transaction Value**: overallTotalRevenue / Total Number of Transactions.
                    - **Top Selling Items (by Quantity and Revenue)**: For these, you must iterate through the 'items_json' array within EACH transaction. Sum up quantities and calculate revenue for each unique item.
                    - **Low Stock Alerts**: Identify items from 'inventoryItems' where 'available_stock' is less than 10.
                    - **Member Activity Summary**: Count members by 'tier'.
                    - **Order Status Summary**: Count orders by 'status'.
                    - **NO SQL QUERIES** in the "Insights" section or anywhere else in the generated report. The Insights section should contain only observations and text.

                    The report should include:
                    ---
                    ## Sales Report - Summary

                    ### 1. Overall Sales Summary
                    - **Total Revenue**: [Use the value provided in 'overallTotalRevenue' from the JSON data]
                    - **Total Discount Given**: [Calculated total discount amount from all transactions]
                    - **Total Tax Collected**: [Calculated total tax amount from all transactions]
                    - **Total Cost of Goods Sold (COGS)**: [Calculated total COGS]
                    - **Net Profit**: [Calculated Net Profit based on overallTotalRevenue]
                    - **Total Number of Transactions**: [Count of all transactions]
                    - **Average Transaction Value**: [Calculated average transaction value based on overallTotalRevenue]

                    #### Revenue by Payment Method:
                    - Cash: [Total revenue from cash transactions]
                    - Card: [Total revenue from card transactions]
                    - QR: [Total revenue from QR transactions]
                    - Other: [Total revenue from other payment methods]

                    ### 2. Top Selling Items
                    #### By Quantity Sold (Top 5):
                    - [Item Name]: [Quantity Sold] units ([Total Revenue for this item] / [Cost of Goods Sold for this item] / Profit: [Profit for this item])
                    - ...
                    #### By Revenue Generated (Top 5):
                    - [Item Name]: [Total Revenue] ([Quantity Sold] units / [Cost of Goods Sold for this item] / Profit: [Profit for this item])
                    - ...

                    ### 3. Low Stock Alerts (Available stock less than 10)
                    - [Item Name]: [Current Available Stock] units
                    - ...

                    ### 4. Member Activity Summary
                    - **Total Members**: [Count of all members]
                    - **Tier Breakdown**:
                        - Basic: [Number of Basic members] (Total Purchases: [Sum of total_purchases for Basic members])
                        - Gold: [Number of Gold members] (Total Purchases: [Sum of total_purchases for Gold members])
                        - Supreme: [Number of Supreme members] (Total Purchases: [Sum of total_purchases for Supreme members])

                    ### 5. Order Status Summary
                    - Pending Orders: [Number of pending orders]
                    - Fulfilled Orders: [Number of fulfilled orders]
                    - Cancelled Orders: [Number of cancelled orders]

                    ### 6. Insights
                    - [Insight 1: e.g., trends in sales, popular payment methods, or stock issues. No SQL queries here.]
                    - [Insight 2]
                    - [Insight 3]

                    JSON Data:
                    ${JSON.stringify(reportData, null, 2)}

                    Please ensure the output is well-formatted using Markdown syntax for headings, lists, and code blocks.
                `;

                // 3. Call Gemini API
                console.log("Calling Gemini API with prepared prompt...");
                const apiKey = "AIzaSyCI_8aLOKtwlCHtCRb79aPvhyF2_uWh-ao"; // Canvas will automatically provide the API key at runtime for gemini-2.0-flash
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const chatHistory = [];
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                const payload = { contents: chatHistory };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                console.log("Gemini API response:", result);

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    setReportContent(text);
                } else {
                    setAiError(result.error?.message || 'Failed to generate AI report: No content received from Gemini.');
                    console.error("Gemini API Error details:", result);
                }
            } catch (err: any) {
                setAiError(err.message || 'An error occurred during AI report generation.');
                console.error('AI Report Generation Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        generateReport();
    }, [transactions, inventoryItems, members, orders, preCalculatedTotalRevenue]); // Add preCalculatedTotalRevenue to dependencies

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xl border border-gray-700 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-white">AI Sales and Stock Report</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 text-gray-200 text-sm leading-relaxed">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 size={32} className="animate-spin text-yellow-400" />
                            <span className="ml-3 text-yellow-400">Generating report...</span>
                        </div>
                    ) : aiError ? (
                        <div className="text-red-400">Error: {aiError}</div>
                    ) : (
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{reportContent}</pre>
                    )}
                </div>
                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesReportAI;
