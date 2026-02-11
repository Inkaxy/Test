export interface ProvisionCode {
  id: string;
  tenant_id: string;
  code: string;
  device_name: string | null;
  config: Record<string, unknown>;
  expires_at: string;
  used_at: string | null;
  used_by_device: string | null;
  created_at: string;
}

export interface ConfigTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProvisionCodeRequest {
  device_name: string;
  template_id?: string;
}

export interface ProvisionDeviceRequest {
  code: string;
  device_id: string;
  device_name: string;
  android_version: number;
}

export interface ProvisionDeviceResponse {
  device_id: string;
  device_token: string;
  tenant_id: string;
  config: Record<string, unknown>;
  plan: string;
}
