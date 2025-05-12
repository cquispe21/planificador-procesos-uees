import { useState, useRef } from "react";

type Proceso = {
  id: string;
  llegada: number;
  duracion: number;
  prioridad: number;
};

type ResultadoProceso = Proceso & {
  inicio: number;
  fin: number;
  reciclado?: number;
  segmento?: number;
};

const SimuladorPlanificacion = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [nuevo, setNuevo] = useState<Proceso>({
    id: "",
    llegada: 0,
    duracion: 0,
    prioridad: 1,
  });
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [editProcess, setEditProcess] = useState<Proceso | null>(null);
  const [onSelect, setOnSelect] = useState<string[]>([]);
  const [quantum, setQuantum] = useState<number>(5);
  const [error, setError] = useState<string>("");
  const [resultados, setResultados] = useState<{
    [key: string]: ResultadoProceso[];
  } | null>(null);
  const [contadorId, setContadorId] = useState<number>(0);
  const llegadaInputRef = useRef<HTMLInputElement>(null);

  const algoritmos = ["FCFS", "SJF", "RoundRobin", "Prioridades", "PQS"];

  const agregarProceso = () => {
    if (nuevo.duracion <= 0) {
      setError("Debe ingresar una duración mayor a 0");
      return;
    }

    const idGenerado = `P${contadorId}`;
    setProcesos([...procesos, { ...nuevo, id: idGenerado }]);
    setNuevo({ id: "", llegada: 0, duracion: 0, prioridad: 1 });
    setError("");
    setContadorId(contadorId + 1);
    if (llegadaInputRef.current) {
      llegadaInputRef.current.focus();
    }
  };

  const handleDeleteProcess = (id: string) => {
    const updatedProcesses = procesos.filter((p) => p.id !== id);
    setProcesos(updatedProcesses);
    setError("");
    if (updatedProcesses.length === 0) {
      setResultados(null);
    } else if (onSelect.length > 0) {
      ejecutar(updatedProcesses);
    }
    if (editingProcessId === id) {
      setEditingProcessId(null);
      setEditProcess(null);
    }
  };

  const handleEditProcess = (id: string) => {
    const process = procesos.find((p) => p.id === id);
    if (process) {
      setEditingProcessId(id);
      setEditProcess({ ...process });
      setError("");
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editProcess || editProcess.duracion <= 0) {
      setError("Debe ingresar una duración mayor a 0");
      return;
    }
    if (editProcess.prioridad < 1) {
      setError("La prioridad debe ser mayor o igual a 1");
      return;
    }

    const updatedProcesses = procesos.map((p) =>
      p.id === id ? { ...editProcess, id } : p
    );
    setProcesos(updatedProcesses);
    setEditingProcessId(null);
    setEditProcess(null);
    setError("");
    if (onSelect.length > 0) {
      ejecutar(updatedProcesses);
    }
  };

  const handleCancelEdit = () => {
    setEditingProcessId(null);
    setEditProcess(null);
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (editingProcessId && editProcess) {
        handleSaveEdit(editingProcessId);
      } else {
        agregarProceso();
      }
    }
  };

  const calcularFCFS = (lista: Proceso[]): ResultadoProceso[] => {
    const sorted = [...lista].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    return sorted.map((p) => {
      const inicio = Math.max(tiempo, p.llegada);
      const fin = inicio + p.duracion;
      tiempo = fin;
      return { ...p, inicio, fin, segmento: 1 };
    });
  };

  const calcularSJF = (lista: Proceso[]): ResultadoProceso[] => {
    const sorted = [...lista].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    let pendientes = [...sorted];
    const resultados: ResultadoProceso[] = [];

    while (pendientes.length > 0) {
      const disponibles = pendientes.filter((p) => p.llegada <= tiempo);
      const siguiente =
        disponibles.length > 0
          ? disponibles.sort((a, b) => a.duracion - b.duracion)[0]
          : pendientes[0];
      const inicio = Math.max(tiempo, siguiente.llegada);
      const fin = inicio + siguiente.duracion;
      tiempo = fin;
      resultados.push({ ...siguiente, inicio, fin, segmento: 1 });
      pendientes = pendientes.filter((p) => p.id !== siguiente.id);
    }
    return resultados;
  };

  const calcularRoundRobin = (lista: Proceso[], quantum: number): ResultadoProceso[] => {
    type ProcesoRR = Proceso & { restante: number; segmento: number };
    const cola: ProcesoRR[] = [...lista].map((p) => ({
      ...p,
      restante: p.duracion,
      segmento: 1,
    }));
    let tiempo = 0;
    const completados: ResultadoProceso[] = [];

    while (cola.length > 0) {
      const actual = cola.shift()!;
      if (actual.llegada > tiempo) tiempo = actual.llegada;

      const ejec = Math.min(quantum, actual.restante);
      const inicio = tiempo;
      const fin = tiempo + ejec;
      tiempo = fin;
      actual.restante -= ejec;

      completados.push({
        ...actual,
        inicio,
        fin,
        segmento: actual.segmento,
      });

      if (actual.restante > 0) {
        actual.segmento += 1;
        cola.push({ ...actual, llegada: tiempo });
      }
    }

    return completados;
  };

  const calcularPrioridades = (lista: Proceso[]): ResultadoProceso[] => {
    const sorted = [...lista].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    let pendientes = [...sorted];
    const resultados: ResultadoProceso[] = [];

    while (pendientes.length > 0) {
      const disponibles = pendientes.filter((p) => p.llegada <= tiempo);
      const siguiente =
        disponibles.length > 0
          ? disponibles.sort((a, b) => a.prioridad - b.prioridad)[0]
          : pendientes[0];
      const inicio = Math.max(tiempo, siguiente.llegada);
      const fin = inicio + siguiente.duracion;
      tiempo = fin;
      resultados.push({ ...siguiente, inicio, fin, segmento: 1 });
      pendientes = pendientes.filter((p) => p.id !== siguiente.id);
    }
    return resultados;
  };

  const calcularPQS = (lista: Proceso[], quantum: number): ResultadoProceso[] => {
    type ProcesoPQS = Proceso & {
      orden: number;
      restante: number;
      prioridadActual: number;
      reciclado: number;
      segmento: number;
    };

    const completados: ResultadoProceso[] = [];
    let tiempo = 0;

    const pendientes: ProcesoPQS[] = [...lista]
      .sort((a, b) => a.llegada - b.llegada)
      .map((p, index) => ({
        ...p,
        orden: index + 1,
        restante: p.duracion,
        prioridadActual: p.prioridad,
        reciclado: 0,
        segmento: 1,
      }));

    const ejecutando: ProcesoPQS[] = [];
    const esperando: ProcesoPQS[] = [];

    while (pendientes.length > 0 || ejecutando.length > 0 || esperando.length > 0) {
      while (pendientes.length > 0 && pendientes[0].llegada <= tiempo) {
        const p = pendientes.shift()!;
        if (ejecutando.length === 0) {
          ejecutando.push(p);
        } else {
          esperando.push(p);
        }
      }

      if (ejecutando.length > 0) {
        const actual = ejecutando[0];
        const inicio = Math.max(tiempo, actual.llegada);
        const ejec = Math.min(quantum, actual.restante);
        const fin = inicio + ejec;

        completados.push({
          id: actual.id,
          llegada: actual.llegada,
          duracion: actual.duracion,
          prioridad: actual.prioridad,
          inicio,
          fin,
          reciclado: actual.reciclado,
          segmento: actual.segmento,
        });

        actual.restante -= ejec;
        tiempo = fin;

        if (actual.restante === 0) {
          ejecutando.shift();
        } else {
          actual.reciclado += 1;
          actual.segmento += 1;
          actual.prioridadActual = actual.prioridad;
          esperando.push(actual);
          ejecutando.shift();
        }
      } else if (pendientes.length > 0) {
        tiempo = pendientes[0].llegada;
      } else if (esperando.length > 0) {
        const siguiente = esperando.sort(
          (a, b) =>
            a.prioridadActual - b.prioridadActual || a.orden - b.orden
        )[0];
        ejecutando.push(siguiente);
        esperando.splice(esperando.indexOf(siguiente), 1);
      } else {
        tiempo += 1;
      }
    }

    return completados;
  };

  const ejecutar = (customProcesses?: Proceso[]) => {
    const lista = customProcesses || procesos;
    if (lista.length === 0) {
      setError("Debe ingresar al menos un proceso");
      return;
    }
    if (
      (onSelect.includes("RoundRobin") || onSelect.includes("PQS")) &&
      quantum <= 0
    ) {
      setError("El quantum debe ser mayor a 0");
      return;
    }
    if (onSelect.length === 0) {
      setError("Seleccione al menos un algoritmo");
      return;
    }

    const resultadosNuevos: { [key: string]: ResultadoProceso[] } = {};
    onSelect.forEach((algoritmo) => {
      if (algoritmo === "FCFS") {
        resultadosNuevos.FCFS = calcularFCFS(lista);
      } else if (algoritmo === "SJF") {
        resultadosNuevos.SJF = calcularSJF(lista);
      } else if (algoritmo === "RoundRobin") {
        resultadosNuevos.RoundRobin = calcularRoundRobin(lista, quantum);
      } else if (algoritmo === "Prioridades") {
        resultadosNuevos.Prioridades = calcularPrioridades(lista);
      } else if (algoritmo === "PQS") {
        resultadosNuevos.PQS = calcularPQS(lista, quantum);
      }
    });
    setResultados(resultadosNuevos);
    setError("");
  };

  const handleAlgoritmoChange = (algoritmo: string) => {
    if (algoritmo === "Todos") {
      if (onSelect.length === algoritmos.length) {
        setOnSelect([]);
      } else {
        setOnSelect([...algoritmos]);
      }
    } else {
      if (onSelect.includes(algoritmo)) {
        setOnSelect(onSelect.filter((a) => a !== algoritmo));
      } else {
        setOnSelect([...onSelect, algoritmo]);
      }
    }
    setError("");
  };

  const resetearTodo = () => {
    setProcesos([]);
    setNuevo({ id: "", llegada: 0, duracion: 0, prioridad: 1 });
    setEditingProcessId(null);
    setEditProcess(null);
    setOnSelect([]);
    setQuantum(5);
    setResultados(null);
    setContadorId(0);
    setError("");
    if (llegadaInputRef.current) {
      llegadaInputRef.current.focus();
    }
  };

  const renderGanttTabla = (resultados: {
    [key: string]: ResultadoProceso[];
  }) => {
    const maxTiempo = Math.max(
      ...Object.values(resultados)
        .flat()
        .map((p) => p.fin)
    );

    return Object.entries(resultados).map(([algoritmo, lista]) => {
      const metricasPorProceso: { [id: string]: ResultadoProceso[] } = {};
      lista.forEach((p) => {
        if (!metricasPorProceso[p.id]) metricasPorProceso[p.id] = [];
        metricasPorProceso[p.id].push(p);
      });

      const procesosUnicos = procesos.map((p) => p.id);

      return (
        <div
          key={algoritmo}
          className="overflow-x-auto mb-8 bg-white p-4 rounded shadow"
        >
          <h2 className="text-xl font-semibold mb-4">{algoritmo}</h2>

          <table className="w-auto mx-auto border-collapse border text-sm mb-6">
            <thead>
              <tr>
                <th className="border p-2">Proceso</th>
                {[...Array(maxTiempo).keys()].map((t) => (
                  <th key={t} className="border p-1 w-8 text-center">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procesosUnicos.map((id) => (
                <tr key={id}>
                  <td className="border p-2 font-bold text-center">{id}</td>
                  {[...Array(maxTiempo).keys()].map((t) => {
                    const activo = metricasPorProceso[id].some(
                      (p) => t >= p.inicio && t < p.fin
                    );
                    return (
                      <td
                        key={t}
                        className={`border h-8 text-center ${
                          activo ? "bg-blue-500 text-white font-bold" : ""
                        }`}
                      >
                        {activo ? "X" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-lg font-semibold mb-2">Tabla de Resultados</h3>
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Proceso</th>
                <th className="border p-2">Tiempo de llegada</th>
                <th className="border p-2">Tiempo de ráfaga</th>
                <th className="border p-2">Tiempo de finalización</th>
                <th className="border p-2">Tiempo de retorno</th>
                <th className="border p-2">Tiempo de espera</th>
              </tr>
            </thead>
            <tbody>
              {procesosUnicos.map((id) => {
                const segmentos = metricasPorProceso[id];
                const llegada = segmentos[0].llegada;
                const duracion = segmentos[0].duracion;
                const fin = Math.max(...segmentos.map((s) => s.fin));
                const retorno = fin - llegada;
                const espera = retorno - duracion;
                return (
                  <tr key={id}>
                    <td className="border p-2 text-center">{id}</td>
                    <td className="border p-2 text-center">{llegada}</td>
                    <td className="border p-2 text-center">{duracion}</td>
                    <td className="border p-2 text-center">{fin}</td>
                    <td className="border p-2 text-center">{retorno}</td>
                    <td className="border p-2 text-center">{espera}</td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-semibold">
                <td
                  colSpan={4}
                  className="border p-2 text-right"
                >
                  Promedio
                </td>
                <td className="border p-2 text-center">
                  {(() => {
                    const totalRetorno = procesosUnicos.reduce(
                      (acc, id) => {
                        const segmentos = metricasPorProceso[id];
                        const fin = Math.max(...segmentos.map((s) => s.fin));
                        return acc + (fin - segmentos[0].llegada);
                      },
                      0
                    );
                    const promedioRetorno = (
                      totalRetorno / procesosUnicos.length
                    ).toFixed(3);
                    return `${totalRetorno} / ${
                      procesosUnicos.length
                    } = ${promedioRetorno}`;
                  })()}
                </td>
                <td className="border p-2 text-center">
                  {(() => {
                    const totalEspera = procesosUnicos.reduce(
                      (acc, id) => {
                        const segmentos = metricasPorProceso[id];
                        const fin = Math.max(...segmentos.map((s) => s.fin));
                        const retorno = fin - segmentos[0].llegada;
                        const espera = retorno - segmentos[0].duracion;
                        return acc + espera;
                      },
                      0
                    );
                    const promedioEspera = (
                      totalEspera / procesosUnicos.length
                    ).toFixed(3);
                    return `${totalEspera} / ${
                      procesosUnicos.length
                    } = ${promedioEspera}`;
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    });
  };

  return (
    <div className="p-8 font-sans bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">
        Simulador de Planificación de Procesos
      </h1>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Ingresar Proceso</h2>
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div className="flex flex-col">
            <label className="text-sm">Llegada</label>
            <input
              type="text"
              className="border p-2 rounded"
              value={nuevo.llegada}
              onChange={(e) => setNuevo({ ...nuevo, llegada: +e.target.value })}
              onKeyDown={handleKeyDown}
              ref={llegadaInputRef}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Duración</label>
            <input
              type="text"
              className="border p-2 rounded"
              value={nuevo.duracion}
              onChange={(e) =>
                setNuevo({ ...nuevo, duracion: +e.target.value })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Prioridad</label>
            <input
              type="text"
              className="border p-2 rounded"
              value={nuevo.prioridad}
              onChange={(e) =>
                setNuevo({ ...nuevo, prioridad: +e.target.value || 1 })
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-end">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
              onClick={agregarProceso}
            >
              Agregar
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Lista de Procesos</h2>
        {procesos.length === 0 ? (
          <p>No hay procesos ingresados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procesos.map((p) =>
              editingProcessId === p.id && editProcess ? (
                <div
                  key={p.id}
                  className="bg-gray-50 border p-4 rounded-lg shadow"
                >
                  <h3 className="text-lg font-semibold mb-2">{p.id}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="flex flex-col">
                      <label className="text-sm">Llegada</label>
                      <input
                        type="text"
                        className="border p-2 rounded"
                        value={editProcess.llegada}
                        onChange={(e) =>
                          setEditProcess({
                            ...editProcess,
                            llegada: +e.target.value,
                          })
                        }
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm">Duración</label>
                      <input
                        type="text"
                        className="border p-2 rounded"
                        value={editProcess.duracion}
                        onChange={(e) =>
                          setEditProcess({
                            ...editProcess,
                            duracion: +e.target.value,
                          })
                        }
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm">Prioridad</label>
                      <input
                        type="text"
                        className="border p-2 rounded"
                        value={editProcess.prioridad}
                        onChange={(e) =>
                          setEditProcess({
                            ...editProcess,
                            prioridad: +e.target.value || 1,
                          })
                        }
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded"
                      onClick={() => handleSaveEdit(p.id)}
                    >
                      Guardar
                    </button>
                    <button
                      className="bg-gray-600 text-white px-4 py-2 rounded"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </button>
                  </div>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
              ) : (
                <div
                  key={p.id}
                  className="bg-gray-50 border p-4 rounded-lg shadow"
                >
                  <h3 className="text-lg font-semibold">{p.id}</h3>
                  <p>Llegada: {p.llegada}</p>
                  <p>Duración: {p.duracion}</p>
                  <p>Prioridad: {p.prioridad}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="bg-yellow-600 text-white px-4 py-2 rounded"
                      onClick={() => handleEditProcess(p.id)}
                    >
                      Editar
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded"
                      onClick={() => handleDeleteProcess(p.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {(onSelect.includes("RoundRobin") || onSelect.includes("PQS")) && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">Configuración de Quantum</h2>
          <div className="flex flex-col w-1/4">
            <label className="text-sm">Quantum</label>
            <input
              type="text"
              className="border p-2 rounded"
              value={quantum}
              onChange={(e) => setQuantum(+e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!(onSelect.includes("RoundRobin") || onSelect.includes("PQS"))}
            />
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Seleccionar Algoritmos</h2>
        <div className="flex flex-col gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={onSelect.length === algoritmos.length}
              onChange={() => handleAlgoritmoChange("Todos")}
            />
            Todos
          </label>
          {algoritmos.map((algoritmo) => (
            <label key={algoritmo} className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={onSelect.includes(algoritmo)}
                onChange={() => handleAlgoritmoChange(algoritmo)}
              />
              {algoritmo}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <button
          className={`px-6 py-3 rounded text-white font-bold ${
            procesos.length === 0 || procesos.every((p) => p.duracion <= 0)
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
          onClick={() => ejecutar()}
          disabled={
            procesos.length === 0 || procesos.every((p) => p.duracion <= 0)
          }
        >
          3. Ejecutar Algoritmos
        </button>
        <button
          className="px-6 py-3 rounded text-white font-bold bg-red-600 hover:bg-red-700"
          onClick={resetearTodo}
        >
          Restablecer
        </button>
      </div>

      {resultados && renderGanttTabla(resultados)}
    </div>
  );
};

export default SimuladorPlanificacion;