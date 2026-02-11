import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { ColorInput } from './ColorInput';
import { ThemePresetMenu, ThemePreset } from '@/components/display-editor/ThemePresetMenu';
import { Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell, Package, RefreshCw } from 'lucide-react';

interface Props {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function CustomerDisplaySettingsPanel({ settings, updateSetting }: Props) {
  return (
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
            <div><Label>Vis bakerinavn</Label><p className="text-xs text-muted-foreground">Vis bakeriets navn i header</p></div>
            <Switch checked={settings.header_show_bakery_name} onCheckedChange={(v) => updateSetting('header_show_bakery_name', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis kategorinavn</Label><p className="text-xs text-muted-foreground">Vis valgt kategori i header</p></div>
            <Switch checked={settings.header_show_category_name} onCheckedChange={(v) => updateSetting('header_show_category_name', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis klokke</Label><p className="text-xs text-muted-foreground">Vis sanntidsklokke</p></div>
            <Switch checked={settings.header_show_clock} onCheckedChange={(v) => updateSetting('header_show_clock', v)} />
          </div>
          {settings.header_show_clock && (
            <div className="space-y-2">
              <Label>Klokkeformat</Label>
              <Select value={settings.header_clock_format} onValueChange={(v) => updateSetting('header_clock_format', v as '12h' | '24h')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24-timer (14:30)</SelectItem>
                  <SelectItem value="12h">12-timer (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div><Label>Vis dato</Label><p className="text-xs text-muted-foreground">Vis leveringsdato</p></div>
            <Switch checked={settings.header_show_date} onCheckedChange={(v) => updateSetting('header_show_date', v)} />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Fontstørrelser</h4>
            <div className="space-y-2">
              <Label>Bakerinavn</Label>
              <Select value={settings.header_bakery_font_size} onValueChange={(v) => updateSetting('header_bakery_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.header_category_font_size} onValueChange={(v) => updateSetting('header_category_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.header_clock_font_size} onValueChange={(v) => updateSetting('header_clock_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.header_date_font_size} onValueChange={(v) => updateSetting('header_date_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

      {/* Utseende */}
      <AccordionItem value="appearance" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Utseende</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <ThemePresetMenu
            currentTheme={settings.theme_preset || 'dark'}
            currentSettings={{ background_color: settings.background_color, card_background_color: settings.card_background_color, text_color: settings.text_color, pending_color: settings.pending_color, packing_color: settings.packing_color, completed_color: settings.completed_color }}
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
              <ColorInput label="Bakgrunnsfarge" value={settings.background_color} onChange={(v) => updateSetting('background_color', v)} />
              <ColorInput label="Kortbakgrunn" value={settings.card_background_color} onChange={(v) => updateSetting('card_background_color', v)} />
              <ColorInput label="Tekstfarge" value={settings.text_color} onChange={(v) => updateSetting('text_color', v)} />
            </div>
          )}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Statusfarger</h4>
            <div className="grid grid-cols-3 gap-3">
              <ColorInput label="Venter" value={settings.pending_color} onChange={(v) => updateSetting('pending_color', v)} />
              <ColorInput label="Pakker" value={settings.packing_color} onChange={(v) => updateSetting('packing_color', v)} />
              <ColorInput label="Ferdig" value={settings.completed_color} onChange={(v) => updateSetting('completed_color', v)} />
            </div>
          </div>
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Hjørneafrunding</Label>
              <Select value={settings.border_radius} onValueChange={(v) => updateSetting('border_radius', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.card_border_width} onValueChange={(v) => updateSetting('card_border_width', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div><Label>Vis fremdriftskort</Label><p className="text-xs text-muted-foreground">Kort med overordnet prosent ferdig</p></div>
            <Switch checked={settings.stats_show_total_progress} onCheckedChange={(v) => updateSetting('stats_show_total_progress', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis fremdriftsbar</Label><p className="text-xs text-muted-foreground">Progresjonslinjen i fremdriftskortet</p></div>
            <Switch checked={settings.stats_show_progress_bar} onCheckedChange={(v) => updateSetting('stats_show_progress_bar', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis antall pakket</Label><p className="text-xs text-muted-foreground">Antall ordrer som er pakket</p></div>
            <Switch checked={settings.stats_show_packed_count} onCheckedChange={(v) => updateSetting('stats_show_packed_count', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis gjenstående</Label><p className="text-xs text-muted-foreground">Antall ordrer som gjenstår</p></div>
            <Switch checked={settings.stats_show_remaining_count} onCheckedChange={(v) => updateSetting('stats_show_remaining_count', v)} />
          </div>
          <div className="space-y-2">
            <Label>Fremdriftsbar stil</Label>
            <Select value={settings.stats_progress_bar_style} onValueChange={(v) => updateSetting('stats_progress_bar_style', v as 'bar' | 'circle' | 'none')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Horisontal bar</SelectItem>
                <SelectItem value="circle">Sirkel</SelectItem>
                <SelectItem value="none">Ingen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fremdriftsbar høyde</Label>
            <Select value={settings.stats_progress_bar_height} onValueChange={(v) => updateSetting('stats_progress_bar_height', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.stats_label_font_size} onValueChange={(v) => updateSetting('stats_label_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.stats_value_font_size} onValueChange={(v) => updateSetting('stats_value_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div><Label>Vis kundenummer</Label><p className="text-xs text-muted-foreground">Vis kundenummer under navn</p></div>
            <Switch checked={settings.card_show_customer_number} onCheckedChange={(v) => updateSetting('card_show_customer_number', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis produktliste</Label><p className="text-xs text-muted-foreground">Vis liste over produkter</p></div>
            <Switch checked={settings.card_show_product_list} onCheckedChange={(v) => updateSetting('card_show_product_list', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis produktnumre</Label><p className="text-xs text-muted-foreground">Vis produktnummer ved navn</p></div>
            <Switch checked={settings.card_show_product_numbers} onCheckedChange={(v) => updateSetting('card_show_product_numbers', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis antall som brett</Label><p className="text-xs text-muted-foreground">Konverter stykker til brett</p></div>
            <Switch checked={settings.card_show_quantity_as_trays} onCheckedChange={(v) => updateSetting('card_show_quantity_as_trays', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis individuell fremdrift</Label><p className="text-xs text-muted-foreground">Fremdriftsbar per kunde</p></div>
            <Switch checked={settings.card_show_individual_progress} onCheckedChange={(v) => updateSetting('card_show_individual_progress', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Kompakt modus</Label><p className="text-xs text-muted-foreground">Mindre plass per kort</p></div>
            <Switch checked={settings.card_compact_mode} onCheckedChange={(v) => updateSetting('card_compact_mode', v)} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Fontstørrelser</h4>
            <div className="space-y-2">
              <Label>Kundenavn</Label>
              <Select value={settings.card_customer_name_font_size} onValueChange={(v) => updateSetting('card_customer_name_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.card_product_font_size} onValueChange={(v) => updateSetting('card_product_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.card_quantity_font_size} onValueChange={(v) => updateSetting('card_quantity_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={settings.card_progress_font_size} onValueChange={(v) => updateSetting('card_progress_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

      {/* Layout */}
      <AccordionItem value="layout" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Layout className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Layout & Sortering</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Kundenavn fontstørrelse</Label>
            <Select value={settings.customer_name_font_size} onValueChange={(v) => updateSetting('customer_name_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Select value={settings.product_font_size} onValueChange={(v) => updateSetting('product_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.875rem">Liten</SelectItem>
                <SelectItem value="1rem">Normal</SelectItem>
                <SelectItem value="1.25rem">Stor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mellomrom mellom kort</Label>
            <Select value={settings.gap_size} onValueChange={(v) => updateSetting('gap_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5rem">Liten</SelectItem>
                <SelectItem value="1rem">Normal</SelectItem>
                <SelectItem value="1.5rem">Stor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Sortering av kunder</h4>
            <div className="space-y-2">
              <Label>Sorter etter</Label>
              <Select value={settings.customer_sort_mode || 'name'} onValueChange={(v) => updateSetting('customer_sort_mode', v as 'name' | 'progress' | 'customer_number')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Kundenavn</SelectItem>
                  <SelectItem value="progress">Fremdrift (%)</SelectItem>
                  <SelectItem value="customer_number">Kundenummer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sorteringsrekkefølge</Label>
              <Select value={settings.customer_sort_direction || 'asc'} onValueChange={(v) => updateSetting('customer_sort_direction', v as 'asc' | 'desc')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Stigende (A-Å, 0-100)</SelectItem>
                  <SelectItem value="desc">Synkende (Å-A, 100-0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Ferdige kunder nederst</Label><p className="text-xs text-muted-foreground">Flytt kunder med 100% til bunnen</p></div>
              <Switch checked={settings.customer_sort_completed_last ?? true} onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Produktlinje-farger */}
      <AccordionItem value="product-colors" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Produktlinje-farger</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Fargekoding av produktlinjer på kundeskjermen.</p>
          <div className="flex items-center justify-between">
            <div><Label>Aktiver produktlinjefarger</Label><p className="text-xs text-muted-foreground">Hver produktlinje får unik farge</p></div>
            <Switch checked={settings.product_line_colors_enabled} onCheckedChange={(v) => updateSetting('product_line_colors_enabled', v)} />
          </div>
          {settings.product_line_colors_enabled && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {(settings.product_line_colors_palette || []).map((color, index) => (
                  <div key={index} className="space-y-1">
                    <Input type="color" value={color} onChange={(e) => {
                      const newPalette = [...(settings.product_line_colors_palette || [])];
                      newPalette[index] = e.target.value;
                      updateSetting('product_line_colors_palette', newPalette);
                    }} className="w-full h-10 p-1 cursor-pointer" />
                    <p className="text-xs text-center text-muted-foreground">{index + 1}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateSetting('product_line_colors_palette', [...(settings.product_line_colors_palette || []), '#E5E7EB'])}>+ Legg til farge</Button>
                {(settings.product_line_colors_palette || []).length > 3 && (
                  <Button variant="outline" size="sm" onClick={() => updateSetting('product_line_colors_palette', (settings.product_line_colors_palette || []).slice(0, -1))}>Fjern siste</Button>
                )}
              </div>
            </div>
          )}
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
            <div><Label>Aktiver animasjoner</Label><p className="text-xs text-muted-foreground">Generelle overganger og effekter</p></div>
            <Switch checked={settings.animation_enabled} onCheckedChange={(v) => updateSetting('animation_enabled', v)} />
          </div>
          {settings.animation_enabled && (
            <>
              <div className="space-y-2">
                <Label>Animasjonshastighet</Label>
                <Select value={settings.animation_speed} onValueChange={(v) => updateSetting('animation_speed', v as 'fast' | 'normal' | 'slow')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Rask</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="slow">Langsom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Animasjon ved statusendring</Label><p className="text-xs text-muted-foreground">Animer når status endres</p></div>
                <Switch checked={settings.animation_on_status_change} onCheckedChange={(v) => updateSetting('animation_on_status_change', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Marker nylig oppdatert</Label><p className="text-xs text-muted-foreground">Fremhev kort som nettopp ble oppdatert</p></div>
                <Switch checked={settings.animation_highlight_new} onCheckedChange={(v) => updateSetting('animation_highlight_new', v)} />
              </div>
              {settings.animation_highlight_new && (
                <div className="space-y-2">
                  <Label>Fremhevingsvarighet: {settings.animation_highlight_duration / 1000}s</Label>
                  <Slider value={[settings.animation_highlight_duration]} onValueChange={([v]) => updateSetting('animation_highlight_duration', v)} min={1000} max={10000} step={1000} />
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
            <div><Label>Vis tilkoblingsstatus</Label><p className="text-xs text-muted-foreground">Indikator for sanntidstilkobling</p></div>
            <Switch checked={settings.realtime_show_connection_status} onCheckedChange={(v) => updateSetting('realtime_show_connection_status', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis siste oppdatering</Label><p className="text-xs text-muted-foreground">Tidspunkt for siste datahenting</p></div>
            <Switch checked={settings.realtime_show_last_update} onCheckedChange={(v) => updateSetting('realtime_show_last_update', v)} />
          </div>
          <div className="space-y-2">
            <Label>Auto-oppdatering: hvert {settings.realtime_auto_refresh_interval}s</Label>
            <Slider value={[settings.realtime_auto_refresh_interval]} onValueChange={([v]) => updateSetting('realtime_auto_refresh_interval', v)} min={15} max={300} step={15} />
            <p className="text-xs text-muted-foreground">Fallback hvis sanntid feiler</p>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Lyd ved ferdig pakket</Label><p className="text-xs text-muted-foreground">Spill lyd når kunde er ferdig</p></div>
            <Switch checked={settings.realtime_sound_on_complete} onCheckedChange={(v) => updateSetting('realtime_sound_on_complete', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Flash ved oppdatering</Label><p className="text-xs text-muted-foreground">Kort visuell markering ved endring</p></div>
            <Switch checked={settings.realtime_flash_on_update} onCheckedChange={(v) => updateSetting('realtime_flash_on_update', v)} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Fontstørrelser</h4>
            <div className="space-y-2">
              <Label>Statustekst</Label>
              <Select value={settings.realtime_status_font_size} onValueChange={(v) => updateSetting('realtime_status_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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

      {/* Oppdateringsknapp */}
      <AccordionItem value="refresh-button" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Oppdateringsknapp</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div><Label>Vis oppdateringsknapp</Label><p className="text-xs text-muted-foreground">Manuell oppdatering av data</p></div>
            <Switch checked={settings.refresh_button_show ?? true} onCheckedChange={(v) => updateSetting('refresh_button_show', v)} />
          </div>
          {settings.refresh_button_show !== false && (
            <>
              <div className="space-y-2">
                <Label>Størrelse</Label>
                <Select value={settings.refresh_button_size || 'medium'} onValueChange={(v) => updateSetting('refresh_button_size', v as 'small' | 'medium' | 'large' | 'huge')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Liten</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Stor</SelectItem>
                    <SelectItem value="huge">Ekstra stor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stil</Label>
                <Select value={settings.refresh_button_style || 'icon'} onValueChange={(v) => updateSetting('refresh_button_style', v as 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icon">Kun ikon</SelectItem>
                    <SelectItem value="icon-circle">Ikon i sirkel</SelectItem>
                    <SelectItem value="icon-square">Ikon i firkant</SelectItem>
                    <SelectItem value="text">Kun tekst</SelectItem>
                    <SelectItem value="text-icon">Tekst og ikon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(settings.refresh_button_style === 'icon-circle' || settings.refresh_button_style === 'icon-square') && (
                <ColorInput label="Bakgrunnsfarge" value={settings.refresh_button_background_color || '#ffffff'} onChange={(v) => updateSetting('refresh_button_background_color', v)} />
              )}
              <ColorInput label="Ikonfarge (tom = arver)" value={settings.refresh_button_icon_color || ''} onChange={(v) => updateSetting('refresh_button_icon_color', v)} />
              {(settings.refresh_button_style === 'text' || settings.refresh_button_style === 'text-icon') && (
                <div className="space-y-2">
                  <Label>Tekst</Label>
                  <Input value={settings.refresh_button_text || 'Oppdater'} onChange={(e) => updateSetting('refresh_button_text', e.target.value)} />
                </div>
              )}
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Skjermkontroll */}
      <AccordionItem value="general" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Layout className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Skjermkontroll</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div><Label>Vis fullskjerm-knapp</Label><p className="text-xs text-muted-foreground">Tillat fullskjermmodus på displayet</p></div>
            <Switch checked={settings.fullscreen_button_visible ?? true} onCheckedChange={(v) => updateSetting('fullscreen_button_visible', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Hold skjermen våken</Label><p className="text-xs text-muted-foreground">Forhindrer at skjermen slår seg av</p></div>
            <Switch checked={settings.wake_lock_enabled ?? true} onCheckedChange={(v) => updateSetting('wake_lock_enabled', v)} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
