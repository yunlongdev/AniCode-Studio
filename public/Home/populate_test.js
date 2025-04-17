// Get main container and navigation elements
const gridContainer = document.querySelector('.grid_container');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const searchInput = document.getElementById('search_box');
const searchButton = document.getElementById('icon-search-btn');
const randomBtn = document.getElementById('random');

// State variables
let currentPage = 1;
let currentQuery = '';
let currentMood = '';
let currentTagId = '';
let allGenres = []; // To store all fetched genres
const ITEMS_PER_PAGE = 24; // Set limit to 24 images per page

// Mood mappings to genre categories
const moodMappings = {
  "Happy": ["Comedy", "Slice of Life", "School"],
  "Love": ["Romance"],
  "Sad": ["Drama", "Psychological"],
  "Angry": ["Action", "Martial Arts", "Sports"],
  "Anxious": ["Mystery", "Thriller", "Psychological"],
  "Fear": ["Horror", "Suspense"],
  "Critical": ["Psychological", "Mystery", "Seinen"],
  "Bored": ["Drama", "Slice of Life"]
};

// Fetch anime genres from API
async function fetchGenres() {
  try {
    const response = await fetch('https://api.jikan.moe/v4/genres/anime');
    const data = await response.json();
    allGenres = data.data;
  } catch (error) {
    console.error('Error fetching genres:', error);
  }
}

// Main function to fetch anime data
async function fetchAnime(page = 1, query = '', mood = '', tagId = '') {
  try {
    // Show loading indicator
    gridContainer.innerHTML = "<p>Loading anime...</p>";
    
    // Build API URL with limit parameter
    let apiUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=${ITEMS_PER_PAGE}`;
    const queryParams = [];

    // Add search query if provided
    if (query) {
      queryParams.push(`q=${query}`);
      currentQuery = query;
    } else {
      currentQuery = '';
    }

    // Add mood filter if provided and mapped to genres
    if (mood && moodMappings[mood]) {
      const genreNames = moodMappings[mood];
      const genreIds = allGenres
        .filter(genre => genreNames.includes(genre.name))
        .map(genre => genre.mal_id);
      
      if (genreIds.length > 0) {
        queryParams.push(`genres=${genreIds.join(',')}`);
        currentMood = mood;
      } else {
        currentMood = '';
      }
    } else {
      currentMood = '';
    }

    // Add tag filter if provided
    if (tagId) {
      queryParams.push(`genres=${tagId}`);
      currentTagId = tagId;
    } else {
      currentTagId = '';
    }

    // Append query parameters to URL
    if (queryParams.length > 0) {
      apiUrl += `&${queryParams.join('&')}`;
    } else if (!query && !mood && !tagId) {
      // Default to top anime if no filters are specified
      apiUrl = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${ITEMS_PER_PAGE}`;
    }

    // Fetch data from API with rate limiting protection
    let response;
    try {
      response = await fetch(apiUrl);
      
      // Check if we hit rate limit
      if (response.status === 429) {
        gridContainer.innerHTML = "<p>Hit API rate limit. Please wait a few seconds and try again...</p>";
        return;
      }
      
      const data = await response.json();
      
      // For debugging
      console.log("Fetched data:", data);

      // Clear container before adding new content
      gridContainer.innerHTML = "";

      // Create anime cards and add to grid
      (data.data || []).forEach(anime => {
        const card = document.createElement('div');
        card.classList.add('card');

        const link = document.createElement('a');
        link.href = anime.url;
        link.target = "_blank";

        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        image.classList.add('title_card');

        // Add favorite button
        const favoriteDiv = document.createElement('div');
        favoriteDiv.classList.add('favourite');
        const favoriteBtn = document.createElement('button');
        favoriteBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-star">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        `;
        favoriteDiv.appendChild(favoriteBtn);

        // Add title
        const title = document.createElement('p');
        title.classList.add('anime_name');
        title.textContent = anime.title;

        // Build the card
        link.appendChild(image);
        link.appendChild(favoriteDiv);
        link.appendChild(title);
        card.appendChild(link);

        gridContainer.appendChild(card);
      });

      // Show message if no results found
      if (!data.data || data.data.length === 0) {
        gridContainer.innerHTML = "<p>No anime found on this page with the current filters.</p>";
      }
      
      // Disable previous button on first page
      prevBtn.disabled = currentPage <= 1;
      
    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error loading anime:', error);
    gridContainer.innerHTML = "<p>Failed to load anime. Try again later.</p>";
  }
}

// Handle rate limiting with retry mechanism
async function fetchWithRetry(url, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = response.headers.get('Retry-After') || 5;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        return response;
      }
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      // Wait before retry on network error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Initialize page on load
document.addEventListener("DOMContentLoaded", () => {
  fetchAnime(currentPage);
  fetchGenres();
});

// Pagination event listeners
nextBtn.addEventListener('click', () => {
  currentPage++;
  fetchAnime(currentPage, currentQuery, currentMood, currentTagId);
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchAnime(currentPage, currentQuery, currentMood, currentTagId);
  }
});

// Search functionality
searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    currentPage = 1;
    currentMood = ''; // Reset mood filter on new search
    currentTagId = ''; // Reset tag filter on new search
    fetchAnime(currentPage, query);
  }
});

// Enter key trigger search
searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    searchButton.click();
  }
});

// Random button functionality
randomBtn.addEventListener('click', () => {
  // Get a random page between 1-50
  const randomPage = Math.floor(Math.random() * 50) + 1;
  currentPage = randomPage;
  fetchAnime(currentPage, currentQuery, currentMood, currentTagId);
});

// Mood filter functionality
// Add click events to mood filter links
document.querySelectorAll('.filter a').forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const selectedMood = link.textContent;
    currentPage = 1;
    currentQuery = ''; // Reset search on mood selection
    currentTagId = ''; // Reset tag filter on mood selection
    searchInput.value = '';
    
    // Visually highlight the selected mood
    document.querySelectorAll('.filter a').forEach(a => {
      a.style.backgroundColor = '';
    });
    link.style.backgroundColor = '#5d6164';
    
    fetchAnime(currentPage, '', selectedMood);
  });
});

// Local storage for favorites
const FAVORITES_KEY = 'anime_favorites';

// Load favorites from localStorage
function loadFavorites() {
  const storedFavorites = localStorage.getItem(FAVORITES_KEY);
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

// Save favorites to localStorage
function saveFavorite(animeId, animeTitle, imageUrl) {
  const favorites = loadFavorites();
  
  // Check if already in favorites
  const existingIndex = favorites.findIndex(item => item.id === animeId);
  
  if (existingIndex >= 0) {
    // Remove if already favorited (toggle behavior)
    favorites.splice(existingIndex, 1);
  } else {
    // Add to favorites
    favorites.push({
      id: animeId,
      title: animeTitle,
      image: imageUrl,
      addedAt: new Date().toISOString()
    });
  }
  
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return existingIndex >= 0 ? false : true; // Return whether it was added or removed
}

// Add event listeners for favorite buttons (to be implemented after cards are created)
document.addEventListener('click', (event) => {
  // Event delegation for favorite buttons
  if (event.target.closest('.favourite button')) {
    const favoriteBtn = event.target.closest('.favourite');
    favoriteBtn.classList.toggle('active');
    
    // Get anime info from parent elements
    const card = favoriteBtn.closest('.card');
    const link = card.querySelector('a');
    const img = card.querySelector('img');
    const title = card.querySelector('.anime_name');
    
    // Extract ID from MAL URL
    const animeId = link.href.split('/').pop();
    
    // Save to favorites
    const isAdded = saveFavorite(animeId, title.textContent, img.src);
    
    // Provide visual feedback
    if (isAdded) {
      favoriteBtn.classList.add('active');
    } else {
      favoriteBtn.classList.remove('active');
    }
  }
});