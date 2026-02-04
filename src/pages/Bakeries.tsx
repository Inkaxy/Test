import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2, Loader2 } from 'lucide-react';
import { useBakeries, type Bakery } from '@/hooks/useBakeries';
import { BakeryDialog } from '@/components/bakeries/BakeryDialog';
import { TypeConfirmDialog } from '@/components/ui/type-confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function Bakeries() {
  const { t } = useTranslation();
  const { bakeries, isLoading, createBakery, updateBakery, deleteBakery } = useBakeries();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBakery, setEditingBakery] = useState<Bakery | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bakeryToDelete, setBakeryToDelete] = useState<Bakery | null>(null);
  
  const filteredBakeries = bakeries.filter(bakery =>
    bakery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bakery.short_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingBakery(null);
    setDialogOpen(true);
  };

  const handleEdit = (bakery: Bakery) => {
    setEditingBakery(bakery);
    setDialogOpen(true);
  };

  const handleDelete = (bakery: Bakery) => {
    setBakeryToDelete(bakery);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (data: { name: string; short_id: string; is_active: boolean }) => {
    if (editingBakery) {
      await updateBakery.mutateAsync({ id: editingBakery.id, ...data });
    } else {
      await createBakery.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (bakeryToDelete) {
      await deleteBakery.mutateAsync(bakeryToDelete.id);
      setDeleteDialogOpen(false);
      setBakeryToDelete(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('bakeries.title')}</h1>
          <p className="text-muted-foreground">
            {filteredBakeries.length} {t('bakeries.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          {t('bakeries.addBakery')}
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bakeries.bakeryName')}</TableHead>
                  <TableHead>{t('bakeries.shortId')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBakeries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {t('bakeries.noBakeries')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBakeries.map((bakery) => (
                    <TableRow key={bakery.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium">{bakery.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{bakery.short_id}</TableCell>
                      <TableCell>
                        <Badge variant={bakery.is_active ? 'default' : 'secondary'}>
                          {bakery.is_active ? t('bakeries.active') : t('bakeries.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(bakery)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(bakery)}>
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

      <BakeryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bakery={editingBakery}
        onSave={handleSave}
        isPending={createBakery.isPending || updateBakery.isPending}
      />

      <TypeConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('bakeries.deleteConfirm')}
        description={`${t('bakeries.deleteConfirm')} "${bakeryToDelete?.name}"`}
        confirmWord={bakeryToDelete?.name || 'JA'}
        onConfirm={confirmDelete}
        isLoading={deleteBakery.isPending}
        variant="destructive"
      />
    </div>
  );
}
