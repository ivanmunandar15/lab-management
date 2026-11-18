import type { Metadata } from "next";
import { auth } from "@/auth";
import { BorrowingTrendChart } from "@/components/features/dashboard/borrowing-trend-chart";
import { BorrowingsPanel } from "@/components/features/dashboard/borrowings-panel";
import { CalibrationAlertsPanel } from "@/components/features/dashboard/calibration-alerts-panel";
import { CostChart } from "@/components/features/dashboard/cost-chart";
import { QuickActions } from "@/components/features/dashboard/quick-actions";
import { RecentActivityPanel } from "@/components/features/dashboard/recent-activity-panel";
import { RoomConditionsPanel } from "@/components/features/dashboard/room-conditions-panel";
import { StatTiles } from "@/components/features/dashboard/stat-tiles";
import { StatusDonutChart } from "@/components/features/dashboard/status-donut-chart";
import { PageHeader } from "@/components/features/common/page-header";
import { can } from "@/lib/rbac";
import type { Role } from "@/types/erd";

export const metadata: Metadata = { title: "Dashboard" };

const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Ringkasan operasional laboratorium: alat, penggunaan, kondisi ruangan, dan aktivitas pengguna.",
  SPV: "Pantau kalibrasi, perawatan, penggunaan, dan kondisi ruangan yang perlu keputusan Anda.",
  technician: "Pantau jadwal kalibrasi, perawatan, dan penggunaan yang perlu Anda tangani.",
  QA: "Pantau kepatuhan kalibrasi, penggunaan, dan kondisi ruangan.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null; // layout (app) sudah mengarahkan ke /login
  const { id: userId, role, name } = session.user;

  // Panel tampil sesuai matriks akses di lib/rbac.ts
  const showCalibration = can(role, "calibration", "view");
  const showBorrowing = can(role, "borrowing", "view");
  const showCost = can(role, "calibration", "view") || can(role, "maintenance", "view");
  const showRooms = can(role, "monitoring", "view");
  const showActivity = can(role, "activity_log", "view");

  return (
    <>
      <PageHeader
        title={`Halo, ${name?.split(" ")[0] ?? ""}`}
        description={ROLE_DESCRIPTION[role]}
        actions={<QuickActions role={role} />}
      />

      <div className="space-y-4">
        <StatTiles />

        {(showCalibration || showBorrowing) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {showCalibration && <CalibrationAlertsPanel />}
            {showBorrowing && <BorrowingsPanel currentUserId={userId} />}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatusDonutChart />
          {showBorrowing && <BorrowingTrendChart />}
          {showCost && <CostChart />}
        </div>

        {(showRooms || showActivity) && (
          <div className="grid gap-4 lg:grid-cols-3">
            {showRooms && <RoomConditionsPanel className={showActivity ? "lg:col-span-2" : "lg:col-span-3"} />}
            {showActivity && <RecentActivityPanel className={showRooms ? undefined : "lg:col-span-3"} />}
          </div>
        )}
      </div>
    </>
  );
}
