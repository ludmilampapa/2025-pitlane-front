'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2 } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/protected') return pathname === href;
    if (
      href === '/protected/meals' &&
      (pathname.startsWith('/protected/community-meals') || pathname.startsWith('/protected/foods'))
    ) {
      return true;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="hidden items-center gap-1 md:flex">
      {links.map((link) => {
        const active = isActive(link.href);
        const isPlay = link.href === '/protected/play';

        if (isPlay) {
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${
                active
                  ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                  : 'border-secondary/35 bg-gradient-to-r from-secondary/15 via-amber-500/15 to-primary/15 text-secondary hover:border-secondary/60 hover:from-secondary/25 hover:to-primary/25'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              <span>{link.label}</span>
              {!active && (
                <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" aria-hidden />
              )}
            </Link>
          );
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
              active
                ? 'bg-primary/15 font-bold text-foreground'
                : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {link.label}
            {active && (
              <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-primary" aria-hidden />
            )}
          </Link>
        );
      })}
    </div>
  );
}
