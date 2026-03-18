export type Role = 'student' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status?: 'pending' | 'approved' | 'denied';
  admin_master?: number;
}

export interface Theme {
  id: number;
  title: string;
  description: string;
  category?: string;
  is_active?: number;
  completed_count?: number;
  created_at: string;
}

export interface Essay {
  id: number;
  student_id: number;
  theme_id: number;
  content: string;
  correction_mode: 'paragrafos' | 'full';
  score_c1: number;
  score_c2: number;
  score_c3: number;
  score_c4: number;
  score_c5: number;
  total_score: number;
  feedback: string;
  plagiarism_check?: string;
  status: string;
  pdf_url?: string;
  error_message?: string | null;
  created_at: string;
}

export interface AdminParameters {
  id: number;
  version: string;
  criteria_competencies: string;
  repertoire_pdf_url: string;
  material_autoral: string;
  weights: string;
  updated_at: string;
}

export interface Exercise {
  id: number;
  title: string;
  content: string;
  competency: number;
  created_at: string;
}

export interface Material {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
}
