import { useState, useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  /** Total number of items to navigate */
  itemCount: number;
  /** Callback when Enter/Space is pressed on an item */
  onSelect?: (index: number) => void;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Wrap around when reaching edges */
  wrapAround?: boolean;
  /** Number of columns for grid navigation */
  columns?: number;
  /** Callback when D is pressed (deviation) */
  onDeviation?: (index: number) => void;
  /** Callback when U is pressed (undo) */
  onUndo?: (index: number) => void;
}

export interface KeyboardNavigationResult {
  /** Currently focused item index (-1 if none) */
  focusedIndex: number;
  /** Set focused index manually */
  setFocusedIndex: (index: number) => void;
  /** Check if an item is focused */
  isFocused: (index: number) => boolean;
  /** Get props to spread on navigable items */
  getItemProps: (index: number) => {
    tabIndex: number;
    'data-focused': boolean;
    'aria-selected': boolean;
    ref: (el: HTMLElement | null) => void;
  };
  /** Reset focus */
  resetFocus: () => void;
}

/**
 * Hook for keyboard navigation in packing views.
 * Supports arrow keys, Enter/Space for selection, Escape for back,
 * D for deviation, and U for undo.
 */
export function useKeyboardNavigation(
  options: KeyboardNavigationOptions
): KeyboardNavigationResult {
  const {
    itemCount,
    onSelect,
    onEscape,
    enabled = true,
    wrapAround = true,
    columns = 1,
    onDeviation,
    onUndo,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount) {
      const element = itemRefs.current.get(focusedIndex);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex, itemCount]);

  // Reset focus when item count changes significantly
  useEffect(() => {
    if (focusedIndex >= itemCount) {
      setFocusedIndex(itemCount > 0 ? itemCount - 1 : -1);
    }
  }, [itemCount, focusedIndex]);

  const moveUp = useCallback(() => {
    if (itemCount === 0) return;
    
    setFocusedIndex((current) => {
      if (current === -1) return 0;
      
      const newIndex = current - columns;
      if (newIndex < 0) {
        if (wrapAround) {
          // Calculate the equivalent position in the last row
          const lastRowStart = Math.floor((itemCount - 1) / columns) * columns;
          const targetIndex = lastRowStart + (current % columns);
          return Math.min(targetIndex, itemCount - 1);
        }
        return current;
      }
      return newIndex;
    });
  }, [itemCount, columns, wrapAround]);

  const moveDown = useCallback(() => {
    if (itemCount === 0) return;
    
    setFocusedIndex((current) => {
      if (current === -1) return 0;
      
      const newIndex = current + columns;
      if (newIndex >= itemCount) {
        if (wrapAround) {
          // Wrap to the first row, same column position
          return current % columns;
        }
        return current;
      }
      return newIndex;
    });
  }, [itemCount, columns, wrapAround]);

  const moveLeft = useCallback(() => {
    if (itemCount === 0) return;
    
    setFocusedIndex((current) => {
      if (current === -1) return 0;
      if (current === 0) return wrapAround ? itemCount - 1 : 0;
      return current - 1;
    });
  }, [itemCount, wrapAround]);

  const moveRight = useCallback(() => {
    if (itemCount === 0) return;
    
    setFocusedIndex((current) => {
      if (current === -1) return 0;
      if (current === itemCount - 1) return wrapAround ? 0 : itemCount - 1;
      return current + 1;
    });
  }, [itemCount, wrapAround]);

  const handleSelect = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount && onSelect) {
      onSelect(focusedIndex);
    }
  }, [focusedIndex, itemCount, onSelect]);

  const handleDeviation = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount && onDeviation) {
      onDeviation(focusedIndex);
    }
  }, [focusedIndex, itemCount, onDeviation]);

  const handleUndo = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount && onUndo) {
      onUndo(focusedIndex);
    }
  }, [focusedIndex, itemCount, onUndo]);

  // Keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input fields or textareas
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveUp();
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveDown();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveRight();
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleSelect();
          }
          break;
        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          } else {
            setFocusedIndex(-1);
          }
          break;
        case 'd':
        case 'D':
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleDeviation();
          }
          break;
        case 'u':
        case 'U':
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleUndo();
          }
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(itemCount > 0 ? 0 : -1);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount > 0 ? itemCount - 1 : -1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    focusedIndex,
    itemCount,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    handleSelect,
    handleDeviation,
    handleUndo,
    onEscape,
  ]);

  const isFocused = useCallback(
    (index: number) => focusedIndex === index,
    [focusedIndex]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      'data-focused': focusedIndex === index,
      'aria-selected': focusedIndex === index,
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
    [focusedIndex]
  );

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    isFocused,
    getItemProps,
    resetFocus,
  };
}
