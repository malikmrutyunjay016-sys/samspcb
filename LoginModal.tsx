import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, UserCheck, KeyRound } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { authenticateHod } from '../utils/hodAuthService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (
    userRole: 'admin' | 'hod' | 'student', 
    userInfo: { name: string; email: string; deptId?: string; hodId?: string; subjectName?: string }
  ) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanId = loginId.trim();
      if (cleanId === '03071302' && password === 'SAMS**PANCHAYATCOLLEGE') {
        onLoginSuccess('admin', { name: 'Mrutyunjay Malik (Super Admin)', email: 'malikmrutyunjay016@gmail.com' });
        onClose();
        return;
      }

      // Check if it's an HOD ID login (e.g. MATHEMATICS_HOD, PHYSICS_HOD)
      const hodAccount = await authenticateHod(cleanId, password);
      if (hodAccount) {
        onLoginSuccess('hod', {
          name: `${hodAccount.subjectName} HOD (${hodAccount.hodName})`,
          email: hodAccount.email,
          deptId: hodAccount.deptId,
          hodId: hodAccount.id,
          subjectName: hodAccount.subjectName
        });
        onClose();
        return;
      }

      setError('Invalid User ID or Password. Please check your credentials and try again.');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || '';
      const name = user.displayName || 'Google User';

      if (email === 'malikmrutyunjay016@gmail.com') {
        onLoginSuccess('admin', { name: 'Mrutyunjay Malik (Super Admin)', email });
      } else if (email.includes('hod.')) {
        // HOD email pattern e.g., hod.physics@...
        const deptPart = email.split('@')[0].replace('hod.', '');
        onLoginSuccess('hod', { name, email, deptId: `dept-${deptPart}` });
      } else {
        onLoginSuccess('student', { name, email });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-amber-50/95 dark:bg-stone-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-stone-800 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-700 to-orange-800 p-6 text-white text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex p-3 bg-white/10 rounded-full mb-3 backdrop-blur-md">
            <ShieldCheck className="w-8 h-8 text-amber-200" />
          </div>
          <h2 className="text-2xl font-serif font-bold">Secure Portal Login</h2>
          <p className="text-amber-100 text-sm mt-1">SAMS Panchayat College, Baragada</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium text-stone-700 dark:text-stone-200 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.3L1.9 15.9C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              <span>Sign in with Google (Super Admin / HOD / Student)</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-300 dark:border-stone-700"></div>
            <span className="flex-shrink mx-4 text-xs text-stone-500 uppercase font-semibold">Or Official Credentials</span>
            <div className="flex-grow border-t border-stone-300 dark:border-stone-700"></div>
          </div>

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">
                Super Admin ID or HOD ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                  <UserCheck className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter User ID (e.g. Super Admin ID or HOD ID)"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In as Super Admin / HOD'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
