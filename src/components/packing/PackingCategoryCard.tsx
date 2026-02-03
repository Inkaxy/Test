import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Upload, Edit, Cloud, CloudOff, Loader2, MoreVertical, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  
  const handleMenuAction = (action: 'import' | 'edit' | 'onedrive') => {
    setIsMenuOpen(false);
    switch (action) {
      case 'import':
        setIsImportOpen(true);
        break;
      case 'edit':
        setEditName(category.name);
        setEditPackingMode(category.packing_mode);
        setIsEditOpen(true);
        break;
      case 'onedrive':
        onOneDriveConfig();
        break;
    }
  };
  
  const isConfigured = oneDriveConfig?.sync_status === 'configured';
  
  return (
    <>
      {/* Main Card */}
      <Card 
        className={cn(
          "group relative cursor-pointer transition-all duration-300",
          "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
          "bg-primary active:scale-[0.98]"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[180px] relative">
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
          
          {/* Start packing hint on hover */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Badge variant="secondary" className="gap-1 bg-white/90 text-primary">
              <Play className="h-3 w-3" />
              Start pakking
            </Badge>
          </div>
          
          {/* Menu button - always visible in corner */}
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full",
                  "bg-white/20 hover:bg-white/40 text-primary-foreground",
                  "opacity-60 group-hover:opacity-100 transition-opacity"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-2" 
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full"
                  onClick={() => handleMenuAction('import')}
                >
                  <Upload className="h-4 w-4" />
                  Importer filer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full"
                  onClick={() => handleMenuAction('edit')}
                >
                  <Edit className="h-4 w-4" />
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full"
                  onClick={() => handleMenuAction('onedrive')}
                >
                  {isConfigured ? (
                    <>
                      <Cloud className="h-4 w-4 text-success" />
                      <span>OneDrive <span className="text-success">(koblet)</span></span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="h-4 w-4 text-muted-foreground" />
                      Koble OneDrive
                    </>
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* OneDrive connected indicator */}
          {isConfigured && (
            <div className="absolute top-2 left-2">
              <Cloud className="h-4 w-4 text-primary-foreground/60" />
            </div>
          )}
        </CardContent>
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
