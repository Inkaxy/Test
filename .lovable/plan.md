

# Fiks: Filtrer ut kunder med dedikert skjerm fra felles display

## Problem

`useDisplayOrders` i `src/hooks/useDisplayOrders.ts` henter alle ordrer for et bakeri og en dato, uten å sjekke om kunden har `has_dedicated_display = true`. Dette betyr at kunder som har aktivert dedikert skjerm fortsatt vises på fellesskjermen -- de vises altsa pa begge steder.

## Losning

Legg til et filter i Supabase-queryen slik at kunder med `has_dedicated_display = true` ekskluderes fra felles-displayet.

## Teknisk endring

**Fil:** `src/hooks/useDisplayOrders.ts`

I `useDisplayOrders`-funksjonen (linje 52-68), legg til et filter pa `customer`-relasjonen:

```text
// Navaerende (linje 57):
customer:customers!inner(id, name, customer_number),

// Etter endring - legg til filter etter queryen:
.eq('customer.has_dedicated_display', false)
```

Alternativt (og mer robust) -- bruk `.or()` for a ogsa inkludere kunder der feltet er `null` (for bakoverkompatibilitet):

```text
.or('has_dedicated_display.eq.false,has_dedicated_display.is.null', { referencedTable: 'customers' })
```

Dette sikrer at:
- Kunder med `has_dedicated_display = true` filtreres ut fra felles-displayet
- Kunder med `has_dedicated_display = false` vises som for
- Kunder der feltet er `null` (eldre data) vises ogsa pa felles-displayet

Ingen andre filer trenger endring. Dedikert display (`CustomerDisplay`) bruker en helt annen hook (`useCustomerByToken` + `useCustomerDisplayOrders`) som ikke pavirkes.

## Filendringer

| Fil | Endring |
|-----|---------|
| `src/hooks/useDisplayOrders.ts` | Legg til `.or()` filter i `useDisplayOrders` for a ekskludere dedikerte kunder |

