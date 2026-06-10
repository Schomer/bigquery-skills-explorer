/**
 * BQ Skill Explorer — Main Entry Point
 * Initializes the app, loads data, and wires up routing.
 * Supports switching between multiple skill datasets.
 */

// Styles
import './styles/variables.css';
import './styles/reset.css';
import './styles/layout.css';
import './styles/topbar.css';
import './styles/sidenav.css';
import './styles/components.css';
import './styles/explorer.css';
import './styles/detail.css';
import './styles/graph.css';
import './styles/mapper.css';
import './styles/dashboard.css';
import './styles/modal.css';
import './styles/search.css';

// Highlight.js theme
import 'highlight.js/styles/vs2015.css';

// Core modules
import { Router } from './router.js';
import { SearchEngine } from './search.js';
import { App } from './components/App.js';

// Views
import { ExplorerView } from './views/ExplorerView.js';
import { SkillDetailView } from './views/SkillDetailView.js';
import { GraphView } from './views/GraphView.js';
import { MapperView } from './views/MapperView.js';
import { DashboardView } from './views/DashboardView.js';

// Datasets
import bigquerySkillsData from './data/skills.json';
import dataAgentSkillsData from './data/data-agent-skills.json';

// ─── Dataset Registry ───────────────────────────────────────────

const DATASETS = {
  'bigquery': bigquerySkillsData,
  'data-agent': dataAgentSkillsData,
};

let activeSkillset = 'bigquery';
let activeData = DATASETS[activeSkillset];

// ─── Bootstrap ──────────────────────────────────────────────────

const router = new Router();
const searchEngine = new SearchEngine();

// Build search index for initial dataset
searchEngine.buildIndex(activeData.skills);

// Mount app shell
const appEl = document.getElementById('app');
let app = new App(appEl, {
  router,
  data: activeData,
  searchEngine,
  activeSkillset,
  onSkillsetChange: switchSkillset,
});

let viewContainer = app.getViewContainer();

// ─── Dataset Switching ──────────────────────────────────────────

function switchSkillset(skillset) {
  if (skillset === activeSkillset) return;

  activeSkillset = skillset;
  activeData = DATASETS[activeSkillset];

  // Rebuild search index
  searchEngine.buildIndex(activeData.skills);

  // Remount entire app shell with new skillset
  app = new App(appEl, {
    router,
    data: activeData,
    searchEngine,
    activeSkillset,
    onSkillsetChange: switchSkillset,
  });
  viewContainer = app.getViewContainer();

  // Re-resolve current route to re-render with new data
  router.resolve();
}

// ─── Route Handlers ─────────────────────────────────────────────

let currentView = null;

function mountView(ViewClass, deps) {
  if (currentView?.destroy) currentView.destroy();
  viewContainer.innerHTML = '';
  currentView = new ViewClass(viewContainer, deps);
  return () => {
    if (currentView?.destroy) currentView.destroy();
    currentView = null;
  };
}

router
  .on('/explorer', () => {
    return mountView(ExplorerView, {
      skills: activeData.skills,
      router,
    });
  })
  .on('/skill/:id', (params) => {
    const skill = activeData.skills.find(s => s.id === params.id);
    return mountView(SkillDetailView, {
      skill,
      skills: activeData.skills,
      metaSkillRouters: activeData.meta_skill_routers,
      router,
    });
  })
  .on('/graph', () => {
    return mountView(GraphView, {
      skills: activeData.skills,
      metaSkillRouters: activeData.meta_skill_routers,
      router,
    });
  })
  .on('/mapper', (_params, query) => {
    return mountView(MapperView, {
      skills: activeData.skills,
      router,
      initialQuery: query.q || '',
    });
  })
  .on('/dashboard', () => {
    return mountView(DashboardView, {
      skills: activeData.skills,
      metaSkillRouters: activeData.meta_skill_routers,
      router,
    });
  });

// Start
router.start();
