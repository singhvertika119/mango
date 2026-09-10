import * as React from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <>
      <React.Suspense fallback={null}>
        <OnboardingWizard />
      </React.Suspense>
      <React.Suspense fallback={<div className="h-screen w-screen bg-background flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Mango workspace...</div>}>
        <DashboardShell>
          <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading dashboard...</div>}>
            {children}
          </React.Suspense>
        </DashboardShell>
      </React.Suspense>
    </>
  );
}
