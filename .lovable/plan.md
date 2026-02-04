
# Plan: Statusbar skal alltid vise fremdrift for alle ordrer

## Problem
Statusbaren og progresjonsvisningen bytter mellom å vise fremdrift for kun de valgte produktene vs. alle produkter avhengig av om pakkeren har valgt spesifikke produkter. Brukeren ønsker at statusbaren **alltid skal vise prosent av ALLE varene** kunden skal ha, uavhengig av hva som vises på skjermen.

## Løsning
Endre `CustomerDisplay.tsx` til å alltid bruke `allProgress` (fremdrift for alle ordrer) i stedet for `displayProgress` (som kan være basert på kun de valgte produktene).

## Teknisk endring

### CustomerDisplay.tsx
1. **Progresjonsbar**: Endre fra `displayProgress` til `allProgress` 
2. **Status-tekst**: Endre `getStatusInfo()` til å alltid bruke `allProgress` for statusberegning

### Før (linje 139-140):
```typescript
// Use overall progress when no selection, otherwise use selected progress
const displayProgress = selection?.productIds?.length ? progress : allProgress;
```

### Etter:
```typescript
// Always use overall progress for status bar (all products customer should receive)
const displayProgress = allProgress;
```

### Endring i getStatusInfo():
```typescript
// Always use overall status regardless of selection
if (allTotalCount === 0) return { text: 'Ingen ordrer', ... };
if (allProgress === 100) return { text: 'Ferdig', ... };
if (allProgress > 0) return { text: 'Pågående', ... };
return { text: 'Venter', ... };
```

## Oppsummering
Én fil endres: `src/pages/display/CustomerDisplay.tsx`

Statusbaren og progresjonsvisningen vil alltid reflektere den totale fremdriften for alle produkter kunden skal ha, selv om skjermen kun viser et utvalg av produkter som pakkes akkurat nå.
