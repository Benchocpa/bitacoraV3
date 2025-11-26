import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AsignacionPayload, Operacion } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  operacion: Operacion | null;
  cadenaHistoria?: Operacion[];
  onConfirm: (payload: AsignacionPayload) => Promise<void> | void;
  loading?: boolean;
}

export function ModalAsignacion({
  open,
  onOpenChange,
  operacion,
  cadenaHistoria = [],
  onConfirm,
  loading = false,
}: Props) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const [form, setForm] = useState({
    fecha_cierre: new Date().toISOString().slice(0, 10),
    precio_actual: "",
    comision: "0",
    nota: "",
  });

  useEffect(() => {
    if (operacion) {
      setForm((prev) => ({
        ...prev,
        fecha_cierre: new Date().toISOString().slice(0, 10),
        precio_actual: operacion.precio_actual?.toString() ?? "",
        comision: "0",
        nota: operacion.nota ?? "",
      }));
    }
  }, [operacion]);

  const precioActualNumber =
    typeof form.precio_actual === "string"
      ? Number.parseFloat(form.precio_actual) || 0
      : Number(form.precio_actual) || 0;
  const comisionNumber =
    typeof form.comision === "string"
      ? Number.parseFloat(form.comision) || 0
      : Number(form.comision) || 0;
  const baseAcciones = operacion ? operacion.contratos * 100 : 0;
  const totalStrike = operacion ? operacion.strike * baseAcciones : 0;
  const totalPrecioActual = precioActualNumber * baseAcciones;
  const esCSP = (operacion?.estrategia ?? "").toUpperCase() === "CSP";
  const esCC = (operacion?.estrategia ?? "").toUpperCase() === "CC";
  let plAsignacion = 0;
  if (operacion) {
    if (esCSP) {
      plAsignacion = totalPrecioActual - totalStrike; // pérdida si precio_actual < strike
    } else if (esCC) {
      plAsignacion = totalStrike - totalPrecioActual; // pérdida si precio_actual > strike
    } else {
      plAsignacion = totalStrike - totalPrecioActual;
    }
  }
  const plAsignacionNeto = plAsignacion - comisionNumber;
  const costoAsignacion = plAsignacion < 0 ? -plAsignacion : 0;

  const primaTotalCadena = useMemo(() => {
    if (!operacion) return 0;
    return cadenaHistoria
      .filter((c) => c.cadena_id === operacion.cadena_id)
      .reduce(
        (acc, cur) =>
          acc +
          cur.prima_recibida -
          (Number(cur.comision || 0) + Number(cur.costo_cierre || 0)),
        0
      );
  }, [operacion, cadenaHistoria]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!operacion) return;
    const payload: AsignacionPayload = {
      id: operacion.id,
      fecha_cierre: form.fecha_cierre,
      precio_actual: Number(form.precio_actual),
      comision: comisionNumber,
      nota: form.nota || undefined,
    };
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignación</DialogTitle>
        </DialogHeader>
        {operacion ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Ticker</Label>
                <div className="text-sm font-semibold">{operacion.ticker}</div>
              </div>
              <div className="space-y-1">
                <Label>Contratos / Strike</Label>
                <div className="text-sm text-slate-700">
                  {operacion.contratos} @ {operacion.strike}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Base acciones</Label>
                <div className="text-sm text-slate-700">{baseAcciones}</div>
              </div>
              <div className="space-y-1">
                <Label>Prima neta acumulada</Label>
                <div className="text-sm font-semibold text-emerald-700">
                  {primaTotalCadena.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fecha_cierre">Fecha asignación</Label>
                <Input
                  id="fecha_cierre"
                  name="fecha_cierre"
                  type="date"
                  value={form.fecha_cierre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="precio_actual">Precio actual (obligatorio)</Label>
                <Input
                  id="precio_actual"
                  name="precio_actual"
                  type="number"
                  step="0.01"
                  value={form.precio_actual}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comision">Comisión asignación</Label>
                <Input
                  id="comision"
                  name="comision"
                  type="number"
                  step="0.01"
                  value={form.comision}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Strike x acciones</span>
                  <span className="font-semibold">{formatMoney(totalStrike)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Precio vivo x acciones</span>
                  <span className="font-semibold">{formatMoney(totalPrecioActual)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Comisión asignación</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(comisionNumber)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Costo de cierre (pérdida)</span>
                  <span className="font-semibold text-red-600">
                    {formatMoney(costoAsignacion)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">P/L asignación</span>
                  <span
                    className={`font-semibold ${
                      plAsignacion < 0
                        ? "text-red-600"
                        : plAsignacion > 0
                        ? "text-emerald-700"
                        : ""
                    }`}
                  >
                    {formatMoney(plAsignacion)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">P/L asignación neto</span>
                  <span
                    className={`font-semibold ${
                      plAsignacionNeto < 0
                        ? "text-red-600"
                        : plAsignacionNeto > 0
                        ? "text-emerald-700"
                        : ""
                    }`}
                  >
                    {formatMoney(plAsignacionNeto)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nota">Nota</Label>
              <Textarea
                id="nota"
                name="nota"
                rows={3}
                value={form.nota}
                onChange={handleChange}
                placeholder="Detalle de la asignación..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                Confirmar asignación
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-slate-600">
            Selecciona una operación para asignar.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
