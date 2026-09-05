import { UserState } from '../types/userState';

export const mockUserState: UserState = {
  userId: '',
  userName: '',
  lastVisitTimestamp: new Date().toISOString(),
  lastSeenDisplay: 'Just now',
  syncStatus: 'SYNCED',
  previousLoginAt: null,
  previousSessionAt: null,
  lastLogoutAt: null,
  currentDevice: {
    deviceId: 'dev_current',
    deviceName: 'Desktop',
    deviceType: 'Desktop',
    lastActive: 'Active Now',
    isCurrentDevice: true,
  },
  previousDevice: null,
  allDevices: [
    {
      deviceId: 'dev_current',
      deviceName: 'Desktop',
      deviceType: 'Desktop',
      lastActive: 'Active Now',
      isCurrentDevice: true,
    },
  ],
  cursor: {
    lastSeenSnapshotId: '',
    lastSeenTimestamp: new Date().toISOString(),
    lastAcknowledgedDigestId: undefined,
    unreadEventsCount: 0,
  },
  preferences: {
    minScoreThreshold: 50,
    emailDigestEnabled: true,
    autoAcknowledgeOnScroll: false,
  },
};
