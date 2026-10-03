import {
  LayoutDashboard,
  ListOrdered,
  BellRing,
  History,
  TrendingUp,
  LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  id: 'dashboard' | 'watchlist' | 'feed' | 'memory' | 'highlights';
  name: string;
  shortLabel: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

/**
 * Single source of truth for the application main navigation order.
 * Order:
 * 1. Dashboard
 * 2. Watchlist
 * 3. Attention Feed
 * 4. Market Memory
 * 5. Market Highlights
 */
export const MAIN_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    shortLabel: 'Home',
    path: '/',
    icon: LayoutDashboard,
    description: 'Unified command center and personalized market delta summary',
  },
  {
    id: 'watchlist',
    name: 'Watchlist',
    shortLabel: 'Watchlist',
    path: '/watchlist',
    icon: ListOrdered,
    description: 'Monitored portfolio equities with causal delta insights',
  },
  {
    id: 'feed',
    name: 'Attention Feed',
    shortLabel: 'Feed',
    path: '/feed',
    icon: BellRing,
    description: 'Actionable real-time catalysts and events requiring investor attention',
  },
  {
    id: 'memory',
    name: 'Market Memory',
    shortLabel: 'Memory',
    path: '/memory',
    icon: History,
    description: 'Personal repository of saved and archived market events.',
  },
  {
    id: 'highlights',
    name: 'Market Highlights',
    shortLabel: 'Highlights',
    path: '/highlights',
    icon: TrendingUp,
    description: 'Autonomous market intelligence hub.',
  },
] as const;
