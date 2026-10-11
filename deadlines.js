const STORAGE_KEY = "purpleNotesDeadlines";

const form = document.getElementById("deadlineForm");
const deadlineList = document.getElementById("deadlineList");
const filter = document.getElementById("filter");
const formMessage = document.getElementById("formMessage");
const dueDateInput = document.getElementById("dueDate");

let deadlines = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    deadlines = Array.isArray(saved) ? saved : [];
} catch {
    deadlines = [];
}

// Set the earliest allowed date to today.
const today = new Date();
const localToday =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

dueDateInput.min = localToday;

function saveDeadlines() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
        return true;
    } catch {
        formMessage.textContent =
            "Could not save. Check your browser storage settings.";
        return false;
    }
}

function getDueDate(deadline) {
    return new Date(`${deadline.date}T${deadline.time || "23:59"}:00`);
}

function isOverdue(deadline) {
    return !deadline.completed && getDueDate(deadline).getTime() < Date.now();
}

function formatDate(deadline) {
    const date = getDueDate(deadline);

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function updateSummary() {
    const active = deadlines.filter(item => !item.completed);

    document.getElementById("totalCount").textContent =
        deadlines.length;

    document.getElementById("upcomingCount").textContent =
        active.filter(item => !isOverdue(item)).length;

    document.getElementById("overdueCount").textContent =
        active.filter(isOverdue).length;

    document.getElementById("completedCount").textContent =
        deadlines.filter(item => item.completed).length;
}

function createBadge(text, className) {
    const badge = document.createElement("span");
    badge.className = `badge ${className}`;
    badge.textContent = text;
    return badge;
}

function renderDeadlines() {
    const selectedFilter = filter.value;
    deadlineList.replaceChildren();

    const filtered = deadlines
        .filter(item => {
            if (selectedFilter === "Completed") {
                return item.completed;
            }

            if (selectedFilter === "Overdue") {
                return isOverdue(item);
            }

            if (selectedFilter === "Upcoming") {
                return !item.completed && !isOverdue(item);
            }

            return true;
        })
        .sort((a, b) => getDueDate(a) - getDueDate(b));

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No deadlines here yet. You're all caught up! 💜";
        deadlineList.appendChild(empty);
        updateSummary();
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("article");
        card.className = "deadline-item";

        if (item.completed) {
            card.classList.add("completed");
        }

        const info = document.createElement("div");
        info.className = "deadline-info";

        const title = document.createElement("h3");
        title.textContent = item.title;

        const subject = document.createElement("p");
        subject.textContent = `Subject: ${item.subject}`;

        const date = document.createElement("p");
        date.textContent = `Due: ${formatDate(item)}`;

        if (isOverdue(item)) {
            date.classList.add("status-overdue");
            date.textContent += " — OVERDUE";
        } else if (item.completed) {
            date.classList.add("status-completed");
            date.textContent += " — COMPLETED";
        }

        const badges = document.createElement("div");
        badges.className = "badges";

        badges.appendChild(
            createBadge(
                `${item.priority} priority`,
                `priority-${item.priority.toLowerCase()}`
            )
        );

        info.append(title, subject, date, badges);

        const actions = document.createElement("div");
        actions.className = "actions";

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = item.completed
            ? "Undo"
            : "Complete";
        completeButton.dataset.action = "toggle";
        completeButton.dataset.id = item.id;
        completeButton.setAttribute(
            "aria-label",
            item.completed
                ? `Reopen ${item.title}`
                : `Mark ${item.title} complete`
        );

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = item.id;
        deleteButton.setAttribute("aria-label", `Delete ${item.title}`);

        actions.append(completeButton, deleteButton);
        card.append(info, actions);
        deadlineList.appendChild(card);
    });

    updateSummary();
}

form.addEventListener("submit", event => {
    event.preventDefault();
    formMessage.textContent = "";

    const title = document.getElementById("title").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const date = dueDateInput.value;
    const time = document.getElementById("dueTime").value;
    const priority = document.getElementById("priority").value;

    if (!title || !subject || !date || !time) {
        formMessage.textContent = "Please fill in all fields.";
        return;
    }

    if (date < localToday) {
        formMessage.textContent = "Please choose today or a future date.";
        return;
    }

    const deadline = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        subject,
        date,
        time,
        priority,
        completed: false
    };

    deadlines.push(deadline);

    if (!saveDeadlines()) {
        deadlines.pop();
        return;
    }

    form.reset();
    document.getElementById("dueTime").value = "23:59";
    dueDateInput.min = localToday;

    formMessage.textContent = "Deadline added successfully! 💜";
    renderDeadlines();
});

deadlineList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const index = deadlines.findIndex(
        item => item.id === button.dataset.id
    );

    if (index === -1) return;

    const oldDeadlines = deadlines.map(item => ({ ...item }));

    if (button.dataset.action === "toggle") {
        deadlines[index].completed = !deadlines[index].completed;
    } else if (button.dataset.action === "delete") {
        const confirmed = confirm(
            `Delete "${deadlines[index].title}"?`
        );

        if (!confirmed) return;

        deadlines.splice(index, 1);
    }

    if (!saveDeadlines()) {
        deadlines = oldDeadlines;
        renderDeadlines();
        return;
    }

    renderDeadlines();
});

filter.addEventListener("change", renderDeadlines);

renderDeadlines();