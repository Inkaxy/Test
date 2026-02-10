

# Fix: Tur-progresjon pa tvers av alle pakkevisninger (Web + Kiosk)

## Problemet
Alle fire pakkevisninger har en race condition: Nar `useTrips` laster asynkront, er `trips = []` midlertidig, sa `hasTrips = false` og `activeTripId = null`. Datasporrringene kjorer umiddelbart UTEN tur-filter og henter ordrer fra ALLE turer samtidig. I tillegg invalideres ikke `trip-order-stats` ved pakkehandlinger, sa tur-progresjonen oppdateres aldri.

## Endringer

### 1. Blokker datalasting til turer er klare

**ProductPackingView.tsx** (linje 157):
- Endre `const { data: trips = [] } = useTrips(categoryId)` til `const { data: trips = [], isLoading: tripsLoading } = useTrips(categoryId)`
- Oppdater `useProductsForDate` (inline hook, linje 52) til a ta imot `tripsLoading` parameter og legge til `enabled: !!bakeryId && !tripsLoading` i query-konfigurasjonen
- Sende `tripsLoading` ved kall pa linje 190

**CustomerPackingView.tsx** (linje 89):
- Endre `const { data: trips = [] } = useTrips(categoryId)` til `const { data: trips = [], isLoading: tripsLoading } = useTrips(categoryId)`
- Sende `tripsLoading` som ny parameter til `useCustomersForDate` pa linje 122
- Oppdater `useCustomersForDate` hook (egen fil) til a ta imot valgfri `tripsLoading` parameter og legge til `enabled: !!deliveryDate && !tripsLoading`

**KioskPackingView.tsx** (linje 250):
- Endre `const { data: trips = [] } = useTripsForBakery(...)` til `const { data: trips = [], isLoading: tripsLoading } = useTripsForBakery(...)`
- Oppdater inline `useKioskCustomersForDate` (linje 114) til a ta imot `tripsLoading` og legge til `enabled: !!bakeryId && !tripsLoading`
- Sende `tripsLoading` ved kall pa linje 283

**ProductKioskPackingView.tsx** (linje 198):
- Endre `const { data: trips = [] } = useTripsForBakery(...)` til `const { data: trips = [], isLoading: tripsLoading } = useTripsForBakery(...)`
- Oppdater inline `useKioskProductsForDate` (linje 92) til a ta imot `tripsLoading` og legge til `enabled: !!bakeryId && !tripsLoading`
- Sende `tripsLoading` ved kall pa linje 231

### 2. Oppdater useCustomersForDate (delt hook)

**src/hooks/useCustomersForDate.ts** (linje 36):
- Legg til `tripsLoading?: boolean` som siste parameter (default `false`)
- Endre `enabled: !!deliveryDate` til `enabled: !!deliveryDate && !tripsLoading`

### 3. Invalider trip-order-stats ved pakkehandlinger

**src/hooks/usePackingMutations.ts** - Legg til i folgende steder:

- `markAsPacked.onSettled` (linje 321-334): Legg til `queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] })`
- `batchMarkAsPacked.onSuccess` (linje 402-410): Legg til `queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] })`
- `reportDeviation.onSettled` (linje 471-477): Legg til `queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] })`
- `undoPacking.onSettled` (linje 548-562): Legg til `queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] })`

## Filendringer oppsummert

| Fil | Endring |
|-----|---------|
| `src/pages/packing/ProductPackingView.tsx` | Hent `tripsLoading`, send til `useProductsForDate`, legg til `enabled`-sjekk |
| `src/pages/packing/CustomerPackingView.tsx` | Hent `tripsLoading`, send til `useCustomersForDate` |
| `src/pages/packing/KioskPackingView.tsx` | Hent `tripsLoading`, send til `useKioskCustomersForDate`, legg til `enabled`-sjekk |
| `src/pages/packing/ProductKioskPackingView.tsx` | Hent `tripsLoading`, send til `useKioskProductsForDate`, legg til `enabled`-sjekk |
| `src/hooks/useCustomersForDate.ts` | Legg til `tripsLoading`-parameter og `enabled`-sjekk |
| `src/hooks/usePackingMutations.ts` | Invalider `trip-order-stats` i alle 4 mutasjoners `onSettled`/`onSuccess` |

