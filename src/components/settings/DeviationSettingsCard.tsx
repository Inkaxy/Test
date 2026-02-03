import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Plus, X, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useBakerySettings, 
  useUpdateBakerySettings, 
  DeviationTypeConfig, 
  DeviationInputMode, 
  DeviationConfig 
} from '@/hooks/useBakerySettings';
import { useToast } from '@/hooks/use-toast';
import { 
  DEFAULT_DEVIATION_TYPES, 
  DEFAULT_PREDEFINED_VALUES,
} from '@/components/packing/DeviationDialog';

const COLOR_OPTIONS = [
  { value: 'bg-orange-500', label: 'Oransje', preview: 'bg-orange-500' },
  { value: 'bg-red-500', label: 'Rød', preview: 'bg-red-500' },
  { value: 'bg-blue-500', label: 'Blå', preview: 'bg-blue-500' },
  { value: 'bg-green-500', label: 'Grønn', preview: 'bg-green-500' },
  { value: 'bg-purple-500', label: 'Lilla', preview: 'bg-purple-500' },
  { value: 'bg-yellow-500', label: 'Gul', preview: 'bg-yellow-500' },
  { value: 'bg-pink-500', label: 'Rosa', preview: 'bg-pink-500' },
  { value: 'bg-gray-500', label: 'Grå', preview: 'bg-gray-500' },
];

export function DeviationSettingsCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading } = useBakerySettings();
  const updateSettings = useUpdateBakerySettings();
  
  const [deviationTypes, setDeviationTypes] = useState<DeviationTypeConfig[]>(DEFAULT_DEVIATION_TYPES);
  const [inputMode, setInputMode] = useState<DeviationInputMode>('number');
  const [predefinedValues, setPredefinedValues] = useState<string[]>(DEFAULT_PREDEFINED_VALUES);
  const [newTypeName, setNewTypeName] = useState('');
  const [newPredefinedValue, setNewPredefinedValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load settings
  useEffect(() => {
    if (settings?.deviation_config) {
      const config = settings.deviation_config as DeviationConfig;
      if (config.types?.length) setDeviationTypes(config.types);
      if (config.inputMode) setInputMode(config.inputMode);
      if (config.predefinedValues?.length) setPredefinedValues(config.predefinedValues);
    }
  }, [settings]);
  
  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    
    const newType: DeviationTypeConfig = {
      id: newTypeName.toLowerCase().replace(/\s+/g, '_'),
      label: newTypeName.trim(),
      color: COLOR_OPTIONS[deviationTypes.length % COLOR_OPTIONS.length].value,
    };
    
    setDeviationTypes([...deviationTypes, newType]);
    setNewTypeName('');
    setHasChanges(true);
  };
  
  const handleRemoveType = (id: string) => {
    setDeviationTypes(deviationTypes.filter(t => t.id !== id));
    setHasChanges(true);
  };
  
  const handleTypeColorChange = (id: string, color: string) => {
    setDeviationTypes(deviationTypes.map(t => 
      t.id === id ? { ...t, color } : t
    ));
    setHasChanges(true);
  };
  
  const handleAddPredefinedValue = () => {
    if (!newPredefinedValue.trim()) return;
    setPredefinedValues([...predefinedValues, newPredefinedValue.trim()]);
    setNewPredefinedValue('');
    setHasChanges(true);
  };
  
  const handleRemovePredefinedValue = (value: string) => {
    setPredefinedValues(predefinedValues.filter(v => v !== value));
    setHasChanges(true);
  };
  
  const handleInputModeChange = (mode: DeviationInputMode) => {
    setInputMode(mode);
    setHasChanges(true);
  };
  
  const handleSave = async () => {
    try {
      const deviationConfig: DeviationConfig = {
        types: deviationTypes,
        inputMode,
        predefinedValues,
      };
      
      await updateSettings.mutateAsync({ deviation_config: deviationConfig });
      
      toast({
        title: 'Innstillinger lagret',
        description: 'Avviksinnstillingene ble oppdatert.',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke lagre innstillinger',
      });
    }
  };
  
  const handleReset = () => {
    setDeviationTypes(DEFAULT_DEVIATION_TYPES);
    setInputMode('number');
    setPredefinedValues(DEFAULT_PREDEFINED_VALUES);
    setHasChanges(true);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Avviksrapportering
        </CardTitle>
        <CardDescription>
          Konfigurer avvikstyper og hvordan brukere skal registrere avvik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deviation Types */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Avvikstyper</Label>
          <div className="space-y-2">
            {deviationTypes.map((type, index) => (
              <div 
                key={type.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Badge className={cn('text-white', type.color)}>
                  {type.label}
                </Badge>
                <div className="flex-1" />
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        'w-6 h-6 rounded-full transition-all',
                        color.preview,
                        type.color === color.value && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      onClick={() => handleTypeColorChange(type.id, color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveType(type.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Add new type */}
          <div className="flex gap-2">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Ny avvikstype..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddType}
              disabled={!newTypeName.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Legg til
            </Button>
          </div>
        </div>
        
        {/* Input Mode */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Utfyllingsmodus</Label>
          <RadioGroup
            value={inputMode}
            onValueChange={(v) => handleInputModeChange(v as DeviationInputMode)}
            className="grid gap-3"
          >
            <Label
              htmlFor="mode-number"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="number" id="mode-number" />
              <div>
                <p className="font-medium">Tall (antall)</p>
                <p className="text-sm text-muted-foreground">
                  Brukere angir faktisk pakket antall med +/- knapper
                </p>
              </div>
            </Label>
            <Label
              htmlFor="mode-text"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="text" id="mode-text" />
              <div>
                <p className="font-medium">Tekst (fritekst)</p>
                <p className="text-sm text-muted-foreground">
                  Brukere skriver en beskrivelse av avviket
                </p>
              </div>
            </Label>
            <Label
              htmlFor="mode-predefined"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="predefined" id="mode-predefined" />
              <div>
                <p className="font-medium">Forhåndsdefinerte valg</p>
                <p className="text-sm text-muted-foreground">
                  Brukere velger fra forhåndsdefinerte verdier
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>
        
        {/* Predefined Values (shown for both number and predefined mode) */}
        {(inputMode === 'number' || inputMode === 'predefined') && (
          <div className="space-y-4">
            <Label className="text-base font-medium">
              {inputMode === 'number' ? 'Hurtigvalg-knapper' : 'Forhåndsdefinerte verdier'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {predefinedValues.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="text-sm px-3 py-1.5 gap-2"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => handleRemovePredefinedValue(value)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPredefinedValue}
                onChange={(e) => setNewPredefinedValue(e.target.value)}
                placeholder="Ny verdi (f.eks. -1, -2, Alle)..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPredefinedValue()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPredefinedValue}
                disabled={!newPredefinedValue.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Legg til
              </Button>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Tilbakestill til standard
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lagre innstillinger
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
