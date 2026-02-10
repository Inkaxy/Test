

# Forenkle innstillinger for Felles Display

## Bakgrunn

Felles Display er kun ment for TV- og Fully Kiosk-visning. Innstillingspanelet har i dag mange detaljerte innstillinger som er unodvendige for dette brukstilfellet og skaper unodvendig kompleksitet.

## Hva fjernes fra innstillingspanelet for "Felles Display"

Folgende innstillinger skjules nar `selectedDisplayType === 'shared'`:

### Topptekst-seksjonen
- **Fjernes:** Alle fontstorrelser (bakerinavn, kategorinavn, klokke, dato) -- disse hardkodes til fornuftige standardverdier for TV
- **Beholdes:** Vis/skjul toggles for bakerinavn, kategorinavn, klokke, dato og klokkeformat

### Statistikk-kort-seksjonen
- **Fjernes helt** -- for en ren TV-tabell-visning er separate statistikk-kort unodvendige. Fremdrift vises direkte i tabellen per kunde.

### Kundekort-seksjonen
- **Fjernes:** Kompakt modus, individuell fremdrift (bar), font-storrelser for kundenavn/produktnavn/antall/fremdrift
- **Beholdes:** Vis kundenummer, vis produktliste, vis produktnumre, vis antall som brett

### Utseende-seksjonen
- **Beholdes:** Temavelger og statusfarger (disse er viktige for TV-lesbarhet)
- **Fjernes:** Hjorneavrunding, kantlinje-bredde (hardkodes for tabell-layout)

### Layout & Scroll-seksjonen
- **Fjernes:** Fontstorrelser for kundenavn og produktnavn (duplikater av kundekort), mellomrom mellom kort
- **Fjernes:** Oppdateringsknapp-innstillinger (storrelse, stil, farger, tekst) -- knappen er irrelevant pa TV/kiosk
- **Fjernes:** Fullskjerm-knapp (irrelevant for Fully Kiosk)
- **Beholdes:** Antall kolonner, auto-scroll, sortering av kunder, wake lock

### Animasjoner-seksjonen
- **Forenkles:** Behold kun "aktiver animasjoner" og "hastighet". Fjern statusendring-animasjon, marker nylig oppdatert, og fremhevingsvarighet.

### Sanntid & Status-seksjonen
- **Forenkles:** Behold tilkoblingsstatus og siste oppdatering. Fjern fontstorrelse for statusmelding og auto-oppdateringsintervall (hardkodes til 60s).

## Teknisk endring

| Fil | Endring |
|-----|---------|
| `src/pages/DisplaySettings.tsx` | Legg til `selectedDisplayType !== 'shared'` betingelser rundt de identifiserte innstillingene for a skjule dem nar Felles Display er valgt |

## Fordeler

- Drastisk forenklet innstillingspanel for TV-bruk
- Mindre forvirrende for brukere som kun skal sette opp en TV-skjerm
- Ingen endring i selve display-visningen -- bare innstillingspanelet forenkles
- Innstillingene finnes fortsatt i datamodellen og kan brukes av andre display-typer

