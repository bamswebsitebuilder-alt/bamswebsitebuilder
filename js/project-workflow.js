export const STAGES = ['Planning', 'Design', 'Development', 'Review', 'Launch', 'Maintenance'];

const TEMPLATE = [
  ['scope', 'Planning', 'Confirm goals, pages, and features'],
  ['quote', 'Planning', 'Client accepts the written quote'],
  ['materials', 'Planning', 'Receive client text, logo, and images'],
  ['design', 'Design', 'Prepare the website design'],
  ['design-approval', 'Design', 'Client approves the design'],
  ['build', 'Development', 'Build the agreed pages and features'],
  ['testing', 'Development', 'Test mobile layout, links, and forms'],
  ['review', 'Review', 'Client reviews the website'],
  ['revisions', 'Review', 'Complete agreed revisions'],
  ['launch-approval', 'Launch', 'Client approves the launch'],
  ['launch', 'Launch', 'Publish and verify the live website']
];

export const createTasks = () => TEMPLATE.map(([id, stage, title]) => ({ id, stage, title, done: false }));

// Adopt an existing checklist without guessing which work has been done.
export function adoptTasks(project = {}) {
  if (Array.isArray(project.workflowTasks) && project.workflowTasks.length) {
    return project.workflowTasks.map(task => ({ ...task, done: task.done === true, stage: STAGES.includes(task.stage) ? task.stage : 'Planning' }));
  }
  const completed = Array.isArray(project.completedTasks) ? project.completedTasks : [];
  const upcoming = Array.isArray(project.upcomingTasks) ? project.upcomingTasks : [];
  if (!completed.length && !upcoming.length) return createTasks();
  const stage = STAGES.includes(project.stage) ? project.stage : 'Planning';
  return [...completed.map(title => ({ title, done: true })), ...upcoming.map(title => ({ title, done: false }))]
    .map((task, index) => ({ ...task, id: `existing-${index}`, stage }));
}

export function summarizeTasks(tasks, previousStatus = '', liveUrl = '') {
  const valid = tasks.filter(task => typeof task.title === 'string' && task.title.trim());
  if (!valid.length) throw new Error('Add at least one task before enabling automation.');
  const completed = valid.filter(task => task.done);
  const upcoming = valid.filter(task => !task.done);
  const complete = !upcoming.length;
  const stage = STAGES.find(value => upcoming.some(task => task.stage === value)) || 'Launch';
  const paused = ['On Hold', 'Waiting on Client'].includes(previousStatus);
  // A completed checklist is ready for launch; a live link is also required to finish.
  const launched = complete && /^https?:\/\//i.test(liveUrl);
  return {
    progress: complete ? 100 : Math.min(99, Math.round(completed.length / valid.length * 100)),
    stage: launched ? 'Maintenance' : stage,
    status: paused ? previousStatus : launched ? 'Completed' : completed.length ? 'In Progress' : 'Not Started',
    completedTasks: completed.map(task => task.title.trim()),
    upcomingTasks: upcoming.map(task => task.title.trim())
  };
}

export function projectAlerts(project, now = new Date()) {
  if (project.status === 'Completed') return [];
  const alerts = [];
  if (project.status === 'Waiting on Client') alerts.push('Waiting on client materials or approval.');
  const value = project.estimatedCompletion;
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  if (date && Number.isFinite(date.getTime())) {
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const days = (end - now) / 86400000;
    if (days < 0) alerts.push('Overdue — review the deadline and next task.');
    else if (days <= 3) alerts.push('Due within 3 days.');
  }
  return alerts;
}

export function onboardingProject() {
  const workflowTasks = createTasks();
  return {
    title: 'Website Project — Onboarding', automationEnabled: true, workflowTasks,
    ...summarizeTasks(workflowTasks),
    currentUpdate: 'Your project is in planning. We will confirm the scope, written quote, and required materials before work begins.'
  };
}
