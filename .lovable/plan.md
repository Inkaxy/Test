
# Fase 3: Arkitektur - Implementeringsplan

## Sammenfatting

Jeg vil konsolidere duplisert pakke-logikk til én gjenbrukbar hook og splitte det store DisplaySettings-interfacet (100+ properties) inn i logiske sub-interfaces for bedre vedlikeholdbarhet.

---

## Del 1: Konsolidere Pakke-Mutations

### Nåværende Situasjon

Pakke-logikken er duplisert på tre steder:

| Fil | Mutations |
|-----|-----------|
| `src/hooks/useOrders.ts` | `useMarkAsPacked`, `useBatchMarkAsPacked`, `useReportDeviation`, `useUndoPacking` |
| `src/pages/packing/KioskPackingView.tsx` | `useKioskMarkAsPacked`, `useKioskUndoPacking`, `useKioskReportDeviation` (inline) |
| `src/pages/packing/ProductKioskPackingView.tsx` | `useKioskMarkAsPacked`, `useKioskUndoPacking`, `useKioskReportDeviation` (duplisert inline) |

### Løsning: Ny Hook `usePackingMutations`

Oppretter en ny hook som samler all pakke-logikk med støtte for:
- **Standard modus**: Med autentisert bruker + full optimistic updates + realtime broadcast
- **Kiosk modus**: Uten autentisering + forenklet optimistic updates

```
src/hooks/usePackingMutations.ts
├── usePackingMutations(options: PackingMutationsOptions)
│   ├── markAsPacked()
│   ├── batchMarkAsPacked()
│   ├── reportDeviation()
│   └── undoPacking()
└── Helper functions
    ├── updatePackingStatusInCache()
    └── broadcastPackingUpdate()
```

### Ny Hook API

```typescript
interface PackingMutationsOptions {
  bakeryId?: string | null;
  deliveryDate?: string;
  categoryId?: string | null;
  queryKey?: string[];  // For custom cache invalidation
  isKiosk?: boolean;    // Kiosk mode uten auth
  sortOptions?: {       // For optimistic update sorting
    completedLast?: boolean;
    sortMode?: string;
    sortDirection?: string;
  };
}

const {
  markAsPacked,
  batchMarkAsPacked,
  reportDeviation,
  undoPacking,
  isAnyPending
} = usePackingMutations(options);
```

### Endringer i Views

| Fil | Endring |
|-----|---------|
| `KioskPackingView.tsx` | Fjern inline mutations, bruk `usePackingMutations({ isKiosk: true })` |
| `ProductKioskPackingView.tsx` | Fjern inline mutations, bruk `usePackingMutations({ isKiosk: true })` |
| `CustomerPackingView.tsx` | Allerede bruker `useOrders` hooks, migreres til ny hook |
| `ProductPackingView.tsx` | Allerede bruker `useOrders` hooks, migreres til ny hook |
| `CustomerPacking.tsx` | Migreres til ny hook |

---

## Del 2: Splitte DisplaySettings Interface

### Nåværende Situasjon

`DisplaySettings` i `useDisplayOrders.ts` har 100+ properties i ett flat interface:
- Vanskelig å navigere og forstå
- Ingen logisk gruppering
- Alle properties vises selv når kun noen er relevante

### Løsning: Sub-Interfaces

Splitter til logiske grupper som komponeres til hovedinterface:

```typescript
// Gruppert struktur
interface HeaderSettings {
  header_show_bakery_name: boolean;
  header_show_category_name: boolean;
  header_show_clock: boolean;
  header_show_date: boolean;
  header_bakery_font_size: string;
  header_category_font_size: string;
  header_clock_font_size: string;
  header_date_font_size: string;
  header_clock_format: '12h' | '24h';
}

interface StatsSettings {
  stats_show_total_progress: boolean;
  stats_show_packed_count: boolean;
  stats_show_remaining_count: boolean;
  stats_progress_bar_style: 'bar' | 'circle' | 'none';
  stats_progress_bar_height: string;
  stats_label_font_size: string;
  stats_value_font_size: string;
}

interface CardSettings {
  card_show_customer_number: boolean;
  card_show_product_list: boolean;
  // ... etc
}

interface AppearanceSettings {
  background_color: string;
  card_background_color: string;
  text_color: string;
  pending_color: string;
  packing_color: string;
  completed_color: string;
  border_radius: string;
  card_border_width: string;
  theme_preset: ThemePreset;
}

interface LayoutSettings {
  columns: number;
  gap_size: string;
  padding: string;
  // ...
}

interface AnimationSettings {
  animation_enabled: boolean;
  animation_speed: 'fast' | 'normal' | 'slow';
  // ...
}

interface RealtimeSettings {
  realtime_show_connection_status: boolean;
  realtime_show_last_update: boolean;
  // ...
}

interface TableSettings {
  table_row_height: 'compact' | 'normal' | 'touch';
  table_font_size: string;
  // ... alle table_ properties
}

interface ProductCardSettings {
  product_card_layout: 'horizontal' | 'vertical';
  product_card_name_font_size: string;
  // ... alle product_card_ properties
}

interface PackButtonSettings {
  pack_button_text: string;
  pack_button_background_color: string;
  // ...
}

interface BackButtonSettings {
  back_button_show: boolean;
  back_button_size: 'small' | 'medium' | 'large' | 'huge';
  // ... inkl. done-modus
}

interface RefreshButtonSettings {
  refresh_button_show: boolean;
  refresh_button_size: 'small' | 'medium' | 'large' | 'huge';
  // ...
}

interface LockSettings {
  lock_enabled: boolean;
  lock_show_indicator: boolean;
  // ...
}

// Hovedinterface komponerer alle sub-interfaces
interface DisplaySettings extends
  HeaderSettings,
  StatsSettings,
  CardSettings,
  AppearanceSettings,
  LayoutSettings,
  AnimationSettings,
  RealtimeSettings,
  TableSettings,
  ProductCardSettings,
  PackButtonSettings,
  BackButtonSettings,
  RefreshButtonSettings,
  LockSettings {
  // Ekstra felter som ikke passer andre steder
  packing_view_mode: 'cards' | 'table';
  packing_language: 'nb' | 'en';
  // Legacy
  show_progress_bar: boolean;
  progress_bar_style: string;
  show_clock: boolean;
  show_date: boolean;
}
```

### Filstruktur

```
src/types/display/
├── index.ts                 # Re-eksporterer alt
├── header.ts               # HeaderSettings
├── stats.ts                # StatsSettings
├── card.ts                 # CardSettings
├── appearance.ts           # AppearanceSettings + ThemePreset
├── layout.ts               # LayoutSettings
├── animation.ts            # AnimationSettings
├── realtime.ts             # RealtimeSettings
├── table.ts                # TableSettings
├── productCard.ts          # ProductCardSettings
├── buttons.ts              # PackButtonSettings, BackButtonSettings, RefreshButtonSettings
├── lock.ts                 # LockSettings
└── displaySettings.ts      # DisplaySettings (composed)
```

### Fordeler

1. **Bedre IDE-støtte**: Auto-complete viser bare relevante properties
2. **Lettere å navigere**: Finn innstillinger i logiske filer
3. **Gjenbrukbarhet**: Kan importere bare det du trenger (`import type { TableSettings }`)
4. **Dokumentasjon**: Hver fil kan ha JSDoc for sin kategori

---

## Del 3: Implementeringsrekkefølge

```text
Steg 1: Opprett src/hooks/usePackingMutations.ts med all pakke-logikk
Steg 2: Migrer KioskPackingView.tsx til usePackingMutations
Steg 3: Migrer ProductKioskPackingView.tsx til usePackingMutations
Steg 4: Migrer CustomerPackingView.tsx til usePackingMutations
Steg 5: Migrer ProductPackingView.tsx til usePackingMutations
Steg 6: Migrer CustomerPacking.tsx til usePackingMutations
Steg 7: Fjern gamle mutations fra useOrders.ts (behold queries)
Steg 8: Opprett src/types/display/ med sub-interfaces
Steg 9: Oppdater useDisplayOrders.ts til å bruke nye typer
Steg 10: Oppdater plan.md med status
```

---

## Tekniske Detaljer

### usePackingMutations Optimistic Updates

```typescript
// Felles cache-oppdatering uavhengig av kontekst
function updatePackingStatusInCache<T extends { orders: Order[] }>(
  items: T[],
  orderId: string,
  newStatus: 'packed' | 'pending' | 'deviation',
  sortOptions?: SortOptions
): T[] {
  return items.map(item => ({
    ...item,
    orders: item.orders.map(order =>
      order.id === orderId
        ? { ...order, packing_status: { ...order.packing_status, status: newStatus } }
        : order
    )
  }));
}
```

### Bakoverkompatibilitet

- `DisplaySettings` forblir uendret som eksportert type
- Komponenter trenger ikke endres, de bruker samme `DisplaySettings`
- Sub-interfaces er valgfrie å bruke direkte

---

## Testing

Etter implementering:
1. Test at kiosk-pakking fungerer (uten auth)
2. Test at standard pakking fungerer (med auth)
3. Test at optimistic updates er synlige
4. Test at realtime broadcast sender korrekt
5. Verifiser at DisplaySettings fortsatt fungerer i alle displays
