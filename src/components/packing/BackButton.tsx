import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplaySettings } from '@/hooks/useDisplayOrders';
import { motion } from 'framer-motion';

interface BackButtonProps {
  settings: DisplaySettings;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  isCustomerDone?: boolean; // When customer is 100% packed
}

export function BackButton({ settings, onClick, disabled, className, isCustomerDone = false }: BackButtonProps) {
  const show = settings.back_button_show ?? true;
  
  // Use "done" settings when customer is complete and highlight is enabled
  const useDoneMode = isCustomerDone && (settings.back_button_done_highlight ?? true);
  
  const size = useDoneMode 
    ? (settings.back_button_done_size || settings.back_button_size || 'huge')
    : (settings.back_button_size || 'large');
  
  const style = useDoneMode 
    ? (settings.back_button_done_style || 'text-icon')
    : (settings.back_button_style || 'icon');
  
  const backgroundColor = useDoneMode 
    ? (settings.back_button_done_background_color || settings.completed_color || '#22c55e')
    : (settings.back_button_background_color || 'transparent');
  
  const iconColor = useDoneMode 
    ? (settings.back_button_done_icon_color || '#ffffff')
    : (settings.back_button_icon_color || settings.text_color);
  
  const text = useDoneMode 
    ? (settings.back_button_done_text || 'Ferdig')
    : (settings.back_button_text || 'Tilbake');
  
  const showPulse = useDoneMode && (settings.back_button_done_pulse_animation ?? true);

  if (!show) return null;

  // Size mappings - more generous for done mode
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

  const paddingSizes = {
    small: 'px-4 py-2',
    medium: 'px-5 py-2.5',
    large: 'px-6 py-3',
    huge: 'px-8 py-4',
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
        return cn(paddingSizes[size], textSizes[size], 'rounded-lg font-semibold');
      case 'text-icon':
        return cn(paddingSizes[size], 'gap-3', textSizes[size], 'rounded-lg font-semibold');
      default:
        return sizeClasses[size];
    }
  };

  const getBackgroundStyle = () => {
    const hasBackground = style === 'icon-circle' || style === 'icon-square' || style === 'text' || style === 'text-icon';
    
    if (useDoneMode || hasBackground) {
      return {
        backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
        color: iconColor,
        boxShadow: useDoneMode ? '0 4px 14px 0 rgba(0,0,0,0.25)' : undefined,
      };
    }
    return { color: iconColor };
  };

  // Choose icon based on mode
  const IconComponent = useDoneMode ? Check : ArrowLeft;

  const buttonContent = (
    <Button
      variant="ghost"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        getStyleClasses(),
        useDoneMode && 'hover:opacity-90 transition-all duration-200',
        className
      )}
      style={getBackgroundStyle()}
    >
      {style !== 'text' && <IconComponent className={iconSizes[size]} />}
      {(style === 'text' || style === 'text-icon') && <span>{text}</span>}
      {useDoneMode && style === 'text-icon' && <ArrowRight className={iconSizes[size]} />}
    </Button>
  );

  // Wrap with pulse animation if enabled
  if (showPulse) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ 
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(34, 197, 94, 0.4)',
            '0 0 0 10px rgba(34, 197, 94, 0)',
            '0 0 0 0 rgba(34, 197, 94, 0)'
          ]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'easeInOut'
        }}
        className="rounded-lg"
      >
        {buttonContent}
      </motion.div>
    );
  }

  return buttonContent;
}
