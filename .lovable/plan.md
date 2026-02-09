
# Rettelse: Bruk `/content`-endepunkt i stedet for downloadUrl

## Problemet

Koden forsøker å bruke `@microsoft.graph.downloadUrl` fra `/children?$select=...`, men for SharePoint/Microsoft 365 delte mapper returnerer Microsoft Graph API **IKKE** denne verdien automatisk - selv med `$select`-parameteren. Dette forårsaker at alle filer får `null` downloadUrl, og `downloadFileContent()` kaster en feil.

**Resultat**: Synkroniseringen feiler ved den første `.PRD`-filen, og ingen av de 9 filene blir lastet ned. Systemet importerer ingen data fra noen av dagene (05-02, 06-02, 09-02).

## Løsning

I stedet for å stole på `@microsoft.graph.downloadUrl`, skal vi bruke Graph API's `/content`-endepunkt som **returnerer en 302-redirect** til den virkelige nedlastings-URLen.

### Dataflyt (ny)

```text
1. getFilesInFolder() 
   └─ GET /shares/{shareId}/driveItem
   └─ GET /shares/{shareId}/driveItem/children
      └─ Returnerer: [{ id, name, file, folder, size }, ...]
      
2. downloadFileContent(driveId, itemId, fileName)
   └─ GET /drives/{driveId}/items/{itemId}/content
      └─ HTTP 302 Redirect
      └─ Location: https://...downloadUrl
      └─ Følg redirect
      └─ Last ned filinnhold
```

## Implementering

### Steg 1: Oppdater `getFilesInFolder()`

Endre funksjonen til å returnere både `driveId` og filer-listen:

```typescript
interface FolderContents {
  driveId: string
  files: GraphDriveItem[]
}

async function getFilesInFolder(
  accessToken: string,
  shareUrl: string
): Promise<FolderContents> {
  const shareId = extractShareIdFromUrl(shareUrl)
  
  // Get shared folder - ekstrahér driveId fra parentReference
  const shareResponse = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (!shareResponse.ok) {
    throw new Error(`Kunne ikke få tilgang til OneDrive-mappen...`)
  }
  
  const shareData = await shareResponse.json()
  const driveId = shareData.parentReference?.driveId
  
  if (!driveId) {
    throw new Error('Kunne ikke ekstrahere Drive ID fra delt mappe')
  }
  
  // Get children (NO $select for downloadUrl - det fungerer ikke)
  const childrenResponse = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/children`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  
  if (!childrenResponse.ok) {
    throw new Error(`Kunne ikke hente filer fra OneDrive-mappen...`)
  }
  
  const data = await childrenResponse.json()
  
  return {
    driveId,
    files: data.value || []
  }
}
```

### Steg 2: Oppdater `downloadFileContent()`

Erstatt hele logikken til å bruke `/content`-endepunktet:

```typescript
async function downloadFileContent(
  accessToken: string,
  driveId: string,
  itemId: string,
  fileName: string
): Promise<string> {
  // Bruk /content-endepunktet som returnerer 302 redirect
  const contentUrl = 
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`
  
  console.log(`Downloading file: ${fileName}`)
  
  const response = await fetch(contentUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: 'follow'  // Automatisk følg 302-redirect
  })
  
  if (!response.ok) {
    throw new Error(
      `Kunne ikke laste ned fil ${fileName}: ${response.status}`
    )
  }
  
  // Hent filinnholdet
  const buffer = await response.arrayBuffer()
  
  // Detekter encoding (UTF-8 eller Windows-1252)
  let content = new TextDecoder('utf-8').decode(buffer)
  
  if (hasGarbledCharacters(content)) {
    console.log('Detected encoding issue, trying Windows-1252...')
    content = new TextDecoder('windows-1252').decode(buffer)
  }
  
  return content
}
```

### Steg 3: Oppdater alle kallesteder

I hoveddelen av koden hvor vi behandler PRD-, CUS- og OD0-filer:

```typescript
// Old code:
const files = await getFilesInFolder(accessToken, config.onedrive_folder_url)

// New code:
const { driveId, files } = await getFilesInFolder(
  accessToken, 
  config.onedrive_folder_url
)

// For PRD-filer:
for (const file of prdFiles) {
  console.log(`Processing product file: ${file.name}`)
  const content = await downloadFileContent(
    accessToken,
    driveId,
    file.id,
    file.name
  )
  // ... rest av logikken
}

// For CUS-filer:
for (const file of cusFiles) {
  console.log(`Processing customer file: ${file.name}`)
  const content = await downloadFileContent(
    accessToken,
    driveId,
    file.id,
    file.name
  )
  // ... rest av logikken
}

// For OD0-filer:
for (const file of od0Files) {
  // ... dato-ekstraksjon og duplikat-sjekk ...
  const content = await downloadFileContent(
    accessToken,
    driveId,
    file.id,
    file.name
  )
  // ... rest av logikken
}
```

### Steg 4: Oppdater `deleteFile()`

Endre til å bruke `driveId` og `itemId` i stedet for `shareUrl`:

```typescript
async function deleteFile(
  accessToken: string,
  driveId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  if (!response.ok && response.status !== 204) {
    throw new Error(`Kunne ikke slette fil: ${response.status}`)
  }
}
```

Og oppdater stedet hvor vi sletter filer:

```typescript
// Old:
await deleteFile(accessToken, config.onedrive_folder_url, file.id)

// New:
await deleteFile(accessToken, driveId, file.id)
```

## Resultat etter fix

✅ **Alle 9 filene fra alle 3 datoene vil bli lastet ned**
- 05-02-2026.PRD, .CUS, .OD0
- 06-02-2026.PRD, .CUS, .OD0
- 09-02-2026.PRD, .CUS, .OD0

✅ **Duplikat-filtreringen fungerer**
- Hvis 05-02-2026 allerede er importert, hoppes den over
- Men 06-02-2026 og 09-02-2026 importeres allikevel

✅ **Valgfri fil-sletting fungerer**
- Hvis `delete_after_import = true`, slettes alle 9 filene etter vellykket import

✅ **Automatisk cron-synk fungerer**
- Hver dag ved 08:00 laster systemet ned alle nye filer fra OneDrive

## Sikkerhet

- Bruker fortsatt samme Azure AD-token
- `/content`-endepunktet krever samme JWT-autentisering
- Redirect-håndtering er sikker (Microsoft Graph endepunkt)
- Ingen nye hemmeligheter kreves

## Testing etter implementering

1. Klikk "Synk nå" i OneDrive-konfigurasjonen
2. Sjekk at loggene viser: "Downloading file: 05-02-2026.PRD", osv. for alle 9 filene
3. Verifiser at alle 9 filene blir lastet ned uten feil
4. Sjekk databasen for importerte produkter, kunder og ordrer fra alle 3 datoer
5. Verifiser at sync-status endres til "completed" (eller bekreft status i UI)
6. Hvis `delete_after_import = true`, verifiser at filene forsvinner fra OneDrive

