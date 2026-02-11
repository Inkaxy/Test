
# Forbedring av Felles Display for TV-visning

## Problemene som skal fikses

1. **Skjermen blinker** - Hver gang sanntidsdata oppdateres, invalideres queries som trigger full re-render av alle kort
2. **Kundekort tilpasses ikke bredden** - Grid bruker faste kolonner uten at kortene fyller tilgjengelig plass optimalt
3. **Mangler produktfarger** - SharedDisplay bruker ikke `product_line_colors_palette` som CustomerDisplay gjor - produkter har ingen fargemarkering
4. **Dårlig layout på kort** - Produkttabellen inne i kortene er enkel og uleselig på TV
5. **Ikke optimalisert for TV/kiosk** - Fonter er for små, spacing er for tett for avstandslesing

---

## Løsning

### 1. Fiks blinking (Stabiliser re-rendering)

**Fil:** `src/hooks/useRealtimeDisplay.ts`

- Bruk optimistisk cache-oppdatering istedenfor full query-invalidering ved broadcast-meldinger
- Sett `staleTime` på display-queries til lengre varighet for å unnga unodvendige refetches
- Fjern inngangs/utgangsanimasjoner (AnimatePresence) fra kortene som allerede er nevnt i memory

**Fil:** `src/hooks/useDisplayOrders.ts`

- Ok `staleTime` fra standard (2 min) til `Infinity` for display-queries siden data oppdateres via realtime

### 2. Produktfarger på Felles Display

**Fil:** `src/pages/display/SharedDisplay.tsx`

- Implementer samme `getProductLineColor()` funksjon som CustomerDisplay bruker (hash-basert konsistent fargelegging)
- Bruk `product_line_colors_palette` fra display-innstillinger for å fargelegge produkt-rader i tabellen
- Sett bakgrunn pa hver produktrad basert pa produkt-ID, slik at samme produkt far lik farge pa alle skjermer

### 3. Bedre kortlayout for TV

**Fil:** `src/pages/display/SharedDisplay.tsx`

Redesigne kundekortene for TV-lesbarhet:

- **Kundenavn**: Storre font, venstreorientert med fargekode-stripe pa venstre side
- **Produkttabell**: Legge til fargede bakgrunner per rad (fra paletten), storre fonter, bedre padding
- **Mengde-kolonne**: Gjore tydeligere med monospace-font og fremhevet farge
- **Status-indikator**: Storre prikker/ikoner for pakket/ikke-pakket
- **Fremdriftsbar**: Tykkere og mer synlig i bunnen av kortet
- **Auto-tilpasse kolonner**: Bruke `minmax()` i grid for at kort fyller bredden bedre, med en minimumsbredde som sikrer lesbarhet

### 4. TV-optimalisering

**Fil:** `src/pages/display/SharedDisplay.tsx`

- Gjore grid responsivt: `repeat(auto-fit, minmax(400px, 1fr))` som fallback nar kolonnetall er lav
- Okere standard padding og fontstorrelser
- Legge til `min-height` pa kort slik at de er mer uniform
- Sikre at kortet strekker seg til full bredde i sin grid-celle (fjerne eventuell max-width)

---

## Teknisk detaljer

### Endringer per fil

| Fil | Endring |
|-----|---------|
| `src/pages/display/SharedDisplay.tsx` | Legge til `getProductLineColor()`, redesigne produkttabell med fargede rader, forbedre grid med auto-fit, okere fontstorrelser, fjerne animasjoner som blinker |
| `src/hooks/useRealtimeDisplay.ts` | Erstatte full query-invalidering med mer presis cache-oppdatering for a redusere blinking |
| `src/hooks/useDisplayOrders.ts` | Sette `staleTime: Infinity` pa display-queries |
| `src/types/display/card.ts` | Legge til `card_min_height` innstilling for minimum korthøyde |

### Produktfarge-logikk (delt mellom SharedDisplay og CustomerDisplay)

Begge skjermene vil bruke identisk hash-funksjon basert pa `product.id` for a beregne fargeindeks i paletten. Dette sikrer at samme produkt alltid far samme farge uansett hvilken skjerm man ser pa.

```text
Produkt-ID --> hash --> palett-indeks --> farge
  "abc123"  -->  42  -->      2       --> #FEF3C7 (Lys gul)
```

### Ny grid-strategi

```text
Navaerende:  repeat(3, minmax(0, 1fr))     -- Faste kolonner, kort kan bli smale
Ny:          repeat(auto-fit, minmax(380px, 1fr))  -- Auto-tilpasset, aldri for smale
             (med fallback til innstilt kolonneverdi)
```
