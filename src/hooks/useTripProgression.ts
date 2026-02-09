import { useState, useMemo, useCallback } from 'react';
import { CategoryTrip } from './useTrips';

interface TripStats {
  totalOrders: number;
  packedOrders: number;
  deviations: number;
}

interface UseTripProgressionOptions {
  trips: CategoryTrip[];
  getTripStats: (tripId: string) => TripStats;
}

export function useTripProgression({ trips, getTripStats }: UseTripProgressionOptions) {
  const [activeTripIndex, setActiveTripIndex] = useState(0);

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => a.sort_order - b.sort_order),
    [trips]
  );

  const activeTrip = sortedTrips[activeTripIndex] || null;
  const nextTrip = sortedTrips[activeTripIndex + 1] || null;
  const activeTripId = activeTrip?.id || null;

  const stats = useMemo(() => {
    if (!activeTripId) return { totalOrders: 0, packedOrders: 0, deviations: 0 };
    return getTripStats(activeTripId);
  }, [activeTripId, getTripStats]);

  const progress = stats.totalOrders > 0
    ? Math.round((stats.packedOrders / stats.totalOrders) * 100)
    : 0;

  const isComplete = stats.totalOrders > 0 && progress === 100;

  const allComplete = useMemo(() => {
    if (sortedTrips.length === 0) return false;
    return sortedTrips.every(trip => {
      const s = getTripStats(trip.id);
      return s.totalOrders > 0 && s.packedOrders === s.totalOrders;
    });
  }, [sortedTrips, getTripStats]);

  const allTripStats = useMemo(() => {
    return sortedTrips.map(trip => ({
      trip,
      ...getTripStats(trip.id),
    }));
  }, [sortedTrips, getTripStats]);

  const startNextTrip = useCallback(() => {
    if (nextTrip) {
      setActiveTripIndex(prev => prev + 1);
    }
  }, [nextTrip]);

  const goToTrip = useCallback((tripId: string) => {
    const index = sortedTrips.findIndex(t => t.id === tripId);
    if (index >= 0) {
      setActiveTripIndex(index);
    }
  }, [sortedTrips]);

  return {
    activeTripId,
    activeTrip,
    nextTrip,
    isComplete,
    allComplete,
    progress,
    stats,
    allTripStats,
    sortedTrips,
    activeTripIndex,
    totalTrips: sortedTrips.length,
    startNextTrip,
    goToTrip,
  };
}
