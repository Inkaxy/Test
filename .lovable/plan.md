
# Plan: Kiosk bruker korrekt display-innstillinger

## Problemanalyse

Etter undersøkelse har jeg identifisert følgende:

### Nåværende status
- Kiosk-visningen henter nå riktig innstillinger med `display_type='packing'` (fikset tidligere)
- Koden anvender `settings`-verdiene korrekt i stylingen

### Årsak til problemet
I databasen finnes det **ingen lagrede innstillinger** for `display_type='packing'`. Det finnes kun:
- `display_type='customer'` (global)
- `display_type='shared'` (global)

Når brukeren konfigurerer "Pakkedisplay" i Display Settings-siden og justerer farger, må de **klikke "Lagre innstillinger"** for at disse skal lagres i databasen.

### Bekreftet oppførsel
Koden i `KioskPackingView.tsx` er nå korrekt:
```typescript
const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'packing');
```

Dette henter innstillinger for:
- `bakery_id` = aktivt bakeri
- `category_id` = kategori fra URL
- `display_type` = 'packing'

## Løsning: Ingen kodeendringer nødvendig

Koden er allerede korrekt. Problemet er at **innstillingene ikke er lagret i databasen**.

### Brukerinstruksjoner

For at kiosk-visningen skal vise de mørke fargene:

1. **Gå til Display Settings** → Velg "Pakkedisplay"-fanen
2. **Velg riktig kategori** fra dropdown (f.eks. "Brød")
3. **Juster innstillingene** (bakgrunnsfarge, tekstfarge, etc.)
4. **Klikk "Lagre innstillinger"** - dette er kritisk!
5. **Åpne kiosk-lenken** på nytt

### Verifisering

Etter lagring vil databasen inneholde en ny rad:
```
display_type: 'packing'
category_id: [valgt kategori]
bakery_id: [ditt bakeri]
settings: { background_color: '#1a1a2e', ... }
```

## Teknisk detalj

Display Settings-siden viser en **forhåndsvisning** av innstillingene lokalt, men disse lagres først i databasen når brukeren klikker "Lagre innstillinger".

Hvis endringer ikke er lagret, vil kiosk-visningen bruke standardverdiene (hvit bakgrunn, mørk tekst).

## Oppsummering

| Status | Beskrivelse |
|--------|-------------|
| Kode | ✅ Korrekt - Kiosk henter `'packing'` innstillinger |
| Database | ⚠️ Mangler lagrede innstillinger for `'packing'` type |
| Løsning | Bruker må lagre innstillinger i Display Settings |

Ingen kodeendringer er nødvendig. Brukeren må bare sørge for å lagre innstillingene.
