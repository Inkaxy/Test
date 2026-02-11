import { supabase } from '@/integrations/supabase/client';
import type { DeviceCommand, DeviceCommandAction } from '@/types/kioskos/commands';
import { getCommandEndpoint } from '@/types/kioskos/commands';

interface CommandOptions {
  /** Prefer LAN connection when available */
  preferLan?: boolean;
  /** LAN endpoint host:port for the device */
  lanEndpoint?: string;
  /** LAN auth token */
  lanToken?: string;
}

/**
 * Send a command to a device.
 * Tries LAN first (if available), then falls back to Supabase Realtime broadcast.
 */
export async function sendDeviceCommand(
  deviceId: string,
  command: DeviceCommand,
  options: CommandOptions = {}
): Promise<void> {
  // Try LAN first
  if (options.preferLan && options.lanEndpoint) {
    try {
      await sendViaLan(options.lanEndpoint, options.lanToken || '', command);
      return;
    } catch {
      console.warn('LAN command failed, falling back to cloud');
    }
  }

  // Fallback: Supabase Realtime broadcast
  await sendViaCloud(deviceId, command);
}

async function sendViaLan(
  endpoint: string,
  token: string,
  command: DeviceCommand
): Promise<void> {
  const url = `http://${endpoint}/api/v1/${getCommandEndpoint(command.action)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(command.params),
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`LAN command failed: HTTP ${response.status}`);
  }
}

async function sendViaCloud(
  deviceId: string,
  command: DeviceCommand
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const channel = supabase.channel(`device-${deviceId}`);

  await channel.send({
    type: 'broadcast',
    event: 'command',
    payload: {
      action: command.action,
      params: command.params,
      sender: user?.id,
      timestamp: Date.now(),
    },
  });

  supabase.removeChannel(channel);
}

/**
 * Subscribe to commands for a device (used by kiosk mode).
 */
export function subscribeToCommands(
  deviceId: string,
  onCommand: (command: { action: DeviceCommandAction; params: Record<string, unknown> }) => void
) {
  const channel = supabase
    .channel(`device-${deviceId}`)
    .on('broadcast', { event: 'command' }, (payload) => {
      if (payload.payload) {
        onCommand(payload.payload as { action: DeviceCommandAction; params: Record<string, unknown> });
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
