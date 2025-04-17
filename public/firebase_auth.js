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

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB2_6cfrGeg210I-D80l9snYQ7JV_2bgEk",
  authDomain: "anicode-studio.firebaseapp.com",
  projectId: "anicode-studio",
  storageBucket: "anicode-studio.firebasestorage.app",
  messagingSenderId: "268024222588",
  appId: "1:268024222588:web:8b68c1394d750e7f1a4af9",
  measurementId: "G-XHGKSBKDZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// DOM elements for auth
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

// Add bookmark
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
  
  // Get bookmarks
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
  
  // Check if anime is bookmarked
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

// Email/Password Login
loginEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (error) {
      alert(error.message);
      console.error('Login error:', error);
    }
  });
  
  // Email/Password Signup
  signupEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (error) {
      alert(error.message);
      console.error('Signup error:', error);
    }
  });
  
  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
  
  // Auth state observer
  onAuthStateChanged(auth, (user) => {
    const signLogInDiv = document.querySelector('.sign_log_in');
    
    if (user) {
      // User signed in
      signLogInDiv.style.display = 'none';
      userDropdown.style.display = 'block';
      userEmailSpan.textContent = user.email;
    } else {
      // User signed out
      signLogInDiv.style.display = 'flex';
      userDropdown.style.display = 'none';
    }
  });

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
