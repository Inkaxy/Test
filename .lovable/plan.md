
# Plan: Fiks manglende pakkedato ved filimport

## Problemanalyse

Etter grundig undersøkelse har jeg funnet at pakkedatoen **ikke vises i kalenderen** på grunn av:

1. **Alle importerte produkter mangler kategori** (`category_id = null`)
2. **Pakkekalenderen filtrerer alltid på kategori** - ordrer med produkter uten kategori vises aldri

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ROTÅRSAK                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  products-tabell:                                               │
│  ┌──────────────────────────────────────┐                       │
│  │ name: "Kneipp"                       │                       │
│  │ category_id: null  ← MANGLER!        │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
│  PackingCalendar spørring:                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ .eq('product.category_id', categoryId)  ← FILTRERER UT! │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Resultat: 0 ordrer vises selv om det finnes 345               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Løsning

### Tilnærming: Automatisk kategori-tilordning ved import

Ved import skal produkter automatisk få den **første aktive kategorien** for bakeriet som standard. Dette sikrer at:
- Alle importerte produkter vises i kalenderen umiddelbart
- Brukeren kan endre kategori senere om ønskelig

## Teknisk implementasjon

### Steg 1: Oppdater useImport.ts

**Endring**: Ved produkt-import, hent standard-kategori og tilordne den.

```typescript
// Hent standard-kategori (første aktive kategori)
const { data: defaultCategory } = await supabase
  .from('categories')
  .select('id')
  .eq('bakery_id', bakeryId)
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
  .limit(1)
  .maybeSingle();

const defaultCategoryId = defaultCategory?.id || null;

// Ved insert av produkt
.insert({
  bakery_id: bakeryId,
  product_number: product.productNumber,
  name: product.name,
  category_id: defaultCategoryId,  // ← Ny linje
})
```

### Steg 2: Oppdater eksisterende produkter (engangs-fix)

Kjør SQL for å sette kategori på eksisterende produkter uten kategori.

## Flyt etter endring

```text
┌─────────────────────────────────────────────────────────────────┐
│                    NY IMPORTFLYT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Last opp .PRD fil                                           │
│        ↓                                                        │
│  2. Hent standard-kategori for bakeriet                         │
│        ↓                                                        │
│  3. Opprett produkt MED category_id                             │
│        ↓                                                        │
│  4. Ordrer vises i kalenderen umiddelbart ✓                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Endringer

| Fil | Endring |
|-----|---------|
| `src/hooks/useImport.ts` | Legg til automatisk kategori-tilordning ved produkt-import |

## Database-oppdatering

For eksisterende produkter uten kategori:

```sql
-- Sett standard-kategori på alle produkter uten kategori
UPDATE products 
SET category_id = (
  SELECT id FROM categories 
  WHERE bakery_id = products.bakery_id 
  AND is_active = true 
  ORDER BY sort_order 
  LIMIT 1
)
WHERE category_id IS NULL;
```

## Risiko

- **Lav risiko** - Endringen påvirker kun nye produkter
- Eksisterende produkter oppdateres via egen SQL
- Brukeren kan alltid endre kategori manuelt

## Testing

Etter implementasjon:
1. Importer nye filer
2. Verifiser at produkter får kategori automatisk
3. Sjekk at pakkekalenderen viser datoer med ordrer
