import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { useRelaySocket } from '@/lib/relay-socket';
import { QRCode } from '@/components/QRCode';

// ─── QUESTION BANK (547 questions, Grades 5–10, 4 subjects) ──────────────────
type Grade = 5 | 6 | 7 | 8 | 9 | 10;
type Subject = 'Science' | 'History' | 'Geography' | 'Math';
type Diff = 'Easy' | 'Medium' | 'Hard';

interface Q {
  g: Grade; s: Subject; t: string; d: Diff;
  q: string; opts: [string, string, string, string]; ans: 0 | 1 | 2 | 3;
}

const QUESTIONS: Q[] = [
  // ── SCIENCE Grade 5 ──
  { g:5, s:'Science', t:'States of Matter',       d:'Easy',   q:"What are the three common states of matter?",                                              opts:["Solid, liquid, gas","Hot, cold, warm","Wood, water, air","Hard, soft, fluid"],               ans:0 },
  { g:5, s:'Science', t:'States of Matter',       d:'Easy',   q:"When liquid water is cooled to 0°C, it changes to:",                                       opts:["Gas (steam)","Solid (ice)","Plasma","A mixture"],                                           ans:1 },
  { g:5, s:'Science', t:'States of Matter',       d:'Easy',   q:"The process of liquid water turning into water vapour is called:",                          opts:["Condensation","Freezing","Evaporation","Melting"],                                          ans:2 },
  { g:5, s:'Science', t:'States of Matter',       d:'Medium', q:"When water vapour cools and changes back into liquid droplets, this is:",                   opts:["Evaporation","Sublimation","Condensation","Precipitation"],                                  ans:2 },
  { g:5, s:'Science', t:'States of Matter',       d:'Hard',   q:"Which change of state requires energy to be ADDED to the substance?",                      opts:["Freezing","Condensation","Melting","Deposition"],                                           ans:2 },
  { g:5, s:'Science', t:'Properties of Matter',   d:'Easy',   q:"Volume is best defined as:",                                                               opts:["The amount of matter in an object","The amount of space an object occupies","How much an object weighs","The temperature of an object"], ans:1 },
  { g:5, s:'Science', t:'Properties of Matter',   d:'Medium', q:"An object will float in water if its density is:",                                         opts:["Greater than water","Equal to water","Less than water","Double that of water"],              ans:2 },
  { g:5, s:'Science', t:'Properties of Matter',   d:'Hard',   q:"A rock has a mass of 50 g and a volume of 25 cm³. Its density is:",                        opts:["75 g/cm³","25 g/cm³","2 g/cm³","0.5 g/cm³"],                                               ans:2 },
  { g:5, s:'Science', t:'Physical & Chemical',    d:'Easy',   q:"Which of the following is a PHYSICAL change?",                                             opts:["A log burning","Iron rusting","Ice melting in a glass","Milk going sour"],                   ans:2 },
  { g:5, s:'Science', t:'Physical & Chemical',    d:'Easy',   q:"Which of the following is a CHEMICAL change?",                                             opts:["Cutting paper","Water boiling","Wood burning","Glass breaking"],                            ans:2 },
  { g:5, s:'Science', t:'Ecosystems',             d:'Easy',   q:"Organisms that make their own food using sunlight are called:",                             opts:["Consumers","Decomposers","Producers","Predators"],                                          ans:2 },
  { g:5, s:'Science', t:'Ecosystems',             d:'Easy',   q:"Animals that eat only plants are called:",                                                 opts:["Carnivores","Omnivores","Herbivores","Decomposers"],                                         ans:2 },
  { g:5, s:'Science', t:'Ecosystems',             d:'Medium', q:"The arrows in a food chain represent the flow of:",                                        opts:["Water","Energy","Carbon dioxide","Oxygen"],                                                 ans:1 },
  { g:5, s:'Science', t:'Ecosystems',             d:'Hard',   q:"Energy is LOST as it moves up a food chain because:",                                      opts:["Animals share food","Organisms use energy for their own life processes, releasing heat","Plants store all energy","Predators have fewer cells"], ans:1 },
  { g:5, s:'Science', t:'Adaptations',            d:'Easy',   q:"A physical feature or behavior that helps an organism survive is called a(n):",            opts:["Mutation","Adaptation","Evolution","Instinct"],                                             ans:1 },
  { g:5, s:'Science', t:'Adaptations',            d:'Medium', q:"A polar bear's thick white fur is an adaptation that helps it:",                           opts:["Attract prey in the rainforest","Stay warm and blend into snowy surroundings","Cool down in summer","Communicate with other bears"], ans:1 },
  { g:5, s:'Science', t:'Adaptations',            d:'Hard',   q:"Hibernation helps some animals survive winter by:",                                        opts:["Growing more fur","Entering a deep sleep state to conserve energy when food is scarce","Migrating south","Eating more food in summer"], ans:1 },
  { g:5, s:'Science', t:'Forces & Motion',        d:'Easy',   q:"Friction is a force that:",                                                                opts:["Speeds objects up","Slows objects down by resisting motion","Pulls objects together","Causes objects to float"], ans:1 },
  { g:5, s:'Science', t:'Forces & Motion',        d:'Medium', q:"When balanced forces act on an object at rest, the object will:",                          opts:["Start moving","Stay at rest","Accelerate","Become lighter"],                               ans:1 },
  { g:5, s:'Science', t:'Simple Machines',        d:'Easy',   q:"A see-saw (teeter-totter) is an example of which simple machine?",                         opts:["Pulley","Lever","Wedge","Screw"],                                                           ans:1 },
  { g:5, s:'Science', t:'Simple Machines',        d:'Easy',   q:"A wheel with a rope around it used to lift objects is called a:",                          opts:["Lever","Pulley","Wedge","Screw"],                                                           ans:1 },
  { g:5, s:'Science', t:'Forms of Energy',        d:'Easy',   q:"Energy that an object has because of its motion is called:",                               opts:["Potential energy","Chemical energy","Kinetic energy","Thermal energy"],                      ans:2 },
  { g:5, s:'Science', t:'Forms of Energy',        d:'Medium', q:"When a ball rolls down a hill, what energy transformation occurs?",                        opts:["Chemical → thermal","Potential → kinetic","Kinetic → potential","Thermal → sound"],          ans:1 },
  { g:5, s:'Science', t:'Forms of Energy',        d:'Hard',   q:"The Law of Conservation of Energy states that energy:",                                    opts:["Can be created from nothing","Is destroyed when used","Cannot be created or destroyed, only transferred or transformed","Always becomes heat"], ans:2 },
  { g:5, s:'Science', t:'Water Cycle',            d:'Easy',   q:"Water that falls from clouds as rain, snow, sleet, or hail is called:",                   opts:["Evaporation","Condensation","Precipitation","Runoff"],                                      ans:2 },
  { g:5, s:'Science', t:'Solar System',           d:'Easy',   q:"How many planets are in our solar system?",                                                opts:["7","8","9","10"],                                                                           ans:1 },
  { g:5, s:'Science', t:'Weather',                d:'Medium', q:"Climate is different from weather because climate describes:",                              opts:["Today's conditions","Average weather patterns in an area over a long period","Exact temperature on a day","Current storm activity"], ans:1 },

  // ── SCIENCE Grade 6 ──
  { g:6, s:'Science', t:'Cells',                  d:'Easy',   q:"Which organelle is the 'powerhouse' of the cell, producing energy?",                      opts:["Nucleus","Chloroplast","Mitochondria","Ribosome"],                                          ans:2 },
  { g:6, s:'Science', t:'Cells',                  d:'Easy',   q:"Which organelle is found in plant cells but NOT in animal cells?",                         opts:["Mitochondria","Ribosome","Nucleus","Chloroplast"],                                          ans:3 },
  { g:6, s:'Science', t:'Cells',                  d:'Medium', q:"The cell membrane controls what enters and exits. This property is called:",               opts:["Rigidity","Semi-permeability","Diffusion","Osmosis"],                                       ans:1 },
  { g:6, s:'Science', t:'Cells',                  d:'Hard',   q:"Which organelle packages and ships proteins to other parts of the cell?",                  opts:["Ribosome","Golgi apparatus","Lysosome","Endoplasmic reticulum"],                            ans:1 },
  { g:6, s:'Science', t:'Ecosystems',             d:'Easy',   q:"An organism that breaks down dead matter and returns nutrients to the soil is a:",         opts:["Producer","Consumer","Predator","Decomposer"],                                              ans:3 },
  { g:6, s:'Science', t:'Ecosystems',             d:'Easy',   q:"In a food chain, which organism is always at the base?",                                   opts:["Herbivore","Carnivore","Producer (plant)","Omnivore"],                                      ans:2 },
  { g:6, s:'Science', t:'Ecosystems',             d:'Medium', q:"The role of an organism in its ecosystem — including what it eats and where it lives — is its:", opts:["Habitat","Niche","Biome","Territory"],                                               ans:1 },
  { g:6, s:'Science', t:'Space',                  d:'Easy',   q:"Which planet is closest to the Sun?",                                                     opts:["Venus","Earth","Mercury","Mars"],                                                           ans:2 },
  { g:6, s:'Science', t:'Space',                  d:'Easy',   q:"Earth's seasons are caused by:",                                                           opts:["Earth's distance from the Sun","The tilt of Earth's axis","Speed of Earth's rotation","Solar flares"], ans:1 },
  { g:6, s:'Science', t:'Space',                  d:'Medium', q:"Which planet has the most known moons in our solar system?",                               opts:["Jupiter","Saturn","Uranus","Neptune"],                                                      ans:1 },
  { g:6, s:'Science', t:'Space',                  d:'Hard',   q:"Which correctly describes the difference between a meteor and a meteorite?",               opts:["They are the same object at different distances","A meteor burns in the atmosphere; a meteorite lands on Earth","A meteorite is larger","A meteor is a comet fragment only"], ans:1 },
  { g:6, s:'Science', t:'Electricity',            d:'Easy',   q:"Which of the following materials is a good conductor of electricity?",                    opts:["Wood","Rubber","Copper","Plastic"],                                                         ans:2 },
  { g:6, s:'Science', t:'Electricity',            d:'Easy',   q:"In a series circuit, if one bulb burns out, the other bulbs will:",                       opts:["Glow brighter","Also go out","Keep glowing normally","Flicker"],                           ans:1 },
  { g:6, s:'Science', t:'Electricity',            d:'Medium', q:"In a parallel circuit, if one bulb burns out, the remaining bulbs will:",                  opts:["Also go out","Get dimmer","Continue to glow","Overheat"],                                  ans:2 },
  { g:6, s:'Science', t:'Electricity',            d:'Hard',   q:"If V = 12V and R = 4 ohms (V = IR), what is the current?",                                opts:["48 amps","8 amps","3 amps","0.3 amps"],                                                     ans:2 },
  { g:6, s:'Science', t:'Mixtures',               d:'Easy',   q:"Which of the following is a pure substance?",                                             opts:["Air","Salt water","Gold","Milk"],                                                           ans:2 },
  { g:6, s:'Science', t:'Mixtures',               d:'Medium', q:"When salt dissolves in water, the salt is the _____ and water is the _____.",               opts:["Solvent; solute","Solute; solvent","Mixture; solution","Compound; element"],                ans:1 },
  { g:6, s:'Science', t:'Biomes',                 d:'Easy',   q:"The biome that receives the most rainfall and has the greatest biodiversity is the:",      opts:["Savanna","Temperate forest","Tropical rainforest","Tundra"],                                ans:2 },
  { g:6, s:'Science', t:'Biomes',                 d:'Medium', q:"Which biome covers most of central Canada and is dominated by coniferous trees?",          opts:["Temperate deciduous forest","Boreal forest (taiga)","Grassland","Chaparral"],              ans:1 },

  // ── SCIENCE Grade 7 ──
  { g:7, s:'Science', t:'Body Systems',           d:'Easy',   q:"Which organ system is responsible for removing carbon dioxide from the blood?",           opts:["Digestive","Nervous","Respiratory","Skeletal"],                                             ans:2 },
  { g:7, s:'Science', t:'Body Systems',           d:'Easy',   q:"The heart is part of which body system?",                                                 opts:["Respiratory system","Circulatory system","Digestive system","Nervous system"],              ans:1 },
  { g:7, s:'Science', t:'Body Systems',           d:'Medium', q:"The smallest blood vessels, where gas exchange occurs with cells, are called:",            opts:["Arteries","Veins","Capillaries","Ventricles"],                                              ans:2 },
  { g:7, s:'Science', t:'Body Systems',           d:'Hard',   q:"The hypothalamus regulating body temperature is an example of:",                          opts:["The immune response","Homeostasis","The reflex arc","Genetic expression"],                  ans:1 },
  { g:7, s:'Science', t:'Evolution',              d:'Easy',   q:"Darwin's theory of natural selection states organisms best suited to their environment are more likely to:", opts:["Mutate rapidly","Migrate to warmer areas","Survive and reproduce","Develop larger brains"], ans:2 },
  { g:7, s:'Science', t:'Evolution',              d:'Medium', q:"Variation within a population is important for natural selection because it:",             opts:["Makes all individuals equally fit","Ensures some individuals survive environmental changes","Prevents mutation","Increases reproduction"], ans:1 },
  { g:7, s:'Science', t:'Ecology',                d:'Easy',   q:"A relationship where both organisms benefit is called:",                                   opts:["Parasitism","Commensalism","Competition","Mutualism"],                                      ans:3 },
  { g:7, s:'Science', t:'Ecology',                d:'Medium', q:"The maximum population size that an environment can support is its:",                      opts:["Biodiversity index","Carrying capacity","Biomass","Trophic level"],                         ans:1 },
  { g:7, s:'Science', t:'Ecology',                d:'Hard',   q:"When a forest fire destroys an ecosystem and pioneer species colonize bare rock, this is:", opts:["Secondary succession","Primary succession","Eutrophication","Bioremediation"],             ans:1 },
  { g:7, s:'Science', t:'Heat',                   d:'Easy',   q:"Heat transfer through direct contact between two objects is called:",                     opts:["Radiation","Convection","Conduction","Condensation"],                                       ans:2 },
  { g:7, s:'Science', t:'Heat',                   d:'Easy',   q:"Heat energy transferred through a fluid by the movement of the fluid itself is called:",  opts:["Conduction","Convection","Radiation","Evaporation"],                                        ans:1 },
  { g:7, s:'Science', t:'Heat',                   d:'Hard',   q:"The amount of heat needed to raise 1 gram of a substance by 1°C is its:",                 opts:["Thermal conductivity","Latent heat","Specific heat capacity","Caloric value"],              ans:2 },
  { g:7, s:'Science', t:'Flight',                 d:'Easy',   q:"The four forces of flight are lift, thrust, drag, and:",                                  opts:["Friction","Tension","Weight (gravity)","Compression"],                                      ans:2 },
  { g:7, s:'Science', t:'Flight',                 d:'Easy',   q:"Bernoulli's principle: as the speed of a fluid increases, its pressure:",                  opts:["Increases","Remains constant","Decreases","Doubles"],                                      ans:2 },
  { g:7, s:'Science', t:'Structures',             d:'Easy',   q:"A force that pulls or stretches a material is called:",                                    opts:["Compression","Tension","Shear","Torsion"],                                                 ans:1 },
  { g:7, s:'Science', t:'Cells',                  d:'Medium', q:"Cell theory: all living things are made of cells, and all cells come from:",               opts:["The environment","Non-living matter","Pre-existing cells","Chemical reactions"],            ans:2 },
  { g:7, s:'Science', t:'Cells',                  d:'Hard',   q:"Meiosis results in:",                                                                     opts:["Two identical cells","Four genetically identical cells","Four genetically unique cells with half the chromosomes","One cell with double DNA"], ans:2 },

  // ── SCIENCE Grade 8 ──
  { g:8, s:'Science', t:'Atomic Theory',          d:'Easy',   q:"The atomic number of an element equals the number of:",                                   opts:["Neutrons in the nucleus","Protons in the nucleus","Electrons in the outer shell","Total nucleons"], ans:1 },
  { g:8, s:'Science', t:'Atomic Theory',          d:'Easy',   q:"Atoms of the same element with different numbers of neutrons are called:",                opts:["Allotropes","Ions","Isotopes","Compounds"],                                                 ans:2 },
  { g:8, s:'Science', t:'Atomic Theory',          d:'Medium', q:"What is the chemical symbol for gold?",                                                   opts:["Go","Gd","Au","Ag"],                                                                        ans:2 },
  { g:8, s:'Science', t:'Atomic Theory',          d:'Hard',   q:"An atom that has lost or gained electrons and carries an electric charge is called a(n):", opts:["Isotope","Allotrope","Ion","Neutron"],                                                      ans:2 },
  { g:8, s:'Science', t:'Chemistry',              d:'Easy',   q:"A substance with a pH of 2 is best described as:",                                        opts:["Weakly acidic","Strongly acidic","Neutral","Strongly basic"],                               ans:1 },
  { g:8, s:'Science', t:'Chemistry',              d:'Medium', q:"The Law of Conservation of Mass states that in a chemical reaction:",                     opts:["Mass is created","Mass is destroyed","Total mass of reactants equals total mass of products","Products are heavier"], ans:2 },
  { g:8, s:'Science', t:'Chemistry',              d:'Medium', q:"When an acid and a base react, they produce water and a:",                                opts:["Gas","Salt","Metal","Precipitate only"],                                                    ans:1 },
  { g:8, s:'Science', t:'Chemistry',              d:'Hard',   q:"In 2H₂ + O₂ → 2H₂O, how many atoms of hydrogen are on the reactant side?",               opts:["2","4","6","8"],                                                                            ans:1 },
  { g:8, s:'Science', t:'Forces & Motion',        d:'Easy',   q:"Newton's First Law: an object at rest will:",                                             opts:["Accelerate due to gravity","Remain at rest unless an unbalanced force acts on it","Always have friction acting on it","Move in a circle"], ans:1 },
  { g:8, s:'Science', t:'Forces & Motion',        d:'Easy',   q:"Speed is calculated using the formula:",                                                  opts:["Speed = Force ÷ Mass","Speed = Distance ÷ Time","Speed = Mass × Acceleration","Speed = Distance × Time"], ans:1 },
  { g:8, s:'Science', t:'Forces & Motion',        d:'Medium', q:"Newton's Second Law of Motion is expressed as:",                                          opts:["F = mv","F = ma","F = d/t","F = m/v"],                                                     ans:1 },
  { g:8, s:'Science', t:'Forces & Motion',        d:'Hard',   q:"An object is moving at 10 m/s and accelerates at 2 m/s². Speed after 5 seconds?",        opts:["12 m/s","15 m/s","20 m/s","25 m/s"],                                                       ans:2 },
  { g:8, s:'Science', t:'Optics',                 d:'Easy',   q:"When light passes from air into glass and bends, this is called:",                        opts:["Reflection","Diffraction","Refraction","Dispersion"],                                       ans:2 },
  { g:8, s:'Science', t:'Optics',                 d:'Medium', q:"Which colour of visible light has the shortest wavelength?",                              opts:["Red","Yellow","Green","Violet"],                                                            ans:3 },
  { g:8, s:'Science', t:'Genetics',               d:'Easy',   q:"In a Punnett square, 'Bb' means the organism is:",                                        opts:["Homozygous dominant","Homozygous recessive","Heterozygous","A carrier only"],               ans:2 },
  { g:8, s:'Science', t:'Genetics',               d:'Easy',   q:"DNA is found primarily in which cell organelle?",                                         opts:["Mitochondria","Ribosome","Cell membrane","Nucleus"],                                        ans:3 },
  { g:8, s:'Science', t:'Genetics',               d:'Medium', q:"The physical traits you can observe in an organism are its:",                             opts:["Genotype","Phenotype","Alleles","Chromosomes"],                                             ans:1 },
  { g:8, s:'Science', t:'Genetics',               d:'Hard',   q:"A Bb × Bb cross produces offspring in what dominant:recessive phenotype ratio?",          opts:["1:1","2:1","3:1","4:0"],                                                                    ans:2 },
  { g:8, s:'Science', t:'Earth Science',          d:'Easy',   q:"Magma that reaches Earth's surface through a volcano is called:",                         opts:["Metamorphic rock","Lava","Sediment","Magma still"],                                         ans:1 },
  { g:8, s:'Science', t:'Earth Science',          d:'Medium', q:"The process by which wind, water, and ice wear away rock and carry it to new locations:", opts:["Deposition","Weathering","Erosion","Metamorphism"],                                         ans:2 },
  { g:8, s:'Science', t:'Earth Science',          d:'Hard',   q:"The continents were once joined in a supercontinent called:",                             opts:["Laurasia","Gondwana","Pangaea","Atlantis"],                                                 ans:2 },

  // ── HISTORY Grade 6 ──
  { g:6, s:'History', t:'Ancient Egypt',          d:'Easy',   q:"Ancient Egypt's civilization grew along which major river?",                              opts:["Tigris","Euphrates","Nile","Amazon"],                                                       ans:2 },
  { g:6, s:'History', t:'Ancient Egypt',          d:'Easy',   q:"The ruler of ancient Egypt was called a:",                                                opts:["Caesar","Emperor","Pharaoh","Sultan"],                                                      ans:2 },
  { g:6, s:'History', t:'Ancient Egypt',          d:'Medium', q:"The ancient Egyptian writing system that used pictures and symbols is called:",           opts:["Cuneiform","Hieroglyphics","Sanskrit","Runes"],                                             ans:1 },
  { g:6, s:'History', t:'Ancient Egypt',          d:'Hard',   q:"The Rosetta Stone was important because it allowed historians to:",                       opts:["Find the location of pyramids","Decode Egyptian hieroglyphics","Understand Greek trade routes","Map the Nile River"], ans:1 },
  { g:6, s:'History', t:'Ancient Greece',         d:'Easy',   q:"The city-state of Athens is known for inventing an early form of:",                      opts:["Monarchy","Democracy","Feudalism","Theocracy"],                                             ans:1 },
  { g:6, s:'History', t:'Ancient Greece',         d:'Medium', q:"Which Greek philosopher taught by asking questions and was sentenced to death?",         opts:["Aristotle","Plato","Socrates","Homer"],                                                      ans:2 },
  { g:6, s:'History', t:'Ancient Greece',         d:'Hard',   q:"Alexander the Great conquered a vast empire stretching from Greece to:",                 opts:["China","Rome","Northwestern India","Sub-Saharan Africa"],                                   ans:2 },
  { g:6, s:'History', t:'Ancient Rome',           d:'Easy',   q:"Julius Caesar was assassinated on March 15, 44 BCE — a date known as the:",               opts:["Ides of March","Nones of April","Roman Sabbath","Day of Jupiter"],                         ans:0 },
  { g:6, s:'History', t:'Ancient Rome',           d:'Medium', q:"The Romans built aqueducts to:",                                                         opts:["Defend city walls","Carry fresh water into cities","Transport soldiers","Support bridges"],  ans:1 },
  { g:6, s:'History', t:'Ancient Rome',           d:'Hard',   q:"The fall of the Western Roman Empire is traditionally dated to:",                         opts:["100 BCE","313 CE","476 CE","1066 CE"],                                                      ans:2 },
  { g:6, s:'History', t:'Mesopotamia',            d:'Easy',   q:"Mesopotamia was located between which two rivers?",                                       opts:["Nile and Congo","Tigris and Euphrates","Amazon and Orinoco","Indus and Ganges"],            ans:1 },
  { g:6, s:'History', t:'Mesopotamia',            d:'Medium', q:"Hammurabi's Code is significant because it was one of the world's first:",                opts:["Mathematical texts","Written law codes","Religious manuscripts","Architectural plans"],      ans:1 },
  { g:6, s:'History', t:'Ancient China',          d:'Easy',   q:"The Great Wall of China was originally built to protect against:",                       opts:["Flooding","Invaders from the north","Earthquakes","Ocean storms"],                          ans:1 },
  { g:6, s:'History', t:'Ancient China',          d:'Medium', q:"The Silk Road primarily connected China to:",                                             opts:["Japan and Korea","The Americas","Central Asia, the Middle East, and Europe","Sub-Saharan Africa"], ans:2 },
  { g:6, s:'History', t:'Indigenous Canada',      d:'Medium', q:"The Haudenosaunee (Iroquois) Confederacy was an early example of:",                      opts:["A trading company","A democratic alliance of nations","A European colony","A religious order"], ans:1 },
  { g:6, s:'History', t:'World History',          d:'Easy',   q:"Medieval Europe's social system where lords owned land and peasants worked it was called:", opts:["Democracy","Feudalism","Capitalism","Communism"],                                          ans:1 },

  // ── HISTORY Grade 7 ──
  { g:7, s:'History', t:'Age of Exploration',     d:'Easy',   q:"Christopher Columbus arrived in the Americas in:",                                       opts:["1488","1492","1500","1519"],                                                                ans:1 },
  { g:7, s:'History', t:'Age of Exploration',     d:'Medium', q:"The Columbian Exchange refers to the transfer of people, plants, animals, and diseases between:", opts:["Europe and Africa","Asia and the Americas","The Americas and Europe/Africa/Asia","England and France"], ans:2 },
  { g:7, s:'History', t:'Age of Exploration',     d:'Hard',   q:"The Treaty of Tordesillas (1494) divided newly discovered lands between:",               opts:["England and France","Spain and Portugal","Spain and the Netherlands","England and Spain"],   ans:1 },
  { g:7, s:'History', t:'American Revolution',    d:'Easy',   q:"The Declaration of Independence was signed in:",                                         opts:["1775","1776","1783","1789"],                                                                ans:1 },
  { g:7, s:'History', t:'American Revolution',    d:'Easy',   q:"The main cause of colonial anger leading to the Revolution was:",                        opts:["Religious persecution","Taxation without representation","Invasion by France","Shortage of farmland"], ans:1 },
  { g:7, s:'History', t:'American Revolution',    d:'Medium', q:"The Boston Tea Party (1773) was a protest against:",                                     opts:["British immigration laws","A tax on tea imposed by Britain","Forced quartering of soldiers","Closing of colonial ports"], ans:1 },
  { g:7, s:'History', t:'American Revolution',    d:'Hard',   q:"Benjamin Franklin's role in the American Revolution included:",                          opts:["Leading colonial armies","Writing the Declaration of Independence","Securing French military and financial support","Designing the US Constitution"], ans:2 },
  { g:7, s:'History', t:'US Government',          d:'Medium', q:"The first ten amendments to the US Constitution are known as the:",                      opts:["Articles of Confederation","Bill of Rights","Declaration of Rights","Civil Rights Act"],    ans:1 },
  { g:7, s:'History', t:'New France / Canada',    d:'Easy',   q:"Samuel de Champlain founded the colony and city of Quebec in:",                          opts:["1497","1534","1608","1663"],                                                                ans:2 },
  { g:7, s:'History', t:'New France / Canada',    d:'Medium', q:"The Seven Years' War ended with the 1763 Treaty of Paris, which gave control of New France to:", opts:["France","Spain","Britain","The United States"],                                          ans:2 },
  { g:7, s:'History', t:'Canadian Confederation', d:'Easy',   q:"Canada became a self-governing Dominion through the British North America Act in:",       opts:["1776","1812","1867","1914"],                                                                ans:2 },
  { g:7, s:'History', t:'Canadian Confederation', d:'Hard',   q:"The original four provinces that joined Confederation in 1867 were:",                    opts:["Ontario, Quebec, Nova Scotia, New Brunswick","Ontario, Quebec, BC, Manitoba","Nova Scotia, New Brunswick, PEI, Newfoundland","Ontario, Quebec, Alberta, Saskatchewan"], ans:0 },
  { g:7, s:'History', t:'Renaissance',            d:'Easy',   q:"The Renaissance began in which country?",                                               opts:["France","England","Germany","Italy"],                                                       ans:3 },
  { g:7, s:'History', t:'Renaissance',            d:'Easy',   q:"Johannes Gutenberg's most important invention was the:",                                 opts:["Steam engine","Printing press with movable type","Gunpowder","Compass"],                    ans:1 },
  { g:7, s:'History', t:'Renaissance',            d:'Hard',   q:"Nicolaus Copernicus proposed the heliocentric model, which stated that:",                opts:["Earth is the centre of the universe","The Sun is the centre of the solar system","The Moon orbits the Sun","Stars are stationary"], ans:1 },
  { g:7, s:'History', t:'Reformation',            d:'Medium', q:"Martin Luther is associated with the Protestant Reformation because he:",                opts:["Led armies against the Pope","Founded the Anglican Church","Challenged Catholic Church practices with his 95 Theses","Translated the Bible into German"], ans:2 },
  { g:7, s:'History', t:'Age of Exploration',     d:'Medium', q:"The Spanish conquistador Hernán Cortés conquered which civilization in 1521?",           opts:["The Inca","The Maya","The Aztec","The Iroquois"],                                           ans:2 },

  // ── HISTORY Grade 8 ──
  { g:8, s:'History', t:'US Civil War',           d:'Easy',   q:"The American Civil War was fought between the Union and Confederacy from:",               opts:["1846–1850","1861–1865","1870–1875","1898–1902"],                                            ans:1 },
  { g:8, s:'History', t:'US Civil War',           d:'Easy',   q:"The Emancipation Proclamation in 1863 declared that:",                                   opts:["The Civil War was over","Enslaved people in Confederate states were free","Women gained the right to vote","Slavery was abolished nationwide"], ans:1 },
  { g:8, s:'History', t:'US Civil War',           d:'Medium', q:"The Underground Railroad was:",                                                          opts:["A railway built by freed slaves","A literal underground tunnel system","A secret network of routes and safe houses helping enslaved people escape","A government program in the North"], ans:2 },
  { g:8, s:'History', t:'US Civil War',           d:'Hard',   q:"The Battle of Gettysburg (July 1863) is a turning point because:",                       opts:["It was the first major Union victory","Confederate General Lee's failed invasion of the North ended hopes of a Confederate victory","It led to immediate surrender","It opened the western theatre"], ans:1 },
  { g:8, s:'History', t:'Reconstruction',         d:'Easy',   q:"Reconstruction (1865–1877) aimed at:",                                                   opts:["Rebuilding the northern economy","Reuniting the nation and integrating freed Black Americans","Expanding westward territory","Building transcontinental railroads"], ans:1 },
  { g:8, s:'History', t:'Reconstruction',         d:'Medium', q:"The 13th Amendment (1865) officially:",                                                  opts:["Gave women the right to vote","Abolished slavery throughout the United States","Gave citizenship to formerly enslaved people","Created the right to vote regardless of race"], ans:1 },
  { g:8, s:'History', t:'Reconstruction',         d:'Hard',   q:"Jim Crow laws enforced:",                                                               opts:["Voting rights for Black men","Racial segregation in public spaces","Economic reparations for enslaved people","Free education for all citizens"], ans:1 },
  { g:8, s:'History', t:'Industrial Revolution',  d:'Easy',   q:"The Industrial Revolution began in which country in the late 1700s?",                   opts:["France","USA","Germany","Britain"],                                                         ans:3 },
  { g:8, s:'History', t:'Industrial Revolution',  d:'Medium', q:"Eli Whitney's cotton gin (1793) had which unintended consequence?",                      opts:["Reduced demand for enslaved labour","Increased demand for enslaved labour as cotton production soared","Caused factories to close in the North","Lowered cotton prices permanently"], ans:1 },
  { g:8, s:'History', t:'Industrial Revolution',  d:'Hard',   q:"'Robber barons' like Carnegie and Rockefeller were criticized because they:",            opts:["Wasted money on wars","Monopolized industries and used harsh labour practices","Refused to innovate","Lost money in the stock market"], ans:1 },
  { g:8, s:'History', t:'WWI',                    d:'Easy',   q:"World War I began in 1914 after the assassination of:",                                  opts:["President Woodrow Wilson","Kaiser Wilhelm II","Archduke Franz Ferdinand of Austria-Hungary","Tsar Nicholas II of Russia"], ans:2 },
  { g:8, s:'History', t:'WWI',                    d:'Easy',   q:"The Allied Powers in WWI included:",                                                     opts:["Germany, Austria-Hungary, Ottoman Empire","Britain, France, Russia (and later USA)","Germany, Italy, Japan","Austria-Hungary, France, USA"], ans:1 },
  { g:8, s:'History', t:'WWI',                    d:'Medium', q:"Canada's victory at Vimy Ridge (April 1917) is significant because:",                    opts:["It ended the war in Europe","All four Canadian divisions fought together for the first time, a defining moment for Canadian identity","It was Canada's only battle","It took place in Canada"], ans:1 },
  { g:8, s:'History', t:'WWI',                    d:'Hard',   q:"The armistice ending WWI was signed on:",                                                opts:["November 11, 1918","June 28, 1919","December 7, 1941","August 14, 1945"],                    ans:0 },
  { g:8, s:'History', t:'Canadian History',       d:'Medium', q:"Nellie McClung was a prominent Canadian activist known for her fight for:",              opts:["Indigenous treaty rights","Workers' rights and strikes","Women's right to vote and be recognized as 'persons'","French language rights"], ans:2 },
  { g:8, s:'History', t:'US History',             d:'Medium', q:"The Great Depression began in the United States in 1929 after:",                         opts:["A severe drought across the Midwest","The stock market crash on Black Tuesday","A banking regulation failure by Congress","The end of WWI economic boom"], ans:1 },
  { g:8, s:'History', t:'US History',             d:'Easy',   q:"'Manifest Destiny' held that the United States was destined to:",                       opts:["Become an empire like Rome","Expand its territory westward to the Pacific Ocean","Colonize Central America","Become the world's most powerful navy"], ans:1 },

  // ── GEOGRAPHY Grade 6 ──
  { g:6, s:'Geography', t:'Map Skills',           d:'Easy',   q:"The imaginary line at 0° latitude dividing Earth into Northern and Southern Hemispheres is the:", opts:["Prime Meridian","Arctic Circle","Equator","Tropic of Cancer"],                          ans:2 },
  { g:6, s:'Geography', t:'Map Skills',           d:'Easy',   q:"Lines of longitude run:",                                                               opts:["East to west, parallel to the equator","North to south, from pole to pole","Diagonally across the globe","Only in the Northern Hemisphere"], ans:1 },
  { g:6, s:'Geography', t:'Map Skills',           d:'Medium', q:"A map's legend (key) is used to:",                                                      opts:["Show direction","Calculate distance","Explain the symbols used on the map","Indicate elevation"], ans:2 },
  { g:6, s:'Geography', t:'Map Skills',           d:'Hard',   q:"A scale of 1:50,000 means that 1 cm on the map equals _____ in real life.",              opts:["500 metres","5 kilometres","50 kilometres","500 kilometres"],                               ans:0 },
  { g:6, s:'Geography', t:'Continents & Oceans',  d:'Easy',   q:"How many continents are there on Earth?",                                               opts:["5","6","7","8"],                                                                            ans:2 },
  { g:6, s:'Geography', t:'Continents & Oceans',  d:'Easy',   q:"What is the largest ocean on Earth?",                                                   opts:["Atlantic","Indian","Arctic","Pacific"],                                                     ans:3 },
  { g:6, s:'Geography', t:'Continents & Oceans',  d:'Medium', q:"The continent with both the world's largest hot desert and longest river is:",           opts:["Asia","South America","Africa","Australia"],                                               ans:2 },
  { g:6, s:'Geography', t:'Continents & Oceans',  d:'Hard',   q:"The world's largest continent by land area is:",                                        opts:["Africa","North America","Asia","Antarctica"],                                               ans:2 },
  { g:6, s:'Geography', t:'Landforms',            d:'Easy',   q:"A large body of land surrounded by water on all sides is called a(n):",                 opts:["Peninsula","Island","Isthmus","Cape"],                                                      ans:1 },
  { g:6, s:'Geography', t:'Landforms',            d:'Easy',   q:"A piece of land almost completely surrounded by water, connected to the mainland, is a:", opts:["Delta","Island","Peninsula","Strait"],                                                     ans:2 },
  { g:6, s:'Geography', t:'Landforms',            d:'Medium', q:"The fan-shaped deposit of sediment where a river meets the sea is called a:",            opts:["Fjord","Lagoon","Delta","Canyon"],                                                          ans:2 },
  { g:6, s:'Geography', t:'Landforms',            d:'Hard',   q:"A fjord is a long narrow inlet formed by:",                                              opts:["River erosion","Volcanic activity","Glacial erosion","Earthquake activity"],               ans:2 },
  { g:6, s:'Geography', t:'Climate & Biomes',     d:'Easy',   q:"The climate zone near the equator, characterized by hot temperatures and heavy rainfall, is:", opts:["Arctic","Tropical","Temperate","Arid"],                                                ans:1 },
  { g:6, s:'Geography', t:'Climate & Biomes',     d:'Easy',   q:"Which biome has the lowest average temperature and receives very little precipitation?", opts:["Tropical rainforest","Grassland","Tundra","Temperate forest"],                             ans:2 },
  { g:6, s:'Geography', t:'Climate & Biomes',     d:'Hard',   q:"The rain shadow effect occurs on the _____ side of a mountain range, creating drier conditions.", opts:["Windward (facing wind)","Leeward (away from wind)","Northern","Southern"],          ans:1 },

  // ── GEOGRAPHY Grade 7 ──
  { g:7, s:'Geography', t:'USA Physical',         d:'Easy',   q:"The Rocky Mountains run through which two North American countries?",                    opts:["Mexico and Guatemala","USA and Canada","Canada and Russia","USA and Mexico"],              ans:1 },
  { g:7, s:'Geography', t:'USA Physical',         d:'Easy',   q:"The Mississippi River flows into which body of water?",                                  opts:["Atlantic Ocean","Pacific Ocean","Gulf of Mexico","Lake Superior"],                         ans:2 },
  { g:7, s:'Geography', t:'USA Physical',         d:'Medium', q:"The Appalachian Mountains are located in which part of the United States?",              opts:["Western USA","Central USA","Eastern USA","Southern USA only"],                             ans:2 },
  { g:7, s:'Geography', t:'Canada Physical',      d:'Easy',   q:"The capital city of Canada is:",                                                        opts:["Toronto","Vancouver","Montreal","Ottawa"],                                                  ans:3 },
  { g:7, s:'Geography', t:'Canada Physical',      d:'Medium', q:"Most of Canada's population is concentrated:",                                           opts:["In the far north","Along the west coast only","In a narrow corridor close to the US border","In the Prairie provinces"], ans:2 },
  { g:7, s:'Geography', t:'Canada Physical',      d:'Medium', q:"The prairie provinces of Canada are:",                                                   opts:["Ontario, Quebec, Nova Scotia","Manitoba, Saskatchewan, Alberta","BC, Yukon, NWT","Alberta, BC, Saskatchewan"], ans:1 },
  { g:7, s:'Geography', t:'Great Lakes',          d:'Easy',   q:"How many Great Lakes are there?",                                                        opts:["4","5","6","7"],                                                                           ans:1 },
  { g:7, s:'Geography', t:'Great Lakes',          d:'Easy',   q:"The largest of the Great Lakes by surface area is:",                                     opts:["Lake Huron","Lake Michigan","Lake Erie","Lake Superior"],                                   ans:3 },
  { g:7, s:'Geography', t:'Great Lakes',          d:'Medium', q:"Niagara Falls is on the border between Ontario, Canada, and the state of:",              opts:["Michigan","Ohio","New York","Pennsylvania"],                                               ans:2 },
  { g:7, s:'Geography', t:'USA Political',        d:'Easy',   q:"Washington, D.C. — D.C. stands for:",                                                   opts:["Dakota County","District of Columbia","Democratic Commonwealth","Department of Congress"],  ans:1 },
  { g:7, s:'Geography', t:'USA Political',        d:'Medium', q:"The only US state that is an archipelago (chain of islands) in the Pacific Ocean:",      opts:["Alaska","Florida","Hawaii","California"],                                                  ans:2 },
  { g:7, s:'Geography', t:'USA Political',        d:'Medium', q:"The largest US state by land area is:",                                                  opts:["Texas","California","Montana","Alaska"],                                                    ans:3 },
  { g:7, s:'Geography', t:'Trade & Economy',      d:'Easy',   q:"CUSMA (formerly NAFTA) is a free trade agreement between:",                              opts:["USA, UK, and France","USA, Canada, and Mexico","Canada, UK, and Australia","USA, Brazil, and Canada"], ans:1 },
  { g:7, s:'Geography', t:'Canada Political',     d:'Easy',   q:"Canada's easternmost province is:",                                                      opts:["Nova Scotia","New Brunswick","PEI","Newfoundland and Labrador"],                           ans:3 },
  { g:7, s:'Geography', t:'Canada Physical',      d:'Hard',   q:"The Northwest Passage is significant today because:",                                    opts:["It provides a rail link across northern Canada","Melting Arctic sea ice is making it increasingly navigable as a shipping route","It contains large oil reserves","It is a major tourist destination"], ans:1 },

  // ── GEOGRAPHY Grade 8 ──
  { g:8, s:'Geography', t:'South America',        d:'Easy',   q:"The Amazon River is located on which continent?",                                        opts:["Africa","Asia","South America","Australia"],                                               ans:2 },
  { g:8, s:'Geography', t:'South America',        d:'Easy',   q:"The Andes Mountains are located on the:",                                               opts:["Eastern coast of South America","Western coast of South America","Northern coast of Africa","Southern tip of North America"], ans:1 },
  { g:8, s:'Geography', t:'South America',        d:'Medium', q:"Brazil is the largest country in South America. Its capital city is:",                   opts:["Rio de Janeiro","Buenos Aires","Brasília","São Paulo"],                                     ans:2 },
  { g:8, s:'Geography', t:'South America',        d:'Hard',   q:"The Atacama Desert is one of the driest places on Earth, located in:",                   opts:["Argentina","Brazil","Peru","Chile"],                                                        ans:3 },
  { g:8, s:'Geography', t:'Europe',               d:'Easy',   q:"The capital of France is:",                                                             opts:["Lyon","Marseille","Paris","Bordeaux"],                                                      ans:2 },
  { g:8, s:'Geography', t:'Europe',               d:'Medium', q:"The Mediterranean Sea is bordered by which three continents?",                           opts:["Europe, Asia, North America","Europe, Africa, Asia","Europe, Africa, South America","Africa, Asia, Australia"], ans:1 },
  { g:8, s:'Geography', t:'Europe',               d:'Medium', q:"The capital of Germany is:",                                                            opts:["Munich","Frankfurt","Hamburg","Berlin"],                                                    ans:3 },
  { g:8, s:'Geography', t:'Africa',               d:'Easy',   q:"The Nile River flows through northeastern Africa into the:",                            opts:["Atlantic Ocean","Mediterranean Sea","Red Sea","Indian Ocean"],                              ans:1 },
  { g:8, s:'Geography', t:'Africa',               d:'Easy',   q:"The Sahara Desert is the world's largest:",                                             opts:["Desert of any type","Hot desert","Cold desert","Coastal desert"],                          ans:1 },
  { g:8, s:'Geography', t:'Africa',               d:'Medium', q:"The Strait of Gibraltar connects the Atlantic Ocean to the:",                           opts:["Red Sea","Indian Ocean","Mediterranean Sea","Black Sea"],                                   ans:2 },
  { g:8, s:'Geography', t:'Africa',               d:'Hard',   q:"The Suez Canal connects which two bodies of water?",                                    opts:["Atlantic Ocean and Mediterranean Sea","Mediterranean Sea and Red Sea","Red Sea and Indian Ocean","Black Sea and Caspian Sea"], ans:1 },
  { g:8, s:'Geography', t:'Asia',                 d:'Easy',   q:"Mount Everest, the world's highest mountain peak, is located in the:",                  opts:["Alps","Andes","Himalayas","Rockies"],                                                       ans:2 },
  { g:8, s:'Geography', t:'Asia',                 d:'Easy',   q:"The capital of China is:",                                                              opts:["Shanghai","Hong Kong","Beijing","Guangzhou"],                                               ans:2 },
  { g:8, s:'Geography', t:'Asia',                 d:'Easy',   q:"The capital of India is:",                                                              opts:["Mumbai","Kolkata","New Delhi","Chennai"],                                                   ans:2 },
  { g:8, s:'Geography', t:'North America Political', d:'Easy', q:"The capital of Mexico is:",                                                            opts:["Guadalajara","Cancún","Monterrey","Mexico City"],                                           ans:3 },
  { g:8, s:'Geography', t:'Environmental Issues', d:'Medium', q:"The Ring of Fire is a zone of volcanic and earthquake activity encircling the:",         opts:["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"],                             ans:3 },

  // ── MATH Grade 6 ──
  { g:6, s:'Math', t:'Fractions & Decimals',      d:'Easy',   q:"What is 3/4 expressed as a decimal?",                                                   opts:["0.34","0.43","0.75","0.80"],                                                                ans:2 },
  { g:6, s:'Math', t:'Fractions & Decimals',      d:'Easy',   q:"What is 2/5 as a percentage?",                                                          opts:["20%","25%","40%","45%"],                                                                   ans:2 },
  { g:6, s:'Math', t:'Fractions & Decimals',      d:'Medium', q:"Calculate: 2/3 + 1/4 = ?",                                                              opts:["3/7","11/12","7/12","3/4"],                                                                ans:1 },
  { g:6, s:'Math', t:'Fractions & Decimals',      d:'Hard',   q:"Calculate: 2/3 ÷ 4/9 = ?",                                                              opts:["8/27","6/12 = 1/2","3/2 = 1.5","2/3"],                                                    ans:2 },
  { g:6, s:'Math', t:'Statistics',                d:'Easy',   q:"The MEAN of the set {4, 7, 9, 10, 10} is:",                                             opts:["7","8","9","10"],                                                                          ans:1 },
  { g:6, s:'Math', t:'Statistics',                d:'Easy',   q:"The MEDIAN of the set {3, 5, 7, 9, 11} is:",                                            opts:["5","6","7","9"],                                                                           ans:2 },
  { g:6, s:'Math', t:'Statistics',                d:'Medium', q:"The MODE of the set {2, 3, 3, 4, 5, 5, 5, 6} is:",                                      opts:["3","4","5","6"],                                                                           ans:2 },
  { g:6, s:'Math', t:'Number Theory',             d:'Easy',   q:"Which of the following is a prime number?",                                             opts:["15","21","17","9"],                                                                         ans:2 },
  { g:6, s:'Math', t:'Number Theory',             d:'Easy',   q:"The GCF (Greatest Common Factor) of 12 and 18 is:",                                     opts:["3","4","6","9"],                                                                           ans:2 },
  { g:6, s:'Math', t:'Number Theory',             d:'Medium', q:"The LCM (Least Common Multiple) of 4 and 6 is:",                                        opts:["10","12","18","24"],                                                                        ans:1 },
  { g:6, s:'Math', t:'Percentages',               d:'Easy',   q:"What is 25% of 80?",                                                                    opts:["16","20","25","40"],                                                                        ans:1 },
  { g:6, s:'Math', t:'Percentages',               d:'Medium', q:"A shirt costing $50 is 20% off. The sale price is:",                                    opts:["$30","$35","$40","$45"],                                                                    ans:2 },
  { g:6, s:'Math', t:'Percentages',               d:'Hard',   q:"A price increases from $80 to $100. What is the percent increase?",                     opts:["20%","25%","30%","15%"],                                                                    ans:1 },
  { g:6, s:'Math', t:'Ratios & Rates',             d:'Medium', q:"A car travels 240 km in 3 hours. What is its speed (unit rate)?",                       opts:["60 km/h","70 km/h","80 km/h","90 km/h"],                                                   ans:2 },
  { g:6, s:'Math', t:'Area & Perimeter',           d:'Easy',   q:"The area of a rectangle 8 cm long and 5 cm wide is:",                                  opts:["13 cm²","26 cm²","40 cm²","80 cm²"],                                                       ans:2 },
  { g:6, s:'Math', t:'Area & Perimeter',           d:'Easy',   q:"The perimeter of a square with side length 6 cm is:",                                  opts:["12 cm","18 cm","24 cm","36 cm"],                                                           ans:2 },
  { g:6, s:'Math', t:'Area & Perimeter',           d:'Medium', q:"The area of a triangle with base 10 cm and height 6 cm is:",                           opts:["16 cm²","30 cm²","60 cm²","30 cm"],                                                        ans:1 },
  { g:6, s:'Math', t:'Area & Perimeter',           d:'Hard',   q:"The surface area of a cube with side length 4 cm is:",                                 opts:["16 cm²","64 cm²","96 cm²","24 cm²"],                                                       ans:2 },
  { g:6, s:'Math', t:'Algebra',                   d:'Easy',   q:"Solve for x: x + 7 = 15",                                                              opts:["x = 7","x = 8","x = 22","x = 6"],                                                          ans:1 },
  { g:6, s:'Math', t:'Algebra',                   d:'Medium', q:"Solve for x: 3x - 4 = 11",                                                             opts:["x = 3","x = 4","x = 5","x = 6"],                                                           ans:2 },
  { g:6, s:'Math', t:'Order of Operations',        d:'Easy',   q:"Using PEMDAS/BODMAS, what is 3 + 4 × 2?",                                             opts:["14","11","10","9"],                                                                         ans:1 },
  { g:6, s:'Math', t:'Coordinate Geometry',       d:'Easy',   q:"The point (3, -2) is located in which quadrant?",                                       opts:["Quadrant I","Quadrant II","Quadrant III","Quadrant IV"],                                    ans:3 },
  { g:6, s:'Math', t:'Circumference',             d:'Medium', q:"The circumference of a circle with radius 7 cm (π ≈ 3.14) is approximately:",           opts:["21.98 cm","43.96 cm","153.86 cm","87.92 cm"],                                              ans:1 },

  // ── MATH Grade 7 ──
  { g:7, s:'Math', t:'Integers',                  d:'Easy',   q:"Calculate: -5 + 8 = ?",                                                                opts:["-13","13","-3","3"],                                                                        ans:3 },
  { g:7, s:'Math', t:'Integers',                  d:'Easy',   q:"Calculate: (-3) × 4 = ?",                                                              opts:["12","-12","7","-7"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Integers',                  d:'Medium', q:"Calculate: -24 ÷ (-6) = ?",                                                             opts:["-4","4","-18","18"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Integers',                  d:'Hard',   q:"Evaluate: (-2)³ = ?",                                                                   opts:["-6","8","-8","6"],                                                                          ans:2 },
  { g:7, s:'Math', t:'Proportional Reasoning',    d:'Easy',   q:"Solve the proportion: 3/4 = x/12",                                                     opts:["x = 6","x = 8","x = 9","x = 16"],                                                          ans:2 },
  { g:7, s:'Math', t:'Proportional Reasoning',    d:'Medium', q:"A recipe calls for 2 cups of flour per 3 cups of sugar. How many cups of flour for 9 cups of sugar?", opts:["4","5","6","7"],                                                               ans:2 },
  { g:7, s:'Math', t:'Proportional Reasoning',    d:'Hard',   q:"A map scale is 1 cm : 50 km. Two cities 7.5 cm apart are actually:",                   opts:["300 km","350 km","375 km","400 km"],                                                        ans:2 },
  { g:7, s:'Math', t:'Algebra',                   d:'Easy',   q:"Solve for x: 3x + 5 = 20",                                                             opts:["x = 3","x = 4","x = 5","x = 6"],                                                           ans:2 },
  { g:7, s:'Math', t:'Algebra',                   d:'Medium', q:"Simplify: 4(x + 3) - 2x",                                                              opts:["2x + 3","2x + 12","6x + 3","4x + 12"],                                                     ans:1 },
  { g:7, s:'Math', t:'Algebra',                   d:'Hard',   q:"Solve: 2(3x - 4) = 4x + 6",                                                            opts:["x = 5","x = 6","x = 7","x = 8"],                                                           ans:2 },
  { g:7, s:'Math', t:'Geometry',                  d:'Easy',   q:"Two angles that add up to 90° are called:",                                             opts:["Supplementary angles","Complementary angles","Vertical angles","Alternate angles"],          ans:1 },
  { g:7, s:'Math', t:'Geometry',                  d:'Easy',   q:"The sum of all interior angles in any triangle is:",                                    opts:["90°","180°","270°","360°"],                                                                 ans:1 },
  { g:7, s:'Math', t:'Geometry',                  d:'Medium', q:"The area of a circle with radius 5 cm (π ≈ 3.14) is approximately:",                    opts:["15.7 cm²","31.4 cm²","78.5 cm²","25 cm²"],                                                ans:2 },
  { g:7, s:'Math', t:'Geometry',                  d:'Hard',   q:"An exterior angle of a triangle equals:",                                              opts:["The adjacent interior angle","The sum of the two non-adjacent interior angles","Half the sum of all interior angles","90°"], ans:1 },
  { g:7, s:'Math', t:'Probability',               d:'Easy',   q:"The probability of rolling a 4 on a standard 6-sided die is:",                         opts:["1/4","1/3","1/6","1/2"],                                                                   ans:2 },
  { g:7, s:'Math', t:'Probability',               d:'Medium', q:"A bag has 4 red and 6 blue marbles. The probability of drawing a red marble is:",       opts:["4/10 = 2/5","6/10 = 3/5","4/6 = 2/3","1/4"],                                             ans:0 },
  { g:7, s:'Math', t:'Probability',               d:'Hard',   q:"Two fair coins are flipped. The probability of getting exactly two heads is:",          opts:["1/2","1/3","1/4","3/4"],                                                                   ans:2 },
  { g:7, s:'Math', t:'Percent of Change',         d:'Easy',   q:"A price increases from $50 to $60. The percent increase is:",                           opts:["10%","15%","20%","25%"],                                                                   ans:2 },
  { g:7, s:'Math', t:'Percent of Change',         d:'Medium', q:"A TV's price was $400 and is now $300. The percent decrease is:",                       opts:["20%","25%","30%","33%"],                                                                   ans:1 },
  { g:7, s:'Math', t:'Financial Math',            d:'Medium', q:"Simple interest: I = PRT. P=$1,000, R=5%, T=3 years. Interest earned is:",              opts:["$50","$100","$150","$200"],                                                                ans:2 },
  { g:7, s:'Math', t:'Algebra',                   d:'Hard',   q:"Solve the inequality: 2x + 3 > 11. The solution is:",                                   opts:["x > 4","x < 4","x > 7","x < 7"],                                                          ans:0 },
  { g:7, s:'Math', t:'Number Sense',              d:'Easy',   q:"Which of the following is an irrational number?",                                       opts:["3/4","0.75","√2","-5"],                                                                    ans:2 },

  // ── MATH Grade 8 ──
  { g:8, s:'Math', t:'Pythagorean Theorem',       d:'Easy',   q:"A right triangle has legs of 3 cm and 4 cm. What is the length of the hypotenuse?",     opts:["5 cm","6 cm","7 cm","4.5 cm"],                                                             ans:0 },
  { g:8, s:'Math', t:'Pythagorean Theorem',       d:'Easy',   q:"Which set of numbers is a Pythagorean triple (a² + b² = c²)?",                         opts:["4, 6, 8","5, 12, 13","6, 8, 11","3, 5, 7"],                                               ans:1 },
  { g:8, s:'Math', t:'Pythagorean Theorem',       d:'Medium', q:"A right triangle has hypotenuse 13 and one leg 5. The other leg is:",                   opts:["8","10","12","11"],                                                                         ans:2 },
  { g:8, s:'Math', t:'Pythagorean Theorem',       d:'Hard',   q:"A diagonal of a rectangle 12 m wide and 5 m tall measures:",                            opts:["11 m","13 m","15 m","17 m"],                                                               ans:1 },
  { g:8, s:'Math', t:'Scientific Notation',       d:'Easy',   q:"Express 4,500 in scientific notation:",                                                 opts:["45 × 10²","4.5 × 10³","0.45 × 10⁴","4.5 × 10²"],                                         ans:1 },
  { g:8, s:'Math', t:'Scientific Notation',       d:'Medium', q:"Express 0.00034 in scientific notation:",                                              opts:["3.4 × 10⁻³","3.4 × 10⁻⁴","34 × 10⁻⁵","0.34 × 10⁻³"],                                     ans:1 },
  { g:8, s:'Math', t:'Scientific Notation',       d:'Hard',   q:"Calculate: (3 × 10⁴) × (2 × 10³) = ?",                                                opts:["5 × 10⁷","6 × 10⁷","6 × 10¹²","6 × 10⁶"],                                               ans:1 },
  { g:8, s:'Math', t:'Linear Equations',          d:'Easy',   q:"Solve: 4x + 2 = 18",                                                                   opts:["x = 3","x = 4","x = 5","x = 6"],                                                           ans:1 },
  { g:8, s:'Math', t:'Linear Equations',          d:'Medium', q:"The slope of a line passing through (0, 3) and (2, 7) is:",                             opts:["1","2","3","4"],                                                                            ans:1 },
  { g:8, s:'Math', t:'Linear Equations',          d:'Medium', q:"In the equation y = 3x - 5, the y-intercept is:",                                      opts:["3","-3","-5","5"],                                                                          ans:2 },
  { g:8, s:'Math', t:'Linear Equations',          d:'Hard',   q:"Solve the system y = 2x + 1 and y = -x + 7. The solution is:",                         opts:["(2, 5)","(3, 4)","(1, 3)","(1, 6)"],                                                       ans:0 },
  { g:8, s:'Math', t:'Exponents',                 d:'Easy',   q:"Calculate: 2⁵ = ?",                                                                    opts:["10","16","32","64"],                                                                        ans:2 },
  { g:8, s:'Math', t:'Exponents',                 d:'Easy',   q:"The square root of 144 is:",                                                           opts:["11","12","13","14"],                                                                        ans:1 },
  { g:8, s:'Math', t:'Exponents',                 d:'Medium', q:"Simplify: x³ × x⁴ = ?",                                                                opts:["x⁷","x¹²","2x⁷","x⁶"],                                                                    ans:0 },
  { g:8, s:'Math', t:'Exponents',                 d:'Hard',   q:"Evaluate: 2⁻³ = ?",                                                                    opts:["-8","-6","1/8","1/6"],                                                                      ans:2 },
  { g:8, s:'Math', t:'Volume & Surface Area',     d:'Easy',   q:"The volume of a cylinder with radius 3 and height 5 (π ≈ 3.14) is approximately:",      opts:["47.1","94.2","141.3","188.4"],                                                              ans:2 },
  { g:8, s:'Math', t:'Volume & Surface Area',     d:'Medium', q:"The surface area of a rectangular prism with length 4, width 3, height 2 is:",          opts:["24","36","52","72"],                                                                        ans:2 },
  { g:8, s:'Math', t:'Transformations',           d:'Easy',   q:"A reflection of point (3, -2) over the x-axis produces the point:",                     opts:["(-3, 2)","(3, 2)","(-3, -2)","(2, 3)"],                                                   ans:1 },
  { g:8, s:'Math', t:'Transformations',           d:'Medium', q:"Translating (1, 3) by 4 units right and 2 units up gives:",                             opts:["(5, 5)","(5, 1)","(-3, 1)","(3, 5)"],                                                     ans:0 },
  { g:8, s:'Math', t:'Functions',                 d:'Medium', q:"For the function f(x) = 2x + 3, what is f(4)?",                                         opts:["9","10","11","12"],                                                                         ans:2 },
  { g:8, s:'Math', t:'Linear Equations',          d:'Easy',   q:"The slope of a horizontal line is:",                                                    opts:["Undefined","1","-1","0"],                                                                   ans:3 },
  { g:8, s:'Math', t:'Factoring',                 d:'Hard',   q:"Factor: x² - 16 using the difference of squares:",                                      opts:["(x - 4)(x - 4)","(x + 4)(x - 4)","(x + 8)(x - 2)","(x - 16)(x + 1)"],                    ans:1 },
  { g:8, s:'Math', t:'Number Sense',              d:'Medium', q:"The cube root of 125 is:",                                                              opts:["3","4","5","6"],                                                                           ans:2 },

  // ── ADDITIONAL GRADE 5 SCIENCE ──
  { g:5, s:'Science', t:'Plants',                 d:'Easy',   q:"The main purpose of roots in a plant is to:",                                                opts:["Make seeds","Absorb water and nutrients","Produce flowers","Store sunlight"],                ans:1 },
  { g:5, s:'Science', t:'Plants',                 d:'Medium', q:"Photosynthesis uses which two inputs to make glucose?",                                       opts:["Water and oxygen","Water and carbon dioxide","Nitrogen and oxygen","Sunlight and nitrogen"],   ans:1 },
  { g:5, s:'Science', t:'Animals',                d:'Easy',   q:"Which of these animals is a mammal?",                                                        opts:["Snake","Penguin","Dolphin","Frog"],                                                         ans:2 },
  { g:5, s:'Science', t:'Animals',                d:'Medium', q:"A bat is the only mammal that can truly:",                                                     opts:["Swim","Climb","Fly","Jump high"],                                                           ans:2 },
  { g:5, s:'Science', t:'Human Body',             d:'Easy',   q:"Which organ pumps blood throughout the body?",                                               opts:["Lungs","Brain","Heart","Stomach"],                                                          ans:2 },
  { g:5, s:'Science', t:'Human Body',             d:'Medium', q:"The process of breathing in and out is controlled by the:",                                  opts:["Brain","Heart","Diaphragm","Ribs only"],                                                   ans:2 },
  { g:5, s:'Science', t:'Rocks & Minerals',       d:'Easy',   q:"Rocks made from cooling magma are called:",                                                   opts:["Sedimentary","Metamorphic","Igneous","Mineral rocks"],                                      ans:2 },
  { g:5, s:'Science', t:'Rocks & Minerals',       d:'Medium', q:"Which type of rock is formed from compressed layers of sediment?",                            opts:["Igneous","Metamorphic","Sedimentary","Crystalline"],                                        ans:2 },

  // ── ADDITIONAL GRADE 6 SCIENCE ──
  { g:6, s:'Science', t:'Genetics',               d:'Easy',   q:"Traits passed from parents to offspring are called:",                                         opts:["Mutations","Genetics","Heredity","Adaptations"],                                            ans:2 },
  { g:6, s:'Science', t:'Genetics',               d:'Medium', q:"The molecule that carries genetic information is:",                                           opts:["Protein","Lipid","DNA","Glucose"],                                                          ans:2 },
  { g:6, s:'Science', t:'Photosynthesis',         d:'Medium', q:"The part of the plant where photosynthesis primarily occurs is the:",                         opts:["Root","Stem","Leaf","Flower"],                                                             ans:2 },
  { g:6, s:'Science', t:'Respiration',            d:'Medium', q:"Cellular respiration produces energy in the form of:",                                         opts:["Heat","Light","ATP","Glucose"],                                                            ans:2 },
  { g:6, s:'Science', t:'Minerals & Nutrition',   d:'Easy',   q:"Which mineral helps build strong bones and teeth?",                                           opts:["Iron","Calcium","Sodium","Potassium"],                                                       ans:1 },
  { g:6, s:'Science', t:'Reproduction',           d:'Medium', q:"Which type of reproduction produces genetically identical offspring?",                        opts:["Sexual reproduction","Asexual reproduction","Binary fission","Fragmentation"],               ans:1 },

  // ── ADDITIONAL GRADE 7 SCIENCE ──
  { g:7, s:'Science', t:'Atoms & Elements',       d:'Easy',   q:"The smallest particle of an element that retains its properties is a(n):",                   opts:["Molecule","Neutron","Atom","Electron"],                                                     ans:2 },
  { g:7, s:'Science', t:'Atoms & Elements',       d:'Medium', q:"An element with atomic number 6 is:",                                                        opts:["Oxygen","Carbon","Nitrogen","Helium"],                                                       ans:1 },
  { g:7, s:'Science', t:'Chemical Reactions',     d:'Medium', q:"In the equation 2H₂ + O₂ → 2H₂O, what is the coefficient of hydrogen?",                       opts:["1","2","3","4"],                                                                            ans:1 },
  { g:7, s:'Science', t:'Acids & Bases',          d:'Easy',   q:"A substance with a pH less than 7 is:",                                                      opts:["Neutral","Basic","Acidic","Alkaline"],                                                       ans:2 },
  { g:7, s:'Science', t:'Acids & Bases',          d:'Medium', q:"Which of these is an example of a strong base?",                                             opts:["Vinegar","Lemon juice","Sodium hydroxide (NaOH)","Orange juice"],                             ans:2 },
  { g:7, s:'Science', t:'Motion & Forces',        d:'Medium', q:"Newton's Second Law states that F = m × a. What is 'a'?",                                    opts:["Area","Acceleration","Angle","Average speed"],                                              ans:1 },

  // ── ADDITIONAL GRADE 8 SCIENCE ──
  { g:8, s:'Science', t:'Waves',                  d:'Medium', q:"The distance between consecutive waves is called the:",                                     opts:["Frequency","Amplitude","Wavelength","Period"],                                              ans:2 },
  { g:8, s:'Science', t:'Light & Sound',          d:'Easy',   q:"Sound travels fastest through:",                                                              opts:["Air","Water","Vacuum","Solid"],                                                             ans:3 },
  { g:8, s:'Science', t:'Magnetism',              d:'Easy',   q:"Opposite magnetic poles:",                                                                   opts:["Repel each other","Attract each other","Stay neutral","Cancel each other"],                  ans:1 },
  { g:8, s:'Science', t:'Periodic Table',         d:'Medium', q:"Elements in the same column of the periodic table are called:",                              opts:["Periods","Groups","Families","Both B and C"],                                               ans:3 },

  // ── GRADE 5 HISTORY ──
  { g:5, s:'History', t:'Ancient Egypt',          d:'Easy',   q:"The Great Pyramid of Giza was built as a tomb for which pharaoh?",                          opts:["Tutankhamun","Khufu","Ramesses II","Hatshepsut"],                                            ans:1 },
  { g:5, s:'History', t:'Ancient Egypt',          d:'Medium', q:"The Nile River's annual flooding was important to ancient Egypt because it:",                 opts:["Provided fish for trade","Deposited fertile soil for crops","Powered irrigation systems","All of the above"], ans:3 },
  { g:5, s:'History', t:'Ancient Rome',           d:'Easy',   q:"The leader of ancient Rome was called the:",                                                 opts:["King","Emperor","Consul","Pharaoh"],                                                        ans:1 },
  { g:5, s:'History', t:'Ancient Rome',           d:'Medium', q:"The Roman Republic's government was based on three branches. One of them was:",              opts:["The Monarchy","The Senate","The Dynasty","The Aristocracy"],                               ans:1 },
  { g:5, s:'History', t:'Medieval Times',         d:'Easy',   q:"A medieval king's advisors and noblemen were called his:",                                  opts:["Servants","Army","Court","Peasants"],                                                       ans:2 },
  { g:5, s:'History', t:'Medieval Times',         d:'Medium', q:"During the Middle Ages, the feudal system created a hierarchy. Who were at the bottom?",     opts:["Knights","Nobles","Peasants and serfs","Clergy"],                                           ans:2 },

  // ── GRADE 6 HISTORY ──
  { g:6, s:'History', t:'Colonial America',       d:'Easy',   q:"Which European country colonized the most of North America initially?",                     opts:["Spain","France","Great Britain","Netherlands"],                                            ans:2 },
  { g:6, s:'History', t:'Colonial America',       d:'Medium', q:"The main crop that dominated the Southern colonies' economy was:",                           opts:["Tobacco","Sugar cane","Indigo","Cotton"],                                                   ans:0 },
  { g:6, s:'History', t:'Age of Exploration',     d:'Easy',   q:"Christopher Columbus sailed under the flag of which nation in 1492?",                       opts:["Portugal","Italy","Spain","France"],                                                        ans:2 },
  { g:6, s:'History', t:'Age of Exploration',     d:'Medium', q:"The main reason for the Age of Exploration was to find routes to:",                         opts:["America","Africa","India and Asia for spices and trade","Australia"],                       ans:2 },
  { g:6, s:'History', t:'Islamic Civilization',   d:'Medium', q:"The Islamic Golden Age saw advances in mathematics, astronomy, and:",                        opts:["Warfare","Medicine and philosophy","Architecture only","Art only"],                         ans:1 },

  // ── GRADE 7 HISTORY ──
  { g:7, s:'History', t:'Industrial Revolution',  d:'Easy',   q:"The Industrial Revolution began in which country around the late 1700s?",                  opts:["France","United States","Germany","Great Britain"],                                        ans:3 },
  { g:7, s:'History', t:'Industrial Revolution',  d:'Medium', q:"Which invention transformed textile manufacturing during the Industrial Revolution?",       opts:["The steam engine","The telegraph","The printing press","The steam loom"],                  ans:3 },
  { g:7, s:'History', t:'French Revolution',      d:'Medium', q:"Which year marked the start of the French Revolution?",                                     opts:["1776","1789","1799","1801"],                                                                ans:1 },
  { g:7, s:'History', t:'Enlightenment',          d:'Medium', q:"John Locke's ideas about natural rights influenced which important document?",              opts:["The Constitution","The Declaration of Independence","The Bill of Rights","All of the above"],  ans:3 },

  // ── GRADE 8 HISTORY ──
  { g:8, s:'History', t:'American Civil War',     d:'Easy',   q:"Which president issued the Emancipation Proclamation?",                                    opts:["George Washington","Thomas Jefferson","Abraham Lincoln","Andrew Johnson"],                  ans:2 },
  { g:8, s:'History', t:'American Civil War',     d:'Medium', q:"The Civil War began in 1861 when which state seceded from the Union?",                      opts:["Virginia","South Carolina","Georgia","North Carolina"],                                      ans:1 },
  { g:8, s:'History', t:'World War II',           d:'Medium', q:"Which nation was NOT part of the Axis powers in World War II?",                              opts:["Japan","Germany","Italy","United Kingdom"],                                                 ans:3 },
  { g:8, s:'History', t:'Ancient Greece',         d:'Medium', q:"The ancient Greeks invented democracy in which city-state?",                               opts:["Sparta","Troy","Athens","Corinth"],                                                        ans:2 },

  // ── GRADE 5 GEOGRAPHY ──
  { g:5, s:'Geography', t:'Continents',           d:'Easy',   q:"Which continent is also a country?",                                                        opts:["Europe","Australia","Africa","Antarctica"],                                                 ans:1 },
  { g:5, s:'Geography', t:'Continents',           d:'Easy',   q:"The largest continent by area is:",                                                         opts:["Africa","North America","Europe","Asia"],                                                   ans:3 },
  { g:5, s:'Geography', t:'Oceans',               d:'Easy',   q:"The deepest ocean on Earth is the:",                                                        opts:["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"],                              ans:3 },
  { g:5, s:'Geography', t:'Mountains',            d:'Medium', q:"The longest mountain range in the world is the:",                                            opts:["Himalayas","Rocky Mountains","Mid-Ocean Ridge","Appalachian Mountains"],                    ans:2 },
  { g:5, s:'Geography', t:'Rivers',               d:'Easy',   q:"The longest river in Africa is the:",                                                       opts:["Congo River","Niger River","Nile River","Zambezi River"],                                    ans:2 },
  { g:5, s:'Geography', t:'Deserts',              d:'Medium', q:"Which desert is the hottest on Earth?",                                                     opts:["Kalahari","Gobi","Arabian","Death Valley"],                                                 ans:2 },

  // ── GRADE 6 GEOGRAPHY ──
  { g:6, s:'Geography', t:'Climate Zones',        d:'Easy',   q:"A tropical climate is characterized by:",                                                    opts:["Hot and dry","Cold and snowy","Hot and humid","Mild year-round"],                           ans:2 },
  { g:6, s:'Geography', t:'Climate Zones',        d:'Medium', q:"Which climate zone has four distinct seasons with moderate temperatures?",                 opts:["Tropical","Temperate","Polar","Desert"],                                                    ans:1 },
  { g:6, s:'Geography', t:'Map Skills',           d:'Easy',   q:"Latitude measures distance from the:",                                                       opts:["Equator","Prime Meridian","Tropic of Cancer","Tropic of Capricorn"],                       ans:0 },
  { g:6, s:'Geography', t:'Capitals',             d:'Easy',   q:"What is the capital of France?",                                                            opts:["Lyon","Paris","Marseille","Nice"],                                                         ans:1 },
  { g:6, s:'Geography', t:'Natural Resources',    d:'Medium', q:"Oil is primarily used for producing:",                                                      opts:["Electricity","Fuel and plastics","Building materials","Fertilizer"],                        ans:1 },

  // ── GRADE 7 GEOGRAPHY ──
  { g:7, s:'Geography', t:'Population',           d:'Easy',   q:"Which country has the largest population in the world?",                                    opts:["India","United States","Indonesia","Brazil"],                                              ans:0 },
  { g:7, s:'Geography', t:'Urbanization',         d:'Medium', q:"The process where people move from rural areas to cities is called:",                        opts:["Migration","Urbanization","Colonization","Industrialization"],                               ans:1 },
  { g:7, s:'Geography', t:'Economies',            d:'Medium', q:"A developed nation typically has a strong:",                                                 opts:["Agricultural sector","Manufacturing and service sector","Mining industry","Tourism industry"], ans:1 },
  { g:7, s:'Geography', t:'Borders',              d:'Easy',   q:"How many countries share a border with the United States?",                                 opts:["1","2","3","4"],                                                                            ans:1 },

  // ── GRADE 8 GEOGRAPHY ──
  { g:8, s:'Geography', t:'Plate Tectonics',      d:'Medium', q:"Earthquakes commonly occur at the boundaries of Earth's:",                                  opts:["Atmosphere","Crust layers","Tectonic plates","Continental shelves"],                        ans:2 },
  { g:8, s:'Geography', t:'Volcanoes',            d:'Medium', q:"A volcano that is not expected to erupt again is classified as:",                           opts:["Active","Dormant","Extinct","Potential"],                                                   ans:2 },
  { g:8, s:'Geography', t:'Erosion',              d:'Easy',   q:"Water erosion is primarily caused by:",                                                      opts:["Wind","Gravity and flowing water","Ice","Human activity"],                                  ans:1 },
  { g:8, s:'Geography', t:'Biomes',               d:'Medium', q:"The taiga biome is characterized by:",                                                      opts:["Dense rainforest","Coniferous forests and cold winters","Grasslands","Desert vegetation"],    ans:1 },

  // ── ADDITIONAL GRADE 5 MATH ──
  { g:5, s:'Math', t:'Decimals',                  d:'Easy',   q:"0.5 is equal to the fraction:",                                                             opts:["1/5","1/4","1/3","1/2"],                                                                    ans:3 },
  { g:5, s:'Math', t:'Decimals',                  d:'Medium', q:"What is 2.5 + 3.75?",                                                                      opts:["5.25","6.15","6.25","5.75"],                                                                ans:2 },
  { g:5, s:'Math', t:'Percentages',               d:'Easy',   q:"25% of 100 equals:",                                                                        opts:["10","25","50","75"],                                                                        ans:1 },
  { g:5, s:'Math', t:'Percentages',               d:'Medium', q:"What is 20% of 60?",                                                                       opts:["6","12","20","30"],                                                                        ans:1 },
  { g:5, s:'Math', t:'Order of Operations',       d:'Medium', q:"What is the value of 2 + 3 × 4?",                                                          opts:["20","14","11","18"],                                                                        ans:1 },
  { g:5, s:'Math', t:'Geometry',                  d:'Easy',   q:"A rectangle has length 8 and width 5. Its perimeter is:",                                  opts:["13","26","40","80"],                                                                        ans:1 },

  // ── ADDITIONAL GRADE 6 MATH ──
  { g:6, s:'Math', t:'Ratios & Proportions',      d:'Easy',   q:"The ratio 3:6 is equivalent to:",                                                          opts:["1:2","1:3","2:3","3:3"],                                                                    ans:0 },
  { g:6, s:'Math', t:'Ratios & Proportions',      d:'Medium', q:"If 4 apples cost $3, how much do 12 apples cost?",                                         opts:["$6","$8","$9","$12"],                                                                       ans:2 },
  { g:6, s:'Math', t:'Probability',               d:'Easy',   q:"When flipping a fair coin, the probability of getting heads is:",                          opts:["0","1/4","1/2","1"],                                                                        ans:2 },
  { g:6, s:'Math', t:'Statistics',                d:'Easy',   q:"The average (mean) of 2, 4, and 6 is:",                                                     opts:["4","5","6","7"],                                                                           ans:0 },
  { g:6, s:'Math', t:'Area',                      d:'Medium', q:"The area of a triangle with base 8 and height 5 is:",                                      opts:["13","20","40","80"],                                                                        ans:1 },

  // ── ADDITIONAL GRADE 7 MATH ──
  { g:7, s:'Math', t:'Integers',                  d:'Easy',   q:"The sum of -5 and 3 is:",                                                                   opts:["-8","-2","2","8"],                                                                         ans:1 },
  { g:7, s:'Math', t:'Integers',                  d:'Medium', q:"What is -12 ÷ (-3)?",                                                                      opts:["-4","4","-36","36"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Polynomials',               d:'Medium', q:"Simplify: 3x + 2x = ?",                                                                   opts:["x","5x","6x","5"],                                                                         ans:1 },
  { g:7, s:'Math', t:'Systems of Equations',      d:'Medium', q:"If x + y = 10 and x - y = 2, what is x?",                                                  opts:["4","6","8","12"],                                                                          ans:1 },
  { g:7, s:'Math', t:'Radicals',                  d:'Easy',   q:"The square root of 36 is:",                                                                 opts:["4","5","6","7"],                                                                           ans:2 },

  // ── ADDITIONAL GRADE 8 MATH ──
  { g:8, s:'Math', t:'Pythagorean Theorem',       d:'Medium', q:"A right triangle has legs of 3 and 4. Its hypotenuse is:",                                opts:["5","6","7","8"],                                                                          ans:0 },
  { g:8, s:'Math', t:'Quadratic Equations',       d:'Medium', q:"The equation x² = 16 has solutions:",                                                      opts:["4","-4","±4","No solution"],                                                                ans:2 },
  { g:8, s:'Math', t:'Slope',                     d:'Medium', q:"The slope of the line passing through (0, 0) and (2, 4) is:",                              opts:["1","2","4","8"],                                                                           ans:1 },

  // ── ADDITIONAL GRADE 5 HISTORY & GEOGRAPHY ──
  { g:5, s:'History', t:'Native Americans',       d:'Easy',   q:"Native Americans were the first inhabitants of:",                                             opts:["Europe","Africa","North America","Australia"],                                              ans:2 },
  { g:5, s:'History', t:'Civilizations',          d:'Medium', q:"The Inca civilization was located in which modern-day continent?",                            opts:["North America","South America","Africa","Asia"],                                            ans:1 },
  { g:5, s:'Geography', t:'Landforms',            d:'Easy',   q:"A large area of elevated land is called a:",                                                  opts:["Valley","Canyon","Plateau","Basin"],                                                        ans:2 },
  { g:5, s:'Geography', t:'Weather',              d:'Medium', q:"A sudden violent windstorm with rotating columns of air is a:",                               opts:["Tsunami","Tornado","Cyclone","Blizzard"],                                                    ans:1 },

  // ── ADDITIONAL GRADE 6 HISTORY & GEOGRAPHY ──
  { g:6, s:'History', t:'Renaissance',            d:'Medium', q:"The Renaissance period saw a revival of interest in:",                                       opts:["Medieval warfare","Ancient Greek and Roman culture","Medieval knights","Feudalism"],         ans:1 },
  { g:6, s:'History', t:'Vikings',                d:'Easy',   q:"The Vikings originated from which region?",                                                  opts:["Eastern Europe","Northern Europe (Scandinavia)","Southern Europe","Western Asia"],           ans:1 },
  { g:6, s:'Geography', t:'Development',          d:'Medium', q:"Which factor is most important for a nation's economic development?",                        opts:["Geographic location only","Natural resources and education","Climate only","Population size"], ans:1 },
  { g:6, s:'Geography', t:'Trade',                d:'Easy',   q:"The Silk Road was an ancient trade route connecting:",                                       opts:["Europe and Africa","Asia and Europe","America and Asia","Africa and Australia"],             ans:1 },

  // ── ADDITIONAL GRADE 7 HISTORY & GEOGRAPHY ──
  { g:7, s:'History', t:'Renaissance & Reformation', d:'Medium', q:"Martin Luther's 95 Theses sparked the:",                                                  opts:["Scientific Revolution","Reformation","Counter-Reformation","Enlightenment"],                ans:1 },
  { g:7, s:'History', t:'Absolutism',             d:'Medium', q:"Which European monarch is famous for the saying 'L'État, c'est moi' (I am the state)?",      opts:["Frederick the Great","Peter the Great","Louis XIV","Catherine the Great"],                   ans:2 },
  { g:7, s:'Geography', t:'Development Levels',   d:'Easy',   q:"Countries with low GDP per capita and limited infrastructure are called:",                    opts:["Developed nations","Developing nations","Emerging economies","Superpowers"],               ans:1 },
  { g:7, s:'Geography', t:'Imports & Exports',    d:'Medium', q:"A country that sends goods to another country is:",                                          opts:["Importing","Exporting","Distributing","Selling"],                                           ans:1 },

  // ── ADDITIONAL GRADE 8 HISTORY & GEOGRAPHY ──
  { g:8, s:'History', t:'American Revolution',    d:'Medium', q:"Which document declared America's independence from British rule?",                         opts:["Constitution","Declaration of Independence","Bill of Rights","Mayflower Compact"],           ans:1 },
  { g:8, s:'History', t:'Imperialism',            d:'Medium', q:"European imperialism in the 19th century led to:",                                          opts:["Independence of colonies","Control of African and Asian territories","Decline of trade","Peace in Europe"], ans:1 },
  { g:8, s:'Geography', t:'Globalization',        d:'Medium', q:"Globalization has primarily increased:",                                                     opts:["Isolation of countries","International trade and communication","National borders","Local economies"], ans:1 },
  { g:8, s:'Geography', t:'Sustainability',       d:'Easy',   q:"Using renewable resources to meet present needs without harming the future is called:",     opts:["Extraction","Sustainability","Consumption","Exploitation"],                                 ans:1 },

  // ── ADDITIONAL GRADE 5-8 SCIENCE (GENERAL) ──
  { g:5, s:'Science', t:'Scientific Method',      d:'Easy',   q:"The first step of the scientific method is to:",                                             opts:["Analyze data","Ask a question","Draw conclusions","Conduct an experiment"],                ans:1 },
  { g:6, s:'Science', t:'Biotic & Abiotic',       d:'Easy',   q:"A biotic factor in an ecosystem is:",                                                        opts:["Temperature","Soil","Living organisms","Sunlight"],                                          ans:2 },
  { g:7, s:'Science', t:'Homeostasis',            d:'Medium', q:"An organism maintaining a stable internal environment is called:",                           opts:["Evolution","Adaptation","Homeostasis","Metabolism"],                                        ans:2 },
  { g:8, s:'Science', t:'Biodiversity',           d:'Medium', q:"An ecosystem with high biodiversity is generally more:",                                     opts:["Fragile","Stable and resilient","Crowded","Simple"],                                        ans:1 },

  // ── ADDITIONAL GRADE 5-8 MATH (GENERAL) ──
  { g:5, s:'Math', t:'Fractions',                 d:'Easy',   q:"1/4 + 1/4 equals:",                                                                         opts:["1/8","1/2","1/16","3/4"],                                                                   ans:1 },
  { g:6, s:'Math', t:'Division',                  d:'Medium', q:"A class of 132 students is divided equally into 6 groups. How many students per group?",    opts:["20","22","24","26"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Equations',                 d:'Easy',   q:"If 2x = 10, then x equals:",                                                                opts:["2","5","10","20"],                                                                        ans:1 },
  { g:8, s:'Math', t:'Graphs',                    d:'Medium', q:"A point on a coordinate plane is located at (3, -2). It is in which quadrant?",             opts:["I","II","III","IV"],                                                                        ans:3 },

  // ── SPECIAL TOPICS GRADE 5-8 ──
  { g:5, s:'Science', t:'Seasons',                d:'Easy',   q:"The Earth's tilt is responsible for:",                                                      opts:["Day and night","Tides","Seasons","Lunar phases"],                                           ans:2 },
  { g:6, s:'Science', t:'Biodiversity',           d:'Easy',   q:"Species that live in the same area and share resources are in the same:",                    opts:["Habitat","Community","Population","Ecosystem"],                                             ans:1 },
  { g:8, s:'Science', t:'Ecology',                d:'Medium', q:"The maximum population size an environment can support is called the:",                      opts:["Biotic potential","Carrying capacity","Population density","Growth rate"],                  ans:1 },

  { g:5, s:'History', t:'Timelines',              d:'Easy',   q:"Which event happened most recently?",                                                       opts:["Ancient Rome","Middle Ages","Industrial Revolution","Ancient Egypt"],                       ans:2 },
  { g:6, s:'History', t:'Government',             d:'Easy',   q:"A form of government where power rests with the people is called:",                          opts:["Monarchy","Dictatorship","Democracy","Oligarchy"],                                          ans:2 },
  { g:7, s:'History', t:'Revolution',             d:'Medium', q:"A sudden, violent, and radical change in a society is a:",                                  opts:["Evolution","Revolution","Rebellion","Reformation"],                                         ans:1 },
  { g:8, s:'History', t:'Modern Era',             d:'Easy',   q:"The 20th and 21st centuries are referred to as the:",                                      opts:["Medieval period","Industrial age","Modern era","Ancient times"],                             ans:2 },

  { g:5, s:'Geography', t:'Compass',              d:'Easy',   q:"Which direction is opposite to north on a compass?",                                        opts:["East","West","South","Up"],                                                                ans:2 },
  { g:6, s:'Geography', t:'Coordinates',          d:'Easy',   q:"Longitude divides the Earth into how many hemispheres?",                                     opts:["2","4","6","8"],                                                                           ans:0 },
  { g:7, s:'Geography', t:'Resources',            d:'Easy',   q:"Renewable resources can be replenished by nature within a:",                                 opts:["Year","Decade","Century","Few years"],                                                      ans:3 },
  { g:8, s:'Geography', t:'Time Zones',           d:'Easy',   q:"How many time zones are there around the world?",                                           opts:["12","24","30","36"],                                                                        ans:1 },

  { g:5, s:'Math', t:'Multiplication',            d:'Medium', q:"A store sells books in packs of 12. How many books are in 7 packs?",                        opts:["72","76","84","91"],                                                                        ans:2 },
  { g:6, s:'Math', t:'Negative Numbers',          d:'Easy',   q:"-5 + 5 equals:",                                                                            opts:["-10","0","5","10"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Exponents',                 d:'Easy',   q:"2³ equals:",                                                                                 opts:["6","8","16","32"],                                                                         ans:1 },
  { g:8, s:'Math', t:'Inequality',                d:'Easy',   q:"Which inequality is true: 5 > 3 or 3 > 5?",                                                opts:["5 > 3","3 > 5","They are equal","Neither"],                                                ans:0 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── SCIENCE Grades 5–8 EXPANDED (additional 92 questions) ────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // Grade 5 Science
  { g:5, s:'Science', t:'Space',                  d:'Easy',   q:"The planet closest to the Sun is:",                                                          opts:["Venus","Mercury","Earth","Mars"],                                                           ans:1 },
  { g:5, s:'Science', t:'Space',                  d:'Medium', q:"A year on Earth is approximately how many days?",                                              opts:["365","360","370","355"],                                                                    ans:0 },
  { g:5, s:'Science', t:'Solar System',           d:'Easy',   q:"How many planets are in our solar system?",                                                   opts:["7","8","9","10"],                                                                           ans:1 },
  { g:5, s:'Science', t:'Water Cycle',            d:'Easy',   q:"The process by which water turns into vapor is called:",                                      opts:["Condensation","Precipitation","Evaporation","Freezing"],                                    ans:2 },
  { g:5, s:'Science', t:'Water Cycle',            d:'Medium', q:"Which process releases water back to the atmosphere from plants?",                            opts:["Evaporation","Condensation","Transpiration","Precipitation"],                              ans:2 },
  { g:5, s:'Science', t:'Rocks & Minerals',       d:'Easy',   q:"A naturally occurring solid with a definite crystalline structure is a:",                     opts:["Fossil","Mineral","Rock","Gem"],                                                            ans:1 },
  { g:5, s:'Science', t:'Rocks & Minerals',       d:'Medium', q:"Which type of rock forms from cooled lava?",                                                  opts:["Sedimentary","Metamorphic","Igneous","Crystalline"],                                        ans:2 },
  { g:5, s:'Science', t:'Volcanoes',              d:'Easy',   q:"A volcano with no current activity is called:",                                               opts:["Active","Dormant","Extinct","Explosive"],                                                   ans:1 },
  { g:5, s:'Science', t:'Volcanoes',              d:'Medium', q:"What is the molten rock that erupts from a volcano called?",                                 opts:["Magma","Lava","Ash","Pumice"],                                                             ans:1 },
  { g:5, s:'Science', t:'Human Body',             d:'Easy',   q:"How many bones are in the human adult body?",                                                 opts:["186","206","226","246"],                                                                    ans:1 },
  { g:5, s:'Science', t:'Human Body',             d:'Medium', q:"Which organ pumps blood throughout the body?",                                                opts:["Brain","Lungs","Heart","Liver"],                                                            ans:2 },
  { g:5, s:'Science', t:'Plants',                 d:'Easy',   q:"Plants use the energy from _____ to make their own food.",                                    opts:["Heat","Sunlight","Wind","Water"],                                                          ans:1 },
  { g:5, s:'Science', t:'Plants',                 d:'Medium', q:"The process by which plants make food using sunlight is called:",                             opts:["Respiration","Photosynthesis","Transpiration","Fermentation"],                              ans:1 },
  { g:5, s:'Science', t:'Animals',                d:'Easy',   q:"Which of these is a vertebrate?",                                                             opts:["Spider","Fish","Insect","Worm"],                                                            ans:1 },
  { g:5, s:'Science', t:'Animals',                 d:'Medium', q:"Animals that eat only plants are called:",                                                   opts:["Carnivores","Omnivores","Herbivores","Scavengers"],                                        ans:2 },
  { g:5, s:'Science', t:'Forces & Motion',        d:'Easy',   q:"A push or a pull that causes motion is called a:",                                            opts:["Momentum","Energy","Force","Power"],                                                        ans:2 },
  { g:5, s:'Science', t:'Forces & Motion',        d:'Medium', q:"Newton's first law states that objects at rest stay at rest unless acted upon by a:",        opts:["Movement","Friction","Force","Energy"],                                                     ans:2 },
  { g:5, s:'Science', t:'Heat',                   d:'Easy',   q:"The measure of how hot or cold something is called:",                                        opts:["Weather","Temperature","Thermal energy","Friction"],                                      ans:1 },
  { g:5, s:'Science', t:'Heat',                   d:'Medium', q:"Heat moves from objects that are _____ to objects that are colder.",                          opts:["Smaller","Larger","Warmer","Denser"],                                                       ans:2 },
  // Grade 6 Science
  { g:6, s:'Science', t:'Atoms & Elements',       d:'Easy',   q:"The smallest unit of matter that retains properties of an element is an:",                     opts:["Molecule","Atom","Particle","Compound"],                                                   ans:1 },
  { g:6, s:'Science', t:'Atoms & Elements',       d:'Medium', q:"Atoms of the same element always have the same number of:",                                    opts:["Electrons","Neutrons","Protons","Isotopes"],                                               ans:2 },
  { g:6, s:'Science', t:'Properties of Matter',   d:'Easy',   q:"Density is defined as mass divided by:",                                                     opts:["Weight","Volume","Area","Distance"],                                                       ans:1 },
  { g:6, s:'Science', t:'Properties of Matter',   d:'Medium', q:"Which property determines whether a substance sinks or floats in water?",                     opts:["Color","Texture","Density","Temperature"],                                                 ans:2 },
  { g:6, s:'Science', t:'Mixtures',               d:'Easy',   q:"A mixture where particles are not evenly distributed is:",                                    opts:["Homogeneous","Heterogeneous","Compound","Solution"],                                      ans:1 },
  { g:6, s:'Science', t:'Mixtures',               d:'Medium', q:"Salt dissolved in water forms a:",                                                           opts:["Heterogeneous mixture","Homogeneous mixture","Suspension","Emulsion"],                     ans:1 },
  { g:6, s:'Science', t:'Acids & Bases',          d:'Easy',   q:"A substance with a pH less than 7 is an:",                                                   opts:["Base","Neutral","Acid","Salt"],                                                            ans:2 },
  { g:6, s:'Science', t:'Acids & Bases',          d:'Medium', q:"Which of these is an example of a base?",                                                    opts:["Lemon juice","Vinegar","Baking soda","Orange juice"],                                      ans:2 },
  { g:6, s:'Science', t:'Cells',                  d:'Easy',   q:"What is the basic unit of life?",                                                            opts:["Atom","Molecule","Cell","Organism"],                                                        ans:2 },
  { g:6, s:'Science', t:'Cells',                  d:'Medium', q:"Plant cells contain structures that animal cells do not. One example is:",                     opts:["Nucleus","Ribosome","Cell wall","Mitochondria"],                                            ans:2 },
  { g:6, s:'Science', t:'Cells',                  d:'Hard',   q:"A cell membrane controls what enters and leaves a cell. It is selectively:",                   opts:["Rigid","Permeable","Semi-permeable","Impermeable"],                                        ans:2 },
  { g:6, s:'Science', t:'Bacteria & Microorganisms', d:'Easy', q:"Bacteria are single-celled organisms that lack a:",                                        opts:["Cell wall","Cell membrane","Nucleus","Cytoplasm"],                                         ans:2 },
  { g:6, s:'Science', t:'Reproduction',           d:'Easy',   q:"In sexual reproduction, a new organism receives genes from:",                                 opts:["One parent","Two parents","No parents","Environmental factors"],                            ans:1 },
  { g:6, s:'Science', t:'Reproduction',           d:'Medium', q:"Asexual reproduction produces offspring that are:",                                          opts:["Different from parents","Identical to parents","Hybrids","Mutated"],                        ans:1 },
  { g:6, s:'Science', t:'Light & Sound',          d:'Easy',   q:"Light travels in _____ lines.",                                                              opts:["Curved","Straight","Circular","Wavy"],                                                      ans:1 },
  { g:6, s:'Science', t:'Light & Sound',          d:'Medium', q:"The speed of sound is approximately:",                                                       opts:["300,000 km/s","1000 m/s","340 m/s","10,000 m/s"],                                          ans:2 },
  { g:6, s:'Science', t:'Optics',                 d:'Medium', q:"A _____ lens makes objects appear larger.",                                                   opts:["Concave","Convex","Flat","Prism"],                                                         ans:1 },
  // Grade 7 Science
  { g:7, s:'Science', t:'Photosynthesis',         d:'Easy',   q:"Photosynthesis requires three main ingredients: light, water, and:",                          opts:["Oxygen","Carbon dioxide","Nitrogen","Hydrogen"],                                           ans:1 },
  { g:7, s:'Science', t:'Photosynthesis',         d:'Medium', q:"The main product of photosynthesis used by plants for energy is:",                          opts:["Oxygen","Glucose","Water","Carbon dioxide"],                                               ans:1 },
  { g:7, s:'Science', t:'Respiration',            d:'Easy',   q:"Cellular respiration releases energy from:",                                                  opts:["Sunlight","Glucose","Oxygen","Water"],                                                     ans:1 },
  { g:7, s:'Science', t:'Respiration',            d:'Medium', q:"The main products of aerobic respiration are water and:",                                     opts:["Glucose","Oxygen","Carbon dioxide","Energy"],                                              ans:2 },
  { g:7, s:'Science', t:'Homeostasis',            d:'Medium', q:"Homeostasis is the process by which organisms maintain:",                                     opts:["Growth","Internal stability","Reproduction","Evolution"],                                  ans:1 },
  { g:7, s:'Science', t:'Body Systems',           d:'Easy',   q:"The system that carries oxygen throughout the body is the:",                                  opts:["Nervous system","Digestive system","Circulatory system","Immune system"],                   ans:2 },
  { g:7, s:'Science', t:'Body Systems',           d:'Medium', q:"The muscular system works with the _____ system to create movement.",                        opts:["Nervous","Skeletal","Digestive","Circulatory"],                                             ans:1 },
  { g:7, s:'Science', t:'Genetics',               d:'Easy',   q:"A unit of hereditary information passed from parent to offspring is a:",                       opts:["Chromosome","Trait","Gene","DNA"],                                                         ans:2 },
  { g:7, s:'Science', t:'Genetics',               d:'Medium', q:"Genes are segments of _____ that carry instructions for traits.",                            opts:["RNA","Proteins","DNA","Ribosomes"],                                                        ans:2 },
  { g:7, s:'Science', t:'Evolution',              d:'Easy',   q:"Natural selection means that organisms with beneficial _____ survive better.",               opts:["Colors","Traits","Habitats","Foods"],                                                      ans:1 },
  { g:7, s:'Science', t:'Adaptations',            d:'Easy',   q:"An inherited characteristic that helps an organism survive is called a/an:",                 opts:["Mutation","Adaptation","Evolution","Variation"],                                          ans:1 },
  { g:7, s:'Science', t:'Adaptations',            d:'Medium', q:"Which is an example of a behavioral adaptation?",                                            opts:["Thick fur","Migration","Camouflage coloring","Long legs"],                                   ans:1 },
  { g:7, s:'Science', t:'Ecology',                d:'Medium', q:"In a food chain, energy flows from producers to:",                                            opts:["Decomposers","Primary consumers","The sun","Secondary consumers"],                          ans:1 },
  { g:7, s:'Science', t:'Biotic & Abiotic',       d:'Easy',   q:"Living things in an ecosystem are called:",                                                   opts:["Abiotic factors","Biotic factors","Ecosystems","Habitats"],                                 ans:1 },
  { g:7, s:'Science', t:'Biotic & Abiotic',       d:'Medium', q:"Which is an abiotic factor in a forest ecosystem?",                                          opts:["Trees","Deer","Sunlight","Insects"],                                                        ans:2 },
  { g:7, s:'Science', t:'Periodic Table',         d:'Easy',   q:"The periodic table organizes elements by their atomic:",                                      opts:["Mass","Symbol","Number","Weight"],                                                         ans:2 },
  { g:7, s:'Science', t:'Atoms & Elements',       d:'Medium', q:"Elements in the same group of the periodic table have similar:",                             opts:["Atomic mass","Chemical properties","Size","Color"],                                        ans:1 },
  { g:7, s:'Science', t:'Chemical Reactions',     d:'Medium', q:"A chemical reaction produces new substances called:",                                        opts:["Reactants","Catalyst","Products","Atoms"],                                                 ans:2 },
  { g:7, s:'Science', t:'Physical & Chemical',    d:'Medium', q:"Melting ice is an example of a _____ change.",                                              opts:["Chemical","Physical","Irreversible","Atomic"],                                              ans:1 },
  // Grade 8 Science
  { g:8, s:'Science', t:'Biotic & Abiotic',       d:'Hard',   q:"Which would most directly increase carrying capacity of an ecosystem?",                      opts:["Disease outbreak","Increased predators","Drought","Increased food supply"],                 ans:3 },
  { g:8, s:'Science', t:'Ecology',                d:'Hard',   q:"When an invasive species is introduced to an ecosystem, it often:",                          opts:["Dies immediately","Has no effect","Reduces biodiversity and disrupts the ecosystem","Improves biodiversity"], ans:2 },
  { g:8, s:'Science', t:'Environmental Issues',   d:'Easy',   q:"Acid rain is caused by air pollution from:",                                                 opts:["Ozone depletion","Carbon emissions","Sulfur dioxide","Greenhouse gases"],                   ans:2 },
  { g:8, s:'Science', t:'Environmental Issues',   d:'Medium', q:"Deforestation primarily contributes to climate change by reducing the number of trees that:", opts:["Store oxygen","Absorb carbon dioxide","Produce seeds","Provide shade"],                   ans:1 },
  { g:8, s:'Science', t:'Magnetism',              d:'Easy',   q:"Magnetic poles that are the same will:",                                                     opts:["Attract","Repel","Stick together","Create energy"],                                        ans:1 },
  { g:8, s:'Science', t:'Magnetism',              d:'Medium', q:"An electromagnet requires a _____ wire wrapped around a metal core.",                        opts:["Copper","Straight","Conducting","Insulated"],                                              ans:2 },
  { g:8, s:'Science', t:'Electricity',            d:'Medium', q:"In a series circuit, if one bulb burns out, the others will:",                               opts:["Stay bright","Go out","Become brighter","Dim slightly"],                                    ans:1 },
  { g:8, s:'Science', t:'Electricity',            d:'Hard',   q:"Electrical current in a circuit can be measured in:",                                         opts:["Watts","Volts","Amperes","All of the above"],                                              ans:2 },
  { g:8, s:'Science', t:'Waves',                  d:'Easy',   q:"The maximum displacement of a point in a wave is called the:",                               opts:["Wavelength","Frequency","Amplitude","Velocity"],                                           ans:2 },
  { g:8, s:'Science', t:'Waves',                  d:'Medium', q:"Light and sound both travel as:",                                                            opts:["Particles only","Waves only","Particles or waves","Atoms"],                                 ans:1 },
  { g:8, s:'Science', t:'Simple Machines',        d:'Easy',   q:"A lever is a simple machine made of a bar and a:",                                           opts:["Wheel","Pulley","Fulcrum","Screw"],                                                        ans:2 },
  { g:8, s:'Science', t:'Simple Machines',        d:'Medium', q:"An inclined plane reduces the force needed by increasing the:",                              opts:["Height","Distance","Angle","Weight"],                                                      ans:1 },
  { g:8, s:'Science', t:'Forms of Energy',        d:'Easy',   q:"Potential energy is energy that is:",                                                        opts:["Moving","Stored","Lost","Transferred"],                                                    ans:1 },
  { g:8, s:'Science', t:'Forms of Energy',        d:'Medium', q:"Kinetic energy depends on mass and:",                                                        opts:["Height","Temperature","Velocity","Direction"],                                             ans:2 },
  { g:8, s:'Science', t:'Chemical Reactions',     d:'Hard',   q:"In an exothermic reaction, energy is _____ to the surroundings.",                           opts:["Absorbed from","Released to","Trapped in","Removed from"],                                 ans:1 },
  { g:8, s:'Science', t:'Plate Tectonics',        d:'Easy',   q:"The Earth's crust is divided into large sections called:",                                    opts:["Layers","Plates","Faults","Zones"],                                                        ans:1 },
  { g:8, s:'Science', t:'Plate Tectonics',        d:'Medium', q:"Earthquakes are most common at:",                                                            opts:["The equator","Plate boundaries","Desert regions","Ocean floors"],                           ans:1 },
  { g:8, s:'Science', t:'Erosion',                d:'Medium', q:"Which type of erosion is caused by moving water?",                                           opts:["Wind erosion","Ice erosion","Glacial erosion","Stream erosion"],                             ans:3 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── HISTORY Grades 5–8 EXPANDED (additional 92 questions) ────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // Grade 5 History
  { g:5, s:'History', t:'Ancient Egypt',          d:'Medium', q:"The ancient Egyptians built pyramids as:",                                                  opts:["Temples","Homes for gods","Tombs for pharaohs","Lighthouses"],                              ans:2 },
  { g:5, s:'History', t:'Ancient Egypt',          d:'Hard',   q:"The Nile River floods were important to ancient Egypt because they:",                       opts:["Provided transportation only","Destroyed crops","Deposited fertile soil","Created deserts"], ans:2 },
  { g:5, s:'History', t:'Mesopotamia',            d:'Medium', q:"The Code of Hammurabi established:",                                                        opts:["Religious laws","A written system of laws and punishments","Trade routes","Military order"],  ans:1 },
  { g:5, s:'History', t:'Ancient Rome',           d:'Easy',   q:"The system of government in ancient Rome where citizens had some power was:",              opts:["Monarchy","Republic","Democracy","Empire"],                                                ans:1 },
  { g:5, s:'History', t:'Ancient Rome',           d:'Medium', q:"Roman soldiers were organized into units called:",                                           opts:["Squads","Platoons","Legions","Battalions"],                                                ans:2 },
  { g:5, s:'History', t:'Ancient Greece',         d:'Easy',   q:"The city-state of Athens is known as the birthplace of:",                                    opts:["Philosophy","Science","Democracy","Theater"],                                              ans:2 },
  { g:5, s:'History', t:'Ancient Greece',         d:'Medium', q:"The ancient Olympics were held in honor of the god:",                                        opts:["Poseidon","Athena","Zeus","Hermes"],                                                       ans:2 },
  { g:5, s:'History', t:'Ancient China',          d:'Medium', q:"The Great Wall of China was built primarily to:",                                            opts:["House soldiers","Control trade","Protect against invasions","Prevent flooding"],             ans:2 },
  { g:5, s:'History', t:'Medieval Times',         d:'Easy',   q:"During the medieval period, the social system based on land ownership was:",                opts:["Monarchy","Feudalism","Capitalism","Communism"],                                            ans:1 },
  { g:5, s:'History', t:'Medieval Times',         d:'Medium', q:"Knights in the medieval period served:",                                                     opts:["The church only","Peasants","Nobles and kings","Themselves"],                                ans:2 },
  { g:5, s:'History', t:'Islamic Civilization',   d:'Easy',   q:"Islam was founded by the prophet:",                                                         opts:["Jesus","Muhammad","Moses","Abraham"],                                                      ans:1 },
  { g:5, s:'History', t:'Islamic Civilization',   d:'Medium', q:"The Islamic Golden Age was a period of great:",                                             opts:["Military expansion only","Artistic and scientific achievement","Religious conflict","Economic decline"], ans:1 },
  { g:5, s:'History', t:'Civilizations',          d:'Easy',   q:"A civilization requires organized:",                                                        opts:["Religion","Society and government","Technology","Trade"],                                   ans:1 },
  // Grade 6 History
  { g:6, s:'History', t:'New France / Canada',    d:'Medium', q:"New France was a French colony in North America that eventually became:",                    opts:["The USA","Canada","Mexico","Parts of both USA and Canada"],                                 ans:3 },
  { g:6, s:'History', t:'New France / Canada',    d:'Hard',   q:"The fur trade was so important to New France because:",                                     opts:["It was the only export","Furs were valuable in Europe","It created many jobs","All of the above"], ans:3 },
  { g:6, s:'History', t:'Age of Exploration',     d:'Medium', q:"Explorers sailed to find new lands partly to obtain:",                                      opts:["Fame","Spices and goods","Gold","All of the above"],                                       ans:3 },
  { g:6, s:'History', t:'Age of Exploration',     d:'Hard',   q:"Christopher Columbus believed he could reach Asia by sailing:",                             opts:["North","South","East","West"],                                                             ans:3 },
  { g:6, s:'History', t:'Renaissance',            d:'Easy',   q:"The Renaissance was a period of renewed interest in:",                                      opts:["Medieval culture","Ancient Greek and Roman culture","Islamic culture","Medieval warfare"],    ans:1 },
  { g:6, s:'History', t:'Renaissance',            d:'Medium', q:"Leonardo da Vinci was known as a 'Renaissance man' because he excelled in:",                 opts:["Military affairs only","Art and science","Politics","Trade"],                                ans:1 },
  { g:6, s:'History', t:'Reformation',            d:'Easy',   q:"The Reformation was a movement that challenged:",                                            opts:["The monarchy","Scientific ideas","The authority of the Catholic Church","Ancient traditions"], ans:2 },
  { g:6, s:'History', t:'Reformation',            d:'Medium', q:"Martin Luther's protests led to the creation of:",                                          opts:["Catholicism","New Christian denominations","Islam","Judaism"],                              ans:1 },
  { g:6, s:'History', t:'Colonial America',       d:'Easy',   q:"The thirteen colonies were established along the _____ coast of North America.",             opts:["Pacific","Arctic","Atlantic","Gulf"],                                                      ans:2 },
  { g:6, s:'History', t:'Colonial America',       d:'Medium', q:"The first permanent English settlement in North America was:",                               opts:["Boston","Philadelphia","Jamestown","New York"],                                             ans:2 },
  { g:6, s:'History', t:'American Revolution',    d:'Easy',   q:"The American Revolution was primarily a war between:",                                      opts:["North and South","France and Spain","Britain and America","Colonists and Native Americans"], ans:2 },
  { g:6, s:'History', t:'American Revolution',    d:'Hard',   q:"The Declaration of Independence stated that governments derive power from the:",            opts:["Military","Religion","Consent of the governed","Nobility"],                                 ans:2 },
  { g:6, s:'History', t:'US Civil War',           d:'Medium', q:"The primary cause of the American Civil War was the dispute over:",                         opts:["Trade rights","State power","Slavery","Western expansion"],                                 ans:2 },
  { g:6, s:'History', t:'US Civil War',           d:'Hard',   q:"The Emancipation Proclamation freed slaves in:",                                            opts:["Northern states","Southern states in rebellion","All states","Border states only"],          ans:1 },
  // Grade 7 History
  { g:7, s:'History', t:'Industrial Revolution',  d:'Easy',   q:"The Industrial Revolution began in:",                                                       opts:["France","Germany","Britain","America"],                                                    ans:2 },
  { g:7, s:'History', t:'Industrial Revolution',  d:'Medium', q:"The steam engine was a key invention that powered:",                                        opts:["Factories and trains","Ships only","Homes","Weapons"],                                       ans:0 },
  { g:7, s:'History', t:'Enlightenment',          d:'Medium', q:"The Enlightenment emphasized the use of _____ over tradition and faith.",                    opts:["Authority","Reason and science","Military power","Religious teaching"],                     ans:1 },
  { g:7, s:'History', t:'French Revolution',      d:'Easy',   q:"The French Revolution overthrew:",                                                          opts:["Democracy","The monarchy and feudalism","Capitalism","Communism"],                           ans:1 },
  { g:7, s:'History', t:'French Revolution',      d:'Medium', q:"The motto of the French Revolution was 'Liberty, Equality, and':",                          opts:["Justice","Fraternity","Democracy","Unity"],                                                ans:1 },
  { g:7, s:'History', t:'WWI',                    d:'Easy',   q:"World War I primarily involved nations in:",                                                 opts:["Asia","Europe and beyond","Americas","Africa"],                                            ans:1 },
  { g:7, s:'History', t:'WWI',                    d:'Medium', q:"The system of alliances in WWI meant that an attack on one nation triggered:",              opts:["Economic sanctions","Nothing","Declarations of war by allied nations","Negotiations"],       ans:2 },
  { g:7, s:'History', t:'Reconstruction',         d:'Medium', q:"Reconstruction after the Civil War aimed to:",                                              opts:["Punish the South severely","Rebuild the South and integrate freed slaves","Prevent future wars","Expand westward"], ans:1 },
  { g:7, s:'History', t:'Native Americans',       d:'Medium', q:"Native American tribes were forced to move westward during the:",                            opts:["Gold Rush","Indian Removal period","Civil War","Industrial Revolution"],                    ans:1 },
  // Grade 8 History
  { g:8, s:'History', t:'World War II',           d:'Medium', q:"Nazi Germany, Fascist Italy, and Imperial Japan formed the:",                               opts:["Allied powers","Axis powers","League of Nations","Warsaw Pact"],                            ans:1 },
  { g:8, s:'History', t:'Imperialism',            d:'Easy',   q:"Imperialism is the policy of one nation controlling:",                                      opts:["Its own territory","Other territories and peoples","Trade only","Religious beliefs"],        ans:1 },
  { g:8, s:'History', t:'Imperialism',            d:'Medium', q:"The 'Scramble for Africa' refers to the competition between European nations to:",         opts:["Trade","Colonize Africa","Build railroads","Explore deserts"],                              ans:1 },
  { g:8, s:'History', t:'Trade & Economy',        d:'Medium', q:"The triangular trade route primarily involved the exchange of:",                             opts:["Spices and silk","Manufactured goods, enslaved people, and raw materials","Gold and silver","Food and livestock"], ans:1 },
  { g:8, s:'History', t:'Absolutism',             d:'Medium', q:"An absolute monarch believes they have power that comes from:",                              opts:["The people","God","Parliament","Elections"],                                               ans:1 },
  { g:8, s:'History', t:'Vikings',                d:'Easy',   q:"Vikings were Norse raiders who primarily attacked:",                                         opts:["Desert communities","Coastal settlements and monasteries","Mountain fortresses","Desert cities"], ans:1 },
  { g:8, s:'History', t:'Timelines',              d:'Medium', q:"On a historical timeline, 1500 BCE is _____ than 1500 CE.",                                opts:["Later than","Earlier than","The same as","Impossible to compare"],                         ans:1 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── GEOGRAPHY Grades 5–8 EXPANDED (additional 92 questions) ──────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // Grade 5 Geography
  { g:5, s:'Geography', t:'Continents & Oceans',  d:'Medium', q:"Which continent is the largest?",                                                          opts:["Africa","Europe","Asia","Antarctica"],                                                     ans:2 },
  { g:5, s:'Geography', t:'Continents & Oceans',  d:'Hard',   q:"The Atlantic Ocean separates which two continents?",                                        opts:["Europe and Asia","Africa and Asia","North America and Europe","South America and Africa"], ans:2 },
  { g:5, s:'Geography', t:'Continents',           d:'Easy',   q:"How many continents are there?",                                                            opts:["5","6","7","8"],                                                                           ans:2 },
  { g:5, s:'Geography', t:'Map Skills',           d:'Medium', q:"The set of lines running east to west on a map are called:",                                 opts:["Longitude","Latitude","Meridians","Coordinates"],                                          ans:1 },
  { g:5, s:'Geography', t:'Map Skills',           d:'Hard',   q:"Latitude measures distance from the:",                                                      opts:["Prime meridian","Equator","International Date Line","Tropics"],                             ans:1 },
  { g:5, s:'Geography', t:'Landforms',            d:'Easy',   q:"A mountain range is a group of _____ connected together.",                                  opts:["Valleys","Mountains","Plateaus","Basins"],                                                  ans:1 },
  { g:5, s:'Geography', t:'Landforms',            d:'Medium', q:"A plateau is a raised, flat area of land that is:",                                         opts:["At sea level","Above surrounding land","Below sea level","In the ocean"],                     ans:1 },
  { g:5, s:'Geography', t:'Mountains',            d:'Easy',   q:"The highest mountain on Earth is:",                                                         opts:["K2","Mount Kilimanjaro","Mount Everest","Mount McKinley"],                                ans:2 },
  { g:5, s:'Geography', t:'Great Lakes',          d:'Easy',   q:"The Great Lakes are located in North America primarily in:",                                 opts:["Western Canada","The USA","Central America","South America"],                               ans:1 },
  { g:5, s:'Geography', t:'Oceans',               d:'Easy',   q:"Which is the largest ocean on Earth?",                                                      opts:["Atlantic","Arctic","Indian","Pacific"],                                                     ans:3 },
  { g:5, s:'Geography', t:'Rivers',               d:'Easy',   q:"The longest river in the world is the:",                                                    opts:["Amazon","Yangtze","Mississippi","Nile"],                                                   ans:3 },
  // Grade 6 Geography
  { g:6, s:'Geography', t:'Climate & Biomes',     d:'Medium', q:"Tropical rainforests are located near the:",                                                 opts:["Arctic","Equator","Poles","Deserts"],                                                      ans:1 },
  { g:6, s:'Geography', t:'Biomes',               d:'Easy',   q:"A desert biome is characterized by:",                                                      opts:["High rainfall","Low rainfall and limited vegetation","Frozen ground","Tropical plants"],      ans:1 },
  { g:6, s:'Geography', t:'Biomes',               d:'Medium', q:"The tundra biome is found near the _____ regions.",                                         opts:["Tropical","Subtropical","Polar and arctic","Desert"],                                       ans:2 },
  { g:6, s:'Geography', t:'Climate Zones',        d:'Easy',   q:"Which climate zone has the warmest temperatures?",                                          opts:["Temperate","Polar","Tropical","Subtropical"],                                              ans:2 },
  { g:6, s:'Geography', t:'Climate Zones',        d:'Medium', q:"The equator divides the Earth into how many equal hemispheres?",                            opts:["2","3","4","6"],                                                                           ans:0 },
  { g:6, s:'Geography', t:'Population',           d:'Easy',   q:"The number of people living in a specific area is called:",                                 opts:["Density","Distribution","Population","Census"],                                             ans:2 },
  { g:6, s:'Geography', t:'Capitals',             d:'Easy',   q:"The capital of Canada is:",                                                                  opts:["Vancouver","Toronto","Ottawa","Calgary"],                                                  ans:2 },
  { g:6, s:'Geography', t:'Canada Physical',      d:'Medium', q:"The Rocky Mountains are located in which region of Canada?",                                opts:["Atlantic","Central","Pacific","Arctic"],                                                    ans:2 },
  { g:6, s:'Geography', t:'Canada Physical',      d:'Hard',   q:"The Canadian Shield is a large region of:",                                                 opts:["Deserts","Ancient rock and forests","Prairies","Mountains"],                                ans:1 },
  { g:6, s:'Geography', t:'Canada Political',     d:'Medium', q:"Canada has how many provinces and territories?",                                            opts:["10","12","13","15"],                                                                       ans:2 },
  { g:6, s:'Geography', t:'USA Physical',         d:'Easy',   q:"The Rocky Mountains are located on the _____ side of the USA.",                             opts:["Eastern","Western","Central","Southern"],                                                  ans:1 },
  { g:6, s:'Geography', t:'USA Political',        d:'Easy',   q:"The capital of the United States is:",                                                      opts:["New York","Los Angeles","Washington, D.C.","Chicago"],                                      ans:2 },
  // Grade 7 Geography
  { g:7, s:'Geography', t:'North America Political', d:'Medium', q:"Mexico is located on the _____ continent.",                                           opts:["South American","North American","Central American","Caribbean"],                           ans:1 },
  { g:7, s:'Geography', t:'South America',        d:'Easy',   q:"The Amazon Rainforest is located primarily in:",                                            opts:["Africa","South America","Asia","Central America"],                                         ans:1 },
  { g:7, s:'Geography', t:'South America',        d:'Medium', q:"The Andes Mountains run along the _____ side of South America.",                           opts:["Eastern","Western","Central","Southern"],                                                  ans:1 },
  { g:7, s:'Geography', t:'Africa',               d:'Easy',   q:"The largest country in Africa by land area is:",                                            opts:["Egypt","Nigeria","Ethiopia","Sudan"],                                                      ans:3 },
  { g:7, s:'Geography', t:'Africa',               d:'Medium', q:"The Sahara is the _____ desert in the world.",                                             opts:["Largest","Hottest","Coldest","Driest"],                                                     ans:0 },
  { g:7, s:'Geography', t:'Europe',               d:'Easy',   q:"The capital of France is:",                                                                 opts:["Marseille","Nice","Paris","Lyon"],                                                         ans:2 },
  { g:7, s:'Geography', t:'Europe',               d:'Medium', q:"The Alps are a major mountain range located in:",                                           opts:["Northern Europe","Southern Europe","Central Europe","Eastern Europe"],                      ans:2 },
  { g:7, s:'Geography', t:'Asia',                 d:'Easy',   q:"Asia is the _____ continent.",                                                              opts:["Smallest","Most populated","Coldest","Least populated"],                                   ans:1 },
  { g:7, s:'Geography', t:'Asia',                 d:'Medium', q:"The Great Wall is located in:",                                                             opts:["India","Japan","China","Mongolia"],                                                        ans:2 },
  // Grade 8 Geography
  { g:8, s:'Geography', t:'Urbanization',         d:'Hard',   q:"Cities with populations over 10 million are called:",                                       opts:["Metropolis","Megacity","Metropolitan area","Conurbation"],                                  ans:1 },
  { g:8, s:'Geography', t:'Deserts',              d:'Medium', q:"Deserts cover approximately what percentage of Earth's land?",                               opts:["10%","20%","33%","50%"],                                                                   ans:1 },
  { g:8, s:'Geography', t:'Borders',              d:'Medium', q:"A natural border between two countries could be a:",                                         opts:["Treaty","River or mountain","Agreement","All of the above"],                                ans:3 },
  { g:8, s:'Geography', t:'Imports & Exports',    d:'Medium', q:"A country imports goods that it:",                                                          opts:["Produces locally","Buys from other countries","Sells to other countries","Manufactures"],   ans:1 },
  { g:8, s:'Geography', t:'Globalization',        d:'Medium', q:"Globalization has led to increased _____ between countries.",                               opts:["Conflict","Trade and cultural exchange","Isolation","Distance"],                             ans:1 },
  { g:8, s:'Geography', t:'Sustainability',       d:'Hard',   q:"Sustainable development meets present needs without compromising the ability of future:",  opts:["Generations to benefit","Generations to meet their needs","Countries to compete","Businesses to profit"], ans:1 },
  { g:8, s:'Geography', t:'Indigenous Canada',    d:'Medium', q:"Indigenous peoples have inhabited North America for approximately how many years?",       opts:["500","2,000","15,000+","1 million"],                                                       ans:2 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── MATH Grades 5–8 EXPANDED (additional 92 questions) ──────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // Grade 5 Math
  { g:5, s:'Math', t:'Number Sense',             d:'Easy',   q:"The number 4,567 written in words is:",                                                    opts:["Four hundred sixty-seven","Four thousand five hundred sixty-seven","Four thousand five hundred six","Four million five hundred sixty-seven"], ans:1 },
  { g:5, s:'Math', t:'Number Sense',             d:'Medium', q:"Which number is greater: 3.45 or 3.54?",                                                   opts:["3.45","3.54","They are equal","Cannot be determined"],                                     ans:1 },
  { g:5, s:'Math', t:'Place Value',              d:'Easy',   q:"In the number 82,341, what is the value of the 2?",                                        opts:["2","20","200","2,000"],                                                                    ans:3 },
  { g:5, s:'Math', t:'Place Value',              d:'Medium', q:"The digit in the hundreds place of 67,892 is:",                                              opts:["6","7","8","9"],                                                                           ans:2 },
  { g:5, s:'Math', t:'Addition & Subtraction',   d:'Easy',   q:"567 + 432 = ?",                                                                              opts:["899","999","1,099","900"],                                                                 ans:1 },
  { g:5, s:'Math', t:'Addition & Subtraction',   d:'Medium', q:"1,234 − 567 = ?",                                                                            opts:["667","667","677","757"],                                                                   ans:1 },
  { g:5, s:'Math', t:'Multiplication',           d:'Medium', q:"45 × 6 = ?",                                                                                 opts:["240","260","270","280"],                                                                   ans:2 },
  { g:5, s:'Math', t:'Division',                 d:'Easy',   q:"24 ÷ 4 = ?",                                                                                 opts:["4","6","8","12"],                                                                          ans:1 },
  { g:5, s:'Math', t:'Decimals',                 d:'Easy',   q:"0.5 + 0.3 = ?",                                                                              opts:["0.2","0.8","0.35","0.9"],                                                                  ans:1 },
  { g:5, s:'Math', t:'Decimals',                 d:'Medium', q:"2.5 × 4 = ?",                                                                                opts:["9","10","11","12"],                                                                        ans:1 },
  { g:5, s:'Math', t:'Rounding',                 d:'Easy',   q:"Round 47 to the nearest 10:",                                                                opts:["40","50","45","48"],                                                                       ans:1 },
  { g:5, s:'Math', t:'Rounding',                 d:'Medium', q:"Round 3.67 to the nearest tenth:",                                                           opts:["3.6","3.7","3.66","3.68"],                                                                 ans:1 },
  // Grade 6 Math
  { g:6, s:'Math', t:'Fractions & Decimals',     d:'Easy',   q:"1/2 + 1/4 = ?",                                                                              opts:["1/6","2/4","3/4","1/3"],                                                                   ans:2 },
  { g:6, s:'Math', t:'Fractions & Decimals',     d:'Medium', q:"2/3 − 1/4 = ?",                                                                              opts:["5/12","7/12","1/3","1/12"],                                                                ans:1 },
  { g:6, s:'Math', t:'Ratios & Proportions',     d:'Easy',   q:"A ratio of 2:3 means for every 2 of something, there are:",                                opts:["2 more","3 total","3 of another thing","5 things"],                                       ans:2 },
  { g:6, s:'Math', t:'Ratios & Proportions',     d:'Medium', q:"If 3 apples cost $2, how much do 9 apples cost?",                                           opts:["$4","$6","$8","$9"],                                                                       ans:1 },
  { g:6, s:'Math', t:'Ratios & Rates',           d:'Medium', q:"A rate of 60 km/h means traveling 60 km in:",                                               opts:["1 minute","10 minutes","1 hour","1 day"],                                                   ans:2 },
  { g:6, s:'Math', t:'Percent of Change',        d:'Medium', q:"If a price increases from $50 to $75, the percent increase is:",                           opts:["25%","33%","50%","75%"],                                                                   ans:2 },
  { g:6, s:'Math', t:'Order of Operations',      d:'Medium', q:"2 + 3 × 4 = ?",                                                                              opts:["20","14","18","12"],                                                                       ans:1 },
  { g:6, s:'Math', t:'Number Theory',            d:'Easy',   q:"The factors of 12 are all numbers that divide evenly into 12. Which is a factor of 12?",  opts:["5","7","8","6"],                                                                       ans:3 },
  { g:6, s:'Math', t:'Number Theory',            d:'Medium', q:"The least common multiple (LCM) of 4 and 6 is:",                                            opts:["2","12","24","10"],                                                                        ans:1 },
  { g:6, s:'Math', t:'Scientific Notation',      d:'Medium', q:"The number 5,000 in scientific notation is:",                                               opts:["5 × 10²","5 × 10³","5 × 10⁴","50 × 10²"],                                               ans:1 },
  // Grade 7 Math
  { g:7, s:'Math', t:'Proportional Reasoning',   d:'Medium', q:"In a proportional relationship, if x doubles, y:",                                           opts:["Stays the same","Doubles","Halves","Is cut in fourths"],                                    ans:1 },
  { g:7, s:'Math', t:'Percentages',              d:'Medium', q:"What is 25% of 80?",                                                                        opts:["20","25","30","40"],                                                                       ans:0 },
  { g:7, s:'Math', t:'Percentages',              d:'Hard',   q:"If 40% of a number is 32, what is the number?",                                             opts:["40","60","80","100"],                                                                      ans:2 },
  { g:7, s:'Math', t:'Integers',                 d:'Easy',   q:"-5 + 8 = ?",                                                                                 opts:["−3","3","13","−13"],                                                                       ans:1 },
  { g:7, s:'Math', t:'Integers',                 d:'Medium', q:"-3 × −2 = ?",                                                                                opts:["−6","6","−5","5"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Algebra',                  d:'Easy',   q:"If 3x + 5 = 14, then x equals:",                                                            opts:["2","3","4","5"],                                                                           ans:2 },
  { g:7, s:'Math', t:'Algebra',                  d:'Medium', q:"Solve: 2x − 3 = 7",                                                                         opts:["x = 2","x = 5","x = −5","x = 10"],                                                        ans:1 },
  { g:7, s:'Math', t:'Systems of Equations',     d:'Hard',   q:"Solve: x + y = 5 and x − y = 1. What is x?",                                               opts:["1","2","3","4"],                                                                           ans:2 },
  { g:7, s:'Math', t:'Geometry',                 d:'Easy',   q:"The sum of angles in a quadrilateral is:",                                                  opts:["180°","270°","360°","540°"],                                                               ans:2 },
  { g:7, s:'Math', t:'Geometry',                 d:'Medium', q:"The area of a rectangle with length 8 and width 5 is:",                                     opts:["13","26","40","80"],                                                                       ans:2 },
  { g:7, s:'Math', t:'Area & Perimeter',         d:'Medium', q:"The perimeter of a square with side length 6 is:",                                           opts:["12","24","36","6"],                                                                        ans:1 },
  { g:7, s:'Math', t:'Area & Perimeter',         d:'Hard',   q:"A rectangle has a perimeter of 20. If the length is 6, the width is:",                      opts:["4","5","6","8"],                                                                          ans:0 },
  { g:7, s:'Math', t:'Volume & Surface Area',    d:'Medium', q:"The volume of a rectangular prism with dimensions 3 × 4 × 5 is:",                           opts:["12","20","30","60"],                                                                       ans:3 },
  // Grade 8 Math
  { g:8, s:'Math', t:'Pythagorean Theorem',      d:'Easy',   q:"In a right triangle, a² + b² = ?",                                                         opts:["c","c²","2c","c³"],                                                                       ans:1 },
  { g:8, s:'Math', t:'Pythagorean Theorem',      d:'Medium', q:"A right triangle has legs of 3 and 4. The hypotenuse is:",                                  opts:["5","6","7","8"],                                                                           ans:0 },
  { g:8, s:'Math', t:'Pythagorean Theorem',      d:'Hard',   q:"If the hypotenuse is 10 and one leg is 6, the other leg is:",                               opts:["4","6","8","12"],                                                                          ans:2 },
  { g:8, s:'Math', t:'Slope',                    d:'Medium', q:"The slope of the line through (0,0) and (2,4) is:",                                        opts:["1","2","3","4"],                                                                           ans:1 },
  { g:8, s:'Math', t:'Coordinate Geometry',      d:'Easy',   q:"The point (0,0) on a coordinate plane is called the:",                                      opts:["Vertex","Axis","Origin","Quadrant"],                                                       ans:2 },
  { g:8, s:'Math', t:'Coordinate Geometry',      d:'Medium', q:"Which quadrant contains the point (−3, 2)?",                                                 opts:["I","II","III","IV"],                                                                       ans:1 },
  { g:8, s:'Math', t:'Exponents',                d:'Easy',   q:"5² = ?",                                                                                     opts:["10","25","32","125"],                                                                      ans:1 },
  { g:8, s:'Math', t:'Exponents',                d:'Medium', q:"(2³)² = ?",                                                                                   opts:["32","64","128","256"],                                                                     ans:2 },
  { g:8, s:'Math', t:'Radicals',                 d:'Easy',   q:"√16 = ?",                                                                                    opts:["2","3","4","8"],                                                                           ans:2 },
  { g:8, s:'Math', t:'Radicals',                 d:'Medium', q:"√144 = ?",                                                                                   opts:["10","11","12","13"],                                                                      ans:2 },
  { g:8, s:'Math', t:'Probability',              d:'Easy',   q:"The probability of rolling a 3 on a fair die is:",                                         opts:["1/2","1/3","1/4","1/6"],                                                                  ans:3 },
  { g:8, s:'Math', t:'Probability',              d:'Medium', q:"If you flip a coin twice, the probability of getting two heads is:",                        opts:["1/2","1/3","1/4","1/8"],                                                                  ans:2 },
  { g:8, s:'Math', t:'Statistics',               d:'Easy',   q:"The median of {2, 4, 6, 8, 10} is:",                                                       opts:["4","6","8","5"],                                                                           ans:1 },
  { g:8, s:'Math', t:'Statistics',               d:'Medium', q:"The mode of {1, 2, 2, 3, 4, 4, 4, 5} is:",                                                  opts:["2","3","4","2.5"],                                                                        ans:2 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── SCIENCE Grades 9 & 10 (75 questions) ────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // – Biology –
  { g:9,  s:'Science', t:'Cell Biology',          d:'Easy',   q:"The process by which cells divide to produce two identical daughter cells is:",               opts:["Meiosis","Mitosis","Fertilization","Budding"],                                              ans:1 },
  { g:9,  s:'Science', t:'Cell Biology',          d:'Medium', q:"The fluid inside the cell but outside the nucleus is called:",                               opts:["Cytosol","Nucleoplasm","Plasma","Sap"],                                                     ans:0 },
  { g:9,  s:'Science', t:'Cell Biology',          d:'Hard',   q:"During which phase of mitosis do chromosomes line up along the cell's equator?",             opts:["Prophase","Anaphase","Metaphase","Telophase"],                                              ans:2 },
  { g:9,  s:'Science', t:'Genetics',              d:'Easy',   q:"The complete set of genetic information in an organism is called its:",                       opts:["Genome","Genotype","Phenotype","Karyotype"],                                                ans:0 },
  { g:9,  s:'Science', t:'Genetics',              d:'Medium', q:"A mutation that changes one base pair in a DNA sequence is called a:",                       opts:["Frameshift mutation","Point mutation","Chromosomal deletion","Inversion"],                  ans:1 },
  { g:9,  s:'Science', t:'Genetics',              d:'Hard',   q:"The Central Dogma of molecular biology states that information flows:",                      opts:["Protein → RNA → DNA","DNA → RNA → Protein","RNA → Protein → DNA","DNA → Protein → RNA"],   ans:1 },
  { g:9,  s:'Science', t:'Evolution',             d:'Medium', q:"Evidence for evolution includes all EXCEPT:",                                                 opts:["Comparative anatomy","Fossil records","Lamarck's acquired traits","DNA similarities"],       ans:2 },
  { g:9,  s:'Science', t:'Evolution',             d:'Hard',   q:"Allopatric speciation occurs when populations become isolated by:",                          opts:["Sexual selection","Geographic barriers","Genetic drift alone","Behavioral changes"],         ans:1 },
  { g:9,  s:'Science', t:'Ecology',               d:'Easy',   q:"A predator-prey relationship is an example of which ecological interaction?",                opts:["Mutualism","Commensalism","Predation","Parasitism"],                                        ans:2 },
  { g:9,  s:'Science', t:'Ecology',               d:'Medium', q:"The 10% rule in energy transfer means only 10% of energy passes between:",                   opts:["Cells","Trophic levels","Ecosystems","Populations"],                                        ans:1 },
  { g:9,  s:'Science', t:'Ecology',               d:'Hard',   q:"Eutrophication of a lake is most directly caused by:",                                       opts:["Acid rain","Excess nutrient runoff causing algal blooms","Overfishing","Sedimentation"],     ans:1 },
  { g:10, s:'Science', t:'Biotechnology',         d:'Medium', q:"PCR (Polymerase Chain Reaction) is used to:",                                                opts:["Sequence amino acids","Amplify a specific DNA segment","Separate proteins","Synthesize RNA"], ans:1 },
  { g:10, s:'Science', t:'Biotechnology',         d:'Hard',   q:"CRISPR-Cas9 is a biotechnology tool used for:",                                              opts:["Cloning organisms","Editing specific DNA sequences","Creating vaccines","Protein synthesis"], ans:1 },
  { g:10, s:'Science', t:'Human Biology',         d:'Medium', q:"The hormone insulin is produced in the:",                                                    opts:["Adrenal gland","Thyroid","Pancreas","Pituitary gland"],                                     ans:2 },
  { g:10, s:'Science', t:'Human Biology',         d:'Hard',   q:"The myelin sheath surrounding neurons functions to:",                                        opts:["Produce neurotransmitters","Insulate and speed up nerve impulses","Absorb excess signals","Regulate blood-brain barrier"], ans:1 },
  // – Chemistry –
  { g:9,  s:'Science', t:'Atomic Theory',         d:'Easy',   q:"The modern atomic model is known as the:",                                                   opts:["Plum pudding model","Bohr model","Dalton model","Quantum mechanical model"],                 ans:3 },
  { g:9,  s:'Science', t:'Atomic Theory',         d:'Medium', q:"The electron configuration of carbon (atomic number 6) is:",                                 opts:["2,2","2,4","2,6","4,2"],                                                                    ans:1 },
  { g:9,  s:'Science', t:'Chemical Bonding',      d:'Easy',   q:"A bond formed by sharing electrons between atoms is a:",                                     opts:["Ionic bond","Covalent bond","Metallic bond","Hydrogen bond"],                               ans:1 },
  { g:9,  s:'Science', t:'Chemical Bonding',      d:'Medium', q:"NaCl (table salt) is an ionic compound formed because Na gives an electron to Cl. The resulting Na⁺ ion has:", opts:["11 electrons","10 electrons","12 electrons","9 electrons"],         ans:1 },
  { g:9,  s:'Science', t:'Chemical Bonding',      d:'Hard',   q:"VSEPR theory is used to predict:",                                                           opts:["Bond energy","Reaction rates","Molecular shape","Polarity only"],                           ans:2 },
  { g:9,  s:'Science', t:'Reactions',             d:'Easy',   q:"In the reaction A + B → AB, this type of reaction is called:",                               opts:["Decomposition","Synthesis (combination)","Single displacement","Double displacement"],       ans:1 },
  { g:9,  s:'Science', t:'Reactions',             d:'Medium', q:"A reaction that releases energy to the surroundings is called:",                             opts:["Endothermic","Exothermic","Catalytic","Reversible"],                                        ans:1 },
  { g:9,  s:'Science', t:'Stoichiometry',         d:'Medium', q:"One mole of any substance contains approximately how many particles?",                       opts:["6.02 × 10²¹","6.02 × 10²³","6.02 × 10²⁵","3.01 × 10²³"],                                  ans:1 },
  { g:9,  s:'Science', t:'Stoichiometry',         d:'Hard',   q:"The molar mass of water (H₂O) is approximately:",                                           opts:["10 g/mol","16 g/mol","18 g/mol","20 g/mol"],                                               ans:2 },
  { g:10, s:'Science', t:'Solutions',             d:'Easy',   q:"Molarity is defined as moles of solute per:",                                                opts:["100 mL of solvent","1 kg of solvent","1 L of solution","1 L of solvent"],                   ans:2 },
  { g:10, s:'Science', t:'Solutions',             d:'Medium', q:"The pH of a neutral solution at 25°C is:",                                                   opts:["0","7","10","14"],                                                                          ans:1 },
  { g:10, s:'Science', t:'Solutions',             d:'Hard',   q:"Adding a catalyst to a reaction:",                                                           opts:["Increases the activation energy","Decreases the activation energy","Changes the overall energy","Shifts the equilibrium"], ans:1 },
  { g:10, s:'Science', t:'Organic Chemistry',     d:'Medium', q:"Hydrocarbons that contain only single bonds are called:",                                    opts:["Alkenes","Alkynes","Alkanes","Aromatics"],                                                  ans:2 },
  { g:10, s:'Science', t:'Organic Chemistry',     d:'Hard',   q:"Isomers are compounds that have the same molecular formula but:",                            opts:["Same structural formula","Different atomic masses","Different structural arrangements","Different elements"], ans:2 },
  // – Physics –
  { g:9,  s:'Science', t:'Kinematics',            d:'Easy',   q:"An object that speeds up has a(n) _____ acceleration.",                                      opts:["Negative","Positive","Zero","Undefined"],                                                   ans:1 },
  { g:9,  s:'Science', t:'Kinematics',            d:'Medium', q:"A car accelerates from rest at 3 m/s². Its speed after 4 seconds is:",                       opts:["7 m/s","12 m/s","16 m/s","24 m/s"],                                                        ans:1 },
  { g:9,  s:'Science', t:'Kinematics',            d:'Hard',   q:"A ball is thrown horizontally at 10 m/s and falls for 2 s. Its horizontal distance is:",     opts:["5 m","10 m","20 m","40 m"],                                                                ans:2 },
  { g:9,  s:'Science', t:'Dynamics',              d:'Medium', q:"The unit of force in the SI system is the:",                                                  opts:["Joule","Watt","Newton","Pascal"],                                                           ans:2 },
  { g:9,  s:'Science', t:'Dynamics',              d:'Hard',   q:"An object of mass 5 kg is pushed with a net force of 20 N. Its acceleration is:",            opts:["4 m/s²","10 m/s²","15 m/s²","100 m/s²"],                                                   ans:0 },
  { g:10, s:'Science', t:'Energy & Work',         d:'Easy',   q:"Work done on an object is calculated by:",                                                   opts:["W = m/a","W = F × d (in direction of force)","W = ½mv²","W = mgh"],                        ans:1 },
  { g:10, s:'Science', t:'Energy & Work',         d:'Medium', q:"A 2 kg object moving at 6 m/s has kinetic energy of:",                                       opts:["6 J","12 J","36 J","72 J"],                                                                ans:2 },
  { g:10, s:'Science', t:'Waves & Electricity',   d:'Medium', q:"The formula relating wave speed, frequency, and wavelength is:",                             opts:["v = fλ","v = f/λ","v = λ/f","v = f²λ"],                                                    ans:0 },
  { g:10, s:'Science', t:'Waves & Electricity',   d:'Hard',   q:"A circuit has two 4Ω resistors in parallel. The total resistance is:",                       opts:["8Ω","4Ω","2Ω","1Ω"],                                                                       ans:2 },
  // – Earth & Environmental Science –
  { g:9,  s:'Science', t:'Plate Tectonics',       d:'Easy',   q:"New oceanic crust is created at:",                                                          opts:["Subduction zones","Divergent plate boundaries","Transform faults","Hot spots only"],         ans:1 },
  { g:9,  s:'Science', t:'Plate Tectonics',       d:'Medium', q:"When oceanic crust collides with continental crust, the oceanic crust sinks because it is:", opts:["Thinner","Less dense","Denser and heavier","Older"],                                        ans:2 },
  { g:9,  s:'Science', t:'Climate',               d:'Medium', q:"The greenhouse effect is caused by gases that:",                                             opts:["Block all sunlight","Absorb and re-emit infrared radiation","Reflect UV rays","Cool the atmosphere"], ans:1 },
  { g:10, s:'Science', t:'Climate Change',        d:'Medium', q:"Human activities contribute to climate change primarily through:",                           opts:["Volcanic eruptions","Burning fossil fuels and deforestation","Solar cycles","Tidal changes"], ans:1 },
  { g:10, s:'Science', t:'Climate Change',        d:'Hard',   q:"Positive feedback loops in climate science tend to:",                                       opts:["Stabilize the climate","Amplify the initial change","Reduce greenhouse gases","Reverse warming"], ans:1 },
  { g:10, s:'Science', t:'Astronomy',             d:'Easy',   q:"A light-year is a measure of:",                                                              opts:["Time","Distance","Speed","Brightness"],                                                     ans:1 },
  { g:10, s:'Science', t:'Astronomy',             d:'Medium', q:"The Big Bang theory states that the universe began approximately:",                          opts:["4.6 billion years ago","10 billion years ago","13.8 billion years ago","100 billion years ago"], ans:2 },
  { g:10, s:'Science', t:'Astronomy',             d:'Hard',   q:"Stars generate energy through:",                                                             opts:["Chemical combustion","Nuclear fission","Nuclear fusion","Gravitational collapse"],           ans:2 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── HISTORY Grades 9 & 10 (75 questions) ────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // – World War II –
  { g:9,  s:'History', t:'World War II',           d:'Easy',   q:"World War II began in Europe when Germany invaded which country in 1939?",                  opts:["France","Poland","Belgium","USSR"],                                                         ans:1 },
  { g:9,  s:'History', t:'World War II',           d:'Easy',   q:"The Allied leaders who met at Yalta (1945) included Roosevelt, Churchill, and:",            opts:["Hitler","Stalin","Mussolini","Hirohito"],                                                   ans:1 },
  { g:9,  s:'History', t:'World War II',           d:'Medium', q:"The Holocaust was the systematic genocide of approximately _____ million Jews by Nazi Germany.", opts:["1","3","6","12"],                                                                       ans:2 },
  { g:9,  s:'History', t:'World War II',           d:'Medium', q:"Operation Overlord (D-Day) on June 6, 1944 was the Allied invasion of:",                    opts:["Italy","North Africa","Normandy, France","Southern Germany"],                               ans:2 },
  { g:9,  s:'History', t:'World War II',           d:'Hard',   q:"The Manhattan Project's result — atomic bombs dropped on Japan — caused Japan to:",         opts:["Intensify fighting","Surrender in August 1945","Retreat to China","Seek Soviet help"],       ans:1 },
  { g:9,  s:'History', t:'Holocaust',              d:'Medium', q:"The Nuremberg Trials (1945–46) established the precedent that:",                             opts:["Only generals could be tried","Individuals could be held accountable for crimes against humanity","No wartime actions were illegal","Civilian trials were unnecessary"], ans:1 },
  { g:9,  s:'History', t:'Holocaust',              d:'Hard',   q:"The Wannsee Conference (January 1942) was a Nazi meeting that coordinated the:",             opts:["D-Day response","Final Solution — systematic extermination of Jews","Invasion of USSR","Creation of the SS"], ans:1 },
  // – Cold War –
  { g:9,  s:'History', t:'Cold War',               d:'Easy',   q:"The Cold War was primarily a conflict between the USA and:",                                opts:["Germany","China","USSR","Japan"],                                                           ans:2 },
  { g:9,  s:'History', t:'Cold War',               d:'Easy',   q:"The 1961 construction of the Berlin Wall was meant to:",                                    opts:["Protect East Berlin from flooding","Stop East Germans fleeing to the West","Celebrate communist victory","Divide West Berlin"], ans:1 },
  { g:9,  s:'History', t:'Cold War',               d:'Medium', q:"The Cuban Missile Crisis (1962) was resolved when the Soviet Union agreed to remove missiles from Cuba in exchange for:", opts:["US invasion of Cuba","US pledge not to invade Cuba and removal of US missiles from Turkey","Economic aid","Recognition of Castro's government"], ans:1 },
  { g:9,  s:'History', t:'Cold War',               d:'Hard',   q:"The policy of Mutually Assured Destruction (MAD) during the Cold War meant that:",         opts:["Only one side could win a nuclear war","Any nuclear attack would result in total destruction of both sides","Nuclear weapons were purely defensive","The US had more bombs"], ans:1 },
  { g:10, s:'History', t:'Cold War',               d:'Medium', q:"The Marshall Plan (1948) was a US program to provide economic aid to:",                     opts:["Asian nations","War-devastated European nations","Latin American dictatorships","African colonies"], ans:1 },
  { g:10, s:'History', t:'Cold War',               d:'Hard',   q:"The 1956 Hungarian Revolution failed because:",                                             opts:["Hungarian forces were too weak","NATO intervened","The USSR crushed it militarily while the West did not intervene","Hungary surrendered voluntarily"], ans:2 },
  // – Civil Rights & Social Movements –
  { g:9,  s:'History', t:'Civil Rights',            d:'Easy',   q:"Rosa Parks is known for:",                                                                 opts:["Leading the March on Washington","Refusing to give up her seat on a segregated bus in 1955","Writing 'I Have a Dream'","Founding the NAACP"],            ans:1 },
  { g:9,  s:'History', t:'Civil Rights',            d:'Medium', q:"The Civil Rights Act of 1964 made it illegal to discriminate based on race, color, religion, sex, or:", opts:["Age","National origin","Sexual orientation","Disability"],                               ans:1 },
  { g:9,  s:'History', t:'Civil Rights',            d:'Hard',   q:"The strategy of nonviolent direct action used by the Civil Rights Movement was inspired partly by:", opts:["Marcus Garvey","Karl Marx","Mahatma Gandhi","Booker T. Washington"],                        ans:2 },
  { g:10, s:'History', t:'Women\'s Rights',         d:'Medium', q:"The 19th Amendment to the US Constitution (1920) granted women:",                          opts:["Equal pay","The right to vote","The right to own property","Access to public education"],    ans:1 },
  { g:10, s:'History', t:'Decolonization',          d:'Medium', q:"After WWII, Indian independence from Britain in 1947 was led by:",                         opts:["Jawaharlal Nehru","Mahatma Gandhi","Both A and B","Muhammad Ali Jinnah"],                   ans:2 },
  { g:10, s:'History', t:'Decolonization',          d:'Hard',   q:"The apartheid system in South Africa was characterized by:",                                opts:["Voluntary racial segregation","State-enforced racial discrimination and oppression","Separate economic systems","Religious segregation"], ans:1 },
  // – Canadian History –
  { g:9,  s:'History', t:'Canadian History',        d:'Easy',   q:"Canada became a fully independent country with its own constitution in:",                   opts:["1867","1931","1945","1982"],                                                                ans:3 },
  { g:9,  s:'History', t:'Canadian History',        d:'Medium', q:"The Indian Act of 1876 was controversial because it:",                                     opts:["Gave Indigenous peoples more land","Imposed control over Indigenous peoples, restricting rights and culture","Created reserves as autonomous regions","Established treaties favoring First Nations"], ans:1 },
  { g:9,  s:'History', t:'Canadian History',        d:'Hard',   q:"Residential schools in Canada aimed to:",                                                  opts:["Provide quality education to Indigenous children","Forcibly assimilate Indigenous children by removing them from their families and culture","Teach Indigenous languages","Create bilingual education"], ans:1 },
  { g:10, s:'History', t:'Canadian History',        d:'Medium', q:"The Quiet Revolution in Quebec during the 1960s led to:",                                  opts:["Quebec separation from Canada","Secularization, modernization, and rise of Quebec nationalism","Language laws banning English","US annexation of Quebec"], ans:1 },
  { g:10, s:'History', t:'Canadian History',        d:'Hard',   q:"The 1988 Multiculturalism Act was significant because it:",                                opts:["Made Canada officially bilingual","Made Canada the first country to adopt multiculturalism as official government policy","Required immigrants to learn French","Banned racial discrimination in employment"], ans:1 },
  // – Modern World History –
  { g:9,  s:'History', t:'Russian Revolution',      d:'Medium', q:"The Bolshevik Revolution of October 1917 brought which leader to power in Russia?",        opts:["Tsar Nicholas II","Leon Trotsky","Vladimir Lenin","Joseph Stalin"],                           ans:2 },
  { g:9,  s:'History', t:'Russian Revolution',      d:'Hard',   q:"The Treaty of Brest-Litovsk (1918) was significant because it:",                           opts:["Ended WWII","Took Russia out of WWI under harsh terms agreed with Germany","United the Bolsheviks and Mensheviks","Created the Soviet Union"], ans:1 },
  { g:10, s:'History', t:'United Nations',          d:'Easy',   q:"The United Nations was founded in:",                                                       opts:["1919","1939","1945","1948"],                                                                ans:2 },
  { g:10, s:'History', t:'United Nations',          d:'Medium', q:"The UN Universal Declaration of Human Rights (1948) proclaimed that human rights are:",    opts:["Granted by governments","Earned through citizenship","Universal and inalienable","Only applicable in democratic nations"], ans:2 },
  { g:10, s:'History', t:'Genocide & Memory',       d:'Hard',   q:"The Rwandan Genocide (1994) resulted in the deaths of approximately _____ people in 100 days.", opts:["5,000","50,000","500,000","800,000"],                                                    ans:3 },
  { g:10, s:'History', t:'Globalization',           d:'Medium', q:"The World Trade Organization (WTO) was established to:",                                    opts:["Enforce human rights","Regulate international trade rules","Provide development loans","Coordinate military alliances"], ans:1 },
  { g:9,  s:'History', t:'WWI',                     d:'Hard',   q:"The term 'total war' in WWI refers to:",                                                   opts:["Only fighting on one front","Mobilization of entire societies — economies, civilians, and industries — for the war effort","Wars fought without rules","Wars with nuclear weapons"], ans:1 },
  { g:10, s:'History', t:'Post-WWII',               d:'Medium', q:"The Truman Doctrine (1947) pledged US support to countries threatened by:",                opts:["Poverty","Communism","Fascism","Natural disasters"],                                        ans:1 },
  // – Additional Breadth –
  { g:9,  s:'History', t:'Interwar Period',         d:'Medium', q:"The Great Depression of the 1930s led to the rise of extremist governments partly because:", opts:["Democracies were too strong","Economic hardship made people desperate and susceptible to radical ideologies","Trade increased","The League of Nations was effective"], ans:1 },
  { g:9,  s:'History', t:'Propaganda',              d:'Medium', q:"Totalitarian regimes in the 20th century used propaganda to:",                             opts:["Encourage free thought","Control public opinion and justify government policies","Promote international trade","Support democracy"], ans:1 },
  { g:10, s:'History', t:'Technology & History',    d:'Easy',   q:"The Internet was initially developed as:",                                                 opts:["A social media platform","A US military communication network (ARPANET)","A commercial telephone system","A broadcasting network"], ans:1 },
  { g:10, s:'History', t:'Technology & History',    d:'Medium', q:"The Space Race was a competition during the Cold War primarily between the:",               opts:["USA and China","USA and USSR","USSR and UK","NATO and the Warsaw Pact"],                     ans:1 },
  { g:9,  s:'History', t:'Imperialism',             d:'Hard',   q:"The Berlin Conference of 1884–1885 was significant because:",                              opts:["It ended WWI","European powers partitioned Africa among themselves without African input","It created the first African nation-states","It ended slavery"], ans:1 },
  { g:10, s:'History', t:'Imperialism',             d:'Medium', q:"The primary economic motivation for European colonialism was to:",                          opts:["Spread democracy","Acquire raw materials and markets for European industries","Provide land for overcrowded cities","Share Western culture"], ans:1 },
  { g:9,  s:'History', t:'World History',           d:'Medium', q:"The Meiji Restoration in Japan (1868) transformed Japan by:",                              opts:["Restoring feudalism","Modernizing rapidly using Western industrial and political models","Isolating Japan from world trade","Expanding its empire into China only"], ans:1 },
  { g:10, s:'History', t:'World History',           d:'Easy',   q:"Mao Zedong led the founding of the People's Republic of China in:",                       opts:["1937","1945","1949","1966"],                                                                ans:2 },
  { g:9,  s:'History', t:'Media & History',         d:'Easy',   q:"A primary source is:",                                                                    opts:["A textbook about history","A source created during the time period being studied","A secondary analysis","A documentary film"],                                 ans:1 },
  { g:10, s:'History', t:'Historical Thinking',     d:'Medium', q:"Historical bias refers to:",                                                               opts:["Factual errors in documents","One-sided perspectives shaped by a creator's background and motives","Missing pages from a document","Language barriers"], ans:1 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── GEOGRAPHY Grades 9 & 10 (75 questions) ──────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // – Physical Geography –
  { g:9,  s:'Geography', t:'Tectonic Processes',    d:'Easy',   q:"Volcanoes most commonly form at:",                                                         opts:["Constructive and destructive plate boundaries","Only hot spots","Only transform faults","Only underwater"], ans:0 },
  { g:9,  s:'Geography', t:'Tectonic Processes',    d:'Medium', q:"A tsunami is most commonly triggered by:",                                                 opts:["Hurricanes","Undersea earthquakes or volcanic eruptions","Coastal erosion","Heavy rainfall"],  ans:1 },
  { g:9,  s:'Geography', t:'Tectonic Processes',    d:'Hard',   q:"The Richter scale measures earthquake magnitude on a _____ scale.",                        opts:["Linear","Quadratic","Logarithmic","Exponential (base 2)"],                                  ans:2 },
  { g:9,  s:'Geography', t:'Weathering & Erosion',  d:'Easy',   q:"Mechanical weathering breaks rock apart without changing its:",                            opts:["Shape","Size","Chemical composition","Color"],                                              ans:2 },
  { g:9,  s:'Geography', t:'Weathering & Erosion',  d:'Medium', q:"Acid rain is a form of _____ weathering that reacts with and dissolves rock.",             opts:["Mechanical","Freeze-thaw","Chemical","Biological"],                                          ans:2 },
  { g:9,  s:'Geography', t:'Rivers',                d:'Medium', q:"The lower course of a river typically has:",                                               opts:["V-shaped valleys and rapids","Wide flat floodplains and meanders","Steep waterfalls","Glacial moraines"],   ans:1 },
  { g:10, s:'Geography', t:'Glaciation',            d:'Medium', q:"A cirque is a glacial landform that resembles a:",                                         opts:["Long narrow valley","Bowl-shaped depression in a mountainside","Moraine ridge","Outwash plain"], ans:1 },
  { g:10, s:'Geography', t:'Coasts',                d:'Easy',   q:"Coastal erosion features include headlands, cliffs, and:",                                 opts:["Moraines","Sea stacks and arches","Deltas","Fjords only"],                                   ans:1 },
  { g:10, s:'Geography', t:'Coasts',                d:'Hard',   q:"A beach is formed by the deposition of sediment moved by:",                               opts:["Wind only","Longshore drift and wave action","River action only","Glaciers"],                ans:1 },
  { g:9,  s:'Geography', t:'Climate Systems',       d:'Medium', q:"The Coriolis effect causes winds in the Northern Hemisphere to deflect:",                  opts:["To the left","To the right","Straight up","Downward"],                                       ans:1 },
  { g:9,  s:'Geography', t:'Climate Systems',       d:'Hard',   q:"El Niño is caused by a weakening of trade winds that allows warm Pacific water to move:",  opts:["Westward","Northward","Eastward toward South America","Into the Indian Ocean"],              ans:2 },
  { g:10, s:'Geography', t:'Soils & Ecosystems',    d:'Medium', q:"Permafrost is found in which biome?",                                                     opts:["Tropical rainforest","Savanna","Tundra","Temperate forest"],                                ans:2 },
  // – Human Geography –
  { g:9,  s:'Geography', t:'Population',            d:'Easy',   q:"The Demographic Transition Model shows that as countries develop, birth rates:",           opts:["Increase then stabilize","Stay constant","Decline","Always remain high"],                   ans:2 },
  { g:9,  s:'Geography', t:'Population',            d:'Medium', q:"A population pyramid with a wide base indicates a population that is:",                    opts:["Aging","Declining","Rapidly growing","Stable"],                                             ans:2 },
  { g:9,  s:'Geography', t:'Population',            d:'Hard',   q:"Push factors in migration include all EXCEPT:",                                            opts:["War and conflict","Famine","Job opportunities in destination","Environmental disasters"],     ans:2 },
  { g:9,  s:'Geography', t:'Urbanization',          d:'Easy',   q:"Urbanization refers to the growth of:",                                                   opts:["Farms","Cities and towns","Transport networks","Industry only"],                             ans:1 },
  { g:9,  s:'Geography', t:'Urbanization',          d:'Medium', q:"A megacity is a city with a population of at least:",                                     opts:["1 million","5 million","10 million","50 million"],                                          ans:2 },
  { g:9,  s:'Geography', t:'Urbanization',          d:'Hard',   q:"Urban heat islands form because:",                                                        opts:["Cities are closer to the sun","Dark surfaces and lack of vegetation in cities absorb more heat","Air conditioning raises temperatures","Water evaporation is greater in cities"], ans:1 },
  { g:10, s:'Geography', t:'Rural Settlements',     d:'Medium', q:"Dispersed rural settlement patterns are common where:",                                    opts:["Water is scarce","Farmland is abundant and individual farms are spread out","Climate is harsh","Mountains are present"], ans:1 },
  // – Economic Geography –
  { g:9,  s:'Geography', t:'Economic Development',  d:'Easy',   q:"HDI (Human Development Index) measures a country's development using:",                    opts:["GDP only","Military strength","Life expectancy, education, and income","Population size"],   ans:2 },
  { g:9,  s:'Geography', t:'Economic Development',  d:'Medium', q:"Primary industries involve:",                                                              opts:["Manufacturing goods in factories","Extracting raw resources from the environment","Providing services","Selling finished products"], ans:1 },
  { g:9,  s:'Geography', t:'Economic Development',  d:'Hard',   q:"The concept of 'fair trade' aims to:",                                                    opts:["Eliminate international trade","Ensure producers in developing nations receive fair prices","Reduce imports in wealthy nations","Standardize global prices"], ans:1 },
  { g:10, s:'Geography', t:'Trade',                 d:'Medium', q:"A trade deficit occurs when a country:",                                                   opts:["Exports more than it imports","Imports more than it exports","Trades equally","Refuses trade agreements"], ans:1 },
  { g:10, s:'Geography', t:'Trade',                 d:'Hard',   q:"Comparative advantage suggests countries should specialize in producing goods where they:", opts:["Have absolute best efficiency","Have the lowest opportunity cost","Have the most workers","Have the most technology"], ans:1 },
  { g:10, s:'Geography', t:'Globalization',         d:'Easy',   q:"Transnational corporations (TNCs) are companies that:",                                    opts:["Only operate in one country","Operate in multiple countries","Are government-owned","Only operate in cities"], ans:1 },
  { g:10, s:'Geography', t:'Globalization',         d:'Medium', q:"Outsourcing manufacturing to developing nations is driven mainly by:",                     opts:["Better climate","Lower labour costs","Higher quality materials","Cultural exchange"],         ans:1 },
  { g:10, s:'Geography', t:'Globalization',         d:'Hard',   q:"The 'global village' concept, coined by Marshall McLuhan, describes how:",                 opts:["Rural areas are growing","Modern communications technology has made the world more interconnected","Nations are losing their identities","Cities are becoming rural"], ans:1 },
  // – Environmental Geography –
  { g:9,  s:'Geography', t:'Environment',           d:'Easy',   q:"Deforestation has the direct environmental consequence of:",                               opts:["Increasing biodiversity","Reducing CO₂ absorption and causing habitat loss","Cooling the climate","Stabilizing soil"], ans:1 },
  { g:9,  s:'Geography', t:'Environment',           d:'Medium', q:"The ozone layer protects life on Earth by absorbing:",                                     opts:["Infrared radiation","Ultraviolet radiation","Carbon dioxide","Visible light"],               ans:1 },
  { g:9,  s:'Geography', t:'Environment',           d:'Hard',   q:"Desertification is the process by which:",                                                 opts:["Deserts produce more rainfall","Fertile land becomes increasingly arid due to climate and human activity","Coastal areas become deserts","Sand dunes form in cities"], ans:1 },
  { g:10, s:'Geography', t:'Sustainability',        d:'Medium', q:"The three pillars of sustainable development are environmental, social, and:",             opts:["Political","Economic","Cultural","Technological"],                                          ans:1 },
  { g:10, s:'Geography', t:'Sustainability',        d:'Hard',   q:"Carbon offsetting involves:",                                                              opts:["Reducing all carbon emissions to zero immediately","Compensating for carbon emissions by funding equivalent reductions elsewhere","Taxing carbon producers","Capturing CO₂ from the air only"], ans:1 },
  // – Political & Cultural Geography –
  { g:9,  s:'Geography', t:'Political Geography',   d:'Easy',   q:"A buffer zone is a geographic area that:",                                                 opts:["Contains the most resources","Separates two rival regions to reduce conflict","Contains the largest cities","Is always uninhabited"], ans:1 },
  { g:10, s:'Geography', t:'Political Geography',   d:'Medium', q:"A landlocked country is one that:",                                                        opts:["Is surrounded by water","Has no access to the sea","Has only rivers","Is an island nation"], ans:1 },
  { g:10, s:'Geography', t:'Political Geography',   d:'Hard',   q:"Gerrymandering refers to:",                                                               opts:["Redrawing electoral boundaries to favour a particular party","Colonizing new territories","Creating trade barriers","Relocating government offices"], ans:1 },
  { g:9,  s:'Geography', t:'Cultural Geography',    d:'Easy',   q:"A cultural hearth is a place where:",                                                     opts:["Cultural traditions are lost","Significant cultural developments originated and spread","People speak the most languages","Only one religion is practised"], ans:1 },
  { g:10, s:'Geography', t:'Cultural Geography',    d:'Medium', q:"Cultural diffusion is the process by which:",                                              opts:["Languages die out","Cultural elements spread from one society to another","Cultures become isolated","Governments change"], ans:1 },
  // – Canadian & North American Geography –
  { g:9,  s:'Geography', t:'Canada',                d:'Easy',   q:"The Canadian Shield is characterized by:",                                                 opts:["Rich farmland","Ancient rock, lakes, and boreal forest","High mountain ranges","Tropical forests"], ans:1 },
  { g:9,  s:'Geography', t:'Canada',                d:'Medium', q:"The St. Lawrence Seaway connects the Great Lakes to:",                                     opts:["Hudson Bay","The Pacific Ocean","The Atlantic Ocean","The Mississippi River"],               ans:2 },
  { g:10, s:'Geography', t:'Canada',                d:'Hard',   q:"Alberta's economy is heavily dependent on which resource sector?",                         opts:["Fishing","Forestry","Oil and natural gas (petroleum)","Mining for gold"],                   ans:2 },
  { g:9,  s:'Geography', t:'World Regions',         d:'Medium', q:"The Ring of Fire is associated with high frequency of volcanic activity around the:",      opts:["Atlantic Ocean","Indian Ocean","Arctic Ocean","Pacific Ocean"],                              ans:3 },
  { g:10, s:'Geography', t:'World Regions',         d:'Easy',   q:"Which continent has the highest number of countries?",                                     opts:["Asia","South America","Europe","Africa"],                                                   ans:3 },
  { g:10, s:'Geography', t:'World Regions',         d:'Medium', q:"The Sahel region of Africa is characterized by:",                                         opts:["Dense tropical rainforest","A semi-arid zone prone to drought and desertification","Fertile plains","Coastal wetlands"], ans:1 },
  { g:9,  s:'Geography', t:'Energy',                d:'Medium', q:"Hydroelectric power generates electricity using:",                                         opts:["Wind","Flowing water turning turbines","Solar panels","Nuclear fission"],                    ans:1 },
  { g:10, s:'Geography', t:'Energy',                d:'Hard',   q:"Which energy source currently provides the largest share of global electricity?",          opts:["Solar","Wind","Coal","Nuclear"],                                                            ans:2 },

  // ════════════════════════════════════════════════════════════════════════════
  // ── MATH Grades 9 & 10 (75 questions) ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  // – Algebra –
  { g:9,  s:'Math', t:'Linear Equations',          d:'Easy',   q:"Solve for x: 3x − 7 = 11",                                                                 opts:["x = 3","x = 6","x = 4","x = 2"],                                                           ans:1 },
  { g:9,  s:'Math', t:'Linear Equations',          d:'Medium', q:"Find the slope of the line through (2, 3) and (6, 11):",                                   opts:["1","2","3","4"],                                                                            ans:1 },
  { g:9,  s:'Math', t:'Linear Equations',          d:'Hard',   q:"The equation of a line with slope −3 passing through (0, 5) is:",                          opts:["y = 3x + 5","y = −3x − 5","y = −3x + 5","y = 5x − 3"],                                    ans:2 },
  { g:9,  s:'Math', t:'Systems of Equations',      d:'Medium', q:"By substitution, solve: y = 2x and x + y = 9. Find x:",                                   opts:["x = 2","x = 3","x = 4","x = 5"],                                                           ans:1 },
  { g:9,  s:'Math', t:'Systems of Equations',      d:'Hard',   q:"Solve by elimination: 2x + y = 8 and x − y = 1. What is y?",                              opts:["y = 1","y = 2","y = 3","y = 4"],                                                           ans:1 },
  { g:9,  s:'Math', t:'Polynomials',               d:'Easy',   q:"Expand: (x + 3)(x + 2) = ?",                                                               opts:["x² + 5x + 5","x² + 5x + 6","x² + 6x + 5","x² + 6x + 6"],                                ans:1 },
  { g:9,  s:'Math', t:'Polynomials',               d:'Medium', q:"Factor completely: x² − x − 6",                                                            opts:["(x + 2)(x − 3)","(x − 2)(x + 3)","(x − 2)(x − 3)","(x + 2)(x + 3)"],                     ans:0 },
  { g:9,  s:'Math', t:'Polynomials',               d:'Hard',   q:"Expand: (2x − 1)²",                                                                        opts:["4x² − 4x + 1","4x² + 1","4x² − 1","2x² − 4x + 1"],                                       ans:0 },
  { g:9,  s:'Math', t:'Inequalities',              d:'Easy',   q:"Solve: 2x + 1 > 7. The solution is:",                                                      opts:["x < 3","x > 3","x < 4","x > 4"],                                                           ans:1 },
  { g:9,  s:'Math', t:'Inequalities',              d:'Medium', q:"The solution to −3x ≤ 9 is:",                                                              opts:["x ≤ 3","x ≥ −3","x ≤ −3","x ≥ 3"],                                                        ans:1 },
  // – Quadratics –
  { g:10, s:'Math', t:'Quadratics',                d:'Easy',   q:"The vertex form of a quadratic is y = a(x − h)² + k. The vertex is at:",                   opts:["(a, k)","(h, k)","(k, h)","(h, a)"],                                                       ans:1 },
  { g:10, s:'Math', t:'Quadratics',                d:'Medium', q:"The quadratic formula is x = (−b ± √(b²−4ac)) / 2a. For x²−5x+6=0, the solutions are:",  opts:["x = 1, 6","x = 2, 3","x = −2, −3","x = 1, −6"],                                           ans:1 },
  { g:10, s:'Math', t:'Quadratics',                d:'Medium', q:"The discriminant b² − 4ac < 0 means the quadratic has:",                                   opts:["Two real roots","One real root","No real roots","Infinite roots"],                          ans:2 },
  { g:10, s:'Math', t:'Quadratics',                d:'Hard',   q:"Complete the square: x² + 6x + 5 = 0. The vertex form is:",                                opts:["(x+3)² − 4 = 0","(x+3)² + 4 = 0","(x−3)² − 4 = 0","(x+6)² − 5 = 0"],                   ans:0 },
  // – Geometry –
  { g:9,  s:'Math', t:'Geometry',                  d:'Easy',   q:"The sum of interior angles of a triangle is always:",                                       opts:["90°","180°","270°","360°"],                                                                 ans:1 },
  { g:9,  s:'Math', t:'Geometry',                  d:'Easy',   q:"Two triangles are similar if their corresponding angles are equal and their sides are:",    opts:["Equal","Proportional","Parallel","Perpendicular"],                                           ans:1 },
  { g:9,  s:'Math', t:'Geometry',                  d:'Medium', q:"The sum of interior angles of a hexagon is:",                                               opts:["540°","720°","900°","1080°"],                                                               ans:1 },
  { g:9,  s:'Math', t:'Geometry',                  d:'Hard',   q:"In a circle, a tangent line meets the radius at:",                                          opts:["45°","60°","90°","180°"],                                                                   ans:2 },
  { g:10, s:'Math', t:'Geometry',                  d:'Medium', q:"The area of a circle with radius 5 (π ≈ 3.14) is approximately:",                           opts:["15.7","31.4","78.5","157"],                                                                 ans:2 },
  { g:10, s:'Math', t:'Geometry',                  d:'Hard',   q:"The volume of a sphere with radius 3 (π ≈ 3.14) is approximately:",                         opts:["28.3","56.5","113.1","150.7"],                                                              ans:2 },
  // – Trigonometry –
  { g:9,  s:'Math', t:'Trigonometry',              d:'Easy',   q:"In a right triangle, sin(θ) = opposite / hypotenuse. If opposite = 3, hypotenuse = 5, sin(θ) = ", opts:["3/4","3/5","4/5","5/3"],                                                           ans:1 },
  { g:9,  s:'Math', t:'Trigonometry',              d:'Medium', q:"The cosine of 60° equals:",                                                                 opts:["√3/2","1/2","√2/2","1"],                                                                   ans:1 },
  { g:9,  s:'Math', t:'Trigonometry',              d:'Medium', q:"Using SOH-CAH-TOA, tan(θ) = 1 when θ =",                                                   opts:["30°","45°","60°","90°"],                                                                   ans:1 },
  { g:9,  s:'Math', t:'Trigonometry',              d:'Hard',   q:"In a right triangle with adjacent = 7 and hypotenuse = 25, cos(θ) = 7/25. Find the opposite side:", opts:["18","24","20","14"],                                                               ans:1 },
  { g:10, s:'Math', t:'Trigonometry',              d:'Medium', q:"The Law of Cosines c² = a² + b² − 2ab·cos(C) is used when you know:",                     opts:["Two angles and a side","Two sides and the included angle","Three angles","Two angles only"], ans:1 },
  { g:10, s:'Math', t:'Trigonometry',              d:'Hard',   q:"sin(30°) + cos(60°) = ?",                                                                  opts:["0","1/2","1","√2"],                                                                        ans:2 },
  // – Statistics & Data –
  { g:9,  s:'Math', t:'Statistics',                d:'Easy',   q:"A scatter plot showing data that rises left to right has a _____ correlation.",             opts:["Negative","Zero","Positive","Inverse"],                                                     ans:2 },
  { g:9,  s:'Math', t:'Statistics',                d:'Medium', q:"The range of the data set {3, 7, 8, 12, 15} is:",                                           opts:["8","10","12","15"],                                                                         ans:2 },
  { g:9,  s:'Math', t:'Statistics',                d:'Hard',   q:"Standard deviation measures:",                                                              opts:["The average of data","The middle value","How spread out data is from the mean","The most common value"], ans:2 },
  { g:10, s:'Math', t:'Statistics',                d:'Medium', q:"In a normal distribution, approximately 68% of data falls within:",                         opts:["1 standard deviation of the mean","2 standard deviations","The median","The mode range"],  ans:0 },
  { g:10, s:'Math', t:'Statistics',                d:'Hard',   q:"Correlation does NOT imply:",                                                               opts:["A relationship","Causation","Pattern","Trend"],                                             ans:1 },
  // – Functions –
  { g:9,  s:'Math', t:'Functions',                 d:'Easy',   q:"A function is a relation where every input has:",                                           opts:["Multiple outputs","Exactly one output","No output","At least two outputs"],                 ans:1 },
  { g:9,  s:'Math', t:'Functions',                 d:'Medium', q:"For f(x) = x² − 3, what is f(−2)?",                                                       opts:["1","7","−7","−1"],                                                                          ans:0 },
  { g:9,  s:'Math', t:'Functions',                 d:'Hard',   q:"The inverse of f(x) = 2x + 4 is:",                                                         opts:["f⁻¹(x) = 2x − 4","f⁻¹(x) = x/2 − 2","f⁻¹(x) = (x−4)/2","f⁻¹(x) = x − 4"],             ans:1 },
  { g:10, s:'Math', t:'Functions',                 d:'Medium', q:"The domain of f(x) = √(x − 3) is:",                                                       opts:["x ≥ 0","x ≤ 3","x ≥ 3","All real numbers"],                                                ans:2 },
  { g:10, s:'Math', t:'Functions',                 d:'Hard',   q:"An exponential function of the form f(x) = 2ˣ has a y-intercept of:",                      opts:["0","1","2","Undefined"],                                                                    ans:1 },
  // – Financial Math –
  { g:10, s:'Math', t:'Financial Math',            d:'Easy',   q:"Simple interest on $500 at 4% per year for 3 years is:",                                   opts:["$40","$60","$80","$120"],                                                                   ans:1 },
  { g:10, s:'Math', t:'Financial Math',            d:'Medium', q:"The compound interest formula is A = P(1 + r/n)^(nt). If P = $1000, r = 5%, n = 1, t = 2, A = ?", opts:["$1050","$1100","$1102.50","$1200"],                                                    ans:2 },
  { g:10, s:'Math', t:'Financial Math',            d:'Hard',   q:"$2000 is invested at 6% compounded monthly. The monthly rate used in the formula is:",     opts:["6%","3%","0.5%","0.6%"],                                                                   ans:2 },
  { g:9,  s:'Math', t:'Financial Math',            d:'Easy',   q:"If you earn $800/month and pay 30% in taxes, your take-home pay is:",                       opts:["$240","$560","$600","$640"],                                                                ans:1 },
  { g:9,  s:'Math', t:'Financial Math',            d:'Medium', q:"A jacket costs $120 and is on sale for 25% off. The sale price is:",                       opts:["$30","$90","$95","$100"],                                                                   ans:1 },
  // – Exponents & Radicals –
  { g:9,  s:'Math', t:'Exponents',                 d:'Easy',   q:"x⁰ = ? (for any non-zero x)",                                                              opts:["0","x","1","Undefined"],                                                                   ans:2 },
  { g:9,  s:'Math', t:'Exponents',                 d:'Medium', q:"Simplify: (3x²)(4x³) = ?",                                                                 opts:["7x⁵","12x⁵","12x⁶","7x⁶"],                                                                ans:1 },
  { g:9,  s:'Math', t:'Exponents',                 d:'Hard',   q:"Simplify: (x³)⁻² = ?",                                                                     opts:["x⁶","x⁻⁶","x⁻⁵","1/x⁶"],                                                                 ans:3 },
  { g:10, s:'Math', t:'Radicals',                  d:'Medium', q:"Simplify: √50 = ?",                                                                        opts:["5√2","5√10","10√5","25√2"],                                                                ans:0 },
  { g:10, s:'Math', t:'Radicals',                  d:'Hard',   q:"Rationalize the denominator: 1/√3 = ?",                                                   opts:["√3","√3/3","3/√3","1/3"],                                                                  ans:1 },
];


// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SUBJECTS: Subject[] = ['Science', 'History', 'Geography', 'Math'];
const GRADES: Grade[] = [5, 6, 7, 8, 9, 10];
const DIFF_TIMER: Record<Diff, number> = { Easy: 15, Medium: 20, Hard: 25 };
const DIFF_PTS: Record<Diff, number> = { Easy: 100, Medium: 200, Hard: 300 };
const SUBJECT_COLOR: Record<Subject, string> = {
  Science: '#3b82f6', History: '#f59e0b', Geography: '#22c55e', Math: '#a855f7',
};
const SUBJECT_BG: Record<Subject, string> = {
  Science: 'rgba(59,130,246,0.15)', History: 'rgba(245,158,11,0.15)',
  Geography: 'rgba(34,197,94,0.15)', Math: 'rgba(168,85,247,0.15)',
};
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const PLAYER_LABELS = ['🔴 P1', '🔵 P2', '🟢 P3', '🟡 P4'];

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Mode = 'menu' | 'setup' | 'lobby' | 'question' | 'reveal' | 'results';

interface Player {
  name: string;
  score: number;
  streak: number;
  correct: number;
  total: number;
}

interface GameState {
  mode: Mode;
  isSolo: boolean;
  players: Player[];
  questions: Q[];
  qIdx: number;
  timeLeft: number;
  maxTime: number;
  answers: (number | null)[]; // per player, index of chosen option or null
  answerTimes: (number | null)[]; // time remaining when answered
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Question memory: track recently used questions to deprioritize them
function loadRecentQuestions(): Set<string> {
  try {
    const stored = localStorage.getItem('brainrace_recent_questions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveRecentQuestions(recent: Set<string>) {
  try {
    const arr = Array.from(recent).slice(-30); // Keep last 30 (3 sessions of ~10 questions each)
    localStorage.setItem('brainrace_recent_questions', JSON.stringify(arr));
  } catch {
    // Fail silently
  }
}

function getQuestionKey(q: Q): string {
  return `${q.g}_${q.s}_${q.t}_${q.q}`;
}

function filterQuestions(grades: Grade[], subjects: Subject[], count: number): Q[] {
  const recent = loadRecentQuestions();
  const pool = QUESTIONS.filter(q => grades.includes(q.g) && subjects.includes(q.s));
  
  // Shuffle and weight by recency: recently used questions have lower priority
  const weighted = shuffle(pool).sort((a, b) => {
    const aRecent = recent.has(getQuestionKey(a)) ? 1 : 0;
    const bRecent = recent.has(getQuestionKey(b)) ? 1 : 0;
    return aRecent - bRecent; // Recent questions sort later (lower priority)
  });
  
  const selected = weighted.slice(0, count);
  
  // Update recent questions memory
  const updated = new Set(recent);
  selected.forEach(q => updated.add(getQuestionKey(q)));
  saveRecentQuestions(updated);
  
  return selected;
}

function calcPoints(q: Q, timeLeft: number, maxTime: number, streak: number): number {
  const base = DIFF_PTS[q.d];
  const speedBonus = Math.round((timeLeft / maxTime) * 50);
  let streakBonus = 0;
  if (streak >= 5) streakBonus = 50;
  else if (streak >= 3) streakBonus = 25;
  return base + speedBonus + streakBonus;
}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }: {
  onStart: (grades: Grade[], subjects: Subject[], count: number) => void;
}) {
  const [grades, setGrades] = useState<Grade[]>([6]);
  const [subjects, setSubjects] = useState<Subject[]>(['Science', 'Math']);
  const [count, setCount] = useState(10);

  const toggleGrade = (g: Grade) => setGrades(prev =>
    prev.includes(g) ? (prev.length > 1 ? prev.filter(x => x !== g) : prev) : [...prev, g]
  );
  const toggleSubject = (s: Subject) => setSubjects(prev =>
    prev.includes(s) ? (prev.length > 1 ? prev.filter(x => x !== s) : prev) : [...prev, s]
  );

  const available = QUESTIONS.filter(q => grades.includes(q.g) && subjects.includes(q.s)).length;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Grade(s)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 18 }}>
        {GRADES.map(g => (
          <button key={g} onClick={() => toggleGrade(g)} style={{
            padding: '10px 0', borderRadius: 10, border: `2px solid ${grades.includes(g) ? '#f0c040' : 'rgba(255,255,255,0.08)'}`,
            background: grades.includes(g) ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)',
            color: grades.includes(g) ? '#f0c040' : '#666', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Gr. {g}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Subject(s)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => toggleSubject(s)} style={{
            padding: '10px 12px', borderRadius: 10, border: `2px solid ${subjects.includes(s) ? SUBJECT_COLOR[s] : 'rgba(255,255,255,0.08)'}`,
            background: subjects.includes(s) ? SUBJECT_BG[s] : 'rgba(255,255,255,0.04)',
            color: subjects.includes(s) ? SUBJECT_COLOR[s] : '#666', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Questions</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[5, 10, 15, 20].map(n => (
          <button key={n} onClick={() => setCount(n)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${count === n ? '#f0c040' : 'rgba(255,255,255,0.08)'}`,
            background: count === n ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)',
            color: count === n ? '#f0c040' : '#666', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}>{n}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 14 }}>
        {available} questions match your filters
      </div>

      <button onClick={() => available > 0 && onStart(grades, subjects, Math.min(count, available))}
        disabled={available === 0}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: available > 0 ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'rgba(255,255,255,0.05)',
          color: '#fff', fontWeight: 800, fontSize: 17, cursor: available > 0 ? 'pointer' : 'not-allowed',
          boxShadow: available > 0 ? '0 4px 20px rgba(59,130,246,0.5)' : 'none',
        }}>
        {'🚀 Start Game →'}
      </button>
    </div>
  );
}

// ─── ONLINE HELPERS ───────────────────────────────────────────────────────────
function getUrlRoomCode(): string {
  const m = window.location.search.match(/[?&]room=([A-Z0-9]{4})/i);
  return m ? m[1].toUpperCase() : "";
}
function buildInviteUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

// ─── ONLINE LOBBY ─────────────────────────────────────────────────────────────
function OnlineLobby({ status, roomCode, error, onHost, onJoin, onBack, initialCode = "" }: {
  status: string; roomCode: string; error: string; initialCode?: string;
  onHost: () => void; onJoin: (code: string) => void; onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [view, setView] = useState<"pick" | "host" | "join">(() => initialCode.length >= 4 ? "join" : "pick");
  const baseBtn: React.CSSProperties = { padding: '16px 0', borderRadius: 14, border: 'none', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', width: '100%' };
  const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', marginTop: 8 };

  if (view === "pick") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 320, width: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0c040', marginBottom: 4 }}>🧠 BrainRace Online</div>
      <button onClick={() => { setView("host"); onHost(); }}
        style={{ ...baseBtn, background: 'linear-gradient(135deg,#7c2d12,#ea580c)', boxShadow: '0 4px 20px rgba(234,88,12,0.4)' }}>
        🏠 Host a Game
        <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Create a room · share the code</span>
      </button>
      <button onClick={() => setView("join")}
        style={{ ...baseBtn, background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
        🔗 Join a Game
        <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Enter the host's 4-letter code</span>
      </button>
      <button onClick={onBack} style={backBtn}>← Back to Menu</button>
    </div>
  );

  if (view === "host") return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 320, width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0c040' }}>Hosting a Room</div>
      {status === "connecting" && <p style={{ color: '#888', fontSize: 13 }}>Connecting…</p>}
      {status === "waiting" && (<>
        <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Share this code with your opponent:</p>
        <div style={{ fontSize: 52, fontWeight: 900, color: '#f0c040', letterSpacing: 8, fontFamily: 'monospace', background: 'rgba(240,192,64,0.08)', border: '2px solid rgba(240,192,64,0.3)', borderRadius: 16, padding: '12px 24px' }}>{roomCode}</div>
        <p style={{ color: '#666', fontSize: 12, margin: 0 }}>or scan to join:</p>
        <div style={{ padding: 8, background: '#fff', borderRadius: 12 }}><QRCode value={buildInviteUrl(roomCode)} size={120} /></div>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>Waiting for opponent to join…</p>
      </>)}
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} style={backBtn}>← Cancel</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 320, width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f0c040' }}>Join a Room</div>
      <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Enter the 4-letter room code:</p>
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
        placeholder="ABCD"
        style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 8, background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 16px', color: '#fff', width: 180, outline: 'none' }}
      />
      <button onClick={() => code.length === 4 && onJoin(code)}
        disabled={code.length !== 4 || status === "connecting"}
        style={{ ...baseBtn, background: code.length === 4 ? 'linear-gradient(135deg,#065f46,#22c55e)' : 'rgba(255,255,255,0.05)', color: code.length === 4 ? '#fff' : '#444', boxShadow: code.length === 4 ? '0 4px 20px rgba(34,197,94,0.4)' : 'none', cursor: code.length === 4 ? 'pointer' : 'not-allowed' }}>
        {status === "connecting" ? "Connecting…" : "Join →"}
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      <button onClick={() => { setView("pick"); onBack(); }} style={backBtn}>← Back</button>
    </div>
  );
}

// ─── QUESTION SCREEN ──────────────────────────────────────────────────────────
function QuestionScreen({ gs, onAnswer }: {
  gs: GameState;
  onAnswer: (playerIdx: number, optIdx: number) => void;
}) {
  const q = gs.questions[gs.qIdx];
  const pct = (gs.timeLeft / gs.maxTime) * 100;
  const timerColor = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  const allAnswered = gs.answers.every(a => a !== null);
  const optLabels = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Timer bar */}
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', flexShrink: 0, borderRadius: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: timerColor, borderRadius: 3, transition: 'width 0.2s linear, background 0.3s' }} />
      </div>

      {/* Question header */}
      <div style={{ padding: '8px 14px', background: SUBJECT_BG[q.s], borderBottom: `2px solid ${SUBJECT_COLOR[q.s]}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 10, color: SUBJECT_COLOR[q.s], fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{q.s}</span>
          <span style={{ marginLeft: 8, fontSize: 10, color: '#555' }}>Gr.{q.g} · {q.t}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: q.d === 'Easy' ? '#22c55e' : q.d === 'Medium' ? '#f59e0b' : '#ef4444', fontWeight: 700, background: q.d === 'Easy' ? 'rgba(34,197,94,0.15)' : q.d === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', padding: '2px 7px', borderRadius: 6 }}>
            {q.d} · {DIFF_PTS[q.d]}pts
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{gs.timeLeft}s</span>
        </div>
      </div>

      {/* Question text */}
      <div style={{ padding: '12px 14px 10px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>{q.q}</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Q{gs.qIdx + 1} of {gs.questions.length}</div>
      </div>

      {/* Answer options */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
        {q.opts.map((opt, oi) => {
          const answered = gs.answers[0] !== null;
          return (
            <button key={oi} onClick={() => onAnswer(0, oi)} disabled={answered}
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.08)',
                background: answered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'flex-start', gap: 10, cursor: answered ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', opacity: answered ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!answered) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if (!answered) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <span style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#888', flexShrink: 0 }}>
                {optLabels[oi]}
              </span>
              <span style={{ fontSize: 14, color: '#ddd', lineHeight: 1.4, textAlign: 'left' }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Player answer panels */}
      <div style={{ padding: '8px 10px 10px', borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        {gs.isSolo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: '#555', textAlign: 'center', marginBottom: 4 }}>▼ Tap your answer</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {q.opts.map((_, oi) => {
                const chosen = gs.answers[0] === oi;
                const locked = gs.answers[0] !== null;
                return (
                  <button key={oi} onClick={() => !locked && onAnswer(0, oi)}
                    disabled={locked}
                    style={{
                      padding: '12px 0', borderRadius: 10, border: `2px solid ${chosen ? '#f0c040' : 'rgba(255,255,255,0.1)'}`,
                      background: chosen ? 'rgba(240,192,64,0.2)' : 'rgba(255,255,255,0.05)',
                      color: chosen ? '#f0c040' : '#888', fontWeight: 800, fontSize: 16, cursor: locked ? 'default' : 'pointer',
                    }}>
                    {optLabels[oi]}
                  </button>
                );
              })}
            </div>
            {gs.answers[0] !== null && <div style={{ textAlign: 'center', fontSize: 12, color: '#555' }}>Answer locked — waiting for timer...</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: '#555', textAlign: 'center', marginBottom: 2 }}>
              {allAnswered ? 'All players answered!' : 'Each player tap A / B / C / D'}
            </div>
            {gs.players.map((p, pi) => {
              const locked = gs.answers[pi] !== null;
              return (
                <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 56, fontSize: 11, color: PLAYER_COLORS[pi], fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
                    {p.name.length > 6 ? p.name.slice(0, 6) + '…' : p.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, flex: 1 }}>
                    {q.opts.map((_, oi) => {
                      const chosen = gs.answers[pi] === oi;
                      return (
                        <button key={oi} onClick={() => !locked && onAnswer(pi, oi)}
                          disabled={locked}
                          style={{
                            padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 800,
                            border: `2px solid ${chosen ? PLAYER_COLORS[pi] : locked ? 'rgba(255,255,255,0.04)' : `${PLAYER_COLORS[pi]}50`}`,
                            background: chosen ? `${PLAYER_COLORS[pi]}25` : 'rgba(255,255,255,0.04)',
                            color: chosen ? PLAYER_COLORS[pi] : locked ? '#333' : `${PLAYER_COLORS[pi]}aa`,
                            cursor: locked ? 'default' : 'pointer',
                          }}>
                          {optLabels[oi]}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ width: 22, fontSize: 12, color: locked ? '#22c55e' : '#444', textAlign: 'center', flexShrink: 0 }}>
                    {locked ? '✓' : '•'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── REVEAL SCREEN ────────────────────────────────────────────────────────────
function RevealScreen({ gs, onNext, earned, isWaiting = false }: {
  gs: GameState;
  onNext: () => void;
  earned: number[];
  isWaiting?: boolean;
}) {
  const q = gs.questions[gs.qIdx];
  const optLabels = ['A', 'B', 'C', 'D'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Correct answer + options */}
      <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{q.q}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {q.opts.map((opt, oi) => {
            const isCorrect = oi === q.ans;
            return (
              <div key={oi} style={{
                padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isCorrect ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: isCorrect ? '#22c55e' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isCorrect ? '#fff' : '#555', flexShrink: 0 }}>
                  {optLabels[oi]}
                </span>
                <span style={{ fontSize: 13, color: isCorrect ? '#4ade80' : '#555', fontWeight: isCorrect ? 700 : 400 }}>{opt}</span>
                {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 14 }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player results */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gs.players.map((p, pi) => {
          const ans = gs.answers[pi];
          const correct = ans === q.ans;
          const noAns = ans === null;
          const pts = earned[pi];
          return (
            <div key={pi} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
              background: noAns ? 'rgba(255,255,255,0.03)' : correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1.5px solid ${noAns ? 'rgba(255,255,255,0.06)' : correct ? '#22c55e40' : '#ef444440'}`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[pi] }} />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{p.name}</span>
              {!noAns && <span style={{ fontSize: 12, color: '#888' }}>→ {optLabels[ans]}</span>}
              {noAns && <span style={{ fontSize: 12, color: '#444' }}>No answer</span>}
              <span style={{ fontSize: 14, fontWeight: 700, color: correct ? '#22c55e' : noAns ? '#555' : '#ef4444' }}>
                {correct ? `+${pts}` : '0'}
              </span>
              <span style={{ fontSize: 16 }}>{correct ? '✓' : noAns ? '—' : '✗'}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 14px 14px' }}>
        {isWaiting ? (
          <div style={{ textAlign: 'center', padding: '13px 0', color: '#555', fontSize: 14 }}>
            ⏳ Waiting for host to advance…
          </div>
        ) : (
          <button onClick={onNext}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: gs.qIdx + 1 < gs.questions.length ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : 'linear-gradient(135deg,#7c1a8a,#a855f7)',
              color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
            }}>
            {gs.qIdx + 1 < gs.questions.length ? `Next Question →` : '🏆 See Results'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ────────────────────────────────────────────────────────────
function ResultsScreen({ gs, onMenu, onRematch }: {
  gs: GameState;
  onMenu: () => void;
  onRematch: () => void;
}) {
  const sorted = [...gs.players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '4th'];
  const accuracy = (p: Player) => p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0;

  return (
    <div style={{ padding: '20px 14px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48 }}>🧠</div>
        <h2 style={{ color: '#f0c040', fontSize: 22, margin: '8px 0 4px' }}>Game Over!</h2>
        <p style={{ color: '#888', fontSize: 14 }}>{gs.questions.length} questions answered</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {sorted.map((p, rank) => (
          <div key={p.idx} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
            background: rank === 0 ? 'rgba(240,192,64,0.12)' : 'rgba(255,255,255,0.04)',
            border: rank === 0 ? '1.5px solid rgba(240,192,64,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 20, width: 30 }}>{medals[rank]}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[p.idx] }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{p.name}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#f0c040', fontWeight: 800, fontSize: 18 }}>{p.score.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: '#555' }}>{p.correct}/{p.total} correct · {accuracy(p)}%</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRematch}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}>🔁 Rematch</button>
        <button onClick={onMenu}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
            background: 'rgba(255,255,255,0.07)', color: '#aaa', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>🏠 Menu</button>
      </div>
    </div>
  );
}

// ─── SCORE BAR (shown during game) ────────────────────────────────────────────
function ScoreBar({ gs }: { gs: GameState }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 10px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {gs.players.map((p, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center', padding: '3px 4px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${PLAYER_COLORS[i]}30` }}>
          <div style={{ fontSize: 9, color: PLAYER_COLORS[i], fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 13, color: '#f0c040', fontWeight: 800 }}>{p.score.toLocaleString()}</div>
          {p.streak >= 3 && <div style={{ fontSize: 8, color: '#f59e0b' }}>🔥{p.streak}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── ONLINE BRAIN GAME ────────────────────────────────────────────────────────
function OnlineBrainGame({ isHost, relaySend, onMessage, onMenu }: {
  isHost: boolean;
  relaySend: (d: unknown) => void;
  onMessage: (handler: (d: unknown) => void) => void;
  onMenu: () => void;
}) {
  const [innerPhase, setInnerPhase] = useState<'pre' | 'question' | 'reveal' | 'results'>('pre');
  const [myName, setMyName] = useState('');
  const [oppName, setOppName] = useState('');
  const [questions, setQuestions] = useState<Q[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [maxTime, setMaxTime] = useState(30);
  const [myAns, setMyAns] = useState<number | null>(null);
  const [oppHasAnswered, setOppHasAnswered] = useState(false);
  const [paused, setPaused] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myStreak, setMyStreak] = useState(0);
  const [oppStreak, setOppStreak] = useState(0);
  const [myCorrect, setMyCorrect] = useState(0);
  const [oppCorrect, setOppCorrect] = useState(0);
  const [roundTotal, setRoundTotal] = useState(0);
  const [earnedPts, setEarnedPts] = useState<number[]>([0, 0]);
  const [revealAns, setRevealAns] = useState<{ hostAns: number | null; guestAns: number | null } | null>(null);

  // Host-side mutable refs (avoid stale closures)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(30);
  const maxTimeRef = useRef(30);
  const pausedRef = useRef(false);
  const qIdxRef = useRef(0);
  const questionsRef = useRef<Q[]>([]);
  const hostAnsRef = useRef<{ ans: number | null; time: number | null }>({ ans: null, time: null });
  const guestAnsRef = useRef<{ ans: number | null; time: number | null }>({ ans: null, time: null });
  const myScoreRef = useRef({ score: 0, streak: 0, correct: 0, total: 0 });
  const oppScoreRef = useRef({ score: 0, streak: 0, correct: 0, total: 0 });

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const doRevealHost = useCallback(() => {
    stopTimer();
    const qs = questionsRef.current;
    const qi = qIdxRef.current;
    const q = qs[qi];
    const mt = maxTimeRef.current;
    const hAns = hostAnsRef.current;
    const gAns = guestAnsRef.current;

    const calcPts = (ans: number | null, time: number | null, streak: number) => {
      if (ans === null || ans !== q.ans) return 0;
      return calcPoints(q, time ?? 0, mt, streak);
    };
    const hPts = calcPts(hAns.ans, hAns.time, myScoreRef.current.streak);
    const gPts = calcPts(gAns.ans, gAns.time, oppScoreRef.current.streak);
    const hCorrect = hAns.ans === q.ans;
    const gCorrect = gAns.ans === q.ans;

    myScoreRef.current = { score: myScoreRef.current.score + hPts, streak: hCorrect ? myScoreRef.current.streak + 1 : 0, correct: myScoreRef.current.correct + (hCorrect ? 1 : 0), total: myScoreRef.current.total + 1 };
    oppScoreRef.current = { score: oppScoreRef.current.score + gPts, streak: gCorrect ? oppScoreRef.current.streak + 1 : 0, correct: oppScoreRef.current.correct + (gCorrect ? 1 : 0), total: oppScoreRef.current.total + 1 };

    const payload = { qIdx: qi, hostAns: hAns.ans, guestAns: gAns.ans, hostPts: hPts, guestPts: gPts, hostScore: myScoreRef.current.score, guestScore: oppScoreRef.current.score, hostStreak: myScoreRef.current.streak, guestStreak: oppScoreRef.current.streak, hostCorrect: myScoreRef.current.correct, guestCorrect: oppScoreRef.current.correct, totalSoFar: myScoreRef.current.total };
    relaySend({ type: 'reveal', ...payload });

    setMyScore(myScoreRef.current.score); setOppScore(oppScoreRef.current.score);
    setMyStreak(myScoreRef.current.streak); setOppStreak(oppScoreRef.current.streak);
    setMyCorrect(myScoreRef.current.correct); setOppCorrect(oppScoreRef.current.correct);
    setRoundTotal(myScoreRef.current.total);
    setEarnedPts([hPts, gPts]);
    setRevealAns({ hostAns: hAns.ans, guestAns: gAns.ans });
    setInnerPhase('reveal');
  }, [stopTimer, relaySend]);

  const startHostQuestion = useCallback((qs: Q[], qi: number) => {
    const q = qs[qi];
    const mt = DIFF_TIMER[q.d];
    questionsRef.current = qs; qIdxRef.current = qi;
    maxTimeRef.current = mt; timeLeftRef.current = mt;
    hostAnsRef.current = { ans: null, time: null };
    guestAnsRef.current = { ans: null, time: null };
    setQIdx(qi); setMaxTime(mt); setTimeLeft(mt);
    setMyAns(null); setOppHasAnswered(false); setRevealAns(null);
    setInnerPhase('question');
    stopTimer();
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      relaySend({ type: 'tick', qIdx: qi, timeLeft: timeLeftRef.current });
      if (timeLeftRef.current <= 0) { stopTimer(); doRevealHost(); }
    }, 1000);
  }, [stopTimer, doRevealHost, relaySend]);

  // Incoming message handler
  const handleMessage = useCallback((raw: unknown) => {
    const msg = raw as Record<string, unknown>;
    if (isHost) {
      if (msg.type === 'answer') {
        const { qIdx: aq, optIdx, timeLeft: at } = msg as { qIdx: number; optIdx: number; timeLeft: number };
        if (aq !== qIdxRef.current) return;
        guestAnsRef.current = { ans: optIdx, time: at };
        setOppHasAnswered(true);
        relaySend({ type: 'opp_answered' });
        if (hostAnsRef.current.ans !== null) doRevealHost();
      }
      if (msg.type === 'name') setOppName(String(msg.name || 'Guest'));
    } else {
      if (msg.type === 'start') {
        const qs = msg.questions as Q[];
        setQuestions(qs); setOppName(String(msg.hostName || 'Host'));
        setMyScore(0); setOppScore(0); setMyStreak(0); setOppStreak(0);
        setMyCorrect(0); setOppCorrect(0); setRoundTotal(0);
        const q = qs[0]; const mt = DIFF_TIMER[q.d];
        setMaxTime(mt); setTimeLeft(mt); setQIdx(0);
        setMyAns(null); setOppHasAnswered(false); setRevealAns(null);
        setInnerPhase('question');
      }
      if (msg.type === 'tick') {
        const { qIdx: tqi, timeLeft: tl } = msg as { qIdx: number; timeLeft: number };
        setQIdx(tqi); setTimeLeft(tl);
      }
      if (msg.type === 'opp_answered') setOppHasAnswered(true);
      if (msg.type === 'reveal') {
        const m = msg as { hostAns: number|null; guestAns: number|null; hostPts: number; guestPts: number; hostScore: number; guestScore: number; hostStreak: number; guestStreak: number; hostCorrect: number; guestCorrect: number; totalSoFar: number };
        setMyScore(m.guestScore); setOppScore(m.hostScore);
        setMyStreak(m.guestStreak); setOppStreak(m.hostStreak);
        setMyCorrect(m.guestCorrect); setOppCorrect(m.hostCorrect);
        setRoundTotal(m.totalSoFar);
        setEarnedPts([m.guestPts, m.hostPts]);
        setRevealAns({ hostAns: m.hostAns, guestAns: m.guestAns });
        setInnerPhase('reveal');
      }
      if (msg.type === 'next') {
        const nextQIdx = msg.nextQIdx as number;
        setMyAns(null); setOppHasAnswered(false); setRevealAns(null);
        setQIdx(nextQIdx);
        setInnerPhase('question');
        setQuestions(prev => {
          const q = prev[nextQIdx];
          if (q) { const mt = DIFF_TIMER[q.d]; setMaxTime(mt); setTimeLeft(mt); }
          return prev;
        });
      }
      if (msg.type === 'done') setInnerPhase('results');
      if (msg.type === 'paused') setPaused(true);
      if (msg.type === 'resumed') setPaused(false);
    }
  }, [isHost, doRevealHost, relaySend]);

  useEffect(() => { onMessage(handleMessage); }, [handleMessage, onMessage]);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const timeLeftForSend = timeLeft;
  const handleMyAnswer = useCallback((optIdx: number) => {
    if (myAns !== null || innerPhase !== 'question' || paused) return;
    setMyAns(optIdx);
    if (isHost) {
      hostAnsRef.current = { ans: optIdx, time: timeLeftRef.current };
      relaySend({ type: 'opp_answered' });
      // Reveal immediately if guest already answered
      if (guestAnsRef.current.ans !== null) doRevealHost();
    } else {
      relaySend({ type: 'answer', qIdx, optIdx, timeLeft: timeLeftForSend });
      // Guest: ask host to reveal if it has both answers
    }
  }, [myAns, innerPhase, paused, isHost, doRevealHost, relaySend, qIdx, timeLeftForSend]);

  const handleNext = useCallback(() => {
    const nextIdx = qIdx + 1;
    if (nextIdx >= questions.length) { relaySend({ type: 'done' }); setInnerPhase('results'); }
    else { relaySend({ type: 'next', nextQIdx: nextIdx }); startHostQuestion(questions, nextIdx); }
  }, [qIdx, questions, startHostQuestion, relaySend]);

  const togglePause = useCallback(() => {
    setPaused(prev => { const next = !prev; pausedRef.current = next; relaySend({ type: next ? 'paused' : 'resumed' }); return next; });
  }, [relaySend]);

  const handleHostStart = useCallback((grades: Grade[], subjects: Subject[], count: number) => {
    const qs = filterQuestions(grades, subjects, count);
    const name = myName.trim() || 'Host';
    setQuestions(qs);
    myScoreRef.current = { score: 0, streak: 0, correct: 0, total: 0 };
    oppScoreRef.current = { score: 0, streak: 0, correct: 0, total: 0 };
    relaySend({ type: 'start', questions: qs, hostName: name });
    startHostQuestion(qs, 0);
  }, [myName, startHostQuestion, relaySend]);

  const myDisplayName = myName.trim() || (isHost ? 'Host' : 'Guest');
  const oppDisplayName = oppName.trim() || (isHost ? 'Guest' : 'Host');

  // Build a GameState compatible with the display components
  // host=player0, guest=player1
  const hostPlayer: Player = { name: isHost ? myDisplayName : oppDisplayName, score: isHost ? myScore : oppScore, streak: isHost ? myStreak : oppStreak, correct: isHost ? myCorrect : oppCorrect, total: roundTotal };
  const guestPlayer: Player = { name: isHost ? oppDisplayName : myDisplayName, score: isHost ? oppScore : myScore, streak: isHost ? oppStreak : myStreak, correct: isHost ? oppCorrect : myCorrect, total: roundTotal };

  // answers: -1 = "has answered, unknown choice" (locked row without highlighting)
  let dispHostAns: number | null;
  let dispGuestAns: number | null;
  if (innerPhase === 'reveal' && revealAns) {
    dispHostAns = revealAns.hostAns; dispGuestAns = revealAns.guestAns;
  } else {
    if (isHost) { dispHostAns = myAns; dispGuestAns = oppHasAnswered ? -1 : null; }
    else        { dispHostAns = oppHasAnswered ? -1 : null; dispGuestAns = myAns; }
  }

  const gs: GameState = {
    mode: innerPhase === 'question' ? 'question' : innerPhase === 'reveal' ? 'reveal' : 'results',
    isSolo: false,
    players: [hostPlayer, guestPlayer],
    questions, qIdx, timeLeft, maxTime,
    answers: [dispHostAns, dispGuestAns],
    answerTimes: [null, null],
  };

  const bgStyle: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', fontFamily: "'Segoe UI', sans-serif" };

  // ── PRE-GAME ──
  if (innerPhase === 'pre') {
    if (isHost) return (
      <div style={bgStyle}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
          <button onClick={onMenu} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: '#aaa', fontSize: 13, cursor: 'pointer' }}>← Back</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#f0c040', letterSpacing: 1 }}>🧠 Host Setup</div>
        </div>
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Your Name</div>
          <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Host" maxLength={16}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(240,192,64,0.3)', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600, outline: 'none' }} />
        </div>
        <SetupScreen onStart={handleHostStart} />
      </div>
    );
    return (
      <div style={{ ...bgStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
        <div style={{ fontSize: 56 }}>🧠</div>
        <p style={{ color: '#f0c040', fontWeight: 800, fontSize: 18, margin: 0 }}>Opponent is setting up…</p>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Your Name</div>
          <input value={myName} onChange={e => { const v = e.target.value; setMyName(v); relaySend({ type: 'name', name: v }); }}
            placeholder="Guest" maxLength={16}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600, outline: 'none' }} />
        </div>
        <p style={{ color: '#555', fontSize: 14, margin: 0 }}>Waiting for host to start the game…</p>
        <button onClick={onMenu} style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer' }}>← Leave</button>
      </div>
    );
  }

  // ── RESULTS ──
  if (innerPhase === 'results') return (
    <div style={{ ...bgStyle, maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,215,0,0.15)', flexShrink: 0 }}>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#f0c040' }}>🧠 BrainRace · Results</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ResultsScreen gs={{ ...gs, mode: 'results' }} onMenu={onMenu} onRematch={onMenu} />
      </div>
    </div>
  );

  // ── IN-GAME ──
  return (
    <div style={{ ...bgStyle, maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,215,0,0.15)', flexShrink: 0 }}>
        <button onClick={onMenu} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>✕</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f0c040' }}>🧠 BrainRace</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>Q{qIdx + 1}/{questions.length}</span>
        </div>
        {gs.mode === 'question' && isHost ? (
          <button onClick={togglePause} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 14, cursor: 'pointer', width: 56 }}>{paused ? '▶' : '⏸'}</button>
        ) : <div style={{ width: 56 }} />}
      </div>

      {/* Score bar */}
      <ScoreBar gs={gs} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {gs.mode === 'question' && (
          <QuestionScreen gs={gs} onAnswer={(pi, oi) => {
            if (isHost && pi === 0) handleMyAnswer(oi);
            if (!isHost && pi === 1) handleMyAnswer(oi);
          }} />
        )}
        {gs.mode === 'reveal' && (
          <RevealScreen gs={gs} onNext={isHost ? handleNext : () => {}} earned={earnedPts} isWaiting={!isHost} />
        )}
        {(paused) && gs.mode === 'question' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,24,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>⏸</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f0c040' }}>{isHost ? 'Paused' : 'Host paused the game'}</div>
            {isHost && <button onClick={togglePause} style={{ padding: '12px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>▶ Resume</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SOLO GAME WRAPPER ────────────────────────────────────────────────────────
function SoloGameWrapper({ onMenu }: { onMenu: () => void }) {
  const [setupDone, setSetupDone] = useState(false);
  const [soloGs, setSoloGs] = useState<GameState | null>(null);

  const startSoloGame = (grades: Grade[], subjects: Subject[], count: number) => {
    const qs = filterQuestions(grades, subjects, count);
    setSoloGs({
      mode: 'question',
      isSolo: true,
      players: [{ name: 'You', score: 0, streak: 0, correct: 0, total: 0 }],
      questions: qs,
      qIdx: 0,
      timeLeft: DIFF_TIMER[qs[0].d],
      maxTime: DIFF_TIMER[qs[0].d],
      answers: [null],
      answerTimes: [null],
    });
    setSetupDone(true);
  };

  if (!setupDone) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <button onClick={onMenu} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</button>
        <SetupScreen onStart={startSoloGame} />
      </div>
    );
  }

  if (!soloGs) return null;

  return (
    <SoloGame gs={soloGs} setGs={setSoloGs} onMenu={onMenu} />
  );
}

// ─── SOLO GAME ────────────────────────────────────────────────────────────────
function SoloGame({ gs, setGs, onMenu }: { gs: GameState; setGs: (gs: GameState | ((prev: GameState) => GameState)) => void; onMenu: () => void }) {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(0);
  const maxTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const canAnswerRef = useRef(true);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (gs.mode !== 'question') return;
    timeLeftRef.current = gs.timeLeft;
    maxTimeRef.current = gs.maxTime;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      timeLeftRef.current -= 1;
      setGs(prev => {
        if (prev.mode !== 'question' || timeLeftRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          const q = prev.questions[prev.qIdx];
          const ans = prev.answers[0];
          const correct = ans === q.ans;
          const remainingTime = Math.max(0, timeLeftRef.current);
          const pts = ans === null || !correct ? 0 : calcPoints(q, remainingTime, maxTimeRef.current, prev.players[0].streak);
          const newPlayer = { ...prev.players[0], score: prev.players[0].score + pts, streak: correct ? prev.players[0].streak + 1 : 0, correct: prev.players[0].correct + (correct ? 1 : 0), total: prev.players[0].total + 1 };
          return { ...prev, mode: 'reveal', players: [newPlayer], timeLeft: remainingTime };
        }
        return { ...prev, timeLeft: timeLeftRef.current };
      });
    }, 1000);
  }, [gs.mode, gs.qIdx, setGs]);

  const handleAnswer = (optIdx: number) => {
    if (!canAnswerRef.current || gs.mode !== 'question' || gs.answers[0] !== null || gs.questions.length <= gs.qIdx) return;
    canAnswerRef.current = false;
    
    // Reveal immediately without waiting for timer
    const q = gs.questions[gs.qIdx];
    const correct = optIdx === q.ans;
    const pts = correct ? calcPoints(q, gs.timeLeft, gs.maxTime, gs.players[0].streak) : 0;
    const newPlayer = { 
      ...gs.players[0], 
      score: gs.players[0].score + pts, 
      streak: correct ? gs.players[0].streak + 1 : 0, 
      correct: gs.players[0].correct + (correct ? 1 : 0), 
      total: gs.players[0].total + 1 
    };
    
    if (timerRef.current) clearInterval(timerRef.current);
    setGs({ ...gs, answers: [optIdx], answerTimes: [gs.timeLeft], mode: 'reveal', players: [newPlayer] });
  };

  const handleNext = () => {
    if (gs.qIdx + 1 >= gs.questions.length) {
      setGs({ ...gs, mode: 'results' });
    } else {
      const nextQ = gs.questions[gs.qIdx + 1];
      const nextTime = DIFF_TIMER[nextQ.d];
      canAnswerRef.current = true;
      setGs({
        ...gs, qIdx: gs.qIdx + 1, mode: 'question', answers: [null], answerTimes: [null],
        timeLeft: nextTime, maxTime: nextTime,
      });
    }
  };

  const bgStyle = { minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', fontFamily: "'Segoe UI', sans-serif" };

  if (gs.mode === 'results') {
    return (
      <div style={{ ...bgStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ResultsScreen gs={gs} onMenu={onMenu} onRematch={onMenu} />
      </div>
    );
  }

  return (
    <div style={{ ...bgStyle, maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,215,0,0.15)', flexShrink: 0 }}>
        <button onClick={onMenu} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>✕</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f0c040' }}>🧠 BrainRace · Solo</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>Q{gs.qIdx + 1}/{gs.questions.length}</span>
        </div>
        {gs.mode === 'question' && (
          <button onClick={() => setPaused(!paused)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 10px', color: '#aaa', fontSize: 14, cursor: 'pointer', width: 56 }}>{paused ? '▶' : '⏸'}</button>
        )}
      </div>

      {/* Score bar */}
      <ScoreBar gs={gs} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {gs.mode === 'question' && (
          <QuestionScreen gs={gs} onAnswer={(_, oi) => handleAnswer(oi)} />
        )}
        {gs.mode === 'reveal' && gs.questions.length > gs.qIdx && (
          <RevealScreen gs={gs} onNext={handleNext} earned={[gs.answers[0] === gs.questions[gs.qIdx].ans ? calcPoints(gs.questions[gs.qIdx], gs.timeLeft, gs.maxTime, gs.players[0].streak) : 0]} />
        )}
        {paused && gs.mode === 'question' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,24,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>⏸</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f0c040' }}>Paused</div>
            <button onClick={() => setPaused(false)} style={{ padding: '12px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>▶ Resume</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BrainRace() {
  const [screen, setScreen] = useState<'menu' | 'solo' | 'lobby' | 'game'>(() => getUrlRoomCode() ? 'lobby' : 'menu');
  const [isHost, setIsHost] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [error, setError] = useState('');
  const onlineMsgHandlerRef = useRef<((d: unknown) => void) | null>(null);

  const { status, roomCode, role: _role, createRoom, joinRoom, send, disconnect } = useRelaySocket('brain-race', {
    onRoomCreated:    () => {},
    onRoomJoined:     () => { setIsHost(false); setGameKey(k => k + 1); setScreen('game'); },
    onOpponentJoined: () => { setIsHost(true);  setGameKey(k => k + 1); setScreen('game'); },
    onMessage:        (data) => { onlineMsgHandlerRef.current?.(data); },
    onOpponentLeft:   () => { setError('Opponent disconnected.'); disconnect(); setScreen('menu'); },
    onError:          (msg) => setError(msg),
  });

  const registerHandler = useCallback((h: (d: unknown) => void) => { onlineMsgHandlerRef.current = h; }, []);
  const goMenu = useCallback(() => { disconnect(); setScreen('menu'); }, [disconnect]);

  // ── SOLO SCREEN ──
  if (screen === 'solo') return (
    <SoloGameWrapper onMenu={() => setScreen('menu')} />
  );

  // ── MENU ──
  if (screen === 'menu') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Segoe UI', sans-serif", position: 'relative' }}>
      <Link href="/"><span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🧠</div>
      <h1 style={{ color: '#f0c040', fontSize: 32, margin: '0 0 4px', textAlign: 'center', letterSpacing: 1 }}>BrainRace</h1>
      <p style={{ color: '#888', marginBottom: 32, textAlign: 'center', fontSize: 14 }}>Trivia Challenges · Grades 5–8<br/>Science · History · Geography · Math</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button onClick={() => { setError(''); setScreen('solo'); }}
          style={{ padding: '18px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.5)' }}>
          🎯 Solo Practice
        </button>
        <button onClick={() => { setError(''); setScreen('lobby'); }}
          style={{ padding: '18px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#7c2d12,#ea580c)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(234,88,12,0.5)' }}>
          🌐 Play Online
        </button>
      </div>
      {error && <p style={{ color: '#ef4444', marginTop: 16, fontSize: 14 }}>{error}</p>}
      <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 400 }}>
        {SUBJECTS.map(s => (
          <span key={s} style={{ padding: '4px 12px', borderRadius: 20, background: SUBJECT_BG[s], border: `1px solid ${SUBJECT_COLOR[s]}40`, fontSize: 12, color: SUBJECT_COLOR[s], fontWeight: 700 }}>{s}</span>
        ))}
        <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', fontSize: 12, color: '#888' }}>200+ Questions</span>
        <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', fontSize: 12, color: '#888' }}>Grades 5–8</span>
      </div>
    </div>
  );

  // ── ONLINE LOBBY ──
  if (screen === 'lobby') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', sans-serif" }}>
      <OnlineLobby
        status={status} roomCode={roomCode} error={error}
        initialCode={getUrlRoomCode()}
        onHost={() => { setError(''); createRoom(); }}
        onJoin={(code) => { setError(''); joinRoom(code); }}
        onBack={() => { disconnect(); setScreen('menu'); }}
      />
    </div>
  );

  // ── GAME ──
  return (
    <OnlineBrainGame
      key={gameKey}
      isHost={isHost}
      relaySend={send}
      onMenu={goMenu}
      onMessage={registerHandler}
    />
  );
}
