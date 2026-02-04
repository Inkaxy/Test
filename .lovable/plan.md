
# Plan: Forbedre produktvisning på Felles Display og Pakkedisplay

## Oversikt
Når en vare markeres som pakket skal det tydelig vises på alle display-typer (Kundedisplay, Felles Display og Pakkedisplay) med:
1. Produktnavn med gjennomstreking
2. Fremdriftsindikator (f.eks. "1/1")
3. "Ferdig"-badge på produktlinjen

Kundedisplay har allerede dette designet, men Felles Display og Pakkedisplay mangler det.

## Nåværende tilstand
- **CustomerDisplay**: Viser allerede gjennomstreking, fremdrift (1/1), og "Ferdig"-badge (linje 291-317)
- **SharedDisplay**: Viser kun gjennomstreking og redusert opasitet (linje 476-501)
- **PackingDisplay**: Viser kun gjennomstreking og redusert opasitet (linje 324-350)

## Endringer

### 1. SharedDisplay.tsx
Oppdatere produktlisten i kundekortene for å vise:
- Gjennomstreking på produktnavn når pakket
- Antall til høyre med "stk"-enhet
- Fremdriftsteller "1/1" (eller "0/1" hvis ikke pakket)
- "Ferdig"-badge nederst når pakket

Produktlinjen vil ha et mer fremtredende design med større padding og tydelig visuell status.

### 2. PackingDisplay.tsx
Samme oppdatering som SharedDisplay - legge til fremdriftsteller og "Ferdig"-badge på produktlinjene.

## Teknisk implementering

```text
+-------------------------------------------+
| Produktnavn (gjennomstreket hvis pakket)  |   2     |
|                                           |  stk    |
|                                           |  1/1    |
|                                   [Ferdig]|         |
+-------------------------------------------+
```

For hvert produkt i listen:
- Behold bakgrunnsfarge basert på status (grønn tint for pakket)
- Legg til en høyreseksjon med:
  - Antall (stor skrift)
  - "stk" label
  - Fremdrift (1/1 eller 0/1)
  - Badge med "Ferdig" eller "Venter"

## Filendringer
1. **src/pages/display/SharedDisplay.tsx** - Oppdatere produktliste-rendering
2. **src/pages/display/PackingDisplay.tsx** - Oppdatere produktliste-rendering

Begge filer vil få lignende endringer i produktliste-seksjonen der hver produktrad får et mer informativt og konsistent design som matcher CustomerDisplay.
