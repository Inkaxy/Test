import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Moon, Sun, Contrast, Palette, Wheat, Factory, Sparkles, Waves, Leaf, Coffee, Wine, Sunrise } from 'lucide-react';

interface ThemePreset {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  background_color: string;
  card_background_color: string;
  text_color: string;
  pending_color: string;
  packing_color: string;
  completed_color: string;
}

const THEME_PRESETS: ThemePreset[] = [
  // === MØRKE TEMAER ===
  {
    id: 'dark',
    label: 'Mørk',
    description: 'Klassisk mørkt tema',
    icon: <Moon className="h-4 w-4" />,
    background_color: '#0f172a',
    card_background_color: '#1e293b',
    text_color: '#f8fafc',
    pending_color: '#94a3b8',
    packing_color: '#fbbf24',
    completed_color: '#4ade80',
  },
  {
    id: 'high-contrast',
    label: 'Høy kontrast',
    description: 'Maksimal lesbarhet',
    icon: <Contrast className="h-4 w-4" />,
    background_color: '#000000',
    card_background_color: '#171717',
    text_color: '#ffffff',
    pending_color: '#a1a1aa',
    packing_color: '#facc15',
    completed_color: '#22c55e',
  },
  {
    id: 'bakery-gold',
    label: 'Bakeri Gull',
    description: 'Varme bakeri-toner',
    icon: <Wheat className="h-4 w-4" />,
    background_color: '#1c1917',
    card_background_color: '#292524',
    text_color: '#fef3c7',
    pending_color: '#a8a29e',
    packing_color: '#fbbf24',
    completed_color: '#84cc16',
  },
  {
    id: 'industrial',
    label: 'Industriell',
    description: 'Moderne fabrikk-stil',
    icon: <Factory className="h-4 w-4" />,
    background_color: '#18181b',
    card_background_color: '#27272a',
    text_color: '#fafafa',
    pending_color: '#a1a1aa',
    packing_color: '#60a5fa',
    completed_color: '#34d399',
  },
  {
    id: 'ocean',
    label: 'Hav',
    description: 'Rolige blåtoner',
    icon: <Waves className="h-4 w-4" />,
    background_color: '#0c1929',
    card_background_color: '#1e3a5f',
    text_color: '#f0f9ff',
    pending_color: '#93c5fd',
    packing_color: '#38bdf8',
    completed_color: '#2dd4bf',
  },
  {
    id: 'forest',
    label: 'Skog',
    description: 'Naturlige grønntoner',
    icon: <Leaf className="h-4 w-4" />,
    background_color: '#0f1f0f',
    card_background_color: '#1a3318',
    text_color: '#ecfccb',
    pending_color: '#86efac',
    packing_color: '#a3e635',
    completed_color: '#4ade80',
  },
  {
    id: 'coffee',
    label: 'Kaffe',
    description: 'Varme bruntoner',
    icon: <Coffee className="h-4 w-4" />,
    background_color: '#1c1210',
    card_background_color: '#3d2a22',
    text_color: '#fef3e2',
    pending_color: '#d6bcab',
    packing_color: '#fbbf24',
    completed_color: '#a3e635',
  },
  {
    id: 'wine',
    label: 'Vin',
    description: 'Elegante rødtoner',
    icon: <Wine className="h-4 w-4" />,
    background_color: '#1a0a10',
    card_background_color: '#3d1525',
    text_color: '#fce7f3',
    pending_color: '#f9a8d4',
    packing_color: '#f472b6',
    completed_color: '#4ade80',
  },
  {
    id: 'sunrise',
    label: 'Soloppgang',
    description: 'Varme oransje toner',
    icon: <Sunrise className="h-4 w-4" />,
    background_color: '#1a1008',
    card_background_color: '#3d2a12',
    text_color: '#fff7ed',
    pending_color: '#fdba74',
    packing_color: '#fb923c',
    completed_color: '#4ade80',
  },
  // === LYSE TEMAER ===
  {
    id: 'light',
    label: 'Lys',
    description: 'Rent lyst tema',
    icon: <Sun className="h-4 w-4" />,
    background_color: '#f8fafc',
    card_background_color: '#ffffff',
    text_color: '#0f172a',
    pending_color: '#64748b',
    packing_color: '#f59e0b',
    completed_color: '#16a34a',
  },
  {
    id: 'minimalist',
    label: 'Minimalistisk',
    description: 'Enkel og ren',
    icon: <Sparkles className="h-4 w-4" />,
    background_color: '#fafafa',
    card_background_color: '#ffffff',
    text_color: '#171717',
    pending_color: '#737373',
    packing_color: '#404040',
    completed_color: '#16a34a',
  },
  {
    id: 'sky-blue',
    label: 'Himmelblå',
    description: 'Lys og rolig blå',
    icon: <Waves className="h-4 w-4" />,
    background_color: '#f0f9ff',
    card_background_color: '#ffffff',
    text_color: '#0c4a6e',
    pending_color: '#0284c7',
    packing_color: '#0369a1',
    completed_color: '#059669',
  },
  {
    id: 'sage-green',
    label: 'Salvie grønn',
    description: 'Beroligende grønnton',
    icon: <Leaf className="h-4 w-4" />,
    background_color: '#f0fdf4',
    card_background_color: '#ffffff',
    text_color: '#14532d',
    pending_color: '#16a34a',
    packing_color: '#15803d',
    completed_color: '#047857',
  },
  {
    id: 'peach',
    label: 'Fersken',
    description: 'Varm og innbydende',
    icon: <Sunrise className="h-4 w-4" />,
    background_color: '#fff7ed',
    card_background_color: '#ffffff',
    text_color: '#7c2d12',
    pending_color: '#c2410c',
    packing_color: '#ea580c',
    completed_color: '#16a34a',
  },
  {
    id: 'lavender',
    label: 'Lavendel',
    description: 'Elegant og rolig',
    icon: <Sparkles className="h-4 w-4" />,
    background_color: '#faf5ff',
    card_background_color: '#ffffff',
    text_color: '#581c87',
    pending_color: '#9333ea',
    packing_color: '#7c3aed',
    completed_color: '#16a34a',
  },
  {
    id: 'cream',
    label: 'Krem',
    description: 'Varm og behagelig',
    icon: <Sun className="h-4 w-4" />,
    background_color: '#fffbeb',
    card_background_color: '#ffffff',
    text_color: '#78350f',
    pending_color: '#b45309',
    packing_color: '#d97706',
    completed_color: '#16a34a',
  },
  {
    id: 'custom',
    label: 'Egendefinert',
    description: 'Velg egne farger',
    icon: <Palette className="h-4 w-4" />,
    background_color: '',
    card_background_color: '',
    text_color: '',
    pending_color: '',
    packing_color: '',
    completed_color: '',
  },
];

interface ThemePresetMenuProps {
  currentTheme: string;
  currentSettings: {
    background_color: string;
    card_background_color: string;
    text_color: string;
    pending_color: string;
    packing_color: string;
    completed_color: string;
  };
  onSelectTheme: (theme: ThemePreset) => void;
}

export function ThemePresetMenu({ currentTheme, currentSettings, onSelectTheme }: ThemePresetMenuProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Tema-forhåndsvalg</Label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {THEME_PRESETS.map((theme) => {
          const isSelected = currentTheme === theme.id || 
            (!currentTheme && theme.id === 'dark');
          
          // For custom theme, use current settings colors
          const displayBg = theme.id === 'custom' ? currentSettings.background_color : theme.background_color;
          const displayCard = theme.id === 'custom' ? currentSettings.card_background_color : theme.card_background_color;
          const displayPending = theme.id === 'custom' ? currentSettings.pending_color : theme.pending_color;
          const displayPacking = theme.id === 'custom' ? currentSettings.packing_color : theme.packing_color;
          const displayCompleted = theme.id === 'custom' ? currentSettings.completed_color : theme.completed_color;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme)}
              className={cn(
                'p-2.5 rounded-lg border-2 transition-all text-left relative group',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {/* Color preview */}
              <div 
                className="h-10 rounded-md mb-2 flex items-center justify-center gap-1 p-1.5"
                style={{ backgroundColor: displayBg }}
              >
                <div 
                  className="h-full flex-1 rounded"
                  style={{ backgroundColor: displayCard }}
                />
                <div className="flex flex-col gap-0.5 h-full justify-center">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: displayPending }}
                  />
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: displayPacking }}
                  />
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: displayCompleted }}
                  />
                </div>
              </div>
              
              {/* Label and icon */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{theme.icon}</span>
                <span className="text-xs font-medium truncate">{theme.label}</span>
              </div>
              
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {theme.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { THEME_PRESETS, type ThemePreset };
