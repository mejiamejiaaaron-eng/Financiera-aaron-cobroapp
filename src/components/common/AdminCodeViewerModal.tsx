import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  X,
  Code2,
  Copy,
  Check,
  Download,
  Search,
  FileCode,
  AlertCircle,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCodeViewerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  // Password protection state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Editor states
  const [selectedFile, setSelectedFile] = useState<string>('src/components/credits/FastCreditSimulator.tsx');
  const [fileList, setFileList] = useState<string[]>([
    'src/components/credits/FastCreditSimulator.tsx',
    'src/components/credits/AddClientCreditModal.tsx',
    'src/data/popularCreditsData.ts',
    'src/App.tsx',
    'src/utils/financialCalculations.ts',
    'src/types/index.ts',
    'src/components/credits/PopularCreditsModal.tsx',
    'src/components/credits/PopularCreditsView.tsx',
    'server.ts',
    'package.json',
    'vite.config.ts',
  ]);
  const [codeContent, setCodeContent] = useState<string>('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isAuthenticated]);

  // Load code when authenticated and file changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchFileContent(selectedFile);
    }
  }, [isAuthenticated, selectedFile]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      if (password.trim() === 'admin123') {
        setIsAuthenticated(true);
        setErrorMessage('');
      } else {
        setErrorMessage('Acceso denegado: Contraseña de administrador incorrecta.');
      }
    }, 250);
  };

  const fetchFileContent = async (filePath: string) => {
    setIsLoadingCode(true);
    try {
      const res = await fetch(`/api/admin/source-code?file=${encodeURIComponent(filePath)}`, {
        headers: {
          'x-admin-password': 'admin123',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCodeContent(data.content || '');
      } else {
        setCodeContent(`// Error al cargar ${filePath} desde el servidor.\n// El archivo puede no existir o no tener permisos de lectura.`);
      }
    } catch {
      setCodeContent(`// Conexión directa no disponible para ${filePath}.\n// Verifique que el servidor esté activo.`);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadFile = () => {
    const filename = selectedFile.split('/').pop() || 'codigo.txt';
    const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setPassword('');
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. VENTANA DE AUTENTICACIÓN (SI NO HA INGRESADO PASSWORD) */}
      {/* ======================================================== */}
      {!isAuthenticated ? (
        <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 text-slate-100 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Acceso Administrador</h3>
              <p className="text-xs text-slate-400">Visor de Código Fuente de la Aplicación</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Esta sección es exclusiva para el administrador del sistema. Ingrese la clave de seguridad para inspeccionar y copiar el código fuente.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Ingrese contraseña..."
                  className={`w-full bg-slate-950 border rounded-xl pl-3 pr-10 py-2.5 text-sm text-white font-mono focus:outline-hidden transition ${
                    errorMessage
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-700 focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mensaje de error de contraseña incorrecta */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isVerifying || !password}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isVerifying ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Desbloquear</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. VENTANA PRINCIPAL DEL VISOR/EDITOR DE CÓDIGO */
        /* ======================================================== */
        <div
          className={`w-full bg-slate-950 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
            isFullscreen ? 'fixed inset-2 z-50 h-[calc(100vh-16px)]' : 'max-w-5xl h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    Visor de Código Fuente - Administrador
                  </h3>
                  <span className="px-2 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold rounded-md">
                    Modo Admin Activo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Explorador directo de archivos del proyecto FINANCIERA AARON
                </p>
              </div>
            </div>

            {/* Controles del Header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
                title="Copiar todo el código al portapapeles"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                title="Descargar archivo a tu dispositivo"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Descargar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 border border-slate-700 transition"
                title={isFullscreen ? 'Restaurar tamaño' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleLock}
                className="p-1.5 text-amber-400 hover:text-amber-300 rounded-lg bg-slate-800/80 border border-slate-700 transition"
                title="Bloquear acceso"
              >
                <Lock className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de herramientas: Selector de archivos y buscador */}
          <div className="px-3 sm:px-4 py-2 bg-slate-925 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Selector de Archivo */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400 font-medium">Archivo:</span>
              <select
                value={selectedFile}
                onChange={e => setSelectedFile(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500 flex-1"
              >
                {fileList.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchFileContent(selectedFile)}
                className="p-1 text-slate-400 hover:text-white rounded transition"
                title="Recargar archivo"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCode ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>

            {/* Buscador en código */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar palabra en código..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Área del Editor de Código */}
          <div className="flex-1 relative overflow-hidden bg-slate-950 flex flex-col">
            {isLoadingCode ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs">Cargando código de {selectedFile}...</span>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Editor Textarea Monospace */}
                <textarea
                  readOnly
                  value={codeContent}
                  spellCheck={false}
                  className="w-full h-full p-4 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-hidden selection:bg-blue-600/50 selection:text-white border-0"
                />
              </div>
            )}
          </div>

          {/* Footer del Editor */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-300">
                {selectedFile}
              </span>
              <span>•</span>
              <span>{codeContent.split('\n').length} líneas</span>
              <span>•</span>
              <span>{codeContent.length.toLocaleString()} caracteres</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-mono">
                Solo lectura y copia
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
