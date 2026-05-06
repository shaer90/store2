// NOIR — page-level components

// =============== HOME ===============
function HomePage({ lang, products, categories, wish, toggleWish, openProduct, setPage, setShopFilter }) {
  const t = window.NOIR_I18N[lang];
  const featured = products.filter(p => p.featured).slice(0, 8);
  const [heroImgs, setHeroImgs] = React.useState([]);
  const [heroIdx, setHeroIdx] = React.useState(0);
  React.useEffect(() => {
    fetch('/api/hero').then(r => r.ok ? r.json() : null).then(d => { if (d?.images?.length) setHeroImgs(d.images); }).catch(() => {});
  }, []);
  React.useEffect(() => {
    if (heroImgs.length < 2) return;
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % heroImgs.length), 4000);
    return () => clearInterval(timer);
  }, [heroImgs.length]);
  const justLanded = products.filter(p => p.tag === 'new');
  const collectionCats = (categories || []).filter(c => c.is_collection);
  const collections = collectionCats.length > 0
    ? collectionCats.map(c => ({
        id: c.id, color: 'charcoal',
        titleAr: c.name_ar, titleEn: c.name_en,
        metaAr: products.filter(p=>p.cat===c.id).length + ' قطعة',
        metaEn: products.filter(p=>p.cat===c.id).length + ' pieces',
      }))
    : [
        { id:'outer',   titleAr:'معاطف الموسم', titleEn:'Outerwear', metaAr:'12 قطعة', metaEn:'12 pieces', color:'charcoal' },
        { id:'dresses', titleAr:'فساتين',        titleEn:'Dresses',   metaAr:'8 قطع',   metaEn:'8 pieces',  color:'rose'     },
        { id:'shoes',   titleAr:'أحذية',         titleEn:'Footwear',  metaAr:'14 قطعة', metaEn:'14 pieces', color:'clay'     },
        { id:'bags',    titleAr:'حقائب',         titleEn:'Bags',      metaAr:'6 قطع',   metaEn:'6 pieces',  color:'olive'    },
      ];

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="hero-tag">{t['hero.tag']}</span>
          <h1>
            {t['hero.title1']}<br/>
            <em>{t['hero.title2']}</em><br/>
            <span className="strike">{t['hero.title3']}</span>
          </h1>
          <div className="row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setPage('shop')}>
              {t['hero.cta']} <Icon name="arrow" size={16} />
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setPage('shop')}>
              {t['hero.cta2']}
            </button>
          </div>
          <div className="hero-meta">
            <span><b>22</b> {t['hero.meta1']}</span>
            <span>★ {t['hero.meta2']}</span>
            <span>↻ {t['hero.meta3']}</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="grain"></div>
          {heroImgs.length > 0 ? (
            <>
              {heroImgs.map((img, i) => (
                <img key={img.id} src={img.data} style={{
                  position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit',
                  opacity: i === heroIdx ? 1 : 0, transition:'opacity 0.8s ease',
                }} />
              ))}
              {heroImgs.length > 1 && (
                <div style={{ position:'absolute', bottom:'48px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'6px', zIndex:3 }}>
                  {heroImgs.map((_, i) => (
                    <button key={i} onClick={() => setHeroIdx(i)} style={{ width: i===heroIdx?'20px':'6px', height:'6px', borderRadius:'3px', background: i===heroIdx?'var(--accent)':'rgba(255,255,255,.4)', border:'none', cursor:'pointer', transition:'all .3s', padding:0 }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <><div className="hero-orb"></div><div className="placeholder">FW26 · Hero shot</div></>
          )}
          <div className="hero-marquee">
            <div className="hero-marquee-track">
              <span>NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR ·&nbsp;</span>
              <span>NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR · NOIR ·&nbsp;</span>
            </div>
          </div>
        </div>
      </section>

      <div className="divider reveal">
        <span className="label">01 — {t['home.featured']}</span>
        <span className="line"></span>
      </div>
      <div className="grid">
        {featured.map((p, i) => (
          <ProductCard key={p.id} p={p} lang={lang} idx={i}
            isWished={wish.includes(p.id)}
            onWish={toggleWish}
            onOpen={openProduct} />
        ))}
      </div>

      <div className="divider reveal">
        <span className="label">02 — {t['home.collections']}</span>
        <span className="line"></span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:'16px', padding:'0 18px 32px', maxWidth:'1280px', margin:'0 auto' }}>
        {collections.map((c, i) => (
          <div key={c.id}
            className="card"
            onClick={() => { setShopFilter({ cat: c.id }); setPage('shop'); }}>
            <div className="card-img" style={{ aspectRatio: '1' }}>
              <div className={`swatch bg-${c.color}`}></div>
              <div className="ph">{c.id}</div>
              <div style={{ position: 'absolute', bottom: '14px', insetInlineStart: '14px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', color: 'white', mixBlendMode: 'difference', zIndex: 2 }}>
                {lang === 'ar' ? c.titleAr : c.titleEn}
              </div>
              <div style={{ position: 'absolute', bottom: '16px', insetInlineEnd: '16px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'white', mixBlendMode: 'difference', letterSpacing: '0.14em', zIndex: 2 }}>
                {lang === 'ar' ? c.metaAr : c.metaEn} →
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="divider">
        <span className="label">03 — {t['home.new']}</span>
        <span className="line"></span>
      </div>
      <div className="grid">
        {justLanded.map((p, i) => (
          <ProductCard key={p.id} p={p} lang={lang} idx={i}
            isWished={wish.includes(p.id)}
            onWish={toggleWish}
            onOpen={openProduct} />
        ))}
      </div>
    </>
  );
}

// =============== SHOP ===============
function ShopPage({ lang, products, wish, toggleWish, openProduct, initialFilter }) {
  const t = window.NOIR_I18N[lang];
  const [cat, setCat] = useState(initialFilter?.cat || 'all');
  const [tagFilter, setTagFilter] = useState(initialFilter?.tag || null);
  const [q, setQ] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    if (initialFilter?.cat) { setCat(initialFilter.cat); setTagFilter(null); }
    else if (initialFilter?.tag) { setTagFilter(initialFilter.tag); setCat('all'); }
    else if (initialFilter === null) { setCat('all'); setTagFilter(null); }
  }, [initialFilter]);

  const filtered = useMemo(() => {
    let r = products;
    if (cat !== 'all') r = r.filter(p => p.cat === cat);
    if (tagFilter) r = r.filter(p => p.tag === tagFilter);
    if (q) r = r.filter(p => (p.name.ar+' '+p.name.en+' '+p.meta.ar+' '+p.meta.en).toLowerCase().includes(q.toLowerCase()));
    if (sizes.length) r = r.filter(p => p.sizes.some(s => sizes.includes(s)));
    if (colors.length) r = r.filter(p => p.colors.some(c => colors.includes(c)));
    r = r.filter(p => p.price <= maxPrice);
    if (sort === 'priceAsc') r = [...r].sort((a,b) => a.price - b.price);
    if (sort === 'priceDesc') r = [...r].sort((a,b) => b.price - a.price);
    if (sort === 'new') r = [...r].sort((a,b) => (b.tag==='new'?1:0) - (a.tag==='new'?1:0));
    return r;
  }, [products, cat, tagFilter, q, sizes, colors, maxPrice, sort]);

  const allSizes = [...new Set(products.flatMap(p => p.sizes))].filter(s => s !== 'One');
  const allColors = [...new Set(products.flatMap(p => p.colors))];
  const filterCount = sizes.length + colors.length + (maxPrice < 2500 ? 1 : 0);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t['shop.search']} />
        </div>
        <button className="filter-btn" onClick={() => setFilterOpen(true)}>
          <Icon name="filter" size={16} />
          <span>{t['shop.filter']}</span>
          {filterCount > 0 && <span className="num">{filterCount}</span>}
        </button>
        <button className="filter-btn" onClick={() => setSortOpen(true)}>
          <Icon name="sort" size={16} />
        </button>
      </div>

      <div className="chips">
        {window.NOIR_CATEGORIES.map(c => {
          const count = c.id === 'all' ? products.length : products.filter(p => p.cat === c.id).length;
          return (
            <button key={c.id} className={`chip ${cat===c.id?'active':''}`} onClick={() => setCat(c.id)}>
              {c[lang]} <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 18px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', maxWidth: '1280px', margin: '0 auto' }}>
        {filtered.length} {t['shop.results']}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="glyph">∅</div>
          <h3>{t['shop.empty']}</h3>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} p={p} lang={lang} idx={i}
              isWished={wish.includes(p.id)}
              onWish={toggleWish}
              onOpen={openProduct} />
          ))}
        </div>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t['shop.filter']}>
        <div className="filter-group">
          <h4>{t['filter.size']}</h4>
          <div className="size-list">
            {allSizes.map(s => (
              <button key={s} className={`size-pill ${sizes.includes(s)?'on':''}`}
                onClick={() => setSizes(x => x.includes(s) ? x.filter(y=>y!==s) : [...x, s])}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <h4>{t['filter.color']}</h4>
          <div className="color-list">
            {allColors.map(c => (
              <button key={c} className={`color-dot bg-${c} ${colors.includes(c)?'on':''}`}
                onClick={() => setColors(x => x.includes(c) ? x.filter(y=>y!==c) : [...x, c])}>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <h4>{t['filter.price']} — {maxPrice}{t.currency}</h4>
          <input type="range" className="range" min="100" max="2500" step="50"
            value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: '24px' }}>
          <button className="btn btn-ghost btn-block" onClick={() => { setSizes([]); setColors([]); setMaxPrice(2500); }}>
            {t['filter.clear']}
          </button>
          <button className="btn btn-primary btn-block" onClick={() => setFilterOpen(false)}>
            {t['filter.apply']}
          </button>
        </div>
      </Sheet>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t['shop.sort']}>
        {[
          { id: 'featured', ar: 'مميّز', en: 'Featured' },
          { id: 'new', ar: 'الأحدث', en: 'Newest' },
          { id: 'priceAsc', ar: 'السعر: من الأقل', en: 'Price: low to high' },
          { id: 'priceDesc', ar: 'السعر: من الأعلى', en: 'Price: high to low' },
        ].map(s => (
          <button key={s.id} className="list-row" style={{ width: '100%', textAlign: 'start' }}
            onClick={() => { setSort(s.id); setSortOpen(false); }}>
            <span>{s[lang]}</span>
            <span className="right">{sort === s.id && <Icon name="check" size={16} />}</span>
          </button>
        ))}
      </Sheet>
    </>
  );
}

// =============== PRODUCT DETAIL ===============
function ProductDetail({ p, lang, isWished, onWish, addToCart, onClose, showToast }) {
  const t = window.NOIR_I18N[lang];
  const [size, setSize] = useState(p.sizes[Math.floor(p.sizes.length/2)]);
  const [color, setColor] = useState(p.colors[0]);
  const [tab, setTab] = useState('desc');

  return (
    <div>
      <div className="topbar" style={{ position: 'sticky', top: 0 }}>
        <button className="iconbtn" onClick={onClose}><Icon name={lang==='ar'?'arrow':'arrowL'} /></button>
        <span className="logo" style={{ fontSize: '16px' }}>NOIR</span>
        <div className="spacer"></div>
        <button className={`iconbtn`} onClick={() => onWish(p.id)}>
          <Icon name={isWished ? 'heartFill' : 'heart'} />
        </button>
      </div>

      <div className="pd">
        <div>
          <div className="pd-gallery">
            <div className={`swatch bg-${color}`}></div>
            <div className="ph-label">{p.id} · view 01</div>
          </div>
          <div className="pd-thumbs">
            {[0,1,2,3].map(i => (
              <div key={i} className={`pd-thumb ${i===0?'on':''} bg-${color}`} style={{ opacity: 0.4 + i*0.15 }}></div>
            ))}
          </div>
        </div>

        <div className="pd-info">
          <div className="breadcrumbs">{p.cat} / {p.id}</div>
          <h1>{p.name[lang]}</h1>
          <div style={{ color: 'var(--ink-mute)', fontSize: '14px' }}>{p.meta[lang]}</div>
          <div className="price-row">
            <span>{p.price}{t.currency}</span>
            {p.was && <span className="old">{p.was}{t.currency}</span>}
            {p.was && <span className="save">-{Math.round((1-p.price/p.was)*100)}%</span>}
          </div>

          <div className="option-group">
            <div className="option-label">
              <span>{t['pd.color']} — {color}</span>
            </div>
            <div className="color-list">
              {p.colors.map(c => (
                <button key={c} className={`color-dot bg-${c} ${c===color?'on':''}`} onClick={() => setColor(c)}></button>
              ))}
            </div>
          </div>

          {p.sizes[0] !== 'One' && (
            <div className="option-group">
              <div className="option-label">
                <span>{t['pd.size']}</span>
                <span style={{ color: 'var(--accent)' }}>{t['pd.guide']}</span>
              </div>
              <div className="size-list">
                {p.sizes.map(s => (
                  <button key={s} className={`size-pill ${s===size?'on':''}`} onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="cta-bar">
            <button className="btn btn-ghost" onClick={() => onWish(p.id)} style={{ flex: '0 0 auto' }}>
              <Icon name={isWished ? 'heartFill' : 'heart'} size={18} />
            </button>
            <button className="btn btn-primary btn-block" onClick={() => { addToCart(p, { size, color }); showToast(t['toast.cart']); }}>
              <Icon name="bag" size={16} />
              {t['pd.cart']} · {p.price}{t.currency}
            </button>
          </div>

          <div className="tablist">
            {[
              { id: 'desc', label: t['pd.desc'] },
              { id: 'specs', label: t['pd.specs'] },
              { id: 'ship', label: t['pd.ship'] },
            ].map(x => (
              <button key={x.id} className={`tab ${tab===x.id?'on':''}`} onClick={() => setTab(x.id)}>{x.label}</button>
            ))}
          </div>
          <div className="tab-panel">
            {tab === 'desc' && <p>{t['pd.story']}</p>}
            {tab === 'specs' && (
              <table className="spec-table">
                <tbody>
                  <tr><td>{lang==='ar'?'الفئة':'Category'}</td><td>{p.cat}</td></tr>
                  <tr><td>{lang==='ar'?'المقاسات':'Sizes'}</td><td>{p.sizes.join(' / ')}</td></tr>
                  <tr><td>{lang==='ar'?'الألوان':'Colors'}</td><td>{p.colors.join(' / ')}</td></tr>
                  <tr><td>{lang==='ar'?'المرجع':'Reference'}</td><td className="mono">{p.id.toUpperCase()}</td></tr>
                  <tr><td>{lang==='ar'?'البلد':'Origin'}</td><td>Italy / Portugal</td></tr>
                </tbody>
              </table>
            )}
            {tab === 'ship' && (
              <div>
                <div className="list-row"><span>{lang==='ar'?'شحن قياسي':'Standard shipping'}</span><span className="right">2–4 {lang==='ar'?'أيام':'days'} · {lang==='ar'?'مجاني':'Free'}</span></div>
                <div className="list-row"><span>{lang==='ar'?'شحن سريع':'Express'}</span><span className="right">24h · 39{t.currency}</span></div>
                <div className="list-row"><span>{lang==='ar'?'إرجاع':'Returns'}</span><span className="right">30 {lang==='ar'?'يوم':'days'}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.HomePage = HomePage;
window.ShopPage = ShopPage;
window.ProductDetail = ProductDetail;
