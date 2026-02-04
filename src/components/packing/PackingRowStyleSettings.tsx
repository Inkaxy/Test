import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface PackingRowStyleSettingsProps {
  alternateRowsEnabled: boolean;
  onAlternateRowsChange: (enabled: boolean) => void;
  alternateRowColor: string;
  onAlternateRowColorChange: (color: string) => void;
}

const colorOptions = [
  { id: 'amber', name: 'Bakery Gold', preview: 'bg-amber-100 dark:bg-amber-900/30' },
  { id: 'blue', name: 'Nordic Blue', preview: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'green', name: 'Fresh Mint', preview: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'purple', name: 'Lavender', preview: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'rose', name: 'Soft Rose', preview: 'bg-rose-100 dark:bg-rose-900/30' },
  { id: 'slate', name: 'Classic Gray', preview: 'bg-slate-100 dark:bg-slate-800/50' },
];

export function PackingRowStyleSettings({
  alternateRowsEnabled,
  onAlternateRowsChange,
  alternateRowColor,
  onAlternateRowColorChange,
}: PackingRowStyleSettingsProps) {
  const { t, i18n } = useTranslation();
  const isNorwegian = i18n.language === 'nb';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isNorwegian ? 'Radstil' : 'Row Style'}
        </CardTitle>
        <CardDescription>
          {isNorwegian 
            ? 'Tilpass utseendet på produktlisten for enklere lesing'
            : 'Customize the product list appearance for easier reading'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alternate rows toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alternate-rows" className="text-base font-medium">
              {isNorwegian ? 'Alternerende radfarger' : 'Alternating row colors'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isNorwegian 
                ? 'Gi annenhver rad en annen bakgrunnsfarge'
                : 'Give every other row a different background color'
              }
            </p>
          </div>
          <Switch
            id="alternate-rows"
            checked={alternateRowsEnabled}
            onCheckedChange={onAlternateRowsChange}
          />
        </div>
        
        {/* Color selection */}
        {alternateRowsEnabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {isNorwegian ? 'Velg farge' : 'Select color'}
            </Label>
            <RadioGroup
              value={alternateRowColor}
              onValueChange={onAlternateRowColorChange}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {colorOptions.map((color) => (
                <Label
                  key={color.id}
                  htmlFor={color.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    alternateRowColor === color.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <RadioGroupItem value={color.id} id={color.id} className="sr-only" />
                  <div className={cn('w-6 h-6 rounded-full', color.preview)} />
                  <span className="text-sm font-medium">{color.name}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
        
        {/* Preview */}
        {alternateRowsEnabled && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {isNorwegian ? 'Forhåndsvisning' : 'Preview'}
            </Label>
            <div className="rounded-lg border overflow-hidden">
              {[1, 2, 3, 4].map((i) => {
                const isAlt = i % 2 === 0;
                const colorClass = colorOptions.find(c => c.id === alternateRowColor)?.preview;
                
                return (
                  <div
                    key={i}
                    className={cn(
                      'px-4 py-3 flex items-center gap-3 border-b last:border-b-0',
                      isAlt && colorClass
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold">
                      {i * 4}
                    </div>
                    <div>
                      <div className="font-medium">
                        {isNorwegian ? 'Eksempelprodukt' : 'Sample Product'} {i}
                      </div>
                      <div className="text-sm text-muted-foreground">1234{i}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
