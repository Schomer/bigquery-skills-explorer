/**
 * BQ Skill Explorer — Hash-based SPA Router
 * Lightweight client-side routing with parameter extraction.
 */

export class Router {
  constructor() {
    /** @type {Array<{pattern: RegExp, paramNames: string[], handler: Function}>} */
    this.routes = [];
    this.currentHandler = null;
    this.currentCleanup = null;

    window.addEventListener('hashchange', () => this.resolve());
  }

  /**
   * Register a route pattern.
   * @param {string} path - Route pattern (e.g., '/skill/:id')
   * @param {Function} handler - Called with (params, query) when matched
   */
  on(path, handler) {
    const paramNames = [];
    const pattern = path
      .replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    this.routes.push({
      pattern: new RegExp(`^${pattern}$`),
      paramNames,
      handler,
    });

    return this;
  }

  /**
   * Navigate to a route.
   * @param {string} path - Route path (e.g., '/skill/investigate_slow_query')
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Resolve the current hash to a route handler.
   */
  resolve() {
    const hash = window.location.hash.slice(1) || '/explorer';
    const [pathname, queryString] = hash.split('?');

    // Parse query parameters
    const query = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        query[key] = value;
      });
    }

    // Match against registered routes
    for (const route of this.routes) {
      const match = pathname.match(route.pattern);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        // Cleanup previous view
        if (this.currentCleanup) {
          this.currentCleanup();
          this.currentCleanup = null;
        }

        this.currentCleanup = route.handler(params, query);
        return;
      }
    }

    // Default: redirect to explorer
    this.navigate('/explorer');
  }

  /**
   * Start the router (resolve current hash).
   */
  start() {
    this.resolve();
  }
}
