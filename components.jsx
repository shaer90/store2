// NOIR — shared UI components

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// =============== Hooks ===============
function useStore(authed) {
  const api = window.NOIR_API;

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('noir.cart') || '[]'); } catch { return []; }
  });
  const [wish, setWish] = useState(() => {
    try { return JSON.parse(localStorage.getItem('noir.wish') || '[]'); } catch { return []; }
  });
  const [orders, setOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('noir.orders') || '[]'); } catch { return []; }
  });

  // Sync from server when authenticated
  useEffect(() => {
    if (!authed || !api.hasToken()) return;
    api.getCart().then(r => {
      const items = r.cart.map(c => ({ key: c.key, id: c.product_id, size: c.size, color: c.color, qty: c.qty }));
      setCart(items);
    }).catch(() => {});
    api.getWishlist().then(r => setWish(r.wishlist)).catch(() => {});
    api.getOrders().then(r => setOrders(r.orders)).catch(() => {});
  }, [authed]);

  useEffect(() => { localStorage.setItem('noir.cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('noir.wish', JSON.stringify(wish)); }, [wish]);
  useEffect(() => { localStorage.setItem('noir.orders', JSON.stringify(orders)); }, [orders]);

  const addToCart = useCallback((p, opts={}) => {
    const key = `${p.id}-${opts.size||'-'}-${opts.color||p.color}`;
    setCart((cur) => {
      const ex = cur.find(c => c.key === key);
      if (ex) return cur.map(c => c.key === key ? {...c, qty: c.qty+1} : c);
      return [...cur, { key, id: p.id, size: opts.size, color: opts.color || p.color, qty: 1 }];
    });
    if (api.hasToken()) {
      api.addToCart(p.id, opts.size || null, opts.color || p.color, 1).catch(() => {});
    }
  }, []);

  const removeFromCart = useCallback((key) => {
    setCart(c => c.filter(x => x.key !== key));
    if (api.hasToken()) api.removeCart(key).catch(() => {});
  }, []);

  const setQty = useCallback((key, q) => {
    setCart(c => q <= 0 ? c.filter(x => x.key !== key) : c.map(x => x.key === key ? {...x, qty: q} : x));
    if (api.hasToken()) api.updateCart(key, q).catch(() => {});
  }, []);

  const toggleWish = useCallback((id) => {
    setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
    if (api.hasToken()) api.toggleWishlist(id).catch(() => {});
  }, []);

  const placeOrder = useCallback((order) => {
    setOrders(o => [order, ...o]);
    setCart([]);
  }, []);

  return { cart, wish, orders, addToCart, removeFromCart, setQty, toggleWish, placeOrder };
}

function useToast() {
  const [msg, setMsg] = useState('');
  const tref = useRef();
  const show = useCallback((m) => {
    setMsg(m);
    clearTimeout(tref.current);
    tref.current = setTimeout(() => setMsg(''), 2000);
  }, []);
  const node = msg ? <div className={`toast show`}><span className="dot"></span>{msg}</div> : null;
  return [node, show];
}

// =============== ProductCard ===============
function ProductCard({ p, lang, onOpen, isWished, onWish, idx }) {
  const swatchClass = `swatch bg-${p.color}`;
  const t = window.NOIR_I18N[lang];
  return (
    <div className="card" style={{ animationDelay: `${(idx||0)*40}ms` }} onClick={() => onOpen(p)}>
      <div className="card-img">
        {p.image
          ? <img src={p.image} alt={p.name[lang]} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit' }} />
          : <><div className="blob">{p.name[lang][0]}</div><div className={swatchClass}></div></>
        }
        {p.tag === 'new' && <span className="card-tag">{t['common.new']}</span>}
        {p.tag === 'sale' && <span className="card-tag sale">{t['common.sale']}</span>}
        {p.tag === 'lime' && <span className="card-tag lime">{t['common.featured']}</span>}
        <button className={`card-fav ${isWished ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onWish(p.id); }}>
          <Icon name={isWished ? 'heartFill' : 'heart'} size={16} />
        </button>
      </div>
      <div className="card-info">
        <div className="top-row">
          <div className="title">{p.name[lang]}</div>
          <div className="price">
            {p.was && <span className="old">{p.was}</span>}
            {p.price}<span style={{color:'var(--ink-mute)', marginInlineStart:'2px'}}>{t.currency}</span>
          </div>
        </div>
        <div className="meta">{p.meta[lang]}</div>
      </div>
    </div>
  );
}

// =============== Top bar ===============
function TopBar({ lang, setLang, onCart, onWish, onAccount, cartCount, wishCount, onInstall, setPage, setShopFilter, theme, setTheme, isStandalone }) {
  const t = window.NOIR_I18N[lang];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const close = () => setMenuOpen(false);

  // PWA installed → simple bar, no drawer
  if (isStandalone) return (
    <div className="topbar">
      <span className="logo"><span className="dot"></span>NOIR</span>
      <div className="spacer"></div>
      <div className="langtoggle">
        <button className={lang==='ar'?'active':''} onClick={() => setLang('ar')}>ع</button>
        <button className={lang==='en'?'active':''} onClick={() => setLang('en')}>EN</button>
      </div>
      <button className="iconbtn" onClick={onWish} aria-label="wishlist">
        <Icon name="heart" />{wishCount > 0 && <span className="badge">{wishCount}</span>}
      </button>
      <button className="iconbtn" onClick={onCart} aria-label="bag">
        <Icon name="bag" />{cartCount > 0 && <span className="badge">{cartCount}</span>}
      </button>
    </div>
  );

  const navLinks = [
    { ar: 'الرئيسية',   en: 'Home',        action: () => { setPage&&setPage('home'); close(); } },
    { ar: 'نسائي',      en: 'Women',       action: () => { setShopFilter&&setShopFilter({cat:'dresses'}); setPage&&setPage('shop'); close(); } },
    { ar: 'رجالي',      en: 'Men',         action: () => { setShopFilter&&setShopFilter({cat:'tops'});    setPage&&setPage('shop'); close(); } },
    { ar: 'أطفال',      en: 'Kids',        action: () => { setShopFilter&&setShopFilter({cat:'kids'});    setPage&&setPage('shop'); close(); } },
    { ar: 'وصل حديثاً', en: 'New In',      action: () => { setShopFilter&&setShopFilter({tag:'new'});     setPage&&setPage('shop'); close(); } },
    { ar: 'تخفيضات',   en: 'Sale',        action: () => { setShopFilter&&setShopFilter({tag:'sale'});    setPage&&setPage('shop'); close(); } },
  ];

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => setMenuOpen(true)} aria-label="menu" style={{ fontSize:'18px' }}>☰</button>
        <span className="logo" style={{ cursor:'pointer' }} onClick={() => setPage&&setPage('home')}><span className="dot"></span>NOIR</span>
        <div className="spacer"></div>
        {onInstall && (
          <button onClick={onInstall} style={{
            background:'var(--accent)', color:'#000', border:'none',
            borderRadius:'var(--radius-pill)', padding:'7px 14px',
            fontSize:'12px', fontWeight:'700', cursor:'pointer',
            display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap',
          }}>
            ↓ {lang === 'ar' ? 'حمّل التطبيق' : 'Install App'}
          </button>
        )}
      </div>

      {/* Backdrop */}
      {menuOpen && <div onClick={close} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:1000 }} />}

      {/* Side drawer */}
      <div style={{
        position:'fixed', top:0, insetInlineStart:0, height:'100%', width:'80vw', maxWidth:'320px',
        background:'var(--bg)', zIndex:1001, display:'flex', flexDirection:'column',
        transform: menuOpen ? 'translateX(0)' : (lang==='ar' ? 'translateX(110%)' : 'translateX(-110%)'),
        transition:'transform .35s cubic-bezier(0.175,0.885,0.32,1.1)',
        paddingTop:'env(safe-area-inset-top)',
      }}>
        {/* Close button */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'14px 14px 4px' }}>
          <button className="iconbtn" onClick={close}><Icon name="close" size={18} /></button>
        </div>

        {/* Action icons row (cart, wish, lang) */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 16px 20px' }}>
          <button onClick={() => { onCart&&onCart(); close(); }} style={{
            flex:1, aspectRatio:'1', background:'var(--bg-elev)', border:'none', borderRadius:'18px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:'6px', cursor:'pointer', position:'relative', color:'var(--ink)',
          }}>
            <Icon name="bag" size={26} />
            {cartCount > 0 && <span className="badge" style={{ position:'absolute', top:'10px', insetInlineEnd:'10px' }}>{cartCount}</span>}
          </button>
          <button onClick={() => { onWish&&onWish(); close(); }} style={{
            flex:1, aspectRatio:'1', background:'var(--bg-elev)', border:'none', borderRadius:'18px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:'6px', cursor:'pointer', position:'relative', color:'var(--ink)',
          }}>
            <Icon name="heart" size={26} />
            {wishCount > 0 && <span className="badge" style={{ position:'absolute', top:'10px', insetInlineEnd:'10px' }}>{wishCount}</span>}
          </button>
          <div className="langtoggle" style={{ flex:1, height:'100%', aspectRatio:'1', borderRadius:'18px', background:'var(--bg-elev)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <button className={lang==='en'?'active':''} onClick={() => setLang('en')}>EN</button>
            <button className={lang==='ar'?'active':''} onClick={() => setLang('ar')}>ع</button>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex:1, overflowY:'auto', borderTop:'1px solid var(--line)' }}>
          {navLinks.map((l, i) => (
            <button key={i} onClick={l.action} style={{
              display:'block', width:'100%', textAlign: lang==='ar' ? 'right' : 'left',
              padding:'15px 24px', background:'none', border:'none', borderBottom:'1px solid var(--line)',
              color:'var(--ink)', fontSize:'16px', fontWeight:600, cursor:'pointer',
            }}>
              {lang==='ar' ? l.ar : l.en}
            </button>
          ))}
        </div>

        {/* Bottom nav strip */}
        <div style={{ display:'flex', borderTop:'1px solid var(--line)', paddingBottom:'env(safe-area-inset-bottom)' }}>
          {[
            { icon:'home',   ar:'الرئيسية', en:'Home',    action:() => { setPage&&setPage('home'); close(); } },
            { icon:'shop',   ar:'التسوق',   en:'Shop',    action:() => { setPage&&setPage('shop'); close(); } },
            { icon:'search', ar:'البحث',    en:'Search',  action:() => { setPage&&setPage('search'); close(); } },
            { icon:'heart',  ar:'WISH',     en:'WISH',    action:() => { setPage&&setPage('wish'); close(); } },
            { icon:'user',   ar:'حسابي',    en:'Account', action:() => { onAccount&&onAccount(); close(); } },
          ].map((it, i) => (
            <button key={i} onClick={it.action} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap:'4px', padding:'12px 0', background:'none', border:'none', cursor:'pointer',
              color:'var(--ink-mute)', fontSize:'10px',
            }}>
              <Icon name={it.icon} size={20} />
              <span>{lang==='ar' ? it.ar : it.en}</span>
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        {setTheme && (
          <div style={{ padding:'10px 16px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'flex-end' }}>
            <button className="iconbtn" onClick={() => setTheme(theme==='dark'?'light':'dark')} style={{ fontSize:'16px' }}>
              {theme==='dark' ? '☀' : '☾'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// =============== Bottom Nav ===============
function BottomNav({ page, setPage, lang }) {
  const t = window.NOIR_I18N[lang];
  const items = [
    { id: 'home', icon: 'home', label: t['nav.home'] },
    { id: 'shop', icon: 'shop', label: t['nav.shop'] },
    { id: 'search', icon: 'search', label: t['nav.search'] },
    { id: 'wish', icon: 'heart', label: 'Wish' },
    { id: 'account', icon: 'user', label: t['nav.account'] },
  ];
  return (
    <div className="bottomnav">
      {items.map(it => (
        <button key={it.id} className={`item ${page===it.id?'active':''}`} onClick={() => setPage(it.id)}>
          <Icon name={it.icon} size={20} />
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

// =============== Sheet ===============
function Sheet({ open, onClose, title, children }) {
  return (
    <>
      <div className={`sheet-backdrop ${open?'open':''}`} onClick={onClose}></div>
      <div className={`sheet ${open?'open':''}`}>
        <div className="sheet-handle"></div>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  );
}

window.useStore = useStore;
window.useToast = useToast;
window.ProductCard = ProductCard;
window.TopBar = TopBar;
window.BottomNav = BottomNav;
window.Sheet = Sheet;
