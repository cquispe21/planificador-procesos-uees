# Simulador de Planificación de Procesos

Este proyecto es una aplicación web desarrollada con **React** y **TypeScript** que permite simular distintos algoritmos de planificación de procesos en sistemas operativos. Está orientado a propósitos educativos y de demostración.

## ✨ Funcionalidades

- Agregar procesos con:
  - Tiempo de llegada
  - Duración (Ráfaga)
  - Prioridad
- Selección de algoritmo de planificación:
  - **FCFS** (First Come First Served)
  - **SJF** (Shortest Job First)
  - **Round Robin**
  - **Prioridades**
  - **Todos** (para comparar)
- Generación de:
  - **Diagrama de Gantt** visual por cada algoritmo
  - **Tabla de resultados** con:
    - Orden de ejecución
    - Tiempo de espera
    - Tiempo de retorno

## 📊 Ejemplo de tabla

| Proceso | Duración / T. Ráfaga | Orden | Tiempo de Espera | Tiempo de Retorno |
|---------|----------------------|-------|------------------|-------------------|
| P1      | 5                    | 1     | 0                | 5                 |
| P2      | 3                    | 2     | 5                | 8                 |

## 🚀 Tecnologías

- React
- TypeScript
- TailwindCSS (estilos)
- React Hooks (`useState`)

## 📂 Estructura

- `App.tsx`: Componente principal con lógica y visualización.
- Cálculo separado por algoritmo (`FCFS`, `SJF`, `Round Robin`, `Prioridades`).
- Gantt y tabla de resultados generados dinámicamente.

## 📌 Cómo ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
