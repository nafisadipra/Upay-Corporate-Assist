'use client';

import React, { useState } from 'react';
import { BatchItem } from '@/types';
import { Edit3, CheckCircle2, X } from 'lucide-react';

export interface PayrollItemCorrection {
  corrected_phone_number: string;
  employee_name: string;
  department: string;
  basic_salary: number;
  gross_salary: number;
}

interface TypoModalProps {
  isOpen: boolean;
  item: BatchItem | null;
  onClose: () => void;
  onSave: (itemId: number, correction: PayrollItemCorrection) => void;
}

function TypoForm({
  item,
  onClose,
  onSave,
}: {
  item: BatchItem;
  onClose: () => void;
  onSave: (itemId: number, correction: PayrollItemCorrection) => void;
}) {
  const [phone, setPhone] = useState(item.corrected_phone_number || item.raw_phone_number);
  const [name, setName] = useState(item.employee_name);
  const [department, setDepartment] = useState(item.department || '');
  const [basicSalary, setBasicSalary] = useState(String(item.basic_salary));
  const [grossSalary, setGrossSalary] = useState(String(item.gross_salary));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.id, {
      corrected_phone_number: phone,
      employee_name: name,
      department,
      basic_salary: Number(basicSalary),
      gross_salary: Number(grossSalary),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block font-bold text-slate-700">
          Employee name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-slate-900"
          />
        </label>
        <label className="block font-bold text-slate-700">
          Phone number
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-slate-900"
          />
        </label>
        <label className="block font-bold text-slate-700">
          Department
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900"
          />
        </label>
        <label className="block font-bold text-slate-700">
          Basic salary
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-slate-900"
          />
        </label>
        <label className="block font-bold text-slate-700">
          Gross salary
          <input
            required
            min={Number(basicSalary) || 0}
            step="0.01"
            type="number"
            value={grossSalary}
            onChange={(e) => setGrossSalary(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-slate-900"
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-500">
        Saving re-runs account and payroll-risk validation.
      </p>

      <div className="flex items-center space-x-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Verify & Save</span>
        </button>
      </div>
    </form>
  );
}

export const TypoModal: React.FC<TypoModalProps> = ({ isOpen, item, onClose, onSave }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-space">Correct payroll row</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
          <div className="font-bold text-slate-900 font-space text-sm">{item.employee_name}</div>
          <div className="text-slate-500 font-mono">
            Department: {item.department} | Gross salary: BDT {item.gross_salary.toLocaleString()}
          </div>
          <div className="text-red-700 font-semibold pt-1">
            Status: {item.account_validation_status}
          </div>
        </div>

        <TypoForm key={item.id} item={item} onClose={onClose} onSave={onSave} />
      </div>
    </div>
  );
};
