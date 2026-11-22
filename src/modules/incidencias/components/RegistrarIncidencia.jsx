// HU-07 · Registrar incidencias (Docente / Estudiante).
import { useRef, useState } from 'react'
import { crearIncidencia, registrarEvidencia } from '../incidenciasService'
import { validarArchivo, validarNuevaIncidencia } from '../incidenciasValidation'
import { Mensaje } from './ui'

const VACIO = { descripcion: '', equipoUbicacion: '' }

export default function RegistrarIncidencia({ perfil, session, onRegistrada }) {
  const [form, setForm] = useState(VACIO)
  const [archivo, setArchivo] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const inputArchivo = useRef(null)

  function elegirArchivo(e) {
    const f = e.target.files?.[0] || null
    setError('')
    if (f) {
      const problema = validarArchivo(f)
      if (problema) {
        // HU-07 CA-03: rechazo inmediato de formatos no permitidos.
        setError(problema)
        setArchivo(null)
        e.target.value = ''
        return
      }
    }
    setArchivo(f)
  }

  async function guardar(e) {
    e.preventDefault()
    setError(''); setExito(''); setAviso('')
    const problema = validarNuevaIncidencia({ ...form, solicitanteNombre: perfil.nombre })
    if (problema) { setError(problema); return }
    if (archivo) {
      const problemaArchivo = validarArchivo(archivo)
      if (problemaArchivo) { setError(problemaArchivo); return }
    }

    setGuardando(true)
    try {
      const incidencia = await crearIncidencia({
        descripcion: form.descripcion,
        equipoUbicacion: form.equipoUbicacion,
        solicitanteNombre: perfil.nombre,
        solicitanteRol: perfil.rol,
        userId: session.user.id,
      })
      setExito(`Incidencia registrada con el código ${incidencia.codigo} en estado Pendiente.`)
      if (archivo) {
        try {
          const { aviso: avisoStorage } = await registrarEvidencia({
            incidenciaId: incidencia.id,
            archivo,
            origen: 'Reporte',
            autor: perfil,
            userId: session.user.id,
          })
          if (avisoStorage) setAviso(`Evidencia «${archivo.name}» registrada (metadatos); ${avisoStorage}.`)
        } catch (errEvidencia) {
          // La incidencia sí se creó: se informa el fallo de la evidencia por separado.
          setError(errEvidencia.message)
        }
      }
      setForm(VACIO)
      setArchivo(null)
      if (inputArchivo.current) inputArchivo.current.value = ''
      onRegistrada?.(incidencia)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="panel">
      <h3>Registrar incidencia</h3>
      <form onSubmit={guardar} noValidate>
        <label>
          Descripción del problema *
          <textarea
            className="inc-textarea"
            rows={3}
            maxLength={1000}
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Ej.: El computador no enciende"
          />
        </label>
        <label>
          Equipo / ubicación afectada *
          <input
            maxLength={200}
            value={form.equipoUbicacion}
            onChange={e => setForm({ ...form, equipoUbicacion: e.target.value })}
            placeholder="Ej.: Laboratorio 3 - PC-12"
          />
        </label>
        <label>
          Evidencia (opcional: .jpg, .jpeg, .png, .pdf · máx. 5 MB)
          <input ref={inputArchivo} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={elegirArchivo} />
        </label>
        <p className="hint inc-sin-margen">
          Solicitante: <b>{perfil.nombre || '—'}</b> · Rol: <b>{perfil.rol}</b> · La fecha y hora se registran
          automáticamente.
        </p>
        <button type="submit" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar incidencia'}</button>
      </form>
      <Mensaje tipo="error">{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>
      <Mensaje>{aviso}</Mensaje>
    </section>
  )
}
