
# Fjern "Produktbasert Pakking"-fanen fra Display-innstillinger

## Endring

Fanen "Produktbasert Pakking" fjernes fra innstillingspanelet. Den brukes i dag kun av `ProductPackingView` for a hente display-innstillinger, men trenger ikke en egen konfigurasjonsfane -- produktbasert pakking kan bruke standardinnstillingene eller arve fra en annen type.

## Teknisk

| Fil | Endring |
|-----|---------|
| `src/pages/DisplaySettings.tsx` | Oppdater `visibleDisplayTypes`-filteret til ogsa ekskludere `product_packing` (i tillegg til `customer_packing`). Oppdater `grid-cols-4` til `grid-cols-3` pa `TabsList` siden det na kun er 3 faner. |

Resultatet blir at innstillingspanelet viser kun tre faner: **Felles Display**, **Kunde Display** og **Pakkedisplay**.

`ProductPackingView` fortsetter a bruke `product_packing`-typen internt for a hente innstillinger fra databasen -- ingen endring der.
