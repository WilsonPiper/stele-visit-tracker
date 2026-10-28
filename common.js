/* Shared data handling for the extension and its tests. */
globalThis.Stele = (() => {
  const labels = { world: '世界遗产 World Heritage', national: '全国级 National', provincial: '省级 Provincial', city: '市级 City', county: '县 / 区级 County', other: '其他 / 未知 Other' };
  function classify(text) {
    text = String(text || '');
    const found = new Set();
    for (const part of text.split(/[；;\n]/)) {
      if (/世界(?:文化|自然|文化与自然|文化和自然|文化自然)?(?:双重)?遗产|World Heritage/i.test(part)) found.add('world');
      if (/全国重点文物保护单位|国家级文物保护单位|国保/.test(part)) found.add('national');
      if (/(?:省|自治区|直辖市|北京市|天津市|上海市|重庆市)(?:级)?(?:重点)?文物保护单位/.test(part)) found.add('provincial');
      else if (/市(?:级)?(?:重点)?文物保护单位/.test(part)) found.add('city');
      if (/(?:县|区)(?:级)?(?:重点)?文物保护单位/.test(part.replace(/自治区/g, ''))) found.add('county');
    }
    return found.size ? Object.keys(labels).filter(level => found.has(level)) : ['other'];
  }
  function safeId(id) { return /^[a-zA-Z0-9_-]{1,100}$/.test(id || ''); }
  function normalise(value) {
    if (!value || !safeId(value.id) || typeof value.name !== 'string' || !value.name.trim()) throw new Error('Invalid site record');
    const str = v => typeof v === 'string' ? v.slice(0, 20000) : '';
    const date = str(value.visitDate);
    let levels;
    if (Array.isArray(value.levels)) {
      if (!value.levels.length || value.levels.some(level => typeof level !== 'string' || !Object.hasOwn(labels, level))) throw new Error('Invalid site levels');
      levels = Object.keys(labels).filter(level => value.levels.includes(level));
    } else {
      levels = classify(value.designation);
      if (Object.hasOwn(labels, value.level) && value.level !== 'other' && !levels.includes(value.level)) levels = [...levels.filter(level => level !== 'other'), value.level];
      levels = Object.keys(labels).filter(level => levels.includes(level));
    }
    if (value.worldIds !== undefined && (!Array.isArray(value.worldIds) || value.worldIds.some(id => typeof id !== 'string' || !/^\d{1,10}$/.test(id)))) throw new Error('Invalid World Heritage number');
    const worldIds = [...new Set(value.worldIds || [])];
    const identifiers = {};
    if (value.identifiers !== undefined) {
      if (!value.identifiers || typeof value.identifiers !== 'object' || Array.isArray(value.identifiers)) throw new Error('Invalid designation identifiers');
      for (const [level, entries] of Object.entries(value.identifiers)) {
        if (!['national','provincial','city','county'].includes(level) || !Array.isArray(entries)) throw new Error('Invalid designation identifiers');
        identifiers[level] = entries.map(entry => {
          if (!entry || typeof entry.number !== 'string' || !entry.number.trim() || entry.number.length > 200 || typeof entry.scope !== 'string' || entry.scope.length > 200) throw new Error('Invalid designation identifier');
          if (entry.parentId !== undefined && entry.parentId !== '' && !safeId(entry.parentId)) throw new Error('Invalid parent identifier');
          return { number: entry.number.trim(), scope: entry.scope.trim(), ...(entry.parentId ? { parentId: entry.parentId } : {}) };
        });
      }
    }
    return { id: value.id, name: str(value.name).trim(), location: str(value.location), designation: str(value.designation), levels, worldIds, identifiers, visitDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '', note: str(value.note), savedAt: str(value.savedAt) };
  }
  function keysFor(record, level) {
    if (level === 'world') return record.worldIds.map(id => 'unesco:' + id);
    if (level === 'other') return [];
    return (record.identifiers[level] || []).filter(x => level === 'national' || x.scope).map(x => JSON.stringify([level, level === 'national' ? '' : x.scope, x.number]));
  }
  function missingFor(record, level) {
    if (level === 'other') return false;
    if (level === 'world') return !record.worldIds.length;
    const entries = record.identifiers[level] || [];
    return !entries.length || (level !== 'national' && entries.some(x => !x.scope));
  }
  function count(records, level) {
    if (level !== 'world' && level !== 'other') {
      const parents = new Map();
      function find(x) { if (!parents.has(x)) parents.set(x, x); if (parents.get(x) !== x) parents.set(x, find(parents.get(x))); return parents.get(x); }
      function union(a, b) { const left = find(a), right = find(b); if (left !== right) parents.set(left, right); }
      let missing = 0;
      for (const r of records.filter(r => r.levels.includes(level))) {
        const entries = (r.identifiers[level] || []).filter(e => level === 'national' || e.scope);
        for (const entry of entries) {
          const scope = level === 'national' ? '' : entry.scope;
          const num = JSON.stringify(['number', level, scope, entry.number]); find(num);
          if (entry.parentId) union(num, JSON.stringify(['parent',level,scope,entry.parentId]));
          if (entries.length === 1) union(num, JSON.stringify(['parent',level,scope,r.id]));
        }
        if (missingFor(r, level)) missing++;
      }
      return new Set([...parents.keys()].map(find)).size + missing;
    }
    const keys = new Set();
    for (const r of records.filter(r => r.levels.includes(level))) {
      const ids = keysFor(r, level);
      for (const id of ids) keys.add(id);
      if (level === 'other' || missingFor(r, level)) keys.add('site:' + r.id);
    }
    return keys.size;
  }
  function url(id) { return `http://stele.geogv.org/zhcn/geo/${encodeURIComponent(id)}`; }
  function csv(records) {
    const cell = v => { let s = String(v ?? ''); if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['名称 Name','级别 Levels','世界遗产编号 World Heritage IDs','文保编号 Protection IDs','原始保护级别 Original designation','位置 Location','到访日期 Visit date','备注 Notes','链接 URL','保存时间 Saved at'], ...records.map(r => [r.name, r.levels.map(level => labels[level]).join('；'), r.worldIds.join('；'), Object.entries(r.identifiers).flatMap(([level,entries]) => entries.map(x => `${labels[level]}: ${x.scope ? x.scope + ' ' : ''}${x.number}`)).join('；'), r.designation, r.location, r.visitDate, r.note, url(r.id), r.savedAt])];
    return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  }
  return { labels, classify, normalise, keysFor, missingFor, count, safeId, url, csv };
})();
