import React, { useState } from 'react';

const styles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1.5px solid #E4E4E7',
    height: '64px', display: 'flex', alignItems: 'center',
  },
  inner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: '1080px', margin: '0 auto', padding: '0 24px',
  },
  logo: {
    fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800,
    cursor: 'pointer', letterSpacing: '-0.5px',
  },
  links: { display: 'flex', gap: '28px', alignItems: 'center' },
  link: {
    fontSize: '14px', fontWeight: 500, color: '#3A3A3A',
    cursor: 'pointer', transition: 'color 0.15s',
  },
  cartBtn: {
    position: 'relative', padding: '8px 18px', borderRadius: '10px',
    border: '1.5px solid #E4E4E7', background: '#fff', fontSize: '14px',
    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    background: '#0057FF', color: '#fff', fontSize: '11px', fontWeight: 700,
    width: '18px', height: '18px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
};

export default function Navbar({ page, setPage, cartCount }) {
  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logo} onClick={() => setPage('home')}>
          <span style={{ color: '#0057FF' }}>Paga</span>
          <span style={{ color: '#0D0D0D' }}>Print</span>
        </div>

        {/* Links */}
        <div style={styles.links}>
          <span style={styles.link} onClick={() => setPage('home')}>Products</span>
          <span style={styles.link} onClick={() => setPage('admin')}>Admin</span>

          {/* Cart button */}
          <button style={styles.cartBtn} onClick={() => setPage('cart')}>
            🛒 Cart
            {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setPage('home')}
            style={{ padding: '9px 20px' }}
          >
            Order now
          </button>
        </div>
      </div>
    </nav>
  );
}
