const frame = document.getElementById("frame");

// NAVIGATION
function go(page) {
  frame.src = "pages/" + page;
  document.getElementById("menu").classList.remove("show");
}

function toggleMenu() {
  document.getElementById("menu").classList.toggle("show");
}

// CLOCK
function updateClock() {
  const now = new Date();

  document.getElementById("time").textContent =
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  document.getElementById("date").textContent =
    now.toDateString();
}

setInterval(updateClock, 1000);
updateClock();

// PLACEHOLDERS
function openSettings() {
  alert("Settings coming soon");
}

function login() {
  alert("Login system coming soon");
}
