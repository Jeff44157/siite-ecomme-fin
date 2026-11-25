CREATE DATABASE IF NOT EXISTS ecommerce
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS admin_activity;
DROP TABLE IF EXISTS cart_reminders;
DROP TABLE IF EXISTS cart_activity;
DROP TABLE IF EXISTS site_visits;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS flash_sales;
DROP TABLE IF EXISTS loyalty_members;
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS promo_categories;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(30) NULL,
  role       ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  description TEXT NULL,
  price       INT UNSIGNED NOT NULL,
  promo_price INT UNSIGNED NULL,
  image_url   VARCHAR(500) NULL,
  stock       INT UNSIGNED NOT NULL DEFAULT 0,
  is_new      BOOLEAN NOT NULL DEFAULT FALSE,
  sales_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_promo_price CHECK (promo_price IS NULL OR promo_price <= price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promo_categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promo_codes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(50) NOT NULL UNIQUE,
  category_id INT UNSIGNED NOT NULL,
  type       ENUM('percent', 'fixed', 'free_shipping') NOT NULL,
  value      INT UNSIGNED NOT NULL DEFAULT 0,
  min_amount INT UNSIGNED NOT NULL DEFAULT 0,
  label      VARCHAR(150) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_codes_category FOREIGN KEY (category_id)
    REFERENCES promo_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  total_amount INT UNSIGNED NOT NULL,
  location    VARCHAR(180) NOT NULL,
  promo_code  VARCHAR(50) NULL,
  status      ENUM('pending','paid','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity   INT UNSIGNED NOT NULL,
  unit_price INT UNSIGNED NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlist_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wishlist_user_product (user_id, product_id),
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contact_messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL,
  subject    VARCHAR(120) DEFAULT 'Information produit',
  message    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE newsletter_subscribers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(160) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE site_visits (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  visits     INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_activity (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(255) NULL,
  items_count INT UNSIGNED NOT NULL DEFAULT 0,
  total       INT UNSIGNED NOT NULL DEFAULT 0,
  reminded_at DATETIME NULL,
  thanked_at  DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_reminders (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id    INT UNSIGNED NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NULL,
  status     ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
  error      TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at    DATETIME NULL,
  CONSTRAINT fk_cart_reminders_cart FOREIGN KEY (cart_id)
    REFERENCES cart_activity(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  name       VARCHAR(150) NOT NULL,
  sku        VARCHAR(100) NULL,
  price      INT UNSIGNED NULL,
  stock      INT UNSIGNED NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flash_sales (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id       INT UNSIGNED NOT NULL,
  discount_percent INT UNSIGNED NOT NULL,
  starts_at        DATETIME NOT NULL,
  ends_at          DATETIME NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_flash_sales_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loyalty_members (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id   INT UNSIGNED NULL,
  email     VARCHAR(255) NOT NULL UNIQUE,
  name      VARCHAR(150) NULL,
  points    INT UNSIGNED NOT NULL DEFAULT 0,
  tier      VARCHAR(30) NOT NULL DEFAULT 'Nouveau',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loyalty_members_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE referral_codes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(50) NOT NULL UNIQUE,
  reward     INT UNSIGNED NOT NULL DEFAULT 0,
  discount   INT UNSIGNED NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  uses       INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_activity (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id   INT UNSIGNED NULL,
  action     VARCHAR(120) NOT NULL,
  details    TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_activity_admin FOREIGN KEY (admin_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name, slug) VALUES
('Headphones', 'headphones'),
('Smart Watches', 'smart-watches'),
('Smartphones', 'smartphones'),
('Laptops', 'laptops'),
('Cameras', 'cameras'),
('Speakers', 'speakers'),
('Gaming', 'gaming'),
('Drones', 'drones');

INSERT INTO products (category_id, name, slug, description, price, promo_price, image_url, stock, is_new, sales_count) VALUES
((SELECT id FROM categories WHERE slug='headphones'), 'Nova Pro Wireless Headphones', 'nova-pro-wireless-headphones',
  'Un casque sans fil blanc au design épuré, pensé pour une écoute confortable et légère au quotidien.',
  45000, NULL, 'img/produits/nova-pro-wireless-headphones.jpg', 25, TRUE, 128),
((SELECT id FROM categories WHERE slug='headphones'), 'Pulse Buds True Wireless Earbuds', 'pulse-buds-true-wireless-earbuds',
  'Des écouteurs sans fil blancs avec leur boîtier de charge, pratiques pour la musique, les appels et les déplacements.',
  18500, 15500, 'img/produits/pulse-buds-true-wireless-earbuds.jpg', 60, FALSE, 96),
((SELECT id FROM categories WHERE slug='smart-watches'), 'FitPulse Smart Watch', 'fitpulse-smart-watch',
  'Une montre connectée noire au cadran rond, simple à lire et agréable à porter du matin au soir.',
  32000, 27900, 'img/produits/fitpulse-smart-watch.jpg', 35, FALSE, 84),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Active Band Fitness Tracker', 'active-band-fitness-tracker',
  'Une montre sportive bleue et grise au look net, idéale pour suivre vos activités sans quitter votre style.',
  14500, NULL, 'img/produits/active-band-fitness-tracker.jpg', 70, TRUE, 63),
((SELECT id FROM categories WHERE slug='smartphones'), 'Zenith X5 Smartphone', 'zenith-x5-smartphone',
  'Un smartphone noir au grand écran net et au design moderne, conçu pour accompagner toutes les journées.',
  185000, NULL, 'img/produits/zenith-x5-smartphone.jpg', 20, TRUE, 74),
((SELECT id FROM categories WHERE slug='smartphones'), 'Zenith Lite A3 Smartphone', 'zenith-lite-a3-smartphone',
  'Un smartphone blanc à l’écran généreux et à la finition claire, simple et agréable à utiliser.',
  78000, NULL, 'img/produits/zenith-lite-a3-smartphone.jpg', 40, FALSE, 58),
((SELECT id FROM categories WHERE slug='laptops'), 'AeroBook 15 Laptop', 'aerobook-15-laptop',
  'Un ordinateur portable gamer noir au clavier rétroéclairé, pensé pour le jeu, les études et la création.',
  425000, 389000, 'img/produits/aerobook-15-laptop.jpg', 12, FALSE, 42),
((SELECT id FROM categories WHERE slug='laptops'), 'SlimBook 14 Ultrabook', 'slimbook-14-ultrabook',
  'Un portable à la ligne nette posé sur un bureau chaleureux, parfait pour travailler, étudier et créer.',
  310000, NULL, 'img/produits/slimbook-14-ultrabook.jpg', 15, TRUE, 37),
((SELECT id FROM categories WHERE slug='cameras'), 'Vision D200 DSLR Camera', 'vision-d200-dslr-camera',
  'Un appareil photo noir à l’objectif imposant, pour des images précises et un vrai plaisir de photographie.',
  340000, NULL, 'img/produits/vision-d200-dslr-camera.jpg', 8, FALSE, 21),
((SELECT id FROM categories WHERE slug='cameras'), 'ActionCam 4K Sports Camera', 'actioncam-4k-sports-camera',
  'Un compact bleu au look gai et léger, facile à emporter pour capturer vos sorties et vos souvenirs.',
  55000, NULL, 'img/produits/actioncam-4k-sports-camera.jpg', 25, FALSE, 45),
((SELECT id FROM categories WHERE slug='speakers'), 'BoomBox Portable Bluetooth Speaker', 'boombox-portable-bluetooth-speaker',
  'Une enceinte portable noire au format cylindrique, discrète et facile à emporter partout.',
  28000, NULL, 'img/produits/boombox-portable-bluetooth-speaker.jpg', 40, FALSE, 112),
((SELECT id FROM categories WHERE slug='speakers'), 'SoundBar Mini 2.1', 'soundbar-mini-2-1',
  'Une enceinte ronde et claire au design simple, qui s’intègre facilement dans une pièce.',
  52000, 44900, 'img/produits/soundbar-mini-2-1.jpg', 18, TRUE, 39),
((SELECT id FROM categories WHERE slug='gaming'), 'Striker Wireless Gamepad', 'striker-wireless-gamepad',
  'Une manette bleue à la prise en main confortable, idéale pour prolonger vos sessions de jeu.',
  25000, NULL, 'img/produits/striker-wireless-gamepad.jpg', 45, FALSE, 87),
((SELECT id FROM categories WHERE slug='gaming'), 'Nova Pad Violet', 'nova-pad-violet',
  'Une manette violet clair aux lignes arrondies, agréable à tenir et bien classée dans l’univers gaming.',
  25000, NULL, 'img/produits/nova-pad-violet.jpg', 50, FALSE, 65),
((SELECT id FROM categories WHERE slug='drones'), 'SkyLite Mini Drone 4K', 'skylite-mini-drone-4k',
  'Un drone blanc à la silhouette légère, simple à prendre en main pour découvrir le pilotage.',
  165000, NULL, 'img/produits/skylite-mini-drone-4k.jpg', 10, TRUE, 28),
((SELECT id FROM categories WHERE slug='drones'), 'FlyEasy Beginner Drone', 'flyeasy-beginner-drone',
  'Un mini drone noir et rouge pliable, compact et ludique pour jouer en extérieur.',
  48000, NULL, 'img/produits/flyeasy-beginner-drone.jpg', 22, FALSE, 33),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Bleu Nova', 'casque-bleu-nova',
  'Ce casque bleu affiche une couleur franche et une forme généreuse, aussi agréable au bureau qu’à la maison.',
  42000, NULL, 'img/produits/casque-bleu-nova.jpg', 30, TRUE, 22),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Rose Douceur', 'casque-rose-douceur',
  'Un casque rose à l’allure douce et soignée, pour écouter de la musique avec une touche féminine et discrète.',
  39000, NULL, 'img/produits/casque-rose-douceur.jpg', 28, TRUE, 18),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gris Confort', 'casque-gris-confort',
  'Un casque gris à la forme classique et à la finition sobre, pensé pour une écoute longue et tranquille.',
  44000, NULL, 'img/produits/casque-gris-confort.jpg', 24, FALSE, 16),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Argent Élégance', 'casque-argent-elegance',
  'Un casque argenté au design enveloppant et raffiné, idéal pour un usage quotidien confortable.',
  48000, NULL, 'img/produits/casque-argent-elegance.jpg', 20, FALSE, 14),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Mic Pro', 'casque-gaming-mic-pro',
  'Un casque gaming noir avec micro intégré, conçu pour échanger facilement pendant les longues sessions.',
  52000, NULL, 'img/produits/casque-gaming-mic-pro.jpg', 32, TRUE, 27),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Noir et Rouge Sport', 'casque-noir-et-rouge-sport',
  'Un casque noir et rouge au style énergique, avec une silhouette confortable pour les écoutes prolongées.',
  55000, NULL, 'img/produits/casque-noir-et-rouge-sport.jpg', 26, FALSE, 23),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque HyperX Rouge', 'casque-hyperx-rouge',
  'Un casque gaming filaire noir et rouge au caractère franc, avec micro et coussinets confortables.',
  58000, NULL, 'img/produits/casque-hyperx-rouge.jpg', 29, FALSE, 31),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Ombre', 'casque-gaming-ombre',
  'Un casque noir révélé par des contrastes subtils, au style intense pour une atmosphère de jeu immersive.',
  61000, NULL, 'img/produits/casque-gaming-ombre.jpg', 18, TRUE, 12),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming RGB Noir', 'casque-gaming-rgb-noir',
  'Un casque noir aux détails lumineux discrets, avec micro et design enveloppant pour le jeu.',
  56000, NULL, 'img/produits/casque-gaming-rgb-noir.jpg', 27, FALSE, 20),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Moderne', 'casque-gaming-moderne',
  'Un casque noir au design moderne et au micro bien intégré, pensé pour les longues parties.',
  54000, NULL, 'img/produits/casque-gaming-moderne.jpg', 30, FALSE, 19),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Bleu Bass', 'casque-gaming-bleu-bass',
  'Un casque noir et bleu au style gaming assumé, avec micro visible et forme enveloppante.',
  57000, NULL, 'img/produits/casque-gaming-bleu-bass.jpg', 25, TRUE, 21),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Logitech G733', 'casque-logitech-g733',
  'Un casque gaming noir au design sobre, avec micro pratique pour rester connecté pendant le jeu.',
  69000, NULL, 'img/produits/casque-logitech-g733.jpg', 16, TRUE, 15),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Rose RGB', 'casque-gaming-rose-rgb',
  'Un casque gaming rose clair au micro détachable, qui apporte une touche douce à votre univers de jeu.',
  62000, NULL, 'img/produits/casque-gaming-rose-rgb.jpg', 19, TRUE, 17),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Spear Pro Noir', 'casque-spear-pro-noir',
  'Un casque gaming filaire noir à l’allure technique, avec coussinets généreux et micro intégré.',
  64000, NULL, 'img/produits/casque-spear-pro-noir.jpg', 17, FALSE, 13),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Sleek Noir', 'casque-sleek-noir',
  'Un casque gaming noir à la silhouette élancée, avec coussinets enveloppants et design discret.',
  59000, NULL, 'img/produits/casque-sleek-noir.jpg', 22, TRUE, 18),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Vert', 'casque-gaming-vert',
  'Un casque gaming filaire noir et vert au look technique, avec micro et coussinets pour jouer longtemps.',
  60000, NULL, 'img/produits/casque-gaming-vert.jpg', 24, FALSE, 16),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque RGB Sans Fil', 'casque-rgb-sans-fil',
  'Un casque gaming sans fil noir aux détails lumineux, avec arceau et coussinets pensés pour les longues parties.',
  67000, NULL, 'img/produits/casque-rgb-sans-fil.jpg', 20, TRUE, 14),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Gaming Sans Fil', 'casque-gaming-sans-fil',
  'Un casque noir à la silhouette enveloppante et au micro visible, pour une écoute confortable pendant le jeu.',
  63000, NULL, 'img/produits/casque-gaming-sans-fil.jpg', 23, FALSE, 15),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Skullcandy Noir', 'casque-skullcandy-noir',
  'Un casque circum-aural noir à la construction solide et au style urbain, pensé pour durer.',
  72000, NULL, 'img/produits/casque-skullcandy-noir.jpg', 14, FALSE, 11),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Rose Foncé', 'casque-rose-fonce',
  'Un casque rose foncé au look tendre, parfait pour écouter de la musique avec comfort et style.',
  46000, NULL, 'img/produits/casque-rose-fonce.jpg', 26, TRUE, 20),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Enfant Rose Pastel', 'casque-enfant-rose-pastel',
  'Un casque rose pastel à l’allure douce, adapté aux plus jeunes et à une écoute rassurante.',
  24000, NULL, 'img/produits/casque-enfant-rose-pastel.jpg', 35, TRUE, 29),
((SELECT id FROM categories WHERE slug='headphones'), 'Casque Violet Bluetooth', 'casque-violet-bluetooth',
  'Un casque violet à la personnalité douce et moderne, simple à porter au quotidien.',
  37000, NULL, 'img/produits/casque-violet-bluetooth.jpg', 31, FALSE, 24),
((SELECT id FROM categories WHERE slug='headphones'), 'Écouteurs Realme Blancs', 'ecouteurs-realme-blancs',
  'Des écouteurs sans fil blancs avec boîtier de charge net, légers et pratiques à emporter.',
  22000, NULL, 'img/produits/ecouteurs-realme-blancs.jpg', 55, TRUE, 41),
((SELECT id FROM categories WHERE slug='headphones'), 'Écouteurs CYXG Noirs', 'ecouteurs-cyxg-noirs',
  'Des écouteurs noirs avec boîtier de charge moderne, pour une écoute simple et pratique chaque jour.',
  26000, NULL, 'img/produits/ecouteurs-cyxg-noirs.jpg', 48, FALSE, 33),
((SELECT id FROM categories WHERE slug='headphones'), 'Écouteurs CYXG Violets', 'ecouteurs-cyxg-violets',
  'Des écouteurs violet clair avec boîtier coordonné, à la fois originaux et faciles à utiliser.',
  27000, NULL, 'img/produits/ecouteurs-cyxg-violets.jpg', 46, TRUE, 30),
((SELECT id FROM categories WHERE slug='headphones'), 'Boîtier Écouteurs Contrasté', 'boitier-ecouteurs-contraste',
  'Un boîtier de charge noir et blanc compact, au design contrasté et simple à glisser dans un sac.',
  18000, NULL, 'img/produits/boitier-ecouteurs-contraste.jpg', 60, TRUE, 38),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Rose Poudré', 'smartphone-rose-poudre',
  'Un smartphone rose poudré à la teinte douce et à la silhouette fine, élégant au quotidien.',
  145000, NULL, 'img/produits/smartphone-rose-poudre.jpg', 18, TRUE, 16),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Rose Épuré', 'smartphone-rose-epure',
  'Un smartphone rose au design net et à l’écran large, à la fois moderne et délicat.',
  420000, NULL, 'img/produits/smartphone-rose-epure.jpg', 12, TRUE, 19),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Bleu Pro', 'smartphone-bleu-pro',
  'Un smartphone gris bleu à l’écran généreux, avec une allure moderne et une prise en main agréable.',
  395000, NULL, 'img/produits/smartphone-bleu-pro.jpg', 14, TRUE, 17),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Gris Net', 'smartphone-gris-net',
  'Un smartphone gris et noir au look équilibré, avec écran lisible et forme fine.',
  165000, NULL, 'img/produits/smartphone-gris-net.jpg', 22, FALSE, 14),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Bleu et Blanc', 'smartphone-bleu-et-blanc',
  'Un smartphone bleu et blanc à l’écran net, au design épuré et au style contemporain.',
  350000, NULL, 'img/produits/smartphone-bleu-et-blanc.jpg', 16, FALSE, 12),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Blanc Minimal', 'smartphone-blanc-minimal',
  'Un smartphone blanc à l’apparence claire et minimaliste, à la fois simple et élégant.',
  310000, NULL, 'img/produits/smartphone-blanc-minimal.jpg', 17, FALSE, 13),
((SELECT id FROM categories WHERE slug='smartphones'), 'Smartphone Noir Écran Large', 'smartphone-noir-ecran-large',
  'Un smartphone noir au grand écran et à la finition sobre, élégant pour un usage quotidien.',
  275000, NULL, 'img/produits/smartphone-noir-ecran-large.jpg', 19, FALSE, 15),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Connectée Bleue', 'montre-connectee-bleue',
  'Une montre connectée bleue au cadran rond facile à lire, avec bracelet sombre et look discret.',
  59000, NULL, 'img/produits/montre-connectee-bleue.jpg', 26, TRUE, 22),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Rose et Blanche', 'montre-rose-et-blanche',
  'Une montre connectée rose et blanche au cadran rond, féminine sans perdre en praticité.',
  52000, NULL, 'img/produits/montre-rose-et-blanche.jpg', 30, TRUE, 25),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Noire Élégante', 'montre-noire-elegante',
  'Une montre connectée noire au cadran rond et au bracelet ajusté, sobre et élégante.',
  48000, NULL, 'img/produits/montre-noire-elegante.jpg', 32, FALSE, 21),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Sport U9S', 'montre-sport-u9s',
  'Une montre sportive au cadran généreux et au bracelet robuste, pensée pour accompagner vos activités.',
  65000, NULL, 'img/produits/montre-sport-u9s.jpg', 24, TRUE, 19),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Sport Noire', 'montre-sport-noire',
  'Une montre connectée noire au cadran rond et à l’allure masculine, avec un style sportif net.',
  54000, NULL, 'img/produits/montre-sport-noire.jpg', 28, FALSE, 20),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Connectée Unisexe', 'montre-connectee-unisexe',
  'Une montre au design unisexe, avec cadran lisible et bracelet sombre adapté à tous les styles.',
  50000, NULL, 'img/produits/montre-connectee-unisexe.jpg', 34, FALSE, 23),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Eowihor X32', 'montre-eowihor-x32',
  'Une montre connectée au cadran rond sur fond sombre, discrète et fonctionnelle au quotidien.',
  46000, NULL, 'img/produits/montre-eowihor-x32.jpg', 33, FALSE, 18),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Turquoise', 'montre-turquoise',
  'Une montre connectée turquoise au cadran clair, fraîche et agréable à porter tous les jours.',
  51000, NULL, 'img/produits/montre-turquoise.jpg', 29, TRUE, 24),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Bracelet Marron', 'montre-bracelet-marron',
  'Une montre connectée au bracelet marron, chaleureuse et facile à assortir avec une tenue quotidienne.',
  49000, NULL, 'img/produits/montre-bracelet-marron.jpg', 27, FALSE, 17),
((SELECT id FROM categories WHERE slug='smart-watches'), 'Montre Noire Dorée', 'montre-noire-doree',
  'Une montre connectée noire aux accents dorés, au cadran rond et au style moderne assumé.',
  56000, NULL, 'img/produits/montre-noire-doree.jpg', 25, TRUE, 21),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable MSI GE76', 'portable-msi-ge76',
  'Un portable gamer noir et violet au clavier rétroéclairé, pensé pour des sessions immersives.',
  720000, NULL, 'img/produits/portable-msi-ge76.jpg', 9, FALSE, 11),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable ROG S5007W', 'portable-rog-s5007w',
  'Un portable gamer noir et rouge au design franc, avec écran généreux et détails colorés.',
  685000, NULL, 'img/produits/portable-rog-s5007w.jpg', 10, TRUE, 13),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable Gamer Violet', 'portable-gamer-violet',
  'Un portable gamer noir et violet à la personnalité affirmée, avec écran large et clavier marqué.',
  660000, NULL, 'img/produits/portable-gamer-violet.jpg', 11, TRUE, 12),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable ROG Hero II', 'portable-rog-hero-ii',
  'Un portable gamer noir aux lignes franches, sérieux et adapté aux longues sessions de jeu.',
  640000, NULL, 'img/produits/portable-rog-hero-ii.jpg', 12, FALSE, 10),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable ROG Strix G16', 'portable-rog-strix-g16',
  'Un portable gamer noir et violet à l’allure puissante, avec écran et clavier pensés pour le jeu.',
  780000, NULL, 'img/produits/portable-rog-strix-g16.jpg', 8, FALSE, 9),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable ROG Strix G16 2025', 'portable-rog-strix-g16-2025',
  'Un portable gamer aux accents bleus sur un bureau chaleureux, entre esprit de jeu et élégance.',
  890000, NULL, 'img/produits/portable-rog-strix-g16-2025.jpg', 7, TRUE, 8),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable TUF Lumière Violette', 'portable-tuf-lumiere-violette',
  'Un portable gamer baigné dans une lumière violette, pour un univers immersif et stylé.',
  705000, NULL, 'img/produits/portable-tuf-lumiere-violette.jpg', 9, TRUE, 10),
((SELECT id FROM categories WHERE slug='laptops'), 'Portable HP Victus', 'portable-hp-victus',
  'Un portable gamer noir et gris à la silhouette nette, simple à intégrer au quotidien.',
  590000, 539000, 'img/produits/portable-hp-victus.jpg', 13, FALSE, 12),
((SELECT id FROM categories WHERE slug='cameras'), 'Appareil Photo Argenté', 'appareil-photo-argente',
  'Un appareil photo compact argenté au design intemporel, facile à emporter partout.',
  210000, NULL, 'img/produits/appareil-photo-argente.jpg', 12, FALSE, 9),
((SELECT id FROM categories WHERE slug='cameras'), 'Appareil Photo Noir Détail', 'appareil-photo-noir-detail',
  'Un appareil photo noir aux détails nets, au style affirmé et à l’esprit photographique pur.',
  265000, NULL, 'img/produits/appareil-photo-noir-detail.jpg', 10, FALSE, 8),
((SELECT id FROM categories WHERE slug='cameras'), 'Appareil Photo Lumière Douce', 'appareil-photo-lumiere-douce',
  'Un appareil noir révélé dans une lumière intimiste, pour le plaisir tactile de la photographie.',
  245000, NULL, 'img/produits/appareil-photo-lumiere-douce.jpg', 11, TRUE, 7),
((SELECT id FROM categories WHERE slug='cameras'), 'Appareil Photo Beige', 'appareil-photo-beige',
  'Un compact noir et blanc sur fond beige chaleureux, léger et simple à utiliser.',
  190000, NULL, 'img/produits/appareil-photo-beige.jpg', 14, TRUE, 10),
((SELECT id FROM categories WHERE slug='cameras'), 'Appareil Photo Compact Blanc', 'appareil-photo-compact-blanc',
  'Un appareil compact posé sur une surface claire, avec un objectif bien visible et une composition épurée.',
  230000, NULL, 'img/produits/appareil-photo-compact-blanc.jpg', 13, FALSE, 9),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Rouge Profond', 'enceinte-rouge-profond',
  'Une enceinte rouge profond au format portable, chaleureuse et agréable à la maison comme en déplacement.',
  38000, NULL, 'img/produits/enceinte-rouge-profond.jpg', 30, FALSE, 21),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Noire Compacte', 'enceinte-noire-compacte',
  'Une enceinte noire discrète et compacte, facile à glisser dans un sac pour vos écoutes.',
  26000, NULL, 'img/produits/enceinte-noire-compacte.jpg', 42, FALSE, 27),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Anker Sombre', 'enceinte-anker-sombre',
  'Une enceinte cylindrique sombre aux reflets lumineux, conviviale pour vos moments musicaux.',
  42000, NULL, 'img/produits/enceinte-anker-sombre.jpg', 28, FALSE, 23),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Ronde Colorée', 'enceinte-ronde-coloree',
  'Une enceinte ronde et colorée à la présence joyeuse, simple à placer dans n’importe quelle pièce.',
  34000, NULL, 'img/produits/enceinte-ronde-coloree.jpg', 35, TRUE, 25),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Rose Clair', 'enceinte-rose-clair',
  'Une enceinte rose clair au format compact, gaie et facile à emporter pour toutes vos écoutes.',
  31000, NULL, 'img/produits/enceinte-rose-clair.jpg', 38, TRUE, 29),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Compacte Douce', 'enceinte-compacte-douce',
  'Une enceinte compacte violet et blanc au design simple, une idée pratique pour offrir la musique.',
  29000, NULL, 'img/produits/enceinte-compacte-douce.jpg', 40, TRUE, 26),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte JBL Verte', 'enceinte-jbl-verte',
  'Une enceinte Bluetooth verte au style vif, portable et facile à utiliser partout.',
  36000, NULL, 'img/produits/enceinte-jbl-verte.jpg', 33, TRUE, 24),
((SELECT id FROM categories WHERE slug='speakers'), 'Haut-parleurs Redragon RGB', 'haut-parleurs-redragon-rgb',
  'Une paire d’enceintes de bureau noires à éclairage RGB, pour un poste de travail ou de jeu immersif.',
  33000, NULL, 'img/produits/haut-parleurs-redragon-rgb.jpg', 31, FALSE, 22),
((SELECT id FROM categories WHERE slug='speakers'), 'Enceinte Sony Party', 'enceinte-sony-party',
  'Une grande enceinte portable au style robuste, pensée pour diffuser la musique lors de grands moments.',
  75000, NULL, 'img/produits/enceinte-sony-party.jpg', 16, TRUE, 14),
((SELECT id FROM categories WHERE slug='gaming'), 'Console Noire et Rouge', 'console-noire-et-rouge',
  'Une console noire et rouge au style franc et dynamique, facile à installer dans un coin de jeu.',
  320000, NULL, 'img/produits/console-noire-et-rouge.jpg', 14, FALSE, 13),
((SELECT id FROM categories WHERE slug='gaming'), 'Manette One Piece', 'manette-one-piece',
  'Une manette décorée d’un motif anime, personnelle et agréable à prendre en main.',
  29000, NULL, 'img/produits/manette-one-piece.jpg', 28, TRUE, 24),
((SELECT id FROM categories WHERE slug='gaming'), 'Console PS4 Noire', 'console-ps4-noire',
  'Une console noire à la silhouette compacte, simple à placer dans le salon pour retrouver vos jeux.',
  245000, NULL, 'img/produits/console-ps4-noire.jpg', 18, FALSE, 17),
((SELECT id FROM categories WHERE slug='gaming'), 'Console PS5 Blanche', 'console-ps5-blanche',
  'Une console blanche aux courbes modernes, élégante et prête à transformer votre espace de jeu.',
  480000, NULL, 'img/produits/console-ps5-blanche.jpg', 12, TRUE, 15),
((SELECT id FROM categories WHERE slug='gaming'), 'Console Switch 2', 'console-switch-2',
  'Une console de jeu nomade à la présentation sobre, avec commandes visuelles et esprit nouvelle génération.',
  390000, NULL, 'img/produits/console-switch-2.jpg', 15, TRUE, 16),
((SELECT id FROM categories WHERE slug='gaming'), 'Console Rétro', 'console-retro',
  'Une console et sa manette rétro, pour revivre les premières heures du jeu vidéo avec nostalgie.',
  85000, NULL, 'img/produits/console-retro.jpg', 22, FALSE, 19),
((SELECT id FROM categories WHERE slug='gaming'), 'Console PlayStation Contrastée', 'console-playstation-contrastee',
  'Une console noir et blanc à la silhouette anguleuse, au caractère gamer immédiat.',
  455000, NULL, 'img/produits/console-playstation-contrastee.jpg', 13, TRUE, 12),
((SELECT id FROM categories WHERE slug='drones'), 'Drone Blanc Compact', 'drone-blanc-compact',
  'Un drone blanc léger et compact, idéal pour découvrir le pilotage en douceur.',
  125000, NULL, 'img/produits/drone-blanc-compact.jpg', 17, TRUE, 15),
((SELECT id FROM categories WHERE slug='drones'), 'Drone en Vol Bleu', 'drone-en-vol-bleu',
  'Un drone en vol sur un grand ciel bleu, qui évoque la liberté et les prises de vue aériennes.',
  185000, NULL, 'img/produits/drone-en-vol-bleu.jpg', 12, FALSE, 11),
((SELECT id FROM categories WHERE slug='drones'), 'Drone Ciel Clair', 'drone-ciel-clair',
  'Un drone en vol sur un ciel lumineux, à la silhouette légère et au pilotage aérien séduisant.',
  155000, NULL, 'img/produits/drone-ciel-clair.jpg', 14, FALSE, 10),
((SELECT id FROM categories WHERE slug='drones'), 'Drone DJI Avata 2', 'drone-dji-avata-2',
  'Un drone présenté avec ses accessoires comme un ensemble complet, prêt à piloter.',
  295000, NULL, 'img/produits/drone-dji-avata-2.jpg', 8, TRUE, 9),
((SELECT id FROM categories WHERE slug='drones'), 'Drone Autonome Blanc et Rouge', 'drone-autonome-blanc-et-rouge',
  'Un drone compact blanc et rouge à la silhouette précise, pensé pour la surveillance et la précision.',
  240000, NULL, 'img/produits/drone-autonome-blanc-et-rouge.jpg', 10, TRUE, 8),
((SELECT id FROM categories WHERE slug='drones'), 'Drone Sécurité Sombre', 'drone-securite-sombre',
  'Un drone sombre à la structure technique, inspirant la confiance pour des missions de sécurité.',
  270000, NULL, 'img/produits/drone-securite-sombre.jpg', 9, FALSE, 7),
((SELECT id FROM categories WHERE slug='drones'), 'Drone Sous-Marin', 'drone-sous-marin',
  'Un drone sous-marin compact à la coque claire, pour découvrir l’exploration aquatique.',
  210000, NULL, 'img/produits/drone-sous-marin.jpg', 11, TRUE, 8),
((SELECT id FROM categories WHERE slug='drones'), 'Mini Drone Enfant', 'mini-drone-enfant',
  'Un petit drone de loisir avec sa télécommande, léger et amusant pour un premier pilotage.',
  58000, NULL, 'img/produits/mini-drone-enfant.jpg', 26, TRUE, 22);

INSERT INTO promo_categories (slug, name) VALUES
('all', 'Toutes les catégories'),
('percent', 'Pourcentage'),
('fixed', 'Montant fixe'),
('shipping', 'Livraison offerte');

INSERT INTO promo_codes (code, category_id, type, value, min_amount, label) VALUES
('ITHAVEN10', (SELECT id FROM promo_categories WHERE slug='percent'), 'percent', 10, 0, '-10% sur le sous-total'),
('VIP20', (SELECT id FROM promo_categories WHERE slug='percent'), 'percent', 20, 100000, '-20% VIP'),
('TECH5000', (SELECT id FROM promo_categories WHERE slug='fixed'), 'fixed', 5000, 20000, '-5 000 FCFA'),
('LIVRAISON', (SELECT id FROM promo_categories WHERE slug='shipping'), 'free_shipping', 0, 0, 'Livraison offerte');

INSERT INTO users (name, email, password, role) VALUES
('Administrateur IT Haven', 'admin@ithaven.tg', '$2b$10$OhCAA5jHdnS3w2FaQr.ltuLnw68CloVMYYXcGJ4ge42KsUD15Qnvu', 'admin');
