import React from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableSectionProps {
  id: string;
  children: React.ReactNode;
  isDragEnabled?: boolean;
  className?: string;
}

export function DraggableSection({
  id,
  children,
  isDragEnabled = true,
  className,
}: DraggableSectionProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={dragControls}
      className={cn('relative group', className)}
    >
      {isDragEnabled && (
        <motion.div
          className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border shadow-sm"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      )}
      
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {children}
      </motion.div>
    </Reorder.Item>
  );
}
