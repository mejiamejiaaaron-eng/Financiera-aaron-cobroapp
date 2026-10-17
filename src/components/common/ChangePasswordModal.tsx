import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, updateMyPassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Debe ingresar su contraseña actual.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas nuevas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateMyPassword(currentPassword, newPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Error al actualizar la contraseña.');
        return;
      }

      setSuccessMessage('¡Su contraseña ha sido actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1800);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error inesperado al cambiar contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Actualizar Mi Contraseña</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Contraseña Actual <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Ingrese su contraseña actual"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                title={showCurrent ? 'Ocultar' : 'Mostrar'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Nueva Contraseña <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                title={showNew ? 'Ocultar' : 'Mostrar'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Elija una contraseña segura que recuerde con facilidad.
            </p>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Confirmar Nueva Contraseña <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita la nueva contraseña"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
