import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Church,
  Users,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ServiceRole } from '../types/auth';
import cpiLogo from '../assets/cpi-logo.png';
import { supabase } from '../../backend/client';
import { apiClient } from '../services/apiClient';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  assignedCell?: string;
}

interface MinisterialTerminalProps {
  onSuccess?: (role: ServiceRole, profile: UserProfile) => void;
}

export const MinisterialTerminal: React.FC<MinisterialTerminalProps> = ({ onSuccess }) => {
  const [role, setRole] = useState<ServiceRole>('pastor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleRoleToggle = (selectedRole: ServiceRole) => {
    setRole(selectedRole);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required. Enter the email on your account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address, for example name@example.com.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required. Enter your access password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const designatedPastorEmail = 'crosspassioninternational67@gmail.com';
      const designatedPastorPassword = 'CrossPassion@99';
      const isDesignatedPastor =
        cleanEmail === designatedPastorEmail &&
        password === designatedPastorPassword;

      // STRICT ROLE TAB ENFORCEMENT BEFORE AUTH:
      // A. If Pastor tab is selected, ONLY the designated pastor credentials will work
      if (role === 'pastor') {
        if (!isDesignatedPastor) {
          setIsSubmitting(false);
          setError('Invalid login credentials.');
          return;
        }
      }

      // B. If Shepherd tab is selected, Pastor credentials must be blocked
      if (role === 'shepherd') {
        if (cleanEmail === designatedPastorEmail) {
          setIsSubmitting(false);
          setError('Invalid login credentials.');
          return;
        }
      }

      // 1. Attempt Supabase Auth login
      let authRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      // If user not yet seeded in Auth, trigger backend setup once
      if (authRes.error && authRes.error.message.toLowerCase().includes('invalid login credentials')) {
        try {
          await apiClient.setupInitialUsers();
          authRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password
          });
        } catch (setupErr) {
          // Continue to fallback if server unreachable; log for debugging.
          console.warn('[Login] setupInitialUsers failed:', setupErr);
        }
      }

      if (authRes.error) {
        // Fallback for offline / emergency login with designated credentials
        if (isDesignatedPastor) {
          if (role !== 'pastor') {
            setIsSubmitting(false);
            setError('Invalid login credentials.');
            return;
          }
          setIsSubmitting(false);
          onSuccess?.('pastor', {
            id: 'USR-PASTOR-01',
            name: 'Senior Pastor',
            email: 'crosspassioninternational67@gmail.com'
          });
          return;
        }

        setError('Invalid login credentials.');
        setIsSubmitting(false);
        return;
      }

      const user = authRes.data.user;
      if (!user) throw new Error('Authentication succeeded but user session is empty');

      // 2. Fetch linked profile from Supabase
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const profileData = profile as any;
      const userMeta = user.user_metadata || {};

      // Determine true role: pastor only if designated email or role explicitly set to pastor
      const isPastorUser =
        cleanEmail === 'crosspassioninternational67@gmail.com' ||
        profileData?.role === 'pastor' ||
        userMeta?.role === 'pastor';

      const resolvedRole: ServiceRole = isPastorUser ? 'pastor' : 'shepherd';

      // STRICT TAB ROLE ENFORCEMENT:
      // If user selected 'pastor' tab, but is not a pastor:
      if (role === 'pastor' && resolvedRole !== 'pastor') {
        await supabase.auth.signOut();
        setIsSubmitting(false);
        setError('Invalid login credentials.');
        return;
      }

      // If user selected 'shepherd' tab, but is a pastor:
      if (role === 'shepherd' && resolvedRole === 'pastor') {
        await supabase.auth.signOut();
        setIsSubmitting(false);
        setError('Invalid login credentials.');
        return;
      }

      const resolvedName =
        profileData?.name ||
        userMeta?.name ||
        (resolvedRole === 'pastor' ? 'Senior Pastor' : 'Shepherd');

      const resolvedCell =
        profileData?.assigned_cell ||
        userMeta?.assigned_cell ||
        'Shepherd Group';

      setIsSubmitting(false);
      onSuccess?.(resolvedRole, {
        id: user.id,
        name: resolvedName,
        email: user.email || cleanEmail,
        assignedCell: resolvedCell
      });
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Sign in error:', err);
      setError('Invalid login credentials.');
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus({ message: 'Please enter your email address', isError: true });
      return;
    }

    setIsSendingReset(true);
    setForgotStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      setForgotStatus({
        message: 'Password reset link sent! Please check your email inbox.',
        isError: false
      });
    } catch (err: any) {
      setForgotStatus({
        message: 'Request unsuccessful. Please try again.',
        isError: true
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070c1e] text-white flex flex-col justify-between p-6 sm:p-12 selection:bg-[#00f0ff] selection:text-[#070c1e]">
      <div className="w-full" />

      {/* Main Expansive Content Area */}
      <main className="w-full max-w-6xl mx-auto my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: CPI Logo and Slogan */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <img
              src={cpiLogo}
              alt="Cross Passion International"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-xl"
            />

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Extending God's Kingdom to the ends of the earth.
            </h1>
          </div>

          {/* Right Column: Clean Solid Sign In Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:ml-auto">
            <div className="bg-[#111d44] p-8 sm:p-10 shadow-2xl space-y-6">
              {/* Card Title */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Sign In
                </h2>
                <p className="text-xs text-[#a6c4eb] mt-1">
                  Access ministerial records, attendance & follow-up care
                </p>
              </div>

              {/* Role Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-[#0a122e] p-1.5">
                <button
                  type="button"
                  onClick={() => handleRoleToggle('pastor')}
                  className={`py-2.5 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    role === 'pastor'
                      ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                      : 'bg-transparent text-[#a6c4eb] hover:text-white'
                  }`}
                >
                  <Church className="w-3.5 h-3.5" />
                  <span>Pastor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleToggle('shepherd')}
                  className={`py-2.5 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    role === 'shepherd'
                      ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                      : 'bg-transparent text-[#a6c4eb] hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Shepherd</span>
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#a6c4eb] block">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#a6c4eb] absolute left-4 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-[#0a122e] text-white text-sm font-medium pl-11 pr-4 py-3.5 outline-none placeholder:text-[#7b9dc7] focus:ring-2 focus:ring-[#00f0ff] transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#a6c4eb]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotStatus(null);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] font-semibold text-[#00f0ff] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#a6c4eb] absolute left-4 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#0a122e] text-white text-sm font-medium pl-11 pr-12 py-3.5 outline-none placeholder:text-[#7b9dc7] focus:ring-2 focus:ring-[#00f0ff] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-[#a6c4eb] hover:text-white cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Session Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-[#0a122e] text-[#00f0ff] focus:ring-[#00f0ff] cursor-pointer"
                  />
                  <label
                    htmlFor="remember"
                    className="text-xs text-[#a6c4eb] cursor-pointer select-none"
                  >
                    Keep session active on this workstation
                  </label>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-[#38141e] text-[#ff6b8b] text-xs font-semibold p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#00f0ff] hover:bg-[#3bf2ff] active:bg-[#00a8e0] text-[#070c1e] text-sm font-extrabold py-3.5 px-6 shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#070c1e] border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111d44] shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="text-base font-bold text-white">Reset Ministerial Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-[#a6c4eb] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#a6c4eb]">
              Enter your registered ministerial or personal email address. We will send you an email with a link to reset your password.
            </p>

            <form onSubmit={handleSendReset} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a6c4eb]">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="pastor@gmail.com"
                  className="w-full bg-[#0a122e] text-white text-xs p-3 outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>

              {forgotStatus && (
                <div
                  className={`p-3 text-xs flex items-center gap-2 ${
                    forgotStatus.isError
                      ? 'bg-[#38141e] text-[#ff6b8b]'
                      : 'bg-[#0f382a] text-[#00ff9d]'
                  }`}
                >
                  {forgotStatus.isError ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{forgotStatus.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold bg-[#16285a] text-[#a6c4eb] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-[#00f0ff] text-[#070c1e] hover:bg-[#3bf2ff] cursor-pointer disabled:opacity-50"
                >
                  {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-[#a6c4eb]/60 py-4 font-mono">
        © 2026 Cross Passion International. All rights reserved.
      </footer>
    </div>
  );
};
