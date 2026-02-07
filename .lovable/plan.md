
# Grundig Systemgjennomgang - Loaf & Load

## Sammendrag av Funn

Etter en detaljert analyse av kodebasen, database-strukturen, sikkerhetspolicyer og arkitektur, har jeg identifisert flere områder som bør forbedres. Funnene er kategorisert etter prioritet.

---

## Kritiske Sikkerhetsproblemer (Prioritet 1)

### 1. Offentlig Eksponering av Pakkestatus
**Problem:** `packing_status`-tabellen (1 506 poster) er offentlig lesbar. Konkurrenter kan overvåke produksjonseffektivitet og identifisere avviksmønstre.

**Løsning:**
- Begrens lesetilgang til autentiserte brukere
- Behold offentlig skrivetilgang for kiosk-operasjoner, men valider bakeri-ID via database-funksjon

### 2. Kunde Display-Tokens Eksponert
**Problem:** `customers`-tabellen eksponerer `display_token` UUIDs offentlig. Disse fungerer som autentiserings-credentials men kan leses av hvem som helst.

**Løsning:**
- Fjern `display_token` fra offentlige SELECT-policyer
- Opprett en dedikert edge function for token-validering som returnerer kun nødvendig data

### 3. Bakeri-Innstillinger Eksponert
**Problem:** RLS-policyen "Public can view bakeries by short_id" returnerer alle kolonner, inkludert `settings` JSON-feltet med e-postadresser og konfigurasjonsdetaljer.

**Løsning:**
- Opprett en VIEW `bakeries_public` med kun `id`, `name`, `short_id`, `is_active`
- Oppdater kiosk-queries til å bruke denne viewen

### 4. Edge Functions Mangler Autentisering
**Problem:** 
- `sync-onedrive`: Har "automated" bypass som omgår auth
- `sync-onedrive-cron`: Ingen autentisering
- `send-packing-report`: Aksepterer vilkårlig `bakery_id`

**Løsning:**
- Fjern "automated" bypass og krev alltid JWT
- Legg til CRON_SECRET validering for cron-funksjoner
- Valider at bruker har tilgang til aktuelt bakeri

### 5. Leaked Password Protection Deaktivert
**Problem:** Supabase Leaked Password Protection er slått av.

**Løsning:**
- Aktiver via backend-konfigurasjon for å beskytte mot kjente lekkede passord

---

## Moderate Forbedringer (Prioritet 2)

### 6. Database-Funksjoner med Privilege Escalation Risiko
**Problem:** `setup_bakery_for_new_user()` validerer ikke at `_user_id` matcher `auth.uid()`. En bruker kan potensielt opprette bakerier for andre brukere.

**Løsning:**
```sql
-- Legg til validering i funksjonen:
IF _user_id != auth.uid() THEN
  RAISE EXCEPTION 'Cannot setup bakery for another user';
END IF;
```

### 7. Console.log Statements i Produksjon
**Problem:** 125 `console.log/warn/error` statements i koden, spesielt i `fileParser.ts` (14 stk) som logger sensitiv parsing-informasjon.

**Løsning:**
- Fjern eller erstatt med conditional logging (kun i development)
- Implementer et strukturert logging-system

### 8. OneDrive-Integrasjon er Placeholder
**Problem:** `sync-onedrive` edge function inneholder kun placeholder-kode og returnerer alltid "OneDrive-synkronisering krever Microsoft Graph API-integrasjon".

**Løsning:**
- Enten implementer full Microsoft Graph API-integrasjon
- Eller fjern OneDrive-UI fra kategorier-siden for å unngå forvirring

---

## Arkitektur-Forbedringer (Prioritet 3)

### 9. Duplisert Kode for Pakkeoperasjoner
**Problem:** Både `useOrders.ts` og `KioskPackingView.tsx` inneholder nesten identiske mutasjoner for `markAsPacked`, `undoPacking`, `reportDeviation`.

**Løsning:**
- Konsolider til én delt hook `usePackingMutations` som støtter både autentisert og kiosk-modus
- Reduserer vedlikeholdskostnad og risiko for inkonsistens

### 10. DisplaySettings Interface er For Stort
**Problem:** `DisplaySettings` interface i `useDisplayOrders.ts` har 127+ egenskaper, noe som gjør det vanskelig å vedlikeholde.

**Løsning:**
- Splitt opp i logiske sub-interfaces:
  - `HeaderSettings`
  - `CardSettings`
  - `TableSettings`
  - `AnimationSettings`
  - `LockSettings`
  - etc.

### 11. Manglende Error Boundaries
**Problem:** Appen mangler React Error Boundaries, så feil i én komponent kan krasje hele appen.

**Løsning:**
- Implementer en global ErrorBoundary-komponent
- Legg til spesifikke error boundaries rundt kritiske seksjoner (display, packing)

### 12. Ingen Retry-Logikk for Kritiske Operasjoner
**Problem:** Pakkestatus-oppdateringer har ingen retry-logikk ved nettverksfeil.

**Løsning:**
- Konfigurer React Query med retry for viktige mutasjoner
- Implementer offline-queue for kritiske operasjoner

---

## Ytelses-Optimaliseringer (Prioritet 4)

### 13. Supabase 1000-rad Grense
**Problem:** Standard Supabase-grense er 1000 rader per spørring. Store bakerier kan treffe denne grensen uten å vite det.

**Løsning:**
- Legg til eksplisitt `.limit()` i queries
- Implementer paginering for store datasett
- Legg til overvåking/varsling når grensen nærmer seg

### 14. Realtime Channel Lekkasje
**Problem:** I `useOrders.ts` opprettes nye broadcast-kanaler for hver mutasjon uten å fjerne dem etterpå.

**Løsning:**
```typescript
// Etter sending, fjern kanalen:
setTimeout(() => {
  supabase.removeChannel(generalChannel);
}, 1000);
```

### 15. Store Bundler Imports
**Problem:** Flere store biblioteker (framer-motion, recharts) lastes globalt selv om de kun brukes på noen sider.

**Løsning:**
- Lazy-load disse komponentene med `React.lazy()` og `Suspense`

---

## UX-Forbedringer (Prioritet 5)

### 16. Manglende Keyboard Navigation i Kiosk
**Problem:** Kiosk-modus mangler tastaturnavigasjon for effektiv pakking.

**Løsning:**
- Legg til Enter/Space for å pakke
- Piltaster for navigasjon mellom kunder/produkter
- Tab-navigasjon mellom kort

### 17. Ingen Offline-Indikator
**Problem:** Brukere får ikke beskjed når de mister nettverkstilkobling under pakking.

**Løsning:**
- Legg til offline-banner med retry-knapp
- Kølegg handlinger og synkroniser når tilkoblingen gjenopprettes

### 18. Manglende Data Validering på Import
**Problem:** Import-funksjonen validerer ikke data grundig (f.eks. dupliserte kundenumre, ugyldige tegn).

**Løsning:**
- Legg til pre-import validering
- Vis detaljert feilrapport før bruker bekrefter import

---

## Teknisk Gjeld

### 19. Inkonsistent i18n
**Problem:** Noen tekster er hardkodet på norsk (f.eks. i `Settings.tsx`), andre bruker i18n.

**Løsning:**
- Gå gjennom alle komponenter og migrer hardkodede strenger til i18n

### 20. Manglende TypeScript Strict Mode
**Problem:** Noen areas bruker `any` typer eller mangler typer.

**Løsning:**
- Aktiver strict mode i tsconfig
- Fiks type-feil gradvis

---

## Anbefalt Implementeringsrekkefølge

```text
Fase 1: Sikkerhet (1-2 uker)
├── Fix RLS-policyer for packing_status
├── Skjul display_token fra offentlige queries
├── Sikre edge functions med auth/secrets
├── Aktiver leaked password protection
└── Fix database-funksjon privilege checks

Fase 2: Stabilitet (1 uke)
├── Implementer Error Boundaries
├── Legg til retry-logikk
├── Fjern/kondisjonaliser console.logs
└── Fix realtime channel lekkasje

Fase 3: Arkitektur (2-3 uker)
├── Konsolider pakke-mutations
├── Splitt DisplaySettings interface
├── Lazy-load store komponenter
└── Implementer paginering

Fase 4: UX & Kvalitet (løpende)
├── Keyboard navigation
├── Offline-støtte
├── Import-validering
├── i18n-konsistens
└── TypeScript strict mode
```

---

## Oppsummering

Systemet er generelt godt bygget med solid arkitektur, men har noen kritiske sikkerhetshull som bør adresseres umiddelbart. De viktigste funnene er:

1. **5 kritiske sikkerhetsproblemer** relatert til offentlig data-eksponering og manglende auth på edge functions
2. **3 moderate forbedringer** inkludert privilege escalation risiko og produksjonslogger
3. **7 arkitektur/ytelse forbedringer** for langsiktig vedlikeholdbarhet
4. **5 UX-forbedringer** for bedre brukeropplevelse

Anbefaler å starte med sikkerhetsforbedringene før noe annet.
