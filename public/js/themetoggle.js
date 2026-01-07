// Get system preference
function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply theme to the document
function applyTheme(mode) {
    if (mode === "dark") {
        document.getElementById("darkModeStyle").disabled = false;
        document.getElementById("dark-mode-toggle").innerHTML = "<i data-feather=\"sun\"></i>";
    } else {
        document.getElementById("darkModeStyle").disabled = true;
        document.getElementById("dark-mode-toggle").innerHTML = "<i data-feather=\"moon\"></i>";
    }
    feather.replace();
    document.documentElement.setAttribute('data-theme', mode);
}

// Get current theme (user preference or system default)
function getCurrentTheme() {
    const saved = localStorage.getItem("theme-storage");
    return saved || getSystemTheme();
}

// Toggle between light and dark
function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === "light" ? "dark" : "light";
    localStorage.setItem("theme-storage", newTheme);
    applyTheme(newTheme);
}

// Initialize theme on page load
const initialTheme = getCurrentTheme();
applyTheme(initialTheme);
