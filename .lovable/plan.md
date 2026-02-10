
# Fiks: Vis kun valgte produkter pa felles display

## Problem

Felles displayet viser alle produkter for alle kunder, uavhengig av om de er valgt for pakking i pakkevisningen. Dedikert kundedisplay har allerede denne filtreringen (via `useReceivePackingSelection`), men felles displayet mangler den.

## Krav

1. **Kunder skal alltid vises** pa felles displayet dersom de har ordrer for pakkedagen
2. **Produkter skal kun vises** dersom de er valgt for pakking (via broadcast fra pakkevisningen)
3. Nar ingen produkter er valgt for en kunde, vises kunden fortsatt men uten produktliste (venter-tilstand)

## Losning

Bruk den eksisterende broadcast-mekanismen (`useReceivePackingSelection`) i SharedDisplay. Siden felles displayet viser flere kunder samtidig, trengs en ny variant av hooket som samler opp valg per kunde.

## Tekniske endringer

### 1. Ny hook: `useReceiveAllPackingSelections` (i `src/hooks/usePackingSelection.ts`)

Legg til en ny hook som lytter pa samme broadcast-kanal men samler opp valg i en Map per kunde-ID:

- Lytter pa `packing_selection` og `clear_selection` events
- Lagrer en `Map<string, string[]>` med `customerId -> productIds[]`
- Ved `clear_selection` fjernes den aktuelle kunden fra mappet
- Eksponerer en hjelpefunksjon `getSelectedProductIds(customerId)` som returnerer valgte produkt-IDer for en gitt kunde

### 2. Oppdater `src/pages/display/SharedDisplay.tsx`

- Importer og bruk `useReceiveAllPackingSelections` med bakeryId og deliveryDate
- For hver kundes produktliste, filtrer ordrer basert pa valgte produkter
- Dersom ingen produkter er valgt for en kunde, vis en "venter pa valg"-indikator i stedet for produktlisten
- Oppdater fremdriftsberegning (`packedCount`/`totalCount`) til a reflektere filtrerte produkter
- Behold kunden synlig uansett -- kun produktene inne i kortet filtreres

### 3. Oppdater `src/hooks/useDisplayOrders.ts`

- I `useCustomerDisplayData`: Eksporter radata (`orders`) slik at SharedDisplay kan filtrere selv, eller behold eksisterende logikk og la filtreringen skje i renderingen

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/hooks/usePackingSelection.ts` | Ny hook `useReceiveAllPackingSelections` som samler valg per kunde |
| `src/pages/display/SharedDisplay.tsx` | Bruk ny hook, filtrer produkter per kundekort basert pa valgte produkter |
