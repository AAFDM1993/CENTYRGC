// Capa de comunicación con Google Apps Script

const HC_URL = 'https://script.google.com/macros/s/AKfycbzdPG8eTP9qqWqMDiVWK6-aosYnt5q9BHMSQtJZjmdfkI7TS0KusMExR1q5Sssr2L3v/exec';

const _cache = new Map();
const _CACHE_TTL = {
  listarPacientes: 30000, listarCategorias: 300000,
  listarUsuarios: 60000,  obtenerPaciente: 20000,
  listarEvaluaciones: 15000, listarSesiones: 15000,
  pendientesRevision: 10000
};
function _cacheKey(action, p){ return action+'|'+JSON.stringify(p); }
function invalidarCache(prefijos){
  (prefijos||[]).forEach(function(p){
    _cache.forEach(function(_,k){ if(k.startsWith(p)) _cache.delete(k); });
  });
}

async function apiGet(action, p={}){
  const ttl=_CACHE_TTL[action];
  const key=_cacheKey(action,p);
  if(ttl){
    const hit=_cache.get(key);
    if(hit&&Date.now()-hit.ts<ttl) return hit.data;
  }
  const u=new URL(HC_URL);
  u.searchParams.set('action',action);
  if(session) u.searchParams.set('token',session.token);
  Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  u.searchParams.set('_t', Date.now());
  const r=await fetch(u.toString());
  const data=await r.json();
  if(ttl&&data.ok!==false) _cache.set(key,{data,ts:Date.now()});
  return data;
}
async function apiPost(body){
  const r=await fetch(HC_URL,{method:'POST',headers:{'Content-Type':'text/plain'},
    body:JSON.stringify({...body,token:session?.token||''})});
  const data=await r.json();
  const a=body.action||'';
  if(a.includes('Paciente')) invalidarCache(['listarPacientes','obtenerPaciente']);
  if(a.includes('Evaluacion')||a.includes('evaluacion')) invalidarCache(['listarEvaluaciones','obtenerEvaluacion','listarPacientes','pendientesRevision']);
  if(a.includes('Sesion')||a.includes('sesion')) invalidarCache(['listarSesiones','listarPacientes','pendientesRevision']);
  if(a.includes('revisar')) invalidarCache(['listarEvaluaciones','listarSesiones','pendientesRevision','listarPacientes']);
  if(a.includes('Firma')||a.includes('Ctmp')) invalidarCache(['listarUsuarios']);
  if(a.includes('onsentimiento')) invalidarCache(['obtenerEvaluacion','listarEvaluaciones']);
  return data;
}
