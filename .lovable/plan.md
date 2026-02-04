
# Plan: Brukeradministrasjon for Super Admin

## Oversikt
Legger til en ny seksjon i Super Admin-innstillingene som viser alle brukere i systemet, uavhengig av bakeri. Super Admin vil kunne se brukerens navn, tilknyttet bakeri, alle roller, og ha mulighet til å endre rolletilordninger.

## Dataflyt

```text
+------------------+       +------------------+       +------------------+
|    profiles      |       |   user_roles     |       |    bakeries      |
+------------------+       +------------------+       +------------------+
| user_id          |<----->| user_id          |       | id               |
| display_name     |       | role             |<----->| name             |
| bakery_id        |------>| bakery_id        |------>|                  |
+------------------+       +------------------+       +------------------+
```

## Implementasjon

### Fase 1: Ny seksjon i SuperAdminSettings.tsx

Legger til en ny Card-komponent under "Bakerioversikt" som viser alle brukere:

**Ny seksjon "Brukeroversikt":**
- Tabell med kolonner: Navn, Bakeri, Rolle(r), Handlinger
- Søkefelt for å filtrere på navn
- Filter for å vise brukere per bakeri eller alle
- Badge-visning av roller (Super Admin, Bakeri Admin, Bakeri Bruker)

### Fase 2: Dialog for rolleadministrasjon

Ny komponent: `src/components/admin/UserRoleDialog.tsx`

**Funksjonalitet:**
- Åpnes når man klikker "Rediger roller" på en bruker
- Viser brukerens nåværende roller
- Dropdown for å legge til ny rolle (super_admin, bakery_admin, bakery_user)
- For bakery_admin og bakery_user: velg hvilket bakeri rollen gjelder for
- Mulighet for å fjerne eksisterende roller
- Bekreftelsesdialog ved sletting av roller

### Fase 3: Databaseoperasjoner

**Hent alle brukere:**
```sql
SELECT 
  p.user_id, 
  p.display_name, 
  p.bakery_id,
  b.name as bakery_name,
  array_agg(ur.role) as roles
FROM profiles p
LEFT JOIN bakeries b ON b.id = p.bakery_id
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
GROUP BY p.user_id, p.display_name, p.bakery_id, b.name
ORDER BY p.display_name
```

**Legg til rolle:**
```sql
INSERT INTO user_roles (user_id, role, bakery_id) 
VALUES ($1, $2, $3)
```

**Fjern rolle:**
```sql
DELETE FROM user_roles WHERE id = $1
```

### Fase 4: Oversettelser

Nye nøkler i `nb.json` og `en.json`:

```json
{
  "superAdmin": {
    "allUsers": "Alle brukere",
    "allUsersDescription": "Administrer brukere på tvers av alle bakerier",
    "userRoles": "Brukerroller",
    "editRoles": "Rediger roller",
    "addRole": "Legg til rolle",
    "removeRole": "Fjern rolle",
    "confirmRemoveRole": "Er du sikker på at du vil fjerne denne rollen?",
    "roleAdded": "Rolle lagt til",
    "roleRemoved": "Rolle fjernet",
    "selectBakeryForRole": "Velg bakeri for denne rollen",
    "noBakery": "Ingen bakeri tilknyttet"
  }
}
```

## Filer som opprettes/endres

| Fil | Endring |
|-----|---------|
| `src/pages/SuperAdminSettings.tsx` | Legger til brukeroversikt-seksjon og state for dialog |
| `src/components/admin/UserRoleDialog.tsx` | Ny dialog for rolleadministrasjon |
| `src/i18n/locales/nb.json` | Nye oversettelser |
| `src/i18n/locales/en.json` | Nye oversettelser |

## Sikkerhet

- Alle operasjoner bruker eksisterende RLS-policies som krever `is_super_admin()`
- Rolleendringer logges med `created_at` timestamp
- Super Admin kan ikke fjerne sin egen super_admin-rolle (for å unngå å låse seg ute)

## UI-komponenter brukt

- `Table`, `TableRow`, `TableCell` for brukerliste
- `Dialog` for rolleredigering
- `Select` for rollevalg og bakeri-valg
- `Badge` for rollevisning
- `Button` for handlinger
- `Input` for søk
- `AlertDialog` for bekreftelse ved sletting

---

## Tekniske detaljer

### Query for brukerliste (useQuery)

```typescript
const { data: allUsers = [], isLoading: usersLoading } = useQuery({
  queryKey: ['super-admin-all-users'],
  queryFn: async () => {
    // Hent alle profiler
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, bakery_id')
      .order('display_name');
    
    if (profilesError) throw profilesError;
    
    // Hent alle roller
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id, role, bakery_id');
    
    if (rolesError) throw rolesError;
    
    // Hent alle bakerier for mapping
    const { data: bakeries } = await supabase
      .from('bakeries')
      .select('id, name');
    
    // Kombiner data
    return profiles.map(profile => ({
      ...profile,
      bakeryName: bakeries?.find(b => b.id === profile.bakery_id)?.name || null,
      roles: roles?.filter(r => r.user_id === profile.user_id) || []
    }));
  },
  enabled: isSuperAdmin(),
});
```

### Mutasjon for å legge til rolle

```typescript
const addRoleMutation = useMutation({
  mutationFn: async ({ userId, role, bakeryId }: AddRoleParams) => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role, bakery_id: bakeryId });
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin-all-users'] });
    toast.success(t('superAdmin.roleAdded'));
  }
});
```

### Mutasjon for å fjerne rolle

```typescript
const removeRoleMutation = useMutation({
  mutationFn: async (roleId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin-all-users'] });
    toast.success(t('superAdmin.roleRemoved'));
  }
});
```
