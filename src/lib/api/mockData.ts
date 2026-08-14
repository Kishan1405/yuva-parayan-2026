// In-memory (localStorage-backed) stand-in for the Laravel API, used only
// when NEXT_PUBLIC_API_URL is unset. Seeds ~150 Mandals so the SearchSelect
// combobox is exercised at realistic scale, plus a few test accounts.
//
// Test logins (name / contact / PIN):
//   Demo Attendee   / 9000000001 / 0001   (role: user)
//   Scan Volunteer  / 9000000002 / 0002   (role: scanner)
//   Admin Demo      / 9999999999 / 9999   (role: super_admin)

import type {
  Attendance,
  Department,
  DepartmentRole,
  DepartmentTask,
  Event,
  FeedbackQuestion,
  FeedbackResponse,
  Mandal,
  User,
  UserRole,
  WallPost,
} from "./types";

// v4: added wall_posts (Reflect's public wall moved off Supabase too) —
// bump so anyone with an older store cleanly reseeds instead of loading
// data in the old shape.
const STORAGE_KEY = "yuvasabha_mock_api_store_v4";

export interface StoredUser extends User {
  pin: string; // plaintext — mock only, never do this for real
  token: string;
}

export interface Store {
  mandals: Mandal[];
  users: StoredUser[];
  events: Event[];
  attendance: Attendance[];
  departments: Department[];
  departmentTasks: DepartmentTask[];
  feedbackQuestions: FeedbackQuestion[];
  feedbackResponses: FeedbackResponse[];
  wallPosts: WallPost[];
  nextId: number;
}

function nextId(store: Store, prefix: string): string {
  const id = `${prefix}-${store.nextId}`;
  store.nextId += 1;
  return id;
}

const ZONES = [
  "Uttar",
  "Dakshin",
  "Purva",
  "Paschim",
  "Madhya",
  "Nutan",
  "Shanti",
  "Prem",
  "Gyan",
  "Seva",
];
const SUFFIXES = ["Nagar", "Park", "Vihar", "Colony", "Chowk", "Marg", "Society", "Nagari"];

const FIRST_NAMES = [
  "Kishan",
  "Aarav",
  "Dhruv",
  "Yash",
  "Meet",
  "Parth",
  "Rohan",
  "Nakul",
  "Devang",
  "Harsh",
  "Vivan",
  "Aryan",
  "Krish",
  "Om",
  "Manan",
];
const LAST_NAMES = [
  "Patel",
  "Shah",
  "Trivedi",
  "Mehta",
  "Joshi",
  "Desai",
  "Rana",
  "Chauhan",
  "Parmar",
  "Rathod",
];

// Matches the department list already seeded in supabase/schema.sql, so
// names/slugs stay consistent with what the Laravel teammate builds.
const DEPARTMENT_SEEDS: { slug: string; name: string; description: string }[] = [
  { slug: "sangeet", name: "Sangeet", description: "Music and bhajan seva" },
  { slug: "sabha-vyavastha", name: "Sabha Vyavastha", description: "Hall and seating arrangements" },
  { slug: "parayan-pujan", name: "Parayan Pujan", description: "Parayan and pujan vidhi" },
  { slug: "prasad", name: "Prasad", description: "Prasad preparation and distribution" },
  { slug: "sabha-karyakram", name: "Sabha Karyakram", description: "Sabha programme and schedule coordination" },
  { slug: "presentator", name: "Presentator", description: "Stage presentation, MC, and announcements" },
  { slug: "attendance", name: "Attendance", description: "Attendee check-in and headcount" },
  { slug: "footwear", name: "Footwear", description: "Footwear stand and safekeeping" },
  { slug: "audio-video", name: "Audio-Video", description: "Sound, video, and live-streaming setup" },
  { slug: "photography", name: "Photography", description: "Event photography and coverage" },
  { slug: "decoration", name: "Decoration", description: "Venue and stage decoration" },
  { slug: "sant-sarbhara", name: "Sant Sarbhara", description: "Hospitality and care for the Sants" },
  { slug: "sant-swagat", name: "Sant Swagat", description: "Reception and welcome for the Sants" },
  { slug: "it", name: "IT Department", description: "App, website, and technical support" },
  { slug: "skit-property", name: "Skit Property", description: "Props and stage materials for skits and performances" },
];

const TASK_TITLES = ["Setup", "Rehearsal run-through", "Cleanup"];

const FEEDBACK_QUESTION_SEEDS: { question_text: string; question_type: "rating" | "text" }[] = [
  { question_text: "How would you rate today's Sabha?", question_type: "rating" },
  { question_text: "How would you rate the arrangements?", question_type: "rating" },
  { question_text: "What did you enjoy most?", question_type: "text" },
  { question_text: "Any suggestions for next time?", question_type: "text" },
];

function generateMandals(): Mandal[] {
  const mandals: Mandal[] = [
    { id: "mandal-1", name: "Pramukh Nagar", sort_order: 1 },
    { id: "mandal-2", name: "Gurudev Park", sort_order: 2 },
    { id: "mandal-3", name: "Gunatit Nagar", sort_order: 3 },
  ];
  const count = 150;
  for (let i = 0; i < count; i++) {
    const zone = ZONES[i % ZONES.length];
    const suffix = SUFFIXES[Math.floor(i / ZONES.length) % SUFFIXES.length];
    const sortOrder = mandals.length + 1;
    mandals.push({
      id: `mandal-${sortOrder}`,
      name: `${zone} ${suffix} — Sector ${i + 1}`,
      sort_order: sortOrder,
    });
  }
  return mandals;
}

function seedUser(
  store: Store,
  input: {
    name: string;
    contact_number: string;
    pin: string;
    role: UserRole;
    mandal_id: string | null;
    department_id?: string | null;
    department_role?: DepartmentRole;
  }
): StoredUser {
  const user: StoredUser = {
    id: nextId(store, "user"),
    name: input.name,
    contact_number: input.contact_number,
    mandal_id: input.mandal_id,
    department_id: input.department_id ?? null,
    department_role: input.department_role ?? "member",
    role: input.role,
    created_at: new Date().toISOString(),
    pin: input.pin,
    token: `mock-token-${crypto.randomUUID()}`,
  };
  store.users.push(user);
  return user;
}

function seedStore(): Store {
  const store: Store = {
    mandals: generateMandals(),
    users: [],
    events: [],
    attendance: [],
    departments: [],
    departmentTasks: [],
    feedbackQuestions: [],
    feedbackResponses: [],
    wallPosts: [],
    nextId: 1,
  };

  DEPARTMENT_SEEDS.forEach((d, i) => {
    const department: Department = {
      id: nextId(store, "dept"),
      slug: d.slug,
      name: d.name,
      description: d.description,
      sort_order: i + 1,
    };
    store.departments.push(department);

    TASK_TITLES.forEach((title, j) => {
      store.departmentTasks.push({
        id: nextId(store, "task"),
        department_id: department.id,
        title,
        is_done: j === 0, // "Setup" pre-checked for demo purposes
        sort_order: j + 1,
      });
    });
  });

  FEEDBACK_QUESTION_SEEDS.forEach((q, i) => {
    store.feedbackQuestions.push({
      id: nextId(store, "question"),
      question_text: q.question_text,
      question_type: q.question_type,
      sort_order: i + 1,
    });
  });

  seedUser(store, {
    name: "Demo Attendee",
    contact_number: "9000000001",
    pin: "0001",
    role: "user",
    mandal_id: store.mandals[0].id,
  });
  seedUser(store, {
    name: "Scan Volunteer",
    contact_number: "9000000002",
    pin: "0002",
    role: "scanner",
    mandal_id: store.mandals[1].id,
  });
  const admin = seedUser(store, {
    name: "Admin Demo",
    contact_number: "9999999999",
    pin: "9999",
    role: "super_admin",
    mandal_id: store.mandals[2].id,
  });

  // A pool of ordinary attendees (not checked in yet) so Scan search/mark
  // has real people to find during testing. Every 4th one also gets a
  // department assignment so the Departments rosters aren't empty.
  let phone = 9100000001;
  for (let i = 0; i < 40; i++) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
    const contact = String(phone++);
    const assignToDept = i % 4 === 0;
    const department = assignToDept ? store.departments[i % store.departments.length] : null;
    seedUser(store, {
      name,
      contact_number: contact,
      pin: contact.slice(-4),
      role: "user",
      mandal_id: store.mandals[i % store.mandals.length].id,
      department_id: department?.id ?? null,
      department_role: assignToDept && i % 8 === 0 ? "in-charge" : "member",
    });
  }

  // One already-live Sabha so the app is immediately testable without
  // having to launch one first.
  store.events.push({
    id: nextId(store, "event"),
    title: "Yuva Sabha",
    scheduled_at: new Date().toISOString(),
    status: "active",
    created_by: admin.id,
    created_at: new Date().toISOString(),
  });

  return store;
}

let memoryStore: Store | null = null;

function persist(store: Store) {
  memoryStore = store;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // localStorage unavailable (private mode / SSR) — memory-only fallback is fine for a mock.
    }
  }
}

export function getStore(): Store {
  if (memoryStore) return memoryStore;

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        memoryStore = JSON.parse(raw) as Store;
        return memoryStore;
      } catch {
        // fall through to reseed on corrupt storage
      }
    }
  }

  const seeded = seedStore();
  persist(seeded);
  return seeded;
}

export function saveStore(store: Store) {
  persist(store);
}
