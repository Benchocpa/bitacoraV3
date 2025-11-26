import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Operacion, OperacionFormData } from "../types";

interface Props {
  onSubmit: (data: OperacionFormData) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: Operacion | null;
  loading?: boolean;
}

const emptyForm: OperacionFormData = {
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: "",
  ticker: "",
  estrategia: "CSP",
  contratos: 1,
  strike: 0,
  precio_apertura: undefined,
  prima_recibida: 0,
  comision: 0,
  nota: "",
};

export function OperacionForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}: Props) {
  const [form, setForm] = useState<OperacionFormData>(emptyForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        fecha_inicio: initialData.fecha_inicio.slice(0, 10),
        fecha_vencimiento: initialData.fecha_vencimiento
          ? initialData.fecha_vencimiento.slice(0, 10)
          : "",
        ticker: initialData.ticker,
        estrategia: initialData.estrategia,
        contratos: initialData.contratos,
        strike: initialData.strike,
        precio_apertura: initialData.precio_apertura ?? undefined,
        prima_recibida: initialData.prima_recibida,
        comision: initialData.comision,
        nota: initialData.nota ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        e.target.type === "number"
          ? Number(value) || 0
          : name === "ticker"
          ? (value as string).toUpperCase()
          : (value as string),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      ticker: form.ticker.toUpperCase().trim(),
      fecha_vencimiento: form.fecha_vencimiento || undefined,
      precio_apertura:
        form.precio_apertura === undefined || form.precio_apertura === null
          ? undefined
          : Number(form.precio_apertura),
    });
  };

  const esCC = form.estrategia.toUpperCase() === "CC";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fecha_inicio">Fecha inicio</Label>
          <Input
            id="fecha_inicio"
            name="fecha_inicio"
            type="date"
            value={form.fecha_inicio}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fecha_vencimiento">Fecha vencimiento</Label>
          <Input
            id="fecha_vencimiento"
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento || ""}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ticker">Ticker</Label>
          <Input
            id="ticker"
            name="ticker"
            value={form.ticker}
            onChange={handleChange}
            placeholder="AAPL"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="estrategia">Estrategia</Label>
          <Select
            id="estrategia"
            name="estrategia"
            value={form.estrategia}
            onChange={handleChange}
          >
            <option value="CSP">CSP</option>
            <option value="CC">CC</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="contratos">Contratos</Label>
          <Input
            id="contratos"
            name="contratos"
            type="number"
            min={1}
            value={form.contratos}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="strike">Strike</Label>
          <Input
            id="strike"
            name="strike"
            type="number"
            step="0.01"
            value={form.strike === 0 ? "" : form.strike}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="precio_apertura">
            Precio compra acciones (CC) / spot
          </Label>
          <Input
            id="precio_apertura"
            name="precio_apertura"
            type="number"
            step="0.01"
            value={form.precio_apertura ?? ""}
            onChange={handleChange}
            placeholder="Opcional / obligatorio si es CC"
            required={esCC}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prima_recibida">Prima recibida</Label>
          <Input
            id="prima_recibida"
            name="prima_recibida"
            type="number"
            step="0.01"
            value={form.prima_recibida === 0 ? "" : form.prima_recibida}
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
          value={form.nota || ""}
          onChange={handleChange}
          placeholder="Detalles adicionales..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {initialData ? "Actualizar" : "Crear operación"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
