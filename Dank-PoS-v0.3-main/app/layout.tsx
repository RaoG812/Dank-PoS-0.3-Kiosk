// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LoaderProvider } from '../contexts/LoaderContext';
import { CustomAlertProvider } from '../contexts/CustomAlertContext'; // Import the new provider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dank PoS',
  description: 'Point of Sale application for Cannabis Shops & Clubs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LoaderProvider>
          <CustomAlertProvider> {/* Wrap children with the new provider */}
            {children}
          </CustomAlertProvider>
        </LoaderProvider>
      </body>
    </html>
  );
}
