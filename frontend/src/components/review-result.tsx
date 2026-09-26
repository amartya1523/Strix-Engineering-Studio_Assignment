'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  Download,
  FileCode2,
  Lightbulb,
  ListFilter,
  ShieldAlert,
} from 'lucide-react';
import { Review, Issue } from '@/lib/types';
import { date, download } from '@/lib/api';
export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
export function ReviewResult({
  review,
  onSource,
}: {
  review: Review;
  onSource?: (path: string, line: number | null) => void;
}) {
  const [filter, setFilter] = useState('all');
  const issues = review.result.issues.filter((i) => filter === 'all' || i.severity === filter);
  function exportReview() {
    const r = review.result;
    download(
      `codeatlas-${review.mode}-${review.id.slice(0, 8)}.md`,
      `# ${review.mode} review\n\n${r.summary}\n\n${r.issues.map((i) => `## [${i.severity.toUpperCase()}] ${i.title}\n\n${i.file}${i.line ? ':' + i.line : ''}\n\n${i.description}\n\n**Recommendation:** ${i.recommendation}`).join('\n\n')}\n\n## Recommendations\n\n${r.recommendations.map((v) => '- ' + v).join('\n')}\n\n${r.artifact || ''}`,
    );
  }
  return (
    <div className="review-result">
      <div className="result-toolbar">
        <span className="review-status">
          <CheckCircle2 size={16} /> Analysis complete
        </span>
        <button className="btn small" onClick={exportReview}>
          <Download size={14} /> Export Markdown
        </button>
      </div>
      <div className="result-summary">
        <span className="eyebrow">THE BIG PICTURE</span>
        <h3>{review.mode.charAt(0).toUpperCase() + review.mode.slice(1)} analysis</h3>
        <p>{review.result.summary}</p>
        <div className="result-metadata">
          <span>{date(review.created_at)}</span>
          <span>
            {review.provider_name} / {review.model}
          </span>
          <span>{review.file_paths.length} files reviewed</span>
        </div>
      </div>
      <div className="severity-grid">
        {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
          <button
            key={level}
            className={`severity-counter ${level} ${filter === level ? 'chosen' : ''}`}
            onClick={() => setFilter(filter === level ? 'all' : level)}
          >
            <span>{level}</span>
            <strong>{review.result.issues.filter((i) => i.severity === level).length}</strong>
          </button>
        ))}
      </div>
      <div className="section-toolbar compact">
        <h3>
          <ShieldAlert size={17} /> Findings{' '}
          <span className="count-pill">{review.result.issues.length}</span>
        </h3>
        <button className="text-button" onClick={() => setFilter('all')}>
          <ListFilter size={14} />
          {filter === 'all' ? 'All severities' : 'Clear filter'}
        </button>
      </div>
      {issues.length ? (
        issues.map((issue, i) => <IssueCard key={i} issue={issue} onSource={onSource} />)
      ) : (
        <div className="result-empty">
          <CheckCircle2 size={22} />
          <p>
            {review.result.issues.length
              ? 'No findings at this severity.'
              : 'No issues reported in this review. Model findings are advisory; verify with your own tests.'}
          </p>
        </div>
      )}
      {review.result.recommendations.length > 0 && (
        <div className="recommendations">
          <h3>
            <Lightbulb size={18} /> Next steps
          </h3>
          <ol>
            {review.result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}
      {review.result.artifact && (
        <div className="artifact">
          <div className="section-toolbar">
            <h3>
              Generated {review.mode === 'documentation' ? 'documentation' : 'architecture summary'}
            </h3>
            <button
              className="btn small"
              onClick={() => download(`${review.mode}.md`, review.result.artifact!)}
            >
              <Download size={14} /> Download
            </button>
          </div>
          <Markdown content={review.result.artifact} />
        </div>
      )}
    </div>
  );
}
function IssueCard({
  issue,
  onSource,
}: {
  issue: Issue;
  onSource?: (path: string, line: number | null) => void;
}) {
  return (
    <article className="issue-card">
      <div className="issue-heading">
        <span className={`severity-badge ${issue.severity}`}>{issue.severity}</span>
        <h4>{issue.title}</h4>
      </div>
      <button
        className="source-reference"
        disabled={!onSource}
        onClick={() => onSource?.(issue.file, issue.line)}
      >
        <FileCode2 size={13} />
        {issue.file}
        {issue.line ? `:${issue.line}` : ''}
      </button>
      <p>{issue.description}</p>
      <div className="issue-recommendation">
        <Lightbulb size={15} />
        <p>{issue.recommendation}</p>
      </div>
    </article>
  );
}
