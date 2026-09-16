import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "@/features/auth";
import { getMerchantIncidents, getMyClaims, getMyRemovalRequests, requestMerchantRemoval } from "@/features/moderation/services";
import { MerchantHeader } from "@/shared/layouts/Merchants/MerchantHeader";
import { MerchantSidebar } from "@/shared/layouts/Merchants/MerchantSidebar";

type Row = Record<string, unknown>;
const statusLabel = (row: Row) => String(row.status ?? "Pending");

export default function MerchantGovernancePage() {
  const merchantId = getCurrentUser()?.MerchantId ?? "";
  const [claims, setClaims] = useState<Row[]>([]);
  const [removals, setRemovals] = useState<Row[]>([]);
  const [incidents, setIncidents] = useState<Row[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    const [myClaims, myRemovals, merchantIncidents] = await Promise.all([getMyClaims(), getMyRemovalRequests(), getMerchantIncidents()]);
    setClaims(myClaims); setRemovals(myRemovals); setIncidents(merchantIncidents);
  };
  useEffect(() => { void refresh().catch(() => setError("Không tải được hồ sơ quản lý quán.")); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!merchantId) return;
    setBusy(true); setError("");
    try { await requestMerchantRemoval({ merchantId, reason: reason.trim() }); setReason(""); await refresh(); }
    catch { setError("Gửi yêu cầu gỡ listing thất bại. Kiểm tra lại hoặc liên hệ hỗ trợ."); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><div className="flex"><MerchantSidebar /><div className="min-w-0 flex-1"><MerchantHeader /><main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header><Link to="/merchant" className="text-sm text-cyan-600">← Tổng quan quán</Link><h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Hồ sơ & an toàn quán</h1><p className="mt-1 text-sm text-slate-500">Theo dõi yêu cầu claim/gỡ listing và phản ánh liên quan.</p></header>
    {error && <p role="alert" className="rounded-lg bg-rose-100 p-3 text-rose-800">{error}</p>}
    <section className="grid gap-4 md:grid-cols-2"><form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">Yêu cầu gỡ listing</h2><p className="text-xs text-slate-500">Yêu cầu sẽ được Admin/Staff xét duyệt; listing không bị xóa khỏi hệ thống.</p><label className="block text-sm text-slate-700 dark:text-slate-200">Lý do<textarea required minLength={10} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border bg-transparent px-3 py-2" /></label><button disabled={busy || !merchantId} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Gửi yêu cầu</button></form>
      <div className="space-y-3 rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">Yêu cầu gỡ của tôi</h2>{removals.length ? removals.map((row,i) => <p key={String(row.id ?? i)} className="border-t py-3 text-sm dark:border-white/10">{String(row.reason ?? "Yêu cầu gỡ")} <span className="ml-2 text-xs text-cyan-600">{statusLabel(row)}</span></p>) : <p className="text-sm text-slate-500">Chưa có yêu cầu.</p>}</div>
    </section>
    <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">Claim đã gửi</h2>{claims.length ? claims.map((row,i) => <p key={String(row.id ?? i)} className="border-t py-3 text-sm dark:border-white/10">Merchant {String(row.merchantId ?? "")} · <span className="text-cyan-600">{statusLabel(row)}</span></p>) : <p className="mt-2 text-sm text-slate-500">Tài khoản này chưa gửi claim. Claim listing khác dùng luồng khách hàng.</p>}</div>
      <div className="rounded-2xl border bg-white p-5 dark:border-white/10 dark:bg-slate-900"><h2 className="font-bold text-slate-900 dark:text-white">Incident liên quan</h2>{incidents.length ? incidents.map((row,i) => <article key={String(row.id ?? i)} className="border-t py-3 text-sm dark:border-white/10"><p>{String(row.type ?? "Incident")} · {String(row.severity ?? "Medium")}</p><p className="text-slate-500">{String(row.description ?? "")} · {statusLabel(row)}</p></article>) : <p className="mt-2 text-sm text-slate-500">Chưa có incident được báo cáo cho quán.</p>}</div>
    </section>
  </main></div></div></div>;
}
