import {
  db,
  users,
  workspaces,
  workspaceMembers,
  channels,
  channelMembers,
  messages,
  reactions,
  bots,
  workspaceApps,
  appVersions,
  appRecords,
  feedItems,
  vaultSecrets,
  vaultAuditLogs,
  wikiPages,
  machines,
} from "./index";

async function seed() {
  console.log("🌱 Seeding Laze-inspired ACME Workspace database...");

  // 1. Clean up existing data in dependency order
  await db.delete(vaultAuditLogs);
  await db.delete(vaultSecrets);
  await db.delete(feedItems);
  await db.delete(appRecords);
  await db.delete(appVersions);
  await db.delete(workspaceApps);
  await db.delete(wikiPages);
  await db.delete(machines);
  await db.delete(reactions);
  await db.delete(messages);
  await db.delete(bots);
  await db.delete(channelMembers);
  await db.delete(channels);
  await db.delete(workspaceMembers);
  await db.delete(workspaces);
  await db.delete(users);

  // 2. Insert Humans & Agents
  const [mara] = await db
    .insert(users)
    .values({
      email: "mara@acme.local",
      displayName: "Mara Jensen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mara",
      userType: "human",
    })
    .returning();

  const [tom] = await db
    .insert(users)
    .values({
      email: "tom@acme.local",
      displayName: "Tom Reyes",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
      userType: "human",
    })
    .returning();

  const [lena] = await db
    .insert(users)
    .values({
      email: "lena@acme.local",
      displayName: "Lena Hoffmann",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lena",
      userType: "human",
    })
    .returning();

  const [ivo] = await db
    .insert(users)
    .values({
      email: "ivo@acme.local",
      displayName: "Ivo Petrov",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivo",
      userType: "human",
    })
    .returning();

  // Bot Users
  const [opsBotUser] = await db
    .insert(users)
    .values({
      email: "ops-agent@bot.conclave.local",
      displayName: "Ops Agent",
      avatarUrl: "face:2.4.1.2",
      userType: "agent",
    })
    .returning();

  const [salesBotUser] = await db
    .insert(users)
    .values({
      email: "sales-agent@bot.conclave.local",
      displayName: "Sales Agent",
      avatarUrl: "face:0.7.3.1",
      userType: "agent",
    })
    .returning();

  const [ivoClaudeUser] = await db
    .insert(users)
    .values({
      email: "ivos-claude@bot.conclave.local",
      displayName: "Ivo's Claude",
      avatarUrl: "face:1.2.0.3",
      userType: "agent",
    })
    .returning();

  const [financeBotUser] = await db
    .insert(users)
    .values({
      email: "finance-agent@bot.conclave.local",
      displayName: "Finance Agent",
      avatarUrl: "face:3.1.2.4",
      userType: "agent",
    })
    .returning();

  console.log(`✓ Created 4 human members (Mara, Tom, Lena, Ivo) and 4 AI agents`);

  // 3. Insert Workspace
  const [acme] = await db
    .insert(workspaces)
    .values({
      name: "ACME Logistics",
      slug: "acme",
      iconUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=AcmeLogistics",
      ownerId: mara.id,
    })
    .returning();

  // 4. Add Members to Workspace
  await db.insert(workspaceMembers).values([
    { workspaceId: acme.id, userId: mara.id, role: "owner" },
    { workspaceId: acme.id, userId: tom.id, role: "admin" },
    { workspaceId: acme.id, userId: lena.id, role: "member" },
    { workspaceId: acme.id, userId: ivo.id, role: "member" },
    { workspaceId: acme.id, userId: opsBotUser.id, role: "member" },
    { workspaceId: acme.id, userId: salesBotUser.id, role: "member" },
    { workspaceId: acme.id, userId: ivoClaudeUser.id, role: "member" },
    { workspaceId: acme.id, userId: financeBotUser.id, role: "member" },
  ]);

  // 5. Create Channels
  const [opsChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "ops",
      topic: "Warehouse dock scheduling, cold-chain telemetry & carrier logistics",
      description: "Live dock planner & carrier coordination",
      type: "public",
      createdById: mara.id,
    })
    .returning();

  const [salesChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "sales",
      topic: "Enterprise pipeline, HubSpot deals & renewal radar",
      description: "Revenue team + Sales Agent",
      type: "public",
      createdById: mara.id,
    })
    .returning();

  const [websiteChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "website",
      topic: "Frontend design, PR previews & connected developer agents",
      description: "Connected to Ivo's Claude Code & GitHub",
      type: "public",
      createdById: ivo.id,
    })
    .returning();

  const [financeChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "finance",
      topic: "Month close, Stripe reconciliation & overdue invoice reminders",
      description: "Automated ledger matching & payment approvals",
      type: "public",
      createdById: tom.id,
    })
    .returning();

  const [generalChannel] = await db
    .insert(channels)
    .values({
      workspaceId: acme.id,
      name: "general",
      topic: "Company-wide announcements, wiki updates & team sync",
      description: "Default channel for everyone at ACME",
      type: "public",
      createdById: mara.id,
    })
    .returning();

  // 6. Create Bots
  const [opsBot] = await db
    .insert(bots)
    .values({
      userId: opsBotUser.id,
      workspaceId: acme.id,
      createdById: mara.id,
      name: "Ops Agent",
      handle: "ops-agent",
      description: "Monitors warehouse docks, cold-chain temperatures, and builds live logistics apps.",
      systemPrompt: "You are ACME's Ops Agent. You manage dock bookings, carrier arrivals, and trailer temperature thresholds (warn if > 5°C). Always build clean interactive micro-apps with Conclave.records().",
      engine: "agy",
      avatarLabel: "2.4.1.2",
      connectionMode: "sandbox",
      skills: [
        { name: "dock-report", description: "Check dock utilization and reefer temperatures", prompt: "@ops-agent Generate a live summary of today's dock schedule and flag any trailer above 5°C." },
        { name: "build-tracker", description: "Build or update an interactive logistics app", prompt: "@ops-agent Build an interactive logistics tracker app with live reactive records." },
      ],
    })
    .returning();

  const [salesBot] = await db
    .insert(bots)
    .values({
      userId: salesBotUser.id,
      workspaceId: acme.id,
      createdById: mara.id,
      name: "Sales Agent",
      handle: "sales-agent",
      description: "Follows up on leads, keeps the Deals Tracker current, and drafts outreach via Feed.",
      systemPrompt: "You are ACME's Sales Agent. Keep the Deals Tracker updated, flag stale enterprise deals, and always post external emails as draft cards for human approval.",
      engine: "agy",
      avatarLabel: "0.7.3.1",
      connectionMode: "sandbox",
      skills: [
        { name: "pipeline-review", description: "Audit Q4 enterprise pipeline and stale deals", prompt: "@sales-agent Audit our current Q4 pipeline and highlight deals needing follow-up." },
        { name: "draft-followup", description: "Create an approval draft email for a prospect", prompt: "@sales-agent Draft a renewal follow-up email for Dana at Brightline for approval." },
      ],
    })
    .returning();

  const [ivoClaudeBot] = await db
    .insert(bots)
    .values({
      userId: ivoClaudeUser.id,
      workspaceId: acme.id,
      createdById: ivo.id,
      name: "Ivo's Claude",
      handle: "ivos-claude",
      description: "Connected from Ivo's MacBook Pro (~/acme/website) via Claude Code CLI bridge.",
      systemPrompt: "You are Ivo's Claude Code session connected from ~/acme/website. Inspect frontend layout bugs, propose CSS/React fixes, and build live component previews.",
      engine: "claude",
      avatarLabel: "1.2.0.3",
      connectionMode: "cli",
      skills: [
        { name: "fix-layout", description: "Inspect and fix responsive CSS/UI bugs", prompt: "@ivos-claude Inspect the mobile pricing cards overlap and ship a clean CSS grid fix." },
        { name: "open-pr", description: "Create a GitHub Pull Request from the current branch", prompt: "@ivos-claude Open a pull request with the latest responsive UI fixes." },
      ],
    })
    .returning();

  const [financeBot] = await db
    .insert(bots)
    .values({
      userId: financeBotUser.id,
      workspaceId: acme.id,
      createdById: tom.id,
      name: "Finance Agent",
      handle: "finance-agent",
      description: "Reconciles Stripe payouts against Exact ledger invoices and flags overdue accounts.",
      systemPrompt: "You are ACME's Finance Agent. Reconcile invoices, maintain the Month Close tracker, and request human approval before sending overdue payment reminders.",
      engine: "agy",
      avatarLabel: "3.1.2.4",
      connectionMode: "sandbox",
      skills: [
        { name: "month-close", description: "Check Stripe + Exact reconciliation status", prompt: "@finance-agent Summarize the current Month Close reconciliation status and exceptions." },
      ],
    })
    .returning();

  // Add human members to all channels
  for (const ch of [opsChannel, salesChannel, websiteChannel, financeChannel, generalChannel]) {
    await db.insert(channelMembers).values([
      { channelId: ch.id, userId: mara.id, listenMode: "mention" },
      { channelId: ch.id, userId: tom.id, listenMode: "mention" },
      { channelId: ch.id, userId: lena.id, listenMode: "mention" },
      { channelId: ch.id, userId: ivo.id, listenMode: "mention" },
    ]);
  }

  // Assign bots to their channels with listenModes
  await db.insert(channelMembers).values([
    { channelId: opsChannel.id, userId: opsBotUser.id, listenMode: "all" },
    { channelId: generalChannel.id, userId: opsBotUser.id, listenMode: "mention" },
    { channelId: salesChannel.id, userId: salesBotUser.id, listenMode: "all" },
    { channelId: generalChannel.id, userId: salesBotUser.id, listenMode: "mention" },
    { channelId: websiteChannel.id, userId: ivoClaudeUser.id, listenMode: "mention" },
    { channelId: financeChannel.id, userId: financeBotUser.id, listenMode: "all" },
  ]);

  // 7. Create Built-in Interactive Apps with Version History & Reactive Database Records!
  const dockPlannerV1Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dock Planner</title>
  <link rel="stylesheet" href="/_conclave/theme.css" />
  <link rel="stylesheet" href="/_conclave/kit.css" />
  <script src="/_conclave/conclave.js"></script>
</head>
<body class="lz-page">
  <div class="lz-header">
    <div>
      <h1 class="lz-title">Dock Planner</h1>
      <p class="lz-lede">Rotterdam Hub · Gate & Bay Schedule (v1)</p>
    </div>
  </div>
  <div id="root"></div>
  <script>
    const docks = Conclave.records("docks");
    Conclave.mount(document.getElementById("root"), async () => {
      const rows = await docks.list();
      return Conclave.h("div", { className: "lz-card" },
        Conclave.h("table", { className: "lz-table" },
          Conclave.h("thead", {}, Conclave.h("tr", {},
            Conclave.h("th", {}, "Bay"),
            Conclave.h("th", {}, "Carrier"),
            Conclave.h("th", {}, "ETA"),
            Conclave.h("th", {}, "Status")
          )),
          Conclave.h("tbody", {}, ...rows.map(r => Conclave.h("tr", {},
            Conclave.h("td", { style: "font-weight:600" }, r.bay),
            Conclave.h("td", {}, r.carrier),
            Conclave.h("td", {}, r.eta),
            Conclave.h("td", {}, r.status)
          )))
        )
      );
    });
  </script>
</body>
</html>`;

  const dockPlannerV2Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dock Planner</title>
  <link rel="stylesheet" href="/_conclave/theme.css" />
  <link rel="stylesheet" href="/_conclave/kit.css" />
  <script src="/_conclave/conclave.js"></script>
</head>
<body class="lz-page">
  <div class="lz-header">
    <div>
      <div style="display:flex;align-items:center;gap:8px">
        <h1 class="lz-title">Dock Planner</h1>
        <span class="lz-badge lz-badge-success">Live Telemetry v2</span>
      </div>
      <p class="lz-lede">Rotterdam Hub · Real-time Bay Assignments & Reefer Cold-Chain</p>
    </div>
    <button class="lz-btn lz-btn-primary" id="add-btn">+ Book Truck</button>
  </div>
  <div id="stats-bar" class="lz-stats"></div>
  <div id="form-slot"></div>
  <div id="table-slot"></div>
  <script>
    const docks = Conclave.records("docks");
    let showForm = false;

    async function render() {
      const rows = await docks.list();
      const hotCount = rows.filter(r => Number(r.tempC) > 5).length;
      const statsEl = document.getElementById("stats-bar");
      statsEl.innerHTML = \`
        <div class="lz-stat-card">
          <div class="lz-stat-label">Active Bays</div>
          <div class="lz-stat-value">\${rows.length} / 8</div>
        </div>
        <div class="lz-stat-card">
          <div class="lz-stat-label">On Schedule</div>
          <div class="lz-stat-value">\${rows.filter(r => r.status !== "Delayed").length}</div>
        </div>
        <div class="lz-stat-card \${hotCount > 0 ? 'lz-stat-danger' : ''}">
          <div class="lz-stat-label">Temp Alerts (&gt; 5°C)</div>
          <div class="lz-stat-value">\${hotCount}</div>
        </div>
      \`;

      const formSlot = document.getElementById("form-slot");
      if (showForm) {
        formSlot.innerHTML = \`
          <form id="book-form" class="lz-card" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:end">
            <div><label class="lz-label">Bay</label><input name="bay" placeholder="Bay 05" required class="lz-input" /></div>
            <div><label class="lz-label">Carrier</label><input name="carrier" placeholder="Maersk Cold" required class="lz-input" /></div>
            <div><label class="lz-label">ETA</label><input name="eta" placeholder="15:30" required class="lz-input" /></div>
            <div><label class="lz-label">Temp (°C)</label><input name="tempC" type="number" step="0.1" value="3.2" required class="lz-input" /></div>
            <button type="submit" class="lz-btn lz-btn-primary">Save Booking</button>
          </form>
        \`;
        document.getElementById("book-form").onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await docks.create({
            bay: fd.get("bay"),
            carrier: fd.get("carrier"),
            eta: fd.get("eta"),
            tempC: parseFloat(fd.get("tempC")),
            status: "Scheduled"
          });
          showForm = false;
          render();
        };
      } else {
        formSlot.innerHTML = "";
      }

      const tableSlot = document.getElementById("table-slot");
      tableSlot.innerHTML = \`
        <div class="lz-card" style="padding:0;overflow:hidden">
          <table class="lz-table">
            <thead>
              <tr>
                <th>Dock Bay</th>
                <th>Carrier & Route</th>
                <th>ETA</th>
                <th>Trailer Temp</th>
                <th>Status</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              \${rows.map(r => {
                const isHot = Number(r.tempC) > 5;
                return \`
                  <tr class="\${isHot ? 'lz-row-danger' : ''}">
                    <td style="font-weight:600;font-family:var(--font-mono)">\${r.bay}</td>
                    <td>\${r.carrier}</td>
                    <td style="font-family:var(--font-mono)">\${r.eta}</td>
                    <td>
                      <span class="lz-badge \${isHot ? 'lz-badge-danger' : 'lz-badge-success'}" style="font-family:var(--font-mono)">
                        \${Number(r.tempC).toFixed(1)} °C \${isHot ? '⚠️ HIGH' : '✓'}
                      </span>
                    </td>
                    <td>
                      <span class="lz-badge \${r.status === 'Unloading' ? 'lz-badge-accent' : r.status === 'Delayed' ? 'lz-badge-warning' : 'lz-badge-neutral'}">
                        \${r.status}
                      </span>
                    </td>
                    <td style="text-align:right">
                      <button data-cycle="\${r.id}" class="lz-btn lz-btn-ghost" style="padding:2px 8px;font-size:11px">Cycle Status</button>
                    </td>
                  </tr>
                \`;
              }).join("")}
            </tbody>
          </table>
        </div>
      \`;

      tableSlot.querySelectorAll("[data-cycle]").forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute("data-cycle");
          const row = rows.find(x => x.id === id);
          if (!row) return;
          const order = ["Scheduled", "Unloading", "Departed", "Delayed"];
          const next = order[(order.indexOf(row.status) + 1) % order.length];
          await docks.update(id, { status: next });
          render();
        };
      });
    }

    document.getElementById("add-btn").onclick = () => {
      showForm = !showForm;
      render();
    };

    docks.subscribe(() => render());
    render();
  </script>
</body>
</html>`;

  const [dockPlannerApp] = await db
    .insert(workspaceApps)
    .values({
      workspaceId: acme.id,
      channelId: opsChannel.id,
      botId: opsBot.id,
      slug: "dock-planner",
      title: "Dock Planner",
      description: "Live Rotterdam warehouse bay schedule with cold-chain trailer temperature alerts.",
      icon: "truck",
      status: "published",
      accessLevel: "workspace",
      isPinned: true,
      currentVersion: 2,
      appUrl: "/api/apps/dock-planner/render",
      containerPort: 3001,
    })
    .returning();

  await db.insert(appVersions).values([
    {
      appId: dockPlannerApp.id,
      version: 1,
      summary: "Initial dock bay schedule table for Rotterdam Hub",
      htmlContent: dockPlannerV1Html,
      createdById: opsBotUser.id,
    },
    {
      appId: dockPlannerApp.id,
      version: 2,
      summary: "Added Trailer Temperature (°C) column with red cold-chain alert above 5.0°C and live booking form",
      htmlContent: dockPlannerV2Html,
      createdById: opsBotUser.id,
    },
  ]);

  await db.insert(appRecords).values([
    {
      appId: dockPlannerApp.id,
      collection: "docks",
      environment: "live",
      data: { bay: "Bay 01", carrier: "Nordic Cold Line #412", eta: "09:15", tempC: 2.4, status: "Unloading" },
      createdById: opsBotUser.id,
    },
    {
      appId: dockPlannerApp.id,
      collection: "docks",
      environment: "live",
      data: { bay: "Bay 02", carrier: "Rhenus Reefer Express", eta: "10:40", tempC: 6.8, status: "Delayed" },
      createdById: opsBotUser.id,
    },
    {
      appId: dockPlannerApp.id,
      collection: "docks",
      environment: "live",
      data: { bay: "Bay 03", carrier: "DHL Benelux Freight", eta: "11:20", tempC: 3.1, status: "Scheduled" },
      createdById: opsBotUser.id,
    },
    {
      appId: dockPlannerApp.id,
      collection: "docks",
      environment: "live",
      data: { bay: "Bay 04", carrier: "Kuehne+Nagel Antwerp", eta: "13:05", tempC: 1.9, status: "Scheduled" },
      createdById: opsBotUser.id,
    },
  ]);

  // App 2: Deals Tracker in #sales
  const dealsTrackerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Deals Tracker</title>
  <link rel="stylesheet" href="/_conclave/theme.css" />
  <link rel="stylesheet" href="/_conclave/kit.css" />
  <script src="/_conclave/conclave.js"></script>
</head>
<body class="lz-page">
  <div class="lz-header">
    <div>
      <div style="display:flex;align-items:center;gap:8px">
        <h1 class="lz-title">Deals Tracker</h1>
        <span class="lz-badge lz-badge-accent">HubSpot + Gmail Sync</span>
      </div>
      <p class="lz-lede">Q4 Enterprise Freight Pipeline & Renewal Radar</p>
    </div>
    <button class="lz-btn lz-btn-primary" id="new-deal-btn">+ Add Deal</button>
  </div>
  <div id="pipeline-stats" class="lz-stats"></div>
  <div id="deal-form-slot"></div>
  <div id="deals-board"></div>
  <script>
    const deals = Conclave.records("deals");
    let adding = false;

    async function render() {
      const rows = await deals.list();
      const totalArr = rows.reduce((sum, r) => sum + (Number(r.valueEur) || 0), 0);
      const staleCount = rows.filter(r => r.health === "Needs Follow-up").length;

      document.getElementById("pipeline-stats").innerHTML = \`
        <div class="lz-stat-card">
          <div class="lz-stat-label">Active Pipeline</div>
          <div class="lz-stat-value">€\${(totalArr / 1000).toFixed(0)}k</div>
        </div>
        <div class="lz-stat-card">
          <div class="lz-stat-label">Open Deals</div>
          <div class="lz-stat-value">\${rows.length}</div>
        </div>
        <div class="lz-stat-card \${staleCount > 0 ? 'lz-stat-warning' : ''}">
          <div class="lz-stat-label">Needs Follow-up</div>
          <div class="lz-stat-value">\${staleCount}</div>
        </div>
      \`;

      const formSlot = document.getElementById("deal-form-slot");
      if (adding) {
        formSlot.innerHTML = \`
          <form id="deal-form" class="lz-card" style="margin-bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end">
            <div><label class="lz-label">Account</label><input name="account" placeholder="Veloce Retail" required class="lz-input" /></div>
            <div><label class="lz-label">Stage</label><input name="stage" placeholder="Proposal" required class="lz-input" /></div>
            <div><label class="lz-label">Value (€)</label><input name="valueEur" type="number" value="65000" required class="lz-input" /></div>
            <button type="submit" class="lz-btn lz-btn-primary">Create</button>
          </form>
        \`;
        document.getElementById("deal-form").onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await deals.create({
            account: fd.get("account"),
            stage: fd.get("stage"),
            valueEur: Number(fd.get("valueEur")),
            owner: "Mara Jensen",
            health: "On Track",
            nextStep: "Intro call scheduled"
          });
          adding = false;
          render();
        };
      } else {
        formSlot.innerHTML = "";
      }

      document.getElementById("deals-board").innerHTML = \`
        <div class="lz-card" style="padding:0;overflow:hidden">
          <table class="lz-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Stage</th>
                <th>ARR</th>
                <th>Health</th>
                <th>Next Step</th>
              </tr>
            </thead>
            <tbody>
              \${rows.map(r => \`
                <tr>
                  <td style="font-weight:600">\${r.account}</td>
                  <td><span class="lz-badge lz-badge-neutral">\${r.stage}</span></td>
                  <td style="font-family:var(--font-mono);font-weight:600">€\${(Number(r.valueEur)/1000).toFixed(0)}k</td>
                  <td>
                    <span class="lz-badge \${r.health === 'On Track' ? 'lz-badge-success' : 'lz-badge-warning'}">
                      \${r.health}
                    </span>
                  </td>
                  <td style="color:var(--fg-muted)">\${r.nextStep || ''}</td>
                </tr>
              \`).join("")}
            </tbody>
          </table>
        </div>
      \`;
    }

    document.getElementById("new-deal-btn").onclick = () => { adding = !adding; render(); };
    deals.subscribe(() => render());
    render();
  </script>
</body>
</html>`;

  const [dealsTrackerApp] = await db
    .insert(workspaceApps)
    .values({
      workspaceId: acme.id,
      channelId: salesChannel.id,
      botId: salesBot.id,
      slug: "deals-tracker",
      title: "Deals Tracker",
      description: "Enterprise freight pipeline synced with HubSpot and Gmail threads.",
      icon: "briefcase",
      status: "published",
      accessLevel: "workspace",
      isPinned: true,
      currentVersion: 1,
      appUrl: "/api/apps/deals-tracker/render",
      containerPort: 3001,
    })
    .returning();

  await db.insert(appVersions).values({
    appId: dealsTrackerApp.id,
    version: 1,
    summary: "Published Q4 Enterprise Freight Pipeline with ARR rollup and health badges",
    htmlContent: dealsTrackerHtml,
    createdById: salesBotUser.id,
  });

  await db.insert(appRecords).values([
    {
      appId: dealsTrackerApp.id,
      collection: "deals",
      environment: "live",
      data: { account: "Brightline Foods", stage: "Renewal", valueEur: 148000, owner: "Mara Jensen", health: "Needs Follow-up", nextStep: "Dana requested Q1 cold-chain pricing by Friday" },
      createdById: salesBotUser.id,
    },
    {
      appId: dealsTrackerApp.id,
      collection: "deals",
      environment: "live",
      data: { account: "Nordway Pharma", stage: "Negotiation", valueEur: 210000, owner: "Tom Reyes", health: "On Track", nextStep: "Legal reviewing GDP compliance annex" },
      createdById: salesBotUser.id,
    },
    {
      appId: dealsTrackerApp.id,
      collection: "deals",
      environment: "live",
      data: { account: "Kestrel Fresh", stage: "Discovery", valueEur: 84000, owner: "Mara Jensen", health: "On Track", nextStep: "Warm intro via Ivo's LinkedIn connection" },
      createdById: salesBotUser.id,
    },
  ]);

  // App 3: Month Close in #finance
  const monthCloseHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Month Close</title>
  <link rel="stylesheet" href="/_conclave/theme.css" />
  <link rel="stylesheet" href="/_conclave/kit.css" />
  <script src="/_conclave/conclave.js"></script>
</head>
<body class="lz-page">
  <div class="lz-header">
    <div>
      <div style="display:flex;align-items:center;gap:8px">
        <h1 class="lz-title">Month Close</h1>
        <span class="lz-badge lz-badge-success">142 / 143 Matched</span>
      </div>
      <p class="lz-lede">Stripe + Exact Online Ledger Reconciliation</p>
    </div>
  </div>
  <div id="close-root"></div>
  <script>
    const invoices = Conclave.records("invoices");
    async function render() {
      const rows = await invoices.list();
      document.getElementById("close-root").innerHTML = \`
        <div class="lz-card" style="padding:0;overflow:hidden">
          <table class="lz-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${rows.map(r => \`
                <tr class="\${r.status === 'Exception' ? 'lz-row-danger' : ''}">
                  <td style="font-family:var(--font-mono);font-weight:600">\${r.invoiceNo}</td>
                  <td>\${r.customer}</td>
                  <td style="font-family:var(--font-mono)">€\${Number(r.amountEur).toLocaleString()}</td>
                  <td>\${r.age}</td>
                  <td>
                    <span class="lz-badge \${r.status === 'Matched' ? 'lz-badge-success' : 'lz-badge-danger'}">\${r.status}</span>
                  </td>
                </tr>
              \`).join("")}
            </tbody>
          </table>
        </div>
      \`;
    }
    invoices.subscribe(() => render());
    render();
  </script>
</body>
</html>`;

  const [monthCloseApp] = await db
    .insert(workspaceApps)
    .values({
      workspaceId: acme.id,
      channelId: financeChannel.id,
      botId: financeBot.id,
      slug: "month-close",
      title: "Month Close",
      description: "Automated Stripe + Exact Online ledger matching and overdue exception queue.",
      icon: "DollarSign",
      status: "published",
      accessLevel: "workspace",
      isPinned: true,
      currentVersion: 1,
      appUrl: "/api/apps/month-close/render",
      containerPort: 3001,
    })
    .returning();

  await db.insert(appVersions).values({
    appId: monthCloseApp.id,
    version: 1,
    summary: "October close ledger matching with Pell & Rowe exception highlight",
    htmlContent: monthCloseHtml,
    createdById: financeBotUser.id,
  });

  await db.insert(appRecords).values([
    {
      appId: monthCloseApp.id,
      collection: "invoices",
      environment: "live",
      data: { invoiceNo: "INV-2026-841", customer: "Pell & Rowe Logistics", amountEur: 48000, age: "92 days late", status: "Exception" },
      createdById: financeBotUser.id,
    },
    {
      appId: monthCloseApp.id,
      collection: "invoices",
      environment: "live",
      data: { invoiceNo: "INV-2026-842", customer: "Nordway Pharma", amountEur: 32500, age: "Paid today", status: "Matched" },
      createdById: financeBotUser.id,
    },
    {
      appId: monthCloseApp.id,
      collection: "invoices",
      environment: "live",
      data: { invoiceNo: "INV-2026-843", customer: "Brightline Foods", amountEur: 19200, age: "Paid 2d ago", status: "Matched" },
      createdById: financeBotUser.id,
    },
  ]);

  // 8. Seed Conversations & Interactive Cards in #ops, #sales, #website, #finance
  // --- #ops messages ---
  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: opsChannel.id,
    senderId: mara.id,
    content: "Morning team! @ops-agent can we track the trucks booked for each Rotterdam dock today and add a **Trailer Temp (°C)** column where anything above `5.0 °C` turns red?",
  });

  const [opsBotReply] = await db
    .insert(messages)
    .values({
      workspaceId: acme.id,
      channelId: opsChannel.id,
      senderId: opsBotUser.id,
      content: "I've updated **Dock Planner** to **v2** and pinned it to `#ops`.\n\n- Added the **Trailer Temp (°C)** telemetry column with automatic red cold-chain alerts above `5.0 °C`.\n- **Bay 02** (`Rhenus Reefer Express`) is currently reading **6.8 °C ⚠️** and marked *Delayed*.\n- You can book new trucks or cycle bay statuses live in the right-hand panel.",
      metadata: {
        type: "interactive_app",
        appId: dockPlannerApp.id,
        appSlug: dockPlannerApp.slug,
        appTitle: "Dock Planner",
        appUrl: "/api/apps/dock-planner/render",
        containerPort: 3001,
        version: 2,
        engine: "agy",
        duration: "2.4s",
        steps: [
          { kind: "tool", label: "Read memory .conclave/memory/AGENTS.md & MEMORY.md", status: "done", detail: "Loaded cold-chain SLA rules (< 5.0°C)" },
          { kind: "subagent", label: "Subagent: Schema & UI Builder", task: "Migrate docks collection & add live temperature alert badges", status: "done", duration: "1.8s", stepsCount: 3 },
          { kind: "tool", label: "conclave app push dock-planner --version 2", status: "done", detail: "Published v2 & pinned to #ops" },
        ],
      },
      replyCount: 1,
    })
    .returning();

  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: opsChannel.id,
    senderId: tom.id,
    parentMessageId: opsBotReply.id,
    content: "Love that Bay 02 lit up red right away. Calling Rhenus dispatch now to check their reefer compressor.",
  });

  const [opsAttentionMsg] = await db
    .insert(messages)
    .values({
      workspaceId: acme.id,
      channelId: opsChannel.id,
      senderId: opsBotUser.id,
      content: "Because **Bay 02** (`Rhenus Reefer Express`) exceeded the `5.0 °C` cold-chain threshold for 15 minutes, I prepared an automated standby bay reassignment. Please approve the Vault API call to notify the yard gate:",
      metadata: {
        attention: {
          id: "att-ops-yard-1",
          kind: "approval",
          status: "pending",
          title: "Release yard-gate-api key for Bay 02 standby reroute",
          summary: "Reroute Rhenus Reefer Express (#408) to Cold Standby Bay 06 with shore power hookup.",
          commandLine: "conclave vault run yard-gate-api --reason \"Reroute Bay 02 reefer to Shore Power Bay 06\" -- ./scripts/reroute-bay.sh --bay 02 --to 06",
          judgeLine: "Checked policy: Yard Gate actuator writes require human confirmation.",
          deciders: ["Mara Jensen", "Tom Reyes"],
        },
      },
    })
    .returning();

  // --- #sales messages ---
  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: salesChannel.id,
    senderId: mara.id,
    content: "@sales-agent Dana at **Brightline Foods** asked for our updated Q1 cold-chain renewal rate card by Friday. Can you update the **Deals Tracker** and draft a reply for my review?",
  });

  const [salesDraftMsg] = await db
    .insert(messages)
    .values({
      workspaceId: acme.id,
      channelId: salesChannel.id,
      senderId: salesBotUser.id,
      content: "I've updated **Brightline Foods** (`€148k ARR`) in **Deals Tracker** and prepared the renewal quote draft below. Per workspace guardrail rules, external customer emails wait on a draft card until you press **Send it**:",
      metadata: {
        type: "interactive_app",
        appId: dealsTrackerApp.id,
        appSlug: dealsTrackerApp.slug,
        appTitle: "Deals Tracker",
        appUrl: "/api/apps/deals-tracker/render",
        containerPort: 3001,
        version: 1,
        engine: "agy",
        duration: "1.9s",
        steps: [
          { kind: "tool", label: "Query HubSpot Deal #8841 (Brightline Foods)", status: "done", detail: "ARR €148,000 · Renewal Date Nov 15" },
          { kind: "tool", label: "Update Conclave.records('deals')", status: "done", detail: "Flagged 'Needs Follow-up'" },
          { kind: "tool", label: "Create external email draft card", status: "done", detail: "Queued in Feed & #sales" },
        ],
        attention: {
          id: "att-sales-draft-1",
          kind: "draft",
          status: "pending",
          title: "Reply to Dana about the Brightline Q1 renewal",
          summary: "Includes volume tier discount (4%) for Rotterdam–Antwerp cold-chain lanes.",
          draftHeader: "To: dana@brightline.test\nSubject: Re: ACME Cold-Chain Renewal & Q1 Rate Card",
          draftBody: "Hi Dana,\n\nThanks for your note! Ahead of Friday, here is the Q1 renewal rate card for Brightline's Rotterdam–Antwerp temperature-controlled lanes.\n\nWith your 18% volume growth this quarter, we've locked in the 4% multi-lane discount (€148,000 annual commitment, SLA < 4.5°C continuous telemetry included).\n\nLet me know if you'd like to review the lane breakdown on Thursday.\n\nBest,\nMara",
          deciders: ["Mara Jensen"],
        },
      },
    })
    .returning();

  // --- #website messages ---
  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: websiteChannel.id,
    senderId: lena.id,
    content: "Hey @ivos-claude — on mobile (`390px`), the pricing tier cards on `/pricing` overlap the sticky header badge. Can you check Ivo's local branch and let us know which grid strategy we should ship?",
  });

  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: websiteChannel.id,
    senderId: ivoClaudeUser.id,
    content: "I inspected `apps/marketing/src/PricingGrid.tsx` on `Ivo's MacBook Pro (~/acme/website)`. The overlap happens because `.pricing-card-featured` uses `margin-top: -24px` below the `640px` breakpoint.\n\nHow should I finalize the fix before opening **PR #418**?",
    metadata: {
      steps: [
        { kind: "tool", label: "Read ~/acme/website/src/PricingGrid.tsx", status: "done", detail: "Lines 42–118 inspected via Claude Code bridge" },
        { kind: "tool", label: "Playwright viewport check (390x844)", status: "done", detail: "Confirmed 14px header overlap on mobile" },
      ],
      attention: {
        id: "att-web-question-1",
        kind: "question",
        status: "pending",
        title: "Choose mobile layout behavior for PricingGrid.tsx (PR #418)",
        summary: "Select how featured tier badges should stack on viewports under 640px:",
        options: [
          { id: "stack-clean", label: "Stack with 16px gap (Recommended)", description: "Removes negative margin below sm: breakpoint and keeps badge inline." },
          { id: "sticky-pill", label: "Sticky compact comparison bar", description: "Pins a slim tier switcher at top of viewport while scrolling." },
          { id: "carousel-snap", label: "Horizontal CSS scroll-snap carousel", description: "Swipeable cards on mobile with dot indicators." },
        ],
        deciders: ["Lena Hoffmann", "Ivo Petrov", "Mara Jensen"],
      },
    },
  });

  // --- #finance messages ---
  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: financeChannel.id,
    senderId: tom.id,
    content: "@finance-agent how does October Month Close look after this morning's Stripe payout batch?",
  });

  await db.insert(messages).values({
    workspaceId: acme.id,
    channelId: financeChannel.id,
    senderId: financeBotUser.id,
    content: "**142 of 143** October ledger entries are now matched between **Stripe** and **Exact Online** (`99.3%` complete).\n\nThere is **1 open exception**: `INV-2026-841` (**Pell & Rowe Logistics · €48,000 · 92 days late**). Open **Month Close** in the right-hand split pane to inspect the ledger.",
    metadata: {
      type: "interactive_app",
      appId: monthCloseApp.id,
      appSlug: monthCloseApp.slug,
      appTitle: "Month Close",
      appUrl: "/api/apps/month-close/render",
      containerPort: 3001,
      version: 1,
      engine: "agy",
      duration: "1.5s",
    },
  });

  // 9. Seed Personal Triage Feed Items
  await db.insert(feedItems).values([
    {
      workspaceId: acme.id,
      channelId: opsChannel.id,
      messageId: opsAttentionMsg.id,
      botId: opsBot.id,
      targetUserId: mara.id,
      kind: "approval",
      priority: "urgent",
      title: "Approve Bay 02 reefer reroute to Cold Standby Bay 06",
      summary: "Rhenus Reefer Express trailer hit 6.8 °C (above 5.0 °C SLA). Ops Agent requests yard-gate-api key.",
      commandLine: "conclave vault run yard-gate-api --reason \"Reroute Bay 02 reefer to Shore Power Bay 06\" -- ./scripts/reroute-bay.sh --bay 02 --to 06",
      status: "pending",
    },
    {
      workspaceId: acme.id,
      channelId: salesChannel.id,
      messageId: salesDraftMsg.id,
      botId: salesBot.id,
      targetUserId: mara.id,
      kind: "draft",
      priority: "high",
      title: "Reply to Dana about the Brightline Q1 renewal (€148k ARR)",
      summary: "She asked for the Q1 cold-chain rate card by Friday. Draft includes 4% multi-lane discount.",
      draftHeader: "To: dana@brightline.test\nSubject: Re: ACME Cold-Chain Renewal & Q1 Rate Card",
      draftBody: "Hi Dana,\n\nThanks for your note! Ahead of Friday, here is the Q1 renewal rate card for Brightline's Rotterdam–Antwerp temperature-controlled lanes.\n\nWith your 18% volume growth this quarter, we've locked in the 4% multi-lane discount (€148,000 annual commitment, SLA < 4.5°C continuous telemetry included).\n\nBest,\nMara",
      status: "pending",
    },
    {
      workspaceId: acme.id,
      channelId: financeChannel.id,
      botId: financeBot.id,
      targetUserId: tom.id,
      kind: "approval",
      priority: "normal",
      title: "Send overdue payment reminder to Pell & Rowe (€48k · 92d late)",
      summary: "142/143 October payments matched; INV-2026-841 remains outstanding.",
      draftHeader: "To: ap@pellrowe.test\nSubject: Overdue Invoice INV-2026-841 (€48,000)",
      draftBody: "Hello Pell & Rowe AP team,\n\nOur October ledger close shows Invoice INV-2026-841 (€48,000.00) is now 92 days past due. Please confirm remittance timing so we can clear your cold-storage credit hold.\n\nRegards,\nACME Finance",
      status: "pending",
    },
  ]);

  // 10. Seed Vault Secrets & Egress Proxy Audit Logs
  const [hubspotSecret] = await db
    .insert(vaultSecrets)
    .values({
      workspaceId: acme.id,
      name: "hubspot-crm-oauth",
      provider: "HubSpot",
      accessLevel: "auto",
      maskedValue: "{{vault:hubspot_oauth_9f8a...}}",
      description: "Read/write enterprise deals and pipeline stages via Conclave Egress Proxy",
      usageCount: 42,
      lastUsedAt: new Date(),
      createdById: mara.id,
    })
    .returning();

  const [yardGateSecret] = await db
    .insert(vaultSecrets)
    .values({
      workspaceId: acme.id,
      name: "yard-gate-api",
      provider: "Rotterdam Yard OS",
      accessLevel: "checked",
      maskedValue: "{{vault:yard_gate_hmac_3c1d...}}",
      description: "Controls dock bay assignments and shore-power reefer relays",
      usageCount: 19,
      lastUsedAt: new Date(),
      createdById: mara.id,
    })
    .returning();

  const [stripeSecret] = await db
    .insert(vaultSecrets)
    .values({
      workspaceId: acme.id,
      name: "stripe-live-read",
      provider: "Stripe",
      accessLevel: "ask",
      maskedValue: "{{vault:rk_live_51N9x...}}",
      description: "Payout reconciliation & invoice exception matching for Month Close",
      usageCount: 14,
      lastUsedAt: new Date(),
      createdById: tom.id,
    })
    .returning();

  await db.insert(vaultSecrets).values({
    workspaceId: acme.id,
    name: "prod-postgres-admin",
    provider: "PostgreSQL EU",
    accessLevel: "human_only",
    maskedValue: "{{vault:pg_sealed_enclave_7b2e...}}",
    description: "Hardware Touch ID / Secure Enclave sealed production database credentials",
    usageCount: 3,
    lastUsedAt: new Date(),
    createdById: ivo.id,
  });

  await db.insert(vaultAuditLogs).values([
    {
      workspaceId: acme.id,
      secretId: hubspotSecret.id,
      actorName: "Sales Agent",
      actorType: "agent",
      action: "proxy_injected",
      reason: "Sync Brightline Foods (€148k ARR) renewal stage in Deals Tracker",
      targetEndpoint: "https://api.hubapi.com/crm/v3/objects/deals/8841",
      status: "allowed",
    },
    {
      workspaceId: acme.id,
      secretId: stripeSecret.id,
      actorName: "Finance Agent",
      actorType: "agent",
      action: "proxy_injected",
      reason: "Match 142 October payouts against Exact Online ledger",
      targetEndpoint: "https://api.stripe.com/v1/balance_transactions",
      status: "allowed",
    },
    {
      workspaceId: acme.id,
      secretId: yardGateSecret.id,
      actorName: "Ops Agent",
      actorType: "agent",
      action: "awaiting_approval",
      reason: "Reroute Bay 02 reefer (6.8°C) to Shore Power Bay 06",
      targetEndpoint: "https://yard.acme.internal/v2/bays/reassign",
      status: "pending",
    },
  ]);

  // 11. Seed Three-Tier Markdown Memory & Workspace Wiki Pages
  await db.insert(wikiPages).values([
    {
      workspaceId: acme.id,
      path: "memory/AGENTS.md",
      title: "AGENTS.md (Workspace Rules & Glossary)",
      version: 3,
      updatedById: mara.id,
      content: `# ACME Logistics — Workspace AGENTS.md

This file is automatically synced to \`.conclave/memory/AGENTS.md\` before every agent turn alongside \`~/.optmem/memo wake\`.

## Memory (OptMem Binary Merge Tree)

- Your permanent memory is **OptMem** (\`~/.optmem/memo\` with \`$MEMORY_DIR\` per agent).
- **At startup (mandatory)**: Run \`memo wake\` before any other tool call to load your \`O(log N)\` binary merge tree summaries (\`TREE/2\`, \`TREE/4\`, \`TREE/8\`) and recent verbatim logs (\`LOG.txt\`).
- **While working (mandatory)**: Call \`memo note "<1 line, max 280 bytes>"\` whenever a task of lasting effect completes, and immediately settle any due power-of-two blocks via \`memo nap <lo>-<hi> "<summary>"\`.
- **Subprocess Delegation Rule**: Main agents orchestrate memory & context (\`+compact\`) and delegate all concrete tasks to isolated subprocesses with \`OPTMEM_SUBAGENT=1\` and \`"You are a subagent. Don't run memo."\` so subagents never pollute the main agent's context or OptMem log.

## Standing Operating Rules
1. **Cold-Chain SLA**: Every refrigerated trailer ("reefer") at the Rotterdam and Antwerp hubs must stay below **5.0 °C**. Flag any telemetry reading above \`5.0 °C\` immediately in \`#ops\`. See \`[[wiki/cold-chain-sla]]\`.
2. **External Communications Guardrail**: Never send external customer emails, Slack Connect replies, or invoice reminders directly. Always create a **Draft Card** in the **Feed** so a human teammate can review and click **Send it**.
3. **Internal Apps**: Build side-by-side tools using \`/_conclave/theme.css\`, \`/_conclave/kit.css\`, and \`/_conclave/conclave.js\` (\`Conclave.records()\`). Always keep previous versions revertible.`,
    },
    {
      workspaceId: acme.id,
      path: "memory/SOUL.md",
      title: "SOUL.md (Agent Persona & Ergonomics)",
      version: 2,
      updatedById: ivo.id,
      content: `# SOUL.md — Agent Identity & Collaboration Style

- Speak concisely like a sharp, helpful colleague in Slack — never output walls of boilerplate.
- Reference other wiki notes with \`[[wiki/cold-chain-sla]]\` or \`[[wiki/month-close-checklist]]\`.
- When uncertain about a destructive or external action, post a structured **Approval** or **Question** card inline.`,
    },
    {
      workspaceId: acme.id,
      path: "memory/ops-MEMORY.md",
      title: "MEMORY.md (#ops Channel Working Memory)",
      version: 4,
      updatedById: opsBotUser.id,
      content: `# #ops Channel Working Memory

- **2026-11-05**: Published **Dock Planner v2** with live Trailer Temp (°C) column and red alerts > 5.0 °C.
- **Bay 02 Exception**: Rhenus Reefer Express (#408) reported 6.8 °C; standby reroute to Bay 06 requested via \`yard-gate-api\`.
- ** Bay 06**: Reserved as dedicated shore-power standby bay for pharmaceutical & fresh produce loads.`,
    },
    {
      workspaceId: acme.id,
      path: "wiki/cold-chain-sla",
      title: "Cold-Chain SLA & Reefer Escalation Playbook",
      version: 2,
      updatedById: mara.id,
      content: `# Cold-Chain SLA & Reefer Escalation Playbook

Linked from \`[[memory/AGENTS.md]]\` and \`[[memory/ops-MEMORY.md]]\`.

## Temperature Thresholds
- **Chilled Produce & Dairy**: \`1.0 °C\` to \`4.5 °C\` (Alert at \`> 5.0 °C\`)
- **Pharma GDP Annex (Nordway)**: \`2.0 °C\` to \`8.0 °C\` strict continuous logging

## Escalation Steps
1. **Ops Agent** highlights the row red in **Dock Planner** (\`#ops\`).
2. **Ops Agent** posts an inline **Approval Card** to reassign the trailer to **Bay 06 (Shore Power)**.
3. Warehouse lead approves via Vault (\`yard-gate-api\`).`,
    },
    {
      workspaceId: acme.id,
      path: "wiki/month-close-checklist",
      title: "Finance Month Close & Stripe Reconciliation",
      version: 1,
      updatedById: tom.id,
      content: `# Finance Month Close Checklist

Linked from \`[[memory/AGENTS.md]]\`.

1. **Finance Agent** pulls Stripe balance transactions via \`stripe-live-read\` in Vault.
2. Matches payouts against **Exact Online** invoices in the **Month Close** app (\`#finance\`).
3. Any invoice > 60 days overdue is queued in **Feed** as an approval draft for **Tom Reyes**.`,
    },
  ]);

  // 12. Seed Cloud Agent Computers & Browser Machines (with Sign-In Handoff)
  await db.insert(machines).values([
    {
      workspaceId: acme.id,
      name: "acme-agent-computer-par1",
      kind: "cloud_computer",
      region: "Scaleway Paris (fr-par-1)",
      specs: "4 vCPU · 8 GB RAM · 40 GB NVMe · Docker Sandbox",
      ipAddress: "51.159.42.18 (Dedicated EU IP)",
      status: "online",
      activeAgentName: "Ops Agent & Sales Agent",
      currentUrl: "http://localhost:3000 (Dock Planner + Deals Tracker)",
      handoffRequested: false,
    },
    {
      workspaceId: acme.id,
      name: "sales-chrome-paris",
      kind: "browser_machine",
      region: "Paris · Residential Fixed IP",
      specs: "Headless Chrome 131 · CDP + Live noVNC Stream",
      ipAddress: "51.158.114.90",
      status: "handoff",
      activeAgentName: "Sales Agent",
      currentUrl: "https://www.linkedin.com/messaging/thread/kestrel-fresh-intro",
      handoffRequested: true,
      handoffReason: "LinkedIn requested 2FA verification for Mara's account. Sign in on the live screen while Sales Agent is locked out, then click 'Hand back to agent'.",
    },
    {
      workspaceId: acme.id,
      name: "ivos-macbook-pro",
      kind: "local_host",
      region: "Local Machine Bridge (macOS arm64)",
      specs: "Apple M4 Max · ~/acme/website · Claude Code CLI",
      ipAddress: "127.0.0.1 (conclave connect)",
      status: "driving",
      activeAgentName: "Ivo's Claude",
      currentUrl: "file:///Users/ivo/acme/website/src/PricingGrid.tsx",
      handoffRequested: false,
    },
  ]);

  console.log("✅ Laze-inspired ACME Workspace seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
