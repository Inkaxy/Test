import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, GripVertical, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '@/hooks/useCategories';
import { useOneDriveConfigs } from '@/hooks/useOneDriveConfig';
import { useToast } from '@/hooks/use-toast';
import { OneDriveConfigDialog } from '@/components/categories/OneDriveConfigDialog';
interface CategoryFormData {
  name: string;
  packing_mode: 'product_based' | 'customer_based';
  sort_order: number;
  is_active: boolean;
  card_color: string;
}

const emptyForm: CategoryFormData = {
  name: '',
  packing_mode: 'product_based',
  sort_order: 0,
  is_active: true,
  card_color: 'primary',
};

export default function Categories() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);
  const [oneDriveCategory, setOneDriveCategory] = useState<Category | null>(null);
  
  const { data: categories = [], isLoading } = useCategories();
  const { data: oneDriveConfigs = [] } = useOneDriveConfigs();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  
  const getOneDriveStatus = (categoryId: string) => {
    const config = oneDriveConfigs.find(c => c.category_id === categoryId);
    return config?.sync_status || 'not_configured';
  };
  
  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditCategory(category);
      setFormData({
        name: category.name,
        packing_mode: category.packing_mode,
        sort_order: category.sort_order,
        is_active: category.is_active ?? true,
        card_color: category.card_color || 'primary',
      });
    } else {
      setEditCategory(null);
      setFormData({
        ...emptyForm,
        sort_order: categories.length + 1,
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    try {
      if (editCategory) {
        await updateCategory.mutateAsync({ id: editCategory.id, ...formData });
        toast({ title: t('common.success'), description: 'Kategori oppdatert' });
      } else {
        await createCategory.mutateAsync(formData);
        toast({ title: t('common.success'), description: 'Kategori opprettet' });
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
    if (!deleteCategory) return;
    
    try {
      await deleteCategoryMutation.mutateAsync(deleteCategory.id);
      toast({ title: t('common.success'), description: 'Kategori slettet' });
      setDeleteCategory(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke slette kategori. Det kan ha tilknyttede produkter.',
      });
    }
  };
  
  const isSaving = createCategory.isPending || updateCategory.isPending;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('categories.title')}</h1>
          <p className="text-muted-foreground">
            {categories.length} {t('categories.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4" />
          {t('categories.addCategory')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            {t('categories.sortOrder')}
          </p>
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('categories.categoryName')}</TableHead>
                  <TableHead>{t('categories.packingMode')}</TableHead>
                  <TableHead>OneDrive</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('categories.noCategories')}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => {
                    const oneDriveStatus = getOneDriveStatus(category.id);
                    
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.packing_mode === 'product_based' 
                              ? t('categories.productBased') 
                              : t('categories.customerBased')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOneDriveCategory(category)}
                            className="gap-1"
                          >
                            {oneDriveStatus === 'configured' ? (
                              <>
                                <Cloud className="h-4 w-4 text-success" />
                                <span className="text-xs text-success">Koblet</span>
                              </>
                            ) : (
                              <>
                                <CloudOff className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Koble</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? t('products.active') : t('products.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteCategory(category)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
              {editCategory ? t('categories.editCategory') : t('categories.addCategory')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('categories.categoryName')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="f.eks. Brød"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('categories.packingMode')}</Label>
              <Select
                value={formData.packing_mode}
                onValueChange={(v) => setFormData(prev => ({ 
                  ...prev, 
                  packing_mode: v as 'product_based' | 'customer_based' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_based">{t('categories.productBased')}</SelectItem>
                  <SelectItem value="customer_based">{t('categories.customerBased')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('categories.sortOrder')}</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  sort_order: parseInt(e.target.value) || 0 
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>{t('products.active')}</Label>
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
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteConfirm')}
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
      
      {/* OneDrive config dialog */}
      <OneDriveConfigDialog
        category={oneDriveCategory}
        open={!!oneDriveCategory}
        onOpenChange={(open) => !open && setOneDriveCategory(null)}
      />
    </div>
  );
}
