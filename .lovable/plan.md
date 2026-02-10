

# Fiks produktbasert pakking -- sanntid og arkitekturproblemer

## Oppsummering av funn

Etter grundig gjennomgang av kodebasen og det vedlagte dokumentet har jeg identifisert flere konkrete problemer som forhindrer produktbasert pakking fra a fungere korrekt:

## Problem 1: Kiosk sender aldri broadcast til displays

I `usePackingMutations.ts` (linje 252) er det en eksplisitt sjekk:
```
if (bakeryId && deliveryDate && !isKiosk) { broadcastPackingUpdate(...) }
```

Nar en pakker bruker kiosk-visningen (som bruker `isKiosk: true`), sendes **ingen broadcast**. Displays (SharedDisplay, CustomerDisplay) lytter pa broadcast-kanalen for raske oppdateringer (~30ms), men far aldri meldingen. De ma vente pa enten `postgres_changes` eller 60-sekunders polling.

**Losning:** Fjern `!isKiosk`-sjekken slik at broadcast sendes uansett modus. Kiosk kjenner `bakeryId` (fra URL) og `deliveryDate`, sa all nodvendig data er tilgjengelig.

## Problem 2: Kiosk-modus invaliderer feil query keys for produktbasert pakking

Nar kiosk-modus markerer en vare som pakket, bruker `onMutate` og `onSettled` query key `kiosk-customers-for-date` -- men produktbasert kiosk bruker `kiosk-products-for-date`. Dette betyr:
- Optimistisk oppdatering treffer feil cache (ingen visuell endring)
- Refetch etter mutasjon oppdaterer kundebasert cache, ikke produktbasert

**Losning:** Legge til stotte for produktbasert cache-oppdatering i `usePackingMutations`, enten via en ny parameter (`mode: 'product' | 'customer'`) eller ved a alltid invalidere begge query keys.

## Problem 3: Feil display settings type i ProductPackingView

`ProductPackingView` (linje 196) bruker:
```
useDisplaySettings(bakeryId, categoryId, 'shared')
```

Men produktbasert pakking har egne innstillinger under `'product_packing'`. Dette betyr at visuelle tilpasninger gjort i admin for produktpakking ikke tas i bruk.

**Losning:** Endre til `'product_packing'` i bade `ProductPackingView` og `ProductKioskPackingView`.

## Problem 4: Sanntidslytting i produktvisninger invaliderer med ufullstendig query key

I `ProductPackingView` (linje 225-227):
```
queryClient.invalidateQueries({ 
  queryKey: ['products-for-date', bakeryId, dateStr] 
});
```

Men selve queryen bruker key `['products-for-date', bakeryId, dateStr, categoryId, tripId]`. Invalidering uten `categoryId` og `tripId` kan fungere (partial match), men det er unodvendig upresist.

I `ProductKioskPackingView` (linje 265):
```
queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
```

Denne treffer alle produkt-queries uansett bakeri/dato, noe som er for bredt.

**Losning:** Gjore invaliderings-keys mer presise i begge visningene.

## Plan for implementering

### Steg 1: Aktiver broadcast fra kiosk-modus
**Fil:** `src/hooks/usePackingMutations.ts`
- Fjern `!isKiosk` fra broadcast-betingelsen i `markAsPacked`, `batchMarkAsPacked`, `reportDeviation` og `undoPacking`
- Kiosk bruker `effectiveBakeryId` som allerede settes korrekt fra `options.bakeryId`

### Steg 2: Fiks cache-oppdatering for produktbasert modus
**Fil:** `src/hooks/usePackingMutations.ts`
- I `onSettled` for alle mutasjoner: legg til invalidering av `kiosk-products-for-date` og `products-for-date`
- I `onMutate` for kiosk-modus: forsok oppdatering av bade `kiosk-customers-for-date` og `kiosk-products-for-date` cacher

### Steg 3: Bruk riktig display settings type
**Filer:** `src/pages/packing/ProductPackingView.tsx`, `src/pages/packing/ProductKioskPackingView.tsx`
- Endre `'shared'` til `'product_packing'` i `useDisplaySettings`-kallet i ProductPackingView
- Legg til `useDisplaySettings` i ProductKioskPackingView (bruker i dag standard-styling)

### Steg 4: Presiser invaliderings-keys
**Filer:** `src/pages/packing/ProductPackingView.tsx`, `src/pages/packing/ProductKioskPackingView.tsx`
- Oppdater sanntids-handlerne til a bruke fulle query keys med bakeryId, dateStr, categoryId

### Steg 5: Legg til broadcast-lytting i ProductKioskPackingView
**Fil:** `src/pages/packing/ProductKioskPackingView.tsx`
- Legg til lytting pa broadcast-kanalen (lik `useRealtimeDisplay`) for a fa oppdateringer fra andre enheter raskt

### Oppsummering av filendringer

| Fil | Endring |
|-----|---------|
| `src/hooks/usePackingMutations.ts` | Fjern !isKiosk fra broadcast, legg til produkt-cache invalidering |
| `src/pages/packing/ProductPackingView.tsx` | Bruk 'product_packing' display type, presiser invalidering |
| `src/pages/packing/ProductKioskPackingView.tsx` | Legg til broadcast-lytting, presiser invalidering, bruk display settings |

Disse endringene sikrer at:
- Alle pakkehandlinger (bade web og kiosk) broadcaster til displays i sanntid
- Produktbasert cache oppdateres korrekt ved pakking
- Display-innstillinger for produktpakking respekteres
- Sanntidsoppdateringer er presise og effektive

