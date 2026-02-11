import { useMutation } from '@tanstack/react-query';
import { sendDeviceCommand } from '@/lib/kioskos/commands';
import type { DeviceCommand } from '@/types/kioskos/commands';
import { createCommand } from '@/types/kioskos/commands';
import { useToast } from '@/hooks/use-toast';

export function useDeviceControl(deviceId: string) {
  const { toast } = useToast();

  const commandMutation = useMutation({
    mutationFn: (command: DeviceCommand) =>
      sendDeviceCommand(deviceId, command),
    onError: (error: Error) => {
      toast({
        title: 'Kommando feilet',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    sendCommand: commandMutation.mutate,
    isLoading: commandMutation.isPending,

    loadUrl: (url: string) =>
      commandMutation.mutateAsync(createCommand('loadUrl', { url })),

    setBrightness: (level: number) =>
      commandMutation.mutateAsync(createCommand('setBrightness', { level })),

    screenOn: () =>
      commandMutation.mutateAsync(createCommand('screenOn')),

    screenOff: () =>
      commandMutation.mutateAsync(createCommand('screenOff')),

    speak: (text: string, language = 'nb-NO') =>
      commandMutation.mutateAsync(createCommand('speak', { text, language })),

    restart: () =>
      commandMutation.mutateAsync(createCommand('restart')),

    takeScreenshot: () =>
      commandMutation.mutateAsync(createCommand('screenshot')),

    updateConfig: (config: Record<string, unknown>) =>
      commandMutation.mutateAsync(createCommand('updateConfig', config)),
  };
}
