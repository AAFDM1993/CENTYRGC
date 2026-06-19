// ── Utilidades base de index.html ──────────────────────────────────────────
// GAS_URL: URL de Google Apps Script para index.html (gestión académica)
// IMPORTANTE: este archivo es específico de index.html; hc.html usa api.js con HC_URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxTdrW_jnyAZadjB_3wVHt5o9zJXuTtg26aUjUeLnWtpcep3Y1gs0dqj4lWMz1V0RIlGw/exec';

// ── Modal info (aviso simple, solo botón "Entendido") ────────────────────────
function infoDialog(msg){
  return new Promise(function(resolve){
    var ov=document.getElementById('infoOverlay');
    document.getElementById('infoMsg').textContent=msg;
    ov.style.display='flex';
    function onOk(){
      ov.style.display='none';
      document.getElementById('infoOk').removeEventListener('click',onOk);
      resolve();
    }
    document.getElementById('infoOk').addEventListener('click',onOk);
  });
}

// ── Modal confirm (reemplaza window.confirm para evitar supresión del navegador) ──
// requireText opcional: si se pasa, exige escribir ese texto exacto antes de habilitar "Confirmar"
function confirmDialog(msg, requireText){
  return new Promise(function(resolve){
    var ov=document.getElementById('confirmOverlay');
    document.getElementById('confirmMsg').textContent=msg;
    var wrap=document.getElementById('confirmInputWrap');
    var inp=document.getElementById('confirmInput');
    var btnYes=document.getElementById('confirmYes');
    if(requireText){
      wrap.style.display='block'; inp.value=''; btnYes.disabled=true;
      inp.oninput=function(){btnYes.disabled = inp.value.trim()!==requireText;};
    } else {
      wrap.style.display='none'; btnYes.disabled=false; inp.oninput=null;
    }
    ov.style.display='flex';
    function cleanup(val){
      ov.style.display='none';
      btnYes.removeEventListener('click',onYes);
      document.getElementById('confirmNo').removeEventListener('click',onNo);
      resolve(val);
    }
    function onYes(){ if(requireText && inp.value.trim()!==requireText) return; cleanup(true); }
    function onNo(){ cleanup(false); }
    btnYes.addEventListener('click',onYes);
    document.getElementById('confirmNo').addEventListener('click',onNo);
  });
}

const APRO=()=>+(document.getElementById('scApro')||{}).value||11;
const g=s=>document.getElementById(s);
const vi=s=>(g(s)||{}).value||'';
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
const esc2=s=>String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function showLoader(m){g('lmsg').textContent=m;g('loader').classList.add('show')}
function hideLoader(){g('loader').classList.remove('show')}
let _tt;
function toast(t,m,tp){const el=g('toast');g('ttt').textContent=t;g('ttm').textContent=m||'';el.className='show '+(tp||'');clearTimeout(_tt);_tt=setTimeout(()=>{el.className=tp||''},3800)}
