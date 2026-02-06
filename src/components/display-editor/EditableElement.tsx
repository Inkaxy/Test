import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EditableElementProps {
  id: string;
  label: string;
  isSelected: boolean;
  isHidden?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}

export function EditableElement({
  id,
  label,
  isSelected,
  isHidden = false,
  onSelect,
  children,
  className,
}: EditableElementProps) {
  if (isHidden) {
    return (
      <div 
        className={cn(
          "relative cursor-pointer opacity-30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-2",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div className="absolute -top-2 left-2 bg-muted px-1 text-xs text-muted-foreground rounded">
          {label} (skjult)
        </div>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "relative cursor-pointer transition-all duration-200 rounded-lg",
        isSelected 
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
          : "hover:ring-2 hover:ring-muted-foreground/50 hover:ring-offset-1",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      whileHover={{ scale: isSelected ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selection label */}
      {isSelected && (
        <motion.div 
          className="absolute -top-3 left-2 z-10 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium rounded shadow-sm"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {label}
        </motion.div>
      )}
      
      {children}
    </motion.div>
  );
}
