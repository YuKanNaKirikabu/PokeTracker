export const RARITIES = ["DIAMOND1", "DIAMOND2", "DIAMOND3", "DIAMOND4", "STAR1", "STAR2", "STAR3", "SHINY1", "SHINY2", "CROWN"];
export const TYPES = ["GRASS", "FIRE", "WATER", "LIGHTNING", "PSYCHIC", "FIGHTING", "DARKNESS", "METAL", "DRAGON", "COLORLESS"];
export const TRAINER_TYPES = ["ITEM", "TOOL", "SUPPORTER", "STADIUM", "TRAINER", "ARENA", "ENERGY"];
export const ENERGY_TYPES = new Set(TYPES);
export const CARD_TYPE_FILTERS = [
  { id: "all", labelKey: "filters.cardTypeAll" },
  { id: "POKEMON", labelKey: "filters.cardTypePokemon" },
  { id: "ITEM", labelKey: "filters.cardTypeItem" },
  { id: "TOOL", labelKey: "filters.cardTypeTool" },
  { id: "SUPPORTER", labelKey: "filters.cardTypeSupporter" },
  { id: "STADIUM", labelKey: "filters.cardTypeStadium" },
];
const IMAGE_BASE = "https://storage.yandexcloud.net/poketracker/Images";
export const RARITY_ICONS = Object.fromEntries(RARITIES.map((rarity) => [rarity, IMAGE_BASE + "/Rarity/" + rarity + ".webp"]));
export const TYPE_ICONS = {
  GRASS: IMAGE_BASE + "/Types/Grass.webp", FIRE: IMAGE_BASE + "/Types/Fire.webp", WATER: IMAGE_BASE + "/Types/Water.webp",
  LIGHTNING: IMAGE_BASE + "/Types/Lightning.webp", PSYCHIC: IMAGE_BASE + "/Types/Psychic.webp", FIGHTING: IMAGE_BASE + "/Types/Fighting.webp",
  DARKNESS: IMAGE_BASE + "/Types/Darkness.webp", METAL: IMAGE_BASE + "/Types/Metal.webp", DRAGON: IMAGE_BASE + "/Types/Dragon.webp",
  COLORLESS: IMAGE_BASE + "/Types/Colorless.webp",
};
