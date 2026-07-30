const LOCAL_STORAGE_KEY = 'MEME_SERVER_URL';

// Check if running in a native/Capacitor environment or standalone local webview
export function isCapacitorOrNative(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitorObject = !!(window as any).Capacitor;
  const isCapacitorProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
  const isLocalhostWebView = window.location.hostname === 'localhost' && window.location.port === '';
  return isCapacitorObject || isCapacitorProtocol || isLocalhostWebView;
}

// Get default deployment URL if available
export function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') return '';

  // Environment variable configured during build
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Standard web browser URL
  if (!isCapacitorOrNative() && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }

  // Fallback dev/prod server URL for Capacitor APK builds
  return 'https://ais-dev-klz53wq6h3cusoltv5ba4b-371092946513.europe-west2.run.app';
}

// Get the effective backend server URL for Socket.IO connection
export function getServerUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. User manual override saved in localStorage
  const customUrl = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  return getDefaultServerUrl();
}

// Save custom server URL to localStorage
export function setCustomServerUrl(url: string): void {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  if (cleanUrl) {
    localStorage.setItem(LOCAL_STORAGE_KEY, cleanUrl);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

// Reset server URL to default
export function resetCustomServerUrl(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}
