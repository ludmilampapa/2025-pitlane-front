import Link from "next/link";
import { AuthButton } from "@/components/auth";
import { Logo } from "@/components/common";
import { NavLinks } from "@/components/common/nav-links";
import { NavbarBadgeButton } from "@/components/common/navbar-badge-button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/protected", label: "Home" },
    { href: "/protected/foods", label: "Foods" },
    { href: "/protected/groups", label: "Groups" },
    { href: "/protected/history", label: "History" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Logo size="md" className="shrink-0 pl-0" />
            <NavLinks links={links} />
            <NavbarBadgeButton />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/protected/history"
              className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex"
            >
              Register a meal
            </Link>
            <AuthButton />
          </div>
        </div>
      </nav>

      <div className="w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 md:px-8">
        {children}
      </div>
    </main>
  );
}
