import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#f59e0b', '#22c55e', '#3b82f6',
  '#f8fafc', '#e2e8f0', '#94a3b8', '#64748b',
  '#1e293b', '#0f172a', '#000000', '#ffffff',
];

export function ColorPicker({ 
  label, 
  value, 
  onChange, 
  presets = DEFAULT_PRESETS 
}: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 h-10"
          >
            <div 
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: value }}
            />
            <span className="font-mono text-sm">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
            
            <div className="grid grid-cols-8 gap-1">
              {presets.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange(color)}
                  className={cn(
                    "w-6 h-6 rounded border transition-transform hover:scale-110",
                    value === color ? "ring-2 ring-primary ring-offset-1" : "border-border"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
