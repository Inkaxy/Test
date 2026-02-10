

# Fix: Produktvalg vises ikke pa felles display

## Problem

Kanalnavn for Supabase Broadcast stemmer ikke overens:

- **Pakkevisningen sender pa**: `packing-selection-${bakeryId}`
- **Felles display lytter pa**: `packing-selection-shared-${bakeryId}`

Siden kanalnavnene er forskjellige, mottar felles display aldri produktvalgene fra pakkevisningen.

## Losning

Endre `useReceiveAllPackingSelections` i `src/hooks/usePackingSelection.ts` til a lytte pa samme kanal som pakkevisningen sender pa: `packing-selection-${bakeryId}`.

## Teknisk

| Fil | Endring |
|-----|---------|
| `src/hooks/usePackingSelection.ts` | Linje 149: Endre kanalnavn fra `` `packing-selection-shared-${bakeryId}` `` til `` `packing-selection-${bakeryId}` `` |

Denne ene endringen sikrer at felles display abonnerer pa samme broadcast-kanal som pakkevisningen bruker, slik at produktvalg umiddelbart reflekteres pa TV-skjermen.

