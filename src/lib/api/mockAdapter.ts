// Implements docs/api-contract.md in memory, for local frontend dev without
// a Laravel server running (see USE_MOCK in client.ts). Function signatures
// mirror auth.ts / attendance.ts / mandals.ts one-to-one.

import { getStore, saveStore, type StoredUser } from "./mockData";
import type {
  AdminPerson,
  AnalyticsData,
  ApiResult,
  Attendance,
  AttendanceByMandalForEvent,
  AttendanceLogEntry,
  AttendanceMarkResult,
  Department,
  DepartmentRole,
  DepartmentRosterEntry,
  DepartmentTask,
  Event,
  FeedbackQuestion,
  FeedbackResponse,
  Mandal,
  Paginated,
  PeopleByDepartment,
  PeopleByMandal,
  PeopleByRole,
  ScanPerson,
  User,
  UserRole,
  WallPost,
} from "./types";

const SCAN_ROLES: UserRole[] = ["scanner", "admin", "super_admin"];
const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

function toPublicUser(u: StoredUser): User {
  return {
    id: u.id,
    name: u.name,
    contact_number: u.contact_number,
    mandal_id: u.mandal_id,
    department_id: u.department_id,
    department_role: u.department_role,
    role: u.role,
    created_at: u.created_at,
  };
}

function findByToken(token: string | null | undefined): StoredUser | null {
  if (!token) return null;
  const store = getStore();
  return store.users.find((u) => u.token === token) ?? null;
}

function paginate<T>(items: T[], page = 1, perPage = 20): Paginated<T> {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: {
      current_page: safePage,
      per_page: perPage,
      total: items.length,
      last_page: Math.max(1, Math.ceil(items.length / perPage)),
    },
  };
}

// ---------- auth ----------

export function mockSignup(input: {
  name: string;
  contact_number: string;
  mandal_id: string;
}): ApiResult<{ token: string; user: User }> {
  const name = input.name.trim();
  const contact = input.contact_number.trim();

  if (name.length < 2) return { data: null, error: "Please enter your full name." };
  if (!/^\d{10}$/.test(contact)) {
    return { data: null, error: "Please enter a valid 10-digit contact number." };
  }

  const store = getStore();
  if (!store.mandals.some((m) => m.id === input.mandal_id)) {
    return { data: null, error: "Please select a valid Mandal." };
  }

  const id = `user-${store.nextId}`;
  store.nextId += 1;
  const user: StoredUser = {
    id,
    name,
    contact_number: contact,
    mandal_id: input.mandal_id,
    department_id: null,
    department_role: "member",
    role: "user",
    created_at: new Date().toISOString(),
    pin: contact.slice(-4),
    token: `mock-token-${crypto.randomUUID()}`,
  };
  store.users.push(user);
  saveStore(store);

  return { data: { token: user.token, user: toPublicUser(user) }, error: null };
}

export function mockLogin(input: {
  name: string;
  contact_number: string;
  pin: string;
}): ApiResult<{ token: string; user: User }> {
  const store = getStore();
  const name = input.name.trim().toLowerCase();
  const contact = input.contact_number.trim();
  const pin = input.pin.trim();

  const user = store.users.find(
    (u) => u.name.trim().toLowerCase() === name && u.contact_number === contact && u.pin === pin
  );

  if (!user) {
    return { data: null, error: "Name, contact number, or PIN is incorrect." };
  }

  return { data: { token: user.token, user: toPublicUser(user) }, error: null };
}

export function mockMe(token: string | null): ApiResult<User> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };
  return { data: toPublicUser(user), error: null };
}

export function mockUpdateProfile(
  token: string | null,
  input: { name: string; contact_number: string; mandal_id: string }
): ApiResult<User> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };

  user.name = input.name.trim();
  user.contact_number = input.contact_number.trim();
  user.mandal_id = input.mandal_id;
  saveStore(getStore());

  return { data: toPublicUser(user), error: null };
}

export function mockSetPin(token: string | null, pin: string): ApiResult<null> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };
  if (!/^\d{4,6}$/.test(pin)) return { data: null, error: "PIN must be 4 to 6 digits." };

  user.pin = pin;
  saveStore(getStore());
  return { data: null, error: null };
}

// ---------- mandals ----------

export function mockSearchMandals(query: {
  search?: string;
  page?: number;
  per_page?: number;
}): ApiResult<Paginated<Mandal>> {
  const store = getStore();
  const search = query.search?.trim().toLowerCase();
  const filtered = search
    ? store.mandals.filter((m) => m.name.toLowerCase().includes(search))
    : store.mandals;
  const sorted = [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  return { data: paginate(sorted, query.page, query.per_page ?? 20), error: null };
}

export function mockGetMandalById(id: string): ApiResult<Mandal | null> {
  const store = getStore();
  return { data: store.mandals.find((m) => m.id === id) ?? null, error: null };
}

// ---------- events ----------

// A scheduled Sabha "starts itself" once its time arrives — there's no cron
// in a mock, so this promotion happens lazily whenever anyone asks for the
// active event (Home/Attendance/Scan all poll this every 1-2s, so in
// practice it goes live within a couple seconds of scheduled_at on any
// client with the app open). A real Laravel backend needs an actual
// scheduled job doing this instead of relying on a request to trigger it.
function promoteDueScheduledEvents(store: ReturnType<typeof getStore>) {
  const now = new Date().toISOString();
  const due = store.events
    .filter((e) => e.status === "scheduled" && e.scheduled_at <= now)
    .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1))[0];
  if (!due) return false;

  for (const e of store.events) {
    if (e.status === "active") e.status = "ended";
  }
  due.status = "active";
  return true;
}

export function mockGetActiveEvent(): ApiResult<Event | null> {
  const store = getStore();
  if (promoteDueScheduledEvents(store)) saveStore(store);
  return { data: store.events.find((e) => e.status === "active") ?? null, error: null };
}

export function mockLaunchEvent(
  token: string | null,
  input: { title?: string; scheduled_at?: string }
): ApiResult<Event> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const now = new Date().toISOString();
  const scheduledAt = input.scheduled_at || now;
  const startsNow = scheduledAt <= now;

  if (startsNow) {
    // Only one Sabha can be live at a time — starting one now closes out
    // whichever was still open. A *future* scheduled one does NOT do this —
    // you can schedule next week's Sabha while this week's is still running.
    for (const e of store.events) {
      if (e.status === "active") e.status = "ended";
    }
  }

  const event: Event = {
    id: `event-${store.nextId}`,
    title: input.title?.trim() || "Yuva Sabha",
    scheduled_at: scheduledAt,
    status: startsNow ? "active" : "scheduled",
    created_by: caller.id,
    created_at: new Date().toISOString(),
  };
  store.nextId += 1;
  store.events.push(event);
  saveStore(store);

  return { data: event, error: null };
}

export function mockEndEvent(token: string | null, eventId: string): ApiResult<null> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const event = store.events.find((e) => e.id === eventId);
  if (!event) return { data: null, error: "Sabha not found." };

  event.status = "ended";
  saveStore(store);
  return { data: null, error: null };
}

export function mockListEvents(token: string | null, page = 1): ApiResult<Paginated<Event>> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  if (promoteDueScheduledEvents(store)) saveStore(store);

  const sorted = [...store.events].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { data: paginate(sorted, page, 20), error: null };
}

// ---------- attendance ----------

export function mockGetMyAttendance(token: string | null): ApiResult<Attendance[]> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };
  const store = getStore();
  return { data: store.attendance.filter((a) => a.user_id === user.id), error: null };
}

export function mockMarkAttendance(
  token: string | null,
  targetUserId: string,
  eventId: string
): ApiResult<AttendanceMarkResult> {
  const caller = findByToken(token);
  if (!caller || !SCAN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();

  // Re-validate server-side that this is still the live Sabha — rejects a
  // stale/replayed QR from an event that has since ended, even if the
  // scanning device's own UI is out of date.
  const event = store.events.find((e) => e.id === eventId);
  if (!event || event.status !== "active") {
    return { data: null, error: "This QR is for a Sabha that isn't currently live." };
  }

  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return { data: null, error: "Person not found." };

  const existing = store.attendance.find(
    (a) => a.user_id === targetUserId && a.event_id === eventId
  );
  if (existing) {
    return {
      data: {
        attendance_id: existing.id,
        user_id: existing.user_id,
        name: target.name,
        event_id: existing.event_id,
        scanned_at: existing.scanned_at,
        already_marked: true,
      },
      error: null,
    };
  }

  const record: Attendance = {
    id: `att-${store.nextId}`,
    user_id: targetUserId,
    event_id: eventId,
    scanned_at: new Date().toISOString(),
    scanned_by: caller.id,
  };
  store.nextId += 1;
  store.attendance.push(record);
  saveStore(store);

  return {
    data: {
      attendance_id: record.id,
      user_id: record.user_id,
      name: target.name,
      event_id: record.event_id,
      scanned_at: record.scanned_at,
      already_marked: false,
    },
    error: null,
  };
}

export function mockListAttendanceLogs(
  token: string | null,
  query: { event_id?: string; mandal_id?: string; page?: number; per_page?: number }
): ApiResult<Paginated<AttendanceLogEntry>> {
  const caller = findByToken(token);
  if (!caller || !SCAN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const usersById = new Map(store.users.map((u) => [u.id, u]));
  const eventsById = new Map(store.events.map((e) => [e.id, e]));

  let entries = store.attendance.map<AttendanceLogEntry>((a) => {
    const attendee = usersById.get(a.user_id);
    const scanner = a.scanned_by ? usersById.get(a.scanned_by) : null;
    return {
      attendance_id: a.id,
      user_id: a.user_id,
      attendee_name: attendee?.name ?? "Unknown",
      contact_number: attendee?.contact_number ?? "",
      mandal_id: attendee?.mandal_id ?? null,
      event_id: a.event_id,
      event_title: eventsById.get(a.event_id)?.title ?? "Yuva Sabha",
      scanned_at: a.scanned_at,
      scanned_by_name: scanner?.name ?? null,
    };
  });

  if (query.event_id) entries = entries.filter((e) => e.event_id === query.event_id);
  if (query.mandal_id) entries = entries.filter((e) => e.mandal_id === query.mandal_id);
  entries.sort((a, b) => (a.scanned_at < b.scanned_at ? 1 : -1));

  return { data: paginate(entries, query.page, query.per_page ?? 100), error: null };
}

export function mockDeleteAttendance(token: string | null, attendanceId: string): ApiResult<null> {
  const caller = findByToken(token);
  if (!caller || !SCAN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const idx = store.attendance.findIndex((a) => a.id === attendanceId);
  if (idx === -1) return { data: null, error: "Entry not found." };

  store.attendance.splice(idx, 1);
  saveStore(store);
  return { data: null, error: null };
}

export function mockSearchPeople(token: string | null, query: string): ApiResult<ScanPerson[]> {
  const caller = findByToken(token);
  if (!caller || !SCAN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const q = query.trim().toLowerCase();
  if (q.length < 2) return { data: [], error: null };

  const store = getStore();
  const results = store.users
    .filter((u) => u.name.toLowerCase().includes(q) || u.contact_number.includes(q))
    .slice(0, 20)
    .map((u) => ({ id: u.id, name: u.name, contact_number: u.contact_number }));

  return { data: results, error: null };
}

export function mockRegisterPerson(
  token: string | null,
  input: { name: string; contact_number: string; mandal_id: string }
): ApiResult<User> {
  const caller = findByToken(token);
  if (!caller || !SCAN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const name = input.name.trim();
  const contact = input.contact_number.trim();
  if (name.length < 2) return { data: null, error: "Please enter their full name." };
  if (!/^\d{10}$/.test(contact)) {
    return { data: null, error: "Please enter a valid 10-digit contact number." };
  }

  const store = getStore();
  if (store.users.some((u) => u.contact_number === contact)) {
    return { data: null, error: `${contact} is already registered.` };
  }

  const user: StoredUser = {
    id: `user-${store.nextId}`,
    name,
    contact_number: contact,
    mandal_id: input.mandal_id,
    department_id: null,
    department_role: "member",
    role: "user",
    created_at: new Date().toISOString(),
    pin: contact.slice(-4),
    token: `mock-token-${crypto.randomUUID()}`,
  };
  store.nextId += 1;
  store.users.push(user);
  saveStore(store);

  return { data: toPublicUser(user), error: null };
}

// ---------- feedback ----------
// Question set is fixed/seeded (see mockData.ts) — like Mandals/Departments,
// editing it is a backend-side job, not built into an admin UI here.

export function mockGetFeedbackQuestions(): ApiResult<FeedbackQuestion[]> {
  const store = getStore();
  const sorted = [...store.feedbackQuestions].sort((a, b) => a.sort_order - b.sort_order);
  return { data: sorted, error: null };
}

export function mockGetMyFeedback(token: string | null): ApiResult<FeedbackResponse[]> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };
  const store = getStore();
  return { data: store.feedbackResponses.filter((r) => r.user_id === user.id), error: null };
}

export function mockSubmitFeedback(
  token: string | null,
  input: {
    event_id: string;
    answers: { question_id: string; rating?: number | null; answer_text?: string | null }[];
  }
): ApiResult<FeedbackResponse[]> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };

  const store = getStore();
  const saved: FeedbackResponse[] = [];

  for (const answer of input.answers) {
    const existingIdx = store.feedbackResponses.findIndex(
      (r) =>
        r.user_id === user.id && r.event_id === input.event_id && r.question_id === answer.question_id
    );
    const record: FeedbackResponse = {
      id: existingIdx >= 0 ? store.feedbackResponses[existingIdx].id : `feedback-${store.nextId}`,
      user_id: user.id,
      event_id: input.event_id,
      question_id: answer.question_id,
      rating: answer.rating ?? null,
      answer_text: answer.answer_text ?? null,
      created_at:
        existingIdx >= 0 ? store.feedbackResponses[existingIdx].created_at : new Date().toISOString(),
    };

    if (existingIdx >= 0) store.feedbackResponses[existingIdx] = record;
    else {
      store.nextId += 1;
      store.feedbackResponses.push(record);
    }
    saved.push(record);
  }

  saveStore(store);
  return { data: saved, error: null };
}

// ---------- departments ----------
// Editing the department/task list itself is a backend-side job for now
// (same philosophy as Mandals/feedback questions) — these are read plus
// the one write the People/Departments UI actually needs (assignment).

export function mockListDepartments(): ApiResult<Department[]> {
  const store = getStore();
  return { data: [...store.departments].sort((a, b) => a.sort_order - b.sort_order), error: null };
}

export function mockGetDepartment(slug: string): ApiResult<Department | null> {
  const store = getStore();
  return { data: store.departments.find((d) => d.slug === slug) ?? null, error: null };
}

export function mockGetDepartmentRoster(departmentId: string): ApiResult<DepartmentRosterEntry[]> {
  const store = getStore();
  const roster = store.users
    .filter((u) => u.department_id === departmentId)
    .sort((a, b) => {
      if (a.department_role !== b.department_role) return a.department_role === "in-charge" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      contact_number: u.contact_number,
      department_role: u.department_role,
    }));
  return { data: roster, error: null };
}

export function mockGetDepartmentTasks(departmentId: string): ApiResult<DepartmentTask[]> {
  const store = getStore();
  const tasks = store.departmentTasks
    .filter((t) => t.department_id === departmentId)
    .sort((a, b) => a.sort_order - b.sort_order);
  return { data: tasks, error: null };
}

export function mockAssignDepartment(
  token: string | null,
  targetUserId: string,
  departmentId: string | null,
  departmentRole: DepartmentRole
): ApiResult<null> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return { data: null, error: "User not found." };

  target.department_id = departmentId;
  target.department_role = departmentId === null ? "member" : departmentRole;
  saveStore(store);

  return { data: null, error: null };
}

// ---------- analytics ----------
// Reports per-Sabha (event) numbers rather than per-calendar-day — the old
// Parayan model doesn't apply to a recurring, irregularly-scheduled Yuva
// Sabha.

export function mockGetAnalytics(token: string | null, forEventId?: string): ApiResult<AnalyticsData> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const mandalsById = new Map(store.mandals.map((m) => [m.id, m]));
  const departmentsById = new Map(store.departments.map((d) => [d.id, d]));

  // Only events that actually happened (or are happening) — a future
  // "scheduled" one has no attendance yet and would just be a 0 bar.
  const relevantEvents = store.events
    .filter((e) => e.status === "active" || e.status === "ended")
    .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1))
    .slice(-10);

  const countsByEvent = new Map<string, number>();
  for (const a of store.attendance) {
    countsByEvent.set(a.event_id, (countsByEvent.get(a.event_id) ?? 0) + 1);
  }

  const attendance_by_event = relevantEvents.map((e) => ({
    event_id: e.id,
    title: e.title,
    scheduled_at: e.scheduled_at,
    count: countsByEvent.get(e.id) ?? 0,
  }));

  // Default to the most recent event if the caller didn't ask for a
  // specific one.
  const targetEventId = forEventId ?? relevantEvents[relevantEvents.length - 1]?.id ?? null;

  const attendance_by_mandal_for_event: AttendanceByMandalForEvent[] = [];
  if (targetEventId) {
    const mandalCounts = new Map<string | null, number>();
    for (const a of store.attendance) {
      if (a.event_id !== targetEventId) continue;
      const attendee = store.users.find((u) => u.id === a.user_id);
      const mandalId = attendee?.mandal_id ?? null;
      mandalCounts.set(mandalId, (mandalCounts.get(mandalId) ?? 0) + 1);
    }
    for (const [mandalId, count] of mandalCounts) {
      attendance_by_mandal_for_event.push({
        mandal_id: mandalId,
        name: mandalId ? (mandalsById.get(mandalId)?.name ?? "Unknown") : "No Mandal",
        count,
      });
    }
    attendance_by_mandal_for_event.sort((a, b) => b.count - a.count);
  }

  const peopleByMandalMap = new Map<string | null, number>();
  for (const u of store.users) {
    peopleByMandalMap.set(u.mandal_id, (peopleByMandalMap.get(u.mandal_id) ?? 0) + 1);
  }
  const people_by_mandal: PeopleByMandal[] = [...peopleByMandalMap].map(([mandalId, count]) => ({
    mandal_id: mandalId,
    name: mandalId ? (mandalsById.get(mandalId)?.name ?? "Unknown") : "No Mandal",
    count,
  }));

  const peopleByDeptMap = new Map<string, number>();
  let unassigned_department_count = 0;
  for (const u of store.users) {
    if (!u.department_id) {
      unassigned_department_count += 1;
      continue;
    }
    peopleByDeptMap.set(u.department_id, (peopleByDeptMap.get(u.department_id) ?? 0) + 1);
  }
  const people_by_department: PeopleByDepartment[] = [...peopleByDeptMap].map(([deptId, count]) => ({
    department_id: deptId,
    name: departmentsById.get(deptId)?.name ?? "Unknown",
    count,
  }));

  const roleOrder: UserRole[] = ["user", "scanner", "admin", "super_admin"];
  const peopleByRoleMap = new Map<UserRole, number>();
  for (const u of store.users) {
    peopleByRoleMap.set(u.role, (peopleByRoleMap.get(u.role) ?? 0) + 1);
  }
  const people_by_role: PeopleByRole[] = roleOrder
    .filter((r) => peopleByRoleMap.has(r))
    .map((r) => ({ role: r, count: peopleByRoleMap.get(r) ?? 0 }));

  const uniqueAttendeeIds = new Set(store.attendance.map((a) => a.user_id));

  const data: AnalyticsData = {
    total_people: store.users.length,
    unique_attendees: uniqueAttendeeIds.size,
    total_checkins: store.attendance.length,
    attendance_by_event,
    attendance_by_mandal_for_event,
    people_by_mandal,
    people_by_department,
    unassigned_department_count,
    people_by_role,
  };

  return { data, error: null };
}

// ---------- wall ----------

export function mockListWallPosts(): ApiResult<WallPost[]> {
  const store = getStore();
  const sorted = [...store.wallPosts].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { data: sorted, error: null };
}

export function mockCreateWallPost(token: string | null, content: string): ApiResult<WallPost> {
  const user = findByToken(token);
  if (!user) return { data: null, error: "You need to sign in again." };
  if (content.trim().length < 3) return { data: null, error: "Say a little more than that." };

  const store = getStore();
  const post: WallPost = {
    id: `wall-${store.nextId}`,
    user_id: user.id,
    author_name: user.name,
    content: content.trim(),
    created_at: new Date().toISOString(),
  };
  store.nextId += 1;
  store.wallPosts.push(post);
  saveStore(store);

  return { data: post, error: null };
}

// ---------- people (admin directory) ----------
// Distinct from Scan's mockSearchPeople above — this one is admin/
// super_admin only, has no result cap, returns every field (role,
// department, mandal) instead of the minimal ScanPerson shape, and can
// list everyone with no query at all.

function toAdminPerson(u: StoredUser, mandalsById: Map<string, Mandal>): AdminPerson {
  return {
    ...toPublicUser(u),
    mandal_name: u.mandal_id ? (mandalsById.get(u.mandal_id)?.name ?? null) : null,
  };
}

export function mockAdminSearchPeople(token: string | null, query?: string): ApiResult<AdminPerson[]> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }

  const store = getStore();
  const mandalsById = new Map(store.mandals.map((m) => [m.id, m]));
  const q = query?.trim().toLowerCase();
  const matches = store.users.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || u.contact_number.includes(q)
  );

  return { data: matches.map((u) => toAdminPerson(u, mandalsById)), error: null };
}

export function mockSetUserRole(
  token: string | null,
  targetUserId: string,
  role: UserRole
): ApiResult<AdminPerson> {
  const caller = findByToken(token);
  // Only super_admin can grant/revoke roles — matches the People page's own
  // gate (canManageAdmins), enforced here too since the frontend check is
  // UX only.
  if (!caller || caller.role !== "super_admin") {
    return { data: null, error: "You don't have permission to do that." };
  }
  if (targetUserId === caller.id) {
    return { data: null, error: "You can't change your own role." };
  }

  const store = getStore();
  const target = store.users.find((u) => u.id === targetUserId);
  if (!target) return { data: null, error: "Person not found." };

  target.role = role;
  saveStore(store);

  const mandalsById = new Map(store.mandals.map((m) => [m.id, m]));
  return { data: toAdminPerson(target, mandalsById), error: null };
}

export function mockDeletePerson(token: string | null, targetUserId: string): ApiResult<null> {
  const caller = findByToken(token);
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return { data: null, error: "You don't have permission to do that." };
  }
  if (targetUserId === caller.id) {
    return { data: null, error: "You can't remove your own account." };
  }

  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === targetUserId);
  if (idx === -1) return { data: null, error: "Person not found." };

  store.users.splice(idx, 1);
  // Cascade — matches the original Supabase function's stated behavior
  // ("deletes their attendance and feedback too").
  store.attendance = store.attendance.filter((a) => a.user_id !== targetUserId);
  store.feedbackResponses = store.feedbackResponses.filter((r) => r.user_id !== targetUserId);
  saveStore(store);

  return { data: null, error: null };
}
