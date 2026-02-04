import { useTranslation } from 'react-i18next';
import { Zap, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useBakeries } from '@/hooks/useBakeries';
import { Button } from '@/components/ui/button';

export function SuperAdminBanner() {
  const { t } = useTranslation();
  const { isSuperAdmin, selectedBakeryId, setSelectedBakeryId } = useAuthStore();
  const { bakeries } = useBakeries();

  if (!isSuperAdmin() || !selectedBakeryId) return null;

  const selectedBakery = bakeries.find(b => b.id === selectedBakeryId);
  if (!selectedBakery) return null;

  return (
    <div className="bg-warning/20 border-b border-warning/30 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-warning" />
          <span className="font-medium text-warning">
            {t('superAdmin.title')}:
          </span>
          <span className="text-foreground">
            {t('superAdmin.impersonating')} <strong>{selectedBakery.name}</strong>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-warning hover:text-warning hover:bg-warning/20"
          onClick={() => setSelectedBakeryId(null)}
        >
          <X className="h-4 w-4 mr-1" />
          {t('superAdmin.exitMode')}
        </Button>
      </div>
    </div>
  );
}
