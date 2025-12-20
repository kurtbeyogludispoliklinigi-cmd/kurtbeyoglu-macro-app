'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTreatmentCatalog } from '@/hooks/useTreatmentCatalog';
import { VoiceInput } from '@/components/VoiceInput';

import { supabase } from '@/lib/supabase';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Doctor } from '@/lib/types';
import { Odontogram } from '@/components/Odontogram';
import { Grid } from 'lucide-react';

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
  // Treatment catalog integration
  // Treatment catalog integration
  const {
    lookupTreatment,
    addToCatalog,
    calculateDiscount,
    getAutocompleteSuggestions,
    packages // GET PACKAGES
  } = useTreatmentCatalog();

  // Form state
  const [inputType, setInputType] = useState<'single' | 'package'>('single');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

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

  const { logActivity } = useActivityLogger();

  const [showNewTreatmentWarning, setShowNewTreatmentWarning] = useState(false);
  const [showOdontogram, setShowOdontogram] = useState(false);

  // Debounced treatment lookup (Single Mode only)
  useEffect(() => {
    // Skip if no patient selected (though component usually returns null late, good safety)
    if (!selectedPatientId || inputType === 'package') return;

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
  }, [formData.procedure, formData.cost, lookupTreatment, selectedPatientId, inputType]);

  // Calculate discount info
  const discountInfo = useMemo(() => {
    if (!priceSuggestion.standardPrice || !formData.cost || inputType === 'package') return null;

    const paidAmount = Number(formData.cost);
    const standardPrice = priceSuggestion.standardPrice;

    if (paidAmount >= standardPrice) return null;

    return calculateDiscount(standardPrice, paidAmount);
  }, [priceSuggestion.standardPrice, formData.cost, calculateDiscount, inputType]);

  // Null check for selectedPatientId - MOVED AFTER HOOKS
  if (!selectedPatientId) {
    return null;
  }

  const selectedPackage = useMemo(() =>
    packages.find(p => p.id === selectedPackageId),
    [packages, selectedPackageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPatientId) return;

    setLoading(true);

    try {
      const itemsToInsert: any[] = [];

      if (inputType === 'package' && selectedPackage) {
        // PACKAGE MODE
        selectedPackage.items.forEach((item: any) => {
          itemsToInsert.push({
            patient_id: selectedPatientId,
            tooth_no: formData.toothNo, // Use the same tooth no for all
            procedure: item.procedure,
            cost: item.cost,
            notes: formData.notes ? `${formData.notes} (Paket: ${selectedPackage.name})` : `(Paket: ${selectedPackage.name})`,
            added_by: currentUser.name,
            status: treatmentMode,
            planned_date: treatmentMode === 'planned' ? plannedDate : undefined,
            planned_by: treatmentMode === 'planned' ? currentUser.name : undefined,
            completed_date: treatmentMode === 'completed' ? new Date().toISOString() : undefined,
          });
        });
      } else {
        // SINGLE MODE
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

        itemsToInsert.push({
          patient_id: selectedPatientId,
          tooth_no: formData.toothNo,
          procedure: formData.procedure,
          cost: Number(formData.cost) || 0,
          notes: finalNotes,
          added_by: currentUser.name,
          status: treatmentMode,
          planned_date: treatmentMode === 'planned' ? plannedDate : undefined,
          planned_by: treatmentMode === 'planned' ? currentUser.name : undefined,
          completed_date: treatmentMode === 'completed' ? new Date().toISOString() : undefined,
        });
      }

      // Bulk Insert
      const { error } = await supabase.from('treatments').insert(itemsToInsert);

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

      // Keep inputType but reset package selection
      setSelectedPackageId('');

      // Log activity (just log one for now or loop)
      await logActivity(currentUser as Doctor, 'CREATE_TREATMENT', {
        patient_id: selectedPatientId,
        procedure: inputType === 'package' ? `Paket: ${selectedPackage?.name}` : formData.procedure,
        cost: inputType === 'package' ? selectedPackage?.items.reduce((acc: number, i: any) => acc + i.cost, 0) : Number(formData.cost),
        status: treatmentMode
      });

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
        <div className="bg-[#0e7490]/10 p-1.5 rounded text-[#0e7490]">
          <Plus size={18} />
        </div>
        Yeni İşlem Ekle
      </h3>

      {/* Input Type Selection (Single vs Package) */}
      <div className="flex gap-4 mb-4 border-b border-gray-100 pb-2">
        <button
          type="button"
          onClick={() => setInputType('single')}
          className={`text-sm font-medium pb-2 transition-colors relative ${inputType === 'single' ? 'text-[#0e7490]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Tek İşlem
          {inputType === 'single' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0e7490] rounded-t-full" />}
        </button>
        <button
          type="button"
          onClick={() => setInputType('package')}
          className={`text-sm font-medium pb-2 transition-colors relative ${inputType === 'package' ? 'text-[#0e7490]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Paket İşlem
          {inputType === 'package' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0e7490] rounded-t-full" />}
        </button>
      </div>

      {/* Treatment Mode Selection */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 p-3 bg-gray-50 rounded-lg">
        <button
          type="button"
          onClick={() => setTreatmentMode('completed')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${treatmentMode === 'completed'
            ? 'bg-[#0e7490] text-white shadow'
            : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
        >
          ✓ Yapılan İşlem
        </button>
        <button
          type="button"
          onClick={() => setTreatmentMode('planned')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${treatmentMode === 'planned'
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
          <label className="block text-xs font-semibold text-blue-700 mb-1">
            Planlanan Tarih
          </label>
          <input
            type="date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            required
          />
        </div>
      )}

      {/* Odontogram Toggle */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowOdontogram(!showOdontogram)}
          className="flex items-center gap-2 text-sm text-[#0e7490] font-medium hover:bg-[#0e7490]/5 p-2 rounded-lg transition width-full md:w-auto"
        >
          <Grid size={18} />
          {showOdontogram ? 'Görsel Şemayı Gizle' : 'Görsel Diş Şemasını Göster'}
        </button>

        {showOdontogram && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <Odontogram
              selectedTeeth={formData.toothNo ? formData.toothNo.split(',').map(s => s.trim()) : []}
              onToggleTooth={(toothId) => {
                const currentTeeth = formData.toothNo ? formData.toothNo.split(',').map(s => s.trim()).filter(Boolean) : [];
                let newTeeth;
                if (currentTeeth.includes(toothId)) {
                  newTeeth = currentTeeth.filter(t => t !== toothId);
                } else {
                  newTeeth = [...currentTeeth, toothId];
                }
                setFormData({ ...formData, toothNo: newTeeth.join(', ') });
              }}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tooth Number (ALWAYS VISIBLE) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Diş No
            </label>
            <input
              type="text"
              placeholder="16"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#0e7490] outline-none text-gray-900 placeholder:text-gray-400"
              value={formData.toothNo}
              onChange={(e) =>
                setFormData({ ...formData, toothNo: e.target.value })
              }
            />
          </div>

          {inputType === 'single' ? (
            // SINGLE PROCEDURE MODE
            <>
              {/* Treatment Procedure with Autocomplete */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Yapılan İşlem
                </label>
                <input
                  type="text"
                  placeholder="Kanal Tedavisi"
                  required
                  list="treatment-suggestions"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none transition-colors text-gray-900 placeholder:text-gray-400 ${priceSuggestion.isNew
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Ücret (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#0e7490] outline-none text-gray-900 placeholder:text-gray-400"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                />
              </div>
            </>
          ) : (
            // PACKAGE MODE
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paket Seçimi
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#0e7490] outline-none bg-white text-gray-900"
                  required
                >
                  <option value="">Paket Seçiniz...</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.items.length} parça)
                    </option>
                  ))}
                </select>
              </div>

              {/* Package Preview */}
              {selectedPackage && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Paket İçeriği:</h4>
                  <ul className="space-y-1">
                    {selectedPackage.items.map((item: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-sm text-gray-600">
                        <span>• {item.procedure}</span>
                        <span className="font-medium">{item.cost} ₺</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-800 text-sm">
                    <span>Toplam</span>
                    <span>{selectedPackage.items.reduce((acc: number, item: any) => acc + item.cost, 0)} ₺</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Treatment Warning (Single Only) */}
        {inputType === 'single' && showNewTreatmentWarning && formData.procedure.length >= 3 && (
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

        {/* Price Comparison & Discount Info (Single Only) */}
        {inputType === 'single' && priceSuggestion.standardPrice &&
          formData.cost &&
          Number(formData.cost) !== priceSuggestion.standardPrice && (
            <div
              className={`text-sm p-3 rounded-lg ${discountInfo
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
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Notlar
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={inputType === 'package' ? "Paket için ortak not..." : "Detay..."}
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#0e7490] outline-none text-gray-900 placeholder:text-gray-400"
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
            className="w-full sm:w-auto bg-[#0e7490] text-white px-6 py-3 rounded-lg hover:bg-[#155e75] transition shadow-sm font-medium disabled:opacity-50 min-h-[44px]"
          >
            {loading ? '...' : (inputType === 'package' ? 'Paketi Kaydet' : 'Kaydet')}
          </button>
        </div>
      </form>
    </div>
  );
}
