import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'bakery_admin' | 'bakery_user';

interface Profile {
  id: string;
  user_id: string;
  bakery_id: string | null;
  display_name: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  bakery_id: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRoles: (roles: UserRole[]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Helpers
  isSuperAdmin: () => boolean;
  isBakeryAdmin: (bakeryId?: string) => boolean;
  isBakeryUser: (bakeryId?: string) => boolean;
  hasAnyRole: () => boolean;
  getCurrentBakeryId: () => string | null;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  
  // Data fetching
  fetchProfile: () => Promise<void>;
  fetchRoles: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  initialized: false,
  
  // Setters
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setRoles: (roles) => set({ roles }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  
  // Role helpers
  isSuperAdmin: () => {
    const { roles } = get();
    return roles.some(r => r.role === 'super_admin');
  },
  
  isBakeryAdmin: (bakeryId) => {
    const { roles } = get();
    if (bakeryId) {
      return roles.some(r => r.role === 'bakery_admin' && r.bakery_id === bakeryId);
    }
    return roles.some(r => r.role === 'bakery_admin');
  },
  
  isBakeryUser: (bakeryId) => {
    const { roles } = get();
    if (bakeryId) {
      return roles.some(r => r.role === 'bakery_user' && r.bakery_id === bakeryId);
    }
    return roles.some(r => r.role === 'bakery_user');
  },
  
  hasAnyRole: () => {
    const { roles } = get();
    return roles.length > 0;
  },
  
  getCurrentBakeryId: () => {
    const { profile, roles } = get();
    // First check profile
    if (profile?.bakery_id) return profile.bakery_id;
    // Then check roles
    const bakeryRole = roles.find(r => r.bakery_id);
    return bakeryRole?.bakery_id || null;
  },
  
  // Auth methods
  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return { error: error as Error | null };
  },
  
  signUp: async (email, password, displayName) => {
    set({ loading: true });
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
    set({ loading: false });
    return { error: error as Error | null };
  },
  
  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, roles: [], loading: false });
  },
  
  resetPassword: async (email) => {
    const redirectUrl = `${window.location.origin}/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error as Error | null };
  },
  
  // Data fetching
  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      set({ profile: data as Profile });
    }
  },
  
  fetchRoles: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) {
      set({ roles: data as UserRole[] });
    }
  },
}));
