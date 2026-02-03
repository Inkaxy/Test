
# Plan: Fiks tegnkoding for norske tegn (ÆØÅ)

## Problemanalyse

Filene fra det eksterne bakeri-systemet er sannsynligvis kodet i **UTF-8** eller **Windows-1252**, men koden leser dem som **ISO-8859-1**. Dette forårsaker at:
- "Nøtterøy" → "NÃ¸tterÃ¸y"
- "Føynland" → "FÃ¸ynland"  
- "Hvasserbrød" → "HvasserbrÃ¸d"

## Løsning

Implementer **smart tegnkodingsdeteksjon** som:
1. Prøver UTF-8 først (moderne standard)
2. Sjekker om resultatet inneholder ødelagte tegn
3. Faller tilbake til Windows-1252 eller ISO-8859-1 om nødvendig

## Teknisk implementasjon

### Steg 1: Oppdater `readFileAsText` funksjonen

**Fil:** `src/lib/fileParser.ts`

```typescript
/**
 * Read file content as text with automatic encoding detection
 * Tries UTF-8 first, then falls back to Windows-1252 for Nordic files
 */
export async function readFileAsText(file: File): Promise<string> {
  // First try UTF-8
  const utf8Content = await readWithEncoding(file, 'UTF-8');
  
  // Check for garbled characters (UTF-8 read as Latin-1 produces "Ã")
  if (!hasGarbledCharacters(utf8Content)) {
    return utf8Content;
  }
  
  // If garbled, try Windows-1252 (common for older Nordic systems)
  console.log('Detected encoding issue, trying Windows-1252...');
  const win1252Content = await readWithEncoding(file, 'windows-1252');
  
  if (!hasGarbledCharacters(win1252Content)) {
    return win1252Content;
  }
  
  // Final fallback: ISO-8859-1
  console.log('Trying ISO-8859-1 fallback...');
  return readWithEncoding(file, 'ISO-8859-1');
}

function readWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, encoding);
  });
}

/**
 * Detect garbled Nordic characters
 * When UTF-8 is read as ISO-8859-1:
 * - ø becomes Ã¸
 * - æ becomes Ã¦  
 * - å becomes Ã¥
 */
function hasGarbledCharacters(content: string): boolean {
  // Common patterns when UTF-8 Nordic chars are misread as ISO-8859-1
  const garbledPatterns = [
    /Ã¸/,  // ø
    /Ã¦/,  // æ
    /Ã¥/,  // å
    /Ã˜/,  // Ø
    /Ã†/,  // Æ
    /Ã…/,  // Å
    /Ã¸/,  // Alternative ø pattern
  ];
  
  return garbledPatterns.some(pattern => pattern.test(content));
}
```

## Hvorfor denne løsningen fungerer

```text
┌─────────────────────────────────────────────────────────────┐
│            TEGNKODING DETEKSJONSFLYT                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Les fil som UTF-8                                       │
│        ↓                                                    │
│  2. Sjekk for "Ã¸", "Ã¦", "Ã¥" mønstre                      │
│        ↓                                                    │
│  ┌─────┴─────┐                                              │
│  │           │                                              │
│  Ingen       Fant ødelagte tegn                             │
│  problemer        ↓                                         │
│  ↓           3. Les fil som Windows-1252                    │
│  Bruk UTF-8       ↓                                         │
│              4. Sjekk igjen                                 │
│                   ↓                                         │
│              ┌────┴────┐                                    │
│              │         │                                    │
│              OK        Fortsatt feil                        │
│              ↓              ↓                               │
│         Bruk Win-1252  Bruk ISO-8859-1                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Forventet resultat

| Før (feil) | Etter (riktig) |
|------------|----------------|
| Meny NÃ¸tterÃ¸y | Meny Nøtterøy |
| Spar FÃ¸ynland | Spar Føynland |
| Kiwi GauterÃ¸d | Kiwi Gauterød |
| HvasserbrÃ¸d | Hvasserbrød |
| MelkebrÃ¸d | Melkebrød |
| FÃ¦rderbrÃ¸d | Færderbrød |

## Endringer

| Fil | Endring |
|-----|---------|
| `src/lib/fileParser.ts` | Oppdater `readFileAsText` med smart encoding-deteksjon |

## Risiko

- **Lav risiko** - Endringen påvirker kun filinnlesning
- Eksisterende data i databasen med feil tegn må importeres på nytt
