import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Church,
  Users
} from 'lucide-react';
import { ServiceRole } from '../types/auth';
import cpiLogo from '../assets/cpi-logo.png';

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  assignedCell?: string;
}

interface MinisterialTerminalProps {
  onSuccess?: (role: ServiceRole, profile: UserProfile) => void;
}

const KNOWN_SHEPHERDS = [
  {
    name: 'Bro. Matthew Kim',
    email: 'matthew.kim@crosspassion.org',
    cell: 'Moriah Young Adults'
  },
  {
    name: 'Elder Nathan Cole',
    email: 'nathan.cole@crosspassion.org',
    cell: 'Bethel Cell (Central)'
  },
  {
    name: 'Deaconess Ruth Taiwo',
    email: 'ruth.taiwo@crosspassion.org',
    cell: 'Eden Cell (South)'
  },
  {
    name: 'Sister Grace Olatunji',
    email: 'grace.olatunji@crosspassion.org',
    cell: 'Sharon Cell (East)'
  }
];

export const MinisterialTerminal: React.FC<MinisterialTerminalProps> = ({ onSuccess }) => {
  const [role, setRole] = useState<ServiceRole>('pastor');
  const [email, setEmail] = useState('pastor.adams@crosspassion.org');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRoleToggle = (selectedRole: ServiceRole) => {
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'pastor') {
      setEmail('pastor.adams@crosspassion.org');
    } else {
      setEmail('matthew.kim@crosspassion.org');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please provide your ministerial email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your access password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      if (role === 'pastor') {
        onSuccess?.('pastor', {
          id: 'USR-PASTOR-01',
          name: 'Pastor Adams',
          email: email.trim() || 'pastor.adams@crosspassion.org'
        });
      } else {
        const found = KNOWN_SHEPHERDS.find(
          (s) => s.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (found) {
          onSuccess?.('shepherd', {
            name: found.name,
            email: found.email,
            assignedCell: found.cell
          });
        } else {
          const localPart = email.split('@')[0] || 'shepherd';
          const formattedName = localPart
            .split('.')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          onSuccess?.('shepherd', {
            name: formattedName || 'Cell Shepherd',
            email: email.trim(),
            assignedCell: `${formattedName}'s Care Cell`
          });
        }
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-[#070c1e] text-white flex flex-col justify-between p-6 sm:p-12 selection:bg-[#00f0ff] selection:text-[#070c1e]">
      <div className="w-full" />

      {/* Main Expansive Content Area */}
      <main className="w-full max-w-6xl mx-auto my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: CPI Logo and Slogan */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            {/* Logo positioned directly before the slogan and bigger */}
            <img
              src={cpiLogo}
              alt="Cross Passion International"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-xl"
            />

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
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
                  <span>Cell Shepherd</span>
                </button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#a6c4eb] block">
                    Ministerial Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#a6c4eb] absolute left-4 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        role === 'pastor'
                          ? 'pastor.adams@crosspassion.org'
                          : 'shepherd.name@crosspassion.org'
                      }
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
                      onClick={() => alert('Please contact church administration to reset your password.')}
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
                    <span className="w-1.5 h-1.5 bg-[#ff6b8b]" />
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
                      <span className="w-4 h-4 border-2 -transparent animate-spin" />
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

      {/* Footer */}
      <footer className="w-full text-center py-4">
        <span className="text-xs text-[#a6c4eb]">
          © 2026 Cross Passion International. All rights reserved.
        </span>
      </footer>
    </div>
  );
};
