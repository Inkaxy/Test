import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserTenants, fetchTenant, updateTenant, fetchTenantMembers, getUserRole } from '@/lib/kioskos/tenants';
import { useAuthStore } from '@/stores/authStore';

export function useUserTenants() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: fetchUserTenants,
    enabled: !!user,
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => fetchTenant(tenantId!),
    enabled: !!tenantId,
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, updates }: {
      tenantId: string;
      updates: Partial<Pick<import('@/types/kioskos/tenant').Tenant, 'name'>>;
    }) => updateTenant(tenantId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.setQueryData(['tenant', data.id], data);
    },
  });
}

export function useTenantMembers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-members', tenantId],
    queryFn: () => fetchTenantMembers(tenantId!),
    enabled: !!tenantId,
  });
}

export function useUserRole(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['user-role', tenantId],
    queryFn: () => getUserRole(tenantId!),
    enabled: !!tenantId,
  });
}
