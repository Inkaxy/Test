-- Create role enum type
CREATE TYPE public.app_role AS ENUM ('super_admin', 'bakery_admin', 'bakery_user');

-- Create packing mode enum
CREATE TYPE public.packing_mode AS ENUM ('product_based', 'customer_based');

-- Create deviation type enum
CREATE TYPE public.deviation_type AS ENUM ('shortage', 'damaged', 'wrong_product', 'other');

-- Create packing status enum
CREATE TYPE public.packing_status_enum AS ENUM ('pending', 'packed', 'deviation');

-- ============================================
-- BASE TABLES
-- ============================================

-- Bakeries table (multi-tenant root)
CREATE TABLE public.bakeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_id TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories per bakery
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  packing_mode public.packing_mode DEFAULT 'product_based',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bakery_id, name)
);

-- Products per bakery
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  product_number TEXT NOT NULL,
  name TEXT NOT NULL,
  pieces_per_tray INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bakery_id, product_number)
);

-- Customers per bakery
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  customer_number TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bakery_id, customer_number)
);

-- User profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bakery_id UUID REFERENCES public.bakeries(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  bakery_id UUID REFERENCES public.bakeries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, bakery_id)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  delivery_date DATE NOT NULL,
  import_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bakery_id, product_id, customer_id, delivery_date)
);

-- Packing status per order
CREATE TABLE public.packing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.packing_status_enum DEFAULT 'pending',
  packed_by UUID REFERENCES auth.users(id),
  packed_at TIMESTAMPTZ,
  deviation_type public.deviation_type,
  deviation_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

-- Import batches for tracking file imports
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bakery_id UUID NOT NULL REFERENCES public.bakeries(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  imported_by UUID REFERENCES auth.users(id),
  products_count INT DEFAULT 0,
  customers_count INT DEFAULT 0,
  orders_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bakery_id, delivery_date)
);

-- ============================================
-- HELPER FUNCTIONS (Security Definer)
-- ============================================

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
$$;

-- Check if user has role for specific bakery
CREATE OR REPLACE FUNCTION public.has_bakery_role(_bakery_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND bakery_id = _bakery_id
    AND role = _role
  )
$$;

-- Check if user can access bakery (any role)
CREATE OR REPLACE FUNCTION public.can_access_bakery(_bakery_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND bakery_id = _bakery_id
  )
$$;

-- Get user's bakery_id from profile
CREATE OR REPLACE FUNCTION public.get_user_bakery_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bakery_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.bakeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR BAKERIES
-- ============================================

CREATE POLICY "Super admins can do everything with bakeries"
ON public.bakeries FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view their bakery"
ON public.bakeries FOR SELECT
TO authenticated
USING (public.can_access_bakery(id));

-- ============================================
-- RLS POLICIES FOR CATEGORIES
-- ============================================

CREATE POLICY "Super admins can do everything with categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can manage their categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their categories"
ON public.categories FOR SELECT
TO authenticated
USING (public.can_access_bakery(bakery_id));

-- ============================================
-- RLS POLICIES FOR PRODUCTS
-- ============================================

CREATE POLICY "Super admins can do everything with products"
ON public.products FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can manage their products"
ON public.products FOR ALL
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their products"
ON public.products FOR SELECT
TO authenticated
USING (public.can_access_bakery(bakery_id));

-- ============================================
-- RLS POLICIES FOR CUSTOMERS
-- ============================================

CREATE POLICY "Super admins can do everything with customers"
ON public.customers FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can manage their customers"
ON public.customers FOR ALL
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.can_access_bakery(bakery_id));

-- ============================================
-- RLS POLICIES FOR PROFILES
-- ============================================

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can view profiles in their bakery"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'));

-- ============================================
-- RLS POLICIES FOR USER_ROLES
-- ============================================

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can view roles in their bakery"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery admins can manage bakery_user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_bakery_role(bakery_id, 'bakery_admin')
  AND role = 'bakery_user'
);

-- ============================================
-- RLS POLICIES FOR ORDERS
-- ============================================

CREATE POLICY "Super admins can do everything with orders"
ON public.orders FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can manage their orders"
ON public.orders FOR ALL
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.can_access_bakery(bakery_id));

-- ============================================
-- RLS POLICIES FOR PACKING_STATUS
-- ============================================

CREATE POLICY "Super admins can do everything with packing_status"
ON public.packing_status FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can manage packing status for their bakery"
ON public.packing_status FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND public.can_access_bakery(o.bakery_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND public.can_access_bakery(o.bakery_id)
  )
);

-- ============================================
-- RLS POLICIES FOR IMPORT_BATCHES
-- ============================================

CREATE POLICY "Super admins can do everything with import_batches"
ON public.import_batches FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Bakery admins can manage their import batches"
ON public.import_batches FOR ALL
TO authenticated
USING (public.has_bakery_role(bakery_id, 'bakery_admin'))
WITH CHECK (public.has_bakery_role(bakery_id, 'bakery_admin'));

CREATE POLICY "Bakery users can view their import batches"
ON public.import_batches FOR SELECT
TO authenticated
USING (public.can_access_bakery(bakery_id));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bakeries_updated_at
BEFORE UPDATE ON public.bakeries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_packing_status_updated_at
BEFORE UPDATE ON public.packing_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TRIGGER TO AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_categories_bakery ON public.categories(bakery_id);
CREATE INDEX idx_products_bakery ON public.products(bakery_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_customers_bakery ON public.customers(bakery_id);
CREATE INDEX idx_orders_bakery ON public.orders(bakery_id);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX idx_orders_product ON public.orders(product_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_packing_status_order ON public.packing_status(order_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_bakery ON public.user_roles(bakery_id);
CREATE INDEX idx_profiles_bakery ON public.profiles(bakery_id);
CREATE INDEX idx_import_batches_bakery ON public.import_batches(bakery_id);