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


// MENU
function toggleMenu() {
  document.getElementById("side-menu").classList.toggle("hidden");
}

// VERSION POPUP
function showUpdates() {
  alert("JetX v1.0\n\n- Initial release\n- Jet animation\n- UI layout system");
}

// SETTINGS / LOGIN (placeholders)
function openSettings() {
  alert("Settings coming soon");
}

function login() {
  alert("Login system coming soon");
}
