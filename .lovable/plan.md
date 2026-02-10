

# Enkel pinkode for kioskvisning

## Oversikt
Legge til en valgfri 4-sifret pinkode som beskytter kioskvisningene. Pinkoden settes per bakeri i admin-innstillingene, og brukeren ma taste den inn for a fa tilgang til kiosk-pakkevisningen.

## Brukeropplevelse

1. **Admin setter pinkode**: I Innstillinger-siden kan bakeri-admin aktivere kiosk-pinkode og skrive inn en 4-sifret kode
2. **Kiosk-bruker**: Nar de apner kiosk-URLen, vises en fullskjermside med et pinkode-felt. Riktig kode gir tilgang, og koden huskes i enheten (localStorage) slik at man ikke trenger a taste den inn pa nytt ved hver sidelasting
3. **Uten pinkode**: Hvis admin ikke har satt en kode, fungerer kiosken som i dag uten noen sperring

## Tekniske endringer

### 1. Database: Utvid bakeries.settings (ingen migrering nodvendig)
Pinkoden lagres i det eksisterende `settings`-JSONB-feltet pa `bakeries`-tabellen:
```
settings.kiosk_pin = "1234" | null
```
Ingen ny tabell eller kolonne trengs.

### 2. Backend-funksjon: Valider pinkode (ny edge function)
En edge function `validate-kiosk-pin` som tar imot `bakery_short_id` og `pin`, og returnerer `{ valid: true/false }`. Dette forhindrer at pinkoden eksponeres til klienten.

- Bruker service role key for a lese `bakeries.settings`
- Returnerer bare om koden er korrekt, aldri selve koden
- Hvis ingen pinkode er satt, returnerer `{ valid: true, no_pin: true }`

### 3. Ny komponent: KioskPinGate
En wrapper-komponent som vises for kiosk-pinkodeinngang:
- Fullskjermsvisning med bakerilogo/navn
- 4-sifret nummerfelt (touch-optimalisert med store knapper for nettbrett)
- Validerer mot backend-funksjonen
- Ved riktig kode: lagrer i localStorage (`kiosk-pin-{bakeryShortId}`) og viser innholdet
- Ved feil kode: viser feilmelding med risting-animasjon
- Automatisk sjekk av lagret kode ved sidelasting

### 4. Oppdater KioskPackingView og ProductKioskPackingView
Begge kiosk-visninger wrappes med `KioskPinGate`:
- Sjekker om bakeri har pinkode (via edge function)
- Hvis ja: vis pin-skjerm for brukeren har tastet riktig kode
- Hvis nei: vis pakkevisningen direkte

### 5. Admin-innstilling: Pinkode-konfigurasjon
Ny seksjon i Settings-siden:
- Bryter for a aktivere/deaktivere kiosk-pinkode
- Input-felt for 4-sifret kode (kun synlig nar aktivert)
- Lagres via eksisterende `useUpdateBakerySettings`

### 6. Oppdater BakerySettings type
Legg til `kiosk_pin?: string | null` i `BakerySettings`-interfacet i `useBakerySettings.ts`.

## Filendringer

| Fil | Endring |
|-----|---------|
| `supabase/functions/validate-kiosk-pin/index.ts` | Ny edge function for PIN-validering |
| `src/components/packing/KioskPinGate.tsx` | Ny komponent: fullskjerms pinkode-inngang |
| `src/pages/packing/KioskPackingView.tsx` | Wrap med KioskPinGate |
| `src/pages/packing/ProductKioskPackingView.tsx` | Wrap med KioskPinGate |
| `src/hooks/useBakerySettings.ts` | Legg til `kiosk_pin` i BakerySettings type |
| `src/pages/Settings.tsx` | Ny seksjon for kiosk-pinkode-innstilling |

## Sikkerhet
- Pinkoden eksponeres aldri til klienten - validering skjer via backend-funksjon
- localStorage brukes kun for a huske at koden er bekreftet, ikke selve koden
- Edge function bruker service role for a lese innstillinger
