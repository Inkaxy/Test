import React, { useState, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ResizableElementProps {
  children: React.ReactNode;
  isSelected: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  onResize?: (dimensions: { width?: number; height?: number }) => void;
  className?: string;
  showHandles?: boolean;
}

export function ResizableElement({
  children,
  isSelected,
  minWidth = 100,
  maxWidth = 800,
  minHeight = 50,
  maxHeight = 600,
  onResize,
  className,
  showHandles = true,
}: ResizableElementProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback(
    (info: PanInfo, direction: 'width' | 'height' | 'both') => {
      const deltaX = info.delta.x;
      const deltaY = info.delta.y;

      if (onResize) {
        const updates: { width?: number; height?: number } = {};
        if (direction === 'width' || direction === 'both') {
          updates.width = deltaX;
        }
        if (direction === 'height' || direction === 'both') {
          updates.height = deltaY;
        }
        onResize(updates);
      }
    },
    [onResize]
  );

  return (
    <div className={cn('relative', className)}>
      {children}
      
      {isSelected && showHandles && (
        <>
          {/* Right edge handle */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-8 bg-primary rounded cursor-ew-resize z-20 opacity-0 hover:opacity-100 transition-opacity"
            drag="x"
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => setIsDragging(true)}
            onDrag={(_, info) => handleDrag(info, 'width')}
            onDragEnd={() => setIsDragging(false)}
          />
          
          {/* Bottom edge handle */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-3 bg-primary rounded cursor-ns-resize z-20 opacity-0 hover:opacity-100 transition-opacity"
            drag="y"
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => setIsDragging(true)}
            onDrag={(_, info) => handleDrag(info, 'height')}
            onDragEnd={() => setIsDragging(false)}
          />
          
          {/* Corner handle */}
          <motion.div
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize z-20 opacity-0 hover:opacity-100 transition-opacity"
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => setIsDragging(true)}
            onDrag={(_, info) => handleDrag(info, 'both')}
            onDragEnd={() => setIsDragging(false)}
          />
        </>
      )}
      
      {/* Visual indicator when dragging */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary rounded pointer-events-none z-10" />
      )}
    </div>
  );
}
