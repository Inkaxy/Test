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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useCategories } from '@/hooks/useCategories';
import { DisplaySettings, getDefaultDisplaySettings, DisplayType, DISPLAY_TYPES } from '@/hooks/useDisplayOrders';
import { Monitor, Smartphone, Palette, Layout, Settings2, ExternalLink, Loader2, Users, Package } from 'lucide-react';

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
  
  // Fetch existing settings for the selected display type and category
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
  
  // Reset settings when display type or category changes
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
    
    // Customer display doesn't have a direct preview URL (requires token)
    // Packing display is the internal packing page
    return null;
  };

  const getDisplayTypeIcon = (type: DisplayType) => {
    switch (type) {
      case 'shared': return <Monitor className="h-4 w-4" />;
      case 'customer': return <Users className="h-4 w-4" />;
      case 'packing': return <Package className="h-4 w-4" />;
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
          
          {/* Category selector - only for shared display */}
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
          {/* Settings panels */}
          <div className="space-y-6">
            <Tabs defaultValue="colors">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="colors">
                  <Palette className="h-4 w-4 mr-2" />
                  Farger
                </TabsTrigger>
                <TabsTrigger value="layout">
                  <Layout className="h-4 w-4 mr-2" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="display">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Visning
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="colors" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Fargepalett</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bakgrunnsfarge</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.background_color}
                            onChange={(e) => updateSetting('background_color', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={settings.background_color}
                            onChange={(e) => updateSetting('background_color', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Kortbakgrunn</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.card_background_color}
                            onChange={(e) => updateSetting('card_background_color', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={settings.card_background_color}
                            onChange={(e) => updateSetting('card_background_color', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tekstfarge</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={settings.text_color}
                            onChange={(e) => updateSetting('text_color', e.target.value)}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={settings.text_color}
                            onChange={(e) => updateSetting('text_color', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Statusfarger</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Venter</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.pending_color}
                              onChange={(e) => updateSetting('pending_color', e.target.value)}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={settings.pending_color}
                              onChange={(e) => updateSetting('pending_color', e.target.value)}
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Pakker</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.packing_color}
                              onChange={(e) => updateSetting('packing_color', e.target.value)}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={settings.packing_color}
                              onChange={(e) => updateSetting('packing_color', e.target.value)}
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Ferdig</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={settings.completed_color}
                              onChange={(e) => updateSetting('completed_color', e.target.value)}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={settings.completed_color}
                              onChange={(e) => updateSetting('completed_color', e.target.value)}
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="layout" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="display" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Visningsalternativer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Vis klokke</Label>
                        <p className="text-sm text-muted-foreground">Vis sanntidsklokke i header</p>
                      </div>
                      <Switch
                        checked={settings.show_clock}
                        onCheckedChange={(v) => updateSetting('show_clock', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Vis dato</Label>
                        <p className="text-sm text-muted-foreground">Vis leveringsdato i header</p>
                      </div>
                      <Switch
                        checked={settings.show_date}
                        onCheckedChange={(v) => updateSetting('show_date', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Vis fremdriftsbar</Label>
                        <p className="text-sm text-muted-foreground">Vis total pakkefremdrift</p>
                      </div>
                      <Switch
                        checked={settings.show_progress_bar}
                        onCheckedChange={(v) => updateSetting('show_progress_bar', v)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Animasjoner</Label>
                        <p className="text-sm text-muted-foreground">Aktiver overganger og animasjoner</p>
                      </div>
                      <Switch
                        checked={settings.animation_enabled}
                        onCheckedChange={(v) => updateSetting('animation_enabled', v)}
                      />
                    </div>
                    
                    {settings.animation_enabled && (
                      <div className="space-y-2">
                        <Label>Animasjonshastighet</Label>
                        <Select 
                          value={settings.animation_speed} 
                          onValueChange={(v) => updateSetting('animation_speed', v)}
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
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
                className="rounded-lg p-4 min-h-[400px]"
                style={{
                  backgroundColor: settings.background_color,
                  color: settings.text_color,
                }}
              >
                {/* Preview header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    {selectedDisplayType === 'customer' ? 'Meny Heimdal' : bakery?.name || 'Bakeri'}
                  </h3>
                  {settings.show_clock && (
                    <span className="font-mono text-sm">12:34:56</span>
                  )}
                </div>
                
                {/* Preview based on display type */}
                {selectedDisplayType === 'shared' && (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(settings.columns, 3)}, 1fr)`,
                    }}
                  >
                    {['Meny Heimdal', 'Kiwi Foyn', 'Spar Kullboden'].map((name, i) => (
                      <div
                        key={name}
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderLeft: `3px solid ${
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
                          {i === 0 ? '5/5' : i === 1 ? '3/5' : '0/5'} produkter
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedDisplayType === 'customer' && (
                  <div className="space-y-3">
                    {['Grovbrød', 'Rundstykker', 'Croissant'].map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center gap-4 rounded-lg p-3"
                        style={{
                          backgroundColor: settings.card_background_color,
                          borderLeft: `4px solid ${i === 0 ? settings.completed_color : settings.pending_color}`,
                          opacity: i === 0 ? 0.6 : 1,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: i === 0 
                              ? `${settings.completed_color}33` 
                              : `${settings.pending_color}33`
                          }}
                        >
                          {i === 0 ? '✓' : '○'}
                        </div>
                        <div className="flex-1">
                          <h4 
                            className="font-bold"
                            style={{ 
                              fontSize: `calc(${settings.customer_name_font_size} * 0.6)`,
                              textDecoration: i === 0 ? 'line-through' : 'none'
                            }}
                          >
                            {name}
                          </h4>
                          <p className="text-xs opacity-70">PRD-00{i+1}</p>
                        </div>
                        <span className="font-mono font-bold">
                          {i === 0 ? '10 stk' : i === 1 ? '2 pl' : '5 stk'}
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
                        className="flex items-center justify-between rounded-lg p-2"
                        style={{
                          backgroundColor: settings.card_background_color,
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
                
                {/* Progress bar preview */}
                {settings.show_progress_bar && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Fremdrift</span>
                      <span className="font-bold">50%</span>
                    </div>
                    <div
                      className="h-2 rounded"
                      style={{ backgroundColor: `${settings.pending_color}40` }}
                    >
                      <div
                        className="h-full rounded w-1/2"
                        style={{ backgroundColor: settings.packing_color }}
                      />
                    </div>
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
