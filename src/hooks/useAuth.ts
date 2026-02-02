import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const store = useAuthStore();
  
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        store.setSession(session);
        store.setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            store.fetchProfile();
            store.fetchRoles();
          }, 0);
        } else {
          store.setProfile(null);
          store.setRoles([]);
        }
        
        store.setLoading(false);
        store.setInitialized(true);
      }
    );
    
    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      store.setSession(session);
      store.setUser(session?.user ?? null);
      
      if (session?.user) {
        store.fetchProfile();
        store.fetchRoles();
      }
      
      store.setLoading(false);
      store.setInitialized(true);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return store;
}
