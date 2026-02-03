import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface TypeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmWord?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  variant?: 'destructive' | 'warning';
}

export function TypeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord = 'JA',
  onConfirm,
  isLoading = false,
  variant = 'destructive',
}: TypeConfirmDialogProps) {
  const [inputValue, setInputValue] = React.useState('');
  
  const isConfirmed = inputValue.toUpperCase() === confirmWord.toUpperCase();
  
  const handleConfirm = async () => {
    if (!isConfirmed) return;
    await onConfirm();
    setInputValue('');
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInputValue('');
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              variant === 'destructive' ? 'bg-destructive/10' : 'bg-warning/10'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                variant === 'destructive' ? 'text-destructive' : 'text-warning'
              }`} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-input">
            Skriv <span className="font-bold text-destructive">{confirmWord}</span> for å bekrefte
          </Label>
          <Input
            id="confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Skriv ${confirmWord} her...`}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bekreft sletting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
