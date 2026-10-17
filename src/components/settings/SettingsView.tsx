import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Smartphone,
  Globe,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Download,
  UploadCloud,
  RefreshCw,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AppSettings, PaymentModality } from '../../types';
import { ClearSystemPasswordModal } from './ClearSystemPasswordModal';

export const SettingsView: React.FC = () => {
  const {
    database,
    handleUpdateSettings,
    exportDatabaseJson,
    importDatabaseJson,
    handleResetDemo,
    handleClearToCleanState,
  } = useApp();
  const { currentUser, isAdmin, updateMyPassword } = useAuth();
  const settings = database.settings;

  const [activeTab, setActiveTab] = useState<'deploy' | 'branding' | 'backup' | 'security'>('deploy');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);

  // Security & Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Branding states
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [brandSubtitle, setBrandSubtitle] = useState(settings.brandSubtitle);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [contactAddress, setContactAddress] = useState(settings.contactAddress);
  const [receiptNotice, setReceiptNotice] = useState(settings.receiptNotice);
  const [defaultInterestRate, setDefaultInterestRate] = useState(settings.defaultInterestRate);
  const [defaultModality, setDefaultModality] = useState<PaymentModality>(settings.defaultModality);
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Handle image upload from computer or phone (Prompt Section 14)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2 MB de tamaño.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await handleUpdateSettings({
        businessName,
        brandSubtitle,
        contactPhone,
        contactAddress,
        receiptNotice,
        defaultInterestRate,
        defaultModality,
        logoUrl: logoPreview,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importDatabaseJson(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
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
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const res = await updateMyPassword(currentPassword, newPassword);
      if (!res.success) {
        setPasswordError(res.error || 'Error al cambiar la contraseña.');
        return;
      }
      setPasswordSuccess('¡Su contraseña de administrador ha sido actualizada con éxito!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error al cambiar contraseña.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-500" />
          <span>Configuración y Publicación Independiente</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Guía para desplegar tu aplicación en Android con URL propia, personalización de marca y respaldos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-xl p-1 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'deploy'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-sky-300" />
          <span>Publicar y Usar en Android (Sin AI Studio)</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Marca y Logotipo</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Copia de Seguridad y Respaldo</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-300" />
          <span>Mi Contraseña y Seguridad</span>
        </button>
      </div>

      {/* TAB 1: GUÍA DE PUBLICACIÓN E INSTALACIÓN ANDROID */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          {/* Banner Resumen */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-700/60 rounded-2xl p-5 md:p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black">
                  Cómo tener tu propia URL y abrir la App en Android
                </h2>
                <p className="text-xs text-blue-200">
                  Despliegue independiente sin Google AI Studio: instala tu propio icono y úsala en tu celular
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-slate-950/70 rounded-xl border border-blue-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">URL actual de previsualización:</span>
                <span className="font-mono text-blue-300 font-bold select-all break-all">
                  {window.location.origin}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shrink-0 transition"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? '¡Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
          </div>

          {/* Guía Paso a Paso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paso 1: Opciones de Alojamiento */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                  1
                </div>
                <h3>Obtener tu Dominio o URL Pública Propia</h3>
              </div>

              <p className="text-slate-300 leading-relaxed">
                Para que la app funcione sin depender de AI Studio, puedes publicarla en cualquiera de estos servicios gratuitos en menos de 3 minutos:
              </p>

              <div className="space-y-2 pt-1">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-750">
                  <div className="flex items-center justify-between font-bold text-white mb-1">
                    <span>Opción A: Vercel (Recomendada y 100% Gratis)</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.2 rounded border border-emerald-800">
                      Más Fácil
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. Crea una cuenta gratis en <strong>vercel.com</strong>.<br />
                    2. Importa este proyecto de GitHub o sube la carpeta.<br />
                    3. Pulsa <strong>&quot;Deploy&quot;</strong>. Vercel te entrega una URL como <code className="text-blue-300">financiera-aaron.vercel.app</code> o puedes vincularle tu propio dominio <code className="text-blue-300">financieraaaron.com</code>.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-750">
                  <div className="font-bold text-white mb-1">
                    <span>Opción B: Firebase Hosting o Netlify</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ejecuta <code className="text-slate-200">npm run build</code> y sube la carpeta <code className="text-slate-200">dist</code> a Firebase Hosting (<code className="text-blue-300">firebase deploy</code>) o Netlify Drop.
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 2: Instalación en el celular Android */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  2
                </div>
                <h3>Instalarla en tu Celular Android (PWA)</h3>
              </div>

              <p className="text-slate-300 leading-relaxed">
                Una vez tengas tu URL, sigue estos 3 pasos desde tu teléfono:
              </p>

              <div className="space-y-2 pt-1">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-750 space-y-1">
                  <span className="font-bold text-white block">A. Abre Chrome en Android</span>
                  <p className="text-[11px] text-slate-400">
                    Ingresa a tu URL (ej. <code className="text-blue-300">financiera-aaron.vercel.app</code>) desde el navegador Google Chrome de tu teléfono.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-750 space-y-1">
                  <span className="font-bold text-white block">B. Pulsa el Menú (⋮) de Chrome</span>
                  <p className="text-[11px] text-slate-400">
                    Toca los 3 puntos arriba a la derecha y selecciona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a la pantalla principal&quot;</strong>.
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/80 space-y-1">
                  <span className="font-bold text-emerald-300 block">C. ¡Listo! Icono Propio en tu Celular</span>
                  <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                    Aparecerá el icono oficial con el escudo de FINANCIERA AARON en tu pantalla de inicio. Se abre a pantalla completa, exactamente como una app nativa descargada de Google Play Store, y almacena tus datos de forma segura.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARCA Y LOGOTIPO (Prompt Section 14) */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-5 text-xs">
          <div>
            <h2 className="text-sm font-bold text-white">Configuración de Marca y Logotipo</h2>
            <p className="text-slate-400 mt-0.5">
              Personaliza el nombre de tu financiera, el logotipo y la información de los recibos
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Configuración y logotipo guardados con éxito! Se han actualizado todas las pantallas.</span>
            </div>
          )}

          {/* Logo Upload Section */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-750 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-950 border-2 border-blue-600/50 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-500" />
              )}
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <h3 className="font-bold text-white">Logotipo de la Financiera</h3>
              <p className="text-[11px] text-slate-400">
                Seleccione una imagen PNG, JPG o SVG desde su teléfono o computadora. Se actualizará en el encabezado, menú y en todos los tickets impresos.
              </p>

              <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Cargar Nueva Imagen de Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Brand Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre Comercial</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Subtítulo / Eslogan</label>
              <input
                type="text"
                value={brandSubtitle}
                onChange={e => setBrandSubtitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Teléfono de Contacto</label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Dirección Oficial</label>
              <input
                type="text"
                value={contactAddress}
                onChange={e => setContactAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Leyenda en Recibos y Comprobantes</label>
              <input
                type="text"
                value={receiptNotice}
                onChange={e => setReceiptNotice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tasa de Interés Sugerida por Defecto (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={defaultInterestRate}
                onChange={e => setDefaultInterestRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Modalidad Predeterminada</label>
              <select
                value={defaultModality}
                onChange={e => setDefaultModality(e.target.value as PaymentModality)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !isAdmin}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios de Marca'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: COPIA DE SEGURIDAD Y RESPALDO */}
      {activeTab === 'backup' && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-white">Respaldo y Copias de Seguridad</h2>
            <p className="text-slate-400 mt-0.5">
              Descarga una copia completa de tus clientes, préstamos y pagos en formato seguro JSON para nunca perder información.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Exportar */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-750 space-y-3">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar Copia de Seguridad</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Descarga un archivo con toda la base de datos (clientes, créditos, cuotas, cobradores, pagos y auditoría). Puedes guardarlo en tu Google Drive o memoria USB.
              </p>
              <button
                onClick={exportDatabaseJson}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo JSON de Respaldo</span>
              </button>
            </div>

            {/* Importar */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-750 space-y-3">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-400" />
                <span>Restaurar Copia de Seguridad</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Si cambias de celular o necesitas recuperar datos anteriores, selecciona el archivo JSON de copia descargado previamente.
              </p>
              <label className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-800 font-bold rounded-xl cursor-pointer transition">
                <UploadCloud className="w-4 h-4" />
                <span>Cargar Archivo JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Opciones de Administración de la Base de Datos */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-700/80 space-y-3">
              {cleanSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>¡Listo! Tu sistema FINANCIERA AARON ha quedado limpio y en blanco ($0.00) para comenzar tu operación real.</span>
                </div>
              )}

              {/* Opción 1: Iniciar Sistema en Blanco */}
              <div className="p-4 bg-rose-950/20 border border-rose-900/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">Iniciar Sistema en Blanco (Sin datos de prueba)</span>
                    <span className="px-2 py-0.5 text-[10px] bg-rose-900/60 text-rose-300 font-bold rounded-full border border-rose-700/60">
                      Operación Real
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
                    Vacia todos los clientes, créditos y pagos de prueba para que tu financiera quede con saldo $0.00 y 0 clientes, lista para registrar tus clientes y créditos reales. Requiere tu contraseña de administrador para autorizarse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition shrink-0 flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar y Empezar en Blanco</span>
                </button>
              </div>

              {/* Opción 2: Restablecer Demo */}
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Restablecer Datos de Demostración</span>
                  <span className="text-[11px] text-slate-400">
                    Carga los clientes y créditos de ejemplo iniciales si deseas hacer pruebas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Desea restablecer los datos de demostración? Se repondrán los clientes y cuotas de prueba.')) {
                      handleResetDemo();
                      alert('Datos de demostración restablecidos con éxito.');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cargar Datos Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SEGURIDAD Y MI CONTRASEÑA */}
      {activeTab === 'security' && (
        <div className="max-w-xl space-y-5 text-xs">
          <form onSubmit={handleUpdatePasswordSubmit} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Actualizar Mi Contraseña de Administrador</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cambie su contraseña de acceso a la plataforma ({currentUser?.email})
              </p>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2">
                <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
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
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                  title={showCurrentPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                  title={showNewPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Utilice una contraseña segura de al menos 6 caracteres.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Confirmar Nueva Contraseña <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita su nueva contraseña"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isUpdatingPassword ? 'Actualizando...' : 'Actualizar Mi Contraseña'}</span>
              </button>
            </div>
          </form>

          {/* Tips de seguridad */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2 text-slate-400">
            <span className="font-bold text-white text-xs block">Políticas de Seguridad de Contraseñas:</span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>La contraseña protege el acceso administrativo y la autorización de reinicio de la base de datos.</li>
              <li>Recomendamos incluir letras mayúsculas, minúsculas, números y símbolos especiales.</li>
              <li>Nunca comparta su clave de administrador con cobradores u otras personas.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Clear System Password Confirmation Modal */}
      <ClearSystemPasswordModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmSuccess={() => {
          handleClearToCleanState();
          setCleanSuccess(true);
          setTimeout(() => setCleanSuccess(false), 6000);
        }}
      />
    </div>
  );
};
