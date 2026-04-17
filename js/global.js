document.addEventListener("DOMContentLoaded", () => {

  // Create button
  const btn = document.createElement("button");
  btn.innerText = "⛶ Fullscreen";
  btn.className = "jetx-fullscreen";

  // Style it (JetX theme)
  const style = document.createElement("style");
  style.innerHTML = `
    .jetx-fullscreen {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 9999;
      padding: 10px 18px;
      font-weight: bold;
      color: white;
      background: linear-gradient(90deg, white, #6d28d9);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      text-shadow: 0 0 10px rgba(109,40,217,0.6);
      box-shadow: 0 0 15px rgba(109,40,217,0.6);
    }
  `;

  document.head.appendChild(style);

  // Fullscreen logic
  btn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  document.body.appendChild(btn);
});
