import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2_6cfrGeg210I-D80l9snYQ7JV_2bgEk",
  authDomain: "anicode-studio.firebaseapp.com",
  projectId: "anicode-studio",
  storageBucket: "anicode-studio.firebasestorage.app",
  messagingSenderId: "268024222588",
  appId: "1:268024222588:web:8b68c1394d750e7f1a4af9",
  measurementId: "G-XHGKSBKDZ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const signInBtn = document.getElementById('sign_in');
const loginBtn = document.getElementById('login');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const loginEmailForm = document.getElementById('login-email-form');
const signupEmailForm = document.getElementById('signup-email-form');
const userDropdown = document.getElementById('user-dropdown');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Helper function to convert username to email
function usernameToEmail(username) {
  return `${username}@anicode.com`; // Using a fixed domain
}

// Show auth modal
function showAuthModal(formType = 'login') {
  authModal.style.display = 'block';
  if (formType === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }
}

// Close auth modal
function closeAuthModal() {
  authModal.style.display = 'none';
}

// Event listeners for modal
signInBtn.addEventListener('click', () => showAuthModal('signup'));
loginBtn.addEventListener('click', () => showAuthModal('login'));
closeModal.addEventListener('click', closeAuthModal);
switchToSignup.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthModal('signup');
});
switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthModal('login');
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

// Username validation
function isValidUsername(username) {
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
}

// Signup function
signupEmailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-password-confirm').value;

  // Validate username
  if (!isValidUsername(username)) {
    alert("Username must be 3-20 characters long and can only contain letters, numbers, and underscores");
    return;
  }

  // Check if username exists
  const usernameQuery = query(collection(db, "usernames"), where("username", "==", username));
  const usernameSnapshot = await getDocs(usernameQuery);
  if (!usernameSnapshot.empty) {
    alert("Username already exists");
    return;
  }

  // Check password match
  if (password !== confirmPassword) {
    alert("Passwords don't match!");
    return;
  }

  try {
    // Create user with generated email
    const email = usernameToEmail(username);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Store username in Firestore
    await addDoc(collection(db, "usernames"), {
      userId: userCredential.user.uid,
      username: username,
      createdAt: new Date()
    });
    
    closeAuthModal();
  } catch (error) {
    console.error('Signup error:', error);
    alert("Signup failed: " + error.message);
  }
});

// Login function
loginEmailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  try {
    // Convert username to email
    const email = usernameToEmail(username);
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
  } catch (error) {
    console.error('Login error:', error);
    alert("Invalid username or password");
  }
});

// Get username from Firestore
async function getUsername(userId) {
  try {
    const q = query(collection(db, "usernames"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().username;
    }
    return null;
  } catch (error) {
    console.error("Error getting username:", error);
    return null;
  }
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  const signLogInDiv = document.querySelector('.sign_log_in');
  
  if (user) {
    // User signed in
    signLogInDiv.style.display = 'none';
    userDropdown.style.display = 'block';
    
    // Get and display username
    const username = await getUsername(user.uid);
    if (username) {
      userEmailSpan.textContent = username;
    } else {
      // Fallback to email prefix if username not found
      userEmailSpan.textContent = user.email.split('@')[0];
    }
  } else {
    // User signed out
    signLogInDiv.style.display = 'flex';
    userDropdown.style.display = 'none';
  }
});

// Logout function
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// Dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.querySelector('.dropdown');
  const profileBtn = document.getElementById('user-profile-btn');
  
  if (dropdown && profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdownContent = dropdown.querySelector('.dropdown-content');
      dropdownContent.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        dropdownContent.classList.remove('show');
      }
    });
  }
});

// Bookmark functions
async function addBookmark(userId, animeData) {
  try {
    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", userId),
      where("anime.id", "==", animeData.id)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('This anime is already bookmarked');
    }
    
    await addDoc(collection(db, "bookmarks"), {
      userId: userId,
      anime: animeData,
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    throw error;
  }
}

async function getBookmarks(userId) {
  try {
    const q = query(collection(db, "bookmarks"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().anime);
  } catch (error) {
    console.error("Error getting bookmarks:", error);
    return [];
  }
}

async function checkBookmark(userId, animeId) {
  try {
    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", userId),
      where("anime.id", "==", animeId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return false;
  }
}

exports.cleanupDeletedUser = functions.auth.user().onDelete((user) => {
  const userId = user.uid;
  return admin.firestore().collection("usernames").where("userId", "==", userId)
    .get()
    .then(snapshot => {
      const batch = admin.firestore().batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      return batch.commit();
    });
});