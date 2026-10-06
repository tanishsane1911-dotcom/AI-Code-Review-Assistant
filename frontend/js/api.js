const API_BASE_URL = (() => {
    if (typeof window !== "undefined" && window.location && window.location.origin) {
        return `${window.location.origin}/api`;
    }
    return "http://localhost:5500/api";
})();

async function apiRequest(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = localStorage.getItem("authToken");

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch {
        throw new Error("Unable to reach the server. Make sure the backend is running and try again.");
    }
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || payload.message || "Request failed");
    }

    return payload;
}

async function fetchPastReports() {
    return apiRequest("/reviews");
}

function saveSession(session) {
    if (!session) {
        return null;
    }

    if (session.token) {
        localStorage.setItem("authToken", session.token);
    }

    if (session.user) {
        localStorage.setItem("loggedInUser", JSON.stringify(session.user));
    }

    return session;
}
