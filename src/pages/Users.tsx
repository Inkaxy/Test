import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

type AppRole = 'super_admin' | 'bakery_admin' | 'bakery_user';

interface UserWithRole {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
}

export default function Users() {
  const { t } = useTranslation();
  const { getActiveBakeryId } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const bakeryId = getActiveBakeryId();
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['bakery-users', bakeryId],
    queryFn: async (): Promise<UserWithRole[]> => {
      if (!bakeryId) return [];
      
      // Get profiles for the bakery
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, bakery_id')
        .eq('bakery_id', bakeryId);
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];
      
      // Get roles for these users
      const userIds = profiles.map(p => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, bakery_id')
        .in('user_id', userIds);
      
      if (rolesError) throw rolesError;
      
      // Get user emails from auth (via profiles - we don't have direct access)
      // For now, we'll display the display_name and use user_id as identifier
      // In production, you might want an edge function to fetch emails
      
      return profiles.map(profile => {
        // Find the role for this user (prioritize bakery-specific roles)
        const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
        const bakeryRole = userRoles.find(r => r.bakery_id === bakeryId);
        const superAdminRole = userRoles.find(r => r.role === 'super_admin');
        
        let role: AppRole = 'bakery_user';
        if (superAdminRole) {
          role = 'super_admin';
        } else if (bakeryRole) {
          role = bakeryRole.role;
        }
        
        return {
          id: profile.user_id,
          displayName: profile.display_name || 'Ukjent bruker',
          email: '', // We can't access auth.users directly
          role,
        };
      });
    },
    enabled: !!bakeryId,
  });
  
  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-primary">{t('users.roles.super_admin')}</Badge>;
      case 'bakery_admin':
        return <Badge variant="default">{t('users.roles.bakery_admin')}</Badge>;
      default:
        return <Badge variant="secondary">{t('users.roles.bakery_user')}</Badge>;
    }
  };
  
  if (!bakeryId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{t('superAdmin.noBakerySelected')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('users.title')}</h1>
          <p className="text-muted-foreground">
            {filteredUsers.length} {t('users.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('users.addUser')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {t('users.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
