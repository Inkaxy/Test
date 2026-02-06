import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FloatingColorPickerProps {
  colors: {
    key: string;
    label: string;
    value: string;
  }[];
  onChange: (key: string, value: string) => void;
  position?: 'left' | 'right';
}

const QUICK_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#f59e0b', '#22c55e', '#3b82f6',
  '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b',
  '#1e293b', '#0f172a', '#000000', '#ffffff',
];

export function FloatingColorPicker({
  colors,
  onChange,
  position = 'left',
}: FloatingColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeColorKey, setActiveColorKey] = useState<string | null>(null);

  return (
    <motion.div
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-30",
        position === 'left' ? "left-4" : "right-4"
      )}
      initial={{ opacity: 0, x: position === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex flex-col gap-2">
        {/* Toggle button */}
        <Button
          variant={isOpen ? "default" : "secondary"}
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Paintbrush className="h-5 w-5" />
        </Button>

        {/* Color swatches */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col gap-2 p-2 bg-card rounded-lg shadow-xl border"
            >
              {colors.map((color, index) => (
                <Popover
                  key={color.key}
                  open={activeColorKey === color.key}
                  onOpenChange={(open) => setActiveColorKey(open ? color.key : null)}
                >
                  <PopoverTrigger asChild>
                    <motion.button
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 relative group",
                        activeColorKey === color.key 
                          ? "ring-2 ring-primary ring-offset-2" 
                          : "border-border"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {/* Tooltip */}
                      <span className={cn(
                        "absolute whitespace-nowrap text-xs bg-popover text-popover-foreground px-2 py-1 rounded shadow-lg",
                        "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                        position === 'left' ? "left-full ml-2" : "right-full mr-2"
                      )}>
                        {color.label}
                      </span>
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side={position === 'left' ? 'right' : 'left'} 
                    className="w-56"
                    sideOffset={10}
                  >
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{color.label}</p>
                      
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={color.value}
                          onChange={(e) => onChange(color.key, e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={color.value}
                          onChange={(e) => onChange(color.key, e.target.value)}
                          className="flex-1 font-mono text-sm"
                          placeholder="#000000"
                        />
                      </div>
                      
                      <div className="grid grid-cols-8 gap-1">
                        {QUICK_COLORS.map((quickColor) => (
                          <button
                            key={quickColor}
                            onClick={() => onChange(color.key, quickColor)}
                            className={cn(
                              "w-5 h-5 rounded border transition-transform hover:scale-110",
                              color.value === quickColor 
                                ? "ring-2 ring-primary ring-offset-1" 
                                : "border-border"
                            )}
                            style={{ backgroundColor: quickColor }}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
