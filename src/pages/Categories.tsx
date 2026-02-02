import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

// Mock data
const mockCategories = [
  { id: '1', name: 'Brød', packingMode: 'product_based' as const, sortOrder: 1, isActive: true },
  { id: '2', name: 'Småvarer', packingMode: 'product_based' as const, sortOrder: 2, isActive: true },
  { id: '3', name: 'Konditori', packingMode: 'customer_based' as const, sortOrder: 3, isActive: true },
  { id: '4', name: 'Spesialvarer', packingMode: 'customer_based' as const, sortOrder: 4, isActive: false },
];

export default function Categories() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('categories.title')}</h1>
          <p className="text-muted-foreground">
            {mockCategories.length} {t('categories.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t('categories.categoryName')}</TableHead>
                <TableHead>{t('categories.packingMode')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('categories.noCategories')}
                  </TableCell>
                </TableRow>
              ) : (
                mockCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="cursor-grab">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {category.packingMode === 'product_based' 
                          ? t('categories.productBased') 
                          : t('categories.customerBased')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? t('products.active') : t('products.inactive')}
                      </Badge>
                    </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
