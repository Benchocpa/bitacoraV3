import { supabase } from "../lib/supabaseClient";
import {
  AsignacionPayload,
  CierrePayload,
  Operacion,
  OperacionCalculada,
  OperacionFormData,
  RollPayload,
} from "../types";

const TABLE = "historial_operaciones";

const toNumber = (value: unknown) => {
  const num =
    typeof value === "string" ? Number.parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const parseOperacion = (row: any): Operacion => ({
  id: Number(row.id),
  fecha_evento: row.fecha_evento,
  ticker: row.ticker,
  estrategia: row.estrategia,
  contratos: Number(row.contratos),
  strike: toNumber(row.strike),
  precio_apertura:
    row.precio_apertura === null || row.precio_apertura === undefined
      ? null
      : toNumber(row.precio_apertura),
  precio_actual:
    row.precio_actual === null || row.precio_actual === undefined
      ? null
      : toNumber(row.precio_actual),
  prima_recibida: toNumber(row.prima_recibida),
  comision: toNumber(row.comision),
  costo_cierre: toNumber(row.costo_cierre),
  fecha_inicio: row.fecha_inicio,
  fecha_vencimiento: row.fecha_vencimiento,
  fecha_cierre: row.fecha_cierre,
  estado: row.estado,
  tipo_movimiento: row.tipo_movimiento,
  cadena_id: row.cadena_id,
  es_posicion_actual: Boolean(row.es_posicion_actual),
  nota: row.nota,
});

const addCalculos = (op: Operacion): OperacionCalculada => {
  const neto = op.prima_recibida - (op.comision + op.costo_cierre);
  const capital = op.contratos * 100 * op.strike;
  const roi = capital > 0 ? neto / capital : 0;
  return { ...op, neto, roi };
};

export async function getOperacionesActuales(): Promise<OperacionCalculada[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("es_posicion_actual", true)
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => addCalculos(parseOperacion(row)));
}

export async function getHistorialCompleto(): Promise<OperacionCalculada[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("fecha_evento", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => addCalculos(parseOperacion(row)));
}

export async function crearOperacion(
  payload: OperacionFormData
): Promise<OperacionCalculada | null> {
  const cadena_id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        ...payload,
        fecha_vencimiento: payload.fecha_vencimiento || null,
        precio_apertura: payload.precio_apertura ?? null,
        precio_actual: null,
        costo_cierre: 0,
        tipo_movimiento: "apertura",
        estado: "Abierta",
        es_posicion_actual: true,
        cadena_id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data ? addCalculos(parseOperacion(data)) : null;
}

export async function actualizarOperacion(
  id: number,
  payload: OperacionFormData
): Promise<OperacionCalculada | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...payload,
      fecha_vencimiento: payload.fecha_vencimiento || null,
      precio_apertura: payload.precio_apertura ?? null,
      nota: payload.nota ?? null,
    })
    .eq("id", id)
    .eq("es_posicion_actual", true)
    .select()
    .single();

  if (error) throw error;
  return data ? addCalculos(parseOperacion(data)) : null;
}

export async function rollOperacion(payload: RollPayload) {
  const { data: current, error: currentError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", payload.id)
    .eq("es_posicion_actual", true)
    .single();

  if (currentError) throw currentError;
  if (!current) throw new Error("Operación no encontrada para roll.");

  const currentParsed = parseOperacion(current);
  const updatedComision = currentParsed.comision + payload.nuevaComision;
  const updatedCostoCierre =
    currentParsed.costo_cierre + payload.costoCierreActual;

  const updateRes = await supabase
    .from(TABLE)
    .update({
      es_posicion_actual: false,
      estado: "Roleada",
      tipo_movimiento: "roll",
      fecha_cierre: payload.nuevaFechaInicio,
      costo_cierre: updatedCostoCierre,
      comision: updatedComision,
      precio_actual: payload.precioActual ?? currentParsed.precio_actual ?? null,
      nota: payload.nota ?? currentParsed.nota ?? null,
    })
    .eq("id", payload.id)
    .eq("es_posicion_actual", true);

  if (updateRes.error) throw updateRes.error;

  const { data: inserted, error: insertError } = await supabase
    .from(TABLE)
    .insert([
      {
        ticker: currentParsed.ticker,
        estrategia: currentParsed.estrategia,
        contratos: currentParsed.contratos,
        strike: payload.nuevoStrike,
        precio_apertura: payload.precioActual ?? currentParsed.precio_apertura,
        precio_actual: null,
        prima_recibida: payload.nuevaPrima,
        comision: payload.nuevaComision,
        costo_cierre: 0,
        fecha_inicio: payload.nuevaFechaInicio,
        fecha_vencimiento: payload.nuevaFechaVencimiento || null,
        fecha_cierre: null,
        estado: "Abierta",
        tipo_movimiento: "roll",
        cadena_id: currentParsed.cadena_id,
        es_posicion_actual: true,
        nota: payload.nota ?? null,
      },
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted ? addCalculos(parseOperacion(inserted)) : null;
}

export async function cerrarOperacion(payload: CierrePayload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      es_posicion_actual: false,
      estado: "Cerrada",
      tipo_movimiento: "cierre",
      fecha_cierre: payload.fecha_cierre,
      costo_cierre: payload.costo_cierre,
      comision: payload.comision,
      precio_actual: payload.precio_actual ?? null,
      nota: payload.nota ?? null,
    })
    .eq("id", payload.id)
    .eq("es_posicion_actual", true)
    .select()
    .single();

  if (error) throw error;
  return data ? addCalculos(parseOperacion(data)) : null;
}

export async function asignarOperacion(payload: AsignacionPayload) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      es_posicion_actual: false,
      estado: "Asignada",
      tipo_movimiento: "asignacion",
      fecha_cierre: payload.fecha_cierre,
      precio_actual: payload.precio_actual,
      nota: payload.nota ?? null,
    })
    .eq("id", payload.id)
    .eq("es_posicion_actual", true)
    .select()
    .single();

  if (error) throw error;
  return data ? addCalculos(parseOperacion(data)) : null;
}
