'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type ProspectStatus = 'New' | 'Contacted' | 'Qualified' | 'Nurturing';
type FilterStatus = 'All prospects' | ProspectStatus;

type Prospect = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  industry: string;
  status: ProspectStatus;
  source: string;
  lastActive: string;
  initials: string;
  tone: string;
};

const sampleProspects: Prospect[] = [
  { id: 'p-1', name: 'Olivia Rhye', role: 'Head of Growth', company: 'Layers', email: 'olivia@layers.com', industry: 'Software', status: 'Qualified', source: 'Website', lastActive: '12 min ago', initials: 'OR', tone: 'peach' },
  { id: 'p-2', name: 'Phoenix Baker', role: 'Product Manager', company: 'Circooles', email: 'phoenix@circooles.com', industry: 'Technology', status: 'New', source: 'LinkedIn', lastActive: '34 min ago', initials: 'PB', tone: 'violet' },
  { id: 'p-3', name: 'Lana Steiner', role: 'VP of Marketing', company: 'Catalog', email: 'lana@catalog.com', industry: 'Marketing', status: 'Contacted', source: 'Referral', lastActive: '1 hour ago', initials: 'LS', tone: 'mint' },
  { id: 'p-4', name: 'Demi Wilkinson', role: 'Founder & CEO', company: 'Quotient', email: 'demi@quotient.com', industry: 'Software', status: 'Qualified', source: 'Website', lastActive: '2 hours ago', initials: 'DW', tone: 'blue' },
  { id: 'p-5', name: 'Candice Wu', role: 'Director of Sales', company: 'Sisyphus', email: 'candice@sisyphus.com', industry: 'Business services', status: 'Nurturing', source: 'Event', lastActive: '3 hours ago', initials: 'CW', tone: 'rose' },
  { id: 'p-6', name: 'Natali Craig', role: 'Growth Lead', company: 'Company XYZ', email: 'natali@companyxyz.com', industry: 'Technology', status: 'New', source: 'LinkedIn', lastActive: '5 hours ago', initials: 'NC', tone: 'gold' },
  { id: 'p-7', name: 'Drew Cano', role: 'Founder', company: 'Acme Co.', email: 'drew@acmeco.com', industry: 'Finance', status: 'Contacted', source: 'Import', lastActive: 'Yesterday', initials: 'DC', tone: 'slate' },
  { id: 'p-8', name: 'Orlando Diggs', role: 'RevOps Manager', company: 'Velocity', email: 'orlando@velocity.io', industry: 'Software', status: 'Qualified', source: 'Website', lastActive: 'Yesterday', initials: 'OD', tone: 'teal' },
];

const statusFilters: FilterStatus[] = ['All prospects', 'New', 'Contacted', 'Qualified', 'Nurturing'];
const storageKey = 'signaldesk-prospects-v1';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
    users: <><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H7.4A3.4 3.4 0 0 0 4 18.4V20" /><circle cx="10" cy="7" r="3.2" /><path d="M20 20v-1.5a3.2 3.2 0 0 0-2.5-3.1M16.4 3.9a3.2 3.2 0 0 1 0 6.2" /></>,
    send: <><path d="m21 3-7.3 18-3.9-7.8L2 9.3 21 3Z" /><path d="M9.8 13.2 21 3" /></>,
    chart: <><path d="M4 19.5h16" /><path d="M6.5 16V10M12 16V5M17.5 16v-3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" transform="translate(1.5 1.5) scale(.875)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19v2h16v-2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.sparkle}</svg>;
}

function initialsFromName(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function Home() {
  const [prospects, setProspects] = useState<Prospect[]>(sampleProspects);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All prospects');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', role: '', company: '', email: '', industry: 'Software', status: 'New' as ProspectStatus });

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Prospect[];
        if (Array.isArray(parsed)) setProspects(parsed);
      }
    } catch {
      // Keep the in-file sample workspace if browser storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(prospects));
    } catch {
      // The current session remains usable when browser storage is unavailable.
    }
  }, [hydrated, prospects]);

  useEffect(() => {
    if (!isAddOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAddOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAddOpen]);

  const filteredProspects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return prospects.filter((prospect) => {
      const matchesFilter = activeFilter === 'All prospects' || prospect.status === activeFilter;
      const matchesQuery = !normalizedQuery || [prospect.name, prospect.role, prospect.company, prospect.email, prospect.industry].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, prospects, query]);

  const counts = useMemo(() => ({
    'All prospects': prospects.length,
    New: prospects.filter((prospect) => prospect.status === 'New').length,
    Contacted: prospects.filter((prospect) => prospect.status === 'Contacted').length,
    Qualified: prospects.filter((prospect) => prospect.status === 'Qualified').length,
    Nurturing: prospects.filter((prospect) => prospect.status === 'Nurturing').length,
  }), [prospects]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const handleAddProspect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const newProspect: Prospect = {
      id: `p-${Date.now()}`,
      name,
      role: form.role.trim() || 'Role not added',
      company: form.company.trim() || 'Company not added',
      email: form.email.trim(),
      industry: form.industry,
      status: form.status,
      source: 'Manual entry',
      lastActive: 'Just now',
      initials: initialsFromName(name),
      tone: 'blue',
    };
    setProspects((current) => [newProspect, ...current]);
    setActiveFilter('All prospects');
    setQuery('');
    setForm({ name: '', role: '', company: '', email: '', industry: 'Software', status: 'New' });
    setIsAddOpen(false);
    showNotice(`${name} added to your prospects`);
  };

  const exportCsv = () => {
    if (!filteredProspects.length) {
      showNotice('No prospects to export');
      return;
    }
    const columns = ['Name', 'Role', 'Company', 'Email', 'Industry', 'Status', 'Source', 'Last active'];
    const rows = filteredProspects.map((prospect) => [prospect.name, prospect.role, prospect.company, prospect.email, prospect.industry, prospect.status, prospect.source, prospect.lastActive]);
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'signaldesk-prospects.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showNotice(`${filteredProspects.length} prospects exported`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="SignalDesk home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>signal<span className="brand-light">desk</span></span>
        </a>

        <div className="workspace-card">
          <div className="workspace-avatar">S</div>
          <div className="workspace-copy"><span className="eyebrow">Workspace</span><strong>Studio North</strong></div>
          <Icon name="chevron" size={15} />
        </div>

        <p className="nav-label">Workspace</p>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><Icon name="grid" /><span>Overview</span></a>
          <a className="nav-item" href="#prospects"><Icon name="users" /><span>Prospects</span><span className="nav-count">{prospects.length}</span></a>
          <button className="nav-item nav-disabled" type="button" disabled title="Sequences are not part of this demo yet"><Icon name="send" /><span>Sequences</span><span className="soon-label">Soon</span></button>
          <button className="nav-item nav-disabled" type="button" disabled title="Reports are not part of this demo yet"><Icon name="chart" /><span>Reports</span><span className="soon-label">Soon</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Icon name="sparkle" size={16} /></div>
            <strong>Make every lead count</strong>
            <p>Your workspace is running on sample data.</p>
            <span className="plan-link">Explore the demo <Icon name="arrow" size={13} /></span>
          </div>
          <button className="profile-button" type="button" onClick={() => showNotice('Account settings are not part of this demo yet')}>
            <span className="profile-avatar">SC</span>
            <span className="profile-copy"><strong>Sarah Chen</strong><small>Admin workspace</small></span>
            <span className="profile-dots">•••</span>
          </button>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14} /><strong>Overview</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Icon name="search" size={17} /><input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prospects" aria-label="Search prospects" /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" type="button" aria-label="Notifications" onClick={() => showNotice('You’re all caught up')}><span className="notification-dot" /><Icon name="bell" size={17} /></button>
            <span className="topbar-avatar" aria-label="Sarah Chen">SC</span>
          </div>
        </header>

        <div className="page-content">
          <div className="demo-banner"><span className="demo-dot" /><span><strong>Demo workspace</strong> &nbsp;All contacts and metrics below are sample data, stored only in this browser.</span><button type="button" aria-label="Dismiss demo notice" onClick={(event) => event.currentTarget.parentElement?.remove()}><Icon name="close" size={15} /></button></div>

          <section className="welcome-row">
            <div>
              <p className="date-line">YOUR PIPELINE AT A GLANCE</p>
              <h1>Good morning, Sarah <span className="wave">✦</span></h1>
              <p className="page-subtitle">Here’s what’s happening with your pipeline today.</p>
            </div>
            <div className="welcome-actions">
              <button className="button button-secondary" type="button" onClick={exportCsv}><Icon name="download" size={16} /> Export list</button>
              <button className="button button-primary" type="button" onClick={() => setIsAddOpen(true)}><Icon name="plus" size={17} /> Add prospect</button>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Pipeline summary">
            <article className="metric-card">
              <div className="metric-heading"><span>Total prospects</span><span className="metric-icon metric-purple"><Icon name="users" size={17} /></span></div>
              <div className="metric-value">2,184 <span className="trend positive">↗ 12.8%</span></div>
              <div className="metric-foot">vs. last month <span className="metric-foot-right">Sample metric</span></div>
              <div className="mini-bars" aria-hidden="true"><i style={{ height: '35%' }} /><i style={{ height: '48%' }} /><i style={{ height: '42%' }} /><i style={{ height: '61%' }} /><i style={{ height: '50%' }} /><i style={{ height: '70%' }} /><i style={{ height: '62%' }} /><i style={{ height: '82%' }} /><i style={{ height: '75%' }} /><i style={{ height: '100%' }} /></div>
            </article>
            <article className="metric-card">
              <div className="metric-heading"><span>Qualified leads</span><span className="metric-icon metric-green"><Icon name="sparkle" size={17} /></span></div>
              <div className="metric-value">486 <span className="trend positive">↗ 8.2%</span></div>
              <div className="metric-foot">vs. last month <span className="metric-foot-right">Sample metric</span></div>
              <div className="metric-progress"><span style={{ width: '68%' }} /></div>
              <div className="progress-caption"><span>Monthly target</span><strong>68%</strong></div>
            </article>
            <article className="metric-card">
              <div className="metric-heading"><span>Avg. response rate</span><span className="metric-icon metric-orange"><Icon name="send" size={16} /></span></div>
              <div className="metric-value">24.8% <span className="trend positive">↗ 3.4%</span></div>
              <div className="metric-foot">vs. last month <span className="metric-foot-right">Sample metric</span></div>
              <div className="response-dots" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="progress-caption"><span>Industry avg. <strong>16.2%</strong></span><span className="above-average">Above average</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-heading"><span>Meetings booked</span><span className="metric-icon metric-blue"><Icon name="chart" size={17} /></span></div>
              <div className="metric-value">32 <span className="trend positive">↗ 18.5%</span></div>
              <div className="metric-foot">vs. last month <span className="metric-foot-right">Sample metric</span></div>
              <div className="meeting-spark" aria-label="Illustrative meeting trend, sample data"><svg viewBox="0 0 220 42" preserveAspectRatio="none"><path className="spark-fill" d="M0 34 C16 31 18 17 34 22 S58 31 72 20 S95 24 108 16 S131 27 144 15 S164 20 176 9 S198 16 220 3 V42 H0Z" /><path className="spark-line" d="M0 34 C16 31 18 17 34 22 S58 31 72 20 S95 24 108 16 S131 27 144 15 S164 20 176 9 S198 16 220 3" /></svg></div>
            </article>
          </section>

          <section className="insights-grid" aria-label="Pipeline insights">
            <article className="panel activity-panel">
              <div className="panel-heading"><div><h2>Lead activity</h2><p>Prospects added over the last 7 days</p></div><button className="select-button" type="button" onClick={() => showNotice('Showing the last 7 days')}>Last 7 days <Icon name="chevron" size={14} /></button></div>
              <div className="activity-chart-wrap"><div className="chart-y-labels"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="activity-chart"><div className="chart-gridline" /><div className="chart-gridline" /><div className="chart-gridline" /><div className="chart-gridline" /><svg viewBox="0 0 700 174" preserveAspectRatio="none" role="img" aria-label="Sample prospect activity trend for seven days"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7868e8" stopOpacity=".19" /><stop offset="100%" stopColor="#7868e8" stopOpacity="0" /></linearGradient></defs><path d="M0 138 C35 132 40 96 82 105 S135 125 177 91 S231 99 275 80 S330 112 368 77 S423 82 461 57 S514 87 552 52 S614 69 650 28 S679 36 700 18 V174 H0Z" fill="url(#chartFill)" /><path d="M0 138 C35 132 40 96 82 105 S135 125 177 91 S231 99 275 80 S330 112 368 77 S423 82 461 57 S514 87 552 52 S614 69 650 28 S679 36 700 18" fill="none" stroke="#7868e8" strokeWidth="3" vectorEffect="non-scaling-stroke" /><circle cx="700" cy="18" r="4" fill="#fff" stroke="#7868e8" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div>
              <div className="chart-legend"><span><i className="legend-dot purple-dot" /> New prospects</span><span className="chart-total"><strong>128</strong> added this week</span></div>
            </article>
            <article className="panel source-panel">
              <div className="panel-heading"><div><h2>Lead sources</h2><p>Where your prospects come from</p></div><button className="more-button" type="button" aria-label="More lead source options" onClick={() => showNotice('Lead source breakdown uses sample data')}><span>•••</span></button></div>
              <div className="source-total"><strong>2,184</strong><span>total prospects</span></div>
              <div className="source-list">
                <div className="source-row"><div className="source-meta"><span><i className="source-icon source-linkedin">in</i> LinkedIn</span><strong>42%</strong></div><div className="source-track"><i style={{ width: '42%', background: '#7565df' }} /></div></div>
                <div className="source-row"><div className="source-meta"><span><i className="source-icon source-web"><Icon name="grid" size={12} /></i> Website</span><strong>28%</strong></div><div className="source-track"><i style={{ width: '28%', background: '#39b899' }} /></div></div>
                <div className="source-row"><div className="source-meta"><span><i className="source-icon source-event"><Icon name="users" size={12} /></i> Events</span><strong>18%</strong></div><div className="source-track"><i style={{ width: '18%', background: '#ee9d59' }} /></div></div>
                <div className="source-row"><div className="source-meta"><span><i className="source-icon source-other"><Icon name="plus" size={12} /></i> Other</span><strong>12%</strong></div><div className="source-track"><i style={{ width: '12%', background: '#9ca3af' }} /></div></div>
              </div>
            </article>
          </section>

          <section className="panel prospects-panel" id="prospects">
            <div className="prospects-heading"><div><div className="title-with-count"><h2>Your prospects</h2><span className="count-pill">{prospects.length}</span></div><p>Keep your pipeline moving forward.</p></div><div className="table-actions"><button className="button button-secondary button-small" type="button" onClick={() => showNotice('Advanced filters are coming soon')}><Icon name="filter" size={15} /> Filters</button><button className="button button-primary button-small" type="button" onClick={() => setIsAddOpen(true)}><Icon name="plus" size={16} /> Add prospect</button></div></div>
            <div className="table-controls"><div className="filter-tabs" role="tablist" aria-label="Filter prospects by status">{statusFilters.map((filter) => <button key={filter} className={`filter-tab ${activeFilter === filter ? 'selected' : ''}`} type="button" role="tab" aria-selected={activeFilter === filter} onClick={() => setActiveFilter(filter)}>{filter}<span>{counts[filter]}</span></button>)}</div><label className="table-search"><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this list" aria-label="Search this list" /></label></div>
            <div className="table-scroll"><table><thead><tr><th scope="col"><input type="checkbox" aria-label="Select all visible prospects" onChange={(event) => showNotice(event.target.checked ? 'Bulk actions are coming soon' : 'Selection cleared')} /></th><th scope="col">Name</th><th scope="col">Company</th><th scope="col">Industry</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Last active</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredProspects.map((prospect) => <tr key={prospect.id}><td><input type="checkbox" aria-label={`Select ${prospect.name}`} onChange={(event) => { if (event.target.checked) showNotice(`${prospect.name} selected`); }} /></td><td><div className="person-cell"><span className={`person-avatar tone-${prospect.tone}`}>{prospect.initials}</span><span className="person-info"><strong>{prospect.name}</strong><small>{prospect.role}</small></span></div></td><td><div className="company-cell"><span className="company-mark">{prospect.company.slice(0, 1).toUpperCase()}</span><strong>{prospect.company}</strong></div></td><td><span className="industry-cell">{prospect.industry}</span></td><td><span className={`status-badge status-${prospect.status.toLowerCase()}`}><i />{prospect.status}</span></td><td><span className="source-cell">{prospect.source}</span></td><td><span className="last-active">{prospect.lastActive}</span></td><td><button className="row-menu" type="button" aria-label={`More options for ${prospect.name}`} onClick={() => showNotice(`More actions for ${prospect.name} are coming soon`)}>•••</button></td></tr>)}</tbody></table>{filteredProspects.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name="search" size={20} /></span><strong>No prospects found</strong><p>Try another search or status filter.</p><button className="text-button" type="button" onClick={() => { setQuery(''); setActiveFilter('All prospects'); }}>Clear filters</button></div>}</div>
            <div className="table-footer"><span>Showing <strong>{filteredProspects.length ? 1 : 0}–{filteredProspects.length}</strong> of <strong>{prospects.length}</strong> prospects</span><div><button type="button" disabled aria-label="Previous page">← Previous</button><button type="button" disabled aria-label="Next page">Next →</button></div></div>
          </section>

          <footer className="page-footer"><span>© 2024 SignalDesk</span><span><a href="#overview">Help center</a><a href="#overview">Privacy</a><a href="#overview">Terms</a></span></footer>
        </div>
      </section>

      {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}</div>}

      {isAddOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddOpen(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="modal-kicker">YOUR PIPELINE</span><h2 id="modal-title">Add a prospect</h2><p>Add someone new to your sample workspace.</p></div><button className="icon-button modal-close" type="button" aria-label="Close dialog" onClick={() => setIsAddOpen(false)}><Icon name="close" size={18} /></button></div><form onSubmit={handleAddProspect}><label className="form-field"><span>Full name <i>*</i></span><input required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Alex Morgan" /></label><div className="form-two-col"><label className="form-field"><span>Job title</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="e.g. VP of Growth" /></label><label className="form-field"><span>Company</span><input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Acme Inc." /></label></div><label className="form-field"><span>Work email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="alex@company.com" /></label><div className="form-two-col"><label className="form-field"><span>Industry</span><select value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })}><option>Software</option><option>Technology</option><option>Finance</option><option>Marketing</option><option>Business services</option><option>Healthcare</option><option>Other</option></select></label><label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProspectStatus })}><option>New</option><option>Contacted</option><option>Qualified</option><option>Nurturing</option></select></label></div><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setIsAddOpen(false)}>Cancel</button><button className="button button-primary" type="submit"><Icon name="plus" size={16} /> Add prospect</button></div></form></section></div>}
    </main>
  );
}
