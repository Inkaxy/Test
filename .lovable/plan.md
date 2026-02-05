
# Plan: Fiks gjenværende forskjeller mellom web og kiosk pakkevisning

## Oppsummering av undersøkelsen

Etter grundig analyse fant jeg:

1. **Koden ER allerede oppdatert** - `CustomerPackingView.tsx` bruker nå display-innstillinger med mørk bakgrunn, grid-layout og kiosk-stil elementer
2. **Brukerens skjermbilde var sannsynligvis fra en gammel cache** - nåværende versjon viser korrekt kiosk-stil visning
3. **Det finnes fortsatt noen forskjeller** mellom web og kiosk som bør fikses

## Gjenværende forskjeller

| Element | Web (CustomerPackingView) | Kiosk (KioskPackingView) | Problem |
|---------|---------------------------|--------------------------|---------|
| Header tittel | "Customer based / Kundebasert" | Bakerienavn (f.eks. "Test Bakeri AS") | Web viser ikke bakerienavn |
| Undertittel | Kategorinavn | Kategorinavn | OK |
| Sidebar | Vises (DashboardLayout) | Ingen sidebar | Web har sidebar som tar plass |
| "Gjenstår" tekst | "display.remaining" (feil!) | "Gjenstår" | Oversettelsesnøkkel mangler |
| Fullskjerm | Tilgjengelig via knapp | Standard fullskjerm | Kiosk åpnes ofte i fullskjerm |

## Tekniske endringer

### 1. Fiks oversettelsesnøkkel for "Gjenstår"

**Fil:** `src/pages/packing/CustomerPackingView.tsx` (linje 600)

Nåværende kode bruker `t('display.remaining')` som ikke eksisterer. Må endres til riktig nøkkel.

### 2. Vis bakerienavn i header (som kiosk)

**Fil:** `src/pages/packing/CustomerPackingView.tsx` (linje 463-478)

Legg til spørring for bakerienavn og vis det i headeren på samme måte som kiosk-visningen:

```text
Før:
<h1>Kundebasert</h1>
<p>Kategorinavn</p>

Etter (som kiosk):
<h1>Test Bakeri AS</h1>    (bakerienavn)
<p>Småvarer</p>            (kategorinavn)
```

### 3. Valgfritt: Legg til "Skjul sidebar"-modus

For å oppnå samme opplevelse som kiosk, kan vi legge til en knapp som skjuler sidebaren midlertidig. Dette er valgfritt siden fullskjerm-knappen allerede finnes.

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/pages/packing/CustomerPackingView.tsx` | Fiks "display.remaining" til riktig oversettelse, vis bakerienavn i header |
| `src/i18n/locales/nb.json` | Sjekk at oversettelsesnøkkel finnes |
| `src/i18n/locales/en.json` | Sjekk at oversettelsesnøkkel finnes |

## Verifisering

For å bekrefte at endringene fungerer:
1. Naviger til `/packing`, velg en kategori, velg en dato, og klikk "Fortsett pakking"
2. Verifiser at:
   - Mørk bakgrunn vises
   - 3-kolonners grid med kundekort
   - Header viser bakerienavn + kategorinavn (som kiosk)
   - Statistikk-seksjonen viser "Total fremdrift", "Pakket", "Gjenstår" (ikke "display.remaining")
   - Klokke og dato vises
   - Fullskjerm-knapp fungerer

## Viktig merknad

Hvis brukeren fortsatt ser den gamle tabell-visningen, bør de:
1. Hard-refresh nettleseren (Ctrl+Shift+R)
2. Tømme cache
3. Prøve i inkognitomodus

Dette skyldes at nettleseren kan ha cachet den gamle versjonen av JavaScript-filene.
