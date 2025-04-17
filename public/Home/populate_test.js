//!DECLEAR
const gallery_container = document.querySelector('.grid_container');
let page = 1;
let limit = 16;

// !FUNCTIONS
function drawGallery(records) {
    let html = '';

    for (let rec of records) {
        html += `
        <div class="card">
            <a href="">
                <img class="title_card" src="${rec.images.jpg.image_url}" alt="${rec.title_english || rec.title}">
                <div class="favourite">
                    <button>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                </div>
                <p class="anime_name">${rec.title_english || rec.title}</p>
            </a>
        </div>`;
    }

    gallery_container.innerHTML = html;
}

async function getData() {
    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?limit=${limit}&page=${page}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            drawGallery(data.data);
            page++;
        } 
        
        else {
            console.log("No data returned from API");
        }
    } 
    
    catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Initial data load
getData();