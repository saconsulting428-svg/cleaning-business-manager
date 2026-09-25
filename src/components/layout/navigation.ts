import {
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  SprayCan,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of your cleaning business' },
  { to: '/customers', label: 'Customers', icon: Users, description: 'Manage residential and commercial customers' },
  { to: '/jobs', label: 'Cleaning Jobs', icon: ClipboardList, description: 'Book, assign and track cleaning jobs' },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, description: 'Calendar of upcoming cleaning jobs' },
  { to: '/employees', label: 'Employees', icon: UserCog, description: 'Manage your cleaning team' },
  { to: '/services', label: 'Services', icon: SprayCan, description: 'Cleaning services and default pricing' },
  { to: '/invoices', label: 'Invoices', icon: FileText, description: 'Create, send and track invoices' },
  { to: '/payments', label: 'Payments', icon: CreditCard, description: 'Record and track customer payments' },
  { to: '/reports', label: 'Reports', icon: ChartColumn, description: 'Revenue and performance insights' },
  { to: '/settings', label: 'Settings', icon: Settings, description: 'Business information and preferences' },
];
