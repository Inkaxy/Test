import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onMarkPacked: (orderId: string, packingStatusId?: string, productId?: string, categoryId?: string | null) => void;
  onReportDeviation: (order: Order) => void;
  onUndo: (packingStatusId: string, orderId: string) => void;
  isMarkingPacked: boolean;
  isUndoing: boolean;
}

export function CustomerOrderCard({
  order,
  index,
  isAlternate,
  alternateRowColor,
  onMarkPacked,
  onReportDeviation,
  onUndo,
  isMarkingPacked,
  isUndoing,
}: CustomerOrderCardProps) {
  const { t } = useTranslation();
  
  const status = order.packing_status?.status || 'pending';
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) {
      return { total: quantity, trays: 0, pieces: quantity, hasTrays: false };
    }
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    return { total: quantity, trays, pieces, hasTrays: piecesPerTray > 0 };
  };
  
  const quantityInfo = getQuantityDisplay(order.quantity, order.product.pieces_per_tray);
  
  const getStatusBadge = (status?: string) => {
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
    if (!isAlternate || !alternateRowColor) return {};
    
    // Parse the color - could be hex, hsl, or a preset name
    if (alternateRowColor.startsWith('#') || alternateRowColor.startsWith('hsl')) {
      return { backgroundColor: `${alternateRowColor}15` }; // 15 = ~8% opacity in hex
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
    
    return { backgroundColor: presets[alternateRowColor] || presets.amber };
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <Card
        className={cn(
          'transition-all border-2 overflow-hidden',
          status === 'packed' && 'bg-success/10 border-success/40',
          status === 'deviation' && 'bg-destructive/10 border-destructive/40',
          status === 'pending' && 'border-border hover:border-primary/30'
        )}
        style={status === 'pending' ? getAlternateStyle() : undefined}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {/* Product info and quantity - wrapped together for full strikethrough */}
            <div className={cn(
              'flex items-center gap-4 flex-1 min-w-0',
              (status === 'packed' || status === 'deviation') && 'line-through opacity-60'
            )}>
              {/* Product info - First */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">{order.product.name}</h3>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  {order.product.product_number}
                </p>
              </div>
              
              {/* Quantity display - Large and prominent */}
              <div 
                className={cn(
                  'flex-shrink-0 min-w-[120px] h-[100px] rounded-2xl flex flex-col items-center justify-center px-4',
                  status === 'packed' && 'bg-success/20',
                  status === 'deviation' && 'bg-destructive/20',
                  status === 'pending' && 'bg-primary/10'
                )}
              >
                {quantityInfo.hasTrays && quantityInfo.trays > 0 ? (
                  <>
                    {/* Tray format: 2pl+3 */}
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-bold tabular-nums">{quantityInfo.trays}</span>
                      <span className="text-lg font-medium text-muted-foreground">pl</span>
                      {quantityInfo.pieces > 0 && (
                        <>
                          <span className="text-2xl font-bold">+</span>
                          <span className="text-3xl font-bold tabular-nums">{quantityInfo.pieces}</span>
                        </>
                      )}
                    </div>
                    {/* Total pieces below */}
                    <span className="text-sm text-muted-foreground mt-1">
                      = {quantityInfo.total} stk
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold tabular-nums leading-none">
                      {quantityInfo.total}
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">
                      stk
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Status and actions */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              {getStatusBadge(status)}
              
              {status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    onClick={() => onMarkPacked(
                      order.id, 
                      order.packing_status?.id, 
                      order.product.id, 
                      order.product.category_id
                    )}
                    disabled={isMarkingPacked}
                    className="h-14 px-6 text-lg gap-2 font-medium touch-manipulation"
                  >
                    <Check className="h-5 w-5" />
                    {t('packing.markAsPacked')}
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => onReportDeviation(order)}
                    className="h-14 w-14 touch-manipulation"
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </Button>
                </div>
              )}
              
              {(status === 'packed' || status === 'deviation') && order.packing_status?.id && (
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
