import { RouterProvider } from "react-router-dom";
import "../App.css";
import routers from "./router";
import { Toaster } from "@/shared/components/ui/sonner";

export default function App() {
  return (
    <>
      <RouterProvider router={routers} />
      <Toaster />
    </>
  );
}
