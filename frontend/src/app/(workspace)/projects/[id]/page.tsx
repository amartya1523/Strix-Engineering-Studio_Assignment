'use client';
import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileCode2,
  Upload,
  Shield,
  Gauge,
  Code2,
  BookOpen,
  Network,
  Play,
  MessageSquare,
  ScanLine,
  Send,
  Sparkles,
  Loader2,
  Check,
  Copy,
  History,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { ChatHistory, ChatMessage, CodeFile, Project, Provider, Review } from '@/lib/types';
import { ErrorBanner, Loading } from '@/components/ui';
import { FileTree } from '@/components/file-tree';
import { CodeViewer } from '@/components/code-viewer';
import { Markdown, ReviewResult } from '@/components/review-result';
const modes = [
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    description: 'Credentials, input validation, and access control',
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: Gauge,
    description: 'Slow operations and resource efficiency',
  },
  {
    id: 'quality',
    title: 'Code quality',
    icon: Code2,
    description: 'Clarity, structure, and maintainability',
  },
  {
    id: 'documentation',
    title: 'Documentation',
    icon: BookOpen,
    description: 'README, setup guide, and API documentation',
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: Network,
    description: 'Components, data flow, and design decisions',
  },
];
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<CodeFile | null>(null);
  const [line, setLine] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('quality');
  const [tab, setTab] = useState<'review' | 'chat'>('review');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const uploadInput = useRef<HTMLInputElement>(null);
  const previewRequest = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Project>(`/projects/${id}`),
      api<CodeFile[]>(`/projects/${id}/files`),
      api<Provider[]>('/providers'),
      api<Review[]>(`/reviews?project_id=${id}`),
      api<ChatHistory>(`/projects/${id}/chat`),
    ])
      .then(([p, f, ps, rs, ch]) => {
        if (!alive) return;
        setProject(p);
        setFiles(f);
        setProviders(ps);
        setProvider(ps[0]?.id || '');
        setReviews(rs);
        setReview(rs[0] || null);
        setSession(ch.session_id);
        setMessages(ch.messages);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, sending]);
  async function preview(file: CodeFile, targetLine: number | null = null) {
    const requestId = ++previewRequest.current;
    setPreviewLoading(true);
    setPreviewError('');
    setLine(targetLine);
    try {
      const result = await api<CodeFile>(`/projects/${id}/files/${file.id}`);
      if (requestId === previewRequest.current) setActive(result);
    } catch (e) {
      if (requestId === previewRequest.current) setPreviewError(errorMessage(e));
    } finally {
      if (requestId === previewRequest.current) setPreviewLoading(false);
    }
  }
  async function upload(list: FileList | File[]) {
    if (!list.length || uploading) return;
    setUploading(true);
    setError('');
    setNotice('');
    const form = new FormData();
    Array.from(list).forEach((file) => form.append('files', file, file.name));
    try {
      const uploaded = await api<CodeFile[]>(`/projects/${id}/files`, {
        method: 'POST',
        body: form,
      });
      const all = await api<CodeFile[]>(`/projects/${id}/files`);
      setFiles(all);
      setNotice(
        `${uploaded.length} source file${uploaded.length === 1 ? '' : 's'} uploaded successfully.`,
      );
      if (active) {
        const updated = all.find((f) => f.id === active.id);
        if (updated) await preview(updated);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (uploadInput.current) uploadInput.current.value = '';
    }
  }
  async function run() {
    setRunning(true);
    setError('');
    try {
      const result = await api<Review>(`/projects/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          provider_id: provider,
          mode,
          file_ids: selected,
        }),
      });
      setReview(result);
      setReviews((all) => [result, ...all]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setSending(true);
    setError('');
    const text = question;
    try {
      const result = await api<{
        session_id: string;
        answer: string;
        context_files: string[];
      }>(`/projects/${id}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          provider_id: provider,
          question: text,
          session_id: session,
        }),
      });
      setSession(result.session_id);
      setMessages((all) => [
        ...all,
        { id: crypto.randomUUID(), role: 'user', content: text },
        { id: crypto.randomUUID(), role: 'assistant', content: result.answer },
      ]);
      setQuestion('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(active?.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard unavailable. Select and copy the code manually.');
    }
  }
  const currentMode = modes.find((m) => m.id === mode)!;
  if (loading)
    return (
      <main className="page">
        <Loading />
      </main>
    );
  if (!project)
    return (
      <main className="page">
        <ErrorBanner message={error} />
        <Link className="btn" href="/projects">
          <ArrowLeft size={16} />
          Back to projects
        </Link>
      </main>
    );
  return (
    <main className="project-page">
      <Link href="/projects" className="back-link">
        <ArrowLeft size={14} /> All projects
      </Link>
      <div className="page-heading project-heading">
        <div>
          <span className="eyebrow">PROJECT WORKSPACE</span>
          <h1>
            {project.name}
            <span className="heading-dot">.</span>
          </h1>
          <p>{project.description || 'Explore your code. Find your next improvement.'}</p>
        </div>
        <div className="project-header-meta">
          <span>
            <FileCode2 size={16} />
            {files.length} source files
          </span>
          <span>
            <ScanLine size={16} />
            {reviews.length} analyses
          </span>
        </div>
      </div>
      <ErrorBanner message={error} />
      {notice && (
        <div role="status" className="notice success">
          <Check size={16} />
          {notice}
        </div>
      )}
      <div className="workbench">
        <section className="code-workspace">
          <div className="panel-heading">
            <h2>
              <FolderOpen size={17} /> Code explorer
            </h2>
            <button
              className="btn small"
              disabled={uploading}
              onClick={() => uploadInput.current?.click()}
            >
              {uploading ? <Loader2 className="spin" size={14} /> : <Upload size={14} />} Upload
              code
            </button>
            <input
              ref={uploadInput}
              type="file"
              multiple
              className="sr-only"
              aria-label="Upload source files or ZIP"
              onChange={(e) => {
                if (e.target.files) upload(e.target.files);
              }}
            />
          </div>
          <div
            className={`upload-strip ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
          >
            <Upload size={16} />
            <span>
              Drop a ZIP or source files here <span className="muted">· 10 MB max</span>
            </span>
            <button
              className="text-button"
              disabled={uploading}
              onClick={() => uploadInput.current?.click()}
            >
              Browse
            </button>
          </div>
          <div className="explorer-body">
            <aside className="explorer-tree">
              <div className="tree-toolbar">
                <span>
                  FILES <small>{files.length}</small>
                </span>
                <button
                  className="text-button"
                  disabled={!files.length}
                  onClick={() =>
                    setSelected(selected.length === files.length ? [] : files.map((f) => f.id))
                  }
                >
                  {selected.length === files.length && files.length ? 'Clear' : 'Select all'}
                </button>
              </div>
              {files.length ? (
                <FileTree
                  files={files}
                  selected={selected}
                  active={active?.id}
                  toggle={(fileId) =>
                    setSelected((all) =>
                      all.includes(fileId) ? all.filter((v) => v !== fileId) : [...all, fileId],
                    )
                  }
                  preview={preview}
                />
              ) : (
                <div className="tree-empty">
                  <FileCode2 size={25} />
                  <p>No files yet</p>
                  <small>
                    Upload source files
                    <br />
                    to get started.
                  </small>
                </div>
              )}
              <div className="selection-note">
                {selected.length
                  ? `${selected.length} files selected for analysis`
                  : 'No selection = entire project'}
              </div>
            </aside>
            <div className="code-panel">
              {previewLoading ? (
                <Loading label="Opening file…" />
              ) : previewError ? (
                <ErrorBanner message={previewError} />
              ) : active ? (
                <>
                  <div className="code-tab">
                    <span>
                      <FileCode2 size={14} />
                      {active.path}
                    </span>
                    <button className="icon-btn" aria-label="Copy source code" onClick={copy}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <CodeViewer file={active} line={line} />
                  <div className="code-status">
                    <span>{active.language}</span>
                    <span>
                      {(active.size / 1024).toFixed(1)} KB <span className="muted">·</span> UTF-8
                    </span>
                  </div>
                </>
              ) : (
                <div className="code-placeholder">
                  <span className="placeholder-code">
                    <Code2 size={35} />
                  </span>
                  <h3>The story is in the source.</h3>
                  <p>
                    {files.length
                      ? 'Select a file to explore its code.'
                      : 'Upload your project to start exploring.'}
                  </p>
                  <div>
                    <span>ZIP archives</span>
                    <span>Source files</span>
                    <span>Syntax highlighting</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="analysis-workspace">
          <div className="analysis-tabs">
            <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
              <ScanLine size={17} /> Analysis
            </button>
            <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
              <MessageSquare size={17} /> Chat with code
            </button>
            <Sparkles size={17} className="analysis-spark" />
          </div>
          <div className="provider-selector">
            <label htmlFor="active-provider">AI PROVIDER</label>
            <div>
              <select
                id="active-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={!providers.length}
              >
                {providers.length ? (
                  providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} / {p.model}
                    </option>
                  ))
                ) : (
                  <option>No provider connected</option>
                )}
              </select>
              <ChevronDown size={14} />
            </div>
            {!providers.length && (
              <Link href="/providers">
                Connect a provider to get started <span>↗</span>
              </Link>
            )}
          </div>
          {tab === 'review' ? (
            <>
              <div className="review-controls">
                <label htmlFor="review-mode">REVIEW FOCUS</label>
                <div className="mode-grid">
                  {modes.map(({ id: modeId, title, icon: Icon }) => (
                    <button
                      key={modeId}
                      id={modeId === mode ? 'review-mode' : undefined}
                      className={mode === modeId ? 'active' : ''}
                      aria-pressed={mode === modeId}
                      onClick={() => setMode(modeId)}
                    >
                      <Icon size={16} />
                      {title}
                      {['documentation', 'architecture'].includes(modeId) && (
                        <span className="bonus-dot" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="mode-description">{currentMode.description}</p>
                <button
                  className="btn primary full"
                  onClick={run}
                  disabled={running || !provider || !files.length}
                >
                  {running ? (
                    <>
                      <Loader2 size={17} className="spin" /> Analyzing your code…
                    </>
                  ) : (
                    <>
                      <Play size={16} /> Run {mode === 'quality' ? 'code quality' : mode} analysis{' '}
                      <span className="button-count">{selected.length || files.length} files</span>
                    </>
                  )}
                </button>
                <p className="ai-note">
                  Selected code will be sent to your chosen provider. AI findings should be
                  verified.
                </p>
              </div>
              <div className="analysis-content">
                {running ? (
                  <div className="analysis-loading">
                    <span className="scanning-icon">
                      <ScanLine size={28} />
                    </span>
                    <h3>A fresh pair of eyes.</h3>
                    <p>
                      Reading your code and connecting the dots.
                      <br />
                      Local models may take a little longer.
                    </p>
                    <Loader2 size={20} className="spin" />
                  </div>
                ) : review ? (
                  <>
                    <div className="review-history-select">
                      <History size={14} />
                      <select
                        aria-label="Choose previous analysis"
                        value={review.id}
                        onChange={(e) =>
                          setReview(reviews.find((r) => r.id === e.target.value) || null)
                        }
                      >
                        {reviews.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.mode} · {new Date(r.created_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ReviewResult
                      key={review.id}
                      review={review}
                      onSource={(path, targetLine) => {
                        const file = files.find((f) => f.path === path);
                        if (file) preview(file, targetLine);
                        else
                          setError(
                            'This file is no longer in the project. The review represents an earlier upload.',
                          );
                      }}
                    />
                  </>
                ) : (
                  <div className="analysis-placeholder">
                    <span className="placeholder-orbit">
                      <Sparkles size={28} />
                    </span>
                    <h3>See what you might have missed.</h3>
                    <p>
                      Choose a focus and run an analysis.
                      <br />
                      Clear findings. Practical next steps.
                    </p>
                    <div className="analysis-steps">
                      <span>
                        01 <strong>Upload code</strong>
                      </span>
                      <span>
                        02 <strong>Choose a model</strong>
                      </span>
                      <span>
                        03 <strong>Get clarity</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="chat-panel">
              <div className="chat-messages">
                {messages.length ? (
                  messages.map((m) => (
                    <article key={m.id} className={`chat-message ${m.role}`}>
                      <span className="message-avatar">
                        {m.role === 'user' ? 'You' : <Sparkles size={16} />}
                      </span>
                      <div>
                        <strong>{m.role === 'user' ? 'You' : 'CodeAtlas'}</strong>
                        <Markdown content={m.content} />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="chat-empty">
                    <MessageSquare size={28} />
                    <h3>Your code has answers.</h3>
                    <p>
                      Ask about how it works, where things live,
                      <br />
                      or what could be improved.
                    </p>
                    {[
                      'Explain how authentication works.',
                      'Which files handle database connections?',
                      'Summarize the main components.',
                    ].map((q) => (
                      <button key={q} onClick={() => setQuestion(q)}>
                        {q}
                        <Send size={13} />
                      </button>
                    ))}
                  </div>
                )}
                {sending && (
                  <div className="chat-thinking">
                    <Loader2 className="spin" size={15} /> Thinking with your code…
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <form className="chat-input" onSubmit={ask}>
                <textarea
                  aria-label="Ask about your code"
                  placeholder="Ask something about your code…"
                  rows={2}
                  maxLength={4000}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  className="btn primary icon-only"
                  aria-label="Send question"
                  disabled={sending || !provider || !files.length || !question.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="ai-note">Uses relevant files and recent messages as context.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
