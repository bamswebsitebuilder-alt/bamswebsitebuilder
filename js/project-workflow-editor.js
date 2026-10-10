import { STAGES, adoptTasks, summarizeTasks } from './project-workflow.js?v=1';

export function createWorkflowEditor(form) {
  if (!form) return null;
  const es = document.documentElement.lang.startsWith('es');
  const text = (en, spanish) => es ? spanish : en;
  const panel = document.createElement('fieldset');
  panel.className = 'workflow-editor';
  const legend = document.createElement('legend');
  legend.textContent = text('Project automation', 'Automatización del proyecto');
  const label = document.createElement('label');
  const enabled = document.createElement('input');
  enabled.type = 'checkbox'; enabled.id = 'project-automation';
  label.append(enabled, document.createTextNode(text(' Calculate progress and stages from tasks', ' Calcular progreso y etapas según las tareas')));
  const hint = document.createElement('p');
  hint.textContent = text('Check off completed work, then Save Project. Dates and pricing remain yours to set. A live website link is required to finish.', 'Marca el trabajo terminado y guarda el proyecto. Tú defines fechas y precios. Se requiere un enlace al sitio publicado para finalizar.');
  const list = document.createElement('div');
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'admin-small-button';
  add.textContent = text('Add task', 'Agregar tarea');
  const summary = document.createElement('p'); summary.setAttribute('aria-live', 'polite');
  panel.append(legend, label, hint, list, add, summary);
  panel.classList.add('admin-field-full');
  document.getElementById('project-stage').closest('.admin-field').before(panel);
  let tasks = [];
  const controls = ['project-progress', 'project-stage', 'project-completed', 'project-upcoming'].map(id => document.getElementById(id));

  function sync() {
    list.hidden = add.hidden = !enabled.checked;
    controls.forEach(control => { if (control) control.disabled = enabled.checked; });
    ['project-completed', 'project-upcoming'].forEach(id => { document.getElementById(id).closest('.admin-field').hidden = enabled.checked; });
    if (!enabled.checked) { summary.textContent = ''; return; }
    try {
      const result = summarizeTasks(tasks, document.getElementById('project-status').value, document.getElementById('project-live-url').value.trim());
      document.getElementById('project-progress').value = result.progress;
      document.getElementById('project-progress-value').textContent = `${result.progress}%`;
      document.getElementById('project-stage').value = result.stage;
      document.getElementById('project-status').value = result.status;
      document.getElementById('project-completed').value = result.completedTasks.join('\n');
      document.getElementById('project-upcoming').value = result.upcomingTasks.join('\n');
      summary.textContent = `${result.progress}% • ${result.stage} • ${result.status}`;
    } catch (error) { summary.textContent = text(error.message, 'Agrega al menos una tarea para activar la automatización.'); }
  }

  function render() {
    list.replaceChildren();
    tasks.forEach(task => {
      const row = document.createElement('div'); row.className = 'workflow-task';
      const done = document.createElement('input'); done.type = 'checkbox'; done.checked = task.done;
      done.setAttribute('aria-label', text(`Completed: ${task.title}`, `Completada: ${task.title}`));
      const title = document.createElement('input'); title.type = 'text'; title.value = task.title;
      title.setAttribute('aria-label', text('Task name', 'Nombre de tarea'));
      const stage = document.createElement('select'); stage.setAttribute('aria-label', text('Task stage', 'Etapa de tarea'));
      STAGES.forEach(value => { const option = document.createElement('option'); option.value = option.textContent = value; stage.append(option); });
      stage.value = task.stage;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'admin-small-button';
      remove.textContent = text('Remove', 'Eliminar'); remove.setAttribute('aria-label', text(`Remove: ${task.title}`, `Eliminar: ${task.title}`));
      done.addEventListener('change', () => { task.done = done.checked; sync(); });
      title.addEventListener('input', () => { task.title = title.value; done.setAttribute('aria-label', text(`Completed: ${task.title}`, `Completada: ${task.title}`)); sync(); });
      stage.addEventListener('change', () => { task.stage = stage.value; sync(); });
      remove.addEventListener('click', () => { tasks = tasks.filter(value => value !== task); render(); });
      row.append(done, title, stage, remove); list.append(row);
    });
    sync();
  }
  enabled.addEventListener('change', () => {
    const completedTasks = document.getElementById('project-completed').value.split('\n').map(value => value.trim()).filter(Boolean);
    const upcomingTasks = document.getElementById('project-upcoming').value.split('\n').map(value => value.trim()).filter(Boolean);
    const unchanged = JSON.stringify(completedTasks) === JSON.stringify(tasks.filter(task => task.done).map(task => task.title.trim())) &&
      JSON.stringify(upcomingTasks) === JSON.stringify(tasks.filter(task => !task.done).map(task => task.title.trim()));
    if (enabled.checked && (!tasks.length || !unchanged)) {
      tasks = adoptTasks({ stage: document.getElementById('project-stage').value,
        completedTasks, upcomingTasks });
    }
    render();
  });
  add.addEventListener('click', () => { tasks.push({ id: crypto.randomUUID(), title: '', stage: 'Planning', done: false }); render(); list.lastElementChild.querySelector('input[type=text]').focus(); });
  ['project-status', 'project-live-url'].forEach(id => document.getElementById(id)?.addEventListener('input', sync));
  return {
    load(project = {}) { tasks = project.automationEnabled ? adoptTasks(project) : []; enabled.checked = project.automationEnabled === true; render(); },
    data(status, liveUrl) {
      if (!enabled.checked) return { automationEnabled: false };
      if (tasks.some(task => !task.title.trim())) throw new Error(text('Give every task a name or remove the empty task.', 'Nombra cada tarea o elimina la tarea vacía.'));
      const workflowTasks = tasks.map(task => ({ ...task, title: task.title.trim() }));
      return { automationEnabled: true, workflowTasks, ...summarizeTasks(workflowTasks, status, liveUrl) };
    }
  };
}
