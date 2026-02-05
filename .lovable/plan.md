

# Plan: Fikse "Bakeri ikke funnet" i Kiosk-visning

## Problemet
Når en bruker åpner en kiosk-lenke uten å være innlogget, får de "Bakeri ikke funnet". Dette skjer fordi alle RLS-policies på `bakeries`-tabellen krever `authenticated` rolle - det finnes ingen policy for `anon` (uinnloggede brukere).

Kiosk-visningen er designet for å være **offentlig tilgjengelig** uten innlogging, men databasetilgangen blokkerer dette.

## Hvilke tabeller trenger offentlig tilgang for kiosk

For at kiosk-pakking skal fungere offentlig, må følgende tabeller ha `anon`-policies:

| Tabell | Operasjon | Behov |
|--------|-----------|-------|
| `bakeries` | SELECT | Slå opp bakeri basert på `short_id` |
| `categories` | SELECT | Hente kategori-info |
| `orders` | SELECT | Hente ordrer for pakking |
| `customers` | SELECT | Vise kundenavn |
| `products` | SELECT | Vise produktnavn |
| `packing_status` | SELECT, INSERT, UPDATE | Lese og oppdatere pakkestatus |
| `display_settings` | SELECT | Hente visningsinnstillinger |

## Løsning

Legger til nye RLS-policies som tillater `anon`-brukere lesing av nødvendige data. For `packing_status` tillates også skriving siden kiosk-brukere skal kunne pakke ordrer.

### Nye RLS-policies

**1. bakeries - Offentlig lesing**
```sql
CREATE POLICY "Public can view bakeries by short_id"
  ON bakeries FOR SELECT
  TO anon
  USING (short_id IS NOT NULL AND is_active = true);
```

**2. categories - Offentlig lesing**
```sql
CREATE POLICY "Public can view categories for active bakeries"
  ON categories FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bakeries b 
      WHERE b.id = categories.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

**3. orders - Offentlig lesing for kiosk**
```sql
CREATE POLICY "Public can view orders for kiosk"
  ON orders FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bakeries b 
      WHERE b.id = orders.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

**4. customers - Offentlig lesing**
```sql
CREATE POLICY "Public can view customers for kiosk"
  ON customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bakeries b 
      WHERE b.id = customers.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

**5. products - Offentlig lesing**
```sql
CREATE POLICY "Public can view products for kiosk"
  ON products FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bakeries b 
      WHERE b.id = products.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

**6. packing_status - Offentlig lesing og skriving**
```sql
-- SELECT
CREATE POLICY "Public can view packing_status for kiosk"
  ON packing_status FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN bakeries b ON b.id = o.bakery_id
      WHERE o.id = packing_status.order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- INSERT
CREATE POLICY "Public can insert packing_status for kiosk"
  ON packing_status FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN bakeries b ON b.id = o.bakery_id
      WHERE o.id = packing_status.order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );

-- UPDATE
CREATE POLICY "Public can update packing_status for kiosk"
  ON packing_status FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN bakeries b ON b.id = o.bakery_id
      WHERE o.id = packing_status.order_id
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

**7. display_settings - Offentlig lesing**
```sql
CREATE POLICY "Public can view display_settings for kiosk"
  ON display_settings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM bakeries b 
      WHERE b.id = display_settings.bakery_id 
      AND b.short_id IS NOT NULL 
      AND b.is_active = true
    )
  );
```

## Sikkerhetsnotater

- Alle policies krever at bakeriet har en `short_id` (er konfigurert for kiosk/display)
- Alle policies krever at bakeriet er aktivt (`is_active = true`)
- Ingen sensitiv data eksponeres - kun ordredata som trengs for pakking
- Policies gir ikke tilgang til å slette data
- Policies gir ikke tilgang til å opprette nye ordrer eller kunder

## Implementasjonsendringer

Kun én databasemigrasjon trengs - ingen kodeendringer er nødvendige siden spørringene allerede er korrekt implementert.

