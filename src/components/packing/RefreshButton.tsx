import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';

interface RefreshButtonProps {
  settings: DisplaySettings;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function RefreshButton({ settings, onClick, disabled, className }: RefreshButtonProps) {
  const show = settings.refresh_button_show ?? true;
  const size = settings.refresh_button_size || 'medium';
  const style = settings.refresh_button_style || 'icon';
  const backgroundColor = settings.refresh_button_background_color || 'transparent';
  const iconColor = settings.refresh_button_icon_color || settings.text_color;
  const text = settings.refresh_button_text || 'Oppdater';

  if (!show) return null;

  // Size mappings
  const sizeClasses = {
    small: 'h-10 w-10',
    medium: 'h-12 w-12',
    large: 'h-14 w-14',
    huge: 'h-20 w-20',
  };

  const iconSizes = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
    huge: 'h-8 w-8',
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    huge: 'text-2xl',
  };

  // Style-specific classes
  const getStyleClasses = () => {
    switch (style) {
      case 'icon':
        return sizeClasses[size];
      case 'icon-circle':
        return cn(sizeClasses[size], 'rounded-full');
      case 'icon-square':
        return cn(sizeClasses[size], 'rounded-lg');
      case 'text':
        return cn('px-4 py-2', textSizes[size]);
      case 'text-icon':
        return cn('px-4 py-2 gap-2', textSizes[size]);
      default:
        return sizeClasses[size];
    }
  };

  const getBackgroundStyle = () => {
    if (style === 'icon-circle' || style === 'icon-square') {
      return {
        backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
        color: iconColor,
      };
    }
    return { color: iconColor };
  };

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(getStyleClasses(), className)}
      style={getBackgroundStyle()}
    >
      {style !== 'text' && <RefreshCw className={iconSizes[size]} />}
      {(style === 'text' || style === 'text-icon') && <span>{text}</span>}
    </Button>
  );
}
