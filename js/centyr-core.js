/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-core.js                                                  ║
 * ║  Estado global · init · carga de datos · utilidades base         ║
 * ║  ── Dependencias: ninguna (primer módulo en cargarse) ──          ║
 * ║  ── Expone: window.CENTYR (contrato único entre módulos) ──       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  CONTRATO window.CENTYR
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  CENTYR.db            → datos cargados desde Google Sheets  │
 *  │  CENTYR.currentUser   → usuario logueado (null si no hay)   │
 *  │  CENTYR.cursoGrupos   → estado del editor de cursos (admin) │
 *  │  CENTYR.CONFIG        → configuración global (webAppUrl)    │
 *  │  CENTYR.test.core()   → ejecuta pruebas de este módulo      │
 *  └─────────────────────────────────────────────────────────────┘
 */

;(function () {
    'use strict';

    // ── Estado interno (privado al módulo) ──────────────────────────────────
    let _db = {
        pacientes: [], usuarios: [], citas: [],
        notas_docentes: [], estructuras_cursos: [], notas_cursos: {}
    };
    let _currentUser  = null;
    let _cursoGrupos  = [];
    let _selectedDni  = '';
    let _currentDate  = new Date();
    let _selectedDate = null;

    // ── Contrato público window.CENTYR ──────────────────────────────────────
    window.CENTYR = {
        CONFIG: {
            webAppUrl: 'https://script.google.com/macros/s/AKfycbwn3aGXD3c_eS7Y3k2g8y9lpsAwISbAsC7HcYEU2byFIq4FmXKam7lXwZKdpFRY-8Ar/exec'
        },

        // Getters/setters para estado
        get db()           { return _db; },
        set db(v)          { _db = v; },
        get currentUser()  { return _currentUser; },
        set currentUser(v) { _currentUser = v; },
        get cursoGrupos()  { return _cursoGrupos; },
        set cursoGrupos(v) { _cursoGrupos = v; },
        get selectedDni()  { return _selectedDni; },
        set selectedDni(v) { _selectedDni = v; },
        get currentDate()  { return _currentDate; },
        set currentDate(v) { _currentDate = v; },
        get selectedDate() { return _selectedDate; },
        set selectedDate(v){ _selectedDate = v; },

        // ── Funciones de módulos (se registran desde cada módulo) ───────────
        // Ejemplo de uso: CENTYR.fn.login(), CENTYR.fn.guardar(), etc.
        fn:   {},
        test: {}   // CENTYR.test.core(), CENTYR.test.auth(), etc.
    };

    // ── Utilidades base (disponibles inmediatamente tras cargar core) ────────

    function ctmpLimpio(val) {
        if (!val) return '';
        return String(val).replace(/^CTMP\s*/i, '').trim();
    }

    function formatearFecha(fechaStr) {
        if (fechaStr && fechaStr.includes('/') &&
           (fechaStr.includes('AM') || fechaStr.includes('PM'))) return fechaStr;
        try {
            const f = new Date(fechaStr);
            const dd = String(f.getDate()).padStart(2,'0');
            const mm = String(f.getMonth()+1).padStart(2,'0');
            const yy = String(f.getFullYear()).slice(-2);
            let h = f.getHours();
            const min = String(f.getMinutes()).padStart(2,'0');
            const ap  = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${dd}/${mm}/${yy} ${String(h).padStart(2,'0')}:${min} ${ap}`;
        } catch(e) { return fechaStr; }
    }

    function showLoad(mostrar, texto = 'Cargando...') {
        const el = document.getElementById('loading-text');
        if (el) el.innerText = texto;
        const ld = document.getElementById('loading');
        if (ld) ld.style.display = mostrar ? 'flex' : 'none';
    }

    function mostrarNotificacion(mensaje) {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--accent);color:white;' +
            'padding:15px 25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);' +
            'z-index:10000;animation:slideIn .3s ease';
        n.innerText = mensaje;
        document.body.appendChild(n);
        setTimeout(() => {
            n.style.animation = 'slideOut .3s ease';
            setTimeout(() => n.parentNode && n.parentNode.removeChild(n), 300);
        }, 2500);
    }

    function mostrarLoginScreen() {
        document.getElementById('loading').style.display      = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display     = 'none';
    }

    // ── Modal de notas de evolución ──────────────────────────────────────────
    function abrirModalNotas() {
        const notasActuales = document.getElementById('notas').value;
        const cur = CENTYR.currentUser;
        if ((cur.rol === 'alumno' || cur.rol === 'profesional') && !notasActuales.trim()) {
            const docentes   = CENTYR.db.usuarios.filter(u => u.rol === 'docente');
            const docenteInfo = docentes.length
                ? `${docentes[0].nombre_completo}${docentes[0].colegiatura ? ' - CTMP: ' + ctmpLimpio(docentes[0].colegiatura) : ''}`
                : 'Por asignar';
            const cabecera = `ALUMNO: ${cur.nombre_completo}\nCÓDIGO: ${cur.codigo || 'N/A'}\nDOCENTE: ${docenteInfo}\n-------------------------------------------\n`;
            document.getElementById('editor-notas').value = cabecera;
            document.getElementById('notas').value        = cabecera;
        } else {
            document.getElementById('editor-notas').value = notasActuales;
        }
        document.getElementById('modalNotas').style.display = 'block';
    }

    function cerrarModalNotas() {
        document.getElementById('modalNotas').style.display = 'none';
    }

    function guardarNotasModal() {
        const v = document.getElementById('editor-notas').value;
        document.getElementById('notas').value = v;
        const prev = document.getElementById('preview-notas');
        if (v.trim()) {
            prev.innerHTML = v.substring(0, 200) + (v.length > 200 ? '...' : '');
            prev.style.color = '#333';
        } else {
            prev.innerHTML  = '<em>Haz clic en "ABRIR EDITOR DE NOTAS" para escribir...</em>';
            prev.style.color = '#666';
        }
        cerrarModalNotas();
        mostrarNotificacion('✅ Notas guardadas en el editor');
    }

    // ── Carga de datos desde Google Apps Script ──────────────────────────────
    function init() { cargarDatos(); }

    async function cargarDatos(mostrarCarga = true) {
        if (mostrarCarga) showLoad(true, 'Cargando sistema...');

        const timeout = new Promise((_, rej) =>
            setTimeout(() => rej(new Error('Tiempo de espera agotado. Verifica la URL del Web App.')), 12000));

        try {
            const res  = await Promise.race([
                fetch(`${CENTYR.CONFIG.webAppUrl}?action=loadData`), timeout]);
            if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            CENTYR.db = {
                pacientes:         (data.pacientes || []).map(p => ({ ...p, dni: String(p.dni||''), id: String(p.id||'') })),
                usuarios:          data.usuarios          || [],
                citas:             data.citas             || [],
                notas_docentes:    (data.notas_docentes || []).map(n => ({ ...n, calificacion: parseFloat(n.calificacion)||0, id: String(n.id||'') })),
                estructuras_cursos: data.estructuras_cursos?.length ? data.estructuras_cursos : [],
                notas_cursos:      data.notas_cursos || {}
            };

            if (mostrarCarga) {
                showLoad(false);
                mostrarLoginScreen();
            } else {
                if (CENTYR.currentUser) {
                    renderLista();
                    verificarPendientesDocente();
                }
            }
        } catch (err) {
            console.error('cargarDatos:', err);
            if (mostrarCarga) {
                showLoad(false);
                mostrarLoginScreen();
                const av = document.createElement('div');
                av.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);' +
                    'background:#e74c3c;color:white;padding:10px 22px;border-radius:8px;z-index:99999;font-size:.9rem;';
                av.innerHTML = `⚠️ Sin conexión al servidor — modo sin datos<br><small>${err.message}</small>`;
                document.body.appendChild(av);
                setTimeout(() => av.remove(), 6000);
            }
        }
    }

    // ── Cerrar modales al hacer clic fuera ───────────────────────────────────
    window.addEventListener('click', function(e) {
        const ids = ['modalPassword','modalCita','modalEstadisticas','modalNotaDocente','modalCursos'];
        ids.forEach(id => {
            const m = document.getElementById(id);
            if (m && e.target === m) {
                if (id === 'modalPassword')    cerrarModalPassword();
                else if (id === 'modalCita')   cerrarModalCita();
                else m.style.display = 'none';
            }
        });
    });

    // ── Registro de funciones en CENTYR.fn ──────────────────────────────────
    Object.assign(CENTYR.fn, {
        ctmpLimpio, formatearFecha, showLoad, mostrarNotificacion,
        mostrarLoginScreen, abrirModalNotas, cerrarModalNotas,
        guardarNotasModal, init, cargarDatos
    });

    // ── También exponer globalmente (compatibilidad con HTML inline onclicks) ─
    Object.assign(window, CENTYR.fn);

    // ── Tests del módulo ─────────────────────────────────────────────────────
    CENTYR.test.core = function() {
        console.group('🧪 centyr-core tests');
        let pass = 0, fail = 0;

        function assert(desc, condition) {
            if (condition) { console.log(`  ✅ ${desc}`); pass++; }
            else           { console.error(`  ❌ ${desc}`); fail++; }
        }

        // Estado inicial
        assert('CENTYR existe en window',         typeof window.CENTYR === 'object');
        assert('CENTYR.db tiene pacientes[]',      Array.isArray(CENTYR.db.pacientes));
        assert('CENTYR.currentUser es null',       CENTYR.currentUser === null);
        assert('CENTYR.CONFIG.webAppUrl definida', typeof CENTYR.CONFIG.webAppUrl === 'string' && CENTYR.CONFIG.webAppUrl.length > 0);
        assert('CENTYR.fn.ctmpLimpio existe',      typeof CENTYR.fn.ctmpLimpio === 'function');
        assert('CENTYR.fn.showLoad existe',        typeof CENTYR.fn.showLoad === 'function');
        assert('CENTYR.fn.cargarDatos existe',     typeof CENTYR.fn.cargarDatos === 'function');

        // Lógica de ctmpLimpio
        assert('ctmpLimpio("CTMP 1234") → "1234"',         ctmpLimpio('CTMP 1234')    === '1234');
        assert('ctmpLimpio("ctmp1234") → "1234"',           ctmpLimpio('ctmp1234')     === '1234');
        assert('ctmpLimpio("") → ""',                       ctmpLimpio('')             === '');
        assert('ctmpLimpio(null) → ""',                     ctmpLimpio(null)           === '');
        assert('ctmpLimpio("CTMP  5678") → "5678"',         ctmpLimpio('CTMP  5678')   === '5678');

        // Setters/getters del estado
        CENTYR.currentUser = { usuario: 'test', rol: 'admin' };
        assert('setter currentUser funciona',               CENTYR.currentUser.usuario === 'test');
        CENTYR.currentUser = null;
        assert('reset currentUser a null',                  CENTYR.currentUser === null);

        CENTYR.db = { ...CENTYR.db, usuarios: [{ usuario: 'a' }] };
        assert('setter db funciona',                        CENTYR.db.usuarios.length === 1);
        CENTYR.db = { pacientes:[], usuarios:[], citas:[], notas_docentes:[], estructuras_cursos:[], notas_cursos:{} };

        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-core.js cargado — CENTYR disponible en window');
})();
