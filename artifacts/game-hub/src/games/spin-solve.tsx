import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { useSsOnline, type SsGs, type SsLobbyPlayer } from '../lib/ss-online';

// ─── PUZZLE LIBRARY ───────────────────────────────────────────────────────────
interface PuzzleDef { cat: string; answer: string; hint: string; difficulty: 'easy' | 'medium' | 'hard'; }
const PUZZLES: PuzzleDef[] = [
  // ─── FOOD & DRINK (54 total) ───
  { cat: 'Food & Drink',      answer: 'PIZZA PARTY',                    hint: 'A fun meal with friends',            difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHOCOLATE CAKE',                  hint: 'Sweet birthday classic',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'GRILLED CHEESE SANDWICH',         hint: 'Golden and gooey',                   difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'SPAGHETTI AND MEATBALLS',         hint: 'Italian favourite',                  difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BANANA SPLIT',                    hint: 'Ice cream dessert',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'HOT FUDGE SUNDAE',                hint: 'Drizzled with chocolate',            difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHICKEN NOODLE SOUP',             hint: 'Good for a cold day',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'FRENCH TOAST',                    hint: 'Egg-soaked breakfast bread',         difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'PEANUT BUTTER AND JELLY',         hint: 'Classic sandwich combo',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'MAC AND CHEESE',                  hint: 'Cheesy pasta dish',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'PEPPERONI PIZZA',                 hint: 'Popular Italian-American dish',      difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'FRIED CHICKEN',                   hint: 'Crispy comfort food',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'STRAWBERRY SHORTCAKE',            hint: 'Fruity dessert with whipped cream',   difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CAESAR SALAD',                    hint: 'Leafy with parmesan',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'BEEF TACOS',                      hint: 'Mexican street food favorite',       difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'LOBSTER TAIL',                    hint: 'Fancy seafood delicacy',             difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'STEAK AND POTATOES',              hint: 'Classic dinner combo',               difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CLAM CHOWDER',                    hint: 'Creamy soup in a bread bowl',        difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'APPLE PIE A LA MODE',             hint: 'Dessert with ice cream',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'TURKEY SANDWICH',                 hint: 'Deli favorite',                      difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'BEEF BURRITO',                    hint: 'Wrapped Mexican food',               difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'MASHED POTATOES',                 hint: 'Fluffy side dish',                   difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'GARLIC BREAD',                    hint: 'Aromatic Italian side',              difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'FISH AND CHIPS',                  hint: 'British pub favorite',               difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHICKEN PARMESAN',                hint: 'Breaded and saucy',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'VEGETABLE STIR FRY',              hint: 'Asian-inspired dish',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'TIRAMISU',                        hint: 'Italian layered dessert',            difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BEEF WELLINGTON',                 hint: 'Fancy beef dish',                    difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'SHRIMP SCAMPI',                   hint: 'Garlic seafood pasta',               difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'SPINACH LASAGNA',                 hint: 'Layered pasta dish',                 difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHOCOLATE MOUSSE',                hint: 'Light and fluffy dessert',           difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'ROOT BEER FLOAT',                 hint: 'Ice cream in soda',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CRAB CAKES',                      hint: 'Seafood appetizer',                  difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'EGGPLANT PARMESAN',               hint: 'Breaded vegetable dish',             difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BEEF STEW',                       hint: 'Hearty comfort food',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CHERRY CHEESECAKE',               hint: 'Fruit topped dessert',               difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'PAD THAI',                        hint: 'Thai noodle dish',                   difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'FETA CHEESE SALAD',               hint: 'Mediterranean choice',               difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'BAKED SALMON',                    hint: 'Healthy fish dinner',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'VANILLA PUDDING',                 hint: 'Creamy classic dessert',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'LEMON MERINGUE PIE',              hint: 'Tangy dessert with fluffy top',       difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'SHRIMP COCKTAIL',                 hint: 'Seafood appetizer',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'BEEF BRISKET',                    hint: 'Slow cooked meat',                   difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'CARROT CAKE',                     hint: 'Orange-hued dessert',                difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'PECAN PIE',                       hint: 'Southern dessert classic',           difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'FRENCH ONION SOUP',               hint: 'Cheesy soup',                        difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BREAD PUDDING',                   hint: 'Dessert made from leftover bread',   difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'PRIME RIB',                       hint: 'Expensive cut of beef',              difficulty: 'medium' },
  { cat: 'Food & Drink',      answer: 'BAKED ZITI',                      hint: 'Cheesy pasta casserole',             difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'ALMOND JOY',                       hint: 'Coconut candy bar',                  difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'LATTE',                           hint: 'Coffee with steamed milk',           difficulty: 'easy' },
  { cat: 'Food & Drink',      answer: 'GAZPACHO',                        hint: 'Cold Spanish soup',                  difficulty: 'medium' },
  
  // ─── PHRASE (100 total) ───
  { cat: 'Phrase',            answer: 'BETTER LATE THAN NEVER',          hint: 'Arriving on time is overrated',      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'PIECE OF CAKE',                   hint: 'Extremely easy',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BREAK A LEG',                     hint: 'Good luck on stage',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'UNDER THE WEATHER',               hint: 'Feeling ill',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HIT THE NAIL ON THE HEAD',        hint: 'Exactly right',                      difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'LET THE CAT OUT OF THE BAG',      hint: 'Revealed a secret',                  difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'BITE THE BULLET',                 hint: 'Endure a painful situation',         difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'ACTIONS SPEAK LOUDER THAN WORDS', hint: 'Do, not just say',                   difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'THE EARLY BIRD CATCHES THE WORM', hint: 'Rewards for being first',            difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'EVERY CLOUD HAS A SILVER LINING', hint: 'Optimism in bad times',              difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'WHEN IN ROME DO AS THE ROMANS DO',hint: 'Follow local customs',               difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'SPILL THE BEANS',                 hint: 'Tell a secret',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BEAT AROUND THE BUSH',            hint: 'Avoid the main topic',               difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'SICK AS A DOG',                   hint: 'Very ill',                           difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'RAINING CATS AND DOGS',           hint: 'Heavy rain',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SLEEPING LIKE A BABY',            hint: 'Deeply rested',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HAPPY AS A CLAM',                 hint: 'Very satisfied',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SMART AS A WHIP',                 hint: 'Very intelligent',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'STRONG AS AN OX',                 hint: 'Very powerful',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'QUICK AS A WINK',                 hint: 'Very fast',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SOBER AS A JUDGE',                hint: 'Serious and level-headed',           difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'GENTLE AS A LAMB',                hint: 'Kind and mild',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BUSY AS A BEE',                   hint: 'Very productive',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BOLD AS BRASS',                   hint: 'Very confident',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SLIPPERY AS AN EEL',              hint: 'Hard to catch',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SHARP AS A TACK',                 hint: 'Very clever',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'FLAT AS A PANCAKE',               hint: 'Completely flat',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LIGHT AS A FEATHER',              hint: 'Very lightweight',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HEAVY AS LEAD',                   hint: 'Very heavy',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'COLD AS ICE',                     hint: 'Very chilly',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HOT AS FIRE',                     hint: 'Very warm',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DRY AS A BONE',                   hint: 'Completely dry',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WET AS A FISH',                   hint: 'Soaking wet',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HARD AS STEEL',                   hint: 'Very durable',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SOFT AS SILK',                    hint: 'Very smooth',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SMOOTH AS BUTTER',                hint: 'Very slick',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'ROUGH AS SANDPAPER',              hint: 'Very coarse',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SWEET AS HONEY',                  hint: 'Very pleasant',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SOUR AS A LEMON',                 hint: 'Very acidic',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BITTER AS GALL',                  hint: 'Very harsh',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'STIFF AS A BOARD',                hint: 'Very rigid',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LOOSE AS A GOOSE',                hint: 'Very relaxed',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'QUIET AS A DORMOUSE',             hint: 'Very silent',                        difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'LOUD AS A HORN',                  hint: 'Very noisy',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DARK AS MIDNIGHT',                hint: 'Very dark',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BRIGHT AS SUNSHINE',              hint: 'Very bright',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'CRAZY AS A LOON',                 hint: 'Very wild',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DULL AS DISHWATER',               hint: 'Very boring',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DUMB AS A DOORKNOB',              hint: 'Very stupid',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'FUN AND GAMES',                   hint: 'Enjoyable activities',               difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SAFE AND SOUND',                  hint: 'Out of danger',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'FIRE AND ICE',                    hint: 'Opposites',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'STOP AND SMELL THE ROSES',        hint: 'Slow down to appreciate life',       difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'TRUTH BE TOLD',                   hint: 'To be honest',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'COME HELL OR HIGH WATER',         hint: 'No matter what happens',             difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'IN DUE COURSE',                   hint: 'Eventually',                         difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'WITH ALL DUE RESPECT',            hint: 'Polite disagreement',                difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'WHAT GOES AROUND COMES AROUND',   hint: 'Karma',                              difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'FORGIVE AND FORGET',              hint: 'Let it go',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LIVE AND LEARN',                  hint: 'Gain wisdom from experience',        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LEARN FROM YOUR MISTAKES',        hint: 'Be wiser next time',                 difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'MAKE A LONG STORY SHORT',         hint: 'Get to the point',                   difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'TIME WILL TELL',                  hint: 'The future will show',               difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'NO TIME LIKE THE PRESENT',        hint: 'Do it now',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'THERE IS NO PLACE LIKE HOME',     hint: 'Home is best',                       difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'THE BALL IS IN YOUR COURT',       hint: 'Your turn now',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'TAKE ONE FOR THE TEAM',           hint: 'Make a sacrifice',                   difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'ONCE IN A BLUE MOON',             hint: 'Very rarely',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BEAT A DEAD HORSE',               hint: 'Waste effort on futile task',        difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'BARKING UP THE WRONG TREE',       hint: 'Wrong approach',                     difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'CROSS THAT BRIDGE WHEN WE COME TO IT', hint: 'Handle problems later',        difficulty: 'hard' },
  { cat: 'Phrase',            answer: 'COMPARE APPLES AND ORANGES',      hint: 'Unfair comparison',                  difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'CAUGHT RED HANDED',               hint: 'Caught in the act',                  difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'CLOSE BUT NO CIGAR',              hint: 'Almost but not quite',               difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'COOL AS A CUCUMBER',              hint: 'Very calm',                          difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'CRY OVER SPILLED MILK',           hint: 'Regret past mistakes',               difficulty: 'medium' },
  { cat: 'Phrase',            answer: 'CUT TO THE CHASE',                hint: 'Get to the point',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DEEP IN THOUGHT',                 hint: 'Very concentrated',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DOWN IN THE DUMPS',               hint: 'Very sad',                           difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DOWN THE HATCH',                  hint: 'Drink up',                           difficulty: 'easy' },
  
  // ─── PLACES (80 total) ───
  { cat: 'Place',             answer: 'NEW YORK CITY',                   hint: 'The Big Apple',                      difficulty: 'easy' },
  { cat: 'Place',             answer: 'EIFFEL TOWER',                    hint: 'Paris landmark',                     difficulty: 'easy' },
  { cat: 'Place',             answer: 'NIAGARA FALLS',                   hint: 'Thundering waterfall on the border', difficulty: 'easy' },
  { cat: 'Place',             answer: 'GRAND CANYON',                    hint: 'Deep gorge in Arizona',              difficulty: 'easy' },
  { cat: 'Place',             answer: 'MOUNT EVEREST',                   hint: "World's highest peak",               difficulty: 'medium' },
  { cat: 'Place',             answer: 'AMAZON RAIN FOREST',              hint: 'Lungs of the Earth',                 difficulty: 'medium' },
  { cat: 'Place',             answer: 'SYDNEY OPERA HOUSE',              hint: 'Iconic Australian venue',            difficulty: 'medium' },
  { cat: 'Place',             answer: 'GREAT BARRIER REEF',              hint: 'Coral wonder off Australia',         difficulty: 'medium' },
  { cat: 'Place',             answer: 'STATUE OF LIBERTY',               hint: 'New York landmark',                  difficulty: 'easy' },
  { cat: 'Place',             answer: 'BIG BEN',                         hint: 'London clock tower',                 difficulty: 'easy' },
  { cat: 'Place',             answer: 'COLOSSEUM',                       hint: 'Ancient Roman ruin',                 difficulty: 'medium' },
  { cat: 'Place',             answer: 'GREAT WALL OF CHINA',             hint: 'Massive defensive structure',        difficulty: 'medium' },
  { cat: 'Place',             answer: 'LEANING TOWER OF PISA',           hint: 'Tilted Italian landmark',            difficulty: 'medium' },
  { cat: 'Place',             answer: 'KREMLIN',                         hint: 'Moscow fortress',                    difficulty: 'medium' },
  { cat: 'Place',             answer: 'BUCKINGHAM PALACE',               hint: 'Royal residence in London',          difficulty: 'medium' },
  { cat: 'Place',             answer: 'ALHAMBRA',                        hint: 'Granada palace',                     difficulty: 'medium' },
  { cat: 'Place',             answer: 'VERSAILLES',                      hint: 'French palace',                      difficulty: 'medium' },
  { cat: 'Place',             answer: 'MACHU PICCHU',                    hint: 'Peruvian ruins',                     difficulty: 'medium' },
  { cat: 'Place',             answer: 'LOST CITY OF ATLANTIS',           hint: 'Mythical underwater city',            difficulty: 'hard' },
  { cat: 'Place',             answer: 'STONEHENGE',                      hint: 'Ancient English monument',           difficulty: 'medium' },
  { cat: 'Place',             answer: 'TAJ MAHAL',                       hint: 'Indian mausoleum',                   difficulty: 'medium' },
  { cat: 'Place',             answer: 'MOUNT RUSHMORE',                  hint: 'South Dakota landmark',              difficulty: 'medium' },
  { cat: 'Place',             answer: 'HOLLYWOOD SIGN',                  hint: 'Los Angeles landmark',               difficulty: 'easy' },
  { cat: 'Place',             answer: 'GOLDEN GATE BRIDGE',              hint: 'San Francisco landmark',             difficulty: 'easy' },
  { cat: 'Place',             answer: 'EMPIRE STATE BUILDING',           hint: 'NYC skyscraper',                     difficulty: 'easy' },
  { cat: 'Place',             answer: 'STATUE OF JESUS',                 hint: 'Rio de Janeiro monument',            difficulty: 'medium' },
  { cat: 'Place',             answer: 'PYRAMIDS OF GIZA',                hint: 'Ancient Egyptian monuments',         difficulty: 'medium' },
  { cat: 'Place',             answer: 'SPHINX',                          hint: 'Egyptian limestone statue',          difficulty: 'medium' },
  { cat: 'Place',             answer: 'ACROPOLIS',                       hint: 'Athens landmark',                    difficulty: 'medium' },
  { cat: 'Place',             answer: 'PARTHENON',                       hint: 'Greek temple',                       difficulty: 'medium' },
  { cat: 'Place',             answer: 'VATICAN CITY',                    hint: 'World smallest country',             difficulty: 'medium' },
  { cat: 'Place',             answer: 'KNOSSOS PALACE',                  hint: 'Minoan ruins',                       difficulty: 'hard' },
  { cat: 'Place',             answer: 'FORBIDDEN CITY',                  hint: 'Beijing palace complex',             difficulty: 'medium' },
  { cat: 'Place',             answer: 'ANGKOR WAT',                      hint: 'Cambodian temple',                   difficulty: 'medium' },
  { cat: 'Place',             answer: 'GREAT SPHINX OF GIZA',            hint: 'Ancient Egyptian monument',          difficulty: 'medium' },
  { cat: 'Place',             answer: 'PETRA',                           hint: 'Jordan ancient city',                difficulty: 'medium' },
  { cat: 'Place',             answer: 'MOAI',                            hint: 'Easter Island statues',              difficulty: 'medium' },
  { cat: 'Place',             answer: 'BALI',                            hint: 'Indonesian island paradise',         difficulty: 'easy' },
  { cat: 'Place',             answer: 'MALDIVES',                        hint: 'Island resort destination',          difficulty: 'easy' },
  { cat: 'Place',             answer: 'HAWAII',                          hint: 'US island state',                    difficulty: 'easy' },
  { cat: 'Place',             answer: 'ICELAND',                         hint: 'Land of fire and ice',               difficulty: 'easy' },
  { cat: 'Place',             answer: 'NEW ZEALAND',                     hint: 'Aotearoa',                           difficulty: 'easy' },
  { cat: 'Place',             answer: 'CARIBBEAN SEA',                   hint: 'Tropical sea region',                difficulty: 'medium' },
  { cat: 'Place',             answer: 'SWISS ALPS',                      hint: 'European mountain range',            difficulty: 'medium' },
  { cat: 'Place',             answer: 'SAHARA DESERT',                   hint: 'African desert',                     difficulty: 'easy' },
  { cat: 'Place',             answer: 'CARIBBEAN',                       hint: 'Tropical island region',             difficulty: 'easy' },
  { cat: 'Place',             answer: 'ARCTIC CIRCLE',                   hint: 'Polar region',                       difficulty: 'medium' },
  { cat: 'Place',             answer: 'ANTARCTIC',                       hint: 'South Pole region',                  difficulty: 'easy' },
  { cat: 'Place',             answer: 'DEAD SEA',                        hint: 'Lowest point on Earth',              difficulty: 'medium' },
  { cat: 'Place',             answer: 'PATAGONIA',                       hint: 'South American region',              difficulty: 'medium' },
  { cat: 'Place',             answer: 'SERENGETI',                       hint: 'African savanna',                    difficulty: 'medium' },
  { cat: 'Place',             answer: 'KILIMANJARO',                     hint: 'African mountain',                   difficulty: 'medium' },
  { cat: 'Place',             answer: 'VICTORIA FALLS',                  hint: 'African waterfall',                  difficulty: 'medium' },
  { cat: 'Place',             answer: 'DEATH VALLEY',                    hint: 'Hottest place in US',                difficulty: 'medium' },
  { cat: 'Place',             answer: 'MOAB',                            hint: 'Utah desert town',                   difficulty: 'easy' },
  { cat: 'Place',             answer: 'SEDONA',                          hint: 'Arizona red rocks',                  difficulty: 'easy' },
  { cat: 'Place',             answer: 'YOSEMITE VALLEY',                 hint: 'California national park',           difficulty: 'medium' },
  { cat: 'Place',             answer: 'YELLOWSTONE',                     hint: 'Geyser national park',               difficulty: 'easy' },
  { cat: 'Place',             answer: 'BANFF',                           hint: 'Canadian national park',             difficulty: 'medium' },
  { cat: 'Place',             answer: 'CANADIAN ROCKIES',                hint: 'Mountain range in Canada',           difficulty: 'medium' },
  { cat: 'Place',             answer: 'DUBAI',                           hint: 'Gulf desert city',                   difficulty: 'easy' },
  { cat: 'Place',             answer: 'SINGAPORE',                       hint: 'City-state in Asia',                 difficulty: 'easy' },
  { cat: 'Place',             answer: 'HONG KONG',                       hint: 'Harbor city in Asia',                difficulty: 'easy' },
  { cat: 'Place',             answer: 'BANGKOK',                         hint: 'Thai capital',                       difficulty: 'easy' },
  { cat: 'Place',             answer: 'MANILA',                          hint: 'Philippine capital',                 difficulty: 'easy' },
  { cat: 'Place',             answer: 'ISTANBUL',                        hint: 'Turkish city between continents',    difficulty: 'medium' },
  { cat: 'Place',             answer: 'CAIRO',                           hint: 'Egyptian capital',                   difficulty: 'easy' },
  { cat: 'Place',             answer: 'JOHANNESBURG',                    hint: 'South African city',                 difficulty: 'easy' },
  { cat: 'Place',             answer: 'BUENOS AIRES',                    hint: 'Argentine capital',                  difficulty: 'easy' },
  { cat: 'Place',             answer: 'SANTIAGO',                        hint: 'Chilean capital',                    difficulty: 'easy' },
  { cat: 'Place',             answer: 'LIMA',                            hint: 'Peruvian capital',                   difficulty: 'easy' },
  
  // ─── MOVIE TITLES (70 total) ───
  { cat: 'Movie',             answer: 'THE LION KING',                   hint: 'Hakuna Matata',                      difficulty: 'easy' },
  { cat: 'Movie',             answer: 'JURASSIC PARK',                   hint: 'Dinosaurs on the loose',             difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE WIZARD OF OZ',                hint: 'Follow the yellow brick road',       difficulty: 'easy' },
  { cat: 'Movie',             answer: 'STAR WARS',                       hint: 'May the Force be with you',          difficulty: 'easy' },
  { cat: 'Movie',             answer: 'HOME ALONE',                      hint: 'Kid defends the house',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'BACK TO THE FUTURE',              hint: 'Flux capacitor required',            difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE SHINING',                     hint: 'Haunted hotel movie',                difficulty: 'medium' },
  { cat: 'Movie',             answer: 'JAWS',                            hint: 'Big shark movie',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'E.T.',                            hint: 'Extraterrestrial friend',            difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE SIXTH SENSE',                 hint: 'I see dead people',                  difficulty: 'medium' },
  { cat: 'Movie',             answer: 'TITANIC',                         hint: 'Iceberg tragedy',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'AVATAR',                          hint: 'Blue aliens on Pandora',             difficulty: 'easy' },
  { cat: 'Movie',             answer: 'INCEPTION',                       hint: 'Dreams within dreams',               difficulty: 'medium' },
  { cat: 'Movie',             answer: 'INTERSTELLAR',                    hint: 'Space exploration epic',             difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE MATRIX',                      hint: 'Red pill or blue pill',              difficulty: 'medium' },
  { cat: 'Movie',             answer: 'GLADIATOR',                       hint: 'Ancient Rome combat',                difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SAVING PRIVATE RYAN',             hint: 'World War II film',                  difficulty: 'easy' },
  { cat: 'Movie',             answer: 'FORREST GUMP',                    hint: 'Life is like a box of chocolates',   difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE SHAWSHANK REDEMPTION',        hint: 'Prison drama',                       difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE GODFATHER',                   hint: 'Mafia classic',                      difficulty: 'medium' },
  { cat: 'Movie',             answer: 'PULP FICTION',                    hint: 'Tarantino crime film',               difficulty: 'medium' },
  { cat: 'Movie',             answer: 'FIGHT CLUB',                      hint: 'Secret organization',                difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE DARK KNIGHT',                 hint: 'Batman superhero film',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE AVENGERS',                    hint: 'Marvel superhero team',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'IRON MAN',                        hint: 'Tony Stark robot suit',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'CAPTAIN AMERICA',                 hint: 'Super soldier hero',                 difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE HULK',                        hint: 'Green rage monster',                 difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THOR',                            hint: 'Norse god with hammer',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'BLACK PANTHER',                   hint: 'Wakandan hero',                      difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SPIDER-MAN',                      hint: 'Web-slinging superhero',             difficulty: 'easy' },
  { cat: 'Movie',             answer: 'DOCTOR STRANGE',                  hint: 'Sorcerer supreme',                   difficulty: 'medium' },
  { cat: 'Movie',             answer: 'GUARDIANS OF THE GALAXY',         hint: 'Space adventure team',               difficulty: 'medium' },
  { cat: 'Movie',             answer: 'ANT-MAN',                         hint: 'Tiny superhero',                     difficulty: 'easy' },
  { cat: 'Movie',             answer: 'AQUAMAN',                         hint: 'Underwater king',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'WONDER WOMAN',                    hint: 'Amazonian hero',                     difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SUPERMAN',                        hint: 'Man of steel',                       difficulty: 'easy' },
  { cat: 'Movie',             answer: 'BATMAN',                          hint: 'Caped crusader',                     difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE FLASH',                       hint: 'Speedster hero',                     difficulty: 'easy' },
  { cat: 'Movie',             answer: 'FROZEN',                          hint: 'Let it go',                          difficulty: 'easy' },
  { cat: 'Movie',             answer: 'MOANA',                           hint: 'Ocean journey',                      difficulty: 'easy' },
  { cat: 'Movie',             answer: 'ENCANTO',                         hint: 'Magic house in Colombia',            difficulty: 'easy' },
  { cat: 'Movie',             answer: 'COCO',                            hint: 'Day of the dead',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'FINDING NEMO',                    hint: 'Fish quest',                         difficulty: 'easy' },
  { cat: 'Movie',             answer: 'TOY STORY',                       hint: 'Toys come alive',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SHREK',                           hint: 'Ogre in swamp',                      difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SHREK TWO',                       hint: 'Ogre sequal adventure',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'MADAGASCAR',                      hint: 'Zoo animals in Africa',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'KUNG FU PANDA',                   hint: 'Martial arts bear',                  difficulty: 'easy' },
  { cat: 'Movie',             answer: 'HOW TO TRAIN YOUR DRAGON',        hint: 'Viking dragon rider',                difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE INCREDIBLES',                 hint: 'Superhero family',                   difficulty: 'easy' },
  { cat: 'Movie',             answer: 'CARS',                            hint: 'Talking automobiles',                difficulty: 'easy' },
  { cat: 'Movie',             answer: 'RATATOUILLE',                     hint: 'Cooking rat',                        difficulty: 'easy' },
  { cat: 'Movie',             answer: 'WALL-E',                          hint: 'Lonely robot',                       difficulty: 'easy' },
  { cat: 'Movie',             answer: 'UP',                              hint: 'Flying house',                       difficulty: 'easy' },
  { cat: 'Movie',             answer: 'MONSTERS INC',                    hint: 'Scare corporation',                  difficulty: 'easy' },
  { cat: 'Movie',             answer: 'THE SIMPSONS MOVIE',              hint: 'Yellow family on film',              difficulty: 'easy' },
  { cat: 'Movie',             answer: 'SOUTH PARK BIGGER LONGER UNCUT',  hint: 'Animated road trip',                 difficulty: 'hard' },
  { cat: 'Movie',             answer: 'SONIC THE HEDGEHOG',              hint: 'Blue speedster movie',               difficulty: 'easy' },
  { cat: 'Movie',             answer: 'DETECTIVE PIKACHU',               hint: 'Pokemon mystery',                    difficulty: 'easy' },
  { cat: 'Movie',             answer: 'DUNE',                            hint: 'Desert planet epic',                 difficulty: 'easy' },
  { cat: 'Movie',             answer: 'OPPENHEIMER',                     hint: 'Atomic bomb scientist',              difficulty: 'hard' },
  { cat: 'Movie',             answer: 'BARBIE',                          hint: 'Doll world adventure',               difficulty: 'easy' },
  { cat: 'Movie',             answer: 'KILLERS OF THE FLOWER MOON',      hint: 'Crime drama film',                   difficulty: 'medium' },
  { cat: 'Movie',             answer: 'THE BRUTALIST',                   hint: 'American architectural drama',       difficulty: 'hard' },
  { cat: 'Movie',             answer: 'POOR THINGS',                     hint: 'Quirky fantasy film',                difficulty: 'medium' },
  
  // ─── FAMOUS PEOPLE (80 total) ───
  { cat: 'Person',            answer: 'ALBERT EINSTEIN',                 hint: 'Theory of relativity',               difficulty: 'easy' },
  { cat: 'Person',            answer: 'MICHAEL JORDAN',                  hint: 'Basketball GOAT',                    difficulty: 'easy' },
  { cat: 'Person',            answer: 'TAYLOR SWIFT',                    hint: 'Pop music superstar',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'OPRAH WINFREY',                   hint: 'Legendary talk show host',           difficulty: 'medium' },
  { cat: 'Person',            answer: 'LEONARDO DA VINCI',               hint: 'Renaissance genius',                 difficulty: 'medium' },
  { cat: 'Person',            answer: 'QUEEN ELIZABETH',                 hint: 'British monarch',                    difficulty: 'medium' },
  { cat: 'Person',            answer: 'ABRAHAM LINCOLN',                 hint: 'US president',                       difficulty: 'easy' },
  { cat: 'Person',            answer: 'GEORGE WASHINGTON',               hint: 'First US president',                 difficulty: 'easy' },
  { cat: 'Person',            answer: 'THOMAS JEFFERSON',                hint: 'Declaration of Independence',        difficulty: 'medium' },
  { cat: 'Person',            answer: 'BENJAMIN FRANKLIN',               hint: 'Founding father',                    difficulty: 'medium' },
  { cat: 'Person',            answer: 'NAPOLEON BONAPARTE',              hint: 'French military leader',             difficulty: 'medium' },
  { cat: 'Person',            answer: 'CLEOPATRA',                       hint: 'Ancient Egyptian queen',             difficulty: 'medium' },
  { cat: 'Person',            answer: 'JULIUS CAESAR',                   hint: 'Roman general',                      difficulty: 'medium' },
  { cat: 'Person',            answer: 'WILLIAM SHAKESPEARE',             hint: 'English playwright',                 difficulty: 'medium' },
  { cat: 'Person',            answer: 'JANE AUSTEN',                     hint: 'English novelist',                   difficulty: 'medium' },
  { cat: 'Person',            answer: 'CHARLES DICKENS',                 hint: 'Victorian writer',                   difficulty: 'medium' },
  { cat: 'Person',            answer: 'MARK TWAIN',                      hint: 'American humorist',                  difficulty: 'medium' },
  { cat: 'Person',            answer: 'EDGAR ALLAN POE',                 hint: 'Horror writer',                      difficulty: 'medium' },
  { cat: 'Person',            answer: 'STEPHEN KING',                    hint: 'Horror novelist',                    difficulty: 'easy' },
  { cat: 'Person',            answer: 'J.K. ROWLING',                    hint: 'Harry Potter author',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'GEORGE ORWELL',                   hint: '1984 author',                        difficulty: 'medium' },
  { cat: 'Person',            answer: 'MAYA ANGELOU',                    hint: 'American poet',                      difficulty: 'medium' },
  { cat: 'Person',            answer: 'MALCOLM X',                       hint: 'Civil rights leader',                difficulty: 'medium' },
  { cat: 'Person',            answer: 'MARTIN LUTHER KING JR',           hint: 'I have a dream',                     difficulty: 'medium' },
  { cat: 'Person',            answer: 'ROSA PARKS',                      hint: 'Civil rights activist',              difficulty: 'medium' },
  { cat: 'Person',            answer: 'NELSON MANDELA',                  hint: 'South African freedom fighter',      difficulty: 'medium' },
  { cat: 'Person',            answer: 'GANDHI',                          hint: 'Indian independence leader',         difficulty: 'medium' },
  { cat: 'Person',            answer: 'JESUS CHRIST',                    hint: 'Religious figure',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'BUDDHA',                          hint: 'Spiritual leader',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'MUHAMMED',                        hint: 'Islamic prophet',                    difficulty: 'medium' },
  { cat: 'Person',            answer: 'ISAAC NEWTON',                    hint: 'Gravity physicist',                  difficulty: 'medium' },
  { cat: 'Person',            answer: 'MARIE CURIE',                     hint: 'Radioactivity scientist',            difficulty: 'medium' },
  { cat: 'Person',            answer: 'CHARLES DARWIN',                  hint: 'Evolution theorist',                 difficulty: 'medium' },
  { cat: 'Person',            answer: 'STEPHEN HAWKING',                 hint: 'Theoretical physicist',              difficulty: 'medium' },
  { cat: 'Person',            answer: 'ELON MUSK',                       hint: 'Tesla founder',                      difficulty: 'easy' },
  { cat: 'Person',            answer: 'STEVE JOBS',                      hint: 'Apple founder',                      difficulty: 'easy' },
  { cat: 'Person',            answer: 'BILL GATES',                      hint: 'Microsoft founder',                  difficulty: 'easy' },
  { cat: 'Person',            answer: 'MARK ZUCKERBERG',                 hint: 'Facebook founder',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'JEFF BEZOS',                      hint: 'Amazon founder',                     difficulty: 'easy' },
  { cat: 'Person',            answer: 'WARREN BUFFETT',                  hint: 'Investment guru',                    difficulty: 'medium' },
  { cat: 'Person',            answer: 'HENRY FORD',                      hint: 'Automobile manufacturer',            difficulty: 'medium' },
  { cat: 'Person',            answer: 'THOMAS EDISON',                   hint: 'Light bulb inventor',                difficulty: 'medium' },
  { cat: 'Person',            answer: 'THE WRIGHT BROTHERS',             hint: 'Airplane inventors',                 difficulty: 'medium' },
  { cat: 'Person',            answer: 'BETTY WHITE',                     hint: 'Actress and producer',               difficulty: 'easy' },
  { cat: 'Person',            answer: 'AUDREY HEPBURN',                  hint: 'Actress and humanitarian',            difficulty: 'medium' },
  { cat: 'Person',            answer: 'MARILYN MONROE',                  hint: 'Golden Age actress',                 difficulty: 'easy' },
  { cat: 'Person',            answer: 'ELIZABETH TAYLOR',                hint: 'Actress and philanthropist',         difficulty: 'medium' },
  { cat: 'Person',            answer: 'GRACE KELLY',                     hint: 'Actress and princess',               difficulty: 'medium' },
  { cat: 'Person',            answer: 'CHARLIZE THERON',                 hint: 'South African actress',              difficulty: 'easy' },
  { cat: 'Person',            answer: 'MERYL STREEP',                    hint: 'Acclaimed actress',                  difficulty: 'easy' },
  { cat: 'Person',            answer: 'TOM HANKS',                       hint: 'American actor',                     difficulty: 'easy' },
  { cat: 'Person',            answer: 'MORGAN FREEMAN',                  hint: 'Actor with deep voice',              difficulty: 'easy' },
  { cat: 'Person',            answer: 'LEONARDO DICAPRIO',               hint: 'Oscar-winning actor',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'JOHNNY DEPP',                     hint: 'Unconventional actor',               difficulty: 'easy' },
  { cat: 'Person',            answer: 'BRAD PITT',                       hint: 'Hollywood heartthrob',               difficulty: 'easy' },
  { cat: 'Person',            answer: 'GEORGE CLOONEY',                  hint: 'Actor and producer',                 difficulty: 'easy' },
  { cat: 'Person',            answer: 'DENZEL WASHINGTON',               hint: 'Acclaimed actor',                    difficulty: 'easy' },
  { cat: 'Person',            answer: 'WILL SMITH',                      hint: 'Actor and rapper',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'KEANU REEVES',                    hint: 'The Matrix actor',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'JACK NICHOLSON',                  hint: 'Here is Johnny',                     difficulty: 'medium' },
  { cat: 'Person',            answer: 'HARRISON FORD',                   hint: 'Indiana Jones actor',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'ARNOLD SCHWARZENEGGER',           hint: 'Terminator actor',                   difficulty: 'easy' },
  { cat: 'Person',            answer: 'SYLVESTER STALLONE',              hint: 'Rocky actor',                        difficulty: 'easy' },
  { cat: 'Person',            answer: 'JEAN CLAUDE VAN DAMME',           hint: 'Action movie star',                  difficulty: 'medium' },
  { cat: 'Person',            answer: 'JACKIE CHAN',                     hint: 'Martial arts actor',                 difficulty: 'easy' },
  { cat: 'Person',            answer: 'BRUCE LEE',                       hint: 'Martial arts legend',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'ELVIS PRESLEY',                   hint: 'The King of rock and roll',          difficulty: 'easy' },
  { cat: 'Person',            answer: 'THE BEATLES',                     hint: 'British rock band',                  difficulty: 'easy' },
  { cat: 'Person',            answer: 'BOB DYLAN',                       hint: 'Folk rock musician',                 difficulty: 'easy' },
  { cat: 'Person',            answer: 'DAVID BOWIE',                     hint: 'Glam rock icon',                     difficulty: 'easy' },
  { cat: 'Person',            answer: 'PRINCE',                          hint: 'Purple music icon',                  difficulty: 'easy' },
  { cat: 'Person',            answer: 'MICHAEL JACKSON',                 hint: 'King of pop',                        difficulty: 'easy' },
  { cat: 'Person',            answer: 'MADONNA',                         hint: 'Material girl',                      difficulty: 'easy' },
  { cat: 'Person',            answer: 'BEYONCE',                         hint: 'Superstar performer',                difficulty: 'easy' },
  { cat: 'Person',            answer: 'LADY GAGA',                       hint: 'Born This Way',                      difficulty: 'easy' },
  { cat: 'Person',            answer: 'THE ROLLING STONES',              hint: 'Legendary rock band',                difficulty: 'medium' },
  
  // ─── THINGS (100 total) ───
  { cat: 'Thing',             answer: 'ROLLER COASTER',                  hint: 'Thrilling amusement ride',           difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BIRTHDAY SURPRISE',               hint: 'Unexpected party',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MAGIC CARPET RIDE',               hint: 'Flying on a rug',                    difficulty: 'medium' },
  { cat: 'Thing',             answer: 'SHOOTING STARS',                  hint: 'Make a wish',                        difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DIAMOND RING',                    hint: 'A sparkling proposal',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TREASURE MAP',                    hint: 'X marks the spot',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TIME MACHINE',                    hint: 'Travel through history',             difficulty: 'medium' },
  { cat: 'Thing',             answer: 'SUBMARINE SANDWICH',              hint: 'Long deli creation',                 difficulty: 'medium' },
  { cat: 'Thing',             answer: 'LIGHT SABER',                     hint: 'Star Wars weapon',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CRYSTAL BALL',                    hint: 'Fortune teller tool',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'FOUNTAIN OF YOUTH',               hint: 'Legendary spring',                   difficulty: 'medium' },
  { cat: 'Thing',             answer: 'WEDDING DRESS',                   hint: 'Bride attire',                       difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WEDDING CAKE',                    hint: 'Celebration dessert',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WEDDING RING',                    hint: 'Symbol of marriage',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WEDDING BOUQUET',                 hint: 'Bride flowers',                      difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MOTORCYCLE',                      hint: 'Two-wheeled vehicle',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'LUXURY CAR',                      hint: 'High-end automobile',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SPORTS CAR',                      hint: 'Fast automobile',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'HELICOPTER',                      hint: 'Flying machine',                     difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SUBMARINE',                       hint: 'Underwater vessel',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SPACESHIP',                       hint: 'Interstellar vehicle',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'ROCKET',                          hint: 'Space vehicle',                      difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SAILBOAT',                        hint: 'Windpowered boat',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'YACHT',                           hint: 'Luxury boat',                        difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CRUISE SHIP',                     hint: 'Vacation vessel',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'AIRCRAFT CARRIER',                hint: 'Navy warship',                       difficulty: 'medium' },
  { cat: 'Thing',             answer: 'BULLDOZER',                       hint: 'Construction vehicle',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'EXCAVATOR',                       hint: 'Digging machine',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CRANE',                           hint: 'Lifting machine',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'FERRIS WHEEL',                    hint: 'Amusement park ride',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CAROUSEL',                        hint: 'Spinning horses ride',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MERRY GO ROUND',                  hint: 'Circular amusement ride',            difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BUMPER CARS',                     hint: 'Crashing amusement ride',            difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TELEPHONE',                       hint: 'Communication device',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TELEVISION',                      hint: 'Entertainment box',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'COMPUTER',                        hint: 'Computing machine',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SMARTPHONE',                      hint: 'Mobile device',                      difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TABLET',                          hint: 'Flat screen device',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'LAPTOP',                          hint: 'Portable computer',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'REFRIGERATOR',                    hint: 'Cold appliance',                     difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MICROWAVE',                       hint: 'Heating appliance',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DISHWASHER',                      hint: 'Cleaning machine',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WASHING MACHINE',                 hint: 'Clothes cleaner',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DRYER',                           hint: 'Clothes drying machine',             difficulty: 'easy' },
  { cat: 'Thing',             answer: 'VACUUM CLEANER',                  hint: 'Floor cleaning device',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'AIR CONDITIONER',                 hint: 'Cooling system',                     difficulty: 'easy' },
  { cat: 'Thing',             answer: 'HEATER',                          hint: 'Warming system',                     difficulty: 'easy' },
  { cat: 'Thing',             answer: 'THERMOSTAT',                      hint: 'Temperature control',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'ALARM CLOCK',                     hint: 'Waking device',                      difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WRISTWATCH',                      hint: 'Wrist timepiece',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'WALL CLOCK',                      hint: 'Hanging timepiece',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'POCKET WATCH',                    hint: 'Vintage timepiece',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CHESS SET',                       hint: 'Strategy board game',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CHECKERS BOARD',                  hint: 'Classic board game',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MONOPOLY BOARD',                  hint: 'Property board game',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'PLAYING CARDS',                   hint: 'Card game tools',                    difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DICE',                            hint: 'Gaming cubes',                       difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BASKETBALL',                      hint: 'Shooting sport ball',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'FOOTBALL',                        hint: 'Tackling sport ball',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SOCCER BALL',                     hint: 'Kicking sport ball',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BASEBALL',                        hint: 'Hitting sport ball',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TENNIS RACKET',                   hint: 'Racquet sport equipment',            difficulty: 'easy' },
  { cat: 'Thing',             answer: 'GOLF CLUB',                       hint: 'Golfing equipment',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SKI',                             hint: 'Snow sliding equipment',             difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SKATEBOARD',                      hint: 'Trick sport board',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BICYCLE',                         hint: 'Pedal-powered vehicle',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TRICYCLE',                        hint: 'Three-wheeled bike',                 difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SCOOTER',                         hint: 'Standing wheeled device',            difficulty: 'easy' },
  { cat: 'Thing',             answer: 'ROLLER SKATES',                   hint: 'Wheeled foot gear',                  difficulty: 'easy' },
  { cat: 'Thing',             answer: 'ICE SKATES',                      hint: 'Winter foot gear',                   difficulty: 'easy' },
  { cat: 'Thing',             answer: 'ROLLER BLADES',                   hint: 'Inline wheeled shoes',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'GUITAR',                          hint: 'Stringed musical instrument',        difficulty: 'easy' },
  { cat: 'Thing',             answer: 'PIANO',                           hint: 'Keyboard musical instrument',        difficulty: 'easy' },
  { cat: 'Thing',             answer: 'VIOLIN',                          hint: 'Bow stringed instrument',            difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TRUMPET',                         hint: 'Brass wind instrument',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SAXOPHONE',                       hint: 'Jazz wind instrument',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'DRUMS',                           hint: 'Percussion instrument',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'FLUTE',                           hint: 'Woodwind instrument',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'HARMONICA',                       hint: 'Pocket wind instrument',             difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MICROPHONE',                      hint: 'Sound amplification device',         difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MEGAPHONE',                       hint: 'Hand sound amplifier',               difficulty: 'easy' },
  { cat: 'Thing',             answer: 'SPEAKER',                         hint: 'Audio output device',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'AMPLIFIER',                       hint: 'Sound boosting device',              difficulty: 'easy' },
  { cat: 'Thing',             answer: 'TELESCOPE',                       hint: 'Star viewing device',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'MICROSCOPE',                      hint: 'Tiny viewing device',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'BINOCULARS',                      hint: 'Dual viewing device',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'CAMERA',                          hint: 'Photo taking device',                difficulty: 'easy' },
  { cat: 'Thing',             answer: 'PROJECTOR',                       hint: 'Image display device',               difficulty: 'easy' },
  
  // ─── TV SHOWS & ENTERTAINMENT (60 total) ───
  { cat: 'TV Show',           answer: 'GAME OF THRONES',                 hint: 'Dragon fantasy series',              difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'BREAKING BAD',                    hint: 'Chemistry teacher crime drama',      difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'THE OFFICE',                      hint: 'Mockumentary workplace comedy',      difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'FRIENDS',                         hint: 'Manhattan roommate sitcom',          difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'SEINFELD',                        hint: 'Show about nothing',                 difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE SOPRANOS',                    hint: 'Mob boss therapy drama',             difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'THE CROWN',                       hint: 'Royal family drama',                 difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'STRANGER THINGS',                 hint: 'Supernatural 1980s series',         difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE MANDALORIAN',                 hint: 'Star Wars spin-off series',          difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'HOUSE OF THE DRAGON',             hint: 'Game of Thrones prequel',            difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'WESTWORLD',                       hint: 'AI robot park series',               difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'THE LAST OF US',                  hint: 'Post-apocalyptic drama',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE WITCHER',                     hint: 'Monster hunter fantasy',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'PEAKY BLINDERS',                  hint: 'Birmingham crime family',            difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'SHERLOCK',                        hint: 'Detective mystery series',           difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'DOCTOR WHO',                      hint: 'Time travel sci-fi series',          difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'DARK',                            hint: 'German time travel mystery',         difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'LOST',                            hint: 'Island survival mystery',            difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE WIRE',                        hint: 'Baltimore crime drama',              difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'TRUE DETECTIVE',                  hint: 'Crime investigation drama',          difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'OZARK',                           hint: 'Money laundering drama',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'SUCCESSION',                      hint: 'Corporate power struggle',           difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'THE BEAR',                        hint: 'Chicago restaurant drama',           difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'SEVERANCE',                       hint: 'Memory split sci-fi series',         difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'ANDOR',                           hint: 'Star Wars spy thriller',             difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'CHERNOBYL',                       hint: 'Nuclear disaster miniseries',        difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'MINDHUNTER',                      hint: 'FBI profiler crime series',          difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'DEXTER',                          hint: 'Serial killer protagonist',          difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'HANNIBAL',                        hint: 'Cannibal thriller series',           difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'BETTER CALL SAUL',                hint: 'Breaking Bad spin-off',              difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'ATLANTA',                         hint: 'Hip hop comedy drama',               difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'BARRY',                           hint: 'Hitman actor comedy',                difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'FLEABAG',                         hint: 'London comedy drama',                difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'KILLING EVE',                     hint: 'Psychopath hunter thriller',         difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'BATES MOTEL',                     hint: 'Psycho prequel series',              difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'AMERICAN PSYCHO',                 hint: 'Wall Street killer film',            difficulty: 'hard' },
  { cat: 'TV Show',           answer: 'EUPHORIA',                        hint: 'Teen drug drama series',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'CHILLING ADVENTURES OF SABRINA',  hint: 'Witchy thriller series',             difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'RIVERDALE',                       hint: 'Archie mystery drama',               difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'WEDNESDAY',                       hint: 'Addams Family spin-off',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'YOU',                             hint: 'Stalker romance thriller',           difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'SQUID GAME',                      hint: 'Korean survival thriller',           difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'MONEY HEIST',                     hint: 'Spanish heist series',               difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE MARVELOUS MRS MAISEL',        hint: 'Retro comedy drama',                 difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'GILMORE GIRLS',                   hint: 'Mother daughter comedy',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'PARKS AND RECREATION',            hint: 'Government office comedy',           difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE GOOD PLACE',                  hint: 'Afterlife philosophy comedy',        difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'BROOKLYN NINE-NINE',              hint: 'Police precinct comedy',             difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'THE GOOD WIFE',                   hint: 'Legal drama series',                 difficulty: 'medium' },
  { cat: 'TV Show',           answer: 'SUITS',                           hint: 'Law firm drama',                     difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'HOW I MET YOUR MOTHER',           hint: 'Relationship comedy series',         difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'SCRUBS',                          hint: 'Hospital comedy drama',              difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'GREY SLOANATOMICAL',              hint: 'Medical drama series',               difficulty: 'easy' },
  { cat: 'TV Show',           answer: 'HOUSE',                           hint: 'Detective doctor series',            difficulty: 'easy' },
  
  // ─── ADDITIONAL PHRASES (70 total) ───
  { cat: 'Phrase',            answer: 'ENJOY THE SHOW',                 hint: 'Entertainment pleasure',             difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HAVE A NICE DAY',                 hint: 'Polite goodbye',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'GOOD MORNING',                    hint: 'Day greeting',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'GOOD NIGHT',                      hint: 'Sleep greeting',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HELLO WORLD',                     hint: 'Programming phrase',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SEE YOU LATER',                   hint: 'Casual goodbye',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'CATCH YOU ON THE FLIP SIDE',      hint: 'Cool goodbye',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WHAT TIME IS IT',                 hint: 'Time inquiry',                       difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HOW ARE YOU',                     hint: 'Status inquiry',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WHAT IS YOUR NAME',              hint: 'Identity inquiry',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WHY ARE YOU HERE',                hint: 'Purpose inquiry',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WHERE ARE YOU FROM',              hint: 'Origin inquiry',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WOULD YOU MARRY ME',              hint: 'Proposal question',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I LOVE YOU',                      hint: 'Affection declaration',              difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I MISS YOU',                      hint: 'Longing declaration',                difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I WANT YOU',                      hint: 'Desire declaration',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I NEED YOU',                      hint: 'Dependence declaration',             difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I TRUST YOU',                     hint: 'Confidence declaration',             difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I FORGIVE YOU',                   hint: 'Pardon declaration',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I BELIEVE IN YOU',                hint: 'Support declaration',                difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU CAN DO IT',                   hint: 'Encouragement phrase',               difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'JUST DO IT',                      hint: 'Motivation phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'NEVER GIVE UP',                   hint: 'Persistence phrase',                difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'DO YOUR BEST',                    hint: 'Effort phrase',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'KEEP MOVING FORWARD',             hint: 'Progress phrase',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LOOK ON THE BRIGHT SIDE',         hint: 'Optimism phrase',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'TAKE IT EASY',                    hint: 'Relaxation phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'STAY STRONG',                     hint: 'Resilience phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'STAY POSITIVE',                   hint: 'Mindset phrase',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SPREAD THE LOVE',                 hint: 'Kindness phrase',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SHARE THE WEALTH',                hint: 'Generosity phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SPREAD JOY',                      hint: 'Happiness phrase',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LIVE LIFE TO THE FULLEST',        hint: 'Living philosophy',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'MAKE MEMORIES',                   hint: 'Nostalgia phrase',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'SEIZE THE DAY',                   hint: 'Carpe diem',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ONLY LIVE ONCE',              hint: 'YOLO phrase',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'LIVE AND LOVE',                   hint: 'Life philosophy',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'FOLLOW YOUR DREAMS',              hint: 'Ambition phrase',                    difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'REACH FOR THE STARS',             hint: 'Aspiration phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'BELIEVE IN YOURSELF',             hint: 'Confidence phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE AMAZING',                 hint: 'Compliment phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE BEAUTIFUL',               hint: 'Beauty compliment',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE STRONG',                  hint: 'Strength compliment',                difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE AWESOME',                 hint: 'Awesome compliment',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE THE BEST',                hint: 'Superiority phrase',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'THANKS FOR THE MEMORIES',         hint: 'Gratitude phrase',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'THANK YOU SO MUCH',               hint: 'Appreciation phrase',               difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I APPRECIATE YOU',                hint: 'Gratitude phrase',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU MEAN THE WORLD TO ME',        hint: 'Love phrase',                        difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU ARE MY HERO',                 hint: 'Admiration phrase',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'YOU SAVED MY LIFE',               hint: 'Gratitude phrase',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HAPPY BIRTHDAY',                  hint: 'Birthday greeting',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'HAPPY HOLIDAYS',                  hint: 'Holiday greeting',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'CONGRATULATIONS',                 hint: 'Achievement phrase',                 difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WELL DONE',                       hint: 'Praise phrase',                      difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'NICE WORK',                       hint: 'Job praise',                         difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'GREAT EFFORT',                    hint: 'Work appreciation',                  difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'PROUD OF YOU',                    hint: 'Pride expression',                   difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'I AM HAPPY FOR YOU',              hint: 'Joy expression',                     difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'CONGRATS ON THE WIN',             hint: 'Victory celebration',                difficulty: 'easy' },
  { cat: 'Phrase',            answer: 'WAY TO GO',                       hint: 'Encouragement phrase',               difficulty: 'easy' },
];

// ─── WHEEL SEGMENTS ───────────────────────────────────────────────────────────
type SpecialVal = 'BANKRUPT' | 'LOSE_TURN' | 'FREE_VOWEL' | 'DOUBLE' | 'EXTRA_SPIN';
type WheelVal = number | SpecialVal;
interface Seg { val: WheelVal; label: string; color: string; fg: string; }

const SEGMENTS: Seg[] = [
  { val: 100,          label: '100',   color: '#ef4444', fg: '#fff' },
  { val: 200,          label: '200',   color: '#f97316', fg: '#fff' },
  { val: 300,          label: '300',   color: '#eab308', fg: '#000' },
  { val: 400,          label: '400',   color: '#22c55e', fg: '#fff' },
  { val: 500,          label: '500',   color: '#06b6d4', fg: '#fff' },
  { val: 'LOSE_TURN',  label: 'LOSE',  color: '#6b7280', fg: '#fff' },
  { val: 600,          label: '600',   color: '#3b82f6', fg: '#fff' },
  { val: 700,          label: '700',   color: '#8b5cf6', fg: '#fff' },
  { val: 'BANKRUPT',   label: 'BKRPT', color: '#111111', fg: '#ef4444' },
  { val: 800,          label: '800',   color: '#ec4899', fg: '#fff' },
  { val: 300,          label: '300',   color: '#f97316', fg: '#fff' },
  { val: 'FREE_VOWEL', label: 'FREE',  color: '#10b981', fg: '#fff' },
  { val: 400,          label: '400',   color: '#eab308', fg: '#000' },
  { val: 900,          label: '900',   color: '#22c55e', fg: '#fff' },
  { val: 'LOSE_TURN',  label: 'LOSE',  color: '#6b7280', fg: '#fff' },
  { val: 500,          label: '500',   color: '#06b6d4', fg: '#fff' },
  { val: 'DOUBLE',     label: '2X',    color: '#f59e0b', fg: '#000' },
  { val: 200,          label: '200',   color: '#ef4444', fg: '#fff' },
  { val: 600,          label: '600',   color: '#3b82f6', fg: '#fff' },
  { val: 'BANKRUPT',   label: 'BKRPT', color: '#111111', fg: '#ef4444' },
  { val: 700,          label: '700',   color: '#8b5cf6', fg: '#fff' },
  { val: 'EXTRA_SPIN', label: '+SPIN', color: '#a855f7', fg: '#fff' },
  { val: 300,          label: '300',   color: '#22c55e', fg: '#fff' },
  { val: 1000,         label: '1000',  color: '#fbbf24', fg: '#000' },
];

const NUM_SEGS = 24;
const SEG_DEG = 360 / NUM_SEGS;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const CONS_BY_FREQ = ['T','N','S','R','H','D','L','C','M','G','B','F','P','Y','W','K','V','X','J','Q','Z'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const VOWEL_COST = 250;
const BOT_NAMES = ['Nikki', 'Rex', 'Zara'];

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Difficulty = 'easy' | 'normal' | 'hard';
type AppMode = 'pick' | 'ai_setup' | 'ai_game' | 'online_lobby' | 'online_game';

interface BotConfig { name: string; difficulty: Difficulty; }

interface Player {
  name: string;
  isAI: boolean;
  difficulty: Difficulty;
  roundScore: number;
  totalScore: number;
  extraSpins: number;
}
type Phase = 'setup' | 'spin' | 'guessing' | 'vowel' | 'ai' | 'round_over' | 'game_over';

interface GS {
  players: Player[];
  turn: number;
  round: number;
  totalRounds: number;
  puzzles: PuzzleDef[];
  puzzle: PuzzleDef;
  revealed: string[];
  guessed: string[];
  phase: Phase;
  segValue: number | null;
  lastSegLabel: string;
  doubleActive: boolean;
  vowelFree: boolean;
  wheelAngle: number;
  spinning: boolean;
  message: string;
  roundWinner: string;
  showHint: boolean;
}

// ─── PURE GAME LOGIC ──────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isComplete(puzzle: PuzzleDef, revealed: string[]): boolean {
  return puzzle.answer.split('').every(c => c === ' ' || !/[A-Z]/.test(c) || revealed.includes(c));
}

function allConsonantsRevealed(puzzle: PuzzleDef, guessed: string[]): boolean {
  const cons = [...new Set(puzzle.answer.split('').filter(c => CONSONANTS.includes(c)))];
  return cons.every(c => guessed.includes(c));
}

function allVowelsRevealed(puzzle: PuzzleDef, guessed: string[]): boolean {
  const vow = [...new Set(puzzle.answer.split('').filter(c => VOWELS.has(c)))];
  return vow.length === 0 || vow.every(v => guessed.includes(v));
}

function mkPlayer(name: string, isAI: boolean, difficulty: Difficulty = 'normal'): Player {
  return { name, isAI, difficulty, roundScore: 0, totalScore: 0, extraSpins: 0 };
}

function initGame(bots: BotConfig[], puzzleDifficulty: 'easy' | 'normal' | 'hard' = 'normal', rounds = 5): GS {
  const diffFilter: Record<string, Array<PuzzleDef['difficulty']>> = {
    easy: ['easy'], normal: ['easy', 'medium'], hard: ['medium', 'hard'],
  };
  const allowed = diffFilter[puzzleDifficulty];
  const pool = shuffle(PUZZLES.filter(p => allowed.includes(p.difficulty)));
  const puzzles = pool.length >= rounds ? pool.slice(0, rounds) : shuffle([...PUZZLES]).slice(0, rounds);
  const players: Player[] = [
    mkPlayer('You', false),
    ...bots.map(b => mkPlayer(b.name, true, b.difficulty)),
  ];
  return {
    players, turn: 0, round: 1, totalRounds: rounds,
    puzzles, puzzle: puzzles[0],
    revealed: [], guessed: [],
    phase: 'spin', segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false,
    wheelAngle: 0, spinning: false,
    message: `Round 1 — ${puzzles[0].cat}. Spin to start!`,
    roundWinner: '', showHint: false,
  };
}

function nextTurn(gs: GS, msg: string): GS {
  const next = (gs.turn + 1) % gs.players.length;
  return {
    ...gs, turn: next, segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false,
    phase: gs.players[next].isAI ? 'ai' : 'spin', message: msg, showHint: false,
  };
}

function finishRound(gs: GS, winnerIdx: number): GS {
  const winnerName = gs.players[winnerIdx].name;
  const newPlayers = gs.players.map(p => ({ ...p, totalScore: p.totalScore + p.roundScore, roundScore: 0 }));
  return {
    ...gs, players: newPlayers,
    phase: gs.round >= gs.totalRounds ? 'game_over' : 'round_over',
    roundWinner: winnerName, message: `🎉 ${winnerName} solved it!`, showHint: false,
  };
}

function applySpinResult(gs: GS, segIdx: number): GS {
  const seg = SEGMENTS[segIdx];
  const who = gs.players[gs.turn].name;
  const noConsLeft = allConsonantsRevealed(gs.puzzle, gs.guessed);
  switch (seg.val as WheelVal) {
    case 'BANKRUPT': {
      const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: 0, extraSpins: 0 } : p);
      return nextTurn({ ...gs, players: newPlayers }, `💥 ${who} hit BANKRUPT! Round score gone.`);
    }
    case 'LOSE_TURN': {
      const p = gs.players[gs.turn];
      if (p.extraSpins > 0) {
        const newPlayers = gs.players.map((pl, i) => i === gs.turn ? { ...pl, extraSpins: pl.extraSpins - 1 } : pl);
        return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label, message: `${who} used an Extra Spin token to cancel Lose Turn! Spin again.` };
      }
      return nextTurn(gs, `😬 ${who} loses a turn!`);
    }
    case 'FREE_VOWEL':
      if (allVowelsRevealed(gs.puzzle, gs.guessed))
        return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `All vowels revealed! ${who} spins again.` };
      return { ...gs, phase: 'vowel', vowelFree: true, lastSegLabel: seg.label, message: `🎁 ${who} gets a FREE VOWEL! Pick one.` };
    case 'EXTRA_SPIN': {
      const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, extraSpins: p.extraSpins + 1 } : p);
      return { ...gs, players: newPlayers, phase: 'spin', lastSegLabel: seg.label, message: `🎡 ${who} earned an Extra Spin token! Spin again.` };
    }
    case 'DOUBLE':
      if (noConsLeft) return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: 500, doubleActive: true, lastSegLabel: seg.label, message: `2️⃣ DOUBLE POINTS! Guess a consonant.` };
    default: {
      const val = seg.val as number;
      if (noConsLeft) return { ...gs, phase: 'spin', lastSegLabel: seg.label, message: `No consonants left! ${who} spins again.` };
      return { ...gs, phase: 'guessing', segValue: val, doubleActive: false, lastSegLabel: seg.label, message: `$${val}! Guess a consonant.` };
    }
  }
}

function handleGuess(gs: GS, letter: string): GS {
  if (gs.guessed.includes(letter)) return gs;
  const newGuessed = [...gs.guessed, letter];
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) return nextTurn({ ...gs, guessed: newGuessed }, `No ${letter}s in the puzzle. Turn passes.`);
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const base = gs.doubleActive ? 500 : (gs.segValue ?? 0);
  const mult = gs.doubleActive ? 2 : 1;
  const earned = base * mult * count;
  const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: p.roundScore + earned } : p);
  const gs2: GS = { ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers, phase: 'spin', segValue: null, doubleActive: false, message: `${count} ${letter}${count > 1 ? 's' : ''}! +$${earned}. Keep going!` };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleVowel(gs: GS, letter: string): GS {
  if (!VOWELS.has(letter) || gs.guessed.includes(letter)) return gs;
  const cost = gs.vowelFree ? 0 : VOWEL_COST;
  const newGuessed = [...gs.guessed, letter];
  const newPlayers = gs.players.map((p, i) => i === gs.turn ? { ...p, roundScore: Math.max(0, p.roundScore - cost) } : p);
  const count = gs.puzzle.answer.split('').filter(c => c === letter).length;
  if (count === 0) return nextTurn({ ...gs, guessed: newGuessed, players: newPlayers, vowelFree: false }, `No ${letter}s! ${cost > 0 ? '−$250. ' : ''}Turn passes.`);
  const newRevealed = gs.revealed.includes(letter) ? gs.revealed : [...gs.revealed, letter];
  const gs2: GS = { ...gs, guessed: newGuessed, revealed: newRevealed, players: newPlayers, phase: 'spin', vowelFree: false, message: `${count} ${letter}${count > 1 ? 's' : ''}! ${cost > 0 ? '−$250. ' : 'Free! '}Keep going!` };
  if (isComplete(gs2.puzzle, gs2.revealed)) return finishRound(gs2, gs.turn);
  return gs2;
}

function handleSolve(gs: GS, attempt: string): GS {
  const normalized = attempt.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === gs.puzzle.answer) return finishRound(gs, gs.turn);
  return nextTurn(gs, `❌ Wrong answer. Turn passes.`);
}

// ─── AI (per-player difficulty) ───────────────────────────────────────────────
function computeAI(gs: GS): GS {
  const player = gs.players[gs.turn];
  const diff = player.difficulty;
  const unrevVowels = ['A','E','I','O','U'].filter(v => !gs.guessed.includes(v) && gs.puzzle.answer.includes(v));
  const uniqueLetters = [...new Set(gs.puzzle.answer.replace(/[^A-Z]/g, '').split(''))];
  const revRatio = uniqueLetters.filter(c => gs.revealed.includes(c)).length / Math.max(uniqueLetters.length, 1);

  const solveThreshold = diff === 'easy' ? 0.92 : diff === 'normal' ? 0.80 : 0.65;
  const vowelChance = diff === 'easy' ? 0.1 : diff === 'normal' ? 0.22 : 0.35;

  if (gs.phase === 'guessing') {
    const pool = CONS_BY_FREQ.filter(c => !gs.guessed.includes(c));
    const pick = pool[0] ?? 'Z';
    return handleGuess(gs, pick);
  }
  if (gs.phase === 'vowel') {
    const v = unrevVowels[0];
    if (v) return handleVowel(gs, v);
    return nextTurn(gs, `${player.name} passes.`);
  }
  if (revRatio >= solveThreshold) return finishRound(gs, gs.turn);
  const canBuyVowel = player.roundScore >= VOWEL_COST && unrevVowels.length > 0;
  if (canBuyVowel && Math.random() < vowelChance) {
    return handleVowel({ ...gs, phase: 'vowel', vowelFree: false }, unrevVowels[0]);
  }
  const segIdx = Math.floor(Math.random() * NUM_SEGS);
  const result = applySpinResult(gs, segIdx);
  if (result.phase === 'guessing') {
    const pool = CONS_BY_FREQ.filter(c => !result.guessed.includes(c));
    return handleGuess(result, pool[0] ?? 'Z');
  }
  if (result.phase === 'vowel' && result.vowelFree) {
    const v = unrevVowels[0];
    if (v) return handleVowel(result, v);
    return nextTurn(result, `${player.name} passes.`);
  }
  return result;
}

// ─── WHEEL SVG ────────────────────────────────────────────────────────────────
function xyAt(deg: number, r: number, cx: number, cy: number): [number, number] {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function slicePath(idx: number, cx: number, cy: number, r: number): string {
  const [x1, y1] = xyAt(idx * SEG_DEG, r, cx, cy);
  const [x2, y2] = xyAt((idx + 1) * SEG_DEG, r, cx, cy);
  return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`;
}
function WheelSVG({ angle, spinning }: { angle: number; spinning: boolean }) {
  const cx = 130, cy = 130, r = 118, rt = 88;
  return (
    <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderTop: '30px solid #f0c040', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }} />
      <div style={{ width: 260, height: 260, transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(0.08,0.6,0.85,1)' : 'none', willChange: 'transform' }}>
        <svg width={260} height={260} viewBox="0 0 260 260">
          <circle cx={cx} cy={cy} r={r + 8} fill="#1a1a2e" />
          <circle cx={cx} cy={cy} r={r + 3} fill="#2a2a5e" />
          {SEGMENTS.map((seg, i) => {
            const mid = (i + 0.5) * SEG_DEG;
            const [tx, ty] = xyAt(mid, rt, cx, cy);
            return (
              <g key={i}>
                <path d={slicePath(i, cx, cy, r)} fill={seg.color} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid},${tx},${ty})`} fontSize={seg.label.length > 4 ? 7 : 9.5} fontWeight="bold" fill={seg.fg} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={20} fill="#1a1a2e" stroke="#f0c040" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={12} fill="#f0c040" />
        </svg>
      </div>
    </div>
  );
}

// ─── PUZZLE BOARD ─────────────────────────────────────────────────────────────
function PuzzleBoard({ answer, revealed }: { answer: string; revealed: string[] }) {
  const words = answer.split(' ');
  const totalLetters = answer.replace(/ /g, '').length;
  const tileSize = totalLetters > 20 ? 26 : totalLetters > 14 ? 30 : 34;
  const fontSize = tileSize - 12;
  return (
    <div style={{ padding: '10px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
      {words.map((word, wi) => (
        <div key={wi} style={{ display: 'flex', gap: 4 }}>
          {word.split('').map((ch, ci) => {
            const rev = revealed.includes(ch) || !/[A-Z]/.test(ch);
            return (
              <div key={ci} style={{ width: tileSize, height: tileSize + 8, flexShrink: 0, background: rev ? '#f0ece0' : '#1a2a60', borderRadius: 3, borderBottom: `3px solid ${rev ? '#c8a850' : '#2a3a80'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 900, color: '#1a1a1a', fontFamily: 'Georgia, serif', boxShadow: rev ? '0 2px 4px rgba(0,0,0,0.35)' : 'none', transition: 'background 0.2s, border-color 0.2s' }}>
                {rev ? ch : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── LETTER KEYBOARD ──────────────────────────────────────────────────────────
function LetterKeys({ guessed, onGuess, mode }: { guessed: string[]; onGuess: (l: string) => void; mode: 'consonant' | 'vowel' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 400, margin: '0 auto', padding: '4px 8px' }}>
      {ALPHABET.map(letter => {
        const isVowel = VOWELS.has(letter);
        const used = guessed.includes(letter);
        const inactive = mode === 'consonant' ? isVowel : !isVowel;
        const disabled = used || inactive;
        const bg = used ? '#0a0a14' : inactive ? '#12121e' : isVowel ? '#1e3a8a' : '#14532d';
        const border = used || inactive ? '#1e1e30' : isVowel ? '#3b82f6' : '#22c55e';
        return (
          <button key={letter} onClick={() => !disabled && onGuess(letter)} disabled={disabled}
            style={{ width: 32, height: 36, background: bg, border: `1.5px solid ${border}`, borderRadius: 6, color: used || inactive ? '#2a2a3a' : '#fff', fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.1s' }}>
            {letter}
          </button>
        );
      })}
    </div>
  );
}

// ─── LETTER INPUT FOR PUZZLE ──────────────────────────────────────────────────
function PuzzleLetterInput({ onGuess, onCancel }: { onGuess: (letter: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.toUpperCase().slice(0, 1);
    setVal(char);
    if (/^[A-Z]$/.test(char)) {
      onGuess(char);
      setVal('');
    }
  };
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 16, padding: 28, textAlign: 'center', width: 340 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✏️</div>
        <h3 style={{ color: '#f0c040', margin: '0 0 16px' }}>Type a Letter</h3>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>Enter a single letter to guess</p>
        <input value={val} onChange={handleInputChange} placeholder="A–Z" autoFocus maxLength={1}
          style={{ width: '100%', padding: '12px 16px', background: '#1a2a40', border: '2px solid #3a5a80', borderRadius: 8, color: '#fff', fontSize: 24, fontWeight: 700, boxSizing: 'border-box', textAlign: 'center', fontFamily: 'Georgia, serif', letterSpacing: 2 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', background: '#374151', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── SOLVE MODAL ──────────────────────────────────────────────────────────────
function SolveModal({ onSubmit, onCancel }: { onSubmit: (t: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 16, padding: 28, textAlign: 'center', width: 340 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
        <h3 style={{ color: '#f0c040', margin: '0 0 16px' }}>Solve the Puzzle!</h3>
        <input value={val} onChange={e => setVal(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && val.trim() && onSubmit(val)} placeholder="Type your answer..." autoFocus
          style={{ width: '100%', padding: '10px 12px', background: '#1a2a40', border: '2px solid #3a5a80', borderRadius: 8, color: '#fff', fontSize: 16, fontWeight: 700, boxSizing: 'border-box', fontFamily: 'Georgia, serif', letterSpacing: 1 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
          <button onClick={() => val.trim() && onSubmit(val)} style={{ padding: '10px 28px', background: '#16a34a', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Submit ✓</button>
          <button onClick={onCancel} style={{ padding: '10px 20px', background: '#374151', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROUND / GAME OVER MODALS ─────────────────────────────────────────────────
function RoundModal({ roundWinner, puzzle, round, totalRounds, players, onNext }: {
  roundWinner: string; puzzle: { answer: string }; round: number; totalRounds: number;
  players: Array<{ name: string; totalScore: number }>; onNext: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 20, padding: '28px 32px', textAlign: 'center', maxWidth: 420, width: '90%' }}>
        <div style={{ fontSize: 44 }}>🎉</div>
        <h2 style={{ color: '#f0c040', fontSize: 22, margin: '8px 0 4px' }}>Round {round} Complete!</h2>
        <p style={{ color: '#22c55e', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{roundWinner} solved it!</p>
        <p style={{ color: '#888', fontSize: 15, fontFamily: 'Georgia, serif', marginBottom: 18, fontStyle: 'italic' }}>"{puzzle.answer}"</p>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(players.length, 4)},1fr)`, gap: 8, marginBottom: 20 }}>
          {players.map((p, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 6px' }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{p.name}</div>
              <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 17 }}>${p.totalScore}</div>
              <div style={{ fontSize: 10, color: '#555' }}>total</div>
            </div>
          ))}
        </div>
        <button onClick={onNext} style={{ padding: '12px 36px', background: 'linear-gradient(135deg,#1a4a2a,#16a34a)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          {round < totalRounds ? `Round ${round + 1} →` : 'Final Results →'}
        </button>
      </div>
    </div>
  );
}

function GameOverModal({ players, onNew }: { players: Array<{ name: string; totalScore: number }>; onNew: () => void }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const medals = ['🥇', '🥈', '🥉', '4️⃣'];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#0d1b2a', border: '2px solid #f0c040', borderRadius: 20, padding: '30px 36px', textAlign: 'center', maxWidth: 400, width: '90%' }}>
        <div style={{ fontSize: 52 }}>🏆</div>
        <h2 style={{ color: '#f0c040', fontSize: 26, margin: '8px 0 4px' }}>Game Over!</h2>
        <p style={{ color: '#aaa', marginBottom: 20 }}>{sorted[0].name} wins!</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {sorted.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: i === 0 ? 'rgba(240,192,64,0.12)' : 'rgba(255,255,255,0.04)', border: i === 0 ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 16px' }}>
              <span style={{ fontSize: 22 }}>{medals[i] ?? ''}</span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: '#f0c040', fontWeight: 700, fontSize: 18 }}>${p.totalScore}</span>
            </div>
          ))}
        </div>
        <button onClick={onNew} style={{ padding: '12px 40px', background: 'linear-gradient(135deg,#7c1a8a,#a855f7)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}>
          Play Again 🎡
        </button>
      </div>
    </div>
  );
}

// ─── SHARED GAME LAYOUT (used by both AI game and online game) ────────────────
function GameLayout({
  round, totalRounds, diffLabel, players, turn, puzzle, revealed, guessed, wheelAngle, spinning, message, doubleActive, showHint,
  onMenu, onToggleHint, children,
}: {
  round: number; totalRounds: number; diffLabel: string;
  players: Array<{ name: string; isAI?: boolean; extraSpins?: number; roundScore: number; totalScore: number }>;
  turn: number; puzzle: { cat: string; answer: string; hint: string };
  revealed: string[]; guessed: string[];
  wheelAngle: number; spinning: boolean; message: string; doubleActive: boolean; showHint: boolean;
  onMenu: () => void; onToggleHint: () => void; children: React.ReactNode;
}) {
  const isHumanTurn = !(players[turn] as { isAI?: boolean })?.isAI;
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif", userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.2)', flexShrink: 0 }}>
        <button onClick={onMenu} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#f0c040', letterSpacing: 1 }}>🎡 Spin & Solve Arena</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Round {round}/{totalRounds} · {diffLabel}</div>
        </div>
        <button onClick={onToggleHint} style={{ background: showHint ? 'rgba(240,192,64,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showHint ? '#f0c040' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '5px 12px', color: showHint ? '#f0c040' : 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
          💡 Hint
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '5px 12px', background: '#0a0a2a', borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
        <span style={{ color: '#555', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Category</span>
        <div style={{ color: '#f0c040', fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{puzzle.cat.toUpperCase()}</div>
        {showHint && <div style={{ color: '#888', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>💡 {puzzle.hint}</div>}
      </div>
      <div style={{ background: '#0d1230', borderBottom: '2px solid rgba(255,215,0,0.12)', flexShrink: 0, minHeight: 72 }}>
        <PuzzleBoard answer={puzzle.answer} revealed={revealed} />
      </div>
      <div style={{ display: 'flex', gap: 5, padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {players.map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '4px 4px', borderRadius: 8, background: turn === i ? 'rgba(240,192,64,0.12)' : 'rgba(255,255,255,0.04)', border: turn === i ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, color: '#888' }}>{p.name}{p.isAI ? ' 🤖' : ''}{(p.extraSpins ?? 0) > 0 ? ` ✨×${p.extraSpins}` : ''}</div>
            <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 14 }}>${p.roundScore}</div>
            <div style={{ fontSize: 10, color: '#555' }}>${p.totalScore} total</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '5px 12px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', flexShrink: 0 }}>
        {ALPHABET.map(l => {
          const used = guessed.includes(l);
          const isVowel = VOWELS.has(l);
          return (
            <span key={l} style={{ width: 21, height: 21, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: used ? (isVowel ? '#1e3a8a' : '#14532d') : 'rgba(255,255,255,0.04)', border: `1px solid ${used ? (isVowel ? '#3b82f6' : '#16a34a') : 'rgba(255,255,255,0.07)'}`, borderRadius: 3, fontSize: 11, fontWeight: 700, color: used ? '#fff' : '#2a2a3a' }}>
              {l}
            </span>
          );
        })}
      </div>
      <div style={{ padding: '6px 14px', background: doubleActive ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: doubleActive ? '#f59e0b' : isHumanTurn ? '#f0c040' : '#888', textAlign: 'center' }}>{message}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 12px 10px', gap: 8, overflowY: 'auto' }}>
        <WheelSVG angle={wheelAngle} spinning={spinning} />
        {children}
      </div>
    </div>
  );
}

// ─── MODE PICKER ──────────────────────────────────────────────────────────────
function ModePickScreen({ onPick }: { onPick: (mode: 'ai_setup' | 'online_lobby') => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ fontSize: 60, marginBottom: 8 }}>🎡</div>
      <h1 style={{ color: '#f0c040', fontSize: 28, margin: '0 0 4px', textAlign: 'center' }}>Spin & Solve Arena</h1>
      <p style={{ color: '#888', marginBottom: 32, textAlign: 'center' }}>Wheel of Fortune style puzzle game</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
        <button onClick={() => onPick('ai_setup')}
          style={{ padding: '18px 0', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', border: '2px solid #7c3aed', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 17, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          🤖 vs AI Bots (1–3)
        </button>
        <button onClick={() => onPick('online_lobby')}
          style={{ padding: '18px 0', background: 'linear-gradient(135deg,#065f46,#059669)', border: '2px solid #10b981', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 17, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
          🌐 Online Multiplayer (2–4P)
        </button>
      </div>
      <Link href="/">
        <span style={{ marginTop: 28, color: '#555', fontSize: 13, cursor: 'pointer' }}>← Back to Game Hub</span>
      </Link>
    </div>
  );
}

// ─── AI SETUP SCREEN ──────────────────────────────────────────────────────────
const DIFF_COLORS: Record<Difficulty, string> = { easy: '#22c55e', normal: '#f0c040', hard: '#ef4444' };
const DIFF_LABELS: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

function AiSetupScreen({ onBack, onStart }: { onBack: () => void; onStart: (bots: BotConfig[], puzzleDiff: Difficulty, rounds: number) => void }) {
  const [botCount, setBotCount] = useState(2);
  const [bots, setBots] = useState<BotConfig[]>([
    { name: 'Nikki', difficulty: 'normal' },
    { name: 'Rex', difficulty: 'normal' },
    { name: 'Zara', difficulty: 'hard' },
  ]);
  const [puzzleDiff, setPuzzleDiff] = useState<Difficulty>('normal');
  const [rounds, setRounds] = useState(5);

  const setDiff = (i: number, d: Difficulty) => setBots(prev => prev.map((b, idx) => idx === i ? { ...b, difficulty: d } : b));

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ fontSize: 48, marginBottom: 4 }}>🤖</div>
      <h2 style={{ color: '#a78bfa', fontSize: 22, margin: '0 0 4px' }}>vs AI Bots</h2>
      <p style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>Set each bot's difficulty independently</p>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 20px', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Number of Bots</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setBotCount(n)}
                style={{ flex: 1, padding: '10px 0', background: botCount === n ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', border: `2px solid ${botCount === n ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: botCount === n ? '#a78bfa' : '#666', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Bot Difficulty</div>
          {bots.slice(0, botCount).map((bot, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 48, fontSize: 13, fontWeight: 700, color: '#ccc' }}>{BOT_NAMES[i]}</span>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDiff(i, d)}
                    style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, background: bot.difficulty === d ? `rgba(${d === 'easy' ? '34,197,94' : d === 'normal' ? '240,192,64' : '239,68,68'},0.2)` : 'rgba(255,255,255,0.04)', border: `2px solid ${bot.difficulty === d ? DIFF_COLORS[d] : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: bot.difficulty === d ? DIFF_COLORS[d] : '#555', cursor: 'pointer' }}>
                    {DIFF_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Puzzle Difficulty</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => setPuzzleDiff(d)}
                style={{ flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700, background: puzzleDiff === d ? `rgba(${d === 'easy' ? '34,197,94' : d === 'normal' ? '240,192,64' : '239,68,68'},0.15)` : 'rgba(255,255,255,0.04)', border: `2px solid ${puzzleDiff === d ? DIFF_COLORS[d] : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: puzzleDiff === d ? DIFF_COLORS[d] : '#555', cursor: 'pointer' }}>
                {DIFF_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Rounds</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 5, 7].map(r => (
              <button key={r} onClick={() => setRounds(r)}
                style={{ flex: 1, padding: '10px 0', background: rounds === r ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${rounds === r ? '#f0c040' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: rounds === r ? '#f0c040' : '#888', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => onStart(bots.slice(0, botCount), puzzleDiff, rounds)}
          style={{ padding: '14px 0', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 17, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          🎡 Start Game!
        </button>
      </div>
      <button onClick={onBack} style={{ marginTop: 16, background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>← Back</button>
    </div>
  );
}

// ─── ONLINE LOBBY SCREEN ──────────────────────────────────────────────────────
function OnlineLobbyScreen({ onBack }: { onBack: () => void }) {
  const [ssState, ssActions] = useSsOnline();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [rounds, setRounds] = useState(5);

  const { status, error, roomCode, mySeat, myColor, lobbyPlayers, gs } = ssState;

  if (gs && status === 'playing') {
    return <SsOnlineGame ssState={ssState} ssActions={ssActions} onBack={() => { ssActions.reset(); onBack(); }} />;
  }

  if (status === 'lobby') {
    const isHost = mySeat === 0;
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🎡</div>
        <h2 style={{ color: '#f0c040', margin: '0 0 6px' }}>Lobby — Room {roomCode}</h2>
        <p style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>{isHost ? 'Share the code · Start when ready' : 'Waiting for host to start…'}</p>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 24px', width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {lobbyPlayers.map(p => (
              <div key={p.seat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.seat === mySeat ? myColor : 'rgba(255,255,255,0.08)'}`, borderRadius: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, flex: 1 }}>{p.name}</span>
                {p.seat === 0 && <span style={{ fontSize: 10, color: '#f0c040' }}>HOST</span>}
                {p.seat === mySeat && <span style={{ fontSize: 10, color: '#888' }}>You</span>}
              </div>
            ))}
            {lobbyPlayers.length < 4 && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, color: '#444', fontSize: 13, textAlign: 'center' }}>
                Waiting for players… ({4 - lobbyPlayers.length} more can join)
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16, background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Room Code</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: '#f0c040' }}>{roomCode}</div>
          </div>
          {isHost && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>Rounds</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 5, 7].map(r => (
                    <button key={r} onClick={() => setRounds(r)}
                      style={{ flex: 1, padding: '8px 0', background: rounds === r ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${rounds === r ? '#f0c040' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: rounds === r ? '#f0c040' : '#666', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => ssActions.startGame(rounds)} disabled={lobbyPlayers.length < 2}
                style={{ width: '100%', padding: '13px 0', background: lobbyPlayers.length >= 2 ? 'linear-gradient(135deg,#065f46,#059669)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, color: lobbyPlayers.length >= 2 ? '#fff' : '#444', fontWeight: 800, fontSize: 16, cursor: lobbyPlayers.length >= 2 ? 'pointer' : 'not-allowed' }}>
                {lobbyPlayers.length >= 2 ? '🎡 Start Game!' : `Need ${2 - lobbyPlayers.length} more player${2 - lobbyPlayers.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
        <button onClick={() => { ssActions.reset(); onBack(); }} style={{ marginTop: 16, background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>← Leave Room</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🌐</div>
      <h2 style={{ color: '#10b981', margin: '0 0 4px' }}>Online Multiplayer</h2>
      <p style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>2–4 players · Same puzzle, take turns</p>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 20px', width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden' }}>
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 0', background: tab === t ? 'rgba(16,185,129,0.2)' : 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #10b981' : '2px solid transparent', color: tab === t ? '#10b981' : '#666', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {t === 'create' ? '+ Create Room' : '→ Join Room'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Your Name</div>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 12))} placeholder="Enter your name…"
            style={{ width: '100%', padding: '10px 12px', background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />
        </div>

        {tab === 'join' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Room Code</div>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="4-letter code"
              style={{ width: '100%', padding: '10px 12px', background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#f0c040', fontSize: 20, fontWeight: 900, letterSpacing: 6, textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
        )}

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

        <button
          onClick={() => {
            const n = name.trim() || 'Player';
            if (tab === 'create') ssActions.createRoom(n);
            else if (joinCode.length === 4) ssActions.joinRoom(joinCode, n);
          }}
          disabled={status === 'connecting'}
          style={{ width: '100%', padding: '13px 0', background: status === 'connecting' ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#065f46,#059669)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 16, cursor: status === 'connecting' ? 'wait' : 'pointer' }}>
          {status === 'connecting' ? 'Connecting…' : tab === 'create' ? '+ Create Room' : '→ Join Room'}
        </button>
      </div>
      <button onClick={onBack} style={{ marginTop: 16, background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>← Back</button>
    </div>
  );
}

// ─── ONLINE GAME ──────────────────────────────────────────────────────────────
function SsOnlineGame({ ssState, ssActions, onBack }: { ssState: ReturnType<typeof useSsOnline>[0]; ssActions: ReturnType<typeof useSsOnline>[1]; onBack: () => void }) {
  const { mySeat, lobbyPlayers, gs } = ssState;
  const [showSolve, setShowSolve] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSegIdxRef = useRef<number | null>(null);

  useEffect(() => () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); }, []);

  // Animate wheel when server sends a new lastSegIdx
  useEffect(() => {
    if (!gs || gs.lastSegIdx === null || gs.lastSegIdx === prevSegIdxRef.current) return;
    prevSegIdxRef.current = gs.lastSegIdx;
    const segIdx = gs.lastSegIdx;
    const targetDeg = 360 - ((segIdx + 0.5) * SEG_DEG);
    setWheelAngle(prev => {
      const prevNorm = ((prev % 360) + 360) % 360;
      const diff = ((targetDeg - prevNorm) + 360) % 360;
      return prev + diff + (5 + Math.floor(Math.random() * 5)) * 360;
    });
    setSpinning(true);
    spinTimerRef.current = setTimeout(() => setSpinning(false), 4300);
  }, [gs?.lastSegIdx]);

  if (!gs) return null;

  const myTurn = gs.turn === mySeat;
  const curPlayer = gs.players[gs.turn];
  const myGsPlayer = gs.players[mySeat];
  const noConsLeft = (() => {
    const cons = [...new Set(gs.puzzle.answer.replace(/[^A-Z]/g, '').split('').filter(c => !'AEIOU'.includes(c)))];
    return cons.every(c => gs.guessed.includes(c));
  })();
  const unrevVowelCount = ['A','E','I','O','U'].filter(v => !gs.guessed.includes(v) && gs.puzzle.answer.includes(v)).length;
  const canBuyVowel = myTurn && gs.phase === 'spin' && !spinning && (myGsPlayer?.roundScore ?? 0) >= VOWEL_COST && unrevVowelCount > 0;

  const players = gs.players.map((p, i) => {
    const lobbyP = lobbyPlayers[i];
    return { ...p, isAI: false as const, extraSpins: p.extraSpins, color: lobbyP?.color ?? '#fff' };
  });

  return (
    <GameLayout
      round={gs.round} totalRounds={gs.totalRounds} diffLabel="ONLINE"
      players={players} turn={gs.turn}
      puzzle={{ cat: gs.puzzle.cat, answer: gs.puzzle.answer, hint: gs.puzzle.hint ?? '' }}
      revealed={gs.revealed} guessed={gs.guessed}
      wheelAngle={wheelAngle} spinning={spinning}
      message={gs.message} doubleActive={gs.doubleActive} showHint={showHint}
      onMenu={onBack} onToggleHint={() => setShowHint(h => !h)}
    >
      {/* Action buttons — my turn, spin phase */}
      {myTurn && gs.phase === 'spin' && !spinning && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => ssActions.sendAction('spin')} disabled={noConsLeft && !canBuyVowel}
            style={{ padding: '11px 26px', background: noConsLeft && !canBuyVowel ? 'rgba(37,99,235,0.25)' : 'linear-gradient(135deg,#1a3a8a,#2563eb)', border: '2px solid #3b82f6', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: noConsLeft && !canBuyVowel ? 'not-allowed' : 'pointer', opacity: noConsLeft && !canBuyVowel ? 0.5 : 1 }}>
            🎡 SPIN!
          </button>
          <button onClick={() => ssActions.sendAction('buy_vowel')} disabled={!canBuyVowel}
            style={{ padding: '11px 16px', background: canBuyVowel ? 'linear-gradient(135deg,#14532d,#16a34a)' : 'rgba(255,255,255,0.05)', border: `2px solid ${canBuyVowel ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, color: canBuyVowel ? '#fff' : '#444', fontWeight: 700, fontSize: 13, cursor: canBuyVowel ? 'pointer' : 'not-allowed' }}>
            Buy Vowel −$250
          </button>
          <button onClick={() => setShowSolve(true)}
            style={{ padding: '11px 16px', background: 'linear-gradient(135deg,#7c1a1a,#dc2626)', border: '2px solid #ef4444', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Solve! 🏆
          </button>
        </div>
      )}
      {/* Consonant input */}
      {myTurn && gs.phase === 'guessing' && (
        <PuzzleLetterInput onGuess={l => ssActions.sendAction('guess', { letter: l })} onCancel={() => {}} />
      )}
      {/* Vowel input */}
      {myTurn && gs.phase === 'vowel' && (
        <PuzzleLetterInput onGuess={l => ssActions.sendAction('guess_vowel', { letter: l })} onCancel={() => {}} />
      )}
      {/* Old keyboard fallback (hidden) */}
      {false && myTurn && gs.phase === 'vowel' && (
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 6 }}>▼ Pick a vowel ({gs.vowelFree ? '🎁 FREE!' : `−$${VOWEL_COST}`})</div>
          <LetterKeys guessed={gs.guessed} onGuess={l => ssActions.sendAction('vowel', { letter: l })} mode="vowel" />
        </div>
      )}
      {/* Spinning indicator */}
      {spinning && (
        <div style={{ color: '#888', fontSize: 14, fontWeight: 700 }}>🎡 Spinning…</div>
      )}
      {/* Other player's turn */}
      {!myTurn && !['round_over','game_over'].includes(gs.phase) && (
        <div style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontSize: 13 }}>
          ⏳ Waiting for {curPlayer?.name}…
        </div>
      )}
      {/* Modals */}
      {showSolve && <SolveModal onSubmit={a => { ssActions.sendAction('solve', { answer: a }); setShowSolve(false); }} onCancel={() => setShowSolve(false)} />}
      {gs.phase === 'round_over' && (
        <RoundModal roundWinner={gs.roundWinner} puzzle={gs.puzzle} round={gs.round} totalRounds={gs.totalRounds}
          players={gs.players} onNext={() => ssActions.sendAction('next_round')} />
      )}
      {gs.phase === 'game_over' && <GameOverModal players={gs.players} onNew={onBack} />}
    </GameLayout>
  );
}

// ─── AI GAME ──────────────────────────────────────────────────────────────────
function AiGame({ initialGs, onMenu }: { initialGs: GS; onMenu: () => void }) {
  const [gs, setGs] = useState<GS>(initialGs);
  const [showSolve, setShowSolve] = useState(false);
  const pendingSegRef = useRef<number | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aiActive = gs.players[gs.turn]?.isAI && ['spin', 'guessing', 'vowel', 'ai'].includes(gs.phase) && !gs.spinning;

  useEffect(() => {
    if (!aiActive) return;
    const delay = 900 + Math.random() * 700;
    const t = setTimeout(() => {
      setGs(prev => {
        if (!prev || !prev.players[prev.turn]?.isAI) return prev;
        if (!['spin', 'guessing', 'vowel', 'ai'].includes(prev.phase) || prev.spinning) return prev;
        return computeAI(prev);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [aiActive, gs.turn, gs.phase, gs.guessed.length, gs.revealed.length]);

  useEffect(() => () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); }, []);

  const doSpin = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.spinning || prev.phase !== 'spin' || prev.players[prev.turn].isAI) return prev;
      const segIdx = Math.floor(Math.random() * NUM_SEGS);
      pendingSegRef.current = segIdx;
      const targetDeg = 360 - ((segIdx + 0.5) * SEG_DEG);
      const prevNorm = ((prev.wheelAngle % 360) + 360) % 360;
      const diff = ((targetDeg - prevNorm) + 360) % 360;
      const newAngle = prev.wheelAngle + diff + (5 + Math.floor(Math.random() * 5)) * 360;
      return { ...prev, spinning: true, wheelAngle: newAngle, message: '🎡 Spinning…' };
    });
    spinTimerRef.current = setTimeout(() => {
      setGs(prev => {
        if (!prev || !prev.spinning) return prev;
        const idx = pendingSegRef.current ?? 0;
        pendingSegRef.current = null;
        return { ...applySpinResult(prev, idx), spinning: false };
      });
    }, 4300);
  }, []);

  const onGuess = useCallback((letter: string) => {
    setGs(prev => {
      if (!prev || prev.players[prev.turn].isAI || prev.spinning) return prev;
      if (prev.phase === 'guessing') return handleGuess(prev, letter);
      if (prev.phase === 'vowel') return handleVowel(prev, letter);
      return prev;
    });
  }, []);

  const doBuyVowel = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.phase !== 'spin' || prev.players[prev.turn].isAI || prev.spinning) return prev;
      if (prev.players[prev.turn].roundScore < VOWEL_COST) return { ...prev, message: `Need $${VOWEL_COST} to buy a vowel!` };
      const unrevVowels = ['A','E','I','O','U'].filter(v => !prev.guessed.includes(v) && prev.puzzle.answer.includes(v));
      if (unrevVowels.length === 0) return { ...prev, message: 'All vowels already revealed!' };
      return { ...prev, phase: 'vowel', vowelFree: false, message: `Pick a vowel to buy for $${VOWEL_COST}.` };
    });
  }, []);

  const nextRound = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const r = prev.round + 1;
      const nextPuzzle = prev.puzzles[r - 1] ?? prev.puzzles[0];
      const next = r % prev.players.length;
      return { ...prev, round: r, puzzle: nextPuzzle, revealed: [], guessed: [], phase: prev.players[next].isAI ? 'ai' : 'spin', turn: next, segValue: null, lastSegLabel: '', doubleActive: false, vowelFree: false, spinning: false, roundWinner: '', showHint: false, message: `Round ${r} — ${nextPuzzle.cat}. ${prev.players[next].name} goes first!` };
    });
  }, []);

  const { players, turn, phase, puzzle, revealed, guessed, wheelAngle, spinning, message, doubleActive, showHint } = gs;
  const isHuman = !players[turn]?.isAI;
  const curPlayer = players[turn];
  const humanPlayer = players[0];
  const noConsLeft = allConsonantsRevealed(puzzle, guessed);
  const unrevVowelCount = ['A','E','I','O','U'].filter(v => !guessed.includes(v) && puzzle.answer.includes(v)).length;
  const canBuyVowel = isHuman && phase === 'spin' && !spinning && humanPlayer.roundScore >= VOWEL_COST && unrevVowelCount > 0;
  const canSpin = isHuman && phase === 'spin' && !spinning;

  return (
    <GameLayout
      round={gs.round} totalRounds={gs.totalRounds} diffLabel="AI MODE"
      players={players} turn={turn}
      puzzle={{ cat: puzzle.cat, answer: puzzle.answer, hint: puzzle.hint }}
      revealed={revealed} guessed={guessed}
      wheelAngle={wheelAngle} spinning={spinning}
      message={message} doubleActive={doubleActive} showHint={showHint}
      onMenu={onMenu} onToggleHint={() => setGs(p => p ? { ...p, showHint: !p.showHint } : p)}
    >
      {isHuman && phase === 'spin' && !spinning && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={doSpin} disabled={!canSpin || (noConsLeft && !canBuyVowel)}
            style={{ padding: '11px 26px', background: !canSpin || (noConsLeft && !canBuyVowel) ? 'rgba(37,99,235,0.25)' : 'linear-gradient(135deg,#1a3a8a,#2563eb)', border: '2px solid #3b82f6', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 15, cursor: !canSpin || (noConsLeft && !canBuyVowel) ? 'not-allowed' : 'pointer', opacity: !canSpin || (noConsLeft && !canBuyVowel) ? 0.5 : 1, boxShadow: !canSpin || (noConsLeft && !canBuyVowel) ? 'none' : '0 4px 14px rgba(37,99,235,0.5)' }}>
            🎡 SPIN!
          </button>
          <button onClick={doBuyVowel} disabled={!canBuyVowel}
            style={{ padding: '11px 16px', background: canBuyVowel ? 'linear-gradient(135deg,#14532d,#16a34a)' : 'rgba(255,255,255,0.05)', border: `2px solid ${canBuyVowel ? '#22c55e' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, color: canBuyVowel ? '#fff' : '#444', fontWeight: 700, fontSize: 13, cursor: canBuyVowel ? 'pointer' : 'not-allowed' }}>
            Buy Vowel −$250
          </button>
          <button onClick={() => setShowSolve(true)}
            style={{ padding: '11px 16px', background: 'linear-gradient(135deg,#7c1a1a,#dc2626)', border: '2px solid #ef4444', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>
            Solve! 🏆
          </button>
        </div>
      )}
      {isHuman && phase === 'guessing' && (
        <PuzzleLetterInput onGuess={onGuess} onCancel={() => {}} />
      )}
      {isHuman && phase === 'vowel' && (
        <PuzzleLetterInput onGuess={onGuess} onCancel={() => {}} />
      )}
      {false && isHuman && phase === 'vowel' && (
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 6 }}>▼ Pick a vowel ({gs.vowelFree ? '🎁 FREE!' : `−$${VOWEL_COST}`})</div>
          <LetterKeys guessed={guessed} onGuess={onGuess} mode="vowel" />
        </div>
      )}
      {isHuman && spinning && <div style={{ color: '#888', fontSize: 14, fontWeight: 700 }}>🎡 The wheel is spinning…</div>}
      {!isHuman && ['spin', 'guessing', 'vowel', 'ai'].includes(phase) && !spinning && (
        <div style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#888', fontSize: 13 }}>
          🤖 {curPlayer?.name} is thinking…
        </div>
      )}
      {isHuman && phase === 'spin' && noConsLeft && (
        <div style={{ fontSize: 12, color: '#f59e0b', textAlign: 'center', padding: '4px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
          All consonants revealed! Buy a vowel or try to Solve!
        </div>
      )}
      {showSolve && <SolveModal onSubmit={t => { setGs(p => p ? handleSolve(p, t) : p); setShowSolve(false); }} onCancel={() => setShowSolve(false)} />}
      {phase === 'round_over' && (
        <RoundModal roundWinner={gs.roundWinner} puzzle={puzzle} round={gs.round} totalRounds={gs.totalRounds}
          players={players.map(p => ({ name: p.name, totalScore: p.totalScore }))} onNext={nextRound} />
      )}
      {phase === 'game_over' && <GameOverModal players={players.map(p => ({ name: p.name, totalScore: p.totalScore }))} onNew={onMenu} />}
    </GameLayout>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SpinSolve() {
  const [mode, setMode] = useState<AppMode>('pick');
  const [aiGs, setAiGs] = useState<GS | null>(null);

  const startAiGame = useCallback((bots: BotConfig[], puzzleDiff: Difficulty, rounds: number) => {
    setAiGs(initGame(bots, puzzleDiff, rounds));
    setMode('ai_game');
  }, []);

  if (mode === 'pick') return <ModePickScreen onPick={m => setMode(m)} />;
  if (mode === 'ai_setup') return <AiSetupScreen onBack={() => setMode('pick')} onStart={startAiGame} />;
  if (mode === 'ai_game' && aiGs) return <AiGame initialGs={aiGs} onMenu={() => { setAiGs(null); setMode('pick'); }} />;
  if (mode === 'online_lobby' || mode === 'online_game') return <OnlineLobbyScreen onBack={() => setMode('pick')} />;
  return <ModePickScreen onPick={m => setMode(m)} />;
}
