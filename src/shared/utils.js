// Utilidades puras: DOM helpers, escape, overlays, formato de fechas

const g = id => document.getElementById(id);
const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const e2 = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg, sub, tipo='ok'){
  const d=document.createElement('div');
  d.className='t-item '+tipo;
  d.innerHTML=`<strong>${e2(msg)}</strong>${sub?`<div style="font-size:11px;opacity:.8;margin-top:2px">${e2(sub)}</div>`:''}`;
  g('hcToast').appendChild(d);
  setTimeout(()=>d.remove(),3500);
}

var _busy = false;
function tryLock(){
  if(_busy) return false;
  _busy = true;
  return true;
}
function showSendOverlay(txt, sub){
  _busy = true;
  var ov=g('hcSendOverlay');
  var t=g('hcSendOverlayTxt');
  var s=g('hcSendOverlaySub');
  if(t) t.textContent=txt||'Enviando...';
  if(s) s.textContent=sub||'';
  if(ov){ ov.style.display='flex'; }
}
function hideSendOverlay(){
  _busy = false;
  var ov=g('hcSendOverlay');
  if(ov){ ov.style.opacity='1'; ov.style.transition='opacity .3s'; ov.style.opacity='0';
    setTimeout(function(){ ov.style.display='none'; ov.style.opacity='1'; },320); }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function _limpiarFecha(raw){
  // Elimina sufijos de zona horaria con paréntesis: "GMT-0500 (hora estándar de Perú)"
  return String(raw).replace(/\s*\([^)]*\)\s*$/,'').trim();
}
function formatFecha(raw){
  if(!raw) return '';
  var s=_limpiarFecha(raw);
  var d;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) d=new Date(s+'T12:00:00');
  else d=new Date(s);
  if(isNaN(d.getTime())){
    var m=s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m) d=new Date(m[3].length===2?'20'+m[3]:m[3],m[2]-1,m[1]);
    else return s;
  }
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var yy=String(d.getFullYear()).slice(-2);
  var h=d.getHours();
  var mi=String(d.getMinutes()).padStart(2,'0');
  var ap=h>=12?'PM':'AM';
  h=h%12||12;
  return dd+'/'+mm+'/'+yy+' '+h+':'+mi+' '+ap;
}
function formatFechaCorta(raw){
  if(!raw) return '';
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  var s=_limpiarFecha(raw);
  var d;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) d=new Date(s+'T12:00:00');
  else d=new Date(s);
  if(isNaN(d.getTime())){
    var m=s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(m) d=new Date((m[3].length===2?'20'+m[3]:m[3])+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0')+'T12:00:00');
    else return s;
  }
  var dd=String(d.getDate()).padStart(2,'0');
  var mm=String(d.getMonth()+1).padStart(2,'0');
  var yyyy=d.getFullYear();
  return dd+'/'+mm+'/'+yyyy;
}
function formatHora12(raw){
  if(!raw) return '';
  var m=String(raw).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
  if(!m) return '';
  var h=parseInt(m[1],10);
  var ap=h>=12?'PM':'AM';
  var h12=h%12; if(h12===0) h12=12;
  return String(h12).padStart(2,'0')+':'+m[2]+' '+ap;
}
function edad(fn){
  const d=new Date(fn),h=new Date();
  let a=h.getFullYear()-d.getFullYear();
  if(h<new Date(h.getFullYear(),d.getMonth(),d.getDate()))a--;
  return isNaN(a)?'':a;
}
