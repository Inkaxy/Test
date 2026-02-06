import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
  Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell, Copy, RotateCcw, Table2, Check
} from 'lucide-react';
import { TablePreview } from '@/components/display-editor/TablePreview';
import { ThemePresetMenu, ThemePreset } from '@/components/display-editor/ThemePresetMenu';
import { ProductCardSettingsPanel } from '@/components/display-editor/ProductCardSettingsPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export default function DisplaySettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, getActiveBakeryId } = useAuthStore();
  const bakeryId = getActiveBakeryId();
  
  // Read URL parameters for deep linking from category cards
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('category');
  const urlDisplayType = searchParams.get('type') as DisplayType | null;
  
  const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType>(
    urlDisplayType && Object.keys(DISPLAY_TYPES).includes(urlDisplayType) 
      ? urlDisplayType 
      : 'shared'
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    urlCategoryId || null
  );
  const [settings, setSettings] = useState<DisplaySettings>(getDefaultDisplaySettings());
  
  const { data: categories = [] } = useCategories();
  
  // Filtrer kategorier basert på display type
  const filteredCategories = categories.filter(cat => {
    if (selectedDisplayType === 'packing') {
      // Pakkedisplay = kun kundebaserte kategorier
      return cat.packing_mode === 'customer_based';
    }
    if (selectedDisplayType === 'customer') {
      // Kundedisplay = kun produktbaserte kategorier
      return cat.packing_mode === 'product_based';
    }
    // Felles display = alle kategorier
    return true;
  });

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
  
  // Nullstill valgt kategori når display type endres (hvis kategorien ikke finnes i ny liste)
  useEffect(() => {
    if (selectedCategoryId) {
      const categoryExists = filteredCategories.some(c => c.id === selectedCategoryId);
      if (!categoryExists) {
        setSelectedCategoryId(null);
      }
    }
  }, [selectedDisplayType, filteredCategories, selectedCategoryId]);
  
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
      // Invalidate all display settings queries to ensure all displays update
      queryClient.invalidateQueries({ queryKey: ['display-settings'] });
      queryClient.invalidateQueries({ queryKey: ['display-settings-admin'] });
      // Force refetch for any open display pages
      queryClient.refetchQueries({ queryKey: ['display-settings'] });
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

  // Copy settings from another display type
  const copyFromDisplayType = async (sourceType: DisplayType) => {
    if (!bakeryId || sourceType === selectedDisplayType) return;
    
    try {
      const { data, error } = await supabase
        .from('display_settings')
        .select('settings')
        .eq('bakery_id', bakeryId)
        .eq('display_type', sourceType)
        .is('category_id', null)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object') {
        const sourceSettings = { ...getDefaultDisplaySettings(), ...data.settings } as DisplaySettings;
        setSettings(sourceSettings);
        toast({
          title: 'Innstillinger kopiert',
          description: `Kopierte innstillinger fra ${DISPLAY_TYPES[sourceType].label}. Husk å lagre!`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Ingen innstillinger funnet',
          description: `${DISPLAY_TYPES[sourceType].label} har ingen lagrede innstillinger`,
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke kopiere innstillinger',
      });
    }
  };

  // Reset to default settings
  const resetToDefaults = () => {
    setSettings(getDefaultDisplaySettings());
    toast({
      title: 'Tilbakestilt',
      description: 'Innstillinger er tilbakestilt til standard. Husk å lagre!',
    });
  };
  
  const getPreviewUrl = () => {
    const base = window.location.origin;
    
    if (selectedDisplayType === 'shared') {
      if (!bakery?.short_id) return null;
      if (selectedCategoryId) {
        return `${base}/display/shared/${bakery.short_id}/${selectedCategoryId}`;
      }
      return `${base}/display/shared/${bakery.short_id}`;
    }
    
    if (selectedDisplayType === 'packing') {
      const params = new URLSearchParams();
      if (selectedCategoryId) {
        params.set('category', selectedCategoryId);
      }
      const queryString = params.toString();
      return `${base}/display/packing${queryString ? `?${queryString}` : ''}`;
    }
    
    return null;
  };
  
  const getKioskPackingUrl = (mode: 'customer' | 'product' = 'customer') => {
    const base = window.location.origin;
    if (!bakery?.short_id) return null;
    
    if (mode === 'product') {
      if (selectedCategoryId) {
        return `${base}/kiosk/packing/${bakery.short_id}/product/${selectedCategoryId}`;
      }
      return `${base}/kiosk/packing/${bakery.short_id}/product`;
    }
    
    // Customer-based (default)
    if (selectedCategoryId) {
      return `${base}/kiosk/packing/${bakery.short_id}/${selectedCategoryId}`;
    }
    return `${base}/kiosk/packing/${bakery.short_id}`;
  };
  
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: t('display.urlCopied'),
    });
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
          {/* Copy/Reset dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Kopier / Tilbakestill
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Kopier innstillinger fra</DropdownMenuLabel>
              {(Object.entries(DISPLAY_TYPES) as [DisplayType, typeof DISPLAY_TYPES[DisplayType]][])
                .filter(([type]) => type !== selectedDisplayType)
                .map(([type, info]) => (
                  <DropdownMenuItem 
                    key={type} 
                    onClick={() => copyFromDisplayType(type)}
                    className="flex items-center gap-2"
                  >
                    {getDisplayTypeIcon(type)}
                    {info.label}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={resetToDefaults}
                className="flex items-center gap-2 text-destructive"
              >
                <RotateCcw className="h-4 w-4" />
                Tilbakestill til standard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
          
          {filteredCategories.length > 0 && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium">Kategori-spesifikke innstillinger</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {selectedDisplayType === 'packing'
                  ? 'Tilpass visning per kundebasert kategori'
                  : selectedDisplayType === 'customer'
                  ? 'Tilpass visning per produktbasert kategori'
                  : 'Tilpass visning per kategori'}
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
                  {filteredCategories.map((cat) => (
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
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Fontstørrelser</h4>
                    
                    <div className="space-y-2">
                      <Label>Bakerinavn</Label>
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
                    
                    <div className="space-y-2">
                      <Label>Kategorinavn</Label>
                      <Select 
                        value={settings.header_category_font_size} 
                        onValueChange={(v) => updateSetting('header_category_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1rem">Liten</SelectItem>
                          <SelectItem value="1.25rem">Normal</SelectItem>
                          <SelectItem value="1.5rem">Stor</SelectItem>
                          <SelectItem value="2rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Klokke</Label>
                      <Select 
                        value={settings.header_clock_font_size} 
                        onValueChange={(v) => updateSetting('header_clock_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1rem">Liten</SelectItem>
                          <SelectItem value="1.5rem">Normal</SelectItem>
                          <SelectItem value="2rem">Stor</SelectItem>
                          <SelectItem value="2.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Dato</Label>
                      <Select 
                        value={settings.header_date_font_size} 
                        onValueChange={(v) => updateSetting('header_date_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1rem">Liten</SelectItem>
                          <SelectItem value="1.25rem">Normal</SelectItem>
                          <SelectItem value="1.5rem">Stor</SelectItem>
                          <SelectItem value="2rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Fontstørrelser</h4>
                    
                    <div className="space-y-2">
                      <Label>Tekstetikett</Label>
                      <Select 
                        value={settings.stats_label_font_size} 
                        onValueChange={(v) => updateSetting('stats_label_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.875rem">Liten</SelectItem>
                          <SelectItem value="1rem">Normal</SelectItem>
                          <SelectItem value="1.25rem">Stor</SelectItem>
                          <SelectItem value="1.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Verdier</Label>
                      <Select 
                        value={settings.stats_value_font_size} 
                        onValueChange={(v) => updateSetting('stats_value_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.25rem">Liten</SelectItem>
                          <SelectItem value="1.5rem">Normal</SelectItem>
                          <SelectItem value="2rem">Stor</SelectItem>
                          <SelectItem value="2.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Fontstørrelser</h4>
                    
                    <div className="space-y-2">
                      <Label>Kundenavn</Label>
                      <Select 
                        value={settings.card_customer_name_font_size} 
                        onValueChange={(v) => updateSetting('card_customer_name_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1.25rem">Liten</SelectItem>
                          <SelectItem value="1.5rem">Normal</SelectItem>
                          <SelectItem value="2rem">Stor</SelectItem>
                          <SelectItem value="2.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Produktnavn</Label>
                      <Select 
                        value={settings.card_product_font_size} 
                        onValueChange={(v) => updateSetting('card_product_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.875rem">Liten</SelectItem>
                          <SelectItem value="1rem">Normal</SelectItem>
                          <SelectItem value="1.25rem">Stor</SelectItem>
                          <SelectItem value="1.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Antall/mengde</Label>
                      <Select 
                        value={settings.card_quantity_font_size} 
                        onValueChange={(v) => updateSetting('card_quantity_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.875rem">Liten</SelectItem>
                          <SelectItem value="1rem">Normal</SelectItem>
                          <SelectItem value="1.25rem">Stor</SelectItem>
                          <SelectItem value="1.5rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Fremdriftstekst</Label>
                      <Select 
                        value={settings.card_progress_font_size} 
                        onValueChange={(v) => updateSetting('card_progress_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75rem">Liten</SelectItem>
                          <SelectItem value="0.875rem">Normal</SelectItem>
                          <SelectItem value="1rem">Stor</SelectItem>
                          <SelectItem value="1.25rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  {/* Theme presets - using shared component */}
                  <ThemePresetMenu
                    currentTheme={settings.theme_preset || 'dark'}
                    currentSettings={{
                      background_color: settings.background_color,
                      card_background_color: settings.card_background_color,
                      text_color: settings.text_color,
                      pending_color: settings.pending_color,
                      packing_color: settings.packing_color,
                      completed_color: settings.completed_color,
                    }}
                    onSelectTheme={(theme: ThemePreset) => {
                      if (theme.id !== 'custom') {
                        updateSetting('background_color', theme.background_color);
                        updateSetting('card_background_color', theme.card_background_color);
                        updateSetting('text_color', theme.text_color);
                        updateSetting('pending_color', theme.pending_color);
                        updateSetting('packing_color', theme.packing_color);
                        updateSetting('completed_color', theme.completed_color);
                        updateSetting('theme_preset', theme.id as any);
                      } else {
                        updateSetting('theme_preset', 'custom');
                      }
                    }}
                  />
                  
                  {settings.theme_preset === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
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
                  )}
                  
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
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Auto-scroll</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Aktiver auto-scroll</Label>
                        <p className="text-xs text-muted-foreground">Rull automatisk gjennom innhold</p>
                      </div>
                      <Switch
                        checked={settings.auto_scroll_enabled}
                        onCheckedChange={(v) => updateSetting('auto_scroll_enabled', v)}
                      />
                    </div>
                    
                    {settings.auto_scroll_enabled && (
                      <>
                        <div className="space-y-2">
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
                        
                        <div className="flex items-center justify-between">
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
                  
                  {/* Sortering */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Sortering av kunder</h4>
                    
                    <div className="space-y-2">
                      <Label>Sorter etter</Label>
                      <Select 
                        value={settings.customer_sort_mode || 'name'} 
                        onValueChange={(v) => updateSetting('customer_sort_mode', v as 'name' | 'progress' | 'customer_number')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Kundenavn</SelectItem>
                          <SelectItem value="progress">Fremdrift (%)</SelectItem>
                          <SelectItem value="customer_number">Kundenummer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Sorteringsrekkefølge</Label>
                      <Select 
                        value={settings.customer_sort_direction || 'asc'} 
                        onValueChange={(v) => updateSetting('customer_sort_direction', v as 'asc' | 'desc')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Stigende (A-Å, 0-100)</SelectItem>
                          <SelectItem value="desc">Synkende (Å-A, 100-0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ferdige kunder nederst</Label>
                        <p className="text-xs text-muted-foreground">Flytt kunder med 100% til bunnen</p>
                      </div>
                      <Switch
                        checked={settings.customer_sort_completed_last ?? true}
                        onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)}
                      />
                    </div>
                  </div>
                  
                  {/* Fullskjerm & Wake Lock */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Skjermkontroll</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Vis fullskjerm-knapp</Label>
                        <p className="text-xs text-muted-foreground">Tillat fullskjermmodus på displayet</p>
                      </div>
                      <Switch
                        checked={settings.fullscreen_button_visible ?? true}
                        onCheckedChange={(v) => updateSetting('fullscreen_button_visible', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Hold skjermen våken</Label>
                        <p className="text-xs text-muted-foreground">Forhindrer at skjermen slår seg av</p>
                      </div>
                      <Switch
                        checked={settings.wake_lock_enabled ?? true}
                        onCheckedChange={(v) => updateSetting('wake_lock_enabled', v)}
                      />
                    </div>
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
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-medium">Fontstørrelser</h4>
                    
                    <div className="space-y-2">
                      <Label>Statustekst</Label>
                      <Select 
                        value={settings.realtime_status_font_size} 
                        onValueChange={(v) => updateSetting('realtime_status_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.75rem">Liten</SelectItem>
                          <SelectItem value="0.875rem">Normal</SelectItem>
                          <SelectItem value="1rem">Stor</SelectItem>
                          <SelectItem value="1.25rem">Ekstra stor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Produktbasert pakking */}
              <AccordionItem value="product-packing" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Produktbasert pakking</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Innstillinger som gjelder både kundedisplay og felles display når produkter er valgt for pakking.
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Aktiver produktlinjefarger</Label>
                      <p className="text-xs text-muted-foreground">Hver produktlinje får unik farge</p>
                    </div>
                    <Switch
                      checked={settings.product_line_colors_enabled}
                      onCheckedChange={(v) => updateSetting('product_line_colors_enabled', v)}
                    />
                  </div>
                  
                  {settings.product_line_colors_enabled && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-sm font-medium">Produktlinjefarger</h4>
                      <p className="text-xs text-muted-foreground">
                        Fargene brukes i rekkefølge for hver produktlinje. Samme produkt får alltid samme farge.
                      </p>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {(settings.product_line_colors_palette || []).map((color, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex gap-1">
                              <Input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                  const newPalette = [...(settings.product_line_colors_palette || [])];
                                  newPalette[index] = e.target.value;
                                  updateSetting('product_line_colors_palette', newPalette);
                                }}
                                className="w-full h-10 p-1 cursor-pointer"
                              />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">{index + 1}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPalette = [...(settings.product_line_colors_palette || []), '#E5E7EB'];
                            updateSetting('product_line_colors_palette', newPalette);
                          }}
                        >
                          + Legg til farge
                        </Button>
                        {(settings.product_line_colors_palette || []).length > 3 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPalette = (settings.product_line_colors_palette || []).slice(0, -1);
                              updateSetting('product_line_colors_palette', newPalette);
                            }}
                          >
                            Fjern siste
                          </Button>
                        )}
                      </div>
                      
                      {/* Preview of colors */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Forhåndsvisning</h4>
                        <div className="space-y-2">
                          {['Horten', 'Loff', 'Formloff'].map((name, index) => (
                            <div
                              key={name}
                              className="p-3 rounded-lg border flex items-center justify-between"
                              style={{
                                backgroundColor: (settings.product_line_colors_palette || [])[index % (settings.product_line_colors_palette || []).length] || '#E5E7EB',
                              }}
                            >
                              <span className="font-medium text-foreground">{name}</span>
                              <span className="text-xl font-bold text-foreground">{10 - index * 3} stk</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              
              {/* Visningsmodus (kun for Pakkedisplay) */}
              {selectedDisplayType === 'packing' && (
                <AccordionItem value="view-mode" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Visningsmodus</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Velg hvordan kundeoversikten vises i pakkevisningen.
                    </p>
                    
                    {/* View mode selector */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateSetting('packing_view_mode', 'cards')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          (settings.packing_view_mode || 'cards') === 'cards'
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <LayoutGrid className="h-5 w-5" />
                          <span className="font-medium">Kort-visning</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Grid med kundekort. Visuelt rikt, med fremdrift og status.
                        </p>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => updateSetting('packing_view_mode', 'table')}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          settings.packing_view_mode === 'table'
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5" />
                          <span className="font-medium">Tabell-visning</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Kompakt liste. Rask oversikt over mange kunder.
                        </p>
                      </button>
                    </div>
                    
                    {/* Language selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Språk</label>
                      <p className="text-xs text-muted-foreground mb-3">Velg hvilket språk som skal brukes på pakkedisplayet</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => updateSetting('packing_language', 'nb')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                            (settings.packing_language || 'nb') === 'nb'
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="font-medium">Norsk</div>
                          <div className="text-xs text-muted-foreground">Norwegian</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSetting('packing_language', 'en')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                            settings.packing_language === 'en'
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="font-medium">English</div>
                          <div className="text-xs text-muted-foreground">Engelsk</div>
                        </button>
                      </div>
                    </div>
                    
                    {/* Theme presets for Packing Display */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4" />
                        Tema
                      </h4>
                      <ThemePresetMenu
                        currentTheme={settings.theme_preset || 'dark'}
                        currentSettings={{
                          background_color: settings.background_color,
                          card_background_color: settings.card_background_color,
                          text_color: settings.text_color,
                          pending_color: settings.pending_color,
                          packing_color: settings.packing_color,
                          completed_color: settings.completed_color,
                        }}
                        onSelectTheme={(theme: ThemePreset) => {
                          if (theme.id !== 'custom') {
                            updateSetting('background_color', theme.background_color);
                            updateSetting('card_background_color', theme.card_background_color);
                            updateSetting('text_color', theme.text_color);
                            updateSetting('pending_color', theme.pending_color);
                            updateSetting('packing_color', theme.packing_color);
                            updateSetting('completed_color', theme.completed_color);
                            updateSetting('theme_preset', theme.id as any);
                          } else {
                            updateSetting('theme_preset', 'custom');
                          }
                        }}
                      />
                      
                      {settings.theme_preset === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
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
                      )}
                    </div>
                    
                    {/* Table-specific settings */}
                    {settings.packing_view_mode === 'table' && (
                      <div className="border-t pt-4 space-y-6">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4" />
                          Tabell-innstillinger
                        </h4>
                        
                        {/* Layout & Størrelse */}
                        <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout & Størrelse</h5>
                          
                          <div className="space-y-2">
                            <Label>Radhøyde</Label>
                            <Select 
                              value={settings.table_row_height || 'touch'} 
                              onValueChange={(v) => updateSetting('table_row_height', v as 'compact' | 'normal' | 'touch')}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="compact">Kompakt - Mindre plass</SelectItem>
                                <SelectItem value="normal">Normal - Balansert</SelectItem>
                                <SelectItem value="touch">Touch-vennlig (anbefalt)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Fontstørrelse</Label>
                            <Select 
                              value={settings.table_font_size || '1.25rem'} 
                              onValueChange={(v) => updateSetting('table_font_size', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1rem">Liten</SelectItem>
                                <SelectItem value="1.25rem">Normal</SelectItem>
                                <SelectItem value="1.5rem">Stor</SelectItem>
                                <SelectItem value="1.75rem">Ekstra stor</SelectItem>
                                <SelectItem value="2rem">Veldig stor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Mellomrom mellom rader</Label>
                            <Select 
                              value={settings.table_touch_row_spacing || '0.75rem'} 
                              onValueChange={(v) => updateSetting('table_touch_row_spacing', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.5rem">Liten</SelectItem>
                                <SelectItem value="0.75rem">Normal</SelectItem>
                                <SelectItem value="1rem">Stor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Kundenavn tykkelse</Label>
                            <Select 
                              value={settings.table_customer_name_font_weight || 'bold'} 
                              onValueChange={(v) => updateSetting('table_customer_name_font_weight', v as 'normal' | 'medium' | 'semibold' | 'bold')}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="semibold">Halvfet</SelectItem>
                                <SelectItem value="bold">Fet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Kantlinje-stil</Label>
                            <Select 
                              value={settings.table_border_style || 'subtle'} 
                              onValueChange={(v) => updateSetting('table_border_style', v as 'none' | 'subtle' | 'full')}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Ingen</SelectItem>
                                <SelectItem value="subtle">Subtil</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Vis i tabellen */}
                        <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vis i tabellen</h5>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Kundenummer</Label>
                              <p className="text-xs text-muted-foreground">Vis kundenummer under navn</p>
                            </div>
                            <Switch
                              checked={settings.table_show_customer_number ?? true}
                              onCheckedChange={(v) => updateSetting('table_show_customer_number', v)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Antall ordrer</Label>
                              <p className="text-xs text-muted-foreground">Vis pakket/totalt antall ordrer</p>
                            </div>
                            <Switch
                              checked={settings.table_show_order_count ?? true}
                              onCheckedChange={(v) => updateSetting('table_show_order_count', v)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Fremdriftsbar</Label>
                              <p className="text-xs text-muted-foreground">Visuell fremdriftsindikator</p>
                            </div>
                            <Switch
                              checked={settings.table_show_progress_bar ?? true}
                              onCheckedChange={(v) => updateSetting('table_show_progress_bar', v)}
                            />
                          </div>
                          
                          {settings.table_show_progress_bar && (
                            <div className="space-y-2 pl-4 border-l-2 border-muted">
                              <Label>Fremdriftsbar høyde</Label>
                              <Select 
                                value={settings.table_progress_bar_height || '0.75rem'} 
                                onValueChange={(v) => updateSetting('table_progress_bar_height', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.5rem">Tynn</SelectItem>
                                  <SelectItem value="0.75rem">Normal</SelectItem>
                                  <SelectItem value="1rem">Tykk</SelectItem>
                                  <SelectItem value="1.25rem">Ekstra tykk</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* Antall-spesifikke innstillinger */}
                          {settings.table_show_order_count && (
                            <div className="border-t pt-4 space-y-4 p-4 rounded-lg bg-blue-500/10">
                              <h5 className="text-xs font-semibold uppercase tracking-wide text-blue-600 flex items-center gap-2">
                                <span className="text-lg">📊</span>
                                Antall-visning (Viktigste info!)
                              </h5>
                              
                              <div className="space-y-2">
                                <Label>Størrelse</Label>
                                <Select 
                                  value={settings.table_quantity_display_size || 'large'} 
                                  onValueChange={(v) => updateSetting('table_quantity_display_size', v as 'small' | 'medium' | 'large' | 'huge')}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="small">Liten (2xl)</SelectItem>
                                    <SelectItem value="medium">Medium (3xl)</SelectItem>
                                    <SelectItem value="large">Stor (4xl) - Anbefalt</SelectItem>
                                    <SelectItem value="huge">Veldig stor (5xl)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Stil</Label>
                                <Select 
                                  value={settings.table_quantity_border_style || 'outline'} 
                                  onValueChange={(v) => updateSetting('table_quantity_border_style', v as 'none' | 'outline' | 'filled')}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Ingen bakgrunn</SelectItem>
                                    <SelectItem value="outline">Outline (kant)</SelectItem>
                                    <SelectItem value="filled">Filled (fylt)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <ColorInput 
                                label="Farge" 
                                value={settings.table_quantity_text_color || '#3b82f6'}
                                onChange={(v) => updateSetting('table_quantity_text_color', v)}
                              />
                              
                              {(settings.table_quantity_border_style === 'filled' || settings.table_quantity_border_style === 'outline') && (
                                <ColorInput 
                                  label="Bakgrunnsfarge" 
                                  value={settings.table_quantity_background_color || '#3b82f630'}
                                  onChange={(v) => updateSetting('table_quantity_background_color', v)}
                                />
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label>Vis "ordrer"-label</Label>
                                  <p className="text-xs text-muted-foreground">Tekst under tallet</p>
                                </div>
                                <Switch
                                  checked={settings.table_quantity_show_label ?? false}
                                  onCheckedChange={(v) => updateSetting('table_quantity_show_label', v)}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Status-ikoner</Label>
                              <p className="text-xs text-muted-foreground">Vis ikoner på status-badges</p>
                            </div>
                            <Switch
                              checked={settings.table_show_status_icons ?? true}
                              onCheckedChange={(v) => updateSetting('table_show_status_icons', v)}
                            />
                          </div>
                        </div>
                        
                        {/* Utseende */}
                        <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utseende</h5>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Fast header</Label>
                              <p className="text-xs text-muted-foreground">Header blir stående ved scrolling</p>
                            </div>
                            <Switch
                              checked={settings.table_sticky_header ?? true}
                              onCheckedChange={(v) => updateSetting('table_sticky_header', v)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Alternerende radfarger</Label>
                              <p className="text-xs text-muted-foreground">Zebra-stripe for lesbarhet</p>
                            </div>
                            <Switch
                              checked={settings.table_alternate_rows ?? true}
                              onCheckedChange={(v) => updateSetting('table_alternate_rows', v)}
                            />
                          </div>
                          
                          {settings.table_alternate_rows && (
                            <div className="pl-4 border-l-2 border-muted">
                              <ColorInput 
                                label="Alternativ radfarge" 
                                value={settings.table_alternate_row_color || '#f1f5f9'}
                                onChange={(v) => updateSetting('table_alternate_row_color', v)}
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Hover-effekt</Label>
                              <p className="text-xs text-muted-foreground">Fremhev rad ved hover</p>
                            </div>
                            <Switch
                              checked={settings.table_row_hover_effect ?? true}
                              onCheckedChange={(v) => updateSetting('table_row_hover_effect', v)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Touch-feedback</Label>
                              <p className="text-xs text-muted-foreground">Animasjon ved trykk på rad</p>
                            </div>
                            <Switch
                              checked={settings.table_touch_tap_feedback ?? true}
                              onCheckedChange={(v) => updateSetting('table_touch_tap_feedback', v)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between border-t pt-4 mt-2">
                            <div>
                              <Label className="text-primary font-semibold">Klikkbar rad pakker produkt</Label>
                              <p className="text-xs text-muted-foreground">Marker produktet som pakket ved å klikke på hele raden</p>
                            </div>
                            <Switch
                              checked={settings.table_row_click_to_pack ?? false}
                              onCheckedChange={(v) => updateSetting('table_row_click_to_pack', v)}
                            />
                          </div>
                        </div>
                        
                        {/* Header-innstillinger */}
                        <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header-innstillinger</h5>
                          
                          <ColorInput 
                            label="Header bakgrunnsfarge" 
                            value={settings.table_header_background_color || '#1e293b'}
                            onChange={(v) => updateSetting('table_header_background_color', v)}
                          />
                          
                          <ColorInput 
                            label="Header tekstfarge" 
                            value={settings.table_header_text_color || '#94a3b8'}
                            onChange={(v) => updateSetting('table_header_text_color', v)}
                          />
                          
                          <div className="space-y-2">
                            <Label>Header fontstørrelse</Label>
                            <Select 
                              value={settings.table_header_font_size || '0.875rem'} 
                              onValueChange={(v) => updateSetting('table_header_font_size', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.75rem">Liten</SelectItem>
                                <SelectItem value="0.875rem">Normal</SelectItem>
                                <SelectItem value="1rem">Stor</SelectItem>
                                <SelectItem value="1.125rem">Ekstra stor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Sortering */}
                    <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sortering</h5>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Ferdige varer til bunnen</Label>
                          <p className="text-xs text-muted-foreground">Flytt kunder med 100% fremdrift til bunnen av listen</p>
                        </div>
                        <Switch
                          checked={settings.customer_sort_completed_last ?? true}
                          onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)}
                        />
                      </div>
                    </div>
                    
                    {/* Pakkeknapp-innstillinger */}
                    <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pakkeknapp</h5>
                      
                      <div className="space-y-2">
                        <Label>Knapptekst</Label>
                        <Input
                          value={settings.pack_button_text || 'Pakket'}
                          onChange={(e) => updateSetting('pack_button_text', e.target.value)}
                          placeholder="Pakket"
                        />
                      </div>
                      
                      <ColorInput 
                        label="Bakgrunnsfarge" 
                        value={settings.pack_button_background_color || '#22c55e'}
                        onChange={(v) => updateSetting('pack_button_background_color', v)}
                      />
                      
                      <ColorInput 
                        label="Tekstfarge" 
                        value={settings.pack_button_text_color || '#ffffff'}
                        onChange={(v) => updateSetting('pack_button_text_color', v)}
                      />
                      
                      <div className="space-y-2">
                        <Label>Størrelse</Label>
                        <Select 
                          value={settings.pack_button_size || 'large'} 
                          onValueChange={(v) => updateSetting('pack_button_size', v as 'normal' | 'large' | 'huge')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="large">Stor</SelectItem>
                            <SelectItem value="huge">Ekstra stor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Hjørneradius</Label>
                        <Select 
                          value={settings.pack_button_border_radius || '0.5rem'} 
                          onValueChange={(v) => updateSetting('pack_button_border_radius', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.25rem">Liten</SelectItem>
                            <SelectItem value="0.5rem">Normal</SelectItem>
                            <SelectItem value="0.75rem">Stor</SelectItem>
                            <SelectItem value="9999px">Avrundet (pill)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Vis ikon</Label>
                          <p className="text-xs text-muted-foreground">Vis hake-ikon på knappen</p>
                        </div>
                        <Switch
                          checked={settings.pack_button_show_icon ?? true}
                          onCheckedChange={(v) => updateSetting('pack_button_show_icon', v)}
                        />
                      </div>
                      
                      {/* Live preview av knappen */}
                      <div className="pt-3 border-t">
                        <Label className="text-xs text-muted-foreground mb-2 block">Forhåndsvisning</Label>
                        <Button
                          className="gap-2 font-medium"
                          style={{
                            backgroundColor: settings.pack_button_background_color || '#22c55e',
                            color: settings.pack_button_text_color || '#ffffff',
                            borderRadius: settings.pack_button_border_radius || '0.5rem',
                            height: settings.pack_button_size === 'huge' ? '4rem' : settings.pack_button_size === 'large' ? '3.5rem' : '3rem',
                            padding: settings.pack_button_size === 'huge' ? '0 2rem' : settings.pack_button_size === 'large' ? '0 1.5rem' : '0 1rem',
                            fontSize: settings.pack_button_size === 'huge' ? '1.25rem' : settings.pack_button_size === 'large' ? '1.125rem' : '1rem',
                          }}
                        >
                          {(settings.pack_button_show_icon ?? true) && <Check className="h-5 w-5" />}
                          {settings.pack_button_text || 'Pakket'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Produktkort-innstillinger */}
                    <ProductCardSettingsPanel 
                      settings={settings} 
                      updateSetting={updateSetting} 
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
          
          {/* Live preview */}
          <Card className="h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Live Forhåndsvisning - {DISPLAY_TYPES[selectedDisplayType].label}
              </CardTitle>
              <CardDescription>
                Slik vil displayet se ut med nåværende innstillinger
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Customer Display Preview */}
              {selectedDisplayType === 'customer' && (
                <div
                  className="rounded-lg overflow-hidden min-h-[500px]"
                  style={{
                    backgroundColor: 'hsl(var(--background))',
                    padding: '1rem',
                  }}
                >
                  {/* Customer name header */}
                  {settings.header_show_bakery_name && (
                    <h2 
                      className="font-bold text-center mb-4"
                      style={{ 
                        fontSize: settings.header_bakery_font_size,
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      Borgheim
                    </h2>
                  )}
                  
                  {/* Date bar */}
                  {settings.header_show_date && (
                    <div className="bg-card border rounded-lg px-3 py-2 flex items-center justify-center gap-2 mb-4">
                      <span className="text-primary font-medium text-sm">
                        ⏱ PAKKING FOR: Mandag 03.02.26 (Ikke I Dag)
                      </span>
                    </div>
                  )}
                  
                  {/* Product lines with colors */}
                  <div className="space-y-3 mb-4">
                    {[
                      { name: 'Horten', qty: 10, packed: false },
                      { name: 'Loff', qty: 4, packed: false },
                      { name: 'Formloff', qty: 2, packed: true },
                    ].map((product, i) => {
                      const bgColor = settings.product_line_colors_enabled && settings.product_line_colors_palette?.length
                        ? settings.product_line_colors_palette[i % settings.product_line_colors_palette.length]
                        : product.packed ? 'hsl(var(--complete) / 0.2)' : '#FEF3C7';
                      
                      return (
                        <div
                          key={product.name}
                          className="rounded-xl p-4 border-2"
                          style={{
                            backgroundColor: bgColor,
                            borderColor: product.packed ? 'hsl(var(--complete))' : `${bgColor}CC`,
                            opacity: product.packed ? 0.7 : 1,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <h3 
                              className="text-xl font-semibold"
                              style={{ 
                                textDecoration: product.packed ? 'line-through' : 'none',
                                opacity: product.packed ? 0.7 : 1,
                                color: 'hsl(var(--foreground))',
                              }}
                            >
                              {product.name}
                            </h3>
                            <div className="text-right flex flex-col items-end gap-1">
                              <div className="flex items-baseline gap-1">
                                <span 
                                  className="text-3xl font-bold"
                                  style={{ color: product.packed ? 'hsl(var(--complete))' : 'hsl(var(--primary))' }}
                                >
                                  {product.qty}
                                </span>
                                <span className="text-sm text-muted-foreground">stk</span>
                              </div>
                              <span 
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: product.packed ? 'hsl(var(--complete))' : '#FCD34D',
                                  color: product.packed ? 'hsl(var(--complete-foreground))' : '#92400E',
                                }}
                              >
                                {product.packed ? 'Ferdig' : 'Venter'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Status bar */}
                  <div 
                    className="rounded-xl py-3 px-4 text-center font-bold mb-4"
                    style={{
                      backgroundColor: 'hsl(var(--packing))',
                      color: 'hsl(var(--packing-foreground))',
                    }}
                  >
                    STATUS: Pågående
                  </div>
                  
                  {/* Progress bar */}
                  {settings.stats_show_total_progress && (
                    <div className="bg-card border rounded-xl p-4">
                      <div className="relative mb-2">
                        <div 
                          className="h-4 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'hsl(var(--muted))' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ 
                              width: '33%',
                              backgroundColor: 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-center text-lg font-bold">33%</p>
                    </div>
                  )}
                </div>
              )}

              {/* Shared Display Preview */}
              {selectedDisplayType === 'shared' && (
                <div
                  className="rounded-lg overflow-hidden min-h-[500px]"
                  style={{
                    backgroundColor: settings.background_color,
                    color: settings.text_color,
                    padding: settings.padding,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {settings.header_show_bakery_name && (
                        <h3 className="font-bold" style={{ fontSize: settings.header_bakery_font_size }}>
                          {bakery?.name || 'Bakeri'}
                        </h3>
                      )}
                      {settings.header_show_category_name && (
                        <p className="text-sm opacity-70">Alle produkter</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {settings.realtime_show_connection_status && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Live
                        </span>
                      )}
                      {settings.header_show_clock && (
                        <span className="font-mono" style={{ fontSize: settings.header_clock_font_size }}>
                          {settings.header_clock_format === '24h' ? '14:32' : '2:32 PM'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Date bar */}
                  {settings.header_show_date && (
                    <div 
                      className="rounded-lg px-3 py-2 flex items-center justify-center gap-2 mb-4"
                      style={{ backgroundColor: `${settings.card_background_color}` }}
                    >
                      <span style={{ fontSize: settings.header_date_font_size }}>
                        ⏱ PAKKING FOR: Tirsdag 03.02.26
                      </span>
                    </div>
                  )}
                  
                  {/* Stats */}
                  {settings.stats_show_total_progress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: settings.stats_label_font_size }}>Total fremdrift</span>
                        <span className="font-bold" style={{ fontSize: settings.stats_value_font_size }}>
                          {settings.stats_show_packed_count && '8 / 15'} (53%)
                        </span>
                      </div>
                      {settings.stats_progress_bar_style !== 'none' && (
                        <div
                          className="rounded-full"
                          style={{ 
                            backgroundColor: `${settings.pending_color}40`,
                            height: settings.stats_progress_bar_height,
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ 
                              width: '53%',
                              backgroundColor: settings.packing_color,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Customer cards grid */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(settings.columns, 3)}, 1fr)`,
                      gap: settings.gap_size,
                    }}
                  >
                    {[
                      { name: 'Meny Heimdal', progress: 100, status: 'complete', products: ['Grovbrød', 'Rundstykker'] },
                      { name: 'Kiwi Foyn', progress: 60, status: 'packing', products: ['Loff', 'Croissant'] },
                      { name: 'Spar Sentrum', progress: 0, status: 'pending', products: ['Baguette', 'Ciabatta'] },
                    ].map((customer, i) => (
                      <div
                        key={customer.name}
                        className="p-3"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderRadius: settings.border_radius,
                          borderLeft: `${settings.card_border_width} solid ${
                            customer.status === 'complete' ? settings.completed_color : 
                            customer.status === 'packing' ? settings.packing_color : 
                            settings.pending_color
                          }`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 
                            className="font-bold truncate"
                            style={{ fontSize: settings.card_customer_name_font_size }}
                          >
                            {customer.name}
                          </h4>
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                            style={{
                              backgroundColor: customer.status === 'complete' ? settings.completed_color : 
                                              customer.status === 'packing' ? settings.packing_color : 
                                              settings.pending_color,
                              color: '#fff',
                            }}
                          >
                            {customer.status === 'complete' ? 'Ferdig' : 
                             customer.status === 'packing' ? 'Pågår' : 'Venter'}
                          </span>
                        </div>
                        {settings.card_show_customer_number && (
                          <p className="text-xs opacity-50">#{1000 + i}</p>
                        )}
                        {settings.card_show_individual_progress && (
                          <>
                            <div
                              className="h-2 rounded-full mt-2"
                              style={{ backgroundColor: `${settings.pending_color}40` }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${customer.progress}%`,
                                  backgroundColor: customer.status === 'complete' ? settings.completed_color : settings.packing_color,
                                }}
                              />
                            </div>
                            <p className="text-xs mt-1 opacity-70" style={{ fontSize: settings.card_progress_font_size }}>
                              {customer.status === 'complete' ? '5/5' : customer.status === 'packing' ? '3/5' : '0/5'}
                            </p>
                          </>
                        )}
                        {settings.card_show_product_list && !settings.card_compact_mode && (
                          <div className="mt-2 space-y-1 border-t pt-2 opacity-80">
                            {customer.products.map((p, j) => {
                              const isPacked = customer.status === 'complete' || (customer.status === 'packing' && j === 0);
                              return (
                                <div 
                                  key={p} 
                                  className="flex justify-between"
                                  style={{ 
                                    fontSize: settings.card_product_font_size,
                                    opacity: isPacked ? 0.5 : 1,
                                    textDecoration: isPacked ? 'line-through' : 'none',
                                  }}
                                >
                                  <span className="truncate">{p}</span>
                                  <span className="font-mono ml-1" style={{ fontSize: settings.card_quantity_font_size }}>
                                    {5 + j * 3}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Packing Display Preview - Shows Table when table mode enabled */}
              {selectedDisplayType === 'packing' && (
                <div className="space-y-4">
                  {/* View mode toggle */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Visningsmodus:</span>
                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        settings.packing_view_mode === 'cards'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => updateSetting('packing_view_mode', 'cards')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Kort
                    </button>
                    <button
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        settings.packing_view_mode === 'table'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => updateSetting('packing_view_mode', 'table')}
                    >
                      <Table2 className="h-4 w-4" />
                      Tabell
                    </button>
                  </div>

                  {/* Table view preview */}
                  {settings.packing_view_mode === 'table' && (
                    <TablePreview settings={settings} />
                  )}

                  {/* Cards view preview */}
                  {settings.packing_view_mode !== 'table' && (
                    <div
                      className="rounded-lg overflow-hidden min-h-[400px]"
                      style={{
                        backgroundColor: settings.background_color,
                        padding: settings.padding,
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          {settings.header_show_bakery_name && (
                            <h3 className="font-bold" style={{ fontSize: settings.header_bakery_font_size, color: settings.text_color }}>
                              {bakery?.name || 'Bakeri'}
                            </h3>
                          )}
                          {settings.header_show_category_name && (
                            <p className="text-sm" style={{ color: settings.text_color, opacity: 0.7 }}>
                              Småvarer
                            </p>
                          )}
                        </div>
                        {settings.header_show_clock && (
                          <span 
                            className="font-mono"
                            style={{ fontSize: settings.header_clock_font_size, color: settings.text_color }}
                          >
                            14:32
                          </span>
                        )}
                      </div>
                      
                      {/* Stats */}
                      {settings.stats_show_total_progress && (
                        <div 
                          className="rounded-lg p-3 mb-4"
                          style={{ backgroundColor: settings.card_background_color }}
                        >
                          <div className="flex justify-between text-sm mb-2" style={{ color: settings.text_color }}>
                            <span>Totalt</span>
                            <span className="font-bold">2/4 kunder ferdig</span>
                          </div>
                          <div
                            className="h-3 rounded-full"
                            style={{ backgroundColor: `${settings.pending_color}40`, height: settings.stats_progress_bar_height }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: '50%', backgroundColor: settings.packing_color }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Customer cards grid */}
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(settings.columns, 2)}, 1fr)`,
                          gap: settings.gap_size,
                        }}
                      >
                        {[
                          { name: 'Meny Heimdal', progress: 100, status: 'complete', orders: '5/5' },
                          { name: 'Kiwi Foyn', progress: 60, status: 'packing', orders: '3/5' },
                          { name: 'Spar Sentrum', progress: 0, status: 'pending', orders: '0/4' },
                          { name: 'Rema 1000', progress: 0, status: 'pending', orders: '0/3' },
                        ].map((customer) => (
                          <div
                            key={customer.name}
                            className="p-3 transition-all"
                            style={{
                              backgroundColor: settings.card_background_color,
                              borderRadius: settings.border_radius,
                              borderLeft: `${settings.card_border_width} solid ${
                                customer.status === 'complete' ? settings.completed_color : 
                                customer.status === 'packing' ? settings.packing_color : 
                                settings.pending_color
                              }`,
                              opacity: customer.status === 'complete' ? 0.7 : 1,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h4 
                                className="font-bold truncate"
                                style={{ 
                                  fontSize: settings.card_customer_name_font_size,
                                  color: settings.text_color,
                                }}
                              >
                                {customer.name}
                              </h4>
                              <span 
                                className="px-2 py-0.5 rounded text-xs font-bold shrink-0"
                                style={{
                                  backgroundColor: customer.status === 'complete' ? settings.completed_color : 
                                                  customer.status === 'packing' ? settings.packing_color : 
                                                  `${settings.pending_color}40`,
                                  color: customer.status === 'pending' ? settings.text_color : '#fff',
                                }}
                              >
                                {customer.orders}
                              </span>
                            </div>
                            {settings.card_show_individual_progress && (
                              <div
                                className="h-1.5 rounded-full mt-2"
                                style={{ backgroundColor: `${settings.pending_color}40` }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${customer.progress}%`,
                                    backgroundColor: customer.status === 'complete' ? settings.completed_color : settings.packing_color,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
