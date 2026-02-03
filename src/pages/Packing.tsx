import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { CategoryTabs } from '@/components/packing/CategoryTabs';
import { PackingCalendar } from '@/components/packing/PackingCalendar';

export default function Packing() {
  const { t } = useTranslation();
  const { getCurrentBakeryId } = useAuthStore();
  const bakeryId = getCurrentBakeryId();
  
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Auto-select first category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      const activeCategories = categories.filter(c => c.is_active);
      if (activeCategories.length > 0) {
        setSelectedCategoryId(activeCategories[0].id);
      }
    }
  }, [categories, selectedCategoryId]);
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const activeCategories = categories.filter(c => c.is_active);
  
  if (activeCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('packing.title')}</h1>
          <p className="text-muted-foreground">{t('categories.noCategories')}</p>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('categories.noCategories')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('packing.title')}</h1>
        <p className="text-muted-foreground">
          Velg kategori og dato for å starte pakking
        </p>
      </div>
      
      {/* Category tabs */}
      <CategoryTabs
        categories={activeCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />
      
      {/* Calendar view for selected category */}
      {selectedCategory && bakeryId && (
        <PackingCalendar
          category={selectedCategory}
          bakeryId={bakeryId}
        />
      )}
    </div>
  );
}
