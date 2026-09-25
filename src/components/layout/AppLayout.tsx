import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NAV_ITEMS } from './navigation';
import { Button } from '@/components/ui';
import { JobFormModal } from '@/features/jobs/JobFormModal';
import { longDate } from '@/utils/date';

function Header({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const [newJob, setNewJob] = useState(false);
  const current = NAV_ITEMS.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{current?.label ?? 'CleanPro'}</p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{current?.description}</p>
        </div>
        <span className="hidden text-sm text-slate-500 md:block">{longDate(new Date())}</span>
        <Button size="md" icon={<Plus className="h-4 w-4" />} onClick={() => setNewJob(true)}>
          <span className="hidden sm:inline">New Job</span>
          <span className="sm:hidden">Job</span>
        </Button>
      </div>
      <JobFormModal open={newJob} onClose={() => setNewJob(false)} />
    </header>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
