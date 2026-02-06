import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Type, Layout, Palette, Sparkles, Grid3X3 } from 'lucide-react';
import { DisplaySettings } from '@/hooks/useDisplayOrders';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 px-2 text-sm rounded border bg-background"
        />
      </div>
    </div>
  );
}

interface ProductCardSettingsPanelProps {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function ProductCardSettingsPanel({ settings, updateSetting }: ProductCardSettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4 space-y-4">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Package className="h-4 w-4" />
        Produktkort-innstillinger
      </h4>
      <p className="text-xs text-muted-foreground">
        Konfigurer hvordan produktene vises når en kunde pakkes
      </p>
      
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="layout" className="text-xs">
            <Layout className="h-3.5 w-3.5 mr-1" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="quantity" className="text-xs">
            <Grid3X3 className="h-3.5 w-3.5 mr-1" />
            Antall
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs">
            <Type className="h-3.5 w-3.5 mr-1" />
            Tekst
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            <Palette className="h-3.5 w-3.5 mr-1" />
            Farger
          </TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Oppførsel
          </TabsTrigger>
        </TabsList>
        
        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kortlayout</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateSetting('product_card_layout', 'horizontal')}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  (settings.product_card_layout || 'horizontal') === 'horizontal'
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-1">
                    <div className="w-8 h-4 bg-muted rounded" />
                    <div className="w-4 h-4 bg-primary/30 rounded" />
                  </div>
                </div>
                <span className="text-xs font-medium">Horisontal</span>
                <p className="text-xs text-muted-foreground">Produkt og antall på rad</p>
              </button>
              
              <button
                type="button"
                onClick={() => updateSetting('product_card_layout', 'vertical')}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  settings.product_card_layout === 'vertical'
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col gap-1 mb-1">
                  <div className="w-full h-3 bg-muted rounded" />
                  <div className="w-6 h-3 bg-primary/30 rounded self-end" />
                </div>
                <span className="text-xs font-medium">Vertikal</span>
                <p className="text-xs text-muted-foreground">Produkt over antall</p>
              </button>
            </div>
            
            <div className="space-y-2">
              <Label>Antall-plassering</Label>
              <Select 
                value={settings.product_card_quantity_position || 'right'} 
                onValueChange={(v) => updateSetting('product_card_quantity_position', v as 'left' | 'right' | 'center')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Venstre</SelectItem>
                  <SelectItem value="center">Midtstilt</SelectItem>
                  <SelectItem value="right">Høyre (standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Padding</Label>
                <Select 
                  value={settings.product_card_padding || '1.25rem'} 
                  onValueChange={(v) => updateSetting('product_card_padding', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.75rem">Liten</SelectItem>
                    <SelectItem value="1rem">Normal</SelectItem>
                    <SelectItem value="1.25rem">Stor</SelectItem>
                    <SelectItem value="1.5rem">Ekstra stor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Mellomrom</Label>
                <Select 
                  value={settings.product_card_gap || '1rem'} 
                  onValueChange={(v) => updateSetting('product_card_gap', v)}
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
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hjørneradius</Label>
                <Select 
                  value={settings.product_card_border_radius || '0.75rem'} 
                  onValueChange={(v) => updateSetting('product_card_border_radius', v)}
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
                <Label>Kantlinje</Label>
                <Select 
                  value={settings.product_card_border_width || '2px'} 
                  onValueChange={(v) => updateSetting('product_card_border_width', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ingen</SelectItem>
                    <SelectItem value="1px">Tynn</SelectItem>
                    <SelectItem value="2px">Normal</SelectItem>
                    <SelectItem value="3px">Tykk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Quantity Tab */}
        <TabsContent value="quantity" className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Antall-visning</h5>
            
            <div className="space-y-2">
              <Label>Størrelse</Label>
              <Select 
                value={settings.product_card_quantity_size || 'large'} 
                onValueChange={(v) => updateSetting('product_card_quantity_size', v as 'small' | 'medium' | 'large' | 'huge')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Liten (2xl)</SelectItem>
                  <SelectItem value="medium">Medium (3xl)</SelectItem>
                  <SelectItem value="large">Stor (4xl)</SelectItem>
                  <SelectItem value="huge">Veldig stor (5xl)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Stil</Label>
              <div className="grid grid-cols-4 gap-2">
                {(['plain', 'box', 'pill', 'circle'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateSetting('product_card_quantity_style', style)}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      (settings.product_card_quantity_style || 'box') === style
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div 
                      className={`h-8 w-full flex items-center justify-center text-sm font-bold ${
                        style === 'box' ? 'rounded-lg bg-primary/20' :
                        style === 'pill' ? 'rounded-full bg-primary/20' :
                        style === 'circle' ? 'rounded-full bg-primary/20 aspect-square mx-auto w-8' :
                        ''
                      }`}
                    >
                      12
                    </div>
                    <span className="text-xs capitalize mt-1 block text-center">
                      {style === 'plain' ? 'Enkel' : style === 'box' ? 'Boks' : style === 'pill' ? 'Pille' : 'Sirkel'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <ColorInput
              label="Bakgrunnsfarge"
              value={settings.product_card_quantity_background_color || '#3b82f620'}
              onChange={(v) => updateSetting('product_card_quantity_background_color', v)}
            />
            
            <ColorInput
              label="Tekstfarge"
              value={settings.product_card_quantity_text_color || '#3b82f6'}
              onChange={(v) => updateSetting('product_card_quantity_text_color', v)}
            />
          </div>
          
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brett/kurv-visning</h5>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Vis brett-format</Label>
                <p className="text-xs text-muted-foreground">F.eks. 2pl+3 istedenfor bare 15</p>
              </div>
              <Switch
                checked={settings.product_card_show_tray_format ?? true}
                onCheckedChange={(v) => updateSetting('product_card_show_tray_format', v)}
              />
            </div>
            
            {settings.product_card_show_tray_format && (
              <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Brett-etikett</Label>
                  <Select 
                    value={settings.product_card_tray_label || 'pl'} 
                    onValueChange={(v) => updateSetting('product_card_tray_label', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">pl (plate)</SelectItem>
                      <SelectItem value="br">br (brett)</SelectItem>
                      <SelectItem value="k">k (kurv)</SelectItem>
                      <SelectItem value="stk">stk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Stykk-etikett</Label>
                  <Select 
                    value={settings.product_card_pieces_label || 'stk'} 
                    onValueChange={(v) => updateSetting('product_card_pieces_label', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stk">stk</SelectItem>
                      <SelectItem value="stykk">stykk</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Vis totalt antall</Label>
                <p className="text-xs text-muted-foreground">Vis "= 15 stk" under brett-formatet</p>
              </div>
              <Switch
                checked={settings.product_card_show_total_pieces ?? true}
                onCheckedChange={(v) => updateSetting('product_card_show_total_pieces', v)}
              />
            </div>
          </div>
        </TabsContent>
        
        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produktnavn</h5>
            
            <div className="space-y-2">
              <Label>Fontstørrelse</Label>
              <Select 
                value={settings.product_card_name_font_size || '1.25rem'} 
                onValueChange={(v) => updateSetting('product_card_name_font_size', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1rem">Liten (1rem)</SelectItem>
                  <SelectItem value="1.125rem">Normal (1.125rem)</SelectItem>
                  <SelectItem value="1.25rem">Stor (1.25rem)</SelectItem>
                  <SelectItem value="1.5rem">Ekstra stor (1.5rem)</SelectItem>
                  <SelectItem value="1.75rem">Veldig stor (1.75rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fontvekt</Label>
              <Select 
                value={settings.product_card_name_font_weight || 'semibold'} 
                onValueChange={(v) => updateSetting('product_card_name_font_weight', v as 'normal' | 'medium' | 'semibold' | 'bold')}
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
          </div>
          
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produktnummer</h5>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Vis produktnummer</Label>
                <p className="text-xs text-muted-foreground">Vis produktkode under navnet</p>
              </div>
              <Switch
                checked={settings.product_card_show_product_number ?? true}
                onCheckedChange={(v) => updateSetting('product_card_show_product_number', v)}
              />
            </div>
            
            {settings.product_card_show_product_number && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label>Fontstørrelse</Label>
                <Select 
                  value={settings.product_card_product_number_font_size || '0.875rem'} 
                  onValueChange={(v) => updateSetting('product_card_product_number_font_size', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.75rem">Liten</SelectItem>
                    <SelectItem value="0.875rem">Normal</SelectItem>
                    <SelectItem value="1rem">Stor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alternerende rader</h5>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Aktiver zebra-striping</Label>
                <p className="text-xs text-muted-foreground">Alternerende bakgrunn for lesbarhet</p>
              </div>
              <Switch
                checked={settings.product_card_alternate_rows ?? false}
                onCheckedChange={(v) => updateSetting('product_card_alternate_rows', v)}
              />
            </div>
            
            {settings.product_card_alternate_rows && (
              <ColorInput
                label="Alternativ radfarge"
                value={settings.product_card_alternate_color || '#f1f5f920'}
                onChange={(v) => updateSetting('product_card_alternate_color', v)}
              />
            )}
          </div>
        </TabsContent>
        
        {/* Behavior Tab */}
        <TabsContent value="behavior" className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Knapper</h5>
            
            <div className="space-y-2">
              <Label>Knappestørrelse</Label>
              <Select 
                value={settings.product_card_button_size || 'large'} 
                onValueChange={(v) => updateSetting('product_card_button_size', v as 'normal' | 'large' | 'huge')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Stor (touch-vennlig)</SelectItem>
                  <SelectItem value="huge">Veldig stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Knappestil</Label>
              <Select 
                value={settings.product_card_button_style || 'full'} 
                onValueChange={(v) => updateSetting('product_card_button_style', v as 'full' | 'icon-only' | 'compact')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full (ikon + tekst)</SelectItem>
                  <SelectItem value="compact">Kompakt (kort tekst)</SelectItem>
                  <SelectItem value="icon-only">Kun ikon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Vis status-badge</Label>
                <p className="text-xs text-muted-foreground">Vis "Venter", "Pakket" osv.</p>
              </div>
              <Switch
                checked={settings.product_card_show_status_badge ?? true}
                onCheckedChange={(v) => updateSetting('product_card_show_status_badge', v)}
              />
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/30 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ferdig-visning</h5>
            
            <div className="space-y-2">
              <Label>Stil for pakkede produkter</Label>
              <Select 
                value={settings.product_card_packed_style || 'strikethrough'} 
                onValueChange={(v) => updateSetting('product_card_packed_style', v as 'strikethrough' | 'fade' | 'collapse')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strikethrough">Gjennomstreking</SelectItem>
                  <SelectItem value="fade">Uttonet</SelectItem>
                  <SelectItem value="collapse">Kollapset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Animasjoner</Label>
                <p className="text-xs text-muted-foreground">Fade-in når kort vises</p>
              </div>
              <Switch
                checked={settings.product_card_animation_enabled ?? true}
                onCheckedChange={(v) => updateSetting('product_card_animation_enabled', v)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
