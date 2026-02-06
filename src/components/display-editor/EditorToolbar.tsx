import React from 'react';
import { motion } from 'framer-motion';
import { 
  Undo2, Redo2, Save, X, RotateCcw, 
  Palette, LayoutGrid, Sun, Moon, Contrast, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { THEME_PRESETS } from './types';
import { ColorPicker } from './ColorPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditorToolbarProps {
  settings: DisplaySettings;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  onApplyTheme: (theme: keyof typeof THEME_PRESETS) => void;
  onUpdateSetting: <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => void;
}

export function EditorToolbar({
  settings,
  isDirty,
  canUndo,
  canRedo,
  isSaving,
  onUndo,
  onRedo,
  onSave,
  onDiscard,
  onReset,
  onApplyTheme,
  onUpdateSetting,
}: EditorToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-card border border-border rounded-full shadow-2xl px-4 py-2 flex items-center gap-2">
        <TooltipProvider delayDuration={300}>
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-9 w-9 rounded-full"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Angre (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-9 w-9 rounded-full"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gjør om (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Theme presets */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={settings.theme_preset === 'dark' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => onApplyTheme('dark')}
                  className="h-9 w-9 rounded-full"
                >
                  <Moon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mørkt tema</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={settings.theme_preset === 'light' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => onApplyTheme('light')}
                  className="h-9 w-9 rounded-full"
                >
                  <Sun className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lyst tema</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={settings.theme_preset === 'high-contrast' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => onApplyTheme('high-contrast')}
                  className="h-9 w-9 rounded-full"
                >
                  <Contrast className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Høy kontrast</TooltipContent>
            </Tooltip>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Quick colors */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="center" side="top">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Hurtigfarger</Label>
                <ColorPicker
                  label="Bakgrunn"
                  value={settings.background_color}
                  onChange={(v) => onUpdateSetting('background_color', v)}
                />
                <ColorPicker
                  label="Kort"
                  value={settings.card_background_color}
                  onChange={(v) => onUpdateSetting('card_background_color', v)}
                />
                <ColorPicker
                  label="Tekst"
                  value={settings.text_color}
                  onChange={(v) => onUpdateSetting('text_color', v)}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Layout */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="center" side="top">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Kolonner: {settings.columns}</Label>
                  <Slider
                    value={[settings.columns]}
                    onValueChange={([v]) => onUpdateSetting('columns', v)}
                    min={1}
                    max={6}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Mellomrom: {settings.gap_size}</Label>
                  <Slider
                    value={[parseFloat(settings.gap_size)]}
                    onValueChange={([v]) => onUpdateSetting('gap_size', `${v}rem`)}
                    min={0}
                    max={3}
                    step={0.25}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Reset */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-9 w-9 rounded-full"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tilbakestill til standard</TooltipContent>
          </Tooltip>
          
          <Separator orientation="vertical" className="h-6" />
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={!isDirty}
              className="rounded-full"
            >
              <X className="h-4 w-4 mr-1" />
              Forkast
            </Button>
            
            <Button
              size="sm"
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="rounded-full"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Lagrer...' : 'Lagre'}
            </Button>
          </div>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
