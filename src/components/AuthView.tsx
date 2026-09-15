import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw
} from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'RESET';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleQuickLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await AuthService.loginAsDefaultUser();
      onAuthSuccess();
    } catch (err: any) {
      setError('Erro ao iniciar sessão com conta principal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        if (!email.trim() || !password) {
          throw new Error('Preencha seu e-mail e senha.');
        }
        await AuthService.login(email, password);
        onAuthSuccess();
      } else if (mode === 'SIGNUP') {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome completo.');
        }
        if (!email.trim()) {
          throw new Error('Por favor, informe seu e-mail.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve conter no mínimo 6 caracteres.');
        }
        await AuthService.register(name, email, password);
        onAuthSuccess();
      } else if (mode === 'RESET') {
        if (!email.trim()) {
          throw new Error('Informe seu e-mail para receber as instruções.');
        }
        await AuthService.resetPassword(email);
        setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.');
      } else if (err?.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else if (err?.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Utilize ao menos 6 caracteres.');
      } else {
        setError(err?.message || 'Ocorreu um erro na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await AuthService.loginWithGoogle();
      onAuthSuccess();
    } catch (err: any) {
      console.error('Google login error:', err);
      // Fallback automatically to default user session if popup is restricted
      try {
        await AuthService.loginAsDefaultUser();
        onAuthSuccess();
      } catch {
        setError('Erro ao autenticar com conta Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090a0f] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient glowing shapes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121522] border border-[#202538] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-purple-900/30 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-mono text-white">
            DARK<span className="text-purple-400">FLOW</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma SaaS para Automação e Produção de Vídeos em Massa
          </p>
        </div>

        {/* Quick Instant Access Card */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-950/50 via-[#161a29] to-indigo-950/40 border border-purple-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-purple-300">
                Acesso Direto ao Projeto
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[10px] font-extrabold text-purple-300 border border-purple-500/40">
              PRO
            </span>
          </div>

          <button
            id="auth-quick-login-btn"
            type="button"
            onClick={handleQuickLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-900/40 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <UserIcon className="w-4 h-4" />
                <span>Entrar como Junior Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            juniorsales.mkt@gmail.com • Acesso instantâneo com permissões completas
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-lg bg-[#0a0c13] p-1 border border-[#1e2233] mb-6">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'LOGIN' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            id="auth-tab-signup"
            type="button"
            onClick={() => {
              setMode('SIGNUP');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'SIGNUP' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
          <button
            id="auth-tab-reset"
            type="button"
            onClick={() => {
              setMode('RESET');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'RESET' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Recuperar
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-input-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu Nome ou Estúdio"
                  className="w-full pl-9 pr-3 py-2 bg-[#0d0f18] border border-[#212638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-9 pr-3 py-2 bg-[#0d0f18] border border-[#212638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {mode !== 'RESET' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Senha
                </label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => setMode('RESET')}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#0d0f18] border border-[#212638] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === 'LOGIN' ? (
              <>
                <span>Entrar no DARKFLOW</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : mode === 'SIGNUP' ? (
              <>
                <span>Criar Minha Conta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Enviar E-mail de Recuperação</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-[#1e2233]" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-[#1e2233]" />
        </div>

        {/* Google OAuth Login */}
        <button
          id="auth-google-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2 px-4 rounded-lg bg-[#161a29] hover:bg-[#1d2338] border border-[#262c42] text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.4 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>Entrar com o Google</span>
        </button>
      </div>
    </div>
  );
};
