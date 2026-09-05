export type DeviceType = 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet';

export interface DeviceInfo {
  type: DeviceType;
  name: string;
  emoji: string;
}

export function getDeviceEmoji(type?: string): string {
  if (!type) return '💻';
  const lower = type.toLowerCase();
  if (lower.includes('tablet') || lower.includes('ipad')) return '📟';
  if (lower.includes('mobile') || lower.includes('phone') || lower.includes('iphone')) return '📱';
  if (lower.includes('laptop') || lower.includes('macbook')) return '💻';
  return '🖥️';
}

export function detectCurrentDevice(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { type: 'Desktop', name: 'Desktop', emoji: '🖥️' };
  }

  const ua = navigator.userAgent;

  // 1. Tablet Detection
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    const isIpad = /ipad/i.test(ua);
    return {
      type: 'Tablet',
      name: isIpad ? 'iPad' : 'Tablet',
      emoji: '📟',
    };
  }

  // 2. Mobile Detection
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    const isIphone = /iPhone/i.test(ua);
    return {
      type: 'Mobile',
      name: isIphone ? 'iPhone' : 'Mobile Phone',
      emoji: '📱',
    };
  }

  // 3. Desktop vs Laptop Detection
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows/i.test(ua);

  if (navigator.maxTouchPoints > 0 && !isWindows) {
    return {
      type: 'Laptop',
      name: isMac ? 'MacBook' : 'Laptop',
      emoji: '💻',
    };
  }

  return {
    type: 'Desktop',
    name: 'Desktop',
    emoji: '🖥️',
  };
}
