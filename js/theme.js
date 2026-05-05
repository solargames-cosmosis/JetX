(function () {
  const THEME_KEY = "current_theme";
  const FONT_KEY = "current_font";
  const CUSTOM_CONFIG_KEY = "custom_theme_config";
  const DEFAULT_THEME = "vapor";

  // ===== APPLY THEME =====
  window.applyVtheme = () => {
    return new Promise((resolve) => {
      const theme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
      const root = document.documentElement;

      const vars = [
        "--bg","--secondary-bg","--third-bg","--fourth-bg",
        "--primary","--secondary","--text-color","--secondary-text-color",
        "--button-bg","--button-hover","--gradient-start","--gradient-end",
        "--accent","--cb","--bc"
      ];

      const finalize = () => {
        window.dispatchEvent(new CustomEvent("vthemechanged"));
        resolve();
      };

      if (theme === "custom") {
        const customConfig = JSON.parse(localStorage.getItem(CUSTOM_CONFIG_KEY) || "{}");
        vars.forEach((v) => {
          if (customConfig[v]) root.style.setProperty(v, customConfig[v]);
        });
        root.setAttribute("data-theme", "custom");
        finalize();
        return;
      }

      // reset vars
      vars.forEach((v) => root.style.removeProperty(v));

      const isAlt = localStorage.getItem("is_alt_theme") === "true";
      const themePath = `/style/${isAlt ? "alt-theme" : "theme"}/${theme}.css`;

      root.setAttribute("data-theme", theme);

      let themeLink = document.getElementById("theme-link");

      if (!themeLink) {
        themeLink = document.createElement("link");
        themeLink.id = "theme-link";
        themeLink.rel = "stylesheet";
        document.head.appendChild(themeLink);
      }

      const timeout = setTimeout(finalize, 300);
      themeLink.onload = finalize;
      themeLink.onerror = finalize;

      themeLink.href = themePath;
    });
  };

  // ===== APPLY FONT =====
  window.applyVfont = () => {
    const fontName = localStorage.getItem(FONT_KEY);

    let styleEl = document.getElementById("dynamic-font-style");

    if (!fontName || fontName.trim() === "" || fontName.toLowerCase() === "default") {
      if (styleEl) styleEl.remove();
      return;
    }

    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g,"+")}:wght@400;700&display=swap`;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-font-style";
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @import url('${fontUrl}');
      * { font-family: '${fontName}', sans-serif !important; }
    `;
  };

  // ===== INIT =====
  applyVtheme();
  applyVfont();

  // ===== LISTEN FOR CHANGES =====
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_KEY || e.key === CUSTOM_CONFIG_KEY) applyVtheme();
    if (e.key === FONT_KEY) applyVfont();
  });

})();
