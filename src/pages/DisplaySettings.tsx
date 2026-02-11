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
  Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell, Copy, RotateCcw, Table2, Check,
  ArrowLeft, Clock, RefreshCw, Wifi, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TablePreview } from '@/components/display-editor/TablePreview';
import { ThemePresetMenu, ThemePreset } from '@/components/display-editor/ThemePresetMenu';
import { ProductCardSettingsPanel } from '@/components/display-editor/ProductCardSettingsPanel';
import { SharedDisplaySettingsPanel } from '@/components/display-settings/SharedDisplaySettingsPanel';
import { CustomerDisplaySettingsPanel } from '@/components/display-settings/CustomerDisplaySettingsPanel';
import { PackingDisplaySettingsPanel } from '@/components/display-settings/PackingDisplaySettingsPanel';
import { ProductPackingSettingsPanel } from '@/components/display-settings/ProductPackingSettingsPanel';
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
    if (selectedDisplayType === 'shared' || selectedDisplayType === 'customer' || selectedDisplayType === 'product_packing') {
      // Felles display, Kundedisplay og Produktbasert Pakking = kun produktbaserte kategorier
      return cat.packing_mode === 'product_based';
    }
    return true;
  });

  // Display types som vises i innstillingspanelet (ekskluder customer_packing fra shared/customer)
  const visibleDisplayTypes = (Object.entries(DISPLAY_TYPES) as [DisplayType, typeof DISPLAY_TYPES[DisplayType]][])
    .filter(([type]) => type !== 'customer_packing');

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
      case 'product_packing': return <Package className="h-4 w-4" />;
    }
  };

  
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
              {visibleDisplayTypes
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
            <TabsList className="grid w-full grid-cols-4">
              {visibleDisplayTypes.map(([type, info]) => (
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
          {/* Settings panels - each display type has its own dedicated panel */}
          <div className="space-y-4">
            {selectedDisplayType === 'shared' && (
              <SharedDisplaySettingsPanel settings={settings} updateSetting={updateSetting} />
            )}
            {selectedDisplayType === 'customer' && (
              <CustomerDisplaySettingsPanel settings={settings} updateSetting={updateSetting} />
            )}
            {selectedDisplayType === 'packing' && (
              <PackingDisplaySettingsPanel settings={settings} updateSetting={updateSetting} />
            )}
            {selectedDisplayType === 'product_packing' && (
              <ProductPackingSettingsPanel settings={settings} updateSetting={updateSetting} />
            )}
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
                  {settings.stats_show_progress_bar && settings.stats_show_total_progress && (
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
                      {settings.stats_show_progress_bar && settings.stats_progress_bar_style !== 'none' && (
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
                      {/* Header with all controls */}
                      <div 
                        className="flex items-center justify-between mb-4 p-3 rounded-lg"
                        style={{ backgroundColor: settings.card_background_color }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Back Button - Shows done mode preview when enabled */}
                          {settings.back_button_show !== false && (() => {
                            const showDoneMode = settings.back_button_done_highlight ?? true;
                            const doneStyle = showDoneMode 
                              ? (settings.back_button_done_style || 'text-icon')
                              : (settings.back_button_style || 'icon');
                            const doneSize = showDoneMode 
                              ? (settings.back_button_done_size || 'huge')
                              : (settings.back_button_size || 'large');
                            const doneBgColor = showDoneMode 
                              ? (settings.back_button_done_background_color || settings.completed_color || '#22c55e')
                              : (settings.back_button_background_color || 'transparent');
                            const doneIconColor = showDoneMode 
                              ? (settings.back_button_done_icon_color || '#ffffff')
                              : (settings.back_button_icon_color || settings.text_color);
                            const doneText = showDoneMode 
                              ? (settings.back_button_done_text || 'Ferdig')
                              : (settings.back_button_text || 'Tilbake');
                            const showPulse = showDoneMode && (settings.back_button_done_pulse_animation ?? true);

                            const sizeMap = {
                              small: { box: '28px', icon: 'h-4 w-4', text: 'text-sm', padding: 'px-3 py-1.5' },
                              medium: { box: '32px', icon: 'h-5 w-5', text: 'text-base', padding: 'px-4 py-2' },
                              large: { box: '40px', icon: 'h-6 w-6', text: 'text-lg', padding: 'px-5 py-2.5' },
                              huge: { box: '48px', icon: 'h-8 w-8', text: 'text-xl', padding: 'px-6 py-3' },
                            };
                            const sizes = sizeMap[doneSize] || sizeMap.large;

                            const hasBackground = doneStyle === 'icon-circle' || doneStyle === 'icon-square' || doneStyle === 'text' || doneStyle === 'text-icon';
                            const IconComponent = showDoneMode ? Check : ArrowLeft;

                            const buttonContent = (
                              <div 
                                className={cn(
                                  "flex items-center justify-center shrink-0 gap-2 font-semibold",
                                  doneStyle === 'icon-circle' && "rounded-full",
                                  doneStyle === 'icon-square' && "rounded-lg",
                                  (doneStyle === 'text' || doneStyle === 'text-icon') && `rounded-lg ${sizes.padding} ${sizes.text}`,
                                )}
                                style={{ 
                                  backgroundColor: hasBackground ? doneBgColor : 'transparent',
                                  color: doneIconColor,
                                  width: (doneStyle === 'text' || doneStyle === 'text-icon') ? 'auto' : sizes.box,
                                  height: (doneStyle === 'text' || doneStyle === 'text-icon') ? 'auto' : sizes.box,
                                  boxShadow: showDoneMode ? '0 4px 14px 0 rgba(0,0,0,0.25)' : undefined,
                                }}
                              >
                                {doneStyle !== 'text' && <IconComponent className={sizes.icon} />}
                                {(doneStyle === 'text' || doneStyle === 'text-icon') && <span>{doneText}</span>}
                                {showDoneMode && doneStyle === 'text-icon' && <ArrowRight className={sizes.icon} />}
                              </div>
                            );

                            if (showPulse) {
                              return (
                                <motion.div
                                  initial={{ scale: 1 }}
                                  animate={{ 
                                    scale: [1, 1.05, 1],
                                    boxShadow: [
                                      '0 0 0 0 rgba(34, 197, 94, 0.4)',
                                      '0 0 0 8px rgba(34, 197, 94, 0)',
                                      '0 0 0 0 rgba(34, 197, 94, 0)'
                                    ]
                                  }}
                                  transition={{ 
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    ease: 'easeInOut'
                                  }}
                                  className="rounded-lg"
                                >
                                  {buttonContent}
                                </motion.div>
                              );
                            }
                            return buttonContent;
                          })()}
                          <div>
                            {settings.header_show_bakery_name && (
                              <h3 className="font-bold" style={{ fontSize: `calc(${settings.header_bakery_font_size} * 0.7)`, color: settings.text_color }}>
                                {bakery?.name || 'Bakeri'}
                              </h3>
                            )}
                            {settings.header_show_category_name && (
                              <p style={{ fontSize: `calc(${settings.header_category_font_size || '1rem'} * 0.7)`, color: settings.text_color, opacity: 0.7 }}>
                                Småvarer
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Connection status */}
                          {settings.realtime_show_connection_status && (
                            <Wifi className="h-4 w-4" style={{ color: settings.completed_color }} />
                          )}
                          
                          {/* Clock */}
                          {settings.header_show_clock && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 opacity-60" style={{ color: settings.text_color }} />
                              <span 
                                className="font-mono"
                                style={{ fontSize: `calc(${settings.header_clock_font_size} * 0.7)`, color: settings.text_color }}
                              >
                                14:32
                              </span>
                            </div>
                          )}
                          
                          {/* Date */}
                          {settings.header_show_date && (
                            <span 
                              style={{ fontSize: `calc(${settings.header_date_font_size || '1rem'} * 0.7)`, color: settings.text_color, opacity: 0.7 }}
                            >
                              Torsdag 6. feb
                            </span>
                          )}
                          
                          {/* Refresh Button - with all style options */}
                          {settings.refresh_button_show !== false && (() => {
                            const refreshStyle = settings.refresh_button_style || 'icon';
                            const refreshSize = settings.refresh_button_size || 'medium';
                            const refreshBgColor = settings.refresh_button_background_color || 'transparent';
                            const refreshIconColor = settings.refresh_button_icon_color || settings.text_color;
                            const refreshText = settings.refresh_button_text || 'Oppdater';

                            const sizeMap = {
                              small: { box: '24px', icon: 'h-3 w-3', text: 'text-xs', padding: 'px-2 py-1' },
                              medium: { box: '28px', icon: 'h-4 w-4', text: 'text-sm', padding: 'px-3 py-1.5' },
                              large: { box: '36px', icon: 'h-5 w-5', text: 'text-base', padding: 'px-4 py-2' },
                              huge: { box: '44px', icon: 'h-7 w-7', text: 'text-lg', padding: 'px-5 py-2.5' },
                            };
                            const sizes = sizeMap[refreshSize] || sizeMap.medium;

                            const hasBackground = refreshStyle === 'icon-circle' || refreshStyle === 'icon-square' || refreshStyle === 'text' || refreshStyle === 'text-icon';

                            return (
                              <div 
                                className={cn(
                                  "flex items-center justify-center shrink-0 gap-1.5 font-medium",
                                  refreshStyle === 'icon-circle' && "rounded-full",
                                  refreshStyle === 'icon-square' && "rounded-md",
                                  (refreshStyle === 'text' || refreshStyle === 'text-icon') && `rounded-md ${sizes.padding} ${sizes.text}`,
                                )}
                                style={{ 
                                  backgroundColor: hasBackground ? refreshBgColor : 'transparent',
                                  color: refreshIconColor,
                                  width: (refreshStyle === 'text' || refreshStyle === 'text-icon') ? 'auto' : sizes.box,
                                  height: (refreshStyle === 'text' || refreshStyle === 'text-icon') ? 'auto' : sizes.box,
                                }}
                              >
                                {refreshStyle !== 'text' && <RefreshCw className={sizes.icon} />}
                                {(refreshStyle === 'text' || refreshStyle === 'text-icon') && <span>{refreshText}</span>}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Stats section */}
                      {(settings.stats_show_total_progress || settings.stats_show_packed_count || settings.stats_show_remaining_count) && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {settings.stats_show_total_progress && (
                            <div 
                              className="rounded-lg p-2"
                              style={{ backgroundColor: settings.card_background_color }}
                            >
                              <p className="text-xs opacity-70" style={{ color: settings.text_color, fontSize: `calc(${settings.stats_label_font_size || '0.75rem'} * 0.8)` }}>Total</p>
                              <p className="font-bold" style={{ color: settings.text_color, fontSize: `calc(${settings.stats_value_font_size || '1.25rem'} * 0.7)` }}>50%</p>
                              {settings.stats_show_progress_bar && settings.stats_progress_bar_style !== 'none' && (
                                <div
                                  className="h-1.5 rounded-full mt-1"
                                  style={{ backgroundColor: `${settings.pending_color}40`, height: `calc(${settings.stats_progress_bar_height} * 0.7)` }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: '50%', backgroundColor: settings.packing_color }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {settings.stats_show_packed_count && (
                            <div 
                              className="rounded-lg p-2"
                              style={{ backgroundColor: settings.card_background_color }}
                            >
                              <p className="text-xs opacity-70" style={{ color: settings.text_color, fontSize: `calc(${settings.stats_label_font_size || '0.75rem'} * 0.8)` }}>Pakket</p>
                              <p className="font-bold" style={{ color: settings.completed_color, fontSize: `calc(${settings.stats_value_font_size || '1.25rem'} * 0.7)` }}>8/17</p>
                            </div>
                          )}
                          {settings.stats_show_remaining_count && (
                            <div 
                              className="rounded-lg p-2"
                              style={{ backgroundColor: settings.card_background_color }}
                            >
                              <p className="text-xs opacity-70" style={{ color: settings.text_color, fontSize: `calc(${settings.stats_label_font_size || '0.75rem'} * 0.8)` }}>Gjenstår</p>
                              <p className="font-bold" style={{ color: settings.packing_color, fontSize: `calc(${settings.stats_value_font_size || '1.25rem'} * 0.7)` }}>9</p>
                            </div>
                          )}
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
                          { name: 'Meny Heimdal', progress: 100, status: 'complete', orders: '5/5', number: '#1001', locked: false, lockedByMe: false },
                          { name: 'Kiwi Foyn', progress: 60, status: 'packing', orders: '3/5', number: '#1002', locked: true, lockedByMe: true },
                          { name: 'Spar Sentrum', progress: 0, status: 'pending', orders: '0/4', number: '#1003', locked: true, lockedByMe: false },
                          { name: 'Rema 1000', progress: 0, status: 'pending', orders: '0/3', number: '#1004', locked: false, lockedByMe: false },
                        ].map((customer) => {
                          const isLockedByOther = customer.locked && !customer.lockedByMe;
                          const shouldFade = settings.lock_fade_locked_cards && isLockedByOther;
                          
                          return (
                            <div
                              key={customer.name}
                              className={cn(
                                "p-3 transition-all relative",
                                settings.card_compact_mode && "p-2"
                              )}
                              style={{
                                backgroundColor: settings.card_background_color,
                                borderRadius: settings.border_radius,
                                borderLeft: `${settings.card_border_width} solid ${
                                  customer.status === 'complete' ? settings.completed_color : 
                                  customer.status === 'packing' ? settings.packing_color : 
                                  settings.pending_color
                                }`,
                                opacity: customer.status === 'complete' ? 0.7 : shouldFade ? 0.5 : 1,
                              }}
                            >
                              {/* Lock indicator badge */}
                              {settings.lock_enabled !== false && settings.lock_show_indicator && customer.locked && (
                                <div 
                                  className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{
                                    backgroundColor: customer.lockedByMe 
                                      ? (settings.lock_my_lock_color || '#3b82f6')
                                      : (settings.lock_other_lock_color || '#6b7280'),
                                    color: '#ffffff',
                                  }}
                                >
                                  {settings.lock_show_locked_by_text 
                                    ? (customer.lockedByMe 
                                        ? (settings.lock_locked_by_you_text || 'Din lås')
                                        : (settings.lock_locked_by_other_text || 'Låst'))
                                    : '🔒'}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 
                                    className="font-bold truncate"
                                    style={{ 
                                      fontSize: `calc(${settings.card_customer_name_font_size || settings.customer_name_font_size} * 0.6)`,
                                      color: settings.text_color,
                                    }}
                                  >
                                    {customer.name}
                                  </h4>
                                  {settings.card_show_customer_number && (
                                    <p 
                                      className="opacity-60"
                                      style={{ 
                                        fontSize: `calc(${settings.card_product_font_size || '0.875rem'} * 0.8)`,
                                        color: settings.text_color,
                                      }}
                                    >
                                      {customer.number}
                                    </p>
                                  )}
                                </div>
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product Packing Preview */}
              {selectedDisplayType === 'product_packing' && (
                <div
                  className="rounded-lg overflow-hidden min-h-[400px] p-4"
                  style={{
                    backgroundColor: settings.match_shared_display_theme ? '#1a1a2e' : settings.background_color,
                    color: settings.match_shared_display_theme ? '#ffffff' : settings.text_color,
                  }}
                >
                  <h4 className="text-sm font-bold mb-3 opacity-70">Produktbasert Pakking</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Grovbrød', customers: ['Meny Heimdal (5)', 'Kiwi Foyn (3)'], qty: 8, progress: 60 },
                      { name: 'Rundstykker', customers: ['Spar Sentrum (10)', 'Rema (6)'], qty: 16, progress: 25 },
                      { name: 'Loff', customers: ['Meny Heimdal (2)'], qty: 2, progress: 100 },
                    ].map((product, i) => {
                      const palette = settings.product_line_colors_palette || [];
                      const bgColor = settings.product_line_colors_enabled && palette.length > 0
                        ? `${palette[i % palette.length]}40`
                        : undefined;
                      const statusColor = product.progress === 100 
                        ? (settings.match_shared_display_theme ? '#22c55e' : settings.completed_color)
                        : product.progress > 0 
                        ? (settings.match_shared_display_theme ? '#f59e0b' : settings.packing_color)
                        : (settings.match_shared_display_theme ? '#6b7280' : settings.pending_color);

                      return (
                        <div key={product.name} className="rounded-lg p-3 border" style={{ 
                          backgroundColor: bgColor || (settings.match_shared_display_theme ? '#16213e' : settings.card_background_color),
                          borderColor: `${statusColor}40`,
                          borderRadius: settings.border_radius,
                        }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold" style={{ fontSize: settings.table_customer_name_font_size || '1.125rem' }}>
                              {product.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold" style={{ 
                                fontSize: settings.table_font_size || '1.25rem',
                                color: settings.table_quantity_text_color || '#3b82f6',
                              }}>
                                {product.qty} stk
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: statusColor, color: '#fff' }}>
                                {product.progress}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs opacity-60">
                            {product.customers.join(' · ')}
                          </div>
                          <div className="h-1.5 rounded-full mt-2" style={{ backgroundColor: `${statusColor}30` }}>
                            <div className="h-full rounded-full" style={{ width: `${product.progress}%`, backgroundColor: statusColor }} />
                          </div>
                        </div>
                      );
                    })}
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
