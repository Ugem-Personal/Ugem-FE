import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getCurrentCheckIns,
  type CustomerCheckIn,
} from "@/shared/services/checkInService";
import {
  disputeCheckIn,
  getMyClaims,
  getMyIncidents,
  reportMerchantIncident,
  submitMerchantClaim,
  type IncidentType,
  type IncidentSeverity,
} from "@/features/moderation/services";

const statusNames: Record<CustomerCheckIn["status"], string> = {
  Pending: "Chờ xác minh",
  Verified: "Đã xác minh",
  Rejected: "Không hợp lệ",
  Disputed: "Đang tranh chấp",
  Expired: "Đã hết hạn",
};

export default function CustomerSafetyPage() {
  const [checkIns, setCheckIns] = useState<CustomerCheckIn[]>([]);
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [description, setDescription] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>("Other");

  const [incidentSeverity, setIncidentSeverity] =
    useState<IncidentSeverity>("Medium");
  const [claimMerchantId, setClaimMerchantId] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");

  const refresh = async () => {
    const [checks, reports, myClaims] = await Promise.all([
      getCurrentCheckIns(),
      getMyIncidents(),
      getMyClaims(),
    ]);
    setCheckIns(checks);
    setIncidents(reports);
    setClaims(myClaims);
  };
  useEffect(() => {
    void refresh().catch(() =>
      setError("Không tải được dữ liệu. Vui lòng thử lại."),
    );
  }, []);

  const dispute = async (item: CustomerCheckIn) => {
    const reason = window.prompt("Lý do bạn muốn khiếu nại lượt check-in này:");
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    try {
      await disputeCheckIn(item.id, reason.trim());
      await refresh();
    } catch {
      setError("Gửi khiếu nại thất bại. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const submitIncident = async (event: FormEvent) => {
    event.preventDefault();

    if (!merchantId.trim() || !description.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin báo cáo.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await reportMerchantIncident({
        merchantId: merchantId.trim(),
        type: incidentType,
        severity: incidentSeverity,
        description: description.trim(),
      });

      setMerchantId("");
      setDescription("");
      setIncidentType("Other");
      setIncidentSeverity("Medium");

      await refresh();
    } catch {
      setError("Gửi báo cáo thất bại. Hãy kiểm tra mã quán và thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const submitClaim = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submitMerchantClaim({
        merchantId: claimMerchantId.trim(),
        evidenceUrls: evidenceUrls.split(/\s+/).filter(Boolean),
      });
      setClaimMerchantId("");
      setEvidenceUrls("");
      await refresh();
    } catch {
      setError(
        "Gửi yêu cầu claim thất bại. Kiểm tra mã quán hoặc yêu cầu đang xử lý.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header>
        <Link className="text-sm text-cyan-600" to="/customer">
          ← Về khám phá
        </Link>
        <h1 className="mt-3 text-2xl font-black">Check-in & an toàn</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi lượt check-in, khiếu nại và báo cáo của bạn.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-100 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
        <h2 className="font-bold">Lịch sử check-in</h2>
        {checkIns.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có lượt check-in nào.</p>
        ) : (
          checkIns.map((item) => (
            <article
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 dark:border-white/10"
            >
              <div>
                <p className="font-semibold">{item.merchant.name}</p>
                <p className="text-xs text-slate-500">
                  {item.verifiedAt
                    ? new Date(item.verifiedAt).toLocaleString("vi-VN")
                    : item.checkedInAt
                      ? new Date(item.checkedInAt).toLocaleString("vi-VN")
                      : "Đang chờ"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-white/10">
                  {statusNames[item.status]}
                </span>
                {item.status === "Verified" && (
                  <button
                    disabled={busy}
                    onClick={() => void dispute(item)}
                    className="text-sm font-semibold text-rose-600 disabled:opacity-50"
                  >
                    Khiếu nại
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <form
          onSubmit={submitIncident}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"
        >
          <div>
            <h2 className="font-bold">Báo cáo vấn đề tại quán</h2>

            <p className="mt-1 text-xs text-slate-500">
              Báo cáo các vấn đề về an toàn, vệ sinh, gian lận, thông tin sai
              hoặc chất lượng dịch vụ.
            </p>
          </div>

          <label className="block text-sm">
            Mã quán
            <input
              required
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="Nhập Merchant ID"
              className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            Loại vấn đề
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as IncidentType)}
              className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2"
            >
              <option value="FoodSafety">An toàn thực phẩm</option>
              <option value="Hygiene">Vệ sinh</option>
              <option value="Fraud">Gian lận</option>
              <option value="WrongInformation">Thông tin sai</option>
              <option value="BadService">Dịch vụ không tốt</option>
              <option value="Other">Khác</option>
            </select>
          </label>

          <label className="block text-sm">
            Mức độ
            <select
              value={incidentSeverity}
              onChange={(e) =>
                setIncidentSeverity(e.target.value as IncidentSeverity)
              }
              className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2"
            >
              <option value="Low">Thấp</option>
              <option value="Medium">Trung bình</option>
              <option value="High">Cao</option>
              <option value="Critical">Nghiêm trọng</option>
            </select>
          </label>

          <label className="block text-sm">
            Mô tả
            <textarea
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả vấn đề bạn gặp phải..."
              className="mt-1 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </form>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-bold">Báo cáo đã gửi</h2>

          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có báo cáo.</p>
          ) : (
            incidents.map((incident, index) => (
              <article
                key={String(incident.id ?? index)}
                className="border-t border-slate-100 py-4 text-sm dark:border-white/10"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-white/10">
                    {String(incident.type ?? "Other")}
                  </span>

                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    {String(incident.severity ?? "Medium")}
                  </span>

                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                    {String(incident.status ?? "Open")}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-200">
                  {String(incident.description ?? "Không có mô tả")}
                </p>

                {incident.createdAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Gửi lúc:{" "}
                    {new Date(String(incident.createdAt)).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <form
          onSubmit={submitClaim}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"
        >
          <h2 className="font-bold">Yêu cầu nhận quyền quản lý quán</h2>
          <p className="text-xs text-slate-500">
            Cung cấp bằng chứng quyền sở hữu để Admin/Staff xác minh trước khi
            chuyển quyền.
          </p>
          <label className="block text-sm">
            Mã quán
            <input
              required
              value={claimMerchantId}
              onChange={(e) => setClaimMerchantId(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Link bằng chứng (mỗi dòng một link)
            <textarea
              value={evidenceUrls}
              onChange={(e) => setEvidenceUrls(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border bg-transparent px-3 py-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Gửi yêu cầu claim
          </button>
        </form>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-bold">Claim của tôi</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có yêu cầu claim.</p>
          ) : (
            claims.map((claim, index) => (
              <article
                key={String(claim.id ?? index)}
                className="border-t border-slate-100 py-3 text-sm dark:border-white/10"
              >
                <p>Quán {String(claim.merchantId ?? "")}</p>
                <span className="text-xs text-cyan-600">
                  {String(claim.status ?? "Pending")}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
