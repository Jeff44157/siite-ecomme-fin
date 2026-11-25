require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbName = process.env.DB_NAME || 'ecommerce';
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  multipleStatements: false
});

const CATALOG_SEED = [
  { category: 'headphones', name: "Nova Pro Wireless Headphones", slug: 'nova-pro-wireless-headphones', description: "Un casque sans fil blanc au design épuré, pensé pour une écoute confortable et légère au quotidien.", price: 45000, promoPrice: null, image: 'img/produits/nova-pro-wireless-headphones.jpg', stock: 25, isNew: true, sales: 128 },
  { category: 'headphones', name: "Pulse Buds True Wireless Earbuds", slug: 'pulse-buds-true-wireless-earbuds', description: "Des écouteurs sans fil blancs avec leur boîtier de charge, pratiques pour la musique, les appels et les déplacements.", price: 18500, promoPrice: 15500, image: 'img/produits/pulse-buds-true-wireless-earbuds.jpg', stock: 60, isNew: false, sales: 96 },
  { category: 'smart-watches', name: "FitPulse Smart Watch", slug: 'fitpulse-smart-watch', description: "Une montre connectée noire au cadran rond, simple à lire et agréable à porter du matin au soir.", price: 32000, promoPrice: 27900, image: 'img/produits/fitpulse-smart-watch.jpg', stock: 35, isNew: false, sales: 84 },
  { category: 'smart-watches', name: "Active Band Fitness Tracker", slug: 'active-band-fitness-tracker', description: "Une montre sportive bleue et grise au look net, idéale pour suivre vos activités sans quitter votre style.", price: 14500, promoPrice: null, image: 'img/produits/active-band-fitness-tracker.jpg', stock: 70, isNew: true, sales: 63 },
  { category: 'smartphones', name: "Zenith X5 Smartphone", slug: 'zenith-x5-smartphone', description: "Un smartphone noir au grand écran net et au design moderne, conçu pour accompagner toutes les journées.", price: 185000, promoPrice: null, image: 'img/produits/zenith-x5-smartphone.jpg', stock: 20, isNew: true, sales: 74 },
  { category: 'smartphones', name: "Zenith Lite A3 Smartphone", slug: 'zenith-lite-a3-smartphone', description: "Un smartphone blanc à l’écran généreux et à la finition claire, simple et agréable à utiliser.", price: 78000, promoPrice: null, image: 'img/produits/zenith-lite-a3-smartphone.jpg', stock: 40, isNew: false, sales: 58 },
  { category: 'laptops', name: "AeroBook 15 Laptop", slug: 'aerobook-15-laptop', description: "Un ordinateur portable gamer noir au clavier rétroéclairé, pensé pour le jeu, les études et la création.", price: 425000, promoPrice: 389000, image: 'img/produits/aerobook-15-laptop.jpg', stock: 12, isNew: false, sales: 42 },
  { category: 'laptops', name: "SlimBook 14 Ultrabook", slug: 'slimbook-14-ultrabook', description: "Un portable à la ligne nette posé sur un bureau chaleureux, parfait pour travailler, étudier et créer.", price: 310000, promoPrice: null, image: 'img/produits/slimbook-14-ultrabook.jpg', stock: 15, isNew: true, sales: 37 },
  { category: 'cameras', name: "Vision D200 DSLR Camera", slug: 'vision-d200-dslr-camera', description: "Un appareil photo noir à l’objectif imposant, pour des images précises et un vrai plaisir de photographie.", price: 340000, promoPrice: null, image: 'img/produits/vision-d200-dslr-camera.jpg', stock: 8, isNew: false, sales: 21 },
  { category: 'cameras', name: "ActionCam 4K Sports Camera", slug: 'actioncam-4k-sports-camera', description: "Un compact bleu au look gai et léger, facile à emporter pour capturer vos sorties et vos souvenirs.", price: 55000, promoPrice: null, image: 'img/produits/actioncam-4k-sports-camera.jpg', stock: 25, isNew: false, sales: 45 },
  { category: 'speakers', name: "BoomBox Portable Bluetooth Speaker", slug: 'boombox-portable-bluetooth-speaker', description: "Une enceinte portable noire au format cylindrique, discrète et facile à emporter partout.", price: 28000, promoPrice: null, image: 'img/produits/boombox-portable-bluetooth-speaker.jpg', stock: 40, isNew: false, sales: 112 },
  { category: 'speakers', name: "SoundBar Mini 2.1", slug: 'soundbar-mini-2-1', description: "Une enceinte ronde et claire au design simple, qui s’intègre facilement dans une pièce.", price: 52000, promoPrice: 44900, image: 'img/produits/soundbar-mini-2-1.jpg', stock: 18, isNew: true, sales: 39 },
  { category: 'gaming', name: "Striker Wireless Gamepad", slug: 'striker-wireless-gamepad', description: "Une manette bleue à la prise en main confortable, idéale pour prolonger vos sessions de jeu.", price: 25000, promoPrice: null, image: 'img/produits/striker-wireless-gamepad.jpg', stock: 45, isNew: false, sales: 87 },
  { category: 'gaming', name: "Nova Pad Violet", slug: 'nova-pad-violet', description: "Une manette violet clair aux lignes arrondies, agréable à tenir et bien classée dans l’univers gaming.", price: 25000, promoPrice: null, image: 'img/produits/nova-pad-violet.jpg', stock: 50, isNew: false, sales: 65 },
  { category: 'drones', name: "SkyLite Mini Drone 4K", slug: 'skylite-mini-drone-4k', description: "Un drone blanc à la silhouette légère, simple à prendre en main pour découvrir le pilotage.", price: 165000, promoPrice: null, image: 'img/produits/skylite-mini-drone-4k.jpg', stock: 10, isNew: true, sales: 28 },
  { category: 'drones', name: "FlyEasy Beginner Drone", slug: 'flyeasy-beginner-drone', description: "Un mini drone noir et rouge pliable, compact et ludique pour jouer en extérieur.", price: 48000, promoPrice: null, image: 'img/produits/flyeasy-beginner-drone.jpg', stock: 22, isNew: false, sales: 33 },
  { category: 'headphones', name: "Casque Bleu Nova", slug: 'casque-bleu-nova', description: "Ce casque bleu affiche une couleur franche et une forme généreuse, aussi agréable au bureau qu’à la maison.", price: 42000, promoPrice: null, image: 'img/produits/casque-bleu-nova.jpg', stock: 30, isNew: true, sales: 22 },
  { category: 'headphones', name: "Casque Rose Douceur", slug: 'casque-rose-douceur', description: "Un casque rose à l’allure douce et soignée, pour écouter de la musique avec une touche féminine et discrète.", price: 39000, promoPrice: null, image: 'img/produits/casque-rose-douceur.jpg', stock: 28, isNew: true, sales: 18 },
  { category: 'headphones', name: "Casque Gris Confort", slug: 'casque-gris-confort', description: "Un casque gris à la forme classique et à la finition sobre, pensé pour une écoute longue et tranquille.", price: 44000, promoPrice: null, image: 'img/produits/casque-gris-confort.jpg', stock: 24, isNew: false, sales: 16 },
  { category: 'headphones', name: "Casque Argent Élégance", slug: 'casque-argent-elegance', description: "Un casque argenté au design enveloppant et raffiné, idéal pour un usage quotidien confortable.", price: 48000, promoPrice: null, image: 'img/produits/casque-argent-elegance.jpg', stock: 20, isNew: false, sales: 14 },
  { category: 'headphones', name: "Casque Gaming Mic Pro", slug: 'casque-gaming-mic-pro', description: "Un casque gaming noir avec micro intégré, conçu pour échanger facilement pendant les longues sessions.", price: 52000, promoPrice: null, image: 'img/produits/casque-gaming-mic-pro.jpg', stock: 32, isNew: true, sales: 27 },
  { category: 'headphones', name: "Casque Noir et Rouge Sport", slug: 'casque-noir-et-rouge-sport', description: "Un casque noir et rouge au style énergique, avec une silhouette confortable pour les écoutes prolongées.", price: 55000, promoPrice: null, image: 'img/produits/casque-noir-et-rouge-sport.jpg', stock: 26, isNew: false, sales: 23 },
  { category: 'headphones', name: "Casque HyperX Rouge", slug: 'casque-hyperx-rouge', description: "Un casque gaming filaire noir et rouge au caractère franc, avec micro et coussinets confortables.", price: 58000, promoPrice: null, image: 'img/produits/casque-hyperx-rouge.jpg', stock: 29, isNew: false, sales: 31 },
  { category: 'headphones', name: "Casque Gaming Ombre", slug: 'casque-gaming-ombre', description: "Un casque noir révélé par des contrastes subtils, au style intense pour une atmosphère de jeu immersive.", price: 61000, promoPrice: null, image: 'img/produits/casque-gaming-ombre.jpg', stock: 18, isNew: true, sales: 12 },
  { category: 'headphones', name: "Casque Gaming RGB Noir", slug: 'casque-gaming-rgb-noir', description: "Un casque noir aux détails lumineux discrets, avec micro et design enveloppant pour le jeu.", price: 56000, promoPrice: null, image: 'img/produits/casque-gaming-rgb-noir.jpg', stock: 27, isNew: false, sales: 20 },
  { category: 'headphones', name: "Casque Gaming Moderne", slug: 'casque-gaming-moderne', description: "Un casque noir au design moderne et au micro bien intégré, pensé pour les longues parties.", price: 54000, promoPrice: null, image: 'img/produits/casque-gaming-moderne.jpg', stock: 30, isNew: false, sales: 19 },
  { category: 'headphones', name: "Casque Gaming Bleu Bass", slug: 'casque-gaming-bleu-bass', description: "Un casque noir et bleu au style gaming assumé, avec micro visible et forme enveloppante.", price: 57000, promoPrice: null, image: 'img/produits/casque-gaming-bleu-bass.jpg', stock: 25, isNew: true, sales: 21 },
  { category: 'headphones', name: "Casque Logitech G733", slug: 'casque-logitech-g733', description: "Un casque gaming noir au design sobre, avec micro pratique pour rester connecté pendant le jeu.", price: 69000, promoPrice: null, image: 'img/produits/casque-logitech-g733.jpg', stock: 16, isNew: true, sales: 15 },
  { category: 'headphones', name: "Casque Gaming Rose RGB", slug: 'casque-gaming-rose-rgb', description: "Un casque gaming rose clair au micro détachable, qui apporte une touche douce à votre univers de jeu.", price: 62000, promoPrice: null, image: 'img/produits/casque-gaming-rose-rgb.jpg', stock: 19, isNew: true, sales: 17 },
  { category: 'headphones', name: "Casque Spear Pro Noir", slug: 'casque-spear-pro-noir', description: "Un casque gaming filaire noir à l’allure technique, avec coussinets généreux et micro intégré.", price: 64000, promoPrice: null, image: 'img/produits/casque-spear-pro-noir.jpg', stock: 17, isNew: false, sales: 13 },
  { category: 'headphones', name: "Casque Sleek Noir", slug: 'casque-sleek-noir', description: "Un casque gaming noir à la silhouette élancée, avec coussinets enveloppants et design discret.", price: 59000, promoPrice: null, image: 'img/produits/casque-sleek-noir.jpg', stock: 22, isNew: true, sales: 18 },
  { category: 'headphones', name: "Casque Gaming Vert", slug: 'casque-gaming-vert', description: "Un casque gaming filaire noir et vert au look technique, avec micro et coussinets pour jouer longtemps.", price: 60000, promoPrice: null, image: 'img/produits/casque-gaming-vert.jpg', stock: 24, isNew: false, sales: 16 },
  { category: 'headphones', name: "Casque RGB Sans Fil", slug: 'casque-rgb-sans-fil', description: "Un casque gaming sans fil noir aux détails lumineux, avec arceau et coussinets pensés pour les longues parties.", price: 67000, promoPrice: null, image: 'img/produits/casque-rgb-sans-fil.jpg', stock: 20, isNew: true, sales: 14 },
  { category: 'headphones', name: "Casque Gaming Sans Fil", slug: 'casque-gaming-sans-fil', description: "Un casque noir à la silhouette enveloppante et au micro visible, pour une écoute confortable pendant le jeu.", price: 63000, promoPrice: null, image: 'img/produits/casque-gaming-sans-fil.jpg', stock: 23, isNew: false, sales: 15 },
  { category: 'headphones', name: "Casque Skullcandy Noir", slug: 'casque-skullcandy-noir', description: "Un casque circum-aural noir à la construction solide et au style urbain, pensé pour durer.", price: 72000, promoPrice: null, image: 'img/produits/casque-skullcandy-noir.jpg', stock: 14, isNew: false, sales: 11 },
  { category: 'headphones', name: "Casque Rose Foncé", slug: 'casque-rose-fonce', description: "Un casque rose foncé au look tendre, parfait pour écouter de la musique avec comfort et style.", price: 46000, promoPrice: null, image: 'img/produits/casque-rose-fonce.jpg', stock: 26, isNew: true, sales: 20 },
  { category: 'headphones', name: "Casque Enfant Rose Pastel", slug: 'casque-enfant-rose-pastel', description: "Un casque rose pastel à l’allure douce, adapté aux plus jeunes et à une écoute rassurante.", price: 24000, promoPrice: null, image: 'img/produits/casque-enfant-rose-pastel.jpg', stock: 35, isNew: true, sales: 29 },
  { category: 'headphones', name: "Casque Violet Bluetooth", slug: 'casque-violet-bluetooth', description: "Un casque violet à la personnalité douce et moderne, simple à porter au quotidien.", price: 37000, promoPrice: null, image: 'img/produits/casque-violet-bluetooth.jpg', stock: 31, isNew: false, sales: 24 },
  { category: 'headphones', name: "Écouteurs Realme Blancs", slug: 'ecouteurs-realme-blancs', description: "Des écouteurs sans fil blancs avec boîtier de charge net, légers et pratiques à emporter.", price: 22000, promoPrice: null, image: 'img/produits/ecouteurs-realme-blancs.jpg', stock: 55, isNew: true, sales: 41 },
  { category: 'headphones', name: "Écouteurs CYXG Noirs", slug: 'ecouteurs-cyxg-noirs', description: "Des écouteurs noirs avec boîtier de charge moderne, pour une écoute simple et pratique chaque jour.", price: 26000, promoPrice: null, image: 'img/produits/ecouteurs-cyxg-noirs.jpg', stock: 48, isNew: false, sales: 33 },
  { category: 'headphones', name: "Écouteurs CYXG Violets", slug: 'ecouteurs-cyxg-violets', description: "Des écouteurs violet clair avec boîtier coordonné, à la fois originaux et faciles à utiliser.", price: 27000, promoPrice: null, image: 'img/produits/ecouteurs-cyxg-violets.jpg', stock: 46, isNew: true, sales: 30 },
  { category: 'headphones', name: "Boîtier Écouteurs Contrasté", slug: 'boitier-ecouteurs-contraste', description: "Un boîtier de charge noir et blanc compact, au design contrasté et simple à glisser dans un sac.", price: 18000, promoPrice: null, image: 'img/produits/boitier-ecouteurs-contraste.jpg', stock: 60, isNew: true, sales: 38 },
  { category: 'smartphones', name: "Smartphone Rose Poudré", slug: 'smartphone-rose-poudre', description: "Un smartphone rose poudré à la teinte douce et à la silhouette fine, élégant au quotidien.", price: 145000, promoPrice: null, image: 'img/produits/smartphone-rose-poudre.jpg', stock: 18, isNew: true, sales: 16 },
  { category: 'smartphones', name: "Smartphone Rose Épuré", slug: 'smartphone-rose-epure', description: "Un smartphone rose au design net et à l’écran large, à la fois moderne et délicat.", price: 420000, promoPrice: null, image: 'img/produits/smartphone-rose-epure.jpg', stock: 12, isNew: true, sales: 19 },
  { category: 'smartphones', name: "Smartphone Bleu Pro", slug: 'smartphone-bleu-pro', description: "Un smartphone gris bleu à l’écran généreux, avec une allure moderne et une prise en main agréable.", price: 395000, promoPrice: null, image: 'img/produits/smartphone-bleu-pro.jpg', stock: 14, isNew: true, sales: 17 },
  { category: 'smartphones', name: "Smartphone Gris Net", slug: 'smartphone-gris-net', description: "Un smartphone gris et noir au look équilibré, avec écran lisible et forme fine.", price: 165000, promoPrice: null, image: 'img/produits/smartphone-gris-net.jpg', stock: 22, isNew: false, sales: 14 },
  { category: 'smartphones', name: "Smartphone Bleu et Blanc", slug: 'smartphone-bleu-et-blanc', description: "Un smartphone bleu et blanc à l’écran net, au design épuré et au style contemporain.", price: 350000, promoPrice: null, image: 'img/produits/smartphone-bleu-et-blanc.jpg', stock: 16, isNew: false, sales: 12 },
  { category: 'smartphones', name: "Smartphone Blanc Minimal", slug: 'smartphone-blanc-minimal', description: "Un smartphone blanc à l’apparence claire et minimaliste, à la fois simple et élégant.", price: 310000, promoPrice: null, image: 'img/produits/smartphone-blanc-minimal.jpg', stock: 17, isNew: false, sales: 13 },
  { category: 'smartphones', name: "Smartphone Noir Écran Large", slug: 'smartphone-noir-ecran-large', description: "Un smartphone noir au grand écran et à la finition sobre, élégant pour un usage quotidien.", price: 275000, promoPrice: null, image: 'img/produits/smartphone-noir-ecran-large.jpg', stock: 19, isNew: false, sales: 15 },
  { category: 'smart-watches', name: "Montre Connectée Bleue", slug: 'montre-connectee-bleue', description: "Une montre connectée bleue au cadran rond facile à lire, avec bracelet sombre et look discret.", price: 59000, promoPrice: null, image: 'img/produits/montre-connectee-bleue.jpg', stock: 26, isNew: true, sales: 22 },
  { category: 'smart-watches', name: "Montre Rose et Blanche", slug: 'montre-rose-et-blanche', description: "Une montre connectée rose et blanche au cadran rond, féminine sans perdre en praticité.", price: 52000, promoPrice: null, image: 'img/produits/montre-rose-et-blanche.jpg', stock: 30, isNew: true, sales: 25 },
  { category: 'smart-watches', name: "Montre Noire Élégante", slug: 'montre-noire-elegante', description: "Une montre connectée noire au cadran rond et au bracelet ajusté, sobre et élégante.", price: 48000, promoPrice: null, image: 'img/produits/montre-noire-elegante.jpg', stock: 32, isNew: false, sales: 21 },
  { category: 'smart-watches', name: "Montre Sport U9S", slug: 'montre-sport-u9s', description: "Une montre sportive au cadran généreux et au bracelet robuste, pensée pour accompagner vos activités.", price: 65000, promoPrice: null, image: 'img/produits/montre-sport-u9s.jpg', stock: 24, isNew: true, sales: 19 },
  { category: 'smart-watches', name: "Montre Sport Noire", slug: 'montre-sport-noire', description: "Une montre connectée noire au cadran rond et à l’allure masculine, avec un style sportif net.", price: 54000, promoPrice: null, image: 'img/produits/montre-sport-noire.jpg', stock: 28, isNew: false, sales: 20 },
  { category: 'smart-watches', name: "Montre Connectée Unisexe", slug: 'montre-connectee-unisexe', description: "Une montre au design unisexe, avec cadran lisible et bracelet sombre adapté à tous les styles.", price: 50000, promoPrice: null, image: 'img/produits/montre-connectee-unisexe.jpg', stock: 34, isNew: false, sales: 23 },
  { category: 'smart-watches', name: "Montre Eowihor X32", slug: 'montre-eowihor-x32', description: "Une montre connectée au cadran rond sur fond sombre, discrète et fonctionnelle au quotidien.", price: 46000, promoPrice: null, image: 'img/produits/montre-eowihor-x32.jpg', stock: 33, isNew: false, sales: 18 },
  { category: 'smart-watches', name: "Montre Turquoise", slug: 'montre-turquoise', description: "Une montre connectée turquoise au cadran clair, fraîche et agréable à porter tous les jours.", price: 51000, promoPrice: null, image: 'img/produits/montre-turquoise.jpg', stock: 29, isNew: true, sales: 24 },
  { category: 'smart-watches', name: "Montre Bracelet Marron", slug: 'montre-bracelet-marron', description: "Une montre connectée au bracelet marron, chaleureuse et facile à assortir avec une tenue quotidienne.", price: 49000, promoPrice: null, image: 'img/produits/montre-bracelet-marron.jpg', stock: 27, isNew: false, sales: 17 },
  { category: 'smart-watches', name: "Montre Noire Dorée", slug: 'montre-noire-doree', description: "Une montre connectée noire aux accents dorés, au cadran rond et au style moderne assumé.", price: 56000, promoPrice: null, image: 'img/produits/montre-noire-doree.jpg', stock: 25, isNew: true, sales: 21 },
  { category: 'laptops', name: "Portable MSI GE76", slug: 'portable-msi-ge76', description: "Un portable gamer noir et violet au clavier rétroéclairé, pensé pour des sessions immersives.", price: 720000, promoPrice: null, image: 'img/produits/portable-msi-ge76.jpg', stock: 9, isNew: false, sales: 11 },
  { category: 'laptops', name: "Portable ROG S5007W", slug: 'portable-rog-s5007w', description: "Un portable gamer noir et rouge au design franc, avec écran généreux et détails colorés.", price: 685000, promoPrice: null, image: 'img/produits/portable-rog-s5007w.jpg', stock: 10, isNew: true, sales: 13 },
  { category: 'laptops', name: "Portable Gamer Violet", slug: 'portable-gamer-violet', description: "Un portable gamer noir et violet à la personnalité affirmée, avec écran large et clavier marqué.", price: 660000, promoPrice: null, image: 'img/produits/portable-gamer-violet.jpg', stock: 11, isNew: true, sales: 12 },
  { category: 'laptops', name: "Portable ROG Hero II", slug: 'portable-rog-hero-ii', description: "Un portable gamer noir aux lignes franches, sérieux et adapté aux longues sessions de jeu.", price: 640000, promoPrice: null, image: 'img/produits/portable-rog-hero-ii.jpg', stock: 12, isNew: false, sales: 10 },
  { category: 'laptops', name: "Portable ROG Strix G16", slug: 'portable-rog-strix-g16', description: "Un portable gamer noir et violet à l’allure puissante, avec écran et clavier pensés pour le jeu.", price: 780000, promoPrice: null, image: 'img/produits/portable-rog-strix-g16.jpg', stock: 8, isNew: false, sales: 9 },
  { category: 'laptops', name: "Portable ROG Strix G16 2025", slug: 'portable-rog-strix-g16-2025', description: "Un portable gamer aux accents bleus sur un bureau chaleureux, entre esprit de jeu et élégance.", price: 890000, promoPrice: null, image: 'img/produits/portable-rog-strix-g16-2025.jpg', stock: 7, isNew: true, sales: 8 },
  { category: 'laptops', name: "Portable TUF Lumière Violette", slug: 'portable-tuf-lumiere-violette', description: "Un portable gamer baigné dans une lumière violette, pour un univers immersif et stylé.", price: 705000, promoPrice: null, image: 'img/produits/portable-tuf-lumiere-violette.jpg', stock: 9, isNew: true, sales: 10 },
  { category: 'laptops', name: "Portable HP Victus", slug: 'portable-hp-victus', description: "Un portable gamer noir et gris à la silhouette nette, simple à intégrer au quotidien.", price: 590000, promoPrice: 539000, image: 'img/produits/portable-hp-victus.jpg', stock: 13, isNew: false, sales: 12 },
  { category: 'cameras', name: "Appareil Photo Argenté", slug: 'appareil-photo-argente', description: "Un appareil photo compact argenté au design intemporel, facile à emporter partout.", price: 210000, promoPrice: null, image: 'img/produits/appareil-photo-argente.jpg', stock: 12, isNew: false, sales: 9 },
  { category: 'cameras', name: "Appareil Photo Noir Détail", slug: 'appareil-photo-noir-detail', description: "Un appareil photo noir aux détails nets, au style affirmé et à l’esprit photographique pur.", price: 265000, promoPrice: null, image: 'img/produits/appareil-photo-noir-detail.jpg', stock: 10, isNew: false, sales: 8 },
  { category: 'cameras', name: "Appareil Photo Lumière Douce", slug: 'appareil-photo-lumiere-douce', description: "Un appareil noir révélé dans une lumière intimiste, pour le plaisir tactile de la photographie.", price: 245000, promoPrice: null, image: 'img/produits/appareil-photo-lumiere-douce.jpg', stock: 11, isNew: true, sales: 7 },
  { category: 'cameras', name: "Appareil Photo Beige", slug: 'appareil-photo-beige', description: "Un compact noir et blanc sur fond beige chaleureux, léger et simple à utiliser.", price: 190000, promoPrice: null, image: 'img/produits/appareil-photo-beige.jpg', stock: 14, isNew: true, sales: 10 },
  { category: 'cameras', name: "Appareil Photo Compact Blanc", slug: 'appareil-photo-compact-blanc', description: "Un appareil compact posé sur une surface claire, avec un objectif bien visible et une composition épurée.", price: 230000, promoPrice: null, image: 'img/produits/appareil-photo-compact-blanc.jpg', stock: 13, isNew: false, sales: 9 },
  { category: 'speakers', name: "Enceinte Rouge Profond", slug: 'enceinte-rouge-profond', description: "Une enceinte rouge profond au format portable, chaleureuse et agréable à la maison comme en déplacement.", price: 38000, promoPrice: null, image: 'img/produits/enceinte-rouge-profond.jpg', stock: 30, isNew: false, sales: 21 },
  { category: 'speakers', name: "Enceinte Noire Compacte", slug: 'enceinte-noire-compacte', description: "Une enceinte noire discrète et compacte, facile à glisser dans un sac pour vos écoutes.", price: 26000, promoPrice: null, image: 'img/produits/enceinte-noire-compacte.jpg', stock: 42, isNew: false, sales: 27 },
  { category: 'speakers', name: "Enceinte Anker Sombre", slug: 'enceinte-anker-sombre', description: "Une enceinte cylindrique sombre aux reflets lumineux, conviviale pour vos moments musicaux.", price: 42000, promoPrice: null, image: 'img/produits/enceinte-anker-sombre.jpg', stock: 28, isNew: false, sales: 23 },
  { category: 'speakers', name: "Enceinte Ronde Colorée", slug: 'enceinte-ronde-coloree', description: "Une enceinte ronde et colorée à la présence joyeuse, simple à placer dans n’importe quelle pièce.", price: 34000, promoPrice: null, image: 'img/produits/enceinte-ronde-coloree.jpg', stock: 35, isNew: true, sales: 25 },
  { category: 'speakers', name: "Enceinte Rose Clair", slug: 'enceinte-rose-clair', description: "Une enceinte rose clair au format compact, gaie et facile à emporter pour toutes vos écoutes.", price: 31000, promoPrice: null, image: 'img/produits/enceinte-rose-clair.jpg', stock: 38, isNew: true, sales: 29 },
  { category: 'speakers', name: "Enceinte Compacte Douce", slug: 'enceinte-compacte-douce', description: "Une enceinte compacte violet et blanc au design simple, une idée pratique pour offrir la musique.", price: 29000, promoPrice: null, image: 'img/produits/enceinte-compacte-douce.jpg', stock: 40, isNew: true, sales: 26 },
  { category: 'speakers', name: "Enceinte JBL Verte", slug: 'enceinte-jbl-verte', description: "Une enceinte Bluetooth verte au style vif, portable et facile à utiliser partout.", price: 36000, promoPrice: null, image: 'img/produits/enceinte-jbl-verte.jpg', stock: 33, isNew: true, sales: 24 },
  { category: 'speakers', name: "Haut-parleurs Redragon RGB", slug: 'haut-parleurs-redragon-rgb', description: "Une paire d’enceintes de bureau noires à éclairage RGB, pour un poste de travail ou de jeu immersif.", price: 33000, promoPrice: null, image: 'img/produits/haut-parleurs-redragon-rgb.jpg', stock: 31, isNew: false, sales: 22 },
  { category: 'speakers', name: "Enceinte Sony Party", slug: 'enceinte-sony-party', description: "Une grande enceinte portable au style robuste, pensée pour diffuser la musique lors de grands moments.", price: 75000, promoPrice: null, image: 'img/produits/enceinte-sony-party.jpg', stock: 16, isNew: true, sales: 14 },
  { category: 'gaming', name: "Console Noire et Rouge", slug: 'console-noire-et-rouge', description: "Une console noire et rouge au style franc et dynamique, facile à installer dans un coin de jeu.", price: 320000, promoPrice: null, image: 'img/produits/console-noire-et-rouge.jpg', stock: 14, isNew: false, sales: 13 },
  { category: 'gaming', name: "Manette One Piece", slug: 'manette-one-piece', description: "Une manette décorée d’un motif anime, personnelle et agréable à prendre en main.", price: 29000, promoPrice: null, image: 'img/produits/manette-one-piece.jpg', stock: 28, isNew: true, sales: 24 },
  { category: 'gaming', name: "Console PS4 Noire", slug: 'console-ps4-noire', description: "Une console noire à la silhouette compacte, simple à placer dans le salon pour retrouver vos jeux.", price: 245000, promoPrice: null, image: 'img/produits/console-ps4-noire.jpg', stock: 18, isNew: false, sales: 17 },
  { category: 'gaming', name: "Console PS5 Blanche", slug: 'console-ps5-blanche', description: "Une console blanche aux courbes modernes, élégante et prête à transformer votre espace de jeu.", price: 480000, promoPrice: null, image: 'img/produits/console-ps5-blanche.jpg', stock: 12, isNew: true, sales: 15 },
  { category: 'gaming', name: "Console Switch 2", slug: 'console-switch-2', description: "Une console de jeu nomade à la présentation sobre, avec commandes visuelles et esprit nouvelle génération.", price: 390000, promoPrice: null, image: 'img/produits/console-switch-2.jpg', stock: 15, isNew: true, sales: 16 },
  { category: 'gaming', name: "Console Rétro", slug: 'console-retro', description: "Une console et sa manette rétro, pour revivre les premières heures du jeu vidéo avec nostalgie.", price: 85000, promoPrice: null, image: 'img/produits/console-retro.jpg', stock: 22, isNew: false, sales: 19 },
  { category: 'gaming', name: "Console PlayStation Contrastée", slug: 'console-playstation-contrastee', description: "Une console noir et blanc à la silhouette anguleuse, au caractère gamer immédiat.", price: 455000, promoPrice: null, image: 'img/produits/console-playstation-contrastee.jpg', stock: 13, isNew: true, sales: 12 },
  { category: 'drones', name: "Drone Blanc Compact", slug: 'drone-blanc-compact', description: "Un drone blanc léger et compact, idéal pour découvrir le pilotage en douceur.", price: 125000, promoPrice: null, image: 'img/produits/drone-blanc-compact.jpg', stock: 17, isNew: true, sales: 15 },
  { category: 'drones', name: "Drone en Vol Bleu", slug: 'drone-en-vol-bleu', description: "Un drone en vol sur un grand ciel bleu, qui évoque la liberté et les prises de vue aériennes.", price: 185000, promoPrice: null, image: 'img/produits/drone-en-vol-bleu.jpg', stock: 12, isNew: false, sales: 11 },
  { category: 'drones', name: "Drone Ciel Clair", slug: 'drone-ciel-clair', description: "Un drone en vol sur un ciel lumineux, à la silhouette légère et au pilotage aérien séduisant.", price: 155000, promoPrice: null, image: 'img/produits/drone-ciel-clair.jpg', stock: 14, isNew: false, sales: 10 },
  { category: 'drones', name: "Drone DJI Avata 2", slug: 'drone-dji-avata-2', description: "Un drone présenté avec ses accessoires comme un ensemble complet, prêt à piloter.", price: 295000, promoPrice: null, image: 'img/produits/drone-dji-avata-2.jpg', stock: 8, isNew: true, sales: 9 },
  { category: 'drones', name: "Drone Autonome Blanc et Rouge", slug: 'drone-autonome-blanc-et-rouge', description: "Un drone compact blanc et rouge à la silhouette précise, pensé pour la surveillance et la précision.", price: 240000, promoPrice: null, image: 'img/produits/drone-autonome-blanc-et-rouge.jpg', stock: 10, isNew: true, sales: 8 },
  { category: 'drones', name: "Drone Sécurité Sombre", slug: 'drone-securite-sombre', description: "Un drone sombre à la structure technique, inspirant la confiance pour des missions de sécurité.", price: 270000, promoPrice: null, image: 'img/produits/drone-securite-sombre.jpg', stock: 9, isNew: false, sales: 7 },
  { category: 'drones', name: "Drone Sous-Marin", slug: 'drone-sous-marin', description: "Un drone sous-marin compact à la coque claire, pour découvrir l’exploration aquatique.", price: 210000, promoPrice: null, image: 'img/produits/drone-sous-marin.jpg', stock: 11, isNew: true, sales: 8 },
  { category: 'drones', name: "Mini Drone Enfant", slug: 'mini-drone-enfant', description: "Un petit drone de loisir avec sa télécommande, léger et amusant pour un premier pilotage.", price: 58000, promoPrice: null, image: 'img/produits/mini-drone-enfant.jpg', stock: 26, isNew: true, sales: 22 }
];

const RETIRED_SLUGS = ['phantom-rgb-gaming-mouse', 'portable-bureau-chaleureux'];

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  return Number(rows[0].n) > 0;
}

async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_categories (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(60) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      category_id INT UNSIGNED NOT NULL,
      type ENUM('percent','fixed','free_shipping') NOT NULL,
      value INT UNSIGNED NOT NULL DEFAULT 0,
      min_amount INT UNSIGNED NOT NULL DEFAULT 0,
      label VARCHAR(150) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_promo_codes_category FOREIGN KEY (category_id)
        REFERENCES promo_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(160) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addColumn('orders', 'total_amount', 'INT UNSIGNED NULL AFTER user_id');
  await pool.query('UPDATE orders SET total_amount = total_price WHERE total_amount IS NULL');
  await pool.query('UPDATE orders SET total_amount = 0 WHERE total_amount IS NULL');
  await pool.query('ALTER TABLE orders MODIFY total_amount INT UNSIGNED NOT NULL');

  await addColumn('orders', 'location', "VARCHAR(180) NULL AFTER total_amount");
  await pool.query("UPDATE orders SET location = COALESCE(NULLIF(city, ''), 'Lomé Centre (Tokoin, Bè, Nyékonakpoè)') WHERE location IS NULL");
  await pool.query("UPDATE orders SET location = 'Lomé Centre (Tokoin, Bè, Nyékonakpoè)' WHERE location IS NULL OR location = ''");
  await pool.query('ALTER TABLE orders MODIFY location VARCHAR(180) NOT NULL');

  await addColumn('orders', 'promo_code', 'VARCHAR(50) NULL AFTER location');
  await addColumn('orders', 'updated_at', 'DATETIME NULL AFTER created_at');

  if (await columnExists('orders', 'user_id')) {
    await pool.query('ALTER TABLE orders MODIFY user_id INT UNSIGNED NULL');
  }
  if (await columnExists('orders', 'total_price')) {
    await pool.query('UPDATE orders SET total_price = total_amount WHERE total_price IS NULL OR total_price <> total_amount');
    await pool.query('ALTER TABLE orders MODIFY total_price INT UNSIGNED NULL');
  }
  if (await columnExists('orders', 'shipping_address')) {
    await pool.query('ALTER TABLE orders MODIFY shipping_address VARCHAR(255) NULL');
  }
  if (await columnExists('orders', 'city')) {
    await pool.query('ALTER TABLE orders MODIFY city VARCHAR(100) NULL');
  }
  if (await columnExists('orders', 'phone')) {
    await pool.query('ALTER TABLE orders MODIFY phone VARCHAR(30) NULL');
  }
  await addColumn('order_items', 'unit_price', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER quantity');
  await addColumn('products', 'promo_price', 'INT UNSIGNED NULL AFTER price');
  await addColumn('products', 'stock', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER image_url');
  await addColumn('products', 'is_new', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER stock');
  await addColumn('products', 'sales_count', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_new');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(100) NOT NULL UNIQUE,
      first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      visits INT UNSIGNED NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_activity (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NULL,
      items_count INT UNSIGNED NOT NULL DEFAULT 0,
      total INT UNSIGNED NOT NULL DEFAULT 0,
      reminded_at DATETIME NULL,
      thanked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_reminders (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cart_id INT UNSIGNED NOT NULL,
      session_id VARCHAR(100) NOT NULL,
      email VARCHAR(255) NULL,
      status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
      error TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME NULL,
      CONSTRAINT fk_cart_reminders_cart FOREIGN KEY (cart_id)
        REFERENCES cart_activity(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      sku VARCHAR(100) NULL,
      price INT UNSIGNED NULL,
      stock INT UNSIGNED NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flash_sales (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      discount_percent INT UNSIGNED NOT NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_flash_sales_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loyalty_members (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(150) NULL,
      points INT UNSIGNED NOT NULL DEFAULT 0,
      tier VARCHAR(30) NOT NULL DEFAULT 'Nouveau',
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_loyalty_members_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      reward INT UNSIGNED NOT NULL DEFAULT 0,
      discount INT UNSIGNED NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      uses INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_activity (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      admin_id INT UNSIGNED NULL,
      action VARCHAR(120) NOT NULL,
      details TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_admin_activity_admin FOREIGN KEY (admin_id)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  for (const slug of RETIRED_SLUGS) {
    await pool.execute(
      'DELETE p FROM products p WHERE p.slug = ? AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)',
      [slug]
    );
  }

  for (const item of CATALOG_SEED) {
    await pool.execute(
      `INSERT INTO products (category_id, name, slug, description, price, promo_price, image_url, stock, is_new, sales_count)
       SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM categories WHERE slug = ?
       ON DUPLICATE KEY UPDATE description = VALUES(description), image_url = VALUES(image_url), promo_price = COALESCE(promo_price, VALUES(promo_price))`,
      [item.name, item.slug, item.description, item.price, item.promoPrice, item.image, item.stock, item.isNew ? 1 : 0, item.sales, item.category]
    );
  }

  await pool.query(`
    INSERT INTO promo_categories (slug, name) VALUES
      ('all', 'Toutes les catégories'),
      ('percent', 'Pourcentage'),
      ('fixed', 'Montant fixe'),
      ('shipping', 'Livraison offerte')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);

  await pool.query(`
    INSERT INTO promo_codes (code, category_id, type, value, min_amount, label) VALUES
      ('ITHAVEN10', (SELECT id FROM promo_categories WHERE slug='percent'), 'percent', 10, 0, '-10% sur le sous-total'),
      ('VIP20', (SELECT id FROM promo_categories WHERE slug='percent'), 'percent', 20, 100000, '-20% VIP'),
      ('TECH5000', (SELECT id FROM promo_categories WHERE slug='fixed'), 'fixed', 5000, 20000, '-5 000 FCFA'),
      ('LIVRAISON', (SELECT id FROM promo_categories WHERE slug='shipping'), 'free_shipping', 0, 0, 'Livraison offerte')
    ON DUPLICATE KEY UPDATE
      category_id = VALUES(category_id),
      type = VALUES(type),
      value = VALUES(value),
      min_amount = VALUES(min_amount),
      label = VALUES(label),
      active = TRUE
  `);

  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@ithaven.tg').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'Admin1234!');
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const [found] = await pool.execute(
    'SELECT id, role, password FROM users WHERE email = ? LIMIT 1',
    [adminEmail]
  );
  if (!found.length) {
    await pool.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      ['Administrateur IT Haven', adminEmail, adminHash]
    );
  } else if (found[0].role !== 'admin' || !(await bcrypt.compare(adminPassword, found[0].password))) {
    await pool.execute("UPDATE users SET role = 'admin', password = ? WHERE id = ?", [adminHash, found[0].id]);
  }

  await pool.query(`
    INSERT INTO loyalty_members (user_id, email, name, points, tier)
    SELECT u.id, u.email, u.name, 0, 'Nouveau' FROM users u
    WHERE u.role = 'client'
      AND NOT EXISTS (SELECT 1 FROM loyalty_members lm WHERE lm.email = u.email)
  `);

  console.log('Migration terminée : base prête pour la boutique et le backoffice admin.');
  console.log(`Compte administrateur prêt : ${adminEmail}`);
}

migrate()
  .catch((err) => {
    console.error('Erreur de migration :', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
