import React, { useState } from 'react';
import { AlertTriangle, Lock, Eye, EyeOff, ShieldAlert, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess: () => void;
}

export const ClearSystemPasswordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
}) => {
  const { verifyCurrentUserPassword, currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Por favor ingrese su contraseña de administrador.');
      return;
    }

    setIsProcessing(true);

    const isValid = verifyCurrentUserPassword(password);
    if (!isValid) {
      setIsProcessing(false);
      setErrorMessage('Contraseña incorrecta. Por seguridad, no se puede vaciar el sistema sin su contraseña válida.');
      return;
    }

    // Success: Execute clear action
    try {
      onConfirmSuccess();
      setPassword('');
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al limpiar el sistema.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-rose-900/80 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-950">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Confirmación de Seguridad Obligatoria</h3>
              <p className="text-[11px] text-rose-300 font-semibold">Vaciar datos e iniciar sistema en blanco</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPassword('');
              setErrorMessage('');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning text */}
        <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-2 text-rose-200/90 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-white">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>¿Está seguro de ejecutar esta acción?</span>
          </div>
          <p className="text-[11px]">
            Se eliminarán todos los <strong>clientes, créditos, cuotas y pagos de prueba</strong>. Su financiera quedará en <strong>$0.00 y 0 clientes</strong>, totalmente limpia y lista para registrar sus créditos reales.
          </p>
          <p className="text-[10px] text-slate-300">
            * Su usuario administrador (<strong>{currentUser?.email}</strong>) y la configuración de su marca se conservarán.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950 border border-rose-700 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ingrese su Contraseña de Administrador <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Contraseña de administrador"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-white focus:outline-hidden focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setErrorMessage('');
                onClose();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/50 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isProcessing ? 'Verificando...' : 'Autorizar y Vaciar Sistema'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
