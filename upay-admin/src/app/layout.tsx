import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'upay Control Room',
  description: 'Central operations portal for upay corporate clients.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
