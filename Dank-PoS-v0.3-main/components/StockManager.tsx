// app/components/StockManager.tsx
import { InventoryItem } from '@/types'; // Assuming InventoryItem type is defined in '@/types'

interface StockUpdateResult {
    success: boolean;
    message?: string; // Add message to indicate success or specific error
}

export const updateStock = async (stockUpdates: Partial<InventoryItem>[]): Promise<StockUpdateResult> => {
    try {
        const response = await fetch('/api/inventory', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockUpdates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error || response.statusText || 'Unknown error during stock update.';
            console.error('Failed to update inventory stock:', errorMessage);
            return { success: false, message: `Failed to update stock: ${errorMessage}` };
        }
        console.log('Stock updated successfully.');
        return { success: true, message: "Stock updated successfully." };
    } catch (error: any) {
        console.error('Error during stock update fetch:', error.message || error);
        return { success: false, message: `Network error or unexpected issue: ${error.message || String(error)}` };
    }
};

// Function to reserve stock when an order is created
export const reserveStockForOrder = async (
    orderItems: Array<{ itemId: string; quantity: number }>,
    currentInventory: InventoryItem[]
): Promise<StockUpdateResult> => {
    const stockUpdates: Partial<InventoryItem>[] = [];
    for (const item of orderItems) {
        const currentInvItem = currentInventory.find(inv => inv.id === item.itemId);
        if (!currentInvItem) {
            return { success: false, message: `Item with ID ${item.itemId} not found.` };
        }

        const newAvailableStock = (currentInvItem.available_stock ?? 0) - item.quantity;
        const newReservedStock = (currentInvItem.reserved_stock ?? 0) + item.quantity;

        if (newAvailableStock < 0) {
            return { success: false, message: `Not enough available stock for ${currentInvItem.name}.` };
        }

        stockUpdates.push({
            ...currentInvItem, // Include all existing fields for backend validation
            available_stock: newAvailableStock,
            reserved_stock: newReservedStock,
        });
    }

    const result = await updateStock(stockUpdates);
    return { success: result.success, message: result.success ? "Stock reserved successfully." : result.message };
};

// Function to fulfill stock when an order is completed (deducts from reserved)
export const fulfillStockFromOrder = async (
    orderItems: Array<{ itemId: string; quantity: number }>,
    currentInventory: InventoryItem[]
): Promise<StockUpdateResult> => {
    const stockUpdates: Partial<InventoryItem>[] = [];
    for (const item of orderItems) {
        const currentInvItem = currentInventory.find(inv => inv.id === item.itemId);
        if (!currentInvItem) {
            return { success: false, message: `Item with ID ${item.itemId} not found.` };
        }

        const newReservedStock = (currentInvItem.reserved_stock ?? 0) - item.quantity;

        if (newReservedStock < 0) {
            return { success: false, message: `Reserved stock for ${currentInvItem.name} is insufficient for fulfillment.` };
        }

        stockUpdates.push({
            ...currentInvItem, // Include all existing fields for backend validation
            // Available stock was already reduced when reserved, so no change to it during fulfillment.
            // Only reserved stock needs to be reduced.
            reserved_stock: newReservedStock,
        });
    }

    const result = await updateStock(stockUpdates);
    return { success: result.success, message: result.success ? "Stock fulfilled successfully." : result.message };
};

// Function to release reserved stock when an order is cancelled (moves from reserved back to available)
export const releaseStockFromOrder = async (
    orderItems: Array<{ itemId: string; quantity: number }>,
    currentInventory: InventoryItem[]
): Promise<StockUpdateResult> => {
    const stockUpdates: Partial<InventoryItem>[] = [];
    for (const item of orderItems) {
        const currentInvItem = currentInventory.find(inv => inv.id === item.itemId);
        if (!currentInvItem) {
            return { success: false, message: `Item with ID ${item.itemId} not found.` };
        }

        const newAvailableStock = (currentInvItem.available_stock ?? 0) + item.quantity; // Adds to available
        const newReservedStock = (currentInvItem.reserved_stock ?? 0) - item.quantity; // Subtracts from reserved

        if (newReservedStock < 0) {
            return { success: false, message: `Reserved stock for ${currentInvItem.name} is insufficient for release.` };
        }

        stockUpdates.push({
            ...currentInvItem,
            available_stock: newAvailableStock,
            reserved_stock: newReservedStock,
        });
    }

    const result = await updateStock(stockUpdates); // Calls the backend update
    return { success: result.success, message: result.success ? "Stock released successfully." : result.message };
};
