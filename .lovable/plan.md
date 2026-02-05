
# Plan: Norsk som hovedspråk - FULLFØRT

## Implementering

**Display-skjermene (Felles Display, Kunde Display) bruker:**
- `useRealtimeDisplay()` hook
- Lytter på `broadcast` events (packing_update fra pakkestasjonene)
- Lytter på `postgres_changes` som backup
- Invaliderer queries og refetcher når oppdateringer mottas

**Pakkeskjermene (Pakkedisplay, Produktpakking):**
- Sender broadcast events via `usePackingBroadcast()`
- Bruker `useMarkAsPacked()`, `useBatchMarkAsPacked()`, `useUndoPacking()` mutations
- Har egne `useRealtimeDisplay` som lytter (men på andre kanaler)

**Kritisk punkt:** 
Display-skjermene må fortsatt motta realtime broadcast-events fra pakkestasjonene. Vi MUST NOT endre hvordan broadcast-events sendes fra pakkestasjonene.

## Løsning: Optimistisk oppdatering BARE på pakkeskjermen

Optimiseringen gjøres lokalt på pakke-siden (KioskPackingView, CustomerPackingView) uten å påvirke realtime broadcast-systemet:

1. **Optimistisk UI oppdatering på pakkedisplay** - Viser resultat umiddelbart når bruker klikker
2. **Fortsatt send broadcast** - Pakkestasjonene sender broadcast slik som før
3. **Display mottar broadcast** - Display-skjermene får realtime updates som før
4. **Ingen endringer i broadcast-mekanikk** - Alt fungerer som før

## Implementering

### Del 1: Optimistisk oppdatering i useMarkAsPacked (og andre mutations)

**Fil:** `src/hooks/useOrders.ts`

Legg til `onMutate` handler som oppdaterer cache optimistisk:

```typescript
onMutate: async ({ orderId, packingStatusId }) => {
  // Avbryt pågående refetch
  await queryClient.cancelQueries({ queryKey: ['kiosk-customers-for-date'] });
  
  // Lagre forrige data
  const previousData = queryClient.getQueryData(['kiosk-customers-for-date', ...]);
  
  // Optimistisk oppdatering av cache
  queryClient.setQueryData(['kiosk-customers-for-date', ...], (old) => {
    if (!old) return old;
    // Oppdater status lokalt
    return updateOrderStatusInCache(old, orderId, 'packed');
  });
  
  return { previousData };
},

onError: (err, variables, context) => {
  // Rollback ved feil
  if (context?.previousData) {
    queryClient.setQueryData(['kiosk-customers-for-date', ...], context.previousData);
  }
},

onSettled: () => {
  // Etter mutation, refetch for å synkronisere med server
  queryClient.refetchQueries({ queryKey: ['kiosk-customers-for-date'] });
  // VIKTIG: Broadcast sender automatisk - ingen endring her
}
```

### Del 2: Oppdater KioskPackingView.tsx

**Fil:** `src/pages/packing/KioskPackingView.tsx`

Sikre at mutations brukes på alle packing-action buttons:
- Mark as packed → `useMarkAsPacked()` (med optimistisk oppdatering)
- Undo → `useUndoPacking()` (med optimistisk oppdatering)
- Report deviation → `useReportDeviation()` (med optimistisk oppdatering)

Innføring av optimistisk oppdatering påvirker BARE den lokale brukerens view - display-skjermene mottar fortsatt broadcast events fra `usePackingBroadcast()`.

### Del 3: Oppdater CustomerPackingView.tsx

**Fil:** `src/pages/packing/CustomerPackingView.tsx`

Samme optimistisk oppdatering som KioskPackingView.

### Del 4: Hjelpefunksjon for cache-update

**Fil:** `src/hooks/useOrders.ts`

Legg til hjelpefunksjon som beregner oppdatert status:

```typescript
function updateOrderStatusInCache(
  customers: any[],
  orderId: string,
  newStatus: 'packed' | 'pending' | 'deviation'
): any[] {
  return customers.map(customer => {
    const orderIndex = customer.orders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) return customer;
    
    const updatedOrders = [...customer.orders];
    updatedOrders[orderIndex] = {
      ...updatedOrders[orderIndex],
      packing_status: {
        ...updatedOrders[orderIndex].packing_status,
        status: newStatus,
      }
    };
    
    const packedCount = updatedOrders.filter(
      (o: any) => o.packing_status?.status === 'packed'
    ).length;
    
    return {
      ...customer,
      orders: updatedOrders,
      packedOrders: packedCount,
      progress: Math.round((packedCount / customer.totalOrders) * 100),
    };
  });
}
```

## Sikkerhet - Display påvirkes IKKE

| Komponent | Før | Etter | Resultat |
|-----------|-----|-------|----------|
| Pakkedisplay UI | Venter ~300ms | Oppdateres umiddelbar (optimistisk) | ✅ Raskere |
| Broadcast sendt | `usePackingBroadcast()` | `usePackingBroadcast()` uendret | ✅ Display får signal |
| Display mottar | `useRealtimeDisplay` invaliderer | `useRealtimeDisplay` invaliderer | ✅ Ingen endring |
| Database roundtrip | Venter på svar | Samme som før | ✅ Ikke påvirket |

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/hooks/useOrders.ts` | Legg til `onMutate` med optimistisk cache-update, legg til hjelpefunksjon |
| `src/pages/packing/KioskPackingView.tsx` | Sikre alle mutations bruker optimistisk oppdatering |
| `src/pages/packing/CustomerPackingView.tsx` | Sikre alle mutations bruker optimistisk oppdatering |

## Teknisk sikring

**Display-kanalen påvirkes IKKE fordi:**
1. `usePackingBroadcast()` sendes som før
2. `useRealtimeDisplay()` mottar broadcast som før
3. Bare den lokale UI-cachen oppdateres optimistisk
4. Når broadcast mottas, refetcher display-skjermen anyway

**Fallback:**
- Hvis optimistisk oppdatering mislykkes, `onError` rollback restorer forrige data
- `onSettled` refetcher for å synkronisere med server

## Resultat

- ✅ Pakkedisplay respondere umiddelbart (0ms opplevd latency)
- ✅ Felles Display og Kunde Display mottar broadcast som før
- ✅ Display-skjermene refetcher ved broadcast mottatt
- ✅ Ingen endring i realtime-arkitektur
- ✅ Sikre fallback ved feil
