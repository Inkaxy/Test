import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export const ColorInput = ({ label, value, onChange }: ColorInputProps) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
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
      />
    </div>
  </div>
);
