# NOIR — FastAPI backend
import sqlite3, json, os, uuid
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY  = "noir-secret-key-change-in-prod"
ALGORITHM   = "HS256"
TOKEN_HOURS = 48
DB_PATH     = Path(os.environ.get("NOIR_DB_PATH", str(Path(__file__).parent / "noir.db")))
ADMIN_EMAIL = os.environ.get("NOIR_ADMIN_EMAIL", "admin@noir.com")
ADMIN_PASS  = os.environ.get("NOIR_ADMIN_PASS",  "admin2026")
ADMIN_UUID  = "00000000-noir-adm1-0000-000000000001"

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)

SEED_CATS = [
    ("outer",       "ملابس خارجية", "Outerwear",   "outer"),
    ("tops",        "قمصان",        "Tops",         "tops"),
    ("bottoms",     "بنطالات",      "Bottoms",      "bottoms"),
    ("dresses",     "فساتين",       "Dresses",      "dresses"),
    ("shoes",       "أحذية",        "Shoes",        "shoes"),
    ("bags",        "حقائب",        "Bags",         "bags"),
    ("accessories", "إكسسوارات",    "Accessories",  "accessories"),
]

SEED_PRODUCTS = [
  ("p01","معطف صوفي طويل","Wool Long Coat","outer",1290,1490,"charcoal",'["S","M","L","XL"]','["charcoal","clay","olive"]',"new","صوف إيطالي · مقاس عادي","Italian wool · Regular fit"),
  ("p02","تيشيرت قطن أساسي","Essential Cotton Tee","tops",129,None,"ink",'["XS","S","M","L","XL"]','["ink","charcoal","sage"]',None,"قطن عضوي · 240 جم","Organic cotton · 240gsm"),
  ("p03","بنطال واسع بحزام","Pleated Wide Trouser","bottoms",459,549,"olive",'["S","M","L"]','["olive","ink","clay"]',"sale","كتان مخلوط · قص واسع","Linen blend · Wide cut"),
  ("p04","فستان حريري","Silk Slip Dress","dresses",689,None,"rose",'["XS","S","M","L"]','["rose","ink","blood"]',"lime","حرير 100٪ · ميدي","100% silk · Midi length"),
  ("p05","حذاء جلد كلاسيكي","Derby Leather Shoe","shoes",899,None,"blood",'["39","40","41","42","43","44"]','["blood","ink","charcoal"]',None,"جلد طبيعي مدبوغ","Vegetable-tanned leather"),
  ("p06","جاكيت دنيم خام","Raw Denim Jacket","outer",689,None,"cobalt",'["S","M","L","XL"]','["cobalt","ink"]',"new","دنيم 14 أونصة","14oz selvedge denim"),
  ("p07","سويتر كشمير","Cashmere Crewneck","tops",970,None,"cream",'["S","M","L"]','["cream","mist","olive"]',None,"كشمير منغولي","Mongolian cashmere"),
  ("p08","تنورة بليسيه","Pleated Midi Skirt","bottoms",379,None,"mist",'["XS","S","M","L"]','["mist","ink","rose"]',None,"مايكروفايبر · ميدي","Microfiber · Midi"),
  ("p09","حذاء رياضي تقني","Tech Runner Sneaker","shoes",549,649,"mist",'["38","39","40","41","42","43"]','["mist","ink"]',"sale","نعل EVA مرن","EVA cushioning"),
  ("p10","قميص أكسفورد","Oxford Shirt","tops",289,None,"mist",'["S","M","L","XL"]','["mist","ink","sage"]',None,"قطن أكسفورد","Oxford weave cotton"),
  ("p11","حقيبة كتف جلدية","Leather Shoulder Bag","bags",1190,None,"clay",'["One"]','["clay","ink","blood"]',"new","جلد بقري كامل","Full-grain leather"),
  ("p12","نظارة شمسية معدنية","Metal Frame Sunglasses","accessories",459,None,"ink",'["One"]','["ink","amber"]',None,"حماية UV400","UV400 protection"),
  ("p13","ساعة أوتوماتيك","Automatic Watch","accessories",2390,None,"ink",'["One"]','["ink","clay"]',"lime","حركة سويسرية","Swiss movement"),
  ("p14","حزام جلدي","Leather Belt","accessories",219,None,"clay",'["80","85","90","95"]','["clay","ink","blood"]',None,"إبزيم فولاذ","Steel buckle"),
  ("p15","سترة ركض","Track Pullover","tops",389,None,"sage",'["S","M","L","XL"]','["sage","ink","charcoal"]',None,"بوليستر تقني","Technical poly"),
  ("p16","بنطال جينز مستقيم","Straight Jeans","bottoms",359,None,"cobalt",'["28","30","32","34","36"]','["cobalt","ink","mist"]',None,"دنيم خام","Raw denim"),
  ("p17","فستان قميص","Shirt Dress","dresses",489,None,"amber",'["XS","S","M","L"]','["amber","ink","olive"]',None,"تنسيليل · فضفاض","Tencel · Relaxed"),
  ("p18","بوت جلدي قصير","Chelsea Boot","shoes",1090,None,"ink",'["40","41","42","43","44"]','["ink","blood"]',"new","جلد لامع","Polished leather"),
  ("p19","وشاح صوفي","Wool Scarf","accessories",249,None,"cream",'["One"]','["cream","charcoal","blood"]',None,"صوف ميرينو","Merino wool"),
  ("p20","قميص حريري","Silk Blouse","tops",590,690,"rose",'["XS","S","M","L"]','["rose","ink","sage"]',"sale","حرير شارميوز","Charmeuse silk"),
  ("p21","حقيبة ظهر تقنية","Tech Backpack","bags",689,None,"charcoal",'["One"]','["charcoal","ink","olive"]',None,"مقاومة للماء","Water-resistant"),
  ("p22","فستان ميدي مطبوع","Printed Midi Dress","dresses",729,None,"blood",'["XS","S","M","L"]','["blood","ink","olive"]',"lime","فيسكوز ناعم","Soft viscose"),
]

SEED_PROMOS = [("NOIR10",10),("NOIR20",20),("WELCOME",15)]

# ── DB ─────────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       TEXT PRIMARY KEY,
            email    TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name     TEXT NOT NULL DEFAULT '',
            is_admin INTEGER NOT NULL DEFAULT 0,
            created  TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS categories (
            id      TEXT PRIMARY KEY,
            name_ar TEXT NOT NULL,
            name_en TEXT NOT NULL,
            slug    TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
            id      TEXT PRIMARY KEY,
            name_ar TEXT NOT NULL,
            name_en TEXT NOT NULL,
            cat     TEXT NOT NULL,
            price   REAL NOT NULL,
            was     REAL,
            color   TEXT,
            sizes   TEXT,
            colors  TEXT,
            tag     TEXT,
            meta_ar TEXT,
            meta_en TEXT,
            active  INTEGER NOT NULL DEFAULT 1,
            created TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS cart (
            key        TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            product_id TEXT NOT NULL,
            size       TEXT,
            color      TEXT,
            qty        INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS wishlist (
            user_id    TEXT NOT NULL,
            product_id TEXT NOT NULL,
            PRIMARY KEY(user_id, product_id)
        );
        CREATE TABLE IF NOT EXISTS orders (
            id      TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            items   TEXT NOT NULL,
            total   REAL NOT NULL,
            status  TEXT NOT NULL DEFAULT 'pending',
            address TEXT NOT NULL,
            notes   TEXT,
            created TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS promo_codes (
            code   TEXT PRIMARY KEY,
            pct    INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS product_images (
            id         TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            data       TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
    """)
    # Safe migrations for existing DBs
    for stmt in [
        "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN notes TEXT",
        "ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE categories ADD COLUMN is_collection INTEGER NOT NULL DEFAULT 0",
    ]:
        try: c.execute(stmt); conn.commit()
        except: pass

    if not c.execute("SELECT 1 FROM categories LIMIT 1").fetchone():
        c.executemany("INSERT OR IGNORE INTO categories (id,name_ar,name_en,slug) VALUES (?,?,?,?)", SEED_CATS)
    if not c.execute("SELECT 1 FROM products LIMIT 1").fetchone():
        c.executemany(
            "INSERT OR IGNORE INTO products (id,name_ar,name_en,cat,price,was,color,sizes,colors,tag,meta_ar,meta_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            SEED_PRODUCTS
        )
    if not c.execute("SELECT 1 FROM promo_codes LIMIT 1").fetchone():
        c.executemany("INSERT OR IGNORE INTO promo_codes (code,pct) VALUES (?,?)", SEED_PROMOS)
    c.execute(
        "INSERT OR IGNORE INTO users (id,email,password,name,is_admin,created) VALUES (?,?,?,?,1,?)",
        (ADMIN_UUID, ADMIN_EMAIL, pwd_ctx.hash(ADMIN_PASS), "Admin", datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

# ── Helpers ────────────────────────────────────────────────────────────────
def row_to_product(r):
    d = dict(r)
    return {
        "id": d["id"], "name": {"ar": d["name_ar"], "en": d["name_en"]},
        "cat": d["cat"], "price": d["price"], "was": d["was"], "color": d["color"],
        "sizes":  json.loads(d["sizes"])  if d["sizes"]  else [],
        "colors": json.loads(d["colors"]) if d["colors"] else [],
        "tag": d["tag"], "featured": bool(d.get("featured", 0)),
        "meta": {"ar": d.get("meta_ar",""), "en": d.get("meta_en","")},
        "image": d.get("image"),
    }

def create_token(uid: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": uid, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: sqlite3.Connection = Depends(get_db)
):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        uid = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(row)

def get_admin_user(user=Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: sqlite3.Connection = Depends(get_db)
):
    if not creds: return None
    try:
        uid = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM]).get("sub")
        row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        return dict(row) if row else None
    except JWTError:
        return None

# ── Pydantic models ────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    email: str; password: str; name: str = ""

class LoginBody(BaseModel):
    email: str; password: str

class CartAddBody(BaseModel):
    product_id: str; size: Optional[str]=None; color: Optional[str]=None; qty: int=1

class CartQtyBody(BaseModel):
    qty: int

class OrderBody(BaseModel):
    items: list; total: float; address: dict; shipping: str="std"

class PromoBody(BaseModel):
    code: str; subtotal: float

class ProductBody(BaseModel):
    name_ar: str; name_en: str; cat: str; price: float
    was: Optional[float]=None; color: Optional[str]=None
    sizes: Optional[List[str]]=[]; colors: Optional[List[str]]=[]
    tag: Optional[str]=None; meta_ar: Optional[str]=""; meta_en: Optional[str]=""
    active: int=1; featured: int=0

class CategoryBody(BaseModel):
    name_ar: str; name_en: str; slug: str; is_collection: int=0

class OrderStatusBody(BaseModel):
    status: str; notes: Optional[str]=None

class PromoCreateBody(BaseModel):
    code: str; pct: int; active: int=1

class PromoUpdateBody(BaseModel):
    pct: int; active: int=1

# ── App ────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(); yield

app = FastAPI(title="NOIR API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Products (public) ──────────────────────────────────────────────────────
@app.get("/api/products")
def list_products(
    cat: Optional[str]=None, q: Optional[str]=None, sort: Optional[str]=None,
    price_min: Optional[float]=None, price_max: Optional[float]=None,
    tag: Optional[str]=None, db: sqlite3.Connection=Depends(get_db),
):
    where, params = ["p.active=1"], []
    if cat and cat != "all": where.append("p.cat=?"); params.append(cat)
    if tag: where.append("p.tag=?"); params.append(tag)
    if price_min is not None: where.append("p.price>=?"); params.append(price_min)
    if price_max is not None: where.append("p.price<=?"); params.append(price_max)
    order_map = {"price_asc":" ORDER BY p.price ASC","price_desc":" ORDER BY p.price DESC","name":" ORDER BY p.name_en ASC"}
    rows = db.execute(
        f"SELECT p.*, pi.data as image FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1 WHERE {' AND '.join(where)}{order_map.get(sort,'')}",
        params
    ).fetchall()
    results = [row_to_product(r) for r in rows]
    if q:
        ql = q.lower()
        results = [p for p in results if ql in (p["name"]["ar"]+" "+p["name"]["en"]+" "+p["cat"]+" "+p["meta"]["ar"]+" "+p["meta"]["en"]).lower()]
    return {"products": results, "total": len(results)}

@app.get("/api/products/{pid}")
def get_product(pid: str, db: sqlite3.Connection=Depends(get_db)):
    row = db.execute(
        "SELECT p.*, pi.data as image FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id AND pi.is_primary=1 WHERE p.id=? AND p.active=1",
        (pid,)
    ).fetchone()
    if not row: raise HTTPException(404, "Product not found")
    p = row_to_product(row)
    imgs = db.execute("SELECT id,is_primary,sort_order FROM product_images WHERE product_id=? ORDER BY sort_order,id", (pid,)).fetchall()
    p["images"] = [{"id":r["id"],"is_primary":bool(r["is_primary"])} for r in imgs]
    return p

@app.get("/api/categories")
def list_categories(db: sqlite3.Connection=Depends(get_db)):
    rows = db.execute("SELECT * FROM categories ORDER BY id").fetchall()
    return {"categories": [dict(r) for r in rows]}

# ── Auth ───────────────────────────────────────────────────────────────────
@app.post("/api/auth/register", status_code=201)
def register(body: RegisterBody, db: sqlite3.Connection=Depends(get_db)):
    if db.execute("SELECT id FROM users WHERE email=?", (body.email,)).fetchone():
        raise HTTPException(409, "Email already registered")
    uid = str(uuid.uuid4())
    db.execute("INSERT INTO users (id,email,password,name,created) VALUES (?,?,?,?,?)",
               (uid, body.email, pwd_ctx.hash(body.password), body.name, datetime.utcnow().isoformat()))
    db.commit()
    return {"token": create_token(uid), "user": {"id":uid,"email":body.email,"name":body.name,"is_admin":False}}

@app.post("/api/auth/login")
def login(body: LoginBody, db: sqlite3.Connection=Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE email=?", (body.email,)).fetchone()
    if not row or not pwd_ctx.verify(body.password, row["password"]):
        raise HTTPException(401, "Invalid credentials")
    u = dict(row)
    return {"token": create_token(u["id"]), "user": {"id":u["id"],"email":u["email"],"name":u["name"],"is_admin":bool(u["is_admin"])}}

@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    return {"id":user["id"],"email":user["email"],"name":user["name"],"is_admin":bool(user["is_admin"]),"created":user["created"]}

# ── Cart ───────────────────────────────────────────────────────────────────
@app.get("/api/cart")
def get_cart(user=Depends(get_current_user), db=Depends(get_db)):
    return {"cart": [dict(r) for r in db.execute("SELECT * FROM cart WHERE user_id=?", (user["id"],)).fetchall()]}

@app.post("/api/cart", status_code=201)
def add_to_cart(body: CartAddBody, user=Depends(get_current_user), db=Depends(get_db)):
    row = db.execute("SELECT color FROM products WHERE id=? AND active=1", (body.product_id,)).fetchone()
    if not row: raise HTTPException(404, "Product not found")
    key = f"{body.product_id}_{body.size or 'one'}_{body.color or row['color']}"
    if db.execute("SELECT 1 FROM cart WHERE key=? AND user_id=?", (key, user["id"])).fetchone():
        db.execute("UPDATE cart SET qty=qty+? WHERE key=? AND user_id=?", (body.qty, key, user["id"]))
    else:
        db.execute("INSERT INTO cart (key,user_id,product_id,size,color,qty) VALUES (?,?,?,?,?,?)",
                   (key, user["id"], body.product_id, body.size, body.color or row["color"], body.qty))
    db.commit(); return {"key": key}

@app.put("/api/cart/{key}")
def update_cart(key: str, body: CartQtyBody, user=Depends(get_current_user), db=Depends(get_db)):
    if body.qty <= 0: db.execute("DELETE FROM cart WHERE key=? AND user_id=?", (key, user["id"]))
    else: db.execute("UPDATE cart SET qty=? WHERE key=? AND user_id=?", (body.qty, key, user["id"]))
    db.commit(); return {"ok": True}

@app.delete("/api/cart/{key}")
def remove_from_cart(key: str, user=Depends(get_current_user), db=Depends(get_db)):
    db.execute("DELETE FROM cart WHERE key=? AND user_id=?", (key, user["id"])); db.commit(); return {"ok":True}

@app.delete("/api/cart")
def clear_cart(user=Depends(get_current_user), db=Depends(get_db)):
    db.execute("DELETE FROM cart WHERE user_id=?", (user["id"],)); db.commit(); return {"ok":True}

# ── Wishlist ───────────────────────────────────────────────────────────────
@app.get("/api/wishlist")
def get_wishlist(user=Depends(get_current_user), db=Depends(get_db)):
    return {"wishlist": [r["product_id"] for r in db.execute("SELECT product_id FROM wishlist WHERE user_id=?", (user["id"],)).fetchall()]}

@app.post("/api/wishlist/{pid}")
def toggle_wishlist(pid: str, user=Depends(get_current_user), db=Depends(get_db)):
    if db.execute("SELECT 1 FROM wishlist WHERE user_id=? AND product_id=?", (user["id"],pid)).fetchone():
        db.execute("DELETE FROM wishlist WHERE user_id=? AND product_id=?", (user["id"],pid)); db.commit(); return {"saved":False}
    db.execute("INSERT INTO wishlist (user_id,product_id) VALUES (?,?)", (user["id"],pid)); db.commit(); return {"saved":True}

# ── Orders ─────────────────────────────────────────────────────────────────
@app.get("/api/orders")
def get_orders(user=Depends(get_current_user), db=Depends(get_db)):
    rows = db.execute("SELECT * FROM orders WHERE user_id=? ORDER BY created DESC", (user["id"],)).fetchall()
    orders = []
    for r in rows:
        o = dict(r); o["items"]=json.loads(o["items"]); o["address"]=json.loads(o["address"]); orders.append(o)
    return {"orders": orders}

@app.post("/api/orders", status_code=201)
def place_order(body: OrderBody, user=Depends(get_current_user), db=Depends(get_db)):
    oid = "NR" + datetime.utcnow().strftime("%f")[:6]
    db.execute("INSERT INTO orders (id,user_id,items,total,status,address,created) VALUES (?,?,?,?,?,?,?)",
               (oid, user["id"], json.dumps(body.items), body.total, "pending", json.dumps(body.address), datetime.utcnow().isoformat()))
    db.execute("DELETE FROM cart WHERE user_id=?", (user["id"],)); db.commit()
    return {"order_id": oid, "status": "pending"}

# ── Promo ──────────────────────────────────────────────────────────────────
@app.post("/api/promo/validate")
def validate_promo(body: PromoBody, db=Depends(get_db)):
    code = body.code.strip().upper()
    row = db.execute("SELECT pct FROM promo_codes WHERE code=? AND active=1", (code,)).fetchone()
    if not row: raise HTTPException(404, "Invalid promo code")
    discount = round(body.subtotal * row["pct"] / 100)
    return {"code": code, "pct": row["pct"], "discount": discount}

# ── Admin: Stats ───────────────────────────────────────────────────────────
@app.get("/api/admin/stats")
def admin_stats(admin=Depends(get_admin_user), db=Depends(get_db)):
    recent = db.execute(
        "SELECT o.id,o.total,o.status,o.created,u.email FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.created DESC LIMIT 8"
    ).fetchall()
    return {
        "total_orders":   db.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
        "total_revenue":  round(db.execute("SELECT COALESCE(SUM(total),0) FROM orders WHERE status!='cancelled'").fetchone()[0], 2),
        "total_products": db.execute("SELECT COUNT(*) FROM products WHERE active=1").fetchone()[0],
        "total_users":    db.execute("SELECT COUNT(*) FROM users WHERE is_admin=0").fetchone()[0],
        "pending":        db.execute("SELECT COUNT(*) FROM orders WHERE status='pending'").fetchone()[0],
        "recent_orders":  [dict(r) for r in recent],
    }

# ── Admin: Products ────────────────────────────────────────────────────────
@app.get("/api/admin/products")
def admin_list_products(admin=Depends(get_admin_user), db=Depends(get_db)):
    return {"products": [dict(r) for r in db.execute("SELECT * FROM products ORDER BY created DESC").fetchall()]}

class ImageBody(BaseModel):
    data: str  # base64 data URL

@app.post("/api/admin/products", status_code=201)
def admin_create_product(body: ProductBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    pid = "p" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
    db.execute(
        "INSERT INTO products (id,name_ar,name_en,cat,price,was,color,sizes,colors,tag,meta_ar,meta_en,active,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (pid,body.name_ar,body.name_en,body.cat,body.price,body.was,body.color,
         json.dumps(body.sizes),json.dumps(body.colors),body.tag or None,body.meta_ar,body.meta_en,body.active,body.featured)
    ); db.commit(); return {"id": pid}

@app.put("/api/admin/products/{pid}")
def admin_update_product(pid: str, body: ProductBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    if not db.execute("SELECT id FROM products WHERE id=?", (pid,)).fetchone(): raise HTTPException(404,"Not found")
    db.execute(
        "UPDATE products SET name_ar=?,name_en=?,cat=?,price=?,was=?,color=?,sizes=?,colors=?,tag=?,meta_ar=?,meta_en=?,active=?,featured=? WHERE id=?",
        (body.name_ar,body.name_en,body.cat,body.price,body.was,body.color,
         json.dumps(body.sizes),json.dumps(body.colors),body.tag or None,body.meta_ar,body.meta_en,body.active,body.featured,pid)
    ); db.commit(); return {"ok":True}

@app.get("/api/admin/products/{pid}/images")
def admin_get_images(pid: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    rows = db.execute("SELECT id,is_primary,sort_order,data FROM product_images WHERE product_id=? ORDER BY sort_order,id", (pid,)).fetchall()
    return {"images": [dict(r) for r in rows]}

@app.post("/api/admin/products/{pid}/images", status_code=201)
def admin_upload_image(pid: str, body: ImageBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    if not db.execute("SELECT id FROM products WHERE id=?", (pid,)).fetchone(): raise HTTPException(404,"Product not found")
    has_any = db.execute("SELECT 1 FROM product_images WHERE product_id=? LIMIT 1", (pid,)).fetchone()
    iid = str(uuid.uuid4())
    db.execute("INSERT INTO product_images (id,product_id,data,is_primary,sort_order) VALUES (?,?,?,?,?)",
               (iid, pid, body.data, 0 if has_any else 1, 0))
    db.commit()
    return {"id": iid, "is_primary": not has_any}

@app.put("/api/admin/images/{iid}/primary")
def admin_set_primary(iid: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    row = db.execute("SELECT product_id FROM product_images WHERE id=?", (iid,)).fetchone()
    if not row: raise HTTPException(404,"Image not found")
    db.execute("UPDATE product_images SET is_primary=0 WHERE product_id=?", (row["product_id"],))
    db.execute("UPDATE product_images SET is_primary=1 WHERE id=?", (iid,))
    db.commit(); return {"ok":True}

@app.delete("/api/admin/images/{iid}")
def admin_delete_image(iid: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    row = db.execute("SELECT product_id,is_primary FROM product_images WHERE id=?", (iid,)).fetchone()
    if not row: raise HTTPException(404,"Image not found")
    db.execute("DELETE FROM product_images WHERE id=?", (iid,))
    if row["is_primary"]:
        first = db.execute("SELECT id FROM product_images WHERE product_id=? LIMIT 1", (row["product_id"],)).fetchone()
        if first: db.execute("UPDATE product_images SET is_primary=1 WHERE id=?", (first["id"],))
    db.commit(); return {"ok":True}

@app.delete("/api/admin/products/{pid}")
def admin_delete_product(pid: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    db.execute("UPDATE products SET active=0 WHERE id=?", (pid,)); db.commit(); return {"ok":True}

# ── Admin: Categories ──────────────────────────────────────────────────────
@app.get("/api/admin/categories")
def admin_list_categories(admin=Depends(get_admin_user), db=Depends(get_db)):
    return {"categories": [dict(r) for r in db.execute("SELECT * FROM categories").fetchall()]}

@app.post("/api/admin/categories", status_code=201)
def admin_create_category(body: CategoryBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    if db.execute("SELECT id FROM categories WHERE slug=?", (body.slug,)).fetchone(): raise HTTPException(409,"Slug exists")
    db.execute("INSERT INTO categories (id,name_ar,name_en,slug,is_collection) VALUES (?,?,?,?,?)",
               (body.slug,body.name_ar,body.name_en,body.slug,body.is_collection))
    db.commit(); return {"id": body.slug}

@app.put("/api/admin/categories/{cid}")
def admin_update_category(cid: str, body: CategoryBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    if not db.execute("SELECT id FROM categories WHERE id=?", (cid,)).fetchone(): raise HTTPException(404,"Not found")
    db.execute("UPDATE categories SET name_ar=?,name_en=?,slug=?,is_collection=? WHERE id=?",
               (body.name_ar,body.name_en,body.slug,body.is_collection,cid))
    db.commit(); return {"ok":True}

@app.delete("/api/admin/categories/{cid}")
def admin_delete_category(cid: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    db.execute("DELETE FROM categories WHERE id=?", (cid,)); db.commit(); return {"ok":True}

# ── Admin: Orders ──────────────────────────────────────────────────────────
@app.get("/api/admin/orders")
def admin_list_orders(status_filter: Optional[str]=None, admin=Depends(get_admin_user), db=Depends(get_db)):
    where, params = [], []
    if status_filter and status_filter != "all": where.append("o.status=?"); params.append(status_filter)
    ws = ("WHERE " + " AND ".join(where)) if where else ""
    rows = db.execute(f"SELECT o.*,u.email,u.name as user_name FROM orders o JOIN users u ON o.user_id=u.id {ws} ORDER BY o.created DESC", params).fetchall()
    orders = []
    for r in rows:
        o = dict(r); o["items"]=json.loads(o["items"]); o["address"]=json.loads(o["address"]); orders.append(o)
    return {"orders": orders}

@app.put("/api/admin/orders/{oid}/status")
def admin_update_order_status(oid: str, body: OrderStatusBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    if body.status not in {"pending","processing","shipped","delivered","cancelled"}: raise HTTPException(400,"Invalid status")
    if not db.execute("SELECT id FROM orders WHERE id=?", (oid,)).fetchone(): raise HTTPException(404,"Not found")
    db.execute("UPDATE orders SET status=?,notes=? WHERE id=?", (body.status,body.notes,oid)); db.commit(); return {"ok":True}

# ── Admin: Promos ──────────────────────────────────────────────────────────
@app.get("/api/admin/promos")
def admin_list_promos(admin=Depends(get_admin_user), db=Depends(get_db)):
    return {"promos": [dict(r) for r in db.execute("SELECT * FROM promo_codes ORDER BY code").fetchall()]}

@app.post("/api/admin/promos", status_code=201)
def admin_create_promo(body: PromoCreateBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    code = body.code.strip().upper()
    if db.execute("SELECT code FROM promo_codes WHERE code=?", (code,)).fetchone(): raise HTTPException(409,"Code exists")
    db.execute("INSERT INTO promo_codes (code,pct,active) VALUES (?,?,?)", (code,body.pct,body.active)); db.commit(); return {"code":code}

@app.put("/api/admin/promos/{code}")
def admin_update_promo(code: str, body: PromoUpdateBody, admin=Depends(get_admin_user), db=Depends(get_db)):
    code = code.upper()
    if not db.execute("SELECT code FROM promo_codes WHERE code=?", (code,)).fetchone(): raise HTTPException(404,"Not found")
    db.execute("UPDATE promo_codes SET pct=?,active=? WHERE code=?", (body.pct,body.active,code)); db.commit(); return {"ok":True}

@app.delete("/api/admin/promos/{code}")
def admin_delete_promo(code: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    db.execute("DELETE FROM promo_codes WHERE code=?", (code.upper(),)); db.commit(); return {"ok":True}

# ── Admin: Users ───────────────────────────────────────────────────────────
@app.get("/api/admin/users")
def admin_list_users(admin=Depends(get_admin_user), db=Depends(get_db)):
    rows = db.execute(
        "SELECT u.id,u.email,u.name,u.is_admin,u.created,COUNT(o.id) as orders_count FROM users u LEFT JOIN orders o ON o.user_id=u.id GROUP BY u.id ORDER BY u.created DESC"
    ).fetchall()
    return {"users": [dict(r) for r in rows]}

# ── Static ─────────────────────────────────────────────────────────────────
static_dir = Path(__file__).parent
app.mount("/icons", StaticFiles(directory=static_dir/"icons"), name="icons")

@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    f = static_dir / full_path
    if f.is_file(): return FileResponse(f)
    return FileResponse(static_dir / "index.html")
