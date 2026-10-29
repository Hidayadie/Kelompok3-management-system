// Jalankan: node client/check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const element = (tag) => ({
  tag, children: [],
  append(...children) { this.children.push(...children); },
  replaceChildren(...children) { this.children = [...children]; },
  querySelector(tag) { return this.children.find((child) => child.tag === tag); }
});
const nodes = new Map();
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, element(id));
  return nodes.get(id);
};
node('item-template').content = { cloneNode: () => ({ querySelector: () => ({}) }) };
node('items').append = () => {};
node('orders').append(element('caption'), element('thead'));
const context = vm.createContext({
  document: { getElementById: node, createElement: element, cookie: '' }, location: { protocol: 'http:' }, Intl, AbortSignal,
  fetch: async (path, options) => {
    assert.equal(path, 'http://localhost:8080/api/private/orders');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(options.body), { items: [{ product_id: 7, quantity: 2 }] });
    return { ok: true, json: async () => ({ data: { id: 42 } }) };
  }
});
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
vm.runInContext(`renderOrders([
  { id: 1, created_at: '2026-10-22T00:00:00Z', grand_total: 35000, order_details: [
    { product: { name: '<Kopi>' }, qty: 2, price: 10000, subtotal: 20000 },
    { product_id: 8, qty: 1, price: 15000, subtotal: 15000 }
  ] },
  { id: 2, created_at: '2026-10-22T00:00:00Z', grand_total: 9000, order_details: [
    { product: { name: 'Teh' }, qty: 3, price: 3000, subtotal: 9000 }
  ] }
])`, context);
const groups = node('orders').children.filter((child) => child.tag === 'tbody');
assert.equal(groups.length, 2);
assert.match(groups[0].children[0].children[0].textContent, /Nota #1/);
assert.equal(groups[0].children.length, 4);
assert.equal(groups[0].children[1].children[0].textContent, '<Kopi>');
assert.equal(groups[0].children[2].children[0].textContent, 'Produk #8');
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
assert.equal(groups[0].children[3].children[1].textContent, currency.format(35000));
assert.equal(groups[1].children[2].children[1].textContent, currency.format(9000));
vm.runInContext('renderOrders([])', context);
assert.equal(node('orders').children.length, 3);
assert.equal(node('orders').children[2].children[0].children[0].textContent, 'Belum ada order.');
const item = (id, quantity) => ({ querySelector: (selector) => ({ value: selector.includes('product_id') ? id : quantity }) });
node('items').children = [item('7', '2')];
assert.equal(vm.runInContext('JSON.stringify(readItems())', context), '[{"product_id":7,"quantity":2}]');
node('items').children.push(item('7', '1'));
assert.throws(() => vm.runInContext('readItems()', context), /duplikat/);
node('items').children = [item('0', '2')];
assert.throws(() => vm.runInContext('readItems()', context), /positif/);
vm.runInContext("saveToken('test-token', 3600)", context);
assert.match(context.document.cookie, /Max-Age=3600; SameSite=Lax/);
assert.equal(vm.runInContext('readToken()', context), 'test-token');
vm.runInContext("request('/api/private/orders', { items: [{ product_id: 7, quantity: 2 }] })", context)
  .then((order) => { assert.equal(order.id, 42); vm.runInContext("saveToken('')", context); assert.equal(vm.runInContext('readToken()', context), ''); console.log('Validasi item dan request order: OK'); })
  .catch((error) => { console.error(error); process.exitCode = 1; });
