import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LoaderProvider } from '../contexts/LoaderContext';
import { CustomAlertProvider } from '../contexts/CustomAlertContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dank Machine',
  description: 'Self service showcase for Dank PoS'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${inter.className}`}>
        <LoaderProvider>
          <CustomAlertProvider>
            {children}
          </CustomAlertProvider>
        </LoaderProvider>
      </body>
    </html>
  );
}
