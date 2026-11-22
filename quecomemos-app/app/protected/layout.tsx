import Link from "next/link";
import { AuthButton } from "@/components/auth";
import { Logo } from "@/components/common";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const links = [
    { href: "/protected", label: "Inicio" },
    { href: "/protected/foods", label: "Comidas" },
    { href: "/protected/groups", label: "Grupos" },
    { href: "/protected/history", label: "Historial" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#FAF7F2] text-neutral-900">
      <nav className="sticky top-0 z-50 w-full border-b border-[#E8E2D9] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-8">
            <Logo size="lg" />
            <div className="hidden items-center gap-1 md:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-[#F3EEE6] hover:text-[#4A7C59]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/protected/history"
              className="hidden rounded-full bg-[#4A7C59] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3F6D4D] sm:inline-flex"
            >
              Registrar una comida
            </Link>
            <AuthButton />
          </div>
        </div>
      </nav>

      <div className="w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        {children}
      </div>
    </main>
  );
}
