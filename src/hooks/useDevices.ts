import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDevices, fetchDevice, updateDevice, deleteDevice, fetchDeviceEvents, subscribeToDeviceChanges } from '@/lib/kioskos/devices';
import { useEffect } from 'react';
import type { Device } from '@/types/kioskos/device';

export function useDevices(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['devices', tenantId],
    queryFn: () => fetchDevices(tenantId!),
    enabled: !!tenantId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenantId) return;

    const unsubscribe = subscribeToDeviceChanges(tenantId, (updated) => {
      queryClient.setQueryData<Device[]>(['devices', tenantId], (old) => {
        if (!old) return old;
        return old.map((d) => (d.id === updated.id ? { ...d, ...updated } : d));
      });
    });

    return unsubscribe;
  }, [tenantId, queryClient]);

  return query;
}

export function useDevice(deviceId: string | undefined) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => fetchDevice(deviceId!),
    enabled: !!deviceId,
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, updates }: {
      deviceId: string;
      updates: Partial<Pick<Device, 'name' | 'config' | 'tags' | 'brightness'>>;
    }) => updateDevice(deviceId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.setQueryData(['device', data.id], data);
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useDeviceEvents(deviceId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['device-events', deviceId, limit],
    queryFn: () => fetchDeviceEvents(deviceId!, limit),
    enabled: !!deviceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
