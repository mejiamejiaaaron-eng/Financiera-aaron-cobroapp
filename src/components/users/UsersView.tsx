import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  UserCheck,
  Edit2,
  Check,
  X,
  AlertCircle,
  Key,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { User, UserPermissions } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { ADMIN_PERMISSIONS, COLLECTOR_PERMISSIONS } from '../../services/seedData';

export const UsersView: React.FC = () => {
  const { database, handleSaveUser } = useApp();
  const { currentUser, isAdmin, getUserPassword, adminSetUserPassword } = useAuth();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'collector'>('collector');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(COLLECTOR_PERMISSIONS);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Password Modal for any user
  const [quickPassUser, setQuickPassUser] = useState<User | null>(null);
  const [quickNewPass, setQuickNewPass] = useState('');
  const [quickShowPass, setQuickShowPass] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [quickSuccess, setQuickSuccess] = useState('');
  const [isSavingQuickPass, setIsSavingQuickPass] = useState(false);
  const [copiedQuickCreds, setCopiedQuickCreds] = useState(false);

  const generateRandomPassword = () => {
    const prefixes = ['Aaron', 'Cobro', 'Perez', 'Finanza', 'Credito'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${p}${num}*`;
  };

  const permissionLabels: Array<{ key: keyof UserPermissions; label: string }> = [
    { key: 'canViewClients', label: 'Ver clientes' },
    { key: 'canSearchClients', label: 'Buscar clientes' },
    { key: 'canViewDossier', label: 'Ver expedientes' },
    { key: 'canViewDailyCollections', label: 'Ver cobros del día' },
    { key: 'canViewOverdue', label: 'Ver clientes en mora' },
    { key: 'canRegisterPayments', label: 'Registrar pagos' },
    { key: 'canRegisterPartialPayments', label: 'Registrar abonos' },
    { key: 'canAddClientsAndCredits', label: 'Añadir clientes y créditos' },
    { key: 'canArchiveClients', label: 'Archivar clientes' },
    { key: 'canDeleteClients', label: 'Eliminar clientes' },
    { key: 'canRequestReversion', label: 'Solicitar reversión de pagos' },
    { key: 'canApproveReversion', label: 'Aprobar y ejecutar reversiones' },
    { key: 'canViewReports', label: 'Consultar reportes' },
    { key: 'canViewAllClients', label: 'Ver todos los clientes' },
    { key: 'canViewOnlyAssignedClients', label: 'Ver únicamente clientes asignados' },
    { key: 'canViewFinancialHistory', label: 'Consultar historial financiero' },
    { key: 'canManageUsers', label: 'Administrar usuarios y permisos' },
    { key: 'canChangeBranding', label: 'Cambiar el logotipo y marca' },
    { key: 'canAccessSettings', label: 'Acceder a la configuración' },
  ];

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsCreatingNew(false);
    setName(user.name);
    setUsername(user.username || user.email.split('@')[0] || '');
    setEmail(user.email);
    setPhone(user.phone || '');
    setRole(user.role);
    setPermissions({ ...user.permissions });
    const stored = getUserPassword(user.email);
    setPassword(stored || '');
    setShowPassword(false);
    setErrorMessage('');
  };

  const handleOpenNew = () => {
    setIsCreatingNew(true);
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword(generateRandomPassword());
    setShowPassword(true);
    setRole('collector');
    setPermissions({ ...COLLECTOR_PERMISSIONS });
    setErrorMessage('');
  };

  const handleOpenQuickPassword = (user: User) => {
    setQuickPassUser(user);
    const existing = getUserPassword(user.email);
    setQuickNewPass(existing || generateRandomPassword());
    setQuickShowPass(true);
    setQuickError('');
    setQuickSuccess('');
    setCopiedQuickCreds(false);
  };

  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPassUser) return;
    setQuickError('');
    setQuickSuccess('');

    if (quickNewPass.length < 6) {
      setQuickError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsSavingQuickPass(true);
      const res = await adminSetUserPassword(quickPassUser.email, quickNewPass);
      if (!res.success) {
        setQuickError(res.error || 'Error al actualizar contraseña.');
        return;
      }
      setQuickSuccess(`¡Contraseña actualizada con éxito para ${quickPassUser.name}!`);
      setTimeout(() => {
        setQuickPassUser(null);
        setQuickSuccess('');
      }, 2000);
    } catch (err: unknown) {
      setQuickError(err instanceof Error ? err.message : 'Error al guardar contraseña');
    } finally {
      setIsSavingQuickPass(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!quickPassUser) return;
    const loginUser = quickPassUser.username || quickPassUser.email;
    const text = `Credenciales de acceso a FINANCIERA AARON:\n\nUsuario o Correo: ${loginUser}\nContraseña: ${quickNewPass}\nEnlace: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedQuickCreds(true);
    setTimeout(() => setCopiedQuickCreds(false), 2500);
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim()) {
      setErrorMessage('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    if (isCreatingNew && (!password.trim() || password.trim().length < 6)) {
      setErrorMessage('Debe asignar una contraseña al nuevo usuario (mínimo 6 caracteres).');
      return;
    }

    if (password.trim() && password.trim().length < 6) {
      setErrorMessage('La contraseña asignada debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsSaving(true);
      await handleSaveUser({
        id: editingUser?.id,
        name: name.trim(),
        username: username.trim() ? username.trim().toLowerCase() : undefined,
        email: email.trim(),
        phone: phone.trim(),
        role,
        password: password.trim() ? password.trim() : undefined,
        permissions: role === 'admin' ? ADMIN_PERMISSIONS : permissions,
      });

      setEditingUser(null);
      setIsCreatingNew(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.email === 'am0360136@gmail.com') {
      alert('No es posible desactivar al Administrador Principal de la plataforma.');
      return;
    }

    try {
      await handleSaveUser({
        ...user,
        active: !user.active,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado del usuario');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <span>Usuarios y Permisos Personalizados</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión de cobradores, roles y matriz de seguridad de la financiera
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-blue-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Nuevo Cobrador / Usuario</span>
          </button>
        )}
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {database.users.map(u => {
          const isMasterAdmin = u.email === 'am0360136@gmail.com';
          const assignedClientsCount = database.clients.filter(
            c => c.assignedCollectorId === u.id && !c.isArchived
          ).length;

          return (
            <div
              key={u.id}
              className={`bg-slate-800/80 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition ${
                !u.active
                  ? 'border-slate-800 opacity-60'
                  : u.role === 'admin'
                  ? 'border-blue-600/40 bg-blue-950/10'
                  : 'border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${
                        u.avatarColor || 'bg-blue-600'
                      } flex items-center justify-center text-white font-bold shadow`}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{u.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs text-slate-400 truncate max-w-[170px]">{u.email}</p>
                        {u.username && (
                          <span className="text-[10px] bg-slate-800 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                            @{u.username}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {u.role === 'admin' ? 'Admin' : 'Cobrador'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Teléfono:</span>
                    <span>{u.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clientes asignados:</span>
                    <strong className="text-blue-300">{assignedClientsCount} clientes</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado de cuenta:</span>
                    <span className={u.active ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {u.active ? 'Activo' : 'Desactivado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenEdit(u)}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar y Permisos</span>
                </button>

                <button
                  onClick={() => handleOpenQuickPassword(u)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-950/70 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Asignar o cambiar contraseña a este usuario"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clave</span>
                </button>

                {!isMasterAdmin && (
                  <button
                    onClick={() => handleToggleActive(u)}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-xl transition cursor-pointer ${
                      u.active
                        ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300'
                        : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Create / Edit Modal with all 19 Perms (Prompt Section 13) */}
      {(editingUser || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-5 py-3.5 border-b border-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-white text-base">
                  {isCreatingNew ? 'Registrar Nuevo Cobrador / Usuario' : `Configurar Permisos: ${name}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setIsCreatingNew(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="user-form" onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre Completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Roberto Alexander Martínez"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Nombre de Usuario</span>
                    <span className="text-[10px] text-slate-400 font-normal">Para ingresar al sistema</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Ej. roberto.martinez"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Electrónico <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={editingUser?.email === 'am0360136@gmail.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@financieraaaron.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+503 7123-4567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rol en el Sistema
                  </label>
                  <select
                    value={role}
                    disabled={editingUser?.email === 'am0360136@gmail.com'}
                    onChange={e => setRole(e.target.value as 'admin' | 'collector')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="collector">Cobrador</option>
                    <option value="admin">Administrador (Acceso total)</option>
                  </select>
                </div>

                {/* Contraseña de Acceso */}
                <div className="sm:col-span-2 p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isCreatingNew ? 'Contraseña de Acceso del Usuario' : 'Asignar / Cambiar Contraseña'}</span>
                      {isCreatingNew && <span className="text-rose-400">*</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pass = generateRandomPassword();
                        setPassword(pass);
                        setShowPassword(true);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Generar Contraseña</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={isCreatingNew}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isCreatingNew ? 'Mínimo 6 caracteres' : 'Dejar en blanco para mantener la contraseña actual'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                      title={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {isCreatingNew
                      ? 'El usuario utilizará este correo y esta contraseña para iniciar sesión en FINANCIERA AARON.'
                      : 'Escriba una nueva contraseña para actualizar las credenciales de este usuario o déjela en blanco si no desea cambiarla.'}
                  </p>
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-blue-400 uppercase tracking-wider text-[11px]">
                    Matriz de Permisos Individuales:
                  </label>
                  {role === 'admin' && (
                    <span className="text-[11px] text-amber-300 font-semibold">
                      * El Administrador posee todos los permisos automáticamente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  {permissionLabels.map(({ key, label }) => {
                    const isChecked = role === 'admin' || permissions[key];
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-blue-950/40 text-blue-200' : 'text-slate-400 hover:bg-slate-800/40'
                        } ${role === 'admin' ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        <input
                          type="checkbox"
                          disabled={role === 'admin'}
                          checked={isChecked}
                          onChange={() => handleTogglePermission(key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-800 border-slate-600"
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </form>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition"
              >
                {isSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Password Modal */}
      {quickPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Asignar / Cambiar Contraseña</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{quickPassUser.name} ({quickPassUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setQuickPassUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickError}</span>
              </div>
            )}

            {quickSuccess && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{quickSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold text-xs">
                    Nueva Contraseña de Acceso <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = generateRandomPassword();
                      setQuickNewPass(pass);
                      setQuickShowPass(true);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Generar Otra</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={quickShowPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={quickNewPass}
                    onChange={e => setQuickNewPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickShowPass(!quickShowPass)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                    title={quickShowPass ? 'Ocultar' : 'Mostrar'}
                  >
                    {quickShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botón para copiar credenciales y enviarlas por WhatsApp o SMS */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-white block">Compartir Credenciales</span>
                  <span className="text-[10px] text-slate-400">Copia usuario y clave para enviarle al cobrador</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg font-semibold shrink-0 transition border border-blue-900/60 cursor-pointer"
                >
                  {copiedQuickCreds ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQuickCreds ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickPassUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickPass}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSavingQuickPass ? 'Guardando...' : 'Guardar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
