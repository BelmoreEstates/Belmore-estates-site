import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/lots")({
  component: () => <Outlet />,
});
