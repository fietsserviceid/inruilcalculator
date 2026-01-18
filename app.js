
let APPDATA = null;
const fmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

async function load() {
  const res = await fetch('./data.json');
  APPDATA = await res.json();
  initUI();
}

function initUI(){
  const typeSel = document.getElementById('typeSelect');
  APPDATA.types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.type; opt.textContent = t.type; typeSel.appendChild(opt);
  });

  const states = Object.keys(APPDATA.cond_factors);
  const stateSel = document.getElementById('stateSelect');
  states.forEach(s => { const o = document.createElement('option'); o.value=s; o.textContent=s; stateSel.appendChild(o); });

  const accuStates = Object.keys(APPDATA.accu_state_factors);
  const accuSel = document.getElementById('accuStateSelect');
  accuStates.forEach(s => { const o = document.createElement('option'); o.value=s; o.textContent=s; accuSel.appendChild(o); });

  document.getElementById('typeSelect').addEventListener('change', onTypeChange);
  document.getElementById('hasAccuSelect').addEventListener('change', updateAccuVisibility);
  document.getElementById('calcBtn').addEventListener('click', calculate);
  document.getElementById('printOfferBtn').addEventListener('click', showOffer);

  onTypeChange();
  updateAccuVisibility();
  document.getElementById('year').textContent = new Date().getFullYear();
}

function onTypeChange(){
  const t = document.getElementById('typeSelect').value;
  const brands = APPDATA.brands[t] || {};
  const brandSel = document.getElementById('brandSelect');
  brandSel.innerHTML = '';
  Object.keys(brands).forEach(b => {
    const o = document.createElement('option'); o.value=b; o.textContent=b; brandSel.appendChild(o);
  });
  if(!brandSel.value && brandSel.options.length>0) brandSel.value = brandSel.options[0].value;

  // ref price hint
  const tcfg = APPDATA.types.find(x => x.type===t);
  const hint = document.getElementById('refPriceHint');
  hint.textContent = `Referentie nieuwprijs voor ${t}: € ${Math.round(tcfg.ref_price).toLocaleString('nl-NL')}`;
}

function updateAccuVisibility(){
  const wrap = document.getElementById('accuStateWrap');
  const t = document.getElementById('typeSelect').value;
  const tcfg = APPDATA.types.find(x => x.type===t);
  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if(override==='ja') hasAccu = true; else if(override==='nee') hasAccu = false;
  wrap.style.display = hasAccu ? 'flex' : 'none';
}

function calculate(){
  const t = document.getElementById('typeSelect').value;
  const brand = document.getElementById('brandSelect').value;
  const state = document.getElementById('stateSelect').value;
  const accuState = document.getElementById('accuStateSelect').value;
  const age = Math.max(0, Math.min(15, parseInt(document.getElementById('ageInput').value || '0', 10)));
  const priceInput = document.getElementById('priceInput').value;

  const tcfg = APPDATA.types.find(x => x.type===t);
  const price = priceInput ? parseFloat(priceInput) : tcfg.ref_price;

  // hasAccu decision
  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if(override==='ja') hasAccu = true; else if(override==='nee') hasAccu = false;

  const ageFactor = APPDATA.restwaarde.zonderaccu[age] ?? 0; // leeftijdsfactor gebaseerd op basisfiets (zoals in Excel)
  const condFactor = APPDATA.cond_factors[state] ?? 1;
  const accuFactor = hasAccu ? (APPDATA.accu_state_factors[accuState] ?? 1) : 1;
  const brandFactor = (APPDATA.brands[t] && APPDATA.brands[t][brand]) ? APPDATA.brands[t][brand] : (APPDATA.brands[t]?.Overig ?? 0.85);

  let value = price * ageFactor * condFactor * accuFactor * brandFactor;
  const rounded = Math.round(value);

  document.getElementById('resultValue').textContent = fmt.format(rounded);
  document.getElementById('resultCard').hidden = false;

  document.getElementById('factorAge').textContent = ageFactor.toLocaleString('nl-NL');
  document.getElementById('factorState').textContent = condFactor.toLocaleString('nl-NL');
  document.getElementById('factorAccu').textContent = accuFactor.toLocaleString('nl-NL');
  document.getElementById('factorBrand').textContent = brandFactor.toLocaleString('nl-NL');

  // fill offer fields ready
  document.getElementById('offerType').textContent = t;
  document.getElementById('offerBrand').textContent = brand;
  document.getElementById('offerState').textContent = state + (hasAccu?`, accustaat: ${accuState}`:'');
  document.getElementById('offerAge').textContent = `${age} jaar`;
  document.getElementById('offerTotal').textContent = fmt.format(rounded);
  const d = new Date();
  const pad=n=>String(n).padStart(2,'0');
  document.getElementById('offerDate').textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function showOffer(){
  document.getElementById('offerCard').scrollIntoView({behavior:'smooth'});
  document.getElementById('offerCard').classList.add('print');
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});

window.addEventListener('load', load);
