import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { EDITABLE_ELEMENTS, EditableElementConfig } from './types';
import { ColorPicker } from './ColorPicker';
import { SizeSlider, FONT_SIZE_PRESETS } from './SizeSlider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ElementInspectorProps {
  selectedElement: string | null;
  settings: DisplaySettings;
  onUpdateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
  onClose: () => void;
}

export function ElementInspector({
  selectedElement,
  settings,
  onUpdateSetting,
  onClose,
}: ElementInspectorProps) {
  const elementConfig = EDITABLE_ELEMENTS.find(e => e.id === selectedElement);
  
  if (!selectedElement || !elementConfig) {
    return null;
  }

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
      };
      
      return (
        <div key={settingKey} className="flex items-center justify-between py-2">
          <Label className="text-sm">{labelMap[settingKey] || settingKey}</Label>
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
        header_bakery_font_size: 'Skriftstørrelse',
        header_category_font_size: 'Skriftstørrelse',
        header_clock_font_size: 'Skriftstørrelse',
        header_date_font_size: 'Skriftstørrelse',
        stats_value_font_size: 'Verdi-størrelse',
        stats_label_font_size: 'Etikett-størrelse',
        card_customer_name_font_size: 'Kundenavn-størrelse',
        card_product_font_size: 'Produkt-størrelse',
        card_progress_font_size: 'Progress-størrelse',
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
    
    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-80 bg-card border-l border-border h-full flex flex-col shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{elementConfig.label}</h3>
            <p className="text-xs text-muted-foreground capitalize">{elementConfig.category}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Settings */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {elementConfig.settingKeys.map(renderSettingControl)}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
