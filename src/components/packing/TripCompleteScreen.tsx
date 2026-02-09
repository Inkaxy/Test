import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { CategoryTrip } from '@/hooks/useTrips';

interface TripCompleteScreenProps {
  currentTrip: CategoryTrip;
  nextTrip: CategoryTrip;
  packedOrders: number;
  deviations: number;
  onStartNext: () => void;
  onBackToOverview: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export function TripCompleteScreen({
  currentTrip,
  nextTrip,
  packedOrders,
  deviations,
  onStartNext,
  onBackToOverview,
  backgroundColor,
  textColor,
}: TripCompleteScreenProps) {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor, color: textColor }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-8 max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle2 className="h-24 w-24 mx-auto text-success" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-bold"
        >
          {t('packing.tripComplete', { name: currentTrip.name })}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-2 text-xl opacity-80"
        >
          <p>{t('packing.tripPackedCount', { count: packedOrders })}</p>
          {deviations > 0 && (
            <p className="text-destructive">
              {t('packing.tripDeviationCount', { count: deviations })}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4 pt-4"
        >
          <Button
            size="lg"
            onClick={onStartNext}
            className="h-16 px-12 text-xl w-full"
          >
            {t('packing.startNextTrip', { name: nextTrip.name })}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onBackToOverview}
            className="gap-2 text-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            {t('packing.backToOverview')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
