import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Monitor,
  Plus,
  Search,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Settings,
  Zap,
} from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { useUserTenants } from '@/hooks/useTenant';
import type { Device } from '@/types/kioskos/device';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

function DeviceCard({ device, onClick }: { device: Device; onClick: () => void }) {
  const lastSeenText = device.last_seen
    ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: nb })
    : 'Aldri sett';

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Screenshot placeholder */}
        <div className="mb-3 flex aspect-video items-center justify-center rounded-md bg-muted">
          {device.is_online ? (
            <div className="text-center text-xs text-muted-foreground">
              <Monitor className="mx-auto mb-1 h-8 w-8" />
              Live preview
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              <WifiOff className="mx-auto mb-1 h-8 w-8" />
              Offline
            </div>
          )}
        </div>

        {/* Device info */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  device.is_online ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="truncate font-medium">{device.name}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {device.is_online ? device.current_url || 'Ingen URL' : `Sist sett ${lastSeenText}`}
            </p>
          </div>
        </div>

        {/* Status row */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {device.battery_level != null && (
            <span className="flex items-center gap-1">
              {device.is_charging ? (
                <BatteryCharging className="h-3 w-3" />
              ) : (
                <Battery className="h-3 w-3" />
              )}
              {device.battery_level}%
            </span>
          )}
          {device.model && (
            <span className="truncate">{device.model}</span>
          )}
          {device.tags.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {device.tags[0]}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FleetDeck() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tenants, isLoading: tenantsLoading } = useUserTenants();
  const activeTenant = tenants?.[0]; // Use first tenant for now
  const { data: devices, isLoading: devicesLoading } = useDevices(activeTenant?.id);

  const isLoading = tenantsLoading || devicesLoading;

  const filteredDevices = devices?.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const onlineCount = devices?.filter((d) => d.is_online).length ?? 0;
  const totalCount = devices?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FleetDeck</h1>
          <p className="text-muted-foreground">
            {activeTenant?.name ?? 'Mine enheter'}
            {!isLoading && (
              <span className="ml-2">
                ({onlineCount}/{totalCount} online)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/fleet/billing')} className="gap-2">
            <Zap className="h-4 w-4" />
            {activeTenant?.plan === 'free' ? 'Oppgrader' : 'Abonnement'}
          </Button>
          <Button onClick={() => navigate('/fleet/add-device')} className="gap-2">
            <Plus className="h-4 w-4" />
            Legg til enhet
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Sok etter enheter..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt enheter</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-500">{onlineCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-500">{totalCount - onlineCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold capitalize">{activeTenant?.plan ?? 'free'}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-3 aspect-video w-full rounded-md" />
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDevices && filteredDevices.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => navigate(`/fleet/device/${device.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">
              {searchQuery ? 'Ingen enheter funnet' : 'Ingen enheter enda'}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? 'Prov a endre soket ditt'
                : 'Legg til din forste kiosk-enhet for a komme i gang'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/fleet/add-device')} className="gap-2">
                <Plus className="h-4 w-4" />
                Legg til enhet
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
