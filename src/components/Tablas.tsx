import { Operacion, OperacionCalculada } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface TablasProps {
  operacionesActuales: OperacionCalculada[];
  onRoll: (op: Operacion) => void;
  onCerrar: (op: Operacion) => void;
  onAsignar: (op: Operacion) => void;
  onEditar: (op: Operacion) => void;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  `${(value * 100).toFixed(2)}%`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const breakEvenPorTicker = (op: OperacionCalculada) => {
  const base = op.contratos * 100 || 1;
  const primaNetaPorAccion =
    (op.prima_recibida - op.comision - op.costo_cierre) / base;
  const estrategia = op.estrategia.toUpperCase();
  if (estrategia === "CSP") {
    return op.strike - primaNetaPorAccion;
  }
  // CC: costo base real menos la prima neta.
  const precioBase =
    op.precio_apertura ?? op.precio_actual ?? op.strike ?? 0;
  return precioBase - primaNetaPorAccion;
};

const formatMovimiento = (mov: string) => {
  const normalized = mov.toLowerCase();
  if (normalized === "asignacion") return "ASIG";
  if (normalized === "apertura") return "APERT";
  if (normalized === "cierre") return "CIE";
  if (normalized === "roll") return "ROLL";
  return mov.toUpperCase();
};

const precioActualMostrado = (op: OperacionCalculada) =>
  op.precio_actual ?? op.precio_apertura ?? null;

const estadoColor = (estado: string) => {
  switch (estado) {
    case "Abierta":
      return "success"; // verde
    case "Roleada":
      return "warning";
    case "Cerrada":
      return "secondary"; // gris
    case "Asignada":
      return "destructive";
    default:
      return "secondary";
  }
};

export function TablaOperaciones({
  operacionesActuales,
  onRoll,
  onCerrar,
  onAsignar,
  onEditar,
}: TablasProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Operaciones registradas</h2>
        <span className="text-sm text-slate-500">
          Activas: {operacionesActuales.length}
        </span>
      </div>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Ticker</TableHead>
              <TableHead className="whitespace-nowrap">Precio actual</TableHead>
              <TableHead className="whitespace-nowrap w-24">Estrat.</TableHead>
              <TableHead className="whitespace-nowrap">Inicio</TableHead>
              <TableHead className="whitespace-nowrap">Vencimiento</TableHead>
              <TableHead className="whitespace-nowrap w-20 text-center">
                Contr.
              </TableHead>
              <TableHead className="whitespace-nowrap">Strike</TableHead>
              <TableHead className="whitespace-nowrap">Prima</TableHead>
              <TableHead className="whitespace-nowrap">NETO</TableHead>
              <TableHead className="whitespace-nowrap">Break-even</TableHead>
              <TableHead className="whitespace-nowrap">ROI %</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="whitespace-nowrap w-[100px]">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operacionesActuales.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-slate-500">
                  No hay operaciones activas.
                </TableCell>
              </TableRow>
            )}
            {operacionesActuales.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-semibold whitespace-nowrap">
                  {op.ticker}
                </TableCell>
                <TableCell className="whitespace-nowrap py-1">
                  {precioActualMostrado(op) !== null
                    ? formatMoney(precioActualMostrado(op) as number)
                    : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap py-1">{op.estrategia}</TableCell>
                <TableCell className="whitespace-nowrap py-1">{op.fecha_inicio}</TableCell>
                <TableCell className="whitespace-nowrap py-1">
                  {op.fecha_vencimiento || "-"}
                </TableCell>
                <TableCell className="text-center py-1">{op.contratos}</TableCell>
                <TableCell className="whitespace-nowrap py-1">{op.strike}</TableCell>
                <TableCell className="whitespace-nowrap py-1">
                  {formatMoney(op.prima_recibida)}
                </TableCell>
                <TableCell
                  className={`font-semibold whitespace-nowrap py-1 ${
                    op.neto < 0 ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {formatMoney(op.neto)}
                </TableCell>
                <TableCell className="whitespace-nowrap py-1">
                  {formatMoney(breakEvenPorTicker(op))}
                </TableCell>
                <TableCell className="whitespace-nowrap py-1">
                  {formatPercent(op.roi)}
                </TableCell>
                <TableCell>
                  <Badge variant={estadoColor(op.estado)}>{op.estado}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-row flex-wrap items-center gap-1">
                    <Button
                      size="icon"
                      className="h-4 w-4 text-xs"
                      variant="outline"
                      onClick={() => onRoll(op)}
                      type="button"
                      title="Roll"
                    >
                      R
                    </Button>
                    <Button
                      size="icon"
                      className="h-4 w-4 text-xs"
                      variant="outline"
                      onClick={() => onCerrar(op)}
                      type="button"
                      title="Cerrar"
                    >
                      C
                    </Button>
                    <Button
                      size="icon"
                      className="h-4 w-4 text-xs"
                      variant="outline"
                      onClick={() => onAsignar(op)}
                      type="button"
                      title="Asignar"
                    >
                      A
                    </Button>
                    <Button
                      size="icon"
                      className="h-4 w-4 text-xs"
                      variant="secondary"
                      onClick={() => onEditar(op)}
                      type="button"
                      title="Editar"
                    >
                      E
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function TablaHistorial({
  historial,
  onRevertAsignacion,
  page,
  totalPages,
  onPageChange,
}: {
  historial: OperacionCalculada[];
  onRevertAsignacion?: (op: OperacionCalculada) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Historial de operaciones</h2>
        <span className="text-sm text-slate-500">
          Total: {historial.length}
        </span>
      </div>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha evento</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Precio actual</TableHead>
              <TableHead>Break-even</TableHead>
              <TableHead className="whitespace-nowrap w-24">Estrat.</TableHead>
              <TableHead className="whitespace-nowrap w-20">Mov.</TableHead>
              <TableHead className="text-center w-20">Contr.</TableHead>
              <TableHead>Strike</TableHead>
              <TableHead>Prima</TableHead>
              <TableHead>Costo cierre</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>NETO</TableHead>
              <TableHead>ROI %</TableHead>
              <TableHead>Estado</TableHead>
              {onRevertAsignacion && <TableHead>Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {historial.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={onRevertAsignacion ? 15 : 14}
                  className="text-center text-slate-500"
                >
                  No hay movimientos registrados.
                </TableCell>
              </TableRow>
            )}
            {historial.map((op) => (
              <TableRow key={`${op.id}-${op.fecha_evento}`}>
                <TableCell className="py-1">{formatDateTime(op.fecha_evento)}</TableCell>
                <TableCell className="font-semibold py-1">{op.ticker}</TableCell>
                <TableCell className="py-1">
                  {precioActualMostrado(op) !== null
                    ? formatMoney(precioActualMostrado(op) as number)
                    : "-"}
                </TableCell>
                <TableCell className="py-1">
                  {formatMoney(breakEvenPorTicker(op))}
                </TableCell>
                <TableCell className="py-1">{op.estrategia}</TableCell>
                <TableCell className="uppercase text-xs font-semibold text-slate-600 py-1">
                  {formatMovimiento(op.tipo_movimiento)}
                </TableCell>
                <TableCell className="text-center py-1">{op.contratos}</TableCell>
                <TableCell className="py-1">{op.strike}</TableCell>
                <TableCell className="py-1">{formatMoney(op.prima_recibida)}</TableCell>
                <TableCell className="py-1">{formatMoney(op.costo_cierre)}</TableCell>
                <TableCell className="py-1">{formatMoney(op.comision)}</TableCell>
                <TableCell
                  className={`font-semibold py-1 ${
                    op.neto < 0 ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {formatMoney(op.neto)}
                </TableCell>
                <TableCell className="py-1">{formatPercent(op.roi)}</TableCell>
                <TableCell>
                  <Badge variant={estadoColor(op.estado)}>{op.estado}</Badge>
                </TableCell>
                {onRevertAsignacion && (
                  <TableCell>
                    {(op.estado === "Asignada" || op.estado === "Cerrada") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRevertAsignacion(op)}
                      >
                        Revertir
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {onPageChange && totalPages && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, (page ?? 1) - 1))}
              disabled={!page || page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPageChange(
                  Math.min(totalPages, (page ?? 1) + 1)
                )
              }
              disabled={!page || page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
