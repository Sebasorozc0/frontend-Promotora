const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const cache = new Map();
const storage = new Map();
let fetcher;
const context = vm.createContext({ console, Response, Headers, URLSearchParams, FormData, URL, crypto: globalThis.crypto, setTimeout, clearTimeout, localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }, fetch: (...args) => fetcher(...args), window: { dispatchEvent() {} }, CustomEvent: class {} });
function load(name) {
  const filename = path.resolve(__dirname, '../src/api', name + '.ts');
  if (cache.has(filename)) return cache.get(filename);
  const source = fs.readFileSync(filename, 'utf8').replace('import.meta.env.VITE_API_BASE_URL', 'undefined');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; cache.set(filename, exports);
  vm.runInContext('(function(exports, require) {' + code + '\n})', context)(exports, id => load(id.replace('./','')));
  return exports;
}
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
(async () => {
  const { api } = load('client');
  const { normalize } = load('normalize');
  const compra = normalize('/compras', { publicId: 'compra-real', fechaCompra: '2026-11-03T00:00:00Z', comisionPlataforma: 30, items: [{ tipoEntradaId: 7, cantidad: 2 }] });
  assert.equal(compra.comision, 30);
  assert.equal(compra.id, 'compra-real');
  const boleto = normalize('/boletos', { publicId: 'boleto-real', compraPublicId: 'compra-real', precioUnitario: 150, ubicacion: { mesa: 'A', silla: 'S1' } });
  assert.equal(boleto.id, 'boleto-real'); assert.match(boleto.localidadNombre, /Mesa A.*Silla S1/);
  console.log('OK: DTO de compras y ubicación de boletos reales.');

  let pages = 0;
  fetcher = async url => { pages++; return json({ items: [{ publicId: 'boleto-' + pages, precioUnitario: 10 }], page: pages, pageSize: 1, total: 2 }); };
  const boletos = await api.getMisBoletos(); assert.equal(boletos.length, 2); assert.equal(pages, 2);
  console.log('OK: paginación de boletos, sin descartar páginas.');

  let refreshes = 0; let calls = 0;
  api.setTokens('access-prueba', 'refresh-prueba');
  fetcher = async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return json({ accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' }); }
    calls++;
    if (calls === 1) return new Response(null, { status: 401 });
    assert.equal(options.headers.get('Authorization'), 'Bearer access-nuevo');
    return new Response(null, { status: 204 });
  };
  await api.darBajaUsuario(123); assert.equal(refreshes, 1); assert.equal(calls, 2);
  console.log('OK: renovación JWT y respuesta 204 al reintentar.');

  fetcher = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(api.getEvento(1), e => e.status === 0);
  fetcher = async () => new Response(JSON.stringify({ detail: 'Conflicto real' }), { status: 409 });
  await assert.rejects(api.crearCompra({ eventoId: 1, items: [] }, 'intento-prueba'), e => e.status === 409 && e.detail === 'Conflicto real');
  fetcher = async () => new Response(JSON.stringify({ detail: 'IA no disponible' }), { status: 422 });
  await assert.rejects(api.consultarIa('Prueba'), e => e.status === 422);
  console.log('OK: errores de red, compra e IA visibles, sin datos ficticios.');

  let distributionPage = 0;
  fetcher = async () => { distributionPage++; return json({ eventoId: 1, localidadId: 1, totalAsientos: 101, totalMesas: 0, mesas: [], asientos: Array.from({ length: distributionPage === 1 ? 100 : 1 }, (_, i) => ({ id: (distributionPage - 1) * 100 + i + 1 })) }); };
  const plano = await api.getAsientos(1, 1); assert.equal(plano.asientos.length, 101); assert.equal(distributionPage, 2);
  console.log('OK: plano numerado completo con más de 100 sillas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
