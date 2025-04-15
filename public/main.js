const galleryContainer = document.getElementById('gallery-container');
 const prevBtn = document.getElementById('prev');
 const nextBtn = document.getElementById('next');
 const searchInput = document.querySelector('.search input[type="text"]');
 const searchButton = document.querySelector('.icon-search-btn');
 const moodFilter = document.getElementById('mood-filter');
 const tagFilter = document.getElementById('tag-filter');
 const searchTypeFilter = document.getElementById('search-type'); //Get the new search type dropdown

 let currentPage = 1;
 let currentQuery = '';
 let currentMood = '';
 let currentTagId = '';
 let allGenres = []; //To store all fetched genres

 const moodMappings = {
  sad: ["Drama", "Psychological"],
  happy: ["Comedy", "Slice of Life", "School"],
  angst: ["Drama", "Psychological", "Mystery"],
  tragedy: ["Tragedy", "Drama"],
  romantic: ["Romance"],
  "love-at-first-sight": ["Romance", "Comedy", "Shoujo"],
  "enemies-to-lovers": ["Romance", "Comedy", "Drama", "Action"],
  "family-friendly": ["Kids", "Slice of Life", "Comedy", "Adventure"],
 };

 async function fetchGenres() {
  try {
   const response = await fetch('https://api.jikan.moe/v4/genres/anime');
   const data = await response.json();
   allGenres = data.data;
   populateTagFilter(allGenres);
  } catch (error) {
   console.error('Error fetching genres:', error);
  }
 }

 function populateTagFilter(genres) {
  genres.forEach(genre => {
   const option = document.createElement('option');
   option.value = genre.mal_id;
   option.textContent = genre.name;
   tagFilter.appendChild(option);
  });
 }

 async function fetchAnime(page = 1, query = '', mood = '', tagId = '') {
  try {
   galleryContainer.innerHTML = "<p>Loading anime</p>";
   let apiUrl = `https://api.jikan.moe/v4/anime?page=${page}`;
   const queryParams = [];

   if (query) {
    queryParams.push(`q=${query}`);
    currentQuery = query;
   } else {
    currentQuery = '';
   }

   if (mood && moodMappings[mood]) {
    const genreNames = moodMappings[mood];
    const genreIds = allGenres
     .filter(genre => genreNames.includes(genre.name))
     .map(genre => genre.mal_id);
    if (genreIds.length > 0) {
     queryParams.push(`genres=${genreIds.join(',')}`);
     currentMood = mood;
    }
    
    else {
     currentMood = '';
    }
   }
   
   else {
    currentMood = '';
   }

   if (tagId) {
    queryParams.push(`genres=${tagId}`);
    currentTagId = tagId;
   }
   
   else {
    currentTagId = '';
   }

   if (queryParams.length > 0) {
    apiUrl += `&${queryParams.join('&')}`;
   }
   
   else if (!query && !mood && !tagId) {
    apiUrl = `https://api.jikan.moe/v4/top/anime?page=${page}`;
   }

   const response = await fetch(apiUrl);
   const data = await response.json();

   console.log("Fetched data:", data); // For Debugging (this was painful to do)

   galleryContainer.innerHTML = "";

   (data.data || []).forEach(anime => {
    const card = document.createElement('div');
    card.classList.add('card');

    const link = document.createElement('a');
    link.href = anime.url;
    link.target = "_blank";
    link.classList.add('card-link');

    const image = document.createElement('img');
    image.src = anime.images.jpg.image_url;
    image.alt = anime.title;
    image.classList.add('title_card');

    const title = document.createElement('div');
    title.classList.add('details');
    title.textContent = anime.title;

    link.appendChild(image);
    link.appendChild(title);
    card.appendChild(link);

    galleryContainer.appendChild(card);
   });

   if (!data.data || data.data.length === 0) {
    galleryContainer.innerHTML = "<p>No anime found on this page with the current filters.</p>";
   }

  } catch (error) {
   console.error('Error loading anime:', error);
   galleryContainer.innerHTML = "<p>Failed to load anime. Try again later.</p>";
  }
 }

 //Initial load and fetch genres
 document.addEventListener("DOMContentLoaded", () => {
  fetchAnime(currentPage);
  fetchGenres();
  updateFilterVisibility(searchTypeFilter.value); // Set initial visibility based on default selection
 });

 // Next and Previous for pages
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

 //Search functionality
 searchButton.addEventListener('click', () => {
  if (searchTypeFilter.value === 'keyword') {
   const query = searchInput.value.trim();
   currentPage = 1;
   currentMood = ''; //reset mood filter on new keyword search
   currentTagId = ''; //reset tag filter on new keyword search
   moodFilter.value = '';
   tagFilter.value = '';
   fetchAnime(currentPage, query);
  }
 });

 searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter' && searchTypeFilter.value === 'keyword') {
   searchButton.click();
  }
 });

 //Mood Filter
 moodFilter.addEventListener('change', () => {
  if (searchTypeFilter.value === 'mood') {
   const selectedMood = moodFilter.value;
   currentPage = 1;
   currentQuery = ''; //reset keyword search on new mood selection
   currentTagId = ''; //reset tag filter on new mood selection
   searchInput.value = '';
   tagFilter.value = '';
   fetchAnime(currentPage, '', selectedMood);
  }
 });

 //Tag Filter
 tagFilter.addEventListener('change', () => {
  if (searchTypeFilter.value === 'tag') {
   const selectedTagId = tagFilter.value;
   currentPage = 1;
   currentQuery = ''; //reset keyword search on new tag selection
   currentMood = ''; //reset mood filter on new tag selection
   searchInput.value = '';
   moodFilter.value = '';
   fetchAnime(currentPage, '', '', selectedTagId);
  }
 });

 //Function to update visibility of filter options
 function updateFilterVisibility(searchType) {
  const isKeyword = searchType === 'keyword';
  const isMood = searchType === 'mood';
  const isTag = searchType === 'tag';

  searchInput.style.display = isKeyword ? 'inline-block' : 'none';
  searchButton.style.display = isKeyword ? 'inline-flex' : 'none';
  moodFilter.style.display = isMood ? 'inline-block' : 'none';
  tagFilter.style.display = isTag ? 'inline-block' : 'none';

  //Optionally clear other filters when a new search type is selected
  if (searchType !== 'keyword') searchInput.value = '';
  if (searchType !== 'mood') moodFilter.value = '';
  if (searchType !== 'tag') tagFilter.value = '';

  //Little bit of ternary here
  currentQuery = isKeyword ? currentQuery : '';
  currentMood = isMood ? currentMood : '';
  currentTagId = isTag ? currentTagId : '';
 }

 //Event listener for search type change
 searchTypeFilter.addEventListener('change', () => {
  const selectedType = searchTypeFilter.value;
  updateFilterVisibility(selectedType);
 });

// Search function to be added also bookmarks and other stuff we find necessary (or cool idk)


