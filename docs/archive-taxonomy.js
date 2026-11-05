/* Source-specific subject taxonomies; all top-level subject areas included.
 * Subfields are editable browser-local suggestions, never fabricated archive
 * classification codes. arXiv categories use authoritative arXiv codes.
 */
(function(root){
"use strict";
const A=[
["Physics",[["Astrophysics","astro-ph"],["Condensed Matter","cond-mat"],["General Relativity and Quantum Cosmology","gr-qc"],["High Energy Physics – Experiment","hep-ex"],["High Energy Physics – Lattice","hep-lat"],["High Energy Physics – Phenomenology","hep-ph"],["High Energy Physics – Theory","hep-th"],["Mathematical Physics","math-ph"],["Nonlinear Sciences","nlin"],["Nuclear Experiment","nucl-ex"],["Nuclear Theory","nucl-th"],["Physics","physics"],["Quantum Physics","quant-ph"]]],
["Mathematics",[["Mathematics","math"]]],
["Computer Science",[["Computer Science","cs"]]],
["Quantitative Biology",[["Quantitative Biology","q-bio"]]],
["Quantitative Finance",[["Quantitative Finance","q-fin"]]],
["Statistics",[["Statistics","stat"]]],
["Electrical Engineering and Systems Science",[["Electrical Engineering and Systems Science","eess"]]],
["Economics",[["Economics","econ"]]]
];
const ARXIV=[
["astro-ph","Astrophysics of Galaxies","astro-ph.GA"],["astro-ph","Cosmology and Nongalactic Astrophysics","astro-ph.CO"],["astro-ph","Earth and Planetary Astrophysics","astro-ph.EP"],["astro-ph","High Energy Astrophysical Phenomena","astro-ph.HE"],["astro-ph","Instrumentation and Methods for Astrophysics","astro-ph.IM"],["astro-ph","Solar and Stellar Astrophysics","astro-ph.SR"],
["cond-mat","Disordered Systems and Neural Networks","cond-mat.dis-nn"],["cond-mat","Materials Science","cond-mat.mtrl-sci"],["cond-mat","Mesoscale and Nanoscale Physics","cond-mat.mes-hall"],["cond-mat","Other Condensed Matter","cond-mat.other"],["cond-mat","Quantum Gases","cond-mat.quant-gas"],["cond-mat","Soft Condensed Matter","cond-mat.soft"],["cond-mat","Statistical Mechanics","cond-mat.stat-mech"],["cond-mat","Strongly Correlated Electrons","cond-mat.str-el"],["cond-mat","Superconductivity","cond-mat.supr-con"],
["physics","Accelerator Physics","physics.acc-ph"],["physics","Applied Physics","physics.app-ph"],["physics","Atmospheric and Oceanic Physics","physics.ao-ph"],["physics","Atomic and Molecular Clusters","physics.atm-clus"],["physics","Atomic Physics","physics.atom-ph"],["physics","Biological Physics","physics.bio-ph"],["physics","Chemical Physics","physics.chem-ph"],["physics","Classical Physics","physics.class-ph"],["physics","Computational Physics","physics.comp-ph"],["physics","Data Analysis, Statistics and Probability","physics.data-an"],["physics","Fluid Dynamics","physics.flu-dyn"],["physics","General Physics","physics.gen-ph"],["physics","Geophysics","physics.geo-ph"],["physics","History and Philosophy of Physics","physics.hist-ph"],["physics","Instrumentation and Detectors","physics.ins-det"],["physics","Medical Physics","physics.med-ph"],["physics","Optics","physics.optics"],["physics","Physics and Society","physics.soc-ph"],["physics","Physics Education","physics.ed-ph"],["physics","Plasma Physics","physics.plasm-ph"],["physics","Popular Physics","physics.pop-ph"],["physics","Space Physics","physics.space-ph"],
["nlin","Adaptation and Self-Organizing Systems","nlin.AO"],["nlin","Cellular Automata and Lattice Gases","nlin.CG"],["nlin","Chaotic Dynamics","nlin.CD"],["nlin","Exactly Solvable and Integrable Systems","nlin.SI"],["nlin","Pattern Formation and Solitons","nlin.PS"],
["math","Algebraic Geometry","math.AG"],["math","Algebraic Topology","math.AT"],["math","Analysis of PDEs","math.AP"],["math","Category Theory","math.CT"],["math","Classical Analysis and ODEs","math.CA"],["math","Combinatorics","math.CO"],["math","Complex Variables","math.CV"],["math","Differential Geometry","math.DG"],["math","Functional Analysis","math.FA"],["math","General Topology","math.GN"],["math","Group Theory","math.GR"],["math","Information Theory","math.IT"],["math","Logic","math.LO"],["math","Mathematical Physics","math.MP"],["math","Number Theory","math.NT"],["math","Numerical Analysis","math.NA"],["math","Operator Algebras","math.OA"],["math","Optimization and Control","math.OC"],["math","Probability","math.PR"],["math","Quantum Algebra","math.QA"],["math","Representation Theory","math.RT"],["math","Statistics Theory","math.ST"],
["cs","Artificial Intelligence","cs.AI"],["cs","Computation and Language","cs.CL"],["cs","Computational Complexity","cs.CC"],["cs","Computer Vision and Pattern Recognition","cs.CV"],["cs","Cryptography and Security","cs.CR"],["cs","Data Structures and Algorithms","cs.DS"],["cs","Databases","cs.DB"],["cs","Distributed, Parallel, and Cluster Computing","cs.DC"],["cs","Human-Computer Interaction","cs.HC"],["cs","Information Retrieval","cs.IR"],["cs","Machine Learning","cs.LG"],["cs","Networking and Internet Architecture","cs.NI"],["cs","Robotics","cs.RO"],["cs","Software Engineering","cs.SE"],["cs","Systems and Control","cs.SY"],
["q-bio","Biomolecules","q-bio.BM"],["q-bio","Cell Behavior","q-bio.CB"],["q-bio","Genomics","q-bio.GN"],["q-bio","Molecular Networks","q-bio.MN"],["q-bio","Neurons and Cognition","q-bio.NC"],["q-bio","Populations and Evolution","q-bio.PE"],["q-bio","Quantitative Methods","q-bio.QM"],["q-bio","Subcellular Processes","q-bio.SC"],["q-bio","Tissues and Organs","q-bio.TO"],
["q-fin","Computational Finance","q-fin.CP"],["q-fin","Economics","q-fin.EC"],["q-fin","General Finance","q-fin.GN"],["q-fin","Mathematical Finance","q-fin.MF"],["q-fin","Portfolio Management","q-fin.PM"],["q-fin","Pricing of Securities","q-fin.PR"],["q-fin","Risk Management","q-fin.RM"],["q-fin","Statistical Finance","q-fin.ST"],["q-fin","Trading and Market Microstructure","q-fin.TR"],
["stat","Applications","stat.AP"],["stat","Computation","stat.CO"],["stat","Machine Learning","stat.ML"],["stat","Methodology","stat.ME"],["stat","Other Statistics","stat.OT"],["stat","Statistics Theory","stat.TH"],
["eess","Audio and Speech Processing","eess.AS"],["eess","Image and Video Processing","eess.IV"],["eess","Signal Processing","eess.SP"],["eess","Systems and Control","eess.SY"],
["econ","Econometrics","econ.EM"],["econ","General Economics","econ.GN"],["econ","Theoretical Economics","econ.TH"]
];
const BIO=["Animal Behavior and Cognition","Biochemistry","Bioengineering","Bioinformatics","Biophysics","Cancer Biology","Cell Biology","Clinical Trials","Developmental Biology","Ecology","Epidemiology","Evolutionary Biology","Genetics","Genomics","Immunology","Microbiology","Molecular Biology","Neuroscience","Paleontology","Pathology","Pharmacology and Toxicology","Physiology","Plant Biology","Scientific Communication and Education","Synthetic Biology","Systems Biology","Zoology"];
const CHEM=["Agriculture and Food Chemistry","Analytical Chemistry","Biological and Medicinal Chemistry","Catalysis","Chemical Education","Chemical Engineering and Industrial Chemistry","Earth, Space, and Environmental Chemistry","Energy","Inorganic Chemistry","Materials Chemistry","Materials Science","Nanoscience","Organic Chemistry","Organometallic Chemistry","Physical Chemistry","Polymer Science","Theoretical and Computational Chemistry"];
const SUGGESTIONS={
"Quantum Physics":["Quantum cryptography","Quantum foundations","Quantum computing","Quantum sensing","Entanglement theory","Quantum networks"],
"Genomics":["Single-cell genomics","Population genetics","Genome assembly","Transcriptomics","Epigenomics"],
"Neuroscience":["Neural circuits","Synaptic plasticity","Neuroimaging","Computational neuroscience"],
"Bioinformatics":["Sequence analysis","Multi-omics integration","Protein prediction","Biological networks"],
"Catalysis":["Electrocatalysis","Photocatalysis","Heterogeneous catalysis","Reaction mechanisms"],
"Materials Science":["Battery materials","Electronic structure","Two-dimensional materials","Nanocomposites"],
"Organic Chemistry":["Synthesis","Asymmetric catalysis","Medicinal chemistry","Reaction optimization"],
"Physical Chemistry":["Molecular dynamics","Spectroscopy","Chemical kinetics","Quantum chemistry"],
"Theoretical and Computational Chemistry":["Density functional theory","Machine learning potentials","Molecular simulation","Electronic structure"],
"Computer Science":["Machine learning","Algorithms","Large language models","Cybersecurity"]
};
// Optional topic-specific suggestions are researcher search refinements, not
// official archive classification IDs or measured popularity rankings.
Object.assign(SUGGESTIONS,{
 "Animal Behavior and Cognition":["Social behavior","Animal communication","Decision making"],
 "Biochemistry":["Enzyme kinetics","Protein folding","Metabolomics"],
 "Bioengineering":["Tissue engineering","Microfluidics","Biomaterials"],
 "Biophysics":["Molecular motors","Cell mechanics","Single molecule imaging"],
 "Cancer Biology":["Tumor microenvironment","Cancer genomics","Immuno-oncology"],
 "Cell Biology":["Cell signaling","Organelle dynamics","Cell division"],
 "Clinical Trials":["Trial design","Treatment outcomes","Randomized interventions"],
 "Developmental Biology":["Stem cell differentiation","Morphogenesis","Embryonic development"],
 "Ecology":["Population dynamics","Community ecology","Conservation genomics"],
 "Epidemiology":["Disease modeling","Surveillance","Risk factors"],
 "Evolutionary Biology":["Phylogenetics","Adaptation","Population evolution"],
 "Genetics":["Genome-wide association","Mendelian genetics","Gene regulation"],
 "Immunology":["Adaptive immunity","Innate immunity","Vaccine responses"],
 "Microbiology":["Microbial communities","Host pathogen interactions","Antimicrobial resistance"],
 "Molecular Biology":["RNA regulation","Protein interactions","Transcription"],
 "Paleontology":["Fossil morphology","Paleoecology","Evolutionary history"],
 "Pathology":["Molecular pathology","Diagnostic biomarkers","Disease mechanisms"],
 "Pharmacology and Toxicology":["Drug discovery","Pharmacokinetics","Toxicity assessment"],
 "Physiology":["Neurophysiology","Cardiorespiratory physiology","Metabolism"],
 "Plant Biology":["Plant genomics","Photosynthesis","Plant stress"],
 "Scientific Communication and Education":["Science education","Open science","Research communication"],
 "Synthetic Biology":["Gene circuits","Genome engineering","Metabolic engineering"],
 "Systems Biology":["Network modeling","Multi-omics","Dynamic systems"],
 "Zoology":["Animal diversity","Comparative anatomy","Behavioral ecology"],
 "Agriculture and Food Chemistry":["Food analysis","Agricultural chemistry","Biomass chemistry"],
 "Analytical Chemistry":["Mass spectrometry","Chromatography","Chemical sensors"],
 "Biological and Medicinal Chemistry":["Drug design","Chemical biology","Bioactive molecules"],
 "Chemical Education":["Chemistry pedagogy","Laboratory education","Chemical demonstrations"],
 "Chemical Engineering and Industrial Chemistry":["Process optimization","Separation processes","Industrial catalysis"],
 "Earth, Space, and Environmental Chemistry":["Atmospheric chemistry","Water chemistry","Environmental pollutants"],
 "Energy":["Hydrogen storage","Solar fuels","Electrochemical energy"],
 "Inorganic Chemistry":["Coordination compounds","Transition metal chemistry","Solid-state inorganic"],
 "Materials Chemistry":["Functional polymers","Battery materials","Surface chemistry"],
 "Nanoscience":["Nanoparticles","Nanostructures","Nanoscale spectroscopy"],
 "Organometallic Chemistry":["Metal-organic catalysis","Metal complexes","Bond activation"],
 "Polymer Science":["Polymer synthesis","Polymer characterization","Sustainable polymers"],
 "High Energy Physics – Theory":["Conformal field theory","Gauge-gravity duality","Scattering amplitudes"],
 "High Energy Physics – Phenomenology":["Collider signatures","Dark matter models","Flavor physics"],
 "Statistical Mechanics":["Critical phenomena","Nonequilibrium dynamics","Stochastic thermodynamics"],
 "Quantum Physics":["Quantum cryptography","Quantum foundations","Quantum computing","Quantum sensing","Entanglement theory","Quantum networks"]
});
// Additional active arXiv categories from its public subject taxonomy.
const additional=[
["math","Commutative Algebra","math.AC"],["math","Dynamical Systems","math.DS"],["math","General Mathematics","math.GM"],
["math","Geometric Topology","math.GT"],["math","History and Overview","math.HO"],["math","K-Theory and Homology","math.KT"],
["math","Metric Geometry","math.MG"],["math","Rings and Algebras","math.RA"],["math","Symplectic Geometry","math.SG"],["math","Spectral Theory","math.SP"],
["cs","Hardware Architecture","cs.AR"],["cs","Computational Engineering, Finance and Science","cs.CE"],["cs","Computational Geometry","cs.CG"],
["cs","Computer Science and Game Theory","cs.GT"],["cs","Computers and Society","cs.CY"],["cs","Digital Libraries","cs.DL"],
["cs","Discrete Mathematics","cs.DM"],["cs","Emerging Technologies","cs.ET"],["cs","Formal Languages and Automata Theory","cs.FL"],
["cs","General Literature","cs.GL"],["cs","Graphics","cs.GR"],["cs","Information Theory","cs.IT"],
["cs","Logic in Computer Science","cs.LO"],["cs","Multiagent Systems","cs.MA"],["cs","Multimedia","cs.MM"],
["cs","Mathematical Software","cs.MS"],["cs","Numerical Analysis","cs.NA"],["cs","Neural and Evolutionary Computing","cs.NE"],
["cs","Other Computer Science","cs.OH"],["cs","Operating Systems","cs.OS"],["cs","Performance","cs.PF"],
["cs","Programming Languages","cs.PL"],["cs","Symbolic Computation","cs.SC"],["cs","Sound","cs.SD"],["cs","Social and Information Networks","cs.SI"],
["q-bio","Other Quantitative Biology","q-bio.OT"]
];
for(const x of additional)if(!ARXIV.some(y=>y[2]===x[2]))ARXIV.push(x);
const mapArxivGroup=A.map(([label,arr])=>({label,id:arr[0]?.[1]||label.toLowerCase(),areas:arr.map(([name,code])=>({name,code,subfields:[...ARXIV.filter(x=>x[0]===code).map(([_,n,c])=>({name:n,code:c,official:true})),...(SUGGESTIONS[name]||[]).map(x=>({name:x,code:x}))]}))}));
const bio={groups:[{label:"Biology and Life Sciences",id:"biology",areas:BIO.map(name=>({name,code:name,legacy:["Clinical Trials","Epidemiology"].includes(name),subfields:(SUGGESTIONS[name]||[]).map(t=>({name:t,code:t}))}))}]};
const chem={groups:[{label:"Chemistry and Molecular Sciences",id:"chemistry",areas:CHEM.map(name=>({name,code:name,subfields:(SUGGESTIONS[name]||[]).map(t=>({name:t,code:t}))}))}]};
const archives={arxiv:{groups:mapArxivGroup},biorxiv:bio,chemrxiv:chem};
function directory(source){
 return archives[source]?.groups.flatMap((group,topic)=>group.areas.flatMap((area,field)=>{
  const classes=area.subfields.filter(item=>item.official);
  const rows=classes.length?classes:[area];
  return rows.map(row=>({...row,topic,field,group:group.label,area:area.name,subfield:classes.length?row.code:""}));
 }))||[];
}
root.AxiovoArchiveTaxonomy={...archives,directory,suggestions:SUGGESTIONS};
})(window);
