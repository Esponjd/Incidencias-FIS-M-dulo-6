// HU-06 · Consultar incidencias asignadas por responsable y detectar sobrecarga.
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { LIMITE_SOBRECARGA_DEFECTO, MENSAJES, RESPONSABLES } from '../constants'
import { calcularCarga, ordenarPorPrioridad } from '../incidenciasValidation'
import TablaIncidencias from './TablaIncidencias'

export default function CargaTrabajo({ incidencias, seleccionadaId, onSeleccionar }) {
  const [limite, setLimite] = useState(LIMITE_SOBRECARGA_DEFECTO)
  const [responsable, setResponsable] = useState('')
  const [incluirCerradas, setIncluirCerradas] = useState(false)

  const limiteValido = Number.isInteger(Number(limite)) && Number(limite) >= 1 ? Number(limite) : LIMITE_SOBRECARGA_DEFECTO
  const resumen = calcularCarga(incidencias, RESPONSABLES, limiteValido)

  const asignadas = incidencias.filter(i => i.responsable === responsable)
  const activas = asignadas.filter(i => i.estado !== 'Cerrada')
  const visibles = ordenarPorPrioridad(incluirCerradas ? asignadas : activas)

  return (
    <>
      <section className="panel">
        <div className="between inc-cabecera">
          <h3>Distribución de la carga de trabajo</h3>
          <label className="inc-filtro">
            Límite de incidencias activas (L)
            <input type="number" min="1" max="50" value={limite} onChange={e => setLimite(e.target.value)} />
          </label>
        </div>
        <div className="table-wrap">
          <table className="inc-tabla">
            <thead>
              <tr><th>Responsable</th><th>Activas (Pendiente + En reparación)</th><th>Cerradas</th><th>Situación</th></tr>
            </thead>
            <tbody>
              {resumen.map(r => (
                <tr
                  key={r.responsable}
                  className={(r.sobrecargado ? 'inc-sobrecarga ' : '') + (r.responsable === responsable ? 'inc-fila activa' : 'inc-fila')}
                  onClick={() => setResponsable(r.responsable)}
                >
                  <td><b>{r.responsable}</b></td>
                  <td>{r.activas}</td>
                  <td>{r.cerradas}</td>
                  <td>
                    {r.sobrecargado
                      ? <span className="inc-badge inc-alta"><AlertTriangle size={13} /> Sobrecargado</span>
                      : <span className="inc-badge inc-ok">Normal</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Se marca «Sobrecargado» cuando las incidencias activas superan L = {limiteValido}.</p>
      </section>

      <section className="panel">
        <div className="between inc-cabecera">
          <h3>Incidencias por responsable</h3>
          <div className="inc-filtros">
            <label className="inc-filtro">
              Responsable
              <select value={responsable} onChange={e => setResponsable(e.target.value)}>
                <option value="">Seleccione…</option>
                {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="inc-check">
              <input type="checkbox" checked={incluirCerradas} onChange={e => setIncluirCerradas(e.target.checked)} />
              Incluir cerradas
            </label>
          </div>
        </div>
        {!responsable ? (
          <p className="hint">Seleccione un responsable para ver sus incidencias asignadas.</p>
        ) : activas.length === 0 && !incluirCerradas ? (
          <div className="message" role="status">{MENSAJES.RESPONSABLE_SIN_INCIDENCIAS}</div>
        ) : (
          <TablaIncidencias
            incidencias={visibles}
            seleccionadaId={seleccionadaId}
            onSeleccionar={onSeleccionar}
            mostrarResponsable={false}
            vacio={MENSAJES.RESPONSABLE_SIN_INCIDENCIAS}
          />
        )}
      </section>
    </>
  )
}
