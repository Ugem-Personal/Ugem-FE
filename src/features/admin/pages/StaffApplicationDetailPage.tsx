import AdminApplicationDetailPage from "./AdminApplicationDetailPage";

export default function StaffApplicationDetailPage() {
  return (
    <AdminApplicationDetailPage
      basePath="/staff/applications"
      fallbackName="Staff"
      canReview
    />
  );
}
