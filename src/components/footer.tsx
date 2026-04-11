export default function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Landil
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
    </footer>
  );
}
