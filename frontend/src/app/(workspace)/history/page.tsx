'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ScanLine,
  ArrowUpRight,
  Shield,
  Gauge,
  Code2,
  BookOpen,
  Network,
  ChevronRight,
} from 'lucide-react';
import { api, date, errorMessage } from '@/lib/api';
import { Project, Review } from '@/lib/types';
import { ErrorBanner, Loading } from '@/components/ui';
import { ReviewResult } from '@/components/review-result';
const icons: Record<string, typeof Shield> = {
  security: Shield,
  performance: Gauge,
  quality: Code2,
  documentation: BookOpen,
  architecture: Network,
};
export default function HistoryPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Review | null>(null);
  const [page, setPage] = useState(0);
  useEffect(() => {
    api<Project[]>('/projects')
      .then(setProjects)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api<Review[]>(`/reviews?q=${encodeURIComponent(query)}&limit=30&offset=${page * 30}`)
        .then((r) => {
          if (active) setReviews(r);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, page]);
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVERY INSIGHT, KEPT CLOSE</span>
          <h1>
            Review history<span className="heading-dot">.</span>
          </h1>
          <p>Your code evolves. Your insights stay with you.</p>
        </div>
        <Link className="btn" href="/projects">
          Go to projects <ArrowUpRight size={17} />
        </Link>
      </div>
      <ErrorBanner message={error} />
      <div className="history-layout">
        <section>
          <div className="section-toolbar">
            <h2>Recent analyses</h2>
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Search reviews"
                placeholder="Search findings, projects…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
          {loading ? (
            <Loading />
          ) : reviews.length ? (
            <div className="history-list">
              {reviews.map((r) => {
                const Icon = icons[r.mode] || ScanLine;
                return (
                  <button
                    key={r.id}
                    className={`history-card ${selected?.id === r.id ? 'selected' : ''}`}
                    onClick={() => setSelected(r)}
                  >
                    <span className="history-icon">
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong className="capitalize">{r.mode} analysis</strong>
                      <span>
                        {projects.find((p) => p.id === r.project_id)?.name || 'Project'}{' '}
                        <span className="muted">·</span> {r.file_paths.length} files
                      </span>
                      <small>
                        {date(r.created_at)} <span className="muted">·</span>{' '}
                        {r.result.issues.length} findings
                      </small>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <ScanLine size={30} />
              <h3>{query ? 'No matching reviews' : 'Your insights will live here.'}</h3>
              <p>
                {query
                  ? 'Try another keyword or project name.'
                  : 'Run your first analysis from a project workspace.'}
              </p>
            </div>
          )}
          <div className="pagination">
            <button
              className="btn small"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="muted">Page {page + 1}</span>
            <button
              className="btn small"
              disabled={reviews.length < 30 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <section className="history-detail">
          {selected ? (
            <>
              <div className="history-detail-top">
                <Link href={`/projects/${selected.project_id}`}>
                  Open project <ArrowUpRight size={14} />
                </Link>
                <button className="text-button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
              <ReviewResult key={selected.id} review={selected} />
            </>
          ) : (
            <div className="detail-placeholder">
              <div className="placeholder-orbit">
                <ScanLine size={32} />
              </div>
              <h3>A closer look.</h3>
              <p>
                Select an analysis to explore its findings,
                <br />
                recommendations, and generated artifacts.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
