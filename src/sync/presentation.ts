export const DESKTOP_CONNECTIVITY_ERROR_MESSAGE =
  'Could not reach the desktop app. Make sure your device is on the same WiFi network as the desktop computer, and that the desktop app is running.';

const CONNECTIVITY_ERROR_PATTERNS = [
  'could not reach desktop server',
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'timeout',
  'timed out',
  'connection refused',
  'econnrefused',
];

export const isDesktopConnectivityError = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }

  const normalizedValue = value.toLocaleLowerCase();
  return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => normalizedValue.includes(pattern));
};

export const toFriendlySyncErrorMessage = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  return isDesktopConnectivityError(value) ? DESKTOP_CONNECTIVITY_ERROR_MESSAGE : value;
};

export const toFriendlySyncErrorFromList = (values: string[]) => {
  if (values.length === 0) {
    return null;
  }

  const connectivityError = values.find((value) => isDesktopConnectivityError(value));
  return connectivityError
    ? DESKTOP_CONNECTIVITY_ERROR_MESSAGE
    : values.map((value) => value.trim()).filter(Boolean).join(' ');
};
