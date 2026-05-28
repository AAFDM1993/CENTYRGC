// ── Estado global de la aplicación ───────────────────────────────────────
// Estas variables son declaradas aquí y usadas por todos los scripts posteriores.
// session: datos del usuario autenticado (null = no autenticado)
// alumnos: lista de alumnos del generador de planillas
// saveTimers: timers de auto-guardado por alumno (objeto indexado por nombre)
// drawerIdx: índice del alumno actualmente en el drawer (-1 = ninguno)
// hojaActiva: nombre de la hoja de notas activa
// hojaData:  datos de la hoja activa (objeto con alumnos y config)
// cursos: configuración de cursos, persistida en localStorage
let session=null,alumnos=[],saveTimers={},drawerIdx=-1,hojaActiva=null,hojaData=null;
let cursos=JSON.parse(localStorage.getItem('ft_cursos_v6')||'[]');

// ── Gestión de sesión (localStorage) ─────────────────────────────────────
const SESSION_KEY='ft_session_v2';
const SESSION_TTL=6*60*60*1000; // 6 horas en ms

function saveSession(data){
  const payload={data:data,ts:Date.now()};
  localStorage.setItem(SESSION_KEY,JSON.stringify(payload));
}
function loadSession(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const payload=JSON.parse(raw);
    if(Date.now()-payload.ts>SESSION_TTL){
      localStorage.removeItem(SESSION_KEY);return null;
    }
    return payload.data;
  }catch(e){return null;}
}
function clearSession(){
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('ft_session'); // limpiar legacy
}
