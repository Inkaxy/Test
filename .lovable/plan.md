

# Manuell tur-progresjon med "Start pakking"-knapp

## Oversikt

Nar alle ordrer i en tur er pakket (100%), skal visningen **ikke** automatisk bytte til neste tur. I stedet vises en tydelig skjerm med en knapp for a manuelt starte neste tur. Dette gir pakkerne kontroll over nar de er klare for neste tur.

## Flyt

```text
Tur 1 (pakking pagar) --> Tur 1 (100%) --> "Tur 1 ferdig!" + knapp: "Start pakking av Tur 2" --> [klikk] --> Tur 2 (pakking pagar) --> ... --> "Alt ferdig!"
```

## Hva som skjer ved 100% ferdig

Nar en tur nar 100%, erstattes pakkevisningen med en mellomskjerm:

1. **Animasjon**: Stor hake med tekst "Tur 1 ferdig!" (fade-in)
2. **Statistikk**: Antall pakkede ordrer, avvik, tidsbruk
3. **Knapp**: "Start pakking av Tur 2" (primaerknapp, stor og tydelig)
4. **Nar siste tur er ferdig**: Vis "Alt ferdig for i dag!"-oppsummering med tilbake-knapp

## Komponenter

### `TripCompleteScreen`
Vises nar en tur er 100% pakket og det finnes flere turer.

- Stor hake-ikon med animasjon
- Tekst: "[Turnavn] ferdig!"
- Oppsummering: "X ordrer pakket"
- Knapp: **"Start pakking av [neste turnavn]"**
- Sekundaerknapp: "Tilbake til oversikt"

### `AllTripsCompleteScreen`
Vises nar siste tur er ferdig.

- Stor feiring-ikon
- Tekst: "Alt ferdig for i dag!"
- Total oppsummering pa tvers av alle turer
- Knapp: "Tilbake til kalender"

### `TripIndicator`
Header-element som viser aktiv tur.

- Turnavn (f.eks. "Tur 1 - Morgen")
- Framdrift: "Tur 1 av 3"
- Mulighet for manuell navigasjon mellom turer (dropdown/piler)

## Teknisk implementering

### `useTripProgression` hook

```text
Input:  categoryId, date, trips[]
Output: 
  - activeTripId, activeTrip, nextTrip
  - isComplete (true nar aktiv tur er 100%)
  - allComplete (true nar alle turer er ferdige)
  - progress (prosent for aktiv tur)
  - startNextTrip()   // Manuell - kalles nar bruker klikker knappen
  - goToTrip(id)      // Manuell navigasjon
```

Forskjell fra automatisk versjon: **Ingen timer**. `startNextTrip()` kalles kun nar brukeren klikker knappen.

### Logikk i pakkevisninger

```text
if (allComplete) --> vis AllTripsCompleteScreen
else if (isComplete && nextTrip) --> vis TripCompleteScreen med "Start pakking av [nextTrip.name]"
else --> vis normal pakkevisning filtrert pa activeTripId
```

### Ordrefiltrering

Eksisterende sporringer utvides med valgfri `tripId`-parameter for a kun hente ordrer tilhorende aktiv tur.

## Filer

- **Ny:** `src/hooks/useTripProgression.ts`
- **Ny:** `src/components/packing/TripCompleteScreen.tsx`
- **Ny:** `src/components/packing/AllTripsCompleteScreen.tsx`
- **Ny:** `src/components/packing/TripIndicator.tsx`
- **Endres:** `src/pages/packing/ProductPackingView.tsx`
- **Endres:** `src/pages/packing/CustomerPackingView.tsx`
- **Endres:** `src/pages/packing/KioskPackingView.tsx`
- **Endres:** `src/pages/packing/ProductKioskPackingView.tsx`
- **Endres:** Ordresporringer (tripId-filter)

Dette implementeres sammen med resten av tur-funksjonaliteten (database, CRUD, OneDrive-kobling).

