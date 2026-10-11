const examForm = document.getElementById("examForm");
const examList = document.getElementById("examList");
const examFilter = document.getElementById("examFilter");

const STORAGE_KEY = "studyBloomExamPlanner";
let exams = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) exams = saved;
} catch (error) {
    console.error("Could not load exams:", error);
}

const fields = {
    editId: document.getElementById("editId"),
    name: document.getElementById("examName"),
    subject: document.getElementById("subject"),
    date: document.getElementById("examDate"),
    type: document.getElementById("examType"),
    status: document.getElementById("examStatus"),
    time: document.getElementById("examTime"),
    topics: document.getElementById("examTopics"),
    notes: document.getElementById("examNotes")
};

const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelEdit");

function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateObject(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(dateString) {
    return dateObject(dateString).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function saveExams() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
        return true;
    } catch (error) {
        alert("Unable to save exams. Please check your browser storage.");
        console.error(error);
        return false;
    }
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function daysUntil(dateString) {
    const today = dateObject(todayString());
    const examDate = dateObject(dateString);

    return Math.round((examDate - today) / 86400000);
}

function countdownText(exam) {
    if (exam.date < todayString()) {
        return `Exam date passed · ${formatDate(exam.date)}`;
    }

    const days = daysUntil(exam.date);

    if (days === 0) return "✦ Your exam is today!";
    if (days === 1) return "Only 1 day left!";
    return `${days} days left to prepare`;
}

function updateStats() {
    const today = todayString();
    const upcoming = exams.filter(exam => exam.date >= today);
    const withinWeek = upcoming.filter(
        exam => daysUntil(exam.date) <= 7
    );
    const ready = upcoming.filter(exam => exam.status === "Ready");

    document.getElementById("upcomingCount").textContent = upcoming.length;
    document.getElementById("weekCount").textContent = withinWeek.length;
    document.getElementById("readyCount").textContent = ready.length;
}

function renderExams() {
    examList.replaceChildren();

    const filter = examFilter.value;

    const filtered = exams
        .filter(exam => {
            if (filter === "Upcoming") {
                return exam.date >= todayString();
            }

            if (filter === "Past") {
                return exam.date < todayString();
            }

            if (["Not Started", "Studying", "Ready"].includes(filter)) {
                return exam.status === filter && exam.date >= todayString();
            }

            return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    if (filtered.length === 0) {
        const empty = createElement("div", "empty-state");

        empty.append(
            createElement("div", "", "🌸"),
            createElement("h3", "", "Your exam planner is ready!"),
            createElement(
                "p",
                "",
                exams.length === 0
                    ? "Add your first exam above and start planning your review."
                    : "No exams match this filter. Try another option."
            )
        );

        examList.appendChild(empty);
        updateStats();
        return;
    }

    filtered.forEach(exam => {
        const card = createElement("article", "exam-card");

        const dateBox = createElement("div", "exam-date-box");
        const examDate = dateObject(exam.date);

        dateBox.append(
            createElement(
                "span",
                "month",
                examDate.toLocaleDateString(undefined, { month: "short" })
            ),
            createElement("span", "day", examDate.getDate())
        );

        const content = createElement("div", "exam-content");

        content.append(
            createElement("span", "tag type-tag", exam.type),
            createElement("h3", "exam-title", exam.name),
            createElement("p", "exam-subject", `📚 ${exam.subject}`)
        );

        const badges = createElement("div", "exam-badges");
        badges.appendChild(
            createElement(
                "span",
                `tag status-${exam.status.toLowerCase().replaceAll(" ", "-")}`,
                exam.status
            )
        );
        content.appendChild(badges);

        const countdown = createElement(
            "p",
            `countdown${exam.date < todayString() ? " overdue" : ""}`,
            `◷ ${countdownText(exam)}`
        );
        content.appendChild(countdown);

        if (exam.time) {
            const time = createElement(
                "p",
                "exam-detail",
                `🕒 Exam time: ${new Date(`2000-01-01T${exam.time}`).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit"
                })}`
            );
            content.appendChild(time);
        }

        if (exam.topics.trim()) {
            const topicBlock = createElement("div", "exam-detail");
            topicBlock.appendChild(
                createElement("strong", "", "Topics to review:")
            );

            const topicList = createElement("ul", "topics-list");

            exam.topics
                .split(/[\n,]+/)
                .map(topic => topic.trim())
                .filter(Boolean)
                .forEach(topic => {
                    topicList.appendChild(createElement("li", "", topic));
                });

            topicBlock.appendChild(topicList);
            content.appendChild(topicBlock);
        }

        if (exam.notes.trim()) {
            content.appendChild(
                createElement("p", "exam-detail", `♡ ${exam.notes}`)
            );
        }

        const actions = createElement("div", "exam-actions");

        const editButton = createElement("button", "edit-button", "✎ Edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => editExam(exam.id));

        const deleteButton = createElement("button", "delete-button", "Delete");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteExam(exam.id));

        actions.append(editButton, deleteButton);
        content.appendChild(actions);

        card.append(dateBox, content);
        examList.appendChild(card);
    });

    updateStats();
}

examForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = fields.name.value.trim();
    const subject = fields.subject.value.trim();
    const date = fields.date.value;

    if (!name || !subject || !date) {
        alert("Please fill in the exam name, subject, and date.");
        return;
    }

    const id = fields.editId.value;

    if (id) {
        const exam = exams.find(item => item.id === id);

        if (!exam) return;

        Object.assign(exam, {
            name,
            subject,
            date,
            type: fields.type.value,
            status: fields.status.value,
            time: fields.time.value,
            topics: fields.topics.value.trim(),
            notes: fields.notes.value.trim()
        });
    } else {
        exams.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name,
            subject,
            date,
            type: fields.type.value,
            status: fields.status.value,
            time: fields.time.value,
            topics: fields.topics.value.trim(),
            notes: fields.notes.value.trim()
        });
    }

    if (saveExams()) {
        resetForm();
        renderExams();
    }
});

function editExam(id) {
    const exam = exams.find(item => item.id === id);
    if (!exam) return;

    fields.editId.value = exam.id;
    fields.name.value = exam.name;
    fields.subject.value = exam.subject;
    fields.date.value = exam.date;
    fields.type.value = exam.type;
    fields.status.value = exam.status;
    fields.time.value = exam.time || "";
    fields.topics.value = exam.topics || "";
    fields.notes.value = exam.notes || "";

    saveButton.textContent = "Save Changes";
    cancelButton.hidden = false;

    examForm.scrollIntoView({ behavior: "smooth", block: "start" });
    fields.name.focus();
}

function deleteExam(id) {
    const exam = exams.find(item => item.id === id);
    if (!exam) return;

    if (!confirm(`Delete the exam "${exam.name}"?`)) return;

    exams = exams.filter(item => item.id !== id);

    if (saveExams()) {
        resetForm();
        renderExams();
    }
}

function resetForm() {
    examForm.reset();
    fields.editId.value = "";
    fields.status.value = "Not Started";
    fields.type.value = "Quiz";
    saveButton.textContent = "+ Save Exam";
    cancelButton.hidden = true;
}

cancelButton.addEventListener("click", resetForm);
examFilter.addEventListener("change", renderExams);

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });

renderExams();