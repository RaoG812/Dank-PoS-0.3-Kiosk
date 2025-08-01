"use client"

// InvoiceForm (1).tsx
import type React from "react"
import { useState, useEffect } from "react"
import { getClientSupabaseClient } from '@/lib/supabase/client'; // <--- UPDATED IMPORT
import { CompanySettings, CompanySettingsFormData } from '@/types';


import { XCircle, Plus, Trash2, Search } from "lucide-react"

// Custom Scrollbar Styles
// These styles will make the scrollbar match your dark theme
// and provide a consistent look across browsers.

const customScrollbarStyles = `
/* Custom Scrollbar Styles */
.custom-scrollbar::-webkit-scrollbar {
    width: 8px; /* For vertical scrollbars */
    height: 8px; /* For horizontal scrollbars */
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: #374151; /* bg-gray-700 */
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #6b7280; /* bg-gray-500 */
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af; /* bg-gray-400 */
}

/* For Firefox */
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #6b7280 #374151;
}
`

// Assuming InventoryItem and other types are defined elsewhere or can be mocked for this component
interface InventoryItem {
  id: string
  barcode_id?: string
  name: string
  description: string
  category: string
  available_stock: number | null // Updated to allow null
  reserved_stock: number | null // Updated to allow null
  pricing_options: {
    id: string
    name: string
    price: number
    unit: string
  }[]
}

// Define a minimal Member interface for the dropdown
interface Member {
  uid: string
  name: string
  card_number: number
}

// Corrected InvoiceItem to allow for custom items without an inventoryId
export interface InvoiceItem {
  inventoryId?: string // Now optional
  description: string
  pricePerUnit: number
  originalPrice: number // Store the original price for reference
  quantity: number
  selectedOptionId?: string // Now optional
  unit: string
}

export interface InvoiceFormData {
  companyName: string
  companyAddress: string
  companyTaxId: string
  clientName: string
  clientAddress: string
  clientTaxId: string
  items: InvoiceItem[]
  // New payment details fields
  receiverName: string
  bankName: string
  accountNumber: string
  isTaxIncluded: boolean // Add tax inclusion status
  // New email fields
  sendEmail: boolean
  recipientEmail: string
  emailMessage: string
}

interface InvoiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: InvoiceFormData, createOrder: boolean, memberUid: string | null) => void
  inventoryItems: InventoryItem[]
  formatCurrency: (amount: number) => string
  members: Member[] // Add members prop for the dropdown
  companySettings: CompanySettingsFormData | null; // ADDED: companySettings prop
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventoryItems,
  formatCurrency,
  members,
}) => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    companyName: "Noname Cannabis Club",
    companyAddress: "4/20 XX XXXXXXXXX XXXXXXXX XXXXX",
    companyTaxId: "1234567890123",
    clientName: "",
    clientAddress: "",
    clientTaxId: "",

    items: [] as InvoiceItem[],
    receiverName: "",
    bankName: "",
    accountNumber: "",
    isTaxIncluded: false, // Initial state for tax inclusion
    sendEmail: false, // Initial state for email sending
    recipientEmail: "", // Initial state for recipient email
    emailMessage:
      "Dear Client,\n\nPlease find attached your invoice. Thank you for your business!\n\nSincerely,\nSamui Cannabis Club", // Initial email message
  })
  const [isLoadingCompanyData, setIsLoadingCompanyData] = useState(true)
  useEffect(() => {
    const fetchCompanySettings = async () => {
      setIsLoadingCompanyData(true)
      try {
        const supabase = getClientSupabaseClient(); // <--- CRUCIAL CHANGE: Get client-side client
        const { data, error } = await supabase.from("company_settings").select("*").eq("id", "company_info").single()

        if (error) {
          console.error("Error fetching company settings for InvoiceForm:", error)
          // Fallback to defaults or show error
          setFormData((prev) => ({
            ...prev,
            companyName: "Noname Cannabis Club (Default)",
            companyAddress: "4/20 XX XXXXXXXXX XXXXXXXX XXXXX (Default)",
            companyTaxId: "1234567890123 (Default)",
            receiverName: "Noname Cannabis Club Co., ltd (Default)",
            bankName: "Noname Bank (Default)",
            accountNumber: "123-4-56789-0 (Default)",
          }))
          // Optionally show a toast error
        } else if (data) {
          setFormData((prev) => ({
            ...prev,
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyTaxId: data.company_tax_id,
            receiverName: data.receiver_name,
            bankName: data.bank_name,
            accountNumber: data.account_number,
          }))
        }
      } catch (err) {
        console.error("Error in fetchCompanySettings:", err)
        // Set fallback values in case of any error
        setFormData((prev) => ({
          ...prev,
          companyName: "Noname Cannabis Club (Default)",
          companyAddress: "4/20 XX XXXXXXXXX XXXXXXXX XXXXX (Default)",
          companyTaxId: "1234567890123 (Error)",
          receiverName: "Noname Cannabis Club (Error)",
          bankName: "Noname Bank (Error)",
          accountNumber: "123-4-56789-0 (Error)",
        }))
      } finally {
        setIsLoadingCompanyData(false)
      }
    }

    fetchCompanySettings()
  }, []) // Run once on component mount

  const [createOrder, setCreateOrder] = useState(false)
  const [isCustomItemAdded, setIsCustomItemAdded] = useState(false)
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null)

  const [itemSearchQuery, setItemSearchQuery] = useState<string>("")
  const [selectedItemForAddition, setSelectedItemForAddition] = useState<InventoryItem | null>(null)
  const [selectedPricingOption, setSelectedPricingOption] = useState<{
    id: string
    name: string
    price: number
    unit: string
  } | null>(null)
  const [itemQuantityToAdd, setItemQuantityToAdd] = useState<number>(1)
  const [itemManualPrice, setItemManualPrice] = useState<number>(0)
  
  // State for custom items
  const [customItemDescription, setCustomItemDescription] = useState<string>("")
  const [customItemPrice, setCustomItemPrice] = useState<number>(0)
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1)

  const VAT_RATE = 0.07

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientName) {
      console.error("Please enter client name")
      return
    }
    if (formData.items.length === 0) {
      console.error("Please add at least one item")
      return
    }
    if (createOrder && !selectedMemberUid) {
      console.error("Please select a member for the order.")
      return
    }
    if (formData.sendEmail && !formData.recipientEmail) {
      console.error("Please enter recipient email to send invoice.")
      return
    }

    // Pass formData directly, as isTaxIncluded is now part of it

    // Corrected code:
    onSubmit(formData, createOrder, selectedMemberUid) // isTaxIncluded is already inside formData
  }

  const handleAddItemToInvoice = () => {
    if (!selectedItemForAddition || !selectedPricingOption || itemQuantityToAdd <= 0) {
      alert("Please select an item, pricing option, and valid quantity to add.")
      return
    }

    const availableStock =
      (selectedItemForAddition.available_stock ?? 0) - (selectedItemForAddition.reserved_stock ?? 0)
    if (itemQuantityToAdd > availableStock) {
      alert(
        `Not enough stock for ${selectedItemForAddition.name}. Available: ${availableStock}, Requested: ${itemQuantityToAdd}.`,
      )
      return
    }

    const priceToUse = itemManualPrice > 0 ? itemManualPrice : selectedPricingOption.price

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventoryId: selectedItemForAddition.id,
          description: selectedItemForAddition.name,
          pricePerUnit: priceToUse,
          originalPrice: selectedPricingOption.price,
          quantity: itemQuantityToAdd,
          selectedOptionId: selectedPricingOption.id,
          unit: selectedPricingOption.unit,
        },
      ],
    }))

    // Reset inventory item form state
    setIsCustomItemAdded(false)
    setItemSearchQuery("")
    setSelectedItemForAddition(null)
    setSelectedPricingOption(null)
    setItemQuantityToAdd(1)
    setItemManualPrice(0)
  }
  
  const handleAddCustomItem = () => {
      if (!customItemDescription || customItemPrice <= 0 || customItemQuantity <= 0) {
          alert("Please enter a valid description, price, and quantity for the custom item.");
          return;
      }
      
      const newCustomItem: InvoiceItem = {
          description: customItemDescription,
          pricePerUnit: customItemPrice,
          originalPrice: customItemPrice, // Original price is the same as the custom price
          quantity: customItemQuantity,
          unit: 'unit', // Or a default value
      };
      
      setFormData(prev => ({
          ...prev,
          items: [...prev.items, newCustomItem]
      }));
      
      setIsCustomItemAdded(true);
      
      // Reset custom item form state
      setCustomItemDescription("");
      setCustomItemPrice(0);
      setCustomItemQuantity(1);
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      // Re-check if any custom items are left after removal
      const hasCustomItem = newItems.some(item => item.inventoryId === undefined);
      setIsCustomItemAdded(hasCustomItem);
      return { ...prev, items: newItems };
    });
  };

  // This function is simplified as item selection is now handled by the new UI
  // It will mostly handle quantity and manual price changes for already added items.
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items]
    if (field === "pricePerUnit") {
      newItems[index] = {
        ...newItems[index],
        pricePerUnit: Number.parseFloat(value) || 0,
      }
    } else if (field === "quantity") {
      newItems[index] = {
        ...newItems[index],
        quantity: Math.max(1, Number.parseInt(value) || 1),
      }
    }
    setFormData((prev) => ({ ...prev, items: newItems }))
  }

  if (!isOpen) return null

  const calculateSubtotal = () => {
    const totalSum = formData.items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0)
    // Use formData.isTaxIncluded
    if (formData.isTaxIncluded) {
      return totalSum / (1 + VAT_RATE)
    }
    return totalSum
  }

  const calculateVat = () => {
    const totalSumOfItems = formData.items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0)
    // Use formData.isTaxIncluded
    if (formData.isTaxIncluded) {
      return totalSumOfItems - totalSumOfItems / (1 + VAT_RATE)
    }
    return totalSumOfItems * VAT_RATE
  }

  const calculateTotal = () => {
    const totalSumOfItems = formData.items.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0)
    // Use formData.isTaxIncluded
    if (formData.isTaxIncluded) {
      return totalSumOfItems
    }
    return totalSumOfItems + totalSumOfItems * VAT_RATE
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      {/* Inject custom scrollbar styles */}
      <style>{customScrollbarStyles}</style>
      <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700 my-8 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-yellow-400">Create New Invoice</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-400">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          {/* Company and Client Information in a two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200 mb-4">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Address</label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyAddress: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={formData.companyTaxId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyTaxId: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200 mb-4">Client Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Address</label>
                  <input
                    type="text"
                    value={formData.clientAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Client Tax ID</label>
                  <input
                    type="text"
                    value={formData.clientTaxId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, clientTaxId: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Receiver Name</label>
                <input
                  type="text"
                  value={formData.receiverName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, receiverName: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bank</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Account #</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Order Creation Toggle */}
          <div className="bg-gray-800 p-4 rounded-lg flex items-center space-x-3">
            <input
              type="checkbox"
              id="createOrderToggle"
              checked={createOrder}
              onChange={(e) => setCreateOrder(e.target.checked)}
              className="form-checkbox h-5 w-5 text-yellow-400 rounded focus:ring-yellow-400 bg-gray-700 border-gray-600 cursor-pointer"
              disabled={isCustomItemAdded} // Disable if custom item is added
            />
            <label htmlFor="createOrderToggle" className="text-gray-300 font-medium">
              Create Order along with Invoice
            </label>
            {isCustomItemAdded && (
              <span className="text-red-400 text-sm ml-2">
                (Disabled: Cannot create an order with custom items)
              </span>
            )}
          </div>

          {/* Tax Inclusion Toggle */}
          <div className="bg-gray-800 p-4 rounded-lg flex items-center space-x-3">
            <input
              type="checkbox"
              id="taxIncludedToggle"
              checked={formData.isTaxIncluded} // Use formData.isTaxIncluded
              onChange={(e) => setFormData((prev) => ({ ...prev, isTaxIncluded: e.target.checked }))} // Update formData directly
              className="form-checkbox h-5 w-5 text-yellow-400 rounded focus:ring-yellow-400 bg-gray-700 border-gray-600 cursor-pointer"
            />
            <label htmlFor="taxIncludedToggle" className="text-gray-300 font-medium">
              Prices include VAT ({VAT_RATE * 100}%)
            </label>
          </div>

          {/* Email Invoice Toggle */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="sendEmailToggle"
                checked={formData.sendEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                className="form-checkbox h-5 w-5 text-yellow-400 rounded focus:ring-yellow-400 bg-gray-700 border-gray-600 cursor-pointer"
              />
              <label htmlFor="sendEmailToggle" className="text-gray-300 font-medium">
                Send Invoice via Email
              </label>
            </div>
            {formData.sendEmail && (
              <>
                <div>
                  <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-300 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    id="recipientEmail"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                    required={formData.sendEmail} // Make required only if sendEmail is checked
                  />
                </div>
                <div>
                  <label htmlFor="emailMessage" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Message
                  </label>
                  <textarea
                    id="emailMessage"
                    value={formData.emailMessage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emailMessage: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 custom-scrollbar resize-y"
                  ></textarea>
                </div>
              </>
            )}
          </div>

          {/* Member Selection for Order */}
          {createOrder && members.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <label htmlFor="memberSelect" className="block text-sm font-medium text-gray-300 mb-1">
                Select Member for Order
              </label>
              <select
                id="memberSelect"
                value={selectedMemberUid || ""}
                onChange={(e) => setSelectedMemberUid(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                required={createOrder}
              >
                <option value="">-- Select a Member --</option>
                {members.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.name} ({member.card_number})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Add Item Section */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-gray-200">Add Items to Invoice</h3>
            
            {/* Toggle between inventory and custom item */}
            <div className="flex space-x-4 mb-4">
                <button
                    type="button"
                    onClick={() => setIsCustomItemAdded(false)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                        !isCustomItemAdded
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    From Inventory
                </button>
                <button
                    type="button"
                    onClick={() => {
                      setIsCustomItemAdded(true);
                      setCreateOrder(false); // Cannot create order with custom item
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                        isCustomItemAdded
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                    Custom Item
                </button>
            </div>


            {!isCustomItemAdded ? (
                // Inventory Item Selection
                <>
                <div>
                  <label htmlFor="itemSearch" className="block text-sm font-medium text-gray-300 mb-1">
                    Search Inventory Item
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="itemSearch"
                      value={itemSearchQuery}
                      onChange={(e) => {
                        setItemSearchQuery(e.target.value);
                        setSelectedItemForAddition(null); // Reset selection on search change
                        setSelectedPricingOption(null);
                      }}
                      className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                      placeholder="e.g., Green Crack, OG Kush"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {itemSearchQuery && (
                  <div className="max-h-48 overflow-y-auto bg-gray-700 border border-gray-600 rounded-lg custom-scrollbar">
                    {inventoryItems
                      .filter((item) =>
                        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 cursor-pointer hover:bg-gray-600 text-gray-200"
                          onClick={() => {
                            setSelectedItemForAddition(item);
                            setSelectedPricingOption(item.pricing_options.length > 0 ? item.pricing_options[0] : null);
                            setItemSearchQuery(item.name); // Keep selected item name in search box
                          }}
                        >
                          {item.name} ({item.available_stock !== null ? item.available_stock - (item.reserved_stock ?? 0) : 'N/A'} in stock)
                        </div>
                      ))}
                    {inventoryItems.filter((item) =>
                      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <p className="p-3 text-gray-400">No items found.</p>
                    )}
                  </div>
                )}

                {selectedItemForAddition && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Selected Item: <span className="text-yellow-400">{selectedItemForAddition.name}</span>
                      </label>
                      <p className="text-sm text-gray-400">Available Stock: {selectedItemForAddition.available_stock !== null ? selectedItemForAddition.available_stock - (selectedItemForAddition.reserved_stock ?? 0) : 'N/A'}</p>
                    </div>

                    {selectedItemForAddition.pricing_options.length > 0 && (
                      <div>
                        <label htmlFor="pricingOption" className="block text-sm font-medium text-gray-300 mb-1">
                          Pricing Option
                        </label>
                        <select
                          id="pricingOption"
                          value={selectedPricingOption?.id || ""}
                          onChange={(e) => {
                            const selectedOption = selectedItemForAddition.pricing_options.find(
                              (option) => option.id === e.target.value
                            )
                            setSelectedPricingOption(selectedOption || null)
                            setItemManualPrice(0); // Reset manual price when pricing option changes
                          }}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                        >
                          {selectedItemForAddition.pricing_options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name} ({formatCurrency(option.price)} per {option.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedPricingOption && (
                      <>
                        <div>
                          <label htmlFor="itemQuantity" className="block text-sm font-medium text-gray-300 mb-1">
                            Quantity ({selectedPricingOption.unit})
                          </label>
                          <input
                            type="number"
                            id="itemQuantity"
                            value={itemQuantityToAdd}
                            onChange={(e) => setItemQuantityToAdd(Number.parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                          />
                        </div>
                        <div>
                          <label htmlFor="itemManualPrice" className="block text-sm font-medium text-gray-300 mb-1">
                            Manual Price (Optional - per {selectedPricingOption.unit})
                          </label>
                          <input
                            type="number"
                            id="itemManualPrice"
                            value={itemManualPrice}
                            onChange={(e) => setItemManualPrice(Number.parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            placeholder={selectedPricingOption.price.toFixed(2)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddItemToInvoice}
                          className="w-full px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 flex items-center justify-center"
                        >
                          <Plus className="w-5 h-5 mr-2" /> Add Item
                        </button>
                      </>
                    )}
                  </div>
                ) }
                </>
            ) : (
                // Custom Item Addition
                <div className="space-y-4">
                    <div>
                        <label htmlFor="customItemDescription" className="block text-sm font-medium text-gray-300 mb-1">
                            Description
                        </label>
                        <input
                            type="text"
                            id="customItemDescription"
                            value={customItemDescription}
                            onChange={(e) => setCustomItemDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            placeholder="e.g., Consultation Fee"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="customItemPrice" className="block text-sm font-medium text-gray-300 mb-1">
                            Price Per Unit
                        </label>
                        <input
                            type="number"
                            id="customItemPrice"
                            value={customItemPrice}
                            onChange={(e) => setCustomItemPrice(Number.parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="customItemQuantity" className="block text-sm font-medium text-gray-300 mb-1">
                            Quantity
                        </label>
                        <input
                            type="number"
                            id="customItemQuantity"
                            value={customItemQuantity}
                            onChange={(e) => setCustomItemQuantity(Number.parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            required
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="w-full px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Add Custom Item
                    </button>
                </div>
            )}
            
          </div>

          {/* Added Items List */}
          <div className="bg-gray-800 p-4 rounded-lg flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Invoice Items</h3>
            {formData.items.length > 0 ? (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-700 p-3 rounded-lg shadow-sm"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <p className="text-gray-200 font-medium col-span-1 md:col-span-1">{item.description}</p>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-400">Qty:</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          min="1"
                          className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-gray-200 text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-400">Price:</label>
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => handleItemChange(index, "pricePerUnit", e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-gray-200 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 ml-4"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-2">Search for an item to add it to the invoice.</p>
            )}

            {/* Totals */}
            <div className="mt-4 p-4 bg-gray-700 rounded-lg space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal {formData.isTaxIncluded ? "(excl. VAT)" : ""}:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>VAT ({VAT_RATE * 100}%):</span>
                <span>{formatCurrency(calculateVat())}</span>
              </div>
              <div className="flex justify-between text-yellow-400 font-bold text-lg">
                <span>Total {formData.isTaxIncluded ? "(incl. VAT)" : ""}:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500">
              Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
