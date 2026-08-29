import { DashboardShell } from "@/components/dashboard/shell";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

interface LayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <>
      <OnboardingWizard />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
