const EASY = [
  "Apple","Ball","Cat","Dog","Fish","Hat","Sun","Tree","House","Cake",
  "Boat","Duck","Ring","Bird","Frog","Milk","Kite","Star","Flag","Book",
  "Clock","Chair","Heart","Cloud","Rainbow","Pizza","Train","Beach","Smile","Moon",
  "Shoe","Eye","Nose","Hand","Cup","Fork","Bed","Lamp","Door","Key",
  "Car","Bus","Plane","Bike","Drum","Fire","Snow","Rain","Wind","Ice",
  "Egg","Bread","Cheese","Tomato","Banana","Flower","River","Bridge","Mountain","Desert",
  "Pencil","Camera","Phone","Shirt","Pants","Sock","Hat","Bag","Box","Coin",
  "Bell","Leaf","Rock","Sand","Wave","Crab","Bee","Ant","Cow","Pig",
];

const MEDIUM = [
  "Telescope","Volcano","Ballet","Guitar","Lighthouse","Tornado","Museum","Library","Umbrella","Compass",
  "Elephant","Butterfly","Waterfall","Stadium","Hospital","Saxophone","Sandcastle","Submarine","Helicopter","Calendar",
  "Microphone","Parachute","Snowflake","Cathedral","Laboratory","Classroom","Rollercoaster","Fireworks","Carnival","Pyramid",
  "Windmill","Igloo","Skateboard","Hammock","Aquarium","Escalator","Chandelier","Magician","Astronaut","Ballerina",
  "Kangaroo","Penguin","Octopus","Crocodile","Peacock","Flamingo","Porcupine","Armadillo","Chameleon","Stalactite",
  "Hurricane","Tsunami","Avalanche","Earthquake","Geyser","Glacier","Quicksand","Lollipop","Pinwheel","Boomerang",
  "Trampoline","Accordion","Lawnmower","Barbecue","Hammock","Conveyor","Periscope","Catapult","Treehouse","Scuba",
  "Monopoly","Campfire","Iceberg","Cactus","Tornado","Ferris wheel","Seesaw","Pinball","Juggler","Tightrope",
];

const HARD = [
  "Democracy","Nostalgia","Photosynthesis","Philosophy","Procrastination","Globalization","Constellation","Archaeology","Metamorphosis","Bureaucracy",
  "Equilibrium","Civilization","Biodiversity","Paradox","Supernatural","Consciousness","Thermodynamics","Sovereignty","Hallucination","Aristocracy",
  "Decomposition","Cryptography","Anthropology","Psychology","Romanticism","Renaissance","Revolution","Algorithm","Hypothesis","Xenophobia",
  "Utopia","Dystopia","Mythology","Imperialism","Capitalism","Meditation","Enlightenment","Subconscious","Perception","Morality",
  "Ambiguity","Integrity","Compassion","Curiosity","Resilience","Vulnerability","Authenticity","Empathy","Synergy","Paradigm",
  "Catalyst","Entropy","Momentum","Trajectory","Synchronicity","Electromagnetic","Quantum","Photon","Relativity","Perpetuity",
  "Bureaucracy","Sarcasm","Irony","Paradox","Prejudice","Gravity","Velocity","Acceleration","Friction","Momentum",
  "Hibernation","Migration","Camouflage","Evolution","Extinction","Symbiosis","Parasitism","Ecosystem","Biome","Photon",
];

export function pickWordCard(used: Set<string>): { easy: string; medium: string; hard: string } {
  const pick = (words: string[]): string => {
    const avail = words.filter(w => !used.has(w));
    const pool = avail.length > 0 ? avail : words;
    const w = pool[Math.floor(Math.random() * pool.length)];
    used.add(w);
    return w;
  };
  return { easy: pick(EASY), medium: pick(MEDIUM), hard: pick(HARD) };
}
