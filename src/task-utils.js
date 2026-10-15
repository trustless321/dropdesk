export const URGENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function toTimestamp(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  return typeof value === 'number' ? value : Number.NaN;
}

/**
 * Date inputs do not include a time, so tasks are due at the end of their
 * selected local day rather than at midnight at its beginning.
 */
export function getDeadlineTimestamp(deadline) {
  if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return Number.NaN;
  }

  const [year, month, day] = deadline.split('-').map(Number);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return Number.NaN;
  }

  return date.getTime();
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const units = [];

  if (days > 0) {
    units.push(`${days}d`);
  }
  if (hours > 0) {
    units.push(`${hours}h`);
  }
  if (minutes > 0) {
    units.push(`${minutes}m`);
  }
  if (seconds > 0 && units.length < 2) {
    units.push(`${seconds}s`);
  }

  return units.slice(0, 2).join(' ');
}

export function formatCountdown(deadline, now = new Date()) {
  const deadlineTimestamp = getDeadlineTimestamp(deadline);
  const nowTimestamp = toTimestamp(now);

  if (!Number.isFinite(deadlineTimestamp) || !Number.isFinite(nowTimestamp)) {
    return 'Countdown unavailable';
  }

  const difference = deadlineTimestamp - nowTimestamp;
  if (difference === 0) {
    return 'Due now';
  }

  return difference < 0
    ? `Overdue by ${formatDuration(Math.abs(difference))}`
    : `Due in ${formatDuration(difference)}`;
}

export function getTaskUrgency(task, now = new Date()) {
  const deadlineTimestamp = getDeadlineTimestamp(task?.deadline);
  const nowTimestamp = toTimestamp(now);

  if (!Number.isFinite(deadlineTimestamp) || !Number.isFinite(nowTimestamp)) {
    return 'unknown';
  }

  const difference = deadlineTimestamp - nowTimestamp;
  if (difference < 0) {
    return 'overdue';
  }
  if (difference <= URGENT_WINDOW_MS) {
    return 'urgent';
  }

  return 'upcoming';
}

export function sortTasksByUrgency(tasks, now = new Date()) {
  const nowTimestamp = toTimestamp(now);

  return tasks
    .map((task, index) => ({
      task,
      index,
      deadlineTimestamp: getDeadlineTimestamp(task?.deadline),
    }))
    .sort((left, right) => {
      const leftValid = Number.isFinite(left.deadlineTimestamp) && Number.isFinite(nowTimestamp);
      const rightValid = Number.isFinite(right.deadlineTimestamp) && Number.isFinite(nowTimestamp);

      if (leftValid !== rightValid) {
        return leftValid ? -1 : 1;
      }

      if (!leftValid) {
        return left.index - right.index;
      }

      const leftOverdue = left.deadlineTimestamp < nowTimestamp;
      const rightOverdue = right.deadlineTimestamp < nowTimestamp;

      if (leftOverdue !== rightOverdue) {
        return leftOverdue ? -1 : 1;
      }

      return left.deadlineTimestamp - right.deadlineTimestamp || left.index - right.index;
    })
    .map(({ task }) => task);
}

export function getUrgentTasks(tasks, now = new Date()) {
  return sortTasksByUrgency(
    tasks.filter((task) => {
      const urgency = getTaskUrgency(task, now);
      return urgency === 'overdue' || urgency === 'urgent';
    }),
    now,
  );
}

function formatDate(deadline) {
  const timestamp = getDeadlineTimestamp(deadline);
  if (!Number.isFinite(timestamp)) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function formatDigestDate(now) {
  const timestamp = toTimestamp(now);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      }).format(new Date(timestamp))
    : 'Unknown date';
}

export function formatDailyDigest(tasks, now = new Date()) {
  const urgentTasks = getUrgentTasks(tasks, now);
  const lines = [`DropDesk daily digest — ${formatDigestDate(now)}`, ''];

  if (urgentTasks.length === 0) {
    lines.push('No urgent tasks right now.');
    return lines.join('\n');
  }

  for (const task of urgentTasks) {
    const urgency = getTaskUrgency(task, now);
    const label = urgency === 'overdue' ? 'OVERDUE' : 'DUE SOON';
    lines.push(`- ${label}: ${task.title}`);
    lines.push(`  Due ${formatDate(task.deadline)} (${formatCountdown(task.deadline, now)})`);

    if (task.projectLink) {
      lines.push(`  Project: ${task.projectLink}`);
    }

    if (task.notes) {
      lines.push(`  Notes: ${task.notes.replace(/\r?\n/g, '\n  ')}`);
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
