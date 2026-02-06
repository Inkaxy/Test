import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';

interface BackButtonProps {
  settings: DisplaySettings;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function BackButton({ settings, onClick, disabled, className }: BackButtonProps) {
  const show = settings.back_button_show ?? true;
  const size = settings.back_button_size || 'large';
  const style = settings.back_button_style || 'icon';
  const backgroundColor = settings.back_button_background_color || 'transparent';
  const iconColor = settings.back_button_icon_color || settings.text_color;
  const text = settings.back_button_text || 'Tilbake';

  if (!show) return null;

  // Size mappings
  const sizeClasses = {
    small: 'h-10 w-10',
    medium: 'h-12 w-12',
    large: 'h-14 w-14',
    huge: 'h-20 w-20',
  };

  const iconSizes = {
    small: 'h-5 w-5',
    medium: 'h-6 w-6',
    large: 'h-7 w-7',
    huge: 'h-10 w-10',
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
      {style !== 'text' && <ArrowLeft className={iconSizes[size]} />}
      {(style === 'text' || style === 'text-icon') && <span>{text}</span>}
    </Button>
  );
}
