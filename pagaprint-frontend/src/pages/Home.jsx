import React from 'react';

const products = [
  {
    id: 'business-cards',
    emoji: '🪪',
    name: 'Business Cards',
    desc: 'Matte, glossy, kraft, or foil finish. Make a lasting first impression on everyone you meet.',
    price: 'From $9.99 / 100 cards',
    badge: 'Most popular',
    badgeColor: '#0057FF',
    badgeBg: '#EEF3FF',
    bg: '#EEF3FF',
  },
  {
    id: 'sheet-stickers',
    emoji: '🏷️',
    name: 'Sheet Stickers',
    desc: 'Die-cut or square-cut on vinyl, kraft, or clear material. Perfect for packaging and branding.',
    price: 'From $5.99 / sheet',
    badge: 'New',
    badgeColor: '#16A34A',
    badgeBg: '#F0FDF4',
    bg: '#F0FDF4',
  },
  {
    id: 'banners',
    emoji: '🎌',
    name: 'Banners',
    desc: 'Indoor and outdoor banners in multiple sizes. Grab attention at events, storefronts, and trade shows.',
    price: 'From $14.99 / banner',
    badge: null,
    bg: '#FFF8F0',
  },
];

const whyItems = [
  { icon: '🚚', title: 'Free US shipping', desc: 'Free on orders over $75. Delivered in 3–5 business days.' },
  { icon: '✅', title: 'Quality guarantee', desc: 'Not happy? We reprint for free — no questions asked.' },
  { icon: '🎨', title: 'Full customization', desc: 'Upload your design or tweak it live with our editor.' },
  { icon: '🔒', title: 'PayPal secure pay', desc: 'Pay safely with PayPal, card, or PayPal Credit.' },
];

export default function Home({ setPage, setCurrentProduct }) {
  function openProduct(id) {
    setCurrentProduct(id);
    setPage('customize');
  }

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{
        padding: '72px 24px 64px', textAlign: 'center',
        background: 'linear-gradient(160deg, #F8F9FF 0%, #FFFFFF 50%)',
        borderBottom: '1.5px solid #E4E4E7',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block', fontSize: '12px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#0057FF', background: '#EEF3FF',
            padding: '5px 14px', borderRadius: '100px', marginBottom: '20px',
          }}>
            Professional printing · Ships across the US
          </div>

          <h1 style={{ marginBottom: '20px', letterSpacing: '-1.5px' }}>
            Print that makes your<br />
            <span style={{ color: '#0057FF' }}>brand unforgettable</span>
          </h1>

          <p style={{ fontSize: '17px', color: '#7A7A7A', marginBottom: '36px', lineHeight: 1.7 }}>
            Business cards, stickers, banners — fully customized and delivered fast
            to your door anywhere in the US.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => openProduct('business-cards')}>
              Start designing →
            </button>
            <button className="btn btn-lg" onClick={() => setPage('admin')}>
              View admin panel
            </button>
          </div>

          {/* Trust strip */}
          <div style={{
            display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap',
            marginTop: '40px', paddingTop: '32px', borderTop: '1.5px solid #E4E4E7',
            fontSize: '13px', color: '#7A7A7A', fontWeight: 500,
          }}>
            {['🚚 Free shipping over $75', '✅ Satisfaction guarantee', '🔒 PayPal secure checkout', '⚡ 3–5 day delivery'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px' }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#0057FF', marginBottom: '8px',
            }}>Our products</div>
            <h2 style={{ letterSpacing: '-0.5px' }}>Everything your brand needs</h2>
            <p className="text-muted mt-8" style={{ fontSize: '16px' }}>
              Pick a product and start customizing — prices update live based on your choices.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {products.map(p => (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => openProduct(p.id)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,87,255,0.10)';
                  e.currentTarget.style.borderColor = '#0057FF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '#E4E4E7';
                }}
              >
                {/* Product image area */}
                <div style={{
                  height: '160px', background: p.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '64px',
                }}>
                  {p.emoji}
                </div>

                <div style={{ padding: '20px 22px 24px' }}>
                  {p.badge && (
                    <span style={{
                      display: 'inline-block', fontSize: '11px', fontWeight: 600,
                      padding: '3px 10px', borderRadius: '100px', marginBottom: '10px',
                      background: p.badgeBg, color: p.badgeColor,
                    }}>
                      {p.badge}
                    </span>
                  )}
                  <h3 style={{ marginBottom: '8px' }}>{p.name}</h3>
                  <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>{p.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0057FF' }}>{p.price}</span>
                    <span style={{ fontSize: '13px', color: '#0057FF', fontWeight: 500 }}>Customize →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why PagaPrint ─────────────────────────────────────────────── */}
      <section style={{
        background: '#F5F5F7', borderTop: '1.5px solid #E4E4E7',
        borderBottom: '1.5px solid #E4E4E7', padding: '64px 24px',
      }}>
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#0057FF', marginBottom: '8px',
            }}>Why PagaPrint</div>
            <h2 style={{ letterSpacing: '-0.5px' }}>Print with confidence</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
          }}>
            {whyItems.map(w => (
              <div key={w.title} className="card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{w.icon}</div>
                <h4 style={{ marginBottom: '6px' }}>{w.title}</h4>
                <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        padding: '32px 24px', textAlign: 'center',
        fontSize: '13px', color: '#7A7A7A', borderTop: '1.5px solid #E4E4E7',
      }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, marginRight: '8px' }}>
          <span style={{ color: '#0057FF' }}>Paga</span>Print
        </span>
        © 2025 · Professional printing for US businesses · Secure PayPal checkout
      </footer>
    </div>
  );
}
