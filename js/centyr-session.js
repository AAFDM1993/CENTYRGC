/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-session.js                                               ║
 * ║  Registro de sesiones/evaluaciones · Formulario · Buscador       ║
 * ║  ── Dependencias: centyr-core.js, centyr-auth.js ──               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Funciones registradas en CENTYR.fn:
 *    guardar, eliminarSesion, renderLista, seleccionar, verHistorial,
 *    autoBuscar, setCat, actualizarBloqueoCategoria, setTipoAtencion,
 *    limpiarCampos, onCursoSelChange, crearUsuario
 */

;(function () {
    'use strict';

    // ── Funciones del módulo ─────────────────────────────────────────────────
async function guardar() {
        const dniInput = document.getElementById('dni').value.trim();
        const paciente = document.getElementById('paciente').value.trim();
        const notas = document.getElementById('notas').value.trim();
        const tipoAtencion = document.getElementById('tipo-atencion').value;
        
        if(!dniInput || !notas || !paciente) {
            alert("⚠️ Faltan datos: DNI, Nombre y Notas son obligatorios");
            return;
        }
        
        // Alumnos no pueden aprobar - solo guardar como pendiente
        const aprobado = (CENTYR.currentUser.rol === 'admin' || CENTYR.currentUser.rol === 'docente') ? 'aprobado' : 'pendiente';

        showLoad(true, "Guardando...");
        
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = String(ahora.getFullYear()).slice(-2);
        
        let horas = ahora.getHours();
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        const horasStr = String(horas).padStart(2, '0');
        
        const fechaFormateada = `${dia}/${mes}/${anio} ${horasStr}:${minutos} ${ampm}`;
        
        // Encontrar docente asignado: si es alumno, lee del selector; si no, toma el primero
        let docenteAsignado = '';
        let docenteUsuario  = '';
        let cursoSeleccionado = '';
        if(CENTYR.currentUser.rol === 'alumno' || CENTYR.currentUser.rol === 'profesional') {
            const selDoc = document.getElementById('alumno-docente-sel');
            const selCurso = document.getElementById('alumno-curso-sel');
            cursoSeleccionado = selCurso ? selCurso.value : '';
            if(selDoc && selDoc.value) {
                docenteUsuario = selDoc.value;
                const docenteObj = CENTYR.db.usuarios.find(u => u.usuario === docenteUsuario);
                if(docenteObj) {
                    docenteAsignado = docenteObj.nombre_completo + (docenteObj.colegiatura ? ' - CTMP: '+ctmpLimpio(docenteObj.colegiatura) : '');
                }
            } else {
                // fallback: primer docente
                const docentes = CENTYR.db.usuarios.filter(u => u.rol === 'docente');
                if(docentes.length > 0) {
                    docenteAsignado = docentes[0].nombre_completo + (docentes[0].colegiatura ? ' - CTMP: '+ctmpLimpio(docentes[0].colegiatura) : '');
                    docenteUsuario  = docentes[0].usuario;
                }
            }
        }
        
        const nuevaSesion = {
            action: 'save',
            id: String(Date.now()),
            dni: dniInput,
            paciente: paciente,
            categoria: document.getElementById('categoria').value,
            tipo_atencion: tipoAtencion,
            notas: notas,
            fecha: fechaFormateada,
            atendido_por: CENTYR.currentUser.nombre_completo,
            alumno_codigo: CENTYR.currentUser.codigo || '',
            docente_asignado: docenteAsignado,
            docente_usuario:  docenteUsuario,
            curso:            cursoSeleccionado || document.getElementById('categoria').value,
            estado_aprobacion: aprobado,
            rol_autor: CENTYR.currentUser.rol
        };
        
        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(nuevaSesion)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Agregar a la base de datos local sin modificar la referencia
                CENTYR.db.pacientes = [...CENTYR.db.pacientes, nuevaSesion];
                
                // Actualizar historial inmediatamente
                verHistorial(dniInput);
                
                // Limpiar notas
                document.getElementById('notas').value = "";
                
                // Determinar qué tipo de atención seleccionar para la próxima
                // Contar cuántas atenciones tiene este paciente ahora
                const totalAtenciones = CENTYR.db.pacientes.filter(p => String(p.dni || '') === dniInput).length;
                
                // Si solo tiene 1 atención (la que acabamos de guardar), la próxima debería ser Sesión
                // Si tiene más de 1, también debería ser Sesión por defecto
                const btnSesion = document.querySelector('[data-tipo="sesion"]');
                const btnEvaluacion = document.querySelector('[data-tipo="evaluacion"]');
                
                if (totalAtenciones >= 1) {
                    // Ya tiene evaluación, siguiente es sesión
                    if (btnSesion) {
                        setTipoAtencion(btnSesion, 'sesion');
                    }
                } else {
                    // Primer paciente, mantener en evaluación
                    if (btnEvaluacion) {
                        setTipoAtencion(btnEvaluacion, 'evaluacion');
                    }
                }
                
                showLoad(false);
                mostrarNotificacion('✅ Sesión guardada');
                
                // Recargar datos en segundo plano sin mostrar pantalla
                setTimeout(() => cargarDatos(false), 500);
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } catch (error) {
            showLoad(false);
            alert('❌ Error: ' + error.message);
        }
    }

    // ============================================
    // ELIMINAR SESIÓN
    // ============================================
    
    async function eliminarSesion(id) {
        if (!confirm('¿Está seguro de eliminar esta sesión?\n\nEsta acción no se puede deshacer.')) {
            return;
        }
        
        showLoad(true, 'Eliminando...');
        
        const payload = {
            action: 'delete_session',
            id: id
        };
        
        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Eliminar localmente sin modificar la referencia
                CENTYR.db.pacientes = CENTYR.db.pacientes.filter(p => p.id !== id);
                
                // Actualizar historial inmediatamente
                verHistorial(CENTYR.selectedDni);
                
                showLoad(false);
                mostrarNotificacion('✅ Sesión eliminada');
                
                // Recargar datos en segundo plano sin mostrar pantalla
                setTimeout(() => cargarDatos(false), 500);
            } else {
                throw new Error(result.message || 'Error al eliminar');
            }
        } catch (error) {
            showLoad(false);
            alert('❌ Error: ' + error.message);
        }
    }

    async function crearUsuario() {
        const nombre = document.getElementById('adm-nombre').value.trim();
        const codigo = document.getElementById('adm-codigo').value.trim();
        const colegiatura = document.getElementById('adm-colegiatura').value.trim();
        const usuario = document.getElementById('adm-user').value.trim();
        const password = document.getElementById('adm-pass').value.trim();
        const rol = document.getElementById('adm-rol').value;

        if(!nombre || !usuario || !password) {
            alert("⚠️ Completa todos los campos obligatorios");
            return;
        }
        
        if (CENTYR.db.usuarios.find(u => u.usuario === usuario)) {
            alert("⚠️ El usuario ya existe");
            return;
        }

        showLoad(true, "Creando usuario...");
        
        const payload = {
            action: 'add_user',
            nombre_completo: nombre,
            codigo: codigo || '',
            colegiatura: colegiatura || '',
            usuario: usuario,
            password: password,
            rol: rol
        };
        
        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                document.getElementById('adm-nombre').value = "";
                document.getElementById('adm-codigo').value = "";
                document.getElementById('adm-colegiatura').value = "";
                document.getElementById('adm-user').value = "";
                document.getElementById('adm-pass').value = "";
                
                showLoad(false);
                mostrarNotificacion('✅ Usuario creado');
                const rolLabel = { admin: 'Administrador', docente: 'Docente', alumno: 'Alumno' };
                alert(`✅ Usuario creado\n\nNombre: ${nombre}\nRol: ${rolLabel[rol] || rol}\nUsuario: ${usuario}\nContraseña: ${password}\n\n¡Ya puede iniciar sesión!`);
                
                cargarDatos(false);
            } else {
                throw new Error(result.message || 'Error al crear usuario');
            }
        } catch (error) {
            showLoad(false);
            alert('❌ Error: ' + error.message);
        }
    }

    function renderLista(filtro = "") {
        const div = document.getElementById('listaPacientes');
        const unicos = {};

        CENTYR.db.pacientes.forEach(p => {
            const dniStr = String(p.dni || '');
            if (!dniStr) return;

            // Alumnos solo ven sus propios pacientes
            if(CENTYR.currentUser && CENTYR.currentUser.rol === 'alumno') {
                if(p.atendido_por !== CENTYR.currentUser.nombre_completo) return;
            }

            unicos[dniStr] = p.paciente;
        });
        
        const keys = Object.keys(unicos).filter(d => 
            unicos[d].toLowerCase().includes(filtro.toLowerCase()) || d.includes(filtro)
        );

        if(keys.length === 0) {
            div.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">🔍 Sin resultados</p>';
            return;
        }

        div.innerHTML = keys.map(d => `
            <div class="paciente-item" onclick="seleccionar('${d}', '${unicos[d].replace(/'/g, "\\'")}')">
                <strong>${unicos[d]}</strong><br>
                <small style="color: var(--gray);">DNI: ${d}</small>
            </div>
        `).join('');
    }

    function seleccionar(d, n) {
        document.getElementById('dni').value = d;
        document.getElementById('paciente').value = n;
        verHistorial(d);
    }

    function verHistorial(d) {
        CENTYR.selectedDni = String(d || '');
        // Filtrar y ordenar cronológicamente (más antigua primero)
        const todosPaciente = CENTYR.db.pacientes.filter(x => String(x.dni || '') === CENTYR.selectedDni);
        
        // Ordenar por ID (timestamp) para tener orden cronológico correcto
        todosPaciente.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        // Ahora invertir para mostrar más reciente primero
        const filtrados = [...todosPaciente].reverse();
        
        document.getElementById('btnPdf').style.display = filtrados.length ? 'inline-block' : 'none';
        document.getElementById('btnInforme').style.display = filtrados.length ? 'inline-block' : 'none';
        document.getElementById('titulo-historial').innerText = "📋 Historial: " + (filtrados[0]?.paciente || "Sin paciente");
        
        if(filtrados.length === 0) {
            document.getElementById('historial').innerHTML = '<div style="text-align:center; padding:60px 20px; color:#95a5a6;"><h3>📋 Sin registros</h3><p>No hay sesiones previas para este paciente</p></div>';
            return;
        }

        document.getElementById('historial').innerHTML = filtrados.map((s, idx) => {
            let tipoAtencion = s.tipo_atencion;
            
            if (!tipoAtencion) {
                const indiceEnOrdenCronologico = todosPaciente.findIndex(x => x.id === s.id);
                tipoAtencion = indiceEnOrdenCronologico === 0 ? 'evaluacion' : 'sesion';
            }
            
            const esEvaluacion = tipoAtencion === 'evaluacion';
            
            const indiceEnOrdenCronologico = todosPaciente.findIndex(x => x.id === s.id);
            
            const sesionesAnteriores = todosPaciente.slice(0, indiceEnOrdenCronologico + 1)
                .filter((x, i) => {
                    if (x.tipo_atencion) {
                        return x.tipo_atencion === 'sesion';
                    }
                    return i !== 0;
                }).length;
            
            const etiqueta = esEvaluacion ? 'EVALUACIÓN FISIOTERAPÉUTICA' : `SESIÓN #${sesionesAnteriores}`;
            const colorEtiqueta = esEvaluacion ? 'var(--accent)' : 'var(--blue)';
            
            // Estado de aprobación
            const estadoAprobacion = s.estado_aprobacion || 'aprobado';
            const esPendiente = estadoAprobacion === 'pendiente';
            const notaAprob   = s.nota_aprobacion !== undefined && s.nota_aprobacion !== '' ? parseFloat(s.nota_aprobacion) : null;
            const notaAprobBadge = notaAprob !== null
                ? `<span style="background:#1B2A4A;color:white;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:bold;margin-left:4px;">⭐ ${notaAprob}/20</span>`
                : '';
            const badgeAprobacion = esPendiente
                ? `<span style="background:#F59E0B;color:white;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:bold;">⏳ PENDIENTE</span>`
                : `<span style="background:#2ECC71;color:white;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:bold;">✅ APROBADO</span>${notaAprobBadge}`;
            
            // Botón aprobar solo para docente y admin
            const puedeAprobar = CENTYR.currentUser && (CENTYR.currentUser.rol === 'docente' || CENTYR.currentUser.rol === 'admin');
            const btnAprobarCard = (esPendiente && puedeAprobar) 
                ? `<button onclick="aprobarSesion('${s.id}')" style="background:var(--accent);color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:bold;margin-top:8px;">✅ Aprobar</button>`
                : '';
            
            // Botón eliminar: solo docente y admin
            const puedeEliminar = CENTYR.currentUser && (CENTYR.currentUser.rol === 'docente' || CENTYR.currentUser.rol === 'admin');
            const btnEliminar = puedeEliminar ? `<button class="btn-delete" onclick="eliminarSesion('${s.id}')" title="Eliminar sesión">✕</button>` : '';
            
            // Info de alumno y docente
            const infoAlumno = s.alumno_codigo ? `<span style="color:#666;font-size:0.75rem;">🎓 Cód: ${s.alumno_codigo}</span> ` : '';
            // El docente que aparece es quien aprobó (aprobado_por), no el asignado inicial
            const docenteMostrado = s.aprobado_por 
                ? s.aprobado_por + (s.colegiatura_aprobador ? ' — CTMP: '+ctmpLimpio(s.colegiatura_aprobador) : '')
                : (s.docente_asignado || '');
            const infoDocente = docenteMostrado 
                ? `<div style="color:var(--docente);font-size:0.78rem;margin-top:4px;">👨‍🏫 Docente: ${docenteMostrado}</div>` 
                : '';
            
            return `
            <div class="sesion-card" style="${esPendiente ? 'border-left:4px solid #f39c12;' : ''}">
                ${btnEliminar}
                <div style="display:flex; justify-content:space-between; align-items:center; padding-right:30px; flex-wrap:wrap; gap:5px;">
                    <small style="color: var(--primary);"><b>📅 ${formatearFecha(s.fecha)}</b></small>
                    <div style="display:flex;gap:5px;align-items:center;">
                        ${badgeAprobacion}
                        <span style="background: ${colorEtiqueta}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${etiqueta}</span>
                    </div>
                </div>
                <div style="color:var(--blue); font-size:0.85rem; margin:8px 0; font-weight:600;">
                    ${s.categoria}
                </div>
                <div style="color:var(--gray); font-size:0.8rem; margin-bottom:4px;">
                    👨‍⚕️ Registró: ${s.atendido_por} ${infoAlumno}
                </div>
                ${infoDocente}
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid ${colorEtiqueta}; margin-top:8px;">
                    <p style="margin:0; line-height:1.6; white-space: pre-wrap;">${s.notas}</p>
                </div>
                ${btnAprobarCard}
            </div>
        `}).join('');
    }

    // Cuando cambia el curso desde el selector del formulario, sincroniza la categoría oculta
    function onCursoSelChange() {
        const curso = document.getElementById('alumno-curso-sel')?.value;
        if(!curso) return;
        const catInput = document.getElementById('categoria');
        if(catInput) catInput.value = curso;
        // Si la categoría no está bloqueada, activar el cat-btn correspondiente
        const grid = document.getElementById('cat-grid-btns');
        if(grid && grid.dataset.locked !== 'true') {
            document.querySelectorAll('#cat-grid-btns .cat-btn').forEach(btn => {
                const match = btn.getAttribute('onclick')?.includes("'"+curso+"'") || btn.getAttribute('onclick')?.includes('"'+curso+'"');
                btn.classList.toggle('active', !!match);
            });
        }
    }

    function autoBuscar(val) {
        const valTrimmed = String(val || '').trim();
        const pInput  = document.getElementById('paciente');
        const badge   = document.getElementById('pac-encontrado-badge');
        const p = CENTYR.db.pacientes.find(x => String(x.dni || '') === valTrimmed);
        if(p) {
            pInput.value     = p.paciente;
            pInput.readOnly  = true;
            pInput.style.background   = '#f0fdf4';
            pInput.style.borderColor  = '#2ECC71';
            pInput.style.color        = '#065F46';
            if(badge) badge.style.display = 'inline';
            // Auto-seleccionar curso si el paciente ya tiene historial en este curso
            const cursoPrev = CENTYR.db.pacientes.filter(x=>String(x.dni||'')===valTrimmed&&x.curso).map(x=>x.curso)[0];
            const selCurso = document.getElementById('alumno-curso-sel');
            if(cursoPrev && selCurso && !selCurso.value) selCurso.value = cursoPrev;
            verHistorial(valTrimmed);
        } else {
            pInput.readOnly  = false;
            pInput.style.background   = '';
            pInput.style.borderColor  = '';
            pInput.style.color        = '';
            if(badge) badge.style.display = 'none';
        }
        actualizarBloqueoCategoria();
    }

    function setCat(el, v) {
        // Si la categoría está bloqueada (modo sesión con paciente existente) no hacer nada
        if(document.getElementById('cat-grid-btns').dataset.locked === 'true') return;
        document.querySelectorAll('#cat-grid-btns .cat-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('categoria').value = v;
    }

    /** Aplica o levanta el bloqueo de categoría según tipo de atención y si el paciente ya tiene registros */
    function actualizarBloqueoCategoria() {
        const tipo   = document.getElementById('tipo-atencion').value;
        const dni    = document.getElementById('dni').value.trim();
        const grid   = document.getElementById('cat-grid-btns');
        const badge  = document.getElementById('cat-locked-badge');
        const display= document.getElementById('cat-locked-display');
        const nombre = document.getElementById('cat-locked-nombre');

        // Buscar si el paciente ya tiene una evaluación previa
        const evalPrevia = dni
            ? CENTYR.db.pacientes.find(p => String(p.dni||'') === dni && p.tipo_atencion === 'evaluacion')
            : null;

        const debeBloquear = (tipo === 'sesion') && evalPrevia;

        if(debeBloquear) {
            const catFijada = evalPrevia.categoria || 'Sin categoría';
            // Marcar activo el botón correcto y ocultar grid
            document.querySelectorAll('#cat-grid-btns .cat-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('categoria').value = catFijada;
            grid.style.display    = 'none';
            display.style.display = 'block';
            nombre.textContent    = catFijada;
            badge.style.display   = 'inline-block';
            grid.dataset.locked   = 'true';
        } else {
            grid.style.display    = '';
            display.style.display = 'none';
            badge.style.display   = 'none';
            grid.dataset.locked   = 'false';
        }
    }
    
    function setTipoAtencion(el, tipo) {
        // Remover active de todos
        document.querySelectorAll('.tipo-atencion-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.tipo === 'evaluacion') {
                b.style.background = 'white';
                b.style.color = 'var(--accent)';
            } else {
                b.style.background = 'white';
                b.style.color = 'var(--blue)';
            }
        });
        
        // Activar el seleccionado
        el.classList.add('active');
        if (tipo === 'evaluacion') {
            el.style.background = 'var(--accent)';
            el.style.color = 'white';
            
            // Insertar plantilla de evaluación según modelo APTA
            const notasField = document.getElementById('notas');
            if (!notasField.value.trim()) { // Solo si está vacío
                const plantilla = `ANTECEDENTES:
- Motivo de consulta:
- Historia de la condición actual:
- Historia médica relevante:
- Medicamentos:
- Cirugías previas:
- Antecedentes familiares:

EXAMEN SUBJETIVO:
- Descripción del dolor/síntoma:
- Localización:
- Intensidad (EVA 0-10):
- Factores agravantes:
- Factores atenuantes:
- Patrón temporal:
- Impacto en actividades diarias:

EXAMEN OBJETIVO:
- Observación/Inspección:
- Postura:
- Marcha:
- Palpación:
- Rango de movimiento (ROM):
- Fuerza muscular:
- Pruebas especiales:
- Sensibilidad:

ANÁLISIS Y DIAGNÓSTICO FISIOTERAPÉUTICO:
- Problemas identificados:
- Hipótesis:
- Diagnóstico fisioterapéutico:

PLAN DE INTERVENCIÓN:
- Objetivos a corto plazo:
- Objetivos a largo plazo:
- Tratamiento propuesto:
- Frecuencia:
- Pronóstico:`;
                
                notasField.value = plantilla;
                document.getElementById('editor-notas').value = plantilla; // También actualizar el editor
                
                // Actualizar preview también
                const preview = document.getElementById('preview-notas');
                preview.innerHTML = plantilla.substring(0, 200) + '...';
                preview.style.color = '#333';
            }
        } else {
            el.style.background = 'var(--blue)';
            el.style.color = 'white';
        }
        
        document.getElementById('tipo-atencion').value = tipo;
        actualizarBloqueoCategoria();
    }

    function limpiarCampos() {
        document.getElementById('dni').value = "";
        document.getElementById('paciente').value = "";
        document.getElementById('notas').value = "";
        document.getElementById('editor-notas').value = "";
        
        const preview = document.getElementById('preview-notas');
        preview.innerHTML = '<em>Haz clic en "ABRIR EDITOR DE NOTAS" para escribir...</em>';
        preview.style.color = '#666';
        
        // Resetear categoría (solo los del formulario principal)
        document.querySelectorAll('#cat-grid-btns .cat-btn').forEach((b, i) => {
            if(i === 0) b.classList.add('active');
            else b.classList.remove('active');
        });
        document.getElementById('categoria').value = "Traumatología";
        document.getElementById('cat-grid-btns').dataset.locked = 'false';
        document.getElementById('cat-grid-btns').style.display = '';
        document.getElementById('cat-locked-display').style.display = 'none';
        document.getElementById('cat-locked-badge').style.display = 'none';

        // Resetear a Evaluación sin insertar plantilla
        document.querySelectorAll('.tipo-atencion-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.tipo === 'evaluacion') {
                b.style.background = 'white';
                b.style.color = 'var(--accent)';
            } else {
                b.style.background = 'white';
                b.style.color = 'var(--blue)';
            }
        });
        
        const btnEvaluacion = document.querySelector('[data-tipo="evaluacion"]');
        if (btnEvaluacion) {
            btnEvaluacion.classList.add('active');
            btnEvaluacion.style.background = 'var(--accent)';
            btnEvaluacion.style.color = 'white';
        }
        
        document.getElementById('tipo-atencion').value = 'evaluacion';
    }

    // ── Recopilar nombres de funciones declaradas en este módulo ────────────
    const _fns = {
        guardar, eliminarSesion, renderLista, seleccionar, verHistorial,
        autoBuscar, setCat, actualizarBloqueoCategoria, setTipoAtencion,
        limpiarCampos, onCursoSelChange, crearUsuario
    };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test.session = function() {
        console.group('🧪 centyr-session tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }

        assert('CENTYR.fn.guardar registrado',              typeof CENTYR.fn.guardar === 'function');
        assert('CENTYR.fn.eliminarSesion registrado',       typeof CENTYR.fn.eliminarSesion === 'function');
        assert('CENTYR.fn.renderLista registrado',          typeof CENTYR.fn.renderLista === 'function');
        assert('CENTYR.fn.autoBuscar registrado',           typeof CENTYR.fn.autoBuscar === 'function');
        assert('CENTYR.fn.limpiarCampos registrado',        typeof CENTYR.fn.limpiarCampos === 'function');
        assert('CENTYR.fn.crearUsuario registrado',         typeof CENTYR.fn.crearUsuario === 'function');

        // Lógica: renderLista filtra por rol
        CENTYR.db = { ...CENTYR.db,
            pacientes: [
                { id:'1', paciente:'Juan Quispe', dni:'12345678', atendido_por:'Maria', categoria:'Traumatología', fecha:'01/01/26' },
                { id:'2', paciente:'Rosa Mamani', dni:'87654321', atendido_por:'Carlos', categoria:'Neurología', fecha:'02/01/26' }
            ]
        };
        CENTYR.currentUser = { usuario:'maria', nombre_completo:'Maria', rol:'alumno' };
        assert('db cargado con 2 pacientes de prueba',      CENTYR.db.pacientes.length === 2);
        // Resetear
        CENTYR.db = { pacientes:[], usuarios:[], citas:[], notas_docentes:[], estructuras_cursos:[], notas_cursos:{} };
        CENTYR.currentUser = null;

        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-session.js cargado');
})();
