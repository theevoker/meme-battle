export function isAiStudioEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.startsWith('ais-dev-') ||
    host.startsWith('ais-pre-') ||
    host.includes('ai.studio') ||
    host.includes('aistudio')
  );
}
