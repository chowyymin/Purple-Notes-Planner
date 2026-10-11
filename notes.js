
const STORAGE_KEY = "studyBloomNotes";

const $ = id => document.getElementById(id);

const form = $("noteForm");
const editor = $("noteEditor");
const notesGrid = $("notesGrid");
const folderGrid = $("folderGrid");

let notes = [];

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) notes = saved;
} catch (error) {
    console.error("Could not load notes:", error);
}

let selectedFolder = "all";

function saveNotes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        alert("Could not save your notes. Please check your browser storage.");
        return false;
    }
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function dateLabel(date) {
    if (!date) return "Recently updated";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Recently updated";

    return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function openEditor(note = null) {
    editor.hidden = false;

    if (note) {
        $("editId").value = note.id;
        $("noteTitle").value = note.title;
        $("noteSubject").value = note.subject || "";
        $("noteTags").value = note.tags || "";
        $("noteColor").value = note.color || "lavender";
        $("noteContent").value = note.content;

        $("formTitle").textContent = "✎ Edit Note";
        $("saveNoteButton").textContent = "Save Changes";
    } else {
        form.reset();
        $("editId").value = "";
        $("noteColor").value = "lavender";

        $("formTitle").textContent = "＋ Create a Note";
        $("saveNoteButton").textContent = "♡ Save Note";
    }

    editor.scrollIntoView({ behavior: "smooth", block: "start" });
    $("noteTitle").focus();
}

function closeEditor() {
    form.reset();
    $("editId").value = "";
    editor.hidden = true;
    $("formTitle").textContent = "＋ Create a Note";
    $("saveNoteButton").textContent = "♡ Save Note";
}

$("newNoteButton").addEventListener("click", () => openEditor());
$("cancelNoteButton").addEventListener("click", closeEditor);

form.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("noteTitle").value.trim();
    const content = $("noteContent").value.trim();

    if (!title || !content) {
        alert("Please enter a title and some note content.");
        return;
    }

    const id = $("editId").value;
    const oldNote = notes.find(note => note.id === id);

    const noteData = {
        title,
        subject: $("noteSubject").value.trim() || "General",
        tags: $("noteTags").value.trim(),
        color: $("noteColor").value,
        content,
        updatedAt: new Date().toISOString(),
        createdAt: oldNote?.createdAt || new Date().toISOString()
    };

    if (id && oldNote) {
        Object.assign(oldNote, noteData);
    } else {
        notes.unshift({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ...noteData
        });
    }

    if (saveNotes()) {
        selectedFolder = "all";
        closeEditor();
        renderAll();
    }
});

function getFolders() {
    return [...new Set(
        notes.map(note => note.subject.trim() || "General")
    )].sort((a, b) => a.localeCompare(b));
}

function renderFolders() {
    folderGrid.replaceChildren();

    const folders = getFolders();
    const allButton = element("button", "folder-card", "");
    allButton.type = "button";

    if (selectedFolder === "all") allButton.classList.add("selected");

    const allIcon = element("span", "folder-icon", "▤");
    const allText = element("span", "folder-name", "All Notes");
    allText.appendChild(
        element("span", "folder-count", `${notes.length} notes`)
    );

    allButton.append(allIcon, allText);
    allButton.addEventListener("click", () => {
        selectedFolder = "all";
        $("folderFilter").value = "all";
        renderAll();
    });
    folderGrid.appendChild(allButton);

    folders.forEach(folder => {
        const button = element("button", "folder-card", "");
        button.type = "button";

        if (selectedFolder === folder) button.classList.add("selected");

        const icon = element("span", "folder-icon", "▣");
        const text = element("span", "folder-name", folder);
        const count = notes.filter(note => note.subject === folder).length;

        text.appendChild(element("span", "folder-count", `${count} notes`));
        button.append(icon, text);

        button.addEventListener("click", () => {
            selectedFolder = folder;
            $("folderFilter").value = folder;
            renderAll();
        });

        folderGrid.appendChild(button);
    });

    const addButton = element("button", "folder-card", "");
    addButton.type = "button";
    addButton.append(
        element("span", "folder-icon", "＋"),
        element("span", "folder-name", "Add Folder")
    );

    addButton.addEventListener("click", () => {
        const folderName = prompt("Enter a name for your new folder:");

        if (folderName && folderName.trim()) {
            $("noteSubject").value = folderName.trim();
            openEditor();
            $("noteSubject").value = folderName.trim();
        }
    });

    folderGrid.appendChild(addButton);
}

function updateFolderFilter() {
    const filter = $("folderFilter");
    const current = selectedFolder;

    filter.replaceChildren();

    const allOption = element("option", "", "All folders");
    allOption.value = "all";
    filter.appendChild(allOption);

    getFolders().forEach(folder => {
        const option = element("option", "", folder);
        option.value = folder;
        filter.appendChild(option);
    });

    if (current !== "all" && getFolders().includes(current)) {
        filter.value = current;
    } else {
        filter.value = "all";
        selectedFolder = "all";
    }
}

function renderNotes() {
    notesGrid.replaceChildren();

    const query = $("searchNotes").value.trim().toLowerCase();
    const folder = $("folderFilter").value;
    const sort = $("sortNotes").value;

    let filtered = notes.filter(note => {
        const searchable = [
            note.title,
            note.subject,
            note.tags,
            note.content
        ].join(" ").toLowerCase();

        return searchable.includes(query) &&
            (folder === "all" || note.subject === folder);
    });

    if (sort === "title") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "oldest") {
        filtered.sort((a, b) =>
            (a.createdAt || "").localeCompare(b.createdAt || "")
        );
    } else {
        filtered.sort((a, b) =>
            (b.updatedAt || "").localeCompare(a.updatedAt || "")
        );
    }

    $("listHeading").textContent =
        folder === "all" ? "All Notes" : folder;

    $("noteCount").textContent =
        `${filtered.length} ${filtered.length === 1 ? "note" : "notes"} found`;

    if (filtered.length === 0) {
        const empty = element("div", "empty-state", "");
        empty.append(
            element("span", "", "🌷"),
            element("h3", "", notes.length ? "No notes found" : "Your notebook is waiting!"),
            element(
                "p",
                "",
                notes.length
                    ? "Try a different search or folder."
                    : "Create your first note and keep your ideas in one place."
            )
        );
        notesGrid.appendChild(empty);
        return;
    }

    filtered.forEach(note => {
        const card = element(
            "article",
            `note-card color-${note.color || "lavender"}`,
            ""
        );

        card.appendChild(element("h3", "", note.title));
        card.appendChild(
            element("p", "note-subject", `▣ ${note.subject || "General"}`)
        );
        card.appendChild(element("p", "note-preview", note.content));

        if (note.tags) {
            const tags = element("div", "note-tags", "");

            note.tags.split(",").map(tag => tag.trim())
                .filter(Boolean)
                .forEach(tag => {
                    tags.appendChild(element("span", "note-tag", `# ${tag}`));
                });

            card.appendChild(tags);
        }

        const footer = element("div", "note-footer", "");
        footer.appendChild(
            element("span", "", `♡ ${dateLabel(note.updatedAt)}`)
        );

        const actions = element("div", "note-actions", "");

        const editButton = element("button", "", "Edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => openEditor(note));

        const deleteButton = element("button", "delete-button", "Delete");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteNote(note.id));

        actions.append(editButton, deleteButton);
        footer.appendChild(actions);
        card.appendChild(footer);

        notesGrid.appendChild(card);
    });
}

function deleteNote(id) {
    const note = notes.find(item => item.id === id);
    if (!note) return;

    if (!confirm(`Delete the note "${note.title}"?`)) return;

    const previousNotes = [...notes];
    notes = notes.filter(item => item.id !== id);

    if (saveNotes()) {
        if ($("editId").value === id) closeEditor();
        renderAll();
    } else {
        notes = previousNotes;
    }
}

function renderAll() {
    updateFolderFilter();
    renderFolders();
    renderNotes();
}

$("searchNotes").addEventListener("input", renderNotes);

$("folderFilter").addEventListener("change", () => {
    selectedFolder = $("folderFilter").value;
    renderAll();
});

$("sortNotes").addEventListener("change", renderNotes);

$("allNotesButton").addEventListener("click", () => {
    selectedFolder = "all";
    $("searchNotes").value = "";
    $("folderFilter").value = "all";
    renderAll();
});

renderAll();
