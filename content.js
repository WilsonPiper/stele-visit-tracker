(() => {
  let lastId = '';
  let pending = false;
  const key = id => 'site:' + id;
  function currentId() { return location.pathname.match(/\/geo\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || ''; }
  function readSite(id, section) {
    const name = section.querySelector('#primary-poi-name')?.textContent?.trim();
    if (!name) return null;
    const fields = [...section.children].filter(el => el.id !== 'stele-visit-control');
    const address = fields.length > 1 ? fields[fields.length - 1].textContent.trim() : '';
    const panel = section.parentElement;
    const designations = []; const worldIds = []; const identifiers = {};
    for (const table of panel.querySelectorAll('table')) {
      let currentLevel = ''; let currentScope = ''; let currentEntry = null;
      for (const row of table.querySelectorAll('tr')) {
        const cells = [...row.querySelectorAll('td')];
        if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
          const heading = cells[0].textContent.trim(); designations.push(heading);
          currentLevel = Stele.classify(heading)[0];
          currentEntry = null;
          const prefix = heading.match(/^(.*?)(?:级)?(?:重点)?文物保护单位/)?.[1]?.trim() || '';
          currentScope = /^(?:省|自治区|市|区|县|直辖市)$/.test(prefix) ? '' : prefix;
          if (currentLevel === 'county') {
            const city = address.split(/\s+/).find(part => /市$/.test(part));
            currentScope = currentScope && city ? `${city}/${currentScope}` : '';
          }
        } else if (cells.length >= 2 && cells[0].textContent.trim() === '编号') {
          const text = cells[1].textContent.trim();
          if (currentLevel === 'world') {
            const link = cells[1].querySelector('a[href]');
            const fromLink = link?.getAttribute('href')?.match(/^https?:\/\/(?:www\.)?whc\.unesco\.org\/(?:en|fr)\/list\/(\d+)(?:\/|$)/i)?.[1];
            const number = fromLink || (/^\d{1,10}$/.test(text) ? text : '');
            if (number) worldIds.push(number);
          } else if (['national','provincial','city','county'].includes(currentLevel) && text && text.length <= 200) {
            currentEntry = {number: text, scope: currentLevel === 'national' ? '' : currentScope};
            (identifiers[currentLevel] ||= []).push(currentEntry);
          }
        } else if (currentEntry && cells.length >= 2 && cells[0].textContent.trim() === '名称') {
          currentEntry.name = cells[1].textContent.trim();
        }
      }
    }
    const parentLinks = [...panel.querySelectorAll('.poi-section-title')].filter(h => h.textContent.trim() === '所属项目').flatMap(h => [...h.parentElement.querySelectorAll('a[href]')].map(a => ({name:a.textContent.trim(), id:a.getAttribute('href').trim().match(/^\/zhcn\/geo\/([a-zA-Z0-9_-]+)\/?$/)?.[1]}))).filter(x => x.id);
    const suffix = {national:'国保',provincial:'省保',city:'市保',county:'县保'};
    for (const [level, entries] of Object.entries(identifiers)) for (const entry of entries) {
      if (!entry.name) continue;
      const matches = parentLinks.filter(link => link.name === entry.name || link.name === `${entry.name}（${suffix[level]}）` || link.name === `${entry.name}(${suffix[level]})`);
      if (matches.length === 1) entry.parentId = matches[0].id;
    }
    const designation = designations.filter(Boolean).join('；');
    return Stele.normalise({ id, name, location: address === name ? '' : address, designation, levels: Stele.classify(designation), worldIds, identifiers, savedAt: new Date().toISOString() });
  }
  async function update() {
    const id = currentId();
    const section = document.querySelector('#poi-basic-info-section');
    if (!id || !section || !section.querySelector('#primary-poi-name')) return;
    const existing = section.querySelector('#stele-visit-control');
    if (existing && existing.dataset.siteId === id) return;
    existing?.remove();
    const site = readSite(id, section);
    if (!site) return;
    const control = document.createElement('div'); control.id = 'stele-visit-control'; control.dataset.siteId = id;
    const button = document.createElement('button'); button.type = 'button';
    const status = document.createElement('span'); status.textContent = '读取中…';
    button.disabled = true; control.append(button, status); section.append(control); lastId = id;
    async function refresh() {
      const saved = (await chrome.storage.local.get(key(id)))[key(id)];
      if (!control.isConnected || currentId() !== id) return;
      if (saved) {
        const latest = readSite(id, section);
        if (latest && saved.name === latest.name) {
          const identifiers = {...(saved.identifiers || {})}; let changed = false;
          for (const [level, entries] of Object.entries(latest.identifiers)) {
            if (!identifiers[level]?.length && entries.length) { identifiers[level] = entries; changed = true; }
            else identifiers[level] = identifiers[level].map(old => {
              const matching = entries.find(entry => entry.number === old.number && (!old.scope || !entry.scope || entry.scope === old.scope));
              if (matching && ((!old.scope && matching.scope) || (!old.parentId && matching.parentId))) { changed = true; return {...old, ...(!old.scope && matching.scope ? {scope:matching.scope} : {}), ...(!old.parentId && matching.parentId ? {parentId:matching.parentId} : {})}; }
              return old;
            });
          }
          const worldIds = saved.worldIds?.length ? saved.worldIds : latest.worldIds;
          if (!saved.worldIds?.length && worldIds.length) changed = true;
          const before = Stele.classify(saved.designation || '');
          const extra = latest.levels.filter(level => level !== 'other' && !before.includes(level));
          const levels = [...new Set([...Stele.normalise(saved).levels.filter(level => level !== 'other' || !extra.length), ...extra])];
          const designation = extra.length ? latest.designation : saved.designation;
          if (extra.length) changed = true;
          if (changed) await chrome.storage.local.set({ [key(id)]: { ...saved, levels, designation, worldIds, identifiers } });
        }
      }
      button.disabled = false; button.classList.toggle('saved', !!saved);
      button.textContent = saved ? '✓ 已到访 · 撤销' : '＋ 标记为已到访';
      status.textContent = saved ? '可在扩展中查看和编辑' : '保存到您的浏览器';
    }
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const saved = (await chrome.storage.local.get(key(id)))[key(id)];
        if (saved) await chrome.storage.local.remove(key(id));
        else {
          const latest = currentId() === id && readSite(id, section);
          if (!latest || !section.isConnected) throw new Error('地点尚未加载完成');
          await chrome.storage.local.set({ [key(id)]: latest });
        }
        await refresh();
      } catch (e) { status.textContent = '保存失败：' + e.message; button.disabled = false; }
    });
    try { await refresh(); } catch (e) { status.textContent = '读取失败：' + e.message; }
  }
  function schedule() { if (pending) return; pending = true; setTimeout(() => { pending = false; update().catch(console.error); }, 100); }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && lastId && changes[key(lastId)]) { document.querySelector('#stele-visit-control')?.remove(); schedule(); } });
  window.addEventListener('popstate', schedule); window.addEventListener('hashchange', schedule); schedule();
})();
