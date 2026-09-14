import { RouterProvider } from "react-router-dom";
import "../App.css";
import routers from "./router";
import { Toaster } from "@/shared/components/ui/sonner";
import { RealtimeProvider } from "@/shared/contexts/RealtimeContext";

export default function App() {
  return (
    <RealtimeProvider>
      <RouterProvider router={routers} />
      <Toaster expand gap={12} visibleToasts={3} />
    </RealtimeProvider>
  );
}
