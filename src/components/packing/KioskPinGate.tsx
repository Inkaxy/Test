import { useState, useEffect, useCallback } from 'react';
import { Loader2, Lock, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KioskPinGateProps {
  bakeryShortId: string;
  bakeryName?: string;
  children: React.ReactNode;
}

type GateState = 'checking' | 'pin_required' | 'granted';

export function KioskPinGate({ bakeryShortId, bakeryName, children }: KioskPinGateProps) {
  const [state, setState] = useState<GateState>('checking');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [validating, setValidating] = useState(false);

  const storageKey = `kiosk-pin-verified-${bakeryShortId}`;

  const validatePin = useCallback(async (pinToValidate: string, isStored = false) => {
    setValidating(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-kiosk-pin', {
        body: { bakery_short_id: bakeryShortId, pin: pinToValidate },
      });

      if (fnError) throw fnError;

      if (data?.no_pin) {
        setState('granted');
        return;
      }

      if (data?.valid) {
        localStorage.setItem(storageKey, 'true');
        setState('granted');
      } else {
        if (isStored) {
          localStorage.removeItem(storageKey);
        }
        setError(true);
        setPin('');
        setState('pin_required');
      }
    } catch (err) {
      console.error('PIN validation error:', err);
      // On error, allow access to avoid locking users out
      setState('granted');
    } finally {
      setValidating(false);
    }
  }, [bakeryShortId, storageKey]);

  // Initial check
  useEffect(() => {
    const checkPin = async () => {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') {
        // Re-validate stored approval
        await validatePin('__stored__', true);
      } else {
        // Check if PIN is even required
        try {
          const { data } = await supabase.functions.invoke('validate-kiosk-pin', {
            body: { bakery_short_id: bakeryShortId, pin: '' },
          });
          if (data?.no_pin) {
            setState('granted');
          } else {
            setState('pin_required');
          }
        } catch {
          setState('granted');
        }
      }
    };
    checkPin();
  }, [bakeryShortId, storageKey, validatePin]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'granted') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          {bakeryName && (
            <h1 className="text-2xl font-bold">{bakeryName}</h1>
          )}
          <p className="text-muted-foreground text-lg">Tast inn pinkode</p>
        </div>

        {/* PIN dots */}
        <motion.div
          className="flex gap-4"
          animate={error ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all duration-200',
                i < pin.length
                  ? error
                    ? 'bg-destructive border-destructive'
                    : 'bg-primary border-primary'
                  : 'border-muted-foreground/40'
              )}
            />
          ))}
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-destructive text-base font-medium"
            >
              Feil pinkode
            </motion.p>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <Button
              key={digit}
              variant="outline"
              className="h-16 text-2xl font-semibold"
              onClick={() => handleDigit(digit)}
              disabled={validating}
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="h-16 text-base"
            onClick={handleClear}
            disabled={validating || pin.length === 0}
          >
            Slett
          </Button>
          <Button
            variant="outline"
            className="h-16 text-2xl font-semibold"
            onClick={() => handleDigit('0')}
            disabled={validating}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-16"
            onClick={handleDelete}
            disabled={validating || pin.length === 0}
          >
            <Delete className="h-6 w-6" />
          </Button>
        </div>

        {validating && (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        )}
      </motion.div>
    </div>
  );
}
