document.addEventListener("DOMContentLoaded", async () => {
  const matchesList = document.getElementById("matchesList");
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in to view matches.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/match/find', {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to fetch matches");

    const matches = await response.json();

    if (matches.length === 0) {
      matchesList.innerHTML = "<p>No matches found based on your preferences.</p>";
      return;
    }

    matchesList.innerHTML = "";

    matches.forEach((user) => {
      const card = document.createElement("div");
      card.className = "match-card";

      card.innerHTML = `
        <img src="${user.profilePhoto || 'default.png'}" alt="${user.firstName}'s photo" class="match-photo" />
        <h3>${user.firstName} ${user.lastName || ""}</h3>
        <p>Age: ${user.age}</p>
        <p>Religion: ${user.religion || "Not specified"}</p>
        <p>Location: ${user.location || "Not specified"}</p>
        <p>Interests: ${user.interests?.join(", ") || "Not specified"}</p>
        <a href="chat.html?user=${user._id}" class="chat-button">Chat</a>
      `;

      matchesList.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading matches:", error);
    matchesList.innerHTML = "<p>Error loading matches. Please try again.</p>";
  }
});
