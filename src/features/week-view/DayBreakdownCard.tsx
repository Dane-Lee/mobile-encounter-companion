import StatusPill from '../../components/StatusPill';
import type { MobileWeekSnapshotDay } from '../../contracts/mobileContracts';
import { toWeekdayDateLabel } from '../../lib/dateTime';

interface DayBreakdownCardProps {
  day: MobileWeekSnapshotDay;
}

const DayBreakdownCard = ({ day }: DayBreakdownCardProps) => (
  <article className="day-card">
    <header className="day-card__header">
      <div>
        <h3>{toWeekdayDateLabel(day.date)}</h3>
        <small>{day.isToday ? 'Today' : day.dayLabel}</small>
      </div>
      {day.overdueReminderCount > 0 ? (
        <StatusPill label={`${day.overdueReminderCount} overdue`} tone="overdue" />
      ) : null}
    </header>

    <div className="day-card__stats">
      <span>{day.completedEncounterCount} encounters</span>
      <span>{day.scheduledReminderCount} scheduled</span>
      <span>{day.followUpCount} follow-ups</span>
    </div>

    {day.completedEncounterItems.length > 0 ? (
      <div className="day-list">
        <h4>Completed</h4>
        {day.completedEncounterItems.map((item) => (
          <div key={item.desktopEncounterId} className="day-list__item">
            <div>
              <strong>{item.employeeDisplayName}</strong>
              <p>{item.summaryShort}</p>
            </div>
            <span>{item.time}</span>
          </div>
        ))}
      </div>
    ) : null}

    {day.scheduledReminderItems.length > 0 ? (
      <div className="day-list">
        <h4>Scheduled reminders</h4>
        {day.scheduledReminderItems.map((item) => (
          <div key={item.desktopReminderId} className="day-list__item">
            <div>
              <strong>{item.title}</strong>
              <p>{item.relatedEmployeeDisplayName ?? 'No employee linked'}</p>
            </div>
            <span>{item.dueTime ?? 'All day'}</span>
          </div>
        ))}
      </div>
    ) : null}

    {day.overdueReminderItems.length > 0 ? (
      <div className="day-list day-list--overdue">
        <h4>Overdue reminders</h4>
        {day.overdueReminderItems.map((item) => (
          <div key={item.desktopReminderId} className="day-list__item">
            <div>
              <strong>{item.title}</strong>
              <p>{item.summaryShort ?? item.relatedEmployeeDisplayName ?? 'Follow-up required'}</p>
            </div>
            <span>{item.dueTime ?? item.dueDate}</span>
          </div>
        ))}
      </div>
    ) : null}

    {!day.completedEncounterItems.length &&
    !day.scheduledReminderItems.length &&
    !day.overdueReminderItems.length ? (
      <div className="day-card__empty">No activity in this snapshot day.</div>
    ) : null}

    {day.notes ? <small className="day-card__notes">{day.notes}</small> : null}
  </article>
);

export default DayBreakdownCard;
