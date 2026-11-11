import { createFileRoute } from "@tanstack/react-router";
import { StaffLogin } from "@/components/StaffLogin";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Login — Einyornose" },
      { name: "description", content: "Einyornose staff login." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffLogin,
});
