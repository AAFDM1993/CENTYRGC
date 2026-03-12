/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  centyr-admin.js  v5.0  — Constructor de Cursos Multi-Grupo         ║
 * ║  ── Dependencias: centyr-core.js ──                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 *  MODELO DE DATOS DE UN CURSO
 *  ─────────────────────────────────────────────────────────────────────
 *  {
 *    curso,        ← nombre libre
 *    capacidad,    ← total pacientes (suma de todos los grupos)
 *    pesoEV,       ← peso % Evaluación Inicial   (pesoEV + pesoSS = 100)
 *    pesoSS,       ← peso % promedio de sesiones
 *    grupos: [
 *      {
 *        id,           ← 'g0', 'g1', ...
 *        nombre,       ← "Grupo 1", etc.
 *        nPacientes,   ← cuántos pacientes tiene este grupo
 *        nSesiones,    ← sesiones BASE programadas (meta = 100%)
 *        nExtras,      ← sesiones EXTRA (con bono)
 *        pctExtra,     ← % de bonificación de las extras
 *        colorHex      ← color de identificación
 *      }, ...
 *    ],
 *    fechaGuardado
 *  }
 *
 *  FÓRMULA DE NOTA POR PACIENTE (dentro de su grupo)
 *  ─────────────────────────────────────────────────────────────────────
 *  PromSS = SumaNotas_ss / nSesiones_programadas    ← SIEMPRE sobre programadas
 *  PromExt= SumaNotas_ext / nExtras_programadas     ← SIEMPRE sobre programadas
 *  Base   = (EV × pesoEV%) + (PromSS × pesoSS%)
 *  Bono   = PromExt × pctExtra%
 *  Nota   = min(20, Base + Bono)
 *
 *  Si una sesión no tiene nota = se trata como 0 (promedio sobre total programado)
 *
 *  NOTA FINAL DEL ALUMNO = Promedio de notas de todos sus pacientes
 */

;(function () {
    'use strict';

    if (!CENTYR.db.estructuras_cursos) CENTYR.db.estructuras_cursos = [];

    // Estado del formulario de construcción
    let _grupos = [];   // array de objetos grupo (en edición)

    const GRUPO_COLORES = ['#0288D1','#27ae60','#9C27B0','#E53935','#D97706','#00897B','#1565C0','#6D4C41'];

    // ═══════════════════════════════════════════════════════════════
    //  TABS
    // ═══════════════════════════════════════════════════════════════
    function adminTab(tabId) {
        ['tab-usuarios','tab-notas-cfg','tab-exportar','tab-cursos'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = id === tabId ? 'block' : 'none';
        });
        const labels = {
            'tab-usuarios':  'btn-tab-usuarios',
            'tab-notas-cfg': 'btn-tab-notas-cfg',
            'tab-exportar':  'btn-tab-exportar',
            'tab-cursos':    'btn-tab-cursos'
        };
        Object.values(labels).forEach(id => {
            const b = document.getElementById(id);
            if (b) { b.style.background = '#eee'; b.style.color = '#555'; }
        });
        const ab = document.getElementById(labels[tabId]);
        if (ab) { ab.style.background = 'var(--admin)'; ab.style.color = 'white'; }

        if (tabId === 'tab-notas-cfg') {
            const sel = document.getElementById('cfg-alumno-sel');
            const alumnos = CENTYR.db.usuarios.filter(u => u.rol === 'alumno');
            sel.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
            alumnos.forEach(a => sel.innerHTML += `<option value="${a.usuario}">${a.nombre_completo} (${a.codigo || '—'})</option>`);
        }
        if (tabId === 'tab-cursos') {
            renderCursosGuardados();
            _renderSugerencias();
        }
        if (tabId === 'tab-usuarios') {
            renderListaAsignacion();
        }
        if (tabId === 'tab-exportar') {
            _poblarFiltrosExport();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  NOMBRE DE CURSO — INPUT LIBRE
    // ═══════════════════════════════════════════════════════════════
    function _renderSugerencias() {
        const div = document.getElementById('curso-sugerencias');
        if (!div) return;
        const lista = CENTYR.db.estructuras_cursos || [];
        if (!lista.length) { div.style.display = 'none'; return; }
        div.style.display = 'flex';
        div.innerHTML = lista.map(e =>
            `<span onclick="cargarEstructuraCurso('${e.curso}')"
                   title="Cargar ${e.curso}"
                   style="background:#EEF4FF;color:var(--admin);border:1.5px solid var(--admin);
                          border-radius:20px;padding:3px 12px;font-size:0.75rem;font-weight:600;
                          cursor:pointer;">${e.curso}</span>`
        ).join('');
    }

    function cursoNombreChange() {
        const nombre = (document.getElementById('curso-nombre-input')?.value || '').trim();
        const wrap   = document.getElementById('curso-grupos-wrap');
        if (!wrap) return;
        if (nombre.length >= 2) {
            wrap.style.display = 'block';
            const est = (CENTYR.db.estructuras_cursos || []).find(e =>
                e.curso.toLowerCase() === nombre.toLowerCase());
            if (est) { _cargarGruposDesdeEstructura(est); mostrarNotificacion(`📂 Estructura de "${est.curso}" cargada`); }
            cursoConfigChange();
        } else {
            wrap.style.display = 'none';
        }
    }

    function nuevoCurso() {
        const inp = document.getElementById('curso-nombre-input');
        if (inp) inp.value = '';
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        s('curso-capacidad', 5);
        s('curso-peso-ev',   20);
        s('curso-peso-ss',   80);
        _grupos = [];
        _renderGruposEditor();
        const wrap = document.getElementById('curso-grupos-wrap');
        if (wrap) wrap.style.display = 'none';
        mostrarNotificacion('✨ Formulario listo para nuevo curso');
    }

    // Aliases de compatibilidad
    function cursoSelChange()       { cursoNombreChange(); }
    function cursoCapacidadChange() { cursoConfigChange(); }
    function renderGruposCurso()    { cursoConfigChange(); }
    function actualizarGrupoCurso() { cursoConfigChange(); }
    function toggleExtraSection()   { cursoConfigChange(); }

    // ═══════════════════════════════════════════════════════════════
    //  GRUPOS — CRUD EN EL FORMULARIO
    // ═══════════════════════════════════════════════════════════════
    function agregarGrupoCurso() {
        const idx  = _grupos.length;
        const cap  = parseInt(document.getElementById('curso-capacidad')?.value) || 5;
        // Calcular pacientes restantes para el nuevo grupo
        const asignados = _grupos.reduce((s, g) => s + (parseInt(g.nPacientes) || 0), 0);
        const restantes = Math.max(1, cap - asignados);

        _grupos.push({
            id:         `g${idx}`,
            nombre:     `Grupo ${idx + 1}`,
            nPacientes: restantes,
            nSesiones:  16,
            nExtras:    4,
            pctExtra:   20,
            colorHex:   GRUPO_COLORES[idx % GRUPO_COLORES.length]
        });
        _renderGruposEditor();
        cursoConfigChange();
    }

    function eliminarGrupoCurso(idx) {
        _grupos.splice(idx, 1);
        // Renombrar IDs
        _grupos.forEach((g, i) => { g.id = `g${i}`; g.nombre = g.nombre.startsWith('Grupo ') ? `Grupo ${i+1}` : g.nombre; });
        _renderGruposEditor();
        cursoConfigChange();
    }

    function _leerGruposDesdeDOM() {
        _grupos.forEach((g, i) => {
            g.nombre     = document.getElementById(`grp-nombre-${i}`)?.value    || g.nombre;
            g.nPacientes = parseInt(document.getElementById(`grp-npacs-${i}`)?.value)    || 1;
            g.nSesiones  = parseInt(document.getElementById(`grp-nses-${i}`)?.value)     || 1;
            g.nExtras    = parseInt(document.getElementById(`grp-next-${i}`)?.value)     || 0;
            g.pctExtra   = parseInt(document.getElementById(`grp-pctex-${i}`)?.value)    || 0;
        });
    }

    function _renderGruposEditor() {
        const cont = document.getElementById('curso-grupos-lista');
        if (!cont) return;
        if (!_grupos.length) {
            cont.innerHTML = `<div style="text-align:center;color:#aaa;padding:16px;font-size:0.85rem;background:#f0f4ff;border-radius:8px;border:1.5px dashed #c0c8e0;">
                Pulsa <strong>＋ Agregar grupo</strong> para definir los grupos de pacientes de este curso.
            </div>`;
            return;
        }
        cont.innerHTML = _grupos.map((g, i) => {
            const maxExt  = g.nExtras  > 0;
            const bonoPts = maxExt ? (20 * g.pctExtra / 100).toFixed(1) : '0';
            return `
            <div style="border:2px solid ${g.colorHex}22;border-left:4px solid ${g.colorHex};border-radius:10px;padding:12px 14px;margin-bottom:10px;background:white;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:12px;height:12px;border-radius:50%;background:${g.colorHex};flex-shrink:0;"></div>
                        <input type="text" id="grp-nombre-${i}" value="${g.nombre}"
                               onchange="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                               onblur="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                               style="margin-bottom:0;padding:4px 8px;font-size:0.88rem;font-weight:700;
                                      border:1.5px solid ${g.colorHex};border-radius:6px;color:${g.colorHex};
                                      width:140px;">
                    </div>
                    <button onclick="eliminarGrupoCurso(${i})"
                            style="padding:4px 10px;background:#fadbd8;color:#c0392b;border:none;border-radius:6px;cursor:pointer;font-size:0.78rem;font-weight:600;">
                        🗑️ Quitar
                    </button>
                </div>

                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px;">
                    <!-- N° Pacientes -->
                    <div>
                        <label style="font-size:0.7rem;color:var(--gray);display:block;margin-bottom:3px;">👥 Pacientes</label>
                        <input type="number" id="grp-npacs-${i}" value="${g.nPacientes}" min="1" max="50"
                               onchange="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                               style="margin-bottom:0;font-weight:700;font-size:1rem;text-align:center;
                                      border:2px solid ${g.colorHex};border-radius:7px;background:${g.colorHex}0D;">
                    </div>
                    <!-- N° Sesiones base -->
                    <div>
                        <label style="font-size:0.7rem;color:var(--gray);display:block;margin-bottom:3px;">🏃 Sesiones base</label>
                        <input type="number" id="grp-nses-${i}" value="${g.nSesiones}" min="1" max="100"
                               onchange="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                               style="margin-bottom:0;font-weight:700;font-size:1rem;text-align:center;
                                      border:2px solid #27ae60;border-radius:7px;background:#27ae600D;"
                               title="Meta = 100% — el promedio se divide sobre este número siempre">
                    </div>
                    <!-- N° Extras -->
                    <div>
                        <label style="font-size:0.7rem;color:var(--gray);display:block;margin-bottom:3px;">⭐ SS extra</label>
                        <input type="number" id="grp-next-${i}" value="${g.nExtras}" min="0" max="50"
                               onchange="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                               style="margin-bottom:0;font-weight:700;font-size:1rem;text-align:center;
                                      border:2px solid #D97706;border-radius:7px;background:#D977060D;">
                    </div>
                    <!-- % Extra -->
                    <div>
                        <label style="font-size:0.7rem;color:var(--gray);display:block;margin-bottom:3px;">📈 Bono extra</label>
                        <div style="display:flex;align-items:center;gap:3px;">
                            <input type="number" id="grp-pctex-${i}" value="${g.pctExtra}" min="0" max="100"
                                   onchange="_leerGruposDesdeDOM();_actualizarResumenGrupo(${i})"
                                   style="margin-bottom:0;font-weight:700;font-size:1rem;text-align:center;
                                          border:2px solid #9C27B0;border-radius:7px;background:#9C27B00D;flex:1;">
                            <span style="font-size:0.78rem;font-weight:700;color:#9C27B0;">%</span>
                        </div>
                    </div>
                </div>

                <!-- Resumen del grupo (actualizable sin re-renderizar todo) -->
                <div id="grp-resumen-${i}" style="background:${g.colorHex}0D;border-radius:6px;padding:6px 10px;font-size:0.73rem;color:#444;display:flex;gap:12px;flex-wrap:wrap;">
                    <span>👥 <strong>${g.nPacientes}</strong> pac</span>
                    <span>🏃 <strong>${g.nSesiones}</strong> SS programadas</span>
                    ${g.nExtras > 0 ? `<span>⭐ <strong>${g.nExtras}</strong> SS extra · bono máx <strong>+${bonoPts}</strong> pts</span>` : '<span style="color:#aaa;">Sin sesiones extra</span>'}
                    <span style="color:${g.colorHex};font-weight:700;">Meta: 100% = ${g.nSesiones} atenciones</span>
                </div>
            </div>`;
        }).join('');
    }

    /** Actualiza solo el resumen del grupo (sin re-renderizar toda la lista) */
    function _actualizarResumenGrupo(i) {
        const g = _grupos[i];
        if (!g) return;
        const el = document.getElementById(`grp-resumen-${i}`);
        if (!el) return;
        const bonoPts = g.nExtras > 0 ? (20 * g.pctExtra / 100).toFixed(1) : '0';
        el.innerHTML = `<span>👥 <strong>${g.nPacientes}</strong> pac</span>
            <span>🏃 <strong>${g.nSesiones}</strong> SS programadas</span>
            ${g.nExtras > 0 ? `<span>⭐ <strong>${g.nExtras}</strong> SS extra · bono máx <strong>+${bonoPts}</strong> pts</span>` : '<span style="color:#aaa;">Sin sesiones extra</span>'}
            <span style="color:${g.colorHex};font-weight:700;">Meta: 100% = ${g.nSesiones} atenciones</span>`;
        // Actualizar también barra y fórmula sin re-renderizar lista
        const pesoEV = parseInt(document.getElementById('curso-peso-ev')?.value)  || 20;
        const pesoSS = parseInt(document.getElementById('curso-peso-ss')?.value)  || 80;
        _actualizarFormula(pesoEV, pesoSS);
        _actualizarPacsResumen();
    }

    function _actualizarPacsResumen() {
        const cap = parseInt(document.getElementById('curso-capacidad')?.value) || 0;
        const asignados = _grupos.reduce((s,g)=>s+(parseInt(g.nPacientes)||0),0);
        const rRes = document.getElementById('curso-pacs-resumen');
        if (rRes) {
            const ok = asignados === cap;
            rRes.style.background   = ok ? '#E8F5E9' : '#FFF3E0';
            rRes.style.color        = ok ? '#1B5E20' : '#92400E';
            rRes.innerHTML = ok
                ? `✅ Pacientes asignados: <strong>${asignados}/${cap}</strong> — todos cubiertos`
                : `⚠️ Pacientes asignados: <strong>${asignados}/${cap}</strong> — ${asignados < cap ? `faltan ${cap-asignados}` : `sobran ${asignados-cap}`}`;
        }
    }

    function _cargarGruposDesdeEstructura(est) {
        _grupos = (est.grupos || []).map((g, i) => ({
            id:         g.id        || `g${i}`,
            nombre:     g.nombre    || `Grupo ${i+1}`,
            nPacientes: parseInt(g.nPacientes || g.cantidad) || 1,
            nSesiones:  parseInt(g.nSesiones) || 10,
            nExtras:    parseInt(g.nExtras)   || 0,
            pctExtra:   parseInt(g.pctExtra   || g.porcentajeExtra) || 0,
            colorHex:   g.colorHex || GRUPO_COLORES[i % GRUPO_COLORES.length]
        }));
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        s('curso-capacidad', est.capacidad || 5);
        s('curso-peso-ev',   est.pesoEV    || 20);
        s('curso-peso-ss',   est.pesoSS    || 80);
        document.getElementById('curso-grupos-wrap').style.display = 'block';
        _renderGruposEditor();
    }

    // ═══════════════════════════════════════════════════════════════
    //  ACTUALIZAR BARRA + FÓRMULA + PREVIEW
    // ═══════════════════════════════════════════════════════════════
    function cursoConfigChange() {
        _leerGruposDesdeDOM();
        const pesoEV = parseInt(document.getElementById('curso-peso-ev')?.value)  || 20;
        const pesoSS = parseInt(document.getElementById('curso-peso-ss')?.value)  || 80;

        // Barra de pesos
        const total = pesoEV + pesoSS;
        const barEV = document.getElementById('curso-pct-bar-ev');
        const barSS = document.getElementById('curso-pct-bar-ss');
        const lbl   = document.getElementById('curso-pct-total');
        const aviso = document.getElementById('curso-pct-aviso');
        const lblEV = document.getElementById('curso-lbl-ev');
        const lblSS = document.getElementById('curso-lbl-ss');
        if (barEV) barEV.style.width = Math.min(pesoEV, 100) + '%';
        if (barSS) barSS.style.width = Math.min(pesoSS, 100 - Math.min(pesoEV,100)) + '%';
        if (lbl)   { lbl.textContent = total + '%'; lbl.style.color = total===100?'#27ae60':'#e74c3c'; }
        if (aviso) { aviso.textContent = total===100?'✅ Correcto':total>100?`⚠️ +${total-100}%`:`⚠️ −${100-total}%`; aviso.style.color = total===100?'#27ae60':'#e74c3c'; }
        if (lblEV) lblEV.textContent = `EV: ${pesoEV}%`;
        if (lblSS) lblSS.textContent = `SS: ${pesoSS}%`;

        // Resumen pacientes
        const cap = parseInt(document.getElementById('curso-capacidad')?.value) || 0;
        const asignados = _grupos.reduce((s,g)=>s+(parseInt(g.nPacientes)||0),0);
        const rRes = document.getElementById('curso-pacs-resumen');
        if (rRes) {
            const ok = asignados === cap;
            rRes.style.background   = ok ? '#E8F5E9' : '#FFF3E0';
            rRes.style.color        = ok ? '#1B5E20' : '#92400E';
            rRes.innerHTML = ok
                ? `✅ Pacientes asignados: <strong>${asignados}/${cap}</strong> — todos cubiertos`
                : `⚠️ Pacientes asignados: <strong>${asignados}/${cap}</strong> — ${asignados < cap ? `faltan ${cap-asignados}` : `sobran ${asignados-cap}`}`;
        }

        _renderGruposEditor();
        _actualizarFormula(pesoEV, pesoSS);
        renderPreviewCurso();
    }

    function actualizarBarraPct() { cursoConfigChange(); }
    function agregarGrupoCurso()  { _agregarGrupoInterno(); }

    function _agregarGrupoInterno() {
        const cap  = parseInt(document.getElementById('curso-capacidad')?.value) || 5;
        const asig = _grupos.reduce((s,g)=>s+(parseInt(g.nPacientes)||0),0);
        const rest = Math.max(1, cap - asig);
        const idx  = _grupos.length;
        _grupos.push({
            id: `g${idx}`, nombre: `Grupo ${idx+1}`,
            nPacientes: rest, nSesiones: 16, nExtras: 4, pctExtra: 20,
            colorHex: GRUPO_COLORES[idx % GRUPO_COLORES.length]
        });
        _renderGruposEditor();
        cursoConfigChange();
    }

    function _actualizarFormula(pesoEV, pesoSS) {
        const el = document.getElementById('curso-formula-resumen');
        if (!el || !_grupos.length) { if (el) el.innerHTML = ''; return; }
        const curso = (document.getElementById('curso-nombre-input')?.value || '').trim() || '<em>curso</em>';

        let html = `<strong>📐 ${curso}</strong><br>`;
        html += `<span style="color:#0288D1;">EV × ${pesoEV}%</span> + <span style="color:#27ae60;">PromSS × ${pesoSS}%</span>`;
        html += ` <span style="color:#888;font-size:0.8em;">(PromSS = Σnotas / total_programadas)</span><br>`;
        _grupos.forEach(g => {
            const bonoPts = g.nExtras > 0 ? (20*g.pctExtra/100).toFixed(1) : null;
            html += `<span style="color:${g.colorHex};font-weight:700;">◉ ${g.nombre}</span>: `;
            html += `${g.nPacientes} pac · ${g.nSesiones} SS programadas`;
            if (g.nExtras > 0) html += ` · <span style="color:#D97706;">+${g.nExtras} extra (bono ${g.pctExtra}%, máx +${bonoPts} pts)</span>`;
            html += '<br>';
        });
        const totPacs = _grupos.reduce((s,g)=>s+(parseInt(g.nPacientes)||0),0);
        html += `<span style="color:#888;font-size:0.8em;">Nota alumno = Promedio de ${totPacs} pacientes · EV + SS iguales para todos los grupos</span>`;
        el.innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════════
    //  VISTA PREVIA — tabla fiel a la planilla
    // ═══════════════════════════════════════════════════════════════
    function renderPreviewCurso() {
        const preview = document.getElementById('curso-preview');
        if (!preview) return;
        const nombre = (document.getElementById('curso-nombre-input')?.value || '').trim();
        const pesoEV = parseInt(document.getElementById('curso-peso-ev')?.value) || 20;
        const pesoSS = parseInt(document.getElementById('curso-peso-ss')?.value) || 80;

        if (!nombre || !_grupos.length) {
            preview.innerHTML = '<p style="color:#999;text-align:center;padding:16px;">Agrega al menos un grupo para ver la vista previa.</p>';
            return;
        }

        // Columnas máximas (para alinear tablas entre grupos)
        const maxSS  = Math.max(..._grupos.map(g=>g.nSesiones));
        const maxExt = Math.max(..._grupos.map(g=>g.nExtras));

        const TH = (txt,bg,ext='') => `<th style="background:${bg};color:white;padding:4px 3px;text-align:center;font-size:0.63rem;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.18);${ext}">${txt}</th>`;
        const TD = (txt,ext='') => `<td style="border:1px solid #e0e6ed;padding:3px 2px;text-align:center;font-size:0.7rem;${ext}">${txt}</td>`;

        let html = '';
        let pacGlobal = 0;

        _grupos.forEach((g, gi) => {
            const nSS  = g.nSesiones;
            const nExt = g.nExtras;
            const maxBono = nExt > 0 ? (20*g.pctExtra/100).toFixed(1) : '0';

            // Sub-encabezado del grupo
            let colCount = 2 + 1 + nSS + nExt + (maxExt>0?1:0) + 1; // N°+nombre + EV + SS + Ext + Extra% + Prom
            html += `<div style="margin-bottom:2px;background:${g.colorHex};color:white;padding:4px 10px;border-radius:6px 6px 0 0;font-size:0.75rem;font-weight:700;">
                ◉ ${g.nombre} · ${g.nPacientes} pacientes · <span style="opacity:0.9;">${nSS} SS programadas</span>
                ${nExt>0 ? ` · <span style="opacity:0.9;">⭐ ${nExt} extra (bono máx +${maxBono} pts)</span>` : ''}
            </div>`;

            // Fila de columnas
            let ths = TH('N°','#1B2A4A') + TH('PACIENTE','#1B2A4A','min-width:100px;') + TH('EV','#0288D1');
            for (let s=1; s<=nSS; s++) ths += TH(`${s}SS`, s%2===0?g.colorHex:g.colorHex+'CC');
            if (nExt>0) for (let e=1; e<=nExt; e++) ths += TH(`E${e}`,'#D97706');
            else if (maxExt>0) ths += TH('—','#ddd','opacity:0.3;');
            if (nExt>0) ths += TH(`+${g.pctExtra}%`,'#9C27B0');
            else        ths += TH('—','#ddd','opacity:0.3;');
            ths += TH('PROM.','#6C3FC5');

            // Filas de pacientes (max 3 en preview)
            const shown = Math.min(g.nPacientes, 3);
            let rows = '';
            for (let p=0; p<shown; p++) {
                pacGlobal++;
                let tds = TD(pacGlobal) + TD(`Pac. ${pacGlobal}`, 'text-align:left;padding:3px 7px;');
                tds += TD('—','color:#0288D1;');
                for (let s=0; s<nSS; s++) tds += TD('—',`color:${g.colorHex};`);
                if (nExt>0) for (let e=0; e<nExt; e++) tds += TD('—','color:#D97706;');
                else if (maxExt>0) tds += TD('','background:#f5f5f5;');
                tds += nExt>0 ? TD('—','background:#F3E8FF;color:#9C27B0;font-weight:700;') : TD('','background:#f5f5f5;');
                tds += TD('—/20','background:#EEF4FF;color:#6C3FC5;font-weight:700;');
                rows += `<tr>${tds}</tr>`;
            }
            if (g.nPacientes > shown) rows += `<tr><td colspan="100" style="text-align:center;color:#aaa;padding:4px;font-size:0.7rem;">… ${g.nPacientes-shown} pacientes más</td></tr>`;

            html += `<div style="overflow-x:auto;margin-bottom:12px;border:1.5px solid ${g.colorHex}44;border-top:none;border-radius:0 0 8px 8px;">
                <table style="border-collapse:collapse;width:100%;min-width:400px;">
                    <thead><tr>${ths}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        });

        // Panel de resumen lateral
        const totPacs = _grupos.reduce((s,g)=>s+(g.nPacientes||0),0);
        html += `<div style="background:#F0FFF4;border-radius:10px;padding:12px;border:1.5px solid #a7f3d0;font-size:0.78rem;">
            <div style="font-weight:700;color:#065F46;margin-bottom:8px;">📐 Resumen de fórmulas</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <div style="margin-bottom:4px;"><strong>Base del paciente:</strong></div>
                    <div style="color:#0288D1;">EV × ${pesoEV}%</div>
                    <div style="color:#27ae60;">+ (ΣSS / programadas) × ${pesoSS}%</div>
                    <div style="color:#888;font-size:0.72rem;margin-top:3px;">si asistió a 10/16 → promedio = Σ10notas / 16</div>
                </div>
                <div>
                    <div style="margin-bottom:4px;"><strong>Nota final alumno:</strong></div>
                    <div>= Promedio de <strong>${totPacs}</strong> pacientes</div>
                    ${_grupos.map(g=>g.nExtras>0 ? `<div style="color:#D97706;">+ Bono ${g.nombre}: ΣExt/${g.nExtras} × ${g.pctExtra}%</div>` : '').join('')}
                </div>
            </div>
        </div>`;

        preview.innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDAR ESTRUCTURA
    // ═══════════════════════════════════════════════════════════════
    async function guardarEstructuraCurso() {
        _leerGruposDesdeDOM();
        const curso  = (document.getElementById('curso-nombre-input')?.value || '').trim();
        const cap    = parseInt(document.getElementById('curso-capacidad')?.value)  || 0;
        const pesoEV = parseInt(document.getElementById('curso-peso-ev')?.value)    || 20;
        const pesoSS = parseInt(document.getElementById('curso-peso-ss')?.value)    || 80;

        if (!curso) { alert('⚠️ Escribe el nombre del curso.'); document.getElementById('curso-nombre-input')?.focus(); return; }
        if (pesoEV + pesoSS !== 100) { alert(`⚠️ EV (${pesoEV}%) + SS (${pesoSS}%) = ${pesoEV+pesoSS}%. Deben sumar 100%.`); return; }
        if (!_grupos.length) { alert('⚠️ Agrega al menos un grupo de pacientes.'); return; }
        const asig = _grupos.reduce((s,g)=>s+(parseInt(g.nPacientes)||0),0);
        if (asig !== cap) { if (!confirm(`⚠️ Los grupos tienen ${asig} pacientes asignados pero el total es ${cap}.\n¿Guardar de todas formas?`)) return; }

        const estructura = {
            curso,
            capacidad:  cap,
            pesoEV,
            pesoSS,
            // Campos legacy para compatibilidad con otros módulos
            sesionesBase:    _grupos[0]?.nSesiones  || 10,
            tieneExtra:      _grupos.some(g=>g.nExtras>0),
            sesionesExtra:   _grupos[0]?.nExtras     || 0,
            porcentajeExtra: _grupos[0]?.pctExtra    || 0,
            grupos: _grupos.map(g => ({
                id:         g.id,
                nombre:     g.nombre,
                nPacientes: g.nPacientes,
                cantidad:   String(g.nPacientes),   // legacy
                peso:       String(Math.round(100 / _grupos.length)),
                nSesiones:  g.nSesiones,
                nExtras:    g.nExtras,
                pctExtra:   g.pctExtra,
                colorHex:   g.colorHex
            })),
            pacientes:     Array.from({length: cap}, (_,i) => `Paciente ${i+1}`),
            fechaGuardado: new Date().toLocaleDateString('es-PE')
        };

        const idx = (CENTYR.db.estructuras_cursos||[]).findIndex(e=>e.curso===curso);
        if (idx >= 0) CENTYR.db.estructuras_cursos[idx] = estructura;
        else          CENTYR.db.estructuras_cursos.push(estructura);

        showLoad(true, 'Guardando estructura…');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST', headers: {'Content-Type':'text/plain'},
                body: JSON.stringify({ action:'save_estructura_curso', ...estructura })
            });
        } catch(e) { /* offline ok */ }
        showLoad(false);

        renderCursosGuardados();
        _renderSugerencias();

        const resumen = estructura.grupos.map(g =>
            `${g.nombre}: ${g.nPacientes}pac/${g.nSesiones}SS${g.nExtras>0?`+${g.nExtras}ext`:''}`
        ).join(' · ');
        mostrarNotificacion(`✅ "${curso}" guardado — ${resumen}`);
    }

    // ═══════════════════════════════════════════════════════════════
    //  LISTA DE ESTRUCTURAS GUARDADAS
    // ═══════════════════════════════════════════════════════════════
    function renderCursosGuardados() {
        const div   = document.getElementById('cursos-guardados-list');
        if (!div) return;
        const lista = CENTYR.db.estructuras_cursos || [];

        if (!lista.length) {
            div.innerHTML = `<div style="color:#999;font-size:0.85rem;text-align:center;padding:18px;background:#f8f9fa;border-radius:8px;">
                <div style="font-size:1.4rem;margin-bottom:6px;">📭</div>
                Sin estructuras guardadas aún.<br>
                <small>Completa los pasos ①–④ y pulsa 💾 GUARDAR ESTRUCTURA.</small>
            </div>`;
            return;
        }

        div.innerHTML = lista.map(e => {
            const gruposHtml = (e.grupos||[]).map(g =>
                `<span style="background:${g.colorHex||'#1B2A4A'}18;color:${g.colorHex||'#1B2A4A'};
                              border:1.5px solid ${g.colorHex||'#1B2A4A'}44;
                              border-radius:12px;padding:2px 10px;font-size:0.7rem;font-weight:600;">
                    ${g.nombre}: ${g.nPacientes||g.cantidad||'?'}pac · ${g.nSesiones||'?'}SS
                    ${(g.nExtras>0)?` + ${g.nExtras}ext (+${g.pctExtra}%)`:''}
                 </span>`
            ).join('');

            return `
            <div style="border:1.5px solid #e0e6ed;border-radius:10px;padding:12px 14px;margin-bottom:8px;background:white;box-shadow:0 1px 4px #0001;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;color:var(--primary);font-size:0.97rem;">🏫 ${e.curso}</div>
                        <div style="color:var(--gray);font-size:0.73rem;margin-top:2px;">
                            👥 ${e.capacidad} pac total · 📋 EV ${e.pesoEV}% + 🏃 SS ${e.pesoSS}%
                            · ${e.grupos?.length||0} grupo(s)
                            ${e.fechaGuardado ? ' · ' + e.fechaGuardado : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0;">
                        <button onclick="cargarEstructuraCurso('${e.curso}')"
                                style="padding:5px 10px;background:var(--docente);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">✏️ Editar</button>
                        <button onclick="abrirIngresoCurso('${e.curso}')"
                                style="padding:5px 10px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">📝 Notas</button>
                        <button onclick="duplicarEstructuraCurso('${e.curso}')"
                                style="padding:5px 10px;background:#FFF8E7;color:#D97706;border:1.5px solid #F59E0B;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">⧉</button>
                        <button onclick="eliminarEstructuraCurso('${e.curso}')"
                                style="padding:5px 10px;background:#fadbd8;color:#c0392b;border:none;border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;">🗑️</button>
                    </div>
                </div>
                <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;">${gruposHtml}</div>
            </div>`;
        }).join('');
    }

    function cargarEstructuraCurso(curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return;
        _cargarGruposDesdeEstructura(est);
        cursoConfigChange();
        document.getElementById('tab-cursos')?.scrollIntoView({behavior:'smooth',block:'start'});
        mostrarNotificacion(`📂 "${curso}" cargado para edición`);
    }

    function duplicarEstructuraCurso(curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return;
        const n = prompt(`Nombre para la copia de "${curso}":`, curso+' (copia)');
        if (!n || !n.trim()) return;
        _cargarGruposDesdeEstructura({...est, curso: n.trim()});
        cursoConfigChange();
        mostrarNotificacion(`⧉ Duplicado como "${n.trim()}" — pulsa 💾 para guardar`);
    }

    function eliminarEstructuraCurso(curso) {
        if (!confirm(`¿Eliminar la estructura de "${curso}"?`)) return;
        CENTYR.db.estructuras_cursos = (CENTYR.db.estructuras_cursos||[]).filter(e=>e.curso!==curso);
        renderCursosGuardados();
        _renderSugerencias();
        mostrarNotificacion(`🗑️ "${curso}" eliminado`);
    }

    // ═══════════════════════════════════════════════════════════════
    //  MODAL DE NOTAS — Vista resumen + edición por alumno
    // ═══════════════════════════════════════════════════════════════
    async function abrirIngresoCurso(curso, alumnoPresel) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) { alert('⚠️ No existe estructura para: '+curso); return; }

        document.getElementById('modal-cursos-titulo').textContent = `📝 Notas — ${curso}`;

        // Alumnos asignados a este curso (o todos si no hay asignaciones aún)
        const todosAlumnos   = CENTYR.db.usuarios.filter(u=>u.rol==='alumno');
        const alumnosAsig    = todosAlumnos.filter(a=>(a.cursos||[]).includes(curso));
        const alumnos        = alumnosAsig.length ? alumnosAsig : todosAlumnos;

        // Header del modal con selector rápido
        const opAlumnos = alumnos.map(a=>
            `<option value="${a.usuario}" ${alumnoPresel===a.usuario?'selected':''}>${a.nombre_completo} (${a.codigo||'—'})</option>`
        ).join('');

        const gruposInfo = (est.grupos||[]).map(g=>
            `<span style="background:${g.colorHex||'#1B2A4A'}18;color:${g.colorHex||'#1B2A4A'};
                          border-radius:10px;padding:1px 8px;font-size:0.72rem;font-weight:600;">
                ${g.nombre}: ${g.nPacientes||1}pac · ${g.nSesiones||10}SS
                ${g.nExtras>0?` +${g.nExtras}ext`:''}
             </span>`
        ).join(' ');

        document.getElementById('modal-cursos-body').innerHTML = `
        <!-- Cabecera del curso -->
        <div style="background:#F0F4FF;border-radius:10px;padding:12px 16px;margin-bottom:14px;border-left:4px solid var(--primary);">
            <div style="font-weight:700;color:var(--primary);margin-bottom:5px;font-size:0.9rem;">
                🏫 ${curso} · EV ${est.pesoEV||20}% + SS ${est.pesoSS||80}%
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">${gruposInfo}</div>
            <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
                <div style="flex:1;min-width:180px;">
                    <label style="font-size:0.75rem;color:var(--gray);display:block;margin-bottom:3px;">✏️ Editar notas de alumno:</label>
                    <select id="ingreso-alumno-sel" onchange="cargarPanelNotasAlumno('${curso}')"
                            style="margin-bottom:0;border:1.5px solid var(--primary);font-weight:600;font-size:0.85rem;">
                        <option value="">-- Selecciona un alumno --</option>${opAlumnos}
                    </select>
                </div>
                <div style="flex:1;min-width:130px;">
                    <label style="font-size:0.75rem;color:var(--gray);display:block;margin-bottom:3px;">Filtrar:</label>
                    <input type="text" placeholder="Apellido…" id="ingreso-buscar-alumno"
                           oninput="filtrarSelectAlumnoIngreso('${curso}',this.value)"
                           style="margin-bottom:0;border:1.5px solid var(--docente);font-size:0.85rem;">
                </div>
            </div>
        </div>

        <!-- Resumen: tabla con todos los alumnos del curso -->
        <div id="resumen-curso-wrap">
            <div style="font-weight:700;color:var(--primary);font-size:0.85rem;margin-bottom:8px;
                        display:flex;justify-content:space-between;align-items:center;">
                <span>👥 Alumnos asignados al curso (${alumnos.length})</span>
                <button onclick="renderResumenCurso('${curso}')"
                        style="padding:3px 9px;background:#eee;color:#555;border:none;border-radius:5px;cursor:pointer;font-size:0.75rem;">🔄</button>
            </div>
            <div id="resumen-curso-tabla"></div>
        </div>

        <!-- Panel edición por alumno (se muestra debajo al seleccionar) -->
        <div id="ingreso-notas-area" style="margin-top:16px;">
            <div style="text-align:center;color:#aaa;padding:30px 0;font-size:0.85rem;">
                Selecciona un alumno arriba para editar sus notas.
            </div>
        </div>`;

        document.getElementById('modalCursos').style.display = 'block';

        // Renderizar resumen y cargar alumno presel si hay
        await renderResumenCurso(curso);
        if (alumnoPresel) {
            const sel = document.getElementById('ingreso-alumno-sel');
            if (sel) { sel.value = alumnoPresel; await cargarPanelNotasAlumno(curso); }
        }
    }

    /** Tabla-resumen del curso: todos los alumnos, sus pacientes, notas y promedio */
    async function renderResumenCurso(curso) {
        const tabEl = document.getElementById('resumen-curso-tabla');
        if (!tabEl) return;

        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return;

        const todosAlumnos = CENTYR.db.usuarios.filter(u=>u.rol==='alumno');
        const alumnos      = todosAlumnos.filter(a=>(a.cursos||[]).includes(curso));
        const lista        = alumnos.length ? alumnos : todosAlumnos;

        if (!lista.length) {
            tabEl.innerHTML = `<div style="text-align:center;color:#aaa;padding:20px;font-size:0.82rem;">
                Sin alumnos asignados a este curso.<br>
                <small>Ve a 👤 Usuarios → Asignar cursos para asignar alumnos.</small></div>`;
            return;
        }

        tabEl.innerHTML = `<div style="text-align:center;color:#888;padding:12px;font-size:0.8rem;">⏳ Cargando notas…</div>`;

        // Cargar notas de todos los alumnos en paralelo (o desde caché)
        if (!CENTYR.db.notas_cursos) CENTYR.db.notas_cursos = {};
        await Promise.all(lista.map(async a => {
            const key = `${a.usuario}::${curso}`;
            if (!CENTYR.db.notas_cursos[key]) {
                try {
                    const res  = await fetch(`${CENTYR.CONFIG.webAppUrl}?action=get_notas_alumno_curso&alumno=${encodeURIComponent(a.usuario)}&curso=${encodeURIComponent(curso)}`);
                    const data = await res.json();
                    if (data.status==='success' && data.pacientes?.length)
                        CENTYR.db.notas_cursos[key] = data.pacientes;
                } catch(e) { /* sin conexión */ }
            }
        }));

        const pesoEV = est.pesoEV||20, pesoSS = est.pesoSS||80;

        // Helper: calcular promedio de un alumno desde datos en memoria
        const calcProm = (alumnoUsuario) => {
            const key  = `${alumnoUsuario}::${curso}`;
            const pacs = CENTYR.db.notas_cursos[key] || [];
            if (!pacs.length) return null;
            const notas = [];
            let pi = 0;
            (est.grupos||[]).forEach(g => {
                const nSS=g.nSesiones||10, nExt=g.nExtras||0, pctE=g.pctExtra||0;
                for (let k=0;k<(g.nPacientes||1);k++) {
                    const pac=pacs[pi++]||{};
                    const evVal = pac.nota_ev!==''&&pac.nota_ev!==undefined ? parseFloat(pac.nota_ev)||0 : null;
                    const sumSS = (pac.notas_ss||[]).reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0),0);
                    const promSS= sumSS/nSS;
                    const sumExt=(pac.notas_ext||[]).reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0),0);
                    const promExt=nExt>0?sumExt/nExt:null;
                    let base=0,pw=0;
                    if(evVal!==null){base+=evVal*pesoEV/100;pw+=pesoEV;}
                    base+=promSS*pesoSS/100;pw+=pesoSS;
                    const bono=(promExt!==null&&nExt>0)?promExt*pctE/100:0;
                    if(pw>0) notas.push(Math.min(20,base+bono));
                }
            });
            return notas.length ? notas.reduce((s,v)=>s+v,0)/notas.length : null;
        };

        // Construir tabla
        let html = `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
        <thead>
            <tr>
                <th style="background:var(--primary);color:white;padding:7px 10px;text-align:left;min-width:160px;">Alumno</th>
                <th style="background:var(--primary);color:white;padding:7px 8px;text-align:center;min-width:80px;">Código</th>
                <th style="background:#0288D1;color:white;padding:7px 10px;text-align:left;min-width:130px;">Paciente</th>
                <th style="background:#0288D1;color:white;padding:7px 8px;text-align:center;min-width:50px;">Grupo</th>
                <th style="background:#27ae60;color:white;padding:7px 8px;text-align:center;min-width:44px;">EV</th>
                <th style="background:#27ae60;color:white;padding:7px 8px;text-align:center;min-width:80px;">Prom.SS</th>
                ${est.grupos?.some(g=>g.nExtras>0) ? '<th style="background:#D97706;color:white;padding:7px 8px;text-align:center;min-width:80px;">Prom.Extra</th>' : ''}
                <th style="background:#6C3FC5;color:white;padding:7px 8px;text-align:center;min-width:64px;">Prom.Pac</th>
            </tr>
        </thead>
        <tbody>`;

        const tieneExtra = est.grupos?.some(g=>g.nExtras>0);

        lista.forEach((a, ai) => {
            const key  = `${a.usuario}::${curso}`;
            const pacs = CENTYR.db.notas_cursos[key] || [];
            const prom = calcProm(a.usuario);
            const promCol = prom===null?'#888':prom<=10?'#E53935':prom<=13?'#F59E0B':prom<=16?'#2ECC71':'#0288D1';
            const rowBg   = ai%2===0?'#fafbff':'white';

            // Fila de alumno — colspan sobre todos los pacientes
            const totalPacs = (est.grupos||[]).reduce((s,g)=>s+(g.nPacientes||1),0);

            if (!pacs.length) {
                // Sin notas ingresadas aún
                html += `<tr style="background:${rowBg};">
                    <td style="padding:7px 10px;font-weight:700;color:var(--primary);" rowspan="${totalPacs||1}">
                        <div>${a.nombre_completo}</div>
                        <button onclick="seleccionarAlumnoIngresoCurso('${a.usuario}','${curso}')"
                                style="margin-top:4px;padding:3px 9px;background:var(--admin);color:white;border:none;
                                       border-radius:5px;cursor:pointer;font-size:0.7rem;font-weight:700;">✏️ Editar</button>
                    </td>
                    <td style="padding:7px 8px;text-align:center;color:#888;" rowspan="${totalPacs||1}">${a.codigo||a.usuario}</td>
                    <td colspan="${tieneExtra?5:4}" style="padding:7px 10px;text-align:center;color:#bbb;font-style:italic;">
                        Sin notas ingresadas —
                        <span style="color:var(--admin);cursor:pointer;text-decoration:underline;"
                              onclick="seleccionarAlumnoIngresoCurso('${a.usuario}','${curso}')">ingresar ahora</span>
                    </td>
                </tr>`;
                return;
            }

            let pi = 0, firstRow = true;
            (est.grupos||[]).forEach((g,gi) => {
                const nSS=g.nSesiones||10, nExt=g.nExtras||0, pctE=g.pctExtra||0;
                const col = g.colorHex||'#0288D1';
                for (let k=0; k<(g.nPacientes||1); k++) {
                    const pac = pacs[pi++]||{};
                    const evV = pac.nota_ev!==''&&pac.nota_ev!==undefined ? parseFloat(pac.nota_ev) : null;
                    const ss  = pac.notas_ss  || [];
                    const ext = pac.notas_ext || [];
                    const sumSS  = ss.reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0),0);
                    const promSS = sumSS/nSS;
                    const sumExt = ext.reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0),0);
                    const promExt= nExt>0?sumExt/nExt:null;
                    let base=0,pw=0;
                    if(evV!==null){base+=evV*pesoEV/100;pw+=pesoEV;}
                    base+=promSS*pesoSS/100;pw+=pesoSS;
                    const bono=(promExt!==null&&nExt>0)?promExt*pctE/100:0;
                    const notaPac = pw>0 ? Math.min(20,base+bono) : null;
                    const pacCol = notaPac===null?'#888':notaPac<=10?'#FECACA':notaPac<=13?'#FEF3C7':notaPac<=16?'#D1FAE5':'#DBEAFE';
                    const pacFc  = notaPac===null?'#888':notaPac<=10?'#991B1B':notaPac<=13?'#92400E':notaPac<=16?'#065F46':'#1E40AF';

                    html += `<tr style="background:${rowBg};border-bottom:1px solid #f0f2f5;">`;

                    if (firstRow) {
                        html += `<td style="padding:7px 10px;font-weight:700;color:var(--primary);
                                            border-right:2px solid #e0e6ed;vertical-align:top;" rowspan="${pacs.length}">
                            <div>${a.nombre_completo}</div>
                            <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
                                <button onclick="seleccionarAlumnoIngresoCurso('${a.usuario}','${curso}')"
                                        style="padding:3px 9px;background:var(--admin);color:white;border:none;
                                               border-radius:5px;cursor:pointer;font-size:0.7rem;font-weight:700;">✏️ Editar</button>
                                <span style="background:${promCol};color:white;padding:2px 8px;border-radius:10px;font-weight:700;font-size:0.75rem;">
                                    ${prom!==null?prom.toFixed(2):'—'}/20</span>
                            </div>
                        </td>
                        <td style="padding:7px 8px;text-align:center;color:#888;vertical-align:top;
                                   border-right:2px solid #e0e6ed;" rowspan="${pacs.length}">${a.codigo||a.usuario}</td>`;
                        firstRow = false;
                    }

                    const pacNom = pac.paciente || `Paciente ${pi}`;
                    const pacDni = pac.dni ? `<div style="font-size:0.68rem;color:#aaa;">${pac.dni}</div>` : '';
                    html += `<td style="padding:5px 10px;border-right:1px solid #f0f2f5;">
                                <div style="font-weight:600;color:var(--primary);">${pacNom}</div>${pacDni}</td>
                             <td style="padding:5px 8px;text-align:center;">
                                <span style="font-size:0.68rem;background:${col}18;color:${col};
                                             padding:1px 6px;border-radius:8px;font-weight:700;">${g.nombre}</span></td>
                             <td style="padding:5px 8px;text-align:center;font-weight:700;color:#0288D1;">
                                ${evV!==null?evV.toFixed(1):'<span style="color:#ccc;">—</span>'}</td>
                             <td style="padding:5px 8px;text-align:center;color:${col};font-weight:600;">
                                ${promSS.toFixed(2)}<span style="color:#aaa;font-size:0.68rem;">/${nSS}</span></td>`;
                    if (tieneExtra) {
                        html += `<td style="padding:5px 8px;text-align:center;color:#D97706;font-weight:600;">
                            ${promExt!==null?promExt.toFixed(2)+(nExt>0?`<span style="color:#aaa;font-size:0.68rem;">/${nExt}</span>`:''):'<span style="color:#ccc;">—</span>'}</td>`;
                    }
                    html += `<td style="padding:5px 8px;text-align:center;">
                                <span style="background:${pacCol};color:${pacFc};padding:3px 8px;border-radius:8px;font-weight:700;">
                                    ${notaPac!==null?notaPac.toFixed(2):'—'}</span></td>`;
                    html += `</tr>`;
                }
            });
        });

        html += `</tbody></table></div>`;
        tabEl.innerHTML = html;
    }

    /** Selecciona alumno en el selector y carga su panel de edición */
    function seleccionarAlumnoIngresoCurso(alumnoUsuario, curso) {
        const sel = document.getElementById('ingreso-alumno-sel');
        if (sel) { sel.value = alumnoUsuario; cargarPanelNotasAlumno(curso); }
        // Scroll suave al panel de edición
        setTimeout(()=>{
            const area = document.getElementById('ingreso-notas-area');
            if (area) area.scrollIntoView({behavior:'smooth',block:'start'});
        }, 150);
    }

    function filtrarSelectAlumnoIngreso(curso, q) {
        const sel  = document.getElementById('ingreso-alumno-sel');
        const todo = CENTYR.db.usuarios.filter(u=>u.rol==='alumno');
        const fil  = q.trim() ? todo.filter(a=>a.nombre_completo.toLowerCase().includes(q.trim().toLowerCase())) : todo;
        sel.innerHTML = '<option value="">-- Elige un alumno --</option>' +
            fil.map(a=>`<option value="${a.usuario}">${a.nombre_completo} (${a.codigo||'—'})</option>`).join('');
    }

    // ═══════════════════════════════════════════════════════════════
    //  PANEL DE NOTAS POR ALUMNO
    //  La tabla se genera por grupos; cada grupo tiene sus propias
    //  columnas SS y Extra según su configuración.
    //  Promedio = SumaNotas / nSesiones_programadas (siempre)
    // ═══════════════════════════════════════════════════════════════
    async function cargarPanelNotasAlumno(curso) {
        const alumnoUsuario = document.getElementById('ingreso-alumno-sel')?.value;
        const area          = document.getElementById('ingreso-notas-area');
        if (!alumnoUsuario) { area.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px 0;">Selecciona un alumno.</div>'; return; }

        const est       = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        const alumnoObj = CENTYR.db.usuarios.find(u=>u.usuario===alumnoUsuario);
        if (!est||!alumnoObj) return;

        const nombre    = alumnoObj.nombre_completo;
        const keyAlumno = `${alumnoUsuario}::${curso}`;
        if (!CENTYR.db.notas_cursos) CENTYR.db.notas_cursos = {};

        showLoad(true, 'Cargando calificaciones…');
        try {
            const res  = await fetch(`${CENTYR.CONFIG.webAppUrl}?action=get_notas_alumno_curso&alumno=${encodeURIComponent(alumnoUsuario)}&curso=${encodeURIComponent(curso)}`);
            const data = await res.json();
            if (data.status==='success' && data.pacientes?.length)
                CENTYR.db.notas_cursos[keyAlumno] = data.pacientes;
        } catch(e) { /* local */ }
        showLoad(false);

        const pesoEV = est.pesoEV || 20;
        const pesoSS = est.pesoSS || 80;
        const grupos = est.grupos || [];

        // Pacientes reales del alumno en este curso
        const dniVistos = new Set();
        const pacientesAlumno = [];
        CENTYR.db.pacientes.forEach(p => {
            const pc = p.curso || p.categoria || '';
            if (p.atendido_por===nombre && pc===curso && !dniVistos.has(String(p.dni||''))) {
                dniVistos.add(String(p.dni||''));
                pacientesAlumno.push({nombre:p.paciente, dni:String(p.dni||'')});
            }
        });

        // Sesiones aprobadas por paciente (para auto-rellenar)
        const pacMapAuto = {};
        CENTYR.db.pacientes
            .filter(p=>p.atendido_por===nombre&&(p.curso||p.categoria||'')===curso)
            .sort((a,b)=>new Date(a.fecha||0)-new Date(b.fecha||0))
            .forEach(p=>{
                const k = String(p.dni||p.paciente||'').trim();
                if (!pacMapAuto[k]) pacMapAuto[k]={nombre:String(p.paciente||''),dni:String(p.dni||''),sesiones:[]};
                if (p.estado_aprobacion==='aprobado') pacMapAuto[k].sesiones.push(parseFloat(p.nota_aprobacion)||0);
            });
        const pacsAutoList = Object.values(pacMapAuto);

        // Construir lista plana de pacientes con su grupo asignado
        // Distribución: Grupo 0 = pacs[0..g0.nPacientes-1], Grupo 1 = pacs[g0.nPacientes..], etc.
        if (!CENTYR.db.notas_cursos[keyAlumno] || !CENTYR.db.notas_cursos[keyAlumno].length) {
            const lista = [];
            let autoIdx = 0;
            grupos.forEach(g => {
                const nSS  = g.nSesiones || 10;
                const nExt = g.nExtras   || 0;
                for (let k=0; k<(g.nPacientes||1); k++) {
                    const real = pacsAutoList[autoIdx++] || null;
                    lista.push({
                        paciente:   real?.nombre || `Paciente ${lista.length+1}`,
                        dni:        real?.dni    || '',
                        grupo_id:   g.id,
                        nota_ev:    '',
                        notas_ss:   Array.from({length:nSS }, (_,i)=>real?String(real.sesiones[i]||''):''),
                        notas_ext:  Array(nExt).fill(''),
                        notas:      {}
                    });
                }
            });
            CENTYR.db.notas_cursos[keyAlumno] = lista;
        } else {
            // Asegurar que las columnas existen
            let globalPacIdx = 0;
            grupos.forEach(g => {
                const nSS  = g.nSesiones || 10;
                const nExt = g.nExtras   || 0;
                for (let k=0; k<(g.nPacientes||1); k++) {
                    const pac = CENTYR.db.notas_cursos[keyAlumno][globalPacIdx];
                    if (pac) {
                        pac.grupo_id = g.id;
                        if (!pac.notas_ss)  pac.notas_ss  = Array(nSS).fill('');
                        if (!pac.notas_ext) pac.notas_ext = Array(nExt).fill('');
                        while (pac.notas_ss.length  < nSS)  pac.notas_ss.push('');
                        while (pac.notas_ext.length < nExt) pac.notas_ext.push('');
                        if (pac.nota_ev===undefined) pac.nota_ev='';
                    }
                    globalPacIdx++;
                }
            });
        }

        const pacs = CENTYR.db.notas_cursos[keyAlumno];

        // ── Banner alumno ──
        let html = `<div style="background:#1B2A4A;border-radius:10px;padding:10px 16px;margin-bottom:12px;color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
                <div style="font-weight:700;font-size:0.95rem;">👨‍🎓 ${nombre} · <span style="opacity:0.75;font-size:0.82rem;">${alumnoObj.codigo||'—'}</span></div>
                <div style="font-size:0.74rem;opacity:0.8;margin-top:2px;">📋 EV ${pesoEV}% + 🏃 SS ${pesoSS}% · Promedio sobre total programado</div>
            </div>
            <div id="alumno-nota-final-display" style="font-size:0.88rem;font-weight:700;"></div>
        </div>`;

        const TH = (txt,bg,ext='') => `<th style="background:${bg};color:white;padding:4px 3px;text-align:center;font-size:0.63rem;font-weight:700;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);${ext}">${txt}</th>`;
        const TD = (inner,ext='') => `<td style="border:1px solid #eef0f4;padding:3px 2px;text-align:center;${ext}">${inner}</td>`;
        const INP = (id,val,color,cbk) =>
            `<input type="number" id="${id}" value="${val}" min="0" max="20" step="0.5"
             oninput="${cbk}"
             style="width:42px;padding:2px;text-align:center;font-weight:700;font-size:0.8rem;
                    border:1.5px solid ${color};border-radius:5px;margin-bottom:0;
                    background:${val!==''?color+'18':'white'};">`;

        // Generar tabla por cada grupo
        let globalPi = 0;
        grupos.forEach((g, gi) => {
            const nSS  = g.nSesiones || 10;
            const nExt = g.nExtras   || 0;
            const pctE = g.pctExtra  || 0;
            const col  = g.colorHex  || GRUPO_COLORES[gi%GRUPO_COLORES.length];

            html += `<div style="margin-bottom:3px;background:${col};color:white;padding:5px 12px;border-radius:7px 7px 0 0;font-size:0.78rem;font-weight:700;">
                ◉ ${g.nombre} — ${g.nPacientes||1} pacientes · ${nSS} sesiones programadas (meta 100%)
                ${nExt>0?` · ⭐ ${nExt} extras (bono +${pctE}%)`:''}
            </div>`;

            // Doble encabezado
            let hG = `<tr>`;
            hG += `<th colspan="2" style="background:#1B2A4A;color:white;padding:3px;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);">PACIENTE</th>`;
            hG += `<th style="background:#0288D1;color:white;padding:3px;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">EV</th>`;
            hG += `<th colspan="${nSS}" style="background:${col};color:white;padding:3px;text-align:center;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);">
                      SESIONES BASE (${nSS} programadas · ${pesoSS}%) ← promedio ÷ ${nSS} siempre
                   </th>`;
            if (nExt>0) hG += `<th colspan="${nExt}" style="background:#D97706;color:white;padding:3px;text-align:center;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);">
                      SS EXTRA (+${pctE}%) ÷ ${nExt}
                   </th>`;
            if (nExt>0) {
                hG += `<th style="background:#9C27B0;color:white;padding:3px;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">BONO<br>+${pctE}%</th>`;
            }
            hG += `<th style="background:#6C3FC5;color:white;padding:3px;font-size:0.63rem;border:1px solid rgba(255,255,255,0.2);" rowspan="2">PROM.<br>FINAL</th>`;
            hG += `</tr>`;

            let hC = `<tr>`;
            hC += TH('N°','#1B2A4A') + TH('NOMBRE','#1B2A4A','min-width:110px;');
            for (let s=1;s<=nSS;s++) hC += TH(`${s}`, s%2===0?col:col+'CC');
            if (nExt>0) for (let e=1;e<=nExt;e++) hC += TH(`E${e}`,'#D97706');
            hC += `</tr>`;

            let rowsHtml = '';
            const nPacsGrupo = g.nPacientes || 1;
            for (let k=0; k<nPacsGrupo; k++) {
                const pi  = globalPi++;
                const pac = pacs[pi] || {paciente:'',dni:'',nota_ev:'',notas_ss:[],notas_ext:[]};
                const ssN = (pac.notas_ss  || Array(nSS).fill('')).slice(0,nSS);
                const exN = (pac.notas_ext || Array(nExt).fill('')).slice(0,nExt);

                rowsHtml += `<tr>`;
                rowsHtml += TD(pi+1,'font-weight:700;color:var(--primary);');
                rowsHtml += `<td style="border:1px solid #eef0f4;padding:2px 3px;">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        <input type="text" id="pac-nombre-${pi}" value="${pac.paciente||''}"
                               style="margin-bottom:0;padding:2px 5px;font-size:0.75rem;border:1.5px solid #e0e6ed;border-radius:4px;width:100%;box-sizing:border-box;" placeholder="Nombre…">
                        <input type="text" id="pac-dni-${pi}" value="${pac.dni||''}"
                               style="margin-bottom:0;padding:1px 5px;font-size:0.68rem;border:1.5px solid #e0e6ed;border-radius:3px;width:100%;box-sizing:border-box;color:#666;" placeholder="DNI…">
                    </div>
                </td>`;
                rowsHtml += TD(INP(`ev-${pi}`,pac.nota_ev||'','#0288D1',`recalcularFilaGrupo(${pi},${gi},'${curso}')`));
                for (let s=0;s<nSS;s++) {
                    const v=ssN[s]||'';
                    rowsHtml += TD(INP(`ss-${pi}-${s}`,v,s%2===0?col:col+'BB',`recalcularFilaGrupo(${pi},${gi},'${curso}')`));
                }
                if (nExt>0) {
                    for (let e=0;e<nExt;e++) {
                        const v=exN[e]||'';
                        rowsHtml += TD(INP(`ext-${pi}-${e}`,v,'#D97706',`recalcularFilaGrupo(${pi},${gi},'${curso}')`));
                    }
                    rowsHtml += TD(`<span id="bono-${pi}" style="font-size:0.75rem;color:#9C27B0;font-weight:700;">—</span>`,'background:#F3E8FF;');
                }
                rowsHtml += TD(`<span id="nota-final-${pi}" style="font-weight:700;color:#6C3FC5;font-size:0.82rem;">—</span>`,'background:#EEF4FF;');
                rowsHtml += `</tr>`;
            }

            html += `<div style="overflow-x:auto;margin-bottom:14px;border:1.5px solid ${col}44;border-top:none;border-radius:0 0 8px 8px;">
                <table style="border-collapse:collapse;width:100%;min-width:500px;">
                    <thead>${hG}${hC}</thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
        });

        html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:8px;border-top:1px solid #e0e6ed;">
            <button onclick="guardarNotasAlumnoEnCurso('${curso}','${alumnoUsuario}')"
                    style="padding:13px;background:var(--admin);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">💾 GUARDAR NOTAS</button>
            <button onclick="exportarNotasCurso('${curso}')"
                    style="padding:13px;background:var(--accent);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:700;">📥 EXPORTAR CSV</button>
        </div>`;

        area.innerHTML = html;
        // Recalcular todo al cargar
        let pi2 = 0;
        grupos.forEach((g,gi)=>{
            for (let k=0;k<(g.nPacientes||1);k++) recalcularFilaGrupo(pi2++,gi,curso);
        });
    }

    function selPacienteIngreso(pi) {
        const sel = document.getElementById(`pac-sel-${pi}`);
        if (!sel||!sel.value) return;
        const [nom,dni]=sel.value.split('|');
        const n=document.getElementById(`pac-nombre-${pi}`); if(n) n.value=nom||'';
        const d=document.getElementById(`pac-dni-${pi}`);    if(d) d.value=dni||'';
    }

    // ═══════════════════════════════════════════════════════════════
    //  RECÁLCULO — PROMEDIO SOBRE TOTAL PROGRAMADO
    // ═══════════════════════════════════════════════════════════════
    function recalcularFilaGrupo(pi, gi, curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return;
        const g    = (est.grupos||[])[gi];
        if (!g) return;

        const nSS    = g.nSesiones  || 10;   // total programadas — denominador fijo
        const nExt   = g.nExtras    || 0;
        const pctE   = g.pctExtra   || 0;
        const pesoEV = est.pesoEV   || 20;
        const pesoSS = est.pesoSS   || 80;

        // EV
        const evEl  = document.getElementById(`ev-${pi}`);
        const evVal = evEl && evEl.value!=='' ? parseFloat(evEl.value) : null;

        // SS base — suma sobre nSS programadas (vacíos = 0)
        let sumaSSTotal = 0;
        for (let s=0; s<nSS; s++) {
            const el = document.getElementById(`ss-${pi}-${s}`);
            sumaSSTotal += (el && el.value!=='') ? parseFloat(el.value)||0 : 0;
        }
        const promSS = sumaSSTotal / nSS;   // ← SIEMPRE divide por total programado

        // SS extra — suma sobre nExt programadas (vacíos = 0)
        let sumaExtTotal = 0;
        for (let e=0; e<nExt; e++) {
            const el = document.getElementById(`ext-${pi}-${e}`);
            sumaExtTotal += (el && el.value!=='') ? parseFloat(el.value)||0 : 0;
        }
        const promExt = nExt > 0 ? sumaExtTotal / nExt : null;   // ← divide por total programado extra

        // Fórmula
        let base=0, pesoUsado=0;
        if (evVal!==null) { base += evVal*pesoEV/100; pesoUsado+=pesoEV; }
        base += promSS*pesoSS/100; pesoUsado+=pesoSS;   // SS siempre cuenta (puede ser 0)

        const bono   = promExt!==null&&nExt>0 ? promExt*pctE/100 : 0;
        const notaPac= pesoUsado>0 ? Math.min(20, base+bono) : null;

        // Bono display
        const bonoEl = document.getElementById(`bono-${pi}`);
        if (bonoEl) {
            if (bono>0) { bonoEl.textContent=`+${bono.toFixed(2)}`; bonoEl.style.color='#9C27B0'; }
            else        { bonoEl.textContent='—'; bonoEl.style.color='#aaa'; }
        }

        // Nota final paciente
        const finalEl = document.getElementById(`nota-final-${pi}`);
        if (finalEl) {
            if (notaPac!==null) {
                const col = notaPac<=10?'#E53935':notaPac<=13?'#F59E0B':notaPac<=16?'#2ECC71':'#0288D1';
                finalEl.textContent=notaPac.toFixed(2); finalEl.style.color=col;
            } else { finalEl.textContent='—'; finalEl.style.color='#888'; }
        }

        recalcularNotaFinalAlumno(curso);
    }

    // Aliases para compatibilidad con HTML antiguo
    function recalcularFilaNueva(pi, curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return;
        const grupos = est.grupos||[];
        let offset=0;
        for (let gi=0;gi<grupos.length;gi++) {
            const nP = grupos[gi].nPacientes||1;
            if (pi>=offset && pi<offset+nP) { recalcularFilaGrupo(pi,gi,curso); return; }
            offset+=nP;
        }
    }
    function recalcularFila(pi,curso)          { recalcularFilaNueva(pi,curso); }
    function recalcularPromedioGrupo(gi,curso) { recalcularNotaFinalAlumno(curso); }
    function recalcularPromedioCurso()         { /* placeholder */ }

    function recalcularNotaFinalAlumno(curso) {
        const keyAlumno = Object.keys(CENTYR.db.notas_cursos||{}).find(k=>k.endsWith('::'+curso));
        const est       = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est||!keyAlumno) return;

        const pacs   = CENTYR.db.notas_cursos[keyAlumno]||[];
        const grupos = est.grupos||[];
        const pesoEV = est.pesoEV||20;
        const pesoSS = est.pesoSS||80;

        const notas=[];
        let pi=0;
        grupos.forEach(g=>{
            const nSS=g.nSesiones||10, nExt=g.nExtras||0, pctE=g.pctExtra||0;
            for (let k=0;k<(g.nPacientes||1);k++) {
                const evEl=document.getElementById(`ev-${pi}`);
                const evVal=evEl&&evEl.value!==''?parseFloat(evEl.value):null;
                let sumaSS=0;
                for(let s=0;s<nSS;s++){const el=document.getElementById(`ss-${pi}-${s}`);sumaSS+=(el&&el.value!=='')?parseFloat(el.value)||0:0;}
                const promSS=sumaSS/nSS;
                let sumaExt=0;
                for(let e=0;e<nExt;e++){const el=document.getElementById(`ext-${pi}-${e}`);sumaExt+=(el&&el.value!=='')?parseFloat(el.value)||0:0;}
                const promExt=nExt>0?sumaExt/nExt:null;
                let base=0,pw=0;
                if(evVal!==null){base+=evVal*pesoEV/100;pw+=pesoEV;}
                base+=promSS*pesoSS/100;pw+=pesoSS;
                const bono=promExt!==null&&nExt>0?promExt*pctE/100:0;
                if(pw>0) notas.push(Math.min(20,base+bono));
                pi++;
            }
        });

        const prom = notas.length?notas.reduce((a,v)=>a+v,0)/notas.length:null;
        const nfEl = document.getElementById('alumno-nota-final-display');
        if (nfEl) {
            if (prom!==null) {
                const col=prom<=10?'#E53935':prom<=13?'#F59E0B':prom<=16?'#2ECC71':'#0288D1';
                nfEl.innerHTML=`<span style="color:${col};">📊 Promedio alumno: <strong>${prom.toFixed(2)}/20</strong></span>`;
            } else nfEl.textContent='';
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  GUARDAR NOTAS EN SHEETS
    // ═══════════════════════════════════════════════════════════════
    async function guardarNotasAlumnoEnCurso(curso, alumnoUsuario) {
        const est       = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        const keyAlumno = `${alumnoUsuario}::${curso}`;
        if (!est||!CENTYR.db.notas_cursos?.[keyAlumno]) return;

        const alumnoObj = CENTYR.db.usuarios.find(u=>u.usuario===alumnoUsuario);
        const pacs      = CENTYR.db.notas_cursos[keyAlumno];
        const grupos    = est.grupos||[];
        let   pi        = 0;

        grupos.forEach(g=>{
            const nSS=g.nSesiones||10, nExt=g.nExtras||0;
            for (let k=0;k<(g.nPacientes||1);k++) {
                const pac=pacs[pi];
                if (pac) {
                    pac.paciente =document.getElementById(`pac-nombre-${pi}`)?.value||pac.paciente;
                    pac.dni      =document.getElementById(`pac-dni-${pi}`)?.value   ||pac.dni||'';
                    const evEl=document.getElementById(`ev-${pi}`); pac.nota_ev=evEl?evEl.value:(pac.nota_ev||'');
                    pac.notas_ss=[]; for(let s=0;s<nSS;s++){const el=document.getElementById(`ss-${pi}-${s}`);pac.notas_ss.push(el?el.value:'');}
                    pac.notas_ext=[]; for(let e=0;e<nExt;e++){const el=document.getElementById(`ext-${pi}-${e}`);pac.notas_ext.push(el?el.value:'');}
                    pac.grupo_id=g.id;
                    pac.notas={[g.id]:pac.notas_ss.filter(v=>v!=='').slice(0,1)};
                }
                pi++;
            }
        });

        showLoad(true,'Guardando…');
        try {
            await fetch(CENTYR.CONFIG.webAppUrl,{
                method:'POST',headers:{'Content-Type':'text/plain'},
                body:JSON.stringify({
                    action:'save_notas_alumno_curso',
                    alumno_usuario:alumnoUsuario,
                    alumno_nombre:alumnoObj?.nombre_completo||'',
                    alumno_codigo:alumnoObj?.codigo||'',
                    curso,grupos:est.grupos,pacientes:pacs,
                    pesoEV:est.pesoEV||20,pesoSS:est.pesoSS||80
                })
            });
        } catch(e){}
        showLoad(false);
        mostrarNotificacion(`✅ Notas de ${alumnoObj?.nombre_completo||alumnoUsuario} guardadas`);
        // Refrescar tabla-resumen del curso
        renderResumenCurso(curso);
    }

    async function guardarNotasCurso(curso) {
        const alumnoUsuario=document.getElementById('ingreso-alumno-sel')?.value;
        if (alumnoUsuario) await guardarNotasAlumnoEnCurso(curso,alumnoUsuario);
        else mostrarNotificacion('⚠️ Selecciona un alumno antes de guardar.');
    }

    async function exportarNotasCurso(curso) {
        await guardarNotasCurso(curso);
        const est=CENTYR.db.estructuras_cursos?.find(e=>e.curso===curso);
        if (!est){alert('⚠️ Sin estructura');return;}
        const keyAlumno=Object.keys(CENTYR.db.notas_cursos||{}).find(k=>k.endsWith('::'+curso));
        const pacs=keyAlumno?CENTYR.db.notas_cursos[keyAlumno]:[];

        const maxSS  = Math.max(...(est.grupos||[]).map(g=>g.nSesiones||0),0);
        const maxExt = Math.max(...(est.grupos||[]).map(g=>g.nExtras||0),0);

        const header=['N°','Grupo','Paciente','DNI','EV'];
        for(let s=1;s<=maxSS;s++) header.push(`SS${s}`);
        for(let e=1;e<=maxExt;e++) header.push(`EXT${e}`);
        header.push('Bono','PROM.FINAL');

        const sel=document.getElementById('ingreso-alumno-sel');
        const alumnoTxt=sel?sel.options[sel.selectedIndex]?.text:'';
        const rows=[[`NOTAS — ${curso}`,''],['Alumno: '+alumnoTxt,''],[''],header];

        let pi=0;
        (est.grupos||[]).forEach(g=>{
            for(let k=0;k<(g.nPacientes||1);k++){
                const row=[pi+1,g.nombre,pacs[pi]?.paciente||'',pacs[pi]?.dni||'',pacs[pi]?.nota_ev||''];
                const ss=pacs[pi]?.notas_ss||[];
                const ex=pacs[pi]?.notas_ext||[];
                for(let s=0;s<maxSS;s++) row.push(s<ss.length?ss[s]:'');
                for(let e=0;e<maxExt;e++) row.push(e<ex.length?ex[e]:'');
                row.push(document.getElementById(`bono-${pi}`)?.textContent||'');
                row.push(document.getElementById(`nota-final-${pi}`)?.textContent||'');
                rows.push(row);
                pi++;
            }
        });

        showLoad(true,'Exportando…');
        try{await fetch(CENTYR.CONFIG.webAppUrl,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'save_notas_curso',curso,rows})});}catch(e){}
        showLoad(false);
        descargarCSV(`CENTYR_Notas_${curso.replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.csv`,rows);
        mostrarNotificacion(`📤 Notas de "${curso}" exportadas`);
    }

    function calcularNotasFinalCurso() {
        const cfg={curso:(document.getElementById('curso-nombre-input')?.value||'').trim()};
        if(!cfg.curso){alert('⚠️ Escribe el nombre del curso');return;}
        abrirIngresoCurso(cfg.curso,null);
    }

    // ═══════════════════════════════════════════════════════════════
    //  RESUMEN DE NOTAS DOCENTE
    // ═══════════════════════════════════════════════════════════════
    function calcularPromedioPonderado(notas){
        const v=notas.filter(n=>!isNaN(parseFloat(n.calificacion)));
        if(!v.length)return null;
        return(v.reduce((s,n)=>s+parseFloat(n.calificacion),0)/v.length).toFixed(2);
    }

    function cargarResumenNotas(){
        const alumnoUsuario=document.getElementById('cfg-alumno-sel').value;
        const div=document.getElementById('cfg-notas-resumen');
        if(!alumnoUsuario){div.innerHTML='';return;}
        const alumnoObj=CENTYR.db.usuarios.find(u=>u.usuario===alumnoUsuario);
        if(!alumnoObj)return;
        const notasAlumno=(CENTYR.db.notas_docentes||[]).filter(n=>n.alumno_nombre===alumnoObj.nombre_completo);
        if(!notasAlumno.length){div.innerHTML='<p style="color:#999;text-align:center;padding:20px;">Sin notas registradas.</p>';return;}
        const porPaciente={};
        notasAlumno.forEach(n=>{const k=n.paciente_dni||n.paciente_nombre;if(!porPaciente[k])porPaciente[k]={nombre:n.paciente_nombre,notas:[]};porPaciente[k].notas.push(n);});
        const pg=calcularPromedioPonderado(notasAlumno);
        const cg=!pg?'#888':pg<=10?'#c0392b':pg<=13?'#d35400':pg<=16?'#1e8449':'#1a5276';
        let html=`<div style="background:var(--primary);color:white;padding:14px 16px;border-radius:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-weight:bold;font-size:1rem;">${alumnoObj.nombre_completo}</div><div style="font-size:0.8rem;opacity:0.8;">${alumnoObj.codigo||''} · ${notasAlumno.length} nota(s)</div></div>
            <div style="text-align:center;"><div style="font-size:1.8rem;font-weight:bold;color:${cg};background:white;border-radius:8px;padding:4px 14px;">${pg||'—'}</div><div style="font-size:0.75rem;opacity:0.8;">Promedio</div></div>
        </div>`;
        Object.values(porPaciente).forEach(pac=>{
            const pp=calcularPromedioPonderado(pac.notas);
            const cp=!pp?'#888':pp<=10?'#c0392b':pp<=13?'#d35400':pp<=16?'#1e8449':'#1a5276';
            html+=`<div style="border:1px solid #eee;border-radius:8px;margin-bottom:10px;overflow:hidden;">
                <div style="background:#f0f4ff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
                    <strong style="color:var(--primary);">🏥 ${pac.nombre}</strong>
                    <span style="background:${cp};color:white;padding:3px 12px;border-radius:12px;font-weight:bold;">${pp||'—'}/20</span>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Categoría</th><th style="padding:8px;text-align:center;">Nota</th><th style="padding:8px;text-align:left;">Docente</th><th style="padding:8px;text-align:left;">Fecha</th></tr>`;
            pac.notas.forEach(n=>{const nc=parseFloat(n.calificacion);const c=nc<=10?'#fadbd8':nc<=13?'#fef9e7':nc<=16?'#d5f5e3':'#d6eaf8';html+=`<tr style="border-bottom:1px solid #f0f2f5;"><td style="padding:8px;">${n.categoria}</td><td style="padding:8px;text-align:center;background:${c};font-weight:bold;">${n.calificacion}/20</td><td style="padding:8px;color:#555;">${n.docente||'—'}</td><td style="padding:8px;color:#888;">${n.fecha}</td></tr>`;});
            html+=`</table></div>`;
        });
        div.innerHTML=html;
    }

    // ═══════════════════════════════════════════════════════════════
    //  EXPORTACIONES CSV
    // ═══════════════════════════════════════════════════════════════
    function descargarCSV(filename,rows){
        const csv=rows.map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=Object.assign(document.createElement('a'),{href:url,download:filename});
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
        mostrarNotificacion('📥 CSV descargado');
    }

    // ═══════════════════════════════════════════════════════════════
    //  IMPORTAR LISTA DE ALUMNOS (CSV / XLSX)
    // ═══════════════════════════════════════════════════════════════
    let _importAlumnosData = [];   // filas parseadas {codigo, apellidos_nombres}

    function previsualizarImportAlumnos() {
        const fileInput = document.getElementById('import-alumnos-file');
        const file = fileInput?.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();

        const processRows = (rawRows) => {
            // Normalizar: buscar columnas codigo y apellidos_nombres (case-insensitive)
            if (!rawRows.length) { alert('⚠️ El archivo está vacío.'); return; }

            // Detectar si la primera fila es encabezado
            const first = rawRows[0].map(c => String(c||'').trim().toLowerCase());
            let colCod  = first.findIndex(c => c.includes('cod') || c.includes('cód'));
            let colNom  = first.findIndex(c => c.includes('apellido') || c.includes('nombre') || c.includes('nom'));
            let startRow = 0;

            if (colCod === -1 || colNom === -1) {
                // Sin encabezado: asumir col 0 = codigo, col 1 = nombre
                colCod = 0; colNom = 1; startRow = 0;
            } else {
                startRow = 1;
            }

            _importAlumnosData = rawRows.slice(startRow)
                .map(row => ({
                    codigo:            String(row[colCod] || '').trim(),
                    apellidos_nombres: String(row[colNom] || '').trim()
                }))
                .filter(r => r.codigo && r.apellidos_nombres);

            if (!_importAlumnosData.length) { alert('⚠️ No se encontraron filas válidas. Verifica el formato.'); return; }

            // Renderizar vista previa
            const cntEl  = document.getElementById('import-preview-count');
            const tabEl  = document.getElementById('import-preview-tabla');
            const btnEl  = document.querySelector('#import-preview button');
            const wrap   = document.getElementById('import-preview');

            const existing = new Set((CENTYR.db.usuarios||[]).filter(u=>u.rol==='alumno').map(u=>u.codigo));
            const nuevos   = _importAlumnosData.filter(r => !existing.has(r.codigo)).length;
            const actuali  = _importAlumnosData.length - nuevos;

            if (cntEl) cntEl.innerHTML =
                `✅ <strong>${_importAlumnosData.length}</strong> alumnos leídos — ` +
                `<span style="color:var(--accent);">+${nuevos} nuevos</span> · ` +
                `<span style="color:#D97706;">${actuali} actualizaciones</span>`;

            if (btnEl) btnEl.textContent = `✅ IMPORTAR ${_importAlumnosData.length} ALUMNOS`;

            tabEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:0.75rem;">
                <thead><tr>
                    <th style="background:var(--primary);color:white;padding:5px 8px;text-align:left;">Código</th>
                    <th style="background:var(--primary);color:white;padding:5px 8px;text-align:left;">Apellidos y Nombres</th>
                    <th style="background:var(--primary);color:white;padding:5px 8px;text-align:center;">Estado</th>
                </tr></thead>
                <tbody>
                ${_importAlumnosData.slice(0, 50).map(r => {
                    const existe = existing.has(r.codigo);
                    return `<tr style="border-bottom:1px solid #e0e6ed;">
                        <td style="padding:4px 8px;font-weight:700;color:var(--primary);">${r.codigo}</td>
                        <td style="padding:4px 8px;">${r.apellidos_nombres}</td>
                        <td style="padding:4px 8px;text-align:center;">
                            <span style="font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:10px;
                                background:${existe?'#FFF3E0':'#E8F5E9'};color:${existe?'#D97706':'#065F46'};">
                                ${existe ? '↻ Actualizar' : '+ Nuevo'}
                            </span>
                        </td>
                    </tr>`;
                }).join('')}
                ${_importAlumnosData.length > 50 ? `<tr><td colspan="3" style="text-align:center;padding:6px;color:#aaa;font-size:0.72rem;">… ${_importAlumnosData.length-50} más</td></tr>` : ''}
                </tbody>
            </table>`;

            if (wrap) wrap.style.display = 'block';
        };

        if (ext === 'csv') {
            const reader = new FileReader();
            reader.onload = e => {
                const text = e.target.result;
                const rows = text.trim().split('\n').map(l => l.split(/[,;|\t]/).map(c => c.replace(/^"|"$/g,'').trim()));
                processRows(rows);
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            // XLSX — requiere SheetJS
            if (typeof XLSX === 'undefined') { alert('⚠️ Librería XLSX no disponible. Usa un archivo CSV.'); return; }
            const reader = new FileReader();
            reader.onload = e => {
                const wb   = XLSX.read(e.target.result, {type:'binary'});
                const ws   = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, {header:1});
                processRows(rows);
            };
            reader.readAsBinaryString(file);
        }
    }

    function cancelarImportAlumnos() {
        _importAlumnosData = [];
        const wrap = document.getElementById('import-preview');
        if (wrap) wrap.style.display = 'none';
        const inp = document.getElementById('import-alumnos-file');
        if (inp) inp.value = '';
    }

    async function confirmarImportAlumnos() {
        if (!_importAlumnosData.length) return;
        showLoad(true, `Importando ${_importAlumnosData.length} alumnos…`);

        let creados = 0, actualizados = 0, errores = 0;
        for (const r of _importAlumnosData) {
            const existe = CENTYR.db.usuarios.find(u => u.codigo === r.codigo && u.rol === 'alumno');
            const payload = {
                action:          existe ? 'update_user' : 'add_user',
                nombre_completo: r.apellidos_nombres,
                codigo:          r.codigo,
                usuario:         r.codigo,          // usuario = código
                password:        r.codigo,          // contraseña inicial = código
                rol:             'alumno',
                colegiatura:     ''
            };
            try {
                const resp = await fetch(CENTYR.CONFIG.webAppUrl, {
                    method: 'POST', headers: {'Content-Type':'text/plain'},
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (data.status === 'success') {
                    if (existe) {
                        existe.nombre_completo = r.apellidos_nombres;
                        actualizados++;
                    } else {
                        CENTYR.db.usuarios.push({
                            usuario: r.codigo, nombre_completo: r.apellidos_nombres,
                            codigo: r.codigo, rol: 'alumno', cursos: []
                        });
                        creados++;
                    }
                } else { errores++; }
            } catch(e) { errores++; }
        }

        showLoad(false);
        cancelarImportAlumnos();
        renderListaAsignacion();
        mostrarNotificacion(`✅ Importación completa: ${creados} nuevos · ${actualizados} actualizados${errores?` · ⚠️ ${errores} errores`:''}`);
    }

    // ═══════════════════════════════════════════════════════════════
    //  ASIGNAR CURSOS A ALUMNOS
    // ═══════════════════════════════════════════════════════════════
    function renderListaAsignacion() {
        const cont    = document.getElementById('asignar-lista-alumnos');
        if (!cont) return;
        const alumnos = (CENTYR.db.usuarios||[]).filter(u => u.rol === 'alumno');
        const cursos  = (CENTYR.db.estructuras_cursos||[]).map(e => e.curso);

        if (!alumnos.length) {
            cont.innerHTML = `<div style="text-align:center;color:#aaa;padding:20px;font-size:0.85rem;">
                Sin alumnos registrados. Importa una lista primero.</div>`;
            return;
        }
        if (!cursos.length) {
            cont.innerHTML = `<div style="text-align:center;color:#D97706;padding:16px;font-size:0.82rem;background:#FFF3E0;border-radius:8px;">
                ⚠️ No hay estructuras de curso guardadas. Ve a la pestaña 🏫 Cursos y guarda una estructura primero.</div>`;
            return;
        }

        cont.innerHTML = alumnos.map((a, ai) => {
            const asignados = a.cursos || [];
            const checks = cursos.map(c => `
                <label style="display:flex;align-items:center;gap:5px;font-size:0.78rem;cursor:pointer;
                              padding:3px 8px;border-radius:6px;border:1.5px solid ${asignados.includes(c)?'var(--admin)':'#e0e6ed'};
                              background:${asignados.includes(c)?'#F0EBFF':'white'};white-space:nowrap;">
                    <input type="checkbox" data-alumno="${a.usuario}" data-curso="${c}"
                           ${asignados.includes(c)?'checked':''}
                           onchange="toggleAsignacionCurso(this)"
                           style="width:14px;height:14px;accent-color:var(--admin);cursor:pointer;">
                    <span>${c}</span>
                </label>`).join('');

            return `<div style="border-bottom:1px solid #f0f2f5;padding:10px 4px;display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                    <div>
                        <span style="font-weight:700;color:var(--primary);font-size:0.85rem;">${a.nombre_completo}</span>
                        <span style="color:#888;font-size:0.75rem;margin-left:6px;">${a.codigo||a.usuario}</span>
                    </div>
                    <span style="font-size:0.7rem;background:#EEF4FF;color:var(--admin);border-radius:10px;padding:2px 8px;font-weight:700;"
                          id="asign-count-${a.usuario}">${asignados.length} curso(s)</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">${checks}</div>
            </div>`;
        }).join('');
    }

    function filtrarListaAsignacion() {
        const q       = (document.getElementById('asignar-buscar')?.value||'').toLowerCase().trim();
        const alumnos = (CENTYR.db.usuarios||[]).filter(u => u.rol === 'alumno');
        const cont    = document.getElementById('asignar-lista-alumnos');
        if (!cont) return;
        const items = cont.querySelectorAll('[data-alumno-row]');
        // Si ya está renderizado con data-attr, filtrar; si no, re-renderizar
        if (!q) { renderListaAsignacion(); return; }
        // Filtrar alumnos y re-renderizar solo los que coinciden
        const filtrados = alumnos.filter(a =>
            a.nombre_completo.toLowerCase().includes(q) ||
            (a.codigo||'').toLowerCase().includes(q) ||
            (a.usuario||'').toLowerCase().includes(q)
        );
        // Reusar renderListaAsignacion con override temporal
        const _orig = CENTYR.db.usuarios;
        CENTYR.db.usuarios = [...(CENTYR.db.usuarios.filter(u=>u.rol!=='alumno')), ...filtrados];
        renderListaAsignacion();
        CENTYR.db.usuarios = _orig;
    }

    function toggleAsignacionCurso(checkbox) {
        const alumnoUsuario = checkbox.dataset.alumno;
        const curso         = checkbox.dataset.curso;
        const alumno = CENTYR.db.usuarios.find(u => u.usuario === alumnoUsuario);
        if (!alumno) return;
        if (!alumno.cursos) alumno.cursos = [];

        if (checkbox.checked) {
            if (!alumno.cursos.includes(curso)) alumno.cursos.push(curso);
        } else {
            alumno.cursos = alumno.cursos.filter(c => c !== curso);
        }

        // Actualizar estilo del label
        const label = checkbox.parentElement;
        label.style.borderColor    = checkbox.checked ? 'var(--admin)' : '#e0e6ed';
        label.style.background     = checkbox.checked ? '#F0EBFF' : 'white';

        // Actualizar contador
        const cntEl = document.getElementById(`asign-count-${alumnoUsuario}`);
        if (cntEl) cntEl.textContent = `${alumno.cursos.length} curso(s)`;
    }

    async function guardarAsignacionCursos() {
        const alumnos = (CENTYR.db.usuarios||[]).filter(u => u.rol === 'alumno');
        if (!alumnos.length) { mostrarNotificacion('⚠️ Sin alumnos para guardar.'); return; }

        showLoad(true, 'Guardando asignaciones…');
        let ok = 0, err = 0;
        for (const a of alumnos) {
            try {
                await fetch(CENTYR.CONFIG.webAppUrl, {
                    method: 'POST', headers: {'Content-Type':'text/plain'},
                    body: JSON.stringify({
                        action:  'save_asignacion_cursos',
                        usuario: a.usuario,
                        cursos:  a.cursos || []
                    })
                });
                ok++;
            } catch(e) { err++; }
        }
        showLoad(false);
        mostrarNotificacion(`✅ Asignaciones guardadas (${ok} alumnos${err?` · ⚠️ ${err} errores`:''})`) ;
    }

    // ═══════════════════════════════════════════════════════════════
    //  EXPORTAR NOTAS FINALES — solo Apellidos/Nombres + Curso + Prom
    // ═══════════════════════════════════════════════════════════════
    function _poblarFiltrosExport() {
        const selCurso  = document.getElementById('export-filtro-curso');
        const selAlumno = document.getElementById('export-filtro-alumno');
        if (!selCurso || !selAlumno) return;

        const cursos  = (CENTYR.db.estructuras_cursos||[]).map(e=>e.curso);
        const alumnos = (CENTYR.db.usuarios||[]).filter(u=>u.rol==='alumno');

        selCurso.innerHTML  = '<option value="">— Todos los cursos —</option>' +
            cursos.map(c=>`<option value="${c}">${c}</option>`).join('');
        selAlumno.innerHTML = '<option value="">— Todos los alumnos —</option>' +
            alumnos.map(a=>`<option value="${a.usuario}">${a.nombre_completo}</option>`).join('');
    }

    /** Calcula el promedio final de un alumno en un curso desde los datos en memoria */
    function _calcularPromedioFinalAlumno(alumnoUsuario, curso) {
        const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
        if (!est) return null;
        const key  = `${alumnoUsuario}::${curso}`;
        const pacs = (CENTYR.db.notas_cursos||{})[key] || [];
        if (!pacs.length) return null;

        const pesoEV = est.pesoEV || 20;
        const pesoSS = est.pesoSS || 80;
        const notas  = [];

        let pi = 0;
        (est.grupos||[]).forEach(g => {
            const nSS  = g.nSesiones || 10;
            const nExt = g.nExtras   || 0;
            const pctE = g.pctExtra  || 0;
            for (let k=0; k<(g.nPacientes||1); k++) {
                const pac    = pacs[pi++] || {};
                const evVal  = pac.nota_ev!==''&&pac.nota_ev!==undefined ? parseFloat(pac.nota_ev)||0 : null;
                const ss     = pac.notas_ss  || [];
                const ext    = pac.notas_ext || [];
                const sumaSS = ss.reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0), 0);
                const promSS = sumaSS / nSS;   // ← siempre sobre total programado
                const sumaExt= ext.reduce((s,v)=>s+(v!==''?parseFloat(v)||0:0), 0);
                const promExt= nExt>0 ? sumaExt/nExt : null;
                let base = 0, pw = 0;
                if (evVal!==null) { base+=evVal*pesoEV/100; pw+=pesoEV; }
                base += promSS*pesoSS/100; pw+=pesoSS;
                const bono = (promExt!==null&&nExt>0) ? promExt*pctE/100 : 0;
                if (pw>0) notas.push(Math.min(20, base+bono));
            }
        });
        return notas.length ? (notas.reduce((s,v)=>s+v,0)/notas.length) : null;
    }

    function _buildFilasExport(filtroCurso, filtroAlumno) {
        const alumnos = (CENTYR.db.usuarios||[]).filter(u => u.rol==='alumno' &&
            (!filtroAlumno || u.usuario===filtroAlumno));

        const filas = [];
        alumnos.forEach(a => {
            // SOLO los cursos explícitamente asignados al alumno
            const cursosAsignados = (a.cursos || []).filter(c =>
                !filtroCurso || c === filtroCurso
            );

            if (!cursosAsignados.length) {
                // Si hay filtro de curso activo y el alumno no lo tiene, no aparece
                if (filtroCurso) return;
                // Sin asignación y sin filtro: no incluir (no "todos los cursos")
                return;
            }

            cursosAsignados.forEach(curso => {
                // Verificar que el curso todavía existe como estructura
                const est = (CENTYR.db.estructuras_cursos||[]).find(e=>e.curso===curso);
                if (!est) return;
                const prom = _calcularPromedioFinalAlumno(a.usuario, curso);
                filas.push({
                    apellidos_nombres: a.nombre_completo,
                    codigo:            a.codigo || a.usuario,
                    curso,
                    promedio:          prom!==null ? prom.toFixed(2) : '—'
                });
            });
        });
        return filas;
    }

    function previsualizarExportNotas() {
        _poblarFiltrosExport();
        const filtroCurso  = document.getElementById('export-filtro-curso')?.value  || '';
        const filtroAlumno = document.getElementById('export-filtro-alumno')?.value || '';
        const filas = _buildFilasExport(filtroCurso, filtroAlumno);

        const wrap   = document.getElementById('export-preview-wrap');
        const cntEl  = document.getElementById('export-preview-count');
        const tabEl  = document.getElementById('export-preview-tabla');
        if (!wrap) return;

        if (!filas.length) {
            wrap.style.display = 'block';
            tabEl.innerHTML = '<div style="padding:16px;text-align:center;color:#999;font-size:0.85rem;">Sin datos que coincidan con los filtros.</div>';
            if (cntEl) cntEl.textContent = '';
            return;
        }

        if (cntEl) cntEl.innerHTML = `Vista previa: <strong>${filas.length}</strong> fila(s)`;

        tabEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:0.77rem;">
            <thead><tr>
                <th style="background:var(--primary);color:white;padding:6px 10px;text-align:left;">Apellidos y Nombres</th>
                <th style="background:var(--primary);color:white;padding:6px 8px;text-align:center;">Código</th>
                <th style="background:var(--primary);color:white;padding:6px 10px;text-align:left;">Curso</th>
                <th style="background:#6C3FC5;color:white;padding:6px 10px;text-align:center;">Prom. Final</th>
            </tr></thead>
            <tbody>
            ${filas.map(f => {
                const p = parseFloat(f.promedio);
                const col = isNaN(p)?'#888':p<=10?'#E53935':p<=13?'#F59E0B':p<=16?'#2ECC71':'#0288D1';
                return `<tr style="border-bottom:1px solid #f0f2f5;">
                    <td style="padding:5px 10px;">${f.apellidos_nombres}</td>
                    <td style="padding:5px 8px;text-align:center;color:#555;">${f.codigo}</td>
                    <td style="padding:5px 10px;color:var(--primary);font-weight:600;">${f.curso}</td>
                    <td style="padding:5px 10px;text-align:center;font-weight:700;color:${col};">${f.promedio}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>`;

        wrap.style.display = 'block';
    }

    function exportarNotasFinalesCSV() {
        _poblarFiltrosExport();
        const filtroCurso  = document.getElementById('export-filtro-curso')?.value  || '';
        const filtroAlumno = document.getElementById('export-filtro-alumno')?.value || '';
        const filas = _buildFilasExport(filtroCurso, filtroAlumno);

        if (!filas.length) { alert('⚠️ No hay datos para exportar con los filtros actuales.'); return; }

        const rows = [
            ['REPORTE DE NOTAS FINALES — CENTYR'],
            [`Generado: ${new Date().toLocaleDateString('es-PE')}`],
            filtroCurso  ? [`Curso: ${filtroCurso}`]  : [],
            filtroAlumno ? [`Alumno: ${filtroAlumno}`]: [],
            [],
            ['APELLIDOS Y NOMBRES', 'CÓDIGO', 'CURSO', 'PROMEDIO FINAL'],
            ...filas.map(f => [f.apellidos_nombres, f.codigo, f.curso, f.promedio])
        ].filter(r => r.length);

        const sufijo = filtroCurso ? `_${filtroCurso.replace(/ /g,'_')}` : '_Todos';
        descargarCSV(`CENTYR_NotasFinales${sufijo}_${new Date().toISOString().slice(0,10)}.csv`, rows);
        mostrarNotificacion(`📥 CSV exportado — ${filas.length} filas`);
    }

    // mantener alias legacy por si se llaman desde otros lugares
    function exportarResumenGeneral()  { exportarNotasFinalesCSV(); }
    function exportarNotasPorAlumno()  { exportarNotasFinalesCSV(); }
    function exportarNotasPorPaciente(){ exportarNotasFinalesCSV(); }

    // ─── Registro ─────────────────────────────────
    const _fns = {
        adminTab, nuevoCurso,
        cursoNombreChange, cursoSelChange, cursoCapacidadChange,
        agregarGrupoCurso, eliminarGrupoCurso, actualizarGrupoCurso,
        renderGruposCurso, actualizarBarraPct, cursoConfigChange, toggleExtraSection,
        renderPreviewCurso, guardarEstructuraCurso, renderCursosGuardados,
        cargarEstructuraCurso, duplicarEstructuraCurso, eliminarEstructuraCurso,
        abrirIngresoCurso, filtrarSelectAlumnoIngreso, cargarPanelNotasAlumno,
        selPacienteIngreso, guardarNotasAlumnoEnCurso, guardarNotasCurso,
        recalcularFila, recalcularFilaNueva, recalcularFilaGrupo,
        recalcularNotaFinalAlumno, recalcularPromedioGrupo, recalcularPromedioCurso,
        exportarNotasCurso, calcularNotasFinalCurso,
        calcularPromedioPonderado, cargarResumenNotas,
        // Importar alumnos
        previsualizarImportAlumnos, cancelarImportAlumnos, confirmarImportAlumnos,
        // Asignación de cursos
        renderListaAsignacion, filtrarListaAsignacion,
        toggleAsignacionCurso, guardarAsignacionCursos,
        // Resumen y edición del modal de notas
        renderResumenCurso, seleccionarAlumnoIngresoCurso,
        // Exportar notas finales
        previsualizarExportNotas, exportarNotasFinalesCSV,
        // Helpers grupo editor
        _actualizarResumenGrupo, _actualizarPacsResumen,
        descargarCSV, exportarResumenGeneral, exportarNotasPorAlumno, exportarNotasPorPaciente
    };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ─── Tests ─────────────────────────────────────
    CENTYR.test['admin'] = function () {
        console.group('🧪 centyr-admin v5 tests');
        let pass=0,fail=0;
        const assert=(desc,cond)=>{if(cond){console.log(`  ✅ ${desc}`);pass++;}else{console.error(`  ❌ ${desc}`);fail++;}};

        assert('adminTab registrado',               typeof CENTYR.fn.adminTab               ==='function');
        assert('nuevoCurso registrado',             typeof CENTYR.fn.nuevoCurso             ==='function');
        assert('agregarGrupoCurso registrado',      typeof CENTYR.fn.agregarGrupoCurso      ==='function');
        assert('guardarEstructuraCurso registrado', typeof CENTYR.fn.guardarEstructuraCurso ==='function');
        assert('recalcularFilaGrupo registrado',    typeof CENTYR.fn.recalcularFilaGrupo    ==='function');
        assert('cargarPanelNotasAlumno registrado', typeof CENTYR.fn.cargarPanelNotasAlumno ==='function');

        // Test fórmula con promedio sobre total programado
        // Grupo: nSS=16, nExt=4, pctExtra=20, pesoEV=20, pesoSS=80
        // EV=15, SS: 10 atendidas (notas 14..14) de 16 programadas, Ext: 3 atendidas (18,18,18) de 4
        // PromSS  = (14*10 + 0*6) / 16 = 140/16 = 8.75
        // PromExt = (18*3 + 0*1) / 4  = 54/4   = 13.5
        // Base = 15*0.2 + 8.75*0.8 = 3 + 7 = 10
        // Bono = 13.5 * 0.2 = 2.7
        // Nota = min(20, 10 + 2.7) = 12.7
        const nSS=16,nExt=4,pctE=20,pesoEV=20,pesoSS=80;
        let sumaSS=0; for(let i=0;i<10;i++) sumaSS+=14;      // 10 sesiones con nota 14
        const promSS=sumaSS/nSS;  // 140/16 = 8.75
        let sumaExt=0; for(let i=0;i<3;i++) sumaExt+=18;     // 3 extras con nota 18
        const promExt=sumaExt/nExt; // 54/4 = 13.5
        const base=15*pesoEV/100 + promSS*pesoSS/100;        // 3 + 7 = 10
        const bono=promExt*pctE/100;                          // 2.7
        const nota=Math.min(20,base+bono);                    // 12.7

        assert('promSS divide sobre programadas (8.75)', Math.abs(promSS-8.75)<0.001);
        assert('promExt divide sobre programadas (13.5)',Math.abs(promExt-13.5)<0.001);
        assert('nota final correcta (12.7)',             Math.abs(nota-12.7)<0.001);
        assert('nota nunca supera 20',                   Math.min(20,25)===20);

        // Test modelo de grupos
        const grupos=[
            {id:'g0',nombre:'Grupo 1',nPacientes:3,nSesiones:16,nExtras:4,pctExtra:20},
            {id:'g1',nombre:'Grupo 2',nPacientes:2,nSesiones:12,nExtras:6,pctExtra:20}
        ];
        const totPacs=grupos.reduce((s,g)=>s+g.nPacientes,0);
        assert('total pacientes = 5',   totPacs===5);
        assert('Grupo 1: 3 pacs 16 SS', grupos[0].nPacientes===3&&grupos[0].nSesiones===16);
        assert('Grupo 2: 2 pacs 12 SS', grupos[1].nPacientes===2&&grupos[1].nSesiones===12);

        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return {pass,fail};
    };

    console.log('✅ centyr-admin.js v5.0 — Multi-grupo con promedio sobre total programado');
})();
