import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Upload, Edit, Cloud, CloudOff, Loader2, MoreVertical, Play, Trash2, Palette, GripVertical, Link } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Category, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useOneDriveConfigForCategory } from '@/hooks/useOneDriveConfig';
import { useImport } from '@/hooks/useImport';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { KioskLinkDialog } from './KioskLinkDialog';

// Available card colors - bakery-inspired palette
export const CARD_COLORS = [
  // Warm bakery tones
  { id: 'primary', name: 'Bakery Gold', class: 'bg-primary', textClass: 'text-primary-foreground' },
  { id: 'wheat', name: 'Hvete', class: 'bg-amber-600', textClass: 'text-white' },
  { id: 'sourdough', name: 'Surdeigsbrød', class: 'bg-amber-800', textClass: 'text-white' },
  { id: 'crust', name: 'Brødskorpe', class: 'bg-yellow-700', textClass: 'text-white' },
  { id: 'honey', name: 'Honning', class: 'bg-amber-500', textClass: 'text-amber-950' },
  
  // Earthy tones
  { id: 'terracotta', name: 'Terrakotta', class: 'bg-orange-700', textClass: 'text-white' },
  { id: 'cinnamon', name: 'Kanel', class: 'bg-orange-800', textClass: 'text-white' },
  { id: 'cocoa', name: 'Kakao', class: 'bg-stone-700', textClass: 'text-white' },
  { id: 'espresso', name: 'Espresso', class: 'bg-stone-800', textClass: 'text-white' },
  
  // Fresh accents
  { id: 'sage', name: 'Salvie', class: 'bg-emerald-700', textClass: 'text-white' },
  { id: 'olive', name: 'Oliven', class: 'bg-lime-800', textClass: 'text-white' },
  { id: 'berry', name: 'Bær', class: 'bg-rose-700', textClass: 'text-white' },
  { id: 'plum', name: 'Plomme', class: 'bg-purple-800', textClass: 'text-white' },
  
  // Cool tones
  { id: 'slate', name: 'Skifer', class: 'bg-slate-700', textClass: 'text-white' },
  { id: 'steel', name: 'Stål', class: 'bg-zinc-600', textClass: 'text-white' },
  { id: 'ocean', name: 'Hav', class: 'bg-blue-700', textClass: 'text-white' },
  { id: 'teal', name: 'Turkis', class: 'bg-teal-700', textClass: 'text-white' },
];

interface PackingCategoryCardProps {
  category: Category;
  onOneDriveConfig: () => void;
  isEditMode?: boolean;
  bakeryShortId?: string;
}

export function PackingCategoryCard({ 
  category, 
  onOneDriveConfig,
  isEditMode = false,
  bakeryShortId = ''
}: PackingCategoryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isKioskLinkOpen, setIsKioskLinkOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editPackingMode, setEditPackingMode] = useState(category.packing_mode);
  const [editColor, setEditColor] = useState(category.card_color || 'primary');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [detectedDate, setDetectedDate] = useState<Date | null>(null);
  
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: oneDriveConfig } = useOneDriveConfigForCategory(category.id);
  const { parseFiles, importData, isImporting } = useImport();
  
  // Get color classes
  const colorConfig = CARD_COLORS.find(c => c.id === (category.card_color || 'primary')) || CARD_COLORS[0];
  
  const handleCardClick = () => {
    // Navigate to calendar view for this category
    navigate(`/packing/calendar/${category.id}`);
  };
  
  const handleEditSave = async () => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: editName,
        packing_mode: editPackingMode,
        card_color: editColor,
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
  
  const handleDelete = async () => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast({ title: 'Pakkealternativ slettet' });
      setIsDeleteOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke slette. Det kan ha tilknyttede ordrer.',
      });
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      
      // Parse files to detect date
      const { data } = await parseFiles(files);
      if (data.deliveryDate) {
        setDetectedDate(data.deliveryDate);
      }
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
      
      if (!data.deliveryDate) {
        toast({
          variant: 'destructive',
          title: 'Mangler leveringsdato',
          description: 'Kunne ikke finne leveringsdato i filnavnene. Sørg for at filene har datoformat i navnet (f.eks. 02-02-2026.OD0)',
        });
        return;
      }
      
      const result = await importData({
        products: data.products,
        customers: data.customers,
        orders: data.orders,
        deliveryDate: data.deliveryDate,
        categoryId: category.id,
      });
      
      toast({
        title: 'Import fullført',
        description: `${result.ordersCreated} ordrer importert til ${category.name}`,
      });
      
      setIsImportOpen(false);
      setSelectedFiles([]);
      setDetectedDate(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import feilet',
        description: error instanceof Error ? error.message : 'Ukjent feil',
      });
    }
  };
  
  const handleMenuAction = (action: 'import' | 'edit' | 'onedrive' | 'kiosklink' | 'delete') => {
    setIsMenuOpen(false);
    switch (action) {
      case 'import':
        setIsImportOpen(true);
        break;
      case 'edit':
        setEditName(category.name);
        setEditPackingMode(category.packing_mode);
        setEditColor(category.card_color || 'primary');
        setIsEditOpen(true);
        break;
      case 'onedrive':
        onOneDriveConfig();
        break;
      case 'kiosklink':
        setIsKioskLinkOpen(true);
        break;
      case 'delete':
        setIsDeleteOpen(true);
        break;
    }
  };
  
  const isConfigured = oneDriveConfig?.sync_status === 'configured';
  
  return (
    <>
      {/* Main Card */}
      <Card 
        className={cn(
          "group relative transition-all duration-300",
          colorConfig.class,
          isEditMode 
            ? "cursor-grab active:cursor-grabbing" 
            : "cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]"
        )}
        onClick={isEditMode ? undefined : handleCardClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[180px] relative">
          {/* Drag handle indicator in edit mode */}
          {isEditMode && (
            <div className="absolute top-2 left-2 opacity-60">
              <GripVertical className={cn("h-5 w-5", colorConfig.textClass)} />
            </div>
          )}
          
          {/* Category Name */}
          <h3 className={cn("text-2xl font-bold text-center mb-2", colorConfig.textClass)}>
            {category.name.toUpperCase()}
          </h3>
          
          {/* Packing Mode Badge */}
          <p className={cn("text-sm text-center opacity-80", colorConfig.textClass)}>
            ({category.packing_mode === 'product_based' 
              ? t('categories.productBased').toLowerCase() 
              : t('categories.customerBased').toLowerCase()})
          </p>
          
          {/* Start packing hint on hover - only show when not in edit mode */}
          {!isEditMode && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Badge variant="secondary" className="gap-1 bg-white/90 text-foreground">
                <Play className="h-3 w-3" />
                Start pakking
              </Badge>
            </div>
          )}
          
          {/* Menu button */}
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-2 right-2 h-8 w-8 rounded-full",
                  "bg-white/20 hover:bg-white/40",
                  colorConfig.textClass,
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full"
                  onClick={() => handleMenuAction('kiosklink')}
                >
                  <Link className="h-4 w-4" />
                  {t('categories.kioskLink')}
                </Button>
                <div className="border-t my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleMenuAction('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                  Slett
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* OneDrive connected indicator */}
          {isConfigured && !isEditMode && (
            <div className="absolute top-2 left-2">
              <Cloud className={cn("h-4 w-4 opacity-60", colorConfig.textClass)} />
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
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Kortfarge
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {CARD_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={cn(
                      "w-9 h-9 rounded-lg transition-all hover:scale-110",
                      color.class,
                      editColor === color.id && "ring-2 ring-offset-2 ring-foreground scale-110"
                    )}
                    onClick={() => setEditColor(color.id)}
                    title={color.name}
                  />
                ))}
              </div>
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
      
      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett "{category.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette pakkealternativet permanent. Ordrer tilknyttet denne kategorien vil miste sin kategori-kobling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer filer til {category.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <p className="text-xs text-muted-foreground">
                Leveringsdato hentes automatisk fra filnavnene
              </p>
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
                {detectedDate && (
                  <p className="text-sm text-muted-foreground">
                    Detektert leveringsdato: <span className="font-medium text-foreground">{detectedDate.toLocaleDateString('nb-NO')}</span>
                  </p>
                )}
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
