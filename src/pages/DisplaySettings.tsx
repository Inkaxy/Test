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
  Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell, Copy, RotateCcw
} from 'lucide-react';
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
  
  const [selectedDisplayType, setSelectedDisplayType] = useState<DisplayType>('shared');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
          
          {categories.length > 0 && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium">Kategori-spesifikke innstillinger</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {selectedDisplayType === 'customer' 
                  ? 'Tilpass visning per produktkategori. Produkter arver innstillinger fra sin kategori.'
                  : 'Tilpass visning per produktkategori (f.eks. ulik fontstørrelse for brød vs kaker)'
                }
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
          
          {/* Kiosk Packing URLs - only show for shared and packing display types */}
          {bakery?.short_id && selectedDisplayType !== 'customer' && (
            <div className="pt-4 border-t mt-4 space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Pakkestasjoner (Kiosk)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Touch-optimaliserte lenker for pakkere. Krever ikke innlogging.
                </p>
              </div>
              
              {/* Customer-based kiosk */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kundebasert pakking
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Velg kunde, så pakk alle produkter for den kunden
                </p>
                <div className="flex gap-2 items-center">
                  <Input 
                    readOnly 
                    value={getKioskPackingUrl('customer') || ''} 
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => getKioskPackingUrl('customer') && copyToClipboard(getKioskPackingUrl('customer')!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={getKioskPackingUrl('customer') || ''} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              {/* Product-based kiosk */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produktbasert pakking
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Velg produkt, så pakk alle kundeordrer for det produktet
                </p>
                <div className="flex gap-2 items-center">
                  <Input 
                    readOnly 
                    value={getKioskPackingUrl('product') || ''} 
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => getKioskPackingUrl('product') && copyToClipboard(getKioskPackingUrl('product')!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={getKioskPackingUrl('product') || ''} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
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
                  {/* Theme presets */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Tema-forhåndsvalg</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'dark', label: 'Mørk', bg: '#1a1a2e', card: '#16213e', text: '#ffffff' },
                        { id: 'light', label: 'Lys', bg: '#f8fafc', card: '#ffffff', text: '#0f172a' },
                        { id: 'high-contrast', label: 'Høy kontrast', bg: '#000000', card: '#1a1a1a', text: '#ffffff' },
                        { id: 'custom', label: 'Egendefinert', bg: settings.background_color, card: settings.card_background_color, text: settings.text_color },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            if (theme.id !== 'custom') {
                              updateSetting('background_color', theme.bg);
                              updateSetting('card_background_color', theme.card);
                              updateSetting('text_color', theme.text);
                              updateSetting('theme_preset', theme.id as 'dark' | 'light' | 'high-contrast' | 'custom');
                            } else {
                              updateSetting('theme_preset', 'custom');
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            (settings.theme_preset || 'dark') === theme.id 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div 
                            className="h-8 rounded mb-2 flex items-center justify-center"
                            style={{ backgroundColor: theme.bg }}
                          >
                            <div 
                              className="h-4 w-8 rounded"
                              style={{ backgroundColor: theme.card }}
                            />
                          </div>
                          <span className="text-xs font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {(settings.theme_preset === 'custom' || !settings.theme_preset) && (
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

              {/* Packing Display Preview */}
              {selectedDisplayType === 'packing' && (
                <div
                  className="rounded-lg overflow-hidden min-h-[500px]"
                  style={{
                    backgroundColor: 'hsl(var(--background))',
                    padding: '1rem',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Produktpakking</h3>
                      <p className="text-sm text-muted-foreground">3 produkter valgt</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-muted text-xs">Tirsdag 03.02</span>
                    </div>
                  </div>
                  
                  {/* Product tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {['Grovbrød', 'Loff', 'Rundstykker'].map((name, i) => (
                      <button
                        key={name}
                        className="px-3 py-2 rounded-full border whitespace-nowrap flex items-center gap-2"
                        style={{
                          backgroundColor: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                          color: i === 0 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          borderColor: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                        }}
                      >
                        <span className="text-xs px-1.5 py-0.5 rounded bg-black/10">
                          {i === 0 ? '100%' : i === 1 ? '50%' : '0%'}
                        </span>
                        <span className="text-sm font-medium">{name}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Customer orders table */}
                  <div className="border rounded-lg bg-card overflow-hidden">
                    <div className="grid grid-cols-4 gap-2 p-2 bg-muted/50 text-xs font-medium">
                      <span>Kunde</span>
                      <span>Antall</span>
                      <span>Status</span>
                      <span className="text-right">Handling</span>
                    </div>
                    {[
                      { customer: 'Meny Heimdal', qty: 10, status: 'packed' },
                      { customer: 'Kiwi Foyn', qty: 5, status: 'packed' },
                      { customer: 'Spar Sentrum', qty: 8, status: 'pending' },
                    ].map((order, i) => (
                      <div 
                        key={order.customer}
                        className="grid grid-cols-4 gap-2 p-2 border-t items-center"
                        style={{
                          backgroundColor: order.status === 'packed' ? 'hsl(var(--complete) / 0.1)' : 'transparent',
                        }}
                      >
                        <span className="text-sm font-medium truncate">{order.customer}</span>
                        <span className="text-sm font-mono">{order.qty} stk</span>
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium w-fit"
                          style={{
                            backgroundColor: order.status === 'packed' ? 'hsl(var(--complete))' : 'hsl(var(--muted))',
                            color: order.status === 'packed' ? 'hsl(var(--complete-foreground))' : 'hsl(var(--muted-foreground))',
                          }}
                        >
                          {order.status === 'packed' ? 'Pakket' : 'Venter'}
                        </span>
                        <div className="flex justify-end">
                          {order.status === 'pending' ? (
                            <button 
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: 'hsl(var(--primary))',
                                color: 'hsl(var(--primary-foreground))',
                              }}
                            >
                              Pakk
                            </button>
                          ) : (
                            <button className="px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted">
                              Angre
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Footer actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <button className="flex items-center gap-2 px-3 py-2 rounded border text-sm">
                      ← Forrige produkt
                    </button>
                    <button 
                      className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
                      style={{
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                      }}
                    >
                      Neste produkt →
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
