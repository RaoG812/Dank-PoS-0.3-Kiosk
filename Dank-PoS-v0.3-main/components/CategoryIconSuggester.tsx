import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, Atom,
    // Additional icons for better mapping
    Coffee, Shirt, Cloud, Gift, Droplet, Heart, Wrench, Cake, IceCream, Popcorn,
    Sprout, Lightbulb, Trees, Bot, GlassWater, CupSoda, Carrot, Sandwich
} from 'lucide-react';

interface CategoryIconSuggesterProps {
    categoryName: string;
    onIconSuggested: (iconName: string | null) => void;
    onClose: () => void;
}

// Create a comprehensive icon map with keyword associations
const iconMap: { [key: string]: string } = {
    // Cannabis products
    'flower': 'Flower',
    'hash': 'Syringe',
    'extracts': 'Syringe',
    'edibles': 'Cookie',
    'prerolls': 'Cigarette',
    'preroll': 'Cigarette',
    'joint': 'Cigarette',
    'blunt': 'Cigarette',
    'concentrate': 'Droplet',
    'concentrates': 'Droplet',
    'oil': 'Droplet',
    'wax': 'Droplet',
    'shatter': 'Droplet',
    'rosin': 'Droplet',
    'live': 'Droplet',
    'resin': 'Droplet',
    'distillate': 'Droplet',
    'cart': 'Cloud',
    'cartridge': 'Cloud',
    'vape': 'Cloud',
    'vaporizer': 'Cloud',
    'pen': 'Cloud',
    
    // CBD and wellness
    'cbd': 'Leaf',
    'hemp': 'Leaf',
    'wellness': 'Heart',
    'medical': 'Heart',
    'health': 'Heart',
    'tincture': 'Droplet',
    'topical': 'Heart',
    'salve': 'Heart',
    'balm': 'Heart',
    'cream': 'Heart',
    'lotion': 'Heart',
    
    // Food and beverages
    'food': 'Sandwich',
    'sandwich': 'Sandwich',
    'drink': 'Coffee',
    'coffee': 'Coffee',
    'tea': 'CupSoda',
    'water': 'Droplet',
    'juice': 'Carrot',
    'bakery': 'Cake',
    'dessert': 'IceCream',
    'ice': 'IceCream',
    'snack': 'Popcorn',
    'chocolate': 'Cookie',
    'candy': 'Cookie',
    'gummy': 'Cookie',
    'gummies': 'Cookie',
    
    // Apparel and merchandise
    'apparel': 'Shirt',
    'clothing': 'Shirt',
    'shirt': 'Shirt',
    'merchandise': 'Gift',
    'merch': 'Gift',
    'gift': 'Gift',
    'accessories': 'ShoppingBag',
    'accessory': 'ShoppingBag',
    
    // Growing and equipment
    'seeds': 'Sprout',
    'seed': 'Sprout',
    'clones': 'Sprout',
    'clone': 'Sprout',
    'grow': 'Sprout',
    'growing': 'Sprout',
    'equipment': 'Wrench',
    'gear': 'Wrench',
    'tool': 'Wrench',
    'tools': 'Wrench',
    'lighting': 'Lightbulb',
    'light': 'Lightbulb',
    'lights': 'Lightbulb',
    'soil': 'Trees',
    'fertilizer': 'Sprout',
    'nutrients': 'Sprout',
    'nutrient': 'Sprout',
    
    // Glass and smoking accessories
    'glass': 'GlassWater',
    'pipe': 'GlassWater',
    'bong': 'GlassWater',
    'bowl': 'GlassWater',
    'rig': 'GlassWater',
    'dab': 'GlassWater',
    'dabbing': 'GlassWater',
    
    // Promotional and business
    'promo': 'Megaphone',
    'promotion': 'Megaphone',
    'promotional': 'Megaphone',
    'special': 'Megaphone',
    'deal': 'Megaphone',
    'deals': 'Megaphone',
    'sale': 'Megaphone',
    'discount': 'Megaphone',
    
    // General categories
    'other': 'MoreHorizontal',
    'misc': 'MoreHorizontal',
    'miscellaneous': 'MoreHorizontal',
    'general': 'Package',
    'default': 'CircleDashed'
};

// Create a map of all available Lucide icons for quick lookup
const availableIcons: { [key: string]: React.ElementType } = {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, Atom,
    Coffee, Shirt, Cloud, Gift, Droplet, Heart, Wrench, Cake, IceCream, Popcorn,
    Sprout, Lightbulb, Trees, Bot, GlassWater, CupSoda, Carrot, Sandwich
};

const CategoryIconSuggester: React.FC<CategoryIconSuggesterProps> = ({ categoryName, onIconSuggested, onClose }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const lowerCaseCategoryName = categoryName.toLowerCase().trim();
        const foundIconNames: string[] = [];

        // 1. Check for exact matches in our keyword map
        if (iconMap[lowerCaseCategoryName]) {
            const exactMatch = iconMap[lowerCaseCategoryName];
            if (availableIcons[exactMatch]) {
                foundIconNames.push(exactMatch);
            }
        }

        // 2. Check for partial matches in keyword map
        Object.entries(iconMap).forEach(([keyword, iconName]) => {
            if (keyword !== lowerCaseCategoryName && 
                (keyword.includes(lowerCaseCategoryName) || lowerCaseCategoryName.includes(keyword)) &&
                availableIcons[iconName] &&
                !foundIconNames.includes(iconName)) {
                foundIconNames.push(iconName);
            }
        });

        // 3. Check for icons whose names contain the category name
        Object.keys(availableIcons).forEach(iconName => {
            const lowerIconName = iconName.toLowerCase();
            if (lowerIconName.includes(lowerCaseCategoryName) && 
                !foundIconNames.includes(iconName)) {
                foundIconNames.push(iconName);
            }
        });

        // 4. Add some general relevant icons based on common patterns
        const generalSuggestions = ['Package', 'ShoppingBag', 'Grid', 'MoreHorizontal'];
        generalSuggestions.forEach(iconName => {
            if (availableIcons[iconName] && !foundIconNames.includes(iconName)) {
                foundIconNames.push(iconName);
            }
        });

        // 5. Fallback to CircleDashed if no matches found
        if (foundIconNames.length === 0) {
            foundIconNames.push('CircleDashed');
        }

        // Limit to 12 suggestions for better UX
        setSuggestions(foundIconNames.slice(0, 12));
    }, [categoryName]);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">
                    Suggest Icon for &quot;{categoryName}&quot;
                </h3>
                <div className="grid grid-cols-4 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {suggestions.map((iconName) => {
                        const IconComponent = availableIcons[iconName];
                        if (!IconComponent) return null;

                        return (
                            <button
                                key={iconName}
                                onClick={() => {
                                    onIconSuggested(iconName);
                                    onClose();
                                }}
                                className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-700 hover:bg-yellow-500 hover:text-gray-900 transition-colors duration-200 text-gray-200 text-xs"
                            >
                                <IconComponent size={24} className="mb-1" />
                                <span className="text-center leading-tight">{iconName}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryIconSuggester;
