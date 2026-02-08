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

## Fase 4: UX Forbedringer - DELVIS FULLFØRT ✅

### Del 1: Tastaturnavigasjon ✅

**Ny fil opprettet:** `src/hooks/useKeyboardNavigation.ts`

En gjenbrukbar hook for tastaturnavigasjon i pakkevisninger:

**Støttede tastatursnarveier:**
| Tast | Handling |
|------|----------|
| ↑/↓/←/→ | Naviger mellom ordrer/kunder |
| Enter/Space | Marker valgt ordre som pakket |
| D | Rapporter avvik for valgt ordre |
| U | Angre pakking for valgt ordre |
| Esc | Gå tilbake til forrige visning |
| Home | Gå til første element |
| End | Gå til siste element |

**Integrert i:**
- ✅ `CustomerPackingView.tsx` - Full tastaturstøtte for ordreliste
- ⏳ `ProductPackingView.tsx` - Planlagt
- ⏳ `KioskPackingView.tsx` - Planlagt (hvis ønsket)

**Visuell feedback:**
- Fokusert element vises med `ring-2 ring-primary` ramme
- Automatisk scrolling til fokusert element
- Hint-tekst vises øverst i pakkevisningen

---

### Del 2: Offline-støtte for Kiosk (Planlagt)

Fremtidige oppgaver:
1. **Service Worker** - Cache kritiske ressurser
2. **Lokal operasjonskø** - Buffer pakke-operasjoner når offline
3. **Synkronisering** - Push buffrede operasjoner når tilbake online

---

## Teknisk Notat: Leaked Password Protection

Denne funksjonen må aktiveres manuelt i Lovable Cloud dashboard:
1. Naviger til **Users** i Cloud View
2. Klikk på **tannhjul-ikonet (⚙️)** for Auth Settings
3. Finn **Email settings** seksjonen
4. Aktiver **Password HIBP Check**

*Merk: Funksjonen kan ha ulik tilgjengelighet basert på prosjektets Cloud-versjon.*
