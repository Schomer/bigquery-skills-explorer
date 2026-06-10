/**
 * BQ Skill Explorer — Main Entry Point
 * Initializes the app, loads data, and wires up routing.
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

// Data
import skillsData from './data/skills.json';

// ─── Bootstrap ──────────────────────────────────────────────────

const router = new Router();
const searchEngine = new SearchEngine();

// Build search index
searchEngine.buildIndex(skillsData.skills);

// Mount app shell
const appEl = document.getElementById('app');
const app = new App(appEl, {
  router,
  data: skillsData,
  searchEngine,
});

const viewContainer = app.getViewContainer();

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
      skills: skillsData.skills,
      router,
    });
  })
  .on('/skill/:id', (params) => {
    const skill = skillsData.skills.find(s => s.id === params.id);
    return mountView(SkillDetailView, {
      skill,
      skills: skillsData.skills,
      metaSkillRouters: skillsData.meta_skill_routers,
      router,
    });
  })
  .on('/graph', () => {
    return mountView(GraphView, {
      skills: skillsData.skills,
      metaSkillRouters: skillsData.meta_skill_routers,
      router,
    });
  })
  .on('/mapper', (_params, query) => {
    return mountView(MapperView, {
      skills: skillsData.skills,
      router,
      initialQuery: query.q || '',
    });
  })
  .on('/dashboard', () => {
    return mountView(DashboardView, {
      skills: skillsData.skills,
      metaSkillRouters: skillsData.meta_skill_routers,
      router,
    });
  });

// Start
router.start();
