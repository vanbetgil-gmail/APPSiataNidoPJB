'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CATEGORIAS, LIMITES_NORMATIVOS, type CategoriaICA } from '@/lib/ica/umbrales'
import type { MedicionTablero } from '@/lib/tableros/consultas'

/**
 * Tablero interactivo del histórico — FR-032 a FR-037.
 *
 * ── Sobre el color ───────────────────────────────────────────────────────
 *
 * Las variables de partículas se pintan con la escala del ICA, que es la
 * única representación de calidad del aire permitida en la aplicación
 * (FR-004). El resto —temperatura, humedad, CO₂— usa el verde de la marca:
 * no son contaminantes con categoría oficial, y darles colores de semáforo
 * inventaría un juicio sanitario que ninguna norma respalda.
 *
 * ── Sobre lo que se excluye ──────────────────────────────────────────────
 *
 * Las mediciones marcadas como dudosas quedan fuera de todo promedio por
 * omisión. Son las 12 del lugar registrado como «Op», que nadie ha podido
 * identificar: promediarlas dentro de un sitio equivocado ensuciaría la
 * comparación entre talleres, que es la pregunta central del proyecto.
 */

interface Variable {
  clave: keyof MedicionTablero
  etiqueta: string
  unidad: string
  /** Cierto si la escala del ICA aplica a esta variable. */
  conICA: boolean
  limite?: number
}

const VARIABLES: Variable[] = [
  { clave: 'pm25', etiqueta: 'PM2.5', unidad: 'µg/m³', conICA: true, limite: LIMITES_NORMATIVOS.pm25 },
  { clave: 'pm10', etiqueta: 'PM10', unidad: 'µg/m³', conICA: true, limite: LIMITES_NORMATIVOS.pm10 },
  { clave: 'pm1', etiqueta: 'PM1', unidad: 'µg/m³', conICA: false },
  { clave: 'co2', etiqueta: 'CO₂', unidad: 'ppm', conICA: false },
  { clave: 'temperatura', etiqueta: 'Temperatura', unidad: '°C', conICA: false },
  { clave: 'humedad_relativa', etiqueta: 'Humedad', unidad: '%', conICA: false },
  { clave: 'hcho', etiqueta: 'Formaldehído', unidad: 'µg/m³', conICA: false },
  { clave: 'tvoc', etiqueta: 'TVOC', unidad: 'µg/m³', conICA: false },
]

const colorDe = (c: CategoriaICA | null) =>
  CATEGORIAS.find((d) => d.categoria === c)?.color ?? 'var(--color-texto-suave)'

function promedio(valores: (number | null)[]): number | null {
  const v = valores.filter((n): n is number => n !== null)
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length
}

/** Categoría del ICA que corresponde a un promedio de PM2.5 o PM10. */
function categoriaDePromedio(variable: Variable, valor: number): CategoriaICA | null {
  if (!variable.conICA) return null
  const cortes =
    variable.clave === 'pm25'
      ? [12, 37, 55, 150, 250, 500]
      : [54, 154, 254, 354, 424, 604]
  const i = cortes.findIndex((c) => valor <= c)
  return (
    (['buena', 'aceptable', 'daniña_sensibles', 'daniña', 'muy_daniña', 'peligrosa'] as const)[
      i === -1 ? 5 : i
    ] ?? null
  )
}

export function TableroInteractivo({
  mediciones,
  lugares,
}: {
  mediciones: MedicionTablero[]
  lugares: string[]
}) {
  const [variableClave, setVariableClave] = useState<string>('pm25')
  const [lugarFiltro, setLugarFiltro] = useState<string>('todos')
  const [incluirDudosas, setIncluirDudosas] = useState(false)

  const variable = VARIABLES.find((v) => v.clave === variableClave) ?? VARIABLES[0]

  const filtradas = useMemo(
    () =>
      mediciones.filter(
        (m) =>
          (incluirDudosas || !m.dudoso) && (lugarFiltro === 'todos' || m.lugar === lugarFiltro)
      ),
    [mediciones, lugarFiltro, incluirDudosas]
  )

  // --- Promedio por lugar --------------------------------------------------
  const porLugar = useMemo(() => {
    const base = mediciones.filter((m) => incluirDudosas || !m.dudoso)
    return lugares
      .map((lugar) => {
        const v = base.filter((m) => m.lugar === lugar)
        const prom = promedio(v.map((m) => m[variable.clave] as number | null))
        return {
          lugar: lugar.replace(/^Taller de /, '').replace(/\s*\(.*\)$/, ''),
          lugarCompleto: lugar,
          valor: prom === null ? null : Number(prom.toFixed(1)),
          n: v.length,
          categoria: prom === null ? null : categoriaDePromedio(variable, prom),
        }
      })
      .filter((d) => d.valor !== null)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
  }, [mediciones, lugares, variable, incluirDudosas])

  // --- Evolución en el tiempo ---------------------------------------------
  const porFecha = useMemo(() => {
    const grupos = new Map<string, (number | null)[]>()
    for (const m of filtradas) {
      if (!grupos.has(m.fecha)) grupos.set(m.fecha, [])
      grupos.get(m.fecha)!.push(m[variable.clave] as number | null)
    }
    return [...grupos.entries()]
      .map(([fecha, valores]) => {
        const p = promedio(valores)
        return {
          fecha: fecha.slice(5).replace('-', '/'),
          fechaCompleta: fecha,
          valor: p === null ? null : Number(p.toFixed(1)),
        }
      })
      .sort((a, b) => a.fechaCompleta.localeCompare(b.fechaCompleta))
  }, [filtradas, variable])

  // --- Reparto por categoría del ICA --------------------------------------
  const repartoICA = useMemo(() => {
    const cuenta = new Map<CategoriaICA, number>()
    for (const m of filtradas) {
      if (!m.categoria) continue
      cuenta.set(m.categoria, (cuenta.get(m.categoria) ?? 0) + 1)
    }
    return CATEGORIAS.filter((c) => cuenta.has(c.categoria)).map((c) => ({
      etiqueta: c.etiqueta,
      categoria: c.categoria,
      color: c.color,
      n: cuenta.get(c.categoria) ?? 0,
      porcentaje: Math.round(((cuenta.get(c.categoria) ?? 0) / filtradas.length) * 100),
    }))
  }, [filtradas])

  const valores = filtradas
    .map((m) => m[variable.clave] as number | null)
    .filter((n): n is number => n !== null)
  const sinDato = filtradas.length - valores.length

  return (
    <div className="flex flex-col gap-6">
      {/* ── Controles ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Variable</span>
          <select
            value={variableClave}
            onChange={(e) => setVariableClave(e.target.value)}
            className="rounded-[--radius-tarjeta] border px-3 py-2.5 text-sm"
            style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
          >
            {VARIABLES.map((v) => (
              <option key={v.clave} value={v.clave}>
                {v.etiqueta} ({v.unidad})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Lugar</span>
          <select
            value={lugarFiltro}
            onChange={(e) => setLugarFiltro(e.target.value)}
            className="rounded-[--radius-tarjeta] border px-3 py-2.5 text-sm"
            style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
          >
            <option value="todos">Todos los lugares</option>
            {lugares.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={incluirDudosas}
            onChange={(e) => setIncluirDudosas(e.target.checked)}
          />
          Incluir datos dudosos
        </label>
      </div>

      {/* ── Resumen ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Dato titulo="Mediciones" valor={String(filtradas.length)} />
        <Dato
          titulo={`${variable.etiqueta} promedio`}
          valor={
            valores.length === 0
              ? '—'
              : `${(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1)}`
          }
          sufijo={variable.unidad}
        />
        <Dato
          titulo="Máximo"
          valor={valores.length === 0 ? '—' : String(Math.max(...valores))}
          sufijo={variable.unidad}
        />
        <Dato
          titulo="Sin medir"
          valor={String(sinDato)}
          nota={sinDato > 0 ? 'no se cuentan como cero' : undefined}
        />
      </div>

      {/* ── Comparación entre lugares ────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold">
          {variable.etiqueta} promedio por lugar
        </h2>
        <p className="mt-1 mb-4 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
          {variable.conICA
            ? 'Cada barra toma el color de la categoría del ICA que le corresponde.'
            : 'Esta variable no tiene categoría oficial en la norma, así que no se colorea como el ICA.'}
        </p>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={porLugar} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" vertical={false} />
              <XAxis
                dataKey="lugar"
                tick={{ fontSize: 11, fill: 'var(--color-texto-suave)' }}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={54}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-texto-suave)' }} />
              <Tooltip
                formatter={(v: number) => [`${v} ${variable.unidad}`, variable.etiqueta]}
                labelFormatter={(_, p) => p?.[0]?.payload?.lugarCompleto ?? ''}
                contentStyle={{
                  backgroundColor: 'var(--color-superficie)',
                  border: '1px solid var(--color-borde)',
                  borderRadius: 10,
                  fontSize: 13,
                }}
              />
              {variable.limite && (
                <ReferenceLine
                  y={variable.limite}
                  stroke="var(--color-ica-daniña)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Límite normativo ${variable.limite}`,
                    fontSize: 10,
                    fill: 'var(--color-ica-daniña)',
                    position: 'insideTopRight',
                  }}
                />
              )}
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {porLugar.map((d) => (
                  <Cell
                    key={d.lugarCompleto}
                    fill={variable.conICA ? colorDe(d.categoria) : 'var(--color-marca)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Evolución ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold">Evolución en el tiempo</h2>
        <p className="mt-1 mb-4 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
          Promedio de cada jornada de medición
          {lugarFiltro !== 'todos' ? ` en ${lugarFiltro}` : ' en todo el colegio'}.
        </p>

        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={porFecha} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-suave)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-texto-suave)' }} />
              <Tooltip
                formatter={(v: number) => [`${v} ${variable.unidad}`, variable.etiqueta]}
                labelFormatter={(_, p) => p?.[0]?.payload?.fechaCompleta ?? ''}
                contentStyle={{
                  backgroundColor: 'var(--color-superficie)',
                  border: '1px solid var(--color-borde)',
                  borderRadius: 10,
                  fontSize: 13,
                }}
              />
              {variable.limite && (
                <ReferenceLine y={variable.limite} stroke="var(--color-ica-daniña)" strokeDasharray="4 4" />
              )}
              <Line
                type="monotone"
                dataKey="valor"
                stroke="var(--color-bosque)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--color-marca)' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Reparto por categoría ─────────────────────────────────────── */}
      {repartoICA.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Calidad del aire de estas mediciones</h2>
          <p className="mt-1 mb-4 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            Categoría del ICA colombiano de cada lectura, según la Resolución 2254 de 2017.
          </p>

          <div className="flex h-9 w-full overflow-hidden rounded-full">
            {repartoICA.map((c) => (
              <div
                key={c.categoria}
                title={`${c.etiqueta}: ${c.n} mediciones (${c.porcentaje} %)`}
                style={{
                  width: `${(c.n / filtradas.length) * 100}%`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {repartoICA.map((c) => (
              <li key={c.categoria} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: c.color }}
                />
                {c.etiqueta}
                <span style={{ color: 'var(--color-texto-suave)' }}>
                  {c.n} · {c.porcentaje} %
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Dato({
  titulo,
  valor,
  sufijo,
  nota,
}: {
  titulo: string
  valor: string
  sufijo?: string
  nota?: string
}) {
  return (
    <div
      className="rounded-[--radius-tarjeta] border px-4 py-3"
      style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
    >
      <p className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {valor}
        {sufijo && (
          <span className="ml-1 text-sm font-normal" style={{ color: 'var(--color-texto-suave)' }}>
            {sufijo}
          </span>
        )}
      </p>
      {nota && (
        <p className="mt-0.5 text-[0.7rem]" style={{ color: 'var(--color-texto-suave)' }}>
          {nota}
        </p>
      )}
    </div>
  )
}
