const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
vm.runInThisContext(fs.readFileSync(__dirname + '/common.js', 'utf8'));
for (const [input, levels] of [
  ['世界遗产', ['world']], ['世界文化和自然双重遗产', ['world']],
  ['全国重点文物保护单位', ['national']], ['山西省文物保护单位', ['provincial']],
  ['自治区级重点文物保护单位', ['provincial']], ['北京市文物保护单位', ['provincial']],
  ['市级重点文物保护单位', ['city']], ['县文物保护单位', ['county']],
  ['区级文物保护单位', ['county']], ['历史建筑', ['other']],
  ['世界遗产；全国重点文物保护单位；市级文物保护单位', ['world','national','city']]
]) assert.deepEqual(Stele.classify(input), levels, input);
const legacy = Stele.normalise({id:'abc123',name:'故宫', designation:'世界遗产；全国重点文物保护单位', level:'national', note:'Hello, "world"\n=line'});
assert.deepEqual(legacy.levels, ['world','national']);
assert.deepEqual(Stele.normalise({...legacy,levels:['city']}).levels, ['city']);
assert.deepEqual(Stele.normalise({id:'x',name:'x',designation:'历史建筑',level:'city'}).levels, ['city']);
assert.throws(() => Stele.normalise({id:'../bad',name:'bad'}));
assert.throws(() => Stele.normalise({id:'ok',name:'ok',levels:[]}));
const csv = Stele.csv([legacy]);
assert.ok(csv.startsWith('\ufeff'));
assert.ok(csv.includes('世界遗产 World Heritage；全国级 National'));
assert.ok(csv.includes('"Hello, ""world""\n=line"'));
assert.ok(Stele.csv([{...legacy,note:'=1+1'}]).includes('"\'=1+1"'));
const canalA = Stele.normalise({id:'bridge', name:'拱宸桥', levels:['world', 'national'], worldIds:['1443']});
const canalB = Stele.normalise({id:'canal', name:'大运河', levels:['world'], worldIds:['1443']});
const otherWorld = Stele.normalise({id:'temple', name:'temple', levels:['world'], worldIds:['200']});
const unknown = Stele.normalise({id:'unknown', name:'unknown', levels:['world']});
assert.equal(Stele.count([canalA, canalB], 'world'), 1);
assert.equal(Stele.count([canalA, canalB, otherWorld], 'world'), 2);
assert.equal(Stele.count([canalA, canalB, unknown], 'world'), 2);
assert.equal(Stele.count([{...canalA, levels:['national']}], 'world'), 0);
const xianA = Stele.normalise({id:'xian-a',name:'仙峰寺 A',levels:['provincial'],identifiers:{provincial:[{scope:'四川省',number:'7-104'}]}});
const xianB = Stele.normalise({id:'xian-b',name:'仙峰寺 B',levels:['provincial'],identifiers:{provincial:[{scope:'四川省',number:'7-104'}]}});
const otherProvince = Stele.normalise({id:'different',name:'other',levels:['provincial'],identifiers:{provincial:[{scope:'山西省',number:'7-104'}]}});
assert.equal(Stele.count([xianA,xianB], 'provincial'), 1);
assert.equal(Stele.count([xianA,xianB,otherProvince], 'provincial'), 2);
const missingScope = Stele.normalise({...xianB,identifiers:{provincial:[{scope:'',number:'7-104'}]}});
assert.equal(Stele.count([xianA,missingScope], 'provincial'), 2);
assert.equal(Stele.missingFor(missingScope,'provincial'), true);
const nat1 = Stele.normalise({id:'nat1',name:'A',levels:['national'],identifiers:{national:[{scope:'',number:'7-104'}]}});
const nat2 = Stele.normalise({...nat1,id:'nat2'});
assert.equal(Stele.count([nat1,nat2],'national'), 1);
const parentA = Stele.normalise({id:'feilai',name:'飞来峰造像',levels:['national'],identifiers:{national:[{scope:'',number:'2-15',parentId:'shared-parent'}]}});
const mergedChild = Stele.normalise({id:'ciyun',name:'慈云岭造像',levels:['national'],identifiers:{national:[{scope:'',number:'第六批合并项46',parentId:'shared-parent'}]}});
assert.equal(Stele.count([parentA,mergedChild],'national'), 1);
assert.equal(Stele.count([parentA,mergedChild,nat1],'national'), 2);
const actualParent = Stele.normalise({id:'shared-parent',name:'飞来峰父项',levels:['national'],identifiers:{national:[{scope:'',number:'2-15'}]}});
assert.equal(Stele.count([actualParent,mergedChild],'national'), 1);
assert.equal(Stele.normalise(parentA).identifiers.national[0].parentId, 'shared-parent');
assert.equal(Stele.count([nat1,nat2],'other'), 0);
assert.ok(Stele.csv([xianA]).includes('四川省 7-104'));
assert.ok(Stele.csv([canalA]).includes('"1443"'));
assert.throws(() => Stele.normalise({...canalA,worldIds:['bad']}));
console.log('Multi-level grouping, regional scope, legacy records, validation, and CSV checks passed.');
