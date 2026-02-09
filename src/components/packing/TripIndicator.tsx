import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryTrip } from '@/hooks/useTrips';

interface TripIndicatorProps {
  activeTrip: CategoryTrip;
  activeTripIndex: number;
  totalTrips: number;
  progress: number;
  onPrevTrip?: () => void;
  onNextTrip?: () => void;
  textColor?: string;
  accentColor?: string;
}

export function TripIndicator({
  activeTrip,
  activeTripIndex,
  totalTrips,
  progress,
  onPrevTrip,
  onNextTrip,
  textColor,
  accentColor,
}: TripIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {totalTrips > 1 && onPrevTrip && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevTrip}
          disabled={activeTripIndex === 0}
          className="h-8 w-8"
          style={{ color: textColor }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-center gap-2">
        <Badge
          className="text-sm px-3 py-1"
          style={{ backgroundColor: accentColor || 'hsl(var(--primary))', color: '#fff' }}
        >
          {activeTrip.name}
        </Badge>
        {totalTrips > 1 && (
          <span className="text-sm opacity-70" style={{ color: textColor }}>
            {t('packing.tripOf', { current: activeTripIndex + 1, total: totalTrips })}
          </span>
        )}
      </div>

      {totalTrips > 1 && onNextTrip && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextTrip}
          disabled={activeTripIndex >= totalTrips - 1}
          className="h-8 w-8"
          style={{ color: textColor }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
