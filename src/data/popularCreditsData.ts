export interface PopularCreditPlan {
  monto: number;
  plazo_semanas: number;
  cuota: number;
  interes: number;
  tasa: string;
}

export interface PopularCreditRow {
  monto: number;
  tasaHasta10: string;
  tasa12Mas: string;
  cuotas: {
    [semanas: number]: number;
  };
}

export const POPULAR_CREDIT_WEEKS = [4, 6, 8, 10, 12, 16, 20, 24] as const;

export const POPULAR_CREDIT_ROWS: PopularCreditRow[] = [
  // Sección 1: 300 - 1000 (Tasa 65% / 60%)
  { monto: 300, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 83.31, 6: 58.15, 8: 45.56, 10: 38.03, 12: 32.81, 16: 26.54, 20: 22.79, 24: 20.39 } },
  { monto: 350, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 96.82, 6: 67.47, 8: 52.78, 10: 43.99, 12: 37.91, 16: 30.60, 20: 26.20, 24: 23.30 } },
  { monto: 400, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 109.76, 6: 76.22, 8: 59.44, 10: 49.38, 12: 42.44, 16: 34.07, 20: 29.06, 24: 25.73 } },
  { monto: 450, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 122.70, 6: 84.96, 8: 66.10, 10: 54.78, 12: 46.97, 16: 37.56, 20: 31.92, 24: 28.17 } },
  { monto: 500, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 135.66, 6: 93.71, 8: 72.74, 10: 60.18, 12: 51.50, 16: 41.04, 20: 34.78, 24: 30.60 } },
  { monto: 600, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 162.10, 6: 111.77, 8: 86.61, 10: 71.52, 12: 61.11, 16: 48.56, 20: 41.04, 24: 36.04 } },
  { monto: 650, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 175.04, 6: 120.51, 8: 93.26, 10: 76.92, 12: 65.63, 16: 52.04, 20: 43.90, 24: 38.48 } },
  { monto: 700, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 187.98, 6: 129.26, 8: 99.92, 10: 82.32, 12: 70.16, 16: 55.52, 20: 46.76, 24: 40.92 } },
  { monto: 750, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 202.07, 6: 139.15, 8: 107.70, 10: 88.85, 12: 75.81, 16: 60.13, 20: 50.74, 24: 44.49 } },
  { monto: 800, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 215.01, 6: 147.89, 8: 114.35, 10: 94.25, 12: 80.35, 16: 63.61, 20: 53.59, 24: 46.93 } },
  { monto: 850, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 227.95, 6: 156.65, 8: 121.01, 10: 99.64, 12: 84.88, 16: 67.10, 20: 56.45, 24: 49.37 } },
  { monto: 900, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 240.89, 6: 165.40, 8: 127.65, 10: 105.04, 12: 89.40, 16: 70.57, 20: 59.30, 24: 51.81 } },
  { monto: 1000, tasaHasta10: '65%', tasa12Mas: '60%', cuotas: { 4: 267.34, 6: 183.47, 8: 141.53, 10: 116.40, 12: 99.02, 16: 78.11, 20: 65.58, 24: 57.25 } },

  // Sección 2: 1200 - 2000 (Tasa 45% / 40%)
  { monto: 1200, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 315.83, 6: 215.36, 8: 165.13, 10: 135.00, 12: 114.20, 16: 89.12, 20: 74.08, 24: 64.08 } },
  { monto: 1300, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 341.44, 6: 232.61, 8: 178.20, 10: 145.55, 12: 123.01, 16: 95.84, 20: 79.56, 24: 68.72 } },
  { monto: 1400, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 367.06, 6: 249.84, 8: 191.24, 10: 156.01, 12: 131.83, 16: 102.56, 20: 85.02, 24: 73.35 } },
  { monto: 1500, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 392.66, 6: 267.09, 8: 204.30, 10: 166.65, 12: 140.63, 16: 109.28, 20: 90.50, 24: 77.98 } },
  { monto: 1600, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 418.29, 6: 284.33, 8: 217.36, 10: 177.18, 12: 149.44, 16: 116.00, 20: 95.96, 24: 82.61 } },
  { monto: 1700, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 443.90, 6: 301.57, 8: 230.41, 10: 187.73, 12: 158.26, 16: 122.72, 20: 101.43, 24: 87.24 } },
  { monto: 1800, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 469.50, 6: 318.80, 8: 243.46, 10: 198.27, 12: 167.06, 16: 129.44, 20: 106.90, 24: 91.88 } },
  { monto: 2000, tasaHasta10: '45%', tasa12Mas: '40%', cuotas: { 4: 520.72, 6: 353.28, 8: 269.58, 10: 219.36, 12: 184.69, 16: 142.88, 20: 117.83, 24: 101.14 } },

  // Sección 3: 2300 - 4000 (Tasa 36%)
  { monto: 2300, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 594.73, 6: 402.35, 8: 306.17, 10: 248.46, 12: 210.00, 16: 161.95, 20: 133.13, 24: 113.94 } },
  { monto: 2500, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 645.72, 6: 436.60, 8: 332.05, 10: 269.34, 12: 227.53, 16: 175.30, 20: 143.97, 24: 123.10 } },
  { monto: 2800, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 722.19, 6: 487.98, 8: 370.88, 10: 300.63, 12: 253.81, 16: 195.31, 20: 160.23, 24: 136.87 } },
  { monto: 3000, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 773.16, 6: 522.23, 8: 396.76, 10: 321.50, 12: 271.33, 16: 208.65, 20: 171.07, 24: 146.03 } },
  { monto: 3500, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 900.60, 6: 607.84, 8: 461.47, 10: 373.68, 12: 315.15, 16: 242.02, 20: 198.16, 24: 168.96 } },
  { monto: 4000, tasaHasta10: '36%', tasa12Mas: '36%', cuotas: { 4: 1028.06, 6: 693.46, 8: 526.19, 10: 425.84, 12: 358.96, 16: 275.39, 20: 225.27, 24: 191.88 } },
];

/**
 * Diccionario indexado por el valor de la cuota como clave (string a 2 decimales)
 */
export const POPULAR_CREDITS_BY_QUOTA: Record<
  string,
  { monto: number; plazo_semanas: number; interes: number; tasa: string }
> = {};

POPULAR_CREDIT_ROWS.forEach(row => {
  POPULAR_CREDIT_WEEKS.forEach(sem => {
    const cuota = row.cuotas[sem];
    if (cuota !== undefined) {
      const tasa = sem <= 10 ? row.tasaHasta10 : row.tasa12Mas;
      const total = Math.round(cuota * sem * 100) / 100;
      const interes = Math.round((total - row.monto) * 100) / 100;
      const key = cuota.toFixed(2);
      POPULAR_CREDITS_BY_QUOTA[key] = {
        monto: row.monto,
        plazo_semanas: sem,
        interes,
        tasa,
      };
    }
  });
});

/**
 * Obtener plan de crédito popular para un monto y semanas específicas
 */
export function getPopularCreditPlan(monto: number, semanas: number): PopularCreditPlan | null {
  const row = POPULAR_CREDIT_ROWS.find(r => r.monto === monto);
  if (!row) return null;
  const cuota = row.cuotas[semanas];
  if (cuota === undefined) return null;
  const tasa = semanas <= 10 ? row.tasaHasta10 : row.tasa12Mas;
  const total = Math.round(cuota * semanas * 100) / 100;
  const interes = Math.round((total - monto) * 100) / 100;
  return {
    monto,
    plazo_semanas: semanas,
    cuota,
    interes,
    tasa,
  };
}
