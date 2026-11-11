import { createFileRoute } from "@tanstack/react-router";
import { StaffLogin } from "@/components/StaffLogin";

export const Route = createFileRoute("/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Login — Einyornose" },
      { name: "description", content: "Secure access for the Einyornose team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffLogin,
});
