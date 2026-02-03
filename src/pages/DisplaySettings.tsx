import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useCategories } from '@/hooks/useCategories';
import { DisplaySettings, getDefaultDisplaySettings, DisplayType, DISPLAY_TYPES } from '@/hooks/useDisplayOrders';
import { 
  Monitor, Smartphone, ExternalLink, Loader2, Users, Package, 
  Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell 
} from 'lucide-react';

export default function DisplaySettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, getCurrentBakeryId } = useAuthStore();
  const bakeryId = getCurrentBakeryId();
  
  const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType>('shared');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(getDefaultDisplaySettings());
  
  const { data: categories = [] } = useCategories();
  
  // Fetch bakery info for short_id
  const { data: bakery } = useQuery({
    queryKey: ['bakery-info', bakeryId],
    queryFn: async () => {
      if (!bakeryId) return null;
      const { data, error } = await supabase
        .from('bakeries')
        .select('id, name, short_id')
        .eq('id', bakeryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bakeryId,
  });
  
  // Fetch existing settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['display-settings-admin', bakeryId, selectedDisplayType, selectedCategoryId],
    queryFn: async () => {
      if (!bakeryId) return null;
      
      let query = supabase
        .from('display_settings')
        .select('*')
        .eq('bakery_id', bakeryId)
        .eq('display_type', selectedDisplayType);
      
      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      } else {
        query = query.is('category_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object') {
        const merged = { ...getDefaultDisplaySettings(), ...data.settings } as DisplaySettings;
        return { id: data.id, settings: merged };
      }
      
      return null;
    },
    enabled: !!bakeryId,
  });
  
  useEffect(() => {
    if (existingSettings?.settings) {
      setSettings(existingSettings.settings);
    } else {
      setSettings(getDefaultDisplaySettings());
    }
  }, [existingSettings]);
  
  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!bakeryId) throw new Error('No bakery');
      
      const settingsJson = JSON.parse(JSON.stringify(settings));
      
      if (existingSettings?.id) {
        const { error } = await supabase
          .from('display_settings')
          .update({ settings: settingsJson })
          .eq('id', existingSettings.id);
        if (error) throw error;
      } else {
        const insertData = {
          bakery_id: bakeryId,
          category_id: selectedCategoryId,
          display_type: selectedDisplayType,
          settings: settingsJson,
        };
        
        const { error } = await supabase
          .from('display_settings')
          .insert([insertData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['display-settings'] });
      queryClient.invalidateQueries({ queryKey: ['display-settings-admin'] });
      toast({
        title: 'Innstillinger lagret',
        description: `${DISPLAY_TYPES[selectedDisplayType].label}-innstillingene ble oppdatert`,
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke lagre innstillinger',
      });
    },
  });
  
  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const getPreviewUrl = () => {
    if (!bakery?.short_id) return null;
    const base = window.location.origin;
    
    if (selectedDisplayType === 'shared') {
      if (selectedCategoryId) {
        return `${base}/display/shared/${bakery.short_id}/${selectedCategoryId}`;
      }
      return `${base}/display/shared/${bakery.short_id}`;
    }
    
    return null;
  };

  const getDisplayTypeIcon = (type: DisplayType) => {
    switch (type) {
      case 'shared': return <Monitor className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      case 'packing': return <Package className="h-4 w-4" />;
    }
  };

  // Color input component
  const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Display-innstillinger</h1>
          <p className="text-muted-foreground">
            Konfigurer utseende og oppførsel for display-skjermer
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {getPreviewUrl() && (
            <Button variant="outline" asChild>
              <a href={getPreviewUrl()!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Åpne display
              </a>
            </Button>
          )}
          
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lagre innstillinger
          </Button>
        </div>
      </div>
      
      {/* Display type selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Velg skjermtype
          </CardTitle>
          <CardDescription>
            Hvert display-type har sine egne innstillinger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={selectedDisplayType} onValueChange={(v) => setSelectedDisplayType(v as DisplayType)}>
            <TabsList className="grid w-full grid-cols-3">
              {(Object.entries(DISPLAY_TYPES) as [DisplayType, typeof DISPLAY_TYPES[DisplayType]][]).map(([type, info]) => (
                <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                  {getDisplayTypeIcon(type)}
                  <span className="hidden sm:inline">{info.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {DISPLAY_TYPES[selectedDisplayType].description}
            </p>
          </div>
          
          {selectedDisplayType === 'shared' && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium">Kategori-spesifikke innstillinger</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Du kan tilpasse innstillinger per produktkategori
              </p>
              <Select 
                value={selectedCategoryId || 'all'} 
                onValueChange={(v) => setSelectedCategoryId(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kategorier (standard)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings accordion */}
          <div className="space-y-4">
            <Accordion type="multiple" defaultValue={['header', 'appearance']} className="space-y-2">
              {/* Topptekst */}
              <AccordionItem value="header" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Type className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Topptekst</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis bakerinavn</Label>
                      <p className="text-xs text-muted-foreground">Vis bakeriets navn i header</p>
                    </div>
                    <Switch
                      checked={settings.header_show_bakery_name}
                      onCheckedChange={(v) => updateSetting('header_show_bakery_name', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis kategorinavn</Label>
                      <p className="text-xs text-muted-foreground">Vis valgt kategori i header</p>
                    </div>
                    <Switch
                      checked={settings.header_show_category_name}
                      onCheckedChange={(v) => updateSetting('header_show_category_name', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis klokke</Label>
                      <p className="text-xs text-muted-foreground">Vis sanntidsklokke</p>
                    </div>
                    <Switch
                      checked={settings.header_show_clock}
                      onCheckedChange={(v) => updateSetting('header_show_clock', v)}
                    />
                  </div>
                  
                  {settings.header_show_clock && (
                    <div className="space-y-2">
                      <Label>Klokkeformat</Label>
                      <Select 
                        value={settings.header_clock_format} 
                        onValueChange={(v) => updateSetting('header_clock_format', v as '12h' | '24h')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24h">24-timer (14:30)</SelectItem>
                          <SelectItem value="12h">12-timer (2:30 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis dato</Label>
                      <p className="text-xs text-muted-foreground">Vis leveringsdato</p>
                    </div>
                    <Switch
                      checked={settings.header_show_date}
                      onCheckedChange={(v) => updateSetting('header_show_date', v)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fontstørrelse bakerinavn</Label>
                    <Select 
                      value={settings.header_bakery_font_size} 
                      onValueChange={(v) => updateSetting('header_bakery_font_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5rem">Liten</SelectItem>
                        <SelectItem value="1.875rem">Normal</SelectItem>
                        <SelectItem value="2.25rem">Stor</SelectItem>
                        <SelectItem value="3rem">Ekstra stor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Statistikk-kort */}
              <AccordionItem value="stats" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Statistikk-kort</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis total fremdrift</Label>
                      <p className="text-xs text-muted-foreground">Overordnet prosent ferdig</p>
                    </div>
                    <Switch
                      checked={settings.stats_show_total_progress}
                      onCheckedChange={(v) => updateSetting('stats_show_total_progress', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis antall pakket</Label>
                      <p className="text-xs text-muted-foreground">Antall ordrer som er pakket</p>
                    </div>
                    <Switch
                      checked={settings.stats_show_packed_count}
                      onCheckedChange={(v) => updateSetting('stats_show_packed_count', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis gjenstående</Label>
                      <p className="text-xs text-muted-foreground">Antall ordrer som gjenstår</p>
                    </div>
                    <Switch
                      checked={settings.stats_show_remaining_count}
                      onCheckedChange={(v) => updateSetting('stats_show_remaining_count', v)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fremdriftsbar stil</Label>
                    <Select 
                      value={settings.stats_progress_bar_style} 
                      onValueChange={(v) => updateSetting('stats_progress_bar_style', v as 'bar' | 'circle' | 'none')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Horisontal bar</SelectItem>
                        <SelectItem value="circle">Sirkel</SelectItem>
                        <SelectItem value="none">Ingen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fremdriftsbar høyde</Label>
                    <Select 
                      value={settings.stats_progress_bar_height} 
                      onValueChange={(v) => updateSetting('stats_progress_bar_height', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5rem">Tynn</SelectItem>
                        <SelectItem value="1rem">Normal</SelectItem>
                        <SelectItem value="1.5rem">Bred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Kundekort */}
              <AccordionItem value="cards" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Kundekort</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis kundenummer</Label>
                      <p className="text-xs text-muted-foreground">Vis kundenummer under navn</p>
                    </div>
                    <Switch
                      checked={settings.card_show_customer_number}
                      onCheckedChange={(v) => updateSetting('card_show_customer_number', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis produktliste</Label>
                      <p className="text-xs text-muted-foreground">Vis liste over produkter</p>
                    </div>
                    <Switch
                      checked={settings.card_show_product_list}
                      onCheckedChange={(v) => updateSetting('card_show_product_list', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis produktnumre</Label>
                      <p className="text-xs text-muted-foreground">Vis produktnummer ved navn</p>
                    </div>
                    <Switch
                      checked={settings.card_show_product_numbers}
                      onCheckedChange={(v) => updateSetting('card_show_product_numbers', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis antall som brett</Label>
                      <p className="text-xs text-muted-foreground">Konverter stykker til brett</p>
                    </div>
                    <Switch
                      checked={settings.card_show_quantity_as_trays}
                      onCheckedChange={(v) => updateSetting('card_show_quantity_as_trays', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis individuell fremdrift</Label>
                      <p className="text-xs text-muted-foreground">Fremdriftsbar per kunde</p>
                    </div>
                    <Switch
                      checked={settings.card_show_individual_progress}
                      onCheckedChange={(v) => updateSetting('card_show_individual_progress', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Kompakt modus</Label>
                      <p className="text-xs text-muted-foreground">Mindre plass per kort</p>
                    </div>
                    <Switch
                      checked={settings.card_compact_mode}
                      onCheckedChange={(v) => updateSetting('card_compact_mode', v)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Utseende */}
              <AccordionItem value="appearance" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Utseende</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput 
                      label="Bakgrunnsfarge" 
                      value={settings.background_color}
                      onChange={(v) => updateSetting('background_color', v)}
                    />
                    <ColorInput 
                      label="Kortbakgrunn" 
                      value={settings.card_background_color}
                      onChange={(v) => updateSetting('card_background_color', v)}
                    />
                    <ColorInput 
                      label="Tekstfarge" 
                      value={settings.text_color}
                      onChange={(v) => updateSetting('text_color', v)}
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Statusfarger</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <ColorInput 
                        label="Venter" 
                        value={settings.pending_color}
                        onChange={(v) => updateSetting('pending_color', v)}
                      />
                      <ColorInput 
                        label="Pakker" 
                        value={settings.packing_color}
                        onChange={(v) => updateSetting('packing_color', v)}
                      />
                      <ColorInput 
                        label="Ferdig" 
                        value={settings.completed_color}
                        onChange={(v) => updateSetting('completed_color', v)}
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Hjørneafrunding</Label>
                      <Select 
                        value={settings.border_radius} 
                        onValueChange={(v) => updateSetting('border_radius', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Ingen</SelectItem>
                          <SelectItem value="0.375rem">Liten</SelectItem>
                          <SelectItem value="0.75rem">Normal</SelectItem>
                          <SelectItem value="1rem">Stor</SelectItem>
                          <SelectItem value="1.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Kantlinje bredde</Label>
                      <Select 
                        value={settings.card_border_width} 
                        onValueChange={(v) => updateSetting('card_border_width', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2px">Tynn</SelectItem>
                          <SelectItem value="4px">Normal</SelectItem>
                          <SelectItem value="6px">Bred</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Layout & Scroll */}
              <AccordionItem value="layout" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Layout className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Layout & Scroll</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {selectedDisplayType === 'shared' && (
                    <div className="space-y-2">
                      <Label>Antall kolonner: {settings.columns}</Label>
                      <Slider
                        value={[settings.columns]}
                        onValueChange={([v]) => updateSetting('columns', v)}
                        min={1}
                        max={6}
                        step={1}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Kundenavn fontstørrelse</Label>
                    <Select 
                      value={settings.customer_name_font_size} 
                      onValueChange={(v) => updateSetting('customer_name_font_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5rem">Liten</SelectItem>
                        <SelectItem value="2rem">Normal</SelectItem>
                        <SelectItem value="2.5rem">Stor</SelectItem>
                        <SelectItem value="3rem">Ekstra stor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Produktnavn fontstørrelse</Label>
                    <Select 
                      value={settings.product_font_size} 
                      onValueChange={(v) => updateSetting('product_font_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.875rem">Liten</SelectItem>
                        <SelectItem value="1rem">Normal</SelectItem>
                        <SelectItem value="1.25rem">Stor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mellomrom mellom kort</Label>
                    <Select 
                      value={settings.gap_size} 
                      onValueChange={(v) => updateSetting('gap_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5rem">Liten</SelectItem>
                        <SelectItem value="1rem">Normal</SelectItem>
                        <SelectItem value="1.5rem">Stor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-scroll</Label>
                        <p className="text-xs text-muted-foreground">Rull automatisk gjennom innhold</p>
                      </div>
                      <Switch
                        checked={settings.auto_scroll_enabled}
                        onCheckedChange={(v) => updateSetting('auto_scroll_enabled', v)}
                      />
                    </div>
                    
                    {settings.auto_scroll_enabled && (
                      <>
                        <div className="space-y-2 mt-4">
                          <Label>Scroll-hastighet</Label>
                          <Select 
                            value={settings.auto_scroll_speed} 
                            onValueChange={(v) => updateSetting('auto_scroll_speed', v as 'slow' | 'medium' | 'fast')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slow">Langsom</SelectItem>
                              <SelectItem value="medium">Normal</SelectItem>
                              <SelectItem value="fast">Rask</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div>
                            <Label>Pause ved hover</Label>
                            <p className="text-xs text-muted-foreground">Stopp scroll når mus er over</p>
                          </div>
                          <Switch
                            checked={settings.auto_scroll_pause_on_hover}
                            onCheckedChange={(v) => updateSetting('auto_scroll_pause_on_hover', v)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Animasjoner */}
              <AccordionItem value="animations" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Animasjoner</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Aktiver animasjoner</Label>
                      <p className="text-xs text-muted-foreground">Generelle overganger og effekter</p>
                    </div>
                    <Switch
                      checked={settings.animation_enabled}
                      onCheckedChange={(v) => updateSetting('animation_enabled', v)}
                    />
                  </div>
                  
                  {settings.animation_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Animasjonshastighet</Label>
                        <Select 
                          value={settings.animation_speed} 
                          onValueChange={(v) => updateSetting('animation_speed', v as 'fast' | 'normal' | 'slow')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fast">Rask</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="slow">Langsom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Animasjon ved statusendring</Label>
                          <p className="text-xs text-muted-foreground">Animer når status endres</p>
                        </div>
                        <Switch
                          checked={settings.animation_on_status_change}
                          onCheckedChange={(v) => updateSetting('animation_on_status_change', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Marker nylig oppdatert</Label>
                          <p className="text-xs text-muted-foreground">Fremhev kort som nettopp ble oppdatert</p>
                        </div>
                        <Switch
                          checked={settings.animation_highlight_new}
                          onCheckedChange={(v) => updateSetting('animation_highlight_new', v)}
                        />
                      </div>
                      
                      {settings.animation_highlight_new && (
                        <div className="space-y-2">
                          <Label>Fremhevingsvarighet: {settings.animation_highlight_duration / 1000}s</Label>
                          <Slider
                            value={[settings.animation_highlight_duration]}
                            onValueChange={([v]) => updateSetting('animation_highlight_duration', v)}
                            min={1000}
                            max={10000}
                            step={1000}
                          />
                        </div>
                      )}
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
              
              {/* Sanntid & Status */}
              <AccordionItem value="realtime" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Sanntid & Status</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis tilkoblingsstatus</Label>
                      <p className="text-xs text-muted-foreground">Indikator for sanntidstilkobling</p>
                    </div>
                    <Switch
                      checked={settings.realtime_show_connection_status}
                      onCheckedChange={(v) => updateSetting('realtime_show_connection_status', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Vis siste oppdatering</Label>
                      <p className="text-xs text-muted-foreground">Tidspunkt for siste datahenting</p>
                    </div>
                    <Switch
                      checked={settings.realtime_show_last_update}
                      onCheckedChange={(v) => updateSetting('realtime_show_last_update', v)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Auto-oppdatering: hvert {settings.realtime_auto_refresh_interval}s</Label>
                    <Slider
                      value={[settings.realtime_auto_refresh_interval]}
                      onValueChange={([v]) => updateSetting('realtime_auto_refresh_interval', v)}
                      min={15}
                      max={300}
                      step={15}
                    />
                    <p className="text-xs text-muted-foreground">Fallback hvis sanntid feiler</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Lyd ved ferdig pakket</Label>
                      <p className="text-xs text-muted-foreground">Spill lyd når kunde er ferdig</p>
                    </div>
                    <Switch
                      checked={settings.realtime_sound_on_complete}
                      onCheckedChange={(v) => updateSetting('realtime_sound_on_complete', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Flash ved oppdatering</Label>
                      <p className="text-xs text-muted-foreground">Kort visuell markering ved endring</p>
                    </div>
                    <Switch
                      checked={settings.realtime_flash_on_update}
                      onCheckedChange={(v) => updateSetting('realtime_flash_on_update', v)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Live preview */}
          <Card className="h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Forhåndsvisning - {DISPLAY_TYPES[selectedDisplayType].label}
              </CardTitle>
              <CardDescription>
                Slik vil displayet se ut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-lg overflow-hidden min-h-[450px]"
                style={{
                  backgroundColor: settings.background_color,
                  color: settings.text_color,
                  padding: settings.padding,
                }}
              >
                {/* Preview header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {settings.header_show_bakery_name && (
                      <h3 className="font-bold" style={{ fontSize: settings.header_bakery_font_size }}>
                        {selectedDisplayType === 'customer' ? 'Meny Heimdal' : bakery?.name || 'Bakeri'}
                      </h3>
                    )}
                    {settings.header_show_category_name && selectedDisplayType === 'shared' && (
                      <p className="text-sm opacity-70">Alle produkter</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {settings.realtime_show_connection_status && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      </span>
                    )}
                    {settings.header_show_clock && (
                      <span className="font-mono">
                        {settings.header_clock_format === '24h' ? '14:32:45' : '2:32 PM'}
                      </span>
                    )}
                    {settings.header_show_date && (
                      <span>Tirsdag 3. feb</span>
                    )}
                  </div>
                </div>
                
                {/* Stats preview */}
                {settings.stats_show_total_progress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Total fremdrift</span>
                      <span className="font-bold">
                        {settings.stats_show_packed_count && '8 / 15 '}
                        (53%)
                      </span>
                    </div>
                    {settings.stats_progress_bar_style !== 'none' && (
                      <div
                        className="rounded"
                        style={{ 
                          backgroundColor: `${settings.pending_color}40`,
                          height: settings.stats_progress_bar_height,
                        }}
                      >
                        <div
                          className="h-full rounded"
                          style={{ 
                            width: '53%',
                            backgroundColor: settings.packing_color,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Cards preview */}
                {selectedDisplayType === 'shared' && (
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(settings.columns, 3)}, 1fr)`,
                      gap: settings.gap_size,
                    }}
                  >
                    {['Meny Heimdal', 'Kiwi Foyn', 'Spar'].map((name, i) => (
                      <div
                        key={name}
                        className="p-3"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderRadius: settings.border_radius,
                          borderLeft: `${settings.card_border_width} solid ${
                            i === 0 ? settings.completed_color : 
                            i === 1 ? settings.packing_color : 
                            settings.pending_color
                          }`,
                        }}
                      >
                        <h4 
                          className="font-bold truncate"
                          style={{ fontSize: `calc(${settings.customer_name_font_size} * 0.5)` }}
                        >
                          {name}
                        </h4>
                        {settings.card_show_customer_number && (
                          <p className="text-xs opacity-50">#{1000 + i}</p>
                        )}
                        {settings.card_show_individual_progress && (
                          <>
                            <div
                              className="h-1 rounded mt-2"
                              style={{ backgroundColor: `${settings.pending_color}40` }}
                            >
                              <div
                                className="h-full rounded"
                                style={{
                                  width: i === 0 ? '100%' : i === 1 ? '60%' : '0%',
                                  backgroundColor: i === 0 ? settings.completed_color : settings.packing_color,
                                }}
                              />
                            </div>
                            <p className="text-xs mt-1 opacity-70">
                              {i === 0 ? '5/5' : i === 1 ? '3/5' : '0/5'}
                            </p>
                          </>
                        )}
                        {settings.card_show_product_list && !settings.card_compact_mode && (
                          <div className="mt-2 space-y-1">
                            {['Grovbrød', 'Rundstykker'].slice(0, i === 2 ? 2 : 1).map((p, j) => (
                              <div 
                                key={p} 
                                className="flex justify-between"
                                style={{ 
                                  fontSize: `calc(${settings.product_font_size} * 0.85)`,
                                  opacity: i === 0 || (i === 1 && j === 0) ? 0.5 : 1,
                                  textDecoration: i === 0 || (i === 1 && j === 0) ? 'line-through' : 'none',
                                }}
                              >
                                <span className="truncate">{p}</span>
                                <span className="font-mono ml-1">5</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedDisplayType === 'customer' && (
                  <div className="space-y-2">
                    {['Grovbrød', 'Rundstykker', 'Croissant'].map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 p-3"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderRadius: settings.border_radius,
                          borderLeft: `${settings.card_border_width} solid ${i === 0 ? settings.completed_color : settings.pending_color}`,
                          opacity: i === 0 ? 0.6 : 1,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{
                            backgroundColor: i === 0 
                              ? `${settings.completed_color}33` 
                              : `${settings.pending_color}33`
                          }}
                        >
                          {i === 0 ? '✓' : '○'}
                        </div>
                        <div className="flex-1">
                          <span 
                            className="font-bold"
                            style={{ 
                              fontSize: settings.product_font_size,
                              textDecoration: i === 0 ? 'line-through' : 'none'
                            }}
                          >
                            {name}
                          </span>
                          {settings.card_show_product_numbers && (
                            <span className="text-xs opacity-50 ml-2">PRD-00{i+1}</span>
                          )}
                        </div>
                        <span className="font-mono font-bold">
                          {settings.card_show_quantity_as_trays 
                            ? (i === 1 ? '2 pl' : `${(i+1)*5} stk`)
                            : `${(i+1)*5} stk`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedDisplayType === 'packing' && (
                  <div className="space-y-2">
                    {['Grovbrød', 'Rundstykker', 'Croissant', 'Baguette'].map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderRadius: settings.border_radius,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-xs"
                            style={{
                              backgroundColor: i < 2 
                                ? `${settings.completed_color}33` 
                                : `${settings.pending_color}33`
                            }}
                          >
                            {i < 2 ? '✓' : ''}
                          </div>
                          <span 
                            style={{ 
                              fontSize: settings.product_font_size,
                              textDecoration: i < 2 ? 'line-through' : 'none',
                              opacity: i < 2 ? 0.6 : 1
                            }}
                          >
                            {name}
                          </span>
                        </div>
                        <span className="font-mono text-sm">{(i+1)*5} stk</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
