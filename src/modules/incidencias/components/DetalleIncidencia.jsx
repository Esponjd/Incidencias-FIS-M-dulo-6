// Detalle de una incidencia: clasificación (HU-01), actividades (HU-03),
// observaciones y evidencias (HU-04), estado e historial (HU-05).
import { useEffect, useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { PRIORIDADES, RESPONSABLES, ROLES } from '../constants'
import {
  asignarResponsable, cambiarEstado, guardarPrioridad, obtenerDetalle, registrarActividad,
  registrarEvidencia, registrarObservacion, urlTemporalEvidencia,
} from '../incidenciasService'
import {
  lineaDeTiempoSeguimiento, validarActividad, validarArchivo, validarAsignacion, validarCierre,
  validarInicioReparacion, validarObservacion, validarPrioridad,
} from '../incidenciasValidation'
import { BadgeEstado, BadgePrioridad, Mensaje, formatoFecha } from './ui'

const DETALLE_VACIO = { actividades: [], observaciones: [], evidencias: [], historial: [] }

export default function DetalleIncidencia({ incidencia, perfil, session, onCambio, onCerrar }) {
  const [detalle, setDetalle] = useState(DETALLE_VACIO)
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')
  // Un mensaje por sección para que el resultado aparezca junto a la acción.
  const [mensajes, setMensajes] = useState({})
  const [ocupado, setOcupado] = useState('')

  const [prioridad, setPrioridad] = useState(incidencia.prioridad || '')
  const [responsable, setResponsable] = useState(incidencia.responsable || '')
  const [actividad, setActividad] = useState('')
  const [observacion, setObservacion] = useState('')
  const [actividadObs, setActividadObs] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [actividadEvid, setActividadEvid] = useState('')
  const inputArchivo = useRef(null)

  const esCoordinador = perfil.rol === ROLES.COORDINADOR
  const esTecnico = perfil.rol === ROLES.TECNICO
  const esPasante = perfil.rol === ROLES.PASANTE
  const userId = session.user.id

  async function cargarDetalle() {
    setCargando(true)
    setErrorCarga('')
    try {
      setDetalle(await obtenerDetalle(incidencia.id))
    } catch (e) {
      setErrorCarga(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    setPrioridad(incidencia.prioridad || '')
    setResponsable(incidencia.responsable || '')
    setMensajes({})
    setActividad(''); setObservacion(''); setArchivo(null)
    cargarDetalle()
  }, [incidencia.id])

  useEffect(() => {
    setPrioridad(incidencia.prioridad || '')
    setResponsable(incidencia.responsable || '')
  }, [incidencia.prioridad, incidencia.responsable])

  const avisar = (seccion, tipo, texto) => setMensajes(m => ({ ...m, [seccion]: { tipo, texto } }))

  // Ejecuta una operación, muestra éxito SOLO si Supabase no devolvió error.
  async function ejecutar(seccion, operacion, textoExito) {
    setOcupado(seccion)
    avisar(seccion, 'info', '')
    try {
      const extra = await operacion()
      avisar(seccion, 'exito', typeof extra === 'string' ? `${textoExito} ${extra}` : textoExito)
      await Promise.all([onCambio(), cargarDetalle()])
      return true
    } catch (e) {
      avisar(seccion, 'error', e.message)
      return false
    } finally {
      setOcupado('')
    }
  }

  function bloquear(seccion, problema) {
    if (!problema) return false
    avisar(seccion, 'error', problema)
    return true
  }

  // ---------- HU-01 ----------
  const onGuardarPrioridad = () => {
    if (bloquear('clasificacion', validarPrioridad(prioridad))) return
    ejecutar('clasificacion', () => guardarPrioridad(incidencia.id, prioridad, perfil.nombre),
      `Prioridad «${prioridad}» guardada en PostgreSQL.`)
  }
  const onAsignar = () => {
    if (bloquear('clasificacion', validarAsignacion(incidencia, responsable))) return
    ejecutar('clasificacion', () => asignarResponsable(incidencia.id, responsable, perfil.nombre),
      `Incidencia asignada a ${responsable}.`)
  }

  // ---------- HU-05 ----------
  const onIniciarReparacion = () => {
    if (bloquear('estado', validarInicioReparacion(incidencia))) return
    ejecutar('estado', () => cambiarEstado(incidencia.id, 'En reparación', perfil.nombre),
      'Estado cambiado a «En reparación».')
  }
  const onCerrarIncidencia = () => {
    if (bloquear('estado', validarCierre(incidencia, detalle))) return
    ejecutar('estado', () => cambiarEstado(incidencia.id, 'Cerrada', perfil.nombre),
      'Incidencia cerrada; la fecha de cierre quedó registrada.')
  }

  // ---------- HU-03 ----------
  const onRegistrarActividad = async e => {
    e.preventDefault()
    if (bloquear('actividad', validarActividad(incidencia, actividad))) return
    const ok = await ejecutar('actividad',
      () => registrarActividad({ incidenciaId: incidencia.id, descripcion: actividad, autor: perfil, userId }),
      'Actividad registrada en el historial.')
    if (ok) setActividad('')
  }

  // ---------- HU-04 ----------
  const onGuardarObservacion = async e => {
    e.preventDefault()
    if (bloquear('seguimiento', validarObservacion(incidencia, observacion))) return
    const ok = await ejecutar('seguimiento',
      () => registrarObservacion({
        incidenciaId: incidencia.id, texto: observacion, actividadId: actividadObs, autor: perfil, userId,
      }),
      'Observación guardada.')
    if (ok) { setObservacion(''); setActividadObs('') }
  }

  const onElegirArchivo = e => {
    const f = e.target.files?.[0] || null
    const problema = f && validarArchivo(f)
    if (problema) {
      // HU-04 CA-03: se rechaza al seleccionar.
      avisar('seguimiento', 'error', problema)
      e.target.value = ''
      setArchivo(null)
      return
    }
    avisar('seguimiento', 'info', '')
    setArchivo(f)
  }

  const onAdjuntar = async e => {
    e.preventDefault()
    if (bloquear('seguimiento', validarArchivo(archivo))) return
    const ok = await ejecutar('seguimiento', async () => {
      const { aviso } = await registrarEvidencia({
        incidenciaId: incidencia.id, archivo, origen: 'Reparacion', actividadId: actividadEvid, autor: perfil, userId,
      })
      return aviso ? `(Aviso: ${aviso}; se guardaron sus metadatos.)` : ''
    }, `Evidencia «${archivo.name}» registrada.`)
    if (ok) {
      setArchivo(null); setActividadEvid('')
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  const abrirEvidencia = async ev => {
    if (!ev.storage_path) return
    try {
      window.open(await urlTemporalEvidencia(ev.storage_path), '_blank', 'noopener')
    } catch (e) {
      avisar('seguimiento', 'error', e.message)
    }
  }

  const seguimiento = lineaDeTiempoSeguimiento(detalle.observaciones, detalle.evidencias)
  const nombreActividad = id => detalle.actividades.find(a => a.id === id)?.descripcion
  const msg = s => mensajes[s] && <Mensaje tipo={mensajes[s].tipo}>{mensajes[s].texto}</Mensaje>
  const cerrada = incidencia.estado === 'Cerrada'

  return (
    <section className="panel inc-detalle">
      <div className="between inc-cabecera">
        <h3>{incidencia.codigo} · Detalle de la incidencia</h3>
        <button className="secondary small" onClick={onCerrar} aria-label="Cerrar detalle"><X size={15} /></button>
      </div>

      <div className="inc-datos">
        <div><span>Estado</span><BadgeEstado estado={incidencia.estado} /></div>
        <div><span>Prioridad</span><BadgePrioridad prioridad={incidencia.prioridad} /></div>
        <div><span>Responsable</span><b>{incidencia.responsable || 'Sin asignar'}</b></div>
        <div><span>Equipo / ubicación</span><b>{incidencia.equipo_ubicacion}</b></div>
        <div><span>Solicitante</span><b>{incidencia.solicitante_nombre} ({incidencia.solicitante_rol})</b></div>
        <div><span>Reportada</span><b>{formatoFecha(incidencia.created_at)}</b></div>
        {incidencia.fecha_cierre && <div><span>Cerrada</span><b>{formatoFecha(incidencia.fecha_cierre)}</b></div>}
      </div>
      <p className="inc-descripcion">{incidencia.descripcion}</p>
      {cargando && <p className="hint">Cargando detalle…</p>}
      <Mensaje tipo="error">{errorCarga}</Mensaje>

      {/* HU-01 · Clasificación (coordinador técnico) */}
      {esCoordinador && (
        <div className="inc-seccion">
          <h4>Clasificación y asignación</h4>
          <div className="inc-acciones">
            <label>
              Prioridad
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)} disabled={cerrada}>
                <option value="">Sin prioridad</option>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <button onClick={onGuardarPrioridad} disabled={cerrada || ocupado === 'clasificacion'}>Guardar prioridad</button>
            <label>
              Responsable
              <select value={responsable} onChange={e => setResponsable(e.target.value)} disabled={cerrada}>
                <option value="">Sin asignar</option>
                {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <button onClick={onAsignar} disabled={cerrada || ocupado === 'clasificacion'}>Asignar responsable</button>
          </div>
          {msg('clasificacion')}
        </div>
      )}

      {/* HU-05 · Estado (técnico de soporte o coordinador) */}
      {(esTecnico || esCoordinador) && !cerrada && (
        <div className="inc-seccion">
          <h4>Estado de la incidencia</h4>
          <div className="inc-acciones">
            {incidencia.estado === 'Pendiente' && (
              <button onClick={onIniciarReparacion} disabled={ocupado === 'estado'}>Pasar a «En reparación»</button>
            )}
            {incidencia.estado === 'En reparación' && (
              <button onClick={onCerrarIncidencia} disabled={ocupado === 'estado'}>Cerrar incidencia</button>
            )}
          </div>
          {msg('estado')}
        </div>
      )}

      {/* HU-03 · Actividades de la reparación */}
      <div className="inc-seccion">
        <h4>Actividades de la reparación ({detalle.actividades.length})</h4>
        {(esPasante || esTecnico) && (
          <form onSubmit={onRegistrarActividad} className="inc-form-linea" noValidate>
            <textarea
              className="inc-textarea"
              rows={2}
              maxLength={1000}
              value={actividad}
              onChange={e => setActividad(e.target.value)}
              placeholder="Ej.: Se reemplazó el cable de red del equipo PC-05"
            />
            <button type="submit" disabled={ocupado === 'actividad'}>Registrar actividad</button>
          </form>
        )}
        {msg('actividad')}
        <ul className="inc-lista">
          {detalle.actividades.length ? detalle.actividades.map(a => (
            <li key={a.id}>
              <b>{a.descripcion}</b>
              <span>{a.autor_nombre} · {a.autor_rol} · {formatoFecha(a.created_at)}</span>
            </li>
          )) : <li className="inc-vacio">Sin actividades registradas.</li>}
        </ul>
      </div>

      {/* HU-04 · Observaciones y evidencias */}
      <div className="inc-seccion">
        <h4>Observaciones y evidencias ({seguimiento.length})</h4>
        {(esTecnico || esPasante) && (
          <div className="inc-dos-columnas">
            <form onSubmit={onGuardarObservacion} noValidate>
              <label>
                Observación
                <textarea
                  className="inc-textarea"
                  rows={2}
                  maxLength={1000}
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  placeholder="Ej.: Se revisó el equipo y falla la fuente de poder"
                />
              </label>
              <SelectorActividad actividades={detalle.actividades} valor={actividadObs} onChange={setActividadObs} />
              <button type="submit" disabled={ocupado === 'seguimiento'}>Guardar observación</button>
            </form>
            <form onSubmit={onAdjuntar} noValidate>
              <label>
                Evidencia (.jpg, .jpeg, .png, .pdf · máx. 5 MB)
                <input ref={inputArchivo} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={onElegirArchivo} />
              </label>
              <SelectorActividad actividades={detalle.actividades} valor={actividadEvid} onChange={setActividadEvid} />
              <button type="submit" disabled={ocupado === 'seguimiento'}><Paperclip size={15} />Adjuntar evidencia</button>
            </form>
          </div>
        )}
        {msg('seguimiento')}
        <ul className="inc-lista">
          {seguimiento.length ? seguimiento.map(s => (
            <li key={s.tipo + s.id}>
              <span className={'inc-badge ' + (s.tipo === 'Evidencia' ? 'inc-media' : 'inc-ok')}>{s.tipo}</span>
              {s.tipo === 'Observación' ? (
                <b>{s.texto}</b>
              ) : (
                <b>
                  {s.storage_path
                    ? <button className="inc-enlace" onClick={() => abrirEvidencia(s)}>{s.nombre_archivo}</button>
                    : s.nombre_archivo}
                  {' '}<small>({s.origen === 'Reporte' ? 'adjunta en el reporte' : 'reparación'}
                  {!s.storage_path && ' · solo metadatos'})</small>
                </b>
              )}
              <span>
                {s.autor_nombre} · {formatoFecha(s.created_at)}
                {s.actividad_id && ` · vinculada a: ${nombreActividad(s.actividad_id) || 'actividad'}`}
              </span>
            </li>
          )) : <li className="inc-vacio">Sin observaciones ni evidencias.</li>}
        </ul>
      </div>

      {/* HU-05 CA-04 · Historial de estados */}
      <div className="inc-seccion">
        <h4>Historial de cambios de estado</h4>
        <div className="table-wrap">
          <table className="inc-tabla">
            <thead><tr><th>Estado anterior</th><th>Nuevo estado</th><th>Fecha y hora</th><th>Responsable del cambio</th></tr></thead>
            <tbody>
              {detalle.historial.length ? detalle.historial.map(h => (
                <tr key={h.id}>
                  <td>{h.estado_anterior || '— (registro)'}</td>
                  <td><BadgeEstado estado={h.estado_nuevo} /></td>
                  <td>{formatoFecha(h.created_at)}</td>
                  <td>{h.responsable}</td>
                </tr>
              )) : <tr><td colSpan="4" className="empty">Sin cambios registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// Vínculo OPCIONAL con una actividad de HU-03 (no bloquea si no hay actividades).
function SelectorActividad({ actividades, valor, onChange }) {
  if (!actividades.length) return null
  return (
    <label>
      Vincular a una actividad (opcional)
      <select value={valor} onChange={e => onChange(e.target.value)}>
        <option value="">Sin vincular</option>
        {actividades.map(a => <option key={a.id} value={a.id}>{a.descripcion.slice(0, 70)}</option>)}
      </select>
    </label>
  )
}
