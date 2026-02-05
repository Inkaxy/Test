
# Plan: Synkroniser Kiosk-utseende med Display-innstillinger

## Problemet
Kiosk-visningen (`KioskPackingView`) har et hardkodet design og bruker **ikke** de visuelle innstillingene fra `display_settings`-tabellen. Den leser kun sorteringsinnstillingene.

SharedDisplay bruker derimot alle display settings for farger, fontstørrelser, layout osv.

## Løsning
Oppdatere `KioskPackingView.tsx` til å bruke de samme visuelle innstillingene som SharedDisplay, inkludert:

### Visuelle endringer som skal synkroniseres

| Innstilling | Nå i Kiosk | Mål |
|-------------|------------|-----|
| Bakgrunnsfarge | Hvit (`bg-background`) | Fra `displaySettings.background_color` |
| Kortfarge | Standard `Card` | Fra `displaySettings.card_background_color` |
| Tekstfarge | Standard mørk | Fra `displaySettings.text_color` |
| Fontstørrelser | Hardkodede verdier | Fra `displaySettings.*_font_size` |
| Antall kolonner | Fast 4-kolonner grid | Fra `displaySettings.columns` |
| Border-radius | Standard Tailwind | Fra `displaySettings.border_radius` |
| Statusfarger | Hardkodet grønn/gul/grå | Fra `displaySettings.completed_color` etc. |

### Implementasjonsdetaljer

**Fase 1: Oppdater hovedcontainer**
- Sett bakgrunnsfarge fra `displaySettings.background_color`
- Sett tekstfarge fra `displaySettings.text_color`
- Sett padding fra `displaySettings.padding`

**Fase 2: Oppdater header-seksjon**
- Bruk `displaySettings.header_bakery_font_size` for bakerinavnet
- Bruk `displaySettings.header_category_font_size` for kategorinavnet
- Bruk `displaySettings.header_clock_font_size` og `header_clock_format`
- Bruk `displaySettings.header_date_font_size`

**Fase 3: Oppdater stats/progress-kort**
- Bruk `displaySettings.card_background_color` for kortbakgrunn
- Bruk `displaySettings.stats_*` innstillinger for fremdriftskort
- Bruk statusfarger for progress bar

**Fase 4: Oppdater kundekort-grid**
- Bruk `displaySettings.columns` for antall kolonner
- Bruk `displaySettings.gap_size` for mellomrom
- Stil hvert kort med `card_background_color`, `border_radius`, `card_border_width`
- Bruk `displaySettings.card_customer_name_font_size` for kundenavn
- Bruk statusfarger (`completed_color`, `packing_color`, `pending_color`)

**Fase 5: Oppdater kundedetalj-visning**
- Samme styling når bruker har valgt en kunde og pakker produkter
- Bruk `displaySettings.card_product_font_size` for produktnavn
- Bruk statusfarger for pakket/avvik-badges

### Filer som endres

| Fil | Endring |
|-----|---------|
| `src/pages/packing/KioskPackingView.tsx` | Omfattende styling-oppdatering for å bruke display settings |

### Tekniske detaljer

Koden henter allerede display settings (linje 282-283):
```typescript
const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'shared');
const settings = displaySettings || getDefaultDisplaySettings();
```

Men bruker dem kun for sortering. Vi må utvide dette til styling av alle elementer.

Eksempel på endring for hovedcontainer:
```typescript
// Før
<div className="min-h-screen bg-background p-4 space-y-4">

// Etter  
<div 
  className="min-h-screen"
  style={{ 
    backgroundColor: settings.background_color, 
    color: settings.text_color,
    padding: settings.padding || '1rem',
  }}
>
```

Eksempel på endring for kundekort-grid:
```typescript
// Før
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

// Etter
<div
  className="grid"
  style={{
    gridTemplateColumns: `repeat(${settings.columns || 4}, minmax(0, 1fr))`,
    gap: settings.gap_size || '1rem',
  }}
>
```

### Resultat
Kiosk-visningen vil se identisk ut med SharedDisplay-innstillingene, slik at brukerne får en konsistent opplevelse på tvers av alle skjermtyper.
