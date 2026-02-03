import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCategory } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

interface AddPackingCategoryCardProps {
  sortOrder: number;
}

export function AddPackingCategoryCard({ sortOrder }: AddPackingCategoryCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [packingMode, setPackingMode] = useState<'product_based' | 'customer_based'>('product_based');
  
  const createCategory = useCreateCategory();
  
  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      await createCategory.mutateAsync({
        name: name.trim(),
        packing_mode: packingMode,
        sort_order: sortOrder,
        is_active: true,
        card_color: 'primary',
      });
      
      toast({ title: 'Pakkealternativ opprettet' });
      setIsOpen(false);
      setName('');
      setPackingMode('product_based');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke opprette',
      });
    }
  };
  
  return (
    <>
      <Card 
        className="cursor-pointer border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-200"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[180px]">
          <Plus className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center">
            Legg til flere pakke alternativer<br />
            med egen opplasting av filer
          </p>
        </CardContent>
      </Card>
      
      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nytt pakkealternativ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Navn</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="f.eks. Brød, Småvarer, Kaker..."
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pakkemodus</Label>
              <Select
                value={packingMode}
                onValueChange={(v) => setPackingMode(v as 'product_based' | 'customer_based')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_based">{t('categories.productBased')}</SelectItem>
                  <SelectItem value="customer_based">{t('categories.customerBased')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {packingMode === 'product_based' 
                  ? 'Pakker produkt for produkt til alle kunder'
                  : 'Pakker alle produkter for én kunde om gangen'
                }
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createCategory.isPending || !name.trim()}
            >
              {createCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
