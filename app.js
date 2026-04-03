/* =============================================
   INVENTARIO DE PRODUCTOS — app.js
   CRUD completo con localStorage
   ============================================= */

// ── Estado ──────────────────────────────────────
let products = JSON.parse(localStorage.getItem('inv_products') || '[]');
let nextId    = parseInt(localStorage.getItem('inv_nextId')   || '1');
let editingId = null;
let deleteId  = null;
let activeFilter = 'all';

// ── Persistencia ────────────────────────────────
function save() {
  localStorage.setItem('inv_products', JSON.stringify(products));
  localStorage.setItem('inv_nextId',   String(nextId));
}

// ── Toast ────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast hidden', 3000);
}

// ── Leer formulario ──────────────────────────────
function readForm() {
  return {
    name:        document.getElementById('inp-name').value.trim(),
    category:    document.getElementById('inp-category').value,
    price:       parseFloat(document.getElementById('inp-price').value),
    stock:       parseInt(document.getElementById('inp-stock').value),
    description: document.getElementById('inp-description').value.trim(),
  };
}

// ── Validar ──────────────────────────────────────
function validate({ name, category, price, stock }) {
  if (!name)            return 'El nombre es obligatorio.';
  if (!category)        return 'Selecciona una categoría.';
  if (isNaN(price) || price < 0) return 'El precio debe ser un número positivo.';
  if (isNaN(stock) || stock < 0) return 'El stock debe ser un número positivo.';
  return null;
}

// feature/add-product-form: guardar nuevo producto con validación
function saveProduct() {
  const data  = readForm();
  const error = validate(data);
  const errEl = document.getElementById('form-error');

  if (error) {
    errEl.textContent = '⚠ ' + error;
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  if (editingId !== null) {
    // UPDATE
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) products[idx] = { id: editingId, ...data, updatedAt: new Date().toISOString() };
    showToast('✔ Producto actualizado correctamente.');
    cancelEdit();
  } else {
    // CREATE
    products.push({ id: nextId++, ...data, createdAt: new Date().toISOString() });
    showToast('✔ Producto agregado al inventario.');
    clearForm();
  }

  save();
  renderTable();
  updateStats();
}

// ── Editar ────────────────────────────────────────
// feature/edit-product: cargar datos del producto en el formulario
function editProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;

  editingId = id;
  document.getElementById('inp-name').value        = p.name;
  document.getElementById('inp-category').value    = p.category;
  document.getElementById('inp-price').value       = p.price;
  document.getElementById('inp-stock').value       = p.stock;
  document.getElementById('inp-description').value = p.description || '';

  document.getElementById('form-mode-label').textContent = '✏ Editar Producto';
  document.getElementById('btn-save').textContent = 'Actualizar Producto';
  document.getElementById('btn-cancel').classList.remove('hidden');
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('inp-name').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingId = null;
  clearForm();
  document.getElementById('form-mode-label').textContent = '➕ Nuevo Producto';
  document.getElementById('btn-save').textContent = 'Guardar Producto';
  document.getElementById('btn-cancel').classList.add('hidden');
}

function clearForm() {
  ['inp-name','inp-price','inp-stock','inp-description'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('inp-category').value = '';
  document.getElementById('form-error').classList.add('hidden');
}

// ── Eliminar (modal) ──────────────────────────────
function askDelete(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  deleteId = id;
  document.getElementById('modal-product-name').textContent = `"${p.name}"`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function confirmDelete() {
  products = products.filter(p => p.id !== deleteId);
  save();
  renderTable();
  updateStats();
  closeModal();
  showToast('🗑 Producto eliminado.', 'ok');
}

function closeModal() {
  deleteId = null;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Filtros ───────────────────────────────────────
function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderTable();
}

// ── Render tabla ──────────────────────────────────
function renderTable() {
  const query = document.getElementById('inp-search').value.toLowerCase();

  let filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(query) ||
                        p.category.toLowerCase().includes(query);
    const matchFilter = activeFilter === 'all'  ? true
                      : activeFilter === 'low'  ? p.stock > 0 && p.stock <= 5
                      : activeFilter === 'ok'   ? p.stock > 5
                      : true;
    return matchSearch && matchFilter;
  });

  const tbody  = document.getElementById('table-body');
  const empty  = document.getElementById('empty-state');
  const table  = document.getElementById('product-table');

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  filtered.forEach((p, i) => {
    const statusClass = p.stock === 0 ? 'zero' : p.stock <= 5 ? 'low' : 'ok';
    const statusText  = p.stock === 0 ? '⬤ Sin stock' : p.stock <= 5 ? '⬤ Stock bajo' : '⬤ Disponible';
    const price       = new Intl.NumberFormat('es-DO', { style:'currency', currency:'DOP', maximumFractionDigits:2 }).format(p.price);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-id">${String(p.id).padStart(3,'0')}</td>
      <td>
        <div class="td-name">${escHtml(p.name)}</div>
        ${p.description ? `<div class="td-desc">${escHtml(p.description)}</div>` : ''}
      </td>
      <td><span class="td-cat">${escHtml(p.category)}</span></td>
      <td class="td-price">${price}</td>
      <td class="td-stock">${p.stock}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <div class="actions">
          <button class="btn-edit"   onclick="editProduct(${p.id})">✏ Editar</button>
          <button class="btn-delete" onclick="askDelete(${p.id})">🗑 Borrar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Estadísticas ──────────────────────────────────
function updateStats() {
  document.getElementById('count-total').textContent = products.length;
  const low = products.filter(p => p.stock <= 5).length;
  document.getElementById('count-low').textContent = low;
}

// ── Utilidad ──────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Datos demo (solo si el inventario está vacío) ──
function seedDemo() {
  if (products.length > 0) return;
  const demo = [
    { name:'Laptop Dell XPS 15',    category:'Electrónica',  price:85000, stock:8,  description:'Intel i7, 16GB RAM, 512GB SSD' },
    { name:'Teclado Mecánico RGB',  category:'Electrónica',  price:4500,  stock:3,  description:'Switch Red, retroiluminación' },
    { name:'Silla Ergonómica Pro',  category:'Hogar',        price:12000, stock:5,  description:'Soporte lumbar ajustable' },
    { name:'Mouse Inalámbrico',     category:'Electrónica',  price:1800,  stock:15, description:'2.4GHz, batería larga duración' },
    { name:'Cuaderno A4 x50',       category:'Otro',         price:120,   stock:0,  description:'Papel rayado, tapa dura' },
  ];
  demo.forEach(d => products.push({ id: nextId++, ...d, createdAt: new Date().toISOString() }));
  save();
}

// ── INIT ──────────────────────────────────────────
seedDemo();
renderTable();
updateStats();

// Cerrar modal al hacer click fuera
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});