import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to get server-side Gemini client with recommended telemetry User-Agent
function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint for OCR Document Scanner
app.post('/api/ocr-scan', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen para procesar.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'La variable de entorno GEMINI_API_KEY no está configurada en el servidor. Configure la clave para usar el escaneo OCR asistido por IA.',
        fallback: true,
      });
    }

    const ai = getGeminiClient();

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Actúa como un asistente experto en reconocimiento óptico de caracteres (OCR) para la empresa salvadoreña "FINANCIERA AARON".
Analiza minuciosamente esta imagen, que puede ser un DUI (Documento Único de Identidad de El Salvador), un pagaré, factura, contrato de préstamo, recibo de cobro o nota manuscrita.
Extrae todos los datos que identifiques y devuélvelos en formato JSON estricto con los siguientes campos:

{
  "fullName": string | null,        // Nombre completo de la persona o cliente
  "dui": string | null,             // DUI salvadoreño en formato exacto "00000000-0" (8 dígitos, guion y 1 dígito de control)
  "phone": string | null,           // Número de teléfono fijo o celular (ej. "+503 7123-4567" o "7123-4567")
  "address": string | null,         // Dirección residencial, comercial, colonia, municipio o departamento
  "amount": number | null,          // Monto del crédito, capital prestado o cantidad adeudada en dólares (ej. 350)
  "personalReferences": string | null, // Nombre de cónyuge, fiador, familiar o referencia personal
  "notes": string | null            // Notas adicionales detectadas como ocupación, fecha de nacimiento o firma
}

Instrucciones estrictas:
- Si un campo no es visible o no estás seguro, usa null.
- Limpia cualquier carácter espurio.
- No incluyas bloques de markdown extras ni explicaciones; responde ÚNICAMENTE con el objeto JSON válido.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawOutput = response.text || '{}';
    let extractedData = {};
    try {
      extractedData = JSON.parse(rawOutput);
    } catch {
      const sanitized = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      extractedData = JSON.parse(sanitized);
    }

    return res.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error('OCR Gemini API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Error al procesar el documento con inteligencia artificial.',
      fallback: true,
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'FINANCIERA AARON API',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Admin Secret Source Code Endpoints (Password: admin123)
app.get('/api/admin/files-list', (req, res) => {
  const authHeader = req.headers['x-admin-password'] || req.query.password;
  if (authHeader !== 'admin123') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const files = [
    'src/components/credits/AddClientCreditModal.tsx',
    'src/components/credits/FastCreditSimulator.tsx',
    'src/data/popularCreditsData.ts',
    'src/App.tsx',
    'src/utils/financialCalculations.ts',
    'src/types/index.ts',
    'src/components/credits/PopularCreditsModal.tsx',
    'src/components/credits/PopularCreditsView.tsx',
    'src/context/AppContext.tsx',
    'src/context/AuthContext.tsx',
    'server.ts',
    'package.json',
    'vite.config.ts',
  ];

  return res.json({ success: true, files });
});

app.get('/api/admin/source-code', async (req, res) => {
  const authHeader = req.headers['x-admin-password'] || req.query.password;
  if (authHeader !== 'admin123') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const requestedFile = (req.query.file as string) || 'src/components/credits/FastCreditSimulator.tsx';
  const normalized = path.normalize(requestedFile).replace(/^(\.\.(\/|\\|$))+/, '');
  const absoluteTarget = path.resolve(__dirname, normalized);

  if (!absoluteTarget.startsWith(__dirname)) {
    return res.status(400).json({ error: 'Ruta de archivo no permitida' });
  }

  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(absoluteTarget, 'utf-8');
    return res.json({ success: true, file: normalized, content });
  } catch (err: any) {
    return res.status(404).json({ error: 'Archivo no encontrado', details: err?.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  // Serve static files from public directory
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FINANCIERA AARON Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
