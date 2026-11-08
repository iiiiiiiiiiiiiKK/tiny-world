/**
 * Tiny World 统一调色板。
 * 暖色、治愈系、低饱和高对比 —— 所有像素素材只从这里取色。
 */

export const PALETTE = {
  // 草地：多层绿
  grass: '#6cb457',
  grassLight: '#7fd067',
  grassDark: '#549b43',
  grassDeep: '#3f7f34',
  grassShadow: '#336a2b',

  // 泥土 / 道路
  dirt: '#a97c50',
  dirtDark: '#8a623d',
  path: '#d9c49b',
  pathDark: '#bda578',
  pathLight: '#ecdcb8',
  stoneTile: '#b9b3a4',
  stoneTileDark: '#9a9486',

  // 水
  water: '#4aa3d8',
  waterDark: '#3585b8',
  waterLight: '#7cc6ec',

  // 屋顶
  roofRed: '#c8503f',
  roofRedDark: '#a03a2c',
  roofBlue: '#4a7fc1',
  roofBlueDark: '#38639c',
  roofTeal: '#3aa08a',
  roofTealDark: '#2b7d6c',
  roofBrown: '#8b5e3c',
  roofBrownDark: '#6d472c',
  roofOrange: '#d78b3c',
  roofOrangeDark: '#b06d27',
  roofPurple: '#8a63b8',
  roofPurpleDark: '#6c4b92',
  roofGray: '#7d8794',
  roofGrayDark: '#626b76',
  roofCream: '#e3d6b8',
  roofCreamDark: '#c4b492',

  // 墙面
  wallCream: '#f0e2c3',
  wallBeige: '#dcc9a3',
  wallWhite: '#f6f1e5',
  wallBrick: '#c0785a',
  wallBrickDark: '#9c5c42',
  wallGray: '#b9bfc7',
  wallGrayDark: '#939aa3',
  wallBlue: '#a9c7de',
  wallBlueDark: '#86a6c1',
  wallSand: '#e3cfa3',
  wallSandDark: '#c4ab7e',
  wallMint: '#bfe0c9',
  wallMintDark: '#98c3a5',

  // 细节
  window: '#8fd3f4',
  windowDark: '#5fa9cf',
  windowFrame: '#5a4029',
  trim: '#5a4029',
  door: '#7a4a2b',
  doorDark: '#5e3720',
  trunk: '#7a5233',
  trunkDark: '#5b3d24',
  leaf: '#4f9e3f',
  leafLight: '#63b851',
  leafDark: '#3a7c30',
  rock: '#a9a49b',
  rockDark: '#837e75',
  gold: '#f2c14e',
  goldDark: '#d19a2c',
  white: '#fdfdfa',
  shadow: 'rgba(40, 60, 40, 0.22)',
  outline: 'rgba(45, 35, 30, 0.55)',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** 城市等级主题：不同阶段的整体色调 */
export const DISTRICT_THEMES = [
  { grass: '#6cb457', grassLight: '#7fd067', grassDark: '#549b43', name: '绿野' },
  { grass: '#68b25c', grassLight: '#7dcc6a', grassDark: '#4f9442', name: '草甸' },
  { grass: '#6bbd66', grassLight: '#83d074', grassDark: '#4f9a49', name: '林地' },
  { grass: '#63b173', grassLight: '#7cc584', grassDark: '#478f56', name: '绿城' },
  { grass: '#5fb185', grassLight: '#79c798', grassDark: '#438a61', name: '新城' },
  { grass: '#5aac96', grassLight: '#74c6ad', grassDark: '#3e8a76', name: '都会' },
  { grass: '#4fa7ae', grassLight: '#69c1c7', grassDark: '#35848b', name: '未来' },
] as const;
