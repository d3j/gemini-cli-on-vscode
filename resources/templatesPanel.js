(function(){
    const vscode = acquireVsCodeApi();
    const listEl = document.getElementById('tpl-list');
    const searchEl = document.getElementById('tpl-search');
    const clearRefreshBtn = document.getElementById('tpl-clear-refresh');

    let currentId = null;
    let currentName = '';
    let templates = [];
    const previewCache = new Map();

    function request(command, payload){
        const requestId = Math.random().toString(36).slice(2);
        vscode.postMessage({ command, payload, requestId, version: 1 });
        return new Promise((resolve, reject)=>{
            const handler = (ev)=>{
                const msg = ev.data;
                if(!msg || msg.requestId !== requestId) return;
                window.removeEventListener('message', handler);
                if(msg.type === 'result') resolve(msg.data || { success: true });
                else reject(new Error(msg.error || 'error'));
            };
            window.addEventListener('message', handler);
        });
    }

    async function loadList(){
        const query = searchEl.value.trim();
        const res = await request('templates/list', { sources: ['user', 'history'], query, limit: 500 });
        templates = res.templates || [];
        renderGroupedList(templates);
        setSelection(null, '');
    }

    function renderGroupedList(items){
        listEl.innerHTML = '';
        const groups = new Map();
        for(const t of items){
            const gid = t.groupId || 'ungrouped';
            if(!groups.has(gid)) groups.set(gid, { name: t.groupName || (t.source || 'Templates'), items: [] });
            groups.get(gid).items.push(t);
        }
        for(const [gid, g] of groups){
            const gEl = document.createElement('div');
            gEl.className = 'tpl-group';
            const gHeader = document.createElement('div');
            gHeader.className = 'tpl-group-header';
            gHeader.innerHTML = `<div class="name">${escapeHtml(g.name || 'Templates')}</div>`;
            const gBody = document.createElement('div');
            gBody.className = 'tpl-group-body';
            // default collapsed except first group
            gEl.appendChild(gHeader);
            gEl.appendChild(gBody);
            let expanded = listEl.children.length === 0; // expand first by default
            if (!expanded) gBody.style.display = 'none';
            gHeader.addEventListener('click', ()=>{
                expanded = !expanded;
                gBody.style.display = expanded ? '' : 'none';
            });
            for(const t of g.items){
                gBody.appendChild(createItemElement(t));
            }
            listEl.appendChild(gEl);
        }
    }

    function createItemElement(t){
        const el = document.createElement('div');
        el.className = 'tpl-item';
        const header = document.createElement('div');
        header.className = 'acc-header';
        header.innerHTML = `<div class="name">${escapeHtml(t.name)}</div>`+
            `<div class="meta">${escapeHtml(t.source)}${t.tags && t.tags.length? ' · '+t.tags.map(escapeHtml).join(', '): ''}</div>`;
        const body = document.createElement('div');
        body.className = 'acc-body';
        const actions = document.createElement('div');
        actions.className = 'tpl-actions-row';
        actions.innerHTML = `
            <button class=\"act-head\">Head</button>
            <button class=\"act-cursor\">Cursor</button>
            <button class=\"act-tail\">Tail</button>
            <div class=\"spacer\"></div>
            <button class=\"act-replace\" title=\"Replace entire prompt\">Replace</button>
        `;
        const preview = document.createElement('div');
        preview.className = 'tpl-preview-body';
        preview.innerHTML = '<em>Loading preview...</em>';
        body.appendChild(actions);
        body.appendChild(preview);
        el.appendChild(header);
        el.appendChild(body);
        header.addEventListener('click', async ()=>{
            const isExpanded = el.classList.contains('expanded');
            document.querySelectorAll('.tpl-item.expanded').forEach(n=> n.classList.remove('expanded'));
            if (isExpanded) {
                el.classList.remove('expanded');
                setSelection(null, '');
                return;
            }
            el.classList.add('expanded');
            setSelection(t.id, t.name);
            if (previewCache.has(t.id)) {
                preview.innerHTML = previewCache.get(t.id);
            } else {
                const res = await request('templates/preview', { id: t.id, values: {} });
                const html = res.html || '<em>No preview</em>';
                previewCache.set(t.id, html);
                preview.innerHTML = html;
            }
        });
        // Wire per-item actions
        actions.querySelector('.act-head').addEventListener('click', ()=> insert(t.id, 'head', false));
        actions.querySelector('.act-cursor').addEventListener('click', ()=> insert(t.id, 'cursor', false));
        actions.querySelector('.act-tail').addEventListener('click', ()=> insert(t.id, 'tail', false));
        actions.querySelector('.act-replace').addEventListener('click', ()=> insert(t.id, 'cursor', true));
        return el;
    }

    function setSelection(id, name){
        currentId = id;
        currentName = name || '';
        // nothing to toggle globally; actions are per-item
    }

    function escapeHtml(s){
        return String(s)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#39;');
    }

    // Clear/Refresh button toggles by input content
    function updateClearRefreshButton(){
        const empty = !searchEl.value.trim();
        clearRefreshBtn.textContent = empty ? '⟳' : '×';
        clearRefreshBtn.setAttribute('aria-label', empty ? 'Refresh' : 'Clear search');
        clearRefreshBtn.setAttribute('title', empty ? 'Refresh' : 'Clear');
    }
    updateClearRefreshButton();
    clearRefreshBtn.addEventListener('click', ()=>{
        const empty = !searchEl.value.trim();
        if (empty) {
            // Refresh: re-query and reset caches/expanded
            previewCache.clear();
            document.querySelectorAll('.tpl-item.expanded').forEach(n=> n.classList.remove('expanded'));
            setSelection(null, '');
            loadList();
        } else {
            // Clear text and reload
            searchEl.value = '';
            updateClearRefreshButton();
            loadList();
        }
    });
    // Esc to clear
    searchEl.addEventListener('keydown', (e)=>{
        if (e.key === 'Escape') {
            if (searchEl.value) {
                searchEl.value = '';
                updateClearRefreshButton();
                loadList();
                e.stopPropagation();
                e.preventDefault();
            }
        }
    });
    searchEl.addEventListener('input', ()=>{ updateClearRefreshButton(); });
    searchEl.addEventListener('input', debounce(loadList, 300));

    function debounce(fn, ms){
        let h; return (...args)=>{ clearTimeout(h); h=setTimeout(()=>fn(...args), ms); };
    }

    loadList();

    async function insert(id, position, replacePrompt){
        if(!id) return;
        const res = await request('templates/render', { id, values: {} });
        const content = res.content || '';
        await request('composer/insertTemplate', { content, position, replacePrompt: !!replacePrompt, sourceId: id });
    }
})();
