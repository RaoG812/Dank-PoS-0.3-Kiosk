import React, { useRef, useState, useCallback, memo, useEffect } from 'react';

import * as LucideIcons from 'lucide-react'; // Import all icons from lucide-react

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

// Extend LucideIcons to include a common default if not already in Lucide
const ExtendedLucideIcons = { ...LucideIcons, CircleDashed: LucideIcons.CircleDashed };

interface DraggableCategoryLabelProps {
    categoryName: string;
    isChecked: boolean;
    layoutCategoryIndex: number; // The index of this category within the *current layout's* ordered categories
    allCategories: Array<{ id: string; name: string; icon_name: string; }>; // All available categories (for icon resolution)
    currentLayoutCategories: string[]; // The actual ordered list of category names in the current layout
    toggleCategoryInLayout: (categoryName: string) => void;
    onReorderCategories: (fromIndex: number, toIndex: number) => void;
}

// Map of icon names to Lucide React components (can be shared or passed as prop)
// This map should ideally be consistent with the one in App.tsx
const iconMap: { [key: string]: React.ElementType } = {
    Flower: LucideIcons.Flower,
    Syringe: LucideIcons.Syringe,
    Cookie: LucideIcons.Cookie,
    Cigarette: LucideIcons.Cigarette,
    Megaphone: LucideIcons.Megaphone,
    Leaf: LucideIcons.Leaf,
    ShoppingBag: LucideIcons.ShoppingBag,
    MoreHorizontal: LucideIcons.MoreHorizontal,
    CircleDashed: LucideIcons.CircleDashed,
    Coffee: LucideIcons.Coffee,
    Sandwich: LucideIcons.Sandwich,
    Shirt: LucideIcons.Shirt,
    Cloud: LucideIcons.Cloud,
    Gift: LucideIcons.Gift,
    Droplet: LucideIcons.Droplet,
    Bomb: LucideIcons.Bomb,
    Wrench: LucideIcons.Wrench,
    Heart: LucideIcons.Heart,
    Sprout: LucideIcons.Sprout, // Changed from Seed to Sprout
    ClipboardList: LucideIcons.ClipboardList,
    HardHat: LucideIcons.HardHat,
    GlassWater: LucideIcons.GlassWater,
    CupSoda: LucideIcons.CupSoda,
    Wine: LucideIcons.Wine, // Changed from Bottle to Wine
    Carrot: LucideIcons.Carrot,
    Cake: LucideIcons.Cake,
    IceCreamCone: LucideIcons.IceCreamCone, // Changed from IceCream
    Popcorn: LucideIcons.Popcorn,
    Lightbulb: LucideIcons.Lightbulb,
    Trees: LucideIcons.Trees,
    Shovel: LucideIcons.Shovel, // Changed from Fertilize to Shovel
    GripVertical: LucideIcons.GripVertical, // Ensure GripVertical is included for the handle
};

const DraggableCategoryLabel: React.FC<DraggableCategoryLabelProps> = memo(
    ({
        categoryName,
        isChecked,
        layoutCategoryIndex,
        allCategories,
        currentLayoutCategories, // This prop should always be an array
        toggleCategoryInLayout,
        onReorderCategories,
    }) => {
        // Hooks declared inside the component, ensuring they are called consistently
        const itemRef = useRef<HTMLLabelElement>(null);
        const touchStartPagePos = useRef({ x: 0, y: 0 }); // Initial touch position on the page (for movement threshold)
        const itemOffsetFromTouch = useRef({ x: 0, y: 0 }); // Offset of touch from item's top-left for precise positioning
        const [isDragging, setIsDragging] = useState(false); // State for visual feedback of the dragged item
        const [isTouchHolding, setIsTouchHolding] = useState(false); // State for visual feedback during the hold period
        const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the hold timer
        const [guidingLinePosition, setGuidingLinePosition] = useState<{ x: number, y: number, width: number } | null>(null); // State for guiding line position

        // Helper to get icon component by category name
        const getCategoryIcon = (name: string) => {
            const category = allCategories.find(cat => cat.name === name);
            return category && iconMap[category.icon_name] ? iconMap[category.icon_name] : ExtendedLucideIcons.CircleDashed;
        };

        const IconComponent = getCategoryIcon(categoryName);

        // --- Mouse Drag handlers ---
        const handleDragStart = useCallback((e: React.DragEvent) => {
            if (isChecked && layoutCategoryIndex !== -1) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", layoutCategoryIndex.toString());
                setIsDragging(true);
                // For native HTML drag, a "ghost" image is usually created.
                // We don't apply fixed positioning here unless overriding the default drag image.
            } else {
                e.preventDefault();
            }
        }, [isChecked, layoutCategoryIndex]);

        const handleDragOver = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            // Update guiding line position for mouse drag
            const targetElement = e.target as HTMLElement;
            const closestLabel = targetElement.closest('.flex.items-center.text-gray-200.p-2.rounded-md') as HTMLLabelElement | null;
            if (closestLabel) {
                const targetRect = closestLabel.getBoundingClientRect();
                setGuidingLinePosition({
                    x: targetRect.left,
                    y: targetRect.top + (targetRect.height / 2), // Center of the target item
                    width: targetRect.width
                });
            }
        }, []);

        const handleDragLeave = useCallback(() => {
            setGuidingLinePosition(null); // Hide guiding line on drag leave
        }, []);

        const handleDrop = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
            if (fromIndex === layoutCategoryIndex) return;

            onReorderCategories(fromIndex, layoutCategoryIndex);
            setIsDragging(false);
            setGuidingLinePosition(null); // Hide line on drop
        }, [layoutCategoryIndex, onReorderCategories]);

        const handleDragEnd = useCallback(() => {
            setIsDragging(false);
            setGuidingLinePosition(null); // Hide line on drag end
        }, []);

        // --- Touch Drag handlers ---
        const handleTouchStart = useCallback((e: React.TouchEvent) => {
            if (isChecked && layoutCategoryIndex !== -1) {
                if (touchTimeoutRef.current) {
                    clearTimeout(touchTimeoutRef.current);
                }

                touchStartPagePos.current = { x: e.touches[0].pageX, y: e.touches[0].pageY };
                setIsTouchHolding(true); // Indicate hold is active for visual feedback

                if (itemRef.current) {
                    const rect = itemRef.current.getBoundingClientRect();
                    itemOffsetFromTouch.current = {
                        x: e.touches[0].clientX - rect.left,
                        y: e.touches[0].clientY - rect.top,
                    };
                }

                touchTimeoutRef.current = setTimeout(() => {
                    setIsTouchHolding(false); // Hold timer elapsed, stop hold feedback
                    setIsDragging(true); // Initiate dragging state

                    if (itemRef.current) {
                        itemRef.current.classList.add('touch-dragging');
                        itemRef.current.style.position = 'fixed';
                        itemRef.current.style.width = `${itemRef.current.offsetWidth}px`;
                        itemRef.current.style.height = `${itemRef.current.offsetHeight}px`;
                        itemRef.current.style.zIndex = '1000';
                        itemRef.current.style.left = `${e.touches[0].clientX - itemOffsetFromTouch.current.x}px`;
                        itemRef.current.style.top = `${e.touches[0].clientY - itemOffsetFromTouch.current.y}px`;
                    }
                }, 1000); // 1 second hold
            }
        }, [isChecked, layoutCategoryIndex]);

        const internalTouchMoveHandler = useCallback((e: TouchEvent) => {
            // If dragging state is active, prevent default and update position
            if (isDragging) {
                e.preventDefault(); // Crucial for preventing scrolling during touch drag
                if (itemRef.current) {
                    itemRef.current.style.left = `${e.touches[0].clientX - itemOffsetFromTouch.current.x}px`;
                    itemRef.current.style.top = `${e.touches[0].clientY - itemOffsetFromTouch.current.y}px`;

                    // Logic to update guiding line position on touchmove
                    const targetElement = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                    const currentTargetLabel = targetElement?.closest('.flex.items-center.text-gray-200.p-2.rounded-md') as HTMLLabelElement | null;

                    if (currentTargetLabel && currentTargetLabel !== itemRef.current) {
                        const targetRect = currentTargetLabel.getBoundingClientRect();
                        setGuidingLinePosition({
                            x: targetRect.left,
                            y: targetRect.top + (targetRect.height / 2),
                            width: targetRect.width
                        });
                    } else {
                        setGuidingLinePosition(null); // Hide if not hovering over a valid target
                    }
                }
            } else if (isTouchHolding && touchTimeoutRef.current) {
                // If in hold state, check for significant movement to cancel hold timer
                const deltaX = Math.abs(e.touches[0].pageX - touchStartPagePos.current.x);
                const deltaY = Math.abs(e.touches[0].pageY - touchStartPagePos.current.y);

                if (deltaX > 10 || deltaY > 10) { // Small threshold for accidental movement
                    clearTimeout(touchTimeoutRef.current);
                    touchTimeoutRef.current = null;
                    setIsTouchHolding(false);
                    setIsDragging(false); // Ensure dragging is false
                    setGuidingLinePosition(null); // Hide line
                    if (itemRef.current) {
                        itemRef.current.classList.remove('touch-dragging');
                        // Reset styles
                        itemRef.current.style.position = '';
                        itemRef.current.style.width = '';
                        itemRef.current.style.height = '';
                        itemRef.current.style.zIndex = '';
                        itemRef.current.style.left = '';
                        itemRef.current.style.top = '';
                    }
                }
            }
        }, [isDragging, isTouchHolding]);

        const handleTouchEnd = useCallback((e: React.TouchEvent) => {
            if (touchTimeoutRef.current) {
                clearTimeout(touchTimeoutRef.current);
                touchTimeoutRef.current = null;
            }
            setIsTouchHolding(false);

            if (isDragging) {
                if (itemRef.current) {
                    itemRef.current.classList.remove('touch-dragging');
                    // Reset styles applied during dragging
                    itemRef.current.style.position = '';
                    itemRef.current.style.width = '';
                    itemRef.current.style.height = '';
                    itemRef.current.style.zIndex = '';
                    itemRef.current.style.left = '';
                    itemRef.current.style.top = '';
                }

                setGuidingLinePosition(null); // Hide line on touch end

                const finalX = e.changedTouches[0].clientX;
                const finalY = e.changedTouches[0].clientY;
                const dropTargetElement = document.elementFromPoint(finalX, finalY);

                if (dropTargetElement) {
                    const targetLabel = dropTargetElement.closest('.flex.items-center.text-gray-200.p-2.rounded-md') as HTMLLabelElement | null;

                    if (targetLabel && itemRef.current && targetLabel !== itemRef.current) {
                        const targetCategoryNameElement = targetLabel.querySelector('span');
                        if (targetCategoryNameElement) {
                            const targetCategoryName = targetCategoryNameElement.innerText;

                            // Defensive check: Ensure currentLayoutCategories is an array
                            if (Array.isArray(currentLayoutCategories)) {
                                const targetIndex = currentLayoutCategories.indexOf(targetCategoryName);

                                if (targetIndex !== -1 && layoutCategoryIndex !== targetIndex) {
                                    onReorderCategories(layoutCategoryIndex, targetIndex);
                                }
                            } else {
                                // Log if currentLayoutCategories is not an array, this indicates a problem in parent prop passing
                                console.error("currentLayoutCategories is not an array (TouchEnd):", currentLayoutCategories);
                            }
                        }
                    }
                }
            }
            setIsDragging(false);
        }, [isDragging, layoutCategoryIndex, onReorderCategories, currentLayoutCategories]); // Add currentLayoutCategories to dependencies

        // Effect to imperatively add/remove touchmove listener with passive: false
        useEffect(() => {
            const currentItemRef = itemRef.current;
            if (currentItemRef) {
                // Add event listener with { passive: false } to allow preventDefault
                currentItemRef.addEventListener('touchmove', internalTouchMoveHandler, { passive: false });
            }

            return () => {
                // Cleanup the event listener when component unmounts or handler changes
                if (currentItemRef) {
                    currentItemRef.removeEventListener('touchmove', internalTouchMoveHandler);
                }
            };
        }, [internalTouchMoveHandler]); // Dependency on internalTouchMoveHandler ensures it's current

        return (
            <>
                <label
                    ref={itemRef} // Attach ref here
                    // Apply classes for styling the draggable item itself
                    className={`flex items-center text-gray-200 p-2 rounded-md transition-all duration-100 
                                ${isChecked ? 'bg-gray-700 cursor-grab' : 'bg-gray-800 opacity-60 cursor-not-allowed'} 
                                ${isTouchHolding ? 'border-2 border-blue-400' : ''}  // Feedback for hold
                                ${isDragging ? 'border-2 border-yellow-400 bg-gray-600 shadow-xl opacity-70' : ''} // Feedback for dragging
                                `} // Removed targetIsHovered from here as guiding line is used
                    // Mouse Drag Events
                    draggable={isChecked} // Only draggable with mouse if selected
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave} // Added for accurate hover state
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    // Touch Events
                    onTouchStart={handleTouchStart}
                    // onTouchMove is now handled by useEffect with addEventListener
                    onTouchEnd={handleTouchEnd}
                >
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategoryInLayout(categoryName)}
                        className="form-checkbox h-5 w-5 text-yellow-400 rounded focus:ring-yellow-400 bg-gray-700 border-gray-600 cursor-pointer"
                    />
                    <span className="ml-2">{categoryName}</span>
                    {isChecked && ( // Show grab handle for selected/draggable items
                        <span className="ml-auto text-gray-400 cursor-grab">
                            <LucideIcons.GripVertical className="w-5 h-5" /> {/* Using Lucide icon directly */}
                        </span>
                    )}
                </label>
                {/* Guiding Line */}
                {guidingLinePosition && (
                    <div
                        style={{
                            position: 'fixed',
                            left: guidingLinePosition.x,
                            top: guidingLinePosition.y,
                            width: guidingLinePosition.width,
                            height: '2px', // Thin line
                            backgroundColor: 'rgba(74, 222, 128, 0.8)', // Green, semi-transparent
                            zIndex: 1001, // Above the dragged item
                            pointerEvents: 'none', // Ensure it doesn't interfere with mouse events
                            transform: 'translateY(-50%)', // Center vertically
                        }}
                    />
                )}
            </>
        );
    }
);

DraggableCategoryLabel.displayName = 'DraggableCategoryLabel';

export default DraggableCategoryLabel;
