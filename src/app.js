// ─────────────────────────────────────────────────────────────────────────────
// PagaPrint Frontend — app.js
// Connects to the backend at http://localhost:4000
// ─────────────────────────────────────────────────────────────────────────────

const API = 'http://localhost:4000/api';

// Variant-level pricing loaded from Excel upload — window global so studio.js can access it
// Key: variant ID e.g. "BC-MASTFO-100", Value: { base, offer }
window.VARIANT_PRICING = {};

// ── State ─────────────────────────────────────────────────────────────────────
// Restore saved pricing from localStorage on page load
(function restorePricing() {
  try {
    const savedVariants = localStorage.getItem('pp_variant_pricing');
    const savedTable    = localStorage.getItem('pp_pricing_table');
    const savedOffer    = localStorage.getItem('pp_offer_active');

    if (savedVariants) {
      const parsed = JSON.parse(savedVariants);
      if (Object.keys(parsed).length > 0) {
        window.VARIANT_PRICING = parsed;
        console.log('✅ Restored', Object.keys(parsed).length, 'variants from localStorage');
      }
    }
    if (savedTable) {
      const t = JSON.parse(savedTable);
      PRICING_TABLE.base  = t.base  || PRICING_TABLE.base;
      PRICING_TABLE.offer = t.offer || PRICING_TABLE.offer;
    }
    if (savedOffer !== null) {
      OFFER_ACTIVE = savedOffer === 'true';
    }
  } catch(e) { console.warn('Could not restore pricing:', e); }
})();

let cart = [];                // { id, product_id, product_name, emoji, options_label, unit_price, selections }
let currentProduct = null;   // full product object from API
let selections = {};         // current customizer selections
let uploadedFileUrl = null;  // URL of uploaded design file
let currentOrderId = null;   // UUID returned by POST /api/orders

// ── Page navigation ───────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name === 'admin') loadAdmin();
  if (name === 'cart')  renderCart();
}

function scrollToProducts() {
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

// ── Cart badge ────────────────────────────────────────────────────────────────
function updateCartBadge() {
  document.getElementById('cart-badge').textContent = cart.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS — load from API
// ─────────────────────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products?status=active`);
    const products = await res.json();
    renderProductGrid(products);
  } catch {
    // Fallback if backend not running
    renderProductGrid(FALLBACK_PRODUCTS);
  }
}

function renderProductGrid(products) {
  const grid = document.getElementById('product-grid');
  if (!products.length) {
    grid.innerHTML = '<p style="color:#6b7280">No products available yet. Add some in the admin panel.</p>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="openCustomizer('${p.id}')">
      <div class="product-thumb" style="background:${thumbBg(p.id)}">${p.emoji || '📦'}</div>
      <div class="product-body">
        ${p.id === 'business-cards' ? '<span class="product-badge badge-popular">Most popular</span>' : ''}
        ${p.id === 'sheet-stickers' ? '<span class="product-badge badge-new">New</span>' : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-price">From $${p.base_price.toFixed(2)}</div>
      </div>
    </div>
  `).join('');
}

function thumbBg(id) {
  return { 'business-cards': '#e6f0fa', 'sheet-stickers': '#f0fdf4', 'banners': '#fff7ed' }[id] || '#f3f4f6';
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMIZER
// ─────────────────────────────────────────────────────────────────────────────
async function openCustomizer(productId) {
  try {
    const res = await fetch(`${API}/products/${productId}`);
    currentProduct = await res.json();
  } catch {
    currentProduct = FALLBACK_PRODUCTS.find(p => p.id === productId);
    if (!currentProduct) return showToast('Product not found');
  }

  selections = {};
  uploadedFileUrl = null;
  document.getElementById('upload-status').style.display = 'none';

  document.getElementById('bread-name').textContent = currentProduct.name;
  document.getElementById('customize-title').textContent = currentProduct.name;
  document.getElementById('customize-desc').textContent = currentProduct.description || '';

  renderOptions();
  updateLivePrice();
  updatePreview();
  updateCartBtnForProduct(productId);
  showPage('customize');
}

function renderOptions() {
  const container = document.getElementById('options-container');
  container.innerHTML = '';

  (currentProduct.options || []).forEach(opt => {
    const group = document.createElement('div');
    group.className = 'opt-group';

    const label = document.createElement('span');
    label.className = 'opt-label';
    label.textContent = opt.label;
    group.appendChild(label);

    const choices = opt.choices || [];

    if (opt.option_type === 'chip') {
      const chips = document.createElement('div');
      chips.className = 'chips';
      choices.forEach((c, i) => {
        // choices can be a plain string OR an object { label, price }
        const chipLabel = (typeof c === 'object' && c !== null) ? c.label : c;
        const chip = document.createElement('div');
        chip.className = 'chip' + (i === 0 ? ' active' : '');
        chip.textContent = chipLabel;
        if (i === 0) selections[opt.label] = chipLabel;
        chip.onclick = () => {
          chips.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
          selections[opt.label] = chipLabel;
          updateLivePrice();
        };
        chips.appendChild(chip);
      });
      group.appendChild(chips);

    } else if (opt.option_type === 'color') {
      const swatches = document.createElement('div');
      swatches.className = 'color-swatches';
      choices.forEach((hex, i) => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (i === 0 ? ' active' : '');
        sw.style.background = hex;
        sw.title = hex;
        if (i === 0) selections['_color'] = hex;
        sw.onclick = () => {
          swatches.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
          sw.classList.add('active');
          selections['_color'] = hex;
          updatePreview();
        };
        swatches.appendChild(sw);
      });
      group.appendChild(swatches);

    } else if (opt.option_type === 'qty') {
      const chips = document.createElement('div');
      chips.className = 'chips';
      // choices are objects: { label, price }
      choices.forEach((c, i) => {
        const chip = document.createElement('div');
        const isDefault = (i === 0);
        chip.className = 'chip' + (isDefault ? ' active' : '');
        chip.textContent = c.label;
        if (isDefault) { selections[opt.label] = c.label; selections['_price'] = c.price; }
        chip.onclick = () => {
          chips.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
          selections[opt.label] = c.label;
          selections['_price'] = c.price;
          document.getElementById('price-note').textContent = 'for ' + c.label;
          updateLivePrice();
        };
        chips.appendChild(chip);
      });
      // Init price-note
      const defaultQty = choices[0];
      if (defaultQty) document.getElementById('price-note').textContent = 'for ' + defaultQty.label;
      group.appendChild(chips);

    } else if (opt.option_type === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'form-text-input';
      inp.placeholder = opt.placeholder || 'Type here...';
      inp.oninput = () => { selections[opt.label] = inp.value; updatePreview(); };
      group.appendChild(inp);
    }

    container.appendChild(group);
  });
}

function updateLivePrice() {
  let price;
  if (currentProduct && currentProduct.id === 'business-cards') {
    price = getVariantPrice();
  } else {
    price = selections['_price'] || (currentProduct && currentProduct.base_price) || 0;
  }
  price = parseFloat(price).toFixed(2);
  document.getElementById('live-price').textContent = price;
  const addPriceEl = document.getElementById('add-price');
  if (addPriceEl) addPriceEl.textContent = price;
}

// Look up price from PRICING_TABLE using all selected options
function getVariantPrice() {
  // Parse qty — selections['Quantity'] is stored as "100", "300" etc.
  const qtyRaw = String(selections['Quantity'] || '100').replace(/[^0-9]/g, '');
  const qty    = parseInt(qtyRaw) || 100;

  const paper  = String(selections['Paper Stock'] || 'Matte').toLowerCase();
  const corner = String(selections['Corners']     || 'Standard').toLowerCase();
  const sides  = String(selections['Print Sides'] || 'Front Only').toLowerCase();

  // Build variant key matching Excel format: BC-[MA/GL][ST/RO][FO/FB]-[qty]
  const paperCode  = paper.includes('gloss')  ? 'GL' : 'MA';
  const cornerCode = corner.includes('round') ? 'RO' : 'ST';
  const sidesCode  = (sides.includes('back') || sides.includes('front & back') || sides.includes('both')) ? 'FB' : 'FO';
  const variantKey = `BC-${paperCode}${cornerCode}${sidesCode}-${qty}`;

  console.log('Variant lookup:', variantKey, '| VARIANT_PRICING keys:', Object.keys(window.VARIANT_PRICING).length);

  // Check variant-level pricing table first (populated from uploaded Excel)
  if (window.VARIANT_PRICING[variantKey]) {
    const v = window.VARIANT_PRICING[variantKey];
    const price = (OFFER_ACTIVE && v.offer && v.offer < v.base) ? v.offer : v.base;
    console.log('Variant price found:', price);
    return price;
  }

  // Fall back to qty-only pricing from PRICING_TABLE
  const base  = PRICING_TABLE.base[qty]  || 9.99;
  const offer = PRICING_TABLE.offer[qty] || base;
  console.log('Fallback price for qty', qty, ':', base, '/ offer:', offer);
  return (OFFER_ACTIVE && offer < base) ? offer : base;
}

function updatePreview() {
  const isCard = currentProduct?.id === 'business-cards';
  const previewBox = document.getElementById('preview-box');
  const mock = document.getElementById('preview-mock');

  if (!isCard) {
    mock.style.display = 'none';
    previewBox.style.background = '#f3f4f6';
    return;
  }

  mock.style.display = 'block';
  const name = selections['Your name (preview)'] || 'Your Name';
  const title = selections['Job title (preview)'] || 'Title · Company';
  const color = selections['_color'] || '#ffffff';
  const dark = isColorDark(color);

  document.getElementById('pm-name').textContent = name;
  document.getElementById('pm-title').textContent = title;
  previewBox.style.background = color;
  previewBox.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : '#b3d0f0';
  document.getElementById('pm-name').style.color = dark ? '#fff' : '#003087';
  document.getElementById('pm-title').style.color = dark ? 'rgba(255,255,255,0.7)' : '#0070ba';
  document.getElementById('pm-contact').style.color = dark ? 'rgba(255,255,255,0.5)' : '#0070ba';
}

function isColorDark(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// ── Upload design file ────────────────────────────────────────────────────────
document.getElementById('upload-btn').onclick = () => {
  document.getElementById('file-input').click();
};

async function handleFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status');
  statusEl.style.display = 'block';
  statusEl.textContent = '⏳ Uploading...';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/upload/design`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      uploadedFileUrl = data.url;
      statusEl.textContent = '✅ File uploaded: ' + file.name;
    } else {
      statusEl.textContent = '❌ Upload failed. Try again.';
    }
  } catch {
    statusEl.textContent = '❌ Could not reach the server. Is your backend running?';
  }
}

// ── Add to cart ───────────────────────────────────────────────────────────────
function addToCart() {
  if (!currentProduct) return;

  const price = parseFloat(selections['_price'] || currentProduct.base_price);
  const optLabel = Object.entries(selections)
    .filter(([k]) => !k.startsWith('_') && !['Your name (preview)', 'Job title (preview)'].includes(k))
    .map(([, v]) => v).join(' · ');

  cart.push({
    id: Date.now(),
    product_id: currentProduct.id,
    product_name: currentProduct.name,
    emoji: currentProduct.emoji || '📦',
    options_label: optLabel || 'Standard options',
    unit_price: price,
    selections: { ...selections },
    design_file_url: uploadedFileUrl
  });

  updateCartBadge();
  showToast('✓ Added to cart!');
  showPage('cart');
}

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────
function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const sideEl = document.getElementById('cart-sidebar');

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some products to get started.</p>
        <button class="btn-primary lg" onclick="showPage('home')">Browse products</button>
      </div>`;
    sideEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-emoji">${item.emoji}</div>
      <div class="cart-details">
        <div class="cart-product">${item.product_name}</div>
        <div class="cart-options">${item.options_label}</div>
        ${item.design_file_url ? '<div style="font-size:11px;color:#0070ba;margin-top:4px">📎 Design file uploaded</div>' : ''}
      </div>
      <div class="cart-right">
        <div class="cart-price">$${item.unit_price.toFixed(2)}</div>
        <button class="cart-remove" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.unit_price, 0);
  const shipping = subtotal >= 75 ? 0 : 6.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  sideEl.innerHTML = `
    <div class="cart-summary-box">
      <h3>Order summary</h3>
      <div class="sum-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="sum-row"><span>Shipping</span><span>${shipping === 0 ? '<span class="free-ship">Free</span>' : '$' + shipping.toFixed(2)}</span></div>
      <div class="sum-row"><span>Sales tax (est. 8%)</span><span>$${tax.toFixed(2)}</span></div>
      <div class="sum-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
      <p class="ship-nudge">${
        subtotal >= 75
          ? '🎉 You qualify for free shipping!'
          : `Add $${(75 - subtotal).toFixed(2)} more for free shipping`
      }</p>
      <div class="paypal-divider">pay securely with</div>
      <button class="btn-paypal" onclick="startCheckout(${total.toFixed(2)})">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#009cde"/>
          <path d="M23.336 5.863c-.053.353-.114.714-.186 1.089-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.49 9.459a.641.641 0 01-.633.534H5.998l.879-5.565c.082-.518.526-.9 1.05-.9h2.19c4.298 0 7.664-1.747 8.647-6.797.072-.375.133-.736.186-1.089.367.187.678.413.936.678.547.562.832 1.335.507 3.896z" fill="#003087"/>
        </svg>
        Pay with PayPal — $${total.toFixed(2)}
      </button>
      <p class="paypal-note">You'll be redirected to PayPal to complete payment securely</p>
    </div>`;
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartBadge();
  renderCart();
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYPAL CHECKOUT
// ─────────────────────────────────────────────────────────────────────────────
async function startCheckout(total) {
  showToast('⏳ Creating your order...');

  // 1) Create order in our backend
  let orderRes;
  try {
    const r = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          name: 'Guest Customer',
          email: 'guest@pagaprint.com',
          address: 'United States'
        },
        items: cart.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          selections: i.selections,
          unit_price: i.unit_price,
          quantity: 1
        }))
      })
    });
    orderRes = await r.json();
    currentOrderId = orderRes.order_id;
  } catch {
    showToast('❌ Could not reach the server. Is your backend running?', 4000);
    return;
  }

  // 2) Create PayPal order
  let paypalRes;
  try {
    const r = await fetch(`${API}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: currentOrderId })
    });
    paypalRes = await r.json();
  } catch {
    showToast('❌ PayPal connection failed. Check your .env keys.', 4000);
    return;
  }

  // 3) Redirect to PayPal for payment
  if (paypalRes.approve_url) {
    window.location.href = paypalRes.approve_url;
  } else {
    showToast('❌ Could not get PayPal approval URL.', 4000);
  }
}

// ── Handle PayPal return ──────────────────────────────────────────────────────
// PayPal redirects back to: /checkout/success?token=...&order_id=...
async function handlePayPalReturn() {
  const params = new URLSearchParams(window.location.search);
  const paypalToken = params.get('token');      // PayPal order ID
  const orderId = params.get('order_id');        // Our order UUID

  if (!paypalToken || !orderId) return;

  showToast('⏳ Confirming payment...');

  try {
    const r = await fetch(`${API}/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypal_order_id: paypalToken, order_id: orderId })
    });
    const data = await r.json();

    if (data.success) {
      cart = [];
      updateCartBadge();
      document.getElementById('success-order-id').textContent = orderId.slice(0, 8).toUpperCase();
      showPage('success');
      window.history.replaceState({}, '', '/');
    } else {
      showToast('❌ Payment could not be confirmed. Contact support.', 5000);
    }
  } catch {
    showToast('❌ Error confirming payment.', 4000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
async function loadAdmin() {
  // Stats
  try {
    const r = await fetch(`${API}/orders/stats`);
    const s = await r.json();
    document.getElementById('stat-orders').textContent = s.total_orders;
    document.getElementById('stat-revenue').textContent = '$' + (s.month_revenue || 0).toFixed(2);
    document.getElementById('stat-pending').textContent = s.pending;
  } catch {
    document.getElementById('stat-orders').textContent = '—';
  }

  // Products — always show table; use fallback if backend offline
  let products = [];
  try {
    const r = await fetch(`${API}/products`);
    products = await r.json();
  } catch {
    // Backend offline — use fallback so Edit options buttons always visible
    products = FALLBACK_PRODUCTS.map(p => ({
      ...p,
      status: p.id === 'banners' ? 'draft' : 'active',
      options: p.options || []
    }));
  }
  document.getElementById('stat-products').textContent = products.filter(p => p.status === 'active').length;
  const renderRow = p => {
    const opts = (p.options || []).map(o => o.label).join(', ');
    const price = Number(p.base_price).toFixed(2);
    const statusCls = p.status === 'active' ? 's-active' : 's-draft';
    const toggleLabel = p.status === 'active' ? 'Unpublish' : 'Publish';
    const toggleStatus = p.status === 'active' ? 'draft' : 'active';
    return `<tr>
      <td>${p.emoji || ''} ${p.name}</td>
      <td style="color:#6b7280;font-size:13px">${opts}</td>
      <td>$${price}</td>
      <td><span class="status-pill ${statusCls}">${p.status}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="tbl-btn" style="color:var(--blue);border-color:var(--blue);font-weight:600"
          onclick="openProductEditor('${p.id}')">Edit options</button>
        <button class="tbl-btn" onclick="toggleProductStatus('${p.id}','${toggleStatus}')">
          ${toggleLabel}
        </button>
        <button class="tbl-btn danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>`;
  };
  document.getElementById('products-tbody').innerHTML = products.map(renderRow).join('');

  // Orders
  try {
    const r = await fetch(`${API}/orders?limit=10`);
    const orders = await r.json();
    document.getElementById('orders-tbody').innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td style="font-size:12px;color:#6b7280;font-family:monospace">#${o.id.slice(0,8).toUpperCase()}</td>
        <td>${o.customer_name}<br><span style="font-size:12px;color:#9ca3af">${o.customer_email}</span></td>
        <td style="font-size:13px;color:#6b7280">Print order</td>
        <td>$${o.total.toFixed(2)}</td>
        <td><span class="status-pill ${statusClass(o.status)}">${o.status}</span></td>
        <td>
          <select class="form-input" style="font-size:12px;padding:4px 8px;width:130px" onchange="updateOrderStatus('${o.id}', this.value)">
            ${['pending','paid','printing','shipped','delivered'].map(s => `<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="color:#6b7280;padding:1rem">No orders yet</td></tr>';
  } catch {
    document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="6" style="color:#6b7280;padding:1rem">Could not load orders</td></tr>';
  }
}

function statusClass(s) {
  return { pending: 's-draft', paid: 's-paid', printing: 's-print', shipped: 's-ship', delivered: 's-active' }[s] || 's-draft';
}

async function toggleProductStatus(id, newStatus) {
  try {
    await fetch(`${API}/products/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`✓ Product ${newStatus === 'active' ? 'published' : 'unpublished'}`);
    loadAdmin();
  } catch { showToast('❌ Could not update product'); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    showToast('✓ Product deleted');
    loadAdmin();
    loadProducts();
  } catch { showToast('❌ Could not delete product'); }
}

async function updateOrderStatus(orderId, status) {
  try {
    await fetch(`${API}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    showToast(`✓ Order updated to "${status}"`);
  } catch { showToast('❌ Could not update order'); }
}

function showAddProductModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal(e) {
  if (e.target.id === 'modal-overlay') {
    document.getElementById('modal-overlay').style.display = 'none';
  }
}

async function saveNewProduct() {
  const id    = document.getElementById('new-id').value.trim().toLowerCase().replace(/\s+/g, '-');
  const name  = document.getElementById('new-name').value.trim();
  const desc  = document.getElementById('new-desc').value.trim();
  const emoji = document.getElementById('new-emoji').value.trim();
  const price = parseFloat(document.getElementById('new-price').value);
  const status= document.getElementById('new-status').value;

  if (!id || !name || !price) {
    showToast('❌ ID, name, and price are required');
    return;
  }

  try {
    const r = await fetch(`${API}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, description: desc, emoji, base_price: price, status, options: [] })
    });
    if (r.ok) {
      document.getElementById('modal-overlay').style.display = 'none';
      showToast('✓ Product created!');
      loadAdmin();
      loadProducts();
    } else {
      const err = await r.json();
      showToast('❌ ' + (err.error || 'Could not create product'));
    }
  } catch { showToast('❌ Could not reach the server'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK DATA (shown when backend is offline)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_PRODUCTS = [
  { id: 'business-cards', name: 'Business Cards', emoji: '🪪', base_price: 9.99,
    description: 'Fully customizable business cards with our live design studio.',
    options: [
      { label: 'Paper Stock', option_type: 'chip', choices: [
        { label: 'Matte' }, { label: 'Glossy' }
      ]},
      { label: 'Corners', option_type: 'chip', choices: [
        { label: 'Standard' }, { label: 'Rounded' }
      ]},
      { label: 'Print Sides', option_type: 'chip', choices: [
        { label: 'Front Only' }, { label: 'Front & Back' }
      ]},
      { label: 'Quantity', option_type: 'qty', choices: [
        { label: '100', price: 9.99 }, { label: '300', price: 22.99 },
        { label: '500', price: 34.99 }, { label: '1000', price: 59.99 }
      ]}
    ]},
  { id: 'sheet-stickers', name: 'Sheet Stickers', emoji: '🏷️', base_price: 5.99,
    description: 'Die-cut or square-cut stickers on vinyl, kraft, or clear material.',
    options: [
      { label: 'Sheet size', option_type: 'chip', choices: ['Letter (8.5×11 in)', 'Half letter (5.5×8.5 in)', 'A5 (5.8×8.3 in)', 'Custom'] },
      { label: 'Material', option_type: 'chip', choices: ['Vinyl glossy', 'Vinyl matte', 'Kraft paper', 'Clear vinyl', 'Holographic'] },
      { label: 'Cut type', option_type: 'chip', choices: ['Die-cut (custom shape)', 'Square cut', 'Circle cut', 'Kiss cut'] },
      { label: 'Quantity', option_type: 'qty', choices: [
        { label: '10 sheets', price: 5.99 }, { label: '25 sheets', price: 11.99 },
        { label: '50 sheets', price: 19.99 }, { label: '100 sheets', price: 34.99 }
      ]}
    ]},
  { id: 'banners', name: 'Banners', emoji: '🎌', base_price: 14.99,
    description: 'Indoor and outdoor banners in multiple sizes with or without stand.',
    options: [
      { label: 'Banner size', option_type: 'chip', choices: ['2×4 ft', '3×6 ft', '4×8 ft', '5×10 ft', 'Custom'] },
      { label: 'Material', option_type: 'chip', choices: ['Vinyl (indoor)', 'Mesh (outdoor)', 'Fabric', 'PVC flex'] },
      { label: 'Finishing', option_type: 'chip', choices: ['Grommets all corners', 'Pole pockets', 'Hem only', 'No finishing'] },
      { label: 'Quantity', option_type: 'qty', choices: [
        { label: '1 banner', price: 14.99 }, { label: '3 banners', price: 39.99 },
        { label: '5 banners', price: 59.99 }, { label: '10 banners', price: 99.99 }
      ]}
    ]}
];

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  handlePayPalReturn();  // handles PayPal redirect back
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDIO INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

// Update button label for business cards vs other products
function updateCartBtnForProduct(productId) {
  const btn = document.getElementById('add-cart-btn');
  if (!btn) return;
  if (productId === 'business-cards') {
    btn.innerHTML = 'Continue to Studio →';
    btn.style.background = '#0070ba';
  } else {
    btn.innerHTML = 'Add to cart — $<span id="add-price">0.00</span>';
    btn.style.background = '';
    updateLivePrice();
  }
}

// addToCart — routes business cards to Studio, others direct to cart
function addToCart() {
  if (currentProduct && currentProduct.id === 'business-cards') {
    const sel = {};
    (currentProduct.options || []).forEach(opt => {
      if (selections[opt.label]) sel[opt.label] = selections[opt.label];
    });
    if (selections['Quantity']) sel['Quantity'] = String(selections['Quantity']).replace(' cards','').replace(/,/g,'');
    openStudio(sel);
  } else {
    // non-business-card products go straight to cart
    if (!currentProduct) return;
    const price = parseFloat(selections['_price'] || currentProduct.base_price);
    const optLabel = Object.entries(selections)
      .filter(([k]) => !k.startsWith('_') && !['Your name (preview)', 'Job title (preview)'].includes(k))
      .map(([, v]) => v).join(' · ');
    cart.push({
      id: Date.now(),
      product_id: currentProduct.id,
      product_name: currentProduct.name,
      emoji: currentProduct.emoji || '📦',
      options_label: optLabel || 'Standard options',
      unit_price: price,
      selections: { ...selections }
    });
    updateCartBadge();
    showToast('✓ Added to cart!');
    showPage('cart');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING SHEET UPLOAD (admin panel)
// ─────────────────────────────────────────────────────────────────────────────
function uploadPricingSheet() {
  document.getElementById('pricing-file-input').click();
}

function handlePricingUpload(input) {
  const file = input.files[0];
  if (!file) return;
  showToast('⏳ Reading pricing sheet...');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      // Read all rows as raw values
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

      console.log('Excel total rows:', rows.length);
      console.log('Row 4 sample (first data row):', rows[4]);

      // Reset global pricing tables
      window.VARIANT_PRICING = {};
      const loadedBase  = {};
      const loadedOffer = {};
      let   loaded      = 0;

      // Data starts at row index 4 (rows 0-3 are title/headers)
      rows.slice(4).forEach((row, i) => {
        // Skip completely empty rows
        if (!row || row.every(c => c === null || c === '')) return;

        const variantId = String(row[0] || '').trim();
        const qty       = parseInt(row[4])     || 0;
        const base      = parseFloat(row[5])   || 0;
        const offer     = parseFloat(row[6])   || 0;
        const active    = String(row[8] !== null && row[8] !== undefined ? row[8] : 'YES').toUpperCase().trim();

        console.log(`Row ${i + 5}: id=${variantId} qty=${qty} base=${base} offer=${offer} active=${active}`);

        if (!variantId.startsWith('BC-')) return; // skip non-product rows
        if (!qty || !base)                return; // skip if missing key fields
        if (active === 'NO')              return; // skip inactive

        window.VARIANT_PRICING[variantId] = {
          base:  base,
          offer: (offer > 0 && offer < base) ? offer : base
        };
        loaded++;

        // Build qty-level fallback (cheapest base/offer per qty across all variants)
        if (!loadedBase[qty] || base < loadedBase[qty])   loadedBase[qty]  = base;
        if (offer > 0 && offer < base) {
          if (!loadedOffer[qty] || offer < loadedOffer[qty]) loadedOffer[qty] = offer;
        }
      });

      console.log('Loaded variants:', loaded, '| VARIANT_PRICING:', window.VARIANT_PRICING);

      // Update qty-level fallback table
      if (Object.keys(loadedBase).length) {
        PRICING_TABLE.base  = loadedBase;
        PRICING_TABLE.offer = Object.keys(loadedOffer).length ? loadedOffer : loadedBase;
        OFFER_ACTIVE        = Object.keys(loadedOffer).some(q => loadedOffer[q] < loadedBase[q]);
      }

      if (loaded > 0) {
        // Save to localStorage so pricing survives page navigation
        try {
          localStorage.setItem('pp_variant_pricing', JSON.stringify(window.VARIANT_PRICING));
          localStorage.setItem('pp_pricing_table', JSON.stringify(PRICING_TABLE));
          localStorage.setItem('pp_offer_active', String(OFFER_ACTIVE));
          console.log('✅ Saved', loaded, 'variants to localStorage');
        } catch(e) { console.warn('Could not save to localStorage:', e); }

        showToast(`✅ ${loaded} variants loaded! Pricing is now active.`);
        if (currentProduct && currentProduct.id === 'business-cards') updateLivePrice();
      } else {
        showToast('⚠️ No variants found. Check the Excel file format.');
      }

    } catch(err) {
      console.error('Pricing upload error:', err);
      showToast('❌ Could not read file. Use the PagaPrint variants Excel.');
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}
