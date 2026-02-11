

# Oppdater beskrivelse for Felles Display

## Problem
Beskrivelsen for Felles Display sier "viser alle kunder og deres pakkestatus", men skjermen viser kun kunder som IKKE har en dedikert skjerm (kunder der `has_dedicated_display` er `false` eller `null`). Beskrivelsen er misvisende.

## Endring

**Fil:** `src/hooks/useDisplayOrders.ts` (linje 240)

Endre beskrivelsen fra:
> Storskjerm i produksjonen som viser alle kunder og deres pakkestatus

til:
> Storskjerm i produksjonen som viser kunder uten dedikert skjerm og deres pakkestatus

Dette er en ren tekstendring - filtreringslogikken er allerede korrekt implementert (linje 64 filtrerer bort kunder med `has_dedicated_display = true`).

