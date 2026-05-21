# Diseño: Bloqueo de rango horario en la agenda

**Fecha:** 2026-05-21  
**Estado:** Aprobado

## Contexto

La agenda soporta dos tipos de áreas: atenciones cada 30 minutos y atenciones cada 60 minutos. El formulario de bloqueos actual permite bloquear un único slot (una hora específica). El usuario necesita poder bloquear un rango de horas (de X a Y) en un solo registro.

## Decisión de almacenamiento

Un solo registro con formato de rango en el campo `hora`: `"08:00-10:00"`. Esta opción no requiere cambios en el backend GAS ya que `crearBloqueo` y `leerBloqueos` tratan el campo `hora` como string puro.

## Cambios requeridos (todos en `index.html`)

### 1. Formulario HTML — `id="cfgPanelBloqueos"` (~línea 1236)

- La grilla `1fr 1fr` de `[Fecha | Hora]` cambia a `1fr 1fr 1fr` con tres campos: `[Fecha | Hora inicio | Hora fin]`
- Label de `mbHora` cambia a "Hora inicio"
- Nuevo campo `id="mbHoraFin"` tipo `time`, label "Hora fin (opcional)"

### 2. Función `crearBloqueoModal()` (~línea 4378)

Lógica de construcción del valor `hora`:

```
horaInicio = mbHora || '*'
horaFin    = mbHoraFin  (puede estar vacío)

si horaInicio != '*' y horaFin no vacío:
  validar horaFin > horaInicio → error si no
  hora = "HH:MM-HH:MM"
sino:
  hora = horaInicio  (comportamiento anterior intacto)
```

Limpieza post-creación: vaciar `mbHoraFin` junto con los demás campos.

### 3. Función `esBloqueado()` (~línea 4574)

Detección de rango inline, retrocompatible:

```
si b.hora === '*'  → siempre bloqueado
sino si b.hora contiene '-':
  [ini, fin] = b.hora.split('-')
  bloqueado si hora >= ini && hora < fin
sino:
  bloqueado si b.hora === hora  (lógica original)
```

### 4. `renderListaBloqueosModal()` — sin cambios

Ya renderiza `b.hora` como texto, por lo que "08:00-10:00" se muestra correctamente.

## Retrocompatibilidad

Los bloqueos existentes con `hora` simple (e.g., `"08:00"`) siguen funcionando sin modificación porque la nueva rama solo aplica cuando `b.hora.includes('-')`.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | Formulario, `crearBloqueoModal`, `esBloqueado` |
| `gasindex.txt` | Ninguno |
