# Treatment Price Catalog & Automatic Discount System

## Overview

This feature enhances the dental clinic management system with intelligent price management for treatments. It provides:

1. **Treatment Catalog**: Automatic storage of treatment names and standard prices
2. **Price Suggestions**: Auto-fill prices based on previous entries
3. **Discount Calculation**: Automatic percentage calculation for discounted treatments
4. **Visual Feedback**: Color-coded indicators for new treatments, catalog matches, and discounts

## Database Schema

### New Table: `treatment_catalog`

```sql
CREATE TABLE treatment_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  standard_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- Unique treatment names (case-sensitive)
- Standard price storage in TL
- Optional category for future organization
- Automatic timestamp tracking
- Real-time sync enabled

## User Experience

### First-Time Treatment Entry

When entering a treatment for the first time:

1. **Yellow Background**: Treatment input field has yellow background
2. **Warning Banner**: "⚠️ Bu tedavi ilk kez kaydediliyor"
3. **Price Recording**: Entered price becomes the standard price
4. **Automatic Catalog Entry**: Treatment saved to catalog for future use

### Subsequent Treatment Entry

When entering a known treatment:

1. **Green Background**: Treatment input field has green background
2. **Auto-fill Price**: Standard price automatically filled if cost field is empty
3. **Autocomplete Dropdown**: Suggestions from catalog with prices shown
4. **Price Comparison**: If entered price differs from standard:
   - Blue info box for higher prices
   - Orange discount badge for lower prices

### Discount Calculation

When a treatment is entered below standard price:

- **Automatic Calculation**: Discount percentage computed: `((standard - paid) / standard) × 100`
- **Visual Indicator**: Orange badge showing "% indirim uygulandı"
- **Auto-note**: Discount info automatically appended to treatment notes
- **Format**: `[%25 indirim uygulandı]` added to notes field

## Implementation Details

### File Structure

```
src/
├── hooks/
│   ├── useTreatmentCatalog.ts    # Treatment catalog hook
│   └── useAppData.ts              # Updated with TreatmentCatalogItem type
├── components/
│   └── TreatmentForm.tsx          # Enhanced treatment form
└── app/
    └── page.tsx                   # Updated to use TreatmentForm component

supabase/
└── migrations/
    └── add_treatment_catalog.sql  # Database migration
```

### Key Components

#### `useTreatmentCatalog` Hook

**Responsibilities:**
- Fetch and cache treatment catalog from database
- Real-time subscription to catalog changes
- Treatment lookup by name (case-insensitive)
- Add new treatments to catalog
- Calculate discount percentages
- Generate autocomplete suggestions

**API:**
```typescript
const {
  catalog,                    // All catalog items
  loading,                    // Loading state
  error,                      // Error state
  lookupTreatment,           // Search by name
  addToCatalog,              // Add new treatment
  updateCatalogItem,         // Update existing
  calculateDiscount,         // Compute discount %
  getAutocompleteSuggestions, // For dropdown
  refreshCatalog             // Manual refresh
} = useTreatmentCatalog();
```

#### `TreatmentForm` Component

**Features:**
- Debounced treatment lookup (500ms)
- Auto-fill price from catalog
- Real-time price comparison
- Visual feedback (color-coded inputs)
- Automatic discount note appending
- Catalog integration on submit

**Props:**
```typescript
interface TreatmentFormProps {
  currentUser: { id: string; name: string; role: string };
  selectedPatientId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}
```

## Performance Optimizations

### Debouncing
- Treatment lookup debounced to 500ms to prevent excessive queries
- Prevents database hits on every keystroke

### Conditional Rendering
- Warnings only shown when relevant (treatment length ≥ 3 chars)
- Discount info only computed when both prices exist

### Real-time Sync
- Efficient Supabase real-time subscription
- Automatic catalog refresh on changes
- Minimal re-renders through `useMemo` hooks

## Visual Design System

### Color Coding

| State | Background | Border | Meaning |
|-------|-----------|--------|---------|
| New Treatment | `bg-yellow-50` | `border-yellow-300` | First-time entry |
| Catalog Match | `bg-green-50` | `border-green-300` | Known treatment |
| Standard Input | `bg-white` | `border-gray-300` | Default state |

### Info Boxes

| Type | Color | Icon | When Shown |
|------|-------|------|------------|
| New Treatment Warning | Yellow | ⚠️ | Treatment not in catalog |
| Price Info | Blue | ℹ️ | Price higher than standard |
| Discount Alert | Orange | ℹ️ | Price lower than standard |

## Usage Examples

### Example 1: First-Time Treatment

**User Action:**
1. Types "Kanal Tedavisi" in procedure field
2. Enters "3500" as cost
3. Clicks "Kaydet"

**System Response:**
- Yellow background appears (new treatment)
- Warning: "Bu tedavi ilk kez kaydediliyor"
- Saves treatment with cost 3500
- Adds "Kanal Tedavisi" to catalog with standard_price=3500

### Example 2: Catalog Match with Discount

**User Action:**
1. Types "Kanal Tedavisi" in procedure field
2. Auto-fill suggests "3500 ₺"
3. User changes cost to "2800"
4. Clicks "Kaydet"

**System Response:**
- Green background (catalog match)
- Orange discount badge: "%20 indirim uygulandı"
- Notes auto-appended: "[%20 indirim uygulandı]"
- Treatment saved with discount info

### Example 3: Autocomplete Selection

**User Action:**
1. Starts typing "Ka..."
2. Dropdown shows: "Kanal Tedavisi (3500 ₺)"
3. Selects from dropdown
4. Cost auto-fills to "3500"

**System Response:**
- Procedure field filled with exact catalog name
- Cost field populated with standard price
- Green background confirms catalog match

## Migration Instructions

### 1. Run Database Migration

```bash
# In Supabase dashboard SQL editor, run:
supabase/migrations/add_treatment_catalog.sql
```

**OR** use Supabase CLI:
```bash
supabase db push
```

### 2. Verify RLS Policies

Ensure permissive RLS policy exists:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'treatment_catalog';
```

### 3. Enable Real-time

```sql
-- Should already be enabled by migration
ALTER PUBLICATION supabase_realtime ADD TABLE treatment_catalog;
```

### 4. Test Integration

1. Navigate to patient detail page
2. Try adding a new treatment type
3. Verify yellow warning appears
4. Submit treatment
5. Try adding same treatment again
6. Verify green background and autocomplete
7. Enter lower price and verify discount calculation

## Troubleshooting

### Issue: Autocomplete Not Working

**Possible Causes:**
- Treatment name length < 3 characters
- Database connection issues
- RLS policy blocking reads

**Solution:**
```typescript
// Check catalog is loading
console.log('Catalog:', catalog);
console.log('Loading:', loading);
console.log('Error:', error);
```

### Issue: Prices Not Auto-filling

**Possible Causes:**
- Lookup debounce still active
- Exact name match not found (case-sensitive in DB)

**Solution:**
- Wait 500ms after typing
- Check treatment_catalog table directly:
  ```sql
  SELECT * FROM treatment_catalog WHERE name ILIKE '%kanal%';
  ```

### Issue: Discount Not Calculating

**Possible Causes:**
- Standard price not set
- Cost field empty or 0
- Cost >= standard price (no discount)

**Solution:**
- Ensure both prices exist and cost < standard_price
- Check calculateDiscount function logic

## Future Enhancements

### Planned Features

1. **Category Management**: Group treatments by type (orthodontics, endodontics, etc.)
2. **Frequency Tracking**: Show most-used treatments first in autocomplete
3. **Price History**: Track price changes over time
4. **Bulk Import**: CSV import for existing treatment catalogs
5. **Multi-currency**: Support for different currency displays
6. **Price Ranges**: Min/max price suggestions instead of single standard
7. **Doctor-Specific Pricing**: Different standard prices per doctor
8. **Smart Suggestions**: ML-based treatment recommendations

### Technical Debt

- Consider moving discount calculation to database function for consistency
- Add unit tests for useTreatmentCatalog hook
- Add E2E tests for complete treatment entry flow
- Consider adding search/filter for catalog management page

## API Reference

### `lookupTreatment(name: string)`

Searches treatment catalog by name.

**Returns:**
```typescript
{
  exists: boolean;
  catalogItem?: TreatmentCatalogItem;
  standardPrice?: number;
  isNew: boolean;
}
```

### `addToCatalog(name, price, category?, createdBy?)`

Adds new treatment to catalog.

**Returns:**
```typescript
{ success: boolean; error?: string }
```

### `calculateDiscount(standard, paid)`

Computes discount percentage.

**Returns:**
```typescript
{
  discountPercent: number;
  discountNote: string; // e.g., "%25 indirim uygulandı"
} | null
```

## Support

For issues or questions about the treatment catalog system:

1. Check this guide first
2. Review console logs for errors
3. Verify database migration completed successfully
4. Check Supabase real-time status
5. Contact development team with specific error messages

---

**Last Updated:** 2025-12-10
**Version:** 1.0.0
**Component:** Treatment Catalog & Discount System
