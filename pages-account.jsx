// NOIR — cart, wishlist, checkout, account, login

// =============== CART ===============
function CartPage({ lang, cart, products, setQty, removeFromCart, setPage, openCheckout }) {
  const t = window.NOIR_I18N[lang];
  const items = cart.map(c => ({ ...c, p: products.find(p => p.id === c.id) })).filter(x => x.p);
  const subtotal = items.reduce((s, i) => s + i.p.price * i.qty, 0);
  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 29;
  const tax = Math.round(subtotal * 0.17);
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="glyph">○</div>
        <h3>{t['cart.empty']}</h3>
        <p>{t['cart.empty.sub']}</p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: '20px' }} onClick={() => setPage('shop')}>
          {t['cart.empty.cta']} <Icon name="arrow" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '180px' }}>
      <h1 className="section-title" style={{ fontSize: '34px', marginBottom: '4px' }}>{t['cart.title']}</h1>
      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>
        {items.length} {lang==='ar'?'قطعة':'items'}
      </div>

      {items.map(i => (
        <div className="cart-item" key={i.key}>
          <div className="ph-img">
            <div className={`swatch bg-${i.color || i.p.color}`}></div>
          </div>
          <div className="info">
            <div className="name">{i.p.name[lang]}</div>
            <div className="meta">
              {i.size && <>{i.size} · </>}{i.color || i.p.color}
            </div>
            <div className="price">{i.p.price * i.qty}{t.currency}</div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: '10px' }}>
            <button onClick={() => removeFromCart(i.key)} style={{ color: 'var(--ink-mute)' }}>
              <Icon name="close" size={16} />
            </button>
            <div className="qty">
              <button onClick={() => setQty(i.key, i.qty - 1)}><Icon name="minus" size={14} /></button>
              <span className="n">{i.qty}</span>
              <button onClick={() => setQty(i.key, i.qty + 1)}><Icon name="plus" size={14} /></button>
            </div>
          </div>
        </div>
      ))}

      <div className="summary">
        <div className="row"><span className="k">{t['cart.subtotal']}</span><span className="v">{subtotal}{t.currency}</span></div>
        <div className="row"><span className="k">{t['cart.ship']}</span><span className="v">{shipping === 0 ? t['cart.ship.free'] : shipping + t.currency}</span></div>
        <div className="row"><span className="k">{t['cart.tax']}</span><span className="v">{tax}{t.currency}</span></div>
        <div className="row total"><span>{t['cart.total']}</span><span>{total}{t.currency}</span></div>
      </div>

      <div className="row" style={{ padding: '0 18px', gap: '10px', marginBottom: '12px' }}>
        <div className="search" style={{ flex: 1 }}>
          <Icon name="spark" size={16} />
          <input placeholder={t['cart.promo']} />
        </div>
        <button className="btn btn-ghost">{lang==='ar'?'تطبيق':'Apply'}</button>
      </div>

      <div style={{ padding: '0 18px' }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={openCheckout}>
          {t['cart.checkout']} · {total}{t.currency} <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}

// =============== WISHLIST ===============
function WishPage({ lang, wish, products, toggleWish, openProduct, setPage }) {
  const t = window.NOIR_I18N[lang];
  const items = products.filter(p => wish.includes(p.id));
  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="glyph">♡</div>
        <h3>{t['wish.empty']}</h3>
        <p>{t['wish.empty.sub']}</p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: '20px' }} onClick={() => setPage('shop')}>
          {t['cart.empty.cta']} <Icon name="arrow" size={16} />
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="container">
        <h1 className="section-title" style={{ fontSize: '34px' }}>{t['wish.title']}</h1>
        <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {items.length} {lang==='ar'?'قطعة محفوظة':'saved'}
        </div>
      </div>
      <div className="grid">
        {items.map((p, i) => (
          <ProductCard key={p.id} p={p} lang={lang} idx={i}
            isWished={true}
            onWish={toggleWish}
            onOpen={openProduct} />
        ))}
      </div>
    </div>
  );
}

// =============== CHECKOUT ===============
function CheckoutPage({ lang, cart, products, placeOrder, onClose, showToast, setPage }) {
  const t = window.NOIR_I18N[lang];
  const api = window.NOIR_API;
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', phone: '', address: '', city: '', zip: '', shipping: 'std', card: '' });
  const [promo, setPromo] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const items = cart.map(c => ({ ...c, p: products.find(p => p.id === c.id) })).filter(x => x.p);
  const subtotal = items.reduce((s, i) => s + i.p.price * i.qty, 0);
  const shipping = data.shipping === 'express' ? 39 : (subtotal > 500 ? 0 : 29);
  const tax = Math.round(subtotal * 0.17);
  const discount = promoResult ? promoResult.discount : 0;
  const total = subtotal + shipping + tax - discount;

  const next = () => setStep(s => Math.min(s+1, 3));
  const prev = () => setStep(s => Math.max(s-1, 0));

  const applyPromo = async () => {
    if (!promo) return;
    try {
      const r = await api.validatePromo(promo, subtotal);
      setPromoResult(r);
      setPromoError('');
      showToast(lang === 'ar' ? `خصم ${r.pct}٪ مطبّق!` : `${r.pct}% discount applied!`);
    } catch {
      setPromoResult(null);
      setPromoError(lang === 'ar' ? 'كود غير صحيح' : 'Invalid code');
    }
  };

  const submit = async () => {
    setSubmitting(true);
    const orderItems = items.map(i => ({ id: i.id, name: i.p.name, price: i.p.price, qty: i.qty, size: i.size, color: i.color }));
    try {
      if (api.hasToken()) {
        const r = await api.placeOrder({ items: orderItems, total, address: { ...data }, shipping: data.shipping });
        setOrderId(r.order_id);
        placeOrder({ id: r.order_id, date: new Date().toISOString(), items: orderItems, total, status: 'pending', address: { ...data } });
      } else {
        const id = 'NR' + Date.now().toString().slice(-6);
        setOrderId(id);
        placeOrder({ id, date: new Date().toISOString(), items: orderItems, total, status: 'pending', address: { ...data } });
      }
      setStep(3);
    } catch {
      showToast(lang === 'ar' ? 'حدث خطأ، حاول مجدداً' : 'Error placing order, try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <button className="iconbtn" onClick={onClose}><Icon name="close" /></button>
        <div className="spacer"></div>
        <span className="logo" style={{ fontSize: '16px' }}>{t['co.title']}</span>
        <div className="spacer"></div>
        <span style={{ width: '40px' }}></span>
      </div>

      <div className="container">
        {step < 3 && (
          <div className="steps">
            {[t['co.step1'], t['co.step2'], t['co.step3']].map((label, i) => (
              <React.Fragment key={i}>
                <div className={`step ${step===i?'on':''} ${step>i?'done':''}`}>
                  <span className="num">{step>i ? '✓' : i+1}</span>
                  <span>{label}</span>
                </div>
                {i < 2 && <div className="bar"></div>}
              </React.Fragment>
            ))}
          </div>
        )}

        {step === 0 && (
          <div className="account-card">
            <div className="field">
              <label>{t['co.name']}</label>
              <input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={lang==='ar'?'محمد علي':'Jane Doe'} />
            </div>
            <div className="field">
              <label>{t['co.phone']}</label>
              <input value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="+972 50 123 4567" />
            </div>
            <div className="field">
              <label>{t['co.address']}</label>
              <input value={data.address} onChange={e => setData({...data, address: e.target.value})} placeholder={lang==='ar'?'شارع، رقم، حي':'Street, number'} />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 2 }}>
                <label>{t['co.city']}</label>
                <input value={data.city} onChange={e => setData({...data, city: e.target.value})} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>{t['co.zip']}</label>
                <input value={data.zip} onChange={e => setData({...data, zip: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: '12px' }} onClick={next}>
              {t['co.continue']} <Icon name="arrow" size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="account-card">
            {[
              { id: 'std', icon: 'truck', titleAr: 'شحن قياسي', titleEn: 'Standard', metaAr: '2–4 أيام عمل', metaEn: '2–4 business days', price: subtotal > 500 ? 0 : 29 },
              { id: 'express', icon: 'spark', titleAr: 'شحن سريع', titleEn: 'Express', metaAr: 'خلال 24 ساعة', metaEn: 'Within 24 hours', price: 39 },
              { id: 'pickup', icon: 'box', titleAr: 'الاستلام من المتجر', titleEn: 'In-store pickup', metaAr: 'تل أبيب — الجمعة', metaEn: 'Tel Aviv — Friday', price: 0 },
            ].map(o => (
              <button key={o.id} className="list-row" style={{ width:'100%', textAlign: 'start', cursor: 'pointer', border: data.shipping===o.id?'1px solid var(--accent)':'1px solid transparent', borderRadius: '12px', padding: '14px', marginBottom: '8px', background: data.shipping===o.id?'var(--bg-elev-2)':'transparent' }} onClick={() => setData({...data, shipping: o.id})}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-elev-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={o.icon} size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lang==='ar'?o.titleAr:o.titleEn}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-mute)' }}>{lang==='ar'?o.metaAr:o.metaEn}</div>
                  </div>
                </div>
                <span className="right">{o.price === 0 ? t['cart.ship.free'] : o.price + t.currency}</span>
              </button>
            ))}
            <div className="row" style={{ marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={prev}><Icon name={lang==='ar'?'arrow':'arrowL'} size={16} /></button>
              <button className="btn btn-primary btn-block" onClick={next}>{t['co.continue']}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="account-card">
            <div className="field">
              <label>{lang==='ar'?'رقم البطاقة':'Card number'}</label>
              <input value={data.card} onChange={e => setData({...data, card: e.target.value})} placeholder="•••• •••• •••• 4242" />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label>{lang==='ar'?'تاريخ الانتهاء':'Expires'}</label>
                <input placeholder="04 / 28" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>CVV</label>
                <input placeholder="•••" />
              </div>
            </div>

            <div className="row" style={{ marginBottom: '12px', gap: '8px' }}>
              <div className="search" style={{ flex: 1 }}>
                <Icon name="spark" size={16} />
                <input value={promo} onChange={e => { setPromo(e.target.value); setPromoError(''); }} placeholder={t['cart.promo']} />
              </div>
              <button className="btn btn-ghost" onClick={applyPromo}>{lang==='ar'?'تطبيق':'Apply'}</button>
            </div>
            {promoError && <div style={{ fontSize: '12px', color: 'var(--accent-2)', padding: '0 4px 8px' }}>{promoError}</div>}
            {promoResult && <div style={{ fontSize: '12px', color: 'var(--accent)', padding: '0 4px 8px' }}>{lang==='ar'?`كود "${promoResult.code}" مفعّل · خصم ${promoResult.pct}٪`:`Code "${promoResult.code}" applied · ${promoResult.pct}% off`}</div>}

            <div className="summary" style={{ margin: '16px 0' }}>
              <div className="row"><span className="k">{t['cart.subtotal']}</span><span className="v">{subtotal}{t.currency}</span></div>
              <div className="row"><span className="k">{t['cart.ship']}</span><span className="v">{shipping === 0 ? t['cart.ship.free'] : shipping + t.currency}</span></div>
              <div className="row"><span className="k">{t['cart.tax']}</span><span className="v">{tax}{t.currency}</span></div>
              {discount > 0 && <div className="row" style={{ color: 'var(--accent)' }}><span className="k">{lang==='ar'?'خصم':'Discount'}</span><span className="v">-{discount}{t.currency}</span></div>}
              <div className="row total"><span>{t['cart.total']}</span><span>{total}{t.currency}</span></div>
            </div>

            <div className="row">
              <button className="btn btn-ghost" onClick={prev}><Icon name={lang==='ar'?'arrow':'arrowL'} size={16} /></button>
              <button className="btn btn-primary btn-block" onClick={submit} disabled={submitting}>
                <Icon name="shield" size={16} />
                {submitting ? (lang==='ar'?'جاري...':'Processing...') : `${t['co.pay']} · ${total}${t.currency}`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && <OrderSuccess lang={lang} onClose={() => { onClose(); setPage('account'); }} total={total} orderId={orderId} />}
      </div>
    </div>
  );
}

function OrderSuccess({ lang, onClose, total, orderId }) {
  const t = window.NOIR_I18N[lang];
  const id = orderId || ('NR' + Date.now().toString().slice(-6));
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 0 60px var(--accent-glow)', animation: 'pulse 2s ease-in-out infinite' }}>
        <Icon name="check" size={36} />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '36px', letterSpacing: '-0.03em', margin: '0 0 8px' }}>{t['co.success']}</h1>
      <p style={{ color: 'var(--ink-mute)', maxWidth: '320px', margin: '0 auto 24px' }}>{t['co.success.sub']}</p>
      <div className="account-card" style={{ maxWidth: '380px', margin: '0 auto', textAlign: 'start' }}>
        <div className="list-row"><span>{t['co.order']}</span><span className="right">{id}</span></div>
        <div className="list-row"><span>{t['cart.total']}</span><span className="right">{total}{t.currency}</span></div>
        <div className="list-row"><span>{lang==='ar'?'الحالة':'Status'}</span><span className="right" style={{ color: 'var(--accent)' }}>● {lang==='ar'?'قيد التجهيز':'Processing'}</span></div>
      </div>
      <button className="btn btn-primary btn-lg" style={{ marginTop: '24px' }} onClick={onClose}>
        {lang==='ar'?'متابعة طلباتي':'Track my order'} <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

// =============== ACCOUNT ===============
function AccountPage({ lang, orders, onLogin, onLogout, isAuthed, user }) {
  const t = window.NOIR_I18N[lang];
  if (!isAuthed) {
    return <LoginPage lang={lang} onLogin={onLogin} />;
  }
  return (
    <div className="container" style={{ paddingBottom: '120px' }}>
      <div className="account-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-elev-2)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', color: 'var(--accent)' }}>N</div>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>{t['acc.greet']}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>{user?.name || 'NOIR'}</div>
          <div style={{ fontSize: '12px', color: 'var(--ink-mute)' }}>{user?.email || ''}</div>
        </div>
        <button className="iconbtn"><Icon name="edit" size={16} /></button>
      </div>

      <div className="row" style={{ marginBottom: '16px' }}>
        {[
          { v: orders.length, kAr: 'طلبات', kEn: 'Orders' },
          { v: 4, kAr: 'مفضلة', kEn: 'Saved' },
          { v: '850', kAr: 'نقاط', kEn: 'Points' },
        ].map((s, i) => (
          <div key={i} className="account-card" style={{ flex: 1, marginBottom: 0, padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em' }}>{s.v}</div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{lang==='ar'?s.kAr:s.kEn}</div>
          </div>
        ))}
      </div>

      <div className="account-card">
        <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '4px' }}>{t['acc.orders']}</div>
        {orders.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-mute)', fontSize: '14px' }}>
            {lang==='ar'?'لا طلبات بعد':'No orders yet'}
          </div>
        ) : orders.slice(0, 5).map(o => (
          <div key={o.id} className="list-row">
            <div>
              <div style={{ fontWeight: 600 }}>#{o.id}</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-mute)' }}>{o.items.length} {lang==='ar'?'قطعة':'items'} · {new Date(o.date).toLocaleDateString()}</div>
              <div className="timeline" style={{ width: '160px', margin: '8px 0 4px' }}>
                <div className="seg done"></div>
                <div className="seg done"></div>
                <div className="seg"></div>
                <div className="seg"></div>
              </div>
            </div>
            <div className="right">
              <span style={{ color: 'var(--accent)' }}>● {lang==='ar'?'قيد التجهيز':'Shipping'}</span>
              <span style={{ marginInlineStart: '8px', fontWeight: 600 }}>{o.total}{t.currency}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="account-card">
        {[
          { icon: 'map', label: t['acc.address'] },
          { icon: 'card', label: t['acc.payment'] },
          { icon: 'bell', label: t['acc.notif'] },
          { icon: 'info', label: t['acc.help'] },
        ].map(it => (
          <div key={it.label} className="list-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon name={it.icon} size={18} />
              <span>{it.label}</span>
            </div>
            <Icon name={lang==='ar'?'chevL':'chev'} size={16} />
          </div>
        ))}
      </div>

      <button className="btn btn-ghost btn-block" style={{ marginTop: '20px', color: 'var(--accent-2)' }} onClick={onLogout}>
        {t['acc.logout']}
      </button>
    </div>
  );
}

// =============== LOGIN ===============
function LoginPage({ lang, onLogin }) {
  const t = window.NOIR_I18N[lang];
  const api = window.NOIR_API;
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email || !pass) { setError(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const r = mode === 'signin'
        ? await api.login(email, pass)
        : await api.register(email, pass, name);
      api.saveToken(r.token);
      onLogin(r.user);
    } catch (e) {
      setError(
        e.status === 409 ? (lang === 'ar' ? 'البريد مسجّل مسبقاً' : 'Email already registered')
        : e.status === 401 ? (lang === 'ar' ? 'بيانات خاطئة' : 'Wrong email or password')
        : (lang === 'ar' ? 'حدث خطأ' : 'Something went wrong')
      );
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2>{t['login.welcome']}</h2>
        <p className="sub">{t['login.sub']}</p>

        <div className="tabs-pill">
          <button className={mode==='signin'?'on':''} onClick={() => { setMode('signin'); setError(''); }}>{t['login.signin']}</button>
          <button className={mode==='signup'?'on':''} onClick={() => { setMode('signup'); setError(''); }}>{t['login.signup']}</button>
        </div>

        {mode === 'signup' && (
          <div className="field">
            <label>{lang === 'ar' ? 'الاسم' : 'Name'}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'ar' ? 'اسمك' : 'Your name'} />
          </div>
        )}
        <div className="field">
          <label>{t['login.email']}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com" />
        </div>
        <div className="field">
          <label>{t['login.pass']}</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        {error && <div style={{ fontSize: '12px', color: 'var(--accent-2)', marginBottom: '8px' }}>{error}</div>}
        <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={loading}>
          {loading ? (lang === 'ar' ? 'جاري...' : 'Loading...') : (mode==='signin' ? t['login.signin'] : t['login.signup'])}
          {!loading && <Icon name="arrow" size={16} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0', color: 'var(--ink-mute)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          <span style={{ flex: 1, height: '1px', background: 'var(--line)' }}></span>
          {t['login.or']}
          <span style={{ flex: 1, height: '1px', background: 'var(--line)' }}></span>
        </div>

        <div className="col">
          <button className="btn btn-ghost btn-block" style={{ opacity: 0.5, cursor: 'not-allowed' }}><Icon name="apple" size={18} /> {t['login.apple']}</button>
          <button className="btn btn-ghost btn-block" style={{ opacity: 0.5, cursor: 'not-allowed' }}><Icon name="google" size={18} /> {t['login.google']}</button>
        </div>
      </div>
    </div>
  );
}

// =============== SEARCH ===============
function SearchPage({ lang, products, wish, toggleWish, openProduct, setPage }) {
  const t = window.NOIR_I18N[lang];
  const [q, setQ] = useState('');
  const recent = ['silk', 'oxford', 'sneakers', 'دنيم', 'فستان'];
  const trends = ['Cashmere', 'FW26 outerwear', 'Chelsea boots', 'Silk dresses'];
  const filtered = q ? products.filter(p =>
    (p.name.ar+' '+p.name.en+' '+p.meta.ar+' '+p.meta.en+' '+p.cat).toLowerCase().includes(q.toLowerCase())
  ) : [];

  return (
    <div>
      <div className="toolbar">
        <div className="search" style={{ flex: 1 }}>
          <Icon name="search" size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t['shop.search']} />
          {q && <button onClick={() => setQ('')}><Icon name="close" size={16} /></button>}
        </div>
      </div>

      {!q && (
        <div className="container">
          <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {lang==='ar'?'بحث حديث':'Recent searches'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {recent.map(r => (
              <button key={r} className="chip" onClick={() => setQ(r)}>{r}</button>
            ))}
          </div>

          <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {lang==='ar'?'الأكثر بحثاً':'Trending'}
          </div>
          {trends.map((tr, i) => (
            <button key={tr} className="list-row" style={{ width: '100%', textAlign: 'start' }} onClick={() => setQ(tr)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="mono" style={{ color: 'var(--accent)', fontSize: '13px' }}>0{i+1}</span>
                <span>{tr}</span>
              </div>
              <Icon name="arrow" size={14} />
            </button>
          ))}
        </div>
      )}

      {q && (
        <>
          <div style={{ padding: '0 18px 8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-mute)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
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
                  isWished={wish.includes(p.id)} onWish={toggleWish} onOpen={openProduct} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

window.CartPage = CartPage;
window.WishPage = WishPage;
window.CheckoutPage = CheckoutPage;
window.AccountPage = AccountPage;
window.LoginPage = LoginPage;
window.SearchPage = SearchPage;
