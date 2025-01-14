import { ThemeProvider } from '@/components/theme-provider';
import { defaultMetadata } from './metadata';
import { Navigation } from '@/components/marketing/Navigation';
import { Footer } from '@/components/marketing/Footer';
import { BetaBanner } from '@/components/BetaBanner';
interface MarketingLayoutProps {
  children: React.ReactNode;
}

export const metadata = defaultMetadata;

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <BetaBanner />
      <div className="relative min-h-screen flex flex-col">
        <Navigation />
        <main className="grow">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
