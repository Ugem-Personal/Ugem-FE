import AdminApplicationsPage from "./AdminApplicationsPage";
import { StaffShell } from "../components/StaffShell";

type StaffApplicationsPageProps = {
  tab?: "pending" | "reviewed";
};

export default function StaffApplicationsPage({
  tab = "pending",
}: StaffApplicationsPageProps) {
  const isPendingTab = tab === "pending";

  return (
    <StaffShell activeItem={isPendingTab ? "pending" : "approved"}>
      <AdminApplicationsPage
        basePath="/staff/applications"
        title={isPendingTab ? "Hồ sơ chờ duyệt" : "Hồ sơ đã duyệt"}
        subtitle={
          isPendingTab
            ? "Hàng đợi hồ sơ merchant cần Staff kiểm tra và xử lý."
            : "Các hồ sơ merchant đã qua bước xử lý của Staff."
        }
        fallbackName="Staff"
        canReview
        initialTab={tab}
        showTabs={false}
        embedded
      />
    </StaffShell>
  );
}
