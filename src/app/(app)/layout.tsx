'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Shirt, InboxIcon, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/my-closet', icon: Shirt, label: 'My Closet' },
  { href: '/requests', icon: InboxIcon, label: 'Requests' },
  { href: '/invite', icon: Users, label: 'Friends' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, unreadItemRequestCount } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !currentUser) router.replace('/login');
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-400 rounded-lg flex items-center justify-center">
            <Shirt className="text-gray-900" size={14} />
          </div>
          <span className="font-bold text-gray-900">ClosetShare</span>
        </div>
        <Link href="/profile" className="flex items-center gap-2">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-gray-900 text-sm font-bold', currentUser.profile.avatar_color)}>
            {currentUser.profile.full_name.charAt(0)}
          </div>
        </Link>
      </header>

      <main className="flex-1 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
        <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const badge = href === '/requests' && unreadItemRequestCount > 0 ? unreadItemRequestCount : 0;
            return (
              <Link key={href} href={href} className={clsx('nav-item py-1 px-4', active && 'active')}>
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
