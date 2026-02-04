
# Plan: Fjerne 1/1 fremdriftsindikator fra CustomerDisplay

## Problem
På CustomerDisplay vises det "1/1" (eller "0/1") under antallet (f.eks. "2 stk"). Denne informasjonen er unødvendig fordi:
- "Ferdig"-badgen viser allerede at produktet er pakket
- "Venter"-badgen viser at produktet ikke er pakket ennå
- Det skaper visuell støy uten å gi ekstra verdi

## Løsning
Fjerne div-elementet som viser fremdriftsindikatoren "1/1" eller "0/1" fra produktradene i CustomerDisplay.

## Teknisk endring

### CustomerDisplay.tsx (linje 303-305)

**Før:**
```tsx
<div className="text-right flex flex-col items-end gap-2">
  <div className="flex items-baseline gap-1">
    <span className="text-4xl md:text-5xl font-bold">
      {order.quantity}
    </span>
    <span className="text-lg text-muted-foreground">stk</span>
  </div>
  <div className="text-sm text-muted-foreground">
    {isPacked ? '1/1' : '0/1'}
  </div>
  {getProductStatusBadge(order)}
</div>
```

**Etter:**
```tsx
<div className="text-right flex flex-col items-end gap-2">
  <div className="flex items-baseline gap-1">
    <span className="text-4xl md:text-5xl font-bold">
      {order.quantity}
    </span>
    <span className="text-lg text-muted-foreground">stk</span>
  </div>
  {getProductStatusBadge(order)}
</div>
```

## Filendringer
1. **src/pages/display/CustomerDisplay.tsx** - Fjerne linje 303-305

Resultatet blir en renere visning med kun antall, enhet (stk), og status-badge.
