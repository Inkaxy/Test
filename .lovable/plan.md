
# Loaf and Load – Fase 1 Implementasjonsplan

## Oversikt
Et digitalt pakkesystem for bakerier som erstatter papirark. Fase 1 fokuserer på kjernefunksjonalitet: autentisering, multi-tenant struktur, filimport og produktbasert pakking.

---

## 1. Autentisering og Brukerroller

**Innlogging og registrering:**
- Innloggingsside med e-post/passord
- "Glemt passord" funksjonalitet
- Beskyttede ruter for dashboard

**Tre brukerroller:**
- **Super Admin** – Tilgang til alle bakerier og systeminnstillinger
- **Bakery Admin** – Administrerer eget bakeri (kategorier, brukere, import)
- **Bakery User** – Kun pakking av varer

**Sikkerhet:**
- Row Level Security (RLS) for dataisolering mellom bakerier
- Rollehåndtering i egen tabell (ikke på profil)

---

## 2. Multi-Tenant Bakeristruktur

**Bakeri-administrasjon:**
- Opprett, rediger og deaktiver bakerier
- Unik kort-ID for hver bakeri (for enkle URL-er)
- Bakeri-spesifikke innstillinger

**Kategorisystem:**
- Hver bakeri kan ha flere kategorier (Brød, Småvarer, Konditori)
- Velg pakkemodus per kategori (produktbasert/kundebasert)
- Sorteringsrekkefølge for kategorier

---

## 3. Filimport (Manuell)

**Støttede filformater:**
- **.PRD** – Produkter (varenummer, navn)
- **.CUS** – Kunder (kundenummer, navn, adresse)
- **.OD0** – Ordrer (produkt, kunde, antall, dato)

**Importprosess:**
- Drag & drop opplastingsområde
- Last opp alle tre filer samtidig
- Validering og feilmeldinger
- Duplikatsjekk (samme dato avvises)
- Filnavn-parsing for datoekstraksjon (DD-MM-YYYY.EXT)

---

## 4. Produktbasert Pakking

**Pakkeflyt:**
1. Velg leveringsdato
2. Velg 1-3 produkter å pakke
3. Se liste over alle kunder som trenger produktet
4. Marker hver kunde som "pakket" med ett klikk
5. Registrer avvik hvis nødvendig (manko, skadet osv.)

**Visning:**
- Kundeoversikt med antall og status
- Progresjonsindikator (X av Y pakket)
- Plate/stk-visning for produkter med brett (f.eks. "2 plater + 3 stk")

---

## 5. Admin Dashboard

**Hovedoversikt:**
- Statistikk for dagens pakking
- Rask tilgang til aktive kategorier
- Status per kategori

**Administrasjonssider:**
- **Produkter** – Se og administrer produktliste
- **Kunder** – Se og administrer kundeliste
- **Kategorier** – Opprett og konfigurer kategorier
- **Brukere** – Administrer bakeriets brukere (kun admin)
- **Import** – Filopplasting for ordredata
- **Innstillinger** – Bakeri-innstillinger

---

## 6. Internasjonalisering (i18n)

**Språkstøtte fra start:**
- Norsk (standard)
- Engelsk
- Språkvelger i innstillinger
- Alle tekster i oversettelsesfiler

---

## 7. Responsivt Design

**Optimalisert for:**
- **PC** – Full dashboard med keyboard shortcuts
- **Nettbrett** – Touch-optimalisert med store knapper (10-12 tommer)
- **Mobil** – Grunnleggende navigasjon

---

## Teknisk Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (via Lovable Cloud)
- **State:** TanStack React Query + Zustand for auth
- **Forms:** React Hook Form + Zod
- **i18n:** react-i18next

---

## Dette legger grunnlaget for
- **Fase 2:** Display-system med sanntidsoppdateringer til TV-er
- **Fase 3:** Kundebasert pakking med låsing
- **Fase 4:** Avviksrapporter, e-post, OneDrive-import
- **Fase 5:** Offline-støtte og polering
