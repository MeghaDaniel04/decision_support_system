
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


