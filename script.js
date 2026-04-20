// 🔥 YOUR FIREBASE CONFIG - Get from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCK0YZYfCpcZX9pyHaK1IO9my_SzLA6Gjo",
    authDomain: "studybuddy-8f753.firebaseapp.com",
    projectId: "studybuddy-8f753",
    storageBucket: "studybuddy-8f753.firebasestorage.app",
    messagingSenderId: "280105465069",
    appId: "1:280105465069:web:e63982536ee1e36fad88e4",
    measurementId: "G-GWKWRG6EEZ"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let tasks = [];

// Monitor auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        loadUserTasks();
    } else {
        showAuthSection();
    }
});

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tasksList = document.getElementById('tasksList');

// Show sections
function showAuthSection() {
    loadingSpinner.style.display = 'none';
    authSection.style.display = 'block';
    dashboard.style.display = 'none';
    showLogin();
}

function showDashboard() {
    loadingSpinner.style.display = 'none';
    authSection.style.display = 'none';
    dashboard.style.display = 'block';
    document.getElementById('userName').textContent = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('userEmail').textContent = currentUser.email;
}

// Auth Forms
function showLogin() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
}

function showRegister() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
}

// Event Listeners
document.getElementById('loginFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    signInWithEmail(email, password);
});

document.getElementById('registerFormElement').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    createUserWithEmail(email, password);
});

document.getElementById('googleLoginBtn').addEventListener('click', signInWithGoogle);
document.getElementById('logoutBtn').addEventListener('click', signOut);

// Firebase Auth Functions
async function signInWithEmail(email, password) {
    showLoading();
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
    hideLoading();
}

async function createUserWithEmail(email, password) {
    showLoading();
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        alert('Account created! You are now logged in.');
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
    hideLoading();
}

async function signInWithGoogle() {
    showLoading();
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        alert('Google login failed: ' + error.message);
    }
    hideLoading();
}

function signOut() {
    auth.signOut();
}

// Tasks CRUD
async function addTask() {
    const title = document.getElementById('taskTitle').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;

    if (!title || !dueDate || !priority) {
        alert('Please fill all fields!');
        return;
    }

    const task = {
        title,
        dueDate,
        priority,
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    showLoading();
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('tasks').add(task);
        clearTaskForm();
        loadUserTasks();
    } catch (error) {
        alert('Failed to add task: ' + error.message);
    }
    hideLoading();
}

async function toggleComplete(taskId) {
    const taskRef = db.collection('users').doc(currentUser.uid)
        .collection('tasks').doc(taskId);
    
    showLoading();
    try {
        const taskSnap = await taskRef.get();
        if (taskSnap.exists) {
            await taskRef.update({
                completed: !taskSnap.data().completed
            });
            loadUserTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
    hideLoading();
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    
    showLoading();
    try {
        await db.collection('users').doc(currentUser.uid)
            .collection('tasks').doc(taskId).delete();
        loadUserTasks();
    } catch (error) {
        alert('Failed to delete task: ' + error.message);
    }
    hideLoading();
}

async function loadUserTasks() {
    showLoading();
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid)
            .collection('tasks').orderBy('createdAt', 'desc').get();
        
        tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        renderTasks();
        updateStats();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
    hideLoading();
}

function renderTasks() {
    const container = document.getElementById('tasksList');
    const pendingTasks = tasks.filter(t => !t.completed);
    
    if (pendingTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🎉 Great job! No pending tasks!</h3>
                <p>You're all caught up! Add a new task above.</p>
            </div>
        `;