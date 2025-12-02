import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { CierrePayload, Operacion } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  operacion: Operacion | null;
  onConfirm: (payload: CierrePayload) => Promise<void> | void;
  loading?: boolean;
}

export function ModalCierre({
  open,
  onOpenChange,
  operacion,
  onConfirm,
  loading = false,
}: Props) {
  const [form, setForm] = useState({
    fecha_cierre: new Date().toISOString().slice(0, 10),
    costo_cierre: 0,
    comision: 0,
    precio_actual: "",
    nota: "",
  });

  useEffect(() => {
    if (operacion) {
      setForm((prev) => ({
        ...prev,
        fecha_cierre: new Date().toISOString().slice(0, 10),
        costo_cierre: 0,
        comision: 0,
        precio_actual: operacion.precio_actual?.toString() ?? "",
        nota: operacion.nota ?? "",
      }));
    }
  }, [operacion]);

  const esCC = (operacion?.estrategia ?? "").toUpperCase() === "CC";

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
    const payload: CierrePayload = {
      id: operacion.id,
      fecha_cierre: form.fecha_cierre,
      costo_cierre: Number(form.costo_cierre),
      comision: Number(form.comision),
      precio_actual:
        form.precio_actual === "" ? undefined : Number(form.precio_actual),
      nota: form.nota || undefined,
    };
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar posición</DialogTitle>
        </DialogHeader>
        {operacion ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Ticker</Label>
                <div className="text-sm font-semibold">{operacion.ticker}</div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fecha_cierre">Fecha cierre</Label>
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
                <Label htmlFor="costo_cierre">Costo cierre</Label>
                <Input
                  id="costo_cierre"
                  name="costo_cierre"
                  type="number"
                  step="0.01"
                  value={form.costo_cierre === 0 ? "" : form.costo_cierre}
                  onChange={handleChange}
                  placeholder="0 si no aplica"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comision">Comisión</Label>
                <Input
                  id="comision"
                  name="comision"
                  type="number"
                  step="0.01"
                  value={form.comision === 0 ? "" : form.comision}
                  onChange={handleChange}
                  placeholder="0 si no aplica"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="precio_actual">Precio actual (spot)</Label>
                <Input
                  id="precio_actual"
                  name="precio_actual"
                  type="number"
                  step="0.01"
                  value={form.precio_actual}
                  onChange={handleChange}
                  placeholder={esCC ? "Requerido para CC" : "Opcional"}
                  required={esCC}
                />
                {esCC && (
                  <p className="text-xs text-slate-600">
                    Se usa para calcular la ganancia/pérdida de las acciones del CC al cerrar.
                  </p>
                )}
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
                placeholder="Detalle del cierre..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                Confirmar cierre
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
            Selecciona una operación para cerrar.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
