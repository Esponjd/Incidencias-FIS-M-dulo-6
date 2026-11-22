import { BadgeEstado, BadgePrioridad, formatoFecha } from './ui'

// Tabla genérica de incidencias. Al hacer clic en una fila se abre su detalle.
export default function TablaIncidencias({ incidencias, seleccionadaId, onSeleccionar, vacio, mostrarResponsable = true }) {
  return (
    <div className="table-wrap">
      <table className="inc-tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Equipo / ubicación</th>
            <th>Prioridad</th>
            <th>Estado</th>
            {mostrarResponsable && <th>Responsable</th>}
            <th>Registro</th>
          </tr>
        </thead>
        <tbody>
          {incidencias.length ? incidencias.map(i => (
            <tr
              key={i.id}
              className={i.id === seleccionadaId ? 'inc-fila activa' : 'inc-fila'}
              onClick={() => onSeleccionar?.(i.id)}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSeleccionar?.(i.id)}
            >
              <td><b>{i.codigo}</b></td>
              <td>{i.descripcion}</td>
              <td>{i.equipo_ubicacion}</td>
              <td><BadgePrioridad prioridad={i.prioridad} /></td>
              <td><BadgeEstado estado={i.estado} /></td>
              {mostrarResponsable && <td>{i.responsable || '—'}</td>}
              <td>{formatoFecha(i.created_at)}</td>
            </tr>
          )) : (
            <tr><td colSpan={mostrarResponsable ? 7 : 6} className="empty">{vacio}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
