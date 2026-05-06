// NOIR — Web variant: top nav, footer, newsletter, USP strip

function WebNav({ lang, setLang, page, setPage, cartCount, wishCount, onInstall, setShopFilter, shopFilter, theme, setTheme }) {
  const t = window.NOIR_I18N[lang];
  const links = [
    { id: 'home',       ar: 'الرئيسية',   en: 'Home',        filter: null, isHome: true },
    { id: 'shop-women', ar: 'نسائي',      en: 'Women',       filter: { cat: 'dresses' } },
    { id: 'shop-men',   ar: 'رجالي',      en: 'Men',         filter: { cat: 'tops' } },
    { id: 'shop-kids',  ar: 'أطفال',      en: 'Kids',        filter: { cat: 'kids' } },
    { id: 'shop-new',   ar: 'وصل حديثاً', en: 'New',         filter: { tag: 'new' } },
    { id: 'shop-sale',  ar: 'تخفيضات',   en: 'Sale',        filter: { tag: 'sale' } },
  ];
  const isActive = (l) => {
    if (l.isHome) return page === 'home';
    if (page !== 'shop') return false;
    if (!l.filter && !shopFilter) return true;
    if (!l.filter || !shopFilter) return false;
    return l.filter.cat === shopFilter.cat && l.filter.tag === shopFilter.tag;
  };
  const goTo = (l) => {
    if (l.isHome) { setPage('home'); return; }
    if (setShopFilter) setShopFilter(l.filter || null);
    setPage('shop');
  };
  return (
    <div className="web-nav">
      <span className="logo" onClick={() => setPage('home')}>
        <span className="dot"></span>NOIR
      </span>
      <div className="links">
        {links.map(l => (
          <a key={l.id} className={isActive(l) ? 'active' : ''} onClick={() => goTo(l)}>
            {lang==='ar'?l.ar:l.en}
          </a>
        ))}
      </div>
      <div className="actions">
        <button className="install-cta" onClick={onInstall} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="download" size={14} /> {t['install.web']}
        </button>
        <button className="iconbtn" onClick={() => setTheme && setTheme(theme === 'dark' ? 'light' : 'dark')} title="Theme" style={{ fontSize: '14px' }}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <div className="web-search">
          <Icon name="search" size={14} />
          <input placeholder={lang==='ar'?'بحث':'Search...'} onClick={() => setPage('search')} readOnly />
          <kbd>⌘K</kbd>
        </div>
        <div className="langtoggle">
          <button className={lang==='ar'?'active':''} onClick={() => setLang('ar')}>ع</button>
          <button className={lang==='en'?'active':''} onClick={() => setLang('en')}>EN</button>
        </div>
        <button className="iconbtn" onClick={() => setPage('wish')}>
          <Icon name="heart" />
          {wishCount > 0 && <span className="badge">{wishCount}</span>}
        </button>
        <button className="iconbtn" onClick={() => setPage('account')}>
          <Icon name="user" />
        </button>
        <button className="iconbtn" onClick={() => setPage('cart')}>
          <Icon name="bag" />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </button>
      </div>
    </div>
  );
}

function UspStrip({ lang }) {
  const items = [
    { icon: 'truck', titleAr: 'شحن مجاني', titleEn: 'Free shipping', subAr: 'للطلبات فوق 500₪', subEn: 'On orders over 500₪' },
    { icon: 'refresh', titleAr: 'إرجاع 30 يوم', titleEn: '30-day returns', subAr: 'بدون أي أسئلة', subEn: 'No questions asked' },
    { icon: 'shield', titleAr: 'دفع آمن', titleEn: 'Secure checkout', subAr: 'تشفير بنكي', subEn: 'Bank-grade encryption' },
    { icon: 'spark', titleAr: 'هدية مع كل طلب', titleEn: 'Gift with every order', subAr: 'مفاجأة الموسم', subEn: 'Season surprise' },
  ];
  return (
    <div className="usp-strip">
      {items.map((it, i) => (
        <div key={i}>
          <div className="icon"><Icon name={it.icon} size={20} /></div>
          <div className="body">
            <b>{lang==='ar'?it.titleAr:it.titleEn}</b>
            <span>{lang==='ar'?it.subAr:it.subEn}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Newsletter({ lang }) {
  const [email, setEmail] = React.useState('');
  const [done, setDone] = React.useState(false);
  return (
    <div className="web-newsletter">
      <h2>{lang==='ar'?'كن أول من يعرف':'Be the first to know'}</h2>
      <p>{lang==='ar'?'إصدارات حصرية، أسرار التشكيلة، ودعوات خاصة — مباشرة لبريدك':'Exclusive drops, behind-the-scenes, and private invites — straight to your inbox'}</p>
      <form onSubmit={(e) => { e.preventDefault(); if(email) setDone(true); }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={lang==='ar'?'بريدك الإلكتروني':'your@email.com'} />
        <button type="submit" className="btn btn-primary">
          {done ? <><Icon name="check" size={16} /> {lang==='ar'?'تم':'Done'}</> : (lang==='ar'?'اشترك':'Subscribe')}
        </button>
      </form>
    </div>
  );
}

function WebFooter({ lang, setLang }) {
  const cols = [
    { titleAr: 'تسوق', titleEn: 'Shop', items: lang==='ar'?['الجديد','نسائي','رجالي','تشكيلات','تخفيضات']:['New arrivals','Women','Men','Collections','Sale'] },
    { titleAr: 'خدمة العملاء', titleEn: 'Help', items: lang==='ar'?['اتصل بنا','الأسئلة','دليل المقاسات','الشحن','الإرجاع']:['Contact','FAQ','Size guide','Shipping','Returns'] },
    { titleAr: 'الشركة', titleEn: 'Company', items: lang==='ar'?['عن NOIR','الاستدامة','الوظائف','الصحافة','المتاجر']:['About','Sustainability','Careers','Press','Stores'] },
    { titleAr: 'تابعنا', titleEn: 'Follow', items: ['Instagram','TikTok','Pinterest','YouTube','Spotify'] },
  ];
  return (
    <footer className="web-footer">
      <div className="grid-cols">
        <div className="brand">
          <h3><span style={{display:'inline-block',width:'10px',height:'10px',borderRadius:'50%',background:'var(--accent)',marginInlineEnd:'6px',verticalAlign:'middle'}}></span>NOIR</h3>
          <p>{lang==='ar'?'تشكيلة محدودة، صنعت يدوياً بمواد مختارة. الأناقة بصياغة جديدة، لأسلوب حياتك الحالي.':'Limited edition, handcrafted from carefully selected materials. Elegance rewritten for the way you actually live.'}</p>
        </div>
        {cols.map((c, i) => (
          <div key={i}>
            <h4>{lang==='ar'?c.titleAr:c.titleEn}</h4>
            <ul>{c.items.map(it => <li key={it}><a>{it}</a></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="meta">
        <span>© NOIR 2026 · {lang==='ar'?'كل الحقوق محفوظة':'All rights reserved'}</span>
        <span>FW26 · v1.0 · ILS ₪</span>
      </div>
    </footer>
  );
}

function ModeSwitch({ mode, setMode, lang, theme, setTheme }) {
  return (
    <div className="mode-switch">
      <button className={mode==='web'?'on':''} onClick={() => setMode('web')}>
        <span className="dot"></span> {lang==='ar'?'ويب':'Web'}
      </button>
      <button className={mode==='app'?'on':''} onClick={() => setMode('app')}>
        <span className="dot"></span> {lang==='ar'?'تطبيق':'App'}
      </button>
      <button className="theme-btn" onClick={() => setTheme(theme==='dark'?'light':'dark')} title={theme==='dark'?'Light':'Dark'} style={{padding:'6px 10px'}}>
        {theme==='dark' ? '☀' : '☾'}
      </button>
    </div>
  );
}

function InstallOverlay({ lang, onDone }) {
  const t = window.NOIR_I18N[lang];
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="install-overlay">
      <div className="icon-big">N<span className="dot"></span></div>
      <h3>{phase === 0 ? t['install.installing'] : t['install.welcome']}</h3>
      <div className="progress"></div>
      <div className="label">NOIR · PWA · v1.0</div>
    </div>
  );
}

function WebBottomNav({ page, setPage, lang, cartCount, wishCount, onInstall }) {
  const items = [
    { id: 'home',    iconName: 'home',   ar: 'الرئيسية', en: 'Home' },
    { id: 'shop',    iconName: 'grid',   ar: 'تسوق',     en: 'Shop' },
    { id: 'search',  iconName: 'search', ar: 'بحث',      en: 'Search' },
    { id: 'wish',    iconName: 'heart',  ar: 'المفضلة',  en: 'Saved', count: wishCount },
    { id: 'account', iconName: 'user',   ar: 'حسابي',    en: 'Account' },
  ];
  return (
    <div className="web-bottom-nav">
      {items.map(it => (
        <button key={it.id} className={page === it.id ? 'active' : ''} onClick={() => setPage(it.id)}>
          <div className="rel">
            <Icon name={it.iconName} size={20} />
            {it.count > 0 && <span className="badge">{it.count}</span>}
          </div>
          <span>{lang === 'ar' ? it.ar : it.en}</span>
        </button>
      ))}
      <button onClick={onInstall}>
        <Icon name="download" size={20} />
        <span>{lang === 'ar' ? 'تثبيت' : 'Install'}</span>
      </button>
    </div>
  );
}

window.InstallOverlay = InstallOverlay;
window.WebNav = WebNav;
window.WebBottomNav = WebBottomNav;
window.UspStrip = UspStrip;
window.Newsletter = Newsletter;
window.WebFooter = WebFooter;
window.ModeSwitch = ModeSwitch;
