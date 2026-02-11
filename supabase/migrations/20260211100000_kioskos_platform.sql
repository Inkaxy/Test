-- KioskOS Platform v2.0 — Multi-Tenant Schema
-- Tenants, devices, provisioning, config templates, events

-- ═══════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════

-- Tenants (organisasjoner/kontoer)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    max_devices INTEGER NOT NULL DEFAULT 2,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brukere knyttet til tenants (multi-bruker per org)
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer',  -- owner, admin, viewer
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- Enheter (kiosker)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    device_token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    model TEXT,
    android_version INTEGER,
    app_version TEXT,
    current_url TEXT,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMPTZ,
    last_screenshot_url TEXT,
    battery_level INTEGER,
    battery_health TEXT,
    is_charging BOOLEAN,
    screen_on BOOLEAN,
    brightness INTEGER,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhetshendelser (tidslinje og debugging)
CREATE TABLE IF NOT EXISTS public.device_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- 'screen_on', 'url_changed', 'motion', 'error', etc.
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provisjonskoder
CREATE TABLE IF NOT EXISTS public.provision_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    device_name TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_device UUID REFERENCES public.devices(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Konfigurasjonsmaler
CREATE TABLE IF NOT EXISTS public.config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_templates ENABLE ROW LEVEL SECURITY;

-- Tenants: members can read, owner can update
CREATE POLICY "tenant_member_select" ON public.tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_owner_update" ON public.tenants
    FOR UPDATE USING (
        owner_id = auth.uid()
    );

-- Tenant members: members can see other members, owner/admin can manage
CREATE POLICY "tenant_members_select" ON public.tenant_members
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_members_insert" ON public.tenant_members
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "tenant_members_delete" ON public.tenant_members
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Devices: visible to tenant members
CREATE POLICY "device_tenant_select" ON public.devices
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "device_tenant_insert" ON public.devices
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "device_tenant_update" ON public.devices
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "device_tenant_delete" ON public.devices
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Device events: visible to tenant members
CREATE POLICY "events_tenant_select" ON public.device_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "events_tenant_insert" ON public.device_events
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Provision codes: owner/admin can manage
CREATE POLICY "provision_codes_select" ON public.provision_codes
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "provision_codes_insert" ON public.provision_codes
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "provision_codes_update" ON public.provision_codes
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Config templates: visible to members, manageable by owner/admin
CREATE POLICY "config_templates_select" ON public.config_templates
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "config_templates_insert" ON public.config_templates
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "config_templates_update" ON public.config_templates
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "config_templates_delete" ON public.config_templates
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ═══════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════

CREATE INDEX idx_tenants_owner ON public.tenants(owner_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_devices_tenant ON public.devices(tenant_id);
CREATE INDEX idx_devices_online ON public.devices(tenant_id, is_online);
CREATE INDEX idx_devices_token ON public.devices(device_token);
CREATE INDEX idx_events_device ON public.device_events(device_id, created_at DESC);
CREATE INDEX idx_events_tenant ON public.device_events(tenant_id, created_at DESC);
CREATE INDEX idx_provision_code ON public.provision_codes(code) WHERE used_at IS NULL;
CREATE INDEX idx_config_templates_tenant ON public.config_templates(tenant_id);

-- ═══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.kioskos_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.kioskos_set_updated_at();

CREATE TRIGGER set_devices_updated_at
    BEFORE UPDATE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.kioskos_set_updated_at();

CREATE TRIGGER set_config_templates_updated_at
    BEFORE UPDATE ON public.config_templates
    FOR EACH ROW EXECUTE FUNCTION public.kioskos_set_updated_at();

-- Auto-create tenant and membership when user signs up
CREATE OR REPLACE FUNCTION public.kioskos_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- Create a default tenant for the new user
    INSERT INTO public.tenants (owner_id, name, plan, max_devices)
    VALUES (
        NEW.id,
        COALESCE(split_part(NEW.email, '@', 1), 'My') || '''s Workspace',
        'free',
        2
    )
    RETURNING id INTO new_tenant_id;

    -- Add user as owner of the tenant
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (new_tenant_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook into Supabase auth.users
CREATE TRIGGER on_kioskos_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.kioskos_handle_new_user();

-- Realtime subscriptions for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_events;
