import {
  createTask,
  deleteTask,
  loadTasks,
  saveTasks,
  updateTask,
} from './task-store.js';
import {
  formatCountdown,
  formatDailyDigest,
  getDeadlineTimestamp,
  getTaskUrgency,
  sortTasksByUrgency,
} from './task-utils.js';

const COUNTDOWN_REFRESH_MS = 30_000;
const urgencyLabels = {
  overdue: 'Overdue',
  urgent: 'Due soon',
  upcoming: 'Upcoming',
  unknown: 'Deadline unavailable',
};

const dashboard = document.querySelector('.dashboard-card');

if (dashboard) {
  const taskForm = document.querySelector('#task-form');
  const taskEditor = document.querySelector('#task-editor');
  const taskList = document.querySelector('#task-list');
  const emptyState = document.querySelector('#empty-state');
  const formTitle = document.querySelector('#form-title');
  const formMessage = document.querySelector('#form-message');
  const saveTaskButton = document.querySelector('#save-task-button');
  const storageMessage = document.querySelector('#storage-message');
  const taskCount = document.querySelector('#task-count');
  const copyDigestButton = document.querySelector('#copy-digest-button');
  const digestStatus = document.querySelector('#digest-status');
  const digestPreview = document.querySelector('#digest-preview');
  const titleInput = document.querySelector('#task-title');
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    setStorageMessage('Browser storage is unavailable. Tasks can be viewed for this session, but changes cannot be saved.');
  }

  let tasks = loadTasks(storage);
  let editingTaskId = null;
  let renderedTaskOrder = [];

  function setStorageMessage(message = '') {
    storageMessage.textContent = message;
    storageMessage.hidden = !message;
  }

  function setDigestStatus(message = '') {
    digestStatus.textContent = message;
    digestStatus.hidden = !message;
  }

  function clearDigestOutput() {
    setDigestStatus();
    digestPreview.textContent = '';
    digestPreview.hidden = true;
  }

  function persistTasks(nextTasks) {
    try {
      saveTasks(storage, nextTasks);
      setStorageMessage();
      return true;
    } catch {
      setStorageMessage('This task could not be saved. Check your browser storage and try again.');
      return false;
    }
  }

  function formatDeadline(deadline) {
    const deadlineTimestamp = getDeadlineTimestamp(deadline);
    if (!Number.isFinite(deadlineTimestamp)) {
      return 'Unknown date';
    }

    return new Date(deadlineTimestamp).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function createDetail(label, value) {
    const detail = document.createElement('div');
    const detailLabel = document.createElement('dt');
    const detailValue = document.createElement('dd');
    detailLabel.textContent = label;
    detailValue.append(value);
    detail.append(detailLabel, detailValue);
    return detail;
  }

  function createTaskAction(label, action, task) {
    const button = document.createElement('button');
    button.className = action === 'delete' ? 'button button-danger' : 'button button-quiet';
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.taskId = task.id;
    button.setAttribute('aria-label', `${label} ${task.title}`);
    button.textContent = label;
    return button;
  }

  function updateTaskCard(card, task, now) {
    const urgency = getTaskUrgency(task, now);
    const countdown = card.querySelector('[data-role="countdown"]');
    const urgencyLabel = card.querySelector('[data-role="urgency"]');
    const countdownText = formatCountdown(task.deadline, now);

    card.dataset.urgency = urgency;
    urgencyLabel.textContent = urgencyLabels[urgency];
    countdown.textContent = countdownText;
    countdown.setAttribute('aria-label', `${countdownText} for ${task.title}`);
  }

  function renderTask(task, now) {
    const card = document.createElement('article');
    card.className = 'task-card';
    card.dataset.taskId = task.id;

    const cardHeader = document.createElement('div');
    cardHeader.className = 'task-card-header';

    const heading = document.createElement('div');
    const taskTitle = document.createElement('h3');
    const deadline = document.createElement('p');
    taskTitle.textContent = task.title;
    taskTitle.id = `task-title-${task.id}`;
    deadline.className = 'task-deadline';
    deadline.append(`Due ${formatDeadline(task.deadline)} · `);
    const countdown = document.createElement('span');
    countdown.dataset.role = 'countdown';
    deadline.append(countdown);
    heading.append(taskTitle, deadline);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(createTaskAction('Edit', 'edit', task), createTaskAction('Delete', 'delete', task));
    cardHeader.append(heading, actions);

    const urgencyLabel = document.createElement('span');
    urgencyLabel.className = 'urgency-label';
    urgencyLabel.dataset.role = 'urgency';

    const details = document.createElement('dl');
    details.className = 'task-details';

    const projectValue = document.createElement('span');
    if (task.projectLink) {
      const projectLink = document.createElement('a');
      projectLink.href = task.projectLink;
      projectLink.target = '_blank';
      projectLink.rel = 'noreferrer';
      projectLink.textContent = task.projectLink;
      projectValue.append(projectLink);
    } else {
      projectValue.className = 'muted-value';
      projectValue.textContent = 'No project link';
    }

    const notesValue = document.createElement('span');
    notesValue.className = task.notes ? '' : 'muted-value';
    notesValue.textContent = task.notes || 'No notes';
    details.append(
      createDetail('Project', projectValue),
      createDetail('Notes', notesValue),
    );

    card.setAttribute('aria-labelledby', taskTitle.id);
    card.append(cardHeader, urgencyLabel, details);
    updateTaskCard(card, task, now);
    return card;
  }

  function render(now = new Date(), { resetDigest = false } = {}) {
    const orderedTasks = sortTasksByUrgency(tasks, now);
    renderedTaskOrder = orderedTasks.map((task) => task.id);
    taskList.replaceChildren(...orderedTasks.map((task) => renderTask(task, now)));
    emptyState.hidden = tasks.length > 0;
    taskList.hidden = tasks.length === 0;
    taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;

    if (resetDigest) {
      clearDigestOutput();
    }
  }

  function refreshLiveDashboard() {
    const now = new Date();
    const orderedTasks = sortTasksByUrgency(tasks, now);
    const nextTaskOrder = orderedTasks.map((task) => task.id);

    if (
      nextTaskOrder.length !== renderedTaskOrder.length ||
      nextTaskOrder.some((taskId, index) => taskId !== renderedTaskOrder[index])
    ) {
      render(now);
      return;
    }

    for (const card of taskList.querySelectorAll('.task-card')) {
      const task = tasks.find((item) => item.id === card.dataset.taskId);
      if (task) {
        updateTaskCard(card, task, now);
      }
    }
  }

  function clearFormMessage() {
    formMessage.textContent = '';
    formMessage.hidden = true;
  }

  function openForm(task = null) {
    editingTaskId = task?.id || null;
    formTitle.textContent = task ? 'Edit task' : 'Add a task';
    saveTaskButton.textContent = task ? 'Save changes' : 'Save task';
    taskForm.reset();
    clearFormMessage();

    if (task) {
      titleInput.value = task.title;
      taskForm.elements.deadline.value = task.deadline;
      taskForm.elements.projectLink.value = task.projectLink;
      taskForm.elements.notes.value = task.notes;
    }

    taskEditor.hidden = false;
    taskEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    titleInput.focus();
  }

  function closeForm() {
    editingTaskId = null;
    taskEditor.hidden = true;
    taskForm.reset();
    clearFormMessage();
  }

  function showFormError(message) {
    formMessage.textContent = message;
    formMessage.hidden = false;
  }

  function getFormValues() {
    const formData = new FormData(taskForm);
    return Object.fromEntries(formData.entries());
  }

  function showDigest(digest) {
    digestPreview.textContent = digest;
    digestPreview.hidden = false;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to the legacy copy path when clipboard permissions fail.
      }
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.append(textArea);
    textArea.select();

    let copied = false;
    try {
      copied = typeof document.execCommand === 'function' && document.execCommand('copy');
    } catch {
      copied = false;
    } finally {
      textArea.remove();
    }

    return copied;
  }

  document.querySelector('#new-task-button').addEventListener('click', () => openForm());
  document.querySelector('#empty-new-task-button').addEventListener('click', () => openForm());
  document.querySelector('#cancel-task-button').addEventListener('click', closeForm);

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = getFormValues();
    let nextTasks;

    try {
      nextTasks = editingTaskId
        ? updateTask(tasks, editingTaskId, values)
        : [...tasks, createTask(values)];
    } catch (error) {
      showFormError(error.message);
      return;
    }

    if (!persistTasks(nextTasks)) {
      return;
    }

    tasks = nextTasks;
    closeForm();
    render(new Date(), { resetDigest: true });
  });

  taskList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) {
      return;
    }

    const task = tasks.find((item) => item.id === actionButton.dataset.taskId);
    if (!task) {
      return;
    }

    if (actionButton.dataset.action === 'edit') {
      openForm(task);
      return;
    }

    if (actionButton.dataset.action === 'delete' && window.confirm(`Delete “${task.title}”?`)) {
      const nextTasks = deleteTask(tasks, task.id);
      if (persistTasks(nextTasks)) {
        tasks = nextTasks;
        render(new Date(), { resetDigest: true });
      }
    }
  });

  copyDigestButton.addEventListener('click', async () => {
    const digest = formatDailyDigest(tasks, new Date());
    showDigest(digest);
    setDigestStatus('Preparing your digest…');
    copyDigestButton.disabled = true;

    const copied = await copyText(digest);
    copyDigestButton.disabled = false;
    setDigestStatus(
      copied
        ? 'Digest copied to your clipboard.'
        : 'Digest is ready below. Clipboard access was unavailable, so copy it manually.',
    );
  });

  render();
  window.setInterval(refreshLiveDashboard, COUNTDOWN_REFRESH_MS);
  dashboard.dataset.ready = 'true';
}
