import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Shield, Building2, User } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  bakery_id: string | null;
}

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  bakery_id: string | null;
  bakeryName: string | null;
  roles: UserRole[];
}

interface Bakery {
  id: string;
  name: string;
}

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  bakeries: Bakery[];
}

const ROLE_OPTIONS: { value: AppRole; requiresBakery: boolean }[] = [
  { value: 'super_admin', requiresBakery: false },
  { value: 'bakery_admin', requiresBakery: true },
  { value: 'bakery_user', requiresBakery: true },
];

export function UserRoleDialog({ open, onOpenChange, user, bakeries }: UserRoleDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [newBakeryId, setNewBakeryId] = useState<string>('');
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [selectedBakeryId, setSelectedBakeryId] = useState<string>('');

  // Sync selected bakery when user changes
  useEffect(() => {
    if (user) {
      setSelectedBakeryId(user.bakery_id || '');
    }
  }, [user]);

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, bakeryId }: { userId: string; role: AppRole; bakeryId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role, 
          bakery_id: bakeryId 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-all-users'] });
      toast.success(t('superAdmin.roleAdded'));
      setNewRole('');
      setNewBakeryId('');
    },
    onError: () => {
      toast.error(t('errors.generic'));
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-all-users'] });
      toast.success(t('superAdmin.roleRemoved'));
      setRoleToDelete(null);
    },
    onError: () => {
      toast.error(t('errors.generic'));
    }
  });

  const updateBakeryMutation = useMutation({
    mutationFn: async ({ userId, bakeryId }: { userId: string; bakeryId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ bakery_id: bakeryId })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-all-users'] });
      toast.success(t('superAdmin.bakeryUpdated'));
    },
    onError: () => {
      toast.error(t('errors.generic'));
    }
  });

  const handleAddRole = () => {
    if (!user || !newRole) return;
    
    const roleConfig = ROLE_OPTIONS.find(r => r.value === newRole);
    const bakeryId = roleConfig?.requiresBakery ? newBakeryId || null : null;
    
    if (roleConfig?.requiresBakery && !bakeryId) {
      toast.error(t('superAdmin.selectBakeryForRole'));
      return;
    }
    
    addRoleMutation.mutate({ 
      userId: user.user_id, 
      role: newRole, 
      bakeryId 
    });
  };

  const handleRemoveRole = (role: UserRole) => {
    // Prevent super admin from removing their own super_admin role
    if (role.role === 'super_admin' && role.user_id === currentUser?.id) {
      toast.error(t('superAdmin.cannotRemoveOwnRole'));
      return;
    }
    setRoleToDelete(role);
  };

  const confirmRemoveRole = () => {
    if (roleToDelete) {
      removeRoleMutation.mutate(roleToDelete.id);
    }
  };

  const handleBakeryChange = (bakeryId: string) => {
    if (!user) return;
    const newBakeryIdValue = bakeryId === 'none' ? null : bakeryId;
    setSelectedBakeryId(bakeryId);
    updateBakeryMutation.mutate({ userId: user.user_id, bakeryId: newBakeryIdValue });
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-3 w-3" />;
      case 'bakery_admin':
        return <Building2 className="h-3 w-3" />;
      case 'bakery_user':
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive' as const;
      case 'bakery_admin':
        return 'default' as const;
      case 'bakery_user':
        return 'secondary' as const;
    }
  };

  const getBakeryName = (bakeryId: string | null) => {
    if (!bakeryId) return null;
    return bakeries.find(b => b.id === bakeryId)?.name || bakeryId;
  };

  const selectedRoleConfig = ROLE_OPTIONS.find(r => r.value === newRole);

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('superAdmin.userRoles')}
            </DialogTitle>
            <DialogDescription>
              {user.display_name || user.user_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Roles */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('superAdmin.currentRoles')}</h4>
              {user.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('superAdmin.noRoles')}</p>
              ) : (
                <div className="space-y-2">
                  {user.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(role.role)} className="gap-1">
                          {getRoleIcon(role.role)}
                          {t(`users.roles.${role.role}`)}
                        </Badge>
                        {role.bakery_id && (
                          <span className="text-xs text-muted-foreground">
                            @ {getBakeryName(role.bakery_id)}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveRole(role)}
                        disabled={removeRoleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Add New Role */}
            <div>
              <h4 className="text-sm font-medium mb-2">{t('superAdmin.addRole')}</h4>
              <div className="space-y-3">
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('superAdmin.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(option.value)}
                          {t(`users.roles.${option.value}`)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedRoleConfig?.requiresBakery && (
                  <Select value={newBakeryId} onValueChange={setNewBakeryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('superAdmin.selectBakeryForRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {bakeries.map((bakery) => (
                        <SelectItem key={bakery.id} value={bakery.id}>
                          {bakery.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button 
                  onClick={handleAddRole} 
                  disabled={!newRole || addRoleMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('superAdmin.addRole')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('superAdmin.confirmRemoveRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {roleToDelete && (
                <>
                  {t(`users.roles.${roleToDelete.role}`)}
                  {roleToDelete.bakery_id && ` @ ${getBakeryName(roleToDelete.bakery_id)}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('superAdmin.removeRole')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
