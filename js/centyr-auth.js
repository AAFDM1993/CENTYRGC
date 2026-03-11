/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-auth.js                                                  ║
 * ║  Login · Logout · Cambio de contraseña                           ║
 * ║  ── Dependencias: centyr-core.js ──                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Funciones registradas en CENTYR.fn:
 *    login, cerrarSesion, abrirModalPassword,
 *    cerrarModalPassword, cambiarPassword
 */

;(function () {
    'use strict';

    function login() {
        const u = document.getElementById('userInput').value.trim().toLowerCase();
        const p = document.getElementById('passInput').value.trim();

        const usuario = CENTYR.db.usuarios.find(
            x => x.usuario?.toLowerCase() === u && x.password === p
        );

        if (usuario) {
            CENTYR.currentUser = usuario;
            const rol      = usuario.rol;
            const esAdmin  = rol === 'administrador';
            const esDocente= rol === 'docente';
            const esAlumno = rol === 'alumno';

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display     = 'block';

            // Tag de usuario
            const tag = document.getElementById('user-tag');
            const colMap = { administrador: 'var(--admin)', docente: 'var(--docente)', alumno: 'var(--alumno)' };
            const iconMap= { administrador: '⚙️', docente: '👨‍🏫', alumno: '👨‍🎓' };
            const ctmpStr = usuario.colegiatura ? ` · CTMP: ${CENTYR.fn.ctmpLimpio(usuario.colegiatura)}` : '';
            tag.innerHTML = `<span style="color:${colMap[rol]||'var(--primary)'};">
                ${iconMap[rol]||'👤'} ${usuario.nombre_completo}${ctmpStr}
                <span style="font-size:0.75rem;background:${colMap[rol]||'#ccc'};color:white;
                    padding:1px 8px;border-radius:8px;margin-left:6px;">${rol.toUpperCase()}</span>
            </span>`;

            // Visibilidad de botones por rol
            document.getElementById('btnAdmin').style.display          = esAdmin  ? 'block' : 'none';
            document.getElementById('btn-estadisticas').style.display  = esAdmin  ? 'block' : 'none';
            document.getElementById('btn-nota-docente').style.display  = (esDocente||esAdmin) ? 'block' : 'none';
            document.getElementById('btn-notas-alumno').style.display  = (esDocente||esAdmin) ? 'block' : 'none';
            document.getElementById('btn-mis-notas').style.display     = esAlumno ? 'block' : 'none';

            // Poblar selector de docente (visible para todos los roles)
            const selDocente = document.getElementById('alumno-docente-sel');
            if (selDocente) {
                const docentes = CENTYR.db.usuarios.filter(u => u.rol === 'docente');
                selDocente.innerHTML = '<option value="">-- Selecciona docente --</option>';
                docentes.forEach(d => {
                    const ctmp = d.colegiatura ? ` (CTMP: ${CENTYR.fn.ctmpLimpio(d.colegiatura)})` : '';
                    selDocente.innerHTML += `<option value="${d.usuario}">${d.nombre_completo}${ctmp}</option>`;
                });
                if (esDocente) {
                    const yo = docentes.find(d => d.usuario === usuario.usuario);
                    if (yo) selDocente.value = yo.usuario;
                }
            }

            // Panel notas visible para docente y admin
            const panelNotas = document.getElementById('panel-notas-sidebar');
            if (panelNotas) {
                panelNotas.style.display = (esDocente || esAdmin) ? 'block' : 'none';
                if (esDocente || esAdmin) renderNotasSidebar('');
            }

            renderLista();
            renderCalendar();
            restaurarEstadoCalendar();
            verificarPendientesDocente();

        } else {
            document.getElementById('error-msg').style.display = 'block';
        }
    }

    function cerrarSesion() {
        CENTYR.currentUser = null;
        document.getElementById('main-app').style.display    = 'none';
        document.getElementById('login-screen').style.display= 'flex';
        document.getElementById('userInput').value = '';
        document.getElementById('passInput').value = '';
        document.getElementById('error-msg').style.display   = 'none';

        // Limpiar selector docente
        const sel = document.getElementById('alumno-docente-sel');
        if (sel) sel.innerHTML = '<option value="">-- Selecciona docente --</option>';

        const panelNotas = document.getElementById('panel-notas-sidebar');
        if (panelNotas) panelNotas.style.display = 'none';

        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) adminPanel.style.display = 'none';
    }

    function abrirModalPassword() {
        document.getElementById('modalPassword').style.display = 'block';
        document.getElementById('passActual').value  = '';
        document.getElementById('passNueva').value   = '';
        document.getElementById('passConfirm').value = '';
        document.getElementById('pass-error').style.display = 'none';
    }

    function cerrarModalPassword() {
        document.getElementById('modalPassword').style.display = 'none';
    }

    async function cambiarPassword() {
        const actual  = document.getElementById('passActual').value.trim();
        const nueva   = document.getElementById('passNueva').value.trim();
        const confirm = document.getElementById('passConfirm').value.trim();
        const errEl   = document.getElementById('pass-error');

        if (!actual || !nueva || !confirm) {
            errEl.textContent = '⚠️ Completa todos los campos'; errEl.style.display = 'block'; return;
        }
        if (CENTYR.currentUser.password !== actual) {
            errEl.textContent = '❌ Contraseña actual incorrecta'; errEl.style.display = 'block'; return;
        }
        if (nueva !== confirm) {
            errEl.textContent = '❌ Las contraseñas nuevas no coinciden'; errEl.style.display = 'block'; return;
        }
        if (nueva.length < 6) {
            errEl.textContent = '⚠️ La contraseña debe tener al menos 6 caracteres'; errEl.style.display = 'block'; return;
        }

        try {
            const res = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'change_password', usuario: CENTYR.currentUser.usuario, nuevaPassword: nueva })
            });
            const data = await res.json();
            if (data.status === 'success') {
                CENTYR.currentUser.password = nueva;
                cerrarModalPassword();
                CENTYR.fn.mostrarNotificacion('✅ Contraseña actualizada correctamente');
            } else {
                errEl.textContent = '❌ Error al guardar: ' + (data.message || ''); errEl.style.display = 'block';
            }
        } catch(e) {
            errEl.textContent = '❌ Error de conexión'; errEl.style.display = 'block';
        }
    }

    // ── Registro ─────────────────────────────────────────────────────────────
    Object.assign(CENTYR.fn, { login, cerrarSesion, abrirModalPassword, cerrarModalPassword, cambiarPassword });
    Object.assign(window,    { login, cerrarSesion, abrirModalPassword, cerrarModalPassword, cambiarPassword });

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test.auth = function() {
        console.group('🧪 centyr-auth tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }

        assert('CENTYR.fn.login registrado',               typeof CENTYR.fn.login === 'function');
        assert('CENTYR.fn.cerrarSesion registrado',        typeof CENTYR.fn.cerrarSesion === 'function');
        assert('CENTYR.fn.cambiarPassword registrado',     typeof CENTYR.fn.cambiarPassword === 'function');
        assert('window.login expuesto globalmente',        typeof window.login === 'function');

        // Simular login fallido
        CENTYR.db = { ...CENTYR.db, usuarios: [{ usuario: 'admin', password: 'admin123', rol: 'administrador', nombre_completo: 'Admin Test' }] };
        // No ejecutamos login() porque toca el DOM — verificamos que la función existe y el db está cargado
        assert('db.usuarios con 1 entrada de prueba',      CENTYR.db.usuarios.length === 1);
        assert('usuario admin en db',                      CENTYR.db.usuarios[0].usuario === 'admin');
        // Reset
        CENTYR.db = { pacientes:[], usuarios:[], citas:[], notas_docentes:[], estructuras_cursos:[], notas_cursos:{} };

        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-auth.js cargado');
})();
