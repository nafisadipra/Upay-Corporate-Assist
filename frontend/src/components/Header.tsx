'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, LogOut, UserCheck, UserCog, ShieldCheck, LayoutGrid, FileSpreadsheet, ShieldAlert, LineChart, FileText, Users, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export type DashboardTab = 'overview' | 'upload' | 'registration' | 'checker' | 'analytics' | 'audit';

interface HeaderProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  riskAlertCount: number;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

function SidebarPayrollCalendar({ selectedPeriod, onPeriodChange }: { selectedPeriod: string; onPeriodChange: (period: string) => void }) {
  const today = new Date();
  const selectedDate = selectedPeriod ? new Date(`${selectedPeriod}-01T00:00:00`) : today;
  const [displayedMonth, setDisplayedMonth] = useState(monthStart(selectedDate));
  const [isOpen, setIsOpen] = useState(false);

  const gridStart = new Date(displayedMonth);
  gridStart.setDate(1 - ((displayedMonth.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const currentMonth = monthStart(today);
  const canGoForward = displayedMonth < currentMonth;
  const displayLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(selectedDate);

  const chooseDay = (day: Date) => {
    if (monthStart(day) > currentMonth) return;
    onPeriodChange(monthKey(day));
    setIsOpen(false);
  };

  return (
    <div className="relative mt-6">
      <p className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#bfc0c0]"><CalendarDays className="h-4 w-4 text-[#ef8354]" /> Payroll month</p>
      <button type="button" onClick={() => { setDisplayedMonth(monthStart(selectedDate)); setIsOpen((open) => !open); }} aria-expanded={isOpen} className="flex w-full items-center justify-between rounded-xl border border-[#4f5d75] bg-[#252a3a] px-3 py-3 text-left text-xs font-bold text-white transition-colors hover:border-[#ef8354] focus:outline-none focus:ring-2 focus:ring-[#ef8354]/35">
        <span>{displayLabel}</span><CalendarDays className="h-4 w-4 text-[#ef8354]" />
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Select payroll month" className="absolute left-[calc(100%+16px)] top-0 z-50 w-[330px] rounded-2xl border border-[#dce7dd] bg-white p-5 text-[#2d3142] shadow-[0_24px_65px_-20px_rgba(20,30,45,.55)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-outfit text-xl font-extrabold tracking-tight">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(displayedMonth)}</h3>
            <div className="flex gap-1">
              <button type="button" onClick={() => setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-[#ef8354] hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-[#ef8354]/25" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" disabled={!canGoForward} onClick={() => canGoForward && setDisplayedMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-[#ef8354] hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-[#ef8354]/25 disabled:cursor-not-allowed disabled:text-slate-300" aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((weekday) => <span key={weekday} className="mb-2 text-xs font-medium text-slate-400">{weekday}</span>)}
            {days.map((day) => {
              const outsideMonth = day.getMonth() !== displayedMonth.getMonth();
              const disabled = monthStart(day) > currentMonth;
              const isSelectedMonth = monthKey(day) === selectedPeriod;
              const selectedDay = isSelectedMonth && (monthKey(today) === selectedPeriod ? day.getDate() === today.getDate() : day.getDate() === 1);
              return <button key={day.toISOString()} type="button" disabled={disabled} onClick={() => chooseDay(day)} className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition-all ${selectedDay ? 'bg-[#f55e5a] text-white shadow-md shadow-[#f55e5a]/30' : outsideMonth ? 'text-slate-300 hover:bg-slate-50' : 'text-[#495269] hover:bg-orange-50 hover:text-[#ef8354]'} ${disabled ? 'cursor-not-allowed opacity-35' : ''}`}>{day.getDate()}</button>;
            })}
          </div>
          <p className="mt-4 border-t border-[#dce7dd] pt-3 text-center text-[11px] leading-4 text-[#6b7790]">Choose any day in the payroll month.</p>
        </div>
      )}
    </div>
  );
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, riskAlertCount, selectedPeriod, onPeriodChange }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const roleLabel = user.role === 'MAKER' ? 'HR Officer' : user.role === 'CHECKER' ? 'Finance Director' : 'System Admin';
  const roleIcon = user.role === 'MAKER' ? <UserCog className="h-3.5 w-3.5" /> : user.role === 'CHECKER' ? <UserCheck className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />;
  const navItems: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; available: boolean; badge?: number }> = user.role === 'CHECKER'
    ? [
        { id: 'overview', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" />, available: true },
        { id: 'checker', label: 'Review queue', icon: <ShieldAlert className="h-4 w-4" />, available: true, badge: riskAlertCount },
        { id: 'audit', label: 'Approval history', icon: <FileText className="h-4 w-4" />, available: true },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" />, available: true },
        { id: 'upload', label: 'Bulk upload', icon: <FileSpreadsheet className="h-4 w-4" />, available: true },
        { id: 'registration', label: 'Employees', icon: <Users className="h-4 w-4" />, available: true },
        { id: 'analytics', label: 'Liquidity forecast', icon: <LineChart className="h-4 w-4" />, available: true },
        { id: 'audit', label: 'Audit trail', icon: <FileText className="h-4 w-4" />, available: true },
      ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[66px] items-center justify-between border-b border-[#dce7dd] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-700 text-white"><Building2 className="h-4 w-4" /></div><div><p className="font-outfit text-base font-extrabold tracking-tight text-[#173328]">upay</p><p className="text-[9px] font-bold text-emerald-700">CORPORATE ASSIST</p></div></div>
        <button onClick={logout} className="rounded-lg border border-[#dce7dd] p-2 text-slate-600 hover:bg-red-50 hover:text-red-700" title="Sign out"><LogOut className="h-4 w-4" /></button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-[#2d3142] bg-[#2d3142] p-4 text-white lg:flex">
        <div className="flex items-center gap-3 px-2 pt-1"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ef8354] text-white"><Building2 className="h-5 w-5" /></div><div><p className="font-outfit text-xl font-extrabold tracking-tight">upay</p><p className="text-[9px] font-bold tracking-[.16em] text-[#bfc0c0]">CORPORATE ASSIST</p></div></div>
        
        {selectedPeriod !== undefined && onPeriodChange && (
          <SidebarPayrollCalendar selectedPeriod={selectedPeriod} onPeriodChange={onPeriodChange} />
        )}

        {/* Central Wallet Box Removed */}
        <nav className="mt-6 space-y-1" aria-label="Corporate assist sections"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#bfc0c0]">Workspace</p>{navItems.filter((item) => item.available).map((item) => (<button key={item.id} onClick={() => onTabChange(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-bold transition-colors ${activeTab === item.id ? 'bg-[#ef8354] text-white' : 'text-[#bfc0c0] hover:bg-[#4f5d75] hover:text-white'}`}>{item.icon}<span className="flex-1">{item.label}</span>{item.badge ? <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-[#ef8354]">{item.badge}</span> : null}</button>))}</nav>

        <div className="mt-auto border-t border-[#4f5d75] pt-4"><div className="flex items-center gap-2.5 px-2 pb-4"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#4f5d75] text-[10px] font-bold text-white">{user.full_name.split(' ').map((name) => name[0]).join('')}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{user.full_name}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#bfc0c0]">{roleIcon}{roleLabel}</p></div></div><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-[#bfc0c0] transition-colors hover:bg-red-950/30 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button></div>
      </aside>
    </>
  );
};
