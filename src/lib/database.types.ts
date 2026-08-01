export type QuestionType = "rating" | "text";
export type MemberRole = "in-charge" | "member";

// NOTE: these must be `type` aliases, not `interface`s — Supabase's generic
// Schema resolution (deep conditional types in postgrest-js) silently
// collapses to `never` for interface-typed rows.

export type Mandal = {
  id: string;
  name: string;
  sort_order: number;
};

export type Department = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type DepartmentMember = {
  id: string;
  department_id: string;
  name: string;
  role: MemberRole;
  contact_number: string | null;
  sort_order: number;
};

export type DepartmentTask = {
  id: string;
  department_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
};

export type FeedbackQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
};

export type AppUser = {
  id: string;
  device_token: string;
  name: string;
  contact_number: string;
  mandal_id: string | null;
  department_id: string | null;
  created_at: string;
};

export type FeedbackResponse = {
  id: string;
  user_id: string;
  question_id: string;
  day: number;
  rating: number | null;
  answer_text: string | null;
  created_at: string;
};

export type WallPost = {
  id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

// Minimal hand-written Database type (matches supabase/schema.sql).
// Regenerate with `supabase gen types typescript` once the project is linked, if desired.
export type Database = {
  public: {
    Tables: {
      mandals: Table<Mandal>;
      departments: Table<Department>;
      department_members: Table<DepartmentMember>;
      department_tasks: Table<DepartmentTask>;
      feedback_questions: Table<FeedbackQuestion>;
      users: Table<AppUser>;
      feedback_responses: Table<FeedbackResponse>;
      wall_posts: Table<WallPost>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
