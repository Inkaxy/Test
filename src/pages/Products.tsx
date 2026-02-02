import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Mock data
const mockProducts = [
  { id: '1', productNumber: 'GB001', name: 'Grovbrød', category: 'Brød', piecesPerTray: 12, isActive: true },
  { id: '2', productNumber: 'LO001', name: 'Loff', category: 'Brød', piecesPerTray: 8, isActive: true },
  { id: '3', productNumber: 'RS001', name: 'Rundstykker', category: 'Småvarer', piecesPerTray: 24, isActive: true },
  { id: '4', productNumber: 'CR001', name: 'Croissant', category: 'Småvarer', piecesPerTray: 10, isActive: true },
  { id: '5', productNumber: 'KB001', name: 'Kanelboller', category: 'Konditori', piecesPerTray: 15, isActive: false },
];

export default function Products() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.productNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} {t('products.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
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
                    <TableCell className="font-mono">{product.productNumber}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.piecesPerTray || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? t('products.active') : t('products.inactive')}
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
