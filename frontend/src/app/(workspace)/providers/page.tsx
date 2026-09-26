'use client';
import { useEffect, useState } from 'react';
import {
  Plus,
  SlidersHorizontal,
  ShieldCheck,
  Server,
  Globe,
  Pencil,
  Trash2,
  PlugZap,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Provider } from '@/lib/types';
import { ErrorBanner, Loading, Modal } from '@/components/ui';
const presets = [
  {
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    model: '',
    local: false,
  },
  {
    name: 'LM Studio',
    base_url: 'http://localhost:1234/v1',
    model: '',
    local: true,
  },
  {
    name: 'Ollama',
    base_url: 'http://localhost:11434/v1',
    model: '',
    local: true,
  },
  {
    name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1',
    model: '',
    local: false,
  },
  { name: 'Groq', base_url: 'https://api.groq.com/openai/v1', model: '', local: false },
  { name: 'Custom endpoint', base_url: '', model: '', local: false },
];
export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [form, setForm] = useState({
    name: 'OpenAI',
    base_url: presets[0].base_url,
    model: '',
    api_key: '',
  });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState('');
  const [tested, setTested] = useState('');
  useEffect(() => {
    api<Provider[]>('/providers')
      .then(setProviders)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  function open(provider?: Provider) {
    setEditing(provider || null);
    setForm(
      provider
        ? {
            name: provider.name,
            base_url: provider.base_url,
            model: provider.model,
            api_key: '',
          }
        : {
            name: 'OpenAI',
            base_url: presets[0].base_url,
            model: '',
            api_key: '',
          },
    );
    setError('');
    setModal(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const p = await api<Provider>(editing ? `/providers/${editing.id}` : '/providers', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      setProviders((all) => (editing ? all.map((v) => (v.id === p.id ? p : v)) : [...all, p]));
      setModal(false);
      setTested('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function test(p: Provider) {
    setTesting(p.id);
    setTested('');
    setError('');
    try {
      await api(`/providers/${p.id}/test`, { method: 'POST' });
      setTested(p.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setTesting('');
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/providers/${deleting.id}`, { method: 'DELETE' });
      setProviders((all) => all.filter((p) => p.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INTELLIGENCE, ON YOUR TERMS</span>
          <h1>
            AI providers<span className="heading-dot">.</span>
          </h1>
          <p>Connect the model that fits the way you build.</p>
        </div>
        <button className="btn primary" onClick={() => open()}>
          <Plus size={17} /> Add provider
        </button>
      </div>
      <ErrorBanner message={error} />
      <div className="provider-info">
        <div className="info-icon">
          <ShieldCheck size={25} />
        </div>
        <div>
          <strong>Your keys. Your choice. Your control.</strong>
          <p>
            Saved API keys are encrypted; environment keys stay on the server. Keys are never
            returned to your browser. Code is sent only to the provider you select when you run an
            analysis or chat.
          </p>
        </div>
      </div>
      <div className="section-toolbar">
        <h2>
          Connected providers <span className="count-pill">{providers.length}</span>
        </h2>
        <span className="muted text-sm">OpenAI-compatible endpoints</span>
      </div>
      {loading ? (
        <Loading />
      ) : providers.length ? (
        <div className="provider-grid">
          {providers.map((p) => (
            <article className="provider-card" key={p.id}>
              <div className="provider-card-top">
                <span className="folder-icon">
                  {p.base_url.includes('localhost') || p.base_url.includes('127.0.0.1') ? (
                    <Server size={23} />
                  ) : (
                    <Globe size={23} />
                  )}
                </span>
                <div className="row">
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${p.name}`}
                    disabled={p.environment_managed}
                    title={p.environment_managed ? 'Managed in backend .env' : 'Edit provider'}
                    onClick={() => open(p)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Delete ${p.name}`}
                    disabled={p.environment_managed}
                    title={p.environment_managed ? 'Managed in backend .env' : 'Remove provider'}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3>{p.name}</h3>
              <div className="model-tag">{p.model}</div>
              <p className="endpoint">{p.base_url}</p>
              <div className="provider-card-footer">
                <span className="text-sm muted">
                  <ShieldCheck size={14} />
                  {p.environment_managed
                    ? 'Private server configuration'
                    : p.has_api_key
                      ? 'Key encrypted'
                      : 'No API key'}
                </span>
                <button className="btn small" disabled={!!testing} onClick={() => test(p)}>
                  {testing === p.id ? (
                    <Loader2 className="spin" size={14} />
                  ) : tested === p.id ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <PlugZap size={14} />
                  )}{' '}
                  {tested === p.id
                    ? 'Connected'
                    : testing === p.id
                      ? 'Testing…'
                      : 'Test connection'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <SlidersHorizontal size={32} />
          <h3>Choose your intelligence.</h3>
          <p>Connect OpenAI, Groq, LM Studio, Ollama, OpenRouter, or your own endpoint.</p>
          <button className="btn primary" onClick={() => open()}>
            <Plus size={17} /> Connect your first provider
          </button>
        </div>
      )}
      <div className="provider-help">
        <h3>Cloud power or local privacy.</h3>
        <div>
          <p>
            <Globe size={19} />
            <span>
              <strong>Cloud models</strong>Use your provider’s API key and an available model name.
              Check pricing with your provider before sending code.
            </span>
          </p>
          <p>
            <Server size={19} />
            <span>
              <strong>Local models</strong>Start the OpenAI-compatible server in LM Studio or
              Ollama. The endpoint must be accessible from the backend.
            </span>
          </p>
        </div>
        <a href="https://lmstudio.ai/docs/developer/openai-compat" target="_blank" rel="noreferrer">
          LM Studio setup reference <ArrowUpRight size={14} />
        </a>
      </div>
      {modal && (
        <Modal
          title={editing ? 'Edit provider' : 'Connect an AI provider'}
          close={() => {
            if (!busy) setModal(false);
          }}
        >
          <form onSubmit={save}>
            {!editing && (
              <label>
                Provider preset
                <select
                  onChange={(e) => {
                    const p = presets[Number(e.target.value)];
                    setForm({
                      name: p.name,
                      base_url: p.base_url,
                      model: p.model,
                      api_key: '',
                    });
                  }}
                >
                  {presets.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Display name
              <input
                required
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Base URL
              <input
                required
                type="url"
                value={form.base_url}
                maxLength={500}
                placeholder="http://localhost:1234/v1"
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </label>
            <label>
              Model name
              <input
                required
                value={form.model}
                maxLength={150}
                placeholder="Exact model ID from your provider"
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            <label>
              API key <span className="muted">(optional for local models)</span>
              <input
                type="password"
                value={form.api_key}
                autoComplete="off"
                placeholder={
                  editing?.has_api_key
                    ? 'Leave empty to keep saved key'
                    : 'Enter your provider API key'
                }
                maxLength={2000}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              />
            </label>
            <p className="form-help">
              Localhost refers to the backend’s machine. In Docker, use host.docker.internal to
              reach a local model.
            </p>
            <ErrorBanner message={error} />
            <div className="modal-actions">
              <button className="btn" type="button" onClick={() => setModal(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? <Loader2 className="spin" size={16} /> : <PlugZap size={16} />} Save
                provider
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Remove this provider?"
          close={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            Remove <strong>{deleting.name}</strong> and its saved key? Past reviews will remain
            available.
          </p>
          <ErrorBanner message={error} />
          <div className="modal-actions">
            <button className="btn" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button className="btn danger" disabled={busy} onClick={remove}>
              Remove provider
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
