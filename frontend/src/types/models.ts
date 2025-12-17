export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  prompts?: Prompt[];
  tags?: Tag[];
}

export interface Prompt {
  id: string;
  project_id: string;
  name: string;
  version: string;
  content: string;
  description: string;
  category?: string;
  created_at: string;
  project?: Project;
  tags?: Tag[];
  history?: PromptHistory[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PromptHistory {
  id: string;
  prompt_id: string;
  operation: string;
  old_content: string;
  new_content: string;
  created_at: string;
  prompt?: Prompt;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  change_rate: number;
  diff_html: string;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  error?: string;
}
