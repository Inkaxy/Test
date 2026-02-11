import { supabase } from '@/integrations/supabase/client';
import type { ProvisionCode, ConfigTemplate } from '@/types/kioskos/provisioning';

export async function generateProvisionCode(
  tenantId: string,
  deviceName: string,
  templateId?: string
): Promise<ProvisionCode> {
  // Generate a 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // If a template is specified, fetch its config
  let config: Record<string, unknown> = {};
  if (templateId) {
    const { data: template } = await supabase
      .from('config_templates')
      .select('config')
      .eq('id', templateId)
      .single();

    if (template) {
      config = template.config as Record<string, unknown>;
    }
  }

  // Expires in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('provision_codes')
    .insert({
      tenant_id: tenantId,
      code,
      device_name: deviceName,
      config,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProvisionCode;
}

export async function fetchProvisionCodes(tenantId: string): Promise<ProvisionCode[]> {
  const { data, error } = await supabase
    .from('provision_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProvisionCode[];
}

export async function fetchActiveProvisionCodes(tenantId: string): Promise<ProvisionCode[]> {
  const { data, error } = await supabase
    .from('provision_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProvisionCode[];
}

export async function fetchConfigTemplates(tenantId: string): Promise<ConfigTemplate[]> {
  const { data, error } = await supabase
    .from('config_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) throw error;
  return data as ConfigTemplate[];
}

export async function createConfigTemplate(
  tenantId: string,
  name: string,
  config: Record<string, unknown>,
  description?: string
): Promise<ConfigTemplate> {
  const { data, error } = await supabase
    .from('config_templates')
    .insert({
      tenant_id: tenantId,
      name,
      description: description || null,
      config,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ConfigTemplate;
}

export async function updateConfigTemplate(
  templateId: string,
  updates: Partial<Pick<ConfigTemplate, 'name' | 'description' | 'config' | 'is_default'>>
): Promise<ConfigTemplate> {
  const { data, error } = await supabase
    .from('config_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data as ConfigTemplate;
}

export async function deleteConfigTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('config_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}
