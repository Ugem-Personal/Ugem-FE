import { useEffect, useState } from "react";
import {
  getModerationQueue,
  reviewModerationItem,
  updateModeratedMerchant,
} from "@/features/moderation/services";

const tabs = [
  ["incidents", "Báo cáo quán"], ["claims", "Claim quán"],
  ["removal-requests", "Gỡ listing"], ["suggestions", "Đề xuất quán"],
  ["suspicious-check-ins", "Check-in đáng ngờ"], ["merchants", "Merchant"],
] as const;
type Queue = (typeof tabs)[number][0];
const display = (value: unknown) => typeof value === "string" ? value : "";
const statusesFor = (queue: Queue) => queue === "incidents"
  ? ["UnderReview", "Resolved", "Rejected"]
  : queue === "suggestions"
    ? ["UnderReview", "Approved", "Rejected", "Published"]
    : ["UnderReview", "Approved", "Rejected"];

export default function AdminModerationPage() {
  const [queue, setQueue] = useState<Queue>("incidents");
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const load = async (kind = queue) => {
    setLoading(true); setError("");
    try { setItems(await getModerationQueue(kind)); }
    catch { setError("Không tải được hàng chờ. Kiểm tra quyền truy cập và thử lại."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(queue); }, [queue]);

  const review = async (item: Record<string, unknown>, status: string, severity?: string) => {
    if (!item.id || queue === "suspicious-check-ins") return;
    setBusyId(String(item.id)); setError("");
    try {
      if (queue === "merchants") {
        const update = status === "Suspended"
          ? { status: "Suspended", verificationStatus: "Suspended", listingVisibility: "Hidden", safetySuppressed: true }
          : status === "Restore"
            ? { status: "Active", verificationStatus: "VerifiedBusiness", listingVisibility: "Public", safetySuppressed: false }
            : status === "Hide"
              ? { listingVisibility: "Hidden" }
              : { verificationStatus: "VerifiedBusiness", listingVisibility: "Public" };
        await updateModeratedMerchant(String(item.id), update);
      } else {
        await reviewModerationItem(queue, String(item.id), {
          status,
          ...(severity ? { severity } : {}),
          decision: `Đã xử lý: ${status}`,
          adminDecision: `Đã xử lý: ${status}`,
        });
      }
      await load(queue);
    } catch { setError("Cập nhật thất bại. Hãy kiểm tra trạng thái hiện tại và thử lại."); }
    finally { setBusyId(""); }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white"><div className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Trust & safety</p><h1 className="mt-1 text-3xl font-black">Moderation</h1><p className="mt-2 text-sm text-slate-500">Báo cáo, claim, gỡ listing, kiểm tra merchant và các tín hiệu đáng ngờ.</p></header>
    <div className="flex flex-wrap gap-2" role="tablist">{tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={queue === id} onClick={() => setQueue(id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${queue === id ? "bg-cyan-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>{label}</button>)}</div>
    {error && <p role="alert" className="rounded-lg bg-rose-100 p-3 text-rose-800">{error}</p>}
    {loading ? <p>Đang tải…</p> : items.length === 0 ? <p className="rounded-xl border border-slate-200 p-6 text-slate-500 dark:border-white/10">Hàng chờ hiện chưa có mục nào.</p> : <div className="space-y-3">{items.map((item, index) => {
      const id = String(item.id ?? index);
      const merchant = item.merchant as Record<string, unknown> | undefined;
      return <article key={id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900"><div className="flex flex-wrap justify-between gap-4"><div className="min-w-[220px] flex-1"><h2 className="font-bold">{display(item.name) || display(item.type) || display(item.action) || display(merchant?.name) || "Yêu cầu moderation"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{display(item.description) || display(item.reason) || display(item.suspiciousReason) || display(item.address) || "Không có mô tả"}</p><p className="mt-2 text-xs text-slate-500">{queue === "merchants" ? `Vận hành: ${String(item.status)} · Xác minh: ${String(item.verificationStatus)} · Listing: ${String(item.listingVisibility)} · Safety: ${item.safetySuppressed ? "Suppressed" : "OK"}` : `Trạng thái: ${String(item.status ?? "—")}`} · ID: {id}</p></div>
        {queue === "merchants" ? <div className="flex flex-wrap items-center gap-2">{item.status === "Suspended" || item.status === "Inactive" ? <button disabled={busyId === id} onClick={() => void review(item, "Restore")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Khôi phục</button> : <button disabled={busyId === id} onClick={() => void review(item, "Suspended")} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Suspend</button>}<button disabled={busyId === id} onClick={() => void review(item, "Verify")} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Xác minh</button><button disabled={busyId === id} onClick={() => void review(item, "Hide")} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50">Ẩn listing</button></div>
          : queue !== "suspicious-check-ins" && <div className="flex items-center gap-2"><select aria-label="Trạng thái xử lý" defaultValue="UnderReview" className="rounded-lg border bg-transparent px-2 py-2 text-sm">{statusesFor(queue).map(status => <option key={status}>{status}</option>)}</select>{queue === "incidents" && <select aria-label="Mức độ incident" defaultValue={String(item.severity ?? "Medium")} className="rounded-lg border bg-transparent px-2 py-2 text-sm"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>}<button disabled={busyId === id} onClick={e => { const selects = e.currentTarget.parentElement?.querySelectorAll("select"); const status = selects?.[0]?.value; const severity = selects?.[1]?.value; if (status) void review(item, status, severity); }} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Lưu</button></div>}
      </div></article>;
    })}</div>}
  </div></main>;
}
