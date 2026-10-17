import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  onOpenDeployGuide?: () => void;
}

export const PWAInstallBanner: React.FC<Props> = ({ onOpenDeployGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 border-b border-blue-800/80 px-4 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <span className="font-semibold text-white">Instalar FINANCIERA AARON en Android</span>
              <span className="hidden sm:inline text-blue-200/80 ml-2">
                — Acceso directo con icono propio y funcionamiento a pantalla completa sin Google AI Studio.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar en Teléfono</span>
              </button>
            )}

            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-200 border border-blue-700/60 font-medium px-3 py-1.5 rounded-lg text-xs transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Paso a Paso Android</span>
            </button>

            {onOpenDeployGuide && (
              <button
                onClick={onOpenDeployGuide}
                className="flex items-center gap-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-medium px-3 py-1.5 rounded-lg text-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Publicar URL Propia</span>
              </button>
            )}

            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition"
              title="Ocultar barra"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guía Paso a Paso Android */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-blue-700/60 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Instalar en tu Celular Android</h3>
                  <p className="text-xs text-blue-300">FINANCIERA AARON como app independiente</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="bg-blue-950/60 border border-blue-800/80 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-blue-200 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Sin instalar Google AI Studio</span>
                </div>
                <p className="text-xs text-blue-200/90 leading-relaxed">
                  Esta aplicación está configurada como una <strong>PWA (Progressive Web App)</strong>. Cuando la instalas, crea su propio icono con el escudo de FINANCIERA AARON en tu pantalla de inicio y se abre a pantalla completa como una app nativa de Android.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Abre el enlace en Google Chrome</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Desde tu celular Android, abre Google Chrome y pega la URL de tu aplicación (la URL compartida o tu propio dominio desplegado).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Toca el menú de opciones (⋮)</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      En la esquina superior derecha de Google Chrome, pulsa los 3 puntos verticales.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Selecciona &quot;Instalar aplicación&quot; o &quot;Agregar a la pantalla principal&quot;</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Chrome te mostrará la confirmación con el nombre <strong>CobrosApp</strong> y el icono oficial de la financiera. Pulsa <strong>&quot;Instalar&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-300">¡Listo para usar!</h4>
                    <p className="text-xs text-emerald-200/90 mt-0.5">
                      Busca el icono de FINANCIERA AARON entre tus apps. Al abrirlo, se ejecuta como aplicación independiente, sin barras del navegador.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-end">
              {onOpenDeployGuide && (
                <button
                  onClick={() => {
                    setShowGuideModal(false);
                    onOpenDeployGuide();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Ver Guía para Desplegar con Dominio Propio
                </button>
              )}
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
