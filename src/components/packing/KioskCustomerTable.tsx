import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { CustomerLock, isLockedByCurrentUser, isLockedByOther } from '@/hooks/useCustomerLocks';

interface CustomerWithOrders {
  id: string;
  name: string;
  customer_number: string;
  totalOrders: number;
  packedOrders: number;
  progress: number;
}

interface KioskCustomerTableProps {
  customers: CustomerWithOrders[];
  settings: DisplaySettings;
  onSelectCustomer: (customer: CustomerWithOrders) => void;
  locks?: CustomerLock[];
  currentUserId?: string;
}

const rowHeightClasses = {
  compact: 'py-2',
  normal: 'py-4',
  touch: 'py-6 min-h-[4rem]',
};

const rowSpacingClasses = {
  '0.5rem': 'mb-2',
  '0.75rem': 'mb-3',
  '1rem': 'mb-4',
};

export function KioskCustomerTable({
  customers,
  settings,
  onSelectCustomer,
  locks = [],
  currentUserId,
}: KioskCustomerTableProps) {
  const { t } = useTranslation();

  const getLock = (customerId: string): CustomerLock | undefined => {
    return locks.find((l) => l.customer_id === customerId);
  };

  const getStatusColor = (progress: number, lockedByOther?: boolean, lockedByMe?: boolean) => {
    if (lockedByMe) return settings.packing_color;
    if (lockedByOther) return '#6b7280';
    if (progress === 100) return settings.completed_color;
    if (progress > 0) return settings.packing_color;
    return settings.pending_color;
  };

  const getStatusLabel = (progress: number, lockedByOther?: boolean, lockedByMe?: boolean) => {
    if (lockedByMe) return t('packing.yourLock');
    if (lockedByOther) return t('packing.locked');
    if (progress === 100) return t('packing.complete');
    if (progress > 0) return t('packing.inProgress');
    return t('packing.pending');
  };

  return (
    <div className="w-full">
      {/* Sticky Header */}
      {settings.table_sticky_header && (
        <div
          className="sticky top-0 z-10 flex items-center px-4 py-3 font-semibold rounded-t-xl"
          style={{
            backgroundColor: settings.card_background_color,
            color: settings.text_color,
            fontSize: settings.table_font_size,
            borderBottom: `2px solid ${settings.pending_color}40`,
          }}
        >
          <div className="flex-1">{t('customers.customer')}</div>
          {settings.table_show_order_count && (
            <div className="w-24 text-center">{t('packing.orders')}</div>
          )}
          {settings.table_show_progress_bar && (
            <div className="w-48">{t('display.progress')}</div>
          )}
          <div className="w-32 text-center">{t('packing.status')}</div>
        </div>
      )}

      {/* Table Body */}
      <div className="space-y-0">
        <AnimatePresence>
          {customers.map((customer, index) => {
            const lock = getLock(customer.id);
            const lockedByMe = isLockedByCurrentUser(lock, currentUserId);
            const lockedByOther = isLockedByOther(lock, currentUserId);
            const isComplete = customer.progress === 100;
            const statusColor = getStatusColor(customer.progress, lockedByOther, lockedByMe);

            return (
              <motion.div
                key={customer.id}
                initial={settings.animation_enabled ? { opacity: 0, x: -20 } : false}
                animate={{ opacity: lockedByOther ? 0.5 : 1, x: 0 }}
                exit={settings.animation_enabled ? { opacity: 0, x: 20 } : undefined}
                transition={{
                  duration:
                    settings.animation_speed === 'fast'
                      ? 0.15
                      : settings.animation_speed === 'slow'
                      ? 0.5
                      : 0.3,
                }}
                className={cn(
                  'flex items-center px-4 transition-all touch-manipulation',
                  rowHeightClasses[settings.table_row_height],
                  rowSpacingClasses[settings.table_touch_row_spacing as keyof typeof rowSpacingClasses] || 'mb-3',
                  lockedByOther ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'
                )}
                style={{
                  backgroundColor:
                    settings.table_alternate_rows && index % 2 === 1
                      ? settings.table_alternate_row_color
                      : settings.card_background_color,
                  color: settings.text_color,
                  borderRadius: settings.border_radius,
                  borderLeft: `${settings.card_border_width || '4px'} solid ${statusColor}`,
                  fontSize: settings.table_font_size,
                }}
                onClick={() => !lockedByOther && onSelectCustomer(customer)}
              >
                {/* Customer Name & Number */}
                <div className="flex-1 flex items-center gap-3">
                  <Users className="h-5 w-5 opacity-50" />
                  <div>
                    <p className="font-bold truncate">{customer.name}</p>
                    {settings.table_show_customer_number && (
                      <p className="text-sm opacity-60">#{customer.customer_number}</p>
                    )}
                  </div>
                </div>

                {/* Order Count */}
                {settings.table_show_order_count && (
                  <div className="w-24 text-center font-mono font-bold">
                    {customer.totalOrders}
                  </div>
                )}

                {/* Progress Bar */}
                {settings.table_show_progress_bar && (
                  <div className="w-48 flex items-center gap-3">
                    <Progress
                      value={customer.progress}
                      className="flex-1 h-3"
                      style={{
                        backgroundColor: `${settings.pending_color}40`,
                      }}
                    />
                    <span className="font-mono font-bold w-12 text-right">
                      {customer.progress}%
                    </span>
                  </div>
                )}

                {/* Status */}
                <div className="w-32 flex justify-center">
                  {lockedByOther && (
                    <Badge variant="secondary" className="gap-1 px-3 py-1">
                      <Lock className="h-4 w-4" />
                      {t('packing.locked')}
                    </Badge>
                  )}
                  {lockedByMe && (
                    <Badge
                      className="gap-1 px-3 py-1"
                      style={{ backgroundColor: settings.packing_color, color: '#fff' }}
                    >
                      <Lock className="h-4 w-4" />
                      {t('packing.yourLock')}
                    </Badge>
                  )}
                  {isComplete && !lockedByMe && !lockedByOther && (
                    <Badge
                      className="gap-1 px-3 py-1"
                      style={{ backgroundColor: settings.completed_color, color: '#fff' }}
                    >
                      <Check className="h-4 w-4" />
                      {t('packing.complete')}
                    </Badge>
                  )}
                  {!isComplete && !lockedByMe && !lockedByOther && (
                    <Badge
                      variant="outline"
                      className="px-3 py-1"
                      style={{ 
                        borderColor: statusColor, 
                        color: settings.text_color,
                      }}
                    >
                      {customer.progress > 0 ? t('packing.inProgress') : t('packing.pending')}
                    </Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {customers.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          style={{ color: settings.text_color, opacity: 0.6 }}
        >
          <Users className="h-16 w-16 mb-4" />
          <p className="text-xl">{t('dashboard.noOrders')}</p>
        </div>
      )}
    </div>
  );
}
