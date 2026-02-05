

# Plan: Kiosk-lenke per pakkekategori

## Oversikt
Legger til mulighet for å generere en dedikert kiosk-lenke for hver pakkekategori. Lenken gir tilgang til en strømlinjeformet pakkevisning som er låst til den spesifikke kategorien, uten navigasjon eller andre distraherende elementer.

## Dataflyt

```text
PackingCategoryCard
       │
       ├── Meny-knapp (MoreVertical)
       │       │
       │       └── "Kiosk-lenke" (ny opsjon)
       │               │
       │               └── KioskLinkDialog (ny komponent)
       │                       │
       │                       ├── Viser full URL
       │                       ├── QR-kode (qrcode.react er installert)
       │                       ├── Kopier til utklippstavle
       │                       └── Last ned QR-kode som bilde
       │
       └── URL-format:
           └── Kundebasert: /kiosk/packing/{bakeryShortId}/{categoryId}
           └── Produktbasert: /kiosk/packing/{bakeryShortId}/product/{categoryId}
```

## Implementasjon

### Fase 1: Ny dialog-komponent for kiosk-lenke

Ny fil: `src/components/packing/KioskLinkDialog.tsx`

**Funksjonalitet:**
- Mottar kategori-info og bakeriets `short_id`
- Genererer korrekt URL basert på `packing_mode`
- Viser QR-kode med `qrcode.react` (allerede installert)
- Kopier-knapp for å kopiere URL til utklippstavle
- Last ned QR-kode som PNG-bilde
- Valg mellom "dagens dato" eller "ingen dato" i URL

**Komponent-struktur:**
```
KioskLinkDialog
├── Header med kategori-navn
├── URL-felt med kopier-knapp
├── Dato-valg (valgfritt)
│   ├── Ingen dato (alltid dagens)
│   └── Spesifikk dato
├── QR-kode (stor, sentert)
├── Last ned QR-knapp
└── Tips om bruk
```

### Fase 2: Oppdater PackingCategoryCard

Endringer i `src/components/packing/PackingCategoryCard.tsx`:

**Nye importer:**
- `Link` ikon fra lucide-react
- `KioskLinkDialog` komponent
- Hook for å hente bakery short_id

**Ny state:**
- `isKioskLinkOpen` for dialog-visning

**Ny meny-opsjon:**
- "Kiosk-lenke" mellom "OneDrive" og "Slett"
- Ikon: `Link` fra lucide-react

**Ny handling:**
- `handleMenuAction('kiosklink')` åpner KioskLinkDialog

### Fase 3: Hook for å hente bakery short_id

Ny hook eller utvide eksisterende for å hente bakeriets `short_id` basert på `bakery_id`.

Alternativ: Hent via `useAuthStore` + en query.

### Fase 4: Oversettelser

Nye nøkler i `nb.json` og `en.json`:

```json
{
  "categories": {
    "kioskLink": "Kiosk-lenke",
    "kioskLinkTitle": "Kiosk-lenke for {{category}}",
    "kioskLinkDescription": "Bruk denne lenken på pakkestasjon for å låse til denne kategorien",
    "copyLink": "Kopier lenke",
    "linkCopied": "Lenke kopiert!",
    "downloadQr": "Last ned QR-kode",
    "qrDownloaded": "QR-kode lastet ned",
    "includeDate": "Inkluder dato",
    "noDateInfo": "Uten dato brukes alltid dagens dato",
    "kioskTips": "Tips: Åpne lenken i fullskjerm-modus (F11) for beste opplevelse"
  }
}
```

## Filer som opprettes/endres

| Fil | Endring |
|-----|---------|
| `src/components/packing/KioskLinkDialog.tsx` | Ny - Dialog med QR-kode og kopier-funksjon |
| `src/components/packing/PackingCategoryCard.tsx` | Endres - Ny meny-opsjon og dialog-integrasjon |
| `src/i18n/locales/nb.json` | Endres - Nye oversettelser |
| `src/i18n/locales/en.json` | Endres - Nye oversettelser |

## UI-komponenter brukt

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` for dialog
- `Button` med variant="outline" for handlingsknapper
- `QRCodeSVG` fra qrcode.react for QR-kode
- `Input` med readonly for URL-visning
- `Switch` eller `Checkbox` for dato-valg
- `Badge` for å vise pakkemodus
- Lucide-ikoner: `Link`, `Copy`, `Download`, `Check`

## Tekniske detaljer

### KioskLinkDialog Props

```typescript
interface KioskLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  bakeryShortId: string;
}
```

### URL-generering

```typescript
const generateKioskUrl = (bakeryShortId: string, category: Category, date?: string) => {
  const baseUrl = window.location.origin;
  const modePath = category.packing_mode === 'product_based' 
    ? `/kiosk/packing/${bakeryShortId}/product/${category.id}`
    : `/kiosk/packing/${bakeryShortId}/${category.id}`;
  
  if (date) {
    return `${baseUrl}${modePath}?date=${date}`;
  }
  return `${baseUrl}${modePath}`;
};
```

### Kopier til utklippstavle

```typescript
const handleCopy = async () => {
  await navigator.clipboard.writeText(kioskUrl);
  toast({ title: t('categories.linkCopied') });
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

### Last ned QR-kode

```typescript
const handleDownloadQr = () => {
  const svg = document.getElementById('kiosk-qr-code');
  if (!svg) return;
  
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx?.drawImage(img, 0, 0);
    
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `kiosk-${category.name}.png`;
    link.href = pngUrl;
    link.click();
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  toast({ title: t('categories.qrDownloaded') });
};
```

### Hente bakery short_id

Utvide props til `PackingCategoryCard` eller lage en hook:

```typescript
// I Packing.tsx eller lignende forelder-komponent
const { data: bakery } = useQuery({
  queryKey: ['bakery', getActiveBakeryId()],
  queryFn: async () => {
    const bakeryId = getActiveBakeryId();
    if (!bakeryId) return null;
    
    const { data, error } = await supabase
      .from('bakeries')
      .select('id, short_id')
      .eq('id', bakeryId)
      .single();
    
    if (error) throw error;
    return data;
  },
  enabled: !!getActiveBakeryId(),
});
```

## Eksempel på ferdig UI

```
┌─────────────────────────────────────────────┐
│  Kiosk-lenke for BRØD                        │
├─────────────────────────────────────────────┤
│                                             │
│  Bruk denne lenken på pakkestasjon          │
│  for å låse til denne kategorien            │
│                                             │
│  ┌─────────────────────────────────┐  [📋] │
│  │ https://loaf...oad.lovable.app/ │        │
│  │ kiosk/packing/testbakeri/xyz... │        │
│  └─────────────────────────────────┘        │
│                                             │
│         ┌─────────────────┐                 │
│         │   ███ ███ ███   │                 │
│         │   █ ████  ██    │                 │
│         │   ███  █  ███   │ (QR-kode)       │
│         │   █ █ ███ █ █   │                 │
│         │   ███ █ █ ███   │                 │
│         └─────────────────┘                 │
│                                             │
│  [Produktbasert pakking]                    │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ⚡ Tips: Åpne i fullskjerm (F11)     │   │
│  └──────────────────────────────────────┘   │
│                                             │
│        [⬇️ Last ned QR-kode]                │
│                                             │
└─────────────────────────────────────────────┘
```

