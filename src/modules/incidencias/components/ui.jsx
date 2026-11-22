// Piezas visuales pequeñas compartidas por las vistas del Módulo 6.

export function formatoFecha(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const CLASE_PRIORIDAD = { Alta: 'inc-alta', Media: 'inc-media', Baja: 'inc-baja' }
const CLASE_ESTADO = { Pendiente: 'inc-pendiente', 'En reparación': 'inc-reparacion', Cerrada: 'inc-cerrada' }

export function BadgePrioridad({ prioridad }) {
  return <span className={'inc-badge ' + (CLASE_PRIORIDAD[prioridad] || 'inc-sin')}>{prioridad || 'Sin prioridad'}</span>
}

export function BadgeEstado({ estado }) {
  return <span className={'inc-badge ' + (CLASE_ESTADO[estado] || '')}>{estado}</span>
}

// Mensaje de resultado: error (role=alert) o éxito/aviso (role=status).
export function Mensaje({ tipo = 'info', children }) {
  if (!children) return null
  const clase = tipo === 'error' ? 'message error' : tipo === 'exito' ? 'message success' : 'message'
  return <div className={clase} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>
}
