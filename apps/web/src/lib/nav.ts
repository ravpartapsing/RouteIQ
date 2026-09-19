/** Sidebar structure from the design doc §2. `phase` marks what is not built yet. */
export interface NavItem {
  path: string;
  label: string;
  icon: string;
  phase?: number;
  /** Hidden entirely when the named feature switch is off. */
  feature?: 'maps';
}

export const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'OPERATIONS',
    items: [
      { path: '/', label: 'Dashboard', icon: '▦' },
      { path: '/orders', label: 'Orders', icon: '▤', phase: 3 },
      { path: '/dispatch', label: 'Dispatch Board', icon: '⇄', phase: 4 },
      { path: '/live-map', label: 'Live Map', icon: '◎', feature: 'maps' },
    ],
  },
  {
    section: 'FLEET',
    items: [
      { path: '/drivers', label: 'Drivers', icon: '◐', phase: 2 },
      { path: '/assets', label: 'Trucks & Trailers', icon: '▭', phase: 2 },
    ],
  },
  {
    section: 'CUSTOMERS',
    items: [{ path: '/customers', label: 'Customers', icon: '◇', phase: 2 }],
  },
  {
    section: 'FINANCE',
    items: [
      { path: '/invoices', label: 'Invoices', icon: '$', phase: 8 },
      { path: '/settlements', label: 'Settlements', icon: '≡', phase: 8 },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { path: '/reports', label: 'Reports', icon: '▥', phase: 11 },
      { path: '/settings', label: 'Settings', icon: '⚙', phase: 1 },
    ],
  },
];
