export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET' | 'Desktop' | 'Laptop' | 'Mobile' | 'Tablet';

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  lastActive: string;
  isCurrentDevice: boolean;
}

export interface SessionCursor {
  lastSeenSnapshotId: string;
  lastSeenTimestamp: string;
  lastAcknowledgedDigestId?: string;
  unreadEventsCount: number;
}

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE';

export interface UserState {
  userId: string;
  userName: string;
  lastVisitTimestamp: string;
  lastSeenDisplay: string; // e.g. "Yesterday at 4:30 PM (16 hrs ago)"
  lastLoginAt?: string | null;
  previousLoginAt?: string | null;
  previousSessionAt?: string | null;
  lastLogoutAt?: string | null;
  currentDevice: DeviceSession;
  previousDevice?: DeviceSession | null;
  allDevices: DeviceSession[];
  cursor: SessionCursor;
  syncStatus: SyncStatus;
  preferences: {
    minScoreThreshold: number;
    emailDigestEnabled: boolean;
    autoAcknowledgeOnScroll: boolean;
  };
}
