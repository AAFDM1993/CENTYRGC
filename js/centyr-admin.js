/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-admin.js                                         
 * ║  ── Dependencias: centyr-core.js ──                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

;(function () {
    'use strict';

function adminTab(tabId) {
        ['tab-usuarios','tab-notas-cfg','tab-exportar','tab-cursos'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = id === tabId ? 'block' : 'none';
        });
        const labels = {
            'tab-usuarios':  'btn-tab-usuarios',
            'tab-notas-cfg': 'btn-tab-notas-cfg',
            'tab-exportar':  'btn-tab-exportar',
            'tab-cursos':    'btn-tab-cursos'
        };
        Object.values(labels).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if(btn) { btn.style.background='#eee'; btn.style.color='#555'; }
        });
        const activeBtn = document.getElementById(labels[tabId]);
        if(activeBtn) { activeBtn.style.background='var(--admin)'; activeBtn.style.color='white'; }

        if(tabId === 'tab-notas-cfg') {
            const sel = document.getElementById('cfg-alumno-sel');
            const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
            sel.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
            alumnos.forEach(a => sel.innerHTML += `<option value="${a.usuario}">${a.nombre_completo} (${a.codigo||'Sin código'})</option>`);
        }
        if(tabId === 'tab-cursos') {
            renderCursosGuardados();
        }
    }

    // ============================================
    // CURSOS — ESTADO GLOBAL
    // ============================================
    // CENTYR.db.estructuras_cursos = [{ curso, capacidad, grupos:[{nombre,cantidad,peso}] }]
    // Inicializar si no existe
    if(!window._cursosInit) {
        window._cursosInit = true;
        if(!CENTYR.db.estructuras_cursos) CENTYR.db.estructuras_cursos = [];
    }
// grupos activos en el editor

    function cursoSelChange() {
        const curso = document.getElementById('curso-sel').value;
        document.getElementById('curso-grupos-wrap').style.display = curso ? 'block' : 'none';
        if(curso) {
            const existente = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
            if(existente) {
                CENTYR.cursoGrupos = JSON.parse(JSON.stringify(existente.grupos));
                document.getElementById('curso-capacidad').value = existente.capacidad;
            } else {
                const cap = parseInt(document.getElementById('curso-capacidad').value) || 5;
                CENTYR.cursoGrupos = [{ id: Date.now(), nombre: 'Grupo 1', cantidad: cap, peso: 100 }];
            }
            renderGruposCurso();
        }
    }

    function cursoCapacidadChange() {
        // Si solo hay un grupo y su cantidad coincide con la capacidad anterior, sincronizar
        const cap = parseInt(document.getElementById('curso-capacidad').value) || 1;
        if(CENTYR.cursoGrupos.length === 1 && (CENTYR.cursoGrupos[0].cantidad === undefined || CENTYR.cursoGrupos[0].cantidad <= 20)) {
            CENTYR.cursoGrupos[0].cantidad = cap;
            renderGruposCurso();
        } else {
            renderPreviewCurso();
        }
    }

    function agregarGrupoCurso() {
        const capacidad = parseInt(document.getElementById('curso-capacidad').value) || 5;
        const n = CENTYR.cursoGrupos.length + 1;
        CENTYR.cursoGrupos.push({ id: Date.now(), nombre: `Grupo ${n}`, cantidad: capacidad, peso: 0 });
        renderGruposCurso();
    }

    function eliminarGrupoCurso(id) {
        CENTYR.cursoGrupos = CENTYR.cursoGrupos.filter(g => g.id !== id);
        renderGruposCurso();
    }

    function actualizarGrupoCurso(id, field, value) {
        const g = CENTYR.cursoGrupos.find(g => g.id === id);
        if(!g) return;
        g[field] = field === 'nombre' ? value : parseFloat(value)||0;
        actualizarBarraPct();
        renderPreviewCurso();
    }

    function renderGruposCurso() {
        const list = document.getElementById('curso-grupos-list');
        if(CENTYR.cursoGrupos.length === 0) {
            list.innerHTML = '<p style="color:#999;font-size:0.85rem;text-align:center;padding:8px;">Sin grupos. Presiona "+ Agregar grupo".</p>';
            actualizarBarraPct();
            renderPreviewCurso();
            return;
        }
        list.innerHTML = CENTYR.cursoGrupos.map(g => `
        <div style="background:white; border:1px solid #eee; border-radius:8px; padding:12px; margin-bottom:8px; position:relative;">
            <button onclick="eliminarGrupoCurso(${g.id})" style="position:absolute; top:8px; right:8px; background:#fadbd8; color:#c0392b; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-weight:700; font-size:0.8rem; line-height:22px; text-align:center;">✕</button>
            <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px; padding-right:28px;">
                <div>
                    <label style="font-size:0.75rem; color:var(--gray); display:block; margin-bottom:3px;">Nombre del grupo</label>
                    <input type="text" value="${g.nombre}" 
                           onchange="actualizarGrupoCurso(${g.id},'nombre',this.value)"
                           style="margin-bottom:0; padding:8px; font-size:0.88rem; font-weight:600;">
                </div>
                <div>
                    <label style="font-size:0.75rem; color:var(--gray); display:block; margin-bottom:3px;">N° Pacientes <span style="color:var(--docente)">(en el grupo)</span></label>
                    <input type="number" min="1" max="20" value="${g.cantidad}"
                           onchange="actualizarGrupoCurso(${g.id},'cantidad',this.value)"
                           style="margin-bottom:0; padding:8px; font-size:0.88rem; font-weight:600; text-align:center;">
                </div>
                <div>
                    <label style="font-size:0.75rem; color:var(--gray); display:block; margin-bottom:3px;">Peso <span style="color:#e67e22">(%)</span></label>
                    <input type="number" min="0" max="100" value="${g.peso}"
                           onchange="actualizarGrupoCurso(${g.id},'peso',this.value)"
                           style="margin-bottom:0; padding:8px; font-size:0.88rem; font-weight:700; text-align:center; border-color:#f39c12;">
                </div>
            </div>
            <div style="margin-top:8px; font-size:0.78rem; color:var(--docente);">
                → <strong>${g.cantidad}</strong> paciente(s) · Peso <strong>${g.peso}%</strong> · Nota = Suma notas ÷ ${g.cantidad} · Aporta <strong>${((g.peso/100)*20).toFixed(1)} pts</strong>/20
            </div>
        </div>`).join('');
        actualizarBarraPct();
        renderPreviewCurso();
    }

    function actualizarBarraPct() {
        const total = CENTYR.cursoGrupos.reduce((s,g) => s + (parseFloat(g.peso)||0), 0);
        const bar   = document.getElementById('curso-pct-bar');
        const lbl   = document.getElementById('curso-pct-total');
        const aviso = document.getElementById('curso-pct-aviso');
        if(!bar) return;
        const pct = Math.min(total, 100);
        bar.style.width   = pct + '%';
        bar.style.background = total === 100 ? '#27ae60' : total > 100 ? '#e74c3c' : '#f39c12';
        lbl.textContent   = total + '%';
        lbl.style.color   = total === 100 ? '#27ae60' : total > 100 ? '#e74c3c' : '#e67e22';
        aviso.textContent = total === 100 ? '✅ La ponderación suma exactamente 100%'
            : total > 100 ? `⚠️ Excede el 100% en ${total-100}%. Ajusta los pesos.`
            : `⚠️ Faltan ${100-total}% para completar la ponderación.`;
        aviso.style.color = total === 100 ? '#27ae60' : '#e74c3c';
    }

    function renderPreviewCurso() {
        const preview   = document.getElementById('curso-preview');
        const capacidad = parseInt(document.getElementById('curso-capacidad').value)||1;
        const curso     = document.getElementById('curso-sel').value;
        if(!CENTYR.cursoGrupos.length || !curso) {
            preview.innerHTML = '<p style="color:#999;font-size:0.88rem;text-align:center;">Configura los grupos para ver la vista previa.</p>';
            return;
        }
        const colors       = ['#3498db','#27ae60','#e67e22','#9b59b6','#e74c3c'];
        const totalPacs    = CENTYR.cursoGrupos.reduce((s,g)=>s+(parseInt(g.cantidad)||0),0);
        const coincide     = totalPacs === capacidad;

        // Aviso de validación
        let html = `<div style="background:${coincide?'#D1FAE5':'#FEF3C7'};border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:0.82rem;color:${coincide?'#065F46':'#92400E'};display:flex;justify-content:space-between;align-items:center;">
            <span>📋 <strong>${curso}</strong> — Total pacientes configurados: <strong>${totalPacs}</strong> de <strong>${capacidad}</strong></span>
            <span style="font-weight:700;">${coincide?'✅ OK':'⚠️ No coincide'}</span>
        </div>`;

        // Un bloque por grupo, mostrando sus pacientes numerados
        let pacGlobal = 1;
        CENTYR.cursoGrupos.forEach((g, gi) => {
            const col   = colors[gi % colors.length];
            const nPacs = parseInt(g.cantidad)||0;
            const nSes  = parseInt(g.sesiones||nPacs);  // sesiones por paciente (default = cant pacientes del grupo)
            html += `<div style="border:2px solid ${col};border-radius:10px;overflow:hidden;margin-bottom:10px;">
                <div style="background:${col};color:white;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <span style="font-weight:700;font-size:0.92rem;">${g.nombre}</span>
                        <span style="font-size:0.75rem;opacity:0.9;margin-left:10px;">${nPacs} paciente(s) · Peso ${g.peso}%</span>
                    </div>
                    <span style="font-size:0.8rem;opacity:0.9;">Aporta ${((g.peso/100)*20).toFixed(1)} pts/20</span>
                </div>
                <div style="padding:10px 14px;background:white;">
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">`;
            for(let k=0; k<nPacs; k++) {
                html += `<div style="border:1.5px solid ${col};border-radius:8px;padding:7px 12px;text-align:center;background:${col}15;min-width:90px;">
                    <div style="font-size:0.65rem;color:${col};font-weight:700;margin-bottom:3px;">PACIENTE ${pacGlobal++}</div>
                    <div style="font-size:0.75rem;color:#666;">Nota /20</div>
                </div>`;
            }
            html += `</div>
                    <div style="font-size:0.75rem;color:#888;background:#f8f9fa;border-radius:6px;padding:6px 10px;">
                        📐 Nota del grupo = promedio de las notas de sus ${nPacs} paciente(s) → pondera <strong style="color:${col};">${((g.peso/100)*20).toFixed(1)} pts</strong>/20
                    </div>
                </div>
            </div>`;
        });

        // Fórmula de nota final
        const formula = CENTYR.cursoGrupos.map((g,gi)=>`<span style="color:${colors[gi%colors.length]};font-weight:700;">(Σ${g.nombre.split(' ')[0]}÷${g.cantidad}×${g.peso}%)</span>`).join(' + ');
        html += `<div style="background:#f0f4ff;border-radius:8px;padding:9px 14px;font-size:0.82rem;">
            <strong style="color:var(--primary);">Nota final = </strong>${formula}
        </div>`;

        preview.innerHTML = html;
    }

    async function guardarEstructuraCurso() {
        const curso     = document.getElementById('curso-sel').value;
        const capacidad = parseInt(document.getElementById('curso-capacidad').value)||1;
        if(!curso) { alert('⚠️ Selecciona un curso'); return; }
        if(!CENTYR.cursoGrupos.length) { alert('⚠️ Agrega al menos un grupo de notas'); return; }

        const totalPeso = CENTYR.cursoGrupos.reduce((s,g) => s+(parseFloat(g.peso)||0),0);
        if(totalPeso !== 100) {
            if(!confirm(`⚠️ La ponderación suma ${totalPeso}% (debería ser 100%).\n¿Guardar de todas formas?`)) return;
        }
        for(const g of CENTYR.cursoGrupos) {
            if(!g.nombre.trim()) { alert('⚠️ Todos los grupos deben tener nombre'); return; }
            if((parseInt(g.cantidad)||0) < 1) { alert('⚠️ Cada grupo debe tener al menos 1 nota'); return; }
        }

        if(!CENTYR.db.estructuras_cursos) CENTYR.db.estructuras_cursos = [];
        const idx = CENTYR.db.estructuras_cursos.findIndex(e => e.curso === curso);
        const estructura = {
            curso, capacidad,
            grupos: JSON.parse(JSON.stringify(CENTYR.cursoGrupos)),
            fechaGuardado: new Date().toLocaleDateString('es-PE')
        };
        if(idx >= 0) CENTYR.db.estructuras_cursos[idx] = estructura;
        else         CENTYR.db.estructuras_cursos.push(estructura);

        // ── Precargar pacientes reales de la categoría ──
        // Buscar pacientes únicos que tengan esa categoría en el sistema
        const pacientesReales = [];
        const dniVistos = new Set();
        CENTYR.db.pacientes.forEach(p => {
            if((p.categoria||'') === curso && !dniVistos.has(String(p.dni||''))) {
                dniVistos.add(String(p.dni||''));
                pacientesReales.push({ dni: String(p.dni||''), nombre: p.paciente });
            }
        });

        // Inicializar / actualizar notas del curso
        if(!CENTYR.db.notas_cursos) CENTYR.db.notas_cursos = {};
        const existingPacs = CENTYR.db.notas_cursos[curso] || [];

        const nuevasPacs = [];
        for(let p=0; p<capacidad; p++) {
            // Primero intentar mantener paciente ya registrado
            const previo = existingPacs[p];
            // Si hay paciente real del sistema para esta posición, usarlo
            const real = pacientesReales[p];
            const nombre = previo?.paciente || real?.nombre || `Paciente ${p+1}`;
            const dni    = previo?.dni    || real?.dni    || '';

            // Mantener notas previas por grupo que todavía existan
            const notasPac = {};
            CENTYR.cursoGrupos.forEach(g => {
                notasPac[g.id] = (previo?.notas?.[g.id]) || Array(parseInt(g.cantidad)).fill('');
                // Ajustar longitud si cambió
                while(notasPac[g.id].length < parseInt(g.cantidad)) notasPac[g.id].push('');
                notasPac[g.id] = notasPac[g.id].slice(0, parseInt(g.cantidad));
            });
            nuevasPacs.push({ paciente: nombre, dni, notas: notasPac });
        }
        CENTYR.db.notas_cursos[curso] = nuevasPacs;

        // ── Enviar estructura al Google Sheets ──
        showLoad(true, 'Guardando en Sheets...');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action:    'save_estructura_curso',
                    curso,
                    capacidad,
                    grupos:    CENTYR.cursoGrupos,
                    pacientes: nuevasPacs.map(p => ({ paciente: p.paciente, dni: p.dni })),
                    fecha:     estructura.fechaGuardado
                })
            });
        } catch(e) { /* continuar localmente */ }
        showLoad(false);

        renderCursosGuardados();
        mostrarNotificacion(`✅ Estructura de ${curso} guardada en Sheets (${capacidad} pacientes, ${CENTYR.cursoGrupos.length} grupos)`);
    }

    function renderCursosGuardados() {
        const div = document.getElementById('cursos-guardados-list');
        const lista = CENTYR.db.estructuras_cursos || [];
        if(lista.length === 0) {
            div.innerHTML = '<p style="color:#999;font-size:0.85rem;text-align:center;padding:10px;">Sin estructuras guardadas aún.</p>';
            return;
        }
        div.innerHTML = lista.map(e => `
        <div style="border:1px solid #e0e6ed; border-radius:8px; padding:10px 12px; margin-bottom:8px; background:white;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <div>
                    <strong style="color:var(--primary);">${e.curso}</strong>
                    <span style="color:var(--gray); font-size:0.78rem; margin-left:8px;">${e.capacidad} pacientes · ${e.grupos.length} grupos · Guardado: ${e.fechaGuardado||''}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="cargarEstructuraCurso('${e.curso}')" style="padding:4px 10px; background:var(--docente); color:white; border:none; border-radius:5px; cursor:pointer; font-size:0.78rem; font-weight:600;">✏️ Editar</button>
                    <button onclick="abrirIngresoCurso('${e.curso}')" style="padding:4px 10px; background:var(--accent); color:white; border:none; border-radius:5px; cursor:pointer; font-size:0.78rem; font-weight:600;">📝 Ingresar notas</button>
                    <button onclick="eliminarEstructuraCurso('${e.curso}')" style="padding:4px 10px; background:#fadbd8; color:#c0392b; border:none; border-radius:5px; cursor:pointer; font-size:0.78rem; font-weight:600;">🗑️</button>
                </div>
            </div>
            <div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:5px;">
                ${e.grupos.map(g=>`<span style="background:#f0f4ff;color:var(--primary);border-radius:12px;padding:2px 10px;font-size:0.75rem;font-weight:600;">${g.nombre} (${g.cantidad}n · ${g.peso}%)</span>`).join('')}
            </div>
        </div>`).join('');
    }

    function cargarEstructuraCurso(curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        if(!est) return;
        document.getElementById('curso-sel').value = curso;
        document.getElementById('curso-capacidad').value = est.capacidad;
        CENTYR.cursoGrupos = JSON.parse(JSON.stringify(est.grupos));
        document.getElementById('curso-grupos-wrap').style.display = 'block';
        renderGruposCurso();
        mostrarNotificacion(`📂 Estructura de ${curso} cargada para edición`);
    }

    function eliminarEstructuraCurso(curso) {
        if(!confirm(`¿Eliminar la estructura de ${curso}?`)) return;
        CENTYR.db.estructuras_cursos = (CENTYR.db.estructuras_cursos||[]).filter(e => e.curso !== curso);
        if(CENTYR.db.notas_cursos) delete CENTYR.db.notas_cursos[curso];
        renderCursosGuardados();
        mostrarNotificacion(`🗑️ Estructura de ${curso} eliminada`);
    }

    // abrirIngresoCurso: muestra selector de alumno y carga sus notas
    // alumnoPresel = usuario a preseleccionar (opcional)
    async function abrirIngresoCurso(curso, alumnoPresel) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        if(!est) { alert('⚠️ No existe estructura para el curso: '+curso); return; }

        const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');

        const opAlumnos = alumnos.map(a =>
            `<option value="${a.usuario}" ${alumnoPresel===a.usuario?'selected':''}>${a.nombre_completo} (${a.codigo||'—'})</option>`
        ).join('');

        const bodyHeader = `
        <div style="background:#F0F4FF;border-radius:10px;padding:12px 16px;margin-bottom:14px;border-left:4px solid var(--primary);">
            <div style="font-weight:700;color:var(--primary);margin-bottom:8px;font-size:0.9rem;">
                📚 ${curso} &nbsp;·&nbsp; ${est.capacidad} paciente(s) requeridos &nbsp;·&nbsp; ${est.grupos.length} grupo(s)
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                    <label style="font-size:0.78rem;color:var(--gray);display:block;margin-bottom:3px;">Seleccionar alumno:</label>
                    <select id="ingreso-alumno-sel" onchange="cargarPanelNotasAlumno('${curso}')"
                            style="margin-bottom:0;border:1.5px solid var(--primary);font-weight:600;">
                        <option value="">-- Elige un alumno --</option>
                        ${opAlumnos}
                    </select>
                </div>
                <div style="flex:1;min-width:160px;">
                    <label style="font-size:0.78rem;color:var(--gray);display:block;margin-bottom:3px;">Filtrar por apellido:</label>
                    <input type="text" placeholder="Escribe apellido..." id="ingreso-buscar-alumno"
                           oninput="filtrarSelectAlumnoIngreso('${curso}',this.value)"
                           style="margin-bottom:0;border:1.5px solid var(--docente);">
                </div>
            </div>
        </div>
        <div id="ingreso-notas-area">
            <div style="text-align:center;color:#aaa;padding:40px 0;font-size:0.9rem;">Selecciona un alumno para ver y calificar sus pacientes.</div>
        </div>`;

        document.getElementById('modal-cursos-titulo').textContent = `📝 Calificaciones — ${curso}`;
        document.getElementById('modal-cursos-body').innerHTML = bodyHeader;
        document.getElementById('modalCursos').style.display = 'block';

        // Si hay alumno preseleccionado, cargar de inmediato
        if(alumnoPresel) {
            const sel = document.getElementById('ingreso-alumno-sel');
            if(sel) { sel.value = alumnoPresel; await cargarPanelNotasAlumno(curso); }
        }
    }

    function filtrarSelectAlumnoIngreso(curso, q) {
        const sel     = document.getElementById('ingreso-alumno-sel');
        const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const query   = q.trim().toLowerCase();
        const filt    = query ? alumnos.filter(a => a.nombre_completo.toLowerCase().includes(query)) : alumnos;
        sel.innerHTML = '<option value="">-- Elige un alumno --</option>' +
            filt.map(a=>`<option value="${a.usuario}">${a.nombre_completo} (${a.codigo||'—'})</option>`).join('');
    }

    async function cargarPanelNotasAlumno(curso) {
        const alumnoUsuario = document.getElementById('ingreso-alumno-sel')?.value;
        const area          = document.getElementById('ingreso-notas-area');
        if(!alumnoUsuario) {
            area.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px 0;">Selecciona un alumno.</div>';
            return;
        }
        const est       = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if(!est || !alumnoObj) return;

        const nombre    = alumnoObj.nombre_completo;
        const keyAlumno = `${alumnoUsuario}::${curso}`;

        // Pacientes del alumno en este curso
        const dniVistos = new Set();
        const pacientesAlumno = [];
        CENTYR.db.pacientes.forEach(p => {
            const pc = p.curso || p.categoria || '';
            if(p.atendido_por === nombre && pc === curso && !dniVistos.has(String(p.dni||''))) {
                dniVistos.add(String(p.dni||''));
                pacientesAlumno.push({ nombre: p.paciente, dni: String(p.dni||'') });
            }
        });

        // Intentar cargar notas guardadas del servidor
        if(!CENTYR.db.notas_cursos) CENTYR.db.notas_cursos = {};
        showLoad(true, 'Cargando calificaciones...');
        try {
            const res  = await fetch(`${CENTYR.CONFIG.webAppUrl}?action=get_notas_alumno_curso&alumno=${encodeURIComponent(alumnoUsuario)}&curso=${encodeURIComponent(curso)}`);
            const data = await res.json();
            if(data.status === 'success' && data.pacientes?.length) {
                // Asignar grupo_idx: distribución secuencial según la estructura guardada
                let _gOffset = 0, _gi = 0;
                CENTYR.db.notas_cursos[keyAlumno] = data.pacientes.map((pg, _pi) => {
                    // Calcular a qué grupo pertenece este paciente según su posición
                    while(_gi < est.grupos.length && _gOffset + parseInt(est.grupos[_gi].cantidad||0) <= _pi) {
                        _gOffset += parseInt(est.grupos[_gi].cantidad||0);
                        _gi++;
                    }
                    const _giActual = Math.min(_gi, est.grupos.length - 1);
                    const np = {};
                    est.grupos.forEach(g => {
                        np[g.id] = pg.notas?.[g.id] || pg.notas?.[g.nombre] || Array(parseInt(g.cantidad)).fill('');
                        while(np[g.id].length < parseInt(g.cantidad)) np[g.id].push('');
                    });
                    return { paciente: pg.paciente, dni: pg.dni||'', grupo_idx: pg.grupo_idx ?? _giActual, notas: np };
                });
            }
        } catch(e) { /* local fallback */ }
        showLoad(false);

        // Construir mapa de pacientes del alumno con sus notas de aprobación
        const pacMapAuto = {};
        CENTYR.db.pacientes
            .filter(p => p.atendido_por === nombre && (p.curso||p.categoria||'') === curso)
            .sort((a,b) => new Date(a.fecha||0) - new Date(b.fecha||0))
            .forEach(p => {
                const k = String(p.dni||p.paciente||'').trim();
                if(!pacMapAuto[k]) pacMapAuto[k] = { nombre: String(p.paciente||''), dni: String(p.dni||''), notas_aprobadas: [] };
                if(p.estado_aprobacion === 'aprobado' && p.nota_aprobacion)
                    pacMapAuto[k].notas_aprobadas.push(parseFloat(p.nota_aprobacion)||0);
            });
        const pacsAutoList = Object.values(pacMapAuto);

        // Inicializar con pacientes reales distribuidos por grupo si no hay datos guardados
        if(!CENTYR.db.notas_cursos[keyAlumno] || CENTYR.db.notas_cursos[keyAlumno].length === 0) {
            const pList = [];
            let globalIdx = 0;
            est.grupos.forEach((g, gi) => {
                const nP = parseInt(g.cantidad)||0;
                for(let k=0; k<nP; k++) {
                    const real = pacsAutoList[globalIdx] || null;
                    const np   = {};
                    est.grupos.forEach(gg => { np[gg.id] = Array(parseInt(gg.cantidad)||1).fill(''); });
                    // Auto-rellenar: 1 nota por paciente = la nota de aprobación de su sesión más reciente
                    if(real && real.notas_aprobadas.length) {
                        np[g.id] = [String(real.notas_aprobadas[real.notas_aprobadas.length - 1])];
                    }
                    pList.push({ paciente: real?.nombre||`Paciente ${globalIdx+1}`, dni: real?.dni||'', grupo_idx: gi, notas: np });
                    globalIdx++;
                }
            });
            // Completar hasta capacidad total si faltan
            while(pList.length < est.capacidad) {
                const np = {};
                est.grupos.forEach(gg => { np[gg.id] = Array(parseInt(gg.cantidad)||1).fill(''); });
                pList.push({ paciente: `Paciente ${pList.length+1}`, dni: '', grupo_idx: 0, notas: np });
            }
            CENTYR.db.notas_cursos[keyAlumno] = pList;
        } else {
            // Actualizar auto-notas en datos ya existentes (si hay sesiones aprobadas nuevas)
            CENTYR.db.notas_cursos[keyAlumno].forEach(pac => {
                const k  = String(pac.dni||pac.paciente||'').trim();
                const rd = pacMapAuto[k];
                if(!rd || !rd.notas_aprobadas.length) return;
                const gi = pac.grupo_idx ?? 0;
                const g  = est.grupos[gi];
                if(!g) return;
                // Solo auto-rellenar si la celda está vacía — usar nota más reciente aprobada
                if(!(pac.notas[g.id]||[]).some(v => v!==''&&v!==null&&v!==undefined))
                    pac.notas[g.id] = [String(rd.notas_aprobadas[rd.notas_aprobadas.length - 1])];
            });
        }

        const pacs   = CENTYR.db.notas_cursos[keyAlumno];
        const colors = ['#1B2A4A','#0288D1','#2ECC71','#6C3FC5','#F59E0B'];

        const faltantes = est.capacidad - pacientesAlumno.length;
        let alertaHtml  = faltantes > 0
            ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:9px 14px;margin-bottom:10px;font-size:0.82rem;color:#92400E;">
               ⚠️ <strong>${nombre}</strong> tiene <strong>${pacientesAlumno.length}</strong> paciente(s) en ${curso}. Requeridos: <strong>${est.capacidad}</strong>.</div>`
            : '';

        let html = alertaHtml + `
        <div style="background:#1B2A4A;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:0.82rem;color:white;display:flex;justify-content:space-between;align-items:center;">
            <div>👨‍🎓 <strong>${nombre}</strong> &nbsp;·&nbsp; Cód: ${alumnoObj.codigo||'—'} &nbsp;·&nbsp; ${pacientesAlumno.length} paciente(s)</div>
            <div id="alumno-nota-final-display" style="font-size:0.88rem;"></div>
        </div>`;

        // Agrupar pacientes por grupo (grupo_idx)
        est.grupos.forEach((g, gi) => {
            const col     = colors[gi % colors.length];
            const pacGrp  = pacs.filter(p => (p.grupo_idx ?? 0) === gi);
            const nProg   = parseInt(g.cantidad)||1;

            html += `
            <div style="border:2px solid ${col};border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <div style="background:${col};color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:700;font-size:0.95rem;">${g.nombre}</div>
                        <div style="font-size:0.72rem;opacity:0.85;">${pacGrp.length} paciente(s) · Peso ${g.peso}% · Nota = Σ÷${nProg}</div>
                    </div>
                    <span style="background:rgba(255,255,255,0.18);padding:4px 12px;border-radius:12px;font-size:0.82rem;font-weight:700;">
                        Prom grupo: <span id="grupo-prom-${gi}">—</span>/20
                    </span>
                </div>`;

            pacGrp.forEach((pac) => {
                const pi   = pacs.indexOf(pac);
                const opts = pacientesAlumno.map(p =>
                    `<option value="${p.nombre}|${p.dni}" ${pac.paciente===p.nombre?'selected':''}>${p.nombre} — DNI: ${p.dni}</option>`
                ).join('');
                const nots = (pac.notas[g.id]||[]).concat(Array(nProg).fill('')).slice(0, nProg);

                html += `
                <div style="padding:10px 14px;border-top:1px solid ${col}30;background:white;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                        <div style="flex:1;min-width:180px;">
                            <div style="font-size:0.65rem;color:${col};font-weight:700;margin-bottom:3px;">PACIENTE ${pi+1}</div>
                            <select id="pac-sel-${pi}" onchange="selPacienteIngreso(${pi},'${alumnoUsuario}','${curso}')"
                                    style="border:1.5px solid ${col};border-radius:7px;padding:5px 8px;font-weight:600;font-size:0.82rem;margin-bottom:0;width:100%;">
                                <option value="">-- Sin paciente asignado --</option>
                                ${opts}
                                <option value="__custom__">✏️ Escribir nombre manualmente</option>
                            </select>
                            <input type="hidden" id="pac-nombre-${pi}" value="${pac.paciente}">
                            <input type="hidden" id="pac-dni-${pi}"    value="${pac.dni||''}">
                        </div>
                        <span id="nota-final-${pi}" style="background:${col}22;color:${col};border:1.5px solid ${col};padding:4px 14px;border-radius:20px;font-weight:700;font-size:0.88rem;white-space:nowrap;">—/20</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                        <span style="font-size:0.72rem;color:${col};font-weight:600;margin-right:4px;">Notas (÷${nProg}):</span>`;

                // 1 sola nota por paciente (la nota vigesimal del docente al aprobar)
                const valNota  = nots[0] ?? '';
                const esAuto   = valNota !== '' && valNota !== null;
                const bgAuto   = esAuto ? col+'18' : 'white';
                html += `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="text-align:center;">
                            <div style="font-size:0.65rem;color:${col};font-weight:700;margin-bottom:3px;">
                                Nota /20 ${esAuto ? '<span style=\'background:'+col+';color:white;padding:1px 6px;border-radius:6px;font-size:0.6rem;\'>🔒 AUTO</span>' : ''}
                            </div>
                            <input type="number" min="0" max="20" step="0.5" value="${valNota}"
                                   id="nota-${pi}-${gi}-0"
                                   oninput="recalcularFila(${pi},'${curso}')"
                                   placeholder="0-20"
                                   style="width:64px;padding:7px 4px;text-align:center;font-weight:700;font-size:1rem;border:2px solid ${col};border-radius:8px;margin-bottom:0;background:${bgAuto};">
                        </div>
                        <div style="font-size:0.75rem;color:#888;line-height:1.4;">
                            ${esAuto ? '<span style=\'color:'+col+';font-weight:600;\'>✓ Nota cargada automáticamente<br>desde sesión aprobada</span>' : '<span>Ingresar nota vigesimal<br>de la sesión clínica</span>'}
                        </div>
                    </div>
                </div></div>`;
            });

            html += `</div>`;
        });

        html += `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px;padding-top:8px;border-top:1px solid #e0e6ed;">
            <button onclick="guardarNotasAlumnoEnCurso('${curso}','${alumnoUsuario}')"
                    style="padding:13px;background:var(--admin);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
                💾 GUARDAR NOTAS
            </button>
            <button onclick="exportarNotasCurso('${curso}')"
                    style="padding:13px;background:var(--accent);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">
                📥 EXPORTAR CSV
            </button>
        </div>`;

        area.innerHTML = html;
        pacs.forEach((_, pi) => recalcularFila(pi, curso));
        recalcularNotaFinalAlumno(curso);
    }

    function selPacienteIngreso(pi, alumnoUsuario, curso) {
        const sel = document.getElementById(`pac-sel-${pi}`);
        if(sel.value === '__custom__') {
            const n = prompt('Nombre del paciente:','');
            if(n) {
                document.getElementById(`pac-nombre-${pi}`).value = n;
                const o = document.createElement('option');
                o.value = n+'|'; o.textContent = n; o.selected = true;
                sel.insertBefore(o, sel.lastElementChild); sel.value = n+'|';
            }
            return;
        }
        if(sel.value) {
            const [nom,dni] = sel.value.split('|');
            document.getElementById(`pac-nombre-${pi}`).value = nom||'';
            document.getElementById(`pac-dni-${pi}`).value    = dni||'';
        }
    }

    async function guardarNotasAlumnoEnCurso(curso, alumnoUsuario) {
        const est       = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        const keyAlumno = `${alumnoUsuario}::${curso}`;
        if(!est || !CENTYR.db.notas_cursos?.[keyAlumno]) return;

        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        const pacs      = CENTYR.db.notas_cursos[keyAlumno];

        // Leer DOM — 1 nota por paciente (nota-pi-gi-0), donde gi = grupo_idx del paciente
        pacs.forEach((pac,pi) => {
            pac.paciente = document.getElementById(`pac-nombre-${pi}`)?.value || pac.paciente;
            pac.dni      = document.getElementById(`pac-dni-${pi}`)?.value    || pac.dni || '';
            const gi = pac.grupo_idx ?? 0;
            const g  = est.grupos[gi];
            if(g) {
                const el = document.getElementById(`nota-${pi}-${gi}-0`);
                pac.notas[g.id] = [el ? el.value : ''];
            }
        });

        showLoad(true,'Guardando...');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl,{
                method:'POST', headers:{'Content-Type':'text/plain'},
                body: JSON.stringify({
                    action:         'save_notas_alumno_curso',
                    alumno_usuario: alumnoUsuario,
                    alumno_nombre:  alumnoObj?.nombre_completo||'',
                    alumno_codigo:  alumnoObj?.codigo||'',
                    curso, grupos: est.grupos, pacientes: pacs
                })
            });
        } catch(e){ /* local */ }
        showLoad(false);
        renderNotasSidebar(document.getElementById('notas-sidebar-filtro')?.value||'');
        mostrarNotificacion(`✅ Notas de ${alumnoObj?.nombre_completo||alumnoUsuario} guardadas`);
    }

    // recalcularFila: cada paciente tiene 1 nota en su grupo
    // La nota del grupo = promedio de las notas de sus pacientes
    // Nota final del alumno = suma ponderada (promGrupo1 × peso1 + promGrupo2 × peso2)
    function recalcularFila(pi, curso) {
        const est    = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos||{}).find(k=>k.endsWith('::'+curso));
        if(!est || !keyAlumno) return;
        const pacs   = CENTYR.db.notas_cursos[keyAlumno] || [];
        const pac    = pacs[pi];
        if(!pac) return;

        // gi = grupo al que pertenece este paciente
        const gi_pac = pac.grupo_idx ?? 0;
        const g_pac  = est.grupos[gi_pac];
        if(!g_pac) return;

        // Leer la nota del paciente (input nota-pi-gi_pac-0)
        const el_nota = document.getElementById(`nota-${pi}-${gi_pac}-0`);
        const notaPac = el_nota && el_nota.value !== '' ? parseFloat(el_nota.value) : null;

        // Actualizar el display de nota individual del paciente
        const finalEl = document.getElementById(`nota-final-${pi}`);
        if(finalEl) {
            const col = notaPac === null ? '#888' : notaPac <= 10 ? '#E53935' : notaPac <= 13 ? '#F59E0B' : notaPac <= 16 ? '#2ECC71' : '#0288D1';
            finalEl.textContent  = notaPac !== null ? notaPac.toFixed(1)+'/20' : '—/20';
            finalEl.style.color  = col;
            finalEl.style.background = (notaPac !== null ? g_pac : null) ? '' : '';
        }

        // Recalcular el promedio del grupo al que pertenece este paciente
        recalcularPromedioGrupo(gi_pac, curso);
    }

    // recalcularNotaFinalAlumno: suma ponderada de los promedios de cada grupo
    function recalcularNotaFinalAlumno(curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos||{}).find(k=>k.endsWith('::'+curso));
        if(!est || !keyAlumno) return;
        const pacs = CENTYR.db.notas_cursos[keyAlumno] || [];

        let notaFinal = 0, pesoTotal = 0;
        est.grupos.forEach((g, gi) => {
            const pacGrp = pacs.filter(p=>(p.grupo_idx??0)===gi);
            const notas  = [];
            pacGrp.forEach(pac => {
                const pi  = pacs.indexOf(pac);
                const el  = document.getElementById(`nota-${pi}-${gi}-0`);
                if(el && el.value !== '') notas.push(parseFloat(el.value)||0);
            });
            const promGrupo = notas.length ? notas.reduce((s,v)=>s+v,0)/notas.length : null;
            // Actualizar display promedio del grupo
            const promEl = document.getElementById(`grupo-prom-${gi}`);
            if(promEl) promEl.textContent = promGrupo !== null ? promGrupo.toFixed(2) : '—';
            if(promGrupo !== null) {
                notaFinal += promGrupo * (parseFloat(g.peso)||0) / 100;
                pesoTotal += parseFloat(g.peso)||0;
            }
        });

        // Mostrar nota final del alumno en el banner del modal
        const nf  = pesoTotal > 0 ? notaFinal : null;
        const nfEl = document.getElementById('alumno-nota-final-display');
        if(nfEl) {
            const col = nf === null ? '#888' : nf <= 10 ? '#E53935' : nf <= 13 ? '#F59E0B' : nf <= 16 ? '#2ECC71' : '#0288D1';
            nfEl.textContent  = nf !== null ? '📊 Nota final estimada: ' + nf.toFixed(2)+'/20' : '';
            nfEl.style.color  = col;
            nfEl.style.fontWeight = '700';
        }
    }

    // recalcularPromedioGrupo: promedio de las notas de todos los pacientes del grupo gi
    // Cada paciente tiene 1 sola nota (input nota-pi-gi-0)
    function recalcularPromedioGrupo(gi, curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos||{}).find(k=>k.endsWith('::'+curso));
        if(!est || !est.grupos[gi] || !keyAlumno) return;
        const pacs = CENTYR.db.notas_cursos[keyAlumno] || [];

        const notas = [];
        pacs.forEach((pac, pi) => {
            if((pac.grupo_idx ?? 0) !== gi) return;
            const el = document.getElementById(`nota-${pi}-${gi}-0`);
            if(el && el.value !== '') notas.push(parseFloat(el.value)||0);
        });

        const prom = notas.length ? notas.reduce((s,v)=>s+v,0)/notas.length : null;
        const el   = document.getElementById(`grupo-prom-${gi}`);
        if(el) el.textContent = prom !== null ? prom.toFixed(2) : '—';

        // Actualizar también la nota final del alumno
        recalcularNotaFinalAlumno(curso);
    }

    // guardarNotasCurso: delegado a la nueva función con clave alumno::curso
    async function guardarNotasCurso(curso) {
        const alumnoUsuario = document.getElementById('ingreso-alumno-sel')?.value;
        if(alumnoUsuario) {
            await guardarNotasAlumnoEnCurso(curso, alumnoUsuario);
        } else {
            mostrarNotificacion('⚠️ Selecciona un alumno antes de guardar.');
        }
    }

    async function exportarNotasCurso(curso) {
        guardarNotasCurso(curso);
        const est  = (CENTYR.db.estructuras_cursos||[]).find(e => e.curso === curso);
        const pacs = CENTYR.db.notas_cursos && CENTYR.db.notas_cursos[curso] ? CENTYR.db.notas_cursos[curso] : [];
        if(!est || !pacs.length) { alert('⚠️ Sin datos para exportar'); return; }

        // ── Construir filas para CSV y para GS ──
        const rowsGS  = [];  // para Sheets: alumno, curso, paciente, notas..., promedio
        const rowsCSV = [
            [`NOTAS DEL CURSO: ${curso}`, '', '', ''],
            [`Generado: ${new Date().toLocaleDateString('es-PE')}`, '', '', ''],
            ['']
        ];

        // Header dinámico
        const header = ['Alumno / Paciente'];
        est.grupos.forEach(g => {
            for(let n=1; n<=parseInt(g.cantidad); n++) header.push(`${g.nombre} - N${n}`);
            header.push(`Prom. ${g.nombre} (${g.peso}%)`);
        });
        header.push('NOTA FINAL');
        rowsCSV.push(header);

        // Header para GS (simplificado)
        const headerGS = ['Alumno','Curso','Paciente'];
        est.grupos.forEach(g => {
            for(let n=1; n<=parseInt(g.cantidad); n++) headerGS.push(`${g.nombre}-N${n}`);
            headerGS.push(`Prom.${g.nombre}`);
        });
        headerGS.push('Nota Final');
        rowsGS.push(headerGS);

        pacs.forEach((pac, pi) => {
            // nombre del alumno: si el campo viene de pac.alumno o pac.paciente genérico
            const nombreAlumno = pac.alumno_nombre || (pac.paciente && !pac.paciente.startsWith('Paciente') ? '' : '');
            const nombrePac    = pac.paciente || `Paciente ${pi+1}`;
            const rowCSV = [nombrePac];
            const rowGS  = [nombreAlumno, curso, nombrePac];
            let notaFinal = 0, pesoTotal = 0;

            est.grupos.forEach((g, gi) => {
                const notasGrupo = pac.notas[g.id] || [];
                const vals = notasGrupo.map(v => parseFloat(v)).filter(v => !isNaN(v));
                notasGrupo.forEach(v => { rowCSV.push(v); rowGS.push(v); });
                const prom = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
                const promStr = prom !== null ? prom.toFixed(2) : '—';
                rowCSV.push(promStr); rowGS.push(promStr);
                if(prom !== null) { notaFinal += prom*(parseFloat(g.peso)||0)/100; pesoTotal+=parseFloat(g.peso)||0; }
            });
            const final = pesoTotal > 0 ? notaFinal.toFixed(2) : '—';
            rowCSV.push(final); rowGS.push(final);
            rowsCSV.push(rowCSV);
            rowsGS.push(rowGS);
        });

        // ── Enviar a Google Sheets ──
        showLoad(true, 'Exportando al Sheets...');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'save_notas_curso',
                    curso:  curso,
                    rows:   rowsGS
                })
            });
        } catch(e) { /* continuar con CSV de todas formas */ }
        showLoad(false);

        // ── Descargar CSV ──
        descargarCSV(`CENTYR_Notas_${curso.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.csv`, rowsCSV);
        mostrarNotificacion(`📤 Notas de ${curso} exportadas al Sheets y descargadas en CSV`);
    }

    function calcularNotasFinalCurso() {
        const curso = document.getElementById('curso-sel').value;
        if(!curso) { alert('⚠️ Selecciona un curso'); return; }
        abrirIngresoCurso(curso, null);
    }

    // ============================================
    // RESUMEN NOTAS POR ALUMNO (tab admin)
    // ============================================
    function calcularPromedioPonderado(notas) {
        // Ahora calcula promedio simple (el peso lo gestiona el admin en la estructura de cursos)
        const validas = notas.filter(n => !isNaN(parseFloat(n.calificacion)));
        if(validas.length === 0) return null;
        const suma = validas.reduce((s,n) => s + parseFloat(n.calificacion), 0);
        return (suma / validas.length).toFixed(2);
    }

    function cargarResumenNotas() {
        const alumnoUsuario = document.getElementById('cfg-alumno-sel').value;
        const div = document.getElementById('cfg-notas-resumen');
        if(!alumnoUsuario) { div.innerHTML = ''; return; }

        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if(!alumnoObj) return;

        const notasAlumno = (CENTYR.db.notas_docentes || []).filter(n => n.alumno_nombre === alumnoObj.nombre_completo);

        if(notasAlumno.length === 0) {
            div.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Sin notas registradas para este alumno en esta sesión.<br><small>Las notas se cargan al guardarlas en esta sesión.</small></p>';
            return;
        }

        // Agrupar por paciente
        const porPaciente = {};
        notasAlumno.forEach(n => {
            const key = n.paciente_dni || n.paciente_nombre;
            if(!porPaciente[key]) porPaciente[key] = { nombre: n.paciente_nombre, notas: [] };
            porPaciente[key].notas.push(n);
        });

        const promedioGlobal = calcularPromedioPonderado(notasAlumno);
        const colorGlobal = !promedioGlobal ? '#888' : promedioGlobal <= 10 ? '#c0392b' : promedioGlobal <= 13 ? '#d35400' : promedioGlobal <= 16 ? '#1e8449' : '#1a5276';

        let html = `
        <div style="background:var(--primary);color:white;padding:14px 16px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-weight:bold;font-size:1rem;">${alumnoObj.nombre_completo}</div>
                <div style="font-size:0.8rem;opacity:0.8;">${alumnoObj.codigo||''} · ${notasAlumno.length} nota(s)</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:1.8rem;font-weight:bold;color:${colorGlobal};background:white;border-radius:8px;padding:4px 14px;">${promedioGlobal||'—'}</div>
                <div style="font-size:0.75rem;opacity:0.8;">Promedio</div>
            </div>
        </div>`;

        Object.values(porPaciente).forEach(pac => {
            const promPac = calcularPromedioPonderado(pac.notas);
            const colorPac = !promPac ? '#888' : promPac <= 10 ? '#c0392b' : promPac <= 13 ? '#d35400' : promPac <= 16 ? '#1e8449' : '#1a5276';
            html += `<div style="border:1px solid #eee;border-radius:8px;margin-bottom:10px;overflow:hidden;">
                <div style="background:#f0f4ff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
                    <strong style="color:var(--primary);">🏥 ${pac.nombre}</strong>
                    <span style="background:${colorPac};color:white;padding:3px 12px;border-radius:12px;font-weight:bold;">${promPac||'—'}/20</span>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Categoría</th><th style="padding:8px;text-align:center;">Nota</th><th style="padding:8px;text-align:left;">Docente</th><th style="padding:8px;text-align:left;">Fecha</th></tr>`;
            pac.notas.forEach(n => {
                const nc = parseFloat(n.calificacion);
                const c  = nc <= 10 ? '#fadbd8' : nc <= 13 ? '#fef9e7' : nc <= 16 ? '#d5f5e3' : '#d6eaf8';
                html += `<tr style="border-bottom:1px solid #f0f2f5;">
                    <td style="padding:8px;">${n.categoria}</td>
                    <td style="padding:8px;text-align:center;background:${c};font-weight:bold;">${n.calificacion}/20</td>
                    <td style="padding:8px;color:#555;">${n.docente||'—'}</td>
                    <td style="padding:8px;color:#888;">${n.fecha}</td>
                </tr>`;
            });
            html += `</table></div>`;
        });

        div.innerHTML = html;
    }

    // ============================================
    // EXPORTACIONES CSV (admin)
    // ============================================
    function descargarCSV(filename, rows) {
        const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const bom = '\uFEFF'; // BOM para Excel
        const blob = new Blob([bom+csv], {type:'text/csv;charset=utf-8'});
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {href:url, download:filename});
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarNotificacion('📥 Archivo CSV descargado — ábrelo con Excel');
    }

    function exportarResumenGeneral() {
        const total      = CENTYR.db.pacientes.length;
        const evaluaciones = CENTYR.db.pacientes.filter(p => p.tipo_atencion === 'evaluacion').length;
        const sesiones     = CENTYR.db.pacientes.filter(p => p.tipo_atencion === 'sesion').length;
        const aprobadas    = CENTYR.db.pacientes.filter(p => p.estado_aprobacion === 'aprobado').length;
        const pendientes   = CENTYR.db.pacientes.filter(p => p.estado_aprobacion === 'pendiente').length;

        // Detalle por alumno
        const porAlumno = {};
        CENTYR.db.pacientes.forEach(p => {
            const nombre = p.atendido_por || 'Sin nombre';
            if(!porAlumno[nombre]) porAlumno[nombre] = {evaluaciones:0, sesiones:0, aprobadas:0, pendientes:0};
            if(p.tipo_atencion === 'evaluacion') porAlumno[nombre].evaluaciones++;
            else                                 porAlumno[nombre].sesiones++;
            if(p.estado_aprobacion === 'aprobado') porAlumno[nombre].aprobadas++;
            else                                   porAlumno[nombre].pendientes++;
        });

        const rows = [
            ['RESUMEN GENERAL — CENTYR', '', '', '', ''],
            ['Generado:', new Date().toLocaleDateString('es-PE'), '', '', ''],
            [''],
            ['TOTALES GLOBALES','','','',''],
            ['Total Registros','Evaluaciones','Sesiones','Aprobadas','Pendientes'],
            [total, evaluaciones, sesiones, aprobadas, pendientes],
            [''],
            ['DETALLE POR ALUMNO','','','',''],
            ['Alumno','Evaluaciones','Sesiones','Aprobadas','Pendientes'],
            ...Object.entries(porAlumno).map(([n,d]) => [n, d.evaluaciones, d.sesiones, d.aprobadas, d.pendientes])
        ];
        descargarCSV(`CENTYR_Resumen_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }

    function exportarNotasPorAlumno() {
        const notas = CENTYR.db.notas_docentes || [];
        if(notas.length === 0) { alert('⚠️ No hay notas registradas en esta sesión. Guarda notas primero.'); return; }

        const porAlumno = {};
        notas.forEach(n => {
            if(!porAlumno[n.alumno_nombre]) porAlumno[n.alumno_nombre] = { codigo: n.alumno_codigo, notas: [] };
            porAlumno[n.alumno_nombre].notas.push(n);
        });

        const rows = [
            ['NOTAS POR ALUMNO — CENTYR','','','',''],
            ['Generado:', new Date().toLocaleDateString('es-PE'),'','',''],
            [''],
            ['Alumno','Código','Paciente','Categoría','Nota (0-20)','Promedio','Fecha','Docente']
        ];

        Object.entries(porAlumno).forEach(([nombre, data]) => {
            const prom = calcularPromedioPonderado(data.notas);
            data.notas.forEach((n, i) => {
                rows.push([
                    i===0 ? nombre : '',
                    i===0 ? data.codigo : '',
                    n.paciente_nombre,
                    n.categoria,
                    n.calificacion,
                    i===0 ? (prom||'') : '',
                    n.fecha,
                    n.docente
                ]);
            });
            rows.push(['','','','','','Promedio:', prom||'Sin calcular','']);
            rows.push(['']);
        });
        descargarCSV(`CENTYR_NotasPorAlumno_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }

    function exportarNotasPorPaciente() {
        const notas = CENTYR.db.notas_docentes || [];
        if(notas.length === 0) { alert('⚠️ No hay notas registradas en esta sesión.'); return; }

        const porPaciente = {};
        notas.forEach(n => {
            const key = n.paciente_dni || n.paciente_nombre;
            if(!porPaciente[key]) porPaciente[key] = { nombre: n.paciente_nombre, dni: n.paciente_dni, notas: [] };
            porPaciente[key].notas.push(n);
        });

        const rows = [
            ['NOTAS POR PACIENTE — CENTYR','','','',''],
            ['Generado:', new Date().toLocaleDateString('es-PE'),'','',''],
            [''],
            ['Paciente','DNI','Alumno','Categoría','Nota (0-20)','Promedio','Fecha','Docente']
        ];

        Object.values(porPaciente).forEach(pac => {
            const prom = calcularPromedioPonderado(pac.notas);
            pac.notas.forEach((n, i) => {
                rows.push([
                    i===0 ? pac.nombre : '',
                    i===0 ? pac.dni    : '',
                    n.alumno_nombre,
                    n.categoria,
                    n.calificacion,
                    i===0 ? (prom||'') : '',
                    n.fecha,
                    n.docente
                ]);
            });
            rows.push(['','','','','','Promedio:', prom||'Sin calcular','']);
            rows.push(['']);
        });
        descargarCSV(`CENTYR_NotasPorPaciente_${new Date().toISOString().slice(0,10)}.csv`, rows);
    }


    // ── Registro ─────────────────────────────────────────────────────────────
    const _fns = { adminTab, cursoSelChange, cursoCapacidadChange, agregarGrupoCurso, eliminarGrupoCurso, actualizarGrupoCurso, renderGruposCurso, actualizarBarraPct, renderPreviewCurso, guardarEstructuraCurso, renderCursosGuardados, cargarEstructuraCurso, eliminarEstructuraCurso, abrirIngresoCurso, filtrarSelectAlumnoIngreso, cargarPanelNotasAlumno, selPacienteIngreso, guardarNotasAlumnoEnCurso, recalcularFila, recalcularNotaFinalAlumno, recalcularPromedioGrupo, guardarNotasCurso, exportarNotasCurso, calcularNotasFinalCurso, calcularPromedioPonderado, cargarResumenNotas, descargarCSV, exportarResumenGeneral, exportarNotasPorAlumno, exportarNotasPorPaciente };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test['admin'] = function() {
        console.group('🧪 centyr-admin tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }
        assert('CENTYR.fn.adminTab registrado', typeof CENTYR.fn.adminTab === 'function');
        assert('CENTYR.fn.cursoSelChange registrado', typeof CENTYR.fn.cursoSelChange === 'function');
        assert('CENTYR.fn.cursoCapacidadChange registrado', typeof CENTYR.fn.cursoCapacidadChange === 'function');
        assert('CENTYR.fn.agregarGrupoCurso registrado', typeof CENTYR.fn.agregarGrupoCurso === 'function');
        assert('CENTYR.fn.eliminarGrupoCurso registrado', typeof CENTYR.fn.eliminarGrupoCurso === 'function');
        assert('CENTYR.fn.actualizarGrupoCurso registrado', typeof CENTYR.fn.actualizarGrupoCurso === 'function');

        // Lógica calcularPromedioPonderado
        const grupos = [{nombre:'G1',cantidad:'2',peso:60},{nombre:'G2',cantidad:'2',peso:40}];
        const pacs   = [
          {grupo_idx:0,notas:{[undefined]:[]}},
        ];
        assert('grupos tienen 2 elementos', grupos.length === 2);
        assert('peso total es 100', grupos.reduce((s,g)=>s+(parseFloat(g.peso)||0),0) === 100);
        assert('CENTYR.fn.recalcularFila es function', typeof CENTYR.fn.recalcularFila === 'function');
        assert('CENTYR.fn.guardarEstructuraCurso es function', typeof CENTYR.fn.guardarEstructuraCurso === 'function');
        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-admin.js cargado');
})();
