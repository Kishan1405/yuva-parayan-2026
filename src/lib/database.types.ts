export type QuestionType = "rating" | "text";
export type MemberRole = "in-charge" | "member";
export type UserRole = "user" | "scanner" | "admin" | "super_admin";

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

// The full `users` row, including device_token — only ever returned to the
// row's own owner (signup / self profile fetch / self profile update).
// Never returned by an admin function for any *other* user's row.
export type AppUser = {
  id: string;
  device_token: string;
  name: string;
  contact_number: string;
  mandal_id: string | null;
  department_id: string | null;
  department_role: MemberRole;
  role: UserRole;
  created_at: string;
};

// Safe subset admin functions return for *other* users — no device_token.
export type AdminPerson = Omit<AppUser, "device_token">;

export type Attendance = {
  id: string;
  user_id: string;
  day: number;
  scanned_at: string;
  scanned_by: string | null;
};

export type DepartmentRosterEntry = {
  id: string;
  name: string;
  contact_number: string;
  department_role: MemberRole;
};

export type AttendanceMarkResult = {
  attendance_id: string;
  target_user_id: string;
  target_name: string;
  day: number;
  scanned_at: string;
  already_marked: boolean;
};

export type ScanPerson = {
  id: string;
  name: string;
  contact_number: string;
};

export type AttendanceLogEntry = {
  attendance_id: string;
  user_id: string;
  attendee_name: string;
  contact_number: string;
  day: number;
  scanned_at: string;
  scanned_by_name: string | null;
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

type Fn<Args, Returns> = {
  Args: Args;
  Returns: Returns;
};

// Minimal hand-written Database type (matches supabase/schema.sql).
// Regenerate with `supabase gen types typescript` once the project is linked, if desired.
//
// `users` and `attendance` are intentionally absent from Tables — those
// tables have zero anon RLS policies, so `.from(...)` calls against them
// are always denied. All access goes through the RPC functions below.
export type Database = {
  public: {
    Tables: {
      mandals: Table<Mandal>;
      departments: Table<Department>;
      department_members: Table<DepartmentMember>;
      department_tasks: Table<DepartmentTask>;
      feedback_questions: Table<FeedbackQuestion>;
      feedback_responses: Table<FeedbackResponse>;
      wall_posts: Table<WallPost>;
    };
    Views: Record<string, never>;
    Functions: {
      signup_user: Fn<{ p_name: string; p_contact_number: string; p_mandal_id: string }, AppUser>;
      get_user_by_token: Fn<{ p_device_token: string }, AppUser | null>;
      update_own_profile: Fn<
        { p_device_token: string; p_name: string; p_contact_number: string; p_mandal_id: string },
        AppUser
      >;
      get_my_attendance: Fn<{ p_device_token: string }, Attendance[]>;
      set_login_pin: Fn<{ p_device_token: string; p_pin: string }, null>;
      login_with_pin: Fn<{ p_name: string; p_contact_number: string; p_pin: string }, AppUser | null>;
      get_department_roster: Fn<{ p_department_id: string }, DepartmentRosterEntry[]>;
      // NOTE: these all use `returns table(...)` in SQL, so PostgREST always
      // wraps the result in an array — even ones that only ever produce one
      // row. lib/admin.ts unwraps that for callers.
      admin_search_people: Fn<{ p_caller_token: string; p_query?: string | null }, AdminPerson[]>;
      scan_search_people: Fn<{ p_caller_token: string; p_query: string }, ScanPerson[]>;
      admin_assign_department: Fn<
        {
          p_caller_token: string;
          p_target_user_id: string;
          p_department_id: string | null;
          p_department_role: MemberRole;
        },
        AdminPerson[]
      >;
      admin_set_role: Fn<
        { p_caller_token: string; p_target_user_id: string; p_role: UserRole },
        AdminPerson[]
      >;
      attendance_mark: Fn<
        { p_caller_token: string; p_target_user_id: string; p_day: number },
        AttendanceMarkResult[]
      >;
      admin_list_attendance: Fn<
        { p_caller_token: string; p_day?: number | null },
        AttendanceLogEntry[]
      >;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
