import { supabase } from '@/integrations/supabase/client';
import type { Tenant, TenantMember, MemberRole } from '@/types/kioskos/tenant';

export async function fetchUserTenants(): Promise<Tenant[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: memberships, error: memberError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id);

  if (memberError) throw memberError;
  if (!memberships?.length) return [];

  const tenantIds = memberships.map((m) => m.tenant_id);

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .in('id', tenantIds);

  if (error) throw error;
  return data as Tenant[];
}

export async function fetchTenant(tenantId: string): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function updateTenant(
  tenantId: string,
  updates: Partial<Pick<Tenant, 'name'>>
): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function fetchTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) throw error;
  return data as TenantMember[];
}

export async function inviteTenantMember(
  tenantId: string,
  userId: string,
  role: MemberRole = 'viewer'
): Promise<TenantMember> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tenant_members')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TenantMember;
}

export async function removeTenantMember(
  tenantId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('tenant_members')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getUserRole(tenantId: string): Promise<MemberRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (error) return null;
  return data.role as MemberRole;
}
