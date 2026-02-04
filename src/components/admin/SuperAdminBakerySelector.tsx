import { useTranslation } from 'react-i18next';
import { Building2, Zap, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useBakeries } from '@/hooks/useBakeries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function SuperAdminBakerySelector() {
  const { t } = useTranslation();
  const { isSuperAdmin, selectedBakeryId, setSelectedBakeryId } = useAuthStore();
  const { bakeries, isLoading } = useBakeries();

  if (!isSuperAdmin()) return null;

  const selectedBakery = bakeries.find(b => b.id === selectedBakeryId);

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-warning">
        <Zap className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {t('superAdmin.title')}
        </span>
      </div>

      {/* Bakery selector */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('superAdmin.selectBakery')}
        </label>
        
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={selectedBakeryId || ''}
            onValueChange={(value) => setSelectedBakeryId(value || null)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder={t('superAdmin.selectBakeryToStart')}>
                {selectedBakery && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{selectedBakery.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {bakeries.map((bakery) => (
                <SelectItem key={bakery.id} value={bakery.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{bakery.name}</span>
                    {!bakery.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        {t('bakeries.inactive')}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Active bakery indicator */}
      {selectedBakery && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted-foreground shrink-0">
              {t('superAdmin.impersonating')}:
            </span>
            <span className="font-medium truncate">{selectedBakery.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setSelectedBakeryId(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* No bakery selected warning */}
      {!selectedBakeryId && !isLoading && (
        <p className="text-xs text-muted-foreground">
          {t('superAdmin.noBakerySelected')}
        </p>
      )}
    </div>
  );
}
