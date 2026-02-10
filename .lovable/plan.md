
# Optimaliser Felles Display for TV -- fjern blinking og ny layout

## Hva endres

Felles Display oppdateres til a matche referansebildet: et rent, tabellbasert kortdesign med kundenavn sentrert i toppen, produktrader i en stram tabell (produktnavn | mengde | statussirkel), og en fargekodet fremdriftslinje i bunnen av hvert kort. Blinkingen fjernes helt.

## Visuell struktur per kundekort

```text
+----------------------------------+
|           Borgheim               |  <-- sentrert, bold
|----------------------------------|
| Kneipp          10stk        (G) |  <-- tabell med rader
| Hvasser       1 kv + 5 stk  (R) |
| Fiberbroed m/froe  20 stk   (R) |
|=================================='
| ================================ |  <-- fremdriftslinje (farge basert pa %)
+----------------------------------+
```

## Teknisk

| Fil | Endring |
|-----|---------|
| `src/pages/display/SharedDisplay.tsx` | **Fjern blinking**: Erstatt `AnimatePresence` + `motion.div` med vanlig `div`. Ingen entre/exit-animasjoner som re-trigges ved data-oppdatering. |
| `src/pages/display/SharedDisplay.tsx` | **Ny kortlayout**: Sentrert kundenavn-header. Produkttabell med 3 kolonner (navn, mengde, statussirkel). Fremdriftslinje langs bunnen av kortet (full bredde, tynn stripe). |
| `src/pages/display/SharedDisplay.tsx` | **Mengdeformat**: Vis mengde som "1 kv + 5 stk" nar `card_show_quantity_as_trays` er aktivert og produktet har `pieces_per_tray`, ellers vis "Xstk". |
| `src/pages/display/SharedDisplay.tsx` | **Kort-stil**: Border rundt hele kortet i stedet for kun venstre kant. Lys bakgrunn fra `card_background_color`. Bunnlinje i `completed_color`/`packing_color`/`pending_color` basert pa fremdrift. |
| `src/types/display/card.ts` | Legg til `card_show_bottom_progress_bar: boolean` (default `true`) for a styre den nye bunnlinjen. |

Ingen nye avhengigheter. Ingen databaseendringer.
