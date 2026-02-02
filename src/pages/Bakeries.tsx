import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { useState } from 'react';

// Mock data
const mockBakeries = [
  { id: '1', name: 'Bakergutta AS', shortId: 'bakergutta', isActive: true },
  { id: '2', name: 'Godt Brød', shortId: 'godtbrod', isActive: true },
  { id: '3', name: 'Åpent Bakeri', shortId: 'apentbakeri', isActive: true },
  { id: '4', name: 'Baker Hansen', shortId: 'bakerhansen', isActive: false },
];

export default function Bakeries() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredBakeries = mockBakeries.filter(bakery =>
    bakery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bakery.shortId.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('bakeries.title')}</h1>
          <p className="text-muted-foreground">
            {filteredBakeries.length} {t('bakeries.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
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
                    <TableCell className="font-mono text-muted-foreground">{bakery.shortId}</TableCell>
                    <TableCell>
                      <Badge variant={bakery.isActive ? 'default' : 'secondary'}>
                        {bakery.isActive ? t('bakeries.active') : t('bakeries.inactive')}
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
