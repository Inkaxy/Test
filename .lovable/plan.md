

## Mål
Fjerne den unødvendige “0/1” / “1/1”-teksten som fortsatt vises under/ved siden av antall “stk” på enkelte visninger. Statusen vises allerede tydelig med “Ferdig/Venter”-badge og gjennomstreking, så denne ekstra linjen skaper bare støy.

## Hva jeg fant (årsaken til at den fortsatt vises)
Selv om “0/1 / 1/1” er fjernet fra **CustomerDisplay**, finnes teksten fortsatt hardkodet i andre filer:

- `src/pages/display/SharedDisplay.tsx` (Felles display) – produktlinjene har en egen “Progress indicator” som viser `{isPacked ? '1/1' : '0/1'}`.
- `src/pages/display/PackingDisplay.tsx` (Pakkedisplay) – samme “Progress indicator” som over.
- `src/pages/DisplaySettings.tsx` (admin-forhåndsvisning av displaykort) – forhåndsvisningen viser `{product.packed ? '1/1' : '0/1'}`.

Derfor vil “0/1 / 1/1” fortsatt dukke opp i disse skjermene selv etter at CustomerDisplay ble ryddet.

## Endringer som skal gjøres

### 1) Felles display: fjern progress-indikatoren fra produktlinjene
**Fil:** `src/pages/display/SharedDisplay.tsx`  
**Endring:** Slette blokken under kommentaren `/* Progress indicator */` (linjene rundt 512–520 i utsnittet jeg leste).

- Fjern hele `<div ...><span className="font-mono ...">{isPacked ? '1/1' : '0/1'}</span></div>`
- La resten stå: produktnavn + antall (“stk”) + badge (“Ferdig/Venter”)

**Resultat:** Ingen “0/1 / 1/1” i Felles display, og layouten blir renere.

### 2) Pakkedisplay: fjern progress-indikatoren fra produktlinjene
**Fil:** `src/pages/display/PackingDisplay.tsx`  
**Endring:** Slette blokken under `/* Progress indicator */` (rundt linjene 362–370 i utsnittet jeg leste).

- Samme fjerning som i SharedDisplay.

### 3) Display-innstillinger (forhåndsvisning): fjern “0/1 / 1/1” i preview-kortet
**Fil:** `src/pages/DisplaySettings.tsx`  
**Endring:** Fjerne `span`-linjen som viser `{product.packed ? '1/1' : '0/1'}` (rundt linje 1570–1572).

Dette påvirker bare forhåndsvisningen i adminpanelet, men hindrer forvirring når man justerer innstillinger.

## Kontroll / test (viktig)
1. Åpne Felles display (`/display/...`) og verifiser at ingen produktlinjer viser “0/1” eller “1/1”.
2. Åpne Pakkedisplay (`/display/packing`) og verifiser det samme.
3. Gå til “Display settings” (admin) og sjekk at preview-kortet ikke viser “0/1 / 1/1”.
4. Bekreft at status fortsatt er tydelig via:
   - gjennomstreking/opacity på pakket produkt
   - badge (“Ferdig”/“Venter”)

## Risiko / bivirkninger
- Minimal risiko: vi fjerner kun en tekstindikator, ingen endring i logikk for hva som regnes som pakket.
- Layout kan bli litt “luftigere” (en kolonne mindre). Hvis det ser for tett/feiljustert ut etterpå, justerer vi `gap` i høyre seksjon (f.eks. fra `gap-3` til `gap-4` eller motsatt) – men kun ved behov etter visuell sjekk.

## Ferdigkriterier
- Søk i kodebasen etter “1/1” og “0/1” gir ingen treff i display-rendring.
- Ingen skjerm viser “0/1 / 1/1” ved siden av antall “stk”.
- “Ferdig/Venter”-badge og gjennomstreking fungerer fortsatt som før.

