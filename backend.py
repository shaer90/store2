# NOIR — FastAPI backend with SQLite
import sqlite3, json, os, uuid
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Config ────────────────────────────────────────────────────────────
SECRET_KEY  = "noir-secret-key-change-in-prod"
ALGORITHM   = "HS256"
TOKEN_HOURS = 48
DB_PATH     = Path(__file__).parent / "noir.db"

pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer   = HTTPBearer(auto_error=False)

# ── Products (from data.js, kept in Python so we don't touch JS) ───────
PRODUCTS = [
  {"id":"p01","name":{"ar":"معطف صوفي طويل","en":"Wool Long Coat"},"cat":"outer","price":1290,"was":1490,"color":"charcoal","sizes":["S","M","L","XL"],"colors":["charcoal","clay","olive"],"tag":"new","meta":{"ar":"صوف إيطالي · مقاس عادي","en":"Italian wool · Regular fit"}},
  {"id":"p02","name":{"ar":"تيشيرت قطن أساسي","en":"Essential Cotton Tee"},"cat":"tops","price":129,"color":"ink","sizes":["XS","S","M","L","XL"],"colors":["ink","charcoal","sage"],"meta":{"ar":"قطن عضوي · 240 جم","en":"Organic cotton · 240gsm"}},
  {"id":"p03","name":{"ar":"بنطال واسع بحزام","en":"Pleated Wide Trouser"},"cat":"bottoms","price":459,"was":549,"color":"olive","sizes":["S","M","L"],"colors":["olive","ink","clay"],"tag":"sale","meta":{"ar":"كتان مخلوط · قص واسع","en":"Linen blend · Wide cut"}},
  {"id":"p04","name":{"ar":"فستان حريري","en":"Silk Slip Dress"},"cat":"dresses","price":689,"color":"rose","sizes":["XS","S","M","L"],"colors":["rose","ink","blood"],"tag":"lime","meta":{"ar":"حرير 100٪ · ميدي","en":"100% silk · Midi length"}},
  {"id":"p05","name":{"ar":"حذاء جلد كلاسيكي","en":"Derby Leather Shoe"},"cat":"shoes","price":899,"color":"blood","sizes":["39","40","41","42","43","44"],"colors":["blood","ink","charcoal"],"meta":{"ar":"جلد طبيعي مدبوغ","en":"Vegetable-tanned leather"}},
  {"id":"p06","name":{"ar":"جاكيت دنيم خام","en":"Raw Denim Jacket"},"cat":"outer","price":689,"color":"cobalt","sizes":["S","M","L","XL"],"colors":["cobalt","ink"],"tag":"new","meta":{"ar":"دنيم 14 أونصة","en":"14oz selvedge denim"}},
  {"id":"p07","name":{"ar":"سويتر كشمير","en":"Cashmere Crewneck"},"cat":"tops","price":970,"color":"cream","sizes":["S","M","L"],"colors":["cream","mist","olive"],"meta":{"ar":"كشمير منغولي","en":"Mongolian cashmere"}},
  {"id":"p08","name":{"ar":"تنورة بليسيه","en":"Pleated Midi Skirt"},"cat":"bottoms","price":379,"color":"mist","sizes":["XS","S","M","L"],"colors":["mist","ink","rose"],"meta":{"ar":"مايكروفايبر · ميدي","en":"Microfiber · Midi"}},
  {"id":"p09","name":{"ar":"حذاء رياضي تقني","en":"Tech Runner Sneaker"},"cat":"shoes","price":549,"was":649,"color":"mist","sizes":["38","39","40","41","42","43"],"colors":["mist","ink"],"tag":"sale","meta":{"ar":"نعل EVA مرن","en":"EVA cushioning"}},
  {"id":"p10","name":{"ar":"قميص أكسفورد","en":"Oxford Shirt"},"cat":"tops","price":289,"color":"mist","sizes":["S","M","L","XL"],"colors":["mist","ink","sage"],"meta":{"ar":"قطن أكسفورد","en":"Oxford weave cotton"}},
  {"id":"p11","name":{"ar":"حقيبة كتف جلدية","en":"Leather Shoulder Bag"},"cat":"bags","price":1190,"color":"clay","sizes":["One"],"colors":["clay","ink","blood"],"tag":"new","meta":{"ar":"جلد بقري كامل","en":"Full-grain leather"}},
  {"id":"p12","name":{"ar":"نظارة شمسية معدنية","en":"Metal Frame Sunglasses"},"cat":"accessories","price":459,"color":"ink","sizes":["One"],"colors":["ink","amber"],"meta":{"ar":"حماية UV400","en":"UV400 protection"}},
  {"id":"p13","name":{"ar":"ساعة أوتوماتيك","en":"Automatic Watch"},"cat":"accessories","price":2390,"color":"ink","sizes":["One"],"colors":["ink","clay"],"tag":"lime","meta":{"ar":"حركة سويسرية","en":"Swiss movement"}},
  {"id":"p14","name":{"ar":"حزام جلدي","en":"Leather Belt"},"cat":"accessories","price":219,"color":"clay","sizes":["80","85","90","95"],"colors":["clay","ink","blood"],"meta":{"ar":"إبزيم فولاذ","en":"Steel buckle"}},
  {"id":"p15","name":{"ar":"سترة ركض","en":"Track Pullover"},"cat":"tops","price":389,"color":"sage","sizes":["S","M","L","XL"],"colors":["sage","ink","charcoal"],"meta":{"ar":"بوليستر تقني","en":"Technical poly"}},
  {"id":"p16","name":{"ar":"بنطال جينز مستقيم","en":"Straight Jeans"},"cat":"bottoms","price":359,"color":"cobalt","sizes":["28","30","32","34","36"],"colors":["cobalt","ink","mist"],"meta":{"ar":"دنيم خام","en":"Raw denim"}},
  {"id":"p17","name":{"ar":"فستان قميص","en":"Shirt Dress"},"cat":"dresses","price":489,"color":"amber","sizes":["XS","S","M","L"],"colors":["amber","ink","olive"],"meta":{"ar":"تنسيليل · فضفاض","en":"Tencel · Relaxed"}},
  {"id":"p18","name":{"ar":"بوت جلدي قصير","en":"Chelsea Boot"},"cat":"shoes","price":1090,"color":"ink","sizes":["40","41","42","43","44"],"colors":["ink","blood"],"tag":"new","meta":{"ar":"جلد لامع","en":"Polished leather"}},
  {"id":"p19","name":{"ar":"وشاح صوفي","en":"Wool Scarf"},"cat":"accessories","price":249,"color":"cream","sizes":["One"],"colors":["cream","charcoal","blood"],"meta":{"ar":"صوف ميرينو","en":"Merino wool"}},
  {"id":"p20","name":{"ar":"قميص حريري","en":"Silk Blouse"},"cat":"tops","price":590,"was":690,"color":"rose","sizes":["XS","S","M","L"],"colors":["rose","ink","sage"],"tag":"sale","meta":{"ar":"حرير شارميوز","en":"Charmeuse silk"}},
  {"id":"p21","name":{"ar":"حقيبة ظهر تقنية","en":"Tech Backpack"},"cat":"bags","price":689,"color":"charcoal","sizes":["One"],"colors":["charcoal","ink","olive"],"meta":{"ar":"مقاومة للماء","en":"Water-resistant"}},
  {"id":"p22","name":{"ar":"فستان ميدي مطبوع","en":"Printed Midi Dress"},"cat":"dresses","price":729,"color":"blood","sizes":["XS","S","M","L"],"colors":["blood","ink","olive"],"tag":"lime","meta":{"ar":"فيسكوز ناعم","en":"Soft viscose"}},
]

PROMO_CODES = {
    "NOIR10": 10,
    "NOIR20": 20,
    "WELCOME": 15,
}

# ── Database ───────────────────────────────────────────────────────────
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
            id        TEXT PRIMARY KEY,
            email     TEXT UNIQUE NOT NULL,
            password  TEXT NOT NULL,
            name      TEXT NOT NULL DEFAULT '',
            created   TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cart (
            key       TEXT PRIMARY KEY,
            user_id   TEXT NOT NULL,
            product_id TEXT NOT NULL,
            size      TEXT,
            color     TEXT,
            qty       INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS wishlist (
            user_id    TEXT NOT NULL,
            product_id TEXT NOT NULL,
            PRIMARY KEY(user_id, product_id)
        );
        CREATE TABLE IF NOT EXISTS orders (
            id        TEXT PRIMARY KEY,
            user_id   TEXT NOT NULL,
            items     TEXT NOT NULL,
            total     REAL NOT NULL,
            status    TEXT NOT NULL DEFAULT 'pending',
            address   TEXT NOT NULL,
            created   TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()

# ── Auth helpers ───────────────────────────────────────────────────────
def create_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: sqlite3.Connection = Depends(get_db)
):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(row)

def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: sqlite3.Connection = Depends(get_db)
):
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None
    except JWTError:
        return None

# ── Pydantic models ────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginBody(BaseModel):
    email: str
    password: str

class CartAddBody(BaseModel):
    product_id: str
    size: Optional[str] = None
    color: Optional[str] = None
    qty: int = 1

class CartQtyBody(BaseModel):
    qty: int

class OrderBody(BaseModel):
    items: list
    total: float
    address: dict
    shipping: str = "std"

class PromoBody(BaseModel):
    code: str
    subtotal: float

# ── App ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="NOIR API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Products ───────────────────────────────────────────────────────────
@app.get("/api/products")
def list_products(
    cat: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    tag: Optional[str] = None,
):
    results = PRODUCTS[:]
    if cat and cat != "all":
        results = [p for p in results if p["cat"] == cat]
    if q:
        ql = q.lower()
        results = [p for p in results if ql in (
            p["name"]["ar"] + " " + p["name"]["en"] + " " +
            p["meta"]["ar"] + " " + p["meta"]["en"] + " " + p["cat"]
        ).lower()]
    if tag:
        results = [p for p in results if p.get("tag") == tag]
    if price_min is not None:
        results = [p for p in results if p["price"] >= price_min]
    if price_max is not None:
        results = [p for p in results if p["price"] <= price_max]
    if sort == "price_asc":
        results.sort(key=lambda p: p["price"])
    elif sort == "price_desc":
        results.sort(key=lambda p: p["price"], reverse=True)
    elif sort == "name":
        results.sort(key=lambda p: p["name"]["en"])
    return {"products": results, "total": len(results)}

@app.get("/api/products/{product_id}")
def get_product(product_id: str):
    p = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

# ── Auth ───────────────────────────────────────────────────────────────
@app.post("/api/auth/register", status_code=201)
def register(body: RegisterBody, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM users WHERE email=?", (body.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = str(uuid.uuid4())
    hashed  = pwd_ctx.hash(body.password)
    db.execute(
        "INSERT INTO users (id, email, password, name, created) VALUES (?,?,?,?,?)",
        (user_id, body.email, hashed, body.name, datetime.utcnow().isoformat())
    )
    db.commit()
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "email": body.email, "name": body.name}}

@app.post("/api/auth/login")
def login(body: LoginBody, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE email=?", (body.email,)).fetchone()
    if not row or not pwd_ctx.verify(body.password, row["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = dict(row)
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "created": user["created"]}

# ── Cart ───────────────────────────────────────────────────────────────
@app.get("/api/cart")
def get_cart(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM cart WHERE user_id=?", (user["id"],)).fetchall()
    return {"cart": [dict(r) for r in rows]}

@app.post("/api/cart", status_code=201)
def add_to_cart(body: CartAddBody, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    product = next((p for p in PRODUCTS if p["id"] == body.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    key = f"{body.product_id}_{body.size or 'one'}_{body.color or product['color']}"
    existing = db.execute("SELECT * FROM cart WHERE key=? AND user_id=?", (key, user["id"])).fetchone()
    if existing:
        db.execute("UPDATE cart SET qty=qty+? WHERE key=? AND user_id=?", (body.qty, key, user["id"]))
    else:
        db.execute(
            "INSERT INTO cart (key, user_id, product_id, size, color, qty) VALUES (?,?,?,?,?,?)",
            (key, user["id"], body.product_id, body.size, body.color or product["color"], body.qty)
        )
    db.commit()
    return {"key": key}

@app.put("/api/cart/{key}")
def update_cart(key: str, body: CartQtyBody, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if body.qty <= 0:
        db.execute("DELETE FROM cart WHERE key=? AND user_id=?", (key, user["id"]))
    else:
        db.execute("UPDATE cart SET qty=? WHERE key=? AND user_id=?", (body.qty, key, user["id"]))
    db.commit()
    return {"ok": True}

@app.delete("/api/cart/{key}")
def remove_from_cart(key: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM cart WHERE key=? AND user_id=?", (key, user["id"]))
    db.commit()
    return {"ok": True}

@app.delete("/api/cart")
def clear_cart(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM cart WHERE user_id=?", (user["id"],))
    db.commit()
    return {"ok": True}

# ── Wishlist ───────────────────────────────────────────────────────────
@app.get("/api/wishlist")
def get_wishlist(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT product_id FROM wishlist WHERE user_id=?", (user["id"],)).fetchall()
    return {"wishlist": [r["product_id"] for r in rows]}

@app.post("/api/wishlist/{product_id}")
def toggle_wishlist(product_id: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute(
        "SELECT 1 FROM wishlist WHERE user_id=? AND product_id=?", (user["id"], product_id)
    ).fetchone()
    if existing:
        db.execute("DELETE FROM wishlist WHERE user_id=? AND product_id=?", (user["id"], product_id))
        db.commit()
        return {"saved": False}
    else:
        db.execute("INSERT INTO wishlist (user_id, product_id) VALUES (?,?)", (user["id"], product_id))
        db.commit()
        return {"saved": True}

# ── Orders ─────────────────────────────────────────────────────────────
@app.get("/api/orders")
def get_orders(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM orders WHERE user_id=? ORDER BY created DESC", (user["id"],)
    ).fetchall()
    orders = []
    for r in rows:
        o = dict(r)
        o["items"]   = json.loads(o["items"])
        o["address"] = json.loads(o["address"])
        orders.append(o)
    return {"orders": orders}

@app.post("/api/orders", status_code=201)
def place_order(body: OrderBody, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    order_id = "NR" + datetime.utcnow().strftime("%f")[:6]
    db.execute(
        "INSERT INTO orders (id, user_id, items, total, status, address, created) VALUES (?,?,?,?,?,?,?)",
        (order_id, user["id"], json.dumps(body.items), body.total,
         "pending", json.dumps(body.address), datetime.utcnow().isoformat())
    )
    # Clear cart after order
    db.execute("DELETE FROM cart WHERE user_id=?", (user["id"],))
    db.commit()
    return {"order_id": order_id, "status": "pending"}

# ── Promo codes ────────────────────────────────────────────────────────
@app.post("/api/promo/validate")
def validate_promo(body: PromoBody):
    code = body.code.strip().upper()
    if code not in PROMO_CODES:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    pct      = PROMO_CODES[code]
    discount = round(body.subtotal * pct / 100)
    return {"code": code, "pct": pct, "discount": discount}

# ── Serve static frontend ──────────────────────────────────────────────
static_dir = Path(__file__).parent
app.mount("/icons", StaticFiles(directory=static_dir / "icons"), name="icons")

@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    file = static_dir / full_path
    if file.is_file():
        return FileResponse(file)
    return FileResponse(static_dir / "index.html")
