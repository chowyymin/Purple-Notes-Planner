
const form = document.getElementById("eventForm");
const scheduleGrid = document.getElementById("scheduleGrid");
const STORAGE_KEY = "studyBloomWeeklySchedule";

let events = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) events = saved;
} catch (error) {
    console.error("Could not load schedule:", error);
}

const $ = id => document.getElementById(id);

let weekOffset = 0;

function localDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getMonday(date) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    return monday;
}

function currentWeekStart() {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
}

function formatTime(time) {
    const [hour, minute] = time.split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function saveEvents() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        return true;
    } catch (error) {
        alert("Could not save your schedule. Check your browser storage.");
        return false;
    }
}

function addText(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function eventDateForDay(event, date) {
    // A dated event appears only on its selected date.
    if (event.date) return event.date === localDateString(date);

    // An undated event repeats every week on its selected weekday.
    return Number(event.day) === date.getDay();
}

function updateStats() {
    const start = currentWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const weekEvents = events.filter(event => {
        if (event.date) {
            return event.date >= localDateString(start) &&
                   event.date <= localDateString(end);
        }
        return true; // Weekly repeating events
    });

    const studyEvents = weekEvents.filter(event =>
        ["Study Session", "Exam Review"].includes(event.type)
    );

    const hours = weekEvents.reduce((total, event) => {
        const [sh, sm] = event.start.split(":").map(Number);
        const [eh, em] = event.end.split(":").map(Number);
        return total + Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
    }, 0);

    $("eventCount").textContent = weekEvents.length;
    $("studyCount").textContent = studyEvents.length;
    $("hourCount").textContent = Number(hours.toFixed(1));
}

function renderSchedule() {
    scheduleGrid.replaceChildren();

    const start = currentWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    $("weekLabel").textContent =
        `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ` +
        `${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        const column = addText("section", "day-column", "");
        if (localDateString(date) === localDateString(new Date())) {
            column.classList.add("today");
        }

        const heading = addText("div", "day-heading", "");
        heading.append(
            addText("strong", "", date.toLocaleDateString(undefined, { weekday: "short" })),
            addText("span", "", date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric"
            }))
        );
        column.appendChild(heading);

        const dayEvents = events
            .filter(event => eventDateForDay(event, date))
            .sort((a, b) => a.start.localeCompare(b.start));

        if (dayEvents.length === 0) {
            column.appendChild(addText("p", "empty-day", "Nothing planned yet ♡"));
        }

        dayEvents.forEach(event => {
            const card = addText("article", "event-card", "");
            const typeClass = "type-" + event.type.toLowerCase().replaceAll(" ", "-");
            card.classList.add(typeClass);

            card.append(
                addText("h3", "", event.title),
                addText("p", "", event.type),
                addText("small", "", `${formatTime(event.start)} – ${formatTime(event.end)}`)
            );

            if (event.notes) {
                card.appendChild(addText("p", "", event.notes));
            }

            const actions = addText("div", "event-actions", "");

            const edit = addText("button", "", "Edit");
            edit.type = "button";
            edit.addEventListener("click", () => editEvent(event.id));

            const remove = addText("button", "", "Delete");
            remove.type = "button";
            remove.addEventListener("click", () => deleteEvent(event.id));

            actions.append(edit, remove);
            card.appendChild(actions);
            column.appendChild(card);
        });

        scheduleGrid.appendChild(column);
    }

    updateStats();
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("eventTitle").value.trim();
    const day = $("eventDay").value;
    const date = $("eventDate").value;
    const start = $("startTime").value;
    const end = $("endTime").value;
    const editId = $("editId").value;

    if (!title || !start || !end) {
        alert("Please fill in the event name and both times.");
        return;
    }

    if (end <= start) {
        alert("The end time must be later than the start time.");
        return;
    }

    if (date && new Date(date + "T12:00:00").getDay() !== Number(day)) {
        const confirmDay = confirm(
            "The selected date does not match the selected weekday. " +
            "Use the weekday of the date instead?"
        );
        if (!confirmDay) return;
        $("eventDay").value = String(new Date(date + "T12:00:00").getDay());
    }

    const data = {
        title,
        type: $("eventType").value,
        day: $("eventDay").value,
        date,
        start,
        end,
        notes: $("eventNotes").value.trim()
    };

    if (editId) {
        const existing = events.find(item => item.id === editId);
        if (!existing) return;
        Object.assign(existing, data);
    } else {
        events.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ...data
        });
    }

    if (saveEvents()) {
        resetForm();
        renderSchedule();
    }
});

function editEvent(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;

    $("editId").value = event.id;
    $("eventTitle").value = event.title;
    $("eventType").value = event.type;
    $("eventDay").value = event.day;
    $("eventDate").value = event.date || "";
    $("startTime").value = event.start;
    $("endTime").value = event.end;
    $("eventNotes").value = event.notes || "";

    $("formTitle").textContent = "✎ Edit Event";
    $("saveButton").textContent = "Save Changes";
    $("cancelEdit").hidden = false;

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    $("eventTitle").focus();
}

function deleteEvent(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;

    if (!confirm(`Delete "${event.title}" from your schedule?`)) return;

    events = events.filter(item => item.id !== id);

    if (saveEvents()) {
        resetForm();
        renderSchedule();
    }
}

function resetForm() {
    form.reset();
    $("editId").value = "";
    $("startTime").value = "08:00";
    $("endTime").value = "09:00";
    $("formTitle").textContent = "＋ Add an Event";
    $("saveButton").textContent = "＋ Save Event";
    $("cancelEdit").hidden = true;
}

$("cancelEdit").addEventListener("click", resetForm);

$("previousWeek").addEventListener("click", () => {
    weekOffset--;
    renderSchedule();
});

$("nextWeek").addEventListener("click", () => {
    weekOffset++;
    renderSchedule();
});

$("thisWeek").addEventListener("click", () => {
    weekOffset = 0;
    renderSchedule();
});

renderSchedule();
