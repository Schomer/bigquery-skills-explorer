/**
 * BQ Skill Explorer — Graph View (Force-Directed SVG Network)
 */

export class GraphView {
  /**
   * @param {HTMLElement} container
   * @param {{ skills: Array, metaSkillRouters: Array, router: import('../router.js').Router }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skills = deps.skills;
    this.metaSkillRouters = deps.metaSkillRouters;
    this.router = deps.router;

    // Physics state
    this.nodes = [];
    this.edges = [];
    this.animId = null;
    this.isDragging = false;
    this.dragNode = null;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.viewBox = { x: -400, y: -300, w: 800, h: 600 };
    this.scale = 1;
    this.settled = false;
    this.iterations = 0;

    this.buildGraph();
    this.render();
    this.startSimulation();
  }

  buildGraph() {
    const routerIds = new Set(this.metaSkillRouters.map(r => r.id));
    const skillIds = new Set(this.skills.map(s => s.id));

    // Create orchestrator nodes
    for (const router of this.metaSkillRouters) {
      this.nodes.push({
        id: router.id,
        name: router.name,
        description: router.description,
        type: 'orchestrator',
        radius: 28,
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      });
    }

    // Create skill nodes
    const addedSkills = new Set();
    for (const router of this.metaSkillRouters) {
      for (const subId of router.sub_skills) {
        if (addedSkills.has(subId)) {
          // Still create edge even if node already exists
          this.edges.push({ source: router.id, target: subId });
          continue;
        }

        const skill = this.skills.find(s => s.id === subId);
        if (!skill) continue;

        this.nodes.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          type: 'skill',
          tier: skill.tier,
          radius: 18,
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 300,
          vx: 0,
          vy: 0,
          fx: null,
          fy: null,
        });
        addedSkills.add(subId);

        this.edges.push({ source: router.id, target: subId });
      }
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="graph-view view-enter">
        <svg class="graph-view__svg" id="graph-svg">
          <defs>
            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/>
            </filter>
          </defs>
          <g id="graph-layer"></g>
        </svg>
        <div class="graph-tooltip" id="graph-tooltip">
          <div class="graph-tooltip__name"></div>
          <div class="graph-tooltip__desc"></div>
          <div class="graph-tooltip__type"></div>
        </div>
        <div class="graph-legend">
          <div class="graph-legend__title">Legend</div>
          <div class="graph-legend__item">
            <div class="graph-legend__dot graph-legend__dot--orchestrator"></div>
            Orchestrator
          </div>
          <div class="graph-legend__item">
            <div class="graph-legend__dot graph-legend__dot--skill"></div>
            Skill
          </div>
        </div>
        <div class="graph-controls">
          <button class="graph-controls__btn" id="graph-zoom-in" title="Zoom in" aria-label="Zoom in">
            <span class="material-symbols-outlined">add</span>
          </button>
          <button class="graph-controls__btn" id="graph-zoom-out" title="Zoom out" aria-label="Zoom out">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <button class="graph-controls__btn" id="graph-reset" title="Reset view" aria-label="Reset view">
            <span class="material-symbols-outlined">fit_screen</span>
          </button>
        </div>
      </div>
    `;

    this.svg = this.container.querySelector('#graph-svg');
    this.graphLayer = this.container.querySelector('#graph-layer');
    this.tooltip = this.container.querySelector('#graph-tooltip');

    this.updateViewBox();
    this.bindEvents();
  }

  startSimulation() {
    const tick = () => {
      if (this.settled) {
        this.renderGraph();
        return;
      }

      this.simulate();
      this.renderGraph();
      this.iterations++;

      if (this.iterations > 300) {
        this.settled = true;
      }

      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  simulate() {
    const alpha = Math.max(0.01, 1 - this.iterations / 300);
    const repulsion = 8000;
    const springLength = 120;
    const springStrength = 0.03;
    const gravity = 0.02;
    const damping = 0.85;

    // Reset forces
    for (const node of this.nodes) {
      if (node.fx !== null) continue;
      node.vx = 0;
      node.vy = 0;
    }

    // Node repulsion (Coulomb)
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force * alpha;
        const fy = (dy / dist) * force * alpha;

        if (a.fx === null) { a.vx -= fx; a.vy -= fy; }
        if (b.fx === null) { b.vx += fx; b.vy += fy; }
      }
    }

    // Edge springs (Hooke)
    for (const edge of this.edges) {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - springLength;
      const force = springStrength * displacement * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (source.fx === null) { source.vx += fx; source.vy += fy; }
      if (target.fx === null) { target.vx -= fx; target.vy -= fy; }
    }

    // Center gravity
    for (const node of this.nodes) {
      if (node.fx !== null) continue;
      node.vx -= node.x * gravity * alpha;
      node.vy -= node.y * gravity * alpha;
    }

    // Apply velocities
    for (const node of this.nodes) {
      if (node.fx !== null) {
        node.x = node.fx;
        node.y = node.fy;
        continue;
      }
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  renderGraph() {
    let svg = '';

    // Edges
    for (const edge of this.edges) {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;

      // Curved path
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const offset = Math.min(30, Math.sqrt(dx*dx + dy*dy) * 0.15);
      const cx = mx - dy * 0.1;
      const cy = my + dx * 0.1;

      svg += `<path class="graph-edge graph-edge--animated"
                    d="M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}" />`;
    }

    // Nodes
    for (const node of this.nodes) {
      const isOrch = node.type === 'orchestrator';
      svg += `
        <g class="graph-node" data-id="${node.id}" transform="translate(${node.x}, ${node.y})">
          <circle r="${node.radius}"
                  class="graph-node__circle--${isOrch ? 'orchestrator' : 'skill'}"
                  filter="url(#node-shadow)" />
          <text class="graph-node__label" y="${node.radius + 16}">${this.truncate(node.name, 18)}</text>
          ${isOrch ? `<text text-anchor="middle" dy="5" fill="white" font-size="16" font-family="Material Symbols Outlined" style="font-variation-settings: 'FILL' 1;">hub</text>` : ''}
          ${!isOrch ? `<text text-anchor="middle" dy="5" fill="white" font-size="14" font-family="Material Symbols Outlined" style="font-variation-settings: 'FILL' 1;">build</text>` : ''}
        </g>
      `;
    }

    this.graphLayer.innerHTML = svg;
  }

  bindEvents() {
    const svg = this.svg;

    // Node hover / click / drag
    svg.addEventListener('mousedown', (e) => {
      const nodeEl = e.target.closest('.graph-node');
      if (nodeEl) {
        const node = this.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node) {
          this.isDragging = true;
          this.dragNode = node;
          node.fx = node.x;
          node.fy = node.y;
          this.settled = false;
          this.iterations = Math.max(this.iterations, 250); // Brief re-settle
          this.startSimulation();
        }
      } else {
        // Pan
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
      }
    });

    svg.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.dragNode) {
        const rect = svg.getBoundingClientRect();
        const scaleX = this.viewBox.w / rect.width;
        const scaleY = this.viewBox.h / rect.height;
        this.dragNode.fx = this.viewBox.x + (e.clientX - rect.left) * scaleX;
        this.dragNode.fy = this.viewBox.y + (e.clientY - rect.top) * scaleY;
        this.dragNode.x = this.dragNode.fx;
        this.dragNode.y = this.dragNode.fy;
        this.renderGraph();
      } else if (this.isPanning) {
        const rect = svg.getBoundingClientRect();
        const scaleX = this.viewBox.w / rect.width;
        const scaleY = this.viewBox.h / rect.height;
        const dx = (e.clientX - this.panStart.x) * scaleX;
        const dy = (e.clientY - this.panStart.y) * scaleY;
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.updateViewBox();
      }

      // Tooltip
      const nodeEl = e.target.closest('.graph-node');
      if (nodeEl && !this.isDragging) {
        const node = this.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node) {
          this.showTooltip(node, e);
        }
      } else if (!this.isDragging) {
        this.hideTooltip();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging && this.dragNode) {
        this.dragNode.fx = null;
        this.dragNode.fy = null;
        this.dragNode = null;
      }
      this.isDragging = false;
      this.isPanning = false;
    });

    // Click to navigate
    svg.addEventListener('click', (e) => {
      if (this.isDragging) return;
      const nodeEl = e.target.closest('.graph-node');
      if (nodeEl) {
        const node = this.nodes.find(n => n.id === nodeEl.dataset.id);
        if (node && node.type === 'skill') {
          this.router.navigate(`/skill/${node.id}`);
        }
      }
    });

    // Zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this.zoom(factor);
    }, { passive: false });

    // Controls
    this.container.querySelector('#graph-zoom-in')?.addEventListener('click', () => this.zoom(0.8));
    this.container.querySelector('#graph-zoom-out')?.addEventListener('click', () => this.zoom(1.2));
    this.container.querySelector('#graph-reset')?.addEventListener('click', () => {
      this.viewBox = { x: -400, y: -300, w: 800, h: 600 };
      this.updateViewBox();
    });
  }

  zoom(factor) {
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w *= factor;
    this.viewBox.h *= factor;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
    this.updateViewBox();
  }

  updateViewBox() {
    this.svg?.setAttribute('viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`
    );
  }

  showTooltip(node, e) {
    const tt = this.tooltip;
    tt.querySelector('.graph-tooltip__name').textContent = node.name;
    tt.querySelector('.graph-tooltip__desc').textContent = node.description || '';
    tt.querySelector('.graph-tooltip__type').innerHTML = node.type === 'orchestrator'
      ? '<span class="chip chip--blue">Orchestrator</span>'
      : `<span class="tier-badge tier-badge--${node.tier}">Tier ${node.tier}</span>`;

    const containerRect = this.container.querySelector('.graph-view').getBoundingClientRect();
    tt.style.left = `${e.clientX - containerRect.left + 16}px`;
    tt.style.top = `${e.clientY - containerRect.top + 16}px`;
    tt.classList.add('graph-tooltip--visible');
  }

  hideTooltip() {
    this.tooltip?.classList.remove('graph-tooltip--visible');
  }

  truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.container.innerHTML = '';
  }
}
