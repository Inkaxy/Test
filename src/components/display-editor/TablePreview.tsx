import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Check, Lock, Users, Package, ChevronRight, Clock, Calendar, BarChart3, CheckCircle2, Circle, AlertTriangle, Undo2, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  product_number: string;
  quantity: number;
  pieces_per_tray: number;
  status: 'pending' | 'packed' | 'deviation';
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

// Mock products for product card preview
const mockProducts: MockProduct[] = [
  { name: 'Rundstykker', product_number: 'RS-001', quantity: 27, pieces_per_tray: 12, status: 'packed' },
  { name: 'Croissant', product_number: 'CR-002', quantity: 15, pieces_per_tray: 8, status: 'pending' },
  { name: 'Kanelbolle', product_number: 'KB-003', quantity: 6, pieces_per_tray: 6, status: 'pending' },
  { name: 'Focaccia', product_number: 'FC-004', quantity: 4, pieces_per_tray: 4, status: 'deviation' },
];

const formatQuantityWithTrays = (quantity: number, piecesPerTray: number, trayLabel: string = 'pl'): { display: string; total: number; trays: number; pieces: number } => {
  if (piecesPerTray <= 0) return { display: `${quantity}`, total: quantity, trays: 0, pieces: quantity };
  const trays = Math.floor(quantity / piecesPerTray);
  const pieces = quantity % piecesPerTray;
  if (trays === 0) return { display: `${pieces}`, total: quantity, trays: 0, pieces };
  if (pieces === 0) return { display: `${trays}${trayLabel}`, total: quantity, trays, pieces: 0 };
  return { display: `${trays}${trayLabel}+${pieces}`, total: quantity, trays, pieces };
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

const productCardQuantitySizeClasses = {
  small: { number: 'text-xl', label: 'text-xs', box: 'min-w-[60px] h-[50px]' },
  medium: { number: 'text-2xl', label: 'text-xs', box: 'min-w-[70px] h-[60px]' },
  large: { number: 'text-3xl', label: 'text-sm', box: 'min-w-[80px] h-[70px]' },
  huge: { number: 'text-4xl', label: 'text-sm', box: 'min-w-[90px] h-[80px]' },
};

const buttonSizeClasses = {
  normal: 'h-8 px-2 text-xs',
  large: 'h-9 px-3 text-sm',
  huge: 'h-10 px-4 text-sm',
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    if (settings.header_clock_format === '12h') {
      return currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return currentTime.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getStatusColor = (status: PreviewCustomer['status']) => {
    switch (status) {
      case 'complete': return settings.completed_color;
      case 'packing': return settings.packing_color;
      case 'locked': return '#6b7280';
      default: return settings.pending_color;
    }
  };

  const progressBarHeight = settings.table_progress_bar_height || '0.5rem';
  const totalCustomers = mockCustomers.length;
  const completedCustomers = mockCustomers.filter(c => c.status === 'complete').length;
  const remainingCustomers = totalCustomers - completedCustomers;
  const overallProgress = Math.round((completedCustomers / totalCustomers) * 100);

  // Product card settings
  const cardLayout = settings.product_card_layout || 'horizontal';
  const cardNameFontSize = settings.product_card_name_font_size || '1rem';
  const cardNameFontWeight = settings.product_card_name_font_weight || 'semibold';
  const showProductNumber = settings.product_card_show_product_number ?? true;
  const productNumberFontSize = settings.product_card_product_number_font_size || '0.75rem';
  const quantitySize = settings.product_card_quantity_size || 'large';
  const quantityPosition = settings.product_card_quantity_position || 'right';
  const quantityStyle = settings.product_card_quantity_style || 'box';
  const quantityBgColor = settings.product_card_quantity_background_color || '#3b82f620';
  const quantityTextColor = settings.product_card_quantity_text_color || '#3b82f6';
  const showTrayFormat = settings.product_card_show_tray_format ?? true;
  const trayLabel = settings.product_card_tray_label || 'pl';
  const showTotalPieces = settings.product_card_show_total_pieces ?? true;
  const piecesLabel = settings.product_card_pieces_label || 'stk';
  const cardPadding = settings.product_card_padding || '0.75rem';
  const cardGap = settings.product_card_gap || '0.75rem';
  const cardBorderRadius = settings.product_card_border_radius || '0.5rem';
  const cardBorderWidth = settings.product_card_border_width || '2px';
  const showStatusBadge = settings.product_card_show_status_badge ?? true;
  const buttonSize = settings.product_card_button_size || 'large';
  const buttonStyle = settings.product_card_button_style || 'full';
  const packedStyle = settings.product_card_packed_style || 'strikethrough';
  const alternateRows = settings.product_card_alternate_rows ?? false;
  const alternateColor = settings.product_card_alternate_color || '#f1f5f920';

  const getQuantityBoxStyle = () => {
    const baseStyle: React.CSSProperties = { color: quantityTextColor };
    switch (quantityStyle) {
      case 'box': return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '0.75rem' };
      case 'circle': return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '50%' };
      case 'pill': return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '9999px' };
      default: return baseStyle;
    }
  };

  const getPackedStyles = () => {
    switch (packedStyle) {
      case 'fade': return 'opacity-40';
      case 'collapse': return 'opacity-60 scale-95';
      default: return 'line-through opacity-60';
    }
  };

  const sizeClasses = productCardQuantitySizeClasses[quantitySize];
  const btnClasses = buttonSizeClasses[buttonSize];

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: settings.background_color,
        padding: '0.75rem',
      }}
    >
      {/* === HEADER SECTION === */}
      {(settings.back_button_show !== false || settings.header_show_bakery_name || settings.header_show_category_name || settings.header_show_clock || settings.header_show_date) && (
        <div 
          className="mb-3 p-3 rounded-lg"
          style={{ backgroundColor: settings.card_background_color }}
        >
          <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: settings.text_color, opacity: 0.5 }}>
            HEADER-INNSTILLINGER
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Back Button Preview */}
              {settings.back_button_show !== false && (
                <div 
                  className={cn(
                    "flex items-center justify-center shrink-0",
                    settings.back_button_style === 'icon-circle' && "rounded-full",
                    settings.back_button_style === 'icon-square' && "rounded-md",
                    (settings.back_button_style === 'text' || settings.back_button_style === 'text-icon') && "px-2 gap-1"
                  )}
                  style={{ 
                    backgroundColor: (settings.back_button_style === 'icon-circle' || settings.back_button_style === 'icon-square') 
                      ? (settings.back_button_background_color || 'transparent') 
                      : 'transparent',
                    color: settings.back_button_icon_color || settings.text_color,
                    width: settings.back_button_style === 'text' || settings.back_button_style === 'text-icon' 
                      ? 'auto' 
                      : settings.back_button_size === 'small' ? '24px' 
                      : settings.back_button_size === 'medium' ? '28px'
                      : settings.back_button_size === 'large' ? '32px' 
                      : '40px',
                    height: settings.back_button_style === 'text' || settings.back_button_style === 'text-icon' 
                      ? 'auto' 
                      : settings.back_button_size === 'small' ? '24px' 
                      : settings.back_button_size === 'medium' ? '28px'
                      : settings.back_button_size === 'large' ? '32px' 
                      : '40px',
                  }}
                >
                  {settings.back_button_style !== 'text' && (
                    <ArrowLeft className={cn(
                      settings.back_button_size === 'small' && 'h-4 w-4',
                      settings.back_button_size === 'medium' && 'h-5 w-5',
                      settings.back_button_size === 'large' && 'h-6 w-6',
                      settings.back_button_size === 'huge' && 'h-8 w-8',
                    )} />
                  )}
                  {(settings.back_button_style === 'text' || settings.back_button_style === 'text-icon') && (
                    <span className={cn(
                      "font-medium",
                      settings.back_button_size === 'small' && 'text-xs',
                      settings.back_button_size === 'medium' && 'text-sm',
                      settings.back_button_size === 'large' && 'text-base',
                      settings.back_button_size === 'huge' && 'text-lg',
                    )}>
                      {settings.back_button_text || 'Tilbake'}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {settings.header_show_bakery_name && (
                  <span 
                    className="font-bold"
                    style={{ color: settings.text_color, fontSize: `calc(${settings.header_bakery_font_size || '1.5rem'} * 0.6)` }}
                  >
                    Test Bakeri
                  </span>
                )}
                {settings.header_show_category_name && (
                  <span 
                    style={{ color: settings.packing_color, fontSize: `calc(${settings.header_category_font_size || '1rem'} * 0.6)` }}
                  >
                    Småvarer
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              {settings.header_show_clock && (
                <div className="flex items-center gap-1" style={{ color: settings.text_color }}>
                  <Clock className="h-3 w-3 opacity-60" />
                  <span style={{ fontSize: `calc(${settings.header_clock_font_size || '1.25rem'} * 0.6)` }} className="font-mono tabular-nums">
                    {formatTime()}
                  </span>
                </div>
              )}
              {settings.header_show_date && (
                <div className="flex items-center gap-1" style={{ color: settings.text_color, opacity: 0.7 }}>
                  <Calendar className="h-3 w-3 opacity-60" />
                  <span style={{ fontSize: `calc(${settings.header_date_font_size || '0.875rem'} * 0.6)` }} className="capitalize">
                    {formatDate()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === STATS SECTION === */}
      {(settings.stats_show_total_progress || settings.stats_show_packed_count || settings.stats_show_remaining_count) && (
        <div 
          className="mb-3 p-3 rounded-lg"
          style={{ backgroundColor: settings.card_background_color }}
        >
          <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: settings.text_color, opacity: 0.5 }}>
            <BarChart3 className="h-3 w-3" />
            STATISTIKK
          </div>
          <div className="flex items-center gap-4">
            {settings.stats_show_total_progress && settings.stats_progress_bar_style !== 'none' && (
              <div className="flex-1">
                {settings.stats_progress_bar_style === 'bar' && (
                  <div className="space-y-1">
                    <Progress
                      value={overallProgress}
                      className="w-full"
                      style={{ 
                        height: `calc(${settings.stats_progress_bar_height || '0.75rem'} * 0.7)`,
                        backgroundColor: `${settings.pending_color}40`
                      }}
                    />
                    <span className="text-xs font-bold" style={{ color: settings.completed_color }}>{overallProgress}%</span>
                  </div>
                )}
                {settings.stats_progress_bar_style === 'circle' && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ 
                        background: `conic-gradient(${settings.completed_color} ${overallProgress * 3.6}deg, ${settings.pending_color}40 0deg)`,
                        color: settings.text_color
                      }}
                    >
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: settings.card_background_color }}
                      >
                        {overallProgress}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {settings.stats_show_packed_count && (
              <div className="text-center">
                <div style={{ color: settings.completed_color, fontSize: `calc(${settings.stats_value_font_size || '1.5rem'} * 0.6)` }} className="font-bold">
                  {completedCustomers}
                </div>
                <div style={{ color: settings.text_color, opacity: 0.6, fontSize: `calc(${settings.stats_label_font_size || '0.75rem'} * 0.8)` }}>
                  Ferdig
                </div>
              </div>
            )}
            {settings.stats_show_remaining_count && (
              <div className="text-center">
                <div style={{ color: settings.packing_color, fontSize: `calc(${settings.stats_value_font_size || '1.5rem'} * 0.6)` }} className="font-bold">
                  {remainingCustomers}
                </div>
                <div style={{ color: settings.text_color, opacity: 0.6, fontSize: `calc(${settings.stats_label_font_size || '0.75rem'} * 0.8)` }}>
                  Gjenstår
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === CUSTOMER TABLE === */}
      <div 
        className="mb-3 p-3 rounded-lg"
        style={{ backgroundColor: settings.card_background_color }}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: settings.text_color, opacity: 0.5 }}>
            <Users className="h-3 w-3" />
            KUNDETABELL
          </div>
          {settings.table_row_click_to_pack && (
            <Badge 
              variant="outline" 
              className="text-[8px] px-1.5 py-0.5 gap-1"
              style={{ borderColor: settings.completed_color, color: settings.completed_color }}
            >
              <Check className="h-2 w-2" />
              Klikk pakker
            </Badge>
          )}
        </div>

        {/* Sticky Header */}
        {settings.table_sticky_header && (
          <div
            className="flex items-center px-2 py-1.5 font-semibold rounded-t text-[10px]"
            style={{
              backgroundColor: settings.table_header_background_color || settings.background_color,
              color: settings.table_header_text_color || settings.text_color,
              fontSize: `calc(${settings.table_header_font_size || '0.75rem'} * 0.7)`,
              borderBottom: `1px solid ${settings.pending_color}30`,
            }}
          >
            <div className="flex-1">Kunde</div>
            {settings.table_show_order_count && <div className="w-14 text-center">Ordrer</div>}
            {settings.table_show_progress_bar && <div className="w-20">Fremdrift</div>}
            <div className="w-14 text-center">Status</div>
          </div>
        )}

        {/* Table Body */}
        <div className="space-y-0.5">
          {mockCustomers.slice(0, 3).map((customer, index) => {
            const statusColor = getStatusColor(customer.status);
            const isComplete = customer.progress === 100;
            const isLocked = customer.status === 'locked';

            return (
              <div
                key={customer.id}
                className={cn(
                  'flex items-center px-2 transition-all text-xs',
                  rowHeightClasses[settings.table_row_height] || 'py-2',
                  borderStyleClasses[settings.table_border_style || 'subtle'],
                  isLocked && 'opacity-50',
                  settings.table_row_hover_effect && 'hover:brightness-110',
                  isComplete && 'opacity-75'
                )}
                style={{
                  backgroundColor: settings.table_alternate_rows && index % 2 === 1
                    ? settings.table_alternate_row_color
                    : 'transparent',
                  color: settings.text_color,
                  borderRadius: '0.25rem',
                  borderLeft: `2px solid ${statusColor}`,
                  fontSize: `calc(${settings.table_font_size} * 0.7)`,
                }}
              >
                {/* Customer Name */}
                <div className="flex-1 min-w-0">
                  <p className={cn("truncate leading-tight", fontWeightClasses[settings.table_customer_name_font_weight || 'bold'])}>
                    {customer.name}
                  </p>
                  {settings.table_show_customer_number && (
                    <p className="text-[10px] opacity-60">#{customer.customer_number}</p>
                  )}
                </div>

                {/* Order Count */}
                {settings.table_show_order_count && (
                  <div className="w-14 flex justify-center">
                    <div 
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono',
                        quantitySizeClasses[settings.table_quantity_display_size as keyof typeof quantitySizeClasses] || 'text-lg',
                        fontWeightClasses[settings.table_quantity_font_weight as keyof typeof fontWeightClasses || 'bold'],
                      )}
                      style={{
                        backgroundColor: settings.table_quantity_border_style === 'filled' 
                          ? settings.table_quantity_background_color : 'transparent',
                        color: settings.table_quantity_text_color || settings.packing_color,
                        border: settings.table_quantity_border_style === 'outline' 
                          ? `1px solid ${settings.table_quantity_text_color || settings.packing_color}` : 'none',
                        fontSize: '0.75rem',
                      }}
                    >
                      {customer.packedOrders}/{customer.totalOrders}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {settings.table_show_progress_bar && (
                  <div className="w-20 flex items-center gap-1 px-1">
                    <Progress
                      value={customer.progress}
                      className="flex-1 h-1"
                      style={{ backgroundColor: `${settings.pending_color}40` }}
                    />
                    <span className="text-[10px] font-mono w-6 text-right" style={{ color: statusColor }}>
                      {customer.progress}%
                    </span>
                  </div>
                )}

                {/* Status */}
                <div className="w-14 flex justify-center">
                  {isLocked && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">
                      {settings.table_show_status_icons && <Lock className="h-2 w-2 mr-0.5" />}
                      Låst
                    </Badge>
                  )}
                  {isComplete && !isLocked && (
                    <Badge className="text-[8px] px-1 py-0" style={{ backgroundColor: settings.completed_color }}>
                      {settings.table_show_status_icons && <Check className="h-2 w-2 mr-0.5" />}
                      Ferdig
                    </Badge>
                  )}
                  {!isComplete && !isLocked && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0" style={{ borderColor: statusColor, color: settings.text_color }}>
                      {customer.progress > 0 ? 'Pågår' : 'Venter'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === PRODUCT CARD PREVIEW === */}
      <div 
        className="p-3 rounded-lg"
        style={{ backgroundColor: settings.card_background_color }}
      >
        <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: settings.text_color, opacity: 0.5 }}>
          <Package className="h-3 w-3" />
          PRODUKTKORT (NÅR KUNDE PAKKES)
        </div>

        <div className="space-y-2">
          {mockProducts.map((product, index) => {
            const isPacked = product.status === 'packed';
            const isDeviation = product.status === 'deviation';
            const quantityInfo = formatQuantityWithTrays(product.quantity, product.pieces_per_tray, trayLabel);
            const shouldAlternate = alternateRows && index % 2 === 1;

            const renderQuantity = () => (
              <div 
                className={cn(
                  'flex flex-col items-center justify-center px-2',
                  sizeClasses.box
                )}
                style={getQuantityBoxStyle()}
              >
                {quantityInfo.trays > 0 && showTrayFormat ? (
                  <>
                    <div className="flex items-baseline gap-0.5">
                      <span className={cn(sizeClasses.number, 'font-bold tabular-nums')}>{quantityInfo.trays}</span>
                      <span className={cn(sizeClasses.label, 'opacity-70')}>{trayLabel}</span>
                      {quantityInfo.pieces > 0 && (
                        <>
                          <span className={cn(sizeClasses.number, 'font-bold')}>+</span>
                          <span className={cn(sizeClasses.number, 'font-bold tabular-nums')}>{quantityInfo.pieces}</span>
                        </>
                      )}
                    </div>
                    {showTotalPieces && (
                      <span className={cn(sizeClasses.label, 'opacity-60')}>
                        = {quantityInfo.total} {piecesLabel}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className={cn(sizeClasses.number, 'font-bold tabular-nums leading-none')}>{quantityInfo.total}</span>
                    <span className={cn(sizeClasses.label, 'opacity-60')}>{piecesLabel}</span>
                  </>
                )}
              </div>
            );

            return (
              <div
                key={index}
                className={cn(
                  'rounded transition-all overflow-hidden',
                  isPacked && 'opacity-60',
                  isDeviation && 'opacity-80'
                )}
                style={{
                  backgroundColor: shouldAlternate ? alternateColor : settings.background_color,
                  borderWidth: cardBorderWidth,
                  borderStyle: 'solid',
                  borderColor: isPacked ? settings.completed_color + '60' : isDeviation ? '#ef444460' : settings.pending_color + '30',
                  borderRadius: cardBorderRadius,
                  padding: `calc(${cardPadding} * 0.7)`,
                }}
              >
                {cardLayout === 'horizontal' ? (
                  <div className="flex items-center" style={{ gap: `calc(${cardGap} * 0.7)` }}>
                    {quantityPosition === 'left' && (
                      <div className={cn(isPacked && getPackedStyles())}>{renderQuantity()}</div>
                    )}
                    
                    <div className={cn('flex-1 min-w-0', isPacked && getPackedStyles())}>
                      <p 
                        className={cn('truncate', fontWeightClasses[cardNameFontWeight])}
                        style={{ fontSize: `calc(${cardNameFontSize} * 0.8)`, color: settings.text_color }}
                      >
                        {product.name}
                      </p>
                      {showProductNumber && (
                        <p 
                          className="opacity-60 font-mono"
                          style={{ fontSize: `calc(${productNumberFontSize} * 0.8)`, color: settings.text_color }}
                        >
                          {product.product_number}
                        </p>
                      )}
                    </div>

                    {quantityPosition === 'center' && (
                      <div className={cn(isPacked && getPackedStyles())}>{renderQuantity()}</div>
                    )}

                    {quantityPosition === 'right' && (
                      <div className={cn(isPacked && getPackedStyles())}>{renderQuantity()}</div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {showStatusBadge && (
                        <Badge 
                          className="text-[8px] px-1 py-0"
                          style={{ 
                            backgroundColor: isPacked ? settings.completed_color : isDeviation ? '#ef4444' : settings.pending_color + '30',
                            color: isPacked || isDeviation ? '#fff' : settings.text_color
                          }}
                        >
                          {isPacked ? 'Pakket' : isDeviation ? 'Avvik' : 'Venter'}
                        </Badge>
                      )}
                      
                      {product.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            className={cn(btnClasses, 'gap-1')}
                            style={{ 
                              backgroundColor: settings.pack_button_background_color || settings.completed_color,
                              color: settings.pack_button_text_color || '#ffffff',
                              borderRadius: settings.pack_button_border_radius || '0.25rem',
                            }}
                          >
                            {(settings.pack_button_show_icon ?? true) && <Check className="h-3 w-3" />}
                            {buttonStyle === 'full' && <span>{settings.pack_button_text || 'Pakket'}</span>}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {isPacked && (
                        <Button size="sm" variant="ghost" className="h-6 px-1 gap-1 text-[10px]">
                          <Undo2 className="h-3 w-3" />
                          Angre
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className={cn('flex items-center justify-between', isPacked && getPackedStyles())}>
                      <div className="flex-1 min-w-0">
                        <p 
                          className={cn('truncate', fontWeightClasses[cardNameFontWeight])}
                          style={{ fontSize: `calc(${cardNameFontSize} * 0.8)`, color: settings.text_color }}
                        >
                          {product.name}
                        </p>
                        {showProductNumber && (
                          <p className="opacity-60 font-mono" style={{ fontSize: `calc(${productNumberFontSize} * 0.8)`, color: settings.text_color }}>
                            {product.product_number}
                          </p>
                        )}
                      </div>
                      {renderQuantity()}
                    </div>
                    <div className="flex justify-end gap-1">
                      {showStatusBadge && (
                        <Badge className="text-[8px] px-1 py-0" style={{ backgroundColor: isPacked ? settings.completed_color : settings.pending_color + '30' }}>
                          {isPacked ? 'Pakket' : 'Venter'}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* === ANIMATION INDICATOR === */}
      {settings.animation_enabled && (
        <div 
          className="mt-2 px-2 py-1 rounded text-[9px] flex items-center gap-1"
          style={{ backgroundColor: settings.packing_color + '20', color: settings.packing_color }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: settings.packing_color }} />
          Animasjoner aktive ({settings.animation_speed})
        </div>
      )}

      {/* === REALTIME INDICATOR === */}
      {(settings.realtime_show_connection_status || settings.realtime_show_last_update) && (
        <div 
          className="mt-2 px-2 py-1 rounded text-[9px] flex items-center justify-between"
          style={{ backgroundColor: settings.completed_color + '20', color: settings.completed_color }}
        >
          {settings.realtime_show_connection_status && (
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: settings.completed_color }} />
              Tilkoblet
            </span>
          )}
          {settings.realtime_show_last_update && (
            <span className="opacity-70">Oppdatert nå</span>
          )}
        </div>
      )}
    </div>
  );
}
