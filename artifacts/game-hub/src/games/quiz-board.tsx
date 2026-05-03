import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';

// ─── QUESTION BANK ────────────────────────────────────────────────────────────
// Format: q = clue text, a = canonical answer (lowercase), alt = accepted aliases
type QEntry = { q: string; a: string; alt?: string[] };
type QBank = Record<string, Record<number, QEntry[]>>;

const QUESTION_BANK: QBank = {
  // ── BASE PACK ────────────────────────────────────────────────────────────────
  "Science & Nature": {
    100: [
      { q: "This planet is known as the Red Planet.", a: "mars" },
      { q: "This force pulls objects toward Earth.", a: "gravity" },
      { q: "This star is at the center of our solar system.", a: "sun" },
      { q: "This organ pumps blood through the body.", a: "heart" },
      { q: "This natural satellite orbits Earth.", a: "moon" },
      { q: "This is the study of living things.", a: "biology" },
      { q: "This type of animal has a backbone.", a: "vertebrate" },
    ],
    200: [
      { q: "This planet is the largest in our solar system.", a: "jupiter" },
      { q: "This gas do plants take in during photosynthesis.", a: "carbon dioxide", alt: ["co2"] },
      { q: "This is the hardest natural substance on Earth.", a: "diamond" },
      { q: "This is the powerhouse of the cell.", a: "mitochondria" },
      { q: "This is the process by which plants make food using sunlight.", a: "photosynthesis" },
      { q: "This is the largest animal on Earth.", a: "blue whale" },
      { q: "This is the largest ocean on Earth.", a: "pacific ocean" },
    ],
    300: [
      { q: "This planet has prominent rings.", a: "saturn" },
      { q: "This is the chemical symbol for water.", a: "h2o" },
      { q: "This is the basic unit of life.", a: "cell" },
      { q: "This is the largest organ of the human body.", a: "skin" },
      { q: "This process changes a liquid into a gas.", a: "evaporation" },
      { q: "This pigment makes plants green.", a: "chlorophyll" },
      { q: "This is molten rock before it reaches the surface.", a: "magma" },
    ],
    400: [
      { q: "This molecule carries genetic instructions in living things.", a: "dna" },
      { q: "This scale is used to measure earthquake magnitude.", a: "richter scale" },
      { q: "This is the SI unit of force.", a: "newton" },
      { q: "This class of animals feeds milk to its young.", a: "mammals" },
      { q: "This is the process of cell division for body cells.", a: "mitosis" },
      { q: "This is the branch of biology that studies heredity.", a: "genetics" },
      { q: "This is the speed of light in vacuum, approximately 300,000 km per second.", a: "300000 km per second", alt: ["300,000 km per second", "speed of light"] },
    ],
    500: [
      { q: "This scientist proposed the theory of relativity.", a: "albert einstein", alt: ["einstein"] },
      { q: "This is a scientist who studies fossils.", a: "paleontologist" },
      { q: "This type of rock changes under heat and pressure.", a: "metamorphic rock" },
      { q: "This dwarf planet was once classified as the ninth planet.", a: "pluto" },
      { q: "This planet rotates on its side.", a: "uranus" },
      { q: "This is a group of stars forming a named pattern.", a: "constellation" },
      { q: "This is the variable changed by a scientist in an experiment.", a: "independent variable" },
    ],
  },

  "World Geography": {
    100: [
      { q: "This is the capital of Canada.", a: "ottawa" },
      { q: "This is the capital of France.", a: "paris" },
      { q: "This is the capital of Japan.", a: "tokyo" },
      { q: "This is the longest river often cited in Africa.", a: "nile river", alt: ["nile"] },
      { q: "This is the capital of China.", a: "beijing" },
      { q: "This is the largest ocean.", a: "pacific ocean" },
      { q: "This is the smallest continent.", a: "australia" },
    ],
    200: [
      { q: "This is the capital of the United States.", a: "washington dc", alt: ["washington d.c.", "washington"] },
      { q: "This is the capital of the United Kingdom.", a: "london" },
      { q: "This is the capital of Australia.", a: "canberra" },
      { q: "This is the capital of Brazil.", a: "brasilia", alt: ["brasília"] },
      { q: "This mountain is the highest above sea level.", a: "mount everest", alt: ["everest"] },
      { q: "This country is shaped like a boot.", a: "italy" },
      { q: "This is the largest country by area.", a: "russia" },
    ],
    300: [
      { q: "This canal connects the Mediterranean Sea and the Red Sea.", a: "suez canal" },
      { q: "This desert covers much of northern Africa.", a: "sahara desert", alt: ["sahara"] },
      { q: "This mountain range runs along western South America.", a: "andes", alt: ["andes mountains"] },
      { q: "This is the major river of the Amazon Basin.", a: "amazon river", alt: ["amazon"] },
      { q: "This city is known as the Eternal City.", a: "rome" },
      { q: "This river flows through London.", a: "thames river", alt: ["thames"] },
      { q: "This island is the largest in the world.", a: "greenland" },
    ],
    400: [
      { q: "This canal connects the Atlantic and Pacific Oceans in Central America.", a: "panama canal" },
      { q: "This imaginary line is at zero degrees latitude.", a: "equator" },
      { q: "This imaginary line is at zero degrees longitude.", a: "prime meridian" },
      { q: "This is the capital of Argentina.", a: "buenos aires" },
      { q: "This sea is actually a large salt lake between Israel and Jordan.", a: "dead sea" },
      { q: "This mountain range separates Europe and Asia in Russia.", a: "ural mountains", alt: ["urals"] },
      { q: "This is the capital of Turkey.", a: "ankara" },
    ],
    500: [
      { q: "This is the capital of Mongolia.", a: "ulaanbaatar" },
      { q: "This archipelago nation has Manila as its capital.", a: "philippines" },
      { q: "This is the capital of Malaysia.", a: "kuala lumpur" },
      { q: "This continent is mostly covered by ice.", a: "antarctica" },
      { q: "This country has the most official time zones, including overseas territories.", a: "france" },
      { q: "This is the capital of Switzerland.", a: "bern" },
      { q: "This tropic lies south of the Equator.", a: "tropic of capricorn" },
    ],
  },

  "World History": {
    100: [
      { q: "This ancient civilization built the pyramids at Giza.", a: "ancient egypt", alt: ["egypt", "egyptians"] },
      { q: "This Roman leader was assassinated on the Ides of March.", a: "julius caesar", alt: ["caesar"] },
      { q: "This explorer is associated with the 1492 voyage across the Atlantic.", a: "christopher columbus", alt: ["columbus"] },
      { q: "This French emperor was defeated at Waterloo.", a: "napoleon bonaparte", alt: ["napoleon"] },
      { q: "This document was signed in 1215 limiting English royal power.", a: "magna carta" },
      { q: "This war was fought from 1914 to 1918.", a: "world war i", alt: ["world war 1", "wwi", "ww1", "the great war"] },
      { q: "This leader of India promoted nonviolent resistance.", a: "mahatma gandhi", alt: ["gandhi"] },
    ],
    200: [
      { q: "This war was fought from 1939 to 1945.", a: "world war ii", alt: ["world war 2", "wwii", "ww2"] },
      { q: "This wall divided a German city during the Cold War.", a: "berlin wall" },
      { q: "This revolution began in France in 1789.", a: "french revolution" },
      { q: "This trade route connected East Asia and Europe.", a: "silk road" },
      { q: "This empire built roads across much of Europe.", a: "roman empire" },
      { q: "This Mongol leader built one of history's largest land empires.", a: "genghis khan" },
      { q: "This U.S. president issued the Emancipation Proclamation.", a: "abraham lincoln", alt: ["lincoln"] },
    ],
    300: [
      { q: "This movement emphasized humanism and classical learning in Europe.", a: "renaissance" },
      { q: "This religious movement began with Martin Luther in 1517.", a: "protestant reformation", alt: ["reformation"] },
      { q: "This plague devastated Europe in the 14th century.", a: "black death", alt: ["bubonic plague", "plague"] },
      { q: "This revolution transformed manufacturing with machines and factories.", a: "industrial revolution" },
      { q: "This invention by Gutenberg helped spread printed books in Europe.", a: "printing press" },
      { q: "This was the code name for the Allied invasion of Normandy.", a: "d-day", alt: ["d day"] },
      { q: "This Japanese period saw rapid modernization after 1868.", a: "meiji restoration" },
    ],
    400: [
      { q: "This American document was adopted on July 4, 1776.", a: "declaration of independence" },
      { q: "This U.S. war was fought between North and South from 1861 to 1865.", a: "american civil war", alt: ["civil war"] },
      { q: "This South African leader became president after opposing apartheid.", a: "nelson mandela", alt: ["mandela"] },
      { q: "This crisis in 1962 involved missiles in Cuba.", a: "cuban missile crisis" },
      { q: "This Spanish conquistador conquered the Aztec Empire.", a: "hernan cortes", alt: ["cortez", "cortes"] },
      { q: "This purchase roughly doubled the size of the United States in 1803.", a: "louisiana purchase" },
      { q: "This 1917 revolution led to communist rule in Russia.", a: "russian revolution" },
    ],
    500: [
      { q: "This mission first landed humans on the Moon.", a: "apollo 11" },
      { q: "This event in 1989 symbolized the end of the Cold War in Europe.", a: "fall of the berlin wall", alt: ["berlin wall fell", "berlin wall"] },
      { q: "This was the policy of racial segregation once used in South Africa.", a: "apartheid" },
      { q: "This ancient code is associated with a Babylonian king.", a: "code of hammurabi", alt: ["hammurabi's code", "hammurabi"] },
      { q: "This medieval African empire was famous for wealth and Mansa Musa.", a: "mali empire" },
      { q: "This was the first permanent English settlement in North America.", a: "jamestown" },
      { q: "This Chinese voyage leader sailed large treasure fleets in the Ming era.", a: "zheng he" },
    ],
  },

  "Literature & Arts": {
    100: [
      { q: "This playwright wrote Hamlet.", a: "william shakespeare", alt: ["shakespeare"] },
      { q: "This painter created the Mona Lisa.", a: "leonardo da vinci", alt: ["da vinci", "leonardo"] },
      { q: "This author created Sherlock Holmes.", a: "arthur conan doyle", alt: ["conan doyle"] },
      { q: "This author created Harry Potter.", a: "j.k. rowling", alt: ["jk rowling", "rowling"] },
      { q: "This author wrote The Hobbit.", a: "j.r.r. tolkien", alt: ["tolkien", "jrr tolkien"] },
      { q: "This Dutch painter is famous for Starry Night.", a: "vincent van gogh", alt: ["van gogh"] },
      { q: "This art form uses folded paper.", a: "origami" },
    ],
    200: [
      { q: "This novel begins with a white rabbit and a girl named Alice.", a: "alice in wonderland", alt: ["alice's adventures in wonderland"] },
      { q: "This artist painted the ceiling of the Sistine Chapel.", a: "michelangelo" },
      { q: "This author wrote Pride and Prejudice.", a: "jane austen", alt: ["austen"] },
      { q: "This author wrote The Adventures of Tom Sawyer.", a: "mark twain", alt: ["twain"] },
      { q: "This composer wrote The Four Seasons.", a: "antonio vivaldi", alt: ["vivaldi"] },
      { q: "This composer wrote The Magic Flute.", a: "wolfgang amadeus mozart", alt: ["mozart"] },
      { q: "This museum in Paris houses the Mona Lisa.", a: "louvre" },
    ],
    300: [
      { q: "This Spanish artist co-founded Cubism with Braque.", a: "pablo picasso", alt: ["picasso"] },
      { q: "This Russian composer wrote The Nutcracker.", a: "pyotr ilyich tchaikovsky", alt: ["tchaikovsky"] },
      { q: "This author wrote 1984 and Animal Farm.", a: "george orwell", alt: ["orwell"] },
      { q: "This author wrote Frankenstein.", a: "mary shelley", alt: ["shelley"] },
      { q: "This author wrote Dracula.", a: "bram stoker", alt: ["stoker"] },
      { q: "This Greek epic poet is credited with the Iliad and Odyssey.", a: "homer" },
      { q: "This musical is based on the life of Alexander Hamilton.", a: "hamilton" },
    ],
    400: [
      { q: "This novel features the character Atticus Finch.", a: "to kill a mockingbird" },
      { q: "This literary form has 14 lines in its traditional English form.", a: "sonnet" },
      { q: "This is a dance-based stage art often using pointe shoes.", a: "ballet" },
      { q: "This artist painted The Persistence of Memory with melting clocks.", a: "salvador dali", alt: ["dali"] },
      { q: "This author wrote The Handmaid's Tale.", a: "margaret atwood", alt: ["atwood"] },
      { q: "This Canadian author created Anne of Green Gables.", a: "lucy maud montgomery", alt: ["l.m. montgomery", "montgomery"] },
      { q: "This dramatic work is sung with an orchestra.", a: "opera" },
    ],
    500: [
      { q: "This artist is known for Campbell's soup can paintings.", a: "andy warhol", alt: ["warhol"] },
      { q: "This is the written text of an opera or musical.", a: "libretto" },
      { q: "This Japanese poetry form has 5-7-5 syllables.", a: "haiku" },
      { q: "This is the central message or idea of a story.", a: "theme" },
      { q: "This painting on wet plaster is called by this name.", a: "fresco" },
      { q: "This composer wrote Brandenburg Concertos.", a: "johann sebastian bach", alt: ["bach"] },
      { q: "This is the highest female singing voice.", a: "soprano" },
    ],
  },

  "Sports & Games": {
    100: [
      { q: "This sport uses a puck and sticks on ice.", a: "ice hockey", alt: ["hockey"] },
      { q: "This sport is played at Wimbledon.", a: "tennis" },
      { q: "This sport uses clubs and holes on a course.", a: "golf" },
      { q: "This sport uses a round ball and goals, known worldwide as football.", a: "soccer", alt: ["football"] },
      { q: "This Olympic event combines swimming, cycling, and running.", a: "triathlon" },
      { q: "This race is 42.195 kilometres long.", a: "marathon" },
      { q: "This sport has a checkmate as the winning goal.", a: "chess" },
    ],
    200: [
      { q: "This sport uses a bat, bases, and innings.", a: "baseball" },
      { q: "This sport uses a hoop and backboard.", a: "basketball" },
      { q: "This board game includes buying properties and collecting rent.", a: "monopoly" },
      { q: "This tennis score means zero.", a: "love" },
      { q: "This is three goals by one player in a single game.", a: "hat trick" },
      { q: "This sport uses a shuttlecock.", a: "badminton" },
      { q: "This cycling race is held mostly in France.", a: "tour de france" },
    ],
    300: [
      { q: "This video game features falling tetromino blocks.", a: "tetris" },
      { q: "This video game features a yellow character eating pellets.", a: "pac-man", alt: ["pacman"] },
      { q: "This creature-catching franchise began with Red and Green in Japan.", a: "pokemon", alt: ["pokémon"] },
      { q: "This winter sport combines skiing and rifle shooting.", a: "biathlon" },
      { q: "This winter sport involves sliding stones on ice toward a house.", a: "curling" },
      { q: "This combat sport uses throws and pins and means gentle way.", a: "judo" },
      { q: "This word game uses letter tiles on a board.", a: "scrabble" },
    ],
    400: [
      { q: "This hockey player is nicknamed The Great One.", a: "wayne gretzky", alt: ["gretzky"] },
      { q: "This basketball player was nicknamed Air Jordan.", a: "michael jordan", alt: ["jordan"] },
      { q: "This boxer was known as The Greatest.", a: "muhammad ali", alt: ["ali"] },
      { q: "This Jamaican sprinter is famous for world-record sprints.", a: "usain bolt", alt: ["bolt"] },
      { q: "This soccer player is famous for Argentina and Inter Miami.", a: "lionel messi", alt: ["messi"] },
      { q: "This logic puzzle uses a 9 by 9 number grid.", a: "sudoku" },
      { q: "This card game often has royal flush as the best hand.", a: "poker" },
    ],
    500: [
      { q: "This swimmer won a record number of Olympic gold medals.", a: "michael phelps", alt: ["phelps"] },
      { q: "This Canadian sport was invented by James Naismith.", a: "basketball" },
      { q: "This sport awards the Stanley Cup.", a: "ice hockey", alt: ["hockey"] },
      { q: "This puzzle cube has six colored faces in its classic form.", a: "rubik's cube", alt: ["rubiks cube"] },
      { q: "This horse race is the first leg of the U.S. Triple Crown.", a: "kentucky derby" },
      { q: "This is the maximum break in standard snooker.", a: "147" },
      { q: "This is a perfect score in ten-pin bowling.", a: "300" },
    ],
  },

  "Technology & Inventions": {
    100: [
      { q: "This device lets you type letters into a computer.", a: "keyboard" },
      { q: "This device controls a cursor by hand movement.", a: "mouse" },
      { q: "This network connects computers worldwide.", a: "internet" },
      { q: "This company created the iPhone.", a: "apple" },
      { q: "This company created Windows.", a: "microsoft" },
      { q: "This is the brain of a computer.", a: "cpu", alt: ["processor", "central processing unit"] },
      { q: "This programming language is named after a snake.", a: "python" },
    ],
    200: [
      { q: "This search company also makes the Android operating system.", a: "google" },
      { q: "This computer memory is used for active working data.", a: "ram", alt: ["random access memory"] },
      { q: "This markup language structures web pages.", a: "html" },
      { q: "This language styles web pages.", a: "css" },
      { q: "This programming language runs in web browsers.", a: "javascript" },
      { q: "This system stores code history and versions.", a: "git" },
      { q: "This is malicious software.", a: "malware" },
    ],
    300: [
      { q: "This short-range wireless standard connects headphones and devices.", a: "bluetooth" },
      { q: "This satellite navigation system was developed by the United States.", a: "gps", alt: ["global positioning system"] },
      { q: "This is a wireless network technology often used at home.", a: "wi-fi", alt: ["wifi"] },
      { q: "This document format is designed to preserve layout.", a: "pdf" },
      { q: "This invention is often credited to Alexander Graham Bell.", a: "telephone", alt: ["phone"] },
      { q: "This is a tiny electronic switch fundamental to chips.", a: "transistor" },
      { q: "This screen technology uses organic light-emitting diodes.", a: "oled" },
    ],
    400: [
      { q: "This inventor is famous for the practical light bulb.", a: "thomas edison", alt: ["edison"] },
      { q: "This inventor developed alternating-current electrical systems.", a: "nikola tesla", alt: ["tesla"] },
      { q: "This pair achieved the first powered airplane flight in 1903.", a: "wright brothers" },
      { q: "This is the field of making machines appear intelligent.", a: "artificial intelligence", alt: ["ai"] },
      { q: "This open-source operating system kernel is used by many servers.", a: "linux" },
      { q: "This protocol secures web pages with encryption.", a: "https" },
      { q: "This system translates domain names to IP addresses.", a: "dns" },
    ],
    500: [
      { q: "This is a type of AI that learns patterns from data.", a: "machine learning" },
      { q: "This is a layered machine learning model inspired by neurons.", a: "neural network" },
      { q: "This company makes GeForce GPUs.", a: "nvidia" },
      { q: "This is software that locks files and demands payment.", a: "ransomware" },
      { q: "This security method requires two forms of login proof.", a: "two-factor authentication", alt: ["2fa", "mfa"] },
      { q: "This spreadsheet program is made by Microsoft.", a: "excel", alt: ["microsoft excel"] },
      { q: "This is the open-source website that hosts many Git repositories.", a: "github" },
    ],
  },

  // ── EXPANDED PACK ─────────────────────────────────────────────────────────────
  "Wordplay & Vocabulary": {
    100: [
      { q: "This term means a word with a similar meaning.", a: "synonym" },
      { q: "This term means a word that replaces a noun.", a: "pronoun" },
      { q: "This term means matching ending sounds.", a: "rhyme" },
      { q: "This term means a comparison that says one thing is another.", a: "metaphor" },
      { q: "This word reads the same backward and forward: LEVEL.", a: "palindrome" },
      { q: "This is the plural of child.", a: "children" },
      { q: "A word created by blending breakfast and lunch is this.", a: "brunch" },
    ],
    200: [
      { q: "This term means a word with the opposite meaning.", a: "antonym" },
      { q: "This term means a person, place, thing, or idea.", a: "noun" },
      { q: "This term means a comparison using like or as.", a: "simile" },
      { q: "This term means a phrase whose meaning is not literal.", a: "idiom" },
      { q: "This is the plural of mouse.", a: "mice" },
      { q: "This idiom means 'study'.", a: "hit the books" },
      { q: "This is the comparative form of bad.", a: "worse" },
    ],
    300: [
      { q: "This term means a word that sounds like another word.", a: "homophone" },
      { q: "This term means an action or state-of-being word.", a: "verb" },
      { q: "This term means a word that connects words or clauses.", a: "conjunction" },
      { q: "This term means a word formed from initials.", a: "acronym" },
      { q: "This is the past tense of run.", a: "ran" },
      { q: "This idiom means 'something easy'.", a: "piece of cake" },
      { q: "The study of word origins is called this.", a: "etymology" },
    ],
    400: [
      { q: "This term means a word part added to the beginning.", a: "prefix" },
      { q: "This term means a word that describes a noun.", a: "adjective" },
      { q: "This term means a short exclamation such as 'wow'.", a: "interjection" },
      { q: "This term means a shortened form of a word or phrase.", a: "abbreviation" },
      { q: "A group of lines in a poem is called this.", a: "stanza" },
      { q: "This idiom means 'reveal a secret'.", a: "spill the beans" },
      { q: "This punctuation mark can join two related independent clauses.", a: "semicolon" },
    ],
    500: [
      { q: "This term means a word part added to the end.", a: "suffix" },
      { q: "This term means a word that modifies a verb, adjective, or another adverb.", a: "adverb" },
      { q: "This term means intentional exaggeration.", a: "hyperbole" },
      { q: "This term means a word made from two smaller words.", a: "compound word" },
      { q: "This punctuation mark shows possession in words like Ava's.", a: "apostrophe" },
      { q: "This idiom means 'feeling sick'.", a: "under the weather" },
      { q: "A word created by blending smoke and fog is this.", a: "smog" },
    ],
  },

  "Music & Instruments": {
    100: [
      { q: "This instrument has 88 keys in standard form.", a: "piano" },
      { q: "This instrument is played by plucking or strumming strings.", a: "guitar" },
      { q: "This instrument is the smallest member of the string family.", a: "violin" },
      { q: "This instrument uses a slide and is in the brass family.", a: "trombone" },
      { q: "This instrument is struck to keep the rhythm.", a: "drums", alt: ["drum kit", "drum"] },
      { q: "This is the speed of music.", a: "tempo" },
      { q: "This is a group of singers.", a: "choir" },
    ],
    200: [
      { q: "This woodwind instrument uses a single reed and is common in jazz.", a: "saxophone", alt: ["sax"] },
      { q: "This is the largest instrument in the string family.", a: "double bass", alt: ["bass", "contrabass"] },
      { q: "This brass instrument is played with valves and a bell.", a: "trumpet" },
      { q: "This instrument produces sound by vibrating air in a tube.", a: "flute" },
      { q: "This is a large instrumental group with strings, brass, woodwinds, and percussion.", a: "orchestra" },
      { q: "This is the loudness or softness of music.", a: "dynamics" },
      { q: "This symbol raises a note by a half step.", a: "sharp" },
    ],
    300: [
      { q: "This composer wrote The Nutcracker ballet.", a: "tchaikovsky", alt: ["pyotr ilyich tchaikovsky"] },
      { q: "This composer wrote the Fifth Symphony with a famous four-note opening.", a: "beethoven", alt: ["ludwig van beethoven"] },
      { q: "This composer wrote Brandenburg Concertos.", a: "bach", alt: ["johann sebastian bach"] },
      { q: "This is a repeated musical theme or idea.", a: "motif" },
      { q: "This is the written text of an opera or musical.", a: "libretto" },
      { q: "This family of instruments includes violin and cello.", a: "strings", alt: ["string instruments"] },
      { q: "This is the highest female singing voice.", a: "soprano" },
    ],
    400: [
      { q: "This composer wrote The Magic Flute opera.", a: "mozart", alt: ["wolfgang amadeus mozart"] },
      { q: "This composer wrote The Four Seasons.", a: "vivaldi", alt: ["antonio vivaldi"] },
      { q: "This percussion instrument is made of tuned bars struck with mallets.", a: "xylophone" },
      { q: "This is the lowest male singing voice.", a: "bass" },
      { q: "This person conducts an orchestra.", a: "conductor" },
      { q: "This symbol lowers a note by a half step.", a: "flat" },
      { q: "This dramatic work is sung with an orchestra.", a: "opera" },
    ],
    500: [
      { q: "This composer wrote Messiah, including the Hallelujah Chorus.", a: "handel", alt: ["george frideric handel"] },
      { q: "This composer wrote many nocturnes and was famous for piano music.", a: "chopin", alt: ["frederic chopin"] },
      { q: "This musical features the Phantom and Christine.", a: "the phantom of the opera", alt: ["phantom of the opera"] },
      { q: "This Japanese theater form uses masks.", a: "noh" },
      { q: "This is a play without spoken words, using movement only.", a: "mime", alt: ["pantomime"] },
      { q: "This chorus from Handel's Messiah is often performed at Christmas.", a: "hallelujah chorus", alt: ["hallelujah"] },
      { q: "This musical features the song Memory.", a: "cats" },
    ],
  },

  "Food & Drink": {
    100: [
      { q: "This fruit is yellow and comes in bunches.", a: "banana" },
      { q: "This Italian dish consists of dough topped with cheese and tomato sauce.", a: "pizza" },
      { q: "This hot drink is made from roasted beans.", a: "coffee" },
      { q: "This grain is the main ingredient in bread.", a: "wheat", alt: ["flour"] },
      { q: "This is the most consumed beverage in the world.", a: "water" },
      { q: "This food is made by churning cream.", a: "butter" },
      { q: "This sweet food is produced by bees.", a: "honey" },
    ],
    200: [
      { q: "This Japanese dish features raw fish on seasoned rice.", a: "sushi" },
      { q: "This Italian pasta dish is made with eggs and bacon.", a: "carbonara", alt: ["pasta carbonara"] },
      { q: "This sweet treat is made from cacao beans.", a: "chocolate" },
      { q: "This hot drink is made from leaves steeped in water.", a: "tea" },
      { q: "This is the process of using yeast to make bread rise.", a: "fermentation", alt: ["leavening", "rising"] },
      { q: "This French pastry is flaky and crescent-shaped.", a: "croissant" },
      { q: "This spice comes from the stigma of a flower and is very expensive.", a: "saffron" },
    ],
    300: [
      { q: "This Mexican staple is a flatbread made from corn or wheat.", a: "tortilla" },
      { q: "This condiment is made from fermented cabbage.", a: "sauerkraut" },
      { q: "This dish from Japan is noodles in broth with toppings.", a: "ramen" },
      { q: "This Indian spice blend gives curry its yellow color.", a: "turmeric", alt: ["curry powder"] },
      { q: "This process preserves food by removing moisture.", a: "dehydration", alt: ["drying"] },
      { q: "This Italian cheese is typically used on pizza.", a: "mozzarella" },
      { q: "This is the process of cooking food using hot air in an enclosed space.", a: "baking" },
    ],
    400: [
      { q: "This nutrient group includes sugars and starches.", a: "carbohydrates", alt: ["carbs"] },
      { q: "This cooking technique quickly fries food in a small amount of fat.", a: "sautéing", alt: ["saute", "sauteing"] },
      { q: "This protein-rich food is made from soybeans.", a: "tofu" },
      { q: "This country is the origin of sushi.", a: "japan" },
      { q: "This popular Mexican dip is made from avocados.", a: "guacamole" },
      { q: "This French sauce is made with butter, egg yolks, and lemon juice.", a: "hollandaise", alt: ["hollandaise sauce"] },
      { q: "This is the unit used to measure food energy.", a: "calorie" },
    ],
    500: [
      { q: "This cooking method uses steam rather than direct heat or water submersion.", a: "steaming" },
      { q: "This Maillard reaction describes the browning of food at high temperatures.", a: "maillard reaction" },
      { q: "This is the practice of preparing and using only local, seasonal foods.", a: "farm to table", alt: ["locavore", "local food"] },
      { q: "This French term describes a set of all the ingredients used by a cook.", a: "mise en place" },
      { q: "This alcohol is distilled from agave plants.", a: "tequila" },
      { q: "This French cooking technique cooks food in vacuum-sealed bags in warm water.", a: "sous vide" },
      { q: "This nut is actually a legume and is the basis of a popular spread.", a: "peanut" },
    ],
  },

  "Math & Logic": {
    100: [
      { q: "This is the result of adding two numbers together.", a: "sum" },
      { q: "This is the result of multiplying two numbers.", a: "product" },
      { q: "This is the number of sides on a hexagon.", a: "6", alt: ["six"] },
      { q: "This is the value of pi to two decimal places.", a: "3.14" },
      { q: "This is the number of degrees in a right angle.", a: "90", alt: ["90 degrees"] },
      { q: "This is the ratio of a circle's circumference to its diameter.", a: "pi", alt: ["π", "3.14"] },
      { q: "This is the square root of 64.", a: "8", alt: ["eight"] },
    ],
    200: [
      { q: "This is the result of subtracting one number from another.", a: "difference" },
      { q: "A triangle with all equal sides is called this.", a: "equilateral triangle" },
      { q: "This is the average of a set of numbers.", a: "mean", alt: ["average"] },
      { q: "This is the middle value in a sorted set of numbers.", a: "median" },
      { q: "This is the most frequently occurring value in a set.", a: "mode" },
      { q: "This theorem relates the sides of a right triangle: a²+b²=c².", a: "pythagorean theorem" },
      { q: "This number raised to any power equals itself.", a: "1", alt: ["one"] },
    ],
    300: [
      { q: "This type of number cannot be expressed as a fraction.", a: "irrational number" },
      { q: "This branch of math studies shapes, angles, and space.", a: "geometry" },
      { q: "This is a number that has no factors other than 1 and itself.", a: "prime number" },
      { q: "This is a mathematical statement showing two expressions are equal.", a: "equation" },
      { q: "This is the number system using only 0 and 1.", a: "binary", alt: ["binary system"] },
      { q: "This represents the probability of an impossible event.", a: "0", alt: ["zero"] },
      { q: "This is the formula for the area of a circle.", a: "pi r squared", alt: ["πr²", "pi times r squared"] },
    ],
    400: [
      { q: "This branch of mathematics deals with rates of change.", a: "calculus" },
      { q: "This is the number of faces on a cube.", a: "6", alt: ["six"] },
      { q: "This type of graph uses bars to compare categories.", a: "bar graph", alt: ["bar chart"] },
      { q: "This is the greatest common factor of 48 and 64.", a: "16", alt: ["sixteen"] },
      { q: "A number that results from squaring a whole number is called this.", a: "perfect square" },
      { q: "This Greek letter is used for the sum of all values.", a: "sigma", alt: ["Σ"] },
      { q: "This sequence starts 1, 1, 2, 3, 5, 8...", a: "fibonacci sequence", alt: ["fibonacci"] },
    ],
    500: [
      { q: "This theorem states every integer greater than 1 has a unique prime factorization.", a: "fundamental theorem of arithmetic" },
      { q: "This mathematician introduced the coordinate plane.", a: "rene descartes", alt: ["descartes"] },
      { q: "This is the mathematical name for 10 to the power of 100.", a: "googol" },
      { q: "This is the study of collections of objects.", a: "set theory" },
      { q: "This ancient Greek mathematician first proved that there are infinitely many primes.", a: "euclid" },
      { q: "This is the maximum number of times two straight lines can intersect.", a: "1", alt: ["once", "one"] },
      { q: "This term describes a statement that cannot be both true and false simultaneously.", a: "law of noncontradiction", alt: ["noncontradiction"] },
    ],
  },

  "Famous People": {
    100: [
      { q: "This scientist proposed the theory of relativity.", a: "albert einstein", alt: ["einstein"] },
      { q: "This civil rights leader gave the 'I Have a Dream' speech.", a: "martin luther king jr", alt: ["mlk", "martin luther king"] },
      { q: "This person is the co-founder of Apple.", a: "steve jobs", alt: ["jobs"] },
      { q: "This was the first woman to fly solo across the Atlantic.", a: "amelia earhart", alt: ["earhart"] },
      { q: "This scientist developed the theory of evolution by natural selection.", a: "charles darwin", alt: ["darwin"] },
      { q: "This founder of Microsoft is also a prominent philanthropist.", a: "bill gates", alt: ["gates"] },
      { q: "This artist painted the Mona Lisa.", a: "leonardo da vinci", alt: ["da vinci", "leonardo"] },
    ],
    200: [
      { q: "This nurse is known as the founder of modern nursing.", a: "florence nightingale", alt: ["nightingale"] },
      { q: "This scientist discovered penicillin.", a: "alexander fleming", alt: ["fleming"] },
      { q: "This leader of India used nonviolent resistance.", a: "mahatma gandhi", alt: ["gandhi"] },
      { q: "This French leader was defeated at Waterloo.", a: "napoleon bonaparte", alt: ["napoleon"] },
      { q: "This person was the first human in space.", a: "yuri gagarin", alt: ["gagarin"] },
      { q: "This was the first woman to win a Nobel Prize.", a: "marie curie", alt: ["curie"] },
      { q: "This inventor created the telephone.", a: "alexander graham bell", alt: ["bell"] },
    ],
    300: [
      { q: "This queen of ancient Egypt was associated with Julius Caesar.", a: "cleopatra" },
      { q: "This Greek philosopher was the teacher of Alexander the Great.", a: "aristotle" },
      { q: "This English queen ruled during the defeat of the Spanish Armada.", a: "elizabeth i", alt: ["queen elizabeth i", "elizabeth the first"] },
      { q: "This South African president was jailed for 27 years before leading his country.", a: "nelson mandela", alt: ["mandela"] },
      { q: "This person co-founded Tesla Motors and SpaceX.", a: "elon musk", alt: ["musk"] },
      { q: "This physicist developed the laws of motion and gravity.", a: "isaac newton", alt: ["newton"] },
      { q: "This was the first person to walk on the moon.", a: "neil armstrong", alt: ["armstrong"] },
    ],
    400: [
      { q: "This Chinese philosopher emphasized ethics and social harmony.", a: "confucius" },
      { q: "This Macedonian king conquered a vast empire reaching India.", a: "alexander the great", alt: ["alexander"] },
      { q: "This ruler of Mali made a famous golden pilgrimage to Mecca.", a: "mansa musa" },
      { q: "This German-born theoretical physicist helped create the atomic bomb.", a: "j. robert oppenheimer", alt: ["oppenheimer"] },
      { q: "This astronomer first proposed the heliocentric model.", a: "nicolaus copernicus", alt: ["copernicus"] },
      { q: "This woman was the first to program a computing machine.", a: "ada lovelace", alt: ["lovelace"] },
      { q: "This inventor held over 1,000 US patents.", a: "thomas edison", alt: ["edison"] },
    ],
    500: [
      { q: "This woman mathematician cracked the German Enigma code.", a: "alan turing", alt: ["turing"] },
      { q: "This Indian emperor promoted Buddhism after the Kalinga War.", a: "ashoka" },
      { q: "This Russian empress expanded her empire greatly and was called the Great.", a: "catherine the great", alt: ["catherine ii"] },
      { q: "This composer was deaf when he wrote his Ninth Symphony.", a: "beethoven", alt: ["ludwig van beethoven"] },
      { q: "This Polish-French physicist won two Nobel Prizes, in physics and chemistry.", a: "marie curie", alt: ["curie"] },
      { q: "This civil rights activist refused to give up her bus seat in 1955.", a: "rosa parks", alt: ["parks"] },
      { q: "This Russian ruler built St. Petersburg and modernized Russia.", a: "peter the great" },
    ],
  },

  "The Human Body": {
    100: [
      { q: "This organ pumps blood through the body.", a: "heart" },
      { q: "This organ is used for breathing.", a: "lungs", alt: ["lung"] },
      { q: "This organ controls the entire body and is in the skull.", a: "brain" },
      { q: "This is the largest organ of the body.", a: "skin" },
      { q: "This connects muscles to bones.", a: "tendon" },
      { q: "This body system includes the brain and nerves.", a: "nervous system" },
      { q: "This bone protects the brain.", a: "skull" },
    ],
    200: [
      { q: "This is the liquid that carries nutrients through the body.", a: "blood" },
      { q: "These blood cells carry oxygen.", a: "red blood cells" },
      { q: "These blood cells help fight infection.", a: "white blood cells" },
      { q: "This organ filters blood and produces bile.", a: "liver" },
      { q: "This is where most digestion takes place.", a: "small intestine" },
      { q: "This gland in the neck regulates metabolism.", a: "thyroid" },
      { q: "This connects bones to other bones at joints.", a: "ligament" },
    ],
    300: [
      { q: "This is the number of bones in the adult human body.", a: "206", alt: ["two hundred and six"] },
      { q: "This is the longest bone in the human body.", a: "femur", alt: ["thigh bone"] },
      { q: "This organ produces insulin.", a: "pancreas" },
      { q: "This is where red blood cells are produced.", a: "bone marrow" },
      { q: "This is the term for the body's ability to maintain stable internal conditions.", a: "homeostasis" },
      { q: "This is the scientific name for the kneecap.", a: "patella" },
      { q: "This is the smallest bone in the human body, found in the ear.", a: "stapes", alt: ["stirrup"] },
    ],
    400: [
      { q: "This is the average number of heartbeats per minute in a resting adult.", a: "72", alt: ["70 to 100", "60 to 100"] },
      { q: "This is the part of the brain responsible for balance.", a: "cerebellum" },
      { q: "This is the vitamin produced by skin in sunlight.", a: "vitamin d" },
      { q: "This is the medical term for the shoulder blade.", a: "scapula" },
      { q: "This type of joint allows circular movement, found in the hip.", a: "ball and socket joint", alt: ["ball-and-socket"] },
      { q: "This is the process by which the body breaks down food into nutrients.", a: "digestion" },
      { q: "This nerve connects the eye to the brain.", a: "optic nerve" },
    ],
    500: [
      { q: "This is the scientific study of the structure of the body.", a: "anatomy" },
      { q: "The human brain has approximately this many neurons.", a: "100 billion", alt: ["86 billion"] },
      { q: "This is the process of cell division that creates gametes.", a: "meiosis" },
      { q: "This is the scientific name for the collarbone.", a: "clavicle" },
      { q: "This controls voluntary movements and is the outer part of the brain.", a: "cerebral cortex" },
      { q: "This is the typical human gestation period in weeks.", a: "40", alt: ["40 weeks", "nine months"] },
      { q: "This gland above the kidneys produces adrenaline.", a: "adrenal gland", alt: ["adrenal glands"] },
    ],
  },
};

const ALL_CATEGORIES = Object.keys(QUESTION_BANK);
const BASE_PACK = ["Science & Nature", "World Geography", "World History", "Literature & Arts", "Sports & Games", "Technology & Inventions"];
const EXPANDED_PACK = ["Wordplay & Vocabulary", "Music & Instruments", "Food & Drink", "Math & Logic", "Famous People", "The Human Body"];
const VALUES = [100, 200, 300, 400, 500] as const;

// ─── ANSWER VALIDATION ────────────────────────────────────────────────────────
function normalizeAnswer(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function checkAnswer(input: string, entry: QEntry): boolean {
  const norm = normalizeAnswer(input);
  if (!norm) return false;
  if (normalizeAnswer(entry.a).includes(norm) || norm.includes(normalizeAnswer(entry.a))) return true;
  if (entry.alt) {
    for (const alt of entry.alt) {
      const na = normalizeAnswer(alt);
      if (na.includes(norm) || norm.includes(na)) return true;
    }
  }
  return false;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type GameScreen = 'menu' | 'setup' | 'board' | 'clue' | 'result' | 'final';
type Pack = 'base' | 'expanded' | 'all';

interface Player { name: string; score: number; }
interface ClueState {
  category: string; value: number; entry: QEntry;
  answered: boolean; correct: boolean | null;
}

interface GameState {
  players: Player[];
  currentPlayer: number;
  board: Record<string, Record<number, QEntry>>;
  usedClues: Set<string>;
  activeClue: ClueState | null;
  timerSecs: number;
}

function buildBoard(categories: string[]): Record<string, Record<number, QEntry>> {
  const board: Record<string, Record<number, QEntry>> = {};
  for (const cat of categories) {
    board[cat] = {};
    for (const val of VALUES) {
      const pool = QUESTION_BANK[cat]?.[val] ?? [];
      if (pool.length > 0) {
        board[cat][val] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }
  return board;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CAT_COLORS: Record<string, string> = {
  "Science & Nature": "#1d4ed8",
  "World Geography": "#065f46",
  "World History": "#92400e",
  "Literature & Arts": "#7c2d8a",
  "Sports & Games": "#9d174d",
  "Technology & Inventions": "#1e40af",
  "Wordplay & Vocabulary": "#0369a1",
  "Music & Instruments": "#7c3aed",
  "Food & Drink": "#c2410c",
  "Math & Logic": "#0f766e",
  "Famous People": "#b45309",
  "The Human Body": "#be123c",
};

// ─── TIMER HOOK ───────────────────────────────────────────────────────────────
function useTimer(initial: number, active: boolean, onEnd: () => void, paused = false) {
  const [time, setTime] = useState(initial);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || paused) { if (ref.current) clearInterval(ref.current); return; }
    if (!paused) setTime(t => t); // keep current time when resuming
    ref.current = setInterval(() => {
      setTime(t => { if (t <= 1) { clearInterval(ref.current!); onEnd(); return 0; } return t - 1; });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active, paused]);

  useEffect(() => { if (active) setTime(initial); }, [active, initial]);

  return time;
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }: { onStart: (players: Player[], cats: string[], timer: number) => void }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [pack, setPack] = useState<Pack>('all');
  const [timerSecs, setTimerSecs] = useState(30);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [useCustom, setUseCustom] = useState(false);

  const availCats = pack === 'base' ? BASE_PACK : pack === 'expanded' ? EXPANDED_PACK : ALL_CATEGORIES;

  const toggleCat = (c: string) =>
    setCustomCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleStart = () => {
    let cats: string[];
    if (useCustom && customCats.length >= 6) {
      cats = shuffle(customCats).slice(0, 6);
    } else {
      cats = shuffle(availCats).slice(0, 6);
    }
    const players = names.slice(0, playerCount).map((n, i) => ({
      name: n.trim() || `Player ${i + 1}`, score: 0
    }));
    onStart(players, cats, timerSecs);
  };

  const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Players</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[1, 2, 3, 4].map(n => (
          <button key={n} onClick={() => setPlayerCount(n)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${playerCount === n ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: playerCount === n ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: playerCount === n ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}>{n}</button>
        ))}
      </div>
      {Array.from({ length: playerCount }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[i], flexShrink: 0 }} />
          <input value={names[i]} onChange={e => setNames(p => p.map((n, j) => j === i ? e.target.value : n))}
            placeholder={`Player ${i + 1}`}
            style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${PLAYER_COLORS[i]}40`, borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600 }} />
        </div>
      ))}

      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, margin: '14px 0 8px' }}>Question Pack</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['base', 'expanded', 'all'] as Pack[]).map(p => (
          <button key={p} onClick={() => { setPack(p); setUseCustom(false); }} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${pack === p && !useCustom ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: pack === p && !useCustom ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: pack === p && !useCustom ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>{p === 'base' ? 'Base (6)' : p === 'expanded' ? 'Expanded (6)' : 'All (12)'}</button>
        ))}
      </div>

      <button onClick={() => setUseCustom(u => !u)} style={{
        width: '100%', marginBottom: 8, padding: '7px', borderRadius: 8,
        border: `1.5px solid ${useCustom ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
        background: useCustom ? 'rgba(251,191,36,0.1)' : 'transparent',
        color: useCustom ? '#fbbf24' : '#666', fontSize: 13, cursor: 'pointer',
      }}>🎯 Pick custom categories (choose exactly 6+)</button>

      {useCustom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 12 }}>
          {ALL_CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleCat(c)} style={{
              padding: '6px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${customCats.includes(c) ? (CAT_COLORS[c] || '#888') : 'rgba(255,255,255,0.07)'}`,
              background: customCats.includes(c) ? `${CAT_COLORS[c] || '#888'}22` : 'rgba(255,255,255,0.03)',
              color: customCats.includes(c) ? (CAT_COLORS[c] || '#aaa') : '#555',
            }}>{customCats.includes(c) ? '✓ ' : ''}{c}</button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Answer Timer</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[15, 30, 45, 60].map(t => (
          <button key={t} onClick={() => setTimerSecs(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${timerSecs === t ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
            background: timerSecs === t ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            color: timerSecs === t ? '#fbbf24' : '#555', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>{t}s</button>
        ))}
      </div>

      <button onClick={handleStart}
        disabled={useCustom && customCats.length < 6}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: (useCustom && customCats.length < 6) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#b45309,#fbbf24)',
          color: '#fff', fontWeight: 800, fontSize: 17, cursor: useCustom && customCats.length < 6 ? 'not-allowed' : 'pointer',
          boxShadow: (useCustom && customCats.length < 6) ? 'none' : '0 4px 20px rgba(251,191,36,0.4)',
        }}>
        {useCustom && customCats.length < 6 ? `Select ${6 - customCats.length} more categories` : '🎯 Start Game!'}
      </button>
    </div>
  );
}

// ─── SCORE PANEL ──────────────────────────────────────────────────────────────
const PLAYER_COLORS_GAME = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

function ScorePanel({ players, current }: { players: Player[]; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
      {players.map((p, i) => (
        <div key={i} style={{ flex: 1, padding: '4px 6px', borderRadius: 8,
          background: i === current ? `${PLAYER_COLORS_GAME[i]}22` : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${i === current ? PLAYER_COLORS_GAME[i] : 'rgba(255,255,255,0.06)'}`,
          textAlign: 'center', boxShadow: i === current ? `0 0 10px ${PLAYER_COLORS_GAME[i]}50` : 'none',
        }}>
          <div style={{ fontSize: 9, color: PLAYER_COLORS_GAME[i], fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</div>
          {i === current && <div style={{ fontSize: 8, color: PLAYER_COLORS_GAME[i] }}>▶ PICKING</div>}
        </div>
      ))}
    </div>
  );
}

// ─── BOARD SCREEN ─────────────────────────────────────────────────────────────
function BoardScreen({ gs, onClueSelect }: { gs: GameState; onClueSelect: (cat: string, val: number) => void }) {
  const categories = Object.keys(gs.board);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories.length}, 1fr)`, gap: 4 }}>
        {categories.map(cat => (
          <div key={cat} style={{
            padding: '6px 4px', borderRadius: 6, background: CAT_COLORS[cat] || '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 56,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</span>
          </div>
        ))}
        {VALUES.map(val => categories.map(cat => {
          const used = gs.usedClues.has(`${cat}:${val}`);
          return (
            <button key={`${cat}:${val}`} onClick={() => !used && onClueSelect(cat, val)}
              disabled={used}
              style={{
                padding: '8px 4px', borderRadius: 6, minHeight: 48, fontWeight: 800, fontSize: 16,
                border: `1px solid ${used ? 'rgba(255,255,255,0.04)' : `${CAT_COLORS[cat] || '#1d4ed8'}80`}`,
                background: used ? 'rgba(255,255,255,0.02)' : 'rgba(10,10,40,0.95)',
                color: used ? '#2a2a2a' : '#fbbf24',
                cursor: used ? 'default' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: used ? 'none' : `inset 0 0 0 1px ${CAT_COLORS[cat] || '#1d4ed8'}40`,
              }}>
              {used ? '' : `$${val}`}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

// ─── CLUE MODAL ───────────────────────────────────────────────────────────────
function ClueModal({ gs, clue, onSubmit, onTimeout, paused, onTogglePause }: {
  gs: GameState; clue: ClueState;
  onSubmit: (answer: string) => void;
  onTimeout: () => void;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const [input, setInput] = useState('');
  const [locked, setLocked] = useState(false);
  const catColor = CAT_COLORS[clue.category] || '#1d4ed8';
  const pct = (useTimer(gs.timerSecs, !locked, onTimeout, paused) / gs.timerSecs) * 100;
  const timerColor = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  const currentPlayer = gs.players[gs.currentPlayer];

  const handleSubmit = () => {
    if (locked || !input.trim()) return;
    setLocked(true);
    onSubmit(input.trim());
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#0a0a20', borderRadius: 16, border: `2px solid ${catColor}`, overflow: 'hidden', boxShadow: `0 0 60px ${catColor}40` }}>
        {/* Timer */}
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: timerColor, transition: 'width 0.2s linear, background 0.3s', borderRadius: 0 }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 16px 10px', background: `${catColor}25`, borderBottom: `1px solid ${catColor}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: catColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{clue.category}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
              <span style={{ color: PLAYER_COLORS_GAME[gs.currentPlayer], fontWeight: 700 }}>{currentPlayer.name}</span>'s turn
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!locked && (
              <button onClick={onTogglePause} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 14, cursor: 'pointer' }}>{paused ? '▶' : '⏸'}</button>
            )}
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>${clue.value}</div>
          </div>
        </div>

        {/* Clue text */}
        <div style={{ padding: '20px 18px', textAlign: 'center', position: 'relative', minHeight: 80 }}>
          {paused ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>⏸</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#aaa' }}>Paused</div>
              <button onClick={onTogglePause} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: catColor, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>▶ Resume</button>
            </div>
          ) : (
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.6, margin: 0 }}>{clue.entry.q}</p>
          )}
        </div>

        {/* Answer input */}
        {!locked && !paused && (
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            <input autoFocus value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              style={{ flex: 1, padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${catColor}60`, borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600 }} />
            <button onClick={handleSubmit} style={{
              padding: '12px 18px', borderRadius: 10, border: 'none', background: catColor,
              color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}>✓</button>
          </div>
        )}
        {locked && (
          <div style={{ padding: '0 16px 16px', textAlign: 'center', color: '#888', fontSize: 13 }}>Checking answer…</div>
        )}
      </div>
    </div>
  );
}

// ─── RESULT MODAL ─────────────────────────────────────────────────────────────
function ResultModal({ clue, players, currentPlayer, earned, onNext }: {
  clue: ClueState; players: Player[]; currentPlayer: number; earned: number; onNext: () => void;
}) {
  const catColor = CAT_COLORS[clue.category] || '#1d4ed8';
  const p = players[currentPlayer];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#0a0a20', borderRadius: 16, overflow: 'hidden', border: `2px solid ${clue.correct ? '#22c55e' : '#ef4444'}`, boxShadow: `0 0 40px ${clue.correct ? '#22c55e40' : '#ef444430'}` }}>
        <div style={{ padding: '18px 20px 14px', background: clue.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>{clue.correct ? '✅' : '❌'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: clue.correct ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            {clue.correct ? 'Correct!' : 'Wrong!'}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            <span style={{ color: PLAYER_COLORS_GAME[currentPlayer], fontWeight: 700 }}>{p.name}</span>
            {' '}{clue.correct ? `+$${earned}` : `-$${clue.value}`}
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>The correct answer:</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fbbf24', padding: '10px 14px', background: 'rgba(251,191,36,0.1)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.25)' }}>
            {clue.entry.a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Clue: {clue.entry.q}</div>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={onNext} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${catColor},${catColor}aa)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FINAL SCORES ─────────────────────────────────────────────────────────────
function FinalScores({ players, onMenu, onRematch }: { players: Player[]; onMenu: () => void; onRematch: () => void }) {
  const sorted = [...players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '4th'];
  return (
    <div style={{ padding: '20px 14px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 52 }}>🏆</div>
        <h2 style={{ color: '#fbbf24', fontSize: 24, margin: '6px 0 4px' }}>Final Scores!</h2>
        <p style={{ color: '#666', fontSize: 13 }}>All 30 clues answered</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {sorted.map((p, rank) => (
          <div key={p.idx} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
            background: rank === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            border: rank === 0 ? '1.5px solid rgba(251,191,36,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 24, width: 32 }}>{medals[rank] || `${rank + 1}.`}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS_GAME[p.idx] }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{p.name}</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: p.score >= 0 ? '#fbbf24' : '#ef4444' }}>${p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRematch} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#92400e,#fbbf24)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>🔁 Rematch</button>
        <button onClick={onMenu} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#aaa', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>🏠 Menu</button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function QuizBoard() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gs, setGs] = useState<GameState | null>(null);
  const [lastClue, setLastClue] = useState<ClueState | null>(null);
  const [lastEarned, setLastEarned] = useState(0);

  const totalClues = gs ? Object.keys(gs.board).length * VALUES.length : 30;

  const handleStart = useCallback((players: Player[], cats: string[], timer: number) => {
    setGs({
      players, currentPlayer: 0,
      board: buildBoard(cats),
      usedClues: new Set(),
      activeClue: null,
      timerSecs: timer,
    });
    setScreen('board');
  }, []);

  const handleClueSelect = useCallback((cat: string, val: number) => {
    setGs(prev => {
      if (!prev) return prev;
      const entry = prev.board[cat]?.[val];
      if (!entry) return prev;
      const clue: ClueState = { category: cat, value: val, entry, answered: false, correct: null };
      return { ...prev, activeClue: clue };
    });
    setScreen('clue');
  }, []);

  const handleSubmit = useCallback((answer: string) => {
    if (!gs?.activeClue) return;
    const correct = checkAnswer(answer, gs.activeClue.entry);
    const val = gs.activeClue.value;
    const delta = correct ? val : -val;
    const newPlayers = gs.players.map((p, i) =>
      i === gs.currentPlayer ? { ...p, score: p.score + delta } : p
    );
    const key = `${gs.activeClue.category}:${val}`;
    const newUsed = new Set(gs.usedClues);
    newUsed.add(key);
    const nextPlayer = correct ? gs.currentPlayer : (gs.currentPlayer + 1) % gs.players.length;
    const updatedClue: ClueState = { ...gs.activeClue, answered: true, correct };
    setLastClue(updatedClue);
    setLastEarned(correct ? val : val);
    setGs({ ...gs, players: newPlayers, usedClues: newUsed, activeClue: updatedClue, currentPlayer: nextPlayer });
    setScreen('result');
  }, [gs]);

  const handleTimeout = useCallback(() => {
    if (!gs?.activeClue) return;
    const key = `${gs.activeClue.category}:${gs.activeClue.value}`;
    const newUsed = new Set(gs.usedClues);
    newUsed.add(key);
    const nextPlayer = (gs.currentPlayer + 1) % gs.players.length;
    const updatedClue: ClueState = { ...gs.activeClue, answered: true, correct: false };
    setLastClue(updatedClue);
    setLastEarned(0);
    setGs({ ...gs, usedClues: newUsed, activeClue: updatedClue, currentPlayer: nextPlayer });
    setScreen('result');
  }, [gs]);

  const handleNext = useCallback(() => {
    if (!gs) return;
    const allUsed = gs.usedClues.size >= totalClues;
    setScreen(allUsed ? 'final' : 'board');
  }, [gs, totalClues]);

  const [paused, setPaused] = useState(false);
  const handleMenu = useCallback(() => { setGs(null); setPaused(false); setScreen('menu'); }, []);
  const handleRematch = useCallback(() => setScreen('setup'), []);
  const togglePause = useCallback(() => setPaused(p => !p), []);

  const progress = gs ? `${gs.usedClues.size}/${totalClues}` : '';

  return (
    <div style={{ minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(180deg,#020209,#06060f)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: 'rgba(0,0,0,0.7)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexShrink: 0 }}>
        {screen !== 'menu' && screen !== 'setup' && (
          <button onClick={handleMenu} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer', marginRight: 8 }}>✕</button>
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24', letterSpacing: 1 }}>🎯 Quiz Board Arena</span>
          {progress && <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>{progress} clues</span>}
        </div>
        <div style={{ width: 52 }} />
      </div>

      {/* Score bar (during game) */}
      {gs && (screen === 'board' || screen === 'clue' || screen === 'result') && (
        <ScorePanel players={gs.players} current={gs.currentPlayer} />
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {screen === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24, position: 'relative' }}>
            <Link href="/"><span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
            <div style={{ fontSize: 72, marginBottom: 8 }}>🎯</div>
            <h1 style={{ color: '#fbbf24', fontSize: 30, margin: '0 0 6px', letterSpacing: 1 }}>Quiz Board Arena</h1>
            <p style={{ color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 32, maxWidth: 340 }}>Jeopardy-style trivia for 1–4 players. 12 categories · 1800+ questions · Base & Expanded packs.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
              <button onClick={() => setScreen('setup')} style={{ padding: '18px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#92400e,#fbbf24)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 24px rgba(251,191,36,0.4)' }}>
                🎮 New Game
              </button>
            </div>
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 360 }}>
              {ALL_CATEGORIES.map(c => (
                <div key={c} style={{ padding: '5px 10px', borderRadius: 6, background: `${CAT_COLORS[c] || '#888'}22`, border: `1px solid ${CAT_COLORS[c] || '#888'}40`, fontSize: 11, color: CAT_COLORS[c] || '#888', fontWeight: 700, textAlign: 'center' }}>{c}</div>
              ))}
            </div>
          </div>
        )}

        {screen === 'setup' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setScreen('menu')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>← Back</button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#fbbf24' }}>Game Setup</div>
            </div>
            <SetupScreen onStart={handleStart} />
          </>
        )}

        {screen === 'board' && gs && <BoardScreen gs={gs} onClueSelect={handleClueSelect} />}

        {screen === 'final' && gs && (
          <FinalScores players={gs.players} onMenu={handleMenu} onRematch={handleRematch} />
        )}
      </div>

      {/* Clue modal */}
      {screen === 'clue' && gs?.activeClue && (
        <ClueModal gs={gs} clue={gs.activeClue} onSubmit={handleSubmit} onTimeout={handleTimeout} paused={paused} onTogglePause={togglePause} />
      )}

      {/* Result modal */}
      {screen === 'result' && lastClue && gs && (
        <ResultModal clue={lastClue} players={gs.players} currentPlayer={(gs.currentPlayer + gs.players.length - (lastClue.correct ? 0 : 1)) % gs.players.length} earned={lastEarned} onNext={handleNext} />
      )}
    </div>
  );
}
