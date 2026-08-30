import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  X,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n/useT';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'login',
  onSuccess,
}: AuthModalProps) {
  const { t } = useT();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('请输入邮箱和密码');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password: password.trim() });
      } else {
        await register({
          email: email.trim(),
          password: password.trim(),
          nickname: nickname.trim() || undefined,
        });
      }
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setLocalError(err?.message || '登录失败，请检查账号密码或网络连接');
    }
  };

  /** One-click demo / developer login */
  const handleQuickDevLogin = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    const devEmail = 'dev@zorron.io';
    const devPassword = 'password123';

    try {
      // Try login first
      await login({ email: devEmail, password: devPassword });
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch {
      // If user doesn't exist, auto-register it
      try {
        await register({
          email: devEmail,
          password: devPassword,
          nickname: 'Zorron Creator',
        });
        setIsSubmitting(false);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setIsSubmitting(false);
        setLocalError(err?.message || '快速登录失败');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/95 p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          data-testid="auth-modal-close"
        >
          <X size={18} />
        </button>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLocalError(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            data-testid="auth-tab-login"
          >
            <LogIn size={14} />
            <span>登录账号</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setLocalError(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            data-testid="auth-tab-register"
          >
            <UserPlus size={14} />
            <span>注册新账号</span>
          </button>
        </div>

        {/* Error Alert */}
        {localError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle size={15} className="flex-shrink-0 text-rose-400" />
            <span>{localError}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                创作者昵称
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如：剑网3小创作者"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  data-testid="auth-nickname-input"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              电子邮箱
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@zorron.io"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                data-testid="auth-email-input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              登录密码
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位密码"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                data-testid="auth-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 active:scale-[0.98] disabled:opacity-50"
            data-testid="auth-submit-btn"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={14} />
            ) : (
              <UserPlus size={14} />
            )}
            <span>{isSubmitting ? '处理中…' : mode === 'login' ? '立即登录' : '立即注册'}</span>
          </button>
        </form>

        {/* Quick Demo Login Option */}
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={handleQuickDevLogin}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2 text-xs font-medium text-violet-200 transition-all hover:bg-violet-500/20 hover:border-violet-400 active:scale-[0.98] disabled:opacity-50"
            data-testid="auth-dev-login-btn"
          >
            <Sparkles size={13} className="text-violet-400" />
            <span>一键使用体验创作者账号快速登录</span>
          </button>
        </div>
      </div>
    </div>
  );
}
