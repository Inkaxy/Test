import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Settings, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories, useUpdateCategory, Category } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { PackingCategoryCard } from '@/components/packing/PackingCategoryCard';
import { AddPackingCategoryCard } from '@/components/packing/AddPackingCategoryCard';
import { OneDriveConfigDialog } from '@/components/categories/OneDriveConfigDialog';
import { useToast } from '@/hooks/use-toast';

export default function Packing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isBakeryAdmin, isSuperAdmin } = useAuthStore();
  
  const { data: categories = [], isLoading } = useCategories();
  const updateCategory = useUpdateCategory();
  const [oneDriveCategory, setOneDriveCategory] = useState<Category | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const activeCategories = categories.filter(c => c.is_active);
  const isAdmin = isBakeryAdmin() || isSuperAdmin();
  
  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };
  
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    
    const draggedCategory = activeCategories[draggedIndex];
    const newOrder = [...activeCategories];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedCategory);
    
    // Update sort orders in database
    try {
      await Promise.all(
        newOrder.map((cat, idx) => 
          updateCategory.mutateAsync({ id: cat.id, sort_order: idx })
        )
      );
      toast({ title: 'Rekkefølge oppdatert' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke oppdatere rekkefølge',
      });
    }
    
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with settings */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('packing.title')}</h1>
          <p className="text-muted-foreground">
            Velg et pakkealternativ for å starte pakking
          </p>
        </div>
        
        {isAdmin && (
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? (
              <>
                <GripVertical className="h-4 w-4" />
                Ferdig med sortering
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                Rediger visning
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Edit mode hint */}
      {isEditMode && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          Dra og slipp kortene for å endre rekkefølge. Klikk på ⋮ menyen for å redigere, bytte farge eller slette.
        </div>
      )}
      
      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {activeCategories.map((category, index) => (
          <div
            key={category.id}
            draggable={isEditMode}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={draggedIndex === index ? 'opacity-50' : ''}
          >
            <PackingCategoryCard
              category={category}
              onOneDriveConfig={() => setOneDriveCategory(category)}
              isDragging={draggedIndex === index}
              dragHandleProps={isEditMode ? {
                className: "drag-handle"
              } : undefined}
            />
          </div>
        ))}
        
        {/* Add new category card - only for admins */}
        {isAdmin && (
          <AddPackingCategoryCard sortOrder={categories.length + 1} />
        )}
      </div>
      
      {/* Empty state */}
      {activeCategories.length === 0 && !isAdmin && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('categories.noCategories')}
          </p>
        </div>
      )}
      
      {/* OneDrive config dialog */}
      <OneDriveConfigDialog
        category={oneDriveCategory}
        open={!!oneDriveCategory}
        onOpenChange={(open) => !open && setOneDriveCategory(null)}
      />
    </div>
  );
}
