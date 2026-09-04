import { UserState } from '../types/userState';

export const mockUserState: UserState = {
  userId: '',
  userName: '',
  lastVisitTimestamp: '2026-09-03T16:30:00Z',
  lastSeenDisplay: 'Yesterday at 4:30 PM (16 hrs ago)',
  syncStatus: 'SYNCED',
  currentDevice: {
    deviceId: 'dev_macbook_pro_01',
    deviceName: 'MacBook Pro (Workstation)',
    deviceType: 'DESKTOP',
    lastActive: 'Active Now',
    isCurrentDevice: true,
  },
  allDevices: [
    {
      deviceId: 'dev_macbook_pro_01',
      deviceName: 'MacBook Pro (Workstation)',
      deviceType: 'DESKTOP',
      lastActive: 'Active Now',
      isCurrentDevice: true,
    },
    {
      deviceId: 'dev_iphone_15_02',
      deviceName: 'iPhone 15 Pro (Mobile)',
      deviceType: 'MOBILE',
      lastActive: 'Today at 1:30 PM (4 hrs ago)',
      isCurrentDevice: false,
    },
    {
      deviceId: 'dev_ipad_air_03',
      deviceName: 'iPad Air (Tablet)',
      deviceType: 'TABLET',
      lastActive: 'Sep 13 at 9:15 PM',
      isCurrentDevice: false,
    },
  ],
  cursor: {
    lastSeenSnapshotId: 'snap_20260903_163000',
    lastSeenTimestamp: '2026-09-03T16:30:00Z',
    lastAcknowledgedDigestId: 'digest_2026_09_10',
    unreadEventsCount: 3,
  },
  preferences: {
    minScoreThreshold: 50,
    emailDigestEnabled: true,
    autoAcknowledgeOnScroll: false,
  },
};
