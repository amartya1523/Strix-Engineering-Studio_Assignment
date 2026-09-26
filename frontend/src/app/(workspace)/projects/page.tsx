'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Folder,
  ArrowUpRight,
  FileCode2,
  ScanLine,
  Layers3,
  Trash2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api, date, errorMessage } from '@/lib/api';
import { Project } from '@/lib/types';
import { ErrorBanner, Loading, Modal } from '@/components/ui';
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Project[]>('/projects')
      .then(setProjects)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const project = await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setProjects((p) => [project, ...p]);
      setCreating(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/projects/${deleting.id}`, { method: 'DELETE' });
      setProjects((p) => p.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const filtered = projects.filter((p) =>
    `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DEVELOPMENT DESK</span>
          <h1>
            Projects<span className="heading-dot">.</span>
          </h1>
          <p>A fresh perspective on every codebase.</p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> New project
        </button>
      </div>
      <ErrorBanner message={error} />
      <section className="welcome-card">
        <div>
          <span className="mini-label">
            <span className="live-dot" /> FROM CODE TO CLARITY
          </span>
          <h2>
            Your next great idea
            <br />
            deserves a second look.
          </h2>
          <p>
            Upload your code, choose a review, and turn
            <br className="desktop-only" /> useful insights into your next commit.
          </p>
          <button className="text-button" onClick={() => setCreating(true)}>
            Start a new project <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="graphic-code">
            <span className="graphic-file">
              <FileCode2 size={15} /> your-project.ts
            </span>
            <div>
              <i />
              <i />
              <i />
            </div>
            <div>
              <i />
              <i />
            </div>
            <div>
              <i />
              <i />
              <i />
            </div>
            <div>
              <i />
              <i />
            </div>
            <div className="graphic-success">
              <span>✓</span> A clearer path forward <SparkIcon />
            </div>
          </div>
          <span className="floating-symbol symbol-one">{'{ }'}</span>
          <span className="floating-symbol symbol-two">{'</>'}</span>
        </div>
      </section>
      <section className="stats-grid">
        <div>
          <span className="stat-icon">
            <Layers3 size={20} />
          </span>
          <div>
            <span>Total projects</span>
            <strong>{projects.length.toString().padStart(2, '0')}</strong>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <FileCode2 size={20} />
          </span>
          <div>
            <span>Source files</span>
            <strong>
              {projects
                .reduce((a, p) => a + p.file_count, 0)
                .toString()
                .padStart(2, '0')}
            </strong>
          </div>
        </div>
        <div>
          <span className="stat-icon">
            <ScanLine size={20} />
          </span>
          <div>
            <span>Completed analyses</span>
            <strong>
              {projects
                .reduce((a, p) => a + p.review_count, 0)
                .toString()
                .padStart(2, '0')}
            </strong>
          </div>
        </div>
      </section>
      <div className="section-toolbar">
        <h2>
          All projects <span className="count-pill">{projects.length}</span>
        </h2>
        <div className="search-box">
          <Search size={17} />
          <input
            aria-label="Search projects"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : filtered.length ? (
        <div className="project-grid">
          {filtered.map((p, i) => (
            <article className="project-card" key={p.id}>
              <div className="project-card-top">
                <span className={`folder-icon folder-${i % 3}`}>
                  <Folder size={23} />
                </span>
                <button
                  className="icon-btn subtle"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <Link className="project-title" href={`/projects/${p.id}`}>
                <h3>{p.name}</h3>
                <ArrowUpRight size={19} />
              </Link>
              <p>{p.description || 'Your codebase, ready for a fresh perspective.'}</p>
              <div className="project-meta">
                <span>
                  <FileCode2 size={14} />
                  {p.file_count} files
                </span>
                <span>
                  <ScanLine size={14} />
                  {p.review_count} analyses
                </span>
              </div>
              <div className="project-card-footer">
                <small>Created {date(p.created_at)}</small>
                <Link href={`/projects/${p.id}`}>
                  Open workspace <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          ))}
          <button className="new-project-card" onClick={() => setCreating(true)}>
            <span>
              <Plus size={23} />
            </span>
            <strong>Create a project</strong>
            <small>Make space for your next codebase</small>
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <Folder size={32} />
          <h3>{query ? 'No matching projects' : 'A clean slate. A new possibility.'}</h3>
          <p>
            {query
              ? 'Try another project name or description.'
              : 'Create your first project and bring your code into focus.'}
          </p>
          {!query && (
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={17} /> Create your first project
            </button>
          )}
        </div>
      )}
      {creating && (
        <Modal
          title="Create a project"
          close={() => {
            if (!busy) setCreating(false);
          }}
        >
          <p className="muted">Give your codebase a home. You can upload files next.</p>
          <form onSubmit={create}>
            <label>
              Project name
              <input name="name" placeholder="e.g. Customer portal" required maxLength={120} />
            </label>
            <label>
              Description <span className="muted">(optional)</span>
              <textarea
                name="description"
                placeholder="What are you building?"
                rows={3}
                maxLength={2000}
              />
            </label>
            <ErrorBanner message={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setCreating(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Create project
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete project?"
          close={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            This permanently deletes <strong>{deleting.name}</strong>, its uploaded files, reviews,
            and chat history.
          </p>
          <ErrorBanner message={error} />
          <div className="modal-actions">
            <button className="btn" disabled={busy} onClick={() => setDeleting(null)}>
              Keep project
            </button>
            <button className="btn danger" disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete project'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function SparkIcon() {
  return <span style={{ marginLeft: 'auto' }}>✦</span>;
}
