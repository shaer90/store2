// NOIR — main app (with Web + App modes)

const { useState: uS, useEffect: uE } = React;

function detectInitialMode() {
  const saved = localStorage.getItem('noir.mode');
  if (saved === 'web' || saved === 'app') return saved;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) return 'app';
  return window.innerWidth >= 900 ? 'web' : 'app';
}

function App() {
  const [mode, setMode] = uS(detectInitialMode);
  const [lang, setLang] = uS(() => localStorage.getItem('noir.lang') || 'ar');
  const [page, setPage] = uS('home');
  const [activeProduct, setActiveProduct] = uS(null);
  const [checkoutOpen, setCheckoutOpen] = uS(false);
  const [shopFilter, setShopFilter] = uS(null);
  const [installShown, setInstallShown] = uS(false);
  const [installDismissed, setInstallDismissed] = uS(false);
  const [authed, setAuthed] = uS(() => localStorage.getItem('noir.auth') === '1' || !!(window.NOIR_API && window.NOIR_API.hasToken()));
  const [user, setUser] = uS(null);
  const [installing, setInstalling] = uS(false);
  const [theme, setTheme] = uS(() => localStorage.getItem('noir.theme') || 'dark');
  const [deferredPrompt, setDeferredPrompt] = uS(null);
  const [isIOS, setIsIOS] = uS(false);
  const [iosHint, setIosHint] = uS(false);

  uE(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem('noir.theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'light' ? '#f6f5f0' : '#0a0a0b';
  }, [theme]);

  // Capture real PWA install prompt
  uE(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    setIsIOS(ios);
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setDeferredPrompt(null); showToast(lang === 'ar' ? 'تم تثبيت التطبيق!' : 'App installed!'); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); setInstalling(true); }
    } else if (isIOS) {
      setIosHint(true);
    } else {
      // Fallback: switch to app mode visually
      setInstalling(true);
    }
  };
  const completeInstall = () => {
    setInstalling(false);
    setMode('app');
    setPage('home');
  };

  const products = window.NOIR_PRODUCTS;
  const store = useStore(authed);
  const [toastNode, showToast] = useToast();
  const t = window.NOIR_I18N[lang];

  uE(() => {
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('noir.lang', lang);
  }, [lang]);

  uE(() => {
    document.body.classList.toggle('mode-web', mode === 'web');
    document.body.classList.toggle('mode-app', mode === 'app');
    document.body.classList.toggle('desktop-host', window.innerWidth >= 720);
    localStorage.setItem('noir.mode', mode);
  }, [mode]);

  // Splash hide
  uE(() => {
    const sp = document.getElementById('splash');
    if (sp) {
      setTimeout(() => sp.classList.add('hide'), 1100);
      setTimeout(() => sp.remove(), 1900);
    }
  }, []);

  // Install prompt — only in app mode
  uE(() => {
    if (mode !== 'app' || installDismissed) { setInstallShown(false); return; }
    const timer = setTimeout(() => setInstallShown(true), 4500);
    return () => clearTimeout(timer);
  }, [mode, installDismissed]);

  uE(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }, []);

  const openProduct = (p) => setActiveProduct(p);
  const closeProduct = () => setActiveProduct(null);
  const switchLang = (l) => { setLang(l); showToast(window.NOIR_I18N[l]['toast.lang']); };
  const handleWish = (id) => {
    const wasOn = store.wish.includes(id);
    store.toggleWish(id);
    showToast(wasOn ? t['toast.unfav'] : t['toast.fav']);
  };
  const cartCount = store.cart.reduce((s, c) => s + c.qty, 0);

  const headerNode = mode === 'web'
    ? <WebNav lang={lang} setLang={switchLang} page={page} setPage={setPage} cartCount={cartCount} wishCount={store.wish.length} onInstall={triggerInstall} setShopFilter={setShopFilter} />
    : <TopBar lang={lang} setLang={switchLang}
        onCart={() => setPage('cart')} onWish={() => setPage('wish')} onAccount={() => setPage('account')}
        cartCount={cartCount} wishCount={store.wish.length} />;

  if (activeProduct) {
    return (
      <div className="app">
        <ModeSwitch mode={mode} setMode={setMode} lang={lang} theme={theme} setTheme={setTheme} />
        {headerNode}
        <ProductDetail
          p={activeProduct} lang={lang}
          isWished={store.wish.includes(activeProduct.id)}
          onWish={handleWish}
          addToCart={store.addToCart}
          onClose={closeProduct}
          showToast={showToast} />
        {mode === 'web' && <WebFooter lang={lang} setLang={switchLang} />}
        {toastNode}
        {mode === 'app' && <BottomNav page={page} setPage={(p) => { closeProduct(); setPage(p); }} lang={lang} />}
        {mode === 'app' && <div className="device-label">NOIR · PWA · Installed</div>}
      </div>
    );
  }

  if (checkoutOpen) {
    return (
      <div className="app">
        <ModeSwitch mode={mode} setMode={setMode} lang={lang} theme={theme} setTheme={setTheme} />
        <CheckoutPage lang={lang} cart={store.cart} products={products}
          placeOrder={store.placeOrder} showToast={showToast}
          onClose={() => setCheckoutOpen(false)} setPage={setPage} />
        {toastNode}
      </div>
    );
  }

  return (
    <div className="app">
      <ModeSwitch mode={mode} setMode={setMode} lang={lang} theme={theme} setTheme={setTheme} />
      {headerNode}

      <div className={`page ${page==='home'?'active':''}`}>
        {page === 'home' && (
          <>
            <HomePage lang={lang} products={products}
              wish={store.wish} toggleWish={handleWish}
              openProduct={openProduct} setPage={setPage} setShopFilter={setShopFilter} />
            {mode === 'web' && <UspStrip lang={lang} />}
            {mode === 'web' && <Newsletter lang={lang} />}
          </>
        )}
      </div>
      <div className={`page ${page==='shop'?'active':''}`}>
        {page === 'shop' && (
          <ShopPage lang={lang} products={products}
            wish={store.wish} toggleWish={handleWish}
            openProduct={openProduct} initialFilter={shopFilter} />
        )}
      </div>
      <div className={`page ${page==='search'?'active':''}`}>
        {page === 'search' && (
          <SearchPage lang={lang} products={products}
            wish={store.wish} toggleWish={handleWish}
            openProduct={openProduct} setPage={setPage} />
        )}
      </div>
      <div className={`page ${page==='cart'?'active':''}`}>
        {page === 'cart' && (
          <CartPage lang={lang} cart={store.cart} products={products}
            setQty={store.setQty} removeFromCart={store.removeFromCart}
            setPage={setPage} openCheckout={() => setCheckoutOpen(true)} />
        )}
      </div>
      <div className={`page ${page==='wish'?'active':''}`}>
        {page === 'wish' && (
          <WishPage lang={lang} wish={store.wish} products={products}
            toggleWish={handleWish} openProduct={openProduct} setPage={setPage} />
        )}
      </div>
      <div className={`page ${page==='account'?'active':''}`}>
        {page === 'account' && (
          <AccountPage lang={lang} orders={store.orders} isAuthed={authed} user={user}
            onLogin={(u) => { localStorage.setItem('noir.auth','1'); setAuthed(true); if(u) setUser(u); }}
            onLogout={() => { localStorage.removeItem('noir.auth'); window.NOIR_API.clearToken(); setAuthed(false); setUser(null); }} />
        )}
      </div>

      {mode === 'web' && page !== 'home' && page !== 'account' && <WebFooter lang={lang} setLang={switchLang} />}
      {mode === 'web' && page === 'home' && <WebFooter lang={lang} setLang={switchLang} />}

      {installShown && !installDismissed && page !== 'cart' && mode === 'app' && (
        <div className="install show">
          <div className="icon">N</div>
          <div className="body">
            <b>{t['install.title']}</b>
            <span style={{ opacity: 0.7 }}>{t['install.sub']}</span>
          </div>
          <button className="btn" style={{ background: 'var(--accent)', color: '#000', padding: '8px 14px', fontSize: '12px' }} onClick={() => { setInstallDismissed(true); showToast(lang==='ar'?'جاري التثبيت...':'Installing...'); }}>
            {t['install.btn']}
          </button>
          <button className="x" onClick={() => setInstallDismissed(true)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {mode === 'app' && <BottomNav page={page} setPage={setPage} lang={lang} />}
      {mode === 'app' && <div className="device-label">NOIR · PWA · Installed</div>}
      {installing && <InstallOverlay lang={lang} onDone={completeInstall} />}
      {iosHint && (
        <div style={{ position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)', background:'var(--bg-elev-2)', border:'1px solid var(--line)', borderRadius:'16px', padding:'18px 20px', maxWidth:'320px', width:'calc(100% - 40px)', zIndex:9999, boxShadow:'0 8px 40px rgba(0,0,0,0.4)', textAlign:'center' }}>
          <div style={{ fontSize:'28px', marginBottom:'12px' }}>📲</div>
          <div style={{ fontWeight:700, marginBottom:'8px' }}>{lang==='ar'?'ثبّت التطبيق على iPhone':'Install on iPhone'}</div>
          <div style={{ fontSize:'13px', color:'var(--ink-mute)', lineHeight:1.6 }}>
            {lang==='ar'
              ? <>اضغط على <b>مشاركة</b> <span style={{fontSize:'16px'}}>⬆</span> ثم اختر <b>إضافة إلى الشاشة الرئيسية</b></>
              : <>Tap the <b>Share</b> button <span style={{fontSize:'16px'}}>⬆</span> then select <b>Add to Home Screen</b></>}
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop:'16px' }} onClick={() => setIosHint(false)}>
            {lang==='ar'?'فهمت':'Got it'}
          </button>
        </div>
      )}
      {toastNode}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
