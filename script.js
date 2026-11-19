window.addEventListener("DOMContentLoaded", () => {
  // --- 1. TROPHY & W INTRO ANIMATION ---
  const trophyWrapper = document.getElementById("trophy-wrapper");
  const cracks = document.getElementById("cracks");
  const smackW = document.getElementById("smack-w");

  setTimeout(() => {
    trophyWrapper.classList.add("drop");
  }, 200);

  setTimeout(() => {
    cracks.classList.add("broken");
    document.body.classList.add("shake");
  }, 700);

  setTimeout(() => {
    document.body.classList.remove("shake");
  }, 1100);

  setTimeout(() => {
    smackW.classList.add("smack");
    document.body.classList.add("shake");
  }, 1300);

  setTimeout(() => {
    document.body.classList.remove("shake");
  }, 1700);

  // --- 2. LOAD GAME LINKS FROM games.json ---
  const gamesList = document.getElementById("games-list");

  fetch("games.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Could not load games.json");
      }
      return response.json();
    })
    .then(games => {
      games.forEach(game => {
        const card = document.createElement("a");
        card.className = "game-card";
        card.href = game.url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        // Add image if provided in games.json
        if (game.image) {
          const img = document.createElement("img");
          img.src = game.image;
          img.alt = game.title;
          card.appendChild(img);
        }

        const content = document.createElement("div");
        content.className = "game-card-content";

        const title = document.createElement("h3");
        title.textContent = game.title;

        const desc = document.createElement("p");
        desc.textContent = game.description;

        content.appendChild(title);
        content.appendChild(desc);
        card.appendChild(content);
        gamesList.appendChild(card);
      });
    })
    .catch(error => {
      gamesList.innerHTML = "<p>No games found yet. Check your games.json file!</p>";
      console.error(error);
    });
});

