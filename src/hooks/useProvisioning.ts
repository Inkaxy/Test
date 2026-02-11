import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  generateProvisionCode,
  fetchActiveProvisionCodes,
  fetchConfigTemplates,
  createConfigTemplate,
  deleteConfigTemplate,
} from '@/lib/kioskos/provisioning';
import type { ConfigTemplate } from '@/types/kioskos/provisioning';

export function useProvisionCodes(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['provision-codes', tenantId],
    queryFn: () => fetchActiveProvisionCodes(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh to check expiry
  });
}

export function useGenerateProvisionCode(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceName, templateId }: {
      deviceName: string;
      templateId?: string;
    }) => generateProvisionCode(tenantId, deviceName, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provision-codes', tenantId] });
    },
  });
}

export function useConfigTemplates(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['config-templates', tenantId],
    queryFn: () => fetchConfigTemplates(tenantId!),
    enabled: !!tenantId,
  });
}

export function useCreateConfigTemplate(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, config, description }: {
      name: string;
      config: Record<string, unknown>;
      description?: string;
    }) => createConfigTemplate(tenantId, name, config, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-templates', tenantId] });
    },
  });
}

export function useDeleteConfigTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteConfigTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-templates'] });
    },
  });
}
