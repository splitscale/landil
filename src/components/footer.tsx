import Link from "next/link";

const NAV_LINKS = [
  { label: "Browse", href: "/" },
  { label: "About", href: "/about" },
  { label: "Sign in", href: "/signin" },
  { label: "Sign up", href: "/signup" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto max-w-6xl px-4 space-y-4">

        {/* Top row: brand + nav */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Landil
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row: copyright + builder */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Landil. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <a
              href="https://splitscale.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Splitscale
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}
