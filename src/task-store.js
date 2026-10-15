import { getDeadlineTimestamp } from './task-utils.js';

export const STORAGE_KEY = 'dropdesk.tasks';

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateTask(input = {}) {
  const errors = {};
  const title = clean(input.title);
  const deadline = clean(input.deadline);
  const projectLink = clean(input.projectLink);

  if (!title) {
    errors.title = 'Add a title for this task.';
  }

  if (!deadline) {
    errors.deadline = 'Choose a deadline for this task.';
  } else if (!Number.isFinite(getDeadlineTimestamp(deadline))) {
    errors.deadline = 'Use a valid deadline date.';
  }

  if (projectLink) {
    try {
      new URL(projectLink);
    } catch {
      errors.projectLink = 'Use a complete project link, including https://.';
    }
  }

  return errors;
}

export function createTask(input = {}, id = makeId()) {
  const task = {
    id,
    title: clean(input.title),
    deadline: clean(input.deadline),
    projectLink: clean(input.projectLink),
    notes: clean(input.notes),
  };
  const errors = validateTask(task);

  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  return task;
}

export function updateTask(tasks, taskId, input) {
  if (!tasks.some((task) => task.id === taskId)) {
    return tasks;
  }

  return tasks.map((task) =>
    task.id === taskId ? createTask(input, taskId) : task,
  );
}

export function deleteTask(tasks, taskId) {
  return tasks.filter((task) => task.id !== taskId);
}

export function loadTasks(storage) {
  try {
    const savedTasks = storage?.getItem(STORAGE_KEY);
    if (!savedTasks) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks
      .map((task) => {
        try {
          return createTask(task, task.id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveTasks(storage, tasks) {
  storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
