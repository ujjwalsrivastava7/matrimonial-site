
console.log("Token in localStorage:", localStorage.getItem("token"));
console.log("User ID in localStorage:", localStorage.getItem("userId"));

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const urlParams = new URLSearchParams(window.location.search);
    const receiverId = urlParams.get("user");
    const userId = localStorage.getItem("userId");

    console.log("Receiver ID from URL:", receiverId);

    if (!token) {
        alert("Invalid access. Please log in.");
        window.location.href = "login.html";
    }
    const socket = io("http://localhost:5000"); // Ensure this URL matches your backend
 // Fetch older messages
    try {
        const response = await fetch(`http://localhost:5000/api/chat/history/${receiverId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            // Display older messages
            data.messages.forEach(msg => {
                const sender = msg.senderId === userId ? "You" : "User";
                displayMessage(sender, msg.message);
            });
        } else {
            throw new Error(data.error || "Failed to fetch chat history");
        }
    } catch (error) {
        console.error("Error fetching chat history:", error);
        alert("Error loading chat history.");
    }





    socket.emit("joinRoom", {
        senderId: localStorage.getItem("userId"),
        receiverId
    });



    const messagesContainer = document.getElementById("messages");
    console.log("Messages container:", messagesContainer); // Debugging




    document.getElementById("send-button").addEventListener("click", async () => {
        const messageInput = document.getElementById("message-input");
        const message = messageInput.value.trim();
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("No token found in localStorage");
            alert("You are not logged in. Redirecting to login.");
            window.location.href = "login.html";
            return;
        }
    
        console.log("Sending request with token:", token); // Debugging

        if (message === "") return;

        try {
            const response = await fetch("http://localhost:5000/api/chat/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    senderId: localStorage.getItem("userId"),
                    receiverId,
                    message
                })
            });

            const data = await response.json();

            console.log("Response:", data); // Log full response

            if (!response.ok) {
                throw new Error(data.error || "Message not sent!");
            }

            // Emit message through WebSocket
            socket.emit("sendMessage", {
                senderId: localStorage.getItem("userId"),
                receiverId,
                message
            });

            // Display message in chat UI
            displayMessage("You", message);

            messageInput.value = "";
        } catch (error) {
            console.log('Error sending message:', error);
            alert("Error sending message!");
        }
    });


    socket.on("receiveMessage", ({ senderId, message }) => {
        
        displayMessage("User", message);
    });
   
    function displayMessage(sender, message) {

        const messagesContainer = document.getElementById("messages");


        if (!messagesContainer) {
            console.error("Messages container not found!");
            return;
        }


        // const messagesContainer = document.getElementById("messages");
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message");
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        messagesContainer.appendChild(msgDiv);
    }
});












// ================== AUTH MANAGER ==================
const AuthManager = {
    // Store authentication data
    setAuth(token, userData) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
    },

    // Get current auth
    getAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return { token, user };
    },

    // Clear auth
    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Check if authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Handle API errors
    handleApiError(error) {
        console.error('API Error:', error);
        if (error.message.includes('token') || error.message.includes('401')) {
            this.clearAuth();
            window.location.href = 'login.html';
        }
        throw error;
    }
};

// ================== MATCH MANAGER ==================
const MatchManager = {
    async fetchMatches() {
        try {
            const { token, user } = AuthManager.getAuth();
            
            if (!token || !user?._id) {
                throw new Error('Please login to view matches');
            }

            // Show loading state
            this.showLoading();

            const response = await fetch(`http://localhost:5000/api/matches`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch matches');
            }

            const matches = await response.json();
            this.displayMatches(matches);

        } catch (error) {
            this.showError(error.message);
            AuthManager.handleApiError(error);
        }
    },

    showLoading() {
        const container = document.getElementById('matchesList');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Finding your perfect matches...</p>
                </div>
            `;
        }
    },

    displayMatches(matches) {
        const container = document.getElementById('matchesList');
        if (!container) return;

        if (!matches || matches.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <img src="images/no-matches.svg" alt="No matches">
                    <h3>No matches found</h3>
                    <p>Try adjusting your search preferences</p>
                    <a href="profile.html" class="btn">Edit Preferences</a>
                </div>
            `;
            return;
        }

        container.innerHTML = matches.map(match => `
            <div class="match-card">
                <div class="match-photo">
                    <img src="${match.profilePhoto || 'images/default-avatar.png'}" 
                         alt="${match.firstName}" 
                         onerror="this.src='images/default-avatar.png'">
                </div>
                <div class="match-details">
                    <h3>${match.firstName} ${match.lastName}, ${match.age}</h3>
                    <p class="location">${match.location || 'Location not specified'}</p>
                    ${match.interests?.length ? `
                        <div class="interests">
                            ${match.interests.slice(0, 3).map(interest => `
                                <span class="interest-tag">${interest}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <button class="chat-btn" data-userid="${match._id}">
                        Start Chat
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to all chat buttons
        container.querySelectorAll('.chat-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.dataset.userid;
                if (userId) {
                    window.location.href = `chat.html?matchId=${userId}`;
                }
            });
        });
    },

    showError(message) {
        const container = document.getElementById('matchesList');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <img src="images/error.svg" alt="Error">
                <h3>${message}</h3>
                <button onclick="MatchManager.fetchMatches()" class="btn">Try Again</button>
                <a href="login.html" class="text-link">Or login again</a>
            </div>
        `;
    }
};

// ================== INITIALIZATION ==================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize for match page
    if (window.location.pathname.includes('match.html')) {
        if (!AuthManager.isAuthenticated()) {
            window.location.href = 'login.html';
        } else {
            MatchManager.fetchMatches();
        }
    }

    // Initialize for login page
    if (window.location.pathname.includes('login.html')) {
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Login failed');

                AuthManager.setAuth(data.token, data.user);
                window.location.href = 'profile.html';
            } catch (error) {
                alert(error.message || 'Login error');
            }
        });
    }
});