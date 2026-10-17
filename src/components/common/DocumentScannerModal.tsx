import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  User,
  CreditCard,
  Phone,
  MapPin,
  DollarSign,
  Maximize2,
  FlipHorizontal,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

export interface ExtractedClientCreditData {
  fullName?: string;
  dui?: string;
  phone?: string;
  address?: string;
  amount?: number;
  personalReferences?: string;
  notes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ExtractedClientCreditData) => void;
}

export const DocumentScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [activeMode, setActiveMode] = useState<'live' | 'camera' | 'gallery'>('live');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string>('');

  // Extracted verified fields state (Review step)
  const [extractedData, setExtractedData] = useState<ExtractedClientCreditData | null>(null);
  const [verifName, setVerifName] = useState('');
  const [verifDui, setVerifDui] = useState('');
  const [verifPhone, setVerifPhone] = useState('');
  const [verifAddress, setVerifAddress] = useState('');
  const [verifAmount, setVerifAmount] = useState<string>('');
  const [verifNotes, setVerifNotes] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start live camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      setCameraError('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Tu navegador no soporta acceso directo a la cámara. Usa la cámara del teléfono o la galería.');
        setActiveMode('camera');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Could not start live camera stream:', err);
      setCameraError(
        'No se pudo acceder a la cámara en vivo. Puedes usar la cámara nativa de tu teléfono o tu galería de fotos con los botones abajo.'
      );
      setActiveMode('camera');
    }
  }, [stream]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setExtractedData(null);
      setProcessError('');
      if (activeMode === 'live') {
        startCamera(cameraFacing);
      }
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, activeMode, cameraFacing, startCamera, stopStream]);

  // Capture photo from live video feed
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopStream();
    processImageWithOCR(dataUrl);
  };

  // Handle file or native phone camera photo
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        setCapturedImage(result);
        stopStream();
        processImageWithOCR(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle front/back camera
  const handleToggleCamera = () => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(newFacing);
    startCamera(newFacing);
  };

  // Send image to backend Gemini OCR endpoint
  const processImageWithOCR = async (base64Image: string) => {
    setIsProcessing(true);
    setProcessError('');

    try {
      const response = await fetch('/api/ocr-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en servidor (${response.status})`);
      }

      const resJson = await response.json();
      if (!resJson.success || !resJson.data) {
        throw new Error(resJson.error || 'No se pudieron extraer los datos del documento.');
      }

      const data = resJson.data as ExtractedClientCreditData;
      setExtractedData(data);

      // Pre-fill verification form fields
      setVerifName(data.fullName || '');
      setVerifDui(data.dui || '');
      setVerifPhone(data.phone || '');
      setVerifAddress(data.address || '');
      setVerifAmount(data.amount ? String(data.amount) : '');
      setVerifNotes(data.notes || data.personalReferences || '');
    } catch (err: any) {
      console.warn('OCR processing fallback triggered:', err);
      setProcessError(
        'El reconocimiento automático no pudo leer todo el documento o está fuera de línea. Puedes ingresar los datos manualmente a continuación.'
      );
      // Still allow manual input with preview
      setExtractedData({});
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to take another picture
  const handleRetake = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setProcessError('');
    if (activeMode === 'live') {
      startCamera(cameraFacing);
    }
  };

  // User confirmed the verified data
  const handleConfirmAndApply = () => {
    const cleanedData: ExtractedClientCreditData = {
      fullName: verifName.trim(),
      dui: verifDui.trim(),
      phone: verifPhone.trim(),
      address: verifAddress.trim(),
      amount: verifAmount ? parseFloat(verifAmount) : undefined,
      notes: verifNotes.trim(),
    };

    onApplyData(cleanedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-blue-600/60 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 px-5 py-3.5 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/40">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Escanear Documento con Cámara</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/40">
                  OCR IA
                </span>
              </h3>
              <p className="text-xs text-blue-300">
                Captura DUI, pagaré, recibo o libreta para llenar el crédito automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Cerrar cámara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Canvas for capture rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STEP 1: Camera or Upload View (if no captured image) */}
          {!capturedImage && (
            <div className="space-y-4">
              {/* Camera & Gallery Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('live');
                    startCamera(cameraFacing);
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeMode === 'live'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cámara en Vivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('camera');
                    stopStream();
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeMode === 'camera'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Cámara Celular</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('gallery');
                    stopStream();
                    // Direct trigger for mobile gallery
                    galleryInputRef.current?.click();
                  }}
                  className={`flex-1 py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeMode === 'gallery'
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Galería del Celular</span>
                </button>
              </div>

              {/* Mode: Live Camera */}
              {activeMode === 'live' && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-4/3 max-h-[380px] flex items-center justify-center shadow-inner">
                    {cameraError ? (
                      <div className="p-6 text-center text-xs space-y-3">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-slate-300 leading-relaxed">{cameraError}</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition inline-flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Cámara del Celular</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition inline-flex items-center justify-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>Abrir Galería de Fotos</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Viewfinder Target Overlay */}
                        <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-sky-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3 bg-sky-950/10 backdrop-blur-[1px]">
                          <div className="flex justify-between items-start text-[11px] text-sky-200 font-mono font-semibold bg-slate-950/70 px-2.5 py-1 rounded-md self-center">
                            <span>Alinea el DUI, Pagaré o Recibo aquí</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="w-4 h-4 border-b-2 border-l-2 border-sky-400" />
                            <span className="w-4 h-4 border-b-2 border-r-2 border-sky-400" />
                          </div>
                        </div>

                        {/* Top Controls: Flip camera */}
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs border border-white/20 transition cursor-pointer"
                          title="Cambiar Cámara (Frontal / Trasera)"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Live Shutter & Quick Gallery Controls */}
                  {!cameraError && (
                    <div className="flex items-center justify-around px-4 pt-1">
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className="flex flex-col items-center gap-1 text-[10px] text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
                        title="Cambiar Cámara Trasera / Frontal"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <FlipHorizontal className="w-4 h-4 text-blue-300" />
                        </div>
                        <span>Girar</span>
                      </button>

                      {/* Main Big Shutter Button */}
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40 border-4 border-slate-900 transition active:scale-95 cursor-pointer"
                        title="Tomar Foto"
                      >
                        <div className="w-7 h-7 rounded-full bg-white group-hover:scale-90 transition" />
                      </button>

                      {/* Quick Mobile Gallery Shortcut */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center gap-1 text-[10px] text-emerald-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
                        title="Abrir Galería de Fotos del Celular"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="font-semibold">Galería</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Native Mobile Camera App */}
              {activeMode === 'camera' && (
                <div className="p-6 sm:p-8 bg-slate-950 rounded-2xl border border-blue-700/60 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">Cámara Nativa del Celular (Alta Resolución)</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Abre la aplicación de cámara de tu teléfono Android para tomar una foto nítida del documento o recibo.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95 inline-flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Cámara del Teléfono</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl border border-emerald-700/50 transition active:scale-95 inline-flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Elegir de Galería</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode: Phone Photo Gallery (Galería del Celular) */}
              {activeMode === 'gallery' && (
                <div className="p-6 sm:p-8 bg-slate-950 rounded-2xl border border-emerald-600/60 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">Galería de Fotos del Celular</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Elige una foto de tu galería de Android, captura de pantalla, WhatsApp, o archivo guardado de DUI o pagaré.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95 inline-flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Seleccionar Foto de la Galería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition active:scale-95 inline-flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Tomar Foto con Cámara</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden Inputs: 1 for Native Camera, 1 for Phone Gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* STEP 2: Processing OCR State */}
          {capturedImage && isProcessing && (
            <div className="py-12 px-6 text-center space-y-4 bg-slate-950 rounded-2xl border border-blue-800/60">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-sm">Analizando Documento con Inteligencia Artificial</h4>
                <p className="text-xs text-blue-300">
                  Extrayendo nombre, DUI salvadoreño, número de teléfono y monto del crédito...
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Mandatory Verification Form */}
          {capturedImage && !isProcessing && (
            <div className="space-y-4">
              {/* Photo Preview & Retake Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={capturedImage}
                    alt="Documento capturado"
                    className="w-12 h-12 object-cover rounded-lg border border-blue-500/50"
                  />
                  <div>
                    <span className="font-bold text-white block">Documento Capturado</span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Texto procesado
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tomar otra foto</span>
                </button>
              </div>

              {processError && (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{processError}</span>
                </div>
              )}

              {/* Verification Form (Flujo Obligatorio) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-800/60 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h4 className="font-bold text-white">Revisión y Verificación de Datos Extraídos</h4>
                  </div>
                  <span className="text-[11px] text-amber-300 font-medium">
                    * Verifique y corrija antes de insertar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Nombre Completo del Cliente</span>
                    </label>
                    <input
                      type="text"
                      value={verifName}
                      onChange={e => setVerifName(e.target.value)}
                      placeholder="Ej. Juan Antonio Martínez Cruz"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>DUI o Identificación</span>
                    </label>
                    <input
                      type="text"
                      value={verifDui}
                      onChange={e => setVerifDui(e.target.value)}
                      placeholder="00000000-0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Teléfono de Contacto</span>
                    </label>
                    <input
                      type="tel"
                      value={verifPhone}
                      onChange={e => setVerifPhone(e.target.value)}
                      placeholder="Ej. 7123-4567"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Capital / Monto Detectado ($)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={verifAmount}
                      onChange={e => setVerifAmount(e.target.value)}
                      placeholder="Ej. 300.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-emerald-400 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dirección</span>
                    </label>
                    <input
                      type="text"
                      value={verifAddress}
                      onChange={e => setVerifAddress(e.target.value)}
                      placeholder="Colonia, Barrio, Municipio"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Notas / Referencias Detectadas</span>
                    </label>
                    <input
                      type="text"
                      value={verifNotes}
                      onChange={e => setVerifNotes(e.target.value)}
                      placeholder="Referencias personales, ocupación o anotaciones"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
          >
            Cancelar
          </button>

          {capturedImage && !isProcessing && (
            <button
              type="button"
              onClick={handleConfirmAndApply}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Aplicar Datos a Nuevo Crédito</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
