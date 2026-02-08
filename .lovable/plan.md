# Teknisk Forbedringsplan

## Status Oversikt

| Fase | Beskrivelse | Status |
|------|-------------|--------|
| 1 | Sikkerhet | ✅ Fullført |
| 2 | Stabilitet | ✅ Fullført |
| 3 | Arkitektur | ✅ Fullført |
| 4 | UX - Tastaturnavigasjon | ✅ Fullført |
| 5 | UX - Offline-støtte | ✅ Fullført |

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

## Fase 4: UX Forbedringer - FULLFØRT ✅

### Del 1: Tastaturnavigasjon ✅

**Implementert i:** `src/hooks/useKeyboardNavigation.ts`

En gjenbrukbar hook for tastaturnavigasjon i pakkevisninger med følgende funksjonalitet:

**Arkitektur:**
- Sentralisert navigasjonslogikk i en generisk hook
- Støtter dynamisk antall elementer
- Automatisk scroll til fokusert element
- Grid-navigasjon med innpakking (wrap-around)

**API:**
```typescript
const { focusedIndex, setFocusedIndex, isFocused, getItemProps, resetFocus } = 
  useKeyboardNavigation({
    itemCount: orders.length,
    onSelect: (index) => markAsPacked(index),
    onDeviation: (index) => openDeviationDialog(index),
    onUndo: (index) => undoPacking(index),
    onEscape: () => navigate(-1),
    enabled: true,
    wrapAround: true,
  });
```

**Tastatursnarvei:**
| Tast | Handling |
|------|----------|
| ↑ | Gå til forrige element (eller siste hvis wrap-around) |
| ↓ | Gå til neste element (eller første hvis wrap-around) |
| ← | Gå til forrige (single-column mode) |
| → | Gå til neste (single-column mode) |
| Enter / Space | Marker valgt element som pakket |
| D | Rapporter avvik for valgt element |
| U | Angre pakking for valgt element |
| Home | Hopp til første element |
| End | Hopp til siste element |
| Esc | Gå tilbake til forrige side |

**Visuell Feedback:**
- Fokusert element har `ring-2 ring-primary` ramme (CSS class fra tailwind)
- `data-focused` attributt for styling
- Automatisk smooth scroll til fokusert element
- Komponent referanser lagres for rask tilgang

**Integrert i:**
- ✅ `CustomerPackingView.tsx` - Full tastaturstøtte for ordreliste
- ✅ `ProductPackingView.tsx` - Full tastaturstøtte for ordreliste i produktdetalj
- ✅ `KioskPackingView.tsx` - Full tastaturstøtte for kundevalg og ordreliste

**Implementasjonsdetaljer:**
- Hook returnerer `getItemProps()` for å spre på navigerbare elementer
- `itemRefs` brukes for automatisk scroll-in-view
- Event listener på `window` for global tastaturbehandling
- Ignorerer input fra `INPUT`, `TEXTAREA` og content-editable elementer
- Fokusindeks resettes automatisk når item count endres

---

### Del 2: Offline-støtte for Kiosk ✅

**Implementert med:**
1. **PWA / Service Worker** (`vite-plugin-pwa`)
   - Automatisk caching av statiske ressurser (JS, CSS, HTML, bilder)
   - Runtime caching av Supabase API-kall (NetworkFirst, 5 min cache)
   - App-manifest for installasjon på enheter
   
2. **Lokal operasjonskø** (`src/hooks/useOfflineQueue.ts`)
   - Buffer pakke-operasjoner (mark_packed, report_deviation, undo_packing) i localStorage
   - Automatisk synkronisering når enheten kommer tilbake online
   - Retry-mekanisme med maks 3 forsøk
   - Operasjoner sorteres etter tidsstempel (eldste først)

3. **Visuell feedback** (`src/components/packing/OfflineIndicator.tsx`)
   - Viser frakoblet-status med antall ventende operasjoner
   - Synkroniseringsindikator
   - Manuell "Synk nå"-knapp
   - Feilmeldinger ved synkroniseringsproblemer

**Integrert i:**
- ✅ `KioskPackingView.tsx` - Full offline-støtte med lokal kø

**PWA Manifest:**
- App-navn: "Loaf & Load - Pakkesystem"
- Tema-farge: #c59b6d (Bakery Gold)
- Standalone display-modus
- Installasjon på hjemskjerm

---

## Teknisk Notat: Leaked Password Protection

Denne funksjonen må aktiveres manuelt i Lovable Cloud dashboard:
1. Naviger til **Users** i Cloud View
2. Klikk på **tannhjul-ikonet (⚙️)** for Auth Settings
3. Finn **Email settings** seksjonen
4. Aktiver **Password HIBP Check**

*Merk: Funksjonen kan ha ulik tilgjengelighet basert på prosjektets Cloud-versjon.*
