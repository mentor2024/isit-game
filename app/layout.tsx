import type { Metadata } from 'next';
import './globals.css';
import TopNav from './components/TopNav';

export const metadata: Metadata = {
  title: 'ISIT Game',
  description: 'Community-built IS/IT polls',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased">
        <TopNav />
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
