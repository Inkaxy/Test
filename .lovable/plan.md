

# Koble `realtime_auto_refresh_interval` til faktisk refetch-intervall

## Bakgrunn
Display-skjermene har allerede sanntidsoppdatering via Supabase Realtime (broadcast + postgres_changes). I tillegg finnes et fallback-intervall (`refetchInterval`) som henter data periodisk dersom sanntidskanalen feiler. Dette intervallet er hardkodet til 60 sekunder, selv om brukeren kan konfigurere det via innstillingen `realtime_auto_refresh_interval`.

## Endringer

### 1. `src/hooks/useDisplayOrders.ts`
Legg til valgfri `refetchIntervalMs`-parameter i tre hooks:

| Hook | Linje | Endring |
|------|-------|---------|
| `useDisplayOrders` | 43-82 | Ny parameter `refetchIntervalMs?: number`, bruk i stedet for `60000` |
| `useCustomerDisplayData` | 86 | Videresend ny parameter til `useDisplayOrders` |
| `useCustomerDisplayOrders` | 173-206 | Ny parameter `refetchIntervalMs?: number`, bruk i stedet for `60000` |

Standardverdi forblir 60000 ms for bakoverkompatibilitet.

### 2. `src/pages/display/SharedDisplay.tsx`
Send innstillingen videre til `useCustomerDisplayData`:
```
useCustomerDisplayData(
  bakery?.id || null,
  categoryId || null,
  deliveryDate,
  displaySettings.realtime_auto_refresh_interval * 1000
)
```

### 3. `src/pages/display/CustomerDisplay.tsx`
Send innstillingen videre til `useCustomerDisplayOrders`:
```
useCustomerDisplayOrders(
  customer?.id || null,
  customer?.bakery_id || null,
  deliveryDate,
  displaySettings.realtime_auto_refresh_interval * 1000
)
```

## Resultat
Brukeren kan styre fallback-oppdateringsintervallet fra 15s til 300s via Display-innstillingene, og verdien reflekteres umiddelbart i live-visningene.

