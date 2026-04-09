import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <TooltipProvider>
        <NextTopLoader easing="ease" showSpinner={false} color="var(--primary)" />
        {children}
        <Toaster position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
