
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
  criterionMode: {},  
  realValues:   {},   
  normPreview:  {},    
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

// ── STEP 3: CRITERIA ──────────────────────────────────────────────────────────
function addSuggested(el, name){
  if(S.criteria.includes(name)){
    removeCrit(name); el.classList.remove('selected');
  } else {
    S.criteria.push(name);
    S.benefit[name] = (S.presetKey && PRESETS[S.presetKey]) ? (PRESETS[S.presetKey].benefit[name]!==false) : true;
    el.classList.add('selected');
    renderSortableList(); renderNeighborCompare();
  }
}
function critKey(e){ if(e.key==='Enter') addCrit(); }
function addCrit(){
  const inp=document.getElementById('critInput');
  const v=inp.value.trim(); if(!v||S.criteria.includes(v)) return;
  S.criteria.push(v); S.benefit[v]=true; inp.value='';
  // sync suggestion chips
  document.querySelectorAll('#suggestedCriteria .preset-chip').forEach(c=>{ if(c.textContent===v) c.classList.add('selected'); });
  renderSortableList(); renderNeighborCompare();
}
function removeCrit(name){
  const idx=S.criteria.indexOf(name); if(idx<0) return;
  S.criteria.splice(idx,1); delete S.benefit[name];
  // shift neighborPrefs keys
  const newPrefs={};
  Object.keys(S.neighborPrefs).forEach(k=>{
    const ki=parseInt(k);
    if(ki<idx) newPrefs[k]=S.neighborPrefs[k];
    else if(ki>idx) newPrefs[String(ki-1)]=S.neighborPrefs[k];
  });
  S.neighborPrefs=newPrefs;
  document.querySelectorAll('#suggestedCriteria .preset-chip').forEach(c=>{ if(c.textContent===name) c.classList.remove('selected'); });
  renderSortableList(); renderNeighborCompare();
}
function setBenefit(name,val){
  S.benefit[name]=val; renderSortableList();
}
// ── SORTABLE DRAG-AND-DROP ─────────────────────────────────────────────────────
let dragSrc=null;
function renderSortableList(){
  const n=S.criteria.length;
  const block=document.getElementById('rankBlock');
  if(n===0){ block.style.display='none'; return; }
  block.style.display='block';
  const el=document.getElementById('sortableList');
  el.innerHTML=S.criteria.map((name,i)=>`
    <div class="sort-item" draggable="true"
      data-idx="${i}"
      ondragstart="onDragStart(event,${i})"
      ondragover="onDragOver(event,${i})"
      ondragleave="onDragLeave(event)"
      ondrop="onDrop(event,${i})"
      ondragend="onDragEnd(event)">
      <span class="sort-handle" title="Drag to reorder">≡</span>
      <span class="sort-rank-num ${i===0?'top':''}">
        ${i===0?'★':(i+1)}
      </span>
      <span class="sort-name">${name}</span>
      <div class="sort-badge-wrap">
        <button onclick="setBenefit('${escQ(name)}',true)" title="Higher score = better"
          style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid;cursor:pointer;
          background:${S.benefit[name]?'var(--green-light)':'#fff'};
          color:${S.benefit[name]?'var(--green)':'var(--ink3)'};
          border-color:${S.benefit[name]?'var(--green)':'var(--warm2)'}">↑ Higher</button>
        <button onclick="setBenefit('${escQ(name)}',false)" title="Lower score = better"
          style="font-size:11px;padding:3px 9px;border-radius:6px;border:1px solid;cursor:pointer;
          background:${!S.benefit[name]?'var(--red-light)':'#fff'};
          color:${!S.benefit[name]?'var(--red)':'var(--ink3)'};
          border-color:${!S.benefit[name]?'var(--red)':'var(--warm2)'}">↓ Lower</button>
        <span class="tag-x" onclick="removeCrit('${escQ(name)}')" style="font-size:18px;color:var(--ink3);cursor:pointer" title="Remove">×</span>
      </div>
    </div>`).join('');
}

function onDragStart(e,i){ dragSrc=i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function onDragOver(e,i){ e.preventDefault(); e.dataTransfer.dropEffect='move'; if(dragSrc!==i) e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e){ e.currentTarget.classList.remove('drag-over'); }
function onDrop(e,i){
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if(dragSrc===null||dragSrc===i) return;
  // Reorder criteria array
  const moved=S.criteria.splice(dragSrc,1)[0];
  S.criteria.splice(i,0,moved);
  // Reset neighbor prefs since order changed
  S.neighborPrefs={};
  dragSrc=null;
  renderSortableList(); renderNeighborCompare();
}
function onDragEnd(e){ e.currentTarget.classList.remove('dragging'); dragSrc=null; }

// Touch drag support
let touchSrc=null, touchClone=null;
document.addEventListener('touchstart',e=>{
  const item=e.target.closest('.sort-item'); if(!item) return;
  touchSrc=parseInt(item.dataset.idx);
  // create ghost
  touchClone=item.cloneNode(true);
  touchClone.style.cssText='position:fixed;opacity:.7;pointer-events:none;z-index:9999;width:'+item.offsetWidth+'px;left:'+item.getBoundingClientRect().left+'px;top:'+item.getBoundingClientRect().top+'px;border-color:var(--gold)';
  document.body.appendChild(touchClone);
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(touchSrc===null||!touchClone) return;
  e.preventDefault();
  const t=e.touches[0];
  touchClone.style.left=(t.clientX-touchClone.offsetWidth/2)+'px';
  touchClone.style.top=(t.clientY-touchClone.offsetHeight/2)+'px';
  // highlight target
  document.querySelectorAll('.sort-item').forEach(el=>el.classList.remove('drag-over'));
  const under=document.elementFromPoint(t.clientX,t.clientY);
  const target=under&&under.closest('.sort-item');
  if(target&&parseInt(target.dataset.idx)!==touchSrc) target.classList.add('drag-over');
},{passive:false});
document.addEventListener('touchend',e=>{
  if(touchSrc===null) return;
  if(touchClone){ touchClone.remove(); touchClone=null; }
  const t=e.changedTouches[0];
  const under=document.elementFromPoint(t.clientX,t.clientY);
  const target=under&&under.closest('.sort-item');
  if(target){
    const ti=parseInt(target.dataset.idx);
    if(ti!==touchSrc){
      const moved=S.criteria.splice(touchSrc,1)[0];
      S.criteria.splice(ti,0,moved);
      S.neighborPrefs={};
      renderSortableList(); renderNeighborCompare();
    }
  }
  document.querySelectorAll('.sort-item').forEach(el=>el.classList.remove('drag-over'));
  touchSrc=null;
});

// ── NEIGHBOR COMPARISONS ──────────────────────────────────────
function renderNeighborCompare(){
  const block=document.getElementById('compareBlock');
  const n=S.criteria.length;
  if(n<2){ block.style.display='none'; return; }
  block.style.display='block';
  const pairs=n-1; 
  const bar=document.getElementById('compareCountBar');
  bar.innerHTML=`<span>${pairs} quick question${pairs>1?'s':''}</span><div class="compare-count-track"><div class="compare-count-fill" style="width:100%"></div></div><span>instead of ${n*(n-1)/2} 😊</span>`;

  const el=document.getElementById('compareCards');
  el.innerHTML=Array.from({length:pairs},(_,i)=>{
    const nameA=S.criteria[i], nameB=S.criteria[i+1];
    const val=S.neighborPrefs[i]||7; // default: A is "moderately" more important
    return `<div class="compare-card">
      <div class="compare-question">
        You ranked <em>${nameA}</em> above <em>${nameB}</em> — how much more important is it?
      </div>
      <div class="pref-slider-wrap">
        <div class="pref-labels">
          <strong>${nameA}</strong>
          <span id="nlabel_${i}" style="font-size:13px;color:var(--ink3)">${neighborLabel(val)}</span>
          <strong>${nameB}</strong>
        </div>
        <input type="range" class="pref-slider" min="1" max="9" step="0.5" value="${val}"
          id="npref_${i}" oninput="updateNeighbor(${i},this.value)">
        <div class="pref-tick-labels">
          <span>← Just a bit more</span>
          <span>A lot more →</span>
        </div>
      </div>
      <div class="pref-summary" id="npref_sum_${i}">${neighborSummary(val,nameA,nameB)}</div>
    </div>`;
  }).join('');
}

function updateNeighbor(i,val){
  val=parseFloat(val);
  S.neighborPrefs[i]=val;
  const lbl=document.getElementById('nlabel_'+i); if(lbl) lbl.textContent=neighborLabel(val);
  const sum=document.getElementById('npref_sum_'+i); if(sum) sum.textContent=neighborSummary(val,S.criteria[i],S.criteria[i+1]);
}
function neighborLabel(v){
  const labels={1:'Same weight',2:'Very slightly',3:'Slightly',4:'Somewhat',5:'Moderately',6:'Considerably',7:'Strongly',8:'Very strongly',9:'Absolutely'};
  return labels[Math.round(v)]||'';
}
function neighborSummary(v,a,b){
  v=parseFloat(v);
  if(v<=1.5) return `⚖ ${a} and ${b} are equally important`;
  const w=['','','Slightly','Somewhat','Moderately','Considerably','Strongly','Very strongly','Overwhelmingly','Absolutely'];
  return `${a} is ${w[Math.min(Math.round(v),9)]} more important than ${b}`;
}

// ── BUILD FULL PAIRWISE MATRIX FROM RANK + NEIGHBOR GAPS ──────────────────────
// Method: convert the ordered rank + intensity gaps into a full consistent AHP matrix.
// For criteria ranked 0,1,2,…n-1, the pairwise value a[i][j] (i<j) is the product
// of the neighbor gaps between positions i and j. This preserves transitivity perfectly.
function buildPairwiseMatrix(){
  const n=S.criteria.length;
  // Neighbor AHP values (1..9): how much more important rank i vs rank i+1
  const gaps=Array.from({length:n-1},(_,i)=>Math.max(1,Math.min(9,S.neighborPrefs[i]||7)));

  // a[i][j] = product of gaps[i..j-1] for i < j
  const mat=[];
  for(let i=0;i<n;i++){
    const row=[];
    for(let j=0;j<n;j++){
      if(i===j){ row.push(1); continue; }
      if(i<j){
        let prod=1;
        for(let k=i;k<j;k++) prod*=gaps[k];
        row.push(Math.min(9,prod));
      } else {
        let prod=1;
        for(let k=j;k<i;k++) prod*=gaps[k];
        row.push(Math.max(1/9,1/Math.min(9,prod)));
      }
    }
    mat.push(row);
  }
  return mat;
}

function go4(){
  if(S.criteria.length<2){ alert('Add at least 2 things that matter to you!'); return; }
  buildRatingCards();
  goScreen(5);
}





// ── STEP 4: RATINGS ───────────────────────────────────────────────────────────
function setCritMode(crit, mode) {
  S.criterionMode[crit] = mode;
  buildRatingCards();
}

function buildRatingCards(){
  const el = document.getElementById('ratingCards');
  const realCriteria   = S.criteria.filter(c => (S.criterionMode[c]||'slider') === 'real');
  const sliderCriteria = S.criteria.filter(c => (S.criterionMode[c]||'slider') === 'slider');

  // ── Section A: Real-value criteria (all alternatives together) ──
  let realSection = '';
  if(realCriteria.length > 0){
    realSection = `
      <div class="real-values-section">
        <div class="section-label">📊 Real Values — enter actual numbers</div>
        ${realCriteria.map(crit => {
          const isBenefit = S.benefit[crit] !== false;
          const allFilled = S.alternatives.every(a => S.realValues[a+'__'+crit] != null);
          const altRowsHtml = S.alternatives.map(alt => {
            const key  = alt + '__' + crit;
            const sid  = key.replace(/[^a-z0-9]/gi, '_');
            const rv   = S.realValues[key];
            const prev = S.normPreview[key];
            return `
              <div class="real-input-row">
                <span class="real-alt-label">${alt}</span>
                <input class="real-value-input" type="number" placeholder="enter value"
                  value="${rv != null ? rv : ''}"
                  oninput="setRealValue('${escQ(alt)}','${escQ(crit)}',this.value)">
                <span class="real-score-preview ${prev != null ? 'filled' : rv != null ? 'pending' : 'empty'}"
                      id="rprev_${sid}">
                  ${prev != null ? '→ ' + prev.toFixed(1) + ' / 9' : rv != null ? '…' : ''}
                </span>
              </div>`;
          }).join('');
          return `
            <div class="real-crit-block">
              <div class="crit-header-row">
                <div>
                  <div class="crit-name">${crit}</div>
                  <span class="crit-type-badge ${isBenefit ? 'benefit' : 'cost'}">
                    ${isBenefit ? '↑ Higher = Better' : '↓ Lower = Better'}
                  </span>
                </div>
                <div class="mode-toggle">
                  <button class="mode-btn" onclick="setCritMode('${escQ(crit)}','slider')">★ Rate</button>
                  <button class="mode-btn active" onclick="setCritMode('${escQ(crit)}','real')"># Value</button>
                </div>
              </div>
              <div class="real-inputs-grid">${altRowsHtml}</div>
              <div class="${allFilled ? 'real-normalised-note' : 'real-hint'}">
                ${allFilled
                  ? '✓ Will be normalised automatically (' + (isBenefit?'higher':'lower') + ' = better score)'
                  : 'Enter values for all ' + S.alternatives.length + ' options to auto-score'}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── Section B: Slider criteria (per-alternative cards) ──
  const sliderSection = S.alternatives.map(alt => {
    if(sliderCriteria.length === 0) return '';
    return `
      <div class="rating-card">
        <div class="rating-alt-name">${alt}</div>
        ${sliderCriteria.map(crit => {
          const key = alt + '__' + crit;
          const cur = S.scores[key];
          if(cur == null) S.scores[key] = 5;
          const sid = key.replace(/[^a-z0-9]/gi, '_');
          return `
            <div class="criteria-rating-row">
              <div class="crit-header-row">
                <div style="min-width:130px;flex-shrink:0">
                  <div class="crit-name">${crit}</div>
                  <span class="crit-type-badge ${S.benefit[crit] ? 'benefit' : 'cost'}">
                    ${S.benefit[crit] ? '↑ Higher = Better' : '↓ Lower = Better'}
                  </span>
                </div>
                <div class="mode-toggle">
                  <button class="mode-btn active" onclick="setCritMode('${escQ(crit)}','slider')">★ Rate</button>
                  <button class="mode-btn"        onclick="setCritMode('${escQ(crit)}','real')"># Value</button>
                </div>
              </div>
              <div class="rating-full-row">
                <input type="range" min="1" max="9" step="0.1" value="${cur || 5}"
                  oninput="setSliderRating('${escQ(alt)}','${escQ(crit)}',this.value,this)">
                <div class="rating-text" id="rtxt_${sid}">
                  ${cur ? cur.toFixed(1) : '5.0'}
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }).join('');

  el.innerHTML = realSection + sliderSection;
}

function setSliderRating(alt, crit, val, el){
  val = parseFloat(val);
  const key = alt + '__' + crit;
  S.scores[key] = val;
  const sid = key.replace(/[^a-z0-9]/gi,'_');
  const txt = document.getElementById('rtxt_' + sid);
  if(txt) txt.textContent = val.toFixed(1);
}


async function runAnalysis(){
  const missing = [];
  S.alternatives.forEach(alt => S.criteria.forEach(crit => {
    const mode = S.criterionMode[crit] || 'slider';
    const key  = alt + '__' + crit;
    if(mode === 'real' && (S.realValues[key] == null || isNaN(S.realValues[key])))
      missing.push(alt + ' → ' + crit + ' (enter a number)');
    if(mode === 'slider' && !S.scores[key])
      missing.push(alt + ' → ' + crit);
  }));
  if(missing.length){ alert('Please fill in:\n'+missing.slice(0,6).join('\n')+(missing.length>6?'\n…and '+(missing.length-6)+' more':'')); return; }

  document.getElementById('analyzeBtn').disabled = true;
  goScreen(6);
  const rc = document.getElementById('resultsContainer');
  rc.innerHTML = `<div class="spinner-wrap">
    <div class="spinner"></div>
    <div class="spinner-text">Crunching the numbers…</div>
    <div class="spinner-sub">Fuzzy AHP · Entropy · TOPSIS — for ${S.criteria.length} criteria × ${S.alternatives.length} alternatives</div>
  </div>`;

  try {
    const prefMat = buildPairwiseMatrix();
    const scoreMat = S.alternatives.map(alt =>
      S.criteria.map(crit => S.scores[alt+'__'+crit] || 5)
    );
    const realVals = {};
    Object.entries(S.realValues).forEach(([k,v]) => {
      if(v !== null && v !== undefined && !isNaN(v)) realVals[k] = v;
    });
    const body = {
      criteria:          S.criteria,
      alternatives:      S.alternatives,
      preference_matrix: prefMat,
      score_matrix:      scoreMat,
      benefit:           S.criteria.map(c => S.benefit[c] !== false),
      ahp_weight:        0.5,
      real_values:       Object.keys(realVals).length > 0 ? realVals : null,
    };
    const res = await fetch(API()+'/api/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
    });
    if(!res.ok){ const e = await res.json(); throw new Error(e.detail||JSON.stringify(e)); }
    const data = await res.json();
    S.results = data;
    renderResults(data);
    showRecommendation(data.recommendation);
    showSensitivity(data.sensitivity, S.criteria);
    showNormalisationMeta(data.normalisation_meta);
  } catch(e){
    rc.innerHTML = `<div class="err-box">⚠ Could not reach the analysis server.<br><small>${e.message}</small></div>
    <div class="hint"><span class="hint-icon">💡</span><span>Make sure FastAPI is running. Tap ⚙ to change the server URL. Showing basic local estimate below.</span></div>`;
    showRecommendation(null);
    showSensitivity(null, S.criteria);
    showNormalisationMeta(null);
    localFallback();
  }
  document.getElementById('analyzeBtn').disabled = false;
}

function localFallback(){
  // Weighted sum using rank-based weights (1/rank normalised) as fallback
  const n=S.criteria.length;
  const rankWeights=S.criteria.map((_,i)=>1/(i+1));
  const total=rankWeights.reduce((a,b)=>a+b,0);
  const w=rankWeights.map(x=>x/total);
  const scoreMat=S.alternatives.map(alt=>S.criteria.map(crit=>S.scores[alt+'__'+crit]||0));
  const totals=S.alternatives.map((_,i)=>scoreMat[i].reduce((s,v,j)=>s+v*w[j],0));
  const ranked=S.alternatives.map((alt,i)=>({rank:0,alternative:alt,closeness:totals[i]/5,d_pos:0,d_neg:totals[i]/5}));
  ranked.sort((a,b)=>b.closeness-a.closeness);
  ranked.forEach((r,i)=>r.rank=i+1);
  renderResults({ranking_table:ranked,winner:ranked[0].alternative,ahp_weights:w,entropy_weights:w,combined_weights:w,entropy_values:S.criteria.map(()=>0.5),consistency:{lambda_max:n,CI:0,CR:0,ok:true},criteria:S.criteria,alternatives:S.alternatives,benefit:S.criteria.map(c=>S.benefit[c]!==false),_fallback:true});
}


// ── RESULTS ────────────────────────────────────────────────────────────────────
function showRecommendation(rec){
  const box=document.getElementById('recommendationBox');
  if(!box) return;
  if(!rec){ box.innerHTML=''; return; }
  box.innerHTML=`
    <div class="card">
      <h3>🏆 Recommended Option</h3>
      <p><strong>${rec.best}</strong></p>
      <p>${rec.message}</p>
      <p><em>${rec.insight}</em></p>
    </div>
  `;
}

function showSensitivity(data, criteria) {
  const box = document.getElementById("sensitivityBox");
  if (!box) return;
  if (!data || !data.criteria_sensitivity) { box.innerHTML = ""; return; }

  const stableLabel = data.stable
    ? `<div style="color:var(--green);font-weight:500;margin-bottom:12px">✅ Decision is stable — winner holds across all weight changes.</div>`
    : `<div style="color:var(--red);font-weight:500;margin-bottom:12px">⚠ Decision is sensitive — some weight changes flip the winner.</div>`;

  const rows = data.criteria_sensitivity.map(c => {
    const statusIcon = c.ever_changes ? "⚠" : "✅";
    const statusColor = c.ever_changes ? "var(--red)" : "var(--green)";

    // Build perturbation detail rows
    const pertRows = c.perturbations.map(p => `
      <tr>
        <td style="padding:5px 8px;font-family:monospace;color:var(--ink3)">${p.factor > 1 ? '+' : ''}${((p.factor - 1) * 100).toFixed(0)}%</td>
        <td style="padding:5px 8px;font-family:monospace">${(p.new_weight * 100).toFixed(1)}%</td>
        <td style="padding:5px 8px;font-weight:${p.changed ? '600' : '400'};color:${p.changed ? 'var(--red)' : 'var(--ink)'}">${p.winner}</td>
        <td style="padding:5px 8px">${p.changed ? '⚠ Changes' : '✅ Stable'}</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:16px;border:1px solid var(--warm2);border-radius:10px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 14px;background:var(--warm1);cursor:pointer"
             onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none' ? 'block' : 'none'">
          <div>
            <strong>${c.criterion_name}</strong>
            <span style="font-size:12px;color:var(--ink3);margin-left:8px">base weight: ${(c.base_weight * 100).toFixed(1)}%</span>
          </div>
          <span style="color:${statusColor};font-weight:600">${statusIcon} ${c.ever_changes ? 'Sensitive' : 'Stable'}</span>
        </div>
        <div style="display:none;padding:10px 14px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="color:var(--ink3);font-size:12px">
                <th style="text-align:left;padding:5px 8px">Change</th>
                <th style="text-align:left;padding:5px 8px">New Weight</th>
                <th style="text-align:left;padding:5px 8px">Winner</th>
                <th style="text-align:left;padding:5px 8px">Status</th>
              </tr>
            </thead>
            <tbody>${pertRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  box.innerHTML = `
    <div class="card">
      <h3>📊 Sensitivity Analysis</h3>
      <p style="font-size:13px;color:var(--ink3);margin-bottom:14px">
        Base winner: <strong>${data.base_winner}</strong> (score: ${(data.base_score * 100).toFixed(1)}%)
        · Click any criterion to expand perturbation details.
      </p>
      ${stableLabel}
      ${rows}
    </div>`;
}

function renderResults(data){
  const rc=document.getElementById('resultsContainer');
  const maxCC=Math.max(...data.ranking_table.map(r=>r.closeness));
  const maxW=Math.max(...data.combined_weights);
  let html='';
  if(data._fallback) html+=`<div class="err-box" style="margin-bottom:16px">⚠ Server offline — showing rank-weighted estimate. Start the backend for full Fuzzy MCDM results.</div>`;

  html+=`<div class="winner-card">
    <span class="confetti">🏆</span>
    <div class="winner-label">Best Choice for "${S.decisionName}"</div>
    <div class="winner-name">${data.winner}</div>
    <div class="winner-sub">Based on ${data.criteria.length} criteria across ${data.alternatives.length} options</div>
  </div>`;

  html+=`<div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:var(--ink);margin-bottom:14px">Full Ranking</div>
  <div class="rank-list">`;
  data.ranking_table.forEach(row=>{
    const medals=['🥇','🥈','🥉'];
    html+=`<div class="rank-item ${row.rank===1?'first':''}">
      <div class="rank-num">${medals[row.rank-1]||row.rank}</div>
      <div class="rank-alt">${row.alternative}</div>
      <div class="rank-bar-wrap">
        <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${(row.closeness/maxCC*100).toFixed(1)}%"></div></div>
        <div class="rank-score">${(row.closeness*100).toFixed(0)}%</div>
      </div>
    </div>`;
  });
  html+=`</div>`;

  html+=`<div class="insight-grid">
    <div class="insight-card">
      <h4>What mattered most</h4>
      <div class="insight-weights">`;
  data.combined_weights.forEach((w,i)=>{
    html+=`<div class="ins-w-row">
      <div class="ins-w-name" title="${data.criteria[i]}">${data.criteria[i]}</div>
      <div class="ins-w-bar"><div class="ins-w-fill" style="width:${(w/maxW*100).toFixed(1)}%;background:linear-gradient(90deg,var(--green2),var(--gold2))"></div></div>
      <div class="ins-w-pct">${(w*100).toFixed(0)}%</div>
    </div>`;
  });
  html+=`</div></div>
    <div class="insight-card">
      <h4>Analysis Quality</h4>
      <div style="margin-bottom:12px">
        <div class="consistency-badge ${data.consistency.ok?'ok':'warn'}">
          ${data.consistency.ok?'✓ Preferences are consistent':'⚠ Some preferences conflict'}
        </div>
      </div>
      <div style="font-size:13px;color:var(--ink2);line-height:1.7">
        ${data._fallback?'<em>Basic rank-weighted estimate.</em>':
        `CR = ${data.consistency.CR.toFixed(3)}<br>λ_max = ${data.consistency.lambda_max.toFixed(3)}<br>${data.criteria.length} criteria · ${data.alternatives.length} alternatives`}
      </div>
    </div>
  </div>`;

  if(!data._fallback){
    html+=`<div class="detail-toggle" onclick="toggleDetail(this)">🔬 Show detailed analysis ↓</div>
    <div class="detail-section" id="detailSection">
      <div class="card">
        <div class="card-label">Weight Sources (AHP vs Entropy)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Your Priorities (AHP)</div>
            <div class="insight-weights">`;
    const maxA=Math.max(...data.ahp_weights);
    data.ahp_weights.forEach((w,i)=>{ html+=`<div class="ins-w-row"><div class="ins-w-name">${data.criteria[i]}</div><div class="ins-w-bar"><div class="ins-w-fill" style="width:${(w/maxA*100).toFixed(1)}%;background:linear-gradient(90deg,#c9873a,#e8a055)"></div></div><div class="ins-w-pct">${(w*100).toFixed(0)}%</div></div>`; });
    const maxE=Math.max(...data.entropy_weights);
    html+=`</div></div><div>
            <div style="font-size:12px;font-weight:500;color:var(--green);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Data Spread (Entropy)</div>
            <div class="insight-weights">`;
    data.entropy_weights.forEach((w,i)=>{ html+=`<div class="ins-w-row"><div class="ins-w-name">${data.criteria[i]}</div><div class="ins-w-bar"><div class="ins-w-fill" style="width:${(w/maxE*100).toFixed(1)}%;background:linear-gradient(90deg,#2d6a4f,#52b788)"></div></div><div class="ins-w-pct">${(w*100).toFixed(0)}%</div></div>`; });
    html+=`</div></div></div>
        <div style="font-size:12px;color:var(--ink3);margin-top:12px;border-top:1px solid var(--warm2);padding-top:10px">
          <strong>Final weight</strong> = 50% from your ranking (Fuzzy AHP) + 50% from score variation (Entropy)
        </div>
      </div>
      <div class="card">
        <div class="card-label">TOPSIS Closeness Scores</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr>
            <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--warm2);color:var(--ink3);font-weight:500">Option</th>
            <th style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);color:var(--ink3);font-weight:500">D⁺</th>
            <th style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);color:var(--ink3);font-weight:500">D⁻</th>
            <th style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);color:var(--ink3);font-weight:500">Score</th>
          </tr></thead><tbody>`;
    data.ranking_table.forEach(row=>{
      html+=`<tr>
        <td style="padding:8px 10px;border-bottom:1px solid var(--warm2)">${row.alternative}</td>
        <td style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);color:var(--red);font-family:monospace">${row.d_pos.toFixed(4)}</td>
        <td style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);color:var(--green);font-family:monospace">${row.d_neg.toFixed(4)}</td>
        <td style="text-align:center;padding:8px;border-bottom:1px solid var(--warm2);font-weight:600">${(row.closeness*100).toFixed(1)}%</td>
      </tr>`;
    });
    html+=`</tbody></table></div></div>`;
  }

  rc.innerHTML=html;
  setTimeout(()=>{
    document.querySelectorAll('.rank-bar-fill,.ins-w-fill').forEach(el=>{
      const w=el.style.width; el.style.width='0'; setTimeout(()=>el.style.width=w,50);
    });
  },100);
}

function toggleDetail(btn){
  const sec=document.getElementById('detailSection');
  const open=sec.classList.toggle('open');
  btn.textContent=open?'🔬 Hide detailed analysis ↑':'🔬 Show detailed analysis ↓';
}

// ── NAV ────────────────────────────────────────────────────────────────────────
function goScreen(n){
  document.querySelectorAll('.screen').forEach((s,i)=>s.classList.toggle('active',i+1===n));
  [1,2,3,4,5].forEach(i=>{
    document.getElementById('ps'+i).classList.toggle('active',i===n);
    document.getElementById('ps'+i).classList.toggle('done',i<n);
    document.getElementById('pd'+i).textContent=i<n?'✓':i;
    if(i<5) document.getElementById('pl'+i).classList.toggle('done',i<n);
  });
  window.scrollTo({top:0,behavior:'smooth'});
}
function tryNav(n){
  if(n===1) goScreen(1);
  else if(n===2&&S.decisionName) goScreen(2);
  else if(n===3&&S.alternatives.length>=2) goScreen(3);
  else if(n===4&&S.criteria.length>=2) goScreen(4);
  else if(n===5&&S.results) goScreen(5);
}
function startOver(){
  Object.assign(S,{decisionName:'',presetKey:null,alternatives:[],criteria:[],benefit:{},neighborPrefs:{},scores:{},
criterionMode: {},
realValues:    {},
normPreview:   {},results:null});
  document.getElementById('decisionName').value='';
  document.querySelectorAll('.preset-chip').forEach(c=>c.classList.remove('selected'));
  document.getElementById('altTags').innerHTML='';
  document.getElementById('sortableList').innerHTML='';
  document.getElementById('rankBlock').style.display='none';
  document.getElementById('compareBlock').style.display='none';
  showRecommendation(null);
  showSensitivity(null, S.criteria);
  const normBox = document.getElementById('normMetaBox');
  if(normBox) normBox.innerHTML = '';
  goScreen(1);
}

// ── UTILS ──────────────────────────────────────────────────────────────────────
function escQ(s){ return String(s).replace(/'/g,"&#39;").replace(/"/g,'&quot;'); }
function toggleAPI(){ document.getElementById('apiPopup').classList.toggle('open'); }
document.addEventListener('click',e=>{
  const cfg=document.querySelector('.api-config');
  if(cfg&&!cfg.contains(e.target)) document.getElementById('apiPopup').classList.remove('open');
});

// ── REAL VALUE FUNCTIONS ──────────────────────────────────────────

function setRealValue(alt, crit, val) {
  const key = alt + '__' + crit;
  S.realValues[key] = (val === '' || val === null) ? null : parseFloat(val);
  S.normPreview[key] = null;
  _refreshPreviewLabel(alt, crit);
  clearTimeout(window._normTimer);
  window._normTimer = setTimeout(() => _fetchNormPreview(crit), 400);
}

function _refreshPreviewLabel(alt, crit) {
  const key = alt + '__' + crit;
  const sid = key.replace(/[^a-z0-9]/gi, '_');
  const el  = document.getElementById('rprev_' + sid);
  if(!el) return;
  const score = S.normPreview[key];
  const rv    = S.realValues[key];
  if(rv == null){
    el.textContent = ''; el.className = 'real-score-preview empty';
  } else if(score != null){
    el.textContent = '→ ' + score.toFixed(1) + ' / 9';
    el.className = 'real-score-preview filled';
  } else {
    el.textContent = '…'; el.className = 'real-score-preview pending';
  }
}

async function _fetchNormPreview(crit) {
  const allFilled = S.alternatives.every(alt => {
    const v = S.realValues[alt + '__' + crit];
    return v !== null && v !== undefined && !isNaN(v);
  });
  if(!allFilled) return;

  const real_values = {};
  S.alternatives.forEach(alt => {
    real_values[alt + '__' + crit] = S.realValues[alt + '__' + crit];
  });

  try {
    const res = await fetch(API() + '/api/normalise', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        criteria:     [crit],
        alternatives: S.alternatives,
        benefit:      [S.benefit[crit] !== false],
        real_values,
      }),
    });
    if(!res.ok) return;
    const data = await res.json();
    Object.entries(data.normalised_scores).forEach(([k, v]) => {
      S.normPreview[k] = v;
      S.scores[k]      = v;
    });
    S.alternatives.forEach(alt => _refreshPreviewLabel(alt, crit));
  } catch(e) {
    console.warn('normalise preview failed:', e);
  }
}

function showNormalisationMeta(meta) {
  const box = document.getElementById('normMetaBox');
  if(!box) return;
  if(!meta) { box.innerHTML = ''; return; }

  const normCriteria = Object.entries(meta).filter(([, v]) => v.all_present);
  if(normCriteria.length === 0) { box.innerHTML = ''; return; }

  const tables = normCriteria.map(([crit, info]) => {
    const dir  = info.benefit ? 'Higher = Better' : 'Lower = Better';
    const rows = Object.entries(info.alternatives).map(([alt, d]) => `
      <tr>
        <td style="padding:6px 10px">${alt}</td>
        <td style="padding:6px 10px;font-family:monospace;color:var(--ink2)">${d.raw}</td>
        <td style="padding:6px 10px;font-family:monospace;color:var(--green);font-weight:600">${d.score.toFixed(2)} / 9</td>
      </tr>`).join('');
    return `
      <div style="margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px">
          ${crit}
          <span style="font-size:11px;color:var(--ink3);font-weight:400;margin-left:8px">
            ${dir} · range: ${info.lo} – ${info.hi}
          </span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="color:var(--ink3);font-size:11px;text-transform:uppercase">
            <th style="text-align:left;padding:4px 10px">Option</th>
            <th style="text-align:left;padding:4px 10px">Your Value</th>
            <th style="text-align:left;padding:4px 10px">Score Used</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  box.innerHTML = `
    <div class="card">
      <div class="card-label">📐 How Real Values Were Converted</div>
      <div style="font-size:12px;color:var(--ink3);margin-bottom:14px">
        Raw values normalised to 1–9. Best value → 9, worst → 1.
      </div>
      ${tables}
    </div>`;
}

