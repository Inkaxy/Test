import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Mock data
const mockCustomers = [
  { id: '1', customerNumber: 'K001', name: 'Rema 1000 Storgata', address: 'Storgata 15, 0184 Oslo', isActive: true },
  { id: '2', customerNumber: 'K002', name: 'Kiwi Sentrum', address: 'Karl Johans gate 22, 0160 Oslo', isActive: true },
  { id: '3', customerNumber: 'K003', name: 'Meny Byporten', address: 'Jernbanetorget 1, 0154 Oslo', isActive: true },
  { id: '4', customerNumber: 'K004', name: 'Extra Grünerløkka', address: 'Thorvald Meyers gate 56, 0555 Oslo', isActive: true },
  { id: '5', customerNumber: 'K005', name: 'Joker Tøyen', address: 'Tøyengata 2, 0578 Oslo', isActive: false },
];

export default function Customers() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customerNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('customers.title')}</h1>
          <p className="text-muted-foreground">
            {filteredCustomers.length} {t('customers.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customers.customerNumber')}</TableHead>
                <TableHead>{t('customers.customerName')}</TableHead>
                <TableHead>{t('customers.address')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('customers.noCustomers')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono">{customer.customerNumber}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.address}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                        {customer.isActive ? t('customers.active') : t('customers.inactive')}
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
