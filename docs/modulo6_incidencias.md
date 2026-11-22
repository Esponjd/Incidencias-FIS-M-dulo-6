# Módulo 6 · Gestión de incidencias y reparaciones (Grupo 6)

Implementación del espacio **Módulo 06** de LABFIS / SIGELAB. En la plantilla ese espacio se llamaba «Apertura y cierre»; el módulo real del Grupo 6 es **Gestión de incidencias y reparaciones**. Los otros 7 módulos y el ejemplo docente `PrintingDemo.jsx` no se modificaron.

- Stack: React 18 + Vite 6 + Supabase (PostgreSQL + Auth), cliente único `src/lib/supabase.js`.
- Detalle de la base de datos: [`base_de_datos_modulo6.md`](base_de_datos_modulo6.md).
- Casos de prueba originales: [`evidencias/siglab_casos_de_prueba.xlsx`](evidencias/siglab_casos_de_prueba.xlsx).

## 1. Archivos creados y editados

| Archivo | Tipo | Propósito |
|---|---|---|
| `src/modules/incidencias/GestionIncidencias.jsx` | nuevo | Componente principal: perfil operativo, pestañas por rol y panel de detalle. |
| `src/modules/incidencias/components/SelectorPerfil.jsx` | nuevo | Selector del perfil activo (Coordinador, Técnico A–D, Pasante 1–2, Docente/Estudiante). |
| `src/modules/incidencias/components/RegistrarIncidencia.jsx` | nuevo | HU-07: formulario de registro con evidencia opcional. |
| `src/modules/incidencias/components/VistaPendientes.jsx` | nuevo | HU-02: pendientes con filtro de prioridad. |
| `src/modules/incidencias/components/CargaTrabajo.jsx` | nuevo | HU-06: resumen de carga, límite L y vista por responsable. |
| `src/modules/incidencias/components/DetalleIncidencia.jsx` | nuevo | HU-01, HU-03, HU-04 y HU-05 sobre una incidencia. |
| `src/modules/incidencias/components/TablaIncidencias.jsx` | nuevo | Tabla reutilizable de incidencias. |
| `src/modules/incidencias/components/ui.jsx` | nuevo | Badges de estado/prioridad, mensajes y formato de fecha. |
| `src/modules/incidencias/incidenciasService.js` | nuevo | Capa de acceso a datos (todas las consultas a Supabase). |
| `src/modules/incidencias/incidenciasValidation.js` | nuevo | Validaciones puras de los CA (sin React ni Supabase). |
| `src/modules/incidencias/constants.js` | nuevo | Catálogos (estados, prioridades, responsables) y mensajes exactos. |
| `src/modules/incidencias/incidencias.css` | nuevo | Estilos propios con prefijo `inc-`. |
| `supabase/02_modulo6_incidencias.sql` | nuevo | Tablas, restricciones, triggers, GRANT y RLS del módulo. |
| `supabase/03_modulo6_seed_pruebas.sql` | nuevo | Datos ficticios INC-001…INC-053 para los casos de prueba (opcional). |
| `src/modules/config.js` | editado | Solo la entrada del módulo 06: nombre, id `incidencias` e ícono. |
| `src/App.jsx` | editado | Importa `GestionIncidencias` y lo muestra cuando el menú activo es `incidencias`. |
| `.gitignore`, `.env.example` | nuevos | Evitar subir `.env`/`node_modules`; plantilla de variables. |
| `docs/modulo6_incidencias.md`, `docs/base_de_datos_modulo6.md` | nuevos | Documentación. |

## 2. Cómo ejecutar

1. Supabase → **SQL Editor**: ejecutar `01_base_demo.sql`  y luego `02_modulo6_incidencias.sql`.
2. Copiar `.env.example` como `.env` en la raíz y poner la URL y la *Publishable key* del proyecto del equipo.
3. `npm install` y `npm run dev`. Crear una cuenta de prueba e iniciar sesión.
4.  Ejecutar `03_modulo6_seed_pruebas.sql` para cargar los escenarios de prueba.
5. Menú **Gestión de incidencias** → elegir el perfil operativo en la parte superior.

## 3. Perfiles para la demostración

La sesión de Supabase es real y la misma para todas las operaciones (así se respetan GRANT y RLS). El **perfil operativo** solo cambia las vistas, las acciones disponibles y el nombre que queda como autor:

| Perfil | Pestañas | Acciones en el detalle |
|---|---|---|
| Coordinador técnico | Clasificación · Carga por responsable · Todas | Prioridad, responsable, cambio de estado |
| Técnico de soporte (A–D) | Pendientes · Mi lista de trabajo · Todas | Estado, actividades, observaciones, evidencias |
| Pasante (1–2) | Mis reparaciones · Todas | Actividades, observaciones, evidencias |
| Docente / Estudiante | Registrar incidencia · Mis reportes | Solo consulta |

Responsables asignables: Técnico A, B, C, D, Pasante 1 y Pasante 2.

## 4. Historias de usuario y criterios de aceptación

| HU | Rol | Resumen | CA |
|---|---|---|---|
| HU-01 Clasificación | Coordinador | Prioridad y responsable | CA-01 asignar prioridad · CA-02 asignar responsable · CA-03 orden Alta→Media→Baja · CA-04 bloqueo «Debe definir la prioridad antes de asignar un responsable» |
| HU-02 Consultar | Técnico | Pendientes y filtro | CA-01 código, descripción, prioridad y fecha · CA-02 excluye cerradas/en reparación · CA-03 filtro · CA-04 «No hay incidencias pendientes» |
| HU-03 Actividades | Pasante | Historial de reparación | CA-01 registro con fecha/hora/autor · CA-02 «La descripción de la actividad es obligatoria» · CA-03 orden cronológico · CA-04 «No se pueden registrar actividades en una incidencia cerrada» |
| HU-04 Observaciones/evidencias | Técnico | Seguimiento | CA-01 observación con fecha y autor (vínculo opcional a actividad) · CA-02 .jpg/.jpeg/.png/.pdf · CA-03 «Formato de archivo no permitido» · CA-04 de la más reciente a la más antigua |
| HU-05 Estado y cierre | Técnico | Ciclo de vida | CA-01 a «En reparación» con fecha · CA-02 cierre con fecha · CA-03 «Debe registrar la solución aplicada antes de cerrar la incidencia» · CA-04 historial automático |
| HU-06 Carga | Coordinador | Distribución | CA-01 incidencias del responsable · CA-02 activas por responsable · CA-03 «Sobrecargado» si activas > L (L=3 configurable) · CA-04 «Este responsable no tiene incidencias asignadas» |
| HU-07 Registrar | Docente/Estudiante | Reporte | CA-01 estado Pendiente y código INC-xxx · CA-02 campos faltantes · CA-03 evidencia en el registro · CA-04 solicitante, rol y fecha automáticos |

## 5. Relación pantalla ↔ CA ↔ dónde se valida

| CA | Pantalla | Validación en React | Garantía en PostgreSQL |
|---|---|---|---|
| HU1 CA-01/02 | Detalle → Clasificación | `validarPrioridad`, `validarAsignacion` | CHECK de `prioridad`; UPDATE con columnas permitidas |
| HU1 CA-03 | Coordinador → Clasificación | `ordenarPorPrioridad` | — |
| HU1 CA-04 | Detalle → Asignar responsable | `validarAsignacion` (prioridad guardada) | `CHECK (responsable IS NULL OR prioridad IS NOT NULL)` |
| HU2 CA-01…04 | Técnico → Pendientes | filtro `estado = 'Pendiente'` + prioridad | CHECK de `estado` |
| HU3 CA-01/03 | Detalle → Actividades | `validarActividad` | `created_at` automático, FK, orden por fecha |
| HU3 CA-02 | Detalle → Actividades | descripción no vacía | `CHECK (char_length(trim(descripcion)) > 0)` |
| HU3 CA-04 | Detalle → Actividades | estado ≠ Cerrada | trigger `actividades_validar_incidencia` |
| HU4 CA-01 | Detalle → Observación | `validarObservacion` | FK opcional `actividad_id` + trigger de misma incidencia |
| HU4 CA-02/03 | Detalle → Evidencia | `validarArchivo` (extensión + MIME + 5 MB) | CHECK de `extension`, `mime_type`, `tamano_bytes` |
| HU4 CA-04 | Detalle → línea de tiempo | orden descendente | — |
| HU5 CA-01/02 | Detalle → Estado | `validarInicioReparacion`, `validarCierre` | trigger: `estado_actualizado_at`, `fecha_cierre` |
| HU5 CA-03 | Detalle → Cerrar | `validarCierre` | trigger rechaza el cierre sin observación/evidencia |
| HU5 CA-04 | Detalle → Historial | — | trigger `incidencias_registrar_historial` |
| HU6 CA-01…04 | Coordinador → Carga | `calcularCarga` | — |
| HU7 CA-01/04 | Docente/Estudiante → Registrar | `validarNuevaIncidencia` | DEFAULT de `codigo`, `estado`, `user_id`, `created_at` |
| HU7 CA-02 | Registrar | lista de campos faltantes | NOT NULL + CHECK de longitud |
| HU7 CA-03 | Registrar → evidencia | `validarArchivo` | evidencia con `origen = 'Reporte'` |

## 6. Matriz de los 28 casos de prueba

| ID | Perfil | Datos | Resultado esperado 
|---|---|---|---|---|---|
| TC-HU1-CA01 | Coordinador | INC-001 sin prioridad | Guarda «Alta» y se ve en detalle y listado | 
| TC-HU1-CA02 | Coordinador → Técnico A | INC-002 (Alta) | Aparece en «Mi lista de trabajo» de Técnico A | 
| TC-HU1-CA03 | Coordinador | INC-003/004/005 | Orden INC-004, INC-005, INC-003 | 
| TC-HU1-CA04 | Coordinador | INC-006 sin prioridad | «Debe definir la prioridad antes de asignar un responsable», sin cambios | 
| TC-HU2-CA01 | Técnico | INC-010/011/012 | Código, descripción, prioridad y fecha | 
| TC-HU2-CA02 | Técnico | INC-013 / INC-014 | Solo aparece INC-013 | 
| TC-HU2-CA03 | Técnico | Filtro «Alta» | Solo pendientes Alta | 
| TC-HU2-CA04 | Técnico | BD sin pendientes | «No hay incidencias pendientes» |
| TC-HU3-CA01 | Pasante 1 | INC-020 | Actividad con fecha, hora y autor Pasante 1 |
| TC-HU3-CA02 | Pasante 1 | INC-020 | «La descripción de la actividad es obligatoria», conteo igual | 
| TC-HU3-CA03 | Pasante | INC-021 (3 actividades) | Orden cronológico con autor y fecha | 
| TC-HU3-CA04 | Pasante | INC-022 (Cerrada) | «No se pueden registrar actividades en una incidencia cerrada» | 
| TC-HU4-CA01 | Técnico A | INC-030 | Observación con fecha y autor Técnico A | 
| TC-HU4-CA02 | Técnico | INC-031 + evidencia.png | Aparece en la lista de evidencias |
| TC-HU4-CA03 | Técnico | INC-031 + programa.exe | «Formato de archivo no permitido» |
| TC-HU4-CA04 | Técnico | INC-032 (2 obs. + 2 evid.) | De la más reciente a la más antigua |
| TC-HU5-CA01 | Técnico C | INC-040 | «En reparación» + fila en historial | 
| TC-HU5-CA02 | Técnico C | INC-041 | «Cerrada» con fecha de cierre | 
| TC-HU5-CA03 | Técnico C | INC-042 sin solución | «Debe registrar la solución aplicada antes de cerrar la incidencia», sigue En reparación  |
| TC-HU5-CA04 | Cualquiera | INC-043 | Pendiente → En reparación → Cerrada con fecha y responsable |
| TC-HU6-CA01 | Coordinador | Técnico A | Sus incidencias (INC-030, 050, 051); no aparece INC-052 | 
| TC-HU6-CA02 | Coordinador | Resumen | Técnico A: 3 activas (1 cerrada); Técnico B: 1 |
| TC-HU6-CA03 | Coordinador | L = 3 | Técnico C (4) «Sobrecargado»; Técnico B no |
| TC-HU6-CA04 | Coordinador | Técnico D | «Este responsable no tiene incidencias asignadas» | 
| TC-HU7-CA01 | Docente | «El computador no enciende», «Laboratorio 3 - PC-12» | Pendiente + código; persiste al recargar | 
| TC-HU7-CA02 | Estudiante | Campos vacíos | Mensaje con campos faltantes; sin INSERT |
| TC-HU7-CA03 | Estudiante | foto.jpg | Evidencia visible en el detalle | 
| TC-HU7-CA04 | Docente y Estudiante | Dos registros | Nombre, rol y fecha/hora coherentes | 



## 7. Verificación realizada

- `npm run build` compila sin errores (Vite 6.4).
- Las validaciones puras (`incidenciasValidation.js`) se comprobaron con casos de los CA (mensajes exactos, orden por prioridad, formatos de archivo, carga y sobrecarga).
- **No verificado aún**: la ejecución de los scripts SQL en Supabase ni los 28 casos de prueba en el navegador. 


