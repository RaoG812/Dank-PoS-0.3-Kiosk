import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react'; // Ensure React is imported if this is a separate chunk
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, Atom, Wand2,
    // A smaller, more manageable set for AI suggestions + common usage
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
// Assuming Category type is defined elsewhere (e.g., in '@/types') as:
// interface Category {
//     id: string;
//     name: string;
//     // other properties like icon, etc.
// }

// New interface for Category (to be stored in Supabase)
interface Category {
    id: string;
    name: string;
    icon_name: string; // Storing the icon name as a string
}
// New Component: SortableMenuItemCategory
interface SortableMenuItemCategoryProps {
    category: Category;
    id: string; // The category name will serve as the ID for dnd-kit
    getCategoryIcon: (name: string) => React.ComponentType<{ className?: string }>;
    onClick: (categoryName: string) => void;
}

function SortableMenuItemCategory({ category, id, getCategoryIcon, onClick }: SortableMenuItemCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0, // Bring dragging item to front
        opacity: isDragging ? 0.6 : 1,
    };

    const IconComponent = getCategoryIcon(category.name);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700 transition-colors duration-200 transform text-yellow-400 border border-gray-700 cursor-grab active:cursor-grabbing"
            onClick={() => onClick(category.name)} // Still allow click if not dragging (e.g., to select for details)
        >
            <GripVertical className="w-6 h-6 mb-2 text-gray-400" /> {/* Drag handle */}
            <IconComponent className="w-16 h-16 mb-3" />
            <span className="text-xl font-semibold text-gray-100">{category.name}</span>
        </div>
    );
}
