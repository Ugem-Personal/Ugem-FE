import { CheckCircle2, Clock3, FilePlus2, Store, XCircle } from "lucide-react";
import type { MerchantApplication } from "../types";

type StatusTone = "empty" | "pending" | "approved" | "rejected" | "default";

type StatusInfo = {
  label: string;
  description: string;
  tone: StatusTone;
};

const STATUS_CONFIG = {
  empty: {
    icon: FilePlus2,
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    iconBox: "bg-cyan-100 text-cyan-700",
    ring: "ring-cyan-200/70",
  },
  pending: {
    icon: Clock3,
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    iconBox: "bg-amber-100 text-amber-700",
    ring: "ring-amber-200/80",
  },
  approved: {
    icon: CheckCircle2,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconBox: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-200/80",
  },
  rejected: {
    icon: XCircle,
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    iconBox: "bg-rose-100 text-rose-700",
    ring: "ring-rose-200/80",
  },
  default: {
    icon: Store,
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    iconBox: "bg-cyan-100 text-cyan-700",
    ring: "ring-cyan-200/70",
  },
} as const;

function getStatusText(application?: MerchantApplication): StatusInfo {
  if (!application) {
    return {
      label: "Chưa gửi hồ sơ",
      description:
        "Hãy bắt đầu gửi thông tin để quán của bạn được xuất hiện trên UGem.",
      tone: "empty",
    };
  }

  if (application.status === "Pending") {
    return {
      label: "Đang xét duyệt",
      description: "Hồ sơ của bạn đang được staff kiểm tra và thẩm định.",
      tone: "pending",
    };
  }

  if (
    application.status === "Approved" ||
    application.status === "Accepted" ||
    application.status === "Accept"
  ) {
    return {
      label: "Đã được duyệt",
      description: "Quán của bạn đã được duyệt và có thể hiển thị trên UGem.",
      tone: "approved",
    };
  }

  if (application.status === "Rejected") {
    return {
      label: "Bị từ chối",
      description: "Hồ sơ chưa đạt yêu cầu. Bạn có thể chỉnh sửa và gửi lại.",
      tone: "rejected",
    };
  }

  return {
    label: application.status,
    description: "Trạng thái hồ sơ hiện tại của bạn.",
    tone: "default",
  };
}

export function ApplicationStatusCard({
  application,
}: {
  readonly application?: MerchantApplication;
}) {
  const status = getStatusText(application);
  const config = STATUS_CONFIG[status.tone];
  const Icon = config.icon;

  return (
    <section
      className={`
        relative overflow-hidden rounded-[2rem] border border-white/70
        bg-white/85 p-6 shadow-2xl shadow-amber-950/10
        ring-1 ${config.ring} backdrop-blur-xl
      `}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div
          className={`
            grid h-14 w-14 shrink-0 place-items-center rounded-2xl
            shadow-sm ${config.iconBox}
          `}
        >
          <Icon className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={`
              inline-flex rounded-full border px-3 py-1 text-xs font-bold
              uppercase tracking-[0.18em] ${config.badge}
            `}
          >
            Trạng thái hiện tại
          </span>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {status.label}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {status.description}
          </p>
        </div>
      </div>
    </section>
  );
}
