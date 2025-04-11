const galleryContainer = document.getElementById('gallery-container');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

let currentPage = 1;

async function fetchAnime(page = 1) {
  try {
    galleryContainer.innerHTML = "<p>Loading anime</p>";
    const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}`);
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

      card.addEventListener('mouseenter', () => showTrailerPreview(anime.mal_id, card));
      card.addEventListener('mouseleave', () => hideTrailerPreview(card));

      galleryContainer.appendChild(card);
    });

    if (!data.data || data.data.length === 0) {
      galleryContainer.innerHTML = "<p>No anime found on this page.</p>";
    }

  } catch (error) {
    console.error('Error loading anime:', error);
    galleryContainer.innerHTML = "<p>Failed to load anime. Try again later.</p>";
  }
}

// Next and Previous for pages
document.addEventListener("DOMContentLoaded", () => fetchAnime(currentPage));

nextBtn.addEventListener('click', () => {
  currentPage++;
  fetchAnime(currentPage);
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    fetchAnime(currentPage);
  }
});

// Search function to be added also bookmarks and other stuff we find necessary (or cool idk)


