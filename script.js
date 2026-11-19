window.addEventListener("DOMContentLoaded", () => {
  const trophyWrapper = document.getElementById("trophy-wrapper");
  const cracks = document.getElementById("cracks");
  const smackW = document.getElementById("smack-w");

  // 1. Start the trophy drop shortly after load
  setTimeout(() => {
    trophyWrapper.classList.add("drop");
  }, 200);

  // 2. When trophy hits the ground (500ms later): break ground & shake screen
  setTimeout(() => {
    cracks.classList.add("broken");
    document.body.classList.add("shake");
  }, 700);

  // Clean up first shake so it can shake again when W hits
  setTimeout(() => {
    document.body.classList.remove("shake");
  }, 1100);

  // 3. Smack the W onto the front of the trophy & shake again
  setTimeout(() => {
    smackW.classList.add("smack");
    document.body.classList.add("shake");
  }, 1300);

  // Clean up second shake
  setTimeout(() => {
    document.body.classList.remove("shake");
  }, 1700);
});

