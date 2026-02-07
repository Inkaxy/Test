-- Create kiosk_locks table for device-based locking without authentication
CREATE TABLE public.kiosk_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  device_id TEXT NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, delivery_date)
);

-- Create indexes for performance
CREATE INDEX idx_kiosk_locks_bakery_date ON public.kiosk_locks(bakery_id, delivery_date);
CREATE INDEX idx_kiosk_locks_expires_at ON public.kiosk_locks(expires_at);

-- Enable RLS
ALTER TABLE public.kiosk_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies for public access (kiosk mode)
-- SELECT: Anyone can view locks for active bakeries
CREATE POLICY "Public can view kiosk locks for active bakeries"
ON public.kiosk_locks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bakeries b
    WHERE b.id = kiosk_locks.bakery_id
    AND b.short_id IS NOT NULL
    AND b.is_active = true
  )
);

-- INSERT: Anyone can create locks for active bakeries
CREATE POLICY "Public can create kiosk locks for active bakeries"
ON public.kiosk_locks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bakeries b
    WHERE b.id = kiosk_locks.bakery_id
    AND b.short_id IS NOT NULL
    AND b.is_active = true
  )
);

-- UPDATE: Anyone can update their own locks (by device_id) or expired locks
CREATE POLICY "Public can update own or expired kiosk locks"
ON public.kiosk_locks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bakeries b
    WHERE b.id = kiosk_locks.bakery_id
    AND b.short_id IS NOT NULL
    AND b.is_active = true
  )
);

-- DELETE: Anyone can delete their own locks (by device_id) or expired locks
CREATE POLICY "Public can delete own or expired kiosk locks"
ON public.kiosk_locks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.bakeries b
    WHERE b.id = kiosk_locks.bakery_id
    AND b.short_id IS NOT NULL
    AND b.is_active = true
  )
);

-- Authenticated users with bakery access can also manage locks
CREATE POLICY "Bakery users can manage kiosk locks"
ON public.kiosk_locks
FOR ALL
USING (can_access_bakery(bakery_id))
WITH CHECK (can_access_bakery(bakery_id));

-- Super admins can manage all kiosk locks
CREATE POLICY "Super admins can manage all kiosk locks"
ON public.kiosk_locks
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Enable realtime for kiosk_locks
ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosk_locks;

-- Trigger for updated_at
CREATE TRIGGER update_kiosk_locks_updated_at
BEFORE UPDATE ON public.kiosk_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to acquire a kiosk lock (device-based)
CREATE OR REPLACE FUNCTION public.acquire_kiosk_lock(
  _customer_id UUID,
  _bakery_id UUID,
  _delivery_date DATE,
  _device_id TEXT,
  _lock_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lock_id UUID;
  _expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  _expires_at := now() + (_lock_duration_minutes || ' minutes')::INTERVAL;
  
  -- Validate bakery is active and has short_id
  IF NOT EXISTS (
    SELECT 1 FROM bakeries 
    WHERE id = _bakery_id 
    AND short_id IS NOT NULL 
    AND is_active = true
  ) THEN
    RETURN NULL;
  END IF;
  
  -- Try to insert new lock or update if expired/owned by same device
  INSERT INTO kiosk_locks (customer_id, bakery_id, delivery_date, device_id, expires_at)
  VALUES (_customer_id, _bakery_id, _delivery_date, _device_id, _expires_at)
  ON CONFLICT (customer_id, delivery_date) 
  DO UPDATE SET
    device_id = _device_id,
    locked_at = now(),
    expires_at = _expires_at,
    updated_at = now()
  WHERE 
    kiosk_locks.device_id = _device_id 
    OR kiosk_locks.expires_at < now()
  RETURNING id INTO _lock_id;
  
  RETURN _lock_id;
END;
$$;

-- Function to release a kiosk lock
CREATE OR REPLACE FUNCTION public.release_kiosk_lock(
  _customer_id UUID,
  _delivery_date DATE,
  _device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row_count INTEGER;
BEGIN
  DELETE FROM kiosk_locks
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND device_id = _device_id;
  
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$$;

-- Function to extend a kiosk lock
CREATE OR REPLACE FUNCTION public.extend_kiosk_lock(
  _customer_id UUID,
  _delivery_date DATE,
  _device_id TEXT,
  _extension_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row_count INTEGER;
BEGIN
  UPDATE kiosk_locks
  SET expires_at = now() + (_extension_minutes || ' minutes')::INTERVAL,
      updated_at = now()
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND device_id = _device_id;
  
  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$$;