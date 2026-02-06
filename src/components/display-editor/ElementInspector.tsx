import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Settings2, Palette, Type, Layout, Sparkles, ArrowUpDown, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { EDITABLE_ELEMENTS, EditableElementConfig } from './types';
import { ColorPicker } from './ColorPicker';
import { SizeSlider, FONT_SIZE_PRESETS } from './SizeSlider';
import { ImageUpload } from './ImageUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ElementInspectorProps {
  selectedElement: string | null;
  settings: DisplaySettings;
  onUpdateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
  onClose: () => void;
}

// Group settings by type for better organization
type SettingGroup = 'visibility' | 'typography' | 'colors' | 'layout' | 'animation' | 'sorting' | 'images';

function getSettingGroup(key: keyof DisplaySettings): SettingGroup {
  if (key.includes('logo_') || key.includes('background_image')) return 'images';
  if (key.includes('show_') || key.includes('enabled')) return 'visibility';
  if (key.includes('font_size') || key.includes('format')) return 'typography';
  if (key.includes('color')) return 'colors';
  if (key.includes('animation') || key.includes('flash') || key.includes('highlight')) return 'animation';
  if (key.includes('sort')) return 'sorting';
  return 'layout';
}

const GROUP_ICONS: Record<SettingGroup, React.ReactNode> = {
  visibility: <Settings2 className="h-4 w-4" />,
  typography: <Type className="h-4 w-4" />,
  colors: <Palette className="h-4 w-4" />,
  layout: <Layout className="h-4 w-4" />,
  animation: <Sparkles className="h-4 w-4" />,
  sorting: <ArrowUpDown className="h-4 w-4" />,
  images: <ImageIcon className="h-4 w-4" />,
};

const GROUP_LABELS: Record<SettingGroup, string> = {
  visibility: 'Synlighet',
  typography: 'Typografi',
  colors: 'Farger',
  layout: 'Layout',
  animation: 'Animasjoner',
  sorting: 'Sortering',
  images: 'Bilder',
};

export function ElementInspector({
  selectedElement,
  settings,
  onUpdateSetting,
  onClose,
}: ElementInspectorProps) {
  const [openGroups, setOpenGroups] = React.useState<SettingGroup[]>(['visibility', 'typography']);
  const elementConfig = EDITABLE_ELEMENTS.find(e => e.id === selectedElement);
  
  if (!selectedElement || !elementConfig) {
    return null;
  }

  // Group settings by type
  const groupedSettings = elementConfig.settingKeys.reduce((acc, key) => {
    const group = getSettingGroup(key);
    if (!acc[group]) acc[group] = [];
    acc[group].push(key);
    return acc;
  }, {} as Record<SettingGroup, (keyof DisplaySettings)[]>);

  const toggleGroup = (group: SettingGroup) => {
    setOpenGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const renderSettingControl = (settingKey: keyof DisplaySettings) => {
    const value = settings[settingKey];
    
    // Boolean toggles
    if (typeof value === 'boolean') {
      const labelMap: Record<string, string> = {
        header_show_bakery_name: 'Vis bakerinavn',
        header_show_category_name: 'Vis kategorinavn',
        header_show_clock: 'Vis klokke',
        header_show_date: 'Vis dato',
        stats_show_total_progress: 'Vis total fremdrift',
        stats_show_packed_count: 'Vis pakket-teller',
        stats_show_remaining_count: 'Vis gjenstående',
        card_show_customer_number: 'Vis kundenummer',
        card_show_product_list: 'Vis produktliste',
        card_show_individual_progress: 'Vis kundeprogress',
        card_show_product_numbers: 'Vis produktnummer',
        card_show_quantity_as_trays: 'Vis antall som brett',
        card_compact_mode: 'Kompakt modus',
        animation_enabled: 'Animasjoner aktivert',
        animation_on_status_change: 'Animer statusendringer',
        animation_highlight_new: 'Marker nye elementer',
        auto_scroll_enabled: 'Auto-scroll aktivert',
        auto_scroll_pause_on_hover: 'Pause ved hover',
        realtime_flash_on_update: 'Blink ved oppdatering',
        customer_sort_completed_last: 'Ferdige kunder sist',
      };
      
      return (
        <div key={settingKey} className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/50 transition-colors">
          <Label className="text-sm cursor-pointer">{labelMap[settingKey] || settingKey}</Label>
          <Switch
            checked={value}
            onCheckedChange={(v) => onUpdateSetting(settingKey, v as never)}
          />
        </div>
      );
    }
    
    // Font size sliders
    if (settingKey.includes('font_size')) {
      const labelMap: Record<string, string> = {
        header_bakery_font_size: 'Bakerinavn størrelse',
        header_category_font_size: 'Kategorinavn størrelse',
        header_clock_font_size: 'Klokke størrelse',
        header_date_font_size: 'Dato størrelse',
        stats_value_font_size: 'Verdi størrelse',
        stats_label_font_size: 'Etikett størrelse',
        card_customer_name_font_size: 'Kundenavn størrelse',
        card_product_font_size: 'Produkt størrelse',
        card_quantity_font_size: 'Antall størrelse',
        card_progress_font_size: 'Progress størrelse',
      };
      
      return (
        <SizeSlider
          key={settingKey}
          label={labelMap[settingKey] || 'Størrelse'}
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          presets={FONT_SIZE_PRESETS}
          min={0.5}
          max={4}
        />
      );
    }
    
    // Color pickers
    if (settingKey.includes('color')) {
      const labelMap: Record<string, string> = {
        background_color: 'Bakgrunnsfarge',
        card_background_color: 'Kortbakgrunn',
        text_color: 'Tekstfarge',
        pending_color: 'Venter-farge',
        packing_color: 'Pakker-farge',
        completed_color: 'Ferdig-farge',
      };
      
      return (
        <ColorPicker
          key={settingKey}
          label={labelMap[settingKey] || 'Farge'}
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
        />
      );
    }
    
    // Border radius / gaps
    if (settingKey === 'border_radius' || settingKey === 'gap_size' || settingKey === 'padding') {
      const labelMap: Record<string, string> = {
        border_radius: 'Hjørneradius',
        gap_size: 'Mellomrom',
        padding: 'Padding',
      };
      
      return (
        <SizeSlider
          key={settingKey}
          label={labelMap[settingKey] || settingKey}
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          min={0}
          max={3}
        />
      );
    }
    
    // Columns
    if (settingKey === 'columns') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Antall kolonner</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((col) => (
              <Button
                key={col}
                variant={value === col ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdateSetting('columns', col as never)}
                className="w-8 h-8"
              >
                {col}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    
    // Clock format
    if (settingKey === 'header_clock_format') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Klokkeformat</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="24h">24-timers (14:30)</SelectItem>
              <SelectItem value="12h">12-timers (2:30 PM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Progress bar style
    if (settingKey === 'stats_progress_bar_style') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Progress-stil</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="bar">Stolpe</SelectItem>
              <SelectItem value="circle">Sirkel</SelectItem>
              <SelectItem value="none">Ingen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Progress bar height
    if (settingKey === 'stats_progress_bar_height') {
      return (
        <SizeSlider
          key={settingKey}
          label="Progress-høyde"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          min={0.25}
          max={2}
        />
      );
    }
    
    // Border width
    if (settingKey === 'card_border_width') {
      return (
        <SizeSlider
          key={settingKey}
          label="Kanttykkelse"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          unit="px"
          min={0}
          max={8}
          step={1}
        />
      );
    }
    
    // Animation speed
    if (settingKey === 'animation_speed') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Animasjonshastighet</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="fast">Rask</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="slow">Sakte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Animation highlight duration
    if (settingKey === 'animation_highlight_duration') {
      return (
        <div key={settingKey} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Markeringsvarighet</Label>
            <span className="text-xs text-muted-foreground">{(value as number) / 1000}s</span>
          </div>
          <Slider
            value={[(value as number)]}
            onValueChange={([v]) => onUpdateSetting(settingKey, v as never)}
            min={1000}
            max={10000}
            step={500}
            className="w-full"
          />
        </div>
      );
    }
    
    // Auto scroll speed
    if (settingKey === 'auto_scroll_speed') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Scroll-hastighet</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="slow">Sakte</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="fast">Rask</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Sort mode
    if (settingKey === 'customer_sort_mode') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Sorteringsmodus</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="name">Kundenavn</SelectItem>
              <SelectItem value="customer_number">Kundenummer</SelectItem>
              <SelectItem value="progress">Fremdrift</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Sort direction
    if (settingKey === 'customer_sort_direction') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Sorteringsretning</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="asc">Stigende (A-Å)</SelectItem>
              <SelectItem value="desc">Synkende (Å-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Logo URL
    if (settingKey === 'logo_url') {
      return (
        <ImageUpload
          key={settingKey}
          label="Logo"
          value={value as string | null}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          folderPath="logos"
          aspectRatio="auto"
        />
      );
    }
    
    // Background image URL
    if (settingKey === 'background_image_url') {
      return (
        <ImageUpload
          key={settingKey}
          label="Bakgrunnsbilde"
          value={value as string | null}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          folderPath="backgrounds"
          aspectRatio="16:9"
        />
      );
    }
    
    // Logo position
    if (settingKey === 'logo_position') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Logo-posisjon</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="left">Venstre</SelectItem>
              <SelectItem value="center">Senter</SelectItem>
              <SelectItem value="right">Høyre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Logo size
    if (settingKey === 'logo_size') {
      return (
        <SizeSlider
          key={settingKey}
          label="Logo-størrelse"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          min={1}
          max={8}
        />
      );
    }
    
    // Background image opacity
    if (settingKey === 'background_image_opacity') {
      return (
        <div key={settingKey} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Gjennomsiktighet</Label>
            <span className="text-xs text-muted-foreground">{Math.round((value as number) * 100)}%</span>
          </div>
          <Slider
            value={[(value as number)]}
            onValueChange={([v]) => onUpdateSetting(settingKey, v as never)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>
      );
    }
    
    // Background image blur
    if (settingKey === 'background_image_blur') {
      return (
        <div key={settingKey} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Uskarphet</Label>
            <span className="text-xs text-muted-foreground">{value}px</span>
          </div>
          <Slider
            value={[(value as number)]}
            onValueChange={([v]) => onUpdateSetting(settingKey, v as never)}
            min={0}
            max={20}
            step={1}
            className="w-full"
          />
        </div>
      );
    }
    
    // View mode
    if (settingKey === 'packing_view_mode') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Visningsmodus</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="cards">Kort</SelectItem>
              <SelectItem value="table">Tabell</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Table row height
    if (settingKey === 'table_row_height') {
      return (
        <div key={settingKey} className="space-y-2">
          <Label className="text-sm">Radhøyde</Label>
          <Select
            value={value as string}
            onValueChange={(v) => onUpdateSetting(settingKey, v as never)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="compact">Kompakt</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="touch">Touch-optimalisert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    
    // Table font size
    if (settingKey === 'table_font_size') {
      return (
        <SizeSlider
          key={settingKey}
          label="Tabell skriftstørrelse"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          presets={FONT_SIZE_PRESETS}
          min={0.75}
          max={2.5}
        />
      );
    }
    
    // Table touch row spacing
    if (settingKey === 'table_touch_row_spacing') {
      return (
        <SizeSlider
          key={settingKey}
          label="Radavstand"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
          min={0.25}
          max={2}
        />
      );
    }
    
    // Table show toggles
    if (settingKey === 'table_show_customer_number' || 
        settingKey === 'table_show_progress_bar' || 
        settingKey === 'table_show_order_count' ||
        settingKey === 'table_alternate_rows' ||
        settingKey === 'table_sticky_header') {
      const labelMap: Record<string, string> = {
        table_show_customer_number: 'Vis kundenummer',
        table_show_progress_bar: 'Vis fremdriftslinje',
        table_show_order_count: 'Vis ordreantall',
        table_alternate_rows: 'Zebra-striping',
        table_sticky_header: 'Fast header',
      };
      
      return (
        <div key={settingKey} className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/50 transition-colors">
          <Label className="text-sm cursor-pointer">{labelMap[settingKey] || settingKey}</Label>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(v) => onUpdateSetting(settingKey, v as never)}
          />
        </div>
      );
    }
    
    // Table alternate row color
    if (settingKey === 'table_alternate_row_color') {
      return (
        <ColorPicker
          key={settingKey}
          label="Zebra-farge"
          value={value as string}
          onChange={(v) => onUpdateSetting(settingKey, v as never)}
        />
      );
    }
    
    return null;
  };

  const orderedGroups: SettingGroup[] = ['images', 'visibility', 'typography', 'colors', 'layout', 'animation', 'sorting'];
  const availableGroups = orderedGroups.filter(g => groupedSettings[g]?.length > 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-80 bg-card border-l border-border h-full flex flex-col shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{elementConfig.label}</h3>
              <p className="text-xs text-muted-foreground capitalize">{elementConfig.category}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Settings */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {availableGroups.map((group, index) => (
              <Collapsible
                key={group}
                open={openGroups.includes(group)}
                onOpenChange={() => toggleGroup(group)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between px-3 py-2 h-auto",
                      openGroups.includes(group) && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {GROUP_ICONS[group]}
                      <span className="font-medium text-sm">{GROUP_LABELS[group]}</span>
                      <span className="text-xs text-muted-foreground">
                        ({groupedSettings[group].length})
                      </span>
                    </div>
                    {openGroups.includes(group) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 py-2 space-y-3">
                    {groupedSettings[group].map(renderSettingControl)}
                  </div>
                </CollapsibleContent>
                {index < availableGroups.length - 1 && <Separator className="my-1" />}
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
        
        {/* Footer with quick actions */}
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Trykk Esc for å lukke • Ctrl+Z for å angre
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
