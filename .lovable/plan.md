
# Visuell WYSIWYG-editor for Pakkedisplay

## Oversikt

Implementere en visuell redigeringsmodus for pakkedisplayet som gir administratorer mulighet til å tilpasse utseendet direkte via drag-and-drop, inline-redigering og interaktiv forhåndsvisning - uten å måtte navigere gjennom innstillingsmenyer.

## Konsept

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  NÅVÆRENDE LØSNING                                                          │
│  ┌──────────────────────────┐    ┌──────────────────────────────────┐      │
│  │  Innstillinger           │    │  Forhåndsvisning (statisk)       │      │
│  │  ├─ Topptekst           │    │                                   │      │
│  │  ├─ Statistikk-kort     │ ➔  │  [Preview som ikke kan redigeres] │      │
│  │  ├─ Kundekort           │    │                                   │      │
│  │  └─ Utseende            │    │                                   │      │
│  └──────────────────────────┘    └──────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NY WYSIWYG-LØSNING                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                    LIVE REDIGERBAR PREVIEW                        │      │
│  │  ┌─────────────────────────────────────────────────────────┐     │      │
│  │  │  [Klikk for å redigere header]                          │     │      │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │     │      │
│  │  │  │ Drag meg │ │ Drag meg │ │ Drag meg │  ← Dra for     │     │      │
│  │  │  │ Kunde 1  │ │ Kunde 2  │ │ Kunde 3  │    rekkefølge  │     │      │
│  │  │  └──────────┘ └──────────┘ └──────────┘                │     │      │
│  │  └─────────────────────────────────────────────────────────┘     │      │
│  │                                                                   │      │
│  │  ┌─ Svevende verktøylinje ─┐                                     │      │
│  │  │ 🎨 Farger │ 📏 Størrelse │ 📐 Layout │ 💾 Lagre            │      │
│  │  └─────────────────────────┘                                     │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Brukeropplevelse

### 1. Aktivere redigeringsmodus
- Ny knapp "Visuell redigering" på Display-innstillinger siden
- Alternativt: Direkte tilgang fra pakkevisningen for admins (ikon i hjørnet)

### 2. Interaktiv forhåndsvisning
- Full-størrelse preview som matcher faktisk display
- Alle elementer er interaktive og viser highlight ved hover

### 3. Redigeringsmetoder

**a) Direkte manipulering (klikk/velg)**
- Klikk på et element for å velge det
- Svevende panel viser relevante innstillinger for valgt element
- Endringer vises umiddelbart

**b) Inline-redigering**
- Dobbeltklikk på tekst for å redigere direkte
- Endrer fontstørrelser med håndtak (dra for å skalere)

**c) Drag-and-drop layout**
- Dra kolonner for å endre antall
- Dra elementer for å omorganisere rekkefølge

**d) Kontekstmeny (høyreklikk)**
- Vis/skjul element
- Dupliser stil
- Tilbakestill til standard

### 4. Svevende verktøylinje
Alltid synlig panel nederst eller på siden med:
- Fargepalett (tema og enkeltfarger)
- Størrelsesinnstillinger
- Toggle for elementer (vis/skjul)
- Lagre / Forkast / Forhåndsvis på enhet

## Teknisk arkitektur

### Nye komponenter

| Komponent | Beskrivelse |
|-----------|-------------|
| `VisualDisplayEditor.tsx` | Hovedkomponent for WYSIWYG-editoren |
| `EditorCanvas.tsx` | Redigerbar forhåndsvisning med seleksjon |
| `EditableElement.tsx` | Wrapper for hvert redigerbart element |
| `EditorToolbar.tsx` | Svevende verktøylinje |
| `ElementInspector.tsx` | Panel med innstillinger for valgt element |
| `ColorPickerPopover.tsx` | Fargevelger med presets og custom |
| `SizeSlider.tsx` | Slider for fontstørrelser og dimensjoner |

### Redigerbare elementer

Følgende deler av displayet kan redigeres visuelt:

| Element | Redigerbare egenskaper |
|---------|----------------------|
| **Header** | Vis/skjul bakernavn, kategori, klokke, dato; Fontstørrelser |
| **Statistikk-kort** | Vis/skjul progress, teller; Bar-stil og høyde |
| **Kundekort** | Vis/skjul nummer, produkter, progress; Fonter; Border-radius |
| **Layout** | Kolonner (1-6); Gap; Padding |
| **Farger** | Bakgrunn, kort-bakgrunn, tekst, status-farger |
| **Produktrad** | Radhøyde; Alternerende farger; Font-størrelse |

### State-håndtering

Editoren bruker lokal state som synkroniseres med eksisterende `DisplaySettings`:

```typescript
interface EditorState {
  settings: DisplaySettings;
  selectedElement: string | null;
  isDirty: boolean;
  history: DisplaySettings[]; // For undo/redo
  historyIndex: number;
}
```

### Seleksjonslogikk

Hvert redigerbart element wrapper seg med `EditableElement`:

```typescript
<EditableElement
  id="header-bakery-name"
  label="Bakerinavn"
  settingKeys={['header_show_bakery_name', 'header_bakery_font_size']}
  onSelect={() => setSelectedElement('header-bakery-name')}
  isSelected={selectedElement === 'header-bakery-name'}
>
  <h1>{bakeryName}</h1>
</EditableElement>
```

### Integrasjon med eksisterende system

Editoren bruker de samme `DisplaySettings` og `useDisplaySettings` hook:
- Ingen endring i databaseskjema
- Samme innstillinger lagres
- Eksisterende accordion-basert UI forblir som "Avansert"-alternativ

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/pages/DisplaySettings.tsx` | Legg til "Visuell redigering"-knapp |
| `src/components/display-editor/VisualDisplayEditor.tsx` | Ny - Hovedkomponent |
| `src/components/display-editor/EditorCanvas.tsx` | Ny - Redigerbar canvas |
| `src/components/display-editor/EditableElement.tsx` | Ny - Element-wrapper |
| `src/components/display-editor/EditorToolbar.tsx` | Ny - Verktøylinje |
| `src/components/display-editor/ElementInspector.tsx` | Ny - Egenskapspanel |
| `src/components/display-editor/ColorPicker.tsx` | Ny - Fargevelger |
| `src/components/display-editor/useEditorState.ts` | Ny - Editor state hook |
| `src/components/display-editor/index.ts` | Ny - Eksporter |

## Verktøylinje-funksjoner

### Hovedseksjoner

1. **Tema-velger** - Presets: Mørk, Lys, Høy-kontrast, Custom
2. **Farger** - Quick-access til hovedfarger med fargevelger
3. **Layout** - Kolonner, gap, padding som sliders
4. **Toggle** - Vis/skjul for hovedseksjoner
5. **Handlinger** - Lagre, Forkast, Undo, Redo

### Kontekstsensitiv inspector

Når et element er valgt vises relevante innstillinger:

**Eksempel: Header valgt**
- Fontstørrelse (slider eller presets)
- Vis/skjul individuelle elementer
- Tekstfarge (arv fra tema eller custom)

**Eksempel: Kundekort valgt**
- Border-radius (slider)
- Border-tykkelse
- Bakgrunnsfarge
- Shadow on/off

## Mobilstøtte

Editoren er responsiv:
- På tablet: Full funksjonalitet med touch-optimerte kontroller
- På mobil: Redusert modus med fokus på essensielle innstillinger

## Undo/Redo

Implementeres med history-array:
- Hver endring lagrer en snapshot
- Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo
- Maks 50 steg i historikk

## Keyboard shortcuts

| Snarvei | Handling |
|---------|----------|
| `Esc` | Avbryt valg / Lukk editor |
| `Cmd+S` | Lagre endringer |
| `Cmd+Z` | Angre |
| `Cmd+Shift+Z` | Gjør om |
| `Delete` | Skjul valgt element |
| `1-6` | Sett antall kolonner |

## Fremtidig utvidelse

Denne arkitekturen åpner for:
- Dra-og-slipp rekkefølge av elementer
- Egendefinerte CSS-variabler
- Tema-eksport/import
- Flere display-layouts (ikke bare grid)
- Widgets (logo, tekst-blokker)

---

## Implementeringsrekkefølge

1. **Fase 1**: Grunnleggende editor med seleksjon og inspector
2. **Fase 2**: Fargepalett og tema-presets
3. **Fase 3**: Live preview med alle innstillinger
4. **Fase 4**: Undo/redo og keyboard shortcuts
5. **Fase 5**: Mobile-optimalisering

Hver fase kan leveres separat og testes.
