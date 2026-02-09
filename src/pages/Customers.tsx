import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Loader2, Settings } from 'lucide-react';
import { useState } from 'react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, Customer } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { CustomerScreenSettingsDialog } from '@/components/customers/CustomerScreenSettingsDialog';

interface CustomerFormData {
  customer_number: string;
  name: string;
  address: string | null;
  is_active: boolean;
  priority: number;
}

const emptyForm: CustomerFormData = {
  customer_number: '',
  name: '',
  address: null,
  is_active: true,
  priority: 50,
};

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [screenSettingsCustomer, setScreenSettingsCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);
  
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customer_number.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditCustomer(customer);
      setFormData({
        customer_number: customer.customer_number,
        name: customer.name,
        address: customer.address,
        is_active: customer.is_active ?? true,
        priority: customer.priority ?? 50,
      });
    } else {
      setEditCustomer(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    try {
      if (editCustomer) {
        await updateCustomer.mutateAsync({ id: editCustomer.id, ...formData });
        toast({ title: t('common.success'), description: 'Kunde oppdatert' });
      } else {
        await createCustomer.mutateAsync({
          ...formData,
          has_dedicated_display: false,
          display_token: null,
          short_display_id: null,
        });
        toast({ title: t('common.success'), description: 'Kunde opprettet' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Noe gikk galt',
      });
    }
  };
  
  const handleDelete = async () => {
    if (!deleteCustomer) return;
    
    try {
      await deleteCustomerMutation.mutateAsync(deleteCustomer.id);
      toast({ title: t('common.success'), description: 'Kunde slettet' });
      setDeleteCustomer(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke slette kunde. Det kan ha tilknyttede ordrer.',
      });
    }
  };
  
  const isSaving = createCustomer.isPending || updateCustomer.isPending;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('customers.title')}</h1>
          <p className="text-muted-foreground">
            {filteredCustomers.length} {t('customers.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4" />
          {t('customers.addCustomer')}
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Prioritet</TableHead>
                  <TableHead>{t('customers.customerNumber')}</TableHead>
                  <TableHead>{t('customers.customerName')}</TableHead>
                  <TableHead>{t('customers.address')}</TableHead>
                  <TableHead>Skjerm</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('customers.noCustomers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers
                    .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50))
                    .map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-center">
                        <Badge variant={customer.priority && customer.priority < 50 ? 'default' : 'secondary'} className="font-mono">
                          {customer.priority ?? 50}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{customer.customer_number}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.address || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.has_dedicated_display ? 'default' : 'secondary'}
                          className={customer.has_dedicated_display ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                          {customer.has_dedicated_display ? 'Egen' : 'Felles'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                          {customer.is_active ? t('customers.active') : t('customers.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setScreenSettingsCustomer(customer)} title="Skjerminnstillinger">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(customer)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteCustomer(customer)}>
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
      
      {/* Edit/Create dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('customers.customerNumber')}</Label>
              <Input
                value={formData.customer_number}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_number: e.target.value }))}
                placeholder="f.eks. K001"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('customers.customerName')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="f.eks. Rema 1000 Storgata"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('customers.address')}</Label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value || null }))}
                placeholder={t('common.optional')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Prioritet (pakkerekkefølge)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 50 }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  1 = Høyest prioritet (pakkes først)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Kunder med lavere tall pakkes før kunder med høyere tall. Standard er 50.
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('customers.active')}</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.customer_number || !formData.name}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customers.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Screen settings dialog */}
      <CustomerScreenSettingsDialog
        customer={screenSettingsCustomer}
        open={!!screenSettingsCustomer}
        onOpenChange={(open) => !open && setScreenSettingsCustomer(null)}
      />
    </div>
  );
}
