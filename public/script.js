// API endpoint (relative URL works because frontend and API are same domain)
const API_BASE = '/api';
const MANGA_LIST_ENDPOINT = `${API_BASE}/mangaList`;

// DOM elements
const gridEl = document.getElementById('mangaGrid');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('errorMessage');
const connectionStatusEl = document.getElementById('connectionStatus');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const scrollUpBtn = document.getElementById('scrollUpBtn');
const scrollDownBtn = document.getElementById('scrollDownBtn');

// State
let allManga = [];
let filteredManga = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchMangaList();
    setupEventListeners();
});

function setupEventListeners() {
    refreshBtn.addEventListener('click', handleRefresh);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    scrollUpBtn.addEventListener('click', () => scrollSmooth(-700));
    scrollDownBtn.addEventListener('click', () => scrollSmooth(700));
}

// Fetch from API
async function fetchMangaList() {
    showLoading(true);
    hideError();
    updateConnectionStatus('checking', '🔌 Connecting to Manga Hook API...');
    
    try {
        const response = await fetch(MANGA_LIST_ENDPOINT);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data && Array.isArray(data.mangaList)) {
            allManga = data.mangaList;
            updateConnectionStatus('connected', `✅ Connected · ${allManga.length} manga available`);
        } else {
            throw new Error('Unexpected API response format');
        }
        
        filterAndRender();
    } catch (err) {
        console.error('Fetch error:', err);
        updateConnectionStatus('disconnected', '❌ Failed to connect to API');
        showError('Could not load manga. Make sure the server is running.');
        gridEl.innerHTML = '';
    } finally {
        showLoading(false);
    }
}

// Filter based on search
function filterAndRender() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (query === '') {
        filteredManga = [...allManga];
    } else {
        filteredManga = allManga.filter(m => 
            m.title && m.title.toLowerCase().includes(query)
        );
    }
    
    renderGrid(filteredManga);
}

// Render manga cards
function renderGrid(mangaArray) {
    if (!mangaArray.length) {
        if (allManga.length && searchInput.value.trim() !== '') {
            gridEl.innerHTML = `<div class="error-message" style="grid-column:1/-1;">😕 No manga match "${searchInput.value}"</div>`;
        } else if (!allManga.length) {
            gridEl.innerHTML = `<div class="error-message" style="grid-column:1/-1;">📭 No manga available. Try refreshing.</div>`;
        } else {
            gridEl.innerHTML = '';
        }
        return;
    }

    let html = '';
    mangaArray.forEach(m => {
        const title = m.title || 'Untitled';
        const image = m.image || 'https://via.placeholder.com/300x400?text=No+Cover';
        const chapter = m.chapter || 'chapter-?';
        const views = m.view || m.views || '—';
        const id = m.id || `manga-${Math.random()}`;

        html += `
            <div class="manga-card" data-manga-id="${id}">
                <div class="card-image">
                    <img src="${image}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(title)}</div>
                    <div class="card-meta">
                        <span class="card-chapter"><i class="far fa-file-alt"></i> ${escapeHtml(chapter.substring(0, 18))}</span>
                        <span class="card-views"><i class="far fa-eye"></i> ${escapeHtml(views)}</span>
                    </div>
                    <button class="download-btn" data-download-url="${image}" data-title="${escapeHtml(title)}">
                        <i class="fas fa-download"></i> download cover
                    </button>
                </div>
            </div>
        `;
    });
    
    gridEl.innerHTML = html;
    attachDownloadEvents();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Download functionality
function attachDownloadEvents() {
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-download-url');
            const title = btn.getAttribute('data-title') || 'manga_cover';
            
            btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> downloading...';
            btn.disabled = true;
            
            await downloadImage(url, title);
            
            btn.innerHTML = '<i class="fas fa-download"></i> download cover';
            btn.disabled = false;
        });
    });
}

async function downloadImage(url, filename) {
    try {
        const safeName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);
        
        const response = await fetch(url, { 
            mode: 'cors',
            cache: 'force-cache'
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = safeName + '.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.warn('Download failed, opening in new tab:', error);
        window.open(url, '_blank');
    }
}

// UI Helpers
function showLoading(show) {
    loadingEl.style.display = show ? 'block' : 'none';
}

function showError(msg) {
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
}

function hideError() {
    errorEl.style.display = 'none';
}

function updateConnectionStatus(status, message) {
    connectionStatusEl.className = `connection-status ${status}`;
    connectionStatusEl.textContent = message;
}

function handleRefresh() {
    searchInput.value = '';
    fetchMangaList();
}

function handleSearch() {
    filterAndRender();
}

function scrollSmooth(amount) {
    window.scrollBy({ 
        top: amount, 
        behavior: 'smooth' 
    });
}