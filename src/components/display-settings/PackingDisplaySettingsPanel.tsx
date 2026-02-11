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
import { TablePreview } from '@/components/display-editor/TablePreview';
import { ProductCardSettingsPanel } from '@/components/display-editor/ProductCardSettingsPanel';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Type, BarChart3, LayoutGrid, Sparkles, Layout, Zap, Bell, Package,
  Check, ArrowLeft, ArrowRight, RefreshCw, Users, Table2
} from 'lucide-react';

interface Props {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function PackingDisplaySettingsPanel({ settings, updateSetting }: Props) {
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
                  <SelectItem value="1.5rem">Liten</SelectItem><SelectItem value="1.875rem">Normal</SelectItem>
                  <SelectItem value="2.25rem">Stor</SelectItem><SelectItem value="3rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategorinavn</Label>
              <Select value={settings.header_category_font_size} onValueChange={(v) => updateSetting('header_category_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1rem">Liten</SelectItem><SelectItem value="1.25rem">Normal</SelectItem>
                  <SelectItem value="1.5rem">Stor</SelectItem><SelectItem value="2rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Klokke</Label>
              <Select value={settings.header_clock_font_size} onValueChange={(v) => updateSetting('header_clock_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1rem">Liten</SelectItem><SelectItem value="1.5rem">Normal</SelectItem>
                  <SelectItem value="2rem">Stor</SelectItem><SelectItem value="2.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dato</Label>
              <Select value={settings.header_date_font_size} onValueChange={(v) => updateSetting('header_date_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1rem">Liten</SelectItem><SelectItem value="1.25rem">Normal</SelectItem>
                  <SelectItem value="1.5rem">Stor</SelectItem><SelectItem value="2rem">Ekstra stor</SelectItem>
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
            <div><Label>Vis fremdriftskort</Label></div>
            <Switch checked={settings.stats_show_total_progress} onCheckedChange={(v) => updateSetting('stats_show_total_progress', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis fremdriftsbar</Label></div>
            <Switch checked={settings.stats_show_progress_bar} onCheckedChange={(v) => updateSetting('stats_show_progress_bar', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis antall pakket</Label></div>
            <Switch checked={settings.stats_show_packed_count} onCheckedChange={(v) => updateSetting('stats_show_packed_count', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis gjenstående</Label></div>
            <Switch checked={settings.stats_show_remaining_count} onCheckedChange={(v) => updateSetting('stats_show_remaining_count', v)} />
          </div>
          <div className="space-y-2">
            <Label>Fremdriftsbar stil</Label>
            <Select value={settings.stats_progress_bar_style} onValueChange={(v) => updateSetting('stats_progress_bar_style', v as 'bar' | 'circle' | 'none')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Horisontal bar</SelectItem><SelectItem value="circle">Sirkel</SelectItem><SelectItem value="none">Ingen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fremdriftsbar høyde</Label>
            <Select value={settings.stats_progress_bar_height} onValueChange={(v) => updateSetting('stats_progress_bar_height', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5rem">Tynn</SelectItem><SelectItem value="1rem">Normal</SelectItem><SelectItem value="1.5rem">Bred</SelectItem>
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
                  <SelectItem value="0.875rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem>
                  <SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Verdier</Label>
              <Select value={settings.stats_value_font_size} onValueChange={(v) => updateSetting('stats_value_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25rem">Liten</SelectItem><SelectItem value="1.5rem">Normal</SelectItem>
                  <SelectItem value="2rem">Stor</SelectItem><SelectItem value="2.5rem">Ekstra stor</SelectItem>
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
            <div><Label>Vis kundenummer</Label></div>
            <Switch checked={settings.card_show_customer_number} onCheckedChange={(v) => updateSetting('card_show_customer_number', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis produktliste</Label></div>
            <Switch checked={settings.card_show_product_list} onCheckedChange={(v) => updateSetting('card_show_product_list', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis produktnumre</Label></div>
            <Switch checked={settings.card_show_product_numbers} onCheckedChange={(v) => updateSetting('card_show_product_numbers', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis antall som brett</Label></div>
            <Switch checked={settings.card_show_quantity_as_trays} onCheckedChange={(v) => updateSetting('card_show_quantity_as_trays', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis individuell fremdrift</Label></div>
            <Switch checked={settings.card_show_individual_progress} onCheckedChange={(v) => updateSetting('card_show_individual_progress', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Kompakt modus</Label></div>
            <Switch checked={settings.card_compact_mode} onCheckedChange={(v) => updateSetting('card_compact_mode', v)} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Fontstørrelser</h4>
            <div className="space-y-2">
              <Label>Kundenavn</Label>
              <Select value={settings.card_customer_name_font_size} onValueChange={(v) => updateSetting('card_customer_name_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.25rem">Liten</SelectItem><SelectItem value="1.5rem">Normal</SelectItem>
                  <SelectItem value="2rem">Stor</SelectItem><SelectItem value="2.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produktnavn</Label>
              <Select value={settings.card_product_font_size} onValueChange={(v) => updateSetting('card_product_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.875rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem>
                  <SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Antall/mengde</Label>
              <Select value={settings.card_quantity_font_size} onValueChange={(v) => updateSetting('card_quantity_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.875rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem>
                  <SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fremdriftstekst</Label>
              <Select value={settings.card_progress_font_size} onValueChange={(v) => updateSetting('card_progress_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.75rem">Liten</SelectItem><SelectItem value="0.875rem">Normal</SelectItem>
                  <SelectItem value="1rem">Stor</SelectItem><SelectItem value="1.25rem">Ekstra stor</SelectItem>
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
              } else { updateSetting('theme_preset', 'custom'); }
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
                  <SelectItem value="0">Ingen</SelectItem><SelectItem value="0.375rem">Liten</SelectItem>
                  <SelectItem value="0.75rem">Normal</SelectItem><SelectItem value="1rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kantlinje bredde</Label>
              <Select value={settings.card_border_width} onValueChange={(v) => updateSetting('card_border_width', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2px">Tynn</SelectItem><SelectItem value="4px">Normal</SelectItem><SelectItem value="6px">Bred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Visningsmodus */}
      <AccordionItem value="view-mode" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Visningsmodus</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Velg hvordan kundeoversikten vises i pakkevisningen.</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => updateSetting('packing_view_mode', 'cards')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${(settings.packing_view_mode || 'cards') === 'cards' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
              <div className="flex items-center gap-2 mb-2"><LayoutGrid className="h-5 w-5" /><span className="font-medium">Kort-visning</span></div>
              <p className="text-xs text-muted-foreground">Grid med kundekort. Visuelt rikt, med fremdrift og status.</p>
            </button>
            <button type="button" onClick={() => updateSetting('packing_view_mode', 'table')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${settings.packing_view_mode === 'table' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
              <div className="flex items-center gap-2 mb-2"><Users className="h-5 w-5" /><span className="font-medium">Tabell-visning</span></div>
              <p className="text-xs text-muted-foreground">Kompakt liste. Rask oversikt over mange kunder.</p>
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Språk</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => updateSetting('packing_language', 'nb')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${(settings.packing_language || 'nb') === 'nb' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                <div className="font-medium">Norsk</div><div className="text-xs text-muted-foreground">Norwegian</div>
              </button>
              <button type="button" onClick={() => updateSetting('packing_language', 'en')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${settings.packing_language === 'en' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                <div className="font-medium">English</div><div className="text-xs text-muted-foreground">Engelsk</div>
              </button>
            </div>
          </div>

          {/* Table-specific settings */}
          {settings.packing_view_mode === 'table' && (
            <div className="border-t pt-4 space-y-6">
              <h4 className="text-sm font-medium flex items-center gap-2"><LayoutGrid className="h-4 w-4" />Tabell-innstillinger</h4>
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout & Størrelse</h5>
                <div className="space-y-2">
                  <Label>Radhøyde</Label>
                  <Select value={settings.table_row_height || 'touch'} onValueChange={(v) => updateSetting('table_row_height', v as 'compact' | 'normal' | 'touch')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Kompakt</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="touch">Touch-vennlig (anbefalt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fontstørrelse</Label>
                  <Select value={settings.table_font_size || '1.25rem'} onValueChange={(v) => updateSetting('table_font_size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.875rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem>
                      <SelectItem value="1.125rem">Litt større</SelectItem><SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Innhold</h5>
                <div className="flex items-center justify-between">
                  <div><Label>Vis kundenummer</Label></div>
                  <Switch checked={settings.table_show_customer_number ?? true} onCheckedChange={(v) => updateSetting('table_show_customer_number', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Vis antall ordrer</Label></div>
                  <Switch checked={settings.table_show_order_count ?? true} onCheckedChange={(v) => updateSetting('table_show_order_count', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Vis fremdriftsbar</Label></div>
                  <Switch checked={settings.table_show_progress_bar ?? true} onCheckedChange={(v) => updateSetting('table_show_progress_bar', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Vis status-kolonne</Label></div>
                  <Switch checked={settings.table_show_status ?? true} onCheckedChange={(v) => updateSetting('table_show_status', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Vis navigasjonspil</Label></div>
                  <Switch checked={settings.table_show_chevron ?? true} onCheckedChange={(v) => updateSetting('table_show_chevron', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Status-ikoner</Label></div>
                  <Switch checked={settings.table_show_status_icons ?? true} onCheckedChange={(v) => updateSetting('table_show_status_icons', v)} />
                </div>
                <div className="flex items-center justify-between border-t pt-4 mt-2">
                  <div><Label className="text-primary font-semibold">Klikkbar rad pakker produkt</Label><p className="text-xs text-muted-foreground">Marker produktet som pakket ved å klikke på hele raden</p></div>
                  <Switch checked={settings.table_row_click_to_pack ?? false} onCheckedChange={(v) => updateSetting('table_row_click_to_pack', v)} />
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header-innstillinger</h5>
                <ColorInput label="Header bakgrunnsfarge" value={settings.table_header_background_color || '#1e293b'} onChange={(v) => updateSetting('table_header_background_color', v)} />
                <ColorInput label="Header tekstfarge" value={settings.table_header_text_color || '#94a3b8'} onChange={(v) => updateSetting('table_header_text_color', v)} />
                <div className="space-y-2">
                  <Label>Header fontstørrelse</Label>
                  <Select value={settings.table_header_font_size || '0.875rem'} onValueChange={(v) => updateSetting('table_header_font_size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.75rem">Liten</SelectItem><SelectItem value="0.875rem">Normal</SelectItem>
                      <SelectItem value="1rem">Stor</SelectItem><SelectItem value="1.125rem">Ekstra stor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fontstørrelser</h5>
                <div className="space-y-2">
                  <Label>Kundenavn</Label>
                  <Select value={settings.table_customer_name_font_size || '1.125rem'} onValueChange={(v) => updateSetting('table_customer_name_font_size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1rem">Normal</SelectItem><SelectItem value="1.125rem">Litt større</SelectItem>
                      <SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem><SelectItem value="1.75rem">Veldig stor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Generell tabell-font</Label>
                  <Select value={settings.table_font_size || '1.125rem'} onValueChange={(v) => updateSetting('table_font_size', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.875rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem>
                      <SelectItem value="1.125rem">Litt større</SelectItem><SelectItem value="1.25rem">Stor</SelectItem><SelectItem value="1.5rem">Ekstra stor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kolonnebredder</h5>
                {settings.table_show_order_count && (
                  <div className="space-y-2">
                    <Label>Ordrer-kolonne</Label>
                    <Select value={settings.table_order_column_width || '9rem'} onValueChange={(v) => updateSetting('table_order_column_width', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7rem">Smal</SelectItem><SelectItem value="9rem">Normal</SelectItem>
                        <SelectItem value="11rem">Bred</SelectItem><SelectItem value="14rem">Ekstra bred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {settings.table_show_progress_bar && (
                  <div className="space-y-2">
                    <Label>Fremdrift-kolonne</Label>
                    <Select value={settings.table_progress_column_width || '14rem'} onValueChange={(v) => updateSetting('table_progress_column_width', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10rem">Smal</SelectItem><SelectItem value="14rem">Normal</SelectItem>
                        <SelectItem value="18rem">Bred</SelectItem><SelectItem value="22rem">Ekstra bred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {settings.table_show_status !== false && (
                  <div className="space-y-2">
                    <Label>Status-kolonne</Label>
                    <Select value={settings.table_status_column_width || '9rem'} onValueChange={(v) => updateSetting('table_status_column_width', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7rem">Smal</SelectItem><SelectItem value="9rem">Normal</SelectItem>
                        <SelectItem value="11rem">Bred</SelectItem><SelectItem value="14rem">Ekstra bred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Utseende</h5>
                <div className="flex items-center justify-between">
                  <div><Label>Fast header</Label><p className="text-xs text-muted-foreground">Header blir stående ved scrolling</p></div>
                  <Switch checked={settings.table_sticky_header ?? true} onCheckedChange={(v) => updateSetting('table_sticky_header', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Alternerende radfarger</Label></div>
                  <Switch checked={settings.table_alternate_rows ?? true} onCheckedChange={(v) => updateSetting('table_alternate_rows', v)} />
                </div>
                {settings.table_alternate_rows && (
                  <div className="pl-4 border-l-2 border-muted">
                    <ColorInput label="Alternativ radfarge" value={settings.table_alternate_row_color || '#f1f5f9'} onChange={(v) => updateSetting('table_alternate_row_color', v)} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div><Label>Hover-effekt</Label></div>
                  <Switch checked={settings.table_row_hover_effect ?? true} onCheckedChange={(v) => updateSetting('table_row_hover_effect', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>Touch-feedback</Label></div>
                  <Switch checked={settings.table_touch_tap_feedback ?? true} onCheckedChange={(v) => updateSetting('table_touch_tap_feedback', v)} />
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sortering</h5>
                <div className="flex items-center justify-between">
                  <div><Label>Ferdige varer til bunnen</Label></div>
                  <Switch checked={settings.customer_sort_completed_last ?? true} onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)} />
                </div>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Layout & Sortering */}
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
                <SelectItem value="1.5rem">Liten</SelectItem><SelectItem value="2rem">Normal</SelectItem>
                <SelectItem value="2.5rem">Stor</SelectItem><SelectItem value="3rem">Ekstra stor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mellomrom mellom kort</Label>
            <Select value={settings.gap_size} onValueChange={(v) => updateSetting('gap_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5rem">Liten</SelectItem><SelectItem value="1rem">Normal</SelectItem><SelectItem value="1.5rem">Stor</SelectItem>
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
                  <SelectItem value="name">Kundenavn</SelectItem><SelectItem value="progress">Fremdrift (%)</SelectItem><SelectItem value="customer_number">Kundenummer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sorteringsrekkefølge</Label>
              <Select value={settings.customer_sort_direction || 'asc'} onValueChange={(v) => updateSetting('customer_sort_direction', v as 'asc' | 'desc')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Stigende (A-Å, 0-100)</SelectItem><SelectItem value="desc">Synkende (Å-A, 100-0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Ferdige kunder nederst</Label></div>
              <Switch checked={settings.customer_sort_completed_last ?? true} onCheckedChange={(v) => updateSetting('customer_sort_completed_last', v)} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Tilbakeknapp */}
      <AccordionItem value="back-button" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Tilbakeknapp</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div><Label>Vis tilbakeknapp</Label><p className="text-xs text-muted-foreground">Viser tilbakepil i headeren</p></div>
            <Switch checked={settings.back_button_show ?? true} onCheckedChange={(v) => updateSetting('back_button_show', v)} />
          </div>
          {settings.back_button_show !== false && (
            <>
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Normal tilstand</h5>
                <div className="space-y-2">
                  <Label>Størrelse</Label>
                  <Select value={settings.back_button_size || 'large'} onValueChange={(v) => updateSetting('back_button_size', v as 'small' | 'medium' | 'large' | 'huge')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Liten</SelectItem><SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Stor</SelectItem><SelectItem value="huge">Ekstra stor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stil</Label>
                  <Select value={settings.back_button_style || 'icon'} onValueChange={(v) => updateSetting('back_button_style', v as 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icon">Kun ikon</SelectItem><SelectItem value="icon-circle">Ikon i sirkel</SelectItem>
                      <SelectItem value="icon-square">Ikon i firkant</SelectItem><SelectItem value="text">Kun tekst</SelectItem><SelectItem value="text-icon">Tekst og ikon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(settings.back_button_style === 'icon-circle' || settings.back_button_style === 'icon-square') && (
                  <ColorInput label="Bakgrunnsfarge" value={settings.back_button_background_color || '#ffffff'} onChange={(v) => updateSetting('back_button_background_color', v)} />
                )}
                <ColorInput label="Ikonfarge" value={settings.back_button_icon_color || ''} onChange={(v) => updateSetting('back_button_icon_color', v)} />
                {(settings.back_button_style === 'text' || settings.back_button_style === 'text-icon') && (
                  <div className="space-y-2">
                    <Label>Tekst</Label>
                    <Input value={settings.back_button_text || 'Tilbake'} onChange={(e) => updateSetting('back_button_text', e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-green-600 flex items-center gap-2"><Check className="h-3 w-3" />Ferdig-modus</h5>
                    <p className="text-xs text-muted-foreground mt-1">Når kunde er 100% pakket</p>
                  </div>
                  <Switch checked={settings.back_button_done_highlight ?? true} onCheckedChange={(v) => updateSetting('back_button_done_highlight', v)} />
                </div>
                {(settings.back_button_done_highlight ?? true) && (
                  <>
                    <div className="space-y-2">
                      <Label>Stil</Label>
                      <Select value={settings.back_button_done_style || 'text-icon'} onValueChange={(v) => updateSetting('back_button_done_style', v as 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="icon">Kun ikon</SelectItem><SelectItem value="icon-circle">Ikon i sirkel</SelectItem>
                          <SelectItem value="icon-square">Ikon i firkant</SelectItem><SelectItem value="text">Kun tekst</SelectItem><SelectItem value="text-icon">Tekst og ikon (anbefalt)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Størrelse</Label>
                      <Select value={settings.back_button_done_size || 'huge'} onValueChange={(v) => updateSetting('back_button_done_size', v as 'small' | 'medium' | 'large' | 'huge')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Liten</SelectItem><SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Stor</SelectItem><SelectItem value="huge">Ekstra stor (anbefalt)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tekst</Label>
                      <Input value={settings.back_button_done_text || 'Ferdig'} onChange={(e) => updateSetting('back_button_done_text', e.target.value)} placeholder="Ferdig" />
                    </div>
                    <ColorInput label="Bakgrunnsfarge" value={settings.back_button_done_background_color || '#22c55e'} onChange={(v) => updateSetting('back_button_done_background_color', v)} />
                    <ColorInput label="Tekst/ikon-farge" value={settings.back_button_done_icon_color || '#ffffff'} onChange={(v) => updateSetting('back_button_done_icon_color', v)} />
                    <div className="flex items-center justify-between">
                      <div><Label>Puls-animasjon</Label></div>
                      <Switch checked={settings.back_button_done_pulse_animation ?? true} onCheckedChange={(v) => updateSetting('back_button_done_pulse_animation', v)} />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
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
            <div><Label>Vis oppdateringsknapp</Label></div>
            <Switch checked={settings.refresh_button_show ?? true} onCheckedChange={(v) => updateSetting('refresh_button_show', v)} />
          </div>
          {settings.refresh_button_show !== false && (
            <>
              <div className="space-y-2">
                <Label>Størrelse</Label>
                <Select value={settings.refresh_button_size || 'medium'} onValueChange={(v) => updateSetting('refresh_button_size', v as 'small' | 'medium' | 'large' | 'huge')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Liten</SelectItem><SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Stor</SelectItem><SelectItem value="huge">Ekstra stor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stil</Label>
                <Select value={settings.refresh_button_style || 'icon'} onValueChange={(v) => updateSetting('refresh_button_style', v as 'icon' | 'icon-circle' | 'icon-square' | 'text' | 'text-icon')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icon">Kun ikon</SelectItem><SelectItem value="icon-circle">Ikon i sirkel</SelectItem>
                    <SelectItem value="icon-square">Ikon i firkant</SelectItem><SelectItem value="text">Kun tekst</SelectItem><SelectItem value="text-icon">Tekst og ikon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Pakkeknapp */}
      <AccordionItem value="pack-button" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Pakkeknapp</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Knapptekst</Label>
            <Input value={settings.pack_button_text || 'Pakket'} onChange={(e) => updateSetting('pack_button_text', e.target.value)} placeholder="Pakket" />
          </div>
          <ColorInput label="Bakgrunnsfarge" value={settings.pack_button_background_color || '#22c55e'} onChange={(v) => updateSetting('pack_button_background_color', v)} />
          <ColorInput label="Tekstfarge" value={settings.pack_button_text_color || '#ffffff'} onChange={(v) => updateSetting('pack_button_text_color', v)} />
          <div className="space-y-2">
            <Label>Størrelse</Label>
            <Select value={settings.pack_button_size || 'large'} onValueChange={(v) => updateSetting('pack_button_size', v as 'normal' | 'large' | 'huge')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem><SelectItem value="large">Stor</SelectItem><SelectItem value="huge">Ekstra stor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hjørneradius</Label>
            <Select value={settings.pack_button_border_radius || '0.5rem'} onValueChange={(v) => updateSetting('pack_button_border_radius', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25rem">Liten</SelectItem><SelectItem value="0.5rem">Normal</SelectItem>
                <SelectItem value="0.75rem">Stor</SelectItem><SelectItem value="9999px">Avrundet (pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis ikon</Label></div>
            <Switch checked={settings.pack_button_show_icon ?? true} onCheckedChange={(v) => updateSetting('pack_button_show_icon', v)} />
          </div>
          <div className="pt-3 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">Forhåndsvisning</Label>
            <Button className="gap-2 font-medium" style={{
              backgroundColor: settings.pack_button_background_color || '#22c55e',
              color: settings.pack_button_text_color || '#ffffff',
              borderRadius: settings.pack_button_border_radius || '0.5rem',
              height: settings.pack_button_size === 'huge' ? '4rem' : settings.pack_button_size === 'large' ? '3.5rem' : '3rem',
              padding: settings.pack_button_size === 'huge' ? '0 2rem' : settings.pack_button_size === 'large' ? '0 1.5rem' : '0 1rem',
              fontSize: settings.pack_button_size === 'huge' ? '1.25rem' : settings.pack_button_size === 'large' ? '1.125rem' : '1rem',
            }}>
              {(settings.pack_button_show_icon ?? true) && <Check className="h-5 w-5" />}
              {settings.pack_button_text || 'Pakket'}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Kundelåsing */}
      <AccordionItem value="locking" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Kundelåsing</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">Forhindrer at flere pakkere jobber med samme kunde samtidig</p>
          <div className="flex items-center justify-between">
            <div><Label>Aktiver låsing</Label></div>
            <Switch checked={settings.lock_enabled ?? true} onCheckedChange={(v) => updateSetting('lock_enabled', v)} />
          </div>
          {settings.lock_enabled !== false && (
            <>
              <div className="flex items-center justify-between">
                <div><Label>Vis låseindikator</Label></div>
                <Switch checked={settings.lock_show_indicator ?? true} onCheckedChange={(v) => updateSetting('lock_show_indicator', v)} />
              </div>
              {settings.lock_show_indicator && (
                <>
                  <div className="flex items-center justify-between">
                    <div><Label>Vis tekst i låsebadge</Label></div>
                    <Switch checked={settings.lock_show_locked_by_text ?? true} onCheckedChange={(v) => updateSetting('lock_show_locked_by_text', v)} />
                  </div>
                  {settings.lock_show_locked_by_text && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tekst "Din lås"</Label>
                        <Input value={settings.lock_locked_by_you_text || 'Din lås'} onChange={(e) => updateSetting('lock_locked_by_you_text', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tekst "Låst av andre"</Label>
                        <Input value={settings.lock_locked_by_other_text || 'Låst'} onChange={(e) => updateSetting('lock_locked_by_other_text', e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <ColorInput label="Farge 'Din lås'" value={settings.lock_my_lock_color || '#3b82f6'} onChange={(v) => updateSetting('lock_my_lock_color', v)} />
                    <ColorInput label="Farge 'Låst av andre'" value={settings.lock_other_lock_color || '#6b7280'} onChange={(v) => updateSetting('lock_other_lock_color', v)} />
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <div><Label>Fade låste kort</Label></div>
                <Switch checked={settings.lock_fade_locked_cards ?? true} onCheckedChange={(v) => updateSetting('lock_fade_locked_cards', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Blokker låste kort</Label></div>
                <Switch checked={settings.lock_block_locked_cards ?? true} onCheckedChange={(v) => updateSetting('lock_block_locked_cards', v)} />
              </div>
            </>
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
            <div><Label>Aktiver animasjoner</Label></div>
            <Switch checked={settings.animation_enabled} onCheckedChange={(v) => updateSetting('animation_enabled', v)} />
          </div>
          {settings.animation_enabled && (
            <>
              <div className="space-y-2">
                <Label>Animasjonshastighet</Label>
                <Select value={settings.animation_speed} onValueChange={(v) => updateSetting('animation_speed', v as 'fast' | 'normal' | 'slow')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Rask</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="slow">Langsom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Animasjon ved statusendring</Label></div>
                <Switch checked={settings.animation_on_status_change} onCheckedChange={(v) => updateSetting('animation_on_status_change', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Marker nylig oppdatert</Label></div>
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
            <div><Label>Vis tilkoblingsstatus</Label></div>
            <Switch checked={settings.realtime_show_connection_status} onCheckedChange={(v) => updateSetting('realtime_show_connection_status', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Vis siste oppdatering</Label></div>
            <Switch checked={settings.realtime_show_last_update} onCheckedChange={(v) => updateSetting('realtime_show_last_update', v)} />
          </div>
          <div className="space-y-2">
            <Label>Auto-oppdatering: hvert {settings.realtime_auto_refresh_interval}s</Label>
            <Slider value={[settings.realtime_auto_refresh_interval]} onValueChange={([v]) => updateSetting('realtime_auto_refresh_interval', v)} min={15} max={300} step={15} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Lyd ved ferdig pakket</Label></div>
            <Switch checked={settings.realtime_sound_on_complete} onCheckedChange={(v) => updateSetting('realtime_sound_on_complete', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Flash ved oppdatering</Label></div>
            <Switch checked={settings.realtime_flash_on_update} onCheckedChange={(v) => updateSetting('realtime_flash_on_update', v)} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Statustekst fontstørrelse</Label>
              <Select value={settings.realtime_status_font_size} onValueChange={(v) => updateSetting('realtime_status_font_size', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.75rem">Liten</SelectItem><SelectItem value="0.875rem">Normal</SelectItem>
                  <SelectItem value="1rem">Stor</SelectItem><SelectItem value="1.25rem">Ekstra stor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Produktkort */}
      <AccordionItem value="product-card" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Produktkort</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <ProductCardSettingsPanel settings={settings} updateSetting={updateSetting} />
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
            <div><Label>Vis fullskjerm-knapp</Label></div>
            <Switch checked={settings.fullscreen_button_visible ?? true} onCheckedChange={(v) => updateSetting('fullscreen_button_visible', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Hold skjermen våken</Label></div>
            <Switch checked={settings.wake_lock_enabled ?? true} onCheckedChange={(v) => updateSetting('wake_lock_enabled', v)} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
