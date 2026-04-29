import { RESPONSIBLE_USE_NOTICE_VERSION } from './responsibleUseConfig';

export const RESPONSIBLE_USE_NOTICE_ACCEPTANCE_CHANGED_EVENT =
  'daily-encounter-mobile-companion:responsible-use-notice-acceptance-changed';

const STORAGE_KEY = 'daily-encounter-mobile-companion.responsible-use-notice';

export interface ResponsibleUseNoticeAcceptance {
  version: string;
  acceptedAt: string;
}

const getStorage = () => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const dispatchChanged = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(RESPONSIBLE_USE_NOTICE_ACCEPTANCE_CHANGED_EVENT));
};

export const normalizeResponsibleUseNoticeAcceptance = (
  value: unknown,
): ResponsibleUseNoticeAcceptance | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    typeof (value as { version?: unknown }).version !== 'string' ||
    typeof (value as { acceptedAt?: unknown }).acceptedAt !== 'string'
  ) {
    return null;
  }

  return value as ResponsibleUseNoticeAcceptance;
};

export const getResponsibleUseNoticeAcceptance = () => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    return rawValue ? normalizeResponsibleUseNoticeAcceptance(JSON.parse(rawValue)) : null;
  } catch {
    return null;
  }
};

export const hasAcceptedResponsibleUseNotice = (
  version = RESPONSIBLE_USE_NOTICE_VERSION,
) => getResponsibleUseNoticeAcceptance()?.version === version;

export const markResponsibleUseNoticeAccepted = (
  version = RESPONSIBLE_USE_NOTICE_VERSION,
  acceptedAt = new Date().toISOString(),
) => {
  const storage = getStorage();
  const acceptance: ResponsibleUseNoticeAcceptance = { version, acceptedAt };

  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(acceptance));
    dispatchChanged();
  }

  return acceptance;
};

export const clearResponsibleUseNoticeAcceptance = () => {
  const storage = getStorage();

  if (storage) {
    storage.removeItem(STORAGE_KEY);
    dispatchChanged();
  }
};
