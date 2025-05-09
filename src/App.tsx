import { useState } from "react";

type Proceso = {
  id: string;
  llegada: number;
  duracion: number;
  prioridad: number;
};

type ResultadoProceso = Proceso & { inicio: number; fin: number };

const SimuladorPlanificacion = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [nuevo, setNuevo] = useState<Proceso>({
    id: "",
    llegada: 0,
    duracion: 0,
    prioridad: 0,
  });
  const [onSelect, setOnSelect] = useState<string>("");
  const [quantum, setQuantum] = useState<number>(2);

  const [error, setError] = useState<string>("");
  const [resultados, setResultados] = useState<{
    [key: string]: ResultadoProceso[];
  } | null>(null);
  const [contadorId, setContadorId] = useState<number>(1);

  const agregarProceso = () => {
    if (nuevo.duracion <= 0) {
      setError("Debe ingresar una duración mayor a 0");
      return;
    }

    const idGenerado = `P${contadorId}`;
    setProcesos([...procesos, { ...nuevo, id: idGenerado }]);
    setNuevo({ id: "", llegada: 0, duracion: 0, prioridad: 0 });
    setError("");
    setContadorId(contadorId + 1);
  };

  const calcularFCFS = (): ResultadoProceso[] => {
    const lista = [...procesos].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    return lista.map((p) => {
      const inicio = Math.max(tiempo, p.llegada);
      const fin = inicio + p.duracion;
      tiempo = fin;
      return { ...p, inicio, fin };
    });
  };

  const calcularSJF = (): ResultadoProceso[] => {
    const lista = [...procesos].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    let pendientes = [...lista];
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
      resultados.push({ ...siguiente, inicio, fin });
      pendientes = pendientes.filter((p) => p.id !== siguiente.id);
    }
    return resultados;
  };

  const calcularRoundRobin = (): ResultadoProceso[] => {
    const cola = [...procesos].map((p) => ({ ...p, restante: p.duracion })); // Creamos una copia de los procesos
    let tiempo = 0; // Tiempo de ejecución
    const completados: ResultadoProceso[] = []; // Resultados
    const tiemposFinales: { [id: string]: number } = {}; // Guardamos los tiempos finales
    const ordenEjecucion: { [id: string]: number } = {}; // Guardamos los tiempos de inicio por orden de ejecución
  
    // Mientras haya procesos en la cola
    while (cola.length > 0) {
      const actual = cola.shift()!; // Sacamos el primer proceso de la cola
  
      if (actual.llegada > tiempo) tiempo = actual.llegada; // Si el proceso llega después del tiempo actual, avanzamos el tiempo al de llegada
  
      const ejec = Math.min(quantum, actual.restante); // Cuánto se ejecuta en este ciclo, según el quantum
  
      actual.restante -= ejec; // Reducimos el tiempo restante del proceso
      tiempo += ejec; // Avanzamos el tiempo total
  
      // Si es la primera vez que ejecutamos este proceso, guardamos el tiempo de inicio
      if (!ordenEjecucion[actual.id]) ordenEjecucion[actual.id] = tiempo - ejec;
  
      // Si el proceso no ha terminado, lo agregamos nuevamente a la cola con el nuevo tiempo de llegada
      if (actual.restante > 0) {
        cola.push({ ...actual, llegada: tiempo }); // No cambiamos la llegada, solo actualizamos el tiempo de llegada a cuando vuelve a la cola
      } else {
        // Si terminó, guardamos el tiempo final
        tiemposFinales[actual.id] = tiempo;
        completados.push({
          ...actual,
          inicio: ordenEjecucion[actual.id],
          fin: tiempo,
        });
      }
    }
  
    return completados;
  };
  

  const calcularPrioridades = (): ResultadoProceso[] => {
    const lista = [...procesos].sort((a, b) => a.llegada - b.llegada);
    let tiempo = 0;
    let pendientes = [...lista];
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
      resultados.push({ ...siguiente, inicio, fin });
      pendientes = pendientes.filter((p) => p.id !== siguiente.id);
    }
    return resultados;
  };

  const ejecutar = () => {
    if (onSelect === "FCFS") {
      setResultados({ FCFS: calcularFCFS() });
    } else if (onSelect === "SJF") {
      setResultados({ SJF: calcularSJF() });
    } else if (onSelect === "RoundRobin") {
      setResultados({ RoundRobin: calcularRoundRobin() });
    } else if (onSelect === "Prioridades") {
      setResultados({ Prioridades: calcularPrioridades() });
    } else if (onSelect === "Todos") {
      setResultados({
        FCFS: calcularFCFS(),
        SJF: calcularSJF(),
        RoundRobin: calcularRoundRobin(),
        Prioridades: calcularPrioridades(),
      });
    } else {
      setError("Seleccione un algoritmo");
    }
  };

  const onSelectAlgoritmo = (algoritmo: string) => {
    setOnSelect(algoritmo);
    setError("");
  };

  const renderGanttTabla = (resultados: {
    [key: string]: ResultadoProceso[];
  }) => {
    const maxTiempo = Math.max(
      ...Object.values(resultados)
        .flat()
        .map((p) => p.fin)
    );

    return Object.entries(resultados).map(([algoritmo, lista]) => (
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
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="border p-2 font-bold text-center">{p.id}</td>
                {[...Array(maxTiempo).keys()].map((t) => (
                  <td
                    key={t}
                    className={`border h-8 text-center ${
                      t >= p.inicio && t < p.fin
                        ? "bg-blue-500 text-white font-bold"
                        : ""
                    }`}
                  >
                    {t >= p.inicio && t < p.fin ? "X" : ""}
                  </td>
                ))}
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
            {lista.map((p) => {
              const retorno = p.fin - p.llegada;
              const espera = retorno - p.duracion;
              return (
                <tr key={p.id}>
                  <td className="border p-2 text-center">{p.id}</td>
                  <td className="border p-2 text-center">{p.llegada}</td>
                  <td className="border p-2 text-center">{p.duracion}</td>
                  <td className="border p-2 text-center">{p.fin}</td>
                  <td className="border p-2 text-center">{retorno}</td>
                  <td className="border p-2 text-center">{espera}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="border p-2 text-right">
                Promedio
              </td>
              <td className="border p-2 text-center">
                {(() => {
                  const totalRetorno = lista.reduce(
                    (acc, p) => acc + (p.fin - p.llegada),
                    0
                  );
                  const promedioRetorno = (totalRetorno / lista.length).toFixed(
                    3
                  );
                  return `${totalRetorno} / ${lista.length} = ${promedioRetorno}`;
                })()}
              </td>
              <td className="border p-2 text-center">
                {(() => {
                  const totalEspera = lista.reduce(
                    (acc, p) => acc + (p.fin - p.llegada - p.duracion),
                    0
                  );
                  const promedioEspera = (totalEspera / lista.length).toFixed(
                    3
                  );
                  return `${totalEspera} / ${lista.length} = ${promedioEspera}`;
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ));
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
              type="number"
              className="border p-2 rounded"
              value={nuevo.llegada}
              onChange={(e) => setNuevo({ ...nuevo, llegada: +e.target.value })}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Duración</label>
            <input
              type="number"
              className="border p-2 rounded"
              value={nuevo.duracion}
              onChange={(e) =>
                setNuevo({ ...nuevo, duracion: +e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Prioridad</label>
            <input
              type="number"
              className="border p-2 rounded"
              value={nuevo.prioridad}
              onChange={(e) =>
                setNuevo({ ...nuevo, prioridad: +e.target.value })
              }
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
            {procesos.map((p) => (
              <div
                key={p.id}
                className="bg-gray-50 border p-4 rounded-lg shadow"
              >
                <h3 className="text-lg font-semibold">{p.id}</h3>
                <p>Llegada: {p.llegada}</p>
                <p>Duración: {p.duracion}</p>
                <p>Prioridad: {p.prioridad}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <select
        className="mb-4 p-2 border rounded"
        onChange={(e) => onSelectAlgoritmo(e.target.value)}
      >
        <option value="">Seleccionar Algoritmo</option>
        <option value="FCFS">FCFS</option>
        <option value="SJF">SJF</option>
        <option value="RoundRobin">Round Robin</option>
        <option value="Prioridades">Prioridades</option>
        <option value="Todos">Todos</option>
      </select>
      {onSelect === "RoundRobin" && (
        <div className="mb-4">
          <label className="block text-sm mb-1">Quantum:</label>
          <input
            type="number"
            className="border p-2 rounded w-32"
            min={1}
            value={quantum}
            onChange={(e) => setQuantum(+e.target.value)}
          />
        </div>
      )}

      <div className="mb-6">
        <button
          className={`px-6 py-3 rounded text-white font-bold ${
            procesos.length === 0 || procesos.every((p) => p.duracion <= 0)
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
          onClick={ejecutar}
          disabled={
            procesos.length === 0 || procesos.every((p) => p.duracion <= 0)
          }
        >
          3. Ejecutar Algoritmos
        </button>
      </div>

      {resultados && renderGanttTabla(resultados)}
    </div>
  );
};

export default SimuladorPlanificacion;
