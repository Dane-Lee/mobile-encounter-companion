import SectionCard from '../../components/SectionCard';
import type { StoredMobileWeekSnapshot } from '../../contracts/mobileContracts';
import { toWeekRangeLabel } from '../../lib/dateTime';

interface WeekSummaryCardProps {
  snapshot: StoredMobileWeekSnapshot;
}

const WeekSummaryCard = ({ snapshot }: WeekSummaryCardProps) => {
  const { weekSummary } = snapshot.package;

  return (
    <SectionCard
      className="section-card--summary"
      title={toWeekRangeLabel(snapshot.package.weekStartDate, snapshot.package.weekEndDate)}
      subtitle="Read-only desktop snapshot. Counts and reminders are not editable on mobile."
    >
      <div className="summary-grid">
        <div>
          <strong>{weekSummary.totalCompletedEncounters}</strong>
          <span>Completed encounters</span>
        </div>
        <div>
          <strong>{weekSummary.totalScheduledReminders}</strong>
          <span>Scheduled reminders</span>
        </div>
        <div>
          <strong>{weekSummary.totalOverdueReminders}</strong>
          <span>Overdue reminders</span>
        </div>
        <div>
          <strong>{weekSummary.totalFollowUpsDue}</strong>
          <span>Follow-ups due</span>
        </div>
        <div>
          <strong>{weekSummary.daysWithActivityCount}</strong>
          <span>Days with activity</span>
        </div>
      </div>
    </SectionCard>
  );
};

export default WeekSummaryCard;
