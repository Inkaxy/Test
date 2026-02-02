
# Loaf and Load – Implementasjonsplan

## Oversikt
Et digitalt pakkesystem for bakerier som erstatter papirark. Systemet støtter flere bakerier (multi-tenant), autentisering, filimport og pakking med sanntidsoppdateringer.

---

## ✅ Fase 1: Grunnleggende (FERDIG)

- [x] Autentisering med e-post/passord
- [x] Tre brukerroller: Super Admin, Bakery Admin, Bakery User
- [x] Row Level Security (RLS) for dataisolering
- [x] Multi-tenant bakeristruktur
- [x] Kategorisystem med pakkemodus
- [x] Filimport (.PRD, .CUS, .OD0) med drag-and-drop
- [x] Produktbasert pakking med markering og avviksrapportering
- [x] Admin dashboard med CRUD for produkter, kunder, kategorier
- [x] Internasjonalisering (norsk/engelsk)
- [x] Responsivt design

---

## ✅ Fase 2: Display-system (FERDIG)

- [x] Felles Display (`/display/shared/:bakeryShortId/:categoryId`)
  - Viser alle kunder med pakkestatus
  - Sanntidsoppdatering via Supabase Realtime (broadcast + postgres_changes)
  - Progresjonsbar og klokke
- [x] Kunde Display (`/display/customer/:displayToken`)
  - Dedikert visning for enkeltkunders produkter
  - Animert statusvisning
- [x] Display-innstillinger (/display-settings)
  - Fargepalett (bakgrunn, kort, tekst, statusfarger)
  - Layout (kolonner, fontstørrelser)
  - Visning (klokke, dato, progresjonsbar, animasjoner)
  - Live forhåndsvisning
- [x] Realtime hooks
  - `useRealtimeDisplay` for lytting på broadcast + postgres_changes
  - Broadcast sendes til både generell kanal og kategori-spesifikk kanal
  - Fallback-synkronisering hvert 60. sekund
- [x] Oversettelser (nb.json, en.json) for display-innstillinger

---

## ✅ Fase 3: Kundebasert pakking (FERDIG)

- [x] Kundebasert pakkemodus (alternativ til produktbasert)
- [x] Kundelåsing når pakker velger kunde
- [x] Auto-frigjøring etter 15 minutter (konfigurerbart)
- [x] Pakker-nettbrett interface (/packing/customer)
- [x] Realtime låsevisning med postgres_changes
- [x] Database-funksjoner for acquire/release/extend lock

---

## 🔲 Fase 4: Avansert

- [ ] Avviksrapporter med statistikk
- [ ] Daglig e-postrapport
- [ ] OneDrive auto-import
- [ ] Drag-and-drop sortering av kunder
- [ ] Brukeradministrasjon (invitere til bakeri)

---

## 🔲 Fase 5: Polering

- [ ] Globale maler for super_admin
- [ ] Offline-støtte (Service Worker + IndexedDB)
- [ ] Keyboard shortcuts
- [ ] Testing og optimalisering

---

## Teknisk Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (Lovable Cloud)
- **State:** TanStack React Query + Zustand
- **Realtime:** Supabase Broadcast + postgres_changes
- **Forms:** React Hook Form + Zod
- **i18n:** react-i18next
- **Animasjoner:** Framer Motion
