import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { useRelaySocket } from '@/lib/relay-socket';
import { QRCode } from '@/components/QRCode';

// ─── QUESTION BANK (200+ questions, Grades 5–8, 4 subjects) ──────────────────
type Grade = 5 | 6 | 7 | 8;
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
];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SUBJECTS: Subject[] = ['Science', 'History', 'Geography', 'Math'];
const GRADES: Grade[] = [5, 6, 7, 8];
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

function filterQuestions(grades: Grade[], subjects: Subject[], count: number): Q[] {
  const pool = QUESTIONS.filter(q => grades.includes(q.g) && subjects.includes(q.s));
  return shuffle(pool).slice(0, count);
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {GRADES.map(g => (
          <button key={g} onClick={() => toggleGrade(g)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${grades.includes(g) ? '#f0c040' : 'rgba(255,255,255,0.08)'}`,
            background: grades.includes(g) ? 'rgba(240,192,64,0.15)' : 'rgba(255,255,255,0.04)',
            color: grades.includes(g) ? '#f0c040' : '#666', fontWeight: 700, fontSize: 16, cursor: 'pointer',
          }}>Gr.{g}</button>
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
        {q.opts.map((opt, oi) => (
          <div key={oi} style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#888', flexShrink: 0 }}>
              {optLabels[oi]}
            </span>
            <span style={{ fontSize: 14, color: '#ddd', lineHeight: 1.4 }}>{opt}</span>
          </div>
        ))}
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
      if (guestAnsRef.current.ans !== null) doRevealHost();
    } else {
      relaySend({ type: 'answer', qIdx, optIdx, timeLeft: timeLeftForSend });
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BrainRace() {
  const [screen, setScreen] = useState<'menu' | 'lobby' | 'game'>(() => getUrlRoomCode() ? 'lobby' : 'menu');
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

  // ── MENU ──
  if (screen === 'menu') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#050518,#0a0a20)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Segoe UI', sans-serif", position: 'relative' }}>
      <Link href="/"><span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>← Menu</span></Link>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🧠</div>
      <h1 style={{ color: '#f0c040', fontSize: 32, margin: '0 0 4px', textAlign: 'center', letterSpacing: 1 }}>BrainRace</h1>
      <p style={{ color: '#888', marginBottom: 32, textAlign: 'center', fontSize: 14 }}>Online Multiplayer Trivia · Grades 5–8<br/>Science · History · Geography · Math</p>
      <button onClick={() => { setError(''); setScreen('lobby'); }}
        style={{ padding: '18px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#7c2d12,#ea580c)', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 20px rgba(234,88,12,0.5)' }}>
        🌐 Play Online
      </button>
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
