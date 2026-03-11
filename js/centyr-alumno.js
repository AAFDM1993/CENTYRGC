/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-alumno.js                                         
 * ║  ── Dependencias: centyr-core.js ──                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

;(function () {
    'use strict';

function abrirModalMisNotas() {
        if(!CENTYR.currentUser) return;
        renderMisNotas();
        document.getElementById('modalMisNotas').style.display = 'block';
    }

    function renderMisNotas() {
        const body = document.getElementById('mis-notas-body');
        if(!body) return;
        const nombre = CENTYR.currentUser.nombre_completo;

        // Sesiones del alumno agrupadas por curso (= categoria)
        const misSesiones = CENTYR.db.pacientes.filter(p => p.atendido_por === nombre);

        // Estructuras de cursos disponibles
        const estructuras = CENTYR.db.estructuras_cursos || [];

        // Agrupar sesiones por curso
        const porCurso = {};
        misSesiones.forEach(s => {
            const c = s.curso || s.categoria || 'Sin curso';
            if(!porCurso[c]) porCurso[c] = [];
            porCurso[c].push(s);
        });

        if(Object.keys(porCurso).length === 0 && estructuras.length === 0) {
            body.innerHTML = '<p style="text-align:center; color:#999; padding:40px 0;">Aún no tienes sesiones ni cursos registrados.</p>';
            return;
        }

        // Unir cursos de sesiones + estructuras configuradas
        const todosCursos = new Set([...Object.keys(porCurso), ...estructuras.map(e => e.curso)]);

        let html = '';
        todosCursos.forEach(curso => {
            const est      = estructuras.find(e => e.curso === curso);
            const sesiones = porCurso[curso] || [];
            const aprobadas= sesiones.filter(s => s.estado_aprobacion === 'aprobado');
            const pendientes2= sesiones.filter(s => s.estado_aprobacion === 'pendiente');

            // Notas ingresadas por el docente para este alumno+curso  (clave alumno::curso)
            const keyAlumno  = `${usuario}::${curso}`;
            const notasCurso = (CENTYR.db.notas_cursos||{})[keyAlumno] || [];

            let notaFinal = null, notaHtml = '';

            if(est && est.grupos && est.grupos.length && notasCurso.length) {
                // Nota ponderada = promedio de notas finales por paciente
                const notasFinales = notasCurso.map(pac => {
                    let suma = 0, pt = 0;
                    est.grupos.forEach(g => {
                        const vals = (pac.notas?.[g.id]||[]).map(v=>parseFloat(v)).filter(v=>!isNaN(v));
                        const pm   = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
                        if(pm!==null){ suma+=pm*(parseFloat(g.peso)||0)/100; pt+=parseFloat(g.peso)||0; }
                    });
                    return pt>0 ? suma*(100/pt) : null;
                }).filter(v=>v!==null);
                const prom = notasFinales.length ? notasFinales.reduce((s,v)=>s+v,0)/notasFinales.length : null;
                notaFinal = prom !== null ? prom.toFixed(2) : null;

                // Detalle visual por paciente
                notaHtml = notasCurso.map(pac => {
                    let s2=0,pt2=0;
                    const grupos = est.grupos.map(g => {
                        const vals=(pac.notas?.[g.id]||[]).map(v=>parseFloat(v)).filter(v=>!isNaN(v));
                        const pm=vals.length?vals.reduce((a,v)=>a+v,0)/vals.length:null;
                        if(pm!==null){s2+=pm*(parseFloat(g.peso)||0)/100;pt2+=parseFloat(g.peso)||0;}
                        const col=pm===null?'#aaa':pm<=10?'#E53935':pm<=13?'#F59E0B':pm<=16?'#2ECC71':'#0288D1';
                        return `<span style="font-size:0.75rem;color:#555;">${g.nombre}:<strong style="color:${col}">${pm!==null?pm.toFixed(1):'-'}</strong>(${g.peso}%)</span>`;
                    }).join(' · ');
                    const nfp=pt2>0?(s2*(100/pt2)):null;
                    const cp=nfp===null?'#888':nfp<=10?'#E53935':nfp<=13?'#F59E0B':nfp<=16?'#2ECC71':'#0288D1';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-bottom:1px solid #f0f2f5;">
                        <div><div style="font-size:0.83rem;font-weight:600;color:var(--primary);">🏥 ${pac.paciente||'—'}</div>
                             <div style="margin-top:2px;">${grupos}</div></div>
                        <div style="font-weight:800;font-size:0.95rem;color:${cp};white-space:nowrap;">${nfp!==null?nfp.toFixed(1):'-'}/20</div>
                    </div>`;
                }).join('');

            } else if(est && est.grupos) {
                notaHtml = '<div style="padding:10px 14px;color:#aaa;font-size:0.85rem;">⏳ Tu docente aún no ha ingresado calificaciones para este curso.</div>';
            } else {
                // Sin estructura: promedio de notas de aprobación de sesiones
                const vals2 = sesiones.filter(s=>s.nota_aprobacion).map(s=>parseFloat(s.nota_aprobacion)).filter(v=>!isNaN(v));
                if(vals2.length) notaFinal = (vals2.reduce((s,v)=>s+v,0)/vals2.length).toFixed(2);
            }

            const nf     = notaFinal !== null ? parseFloat(notaFinal) : null;
            const nfCol  = nf===null?'#888':nf<=10?'#E53935':nf<=13?'#F59E0B':nf<=16?'#2ECC71':'#0288D1';
            const nfBg   = nf===null?'#f0f0f0':nf<=10?'#FECACA':nf<=13?'#FEF3C7':nf<=16?'#D1FAE5':'#DBEAFE';
            const nfLabel= nf===null?'Pendiente':nf<=10?'Desaprobado':nf<=13?'Regular':nf<=16?'Bueno':'Excelente';

            html += `
            <div style="border:1.5px solid #e0e6ed;border-radius:12px;margin-bottom:18px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="background:var(--primary);color:white;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:700;font-size:1rem;">📚 ${curso}</div>
                        <div style="font-size:0.72rem;opacity:0.8;margin-top:2px;">
                            ${sesiones.length} atención(es) · ${aprobadas.length} aprobada(s) · ${pendientes2.length} pendiente(s)
                            ${est?' · '+est.capacidad+' pac. requeridos':''}
                        </div>
                    </div>
                    <div style="text-align:center;background:${nfBg};padding:8px 16px;border-radius:10px;min-width:90px;">
                        <div style="font-size:0.62rem;color:${nfCol};font-weight:700;text-transform:uppercase;margin-bottom:2px;">${nfLabel}</div>
                        <div style="font-size:1.6rem;font-weight:800;color:${nfCol};line-height:1.1;">${nf!==null?nf:'—'}</div>
                        <div style="font-size:0.62rem;color:${nfCol};">/20</div>
                    </div>
                </div>
                ${notaHtml?`<div style="background:#fafbff;">${notaHtml}</div>`:'<div style="padding:12px 18px;color:#999;font-size:0.85rem;">Sin calificaciones aún.</div>'}
                ${sesiones.length?`
                <div style="padding:10px 18px 12px;background:white;border-top:1px solid #f0f2f5;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--primary);margin-bottom:6px;">📋 Mis atenciones:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:5px;">
                        ${sesiones.map(s=>{
                            const ap=s.estado_aprobacion==='aprobado';
                            return '<span style="background:'+(ap?'#D1FAE5':'#FEF3C7')+';color:'+(ap?'#065F46':'#92400E')+';padding:4px 10px;border-radius:8px;font-size:0.73rem;font-weight:600;">'+(s.tipo_atencion==='evaluacion'?'📋':'💪')+' '+(s.paciente||'—')+(s.nota_aprobacion?' · '+s.nota_aprobacion+'/20':'')+'</span>';
                        }).join('')}
                    </div>
                </div>`:''}
            </div>`;
        });

        body.innerHTML = html || '<p style="text-align:center;color:#999;padding:40px 0;">Sin datos de cursos.</p>';
    }

    // ============================================================
    // NOTAS DE ALUMNO — DOCENTE / ADMIN
    // ============================================================

    function abrirModalNotasAlumno() {
        document.getElementById('notas-alumno-buscar').value = '';
        document.getElementById('notas-alumno-chips').innerHTML = '';
        document.getElementById('notas-alumno-body').innerHTML = '<p style="color:#999; text-align:center; padding:30px 0;">Busca y selecciona un alumno.</p>';
        buscarAlumnoNotas('');
        document.getElementById('modalNotasAlumno').style.display = 'block';
    }

    function buscarAlumnoNotas(q) {
        const alumnos  = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
        const filtrados= q.trim()
            ? alumnos.filter(a => a.nombre_completo.toLowerCase().includes(q.toLowerCase()))
            : alumnos;

        const chips = document.getElementById('notas-alumno-chips');
        chips.innerHTML = filtrados.map(a => {
            const tieneNotas = (CENTYR.db.notas_docentes||[]).some(n => n.alumno_nombre === a.nombre_completo);
            return `<button onclick="seleccionarAlumnoParaNotas('${a.usuario}')"
                style="padding:6px 14px; background:white; border:1.5px solid ${tieneNotas?'var(--docente)':'#ddd'}; color:${tieneNotas?'var(--docente)':'#888'}; border-radius:20px; cursor:pointer; font-size:0.82rem; font-weight:600;">
                ${a.nombre_completo} <span style="font-size:0.7rem; color:#aaa;">${a.codigo||''}</span>
            </button>`;
        }).join('') || '<span style="color:#999; font-size:0.82rem;">Sin coincidencias</span>';
    }

    function seleccionarAlumnoParaNotas(usuario) {
        const alumno = CENTYR.db.usuarios.find(u => u.usuario === usuario);
        if(!alumno) return;
        renderNotasAlumnoDetalle(alumno);
    }

    function renderNotasAlumnoDetalle(alumno) {
        const body       = document.getElementById('notas-alumno-body');
        const nombre     = alumno.nombre_completo;
        const usuario    = alumno.usuario;
        const estructuras= CENTYR.db.estructuras_cursos || [];

        const misSesiones = CENTYR.db.pacientes.filter(p => p.atendido_por === nombre);
        const porCurso    = {};
        misSesiones.forEach(s => {
            const c = s.curso || s.categoria || 'Sin curso';
            if(!porCurso[c]) porCurso[c] = [];
            porCurso[c].push(s);
        });

        const todosCursos = new Set([...Object.keys(porCurso), ...estructuras.map(e=>e.curso)]);

        if(todosCursos.size === 0) {
            body.innerHTML = `<p style="text-align:center;color:#999;padding:30px 0;">Sin datos para <strong>${nombre}</strong>.</p>`;
            return;
        }

        const info = `<div style="background:#F0F4FF;border-radius:10px;padding:10px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
                <div style="font-weight:700;color:var(--primary);font-size:1rem;">👨‍🎓 ${nombre}</div>
                <div style="font-size:0.78rem;color:#888;">Código: ${alumno.codigo||'—'} &nbsp;·&nbsp; ${misSesiones.length} sesión(es)</div>
            </div>
            <button onclick="abrirIngresoCursoConAlumno('${alumno.usuario}')"
                    style="padding:7px 14px;background:var(--admin);color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:700;">
                ✏️ Calificar alumno
            </button>
        </div>`;

        let html = info;
        todosCursos.forEach(curso => {
            const est        = estructuras.find(e => e.curso === curso);
            const sesiones   = porCurso[curso] || [];
            const keyAlumno  = `${usuario}::${curso}`;
            const notasCurso = (CENTYR.db.notas_cursos||{})[keyAlumno] || [];

            let nfNum = null, detailHtml = '';

            if(est && est.grupos && est.grupos.length && notasCurso.length) {
                const nfsPac = notasCurso.map(pac => {
                    let s3=0,pt3=0;
                    est.grupos.forEach(g => {
                        const vs=(pac.notas?.[g.id]||[]).map(v=>parseFloat(v)).filter(v=>!isNaN(v));
                        const pm=vs.length?vs.reduce((a,v)=>a+v,0)/vs.length:null;
                        if(pm!==null){s3+=pm*(parseFloat(g.peso)||0)/100;pt3+=parseFloat(g.peso)||0;}
                    });
                    return pt3>0?s3*(100/pt3):null;
                }).filter(v=>v!==null);
                nfNum = nfsPac.length ? nfsPac.reduce((s,v)=>s+v,0)/nfsPac.length : null;

                detailHtml = notasCurso.map(pac => {
                    let s4=0,pt4=0;
                    const ghtml = est.grupos.map(g => {
                        const vs=(pac.notas?.[g.id]||[]).map(v=>parseFloat(v)).filter(v=>!isNaN(v));
                        const pm=vs.length?vs.reduce((a,v)=>a+v,0)/vs.length:null;
                        if(pm!==null){s4+=pm*(parseFloat(g.peso)||0)/100;pt4+=parseFloat(g.peso)||0;}
                        const col=pm===null?'#aaa':pm<=10?'#E53935':pm<=13?'#F59E0B':pm<=16?'#2ECC71':'#0288D1';
                        return `<span style="font-size:0.72rem;color:#555;">${g.nombre}:<strong style="color:${col}">${pm!==null?pm.toFixed(1):'-'}</strong>(${g.peso}%)</span>`;
                    }).join(' · ');
                    const nfp=pt4>0?s4*(100/pt4):null;
                    const cp=nfp===null?'#888':nfp<=10?'#E53935':nfp<=13?'#F59E0B':nfp<=16?'#2ECC71':'#0288D1';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 14px;border-bottom:1px solid #f0f2f5;">
                        <div><div style="font-size:0.82rem;font-weight:600;color:var(--primary);">🏥 ${pac.paciente||'—'}</div><div style="margin-top:1px;">${ghtml}</div></div>
                        <div style="font-weight:800;font-size:0.92rem;color:${cp};white-space:nowrap;">${nfp!==null?nfp.toFixed(1):'-'}/20</div>
                    </div>`;
                }).join('');
            } else if(est && est.grupos) {
                detailHtml = '<div style="padding:10px 14px;color:#bbb;font-size:0.82rem;">⏳ Sin calificaciones ingresadas.</div>';
            }

            const nfCol = nfNum===null?'#888':nfNum<=10?'#E53935':nfNum<=13?'#F59E0B':nfNum<=16?'#2ECC71':'#0288D1';
            const nfBg  = nfNum===null?'#f0f0f0':nfNum<=10?'#FECACA':nfNum<=13?'#FEF3C7':nfNum<=16?'#D1FAE5':'#DBEAFE';

            html += `
            <div style="border:1.5px solid #e0e6ed;border-radius:12px;margin-bottom:14px;overflow:hidden;">
                <div style="background:var(--primary);color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div>
                        <div style="font-weight:700;">📚 ${curso}</div>
                        <div style="font-size:0.72rem;opacity:0.8;">${sesiones.length} sesión(es) &nbsp;·&nbsp; ${notasCurso.length} pac. calificado(s)</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="background:${nfBg};color:${nfCol};padding:5px 12px;border-radius:8px;font-weight:800;font-size:1rem;text-align:center;">
                            ${nfNum!==null?nfNum.toFixed(2):'—'}<span style="font-size:0.65rem;">/20</span>
                        </div>
                        <button onclick="abrirIngresoCursoConAlumno2('${curso}','${usuario}')"
                                style="padding:4px 10px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:700;">✏️</button>
                    </div>
                </div>
                ${detailHtml||'<div style="padding:10px 16px;color:#999;font-size:0.82rem;">Sin notas registradas.</div>'}
                ${sesiones.length?`<div style="padding:8px 16px 10px;background:white;border-top:1px solid #f0f2f5;">
                    <div style="font-size:0.72rem;font-weight:700;color:var(--primary);margin-bottom:4px;">Atenciones:</div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${sesiones.map(s=>{const ap=s.estado_aprobacion==='aprobado';return '<span style="background:'+(ap?'#D1FAE5':'#FEF3C7')+';color:'+(ap?'#065F46':'#92400E')+';padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;">'+(s.tipo_atencion==='evaluacion'?'📋':'💪')+' '+(s.paciente||'—')+(s.nota_aprobacion?' · '+s.nota_aprobacion+'/20':'')+'</span>';}).join('')}
                    </div>
                </div>`:''}
            </div>`;
        });
        body.innerHTML = html;
    }

    // Helper: abrir modal cursos preseleccionando alumno


    // ── Registro ─────────────────────────────────────────────────────────────
    const _fns = { abrirModalMisNotas, renderMisNotas, abrirModalNotasAlumno, buscarAlumnoNotas, seleccionarAlumnoParaNotas, renderNotasAlumnoDetalle };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test['alumno'] = function() {
        console.group('🧪 centyr-alumno tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }
        assert('CENTYR.fn.abrirModalMisNotas registrado', typeof CENTYR.fn.abrirModalMisNotas === 'function');
        assert('CENTYR.fn.renderMisNotas registrado', typeof CENTYR.fn.renderMisNotas === 'function');
        assert('CENTYR.fn.abrirModalNotasAlumno registrado', typeof CENTYR.fn.abrirModalNotasAlumno === 'function');
        assert('CENTYR.fn.buscarAlumnoNotas registrado', typeof CENTYR.fn.buscarAlumnoNotas === 'function');
        assert('CENTYR.fn.seleccionarAlumnoParaNotas registrado', typeof CENTYR.fn.seleccionarAlumnoParaNotas === 'function');
        assert('CENTYR.fn.renderNotasAlumnoDetalle registrado', typeof CENTYR.fn.renderNotasAlumnoDetalle === 'function');

        assert('funciones de alumno accesibles', ['abrirModalMisNotas','renderMisNotas','abrirModalNotasAlumno'].every(f=>typeof CENTYR.fn[f]==='function'));
        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-alumno.js cargado');
})();
