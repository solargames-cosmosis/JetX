const API_KEY = "0c7387ed17fe3d2959530a2f0ca70022";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL_POSTER = "https://image.tmdb.org/t/p/w500";

const YOUTUBE_SEARCH_URL = "/api/youtube/search/";
const YOUTUBE_SCRAPE_URL = "/worker/watch/yt/dl/360pS/";
const TWITCH_ACTIVE_STREAMS_URL = "/worker/watch/ttv/active";
const TWITCH_GET_STREAM_URL = "/worker/watch/ttv/get/";
const TWITCH_PROXY_URL = "/worker/watch/ttv/proxy?url=";

const MOVIE_API_BASE = "";
const PHONETIC = [
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliett",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Papa",
  "Quebec",
  "Romeo",
  "Sierra",
  "Tango",
  "Uniform",
  "Victor",
  "Whiskey",
  "X-ray",
  "Yankee",
  "Zulu",
];

function capitalize(str) {
  if (!str) {
    return "";
  }
  return str.toLowerCase().replace(/\b\w/g, function (c) {
    return c.toUpperCase();
  });
}

const startingSource = localStorage.getItem("WATCH_STARTING_SOURCE");
const validStartingSources = ["youtube", "tv", "movie", "twitch"];

let currentSource = validStartingSources.includes(startingSource)
  ? startingSource
  : "movie";
let currentFilter = "popularity.desc";
let currentQuery = "";

let currentTmdbId = null;
let currentTvShowName = null;
let currentFetchId = 0;
let movieDataCache = null;
let movieIdleTimer = null;
let failoverTimer = null;
let autoSwitchActive = true;
let activeTrack = null;

let currentPage = 1;
let totalPages = 1;
let isFetching = false;
let twitchStartTime = 0;
let currentPlayerKeydownHandler = null;

window.disableFailover = () => {
  autoSwitchActive = false;
  clearTimeout(failoverTimer);
};

let hlsInstance = null;
let debounceTimer = null;
let imageObserver = null;

const browserView = document.getElementById("browser-view");
const grid = document.getElementById("grid");
const noResultsMessage = document.querySelector(".no-results-message");
const dropdowns = document.querySelectorAll(".dropdown-wrapper");
const backdrop = document.getElementById("backdrop");

const searchBar = document.querySelector(".search-bar");
const input = searchBar.querySelector("input");
const sourceDropdownWrapper = document.getElementById(
  "source-dropdown-wrapper"
);
const sourceSelectorText =
  sourceDropdownWrapper.querySelector(".dropdown-text");
const sourceSelectorIcon = document.getElementById("current-source-icon");

const filterDropdownIcon = document.querySelector(".filter-icon");
const filterDropdownWrapper = document.getElementById(
  "filter-dropdown-wrapper"
);
const filterOptionsContainer = document.getElementById(
  "filter-options-container"
);

const gameOverlay = document.getElementById("game-overlay");
const playerContainer = document.getElementById("player-container");
const buttonPanel = document.getElementById("button-panel");
const loadingContainer = document.getElementById("loading-container");
const loadingMessage = document.getElementById("loading-message");

const serverBtn = document.getElementById("server-btn");
const serverOptionsWrapper = document.getElementById("server-options-wrapper");
const ccBtn = document.getElementById("cc-btn");
const ccOptionsWrapper = document.getElementById("cc-options-wrapper");

const tvModalContainer = document.getElementById("tv-modal-container");
const tvModalHeader = document.getElementById("tv-modal-header");
const tvModalList = document.getElementById("tv-modal-list");

function syncSourceUI() {
  const sourceMap = {
    movie: "Movies",
    tv: "TV Shows",
    youtube: "YouTube",
    twitch: "Twitch",
  };
  const iconMap = {
    movie: "ri-film-line",
    tv: "ri-tv-2-line",
    youtube: "ri-youtube-line",
    twitch: "ri-twitch-line",
  };
  sourceSelectorText.textContent = sourceMap[currentSource] || "Movies";
  sourceSelectorIcon.className = iconMap[currentSource] || "ri-film-line";
  input.placeholder = `Search ${sourceMap[currentSource] || "Movies"}...`;
}

function setupObservers() {
  const observerOptions = {
    root: grid,
    rootMargin: "0px 0px 500px 0px",
    threshold: 0.01,
  };
  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const card = entry.target;
        if (card.classList.contains("loaded")) {
          return;
        }
        const imageUrl = card.dataset.src;
        if (imageUrl) {
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
            if (card.classList.contains("youtube-card")) {
              const thumb = card.querySelector(".yt-thumb");
              if (thumb) {
                thumb.style.setProperty("--bg-image", `url('${imageUrl}')`);
              }
            } else {
              card.style.setProperty("--bg-image", `url('${imageUrl}')`);
            }
            card.classList.add("loaded");
          };
        }
        imageObserver.unobserve(card);
      }
    });
  }, observerOptions);
}

function handleScrollMasks() {
  if (grid.scrollTop > 10) {
    grid.classList.add("show-top-mask");
  } else {
    grid.classList.remove("show-top-mask");
  }
  const isAtBottom =
    grid.scrollHeight - grid.scrollTop <= grid.clientHeight + 10;
  if (!isAtBottom && grid.scrollHeight > grid.clientHeight) {
    grid.classList.add("show-bottom-mask");
  } else {
    grid.classList.remove("show-bottom-mask");
  }
}

function updSourceUI() {
  grid.className = `grid-container source-${currentSource}`;
  if (currentSource === "movie" || currentSource === "tv") {
    filterDropdownWrapper.style.display = "flex";
  } else {
    filterDropdownWrapper.style.display = "none";
  }
}

async function fetchData(append = false) {
  if (!append) {
    currentFetchId++;
    currentPage = 1;
    grid.querySelectorAll(".card").forEach((c) => {
      c.remove();
    });
    noResultsMessage.style.display = "none";
    updSourceUI();
  }

  const fetchId = currentFetchId;
  isFetching = true;

  if (currentSource === "youtube") {
    await fetchYoutubeData(fetchId);
  } else if (currentSource === "twitch") {
    await fetchTwitchData(fetchId);
  } else {
    await fetchTMDBData(fetchId);
  }

  isFetching = false;
}

async function fetchTMDBData(fetchId) {
  let endpoint = "";
  const params = new URLSearchParams({
    api_key: API_KEY,
    page: currentPage,
  });
  if (currentQuery) {
    params.append("query", currentQuery);
    endpoint = `/search/${currentSource}`;
  } else {
    endpoint = `/discover/${currentSource}`;
    let filter = currentFilter;
    if (currentSource === "tv") {
      filter = filter.replace("release_date", "first_air_date");
      filter = filter.replace("original_title", "original_name");
    }
    params.append("sort_by", filter);
    params.append("vote_count.gte", 100);
  }
  try {
    const res = await fetch(`${API_URL}${endpoint}?${params.toString()}`);
    const data = await res.json();
    if (fetchId !== currentFetchId) {
      return;
    }
    totalPages = data.total_pages || 1;

    const now = new Date();
    const validResults = (data.results || []).filter((item) => {
      if (
        !(item.poster_path || item.backdrop_path) ||
        item.media_type === "person"
      ) {
        return false;
      }
      let rDate = item.release_date || item.first_air_date;
      if (rDate && new Date(rDate) > now) {
        return false;
      }
      return true;
    });
    renderItems(validResults);
  } catch (err) {
    console.error(err);
  }
}

async function fetchYoutubeData(fetchId) {
  const query = currentQuery.trim();
  try {
    if (!query) {
      return;
    }

    const res = await fetch(
      `${YOUTUBE_SEARCH_URL}${encodeURIComponent(query)}?max=20`
    );
    const json = await res.json();

    if (fetchId !== currentFetchId) {
      return;
    }

    const formatted = (json.items || []).map((item) => {
      let authorName = "";
      if (item.author) {
        authorName = item.author.name;
      }
      return {
        ...item,
        media_type: "youtube",
        uploaderName: authorName,
      };
    });

    renderItems(formatted);
  } catch (err) {
    console.error(err);
    if (fetchId === currentFetchId) {
      renderItems([]);
    }
  }
}

async function fetchTwitchData(fetchId) {
  try {
    const res = await fetch(TWITCH_ACTIVE_STREAMS_URL);
    const data = await res.json();
    if (fetchId !== currentFetchId) {
      return;
    }
    const formatted = data.map((item) => {
      return {
        ...item,
        media_type: "twitch",
        channel_name: item.url.split("/").pop().split("?")[0],
      };
    });
    renderItems(formatted);
  } catch (err) {
    console.error(err);
  }
}

function renderItems(items) {
  if (items.length === 0 && currentPage === 1) {
    noResultsMessage.style.display = "block";
    noResultsMessage.textContent = "No results found.";
    handleScrollMasks();
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("div");
    const mediaType = item.media_type || currentSource;
    let title = "";
    let coverUrl = "";
    let cardClass = "media-card";

    if (mediaType === "youtube") {
      cardClass = "youtube-card";
      title = item.title;
      coverUrl = item.thumbnail;
      card.dataset.id = item.videoId;
      let uploaderName = item.uploaderName || "";
      card.innerHTML = `<div class="yt-thumb"></div><div class="yt-info"><div class="yt-title">${title}</div><div class="yt-channel">${uploaderName}</div></div>`;
    } else if (mediaType === "twitch") {
      cardClass = "twitch-card";
      title = item.title;
      if (item.preview) {
        coverUrl = item.preview
          .replace("{width}", "340")
          .replace("{height}", "191");
      } else {
        coverUrl = "";
      }
      card.dataset.id = item.channel_name || item.url.split("/").pop();
      let viewersCount = item.viewers ? item.viewers.toLocaleString() : 0;
      card.innerHTML = `<div class="twitch-info"><div class="twitch-title">${title}</div><div class="twitch-details"><span>${item.channel_name}</span><span><i class="ri-eye-line"></i> ${viewersCount}</span></div></div>`;
    } else {
      cardClass = "media-card";
      title = item.title || item.name;
      if (item.poster_path) {
        coverUrl = `${IMAGE_URL_POSTER}${item.poster_path}`;
      } else {
        coverUrl = "";
      }
      card.dataset.id = item.id;
      card.innerHTML = `<div class="card-name">${title}</div>`;
    }

    card.className = `card ${cardClass}`;
    card.dataset.src = coverUrl;

    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (
        mediaType === "movie" ||
        mediaType === "youtube" ||
        mediaType === "twitch"
      ) {
        playMedia(mediaType, id, title);
      } else if (mediaType === "tv") {
        currentTmdbId = id;
        currentTvShowName = title;
        openTvModal(id, title);
      }
    });

    fragment.appendChild(card);
    if (imageObserver) {
      imageObserver.observe(card);
    }
  });

  grid.insertBefore(fragment, noResultsMessage);
  handleScrollMasks();
}

function closeAllDropdowns() {
  dropdowns.forEach((wrapper) => {
    wrapper.classList.remove("open");
    const chev = wrapper.querySelector(".ri-arrow-up-s-line");
    if (chev) {
      chev.classList.remove("ri-arrow-up-s-line");
      chev.classList.add("ri-arrow-down-s-line");
    }
  });
  backdrop.classList.remove("active");
}

filterDropdownIcon.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpening = !filterDropdownWrapper.classList.contains("open");
  closeAllDropdowns();
  if (isOpening) {
    filterDropdownWrapper.classList.add("open");
    backdrop.classList.add("active");
  }
});

dropdowns.forEach((wrapper) => {
  const menu = wrapper.querySelector(".dropdown-menu");
  const options = wrapper.querySelector(".dropdown-options");
  if (menu) {
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpening = !wrapper.classList.contains("open");
      closeAllDropdowns();
      if (isOpening) {
        wrapper.classList.add("open");
        backdrop.classList.add("active");
        const chev = menu.querySelector(".ri-arrow-down-s-line");
        if (chev) {
          chev.classList.remove("ri-arrow-down-s-line");
          chev.classList.add("ri-arrow-up-s-line");
        }
      }
    });
  }
  if (options) {
    options.addEventListener("click", (e) => {
      const opt = e.target.closest(".option");
      if (opt) {
        if (opt.classList.contains("disabled")) {
          return;
        }
        e.stopPropagation();
        const value = opt.dataset.value;
        if (wrapper === sourceDropdownWrapper) {
          if (currentSource !== value) {
            currentSource = value;

            syncSourceUI();
            input.value = "";
            currentQuery = "";
            updFilterDropdownOpt();
            fetchData();
          }
        } else if (wrapper === filterDropdownWrapper) {
          if (currentFilter !== value) {
            currentFilter = value;
            fetchData();
          }
        }
        closeAllDropdowns();
      }
    });
  }
});

document.addEventListener("click", (e) => {
  const closestDropdown = e.target.closest(".dropdown-wrapper");
  const closestSearchBar = e.target.closest(".search-bar");
  const closestServerBtn = e.target.closest("#server-btn");
  const closestServerOpts = e.target.closest("#server-options-wrapper");
  const closestCCBtn = e.target.closest("#cc-btn");
  const closestCCOpts = e.target.closest("#cc-options-wrapper");

  if (
    !closestDropdown &&
    !closestSearchBar &&
    !closestServerBtn &&
    !closestServerOpts &&
    !closestCCBtn &&
    !closestCCOpts
  ) {
    closeAllDropdowns();
    serverOptionsWrapper.classList.remove("active");
    ccOptionsWrapper.classList.remove("active");
  }
});

backdrop.addEventListener("click", closeAllDropdowns);

function updFilterDropdownOpt() {
  filterOptionsContainer.innerHTML = "";
  if (currentSource === "movie" || currentSource === "tv") {
    filterOptionsContainer.innerHTML = `
            <div class="option" data-value="popularity.desc">Relevance</div>
            <div class="option" data-value="release_date.desc">Newest</div>
            <div class="option" data-value="vote_average.desc">Highest Rated</div>
          `;
    if (currentSource === "tv") {
      filterOptionsContainer.innerHTML =
        filterOptionsContainer.innerHTML.replace(
          "release_date",
          "first_air_date"
        );
    }
  }
}

function runSearchDebounced() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentQuery = input.value.trim();
    fetchData();
  }, 500);
}

input.addEventListener("input", runSearchDebounced);

grid.addEventListener("scroll", () => {
  handleScrollMasks();
  if (currentSource === "movie" || currentSource === "tv") {
    if (grid.scrollHeight - grid.scrollTop <= grid.clientHeight + 200) {
      if (!isFetching && currentPage < totalPages) {
        currentPage++;
        fetchData(true);
      }
    }
  }
});

function destroyPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  if (currentPlayerKeydownHandler) {
    document.removeEventListener("keydown", currentPlayerKeydownHandler);
    currentPlayerKeydownHandler = null;
  }
  clearTimeout(movieIdleTimer);
  clearTimeout(failoverTimer);
  playerContainer.innerHTML = "";
  serverOptionsWrapper.classList.remove("active");
  ccOptionsWrapper.classList.remove("active");
  serverBtn.style.display = "none";
  ccBtn.style.display = "none";
  activeTrack = null;
}

function exitPlayback() {
  gameOverlay.classList.remove("view-active");
  destroyPlayer();
  requestAnimationFrame(() => {
    browserView.classList.remove("view-hidden");
    setTimeout(() => {
      gameOverlay.style.display = "none";
    }, 300);
  });
}

function showPlayerError(msg) {
  loadingContainer.style.display = "none";
  playerContainer.style.opacity = "1";
  buttonPanel.style.display = "flex";
  playerContainer.innerHTML = `<div style="color: rgba(var(--cb), 0.7); margin-top: auto; margin-bottom: auto; margin-left: auto; margin-right: auto; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; font-size: 16px; text-align: center;">Error: ${msg}</div>`;
}

function finishLoading() {
  loadingContainer.style.display = "none";
  playerContainer.style.opacity = "1";
  buttonPanel.style.display = "flex";
}

async function playMedia(type, id, title, seasonNum = null, episodeNum = null) {
  destroyPlayer();
  gameOverlay.style.display = "block";
  buttonPanel.style.display = "none";
  playerContainer.style.opacity = "0";
  loadingContainer.style.display = "block";
  loadingMessage.textContent = "LOADING..";

  requestAnimationFrame(() => {
    browserView.classList.add("view-hidden");
    gameOverlay.classList.add("view-active");
  });

  if (type === "youtube") {
    setTimeout(() => {
      if (loadingContainer.style.display !== "none") {
        loadingMessage.textContent = "STILL LOADING...";
      }
    }, 3000);
    setupYoutubePlayer(id);
  } else if (type === "twitch") {
    setTimeout(() => {
      if (loadingContainer.style.display !== "none") {
        loadingMessage.textContent = "STILL LOADING...";
      }
    }, 3000);
    setupTwitchPlayer(id);
  } else if (type === "movie") {
    setTimeout(() => {
      if (
        loadingContainer.style.display !== "none" &&
        loadingMessage.textContent === "LOADING.."
      ) {
        loadingMessage.textContent = "STILL LOADING...";
      }
    }, 10000);
    setupMoviePlayer(id);
  }
}

async function setupYoutubePlayer(id) {
  try {
    const res = await fetch(`${YOUTUBE_SCRAPE_URL}${id}`);
    const data = await res.json();

    if (!data.media || data.media.length === 0) {
      throw new Error("Stream unavailable: No media found.");
    }

    const videoSource = data.media[0];

    if (!videoSource.url) {
      throw new Error("Stream unavailable: URL is missing.");
    }

    const sourceObj = { 
      url: videoSource.url,
      title: data.title
    };

    initCustomPlayer(sourceObj, [], [], "youtube");
  } catch (err) {
    showPlayerError(err.message);
  }
}

async function setupTwitchPlayer(id) {
  try {
    const res = await fetch(`${TWITCH_GET_STREAM_URL}${id}`);
    const data = await res.json();
    if (!data.urls || Object.keys(data.urls).length === 0) {
      throw new Error("Stream offline.");
    }
    const qualities = Object.keys(data.urls).filter((q) => {
      return q !== "audio_only";
    });
    let bestQuality = null;
    if (qualities.length > 0) {
      bestQuality = qualities[qualities.length - 1];
    }
    if (!bestQuality) {
      throw new Error("No video found.");
    }
    const proxiedUrl =
      TWITCH_PROXY_URL + encodeURIComponent(data.urls[bestQuality]);
    const sourceObj = { url: proxiedUrl };
    initCustomPlayer(sourceObj, [], [], "twitch");
  } catch (err) {
    showPlayerError(err.message);
  }
}

async function setupMoviePlayer(id) {
  try {
    const res = await fetch(`${MOVIE_API_BASE}/v1/movies/${id}`);
    const data = await res.json();
    if (!data.sources || !data.sources.length) {
      throw new Error("No sources found.");
    }

    movieDataCache = data;
    loadingMessage.textContent = "VALIDATING...";

    data.sources.forEach((s) => {
      let match = s.url.match(/^(?:https?:\/\/[^\/]+)?(\/v1\/proxy.*)/);
      if (match) {
        s.url = MOVIE_API_BASE + match[1];
      }
    });

    data.sources.sort((a, b) => {
      const idA =
        a.provider && a.provider.id ? a.provider.id.toLowerCase() : "";
      const idB =
        b.provider && b.provider.id ? b.provider.id.toLowerCase() : "";
      if (idA === "vixsrc" && idB !== "vixsrc") {
        return -1;
      }
      if (idB === "vixsrc" && idA !== "vixsrc") {
        return 1;
      }
      if (idA === "vidsrc" && idB !== "vidsrc") {
        return 1;
      }
      if (idB === "vidsrc" && idA !== "vidsrc") {
        return -1;
      }
      return 0;
    });

    await Promise.all(
      data.sources.map((s) => {
        return verifyUrl(s, true);
      })
    );

    if (data.subtitles) {
      data.subtitles.forEach((s) => {
        let match = s.url.match(/^(?:https?:\/\/[^\/]+)?(\/v1\/proxy.*)/);
        if (match) {
          s.url = MOVIE_API_BASE + match[1];
        }
      });

      await Promise.all(
        data.subtitles.map((s) => {
          return verifyUrl(s, false);
        })
      );
      data.subtitles = data.subtitles.filter((s) => {
        return s.state === "valid";
      });

      const seenSubs = new Set();
      data.subtitles = data.subtitles.filter((s) => {
        if (seenSubs.has(s.url)) {
          return false;
        }
        seenSubs.add(s.url);
        return true;
      });
    }

    const validSources = data.sources.filter((s) => {
      return s.state === "valid";
    });

    if (validSources.length === 0) {
      playerContainer.innerHTML = `<div style="color: rgba(255, 255, 255, 0.7); margin-top: auto; margin-bottom: auto; margin-left: auto; margin-right: auto; padding-top: 20px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; font-size: 18px; text-align: center; font-weight: 500;">No valid sources found for this movie/TV show.</div>`;
      serverBtn.style.display = "flex";
      populateServerWrapper(data.sources, null);
      finishLoading();
      return;
    }

    initCustomPlayer(validSources[0], validSources, data.sources, "movie");
  } catch (err) {
    showPlayerError(err.message);
  }
}

async function verifyUrl(obj, isRange) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => {
      c.abort();
    }, 3500);

    let options = { signal: c.signal };
    if (isRange) {
      options.headers = { Range: "bytes=0-100" };
    } else {
      options.method = "HEAD";
    }

    let r = await fetch(obj.url, options);
    if (!r.ok && !isRange && r.status !== 206) {
      r = await fetch(obj.url, { signal: c.signal });
    }

    clearTimeout(t);
    if (r.ok || r.status === 206) {
      obj.state = "valid";
    } else {
      obj.state = "invalid";
    }
  } catch (err) {
    obj.state = "invalid";
  }
  return obj.state === "valid";
}

function initCustomPlayer(source, validSources, allSources, mediaType) {
  autoSwitchActive = true;

  if (mediaType === "movie") {
    serverBtn.style.display = "flex";
  } else {
    serverBtn.style.display = "none";
    ccBtn.style.display = "none";
  }

  playerContainer.innerHTML = `
          <div id="buffering-overlay" style="position: absolute; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 40; pointer-events: none; transition: opacity 0.2s;">
            <div class="lds-ripple" style="width: 80px; height: 80px;">
              <div style="border-color: rgba(255,255,255,0.8);"></div><div style="border-color: rgba(255,255,255,0.8);"></div>
            </div>
          </div>
          <video id="movie-video" playsinline style="width:100%; height:100%; object-fit:contain; cursor:pointer;" ${
            mediaType === "movie" ? 'crossorigin="anonymous"' : ""
          }></video>
          <div id="subtitle-display"></div>
          <div class="movie-controls" id="movie-controls">
            <div class="timeline-wrap" id="movie-timeline" style="${
              mediaType === "twitch" ? "display: none;" : ""
            }">
              <div class="timeline-buffered" id="movie-buffered"></div>
              <div class="timeline-hover-bar" id="movie-hover-bar"></div>
              <div class="timeline-filled" id="movie-progress"></div>
              <div class="timeline-tooltip" id="movie-tooltip">00:00</div>
            </div>
            <div class="ctrl-row">
              <div class="ctrl-group">
                <button class="player-btn" id="movie-play"><i class="ri-play-fill"></i></button>
                <div class="vol-group">
                  <button class="player-btn" style="margin-top:0; margin-bottom:0; margin-left:0; margin-right:0;" id="movie-mute"><i class="ri-volume-up-fill"></i></button>
                  <div class="vol-slider-wrap">
                    <input type="range" id="movie-vol" min="0" max="1" step="0.05" value="1">
                  </div>
                </div>
                ${
                  mediaType === "twitch"
                    ? `<button class="player-btn" id="twitch-present" style="display:none; width:auto; padding-top:0; padding-bottom:0; padding-left:12px; padding-right:12px; font-size:14px; gap:6px; color:rgba(255,255,255,0.8);"><i class="ri-record-circle-line"></i> Present</button>`
                    : ""
                }
                <div class="timestamp">
                  <span class="time-now" id="movie-cur">00:00</span>
                  <span class="time-total" id="movie-tot" style="${
                    mediaType === "twitch" ? "display: none;" : ""
                  }">/ 00:00</span>
                </div>
              </div>
              <div class="ctrl-group">
                <button class="player-btn" id="movie-fs"><i class="ri-fullscreen-fill"></i></button>
              </div>
            </div>
          </div>
        `;

  const v = document.getElementById("movie-video");
  const playBtn = document.getElementById("movie-play");
  const muteBtn = document.getElementById("movie-mute");
  const volSlider = document.getElementById("movie-vol");
  const fsBtn = document.getElementById("movie-fs");
  const timeline = document.getElementById("movie-timeline");
  const progress = document.getElementById("movie-progress");
  const buffered = document.getElementById("movie-buffered");
  const hoverBar = document.getElementById("movie-hover-bar");
  const tooltip = document.getElementById("movie-tooltip");
  const curTimeTxt = document.getElementById("movie-cur");
  const totTimeTxt = document.getElementById("movie-tot");
  const bufOverlay = document.getElementById("buffering-overlay");
  const subDisplay = document.getElementById("subtitle-display");
  const presentBtn = document.getElementById("twitch-present");

  let englishTracks = [];
  let otherTracks = [];

  function updateSubtitles() {
    if (!subDisplay || mediaType !== "movie") {
      return;
    }
    subDisplay.innerHTML = "";
    if (activeTrack && activeTrack.activeCues) {
      for (let i = 0; i < activeTrack.activeCues.length; i++) {
        const cue = activeTrack.activeCues[i];
        const line = document.createElement("div");
        line.className = "subtitle-line";
        line.innerHTML = cue.text.replace(/\n/g, "<br>");
        subDisplay.appendChild(line);
      }
    }
  }

  if (
    mediaType === "movie" &&
    movieDataCache &&
    movieDataCache.subtitles &&
    movieDataCache.subtitles.length > 0
  ) {
    ccBtn.style.display = "flex";
    ccOptionsWrapper.innerHTML = "";

    const offOpt = document.createElement("div");
    offOpt.className = "option active";
    offOpt.dataset.trackIndex = "off";
    offOpt.innerHTML = `<span style="font-weight:700; font-size:14px;">Off</span>`;
    offOpt.onclick = () => {
      if (activeTrack) {
        activeTrack.mode = "hidden";
        activeTrack = null;
      }
      updateSubtitles();
      const optionsArr = ccOptionsWrapper.querySelectorAll(".option");
      optionsArr.forEach((o) => {
        o.classList.remove("active");
      });
      offOpt.classList.add("active");
      ccOptionsWrapper.classList.remove("active");
    };
    ccOptionsWrapper.appendChild(offOpt);

    movieDataCache.subtitles.forEach((s, idx) => {
      const trackEl = document.createElement("track");
      trackEl.kind = "captions";
      let trackLabel = s.label || s.language || `Track ${idx + 1}`;
      trackEl.label = trackLabel;
      trackEl.src = s.url;
      trackEl.srclang = s.language || "en";
      trackEl.default = false;
      v.appendChild(trackEl);

      s.displayLabel = trackLabel;
      s.originalIndex = idx;

      if (
        /\b(english|en)\b/i.test(trackLabel) &&
        !/\b(bengali)\b/i.test(trackLabel)
      ) {
        englishTracks.push(s);
      } else {
        otherTracks.push(s);
      }
    });

    const hideAllNativeTracks = () => {
      const tracks = v.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = "hidden";
      }
    };

    v.addEventListener("loadedmetadata", hideAllNativeTracks);

    v.textTracks.addEventListener("addtrack", (e) => {
      e.track.mode = "disabled";
    });
    englishTracks.sort((a, b) => {
      return a.displayLabel.localeCompare(b.displayLabel);
    });
    otherTracks.sort((a, b) => {
      return a.displayLabel.localeCompare(b.displayLabel);
    });

    const createDivider = () => {
      const div = document.createElement("div");
      div.className = "dropdown-divider";
      ccOptionsWrapper.appendChild(div);
    };

    if (englishTracks.length > 0 || otherTracks.length > 0) {
      createDivider();
    }

    englishTracks.forEach((s) => {
      const opt = document.createElement("div");
      opt.className = "option";
      opt.dataset.trackIndex = s.originalIndex;
      opt.innerHTML = `<span style="font-weight:700; font-size:14px;">${s.displayLabel}</span>`;
      opt.onclick = () => {
        if (activeTrack) {
          activeTrack.mode = "hidden";
        }
        activeTrack = Array.from(v.textTracks)[s.originalIndex];
        activeTrack.mode = "hidden";
        updateSubtitles();
        const optionsArr = ccOptionsWrapper.querySelectorAll(".option");
        optionsArr.forEach((o) => {
          o.classList.remove("active");
        });
        opt.classList.add("active");
        ccOptionsWrapper.classList.remove("active");
      };
      ccOptionsWrapper.appendChild(opt);
    });

    if (englishTracks.length > 0 && otherTracks.length > 0) {
      createDivider();
    }

    otherTracks.forEach((s) => {
      const opt = document.createElement("div");
      opt.className = "option";
      opt.dataset.trackIndex = s.originalIndex;
      opt.innerHTML = `<span style="font-weight:700; font-size:14px;">${s.displayLabel}</span>`;
      opt.onclick = () => {
        if (activeTrack) {
          activeTrack.mode = "hidden";
        }
        activeTrack = Array.from(v.textTracks)[s.originalIndex];
        activeTrack.mode = "hidden";
        updateSubtitles();
        const optionsArr = ccOptionsWrapper.querySelectorAll(".option");
        optionsArr.forEach((o) => {
          o.classList.remove("active");
        });
        opt.classList.add("active");
        ccOptionsWrapper.classList.remove("active");
      };
      ccOptionsWrapper.appendChild(opt);
    });
  }

  function formatTime(s) {
    if (isNaN(s) || s <= 0) {
      return "00:00";
    }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${sec
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${m.toString().padStart(2, "0")}:${sec
        .toString()
        .padStart(2, "0")}`;
    }
  }

  function resetIdle() {
    playerContainer.classList.remove("idle");
    clearTimeout(movieIdleTimer);
    movieIdleTimer = setTimeout(() => {
      if (!v.paused) {
        playerContainer.classList.add("idle");
      }
    }, 3000);
  }
  playerContainer.onmousemove = resetIdle;

  function updateBuffer() {
    if (mediaType === "twitch") {
      return;
    }
    if (v.duration > 0 && v.buffered.length > 0) {
      let maxBuf = 0;
      for (let i = 0; i < v.buffered.length; i++) {
        if (
          v.buffered.start(i) <= v.currentTime &&
          v.buffered.end(i) > maxBuf
        ) {
          maxBuf = v.buffered.end(i);
        }
      }
      const bufPct = (maxBuf / v.duration) * 100;
      buffered.style.width = (bufPct || 0) + "%";
    }
  }

  v.onplay = () => {
    playBtn.innerHTML = '<i class="ri-pause-fill"></i>';
    resetIdle();
    clearTimeout(failoverTimer);
    if (mediaType === "twitch" && twitchStartTime === 0) {
      twitchStartTime = Date.now();
    }
  };

  v.onpause = () => {
    playBtn.innerHTML = '<i class="ri-play-fill"></i>';
    playerContainer.classList.remove("idle");
  };

  v.ontimeupdate = () => {
    if (mediaType !== "twitch") {
      let progressVal = (v.currentTime / v.duration) * 100;
      progress.style.width = (progressVal || 0) + "%";
      curTimeTxt.innerText = formatTime(v.currentTime);
      updateBuffer();
    } else {
      let isBehind = false;
      if (v.buffered.length > 0) {
        let latestBuf = v.buffered.end(v.buffered.length - 1);
        if (latestBuf - v.currentTime > 5) {
          isBehind = true;
        }
      }
      if (v.paused || isBehind) {
        if (presentBtn) {
          presentBtn.style.display = "flex";
        }
      } else {
        if (presentBtn) {
          presentBtn.style.display = "none";
        }
      }
    }
    updateSubtitles();
  };

  if (mediaType === "twitch") {
    setInterval(() => {
      if (!v.paused && twitchStartTime > 0) {
        const elapsed = (Date.now() - twitchStartTime) / 1000;
        curTimeTxt.innerText = formatTime(elapsed);
      }
    }, 1000);

    if (presentBtn) {
      presentBtn.onclick = () => {
        if (v.buffered.length > 0) {
          v.currentTime = v.buffered.end(v.buffered.length - 1) - 1;
        } else if (hlsInstance) {
          hlsInstance.startLoad();
          v.currentTime = v.duration || 0;
        }
        v.play();
      };
    }
  }

  v.onloadedmetadata = () => {
    if (mediaType !== "twitch") {
      totTimeTxt.innerText = "/ " + formatTime(v.duration);
    }
  };

  v.onprogress = () => {
    updateBuffer();
  };

  v.onwaiting = () => {
    bufOverlay.style.display = "flex";
  };

  v.onplaying = () => {
    bufOverlay.style.display = "none";
    clearTimeout(failoverTimer);
  };

  v.oncanplay = () => {
    bufOverlay.style.display = "none";
  };

  const togglePlayPause = () => {
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };

  v.onclick = () => {
    togglePlayPause();
  };

  playBtn.onclick = () => {
    togglePlayPause();
  };

  muteBtn.onclick = () => {
    v.muted = !v.muted;
    if (v.muted) {
      muteBtn.innerHTML =
        '<i class="ri-volume-mute-fill" style="opacity:0.4"></i>';
    } else {
      muteBtn.innerHTML = '<i class="ri-volume-up-fill"></i>';
    }
  };

  volSlider.oninput = (e) => {
    v.volume = e.target.value;
    v.muted = false;
  };

  fsBtn.onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerContainer.requestFullscreen();
    }
  };

  if (mediaType !== "twitch") {
    timeline.onmousemove = (e) => {
      const rect = timeline.getBoundingClientRect();
      let pos = (e.pageX - rect.left) / rect.width;
      pos = Math.max(0, Math.min(1, pos));
      hoverBar.style.width = pos * 100 + "%";
      if (v.duration) {
        const hoverTime = pos * v.duration;
        tooltip.innerText = formatTime(hoverTime);
        tooltip.style.left = pos * 100 + "%";
      }
    };

    timeline.onclick = (e) => {
      const rect = timeline.getBoundingClientRect();
      let pos = (e.pageX - rect.left) / rect.width;
      let newTime = Math.max(0, Math.min(1, pos)) * v.duration;
      v.currentTime = newTime;
    };
  }

  if (mediaType === "movie") {
    populateServerWrapper(allSources, source.url);
  }

  loadHlsOrMp4(v, source.url);
  finishLoading();

  if (mediaType === "movie") {
    let currentValidIndex =
      validSources.findIndex((s) => {
        return s.url === source.url;
      }) || 0;

    function startFailoverTimer() {
      clearTimeout(failoverTimer);
      failoverTimer = setTimeout(() => {
        if (autoSwitchActive && (v.currentTime === 0 || v.paused)) {
          currentValidIndex++;
          if (currentValidIndex < validSources.length) {
            const nextSrc = validSources[currentValidIndex];
            loadHlsOrMp4(v, nextSrc.url);
            populateServerWrapper(allSources, nextSrc.url);
            startFailoverTimer();
          }
        }
      }, 30000);
    }
    startFailoverTimer();
  }

  currentPlayerKeydownHandler = (e) => {
    if (!gameOverlay.classList.contains("view-active")) {
      return;
    }
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      return;
    }
    const k = e.key.toLowerCase();
    switch (k) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlayPause();
        break;
      case "arrowleft":
        e.preventDefault();
        if (mediaType !== "twitch") {
          v.currentTime = Math.max(0, v.currentTime - 5);
        }
        break;
      case "arrowright":
        e.preventDefault();
        if (mediaType !== "twitch") {
          v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 5);
        }
        break;
      case "j":
        e.preventDefault();
        if (mediaType !== "twitch") {
          v.currentTime = Math.max(0, v.currentTime - 10);
        }
        break;
      case "l":
        e.preventDefault();
        if (mediaType !== "twitch") {
          v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
        }
        break;
      case "arrowup":
        e.preventDefault();
        v.volume = Math.min(1, v.volume + 0.1);
        volSlider.value = v.volume;
        if (v.volume > 0) {
          v.muted = false;
        }
        break;
      case "arrowdown":
        e.preventDefault();
        v.volume = Math.max(0, v.volume - 0.1);
        volSlider.value = v.volume;
        if (v.volume === 0) {
          v.muted = true;
        }
        break;
      case "c":
        e.preventDefault();
        if (ccBtn.style.display !== "none") {
          if (activeTrack) {
            activeTrack.mode = "hidden";
            activeTrack = null;
            updateSubtitles();
            const opts = ccOptionsWrapper.querySelectorAll(".option");
            opts.forEach((o) => {
              o.classList.remove("active");
            });
            const offOption = ccOptionsWrapper.querySelector(
              '[data-track-index="off"]'
            );
            if (offOption) {
              offOption.classList.add("active");
            }
          } else {
            let trackToEnable = null;
            if (englishTracks && englishTracks.length > 0) {
              trackToEnable = englishTracks[0];
            } else if (otherTracks && otherTracks.length > 0) {
              trackToEnable = otherTracks[0];
            }
            if (trackToEnable) {
              activeTrack = Array.from(v.textTracks)[
                trackToEnable.originalIndex
              ];
              activeTrack.mode = "hidden";
              updateSubtitles();
              const opts = ccOptionsWrapper.querySelectorAll(".option");
              opts.forEach((o) => {
                if (o.dataset.trackIndex == trackToEnable.originalIndex) {
                  o.classList.add("active");
                } else {
                  o.classList.remove("active");
                }
              });
            }
          }
        }
        break;
    }
  };
  document.addEventListener("keydown", currentPlayerKeydownHandler);
}

function loadHlsOrMp4(videoEl, url) {
  if (hlsInstance) {
    hlsInstance.destroy();
  }
  if (url.includes(".m3u8") && Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(videoEl);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(() => {});
    });
  } else {
    videoEl.src = url;
    videoEl.play().catch(() => {});
  }
}

function populateServerWrapper(allSources, activeUrl) {
  serverOptionsWrapper.innerHTML = "";
  const validSources = [];
  const invalidSources = [];

  allSources.forEach((s, i) => {
    s.phoneticName = PHONETIC[i % 26];
    if (s.state === "valid") {
      validSources.push(s);
    } else {
      invalidSources.push(s);
    }
  });

  validSources.forEach((s) => {
    const opt = document.createElement("div");
    opt.className = "option";
    if (activeUrl && s.url === activeUrl) {
      opt.classList.add("active");
    }
    opt.innerHTML = `<span style="font-weight:700; font-size:14px;">${s.phoneticName}</span>`;
    opt.onclick = () => {
      window.disableFailover();
      const videoEl = document.getElementById("movie-video");
      if (videoEl) {
        loadHlsOrMp4(videoEl, s.url);
        populateServerWrapper(allSources, s.url);
      }
      serverOptionsWrapper.classList.remove("active");
    };
    serverOptionsWrapper.appendChild(opt);
  });

  if (validSources.length > 0 && invalidSources.length > 0) {
    const div = document.createElement("div");
    div.className = "dropdown-divider";
    serverOptionsWrapper.appendChild(div);
  }

  invalidSources.forEach((s) => {
    const opt = document.createElement("div");
    opt.className = "option invalid-option";
    if (activeUrl && s.url === activeUrl) {
      opt.classList.add("active");
    }
    opt.innerHTML = `<span style="font-weight:700; font-size:14px;">${s.phoneticName}</span>`;
    opt.onclick = () => {
      window.disableFailover();
      const videoEl = document.getElementById("movie-video");
      if (videoEl) {
        loadHlsOrMp4(videoEl, s.url);
        populateServerWrapper(allSources, s.url);
      }
      serverOptionsWrapper.classList.remove("active");
    };
    serverOptionsWrapper.appendChild(opt);
  });
}

serverBtn.onclick = (e) => {
  e.stopPropagation();
  const isActive = serverOptionsWrapper.classList.contains("active");
  ccOptionsWrapper.classList.remove("active");
  if (isActive) {
    serverOptionsWrapper.classList.remove("active");
  } else {
    serverOptionsWrapper.classList.add("active");
  }
};

ccBtn.onclick = (e) => {
  e.stopPropagation();
  const isActive = ccOptionsWrapper.classList.contains("active");
  serverOptionsWrapper.classList.remove("active");
  if (isActive) {
    ccOptionsWrapper.classList.remove("active");
  } else {
    ccOptionsWrapper.classList.add("active");
  }
};

syncSourceUI();
setupObservers();
updSourceUI();
updFilterDropdownOpt();
fetchData();

document.getElementById("back-btn").addEventListener("click", exitPlayback);
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  if (playerContainer.requestFullscreen) {
    playerContainer.requestFullscreen();
  }
});
