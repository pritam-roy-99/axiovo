/* Shared discipline-specific research taxonomy for Discover and the workspace. */
(function(){
const FIELDS={
 quantum:{name:"Quantum information & physics",summary:"Theory, protocols, quantum foundations, photonics, devices and experimental platforms.",topics:["Quantum key distribution","Bell nonlocality","Quantum steering","Contextuality","Quantum networks","Quantum sensing","Quantum error correction","Quantum computing","Optomechanics","Entanglement theory"],queries:["device independent quantum cryptography","measurement incompatibility steering","quantum networks Bell inequalities"],workflow:["Verify operational assumptions and device trust models.","Compare noise models and experimental feasibility.","Inspect mathematical proofs and alternative security bounds."]},
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
