// ── Capa API: fetch hacia GAS + cache en memoria ─────────────────────────
// Depende de: GAS_URL (core.js), session y saveSession (session.js)

async function apiGet(action,params){
  const p=Object.assign({action},params||{});
  if(session&&session.token)p.token=session.token;
  const r=await fetch(GAS_URL+'?'+new URLSearchParams(p));
  if(!r.ok)throw new Error('HTTP '+r.status);
  if(session)saveSession(session); // renovar timestamp al hacer actividad
  return r.json();
}
async function apiPost(body){
  if(session&&session.token)body.token=session.token;
  const r=await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}

// ── Cache de lecturas ─────────────────────────────────────────────────────
// Evita llamadas repetidas a GAS para datos que no cambian frecuentemente.
// TTLs: usuarios/hojas/config = 5-10 min, reservas/casilleros = 1 min
const _cache = {};
const _CACHE_TTL = {
  listarUsuarios:    5*60*1000,
  listarHojas:       5*60*1000,
  leerConfig:       10*60*1000,
  leerBranding:     10*60*1000,
  leerRecordInfo:    5*60*1000,
  listarCursosTodos: 5*60*1000,
  leerRecordsCursos: 5*60*1000,
  misNotas:          5*60*1000,
  leerHoja:          2*60*1000,
  leerReservas:         60*1000,
  leerBloqueos:         60*1000,
  listarCasilleros:     60*1000,
  leerLogCasilleros:    60*1000,
  leerLog:              60*1000,
};
function _cacheKey(action,params){return action+'|'+JSON.stringify(params||{});}
async function apiGetCached(action,params){
  const key=_cacheKey(action,params);
  const ttl=_CACHE_TTL[action]||0;
  if(ttl&&_cache[key]&&(Date.now()-_cache[key].ts<ttl))return _cache[key].data;
  const data=await apiGet(action,params);
  if(ttl)_cache[key]={data,ts:Date.now()};
  return data;
}
function invalidateCache(action){
  // Borra todas las entradas de cache que empiecen con esa action
  Object.keys(_cache).forEach(k=>{if(k.startsWith(action+'|'))delete _cache[k];});
}
