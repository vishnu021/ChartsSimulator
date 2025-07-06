import "./globals.css";
import Navigation from '@/components/Navigation';

export const metadata = {
    title: "Charts Simulator",
    description: "Real-time financial charts simulator",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className="antialiased">
        <Navigation />
        <main className="pt-16">
            {children}
        </main>
        </body>
        </html>
    );
}
