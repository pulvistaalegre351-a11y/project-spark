import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Bypass authentication and approval check to enter directly
    return { 
      user: { id: "dev-user", email: "dev@local", role: "authenticated" } as any, 
      isAdmin: true 
    };
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
