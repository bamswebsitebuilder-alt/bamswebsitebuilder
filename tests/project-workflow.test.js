import test from 'node:test';
import assert from 'node:assert/strict';
import { createTasks, adoptTasks, summarizeTasks, onboardingProject, projectAlerts } from '../js/project-workflow.js';

test('a project moves through required stages and waits for the actual live link', () => {
  const tasks = createTasks();
  assert.equal(summarizeTasks(tasks).status, 'Not Started');
  tasks.filter(task => task.stage === 'Planning').forEach(task => task.done = true);
  assert.equal(summarizeTasks(tasks).stage, 'Design');
  tasks.filter(task => task.stage === 'Design').forEach(task => task.done = true);
  assert.equal(summarizeTasks(tasks).stage, 'Development');
  tasks.forEach(task => task.done = true);
  assert.equal(summarizeTasks(tasks).status, 'In Progress');
  assert.equal(summarizeTasks(tasks, '', 'https://example.com').status, 'Completed');
  tasks[1].done = false;
  assert.equal(summarizeTasks(tasks, '', 'https://example.com').stage, 'Planning');
  assert.notEqual(summarizeTasks(tasks, '', 'https://example.com').status, 'Completed');
});

test('paused projects retain their status as work is completed', () => {
  const tasks = createTasks(); tasks[0].done = true;
  for (const status of ['On Hold', 'Waiting on Client']) assert.equal(summarizeTasks(tasks, status).status, status);
});

test('adopting a legacy project preserves client task lists and does not mutate the source', () => {
  const project = { stage: 'Review', completedTasks: ['Build'], upcomingTasks: ['Approve'] };
  const tasks = adoptTasks(project);
  assert.deepEqual(summarizeTasks(tasks).completedTasks, ['Build']);
  assert.deepEqual(summarizeTasks(tasks).upcomingTasks, ['Approve']);
  assert.equal(summarizeTasks(tasks).progress, 50);
  assert.equal(summarizeTasks(tasks).stage, 'Review');
  const original = { workflowTasks: tasks };
  adoptTasks(original)[0].done = false;
  assert.equal(original.workflowTasks[0].done, true);
});

test('onboarding has no invented dates or prices and independent checklists', () => {
  const first = onboardingProject(); const second = onboardingProject();
  first.workflowTasks[0].done = true;
  assert.equal(second.workflowTasks[0].done, false);
  assert.equal(second.progress, 0);
  assert.equal(second.status, 'Not Started');
  assert.equal(second.startDate, undefined);
  assert.equal(second.amount, undefined);
});

test('alerts use the end of the due date and exclude completed projects', () => {
  const due = new Date(2026, 9, 10, 12);
  const project = { estimatedCompletion: { toDate: () => due }, status: 'In Progress' };
  assert.equal(projectAlerts(project, new Date(2026, 9, 10, 20))[0], 'Due within 3 days.');
  assert.match(projectAlerts(project, new Date(2026, 9, 11, 0))[0], /Overdue/);
  assert.deepEqual(projectAlerts({ ...project, status: 'Completed' }, new Date(2026, 9, 11)), []);
  assert.deepEqual(projectAlerts({ estimatedCompletion: null }), []);
  assert.match(projectAlerts({ status: 'Waiting on Client' })[0], /Waiting/);
});

test('empty checklists cannot silently complete projects', () => {
  assert.throws(() => summarizeTasks([]), /at least one task/);
});
