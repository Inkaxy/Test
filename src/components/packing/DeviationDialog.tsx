import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBakerySettings, DeviationTypeConfig, DeviationInputMode, DeviationConfig } from '@/hooks/useBakerySettings';

// Re-export types for backwards compatibility
export type { DeviationTypeConfig, DeviationInputMode, DeviationConfig };

// Default deviation types
export const DEFAULT_DEVIATION_TYPES: DeviationTypeConfig[] = [
  { id: 'shortage', label: 'Manko', color: 'bg-orange-500' },
  { id: 'production_error', label: 'Produksjonsfeil', color: 'bg-red-500' },
  { id: 'second_trip', label: 'Kommer på 2-tur', color: 'bg-blue-500' },
];

export const DEFAULT_PREDEFINED_VALUES = ['-1', '-2', '-3', '-4', '-5', 'Alle'];

interface DeviationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderInfo?: {
    customerName?: string;
    productName?: string;
    orderedQuantity: number;
  };
  onConfirm: (data: { 
    deviationType: string; 
    deviationNote: string;
    actualQuantity?: number;
  }) => void;
  isPending?: boolean;
}

export function DeviationDialog({
  open,
  onOpenChange,
  orderInfo,
  onConfirm,
  isPending,
}: DeviationDialogProps) {
  const { t } = useTranslation();
  const { data: bakerySettings } = useBakerySettings();
  
  // Get deviation config from settings or use defaults
  const deviationConfig = bakerySettings?.deviation_config as DeviationConfig | undefined;
  const deviationTypes = deviationConfig?.types?.length 
    ? deviationConfig.types 
    : DEFAULT_DEVIATION_TYPES;
  const inputMode = deviationConfig?.inputMode || 'number';
  const predefinedValues = deviationConfig?.predefinedValues || DEFAULT_PREDEFINED_VALUES;
  
  const [selectedType, setSelectedType] = useState<string>(deviationTypes[0]?.id || 'shortage');
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  const [textNote, setTextNote] = useState<string>('');
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedType(deviationTypes[0]?.id || 'shortage');
      setActualQuantity(0);
      setTextNote('');
      setSelectedPredefined(null);
    }
  }, [open, deviationTypes]);
  
  const orderedQty = orderInfo?.orderedQuantity || 0;
  const difference = actualQuantity - orderedQty;
  
  const handleQuantityChange = (delta: number) => {
    setActualQuantity(prev => Math.max(0, prev + delta));
    setSelectedPredefined(null);
  };
  
  const handlePredefinedSelect = (value: string) => {
    setSelectedPredefined(value);
    if (value === 'Alle') {
      setActualQuantity(0);
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setActualQuantity(Math.max(0, orderedQty + numValue));
      }
    }
  };
  
  const handleConfirm = () => {
    const selectedTypeConfig = deviationTypes.find(t => t.id === selectedType);
    let note = '';
    
    if (inputMode === 'number') {
      note = `Bestilt: ${orderedQty}, Faktisk: ${actualQuantity}, Avvik: ${difference}`;
    } else if (inputMode === 'text') {
      note = textNote;
    } else if (inputMode === 'predefined') {
      note = selectedPredefined || '';
    }
    
    onConfirm({
      deviationType: selectedType,
      deviationNote: note,
      actualQuantity: inputMode === 'number' ? actualQuantity : undefined,
    });
  };
  
  const getTypeColor = (type: DeviationTypeConfig) => {
    return type.color || 'bg-muted';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            Registrer avvik
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Order info */}
          {orderInfo && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {orderInfo.customerName && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Kunde</span>
                  <span className="font-medium">{orderInfo.customerName}</span>
                </div>
              )}
              {orderInfo.productName && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Produkt</span>
                  <span className="font-medium">{orderInfo.productName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bestilt antall</span>
                <span className="font-bold text-lg">{orderedQty} stk</span>
              </div>
            </div>
          )}
          
          {/* Deviation type selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Avvikstype</Label>
            <div className="flex flex-wrap gap-2">
              {deviationTypes.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant={selectedType === type.id ? 'default' : 'outline'}
                  className={cn(
                    'h-12 px-4 text-base transition-all',
                    selectedType === type.id && getTypeColor(type),
                    selectedType === type.id && 'text-white border-transparent'
                  )}
                  onClick={() => setSelectedType(type.id)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Input based on mode */}
          {inputMode === 'number' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Faktisk pakket</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-full text-xl"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={actualQuantity <= 0}
                  >
                    <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    type="number"
                    value={actualQuantity}
                    onChange={(e) => {
                      setActualQuantity(Math.max(0, parseInt(e.target.value) || 0));
                      setSelectedPredefined(null);
                    }}
                    className="w-20 h-14 text-center text-2xl font-bold"
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-full text-xl"
                    onClick={() => handleQuantityChange(1)}
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                {predefinedValues.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={selectedPredefined === value ? 'default' : 'secondary'}
                    size="sm"
                    className="h-10 px-4"
                    onClick={() => handlePredefinedSelect(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              
              {/* Difference display */}
              <div className="flex justify-center">
                <Badge 
                  variant={difference < 0 ? 'destructive' : difference > 0 ? 'default' : 'secondary'}
                  className="text-lg px-4 py-2"
                >
                  Avvik: {difference > 0 ? '+' : ''}{difference} stk
                </Badge>
              </div>
            </div>
          )}
          
          {inputMode === 'text' && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Beskrivelse</Label>
              <Input
                value={textNote}
                onChange={(e) => setTextNote(e.target.value)}
                placeholder="Beskriv avviket..."
                className="h-14 text-lg"
              />
            </div>
          )}
          
          {inputMode === 'predefined' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Velg verdi</Label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedValues.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={selectedPredefined === value ? 'default' : 'outline'}
                    className="h-14 text-lg"
                    onClick={() => setSelectedPredefined(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 text-base"
          >
            Avbryt
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            className="h-12 px-6 text-base"
          >
            {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Registrer avvik
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
