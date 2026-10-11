"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Bell, Bike, Boxes, Check, ChevronDown, Coffee, CreditCard,
  LayoutDashboard, Loader2, LogOut, Menu, Minus, Package, Plus, Search,
  Settings2, ShoppingBag, ShoppingCart, Store, Table2, Users, X,
} from "lucide-react";
import brandLogo from "./brand-logo.png";

type User = { id: string; name: string; email: string; role: "OWNER" | "MANAGER" | "CASHIER" | "BARISTA" };
type Size = { id: string; name: string; extraPrice: number };
type Product = { id: string; code: string; name: string; sellingPrice: number; category: { name: string }; sizes: Size[] };
type CartItem = { product: Product; quantity: number; size: string };
type CafeTable = { id: string; name: string; status: string; area: { name: string } };
type OrderItem = { id: string; nameSnapshot: string; quantity: number; sizeName?: string | null; note?: string | null };
type Order = { id: string; orderNumber: string; status: string; total: number; createdAt: string; type: string; paymentMethod?: string | null; table?: { name: string } | null; user: { name: string }; items: OrderItem[] };

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " ₫";
const statusLabel: Record<string, string> = { NEW: "Mới", IN_PROGRESS: "Đang pha chế", READY: "Sẵn sàng", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy" };
const nextStatus: Record<string, string> = { NEW: "IN_PROGRESS", IN_PROGRESS: "READY", READY: "COMPLETED" };
const nextStatusLabel: Record<string, string> = { NEW: "Bắt đầu pha chế", IN_PROGRESS: "Đánh dấu sẵn sàng", READY: "Hoàn thành" };
const productColors = ["#ead8c0", "#f6c1a7", "#c9d9ae", "#b98c73", "#efb3c5", "#e9bf78"];

function ProductIcon({ product }: { product: Product }) {
  const color = productColors[product.name.length % productColors.length];
  return <div className="product-art" style={{ background: `linear-gradient(145deg, ${color}, #fff8f0)` }}><Coffee size={30} strokeWidth={1.5} /></div>;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState("Bán hàng");
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState<"TAKEAWAY" | "DINE_IN">("TAKEAWAY");
  const [tableId, setTableId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [promotionCode, setPromotionCode] = useState("");

  const loadOrders = useCallback(async () => {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (response.ok) setOrders((await response.json()).orders);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const auth = await fetch("/api/auth/me", { cache: "no-store" });
        if (!auth.ok) { router.replace("/login"); return; }
        const currentUser = (await auth.json()).user as User;
        setUser(currentUser);
        if (currentUser.role === "BARISTA") setActive("Pha chế");
        const [productResponse, tableResponse, shiftResponse, orderResponse] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/tables", { cache: "no-store" }),
          fetch("/api/shifts", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
        ]);
        if (!productResponse.ok || !tableResponse.ok || !shiftResponse.ok || !orderResponse.ok) throw new Error("Không thể tải dữ liệu cửa hàng");
        setProducts((await productResponse.json()).products);
        setTables((await tableResponse.json()).tables);
        setShiftOpen(Boolean((await shiftResponse.json()).shift));
        setOrders((await orderResponse.json()).orders);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu");
      } finally { setLoading(false); }
    }
    load();
  }, [router]);

  useEffect(() => {
    if (active !== "Pha chế") return;
    const timer = window.setInterval(loadOrders, 10_000);
    return () => window.clearInterval(timer);
  }, [active, loadOrders]);

  const categories = useMemo(() => ["Tất cả", ...new Set(products.map((product) => product.category.name))], [products]);
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchCategory = category === "Tất cả" || product.category.name === category;
    const needle = query.trim().toLocaleLowerCase("vi");
    return matchCategory && (!needle || product.name.toLocaleLowerCase("vi").includes(needle) || product.code.toLocaleLowerCase("vi").includes(needle));
  }), [category, products, query]);
  const subtotal = cart.reduce((sum, item) => {
    const size = item.product.sizes.find((entry) => entry.name === item.size);
    return sum + (item.product.sellingPrice + (size?.extraPrice ?? 0)) * item.quantity;
  }, 0);

  function addToCart(product: Product) {
    const size = product.sizes.find((entry) => entry.name === "M")?.name ?? product.sizes[0]?.name ?? "";
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id && item.size === size);
      return found
        ? current.map((item) => item === found ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
        : [...current, { product, quantity: 1, size }];
    });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  async function openShift() {
    setBusy(true); setError("");
    const response = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ openingCash: 0 }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(payload.error || "Không thể mở ca"); return; }
    setShiftOpen(true); setNotice("Đã mở ca với tiền đầu ca 0 ₫");
  }

  async function pay() {
    if (!cart.length) { setError("Vui lòng chọn ít nhất một sản phẩm"); return; }
    if (orderType === "DINE_IN" && !tableId) { setError("Vui lòng chọn bàn"); return; }
    setBusy(true); setError(""); setNotice("");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, size: item.size || undefined })),
        type: orderType,
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        paymentMethod,
        promotionCode: promotionCode.trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(payload.error || "Không thể thanh toán"); return; }
    setCart([]); setPromotionCode("");
    setNotice(`Thanh toán thành công ${payload.order.orderNumber} · ${money(payload.order.total)}`);
    await loadOrders();
  }

  async function advanceOrder(order: Order) {
    const status = nextStatus[order.status];
    if (!status) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(payload.error || "Không thể cập nhật đơn"); return; }
    setNotice(`Đã chuyển ${order.orderNumber} sang ${statusLabel[status]}`);
    await loadOrders();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f8f5f0] text-[#6b4b2a]"><Loader2 className="animate-spin" /><span className="ml-3 font-semibold">Đang tải dữ liệu cửa hàng…</span></main>;
  if (!user) return null;

  const allNav = [["Tổng quan", LayoutDashboard], ["Bán hàng", ShoppingCart], ["Pha chế", Coffee], ["Đơn hàng", ShoppingBag], ["Bàn & khu vực", Table2], ["Sản phẩm", Package], ["Kho nguyên liệu", Boxes], ["Khách hàng", Users], ["Báo cáo", BarChart3]] as const;
  const nav = allNav.filter(([label]) => user.role === "BARISTA" ? label === "Pha chế" : user.role === "CASHIER" ? ["Bán hàng", "Đơn hàng"].includes(label) : true);
  const currentDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Image src={brandLogo} alt="Logo Tiệm nhà Noel" priority /></div><div><strong>Tiệm nhà Noel</strong><span>Quản lý cửa hàng</span></div></div>
      <div className="store-switch"><div className="store-icon"><Store size={16} /></div><div><small>CỬA HÀNG</small><b>Chi nhánh trung tâm</b></div><ChevronDown size={15} /></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? "nav-item active" : "nav-item"} onClick={() => setActive(label)}><Icon size={19} /><span>{label}</span>{label === "Pha chế" && orders.filter((order) => order.status === "NEW").length > 0 && <i>{orders.filter((order) => order.status === "NEW").length}</i>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings2 size={19} /><span>Cài đặt</span></button><button className="user-card" onClick={logout} title="Đăng xuất"><div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div><div><b>{user.name}</b><span>{user.role}</span></div><LogOut size={15} /></button></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="mobile-brand"><Menu size={21} /><Image src={brandLogo} alt="Logo Tiệm nhà Noel" className="mobile-logo" /><b>Tiệm nhà Noel</b></div><div className="breadcrumb"><span>{active}</span><small>{currentDate}</small></div><div className="top-actions"><button className="icon-btn notification" aria-label="Thông báo"><Bell size={19} />{orders.some((order) => order.status === "NEW") && <i />}</button><div className="top-avatar">{user.name.slice(0, 2).toUpperCase()}</div></div></header>
      {error && <div role="alert" className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Đóng lỗi"><X size={16} /></button></div>}
      {notice && <div className="toast"><div className="toast-check"><Check size={18} /></div><div><b>Thành công</b><span>{notice}</span></div><button onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={16} /></button></div>}
      {active === "Bán hàng" ? <div className="pos-layout">
        <section className="catalog">
          <div className="page-heading"><div><p className="eyebrow">ĐIỂM BÁN HÀNG</p><h1>Tạo đơn mới <span className="live-dot">● {shiftOpen ? "Đang mở ca" : "Chưa mở ca"}</span></h1></div>{!shiftOpen && <button className="primary-btn" disabled={busy} onClick={openShift}>{busy ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />} Mở ca</button>}</div>
          <div className="search-row"><div className="search-box"><Search size={18} /><input aria-label="Tìm sản phẩm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm món theo tên hoặc mã..." /></div><button className="filter-btn"><Package size={17} /> {visibleProducts.length} món</button></div>
          <div className="category-tabs">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "category active" : "category"}>{item}{item === "Tất cả" && <span>{products.length}</span>}</button>)}</div>
          <div className="product-grid">{visibleProducts.map((product) => <button className="product-card" key={product.id} onClick={() => addToCart(product)}><ProductIcon product={product} /><div className="product-info"><div><span className="product-cat">{product.category.name}</span><h3>{product.name}</h3><small>{product.code}</small></div><b>{money(product.sellingPrice)}</b></div><span className="add-product"><Plus size={16} /></span></button>)}</div>
        </section>
        <aside className="order-panel">
          <div className="order-header"><div><p className="eyebrow">ĐƠN HÀNG MỚI</p><h2>{orderType === "TAKEAWAY" ? "Đơn mang đi" : "Đơn tại quán"}</h2></div><button className="more-btn" aria-label="Tùy chọn đơn">•••</button></div>
          <div className="order-meta"><button onClick={() => { setOrderType((value) => value === "TAKEAWAY" ? "DINE_IN" : "TAKEAWAY"); setTableId(""); }}><Bike size={15} /> {orderType === "TAKEAWAY" ? "Mang đi" : "Tại quán"}</button>{orderType === "DINE_IN" && <select aria-label="Chọn bàn" value={tableId} onChange={(event) => setTableId(event.target.value)} className="rounded-lg border border-[#ded2c5] bg-white px-2 py-1 text-sm"><option value="">Chọn bàn</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.area.name} · {table.name}</option>)}</select>}</div>
          <div className="cart-list">{cart.length === 0 && <p className="p-6 text-center text-sm text-[#8a796b]">Chọn món để bắt đầu tạo đơn.</p>}{cart.map((item, index) => { const size = item.product.sizes.find((entry) => entry.name === item.size); const unitPrice = item.product.sellingPrice + (size?.extraPrice ?? 0); return <div className="cart-item" key={`${item.product.id}-${index}`}><ProductIcon product={item.product} /><div className="cart-detail"><b>{item.product.name}</b>{item.product.sizes.length > 0 && <select aria-label={`Kích thước ${item.product.name}`} value={item.size} onChange={(event) => setCart((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, size: event.target.value } : entry))}>{item.product.sizes.map((entry) => <option key={entry.id} value={entry.name}>Size {entry.name} · {money(item.product.sellingPrice + entry.extraPrice)}</option>)}</select>}<div className="qty"><button aria-label={`Giảm ${item.product.name}`} onClick={() => updateQuantity(index, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label={`Tăng ${item.product.name}`} onClick={() => updateQuantity(index, 1)}><Plus size={13} /></button></div></div><strong>{money(unitPrice * item.quantity)}</strong><button className="remove" aria-label={`Xóa ${item.product.name}`} onClick={() => updateQuantity(index, -item.quantity)}><X size={14} /></button></div>; })}</div>
          <label className="note-btn">Mã khuyến mãi<input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} placeholder="Ví dụ: NOEL15" className="ml-2 min-w-0 flex-1 bg-transparent outline-none" /></label>
          <div className="bill"><div><span>Tạm tính dự kiến</span><b>{money(subtotal)}</b></div><div className="total"><span>Server sẽ tính lại</span><strong>{money(subtotal)}</strong></div></div>
          <div className="payment-label"><span>Phương thức thanh toán</span></div><div className="payment-methods"><button className={paymentMethod === "CASH" ? "selected" : ""} onClick={() => setPaymentMethod("CASH")}><span>💵</span> Tiền mặt</button><button className={paymentMethod === "TRANSFER" ? "selected" : ""} onClick={() => setPaymentMethod("TRANSFER")}><CreditCard size={17} /> Chuyển khoản</button></div>
          <button className="pay-btn" disabled={busy || cart.length === 0} onClick={pay}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Thanh toán {money(subtotal)}</button>
        </aside>
      </div> : active === "Pha chế" ? <Kitchen orders={orders.filter((order) => ["NEW", "IN_PROGRESS", "READY"].includes(order.status))} busy={busy} onAdvance={advanceOrder} /> : active === "Đơn hàng" ? <Orders orders={orders} /> : <ModulePlaceholder active={active} products={products.length} tables={tables.length} orders={orders.length} />}
    </section>
  </main>;
}

function Kitchen({ orders, busy, onAdvance }: { orders: Order[]; busy: boolean; onAdvance: (order: Order) => void }) {
  return <section className="content-page"><div className="page-heading"><div><p className="eyebrow">CẬP NHẬT TỰ ĐỘNG MỖI 10 GIÂY</p><h1>Pha chế · {orders.length} đơn đang chờ</h1></div></div>{orders.length === 0 ? <div className="panel p-10 text-center"><Coffee className="mx-auto mb-3 text-[#a47d59]" /><b>Không có đơn đang chờ</b><p className="mt-2 text-sm text-[#7a6a5d]">Đơn mới sẽ tự động xuất hiện tại đây.</p></div> : <div className="kitchen-grid">{orders.map((order) => <div className={`ticket ${order.status === "NEW" ? "new" : ""}`} key={order.id}><div className="ticket-head"><div><b>{order.orderNumber}</b><span>{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(order.createdAt))}</span></div><span className="status-pill">{statusLabel[order.status]}</span></div><div className="ticket-customer">{order.table?.name ?? "Mang đi"} · <b>{order.user.name}</b></div><div className="ticket-items">{order.items.map((item) => <div key={item.id}><b>{item.quantity}×</b><span>{item.nameSnapshot}<small>{item.sizeName ? `Size ${item.sizeName}` : ""}{item.note ? ` · ${item.note}` : ""}</small></span></div>)}</div><button disabled={busy} className="ticket-action" onClick={() => onAdvance(order)}>{nextStatusLabel[order.status]} <ChevronDown size={15} /></button></div>)}</div>}</section>;
}

function Orders({ orders }: { orders: Order[] }) {
  return <section className="content-page"><div className="page-heading"><div><p className="eyebrow">DỮ LIỆU THỰC TỪ DATABASE</p><h1>Đơn hàng gần đây</h1></div></div><div className="panel table-panel"><div className="order-table"><div className="table-row table-title"><span>Mã đơn</span><span>Thời gian</span><span>Nhân viên</span><span>Thanh toán</span><span>Tổng tiền</span><span>Trạng thái</span></div>{orders.map((order) => <div className="table-row" key={order.id}><b>{order.orderNumber}</b><span>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(order.createdAt))}</span><span>{order.user.name}</span><span>{order.paymentMethod === "CASH" ? "Tiền mặt" : order.paymentMethod === "TRANSFER" ? "Chuyển khoản" : "Khác"}</span><strong>{money(order.total)}</strong><span className={`table-status ${order.status === "COMPLETED" ? "done" : "processing"}`}>{statusLabel[order.status]}</span></div>)}</div></div></section>;
}

function ModulePlaceholder({ active, products, tables, orders }: { active: string; products: number; tables: number; orders: number }) {
  return <section className="content-page"><div className="page-heading"><div><p className="eyebrow">TIỆM NHÀ NOEL</p><h1>{active}</h1></div></div><div className="stats-grid"><div className="stat-card"><div className="stat-icon green"><Package /></div><div><span>Sản phẩm đang bán</span><strong>{products}</strong></div></div><div className="stat-card"><div className="stat-icon blue"><Table2 /></div><div><span>Bàn phục vụ</span><strong>{tables}</strong></div></div><div className="stat-card"><div className="stat-icon purple"><ShoppingBag /></div><div><span>Đơn trong hệ thống</span><strong>{orders}</strong></div></div></div><div className="panel mt-5 p-8"><h2 className="text-xl font-bold">Module {active}</h2><p className="mt-2 text-[#7a6a5d]">Dữ liệu nền đã sẵn sàng. Các thao tác quản trị chi tiết của module này đang ở phạm vi phát triển tiếp theo.</p></div></section>;
}
