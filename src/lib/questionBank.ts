import type { Part } from "./config";
import type { Question } from "./types";

// ------------------------------------------------------------------
// Starter question bank (English). This is a SAMPLE so the site runs.
// Your content team must grow this to at least 5x one test per field
// (PRD 8.5) and add Hindi text. Admin > Questions can import a CSV.
// Row: [chapter, topic, difficulty, skill, question, [a, b, c, d], correctIndex, explanation]
// ------------------------------------------------------------------

type D = "easy" | "medium" | "hard";
type Row = [string, string, D, string, string, string[], number, string];

const IDS = ["a", "b", "c", "d"];

function bank(subject: string, part: Part, prefix: string, rows: Row[]): Question[] {
  return rows.map(([chapter, topic, difficulty, skill, text, opts, ans, explanation], i) => ({
    id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
    part,
    subject,
    chapter,
    topic,
    difficulty,
    skill,
    text: { en: text },
    options: opts.map((en, j) => ({ id: IDS[j], en })),
    answer: IDS[ans],
    explanation,
    active: true,
  }));
}

const physics: Row[] = [
  ["Units and Measurement", "Dimensions", "easy", "conceptual", "The dimensional formula of force is", ["[M L T⁻²]", "[M L² T⁻²]", "[M L T⁻¹]", "[M L⁻¹ T⁻²]"], 0, "F = ma, so [M][L T⁻²] = [M L T⁻²]."],
  ["Kinematics", "Equations of motion", "easy", "numerical", "A body starts from rest with a uniform acceleration of 2 m/s². How far does it travel in 5 s?", ["10 m", "25 m", "50 m", "20 m"], 1, "s = ½at² = ½ × 2 × 25 = 25 m."],
  ["Laws of Motion", "Newton's second law", "easy", "numerical", "A 2 kg block on a frictionless surface is pulled with a force of 10 N. Its acceleration is", ["2 m/s²", "5 m/s²", "10 m/s²", "20 m/s²"], 1, "a = F/m = 10/2 = 5 m/s²."],
  ["Work, Energy and Power", "Kinetic energy", "easy", "numerical", "The kinetic energy of a 1 kg body moving at 4 m/s is", ["4 J", "8 J", "16 J", "2 J"], 1, "KE = ½mv² = ½ × 1 × 16 = 8 J."],
  ["Current Electricity", "Resistors in parallel", "medium", "numerical", "Two 6 Ω resistors are connected in parallel. The equivalent resistance is", ["12 Ω", "6 Ω", "3 Ω", "1.5 Ω"], 2, "1/R = 1/6 + 1/6 = 1/3, so R = 3 Ω."],
  ["Ray Optics", "Power of a lens", "medium", "numerical", "A convex lens has a focal length of 20 cm. Its power is", ["+5 D", "−5 D", "+0.5 D", "+20 D"], 0, "P = 1/f (in metres) = 1/0.2 = +5 D. Convex lens power is positive."],
  ["Gravitation", "Inverse square law", "medium", "conceptual", "If the distance between two masses is doubled, the gravitational force between them becomes", ["double", "half", "one-fourth", "four times"], 2, "F ∝ 1/r². Doubling r makes F one-fourth."],
  ["Thermodynamics", "Isothermal process", "medium", "conceptual", "In an isothermal process of an ideal gas, which quantity stays constant?", ["Pressure", "Volume", "Temperature", "Heat supplied"], 2, "Isothermal means constant temperature."],
  ["Electric Charges and Fields", "Coulomb's law", "easy", "conceptual", "If the distance between two point charges is halved, the force between them becomes", ["half", "double", "four times", "one-fourth"], 2, "F ∝ 1/r². Halving r makes F four times."],
  ["Electrostatic Potential and Capacitance", "Charge on a capacitor", "easy", "numerical", "A 2 µF capacitor is connected to a 10 V battery. The charge stored is", ["5 µC", "20 µC", "12 µC", "0.2 µC"], 1, "Q = CV = 2 µF × 10 V = 20 µC."],
  ["Moving Charges and Magnetism", "Magnetic force", "medium", "conceptual", "A charge moves parallel to a uniform magnetic field. The magnetic force on it is", ["maximum", "zero", "equal to qvB", "along the field"], 1, "F = qvB sin θ and θ = 0°, so F = 0."],
  ["Electromagnetic Induction", "Faraday's law", "easy", "conceptual", "An emf is induced in a coil when", ["the coil is at rest in a steady field", "the magnetic flux through it changes", "a steady current flows in it", "it is made of copper"], 1, "Faraday's law: induced emf = rate of change of flux."],
  ["Wave Optics", "Young's double slit", "medium", "conceptual", "In Young's double slit experiment, if the slit separation d is doubled, the fringe width becomes", ["double", "half", "four times", "unchanged"], 1, "β = λD/d, so doubling d halves β."],
  ["Dual Nature of Radiation", "Photoelectric effect", "medium", "conceptual", "The maximum kinetic energy of photoelectrons depends on the", ["intensity of light", "frequency of light", "time of exposure", "area of the plate"], 1, "KEmax = hν − φ. Intensity changes only the number of electrons."],
  ["Semiconductor Electronics", "p-n junction", "easy", "conceptual", "A p-n junction diode conducts easily when it is", ["reverse biased", "forward biased", "not connected", "heated to 0 K"], 1, "Forward bias lowers the barrier, so current flows."],
  ["Motion in a Plane", "Projectile range", "medium", "conceptual", "For a given launch speed, the horizontal range of a projectile is maximum at an angle of", ["30°", "45°", "60°", "90°"], 1, "R = u² sin 2θ / g is largest when 2θ = 90°."],
];

const chemistry: Row[] = [
  ["Some Basic Concepts", "Mole concept", "easy", "numerical", "How many moles are there in 36 g of water (molar mass 18 g/mol)?", ["1", "2", "3", "18"], 1, "Moles = mass / molar mass = 36/18 = 2."],
  ["Structure of Atom", "Shell capacity", "easy", "conceptual", "The maximum number of electrons in the M shell (n = 3) is", ["8", "18", "32", "2"], 1, "Maximum electrons = 2n² = 2 × 9 = 18."],
  ["Periodic Table", "Electronegativity", "easy", "conceptual", "Which element has the highest electronegativity?", ["Oxygen", "Chlorine", "Fluorine", "Nitrogen"], 2, "Fluorine is the most electronegative element."],
  ["Chemical Bonding", "VSEPR shapes", "medium", "conceptual", "The shape of a methane (CH₄) molecule is", ["Linear", "Trigonal planar", "Tetrahedral", "Square planar"], 2, "Four bond pairs and no lone pair give a tetrahedral shape."],
  ["Equilibrium", "pH", "medium", "numerical", "The pH of a solution with [H⁺] = 10⁻³ mol/L is", ["3", "−3", "11", "7"], 0, "pH = −log[H⁺] = −log(10⁻³) = 3."],
  ["Organic Chemistry Basics", "IUPAC naming", "easy", "conceptual", "The IUPAC name of CH₃CH₂OH is", ["Methanol", "Ethanol", "Ethanal", "Propanol"], 1, "Two carbons with an –OH group: ethanol."],
  ["Redox Reactions", "Oxidation and reduction", "medium", "conceptual", "In the reaction Zn + Cu²⁺ → Zn²⁺ + Cu, zinc is", ["reduced", "oxidised", "neither oxidised nor reduced", "a catalyst"], 1, "Zinc loses electrons (0 to +2), so it is oxidised."],
  ["States of Matter", "Boyle's law", "medium", "conceptual", "At constant temperature, if the pressure of a gas is doubled, its volume becomes", ["double", "half", "the same", "four times"], 1, "Boyle's law: PV = constant, so V halves."],
  ["Solutions", "Molarity", "easy", "numerical", "4 g of NaOH (molar mass 40 g/mol) is dissolved to make 1 L of solution. Its molarity is", ["1 M", "0.1 M", "0.4 M", "4 M"], 1, "Moles = 4/40 = 0.1 in 1 L, so 0.1 M."],
  ["Electrochemistry", "Electrolysis", "medium", "conceptual", "During electrolysis of molten NaCl, the product at the cathode is", ["chlorine gas", "sodium metal", "hydrogen gas", "oxygen gas"], 1, "Na⁺ gains electrons at the cathode and forms sodium."],
  ["Chemical Kinetics", "Rate constant", "medium", "conceptual", "The unit of the rate constant of a first order reaction is", ["mol L⁻¹ s⁻¹", "s⁻¹", "L mol⁻¹ s⁻¹", "no unit"], 1, "For first order, k = rate / [A], which gives s⁻¹."],
  ["Hydrocarbons", "Alkenes", "easy", "conceptual", "The general formula of alkenes is", ["CₙH₂ₙ₊₂", "CₙH₂ₙ", "CₙH₂ₙ₋₂", "CₙHₙ"], 1, "One C=C double bond: CₙH₂ₙ."],
  ["Coordination Compounds", "Coordination number", "medium", "conceptual", "The coordination number of cobalt in [Co(NH₃)₆]³⁺ is", ["3", "6", "9", "2"], 1, "Six NH₃ ligands each give one bond."],
  ["Thermodynamics", "Spontaneity", "hard", "conceptual", "A reaction is spontaneous at all temperatures when", ["ΔH > 0 and ΔS < 0", "ΔH < 0 and ΔS > 0", "ΔH > 0 and ΔS > 0", "ΔH < 0 and ΔS < 0"], 1, "ΔG = ΔH − TΔS is then negative at every temperature."],
  ["p-Block Elements", "Noble gases", "easy", "factual", "The most abundant noble gas in the atmosphere is", ["Helium", "Neon", "Argon", "Krypton"], 2, "Argon is about 0.93% of air."],
  ["Biomolecules", "Carbohydrates", "easy", "conceptual", "Glucose is a", ["disaccharide", "monosaccharide", "polysaccharide", "protein"], 1, "Glucose is a simple sugar that cannot be broken into smaller sugars."],
];

const maths: Row[] = [
  ["Relations and Functions", "Evaluating functions", "easy", "numerical", "If f(x) = 2x + 3, then f(4) is", ["8", "11", "14", "5"], 1, "f(4) = 2 × 4 + 3 = 11."],
  ["Trigonometry", "Identities", "easy", "conceptual", "sin²θ + cos²θ equals", ["0", "1", "2", "tan θ"], 1, "This is the basic Pythagorean identity."],
  ["Quadratic Equations", "Roots", "easy", "numerical", "The roots of x² − 5x + 6 = 0 are", ["2 and 3", "−2 and −3", "1 and 6", "−1 and 6"], 0, "x² − 5x + 6 = (x − 2)(x − 3)."],
  ["Sequences and Series", "Arithmetic progression", "medium", "numerical", "The 10th term of the AP 3, 7, 11, … is", ["39", "43", "40", "37"], 0, "a₁₀ = a + 9d = 3 + 9 × 4 = 39."],
  ["Limits and Derivatives", "Power rule", "medium", "conceptual", "The derivative of x³ with respect to x is", ["x²", "3x²", "3x", "x⁴/4"], 1, "d/dx (xⁿ) = n xⁿ⁻¹, so 3x²."],
  ["Probability", "Two dice", "hard", "numerical", "Two fair dice are thrown. The probability of getting a sum of 7 is", ["1/6", "1/12", "7/36", "5/36"], 0, "6 favourable outcomes out of 36 = 1/6."],
  ["Permutations and Combinations", "Arrangements", "easy", "numerical", "In how many ways can the letters of the word CAT be arranged?", ["3", "6", "9", "27"], 1, "3! = 6."],
  ["Coordinate Geometry", "Distance formula", "easy", "numerical", "The distance between (0, 0) and (3, 4) is", ["5", "7", "25", "1"], 0, "√(3² + 4²) = √25 = 5."],
  ["Matrices", "Order of a product", "easy", "conceptual", "A is a 2 × 3 matrix and B is a 3 × 4 matrix. The order of AB is", ["3 × 3", "2 × 4", "4 × 2", "AB is not defined"], 1, "Rows of A by columns of B: 2 × 4."],
  ["Determinants", "2 × 2 determinant", "easy", "numerical", "The value of the determinant |2 3; 1 4| is", ["5", "11", "8", "−5"], 0, "2 × 4 − 3 × 1 = 5."],
  ["Integrals", "Basic integration", "easy", "conceptual", "∫ 2x dx equals", ["x + C", "x² + C", "2x² + C", "2 + C"], 1, "The integral of xⁿ is xⁿ⁺¹/(n+1), so 2 × x²/2 = x²."],
  ["Continuity and Differentiability", "Chain rule", "medium", "conceptual", "The derivative of sin 2x with respect to x is", ["cos 2x", "2 cos 2x", "−2 cos 2x", "2 sin x"], 1, "Chain rule: cos 2x × 2."],
  ["Vector Algebra", "Dot product", "medium", "numerical", "(2î + 3ĵ) · (î − ĵ) equals", ["5", "−1", "1", "−5"], 1, "2 × 1 + 3 × (−1) = −1."],
  ["Binomial Theorem", "Number of terms", "easy", "conceptual", "The number of terms in the expansion of (a + b)⁸ is", ["8", "9", "16", "7"], 1, "(a + b)ⁿ has n + 1 terms."],
  ["Complex Numbers", "Powers of i", "easy", "conceptual", "The value of i⁴ is", ["−1", "1", "i", "−i"], 1, "i² = −1, so i⁴ = 1."],
  ["Straight Lines", "Slope", "easy", "numerical", "The slope of the line through (1, 2) and (3, 6) is", ["1", "2", "3", "4"], 1, "(6 − 2) ÷ (3 − 1) = 2."],
];

const biology: Row[] = [
  ["Cell: The Unit of Life", "Cell organelles", "easy", "conceptual", "Which organelle is called the powerhouse of the cell?", ["Nucleus", "Ribosome", "Mitochondrion", "Golgi body"], 2, "Mitochondria produce ATP through cellular respiration."],
  ["Principles of Inheritance", "Monohybrid cross", "medium", "conceptual", "In Mendel's monohybrid cross, the F2 phenotypic ratio is", ["1:2:1", "3:1", "9:3:3:1", "1:1"], 1, "Dominant to recessive phenotypes appear in a 3:1 ratio."],
  ["Photosynthesis", "Site of photosynthesis", "easy", "conceptual", "Photosynthesis mainly takes place in the", ["mitochondria", "chloroplasts", "nucleus", "vacuole"], 1, "Chloroplasts contain chlorophyll."],
  ["Body Fluids and Circulation", "Blood clotting", "easy", "conceptual", "Which blood components help in clotting?", ["RBCs", "WBCs", "Platelets", "Plasma proteins only"], 2, "Platelets (thrombocytes) start the clotting process."],
  ["Molecular Basis of Inheritance", "Nucleic acids", "easy", "conceptual", "Which base is found in RNA but not in DNA?", ["Thymine", "Uracil", "Adenine", "Guanine"], 1, "RNA has uracil in place of thymine."],
  ["Cell Cycle and Division", "Meiosis", "medium", "conceptual", "Crossing over takes place during", ["prophase of mitosis", "prophase I of meiosis", "anaphase II of meiosis", "interphase"], 1, "Crossing over happens in the pachytene stage of prophase I."],
  ["Ecosystem", "Food chain", "easy", "conceptual", "In a food chain, green plants are", ["primary consumers", "producers", "decomposers", "secondary consumers"], 1, "Plants make their own food, so they are producers."],
  ["Excretory Products", "Kidney", "medium", "conceptual", "The functional unit of the kidney is the", ["neuron", "nephron", "alveolus", "villus"], 1, "Each kidney has about a million nephrons."],
  ["Biological Classification", "Five kingdoms", "easy", "factual", "The five-kingdom classification was proposed by", ["Linnaeus", "R. H. Whittaker", "Darwin", "Mendel"], 1, "Whittaker proposed it in 1969."],
  ["Plant Kingdom", "Gymnosperms", "easy", "conceptual", "Plants whose seeds are not enclosed in a fruit are called", ["angiosperms", "gymnosperms", "bryophytes", "pteridophytes"], 1, "Gymnosperm means naked seed."],
  ["Breathing and Exchange of Gases", "Site of exchange", "easy", "conceptual", "In humans, exchange of gases takes place in the", ["trachea", "bronchi", "alveoli", "larynx"], 2, "Alveoli have thin walls and many capillaries."],
  ["Neural Control", "Synapse", "easy", "conceptual", "The junction between two neurons is called a", ["dendrite", "synapse", "axon", "node of Ranvier"], 1, "Signals pass across the synapse."],
  ["Human Reproduction", "Fertilisation", "medium", "conceptual", "In humans, fertilisation usually takes place in the", ["uterus", "ovary", "ampulla of the fallopian tube", "cervix"], 2, "The sperm meets the ovum in the ampullary region."],
  ["Human Health and Disease", "Malaria", "easy", "factual", "Malaria is caused by", ["a virus", "Plasmodium", "a bacterium", "a fungus"], 1, "Plasmodium, carried by the female Anopheles mosquito."],
  ["Biotechnology Principles", "Restriction enzymes", "medium", "conceptual", "DNA is cut at specific sites by", ["DNA ligase", "restriction endonucleases", "DNA polymerase", "helicase"], 1, "Restriction enzymes are called molecular scissors."],
  ["Evolution", "Natural selection", "easy", "factual", "The theory of natural selection was given by", ["Lamarck", "Charles Darwin", "Hugo de Vries", "Mendel"], 1, "Darwin, in On the Origin of Species (1859)."],
];

const accountancy: Row[] = [
  ["Accounting Equation", "Capital", "easy", "numerical", "Assets are ₹5,00,000 and liabilities are ₹2,00,000. Capital is", ["₹7,00,000", "₹3,00,000", "₹2,00,000", "₹5,00,000"], 1, "Capital = Assets − Liabilities = ₹3,00,000."],
  ["Rules of Debit and Credit", "Expenses", "easy", "conceptual", "Under the modern approach, an increase in expenses is", ["credited", "debited", "not recorded", "added to capital"], 1, "Expenses increase on the debit side."],
  ["Journal", "Drawings", "easy", "conceptual", "Goods taken by the owner for personal use are debited to", ["Purchases A/c", "Drawings A/c", "Capital A/c", "Sales A/c"], 1, "Personal use by the owner is drawings."],
  ["Depreciation", "Straight line method", "medium", "numerical", "A machine costs ₹1,00,000, scrap value ₹10,000, life 9 years. Annual depreciation (straight line) is", ["₹10,000", "₹11,111", "₹9,000", "₹12,000"], 0, "(1,00,000 − 10,000) ÷ 9 = ₹10,000."],
  ["Trial Balance", "Purpose", "easy", "conceptual", "A trial balance is mainly prepared to check the", ["net profit", "arithmetical accuracy of ledger accounts", "cash in hand", "tax payable"], 1, "It checks that total debits equal total credits."],
  ["Partnership", "Profit sharing", "medium", "conceptual", "If there is no partnership deed, profits are shared", ["in capital ratio", "equally", "by experience", "as the bank decides"], 1, "Indian Partnership Act: equally, when there is no agreement."],
  ["Bank Reconciliation", "Unpresented cheques", "hard", "conceptual", "A cheque issued but not yet presented for payment makes the pass book balance", ["lower than the cash book", "higher than the cash book", "equal to the cash book", "zero"], 1, "The cash book is already reduced, the bank has not paid yet, so the pass book shows more."],
  ["Financial Statements", "Current assets", "easy", "conceptual", "Which of these is a current asset?", ["Building", "Goodwill", "Debtors", "Machinery"], 2, "Debtors are expected to turn into cash within a year."],
  ["Bills of Exchange", "Parties", "easy", "conceptual", "A bill of exchange is drawn (written) by the", ["drawee", "drawer", "payee", "bank"], 1, "The creditor (drawer) writes the bill."],
  ["Accounting Principles", "Prudence", "medium", "conceptual", "'Provide for all expected losses but not for expected profits' is the principle of", ["consistency", "prudence (conservatism)", "going concern", "matching"], 1, "That is the prudence or conservatism principle."],
  ["Cash Book", "Contra entry", "medium", "conceptual", "Cash deposited into the bank is recorded in a double column cash book as a", ["journal entry", "contra entry", "compound entry", "closing entry"], 1, "It affects both the cash and bank columns."],
];

const business: Row[] = [
  ["Principles of Management", "Fayol", "easy", "conceptual", "Who gave the 14 principles of management?", ["F. W. Taylor", "Henri Fayol", "Peter Drucker", "Philip Kotler"], 1, "Henri Fayol proposed the 14 principles."],
  ["Nature of Management", "Functions", "easy", "conceptual", "Which function of management comes first?", ["Organising", "Staffing", "Planning", "Controlling"], 2, "Planning is the primary function."],
  ["Forms of Business", "Sole proprietorship", "easy", "conceptual", "The liability of a sole proprietor is", ["limited", "unlimited", "limited to capital invested", "shared with partners"], 1, "The owner's personal assets can be used to pay business debts."],
  ["Marketing", "Marketing mix", "easy", "conceptual", "Product, Price, Place and Promotion together are called the", ["marketing mix", "sales mix", "product mix", "promotion mix"], 0, "These are the 4Ps of the marketing mix."],
  ["Financial Management", "Dividend", "easy", "conceptual", "Dividend is paid to", ["debenture holders", "shareholders", "creditors", "banks"], 1, "Dividend is the share of profit paid to shareholders."],
  ["Consumer Protection", "Law", "medium", "conceptual", "Consumer rights in India are mainly protected by the", ["Companies Act", "Consumer Protection Act", "Indian Contract Act", "Partnership Act"], 1, "The Consumer Protection Act, 2019."],
  ["Staffing", "Recruitment", "medium", "conceptual", "Recruitment means", ["choosing the final candidate", "searching for and attracting candidates", "training employees", "firing employees"], 1, "Selection comes after recruitment."],
  ["Business Environment", "LPG reforms", "easy", "conceptual", "India's Liberalisation, Privatisation and Globalisation reforms started in", ["1947", "1991", "2001", "1969"], 1, "The New Economic Policy of 1991."],
  ["Directing", "Motivation", "easy", "conceptual", "Maslow's need hierarchy theory is related to", ["planning", "motivation", "controlling", "staffing"], 1, "It explains what motivates people."],
  ["Controlling", "Process", "easy", "conceptual", "Comparing actual performance with set standards is part of", ["planning", "controlling", "organising", "staffing"], 1, "Controlling checks results against standards."],
  ["Business Services", "Types of services", "easy", "conceptual", "Which of these is a business service?", ["Insurance", "Making cars", "Farming", "Mining"], 0, "Insurance, banking, transport and warehousing are business services."],
];

const economics: Row[] = [
  ["Theory of Demand", "Law of demand", "easy", "conceptual", "By the law of demand, when price rises (other things equal), quantity demanded", ["rises", "falls", "stays the same", "doubles"], 1, "Price and quantity demanded move in opposite directions."],
  ["Consumer Behaviour", "Utility", "easy", "conceptual", "The extra satisfaction from consuming one more unit of a good is called", ["total utility", "marginal utility", "average utility", "zero utility"], 1, "That is marginal utility."],
  ["Market Forms", "Monopoly", "easy", "conceptual", "A market with only one seller is called", ["perfect competition", "monopoly", "oligopoly", "monopolistic competition"], 1, "Mono means one."],
  ["National Income", "GDP", "medium", "conceptual", "GDP measures", ["the total money supply", "the market value of final goods and services produced in a country in a year", "government revenue", "exports minus imports"], 1, "That is the standard definition of GDP."],
  ["Money and Banking", "Central bank", "easy", "conceptual", "The central bank of India is the", ["SBI", "RBI", "NABARD", "SEBI"], 1, "The Reserve Bank of India."],
  ["Elasticity", "Price elasticity", "hard", "numerical", "Price falls by 10% and quantity demanded rises by 20%. Price elasticity of demand is", ["0.5", "1", "2", "20"], 2, "Ed = 20% ÷ 10% = 2."],
  ["Production", "Law of variable proportions", "medium", "conceptual", "Short-run production with one variable input follows the law of", ["demand", "variable proportions", "supply", "diminishing utility"], 1, "Returns to a factor in the short run."],
  ["Indian Economy", "Institutions", "medium", "conceptual", "Which body replaced the Planning Commission in 2015?", ["NITI Aayog", "Finance Commission", "RBI", "SEBI"], 0, "NITI Aayog was set up on 1 January 2015."],
  ["Theory of Supply", "Law of supply", "easy", "conceptual", "By the law of supply, when price rises (other things equal), quantity supplied", ["falls", "rises", "stays the same", "becomes zero"], 1, "Price and quantity supplied move in the same direction."],
  ["Government Budget", "Fiscal deficit", "medium", "conceptual", "Fiscal deficit equals total expenditure minus", ["revenue receipts only", "total receipts excluding borrowings", "capital receipts", "tax revenue only"], 1, "It shows how much the government must borrow."],
  ["Statistics for Economics", "Median", "easy", "numerical", "The median of 3, 7, 9, 12, 15 is", ["7", "9", "12", "9.2"], 1, "Five values in order; the middle one is 9."],
];

const maths10: Row[] = [
  ["Real Numbers", "HCF", "easy", "numerical", "The HCF of 12 and 18 is", ["3", "6", "36", "2"], 1, "Common factors are 1, 2, 3, 6. Highest is 6."],
  ["Polynomials", "Zeroes", "easy", "numerical", "The zeroes of x² − 9 are", ["3 and −3", "9 and −9", "3 only", "0 and 9"], 0, "x² − 9 = (x − 3)(x + 3)."],
  ["Pair of Linear Equations", "Elimination", "easy", "numerical", "If x + y = 10 and x − y = 2, then x is", ["4", "6", "8", "5"], 1, "Adding: 2x = 12, so x = 6."],
  ["Trigonometry", "Standard values", "easy", "conceptual", "tan 45° equals", ["0", "1", "√3", "1/√3"], 1, "tan 45° = 1."],
  ["Areas Related to Circles", "Area", "medium", "numerical", "The area of a circle of radius 7 cm (π = 22/7) is", ["154 cm²", "44 cm²", "49 cm²", "308 cm²"], 0, "πr² = 22/7 × 49 = 154 cm²."],
  ["Statistics", "Mean", "easy", "numerical", "The mean of 2, 4, 6, 8, 10 is", ["5", "6", "7", "30"], 1, "Sum 30 ÷ 5 = 6."],
  ["Probability", "Coin toss", "easy", "conceptual", "The probability of getting a head when a fair coin is tossed is", ["0", "1/2", "1", "1/4"], 1, "One favourable outcome out of two."],
  ["Triangles", "Pythagoras theorem", "medium", "numerical", "A right triangle has legs 6 cm and 8 cm. Its hypotenuse is", ["10 cm", "14 cm", "12 cm", "7 cm"], 0, "√(36 + 64) = √100 = 10 cm."],
];

const physics10: Row[] = [
  ["Light", "Lens power", "easy", "conceptual", "The SI unit of the power of a lens is", ["watt", "dioptre", "metre", "joule"], 1, "Power of a lens is measured in dioptres."],
  ["Electricity", "Ohm's law", "easy", "conceptual", "According to Ohm's law, V equals", ["I/R", "IR", "R/I", "I²R"], 1, "V = IR."],
  ["Magnetic Effects of Current", "Devices", "medium", "conceptual", "Which device converts mechanical energy into electrical energy?", ["Electric motor", "Electric generator", "Transformer", "Galvanometer"], 1, "A generator works on electromagnetic induction."],
  ["Light", "Plane mirror", "easy", "conceptual", "The image formed by a plane mirror is", ["real and inverted", "virtual and erect", "real and erect", "virtual and inverted"], 1, "It is virtual, erect and the same size."],
  ["Electricity", "Series resistance", "easy", "numerical", "Resistors of 3 Ω and 5 Ω are joined in series. The total resistance is", ["2 Ω", "8 Ω", "15 Ω", "1.9 Ω"], 1, "In series, R = 3 + 5 = 8 Ω."],
  ["Human Eye", "Myopia", "medium", "conceptual", "Myopia (short-sightedness) is corrected using a", ["convex lens", "concave lens", "plane mirror", "prism"], 1, "A concave lens of suitable power fixes it."],
];

const chemistry10: Row[] = [
  ["Chemical Reactions and Equations", "Oxidation", "easy", "conceptual", "Rusting of iron is an example of", ["reduction", "oxidation", "neutralisation", "decomposition"], 1, "Iron combines with oxygen and moisture."],
  ["Acids, Bases and Salts", "pH scale", "easy", "conceptual", "A solution with pH 2 is", ["strongly acidic", "neutral", "weakly basic", "strongly basic"], 0, "pH below 7 is acidic. 2 is strongly acidic."],
  ["Metals and Non-metals", "Properties", "easy", "conceptual", "Which metal is a liquid at room temperature?", ["Sodium", "Mercury", "Aluminium", "Iron"], 1, "Mercury is liquid at room temperature."],
  ["Carbon and its Compounds", "Bonding", "easy", "conceptual", "Carbon mostly forms", ["ionic bonds", "covalent bonds", "metallic bonds", "no bonds"], 1, "Carbon shares electrons, so its bonds are covalent."],
  ["Acids, Bases and Salts", "Indicators", "easy", "conceptual", "An acid turns blue litmus", ["red", "blue", "green", "colourless"], 0, "Acids turn blue litmus red."],
  ["Chemical Reactions and Equations", "Balancing", "medium", "numerical", "In the balanced equation 2H₂ + O₂ → 2H₂O, the number of oxygen atoms on each side is", ["1", "2", "4", "3"], 1, "O₂ gives 2 on the left; 2H₂O gives 2 on the right."],
];

const biology10: Row[] = [
  ["Life Processes", "Digestion", "easy", "conceptual", "Which organ produces bile?", ["Pancreas", "Liver", "Stomach", "Small intestine"], 1, "Bile is made in the liver and stored in the gall bladder."],
  ["Heredity", "Sex determination", "medium", "conceptual", "The sex of a human child is decided by", ["the mother's X chromosome", "the chromosome (X or Y) from the father", "the environment", "the mother's Y chromosome"], 1, "The father passes either X (girl) or Y (boy)."],
  ["Life Processes", "Photosynthesis", "easy", "conceptual", "For photosynthesis, plants take in", ["oxygen", "carbon dioxide", "nitrogen", "hydrogen"], 1, "CO₂ and water make glucose using sunlight."],
  ["Control and Coordination", "Hormones", "easy", "conceptual", "Which hormone controls the blood sugar level?", ["Adrenaline", "Insulin", "Thyroxine", "Growth hormone"], 1, "Insulin from the pancreas lowers blood sugar."],
  ["How do Organisms Reproduce", "Asexual reproduction", "easy", "conceptual", "Amoeba reproduces by", ["budding", "binary fission", "spore formation", "fragmentation"], 1, "The cell splits into two."],
  ["Our Environment", "Ozone layer", "easy", "conceptual", "The ozone layer protects us from", ["infrared rays", "ultraviolet (UV) rays", "radio waves", "visible light"], 1, "Ozone absorbs harmful UV radiation."],
];

// Social Studies for the Class 10 test: History + Geography only
const social10: Row[] = [
  ["Nationalism in India", "Non-Cooperation", "easy", "factual", "The Non-Cooperation Movement was launched in", ["1905", "1920", "1942", "1930"], 1, "Launched by Gandhiji in 1920."],
  ["Resources and Development", "Soils", "easy", "factual", "Black soil is best suited for growing", ["rice", "cotton", "tea", "wheat"], 1, "Black soil is also called black cotton soil."],
  ["Nationalism in India", "Gandhi", "easy", "factual", "Who wrote 'Hind Swaraj'?", ["Jawaharlal Nehru", "Mahatma Gandhi", "B. R. Ambedkar", "Rabindranath Tagore"], 1, "Gandhiji wrote it in 1909."],
  ["Minerals and Energy Resources", "Non-renewable resources", "easy", "conceptual", "Which is a non-renewable resource?", ["Solar energy", "Wind energy", "Coal", "Water"], 2, "Coal takes millions of years to form."],
  ["Rise of Nationalism in Europe", "Italian unification", "medium", "factual", "Which leaders are linked with the unification of Italy?", ["Bismarck and Kaiser William", "Garibaldi and Cavour", "Napoleon and Louis XVI", "Lenin and Stalin"], 1, "Mazzini, Cavour and Garibaldi led Italian unification."],
  ["Nationalism in India", "Civil Disobedience", "easy", "factual", "Gandhiji's Dandi March (Salt March) took place in", ["1919", "1930", "1942", "1947"], 1, "March to April 1930."],
  ["Water Resources", "Dams", "medium", "factual", "The Bhakra Nangal dam is built on the river", ["Ganga", "Sutlej", "Narmada", "Krishna"], 1, "It is on the Sutlej in Himachal Pradesh."],
  ["Agriculture", "Cropping seasons", "easy", "conceptual", "Rice is mainly a", ["rabi crop", "kharif crop", "zaid crop", "plantation crop"], 1, "It is sown with the monsoon rains."],
];

const english: Row[] = [
  ["Grammar", "Subject-verb agreement", "easy", "verbal", "Choose the correct sentence.", ["She don't like tea.", "She doesn't likes tea.", "She doesn't like tea.", "She not like tea."], 2, "Does/doesn't takes the base form of the verb."],
  ["Vocabulary", "Synonyms", "easy", "verbal", "Choose the synonym of 'abundant'.", ["scarce", "plentiful", "tiny", "rare"], 1, "Abundant means plentiful."],
  ["Vocabulary", "Antonyms", "easy", "verbal", "Choose the antonym of 'ancient'.", ["old", "modern", "historic", "aged"], 1, "Ancient means very old; modern is the opposite."],
  ["Grammar", "Tenses", "medium", "verbal", "By next year, she ___ her course.", ["completes", "will have completed", "completed", "has completed"], 1, "Future perfect for an action finished before a future time."],
  ["Grammar", "Prepositions", "easy", "verbal", "He is good ___ mathematics.", ["in", "at", "on", "for"], 1, "'Good at' is the correct phrase."],
  ["Grammar", "Voice", "medium", "verbal", "Choose the passive form of 'Ravi wrote a letter.'", ["A letter is written by Ravi.", "A letter was written by Ravi.", "A letter has been written by Ravi.", "Ravi was written a letter."], 1, "Simple past active becomes 'was + past participle'."],
  ["Grammar", "Articles", "easy", "verbal", "She is ___ honest girl.", ["a", "an", "the", "no article"], 1, "'Honest' starts with a vowel sound."],
  ["Vocabulary", "Spelling", "easy", "verbal", "Choose the correctly spelt word.", ["Recieve", "Receive", "Receeve", "Reiceve"], 1, "'i before e except after c'."],
];

const aptitude: Row[] = [
  ["Numerical Reasoning", "Number series", "medium", "numerical", "Find the next number: 2, 6, 12, 20, 30, ?", ["40", "42", "44", "36"], 1, "Differences are 4, 6, 8, 10, so the next is +12 = 42."],
  ["Numerical Reasoning", "Number series", "easy", "numerical", "Find the next number: 3, 9, 27, 81, ?", ["162", "243", "108", "324"], 1, "Each term is multiplied by 3."],
  ["Numerical Reasoning", "Percentages", "easy", "numerical", "20% of 450 is", ["80", "90", "100", "45"], 1, "0.2 × 450 = 90."],
  ["Numerical Reasoning", "Ratio", "easy", "numerical", "₹600 is divided in the ratio 1 : 2. The larger share is", ["₹200", "₹300", "₹400", "₹450"], 2, "2/3 × 600 = ₹400."],
  ["Numerical Reasoning", "Speed", "easy", "numerical", "A train covers 180 km in 3 hours. Its speed is", ["50 km/h", "60 km/h", "90 km/h", "540 km/h"], 1, "180 ÷ 3 = 60 km/h."],
  ["Logical Reasoning", "Coding-decoding", "medium", "logical", "If CAT is coded as DBU, how is DOG coded?", ["EPH", "CNF", "EOG", "DPH"], 0, "Each letter moves one step forward."],
  ["Logical Reasoning", "Odd one out", "easy", "logical", "Find the odd one out.", ["Apple", "Mango", "Potato", "Banana"], 2, "Potato is a vegetable; the rest are fruits."],
  ["Verbal Reasoning", "Analogy", "easy", "verbal", "Book : Author :: Painting : ?", ["Canvas", "Painter", "Brush", "Gallery"], 1, "An author creates a book; a painter creates a painting."],
  ["Logical Reasoning", "Directions", "medium", "logical", "Ravi walks 4 km north, then 3 km east. How far is he from the starting point?", ["7 km", "5 km", "1 km", "12 km"], 1, "√(4² + 3²) = 5 km."],
  ["Logical Reasoning", "Blood relations", "easy", "logical", "A is B's father. C is A's father. How is C related to B?", ["Father", "Uncle", "Grandfather", "Brother"], 2, "C is the father of B's father."],
  ["Numerical Reasoning", "Profit and loss", "medium", "numerical", "An item bought for ₹200 is sold for ₹250. The profit percentage is", ["20%", "25%", "50%", "30%"], 1, "Profit 50 ÷ 200 × 100 = 25%."],
  ["Logical Reasoning", "Syllogism", "medium", "logical", "All pens are tools. All tools are useful. Which conclusion definitely follows?", ["All pens are useful.", "All useful things are pens.", "Some tools are not pens.", "No pen is useful."], 0, "Pens are inside tools, and tools are inside useful things."],
];

// Part C: not right or wrong. Options are tagged with an interest.
type CRow = [string, [string, string, string, string]];
const careerRows: CRow[] = [
  ["Which would you enjoy most on a free day?", ["Building or fixing a gadget or an app", "Learning how the human body works", "Running a small stall and counting the profit", "Debating, writing or making a video"]],
  ["Which school project sounds most fun?", ["Making a working robot model", "Studying plants or animals in a lab", "Planning the budget for a class trip", "Organising a school event or newsletter"]],
  ["Which video would you click first?", ["How rockets or computer chips work", "How doctors do a surgery", "How a small startup became a big company", "How a famous court case was won"]],
  ["Friends usually come to you for", ["Tricky maths or tech problems", "Health or biology doubts", "Ideas about money or deals", "Advice and talking things through"]],
  ["Where do you picture yourself working?", ["A tech company or a factory", "A hospital or a research lab", "A bank, an office or my own business", "A courtroom, a newsroom or a classroom"]],
  ["Which subject do you look forward to most?", ["Maths or Physics", "Biology or Chemistry", "Accounts or Economics", "English or Social Science"]],
  ["Which problem would you most like to solve?", ["Make transport or energy cleaner", "Find a cure for a disease", "Help small businesses grow", "Make sure people get justice"]],
  ["How do you like to work?", ["With machines, code or numbers", "With living things and experiments", "With money, plans and targets", "With people, words and ideas"]],
];
const TAGS = ["tech", "health", "business", "people"] as const;

function careerBank(): Question[] {
  return careerRows.map(([text, opts], i) => ({
    id: `fit-${String(i + 1).padStart(2, "0")}`,
    part: "C" as const,
    subject: "Career Fit",
    chapter: "Interests",
    topic: "Career interest",
    difficulty: "easy" as const,
    skill: "interest",
    text: { en: text },
    options: opts.map((en, j) => ({ id: IDS[j], en, tag: TAGS[j] })),
    answer: null,
    explanation: "",
    active: true,
  }));
}

/** Starter-bank version. Raise it when questions change so `npm run db:setup` upgrades old databases. */
export const Q_SEED_VERSION = 2;

/** Old starter subjects that the current test blueprint no longer uses (kept for old results, made inactive). */
export const RETIRED_SEED_PREFIXES = ["s10-", "sst-"];

export function seedQuestions(): Question[] {
  return [
    ...bank("Physics", "A", "phy", physics),
    ...bank("Chemistry", "A", "che", chemistry),
    ...bank("Mathematics", "A", "mat", maths),
    ...bank("Biology", "A", "bio", biology),
    ...bank("Accountancy", "A", "acc", accountancy),
    ...bank("Business Studies", "A", "bst", business),
    ...bank("Economics", "A", "eco", economics),
    ...bank("Maths (Class 10)", "A", "m10", maths10),
    ...bank("Physics (Class 10)", "A", "p10", physics10),
    ...bank("Chemistry (Class 10)", "A", "c10", chemistry10),
    ...bank("Biology (Class 10)", "A", "b10", biology10),
    ...bank("Social Studies", "A", "ss10", social10),
    ...bank("English", "A", "eng", english),
    ...bank("Aptitude", "B", "apt", aptitude),
    ...careerBank(),
  ];
}
