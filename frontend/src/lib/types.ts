export type User = { id: string; name: string; email: string };
export type Project = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  file_count: number;
  review_count: number;
};
export type CodeFile = {
  id: string;
  path: string;
  language: string;
  size: number;
  content?: string;
};
export type Provider = {
  id: string;
  name: string;
  base_url: string;
  model: string;
  has_api_key: boolean;
};
export type Issue = {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number | null;
  title: string;
  description: string;
  recommendation: string;
};
export type Review = {
  id: string;
  project_id: string;
  mode: string;
  provider_name: string;
  model: string;
  file_paths: string[];
  created_at: string;
  result: {
    summary: string;
    issues: Issue[];
    recommendations: string[];
    artifact?: string;
  };
};
export type ChatMessage = { id: string; role: string; content: string };
export type ChatHistory = {
  session_id: string | null;
  messages: ChatMessage[];
};
