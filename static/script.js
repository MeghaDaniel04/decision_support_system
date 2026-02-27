
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

async function go3(){
  if(S.alternatives.length<2){ alert('Add at least 2 options to compare!'); return; }
  const block=document.getElementById('suggestionsBlock');
  const sc=document.getElementById('suggestedCriteria');
  
  // Try to fetch AI suggestions from backend
  await fetchAISuggestions(sc, block);
  
  renderSortableList(); renderNeighborCompare();
  goScreen(3);
}

async function fetchAISuggestions(containerEl, blockEl){
  try {
    // Show loading state
    containerEl.innerHTML = '<div style="padding:12px;color:var(--ink3);font-size:13px">🤖 AI is thinking…</div>';
    blockEl.style.display='block';
    
    const alts = S.alternatives.length > 0 ? S.alternatives : [];
    const payload = {
      decision_text: S.decisionName,
      alternatives: alts,
      existing_criteria: S.criteria,
      num_suggestions: 7
    };
    
    const res = await fetch(API() + '/api/suggest-criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if(!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    
    // Check for API errors
    if(data.error) {
      console.error('Groq API error:', data.error);
    }
    
    if(!data.suggestions || data.suggestions.length === 0) {
      // Show helpful message instead of silently failing
      let msg = '💡 AI suggestions unavailable. Add criteria manually below.';
      if(data.error) {
        msg = `⚠️ ${data.error}<br><small>Add criteria manually below.</small>`;
      }
      containerEl.innerHTML = '<div style="padding:12px;color:var(--ink3);font-size:13px">' + msg + '</div>';
      return;
    }
    
    // Render AI suggestions
    containerEl.innerHTML = data.suggestions.map(sug => {
      const name = sug.name;
      const isSelected = S.criteria.includes(name);
      return `<div class="preset-chip ${isSelected?'selected':''}" title="${sug.rationale}" onclick="addSuggested(this,'${escQ(name)}')" style="position:relative">
        ${name}
        <span style="position:absolute;top:2px;right:2px;font-size:10px;background:var(--gold);color:white;padding:1px 4px;border-radius:2px">AI</span>
      </div>`;
    }).join('');
    
    // Set smarter defaults from AI suggestions
    data.suggestions.forEach((sug, i) => {
      if(!S.criteria.includes(sug.name)) {
        S.benefit[sug.name] = sug.benefit ?? true;
        // default importance (higher for top suggestions)
        S.neighborPrefs[i] = 7 - Math.min(i, 4); // 7 -> 3 scale
      }
    });

    // Auto-add top 2 suggestions
    data.suggestions.slice(0,2).forEach(sug=>{
      if(!S.criteria.includes(sug.name)){
        S.criteria.push(sug.name);
      }
    });
    renderSortableList();
    renderNeighborCompare();
    
  } catch(e) {
    console.error('Fetch error:', e);
    // Graceful fallback to hardcoded presets
    containerEl.innerHTML = '';
    if(S.presetKey && PRESETS[S.presetKey]){
      const p = PRESETS[S.presetKey];
      containerEl.innerHTML = p.suggestions.map(s =>
        `<div class="preset-chip ${S.criteria.includes(s)?'selected':''}" onclick="addSuggested(this,'${escQ(s)}')">${s}</div>`).join('');
    } else {
      containerEl.innerHTML = '<div style="padding:12px;color:var(--ink3);font-size:13px">💡 Add by typing below</div>';
    }
  }
}


