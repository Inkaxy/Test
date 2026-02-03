import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { PackingCategoryCard } from '@/components/packing/PackingCategoryCard';
import { AddPackingCategoryCard } from '@/components/packing/AddPackingCategoryCard';
import { OneDriveConfigDialog } from '@/components/categories/OneDriveConfigDialog';

export default function Packing() {
  const { t } = useTranslation();
  const { isBakeryAdmin, isSuperAdmin } = useAuthStore();
  
  const { data: categories = [], isLoading } = useCategories();
  const [oneDriveCategory, setOneDriveCategory] = useState<Category | null>(null);
  
  const activeCategories = categories.filter(c => c.is_active);
  const isAdmin = isBakeryAdmin() || isSuperAdmin();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('packing.title')}</h1>
        <p className="text-muted-foreground">
          Velg et pakkealternativ for å starte pakking
        </p>
      </div>
      
      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {activeCategories.map((category) => (
          <PackingCategoryCard
            key={category.id}
            category={category}
            onOneDriveConfig={() => setOneDriveCategory(category)}
          />
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
