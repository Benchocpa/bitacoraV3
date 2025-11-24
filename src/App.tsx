import { useEffect, useMemo, useState } from "react";
import {
  asignarOperacion,
  cerrarOperacion,
  crearOperacion,
  getHistorialCompleto,
  getOperacionesActuales,
  rollOperacion,
  actualizarOperacion,
} from "./services/historialService";
import { Operacion, OperacionCalculada, OperacionFormData } from "./types";
import { OperacionForm } from "./components/OperacionForm";
import { TablaHistorial, TablaOperaciones } from "./components/Tablas";
import { ModalRoll } from "./components/ModalRoll";
import { ModalCierre } from "./components/ModalCierre";
import { ModalAsignacion } from "./components/ModalAsignacion";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { StatsCards } from "./components/StatsCards";

function App() {
  const [operaciones, setOperaciones] = useState<OperacionCalculada[]>([]);
  const [historial, setHistorial] = useState<OperacionCalculada[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Operacion | null>(null);
  const [editing, setEditing] = useState<Operacion | null>(null);
  const [rollOpen, setRollOpen] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [asignacionOpen, setAsignacionOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [filtroTicker, setFiltroTicker] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const cadenaSeleccionada = useMemo(() => {
    if (!selected) return [];
    return historial.filter((h) => h.cadena_id === selected.cadena_id);
  }, [historial, selected]);

  const historialFiltrado = useMemo(() => {
    return historial.filter((op) => {
      const matchTicker = filtroTicker
        ? op.ticker.toUpperCase().includes(filtroTicker.toUpperCase())
        : true;
      const matchEstado = filtroEstado ? op.estado === filtroEstado : true;
      const matchFecha = filtroFecha
        ? op.fecha_evento.startsWith(filtroFecha)
        : true;
      return matchTicker && matchEstado && matchFecha;
    });
  }, [historial, filtroTicker, filtroEstado, filtroFecha]);

  const totales = useMemo(() => {
    const totalPrima = historial.reduce(
      (acc, cur) => acc + cur.prima_recibida,
      0
    );
    const totalComision = historial.reduce((acc, cur) => acc + cur.comision, 0);
    const totalCostoCierre = historial.reduce(
      (acc, cur) => acc + cur.costo_cierre,
      0
    );
    const neto = totalPrima - totalComision - totalCostoCierre;
    const colateral = operaciones.reduce(
      (acc, cur) => acc + cur.contratos * 100 * cur.strike,
      0
    );
    const roi = colateral > 0 ? neto / colateral : 0;

    return { totalPrima, totalComision, totalCostoCierre, neto, colateral, roi };
  }, [historial, operaciones]);

  const fetchData = async () => {
    const [ops, hist] = await Promise.all([
      getOperacionesActuales(),
      getHistorialCompleto(),
    ]);
    setOperaciones(ops);
    setHistorial(hist);
  };

  useEffect(() => {
    fetchData().catch((err) =>
      setMessage(err.message ?? "Error cargando datos")
    );
  }, []);

  const handleSubmit = async (data: OperacionFormData) => {
    try {
      setLoading(true);
      if (editing) {
        await actualizarOperacion(editing.id, data);
        setMessage("Operación actualizada");
      } else {
        await crearOperacion(data);
        setMessage("Operación creada");
      }
      setEditing(null);
      setFormOpen(false);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "Error guardando operación");
    } finally {
      setLoading(false);
    }
  };

  const handleRoll = async (payload: any) => {
    try {
      setLoading(true);
      await rollOperacion(payload);
      setRollOpen(false);
      setSelected(null);
      setMessage("Roll registrado");
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "Error al rolear");
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = async (payload: any) => {
    try {
      setLoading(true);
      await cerrarOperacion(payload);
      setCierreOpen(false);
      setSelected(null);
      setMessage("Operación cerrada");
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "Error al cerrar");
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async (payload: any) => {
    try {
      setLoading(true);
      await asignarOperacion(payload);
      setAsignacionOpen(false);
      setSelected(null);
      setMessage("Asignación registrada");
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "Error al asignar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bitácora de Opciones V3
          </h1>
          <p className="text-sm text-slate-600">
            Registrar, visualizar y analizar movimientos de opciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {operaciones.length} Posiciones Activas
          </Badge>
          <Badge variant="secondary">{historial.length} Movimientos</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            Registrar Operación
          </Button>
        </div>
      </header>

      {message && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          {message}
        </div>
      )}

      <StatsCards
        stats={[
          {
            label: "Prima Acumulada",
            value: totales.totalPrima.toLocaleString("es-ES", {
              style: "currency",
              currency: "USD",
            }),
            hint: "Ingresos brutos",
            variant: "secondary",
          },
          {
            label: "Costos (comisión + cierres)",
            value: (totales.totalComision + totales.totalCostoCierre).toLocaleString(
              "es-ES",
              { style: "currency", currency: "USD" }
            ),
            hint: "Egresos",
            variant: "warning",
          },
          {
            label: "P/L neto",
            value: totales.neto.toLocaleString("es-ES", {
              style: "currency",
              currency: "USD",
            }),
            hint: totales.neto >= 0 ? "Ganancia" : "Pérdida",
            variant: totales.neto >= 0 ? "success" : "destructive",
          },
          {
            label: "Colateral actual",
            value: totales.colateral.toLocaleString("es-ES", {
              style: "currency",
              currency: "USD",
            }),
            hint: "Contratos activos",
            variant: "secondary",
          },
          {
            label: "ROI total vs colateral",
            value: `${(totales.roi * 100).toFixed(2)}%`,
            hint: "Neto / colateral",
            variant: "secondary",
          },
          {
            label: "Operaciones activas",
            value: `${operaciones.length}`,
            hint: "Abiertas",
            variant: "secondary",
          },
        ]}
      />

      <TablaOperaciones
        operacionesActuales={operaciones}
        onRoll={(op) => {
          setSelected(op);
          setRollOpen(true);
        }}
        onCerrar={(op) => {
          setSelected(op);
          setCierreOpen(true);
        }}
        onAsignar={(op) => {
          setSelected(op);
          setAsignacionOpen(true);
        }}
        onEditar={(op) => {
          setEditing(op);
          setFormOpen(true);
        }}
      />

      <div className="card">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="section-title">Historial de operaciones</h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                Ticker
              </label>
              <input
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                placeholder="Buscar ticker"
                value={filtroTicker}
                onChange={(e) => setFiltroTicker(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                Estado
              </label>
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Abierta">Abierta</option>
                <option value="Roleada">Roleada</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Asignada">Asignada</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                Fecha (aaaa-mm-dd)
              </label>
              <input
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroTicker("");
                setFiltroEstado("");
                setFiltroFecha("");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
        <TablaHistorial historial={historialFiltrado} />
      </div>

      <ModalRoll
        open={rollOpen}
        onOpenChange={setRollOpen}
        operacion={selected}
        onConfirm={handleRoll}
        loading={loading}
      />
      <ModalCierre
        open={cierreOpen}
        onOpenChange={setCierreOpen}
        operacion={selected}
        onConfirm={handleCerrar}
        loading={loading}
      />
      <ModalAsignacion
        open={asignacionOpen}
        onOpenChange={setAsignacionOpen}
        operacion={selected}
        cadenaHistoria={cadenaSeleccionada}
        onConfirm={handleAsignar}
        loading={loading}
      />
      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditing(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar operación" : "Registrar operación"}
            </DialogTitle>
          </DialogHeader>
          <OperacionForm
            onSubmit={handleSubmit}
            initialData={editing}
            onCancel={() => {
              setEditing(null);
              setFormOpen(false);
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
