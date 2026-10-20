const STORAGE_KEY = "stride.activities.v1";

const localDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const relativeDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return localDateString(date);
};

const starterActivities = [
  { id: "starter-1", distance: 4.8, duration: 29, elevation: 32, date: relativeDate(0), note: "A little fresh air to start the day." },
  { id: "starter-2", distance: 6.2, duration: 38, elevation: 54, date: relativeDate(1), note: "Found a new favorite route." },
  { id: "starter-3", distance: 3.6, duration: 22, elevation: 18, date: relativeDate(3), note: "Easy miles, good vibes." },
  { id: "starter-4", distance: 8.1, duration: 51, elevation: 76, date: relativeDate(5), note: "Went a little further than planned." },
  { id: "starter-5", distance: 5.4, duration: 34, elevation: 41, date: relativeDate(8), note: "" },
  { id: "starter-6", distance: 7.2, duration: 44, elevation: 62, date: relativeDate(10), note: "" },
  { id: "starter-7", distance: 4.1, duration: 25, elevation: 27, date: relativeDate(12), note: "" },
];

const elements = {
  date: document.querySelector("#today-date"),
  weekDistance: document.querySelector("#week-distance"),
  weekRuns: document.querySelector("#week-run-count"),
  weekTime: document.querySelector("#week-time"),
  weekPace: document.querySelector("#week-pace"),
  miniBars: document.querySelector("#mini-bars"),
  chart: document.querySelector("#distance-chart"),
  chartTotal: document.querySelector("#chart-total"),
  chartCaption: document.querySelector("#chart-caption"),
  chartPeriod: document.querySelector("#chart-period"),
  chartPeriodLabel: document.querySelector("#chart-period-label"),
  goalDistance: document.querySelector("#goal-distance"),
  goalProgress: document.querySelector("#goal-progress-fill"),
  goalProgressBar: document.querySelector(".goal-progress-track"),
  goalMessage: document.querySelector("#goal-message"),
  activities: document.querySelector("#activities-list"),
  toggleActivities: document.querySelector("#toggle-activities"),
  dialog: document.querySelector("#run-dialog"),
  form: document.querySelector("#run-form"),
  formError: document.querySelector("#form-error"),
  toast: document.querySelector("#toast"),
};

let showAllActivities = false;
let toastTimeout;

function loadActivities() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return starterActivities;
    }
    const activities = JSON.parse(saved);
    if (!Array.isArray(activities)) {
      throw new Error("Saved activities must be a list.");
    }
    return activities;
  } catch (error) {
    console.error("Could not load your saved runs.", error);
    return starterActivities;
  }
}

let activities = loadActivities();

function saveActivities() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    return true;
  } catch (error) {
    console.error("Could not save your run.", error);
    return false;
  }
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function dateFromInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function activitiesForWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return activities.filter((activity) => {
    const activityDate = dateFromInput(activity.date);
    return activityDate >= start && activityDate < end;
  });
}

function formatDistance(distance) {
  return Number(distance).toFixed(1);
}

function formatDate(value) {
  const date = dateFromInput(value);
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatPace(distance, duration) {
  if (!distance || !duration) return "—";
  const paceSeconds = Math.round((duration * 60) / distance);
  return `${Math.floor(paceSeconds / 60)}:${String(paceSeconds % 60).padStart(2, "0")}`;
}

function renderStats() {
  const now = new Date();
  const weeklyActivities = activitiesForWeek(now);
  const distance = weeklyActivities.reduce((total, activity) => total + Number(activity.distance), 0);
  const duration = weeklyActivities.reduce((total, activity) => total + Number(activity.duration), 0);
  const pace = formatPace(distance, duration);
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now);

  elements.date.textContent = today;
  elements.weekDistance.textContent = formatDistance(distance);
  elements.weekRuns.textContent = `${weeklyActivities.length} ${weeklyActivities.length === 1 ? "run" : "runs"}`;
  elements.weekTime.textContent = String(duration);
  elements.weekPace.textContent = pace;

  const dailyTotals = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek(now));
    day.setDate(day.getDate() + index);
    return weeklyActivities
      .filter((activity) => sameDay(dateFromInput(activity.date), day))
      .reduce((total, activity) => total + Number(activity.distance), 0);
  });
  const maximum = Math.max(...dailyTotals, 1);
  elements.miniBars.innerHTML = dailyTotals
    .map((value) => `<span class="mini-bar" style="height:${Math.max(value > 0 ? 5 : 3, (value / maximum) * 27)}px"></span>`)
    .join("");

  elements.goalDistance.textContent = formatDistance(distance);
  elements.goalProgress.style.width = `${Math.min((distance / 20) * 100, 100)}%`;
  elements.goalProgressBar.setAttribute("aria-valuenow", String(Math.min(Math.round(distance), 20)));
  elements.goalMessage.textContent = distance >= 20
    ? "You did it! What a week."
    : distance > 0
      ? `${formatDistance(20 - distance)} km to your weekly goal.`
      : "Your next run is a good place to start.";
}

function renderWeekChart() {
  const now = new Date();
  const weeklyActivities = activitiesForWeek(now);
  const start = startOfWeek(now);
  const dailyTotals = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const distance = weeklyActivities
      .filter((activity) => sameDay(dateFromInput(activity.date), date))
      .reduce((total, activity) => total + Number(activity.distance), 0);
    return { date, distance };
  });
  const month = elements.chartPeriod.value === "month";
  const chartDays = month
    ? Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
      const distance = activities
        .filter((activity) => sameDay(dateFromInput(activity.date), date))
        .reduce((total, activity) => total + Number(activity.distance), 0);
      return { date, distance };
    })
    : dailyTotals;

  const maximum = Math.max(...chartDays.map((day) => day.distance), 1);
  const total = chartDays.reduce((sum, day) => sum + day.distance, 0);
  const labels = month
    ? chartDays.map((day, index) => ({ ...day, label: index === 0 || index === chartDays.length - 1 || day.date.getDate() % 5 === 0 ? String(day.date.getDate()) : "" }))
    : chartDays.map((day) => ({ ...day, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(day.date) }));

  elements.chart.innerHTML = labels.map((day) => {
    const today = sameDay(day.date, now);
    const barHeight = Math.max(day.distance > 0 ? 5 : 0, (day.distance / maximum) * 96);
    const accessibleLabel = `${formatDate(localDateString(day.date))}: ${formatDistance(day.distance)} km`;
    return `<div class="chart-column${today ? " today" : ""}${day.distance > 0 ? " has-run" : ""}" aria-label="${accessibleLabel}">
      <span class="chart-bar-label">${formatDistance(day.distance)} km</span>
      <span class="chart-bar" style="height:${barHeight}px"></span>
      <span class="chart-day">${day.label}</span>
    </div>`;
  }).join("");
  elements.chartTotal.innerHTML = `${formatDistance(total)} <span>km</span>`;
  elements.chartCaption.textContent = month ? "A little progress, all month long." : "Your miles add up. Keep going.";
  elements.chart.setAttribute("aria-label", `Running distance chart for ${month ? "this month" : "this week"}`);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  elements.chartPeriodLabel.textContent = month
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(now)
    : `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(start)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekEnd)}`;
}

function renderActivities() {
  const orderedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const visibleActivities = showAllActivities ? orderedActivities : orderedActivities.slice(0, 3);
  if (visibleActivities.length === 0) {
    elements.activities.innerHTML = '<p class="empty-activities">Your next run could be the first one. Go make it yours.</p>';
    elements.toggleActivities.hidden = true;
    return;
  }

  elements.toggleActivities.hidden = orderedActivities.length <= 3;
  elements.toggleActivities.innerHTML = showAllActivities
    ? 'Show less <span aria-hidden="true">↖</span>'
    : 'View all <span aria-hidden="true">↗</span>';

  elements.activities.innerHTML = visibleActivities.map((activity) => {
    const pace = formatPace(Number(activity.distance), Number(activity.duration));
    const title = activity.note ? escapeHtml(activity.note) : "Morning run";
    return `<article class="activity-row">
      <span class="activity-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17.5 8.2 8l3.2 7 2.6-4.5 5.8 7"/></svg></span>
      <div class="activity-main"><strong>${title}</strong><span>${formatDate(activity.date)} · ${activity.duration} min · ${pace} /km</span></div>
      <div class="activity-distance"><strong>${formatDistance(Number(activity.distance))} km</strong><span>${pace} /km</span></div>
      <div class="activity-elevation">↗ ${Number(activity.elevation) || 0} m</div>
    </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function render() {
  renderStats();
  renderWeekChart();
  renderActivities();
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = setTimeout(() => elements.toast.classList.remove("visible"), 2800);
}

document.querySelector("#open-log-run").addEventListener("click", () => {
  const dateField = elements.form.elements.namedItem("date");
  dateField.value = relativeDate(0);
  elements.formError.textContent = "";
  elements.dialog.showModal();
});

document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.chartPeriod.addEventListener("change", renderWeekChart);
elements.toggleActivities.addEventListener("click", () => {
  showAllActivities = !showAllActivities;
  renderActivities();
});

document.querySelectorAll("[data-scroll-target]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector(link.dataset.scrollTarget).scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
      item.removeAttribute("aria-current");
    });
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  });
});

document.querySelector('[href="#dashboard"]').addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => {
    item.classList.remove("active");
    item.removeAttribute("aria-current");
  });
  document.querySelector('[href="#dashboard"]').classList.add("active");
  document.querySelector('[href="#dashboard"]').setAttribute("aria-current", "page");
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  elements.formError.textContent = "";
  const formData = new FormData(elements.form);
  const distance = Number(formData.get("distance"));
  const duration = Number(formData.get("duration"));
  const elevation = Number(formData.get("elevation")) || 0;
  const date = formData.get("date");
  const dateValue = dateFromInput(date);
  const today = new Date();

  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(duration) || duration <= 0 || Number.isNaN(dateValue.getTime())) {
    elements.formError.textContent = "Add a valid distance, duration, and date to save your run.";
    return;
  }
  if (dateValue > new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    elements.formError.textContent = "Run dates can’t be in the future.";
    return;
  }

  const activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    distance,
    duration,
    elevation,
    date,
    note: String(formData.get("note") || "").trim(),
  };
  activities = [activity, ...activities];
  if (!saveActivities()) {
    activities.shift();
    elements.formError.textContent = "Your run couldn’t be saved in this browser. Please check available storage and try again.";
    return;
  }

  elements.form.reset();
  elements.dialog.close();
  showAllActivities = true;
  render();
  showToast("Run saved. Nice work showing up!");
});

render();
