const stories = [
  {
    id: "cafeteria-launch",
    title: "Cafeteria Rocket Launch",
    fields: [
      ["properNoun", "Proper noun", "A name, like Max or Jupiter"],
      ["adjective", "Adjective", "A describing word, like slimy"],
      ["noun", "Noun", "A person, place, or thing"],
      ["animal", "Animal", "Any animal"],
      ["color", "Color", "Any color"],
      ["actionVerb", "Action verb", "Like burp, sprint, or launch"],
      ["ingWord", "Word ending in ing", "Like dancing or zooming"],
      ["food", "Food", "Something tasty"],
      ["sound", "Silly sound", "Like splat, boing, or kaboom"]
    ],
    text: ({ properNoun, adjective, noun, animal, color, actionVerb, ingWord, food, sound }) =>
      `${properNoun} was trying to eat lunch when a ${adjective} ${noun} started beeping under the cafeteria table. The school ${animal} pressed a ${color} button, yelled "${sound}," and accidentally turned the lunch tray into a rocket. Everyone had to ${actionVerb} across the room while ${food} floated through the air like tiny asteroids. By the time the principal arrived, the whole class was ${ingWord} on the ceiling and asking if space lunch counted as extra credit.`
  },
  {
    id: "backyard-boss-battle",
    title: "Backyard Boss Battle",
    fields: [
      ["properNoun", "Proper noun", "A name, like Sam or Captain Nacho"],
      ["animal", "Animal", "Any animal"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["actionVerb", "Action verb", "Like spin, race, or wiggle"],
      ["color", "Color", "Any color"],
      ["grossThing", "Gross thing", "Like old socks or pickle juice"],
      ["superpower", "Superpower", "Like laser burps or mega jumping"]
    ],
    text: ({ properNoun, animal, adjective, noun, actionVerb, color, grossThing, superpower }) =>
      `${properNoun} marched into the backyard and discovered a ${color} fortress made entirely out of ${grossThing}. Guarding the gate was a ${adjective} ${animal} wearing sunglasses and holding a powerful ${noun}. The only way to win the boss battle was to ${actionVerb} while using the legendary power of ${superpower}. After four ridiculous minutes, the fortress surrendered, the sprinklers exploded, and everyone agreed this was the greatest backyard adventure since last Tuesday.`
  },
  {
    id: "substitute-chaos",
    title: "Substitute Teacher Chaos",
    fields: [
      ["properNoun", "Proper noun", "A name, like Eli or Professor Waffle"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["verb", "Verb", "An action word"],
      ["color", "Color", "Any color"],
      ["food", "Food", "Something tasty"],
      ["ingWord", "Word ending in ing", "Like stomping or giggling"]
    ],
    text: ({ properNoun, adjective, noun, pluralNoun, verb, color, food, ingWord }) =>
      `When ${properNoun} walked into class, the substitute teacher was already standing on a ${noun} and holding a stack of ${color} ${pluralNoun}. She announced that math would be replaced by the ancient art of ${ingWord}, which sounded suspicious but also awesome. Then the class had to ${verb} every time someone said the word ${food}. By recess, the room was completely ${adjective}, the homework had vanished, and everyone was pretty sure the substitute was either a genius or had lost the teacher instructions in a puddle.`
  }
];

let eventsAreBound = false;
const CURRENT_STORY_KEY = "miniGames.madLibCurrentStoryIndex";
const HISTORY_KEY = "miniGames.madLibHistory";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentStoryIndex() {
  const savedIndex = Number(localStorage.getItem(CURRENT_STORY_KEY) || "0");
  if (!Number.isInteger(savedIndex) || savedIndex < 0) return 0;
  return savedIndex % stories.length;
}

function getCurrentStory() {
  return stories[getCurrentStoryIndex()];
}

function getStoryById(storyId) {
  return stories.find((story) => story.id === storyId) || stories[0];
}

function getHistory() {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(savedHistory) ? savedHistory : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function saveCompletedStory(story, answers, storyText) {
  const history = getHistory();
  history.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    storyId: story.id,
    title: story.title,
    answers,
    storyText,
    createdAt: new Date().toISOString()
  });
  saveHistory(history);
}

function moveToNextStory() {
  const nextIndex = (getCurrentStoryIndex() + 1) % stories.length;
  localStorage.setItem(CURRENT_STORY_KEY, String(nextIndex));
}

function renderForm(story = getCurrentStory(), isRedo = false) {
  const fields = story.fields.map(([id, label, hint]) => `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${id}" autocomplete="off" required>
      <small>${hint}</small>
    </div>
  `).join("");

  return `
    <section class="panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
      </div>
      <h2>Mad Libs</h2>
      <p class="intro">${isRedo ? `Redo: ${story.title}` : `Story ${getCurrentStoryIndex() + 1} of ${stories.length}: ${story.title}`}. Fill in the blanks, then make a silly story.</p>

      <form id="madLibForm" data-story-id="${story.id}" data-redo="${isRedo ? "yes" : "no"}">
        <div class="word-grid">${fields}</div>
        <button class="primary-button" type="submit">Make My Story</button>
      </form>
      ${renderHistory()}
    </section>
  `;
}

function highlightStory(storyText, answers) {
  const safeWords = Object.values(answers)
    .map(escapeHtml)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  let highlighted = escapeHtml(storyText);
  safeWords.forEach((word) => {
    highlighted = highlighted.replaceAll(word, `<span class="inserted-word">${word}</span>`);
  });
  return highlighted;
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    return `
      <section class="history-section" aria-label="Story history">
        <h3>History</h3>
        <p class="hint">Completed stories will show up here.</p>
      </section>
    `;
  }

  const items = history.map((item) => `
    <article class="history-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.storyText)}</p>
      </div>
      <button class="secondary-button" type="button" data-redo-story="${item.storyId}">Redo</button>
    </article>
  `).join("");

  return `
    <section class="history-section" aria-label="Story history">
      <h3>History</h3>
      <div class="history-list">${items}</div>
    </section>
  `;
}

function renderResult(story, answers, shouldMoveToNextStory) {
  const storyText = story.text(answers);
  saveCompletedStory(story, answers, storyText);
  if (shouldMoveToNextStory) {
    moveToNextStory();
  }

  const playCount = Number(localStorage.getItem("miniGames.madLibPlayCount") || "0") + 1;
  localStorage.setItem("miniGames.madLibPlayCount", String(playCount));

  return `
    <section class="panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
        <button class="secondary-button" type="button" data-next-story>Next Story</button>
      </div>
      <h2>${story.title}</h2>
      <div class="result-story">${highlightStory(storyText, answers)}</div>
      <p class="hint">Mad Libs stories made on this device: ${playCount}</p>
      ${renderHistory()}
    </section>
  `;
}

function handleMadLibsEvents(container) {
  if (eventsAreBound) return;
  eventsAreBound = true;

  container.addEventListener("submit", (event) => {
    if (event.target.id !== "madLibForm") return;

    event.preventDefault();
    const formData = new FormData(event.target);
    const story = getStoryById(event.target.dataset.storyId);
    const answers = {};

    story.fields.forEach(([id]) => {
      answers[id] = String(formData.get(id) || "").trim() || "banana";
    });

    container.innerHTML = renderResult(story, answers, event.target.dataset.redo !== "yes");
  });

  container.addEventListener("click", (event) => {
    const redoButton = event.target.closest("[data-redo-story]");

    if (event.target.closest("[data-next-story]")) {
      container.innerHTML = renderForm(getCurrentStory());
    }

    if (redoButton) {
      container.innerHTML = renderForm(getStoryById(redoButton.dataset.redoStory), true);
    }
  });
}

export function renderMadLibs() {
  if (typeof document !== "undefined") {
    setTimeout(() => handleMadLibsEvents(document.querySelector("#app")), 0);
  }
  return renderForm(getCurrentStory());
}
