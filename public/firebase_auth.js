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
  deleteDoc,
  doc,
  setDoc
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
const signUpBtn = document.getElementById('sign_up');
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

// Modify forms to use username
document.addEventListener('DOMContentLoaded', () => {
  // Update login form labels
  const loginEmailLabel = loginEmailForm.querySelector('label[for="login-email"]');
  if (loginEmailLabel) loginEmailLabel.textContent = "Username";
  const loginEmailInput = loginEmailForm.querySelector('#login-email');
  if (loginEmailInput) loginEmailInput.placeholder = "Enter your username";
  
  // Update signup form labels
  const signupEmailLabel = signupEmailForm.querySelector('label[for="signup-email"]');
  if (signupEmailLabel) signupEmailLabel.textContent = "Username";
  const signupEmailInput = signupEmailForm.querySelector('#signup-email');
  if (signupEmailInput) signupEmailInput.placeholder = "Choose a username";
});

// Show auth modal
function showAuthModal(formType = 'login') {
  if (!authModal) return;
  authModal.style.display = 'block';
  if (formType === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
  }
}

// Close auth modal
function closeAuthModal() {
  if (authModal) authModal.style.display = 'none';
}

// Event listeners
if (signUpBtn) signUpBtn.addEventListener('click', () => showAuthModal('signup'));
if (loginBtn) loginBtn.addEventListener('click', () => showAuthModal('login'));
if (closeModal) closeModal.addEventListener('click', closeAuthModal);
if (switchToSignup) switchToSignup.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthModal('signup');
});
if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthModal('login');
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

// Helper function to check if username exists
async function usernameExists(username) {
  const q = query(collection(db, "usernames"), where("username", "==", username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Signup function with username
if (signupEmailForm) {
  signupEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = signupEmailForm.querySelector('#signup-email').value;
    const password = signupEmailForm.querySelector('#signup-password').value;
    const confirmPassword = signupEmailForm.querySelector('#signup-password-confirm').value;

    if (!username || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (username.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    if (await usernameExists(username)) {
      alert("Username already taken");
      return;
    }

    try {
      // Create auth with email (using username + @anicode.com as email)
      const email = `${username}@anicode.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Store username in Firestore
      await setDoc(doc(db, "usernames", userCredential.user.uid), {
        username: username,
        createdAt: new Date()
      });

      // Store user profile in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: username,
        createdAt: new Date()
      });

      closeAuthModal();
      alert("Signup successful! You are now logged in.");
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = "Signup failed.";
      if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      alert(errorMessage);
    }
  });
}

// Login function with username
if (loginEmailForm) {
  loginEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginEmailForm.querySelector('#login-email').value;
    const password = loginEmailForm.querySelector('#login-password').value;

    if (!username || !password) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Convert username to email (username@anicode.com)
      const email = `${username}@anicode.com`;
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = "Login failed. Invalid username or password";
      alert(errorMessage);
    }
  });
}

// Get username from Firestore
async function getUsername(userId) {
  try {
      const userDoc = await getDoc(doc(db, "usernames", userId));
      if (userDoc.exists()) {
          return userDoc.data().username;
      }
      return null;
  } catch (error) {
      console.error("Error getting username:", error);
      return null;
  }
}

// Dropdown functionality
function initDropdown() {
  const profileBtn = document.getElementById('user-profile-btn');
  const dropdownContent = document.querySelector('.dropdown-content');
  
  if (profileBtn && dropdownContent) {
      // Remove any existing listeners to avoid duplicates
      profileBtn.replaceWith(profileBtn.cloneNode(true));
      const newProfileBtn = document.getElementById('user-profile-btn');
      
      newProfileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdownContent.classList.toggle('show');
      });
      
      // Close when clicking outside
      document.addEventListener('click', (e) => {
          if (!e.target.closest('.dropdown')) {
              dropdownContent.classList.remove('show');
          }
      });
  }
}

onAuthStateChanged(auth, async (user) => {
  const signLogInDiv = document.querySelector('.sign_log_in');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (user) {
      if (signLogInDiv) signLogInDiv.style.display = 'none';
      if (userDropdown) {
          userDropdown.style.display = 'block';
          const userUsernameSpan = document.getElementById('user-email');
          if (userUsernameSpan) {
              // Get just the username part (before @)
              const username = user.email.split('@')[0];
              userUsernameSpan.textContent = username;
          }
          initDropdown();
      }
  } else {
      if (signLogInDiv) signLogInDiv.style.display = 'flex';
      if (userDropdown) userDropdown.style.display = 'none';
  }
});

// Logout function
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      alert("Logout failed. Please try again.");
    }
  });
}

// Bookmark functions
async function addBookmark(userId, animeData) {
  try {
    console.log("Attempting to bookmark:", animeData.id);
    
    // Initialize Firestore
    const db = getFirestore();
    if (!db) throw new Error("Firestore not initialized");
    
    // Create query
    const bookmarksRef = collection(db, "bookmarks");
    const q = query(
      bookmarksRef,
      where("userId", "==", userId),
      where("anime.id", "==", animeData.id)
    );
    
    // Execute query
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Remove existing bookmarks
      console.log("Removing existing bookmark");
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      return false;
    } else {
      // Add new bookmark
      console.log("Adding new bookmark");
      await addDoc(bookmarksRef, {
        userId: userId,
        anime: animeData,
        createdAt: new Date()
      });
      return true;
    }
  } catch (error) {
    console.error("Bookmark error details:", {
      error,
      userId,
      animeData,
      stack: error.stack
    });
    throw new Error(`Failed to update bookmark: ${error.message}`);
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

document.addEventListener('DOMContentLoaded', initDropdown);
export { auth, db, addBookmark, getBookmarks, checkBookmark, showAuthModal, getUsername };