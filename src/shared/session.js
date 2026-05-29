// Sesión de usuario, autenticación, timer de evaluación y borradores de formulario

const SK = 'centyr_hc_s';
const TTL = 6*60*60*1000;
let session = null;

function loadSess(){
  try{
    const s=JSON.parse(localStorage.getItem(SK)||'null');
    if(!s||Date.now()-s.ts>TTL){localStorage.removeItem(SK);return null;}
    return s;
  }catch{return null;}
}
function saveSess(s){localStorage.setItem(SK,JSON.stringify({...s,ts:Date.now()}));}

async function doLogin(){
  const cod=(g('lgCod')?.value||'').trim(),pass=(g('lgPass')?.value||'').trim();
  if(!cod||!pass){g('lgErr').textContent='Completa los campos';g('lgErr').style.display='block';return;}
  g('lgErr').style.display='none';
  const r=await apiGet('login',{codigo:cod,password:pass,token:''});
  if(!r.ok){g('lgErr').textContent=r.error||'Error';g('lgErr').style.display='block';return;}
  session={token:r.token,rol:r.rol,nombre:r.nombre,codigo:r.codigo||cod};
  saveSess(session); iniciarApp();
}
function doLogout(){localStorage.removeItem(SK);session=null;g('appPage').style.display='none';g('lgPage').classList.add('on');}

const TIMER_MS  = 30 * 60 * 1000;
const TIMER_KEY = 'hc_eval_timer';

function timerGuardar(evalId, pacId, catId, startTime){
  try{ localStorage.setItem(TIMER_KEY, JSON.stringify({evalId, pacId, catId, startTime: startTime||Date.now()})); }catch(e){}
}
function timerCargar(){
  try{ var r=localStorage.getItem(TIMER_KEY); return r?JSON.parse(r):null; }catch(e){ return null; }
}
function timerBorrar(){
  try{ localStorage.removeItem(TIMER_KEY); }catch(e){}
}

const DRAFT_KEY = (pacId, catId) => 'hc_draft_' + pacId + '_' + catId;

function draftGuardar(pacId, catId) {
  try {
    var datos = typeof recogerDatosFormulario === 'function' ? recogerDatosFormulario() : null;
    if (!datos) return;
    localStorage.setItem(DRAFT_KEY(pacId, catId), JSON.stringify({ ts: Date.now(), datos: datos }));
  } catch(e) {}
}
function draftCargar(pacId, catId) {
  try {
    var raw = localStorage.getItem(DRAFT_KEY(pacId, catId));
    if (!raw) return null;
    var d = JSON.parse(raw);
    if (Date.now() - d.ts > 86400000) { localStorage.removeItem(DRAFT_KEY(pacId, catId)); return null; }
    return d.datos;
  } catch(e) { return null; }
}
function draftBorrar(pacId, catId) {
  try { localStorage.removeItem(DRAFT_KEY(pacId, catId)); } catch(e) {}
}
