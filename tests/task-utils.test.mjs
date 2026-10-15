import assert from 'node:assert/strict';
import test from 'node:test';
import {
  URGENT_WINDOW_MS,
  formatCountdown,
  getDeadlineTimestamp,
  getTaskUrgency,
  getUrgentTasks,
  sortTasksByUrgency,
} from '../src/task-utils.js';

const deadlineDate = (date) => new Date(`${date}T23:59:59.999`);

test('getDeadlineTimestamp accepts real calendar dates at the end of the local day', () => {
  const expected = new Date(2026, 1, 28, 23, 59, 59, 999).getTime();

  assert.equal(getDeadlineTimestamp('2026-02-28'), expected);
  assert.ok(Number.isNaN(getDeadlineTimestamp('2026-02-30')));
  assert.ok(Number.isNaN(getDeadlineTimestamp('not-a-date')));
});

test('getTaskUrgency classifies overdue, urgent, and upcoming deadlines at the 24-hour boundary', () => {
  const now = new Date(2026, 9, 14, 23, 59, 59, 999);

  assert.equal(
    getTaskUrgency({ deadline: '2026-10-14' }, new Date(deadlineDate('2026-10-14').getTime() + 1)),
    'overdue',
  );
  assert.equal(getTaskUrgency({ deadline: '2026-10-15' }, now), 'urgent');
  assert.equal(getTaskUrgency({ deadline: '2026-10-15' }, new Date(now.getTime() - 1)), 'upcoming');
  assert.equal(getTaskUrgency({ deadline: '2026-10-15' }, deadlineDate('2026-10-15')), 'urgent');
  assert.equal(getTaskUrgency({ deadline: '2026-10-15' }, new Date(deadlineDate('2026-10-15').getTime() + 1)), 'overdue');
  assert.equal(getTaskUrgency({ deadline: 'invalid' }, now), 'unknown');
  assert.equal(URGENT_WINDOW_MS, 24 * 60 * 60 * 1000);
});

test('formatCountdown handles due, future, overdue, and invalid times', () => {
  const deadline = deadlineDate('2026-10-15');

  assert.equal(formatCountdown('2026-10-15', deadline), 'Due now');
  assert.equal(formatCountdown('2026-10-15', new Date(deadline.getTime() - 1)), 'Due in 1s');
  assert.equal(formatCountdown('2026-10-15', new Date(deadline.getTime() + 1)), 'Overdue by 1s');
  assert.equal(formatCountdown('invalid', deadline), 'Countdown unavailable');
  assert.equal(formatCountdown('2026-10-15', new Date(Number.NaN)), 'Countdown unavailable');
});

test('sortTasksByUrgency orders valid deadlines by urgency and keeps invalid tasks last', () => {
  const now = new Date(2026, 9, 15, 12);
  const tasks = [
    { id: 'upcoming', deadline: '2026-10-20' },
    { id: 'invalid-first', deadline: 'not-a-date' },
    { id: 'urgent-late', deadline: '2026-10-16' },
    { id: 'overdue', deadline: '2026-10-14' },
    { id: 'urgent-early', deadline: '2026-10-15' },
    { id: 'invalid-second', deadline: '2026-02-30' },
  ];

  assert.deepEqual(
    sortTasksByUrgency(tasks, now).map((task) => task.id),
    ['overdue', 'urgent-early', 'urgent-late', 'upcoming', 'invalid-first', 'invalid-second'],
  );
  assert.deepEqual(tasks.map((task) => task.id), [
    'upcoming',
    'invalid-first',
    'urgent-late',
    'overdue',
    'urgent-early',
    'invalid-second',
  ]);
});

test('getUrgentTasks returns only overdue and due-soon tasks in display order', () => {
  const now = new Date(2026, 9, 15, 12);
  const tasks = [
    { id: 'upcoming', deadline: '2026-10-20' },
    { id: 'urgent', deadline: '2026-10-15' },
    { id: 'overdue', deadline: '2026-10-14' },
    { id: 'invalid', deadline: 'invalid' },
  ];

  assert.deepEqual(
    getUrgentTasks(tasks, now).map((task) => task.id),
    ['overdue', 'urgent'],
  );
  assert.deepEqual(tasks.map((task) => task.id), ['upcoming', 'urgent', 'overdue', 'invalid']);
});
