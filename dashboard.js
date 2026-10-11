
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "studyBloomDashboard";

let data = {
    tasks: [],
    deadlines: []
};

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks) &&
        Array.isArray(saved.deadlines)) {
        data = saved;
    }
} catch (error) {
    console.warn("Saved planner data could not be loaded.");
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        alert("Your browser could not save the changes.");
    }
}

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

// Display today's date
function showDate() {
    $("todayDate").textContent =
        new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(new Date());
}

// Update completed-task statistics
function renderProgress() {
    const completed = data.tasks.filter(task => task.done).length;
    const total = data.tasks.length;

    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    $("completedCount").textContent = `${completed} / ${total}`;
    $("progressBar").style.width = `${percentage}%`;

    $("progressText").textContent = total
        ? `${percentage}% completed`
        : "Let's get started!";

    $("taskBadge").textContent =
        `${total} ${total === 1 ? "task" : "tasks"}`;
}

// Render the task list
function renderTasks() {
    const list = $("taskList");
    list.replaceChildren();

    if (data.tasks.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No tasks yet. Add your first task! ♡";
        list.append(message);
    }

    data.tasks.forEach(task => {
        const row = document.createElement("div");
        row.className = "task-item" + (task.done ? " done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.setAttribute("aria-label", "Complete " + task.title);

        checkbox.addEventListener("change", () => {
            task.done = checkbox.checked;
            saveData();
            renderTasks();
            renderProgress();
        });

        const title = document.createElement("span");
        title.textContent = task.title;

        const remove = document.createElement("button");
        remove.className = "delete-button";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete task");

        remove.addEventListener("click", () => {
            data.tasks = data.tasks.filter(item => item.id !== task.id);
            saveData();
            renderTasks();
            renderProgress();
        });

        row.append(checkbox, title, remove);
        list.append(row);
    });

    renderProgress();
}

// Add a new task
$("taskForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("taskInput").value.trim();
    if (!title) return;

    data.tasks.push({
        id: createId(),
        title,
        done: false
    });

    saveData();
    $("taskInput").value = "";
    renderTasks();
});

// Format dates without timezone shifts
function parseDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function renderDeadlines() {
    const list = $("deadlineList");
    list.replaceChildren();

    const sorted = [...data.deadlines].sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    $("deadlineCount").textContent = sorted.length;

    if (sorted.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No deadlines added yet. You're all set! ♡";
        list.append(message);
    }

    sorted.forEach(item => {
        const row = document.createElement("div");
        row.className = "deadline-item";

        const dateBox = document.createElement("div");
        dateBox.className = "deadline-date";

        const date = parseDate(item.date);

        const monthDay = document.createElement("div");
        monthDay.textContent = new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric"
        }).format(date);

        const year = document.createElement("div");
        year.textContent = date.getFullYear();

        dateBox.append(monthDay, year);

        const info = document.createElement("div");
        info.className = "deadline-info";

        const title = document.createElement("strong");
        title.textContent = item.title;

        const status = document.createElement("small");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(date);
        dueDate.setHours(0, 0, 0, 0);

        const days = Math.round(
            (dueDate - today) / (1000 * 60 * 60 * 24)
        );

        if (days < 0) {
            status.textContent = "Past due";
        } else if (days === 0) {
            status.textContent = "Due today";
        } else if (days === 1) {
            status.textContent = "Due tomorrow";
        } else {
            status.textContent = `${days} days left`;
        }

        info.append(title, status);

        const remove = document.createElement("button");
        remove.className = "delete-button";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete deadline");

        remove.addEventListener("click", () => {
            data.deadlines = data.deadlines.filter(
                deadline => deadline.id !== item.id
            );
            saveData();
            renderDeadlines();
        });

        row.append(dateBox, info, remove);
        list.append(row);
    });
}

// Add a deadline
$("deadlineForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("deadlineTitle").value.trim();
    const date = $("deadlineDate").value;

    if (!title || !date) return;

    data.deadlines.push({
        id: createId(),
        title,
        date
    });

    saveData();
    $("deadlineTitle").value = "";
    $("deadlineDate").value = "";

    renderDeadlines();
});

// Initialize the dashboard
showDate();
renderTasks();
renderDeadlines();
