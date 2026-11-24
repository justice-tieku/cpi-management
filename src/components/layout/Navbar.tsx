import React, { useState } from 'react';
import { Bell, UserPlus, Check, X, Shield, User, Menu, Key, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { supabase } from '../../../backend/client';

interface NavbarProps {
  title: string;
  subtitle?: string;
  onOpenAddPerson: () => void;
  showAddPerson?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  onOpenAddPerson,
  showAddPerson = false,
  onToggleMobileMenu
}) => {
  const { currentUser, visibleNotifications, markNotificationRead, isCloudConnected } = useCMS();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ message: 'Password must be at least 6 characters long', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ message: 'Passwords do not match', isError: true });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus({ message: 'Password updated successfully!', isError: false });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStatus(null);
      }, 1500);
    } catch (err: any) {
      setPasswordStatus({ message: 'Request unsuccessful. Please try again.', isError: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0c152e] flex items-center justify-between shrink-0 relative z-30">
      {/* Mobile Hamburger & Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 bg-[#111d44] hover:bg-[#16285a] text-[#a6c4eb] hover:text-white transition-colors cursor-pointer shrink-0"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[#a6c4eb] mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* '+ Add Person' Button only visible on relevant pages */}
        {showAddPerson && (
          <button
            onClick={onOpenAddPerson}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add New Person</span>
          </button>
        )}

        {/* Notifications Bell with Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative w-8 h-8 bg-[#111d44] hover:bg-[#16285a] flex items-center justify-center text-[#a6c4eb] hover:text-white transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff4d6d] text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Menu */}
          {showNotifMenu && (
            <div className="absolute right-0 top-10 w-80 bg-[#111d44] shadow-2xl p-4 space-y-3 z-50">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </span>
                <button
                  onClick={() => setShowNotifMenu(false)}
                  className="text-[#a6c4eb] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {visibleNotifications.length === 0 ? (
                <p className="text-[#a6c4eb] text-xs py-4 text-center">
                  No notifications yet.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-[#16285a]">
                  {visibleNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`pt-2 text-xs cursor-pointer  p-2.5 transition-colors ${
                        !n.read ? 'bg-[#072e54] text-[#00f0ff]' : 'hover:bg-[#16285a] text-[#cbd5e1]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{n.title}</span>
                        <span className="text-[10px] text-[#a6c4eb]">{n.timestamp}</span>
                      </div>
                      <p className="text-[#a6c4eb] text-[11px] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Pill & Change Password */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => {
              setPasswordStatus(null);
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordModal(true);
            }}
            className="p-2 bg-[#111d44] hover:bg-[#16285a] text-[#00f0ff] hover:text-white transition-colors cursor-pointer"
            title="Change My Password"
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <div className="w-8 h-8 bg-[#072e54] text-[#00f0ff] flex items-center justify-center font-bold text-xs">
            {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white leading-none">
              {currentUser.name}
            </p>
            <p className="text-[10px] text-[#a6c4eb] leading-none mt-1">
              {currentUser.role === 'pastor' ? 'Pastor' : currentUser.assignedCell || 'Shepherd'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111d44] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#16285a]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#00f0ff]" />
                <h3 className="text-sm font-bold text-white">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[#a6c4eb] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#a6c4eb]">
              Update your private password for <strong className="text-white">{currentUser.name}</strong>.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white outline-none focus:ring-1 focus:ring-[#00f0ff]"
                />
              </div>

              {passwordStatus && (
                <div
                  className={`p-2.5 text-xs flex items-center gap-2 ${
                    passwordStatus.isError
                      ? 'bg-[#38141e] text-[#ff6b8b]'
                      : 'bg-[#0f382a] text-[#00ff9d]'
                  }`}
                >
                  {passwordStatus.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#16285a]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 bg-[#16285a] hover:bg-[#203a7a] text-xs font-semibold text-[#a6c4eb] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
