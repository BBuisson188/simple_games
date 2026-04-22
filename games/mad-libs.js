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
  },
  {
    id: "museum-midnight",
    title: "Midnight Museum Mix-Up",
    fields: [
      ["properNoun", "Proper noun", "A name, like Riley or Dr. Pickle"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like bonk, whee, or kerplunk"],
      ["actionVerb", "Action verb", "Like tumble, march, or zoom"]
    ],
    text: ({ properNoun, adjective, animal, noun, pluralNoun, color, sound, actionVerb }) =>
      `${properNoun} was visiting the museum when the giant ${animal} skeleton sneezed and shouted "${sound}!" Suddenly every painting turned ${color}, the ancient ${pluralNoun} started tap dancing, and a ${adjective} ${noun} rolled through the dinosaur hall. The security guard told everyone to stay calm, which was hard because the gift shop was trying to ${actionVerb}. By midnight, the museum was back to normal, except one statue kept asking for snacks.`
  },
  {
    id: "pirate-principal",
    title: "The Pirate Principal",
    fields: [
      ["properNoun", "Proper noun", "A name, like Morgan or Captain Socks"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["place", "Place", "Somewhere you can go"],
      ["actionVerb", "Action verb", "Like shout, bounce, or paddle"]
    ],
    text: ({ properNoun, adjective, noun, pluralNoun, food, color, place, actionVerb }) =>
      `${properNoun} knew something was strange when the principal arrived wearing a ${color} pirate hat and carrying a treasure map made of ${food}. He declared that recess would happen at the ${place}, but only after everyone found the missing ${pluralNoun}. The first clue was hidden inside a ${adjective} ${noun} that kept humming the school song. After the whole class had to ${actionVerb} across the playground, they discovered the treasure was extra dessert and absolutely no homework.`
  },
  {
    id: "robot-pet-parade",
    title: "Robot Pet Parade",
    fields: [
      ["properNoun", "Proper noun", "A name, like Nova or Aunt Gadget"],
      ["animal", "Animal", "Any animal"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["sound", "Silly sound", "Like beep, clang, or bloop"],
      ["food", "Food", "Something tasty"],
      ["ingWord", "Word ending in ing", "Like skating or wobbling"]
    ],
    text: ({ properNoun, animal, adjective, noun, pluralNoun, sound, food, ingWord }) =>
      `${properNoun} built a robot ${animal} for the town pet parade, and at first it was only mildly ${adjective}. Then it smelled ${food}, shouted "${sound}," and started collecting every ${noun} on the street. Soon the parade was full of marching ${pluralNoun}, confused judges, and one mayor who could not stop ${ingWord}. The robot won first place for Most Helpful Disaster and was asked to please never update its software during a parade again.`
  },
  {
    id: "science-fair-volcano",
    title: "Science Fair Volcano Surprise",
    fields: [
      ["properNoun", "Proper noun", "A name, like Jordan or Professor Sprinkle"],
      ["adjective", "Adjective", "A describing word"],
      ["liquid", "Liquid", "Like lemonade or shampoo"],
      ["food", "Food", "Something tasty"],
      ["noun", "Noun", "A person, place, or thing"],
      ["color", "Color", "Any color"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["actionVerb", "Action verb", "Like leap, wiggle, or clap"]
    ],
    text: ({ properNoun, adjective, liquid, food, noun, color, pluralNoun, actionVerb }) =>
      `${properNoun} brought a homemade volcano to the science fair and promised it would be completely ${adjective}. Unfortunately, someone mixed in ${liquid}, three scoops of ${food}, and a mysterious ${color} ${noun}. The volcano erupted so hard that ${pluralNoun} flew across the gym and everyone had to ${actionVerb} for safety. The judges gave it a ribbon for Best Explosion and asked for the recipe, but only from very far away.`
  },
  {
    id: "dinosaur-sleepover",
    title: "Dinosaur Sleepover",
    fields: [
      ["properNoun", "Proper noun", "A name, like Taylor or Granny Rex"],
      ["dinosaur", "Dinosaur", "Like triceratops or T. rex"],
      ["adjective", "Adjective", "A describing word"],
      ["food", "Food", "Something tasty"],
      ["game", "Game", "Any game"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["sound", "Silly sound", "Like snore, yelp, or boom"],
      ["ingWord", "Word ending in ing", "Like bouncing or whispering"]
    ],
    text: ({ properNoun, dinosaur, adjective, food, game, pluralNoun, sound, ingWord }) =>
      `${properNoun} invited a ${dinosaur} to a sleepover and forgot to mention the ceiling was not dinosaur-sized. The guest brought ${food}, a ${adjective} sleeping bag, and enough ${pluralNoun} for everyone on the block. They played ${game} until the dinosaur yelled "${sound}" and accidentally sat on the couch. By morning, everyone was ${ingWord}, the living room looked prehistoric, and the dinosaur politely asked to come back next Friday.`
  },
  {
    id: "library-loud-day",
    title: "The Library Got Loud",
    fields: [
      ["properNoun", "Proper noun", "A name, like Avery or Sir Bookstack"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["animal", "Animal", "Any animal"],
      ["verb", "Verb", "An action word"],
      ["sound", "Silly sound", "Like shush, pop, or blammo"],
      ["color", "Color", "Any color"],
      ["pluralNoun", "Plural noun", "More than one thing"]
    ],
    text: ({ properNoun, adjective, noun, animal, verb, sound, color, pluralNoun }) =>
      `${properNoun} opened a library book and heard it whisper "${sound}" in a very dramatic voice. The pages turned ${color}, a tiny ${animal} climbed out, and every ${adjective} ${noun} in the room began to ${verb}. The librarian tried to restore order, but the mystery section was throwing ${pluralNoun} like confetti. Everyone still used quiet voices, though, because even magical library chaos has rules.`
  },
  {
    id: "snow-day-rescue",
    title: "Snow Day Rescue Mission",
    fields: [
      ["properNoun", "Proper noun", "A name, like Casey or Commander Cocoa"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["food", "Food", "Something tasty"],
      ["vehicle", "Vehicle", "Like sled, bus, or rocket"],
      ["color", "Color", "Any color"],
      ["place", "Place", "Somewhere you can go"],
      ["actionVerb", "Action verb", "Like slide, stomp, or zoom"]
    ],
    text: ({ properNoun, adjective, animal, food, vehicle, color, place, actionVerb }) =>
      `${properNoun} woke up to a snow day and discovered a ${adjective} ${animal} stuck on top of the ${place}. The only rescue vehicle available was a ${color} ${vehicle} powered by ${food}. Everyone bundled up and had to ${actionVerb} through snowdrifts taller than the mailbox. The rescue worked perfectly, except the ${animal} refused to come down until someone promised hot chocolate and a snow fort with windows.`
  },
  {
    id: "carnival-calamity",
    title: "Carnival Calamity",
    fields: [
      ["properNoun", "Proper noun", "A name, like Jamie or Zippy"],
      ["adjective", "Adjective", "A describing word"],
      ["food", "Food", "Something tasty"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["animal", "Animal", "Any animal"],
      ["sound", "Silly sound", "Like honk, whoosh, or kabam"],
      ["ingWord", "Word ending in ing", "Like spinning or laughing"]
    ],
    text: ({ properNoun, adjective, food, noun, pluralNoun, animal, sound, ingWord }) =>
      `${properNoun} stepped onto the Ferris wheel with a bag of ${food} and a very ${adjective} plan. Halfway up, the wheel made a "${sound}" noise and a ${animal} took control of the ticket booth. Suddenly ${pluralNoun} were flying, the cotton candy machine became a ${noun}, and everyone was ${ingWord} in circles. The carnival owner said it was the best Tuesday attendance had ever been.`
  },
  {
    id: "beach-blanket-battle",
    title: "Beach Blanket Battle",
    fields: [
      ["properNoun", "Proper noun", "A name, like Sky or Captain Flip-Flop"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["noun", "Noun", "A person, place, or thing"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["actionVerb", "Action verb", "Like dive, wobble, or race"]
    ],
    text: ({ properNoun, adjective, animal, noun, food, color, pluralNoun, actionVerb }) =>
      `${properNoun} spread out a beach blanket and immediately found a ${color} map buried under the sand. It led to a ${adjective} ${noun} guarded by a bossy ${animal} who demanded ${food} as payment. The waves started tossing ${pluralNoun} onto shore, so everyone had to ${actionVerb} before the tide stole the snacks. In the end, the treasure was a perfect seashell and a sandcastle shaped like a refrigerator.`
  },
  {
    id: "sports-day-switcheroo",
    title: "Sports Day Switcheroo",
    fields: [
      ["properNoun", "Proper noun", "A name, like Drew or Coach Noodle"],
      ["sport", "Sport", "Like soccer, baseball, or bowling"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["food", "Food", "Something tasty"],
      ["actionVerb", "Action verb", "Like sprint, dance, or flop"]
    ],
    text: ({ properNoun, sport, adjective, animal, noun, pluralNoun, food, actionVerb }) =>
      `${properNoun} showed up for ${sport} day and found out the rules had been rewritten by a ${adjective} ${animal}. Instead of balls, everyone had to use ${pluralNoun}, and the finish line was guarded by a ${noun} covered in ${food}. The coach blew the whistle and yelled that the only legal move was to ${actionVerb}. Nobody knew who won, but everyone agreed the scoreboard looked much more interesting upside down.`
  },
  {
    id: "haunted-hallway",
    title: "The Not-So-Haunted Hallway",
    fields: [
      ["properNoun", "Proper noun", "A name, like Quinn or Count Pancake"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["animal", "Animal", "Any animal"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like boo, squeak, or plop"],
      ["food", "Food", "Something tasty"],
      ["ingWord", "Word ending in ing", "Like floating or giggling"]
    ],
    text: ({ properNoun, adjective, noun, animal, color, sound, food, ingWord }) =>
      `${properNoun} tiptoed into the hallway after hearing a spooky "${sound}" from behind the lockers. A ${color} sheet floated by, but underneath it was just a ${adjective} ${animal} carrying a ${noun}. The hallway lights flickered because someone had plugged in a giant machine that made ${food}. Soon everyone was ${ingWord}, and the ghost officially apologized for being mostly snacks and static electricity.`
  },
  {
    id: "space-pizza-delivery",
    title: "Space Pizza Delivery",
    fields: [
      ["properNoun", "Proper noun", "A name, like Alex or Captain Crust"],
      ["adjective", "Adjective", "A describing word"],
      ["planet", "Planet", "A real or made-up planet"],
      ["food", "Food", "Something tasty"],
      ["vehicle", "Vehicle", "Like scooter, rocket, or canoe"],
      ["animal", "Animal", "Any animal"],
      ["sound", "Silly sound", "Like zap, nom, or kaboom"],
      ["actionVerb", "Action verb", "Like orbit, duck, or zoom"]
    ],
    text: ({ properNoun, adjective, planet, food, vehicle, animal, sound, actionVerb }) =>
      `${properNoun} got hired to deliver ${food} to the far side of ${planet} using a ${adjective} ${vehicle}. The route was easy until a space ${animal} floated by and shouted "${sound}" at the toppings. To make it on time, ${properNoun} had to ${actionVerb} through an asteroid field and around a moon made of cheese. The customer gave five stars, plus a tip made entirely of glittery space rocks.`
  },
  {
    id: "campfire-cookout",
    title: "Campfire Cookout Surprise",
    fields: [
      ["properNoun", "Proper noun", "A name, like Harper or Ranger Waffle"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["food", "Food", "Something tasty"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["sound", "Silly sound", "Like crackle, blorp, or ta-da"],
      ["ingWord", "Word ending in ing", "Like hiking or snoring"]
    ],
    text: ({ properNoun, adjective, animal, food, noun, pluralNoun, sound, ingWord }) =>
      `${properNoun} was roasting ${food} at camp when a ${adjective} ${animal} wandered up and said "${sound}." It handed over a map, a flashlight, and one suspicious ${noun}. The trail led past singing ${pluralNoun} and a tent that would not stop ${ingWord}. By bedtime, everyone had learned that campfire stories are better when the forest helps tell them.`
  },
  {
    id: "train-to-taco-town",
    title: "Train to Taco Town",
    fields: [
      ["properNoun", "Proper noun", "A name, like Blake or Conductor Salsa"],
      ["adjective", "Adjective", "A describing word"],
      ["food", "Food", "Something tasty"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like chug, ding, or splat"],
      ["actionVerb", "Action verb", "Like wave, jump, or scoot"]
    ],
    text: ({ properNoun, adjective, food, noun, pluralNoun, color, sound, actionVerb }) =>
      `${properNoun} boarded the ${color} train to Taco Town and immediately heard the engine go "${sound}." The conductor announced that every ticket had to be paid for with ${food}, which seemed fair until the ${adjective} ${noun} ate the ticket booth. Soon ${pluralNoun} were rolling down the aisle and passengers had to ${actionVerb} to their seats. The train arrived early, mostly because it was very motivated by salsa.`
  },
  {
    id: "backpack-portal",
    title: "The Backpack Portal",
    fields: [
      ["properNoun", "Proper noun", "A name, like Maya or Zed"],
      ["adjective", "Adjective", "A describing word"],
      ["place", "Place", "Somewhere you can go"],
      ["noun", "Noun", "A person, place, or thing"],
      ["animal", "Animal", "Any animal"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["ingWord", "Word ending in ing", "Like bouncing or blinking"]
    ],
    text: ({ properNoun, adjective, place, noun, animal, food, color, ingWord }) =>
      `${properNoun} reached into a backpack for a pencil and pulled out a ${color} doorway to the ${place}. On the other side, a ${adjective} ${animal} was guarding a mountain of ${food} with a tiny ${noun}. The backpack started ${ingWord}, which made math class feel much more complicated than usual. Everyone decided the portal could stay, as long as it stopped eating homework folders.`
  },
  {
    id: "moon-cow-mystery",
    title: "Moon Cow Mystery",
    fields: [
      ["properNoun", "Proper noun", "A name, like Finn or Detective Moo"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["noun", "Noun", "A person, place, or thing"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like moo, zip, or bonk"],
      ["actionVerb", "Action verb", "Like float, chase, or wiggle"]
    ],
    text: ({ properNoun, adjective, animal, noun, food, color, sound, actionVerb }) =>
      `${properNoun} noticed the moon looked like it had a bite missing and called the space police. A ${adjective} ${animal} confessed that it had followed a trail of ${food} to a ${color} ${noun}. Every time the moon made a "${sound}" noise, everyone had to ${actionVerb} in low gravity. The mystery was solved when they found the missing moon piece in the fridge labeled "do not eat until Friday."`
  },
  {
    id: "grocery-store-grand-prix",
    title: "Grocery Store Grand Prix",
    fields: [
      ["properNoun", "Proper noun", "A name, like Logan or Grandma Turbo"],
      ["adjective", "Adjective", "A describing word"],
      ["food", "Food", "Something tasty"],
      ["vehicle", "Vehicle", "Like cart, scooter, or wagon"],
      ["animal", "Animal", "Any animal"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["sound", "Silly sound", "Like vroom, beep, or crunch"],
      ["actionVerb", "Action verb", "Like drift, zoom, or spin"]
    ],
    text: ({ properNoun, adjective, food, vehicle, animal, pluralNoun, sound, actionVerb }) =>
      `${properNoun} only needed one box of ${food}, but the grocery store had turned into a ${adjective} race track. The shopping ${vehicle} made a "${sound}" noise as a ${animal} waved the starting flag. Racers dodged flying ${pluralNoun}, rounded the cereal aisle, and had to ${actionVerb} past the frozen peas. The winner received a coupon, a trophy, and permission to never race near the eggs again.`
  },
  {
    id: "tiny-town-tornado",
    title: "Tiny Town Tornado Drill",
    fields: [
      ["properNoun", "Proper noun", "A name, like Parker or Mayor Marshmallow"],
      ["adjective", "Adjective", "A describing word"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like whoosh, ping, or burp"],
      ["ingWord", "Word ending in ing", "Like twirling or cheering"]
    ],
    text: ({ properNoun, adjective, noun, pluralNoun, food, color, sound, ingWord }) =>
      `${properNoun} visited Tiny Town, where every building was smaller than a lunchbox and every emergency was extremely dramatic. A ${color} tornado made of ${food} spun down Main Street yelling "${sound}." The ${adjective} ${noun} ordered everyone to gather the ${pluralNoun} and start ${ingWord}. Ten minutes later, the drill was over, the town was sticky, and the mayor declared it a delicious success.`
  },
  {
    id: "aquarium-escape",
    title: "Aquarium Escape Plan",
    fields: [
      ["properNoun", "Proper noun", "A name, like Isla or Captain Bubble"],
      ["adjective", "Adjective", "A describing word"],
      ["seaCreature", "Sea creature", "Like shark, octopus, or goldfish"],
      ["noun", "Noun", "A person, place, or thing"],
      ["food", "Food", "Something tasty"],
      ["color", "Color", "Any color"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["actionVerb", "Action verb", "Like swim, wobble, or sneak"]
    ],
    text: ({ properNoun, adjective, seaCreature, noun, food, color, pluralNoun, actionVerb }) =>
      `${properNoun} leaned close to the aquarium glass and saw a ${color} note taped to a coral reef. The ${adjective} ${seaCreature} inside wanted help finding a missing ${noun} before dinner, which was apparently ${food}. Bubbles lifted ${pluralNoun} into the air while everyone tried to ${actionVerb} without slipping. The great escape ended when the sea creature admitted it only wanted a better view of the snack bar.`
  },
  {
    id: "birthday-cake-countdown",
    title: "Birthday Cake Countdown",
    fields: [
      ["properNoun", "Proper noun", "A name, like Sophie or Uncle Sprinkle"],
      ["adjective", "Adjective", "A describing word"],
      ["food", "Food", "Something tasty"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like pop, fizz, or kaboom"],
      ["actionVerb", "Action verb", "Like clap, duck, or bounce"]
    ],
    text: ({ properNoun, adjective, food, noun, pluralNoun, color, sound, actionVerb }) =>
      `${properNoun} lit the candles on a ${color} birthday cake and heard it start counting down from ten. The cake was filled with ${food}, ${pluralNoun}, and one tiny ${adjective} ${noun} wearing party glasses. When it reached zero, it yelled "${sound}" and everyone had to ${actionVerb}. Nothing exploded, but the frosting launched confetti and the birthday song got stuck in the ceiling fan.`
  },
  {
    id: "jungle-gym-jungle",
    title: "Jungle Gym Jungle",
    fields: [
      ["properNoun", "Proper noun", "A name, like Leo or Queen Banana"],
      ["adjective", "Adjective", "A describing word"],
      ["animal", "Animal", "Any animal"],
      ["noun", "Noun", "A person, place, or thing"],
      ["pluralNoun", "Plural noun", "More than one thing"],
      ["food", "Food", "Something tasty"],
      ["sound", "Silly sound", "Like roar, clank, or whee"],
      ["ingWord", "Word ending in ing", "Like climbing or sliding"]
    ],
    text: ({ properNoun, adjective, animal, noun, pluralNoun, food, sound, ingWord }) =>
      `${properNoun} climbed onto the playground and realized the jungle gym had become an actual jungle. A ${adjective} ${animal} swung from the monkey bars yelling "${sound}" while ${pluralNoun} grew out of the mulch. At the top of the slide sat a golden ${noun} and a suspicious pile of ${food}. By recess cleanup, everyone was ${ingWord}, and the teacher agreed the playground had excellent imagination but terrible manners.`
  },
  {
    id: "wizard-bus-route",
    title: "Wizard Bus Route",
    fields: [
      ["properNoun", "Proper noun", "A name, like Rowan or Wizard Zip"],
      ["adjective", "Adjective", "A describing word"],
      ["place", "Place", "Somewhere you can go"],
      ["noun", "Noun", "A person, place, or thing"],
      ["animal", "Animal", "Any animal"],
      ["color", "Color", "Any color"],
      ["sound", "Silly sound", "Like poof, honk, or whizz"],
      ["actionVerb", "Action verb", "Like vanish, bounce, or glide"]
    ],
    text: ({ properNoun, adjective, place, noun, animal, color, sound, actionVerb }) =>
      `${properNoun} got on the school bus and noticed the driver was wearing a ${color} wizard hat. The bus said "${sound}," turned into a ${adjective} ${animal}, and took a shortcut through the ${place}. Everyone had to hold onto a ${noun} and ${actionVerb} whenever the road turned sparkly. They still arrived before the bell, but all the backpacks smelled faintly like magic toast.`
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
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 25)));
}

function saveCompletedStory(story, answers, storyText, replaceHistoryId = "") {
  const history = getHistory();
  const entry = {
    id: replaceHistoryId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    storyId: story.id,
    title: story.title,
    answers,
    storyText,
    createdAt: new Date().toISOString()
  };

  const existingIndex = history.findIndex((item) => item.id === replaceHistoryId);
  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }
  history.unshift(entry);
  saveHistory(history);
  return entry;
}

function moveToNextStory() {
  const nextIndex = (getCurrentStoryIndex() + 1) % stories.length;
  localStorage.setItem(CURRENT_STORY_KEY, String(nextIndex));
}

function getHistoryItemById(historyId) {
  return getHistory().find((item) => item.id === historyId);
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved story";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPreviewText(storyText) {
  const compactText = storyText.replace(/\s+/g, " ").trim();
  if (compactText.length <= 110) return compactText;
  return `${compactText.slice(0, 107)}...`;
}

function renderMadLibsToolbar(extraButtons = "") {
  return `
    <div class="toolbar">
      <button class="secondary-button" type="button" data-menu>Back to Menu</button>
      <button class="secondary-button" type="button" data-history>History</button>
      ${extraButtons}
    </div>
  `;
}

function renderForm(story = getCurrentStory(), options = {}) {
  const { redoHistoryId = "" } = options;
  const isRedo = Boolean(redoHistoryId);
  const fields = story.fields.map(([id, label, hint]) => `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${id}" autocomplete="off" required>
      <small>${hint}</small>
    </div>
  `).join("");

  return `
    <section class="panel">
      ${renderMadLibsToolbar()}
      <h2>Mad Libs</h2>
      <p class="intro">${isRedo ? `Redo: ${story.title}` : `Story ${getCurrentStoryIndex() + 1} of ${stories.length}: ${story.title}`}. Fill in the blanks, then make a silly story.</p>

      <form id="madLibForm" data-story-id="${story.id}" data-redo-history-id="${escapeHtml(redoHistoryId)}">
        <div class="word-grid">${fields}</div>
        <button class="primary-button" type="submit">Make My Story</button>
      </form>
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

function renderHistoryList() {
  const history = getHistory();
  if (history.length === 0) {
    return `
      <section class="panel">
        <div class="toolbar">
          <button class="secondary-button" type="button" data-back-to-mad-libs>Back to Mad Libs</button>
          <button class="secondary-button" type="button" data-menu>Back to Menu</button>
        </div>
        <h2>Mad Libs History</h2>
        <p class="hint">Completed stories will show up here.</p>
      </section>
    `;
  }

  const items = history.map((item) => `
    <article class="history-item">
      <button class="history-summary" type="button" data-open-history-item="${escapeHtml(item.id)}">
        <h3>${escapeHtml(item.title)}</h3>
        <span>${escapeHtml(formatHistoryDate(item.createdAt))}</span>
        <p>${escapeHtml(getPreviewText(item.storyText))}</p>
      </button>
      <button class="secondary-button" type="button" data-redo-history-id="${escapeHtml(item.id)}">Redo</button>
    </article>
  `).join("");

  return `
    <section class="panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-back-to-mad-libs>Back to Mad Libs</button>
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
      </div>
      <h2>Mad Libs History</h2>
      <div class="history-list">${items}</div>
    </section>
  `;
}

function renderHistoryDetail(historyId) {
  const item = getHistoryItemById(historyId);
  if (!item) return renderHistoryList();

  return `
    <section class="panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-history>Back to History</button>
        <button class="secondary-button" type="button" data-redo-history-id="${escapeHtml(item.id)}">Redo</button>
      </div>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="hint">${escapeHtml(formatHistoryDate(item.createdAt))}</p>
      <div class="result-story">${highlightStory(item.storyText, item.answers || {})}</div>
    </section>
  `;
}

function renderResult(story, answers, shouldMoveToNextStory, replaceHistoryId = "") {
  const storyText = story.text(answers);
  saveCompletedStory(story, answers, storyText, replaceHistoryId);
  if (shouldMoveToNextStory) {
    moveToNextStory();
  }

  const playCount = Number(localStorage.getItem("miniGames.madLibPlayCount") || "0") + 1;
  localStorage.setItem("miniGames.madLibPlayCount", String(playCount));

  return `
    <section class="panel">
      ${renderMadLibsToolbar('<button class="secondary-button" type="button" data-next-story>Next Story</button>')}
      <h2>${story.title}</h2>
      <div class="result-story">${highlightStory(storyText, answers)}</div>
      <p class="hint">Mad Libs stories made on this device: ${playCount}</p>
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
    const replaceHistoryId = event.target.dataset.redoHistoryId || "";
    const answers = {};

    story.fields.forEach(([id]) => {
      answers[id] = String(formData.get(id) || "").trim() || "banana";
    });

    container.innerHTML = renderResult(story, answers, !replaceHistoryId, replaceHistoryId);
  });

  container.addEventListener("click", (event) => {
    const historyItemButton = event.target.closest("[data-open-history-item]");
    const redoHistoryButton = event.target.closest("[data-redo-history-id]");

    if (event.target.closest("[data-history]")) {
      container.innerHTML = renderHistoryList();
    }

    if (event.target.closest("[data-back-to-mad-libs]")) {
      container.innerHTML = renderForm(getCurrentStory());
    }

    if (event.target.closest("[data-next-story]")) {
      container.innerHTML = renderForm(getCurrentStory());
    }

    if (historyItemButton) {
      container.innerHTML = renderHistoryDetail(historyItemButton.dataset.openHistoryItem);
    }

    if (redoHistoryButton) {
      const historyItem = getHistoryItemById(redoHistoryButton.dataset.redoHistoryId);
      if (historyItem) {
        container.innerHTML = renderForm(getStoryById(historyItem.storyId), {
          redoHistoryId: historyItem.id
        });
      }
    }
  });
}

export function renderMadLibs() {
  if (typeof document !== "undefined") {
    setTimeout(() => handleMadLibsEvents(document.querySelector("#app")), 0);
  }
  return renderForm(getCurrentStory());
}
