window.ITHAVEN_DATA = (function () {
  const locations = [
    { id: 'lome-centre', name: 'Lomé Centre (Tokoin, Bè, Nyékonakpoè)', fee: 1500 },
    { id: 'agoè', name: 'Agoè / Adidogomé / Légbassito', fee: 2000 },
    { id: 'baguida', name: 'Baguida / Avepozo', fee: 2500 }
  ];

  const promoCategories = [
    { id: 'all', name: 'Toutes les catégories' },
    { id: 'percent', name: 'Pourcentage' },
    { id: 'fixed', name: 'Montant fixe' },
    { id: 'shipping', name: 'Livraison offerte' }
  ];

  const promoCodes = [
    { code: 'ITHAVEN10', category: 'percent', type: 'percent', value: 10, minAmount: 0, label: '-10% sur le sous-total' },
    { code: 'VIP20', category: 'percent', type: 'percent', value: 20, minAmount: 100000, label: '-20% VIP' },
    { code: 'TECH5000', category: 'fixed', type: 'fixed', value: 5000, minAmount: 20000, label: '-5 000 FCFA' },
    { code: 'LIVRAISON', category: 'shipping', type: 'free_shipping', value: 0, minAmount: 0, label: 'Livraison offerte' }
  ];

  const products = [
    { id: 1, categorySlug: 'headphones', category: 'Headphones', name: "Nova Pro Wireless Headphones", slug: 'nova-pro-wireless-headphones', description: "Un casque sans fil blanc au design épuré, pensé pour une écoute confortable et légère au quotidien.", price: 45000, oldPrice: null, image: 'img/produits/nova-pro-wireless-headphones.jpg', stock: 25, isNew: true, sales: 128 },
    { id: 2, categorySlug: 'headphones', category: 'Headphones', name: "Pulse Buds True Wireless Earbuds", slug: 'pulse-buds-true-wireless-earbuds', description: "Des écouteurs sans fil blancs avec leur boîtier de charge, pratiques pour la musique, les appels et les déplacements.", price: 15500, oldPrice: 18500, image: 'img/produits/pulse-buds-true-wireless-earbuds.jpg', stock: 60, isNew: false, sales: 96 },
    { id: 3, categorySlug: 'smart-watches', category: 'Smart Watches', name: "FitPulse Smart Watch", slug: 'fitpulse-smart-watch', description: "Une montre connectée noire au cadran rond, simple à lire et agréable à porter du matin au soir.", price: 27900, oldPrice: 32000, image: 'img/produits/fitpulse-smart-watch.jpg', stock: 35, isNew: false, sales: 84 },
    { id: 4, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Active Band Fitness Tracker", slug: 'active-band-fitness-tracker', description: "Une montre sportive bleue et grise au look net, idéale pour suivre vos activités sans quitter votre style.", price: 14500, oldPrice: null, image: 'img/produits/active-band-fitness-tracker.jpg', stock: 70, isNew: true, sales: 63 },
    { id: 5, categorySlug: 'smartphones', category: 'Smartphones', name: "Zenith X5 Smartphone", slug: 'zenith-x5-smartphone', description: "Un smartphone noir au grand écran net et au design moderne, conçu pour accompagner toutes les journées.", price: 185000, oldPrice: null, image: 'img/produits/zenith-x5-smartphone.jpg', stock: 20, isNew: true, sales: 74 },
    { id: 6, categorySlug: 'smartphones', category: 'Smartphones', name: "Zenith Lite A3 Smartphone", slug: 'zenith-lite-a3-smartphone', description: "Un smartphone blanc à l’écran généreux et à la finition claire, simple et agréable à utiliser.", price: 78000, oldPrice: null, image: 'img/produits/zenith-lite-a3-smartphone.jpg', stock: 40, isNew: false, sales: 58 },
    { id: 7, categorySlug: 'laptops', category: 'Laptops', name: "AeroBook 15 Laptop", slug: 'aerobook-15-laptop', description: "Un ordinateur portable gamer noir au clavier rétroéclairé, pensé pour le jeu, les études et la création.", price: 389000, oldPrice: 425000, image: 'img/produits/aerobook-15-laptop.jpg', stock: 12, isNew: false, sales: 42 },
    { id: 8, categorySlug: 'laptops', category: 'Laptops', name: "SlimBook 14 Ultrabook", slug: 'slimbook-14-ultrabook', description: "Un portable à la ligne nette posé sur un bureau chaleureux, parfait pour travailler, étudier et créer.", price: 310000, oldPrice: null, image: 'img/produits/slimbook-14-ultrabook.jpg', stock: 15, isNew: true, sales: 37 },
    { id: 9, categorySlug: 'cameras', category: 'Cameras', name: "Vision D200 DSLR Camera", slug: 'vision-d200-dslr-camera', description: "Un appareil photo noir à l’objectif imposant, pour des images précises et un vrai plaisir de photographie.", price: 340000, oldPrice: null, image: 'img/produits/vision-d200-dslr-camera.jpg', stock: 8, isNew: false, sales: 21 },
    { id: 10, categorySlug: 'cameras', category: 'Cameras', name: "ActionCam 4K Sports Camera", slug: 'actioncam-4k-sports-camera', description: "Un compact bleu au look gai et léger, facile à emporter pour capturer vos sorties et vos souvenirs.", price: 55000, oldPrice: null, image: 'img/produits/actioncam-4k-sports-camera.jpg', stock: 25, isNew: false, sales: 45 },
    { id: 11, categorySlug: 'speakers', category: 'Speakers', name: "BoomBox Portable Bluetooth Speaker", slug: 'boombox-portable-bluetooth-speaker', description: "Une enceinte portable noire au format cylindrique, discrète et facile à emporter partout.", price: 28000, oldPrice: null, image: 'img/produits/boombox-portable-bluetooth-speaker.jpg', stock: 40, isNew: false, sales: 112 },
    { id: 12, categorySlug: 'speakers', category: 'Speakers', name: "SoundBar Mini 2.1", slug: 'soundbar-mini-2-1', description: "Une enceinte ronde et claire au design simple, qui s’intègre facilement dans une pièce.", price: 44900, oldPrice: 52000, image: 'img/produits/soundbar-mini-2-1.jpg', stock: 18, isNew: true, sales: 39 },
    { id: 13, categorySlug: 'gaming', category: 'Gaming', name: "Striker Wireless Gamepad", slug: 'striker-wireless-gamepad', description: "Une manette bleue à la prise en main confortable, idéale pour prolonger vos sessions de jeu.", price: 25000, oldPrice: null, image: 'img/produits/striker-wireless-gamepad.jpg', stock: 45, isNew: false, sales: 87 },
    { id: 14, categorySlug: 'gaming', category: 'Gaming', name: "Nova Pad Violet", slug: 'nova-pad-violet', description: "Une manette violet clair aux lignes arrondies, agréable à tenir et bien classée dans l’univers gaming.", price: 25000, oldPrice: null, image: 'img/produits/nova-pad-violet.jpg', stock: 50, isNew: false, sales: 65 },
    { id: 15, categorySlug: 'drones', category: 'Drones', name: "SkyLite Mini Drone 4K", slug: 'skylite-mini-drone-4k', description: "Un drone blanc à la silhouette légère, simple à prendre en main pour découvrir le pilotage.", price: 165000, oldPrice: null, image: 'img/produits/skylite-mini-drone-4k.jpg', stock: 10, isNew: true, sales: 28 },
    { id: 16, categorySlug: 'drones', category: 'Drones', name: "FlyEasy Beginner Drone", slug: 'flyeasy-beginner-drone', description: "Un mini drone noir et rouge pliable, compact et ludique pour jouer en extérieur.", price: 48000, oldPrice: null, image: 'img/produits/flyeasy-beginner-drone.jpg', stock: 22, isNew: false, sales: 33 },
    { id: 17, categorySlug: 'headphones', category: 'Headphones', name: "Casque Bleu Nova", slug: 'casque-bleu-nova', description: "Ce casque bleu affiche une couleur franche et une forme généreuse, aussi agréable au bureau qu’à la maison.", price: 42000, oldPrice: null, image: 'img/produits/casque-bleu-nova.jpg', stock: 30, isNew: true, sales: 22 },
    { id: 18, categorySlug: 'headphones', category: 'Headphones', name: "Casque Rose Douceur", slug: 'casque-rose-douceur', description: "Un casque rose à l’allure douce et soignée, pour écouter de la musique avec une touche féminine et discrète.", price: 39000, oldPrice: null, image: 'img/produits/casque-rose-douceur.jpg', stock: 28, isNew: true, sales: 18 },
    { id: 19, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gris Confort", slug: 'casque-gris-confort', description: "Un casque gris à la forme classique et à la finition sobre, pensé pour une écoute longue et tranquille.", price: 44000, oldPrice: null, image: 'img/produits/casque-gris-confort.jpg', stock: 24, isNew: false, sales: 16 },
    { id: 20, categorySlug: 'headphones', category: 'Headphones', name: "Casque Argent Élégance", slug: 'casque-argent-elegance', description: "Un casque argenté au design enveloppant et raffiné, idéal pour un usage quotidien confortable.", price: 48000, oldPrice: null, image: 'img/produits/casque-argent-elegance.jpg', stock: 20, isNew: false, sales: 14 },
    { id: 21, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Mic Pro", slug: 'casque-gaming-mic-pro', description: "Un casque gaming noir avec micro intégré, conçu pour échanger facilement pendant les longues sessions.", price: 52000, oldPrice: null, image: 'img/produits/casque-gaming-mic-pro.jpg', stock: 32, isNew: true, sales: 27 },
    { id: 22, categorySlug: 'headphones', category: 'Headphones', name: "Casque Noir et Rouge Sport", slug: 'casque-noir-et-rouge-sport', description: "Un casque noir et rouge au style énergique, avec une silhouette confortable pour les écoutes prolongées.", price: 55000, oldPrice: null, image: 'img/produits/casque-noir-et-rouge-sport.jpg', stock: 26, isNew: false, sales: 23 },
    { id: 23, categorySlug: 'headphones', category: 'Headphones', name: "Casque HyperX Rouge", slug: 'casque-hyperx-rouge', description: "Un casque gaming filaire noir et rouge au caractère franc, avec micro et coussinets confortables.", price: 58000, oldPrice: null, image: 'img/produits/casque-hyperx-rouge.jpg', stock: 29, isNew: false, sales: 31 },
    { id: 24, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Ombre", slug: 'casque-gaming-ombre', description: "Un casque noir révélé par des contrastes subtils, au style intense pour une atmosphère de jeu immersive.", price: 61000, oldPrice: null, image: 'img/produits/casque-gaming-ombre.jpg', stock: 18, isNew: true, sales: 12 },
    { id: 25, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming RGB Noir", slug: 'casque-gaming-rgb-noir', description: "Un casque noir aux détails lumineux discrets, avec micro et design enveloppant pour le jeu.", price: 56000, oldPrice: null, image: 'img/produits/casque-gaming-rgb-noir.jpg', stock: 27, isNew: false, sales: 20 },
    { id: 26, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Moderne", slug: 'casque-gaming-moderne', description: "Un casque noir au design moderne et au micro bien intégré, pensé pour les longues parties.", price: 54000, oldPrice: null, image: 'img/produits/casque-gaming-moderne.jpg', stock: 30, isNew: false, sales: 19 },
    { id: 27, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Bleu Bass", slug: 'casque-gaming-bleu-bass', description: "Un casque noir et bleu au style gaming assumé, avec micro visible et forme enveloppante.", price: 57000, oldPrice: null, image: 'img/produits/casque-gaming-bleu-bass.jpg', stock: 25, isNew: true, sales: 21 },
    { id: 28, categorySlug: 'headphones', category: 'Headphones', name: "Casque Logitech G733", slug: 'casque-logitech-g733', description: "Un casque gaming noir au design sobre, avec micro pratique pour rester connecté pendant le jeu.", price: 69000, oldPrice: null, image: 'img/produits/casque-logitech-g733.jpg', stock: 16, isNew: true, sales: 15 },
    { id: 29, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Rose RGB", slug: 'casque-gaming-rose-rgb', description: "Un casque gaming rose clair au micro détachable, qui apporte une touche douce à votre univers de jeu.", price: 62000, oldPrice: null, image: 'img/produits/casque-gaming-rose-rgb.jpg', stock: 19, isNew: true, sales: 17 },
    { id: 30, categorySlug: 'headphones', category: 'Headphones', name: "Casque Spear Pro Noir", slug: 'casque-spear-pro-noir', description: "Un casque gaming filaire noir à l’allure technique, avec coussinets généreux et micro intégré.", price: 64000, oldPrice: null, image: 'img/produits/casque-spear-pro-noir.jpg', stock: 17, isNew: false, sales: 13 },
    { id: 31, categorySlug: 'headphones', category: 'Headphones', name: "Casque Sleek Noir", slug: 'casque-sleek-noir', description: "Un casque gaming noir à la silhouette élancée, avec coussinets enveloppants et design discret.", price: 59000, oldPrice: null, image: 'img/produits/casque-sleek-noir.jpg', stock: 22, isNew: true, sales: 18 },
    { id: 32, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Vert", slug: 'casque-gaming-vert', description: "Un casque gaming filaire noir et vert au look technique, avec micro et coussinets pour jouer longtemps.", price: 60000, oldPrice: null, image: 'img/produits/casque-gaming-vert.jpg', stock: 24, isNew: false, sales: 16 },
    { id: 33, categorySlug: 'headphones', category: 'Headphones', name: "Casque RGB Sans Fil", slug: 'casque-rgb-sans-fil', description: "Un casque gaming sans fil noir aux détails lumineux, avec arceau et coussinets pensés pour les longues parties.", price: 67000, oldPrice: null, image: 'img/produits/casque-rgb-sans-fil.jpg', stock: 20, isNew: true, sales: 14 },
    { id: 34, categorySlug: 'headphones', category: 'Headphones', name: "Casque Gaming Sans Fil", slug: 'casque-gaming-sans-fil', description: "Un casque noir à la silhouette enveloppante et au micro visible, pour une écoute confortable pendant le jeu.", price: 63000, oldPrice: null, image: 'img/produits/casque-gaming-sans-fil.jpg', stock: 23, isNew: false, sales: 15 },
    { id: 35, categorySlug: 'headphones', category: 'Headphones', name: "Casque Skullcandy Noir", slug: 'casque-skullcandy-noir', description: "Un casque circum-aural noir à la construction solide et au style urbain, pensé pour durer.", price: 72000, oldPrice: null, image: 'img/produits/casque-skullcandy-noir.jpg', stock: 14, isNew: false, sales: 11 },
    { id: 36, categorySlug: 'headphones', category: 'Headphones', name: "Casque Rose Foncé", slug: 'casque-rose-fonce', description: "Un casque rose foncé au look tendre, parfait pour écouter de la musique avec comfort et style.", price: 46000, oldPrice: null, image: 'img/produits/casque-rose-fonce.jpg', stock: 26, isNew: true, sales: 20 },
    { id: 37, categorySlug: 'headphones', category: 'Headphones', name: "Casque Enfant Rose Pastel", slug: 'casque-enfant-rose-pastel', description: "Un casque rose pastel à l’allure douce, adapté aux plus jeunes et à une écoute rassurante.", price: 24000, oldPrice: null, image: 'img/produits/casque-enfant-rose-pastel.jpg', stock: 35, isNew: true, sales: 29 },
    { id: 38, categorySlug: 'headphones', category: 'Headphones', name: "Casque Violet Bluetooth", slug: 'casque-violet-bluetooth', description: "Un casque violet à la personnalité douce et moderne, simple à porter au quotidien.", price: 37000, oldPrice: null, image: 'img/produits/casque-violet-bluetooth.jpg', stock: 31, isNew: false, sales: 24 },
    { id: 39, categorySlug: 'headphones', category: 'Headphones', name: "Écouteurs Realme Blancs", slug: 'ecouteurs-realme-blancs', description: "Des écouteurs sans fil blancs avec boîtier de charge net, légers et pratiques à emporter.", price: 22000, oldPrice: null, image: 'img/produits/ecouteurs-realme-blancs.jpg', stock: 55, isNew: true, sales: 41 },
    { id: 40, categorySlug: 'headphones', category: 'Headphones', name: "Écouteurs CYXG Noirs", slug: 'ecouteurs-cyxg-noirs', description: "Des écouteurs noirs avec boîtier de charge moderne, pour une écoute simple et pratique chaque jour.", price: 26000, oldPrice: null, image: 'img/produits/ecouteurs-cyxg-noirs.jpg', stock: 48, isNew: false, sales: 33 },
    { id: 41, categorySlug: 'headphones', category: 'Headphones', name: "Écouteurs CYXG Violets", slug: 'ecouteurs-cyxg-violets', description: "Des écouteurs violet clair avec boîtier coordonné, à la fois originaux et faciles à utiliser.", price: 27000, oldPrice: null, image: 'img/produits/ecouteurs-cyxg-violets.jpg', stock: 46, isNew: true, sales: 30 },
    { id: 42, categorySlug: 'headphones', category: 'Headphones', name: "Boîtier Écouteurs Contrasté", slug: 'boitier-ecouteurs-contraste', description: "Un boîtier de charge noir et blanc compact, au design contrasté et simple à glisser dans un sac.", price: 18000, oldPrice: null, image: 'img/produits/boitier-ecouteurs-contraste.jpg', stock: 60, isNew: true, sales: 38 },
    { id: 43, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Rose Poudré", slug: 'smartphone-rose-poudre', description: "Un smartphone rose poudré à la teinte douce et à la silhouette fine, élégant au quotidien.", price: 145000, oldPrice: null, image: 'img/produits/smartphone-rose-poudre.jpg', stock: 18, isNew: true, sales: 16 },
    { id: 44, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Rose Épuré", slug: 'smartphone-rose-epure', description: "Un smartphone rose au design net et à l’écran large, à la fois moderne et délicat.", price: 420000, oldPrice: null, image: 'img/produits/smartphone-rose-epure.jpg', stock: 12, isNew: true, sales: 19 },
    { id: 45, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Bleu Pro", slug: 'smartphone-bleu-pro', description: "Un smartphone gris bleu à l’écran généreux, avec une allure moderne et une prise en main agréable.", price: 395000, oldPrice: null, image: 'img/produits/smartphone-bleu-pro.jpg', stock: 14, isNew: true, sales: 17 },
    { id: 46, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Gris Net", slug: 'smartphone-gris-net', description: "Un smartphone gris et noir au look équilibré, avec écran lisible et forme fine.", price: 165000, oldPrice: null, image: 'img/produits/smartphone-gris-net.jpg', stock: 22, isNew: false, sales: 14 },
    { id: 47, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Bleu et Blanc", slug: 'smartphone-bleu-et-blanc', description: "Un smartphone bleu et blanc à l’écran net, au design épuré et au style contemporain.", price: 350000, oldPrice: null, image: 'img/produits/smartphone-bleu-et-blanc.jpg', stock: 16, isNew: false, sales: 12 },
    { id: 48, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Blanc Minimal", slug: 'smartphone-blanc-minimal', description: "Un smartphone blanc à l’apparence claire et minimaliste, à la fois simple et élégant.", price: 310000, oldPrice: null, image: 'img/produits/smartphone-blanc-minimal.jpg', stock: 17, isNew: false, sales: 13 },
    { id: 49, categorySlug: 'smartphones', category: 'Smartphones', name: "Smartphone Noir Écran Large", slug: 'smartphone-noir-ecran-large', description: "Un smartphone noir au grand écran et à la finition sobre, élégant pour un usage quotidien.", price: 275000, oldPrice: null, image: 'img/produits/smartphone-noir-ecran-large.jpg', stock: 19, isNew: false, sales: 15 },
    { id: 50, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Connectée Bleue", slug: 'montre-connectee-bleue', description: "Une montre connectée bleue au cadran rond facile à lire, avec bracelet sombre et look discret.", price: 59000, oldPrice: null, image: 'img/produits/montre-connectee-bleue.jpg', stock: 26, isNew: true, sales: 22 },
    { id: 51, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Rose et Blanche", slug: 'montre-rose-et-blanche', description: "Une montre connectée rose et blanche au cadran rond, féminine sans perdre en praticité.", price: 52000, oldPrice: null, image: 'img/produits/montre-rose-et-blanche.jpg', stock: 30, isNew: true, sales: 25 },
    { id: 52, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Noire Élégante", slug: 'montre-noire-elegante', description: "Une montre connectée noire au cadran rond et au bracelet ajusté, sobre et élégante.", price: 48000, oldPrice: null, image: 'img/produits/montre-noire-elegante.jpg', stock: 32, isNew: false, sales: 21 },
    { id: 53, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Sport U9S", slug: 'montre-sport-u9s', description: "Une montre sportive au cadran généreux et au bracelet robuste, pensée pour accompagner vos activités.", price: 65000, oldPrice: null, image: 'img/produits/montre-sport-u9s.jpg', stock: 24, isNew: true, sales: 19 },
    { id: 54, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Sport Noire", slug: 'montre-sport-noire', description: "Une montre connectée noire au cadran rond et à l’allure masculine, avec un style sportif net.", price: 54000, oldPrice: null, image: 'img/produits/montre-sport-noire.jpg', stock: 28, isNew: false, sales: 20 },
    { id: 55, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Connectée Unisexe", slug: 'montre-connectee-unisexe', description: "Une montre au design unisexe, avec cadran lisible et bracelet sombre adapté à tous les styles.", price: 50000, oldPrice: null, image: 'img/produits/montre-connectee-unisexe.jpg', stock: 34, isNew: false, sales: 23 },
    { id: 56, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Eowihor X32", slug: 'montre-eowihor-x32', description: "Une montre connectée au cadran rond sur fond sombre, discrète et fonctionnelle au quotidien.", price: 46000, oldPrice: null, image: 'img/produits/montre-eowihor-x32.jpg', stock: 33, isNew: false, sales: 18 },
    { id: 57, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Turquoise", slug: 'montre-turquoise', description: "Une montre connectée turquoise au cadran clair, fraîche et agréable à porter tous les jours.", price: 51000, oldPrice: null, image: 'img/produits/montre-turquoise.jpg', stock: 29, isNew: true, sales: 24 },
    { id: 58, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Bracelet Marron", slug: 'montre-bracelet-marron', description: "Une montre connectée au bracelet marron, chaleureuse et facile à assortir avec une tenue quotidienne.", price: 49000, oldPrice: null, image: 'img/produits/montre-bracelet-marron.jpg', stock: 27, isNew: false, sales: 17 },
    { id: 59, categorySlug: 'smart-watches', category: 'Smart Watches', name: "Montre Noire Dorée", slug: 'montre-noire-doree', description: "Une montre connectée noire aux accents dorés, au cadran rond et au style moderne assumé.", price: 56000, oldPrice: null, image: 'img/produits/montre-noire-doree.jpg', stock: 25, isNew: true, sales: 21 },
    { id: 60, categorySlug: 'laptops', category: 'Laptops', name: "Portable MSI GE76", slug: 'portable-msi-ge76', description: "Un portable gamer noir et violet au clavier rétroéclairé, pensé pour des sessions immersives.", price: 720000, oldPrice: null, image: 'img/produits/portable-msi-ge76.jpg', stock: 9, isNew: false, sales: 11 },
    { id: 61, categorySlug: 'laptops', category: 'Laptops', name: "Portable ROG S5007W", slug: 'portable-rog-s5007w', description: "Un portable gamer noir et rouge au design franc, avec écran généreux et détails colorés.", price: 685000, oldPrice: null, image: 'img/produits/portable-rog-s5007w.jpg', stock: 10, isNew: true, sales: 13 },
    { id: 62, categorySlug: 'laptops', category: 'Laptops', name: "Portable Gamer Violet", slug: 'portable-gamer-violet', description: "Un portable gamer noir et violet à la personnalité affirmée, avec écran large et clavier marqué.", price: 660000, oldPrice: null, image: 'img/produits/portable-gamer-violet.jpg', stock: 11, isNew: true, sales: 12 },
    { id: 63, categorySlug: 'laptops', category: 'Laptops', name: "Portable ROG Hero II", slug: 'portable-rog-hero-ii', description: "Un portable gamer noir aux lignes franches, sérieux et adapté aux longues sessions de jeu.", price: 640000, oldPrice: null, image: 'img/produits/portable-rog-hero-ii.jpg', stock: 12, isNew: false, sales: 10 },
    { id: 64, categorySlug: 'laptops', category: 'Laptops', name: "Portable ROG Strix G16", slug: 'portable-rog-strix-g16', description: "Un portable gamer noir et violet à l’allure puissante, avec écran et clavier pensés pour le jeu.", price: 780000, oldPrice: null, image: 'img/produits/portable-rog-strix-g16.jpg', stock: 8, isNew: false, sales: 9 },
    { id: 65, categorySlug: 'laptops', category: 'Laptops', name: "Portable ROG Strix G16 2025", slug: 'portable-rog-strix-g16-2025', description: "Un portable gamer aux accents bleus sur un bureau chaleureux, entre esprit de jeu et élégance.", price: 890000, oldPrice: null, image: 'img/produits/portable-rog-strix-g16-2025.jpg', stock: 7, isNew: true, sales: 8 },
    { id: 66, categorySlug: 'laptops', category: 'Laptops', name: "Portable TUF Lumière Violette", slug: 'portable-tuf-lumiere-violette', description: "Un portable gamer baigné dans une lumière violette, pour un univers immersif et stylé.", price: 705000, oldPrice: null, image: 'img/produits/portable-tuf-lumiere-violette.jpg', stock: 9, isNew: true, sales: 10 },
    { id: 67, categorySlug: 'laptops', category: 'Laptops', name: "Portable HP Victus", slug: 'portable-hp-victus', description: "Un portable gamer noir et gris à la silhouette nette, simple à intégrer au quotidien.", price: 539000, oldPrice: 590000, image: 'img/produits/portable-hp-victus.jpg', stock: 13, isNew: false, sales: 12 },
    { id: 68, categorySlug: 'cameras', category: 'Cameras', name: "Appareil Photo Argenté", slug: 'appareil-photo-argente', description: "Un appareil photo compact argenté au design intemporel, facile à emporter partout.", price: 210000, oldPrice: null, image: 'img/produits/appareil-photo-argente.jpg', stock: 12, isNew: false, sales: 9 },
    { id: 69, categorySlug: 'cameras', category: 'Cameras', name: "Appareil Photo Noir Détail", slug: 'appareil-photo-noir-detail', description: "Un appareil photo noir aux détails nets, au style affirmé et à l’esprit photographique pur.", price: 265000, oldPrice: null, image: 'img/produits/appareil-photo-noir-detail.jpg', stock: 10, isNew: false, sales: 8 },
    { id: 70, categorySlug: 'cameras', category: 'Cameras', name: "Appareil Photo Lumière Douce", slug: 'appareil-photo-lumiere-douce', description: "Un appareil noir révélé dans une lumière intimiste, pour le plaisir tactile de la photographie.", price: 245000, oldPrice: null, image: 'img/produits/appareil-photo-lumiere-douce.jpg', stock: 11, isNew: true, sales: 7 },
    { id: 71, categorySlug: 'cameras', category: 'Cameras', name: "Appareil Photo Beige", slug: 'appareil-photo-beige', description: "Un compact noir et blanc sur fond beige chaleureux, léger et simple à utiliser.", price: 190000, oldPrice: null, image: 'img/produits/appareil-photo-beige.jpg', stock: 14, isNew: true, sales: 10 },
    { id: 72, categorySlug: 'cameras', category: 'Cameras', name: "Appareil Photo Compact Blanc", slug: 'appareil-photo-compact-blanc', description: "Un appareil compact posé sur une surface claire, avec un objectif bien visible et une composition épurée.", price: 230000, oldPrice: null, image: 'img/produits/appareil-photo-compact-blanc.jpg', stock: 13, isNew: false, sales: 9 },
    { id: 73, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Rouge Profond", slug: 'enceinte-rouge-profond', description: "Une enceinte rouge profond au format portable, chaleureuse et agréable à la maison comme en déplacement.", price: 38000, oldPrice: null, image: 'img/produits/enceinte-rouge-profond.jpg', stock: 30, isNew: false, sales: 21 },
    { id: 74, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Noire Compacte", slug: 'enceinte-noire-compacte', description: "Une enceinte noire discrète et compacte, facile à glisser dans un sac pour vos écoutes.", price: 26000, oldPrice: null, image: 'img/produits/enceinte-noire-compacte.jpg', stock: 42, isNew: false, sales: 27 },
    { id: 75, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Anker Sombre", slug: 'enceinte-anker-sombre', description: "Une enceinte cylindrique sombre aux reflets lumineux, conviviale pour vos moments musicaux.", price: 42000, oldPrice: null, image: 'img/produits/enceinte-anker-sombre.jpg', stock: 28, isNew: false, sales: 23 },
    { id: 76, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Ronde Colorée", slug: 'enceinte-ronde-coloree', description: "Une enceinte ronde et colorée à la présence joyeuse, simple à placer dans n’importe quelle pièce.", price: 34000, oldPrice: null, image: 'img/produits/enceinte-ronde-coloree.jpg', stock: 35, isNew: true, sales: 25 },
    { id: 77, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Rose Clair", slug: 'enceinte-rose-clair', description: "Une enceinte rose clair au format compact, gaie et facile à emporter pour toutes vos écoutes.", price: 31000, oldPrice: null, image: 'img/produits/enceinte-rose-clair.jpg', stock: 38, isNew: true, sales: 29 },
    { id: 78, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Compacte Douce", slug: 'enceinte-compacte-douce', description: "Une enceinte compacte violet et blanc au design simple, une idée pratique pour offrir la musique.", price: 29000, oldPrice: null, image: 'img/produits/enceinte-compacte-douce.jpg', stock: 40, isNew: true, sales: 26 },
    { id: 79, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte JBL Verte", slug: 'enceinte-jbl-verte', description: "Une enceinte Bluetooth verte au style vif, portable et facile à utiliser partout.", price: 36000, oldPrice: null, image: 'img/produits/enceinte-jbl-verte.jpg', stock: 33, isNew: true, sales: 24 },
    { id: 80, categorySlug: 'speakers', category: 'Speakers', name: "Haut-parleurs Redragon RGB", slug: 'haut-parleurs-redragon-rgb', description: "Une paire d’enceintes de bureau noires à éclairage RGB, pour un poste de travail ou de jeu immersif.", price: 33000, oldPrice: null, image: 'img/produits/haut-parleurs-redragon-rgb.jpg', stock: 31, isNew: false, sales: 22 },
    { id: 81, categorySlug: 'speakers', category: 'Speakers', name: "Enceinte Sony Party", slug: 'enceinte-sony-party', description: "Une grande enceinte portable au style robuste, pensée pour diffuser la musique lors de grands moments.", price: 75000, oldPrice: null, image: 'img/produits/enceinte-sony-party.jpg', stock: 16, isNew: true, sales: 14 },
    { id: 82, categorySlug: 'gaming', category: 'Gaming', name: "Console Noire et Rouge", slug: 'console-noire-et-rouge', description: "Une console noire et rouge au style franc et dynamique, facile à installer dans un coin de jeu.", price: 320000, oldPrice: null, image: 'img/produits/console-noire-et-rouge.jpg', stock: 14, isNew: false, sales: 13 },
    { id: 83, categorySlug: 'gaming', category: 'Gaming', name: "Manette One Piece", slug: 'manette-one-piece', description: "Une manette décorée d’un motif anime, personnelle et agréable à prendre en main.", price: 29000, oldPrice: null, image: 'img/produits/manette-one-piece.jpg', stock: 28, isNew: true, sales: 24 },
    { id: 84, categorySlug: 'gaming', category: 'Gaming', name: "Console PS4 Noire", slug: 'console-ps4-noire', description: "Une console noire à la silhouette compacte, simple à placer dans le salon pour retrouver vos jeux.", price: 245000, oldPrice: null, image: 'img/produits/console-ps4-noire.jpg', stock: 18, isNew: false, sales: 17 },
    { id: 85, categorySlug: 'gaming', category: 'Gaming', name: "Console PS5 Blanche", slug: 'console-ps5-blanche', description: "Une console blanche aux courbes modernes, élégante et prête à transformer votre espace de jeu.", price: 480000, oldPrice: null, image: 'img/produits/console-ps5-blanche.jpg', stock: 12, isNew: true, sales: 15 },
    { id: 86, categorySlug: 'gaming', category: 'Gaming', name: "Console Switch 2", slug: 'console-switch-2', description: "Une console de jeu nomade à la présentation sobre, avec commandes visuelles et esprit nouvelle génération.", price: 390000, oldPrice: null, image: 'img/produits/console-switch-2.jpg', stock: 15, isNew: true, sales: 16 },
    { id: 87, categorySlug: 'gaming', category: 'Gaming', name: "Console Rétro", slug: 'console-retro', description: "Une console et sa manette rétro, pour revivre les premières heures du jeu vidéo avec nostalgie.", price: 85000, oldPrice: null, image: 'img/produits/console-retro.jpg', stock: 22, isNew: false, sales: 19 },
    { id: 88, categorySlug: 'gaming', category: 'Gaming', name: "Console PlayStation Contrastée", slug: 'console-playstation-contrastee', description: "Une console noir et blanc à la silhouette anguleuse, au caractère gamer immédiat.", price: 455000, oldPrice: null, image: 'img/produits/console-playstation-contrastee.jpg', stock: 13, isNew: true, sales: 12 },
    { id: 89, categorySlug: 'drones', category: 'Drones', name: "Drone Blanc Compact", slug: 'drone-blanc-compact', description: "Un drone blanc léger et compact, idéal pour découvrir le pilotage en douceur.", price: 125000, oldPrice: null, image: 'img/produits/drone-blanc-compact.jpg', stock: 17, isNew: true, sales: 15 },
    { id: 90, categorySlug: 'drones', category: 'Drones', name: "Drone en Vol Bleu", slug: 'drone-en-vol-bleu', description: "Un drone en vol sur un grand ciel bleu, qui évoque la liberté et les prises de vue aériennes.", price: 185000, oldPrice: null, image: 'img/produits/drone-en-vol-bleu.jpg', stock: 12, isNew: false, sales: 11 },
    { id: 91, categorySlug: 'drones', category: 'Drones', name: "Drone Ciel Clair", slug: 'drone-ciel-clair', description: "Un drone en vol sur un ciel lumineux, à la silhouette légère et au pilotage aérien séduisant.", price: 155000, oldPrice: null, image: 'img/produits/drone-ciel-clair.jpg', stock: 14, isNew: false, sales: 10 },
    { id: 92, categorySlug: 'drones', category: 'Drones', name: "Drone DJI Avata 2", slug: 'drone-dji-avata-2', description: "Un drone présenté avec ses accessoires comme un ensemble complet, prêt à piloter.", price: 295000, oldPrice: null, image: 'img/produits/drone-dji-avata-2.jpg', stock: 8, isNew: true, sales: 9 },
    { id: 93, categorySlug: 'drones', category: 'Drones', name: "Drone Autonome Blanc et Rouge", slug: 'drone-autonome-blanc-et-rouge', description: "Un drone compact blanc et rouge à la silhouette précise, pensé pour la surveillance et la précision.", price: 240000, oldPrice: null, image: 'img/produits/drone-autonome-blanc-et-rouge.jpg', stock: 10, isNew: true, sales: 8 },
    { id: 94, categorySlug: 'drones', category: 'Drones', name: "Drone Sécurité Sombre", slug: 'drone-securite-sombre', description: "Un drone sombre à la structure technique, inspirant la confiance pour des missions de sécurité.", price: 270000, oldPrice: null, image: 'img/produits/drone-securite-sombre.jpg', stock: 9, isNew: false, sales: 7 },
    { id: 95, categorySlug: 'drones', category: 'Drones', name: "Drone Sous-Marin", slug: 'drone-sous-marin', description: "Un drone sous-marin compact à la coque claire, pour découvrir l’exploration aquatique.", price: 210000, oldPrice: null, image: 'img/produits/drone-sous-marin.jpg', stock: 11, isNew: true, sales: 8 },
    { id: 96, categorySlug: 'drones', category: 'Drones', name: "Mini Drone Enfant", slug: 'mini-drone-enfant', description: "Un petit drone de loisir avec sa télécommande, léger et amusant pour un premier pilotage.", price: 58000, oldPrice: null, image: 'img/produits/mini-drone-enfant.jpg', stock: 26, isNew: true, sales: 22 }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  function normalizeProduct(row) {
    if (!row) return null;
    const price = Number(row.promo_price || row.price || row.prix || 0);
    const oldPrice = row.promo_price ? Number(row.price) : Number(row.oldPrice || row.old_price || 0) || null;
    const rawCategory = String(row.categorySlug || row.category_slug || row.category || '');
    const slug = row.slug || String(row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      id: row.id,
      name: row.name || row.nom || 'Produit ITHAVEN',
      slug,
      description: row.description || '',
      category: row.category || row.categorie || 'Tech',
      categorySlug: rawCategory.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      price,
      oldPrice,
      image: row.image || row.image_url || 'img/logo.png',
      stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : 0,
      isNew: Boolean(row.is_new || row.isNew),
      sales: Number(row.sales_count || row.sales || 0)
    };
  }

  function findProduct(id) {
    const normalizedId = Number(id);
    return products.find((item) => Number(item.id) === normalizedId) || null;
  }

  function getLocation(id) {
    return locations.find((item) => item.id === id || item.name === id) || locations[0];
  }

  function getSessionId() {
    let id = '';
    try {
      id = sessionStorage.getItem('ithaven_session') || '';
      if (!id) {
        id = 'VIS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('ithaven_session', id);
      }
    } catch (_) {
      id = 'VIS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }
    return id;
  }

  function getPromo(code) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    return promoCodes.find((item) => item.code === normalizedCode) || null;
  }

  function calculateTotals(items, locationId, promoCode) {
    const cart = Array.isArray(items) ? items : [];
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    const location = getLocation(locationId);
    const promo = getPromo(promoCode);
    let discount = 0;
    let shipping = location.fee;

    if (promo && subtotal >= Number(promo.minAmount || 0)) {
      if (promo.type === 'percent') discount = Math.round((subtotal * Number(promo.value)) / 100);
      if (promo.type === 'fixed') discount = Math.min(subtotal, Number(promo.value));
      if (promo.type === 'free_shipping') shipping = 0;
    }

    return {
      subtotal,
      discount,
      shipping,
      total: Math.max(0, subtotal - discount + shipping),
      location,
      promo: promo && subtotal >= Number(promo.minAmount || 0) ? promo : null
    };
  }

  return {
    locations,
    promoCategories,
    promoCodes,
    products,
    escapeHtml,
    formatPrice,
    normalizeProduct,
    findProduct,
    getLocation,
    getSessionId,
    getPromo,
    calculateTotals
  };
})();
