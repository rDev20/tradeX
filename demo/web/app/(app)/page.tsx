import { ActiveChannels } from "@/components/active-channels";
import { ActivityFeed } from "@/components/activity-feed";
import { DashboardWorkspaceLinks } from "@/components/dashboard-workspace-links";
import { DashboardNextAction } from "@/components/dashboard-next-action";
import { MissionStatusStrip } from "@/components/mission-status-strip";
import { TodaySummary } from "@/components/today-summary";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <MissionStatusStrip />
      <DashboardNextAction />
      <TodaySummary />
      <DashboardWorkspaceLinks />
      <ActiveChannels />
      <ActivityFeed />
    </div>
  );
}
