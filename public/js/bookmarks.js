import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2_6cfrGeg210I-D80l9snYQ7JV_2bgEk",
  authDomain: "anicode-studio.firebaseapp.com",
  projectId: "anicode-studio",
  storageBucket: "anicode-studio.appspot.com",
  messagingSenderId: "268024222588",
  appId: "1:268024222588:web:8b68c1394d750e7f1a4af9",
  measurementId: "G-XHGKSBKDZ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userDropdown = document.getElementById('user-dropdown');
const userProfileBtn = document.getElementById('user-profile-btn');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const bookmarksContainer = document.getElementById('bookmarks-page-container');

function handleBookmarkRemove(e) {
  e.preventDefault();
  e.stopPropagation();

  const btn = e.currentTarget;
  const docId = btn.getAttribute('data-doc-id');
  const card = btn.closest('.card');

  if (card) {
    card.remove();
    if (bookmarksContainer.children.length === 0) {
      bookmarksContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white;">No bookmarks yet!</p>';
    }
  }

  deleteDoc(doc(db, "bookmarks", docId)).catch((error) => {
    console.error("Error removing bookmark:", error);
    alert("Failed to remove bookmark from database.");
  });
}

async function loadBookmarks(userId) {
  try {
    const q = query(collection(db, "bookmarks"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    bookmarksContainer.innerHTML = '';

    if (querySnapshot.empty) {
      bookmarksContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white;">No bookmarks yet!</p>';
      return;
    }

    querySnapshot.forEach(async (docSnap) => {
      const animeId = docSnap.data().anime.id;

      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`);
        const json = await res.json();
        const anime = json.data;

        const genres = anime.genres.map(g => g.name).join(", ");
        const aired = anime.aired.string || "N/A";

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <a href="anime-details.html?id=${anime.mal_id}" class="card-link">
            <img class="title_card" src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
            <div class="bookmark-btn bookmarked" data-doc-id="${docSnap.id}" data-anime-id="${anime.mal_id}">
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <path class="bookmark-path"
                  d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V21L12 17L6 21V4Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="white"
                />
              </svg>
            </div>
            <div class="details-overlay">
              <div class="anime-details">
                <div class="detail-row"><span class="detail-label">Type:</span> ${anime.type}</div>
                <div class="detail-row"><span class="detail-label">Episodes:</span> ${anime.episodes}</div>
                <div class="detail-row"><span class="detail-label">Score:</span> ${anime.score}</div>
                <div class="detail-row"><span class="detail-label">Rating:</span> ${anime.rating || 'N/A'}</div>
                <div class="detail-row"><span class="detail-label">Status:</span> ${anime.status}</div>
                <div class="detail-row"><span class="detail-label">Aired:</span> ${aired}</div>
                <div class="detail-row genres"><span class="detail-label">Genres:</span> ${genres}</div>
              </div>
            </div>
            <p class="anime_name">${anime.title}</p>
          </a>
        `;

        bookmarksContainer.appendChild(card);
        const bookmarkBtn = card.querySelector('.bookmark-btn');
        bookmarkBtn.addEventListener('click', handleBookmarkRemove);
      } catch (err) {
        console.error("Failed to fetch anime details from Jikan:", err);
      }
    });
  } catch (error) {
    console.error("Error loading bookmarks:", error);
    bookmarksContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error loading bookmarks. Please try again.</p>';
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    userDropdown.style.display = 'block';
    const username = user.email.split('@')[0];
    userEmailSpan.textContent = username;
    loadBookmarks(user.uid);
  } else {
    window.location.href = 'home.html';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
});

if (userProfileBtn) {
  userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdownContent = userDropdown.querySelector('.dropdown-content');
    dropdownContent.classList.toggle('show');
  });
}

window.addEventListener('click', () => {
  const dropdownContent = document.querySelector('.dropdown-content');
  if (dropdownContent) {
    dropdownContent.classList.remove('show');
  }
});