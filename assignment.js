const form = document.getElementById("assignmentForm");
const nameInput = document.getElementById("assignmentName");
const dateInput = document.getElementById("assignmentDate");
const list = document.getElementById("assignmentList");

// Load saved assignments from the browser
let assignments = JSON.parse(
    localStorage.getItem("studyBloomAssignments") || "[]"
);

// Save assignments
function saveAssignments() {
    localStorage.setItem(
        "studyBloomAssignments",
        JSON.stringify(assignments)
    );
}

// Display assignments
function displayAssignments() {
    list.innerHTML = "";

    assignments.sort((a, b) => a.date.localeCompare(b.date));

    if (assignments.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>No assignments yet!</h3>
                <p>Add your first assignment using the form above.</p>
            </div>
        `;
        updateCount();
        return;
    }

    assignments.forEach((assignment) => {
        const card = document.createElement("div");
        card.className = "assignment-card";

        if (assignment.completed) {
            card.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "assignment-check";
        checkbox.checked = Boolean(assignment.completed);
        checkbox.setAttribute("aria-label", "Mark assignment complete");

        checkbox.addEventListener("change", () => {
            assignment.completed = checkbox.checked;
            saveAssignments();
            displayAssignments();
        });

        const info = document.createElement("div");
        info.className = "assignment-info";

        const title = document.createElement("h3");
        title.textContent = assignment.name;

        const due = document.createElement("p");
        due.className = "due-date";
        due.textContent = "📅 Due: " + assignment.date;

        if (
            assignment.date < new Date().toISOString().slice(0, 10) &&
            !assignment.completed
        ) {
            due.classList.add("overdue");
            due.textContent += " — Overdue";
        }

        info.appendChild(title);
        info.appendChild(due);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            assignments = assignments.filter(
                item => item.id !== assignment.id
            );

            saveAssignments();
            displayAssignments();
        });

        card.appendChild(checkbox);
        card.appendChild(info);
        card.appendChild(deleteButton);

        list.appendChild(card);
    });

    updateCount();
}

// Update assignment count
function updateCount() {
    const count = document.getElementById("assignmentCount");

    if (count) {
        count.textContent =
            assignments.filter(item => !item.completed).length +
            " remaining";
    }
}

// Add a new assignment
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
        alert("Please enter an assignment name and due date.");
        return;
    }

    assignments.push({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        name: name,
        date: date,
        completed: false
    });

    saveAssignments();
    displayAssignments();

    form.reset();
});

// Show saved assignments when the page opens
displayAssignments();
