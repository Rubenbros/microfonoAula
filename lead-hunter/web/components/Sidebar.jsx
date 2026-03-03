'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, GitBranch, Radar, Lightbulb,
  Settings, LogOut, Briefcase, Search, UserCheck,
  FolderKanban, Wallet
} from 'lucide-react';

const mainNav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/scans', label: 'Escáner', icon: Radar },
  { href: '/automations', label: 'Automatizaciones', icon: Lightbulb },
];

const freelanceNav = [
  { href: '/freelance', label: 'Dashboard', icon: Briefcase },
  { href: '/freelance/opportunities', label: 'Oportunidades', icon: Search },
  { href: '/freelance/clients', label: 'Clientes', icon: UserCheck },
  { href: '/freelance/projects', label: 'Proyectos', icon: FolderKanban },
  { href: '/freelance/finances', label: 'Finanzas', icon: Wallet },
];

const bottomNav = [
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">🎯 Lead Hunter</h1>
        <p className="text-xs text-gray-500">T800 Labs</p>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {mainNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href) && !pathname.startsWith('/freelance'));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Freelance</span>
        </div>

        {freelanceNav.map(({ href, label, icon: Icon }) => {
          const active = href === '/freelance' ? pathname === '/freelance' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        <div className="pt-2">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-800">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 w-full px-3 py-2"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
