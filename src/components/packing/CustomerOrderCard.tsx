import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';

interface Product {
  id: string;
  name: string;
  product_number: string;
  pieces_per_tray?: number | null;
  category_id?: string | null;
}

interface PackingStatus {
  id: string;
  status: string;
  deviation_type?: string | null;
  deviation_note?: string | null;
}

interface Order {
  id: string;
  quantity: number;
  product: Product;
  packing_status?: PackingStatus | null;
}

interface CustomerOrderCardProps {
  order: Order;
  index: number;
  isAlternate: boolean;
  alternateRowColor?: string;
  settings?: DisplaySettings;
  onMarkPacked: (orderId: string, packingStatusId?: string, productId?: string, categoryId?: string | null) => void;
  onReportDeviation: (order: Order) => void;
  onUndo: (packingStatusId: string, orderId: string) => void;
  isMarkingPacked: boolean;
  isUndoing: boolean;
}

// Size mappings for quantity display
const quantitySizeClasses = {
  small: { number: 'text-2xl', label: 'text-xs', box: 'min-w-[80px] h-[70px]' },
  medium: { number: 'text-3xl', label: 'text-sm', box: 'min-w-[100px] h-[85px]' },
  large: { number: 'text-4xl', label: 'text-sm', box: 'min-w-[120px] h-[100px]' },
  huge: { number: 'text-5xl', label: 'text-base', box: 'min-w-[140px] h-[120px]' },
};

const buttonSizeClasses = {
  normal: { button: 'h-12 px-4 text-base', icon: 'h-12 w-12' },
  large: { button: 'h-14 px-6 text-lg', icon: 'h-14 w-14' },
  huge: { button: 'h-16 px-8 text-xl', icon: 'h-16 w-16' },
};

const fontWeightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export function CustomerOrderCard({
  order,
  index,
  isAlternate,
  alternateRowColor,
  settings,
  onMarkPacked,
  onReportDeviation,
  onUndo,
  isMarkingPacked,
  isUndoing,
}: CustomerOrderCardProps) {
  const { t } = useTranslation();
  
  const status = order.packing_status?.status || 'pending';
  const isPacked = status === 'packed' || status === 'deviation';
  
  // Use settings or defaults
  const layout = settings?.product_card_layout || 'horizontal';
  const nameFontSize = settings?.product_card_name_font_size || '1.25rem';
  const nameFontWeight = settings?.product_card_name_font_weight || 'semibold';
  const showProductNumber = settings?.product_card_show_product_number ?? true;
  const productNumberFontSize = settings?.product_card_product_number_font_size || '0.875rem';
  const quantitySize = settings?.product_card_quantity_size || 'large';
  const quantityPosition = settings?.product_card_quantity_position || 'right';
  const quantityStyle = settings?.product_card_quantity_style || 'box';
  const quantityBgColor = settings?.product_card_quantity_background_color || '#3b82f620';
  const quantityTextColor = settings?.product_card_quantity_text_color || '#3b82f6';
  const showTrayFormat = settings?.product_card_show_tray_format ?? true;
  const trayLabel = settings?.product_card_tray_label || 'pl';
  const showTotalPieces = settings?.product_card_show_total_pieces ?? true;
  const piecesLabel = settings?.product_card_pieces_label || 'stk';
  const cardPadding = settings?.product_card_padding || '1.25rem';
  const cardGap = settings?.product_card_gap || '1rem';
  const cardBorderRadius = settings?.product_card_border_radius || '0.75rem';
  const cardBorderWidth = settings?.product_card_border_width || '2px';
  const showStatusBadge = settings?.product_card_show_status_badge ?? true;
  const buttonSize = settings?.product_card_button_size || 'large';
  const buttonStyle = settings?.product_card_button_style || 'full';
  const packedStyle = settings?.product_card_packed_style || 'strikethrough';
  const animationEnabled = settings?.product_card_animation_enabled ?? true;
  
  // Pakke-knapp innstillinger
  const packButtonText = settings?.pack_button_text || 'Pakket';
  const packButtonBgColor = settings?.pack_button_background_color || '#22c55e';
  const packButtonTextColor = settings?.pack_button_text_color || '#ffffff';
  const packButtonBorderRadius = settings?.pack_button_border_radius || '0.5rem';
  const packButtonSize = settings?.pack_button_size || 'large';
  const packButtonShowIcon = settings?.pack_button_show_icon ?? true;
  const useAlternateRows = settings?.product_card_alternate_rows ?? false;
  const alternateColor = settings?.product_card_alternate_color || alternateRowColor;
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray || !showTrayFormat) {
      return { total: quantity, trays: 0, pieces: quantity, hasTrays: false };
    }
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    return { total: quantity, trays, pieces, hasTrays: piecesPerTray > 0 };
  };
  
  const quantityInfo = getQuantityDisplay(order.quantity, order.product.pieces_per_tray);
  const sizeClasses = quantitySizeClasses[quantitySize];
  const btnClasses = buttonSizeClasses[buttonSize];
  
  const getStatusBadge = () => {
    if (!showStatusBadge) return null;
    
    switch (status) {
      case 'packed':
        return (
          <Badge className="bg-success text-success-foreground text-sm px-3 py-1">
            {t('packing.packed')}
          </Badge>
        );
      case 'deviation':
        return (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {t('packing.deviation')}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {t('packing.pending')}
          </Badge>
        );
    }
  };
  
  // Get alternating row background style
  const getAlternateStyle = () => {
    const shouldAlternate = useAlternateRows ? (index % 2 === 1) : isAlternate;
    const color = useAlternateRows ? alternateColor : alternateRowColor;
    
    if (!shouldAlternate || !color) return {};
    
    if (color.startsWith('#') || color.startsWith('hsl') || color.startsWith('rgb')) {
      return { backgroundColor: color };
    }
    
    // Preset colors
    const presets: Record<string, string> = {
      amber: 'hsl(30 80% 50% / 0.08)',
      blue: 'hsl(210 80% 50% / 0.08)',
      green: 'hsl(140 60% 45% / 0.08)',
      purple: 'hsl(270 60% 55% / 0.08)',
      rose: 'hsl(350 70% 55% / 0.08)',
      slate: 'hsl(220 15% 55% / 0.08)',
    };
    
    return { backgroundColor: presets[color] || presets.amber };
  };
  
  // Get quantity box styles
  const getQuantityBoxStyle = () => {
    const baseStyle: React.CSSProperties = {
      color: quantityTextColor,
    };
    
    switch (quantityStyle) {
      case 'box':
        return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '1rem' };
      case 'circle':
        return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '50%' };
      case 'pill':
        return { ...baseStyle, backgroundColor: quantityBgColor, borderRadius: '9999px' };
      case 'plain':
      default:
        return baseStyle;
    }
  };
  
  // Get packed visual style
  const getPackedStyles = () => {
    switch (packedStyle) {
      case 'fade':
        return 'opacity-40';
      case 'collapse':
        return 'opacity-60 scale-95';
      case 'strikethrough':
      default:
        return 'line-through opacity-60';
    }
  };
  
  // Render quantity display
  const renderQuantity = () => (
    <div 
      className={cn(
        'flex-shrink-0 flex flex-col items-center justify-center px-4',
        sizeClasses.box,
        quantityStyle !== 'plain' && 'transition-all'
      )}
      style={getQuantityBoxStyle()}
    >
      {quantityInfo.hasTrays && quantityInfo.trays > 0 && showTrayFormat ? (
        <>
          <div className="flex items-baseline gap-0.5">
            <span className={cn(sizeClasses.number, 'font-bold tabular-nums')}>{quantityInfo.trays}</span>
            <span className={cn(sizeClasses.label, 'font-medium opacity-70')}>{trayLabel}</span>
            {quantityInfo.pieces > 0 && (
              <>
                <span className={cn(sizeClasses.number, 'font-bold')}>+</span>
                <span className={cn(sizeClasses.number, 'font-bold tabular-nums')}>{quantityInfo.pieces}</span>
              </>
            )}
          </div>
          {showTotalPieces && (
            <span className={cn(sizeClasses.label, 'opacity-70 mt-1')}>
              = {quantityInfo.total} {piecesLabel}
            </span>
          )}
        </>
      ) : (
        <>
          <span className={cn(sizeClasses.number, 'font-bold tabular-nums leading-none')}>
            {quantityInfo.total}
          </span>
          <span className={cn(sizeClasses.label, 'opacity-70 mt-1')}>
            {piecesLabel}
          </span>
        </>
      )}
    </div>
  );
  
  // Render action buttons
  const renderActions = () => {
    const packBtnClasses = {
      normal: { button: 'h-12 px-4 text-base', icon: 'h-12 w-12' },
      large: { button: 'h-14 px-6 text-lg', icon: 'h-14 w-14' },
      huge: { button: 'h-16 px-8 text-xl', icon: 'h-16 w-16' },
    };
    const packBtnSize = packBtnClasses[packButtonSize];
    
    return (
      <div className="flex flex-col items-end gap-3 flex-shrink-0">
        {getStatusBadge()}
        
        {status === 'pending' && (
          <div className="flex gap-2">
            {buttonStyle !== 'icon-only' && (
              <Button
                size="lg"
                onClick={() => onMarkPacked(
                  order.id, 
                  order.packing_status?.id, 
                  order.product.id, 
                  order.product.category_id
                )}
                disabled={isMarkingPacked}
                className={cn(packBtnSize.button, 'gap-2 font-medium touch-manipulation')}
                style={{
                  backgroundColor: packButtonBgColor,
                  color: packButtonTextColor,
                  borderRadius: packButtonBorderRadius,
                }}
              >
                {packButtonShowIcon && <Check className="h-5 w-5" />}
                {buttonStyle === 'full' && packButtonText}
              </Button>
            )}
            
            {buttonStyle === 'icon-only' && (
              <Button
                size="lg"
                onClick={() => onMarkPacked(
                  order.id, 
                  order.packing_status?.id, 
                  order.product.id, 
                  order.product.category_id
                )}
                disabled={isMarkingPacked}
                className={cn(packBtnSize.icon, 'touch-manipulation')}
                style={{
                  backgroundColor: packButtonBgColor,
                  color: packButtonTextColor,
                  borderRadius: packButtonBorderRadius,
                }}
              >
                <Check className="h-6 w-6" />
              </Button>
            )}
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => onReportDeviation(order)}
              className={cn(btnClasses.icon, 'touch-manipulation')}
            >
              <AlertTriangle className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {isPacked && order.packing_status?.id && (
          <Button
            size="lg"
            variant="ghost"
            onClick={() => onUndo(order.packing_status!.id, order.id)}
            disabled={isUndoing}
            className="h-12 touch-manipulation"
          >
            <Undo2 className="h-5 w-5 mr-2" />
            {t('packing.undoPacked')}
          </Button>
        )}
      </div>
    );
  };
  
  return (
    <motion.div
      initial={animationEnabled ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <Card
        className={cn(
          'transition-all overflow-hidden',
          status === 'packed' && 'bg-success/10 border-success/40',
          status === 'deviation' && 'bg-destructive/10 border-destructive/40',
          status === 'pending' && 'border-border hover:border-primary/30'
        )}
        style={{
          borderWidth: cardBorderWidth,
          borderRadius: cardBorderRadius,
          ...(status === 'pending' ? getAlternateStyle() : {}),
        }}
      >
        <CardContent style={{ padding: cardPadding }}>
          {layout === 'horizontal' ? (
            <div className="flex items-center" style={{ gap: cardGap }}>
              {/* Quantity on left if position is left */}
              {quantityPosition === 'left' && (
                <div className={cn(isPacked && getPackedStyles())}>
                  {renderQuantity()}
                </div>
              )}
              
              {/* Product info */}
              <div className={cn(
                'flex-1 min-w-0',
                isPacked && getPackedStyles()
              )}>
                <h3 
                  className={cn('truncate', fontWeightClasses[nameFontWeight])}
                  style={{ fontSize: nameFontSize }}
                >
                  {order.product.name}
                </h3>
                {showProductNumber && (
                  <p 
                    className="text-muted-foreground font-mono mt-0.5"
                    style={{ fontSize: productNumberFontSize }}
                  >
                    {order.product.product_number}
                  </p>
                )}
              </div>
              
              {/* Quantity in center */}
              {quantityPosition === 'center' && (
                <div className={cn(isPacked && getPackedStyles())}>
                  {renderQuantity()}
                </div>
              )}
              
              {/* Quantity on right (default) */}
              {quantityPosition === 'right' && (
                <div className={cn(isPacked && getPackedStyles())}>
                  {renderQuantity()}
                </div>
              )}
              
              {/* Actions */}
              {renderActions()}
            </div>
          ) : (
            /* Vertical layout */
            <div className="flex flex-col" style={{ gap: cardGap }}>
              {/* Top row: Product name and quantity */}
              <div className={cn(
                'flex items-center justify-between',
                isPacked && getPackedStyles()
              )}>
                <div className="flex-1 min-w-0">
                  <h3 
                    className={cn('truncate', fontWeightClasses[nameFontWeight])}
                    style={{ fontSize: nameFontSize }}
                  >
                    {order.product.name}
                  </h3>
                  {showProductNumber && (
                    <p 
                      className="text-muted-foreground font-mono mt-0.5"
                      style={{ fontSize: productNumberFontSize }}
                    >
                      {order.product.product_number}
                    </p>
                  )}
                </div>
                {renderQuantity()}
              </div>
              
              {/* Bottom row: Actions */}
              <div className="flex justify-end">
                {renderActions()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
