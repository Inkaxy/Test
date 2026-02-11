import { supabase } from '@/integrations/supabase/client';
import type { Device, DeviceEvent, DeviceEventType } from '@/types/kioskos/device';

export async function fetchDevices(tenantId: string): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) throw error;
  return data as Device[];
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .single();

  if (error) throw error;
  return data as Device;
}

export async function updateDevice(
  deviceId: string,
  updates: Partial<Pick<Device, 'name' | 'config' | 'tags' | 'brightness'>>
): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .update(updates)
    .eq('id', deviceId)
    .select()
    .single();

  if (error) throw error;
  return data as Device;
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId);

  if (error) throw error;
}

export async function fetchDeviceEvents(
  deviceId: string,
  limit = 50
): Promise<DeviceEvent[]> {
  const { data, error } = await supabase
    .from('device_events')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as DeviceEvent[];
}

export async function logDeviceEvent(
  deviceId: string,
  tenantId: string,
  eventType: DeviceEventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from('device_events')
    .insert({
      device_id: deviceId,
      tenant_id: tenantId,
      event_type: eventType,
      payload,
    });

  if (error) throw error;
}

export function subscribeToDeviceChanges(
  tenantId: string,
  onUpdate: (device: Partial<Device> & { id: string }) => void
) {
  const channel = supabase
    .channel(`devices-${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onUpdate(payload.new as Partial<Device> & { id: string });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
