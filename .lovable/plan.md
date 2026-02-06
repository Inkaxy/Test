
# Plan: E-postrapporter for avvik og pakkesesjoner

## Oversikt

Implementere automatisk e-postutsending av avviksrapporter og pakkesammendrag til administrative brukere. Administratorer kan velge frekvens: daglig, ukentlig, månedlig, eller deaktivert.

## Arkitektur

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Innstillinger (Settings.tsx)                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  E-postrapporter                                         │   │
│  │  ○ Av  ○ Daglig  ○ Ukentlig  ○ Månedlig                 │   │
│  │  Mottakere: [admin1@bakeri.no, admin2@bakeri.no]        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  bakeries.settings (JSONB)                       │
│  {                                                               │
│    "email_report_config": {                                      │
│      "enabled": true,                                            │
│      "frequency": "daily" | "weekly" | "monthly",                │
│      "recipients": ["email1@test.no", "email2@test.no"],         │
│      "include_deviations": true,                                 │
│      "include_summary": true,                                    │
│      "last_sent_at": "2026-02-05T08:00:00Z"                     │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│             Edge Function: send-packing-report                   │
│  - Kjøres via cron (daglig kl 06:00)                            │
│  - Henter alle bakerier med aktiv e-postrapport                 │
│  - Sjekker frequency og last_sent_at                            │
│  - Samler avviksdata og pakkestatistikk                         │
│  - Sender e-post via Resend                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     E-postinnhold                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Pakkerapport - Bakeri AS                             │   │
│  │  Periode: 05.02.2026                                     │   │
│  │                                                          │   │
│  │  SAMMENDRAG                                              │   │
│  │  ├── Totalt pakket: 234 ordrer                          │   │
│  │  ├── Avvik: 12 (5.1%)                                   │   │
│  │  └── Fullføringsrate: 100%                              │   │
│  │                                                          │   │
│  │  AVVIK DETALJER                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ Kunde      │ Produkt    │ Type   │ Notat       │    │   │
│  │  │ Kafe Nord  │ Rundstykke │ Manko  │ -3 stk      │    │   │
│  │  │ Restaurant │ Focaccia   │ Skade  │ Brent       │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Implementeringsdetaljer

### Del 1: Utvide BakerySettings interface

**Fil: `src/hooks/useBakerySettings.ts`**

Legg til ny konfigurasjon for e-postrapporter:

```typescript
export type ReportFrequency = 'off' | 'daily' | 'weekly' | 'monthly';

export interface EmailReportConfig {
  enabled: boolean;
  frequency: ReportFrequency;
  recipients: string[];
  include_deviations: boolean;
  include_summary: boolean;
  last_sent_at?: string;
}

export interface BakerySettings {
  // ... eksisterende felt
  email_report_config?: EmailReportConfig;
}
```

### Del 2: UI for e-postinnstillinger

**Ny fil: `src/components/settings/EmailReportSettingsCard.tsx`**

Inneholder:
- Av/På-bryter for e-postrapporter
- RadioGroup for frekvens (Daglig, Ukentlig, Månedlig)
- Input-felt for å legge til mottakere (e-postadresser)
- Liste over nåværende mottakere med slett-knapp
- Avkrysningsbokser for hva som skal inkluderes (avvik, sammendrag)
- "Send testrapport"-knapp

### Del 3: Oppdatere Settings-siden

**Fil: `src/pages/Settings.tsx`**

Importer og legg til `EmailReportSettingsCard` komponenten mellom DeviationSettingsCard og PackingRowStyleSettings.

### Del 4: Edge Function for sending av rapport

**Ny fil: `supabase/functions/send-packing-report/index.ts`**

```typescript
// Pseudokode for edge function
Deno.serve(async (req) => {
  // 1. Hent alle bakerier med email_report_config.enabled = true
  
  // 2. For hver bakeri:
  //    - Sjekk frequency og last_sent_at
  //    - Hvis det er på tide å sende:
  //      a. Hent avviksdata for perioden
  //      b. Hent pakkestatistikk
  //      c. Generer HTML-rapport
  //      d. Send via Resend
  //      e. Oppdater last_sent_at
  
  // 3. Returner status
});
```

**Rapportdata som hentes:**
- Ordrer med `packing_status.status = 'deviation'` for perioden
- Join med `customers` og `products` for navn
- Beregn totalt pakket, avvik-prosent, fullføringsrate

### Del 5: Cron-jobb for daglig kjøring

**Fil: `supabase/config.toml`**

Legg til ny function-konfigurasjon:
```toml
[functions.send-packing-report]
verify_jwt = false
```

**Database cron-jobb** (kjøres via Supabase SQL):
Planlegg kjøring kl 06:00 hver dag som kaller edge function.

### Del 6: Resend API-nøkkel

E-postsending krever Resend API-nøkkel. Brukeren må:
1. Opprette konto på resend.com
2. Verifisere domene
3. Generere API-nøkkel
4. Legge inn nøkkelen som secret: `RESEND_API_KEY`

---

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/hooks/useBakerySettings.ts` | Utvid interface med EmailReportConfig |
| `src/components/settings/EmailReportSettingsCard.tsx` | Ny komponent for UI |
| `src/pages/Settings.tsx` | Importer og bruk EmailReportSettingsCard |
| `supabase/functions/send-packing-report/index.ts` | Ny edge function |
| `supabase/config.toml` | Legg til function-konfigurasjon |

---

## Tekniske detaljer

### E-postmal (HTML)
Rapporten formateres som en profesjonell HTML-e-post med:
- Bakerilogo (hvis tilgjengelig)
- Tydelig overskrift med dato/periode
- Oppsummeringsboks med nøkkeltall
- Tabell over avvik med kunde, produkt, type og notat
- Bunntekst med lenke til systemet

### Frekvenslogikk

| Frekvens | Periode som rapporteres |
|----------|------------------------|
| Daglig | Gårsdagen |
| Ukentlig | Siste 7 dager (sendes mandag) |
| Månedlig | Forrige måned (sendes 1. i måneden) |

### Feilhåndtering
- Hvis e-postsending feiler, logg feilen og prøv igjen ved neste kjøring
- Ikke oppdater `last_sent_at` før sending er bekreftet
- Send feilvarsel til systemadministrator ved gjentatte feil

---

## Brukeropplevelse

1. Administrator går til **Innstillinger**
2. Finner ny seksjon **E-postrapporter**
3. Aktiverer rapportering og velger frekvens
4. Legger til e-postadresser for mottakere
5. Kan sende en testrapport umiddelbart
6. Rapporter sendes automatisk basert på valgt frekvens

---

## Forutsetninger

Før implementering må brukeren:
1. Opprette Resend-konto og verifisere domene
2. Legge inn `RESEND_API_KEY` som secret

Skal jeg starte med denne implementeringen?
