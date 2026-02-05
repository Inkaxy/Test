

# Plan: Samkjør web og kiosk pakkevisning - både styling og tilgang

## Problemstilling
1. **Styling-forskjell**: Web-pakkevisningen (`CustomerPackingView`) bruker hardkodet lyst tema og tabellvisning, mens kiosk (`KioskPackingView`) bruker konfigurerbare display-innstillinger med mørkt tema og kortvisning
2. **Tilgang til meny**: Vanlige brukere (`bakery_user`) har begrenset tilgang til menypunkter som kan være nyttige

---

## Del 1: Samkjør CustomerPackingView med KioskPackingView

### Fil: `src/pages/packing/CustomerPackingView.tsx`

**Fullstendig redesign av komponenten:**

| Før (web) | Etter (lik kiosk) |
|-----------|-------------------|
| Lys `bg-background` bakgrunn | `settings.background_color` |
| Tabell-basert kundeliste | Grid med kort og animasjoner |
| Hardkodede farger | Konfigurerbare fra DisplaySettings |
| Enkel header | Klokke, dato, fullskjerm, oppdater |
| Enkel fremdriftslinje | Statistikk-seksjon med tall |
| Ingen animasjoner | Framer Motion animasjoner |

**Nye elementer som legges til:**
- Klokke med konfigurerbart format (12h/24h)
- Dato-visning
- Tilkoblingsstatus-indikator (Wifi/WifiOff)
- Fullskjerm-knapp
- Manuell oppdater-knapp
- Statistikk-grid: Total fremdrift, Pakket, Gjenstår
- Sanntidsoppdatering via Supabase realtime for `packing_status`

**Beholdes fra nåværende web-versjon:**
- Låsemekanisme (`acquireLock`, `release`, `startAutoExtend`)
- Visualisering av låste kunder (grått kort, "Låst"-badge)
- Blokkering av klikk på andres låste kunder
- Autentisering (via ProtectedRoute i App.tsx)

---

## Del 2: Samkjør ProductPackingView med display-innstillinger

### Fil: `src/pages/packing/ProductPackingView.tsx`

Denne visningen må også oppdateres for å bruke display-innstillinger (type `shared`):
- Bytt ut hardkodet styling med `settings.background_color`, `settings.text_color`, etc.
- Legg til header med klokke, dato og verktøyknapper
- Statistikk-seksjon

---

## Del 3: Utvid menytilgang for vanlige brukere

### Fil: `src/components/layout/DashboardLayout.tsx`

Gjeldende menystruktur:

```text
Alle brukere:
  - Dashboard
  - Packing
  - Settings

Kun admin:
  - Products, Customers, Categories, Users, Import, DisplaySettings

Kun super_admin:
  - Bakeries, SuperAdmin
```

**Foreslått endring:** Gi vanlige brukere (`bakery_user`) tilgang til å **se** (men ikke nødvendigvis redigere) enkelte menypunkter som er relevante for deres arbeid:

| Menypunkt | Før | Etter | Begrunnelse |
|-----------|-----|-------|-------------|
| Dashboard | Alle | Alle | Uendret |
| Packing | Alle | Alle | Uendret |
| Settings | Alle | Alle | Uendret |
| Products | Admin | Admin | Produktstyring er admin-oppgave |
| Customers | Admin | Admin | Kundestyring er admin-oppgave |
| Categories | Admin | Admin | Kategoristyring er admin-oppgave |
| Users | Admin | Admin | Brukerstyring er admin-oppgave |
| Import | Admin | Admin | Import er admin-oppgave |
| Display Settings | Admin | **Alle** | Brukere kan se display-innstillinger for å forstå visningen |

**Alternativ:** Hvis du ikke ønsker at vanlige brukere skal se Display Settings i menyen, kan dette droppes.

---

## Tekniske detaljer

### CustomerPackingView - Hovedendringer

**1. Nye imports:**
```typescript
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff, Maximize, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
```

**2. Nye state-variabler:**
```typescript
const containerRef = useRef<HTMLDivElement>(null);
const queryClient = useQueryClient();
const [currentTime, setCurrentTime] = useState(new Date());
const [isConnected, setIsConnected] = useState(true);
```

**3. Klokke-oppdatering:**
```typescript
useEffect(() => {
  const interval = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(interval);
}, []);
```

**4. Sanntids-lytter:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('customer-packing-status')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'packing_status' }, () => {
      queryClient.invalidateQueries({ queryKey: ['customers-for-date'] });
    })
    .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
  
  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

**5. Hjelpefunksjoner fra kiosk:**
- `handleFullscreen()` - fullskjerm toggle
- `handleManualRefresh()` - manuell oppdatering
- `getStatusColor()` - farge basert på status og lås

**6. UI-struktur (erstatter nåværende tabell):**

```text
<div style={{ backgroundColor: settings.background_color, color: settings.text_color }}>
  
  <!-- Header med verktøy -->
  <header>
    <ArrowLeft-knapp>
    <Tittel og dato>
    <Klokke + Fullskjerm + Oppdater + Tilkoblingsstatus>
  </header>
  
  <!-- Statistikk-grid -->
  <div className="grid grid-cols-3">
    <Total fremdrift (prosent + progressbar)>
    <Pakket (X / Y)>
    <Gjenstår (tall)>
  </div>
  
  <!-- Kunde-grid -->
  <div style={{ gridTemplateColumns: `repeat(${settings.columns}, 1fr)` }}>
    <AnimatePresence>
      {customers.map(customer => (
        <motion.div 
          style={{ 
            backgroundColor: settings.card_background_color,
            borderLeft: `4px solid ${getStatusColor(customer)}`,
            opacity: lockedByOther ? 0.5 : 1,
          }}
          onClick={() => !lockedByOther && handleSelectCustomer(customer)}
        >
          <!-- Kundenavn, nummer, fremdrift -->
          <!-- Låseindikator hvis aktuelt -->
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
</div>
```

---

## Låsemekanismen (uendret)

| Scenario | Visualisering | Handling |
|----------|---------------|----------|
| Ikke låst | Normal kort | Kan klikkes |
| Låst av deg | Grønn border + "Din lås" badge | Kan fortsette pakking |
| Låst av annen | Grått kort + "Låst" badge | Klikk blokkert |

---

## Filendringer oppsummert

| Fil | Endring |
|-----|---------|
| `src/pages/packing/CustomerPackingView.tsx` | Fullstendig UI-redesign for å matche kiosk med display-innstillinger |
| `src/pages/packing/ProductPackingView.tsx` | Oppdater styling til å bruke display-innstillinger |
| `src/components/layout/DashboardLayout.tsx` | Valgfritt: Gi brukere tilgang til Display Settings-menyen |

---

## Resultat

Etter implementering:
1. Web-pakkevisningen bruker **samme** display-innstillinger og UI som kiosk
2. Administratorer og brukere ser **identisk** grensesnitt for pakking
3. Låsemekanismen fungerer fortsatt for å hindre dobbeltpakking
4. Alle kan bruke innstillingene gjort i "Pakkedisplay" for kundebasert pakking

