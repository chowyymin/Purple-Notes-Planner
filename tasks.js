
const form = document.getElementById("taskForm");
const nameInput = document.getElementById("taskName");
const categoryInput = document.getElementById("taskCategory");
const dateInput = document.getElementById("taskDate");
const priorityInput = document.getElementById("taskPriority");
const notesInput = document.getElementById("taskNotes");
const filterInput = document.getElementById("taskFilter");
const taskList = document.getElementById("taskList");

const STORAGE_KEY = "studyBloomDailyTasks";

let tasks = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) tasks = saved;
} catch (error) {
    console.error("Unable to load saved tasks:", error);
}

function todayString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "No due date";

    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" }
    );
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        alert("Could not save tasks. Please check your browser storage.");
        console.error(error);
        return false;
    }
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function dueLabel(task) {
    if (task.completed) return "Completed";

    const today = todayString();

    if (task.date < today) return "Overdue";
    if (task.date === today) return "Due today";

    const days = Math.round(
        (new Date(`${task.date}T12:00:00`) -
        new Date(`${today}T12:00:00`)) / 86400000
    );

    if (days === 1) return "Due tomorrow";
    if (days <= 7) return `Due in ${days} days`;

    return `Due ${formatDate(task.date)}`;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const remaining = total - completed;

    const percent = total
        ? Math.round(completed / total * 100)
        : 0;

    document.getElementById("totalCount").textContent = total;
    document.getElementById("doneCount").textContent = completed;
    document.getElementById("completedCount").textContent =
        `${completed} completed`;
    document.getElementById("remainingCount").textContent =
        `${remaining} remaining`;
    document.getElementById("progressPercent").textContent = `${percent}%`;
    document.getElementById("progressFill").style.width = `${percent}%`;

    document.getElementById("progressBar").setAttribute(
        "aria-valuenow", percent
    );

    document.getElementById("progressMessage").textContent =
        total === 0
            ? "Add your first task to begin!"
            : percent === 100
                ? "Wonderful! All your tasks are complete. 🌷"
                : "Keep going. Every little step counts.";

    const today = todayString();

    document.getElementById("dueTodayCount").textContent =
        tasks.filter(task =>
            !task.completed && task.date === today
        ).length;
}

function displayTasks() {
    taskList.replaceChildren();

    const selected = filterInput.value;

    const filteredTasks = tasks
        .filter(task => {
            if (selected === "Pending") return !task.completed;
            if (selected === "Completed") return task.completed;
            if (selected === "High") {
                return task.priority === "High" && !task.completed;
            }
            return true;
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) {
                return Number(a.completed) - Number(b.completed);
            }
            return (a.date || "9999-12-31").localeCompare(
                b.date || "9999-12-31"
            );
        });

    if (filteredTasks.length === 0) {
        const empty = makeElement("div", "empty-state");

        empty.appendChild(makeElement("div", "empty-icon", "🌷"));
        empty.appendChild(makeElement(
            "h3",
            "",
            tasks.length === 0 ? "Your day starts here!" : "No tasks found"
        ));
        empty.appendChild(makeElement(
            "p",
            "",
            tasks.length === 0
                ? "Add your first task and make today count."
                : "Try selecting a different filter."
        ));

        taskList.appendChild(empty);
        updateStats();
        return;
    }

    filteredTasks.forEach(task => {
        const card = makeElement(
            "article",
            `task-card${task.completed ? " completed" : ""}`
        );

        const checkbox = makeElement("input", "task-check");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.completed);
        checkbox.setAttribute("aria-label", "Mark task complete");

        checkbox.addEventListener("change", () => {
            task.completed = checkbox.checked;

            if (saveTasks()) displayTasks();
        });

        const info = makeElement("div", "task-info");

        const category = makeElement(
            "span",
            "category-tag",
            task.category || "Other"
        );

        const title = makeElement("h3", "task-title", task.name);

        const priority = makeElement(
            "span",
            `priority-tag priority-${(task.priority || "Medium").toLowerCase()}`,
            `${task.priority || "Medium"} Priority`
        );

        const due = makeElement("p", "task-due", `◷ ${dueLabel(task)}`);

        if (dueLabel(task) === "Overdue") due.classList.add("overdue");

        info.append(category, title, priority, due);

        if (task.notes) {
            info.appendChild(makeElement("p", "task-notes", task.notes));
        }

        const deleteButton = makeElement("button", "delete-button", "Delete");
        deleteButton.type = "button";

        deleteButton.addEventListener("click", () => {
            if (!confirm(`Delete "${task.name}"?`)) return;

            tasks = tasks.filter(item => item.id !== task.id);

            if (saveTasks()) displayTasks();
        });

        card.append(checkbox, info, deleteButton);
        taskList.appendChild(card);
    });

    updateStats();
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
        alert("Please enter a task name and due date.");
        return;
    }

    tasks.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        category: categoryInput.value,
        date,
        priority: priorityInput.value,
        notes: notesInput.value.trim(),
        completed: false
    });

    if (saveTasks()) {
        form.reset();
        categoryInput.value = "School";
        priorityInput.value = "Medium";
        displayTasks();
    }
});

filterInput.addEventListener("change", displayTasks);

// Show today's date
document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });

// Don't allow selecting a past date for a new task.
dateInput.min = todayString();

displayTasks();
