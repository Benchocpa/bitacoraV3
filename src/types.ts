export type Estrategia = "CSP" | "CC" | string;
export type Estado = "Abierta" | "Roleada" | "Cerrada" | "Asignada" | string;
export type TipoMovimiento =
  | "apertura"
  | "roll"
  | "cierre"
  | "asignacion"
  | string;

export interface Operacion {
  id: number;
  fecha_evento: string;
  ticker: string;
  estrategia: Estrategia;
  contratos: number;
  strike: number;
  precio_apertura?: number | null;
  precio_actual?: number | null;
  prima_recibida: number;
  comision: number;
  costo_cierre: number;
  fecha_inicio: string;
  fecha_vencimiento?: string | null;
  fecha_cierre?: string | null;
  estado: Estado;
  tipo_movimiento: TipoMovimiento;
  cadena_id: string;
  es_posicion_actual: boolean;
  nota?: string | null;
}

export interface OperacionFormData {
  fecha_inicio: string;
  fecha_vencimiento?: string;
  ticker: string;
  estrategia: Estrategia;
  contratos: number;
  strike: number;
  precio_apertura?: number;
  prima_recibida: number;
  comision: number;
  nota?: string;
}

export interface RollPayload {
  id: number;
  nuevaFechaInicio: string;
  nuevaFechaVencimiento?: string;
  nuevoStrike: number;
  nuevaPrima: number;
  nuevaComision: number;
  costoCierreActual: number;
  precioActual?: number;
  nota?: string;
}

export interface CierrePayload {
  id: number;
  fecha_cierre: string;
  costo_cierre: number;
  comision: number;
  precio_actual?: number;
  nota?: string;
}

export interface AsignacionPayload {
  id: number;
  fecha_cierre: string;
  precio_actual: number;
  nota?: string;
}

export interface OperacionCalculada extends Operacion {
  neto: number;
  roi: number;
}
