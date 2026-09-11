import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'upay Corporate Assist - B2B Bulk Disbursement & AI Risk Auditor',
  description:
    'Next-gen B2B corporate portal featuring automated account validation, AI Risk Shield anomaly detection, Maker-Checker authorization, and predictive liquidity forecasting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
