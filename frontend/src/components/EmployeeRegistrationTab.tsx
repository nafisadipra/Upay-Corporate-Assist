'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Upload, Users, HelpCircle, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import * as api from '@/lib/api';
import { Employee } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function EmployeeRegistrationTab() {
  const inputRef = useRef<HTMLInputElement>(null); 
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [message, setMessage] = useState(''); 
  const [error, setError] = useState(''); 
  const [uploading, setUploading] = useState(false);
  const [registeredEmployees, setRegisteredEmployees] = useState<Employee[]>([]);

  const loadRegisteredEmployees = useCallback(async () => {
    if (!companyId) return;
    try {
      const result = await api.fetchEmployees(companyId);
      setRegisteredEmployees(result.employees || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load registered employees.');
    }
  }, [companyId]);

  useEffect(() => {
    void (async () => {
      await loadRegisteredEmployees();
    })();
  }, [loadRegisteredEmployees]);

  async function upload(file: File) { 
    setUploading(true); 
    setMessage(''); 
    setError(''); 
    try { 
      const result = await api.uploadEmployeeRegistrationFile(file); 
      setMessage(result.message); 
      await loadRegisteredEmployees();
    } catch (caught) { 
      setError(caught instanceof Error ? caught.message : 'Unable to submit employee registrations.'); 
    } finally { 
      setUploading(false); 
    } 
  }

  return (
    <div className="space-y-6">
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-[13px] font-bold text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] font-bold text-red-900">{error}</div>}
      
      {/* Top Panel */}
      <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-slate-100 space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ef8354]/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-[#ef8354]" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#2d3142] text-xl font-outfit tracking-tight">Employee registration</h2>
              <p className="text-[13px] text-[#4f5d75] mt-1 max-w-xl">
                Submit the employee template for Upay Admin approval before payroll validation uses the registered number.
              </p>
            </div>
          </div>

          <button className="bg-[#ffffff] hover:bg-[#ef8354]/5 text-[#ef8354] border border-[#ef8354]/30 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-sm">
            <HelpCircle className="w-4 h-4" />
            <span>How it works?</span>
          </button>
        </div>

        {/* Upload Bar */}
        <div className="mt-6 border border-dashed border-[#bfc0c0] bg-[#fcfcfc] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[#ffffff] rounded-lg border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-[#4f5d75]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2d3142] text-[15px] font-outfit">Upload employee registration template</h3>
              <p className="text-[13px] text-[#4f5d75] mt-0.5">Required: email, full_name, wallet_details (11-digit Upay number). Choosing a file submits it to Upay Admin.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            <a href="/employee_registration_template.csv" download className="bg-[#ffffff] hover:bg-slate-50 text-[#4f5d75] border border-slate-200 px-5 py-2.5 rounded-xl text-[13px] font-bold flex items-center space-x-2 transition-all shadow-sm">
              <Download className="w-4 h-4" />
              <span>Download template</span>
            </a>
            <input 
              ref={inputRef} 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} 
            />
            <button 
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="bg-[#ef8354] hover:bg-[#d67045] active:scale-[0.98] text-[#ffffff] px-5 py-2.5 rounded-xl text-[13px] font-bold flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Submitting...' : 'Choose & submit file'}</span>
            </button>
          </div>
        </div>
        
        <p className="text-[12px] text-[#bfc0c0] mt-3 ml-2">Supports .xlsx, .xls, .csv files (Up to 16MB)</p>
      </div>

      {registeredEmployees.length > 0 && (
        <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6"><h3 className="font-extrabold text-[#2d3142] text-lg font-outfit tracking-tight">Registered Employees ({registeredEmployees.length})</h3><button type="button" onClick={() => void loadRegisteredEmployees()} className="inline-flex items-center gap-2 text-sm font-bold text-[#4f5d75]"><RefreshCw className="h-4 w-4" />Refresh</button></div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[#bfc0c0] font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="pb-4 px-2">#</th>
                  <th className="pb-4 px-2">EMPLOYEE CODE</th>
                  <th className="pb-4 px-2">FULL NAME</th>
                  <th className="pb-4 px-2">UPAY NUMBER</th>
                  <th className="pb-4 px-2">DEPARTMENT</th>
                  <th className="pb-4 px-2">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registeredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-2 font-mono text-[#bfc0c0]">{idx + 1}</td>
                    <td className="py-4 px-2 font-mono font-bold text-[#4f5d75]">{emp.employee_code || '-'}</td>
                    <td className="py-4 px-2 font-bold text-[#2d3142] font-outfit">{emp.employee_name}</td>
                    <td className="py-4 px-2 font-mono font-medium text-[#2d3142]">{emp.phone_number}</td>
                    <td className="py-4 px-2 text-[#4f5d75] font-medium">{emp.department || '-'}</td>
                    <td className="py-4 px-2">
                      {emp.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-50/50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 bg-slate-50 text-[#4f5d75] px-3 py-1 rounded-full text-[11px] font-bold border border-slate-200">
                          <span>{emp.status}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
