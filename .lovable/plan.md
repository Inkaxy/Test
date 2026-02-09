
# Microsoft Graph API-integrasjon for OneDrive Automatisk Import

## Oversikt
Implementer fullstendig Microsoft Graph API-integrasjon for å automatisere henting, parsing og import av `.PRD`, `.CUS` og `.OD0`-filer fra OneDrive. Systemet bruker Azure AD-autentisering og fungerer for flere bakerier.

---

## Fase 1: Lagre Azure-hemmeligheter

### Hemmeligheter som må lagres
Tre nye hemmeligheter i Lovable Cloud:
1. **AZURE_CLIENT_ID** - Application (client) ID fra Azure Portal
2. **AZURE_TENANT_ID** - Directory (tenant) ID fra Azure Portal
3. **AZURE_CLIENT_SECRET** - Client Secret Value fra Azure Portal

---

## Fase 2: Reskriv `sync-onedrive` Edge Function

### 2.1 Azure AD OAuth2-autentisering
```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Edge Function  │────▶│  Azure AD Token EP   │────▶│  Access Token   │
│  (sync-onedrive)│     │  /oauth2/v2.0/token  │     │  (Graph API)    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

**Token-endepunkt:**
```
POST https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token
```

**Request body:**
- `client_id`: AZURE_CLIENT_ID
- `client_secret`: AZURE_CLIENT_SECRET
- `scope`: `https://graph.microsoft.com/.default`
- `grant_type`: `client_credentials`

### 2.2 OneDrive URL-parsing
Konverter OneDrive delingslenker til Graph API-kompatible identifikatorer:
- **Input**: `https://1drv.ms/f/...` eller `https://onedrive.live.com/...`
- **Output**: Drive ID + Item ID for Graph API-kall

### 2.3 Filhenting via Microsoft Graph API
**Hent filer i mappe:**
```
GET https://graph.microsoft.com/v1.0/shares/{shareId}/driveItem/children
```

**Last ned filinnhold:**
```
GET https://graph.microsoft.com/v1.0/shares/{shareId}/driveItem/children/{itemId}/content
```

### 2.4 Filparsing
Gjenbruk eksisterende parsing-logikk fra `src/lib/fileParser.ts`:
- `parsePrdFile()` → Produkter (.PRD)
- `parseCusFile()` → Kunder (.CUS)
- `parseOd0File()` → Ordrer (.OD0)

### 2.5 Duplikat-filtrering
- Les `import_batches` for kombinasjon av bakery + kategori
- Ignorer filer der `delivery_date` allerede er importert
- Respekter `auto_delete_days` fra bakery-innstillinger

### 2.6 Database-import
**Rekkefølge:**
1. Opprett/oppdater produkter
2. Opprett/oppdater kunder
3. Opprett ordrer + packing_status
4. Opprett import_batch-record

### 2.7 Fil-sletting (valgfritt)
Hvis `delete_after_import = true`:
```
DELETE https://graph.microsoft.com/v1.0/shares/{shareId}/driveItem/children/{itemId}
```

---

## Fase 3: Oppdater Synk-status

| Status | Beskrivelse |
|--------|-------------|
| `syncing` | Synkronisering pågår |
| `completed` | Vellykket synkronisering |
| `error` | Feil oppstod (detaljer i `sync_error`) |
| `configured` | Konfigurert, venter på neste synk |

---

## Fase 4: Feilhåndtering

### Feiltyper og meldinger
| Feil | Melding |
|------|---------|
| Token-feil | "Azure AD-autentisering feilet. Kontroller Client ID og Secret." |
| Mappe-tilgang | "Kunne ikke få tilgang til OneDrive-mappen. Sjekk delingslenken." |
| Parsing-feil | "Feil ved parsing av fil: {filnavn}" |
| Import-feil | "Feil ved import av data: {detaljer}" |

---

## Teknisk Arkitektur

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           AUTOMATISK FLYT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐      │
│  │ Cron Job     │───▶│ sync-onedrive │───▶│ Microsoft Graph API  │      │
│  │ (hvert 15m)  │    │ -cron         │    └──────────────────────┘      │
│  └──────────────┘    └───────────────┘             │                    │
│                              │                      ▼                    │
│                              │            ┌──────────────────────┐      │
│                              │            │ OneDrive Folder      │      │
│                              │            │ ├── products.PRD     │      │
│                              │            │ ├── customers.CUS    │      │
│                              │            │ └── 2025-02-10.OD0   │      │
│                              │            └──────────────────────┘      │
│                              │                      │                    │
│                              ▼                      ▼                    │
│                     ┌───────────────┐    ┌──────────────────────┐      │
│                     │ sync-onedrive │◀───│ Download + Parse     │      │
│                     │ (main func)   │    └──────────────────────┘      │
│                     └───────────────┘                                   │
│                              │                                          │
│                              ▼                                          │
│                     ┌───────────────────────────────────────┐          │
│                     │           Supabase Database            │          │
│                     │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │          │
│                     │  │products │ │customers│ │ orders  │  │          │
│                     │  └─────────┘ └─────────┘ └─────────┘  │          │
│                     └───────────────────────────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fil-endringer

### Nye/Oppdaterte filer:

| Fil | Endring |
|-----|---------|
| `supabase/functions/sync-onedrive/index.ts` | Full reskriving med Graph API |

---

## Sikkerhet

- **Hemmeligheter**: Azure-legitimasjon lagres som Lovable Cloud-hemmeligheter
- **Autentisering**: Cron bruker CRON_SECRET; manuelle kall krever JWT
- **RLS**: Eksisterende policyer sikrer data-isolasjon mellom bakerier
- **Multitenant**: Azure AD multitenant-oppsett støtter flere organisasjoner

---

## Implementeringssteg

1. Lagre tre Azure-hemmeligheter
2. Reskriv `sync-onedrive` edge function med Microsoft Graph API
3. Test Azure-autentisering
4. Test filhenting fra OneDrive
5. Test parsing og database-import
6. Verifiser duplikat-filtrering
7. Test valgfri fil-sletting
8. Bekreft cron-triggering fungerer
