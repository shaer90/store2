// NOIR — Admin panel (embedded in store UI)

function AdminPage({ lang, user, onLogout, setPage }) {
  const [tab, setTab]           = React.useState('dashboard');
  const [stats, setStats]       = React.useState(null);
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [orders, setOrders]     = React.useState([]);
  const [promos, setPromos]     = React.useState([]);
  const [orderFilter, setOrderFilter] = React.useState('all');
  const [pSearch, setPSearch]   = React.useState('');
  const [editProduct, setEditProduct] = React.useState(null);
  const [editCat, setEditCat]   = React.useState(null);
  const [editPromo, setEditPromo] = React.useState(null);
  const [productImages, setProductImages] = React.useState([]);
  const [saving, setSaving]     = React.useState(false);
  const [toast, setToast]       = React.useState('');

  const apiCall = (method, path, body) => {
    const token = localStorage.getItem('noir.token');
    return fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.detail || 'خطأ'), { status: r.status });
      return d;
    });
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  React.useEffect(() => {
    if (tab === 'dashboard')  loadStats();
    if (tab === 'products')   { loadProducts(); loadCategories(); }
    if (tab === 'categories') loadCategories();
    if (tab === 'orders')     loadOrders();
    if (tab === 'promos')     loadPromos();
  }, [tab]);

  React.useEffect(() => { if (tab === 'orders') loadOrders(); }, [orderFilter]);

  const loadStats      = async () => { try { setStats(await apiCall('GET', '/api/admin/stats')); } catch {} };
  const loadProducts   = async () => { try { setProducts((await apiCall('GET', '/api/admin/products')).products); } catch {} };
  const loadCategories = async () => { try { setCategories((await apiCall('GET', '/api/admin/categories')).categories); } catch {} };
  const loadOrders     = async () => { try { setOrders((await apiCall('GET', `/api/admin/orders?status_filter=${orderFilter}`)).orders); } catch {} };
  const loadPromos     = async () => { try { setPromos((await apiCall('GET', '/api/admin/promos')).promos); } catch {} };

  // ── Products ──────────────────────────────────────────────────────────────
  const openNewProduct = () => {
    setEditProduct({ name_ar:'', name_en:'', cat:'', price:'', was:'', color:'', sizes:'', colors:'', tag:'', active:1, featured:0, meta_ar:'', meta_en:'' });
    setProductImages([]);
  };
  const openEditProduct = async (p) => {
    setEditProduct({ ...p, sizes: JSON.parse(p.sizes || '[]').join(','), colors: JSON.parse(p.colors || '[]').join(',') });
    try { setProductImages((await apiCall('GET', `/api/admin/products/${p.id}/images`)).images); } catch { setProductImages([]); }
  };
  const saveProduct = async () => {
    if (!editProduct) return;
    setSaving(true);
    const body = {
      name_ar: editProduct.name_ar, name_en: editProduct.name_en, cat: editProduct.cat,
      price: parseFloat(editProduct.price) || 0, was: parseFloat(editProduct.was) || null,
      color: editProduct.color,
      sizes:  (editProduct.sizes  || '').split(',').map(s => s.trim()).filter(Boolean),
      colors: (editProduct.colors || '').split(',').map(s => s.trim()).filter(Boolean),
      tag: editProduct.tag || null, active: editProduct.active, featured: editProduct.featured,
      meta_ar: editProduct.meta_ar, meta_en: editProduct.meta_en,
    };
    try {
      if (editProduct.id) {
        await apiCall('PUT', `/api/admin/products/${editProduct.id}`, body);
        showToast('✓ تم تحديث المنتج');
        setEditProduct(null);
      } else {
        const r = await apiCall('POST', '/api/admin/products', body);
        setEditProduct(p => ({ ...p, id: r.id }));
        showToast('✓ تم إضافة المنتج — أضف صور الآن');
      }
      loadProducts();
    } catch (e) { showToast('✗ ' + e.message); }
    setSaving(false);
  };
  const deleteProduct = async (id, name) => {
    if (!confirm(`حذف "${name}"?`)) return;
    try { await apiCall('DELETE', `/api/admin/products/${id}`); showToast('✓ تم الحذف'); loadProducts(); } catch (e) { showToast('✗ ' + e.message); }
  };

  // ── Images ────────────────────────────────────────────────────────────────
  const reloadImages = async (pid) => {
    try { setProductImages((await apiCall('GET', `/api/admin/products/${pid}/images`)).images); } catch {}
  };
  const uploadImage = async (file) => {
    const pid = editProduct?.id;
    if (!pid) { showToast('احفظ المنتج أولاً'); return; }
    const data = await compressImg(file);
    try { await apiCall('POST', `/api/admin/products/${pid}/images`, { data }); await reloadImages(pid); showToast('✓ تم رفع الصورة'); }
    catch (e) { showToast('✗ ' + e.message); }
  };
  const setPrimaryImg = async (iid) => {
    const pid = editProduct?.id;
    try { await apiCall('PUT', `/api/admin/images/${iid}/primary`); await reloadImages(pid); }
    catch (e) { showToast('✗ ' + e.message); }
  };
  const deleteImg = async (iid) => {
    const pid = editProduct?.id;
    try { await apiCall('DELETE', `/api/admin/images/${iid}`); await reloadImages(pid); showToast('✓ تم حذف الصورة'); }
    catch (e) { showToast('✗ ' + e.message); }
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const saveCat = async () => {
    if (!editCat) return;
    try {
      if (editCat._edit) await apiCall('PUT', `/api/admin/categories/${editCat.id}`, editCat);
      else await apiCall('POST', '/api/admin/categories', editCat);
      showToast('✓ تم الحفظ'); setEditCat(null); loadCategories();
    } catch (e) { showToast('✗ ' + e.message); }
  };
  const toggleCollection = async (cat) => {
    try {
      await apiCall('PUT', `/api/admin/categories/${cat.id}`, { ...cat, is_collection: cat.is_collection ? 0 : 1 });
      showToast(cat.is_collection ? 'تم الإزالة من التشكيلات' : '✓ تم الإضافة للتشكيلات');
      loadCategories();
    } catch (e) { showToast('✗ ' + e.message); }
  };
  const deleteCat = async (id, name) => {
    if (!confirm(`حذف "${name}"?`)) return;
    try { await apiCall('DELETE', `/api/admin/categories/${id}`); loadCategories(); } catch (e) { showToast('✗ ' + e.message); }
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    try { await apiCall('PUT', `/api/admin/orders/${id}/status`, { status }); loadOrders(); showToast('✓ تم تحديث الحالة'); }
    catch (e) { showToast('✗ ' + e.message); }
  };

  // ── Promos ────────────────────────────────────────────────────────────────
  const savePromo = async () => {
    if (!editPromo) return;
    try {
      if (editPromo._isEdit) await apiCall('PUT', `/api/admin/promos/${editPromo.code}`, { pct: parseInt(editPromo.pct), active: editPromo.active });
      else await apiCall('POST', '/api/admin/promos', { code: editPromo.code.toUpperCase(), pct: parseInt(editPromo.pct), active: 1 });
      showToast('✓ تم الحفظ'); setEditPromo(null); loadPromos();
    } catch (e) { showToast('✗ ' + e.message); }
  };
  const deletePromo = async (code) => {
    if (!confirm(`حذف كود "${code}"?`)) return;
    try { await apiCall('DELETE', `/api/admin/promos/${code}`); loadPromos(); } catch (e) { showToast('✗ ' + e.message); }
  };

  const filtered = products.filter(p =>
    !pSearch || p.name_ar.includes(pSearch) || p.name_en.toLowerCase().includes(pSearch.toLowerCase())
  );

  const TABS = [
    { id:'dashboard', ar:'الرئيسية', ico:'📊' },
    { id:'products',  ar:'المنتجات', ico:'👕' },
    { id:'categories',ar:'الأقسام',  ico:'🗂' },
    { id:'orders',    ar:'الطلبات',  ico:'📦' },
    { id:'promos',    ar:'الأكواد',  ico:'🎟' },
  ];

  const ORDER_STATUSES = [['all','الكل'],['pending','معلق'],['processing','قيد المعالجة'],['shipped','تم الشحن'],['delivered','تم التسليم'],['cancelled','ملغى']];

  return (
    <div className="container" style={{ paddingBottom: '120px', paddingTop: '0' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 0 4px' }}>
        <div>
          <div style={{ fontSize:'11px', color:'var(--ink-mute)', marginBottom:'2px' }}>مرحباً</div>
          <div style={{ fontSize:'20px', fontWeight:'700', fontFamily:'var(--font-display)' }}>لوحة الإدارة</div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:'12px', padding:'7px 16px' }}
          onClick={() => { onLogout(); setPage('home'); }}>
          خروج
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:'6px', overflowX:'auto', padding:'14px 0 16px', scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink:0, padding:'8px 16px', borderRadius:'var(--radius-pill)',
            border: '1px solid var(--line)',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? '#000' : 'var(--ink-mute)',
            fontWeight: tab === t.id ? '700' : '400',
            fontSize: '13px', cursor: 'pointer',
          }}>
            {t.ico} {t.ar}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div>
          {stats ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'20px' }}>
                {[
                  { label:'الطلبات',       val: stats.total_orders },
                  { label:'الإيرادات',     val: '₪' + stats.total_revenue.toLocaleString(), color:'#5de85d' },
                  { label:'منتجات نشطة',   val: stats.total_products },
                  { label:'طلبات معلقة',   val: stats.pending, color:'#e0c040' },
                ].map((c, i) => (
                  <div key={i} style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'18px' }}>
                    <div style={{ fontSize:'28px', fontWeight:'700', color: c.color || 'var(--ink)', lineHeight:1 }}>{c.val}</div>
                    <div style={{ fontSize:'12px', color:'var(--ink-mute)', marginTop:'6px' }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--line)', fontSize:'13px', fontWeight:'700' }}>آخر الطلبات</div>
                {stats.recent_orders.length === 0 && <div style={{ padding:'24px', textAlign:'center', color:'var(--ink-mute)', fontSize:'13px' }}>لا توجد طلبات بعد</div>}
                {stats.recent_orders.map(o => (
                  <div key={o.id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'600' }}>{o.id}</div>
                      <div style={{ fontSize:'11px', color:'var(--ink-mute)' }}>{o.email}</div>
                    </div>
                    <div style={{ textAlign:'end' }}>
                      <div style={{ fontSize:'13px' }}>₪{o.total}</div>
                      <div style={{ fontSize:'11px', color:'var(--ink-mute)' }}>{statusLbl(o.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign:'center', color:'var(--ink-mute)', padding:'40px' }}>جاري التحميل…</div>}
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {tab === 'products' && (
        <div>
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px' }}>
            <input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="بحث في المنتجات…"
              style={{ flex:1, background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius)', padding:'11px 14px', color:'var(--ink)', fontSize:'14px' }} />
            <button className="btn btn-primary" style={{ flexShrink:0 }} onClick={openNewProduct}>+ إضافة</button>
          </div>
          {filtered.map(p => (
            <div key={p.id} style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'14px', marginBottom:'10px', display:'flex', gap:'12px', alignItems:'center' }}>
              <div style={{ width:'56px', height:'56px', borderRadius:'10px', overflow:'hidden', flexShrink:0, background:'var(--bg-elev-2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {p.data
                  ? <img src={p.data} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontSize:'22px', fontWeight:'700', color:'var(--ink-mute)' }}>{p.name_ar[0]}</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'14px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name_ar}</div>
                <div style={{ fontSize:'12px', color:'var(--ink-mute)', marginTop:'2px' }}>{p.price}₪{p.was ? ' · كان ' + p.was + '₪' : ''}</div>
                <div style={{ display:'flex', gap:'5px', marginTop:'5px', flexWrap:'wrap' }}>
                  {p.tag && <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'var(--radius-pill)', background: p.tag==='sale'?'rgba(224,85,85,.15)':p.tag==='new'?'rgba(93,232,93,.12)':'rgba(200,240,58,.12)', color: p.tag==='sale'?'#e86060':p.tag==='new'?'#5de85d':'var(--accent)' }}>{tagLbl(p.tag)}</span>}
                  {p.featured ? <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'var(--radius-pill)', background:'rgba(200,240,58,.12)', color:'var(--accent)' }}>⭐ أبرز</span> : null}
                  {!p.active ? <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'var(--radius-pill)', background:'var(--bg-elev-2)', color:'var(--ink-mute)' }}>مخفي</span> : null}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', flexShrink:0 }}>
                <button onClick={() => openEditProduct(p)} style={btnStyle}>تعديل</button>
                <button onClick={() => deleteProduct(p.id, p.name_ar)} style={btnStyleGhost}>حذف</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ textAlign:'center', color:'var(--ink-mute)', padding:'40px' }}>لا توجد منتجات</div>}
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {tab === 'categories' && (
        <div>
          <button className="btn btn-primary" style={{ marginBottom:'14px' }} onClick={() => setEditCat({ name_ar:'', name_en:'', slug:'', is_collection:0 })}>+ إضافة قسم</button>
          {categories.map(c => (
            <div key={c.id} style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:'600' }}>{c.name_ar}</div>
                <div style={{ fontSize:'12px', color:'var(--ink-mute)' }}>{c.name_en} · {c.slug}</div>
              </div>
              <button onClick={() => toggleCollection(c)} style={{
                flexShrink:0, padding:'6px 14px', borderRadius:'var(--radius-pill)', fontSize:'12px', cursor:'pointer',
                border: '1px solid var(--line)',
                background: c.is_collection ? 'var(--accent)' : 'transparent',
                color: c.is_collection ? '#000' : 'var(--ink-mute)',
                fontWeight: c.is_collection ? '700' : '400',
              }}>
                {c.is_collection ? '✓ تشكيلة' : '+ تشكيلة'}
              </button>
              <button onClick={() => setEditCat({ ...c, _edit:true })} style={btnStyle}>تعديل</button>
              <button onClick={() => deleteCat(c.id, c.name_ar)} style={btnStyleGhost}>حذف</button>
            </div>
          ))}
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div>
          <div style={{ display:'flex', gap:'6px', overflowX:'auto', marginBottom:'14px', paddingBottom:'4px', scrollbarWidth:'none' }}>
            {ORDER_STATUSES.map(([v, l]) => (
              <button key={v} onClick={() => setOrderFilter(v)} style={{
                flexShrink:0, padding:'7px 14px', borderRadius:'var(--radius-pill)', fontSize:'12px', cursor:'pointer',
                border: '1px solid var(--line)',
                background: orderFilter === v ? 'var(--accent)' : 'transparent',
                color: orderFilter === v ? '#000' : 'var(--ink-mute)',
                fontWeight: orderFilter === v ? '700' : '400',
              }}>{l}</button>
            ))}
          </div>
          {orders.map(o => (
            <div key={o.id} style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'16px', marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'700' }}>{o.id}</div>
                  <div style={{ fontSize:'12px', color:'var(--ink-mute)' }}>{o.email} · {o.items.length} عناصر</div>
                </div>
                <div style={{ fontSize:'16px', fontWeight:'700' }}>₪{o.total}</div>
              </div>
              <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                style={{ width:'100%', background:'var(--bg-elev-2)', border:'1px solid var(--line)', color:'var(--ink)', borderRadius:'12px', padding:'10px 14px', fontSize:'13px' }}>
                {ORDER_STATUSES.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          {orders.length === 0 && <div style={{ textAlign:'center', color:'var(--ink-mute)', padding:'40px' }}>لا توجد طلبات</div>}
        </div>
      )}

      {/* ── PROMOS ── */}
      {tab === 'promos' && (
        <div>
          <button className="btn btn-primary" style={{ marginBottom:'14px' }} onClick={() => setEditPromo({ code:'', pct:'', active:1 })}>+ إضافة كود</button>
          {promos.map(p => (
            <div key={p.code} style={{ background:'var(--bg-elev)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px', fontWeight:'700', letterSpacing:'1px', fontFamily:'var(--font-mono)' }}>{p.code}</div>
                <div style={{ fontSize:'12px', color:'var(--ink-mute)' }}>خصم {p.pct}% · {p.active ? 'نشط' : 'متوقف'}</div>
              </div>
              <button onClick={() => setEditPromo({ ...p, _isEdit:true })} style={btnStyle}>تعديل</button>
              <button onClick={() => deletePromo(p.code)} style={btnStyleGhost}>حذف</button>
            </div>
          ))}
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {editProduct && (
        <AdminModal title={editProduct.id ? 'تعديل منتج' : 'إضافة منتج'} onClose={() => setEditProduct(null)}>
          <AField label="الاسم عربي *"><input value={editProduct.name_ar} onChange={e => setEditProduct(p => ({...p, name_ar:e.target.value}))} placeholder="معطف صوفي" /></AField>
          <AField label="الاسم إنجليزي *"><input value={editProduct.name_en} onChange={e => setEditProduct(p => ({...p, name_en:e.target.value}))} placeholder="Wool Coat" /></AField>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <AField label="السعر ₪ *"><input type="number" value={editProduct.price} onChange={e => setEditProduct(p => ({...p, price:e.target.value}))} placeholder="299" /></AField>
            <AField label="السعر القديم ₪"><input type="number" value={editProduct.was||''} onChange={e => setEditProduct(p => ({...p, was:e.target.value}))} placeholder="399" /></AField>
          </div>
          <AField label="القسم *">
            <select value={editProduct.cat} onChange={e => setEditProduct(p => ({...p, cat:e.target.value}))}>
              <option value="">اختر قسم</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </AField>
          <AField label="اللون الرئيسي"><input value={editProduct.color||''} onChange={e => setEditProduct(p => ({...p, color:e.target.value}))} placeholder="ink" /></AField>
          <AField label="المقاسات (مفصولة بفاصلة)"><input value={editProduct.sizes||''} onChange={e => setEditProduct(p => ({...p, sizes:e.target.value}))} placeholder="S,M,L,XL" /></AField>
          <AField label="الألوان (مفصولة بفاصلة)"><input value={editProduct.colors||''} onChange={e => setEditProduct(p => ({...p, colors:e.target.value}))} placeholder="ink,clay" /></AField>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <AField label="التاغ">
              <select value={editProduct.tag||''} onChange={e => setEditProduct(p => ({...p, tag:e.target.value}))}>
                <option value="">بدون</option><option value="new">وصل حديثاً</option><option value="sale">تخفيض</option><option value="lime">مميز</option>
              </select>
            </AField>
            <AField label="الحالة">
              <select value={editProduct.active} onChange={e => setEditProduct(p => ({...p, active:parseInt(e.target.value)}))}>
                <option value={1}>نشط</option><option value={0}>مخفي</option>
              </select>
            </AField>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:'10px', margin:'4px 0 14px', cursor:'pointer' }}>
            <input type="checkbox" checked={!!editProduct.featured} onChange={e => setEditProduct(p => ({...p, featured:e.target.checked?1:0}))}
              style={{ width:'18px', height:'18px', accentColor:'var(--accent)' }} />
            <span>⭐ الأبرز هذا الأسبوع</span>
          </label>
          <AField label="وصف عربي"><textarea value={editProduct.meta_ar||''} onChange={e => setEditProduct(p => ({...p, meta_ar:e.target.value}))} placeholder="صوف إيطالي · مقاس عادي" /></AField>
          <AField label="وصف إنجليزي"><textarea value={editProduct.meta_en||''} onChange={e => setEditProduct(p => ({...p, meta_en:e.target.value}))} placeholder="Italian wool · Regular fit" /></AField>

          {editProduct.id && (
            <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid var(--line)' }}>
              <div style={{ fontSize:'11px', color:'var(--ink-mute)', marginBottom:'10px', letterSpacing:'.5px' }}>الصور · اضغط لتعيين الرئيسية</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'8px' }}>
                {productImages.map(img => (
                  <div key={img.id} onClick={() => setPrimaryImg(img.id)} style={{
                    position:'relative', width:'72px', height:'72px', borderRadius:'10px', overflow:'hidden', cursor:'pointer', flexShrink:0,
                    border: img.is_primary ? '2px solid var(--accent)' : '2px solid var(--line)',
                  }}>
                    <img src={img.data} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {img.is_primary && <div style={{ position:'absolute', top:'3px', insetInlineStart:'3px', background:'var(--accent)', color:'#000', fontSize:'9px', fontWeight:'700', borderRadius:'4px', padding:'1px 5px' }}>رئيسية</div>}
                    <button onClick={e => { e.stopPropagation(); deleteImg(img.id); }} style={{ position:'absolute', top:'3px', insetInlineEnd:'3px', background:'rgba(0,0,0,.7)', color:'#fff', border:'none', borderRadius:'4px', fontSize:'12px', padding:'1px 5px', cursor:'pointer', lineHeight:1 }}>✕</button>
                  </div>
                ))}
                <label style={{ width:'72px', height:'72px', borderRadius:'10px', border:'2px dashed var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', color:'var(--ink-mute)', cursor:'pointer', background:'var(--bg-elev-2)', flexShrink:0 }}>
                  +
                  <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e => { for (const f of e.target.files) await uploadImage(f); e.target.value=''; }} />
                </label>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setEditProduct(null)}>إلغاء</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveProduct} disabled={saving}>{saving ? '…' : 'حفظ'}</button>
          </div>
        </AdminModal>
      )}

      {/* ── CATEGORY MODAL ── */}
      {editCat && (
        <AdminModal title={editCat._edit ? 'تعديل قسم' : 'إضافة قسم'} onClose={() => setEditCat(null)}>
          <AField label="الاسم عربي *"><input value={editCat.name_ar} onChange={e => setEditCat(c => ({...c, name_ar:e.target.value}))} placeholder="ملابس خارجية" /></AField>
          <AField label="الاسم إنجليزي *"><input value={editCat.name_en} onChange={e => setEditCat(c => ({...c, name_en:e.target.value}))} placeholder="Outerwear" /></AField>
          <AField label="Slug *"><input value={editCat.slug} onChange={e => setEditCat(c => ({...c, slug:e.target.value}))} placeholder="outer" disabled={!!editCat._edit} /></AField>
          <label style={{ display:'flex', alignItems:'center', gap:'10px', margin:'4px 0 14px', cursor:'pointer' }}>
            <input type="checkbox" checked={!!editCat.is_collection} onChange={e => setEditCat(c => ({...c, is_collection:e.target.checked?1:0}))}
              style={{ width:'18px', height:'18px', accentColor:'var(--accent)' }} />
            <span>ضمن التشكيلات المختارة</span>
          </label>
          <div style={{ display:'flex', gap:'10px', marginTop:'12px' }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setEditCat(null)}>إلغاء</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveCat}>حفظ</button>
          </div>
        </AdminModal>
      )}

      {/* ── PROMO MODAL ── */}
      {editPromo && (
        <AdminModal title={editPromo._isEdit ? 'تعديل كود' : 'إضافة كود خصم'} onClose={() => setEditPromo(null)}>
          <AField label="الكود *"><input value={editPromo.code} onChange={e => setEditPromo(p => ({...p, code:e.target.value.toUpperCase()}))} placeholder="NOIR10" disabled={!!editPromo._isEdit} /></AField>
          <AField label="نسبة الخصم % *"><input type="number" min="1" max="100" value={editPromo.pct} onChange={e => setEditPromo(p => ({...p, pct:e.target.value}))} placeholder="10" /></AField>
          <AField label="الحالة">
            <select value={editPromo.active} onChange={e => setEditPromo(p => ({...p, active:parseInt(e.target.value)}))}>
              <option value={1}>نشط</option><option value={0}>متوقف</option>
            </select>
          </AField>
          <div style={{ display:'flex', gap:'10px', marginTop:'12px' }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setEditPromo(null)}>إلغاء</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={savePromo}>حفظ</button>
          </div>
        </AdminModal>
      )}

      {toast && <div className="toast show"><span className="dot"></span>{toast}</div>}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
const btnStyle = { background:'var(--bg-elev-2)', border:'1px solid var(--line)', color:'var(--ink)', borderRadius:'10px', padding:'6px 14px', fontSize:'12px', cursor:'pointer', flexShrink:0 };
const btnStyleGhost = { background:'none', border:'1px solid var(--line)', color:'var(--ink-mute)', borderRadius:'10px', padding:'6px 14px', fontSize:'12px', cursor:'pointer', flexShrink:0 };

function AdminModal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', zIndex:1000, display:'flex', alignItems:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--bg)', borderRadius:'22px 22px 0 0', width:'100%', maxHeight:'92vh', overflowY:'auto', padding:'24px 20px 44px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'700', fontFamily:'var(--font-display)' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-elev-2)', border:'none', color:'var(--ink)', borderRadius:'50%', width:'32px', height:'32px', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AField({ label, children }) {
  return (
    <div style={{ marginBottom:'12px' }}>
      <label style={{ display:'block', fontSize:'11px', color:'var(--ink-mute)', marginBottom:'6px', letterSpacing:'.3px' }}>{label}</label>
      {React.Children.map(children, child => React.cloneElement(child, {
        style: { width:'100%', background:'var(--bg-elev-2)', border:'1px solid var(--line)', borderRadius:'12px', padding:'11px 14px', color:'var(--ink)', fontSize:'14px', ...(child.props.style||{}) }
      }))}
    </div>
  );
}

function compressImg(file, maxPx = 700) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.78));
    };
    img.src = URL.createObjectURL(file);
  });
}

function statusLbl(s) {
  return { pending:'معلق', processing:'قيد المعالجة', shipped:'تم الشحن', delivered:'تم التسليم', cancelled:'ملغى' }[s] || s;
}
function tagLbl(t) {
  return { new:'جديد', sale:'تخفيض', lime:'مميز' }[t] || t;
}

window.AdminPage = AdminPage;
