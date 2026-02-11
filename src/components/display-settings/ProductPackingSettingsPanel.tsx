import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { ColorInput } from './ColorInput';
import { ThemePresetMenu, ThemePreset } from '@/components/display-editor/ThemePresetMenu';
import { Sparkles, Package, Table2, Zap, Check } from 'lucide-react';

interface Props {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function ProductPackingSettingsPanel({ settings, updateSetting }: Props) {
  return (
    <Accordion type="multiple" defaultValue={['pp-theme']} className="space-y-2">
      {/* Tema og farger */}
      <AccordionItem value="pp-theme" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Tema og farger</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div>
              <Label className="text-base font-semibold">Match felles display</Label>
              <p className="text-xs text-muted-foreground">Arv tema og statusfarger fra Felles Display automatisk</p>
            </div>
            <Switch checked={settings.match_shared_display_theme ?? true} onCheckedChange={(v) => updateSetting('match_shared_display_theme', v)} />
          </div>

          {settings.match_shared_display_theme ? (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              Farger synkroniseres automatisk med Felles Display. Endre farger der for å oppdatere begge.
            </div>
          ) : (
            <>
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
                <div className="grid grid-cols-2 gap-3 mt-2">
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
            </>
          )}

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

      {/* Produktlinje-farger */}
      <AccordionItem value="pp-product-colors" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Produktlinje-farger</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
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

      {/* Tabell-utseende */}
      <AccordionItem value="pp-table" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Table2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Tabell-utseende</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Radhøyde</Label>
            <Select value={settings.table_row_height || 'touch'} onValueChange={(v) => updateSetting('table_row_height', v as 'compact' | 'normal' | 'touch')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Kompakt</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="touch">Touch-vennlig (anbefalt)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Generell fontstørrelse</Label>
            <Select value={settings.table_font_size || '1.25rem'} onValueChange={(v) => updateSetting('table_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1rem">Liten</SelectItem>
                <SelectItem value="1.25rem">Normal</SelectItem>
                <SelectItem value="1.5rem">Stor</SelectItem>
                <SelectItem value="1.75rem">Ekstra stor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kundenavn fontstørrelse</Label>
            <Select value={settings.table_customer_name_font_size || '1.125rem'} onValueChange={(v) => updateSetting('table_customer_name_font_size', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1rem">Normal</SelectItem>
                <SelectItem value="1.125rem">Litt større</SelectItem>
                <SelectItem value="1.25rem">Stor</SelectItem>
                <SelectItem value="1.5rem">Ekstra stor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div><Label>Alternerende radfarger</Label><p className="text-xs text-muted-foreground">Zebra-striping for lesbarhet</p></div>
              <Switch checked={settings.table_alternate_rows ?? true} onCheckedChange={(v) => updateSetting('table_alternate_rows', v)} />
            </div>
            {settings.table_alternate_rows && (
              <div className="pl-4 border-l-2 border-muted">
                <ColorInput label="Alternativ radfarge" value={settings.table_alternate_row_color || '#f1f5f9'} onChange={(v) => updateSetting('table_alternate_row_color', v)} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Kantstil</Label>
            <Select value={settings.table_border_style || 'subtle'} onValueChange={(v) => updateSetting('table_border_style', v as 'none' | 'subtle' | 'full')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen</SelectItem>
                <SelectItem value="subtle">Subtil</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Kolonnebredder</h4>
            <div className="space-y-2">
              <Label>Ordrer-kolonne</Label>
              <Select value={settings.table_order_column_width || '9rem'} onValueChange={(v) => updateSetting('table_order_column_width', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7rem">Smal</SelectItem>
                  <SelectItem value="9rem">Normal</SelectItem>
                  <SelectItem value="11rem">Bred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status-kolonne</Label>
              <Select value={settings.table_status_column_width || '9rem'} onValueChange={(v) => updateSetting('table_status_column_width', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7rem">Smal</SelectItem>
                  <SelectItem value="9rem">Normal</SelectItem>
                  <SelectItem value="11rem">Bred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Touch og interaksjon */}
      <AccordionItem value="pp-touch" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Touch og interaksjon</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div><Label>Klikkbare rader for pakking</Label><p className="text-xs text-muted-foreground">Trykk på rad for å markere som pakket</p></div>
            <Switch checked={settings.table_row_click_to_pack ?? false} onCheckedChange={(v) => updateSetting('table_row_click_to_pack', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Touch tap-feedback</Label><p className="text-xs text-muted-foreground">Visuell respons ved trykk</p></div>
            <Switch checked={settings.table_touch_tap_feedback ?? true} onCheckedChange={(v) => updateSetting('table_touch_tap_feedback', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Rad hover-effekt</Label><p className="text-xs text-muted-foreground">Fremhev rad ved musepeker</p></div>
            <Switch checked={settings.table_row_hover_effect ?? true} onCheckedChange={(v) => updateSetting('table_row_hover_effect', v)} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">Mengdevisning</h4>
            <div className="space-y-2">
              <Label>Størrelse</Label>
              <Select value={settings.table_quantity_display_size || 'large'} onValueChange={(v) => updateSetting('table_quantity_display_size', v as 'small' | 'medium' | 'large' | 'huge')}>
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
              <Select value={settings.table_quantity_border_style || 'outline'} onValueChange={(v) => updateSetting('table_quantity_border_style', v as 'none' | 'outline' | 'filled')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen</SelectItem>
                  <SelectItem value="outline">Kantlinje</SelectItem>
                  <SelectItem value="filled">Fylt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ColorInput label="Tekstfarge" value={settings.table_quantity_text_color || '#3b82f6'} onChange={(v) => updateSetting('table_quantity_text_color', v)} />
            {(settings.table_quantity_border_style === 'filled' || settings.table_quantity_border_style === 'outline') && (
              <ColorInput label="Bakgrunnsfarge" value={settings.table_quantity_background_color || '#3b82f630'} onChange={(v) => updateSetting('table_quantity_background_color', v)} />
            )}
          </div>
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div><Label>Vis brett-format (kv + stk)</Label><p className="text-xs text-muted-foreground">Konverter antall til brett og stykker</p></div>
              <Switch checked={settings.card_show_quantity_as_trays ?? false} onCheckedChange={(v) => updateSetting('card_show_quantity_as_trays', v)} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Ferdig pakket-visning */}
      <AccordionItem value="pp-completed" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Ferdig pakket-visning</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div><Label>Vis ferdig-tilstand</Label><p className="text-xs text-muted-foreground">Spesiell visning når produkt er 100% pakket</p></div>
            <Switch checked={settings.card_show_completed_text ?? true} onCheckedChange={(v) => updateSetting('card_show_completed_text', v)} />
          </div>
          {(settings.card_show_completed_text ?? true) && (
            <>
              <div className="space-y-2">
                <Label>Ferdig-tekst</Label>
                <Input value={settings.card_completed_text || 'FERDIG PAKKET'} onChange={(e) => updateSetting('card_completed_text', e.target.value)} placeholder="FERDIG PAKKET" />
              </div>
              <ColorInput label="Bakgrunnsfarge" value={settings.card_completed_bg_color || '#22c55e'} onChange={(v) => updateSetting('card_completed_bg_color', v)} />
              <ColorInput label="Tekstfarge" value={settings.card_completed_text_color || '#ffffff'} onChange={(v) => updateSetting('card_completed_text_color', v)} />
              <div className="flex items-center justify-between">
                <div><Label>Vis logo watermark</Label><p className="text-xs text-muted-foreground">Svakt logo-watermark bak teksten</p></div>
                <Switch checked={settings.card_completed_show_logo ?? true} onCheckedChange={(v) => updateSetting('card_completed_show_logo', v)} />
              </div>
              <div className="space-y-2">
                <Label>Animasjon</Label>
                <Select value={settings.card_completed_animation || 'fade'} onValueChange={(v) => updateSetting('card_completed_animation', v as 'none' | 'fade' | 'scale' | 'pulse')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen</SelectItem>
                    <SelectItem value="fade">Fade inn</SelectItem>
                    <SelectItem value="scale">Skalering</SelectItem>
                    <SelectItem value="pulse">Pulsering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Forhåndsvisning</h4>
                <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: settings.card_completed_bg_color || '#22c55e' }}>
                  <div className="relative flex flex-col items-center justify-center py-8 overflow-hidden" style={{ color: settings.card_completed_text_color || '#ffffff' }}>
                    {(settings.card_completed_show_logo ?? true) && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.15 }}>
                        <div className="w-16 h-16 rounded-full bg-current" />
                      </div>
                    )}
                    <span className="relative font-bold tracking-wider z-10" style={{ fontSize: '1.5rem' }}>
                      {settings.card_completed_text || 'FERDIG PAKKET'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
