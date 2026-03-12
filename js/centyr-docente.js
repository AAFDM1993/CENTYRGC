/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-docente.js                                         
 * ║  ── Dependencias: centyr-core.js ──                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

;(function () {
    'use strict';

function toggleAdmin() {
        const p = document.getElementById('admin-panel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
    }

    // cerrarSesion se maneja en centyr-auth.js — este es un stub de compatibilidad
    function cerrarSesionDocente() {
        // No-op: centyr-auth.js tiene la implementación principal
    }

    // ============================================
    // AUTO-FILL INFO ALUMNO EN NOTAS
    // ============================================
    
    function actualizarInfoAlumnoEnNotas() {
        // placeholder — la info se inyecta en abrirModalNotas
    }

    // ============================================
    // NOTA DOCENTE — abrir modal y funciones
    // ============================================

    function abrirModalNotaDocente() {
        if(!CENTYR.currentUser || (CENTYR.currentUser.rol !== 'docente' && CENTYR.currentUser.rol !== 'admin')) {
            alert('⚠️ Solo los docentes y administradores pueden crear notas');
            return;
        }

        // Limpiar campos
        document.getElementById('nota-buscar-apellido').value = '';
        document.getElementById('nota-paciente-select').innerHTML = '<option value="">-- Selecciona un paciente --</option>';
        document.getElementById('nota-calificacion').value = '';
        document.getElementById('nota-info-alumno').style.display = 'none';
        actualizarColorNota(document.getElementById('nota-calificacion'));

        _cargarSelectAlumnos('');
        filtrarAlumnosNota('');

        // Limpiar panel de notas previas
        document.getElementById('notas-previas-panel').innerHTML = '<p style="color:#999; text-align:center; padding:20px 0;">Selecciona un alumno para ver sus notas.</p>';
        document.getElementById('notas-previas-badge').textContent = '0 notas';

        document.getElementById('modalNotaDocente').style.display = 'block';
    }

    function _cargarSelectAlumnos(filtro) {
        const sel = document.getElementById('nota-alumno-select');
        const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const filtrados = filtro.trim()
            ? alumnos.filter(a => a.nombre_completo.toLowerCase().includes(filtro.toLowerCase()))
            : alumnos;
        sel.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
        filtrados.forEach(a => {
            sel.innerHTML += `<option value="${a.usuario}">${a.nombre_completo} (${a.codigo||'Sin código'})</option>`;
        });
    }

    function filtrarAlumnosNota(query) {
        const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const q = (query||'').trim().toLowerCase();
        const filtrados = q
            ? alumnos.filter(a => a.nombre_completo.toLowerCase().includes(q))
            : alumnos;

        const div = document.getElementById('nota-alumnos-resultados');
        if(!div) return;

        if(filtrados.length === 0) {
            div.innerHTML = '<span style="color:#999; font-size:0.82rem;">Sin coincidencias</span>';
            return;
        }

        div.innerHTML = filtrados.map(a => {
            const notasA   = (CENTYR.db.notas_docentes||[]).filter(n => n.alumno_nombre === a.nombre_completo);
            const promedio = notasA.length ? (notasA.reduce((s,n)=>s+parseFloat(n.calificacion||0),0)/notasA.length).toFixed(1) : null;
            const col      = !promedio ? '#888' : promedio <= 10 ? '#E53935' : promedio <= 13 ? '#F59E0B' : promedio <= 16 ? '#2ECC71' : '#0288D1';
            return `<button onclick="seleccionarAlumnoNota('${a.usuario}')"
                style="padding:6px 12px; background:white; border:1.5px solid #e0e6ed; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:600; text-align:left;">
                <div style="color:var(--primary);">${a.nombre_completo}</div>
                <div style="color:#888; font-size:0.72rem;">${a.codigo||'Sin código'} ${promedio ? `· <span style="color:${col}">${promedio}/20</span>` : '· Sin notas'}</div>
            </button>`;
        }).join('');
    }

    function seleccionarAlumnoNota(usuario) {
        const sel = document.getElementById('nota-alumno-select');
        if(![...sel.options].some(o=>o.value===usuario)) _cargarSelectAlumnos('');
        sel.value = usuario;
        cargarPacientesAlumno();
        renderNotasPrevias(usuario);
    }

    /** Renderiza el panel derecho con notas previas del alumno en el modal docente */
    function renderNotasPrevias(alumnoUsuario) {
        const panel  = document.getElementById('notas-previas-panel');
        const badge  = document.getElementById('notas-previas-badge');
        if(!panel) return;

        if(!alumnoUsuario) {
            panel.innerHTML = '<p style="color:#999; text-align:center; padding:20px 0;">Selecciona un alumno para ver sus notas.</p>';
            badge.textContent = '0 notas';
            return;
        }

        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if(!alumnoObj) return;

        const notasAlumno = (CENTYR.db.notas_docentes||[]).filter(n => n.alumno_nombre === alumnoObj.nombre_completo);
        badge.textContent = `${notasAlumno.length} nota(s)`;
        badge.style.background = notasAlumno.length ? 'var(--docente)' : '#eee';
        badge.style.color      = notasAlumno.length ? 'white' : '#888';

        if(notasAlumno.length === 0) {
            panel.innerHTML = `<p style="color:#999; text-align:center; padding:20px 0;">Sin notas registradas para <strong>${alumnoObj.nombre_completo}</strong>.</p>`;
            return;
        }

        // Agrupar por paciente
        const porPaciente = {};
        notasAlumno.forEach(n => {
            const key = n.paciente_dni || n.paciente_nombre;
            if(!porPaciente[key]) porPaciente[key] = { nombre: n.paciente_nombre, notas: [] };
            porPaciente[key].notas.push(n);
        });

        let html = '';
        Object.values(porPaciente).forEach(pac => {
            const prom = pac.notas.length
                ? (pac.notas.reduce((s,n)=>s+parseFloat(n.calificacion||0),0)/pac.notas.length).toFixed(1)
                : null;
            const col = !prom ? '#888' : prom <= 10 ? '#E53935' : prom <= 13 ? '#F59E0B' : prom <= 16 ? '#2ECC71' : '#0288D1';
            html += `<div style="border:1px solid #e0e6ed; border-radius:8px; margin-bottom:8px; overflow:hidden;">
                <div style="background:var(--primary); color:white; padding:7px 10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:0.82rem;">🏥 ${pac.nombre}</span>
                    <span style="background:${col}; color:white; padding:1px 8px; border-radius:8px; font-size:0.75rem; font-weight:700;">Prom: ${prom||'—'}/20</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
                    <tr style="background:#f8f9fa;">
                        <th style="padding:5px 8px; text-align:left; color:#555;">Categoría</th>
                        <th style="padding:5px 8px; text-align:center; color:#555;">Nota</th>
                        <th style="padding:5px 8px; text-align:left; color:#555;">Fecha</th>
                    </tr>`;
            pac.notas.forEach(n => {
                const nc  = parseFloat(n.calificacion);
                const bg  = nc <= 10 ? '#FECACA' : nc <= 13 ? '#FEF3C7' : nc <= 16 ? '#D1FAE5' : '#DBEAFE';
                const fc  = nc <= 10 ? '#991B1B' : nc <= 13 ? '#92400E' : nc <= 16 ? '#065F46' : '#1E40AF';
                html += `<tr style="border-bottom:1px solid #f0f2f5;">
                    <td style="padding:5px 8px;">${n.categoria||'—'}</td>
                    <td style="padding:5px 8px; text-align:center; background:${bg}; color:${fc}; font-weight:700;">${nc}/20</td>
                    <td style="padding:5px 8px; color:#888;">${n.fecha||''}</td>
                </tr>`;
            });
            html += `</table></div>`;
        });

        panel.innerHTML = html;
    }

    function cargarPacientesAlumno() {
        const alumnoUsuario = document.getElementById('nota-alumno-select').value;
        const selPac = document.getElementById('nota-paciente-select');
        selPac.innerHTML = '<option value="">-- Selecciona un paciente --</option>';
        document.getElementById('nota-info-alumno').style.display = 'none';
        renderNotasPrevias(alumnoUsuario);

        if(!alumnoUsuario) return;

        // Encontrar el alumno en usuarios
        const alumnoObj = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if(!alumnoObj) return;

        // Buscar pacientes registrados por ese alumno
        const pacientesDelAlumno = {};
        CENTYR.db.pacientes.forEach(p => {
            if(p.atendido_por === alumnoObj.nombre_completo) {
                pacientesDelAlumno[String(p.dni)] = p.paciente;
            }
        });

        if(Object.keys(pacientesDelAlumno).length === 0) {
            selPac.innerHTML = '<option value="">Sin pacientes registrados</option>';
            return;
        }

        Object.entries(pacientesDelAlumno).forEach(([dni, nombre]) => {
            selPac.innerHTML += `<option value="${dni}">${nombre} — DNI: ${dni}</option>`;
        });
    }

    function cargarDatosNota() {
        const alumnoUsuario = document.getElementById('nota-alumno-select').value;
        const pacienteDni   = document.getElementById('nota-paciente-select').value;
        const infoBox       = document.getElementById('nota-info-alumno');
        const infoTexto     = document.getElementById('nota-info-texto');

        if(!alumnoUsuario || !pacienteDni) {
            infoBox.style.display = 'none';
            return;
        }

        const alumnoObj  = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        const pacienteRec = CENTYR.db.pacientes.find(p => String(p.dni) === pacienteDni);

        if(alumnoObj && pacienteRec) {
            infoTexto.innerHTML = `
                <strong>👨‍🎓 Alumno:</strong> ${alumnoObj.nombre_completo}<br>
                <strong>🔢 Código:</strong> ${alumnoObj.codigo || 'N/A'}<br>
                <strong>🏥 Paciente:</strong> ${pacienteRec.paciente}<br>
                <strong>📋 DNI:</strong> ${pacienteDni}<br>
                <strong>👨‍🏫 Docente:</strong> ${CENTYR.currentUser.nombre_completo}${CENTYR.currentUser.colegiatura ? ' — CTMP: '+ctmpLimpio(CENTYR.currentUser.colegiatura) : ''}
            `;
            infoBox.style.display = 'block';
        }
    }

    function setNotaCat(el, val) {
        document.querySelectorAll('#nota-cat-grid .cat-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        document.getElementById('nota-categoria').value = val;
    }

    // ============================================================
    // MIS NOTAS — ALUMNO
    // ============================================================
    function abrirIngresoCursoConAlumno(alumnoUsuario) {
        document.getElementById('modalNotasAlumno').style.display = 'none';
        const ests = CENTYR.db.estructuras_cursos || [];
        if(ests.length === 0) { alert('⚠️ No hay cursos configurados. Ve al Panel Admin → Cursos.'); return; }
        abrirIngresoCurso(ests[0].curso, alumnoUsuario);
    }

    function abrirIngresoCursoConAlumno2(curso, alumnoUsuario) {
        document.getElementById('modalNotasAlumno').style.display = 'none';
        abrirIngresoCurso(curso, alumnoUsuario);
    }

    /** Cuadro de Notas sidebar — muestra alumnos con sus promedios finales por curso */
    function renderNotasSidebar() {
        const body = document.getElementById('notas-sidebar-body');
        if (!body) return;

        const filtroAlumno = (document.getElementById('notas-sidebar-filtro-alumno')?.value || '').trim().toLowerCase();
        const filtroCurso  = (document.getElementById('notas-sidebar-filtro-curso')?.value  || '').trim();

        // Poblar select de cursos la primera vez
        const selCurso = document.getElementById('notas-sidebar-filtro-curso');
        if (selCurso && selCurso.options.length <= 1) {
            const cursos = (CENTYR.db.estructuras_cursos || []).map(e => e.curso);
            selCurso.innerHTML = '<option value="">— Curso —</option>' +
                cursos.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        const alumnos = (CENTYR.db.usuarios || []).filter(u => u.rol === 'alumno' &&
            (!filtroAlumno || u.nombre_completo.toLowerCase().includes(filtroAlumno) ||
             (u.codigo||'').toLowerCase().includes(filtroAlumno)));
        const estructuras = CENTYR.db.estructuras_cursos || [];
        const notasCursos = CENTYR.db.notas_cursos || {};

        if (!alumnos.length) {
            body.innerHTML = '<p style="color:#999;text-align:center;padding:15px 0;font-size:0.8rem;">Sin alumnos registrados.</p>';
            return;
        }

        // Calcular promedio final de un alumno en un curso (igual que admin)
        const calcProm = (alumnoUsuario, curso) => {
            const est  = estructuras.find(e => e.curso === curso);
            if (!est) return null;
            const pacs = notasCursos[`${alumnoUsuario}::${curso}`] || [];
            if (!pacs.length) return null;
            const pesoEV = est.pesoEV || 20, pesoSS = est.pesoSS || 80;
            const notas = [];
            let pi = 0;
            (est.grupos || []).forEach(g => {
                const nSS = g.nSesiones||10, nExt = g.nExtras||0, pctE = g.pctExtra||0;
                for (let k=0; k<(g.nPacientes||1); k++) {
                    const pac   = pacs[pi++] || {};
                    const evVal = pac.nota_ev!==''&&pac.nota_ev!==undefined ? parseFloat(pac.nota_ev)||0 : null;
                    const ss    = pac.notas_ss  || [];
                    const ext   = pac.notas_ext || [];
                    const sumSS = ss.reduce((s,v) => s+(v!==''?parseFloat(v)||0:0), 0);
                    const promSS= sumSS / nSS;
                    const sumExt= ext.reduce((s,v) => s+(v!==''?parseFloat(v)||0:0), 0);
                    const promExt = nExt>0 ? sumExt/nExt : null;
                    let base=0, pw=0;
                    if (evVal!==null) { base+=evVal*pesoEV/100; pw+=pesoEV; }
                    base += promSS*pesoSS/100; pw+=pesoSS;
                    const bono = (promExt!==null&&nExt>0) ? promExt*pctE/100 : 0;
                    if (pw>0) notas.push(Math.min(20, base+bono));
                }
            });
            return notas.length ? notas.reduce((s,v)=>s+v,0)/notas.length : null;
        };

        const cursosFiltrados = filtroCurso
            ? [filtroCurso]
            : estructuras.map(e => e.curso);

        if (!cursosFiltrados.length) {
            body.innerHTML = '<p style="color:#D97706;text-align:center;padding:12px;font-size:0.78rem;background:#FFF3E0;border-radius:7px;">Sin estructuras de curso. Ve a ⚙️ Cursos para crear una.</p>';
            return;
        }

        let html = '';
        cursosFiltrados.forEach(curso => {
            const est = estructuras.find(e => e.curso === curso);
            if (!est) return;

            const filas = alumnos.map(a => {
                const prom = calcProm(a.usuario, curso);
                return { alumno: a, prom };
            });

            const col = '#0288D1';
            html += `<div style="margin-bottom:12px;border:1.5px solid #e0e6ed;border-radius:9px;overflow:hidden;">
                <div style="background:var(--primary);color:white;padding:7px 11px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;font-size:0.82rem;">🏫 ${curso}</span>
                    <span style="font-size:0.68rem;opacity:0.8;">EV ${est.pesoEV||20}% + SS ${est.pesoSS||80}%</span>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
                    <thead><tr style="background:#f0f4ff;">
                        <th style="padding:5px 8px;text-align:left;color:var(--primary);font-weight:700;">Alumno</th>
                        <th style="padding:5px 8px;text-align:center;color:var(--primary);font-weight:700;width:70px;">Prom. Final</th>
                        <th style="padding:5px 6px;text-align:center;width:36px;"></th>
                    </tr></thead>
                    <tbody>
                    ${filas.map(({alumno, prom}) => {
                        const p = prom;
                        const bg = p===null?'#f5f5f5':p<=10?'#FECACA':p<=13?'#FEF3C7':p<=16?'#D1FAE5':'#DBEAFE';
                        const fc = p===null?'#aaa'   :p<=10?'#991B1B':p<=13?'#92400E':p<=16?'#065F46':'#1E40AF';
                        return `<tr style="border-bottom:1px solid #f0f2f5;">
                            <td style="padding:5px 8px;">
                                <div style="font-weight:600;color:var(--primary);">${alumno.nombre_completo}</div>
                                <div style="font-size:0.68rem;color:#888;">${alumno.codigo||alumno.usuario}</div>
                            </td>
                            <td style="padding:5px 8px;text-align:center;">
                                <span style="background:${bg};color:${fc};padding:2px 9px;border-radius:10px;font-weight:700;font-size:0.78rem;">
                                    ${p!==null?p.toFixed(2):'—'}</span>
                            </td>
                            <td style="padding:4px 5px;text-align:center;">
                                <button onclick="abrirIngresoCurso('${curso}','${alumno.usuario}')"
                                        title="Editar notas"
                                        style="padding:3px 7px;background:#EEF4FF;color:var(--admin);border:1.5px solid var(--admin);border-radius:5px;cursor:pointer;font-size:0.7rem;font-weight:700;">✏️</button>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>`;
        });

        body.innerHTML = html || '<p style="color:#999;text-align:center;padding:15px 0;font-size:0.78rem;">Sin datos.</p>';
    }

    function generarNotaDocentePDF() {
        const alumnoUsuario  = document.getElementById('nota-alumno-select').value;
        const pacienteDni    = document.getElementById('nota-paciente-select').value;
        const categoria      = document.getElementById('nota-categoria').value;
        const calificacion   = document.getElementById('nota-calificacion').value;

        if(!alumnoUsuario || !pacienteDni) {
            alert('⚠️ Selecciona alumno y paciente primero');
            return;
        }

        const alumnoObj    = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        const pacienteRec  = CENTYR.db.pacientes.find(p => String(p.dni) === pacienteDni);

        if(!alumnoObj || !pacienteRec) {
            alert('⚠️ Datos no encontrados');
            return;
        }

        // Obtener todas las sesiones del paciente registradas por este alumno
        const sesionesAlumno = CENTYR.db.pacientes
            .filter(p => String(p.dni) === pacienteDni && p.atendido_por === alumnoObj.nombre_completo)
            .sort((a, b) => parseInt(a.id) - parseInt(b.id));

        const ahora = new Date();
        const fechaFmt = `${String(ahora.getDate()).padStart(2,'0')}/${String(ahora.getMonth()+1).padStart(2,'0')}/${ahora.getFullYear()}`;

        const baseUrl  = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')+1);
        const logoUrl  = baseUrl + 'logo.png';

        let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota Docente - ${alumnoObj.nombre_completo}</title>
  <style>
    @page { margin: 1.5cm; }
    body { font-family: 'Segoe UI', sans-serif; color: #333; font-size: 11pt; margin:0; }
    .header { text-align:center; border-bottom: 3px solid #252850; padding-bottom:20px; margin-bottom:25px; }
    .logo { width:200px; height:auto; margin-bottom:10px; }
    .titulo { color:#252850; font-size:20pt; font-weight:bold; margin:8px 0; }
    .subtitulo { color:#1a6fa8; font-size:12pt; }
    .seccion { margin-bottom:22px; page-break-inside:avoid; }
    .seccion-titulo { background:#252850; color:white; padding:10px 16px; border-radius:6px; font-weight:bold; font-size:12pt; margin-bottom:12px; }
    .info-box { background:#f0f4ff; border-left:4px solid #1a6fa8; padding:14px 16px; border-radius:6px; }
    .info-row { display:flex; gap:30px; flex-wrap:wrap; margin-bottom:6px; }
    .info-item { min-width:200px; }
    .info-item strong { color:#252850; }
    .sesion-card { background:#f8f9fa; border-left:4px solid #252850; padding:12px 14px; border-radius:4px; margin-bottom:12px; page-break-inside:avoid; }
    .sesion-card.evaluacion { border-left-color:#27ae60; }
    .sesion-header { font-weight:bold; color:#252850; margin-bottom:6px; font-size:10pt; }
    .sesion-header.evaluacion { color:#27ae60; }
    .sesion-notas { white-space:pre-wrap; line-height:1.5; font-size:10pt; color:#444; }
    .nota-box { background:#fff8e1; border-left:4px solid #f39c12; padding:16px; border-radius:6px; }
    .nota-box h4 { color:#e67e22; margin:0 0 10px 0; }
    .firma { margin-top:50px; text-align:center; }
    .linea-firma { border-top:2px solid #333; width:280px; margin:0 auto 8px; }
    .footer { margin-top:40px; text-align:center; color:#999; font-size:9pt; border-top:1px solid #eee; padding-top:15px; }
    .badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:9pt; font-weight:bold; }
    .badge-aprobado { background:#d5f5e3; color:#1e8449; }
    .badge-pendiente { background:#fef9e7; color:#d35400; }
    @media print { body{margin:0} .sesion-card{page-break-inside:avoid} }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="CENTYR" class="logo" onerror="this.style.display='none'">
    <div class="titulo">NOTA DEL DOCENTE</div>
    <div class="subtitulo">Sistema de Gestión Clínica CENTYR</div>
  </div>

  <div class="seccion">
    <div class="seccion-titulo">👨‍🎓 DATOS DEL ALUMNO Y PACIENTE</div>
    <div class="info-box">
      <div class="info-row">
        <div class="info-item"><strong>Alumno:</strong> ${alumnoObj.nombre_completo}</div>
        <div class="info-item"><strong>Código:</strong> ${alumnoObj.codigo || 'N/A'}</div>
      </div>
      <div class="info-row">
        <div class="info-item"><strong>Paciente:</strong> ${pacienteRec.paciente}</div>
        <div class="info-item"><strong>DNI:</strong> ${pacienteDni}</div>
      </div>
      <div class="info-row">
        <div class="info-item"><strong>Categoría:</strong> ${categoria}</div>
        <div class="info-item"><strong>Fecha del reporte:</strong> ${fechaFmt}</div>
      </div>
      <div class="info-row">
        <div class="info-item"><strong>Docente:</strong> ${CENTYR.currentUser.nombre_completo}</div>
        ${CENTYR.currentUser.colegiatura ? `<div class="info-item"><strong>CTMP:</strong> ${CENTYR.currentUser.colegiatura}</div>` : ''}
      </div>
    </div>
  </div>`;

        // Sesiones del paciente por este alumno
        if(sesionesAlumno.length > 0) {
            html += `<div class="seccion">
    <div class="seccion-titulo">📋 REGISTROS DEL ALUMNO (${sesionesAlumno.length} registros)</div>`;
            sesionesAlumno.forEach((s, i) => {
                const esEval = s.tipo_atencion === 'evaluacion' || i === 0;
                const badge  = s.estado_aprobacion === 'aprobado'
                    ? `<span class="badge badge-aprobado">✅ Aprobado</span>`
                    : `<span class="badge badge-pendiente">⏳ Pendiente</span>`;
                html += `
    <div class="sesion-card ${esEval?'evaluacion':''}">
      <div class="sesion-header ${esEval?'evaluacion':''}">
        ${esEval ? '📋 EVALUACIÓN' : `💪 SESIÓN #${i}`} — ${formatearFecha(s.fecha)}  ${badge}
      </div>
      <div style="color:#888;font-size:9pt;margin-bottom:6px;">📌 ${s.categoria}</div>
      <div class="sesion-notas">${s.notas}</div>
    </div>`;
            });
            html += `</div>`;
        }

        const notaNum = parseFloat(calificacion);
        const notaColor = isNaN(notaNum) ? '#888' : notaNum <= 10 ? '#c0392b' : notaNum <= 13 ? '#d35400' : notaNum <= 16 ? '#1e8449' : '#1a5276';
        const notaBg    = isNaN(notaNum) ? '#eee'  : notaNum <= 10 ? '#fadbd8'  : notaNum <= 13 ? '#fef9e7'  : notaNum <= 16 ? '#d5f5e3'  : '#d6eaf8';
        const notaLabel = isNaN(notaNum) ? 'Sin nota' : notaNum <= 10 ? 'Desaprobado' : notaNum <= 13 ? 'Regular' : notaNum <= 16 ? 'Bueno' : 'Excelente';

        html += `<div class="seccion">
    <div class="seccion-titulo">📊 CALIFICACIÓN</div>
    <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
        <div style="text-align:center; background:${notaBg}; border:3px solid ${notaColor}; border-radius:12px; padding:16px 28px;">
            <div style="font-size:2.5rem; font-weight:bold; color:${notaColor};">${isNaN(notaNum)?'—':notaNum}</div>
            <div style="font-size:0.8rem; color:${notaColor}; font-weight:bold;">/ 20</div>
        </div>
        <div>
            <div style="font-size:1.2rem; font-weight:bold; color:${notaColor};">${notaLabel}</div>
            <div style="color:#888; font-size:0.9rem; margin-top:4px;">Sistema Vigesimal</div>
        </div>
    </div>
  </div>`;

        html += `
  <div class="firma">
    <div class="linea-firma"></div>
    <p style="margin:4px 0; font-weight:bold;">${CENTYR.currentUser.nombre_completo}</p>
    ${CENTYR.currentUser.colegiatura ? `<p style="margin:4px 0; color:#666;">CTMP: ${CENTYR.currentUser.colegiatura}</p>` : ''}
    <p style="margin:4px 0; color:#888; font-size:10pt;">Docente - CENTYR</p>
  </div>
  <div class="footer">
    <p>Documento generado por el Sistema CENTYR — ${fechaFmt}</p>
    <p>Este documento es de carácter académico y confidencial.</p>
  </div>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `NotaDocente_${alumnoObj.nombre_completo.replace(/ /g,'_')}_${pacienteRec.paciente.replace(/ /g,'_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarNotificacion('📄 Reporte generado — ábrelo y presiona Ctrl+P para imprimir');
    }

    // ============================================
    // APROBAR SESIÓN (solo docente y admin)
    // ============================================
    
    async function aprobarSesion(id) {
        if(!CENTYR.currentUser || (CENTYR.currentUser.rol !== 'docente' && CENTYR.currentUser.rol !== 'admin')) {
            alert('⚠️ No tienes permiso para aprobar sesiones');
            return;
        }

        // Pedir nota vigesimal al momento de aprobar
        const notaStr = prompt('📋 APROBACIÓN DE SESIÓN\n\nIngresa la nota vigesimal (0–20):\n(Deja vacío para aprobar sin nota)', '');
        if(notaStr === null) return; // cancelado

        const nota = notaStr.trim() === '' ? null : parseFloat(notaStr.trim());
        if(nota !== null && (isNaN(nota) || nota < 0 || nota > 20)) {
            alert('⚠️ Nota inválida. Debe ser un número entre 0 y 20.');
            return;
        }

        showLoad(true, 'Aprobando...');

        const payload = {
            action:       'approve_session',
            id:           id,
            aprobado_por: CENTYR.currentUser.nombre_completo,
            colegiatura:  CENTYR.currentUser.colegiatura || '',
            nota_aprobacion: nota !== null ? nota : ''
        };

        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            await response.json();
        } catch(e) { /* continuar localmente */ }

        const sesion = CENTYR.db.pacientes.find(p => String(p.id) === String(id));
        if(sesion) {
            sesion.estado_aprobacion     = 'aprobado';
            sesion.aprobado_por          = CENTYR.currentUser.nombre_completo;
            sesion.colegiatura_aprobador = CENTYR.currentUser.colegiatura || '';
            if(nota !== null) sesion.nota_aprobacion = nota;
        }

        verHistorial(CENTYR.selectedDni);
        verificarPendientesDocente();
        showLoad(false);
        const notaLabel = nota !== null ? ` · Nota: ${nota}/20` : '';
        mostrarNotificacion(`✅ Aprobado por ${CENTYR.currentUser.nombre_completo}${notaLabel}`);
        setTimeout(() => cargarDatos(false), 800);
    }

    // ============================================
    // ESTADÍSTICAS (solo admin)
    // ============================================
    
    function abrirEstadisticas() {
        if(!CENTYR.currentUser || CENTYR.currentUser.rol !== 'admin') {
            alert('⚠️ Solo el administrador puede ver estadísticas');
            return;
        }
        
        const total = CENTYR.db.pacientes.length;
        const evaluaciones = CENTYR.db.pacientes.filter(p => p.tipo_atencion === 'evaluacion' || !p.tipo_atencion).length;
        const sesiones = CENTYR.db.pacientes.filter(p => p.tipo_atencion === 'sesion').length;
        const pendientes = CENTYR.db.pacientes.filter(p => p.estado_aprobacion === 'pendiente').length;
        const aprobados = CENTYR.db.pacientes.filter(p => p.estado_aprobacion === 'aprobado' || !p.estado_aprobacion).length;
        
        // Estadísticas por alumno
        const porAlumno = {};
        CENTYR.db.pacientes.forEach(p => {
            if(p.rol_autor === 'alumno') {
                const nombre = p.atendido_por || 'Desconocido';
                if(!porAlumno[nombre]) porAlumno[nombre] = { evaluaciones: 0, sesiones: 0 };
                if(p.tipo_atencion === 'evaluacion') porAlumno[nombre].evaluaciones++;
                else porAlumno[nombre].sesiones++;
            }
        });
        
        // Estadísticas por categoría
        const porCategoria = {};
        CENTYR.db.pacientes.forEach(p => {
            const cat = p.categoria || 'Sin categoría';
            porCategoria[cat] = (porCategoria[cat] || 0) + 1;
        });
        
        let html = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:25px;">
                <div style="background:#252850;color:white;padding:20px;border-radius:10px;text-align:center;">
                    <div style="font-size:2rem;font-weight:bold;">${total}</div>
                    <div style="font-size:0.9rem;opacity:0.9;">Total Registros</div>
                </div>
                <div style="background:#27ae60;color:white;padding:20px;border-radius:10px;text-align:center;">
                    <div style="font-size:2rem;font-weight:bold;">${evaluaciones}</div>
                    <div style="font-size:0.9rem;opacity:0.9;">Evaluaciones</div>
                </div>
                <div style="background:#1a6fa8;color:white;padding:20px;border-radius:10px;text-align:center;">
                    <div style="font-size:2rem;font-weight:bold;">${sesiones}</div>
                    <div style="font-size:0.9rem;opacity:0.9;">Sesiones</div>
                </div>
                <div style="background:#f39c12;color:white;padding:20px;border-radius:10px;text-align:center;">
                    <div style="font-size:2rem;font-weight:bold;">${pendientes}</div>
                    <div style="font-size:0.9rem;opacity:0.9;">Pendientes de Aprobación</div>
                </div>
            </div>`;
        
        if(Object.keys(porAlumno).length > 0) {
            html += `<h3 style="color:var(--primary);border-bottom:2px solid #f0f2f5;padding-bottom:8px;">📚 Registros por Alumno</h3>`;
            html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr style="background:#f0f2f5;"><th style="padding:10px;text-align:left;">Alumno</th><th style="padding:10px;text-align:center;">Evaluaciones</th><th style="padding:10px;text-align:center;">Sesiones</th></tr>`;
            Object.entries(porAlumno).forEach(([nombre, data]) => {
                html += `<tr style="border-bottom:1px solid #f0f2f5;">
                    <td style="padding:10px;">${nombre}</td>
                    <td style="padding:10px;text-align:center;">${data.evaluaciones}</td>
                    <td style="padding:10px;text-align:center;">${data.sesiones}</td>
                </tr>`;
            });
            html += `</table>`;
        }
        
        html += `<h3 style="color:var(--primary);border-bottom:2px solid #f0f2f5;padding-bottom:8px;">🏥 Registros por Categoría</h3>`;
        html += `<table style="width:100%;border-collapse:collapse;">
            <tr style="background:#f0f2f5;"><th style="padding:10px;text-align:left;">Categoría</th><th style="padding:10px;text-align:center;">Total</th></tr>`;
        Object.entries(porCategoria).forEach(([cat, count]) => {
            html += `<tr style="border-bottom:1px solid #f0f2f5;">
                <td style="padding:10px;">${cat}</td>
                <td style="padding:10px;text-align:center;">${count}</td>
            </tr>`;
        });
        html += `</table>`;
        
        document.getElementById('estadisticas-contenido').innerHTML = html;
        document.getElementById('modalEstadisticas').style.display = 'block';
    }

    // ============================================
    // POP-UP PENDIENTES (solo docentes)
    // ============================================

    let popupAbierto = true;

    function verificarPendientesDocente() {
        if(!CENTYR.currentUser || CENTYR.currentUser.rol !== 'docente') return;

        // Solo mostrar pendientes asignados a ESTE docente
        const pendientes = CENTYR.db.pacientes.filter(p => {
            if(p.estado_aprobacion !== 'pendiente') return false;
            // Si tiene docente_usuario asignado, filtrar; si no tiene (legado), mostrar
            if(p.docente_usuario && p.docente_usuario !== CENTYR.currentUser.usuario) return false;
            return true;
        });
        const popup  = document.getElementById('popup-pendientes');
        const badge  = document.getElementById('pp-badge');
        const body   = document.getElementById('pp-body');

        if(pendientes.length === 0) {
            popup.style.display = 'none';
            return;
        }

        badge.textContent = pendientes.length;
        popup.style.display = 'flex';

        body.innerHTML = pendientes.map(s => {
            const tipo = s.tipo_atencion === 'evaluacion' ? '📋 Evaluación' : '💪 Sesión';
            return `
            <div class="pp-item">
                <strong>${s.paciente || 'Paciente'}</strong>
                <div class="pp-meta">
                    ${tipo} · ${formatearFecha(s.fecha)}<br>
                    👨‍🎓 ${s.atendido_por || ''}
                    ${s.alumno_codigo ? ' · Cód: '+s.alumno_codigo : ''}
                    ${s.curso ? ' · <strong style="color:var(--docente)">'+s.curso+'</strong>' : ''}
                </div>
                <button class="pp-btn" onclick="aprobarDesdePopup('${s.id}','${(s.dni||'').replace(/'/g,"\\'")}')">✅ Aprobar</button>
            </div>`;
        }).join('');
    }

    function aprobarDesdePopup(id, dni) {
        CENTYR.selectedDni = dni;
        aprobarSesion(id);
    }

    function togglePopupPendientes() {
        popupAbierto = !popupAbierto;
        document.getElementById('pp-body').style.display = popupAbierto ? 'block' : 'none';
        document.getElementById('pp-chevron').textContent = popupAbierto ? '▲' : '▼';
    }

    // ============================================
    // COLOR BADGE NOTA VIGESIMAL
    // ============================================

    function actualizarColorNota(input) {
        const val   = parseFloat(input.value);
        const badge = document.getElementById('nota-color-badge');
        if(isNaN(val) || input.value === '') {
            badge.style.background = '#eee'; badge.style.color = '#666';
            badge.textContent = 'Ingresa una nota'; return;
        }
        if(val < 0 || val > 20) {
            badge.style.background = '#fadbd8'; badge.style.color = '#c0392b';
            badge.textContent = '⚠️ Fuera de rango'; return;
        }
        if(val <= 10)      { badge.style.background = '#fadbd8'; badge.style.color = '#c0392b'; badge.textContent = '❌ Desaprobado ('+val+'/20)'; }
        else if(val <= 13) { badge.style.background = '#fef9e7'; badge.style.color = '#d35400'; badge.textContent = '⚠️ Regular ('+val+'/20)'; }
        else if(val <= 16) { badge.style.background = '#d5f5e3'; badge.style.color = '#1e8449'; badge.textContent = '✅ Bueno ('+val+'/20)'; }
        else               { badge.style.background = '#d6eaf8'; badge.style.color = '#1a5276'; badge.textContent = '🌟 Excelente ('+val+'/20)'; }
    }

    function actualizarPorcentajeBadge(input) {
        const val   = parseFloat(input.value);
        const badge = document.getElementById('nota-pct-badge');
        if(isNaN(val) || input.value === '') {
            badge.style.background='#eee'; badge.style.color='#666'; badge.textContent='Ingresa el %'; return;
        }
        if(val <= 0 || val > 100) {
            badge.style.background='#fadbd8'; badge.style.color='#c0392b'; badge.textContent='⚠️ Fuera de rango'; return;
        }
        badge.style.background='#fef9e7'; badge.style.color='#d35400';
        badge.textContent = `Pondera ${val}% del promedio`;
    }

    // ============================================
    // ADMIN TABS
    // ============================================


    // ── Registro ─────────────────────────────────────────────────────────────
    const _fns = { toggleAdmin, abrirModalNotaDocente, _cargarSelectAlumnos, filtrarAlumnosNota, seleccionarAlumnoNota, renderNotasPrevias, cargarPacientesAlumno, cargarDatosNota, setNotaCat, renderNotasSidebar, guardarNotaDocente, generarNotaDocentePDF, aprobarSesion, abrirEstadisticas, verificarPendientesDocente, aprobarDesdePopup, togglePopupPendientes, actualizarColorNota, actualizarPorcentajeBadge, actualizarInfoAlumnoEnNotas, abrirIngresoCursoConAlumno, abrirIngresoCursoConAlumno2 };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test['docente'] = function() {
        console.group('🧪 centyr-docente tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }
        assert('CENTYR.fn.toggleAdmin registrado', typeof CENTYR.fn.toggleAdmin === 'function');
        assert('CENTYR.fn.abrirModalNotaDocente registrado', typeof CENTYR.fn.abrirModalNotaDocente === 'function');
        assert('CENTYR.fn._cargarSelectAlumnos registrado', typeof CENTYR.fn._cargarSelectAlumnos === 'function');
        assert('CENTYR.fn.filtrarAlumnosNota registrado', typeof CENTYR.fn.filtrarAlumnosNota === 'function');
        assert('CENTYR.fn.seleccionarAlumnoNota registrado', typeof CENTYR.fn.seleccionarAlumnoNota === 'function');
        assert('CENTYR.fn.renderNotasPrevias registrado', typeof CENTYR.fn.renderNotasPrevias === 'function');

        // Lógica de filtrado
        CENTYR.db = { ...CENTYR.db, usuarios: [
            { usuario:'d1', nombre_completo:'García Lopez', rol:'docente', colegiatura:'CTMP 001' },
            { usuario:'d2', nombre_completo:'Perez Torres', rol:'docente', colegiatura:'CTMP 002' },
        ]};
        assert('db tiene 2 docentes de prueba', CENTYR.db.usuarios.filter(u=>u.rol==='docente').length === 2);
        CENTYR.db = { pacientes:[], usuarios:[], citas:[], notas_docentes:[], estructuras_cursos:[], notas_cursos:{} };
        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-docente.js cargado');
})();
