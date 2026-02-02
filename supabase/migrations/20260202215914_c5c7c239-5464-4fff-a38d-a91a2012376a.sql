-- Customer locks table for concurrent packing
CREATE TABLE public.customer_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, delivery_date)
);

-- Enable RLS
ALTER TABLE public.customer_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view customer locks in their bakery"
ON public.customer_locks
FOR SELECT
USING (public.can_access_bakery(bakery_id));

CREATE POLICY "Users can create customer locks in their bakery"
ON public.customer_locks
FOR INSERT
WITH CHECK (public.can_access_bakery(bakery_id));

CREATE POLICY "Users can update their own locks or expired locks"
ON public.customer_locks
FOR UPDATE
USING (public.can_access_bakery(bakery_id) AND (locked_by = auth.uid() OR expires_at < now()));

CREATE POLICY "Users can delete their own locks or expired locks"
ON public.customer_locks
FOR DELETE
USING (public.can_access_bakery(bakery_id) AND (locked_by = auth.uid() OR expires_at < now()));

CREATE POLICY "Super admins can manage all locks"
ON public.customer_locks
FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_customer_locks_updated_at
BEFORE UPDATE ON public.customer_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to acquire a customer lock
CREATE OR REPLACE FUNCTION public.acquire_customer_lock(
  _customer_id UUID,
  _bakery_id UUID,
  _delivery_date DATE,
  _lock_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lock_id UUID;
  _user_id UUID;
  _expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  _user_id := auth.uid();
  _expires_at := now() + (_lock_duration_minutes || ' minutes')::INTERVAL;
  
  -- Try to insert new lock or update if expired/owned by user
  INSERT INTO customer_locks (customer_id, bakery_id, delivery_date, locked_by, expires_at)
  VALUES (_customer_id, _bakery_id, _delivery_date, _user_id, _expires_at)
  ON CONFLICT (customer_id, delivery_date) 
  DO UPDATE SET
    locked_by = _user_id,
    locked_at = now(),
    expires_at = _expires_at,
    updated_at = now()
  WHERE 
    customer_locks.locked_by = _user_id 
    OR customer_locks.expires_at < now()
  RETURNING id INTO _lock_id;
  
  RETURN _lock_id;
END;
$$;

-- Function to release a customer lock
CREATE OR REPLACE FUNCTION public.release_customer_lock(
  _customer_id UUID,
  _delivery_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted BOOLEAN;
BEGIN
  DELETE FROM customer_locks
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND locked_by = auth.uid();
  
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted > 0;
END;
$$;

-- Function to extend a customer lock
CREATE OR REPLACE FUNCTION public.extend_customer_lock(
  _customer_id UUID,
  _delivery_date DATE,
  _extension_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated BOOLEAN;
BEGIN
  UPDATE customer_locks
  SET expires_at = now() + (_extension_minutes || ' minutes')::INTERVAL,
      updated_at = now()
  WHERE customer_id = _customer_id
    AND delivery_date = _delivery_date
    AND locked_by = auth.uid();
  
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

-- Enable realtime for customer_locks
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_locks;