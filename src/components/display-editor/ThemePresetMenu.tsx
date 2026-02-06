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
  {
    id: 'dark',
    label: 'Mørk',
    description: 'Klassisk mørkt tema',
    icon: <Moon className="h-4 w-4" />,
    background_color: '#1a1a2e',
    card_background_color: '#16213e',
    text_color: '#ffffff',
    pending_color: '#6b7280',
    packing_color: '#f59e0b',
    completed_color: '#22c55e',
  },
  {
    id: 'light',
    label: 'Lys',
    description: 'Rent lyst tema',
    icon: <Sun className="h-4 w-4" />,
    background_color: '#f8fafc',
    card_background_color: '#ffffff',
    text_color: '#0f172a',
    pending_color: '#94a3b8',
    packing_color: '#f59e0b',
    completed_color: '#22c55e',
  },
  {
    id: 'high-contrast',
    label: 'Høy kontrast',
    description: 'Maksimal lesbarhet',
    icon: <Contrast className="h-4 w-4" />,
    background_color: '#000000',
    card_background_color: '#1a1a1a',
    text_color: '#ffffff',
    pending_color: '#9ca3af',
    packing_color: '#fbbf24',
    completed_color: '#4ade80',
  },
  {
    id: 'bakery-gold',
    label: 'Bakeri Gull',
    description: 'Varme bakeri-toner',
    icon: <Wheat className="h-4 w-4" />,
    background_color: '#1c1917',
    card_background_color: '#292524',
    text_color: '#fef3c7',
    pending_color: '#78716c',
    packing_color: '#d4a574',
    completed_color: '#84cc16',
  },
  {
    id: 'industrial',
    label: 'Industriell',
    description: 'Moderne fabrikk-stil',
    icon: <Factory className="h-4 w-4" />,
    background_color: '#18181b',
    card_background_color: '#27272a',
    text_color: '#e4e4e7',
    pending_color: '#71717a',
    packing_color: '#3b82f6',
    completed_color: '#10b981',
  },
  {
    id: 'minimalist',
    label: 'Minimalistisk',
    description: 'Enkel og ren',
    icon: <Sparkles className="h-4 w-4" />,
    background_color: '#fafafa',
    card_background_color: '#ffffff',
    text_color: '#171717',
    pending_color: '#a3a3a3',
    packing_color: '#525252',
    completed_color: '#22c55e',
  },
  {
    id: 'ocean',
    label: 'Hav',
    description: 'Rolige blåtoner',
    icon: <Waves className="h-4 w-4" />,
    background_color: '#0c1929',
    card_background_color: '#1e3a5f',
    text_color: '#e0f2fe',
    pending_color: '#64748b',
    packing_color: '#0ea5e9',
    completed_color: '#2dd4bf',
  },
  {
    id: 'forest',
    label: 'Skog',
    description: 'Naturlige grønntoner',
    icon: <Leaf className="h-4 w-4" />,
    background_color: '#0f1f0f',
    card_background_color: '#1a2f1a',
    text_color: '#dcfce7',
    pending_color: '#4b5563',
    packing_color: '#84cc16',
    completed_color: '#22c55e',
  },
  {
    id: 'coffee',
    label: 'Kaffe',
    description: 'Varme bruntoner',
    icon: <Coffee className="h-4 w-4" />,
    background_color: '#1c1210',
    card_background_color: '#2d1f1a',
    text_color: '#fef3e2',
    pending_color: '#6b5b50',
    packing_color: '#c4a484',
    completed_color: '#a3e635',
  },
  {
    id: 'wine',
    label: 'Vin',
    description: 'Elegante rødtoner',
    icon: <Wine className="h-4 w-4" />,
    background_color: '#1a0a10',
    card_background_color: '#2d1520',
    text_color: '#fce7f3',
    pending_color: '#6b4f5c',
    packing_color: '#ec4899',
    completed_color: '#22c55e',
  },
  {
    id: 'sunrise',
    label: 'Soloppgang',
    description: 'Varme oransje toner',
    icon: <Sunrise className="h-4 w-4" />,
    background_color: '#1a1008',
    card_background_color: '#2d1c0f',
    text_color: '#fff7ed',
    pending_color: '#78716c',
    packing_color: '#fb923c',
    completed_color: '#4ade80',
  },
  {
    id: 'sky-blue',
    label: 'Himmelblå',
    description: 'Lys og rolig blå',
    icon: <Sun className="h-4 w-4" />,
    background_color: '#f0f9ff',
    card_background_color: '#ffffff',
    text_color: '#0c2340',
    pending_color: '#bfdbfe',
    packing_color: '#3b82f6',
    completed_color: '#10b981',
  },
  {
    id: 'sage-green',
    label: 'Salvie grønn',
    description: 'Beroligende grønnton',
    icon: <Leaf className="h-4 w-4" />,
    background_color: '#f2fdf7',
    card_background_color: '#ffffff',
    text_color: '#0f3d2a',
    pending_color: '#c6f6d5',
    packing_color: '#059669',
    completed_color: '#047857',
  },
  {
    id: 'peach',
    label: 'Fersken',
    description: 'Varm og innbydende',
    icon: <Sunrise className="h-4 w-4" />,
    background_color: '#fff7ed',
    card_background_color: '#ffffff',
    text_color: '#5a2817',
    pending_color: '#fed7aa',
    packing_color: '#ea580c',
    completed_color: '#dc2626',
  },
  {
    id: 'lavender',
    label: 'Lavendel',
    description: 'Elegant og rolig',
    icon: <Sparkles className="h-4 w-4" />,
    background_color: '#faf5ff',
    card_background_color: '#ffffff',
    text_color: '#4a1172',
    pending_color: '#e9d5ff',
    packing_color: '#a855f7',
    completed_color: '#7c3aed',
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
