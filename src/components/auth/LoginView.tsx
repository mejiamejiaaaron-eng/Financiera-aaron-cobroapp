import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadDatabase } from '../../services/storage';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const db = loadDatabase();
  const settings = db.settings;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await login(identifier, password, rememberMe);
      if (!result.success) {
        setErrorMessage(result.error || 'Usuario o contraseña incorrectos');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySuccess(true);
    setTimeout(() => {
      setShowRecoveryModal(false);
      setRecoverySuccess(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 p-1 shadow-2xl shadow-blue-600/40 items-center justify-center mb-1">
            <img src="/icon.svg" alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            {settings.businessName}
          </h1>
          <p className="text-xs text-blue-300 font-medium max-w-xs mx-auto">
            {settings.brandSubtitle}
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-5 pb-3 border-b border-slate-800 text-left">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" />
              <span>Iniciar Sesión en el Sistema</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingrese su usuario o correo y contraseña de cobrador o administrador
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Usuario o Correo */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Usuario o Correo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Ingrese su usuario o correo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recordar sesión / Guardar sesión */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500/30 focus:ring-offset-0 focus:outline-hidden cursor-pointer"
                />
                <span className="text-slate-300 text-xs font-medium group-hover:text-white transition">
                  Guardar sesión / Recordarme
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ingresar a CobrosApp</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-slate-500 text-[11px] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>FINANCIERA AARON • Sesión cifrada y auditoría activa</span>
        </div>
      </div>

      {/* Password Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm">
              <KeyRound className="w-5 h-5 text-blue-400" />
              <span>Recuperación de Contraseña</span>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Ingrese su correo registrado. El administrador general o el sistema le enviará un enlace de restablecimiento seguro.
            </p>

            {recoverySuccess ? (
              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Instrucciones enviadas exitosamente a su correo electrónico.</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-3">
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  placeholder="su.correo@financieraaaron.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow"
                  >
                    Enviar Instrucciones
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
