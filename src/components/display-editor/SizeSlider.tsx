import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SizeSliderProps {
  label: string;
  value: string; // e.g., "1.5rem"
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  presets?: { label: string; value: string }[];
}

export function SizeSlider({
  label,
  value,
  onChange,
  min = 0.5,
  max = 4,
  step = 0.125,
  unit = 'rem',
  presets,
}: SizeSliderProps) {
  // Parse numeric value from string like "1.5rem"
  const numericValue = parseFloat(value) || 1;
  
  const handleSliderChange = (values: number[]) => {
    onChange(`${values[0]}${unit}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-mono text-muted-foreground">{value}</span>
      </div>
      
      <Slider
        value={[numericValue]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              variant={value === preset.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onChange(preset.value)}
              className="h-6 px-2 text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Common presets for font sizes
export const FONT_SIZE_PRESETS = [
  { label: 'XS', value: '0.75rem' },
  { label: 'S', value: '0.875rem' },
  { label: 'M', value: '1rem' },
  { label: 'L', value: '1.25rem' },
  { label: 'XL', value: '1.5rem' },
  { label: '2XL', value: '1.875rem' },
  { label: '3XL', value: '2.25rem' },
];
