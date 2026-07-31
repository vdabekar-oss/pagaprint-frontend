// ─────────────────────────────────────────────────────────────────────────────
// Product Editor — works with backend OR fallback data
// ─────────────────────────────────────────────────────────────────────────────

let editorProduct = null;
let editorNextId = 200;

async function openProductEditor(productId) {
  // Try backend first, fall back to local FALLBACK_PRODUCTS
  try {
    const r = await fetch(`${API}/products/${productId}`);
    if (r.ok) {
      editorProduct = await r.json();
    } else {
      throw new Error('not found');
    }
  } catch {
    const fallback = FALLBACK_PRODUCTS.find(p => p.id === productId);
    if (!fallback) { showToast('Product not found'); return; }
    // Normalize fallback options to match backend shape
    editorProduct = {
      ...fallback,
      status: fallback.id === 'banners' ? 'draft' : 'active',
      options: (fallback.options || []).map((o, i) => ({
        id: i + 1,
        label: o.label,
        option_type: o.option_type,
        choices: o.choices || []
      }))
    };
  }

  editorProduct = JSON.parse(JSON.stringify(editorProduct)); // deep clone
  document.getElementById('editor-modal-title').textContent = 'Edit: ' + editorProduct.name;
  renderEditorBody();
  document.getElementById('editor-modal').style.display = 'flex';
}

function renderEditorBody() {
  const p = editorProduct;
  const body = document.getElementById('editor-modal-body');
  body.innerHTML = `
    <div class="ed-top-fields">
      <div class="ed-field">
        <label>Status</label>
        <select onchange="editorProduct.status = this.value">
          <option ${p.status === 'active' ? 'selected' : ''} value="active">Active</option>
          <option ${p.status === 'draft'  ? 'selected' : ''} value="draft">Draft</option>
        </select>
      </div>
      <div class="ed-field" style="flex:1">
        <label>Pricing</label>
        <div style="font-size:13px;color:#0070ba;font-weight:500;padding:7px 0">
          Base price is set via <strong>Upload pricing sheet</strong> in the Products table.
          Upload your Excel file to update prices for all variants.
        </div>
      </div>
    </div>

    <div style="font-size:12px;color:#6b7280;margin-bottom:12px;padding:8px 12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb">
      <strong>How to edit:</strong> Click any option name or choice label to rename it.
      Use the ✕ buttons to remove. Use "+ Add" buttons to add more.
    </div>

    <div class="ed-opts" id="ed-opts">
      ${(p.options || []).map(o => renderEdOpt(o)).join('')}
    </div>
    <div class="ed-add-row">
      <button class="ed-add-btn" onclick="edAddOption('chip')">+ Add option group</button>
      <button class="ed-add-btn" onclick="edAddOption('qty')">+ Add quantity &amp; pricing</button>
    </div>`;
}

function renderEdOpt(opt) {
  const isQty = opt.option_type === 'qty';
  const choices = opt.choices || [];

  const choicesHtml = choices.map((c, ci) => `
    <div class="ed-choice-row">
      <input type="text" value="${c.label || ''}" placeholder="Choice label"
        oninput="edUpdateChoice(${opt.id}, ${ci}, 'label', this.value)">
      ${isQty ? `<input type="number" value="${Number(c.price || 0).toFixed(2)}" step="0.01" style="width:90px"
        placeholder="0.00" oninput="edUpdateChoice(${opt.id}, ${ci}, 'price', this.value)">` : ''}
      <button class="ed-del-btn" onclick="edRemoveChoice(${opt.id}, ${ci})" title="Remove this choice">✕</button>
    </div>`).join('');

  return `
    <div class="ed-opt-card" id="ed-opt-${opt.id}">
      <div class="ed-opt-header">
        <span class="ed-type-pill">${isQty ? 'qty + price' : 'options'}</span>
        <input class="ed-name-inp" type="text" value="${opt.label}"
          oninput="edUpdateLabel(${opt.id}, this.value)" placeholder="Option group name">
        <button class="ed-del-btn" onclick="edRemoveOpt(${opt.id})" title="Remove this group">✕</button>
      </div>
      <div class="ed-choices" id="ed-choices-${opt.id}">
        ${isQty ? `<div class="ed-choices-hdr">
          <span>Label</span><span style="width:90px;text-align:center;font-size:11px;color:#9ca3af">Price ($)</span><span style="width:26px"></span>
        </div>` : ''}
        ${choicesHtml}
      </div>
      <button class="ed-add-choice-btn" onclick="edAddChoice(${opt.id})">+ Add choice</button>
    </div>`;
}

function edUpdateLabel(optId, val) {
  const o = editorProduct.options.find(x => x.id === optId);
  if (o) o.label = val;
}

function edUpdateChoice(optId, ci, field, val) {
  const o = editorProduct.options.find(x => x.id === optId);
  if (!o) return;
  if (field === 'price') o.choices[ci].price = parseFloat(val) || 0;
  else o.choices[ci].label = val;
}

function edAddChoice(optId) {
  const o = editorProduct.options.find(x => x.id === optId);
  if (!o) return;
  o.choices.push(o.option_type === 'qty' ? { label: '', price: 0 } : { label: '' });
  renderEditorBody();
}

function edRemoveChoice(optId, ci) {
  const o = editorProduct.options.find(x => x.id === optId);
  if (!o || o.choices.length <= 1) { showToast('Keep at least one choice'); return; }
  o.choices.splice(ci, 1);
  renderEditorBody();
}

function edAddOption(type) {
  editorProduct.options.push({
    id: editorNextId++,
    label: type === 'qty' ? 'Quantity' : 'New option',
    option_type: type,
    choices: type === 'qty'
      ? [{ label: 'Option 1', price: 0 }, { label: 'Option 2', price: 0 }]
      : [{ label: 'Choice 1' }, { label: 'Choice 2' }]
  });
  renderEditorBody();
}

function edRemoveOpt(optId) {
  if (editorProduct.options.length <= 1) { showToast('Keep at least one option group'); return; }
  editorProduct.options = editorProduct.options.filter(o => o.id !== optId);
  renderEditorBody();
}

async function saveEditorProduct() {
  const payload = {
    name: editorProduct.name,
    description: editorProduct.description,
    base_price: editorProduct.base_price,
    status: editorProduct.status,
    options: editorProduct.options.map((o, i) => ({
      label: o.label,
      option_type: o.option_type,
      sort_order: i,
      choices: o.choices
    }))
  };

  try {
    const r = await fetch(`${API}/products/${editorProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      showToast('Product saved!');
      document.getElementById('editor-modal').style.display = 'none';
      loadAdmin();
      loadProducts();
    } else {
      showToast('Saved locally — start backend to persist to database');
      document.getElementById('editor-modal').style.display = 'none';
    }
  } catch {
    // Backend offline — save to fallback in memory
    const idx = FALLBACK_PRODUCTS.findIndex(p => p.id === editorProduct.id);
    if (idx > -1) {
      FALLBACK_PRODUCTS[idx] = { ...FALLBACK_PRODUCTS[idx], ...editorProduct };
    }
    showToast('Saved locally — start backend to persist permanently');
    document.getElementById('editor-modal').style.display = 'none';
    loadAdmin();
    loadProducts();
  }
}

function closeEditorModal(e) {
  if (!e || e.target.id === 'editor-modal') {
    document.getElementById('editor-modal').style.display = 'none';
  }
}
