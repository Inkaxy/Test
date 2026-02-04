
# Plan: Planlagt OneDrive-synkronisering per kategori

## Oversikt
Implementere planlagt synkronisering fra OneDrive med smart filtrering:
- Synkroniser kun på valgte dager og tidspunkt per kategori
- Hopp over datoer som allerede er importert (basert på `import_batches`)
- Ignorer filer eldre enn "Automatisk sletting"-innstillingen (f.eks. 7 dager)
- **NY:** Valgfritt slette filer fra OneDrive etter vellykket import

## Tekniske endringer

### 1. Database-migrasjon

Legge til nye kolonner i `category_onedrive_config`:

```sql
ALTER TABLE public.category_onedrive_config
ADD COLUMN sync_enabled boolean DEFAULT false,
ADD COLUMN sync_time time DEFAULT '05:00',
ADD COLUMN sync_days text[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],
ADD COLUMN delete_after_import boolean DEFAULT false;
```

| Kolonne | Type | Standard | Beskrivelse |
|---------|------|----------|-------------|
| `sync_enabled` | boolean | false | Om planlagt synk er aktivert |
| `sync_time` | time | 05:00 | Klokkeslett for synkronisering |
| `sync_days` | text[] | [man-fre] | Hvilke dager synk skal kjøre |
| `delete_after_import` | boolean | false | Slett filer fra OneDrive etter vellykket import |

### 2. Oppdatere OneDriveConfigDialog

Utvide dialogen med innstillinger for planlagt synkronisering:

```
+-------------------------------------------------------+
| OneDrive-konfigurasjon                                |
| Koble "Brød" til en OneDrive-mappe                    |
+-------------------------------------------------------+
| Status               [Konfigurert]                    |
| Siste synk           02. feb 2026 05:00               |
|                                                       |
| OneDrive-mappe URL                                    |
| [https://onedrive.live.com/...              ]         |
|                                                       |
| ---------------------------------------------------- |
| PLANLAGT SYNKRONISERING                               |
|                                                       |
| [X] Aktiver planlagt synkronisering                  |
|                                                       |
| Synkroniser kl.  [05:00]                             |
|                                                       |
| Ukedager:                                             |
| [X] Man [X] Tir [X] Ons [X] Tor [X] Fre [ ] Lør [ ] Søn |
|                                                       |
| ---------------------------------------------------- |
| ETTER IMPORT                                          |
|                                                       |
| [X] Slett filer fra OneDrive etter vellykket import  |
|     ⚠️ Filer slettes permanent fra OneDrive-mappen    |
|                                                       |
| ---------------------------------------------------- |
| (i) Filer som allerede er importert hoppes over       |
| (i) Filer eldre enn 7 dager ignoreres                 |
|     (basert på "Automatisk sletting"-innstillingen)   |
|                                                       |
| ---------------------------------------------------- |
| [Fjern kobling]       [Synk nå]   [Avbryt]   [Lagre] |
+-------------------------------------------------------+
```

**Nye komponenter:**
- Switch for aktivering/deaktivering av planlagt synk
- Time-input (HH:MM format)
- Checkbox-gruppe for ukedager (man-søn)
- Switch for "Slett filer etter import" med advarsel
- "Synkroniser nå"-knapp for manuell trigger
- Info-tekst om filterregler

### 3. Oppdatere useOneDriveConfig hook

Utvide interface og mutation:

```typescript
export interface OneDriveConfig {
  id: string
  bakery_id: string
  category_id: string
  onedrive_folder_url: string | null
  onedrive_folder_id: string | null
  last_sync_at: string | null
  sync_status: string
  sync_error: string | null
  // Nye felt:
  sync_enabled: boolean
  sync_time: string | null  // "05:00" format
  sync_days: string[] | null  // ["monday", "tuesday", ...]
  delete_after_import: boolean
  created_at: string
  updated_at: string
}
```

Utvide `useUpsertOneDriveConfig` mutation:
```typescript
mutationFn: async ({ 
  categoryId, 
  onedriveFolderUrl,
  syncEnabled,
  syncTime,
  syncDays,
  deleteAfterImport
}: { 
  categoryId: string
  onedriveFolderUrl: string
  syncEnabled?: boolean
  syncTime?: string
  syncDays?: string[]
  deleteAfterImport?: boolean
}) => { ... }
```

### 4. Oppdatere sync-onedrive Edge Function

Utvide logikken for å:
1. Hente bakeriets `auto_delete_days` innstilling
2. Hente alle eksisterende `import_batches` for kategorien
3. Filtrere filer basert på:
   - Dato ikke allerede importert (sjekk `import_batches`)
   - Dato ikke eldre enn `auto_delete_days`
4. Etter vellykket import: Slett filer hvis `delete_after_import` er aktivert

```typescript
// Pseudokode for synkronisering med sletting
for (const file of filesToProcess) {
  try {
    // Importer filen
    await importFile(file)
    
    // Slett fra OneDrive hvis innstillingen er aktivert
    if (config.delete_after_import) {
      await deleteFileFromOneDrive(file.id)
      console.log(`Slettet ${file.name} fra OneDrive etter vellykket import`)
    }
  } catch (error) {
    // Ved feil: IKKE slett filen, logg feilen
    console.error(`Feil ved import av ${file.name}:`, error)
  }
}
```

### 5. Smart filter-logikk (uendret)

```text
+-------------------------------------------+
|   Fil i OneDrive-mappe: "03.02.2026.od0" |
+-------------------------------------------+
              |
              v
+-------------------------------------------+
| Ekstraher dato fra filnavn: 2026-02-03   |
+-------------------------------------------+
              |
              v
+-------------------------------------------+
| Sjekk 1: Er datoen allerede importert?   |
| (import_batches med samme dato+kategori) |
+-------------------------------------------+
              |
    +----Ja---+--Nei---+
    |                   |
    v                   v
+--------+    +-------------------------------------------+
| HOPP   |    | Sjekk 2: Er datoen eldre enn N dager?    |
| OVER   |    | (basert på auto_delete_days)             |
+--------+    +-------------------------------------------+
                        |
              +----Ja---+--Nei---+
              |                   |
              v                   v
          +--------+    +-------------------+
          | HOPP   |    | IMPORTER FILEN   |
          | OVER   |    +-------------------+
          +--------+            |
                                v
                    +-------------------------+
                    | Vellykket import?       |
                    +-------------------------+
                              |
                    +----Ja---+--Nei---+
                    |                   |
                    v                   v
          +-------------------+    +--------+
          | delete_after_     |    | LOGG   |
          | import = true?    |    | FEIL   |
          +-------------------+    +--------+
                    |
          +----Ja---+--Nei---+
          |                   |
          v                   v
    +-----------+       +-----------+
    | SLETT FIL |       | BEHOLD    |
    | FRA       |       | FIL I     |
    | ONEDRIVE  |       | ONEDRIVE  |
    +-----------+       +-----------+
```

### 6. Opprette sync-onedrive-cron Edge Function

Ny edge function som kjøres av pg_cron for å sjekke hvilke kategorier som skal synkroniseres.

### 7. Cron-jobb oppsett

SQL for å sette opp pg_cron (kjøres hvert 15. minutt).

## Filer som endres/opprettes

| Fil | Endring |
|-----|---------|
| Database-migrasjon | Nye kolonner inkl. `delete_after_import` |
| `src/hooks/useOneDriveConfig.ts` | Utvide interface og mutation med nye felt |
| `src/components/categories/OneDriveConfigDialog.tsx` | Legge til UI for planlagt synk og sletting |
| `supabase/functions/sync-onedrive/index.ts` | Legge til filterlogikk og slette-logikk |
| `supabase/functions/sync-onedrive-cron/index.ts` | Ny edge function for cron-trigger |
| `supabase/config.toml` | Registrere ny edge function |

## Sikkerhetsaspekter for sletting

- Sletting skjer KUN etter vellykket import
- Ved feil under import beholdes filen i OneDrive
- Innstillingen er AV som standard
- Tydelig advarsel i UI om at sletting er permanent
- Logg alle slettinger for sporbarhet

## Begrensninger

Full automatisk OneDrive-synkronisering krever Microsoft Graph API-integrasjon med OAuth. Denne planen legger grunnlaget for:
- Lagring av synkroniseringsinnstillinger per kategori
- Cron-infrastruktur for planlagt kjøring
- Smart filterlogikk for å unngå duplikater og gamle filer
- Slette-logikk etter vellykket import

Faktisk nedlasting og sletting av filer fra OneDrive vil kreve:
1. Azure AD app-registrering
2. OAuth-flyt for brukersamtykke
3. Microsoft Graph API tokens

Inntil det er konfigurert, vil "Synkroniser nå"-knappen vise en melding om at manuell opplasting må brukes.
