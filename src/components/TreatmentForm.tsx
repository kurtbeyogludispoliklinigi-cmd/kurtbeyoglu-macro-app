'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTreatmentCatalog } from '@/hooks/useTreatmentCatalog';
import { VoiceInput } from '@/components/VoiceInput';
import { supabase } from '@/lib/supabase';

interface TreatmentFormProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  selectedPatientId: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function TreatmentForm({
  currentUser,
  selectedPatientId,
  onSuccess,
  onError,
  loading,
  setLoading
}: TreatmentFormProps) {
  // Null check for selectedPatientId
  if (!selectedPatientId) {
    return null;
  }

  // Treatment catalog integration
  const {
    lookupTreatment,
    addToCatalog,
    calculateDiscount,
    getAutocompleteSuggestions
  } = useTreatmentCatalog();

  // Form state
  const [formData, setFormData] = useState({
    toothNo: '',
    procedure: '',
    cost: '',
    notes: ''
  });

  // Treatment mode state
  const [treatmentMode, setTreatmentMode] = useState<'planned' | 'completed'>('completed');
  const [plannedDate, setPlannedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Catalog state
  const [priceSuggestion, setPriceSuggestion] = useState<{
    isNew: boolean;
    standardPrice: number | null;
    catalogItemId?: string;
  }>({
    isNew: true,
    standardPrice: null
  });

  const [showNewTreatmentWarning, setShowNewTreatmentWarning] = useState(false);

  // Debounced treatment lookup
  useEffect(() => {
    if (!formData.procedure || formData.procedure.length < 3) {
      setPriceSuggestion({ isNew: true, standardPrice: null });
      setShowNewTreatmentWarning(false);
      return;
    }

    const timer = setTimeout(() => {
      const suggestion = lookupTreatment(formData.procedure);

      if (suggestion.exists && suggestion.catalogItem) {
        setPriceSuggestion({
          isNew: false,
          standardPrice: suggestion.catalogItem.standard_price,
          catalogItemId: suggestion.catalogItem.id
        });
        setShowNewTreatmentWarning(false);

        // Auto-fill price if empty
        if (!formData.cost) {
          setFormData(prev => ({
            ...prev,
            cost: suggestion.catalogItem!.standard_price.toString()
          }));
        }
      } else {
        setPriceSuggestion({ isNew: true, standardPrice: null });
        setShowNewTreatmentWarning(true);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [formData.procedure, lookupTreatment]);

  // Calculate discount info
  const discountInfo = useMemo(() => {
    if (!priceSuggestion.standardPrice || !formData.cost) return null;

    const paidAmount = Number(formData.cost);
    const standardPrice = priceSuggestion.standardPrice;

    if (paidAmount >= standardPrice) return null;

    return calculateDiscount(standardPrice, paidAmount);
  }, [priceSuggestion.standardPrice, formData.cost, calculateDiscount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPatientId) return;

    setLoading(true);

    try {
      // If new treatment, add to catalog first
      if (priceSuggestion.isNew && formData.procedure && formData.cost) {
        const catalogResult = await addToCatalog(
          formData.procedure,
          Number(formData.cost),
          undefined, // category - can be added later
          currentUser.name
        );

        if (!catalogResult.success) {
          console.warn('Failed to add to catalog:', catalogResult.error);
          // Continue anyway - catalog is a nice-to-have feature
        }
      }

      // Prepare notes with discount info if applicable
      let finalNotes = formData.notes;
      if (discountInfo) {
        finalNotes = formData.notes
          ? `${formData.notes} [${discountInfo.discountNote}]`
          : `[${discountInfo.discountNote}]`;
      }

      // Prepare treatment data with status fields
      const treatmentData: any = {
        patient_id: selectedPatientId,
        tooth_no: formData.toothNo,
        procedure: formData.procedure,
        cost: Number(formData.cost) || 0,
        notes: finalNotes,
        added_by: currentUser.name,
        status: treatmentMode
      };

      // Add mode-specific fields
      if (treatmentMode === 'planned') {
        treatmentData.planned_date = plannedDate;
        treatmentData.planned_by = currentUser.name;
      } else {
        treatmentData.completed_date = new Date().toISOString();
      }

      // Insert treatment
      const { error } = await supabase.from('treatments').insert(treatmentData);

      if (error) throw error;

      // Update patient timestamp
      await supabase
        .from('patients')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedPatientId);

      // Reset form
      setFormData({ toothNo: '', procedure: '', cost: '', notes: '' });
      setPriceSuggestion({ isNew: true, standardPrice: null });
      setShowNewTreatmentWarning(false);
      setTreatmentMode('completed');
      setPlannedDate(new Date().toISOString().split('T')[0]);

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Kayıt hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border mb-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <div className="bg-teal-100 p-1.5 rounded text-teal-700">
          <Plus size={18} />
        </div>
        Yeni İşlem Ekle
      </h3>

      {/* Treatment Mode Selection */}
      <div className="mb-4 flex gap-3 p-3 bg-gray-50 rounded-lg">
        <button
          type="button"
          onClick={() => setTreatmentMode('completed')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            treatmentMode === 'completed'
              ? 'bg-teal-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          ✓ Yapılan İşlem
        </button>
        <button
          type="button"
          onClick={() => setTreatmentMode('planned')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            treatmentMode === 'planned'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📅 Planlanan İşlem
        </button>
      </div>

      {/* Planned Date Field (conditional) */}
      {treatmentMode === 'planned' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Planlanan Tarih
          </label>
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tooth Number */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Diş No
            </label>
            <input
              type="text"
              placeholder="16"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.toothNo}
              onChange={(e) =>
                setFormData({ ...formData, toothNo: e.target.value })
              }
            />
          </div>

          {/* Treatment Procedure with Autocomplete */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Yapılan İşlem
            </label>
            <input
              type="text"
              placeholder="Kanal Tedavisi"
              required
              list="treatment-suggestions"
              className={`w-full p-2 border rounded-lg focus:ring-2 outline-none transition-colors ${
                priceSuggestion.isNew
                  ? 'border-yellow-300 focus:ring-yellow-500 bg-yellow-50'
                  : 'border-green-300 focus:ring-green-500 bg-green-50'
              }`}
              value={formData.procedure}
              onChange={(e) =>
                setFormData({ ...formData, procedure: e.target.value })
              }
            />
            <datalist id="treatment-suggestions">
              {getAutocompleteSuggestions.map((suggestion) => (
                <option
                  key={suggestion.value}
                  value={suggestion.value}
                >
                  {suggestion.price} ₺
                </option>
              ))}
            </datalist>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Ücret (TL)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: e.target.value })
              }
            />
          </div>
        </div>

        {/* New Treatment Warning */}
        {showNewTreatmentWarning && formData.procedure.length >= 3 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              ⚠️ Bu tedavi ilk kez kaydediliyor
            </p>
            <p className="text-xs text-yellow-700">
              Girdiğiniz fiyat bu tedavi için standart fiyat olarak kaydedilecek.
              Sonraki kullanımlarda otomatik öneri olarak görünecektir.
            </p>
          </div>
        )}

        {/* Price Comparison & Discount Info */}
        {priceSuggestion.standardPrice &&
          formData.cost &&
          Number(formData.cost) !== priceSuggestion.standardPrice && (
            <div
              className={`text-sm p-3 rounded-lg ${
                discountInfo
                  ? 'text-orange-700 bg-orange-50 border border-orange-200'
                  : 'text-blue-700 bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  ℹ️ Standart fiyat: <strong>{priceSuggestion.standardPrice} ₺</strong>
                </span>
                {discountInfo && (
                  <span className="font-semibold bg-orange-100 px-2 py-1 rounded">
                    {discountInfo.discountNote}
                  </span>
                )}
              </div>
              {discountInfo && (
                <p className="text-xs mt-1 text-orange-600">
                  İndirim bilgisi otomatik olarak notlara eklenecektir.
                </p>
              )}
            </div>
          )}

        {/* Notes with Voice Input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Notlar
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Detay..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
            <VoiceInput
              onTranscript={(text) =>
                setFormData({
                  ...formData,
                  notes: formData.notes + ' ' + text
                })
              }
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
