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

  // --- 2. LOAD GAMES FROM games.json (OPENS IN NEW WINDOW) ---
  const gamesList = document.getElementById("games-list");

  fetch("games.json?v=" + Date.now())
    .then(response => {
      if (!response.ok) {
        throw new Error("Could not load games.json");
      }
      return response.json();
    })
    .then(games => {
      games.forEach(game => {
        const card = document.createElement("div");
        card.className = "game-card";
        card.id = game.id;

        if (game.thumbnail) {
          const img = document.createElement("img");
          img.src = game.thumbnail;
          img.alt = game.title;
          card.appendChild(img);
        }

        const content = document.createElement("div");
        content.className = "game-card-content";

        const title = document.createElement("h3");
        title.textContent = game.title;

        content.appendChild(title);
        card.appendChild(content);

        // Open your hosted game folder in a new window
        card.addEventListener("click", () => {
          window.open(
            game.iframe_url,
            game.id,
            "width=1100,height=700,resizable=yes,scrollbars=yes"
          );
        });

        gamesList.appendChild(card);
      });
    })
    .catch(error => {
      gamesList.innerHTML = "<p>No games found yet. Check your games.json file!</p>";
      console.error(error);
    });
});
