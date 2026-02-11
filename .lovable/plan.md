
# Automatisk kolonne-tilpasning for TV-visning

## Hva endres
Felles display vil automatisk beregne optimalt antall kolonner basert på hvor mange kunder som vises, slik at TV-skjermen alltid fylles best mulig -- uten at brukeren må endre innstillinger manuelt.

## Hvordan det fungerer
- Hvis admin har satt et fast kolonnetall i innstillingene, brukes dette som maks-grense
- Systemet beregner automatisk det beste antallet kolonner basert på antall kunder:
  - 1-2 kunder: 1-2 kolonner (store kort)
  - 3-4 kunder: 2 kolonner
  - 5-9 kunder: 3 kolonner
  - 10-15 kunder: 4 kolonner
  - 16+ kunder: 5 kolonner (eller admin-maks)
- Antallet begrenses alltid av admin-innstillingen, slik at det aldri blir flere kolonner enn det som er konfigurert

## Ny innstilling
En ny toggle `auto_columns` legges til i `LayoutSettings` (standard: `true`). Når den er aktivert, beregnes kolonner automatisk. Når den er av, brukes det faste tallet fra innstillingene som i dag.

## Tekniske detaljer

### 1. Oppdater `LayoutSettings` type (`src/types/display/layout.ts`)
- Legg til `auto_columns: boolean` med default `true`

### 2. Oppdater `SharedDisplay.tsx`
- Legg til en `useMemo`-beregning som tar `sortedCustomers.length` og `displaySettings.columns` og returnerer optimalt kolonnetall
- Brukes kun når `displaySettings.auto_columns` er `true`
- Erstatt den eksisterende `columns`-variabelen med den beregnede verdien

### 3. Oppdater innstillingspanelet (om det finnes for felles display)
- Legg til en toggle for "Automatisk kolonne-tilpasning" i layout-seksjonen
- Vis kolonne-slideren som "Maks kolonner" når auto er aktivert
