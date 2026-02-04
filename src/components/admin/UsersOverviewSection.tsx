import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Search, Shield, Building2, User, Settings } from 'lucide-react';
import { UserRoleDialog } from './UserRoleDialog';
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

export function UsersOverviewSection() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [bakeryFilter, setBakeryFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all users with roles
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['super-admin-all-users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, bakery_id')
        .order('display_name');
      
      if (profilesError) throw profilesError;
      
      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, bakery_id');
      
      if (rolesError) throw rolesError;
      
      // Fetch all bakeries for mapping
      const { data: bakeries } = await supabase
        .from('bakeries')
        .select('id, name');
      
      // Combine data
      return (profiles || []).map(profile => ({
        ...profile,
        bakeryName: bakeries?.find(b => b.id === profile.bakery_id)?.name || null,
        roles: (roles || []).filter(r => r.user_id === profile.user_id)
      })) as UserWithRoles[];
    },
    enabled: isSuperAdmin(),
  });

  // Fetch bakeries for filter dropdown
  const { data: bakeries = [] } = useQuery({
    queryKey: ['super-admin-bakeries-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bakeries')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Bakery[];
    },
    enabled: isSuperAdmin(),
  });

  // Filter users based on search and bakery filter
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      // Search filter
      const matchesSearch = !searchQuery || 
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.user_id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Bakery filter
      const matchesBakery = bakeryFilter === 'all' || 
        user.bakery_id === bakeryFilter ||
        user.roles.some(r => r.bakery_id === bakeryFilter);
      
      return matchesSearch && matchesBakery;
    });
  }, [allUsers, searchQuery, bakeryFilter]);

  const handleEditRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDialogOpen(true);
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
    return bakeries.find(b => b.id === bakeryId)?.name || bakeryId.slice(0, 8);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('superAdmin.allUsers')}
          </CardTitle>
          <CardDescription>
            {t('superAdmin.allUsersDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('superAdmin.searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={bakeryFilter} onValueChange={setBakeryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('superAdmin.filterByBakery')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superAdmin.allBakeriesFilter')}</SelectItem>
                {bakeries.map((bakery) => (
                  <SelectItem key={bakery.id} value={bakery.id}>
                    {bakery.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('users.noUsers')}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('bakeries.title')}</TableHead>
                    <TableHead>{t('superAdmin.userRoles')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.display_name || user.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {user.bakeryName ? (
                          <span className="text-sm">{user.bakeryName}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('superAdmin.noBakery')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              {t('superAdmin.noRoles')}
                            </span>
                          ) : (
                            user.roles.map((role) => (
                              <Badge 
                                key={role.id} 
                                variant={getRoleBadgeVariant(role.role)}
                                className="gap-1 text-xs"
                              >
                                {getRoleIcon(role.role)}
                                {t(`users.roles.${role.role}`)}
                                {role.bakery_id && (
                                  <span className="opacity-70">
                                    @ {getBakeryName(role.bakery_id)}
                                  </span>
                                )}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoles(user)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {t('superAdmin.editRoles')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        bakeries={bakeries}
      />
    </>
  );
}
