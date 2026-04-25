export interface OnboardingStep {
  id: string;
  route: string;
  targetId: string;
  title: string;
  description: string;
  actionLabel: string;
}

interface OnboardingState {
  active: boolean;
  completed: boolean;
  currentStepId: string | null;
}

const PENDING_ONBOARDING_KEY = "elimutime:onboarding:pending";
const SCHOOL_ONBOARDING_PREFIX = "elimutime:onboarding:school:";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "dashboard-start",
    route: "/dashboard",
    targetId: "tour-dashboard-get-started",
    title: "Start with your setup flow",
    description: "Use Get Started to move into the setup journey and begin building your school timetable workspace.",
    actionLabel: "Press Get Started",
  },
  {
    id: "streams-add",
    route: "/streams",
    targetId: "tour-streams-add",
    title: "Add your streams first",
    description: "Create your grades and stream names here so timetable generation has the right class structure.",
    actionLabel: "Add Streams",
  },
  {
    id: "streams-next",
    route: "/streams",
    targetId: "tour-streams-next",
    title: "Move on to teachers",
    description: "Once your streams are ready, continue to the Teachers page for staffing setup.",
    actionLabel: "Go to Teachers",
  },
  {
    id: "teachers-add",
    route: "/teachers",
    targetId: "tour-teachers-add",
    title: "Add your teaching team",
    description: "Add teachers and their subjects so ElimuTime can generate cleaner, conflict-aware timetables.",
    actionLabel: "Add Teacher",
  },
  {
    id: "teachers-next",
    route: "/teachers",
    targetId: "tour-teachers-next",
    title: "Open timetable generation",
    description: "When your teachers are in place, continue to the timetable workspace to generate schedules.",
    actionLabel: "Go to Timetables",
  },
  {
    id: "timetables-generate",
    route: "/timetables",
    targetId: "tour-timetables-generate",
    title: "Generate your timetable",
    description: "This is where ElimuTime builds the timetable for your configured streams and teachers.",
    actionLabel: "Generate Timetable",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getSchoolKey(schoolId: string) {
  return `${SCHOOL_ONBOARDING_PREFIX}${schoolId}`;
}

function getDefaultState(): OnboardingState {
  return {
    active: false,
    completed: false,
    currentStepId: null,
  };
}

function readSchoolState(schoolId: string): OnboardingState {
  if (!canUseStorage()) {
    return getDefaultState();
  }

  const rawValue = window.localStorage.getItem(getSchoolKey(schoolId));
  if (!rawValue) {
    return getDefaultState();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<OnboardingState>;
    return {
      active: Boolean(parsed.active),
      completed: Boolean(parsed.completed),
      currentStepId: typeof parsed.currentStepId === "string" ? parsed.currentStepId : null,
    };
  } catch {
    return getDefaultState();
  }
}

function writeSchoolState(schoolId: string, state: OnboardingState) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(getSchoolKey(schoolId), JSON.stringify(state));
}

export function startPendingOnboardingTour() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PENDING_ONBOARDING_KEY, "true");
}

export function hasPendingOnboardingTour() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(PENDING_ONBOARDING_KEY) === "true";
}

export function beginSchoolOnboardingTour(schoolId: string) {
  const nextState: OnboardingState = {
    active: true,
    completed: false,
    currentStepId: ONBOARDING_STEPS[0]?.id || null,
  };

  writeSchoolState(schoolId, nextState);

  if (canUseStorage()) {
    window.localStorage.removeItem(PENDING_ONBOARDING_KEY);
  }

  return nextState;
}

export function hydrateSchoolOnboardingTour(schoolId: string) {
  if (!canUseStorage()) {
    return readSchoolState(schoolId);
  }

  const existing = readSchoolState(schoolId);
  const pending = window.localStorage.getItem(PENDING_ONBOARDING_KEY) === "true";

  if (pending && !existing.completed) {
    const nextState: OnboardingState = {
      active: true,
      completed: false,
      currentStepId: ONBOARDING_STEPS[0]?.id || null,
    };
    writeSchoolState(schoolId, nextState);
    window.localStorage.removeItem(PENDING_ONBOARDING_KEY);
    return nextState;
  }

  return existing;
}

export function getSchoolOnboardingTourState(schoolId: string) {
  return readSchoolState(schoolId);
}

export function getCurrentOnboardingStep(schoolId: string) {
  const state = readSchoolState(schoolId);
  return ONBOARDING_STEPS.find((step) => step.id === state.currentStepId) || null;
}

export function advanceSchoolOnboardingTour(schoolId: string) {
  const state = readSchoolState(schoolId);
  if (state.completed || !state.active) {
    return state;
  }

  const currentIndex = ONBOARDING_STEPS.findIndex((step) => step.id === state.currentStepId);
  const nextStep = currentIndex >= 0 ? ONBOARDING_STEPS[currentIndex + 1] : ONBOARDING_STEPS[0];

  const nextState: OnboardingState = nextStep
    ? {
        active: true,
        completed: false,
        currentStepId: nextStep.id,
      }
    : {
        active: false,
        completed: true,
        currentStepId: null,
      };

  writeSchoolState(schoolId, nextState);
  return nextState;
}

export function completeSchoolOnboardingTour(schoolId: string) {
  const nextState: OnboardingState = {
    active: false,
    completed: true,
    currentStepId: null,
  };
  writeSchoolState(schoolId, nextState);
  return nextState;
}
