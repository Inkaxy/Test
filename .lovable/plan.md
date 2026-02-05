
# Plan: Touch-vennlig tabellvisning for Pakkedisplay ✅ IMPLEMENTERT

## Oppsummering
Implementert mulighet for å velge mellom kort-visning og tabell-visning i Pakkedisplay, med konfigurerbare tabell-innstillinger for touch-optimalisert bruk.

---

## Implementerte endringer

### ✅ Del 1: Utvidet DisplaySettings interface
**Fil:** `src/hooks/useDisplayOrders.ts`

Nye innstillinger lagt til:
- `packing_view_mode: 'cards' | 'table'`
- `table_row_height: 'compact' | 'normal' | 'touch'`
- `table_font_size: string`
- `table_show_customer_number: boolean`
- `table_show_progress_bar: boolean`
- `table_show_order_count: boolean`
- `table_alternate_rows: boolean`
- `table_alternate_row_color: string`
- `table_sticky_header: boolean`
- `table_touch_row_spacing: string`

### ✅ Del 2: Ny innstillingsseksjon i DisplaySettings
**Fil:** `src/pages/DisplaySettings.tsx`

Ny AccordionItem "Visningsmodus" under Pakkedisplay-fanen med:
- Velg visningsmodus (Kort / Tabell)
- Tabell-innstillinger (vises kun når tabell er valgt)

### ✅ Del 3: Touch-optimalisert tabell-komponent
**Ny fil:** `src/components/packing/KioskCustomerTable.tsx`

Touch-optimalisert tabell med:
- Store, touch-vennlige rader
- Farget venstre kant for status
- Kundenavn, kundenummer, antall ordrer, fremdrift
- Alternerende radfarger
- Sticky header
- Framer Motion animasjoner
- Støtte for kundelåsing (web-visning)

### ✅ Del 4: Integrasjon i visningskomponenter
**Filer:** 
- `src/pages/packing/KioskPackingView.tsx`
- `src/pages/packing/CustomerPackingView.tsx`

Betinget rendering basert på `settings.packing_view_mode`:
- `'table'` → KioskCustomerTable
- `'cards'` (default) → Grid med kort

---

## Resultat

1. **Valgfrihet**: Administratorer kan velge mellom kort- og tabellvisning i Display Settings
2. **Touch-optimalisert**: Tabellen har store rader, god spacing og tydelige touch-targets
3. **Konfigurerbar**: Radhøyde, fontstørrelse, alternerende farger og mer kan tilpasses
4. **Konsistent**: Samme innstillinger gjelder for både web og kiosk
5. **Rask oversikt**: Tabellvisningen gir bedre oversikt over mange kunder samtidig
