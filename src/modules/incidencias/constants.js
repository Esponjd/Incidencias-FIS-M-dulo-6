// Catálogos y mensajes del Módulo 6 · Gestión de incidencias y reparaciones.
// Los valores coinciden con los CHECK de supabase/02_modulo6_incidencias.sql.

export const ESTADOS = ['Pendiente', 'En reparación', 'Cerrada']
export const PRIORIDADES = ['Alta', 'Media', 'Baja']
export const ORDEN_PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 }

export const ROLES = {
  COORDINADOR: 'Coordinador técnico',
  TECNICO: 'Técnico de soporte',
  PASANTE: 'Pasante',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
}

export const TECNICOS = ['Técnico A', 'Técnico B', 'Técnico C', 'Técnico D']
export const PASANTES = ['Pasante 1', 'Pasante 2']
// Personal que puede ser responsable de una incidencia (HU-01 CA-02, HU-06).
export const RESPONSABLES = [...TECNICOS, ...PASANTES]

export const LIMITE_SOBRECARGA_DEFECTO = 3

export const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'pdf']
export const MIME_PERMITIDOS = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  pdf: ['application/pdf'],
}
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024
export const BUCKET_EVIDENCIAS = 'evidencias-incidencias'

// Mensajes EXACTOS exigidos por los criterios de aceptación.
export const MENSAJES = {
  PRIORIDAD_ANTES_DE_RESPONSABLE: 'Debe definir la prioridad antes de asignar un responsable',
  SIN_PENDIENTES: 'No hay incidencias pendientes',
  ACTIVIDAD_OBLIGATORIA: 'La descripción de la actividad es obligatoria',
  ACTIVIDAD_EN_CERRADA: 'No se pueden registrar actividades en una incidencia cerrada',
  FORMATO_NO_PERMITIDO: 'Formato de archivo no permitido',
  SOLUCION_ANTES_DE_CERRAR: 'Debe registrar la solución aplicada antes de cerrar la incidencia',
  RESPONSABLE_SIN_INCIDENCIAS: 'Este responsable no tiene incidencias asignadas',
}
