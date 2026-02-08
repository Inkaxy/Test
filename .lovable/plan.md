
# Fase 1: Sikkerhet - Implementeringsplan

## Sammenfatting
Jeg vil implementere de 5 kritiske sikkerhetsforbedringene fra fören godkjente planen. Starter med å sikre Edge Functions og deretter fix RLS-policyer.

---

## Del 1: Edge Functions Sikring

### 1.1 sync-onedrive-cron Function
**Hva:** Legge til CRON_SECRET validering

**Endringer:**
- Legg til CRON_SECRET secret i Lovable Cloud (bruker må angi selv)
- Valider at `X-Cron-Secret` header matcher `CRON_SECRET` fra environment
- Fjern logging av sensitive data
- Returner 401 Unauthorized hvis secret ikke stemmer

**Implementering:**
```typescript
// Sjekk CRON_SECRET header
const cronSecret = req.headers.get('X-Cron-Secret');
const expectedSecret = Deno.env.get('CRON_SECRET');

if (!cronSecret || cronSecret !== expectedSecret) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized - Invalid CRON_SECRET' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### 1.2 sync-onedrive Function
**Hva:** Fjern "automated" bypass og krev alltid JWT-validering

**Endringer:**
- Fjern `automated` parameter som omgår autentisering
- Krev alltid JWT-token via Authorization header
- Valider at bruker har tilgang til bakeri (via `can_access_bakery()`)
- Legge til error handling for uautentisert tilgang

**Implementering:**
```typescript
// Fjern: if (!automated) { ... } else { skip auth }
// Ny logikk: ALLTID validere JWT

const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data, error } = await supabase.auth.getClaims(token);
if (error || !data?.claims) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}

const userId = data.claims.sub;
```

### 1.3 send-packing-report Function
**Hva:** Sikre ved JWT-validering og CRON_SECRET

**Endringer:**
- For manuelle kall: Krev JWT og valider bruker har tilgang til bakeri
- For cron kall: Krev CRON_SECRET header
- Fjern mulighet for å angi vilkårlig `bakery_id` uten validering

**Implementering:**
```typescript
// Sjekk om dette er kron eller manual
const cronSecret = req.headers.get('X-Cron-Secret');

if (cronSecret) {
  // Cron job - valider CRON_SECRET
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  // Prosesser alle bakeri med email report enabled
} else {
  // Manual call - valider JWT
  const authHeader = req.headers.get('Authorization');
  const { data, error } = await supabase.auth.getClaims(token);
  // Valider bruker har tilgang til bakery_id
}
```

---

## Del 2: RLS Policy Forbedringer

### 2.1 packing_status Tabell
**Hva:** Begrens offentlig lesetilgang

**Problem:** `packing_status` er offentlig lesbar via kiosk-policies. Må begrense mens man behold kiosk-skrivetilgang.

**Løsning:** 
- Fjern "Public can view packing_status for kiosk" policy
- Behold "Public can insert/update packing_status for kiosk" policies
- Behold policies for authenticated users

### 2.2 customers Tabell
**Hva:** Fjern `display_token` fra offentlige queries

**Problem:** `display_token` UUIDs er lesbar offentlig

**Løsning:**
- Opprett ny policy: "Public can view customers for kiosk (limited columns)"
- Bruk `.select('id,name,customer_number,bakery_id,address,priority,is_active')` uten `display_token`
- Opprett Edge Function `validate-display-token` for display-basert tilgang

### 2.3 bakeries Tabell
**Hva:** Fjern `settings` fra offentlig SELECT

**Problem:** `settings` JSON inneholder e-postadresser og konfigurasjoner

**Løsning:**
- Opprett VIEW `bakeries_public` (kun `id, name, short_id, is_active`)
- Oppdater kiosk-queries til å bruke denne viewen

### 2.4 database Funksjoner
**Hva:** Fix privilege escalation i `setup_bakery_for_new_user()`

**Problem:** `_user_id` valideres ikke mot `auth.uid()`

**Løsning:**
```sql
-- Legg til validering:
IF _user_id != auth.uid() THEN
  RAISE EXCEPTION 'Cannot setup bakery for another user';
END IF;
```

---

## Del 3: Implementering av CRON_SECRET

**Brukerens rolle:**
1. Generere eller velge en tilfeldig streng på 32-64 tegn
2. Gi den til systemet når det bes om den

**Eksempler på CRON_SECRET:**
```
MySuperSecret_Cron_Key_2024_xK9mP3vL7q
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
your_super_secret_cron_password_123456
```

---

## Implementeringsrekkefølge

```
Steg 1: Legge til CRON_SECRET i backend (bruker angi verdi)
Steg 2: Oppdatere sync-onedrive-cron function med CRON_SECRET validering
Steg 3: Oppdatere sync-onedrive function - fjern "automated" bypass
Steg 4: Oppdatere send-packing-report function - sikre med JWT + CRON_SECRET
Steg 5: Oppdatere RLS policies for packing_status
Steg 6: Oppdatere RLS policies for customers (fjern display_token)
Steg 7: Opprett VIEW bakeries_public
Steg 8: Fix setup_bakery_for_new_user() function
```

---

## Tekniske detaljer

### CORS Headers
Alle Edge Functions beholder eksisterende CORS-headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '...'
}
```

### JWT Validering Pattern
```typescript
const { data, error } = await supabase.auth.getClaims(token)
if (error || !data?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}
const userId = data.claims.sub
```

### Cron Secret Pattern
```typescript
const cronSecret = req.headers.get('X-Cron-Secret')
if (cronSecret !== Deno.env.get('CRON_SECRET')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}
```

---

## Testing og Validering

Etter implementering:
1. Test sync-onedrive-cron med korrekt CRON_SECRET header
2. Test sync-onedrive med JWT token
3. Test send-packing-report både som cron og manual call
4. Verifiser at offentlige queries ikke returnerer sensitive data
5. Test at kiosk-operasjoner fremdeles fungerer
