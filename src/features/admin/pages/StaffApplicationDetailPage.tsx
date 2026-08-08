import { useLocation } from "react-router-dom";

import AdminApplicationDetailPage from "./AdminApplicationDetailPage";
import { StaffShell } from "../components/StaffShell";
import type { Application } from "../types";

export default function StaffApplicationDetailPage() {
  const location = useLocation();
  const application = location.state?.application as Application | undefined;
  const isPending =
    !application?.status || application.status.toLowerCase() === "pending";

  return (
    <StaffShell activeItem={isPending ? "pending" : "approved"}>
      <AdminApplicationDetailPage
        basePath="/staff/applications"
        fallbackName="Staff"
        canReview
        embedded
      />
    </StaffShell>
  );
}
