import { 
    auth, 
    db, 
    addBookmark, 
    getBookmarks, 
    checkBookmark,
    showAuthModal
  } from './firebase_auth.js';
  import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
  import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc
  } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Init] DOM loaded, starting app...");

    const galleryContainer = document.getElementById('gallery-container');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const searchInput = document.getElementById('search_box');
    console.log('🔎 searchInput is', searchInput);
    const searchButton = document.querySelector('#icon-search-btn');
    const randomBtn = document.getElementById('random');

    let currentPage = 1;
    let currentQuery = '';
    let currentMood = '';
    let currentTagId = '';
    let allGenres = [];
    const ITEMS_PER_PAGE = 15;
    let isPredictiveTextVisible = false;
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'search-suggestions';
    suggestionsContainer.style.display = 'none';
    searchInput.parentNode.appendChild(suggestionsContainer);
    const trailerCache = new Map();

    const moodMappings = {
        sad: ["Drama", "Psychological"],
        happy: ["Comedy", "Slice of Life", "School"],
        angst: ["Drama", "Psychological", "Mystery"],
        tragedy: ["Tragedy", "Drama"],
        romantic: ["Romance"],
        "love-at-first-sight": ["Romance", "Comedy", "Shoujo"],
        "enemies-to-lovers": ["Romance", "Comedy", "Drama", "Action"],
        "family-friendly": ["Kids", "Slice of Life", "Comedy", "Adventure"],
        "bored": ["Drama", "Slice of Life"]
    };

    await fetchGenres();
    await fetchAnime(currentPage);

    if (prevBtn) prevBtn.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'block';
    if (randomBtn) randomBtn.style.display = 'block';

    async function fetchGenres() {
        try {
            const response = await fetch('https://api.jikan.moe/v4/genres/anime');
            const data = await response.json();
            allGenres = data.data;
        } catch (error) {
            console.error('Error fetching genres:', error);
        }
    }

    function showLoadingSpinner(container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading">Loading anime ...</p>
            </div>
        `;
    }
    
    async function fetchAnime(page = 1, query = '', mood = '', tagId = '') {
        try {
            if (galleryContainer) {
                showLoadingSpinner(galleryContainer);
            }
            let apiUrl;
            const queryParams = [];

            if (query) {
                queryParams.push(`q=${encodeURIComponent(query)}`);
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
                } else {
                    currentMood = '';
                }
            } else {
                currentMood = '';
            }

            if (tagId) {
                queryParams.push(`genres=${tagId}`);
                currentTagId = tagId;
            } else {
                currentTagId = '';
            }

            if (queryParams.length > 0) {
                apiUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=${ITEMS_PER_PAGE}&${queryParams.join('&')}`;
            } else if (!query && !mood && !tagId) {
                apiUrl = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${ITEMS_PER_PAGE}`;
            } else if (mood && !moodMappings[mood]) {
                apiUrl = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${ITEMS_PER_PAGE}`; // Fallback if mood is invalid
            }

            console.log("[API URL]", apiUrl);

            try {
                const response = await fetchWithRetry(apiUrl);
                const data = await response.json();

                if (!data.data || data.data.length === 0) {
                    if (galleryContainer) {
                        galleryContainer.innerHTML = "<p>No anime found with these filters.</p>";
                    }
                    return;
                }

                // For debugging
                console.log("Fetched data:", data);

                // Clear container before adding new content
                if (galleryContainer) {
                    galleryContainer.innerHTML = "";

                    // Create anime cards and add to grid
                    (data.data || []).forEach(anime => {
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
                            genres: anime.genres?.map(g => g.name).join(', ') || 'Unknown genre',
                            trailer: anime.trailer // Add trailer data
                        };

                        // In the card template
                        card.innerHTML = `
                        <a href="#" class="card-link" data-anime-id="${anime.mal_id}">
                          <img class="title_card" src="${imageUrl}" alt="${details.title}" loading="lazy">
                          <div class="bookmark-btn">
                            <svg class="icon" viewBox="0 0 24 24" fill="none">
                              <path class="bookmark-path" d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V21L12 17L6 21V4Z" stroke="#00BFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
                      
                      // Add click handler for the card to open details page
                      card.querySelector('.card-link').addEventListener('click', (e) => {
                        e.preventDefault();
                        const animeId = e.currentTarget.getAttribute('data-anime-id');
                        window.location.href = `anime-details.html?id=${animeId}`;
                      });

                        if (anime.trailer?.embed_url) {
                            const trailerPreview = card.querySelector('.trailer-preview');
                            if (trailerPreview) {
                              trailerPreview.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showTrailerModal(anime);
                              });
                            }
                          }
                        
                        function showTrailerModal(anime) {
                            const modal = document.createElement('div');
                            modal.className = 'trailer-modal';
                            
                            // Create a unique ID for this trailer
                            const trailerId = `trailer-${anime.mal_id}`;
                            
                            modal.innerHTML = `
                              <div class="trailer-modal-content">
                                <span class="close-trailer-modal">&times;</span>
                                <h3>${anime.title} Trailer</h3>
                                <div class="trailer-container">
                                  <iframe id="${trailerId}" class="trailer-iframe" 
                                    src="${anime.trailer.embed_url}?autoplay=1&mute=0&enablejsapi=1" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen></iframe>
                                </div>
                              </div>
                            `;
                            document.body.appendChild(modal);

                            
                            
                        // Cache the iframe
                        const iframe = document.getElementById(trailerId);
                        trailerCache.set(trailerId, iframe);
                        
                        const closeBtn = modal.querySelector('.close-trailer-modal');
                        closeBtn.addEventListener('click', () => {
                            // Pause the video before closing
                            if (iframe) {
                            iframe.src = '';
                            }
                            document.body.removeChild(modal);
                            trailerCache.delete(trailerId);
                        });
                        
                        modal.addEventListener('click', (e) => {
                            if (e.target === modal) {
                            // Pause the video before closing
                            if (iframe) {
                                iframe.src = '';
                            }
                            document.body.removeChild(modal);
                            trailerCache.delete(trailerId);
                            }
                        });
                        
                        // Close modal with Escape key
                        document.addEventListener('keydown', function handleKeyDown(e) {
                            if (e.key === 'Escape') {
                            if (iframe) {
                                iframe.src = '';
                            }
                            document.body.removeChild(modal);
                            trailerCache.delete(trailerId);
                            document.removeEventListener('keydown', handleKeyDown);
                            }
                        });
                        }

                        const bookmarkBtn = card.querySelector('.bookmark-btn');

                        // Check if anime is already bookmarked
                        onAuthStateChanged(auth, async (user) => {
                            if (user) {
                                const isBookmarked = await checkBookmark(user.uid, anime.mal_id);
                                const cacheKey = `${user.uid}_${anime.mal_id}`;
                                
                                if (isBookmarked) {
                                    bookmarkCache.set(cacheKey, true);
                                    bookmarkBtn.classList.add('bookmarked');
                                    const path = bookmarkBtn.querySelector('.bookmark-path');
                                    if (path) {
                                        path.setAttribute('stroke', 'white');
                                        path.setAttribute('fill', 'white');
                                    }
                                } else {
                                    bookmarkCache.delete(cacheKey);
                                }
                            } else {
                                bookmarkBtn.classList.remove('bookmarked');
                                const path = bookmarkBtn.querySelector('.bookmark-path');
                                if (path) {
                                    path.setAttribute('stroke', '#00BFFF');
                                    path.removeAttribute('fill');
                                }
                            }
                        });
                        

                        const bookmarkCache = new Map();

                        bookmarkBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          
                            const user = auth.currentUser;
                            if (!user) {
                                showAuthModal('login');
                                return;
                            }
                        
                            // Get current state from cache if available
                            const cacheKey = `${user.uid}_${anime.mal_id}`;
                            const wasBookmarked = bookmarkCache.get(cacheKey) || 
                                                 bookmarkBtn.classList.contains('bookmarked');
                        
                            // Optimistic UI update
                            bookmarkBtn.classList.toggle('bookmarked', !wasBookmarked);
                            const path = bookmarkBtn.querySelector('.bookmark-path');
                            if (path) {
                                path.setAttribute('stroke', !wasBookmarked ? 'white' : '#00BFFF');
                                path.setAttribute('fill', !wasBookmarked ? 'white' : 'none');
                            }
                        
                            try {
                                if (wasBookmarked) {
                                    // Remove bookmark using existing function
                                    await addBookmark(user.uid, {
                                        id: anime.mal_id,
                                        title: anime.title,
                                        image: imageUrl,
                                        url: anime.url,
                                        score: anime.score
                                    });
                                    bookmarkCache.delete(cacheKey);
                                } else {
                                    // Add bookmark using existing function
                                    await addBookmark(user.uid, {
                                        id: anime.mal_id,
                                        title: anime.title,
                                        image: imageUrl,
                                        url: anime.url,
                                        score: anime.score
                                    });
                                    bookmarkCache.set(cacheKey, true);
                                }
                            } catch (error) {
                                // Revert UI on error
                                bookmarkBtn.classList.toggle('bookmarked');
                                if (path) {
                                    path.setAttribute('stroke', wasBookmarked ? 'white' : '#00BFFF');
                                    path.setAttribute('fill', wasBookmarked ? 'white' : 'none');
                                }
                                console.error('Bookmark error:', error);
                            }
                        });
                          

                        galleryContainer.appendChild(card);
                    });

                    // Enable/disable pagination buttons
                    if (prevBtn) prevBtn.disabled = page <= 1;

                    if (nextBtn) {
                    const hasNext = data.pagination?.has_next_page ?? true;
                    nextBtn.disabled = !hasNext;
                    }

                }

            } catch (error) {
                console.error('API Error:', error.message);
                if (galleryContainer) {
                    galleryContainer.innerHTML = "<p>Failed to load anime. Try again later.</p>";
                }
            }
        } catch (error) {
            console.error('Error loading anime:', error);
            if (galleryContainer) {
                galleryContainer.innerHTML = "<p>Failed to load anime. Try again later.</p>";
            }
        } finally {
            if (typeof hideSuggestions === 'function') {
                hideSuggestions();
            }

            const spinner = galleryContainer?.querySelector('.loading-spinner');
            if (spinner && galleryContainer.innerHTML.includes('loading-spinner')) {
                galleryContainer.innerHTML = "";
            }
        }
    }
    
    // async function loadTrendingAnime() {
    //     try {
    //         const response = await fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=10');
    //         const data = await response.json();
    //         displayTrendingAnime(data.data || []);
    //     } catch (error) {
    //         console.error('Error loading trending anime:', error);
    //         displayTrendingAnime([]); // Fallback to empty array
    //     }
    // }
    
    // function displayTrendingAnime(animeList) {
    //     const carouselTrack = document.getElementById('carousel-track');
    //     if (!carouselTrack) return;
        
    //     carouselTrack.innerHTML = '';
        
    //     if (animeList.length === 0) {
    //         carouselTrack.innerHTML = '<p class="error-message">Failed to load trending anime. Try again later.</p>';
    //         return;
    //     }
        
    //     animeList.forEach(anime => {
    //         const card = document.createElement('div');
    //         card.className = 'trending-card';
            
    //         const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || 'https://via.placeholder.com/300x400';
            
    //         card.innerHTML = `
    //             <img src="${imageUrl}" alt="${anime.title}" loading="lazy">
    //             <div class="trending-title">${anime.title}</div>
    //         `;
            
    //         card.addEventListener('click', () => {
    //             window.open(anime.url, '_blank');
    //         });
            
    //         carouselTrack.appendChild(card);
    //     });
    
    //     // Initialize carousel controls
    //     const prevBtn = document.querySelector('.prev-btn');
    //     const nextBtn = document.querySelector('.next-btn');
    //     const carousel = document.querySelector('.carousel');
        
    //     if (prevBtn && nextBtn && carousel) {
    //         const scrollAmount = 220;
            
    //         prevBtn.addEventListener('click', () => {
    //             carouselTrack.scrollBy({
    //                 left: -scrollAmount,
    //                 behavior: 'smooth'
    //             });
    //         });
            
    //         nextBtn.addEventListener('click', () => {
    //             carouselTrack.scrollBy({
    //                 left: scrollAmount,
    //                 behavior: 'smooth'
    //             });
    //         });
            
    //         // Auto-scroll functionality
    //         let scrollInterval;
    //         let isHovering = false;
            
    //         function startAutoScroll() {
    //             if (isHovering) return;
                
    //             scrollInterval = setInterval(() => {
    //                 const maxScroll = carouselTrack.scrollWidth - carouselTrack.clientWidth;
                    
    //                 if (carouselTrack.scrollLeft >= maxScroll - 1) {
    //                     carouselTrack.scrollTo({
    //                         left: 0,
    //                         behavior: 'smooth'
    //                     });
    //                 } else {
    //                     carouselTrack.scrollBy({
    //                         left: scrollAmount,
    //                         behavior: 'smooth'
    //                     });
    //                 }
    //             }, 3000);
    //         }
            
    //         // Pause on hover
    //         carousel.addEventListener('mouseenter', () => {
    //             isHovering = true;
    //             clearInterval(scrollInterval);
    //         });
            
    //         carousel.addEventListener('mouseleave', () => {
    //             isHovering = false;
    //             startAutoScroll();
    //         });
            
    //         startAutoScroll();
    //     }
    // }

    // await loadTrendingAnime();

    const mascot = document.getElementById('mascot');

    if (mascot) {
      // On click: mascot becomes happy briefly
      mascot.addEventListener('click', () => {
        if (!mascot.classList.contains('happy')) {
          mascot.classList.add('happy');
          setTimeout(() => mascot.classList.remove('happy'), 2000);
        }
      });
    
      // On scroll: mascot gets excited
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          mascot.classList.add('excited');
        } else {
          mascot.classList.remove('excited');
        }
      });
    
      // Random animations: every 15 seconds
      const reactions = ['happy', 'spin', 'grow'];
      setInterval(() => {
        const random = reactions[Math.floor(Math.random() * reactions.length)];
    
        if (!mascot.classList.contains(random)) {
          mascot.classList.add(random);
          setTimeout(() => mascot.classList.remove(random), 1000);
        }
      }, 15000);
    }
    
    

    async function fetchWithRetry(url, maxRetries = 3) {
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const response = await fetch(url);
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 5;
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    retries++;
                } else {
                    return response;
                }
            } catch (error) {
                retries++;
                if (retries >= maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw new Error(`Failed to fetch after ${maxRetries} retries`);
    }

    async function displayGenres() {
        if (!allGenres.length) {
            await fetchGenres();
        }

        if (galleryContainer) {
            galleryContainer.innerHTML = "<p>Loading genres...</p>";
        }

        const sortedGenres = [...allGenres].sort((a, b) => a.name.localeCompare(b.name));

        if (galleryContainer) {
            galleryContainer.innerHTML = "";
            const genresList = document.createElement('div');
            genresList.style.gridColumn    = '1 / -1';
            genresList.style.display       = 'flex';
            genresList.style.flexWrap      = 'wrap';
            genresList.style.justifyContent= 'center';
            genresList.style.gap           = '10px';
            genresList.style.margin        = '1rem 0';

            sortedGenres.forEach(genre => {
                const genreButton = document.createElement('button');
                genreButton.textContent = genre.name;
                genreButton.className = 'genre-tag-button';
                genreButton.style.backgroundColor = '#282828';
                genreButton.style.color = 'white';
                genreButton.style.padding = '8px';
                genreButton.style.borderRadius = '8px';
                genreButton.style.textAlign = 'center';
                genreButton.style.cursor = 'pointer';
                genreButton.style.border = 'none';
                genreButton.style.fontSize = '1.15rem';
                genreButton.dataset.genreId = genre.mal_id;
                genreButton.addEventListener('click', function() {
                    const genreId = this.dataset.genreId;
                    fetchAnime(1, '', '', genreId);
                    if (prevBtn) prevBtn.style.display = 'block';
                    if (nextBtn) nextBtn.style.display = 'block';
                });
                genresList.appendChild(genreButton);
            });

            galleryContainer.appendChild(genresList);

            const genreButtons = document.querySelectorAll('.genre-tag-button');
            genreButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const genreId = this.dataset.genreId;
                    fetchAnime(1, '', '', genreId);
                    if (prevBtn) prevBtn.style.display = 'block';
                    if (nextBtn) nextBtn.style.display = 'block';
                });
            });
        }
    }

    function performSearch() {
        const query = searchInput.value.trim();
        currentPage = 1;
        currentMood = '';
        currentTagId = '';

        if (query.toLowerCase().startsWith('mood:')) {
            const mood = query.substring(5).trim().toLowerCase();
            const foundMood = Object.keys(moodMappings).find(key => key.toLowerCase() === mood);
            if (foundMood) {
                fetchAnime(currentPage, '', foundMood);
            } else {
                if (galleryContainer) {
                    galleryContainer.innerHTML = "<p>Invalid mood.</p>";
                }
            }
        } else if (query.toLowerCase().startsWith('tag:')) {
            const tagName = query.substring(4).trim();
            const foundTag = allGenres.find(genre => genre.name.toLowerCase() === tagName.toLowerCase());
            if (foundTag) {
                fetchAnime(currentPage, '', '', foundTag.mal_id);
            } else {
                if (galleryContainer) {
                    galleryContainer.innerHTML = "<p>Invalid tag.</p>";
                }
            }
        } else if (query.toLowerCase().startsWith('keyword:')) {
            const keyword = query.substring(8).trim();
            fetchAnime(currentPage, keyword);
        } else {
            fetchAnime(currentPage, query);
        }
        hideSuggestions();
    }

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

    //Random button functionality
    randomBtn.addEventListener('click', () => {
        const randomPage = Math.floor(Math.random() * 50) + 1;
        currentPage = randomPage;
        fetchAnime(currentPage, currentQuery, currentMood, currentTagId);
    });

    //Search functionality
    searchButton.addEventListener('click', () => {
        performSearch();
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    //Predictive text functionality
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        suggestionsContainer.innerHTML = '';
        hideSuggestions();

        if (!query) {
            showSuggestions(['mood: happy', 'tag: Action', 'keyword: anime title']);
        } else if (query.toLowerCase().startsWith('mood:')) {
            const prefix = 'mood:';
            const searchText = query.substring(prefix.length).trim().toLowerCase();
            if (searchText) {
                const matchingMoods = Object.keys(moodMappings)
                    .filter(mood => mood.toLowerCase().startsWith(searchText));
                showSuggestions(matchingMoods.map(mood => prefix + ' ' + mood));
            } else {
                showSuggestions([prefix + ' happy']);
            }
        } else if (query.toLowerCase().startsWith('tag:')) {
            const prefix = 'tag:';
            const searchText = query.substring(prefix.length).trim().toLowerCase();
            if (searchText) {
                const matchingTags = allGenres
                    .filter(genre => genre.name.toLowerCase().startsWith(searchText))
                    .map(genre => prefix + ' ' + genre.name);
                showSuggestions(matchingTags);
            } else {
                showSuggestions([prefix + ' Action']);
            }
        } else if (query.toLowerCase().startsWith('keyword:')) {
            const prefix = 'keyword:';
            const searchText = query.substring(prefix.length).trim().toLowerCase();
            if (searchText.length === 0) {
                showSuggestions([prefix + ' anime title']);
            }
            // No predictive text for keyword search after the prefix, but we can still show the prefix if they just type "keyword:"
            else {
                // You could potentially add suggestions here based on popular anime titles or past searches if you had that data
            }
        } else {
            showSuggestions(['mood: happy', 'tag: Action', 'keyword: Naruto']);
        }
    });

    function showSuggestions(suggestions) {
        const suggestionsContainer = document.querySelector('.search-suggestions');
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = '';
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.innerHTML = `<span data-text="true">${suggestion}</span>`;

                suggestionItem.addEventListener('click', () => {
                    const selectedText = suggestionItem.querySelector('[data-text="true"]').textContent;
                    const parts = selectedText.split(':');
                    const initialExamples = ['mood: happy', 'tag: action', 'keyword: naruto'];

                    if (parts.length > 1 && initialExamples.includes(selectedText.toLowerCase())) {
                        const prefix = parts[0].trim() + ': ';
                        document.getElementById('search_box').value = prefix;
                        hideSuggestions();
                        document.getElementById('search_box').focus();
                        document.getElementById('search_box').dispatchEvent(new Event('input'));

                    } else {
                        document.getElementById('search_box').value = selectedText;
                        performSearch();
                        hideSuggestions();
                        document.getElementById('search_box').focus();
                    }
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
            suggestionsContainer.style.display = 'block';
            isPredictiveTextVisible = true;
        } else {
            hideSuggestions();
        }
    }

    function hideSuggestions() {
        const suggestionsContainer = document.querySelector('.search-suggestions');
        if(suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        isPredictiveTextVisible = false;
    }

    document.addEventListener('click', (event) => {
        const searchInput = document.querySelector('.search input[type="text"]');
        const suggestionsContainer = document.querySelector('.search-suggestions');
        if (isPredictiveTextVisible && event.target !== searchInput && suggestionsContainer && !suggestionsContainer.contains(event.target)) {
            hideSuggestions();
        }
    });

    document.getElementById('search_box').addEventListener('focus', () => {
        const searchInput = document.getElementById('search_box');
        const suggestionsContainer = document.querySelector('.search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
            hideSuggestions();
            if (!searchInput.value.trim()) {
                showSuggestions(['mood: happy', 'tag: Action', 'keyword: anime title']);
            }
        }
    });

    document.querySelectorAll('.filter a').forEach(link => {
        link.addEventListener('click', async (event) => {
            const linkText = link.textContent.trim();
            
            // Special handling for Bookmarks link
            if (linkText === 'Bookmarks') {
                const user = auth.currentUser;
                if (!user) {
                    event.preventDefault();
                    alert('Please log in to access your bookmarks.');
                    showAuthModal('login');
                }
                // If user is logged in, allow default navigation to proceed
                return;
            }
    
            // For all other links, prevent default and handle normally
            event.preventDefault();
            currentPage = 1;
            currentQuery = '';
            currentMood = '';
            currentTagId = '';
            searchInput.value = '';
    
            document.querySelectorAll('.filter a').forEach(a => {
                a.classList.remove('active');
            });
            link.classList.add('active');
    
            if (linkText === 'Home') {
                console.log("Navigating to Home.");
                fetchAnime(currentPage);
                if (prevBtn) prevBtn.style.display = 'block';
                if (nextBtn) nextBtn.style.display = 'block';
                if (randomBtn) randomBtn.style.display = 'block';
    
            } else if (linkText === 'Genre') {
                console.log("Navigating to Genre.");
                displayGenres();
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                if (randomBtn) randomBtn.style.display = 'none';
            }
        });
    });
    
});