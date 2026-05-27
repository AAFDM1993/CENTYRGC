// ── Utilidades base de index.html ──────────────────────────────────────────
// GAS_URL: URL de Google Apps Script para index.html (gestión académica)
// IMPORTANTE: este archivo es específico de index.html; hc.html usa api.js con HC_URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz_5ux4CU4JVIuE24eidR5M3tWOU3veMXlnbi06_hLBVil7DyVYjI5jrazr-NgpxtiKtg/exec';

// ── Modal confirm (reemplaza window.confirm para evitar supresión del navegador) ──
function confirmDialog(msg){
  return new Promise(function(resolve){
    var ov=document.getElementById('confirmOverlay');
    document.getElementById('confirmMsg').textContent=msg;
    ov.style.display='flex';
    function cleanup(val){
      ov.style.display='none';
      document.getElementById('confirmYes').removeEventListener('click',onYes);
      document.getElementById('confirmNo').removeEventListener('click',onNo);
      resolve(val);
    }
    function onYes(){cleanup(true);}
    function onNo(){cleanup(false);}
    document.getElementById('confirmYes').addEventListener('click',onYes);
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
