

# Plan: Kategori-spesifikke innstillinger for alle display-typer

## Bakgrunn
Du vil kunne tilpasse hvordan varer vises ulikt avhengig av kategori (f.eks. "Brød" vs "Kaker"). Backend-støtten er allerede på plass - det er kun admin-grensesnittet som begrenser kategori-valget til "Felles Display".

## Hva som allerede fungerer
- Databasen har `category_id` i `display_settings`-tabellen
- `useDisplaySettings(bakeryId, categoryId, displayType)` støtter kategori-filter
- Alle tre display-typer sender med `categoryId` når de henter innstillinger

## Endringer

### Fil: `src/pages/DisplaySettings.tsx`

**Endring 1** - Vis kategori-velger for alle display-typer (linje 366):

```tsx
// FRA:
{selectedDisplayType === 'shared' && (

// TIL:
{categories.length > 0 && (
```

**Endring 2** - Tilpass beskrivelsen basert på display-type:

```tsx
<p className="text-xs text-muted-foreground mb-2">
  {selectedDisplayType === 'customer' 
    ? 'Tilpass visning per produktkategori. Produkter arver innstillinger fra sin kategori.'
    : 'Tilpass visning per produktkategori (f.eks. ulik fontstørrelse for brød vs kaker)'
  }
</p>
```

**Endring 3** - Skjul Kiosk-URL-er på "Kunde Display"-fanen (linje 390):

Kiosk-URL-er bruker bakeriets `short_id`, mens Kunde Display bruker unike tokens per kunde. Derfor er de ikke relevante å vise på den fanen.

```tsx
// FRA:
{bakery?.short_id && (

// TIL:
{bakery?.short_id && selectedDisplayType !== 'customer' && (
```

**Endring 4** - Legg til forklarende overskrift for Kiosk-seksjonen:

```tsx
<div className="pt-4 border-t mt-4 space-y-4">
  <div className="mb-2">
    <h4 className="text-sm font-semibold flex items-center gap-2">
      Pakkestasjoner (Kiosk)
    </h4>
    <p className="text-xs text-muted-foreground">
      Touch-optimaliserte lenker for pakkere. Krever ikke innlogging.
    </p>
  </div>
  {/* Eksisterende Kiosk-URLer */}
</div>
```

## Tekniske detaljer

### Hvordan kategori-innstillinger fungerer

Når en display henter innstillinger skjer følgende:

1. Først søkes det etter innstillinger med matchende `(bakery_id, display_type, category_id)`
2. Hvis ingen finnes, returneres standard-innstillinger

For **Felles Display** og **Pakkedisplay**: Kategori-ID kommer fra URL-en, så hver skjerm kan vise innstillinger for én kategori.

For **Kunde Display**: En kunde kan ha produkter fra flere kategorier. For nå brukes innstillingene der `category_id = null` (standard). I fremtiden kan dette utvides til å arve per produkt-linje.

## Resultat

- Kategori-velger synlig for alle tre display-typer
- Kiosk-URL-er skjult på "Kunde Display" (ikke relevant der)
- Tydeligere forklaring på hva Kiosk-lenkene er til

## Filer som endres

1. `src/pages/DisplaySettings.tsx` - Alle endringer over

