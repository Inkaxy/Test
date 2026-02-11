export type DeviceCommandAction =
  | 'loadUrl'
  | 'setBrightness'
  | 'screenOn'
  | 'screenOff'
  | 'speak'
  | 'restart'
  | 'screenshot'
  | 'updateConfig';

export interface DeviceCommandBase {
  action: DeviceCommandAction;
  params: Record<string, unknown>;
}

export interface LoadUrlCommand extends DeviceCommandBase {
  action: 'loadUrl';
  params: { url: string };
}

export interface SetBrightnessCommand extends DeviceCommandBase {
  action: 'setBrightness';
  params: { level: number };
}

export interface ScreenOnCommand extends DeviceCommandBase {
  action: 'screenOn';
  params: Record<string, never>;
}

export interface ScreenOffCommand extends DeviceCommandBase {
  action: 'screenOff';
  params: Record<string, never>;
}

export interface SpeakCommand extends DeviceCommandBase {
  action: 'speak';
  params: { text: string; language?: string };
}

export interface RestartCommand extends DeviceCommandBase {
  action: 'restart';
  params: Record<string, never>;
}

export interface TakeScreenshotCommand extends DeviceCommandBase {
  action: 'screenshot';
  params: Record<string, never>;
}

export interface UpdateConfigCommand extends DeviceCommandBase {
  action: 'updateConfig';
  params: Record<string, unknown>;
}

export type DeviceCommand =
  | LoadUrlCommand
  | SetBrightnessCommand
  | ScreenOnCommand
  | ScreenOffCommand
  | SpeakCommand
  | RestartCommand
  | TakeScreenshotCommand
  | UpdateConfigCommand;

export function createCommand(action: 'loadUrl', params: { url: string }): LoadUrlCommand;
export function createCommand(action: 'setBrightness', params: { level: number }): SetBrightnessCommand;
export function createCommand(action: 'screenOn'): ScreenOnCommand;
export function createCommand(action: 'screenOff'): ScreenOffCommand;
export function createCommand(action: 'speak', params: { text: string; language?: string }): SpeakCommand;
export function createCommand(action: 'restart'): RestartCommand;
export function createCommand(action: 'screenshot'): TakeScreenshotCommand;
export function createCommand(action: 'updateConfig', params: Record<string, unknown>): UpdateConfigCommand;
export function createCommand(action: DeviceCommandAction, params?: Record<string, unknown>): DeviceCommand {
  return { action, params: params || {} } as DeviceCommand;
}

export function getCommandEndpoint(action: DeviceCommandAction): string {
  const endpoints: Record<DeviceCommandAction, string> = {
    loadUrl: 'browser/load',
    setBrightness: 'screen/brightness',
    screenOn: 'screen/on',
    screenOff: 'screen/off',
    speak: 'tts/speak',
    restart: 'device/restart',
    screenshot: 'device/screenshot',
    updateConfig: 'config',
  };
  return endpoints[action];
}
