/* eslint-disable no-irregular-whitespace */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Copy,
  Crosshair,
  Gift,
  Loader2,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/features/auth";
import { notify } from "@/shared/lib/notify";
import {
  getCustomerCheckInCode,
  verifyDirectQr,
  type CustomerCheckInCode,
  type VerifiedCheckInResult,
} from "../api/checkInApi";
import { notifyCustomerContributionUpdated } from "../services/customerService";

type CheckInStatus = "idle" | "locating" | "verifying" | "success" | "error";

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

function getBarcodeDetector() {
  return (
    globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }
  ).BarcodeDetector;
}

function extractCheckInToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("checkInToken")?.trim() ?? trimmed;
  } catch {
    return trimmed;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Không thể xác minh check-in. Vui lòng thử lại.";
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ lấy vị trí."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

export default function CustomerCheckInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const merchantId = searchParams.get("merchantId");
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const tokenFromQuery = searchParams.get("checkInToken") ?? "";

  const [tokenInput, setTokenInput] = useState(tokenFromQuery);
  const [status, setStatus] = useState<CheckInStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifiedCheckInResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState<CustomerCheckInCode | null>(
    null,
  );
  const [customerCodeLoading, setCustomerCodeLoading] = useState(false);
  const [customerCodeError, setCustomerCodeError] = useState<string | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScanner = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    let active = true;
    let animationFrame = 0;
    const videoElement = videoRef.current;

    async function startScanner() {
      const BarcodeDetectorApi = getBarcodeDetector();
      if (!BarcodeDetectorApi) {
        setScanError(
          "Trình duyệt chưa hỗ trợ quét QR trực tiếp. Bạn có thể dán link QR bên dưới.",
        );
        setIsScanning(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScanError("Không thể mở camera trên thiết bị này.");
        setIsScanning(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (!videoElement) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoElement.srcObject = stream;
        await videoElement.play();
        const detector = new BarcodeDetectorApi({ formats: ["qr_code"] });

        const scan = async () => {
          if (!active) return;

          try {
            const barcodes = await detector.detect(videoElement);
            const rawValue = barcodes.find((item) => item.rawValue)?.rawValue;
            if (rawValue) {
              const extractedToken = extractCheckInToken(rawValue);
              setTokenInput(extractedToken);
              setScanError(null);
              stopScanner();
              return;
            }
          } catch {
            // Keep scanning while the camera has no readable QR frame.
          }

          animationFrame = window.requestAnimationFrame(() => void scan());
        };

        await scan();
      } catch (scannerError) {
        if (!active) return;
        setScanError(
          scannerError instanceof DOMException && scannerError.name === "NotAllowedError"
            ? "Bạn chưa cấp quyền camera."
            : "Không thể mở camera để quét QR.",
        );
        setIsScanning(false);
      }
    }

    void startScanner();

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, [isScanning, stopScanner]);

  useEffect(() => {
    if (tokenFromQuery) setTokenInput(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (user.Role !== "Customer" && user.Role !== "Reviewer")) {
      const returnUrl = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      navigate(`/login?returnUrl=${returnUrl}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!tokenFromQuery || status !== "idle") return;
    const timer = window.setTimeout(() => {
      void verifyToken(tokenFromQuery);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [status, tokenFromQuery]);

  async function verifyToken(candidate: string) {
    const checkInToken = extractCheckInToken(candidate);
    if (checkInToken.length < 32) {
      setStatus("error");
      setError("QR check-in không chứa token hợp lệ.");
      return;
    }

    setError(null);
    setStatus("locating");

    try {
      const position = await getCurrentPosition();
      setStatus("verifying");

      const verified = await verifyDirectQr({
        checkInToken,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setResult(verified);
      notifyCustomerContributionUpdated();
      setStatus("success");
    } catch (verificationError) {
      console.error(verificationError);
      setStatus("error");
      setError(
        verificationError instanceof GeolocationPositionError
          ? "Không lấy được vị trí. Hãy cấp quyền GPS và thử lại."
          : getErrorMessage(verificationError),
      );
    }
  }

  async function handleVerify() {
    if (status === "locating" || status === "verifying") return;
    await verifyToken(tokenInput);
  }

  async function handleLoadCustomerCode() {
    if (customerCodeLoading) return;
    setCustomerCodeLoading(true);
    setCustomerCodeError(null);
    try {
      setCustomerCode(await getCustomerCheckInCode());
    } catch (codeError) {
      console.error(codeError);
      setCustomerCodeError(getErrorMessage(codeError));
    } finally {
      setCustomerCodeLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!customerCode?.customerCode) return;
    try {
      await navigator.clipboard.writeText(customerCode.customerCode);
      notify.success("Đã sao chép Customer Code.");
    } catch {
      notify.error("Không thể sao chép mã.");
    }
  }

  function goToReview() {
    if (!result?.checkInId) return;
    navigate(
      `/customer/review/create?checkInId=${encodeURIComponent(result.checkInId)}`,
    );
  }

  function goToMerchant() {
    const destinationMerchantId = result?.merchant.id ?? merchantId;
    if (!destinationMerchantId) {
      navigate("/customer");
      return;
    }

    const params = new URLSearchParams();
    if (campaignId) params.set("campaignId", campaignId);
    const query = params.toString();
    navigate(
      `/customer/merchants/${destinationMerchantId}${query ? `?${query}` : ""}`,
    );
  }

  const isPending = status === "locating" || status === "verifying";
  const rewardPoints = result?.gemPointsAwarded ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <section className="overflow-hidden rounded-3xl border border-cyan-200/80 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                  Verified Visit
                </p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  Check-in tại quán
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-cyan-50">
              Quét QR của quán và cho phép UFind lấy vị trí hiện tại. BE sẽ xác minh
              QR, GPS, lượt sử dụng và attribution campaign.
            </p>
            {merchantId && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                <MapPin className="h-3.5 w-3.5" />
                Merchant đã chọn
                {campaignId ? " · Sponsored context" : " · Organic context"}
              </div>
            )}
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {status === "success" && result ? (
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100/70 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/40">
                  <CheckCircle2 className="h-11 w-11" />
                </div>
                <h2 className="mt-5 text-2xl font-black">Check-in thành công</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Bạn đã xác minh đã ghé {result.merchant.name}. Lượt ghé đã được
                  ghi nhận bởi hệ thống UFind.
                </p>

                {rewardPoints > 0 && (
                  <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
                    <Gift className="h-5 w-5" />+{rewardPoints} Gem Points
                  </div>
                )}

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={goToReview}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-600 px-5 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500"
                  >
                    Viết đánh giá
                  </button>
                  <button
                    type="button"
                    onClick={goToMerchant}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Quay lại quán
                  </button>
                </div>

                <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Check-in ID: <span className="font-mono">{result.checkInId}</span>
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                  <div className="flex items-center gap-3">
                    <Crosshair className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <h2 className="font-black">A. Quét Dynamic QR của quán</h2>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        GPS chỉ được lấy khi bạn bắt đầu xác minh.
                      </p>
                    </div>
                  </div>

                  {isScanning ? (
                    <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950">
                      <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="aspect-video w-full object-cover"
                        aria-label="Camera quét mã QR"
                      />
                      <button
                        type="button"
                        onClick={stopScanner}
                        className="m-3 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
                      >
                        Dừng camera
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setScanError(null);
                        setIsScanning(true);
                      }}
                      disabled={isPending}
                      className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                    >
                      <Camera className="h-4 w-4" />
                      Quét QR
                    </button>
                  )}

                  {scanError && (
                    <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {scanError}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <h2 className="font-black">Token QR</h2>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Nếu camera không khả dụng, dán link QR của quán tại đây.
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder="Dán link / token QR..."
                    rows={3}
                    disabled={isPending}
                    className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerify()}
                    disabled={isPending || !tokenInput.trim()}
                    className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-black text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 w-4" />
                    )}
                    {status === "locating"
                      ? "Đang lấy vị trí..."
                      : status === "verifying"
                        ? "Đang xác minh..."
                        : "Xác minh check-in"}
                  </button>
                </div>

                {status === "error" && error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-black">Không thể hoàn tất check-in</p>
                      <p className="mt-1 text-sm leading-6">{error}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-black">B. Customer Code</h2>
                      {/* <p className="mt-1 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                        ÄÃ¢y lÃ  phÆ°Æ¡ng thá»©c merchant xÃ¡c nháº­n trá»±c tiáº¿p, khÃ´ng cháº¡y GPS geofence. QR Direct Visit má»›i kiá»ƒm tra GPS.
                      </p> */}
                      <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-200/80">
                        Hiện BE xác minh Customer Code từ phía merchant. Customer
                        có thể mở mã của mình để đưa quán xác nhận.
                      </p>
                      {!customerCode && (
                        <button
                          type="button"
                          onClick={() => void handleLoadCustomerCode()}
                          disabled={customerCodeLoading}
                          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                        >
                          {customerCodeLoading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Hiển thị mã của tôi
                        </button>
                      )}
                      {customerCodeError && (
                        <p className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
                          {customerCodeError}
                        </p>
                      )}
                      {customerCode && (
                        <div className="mt-4 flex flex-col items-center gap-4 rounded-xl bg-white p-4 dark:bg-slate-950 sm:flex-row sm:items-start">
                          <img
                            src={customerCode.qrDataUrl}
                            alt="QR Customer Code"
                            className="h-32 w-32 rounded-lg"
                          />
                          <div className="min-w-0 text-center sm:text-left">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Mã Customer Code
                            </p>
                            <p className="mt-1 break-all font-mono text-lg font-black text-slate-950 dark:text-white">
                              {customerCode.customerCode}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleCopyCode()}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-white/10"
                            >
                              <Copy className="h-3.5 w-3.5" /> Sao chép mã
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
