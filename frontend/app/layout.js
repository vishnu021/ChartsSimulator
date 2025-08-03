import "./globals.css";
import Navigation from '@/components/Navigation';
import { AppStateProvider } from '@/contexts/AppStateContext';

export const metadata = {
    title: "Charts Simulator",
    description: "Real-time financial charts simulator",
    icons: {
        icon: '/favicon.svg',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className="antialiased">
        <AppStateProvider>
            <Navigation />
            <main className="pt-16">
                {children}
            </main>
        </AppStateProvider>
        </body>
        </html>
    );
}
