import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export interface TreatmentCatalogItem {
  id: string;
  name: string;
  standard_price: number;
  category?: string | null;
  created_by?: string | null;
  created_at: string;
  last_updated: string;
}

export interface TreatmentPriceSuggestion {
  exists: boolean;
  catalogItem?: TreatmentCatalogItem;
  standardPrice?: number;
  isNew: boolean;
}

export function useTreatmentCatalog() {
  const [catalog, setCatalog] = useState<TreatmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch catalog from database
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('treatment_catalog')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCatalog(data || []);
    } catch (err) {
      console.error('Failed to fetch treatment catalog:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCatalog();

    // Real-time subscription
    const channel = supabase
      .channel('treatment-catalog-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_catalog'
        },
        () => {
          fetchCatalog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCatalog]);

  // Look up treatment by name (case-insensitive)
  const lookupTreatment = useCallback(
    (treatmentName: string): TreatmentPriceSuggestion => {
      if (!treatmentName || treatmentName.trim().length < 3) {
        return { exists: false, isNew: true };
      }

      const normalizedSearch = treatmentName.trim().toLowerCase();
      const found = catalog.find(
        (item) => item.name.toLowerCase() === normalizedSearch
      );

      if (found) {
        return {
          exists: true,
          catalogItem: found,
          standardPrice: found.standard_price,
          isNew: false
        };
      }

      return { exists: false, isNew: true };
    },
    [catalog]
  );

  // Add new treatment to catalog
  const addToCatalog = useCallback(
    async (
      name: string,
      standardPrice: number,
      category?: string,
      createdBy?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error: insertError } = await supabase
          .from('treatment_catalog')
          .insert({
            name: name.trim(),
            standard_price: standardPrice,
            category: category || null,
            created_by: createdBy || null
          });

        if (insertError) throw insertError;

        // Refresh catalog after insertion
        await fetchCatalog();

        return { success: true };
      } catch (err) {
        console.error('Failed to add treatment to catalog:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    },
    [fetchCatalog]
  );

  // Update existing catalog item
  const updateCatalogItem = useCallback(
    async (
      id: string,
      updates: Partial<Pick<TreatmentCatalogItem, 'name' | 'standard_price' | 'category'>>
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error: updateError } = await supabase
          .from('treatment_catalog')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;

        await fetchCatalog();

        return { success: true };
      } catch (err) {
        console.error('Failed to update catalog item:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    },
    [fetchCatalog]
  );

  // Calculate discount percentage
  const calculateDiscount = useCallback(
    (standardPrice: number, paidAmount: number): { discountPercent: number; discountNote: string } | null => {
      if (paidAmount >= standardPrice) return null;

      const discountPercent = Math.round(((standardPrice - paidAmount) / standardPrice) * 100);
      const discountNote = `%${discountPercent} indirim uygulandı`;

      return { discountPercent, discountNote };
    },
    []
  );

  // Get autocomplete suggestions (sorted by frequency in future)
  const getAutocompleteSuggestions = useMemo(() => {
    return catalog.map((item) => ({
      label: item.name,
      value: item.name,
      price: item.standard_price,
      category: item.category
    }));
  }, [catalog]);

  // --- PACKAGES SUPPORT ---
  const [packages, setPackages] = useState<{ id: string; name: string; items: any[] }[]>([]);

  const fetchPackages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_packages')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  }, []);

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    catalog,
    packages, // Export packages
    loading,
    error,
    lookupTreatment,
    addToCatalog,
    updateCatalogItem,
    calculateDiscount,
    getAutocompleteSuggestions,
    refreshCatalog: fetchCatalog
  };
}
