
# Plan: Touch-vennlig tabellvisning for Pakkedisplay

## Problemstilling
Kiosk-visningen for kundebasert pakking (Pakkedisplay) viser kun kort-grid layout. For noen brukssituasjoner kan en tabellvisning være mer effektiv, spesielt når man vil se mange kunder raskt. Vi skal legge til mulighet for å velge mellom kort-visning og tabell-visning, samt forbedre tabellen for touch-bruk.

## Løsning
Legge til nye innstillinger under "Pakkedisplay" i Display Settings som lar administratorer velge visningsmodus og konfigurere tabellens utseende. Implementere en touch-optimalisert tabell-komponent i KioskPackingView og CustomerPackingView.

---

## Del 1: Utvid DisplaySettings interface

### Fil: `src/hooks/useDisplayOrders.ts`

Legg til nye innstillinger i `DisplaySettings` interface:

```typescript
export interface DisplaySettings {
  // ... eksisterende innstillinger ...
  
  // Visningsmodus
  packing_view_mode: 'cards' | 'table';
  
  // Tabell-spesifikke innstillinger
  table_row_height: 'compact' | 'normal' | 'touch';
  table_font_size: string;
  table_show_customer_number: boolean;
  table_show_progress_bar: boolean;
  table_show_order_count: boolean;
  table_alternate_rows: boolean;
  table_alternate_row_color: string;
  table_sticky_header: boolean;
  table_touch_row_spacing: string;
}
```

Oppdater `getDefaultDisplaySettings()`:

```typescript
// Visningsmodus
packing_view_mode: 'cards',

// Tabell-innstillinger
table_row_height: 'touch',
table_font_size: '1.25rem',
table_show_customer_number: true,
table_show_progress_bar: true,
table_show_order_count: true,
table_alternate_rows: true,
table_alternate_row_color: '#f1f5f9',
table_sticky_header: true,
table_touch_row_spacing: '0.75rem',
```

---

## Del 2: Ny innstillingsseksjon i DisplaySettings

### Fil: `src/pages/DisplaySettings.tsx`

Legg til ny AccordionItem for "Visningsmodus" under Pakkedisplay-fanen:

```text
Visningsmodus-seksjon:
├── Velg visningsmodus (Radio: Kort / Tabell)
│
└── Tabell-innstillinger (vises kun når tabell er valgt):
    ├── Radhøyde (Kompakt / Normal / Touch-vennlig)
    ├── Fontstørrelse (Liten / Normal / Stor / Ekstra stor)
    ├── Vis kundenummer (Switch)
    ├── Vis fremdriftsbar (Switch)
    ├── Vis antall ordrer (Switch)
    ├── Alternerende radfarger (Switch)
    │   └── Fargevelger (hvis aktivert)
    ├── Fest header (Switch)
    └── Mellomrom mellom rader (Liten / Normal / Stor)
```

---

## Del 3: Touch-optimalisert tabell-komponent

### Ny fil: `src/components/packing/KioskCustomerTable.tsx`

Opprett en dedikert tabell-komponent for kiosk-bruk:

**Funksjoner:**
- Store, touch-vennlige rader (min 60px høyde i touch-modus)
- Tydelig visuell statusindikator (farget venstre kant)
- Kundenavn, kundenummer, antall ordrer, fremdrift
- Klikk/touch på rad for å velge kunde
- Alternerende radfarger for bedre lesbarhet
- Sticky header for scrolling
- Framer Motion animasjoner ved statusendring
- Respekterer alle display-innstillinger

**Struktur:**
```text
┌─────────────────────────────────────────────────────────────┐
│ Kunde              │ Ordrer │ Fremdrift          │ Status   │
├─────────────────────────────────────────────────────────────┤
│ █ Bakerguten AS    │   12   │ ████████░░ 80%     │ Pågår    │
├─────────────────────────────────────────────────────────────┤
│   Cafe Sentrum     │    5   │ ░░░░░░░░░░  0%     │ Venter   │
├─────────────────────────────────────────────────────────────┤
│ █ Konditori Hjørne │    8   │ ██████████ 100%    │ ✓ Ferdig │
└─────────────────────────────────────────────────────────────┘
```

---

## Del 4: Integrer i visningskomponenter

### Fil: `src/pages/packing/KioskPackingView.tsx`

Legg til betinget rendering basert på `settings.packing_view_mode`:

```typescript
{settings.packing_view_mode === 'table' ? (
  <KioskCustomerTable
    customers={customers}
    settings={settings}
    onSelectCustomer={setSelectedCustomer}
  />
) : (
  // Eksisterende kort-grid visning
  <div className="grid" style={{ ... }}>
    {/* Kort-visning */}
  </div>
)}
```

### Fil: `src/pages/packing/CustomerPackingView.tsx`

Samme endring for konsistens mellom web og kiosk.

---

## Tekniske detaljer

### KioskCustomerTable komponent

```typescript
interface KioskCustomerTableProps {
  customers: CustomerWithOrders[];
  settings: DisplaySettings;
  onSelectCustomer: (customer: CustomerWithOrders) => void;
  locks?: CustomerLock[];
  currentUserId?: string;
}

// Radhøyde-mapping
const rowHeightMap = {
  compact: 'py-2',
  normal: 'py-4', 
  touch: 'py-6 min-h-[4rem]',
};

// Alternerende rad-styling
const getRowStyle = (index: number, settings: DisplaySettings) => ({
  backgroundColor: settings.table_alternate_rows && index % 2 === 1 
    ? settings.table_alternate_row_color 
    : 'transparent',
});
```

---

## Filendringer oppsummert

| Fil | Endring |
|-----|---------|
| `src/hooks/useDisplayOrders.ts` | Utvid DisplaySettings interface med visningsmodus og tabell-innstillinger |
| `src/pages/DisplaySettings.tsx` | Legg til visningsmodus-seksjon i Pakkedisplay |
| `src/components/packing/KioskCustomerTable.tsx` | **Ny fil**: Touch-optimalisert tabell-komponent |
| `src/pages/packing/KioskPackingView.tsx` | Betinget rendering basert på visningsmodus |
| `src/pages/packing/CustomerPackingView.tsx` | Betinget rendering basert på visningsmodus |

---

## Resultat

Etter implementering:

1. **Valgfrihet**: Administratorer kan velge mellom kort- og tabellvisning i Display Settings
2. **Touch-optimalisert**: Tabellen har store rader, god spacing og tydelige touch-targets
3. **Konfigurerbar**: Radhøyde, fontstørrelse, alternerende farger og mer kan tilpasses
4. **Konsistent**: Samme innstillinger gjelder for både web og kiosk
5. **Rask oversikt**: Tabellvisningen gir bedre oversikt over mange kunder samtidig

---

## Visuell sammenligning

**Kort-visning (nåværende):**
- 3 kolonner med kort
- Mer visuelt rik
- Bedre for færre kunder
- Animert og interaktiv

**Tabell-visning (ny):**
- Vertikal liste
- Kompakt og effektiv
- Bedre for mange kunder
- Raskere scanning
- Valgfri touch-optimalisering
