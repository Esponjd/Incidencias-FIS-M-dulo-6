// Validaciones puras (sin React ni Supabase): fáciles de probar y reutilizar.
// Cada función devuelve null si todo está bien o el mensaje de error a mostrar.
import {
  MENSAJES, PRIORIDADES, ORDEN_PRIORIDAD, EXTENSIONES_PERMITIDAS, MIME_PERMITIDOS, TAMANO_MAXIMO_BYTES,
} from './constants'

const vacio = valor => !valor || !String(valor).trim()

// HU-07 CA-02: indica exactamente qué campos faltan.
export function validarNuevaIncidencia({ descripcion, equipoUbicacion, solicitanteNombre }) {
  const faltantes = []
  if (vacio(descripcion)) faltantes.push('Descripción del problema')
  if (vacio(equipoUbicacion)) faltantes.push('Equipo / ubicación afectada')
  if (vacio(solicitanteNombre)) faltantes.push('Nombre del solicitante')
  return faltantes.length ? `Complete los campos obligatorios: ${faltantes.join(', ')}` : null
}

// HU-01 CA-01
export function validarPrioridad(prioridad) {
  return PRIORIDADES.includes(prioridad) ? null : 'Seleccione una prioridad: Alta, Media o Baja'
}

// HU-01 CA-04: se valida con la prioridad YA GUARDADA de la incidencia.
export function validarAsignacion(incidencia, responsable) {
  if (!incidencia?.prioridad) return MENSAJES.PRIORIDAD_ANTES_DE_RESPONSABLE
  if (vacio(responsable)) return 'Seleccione un responsable'
  if (incidencia.estado === 'Cerrada') return 'No se puede reasignar una incidencia cerrada'
  return null
}

// HU-03 CA-02 y CA-04
export function validarActividad(incidencia, descripcion) {
  if (incidencia?.estado === 'Cerrada') return MENSAJES.ACTIVIDAD_EN_CERRADA
  if (vacio(descripcion)) return MENSAJES.ACTIVIDAD_OBLIGATORIA
  if (incidencia?.estado !== 'En reparación') {
    return 'Solo se registran actividades en incidencias En reparación'
  }
  return null
}

// HU-04 CA-01
export function validarObservacion(incidencia, texto) {
  if (!incidencia?.responsable) return 'Solo se pueden agregar observaciones a incidencias asignadas'
  if (vacio(texto)) return 'La observación es obligatoria'
  return null
}

export function extensionDe(nombreArchivo = '') {
  const partes = nombreArchivo.toLowerCase().split('.')
  return partes.length > 1 ? partes.pop() : ''
}

// HU-04 CA-02/CA-03 y HU-07 CA-03: extensión y tipo MIME estrictos.
export function validarArchivo(archivo) {
  if (!archivo) return 'Seleccione un archivo'
  const ext = extensionDe(archivo.name)
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) return MENSAJES.FORMATO_NO_PERMITIDO
  // Si el navegador informa el MIME, debe corresponder con la extensión.
  if (archivo.type && !MIME_PERMITIDOS[ext].includes(archivo.type)) return MENSAJES.FORMATO_NO_PERMITIDO
  if (archivo.size > TAMANO_MAXIMO_BYTES) return 'El archivo supera el tamaño máximo de 5 MB'
  if (archivo.size === 0) return 'El archivo está vacío'
  return null
}

// HU-05 CA-01
export function validarInicioReparacion(incidencia) {
  if (incidencia?.estado !== 'Pendiente') return 'Solo una incidencia Pendiente puede pasar a En reparación'
  if (!incidencia?.responsable) return 'Asigne un responsable antes de iniciar la reparación'
  return null
}

// HU-05 CA-02/CA-03
export function validarCierre(incidencia, { observaciones = [], evidencias = [] }) {
  if (incidencia?.estado !== 'En reparación') return 'Solo se puede cerrar una incidencia que está En reparación'
  const haySolucion = observaciones.length > 0 || evidencias.some(e => e.origen === 'Reparacion')
  return haySolucion ? null : MENSAJES.SOLUCION_ANTES_DE_CERRAR
}

// HU-01 CA-03: Alta → Media → Baja; las que no tienen prioridad, al final.
export function ordenarPorPrioridad(incidencias) {
  const peso = i => (i.prioridad in ORDEN_PRIORIDAD ? ORDEN_PRIORIDAD[i.prioridad] : 99)
  return [...incidencias].sort((a, b) =>
    peso(a) - peso(b) || new Date(a.created_at) - new Date(b.created_at))
}

// HU-06 CA-02/CA-03: incidencias activas = Pendiente + En reparación.
export function calcularCarga(incidencias, responsables, limite) {
  return responsables.map(nombre => {
    const propias = incidencias.filter(i => i.responsable === nombre)
    const activas = propias.filter(i => i.estado !== 'Cerrada').length
    return {
      responsable: nombre,
      activas,
      cerradas: propias.length - activas,
      sobrecargado: activas > limite,
    }
  })
}

// Une observaciones y evidencias en una sola línea de tiempo (HU-04 CA-04).
export function lineaDeTiempoSeguimiento(observaciones = [], evidencias = []) {
  return [
    ...observaciones.map(o => ({ ...o, tipo: 'Observación' })),
    ...evidencias.map(e => ({ ...e, tipo: 'Evidencia' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
