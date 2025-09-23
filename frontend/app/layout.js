import './globals.css';
import Navigation from '@/components/Navigation';
import { AppStateProvider } from '@/contexts/AppStateContext';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata = {
  title: 'Charts Simulator',
  description: 'Real-time financial charts simulator',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased h-screen flex flex-col">
        <AppStateProvider>
          <ThemeProvider>
            <Navigation />
            <main className="flex-1 overflow-hidden pt-16">{children}</main>
          </ThemeProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
