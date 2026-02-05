
# Plan: Kiosk bruker kategori-spesifikke display-innstillinger

## Problemet
Kiosk-visningen henter display-innstillinger med `displayType: 'shared'`, men dette betyr at den bruker de globale "Felles Display"-innstillingene. Brukeren ønsker at kiosk skal bruke de samme innstillingene som er konfigurert for kategorien.

## Analyse

Display-innstillinger lagres med tre parametre:
- `bakery_id` - hvilket bakeri
- `category_id` - hvilken kategori (eller `null` for globale)
- `display_type` - type visning (`shared`, `customer`, `packing`)

Kiosk-visningen bruker i dag:
```typescript
useDisplaySettings(bakery?.id || null, categoryId, 'shared')
```

Dette henter innstillinger for `category_id + displayType='shared'`.

## Løsning

Endre kiosk til å bruke `displayType: 'packing'` i stedet for `'shared'`, siden kiosk er en pakkevisning og bør følge pakke-innstillingene for kategorien.

Alternativt kan vi legge til en ny `displayType: 'kiosk'`, men dette vil kreve:
- Databaseendring (eller tillate nye verdier)
- Oppdatere `DISPLAY_TYPES`-konstanten
- Legge til en ny fane i DisplaySettings-siden

**Anbefalt løsning:** Bruk `'packing'` display-type for kiosk, siden kiosk **er** en pakkevisning. Dette gir umiddelbar konsistens uten behov for ekstra konfigurasjon.

## Implementasjon

| Fil | Endring |
|-----|---------|
| `src/pages/packing/KioskPackingView.tsx` | Endre `displayType` fra `'shared'` til `'packing'` |

### Kodeendring

```typescript
// Før (linje 283)
const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'shared');

// Etter
const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'packing');
```

## Resultat
Kiosk-visningen vil nå bruke de samme innstillingene som "Pakkedisplay" for den valgte kategorien. Brukeren kan konfigurere utseendet via DisplaySettings-siden → velg kategori → "Pakkedisplay"-fanen.
