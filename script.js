document.addEventListener('DOMContentLoaded', () => {
    // Select DOM Elements
    const todoInput = document.getElementById('todo-input');
    const todoDate = document.getElementById('todo-date');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const clearAllBtn = document.getElementById('clear-all');
    const totalTasksSpan = document.getElementById('total-tasks');
    const completedTasksSpan = document.getElementById('completed-tasks');
    const themeToggle = document.getElementById('checkbox');

    // Sidebar & Sync Elements
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuOpen = document.getElementById('mobile-menu-open');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const createListBtn = document.getElementById('create-list-btn');
    const newListNameInput = document.getElementById('new-list-name');
    const savedListsContainer = document.getElementById('saved-lists');
    const currentListTitle = document.getElementById('current-list-title');
    const syncIcon = document.getElementById('sync-icon');
    const syncText = document.getElementById('sync-text');

    // App State
    let allLists = {};
    let currentListId = null;
    let todos = [];
    let currentFilter = 'all';

    const LOCAL_STORAGE_KEY = 'todo_lists_data';

    // Initialize App
    async function init() {
        // Load theme preference
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme);
            if (currentTheme === 'dark') {
                themeToggle.checked = true;
            }
        }

        await loadAllLists();

        // Load last active list or create a default one
        const lastActiveListId = localStorage.getItem('lastActiveListId');
        if (lastActiveListId && allLists[lastActiveListId]) {
            switchList(lastActiveListId);
        } else if (Object.keys(allLists).length > 0) {
            switchList(Object.keys(allLists)[0]);
        } else {
            createDefaultList();
        }
    }

    // Data Management
    async function loadAllLists() {
        updateSyncStatus('Yükleniyor...', 'saving');

        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);

        // Migrate old 'todos_fallback' if present and new key is empty
        const fallbackData = localStorage.getItem('todos_fallback');
        if (!localData && fallbackData) {
            allLists = JSON.parse(fallbackData);
            localStorage.setItem(LOCAL_STORAGE_KEY, fallbackData);
        } else if (localData) {
            try {
                allLists = JSON.parse(localData).lists || {};
            } catch (e) {
                allLists = {};
            }
        } else {
            allLists = {};
        }

        updateSyncStatus('Kayıtlı', 'success');
        renderSidebarLists();
    }

    async function saveListToServer() {
        if (!currentListId) return;

        // Update local memory
        allLists[currentListId] = {
            id: currentListId,
            name: allLists[currentListId].name,
            todos: todos
        };

        try {
            updateSyncStatus('Kaydediliyor...', 'saving');
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ lists: allLists }));

            // Provide a tiny visual delay so user sees "Saving..."
            setTimeout(() => {
                updateSyncStatus('Kayıtlı', 'success');
                renderSidebarLists();
            }, 300);

        } catch (error) {
            console.error('Local storage quota exceeded or unavailable:', error);
            updateSyncStatus('Hafıza dolu', 'error');
        }
    }

    async function deleteListFromServer(id) {
        updateSyncStatus('Siliniyor...', 'saving');
        delete allLists[id];

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ lists: allLists }));

            renderSidebarLists();
            updateSyncStatus('Kayıtlı', 'success');

            // Switch to another list if active is deleted
            if (currentListId === id) {
                if (Object.keys(allLists).length > 0) {
                    switchList(Object.keys(allLists)[0]);
                } else {
                    createDefaultList();
                }
            }
        } catch (error) {
            console.error('Silinirken hata oluştu:', error);
            updateSyncStatus('Silme hatası', 'error');
        }
    }

    // List Management Logic
    function createDefaultList() {
        const id = 'default-' + Date.now();
        allLists[id] = { id: id, name: 'Genel', todos: [] };
        switchList(id);
    }

    function handleCreateList() {
        const name = newListNameInput.value.trim();
        if (!name) {
            alert('Lütfen bir liste adı girin.');
            return;
        }

        const id = 'list-' + Date.now();
        allLists[id] = { id: id, name: name, todos: [] };
        newListNameInput.value = '';
        switchList(id);

        // Close sidebar on mobile after creating
        sidebar.classList.remove('open');
    }

    function switchList(id) {
        currentListId = id;
        todos = allLists[id].todos || [];
        currentListTitle.textContent = allLists[id].name;
        localStorage.setItem('lastActiveListId', id);

        renderSidebarLists();
        renderTodos();
        updateStats();

        // Auto-save the list creation if it's new
        saveListToServer();
    }

    function updateSyncStatus(text, status) {
        syncText.textContent = text;
        const syncStatusDiv = syncText.parentElement;
        syncStatusDiv.className = 'sync-status ' + status;

        if (status === 'saving') {
            syncIcon.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
        } else if (status === 'success') {
            syncIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        } else {
            syncIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        }
    }

    // Event Listeners

    // Sidebar Mobile Toggles
    mobileMenuOpen.addEventListener('click', () => sidebar.classList.add('open'));
    mobileMenuClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // Sidebar List Actions
    createListBtn.addEventListener('click', handleCreateList);
    newListNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateList();
    });

    themeToggle.addEventListener('change', switchTheme);

    function switchTheme(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }

    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active class
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Apply filter
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    clearCompletedBtn.addEventListener('click', () => {
        todos = todos.filter(todo => !todo.completed);
        saveTodos();
        renderTodos();
        updateStats();
    });

    clearAllBtn.addEventListener('click', () => {
        if(confirm('Tüm görevleri silmek istediğinize emin misiniz?')) {
            todos = [];
            saveTodos();
            renderTodos();
            updateStats();
        }
    });

    // Add Todo
    function addTodo() {
        const text = todoInput.value.trim();
        const date = todoDate.value;

        if (text === '') {
            alert('Lütfen bir görev girin!');
            return;
        }

        const newTodo = {
            id: Date.now().toString(),
            text: text,
            date: date,
            completed: false
        };

        todos.push(newTodo);
        saveTodos();

        // Clear inputs
        todoInput.value = '';
        todoDate.value = '';

        renderTodos();
        updateStats();
        todoInput.focus();
    }

    // Toggle Todo Status
    function toggleTodo(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });

        saveTodos();
        renderTodos();
        updateStats();
    }

    // Delete Todo
    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
        updateStats();
    }

    // Edit Todo
    function editTodo(id, liElement) {
        const todo = todos.find(t => t.id === id);
        const taskContentDiv = liElement.querySelector('.task-content');

        // Save current content to restore if cancelled
        const originalHTML = taskContentDiv.innerHTML;

        // Create edit input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = todo.text;
        input.className = 'edit-input';

        // Replace content with input
        taskContentDiv.innerHTML = '';
        taskContentDiv.appendChild(input);
        input.focus();

        // Handle save
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveEdit();
        });

        function saveEdit() {
            const newText = input.value.trim();
            if (newText) {
                todos = todos.map(t => {
                    if (t.id === id) {
                        return { ...t, text: newText };
                    }
                    return t;
                });
                saveTodos();
            }
            renderTodos();
        }
    }

    // Sidebar Rendering
    function renderSidebarLists() {
        savedListsContainer.innerHTML = '';

        const listKeys = Object.keys(allLists);
        if (listKeys.length === 0) {
            savedListsContainer.innerHTML = '<li class="empty-msg">Henüz kayıtlı liste yok.</li>';
            return;
        }

        listKeys.forEach(key => {
            const list = allLists[key];
            const li = document.createElement('li');
            if (key === currentListId) li.classList.add('active');

            li.innerHTML = `
                <div class="list-name">
                    <i class="fas fa-list-ul"></i>
                    <span>${escapeHTML(list.name)}</span>
                </div>
                <button class="delete-list-btn" title="Listeyi Sil">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Switch list on click
            li.querySelector('.list-name').addEventListener('click', () => {
                switchList(key);
                sidebar.classList.remove('open');
            });

            // Delete list on click
            li.querySelector('.delete-list-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`"${list.name}" listesini tamamen silmek istediğinize emin misiniz?`)) {
                    deleteListFromServer(key);
                }
            });

            savedListsContainer.appendChild(li);
        });
    }

    // Helper Functions
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function isOverdue(dateString) {
        if (!dateString) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(dateString);
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    }

    function saveTodos() {
        // Instead of local storage, trigger the backend sync
        saveListToServer();
    }

    function updateStats() {
        totalTasksSpan.textContent = todos.length;
        const completedCount = todos.filter(t => t.completed).length;
        completedTasksSpan.textContent = completedCount;
    }

    function renderTodos() {
        todoList.innerHTML = '';

        let filteredTodos = todos;

        if (currentFilter === 'pending') {
            filteredTodos = todos.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTodos = todos.filter(t => t.completed);
        }

        if (filteredTodos.length === 0) {
            todoList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Gösterilecek görev yok.</p>';
            return;
        }

        // Sort: incomplete first, then by date (if exists)
        filteredTodos.sort((a, b) => {
            if(a.completed !== b.completed) return a.completed ? 1 : -1;
            if(a.date && b.date) return new Date(a.date) - new Date(b.date);
            if(a.date) return -1;
            if(b.date) return 1;
            return 0;
        });

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = todo.completed ? 'completed' : '';
            li.dataset.id = todo.id;

            const overdueClass = (!todo.completed && isOverdue(todo.date)) ? 'overdue' : '';
            const dateDisplay = todo.date ? `<div class="task-date ${overdueClass}"><i class="far fa-calendar-alt"></i> ${formatDate(todo.date)}</div>` : '';

            li.innerHTML = `
                <div class="task-info">
                    <input type="checkbox" class="checkbox" ${todo.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <span class="task-text">${escapeHTML(todo.text)}</span>
                        ${dateDisplay}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="edit-btn" title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Sil"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;

            // Setup event listeners for the generated elements
            const checkbox = li.querySelector('.checkbox');
            checkbox.addEventListener('change', () => toggleTodo(todo.id));

            const editBtn = li.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editTodo(todo.id, li));

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            todoList.appendChild(li);
        });
    }

    // Run Initialization
    init();
});