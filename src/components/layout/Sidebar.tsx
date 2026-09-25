import { NavLink } from 'react-router-dom';
import { Droplets, X } from 'lucide-react';
import { NAV_ITEMS } from './navigation';
import { cn } from '@/utils/cn';
import { useAppData } from '@/store/AppDataContext';
import { upcomingJobs } from '@/utils/calc';
import { todayISO } from '@/utils/date';
import { initials } from '@/utils/format';

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/30">
        <Droplets className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-bold tracking-[0.14em] text-white">CLEANPRO</p>
        <p className="text-[11px] font-medium text-brand-200/80">Cleaning Business Manager</p>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { jobs, settings } = useAppData().data;
  const today = todayISO();
  const todayCount = upcomingJobs(jobs, today).filter((j) => j.date === today).length;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                  <span className="flex-1">{label}</span>
                  {to === '/schedule' && todayCount > 0 && (
                    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-semibold text-brand-200" title="Open jobs today">
                      {todayCount}
                    </span>
                  )}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <NavLink to="/settings" onClick={onClose} className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-brand-200 ring-1 ring-white/10">
              {initials(settings.businessName) || 'CP'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{settings.businessName || 'Your Business'}</p>
              <p className="truncate text-xs text-slate-400">{settings.email || 'Business settings'}</p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
