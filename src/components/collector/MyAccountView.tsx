import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  LogOut,
  CheckCircle2,
  Users,
  DollarSign,
  Smartphone,
  Save,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/financialCalculations';

interface Props {
  onOpenLogoutModal: () => void;
}

export const MyAccountView: React.FC<Props> = ({ onOpenLogoutModal }) => {
  const { currentUser, updateMyPassword } = useAuth();
  const { database, handleSaveUser } = useApp();
  const settings = database.settings;

  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password update states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Collector metrics
  const assignedClientsCount = database.clients.filter(
    c => !c.inTrash && !c.isArchived && (c.assignedCollectorId === currentUser?.id || c.assignedTo === currentUser?.id)
  ).length;

  const myCollectedToday = database.payments
    .filter(p => !p.isReversed && p.collectorId === currentUser?.id)
    .reduce((acc, p) => acc + p.receivedAmount, 0);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      await handleSaveUser({
        ...currentUser,
        phone,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar datos');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Debe ingresar su contraseña actual.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await updateMyPassword(currentPassword, newPassword);
      if (!res.success) {
        setPasswordError(res.error || 'Error al actualizar contraseña.');
        return;
      }
      setPasswordSuccess('¡Tu contraseña ha sido actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error inesperado al cambiar contraseña.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 text-xs pb-16">
      {/* Profile Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-700/60 rounded-3xl p-6 text-white shadow-xl flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl ${
            currentUser?.avatarColor || 'bg-blue-600'
          } flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0`}
        >
          {currentUser?.name.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black truncate">{currentUser?.name}</h1>
          </div>
          <p className="text-blue-200 text-xs truncate">{currentUser?.email}</p>
          <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            Rol: Cobrador Autorizado
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Clientes Asignados</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white">{assignedClientsCount}</div>
          <div className="text-[10px] text-slate-400">En mi cartera operativa</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">Total Recaudado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400">
            {formatCurrency(myCollectedToday, settings.currencySymbol)}
          </div>
          <div className="text-[10px] text-slate-400">Pagos asentados con éxito</div>
        </div>
      </div>

      {/* Edit Personal Phone */}
      <form onSubmit={handleUpdateProfile} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <span>Datos Personales de Contacto</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Mantenga actualizado su número telefónico de coordinación
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Datos de contacto actualizados correctamente.</span>
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Teléfono Móvil:</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+503 7123-4567"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>

      {/* Actualizar Mi Contraseña */}
      <form onSubmit={handlePasswordSubmit} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Actualizar Mi Contraseña</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cambie su contraseña de inicio de sesión en cualquier momento
          </p>
        </div>

        {passwordError && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

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
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

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
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

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
              placeholder="Repita su nueva contraseña"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isUpdatingPassword ? 'Actualizando...' : 'Actualizar Mi Contraseña'}</span>
          </button>
        </div>
      </form>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenLogoutModal}
          className="w-full py-3 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión Segura</span>
        </button>
      </div>
    </div>
  );
};
