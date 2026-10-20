const USERS = [
  { id: "jamie", name: "Jamie Parker" },
  { id: "alex", name: "Alex Morgan" },
  { id: "taylor", name: "Taylor Reed" },
  { id: "sam", name: "Sam Rivera" },
  { id: "casey", name: "Casey Brooks" },
];
const USER_STORAGE_PREFIX = "wannabe-strava.activities.";
const CURRENT_USER_KEY = "wannabe-strava.current-user";
const LEGACY_STORAGE_KEY = "stride.activities.v1";
const THEME_STORAGE_KEY = "wannabe-strava.theme";
const ACTIVITY_TYPES = ["run", "bike", "hike", "walk"];

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
  chartWeekLabel: document.querySelector("#chart-week-label"),
  goalDistance: document.querySelector("#goal-distance"),
  goalProgress: document.querySelector("#goal-progress-fill"),
  goalProgressBar: document.querySelector(".goal-progress-track"),
  goalMessage: document.querySelector("#goal-message"),
  activities: document.querySelector("#activities-list"),
  feedActivities: document.querySelector("#feed-activities-list"),
  feedTypeFilter: document.querySelector("#feed-type-filter"),
  feedWeekFilter: document.querySelector("#feed-week-filter"),
  progressWeekFilter: document.querySelector("#progress-week-filter"),
  progressTypeFilter: document.querySelector("#progress-type-filter"),
  progressWeekLabel: document.querySelector("#progress-week-label"),
  progressChart: document.querySelector("#progress-chart"),
  lifetimeChart: document.querySelector("#lifetime-chart"),
  lifetimeYearFilter: document.querySelector("#lifetime-year-filter"),
  lifetimeCaption: document.querySelector("#lifetime-chart-caption"),
  lifetimeLegend: document.querySelector("#lifetime-legend"),
  dialog: document.querySelector("#run-dialog"),
  form: document.querySelector("#run-form"),
  formError: document.querySelector("#form-error"),
  toast: document.querySelector("#toast"),
  userSelect: document.querySelector("#user-select"),
  profileName: document.querySelector("#profile-name"),
  welcomeName: document.querySelector("#welcome-name"),
  avatar: document.querySelector(".avatar"),
  topbarAvatar: document.querySelector("#topbar-avatar"),
  photoDialog: document.querySelector("#photo-dialog"),
  photoPreview: document.querySelector("#photo-preview"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeColor: document.querySelector("#theme-color"),
  breadcrumbTitle: document.querySelector(".breadcrumb strong"),
};

let toastTimeout;
let currentUserId = loadCurrentUser();
let activities = loadActivities(currentUserId);

function loadCurrentUser() {
  try {
    const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    return USERS.some((user) => user.id === savedUserId) ? savedUserId : USERS[0].id;
  } catch (error) {
    console.error("Could not load the selected demo user.", error);
    return USERS[0].id;
  }
}

function loadActivities(userId) {
  try {
    const saved = localStorage.getItem(`${USER_STORAGE_PREFIX}${userId}`);
    if (saved !== null) {
      const userActivities = JSON.parse(saved);
      if (!Array.isArray(userActivities)) {
        throw new Error("Saved activities must be a list.");
      }
      return userActivities.map(normalizeActivity);
    }
    if (userId !== USERS[0].id) return [];

    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySaved === null) return [];
    const userActivities = JSON.parse(legacySaved);
    if (!Array.isArray(userActivities)) {
      throw new Error("Saved activities must be a list.");
    }
    const customActivities = userActivities
      .filter((activity) => !String(activity.id || "").startsWith("starter-"))
      .map(normalizeActivity);
    localStorage.setItem(`${USER_STORAGE_PREFIX}${userId}`, JSON.stringify(customActivities));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return customActivities;
  } catch (error) {
    console.error(`Could not load saved runs for ${userId}.`, error);
    showToast("Could not load this user's saved runs.");
    return [];
  }
}

function normalizeActivity(activity) {
  return {
    ...activity,
    type: ACTIVITY_TYPES.includes(activity.type) ? activity.type : "run",
    visibility: activity.visibility === "public" ? "public" : "private",
  };
}

function saveActivities(nextActivities = activities, userId = currentUserId) {
  try {
    localStorage.setItem(`${USER_STORAGE_PREFIX}${userId}`, JSON.stringify(nextActivities));
    return true;
  } catch (error) {
    console.error("Could not save this activity.", error);
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

function weekKey(date) {
  return localDateString(startOfWeek(date));
}

function getAllUserActivities() {
  return USERS.flatMap((user) => loadActivities(user.id).map((activity) => ({ ...activity, ownerId: user.id })));
}

function weekLabel(key) {
  const start = dateFromInput(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const format = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  const includeYear = start.getFullYear() !== new Date().getFullYear()
    || end.getFullYear() !== new Date().getFullYear();
  const year = new Intl.DateTimeFormat("en", { year: "numeric" });
  return `${format.format(start)} – ${format.format(end)}${includeYear ? `, ${year.format(end)}` : ""}`;
}

function populateWeekOptions(select, records, includeAll = false) {
  const previous = select.value;
  const weeks = new Set([weekKey(new Date()), ...records.map((activity) => weekKey(dateFromInput(activity.date)))]);
  const sortedWeeks = [...weeks].sort((a, b) => b.localeCompare(a));
  const groups = new Map();
  sortedWeeks.forEach((week) => {
    const year = String(dateFromInput(week).getFullYear());
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(week);
  });
  select.innerHTML = `${includeAll ? '<option value="all">All weeks</option>' : ""}${[...groups]
    .map(([year, yearWeeks]) => `<optgroup label="${year}">${yearWeeks
      .map((week) => `<option value="${week}">${week === weekKey(new Date()) ? "This week · " : ""}${weekLabel(week)}</option>`)
      .join("")}</optgroup>`)
    .join("")}`;
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
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
  const paceActivities = weeklyActivities.filter((activity) => ["run", "walk", "hike"].includes(activity.type));
  const paceDistance = paceActivities.reduce((total, activity) => total + Number(activity.distance), 0);
  const paceDuration = paceActivities.reduce((total, activity) => total + Number(activity.duration), 0);
  const pace = formatPace(paceDistance, paceDuration);
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now);

  elements.date.textContent = today;
  const currentUser = USERS.find((user) => user.id === currentUserId);
  const firstName = currentUser.name.split(" ")[0];
  elements.profileName.textContent = currentUser.name;
  elements.welcomeName.textContent = firstName;
  elements.avatar.textContent = firstName[0];
  elements.topbarAvatar.textContent = firstName[0];
  elements.topbarAvatar.setAttribute("aria-label", currentUser.name);
  elements.weekDistance.textContent = formatDistance(distance);
  elements.weekRuns.textContent = `${weeklyActivities.length} ${weeklyActivities.length === 1 ? "activity" : "activities"}`;
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
  const total = weeklyActivities.reduce((sum, activity) => sum + Number(activity.distance), 0);
  const dailyTotals = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const distance = weeklyActivities
      .filter((activity) => sameDay(dateFromInput(activity.date), date))
      .reduce((total, activity) => total + Number(activity.distance), 0);
    return { date, distance };
  });
  const maximum = Math.max(...dailyTotals.map((day) => day.distance), 1);
  elements.chart.innerHTML = dailyTotals.map((day) => {
    const today = sameDay(day.date, now);
    const barHeight = Math.max(day.distance > 0 ? 5 : 0, (day.distance / maximum) * 96);
    const accessibleLabel = `${formatDate(localDateString(day.date))}: ${formatDistance(day.distance)} km`;
    return `<div class="chart-column${today ? " today" : ""}${day.distance > 0 ? " has-run" : ""}" aria-label="${accessibleLabel}">
      <span class="chart-bar-label">${formatDistance(day.distance)} km</span>
      <span class="chart-bar" style="height:${barHeight}px"></span>
      <span class="chart-day">${new Intl.DateTimeFormat("en", { weekday: "short" }).format(day.date)}</span>
    </div>`;
  }).join("");
  elements.chartTotal.innerHTML = `${formatDistance(total)} <span>km</span>`;
  elements.chartCaption.textContent = "Your miles add up. Keep going.";
  elements.chart.setAttribute("aria-label", "Activity distance chart for this week");
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  elements.chartWeekLabel.textContent = weekLabel(localDateString(start));
}

function renderProgress() {
  populateWeekOptions(elements.progressWeekFilter, activities);
  const selectedWeek = elements.progressWeekFilter.value || weekKey(new Date());
  const start = dateFromInput(selectedWeek);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const weekActivities = activities.filter((activity) => {
    const date = dateFromInput(activity.date);
    return date >= start && date < end;
  });
  const distances = Object.fromEntries(ACTIVITY_TYPES.map((type) => [
    type,
    weekActivities.filter((activity) => activity.type === type)
      .reduce((total, activity) => total + Number(activity.distance), 0),
  ]));
  document.querySelector("#progress-run-total").textContent = `${formatDistance(distances.run)} km`;
  document.querySelector("#progress-bike-total").textContent = `${formatDistance(distances.bike)} km`;
  document.querySelector("#progress-hike-total").textContent = `${formatDistance(distances.hike)} km`;
  document.querySelector("#progress-walk-total").textContent = `${formatDistance(distances.walk)} km`;
  elements.progressWeekFilter.value = selectedWeek;
  elements.progressWeekLabel.textContent = weekLabel(selectedWeek);
  const selectedType = elements.progressTypeFilter.value;
  const displayedActivities = selectedType === "all"
    ? weekActivities
    : weekActivities.filter((activity) => activity.type === selectedType);
  const total = displayedActivities.reduce((sum, activity) => sum + Number(activity.distance), 0);
  document.querySelector("#progress-total").textContent = `${formatDistance(total)} km`;
  document.querySelector("#progress-chart-caption").textContent = `${selectedType === "all" ? "All activities" : activityTypeLabel(selectedType)} · ${weekLabel(selectedWeek)}`;
  const dailyTotals = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return {
      date,
      distance: displayedActivities
        .filter((activity) => sameDay(dateFromInput(activity.date), date))
        .reduce((sum, activity) => sum + Number(activity.distance), 0),
    };
  });
  const maximum = Math.max(...dailyTotals.map((day) => day.distance), 1);
  elements.progressChart.innerHTML = dailyTotals.map((day) => {
    const barHeight = Math.max(day.distance > 0 ? 5 : 0, (day.distance / maximum) * 96);
    return `<div class="chart-column${day.distance > 0 ? " has-run" : ""}" aria-label="${formatDate(localDateString(day.date))}: ${formatDistance(day.distance)} km">
      <span class="chart-bar-label">${formatDistance(day.distance)} km</span>
      <span class="chart-bar" style="height:${barHeight}px"></span>
      <span class="chart-day">${new Intl.DateTimeFormat("en", { weekday: "short" }).format(day.date)}</span>
    </div>`;
  }).join("");
  renderLifetimeChart();
}

function renderLifetimeChart() {
  const ordered = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const years = [...new Set(ordered.map((activity) => dateFromInput(activity.date).getFullYear()))].sort((a, b) => a - b);
  if (ordered.length === 0) {
    elements.lifetimeChart.innerHTML = "";
    elements.lifetimeYearFilter.innerHTML = '<option value="">No recorded years</option>';
    elements.lifetimeYearFilter.disabled = true;
    elements.lifetimeLegend.innerHTML = "";
    elements.lifetimeCaption.textContent = "Log an activity to start your timeline.";
    elements.lifetimeChart.setAttribute("aria-label", "No recorded activity yet");
    return;
  }

  const previousYear = elements.lifetimeYearFilter.value;
  elements.lifetimeYearFilter.disabled = false;
  elements.lifetimeYearFilter.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  const selectedYear = years.includes(Number(previousYear)) ? Number(previousYear) : years[years.length - 1];
  elements.lifetimeYearFilter.value = String(selectedYear);

  const latestYear = years[years.length - 1];
  const comparisonYear = selectedYear === latestYear
    ? [...years].reverse().find((year) => year !== latestYear)
    : latestYear;
  const series = [
    { year: selectedYear, className: "selected-year", label: String(selectedYear) },
    ...(comparisonYear === undefined
      ? []
      : [{ year: comparisonYear, className: "latest-year", label: comparisonYear === latestYear ? `${latestYear} · latest` : String(comparisonYear) }]),
  ].map((item) => ({
    ...item,
    distances: Array.from({ length: 12 }, (_, month) => ordered
      .filter((activity) => {
        const date = dateFromInput(activity.date);
        return date.getFullYear() === item.year && date.getMonth() === month;
      })
      .reduce((total, activity) => total + Number(activity.distance), 0)),
  }));

  const maximum = Math.max(1, ...series.flatMap((item) => item.distances));
  const chartWidth = Math.max(elements.lifetimeChart.clientWidth, 320);
  elements.lifetimeChart.setAttribute("viewBox", `0 0 ${chartWidth} 310`);
  const chart = { left: 52, right: chartWidth - 24, top: 30, bottom: 238 };
  const x = (month) => chart.left + (month * (chart.right - chart.left)) / 11;
  const y = (distance) => chart.bottom - (distance / maximum) * (chart.bottom - chart.top);
  const gridValues = Array.from({ length: 4 }, (_, index) => (maximum * index) / 3);
  const grid = gridValues.map((value) => {
    const position = y(value);
    return `<line class="lifetime-grid-line" x1="${chart.left}" y1="${position}" x2="${chart.right}" y2="${position}" />
      <text class="lifetime-axis-label" x="${chart.left - 10}" y="${position + 4}" text-anchor="end">${formatDistance(value)}</text>`;
  }).join("");
  const monthLabels = Array.from({ length: 12 }, (_, month) => {
    const label = new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(2025, month, 1));
    return `<text class="lifetime-axis-label lifetime-month-label" x="${x(month)}" y="${chart.bottom + 25}" text-anchor="middle">${label}</text>`;
  }).join("");
  const lines = series.map((item) => {
    const points = item.distances.map((distance, month) => `${x(month)},${y(distance)}`).join(" ");
    const markers = item.distances.map((distance, month) => {
      const label = `${item.year} ${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2025, month, 1))}: ${formatDistance(distance)} km`;
      return `<circle class="lifetime-point" cx="${x(month)}" cy="${y(distance)}" r="4.5"><title>${escapeHtml(label)}</title></circle>`;
    }).join("");
    return `<g class="lifetime-series ${item.className}"><polyline class="lifetime-line" points="${points}" />${markers}</g>`;
  }).join("");

  elements.lifetimeChart.innerHTML = `<g class="lifetime-grid">${grid}</g>
    <text class="lifetime-axis-title" x="${chart.left}" y="16">Distance (km)</text>
    <text class="lifetime-axis-title" x="${chart.right}" y="${chart.bottom + 48}" text-anchor="end">Month</text>
    ${monthLabels}${lines}`;
  elements.lifetimeLegend.innerHTML = series.map((item) => `<span class="lifetime-legend-item ${item.className}"><i></i>${item.label}</span>`).join("");
  const totals = series.map((item) => `${item.year}: ${formatDistance(item.distances.reduce((sum, distance) => sum + distance, 0))} km`);
  elements.lifetimeCaption.textContent = totals.join(" · ");
  const comparisonDescription = comparisonYear === undefined
    ? `${selectedYear}`
    : `${selectedYear} compared with ${comparisonYear}`;
  elements.lifetimeChart.setAttribute("aria-label", `Monthly activity distance in ${comparisonDescription}`);
}

function activityTypeLabel(type) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function activityMarkup(activity, ownerId, showOwner) {
  const pace = formatPace(Number(activity.distance), Number(activity.duration));
  const title = escapeHtml(activity.name || `${activityTypeLabel(activity.type)} activity`);
  const note = activity.note ? `<span class="activity-note">${escapeHtml(activity.note)}</span>` : "";
  const photo = activity.photo
    ? `<button class="activity-photo" type="button" data-photo-id="${escapeHtml(activity.id)}" data-photo-owner="${ownerId}" aria-label="View photo from ${title}"><img src="${activity.photo}" alt="" /></button>`
    : '<span class="activity-photo-placeholder" aria-hidden="true"></span>';
  const owner = showOwner ? `<span class="activity-owner">${escapeHtml(USERS.find((user) => user.id === ownerId).name)}</span>` : "";
  const canDelete = ownerId === currentUserId;
  const visibility = activity.visibility === "public" ? "Public" : "Private";
  const visibilityControl = ownerId === currentUserId
    ? `<select class="visibility-select" data-visibility-id="${escapeHtml(activity.id)}" data-visibility-owner="${ownerId}" aria-label="Visibility for ${title}">
        <option value="private"${activity.visibility === "private" ? " selected" : ""}>Private</option>
        <option value="public"${activity.visibility === "public" ? " selected" : ""}>Public</option>
      </select>`
    : escapeHtml(visibility);
  const paceDetail = activity.type === "run" || activity.type === "walk" || activity.type === "hike"
    ? ` · ${pace} /km`
    : "";
  return `<article class="activity-row">
    <span class="activity-icon activity-icon-${activity.type}" aria-hidden="true">${activityTypeIcon(activity.type)}</span>
    <div class="activity-main"><strong>${title}</strong>${owner}<span>${activityTypeLabel(activity.type)} · ${formatDate(activity.date)} · ${activity.duration} min${paceDetail}</span>${note}</div>
    ${photo}
    <div class="activity-distance"><strong>${formatDistance(Number(activity.distance))} km</strong><span>${visibilityControl}</span></div>
    <div class="activity-elevation">↗ ${Number(activity.elevation) || 0} m</div>
    ${canDelete ? `<button class="delete-activity" type="button" data-delete-id="${escapeHtml(activity.id)}" data-delete-owner="${ownerId}" aria-label="Remove ${title}">×</button>` : '<span class="delete-placeholder"></span>'}
  </article>`;
}

function activityTypeIcon(type) {
  return { run: "↗", bike: "⌁", hike: "△", walk: "→" }[type] || "↗";
}

function renderActivities() {
  const orderedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const visibleActivities = orderedActivities.slice(0, 3);
  if (visibleActivities.length === 0) {
    elements.activities.innerHTML = '<p class="empty-activities">Your next run could be the first one. Go make it yours.</p>';
  } else {
    elements.activities.innerHTML = visibleActivities.map((activity) => activityMarkup(activity, currentUserId, false)).join("");
  }
  renderPublicActivities();
}

function renderPublicActivities() {
  const allActivities = getAllUserActivities();
  populateWeekOptions(elements.feedWeekFilter, allActivities, true);
  const type = elements.feedTypeFilter.value;
  const week = elements.feedWeekFilter.value;
  const visibleActivities = allActivities
    .filter((activity) => activity.ownerId === currentUserId || activity.visibility === "public")
    .filter((activity) => type === "all" || activity.type === type)
    .filter((activity) => week === "all" || weekKey(dateFromInput(activity.date)) === week)
    .sort((a, b) => b.date.localeCompare(a.date));

  elements.feedActivities.innerHTML = visibleActivities.length
    ? visibleActivities.map((activity) => activityMarkup(activity, activity.ownerId, true)).join("")
    : '<p class="empty-activities">No activities match these filters yet. Public activities from other profiles will appear here.</p>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function render() {
  renderStats();
  renderWeekChart();
  renderProgress();
  renderActivities();
}

function navigateToView(viewName, updateHistory = true) {
  if (!["overview", "activities", "progress"].includes(viewName)) return;
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });
  document.querySelectorAll(".nav-link[data-view-target]").forEach((link) => {
    const active = link.dataset.viewTarget === viewName;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  elements.breadcrumbTitle.textContent = viewName === "overview" ? "Overview" : activityTypeLabel(viewName);
  if (updateHistory && window.location.hash !== `#${viewName}-view`) {
    window.history.pushState(null, "", `#${viewName}-view`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "activities") renderPublicActivities();
  if (viewName === "progress") renderProgress();
}

function applyTheme(theme, persist = false) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  elements.themeToggle.innerHTML = `<span aria-hidden="true">${dark ? "☀" : "☾"}</span>`;
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  elements.themeToggle.setAttribute("aria-label", label);
  elements.themeToggle.title = label;
  elements.themeColor.content = dark ? "#181a17" : "#f7f7f2";
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch (error) {
      console.error("Could not save the theme preference.", error);
      showToast("Theme changed, but this browser could not remember it.");
    }
  }
}

function showToast(message) {
  clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = setTimeout(() => elements.toast.classList.remove("visible"), 2800);
}

async function readActivityPhoto(file) {
  if (!file || file.size === 0) return "";
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for your activity photo.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Activity photos must be 5 MB or smaller.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare that photo.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } finally {
    bitmap.close();
  }
}

document.querySelector("#open-log-run").addEventListener("click", () => {
  const dateField = elements.form.elements.namedItem("date");
  dateField.value = relativeDate(0);
  elements.formError.textContent = "";
  elements.dialog.showModal();
});

document.querySelectorAll("[data-open-log-run]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector("#open-log-run").click());
});

document.querySelectorAll(".nav-link[data-view-target]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToView(link.dataset.viewTarget);
  });
});

window.addEventListener("popstate", () => {
  const viewName = window.location.hash.replace("#", "").replace("-view", "");
  navigateToView(["overview", "activities", "progress"].includes(viewName) ? viewName : "overview", false);
});

document.querySelectorAll("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => navigateToView(button.dataset.openView));
});

document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  navigateToView("overview");
});

elements.themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
});

try {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");
} catch (error) {
  console.error("Could not load the saved theme preference.", error);
  applyTheme("light");
}

elements.userSelect.value = currentUserId;
elements.userSelect.addEventListener("change", () => {
  const nextUserId = elements.userSelect.value;
  if (!USERS.some((user) => user.id === nextUserId)) return;
  currentUserId = nextUserId;
  activities = loadActivities(currentUserId);
  try {
    localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  } catch (error) {
    console.error("Could not remember the selected demo user.", error);
    showToast("Profile switched, but this browser could not remember it.");
  }
  render();
});

document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
document.querySelector("#close-photo").addEventListener("click", () => elements.photoDialog.close());
elements.photoDialog.addEventListener("click", (event) => {
  if (event.target === elements.photoDialog) elements.photoDialog.close();
});
function handleActivityListClick(event) {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    const ownerId = deleteButton.dataset.deleteOwner || currentUserId;
    const ownerName = USERS.find((user) => user.id === ownerId)?.name || "this user";
    const ownerActivities = loadActivities(ownerId);
    const activity = ownerActivities.find((item) => item.id === deleteButton.dataset.deleteId);
    if (ownerId !== currentUserId || !activity || !window.confirm(`Remove “${activity.name || "activity"}” from ${ownerName}'s activities?`)) {
      return;
    }
    const nextActivities = ownerActivities.filter((item) => item.id !== activity.id);
    if (!saveActivities(nextActivities, ownerId)) {
      showToast("Could not remove this activity. Please check browser storage and try again.");
      return;
    }
    if (ownerId === currentUserId) activities = nextActivities;
    render();
    showToast("Activity removed.");
    return;
  }
  const photoButton = event.target.closest("[data-photo-id]");
  if (photoButton) {
    const ownerId = photoButton.dataset.photoOwner || currentUserId;
    const activity = loadActivities(ownerId).find((item) => item.id === photoButton.dataset.photoId);
    if (!activity?.photo) return;
    elements.photoPreview.src = activity.photo;
    elements.photoDialog.showModal();
  }
}

function handleActivityVisibilityChange(event) {
  const select = event.target.closest("[data-visibility-id]");
  if (!select) return;
  const ownerId = select.dataset.visibilityOwner;
  const ownerActivities = loadActivities(ownerId);
  const target = ownerActivities.find((activity) => activity.id === select.dataset.visibilityId);
  if (ownerId !== currentUserId || !target) {
    showToast("You can only change visibility on your own activities.");
    render();
    return;
  }

  const nextActivities = ownerActivities.map((activity) => activity.id === target.id
    ? { ...activity, visibility: select.value === "public" ? "public" : "private" }
    : activity);
  if (!saveActivities(nextActivities, ownerId)) {
    showToast("Could not update activity visibility. Please check browser storage.");
    render();
    return;
  }
  activities = nextActivities;
  render();
  showToast(`Activity is now ${target.visibility === "public" ? "private" : "public"}.`);
}

elements.activities.addEventListener("click", handleActivityListClick);
elements.feedActivities.addEventListener("click", handleActivityListClick);
elements.activities.addEventListener("change", handleActivityVisibilityChange);
elements.feedActivities.addEventListener("change", handleActivityVisibilityChange);
elements.feedTypeFilter.addEventListener("change", renderPublicActivities);
elements.feedWeekFilter.addEventListener("change", renderPublicActivities);
elements.progressWeekFilter.addEventListener("change", renderProgress);
elements.progressTypeFilter.addEventListener("change", renderProgress);
elements.lifetimeYearFilter.addEventListener("change", renderLifetimeChart);

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.formError.textContent = "";
  const formData = new FormData(elements.form);
  const distance = Number(formData.get("distance"));
  const duration = Number(formData.get("duration"));
  const elevation = Number(formData.get("elevation")) || 0;
  const date = formData.get("date");
  const dateValue = dateFromInput(date);
  const today = new Date();
  const dateParts = date.split("-").map(Number);
  const validDate = dateParts.length === 3
    && dateParts[0] > 0
    && dateValue.getFullYear() === dateParts[0]
    && dateValue.getMonth() === dateParts[1] - 1
    && dateValue.getDate() === dateParts[2];

  if (!Number.isFinite(distance) || distance <= 0 || distance > 300 || !Number.isFinite(duration) || duration <= 0 || duration > 1440 || !validDate) {
    elements.formError.textContent = "Add a valid distance, duration, and date to save this activity.";
    return;
  }
  const type = String(formData.get("activityType"));
  if (!ACTIVITY_TYPES.includes(type)) {
    elements.formError.textContent = "Choose Run, Bike, Hike, or Walk for this activity.";
    return;
  }
  if (dateValue > new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    elements.formError.textContent = "Activity dates can’t be in the future.";
    return;
  }

  let photo;
  try {
    photo = await readActivityPhoto(formData.get("photo"));
  } catch (error) {
    elements.formError.textContent = error.message || "Could not read that activity photo.";
    return;
  }

  const activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(formData.get("name") || "").trim() || `${activityTypeLabel(type)} activity`,
    type,
    visibility: formData.get("visibility") === "public" ? "public" : "private",
    distance,
    duration,
    elevation,
    date,
    note: String(formData.get("note") || "").trim(),
    photo,
  };
  const nextActivities = [activity, ...activities];
  if (!saveActivities(nextActivities)) {
    elements.formError.textContent = "Your activity or photo could not be saved in this browser. Try a smaller photo or check available storage.";
    return;
  }
  activities = nextActivities;
  elements.form.reset();
  elements.dialog.close();
  render();
  showToast("Activity saved. Nice work showing up!");
});

render();
const initialView = window.location.hash.replace("#", "").replace("-view", "");
navigateToView(["overview", "activities", "progress"].includes(initialView) ? initialView : "overview");
