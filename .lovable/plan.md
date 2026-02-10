
# Refaktorering av kundebasert pakking

Ren refaktorering og bugfiks -- ingen funksjonelle eller UI-endringer.

## Oppgave 1: Fjern duplikat updateOrderStatusInCustomersCache fra useOrders.ts

Fjern funksjonen (linje 37-103) og den ubrukte importen av `CustomerWithOrders` (linje 4). Behold `Order`-typen, `useOrders` og `useOrdersByProduct`.

## Oppgave 7: Opprett getFirstPackingStatus-hjelpefunksjon

Legg til en generisk hjelpefunksjon i `src/lib/utils.ts`:

```text
export function getFirstPackingStatus<T>(ps: T | T[] | null | undefined): T | null {
  if (!ps) return null;
  return Array.isArray(ps) ? ps[0] || null : ps;
}
```

Bruk den i:
- `src/hooks/useCustomersForDate.ts` -- erstatt inline array-sjekk (linje ~80)
- `src/hooks/useOrders.ts` -- erstatt `order.packing_status?.[0] || null` (linje 131, 163)
- Den nye `useKioskCustomersForDate.ts`-filen (oppgave 5)

## Oppgave 5: Flytt inline-hooks fra KioskPackingView.tsx til egne filer

Opprett to nye filer:

**`src/hooks/useKioskCustomersForDate.ts`** -- flytt `useKioskCustomersForDate` (linje 115-192), `OrderWithProduct` og `CustomerWithOrders` interfaces (linje 52-76). Bruk `getFirstPackingStatus` for konsistent array-handtering av `order.packing_status`.

**`src/hooks/useRealtimePackingStatus.ts`** -- flytt `useRealtimePackingStatus` (linje 195-223).

Oppdater `KioskPackingView.tsx` til a importere fra de nye filene. Fjern de to inline-hooks-definisjonene og interfaces.

## Oppgave 3: Fiks channel-lekkasje i broadcastPackingUpdate

I `src/hooks/usePackingMutations.ts`: legg til cleanup i `broadcastPackingUpdate` (linje 174-205). Etter sending, bruk `setTimeout(() => supabase.removeChannel(channel), 500)` for bade `generalChannel` og `categoryChannel`.

I `src/hooks/useRealtimeDisplay.ts`: fiks `usePackingBroadcast` (linje 92-113) til a subscribe for sending og deretter rydde opp:

```text
const channel = supabase.channel(channelName);
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.send({ type: 'broadcast', event: 'packing_update', payload: update });
    setTimeout(() => supabase.removeChannel(channel), 500);
  }
});
```

## Oppgave 6: Fiks Realtime-kanalnavn i CustomerPackingView.tsx

Endre linje 163 fra:
```text
.channel('customer-packing-status')
```
til:
```text
.channel(`customer-packing-status:${bakeryId}:${dateStr}`)
```

Legg til `dateStr` i useEffect dependency-arrayet (linje 182).

## Oppgave 4: Automatisk lost

Loses av oppgave 2 (CustomerPacking.tsx slettes).

## Oppgave 2: Fjern CustomerPacking.tsx

- Fjern `import CustomerPacking` fra `src/App.tsx` (linje 16)
- Fjern ruten `<Route path="/packing/customer" element={<CustomerPacking />} />` (linje 92)
- Slett filen `src/pages/CustomerPacking.tsx`

## Filendringer (oppsummert)

| Fil | Endring |
|-----|---------|
| `src/hooks/useOrders.ts` | Fjern duplikat funksjon og ubrukt import |
| `src/lib/utils.ts` | Legg til `getFirstPackingStatus` |
| `src/hooks/useCustomersForDate.ts` | Bruk `getFirstPackingStatus` |
| `src/hooks/useKioskCustomersForDate.ts` | Ny fil (flyttet fra KioskPackingView) |
| `src/hooks/useRealtimePackingStatus.ts` | Ny fil (flyttet fra KioskPackingView) |
| `src/pages/packing/KioskPackingView.tsx` | Fjern inline-hooks, importer fra nye filer |
| `src/hooks/usePackingMutations.ts` | Legg til channel cleanup |
| `src/hooks/useRealtimeDisplay.ts` | Fiks usePackingBroadcast med subscribe+cleanup |
| `src/pages/packing/CustomerPackingView.tsx` | Scoped kanalnavn |
| `src/App.tsx` | Fjern CustomerPacking-rute og import |
| `src/pages/CustomerPacking.tsx` | Slett filen |
