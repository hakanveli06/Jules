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

    // App State
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let currentFilter = 'all';

    // Initialize App
    function init() {
        renderTodos();
        updateStats();
    }

    // Event Listeners
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
        localStorage.setItem('todos', JSON.stringify(todos));
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