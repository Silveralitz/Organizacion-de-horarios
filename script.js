// Calendario mensual con más color y emoción
// - Interfaz más viva: gradientes, emojis, paleta, pequeñas animaciones y confetti al crear eventos
// - Mantiene: navegación mes/año, añadir/editar/eliminar, guardar en localStorage, export/import

(() => {
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const weekdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  // Elementos
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const todayBtn = document.getElementById('todayBtn');
  const calendarGrid = document.getElementById('calendarGrid');
  const weekdaysEl = document.getElementById('weekdays');
  const selectedDateTitle = document.getElementById('selectedDateTitle');
  const eventsList = document.getElementById('eventsList');
  const btnAddEvent = document.getElementById('btnAddEvent');
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const importFile = document.getElementById('importFile');
  const btnClear = document.getElementById('btnClear');

  const modal = document.getElementById('modal');
  const eventForm = document.getElementById('eventForm');
  const modalTitle = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deleteBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const paletteEl = document.getElementById('palette');
  const emojiSuggestionsEl = document.getElementById('emojiSuggestions');
  const confettiRoot = document.getElementById('confetti-root');

  // Estado
  let viewYear, viewMonth; // month: 0-11
  let selectedDate = null; // "YYYY-MM-DD"
  let events = []; // {id, date, title, start, end, color, emoji, description}

  const STORAGE_KEY = 'calendario_eventos_v1';

  // Paleta sugerida (colores y pequeños degradados)
  const PALETTE = [
    { label: 'Aurora', value: 'linear-gradient(90deg,#ff9a9e,#fad0c4)' },
    { label: 'Cielo', value: 'linear-gradient(90deg,#a1c4fd,#c2e9fb)' },
    { label: 'Mar', value: 'linear-gradient(90deg,#89f7fe,#66a6ff)' },
    { label: 'Mandarina', value: 'linear-gradient(90deg,#ffecd2,#fcb69f)' },
    { label: 'Lavanda', value: 'linear-gradient(90deg,#e0c3fc,#8ec5fc)' },
    { label: 'Verde', value: 'linear-gradient(90deg,#c7f9cc,#8ef6d3)' },
    { label: 'Rosa', value: 'linear-gradient(90deg,#ffd6f0,#ffb3c6)' },
    { label: 'Sol', value: 'linear-gradient(90deg,#fff1b6,#ffd6a5)' }
  ];

  // Emojis sugeridos
  const EMOJIS = ['🎉','📌','🧑‍🤝‍🧑','💼','🎓','🏃‍♂️','📅','☕','💡','✈️'];

  // ---------- Inicializar UI ----------
  function initHeader(){
    // month select
    monthNames.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    // year select
    const currentYear = new Date().getFullYear();
    for(let y = currentYear - 20; y <= currentYear + 10; y++){
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    // weekdays header
    weekdays.forEach((w, i) => {
      const d = document.createElement('div');
      d.className = 'wd';
      d.textContent = w;
      weekdaysEl.appendChild(d);
    });

    // palette buttons
    PALETTE.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = p.label;
      btn.style.background = p.value;
      btn.dataset.color = p.value;
      btn.addEventListener('click', () => {
        // mark selected visually
        document.querySelectorAll('#palette button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        // set color input in modal if exists
        const colorInput = eventForm.elements['color'];
        if(colorInput) colorInput.value = p.value;
      });
      paletteEl.appendChild(btn);
    });

    // emoji suggestions
    EMOJIS.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      b.addEventListener('click', (ev) => {
        eventForm.elements['emoji'].value = e;
      });
      emojiSuggestionsEl.appendChild(b);
    });

    // listeners
    prevBtn.addEventListener('click', () => changeMonth(-1));
    nextBtn.addEventListener('click', () => changeMonth(1));
    todayBtn.addEventListener('click', goToToday);
    monthSelect.addEventListener('change', () => {
      viewMonth = Number(monthSelect.value);
      renderCalendar();
    });
    yearSelect.addEventListener('change', () => {
      viewYear = Number(yearSelect.value);
      renderCalendar();
    });

    btnAddEvent.addEventListener('click', () => openModalForDate(selectedDate || todayStr()));
    btnExport.addEventListener('click', exportJSON);
    btnImport.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', onImportFile);
    btnClear.addEventListener('click', clearAll);

    // modal buttons
    eventForm.addEventListener('submit', onSaveEvent);
    deleteBtn.addEventListener('click', onDeleteEvent);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });
  }

  // ---------- Utilitarios fecha ----------
  function pad(n){ return String(n).padStart(2,'0'); }
  function ymdToDate(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
  function dateToYmd(dt){ return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`; }
  function todayStr(){ return dateToYmd(new Date()); }

  // ---------- Render calendario ----------
  function renderCalendar(){
    calendarGrid.innerHTML = '';
    monthSelect.value = viewMonth;
    yearSelect.value = viewYear;

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const jsWeekday = firstOfMonth.getDay(); // 0 Sun .. 6 Sat
    const firstGridIndex = (jsWeekday + 6) % 7; // Monday=0

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonth = new Date(viewYear, viewMonth, 0);
    const prevDays = prevMonth.getDate();
    const totalCells = 42;

    for(let i = 0; i < totalCells; i++){
      const cell = document.createElement('div');
      cell.className = 'day';
      const cellIndex = i - firstGridIndex + 1;
      let cellDate, inThisMonth = true;

      if(cellIndex <= 0){
        const d = prevDays + cellIndex;
        const dt = new Date(viewYear, viewMonth -1, d);
        cellDate = dateToYmd(dt);
        inThisMonth = false;
        cell.classList.add('other-month');
      } else if(cellIndex > daysInMonth){
        const d = cellIndex - daysInMonth;
        const dt = new Date(viewYear, viewMonth +1, d);
        cellDate = dateToYmd(dt);
        inThisMonth = false;
        cell.classList.add('other-month');
      } else {
        const dt = new Date(viewYear, viewMonth, cellIndex);
        cellDate = dateToYmd(dt);
      }

      cell.dataset.date = cellDate;

      // header with number and a decorative dot
      const header = document.createElement('div');
      header.className = 'day-num';
      const dot = document.createElement('span');
      dot.className = 'day-dot';
      // color the dot by weekday for subtle life
      const weekdayIndex = (new Date(cellDate)).getDay(); // 0 Sun..6
      const colorByWeekday = ['#ffd6a5','#caffbf','#bdb2ff','#ffd6e0','#cbd5ff','#ffe7a7','#ffd6f0'];
      dot.style.background = colorByWeekday[(weekdayIndex+6)%7];
      header.appendChild(dot);
      const num = document.createElement('span');
      num.textContent = Number(cellDate.slice(-2));
      header.appendChild(num);
      cell.appendChild(header);

      // events container (show up to 2 pills)
      const evsContainer = document.createElement('div');
      evsContainer.className = 'events';
      const dayEvents = events.filter(e => e.date === cellDate);
      if(dayEvents.length > 0){
        const listToShow = dayEvents.slice(0, 2);
        listToShow.forEach(ev => {
          const pill = mkPill(ev);
          pill.addEventListener('click', (e)=>{ e.stopPropagation(); openModalForEvent(ev); });
          evsContainer.appendChild(pill);
        });
        if(dayEvents.length > 2){
          const more = document.createElement('div');
          more.className = 'event-count';
          more.textContent = `+${dayEvents.length - 2} más`;
          evsContainer.appendChild(more);
        }
      }
      cell.appendChild(evsContainer);

      // highlight today
      if(cellDate === todayStr()){
        cell.style.boxShadow = 'inset 0 0 0 2px rgba(107,155,255,0.14)';
      }

      // click selects day
      cell.addEventListener('click', () => {
        selectedDate = cellDate;
        renderDayPanel();
        document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
        cell.classList.add('selected');
      });

      calendarGrid.appendChild(cell);
    }

    if(!selectedDate || !isDateInView(selectedDate)){
      selectedDate = dateToYmd(new Date(viewYear, viewMonth, 1));
    }
    renderDayPanel();
  }

  function isDateInView(ymd){
    const d = ymdToDate(ymd);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }

  function mkPill(ev){
    const pill = document.createElement('div');
    pill.className = 'event-pill';
    pill.style.background = ev.color || 'linear-gradient(90deg,#89f7fe,#66a6ff)';
    if(ev.emoji){
      const em = document.createElement('span'); em.className='emoji'; em.textContent = ev.emoji;
      pill.appendChild(em);
    }
    const txt = document.createElement('span');
    txt.textContent = `${ev.start ? ev.start + ' ' : ''}${ev.title}`;
    pill.appendChild(txt);
    pill.dataset.id = ev.id;
    return pill;
  }

  // ---------- Panel lateral ----------
  function renderDayPanel(){
    const title = selectedDate ? `${selectedDate} — ${new Date(selectedDate).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}` : 'Selecciona un día';
    selectedDateTitle.textContent = title;

    const list = events.filter(e => e.date === selectedDate).sort((a,b) => (a.start||'') > (b.start||'') ? 1 : -1);
    eventsList.innerHTML = '';
    if(list.length === 0){
      eventsList.textContent = 'No hay eventos para este día.';
      return;
    }

    list.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'event-card';
      const h = document.createElement('div'); h.style.display='flex'; h.style.justifyContent='space-between';
      const t = document.createElement('div'); t.textContent = `${ev.emoji ? ev.emoji + ' ' : ''}${ev.title || '(Sin título)'}`; t.style.fontWeight = 800;
      const time = document.createElement('div'); time.textContent = ev.start ? (ev.end ? `${ev.start} — ${ev.end}` : ev.start) : ''; time.className = 'event-meta';
      h.appendChild(t); h.appendChild(time);

      const meta = document.createElement('div'); meta.className = 'event-meta'; meta.textContent = ev.description || '';
      if(ev.color){ meta.style.borderLeft = `6px solid transparent`; meta.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.02), transparent)'; meta.style.paddingLeft = '8px'; }

      const actions = document.createElement('div'); actions.className = 'event-actions';
      const edit = document.createElement('button'); edit.textContent = 'Editar'; edit.className='btn';
      edit.addEventListener('click', () => openModalForEvent(ev));
      const del = document.createElement('button'); del.textContent = 'Eliminar'; del.className='btn danger';
      del.addEventListener('click', () => {
        if(confirm('¿Eliminar este evento?')) {
          events = events.filter(x => x.id !== ev.id);
          saveAndRender();
        }
      });
      actions.appendChild(edit); actions.appendChild(del);

      card.appendChild(h);
      if(meta.textContent) card.appendChild(meta);
      card.appendChild(actions);

      eventsList.appendChild(card);
    });
  }

  // ---------- Modal ----------
  function openModalForDate(dateYmd){
    openModal({ id:'', date: dateYmd || todayStr(), title:'', start:'', end:'', color: PALETTE[2].value, emoji:'', description:'' }, true);
  }

  function openModalForEvent(ev){
    openModal({...ev}, false);
  }

  function openModal(obj, isNew){
    modal.classList.remove('hidden');
    modalTitle.textContent = isNew ? 'Añadir evento' : 'Editar evento';
    eventForm.elements['id'].value = obj.id || '';
    eventForm.elements['title'].value = obj.title || '';
    eventForm.elements['date'].value = obj.date || todayStr();
    eventForm.elements['start'].value = obj.start || '';
    eventForm.elements['end'].value = obj.end || '';
    eventForm.elements['color'].value = obj.color || PALETTE[2].value;
    eventForm.elements['emoji'].value = obj.emoji || '';
    eventForm.elements['description'].value = obj.description || '';
    deleteBtn.classList.toggle('hidden', isNew);
    setTimeout(()=> eventForm.elements['title'].focus(), 120);
  }

  function closeModal(){
    modal.classList.add('hidden');
    eventForm.reset();
    // clear selected palette visual
    document.querySelectorAll('#palette button').forEach(b => b.classList.remove('selected'));
  }

  function onSaveEvent(e){
    e.preventDefault();
    const f = e.target;
    const id = f.elements['id'].value || String(Date.now());
    const title = f.elements['title'].value.trim();
    const date = f.elements['date'].value;
    const start = f.elements['start'].value;
    const end = f.elements['end'].value;
    const color = f.elements['color'].value;
    const emoji = f.elements['emoji'].value.trim();
    const description = f.elements['description'].value;

    if(!date){ alert('Selecciona una fecha válida.'); return; }
    if(start && end && start >= end){ alert('La hora de fin debe ser posterior a la de inicio.'); return; }

    const existing = events.find(x => x.id === id);
    if(existing){
      existing.title = title;
      existing.date = date;
      existing.start = start;
      existing.end = end;
      existing.color = color;
      existing.emoji = emoji;
      existing.description = description;
      // small animation on edit
      flashEvent(existing.id);
    } else {
      const ev = { id, title, date, start, end, color, emoji, description };
      events.push(ev);
      // celebration
      popConfettiAtCenter();
      // animate new pill when rendered
      setTimeout(()=> animateNewEvent(ev.id), 80);
    }

    saveAndRender();
    selectedDate = date;
    closeModal();
  }

  function onDeleteEvent(){
    const id = eventForm.elements['id'].value;
    if(!id) return;
    if(confirm('¿Eliminar este evento?')){
      events = events.filter(e => e.id !== id);
      saveAndRender();
      closeModal();
    }
  }

  // ---------- Storage ----------
  function loadFromStorage(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed)) events = parsed.map(normalizeEvent);
      }
    }catch(err){ console.error('Error leyendo storage', err); }
  }
  function saveToStorage(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }catch(err){ console.error('Error guardando storage', err); } }
  function normalizeEvent(raw){
    return {
      id: String(raw.id ?? Date.now()),
      title: String(raw.title ?? ''),
      date: String(raw.date ?? todayStr()),
      start: raw.start || '',
      end: raw.end || '',
      color: raw.color || PALETTE[2].value,
      emoji: raw.emoji || '',
      description: raw.description || ''
    };
  }
  function saveAndRender(){ saveToStorage(); renderCalendar(); }

  // ---------- Export / Import / Clear ----------
  function exportJSON(){
    const data = JSON.stringify(events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `calendario-eventos-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e){
    const f = e.target.files[0];
    if(!f) return;
    try{
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      if(!Array.isArray(parsed)) throw new Error('Se esperaba una lista de eventos JSON.');
      events = parsed.map(normalizeEvent);
      saveAndRender();
      alert('Importación completada.');
    }catch(err){ alert('Error importando: ' + (err.message || err)); } finally { importFile.value = ''; }
  }

  function clearAll(){
    if(confirm('¿Borrar todos los eventos? Esta acción no se puede deshacer.')){
      events = [];
      saveAndRender();
      // small confetti "reset" visual
      popConfettiAtCenter(20);
    }
  }

  // ---------- Animations & confetti ----------
  function popConfettiAtCenter(count=26){
    const root = confettiRoot;
    const rect = document.body.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 4;
    const colors = ['#ff6b6b','#ffd6a5','#a1c4fd','#c2e9fb','#c7f9cc','#ffd6f0','#89f7fe'];

    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = (cx + (Math.random()-0.5)*200) + 'px';
      el.style.top = (cy + (Math.random()-0.5)*80) + 'px';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.width = (6 + Math.random()*12) + 'px';
      el.style.height = (6 + Math.random()*12) + 'px';
      el.style.borderRadius = (Math.random()>0.5? '50%':'2px');
      el.style.transform = `rotate(${Math.random()*360}deg)`;
      // randomize animation duration a bit
      el.style.animationDuration = (900 + Math.random()*600) + 'ms';
      root.appendChild(el);
      setTimeout(()=> el.remove(), 2000);
    }
  }

  // animate newly added event pill (find by id and add .pop)
  function animateNewEvent(id){
    const node = document.querySelector(`.event-pill[data-id="${id}"]`);
    if(node){
      node.classList.add('pop');
      setTimeout(()=> node.classList.remove('pop'), 800);
    }
  }
  // flash existing event in panel
  function flashEvent(id){
    const node = document.querySelector(`.event-pill[data-id="${id}"]`);
    if(node){
      node.classList.add('pop');
      setTimeout(()=> node.classList.remove('pop'), 700);
    }
  }

  // ---------- Import / Export helpers ----------
  function exportJSONSample(){
    // unused but can generate sample
  }

  // ---------- Navigation ----------
  function changeMonth(delta){
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear(); viewMonth = d.getMonth();
    renderCalendar();
  }
  function goToToday(){
    const now = new Date();
    viewYear = now.getFullYear(); viewMonth = now.getMonth(); selectedDate = dateToYmd(now);
    renderCalendar();
    const todayCell = document.querySelector(`.day[data-date="${selectedDate}"]`);
    if(todayCell){ todayCell.classList.add('selected'); todayCell.scrollIntoView({behavior:'smooth', block:'center'}); }
  }

  // ---------- Inicializar app ----------
  function start(){
    initHeader();
    const now = new Date();
    viewYear = now.getFullYear(); viewMonth = now.getMonth();
    loadFromStorage();
    renderCalendar();
  }

  start();

})();
