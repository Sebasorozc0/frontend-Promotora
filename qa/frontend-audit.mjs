// Standalone frontend audit. All API calls are intercepted in the browser.
// Does not contact or start the backend. Requires local npm dependencies and Edge.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const output = resolve('qa/results');
const resultName = process.argv.includes('--regression') ? 'frontend-regression.json' : 'frontend-audit.json';
await mkdir(output, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', `--user-data-dir=${resolve(tmpdir(), 'promotora-frontend-audit-' + Date.now())}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, serial = 0;
const pending = new Map();
async function cdp(method, params = {}) {
  const id = ++serial;
  const result = new Promise((resolve, reject) => { pending.set(id, {resolve, reject}); setTimeout(() => { if (pending.has(id)) {pending.delete(id); reject(new Error('Timeout: ' + method));} }, 15000).unref(); });
  ws.send(JSON.stringify({id, method, params}));
  return result;
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result?.value;
}
function installFixtures() {
  if (!location.href.startsWith('http://127.0.0.1:5178')) return;
  const q = new URLSearchParams(location.search);
  const role = q.get('role') || 'ADMINISTRADOR';
  const loginRole = role === 'ANONIMO' ? 'ADMINISTRADOR' : role;
  const scenario = q.get('scenario') || '200';
  const user = { id: 7, email: 'qa@example.test', nombre: 'Usuario QA', apellido: 'Prueba', rol: role, debeCambiarPassword: q.has('password') };
  const token = 'qa.' + btoa(JSON.stringify({ role: loginRole, sub: '7', exp: 4102444800 })) + '.qa';
  localStorage.clear();
  if (role !== 'ANONIMO') {
    localStorage.setItem('promotora_access_token', token);
    localStorage.setItem('promotora_user', JSON.stringify(user));
  }
  window.__qa = {requests: [], errors: [], dialogs: [], status: scenario, mutationStatus: 200};
  window.alert = text => window.__qa.dialogs.push(text);
  window.confirm = () => true;
  window.addEventListener('error', e => window.__qa.errors.push(e.message));
  window.addEventListener('unhandledrejection', e => window.__qa.errors.push(String(e.reason?.message || JSON.stringify(e.reason))));
  const page = items => ({items, page: 1, pageSize: 20, total: items.length, totalPages: 1});
  const venue = { id: 11, duenoId: 7, nombre: 'Recinto QA', direccion: 'Dirección QA', ciudad: 'Guatemala', capacidadTotal: 100, activo: true, imagenPlanoUrl: null };
  const zone = { id: 21, recintoId: 11, nombre: 'Localidad QA', capacidad: 100, color: '#10B981', geometria: {type: 'polygon', points: [[10,10],[200,10],[200,200]]}, activo: true };
  const event = { id: 31, nombre: 'Evento QA', titulo: 'Evento QA', descripcion: 'Descripción QA', recintoId: 11, categoriaId: 41, recintoNombre: 'Recinto QA', categoriaNombre: 'Concierto QA', fechaInicio: '2027-01-20T18:00:12Z', fechaFin: '2027-01-20T23:00:00Z', fechaInicioVenta:'2026-12-01T18:00:00Z', fechaFinVenta:'2027-01-19T18:00:00Z', estado: 'EN_VENTA', maxBoletosPorCompra: 6, precioMinimo: 100, precioMaximo: 100, cupoTotal: 100, cupoDisponible: 90 };
  if (scenario === 'foreign') event.recintoId = 999;
  const category = { id: 41, nombre: 'Concierto QA', descripcion: 'QA', activo: true };
  const artist = { id: 51, nombreArtistico: 'Artista QA', biografia: 'QA', activo: true, promedioCalificacion: 4, totalResenas: 1 };
  const account = {id: 61, duenoId: 7, duenoNombre: 'Dueño QA', empresa: 'QA', tipo: 'DUENO', moneda: 'GTQ', saldo: 500, estado: 'ACTIVA', fechaCreacion: '2026-11-01T00:00:00Z'};
  const doc = {id: 71, serie: 'DOC-QA', nombreArchivo: 'Documento_QA.pdf', version: 1, estado: 'INDEXADO', chunks: 3, fechaCreacion: '2026-11-01T00:00:00Z', activo: true};
  const review = {id: 81, eventoId: 31, eventoTitulo: 'Evento QA', usuarioId: 8, clienteNombre: 'Cliente QA', calificacion: 4, comentario: 'Reseña QA', estado: 'PENDIENTE', creadoEn: '2026-11-01T00:00:00Z'};
  const dist = {eventoId: 31, localidadId: 21, publicado: false, mesas: [], sillas: [{id: 91, numero: 1, fila: 'A', x: 100, y: 100, estado: 'DISPONIBLE'}]};
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/')) return realFetch(input, options);
    const path = url.pathname.replace('/api/v1', '');
    const method = options.method || 'GET';
    const entry = {path, query: url.search, method, idempotencyKey:new Headers(options.headers).get('Idempotency-Key'), body: typeof options.body === 'string' ? options.body : options.body instanceof FormData ? [...options.body.keys()] : null};
    window.__qa.requests.push(entry);
    let status = Number(window.__qa.status) || 200;
    if (method !== 'GET') status = window.__qa.mutationStatus;
    if (path === '/usuarios/7') status = 200;
    if (window.__qa.status === 'offline') { entry.status = 'offline'; throw new TypeError('Failed to fetch'); }
    if (window.__qa.status === 'empty') status = 200;
    if (path === '/auth/refresh') status = window.__qa.refreshStatus || 200;
    if (scenario === 'no-distribution' && /\/distribucion$/.test(path) && method === 'GET') status = 404;
    entry.status = status;
    if (status >= 400) return new Response(JSON.stringify({status, title: 'Error QA', detail: 'QA simulated ' + status, errors: {nombre: ['QA validation field error']}}), {status, headers: {'Content-Type':'application/problem+json'}});
    if (status === 204) return new Response(null, {status});
    let data = {};
    if (path === '/usuarios/7') data = {usuario: {...user, rol:loginRole}, perfil: {empresa:'Empresa QA', telefono:'12345678'}};
    else if (path === '/usuarios') data = page([{usuario:user, perfil:{empresa:'Empresa QA'}}]);
    else if (path === '/recintos') data = page([venue]);
    else if (/\/mapa$/.test(path)) data = {...venue, recintoId: 11, recintoNombre:'Recinto QA', localidades: [zone]};
    else if (/\/localidades$/.test(path)) data = page([zone]);
    else if (path === '/catalogo/eventos' || path === '/eventos') data = page([event]);
    else if (/^\/eventos\/\d+$/.test(path)) data = event;
    else if (path === '/categorias') data = page([category]);
    else if (path === '/presentadores') data = page([artist]);
    else if (/\/presentadores$/.test(path)) data = [{presentadorId:51, nombreArtistico:'Artista QA', orden:1, rol:'PRINCIPAL'}];
    else if (path === '/cuentas') data = page([account]);
    else if (/\/movimientos$/.test(path)) data = page([{id:1, cuentaId:61, tipo:'VENTA', monto:500, saldoPosterior:500, descripcion:'QA', fechaCreacion:'2026-11-01T00:00:00Z'}]);
    else if (path === '/ia/documentos') data = page([doc]);
    else if (/^\/ia\/documentos\/\d+$/.test(path)) data = {...doc, contenidoExtraido:'Texto QA'};
    else if (path === '/resenas' || path === '/resenas/mis') data = page([review]);
    else if (/\/tipos-entrada$/.test(path)) data = [{id:1,nombre:'Entrada QA',precio:100,cupoTotal:100,cupoDisponible:90,localidadId:21}];
    else if (/\/distribucion$/.test(path)) data = dist;
    else if (/\/asientos$/.test(path)) data = dist.sillas;
    if (window.__qa.status === 'pages' && path === '/categorias') data = {items:[{...category,id:Number(url.searchParams.get('page'))}],totalPages:2,total:2};
    if (scenario === 'multi-currency' && path === '/cuentas') data = page([account,{...account,id:62,moneda:'USD',saldo:20}]);
    if (window.__qa.status === 'empty' && path !== '/usuarios/7') {
      if (data.items) data = page([]);
      else if (Array.isArray(data)) data = [];
    }
    if (method !== 'GET' && path !== '/auth/refresh') {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
      data = {id: 101, ...body, url:'/qa-image.png'};
    }
    if (path === '/auth/refresh') data = {accessToken:token, refreshToken:'qa-refresh-new', usuarioId:7};
    if (path === '/auth/login') data = {accessToken:token,refreshToken:'qa-refresh',usuarioId:7,debeCambiarPassword:false};
    return new Response(JSON.stringify(data), {status:200, headers:{'Content-Type':'application/json'}});
  };
}

const results = [];
async function visit(tab, role = 'ADMINISTRADOR', scenario = '200', extra = '') {
  await cdp('Page.navigate', {url:`http://127.0.0.1:5178/admin/${tab}?role=${role}&scenario=${scenario}${extra}`});
  for (let n=0;n<80;n++) {
    await pause(100);
    if (await evaluate(`!!window.__qa && !!document.querySelector('main') && !document.querySelector('vite-error-overlay')`)) break;
  }
  await pause(250);
}
const snapshot = () => evaluate(`({path:location.pathname,text:document.querySelector('main')?.innerText,textAll:document.body.innerText,requests:window.__qa?.requests,errors:window.__qa?.errors,dialogs:window.__qa?.dialogs,inputs:[...document.querySelectorAll('main input')].map(i=>({type:i.type,value:i.value,min:i.min,minLength:i.minLength})),buttons:[...document.querySelectorAll('main button')].map(b=>({text:b.innerText,title:b.title,disabled:b.disabled}))})`);
async function click(text) {
  return evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim().toLowerCase()===${JSON.stringify(text.toLowerCase())} || b.title===${JSON.stringify(text)});if(!b)throw new Error('Button not found: '+${JSON.stringify(text)}); b.click();return true})()`);
}
async function fill(values) {
  await evaluate(`(()=>{const fields=[...document.querySelectorAll('main form input, main form textarea')];for(let i=0;i<${values.length};i++){const value=${JSON.stringify(values)}[i];if(value===null)continue;const el=fields[i];const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  await pause(60);
}
async function submit() {await evaluate(`document.querySelector('main form').requestSubmit()`);await pause(100);}
const filter = process.argv.find(a=>a.startsWith('--filter='))?.slice(9);
async function record(name, run) {if(filter && !new RegExp(filter).test(name))return;try {await run();results.push({name,...await snapshot()});} catch(e) {results.push({name,harnessError:e.message,...await snapshot()});}}
try {
  let target;
  for (let n=0;n<100;n++) {try {const list=await (await fetch('http://127.0.0.1:9337/json/list')).json();target=list.find(t=>t.type==='page');if(target && (await fetch('http://127.0.0.1:5178')).ok)break;}catch{}await pause(200);}
  if (!target) throw new Error('Edge did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage = e => {const data=JSON.parse(e.data);if(data.id && pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(new Error(data.error.message)):p.resolve(data.result);}};
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(${installFixtures.toString()})()`});
  const adminTabs=['catalogo','recintos','eventos','distribucion','finanzas','moderacion','rag','usuarios'];
  const ownerTabs=['recintos','eventos','distribucion','finanzas'];
  if (!process.argv.includes('--actions-only')) for (const role of ['ADMINISTRADOR','DUENO_RECINTO']) {
    for(const tab of role==='ADMINISTRADOR'?adminTabs:ownerTabs) {
      for(const status of ['200','empty','400','401','500']) {
        await record(`${role}/${tab}/${status}`,()=>visit(tab,role,status));
      }
    }
  }
  await record('owner-restricted-users',()=>visit('usuarios','DUENO_RECINTO'));
  await record('anonymous-admin',()=>visit('usuarios','ANONIMO'));
  await record('client-admin',()=>visit('usuarios','CLIENTE'));
  await record('mandatory-password',()=>visit('eventos','ADMINISTRADOR','200','&password=1'));
  await record('owner-finance-actions',async()=>{await visit('finanzas','DUENO_RECINTO');});
  await record('owner-events-unrelated',async()=>{await visit('eventos','DUENO_RECINTO','foreign');});
  await record('owner-seating-unrelated',async()=>{await visit('distribucion','DUENO_RECINTO','foreign');});
  await record('seating-save-500',async()=>{await visit('distribucion');await evaluate('window.__qa.mutationStatus=500');await click('Generador de Layout');await pause(60);await click('Generar y Guardar Borrador');await pause(100);});
  await record('seating-published-generator',async()=>{await visit('distribucion');await click('Publicar y Congelar');await pause(80);await click('Generador de Layout');});
  await record('review-own-admin',async()=>{await visit('moderacion');await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Mis Reseñas'));b?.click()})()`);await pause(80);});
  await record('event-edit-fields',async()=>{await visit('eventos');await click('Editar');await pause(80);await submit();});
  for (const status of [200,400,401,500]) {
    await record('review-approve-'+status,async()=>{await visit('moderacion');await evaluate('window.__qa.mutationStatus='+status);await click('Aprobar');await pause(80);});
    await record('category-create-'+status,async()=>{await visit('catalogo');await evaluate('window.__qa.mutationStatus='+status);await click('Nueva Categoría');await pause(60);await fill(['Categoría nueva QA','Descripción QA']);await submit();});
    await record('venue-create-'+status,async()=>{await visit('recintos');await evaluate('window.__qa.mutationStatus='+status);await click('Nuevo Recinto');await pause(60);await fill(['Recinto nuevo QA','Guatemala','100','Dirección QA']);await submit();});
    await record('finance-liquidate-'+status,async()=>{await visit('finanzas');await evaluate('window.__qa.mutationStatus='+status);await click('Liquidar');await pause(60);await submit();});
    await record('rag-upload-'+status,async()=>{await visit('rag');await evaluate('window.__qa.mutationStatus='+status);await click('Cargar Nuevo Documento');await pause(60);await fill(['Documento QA']);await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File(['Documento público QA'],'qa.txt',{type:'text/plain'}));const el=document.querySelector('main form input[type=file]');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(60);await submit();});
  }
  for (const status of [200,500]) {
    await record('rag-reindex-'+status,async()=>{await visit('rag');await evaluate('window.__qa.mutationStatus='+status);await click('Reindexar');await pause(80);});
    await record('rag-deactivate-'+status,async()=>{await visit('rag');await evaluate('window.__qa.mutationStatus='+status);await click('Desactivar');await pause(80);});
    await record('rag-detail-'+status,async()=>{await visit('rag');await evaluate('window.__qa.status='+JSON.stringify(String(status)));await click('Ver Detalle');await pause(80);});
    await record('event-state-'+status,async()=>{await visit('eventos');await evaluate('window.__qa.mutationStatus='+status);await click('Estado');await pause(60);await submit();});
    await record('types-list-'+status,async()=>{await visit('eventos');await evaluate('window.__qa.status='+JSON.stringify(String(status)));await click('Entradas / Precios');await pause(80);});
    await record('finance-refund-'+status,async()=>{await visit('finanzas');await evaluate('window.__qa.mutationStatus='+status);await click('Reembolsar Compra de Cliente');await pause(60);await fill(['123e4567-e89b-12d3-a456-426614174000']);await submit();});
    await record('artist-create-'+status,async()=>{await visit('catalogo');await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Artistas & Presentadores'));b.click()})()`);await pause(60);await evaluate('window.__qa.mutationStatus='+status);await click('Nuevo Talento');await pause(60);await fill(['Artista nuevo QA','Biografía QA']);await submit();});
    await record('admin-create-'+status,async()=>{await visit('usuarios');await evaluate('window.__qa.mutationStatus='+status);await click('Alta Administrador');await pause(60);await fill(['Administrador QA','Prueba','nuevo@example.test','QA-password-1234']);await submit();});
  }
  await record('finance-multi-currency',()=>visit('finanzas','ADMINISTRADOR','multi-currency'));
  await record('seating-no-distribution',()=>visit('distribucion','ADMINISTRADOR','no-distribution'));
  await record('finance-idempotency-retry',async()=>{
    await visit('finanzas');await evaluate('window.__qa.mutationStatus=500');await click('Liquidar');await pause(60);await submit();
    await evaluate('window.__qa.mutationStatus=200');await submit();
  });
  await record('session-expiration-after-login',async()=>{
    await visit('usuarios','ANONIMO');
    await evaluate(`(()=>{[...document.querySelectorAll('header button')].find(b=>b.textContent.includes('Iniciar Sesión')).click()})()`);await pause(60);
    await evaluate(`(()=>{for(const [selector,value] of [['input[type=email]','qa@example.test'],['input[type=password]','QA-password-1234']]){const el=document.querySelector('.modal-overlay '+selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);await pause(60);
    await evaluate(`document.querySelector('.modal-overlay form').requestSubmit()`);await pause(150);
    await evaluate(`window.dispatchEvent(new CustomEvent('promotora:session-expired'))`);await pause(80);
  });
  // Direct transport tests use the same running frontend module, with mock fetch.
  await visit('catalogo');
  const transport=await evaluate(`(async()=>{const {api}=await import('/src/api/client.ts');const out=[];
    api.setTokens('qa-token','qa-refresh');window.__qa.status='401';
    try{await api.getCategorias()}catch(e){out.push({case:'refresh-retry-401',error:e})}
    out.push({case:'refresh-retry-401-log',requests:window.__qa.requests.slice(-3),tokenPresent:!!api.getAccessToken()});
    api.setTokens('qa-token','qa-refresh');window.__qa.status='200';window.__qa.mutationStatus=401;const start=window.__qa.requests.length;
    try{await api.subirFotoPresentador(51,new File(['QA'],'qa.png',{type:'image/png'}))}catch(e){out.push({case:'upload-401',error:e,requests:window.__qa.requests.slice(start)})}
    window.__qa.mutationStatus=204;
    try{await api.eliminarCategoria(41);out.push({case:'delete-204',ok:true})}catch(e){out.push({case:'delete-204',error:String(e)})}
    window.__qa.status='offline';window.__qa.mutationStatus=200;
    try{await api.crearCategoria({nombre:'QA'});out.push({case:'offline-create-category',reportedSuccess:true})}catch(e){out.push({case:'offline-create-category',reportedSuccess:false,error:String(e)})}
    window.__qa.status='pages';
    const categories=await api.getCategorias();out.push({case:'all-pages',ids:categories.map(c=>c.id)});
    const originalFetch=window.fetch;let attempt=0;api.setTokens('qa','qa-refresh');
    window.fetch=async(input,opts)=>String(input).includes('/auth/refresh') ? new Response(JSON.stringify({accessToken:'new',refreshToken:'new-refresh'}),{status:200}) : new Response(null,{status:++attempt===1?401:204});
    try{await api.eliminarCategoria(41);out.push({case:'retry-204',ok:true})}catch(e){out.push({case:'retry-204',error:String(e)})}
    window.fetch=originalFetch;
    return out;})()`);
  if (process.argv.includes('--actions-only') || filter) {
    const previous=JSON.parse(await readFile(resolve(output,resultName),'utf8'));
    const replaced=new Set(results.map(r=>r.name));
    results.unshift(...previous.results.filter(r=>!replaced.has(r.name)));
  }
  const assertions=[];
  const check=(name,pass)=>assertions.push({name,pass:!!pass});
  if(process.argv.includes('--regression')) {
    for(const r of results) {
      check(r.name+' renders',!r.harnessError && !r.errors?.length && !!r.text);
      if(/\/(400|500)$/.test(r.name)) check(r.name+' exposes error',/QA validation field error|No se pudo|No se pudieron|Acceso Restringido/.test(r.text));
      if(/\/(empty|400|401|500)$/.test(r.name))check(r.name+' no demo',!/VIVA FEST|Calendario_Temporada|admin@promotora.gt|Alejandro P\./.test(r.text));
    }
    const get=name=>results.find(r=>r.name===name);
    for(const status of [400,500])check('review rejection '+status,!get('review-approve-'+status)?.text.includes('marcada como APROBADA') && get('review-approve-'+status)?.text.includes('Reseña QA'));
    check('password gate',get('mandatory-password')?.textAll.includes('Cambio Obligatorio de Contraseña') && !get('mandatory-password')?.requests.some(r=>r.path==='/eventos'));
    check('owner finance read-only',!get('owner-finance-actions')?.buttons.some(b=>/LIQUIDAR|REEMBOLSAR|Cerrar cuenta/.test(b.text+' '+b.title)));
    for(const name of ['owner-events-unrelated','owner-seating-unrelated'])check(name+' filtered',!get(name)?.text.includes('Evento QA'));
    const edited=JSON.parse(get('event-edit-fields')?.requests.find(r=>r.method==='PUT')?.body || '{}');
    check('event instant preserved',edited.fechaInicio==='2027-01-20T18:00:12Z');
    check('sale dates preserved',edited.fechaInicioVenta==='2026-12-01T18:00:00Z' && edited.fechaFinVenta==='2027-01-19T18:00:00Z');
    check('failed seating save preserves old plan',get('seating-save-500')?.text.includes('Total Sillas: 1') && !get('seating-save-500')?.text.includes('modo local'));
    check('published plan cannot regenerate',get('seating-published-generator')?.buttons.some(b=>b.text==='GENERADOR DE LAYOUT' && b.disabled) && !get('seating-published-generator')?.text.includes('Generador Rápido de Silletería'));
    check('failed indexing preserves chunks',get('rag-reindex-500')?.text.includes('Chunks: 3') && !get('rag-reindex-500')?.text.includes('simulado'));
    check('refresh retry failure clears token',transport.find(t=>t.case==='refresh-retry-401-log')?.tokenPresent===false);
    check('upload refreshes',transport.find(t=>t.case==='upload-401')?.requests.some(r=>r.path==='/auth/refresh'));
    check('offline write rejected',transport.find(t=>t.case==='offline-create-category')?.reportedSuccess===false);
    check('all pages loaded',JSON.stringify(transport.find(t=>t.case==='all-pages')?.ids)==='[1,2]');
    check('retry accepts 204',transport.find(t=>t.case==='retry-204')?.ok);
    check('currencies kept separate',get('finance-multi-currency')?.text.includes('GTQ 500.00 · USD 20.00'));
    check('missing plan starts empty',get('seating-no-distribution')?.text.includes('Total Sillas: 0') && get('seating-no-distribution')?.buttons.some(b=>b.text==='GENERADOR DE LAYOUT' && !b.disabled));
    check('expired session after fresh login clears UI',get('session-expiration-after-login')?.text.includes('Acceso Restringido') && get('session-expiration-after-login')?.requests.some(r=>r.path==='/auth/login'));
    const retry=get('finance-idempotency-retry')?.requests.filter(r=>r.path.endsWith('/liquidar')) || [];
    check('liquidation retries once with same key',retry.length===2 && retry[0].body===retry[1].body && retry[0].idempotencyKey && retry[0].idempotencyKey===retry[1].idempotencyKey);
    check('empty venue disables drawing',get('ADMINISTRADOR/recintos/empty')?.buttons.some(b=>b.text==='TRAZAR NUEVA LOCALIDAD' && b.disabled));
  }
  await writeFile(resolve(output,resultName),JSON.stringify({scope:'Frontend only; synthetic API fixtures, no backend',results,transport,assertions},null,2));
  if(assertions.some(a=>!a.pass))process.exitCode=1;
  console.log(JSON.stringify({assertions:assertions.length,failed:assertions.filter(a=>!a.pass)},null,2));
  console.log(JSON.stringify({cases:results.length,harnessErrors:results.filter(r=>r.harnessError).map(r=>({name:r.name,error:r.harnessError})),renderErrors:results.filter(r=>r.errors?.length).map(r=>({name:r.name,errors:r.errors})),transport},null,2));
} finally {
  if (ws?.readyState===WebSocket.OPEN) {try{await cdp('Browser.close');}catch{}}
  ws?.close();
  server.kill();
  browser.kill();
}

