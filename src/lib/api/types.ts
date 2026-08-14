// Shapes for the Laravel API — see docs/api-contract.md for the full spec.

export type UserRole = "user" | "scanner" | "admin" | "super_admin";
export type DepartmentRole = "member" | "in-charge";

export type Mandal = {
  id: string;
  name: string;
  sort_order: number;
};

export type User = {
  id: string;
  name: string;
  contact_number: string;
  mandal_id: string | null;
  department_id: string | null;
  department_role: DepartmentRole;
  role: UserRole;
  created_at: string;
};

// A User row as returned by the admin People-directory search — adds the
// Mandal's name so the page can group/display without fetching the (large)
// full Mandal list just for that.
export type AdminPerson = User & { mandal_name: string | null };

export type WallPost = {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

// "scheduled" = launched for a future scheduled_at, not live yet.
// "active" = live right now (either launched immediately, or a scheduled
// one whose time has arrived — see getActiveEvent's auto-promotion).
// "ended" = over (manually ended, or cancelled before it ever went live).
export type EventStatus = "scheduled" | "active" | "ended";

// A single launched Yuva Sabha gathering — admins/super_admins "launch" one
// manually (schedule is too irregular to encode as a recurrence rule). Only
// one can be `active` at a time; attendance and QR codes are always scoped
// to the currently active event, not a fixed calendar day.
export type Event = {
  id: string;
  title: string;
  scheduled_at: string;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
};

export type Attendance = {
  id: string;
  user_id: string;
  event_id: string;
  scanned_at: string;
  scanned_by: string | null;
};

export type AttendanceLogEntry = {
  attendance_id: string;
  user_id: string;
  attendee_name: string;
  contact_number: string;
  mandal_id: string | null;
  event_id: string;
  event_title: string;
  scanned_at: string;
  scanned_by_name: string | null;
};

export type AttendanceMarkResult = {
  attendance_id: string;
  user_id: string;
  name: string;
  event_id: string;
  scanned_at: string;
  already_marked: boolean;
};

export type ScanPerson = {
  id: string;
  name: string;
  contact_number: string;
};

export type Department = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type DepartmentTask = {
  id: string;
  department_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
};

export type DepartmentRosterEntry = {
  id: string;
  name: string;
  contact_number: string;
  department_role: DepartmentRole;
};

export type QuestionType = "rating" | "text";

export type FeedbackQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  sort_order: number;
};

export type FeedbackResponse = {
  id: string;
  user_id: string;
  event_id: string;
  question_id: string;
  rating: number | null;
  answer_text: string | null;
  created_at: string;
};

export type AttendanceByEvent = {
  event_id: string;
  title: string;
  scheduled_at: string;
  count: number;
};

export type AttendanceByMandalForEvent = {
  mandal_id: string | null;
  name: string;
  count: number;
};

export type PeopleByMandal = { mandal_id: string | null; name: string; count: number };
export type PeopleByDepartment = { department_id: string; name: string; count: number };
export type PeopleByRole = { role: UserRole; count: number };

export type AnalyticsData = {
  total_people: number;
  unique_attendees: number;
  total_checkins: number;
  // Last ~10 events, most recent last — powers the "attendance per Sabha" chart.
  attendance_by_event: AttendanceByEvent[];
  // Scoped to whichever event was requested (see getAnalytics's `forEventId`).
  attendance_by_mandal_for_event: AttendanceByMandalForEvent[];
  people_by_mandal: PeopleByMandal[];
  people_by_department: PeopleByDepartment[];
  unassigned_department_count: number;
  people_by_role: PeopleByRole[];
};

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type ApiResult<T> = { data: T; error: null } | { data: null; error: string };
