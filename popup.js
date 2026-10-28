(() => {
  const $ = id => document.getElementById(id);
  const key = id => 'site:' + id;
  let records = [];
  for (const [value, label] of Object.entries(Stele.labels)) { const o = document.createElement('option'); o.value = value; o.textContent = label; $('filter').append(o); }
  const elem = (tag, text, cls) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; return el; };
  function message(text) { $('message').textContent = text; }
  function download(name, data, type) { const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([data], {type})); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
  async function load() {
    const data = await chrome.storage.local.get(null);
    records = Object.entries(data).filter(([k,v]) => k.startsWith('site:') && v && k === key(v.id)).flatMap(([,v]) => { try { return [Stele.normalise(v)]; } catch { return []; } }).sort((a,b) => a.name.localeCompare(b.name, 'zh-CN'));
    render();
  }
  function render() {
    const summary = $('summary'); summary.replaceChildren();
    for (const [keyName, title] of [['all','总计 Total'], ...Object.entries(Stele.labels)]) {
      const count = keyName === 'all' ? records.length : Stele.count(records, keyName);
      const stat = elem('div', null, 'stat'); stat.append(elem('strong', String(count)), elem('span', title)); summary.append(stat);
    }
    const missing = records.filter(r => r.levels.some(level => Stele.missingFor(r, level))).length;
    $('world-warning').textContent = missing ? `${missing} 条记录缺少编号或所属地区，可能重复计数。打开对应地点以获取编号，或在编辑中输入。` : '';
    const query = $('search').value.trim().toLowerCase(); const filter = $('filter').value;
    const items = records.filter(r => (!filter || r.levels.includes(filter)) && [r.name,r.location,r.designation,r.note].some(s => s.toLowerCase().includes(query)));
    const list = $('sites'); list.replaceChildren();
    if (!items.length) { list.append(elem('div', records.length ? '没有符合条件的记录。' : '还没有到访记录。打开 STELE 地图上的地点，点击“标记为已到访”。', 'empty')); return; }
    for (const record of items) list.append(siteCard(record));
  }
  function siteCard(r) {
    const card = elem('article', null, 'site'); const top = elem('div', null, 'site-top');
    const link = elem('a', r.name); link.href = Stele.url(r.id); link.target = '_blank'; link.rel = 'noopener noreferrer';
    const badges = elem('div', null, 'badges'); for (const level of r.levels) badges.append(elem('span', Stele.labels[level], 'badge'));
    top.append(link, badges); card.append(top);
    if (r.location) card.append(elem('p', r.location));
    if (r.designation) card.append(elem('p', r.designation));
    if (r.levels.includes('world')) card.append(elem('p', r.worldIds.length ? '世界遗产编号：' + r.worldIds.join('，') : '世界遗产编号未知 · 请打开地点或编辑'));
    for (const level of ['national','provincial','city','county']) if (r.levels.includes(level)) {
      const entries = r.identifiers[level] || [];
      card.append(elem('p', `${Stele.labels[level]}：` + (entries.length ? entries.map(x => (x.scope ? x.scope + ' · ' : '') + x.number).join('；') : '编号未知')));
    }
    if (r.visitDate) card.append(elem('p', '到访日期：' + r.visitDate));
    if (r.note) card.append(elem('p', r.note));
    const details = elem('details'); details.append(elem('summary', '编辑 / Edit')); const editor = elem('div', null, 'editor');
    const levelGroup = elem('fieldset', null, 'level-group'); levelGroup.append(elem('legend', '级别 Levels（可多选）')); const levelInputs = [];
    for (const [v,t] of Object.entries(Stele.labels)) { const label = elem('label', null, 'level-option'); const input = document.createElement('input'); input.type = 'checkbox'; input.value = v; input.checked = r.levels.includes(v); label.append(input, document.createTextNode(t)); levelGroup.append(label); levelInputs.push(input); }
    const date = document.createElement('input'); date.type = 'date'; date.value = r.visitDate;
    const note = document.createElement('textarea'); note.value = r.note; note.maxLength = 20000;
    const worldIds = document.createElement('input'); worldIds.type = 'text'; worldIds.value = r.worldIds.join(', '); worldIds.placeholder = '例如 1443；多个编号用逗号分隔';
    editor.append(levelGroup); const identifierInputs = {};
    for (const [title, input] of [['世界遗产编号 World Heritage IDs', worldIds]]) { const label = elem('label', title); label.append(input); editor.append(label); }
    for (const level of ['national','provincial','city','county']) {
      const input = document.createElement('textarea'); input.value = (r.identifiers[level] || []).map(x => level === 'national' ? x.number : `${x.scope} | ${x.number}`).join('\n'); input.placeholder = level === 'national' ? '每行一个编号，例如 7-104' : '每行一个：所属地区 | 编号，例如 四川省 | 7-104';
      const label = elem('label', `${Stele.labels[level]} · 编号（每行一个）`); label.append(input); editor.append(label); identifierInputs[level] = input;
    }
    for (const [title, input] of [['到访日期 Visit date', date], ['备注 Notes', note]]) { const label = elem('label', title); label.append(input); editor.append(label); }
    const actions = elem('div', null, 'actions'); const save = elem('button', '保存更改'); const remove = elem('button', '删除记录', 'danger');
    save.addEventListener('click', async () => { try { const levels = levelInputs.filter(input => input.checked).map(input => input.value); if (!levels.length) { message('请至少选择一个级别。'); return; } const ids = worldIds.value.trim() ? worldIds.value.split(/[,，;；\s]+/).filter(Boolean) : []; if (ids.some(id => !/^\d{1,10}$/.test(id))) { message('世界遗产编号只能包含数字，以逗号分隔。'); return; }
      const identifiers = {}; for (const [level,input] of Object.entries(identifierInputs)) { const lines = input.value.split('\n').map(line => line.trim()).filter(Boolean); identifiers[level] = lines.map(line => { let entry; if (level === 'national') entry = {scope:'',number:line}; else { const parts = line.split('|'); if (parts.length !== 2 || !parts[1].trim()) throw new Error(`${Stele.labels[level]} 请使用“所属地区 | 编号”格式`); entry = {scope:parts[0].trim(),number:parts[1].trim()}; } const old = (r.identifiers[level] || []).find(x => x.number === entry.number && x.scope === entry.scope); return old?.parentId ? {...entry,parentId:old.parentId} : entry; }); }
      await chrome.storage.local.set({[key(r.id)]: Stele.normalise({...r, levels, worldIds: ids, identifiers, visitDate: date.value, note: note.value})}); message('更改已保存。'); await load(); } catch(e) { message('保存失败：' + e.message); } });
    remove.addEventListener('click', async () => { if (!confirm(`删除“${r.name}”的到访记录？`)) return; try { await chrome.storage.local.remove(key(r.id)); message('记录已删除。'); await load(); } catch(e) { message('删除失败：' + e.message); } });
    actions.append(save,remove); editor.append(actions); details.append(editor); card.append(details); return card;
  }
  $('search').addEventListener('input',render); $('filter').addEventListener('change',render);
  $('csv').addEventListener('click', () => download('stele-visits.csv', Stele.csv(records), 'text/csv;charset=utf-8'));
  $('backup').addEventListener('click', () => download('stele-visits-backup.json', JSON.stringify({format:'stele-visits', version:1, sites:records}, null, 2), 'application/json'));
  $('restore').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; try {
    if (file.size > 10 * 1024 * 1024) throw new Error('备份文件过大');
    const data = JSON.parse(await file.text()); if (data.format !== 'stele-visits' || data.version !== 1 || !Array.isArray(data.sites)) throw new Error('备份格式不受支持');
    const incoming = data.sites.map(Stele.normalise); const keys = new Set(); for (const item of incoming) { if (keys.has(item.id)) throw new Error('备份中有重复的地点'); keys.add(item.id); }
    const current = await chrome.storage.local.get(null); const additions = {}; let skipped = 0;
    for (const item of incoming) { if (current[key(item.id)]) skipped++; else additions[key(item.id)] = item; }
    await chrome.storage.local.set(additions); await load(); message(`导入 ${Object.keys(additions).length} 条，跳过 ${skipped} 条已存在的记录。`);
  } catch(err) { message('导入失败：' + err.message); } finally { e.target.value = ''; } });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && Object.keys(changes).some(k => k.startsWith('site:'))) load().catch(e => message('读取失败：' + e.message)); });
  load().catch(e => message('读取失败：' + e.message));
})();
