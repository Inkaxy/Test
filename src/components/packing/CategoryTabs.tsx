import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Users } from 'lucide-react';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

export function CategoryTabs({ 
  categories, 
  selectedCategoryId, 
  onSelectCategory,
  className,
}: CategoryTabsProps) {
  const { t } = useTranslation();
  
  const activeCategories = categories.filter(c => c.is_active);
  
  if (activeCategories.length === 0) {
    return null;
  }
  
  return (
    <Tabs 
      value={selectedCategoryId || activeCategories[0]?.id} 
      onValueChange={onSelectCategory}
      className={className}
    >
      <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
        {activeCategories.map((category) => (
          <TabsTrigger
            key={category.id}
            value={category.id}
            className={cn(
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
              'flex items-center gap-2 px-4 py-2 rounded-lg border',
              'data-[state=inactive]:bg-background data-[state=inactive]:hover:bg-muted'
            )}
          >
            {category.packing_mode === 'customer_based' ? (
              <Users className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            <span>{category.name}</span>
            <Badge 
              variant={selectedCategoryId === category.id ? 'secondary' : 'outline'}
              className="ml-1 text-xs"
            >
              {category.packing_mode === 'customer_based' 
                ? t('packing.customerBased')
                : t('packing.productBased')
              }
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
