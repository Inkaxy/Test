# Teknisk Forbedringsplan

## Status Oversikt

| Fase | Beskrivelse | Status |
|------|-------------|--------|
| 1 | Sikkerhet | ✅ Fullført |
| 2 | Stabilitet | ✅ Fullført |
| 3 | Arkitektur | ✅ Fullført |
| 4 | UX (fremtidig) | ⏳ Planlagt |

---

## Fase 3: Arkitektur - FULLFØRT ✅

### Del 1: Konsolidert Pakke-Mutations

**Ny fil opprettet:** `src/hooks/usePackingMutations.ts`

En unified hook som erstatter duplisert pakke-logikk:
- Støtter **Standard modus** (med auth + full optimistic updates + broadcast)
- Støtter **Kiosk modus** (uten auth + forenklet optimistic updates)

**API:**
```typescript
const { markAsPacked, batchMarkAsPacked, reportDeviation, undoPacking, isAnyPending } = 
  usePackingMutations({
    bakeryId,
    deliveryDate,
    categoryId,
    isKiosk: true/false,
    sortOptions,
  });
```

**Migrerte views:**
- ✅ `KioskPackingView.tsx` - Fjernet inline mutations, bruker `usePackingMutations({ isKiosk: true })`
- ✅ `ProductKioskPackingView.tsx` - Fjernet inline mutations, bruker `usePackingMutations({ isKiosk: true })`
- ✅ `CustomerPackingView.tsx` - Migrert til ny hook
- ✅ `ProductPackingView.tsx` - Migrert til ny hook
- ✅ `CustomerPacking.tsx` - Migrert til ny hook

---

### Del 2: Modularisert DisplaySettings

**Ny filstruktur opprettet:** `src/types/display/`

| Fil | Innhold |
|-----|---------|
| `index.ts` | Re-eksporterer alt, komponerer `DisplaySettings` |
| `header.ts` | `HeaderSettings` - header-relaterte innstillinger |
| `stats.ts` | `StatsSettings` - statistikk og fremdriftsindikatorer |
| `card.ts` | `CardSettings` - kundekort-innstillinger |
| `appearance.ts` | `AppearanceSettings`, `ThemePreset` - farger og tema |
| `layout.ts` | `LayoutSettings` - kolonne, gap, padding |
| `animation.ts` | `AnimationSettings` - animasjoner og overganger |
| `realtime.ts` | `RealtimeSettings` - sanntid og tilkoblingsstatus |
| `table.ts` | `TableSettings` - alle tabell-relaterte innstillinger |
| `productCard.ts` | `ProductCardSettings` - produktkort i pakkevisning |
| `buttons.ts` | `PackButtonSettings`, `BackButtonSettings`, `RefreshButtonSettings` |
| `lock.ts` | `LockSettings` - låsefunksjon |
| `sorting.ts` | `SortingSettings`, `CustomerSortMode`, `CustomerSortDirection` |
| `product.ts` | `ProductSettings` - produktbasert pakking |
| `general.ts` | `GeneralSettings`, `LegacySettings` |

**Bakoverkompatibilitet:**
- `useDisplayOrders.ts` re-eksporterer alle typer
- Eksisterende imports fungerer uendret
- `getDefaultDisplaySettings()` returnerer de nye defaults

---

## Fase 4: UX (Fremtidige forbedringer)

Planlagte oppgaver:
1. **Tastaturnavigasjon** - Piltaster for å navigere mellom kunder/produkter
2. **Offline-støtte for kiosk** - Service Worker + lokal kø for operasjoner
3. **Leaky Password Protection** - Aktivere i Cloud dashboard

---

## Teknisk Notat: Leaked Password Protection

Denne funksjonen må aktiveres manuelt i Lovable Cloud dashboard:
1. Naviger til **Users** i Cloud View
2. Klikk på **tannhjul-ikonet (⚙️)** for Auth Settings
3. Finn **Email settings** seksjonen
4. Aktiver **Password HIBP Check**

*Merk: Funksjonen kan ha ulik tilgjengelighet basert på prosjektets Cloud-versjon.*
