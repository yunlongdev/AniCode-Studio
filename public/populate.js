// main.js
import { 
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Init] DOM loaded, starting app...");

  // Elements
  const gridContainer = document.querySelector('.grid_container');
  const searchInput = document.getElementById('search_box');
  const searchButton = document.getElementById('icon-search-btn');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const randomBtn = document.getElementById('random');
  const moodFilters = document.querySelectorAll('.filter a');

  // State
  let currentPage = 1;
  let currentQuery = '';
  let currentMood = '';
  const ITEMS_PER_PAGE = 15;

  // Debugging
  function debug(message, data = null) {
    console.log(`[Debug] ${message}`, data || '');
  }

  // 1. API Service
  const animeAPI = {
    async fetchAnime(page = 1, query = '', mood = '') {
      debug(`Fetching page ${page} | Query: "${query}" | Mood: "${mood}"`);

      let apiUrl;
      if (query) {
        apiUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${ITEMS_PER_PAGE}`;
      } else if (mood) {
        const moodMap = {
          'Happy': 'genres=4,36',       // Comedy, Slice of Life
          'Love': 'genres=22',          // Romance
          'Sad': 'genres=8,37',         // Drama, Seinen
          'Angry': 'genres=1,2',        // Action, Adventure
          'Anxious': 'genres=7,41',     // Mystery, Suspense
          'Fear': 'genres=14',          // Horror
          'Critical': 'genres=9',       // Psychological
          'Bored': 'genres=36'          // Slice of Life
        };
        apiUrl = `https://api.jikan.moe/v4/anime?${moodMap[mood]}&page=${page}&limit=${ITEMS_PER_PAGE}`;
      } else {
        apiUrl = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${ITEMS_PER_PAGE}`;
      }

      try {
        const response = await this._fetchWithRetry(apiUrl);
        const data = await response.json();

        if (!data.data || data.data.length === 0) {
          throw new Error('No anime found with these filters');
        }

        return data.data;
      } catch (error) {
        debug('API Error:', error.message);
        throw error;
      }
    },

    async _fetchWithRetry(url, retries = 3) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After')) || 2;
          debug(`Rate limited. Retrying in ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this._fetchWithRetry(url, retries - 1);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this._fetchWithRetry(url, retries - 1);
      }
    }
  };

  // UI Rendering
  const ui = {
    showLoading() {
      gridContainer.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading anime...</p>
        </div>
      `;
    },

    showError(message) {
      gridContainer.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
          <button id="retry-button">Try Again</button>
        </div>
      `;

      document.getElementById('retry-button').addEventListener('click', () => {
        loadAnime(currentPage, currentQuery, currentMood);
      });
    },

    renderAnime(animeList) {
      if (!animeList || animeList.length === 0) {
        this.showError('No anime found with these filters');
        return;
      }

      gridContainer.innerHTML = '';

      animeList.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'card';

        const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || 'https://via.placeholder.com/300x400';

        const details = {
          title: anime.title || 'Untitled',
          type: anime.type || 'Unknown',
          episodes: anime.episodes || '?',
          score: anime.score ? `${anime.score.toFixed(1)} ★` : 'N/A',
          rating: anime.rating?.split(' - ')[0] || 'Unknown',
          status: anime.status || 'Unknown',
          aired: anime.aired?.string || 'Unknown date',
          genres: anime.genres?.map(g => g.name).join(', ') || 'Unknown genre'
        };

        card.innerHTML = `
          <a href="${anime.url || '#'}" target="_blank" class="card-link">
            <img class="title_card" src="${imageUrl}" alt="${details.title}" loading="lazy">
            <div class="bookmark-btn">
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <path class="bookmark-path" d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V21L12 17L6 21V4Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="details-overlay">
              <div class="anime-details">
                <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${details.type}</span></div>
                <div class="detail-row"><span class="detail-label">Episodes:</span><span class="detail-value">${details.episodes}</span></div>
                <div class="detail-row"><span class="detail-label">Score:</span><span class="detail-value">${details.score}</span></div>
                <div class="detail-row"><span class="detail-label">Rating:</span><span class="detail-value">${details.rating}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${details.status}</span></div>
                <div class="detail-row"><span class="detail-label">Aired:</span><span class="detail-value">${details.aired}</span></div>
                <div class="detail-row genres"><span class="detail-label">Genres:</span><span class="detail-value">${details.genres}</span></div>
              </div>
            </div>
            <p class="anime_name">${details.title}</p>
          </a>
        `;

        const bookmarkBtn = card.querySelector('.bookmark-btn');

        // Check if anime is already bookmarked
        onAuthStateChanged(auth, async (user) => {
          if (user) {
              const isBookmarked = await checkBookmark(user.uid, anime.mal_id);
              if (isBookmarked) {
                  bookmarkBtn.classList.add('bookmarked');
              }
          }
        });
        
        bookmarkBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const user = auth.currentUser;
          if (!user) {
            showAuthModal('login');
            return;
          }
        
          const animeData = {
            id: anime.mal_id,
            title: anime.title,
            image: imageUrl,
            url: anime.url,
            score: anime.score
          };
        
          try {
            // Check if already bookmarked
            const q = query(
              collection(db, "bookmarks"),
              where("userId", "==", user.uid),
              where("anime.id", "==", anime.mal_id)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Remove bookmark
              querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
              });
              bookmarkBtn.classList.remove('bookmarked');
              debug('Bookmark removed successfully');
            } else {
              // Add bookmark
              await addDoc(collection(db, "bookmarks"), {
                userId: user.uid,
                anime: animeData,
                createdAt: new Date()
              });
              bookmarkBtn.classList.add('bookmarked');
              debug('Bookmark added successfully');
            }
          } catch (error) {
            debug('Error with bookmark:', error);
            alert('Bookmark operation failed: ' + error.message);
          }
        });
        
        gridContainer.appendChild(card);
      });

      debug(`Rendered ${animeList.length} anime cards`);
    }
  };

  // Main Controller
  async function loadAnime(page = 1, query = '', mood = '') {
    try {
      ui.showLoading();

      const animeList = await animeAPI.fetchAnime(page, query, mood);
      ui.renderAnime(animeList);

      prevBtn.disabled = page <= 1;
      nextBtn.disabled = animeList.length < ITEMS_PER_PAGE;

      currentPage = page;
      currentQuery = query;
      currentMood = mood;

    } catch (error) {
      ui.showError(error.message);
      console.error('Anime loading error:', error);
    }
  }

  // Event Listeners
  document.getElementById('reset-filter').addEventListener('click', (e) => {
    e.preventDefault();
    currentMood = '';
    currentQuery = '';
    searchInput.value = '';
    loadAnime(1, '', '');
    
    // Remove active class from all mood buttons
    moodFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const mood = e.target.textContent.trim();
        
        // Remove active class from all buttons
        moodFilters.forEach(f => f.classList.remove('active'));
        
        // Add active class to clicked button
        e.target.classList.add('active');
        
        loadAnime(1, '', mood);
      });
    });
  });
  
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query !== currentQuery) {
      loadAnime(1, query, '');
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchButton.click();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadAnime(currentPage - 1, currentQuery, currentMood);
    }
  });

  nextBtn.addEventListener('click', () => {
    loadAnime(currentPage + 1, currentQuery, currentMood);
  });

  randomBtn.addEventListener('click', () => {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    loadAnime(randomPage, '', '');
  });

  moodFilters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      e.preventDefault();
      const mood = e.target.textContent.trim();
      loadAnime(1, '', mood);
    });
  });

  // Initial load
  loadAnime();
});
