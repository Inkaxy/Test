
# Plan: Filtrer kategorier basert på display-type

## Problem
I Display Settings-siden vises **alle** kategorier i dropdown-menyen uansett hvilken skjermtype (display type) som er valgt. Dette skaper forvirring fordi:

- **Produktbasert pakking** (product_based) → Bruker "Felles Display" og "Kunde Display"
- **Kundebasert pakking** (customer_based) → Bruker "Pakkedisplay"

## Løsning
Filtrer kategori-listen basert på valgt display-type:

| Display Type | Viser kategorier med |
|--------------|---------------------|
| Felles Display | Alle kategorier |
| Kunde Display | `packing_mode = 'product_based'` |
| Pakkedisplay | `packing_mode = 'customer_based'` |

## Tekniske endringer

### Fil: `src/pages/DisplaySettings.tsx`

**Endring 1:** Legg til filtrert kategori-liste (rundt linje 42-43)
```typescript
const { data: categories = [] } = useCategories();

// Filtrer kategorier basert på display type
const filteredCategories = categories.filter(cat => {
  if (selectedDisplayType === 'packing') {
    // Pakkedisplay = kun kundebaserte kategorier
    return cat.packing_mode === 'customer_based';
  }
  if (selectedDisplayType === 'customer') {
    // Kundedisplay = kun produktbaserte kategorier
    return cat.packing_mode === 'product_based';
  }
  // Felles display = alle kategorier
  return true;
});
```

**Endring 2:** Bruk `filteredCategories` i stedet for `categories` i dropdown (linje 366-389)
```typescript
{filteredCategories.length > 0 && (
  // ... existing code
  {filteredCategories.map((cat) => (
    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
  ))}
)}
```

**Endring 3:** Oppdater beskrivelsestekst basert på display type
```typescript
<p className="text-xs text-muted-foreground mb-2">
  {selectedDisplayType === 'packing'
    ? 'Tilpass visning per kundebasert kategori'
    : selectedDisplayType === 'customer'
    ? 'Tilpass visning per produktbasert kategori'
    : 'Tilpass visning per kategori'}
</p>
```

**Endring 4:** Nullstill valgt kategori når display type endres (hvis kategorien ikke finnes i ny liste)
```typescript
// I useEffect eller ved tab-endring
useEffect(() => {
  if (selectedCategoryId) {
    const categoryExists = filteredCategories.some(c => c.id === selectedCategoryId);
    if (!categoryExists) {
      setSelectedCategoryId(null);
    }
  }
}, [selectedDisplayType, filteredCategories, selectedCategoryId]);
```

## Resultat
- Når bruker velger "Pakkedisplay"-fanen, vises kun kategorier med `packing_mode = 'customer_based'`
- Når bruker velger "Kunde Display"-fanen, vises kun kategorier med `packing_mode = 'product_based'`
- "Felles Display" viser fortsatt alle kategorier
- Innstillinger lagres korrekt per kategori og display-type
