require("dotenv").config();
const { query, pool } = require("../src/db");

// ── Toutes les données existantes du fichier Excel ────────────────────────────
const PUBLIC_PROJECTS = [
  { ref:"SOL-AO-25-004", statut:"1. Envoyés", dep:"",   client:"Vitry",                               date_rendu:"2025-07-10", montant:102200, visite:"", date_visite:"", charge:"", commentaire:"" },
  { ref:"SOL-AO-25-005", statut:"1. Envoyés", dep:"",   client:"Appel d'offre internationnal LIDL",   date_decision:"attente", montant:0 },
  { ref:"SOL-AO-25-006", statut:"1. Envoyés", dep:"31", client:"Occitanie Ouest",                     date_limite:"2025-09-10", date_rendu:"2025-09-10", montant:81665, visite:"Visite conseillée - possible le 8 juillet 2025" },
  { ref:"SOL-AO-25-011", statut:"1. Envoyés", dep:"63", client:"CPAM Puy de Dôme - C.Ferrand",        date_limite:"2025-09-19", date_rendu:"2025-09-19", date_decision:"2025-12-01", montant:97616, visite:"Visite faite", date_visite:"12/09/2025 à 14h", charge:"Amaury", commentaire:"Toiture etanchéité elastoimere - SI lesté - 77,4Kwc 172 modules", prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-012", statut:"1. Envoyés", dep:"87", client:"Val de Vienne",                       date_limite:"2025-09-26", date_rendu:"2025-09-24", montant:91005, visite:"Aucune visite obligatoire", commentaire:"lot photovoltaique unique est optionel bon chantier bac acier" },
  { ref:"SOL-AO-25-014", statut:"1. Envoyés", dep:"01", client:"Saint Benigne",                       date_limite:"2025-09-29", date_rendu:"2025-09-26", montant:14668, visite:"Aucune visite obligatoire", commentaire:"petit chantier 13kw" },
  { ref:"SOL-AO-25-015", statut:"1. Envoyés", dep:"30", client:"Baucaire",                            date_limite:"2025-09-26", date_rendu:"2025-09-26", montant:17240, visite:"Aucune visite obligatoire", commentaire:"13Kw sur soprasolar" },
  { ref:"SOL-AO-25-016", statut:"4. Perdu",   dep:"50", client:"Quibou",                              date_limite:"2025-10-03", date_rendu:"2025-10-03", montant:47740 },
  { ref:"SOL-AO-25-017", statut:"1. Envoyés", dep:"50", client:"Cerisy-la-Salle",                     visite:"Visite obligatoire FAIT" },
  { ref:"SOL-AO-25-019", statut:"1. Envoyés", dep:"44", client:"Ville de Bouguenais",                 date_limite:"2025-10-17", date_rendu:"2025-10-15", montant:165530, visite:"Visite obligatoire FAIT", date_visite:"02/10/2025 à 9h", charge:"Amaury", commentaire:"Ombrière + ombrière pour Tiers-Invest (voir TH2)" },
  { ref:"SOL-AO-25-021", statut:"1. Envoyés", dep:"49", client:"Bibliopôle à Avrillé",               date_limite:"2025-11-03", date_rendu:"2025-11-01", montant:44055, visite:"Visite obligatoire FAIT", date_visite:"27/10/2025 14h00", charge:"Amaury", commentaire:"40kWc en toiture" },
  { ref:"SOL-AO-25-021", statut:"1. Envoyés", dep:"76", client:"INSA Rouen Normandie",               date_limite:"2025-11-07", date_rendu:"2025-11-07", montant:127650, visite:"Visite obligatoire FAIT", date_visite:"21/10/2025 09h30", charge:"Thibaud", commentaire:"3 bâtiments - 3 chantiers" },
  { ref:"SOL-AO-25-022", statut:"1. Envoyés", dep:"27", client:"Gymnase Gisors",                     date_limite:"2025-11-05", date_rendu:"2025-11-05", montant:42454, visite:"Visite obligatoire FAIT", date_visite:"10/10/2025 à 14h30", charge:"Amaury", commentaire:"92 PV sur panneaux sandwich" },
  { ref:"SOL-AO-25-022", statut:"1. Envoyés", dep:"86", client:"Padel Ville de Civaux",              date_limite:"2025-11-14", date_rendu:"2025-11-08", montant:99650, visite:"Visite obligatoire FAIT", date_visite:"22/10/2025 à 14h00", charge:"Eddy", commentaire:"130kWc neuf - Intégration au Bâti" },
  { ref:"SOL-AO-25-023", statut:"1. Envoyés", dep:"94", client:"Bry sur Marnes",                     date_limite:"2025-11-27", montant:89050, visite:"Visite faite - 24 personnes", date_visite:"12/11/2025 à 10h00", charge:"Eddy", commentaire:"93kWc - SI lesté - travaux du 6 juillet au 14 août 2026" },
  { ref:"SOL-AO-25-024", statut:"1. Envoyés", dep:"50", client:"LES PIEUX",                          date_limite:"2025-12-19", date_rendu:"2025-12-10", montant:18400 },
  { ref:"",              statut:"3. A étudier",dep:"35", client:"Betton",                             date_limite:"2026-03-06", charge:"Amaury", commentaire:"cadredevie@betton.fr", visite:"Visite obligatoire" },
  { ref:"SOL-AO-25-009", statut:"4. Perdu",   dep:"95", client:"Ville de Marine",                    date_limite:"2025-09-15", date_rendu:"2025-09-15", montant:13450, visite:"Visite conseillée", date_visite:"mail envoyé", charge:"Eddy", commentaire:"CCTP peu détaillé - 75 panneaux", prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-011", statut:"4. Perdu",   dep:"83", client:"Var habitat OPH",                    date_limite:"2025-09-19", date_rendu:"2025-09-19", montant:495258, commentaire:"Répondre pour le 24/11 12h00" },
  { ref:"SOL-AO-25-018", statut:"4. Perdu",   dep:"57", client:"Metz Métropole",                     date_limite:"2025-10-15", date_rendu:"2025-10-15", montant:80244, visite:"Visite obligatoire FAIT", date_visite:"29/09/2025 à 14h00", charge:"Amaury", commentaire:"97 kWc 216PV" },
  { ref:"SOL-AO-25-020", statut:"4. Perdu",   dep:"93", client:"CDFiP Saint-Denis",                  date_limite:"2025-10-31", date_rendu:"2025-10-31", montant:71305, visite:"Visite obligatoire FAIT", date_visite:"21/10/2025 09h30", charge:"Amaury", commentaire:"Demande de justification de la note" },
  { ref:"SOL-AO-25-001", statut:"4. Perdu",   dep:"",   client:"Ponteaux les Forges",                date_rendu:"2024-11-29", montant:56458, prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-002", statut:"4. Perdu",   dep:"31", client:"HALLE TRANSFERT HAUTE GARONNE",      date_rendu:"2025-05-05", date_decision:"2025-09-11", montant:47883, prix_note:"26,04/35", tech_note:"39,65/65", env_note:"-" },
  { ref:"SOL-AO-25-003", statut:"4. Perdu",   dep:"",   client:"Le-Plessis-Trevise",                 date_rendu:"2025-06-27", montant:44495, prix_note:"37,71/40", tech_note:"34,50/60", env_note:"-" },
  { ref:"SOL-AO-25-007", statut:"4. Perdu",   dep:"34", client:"Maureilhan",                         date_limite:"2025-09-11", date_rendu:"2025-09-11", montant:35278, date_visite:"03/09/2025 à 11h", charge:"Timothé", commentaire:"SI : Renusol F10s entre 55 et 65 panneaux", prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-008", statut:"4. Perdu",   dep:"15", client:"Aurillac (Sgami)",                   date_limite:"2025-09-15", date_rendu:"2025-09-15", montant:34160, charge:"Eddy", commentaire:"80 PV tranche optionnelle", prix_note:"40,00/40", tech_note:"27/60", env_note:"-" },
  { ref:"SOL-AO-25-010", statut:"4. Perdu",   dep:"62", client:"ComCom Desvres-samer",               date_limite:"2025-09-18", date_rendu:"2025-09-18", date_decision:"2025-10-30", montant:257438, visite:"Visite faite", charge:"Amaury", commentaire:"Tvx pour Jan/fev/mars - centrale au sol" },
  { ref:"",              statut:"4. Perdu",   dep:"44", client:"AFPA Saint Herblain",                date_rendu:"2025-02-06", date_decision:"2025-03-03", montant:50693, prix_note:"39,00/60", tech_note:"20,00/40", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"50", client:"CCI Saint Lô",                       date_rendu:"2025-01-31", date_decision:"2025-03-03", montant:82751, prix_note:"42,78/50", tech_note:"35,00/50", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"37", client:"CHU TOURS",                          date_rendu:"2025-07-03", date_decision:"2025-08-19", montant:112913, prix_note:"49,73/60", tech_note:"28,25/40", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Commune de Gratot",                  date_rendu:"2025-06-04", date_decision:"2025-06-25", montant:29585, prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"76", client:"GRT GAZ Le Havre",                   date_rendu:"2025-01-24", date_decision:"2025-03-17", montant:115796, prix_note:"-", tech_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Guipavas",                           date_rendu:"2024-11-27", date_decision:"2025-01-01", montant:149273, prix_note:"26,00/40", tech_note:"33,75/45", env_note:"15,00/15" },
  { ref:"",              statut:"4. Perdu",   dep:"94", client:"Gymnase Joinville le Pont",          date_rendu:"2025-04-07", date_decision:"2025-07-08", montant:69487, prix_note:"32,00/40", tech_note:"43,00/55", env_note:"2,50/5" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Le Croisic",                         date_rendu:"2025-05-19", date_decision:"2025-05-27", montant:54664, prix_note:"46,05/60", tech_note:"21,00/40", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"14", client:"Mairie de Caen",                     date_rendu:"2024-12-13", date_decision:"2025-04-01", montant:71275, prix_note:"31,30/65", tech_note:"17,50/35", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"MAISON DES FAMILLES Trappes",        date_rendu:"2025-04-22", date_decision:"2025-05-30", montant:54950, prix_note:"51,00/60", tech_note:"11,00/20", env_note:"8,00/20" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Médiathèque Oullins Pierre Benite",  date_rendu:"2024-12-11", date_decision:"2025-02-04", montant:138321, prix_note:"26,57/40", tech_note:"51,30/60", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Pont-de-Claix",                      date_rendu:"2025-06-26", date_decision:"2025-07-10", montant:169346, prix_note:"28,17/40", tech_note:"43,00/60", env_note:"-" },
  { ref:"",              statut:"4. Perdu",   dep:"",   client:"Simon frere",                        date_rendu:"2025-02-18", date_decision:"2025-04-04", montant:181393, prix_note:"34,75/40", tech_note:"55,00/100" },
  { ref:"",              statut:"4. Perdu",   dep:"49", client:"URSSAF Pays de la Loire",            date_rendu:"2025-05-30", date_decision:"2025-07-22", montant:97707, prix_note:"40,00/40", tech_note:"43,00/50", env_note:"7,00/10" },
  { ref:"",              statut:"4. Perdu",   dep:"78", client:"Ville de Viroflay",                  date_rendu:"2025-04-25", date_decision:"2025-08-05", montant:61310, prix_note:"40,00/40", tech_note:"33,75/50", env_note:"7,50/10" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"42", client:"SIEL Loire",                         date_limite:"2025-10-01", montant:1 },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"68", client:"SAINT-LOUIS Agglomération",          date_limite:"2025-10-01", commentaire:"Loin (Mulhouse) x4 ombrières = 340 kWc" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"83", client:"SDIS 83",                            date_limite:"2025-10-02", commentaire:"petit chantier bac acier 15Kw" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"85", client:"Vendée énergie",                     date_limite:"2025-09-24", commentaire:"1 champs toiture Soprasolar 91 modules", prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"95", client:"Cergy Pontoise",                     date_limite:"2025-09-24", visite:"Visite obligatoire", date_visite:"mail à envoyer", charge:"Eddy", commentaire:"Lot PV intégré dans lot étanchéité" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"88", client:"Saint Die des Vosges",               date_limite:"2025-09-17", date_visite:"mail à envoyer", charge:"Eddy", commentaire:"SI : plots fournis par lot étanchéité - 22 modules/bâtiment" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"70", client:"Groupe hospitalier Hautes Saone",    date_limite:"2025-09-16", visite:"Visite obligatoire", date_visite:"10/09/2025 à 14h", charge:"Eddy", commentaire:"Demande qualifelec qualibat et certisolis AQPV" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"59", client:"Mairie Wattrelos",                   date_limite:"2025-09-09", visite:"Visite obligatoire", date_visite:"04/09/2025 à 14h30", charge:"Amaury", commentaire:"60 panneaux Evofix / annulé" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"46", client:"Vayrac",                             date_limite:"2025-09-12", charge:"Eddy", commentaire:"Vayrac 60 PV - envoyer dossier quand même" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"74", client:"Gymnase ENSA",                       date_limite:"2025-09-19", date_visite:"mail à envoyer", charge:"Eddy", commentaire:"Toiture joint debout SI K2 Solidrail 224 modules" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"87", client:"CHU Limoges",                        date_limite:"2025-09-19", visite:"Visite obligatoire", date_visite:"X", commentaire:"Lot unique Elec - PV" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"60", client:"Anzin - Ecole Simone Veil",          visite:"Visite obligatoire" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"76", client:"Centre hospitalier Elbeuf",          date_rendu:"2025-09-01", visite:"Attention pas fait visite obligatoire" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"14", client:"Cingal (14)",                        date_rendu:"2025-09-12", charge:"Fab", commentaire:"lié au lot bac acier", visite:"Visite obligatoire" },
  { ref:"SOL-AO-25-XXX", statut:"5. No rep", dep:"59", client:"Decheterie Saint Armand",            visite:"Visite conseillée" },
  { ref:"",              statut:"5. No rep", dep:"57", client:"Poste Nord Energis - Saint Avold",   date_limite:"2025-11-03", date_visite:"24/09/2025 à 10h00", commentaire:"414 KWc - structure au sol - génie civil - ENEDIS + DP urba" },
  { ref:"",              statut:"5. No rep", dep:"01", client:"Gymnase Lea",                        date_limite:"2025-10-10", commentaire:"pose sur tuile" },
  { ref:"",              statut:"5. No rep", dep:"86", client:"Soregies",                           date_limite:"2025-10-10", commentaire:"3 MWc au sol" },
  { ref:"",              statut:"5. No rep", dep:"06", client:"Sophia Antipolis",                   date_limite:"2025-10-08", visite:"Visite obligatoire", commentaire:"toiture auto lesté + ombrière chantier 100Kw" },
  { ref:"",              statut:"5. No rep", dep:"09", client:"Communauté de Communes du Pays d'Olmes", date_limite:"2025-09-30", charge:"Timothé", commentaire:"95 PV en toiture Rénovation globale" },
  { ref:"",              statut:"5. No rep", dep:"33", client:"Port de Bordeaux",                   date_limite:"2025-09-25", charge:"Eddy", commentaire:"55Kw bac acier" },
  { ref:"SOL-AO-25-013", statut:"6. StandBy",dep:"57", client:"Lidl Saint Avold",                  date_limite:"2025-09-26", date_rendu:"2025-09-24", montant:208531, prix_note:"-", tech_note:"-", env_note:"-" },
  { ref:"SOL-AO-25-XXX", statut:"6. StandBy",dep:"80", client:"Contrat cadre Amiens",              date_limite:"2025-09-03", commentaire:"Maintenance" },
  { ref:"SOL-AO-25-XXX", statut:"6. StandBy",dep:"75", client:"CANOPE MAIRIE DE PARIS",            date_rendu:"2025-05-22", montant:569507, prix_note:"-", tech_note:"-", env_note:"-" },
];

const PRIVE_PROJECTS = [
  { statut:"1. Répondu",    client:"Villedieu",               date_rendu:"2025-10-08", montant:8125 },
  { statut:"2. Montage",    client:"Padel à Coudeville sur mer", visite:"Bruno Herbert Torchio" },
  { statut:"3. A étudier",  client:"Laval - Ets Oger",        visite:"Faire chiffrer rechappage" },
  { statut:"3. A étudier",  client:"Coudeville PADEL",        visite:"Etude en cours + chiffrage" },
  { statut:"3. A étudier",  client:"Super U Lille",           visite:"Devis + étude" },
  { statut:"3. A étudier",  client:"Super U Sartilly",        visite:"En attente DCE" },
  { statut:"3. A étudier",  client:"Argentan" },
  { statut:"3. A étudier",  client:"Napoly",                  visite:"Refaire étude et devis avec PV" },
  { statut:"3. A étudier",  client:"Hugues LAMART 1" },
  { statut:"3. A étudier",  client:"Hugues LAMART 2" },
  { statut:"3. A étudier",  client:"Hugues LAMART 3" },
  { statut:"3. A étudier",  client:"Super U Bricbaec" },
  { statut:"3. A étudier",  client:"Van Hees" },
  { statut:"3. A étudier",  client:"Norma" },
  { statut:"3. A étudier",  client:"Cormeille le Royal" },
  { statut:"3. A étudier",  client:"Urban Saint André" },
  { statut:"3. A étudier",  client:"Mitry Mory" },
  { statut:"3. A étudier",  client:"Saint André sur Eure" },
  { statut:"3. A étudier",  client:"Urbamimmo" },
  { statut:"3. A étudier",  client:"Carrefour Sud Portiraille" },
  { statut:"4. Perdu",      client:"(AO Privé - perdu)",      date_rendu:"2025-05-05", date_decision:"2025-09-11", montant:47883 },
  { statut:"5. No rep",     client:"(AO Privé - no rep)",     date_limite:"2025-09-30", visite:"Visite conseillée" },
  { statut:"6. StandBy",    client:"Multiform Bruno LEFRANC", visite:"En attente travaux préparatoires S1 2026" },
];

const seed = async () => {
  console.log("🌱 Import des données existantes...\n");

  // Supprimer les données existantes
  await query("DELETE FROM projets");
  console.log("  🗑  Tables nettoyées");

  let count = 0;
  const insert = async (tab, projects) => {
    for (const p of projects) {
      await query(`
        INSERT INTO projets (tab, ref, statut, dep, client, date_limite, date_rendu, date_decision,
          montant, visite, date_visite, charge, commentaire, prix_note, tech_note, env_note, source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'seed')
      `, [
        tab,
        p.ref || null,
        p.statut,
        p.dep || null,
        p.client,
        p.date_limite || null,
        p.date_rendu || null,
        p.date_decision || null,
        p.montant || 0,
        p.visite || null,
        p.date_visite || null,
        p.charge || null,
        p.commentaire || null,
        p.prix_note || null,
        p.tech_note || null,
        p.env_note || null,
      ]);
      count++;
    }
  };

  await insert("Public", PUBLIC_PROJECTS);
  await insert("Privé",  PRIVE_PROJECTS);

  console.log(`  ✅ ${count} projets importés (${PUBLIC_PROJECTS.length} Public + ${PRIVE_PROJECTS.length} Privé)`);
  console.log("\n🎉 Seed terminé !");
  await pool.end();
};

seed().catch((err) => {
  console.error("❌ Erreur seed:", err);
  process.exit(1);
});
