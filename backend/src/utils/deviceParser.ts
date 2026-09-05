export type BackendDeviceType = 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet';

export interface ParsedDeviceInfo {
  type: BackendDeviceType;
  name: string;
  emoji: string;
}

/**
 * Parses User-Agent header and client hints to determine device category, human-readable name, and emoji.
 */
export function parseDeviceInfo(
  userAgent?: string,
  clientDevice?: { type?: string; name?: string }
): ParsedDeviceInfo {
  // If client explicitly sent validated device details, prioritize them
  if (clientDevice?.type) {
    const rawType = clientDevice.type.trim();
    let normalizedType: BackendDeviceType = 'Desktop';
    let emoji = '💻';

    if (/tablet/i.test(rawType)) {
      normalizedType = 'Tablet';
      emoji = '📟';
    } else if (/mobile|phone/i.test(rawType)) {
      normalizedType = 'Mobile';
      emoji = '📱';
    } else if (/laptop/i.test(rawType)) {
      normalizedType = 'Laptop';
      emoji = '💻';
    } else {
      normalizedType = 'Desktop';
      emoji = '🖥️';
    }

    const name = clientDevice.name?.trim() || (normalizedType === 'Mobile' ? 'Mobile' : normalizedType);
    return { type: normalizedType, name, emoji };
  }

  const ua = userAgent || '';

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
      name: isIphone ? 'iPhone' : 'Mobile',
      emoji: '📱',
    };
  }

  // 3. Desktop vs Laptop Detection
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua);

  if (isMac) {
    return {
      type: 'Laptop',
      name: 'MacBook',
      emoji: '💻',
    };
  }

  if (isWindows) {
    return {
      type: 'Desktop',
      name: 'Desktop',
      emoji: '💻',
    };
  }

  if (isLinux) {
    return {
      type: 'Desktop',
      name: 'Desktop',
      emoji: '💻',
    };
  }

  return {
    type: 'Desktop',
    name: 'Desktop',
    emoji: '💻',
  };
}
