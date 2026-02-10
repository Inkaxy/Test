

# "Ferdig pakket"-visning med grønn bakgrunn og logo-watermark

## Hva endres

Når en kunde på felles display er 100% ferdig pakket, erstattes produktlisten med en visuelt tydelig "ferdig"-tilstand:
- Kortets bakgrunn skifter til grønn (konfigurerbar farge)
- Loaf and Load-logoen vises svakt som watermark i bakgrunnen
- Teksten "FERDIG PAKKET" (eller egendefinert tekst) vises sentrert over logoen
- Alt dette kan slås av/på og tilpasses i Display Settings under felles display

## Visuell oppførsel

```text
Kunde under pakking:              Kunde 100% ferdig:
+---------------------------+     +---------------------------+
|        Borgheim           |     |        Borgheim           |
|---------------------------|     |---------------------------|
| Kneipp       10stk   (R) |     |                           |
| Hvasser    1 kv+5stk (R) |     |    [svak logo-ikon]       |
|==========================='     |    FERDIG PAKKET          |
| [====          ]          |     |                           |
+---------------------------+     |==========================='
                                  | [====================]    |
                                  +---------------------------+
                                  (hele kortet har grønn bakgrunn)
```

## Nye innstillinger (kun synlig for felles display)

| Innstilling | Type | Default | Beskrivelse |
|---|---|---|---|
| `card_show_completed_text` | boolean | `true` | Vis ferdig-tilstand når kunde er 100% |
| `card_completed_text` | string | `"FERDIG PAKKET"` | Teksten som vises |
| `card_completed_text_font_size` | string | `"1.5rem"` | Fontstørrelse på teksten |
| `card_completed_bg_color` | string | `"#22c55e"` | Bakgrunnsfarge på kortet ved 100% |
| `card_completed_text_color` | string | `"#ffffff"` | Tekstfarge ved 100% |
| `card_completed_show_logo` | boolean | `true` | Vis logo som watermark |
| `card_completed_logo_opacity` | number | `0.15` | Opacity på logoen (0.05-0.4) |

## Teknisk

| Fil | Endring |
|-----|---------|
| `src/types/display/card.ts` | Legg til alle 7 nye felter i `CardSettings` interface og `defaultCardSettings` |
| `src/pages/display/SharedDisplay.tsx` | I kundekort-renderingen: når `progress === 100` og `card_show_completed_text` er aktivert, bytt kortets `backgroundColor` til `card_completed_bg_color`, vis logo-ikon (`src/assets/logo-icon.png`) som absolutt posisjonert watermark med konfigurerbar opacity, og vis teksten sentrert over. Kundenavn-headeren beholdes, men produkttabellen erstattes. |
| `src/pages/DisplaySettings.tsx` | Ny seksjon "Ferdig pakket-visning" under kort-innstillingene (kun synlig når `selectedDisplayType === 'shared'`). Inneholder: toggle av/på, tekstfelt for tekst, fontstørrelse-dropdown, to fargevelgere (bakgrunn og tekst), toggle for logo, og slider for logo-opacity. |

Ingen databaseendringer. Ingen nye avhengigheter. Logoen importeres fra eksisterende `src/assets/logo-icon.png`.

