import { useEffect, useState } from "react";
import { CheckCircle2, Inbox, MessageSquare, Send, UserRound } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notify";
import { StaffShell } from "@/features/admin/components/StaffShell";
import {
  assignStaffSupportTicket,
  getStaffSupportTicket,
  getStaffSupportTickets,
  replyStaffSupportTicket,
  updateStaffSupportStatus,
  type SupportStatus,
  type SupportTicket,
} from "../services";

const statusLabels: Record<SupportStatus, string> = {
  Open: "Chờ xử lý",
  InProgress: "Đang xử lý",
  WaitingForMerchant: "Chờ Merchant phản hồi",
  Resolved: "Đã giải quyết",
  Closed: "Đã đóng",
};

const priorityLabels = { Low: "Thấp", Normal: "Bình thường", High: "Cao", Urgent: "Khẩn cấp" };

export default function StaffSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SupportStatus | "">("");

  async function loadTickets(selectId?: string) {
    try {
      const next = await getStaffSupportTickets();
      setTickets(next);
      const id = selectId ?? selected?.id ?? next[0]?.id;
      if (id) setSelected(await getStaffSupportTicket(id));
    } catch (error) {
      console.error(error);
      notify.error("Không tải được danh sách hỗ trợ.");
    }
  }

  useEffect(() => { void loadTickets(); }, []);

  async function refresh(id = selected?.id) {
    await loadTickets(id);
  }

  async function handleAssign() {
    if (!selected) return;
    try {
      const ticket = await assignStaffSupportTicket(selected.id);
      setSelected(ticket);
      await refresh(ticket.id);
      notify.success("Đã nhận yêu cầu hỗ trợ.");
    } catch (error) {
      console.error(error);
      notify.error("Không thể nhận yêu cầu.");
    }
  }

  async function handleStatus(nextStatus: SupportStatus) {
    if (!selected) return;
    try {
      const ticket = await updateStaffSupportStatus(selected.id, nextStatus);
      setSelected(ticket);
      setStatus("");
      await refresh(ticket.id);
    } catch (error) {
      console.error(error);
      notify.error("Không cập nhật được trạng thái.");
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !message.trim()) return;
    try {
      const ticket = await replyStaffSupportTicket(selected.id, message.trim());
      setMessage("");
      setSelected(ticket);
      await refresh(ticket.id);
    } catch (error) {
      console.error(error);
      notify.error("Không gửi được phản hồi.");
    }
  }

  return (
    <StaffShell activeItem="support">
      <div className="space-y-6">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">Support operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Hỗ trợ Merchant</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Tiếp nhận, xử lý và phản hồi các vấn đề từ quán.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex items-center gap-2"><Inbox className="h-5 w-5 text-cyan-600" /><h2 className="text-lg font-black">Ticket cần xử lý</h2></div>
            <div className="mt-4 space-y-3">{tickets.length === 0 ? <p className="text-sm text-slate-500">Chưa có ticket.</p> : tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => void getStaffSupportTicket(ticket.id).then((next) => { setSelected(next); setStatus(next.status); })} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === ticket.id ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "border-slate-200 dark:border-white/10"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{ticket.subject}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{ticket.merchant?.name || "Merchant"}</p></div><span className="shrink-0 text-[10px] font-black uppercase text-slate-500">{priorityLabels[ticket.priority]}</span></div><p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">{statusLabels[ticket.status]}</p></button>)}</div>
          </section>
          {selected ? <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">{selected.merchant?.name}</p><h2 className="mt-1 text-xl font-black">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{statusLabels[selected.status]} · {priorityLabels[selected.priority]}</p></div><div className="flex flex-wrap gap-2">{!selected.assignedStaff && <Button type="button" variant="outline" size="sm" onClick={() => void handleAssign()}><UserRound className="mr-1 h-4 w-4" />Nhận xử lý</Button>}<select value={status} onChange={(event) => { const next = event.target.value as SupportStatus; setStatus(next); void handleStatus(next); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold dark:border-white/10 dark:bg-slate-950"><option value="Open">Chờ xử lý</option><option value="InProgress">Đang xử lý</option><option value="WaitingForMerchant">Chờ Merchant phản hồi</option><option value="Resolved">Đã giải quyết</option><option value="Closed">Đã đóng</option></select></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-sm font-bold">{selected.description}</p>{selected.orderId && <p className="mt-2 text-xs text-slate-500">Mã đơn: {selected.orderId}</p>}</div><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{selected.messages.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10"><p className="text-xs font-black">{item.sender?.fullName || "Người dùng"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p></div>)}</div><form onSubmit={handleReply} className="mt-4 flex gap-2"><Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Phản hồi cho Merchant..." /><Button type="submit" size="icon"><Send className="h-4 w-4" /></Button></form><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><MessageSquare className="h-4 w-4" />Mọi phản hồi đều được lưu trong ticket và gửi notification.</div></section> : <div className="grid min-h-96 place-items-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-white/10"><CheckCircle2 className="mb-2 h-6 w-6" />Chọn ticket để bắt đầu xử lý.</div>}
        </div>
      </div>
    </StaffShell>
  );
}
