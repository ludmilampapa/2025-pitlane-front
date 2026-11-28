import { AuthButton } from "@/components/auth";
import { Logo } from "@/components/common";
import { NavLinks } from "@/components/common/nav-links";
import { NavbarBadgeButton } from "@/components/common/navbar-badge-button";
import { NavbarNotificationsBell } from "@/components/common/navbar-notifications-bell";
import { NavbarRegisterMealButton } from "@/components/common/navbar-register-meal-button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/protected", label: "Home" },
    { href: "/protected/meals", label: "Food & Meals" },
    { href: "/protected/groups", label: "Groups" },
    { href: "/protected/play", label: "Play" },
    { href: "/protected/history", label: "History" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Logo size="md" className="shrink-0 pl-0" />
            <NavLinks links={links} />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <NavbarRegisterMealButton />
            <NavbarNotificationsBell />
            <NavbarBadgeButton />
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
