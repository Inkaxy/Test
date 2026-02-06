import { useState, useCallback, useEffect } from 'react';
import { DisplaySettings, getDefaultDisplaySettings } from '@/hooks/useDisplayOrders';
import { EditorState, THEME_PRESETS } from './types';

const MAX_HISTORY_LENGTH = 50;

export function useEditorState(initialSettings?: DisplaySettings) {
  const [state, setState] = useState<EditorState>({
    settings: initialSettings || getDefaultDisplaySettings(),
    selectedElement: null,
    isDirty: false,
    history: [initialSettings || getDefaultDisplaySettings()],
    historyIndex: 0,
  });

  // Sync with external settings changes
  useEffect(() => {
    if (initialSettings && !state.isDirty) {
      setState(prev => ({
        ...prev,
        settings: initialSettings,
        history: [initialSettings],
        historyIndex: 0,
      }));
    }
  }, [initialSettings]);

  const updateSetting = useCallback(<K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K]
  ) => {
    setState(prev => {
      const newSettings = { ...prev.settings, [key]: value };
      
      // Add to history (remove any future states if we're not at the end)
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newSettings);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        newHistory.shift();
      }

      return {
        ...prev,
        settings: newSettings,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const updateMultipleSettings = useCallback((updates: Partial<DisplaySettings>) => {
    setState(prev => {
      const newSettings = { ...prev.settings, ...updates };
      
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newSettings);
      
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        newHistory.shift();
      }

      return {
        ...prev,
        settings: newSettings,
        isDirty: true,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const selectElement = useCallback((elementId: string | null) => {
    setState(prev => ({ ...prev, selectedElement: elementId }));
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;
      
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        settings: prev.history[newIndex],
        historyIndex: newIndex,
        isDirty: newIndex !== 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        settings: prev.history[newIndex],
        historyIndex: newIndex,
        isDirty: true,
      };
    });
  }, []);

  const applyThemePreset = useCallback((preset: keyof typeof THEME_PRESETS) => {
    const themeSettings = THEME_PRESETS[preset];
    updateMultipleSettings({
      ...themeSettings,
      theme_preset: preset,
    });
  }, [updateMultipleSettings]);

  const resetSettings = useCallback(() => {
    const defaults = getDefaultDisplaySettings();
    setState(prev => ({
      ...prev,
      settings: defaults,
      isDirty: true,
      history: [...prev.history.slice(0, prev.historyIndex + 1), defaults],
      historyIndex: prev.historyIndex + 1,
    }));
  }, []);

  const markAsSaved = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: false }));
  }, []);

  const discardChanges = useCallback(() => {
    if (state.history.length > 0) {
      setState(prev => ({
        ...prev,
        settings: prev.history[0],
        isDirty: false,
        historyIndex: 0,
      }));
    }
  }, [state.history]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    updateSetting,
    updateMultipleSettings,
    selectElement,
    undo,
    redo,
    canUndo,
    canRedo,
    applyThemePreset,
    resetSettings,
    markAsSaved,
    discardChanges,
  };
}
