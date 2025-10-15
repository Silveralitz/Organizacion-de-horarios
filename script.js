// Calendario mensual con eventos (ES)
// - Navegación por mes/año
// - Añadir/editar/eliminar eventos en cualquier día
// - Guardado en localStorage, export/import JSON
// - UI en español

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

  // Estado
  let viewYear, viewMonth; // month: 0-11
  let selectedDate = null; // "YYYY-MM-DD"
  let events = []; // {id, date: "YYYY-MM-DD", title, start:"HH:MM"?, end:"HH:MM"?, color, description}

  const STORAGE_KEY = 'calendario_eventos_v1';

  // ---------- Inicializar selects y cabecera ----------
  function initHeader(){
    // month select
    monthNames.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    // year select: rango amplio +/-10 años actual por defecto (puede cambiar)
    const currentYear = new Date().getFullYear();
    for(let y = currentYear - 10; y <= currentYear + 10; y++){
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }

    // weekdays header
    weekdays.forEach(w => {
      const d = document.createElement('div');
      d.className = 'wd';
      d.textContent = w;
      weekdaysEl.appendChild(d);
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
  function ymdToDate(s){ // "YYYY-MM-DD" -> Date local
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function dateToYmd(dt){
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  }
  function todayStr(){
    return dateToYmd(new Date());
  }

  // ---------- Render calendario mensual ----------
  function renderCalendar(){
    calendarGrid.innerHTML = '';
    monthSelect.value = viewMonth;
    yearSelect.value = viewYear;

    // primer día del mes (Date), y dia de semana (0=Dom... but we want Mon first)
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // get day index with Monday=0..Sunday=6
    const jsWeekday = firstOfMonth.getDay(); // 0 Sun .. 6 Sat
    const firstGridIndex = (jsWeekday + 6) % 7; // Monday=0

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // compute previous month days to fill
    const prevMonth = new Date(viewYear, viewMonth, 0); // last day of prev month
    const prevDays = prevMonth.getDate();

    // cells: 6 rows x 7 = 42 cells to cover any month
    const totalCells = 42;
    for(let i = 0; i < totalCells; i++){
      const cell = document.createElement('div');
      cell.className = 'day';
      const cellIndex = i - firstGridIndex + 1;
      let cellDate, inThisMonth = true;

      if(cellIndex <= 0){
        // previous month
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

      // header with number
      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = Number(cellDate.slice(-2));
      cell.appendChild(dayNum);

      // events container (show up to 2 pills)
      const evsContainer = document.createElement('div');
      evsContainer.className = 'events';
      const dayEvents = events.filter(e => e.date === cellDate);
      if(dayEvents.length > 0){
        const listToShow = dayEvents.slice(0, 2);
        listToShow.forEach(ev => {
          const pill = document.createElement('div');
          pill.className = 'event-pill';
          pill.style.background = ev.color || '#3AA0FF';
          pill.title = ev.title + (ev.start ? ` • ${ev.start}` : '');
          pill.textContent = `${ev.start ? ev.start + ' ' : ''}${ev.title}`;
          pill.dataset.id = ev.id;
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            openModalForEvent(ev);
          });
          evsContainer.appendChild(pill);
        });
        if(dayEvents.length > 2){
          const more = document.createElement('div');
          more.className = 'event-count';
          more.textContent = `+${dayEvents.length - 2} más`;
          evsContainer.appendChild(more);
        }
      } else {
        // small placeholder to keep height consistent (optional)
      }
      cell.appendChild(evsContainer);

      // highlight today
      if(cellDate === todayStr()){
        cell.style.boxShadow = 'inset 0 0 0 2px rgba(58,160,255,0.16)';
      }

      // click selects day
      cell.addEventListener('click', () => {
        selectedDate = cellDate;
        renderDayPanel();
        // animate selection
        document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
        cell.classList.add('selected');
      });

      calendarGrid.appendChild(cell);
    }

    // if selectedDate not in current view, reset selection
    if(!selectedDate || !isDateInView(selectedDate)){
      // pick the first day of the view month by default
      selectedDate = dateToYmd(new Date(viewYear, viewMonth, 1));
    }

    renderDayPanel();
  }

  function isDateInView(ymd){
    const d = ymdToDate(ymd);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }

  // ---------- Panel lateral: eventos del día ----------
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
      const h = document.createElement('div');
      h.style.display='flex';
      h.style.justifyContent='space-between';
      const t = document.createElement('div');
      t.textContent = ev.title || '(Sin título)';
      t.style.fontWeight = 700;
      const time = document.createElement('div');
      time.textContent = ev.start ? (ev.end ? `${ev.start} — ${ev.end}` : ev.start) : '';
      time.className = 'event-meta';
      h.appendChild(t);
      h.appendChild(time);

      const meta = document.createElement('div');
      meta.className = 'event-meta';
      meta.textContent = ev.description || '';
      if(ev.color){
        meta.style.borderLeft = `6px solid ${ev.color}`;
        meta.style.paddingLeft = '8px';
      }

      const actions = document.createElement('div');
      actions.className = 'event-actions';
      const edit = document.createElement('button');
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => openModalForEvent(ev));
      const del = document.createElement('button');
      del.textContent = 'Eliminar';
      del.className = 'danger';
      del.addEventListener('click', () => {
        if(confirm('¿Eliminar este evento?')) {
          events = events.filter(x => x.id !== ev.id);
          saveAndRender();
        }
      });
      actions.appendChild(edit);
      actions.appendChild(del);

      card.appendChild(h);
      if(meta.textContent) card.appendChild(meta);
      card.appendChild(actions);

      eventsList.appendChild(card);
    });
  }

  // ---------- Modal / Form ----------
  function openModalForDate(dateYmd){
    openModal({
      id: '',
      date: dateYmd || todayStr(),
      title: '',
      start: '',
      end: '',
      color: '#3AA0FF',
      description: ''
    }, true);
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
    eventForm.elements['color'].value = obj.color || '#3AA0FF';
    eventForm.elements['description'].value = obj.description || '';
    deleteBtn.classList.toggle('hidden', isNew);
    // focus title
    setTimeout(() => eventForm.elements['title'].focus(), 100);
  }

  function closeModal(){
    modal.classList.add('hidden');
    eventForm.reset();
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
    const description = f.elements['description'].value;

    if(!date){
      alert('Selecciona una fecha válida.');
      return;
    }
    if(start && end && start >= end){
      alert('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    const existing = events.find(x => x.id === id);
    if(existing){
      existing.title = title;
      existing.date = date;
      existing.start = start;
      existing.end = end;
      existing.color = color;
      existing.description = description;
    } else {
      events.push({ id, title, date, start, end, color, description });
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
    }catch(err){
      console.error('Error leyendo storage', err);
    }
  }

  function saveToStorage(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }catch(err){
      console.error('Error guardando storage', err);
    }
  }

  function normalizeEvent(raw){
    return {
      id: String(raw.id ?? Date.now()),
      title: String(raw.title ?? ''),
      date: String(raw.date ?? todayStr()),
      start: raw.start || '',
      end: raw.end || '',
      color: raw.color || '#3AA0FF',
      description: raw.description || ''
    };
  }

  function saveAndRender(){
    saveToStorage();
    renderCalendar();
  }

  // ---------- Export / Import / Clear ----------
  function exportJSON(){
    const data = JSON.stringify(events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-eventos-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
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
    }catch(err){
      alert('Error importando: ' + (err.message || err));
    } finally {
      importFile.value = '';
    }
  }

  function clearAll(){
    if(confirm('¿Borrar todos los eventos? Esta acción no se puede deshacer.')){
      events = [];
      saveAndRender();
    }
  }

  // ---------- Navegación ----------
  function changeMonth(delta){
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    renderCalendar();
  }

  function goToToday(){
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = dateToYmd(now);
    renderCalendar();
    // highlight today's cell
    const todayCell = document.querySelector(`.day[data-date="${selectedDate}"]`);
    if(todayCell) {
      todayCell.classList.add('selected');
      todayCell.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  // ---------- Inicializar aplicación ----------
  function start(){
    initHeader();
    // set initial view to today
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();

    loadFromStorage();
    renderCalendar();
  }

  start();

})();