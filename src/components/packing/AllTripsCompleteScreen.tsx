import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PartyPopper, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryTrip } from '@/hooks/useTrips';

interface TripStat {
  trip: CategoryTrip;
  totalOrders: number;
  packedOrders: number;
  deviations: number;
}

interface AllTripsCompleteScreenProps {
  tripStats: TripStat[];
  onBackToCalendar: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export function AllTripsCompleteScreen({
  tripStats,
  onBackToCalendar,
  backgroundColor,
  textColor,
}: AllTripsCompleteScreenProps) {
  const { t } = useTranslation();

  const totalPacked = tripStats.reduce((s, ts) => s + ts.packedOrders, 0);
  const totalDeviations = tripStats.reduce((s, ts) => s + ts.deviations, 0);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor, color: textColor }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8 max-w-lg"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <PartyPopper className="h-24 w-24 mx-auto text-success" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-bold"
        >
          {t('packing.allTripsComplete')}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          {/* Per-trip stats */}
          <div className="space-y-2">
            {tripStats.map((ts, i) => (
              <motion.div
                key={ts.trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ backgroundColor: `${textColor}10` }}
              >
                <span className="font-medium">{ts.trip.name}</span>
                <span className="opacity-80">
                  {ts.packedOrders} {t('packing.orders')}
                  {ts.deviations > 0 && (
                    <span className="text-destructive ml-2">
                      ({ts.deviations} {t('packing.deviation').toLowerCase()})
                    </span>
                  )}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="text-xl font-bold pt-2">
            {t('packing.totalPackedSummary', { count: totalPacked })}
            {totalDeviations > 0 && (
              <span className="text-destructive ml-2">
                ({totalDeviations} {t('packing.deviation').toLowerCase()})
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button
            size="lg"
            onClick={onBackToCalendar}
            className="h-16 px-12 text-xl gap-3"
          >
            <ArrowLeft className="h-5 w-5" />
            {t('packing.backToCalendar')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
