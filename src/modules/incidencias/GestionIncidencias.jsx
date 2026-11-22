// Módulo 6 · Gestión de incidencias y reparaciones (Grupo 6 · SIGELAB / LABFIS).
// Componente principal: perfil operativo, pestañas por rol y detalle.
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { isConfigured } from '../../lib/supabase'
import { ESTADOS, ROLES } from './constants'
import { listarIncidencias } from './incidenciasService'
import { ordenarPorPrioridad } from './incidenciasValidation'
import SelectorPerfil, { perfilInicial } from './components/SelectorPerfil'
import TablaIncidencias from './components/TablaIncidencias'
import RegistrarIncidencia from './components/RegistrarIncidencia'
import VistaPendientes from './components/VistaPendientes'
import CargaTrabajo from './components/CargaTrabajo'
import DetalleIncidencia from './components/DetalleIncidencia'
import { Mensaje } from './components/ui'
import './incidencias.css'

// Pestañas disponibles según el perfil activo.
const PESTANAS = {
  [ROLES.COORDINADOR]: [['clasificacion', 'Clasificación'], ['carga', 'Carga por responsable'], ['todas', 'Todas']],
  [ROLES.TECNICO]: [['pendientes', 'Pendientes'], ['trabajo', 'Mi lista de trabajo'], ['todas', 'Todas']],
  [ROLES.PASANTE]: [['reparaciones', 'Mis reparaciones'], ['todas', 'Todas']],
  [ROLES.DOCENTE]: [['registrar', 'Registrar incidencia'], ['mias', 'Mis reportes']],
  [ROLES.ESTUDIANTE]: [['registrar', 'Registrar incidencia'], ['mias', 'Mis reportes']],
}

export default function GestionIncidencias({ module, session }) {
  const [perfil, setPerfil] = useState(perfilInicial())
  const [pestana, setPestana] = useState('clasificacion')
  const [incidencias, setIncidencias] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    if (!session) return
    setCargando(true)
    setError('')
    try {
      setIncidencias(await listarIncidencias())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [session?.user?.id])

  const cambiarPerfil = nuevo => {
    if (nuevo.rol !== perfil.rol) {
      setPestana(PESTANAS[nuevo.rol][0][0])
      setSeleccionadaId(null)
    }
    setPerfil(nuevo)
  }

  const seleccionada = incidencias.find(i => i.id === seleccionadaId) || null

  const todasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return ordenarPorPrioridad(incidencias.filter(i =>
      (filtroEstado === 'Todos' || i.estado === filtroEstado) &&
      (!texto || i.codigo.toLowerCase().includes(texto) || i.descripcion.toLowerCase().includes(texto))))
  }, [incidencias, filtroEstado, busqueda])

  const encabezado = (
    <>
      <div className="eyebrow">MÓDULO {module.number} · GRUPO 6</div>
      <h2>{module.name}</h2>
      <p className="muted">{module.summary}</p>
    </>
  )

  if (!isConfigured) {
    return <div className="module-page">{encabezado}<div className="notice">Configura Supabase (archivo <code>.env</code>) y ejecuta <code>supabase/02_modulo6_incidencias.sql</code> para usar este módulo.</div></div>
  }
  if (!session) {
    return <div className="module-page">{encabezado}<div className="notice">Inicia sesión con tu cuenta de prueba para registrar y consultar incidencias en PostgreSQL.</div></div>
  }

  const tablaSimple = (lista, vacio) => (
    <section className="panel">
      <TablaIncidencias incidencias={lista} seleccionadaId={seleccionadaId} onSeleccionar={setSeleccionadaId} vacio={vacio} />
    </section>
  )

  function contenido() {
    switch (pestana) {
      case 'clasificacion': {
        // HU-01 CA-03: Alta → Media → Baja y, aparte, las que no tienen prioridad.
        const abiertas = incidencias.filter(i => i.estado !== 'Cerrada')
        const conPrioridad = ordenarPorPrioridad(abiertas.filter(i => i.prioridad))
        const sinPrioridad = ordenarPorPrioridad(abiertas.filter(i => !i.prioridad))
        return (
          <>
            <section className="panel">
              <h3>Incidencias abiertas por prioridad</h3>
              <TablaIncidencias incidencias={conPrioridad} seleccionadaId={seleccionadaId}
                onSeleccionar={setSeleccionadaId} vacio="No hay incidencias abiertas con prioridad." />
            </section>
            <section className="panel">
              <h3>Sin prioridad asignada ({sinPrioridad.length})</h3>
              <TablaIncidencias incidencias={sinPrioridad} seleccionadaId={seleccionadaId}
                onSeleccionar={setSeleccionadaId} vacio="Todas las incidencias abiertas tienen prioridad." />
            </section>
          </>
        )
      }
      case 'carga':
        return <CargaTrabajo incidencias={incidencias} seleccionadaId={seleccionadaId} onSeleccionar={setSeleccionadaId} />
      case 'pendientes':
        return <VistaPendientes incidencias={incidencias} seleccionadaId={seleccionadaId} onSeleccionar={setSeleccionadaId} />
      case 'trabajo':
        // HU-01 CA-02: lista de trabajo del técnico seleccionado.
        return tablaSimple(
          ordenarPorPrioridad(incidencias.filter(i => i.responsable === perfil.nombre && i.estado !== 'Cerrada')),
          `${perfil.nombre} no tiene incidencias activas asignadas.`)
      case 'reparaciones':
        return tablaSimple(
          ordenarPorPrioridad(incidencias.filter(i => i.responsable === perfil.nombre && i.estado !== 'Cerrada')),
          `${perfil.nombre} no tiene reparaciones asignadas.`)
      case 'registrar':
        return <RegistrarIncidencia perfil={perfil} session={session} onRegistrada={async nueva => { await cargar(); setSeleccionadaId(nueva.id) }} />
      case 'mias':
        return tablaSimple(
          incidencias.filter(i => i.user_id === session.user.id && i.solicitante_nombre === perfil.nombre)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          'Todavía no has registrado incidencias con este nombre.')
      default:
        return (
          <section className="panel">
            <div className="inc-filtros inc-cabecera">
              <label className="inc-filtro">
                Estado
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option>Todos</option>
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </label>
              <label className="inc-filtro">
                Buscar por código o descripción
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Ej.: INC-022" />
              </label>
            </div>
            <TablaIncidencias incidencias={todasFiltradas} seleccionadaId={seleccionadaId}
              onSeleccionar={setSeleccionadaId} vacio="No hay incidencias que coincidan con el filtro." />
          </section>
        )
    }
  }

  return (
    <div className="module-page inc-modulo">
      {encabezado}
      <SelectorPerfil perfil={perfil} onChange={cambiarPerfil} />

      <div className="between inc-cabecera">
        <div className="tabs">
          {PESTANAS[perfil.rol].map(([id, nombre]) => (
            <button key={id} className={pestana === id ? 'active' : ''} onClick={() => setPestana(id)}>{nombre}</button>
          ))}
        </div>
        <button className="secondary small" onClick={cargar} disabled={cargando}>
          <RefreshCw size={15} />{cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      <Mensaje tipo="error">{error}</Mensaje>

      {contenido()}

      {seleccionada && (
        <DetalleIncidencia
          incidencia={seleccionada}
          perfil={perfil}
          session={session}
          onCambio={cargar}
          onCerrar={() => setSeleccionadaId(null)}
        />
      )}
    </div>
  )
}
