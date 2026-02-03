
# Plan: Dato-velger per kategori for pakkesider

## Oversikt
Implementere et kategoribasert navigasjonssystem med dato-velger for pakkesidene. Systemet har tre separate bruksområder:

1. **Felles Display + Kunde Display** (TV-skjermer): Bruker URL-parameter for dato
2. **Kundebasert Pakkedisplay** (Nettbrett): Fullskjerm kalendervisning som inngangspunkt for pakking

## Arkitektur

### Navigasjonsflyt

```text
+----------------------------------+
|          /packing                |
|  (Hovedside med kategorifaner)   |
+----------------------------------+
              |
    +---------+---------+
    |                   |
    v                   v
+------------+    +----------------+
| Produktbasert |    | Kundebasert    |
| (Kategori A)  |    | (Kategori B)   |
+------------+    +----------------+
    |                   |
    v                   v
+------------+    +------------------+
| Dato-velger |    | Kalendervisning  |
| i header   |    | (fullskjerm)     |
+------------+    +------------------+
                        |
                        v
              +------------------+
              | Pakkevisning     |
              | (nettbrett-opt.) |
              +------------------+
```

## Detaljert implementasjon

### 1. Oppdater pakkeside (`/packing`) med kategorifaner

**Endringer i `src/pages/Packing.tsx`:**
- Legge til kategori-faner øverst på siden
- Hver kategori viser sin pakkemodus (produkt- eller kundebasert)
- Dato-velger i header per kategori
- Automatisk navigere til riktig modus basert på `packing_mode`

### 2. Ny pakkekalender-komponent for kundebasert pakking

**Ny fil: `src/components/packing/PackingCalendar.tsx`**

Visuell kalender med:
- Fargekoder per dag (beige = klar, grønn = fullført, oransje = pågår)
- Klikk på dato viser statistikk og "Fortsett pakking"-knapp
- Optimalisert for store touch-flater (nettbrett)

**Ny fil: `src/hooks/usePackingCalendar.ts`**

Hooks for å hente:
- Månedsoversikt med status per dato
- Detaljert statistikk for valgt dato
- Topp-produkter for dagen

### 3. Ny nettbrett-optimalisert kundebasert pakkeside

**Ny fil: `src/pages/packing/CustomerPackingTablet.tsx`**

Fullskjerm pakkevisning for nettbrett:
- Store touch-vennlige knapper (minimum 48x48px)
- Tydelig fremdriftslinje
- Kunder som grid med store kort
- Bruk av Pakkedisplay-innstillinger for farger og fonter

### 4. Routing-struktur

Oppdatere `src/App.tsx` med nye ruter:

| Rute | Beskrivelse |
|------|-------------|
| `/packing` | Kategorivalg med dato-velger |
| `/packing/:categoryId` | Spesifikk kategori med kalender |
| `/packing/:categoryId/date/:date` | Pakkevisning for dato |
| `/display/packing` | Display for TV (eksisterende) |

### 5. Kalendervisning-komponent

**Layout:**
```text
+------------------------------------------+
| < Februar 2026 >                         |
+------------------------------------------+
|  Ma   Ti   On   To   Fr   Lø   Sø       |
+------+------+------+------+------+------+
|      |      |      |      |      |   1  |
|      |      |      |      |      | ○    |
+------+------+------+------+------+------+
|   2  |   3  |   4  |   5  |   6  |   7  |
| ●    | ●    | ●    | ○    | ○    |      |
+------+------+------+------+------+------+
                    ...
```

Fargekoder:
- ● Fylt oransje: Klar for pakking (har upakkede ordrer)
- ● Fylt grønn: Fullført (100% pakket)
- ○ Ring: Har ordrer (noen pakket)
- ⬤ I dag: Spesiell markering

### 6. Dato-detaljer panel (høyre side)

Vises når en dato velges:
- Stor datotittel formatert (f.eks. "02. februar 2026")
- Statusbadge (Klar / Pågår / Fullført)
- Tre statistikk-kort:
  - Totalt ordrer
  - Unike kunder
  - Produkttyper
- Liste over mest bestilte produkter med antall
- Stor "Fortsett pakking"-knapp

## Filer som opprettes

| Fil | Beskrivelse |
|-----|-------------|
| `src/hooks/usePackingCalendar.ts` | Hooks for kalenderdata og statistikk |
| `src/components/packing/PackingCalendar.tsx` | Kalender-komponent med statistikk |
| `src/components/packing/CategoryTabs.tsx` | Gjenbrukbare kategorifaner |
| `src/pages/packing/CustomerPackingView.tsx` | Nettbrett-optimalisert pakkevisning |

## Filer som endres

| Fil | Endring |
|-----|---------|
| `src/pages/Packing.tsx` | Legge til kategorifaner og kalenderintegrering |
| `src/pages/CustomerPacking.tsx` | Koble til pakkedisplay-innstillinger |
| `src/App.tsx` | Legge til nye ruter for kategoribasert navigering |
| `src/components/ui/calendar.tsx` | Legge til `pointer-events-auto` for popover-støtte |

## Tekniske detaljer

### Database-spørringer

**Månedsoversikt:**
```sql
SELECT 
  delivery_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN ps.status = 'packed' THEN 1 END) as packed_orders
FROM orders o
LEFT JOIN packing_status ps ON o.id = ps.order_id
WHERE bakery_id = ? 
  AND delivery_date BETWEEN ? AND ?
  AND category_id = ?
GROUP BY delivery_date
```

**Dato-statistikk:**
```sql
SELECT 
  COUNT(DISTINCT customer_id) as unique_customers,
  COUNT(DISTINCT product_id) as product_types,
  SUM(quantity) as total_items
FROM orders
WHERE bakery_id = ? AND delivery_date = ? AND category_id = ?
```

### Props og state

```typescript
interface PackingCalendarProps {
  categoryId: string;
  bakeryId: string;
  onDateSelect: (date: Date) => void;
}

interface DateStats {
  date: string;
  totalOrders: number;
  packedOrders: number;
  uniqueCustomers: number;
  productTypes: number;
  topProducts: { name: string; quantity: number }[];
  status: 'pending' | 'in_progress' | 'completed';
}
```

### Nettbrett-optimalisering

- Minimum touch-target: 48x48px
- Store fontstørrelser (bruk av display-innstillinger)
- Ingen hover-states (kun active/pressed)
- Swipe-navigering mellom kunder (valgfritt)
- Fullskjerm-modus uten header/sidebar

## Brukerflyt eksempel

1. Bruker navigerer til `/packing`
2. Ser kategorifaner (Bakevarer, Smørbrød, etc.)
3. Velger kategori "Smørbrød" (kundebasert modus)
4. Ser kalendervisning med fargekoder
5. Klikker på 3. februar (oransje = klar for pakking)
6. Høyre panel viser: 38 ordrer, 24 kunder, 15 produkttyper
7. Klikker "Fortsett pakking"
8. Navigeres til fullskjerm pakkevisning for den datoen
9. Pakker ordrer med store touch-vennlige knapper
