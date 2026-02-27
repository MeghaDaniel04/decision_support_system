
// ── STATE ──────────────────────────────────────────────────────────────────────
const S = {
  decisionName: '',
  presetKey: null,
  alternatives: [],
  criteria: [],          
  benefit: {},           
  neighborPrefs: {},     
  scores: {},            
  results: null,
};

const API = () => document.getElementById('apiUrl').value.replace(/\/$/,'');

// ── PRESET DATA ────────────────────────────────────────────────────────────────
const PRESETS = {
  laptop:     { suggestions: ['Price','Performance','Battery Life','Build Quality','Display','Weight'], benefit: {'Price':false,'Performance':true,'Battery Life':true,'Build Quality':true,'Display':true,'Weight':false} },
  job:        { suggestions: ['Salary','Growth Opportunities','Work-Life Balance','Company Culture','Location','Job Security'], benefit: {'Salary':true,'Growth Opportunities':true,'Work-Life Balance':true,'Company Culture':true,'Location':true,'Job Security':true} },
  university: { suggestions: ['Ranking','Tuition','Campus Life','Job Placement','Location','Scholarship'], benefit: {'Ranking':true,'Tuition':false,'Campus Life':true,'Job Placement':true,'Location':true,'Scholarship':true} },
  phone:      { suggestions: ['Price','Camera Quality','Battery Life','Performance','Display','Durability'], benefit: {'Price':false,'Camera Quality':true,'Battery Life':true,'Performance':true,'Display':true,'Durability':true} },
};

// ── STEP 1 ─────────────────────────────────────────────────────────────────────
async function autoLoadSuggestions(){
  if(!S.decisionName) return;

  const sc = document.getElementById('suggestedCriteria');
  const block = document.getElementById('suggestionsBlock');
  if(!sc || !block) return;

  await fetchAISuggestions(sc, block);
}

function updateDecisionPreview(){
  S.decisionName = document.getElementById('decisionName').value;

  // AUTO trigger (debounced)
  clearTimeout(window._suggTimer);
  window._suggTimer = setTimeout(autoLoadSuggestions, 600);
}
function pickPreset(el, name, key){
  document.querySelectorAll('.preset-chip').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  S.decisionName = name; S.presetKey = key;
  document.getElementById('decisionName').value = name;
  autoLoadSuggestions(); // fix
}
function go2(){
  if(!S.decisionName.trim()){ alert('Please name your decision first!'); return; }
  document.getElementById('s2sub').textContent = 'What are you comparing for: "'+S.decisionName+'"?';
  goScreen(2);
}

// ── STEP 2: ALTERNATIVES ───────────────────────────────────────────────────────
function altKey(e){ if(e.key==='Enter') addAlt(); }
function addAlt(){
  const inp=document.getElementById('altInput');
  const v=inp.value.trim(); if(!v||S.alternatives.includes(v)) return;
  S.alternatives.push(v); inp.value=''; renderAltTags();
}
function removeAlt(v){
  S.alternatives=S.alternatives.filter(x=>x!==v); renderAltTags();
}
function renderAltTags(){
  document.getElementById('altTags').innerHTML=S.alternatives.map(v=>
    `<div class="tag"><span>${v}</span><span class="tag-x" onclick="removeAlt('${escQ(v)}')">×</span></div>`).join('');
}

