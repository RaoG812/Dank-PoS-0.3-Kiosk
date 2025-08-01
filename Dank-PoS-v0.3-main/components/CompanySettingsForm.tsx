
// components/CompanySettingsForm.tsx
'use client'; // If this is a client component in App Router

import React, { useState, useEffect } from 'react';
import { getClientSupabaseClient } from '@/lib/supabase/client'; // Use the client-side Supabase instance
import { CompanySettings, CompanySettingsFormData, AdminUser } from '@/types'; // Import AdminUser type
import { ChevronDown, ChevronUp, Edit, Save, XCircle } from 'lucide-react'; // Example icons, install lucide-react if not already
import toast from 'react-hot-toast'; // For notifications, install react-hot-toast if not already

interface CompanySettingsFormProps {
  // You can pass a refresh callback if needed by parent
}

const CompanySettingsForm: React.FC<CompanySettingsFormProps> = () => {
  const supabase = getClientSupabaseClient(); // Use the dynamically initialized client
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettingsFormData>({
    companyName: '',
    companyAddress: '',
    companyTaxId: '',
    receiverName: '',
    bankName: '',
    accountNumber: '',
  });
  const [initialCompanySettings, setInitialCompanySettings] = useState<CompanySettingsFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'company_info') // Assuming 'company_info' is your fixed ID
        .single();

      if (error) {
        console.error('Error fetching company settings:', error);
        toast.error('Failed to load company settings.');
        setIsLoading(false);
        return;
      }

      if (data) {
        const mappedData: CompanySettingsFormData = {
          companyName: data.company_name,
          companyAddress: data.company_address,
          companyTaxId: data.company_tax_id,
          receiverName: data.receiver_name,
          bankName: data.bank_name,
          accountNumber: data.account_number,
        };
        setCompanySettings(mappedData);
        setInitialCompanySettings(mappedData); // Store initial state for comparison
      }
      setIsLoading(false);
    };

    fetchCompanySettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (initialCompanySettings) {
      setCompanySettings(initialCompanySettings); // Revert to initial state
    }
    toast('Changes discarded.', { icon: '👋' });
  };

  const handleSave = async () => {
    setIsLoading(true);
    const { companyName, companyAddress, companyTaxId, receiverName, bankName, accountNumber } = companySettings;

    const { data, error } = await supabase
      .from('company_settings')
      .upsert({
        id: 'company_info', // Ensure this ID matches your table's unique ID
        company_name: companyName,
        company_address: companyAddress,
        company_tax_id: companyTaxId,
        receiver_name: receiverName,
        bank_name: bankName,
        account_number: accountNumber,
        updated_at: new Date().toISOString(), // Update timestamp
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings.');
      setIsLoading(false);
      return;
    }

    if (data) {
      const savedData: CompanySettingsFormData = {
        companyName: data.company_name,
        companyAddress: data.company_address,
        companyTaxId: data.company_tax_id,
        receiverName: data.receiver_name,
        bankName: data.bank_name,
        accountNumber: data.account_number,
      };
      setInitialCompanySettings(savedData); // Update initial state to new saved data
      setIsEditing(false);
      toast.success('Company settings saved successfully!');
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700 mt-4">
      <div
        className="flex justify-between items-center cursor-pointer mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xl font-semibold text-red-400">Manage Company Data</h3>
        {isExpanded ? (
          <ChevronUp className="w-6 h-6 text-red-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-red-400" />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {isLoading && <p className="text-red-300">Loading company data...</p>}
          {!isLoading && (
            <>
              {/* Company Name */}
              <div className="flex flex-col">
                <label htmlFor="companyName" className="text-red-300 text-sm mb-1">Company Name</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={companySettings.companyName}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              {/* Company Address */}
              <div className="flex flex-col">
                <label htmlFor="companyAddress" className="text-red-300 text-sm mb-1">Company Address</label>
                <input
                  type="text"
                  id="companyAddress"
                  name="companyAddress"
                  value={companySettings.companyAddress}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              {/* Company Tax ID */}
              <div className="flex flex-col">
                <label htmlFor="companyTaxId" className="text-red-300 text-sm mb-1">Company Tax ID</label>
                <input
                  type="text"
                  id="companyTaxId"
                  name="companyTaxId"
                  value={companySettings.companyTaxId}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              {/* Receiver Name */}
              <div className="flex flex-col">
                <label htmlFor="receiverName" className="text-red-300 text-sm mb-1">Receiver Name</label>
                <input
                  type="text"
                  id="receiverName"
                  name="receiverName"
                  value={companySettings.receiverName}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              {/* Bank Name */}
              <div className="flex flex-col">
                <label htmlFor="bankName" className="text-red-300 text-sm mb-1">Bank Name</label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={companySettings.bankName}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              {/* Account Number */}
              <div className="flex flex-col">
                <label htmlFor="accountNumber" className="text-red-300 text-sm mb-1">Account Number</label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  value={companySettings.accountNumber}
                  onChange={handleChange}
                  readOnly={!isEditing}
                  className={`p-2 rounded bg-red-800 text-red-100 border border-red-700 ${!isEditing ? 'opacity-70' : ''}`}
                />
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold flex items-center"
                    >
                      <XCircle className="w-5 h-5 inline-block mr-2" /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold flex items-center"
                      disabled={isLoading}
                    >
                      <Save className="w-5 h-5 inline-block mr-2" /> {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center"
                  >
                    <Edit className="w-5 h-5 inline-block mr-2" /> Edit Company Data
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySettingsForm;
