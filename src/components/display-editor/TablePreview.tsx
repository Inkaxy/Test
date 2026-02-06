import { useTranslation } from 'react-i18next';
import { Check, Lock, Users, Package, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';

interface PreviewCustomer {
  id: string;
  name: string;
  customer_number: string;
  totalOrders: number;
  packedOrders: number;
  progress: number;
  status: 'pending' | 'packing' | 'complete' | 'locked';
}

interface MockProduct {
  name: string;
  quantity: number;
  pieces_per_tray: number;
}

const mockCustomers: PreviewCustomer[] = [
  { 
    id: '1', 
    name: 'Meny Heimdal', 
    customer_number: '1001', 
    totalOrders: 5, 
    packedOrders: 5, 
    progress: 100, 
    status: 'complete' 
  },
  { 
    id: '2', 
    name: 'Kiwi Foyn Senter', 
    customer_number: '1042', 
    totalOrders: 8, 
    packedOrders: 5, 
    progress: 62, 
    status: 'packing' 
  },
  { 
    id: '3', 
    name: 'Rema 1000 Grønland', 
    customer_number: '1103', 
    totalOrders: 12, 
    packedOrders: 0, 
    progress: 0, 
    status: 'pending' 
  },
  { 
    id: '4', 
    name: 'Spar Sentrum', 
    customer_number: '1055', 
    totalOrders: 3, 
    packedOrders: 1, 
    progress: 33, 
    status: 'locked' 
  },
];

// Mock products for pl+stk preview
const mockProducts: MockProduct[] = [
  { name: 'Rundstykker', quantity: 27, pieces_per_tray: 12 },
  { name: 'Croissant', quantity: 15, pieces_per_tray: 8 },
  { name: 'Kanelbolle', quantity: 6, pieces_per_tray: 6 },
  { name: 'Focaccia', quantity: 4, pieces_per_tray: 4 },
];

const formatQuantityWithTrays = (quantity: number, piecesPerTray: number): string => {
  if (piecesPerTray <= 0) return `${quantity}`;
  const trays = Math.floor(quantity / piecesPerTray);
  const pieces = quantity % piecesPerTray;
  if (trays === 0) return `${pieces}`;
  if (pieces === 0) return `${trays}pl`;
  return `${trays}pl+${pieces}`;
};

const rowHeightClasses = {
  compact: 'py-2',
  normal: 'py-3',
  touch: 'py-4 min-h-[3.5rem]',
};

const rowSpacingClasses = {
  '0.5rem': 'mb-1',
  '0.75rem': 'mb-2',
  '1rem': 'mb-2',
};

const fontWeightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const quantitySizeClasses = {
  small: 'text-lg',
  medium: 'text-xl',
  large: 'text-2xl',
  huge: 'text-3xl',
};

const borderStyleClasses = {
  none: '',
  subtle: 'border border-white/10',
  full: 'border-2 border-white/20',
};

interface TablePreviewProps {
  settings: DisplaySettings;
}

export function TablePreview({ settings }: TablePreviewProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: PreviewCustomer['status']) => {
    switch (status) {
      case 'complete': return settings.completed_color;
      case 'packing': return settings.packing_color;
      case 'locked': return '#6b7280';
      default: return settings.pending_color;
    }
  };

  const progressBarHeight = settings.table_progress_bar_height || '0.5rem';

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: settings.background_color,
        padding: '0.75rem',
      }}
    >
      {/* Preview Label */}
      <div className="flex items-center gap-2 mb-3 text-xs font-medium" style={{ color: settings.text_color, opacity: 0.6 }}>
        <Package className="h-3 w-3" />
        <span>TABELL FORHÅNDSVISNING</span>
      </div>

      {/* pl+stk Preview Section */}
      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${settings.card_background_color}`, border: `1px solid ${settings.pending_color}30` }}>
        <div className="flex items-center gap-2 mb-2 text-xs font-medium" style={{ color: settings.text_color, opacity: 0.6 }}>
          <Package className="h-3 w-3" />
          <span>PRODUKT MED PL+STK FORMAT</span>
        </div>
        <div className="space-y-1.5">
          {mockProducts.map((product, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between px-2 py-1.5 rounded"
              style={{ 
                backgroundColor: idx % 2 === 0 ? settings.card_background_color : settings.table_alternate_row_color,
                fontSize: `calc(${settings.table_font_size} * 0.75)`,
              }}
            >
              <span style={{ color: settings.text_color }}>{product.name}</span>
              <div 
                className={cn(
                  'px-2 py-0.5 rounded font-mono font-bold',
                  quantitySizeClasses[settings.table_quantity_display_size as keyof typeof quantitySizeClasses] || 'text-lg',
                )}
                style={{
                  backgroundColor: settings.table_quantity_border_style === 'filled' 
                    ? settings.table_quantity_background_color 
                    : 'transparent',
                  color: settings.table_quantity_text_color || settings.packing_color,
                  border: settings.table_quantity_border_style === 'outline' 
                    ? `2px solid ${settings.table_quantity_text_color || settings.packing_color}` 
                    : 'none',
                }}
              >
                {formatQuantityWithTrays(product.quantity, product.pieces_per_tray)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Header */}
      {settings.table_sticky_header && (
        <div
          className="flex items-center px-3 py-2 font-semibold rounded-t-lg text-xs"
          style={{
            backgroundColor: settings.table_header_background_color || settings.card_background_color,
            color: settings.table_header_text_color || settings.text_color,
            fontSize: `calc(${settings.table_header_font_size || '0.875rem'} * 0.8)`,
            borderBottom: `1px solid ${settings.pending_color}40`,
          }}
        >
          <div className="flex-1 flex items-center gap-1.5">
            <Users className="h-3 w-3 opacity-60" />
            Kunde
          </div>
          {settings.table_show_order_count && (
            <div className="w-20 text-center flex items-center justify-center gap-1">
              <Package className="h-3 w-3 opacity-60" />
              Ordrer
            </div>
          )}
          {settings.table_show_progress_bar && (
            <div className="w-28">Fremdrift</div>
          )}
          <div className="w-20 text-center">Status</div>
          <div className="w-6" />
        </div>
      )}

      {/* Table Body */}
      <div className="space-y-0">
        {mockCustomers.map((customer, index) => {
          const statusColor = getStatusColor(customer.status);
          const isComplete = customer.progress === 100;
          const isLocked = customer.status === 'locked';

          return (
            <div
              key={customer.id}
              className={cn(
                'flex items-center px-3 transition-all',
                rowHeightClasses[settings.table_row_height] || 'py-3',
                rowSpacingClasses[settings.table_touch_row_spacing as keyof typeof rowSpacingClasses] || 'mb-2',
                borderStyleClasses[settings.table_border_style || 'subtle'],
                isLocked && 'opacity-50',
                settings.table_row_hover_effect && 'hover:brightness-110',
                isComplete && 'opacity-75'
              )}
              style={{
                backgroundColor:
                  settings.table_alternate_rows && index % 2 === 1
                    ? settings.table_alternate_row_color
                    : settings.card_background_color,
                color: settings.text_color,
                borderRadius: `calc(${settings.border_radius} * 0.7)`,
                borderLeft: `3px solid ${statusColor}`,
                fontSize: `calc(${settings.table_font_size} * 0.8)`,
              }}
            >
              {/* Customer Name & Number */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${statusColor}30` }}
                >
                  <Users className="h-4 w-4" style={{ color: statusColor }} />
                </div>
                <div className="min-w-0">
                  <p 
                    className={cn(
                      "truncate leading-tight text-sm",
                      fontWeightClasses[settings.table_customer_name_font_weight || 'bold']
                    )}
                  >
                    {customer.name}
                  </p>
                  {settings.table_show_customer_number && (
                    <p className="text-xs opacity-60 leading-tight">
                      #{customer.customer_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Count - Highly Visible */}
              {settings.table_show_order_count && (
                <div className="w-20 flex items-center justify-center">
                  <div 
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg py-1.5 px-2 transition-all',
                      quantitySizeClasses[settings.table_quantity_display_size as keyof typeof quantitySizeClasses] || 'text-2xl',
                      fontWeightClasses[settings.table_quantity_font_weight as keyof typeof fontWeightClasses || 'bold'],
                      settings.table_quantity_border_style === 'outline' && 'border-2',
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
                      <span className="text-[8px] mt-0.5 opacity-75">ordrer</span>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {settings.table_show_progress_bar && (
                <div className="w-28 flex items-center gap-2 px-1">
                  <div className="flex-1">
                    <Progress
                      value={customer.progress}
                      className="w-full h-1.5"
                      style={{
                        height: `calc(${progressBarHeight} * 0.7)`,
                        backgroundColor: `${settings.pending_color}40`,
                      }}
                    />
                  </div>
                  <span 
                    className="font-mono font-bold w-8 text-right tabular-nums text-xs"
                    style={{ color: statusColor }}
                  >
                    {customer.progress}%
                  </span>
                </div>
              )}

              {/* Status */}
              <div className="w-20 flex justify-center">
                {isLocked && (
                  <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px]">
                    {settings.table_show_status_icons && <Lock className="h-2.5 w-2.5" />}
                    Låst
                  </Badge>
                )}
                {isComplete && !isLocked && (
                  <Badge
                    className="gap-1 px-2 py-0.5 text-[10px]"
                    style={{ backgroundColor: settings.completed_color, color: '#fff' }}
                  >
                    {settings.table_show_status_icons && <Check className="h-3 w-3" />}
                    Ferdig
                  </Badge>
                )}
                {!isComplete && !isLocked && (
                  <Badge
                    className="gap-1 px-2 py-0.5 text-[10px]"
                    style={{ 
                      backgroundColor: customer.progress > 0 ? `${settings.packing_color}20` : 'transparent',
                      borderColor: statusColor, 
                      borderWidth: '1px',
                      color: settings.text_color,
                    }}
                  >
                    {customer.progress > 0 ? 'Pågår' : 'Venter'}
                  </Badge>
                )}
              </div>
              
              {/* Chevron indicator */}
              <div className="w-6 flex justify-center">
                {!isLocked && !isComplete && (
                  <ChevronRight 
                    className="h-4 w-4 opacity-40"
                    style={{ color: settings.text_color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
