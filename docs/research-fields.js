/* Shared discipline-specific research taxonomy for Discover and the workspace. */
(function(){
const FIELDS={
 highenergy:{"name":"High-energy physics & particle physics","summary":"Quantum field theory, collider phenomenology, fundamental particles, cosmology, strings and lattice gauge theories.","topics":["Quantum field theory","Standard Model phenomenology","Beyond the Standard Model","Collider physics and experiments","Lattice gauge theory and QCD","Particle astrophysics and neutrinos","String theory and quantum gravity","Supersymmetry and supergravity","Effective field theories","Higgs and electroweak physics","Scattering amplitudes","Early-universe particle cosmology"],"queries":["precision collider phenomenology LHC","effective field theory scattering amplitudes","lattice QCD hadron spectroscopy"],"workflow":["Identify physical scales, renormalization conventions and EFT validity.","Check observables, perturbative order, luminosities and statistical systematics.","Compare assumptions, experimental limits, and arXiv versions."]},
 quantum:{name:"Quantum information & physics",summary:"Theory, protocols, quantum foundations, photonics, devices and experimental platforms.",topics:["Quantum key distribution","Bell nonlocality","Quantum steering","Contextuality","Quantum networks","Quantum sensing","Quantum error correction","Quantum computing","Optomechanics","Entanglement theory"],queries:["device independent quantum cryptography","measurement incompatibility steering","quantum networks Bell inequalities"],workflow:["Verify operational assumptions and device trust models.","Compare noise models and experimental feasibility.","Inspect mathematical proofs and alternative security bounds."]},
 statmech:{"name":"Statistical mechanics","summary":"Equilibrium and nonequilibrium statistical physics, criticality, stochastic dynamics, disordered systems and thermodynamics.","topics":["Phase transitions and critical phenomena","Nonequilibrium statistical mechanics","Stochastic processes and fluctuations","Statistical field theory and renormalization","Disordered systems and spin glasses","Exactly solvable models","Computational statistical mechanics","Complex systems and networks","Active matter","Thermodynamics and information","Soft matter statistical physics","Quantum statistical mechanics"],"queries":["critical phenomena renormalization group universality","nonequilibrium fluctuation theorems stochastic thermodynamics","spin glasses replica symmetry breaking"],"workflow":["Identify ensembles, finite-size scaling and thermodynamic limits.","Check equilibrium assumptions, detailed balance and finite-time effects.","Compare universality classes, fluctuations and numerical convergence."]},
 condmat:{"name":"Condensed matter physics","summary":"Quantum and classical many-body matter, phases, strongly correlated electrons, superconductivity, materials, quantum gases and soft matter.","topics":["Strongly correlated electrons","Superconductivity","Topological phases of matter","Quantum magnetism and spin systems","Two-dimensional and moiré materials","Semiconductors and electronic transport","Quantum gases and ultracold atoms","Materials science and electronic structure","Soft condensed matter","Disorder and localization","Nonequilibrium many-body dynamics","Spectroscopy and experimental probes"],"queries":["strongly correlated electrons Hubbard model","topological phases and quantum materials","twisted bilayer graphene superconductivity"],"workflow":["Check lattice models, approximations and sample geometry.","Compare electronic structure, transport observables and phase diagrams.","Inspect experimental temperatures, disorder and finite-size effects."]},
 mathematics:{name:"Mathematics",summary:"Pure and applied mathematics, including analysis, algebra, topology and optimization.",topics:["Algebraic geometry","Number theory","Topology","Functional analysis","Probability theory","Combinatorics","Optimization","Mathematical physics","Differential geometry"],queries:["semidefinite programming convergence","operator algebras quantum information","combinatorial optimization"],workflow:["Identify precise definitions and hypotheses.","Trace theorem dependencies and counterexamples.","Check proof details against original sources."]},
 astrophysics:{name:"Astronomy & astrophysics",summary:"Cosmology, gravitational waves, galaxies, compact objects and observational astronomy.",topics:["Cosmology","Gravitational waves","Black holes","Exoplanets","Galactic dynamics","High-energy astrophysics","Radio astronomy","Numerical relativity","Dark matter"],queries:["gravitational wave population inference","dark matter cosmological constraints","exoplanet atmosphere spectroscopy"],workflow:["Check instruments, sky surveys and selection functions.","Compare parameter inference, uncertainty and systematics.","Distinguish observational evidence from simulations."]},
 computer:{name:"Computer science & AI",summary:"Algorithms, machine learning, formal methods, systems and human-centered computing.",topics:["Machine learning","Large language models","Algorithms","Formal verification","Computer vision","Distributed systems","Cybersecurity","Information theory","Human computer interaction"],queries:["retrieval augmented generation evaluation","formal verification neural networks","efficient transformer inference"],workflow:["Read evaluation datasets and baselines.","Check ablations, compute requirements and leakage.","Look for reproducible source code and artifacts."]},
 biology:{name:"Biology & bioinformatics",summary:"Molecular, cellular and computational life science.",topics:["Genomics","Proteomics","Computational biology","Evolution","Neuroscience","Molecular biology","Systems biology","Structural biology","Ecology"],queries:["single cell RNA sequencing integration","protein structure prediction validation","evolutionary genomics"],workflow:["Check organisms, sample sizes and experimental design.","Inspect statistical uncertainty and replication.","Check accessions and data availability statements."]},
 medicine:{name:"Medicine & public health",summary:"Clinical research, epidemiology, diagnostics and population health.",topics:["Clinical trials","Epidemiology","Oncology","Cardiology","Neuroscience","Immunology","Diagnostics","Global health","Public health"],queries:["randomized clinical trial meta analysis","diagnostic accuracy external validation","population cohort study"],workflow:["Identify study design, endpoints and preregistration.","Compare effect size, uncertainty and confounding.","Assess clinical applicability and evidence quality."]},
 chemistry:{name:"Chemistry & materials",summary:"Chemical synthesis, condensed matter, materials discovery and characterization.",topics:["Materials science","Catalysis","Organic chemistry","Electrochemistry","Battery materials","Spectroscopy","Nanomaterials","Computational chemistry","Polymers"],queries:["solid state battery electrolyte stability","photocatalysis reaction mechanism","density functional theory materials"],workflow:["Check synthesis and characterization protocols.","Compare structural evidence and uncertainty.","Look for stability, scale-up and independent replication."]},
 engineering:{name:"Engineering & robotics",summary:"Controls, electrical engineering, energy systems and robotics.",topics:["Robotics","Control theory","Signal processing","Renewable energy","Microelectronics","Wireless communications","Mechanical engineering","Optimization","Sensors"],queries:["model predictive control robotics","autonomous navigation uncertainty","power electronics renewable integration"],workflow:["Identify operating ranges and system constraints.","Check experimental benchmarks and failure cases.","Compare deployment cost, reliability and performance."]},
 social:{name:"Social sciences & economics",summary:"Economics, psychology, political science, education and social research.",topics:["Econometrics","Behavioral science","Education","Development economics","Political science","Sociology","Public policy","Psychology","Causal inference"],queries:["difference in differences causal inference","policy evaluation randomized experiment","education intervention meta analysis"],workflow:["Check causal identification and measurement validity.","Inspect sampling, uncertainty and generalizability.","Distinguish observational results from causal claims."]}
};

// Field-specific subtopics refine a researcher's chosen main topic.
// They are curated search prompts, not a validated classification ontology.
const SUBTOPICS={
 highenergy:{"Quantum field theory":["Renormalization and anomalous dimensions","Conformal and supersymmetric field theories","Nonperturbative gauge theories","Finite-temperature field theory"],"Standard Model phenomenology":["Precision QCD and electroweak observables","Flavor physics and CP violation","Hadron spectroscopy and fragmentation","Parton distribution functions"],"Beyond the Standard Model":["Dark matter particle models","Axions and hidden sectors","New gauge bosons and exotic particles","Leptoquarks and compositeness"],"Collider physics and experiments":["LHC searches and measurements","Future colliders and detector concepts","Jets and event-shape observables","Statistical inference and unfolding"],"Lattice gauge theory and QCD":["Lattice QCD thermodynamics","Hadron masses and matrix elements","Monte Carlo gauge-field algorithms","Lattice electroweak and BSM"],"Particle astrophysics and neutrinos":["Neutrino oscillations and masses","Neutrinoless double beta decay","Cosmic rays and indirect detection","High-energy neutrino telescopes"],"String theory and quantum gravity":["AdS/CFT correspondence","Black holes and holography","String compactifications","Quantum gravity and information"],"Supersymmetry and supergravity":["Supersymmetric model building","Supergravity solutions","Supersymmetry breaking","Superconformal field theories"],"Effective field theories":["Standard Model effective field theory","Heavy quark effective theory","Chiral perturbation theory","Matching and running Wilson coefficients"],"Higgs and electroweak physics":["Higgs coupling measurements","Electroweak precision tests","Electroweak symmetry breaking","Higgs potential and phase transitions"],"Scattering amplitudes":["Spinor-helicity and on-shell methods","Loop integrals and multi-loop calculations","Amplitude bootstrap","Infrared and collinear factorization"],"Early-universe particle cosmology":["Inflation and primordial perturbations","Baryogenesis and leptogenesis","Cosmological phase transitions","Dark-sector cosmology"]},
 statmech:{"Phase transitions and critical phenomena":["Critical exponents and universality classes","Finite-size scaling and Binder cumulants","Dynamic critical phenomena","Percolation and scaling"],"Nonequilibrium statistical mechanics":["Driven diffusive systems","Nonequilibrium steady states","Aging and coarsening dynamics","Fluctuation-dissipation violations"],"Stochastic processes and fluctuations":["Langevin and Fokker–Planck equations","Large-deviation theory","First-passage processes","Fluctuation theorems"],"Statistical field theory and renormalization":["Renormalization-group flow","Conformal field theory","Functional renormalization group","Critical scaling and effective field theories"],"Disordered systems and spin glasses":["Edwards–Anderson spin glass","Replica symmetry breaking","Random-field Ising model","Glassy dynamics and jamming"],"Exactly solvable models":["Ising and Potts models","Bethe ansatz and integrability","Exclusion processes","Reaction–diffusion models"],"Computational statistical mechanics":["Monte Carlo sampling","Wang–Landau sampling","Cluster algorithms and critical slowing down","Molecular dynamics and rare events"],"Complex systems and networks":["Complex networks and epidemics","Synchronization and collective behavior","Self-organized criticality","Evolutionary dynamics"],"Active matter":["Active Brownian particles","Motility-induced phase separation","Active nematics","Collective motion and flocking"],"Thermodynamics and information":["Stochastic thermodynamics","Entropy production","Information engines and Maxwell demons","Thermodynamic uncertainty relations"],"Soft matter statistical physics":["Polymer statistical mechanics","Colloids and gels","Granular matter","Liquid crystals"],"Quantum statistical mechanics":["Quantum thermalization and ETH","Many-body localization","Open quantum systems","Quantum fluctuation relations"]},
 condmat:{"Strongly correlated electrons":["Hubbard and t–J models","Mott transitions","Heavy-fermion and Kondo physics","Dynamical mean-field theory"],"Superconductivity":["BCS and unconventional pairing","High-temperature superconductors","Josephson junctions and proximity effects","Vortices and superconducting fluctuations"],"Topological phases of matter":["Topological insulators","Topological superconductors","Fractional quantum Hall effect","Topological order and anyons"],"Quantum magnetism and spin systems":["Quantum spin liquids","Frustrated magnetism","Magnons and spin waves","Spintronics and spin transport"],"Two-dimensional and moiré materials":["Twisted bilayer graphene","Transition-metal dichalcogenides","Moiré correlated states","Van der Waals heterostructures"],"Semiconductors and electronic transport":["Mesoscopic transport","Quantum Hall systems","Semiconductor quantum dots","Localization and quantum interference"],"Quantum gases and ultracold atoms":["Bose–Einstein condensation","Fermi gases and BCS–BEC crossover","Optical lattices and cold atoms","Synthetic gauge fields"],"Materials science and electronic structure":["Density functional theory","Band structure and Fermi surfaces","Phonons and electron–phonon coupling","Ab initio many-body methods"],"Soft condensed matter":["Colloids and soft interfaces","Polymers and rheology","Liquid crystals","Glasses and granular matter"],"Disorder and localization":["Anderson localization","Many-body localization","Disordered superconductors","Quantum percolation"],"Nonequilibrium many-body dynamics":["Quantum quenches","Floquet matter","Transport and hydrodynamics","Thermalization and prethermalization"],"Spectroscopy and experimental probes":["Angle-resolved photoemission (ARPES)","Scanning tunneling microscopy (STM)","Neutron and X-ray scattering","Ultrafast pump–probe spectroscopy"]},
 quantum:{
 "Quantum key distribution":["Device-independent QKD","One-sided-device-independent QKD","Finite-key security"],
 "Bell nonlocality":["CHSH and multipartite inequalities","Sequential Bell nonlocality","Network nonlocality"],
 "Quantum steering":["Multipartite steering","Network steering","Measurement incompatibility"],
 "Contextuality":["Preparation contextuality","Generalized noncontextuality","Contextuality in sensing"],
 "Quantum networks":["Bilocality","Triangle networks","Entanglement swapping"],
 "Quantum sensing":["Quantum metrology","Distributed quantum sensing","Squeezed-state sensing"],
 "Quantum error correction":["Quantum LDPC codes","Fault-tolerant thresholds","Bosonic quantum codes"],
 "Quantum computing":["Quantum algorithms","NISQ error mitigation","Quantum circuit complexity"],
 "Optomechanics":["Macroscopic quantum states","Mechanical squeezing","Quantum Zeno dynamics"],
 "Entanglement theory":["Entanglement witnesses","Multipartite entanglement","Entanglement distillation"]},
 mathematics:{
 "Algebraic geometry":["Moduli spaces","Birational geometry","Arithmetic geometry"],
 "Number theory":["Analytic number theory","Diophantine equations","Algebraic number theory"],
 "Topology":["Low-dimensional topology","Homotopy theory","Knot invariants"],
 "Functional analysis":["Operator algebras","Banach spaces","Spectral theory"],
 "Probability theory":["Stochastic processes","Random matrices","Concentration inequalities"],
 "Combinatorics":["Extremal combinatorics","Graph theory","Algebraic combinatorics"],
 "Optimization":["Convex optimization","Semidefinite programming","Nonconvex optimization"],
 "Mathematical physics":["Quantum probability","Integrable systems","Spectral geometry"],
 "Differential geometry":["Riemannian geometry","Geometric analysis","Ricci flow"]},
 astrophysics:{
 "Cosmology":["Cosmic microwave background","Large-scale structure","Early universe inflation"],
 "Gravitational waves":["Waveform modelling","Detector data analysis","Compact binary populations"],
 "Black holes":["Accretion physics","Black-hole thermodynamics","Event horizon imaging"],
 "Exoplanets":["Atmosphere spectroscopy","Planet detection","Planet formation"],
 "Galactic dynamics":["Stellar kinematics","Milky Way structure","Galaxy mergers"],
 "High-energy astrophysics":["Gamma-ray bursts","Cosmic rays","Active galactic nuclei"],
 "Radio astronomy":["Fast radio bursts","Radio interferometry","Pulsars"],
 "Numerical relativity":["Binary merger simulations","Gravitational collapse","Relativistic hydrodynamics"],
 "Dark matter":["Direct detection","Dark matter halos","Particle dark matter"]},
 computer:{
 "Machine learning":["Representation learning","Self-supervised learning","Robust generalization"],
 "Large language models":["Retrieval augmented generation","Language model evaluation","Efficient inference"],
 "Algorithms":["Approximation algorithms","Parameterized complexity","Streaming algorithms"],
 "Formal verification":["Model checking","Program synthesis","Proof assistants"],
 "Computer vision":["Image segmentation","3D scene understanding","Vision transformers"],
 "Distributed systems":["Consensus protocols","Fault tolerance","Distributed databases"],
 "Cybersecurity":["Cryptographic protocols","Adversarial attacks","Privacy preserving computation"],
 "Information theory":["Coding theory","Channel capacity","Network information theory"],
 "Human computer interaction":["Accessibility research","Usability evaluation","Human AI interaction"]},
 biology:{
 "Genomics":["Single-cell genomics","Genome-wide association studies","Epigenomics"],
 "Proteomics":["Mass spectrometry proteomics","Protein interactions","Quantitative proteomics"],
 "Computational biology":["Systems modelling","Sequence analysis","Bioinformatics pipelines"],
 "Evolution":["Phylogenetics","Evolutionary genetics","Speciation"],
 "Neuroscience":["Neural circuits","Computational neuroscience","Connectomics"],
 "Molecular biology":["Gene regulation","RNA biology","Chromatin dynamics"],
 "Systems biology":["Gene regulatory networks","Metabolic networks","Cell signalling"],
 "Structural biology":["Cryo-EM","Protein folding","Molecular dynamics"],
 "Ecology":["Biodiversity conservation","Population ecology","Ecosystem dynamics"]},
 medicine:{
 "Clinical trials":["Randomized controlled trials","Adaptive trials","Clinical trial meta-analysis"],
 "Epidemiology":["Cohort studies","Infectious disease modelling","Causal epidemiology"],
 "Oncology":["Immunotherapy","Cancer genomics","Clinical biomarkers"],
 "Cardiology":["Heart failure","Cardiac imaging","Cardiovascular prevention"],
 "Neuroscience":["Neurodegenerative disorders","Neuroimaging","Neurotherapeutics"],
 "Immunology":["Autoimmune disease","Vaccine immunology","Immune profiling"],
 "Diagnostics":["Biomarker validation","Diagnostic accuracy","Point-of-care testing"],
 "Global health":["Health equity","Maternal health","Infectious disease burden"],
 "Public health":["Population interventions","Health policy evaluation","Social determinants of health"]},
 chemistry:{
 "Materials science":["Two-dimensional materials","Functional materials","Phase transitions"],
 "Catalysis":["Heterogeneous catalysis","Photocatalysis","Electrocatalysis"],
 "Organic chemistry":["Asymmetric synthesis","Reaction mechanisms","Total synthesis"],
 "Electrochemistry":["Electrochemical interfaces","Redox chemistry","Fuel cells"],
 "Battery materials":["Solid-state electrolytes","Lithium-ion degradation","Sodium-ion batteries"],
 "Spectroscopy":["Ultrafast spectroscopy","Raman spectroscopy","NMR methods"],
 "Nanomaterials":["Nanoparticle synthesis","Quantum dots","Nanostructured surfaces"],
 "Computational chemistry":["Density functional theory","Molecular modelling","Reaction prediction"],
 "Polymers":["Polymer synthesis","Biodegradable polymers","Polymer self-assembly"]},
 engineering:{
 "Robotics":["Robot perception","Autonomous navigation","Manipulation and grasping"],
 "Control theory":["Model predictive control","Robust control","Adaptive control"],
 "Signal processing":["Sensor fusion","Sparse signal recovery","Time-series analysis"],
 "Renewable energy":["Solar energy systems","Wind power forecasting","Energy storage integration"],
 "Microelectronics":["Semiconductor devices","Chip design","Low-power circuits"],
 "Wireless communications":["6G communications","MIMO systems","Spectrum sharing"],
 "Mechanical engineering":["Computational fluid dynamics","Structural mechanics","Manufacturing systems"],
 "Optimization":["Engineering design optimization","Operations research","Multiobjective optimization"],
 "Sensors":["Biosensors","Wireless sensors","Precision instrumentation"]},
 social:{
 "Econometrics":["Panel data methods","Instrumental variables","Treatment effects"],
 "Behavioral science":["Decision making","Behavioral interventions","Cognitive bias"],
 "Education":["Learning analytics","Educational inequality","Instructional interventions"],
 "Development economics":["Poverty measurement","Development policy","Microfinance"],
 "Political science":["Political institutions","Elections and voting","Comparative politics"],
 "Sociology":["Social networks","Stratification","Organizational sociology"],
 "Public policy":["Policy evaluation","Public administration","Regulatory design"],
 "Psychology":["Cognitive psychology","Social psychology","Psychometrics"],
 "Causal inference":["Difference-in-differences","Natural experiments","Causal graphical models"]}
};
function fieldTopics(field,topic){return (SUBTOPICS[field]||{})[topic]||[]}
function fieldKey(value){return Object.prototype.hasOwnProperty.call(FIELDS,value)?value:"quantum"}
if(typeof module==="object"&&module.exports)module.exports={FIELDS,SUBTOPICS,fieldTopics,fieldKey};
if(typeof window!=="undefined")window.ResearchLensFields=Object.freeze({FIELDS,SUBTOPICS,fieldTopics,fieldKey});

})();
