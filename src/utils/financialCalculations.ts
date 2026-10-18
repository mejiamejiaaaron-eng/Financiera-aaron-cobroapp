import { Credit, Installment, InterestType, PaymentModality } from '../types';
import { calculateDaysOverdue, getNextDueDate } from './dateUtils';

export interface LoanCalculationParams {
  principal: number;
  interestRate: number; // e.g. 20 for 20%
  totalInstallments: number; // e.g. 24
  modality: PaymentModality; // 'diario' | 'semanal' | 'quincenal' | 'mensual'
  firstDueDate?: string; // YYYY-MM-DD
  customInstallmentAmount?: number; // Cuota personalizada fija (ej. 30.60)
  totalAmountToPay?: number; // Total explícito si se conoce
  interestType?: InterestType; // 'fijo' | 'simple' | 'sobre_saldo'
}

export interface LoanScheduleItem {
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
  isLastInstallment: boolean;
}

export interface LoanCalculationResult {
  principal: number;
  interestRate: number;
  totalInterest: number;
  totalAmountToPay: number;
  installmentAmount: number; // Cuota estándar (primeras n-1 cuotas)
  lastInstallmentAmount: number; // Última cuota (absorbe centavos sobrantes)
  hasPennyAdjustment: boolean;
  pennyDifference: number; // Diferencia entre última cuota y cuota estándar
  installments: LoanScheduleItem[];
  finalDueDate: string;
}

/**
 * Format currency with symbol and 2 fixed decimals
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  const rounded = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * MOTOR CENTRALIZADO DE CÁLCULO FINANCIERO (LoanCalculator)
 * 
 * Regla de Oro:
 * - Toda la lógica de cálculo (cuotas, plazos, tasas, cronograma y redondeos)
 *   reside exclusivamente en esta clase.
 * - Regla estricta de redondeo: Si la división genera centavos fraccionarios (ej. 33.3333),
 *   las primeras (N-1) cuotas son de $33.33 y la última absorbe la diferencia exacta ($33.41),
 *   garantizando que la suma del cronograma sea IDÉNTICA al Total a Pagar al céntimo.
 * - Si se provee una cuota fija oficial (ej. $30.60 de la tabla popular), el total es cuota * plazo ($734.40)
 *   y las cuotas se conservan intactas a $30.60.
 */
export class LoanCalculator {
  /**
   * Ejecuta el cálculo completo de un crédito y genera su cronograma exacto.
   */
  static calculate(params: LoanCalculationParams): LoanCalculationResult {
    const {
      principal: rawPrincipal,
      interestRate: rawRate,
      totalInstallments: rawInstallments,
      modality = 'diario',
      firstDueDate = new Date().toISOString().split('T')[0],
      customInstallmentAmount,
      totalAmountToPay: explicitTotal,
    } = params;

    const principal = Math.max(0, Math.round((Number(rawPrincipal) || 0) * 100) / 100);
    const totalInstallments = Math.max(1, Math.round(Number(rawInstallments) || 1));
    const interestRate = Math.max(0, Number(rawRate) || 0);

    if (principal <= 0) {
      return {
        principal: 0,
        interestRate: 0,
        totalInterest: 0,
        totalAmountToPay: 0,
        installmentAmount: 0,
        lastInstallmentAmount: 0,
        hasPennyAdjustment: false,
        pennyDifference: 0,
        installments: [],
        finalDueDate: firstDueDate,
      };
    }

    let totalAmountToPay: number;
    let totalInterest: number;
    let standardInstallment: number;
    let calculatedRate = interestRate;

    // CASO 1: Se proporciona una cuota personalizada fija (ej. Plan Popular Semanal $30.60 o simulador directo)
    if (customInstallmentAmount && customInstallmentAmount > 0) {
      standardInstallment = Math.round(customInstallmentAmount * 100) / 100;
      if (explicitTotal && explicitTotal > 0) {
        totalAmountToPay = Math.round(explicitTotal * 100) / 100;
      } else {
        totalAmountToPay = Math.round(standardInstallment * totalInstallments * 100) / 100;
      }
      totalInterest = Math.max(0, Math.round((totalAmountToPay - principal) * 100) / 100);
      if (principal > 0 && calculatedRate === 0) {
        calculatedRate = Math.round((totalInterest / principal) * 100 * 100) / 100;
      }
    } else if (explicitTotal && explicitTotal > 0) {
      // CASO 2: Se proporciona el total a pagar explícito
      totalAmountToPay = Math.round(explicitTotal * 100) / 100;
      totalInterest = Math.max(0, Math.round((totalAmountToPay - principal) * 100) / 100);
      // División estricta truncada a 2 decimales para que el remanente vaya a la última cuota
      standardInstallment = Math.floor((totalAmountToPay / totalInstallments) * 100) / 100;
      if (principal > 0 && calculatedRate === 0) {
        calculatedRate = Math.round((totalInterest / principal) * 100 * 100) / 100;
      }
    } else {
      // CASO 3: Cálculo por tasa de interés fija (Flat Rate estándar de microcrédito)
      totalInterest = Math.round(principal * (interestRate / 100) * 100) / 100;
      totalAmountToPay = Math.round((principal + totalInterest) * 100) / 100;
      
      // REGLA DE REDONDEO: Truncar cuota estándar al céntimo inferior para que la última cuota absorba los centavos sobrantes
      // Ejemplo: 800 / 24 = 33.3333 -> standardInstallment = 33.33
      standardInstallment = Math.floor((totalAmountToPay / totalInstallments) * 100) / 100;
    }

    // Cálculo estricto de la última cuota que absorbe centavos sobrantes
    const accumulatedFirstNMinusOne = Math.round(standardInstallment * (totalInstallments - 1) * 100) / 100;
    const lastInstallmentAmount = Math.round((totalAmountToPay - accumulatedFirstNMinusOne) * 100) / 100;
    const pennyDifference = Math.round((lastInstallmentAmount - standardInstallment) * 100) / 100;
    const hasPennyAdjustment = Math.abs(pennyDifference) > 0.001;

    // Generar cronograma completo de cuotas
    const installments: LoanScheduleItem[] = [];
    let currentDate = firstDueDate;

    for (let i = 1; i <= totalInstallments; i++) {
      const isLast = i === totalInstallments;
      const scheduledAmount = isLast ? lastInstallmentAmount : standardInstallment;

      installments.push({
        installmentNumber: i,
        dueDate: currentDate,
        scheduledAmount,
        isLastInstallment: isLast,
      });

      if (i < totalInstallments) {
        currentDate = getNextDueDate(currentDate, modality, false);
      }
    }

    return {
      principal,
      interestRate: calculatedRate,
      totalInterest,
      totalAmountToPay,
      installmentAmount: standardInstallment,
      lastInstallmentAmount,
      hasPennyAdjustment,
      pennyDifference,
      installments,
      finalDueDate: installments.length > 0 ? installments[installments.length - 1].dueDate : firstDueDate,
    };
  }

  // =========================================================================
  // MÉTODOS DE LECTURA DIRECTA DE LA BASE DE DATOS (SINGLE SOURCE OF TRUTH)
  // Las vistas NUNCA deben recalcular; deben usar estos lectores directos.
  // =========================================================================

  /**
   * Obtiene la cuota guardada en la base de datos (SSOT).
   * PROHIBIDO recalcular `Total / Cuotas`.
   */
  static getInstallmentAmount(credit: Pick<Credit, 'installmentAmount'>): number {
    return credit.installmentAmount;
  }

  /**
   * Obtiene la última cuota guardada o la estándar si no hay diferencia.
   */
  static getLastInstallmentAmount(credit: Pick<Credit, 'installmentAmount' | 'lastInstallmentAmount'>): number {
    return credit.lastInstallmentAmount ?? credit.installmentAmount;
  }

  /**
   * Obtiene el monto programado exacto de una cuota del cronograma.
   */
  static getInstallmentScheduledAmount(installment: Pick<Installment, 'scheduledAmount'>): number {
    return installment.scheduledAmount;
  }

  /**
   * Genera una descripción legible y fidedigna del plan de crédito
   * basada exclusivamente en lo que está guardado en la base de datos.
   */
  static formatSummary(credit: Credit, symbol = '$'): string {
    const isSingleRate =
      !credit.lastInstallmentAmount || credit.lastInstallmentAmount === credit.installmentAmount;

    if (isSingleRate) {
      return `${credit.totalInstallments} cuotas ${credit.modality}es de ${formatCurrency(credit.installmentAmount, symbol)}`;
    }

    return `${credit.totalInstallments} cuotas (${credit.totalInstallments - 1} de ${formatCurrency(credit.installmentAmount, symbol)} y última de ${formatCurrency(credit.lastInstallmentAmount ?? credit.installmentAmount, symbol)})`;
  }
}

/**
 * Función compatible hacia atrás que invoca el LoanCalculator centralizado
 */
export function calculateLoanSchedule(params: {
  principal: number;
  interestRate: number;
  interestType?: InterestType;
  modality: PaymentModality;
  totalInstallments: number;
  firstDueDate: string;
  customInstallmentAmount?: number;
  totalAmountToPay?: number;
}): LoanCalculationResult {
  return LoanCalculator.calculate({
    principal: params.principal,
    interestRate: params.interestRate,
    interestType: params.interestType || 'fijo',
    modality: params.modality,
    totalInstallments: params.totalInstallments,
    firstDueDate: params.firstDueDate,
    customInstallmentAmount: params.customInstallmentAmount,
    totalAmountToPay: params.totalAmountToPay,
  });
}

/**
 * Recalcula estados de cuotas y días de atraso en base a la fecha de referencia
 */
export function refreshInstallmentStatus(installment: Installment, referenceDate: string): Installment {
  const daysOverdue = calculateDaysOverdue(installment.dueDate, referenceDate);
  const isPastDue = daysOverdue > 0;

  let status = installment.status;
  if (installment.balance <= 0.001) {
    status = 'paid';
  } else if (installment.paidAmount > 0) {
    status = isPastDue ? 'overdue' : 'partial';
  } else if (isPastDue) {
    status = 'overdue';
  } else {
    status = 'pending';
  }

  return {
    ...installment,
    status,
    daysOverdue: status === 'paid' ? 0 : daysOverdue,
  };
}
