
# Produktbasert Pakking-fane i Display-innstillinger

## Oversikt

Legge til en 4. fane "Produktbasert Pakking" i Display-innstillinger med komplett konfigurasjon for produktbasert pakkevisning, inkludert en smart "Match felles display"-innstilling som automatisk synkroniserer fargevalg.

## Endringer

### 1. Ny fane i DisplaySettings (src/pages/DisplaySettings.tsx)

**Vis `product_packing` i tab-listen:**
- Fjerne `product_packing` fra `visibleDisplayTypes`-filteret (linje 77)
- Oppdatere grid fra `grid-cols-3` til `grid-cols-4` for tabs
- Legge til ikon for product_packing (Package-ikon)
- Filtrere kategorier til `product_based` for denne fanen

**Innhold i fanen - organisert i Accordion-seksjoner:**

**a) Tema og farger (med "Match felles display"-toggle)**
- Ny innstilling `match_shared_display_theme: boolean` - Når aktivert, arver tema/statusfarger fra Felles Display automatisk istedenfor a sette egne
- ThemePresetMenu (gjenbruk eksisterende komponent)
- Statusfarger (venter, pakker, ferdig) med egne color pickers
- Hjorneafrunding og kantlinje

**b) Produktlinje-farger**
- Gjenbruk eksisterende produktlinje-farger seksjon (palette editor)
- Forhåndsvisning med fargede produktrader

**c) Tabell-utseende**
- Radhøyde (compact/normal/touch)
- Fontstorrelser (generell, kundenavn)
- Zebra-striping (alternerende radfarger) med fargevelger
- Kantstil (none/subtle/full)
- Kolonnebredder

**d) Touch og interaksjon**
- Klikkbare rader for pakking (table_row_click_to_pack)
- Touch tap-feedback
- Rad hover-effekt
- Mengdevisning (storrelse, stil, farge)
- Vis brett-format (kv + stk)

**e) Ferdig pakket-visning**
- Vis ferdig-tilstand toggle
- Tekst, farger, logo watermark, animasjon
- Forhåndsvisning (gjenbruk monsteret fra shared display)

### 2. Ny type-property (src/types/display/general.ts)

Legge til:
```typescript
match_shared_display_theme: boolean;
```
Default: `true` - slik at nye oppsett automatisk matcher felles display.

### 3. Oppdatere DisplaySettings-filen

**Tab-selektor:**
- Vise 4 faner: Felles Display, Kunde Display, Pakkedisplay, Produktbasert Pakking
- `getDisplayTypeIcon` utvides med case for `product_packing`

**Kategori-filter:**
- For `product_packing`: filter til `product_based` kategorier (samme som shared/customer)

**Innstillings-seksjonene:**
- Accordion-basert layout med 5 seksjoner
- "Match felles display" er en fremtredende toggle oVerst i tema-seksjonen
- Nar aktivert: viser en melding "Farger synkroniseres automatisk med Felles Display" og skjuler tema-picker
- Nar deaktivert: viser full tema-picker med ThemePresetMenu

**Forhåndsvisning (hoyre panel):**
- Enkel produkttabell-preview med fargede rader, mengdevisning og status-badges
- Viser 3-4 eksempler med produktnavn og kundeliste

### 4. Logikk for "Match felles display"

Nar `match_shared_display_theme` er `true`, vil ProductPackingView hente felles display-innstillinger og bruke tema/statusfarger derfra. Dette implementeres i selve view-komponenten ved a hente shared-settings som fallback. Denne logikken bygges som en enkel fallback i `useDisplaySettings`-kallet i ProductPackingView.

## Teknisk implementering

Filen `src/pages/DisplaySettings.tsx` er stor (3656 linjer). For a holde endringene handterbare:

1. Fjerne `product_packing` fra filter-listen (1 linje)
2. Oppdatere grid-cols (1 linje)  
3. Legge til `product_packing` i `getDisplayTypeIcon` (1 linje)
4. Legge til kategori-filter for `product_packing` (1 linje i filteredCategories)
5. Legge til ny accordion-blokk etter eksisterende seksjoner (~300 linjer ny kode for alle 5 seksjonene)
6. Legge til forhåndsvisning i preview-panelet (~80 linjer)

### Filer som endres

| Fil | Endring |
|-----|---------|
| `src/types/display/general.ts` | Legge til `match_shared_display_theme` property |
| `src/pages/DisplaySettings.tsx` | Vise product_packing-fane, legge til innstillinger og preview |
| `src/pages/packing/ProductPackingView.tsx` | Implementere fallback til shared-tema nar match er aktivert |
