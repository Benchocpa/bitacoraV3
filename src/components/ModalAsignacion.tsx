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
  const [form, setForm] = useState({
    fecha_cierre: new Date().toISOString().slice(0, 10),
    precio_actual: "",
    nota: "",
  });

  useEffect(() => {
    if (operacion) {
      setForm((prev) => ({
        ...prev,
        fecha_cierre: new Date().toISOString().slice(0, 10),
        precio_actual: operacion.precio_actual?.toString() ?? "",
        nota: operacion.nota ?? "",
      }));
    }
  }, [operacion]);

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
