import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'c1nch - Smart Limit Orders Triggered by Real-World Events',
  description: 'Create 1inch limit order strategies triggered by Twitter, on-chain events, and market conditions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}