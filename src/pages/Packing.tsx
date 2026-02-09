import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Settings, GripVertical } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCategories, useUpdateCategory, Category } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { PackingCategoryCard } from '@/components/packing/PackingCategoryCard';
import { AddPackingCategoryCard } from '@/components/packing/AddPackingCategoryCard';
import { OneDriveConfigDialog } from '@/components/categories/OneDriveConfigDialog';
import { TripsManagementDialog } from '@/components/packing/TripsManagementDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Packing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isBakeryAdmin, isSuperAdmin, getActiveBakeryId } = useAuthStore();
  
  const { data: categories = [], isLoading } = useCategories();
  const updateCategory = useUpdateCategory();
  const [oneDriveCategory, setOneDriveCategory] = useState<Category | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch bakery short_id for kiosk links
  const { data: bakery } = useQuery({
    queryKey: ['bakery-short-id', getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return null;
      
      const { data, error } = await supabase
        .from('bakeries')
        .select('short_id')
        .eq('id', bakeryId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!getActiveBakeryId(),
  });
  
  const activeCategories = categories.filter(c => c.is_active);
  const isAdmin = isBakeryAdmin() || isSuperAdmin();
  
  // Sync ordered categories when categories change or edit mode is toggled
  const displayCategories = isEditMode ? orderedCategories : activeCategories;
  
  // Handle reorder from framer-motion
  const handleReorder = (newOrder: Category[]) => {
    setOrderedCategories(newOrder);
  };
  
  // Save order when exiting edit mode
  const handleToggleEditMode = async () => {
    if (isEditMode && orderedCategories.length > 0) {
      // Check if order changed
      const hasChanged = orderedCategories.some(
        (cat, idx) => cat.id !== activeCategories[idx]?.id
      );
      
      if (hasChanged) {
        setIsSaving(true);
        try {
          await Promise.all(
            orderedCategories.map((cat, idx) => 
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
        } finally {
          setIsSaving(false);
        }
      }
      setIsEditMode(false);
    } else {
      // Entering edit mode - initialize ordered categories
      setOrderedCategories([...activeCategories]);
      setIsEditMode(true);
    }
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
            onClick={handleToggleEditMode}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Lagrer...
              </>
            ) : isEditMode ? (
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
      {isEditMode ? (
        <Reorder.Group
          axis="x"
          values={orderedCategories}
          onReorder={handleReorder}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {orderedCategories.map((category) => (
              <Reorder.Item
                key={category.id}
                value={category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileDrag={{ 
                  scale: 1.05, 
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  zIndex: 50,
                  cursor: "grabbing"
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <PackingCategoryCard
                  category={category}
                  onOneDriveConfig={() => setOneDriveCategory(category)}
                  isEditMode={true}
                  bakeryShortId={bakery?.short_id || ''}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
          
          {/* Add new category card - only for admins */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AddPackingCategoryCard sortOrder={categories.length + 1} />
            </motion.div>
          )}
        </Reorder.Group>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {activeCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  delay: index * 0.05 
                }}
                layout
              >
                <PackingCategoryCard
                  category={category}
                  onOneDriveConfig={() => setOneDriveCategory(category)}
                  isEditMode={false}
                  bakeryShortId={bakery?.short_id || ''}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Add new category card - only for admins */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: activeCategories.length * 0.05 }}
            >
              <AddPackingCategoryCard sortOrder={categories.length + 1} />
            </motion.div>
          )}
        </div>
      )}
      
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
