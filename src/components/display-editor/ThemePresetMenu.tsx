import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Moon, Sun, Contrast, Palette, Wheat, Factory, Croissant, Cookie, Cake, UtensilsCrossed } from 'lucide-react';

interface ThemePreset {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'bakery' | 'industrial' | 'light' | 'dark';
  background_color: string;
  card_background_color: string;
  text_color: string;
  pending_color: string;
  packing_color: string;
  completed_color: string;
}

const THEME_PRESETS: ThemePreset[] = [
  // === BAKERI-TEMAER (optimalisert for bakerimiljø) ===
  {
    id: 'bakery-classic',
    label: 'Bakeri Klassisk',
    description: 'Varme brødtoner, perfekt for tradisjonelt bakeri',
    icon: <Croissant className="h-4 w-4" />,
    category: 'bakery',
    background_color: '#1a1512',
    card_background_color: '#2d2520',
    text_color: '#fef3e2',
    pending_color: '#d4a574',
    packing_color: '#f59e0b',
    completed_color: '#84cc16',
  },
  {
    id: 'bakery-gold',
    label: 'Gyllen Skorpe',
    description: 'Varm gullaktig som nystekt brød',
    icon: <Wheat className="h-4 w-4" />,
    category: 'bakery',
    background_color: '#1c1917',
    card_background_color: '#292524',
    text_color: '#fef3c7',
    pending_color: '#a8a29e',
    packing_color: '#fbbf24',
    completed_color: '#4ade80',
  },
  {
    id: 'bakery-rustic',
    label: 'Rustikk',
    description: 'Jordnære toner for håndverksbakeri',
    icon: <Cookie className="h-4 w-4" />,
    category: 'bakery',
    background_color: '#1f1a16',
    card_background_color: '#3d322a',
    text_color: '#f5ebe0',
    pending_color: '#c9b99a',
    packing_color: '#e09f3e',
    completed_color: '#6a994e',
  },
  {
    id: 'bakery-modern',
    label: 'Moderne Bakeri',
    description: 'Stilrent design for moderne bakerier',
    icon: <Cake className="h-4 w-4" />,
    category: 'bakery',
    background_color: '#1a1a1e',
    card_background_color: '#28282e',
    text_color: '#f4f4f5',
    pending_color: '#a1a1aa',
    packing_color: '#d4a574',
    completed_color: '#22c55e',
  },
  
  // === INDUSTRIELLE TEMAER (for produksjonsmiljø) ===
  {
    id: 'industrial-steel',
    label: 'Stål',
    description: 'Profesjonell industri-look',
    icon: <Factory className="h-4 w-4" />,
    category: 'industrial',
    background_color: '#18181b',
    card_background_color: '#27272a',
    text_color: '#fafafa',
    pending_color: '#71717a',
    packing_color: '#3b82f6',
    completed_color: '#22c55e',
  },
  {
    id: 'industrial-dark',
    label: 'Industri Mørk',
    description: 'Høy kontrast for produksjonshaller',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    category: 'industrial',
    background_color: '#0a0a0b',
    card_background_color: '#1a1a1c',
    text_color: '#ffffff',
    pending_color: '#6b7280',
    packing_color: '#60a5fa',
    completed_color: '#34d399',
  },
  {
    id: 'high-contrast',
    label: 'Maks Kontrast',
    description: 'Best mulig lesbarhet på avstand',
    icon: <Contrast className="h-4 w-4" />,
    category: 'industrial',
    background_color: '#000000',
    card_background_color: '#141414',
    text_color: '#ffffff',
    pending_color: '#9ca3af',
    packing_color: '#fcd34d',
    completed_color: '#4ade80',
  },
  
  // === MØRKE TEMAER (generelle) ===
  {
    id: 'dark-slate',
    label: 'Skifer',
    description: 'Elegant mørkt tema',
    icon: <Moon className="h-4 w-4" />,
    category: 'dark',
    background_color: '#0f172a',
    card_background_color: '#1e293b',
    text_color: '#f8fafc',
    pending_color: '#94a3b8',
    packing_color: '#f59e0b',
    completed_color: '#10b981',
  },
  {
    id: 'dark-midnight',
    label: 'Midnatt',
    description: 'Dypt blått for nattskift',
    icon: <Moon className="h-4 w-4" />,
    category: 'dark',
    background_color: '#0c1222',
    card_background_color: '#162032',
    text_color: '#e0e7ff',
    pending_color: '#818cf8',
    packing_color: '#fbbf24',
    completed_color: '#34d399',
  },
  
  // === LYSE TEMAER (for godt opplyste rom) ===
  {
    id: 'light-clean',
    label: 'Lys Ren',
    description: 'Rent og profesjonelt',
    icon: <Sun className="h-4 w-4" />,
    category: 'light',
    background_color: '#f8fafc',
    card_background_color: '#ffffff',
    text_color: '#1e293b',
    pending_color: '#64748b',
    packing_color: '#d97706',
    completed_color: '#16a34a',
  },
  {
    id: 'light-warm',
    label: 'Lys Varm',
    description: 'Behagelig og innbydende',
    icon: <Sun className="h-4 w-4" />,
    category: 'light',
    background_color: '#fffbf5',
    card_background_color: '#ffffff',
    text_color: '#44403c',
    pending_color: '#78716c',
    packing_color: '#ea580c',
    completed_color: '#16a34a',
  },
  {
    id: 'light-cream',
    label: 'Kremhvit',
    description: 'Varm bakeri-atmosfære',
    icon: <Croissant className="h-4 w-4" />,
    category: 'light',
    background_color: '#fefcf3',
    card_background_color: '#ffffff',
    text_color: '#78350f',
    pending_color: '#92400e',
    packing_color: '#d97706',
    completed_color: '#15803d',
  },
  
  // === EGENDEFINERT ===
  {
    id: 'custom',
    label: 'Egendefinert',
    description: 'Velg egne farger',
    icon: <Palette className="h-4 w-4" />,
    category: 'dark',
    background_color: '',
    card_background_color: '',
    text_color: '',
    pending_color: '',
    packing_color: '',
    completed_color: '',
  },
];

const THEME_CATEGORIES = [
  { id: 'bakery', label: 'Bakeri', description: 'Optimalisert for bakerimiljø' },
  { id: 'industrial', label: 'Industri', description: 'For produksjonshaller' },
  { id: 'dark', label: 'Mørke', description: 'Generelle mørke temaer' },
  { id: 'light', label: 'Lyse', description: 'For godt opplyste rom' },
] as const;

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

  const renderThemeButton = (theme: ThemePreset) => {
    const isSelected = currentTheme === theme.id || 
      (!currentTheme && theme.id === 'bakery-classic');
    
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
          'p-2 rounded-lg border-2 transition-all text-left relative group',
          isSelected
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-primary/50'
        )}
      >
        {/* Color preview */}
        <div 
          className="h-8 rounded-md mb-1.5 flex items-center justify-center gap-1 p-1"
          style={{ backgroundColor: displayBg }}
        >
          <div 
            className="h-full flex-1 rounded"
            style={{ backgroundColor: displayCard }}
          />
          <div className="flex flex-col gap-0.5 h-full justify-center">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: displayPending }}
            />
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: displayPacking }}
            />
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: displayCompleted }}
            />
          </div>
        </div>
        
        {/* Label and icon */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground shrink-0">{theme.icon}</span>
          <span className="text-xs font-medium truncate">{theme.label}</span>
        </div>
        
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
            <Check className="h-2.5 w-2.5" />
          </div>
        )}
        
        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {theme.description}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Tema-forhåndsvalg</Label>
      
      {THEME_CATEGORIES.map((category) => {
        const themesInCategory = THEME_PRESETS.filter(t => t.category === category.id && t.id !== 'custom');
        if (themesInCategory.length === 0) return null;
        
        return (
          <div key={category.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {category.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {themesInCategory.map(renderThemeButton)}
            </div>
          </div>
        );
      })}
      
      {/* Custom theme option */}
      <div className="pt-2 border-t">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {renderThemeButton(THEME_PRESETS.find(t => t.id === 'custom')!)}
        </div>
      </div>
    </div>
  );
}

export { THEME_PRESETS, THEME_CATEGORIES, type ThemePreset };
