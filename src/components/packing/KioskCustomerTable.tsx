import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Users, Package, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { KioskLock, isLockedByCurrentDevice, isLockedByOtherDevice } from '@/hooks/useKioskLocks';
import { CustomerLock, isLockedByCurrentUser, isLockedByOther } from '@/hooks/useCustomerLocks';

interface OrderWithProduct {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    product_number: string;
    pieces_per_tray: number | null;
    category_id: string | null;
  };
  packing_status: {
    id: string;
    status: string;
  } | null;
}

interface CustomerWithOrders {
  id: string;
  name: string;
  customer_number: string;
  orders?: OrderWithProduct[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
}

// Support both kiosk (device-based) and regular (user-based) locking
type LockMode = 
  | { mode: 'device'; locks: KioskLock[]; deviceId: string }
  | { mode: 'user'; locks: CustomerLock[]; userId: string };

interface KioskCustomerTableProps {
  customers: CustomerWithOrders[];
  settings: DisplaySettings;
  onSelectCustomer: (customer: CustomerWithOrders) => void;
  onPackOrder?: (orderId: string, packingStatusId?: string) => void;
  // For kiosk mode (device-based)
  locks?: KioskLock[];
  currentDeviceId?: string;
  // For authenticated mode (user-based)
  userLocks?: CustomerLock[];
  currentUserId?: string;
}

const rowHeightClasses = {
  compact: 'py-3',
  normal: 'py-5',
  touch: 'py-7 min-h-[5rem]',
};

const rowSpacingClasses = {
  '0.5rem': 'mb-2',
  '0.75rem': 'mb-3',
  '1rem': 'mb-4',
};

const fontWeightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const quantitySizeClasses = {
  small: 'text-2xl',
  medium: 'text-3xl',
  large: 'text-4xl',
  huge: 'text-5xl',
};

const borderStyleClasses = {
  none: '',
  subtle: 'border border-white/10',
  full: 'border-2 border-white/20',
};

export function KioskCustomerTable({
  customers,
  settings,
  onSelectCustomer,
  onPackOrder,
  locks = [],
  currentDeviceId,
  userLocks = [],
  currentUserId,
}: KioskCustomerTableProps) {
  const { t } = useTranslation();
  
  // Determine lock mode based on props
  const useDeviceLocking = locks.length > 0 || currentDeviceId;

  const getKioskLock = (customerId: string): KioskLock | undefined => {
    return locks.find((l) => l.customer_id === customerId);
  };
  
  const getUserLock = (customerId: string): CustomerLock | undefined => {
    return userLocks.find((l) => l.customer_id === customerId);
  };
  
  const checkLockedByMe = (customerId: string): boolean => {
    if (useDeviceLocking) {
      return isLockedByCurrentDevice(getKioskLock(customerId), currentDeviceId || '');
    }
    return isLockedByCurrentUser(getUserLock(customerId), currentUserId);
  };
  
  const checkLockedByOther = (customerId: string): boolean => {
    if (useDeviceLocking) {
      return isLockedByOtherDevice(getKioskLock(customerId), currentDeviceId || '');
    }
    return isLockedByOther(getUserLock(customerId), currentUserId);
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

  const progressBarHeight = settings.table_progress_bar_height || '0.75rem';
  
  // Kolonne-bredder
  const orderColumnWidth = settings.table_order_column_width || '9rem';
  const progressColumnWidth = settings.table_progress_column_width || '14rem';
  const statusColumnWidth = settings.table_status_column_width || '9rem';
  
  // Chevron størrelser
  const chevronSizes = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  return (
    <div className="w-full">
      {/* Sticky Header */}
      {settings.table_sticky_header && (
        <div
          className="sticky top-0 z-10 flex items-center px-5 py-4 font-semibold rounded-t-xl shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: settings.table_header_background_color || settings.card_background_color,
            color: settings.table_header_text_color || settings.text_color,
            fontSize: settings.table_header_font_size || '0.875rem',
            borderBottom: `2px solid ${settings.pending_color}40`,
          }}
        >
          <div className="flex-1 flex items-center gap-2">
            <Users className="h-4 w-4 opacity-60" />
            {t('packing.customer')}
          </div>
          {settings.table_show_order_count && (
            <div className="text-center flex items-center justify-center gap-2" style={{ width: orderColumnWidth }}>
              <Package className="h-4 w-4 opacity-60" />
              {t('packing.orders')}
            </div>
          )}
          {settings.table_show_progress_bar && (
            <div style={{ width: progressColumnWidth }}>{t('dashboard.progress')}</div>
          )}
          {settings.table_show_status !== false && (
            <div className="text-center" style={{ width: statusColumnWidth }}>{t('common.status')}</div>
          )}
          {settings.table_show_chevron !== false && (
            <div className="w-10" />
          )}
        </div>
      )}

      {/* Table Body */}
      <div className="space-y-0">
        <AnimatePresence>
          {customers.map((customer, index) => {
            const lockedByMe = checkLockedByMe(customer.id);
            const lockedByOther = checkLockedByOther(customer.id);
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
                whileTap={settings.table_touch_tap_feedback && !lockedByOther ? { scale: 0.985 } : undefined}
                className={cn(
                  'flex items-center px-5 transition-all touch-manipulation select-none',
                  rowHeightClasses[settings.table_row_height],
                  rowSpacingClasses[settings.table_touch_row_spacing as keyof typeof rowSpacingClasses] || 'mb-3',
                  borderStyleClasses[settings.table_border_style || 'subtle'],
                  lockedByOther ? 'cursor-not-allowed' : 'cursor-pointer',
                  settings.table_row_hover_effect && !lockedByOther && 'hover:brightness-110 hover:shadow-lg',
                  isComplete && 'opacity-75'
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
                onClick={() => {
                  if (lockedByOther) return;
                  
                  // If click-to-pack is enabled and there are unpacked orders, pack the first one
                  if (settings.table_row_click_to_pack && onPackOrder && customer.orders && customer.orders.length > 0) {
                    const unpackedOrder = customer.orders.find(o => o.packing_status?.status !== 'packed' && o.packing_status?.status !== 'deviation');
                    if (unpackedOrder) {
                      onPackOrder(unpackedOrder.id, unpackedOrder.packing_status?.id);
                      return;
                    }
                  }
                  
                  // Otherwise, navigate to customer detail view
                  onSelectCustomer(customer);
                }}
              >
                {/* Customer Name & Number */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${statusColor}30` }}
                  >
                    <Users className="h-6 w-6" style={{ color: statusColor }} />
                  </div>
                  <div className="min-w-0">
                    <p 
                      className={cn(
                        "truncate leading-tight",
                        fontWeightClasses[settings.table_customer_name_font_weight || 'bold']
                      )}
                      style={{ fontSize: settings.table_customer_name_font_size || settings.table_font_size }}
                    >
                      {customer.name}
                    </p>
                    {settings.table_show_customer_number && (
                      <p 
                        className="text-sm opacity-60 leading-tight mt-0.5"
                        style={{ fontSize: `calc(${settings.table_customer_name_font_size || settings.table_font_size} * 0.75)` }}
                      >
                        #{customer.customer_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Count - Highly Visible */}
                {settings.table_show_order_count && (
                  <div className="flex items-center justify-center" style={{ width: orderColumnWidth }}>
                    <div 
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl py-3 px-4 transition-all',
                        quantitySizeClasses[settings.table_quantity_display_size as keyof typeof quantitySizeClasses] || 'text-4xl',
                        fontWeightClasses[settings.table_quantity_font_weight as keyof typeof fontWeightClasses || 'bold'],
                        settings.table_quantity_border_style === 'outline' && 'border-2',
                        settings.table_quantity_border_style === 'filled' && 'border-none',
                      )}
                      style={{
                        backgroundColor: 
                          settings.table_quantity_border_style === 'filled' 
                            ? settings.table_quantity_background_color
                            : 'transparent',
                        color: settings.table_quantity_text_color || settings.packing_color,
                        borderColor: settings.table_quantity_text_color || settings.packing_color,
                      }}
                    >
                      <span className="tabular-nums leading-tight font-mono">
                        {customer.packedOrders}/{customer.totalOrders}
                      </span>
                      {settings.table_quantity_show_label && (
                        <span className="text-xs mt-1 opacity-75">{t('packing.orders')}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {settings.table_show_progress_bar && (
                  <div className="flex items-center gap-4 px-2" style={{ width: progressColumnWidth }}>
                    <div className="flex-1">
                      <Progress
                        value={customer.progress}
                        className="w-full"
                        style={{
                          height: progressBarHeight,
                          backgroundColor: `${settings.pending_color}40`,
                        }}
                      />
                    </div>
                    <span 
                      className="font-mono font-bold w-14 text-right tabular-nums"
                      style={{ 
                        fontSize: settings.table_font_size,
                        color: statusColor,
                      }}
                    >
                      {customer.progress}%
                    </span>
                  </div>
                )}

                {/* Status */}
                {settings.table_show_status !== false && (
                  <div className="flex justify-center" style={{ width: statusColumnWidth }}>
                    {lockedByOther && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "gap-2",
                          settings.table_status_badge_style === 'minimal' && 'border-0 bg-transparent'
                        )}
                        style={{ 
                          fontSize: settings.table_status_font_size,
                          padding: settings.table_status_badge_padding,
                        }}
                      >
                        {settings.table_show_status_icons && <Lock className="h-4 w-4" />}
                        {t('packing.locked')}
                      </Badge>
                    )}
                    {lockedByMe && (
                      <Badge
                        className="gap-2"
                        style={{ 
                          backgroundColor: settings.table_status_badge_style === 'outline' ? 'transparent' : settings.packing_color, 
                          color: settings.table_status_badge_style === 'outline' ? settings.packing_color : '#fff',
                          borderColor: settings.packing_color,
                          borderWidth: settings.table_status_badge_style === 'outline' ? '2px' : '0',
                          fontSize: settings.table_status_font_size,
                          padding: settings.table_status_badge_padding,
                        }}
                      >
                        {settings.table_show_status_icons && <Lock className="h-4 w-4" />}
                        {t('packing.yourLock')}
                      </Badge>
                    )}
                    {isComplete && !lockedByMe && !lockedByOther && (
                      <Badge
                        className="gap-2"
                        style={{ 
                          backgroundColor: settings.table_status_badge_style === 'outline' ? 'transparent' : settings.completed_color, 
                          color: settings.table_status_badge_style === 'outline' ? settings.completed_color : '#fff',
                          borderColor: settings.completed_color,
                          borderWidth: settings.table_status_badge_style === 'outline' ? '2px' : '0',
                          fontSize: settings.table_status_font_size,
                          padding: settings.table_status_badge_padding,
                        }}
                      >
                        {settings.table_show_status_icons && <Check className="h-5 w-5" />}
                        {t('packing.complete')}
                      </Badge>
                    )}
                    {!isComplete && !lockedByMe && !lockedByOther && (
                      <Badge
                        className="gap-2"
                        style={{ 
                          backgroundColor: settings.table_status_badge_style === 'filled' 
                            ? (customer.progress > 0 ? `${settings.packing_color}30` : `${settings.pending_color}30`) 
                            : 'transparent',
                          borderColor: statusColor, 
                          borderWidth: '2px',
                          color: settings.text_color,
                          fontSize: settings.table_status_font_size,
                          padding: settings.table_status_badge_padding,
                        }}
                      >
                        {customer.progress > 0 ? t('packing.inProgress') : t('packing.pending')}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Chevron indicator for touch */}
                {settings.table_show_chevron !== false && (
                  <div className="w-10 flex justify-center">
                    {!lockedByOther && !isComplete && (
                      <ChevronRight 
                        className={cn(
                          "opacity-40",
                          chevronSizes[settings.table_chevron_size || 'medium']
                        )}
                        style={{ color: settings.text_color }}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {customers.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center rounded-xl"
          style={{ 
            color: settings.text_color, 
            opacity: 0.6,
            backgroundColor: settings.card_background_color,
          }}
        >
          <Users className="h-20 w-20 mb-6" />
          <p className="text-2xl font-medium">{t('dashboard.noOrders')}</p>
          <p className="text-lg mt-2 opacity-75">{t('packing.noCustomersToday')}</p>
        </div>
      )}
    </div>
  );
}
