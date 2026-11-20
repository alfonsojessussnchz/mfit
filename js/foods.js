/* Mfit · base de alimentos (valores aproximados por 100 g; orientativos, pueden variar según marca)
 * k = kcal, p = proteína, c = carbohidratos, f = grasas (g)
 * u = unidad habitual [nombre, gramos]
 */
'use strict';

const FOODS = [
  // Carnes y pescados
  { id: 'pollo',      name: 'Pechuga de pollo (cruda)', cat: 'Proteína', k: 110, p: 23, c: 0, f: 1.5, u: ['filete', 120] },
  { id: 'pavo',       name: 'Pechuga de pavo (cruda)',  cat: 'Proteína', k: 105, p: 24, c: 0, f: 1 },
  { id: 'ternera',    name: 'Ternera magra (cruda)',    cat: 'Proteína', k: 130, p: 21, c: 0, f: 5, u: ['filete', 150] },
  { id: 'picada',     name: 'Carne picada de vacuno',   cat: 'Proteína', k: 215, p: 18, c: 0, f: 15 },
  { id: 'lomo',       name: 'Lomo de cerdo (crudo)',    cat: 'Proteína', k: 150, p: 21, c: 0, f: 7, u: ['filete', 100] },
  { id: 'jamon',      name: 'Jamón serrano',            cat: 'Proteína', k: 240, p: 30, c: 0, f: 13, u: ['loncha', 15] },
  { id: 'pavo_fiam',  name: 'Fiambre de pavo',          cat: 'Proteína', k: 100, p: 18, c: 2, f: 2, u: ['loncha', 15] },
  { id: 'salmon',     name: 'Salmón',                   cat: 'Proteína', k: 200, p: 20, c: 0, f: 13, u: ['lomo', 125] },
  { id: 'merluza',    name: 'Merluza',                  cat: 'Proteína', k: 85,  p: 18, c: 0, f: 1.3 },
  { id: 'atun',       name: 'Atún al natural (lata, escurrido)', cat: 'Proteína', k: 110, p: 25, c: 0, f: 1, u: ['lata', 56] },
  { id: 'sardinas',   name: 'Sardinas en aceite (escurridas)',   cat: 'Proteína', k: 210, p: 24, c: 0, f: 12, u: ['lata', 85] },
  { id: 'gambas',     name: 'Gambas / langostinos',     cat: 'Proteína', k: 85,  p: 19, c: 0, f: 1 },
  { id: 'huevo',      name: 'Huevo',                    cat: 'Proteína', k: 145, p: 12.5, c: 0.7, f: 10, u: ['unidad', 55] },
  { id: 'claras',     name: 'Claras de huevo',          cat: 'Proteína', k: 50,  p: 11, c: 0.7, f: 0.2, u: ['clara', 33] },
  { id: 'whey',       name: 'Proteína whey (polvo)',    cat: 'Proteína', k: 380, p: 75, c: 8, f: 6, u: ['scoop', 30] },

  // Lácteos
  { id: 'leche_semi', name: 'Leche semidesnatada',      cat: 'Lácteos', k: 46,  p: 3.2, c: 4.7, f: 1.6, u: ['vaso', 250] },
  { id: 'leche_ent',  name: 'Leche entera',             cat: 'Lácteos', k: 63,  p: 3.1, c: 4.7, f: 3.6, u: ['vaso', 250] },
  { id: 'yogur',      name: 'Yogur natural',            cat: 'Lácteos', k: 60,  p: 3.8, c: 4.7, f: 3, u: ['unidad', 125] },
  { id: 'yogur_prot', name: 'Yogur alto en proteína / skyr', cat: 'Lácteos', k: 60, p: 10, c: 4, f: 0.2, u: ['unidad', 150] },
  { id: 'griego',     name: 'Yogur griego',             cat: 'Lácteos', k: 120, p: 4, c: 4, f: 10, u: ['unidad', 125] },
  { id: 'batido',     name: 'Queso fresco batido 0 %',  cat: 'Lácteos', k: 46,  p: 8, c: 3.5, f: 0.2, u: ['tarrina', 250] },
  { id: 'q_fresco',   name: 'Queso fresco (Burgos)',    cat: 'Lácteos', k: 175, p: 12, c: 3, f: 13 },
  { id: 'q_curado',   name: 'Queso curado',             cat: 'Lácteos', k: 400, p: 26, c: 0.5, f: 33, u: ['cuña', 25] },

  // Hidratos
  { id: 'arroz',      name: 'Arroz blanco (crudo)',     cat: 'Hidratos', k: 355, p: 7, c: 79, f: 0.6 },
  { id: 'arroz_coc',  name: 'Arroz cocido',             cat: 'Hidratos', k: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'pasta',      name: 'Pasta (cruda)',            cat: 'Hidratos', k: 355, p: 12.5, c: 72, f: 1.5 },
  { id: 'pasta_coc',  name: 'Pasta cocida',             cat: 'Hidratos', k: 155, p: 5.5, c: 31, f: 0.9 },
  { id: 'pan',        name: 'Pan blanco (barra)',       cat: 'Hidratos', k: 265, p: 9, c: 51, f: 3.2, u: ['rebanada', 30] },
  { id: 'pan_int',    name: 'Pan integral',             cat: 'Hidratos', k: 245, p: 10, c: 43, f: 3.5, u: ['rebanada', 30] },
  { id: 'avena',      name: 'Copos de avena',           cat: 'Hidratos', k: 375, p: 13, c: 60, f: 7 },
  { id: 'cereales',   name: 'Cereales tipo corn flakes', cat: 'Hidratos', k: 375, p: 7, c: 84, f: 0.9 },
  { id: 'tortitas',   name: 'Tortitas de arroz',        cat: 'Hidratos', k: 385, p: 8, c: 81, f: 2.8, u: ['tortita', 8] },
  { id: 'patata',     name: 'Patata (cruda)',           cat: 'Hidratos', k: 77,  p: 2, c: 17, f: 0.1, u: ['unidad', 200] },
  { id: 'boniato',    name: 'Boniato (crudo)',          cat: 'Hidratos', k: 86,  p: 1.6, c: 20, f: 0.1 },
  { id: 'garbanzos',  name: 'Garbanzos cocidos',        cat: 'Hidratos', k: 120, p: 7, c: 16, f: 2.5, u: ['bote', 250] },
  { id: 'lentejas',   name: 'Lentejas cocidas',         cat: 'Hidratos', k: 115, p: 9, c: 17, f: 0.4, u: ['bote', 250] },

  // Frutas y verduras
  { id: 'platano',    name: 'Plátano',                  cat: 'Fruta y verdura', k: 90, p: 1.1, c: 21, f: 0.3, u: ['unidad', 120] },
  { id: 'manzana',    name: 'Manzana',                  cat: 'Fruta y verdura', k: 52, p: 0.3, c: 12, f: 0.2, u: ['unidad', 180] },
  { id: 'naranja',    name: 'Naranja',                  cat: 'Fruta y verdura', k: 47, p: 0.9, c: 10, f: 0.1, u: ['unidad', 200] },
  { id: 'fresas',     name: 'Fresas',                   cat: 'Fruta y verdura', k: 32, p: 0.7, c: 6, f: 0.3 },
  { id: 'arandanos',  name: 'Arándanos',                cat: 'Fruta y verdura', k: 57, p: 0.7, c: 12, f: 0.3 },
  { id: 'brocoli',    name: 'Brócoli',                  cat: 'Fruta y verdura', k: 34, p: 2.8, c: 4, f: 0.4 },
  { id: 'ensalada',   name: 'Ensalada (lechuga, tomate…)', cat: 'Fruta y verdura', k: 18, p: 1, c: 3, f: 0.2, u: ['plato', 200] },
  { id: 'tomate',     name: 'Tomate',                   cat: 'Fruta y verdura', k: 18, p: 0.9, c: 3.5, f: 0.2, u: ['unidad', 150] },
  { id: 'aguacate',   name: 'Aguacate',                 cat: 'Fruta y verdura', k: 160, p: 2, c: 8.5, f: 14.7, u: ['medio', 70] },

  // Grasas y otros
  { id: 'aceite',     name: 'Aceite de oliva',          cat: 'Grasas', k: 884, p: 0, c: 0, f: 100, u: ['cucharada', 10] },
  { id: 'mantequilla',name: 'Mantequilla',              cat: 'Grasas', k: 717, p: 0.9, c: 0.1, f: 81, u: ['porción', 10] },
  { id: 'almendras',  name: 'Almendras',                cat: 'Grasas', k: 600, p: 21, c: 7, f: 52, u: ['puñado', 25] },
  { id: 'nueces',     name: 'Nueces',                   cat: 'Grasas', k: 650, p: 15, c: 7, f: 65, u: ['puñado', 25] },
  { id: 'cacahuete',  name: 'Crema de cacahuete',       cat: 'Grasas', k: 590, p: 25, c: 15, f: 50, u: ['cucharada', 15] },
  { id: 'choco85',    name: 'Chocolate negro 85 %',     cat: 'Grasas', k: 600, p: 10, c: 20, f: 50, u: ['onza', 10] },
  { id: 'miel',       name: 'Miel',                     cat: 'Otros', k: 304, p: 0.3, c: 82, f: 0, u: ['cucharada', 20] },
  { id: 'hummus',     name: 'Hummus',                   cat: 'Otros', k: 250, p: 8, c: 14, f: 18 },
  { id: 'tortilla',   name: 'Tortilla de patatas',      cat: 'Otros', k: 190, p: 7, c: 15, f: 11, u: ['pincho', 120] },
  { id: 'pizza',      name: 'Pizza (media)',            cat: 'Otros', k: 270, p: 11, c: 33, f: 10, u: ['porción', 110] },
  { id: 'fritas',     name: 'Patatas fritas',           cat: 'Otros', k: 310, p: 3.4, c: 41, f: 15 },
  { id: 'cerveza',    name: 'Cerveza',                  cat: 'Bebidas', k: 43, p: 0.5, c: 3.6, f: 0, u: ['caña', 200] },
  { id: 'refresco',   name: 'Refresco azucarado',       cat: 'Bebidas', k: 42, p: 0, c: 10.6, f: 0, u: ['lata', 330] },
  { id: 'zumo',       name: 'Zumo de naranja',          cat: 'Bebidas', k: 45, p: 0.7, c: 10, f: 0.2, u: ['vaso', 200] },
];

const MEALS = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', otros: 'Otros / snacks' };
