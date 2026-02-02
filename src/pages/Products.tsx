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
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

interface ProductFormData {
  product_number: string;
  name: string;
  category_id: string | null;
  pieces_per_tray: number | null;
  is_active: boolean;
}

const emptyForm: ProductFormData = {
  product_number: '',
  name: '',
  category_id: null,
  pieces_per_tray: null,
  is_active: true,
};

export default function Products() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_number.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditProduct(product);
      setFormData({
        product_number: product.product_number,
        name: product.name,
        category_id: product.category_id,
        pieces_per_tray: product.pieces_per_tray,
        is_active: product.is_active ?? true,
      });
    } else {
      setEditProduct(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    try {
      if (editProduct) {
        await updateProduct.mutateAsync({ id: editProduct.id, ...formData });
        toast({ title: t('common.success'), description: 'Produkt oppdatert' });
      } else {
        await createProduct.mutateAsync(formData);
        toast({ title: t('common.success'), description: 'Produkt opprettet' });
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
    if (!deleteProduct) return;
    
    try {
      await deleteProductMutation.mutateAsync(deleteProduct.id);
      toast({ title: t('common.success'), description: 'Produkt slettet' });
      setDeleteProduct(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke slette produkt. Det kan ha tilknyttede ordrer.',
      });
    }
  };
  
  const isSaving = createProduct.isPending || updateProduct.isPending;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} {t('products.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4" />
          {t('products.addProduct')}
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
                  <TableHead>{t('products.productNumber')}</TableHead>
                  <TableHead>{t('products.productName')}</TableHead>
                  <TableHead>{t('products.category')}</TableHead>
                  <TableHead>{t('products.piecesPerTray')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('products.noProducts')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.product_number}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name || '-'}</TableCell>
                      <TableCell>{product.pieces_per_tray || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? t('products.active') : t('products.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteProduct(product)}>
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
              {editProduct ? t('products.editProduct') : t('products.addProduct')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('products.productNumber')}</Label>
              <Input
                value={formData.product_number}
                onChange={(e) => setFormData(prev => ({ ...prev, product_number: e.target.value }))}
                placeholder="f.eks. GB001"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('products.productName')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="f.eks. Grovbrød"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('products.category')}</Label>
              <Select
                value={formData.category_id || 'none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.optional')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('products.piecesPerTray')}</Label>
              <Input
                type="number"
                value={formData.pieces_per_tray || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  pieces_per_tray: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder={t('common.optional')}
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
            <Button onClick={handleSave} disabled={isSaving || !formData.product_number || !formData.name}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.deleteConfirm')}
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
    </div>
  );
}
