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
import { Type, Sparkles, LayoutGrid, Layout, Package, Check } from 'lucide-react';

interface Props {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function SharedDisplaySettingsPanel({ settings, updateSetting }: Props) {
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Switch checked={settings.card_show_customer_number} onCheckedChange={(v) => updateSetting('card_show_customer_number', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Vis produktliste</Label>
              <p className="text-xs text-muted-foreground">Vis liste over produkter</p>
            </div>
            <Switch checked={settings.card_show_product_list} onCheckedChange={(v) => updateSetting('card_show_product_list', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Vis produktnumre</Label>
              <p className="text-xs text-muted-foreground">Vis produktnummer ved navn</p>
            </div>
            <Switch checked={settings.card_show_product_numbers} onCheckedChange={(v) => updateSetting('card_show_product_numbers', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Vis antall som brett</Label>
              <p className="text-xs text-muted-foreground">Konverter stykker til brett</p>
            </div>
            <Switch checked={settings.card_show_quantity_as_trays} onCheckedChange={(v) => updateSetting('card_show_quantity_as_trays', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Vis fremdriftsbar under kort</Label>
              <p className="text-xs text-muted-foreground">Fargekoded bar i bunnen av hvert kundekort</p>
            </div>
            <Switch checked={settings.card_show_bottom_progress_bar ?? true} onCheckedChange={(v) => updateSetting('card_show_bottom_progress_bar', v)} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Ferdig pakket-visning */}
      <AccordionItem value="completed-state" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Ferdig pakket-visning</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Hvordan kundekort vises når kunden er 100% ferdig pakket.
          </p>

          <div className="flex items-center justify-between">
            <div>
              <Label>Vis ferdig-tilstand</Label>
              <p className="text-xs text-muted-foreground">Erstatt produktlisten med ferdig-tekst</p>
            </div>
            <Switch checked={settings.card_show_completed_text ?? true} onCheckedChange={(v) => updateSetting('card_show_completed_text', v)} />
          </div>

          {(settings.card_show_completed_text ?? true) && (
            <>
              <div className="space-y-2">
                <Label>Tekst</Label>
                <Input
                  value={settings.card_completed_text || 'FERDIG PAKKET'}
                  onChange={(e) => updateSetting('card_completed_text', e.target.value)}
                  placeholder="FERDIG PAKKET"
                />
              </div>

              <div className="space-y-2">
                <Label>Tekststørrelse</Label>
                <Select value={settings.card_completed_text_font_size || '1.5rem'} onValueChange={(v) => updateSetting('card_completed_text_font_size', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1rem">Liten</SelectItem>
                    <SelectItem value="1.25rem">Normal</SelectItem>
                    <SelectItem value="1.5rem">Stor</SelectItem>
                    <SelectItem value="2rem">Ekstra stor</SelectItem>
                    <SelectItem value="2.5rem">Veldig stor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ColorInput label="Bakgrunnsfarge" value={settings.card_completed_bg_color || '#22c55e'} onChange={(v) => updateSetting('card_completed_bg_color', v)} />
                <ColorInput label="Tekstfarge" value={settings.card_completed_text_color || '#ffffff'} onChange={(v) => updateSetting('card_completed_text_color', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Vis logo som watermark</Label>
                  <p className="text-xs text-muted-foreground">Loaf and Load-logo i bakgrunnen</p>
                </div>
                <Switch checked={settings.card_completed_show_logo ?? true} onCheckedChange={(v) => updateSetting('card_completed_show_logo', v)} />
              </div>

              {(settings.card_completed_show_logo ?? true) && (
                <div className="space-y-2">
                  <Label>Logo-gjennomsiktighet: {Math.round((settings.card_completed_logo_opacity ?? 0.15) * 100)}%</Label>
                  <Slider
                    value={[settings.card_completed_logo_opacity ?? 0.15]}
                    onValueChange={([v]) => updateSetting('card_completed_logo_opacity', v)}
                    min={0.05} max={0.4} step={0.05}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Animasjon</Label>
                <Select value={settings.card_completed_animation || 'fade'} onValueChange={(v) => updateSetting('card_completed_animation', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen</SelectItem>
                    <SelectItem value="fade">Fade inn</SelectItem>
                    <SelectItem value="scale">Skalering</SelectItem>
                    <SelectItem value="pulse">Pulsering (kontinuerlig)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Forhåndsvisning</h4>
                <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: settings.card_completed_bg_color || '#22c55e' }}>
                  <div className="text-center py-3 px-4 border-b" style={{ color: settings.card_completed_text_color || '#ffffff', borderColor: (settings.card_completed_text_color || '#ffffff') + '30' }}>
                    <h3 className="font-bold" style={{ fontSize: settings.card_customer_name_font_size || '1.5rem' }}>Eksempel Kunde</h3>
                  </div>
                  <div className="relative flex flex-col items-center justify-center py-8 overflow-hidden" style={{ color: settings.card_completed_text_color || '#ffffff' }}>
                    {(settings.card_completed_show_logo ?? true) && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: settings.card_completed_logo_opacity ?? 0.15 }}>
                        <div className="w-16 h-16 rounded-full bg-current" />
                      </div>
                    )}
                    <span className="relative font-bold tracking-wider z-10" style={{ fontSize: settings.card_completed_text_font_size || '1.5rem' }}>
                      {settings.card_completed_text || 'FERDIG PAKKET'}
                    </span>
                  </div>
                  <div className="h-2 w-full" style={{ backgroundColor: (settings.card_completed_text_color || '#ffffff') + '30' }}>
                    <div className="h-full w-full" style={{ backgroundColor: settings.completed_color }} />
                  </div>
                </div>
              </div>
            </>
          )}
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
          <div className="space-y-2">
            <Label>Antall kolonner: {settings.columns}</Label>
            <Slider
              value={[settings.columns]}
              onValueChange={([v]) => updateSetting('columns', v)}
              min={1} max={6} step={1}
            />
          </div>

          {/* Auto-scroll */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Auto-scroll</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aktiver auto-scroll</Label>
                <p className="text-xs text-muted-foreground">Rull automatisk gjennom innhold</p>
              </div>
              <Switch checked={settings.auto_scroll_enabled} onCheckedChange={(v) => updateSetting('auto_scroll_enabled', v)} />
            </div>

            {settings.auto_scroll_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Scroll-hastighet</Label>
                  <Select value={settings.auto_scroll_speed} onValueChange={(v) => updateSetting('auto_scroll_speed', v as 'slow' | 'medium' | 'fast')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Switch checked={settings.auto_scroll_pause_on_hover} onCheckedChange={(v) => updateSetting('auto_scroll_pause_on_hover', v)} />
                </div>
              </>
            )}
          </div>

          {/* Sortering */}
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
              <div>
                <Label>Ferdige kunder nederst</Label>
                <p className="text-xs text-muted-foreground">Flytt kunder med 100% til bunnen</p>
              </div>
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
          <p className="text-sm text-muted-foreground">
            Fargekoding av produktlinjer på storskjermen når produkter er valgt for pakking.
          </p>

          <div className="flex items-center justify-between">
            <div>
              <Label>Aktiver produktlinjefarger</Label>
              <p className="text-xs text-muted-foreground">Hver produktlinje får unik farge</p>
            </div>
            <Switch checked={settings.product_line_colors_enabled} onCheckedChange={(v) => updateSetting('product_line_colors_enabled', v)} />
          </div>

          {settings.product_line_colors_enabled && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {(settings.product_line_colors_palette || []).map((color, index) => (
                  <div key={index} className="space-y-1">
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
                    <p className="text-xs text-center text-muted-foreground">{index + 1}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => updateSetting('product_line_colors_palette', [...(settings.product_line_colors_palette || []), '#E5E7EB'])}>
                  + Legg til farge
                </Button>
                {(settings.product_line_colors_palette || []).length > 3 && (
                  <Button variant="outline" size="sm" onClick={() => updateSetting('product_line_colors_palette', (settings.product_line_colors_palette || []).slice(0, -1))}>
                    Fjern siste
                  </Button>
                )}
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Forhåndsvisning</h4>
                <div className="space-y-2">
                  {['Horten', 'Loff', 'Formloff'].map((name, index) => (
                    <div key={name} className="p-3 rounded-lg border flex items-center justify-between"
                      style={{ backgroundColor: (settings.product_line_colors_palette || [])[index % (settings.product_line_colors_palette || []).length] || '#E5E7EB' }}>
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
            <div>
              <Label>Hold skjermen våken</Label>
              <p className="text-xs text-muted-foreground">Forhindrer at skjermen slår seg av</p>
            </div>
            <Switch checked={settings.wake_lock_enabled ?? true} onCheckedChange={(v) => updateSetting('wake_lock_enabled', v)} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
