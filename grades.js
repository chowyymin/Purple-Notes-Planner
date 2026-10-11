
const form = document.getElementById("gradeForm");
const gradeList = document.getElementById("gradeList");
const subjectFilter = document.getElementById("subjectFilter");
const termFilter = document.getElementById("termFilter");

const STORAGE_KEY = "studyBloomGradeTracker";
let grades = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) grades = saved;
} catch (error) {
    console.error("Could not load saved grades:", error);
}

const $ = id => document.getElementById(id);

function saveGrades() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(grades));
        return true;
    } catch (error) {
        alert("Could not save your grades. Please check your browser storage.");
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

function calculateAverage(entries) {
    const validEntries = entries.filter(entry =>
        Number.isFinite(Number(entry.grade)) &&
        Number.isFinite(Number(entry.weight)) &&
        Number(entry.weight) > 0
    );

    if (validEntries.length === 0) return null;

    const totalWeight = validEntries.reduce(
        (sum, entry) => sum + Number(entry.weight), 0
    );

    const weightedTotal = validEntries.reduce(
        (sum, entry) => sum + Number(entry.grade) * Number(entry.weight), 0
    );

    return weightedTotal / totalWeight;
}

function formatGrade(value) {
    return `${Number(value).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function updateStats() {
    const average = calculateAverage(grades);
    const subjects = new Set(
        grades.map(entry => entry.subject.trim().toLowerCase())
    );

    $("overallAverage").textContent =
        average === null ? "—" : formatGrade(average);

    $("subjectCount").textContent = subjects.size;
    $("entryCount").textContent = grades.length;
}

function updateSubjectFilter() {
    const selected = subjectFilter.value;

    const subjects = [...new Set(
        grades.map(entry => entry.subject.trim())
    )].sort((a, b) => a.localeCompare(b));

    subjectFilter.replaceChildren(
        makeElement("option", "", "All subjects")
    );
    subjectFilter.options[0].value = "all";

    subjects.forEach(subject => {
        const option = makeElement("option", "", subject);
        option.value = subject;
        subjectFilter.appendChild(option);
    });

    if (subjects.includes(selected)) {
        subjectFilter.value = selected;
    } else {
        subjectFilter.value = "all";
    }
}

function renderGrades() {
    gradeList.replaceChildren();

    const selectedSubject = subjectFilter.value;
    const selectedTerm = termFilter.value;

    const filtered = grades
        .filter(entry =>
            (selectedSubject === "all" ||
                entry.subject.trim() === selectedSubject) &&
            (selectedTerm === "all" || entry.term === selectedTerm)
        )
        .sort((a, b) => {
            const subjectOrder = a.subject.localeCompare(b.subject);
            if (subjectOrder !== 0) return subjectOrder;
            return (b.date || "").localeCompare(a.date || "");
        });

    if (filtered.length === 0) {
        const empty = makeElement("div", "empty-state", "");
        empty.append(
            makeElement("span", "", "🌷"),
            makeElement("h3", "", "Your grade book is waiting!"),
            makeElement(
                "p",
                "",
                grades.length === 0
                    ? "Add your first grade above to start tracking your progress."
                    : "No grades match these filters. Try another selection."
            )
        );
        gradeList.appendChild(empty);
    }

    filtered.forEach(entry => {
        const card = makeElement("article", "grade-card", "");
        const info = makeElement("div", "grade-info", "");

        const badges = makeElement("div", "grade-badges", "");
        badges.append(
            makeElement("span", "tag", entry.subject),
            makeElement("span", "tag term", entry.term)
        );

        info.append(
            badges,
            makeElement("h3", "", entry.assessment),
            makeElement(
                "p",
                "",
                `Weight: ${entry.weight}%` +
                (entry.date ? ` · ${entry.date}` : "")
            )
        );

        const actions = makeElement("div", "grade-actions", "");

        const editButton = makeElement("button", "", "✎ Edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => editGrade(entry.id));

        const deleteButton = makeElement("button", "delete-button", "Delete");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteGrade(entry.id));

        actions.append(editButton, deleteButton);
        info.appendChild(actions);

        const score = makeElement("div", "grade-score", formatGrade(entry.grade));
        score.appendChild(makeElement("small", "", "Recorded grade"));

        card.append(info, score);
        gradeList.appendChild(card);
    });

    updateStats();
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const subject = $("subject").value.trim();
    const assessment = $("assessment").value.trim();
    const grade = Number($("grade").value);
    const weight = Number($("weight").value);
    const editId = $("editId").value;

    if (!subject || !assessment) {
        alert("Please enter the subject and assessment name.");
        return;
    }

    if ($("grade").value.trim() === "" ||
        !Number.isFinite(grade) || grade < 0 || grade > 100) {
        alert("Enter a grade between 0 and 100.");
        return;
    }

    if ($("weight").value.trim() === "" ||
        !Number.isFinite(weight) || weight <= 0 || weight > 100) {
        alert("Enter a weight greater than 0 and no more than 100.");
        return;
    }

    const record = {
        subject,
        assessment,
        grade,
        weight,
        term: $("term").value,
        date: $("gradeDate").value
    };

    if (editId) {
        const existing = grades.find(item => item.id === editId);
        if (!existing) return;
        Object.assign(existing, record);
    } else {
        grades.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ...record
        });
    }

    if (saveGrades()) {
        resetForm();
        updateSubjectFilter();
        renderGrades();
    }
});

function editGrade(id) {
    const entry = grades.find(item => item.id === id);
    if (!entry) return;

    $("editId").value = entry.id;
    $("subject").value = entry.subject;
    $("assessment").value = entry.assessment;
    $("grade").value = entry.grade;
    $("weight").value = entry.weight;
    $("term").value = entry.term;
    $("gradeDate").value = entry.date || "";

    $("formTitle").textContent = "✎ Edit Grade";
    $("saveButton").textContent = "Save Changes";
    $("cancelEdit").hidden = false;

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    $("subject").focus();
}

function deleteGrade(id) {
    const entry = grades.find(item => item.id === id);
    if (!entry) return;

    if (!confirm(`Delete "${entry.assessment}" for ${entry.subject}?`)) {
        return;
    }

    grades = grades.filter(item => item.id !== id);

    if (saveGrades()) {
        resetForm();
        updateSubjectFilter();
        renderGrades();
    }
}

function resetForm() {
    form.reset();
    $("editId").value = "";
    $("weight").value = "100";
    $("formTitle").textContent = "＋ Add a Grade";
    $("saveButton").textContent = "＋ Save Grade";
    $("cancelEdit").hidden = true;
}

$("cancelEdit").addEventListener("click", resetForm);
subjectFilter.addEventListener("change", renderGrades);
termFilter.addEventListener("change", renderGrades);

updateSubjectFilter();
renderGrades();
