// ─────────────────────────────────────────────────────────────────────────────
// PagaPrint Business Card Studio
// ─────────────────────────────────────────────────────────────────────────────

let studioSelections = {};
let studioCurrentSide = 'front';
let studioDesignFront = null;
let studioDesignBack  = null;
let studioTextElements = [];
let studioNextTextId = 1;
let studioDragging = null;
let studioDragOffset = { x: 0, y: 0 };

// PRICING_TABLE and OFFER_ACTIVE are declared as window globals in app.js

function openStudio(selections) {
  studioSelections = selections;
  studioTextElements = [];
  studioDesignFront = null;
  studioDesignBack  = null;
  studioCurrentSide = 'front';
  studioNextTextId  = 1;

  renderStudioPage();
  showPage('studio');
}

function renderStudioPage() {
  const page = document.getElementById('page-studio');
  const isRounded = studioSelections['Corners'] === 'Rounded';
  const isBothSides = studioSelections['Print Sides'] === 'Front & Back';
  const radius = isRounded ? '18px' : '4px';

  page.innerHTML = `
    <div class="studio-wrap">

      <!-- Header -->
      <div class="studio-header">
        <button class="studio-back-btn" onclick="showPage('customize')">← Back</button>
        <div class="studio-title">
          <span>Business Card Studio</span>
          <span class="studio-spec">${studioSelections['Paper Stock'] || ''} · ${studioSelections['Corners'] || ''} · ${studioSelections['Print Sides'] || ''} · ${studioSelections['Quantity'] || ''} cards</span>
        </div>
        <button class="studio-save-btn" onclick="studioAddToCart()">Save & add to cart</button>
      </div>

      <div class="studio-body">

        <!-- Left: Tools -->
        <div class="studio-tools">
          <div class="studio-tools-title">Add to design</div>

          <div class="studio-tool-section">
            <div class="studio-tool-label">Text fields</div>
            <div class="studio-text-btns">
              <button class="studio-tool-btn" onclick="addTextField('name', 'Your Name', 18, true)">+ Name</button>
              <button class="studio-tool-btn" onclick="addTextField('title', 'Job Title', 12, false)">+ Job title</button>
              <button class="studio-tool-btn" onclick="addTextField('company', 'Company', 13, false)">+ Company</button>
              <button class="studio-tool-btn" onclick="addTextField('phone', 'Phone number', 11, false)">+ Phone</button>
              <button class="studio-tool-btn" onclick="addTextField('email', 'Email address', 11, false)">+ Email</button>
              <button class="studio-tool-btn" onclick="addTextField('website', 'www.yoursite.com', 11, false)">+ Website</button>
              <button class="studio-tool-btn" onclick="addTextField('address', 'Your Address', 11, false)">+ Address</button>
              <button class="studio-tool-btn" onclick="addTextField('custom', 'Custom text', 12, false)">+ Custom</button>
            </div>
          </div>

          <div class="studio-tool-section">
            <div class="studio-tool-label">Upload design</div>
            <button class="studio-upload-btn" onclick="document.getElementById('studio-file-input').click()">
              <span style="font-size:20px">📁</span>
              <span>Upload image or PDF</span>
              <span style="font-size:11px;color:#9ca3af">JPG, PNG, SVG, PDF · max 25MB</span>
            </button>
            <input type="file" id="studio-file-input" accept=".jpg,.jpeg,.png,.svg,.pdf" style="display:none" onchange="studioHandleUpload(this)">
            <div id="studio-upload-note" style="font-size:12px;color:#6b7280;margin-top:6px;display:none"></div>
          </div>

          <div class="studio-tool-section">
            <div class="studio-tool-label">Background color</div>
            <div class="studio-bg-colors">
              <div class="studio-bg-swatch active" style="background:#ffffff;border:1.5px solid #d1d5db" onclick="setCanvasBg(this,'#ffffff')"></div>
              <div class="studio-bg-swatch" style="background:#003087" onclick="setCanvasBg(this,'#003087')"></div>
              <div class="studio-bg-swatch" style="background:#1a1a2e" onclick="setCanvasBg(this,'#1a1a2e')"></div>
              <div class="studio-bg-swatch" style="background:#c0392b" onclick="setCanvasBg(this,'#c0392b')"></div>
              <div class="studio-bg-swatch" style="background:#f5f5dc;border:1px solid #d1d5db" onclick="setCanvasBg(this,'#f5f5dc')"></div>
              <div class="studio-bg-swatch" style="background:#0f3460" onclick="setCanvasBg(this,'#0f3460')"></div>
              <div class="studio-bg-swatch" style="background:#2d6a4f" onclick="setCanvasBg(this,'#2d6a4f')"></div>
              <div class="studio-bg-swatch" style="background:#f4a261" onclick="setCanvasBg(this,'#f4a261')"></div>
            </div>
          </div>

          <div class="studio-tool-section" id="studio-text-editor" style="display:none">
            <div class="studio-tool-label">Edit selected text</div>
            <input type="text" id="studio-text-value" class="studio-text-input" placeholder="Type here..." oninput="updateSelectedText(this.value)">
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              <select id="studio-font-size" class="studio-select" onchange="updateSelectedFontSize(this.value)">
                ${[9,10,11,12,13,14,16,18,20,22,24].map(s=>`<option value="${s}">${s}px</option>`).join('')}
              </select>
              <input type="color" id="studio-text-color" value="#000000" title="Text color" style="width:34px;height:28px;padding:2px;border-radius:4px;border:1px solid #d1d5db;cursor:pointer" onchange="updateSelectedColor(this.value)">
              <button class="studio-tool-btn" onclick="boldSelected()" title="Bold">B</button>
              <button class="studio-tool-btn danger" onclick="deleteSelectedText()" title="Delete">✕ Remove</button>
            </div>
          </div>

          <!-- Pricing -->
          <div class="studio-tool-section" style="margin-top:auto;padding-top:12px;border-top:1px solid #e5e7eb">
            <div class="studio-tool-label">Order summary</div>
            <div id="studio-price-display"></div>
          </div>
        </div>

        <!-- Center: Canvas -->
        <div class="studio-canvas-area">
          ${isBothSides ? `
          <div class="studio-side-tabs">
            <button class="studio-side-tab active" id="tab-front" onclick="switchSide('front')">Front</button>
            <button class="studio-side-tab" id="tab-back" onclick="switchSide('back')">Back</button>
          </div>` : ''}

          <div class="studio-canvas-outer">
            <div class="studio-canvas" id="studio-canvas"
              style="border-radius:${radius};background:#ffffff"
              onmousedown="canvasMouseDown(event)"
              onmousemove="canvasMouseMove(event)"
              onmouseup="canvasMouseUp(event)"
              onclick="canvasClick(event)">
              <div id="studio-bg-image" class="studio-bg-image"></div>
              <div id="studio-text-layer"></div>
            </div>
          </div>

          <div class="studio-canvas-hint">Click any text to select and edit it · Drag to reposition</div>

          <div class="studio-canvas-controls">
            <button class="studio-ctrl-btn" onclick="clearCanvas()">Clear all</button>
            <button class="studio-ctrl-btn" onclick="centerAllText()">Center text</button>
          </div>
        </div>

        <!-- Right: Preview -->
        <div class="studio-preview-col">
          <div class="studio-tool-label" style="margin-bottom:10px">Preview</div>
          <div class="studio-preview-card" id="studio-preview" style="border-radius:${radius}">
            <div class="preview-mini-canvas" id="preview-mini"></div>
          </div>
          <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:6px">3.5 × 2 inches</div>

          ${isBothSides ? `
          <div style="margin-top:16px">
            <div class="studio-tool-label" style="margin-bottom:10px">Back side</div>
            <div class="studio-preview-card" id="studio-preview-back" style="border-radius:${radius};background:#f9fafb;display:flex;align-items:center;justify-content:center">
              <span style="font-size:12px;color:#9ca3af">Back design here</span>
            </div>
          </div>` : ''}
        </div>

      </div>
    </div>`;

  updateStudioPriceDisplay();
  renderTextLayer();
  selectTextElement(null);
}

let selectedTextId = null;
let canvasBg = '#ffffff';

function setCanvasBg(el, color) {
  document.querySelectorAll('.studio-bg-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  canvasBg = color;
  const canvas = document.getElementById('studio-canvas');
  if (canvas) canvas.style.background = color;
  updatePreviewMini();
}

function addTextField(type, defaultText, fontSize, bold) {
  const el = {
    id: studioNextTextId++,
    type,
    text: defaultText,
    x: 30,
    y: 30 + (studioTextElements.length * 22),
    fontSize,
    bold,
    color: canvasBg === '#ffffff' || canvasBg === '#f5f5dc' ? '#111827' : '#ffffff'
  };
  studioTextElements.push(el);
  renderTextLayer();
  selectTextElement(el.id);
}

function renderTextLayer() {
  const layer = document.getElementById('studio-text-layer');
  if (!layer) return;
  layer.innerHTML = studioTextElements.map(el => `
    <div class="studio-text-el ${selectedTextId === el.id ? 'selected' : ''}"
      id="studio-el-${el.id}"
      style="left:${el.x}px;top:${el.y}px;font-size:${el.fontSize}px;color:${el.color};font-weight:${el.bold?'700':'400'}"
      onmousedown="startDrag(event,${el.id})"
      onclick="selectTextElement(${el.id});event.stopPropagation()">
      ${escHtml(el.text)}
    </div>`).join('');
  updatePreviewMini();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function selectTextElement(id) {
  selectedTextId = id;
  renderTextLayer();
  const editor = document.getElementById('studio-text-editor');
  if (!editor) return;
  if (id === null) { editor.style.display = 'none'; return; }
  const el = studioTextElements.find(e => e.id === id);
  if (!el) return;
  editor.style.display = 'block';
  document.getElementById('studio-text-value').value = el.text;
  document.getElementById('studio-font-size').value = el.fontSize;
  document.getElementById('studio-text-color').value = el.color;
}

function updateSelectedText(val) {
  const el = studioTextElements.find(e => e.id === selectedTextId);
  if (el) { el.text = val; renderTextLayer(); }
}
function updateSelectedFontSize(val) {
  const el = studioTextElements.find(e => e.id === selectedTextId);
  if (el) { el.fontSize = parseInt(val); renderTextLayer(); }
}
function updateSelectedColor(val) {
  const el = studioTextElements.find(e => e.id === selectedTextId);
  if (el) { el.color = val; renderTextLayer(); }
}
function boldSelected() {
  const el = studioTextElements.find(e => e.id === selectedTextId);
  if (el) { el.bold = !el.bold; renderTextLayer(); }
}
function deleteSelectedText() {
  studioTextElements = studioTextElements.filter(e => e.id !== selectedTextId);
  selectedTextId = null;
  renderTextLayer();
  const editor = document.getElementById('studio-text-editor');
  if (editor) editor.style.display = 'none';
}

// Drag
function startDrag(e, id) {
  e.preventDefault();
  studioDragging = id;
  const el = studioTextElements.find(x => x.id === id);
  const canvas = document.getElementById('studio-canvas');
  const rect = canvas.getBoundingClientRect();
  studioDragOffset = { x: e.clientX - rect.left - el.x, y: e.clientY - rect.top - el.y };
  selectTextElement(id);
}
function canvasMouseDown(e) { }
function canvasMouseMove(e) {
  if (!studioDragging) return;
  const canvas = document.getElementById('studio-canvas');
  const rect = canvas.getBoundingClientRect();
  const el = studioTextElements.find(x => x.id === studioDragging);
  if (el) {
    el.x = Math.max(0, Math.min(rect.width  - 20, e.clientX - rect.left - studioDragOffset.x));
    el.y = Math.max(0, Math.min(rect.height - 20, e.clientY - rect.top  - studioDragOffset.y));
    const domEl = document.getElementById(`studio-el-${el.id}`);
    if (domEl) { domEl.style.left = el.x + 'px'; domEl.style.top = el.y + 'px'; }
  }
}
function canvasMouseUp(e) { if (studioDragging) { studioDragging = null; updatePreviewMini(); } }
function canvasClick(e) { if (e.target.id === 'studio-canvas' || e.target.id === 'studio-text-layer') selectTextElement(null); }

function centerAllText() {
  const canvas = document.getElementById('studio-canvas');
  if (!canvas) return;
  const w = canvas.offsetWidth;
  studioTextElements.forEach((el, i) => { el.x = w / 2 - 60; el.y = 20 + i * 22; });
  renderTextLayer();
}

function clearCanvas() {
  if (!confirm('Clear all text and design from this side?')) return;
  studioTextElements = [];
  studioDesignFront = null;
  canvasBg = '#ffffff';
  const canvas = document.getElementById('studio-canvas');
  if (canvas) canvas.style.background = '#ffffff';
  const bgImg = document.getElementById('studio-bg-image');
  if (bgImg) bgImg.style.backgroundImage = '';
  renderTextLayer();
}

function switchSide(side) {
  // Save current side text
  if (studioCurrentSide === 'front') studioDesignFront = { texts: [...studioTextElements], bg: canvasBg };
  else studioDesignBack = { texts: [...studioTextElements], bg: canvasBg };

  studioCurrentSide = side;

  // Load new side
  const saved = side === 'front' ? studioDesignFront : studioDesignBack;
  studioTextElements = saved ? [...saved.texts] : [];
  canvasBg = saved ? saved.bg : '#ffffff';

  document.getElementById('tab-front').classList.toggle('active', side === 'front');
  document.getElementById('tab-back').classList.toggle('active', side === 'back');

  const canvas = document.getElementById('studio-canvas');
  if (canvas) canvas.style.background = canvasBg;

  renderTextLayer();
  selectTextElement(null);
}

function studioHandleUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const note = document.getElementById('studio-upload-note');
  if (note) { note.style.display = 'block'; note.textContent = '⏳ Loading...'; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const bgImg = document.getElementById('studio-bg-image');
    if (bgImg) {
      bgImg.style.backgroundImage = `url(${e.target.result})`;
      bgImg.style.backgroundSize = 'cover';
      bgImg.style.backgroundPosition = 'center';
    }
    if (note) note.textContent = '✅ ' + file.name + ' loaded';
    if (studioCurrentSide === 'front') studioDesignFront = { ...studioDesignFront, uploadedImg: e.target.result };
    else studioDesignBack = { ...studioDesignBack, uploadedImg: e.target.result };
    updatePreviewMini();
  };
  reader.readAsDataURL(file);
}

function updatePreviewMini() {
  const mini = document.getElementById('preview-mini');
  if (!mini) return;
  const isRounded = studioSelections['Corners'] === 'Rounded';
  mini.style.background = canvasBg;
  mini.style.borderRadius = isRounded ? '6px' : '2px';
  mini.innerHTML = studioTextElements.map(el => `
    <div style="position:absolute;left:${el.x * 0.35}px;top:${el.y * 0.35}px;
      font-size:${Math.max(5, el.fontSize * 0.35)}px;color:${el.color};
      font-weight:${el.bold ? '700' : '400'};white-space:nowrap">
      ${escHtml(el.text)}</div>`).join('');
}

function updateStudioPriceDisplay() {
  const qty = parseInt(studioSelections['Quantity']) || 100;

  // Try variant-level pricing first (from uploaded Excel)
  let base, offer;
  if (typeof window.VARIANT_PRICING !== 'undefined' && Object.keys(window.VARIANT_PRICING).length) {
    const paper  = (studioSelections['Paper Stock'] || 'Matte').toLowerCase();
    const corner = (studioSelections['Corners'] || 'Standard').toLowerCase();
    const sides  = (studioSelections['Print Sides'] || 'Front Only').toLowerCase();
    const paperCode  = paper.includes('gloss') ? 'GL' : 'MA';
    const cornerCode = corner.includes('round') ? 'RO' : 'ST';
    const sidesCode  = sides.includes('back')   ? 'FB' : 'FO';
    const key = `BC-${paperCode}${cornerCode}${sidesCode}-${qty}`;
    if (window.VARIANT_PRICING[key]) {
      base  = window.VARIANT_PRICING[key].base;
      offer = window.VARIANT_PRICING[key].offer;
    }
  }
  if (!base) {
    base  = PRICING_TABLE.base[qty]  || 9.99;
    offer = PRICING_TABLE.offer[qty] || base;
  }
  const hasOffer = OFFER_ACTIVE && offer < base;
  const disc = Math.round((1 - offer / base) * 100);

  const el = document.getElementById('studio-price-display');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
      <span style="font-size:22px;font-weight:700;color:#0070ba">$${(hasOffer ? offer : base).toFixed(2)}</span>
      ${hasOffer ? `<span style="font-size:14px;color:#9ca3af;text-decoration:line-through">$${base.toFixed(2)}</span>
        <span style="font-size:12px;font-weight:600;padding:2px 7px;background:#dcfce7;color:#15803d;border-radius:20px">${disc}% off</span>` : ''}
    </div>
    <div style="font-size:12px;color:#6b7280;margin-top:3px">for ${qty} cards · free shipping over $75</div>`;
}

function studioAddToCart() {
  const qty = parseInt(studioSelections['Quantity']) || 100;
  const base  = PRICING_TABLE.base[qty]  || 9.99;
  const offer = PRICING_TABLE.offer[qty] || base;
  const price = OFFER_ACTIVE && offer < base ? offer : base;

  const optLabel = Object.entries(studioSelections)
    .filter(([k]) => !k.startsWith('_'))
    .map(([,v]) => v).join(' · ');

  cart.push({
    id: Date.now(),
    product_id: 'business-cards',
    product_name: 'Business Cards',
    emoji: '🪪',
    options_label: optLabel,
    unit_price: price,
    selections: { ...studioSelections },
    studioData: {
      front: studioDesignFront || { texts: studioTextElements, bg: canvasBg },
      back:  studioDesignBack
    }
  });

  updateCartBadge();
  showToast('✓ Business cards added to cart!');
  showPage('cart');
}

// ── Load pricing from uploaded Excel (called from admin) ──────────────────────
function loadPricingFromUpload(data) {
  // data = array of rows from xlsx parsed sheet
  // Expected columns: Quantity(col5), Base Price(col6), Offer Price(col7)
  const newBase = {}; const newOffer = {};
  data.forEach(row => {
    const qty   = parseInt(row[4]);
    const base  = parseFloat(row[5]);
    const offer = parseFloat(row[6]);
    if (qty && base) {
      newBase[qty]  = base;
      if (!isNaN(offer) && offer > 0) newOffer[qty] = offer;
    }
  });
  if (Object.keys(newBase).length) {
    PRICING_TABLE.base  = newBase;
    PRICING_TABLE.offer = Object.keys(newOffer).length ? newOffer : newBase;
    OFFER_ACTIVE = Object.keys(newOffer).length > 0;
    showToast('Pricing updated from spreadsheet!');
  }
}
