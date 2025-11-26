import { useEffect, useMemo, useState } from "react";
import {
  asignarOperacion,
  cerrarOperacion,
  crearOperacion,
  getHistorialCompleto,
  getOperacionesActuales,
  rollOperacion,
  actualizarOperacion,
  importarHistorial,
  revertirAsignacion,
  revertirCierre,
} from "./services/historialService";
import { Operacion, OperacionCalculada, OperacionFormData } from "./types";
import { OperacionForm } from "./components/OperacionForm";
import { TablaHistorial, TablaOperaciones } from "./components/Tablas";
import { fetchFinnhubQuotes } from "./services/priceService";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
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
  const [preciosVivo, setPreciosVivo] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [roiFiltro, setRoiFiltro] = useState("");
  const [roiPage, setRoiPage] = useState(1);
  const [roiPageSize, setRoiPageSize] = useState(5);

  const formatMoney = (value: number) =>
    value.toLocaleString("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  const breakEvenOperacion = (op: OperacionCalculada) => {
    const base = op.contratos * 100 || 1;
    const primaNetaPorAccion =
      (op.prima_recibida - op.comision - op.costo_cierre) / base;
    const estrategia = op.estrategia.toUpperCase();
    if (estrategia === "CSP") {
      return op.strike - primaNetaPorAccion;
    }
    // CC: costo base real de la acción menos la prima neta.
    const precioBase =
      op.precio_apertura ?? op.precio_actual ?? op.strike ?? 0;
    return precioBase - primaNetaPorAccion;
  };

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

  const totalPages = Math.max(1, Math.ceil(historialFiltrado.length / pageSize));
  const historialPaginado = useMemo(() => {
    const start = (page - 1) * pageSize;
    return historialFiltrado.slice(start, start + pageSize);
  }, [historialFiltrado, page, pageSize]);

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

  const roiPorTicker = useMemo(() => {
    const acumulado = new Map<
      string,
      {
        prima: number;
        costos: number;
        neto: number;
        capitalActual: number;
        maxCapital: number;
        baseAcciones: number;
        breakEvenAcumulado: number;
      }
    >();

    historial.forEach((op) => {
      const ticker = op.ticker.toUpperCase();
      const previo =
        acumulado.get(ticker) ?? {
          prima: 0,
          costos: 0,
          neto: 0,
          capitalActual: 0,
          maxCapital: 0,
          baseAcciones: 0,
          breakEvenAcumulado: 0,
        };
      const base = op.contratos * 100;
      const breakEven = breakEvenOperacion(op);
      const colateralOp = base * op.strike;
      const capitalActual = op.es_posicion_actual
        ? previo.capitalActual + colateralOp
        : previo.capitalActual;
      acumulado.set(ticker, {
        prima: previo.prima + op.prima_recibida,
        costos: previo.costos + op.comision + op.costo_cierre,
        neto: previo.neto + op.neto,
        capitalActual,
        maxCapital: Math.max(previo.maxCapital, colateralOp),
        baseAcciones: previo.baseAcciones + base,
        breakEvenAcumulado: previo.breakEvenAcumulado + breakEven * base,
      });
    });

    return Array.from(acumulado.entries())
      .map(([ticker, datos]) => ({
        ticker,
        ...datos,
        capital:
          datos.capitalActual > 0 ? datos.capitalActual : datos.maxCapital,
        roi:
          (datos.capitalActual > 0 ? datos.capitalActual : datos.maxCapital) > 0
            ? datos.neto /
              (datos.capitalActual > 0 ? datos.capitalActual : datos.maxCapital)
            : 0,
        breakEven:
          datos.baseAcciones > 0
            ? datos.breakEvenAcumulado / datos.baseAcciones
            : 0,
      }))
      .sort((a, b) => b.roi - a.roi);
  }, [historial]);

  const roiGeneral = useMemo(() => {
    if (!roiPorTicker.length) return 0;
    const total = roiPorTicker.reduce((acc, cur) => acc + cur.roi, 0);
    return total / roiPorTicker.length;
  }, [roiPorTicker]);

  const roiFiltrado = useMemo(() => {
    if (!roiFiltro) return roiPorTicker;
    const term = roiFiltro.toUpperCase();
    return roiPorTicker.filter((r) => r.ticker.includes(term));
  }, [roiPorTicker, roiFiltro]);

  const roiTotalPages = Math.max(
    1,
    Math.ceil(roiFiltrado.length / roiPageSize)
  );

  const roiPaginado = useMemo(() => {
    const start = (roiPage - 1) * roiPageSize;
    return roiFiltrado.slice(start, start + roiPageSize);
  }, [roiFiltrado, roiPage, roiPageSize]);

  const fetchData = async () => {
    const [ops, hist] = await Promise.all([
      getOperacionesActuales(),
      getHistorialCompleto(),
    ]);
    setOperaciones(ops);
    setHistorial(hist);
    setPage(1);
  };

  useEffect(() => {
    fetchData().catch((err) =>
      setMessage(err.message ?? "Error cargando datos")
    );
  }, []);

  const finnhubToken = import.meta.env.VITE_FINNHUB_TOKEN as
    | string
    | undefined;

  useEffect(() => {
    const tickers = Array.from(
      new Set(historial.map((op) => op.ticker.toUpperCase()))
    );
    if (!tickers.length || !finnhubToken) {
      setPreciosVivo({});
      return;
    }

    let cancelled = false;
    fetchFinnhubQuotes(tickers, finnhubToken)
      .then((mapa) => {
        if (!cancelled) setPreciosVivo(mapa);
      })
      .catch(() => {
        if (!cancelled) setPreciosVivo({});
      });

    return () => {
      cancelled = true;
    };
  }, [historial, finnhubToken]);

  const precioVivoTicker = (ticker: string) => {
    const valor = preciosVivo[ticker.toUpperCase()];
    return Number.isFinite(valor) ? valor : null;
  };

  const CSV_HEADERS = [
    "fecha_evento",
    "ticker",
    "estrategia",
    "contratos",
    "strike",
    "precio_apertura",
    "precio_actual",
    "prima_recibida",
    "comision",
    "costo_cierre",
    "fecha_inicio",
    "fecha_vencimiento",
    "fecha_cierre",
    "estado",
    "tipo_movimiento",
    "cadena_id",
    "es_posicion_actual",
    "nota",
  ] as const;

  const csvEscape = (value: any) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const buildCsv = (rows: OperacionCalculada[]) => {
    const header = CSV_HEADERS.join(",");
    const lines = rows.map((r) =>
      [
        r.fecha_evento,
        r.ticker,
        r.estrategia,
        r.contratos,
        r.strike,
        r.precio_apertura ?? "",
        r.precio_actual ?? "",
        r.prima_recibida,
        r.comision,
        r.costo_cierre,
        r.fecha_inicio,
        r.fecha_vencimiento ?? "",
        r.fecha_cierre ?? "",
        r.estado,
        r.tipo_movimiento,
        r.cadena_id,
        r.es_posicion_actual,
        r.nota ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
    return [header, ...lines].join("\n");
  };

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          const next = text[i + 1];
          if (next === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          current.push(field);
          field = "";
        } else if (char === "\n" || char === "\r") {
          if (char === "\r" && text[i + 1] === "\n") i++;
          current.push(field);
          if (current.some((c) => c !== "")) rows.push(current);
          current = [];
          field = "";
        } else {
          field += char;
        }
      }
    }
    current.push(field);
    if (current.some((c) => c !== "")) rows.push(current);
    return rows;
  };

  const handleExportCsv = () => {
    const csv = buildCsv(historial);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-bitacora-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    const [header, ...dataRows] = rows;
    if (!header || header.length < CSV_HEADERS.length) {
      setMessage("CSV inválido: faltan columnas");
      return;
    }
    const headerLower = header.map((h) => h.trim().toLowerCase());
    const expectedLower = CSV_HEADERS.map((h) => h.toLowerCase());
    const matches = expectedLower.every((col) => headerLower.includes(col));
    if (!matches) {
      setMessage("CSV inválido: columnas no coinciden");
      return;
    }

    const objetos: Partial<Operacion>[] = dataRows
      .filter((row) => row.length >= CSV_HEADERS.length && row.some((c) => c !== ""))
      .map((row) => {
        const entrada: any = {};
        headerLower.forEach((col, idx) => {
          entrada[col] = row[idx] ?? "";
        });
        return {
          fecha_evento: entrada["fecha_evento"] || new Date().toISOString(),
          ticker: entrada["ticker"] || "",
          estrategia: entrada["estrategia"] || "CSP",
          contratos: Number.parseInt(entrada["contratos"] || "1", 10),
          strike: Number.parseFloat(entrada["strike"] || "0"),
          precio_apertura: entrada["precio_apertura"]
            ? Number.parseFloat(entrada["precio_apertura"])
            : null,
          precio_actual: entrada["precio_actual"]
            ? Number.parseFloat(entrada["precio_actual"])
            : null,
          prima_recibida: Number.parseFloat(entrada["prima_recibida"] || "0"),
          comision: Number.parseFloat(entrada["comision"] || "0"),
          costo_cierre: Number.parseFloat(entrada["costo_cierre"] || "0"),
          fecha_inicio: entrada["fecha_inicio"] || new Date().toISOString().slice(0, 10),
          fecha_vencimiento: entrada["fecha_vencimiento"] || null,
          fecha_cierre: entrada["fecha_cierre"] || null,
          estado: entrada["estado"] || "Abierta",
          tipo_movimiento: entrada["tipo_movimiento"] || "apertura",
          cadena_id: entrada["cadena_id"] || undefined,
          es_posicion_actual:
            (entrada["es_posicion_actual"] ?? "true").toString().toLowerCase() === "true",
          nota: entrada["nota"] || null,
        };
      });

    if (!objetos.length) {
      setMessage("CSV sin filas para importar");
      return;
    }

    try {
      setImporting(true);
      await importarHistorial(objetos);
      setMessage(`Importadas ${objetos.length} filas`);
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "Error importando CSV");
    } finally {
      setImporting(false);
    }
  };

  const fileInputId = "import-csv-input";

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

  const handleRevertAsignacion = async (op: OperacionCalculada) => {
    try {
      setLoading(true);
      if (op.estado === "Asignada") {
        await revertirAsignacion(op.id);
        setMessage("Asignación revertida");
      } else if (op.estado === "Cerrada") {
        await revertirCierre(op.id);
        setMessage("Cierre revertido");
      } else {
        setMessage("Solo se pueden revertir operaciones asignadas o cerradas");
      }
      await fetchData();
    } catch (error: any) {
      setMessage(error.message ?? "No se pudo revertir la asignación");
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
            onClick={handleExportCsv}
            disabled={loading}
          >
            Exportar CSV
          </Button>
          <div className="flex items-center gap-2">
            <input
              id={fileInputId}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportCsv(file);
                e.target.value = "";
              }}
              disabled={importing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={importing}
            >
              Importar CSV
            </Button>
          </div>
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
            label: "ROI general",
            value: formatPercent(roiGeneral),
            hint: "Promedio ROI por ticker",
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

      {roiPorTicker.length > 0 && (
        <div className="card">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="section-title">ROI por ticker</h2>
              <span className="text-sm text-slate-500">
                Tickers: {roiFiltrado.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                placeholder="Buscar ticker"
                value={roiFiltro}
                onChange={(e) => {
                  setRoiFiltro(e.target.value);
                  setRoiPage(1);
                }}
              />
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                value={roiPageSize}
                onChange={(e) => {
                  setRoiPageSize(Number(e.target.value));
                  setRoiPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Precio vivo</TableHead>
                  <TableHead>Break even</TableHead>
                  <TableHead>Prima total</TableHead>
                  <TableHead>Costos</TableHead>
                  <TableHead>NETO</TableHead>
                  <TableHead>Capital usado</TableHead>
                  <TableHead>ROI %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roiPaginado.map((item) => (
                  <TableRow key={item.ticker}>
                    <TableCell className="font-semibold">
                      {item.ticker}
                    </TableCell>
                    <TableCell>
                      {precioVivoTicker(item.ticker) !== null
                        ? formatMoney(precioVivoTicker(item.ticker) as number)
                        : "-"}
                    </TableCell>
                    <TableCell>{formatMoney(item.breakEven)}</TableCell>
                    <TableCell>{formatMoney(item.prima)}</TableCell>
                    <TableCell>{formatMoney(item.costos)}</TableCell>
                    <TableCell
                      className={`font-semibold ${
                        item.neto < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {formatMoney(item.neto)}
                    </TableCell>
                    <TableCell>{formatMoney(item.capital)}</TableCell>
                    <TableCell>{formatPercent(item.roi)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {roiTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Página {roiPage} de {roiTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoiPage(Math.max(1, roiPage - 1))}
                  disabled={roiPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoiPage(Math.min(roiTotalPages, roiPage + 1))
                  }
                  disabled={roiPage >= roiTotalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                Mostrar
              </label>
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroTicker("");
                setFiltroEstado("");
                setFiltroFecha("");
                setPageSize(25);
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
        <TablaHistorial
          historial={historialPaginado}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRevertAsignacion={handleRevertAsignacion}
        />
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
