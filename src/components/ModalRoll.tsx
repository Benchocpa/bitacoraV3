import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Operacion, RollPayload } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  operacion: Operacion | null;
  onConfirm: (payload: RollPayload) => Promise<void> | void;
  loading?: boolean;
}

export function ModalRoll({
  open,
  onOpenChange,
  operacion,
  onConfirm,
  loading = false,
}: Props) {
  const [form, setForm] = useState({
    nuevaFechaInicio: new Date().toISOString().slice(0, 10),
    nuevaFechaVencimiento: "",
    nuevoStrike: 0,
    nuevaPrima: 0,
    nuevaComision: 0,
    costoCierreActual: 0,
    precioActual: "",
    nota: "",
  });

  useEffect(() => {
    if (operacion) {
      setForm((prev) => ({
        ...prev,
        nuevaFechaVencimiento: "",
        nuevaFechaInicio: new Date().toISOString().slice(0, 10),
        nuevoStrike: operacion.strike,
        nuevaPrima: 0,
        nuevaComision: 0,
        costoCierreActual: 0,
        precioActual: operacion.precio_actual?.toString() ?? "",
        nota: operacion.nota ?? "",
      }));
    }
  }, [operacion]);

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
    const payload: RollPayload = {
      id: operacion.id,
      nuevaFechaInicio: form.nuevaFechaInicio,
      nuevaFechaVencimiento: form.nuevaFechaVencimiento || undefined,
      nuevoStrike: Number(form.nuevoStrike),
      nuevaPrima: Number(form.nuevaPrima),
      nuevaComision: Number(form.nuevaComision),
      costoCierreActual: Number(form.costoCierreActual),
      precioActual:
        form.precioActual === "" ? undefined : Number(form.precioActual),
      nota: form.nota || undefined,
    };
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Roll de posición</DialogTitle>
        </DialogHeader>
        {operacion ? (
          <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Ticker</Label>
          <div className="text-sm font-semibold">{operacion.ticker}</div>
        </div>
              <div className="space-y-1">
                <Label>Cadena ID</Label>
                <div className="text-xs text-slate-600">
                  {operacion.cadena_id}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="costoCierreActual">
                  Costo de cierre tramo actual
                </Label>
        <Input
          id="costoCierreActual"
          name="costoCierreActual"
          type="number"
          step="0.01"
          value={form.costoCierreActual === 0 ? "" : form.costoCierreActual}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nuevaFechaInicio">Nueva fecha inicio</Label>
        <Input
          id="nuevaFechaInicio"
          name="nuevaFechaInicio"
                  type="date"
                  value={form.nuevaFechaInicio}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nuevaFechaVencimiento">
                  Nueva fecha vencimiento
                </Label>
                <Input
                  id="nuevaFechaVencimiento"
                  name="nuevaFechaVencimiento"
                  type="date"
                  value={form.nuevaFechaVencimiento}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nuevoStrike">Nuevo strike</Label>
                <Input
                  id="nuevoStrike"
                  name="nuevoStrike"
                  type="number"
                  step="0.01"
                  value={form.nuevoStrike}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nuevaPrima">Nueva prima</Label>
        <Input
          id="nuevaPrima"
          name="nuevaPrima"
          type="number"
          step="0.01"
          value={form.nuevaPrima === 0 ? "" : form.nuevaPrima}
          onChange={handleChange}
          required
        />
      </div>
              <div className="space-y-1">
                <Label htmlFor="precioActual">Precio actual (spot)</Label>
                <Input
                  id="precioActual"
                  name="precioActual"
                  type="number"
                  step="0.01"
                  value={form.precioActual}
                  onChange={handleChange}
                  placeholder="Opcional"
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
                placeholder="Detalle del roll..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                Confirmar roll
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
            Selecciona una operación para rolear.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
