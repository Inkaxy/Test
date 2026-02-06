import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DisplaySettings, DisplayType } from '@/hooks/useDisplayOrders';
import { useEditorState } from './useEditorState';
import { EditorCanvas } from './EditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import { ElementInspector } from './ElementInspector';
import { FloatingColorPicker } from './FloatingColorPicker';
import { THEME_PRESETS } from './types';

interface VisualDisplayEditorProps {
  initialSettings: DisplaySettings;
  displayType: DisplayType;
  categoryId: string | null;
  bakeryName?: string;
  categoryName?: string;
  onSave: (settings: DisplaySettings) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

export function VisualDisplayEditor({
  initialSettings,
  displayType,
  categoryId,
  bakeryName,
  categoryName,
  onSave,
  onClose,
  isSaving = false,
}: VisualDisplayEditorProps) {
  const {
    state,
    updateSetting,
    selectElement,
    undo,
    redo,
    canUndo,
    canRedo,
    applyThemePreset,
    resetSettings,
    markAsSaved,
    discardChanges,
  } = useEditorState(initialSettings);

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape - deselect or close
      if (e.key === 'Escape') {
        if (state.selectedElement) {
          selectElement(null);
        } else {
          onClose();
        }
        return;
      }

      // Cmd/Ctrl + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (state.isDirty) {
          handleSave();
        }
        return;
      }

      // Cmd/Ctrl + Z - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z - Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Number keys 1-6 for columns
      if (['1', '2', '3', '4', '5', '6'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        updateSetting('columns', parseInt(e.key));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElement, state.isDirty, undo, redo, selectElement, updateSetting, onClose]);

  const handleSave = useCallback(async () => {
    await onSave(state.settings);
    markAsSaved();
  }, [state.settings, onSave, markAsSaved]);

  const handleDiscard = useCallback(() => {
    discardChanges();
  }, [discardChanges]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Color configuration for floating picker
  const colorConfig = [
    { key: 'background_color', label: 'Bakgrunn', value: state.settings.background_color },
    { key: 'card_background_color', label: 'Kortbakgrunn', value: state.settings.card_background_color },
    { key: 'text_color', label: 'Tekstfarge', value: state.settings.text_color },
    { key: 'completed_color', label: 'Ferdig', value: state.settings.completed_color },
    { key: 'pending_color', label: 'Venter', value: state.settings.pending_color },
    { key: 'packing_color', label: 'Pakkes', value: state.settings.packing_color },
  ];

  const handleColorChange = (key: string, value: string) => {
    updateSetting(key as keyof DisplaySettings, value);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-card/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold">Visuell redigering</h2>
              <p className="text-xs text-muted-foreground">
                Klikk på elementer for å redigere • Dobbeltklikk for å redigere tekst
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {state.isDirty && (
              <span className="text-xs text-primary font-medium">
                Ulagrede endringer
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating color picker on left side */}
      <FloatingColorPicker
        colors={colorConfig}
        onChange={handleColorChange}
        position="left"
      />

      {/* Main content */}
      <div className="flex h-full pt-14 pb-20">
        {/* Canvas */}
        <div className="flex-1 overflow-auto pl-16">
          <EditorCanvas
            settings={state.settings}
            selectedElement={state.selectedElement}
            onSelectElement={selectElement}
            onSettingsChange={(updates) => {
              Object.entries(updates).forEach(([key, value]) => {
                updateSetting(key as keyof DisplaySettings, value);
              });
            }}
            bakeryName={bakeryName}
            categoryName={categoryName}
            onReorderCustomers={() => {}}
          />
        </div>

        {/* Inspector panel */}
        <AnimatePresence>
          {state.selectedElement && (
            <ElementInspector
              selectedElement={state.selectedElement}
              settings={state.settings}
              onUpdateSetting={updateSetting}
              onClose={() => selectElement(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating toolbar */}
      <EditorToolbar
        settings={state.settings}
        isDirty={state.isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onReset={resetSettings}
        onApplyTheme={applyThemePreset}
        onUpdateSetting={updateSetting}
      />
    </motion.div>
  );
}
