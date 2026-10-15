import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STORAGE_KEY,
  createTask,
  deleteTask,
  loadTasks,
  saveTasks,
  updateTask,
  validateTask,
} from '../src/task-store.js';

function makeStorage(initialValue) {
  let value = initialValue;

  return {
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      return value;
    },
    setItem(key, nextValue) {
      assert.equal(key, STORAGE_KEY);
      value = nextValue;
    },
    read() {
      return value;
    },
  };
}

test('validateTask reports required fields and malformed project links', () => {
  assert.deepEqual(validateTask({}), {
    title: 'Add a title for this task.',
    deadline: 'Choose a deadline for this task.',
  });
  assert.deepEqual(validateTask({
    title: 'Plan the release',
    deadline: '2026-10-15',
    projectLink: 'not-a-url',
  }), {
    projectLink: 'Use a complete project link, including https://.',
  });
  assert.deepEqual(validateTask({
    title: 'Plan the release',
    deadline: '2026-10-15',
    projectLink: 'https://example.test/release',
  }), {});
});

test('createTask trims fields and preserves a supplied id', () => {
  assert.deepEqual(createTask({
    title: '  Plan the release  ',
    deadline: ' 2026-10-15 ',
    projectLink: ' https://example.test/release ',
    notes: '  Confirm the checklist.  ',
  }, 'task-1'), {
    id: 'task-1',
    title: 'Plan the release',
    deadline: '2026-10-15',
    projectLink: 'https://example.test/release',
    notes: 'Confirm the checklist.',
  });
});

test('createTask rejects a calendar-invalid deadline', () => {
  assert.throws(
    () => createTask({ title: 'Plan the release', deadline: '2026-02-30' }),
    /Use a valid deadline date\./,
  );
});

test('updateTask replaces only the matching task without mutating the input', () => {
  const tasks = [
    createTask({ title: 'First task', deadline: '2026-10-15' }, 'task-1'),
    createTask({ title: 'Second task', deadline: '2026-10-16' }, 'task-2'),
  ];

  const updatedTasks = updateTask(tasks, 'task-2', {
    title: '  Updated task ',
    deadline: '2026-10-17',
  });

  assert.deepEqual(updatedTasks, [
    tasks[0],
    {
      id: 'task-2',
      title: 'Updated task',
      deadline: '2026-10-17',
      projectLink: '',
      notes: '',
    },
  ]);
  assert.equal(tasks[1].title, 'Second task');
  assert.equal(updateTask(tasks, 'missing-task', { title: 'Ignored', deadline: '2026-10-18' }), tasks);
});

test('deleteTask removes the matching task and leaves the source array unchanged', () => {
  const tasks = [
    createTask({ title: 'First task', deadline: '2026-10-15' }, 'task-1'),
    createTask({ title: 'Second task', deadline: '2026-10-16' }, 'task-2'),
  ];

  assert.deepEqual(deleteTask(tasks, 'task-1'), [tasks[1]]);
  assert.equal(tasks.length, 2);
  assert.deepEqual(deleteTask(tasks, 'missing-task'), tasks);
});

test('loadTasks keeps valid records, skips invalid records, and tolerates bad storage data', () => {
  const storage = makeStorage(JSON.stringify([
    {
      id: 'task-1',
      title: '  Keep this task ',
      deadline: '2026-10-15',
      projectLink: '',
      notes: '',
    },
    { id: 'task-2', title: 'Missing deadline' },
    { id: 'task-3', title: 'Impossible date', deadline: '2026-02-30' },
  ]));

  assert.deepEqual(loadTasks(storage), [{
    id: 'task-1',
    title: 'Keep this task',
    deadline: '2026-10-15',
    projectLink: '',
    notes: '',
  }]);
  assert.deepEqual(loadTasks(makeStorage('not json')), []);
  assert.deepEqual(loadTasks(makeStorage(JSON.stringify({ task: 'not an array' }))), []);
  assert.deepEqual(loadTasks(undefined), []);
});

test('saveTasks writes the task list under the shared storage key', () => {
  const storage = makeStorage(null);
  const tasks = [createTask({ title: 'Ship it', deadline: '2026-10-15' }, 'task-1')];

  saveTasks(storage, tasks);

  assert.deepEqual(JSON.parse(storage.read()), tasks);
});
