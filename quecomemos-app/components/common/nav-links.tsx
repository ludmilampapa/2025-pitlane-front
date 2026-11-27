'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
