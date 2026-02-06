
# Plan: Legg til "Ferdige varer til bunnen" innstilling i Pakkedisplay

## Sammendrag
Legge til en sorteringsinnstilling i Pakkedisplay-seksjonen på Display Settings-siden som lar administratorer velge om kunder som er ferdig pakket skal flyttes til bunnen av listen.

## Nåværende tilstand
- Innstillingen `customer_sort_completed_last` eksisterer allerede i `DisplaySettings` interface
- Den brukes aktivt i `KioskPackingView.tsx` for sortering
- UI-kontrollen finnes for Felles Display (linje 1153-1162), men mangler i Pakkedisplay-seksjonen

## Endringer

### Fil: `src/pages/DisplaySettings.tsx`

Legge til en ny seksjon "Sortering" i tabell-innstillingene for Pakkedisplay etter "Header-innstillinger" seksjonen (rundt linje 1877).

**Ny kode som legges til:**

```text
{/* Sortering */}
<div className="space-y-4 p-4 rounded-lg bg-muted/30">
  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sortering</h5>
  
  <div className="flex items-center justify-between">
    <div>
      <Label>Ferdige varer til bunnen</Label>
      <p className="text-xs text-muted-foreground">Flytt kunder med 100% fremdrift til bunnen av listen</p>
    </div>
    <Switch
      checked={settings.customer_sort_completed_last ?? true}
      onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)}
    />
  </div>
</div>
```

## Plassering i filen
Etter Header-innstillinger (linje ~1877) og før `</div>` som avslutter tabell-innstillingene (linje ~1878).

## Resultat
- Administratorer kan nå aktivere/deaktivere "ferdige varer til bunnen" direkte fra Pakkedisplay-innstillingene
- Innstillingen vil umiddelbart påvirke sorteringen i KioskPackingView
- Standard verdi er `true` (aktivert)

## Filer som endres

| Fil | Endring |
|-----|---------|
| `src/pages/DisplaySettings.tsx` | Legg til Switch for `customer_sort_completed_last` i Pakkedisplay tabell-innstillinger |
