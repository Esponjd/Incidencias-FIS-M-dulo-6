// Capa de acceso a datos del Módulo 6. Usa SOLO el cliente de src/lib/supabase.js.
// Cada función lanza un Error con un mensaje legible si Supabase devuelve error:
// la interfaz nunca muestra "guardado" cuando la operación falló.
import { supabase } from '../../lib/supabase'
import { BUCKET_EVIDENCIAS } from './constants'
import { extensionDe } from './incidenciasValidation'

const CAMPOS_INCIDENCIA =
  'id,codigo,descripcion,equipo_ubicacion,estado,prioridad,responsable,solicitante_nombre,' +
  'solicitante_rol,user_id,estado_actualizado_at,fecha_cierre,created_at,updated_at'

function traducirError(error, accion) {
  if (!error) return null
  const codigo = error.code ? ` (código ${error.code})` : ''
  let detalle = error.message
  if (error.code === '42501') detalle = 'permiso denegado: revise los GRANT y políticas RLS del Módulo 6'
  if (error.code === '23514') detalle = 'el dato no cumple una restricción de la base de datos: ' + error.message
  if (error.code === '42P01') detalle = 'la tabla no existe: ejecute supabase/02_modulo6_incidencias.sql'
  return new Error(`${accion}: ${detalle}${codigo}`)
}

function cliente() {
  if (!supabase) throw new Error('Supabase no está configurado (revise el archivo .env)')
  return supabase
}

export async function listarIncidencias() {
  const { data, error } = await cliente()
    .from('incidencias')
    .select(CAMPOS_INCIDENCIA)
    .order('created_at', { ascending: true })
  if (error) throw traducirError(error, 'No se pudieron consultar las incidencias')
  return data ?? []
}

export async function obtenerDetalle(incidenciaId) {
  const db = cliente()
  const [actividades, observaciones, evidencias, historial] = await Promise.all([
    db.from('incidencia_actividades').select('*').eq('incidencia_id', incidenciaId)
      .order('created_at', { ascending: true }),
    db.from('incidencia_observaciones').select('*').eq('incidencia_id', incidenciaId)
      .order('created_at', { ascending: false }),
    db.from('incidencia_evidencias').select('*').eq('incidencia_id', incidenciaId)
      .order('created_at', { ascending: false }),
    db.from('incidencia_historial_estados').select('*').eq('incidencia_id', incidenciaId)
      .order('created_at', { ascending: true }),
  ])
  for (const r of [actividades, observaciones, evidencias, historial]) {
    if (r.error) throw traducirError(r.error, 'No se pudo consultar el detalle')
  }
  return {
    actividades: actividades.data ?? [],
    observaciones: observaciones.data ?? [],
    evidencias: evidencias.data ?? [],
    historial: historial.data ?? [],
  }
}

// HU-07: el estado "Pendiente", el código, user_id y created_at los pone PostgreSQL.
export async function crearIncidencia({ descripcion, equipoUbicacion, solicitanteNombre, solicitanteRol, userId }) {
  const { data, error } = await cliente()
    .from('incidencias')
    .insert({
      descripcion: descripcion.trim(),
      equipo_ubicacion: equipoUbicacion.trim(),
      solicitante_nombre: solicitanteNombre.trim(),
      solicitante_rol: solicitanteRol,
      actualizado_por: solicitanteNombre.trim(),
      user_id: userId,
    })
    .select(CAMPOS_INCIDENCIA)
    .single()
  if (error) throw traducirError(error, 'No se registró la incidencia')
  return data
}

async function actualizarIncidencia(id, cambios, accion) {
  const { data, error } = await cliente()
    .from('incidencias')
    .update(cambios)
    .eq('id', id)
    .select(CAMPOS_INCIDENCIA)
  if (error) throw traducirError(error, accion)
  if (!data?.length) throw new Error(`${accion}: ninguna fila fue actualizada (revise RLS)`)
  return data[0]
}

export const guardarPrioridad = (id, prioridad, autor) =>
  actualizarIncidencia(id, { prioridad, actualizado_por: autor }, 'No se guardó la prioridad')

export const asignarResponsable = (id, responsable, autor) =>
  actualizarIncidencia(id, { responsable, actualizado_por: autor }, 'No se asignó el responsable')

// HU-05: fecha de cambio, fecha de cierre e historial los registran los triggers.
export const cambiarEstado = (id, estado, autor) =>
  actualizarIncidencia(id, { estado, actualizado_por: autor }, 'No se cambió el estado')

export async function registrarActividad({ incidenciaId, descripcion, autor, userId }) {
  const { data, error } = await cliente()
    .from('incidencia_actividades')
    .insert({
      incidencia_id: incidenciaId,
      descripcion: descripcion.trim(),
      autor_nombre: autor.nombre,
      autor_rol: autor.rol,
      user_id: userId,
    })
    .select()
    .single()
  if (error) throw traducirError(error, 'No se registró la actividad')
  return data
}

export async function registrarObservacion({ incidenciaId, texto, actividadId, autor, userId }) {
  const { data, error } = await cliente()
    .from('incidencia_observaciones')
    .insert({
      incidencia_id: incidenciaId,
      actividad_id: actividadId || null,
      texto: texto.trim(),
      autor_nombre: autor.nombre,
      autor_rol: autor.rol,
      user_id: userId,
    })
    .select()
    .single()
  if (error) throw traducirError(error, 'No se guardó la observación')
  return data
}

// Sube el archivo a Storage si el bucket existe. Si no existe, NO falla:
// devuelve el aviso y la evidencia se registra solo con sus metadatos.
async function subirArchivoOpcional(archivo, userId, incidenciaId) {
  const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const ruta = `${userId}/${incidenciaId}/${Date.now()}_${nombreSeguro}`
  try {
    const { error } = await cliente().storage.from(BUCKET_EVIDENCIAS).upload(ruta, archivo, {
      contentType: archivo.type || undefined,
      upsert: false,
    })
    if (error) return { ruta: null, aviso: `el archivo no se subió a Storage (${error.message})` }
    return { ruta, aviso: null }
  } catch (e) {
    return { ruta: null, aviso: `el archivo no se subió a Storage (${e.message})` }
  }
}

export async function registrarEvidencia({ incidenciaId, archivo, origen, actividadId, autor, userId }) {
  const { ruta, aviso } = await subirArchivoOpcional(archivo, userId, incidenciaId)
  const { data, error } = await cliente()
    .from('incidencia_evidencias')
    .insert({
      incidencia_id: incidenciaId,
      actividad_id: actividadId || null,
      origen,
      nombre_archivo: archivo.name,
      extension: extensionDe(archivo.name),
      mime_type: archivo.type || null,
      tamano_bytes: archivo.size,
      storage_path: ruta,
      autor_nombre: autor.nombre,
      autor_rol: autor.rol,
      user_id: userId,
    })
    .select()
    .single()
  if (error) throw traducirError(error, 'No se registró la evidencia')
  return { evidencia: data, aviso }
}

export async function urlTemporalEvidencia(storagePath) {
  const { data, error } = await cliente().storage.from(BUCKET_EVIDENCIAS).createSignedUrl(storagePath, 300)
  if (error) throw traducirError(error, 'No se pudo abrir la evidencia')
  return data.signedUrl
}
