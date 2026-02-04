
# Plan: Super Admin-meny og Bakeri-bytter

## Oversikt
Implementere en dedikert super admin-meny med mulighet for å "impersonere" et bakeri for feilsøking og support. Super admin får tilgang til alle bakerier i systemet og kan midlertidig bytte til et annet bakeris kontekst.

## Super Admin-funksjoner

### 1. Egne funksjoner super admin bør ha:
| Funksjon | Beskrivelse |
|----------|-------------|
| **Bakeri-bytter** | Velg hvilket bakeri du vil jobbe med |
| **Se alle bakerier** | Liste over alle registrerte bakerier |
| **Opprette nye bakerier** | Legge til nye bakerier i systemet |
| **Aktivere/deaktivere bakerier** | Styre om et bakeri er aktivt |
| **Se alle brukere på tvers** | Oversikt over alle brukere i alle bakerier |
| **Systemstatistikk** | Totalt antall ordrer, brukere, bakerier |
| **Impersoner bakeri** | Jobbe som om du er admin i valgt bakeri |

### 2. Bakeri-bytter i header

Når super admin er innlogget, vises en dropdown i headeren/sidebaren for å velge aktivt bakeri:

```text
+------------------------------------------+
| 🏪 Aktivt bakeri                         |
| +--------------------------------------+ |
| | Test Bakeri AS                     ▼ | |
| +--------------------------------------+ |
|                                          |
| [ ] Vis kun egne bakerier                |
|                                          |
| Bakerier:                                |
| ● Test Bakeri AS                         |
| ○ Godt Brød                              |
| ○ Baker Hansen                           |
| ○ Åpent Bakeri                           |
+------------------------------------------+
```

## Tekniske endringer

### 1. Utvide AuthStore med bakeri-kontekst

Legge til mulighet for super admin å velge aktivt bakeri:

```typescript
interface AuthState {
  // ... eksisterende felt
  
  // Nytt: Super admin kan overstyre bakeri-kontekst
  selectedBakeryId: string | null;
  setSelectedBakeryId: (bakeryId: string | null) => void;
  getActiveBakeryId: () => string | null; // Erstatter getCurrentBakeryId for super admin
}
```

**Logikk:**
- For vanlige brukere: `getActiveBakeryId()` returnerer deres `bakery_id` fra profil/roller
- For super admin: `getActiveBakeryId()` returnerer `selectedBakeryId` hvis satt, ellers null

### 2. Opprette SuperAdminBakerySelector-komponent

Ny komponent som vises kun for super admin i sidebaren:

```typescript
// src/components/admin/SuperAdminBakerySelector.tsx
export function SuperAdminBakerySelector() {
  // Hent alle bakerier
  // Vis dropdown for å velge aktivt bakeri
  // Oppdater authStore.selectedBakeryId ved valg
}
```

### 3. Oppdatere DashboardLayout

Legge til super admin-seksjon i sidebaren:
- Bakeri-velger (dropdown)
- Visuell indikator på at man er i "impersonate"-modus
- Knapp for å gå tilbake til "normal" modus

```text
Sidebar:
+------------------------------------------+
| 🍞 Loaf & Load                           |
+------------------------------------------+
| ⚡ SUPER ADMIN MODUS                     |
| +--------------------------------------+ |
| | 🏪 Test Bakeri AS               ▼   | |
| +--------------------------------------+ |
| [Tilbake til oversikt]                   |
+------------------------------------------+
| 📊 Dashboard                             |
| 📦 Pakking                               |
| ... (vanlig navigasjon)                  |
+------------------------------------------+
```

### 4. Oppdatere alle hooks til å bruke getActiveBakeryId()

Alle eksisterende hooks som bruker `getCurrentBakeryId()` må oppdateres til å respektere super admin sin valgte bakeri-kontekst:

- `useBakerySettings.ts`
- `useCategories.ts`
- `useCustomers.ts`
- `useProducts.ts`
- `useOrders.ts`
- `useImport.ts`
- `useDashboard.ts`
- osv.

### 5. Opprette hook for å hente alle bakerier

```typescript
// src/hooks/useBakeries.ts
export function useBakeries() {
  const { isSuperAdmin } = useAuthStore();
  
  return useQuery({
    queryKey: ['bakeries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bakeries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin(),
  });
}
```

### 6. Oppdatere Bakeries-siden

Gjøre Bakeries-siden funksjonell (erstatte mock-data):
- Hente ekte bakerier fra databasen
- Opprette/redigere/slette bakerier
- Vise statistikk per bakeri (antall ordrer, brukere)

### 7. Legge til oversettelser

Nye oversettelser for super admin-funksjonalitet:

```json
{
  "superAdmin": {
    "title": "Super Admin",
    "selectBakery": "Velg bakeri",
    "activeBakery": "Aktivt bakeri",
    "allBakeries": "Alle bakerier",
    "impersonating": "Du jobber nå som",
    "backToOverview": "Tilbake til oversikt",
    "noBakerySelected": "Ingen bakeri valgt",
    "selectBakeryToStart": "Velg et bakeri for å starte",
    "systemStats": "Systemstatistikk",
    "totalBakeries": "Totalt antall bakerier",
    "totalUsers": "Totalt antall brukere",
    "totalOrders": "Totalt antall ordrer"
  }
}
```

## Filer som opprettes/endres

| Fil | Endring |
|-----|---------|
| `src/stores/authStore.ts` | Legge til `selectedBakeryId` og `getActiveBakeryId()` |
| `src/components/admin/SuperAdminBakerySelector.tsx` | Ny komponent for bakeri-valg |
| `src/components/layout/DashboardLayout.tsx` | Integrere super admin-seksjon |
| `src/hooks/useBakeries.ts` | Ny hook for å hente alle bakerier |
| `src/pages/Bakeries.tsx` | Gjøre funksjonell med ekte data |
| `src/i18n/locales/nb.json` | Legge til super admin-oversettelser |
| `src/i18n/locales/en.json` | Legge til super admin-oversettelser |
| Diverse hooks | Oppdatere til å bruke `getActiveBakeryId()` |

## Brukerflyt

```text
1. Super admin logger inn
   ↓
2. Ser dashboard uten data (ingen bakeri valgt)
   ↓
3. Velger bakeri fra dropdown i sidebar
   ↓
4. Hele applikasjonen viser data for valgt bakeri
   ↓
5. Super admin kan bytte bakeri når som helst
   ↓
6. Ved utlogging nullstilles valgt bakeri
```

## Sikkerhetsaspekter

- Bakeri-velgeren vises KUN for super_admin-brukere
- RLS-policies i databasen bør allerede tillate super admin tilgang til alle bakerier (må verifiseres)
- Valgt bakeri lagres kun i client-state, ikke i databasen
- Ved refresh av siden må super admin velge bakeri på nytt (bevisst design for sikkerhet)

## Visuell indikator

Når super admin jobber i et bakeri-kontekst, vises en tydelig banner:

```text
+--------------------------------------------------+
| ⚡ Super Admin-modus: Jobber som "Test Bakeri AS" |
| [Bytt bakeri] [Avslutt modus]                    |
+--------------------------------------------------+
```

Dette sikrer at super admin alltid vet at de ser data for et spesifikt bakeri.
