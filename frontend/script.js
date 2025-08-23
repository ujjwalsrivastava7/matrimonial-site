// ================== API BASE URL ==================
const API_BASE_URL = window.location.hostname === "localhost"
  ? "http://localhost:5000"   // Local dev
  : "https://matrimonial-site-backend.onrender.com"; // 🔥 Replace with your actual Render/Vercel backend URL

// ================== AUTH MANAGER ==================
const AuthManager = {
    setAuth(token, userData) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userId', userData._id);
    },

    getAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = localStorage.getItem('userId');
        return { token, user, userId };
    },

    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
    },

    isAuthenticated() {
        const { token, userId } = this.getAuth();
        return !!token && !!userId;
    },

    handleApiError(error) {
        console.error('API Error:', error);
        if (error.message.includes('token') || error.message.includes('401')) {
            this.clearAuth();
            window.location.href = 'login.html';
        }
        throw error;
    }
};

// ================== PROFILE MANAGER ==================
const ProfileManager = {
    async loadProfileData() {
        try {
            const { token, user } = AuthManager.getAuth();
            if (!token || !user?._id) throw new Error('Please login to view profile');

            this.showLoadingState(true);

            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch profile');

            const profileData = await response.json();
            this.displayProfile(profileData);
            return profileData;

        } catch (error) {
            console.error('Profile load error:', error);
            this.showErrorState(error.message);
            AuthManager.handleApiError(error);
        } finally {
            this.showLoadingState(false);
        }
    },

    displayProfile(profileData) {
        const profilePic = document.getElementById('profile-pic');
        if (profileData.profilePhoto) {
            profilePic.src = profileData.profilePhoto.startsWith('http') 
                ? profileData.profilePhoto 
                : `${API_BASE_URL}${profileData.profilePhoto}`;
            profilePic.onerror = () => { profilePic.src = 'default.png'; };
        }

        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            ['firstName','lastName','age','gender','religion','caste','education','occupation','bio']
            .forEach(field => {
                if (profileForm.elements[field]) {
                    profileForm.elements[field].value = profileData[field] || '';
                }
            });
        }

        const prefForm = document.getElementById('preferences-form');
        if (prefForm) {
            const prefs = profileData.preferences || {};
            ['minAge','maxAge','location','preferredReligion']
            .forEach(field => {
                if (prefForm.elements[field]) {
                    prefForm.elements[field].value = prefs[field] || (field==='preferredReligion' ? prefs.preferredReligions?.[0]||'' : '');
                }
            });

            if (prefForm.elements.interests) {
                prefForm.elements.interests.value = Array.isArray(prefs.interests) ? prefs.interests.join(', ') : '';
            }
        }
    },

    async updateProfile(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        try {
            btn.disabled = true; btn.textContent = "Saving...";
            const { token, user } = AuthManager.getAuth();
            if (!token || !user?._id) throw new Error('Please login');

            const formData = Object.fromEntries(new FormData(e.target).entries());
            formData.age = parseInt(formData.age);

            const response = await fetch(`${API_BASE_URL}/api/user/update-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed');

            AuthManager.setAuth(token, { ...user, ...data });
            alert('Profile updated!');
            this.loadProfileData();

        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false; btn.textContent = oldText;
        }
    },

    async updatePreferences(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        try {
            btn.disabled = true; btn.textContent = "Saving...";
            const { token, user } = AuthManager.getAuth();
            if (!token || !user?._id) throw new Error('Please login');

            const prefs = {
                minAge: parseInt(e.target.elements.minAge.value),
                maxAge: parseInt(e.target.elements.maxAge.value),
                interests: e.target.elements.interests.value.split(",").map(i=>i.trim()).filter(Boolean),
                location: e.target.elements.location.value,
                preferredReligions: [e.target.elements.preferredReligion.value]
            };

            const response = await fetch(`${API_BASE_URL}/api/user/update-preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
                body: JSON.stringify(prefs)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed');

            AuthManager.setAuth(token, { ...user, preferences: data });
            alert('Preferences updated!');

        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false; btn.textContent = oldText;
        }
    },

    async uploadPhoto(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        const fileInput = document.getElementById('profile-photo');
        if (!fileInput.files[0]) return alert('Choose file first');

        try {
            btn.disabled = true; btn.textContent = "Uploading...";
            const { token, user } = AuthManager.getAuth();
            if (!token || !user?._id) throw new Error('Please login');

            const formData = new FormData();
            formData.append('profilePhoto', fileInput.files[0]);

            const response = await fetch(`${API_BASE_URL}/api/user/upload-photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed');

            AuthManager.setAuth(token, { ...user, profilePhoto: data.filePath });
            document.getElementById('profile-pic').src = `${API_BASE_URL}${data.filePath}`;
            alert('Photo uploaded!');
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false; btn.textContent = oldText; fileInput.value = '';
        }
    },

    showLoadingState(show) {
        const c = document.getElementById('profile-container');
        if (c) c.style.opacity = show ? 0.5 : 1;
    },
    showErrorState(msg) {
        const d = document.getElementById('profile-error');
        if (d) { d.textContent = msg; d.style.display = msg ? 'block' : 'none'; } else { alert(msg); }
    }
};

// ================== MATCH MANAGER ==================
const MatchManager = {
    async fetchMatches() {
        try {
            const { token, user } = AuthManager.getAuth();
            if (!token || !user?._id) throw new Error('Please login');
            this.showLoading();

            const res = await fetch(`${API_BASE_URL}/api/match/find`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            const matches = await res.json();
            this.displayMatches(matches);

        } catch (err) {
            this.showError(err.message);
            AuthManager.handleApiError(err);
        }
    },

    showLoading() {
        const c = document.getElementById('matchesList');
        if (c) c.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Finding matches...</p></div>`;
    },

    displayMatches(matches) {
        const c = document.getElementById('matchesList');
        if (!c) return;
        if (!matches.length) return c.innerHTML = "<p>No matches found.</p>";
        c.innerHTML = matches.map(u => `
            <div class="match-card">
                <div class="match-photo">
                    <img src="${this.getProfilePhotoUrl(u.profilePhoto)}" alt="${u.firstName}" onerror="this.src='images/default-avatar.png'">
                </div>
                <h3>${u.firstName} ${u.lastName||""}</h3>
                <p>Age: ${u.age}</p>
                <p>Religion: ${u.religion||"N/A"}</p>
                <p>Location: ${u.location||"N/A"}</p>
                <p>Interests: ${u.interests?.join(", ")||"N/A"}</p>
                <a href="chat.html?user=${u._id}" class="chat-button">Chat</a>
            </div>
        `).join('');
    },

    getProfilePhotoUrl(photo) {
        if (!photo) return 'images/default-avatar.png';
        if (photo.startsWith('http')) return photo;
        return `${API_BASE_URL}${photo}`;
    },

    showError(msg) {
        const c = document.getElementById('matchesList');
        if (!c) return;
        c.innerHTML = `<div class="error-state"><h3>${msg}</h3><button onclick="MatchManager.fetchMatches()">Try Again</button></div>`;
    }
};

// ================== SIGNUP & LOGIN ==================
document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = Object.fromEntries(new FormData(e.target).entries());
    user.preferences = { minAge: 18, maxAge: 50, preferredReligions: [user.religion] };

    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.textContent;
    try {
        btn.disabled = true; btn.textContent = "Registering...";
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message||"Failed");
        alert("Registered! Please login."); window.location.href = "login.html";
    } catch (err) { alert(err.message); } 
    finally { btn.disabled = false; btn.textContent = oldText; }
});

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profile.html')) {
        if (!AuthManager.isAuthenticated()) return window.location.href = 'login.html';
        document.getElementById('profile-form')?.addEventListener('submit', (e)=>ProfileManager.updateProfile(e));
        document.getElementById('preferences-form')?.addEventListener('submit', (e)=>ProfileManager.updatePreferences(e));
        document.getElementById('photo-upload-form')?.addEventListener('submit', (e)=>ProfileManager.uploadPhoto(e));
        ProfileManager.loadProfileData();
    }

    if (window.location.pathname.includes('match.html')) {
        if (!AuthManager.isAuthenticated()) return window.location.href = 'login.html';
        MatchManager.fetchMatches();
    }

    if (window.location.pathname.includes('login.html')) {
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email,password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error||'Login failed');
            AuthManager.setAuth(data.token, {_id:data.user._id,firstName:data.user.firstName,email:data.user.email,profilePhoto:data.user.profilePhoto});
            window.location.href = 'profile.html';
        });
    }
});
















































































/*// ================== SESSION MANAGER ==================
const SessionManager = {
    
    init() {
        const sessionId = this.getSessionIdFromURL();

        if (sessionId) {
            this.currentSessionId = sessionId;
        } else if (window.location.pathname.includes("profile.html") ||
                   window.location.pathname.includes("match.html") ||
                   window.location.pathname.includes("chat.html")) {
            window.location.href = "login.html";
        }
    },

    getSessionIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get("session");
    },

    createNewSession(token, userId) {
        const sessionId = "session_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(sessionId, JSON.stringify({ token, userId }));
        return sessionId;
    },

    getSessionData(sessionId) {
        const data = localStorage.getItem(sessionId);
        return data ? JSON.parse(data) : null;
    },

    getCurrentSessionData() {
        if (!this.currentSessionId) return null;
        return this.getSessionData(this.currentSessionId);
    },

    clearSession(sessionId) {
        localStorage.removeItem(sessionId);
    }
};

// Initialize session
SessionManager.init();

// ================== SIGN UP ==================
document.getElementById("signupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        bio: document.getElementById("bio").value,
        religion: document.getElementById("religion").value,
        caste: document.getElementById("caste").value,
        education: document.getElementById("education").value,
        occupation: document.getElementById("occupation").value
    };

    try {
        const res = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...user,
                preferences: {
                    minAge: 18,
                    maxAge: 50,
                    preferredReligions: [user.religion]
                }
            }),
        });

        if (res.ok) {
            alert("Registration successful! Please login.");
            window.location.href = "login.html";
        } else {
            const errorData = await res.json();
            throw new Error(errorData.message || "Error registering user");
        }
    } catch (error) {
        console.error("Registration error:", error);
        alert(error.message);
    }
});

// ================== LOGIN ==================
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
    };

    try {
        const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
        });

        const data = await res.json();
        if (res.ok) {
            const sessionId = SessionManager.createNewSession(data.token, data.user._id);
            window.location.href = `profile.html?session=${sessionId}`;
        } else {
            throw new Error(data.message || "Invalid credentials");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert(error.message || "Something went wrong");
    }
});

// ================== PROFILE MANAGEMENT ==================
document.addEventListener("DOMContentLoaded", async () => {
    const session = SessionManager.getCurrentSessionData();
    if (!session && !window.location.pathname.endsWith("login.html")) {
        window.location.href = "login.html";
        return;
    }

    if (document.getElementById("profile-form")) {
        try {
            await loadProfileData(session.token);
        } catch (error) {
            console.error("Error loading profile:", error);
            alert(error.message || "An error occurred while loading your profile");
            window.location.href = "login.html";
        }
    }
});

async function loadProfileData(token) {
    const response = await fetch("http://localhost:5000/api/user/profile", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const user = await response.json();
    if (!response.ok) throw new Error(user.message || "Failed to fetch profile");

    const fields = ["firstName", "lastName", "age", "gender", "bio", "religion", "caste", "education", "occupation"];
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) input.value = user[field] || "";
    });

    const pref = user.preferences || {};
    if (document.getElementById("minAge")) document.getElementById("minAge").value = pref.minAge || "";
    if (document.getElementById("maxAge")) document.getElementById("maxAge").value = pref.maxAge || "";
    if (document.getElementById("location")) document.getElementById("location").value = pref.location || "";
    if (document.getElementById("preferredReligion")) document.getElementById("preferredReligion").value = pref.preferredReligions?.[0] || "";
    if (document.getElementById("interests")) document.getElementById("interests").value = (pref.interests || []).join(", ");

    if (user.profilePhoto && document.getElementById("profile-pic")) {
        document.getElementById("profile-pic").src = `http://localhost:5000${user.profilePhoto}`;
    }

    return user;
}

// ================== UPDATE PROFILE ==================
document.getElementById("profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const session = SessionManager.getCurrentSessionData();
    if (!session) return alert("User not authenticated");

    const profileData = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        age: document.getElementById("age").value,
        bio: document.getElementById("bio").value,
        religion: document.getElementById("religion").value,
        caste: document.getElementById("caste").value,
        education: document.getElementById("education").value,
        occupation: document.getElementById("occupation").value,
        minAge: document.getElementById("minAge").value,
        maxAge: document.getElementById("maxAge").value,
        interests: document.getElementById("interests").value.split(",").map(i => i.trim()),
        location: document.getElementById("location").value
    };

    try {
        const response = await fetch("http://localhost:5000/api/user/update-profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.token}`
            },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();
        if (response.ok) {
            alert("Profile updated successfully!");
            await loadProfileData(session.token);
        } else {
            throw new Error(data.message || "Error updating profile");
        }
    } catch (error) {
        console.error("Update profile error:", error);
        alert(error.message);
    }
});

// ================== UPDATE PREFERENCES ==================
document.getElementById("preferences-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Updating...";

    const session = SessionManager.getCurrentSessionData();
    if (!session) return window.location.href = "login.html";

    const interestsArray = document.getElementById("interests").value.split(",").map(i => i.trim()).filter(Boolean);

    const preferencesData = {
        minAge: document.getElementById("minAge").value,
        maxAge: document.getElementById("maxAge").value,
        interests: interestsArray,
        location: document.getElementById("location").value,
        preferredReligions: [document.getElementById("preferredReligion").value]
    };

    try {
        const response = await fetch("http://localhost:5000/api/user/update-preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.token}`
            },
            body: JSON.stringify(preferencesData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to update preferences");

        alert("Preferences updated successfully!");
        await loadProfileData(session.token);
    } catch (error) {
        console.error("Update preferences error:", error);
        alert(`Error: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// ================== UPLOAD PHOTO ==================
document.getElementById("photo-upload-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("profile-photo").files[0];
    if (!file) return alert("Select a file!");

    const session = SessionManager.getCurrentSessionData();
    if (!session) return;

    const formData = new FormData();
    formData.append("profilePhoto", file);

    try {
        const res = await fetch("http://localhost:5000/api/user/upload-photo", {
            method: "POST",
            headers: { "Authorization": `Bearer ${session.token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("profile-pic").src = `http://localhost:5000${data.filePath}`;
            alert("Profile photo updated!");
        } else {
            throw new Error(data.message || "Error uploading photo");
        }
    } catch (error) {
        console.error("Upload photo error:", error);
        alert(error.message);
    }
});


*/



































/*// ================== SIGN UP ==================
document.getElementById("signupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        bio: document.getElementById("bio").value
    };

    const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });

    if (res.ok) {
        alert("Registration successful! Please login.");
        window.location.href = "login.html";
    } else {
        alert("Error registering user.");
    }
});

// ================== LOGIN ==================
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
    };
try{
    const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user._id);
        window.location.href = "profile.html";
    } else {
        alert("Invalid credentials");
    }
}catch(error){
    console.error("Login error:",error);
    alert("something went wrong ");
}
});

// ================== PROFILE MANAGEMENT ==================
// ================== PROFILE MANAGEMENT ==================
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

      // If there is no token and the current page is NOT the login page, redirect to login
      if (!token && !window.location.pathname.endsWith("login.html")) {
        window.location.href = "login.html";
        return;
    }

    // Only execute profile-related code on profile page
    if (document.getElementById("profile-form")) {
        try {
            const response = await fetch("http://localhost:5000/api/user/profile", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const user = await response.json();
            if (!response.ok) {
                alert("Failed to fetch profile. Please log in again.");
                window.location.href = "login.html";
                return;
            }

            // ✅ Check if elements exist before updating them
            if (document.getElementById("name")) document.getElementById("name").value = user.name || "";
            if (document.getElementById("age")) document.getElementById("age").value = user.age || "";
            if (document.getElementById("bio")) document.getElementById("bio").value = user.bio || "";
            if (document.getElementById("minAge")) document.getElementById("minAge").value = user.minAge || "";
            if (document.getElementById("maxAge")) document.getElementById("maxAge").value = user.maxAge || "";
            if (document.getElementById("interests")) document.getElementById("interests").value = user.interests ? user.interests.join(", ") : "";
            if (document.getElementById("location")) document.getElementById("location").value = user.location || "";

            if (user.profilePhoto && document.getElementById("profile-pic")) {
                document.getElementById("profile-pic").src = `http://localhost:5000${user.profilePhoto}`;
            }

        } catch (error) {
            console.error("Error loading profile:", error);
            alert("An error occurred while loading your profile.");
        }
    }
});

// Update Profile & Preferences
document.getElementById("profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) return alert("User not authenticated");

    const profileData = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        bio: document.getElementById("bio").value,
        minAge: document.getElementById("minAge").value,
        maxAge: document.getElementById("maxAge").value,
        interests: document.getElementById("interests").value, 
        location: document.getElementById("location").value
    };

    const response = await fetch("http://localhost:5000/api/user/update-profile", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
    });

    const data = await response.json();
    if (response.ok) {
        alert("Profile updated successfully!");
    } else {
        alert(data.error || "Error updating profile.");
    }
});


// ================== UPDATE PREFERENCES ==================
// ================== UPDATE PREFERENCES ==================
document.getElementById("preferences-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent form refresh

    console.log("Update Preferences button clicked"); // Debugging

    const token = localStorage.getItem("token");
    if (!token) {
        alert("User not authenticated");
        return;
    }

    const preferencesData = {
        minAge: document.getElementById("minAge").value,
        maxAge: document.getElementById("maxAge").value,
        interests: document.getElementById("interests").value.split(",").map(i => i.trim()), // Convert to array
        location: document.getElementById("location").value
    };

    console.log("Sending Preferences Data:", preferencesData); // Debugging

    try {
        const response = await fetch("http://localhost:5000/api/user/update-preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(preferencesData)
        });

        const data = await response.json();
        console.log("Response from server:", data); // Debugging

        if (response.ok) {
            alert("Preferences updated successfully!");
        } else {
            alert(data.error || "Error updating preferences.");
        }
    } catch (error) {
        console.error("Error updating preferences:", error);
        alert("Failed to update preferences. Please check the console.");
    }
});


// Upload Profile Picture
document.getElementById("photo-upload-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("profile-photo").files[0];
    if (!fileInput) return alert("Select a file!");

    const formData = new FormData();
    formData.append("profilePhoto", fileInput);

    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/user/upload-photo", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
    });

    const data = await response.json();
    if (response.ok) {
        document.getElementById("profile-pic").src = `http://localhost:5000${data.filePath}`;
        alert("Profile photo updated!");
    }
});


// ================== MATCHMAKING ==================
async function fetchMatches() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/match/find", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const matches = await res.json();

    if (!res.ok) {
        alert("Error fetching matches. Please try again.");
        return;
    }

    // Populate matches as cards
    document.getElementById("matchesList").innerHTML = matches.map(user => `
        <div class="match-card">
            <img src="${user.profilePhoto ? `http://localhost:5000${user.profilePhoto}` : 'default.jpg'}" alt="Profile Photo" class="match-photo">
            <h3>${user.name}, ${user.age}</h3>
            <p>${user.bio}</p>
            <p><strong>Interests:</strong> ${user.interests ? user.interests.join(", ") : "N/A"}</p>
            <p><strong>Location:</strong> ${user.location || "Not specified"}</p>
        </div>
    `).join('');
}

// Fetch matches when match.html loads
if (document.getElementById("matchesList")) {
    fetchMatches();
}

// Add Back to Profile Button
document.getElementById("backToProfile")?.addEventListener("click", () => {
    window.location.href = "profile.html";
});

*/














































































































/*


// ================== SIGN UP ==================
document.getElementById("signupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        bio: document.getElementById("bio").value
    };

    const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });

    if (res.ok) {
        alert("Registration successful! Please login.");
        window.location.href = "login.html";
    } else {
        alert("Error registering user.");
    }
});

// ================== LOGIN ==================
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
    };

    const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user._id);
        window.location.href = "profile.html";
    } else {
        alert("Invalid credentials");
    }
});

// ================== PROFILE MANAGEMENT ==================
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "login.html";

    // Fetch User Profile
    fetch("http://localhost:5000/api/user/profile", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        document.getElementById("name").value = user.name || "";
        document.getElementById("age").value = user.age || "";
        document.getElementById("bio").value = user.bio || "";
        document.getElementById("minAge").value = user.minAge || "";
        document.getElementById("maxAge").value = user.maxAge || "";
        document.getElementById("interests").value = user.interests ? user.interests.join(", ") : "";
        document.getElementById("location").value = user.location || "";

        if (user.profilePhoto) {
            document.getElementById("profile-pic").src = `http://localhost:5000${user.profilePhoto}`;
        }
    });

    // Update Profile
    document.getElementById("profile-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
    
        const token = localStorage.getItem("token");
        if (!token) return alert("User not authenticated");
    
        const profileData = {
            name: document.getElementById("name").value,
            age: document.getElementById("age").value,
            bio: document.getElementById("bio").value,
            minAge: document.getElementById("minAge").value,
            maxAge: document.getElementById("maxAge").value,
            interests: document.getElementById("interests").value, // Comma-separated values
            location: document.getElementById("location").value
        };
    
        const response = await fetch("http://localhost:5000/api/user/update-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
    
        const data = await response.json();
        if (response.ok) {
            alert("Profile updated successfully!");
        } else {
            alert(data.error || "Error updating profile.");
        }
    });
    
    

    // Upload Profile Picture
    document.getElementById("photo-upload-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById("profile-photo").files[0];
        if (!fileInput) return alert("Select a file!");

        const formData = new FormData();
        formData.append("profilePhoto", fileInput);

        fetch("http://localhost:5000/api/user/upload-photo", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById("profile-pic").src = `http://localhost:5000${data.filePath}`;
            alert("Profile photo updated!");
        });
    });
});

// ================== MATCHMAKING ==================
async function fetchMatches() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/match/find", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });

    const matches = await res.json();
    document.getElementById("matchesList").innerHTML = matches.map(user => `
        <p>${user.name}, ${user.age} - ${user.bio} <a href="chat.html?receiverId=${user._id}">Chat</a></p>
    `).join('');
}

// ================== CHAT FUNCTIONALITY ==================
async function fetchMessages() {
    const userId = localStorage.getItem("userId");
    const receiverId = new URLSearchParams(window.location.search).get("receiverId");

    const res = await fetch(`http://localhost:5000/api/chat/messages?senderId=${userId}&receiverId=${receiverId}`);
    const messages = await res.json();
    
    document.getElementById("chatWindow").innerHTML = messages.map(msg => `
        <p><strong>${msg.senderId === userId ? "You" : "Them"}:</strong> ${msg.message}</p>
    `).join('');
}

async function sendMessage() {
    const userId = localStorage.getItem("userId");
    const receiverId = new URLSearchParams(window.location.search).get("receiverId");
    const message = document.getElementById("chatMessage").value;
    
    await fetch("http://localhost:5000/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: userId, receiverId, message })
    });

    document.getElementById("chatMessage").value = "";
    fetchMessages();
}

setInterval(fetchMessages, 2000);


*/


/*// Sign Up
document.getElementById('signupForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        bio: document.getElementById('bio').value
    };
    
    const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });

    if (res.ok) {
        alert('Registration successful! Please login.');
        window.location.href = 'login.html';
    } else {
        alert('Error registering user.');
    }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    
    const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user._id);
        window.location.href = 'profile.html';
    } else {
        alert('Invalid credentials');
    }
});

// Fetch Matches
async function fetchMatches() {
    const userId = localStorage.getItem('userId');
    const res = await fetch(`http://localhost:5000/api/auth/matches?userId=${userId}`);
    const matches = await res.json();
    document.getElementById('matchesList').innerHTML = matches.map(user => `
        <p>${user.name}, ${user.age} - ${user.bio} <a href="chat.html?receiverId=${user._id}">Chat</a></p>
    `).join('');
}

// Chat Functionality
async function fetchMessages() {
    const userId = localStorage.getItem('userId');
    const receiverId = new URLSearchParams(window.location.search).get('receiverId');
    const res = await fetch(`http://localhost:5000/api/chat/messages?senderId=${userId}&receiverId=${receiverId}`);
    const messages = await res.json();
    document.getElementById('chatWindow').innerHTML = messages.map(msg => `<p><strong>${msg.senderId === userId ? 'You' : 'Them'}:</strong> ${msg.message}</p>`).join('');
}

async function sendMessage() {
    const userId = localStorage.getItem('userId');
    const receiverId = new URLSearchParams(window.location.search).get('receiverId');
    const message = document.getElementById('chatMessage').value;
    
    await fetch('http://localhost:5000/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, receiverId, message })
    });

    document.getElementById('chatMessage').value = '';
    fetchMessages();
}

setInterval(fetchMessages, 2000);



// profile     photuuuno


document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) window.location.href = "login.html";

    fetch("http://localhost:5000/api/user/profile", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        document.getElementById("name").value = user.name;
        document.getElementById("age").value = user.age;
        document.getElementById("bio").value = user.bio;
        if (user.profilePhoto) {
            document.getElementById("profile-pic").src = `http://localhost:5000${user.profilePhoto}`;
        }
    });

    document.getElementById("photo-upload-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById("profile-photo").files[0];
        if (!fileInput) return alert("Select a file!");

        const formData = new FormData();
        formData.append("profilePhoto", fileInput);

        fetch("http://localhost:5000/api/user/upload-photo", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById("profile-pic").src = `http://localhost:5000${data.filePath}`;
        });
    });

 // chat button changes

  document.getElementById("user-name").textContent = localStorage.getItem("name");

  // Redirect to chat page when the button is clicked
  document.getElementById("chat-button").addEventListener("click", () => {
      window.location.href = "chat.html";
  });


});

*/
 
/*   INDEX .HTML

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h2>Welcome to Matrimonial Website</h2>
    <a href="signup.html">Sign Up</a> | <a href="login.html">Login</a>
</body>
</html>
*/