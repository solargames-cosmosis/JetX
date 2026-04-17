document.addEventListener("DOMContentLoaded", () => {

  // ===== CREATE STYLE =====
  const style = document.createElement("style");
  style.innerHTML = `
    .jetx-logo {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 60px;
      font-weight: bold;
      background: linear-gradient(90deg, white, #6d28d9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 20px rgba(109,40,217,0.6);
      cursor: pointer;
      z-index: 9999;
    }

    .jetx-fullscreen {
      position: fixed;
      top: 15px;
      left: 15px;
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
      transition: 0.2s ease;
    }

    .jetx-fullscreen:hover {
      transform: scale(1.05);
      box-shadow: 0 0 25px rgba(109,40,217,0.9);
    }
  `;
  document.head.appendChild(style);

  // ===== LOGO =====
  const logo = document.createElement("div");
  logo.innerText = "JetX";
  logo.className = "jetx-logo";

  logo.onclick = () => {
    window.location.href = "/index.html"; // change if needed
  };

  document.body.appendChild(logo);

  // ===== FULLSCREEN BUTTON =====
  const btn = document.createElement("button");
  btn.innerText = "⛶";
  btn.className = "jetx-fullscreen";

  btn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  document.body.appendChild(btn);

});
