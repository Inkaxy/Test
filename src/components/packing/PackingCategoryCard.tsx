import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Upload, Edit, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, useUpdateCategory } from '@/hooks/useCategories';
import { useOneDriveConfigForCategory } from '@/hooks/useOneDriveConfig';
import { useImport } from '@/hooks/useImport';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PackingCategoryCardProps {
  category: Category;
  onOneDriveConfig: () => void;
}

export function PackingCategoryCard({ category, onOneDriveConfig }: PackingCategoryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editPackingMode, setEditPackingMode] = useState(category.packing_mode);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const updateCategory = useUpdateCategory();
  const { data: oneDriveConfig } = useOneDriveConfigForCategory(category.id);
  const { parseFiles, importData, isImporting } = useImport();
  
  const handleCardClick = () => {
    if (category.packing_mode === 'product_based') {
      navigate(`/packing?category=${category.id}`);
    } else {
      navigate(`/packing/customer?category=${category.id}`);
    }
  };
  
  const handleEditSave = async () => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: editName,
        packing_mode: editPackingMode,
      });
      toast({ title: 'Kategori oppdatert' });
      setIsEditOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke oppdatere',
      });
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };
  
  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      const { data, errors } = await parseFiles(selectedFiles);
      
      if (errors.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Parsing-feil',
          description: errors.join('\n'),
        });
      }
      
      const result = await importData({
        products: data.products,
        customers: data.customers,
        orders: data.orders,
        deliveryDate: data.deliveryDate || new Date(deliveryDate),
        categoryId: category.id,
      });
      
      toast({
        title: 'Import fullført',
        description: `${result.ordersCreated} ordrer importert til ${category.name}`,
      });
      
      setIsImportOpen(false);
      setSelectedFiles([]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import feilet',
        description: error instanceof Error ? error.message : 'Ukjent feil',
      });
    }
  };
  
  const isConfigured = oneDriveConfig?.sync_status === 'configured';
  
  return (
    <>
      {/* Main Card */}
      <Card 
        className={cn(
          "group relative cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-1",
          "bg-primary hover:bg-primary/90"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[180px]">
          {/* Category Name */}
          <h3 className="text-2xl font-bold text-primary-foreground text-center mb-2">
            {category.name.toUpperCase()}
          </h3>
          
          {/* Packing Mode Badge */}
          <p className="text-sm text-primary-foreground/80 text-center">
            ({category.packing_mode === 'product_based' 
              ? t('categories.productBased').toLowerCase() 
              : t('categories.customerBased').toLowerCase()})
          </p>
          
          {/* OneDrive Status Indicator */}
          <div className="absolute top-3 right-3">
            {isConfigured ? (
              <Cloud className="h-5 w-5 text-primary-foreground/80" />
            ) : (
              <CloudOff className="h-5 w-5 text-primary-foreground/40" />
            )}
          </div>
        </CardContent>
        
        {/* Action buttons overlay */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsImportOpen(true);
              }}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Rediger
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onOneDriveConfig();
              }}
            >
              <Cloud className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger pakkealternativ</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Navn</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="f.eks. Brød"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pakkemodus</Label>
              <Select
                value={editPackingMode}
                onValueChange={(v) => setEditPackingMode(v as 'product_based' | 'customer_based')}
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleEditSave}
              disabled={updateCategory.isPending || !editName}
            >
              {updateCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer filer til {category.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leveringsdato</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Velg filer (.CUS, .PRD, .OD0)</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Klikk for å velge filer
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".cus,.prd,.od0"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Valgte filer:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, i) => (
                    <Badge key={i} variant="secondary">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting || selectedFiles.length === 0}
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
