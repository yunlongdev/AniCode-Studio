document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    
    if (!animeId) {
      window.location.href = 'home.html';
      return;
    }

    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`);
      const data = await response.json();
      
      if (!data.data) {
        throw new Error('Anime not found');
      }

      const anime = data.data;
      renderAnimeDetails(anime);
    } catch (error) {
      console.error('Error loading anime details:', error);
      document.getElementById('anime-content').innerHTML = `
        <div class="error-message">
          <p>Failed to load anime details. Please try again later.</p>
          <a href="home.html" class="back-btn">Back to Home</a>
        </div>
      `;
    }
  });

  function renderAnimeDetails(anime) {
    const genres = anime.genres?.map(g => g.name).join(', ') || 'Unknown';
    const studios = anime.studios?.map(s => s.name).join(', ') || 'Unknown';
    const producers = anime.producers?.map(p => p.name).join(', ') || 'Unknown';
    
    document.getElementById('anime-content').innerHTML = `
      <div class="anime-header">
        <div class="anime-poster">
          <img src="${anime.images?.jpg?.image_url}" alt="${anime.title}" loading="lazy">
        </div>
        <div class="anime-info">
          <h1 class="anime-title">${anime.title}</h1>
          <div class="anime-meta">
            <span class="meta-item">${anime.type || 'Unknown'}</span>
            <span class="meta-item">${anime.episodes || '?'} episodes</span>
            <span class="meta-item">Score: ${anime.score ? anime.score.toFixed(1) : 'N/A'}</span>
            <span class="meta-item">${anime.status || 'Unknown'}</span>
          </div>
          <p class="anime-synopsis">${anime.synopsis || 'No synopsis available.'}</p>
        </div>
      </div>

      <div class="detail-section">
        <h2 class="section-title">Details</h2>
        <div class="detail-grid">
          <div class="detail-card">
            <h3>Information</h3>
            <p><strong>Type:</strong> ${anime.type || 'Unknown'}</p>
            <p><strong>Episodes:</strong> ${anime.episodes || '?'}</p>
            <p><strong>Status:</strong> ${anime.status || 'Unknown'}</p>
            <p><strong>Aired:</strong> ${anime.aired?.string || 'Unknown'}</p>
            <p><strong>Rating:</strong> ${anime.rating || 'Unknown'}</p>
          </div>
          <div class="detail-card">
            <h3>Genres</h3>
            <p>${genres}</p>
          </div>
          <div class="detail-card">
            <h3>Studios</h3>
            <p>${studios}</p>
          </div>
          <div class="detail-card">
            <h3>Producers</h3>
            <p>${producers}</p>
          </div>
        </div>
      </div>

      ${anime.trailer?.embed_url ? `
      <div class="detail-section">
        <h2 class="section-title">Trailer</h2>
        <div class="trailer-container">
          <iframe class="trailer-iframe" loading="lazy" src="${anime.trailer.embed_url}" 
            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen></iframe>
        </div>
      </div>
      ` : ''}

      <div class="detail-section">
        <h2 class="section-title">External Links</h2>
        <div class="detail-grid">
          <a href="${anime.url}" target="_blank" class="detail-card" style="text-decoration: none; color: inherit;">
            <h3>MyAnimeList</h3>
            <p>View on MyAnimeList</p>
          </a>
          ${anime.external?.map(ext => `
            <a href="${ext.url}" target="_blank" class="detail-card" style="text-decoration: none; color: inherit;">
              <h3>${ext.name}</h3>
              <p>${ext.url}</p>
            </a>
          `).join('') || ''}
        </div>
      </div>
    `;
  }