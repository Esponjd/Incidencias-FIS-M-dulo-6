-- =====================================================================
-- LABFIS | MÓDULO 6 · DATOS DE PRUEBA (OPCIONAL)
-- Crea los escenarios INC-001 a INC-053 usados en los 28 casos de prueba.
--
-- Requisitos:
--   1. Haber ejecutado 02_modulo6_incidencias.sql.
--   2. Haber creado AL MENOS UNA cuenta de prueba desde la aplicación
--      (los registros se firman con el primer usuario de auth.users).
--
-- Es idempotente: borra y vuelve a crear SOLO los códigos del seed.
-- Todos los datos son ficticios.
-- =====================================================================
do $$
declare
  u    uuid;
  base timestamptz := date_trunc('minute', now()) - interval '3 days';
  v    uuid;
begin
  select id into u from auth.users order by created_at limit 1;
  if u is null then
    raise exception 'Primero crea una cuenta de prueba en la aplicación (auth.users está vacío).';
  end if;

  delete from public.incidencias
  where codigo in ('INC-001','INC-002','INC-003','INC-004','INC-005','INC-006',
                   'INC-010','INC-011','INC-012','INC-013','INC-014',
                   'INC-020','INC-021','INC-022',
                   'INC-030','INC-031','INC-032',
                   'INC-040','INC-041','INC-042','INC-043',
                   'INC-050','INC-051','INC-052','INC-053');

  -- ---------- HU-01 · Clasificación ----------
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, prioridad, responsable,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-001', 'El proyector no muestra imagen',          'Laboratorio 1 - Proyector', null,   null, 'Docente de prueba',    'Docente',    u, base + interval '1 min'),
  ('INC-002', 'Sin conexión a internet en toda la fila', 'Laboratorio 2 - Fila B',    'Alta', null, 'Estudiante de prueba', 'Estudiante', u, base + interval '2 min'),
  ('INC-003', 'Mouse con doble clic intermitente',       'Laboratorio 3 - PC-02',     'Baja', null, 'Estudiante de prueba', 'Estudiante', u, base + interval '3 min'),
  ('INC-004', 'Servidor de prácticas no responde',       'Laboratorio 4 - Rack',      'Alta', null, 'Docente de prueba',    'Docente',    u, base + interval '4 min'),
  ('INC-005', 'Teclado con teclas pegadas',              'Laboratorio 3 - PC-08',     'Media',null, 'Estudiante de prueba', 'Estudiante', u, base + interval '5 min'),
  ('INC-006', 'Monitor parpadea al encender',            'Laboratorio 1 - PC-10',     null,   null, 'Estudiante de prueba', 'Estudiante', u, base + interval '6 min');

  -- ---------- HU-02 · Consultar pendientes ----------
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, prioridad, responsable,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-010', 'Impresora atasca el papel',           'Laboratorio 2 - Impresora', 'Alta',  null, 'Docente de prueba',    'Docente',    u, base + interval '10 min'),
  ('INC-011', 'Software de simulación no abre',      'Laboratorio 4 - PC-03',     'Media', null, 'Estudiante de prueba', 'Estudiante', u, base + interval '11 min'),
  ('INC-012', 'Silla rota junto a la puerta',        'Laboratorio 1 - Puesto 15', 'Baja',  null, 'Estudiante de prueba', 'Estudiante', u, base + interval '12 min'),
  ('INC-013', 'Parlantes no emiten sonido',          'Laboratorio 2 - PC-01',     'Media', null, 'Docente de prueba',    'Docente',    u, base + interval '13 min');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  fecha_cierre, solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-014', 'Cable HDMI dañado', 'Laboratorio 3 - Proyector', 'Cerrada', 'Baja', 'Técnico B', 'Técnico B',
          base + interval '1 day', 'Docente de prueba', 'Docente', u, base + interval '14 min')
  returning id into v;
  insert into public.incidencia_observaciones (incidencia_id, texto, autor_nombre, autor_rol, user_id, created_at)
  values (v, 'Se reemplazó el cable HDMI por uno nuevo', 'Técnico B', 'Técnico de soporte', u, base + interval '20 hours');

  -- ---------- HU-03 · Actividades ----------
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-020', 'PC sin acceso a la red', 'Laboratorio 3 - PC-05', 'En reparación', 'Alta', 'Pasante 1', 'Coordinador técnico',
   'Estudiante de prueba', 'Estudiante', u, base + interval '20 min');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-021', 'Equipo se reinicia solo', 'Laboratorio 4 - PC-07', 'En reparación', 'Media', 'Pasante 1', 'Coordinador técnico',
          'Docente de prueba', 'Docente', u, base + interval '21 min')
  returning id into v;
  insert into public.incidencia_actividades (incidencia_id, descripcion, autor_nombre, autor_rol, user_id, created_at) values
  (v, 'Se revisaron los registros de eventos del sistema',  'Pasante 1', 'Pasante',            u, base + interval '1 day 1 hour'),
  (v, 'Se limpió el polvo del ventilador del procesador',   'Pasante 2', 'Pasante',            u, base + interval '1 day 3 hours'),
  (v, 'Se reemplazó la pasta térmica del procesador',       'Técnico A', 'Técnico de soporte', u, base + interval '1 day 5 hours');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  fecha_cierre, solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-022', 'Pantalla con píxeles muertos', 'Laboratorio 2 - PC-09', 'Cerrada', 'Baja', 'Pasante 1', 'Pasante 1',
          base + interval '2 days', 'Estudiante de prueba', 'Estudiante', u, base + interval '22 min')
  returning id into v;
  insert into public.incidencia_observaciones (incidencia_id, texto, autor_nombre, autor_rol, user_id, created_at)
  values (v, 'Se cambió el monitor por uno de repuesto', 'Pasante 1', 'Pasante', u, base + interval '1 day 20 hours');

  -- ---------- HU-04 · Observaciones y evidencias ----------
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-030', 'La PC no enciende',             'Laboratorio 1 - PC-04', 'En reparación', 'Alta',  'Técnico A', 'Coordinador técnico', 'Docente de prueba',    'Docente',    u, base + interval '30 min'),
  ('INC-031', 'Lector de tarjetas sin lectura', 'Laboratorio 2 - Puerta', 'En reparación', 'Media', 'Pasante 2', 'Coordinador técnico', 'Estudiante de prueba', 'Estudiante', u, base + interval '31 min');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-032', 'Switch con puertos caídos', 'Laboratorio 4 - Rack', 'En reparación', 'Baja', 'Pasante 2', 'Coordinador técnico',
          'Docente de prueba', 'Docente', u, base + interval '32 min')
  returning id into v;
  insert into public.incidencia_observaciones (incidencia_id, texto, autor_nombre, autor_rol, user_id, created_at) values
  (v, 'Los puertos 1 a 4 no negocian enlace',        'Pasante 2', 'Pasante',            u, base + interval '1 day 1 hour'),
  (v, 'Se actualizó el firmware del switch',         'Técnico B', 'Técnico de soporte', u, base + interval '1 day 4 hours');
  insert into public.incidencia_evidencias (incidencia_id, origen, nombre_archivo, extension, mime_type, tamano_bytes,
                                            autor_nombre, autor_rol, user_id, created_at) values
  (v, 'Reparacion', 'puertos_switch.jpg',    'jpg', 'image/jpeg',      245000, 'Pasante 2', 'Pasante',            u, base + interval '1 day 2 hours'),
  (v, 'Reparacion', 'informe_firmware.pdf',  'pdf', 'application/pdf', 512000, 'Técnico B', 'Técnico de soporte', u, base + interval '1 day 5 hours');

  -- ---------- HU-05 · Estados y cierre ----------
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-040', 'Proyector con imagen amarillenta', 'Laboratorio 3 - Proyector', 'Alta', 'Técnico C', 'Coordinador técnico',
   'Docente de prueba', 'Docente', u, base + interval '40 min');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-041', 'Disco duro con sectores dañados', 'Laboratorio 1 - PC-06', 'En reparación', 'Media', 'Técnico C', 'Técnico C',
          'Estudiante de prueba', 'Estudiante', u, base + interval '41 min')
  returning id into v;
  insert into public.incidencia_observaciones (incidencia_id, texto, autor_nombre, autor_rol, user_id, created_at)
  values (v, 'Se reemplazó el disco duro y se restauró la imagen del sistema', 'Técnico C', 'Técnico de soporte', u, base + interval '1 day');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-042', 'Fuente de poder hace ruido', 'Laboratorio 2 - PC-11', 'En reparación', 'Alta', 'Técnico C', 'Técnico C',
   'Docente de prueba', 'Docente', u, base + interval '42 min');

  -- INC-043 recorre Pendiente -> En reparación -> Cerrada con UPDATE reales,
  -- así el trigger genera su historial de estados.
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at)
  values ('INC-043', 'Aire acondicionado no enfría', 'Laboratorio 4 - Aula', 'Media', 'Técnico A', 'Coordinador técnico',
          'Docente de prueba', 'Docente', u, base + interval '43 min')
  returning id into v;
  update public.incidencias set estado = 'En reparación', actualizado_por = 'Técnico A' where id = v;
  insert into public.incidencia_observaciones (incidencia_id, texto, autor_nombre, autor_rol, user_id)
  values (v, 'Se recargó el gas refrigerante del equipo', 'Técnico A', 'Técnico de soporte', u);
  update public.incidencias set estado = 'Cerrada', actualizado_por = 'Técnico A' where id = v;

  -- ---------- HU-06 · Carga por responsable ----------
  -- Técnico A: INC-030, INC-050, INC-051 activas (3) + INC-043 cerrada.
  -- Técnico B: INC-052 activa (1) + INC-014 cerrada.
  -- Técnico C: INC-040, INC-041, INC-042, INC-053 activas (4) -> Sobrecargado con L = 3.
  -- Técnico D: sin incidencias.
  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-050', 'Webcam no detectada',          'Laboratorio 1 - PC-01', 'Alta',  'Técnico A', 'Coordinador técnico', 'Estudiante de prueba', 'Estudiante', u, base + interval '50 min'),
  ('INC-052', 'Puerto USB frontal flojo',      'Laboratorio 2 - PC-03', 'Media', 'Técnico B', 'Coordinador técnico', 'Estudiante de prueba', 'Estudiante', u, base + interval '52 min'),
  ('INC-053', 'Reloj del sistema desfasado',  'Laboratorio 3 - PC-11', 'Baja',  'Técnico C', 'Coordinador técnico', 'Docente de prueba',    'Docente',    u, base + interval '53 min');

  insert into public.incidencias (codigo, descripcion, equipo_ubicacion, estado, prioridad, responsable, actualizado_por,
                                  solicitante_nombre, solicitante_rol, user_id, created_at) values
  ('INC-051', 'Licencia de software vencida', 'Laboratorio 4 - PC-09', 'En reparación', 'Baja', 'Técnico A', 'Técnico A',
   'Docente de prueba', 'Docente', u, base + interval '51 min');
end $$;

-- Verificación rápida
select codigo, estado, prioridad, responsable from public.incidencias order by codigo;
