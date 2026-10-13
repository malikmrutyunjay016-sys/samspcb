import React, { useState } from 'react';
import { BookOpen, CheckCircle, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Department, Application } from '../types';

interface AdmissionApplyViewProps {
  departments: Department[];
  applications: Application[];
  onAddApplication: (app: Omit<Application, 'id' | 'applicationNumber' | 'createdAt'>) => void;
}

export const AdmissionApplyView: React.FC<AdmissionApplyViewProps> = ({ departments, applications, onAddApplication }) => {
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [percentage, setPercentage] = useState(82.0);
  const [category, setCategory] = useState('General');
  const [round, setRound] = useState<'Phase 1' | 'Phase 2'>('Phase 1');
  const [successAppNum, setSuccessAppNum] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessAppNum('');

    const dept = departments.find(d => d.id === departmentId);
    if (!dept) return;

    // Check duplicate
    const existing = applications.find(
      a => a.email.toLowerCase() === email.toLowerCase() || a.phone === phone
    );

    if (existing) {
      setErrorMsg(`Duplicate Application Prevention: An application with email (${email}) or phone (${phone}) already exists (Barcode: ${existing.applicationNumber}).`);
      return;
    }

    const appNo = `SAMS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    onAddApplication({
      studentName,
      email,
      phone,
      departmentId: dept.id,
      departmentName: dept.name,
      percentage,
      category,
      status: 'Pending',
      round
    });

    setSuccessAppNum(appNo);
    setStudentName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      
      <div className="bg-gradient-to-r from-amber-700 to-orange-700 rounded-3xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-serif font-bold">UG E-Admission Application Portal</h2>
        <p className="text-amber-100 text-sm mt-2">
          Submit your official undergraduate application for SAMS Panchayat College, Baragada. Ensure your +2 marksheet and personal details match State SAMS records.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-amber-200 dark:border-stone-800 shadow-lg">
        {successAppNum && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-serif font-bold text-lg">Application Submitted Successfully!</h3>
                <p className="text-xs text-emerald-700">Your unique Barcode Application Number is <span className="font-mono font-bold text-sm bg-emerald-100 px-2 py-0.5 rounded">{successAppNum}</span></p>
              </div>
            </div>
            <p className="text-xs text-emerald-800">
              Please take a printout of this application and report to the college admission desk along with original certificates and fee receipt.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-800 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Applicant Full Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter applicant full name"
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="applicant@gmail.com"
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Select Department / Honours</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">+2 Examination Percentage</label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Admission Round</label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value as any)}
                className="w-full px-4 py-3 bg-amber-50/50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                <option value="Phase 1">Phase 1 Regular</option>
                <option value="Phase 2">Phase 2 Supplementary</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
          >
            <span>Submit Official Application</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

    </div>
  );
};
