const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/components/admin/seatingLayout.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const exportsLayout = {};
vm.runInNewContext('(function(exports){' + code + '})')(exportsLayout);
const { normalizedPolygon, generateLayout, inside, layoutProblems } = exportsLayout;

const rectangle = normalizedPolygon([[100,100],[900,100],[900,500],[100,500]]);
const tables = generateLayout({ polygon:rectangle, mode:'MESAS', groups:6, seatsPerGroup:4, tipoEntradaId:3, modalidad:'COMPLETA' });
assert.equal(tables.mesas.length,6);
assert.equal(tables.asientos.length,24);
assert.ok(tables.mesas.every(m => inside([m.x,m.y],rectangle)));
assert.ok(tables.asientos.every(s => inside([s.x,s.y],rectangle)));
assert.equal(layoutProblems(tables,rectangle,24).length,0);
assert.ok(tables.mesas.every(m => tables.asientos.filter(s => s.mesaClave === m.clave).length === 4));
console.log('OK: seis mesas de cuatro sillas, todas dentro de la geometría real de la localidad.');

const concave = normalizedPolygon([[0,0],[1000,0],[1000,180],[400,180],[400,562],[0,562]]);
for (const mode of ['MESAS','FILAS']) {
  const result = generateLayout({ polygon:concave, mode, groups:5, seatsPerGroup:6, tipoEntradaId:3, modalidad:'POR_SILLA' });
  assert.equal(result.asientos.length,30);
  assert.ok(result.asientos.every(s => inside([s.x,s.y],concave)));
  assert.equal(new Set(result.asientos.map(s => s.etiqueta)).size,30);
  assert.equal(layoutProblems(result,concave,30).length,0);
}
console.log('OK: mesas y filas en un polígono cóncavo, sin colocar sillas fuera ni repetir etiquetas.');

assert.throws(() => normalizedPolygon([[1,1],[2,2],[3,3]]), /superficie/);
assert.throws(() => generateLayout({ polygon:rectangle, mode:'MESAS', groups:501, seatsPerGroup:1, tipoEntradaId:3, modalidad:'COMPLETA' }), /máximo/);
const outside = { ...tables, asientos:tables.asientos.map((s,i) => i ? s : { ...s,x:0,y:0 }) };
assert.ok(layoutProblems(outside,rectangle,24).some(e => e.includes('fuera')));
assert.ok(layoutProblems(tables,rectangle,20).some(e => e.includes('capacidad') || e.includes('admite')));
console.log('OK: se rechazan geometría degenerada, exceso de capacidad y posiciones fuera de la zona.');

const scaleSource = fs.readFileSync(path.join(__dirname, '../src/components/seatMapScale.ts'), 'utf8');
const scaleCode = ts.transpileModule(scaleSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const scale = {};
vm.runInNewContext('(function(exports){' + scaleCode + '})')(scale);
const dense = generateLayout({ polygon: concave, mode: 'MESAS', groups: 200, seatsPerGroup: 10, tipoEntradaId: 3, modalidad: 'POR_SILLA' });
assert.equal(dense.mesas.length, 200);
assert.equal(dense.asientos.length, 2000);
function checkMarkers(positions, maximum) {
  const radius = scale.markerRadius(positions, maximum);
  const points = positions.map(scale.mapPoint);
  for (let i = 0; i < points.length; i++) {
    for (const other of points.slice(i + 1)) {
      assert.ok(Math.hypot(points[i].x - other.x, points[i].y - other.y) >= 2 * radius + radius / 6);
    }
  }
  return radius;
}
checkMarkers(dense.mesas, 16);
for (const table of dense.mesas) {
  const group = [table, ...dense.asientos.filter(s => s.mesaClave === table.clave)];
  assert.equal(group.length, 11);
  const radius = checkMarkers(group, 8);
  const [x, y, width, height] = scale.detailViewBox(group, radius * 4).split(' ').map(Number);
  for (const point of group.map(scale.mapPoint)) {
    assert.ok(point.x - radius >= x && point.x + radius <= x + width);
    assert.ok(point.y - radius >= y && point.y + radius <= y + height);
  }
}
console.log('OK: 200 mesas y 2000 sillas. Los marcadores no se superponen en la vista general ni en el detalle de cada mesa.');
