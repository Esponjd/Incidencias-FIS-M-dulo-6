// Perfil operativo activo para la demostración. La sesión de Supabase sigue
// siendo la misma; el perfil solo define qué vistas y acciones se muestran y
// qué nombre queda como autor de cada registro.
import { ROLES, TECNICOS, PASANTES } from '../constants'

const NOMBRE_POR_DEFECTO = {
  [ROLES.COORDINADOR]: 'Coordinador técnico',
  [ROLES.TECNICO]: TECNICOS[0],
  [ROLES.PASANTE]: PASANTES[0],
  [ROLES.DOCENTE]: 'Docente de prueba',
  [ROLES.ESTUDIANTE]: 'Estudiante de prueba',
}

export function perfilInicial(rol = ROLES.COORDINADOR) {
  return { rol, nombre: NOMBRE_POR_DEFECTO[rol] }
}

export default function SelectorPerfil({ perfil, onChange }) {
  const cambiarRol = rol => onChange(perfilInicial(rol))
  const esSolicitante = perfil.rol === ROLES.DOCENTE || perfil.rol === ROLES.ESTUDIANTE

  return (
    <section className="panel inc-perfil">
      <div className="inc-perfil-fila">
        <label>
          Perfil operativo activo
          <select value={perfil.rol} onChange={e => cambiarRol(e.target.value)}>
            {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        {perfil.rol === ROLES.TECNICO && (
          <label>
            Técnico
            <select value={perfil.nombre} onChange={e => onChange({ ...perfil, nombre: e.target.value })}>
              {TECNICOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}

        {perfil.rol === ROLES.PASANTE && (
          <label>
            Pasante
            <select value={perfil.nombre} onChange={e => onChange({ ...perfil, nombre: e.target.value })}>
              {PASANTES.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
        )}

        {esSolicitante && (
          <label>
            Nombre del solicitante
            <input
              value={perfil.nombre}
              maxLength={120}
              onChange={e => onChange({ ...perfil, nombre: e.target.value })}
              placeholder="Nombre de prueba (no usar datos reales)"
            />
          </label>
        )}
      </div>
      <p className="hint">
        Actuando como <b>{perfil.nombre || '—'}</b> ({perfil.rol}). Todas las operaciones usan tu sesión real de
        Supabase; el perfil solo simula el rol para demostrar las HU.
      </p>
    </section>
  )
}
