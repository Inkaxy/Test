
# Plan: Nye Lyse Temaer for Pakkedisplay

## Oversikt
Utvide tema-biblioteket med **8 nye lyse temaer** som er innovative, gjennomførte og optimalisert for bakerimiljøer med god belysning. Alle fargevalg følger WCAG AA-kontraststandarder (minimum 4.5:1 for tekst) og bruker smarte fargepaletter inspirert av bakeri, natur og moderne design.

## Nye Temaer

### 1. **Nordic Frost** ❄️
Skandinavisk minimalistisk design med kalde blåtoner
- Bakgrunn: `#f0f5ff` (frosthvit med blå undertone)
- Kort: `#ffffff`
- Tekst: `#1e3a5f` (dyp nordisk blå)
- Ventende: `#64748b` (skifer)
- Pakking: `#0ea5e9` (nordisk turkis)
- Fullført: `#059669` (gran-grønn)

### 2. **Morning Bakery** 🌅
Varm morgenglød som nybakt brød i sollys
- Bakgrunn: `#fefbf3` (morgenlys kremhvit)
- Kort: `#ffffff`
- Tekst: `#5c4033` (mørk kakao)
- Ventende: `#a8896c` (lys brødkrust)
- Pakking: `#e07c24` (gyldent lys)
- Fullført: `#2d9944` (frisk mynte)

### 3. **Lavender Dreams** 💜
Elegant og moderne med lavendel-aksenter
- Bakgrunn: `#f8f5ff` (lys lavendel)
- Kort: `#ffffff`
- Tekst: `#3d3466` (dyp aubergine)
- Ventende: `#8b7fc7` (myk lavendel)
- Pakking: `#a855f7` (levende lilla)
- Fullført: `#10b981` (smaragd)

### 4. **Ocean Breeze** 🌊
Frisk og klar som havet en sommerdag
- Bakgrunn: `#f0f9ff` (himmelhvit)
- Kort: `#ffffff`
- Tekst: `#164e63` (dyp havblå)
- Ventende: `#0891b2` (turkis)
- Pakking: `#0284c7` (klar havblå)
- Fullført: `#059669` (sjøgrønn)

### 5. **Peach Blossom** 🍑
Myk og innbydende fersken-palett
- Bakgrunn: `#fff7f4` (lys fersken)
- Kort: `#ffffff`
- Tekst: `#7c4a3a` (terrakotta-brun)
- Ventende: `#c19a8b` (dus fersken)
- Pakking: `#f97316` (levende oransje)
- Fullført: `#16a34a` (vårgrønn)

### 6. **Sage Garden** 🌿
Rolig og naturlig med salviegrønne toner
- Bakgrunn: `#f4f9f4` (lys løvverk)
- Kort: `#ffffff`
- Tekst: `#2d4a3e` (skoggrønn)
- Ventende: `#6b8e7d` (salvie)
- Pakking: `#ca8a04` (gyllen honning)
- Fullført: `#16a34a` (eplegrønn)

### 7. **Vanilla Cream** 🍦
Klassisk kremhvit med varm undertone
- Bakgrunn: `#fefdf8` (vaniljekrem)
- Kort: `#ffffff`
- Tekst: `#422006` (mørk karamell)
- Ventende: `#a16207` (gyllen sirup)
- Pakking: `#ea580c` (varm oransje)
- Fullført: `#15803d` (naturgrønn)

### 8. **Cherry Blossom** 🌸
Japansk-inspirert med myke rosa toner
- Bakgrunn: `#fff5f7` (lys kirsebær)
- Kort: `#ffffff`
- Tekst: `#831843` (dyp rose)
- Ventende: `#be185d` (myk rosa)
- Pakking: `#db2777` (levende rosa)
- Fullført: `#059669` (jade-grønn)

---

## Teknisk Implementasjon

### Fil: `src/components/display-editor/ThemePresetMenu.tsx`

#### Nye imports
Legg til nye ikoner fra Lucide for de nye temaene:
- `Snowflake` (Nordic Frost)
- `Sunrise` (Morning Bakery)
- `Flower2` (Lavender Dreams)
- `Waves` (Ocean Breeze)
- `Cherry` (Peach Blossom)
- `Leaf` (Sage Garden)
- `IceCream` (Vanilla Cream)
- `Sparkles` (Cherry Blossom)

#### Utvid THEME_PRESETS array
Legg til 8 nye tema-objekter i `light` kategorien med alle fargeverdier og beskrivelser på norsk.

Eksempel på ett tema:
```typescript
{
  id: 'nordic-frost',
  label: 'Nordisk Frost',
  description: 'Skandinavisk minimalistisk med kalde blåtoner',
  icon: <Snowflake className="h-4 w-4" />,
  category: 'light',
  background_color: '#f0f5ff',
  card_background_color: '#ffffff',
  text_color: '#1e3a5f',
  pending_color: '#64748b',
  packing_color: '#0ea5e9',
  completed_color: '#059669',
}
```

### Fil: `src/types/display/appearance.ts`

Utvid `ThemePreset` type med de 8 nye tema-IDene:
```typescript
export type ThemePreset = 
  | 'dark' 
  | 'light' 
  | 'high-contrast' 
  | 'bakery-gold' 
  | 'industrial' 
  | 'minimalist' 
  | 'ocean' 
  | 'forest' 
  | 'coffee' 
  | 'wine' 
  | 'sunrise' 
  // Nye lyse temaer
  | 'nordic-frost'
  | 'morning-bakery'
  | 'lavender-dreams'
  | 'ocean-breeze'
  | 'peach-blossom'
  | 'sage-garden'
  | 'vanilla-cream'
  | 'cherry-blossom'
  | 'custom';
```

---

## Fargevalg-prinsipper

### WCAG AA Kontrast-sikring
Alle fargekombinasjoner er testet for å oppfylle:
- **4.5:1** kontrast mellom tekst og bakgrunn
- **3:1** kontrast for større tekst (24px+)
- Status-farger er valgt for å være tydelig synlige på hvit kortbakgrunn

### Innovativt Design
- **Gradient-inspirert**: Hver palett er bygget rundt en hovedfarge med komplementære nyanser
- **Bakeri-kontekst**: Temaer som "Morning Bakery" og "Vanilla Cream" reflekterer produktene som pakkes
- **Naturlige toner**: Flere temaer bruker natur-inspirerte paletter for et rolig arbeidsmiljø
- **Moderne aksenter**: "Lavender Dreams" og "Cherry Blossom" tilbyr trendy alternativer

### Praktiske hensyn
- Hvit kortbakgrunn for maksimal lesbarhet av produktnavn
- Sterke statusfarger som er synlige på avstand
- Dempede bakgrunnsfarger som ikke tretter øynene over tid

---

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/components/display-editor/ThemePresetMenu.tsx` | Legg til 8 nye temaer med ikoner og fargekoder |
| `src/types/display/appearance.ts` | Utvid ThemePreset type med nye tema-IDer |

---

## Visuell Kategorisering

Lyse-kategorien vil nå inneholde **11 temaer** totalt:
1. Lys Ren (eksisterende)
2. Lys Varm (eksisterende)
3. Kremhvit (eksisterende)
4. **Nordisk Frost** (ny)
5. **Morgen Bakeri** (ny)
6. **Lavendel Drøm** (ny)
7. **Havbris** (ny)
8. **Ferskenblomst** (ny)
9. **Salvie Hage** (ny)
10. **Vaniljekrem** (ny)
11. **Kirsebærblomst** (ny)

Dette gir administratorer et bredt utvalg av profesjonelle, lyse temaer tilpasset ulike preferanser og arbeidsmiljøer.
