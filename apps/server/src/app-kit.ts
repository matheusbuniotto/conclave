import { FastifyInstance } from "fastify";
import { db, workspaceApps, appVersions, appRecords } from "@conclave/db";
import { eq, and, asc } from "drizzle-orm";
import Redis from "ioredis";

export const CONCLAVE_THEME_CSS = `:root {
  --bg: #ffffff;
  --bg-elevated: #faf9fc;
  --bg-subtle: #f4f2f7;
  --fg: #18181b;
  --fg-muted: #6e6a7c;
  --border: #e6e2ee;
  --accent: #5b40d6;
  --accent-hover: #4b30c2;
  --accent-subtle: #efebfe;
  --success: #10b981;
  --success-subtle: #ecfdf5;
  --warning: #f59e0b;
  --warning-subtle: #fffbeb;
  --danger: #ef4444;
  --danger-subtle: #fef2f2;
  --font-sans: "Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --radius-card: 12px;
  --radius-control: 8px;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme="dark"] {
    --bg: #121214;
    --bg-elevated: #1c1a22;
    --bg-subtle: #25222d;
    --fg: #f4f4f6;
    --fg-muted: #9e99ad;
    --border: #2e2a38;
    --accent: #ab98ff;
    --accent-hover: #c2b3ff;
    --accent-subtle: #2b2263;
  }
}
`;

export const CONCLAVE_KIT_CSS = `* {
  box-sizing: border-box;
}

body.lz-page {
  margin: 0;
  padding: 18px 20px;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

.lz-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.lz-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--fg);
}

.lz-lede {
  margin: 3px 0 0 0;
  font-size: 12px;
  color: var(--fg-muted);
}

.lz-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.lz-stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
}

.lz-stat-card.lz-stat-danger {
  background: var(--danger-subtle);
  border-color: #fecaca;
}

.lz-stat-card.lz-stat-warning {
  background: var(--warning-subtle);
  border-color: #fde68a;
}

.lz-stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lz-stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 2px;
  font-family: var(--font-mono);
}

.lz-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 14px;
  box-shadow: 0 1px 2px rgba(29, 22, 38, 0.04);
}

.lz-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.lz-table th {
  text-align: left;
  padding: 9px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--fg-muted);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.lz-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.lz-table tr:last-child td {
  border-bottom: none;
}

.lz-table tr.lz-row-danger {
  background: #fff5f5;
}

.lz-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}

.lz-badge-accent {
  background: var(--accent-subtle);
  color: var(--accent);
}

.lz-badge-success {
  background: var(--success-subtle);
  color: #047857;
}

.lz-badge-warning {
  background: var(--warning-subtle);
  color: #b45309;
}

.lz-badge-danger {
  background: var(--danger-subtle);
  color: #b91c1c;
}

.lz-badge-neutral {
  background: var(--bg-subtle);
  color: #52525b;
}

.lz-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-control);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.lz-btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.lz-btn-primary:hover {
  background: var(--accent-hover);
}

.lz-btn-ghost {
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--fg);
}

.lz-btn-ghost:hover {
  background: var(--bg-subtle);
}

.lz-label {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--fg-muted);
  margin-bottom: 3px;
}

.lz-input {
  width: 100%;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 12px;
  outline: none;
}

.lz-input:focus {
  border-color: var(--accent);
}
`;

export const CONCLAVE_CLIENT_SDK_JS = `(() => {
  // Forward global keyboard shortcuts (Cmd+K, Cmd+[, Cmd+]) to parent Conclave shell
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && ["k", "[", "]", "/"].includes(e.key.toLowerCase())) {
      window.parent?.postMessage({ type: "conclave:app:keydown", key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey }, "*");
    }
  });

  function getAppSlug() {
    const m = window.location.pathname.match(/\\/api\\/apps\\/([^/]+)\\/render/);
    if (m) return m[1];
    return document.body?.getAttribute("data-app-slug") || "default";
  }

  function getEnv() {
    const params = new URLSearchParams(window.location.search);
    return params.get("env") || "live";
  }

  function records(collection = "items") {
    const slug = getAppSlug();
    const env = getEnv();
    const baseUrl = \`/api/apps/\${slug}/records/\${collection}?env=\${env}\`;
    const listeners = new Set();

    async function list() {
      const res = await fetch(baseUrl);
      if (!res.ok) return [];
      return await res.json();
    }

    async function create(record) {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const created = await res.json();
      notify();
      return created;
    }

    async function update(id, patch) {
      const res = await fetch(\`/api/apps/\${slug}/records/\${collection}/\${id}?env=\${env}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      notify();
      return updated;
    }

    async function remove(id) {
      await fetch(\`/api/apps/\${slug}/records/\${collection}/\${id}?env=\${env}\`, {
        method: "DELETE",
      });
      notify();
    }

    async function notify() {
      if (listeners.size === 0) return;
      const rows = await list();
      listeners.forEach((fn) => fn(rows));
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    // Listen for parent frame refresh signals
    window.addEventListener("message", (ev) => {
      if (ev.data?.type === "conclave:records:updated" && ev.data?.slug === slug) {
        notify();
      }
    });

    return { list, create, update, remove, subscribe };
  }

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "className") el.className = v;
      else if (k === "style" && typeof v === "string") el.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      if (child instanceof Node) el.appendChild(child);
      else el.appendChild(document.createTextNode(String(child)));
    }
    return el;
  }

  async function mount(root, renderFn) {
    if (!root) return;
    try {
      const node = await renderFn();
      root.innerHTML = "";
      if (node instanceof Node) root.appendChild(node);
    } catch (err) {
      root.innerHTML = \`<div class="lz-card" style="color:var(--danger)">Error: \${err.message || err}</div>\`;
    }
  }

  window.Conclave = { records, h, mount };
  window.Laze = window.Conclave; // Compatibility alias for Laze SDK apps
})();
`;

export function registerAppKitRoutes(fastify: FastifyInstance, redisPublisher: Redis) {
  // Serve Platform App Kit CSS & JS
  for (const prefix of ["/_conclave", "/_laze"]) {
    fastify.get(`${prefix}/theme.css`, async (_req, reply) => {
      reply.header("Content-Type", "text/css; charset=utf-8");
      return CONCLAVE_THEME_CSS;
    });

    fastify.get(`${prefix}/kit.css`, async (_req, reply) => {
      reply.header("Content-Type", "text/css; charset=utf-8");
      return CONCLAVE_KIT_CSS;
    });

    fastify.get(`${prefix}/conclave.js`, async (_req, reply) => {
      reply.header("Content-Type", "application/javascript; charset=utf-8");
      return CONCLAVE_CLIENT_SDK_JS;
    });

    fastify.get(`${prefix}/laze.js`, async (_req, reply) => {
      reply.header("Content-Type", "application/javascript; charset=utf-8");
      return CONCLAVE_CLIENT_SDK_JS;
    });
  }

  // Render an App's active (or requested) version HTML
  fastify.get<{
    Params: { slug: string };
    Querystring: { version?: string; env?: string };
  }>("/api/apps/:slug/render", async (request, reply) => {
    const { slug } = request.params;
    const requestedVersion = request.query.version ? Number(request.query.version) : undefined;

    const [app] = await db.select().from(workspaceApps).where(eq(workspaceApps.slug, slug));
    if (!app) {
      reply.status(404).header("Content-Type", "text/html");
      return `<html><body style="font-family:sans-serif;padding:24px"><h3>App "${slug}" not found</h3></body></html>`;
    }

    const targetVer = requestedVersion || app.currentVersion;
    const versions = await db
      .select()
      .from(appVersions)
      .where(eq(appVersions.appId, app.id))
      .orderBy(asc(appVersions.version));

    const verRecord = versions.find((v) => v.version === targetVer) || versions[versions.length - 1];
    reply.header("Content-Type", "text/html; charset=utf-8");
    return verRecord?.htmlContent || `<html><body>Empty app</body></html>`;
  });

  // List records in an App collection
  fastify.get<{
    Params: { slug: string; collection: string };
    Querystring: { env?: string };
  }>("/api/apps/:slug/records/:collection", async (request, reply) => {
    const { slug, collection } = request.params;
    const env = request.query.env || "live";

    const [app] = await db.select().from(workspaceApps).where(eq(workspaceApps.slug, slug));
    if (!app) return reply.status(404).send([]);

    let rows = await db
      .select()
      .from(appRecords)
      .where(
        and(
          eq(appRecords.appId, app.id),
          eq(appRecords.collection, collection),
          eq(appRecords.environment, env)
        )
      )
      .orderBy(asc(appRecords.createdAt));

    // If querying draft and draft is empty, clone live rows into draft on-demand so draft mode starts with realistic data!
    if (env === "draft" && rows.length === 0) {
      const liveRows = await db
        .select()
        .from(appRecords)
        .where(
          and(
            eq(appRecords.appId, app.id),
            eq(appRecords.collection, collection),
            eq(appRecords.environment, "live")
          )
        )
        .orderBy(asc(appRecords.createdAt));

      if (liveRows.length > 0) {
        await db.insert(appRecords).values(
          liveRows.map((r) => ({
            appId: app.id,
            collection,
            environment: "draft",
            data: r.data,
            createdById: r.createdById,
          }))
        );
        rows = await db
          .select()
          .from(appRecords)
          .where(
            and(
              eq(appRecords.appId, app.id),
              eq(appRecords.collection, collection),
              eq(appRecords.environment, "draft")
            )
          )
          .orderBy(asc(appRecords.createdAt));
      }
    }

    return rows.map((r) => ({
      id: r.id,
      ...(r.data as Record<string, unknown>),
      _createdAt: r.createdAt,
      _updatedAt: r.updatedAt,
    }));
  });

  // Create a record in an App collection
  fastify.post<{
    Params: { slug: string; collection: string };
    Querystring: { env?: string };
    Body: Record<string, unknown>;
  }>("/api/apps/:slug/records/:collection", async (request, reply) => {
    const { slug, collection } = request.params;
    const env = request.query.env || "live";
    const [app] = await db.select().from(workspaceApps).where(eq(workspaceApps.slug, slug));
    if (!app) return reply.status(404).send({ error: "App not found" });

    const [created] = await db
      .insert(appRecords)
      .values({
        appId: app.id,
        collection,
        environment: env,
        data: request.body || {},
      })
      .returning();

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "app.records_updated",
        workspaceId: app.workspaceId,
        channelId: app.channelId,
        data: { appId: app.id, slug: app.slug, collection, environment: env },
      })
    );

    return reply.status(201).send({
      id: created.id,
      ...(created.data as Record<string, unknown>),
    });
  });

  // Update a record in an App collection
  fastify.patch<{
    Params: { slug: string; collection: string; recordId: string };
    Querystring: { env?: string };
    Body: Record<string, unknown>;
  }>("/api/apps/:slug/records/:collection/:recordId", async (request, reply) => {
    const { slug, collection, recordId } = request.params;
    const [app] = await db.select().from(workspaceApps).where(eq(workspaceApps.slug, slug));
    if (!app) return reply.status(404).send({ error: "App not found" });

    const [existing] = await db.select().from(appRecords).where(eq(appRecords.id, recordId));
    if (!existing) return reply.status(404).send({ error: "Record not found" });

    const mergedData = { ...(existing.data || {}), ...(request.body || {}) };
    const [updated] = await db
      .update(appRecords)
      .set({ data: mergedData, updatedAt: new Date() })
      .where(eq(appRecords.id, recordId))
      .returning();

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "app.records_updated",
        workspaceId: app.workspaceId,
        channelId: app.channelId,
        data: { appId: app.id, slug: app.slug, collection, environment: existing.environment },
      })
    );

    return {
      id: updated.id,
      ...(updated.data as Record<string, unknown>),
    };
  });

  // Delete a record in an App collection
  fastify.delete<{
    Params: { slug: string; collection: string; recordId: string };
  }>("/api/apps/:slug/records/:collection/:recordId", async (request, reply) => {
    const { slug, collection, recordId } = request.params;
    const [app] = await db.select().from(workspaceApps).where(eq(workspaceApps.slug, slug));
    if (!app) return reply.status(404).send({ error: "App not found" });

    await db.delete(appRecords).where(eq(appRecords.id, recordId));

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "app.records_updated",
        workspaceId: app.workspaceId,
        channelId: app.channelId,
        data: { appId: app.id, slug: app.slug, collection },
      })
    );

    return { success: true };
  });
}
