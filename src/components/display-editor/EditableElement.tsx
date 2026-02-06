import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';

interface EditableElementProps {
  id: string;
  label: string;
  isSelected: boolean;
  isHidden?: boolean;
  isEditable?: boolean;
  isEditing?: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function EditableElement({
  id,
  label,
  isSelected,
  isHidden = false,
  isEditable = false,
  isEditing = false,
  onSelect,
  onDoubleClick,
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
        isEditing && "ring-2 ring-primary",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (isEditable && onDoubleClick) {
          onDoubleClick();
        }
      }}
      whileHover={{ scale: isSelected && !isEditing ? 1.02 : 1 }}
      whileTap={{ scale: isEditing ? 1 : 0.98 }}
    >
      {/* Selection label with edit indicator */}
      {isSelected && (
        <motion.div 
          className="absolute -top-3 left-2 z-10 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium rounded shadow-sm flex items-center gap-1"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {label}
          {isEditable && !isEditing && (
            <Pencil className="h-3 w-3 opacity-70" />
          )}
        </motion.div>
      )}
      
      {/* Edit hint tooltip */}
      {isSelected && isEditable && !isEditing && (
        <motion.div 
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 bg-muted text-muted-foreground px-2 py-0.5 text-[10px] rounded whitespace-nowrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Dobbeltklikk for å redigere
        </motion.div>
      )}
      
      {children}
    </motion.div>
  );
}
