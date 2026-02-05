
# Plan: Legg til hurtiglenke til Display-innstillinger i pakkekort-menyen

## Problemstilling
Administratorer må navigere til Display Settings-siden og manuelt velge riktig kategori for å justere display-innstillingene. Det er ingen hurtigvei fra pakkekortene på `/packing`-siden.

## Løsning
Legg til et nytt menyvalg "Display-innstillinger" i dropdown-menyen på hvert pakkekort som navigerer direkte til DisplaySettings-siden med riktig kategori forhåndsvalgt.

## Teknisk tilnærming

### 1. Oppdater DisplaySettings for å støtte URL-parametre

**Fil:** `src/pages/DisplaySettings.tsx`

Legg til URL-parametre slik at siden kan åpnes med forhåndsvalgt kategori og display-type:

- Bruk `useSearchParams` fra react-router-dom
- Les `?category={categoryId}&type={displayType}` fra URL
- Initialiser state basert på URL-parametre ved innlasting

```typescript
import { useSearchParams } from 'react-router-dom';

// I komponenten:
const [searchParams] = useSearchParams();
const urlCategoryId = searchParams.get('category');
const urlDisplayType = searchParams.get('type') as DisplayType | null;

// Initialiser state med URL-verdier
const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType>(
  urlDisplayType && Object.keys(DISPLAY_TYPES).includes(urlDisplayType) 
    ? urlDisplayType 
    : 'shared'
);
const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
  urlCategoryId || null
);
```

### 2. Legg til menyvalg i PackingCategoryCard

**Fil:** `src/components/packing/PackingCategoryCard.tsx`

Legg til nytt menyvalg med ikon og navigasjon:

- Importer `Settings` ikon fra lucide-react
- Legg til ny handling i `handleMenuAction`
- Bygg URL med riktig display-type basert på kategoriens `packing_mode`:
  - `product_based` → `type=shared` (Felles Display)
  - `customer_based` → `type=packing` (Pakkedisplay)

```typescript
// Ny import
import { Settings } from 'lucide-react';

// Ny handling i handleMenuAction
case 'display-settings':
  const displayType = category.packing_mode === 'customer_based' ? 'packing' : 'shared';
  navigate(`/display-settings?category=${category.id}&type=${displayType}`);
  break;

// Nytt menyvalg (etter "Kiosk-lenke")
<Button
  variant="ghost"
  size="sm"
  className="justify-start gap-2 w-full"
  onClick={() => handleMenuAction('display-settings')}
>
  <Settings className="h-4 w-4" />
  Display-innstillinger
</Button>
```

## Resultat

Brukerflyten blir:
1. Bruker er på `/packing`-siden
2. Klikker på ⋮ menyen på et pakkekort (f.eks. "BRØD")
3. Velger "Display-innstillinger"
4. Navigeres til `/display-settings?category={id}&type=shared`
5. DisplaySettings-siden åpner med riktig kategori og skjermtype forhåndsvalgt

## Filendringer oppsummert

| Fil | Endring |
|-----|---------|
| `src/pages/DisplaySettings.tsx` | Legg til `useSearchParams` for URL-parameter-støtte |
| `src/components/packing/PackingCategoryCard.tsx` | Legg til Settings-ikon import, ny menyhandling og nytt menyvalg |
