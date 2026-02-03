

# Plan: Oppdater Kundesiden med pakkeskjerm-lenker

## Oversikt

Kundesiden skal oppdateres for å vise hvilken skjermtype hver kunde har (dedikert eller felles), samt en innstillingsdialog for å administrere dedikert skjerm per kunde.

## Funksjonelle krav (basert på bildene)

### Ny tabell-kolonne "Skjerm"
- Viser **"Egen"** (oransje badge) hvis kunden har `has_dedicated_display = true`
- Viser **"Felles"** (grå badge) hvis kunden bruker felles display

### Ny innstillingsdialog per kunde
- **Tittel**: "Skjerminnstillinger for [Kundenavn]"
- **Undertittel**: "Administrer dedikert skjerm for kunde #[kundenummer]"
- **Toggle**: "Dedikert skjerm" med "Aktiv/Inaktiv" label
- **Skjerm URL**: Viser URL til kundens dedikerte display
- **Knapper**: "Kopier URL", "Åpne skjerm", "Vis QR-kode"
- **Tips-seksjon** med informasjon om bruk

### Handlinger-kolonne
- Ny **tannhjul-ikon** (Settings) for å åpne skjerminnstillingene
- Eksisterende rediger og slett-knapper beholdes

## Teknisk implementasjon

### 1. Oppdater Customer interface
Legg til de manglende feltene fra databasen:

```typescript
// src/hooks/useCustomers.ts
export interface Customer {
  id: string;
  bakery_id: string;
  customer_number: string;
  name: string;
  address: string | null;
  is_active: boolean;
  has_dedicated_display: boolean | null;  // NY
  display_token: string | null;           // NY
}
```

### 2. Oppdater useUpdateCustomer
Tillat oppdatering av `has_dedicated_display` og `display_token`.

### 3. Ny komponent: CustomerScreenSettingsDialog

```text
┌──────────────────────────────────────────────────────────────┐
│  ⊞ Skjerminnstillinger for [Kundenavn]                    X  │
│    Administrer dedikert skjerm for kunde #[nummer]           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Dedikert skjerm                          Aktiv [●━━]  │  │
│  │  Aktiver individuell skjerm for denne kunden           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Skjerm URL                                                  │
│  ┌──────────────────────────────────────────────────┐  [📋] │
│  │ https://xxx.lovable.app/display/customer/abc123 │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  [📋 Kopier URL]  [↗ Åpne skjerm]                           │
│                                                              │
│  [⊞ Vis QR-kode]                                            │
│                                                              │
│  Tips:                                                       │
│  • QR-koden kan skannes for enkel tilgang                   │
│  • Skjermen viser real-time status for kundens ordrer       │
│  • URL kan deles direkte med kunden                         │
│  • Automatisk oppdatering hvert 30. sekund                  │
└──────────────────────────────────────────────────────────────┘
```

### 4. Oppdater Customers.tsx

Endringer i tabellen:
- Legg til "Skjerm"-kolonne med badge
- Legg til tannhjul-ikon i handlinger-kolonnen
- Integrer CustomerScreenSettingsDialog

### 5. Logikk for display_token

Ved aktivering av dedikert skjerm:
- Generer unik `display_token` (UUID) hvis den ikke finnes
- Sett `has_dedicated_display = true`

Ved deaktivering:
- Sett `has_dedicated_display = false`
- Behold `display_token` (slik at URL forblir den samme hvis aktivert igjen)

## Filer som endres

| Fil | Endring |
|-----|---------|
| `src/hooks/useCustomers.ts` | Legg til `has_dedicated_display` og `display_token` i interface |
| `src/pages/Customers.tsx` | Legg til Skjerm-kolonne, Settings-ikon og CustomerScreenSettingsDialog |

## QR-kode

For QR-kode-funksjonaliteten kan vi enten:
1. Bruke en QR-kode generator bibliotek (som `qrcode.react`)
2. Bruke en online QR API (f.eks. Google Charts API)

Anbefaler å bruke Google Charts API for enkelhet, eller installere `qrcode.react` for en mer robust løsning.

## Forventet resultat

Etter implementasjon vil brukeren kunne:
1. Se i tabellen hvilke kunder som har dedikert skjerm
2. Klikke på tannhjul-ikonet for å åpne innstillinger
3. Aktivere/deaktivere dedikert skjerm
4. Kopiere URL til kundens display
5. Åpne displayet i ny fane
6. Vise QR-kode for enkel skanning

