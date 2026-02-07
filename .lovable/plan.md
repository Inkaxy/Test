
# Plan: Enhetslåsing for Kiosk-modus uten innlogging

## Problemstilling
Låsefunksjonaliteten i kiosk-modus fungerer ikke uten innlogging fordi:
1. Database-funksjonene (`acquire_customer_lock`, `release_customer_lock`, `extend_customer_lock`) bruker `auth.uid()` for å identifisere hvem som låser
2. RLS-reglene krever `can_access_bakery()` som også avhenger av autentisering

## Løsning: Enhets-ID-basert låsing for kiosk

Vi implementerer et parallelt låsesystem for kiosk som bruker en unik **enhets-ID** i stedet for bruker-ID. Dette gir:
- Synlig låsing mellom enheter uten pålogging
- Samme visuelle oppførsel (fading, blokkering av låste kunder)
- Automatisk utløp og frigivelse

### Teknisk implementasjon

**1. Ny database-tabell: `kiosk_locks`**
```text
┌──────────────────────────────────────────────────────┐
│                    kiosk_locks                        │
├──────────────────────────────────────────────────────┤
│ id              UUID (PK)                             │
│ customer_id     UUID (FK → customers)                 │
│ bakery_id       UUID (FK → bakeries)                  │
│ delivery_date   DATE                                  │
│ device_id       TEXT (unik ID per enhet/nettleser)    │
│ locked_at       TIMESTAMP                             │
│ expires_at      TIMESTAMP                             │
│ created_at      TIMESTAMP                             │
│ updated_at      TIMESTAMP                             │
└──────────────────────────────────────────────────────┘
```

**2. RLS-regler for offentlig tilgang**
- SELECT: Alle kan se låser for aktive bakerier (via `bakeries.short_id`)
- INSERT/UPDATE/DELETE: Alle kan administrere låser for aktive bakerier

**3. Nye database-funksjoner**
- `acquire_kiosk_lock(_customer_id, _bakery_id, _delivery_date, _device_id, _duration_minutes)` → UUID
- `release_kiosk_lock(_customer_id, _delivery_date, _device_id)` → BOOLEAN
- `extend_kiosk_lock(_customer_id, _delivery_date, _device_id, _extension_minutes)` → BOOLEAN

**4. React-hooks for kiosk-låsing**
Ny fil `src/hooks/useKioskLocks.ts`:
- `useDeviceId()` - Genererer/henter en unik enhets-ID fra localStorage
- `useKioskLocks(deliveryDate, bakeryId)` - Henter aktive låser
- `useRealtimeKioskLocks(deliveryDate, bakeryId)` - Lytter til endringer i sanntid
- `useAcquireKioskLock()` - Låser en kunde for enheten
- `useReleaseKioskLock()` - Frigjør låsen
- `useActiveKioskLock()` - Administrerer auto-forlengelse

**5. Oppdatere KioskPackingView**
- Bruke `useDeviceId()` for å identifisere enheten
- Bruke kiosk-låse-hooks i stedet for bruker-baserte hooks
- Vise "Låst av annen enhet" i stedet for "Låst av [navn]"

### Enhets-ID generering
```text
Enhets-ID genereres ved første besøk og lagres i localStorage:
kiosk-device-id = "kiosk-abc123xyz789"
```

Dette sikrer at:
- Samme nettbrett beholder samme ID mellom økter
- Forskjellige enheter får unike IDer
- Ingen innlogging er nødvendig

### Oppsummering av filer som endres

| Fil | Endring |
|-----|---------|
| Ny migrasjon | Opprett `kiosk_locks` tabell med RLS og funksjoner |
| `src/hooks/useKioskLocks.ts` | Ny fil med alle kiosk-låse-hooks |
| `src/pages/packing/KioskPackingView.tsx` | Bytt til kiosk-låse-hooks |
| `src/pages/packing/ProductKioskPackingView.tsx` | Samme endring (hvis den har kundelåsing) |
