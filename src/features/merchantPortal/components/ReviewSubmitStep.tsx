import type { UseFormWatch } from "react-hook-form";
import type { OnboardingFormValues } from "../schema";

function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Chưa nhập";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function getMenuImageSrc(item?: OnboardingFormValues["menu"][number]) {
  if (!item) return "";
  return (item.imageUploadDataUrl || item.imageUrl || "").trim();
}

function shouldShowImage(src?: string) {
  if (!src) return false;
  return src.startsWith("data:image/") || /^https?:\/\//i.test(src);
}

export function ReviewSubmitStep({
  watch,
}: {
  watch: UseFormWatch<OnboardingFormValues>;
}) {
  const values = watch();
  const logoSrc = (values.logoUploadDataUrl || values.logoUrl || "").trim();

  return (
    <section className="onboarding-card">
      <h2>Kiểm tra & gửi</h2>

      <div className="review-grid">
        <article className="col-span-full mb-4 flex items-center gap-4">
          {shouldShowImage(logoSrc) ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <img
                src={logoSrc}
                alt="Logo quán"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 shadow-sm">
              Chưa có logo
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {values.restaurantName || "Tên quán chưa nhập"}
            </h3>
            <p className="text-sm text-slate-500">
              {values.restaurantType || "Loại hình chưa chọn"}
            </p>
          </div>
        </article>

        <article>
          <span>Email</span>
          <strong>{values.email || "Chưa nhập"}</strong>
        </article>

        <article>
          <span>Số điện thoại</span>
          <strong>{values.phone || "Chưa nhập"}</strong>
        </article>

        <article>
          <span>Giờ mở cửa</span>
          <strong>{values.openingHours || "Chưa nhập"}</strong>
        </article>

        <article>
          <span>Món chính</span>
          <strong>{values.mainDishType || "Chưa chọn"}</strong>
        </article>

        <article>
          <span>Khoảng giá</span>
          <strong>{values.priceRange || "Chưa chọn"}</strong>
        </article>

        <article className="review-grid-wide">
          <span>Địa chỉ</span>
          <strong>{values.address || "Chưa nhập"}</strong>
        </article>

        <article className="review-grid-wide">
          <span>Mô tả quán</span>
          <strong>{values.description || "Chưa nhập"}</strong>
        </article>
      </div>

      <section className="review-block">
        <h3>Thực đơn</h3>

        {values.menu?.length ? (
          <div className="review-menu-list">
            {values.menu.map((menuItem, index) => {
              const imageSrc = getMenuImageSrc(menuItem);
              return (
                <article key={index} className="review-menu-card">
                  <div className="review-menu-header">
                    <strong>
                      Món #{index + 1}: {menuItem.name || "Chưa nhập"}
                    </strong>
                    <span>{formatMoney(menuItem.price)}</span>
                  </div>

                  <p className="review-menu-desc">
                    {menuItem.description || "Chưa nhập mô tả"}
                  </p>

                  {menuItem.category && (
                    <p className="review-menu-meta">
                      Danh mục: <strong>{menuItem.category}</strong>
                    </p>
                  )}

                  {shouldShowImage(imageSrc) && (
                    <div className="menu-image-preview">
                      <img
                        src={imageSrc}
                        alt={`Ảnh món #${index + 1}`}
                        loading="lazy"
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="review-empty">Chưa có món nào.</p>
        )}
      </section>

      <div className="onboarding-tip">
        <strong>Sau khi gửi</strong>
        <p>
          Hồ sơ sẽ được gửi đến staff để xét duyệt. Quá trình xét duyệt thường diễn ra trong vòng 24h.
        </p>
      </div>
    </section>
  );
}
