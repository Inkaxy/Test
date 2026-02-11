import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Battery,
  BatteryCharging,
  Globe,
  Lightbulb,
  Monitor,
  MonitorOff,
  RefreshCw,
  Send,
  Volume2,
  Wifi,
  WifiOff,
  Trash2,
  Settings,
} from 'lucide-react';
import { useDevice, useDeviceEvents, useDeleteDevice } from '@/hooks/useDevices';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { DeviceEvent } from '@/types/kioskos/device';

function EventRow({ event }: { event: DeviceEvent }) {
  const typeLabels: Record<string, string> = {
    provisioned: 'Provisjonert',
    screen_on: 'Skjerm pa',
    screen_off: 'Skjerm av',
    url_changed: 'URL endret',
    motion_detected: 'Bevegelse',
    battery_update: 'Batteri',
    config_updated: 'Konfig oppdatert',
    app_updated: 'App oppdatert',
    error: 'Feil',
    restart: 'Omstart',
    online: 'Online',
    offline: 'Offline',
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {typeLabels[event.event_type] || event.event_type}
        </Badge>
        {event.payload && Object.keys(event.payload).length > 0 && (
          <span className="text-xs text-muted-foreground">
            {JSON.stringify(event.payload).slice(0, 80)}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {format(new Date(event.created_at), 'HH:mm:ss', { locale: nb })}
      </span>
    </div>
  );
}

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: device, isLoading } = useDevice(deviceId);
  const { data: events, isLoading: eventsLoading } = useDeviceEvents(deviceId);
  const controls = useDeviceControl(deviceId || '');
  const deleteDeviceMutation = useDeleteDevice();

  const [urlInput, setUrlInput] = useState('');
  const [speakInput, setSpeakInput] = useState('');
  const [brightness, setBrightness] = useState<number[]>([128]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="mb-2 text-xl font-medium">Enhet ikke funnet</h2>
        <Button variant="outline" onClick={() => navigate('/fleet')}>
          Tilbake til FleetDeck
        </Button>
      </div>
    );
  }

  const handleLoadUrl = async () => {
    if (!urlInput.trim()) return;
    await controls.loadUrl(urlInput.trim());
    toast({ title: 'URL sendt', description: urlInput });
    setUrlInput('');
  };

  const handleSpeak = async () => {
    if (!speakInput.trim()) return;
    await controls.speak(speakInput.trim());
    toast({ title: 'Tale sendt', description: speakInput });
    setSpeakInput('');
  };

  const handleBrightnessChange = async (value: number[]) => {
    setBrightness(value);
    await controls.setBrightness(value[0]);
  };

  const handleDelete = async () => {
    if (!confirm(`Er du sikker pa at du vil fjerne "${device.name}"?`)) return;
    await deleteDeviceMutation.mutateAsync(device.id);
    toast({ title: 'Enhet fjernet' });
    navigate('/fleet');
  };

  const lastSeenText = device.last_seen
    ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: nb })
    : 'Aldri';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fleet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{device.name}</h1>
            <Badge variant={device.is_online ? 'default' : 'destructive'}>
              {device.is_online ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {device.model} {device.android_version ? `(Android ${device.android_version})` : ''}
          </p>
        </div>
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Live preview placeholder */}
      <Card>
        <CardContent className="flex aspect-video items-center justify-center rounded-lg bg-muted p-0">
          {device.is_online ? (
            <div className="text-center text-muted-foreground">
              <Monitor className="mx-auto mb-2 h-16 w-16" />
              <p className="text-sm">Live Preview</p>
              <p className="text-xs">
                {device.current_url || 'Ingen URL lastet'}
              </p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <WifiOff className="mx-auto mb-2 h-16 w-16" />
              <p className="text-sm">Enheten er offline</p>
              <p className="text-xs">Sist sett {lastSeenText}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* URL control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Endre URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
            />
            <Button
              onClick={handleLoadUrl}
              disabled={!urlInput.trim() || controls.isLoading}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
          {device.current_url && (
            <p className="mt-2 text-xs text-muted-foreground">
              Navaerende: {device.current_url}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brightness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Lysstyrke
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Slider
              value={brightness}
              onValueChange={setBrightness}
              onValueCommit={handleBrightnessChange}
              max={255}
              min={0}
              step={1}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {Math.round((brightness[0] / 255) * 100)}%
            </p>
          </CardContent>
        </Card>

        {/* TTS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4" />
              Si noe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Skriv tekst..."
                value={speakInput}
                onChange={(e) => setSpeakInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSpeak()}
              />
              <Button
                size="icon"
                onClick={handleSpeak}
                disabled={!speakInput.trim() || controls.isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Screen & Restart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Kontroller
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => controls.screenOn()}
              disabled={controls.isLoading}
              className="gap-1"
            >
              <Monitor className="h-3 w-3" />
              Skjerm pa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => controls.screenOff()}
              disabled={controls.isLoading}
              className="gap-1"
            >
              <MonitorOff className="h-3 w-3" />
              Skjerm av
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => controls.restart()}
              disabled={controls.isLoading}
              className="gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Omstart
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Device info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enhetsinfo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {device.is_online ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {device.is_online ? 'Online' : `Offline (${lastSeenText})`}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Batteri</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {device.is_charging ? (
                <BatteryCharging className="h-3 w-3" />
              ) : (
                <Battery className="h-3 w-3" />
              )}
              {device.battery_level != null ? `${device.battery_level}%` : 'Ukjent'}
              {device.is_charging && ' (lader)'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Modell</p>
            <p className="text-sm text-muted-foreground">{device.model || 'Ukjent'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">App-versjon</p>
            <p className="text-sm text-muted-foreground">{device.app_version || 'Ukjent'}</p>
          </div>
          {device.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-1">
                {device.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hendelser</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="divide-y">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Ingen hendelser registrert
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
