import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface Customer {
  id: string;
  bakery_id: string;
  customer_number: string;
  name: string;
  address: string | null;
  is_active: boolean;
}

export function useCustomers() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['customers', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('bakery_id', bakeryId)
        .order('customer_number');
      
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'bakery_id'>) => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, bakery_id: bakeryId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
