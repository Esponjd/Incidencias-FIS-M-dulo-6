// HU-02 · Consultar incidencias pendientes y filtrarlas por prioridad.
import { useState } from 'react'
import { MENSAJES, PRIORIDADES } from '../constants'
import { ordenarPorPrioridad } from '../incidenciasValidation'
import TablaIncidencias from './TablaIncidencias'

export default function VistaPendientes({ incidencias, seleccionadaId, onSeleccionar }) {
  const [filtro, setFiltro] = useState('Todas')
  // CA-02: solo estado "Pendiente"; se excluyen "En reparación" y "Cerrada".
  const pendientes = ordenarPorPrioridad(incidencias.filter(i => i.estado === 'Pendiente'))
  const visibles = filtro === 'Todas' ? pendientes : pendientes.filter(i => i.prioridad === filtro)

  const vacio = pendientes.length === 0
    ? MENSAJES.SIN_PENDIENTES
    : `No hay incidencias pendientes con prioridad ${filtro}`

  return (
    <section className="panel">
      <div className="between inc-cabecera">
        <h3>Incidencias pendientes</h3>
        <label className="inc-filtro">
          Prioridad
          <select value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option>Todas</option>
            {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <TablaIncidencias
        incidencias={visibles}
        seleccionadaId={seleccionadaId}
        onSeleccionar={onSeleccionar}
        vacio={vacio}
      />
    </section>
  )
}
