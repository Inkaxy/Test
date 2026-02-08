import { WifiOff, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncErrors: string[];
  onForceSync?: () => void;
  className?: string;
}

export function OfflineIndicator({
  isOnline,
  pendingCount,
  isSyncing,
  syncErrors,
  onForceSync,
  className,
}: OfflineIndicatorProps) {
  const { t } = useTranslation();
  
  // Don't show anything if online with no pending operations
  if (isOnline && pendingCount === 0 && syncErrors.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          !isOnline ? 'bg-destructive/10 text-destructive' : 
          syncErrors.length > 0 ? 'bg-warning/10 text-warning-foreground' :
          'bg-muted',
          className
        )}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('packing.offline', 'Frakoblet')}
            </span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount} {t('packing.pending', 'venter')}
              </Badge>
            )}
          </>
        ) : isSyncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {t('packing.syncing', 'Synkroniserer...')}
            </span>
          </>
        ) : syncErrors.length > 0 ? (
          <>
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {syncErrors.length} {t('packing.syncErrors', 'synkroniseringsfeil')}
            </span>
            {onForceSync && (
              <Button size="sm" variant="ghost" onClick={onForceSync} className="ml-2 h-6 px-2 text-xs">
                {t('common.retry', 'Prøv igjen')}
              </Button>
            )}
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span className="text-sm">
              {pendingCount} {t('packing.pendingSync', 'operasjoner venter på synkronisering')}
            </span>
            {onForceSync && (
              <Button size="sm" variant="ghost" onClick={onForceSync} className="ml-2 h-6 px-2 text-xs">
                {t('packing.syncNow', 'Synk nå')}
              </Button>
            )}
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
