import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Folder, FolderOpen, File, FileText, FileCode,
  Plus, Download, Trash2, Edit3, X, Check,
  ChevronRight, ChevronDown, Settings, Wand2,
  AlertTriangle, CheckCircle, Package, Eye, Code,
  FolderPlus, FilePlus, Search, Save, Info,
  Copy, ArrowRight, Image, MoreVertical, RefreshCcw,
  Layers, BookOpen, Zap, Terminal, Gift, Tag,
  HelpCircle, ExternalLink, Menu, PanelLeftClose, PanelLeftOpen,
  Gamepad2, Users, Timer, Trophy, Sword, Target, Play, Square,
  Clipboard, Sparkles, Crown, Flag, Shield, Heart,
  Send, Key, Bot, Loader, RotateCcw, MessageSquare, StopCircle,
  UploadCloud, FolderInput,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mc-datapack-builder-v1';

const VERSION_FORMATS = {
  '1.21.11': { min: [94, 1], max: [94, 1], useNewFormat: true },
  '1.21.10': { min: [88, 0], max: [88, 0], useNewFormat: true },
  '1.21.9':  { min: [88, 0], max: [88, 0], useNewFormat: true },
  '1.21.8':  { format: 81, useNewFormat: false },
  '1.21.7':  { format: 81, useNewFormat: false },
  '1.21.6':  { format: 80, useNewFormat: false },
  '1.21.5':  { format: 71, useNewFormat: false },
  '1.21.4':  { format: 61, useNewFormat: false },
  '1.21.2':  { format: 57, useNewFormat: false },
  '1.21':    { format: 48, useNewFormat: false },
  '1.20.6':  { format: 41, useNewFormat: false },
  '1.20.5':  { format: 41, useNewFormat: false },
  '1.20.4':  { format: 26, useNewFormat: false },
  '1.20.3':  { format: 26, useNewFormat: false },
  '1.20.2':  { format: 18, useNewFormat: false },
  '1.20':    { format: 15, useNewFormat: false },
  '1.19.4':  { format: 12, useNewFormat: false },
  '1.19.3':  { format: 10, useNewFormat: false },
  '1.19':    { format: 10, useNewFormat: false },
  '1.18.2':  { format: 9, useNewFormat: false },
  '1.18':    { format: 8, useNewFormat: false },
  '1.17':    { format: 7, useNewFormat: false },
  '1.16':    { format: 6, useNewFormat: false },
  '1.15':    { format: 5, useNewFormat: false },
  '1.14':    { format: 4, useNewFormat: false },
  '1.13':    { format: 4, useNewFormat: false },
};

const VERSION_LIST = Object.keys(VERSION_FORMATS).sort((a, b) => {
  const pa = b.split('.').map(Number), pb = a.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
});

function formatVersionLabel(v) {
  const fmt = VERSION_FORMATS[v];
  if (!fmt) return `Minecraft ${v}`;
  if (fmt.useNewFormat) {
    const label = Array.isArray(fmt.min) ? `${fmt.min[0]}.${fmt.min[1]}` : fmt.min;
    return `Minecraft ${v} (format: ${label})`;
  }
  return `Minecraft ${v} (format: ${fmt.format})`;
}

const DATAPACK_FOLDERS = [
  { name: 'advancement', label: '進捗' },
  { name: 'banner_pattern', label: '旗の模様', v: '1.20.5' },
  { name: 'cat_variant', label: 'ネコの亜種', v: '1.20.5' },
  { name: 'chat_type', label: 'チャットタイプ', v: '1.19' },
  { name: 'damage_type', label: 'ダメージタイプ', v: '1.19.4' },
  { name: 'dimension', label: 'ディメンション' },
  { name: 'dimension_type', label: 'ディメンションタイプ' },
  { name: 'enchantment', label: 'エンチャント', v: '1.21' },
  { name: 'enchantment_provider', label: 'エンチャントプロバイダー', v: '1.21' },
  { name: 'function', label: '関数' },
  { name: 'instrument', label: '楽器', v: '1.20.5' },
  { name: 'item_modifier', label: 'アイテム修飾子', v: '1.17' },
  { name: 'loot_table', label: 'ルートテーブル' },
  { name: 'painting_variant', label: '絵画の亜種', v: '1.20.5' },
  { name: 'predicate', label: '条件', v: '1.15' },
  { name: 'recipe', label: 'レシピ' },
  { name: 'structure', label: '構造物' },
  { name: 'tags', label: 'タグ' },
  { name: 'timeline', label: 'タイムライン', v: '1.21.11' },
  { name: 'trim_material', label: '装飾の素材', v: '1.19.4' },
  { name: 'trim_pattern', label: '装飾の模様', v: '1.19.4' },
  { name: 'wolf_variant', label: 'オオカミの亜種', v: '1.20.5' },
  { name: 'worldgen', label: 'ワールド生成' },
];

const TAG_SUBCATEGORIES = [
  'block', 'entity_type', 'fluid', 'function', 'game_event', 'item',
];

// ════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════

// バージョン対応ヘルパー
function tplVer(ver, target) {
  if (!target) return false;
  const p = (v) => { const s = v.split('.').map(Number); return s[0] * 10000 + (s[1] || 0) * 100 + (s[2] || 0); };
  return p(target) >= p(ver);
}

const TEMPLATES = {
  function_basic: {
    category: 'function', label: '基本関数', ext: '.mcfunction',
    content: (name, ns) => `# === ${name} ===\n# 説明: \n# 作成者: \n\nsay Hello, World!`,
  },
  function_load: {
    category: 'function', label: 'ロード関数', ext: '.mcfunction',
    content: (name, ns) => `# === load ===\n# ロード時に実行される関数\n\nsay ${ns} が読み込まれました！`,
  },
  function_tick: {
    category: 'function', label: 'Tick関数', ext: '.mcfunction',
    content: (name, ns) => `# === tick ===\n# 毎tick実行される関数\n`,
  },
  recipe_shaped: {
    category: 'recipe', label: '固定レシピ（shaped）', ext: '.json',
    content: (name, ns, ver) => {
      const use1205 = tplVer('1.20.5', ver);
      const use1212 = tplVer('1.21.2', ver);
      const obj = {
        type: "minecraft:crafting_shaped",
        pattern: ["AAA", "ABA", "AAA"],
        key: use1212 ? { A: "minecraft:stone", B: "minecraft:diamond" } : { A: { item: "minecraft:stone" }, B: { item: "minecraft:diamond" } },
        result: use1205 ? { id: "minecraft:diamond_block", count: 1 } : { item: "minecraft:diamond_block", count: 1 }
      };
      return JSON.stringify(obj, null, 2);
    },
  },
  recipe_shapeless: {
    category: 'recipe', label: '不定形レシピ（shapeless）', ext: '.json',
    content: (name, ns, ver) => {
      const use1205 = tplVer('1.20.5', ver);
      const use1212 = tplVer('1.21.2', ver);
      const obj = {
        type: "minecraft:crafting_shapeless",
        ingredients: use1212 ? ["minecraft:diamond", "minecraft:stick"] : [{ item: "minecraft:diamond" }, { item: "minecraft:stick" }],
        result: use1205 ? { id: "minecraft:diamond_sword", count: 1 } : { item: "minecraft:diamond_sword", count: 1 }
      };
      return JSON.stringify(obj, null, 2);
    },
  },
  recipe_smelting: {
    category: 'recipe', label: '精錬レシピ', ext: '.json',
    content: (name, ns, ver) => {
      const use1205 = tplVer('1.20.5', ver);
      const use1212 = tplVer('1.21.2', ver);
      const obj = {
        type: "minecraft:smelting",
        ingredient: use1212 ? "minecraft:iron_ore" : { item: "minecraft:iron_ore" },
        result: use1205 ? { id: "minecraft:iron_ingot" } : "minecraft:iron_ingot",
        experience: 0.7,
        cookingtime: 200
      };
      return JSON.stringify(obj, null, 2);
    },
  },
  advancement: {
    category: 'advancement', label: '進捗', ext: '.json',
    content: (name, ns, ver) => {
      const use1205 = tplVer('1.20.5', ver);
      const obj = {
        display: {
          title: "進捗タイトル",
          description: "進捗の説明",
          icon: use1205 ? { id: "minecraft:diamond" } : { item: "minecraft:diamond" },
          frame: "task",
          show_toast: true,
          announce_to_chat: true
        },
        criteria: {
          requirement: {
            trigger: "minecraft:inventory_changed",
            conditions: { items: use1205 ? [{ items: "minecraft:diamond" }] : [{ items: [{ items: ["minecraft:diamond"] }] }] }
          }
        }
      };
      return JSON.stringify(obj, null, 2);
    },
  },
  loot_table: {
    category: 'loot_table', label: 'ルートテーブル', ext: '.json',
    content: () => JSON.stringify({
      pools: [{
        rolls: 1,
        entries: [{ type: "minecraft:item", name: "minecraft:diamond", weight: 1 }]
      }]
    }, null, 2),
  },
  tag: {
    category: 'tags', label: 'タグ', ext: '.json',
    content: () => JSON.stringify({
      replace: false,
      values: ["minecraft:stone", "minecraft:granite"]
    }, null, 2),
  },
  predicate: {
    category: 'predicate', label: '条件（プレディケート）', ext: '.json',
    content: () => JSON.stringify({
      condition: "minecraft:weather_check",
      raining: true
    }, null, 2),
  },
  timeline: {
    category: 'timeline', label: 'タイムライン', ext: '.json',
    content: () => JSON.stringify({
      period: 24000,
      tracks: {
        "minecraft:visual/sky_color": {
          keyframes: [
            { time: 0, value: 0.0 },
            { time: 12000, value: 1.0 },
            { time: 24000, value: 0.0 }
          ]
        }
      }
    }, null, 2),
  },
  damage_type: {
    category: 'damage_type', label: 'ダメージタイプ', ext: '.json',
    content: () => JSON.stringify({
      exhaustion: 0.0,
      message_id: "custom",
      scaling: "never"
    }, null, 2),
  },
};

const TEMPLATE_CATEGORIES = [
  { key: 'function', label: '関数', icon: Zap, templates: ['function_basic', 'function_load', 'function_tick'] },
  { key: 'recipe', label: 'レシピ', icon: BookOpen, templates: ['recipe_shaped', 'recipe_shapeless', 'recipe_smelting'] },
  { key: 'advancement', label: '進捗', icon: Gift, templates: ['advancement'] },
  { key: 'loot_table', label: 'ルートテーブル', icon: Package, templates: ['loot_table'] },
  { key: 'tags', label: 'タグ', icon: Tag, templates: ['tag'] },
  { key: 'predicate', label: '条件', icon: HelpCircle, templates: ['predicate'], v: '1.15' },
  { key: 'timeline', label: 'タイムライン', icon: Layers, templates: ['timeline'], v: '1.21.11' },
  { key: 'damage_type', label: 'ダメージタイプ', icon: Zap, templates: ['damage_type'], v: '1.19.4' },
  { key: 'minigame', label: 'ミニゲーム部品', icon: Gamepad2, templates: ['mg_game_loop', 'mg_timer', 'mg_team_setup', 'mg_death_detect', 'mg_bossbar'] },
];

// ════════════════════════════════════════════════════════════
// MINIGAME SNIPPET TEMPLATES
// ════════════════════════════════════════════════════════════

const MG_TEMPLATES = {
  mg_game_loop: {
    category: 'function', label: 'ゲームループ（ゲート式）', ext: '.mcfunction',
    content: (name, ns) => `# === ゲームループ ゲート ===
# game_state が 1 のときだけ処理を実行する仕組み
# tick.json から毎tick呼ばれる main.mcfunction に書く

execute if score #game game_state matches 1 run function ${ns}:game_loop
`,
  },
  mg_timer: {
    category: 'function', label: 'タイマーシステム', ext: '.mcfunction',
    content: (name, ns) => `# === タイマーシステム ===
# tick単位のカウンターを秒に変換するパターン
# 20tick = 1秒

# tick カウンターを加算
scoreboard players add #timer timer_tick 1

# 20tickごとに秒を減算
execute if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1

# ボスバーに反映
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec
bossbar set ${ns}:timer name ["",{"text":"残り ","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"aqua"},{"text":" 秒","color":"yellow"}]
`,
  },
  mg_team_setup: {
    category: 'function', label: 'チームセットアップ', ext: '.mcfunction',
    content: (name, ns) => `# === チーム作成 ===
# reload（初期化）関数で実行

# チーム作成
team add team_red "赤チーム"
team add team_blue "青チーム"

# チーム色設定
team modify team_red color red
team modify team_blue color blue

# 味方の透明が見えるか
team modify team_red seeFriendlyInvisibles true
team modify team_blue seeFriendlyInvisibles true

# フレンドリーファイア（味方への攻撃）
team modify team_red friendlyFire false
team modify team_blue friendlyFire false
`,
  },
  mg_death_detect: {
    category: 'function', label: '死亡検知パターン', ext: '.mcfunction',
    content: (name, ns) => `# === 死亡検知 ===
# deathCount スコアボードで死亡を検知するパターン
# 初期化時: scoreboard objectives add deaths deathCount "死亡"

# 死亡したプレイヤーを検知
execute as @a[scores={deaths=1..}] run tellraw @a [{"selector":"@s","color":"red"},{"text":" がやられた！","color":"gray"}]

# 死亡したプレイヤーをスペクテイターに
execute as @a[scores={deaths=1..}] run gamemode spectator @s
execute as @a[scores={deaths=1..}] run scoreboard players set @s alive 0

# カウンターリセット（毎tick）
scoreboard players set @a deaths 0
`,
  },
  mg_bossbar: {
    category: 'function', label: 'ボスバー操作', ext: '.mcfunction',
    content: (name, ns) => `# === ボスバー ===
# タイマーや情報表示に使うボスバー

# 作成
bossbar add ${ns}:timer "タイマー"

# 設定
bossbar set ${ns}:timer players @a
bossbar set ${ns}:timer max 300
bossbar set ${ns}:timer value 300
bossbar set ${ns}:timer color yellow
bossbar set ${ns}:timer style notched_10

# テキスト更新（ゲームループ内で）
# bossbar set ${ns}:timer name ["",{"text":"残り","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"aqua"},{"text":"秒","color":"yellow"}]

# 削除（ゲーム終了時）
# bossbar remove ${ns}:timer
`,
  },
};

// Add MG templates to TEMPLATES
Object.assign(TEMPLATES, MG_TEMPLATES);

// ════════════════════════════════════════════════════════════
// MINIGAME TYPES (for MinigameWizard)
// ════════════════════════════════════════════════════════════

const MINIGAME_TYPES = [
  {
    id: 'tag_game',
    name: '鬼ごっこ',
    icon: '👹',
    description: '鬼チームが逃走者を追いかけて倒すゲーム。制限時間内に全員捕まえれば鬼の勝ち、逃げ切れば逃走者の勝ち。',
    color: 'text-red-400',
    defaults: { gameTime: 300, teamA: '鬼', teamB: '逃走者', colorA: 'red', colorB: 'blue' },
  },
  {
    id: 'pvp_arena',
    name: 'PvPアリーナ',
    icon: '⚔️',
    description: 'チーム対抗の戦闘ゲーム。目標キル数に先に到達したチームが勝利。',
    color: 'text-orange-400',
    defaults: { gameTime: 300, teamA: '赤チーム', teamB: '青チーム', colorA: 'red', colorB: 'blue', targetKills: 10 },
  },
  {
    id: 'spleef',
    name: 'スプリーフ',
    icon: '🧊',
    description: '足元のブロックを壊して相手を落とすゲーム。最後まで残ったプレイヤーが勝利。',
    color: 'text-cyan-400',
    defaults: { gameTime: 180, fallY: 50 },
  },
  {
    id: 'race',
    name: 'レース / パルクール',
    icon: '🏃',
    description: 'スタートからゴールまでの速さを競うゲーム。チェックポイント付き。',
    color: 'text-green-400',
    defaults: { gameTime: 600 },
  },
  {
    id: 'treasure_hunt',
    name: '宝探し',
    icon: '💎',
    description: '制限時間内にアイテムをたくさん集めるゲーム。最も多く集めたプレイヤーが勝利。',
    color: 'text-purple-400',
    defaults: { gameTime: 300, targetItem: 'minecraft:diamond' },
  },
  {
    id: 'king_of_hill',
    name: '陣取り',
    icon: '👑',
    description: '指定エリアを制圧してポイントを稼ぐゲーム。目標ポイントに先に到達したチームが勝利。',
    color: 'text-yellow-400',
    defaults: { gameTime: 300, teamA: '赤チーム', teamB: '青チーム', colorA: 'red', colorB: 'blue', targetScore: 100 },
  },
  {
    id: 'zombie_survival',
    name: 'ゾンビサバイバル',
    icon: '🧟',
    description: '押し寄せるゾンビから生き残れ！ウェーブ制で徐々に難易度が上がる。',
    color: 'text-green-500',
    defaults: { gameTime: 600, maxWaves: 10, zombiesPerWave: 5 },
  },
  {
    id: 'build_battle',
    name: '建築バトル',
    icon: '🏗️',
    description: '制限時間内にお題に沿った建築をするゲーム。投票で最も良い建築が勝利。',
    color: 'text-amber-400',
    defaults: { gameTime: 300, buildTime: 180, voteTime: 60 },
  },
  {
    id: 'capture_flag',
    name: '旗取り (CTF)',
    icon: '🚩',
    description: 'チーム対抗で相手チームの旗を奪って自陣に持ち帰るゲーム。先に規定回数奪取したチームの勝利。',
    color: 'text-rose-400',
    defaults: { gameTime: 600, teamA: '赤チーム', teamB: '青チーム', colorA: 'red', colorB: 'blue', capturesNeeded: 3 },
  },
  {
    id: 'tnt_run',
    name: 'TNTラン',
    icon: '💣',
    description: '走った場所のブロックが消える！最後まで落ちずに残ったプレイヤーが勝利。',
    color: 'text-red-500',
    defaults: { gameTime: 180, fallY: 0, layerCount: 3 },
  },
];

// ════════════════════════════════════════════════════════════
// SYSTEM TYPES (for SystemWizard)
// ════════════════════════════════════════════════════════════

const SYSTEM_TYPES = [
  {
    id: 'custom_weapon',
    name: 'カスタム武器',
    icon: '⚔️',
    description: '特殊効果付きの武器を生成するシステム。右クリックでスキル発動やエンチャント付与。',
    color: 'text-orange-400',
    defaults: { weaponName: '炎の剣', weaponItem: 'minecraft:diamond_sword', particleEffect: 'flame', damage: 10, cooldown: 60 },
  },
  {
    id: 'shop_npc',
    name: 'ショップNPC',
    icon: '🏪',
    description: 'アイテムの購入・売却ができるNPCショップシステム。スコアを通貨として使用。',
    color: 'text-emerald-400',
    defaults: { shopName: 'ショップ', currency: 'coins', items: 3 },
  },
  {
    id: 'teleport_system',
    name: 'テレポートシステム',
    icon: '🌀',
    description: '名前付きワープポイント間を移動するシステム。トリガーによるテレポート。',
    color: 'text-violet-400',
    defaults: { pointCount: 3 },
  },
  {
    id: 'loot_box',
    name: 'ルートボックス',
    icon: '🎁',
    description: 'ランダムにアイテムが入手できるガチャシステム。レア度別のドロップテーブル付き。',
    color: 'text-pink-400',
    defaults: { boxName: '宝箱', tiers: 3, cost: 10, currency: 'coins' },
  },
  {
    id: 'recipe_set',
    name: 'レシピセット',
    icon: '📖',
    description: 'カスタムレシピのセットを一括生成。武器・防具・ツール・食料のレシピパック。',
    color: 'text-cyan-400',
    defaults: { recipeType: 'weapon', recipeCount: 3 },
  },
  {
    id: 'boss_fight',
    name: 'ボス戦',
    icon: '💀',
    description: '強化されたボスモブとの戦闘システム。フェーズ制・スキル・ドロップ報酬付き。',
    color: 'text-red-400',
    defaults: { bossName: 'ドラゴンロード', bossEntity: 'minecraft:wither_skeleton', bossHp: 100, phases: 3 },
  },
  {
    id: 'lobby_system',
    name: 'ロビーシステム',
    icon: '🏠',
    description: 'ゲーム待機用のロビーシステム。プレイヤー管理・準備完了・ゲーム開始カウントダウン。',
    color: 'text-sky-400',
    defaults: { lobbyName: 'ロビー', minPlayers: 2, maxPlayers: 16, countdown: 30 },
  },
];

// ════════════════════════════════════════════════════════════
// MC DATA (items / entities / effects / particles / sounds)
// ════════════════════════════════════════════════════════════

const MC_ITEMS = [
  // 武器
  { id:'minecraft:diamond_sword', n:'ダイヤモンドの剣', c:'武器' },{ id:'minecraft:iron_sword', n:'鉄の剣', c:'武器' },
  { id:'minecraft:netherite_sword', n:'ネザライトの剣', c:'武器' },{ id:'minecraft:mace', n:'メイス', c:'武器' },
  { id:'minecraft:bow', n:'弓', c:'武器' },{ id:'minecraft:crossbow', n:'クロスボウ', c:'武器' },{ id:'minecraft:trident', n:'トライデント', c:'武器' },
  { id:'minecraft:wind_charge', n:'ウィンドチャージ', c:'武器' },
  // ツール
  { id:'minecraft:diamond_pickaxe', n:'ダイヤモンドのツルハシ', c:'ツール' },{ id:'minecraft:diamond_axe', n:'ダイヤモンドの斧', c:'ツール' },
  { id:'minecraft:diamond_shovel', n:'ダイヤモンドのシャベル', c:'ツール' },{ id:'minecraft:fishing_rod', n:'釣り竿', c:'ツール' },
  { id:'minecraft:netherite_pickaxe', n:'ネザライトのツルハシ', c:'ツール' },{ id:'minecraft:flint_and_steel', n:'火打ち石と打ち金', c:'ツール' },
  // 防具
  { id:'minecraft:shield', n:'盾', c:'防具' },{ id:'minecraft:diamond_helmet', n:'ダイヤのヘルメット', c:'防具' },
  { id:'minecraft:diamond_chestplate', n:'ダイヤのチェストプレート', c:'防具' },{ id:'minecraft:diamond_leggings', n:'ダイヤのレギンス', c:'防具' },
  { id:'minecraft:diamond_boots', n:'ダイヤのブーツ', c:'防具' },{ id:'minecraft:netherite_helmet', n:'ネザライトのヘルメット', c:'防具' },
  { id:'minecraft:netherite_chestplate', n:'ネザライトのチェストプレート', c:'防具' },{ id:'minecraft:elytra', n:'エリトラ', c:'防具' },
  // 素材
  { id:'minecraft:diamond', n:'ダイヤモンド', c:'素材' },{ id:'minecraft:iron_ingot', n:'鉄インゴット', c:'素材' },
  { id:'minecraft:gold_ingot', n:'金インゴット', c:'素材' },{ id:'minecraft:copper_ingot', n:'銅インゴット', c:'素材' },
  { id:'minecraft:netherite_ingot', n:'ネザライトインゴット', c:'素材' },{ id:'minecraft:emerald', n:'エメラルド', c:'素材' },
  { id:'minecraft:lapis_lazuli', n:'ラピスラズリ', c:'素材' },{ id:'minecraft:redstone', n:'レッドストーン', c:'素材' },
  { id:'minecraft:coal', n:'石炭', c:'素材' },{ id:'minecraft:quartz', n:'ネザークォーツ', c:'素材' },
  { id:'minecraft:amethyst_shard', n:'アメジストの欠片', c:'素材' },{ id:'minecraft:echo_shard', n:'残響の欠片', c:'素材' },
  { id:'minecraft:stick', n:'棒', c:'素材' },{ id:'minecraft:blaze_rod', n:'ブレイズロッド', c:'素材' },
  { id:'minecraft:blaze_powder', n:'ブレイズパウダー', c:'素材' },{ id:'minecraft:breeze_rod', n:'ブリーズロッド', c:'素材' },
  { id:'minecraft:heavy_core', n:'ヘビーコア', c:'素材' },{ id:'minecraft:ender_pearl', n:'エンダーパール', c:'素材' },
  { id:'minecraft:ender_eye', n:'エンダーアイ', c:'素材' },{ id:'minecraft:nether_star', n:'ネザースター', c:'素材' },
  { id:'minecraft:heart_of_the_sea', n:'海洋の心', c:'素材' },{ id:'minecraft:string', n:'糸', c:'素材' },
  { id:'minecraft:leather', n:'革', c:'素材' },{ id:'minecraft:bone', n:'骨', c:'素材' },
  { id:'minecraft:gunpowder', n:'火薬', c:'素材' },{ id:'minecraft:ghast_tear', n:'ガストの涙', c:'素材' },
  { id:'minecraft:slime_ball', n:'スライムボール', c:'素材' },{ id:'minecraft:paper', n:'紙', c:'素材' },
  { id:'minecraft:book', n:'本', c:'素材' },{ id:'minecraft:feather', n:'羽根', c:'素材' },
  // 弾薬
  { id:'minecraft:arrow', n:'矢', c:'弾薬' },{ id:'minecraft:spectral_arrow', n:'光の矢', c:'弾薬' },
  { id:'minecraft:tipped_arrow', n:'効能付きの矢', c:'弾薬' },
  // 食料
  { id:'minecraft:golden_apple', n:'金のリンゴ', c:'食料' },{ id:'minecraft:enchanted_golden_apple', n:'エンチャントされた金リンゴ', c:'食料' },
  { id:'minecraft:cooked_beef', n:'ステーキ', c:'食料' },{ id:'minecraft:bread', n:'パン', c:'食料' },
  // 探索 (1.21)
  { id:'minecraft:trial_key', n:'試練の鍵', c:'探索' },{ id:'minecraft:ominous_trial_key', n:'不吉な試練の鍵', c:'探索' },
  { id:'minecraft:ominous_bottle', n:'不吉な瓶', c:'探索' },
  // その他
  { id:'minecraft:potion', n:'ポーション', c:'その他' },{ id:'minecraft:totem_of_undying', n:'不死のトーテム', c:'その他' },
  { id:'minecraft:experience_bottle', n:'経験値の瓶', c:'その他' },{ id:'minecraft:enchanted_book', n:'エンチャントの本', c:'その他' },
  { id:'minecraft:firework_rocket', n:'ロケット花火', c:'その他' },{ id:'minecraft:name_tag', n:'名札', c:'その他' },
  { id:'minecraft:carrot_on_a_stick', n:'ニンジン付きの棒', c:'その他' },{ id:'minecraft:snowball', n:'雪玉', c:'その他' },
  // ブロック
  { id:'minecraft:stone', n:'石', c:'ブロック' },{ id:'minecraft:cobblestone', n:'丸石', c:'ブロック' },
  { id:'minecraft:oak_planks', n:'オークの板材', c:'ブロック' },{ id:'minecraft:glass', n:'ガラス', c:'ブロック' },
  { id:'minecraft:tnt', n:'TNT', c:'ブロック' },{ id:'minecraft:sand', n:'砂', c:'ブロック' },
  { id:'minecraft:obsidian', n:'黒曜石', c:'ブロック' },{ id:'minecraft:bedrock', n:'岩盤', c:'ブロック' },
  { id:'minecraft:barrier', n:'バリアブロック', c:'ブロック' },{ id:'minecraft:air', n:'空気', c:'ブロック' },
  { id:'minecraft:command_block', n:'コマンドブロック', c:'ブロック' },{ id:'minecraft:structure_block', n:'ストラクチャーブロック', c:'ブロック' },
  { id:'minecraft:trial_spawner', n:'トライアルスポナー', c:'ブロック' },{ id:'minecraft:vault', n:'ヴォルト', c:'ブロック' },
];
const MC_ITEM_CATS = [...new Set(MC_ITEMS.map(i=>i.c))];

const MC_ENTITIES = [
  // 敵対 - アンデッド
  { id:'minecraft:zombie', n:'ゾンビ', c:'敵対' },{ id:'minecraft:husk', n:'ハスク', c:'敵対' },
  { id:'minecraft:drowned', n:'ドラウンド', c:'敵対' },{ id:'minecraft:zombie_villager', n:'村人ゾンビ', c:'敵対' },
  { id:'minecraft:skeleton', n:'スケルトン', c:'敵対' },{ id:'minecraft:stray', n:'ストレイ', c:'敵対' },
  { id:'minecraft:bogged', n:'ボグド', c:'敵対' },{ id:'minecraft:wither_skeleton', n:'ウィザースケルトン', c:'敵対' },
  { id:'minecraft:phantom', n:'ファントム', c:'敵対' },
  // 敵対 - 節足動物
  { id:'minecraft:creeper', n:'クリーパー', c:'敵対' },{ id:'minecraft:spider', n:'クモ', c:'敵対' },
  { id:'minecraft:cave_spider', n:'洞窟グモ', c:'敵対' },{ id:'minecraft:silverfish', n:'シルバーフィッシュ', c:'敵対' },
  { id:'minecraft:endermite', n:'エンダーマイト', c:'敵対' },
  // 敵対 - ネザー
  { id:'minecraft:blaze', n:'ブレイズ', c:'敵対' },{ id:'minecraft:ghast', n:'ガスト', c:'敵対' },
  { id:'minecraft:magma_cube', n:'マグマキューブ', c:'敵対' },{ id:'minecraft:hoglin', n:'ホグリン', c:'敵対' },
  { id:'minecraft:zoglin', n:'ゾグリン', c:'敵対' },{ id:'minecraft:piglin_brute', n:'ピグリンブルート', c:'敵対' },
  // 敵対 - 襲撃
  { id:'minecraft:pillager', n:'ピリジャー', c:'敵対' },{ id:'minecraft:vindicator', n:'ヴィンディケーター', c:'敵対' },
  { id:'minecraft:evoker', n:'エヴォーカー', c:'敵対' },{ id:'minecraft:ravager', n:'ラヴェジャー', c:'敵対' },
  { id:'minecraft:witch', n:'ウィッチ', c:'敵対' },
  // 敵対 - 水中・ガーディアン
  { id:'minecraft:guardian', n:'ガーディアン', c:'敵対' },{ id:'minecraft:elder_guardian', n:'エルダーガーディアン', c:'敵対' },
  // 敵対 - エンド
  { id:'minecraft:enderman', n:'エンダーマン', c:'中立' },{ id:'minecraft:shulker', n:'シュルカー', c:'敵対' },
  // 敵対 - 特殊
  { id:'minecraft:warden', n:'ウォーデン', c:'敵対' },{ id:'minecraft:breeze', n:'ブリーズ', c:'敵対' },
  { id:'minecraft:creaking', n:'クリーキング', c:'敵対' },{ id:'minecraft:slime', n:'スライム', c:'敵対' },
  // 中立
  { id:'minecraft:piglin', n:'ピグリン', c:'中立' },{ id:'minecraft:zombified_piglin', n:'ゾンビピグリン', c:'中立' },
  { id:'minecraft:wolf', n:'オオカミ', c:'中立' },{ id:'minecraft:bee', n:'ミツバチ', c:'中立' },
  // 友好
  { id:'minecraft:villager', n:'村人', c:'友好' },{ id:'minecraft:cow', n:'ウシ', c:'友好' },
  { id:'minecraft:pig', n:'ブタ', c:'友好' },{ id:'minecraft:sheep', n:'ヒツジ', c:'友好' },
  { id:'minecraft:chicken', n:'ニワトリ', c:'友好' },{ id:'minecraft:horse', n:'ウマ', c:'友好' },
  { id:'minecraft:cat', n:'ネコ', c:'友好' },{ id:'minecraft:allay', n:'アレイ', c:'友好' },
  { id:'minecraft:sniffer', n:'スニッファー', c:'友好' },{ id:'minecraft:armadillo', n:'アルマジロ', c:'友好' },
  { id:'minecraft:axolotl', n:'ウーパールーパー', c:'友好' },{ id:'minecraft:frog', n:'カエル', c:'友好' },
  // ユーティリティ
  { id:'minecraft:iron_golem', n:'アイアンゴーレム', c:'ユーティリティ' },{ id:'minecraft:snow_golem', n:'スノーゴーレム', c:'ユーティリティ' },
  // ボス
  { id:'minecraft:ender_dragon', n:'エンダードラゴン', c:'ボス' },{ id:'minecraft:wither', n:'ウィザー', c:'ボス' },
  // 特殊
  { id:'minecraft:armor_stand', n:'防具立て', c:'特殊' },{ id:'minecraft:marker', n:'マーカー', c:'特殊' },
  { id:'minecraft:area_effect_cloud', n:'エリアエフェクト', c:'特殊' },{ id:'minecraft:item_display', n:'アイテムディスプレイ', c:'特殊' },
  { id:'minecraft:text_display', n:'テキストディスプレイ', c:'特殊' },{ id:'minecraft:block_display', n:'ブロックディスプレイ', c:'特殊' },
  { id:'minecraft:interaction', n:'インタラクション', c:'特殊' },
];

const MC_EFFECTS = [
  // バフ
  { id:'speed', n:'移動速度上昇' },{ id:'haste', n:'採掘速度上昇' },{ id:'strength', n:'攻撃力上昇' },
  { id:'jump_boost', n:'跳躍力上昇' },{ id:'regeneration', n:'再生能力' },{ id:'resistance', n:'耐性' },
  { id:'fire_resistance', n:'火炎耐性' },{ id:'water_breathing', n:'水中呼吸' },{ id:'night_vision', n:'暗視' },
  { id:'invisibility', n:'透明化' },{ id:'slow_falling', n:'落下速度低下' },{ id:'conduit_power', n:'コンジットパワー' },
  { id:'dolphins_grace', n:'イルカの好意' },{ id:'absorption', n:'衝撃吸収' },{ id:'saturation', n:'満腹度回復' },
  { id:'health_boost', n:'体力増強' },{ id:'hero_of_the_village', n:'村の英雄' },
  // デバフ
  { id:'slowness', n:'移動速度低下' },{ id:'mining_fatigue', n:'採掘速度低下' },{ id:'weakness', n:'弱体化' },
  { id:'hunger', n:'空腹' },{ id:'poison', n:'毒' },{ id:'wither', n:'衰弱' },
  { id:'blindness', n:'盲目' },{ id:'nausea', n:'吐き気' },{ id:'levitation', n:'浮遊' },
  { id:'darkness', n:'暗闇' },{ id:'bad_omen', n:'不吉な予感' },
  // 即時
  { id:'instant_health', n:'即時回復' },{ id:'instant_damage', n:'即時ダメージ' },
  // ユーティリティ
  { id:'glowing', n:'発光' },{ id:'luck', n:'幸運' },{ id:'unluck', n:'不運' },
  // 1.21 新エフェクト
  { id:'trial_omen', n:'試練の予兆' },{ id:'raid_omen', n:'襲撃の予兆' },
  { id:'wind_charged', n:'風力帯電' },{ id:'weaving', n:'織り込み' },
  { id:'oozing', n:'滲出' },{ id:'infested', n:'寄生' },
];

const MC_PARTICLES = [
  // 炎・煙
  'flame','soul_fire_flame','smoke','white_smoke','large_smoke','campfire_cosy_smoke','lava',
  // 環境
  'cloud','rain','snowflake','ash','white_ash','cherry_leaves','crimson_spore','warped_spore','spore_blossom_air',
  // 戦闘
  'crit','enchanted_hit','sweep_attack','damage_indicator',
  // 感情・村人
  'heart','happy_villager','angry_villager','witch','note',
  // エフェクト
  'end_rod','portal','reverse_portal','dragon_breath','soul','dust','glow',
  // 爆発・花火
  'explosion','explosion_emitter','firework','flash',
  // 水中
  'bubble','bubble_pop','bubble_column_up','splash','underwater','nautilus','dolphin','dripping_water','dripping_lava',
  // スカルク
  'sculk_soul','sculk_charge','shriek','sonic_boom',
  // 1.21 ブリーズ・トライアル
  'gust','small_gust','gust_emitter_large','gust_emitter_small',
  'trial_spawner_detected_player','trial_spawner_detected_player_ominous',
  'vault_connection','ominous_spawning','raid_omen','trial_omen',
];

const MC_SOUNDS = [
  // UI・システム
  { id:'minecraft:entity.experience_orb.pickup', n:'経験値取得音' },
  { id:'minecraft:ui.toast.challenge_complete', n:'進捗達成音' },
  { id:'minecraft:entity.player.levelup', n:'レベルアップ音' },
  { id:'minecraft:ui.button.click', n:'ボタンクリック音' },
  // ノートブロック
  { id:'minecraft:block.note_block.pling', n:'ノートブロック(プリン)' },
  { id:'minecraft:block.note_block.bell', n:'ノートブロック(ベル)' },
  { id:'minecraft:block.note_block.chime', n:'ノートブロック(チャイム)' },
  { id:'minecraft:block.note_block.harp', n:'ノートブロック(ハープ)' },
  { id:'minecraft:block.note_block.xylophone', n:'ノートブロック(木琴)' },
  // ボス・敵対
  { id:'minecraft:entity.wither.spawn', n:'ウィザー出現音' },
  { id:'minecraft:entity.ender_dragon.growl', n:'ドラゴンの咆哮' },
  { id:'minecraft:entity.warden.emerge', n:'ウォーデン出現音' },
  { id:'minecraft:entity.warden.roar', n:'ウォーデンの咆哮' },
  { id:'minecraft:entity.breeze.shoot', n:'ブリーズ発射音' },
  { id:'minecraft:entity.breeze.land', n:'ブリーズ着地音' },
  // エンティティ
  { id:'minecraft:entity.enderman.teleport', n:'テレポート音' },
  { id:'minecraft:entity.blaze.shoot', n:'ブレイズ発射音' },
  { id:'minecraft:entity.zombie.ambient', n:'ゾンビの声' },
  { id:'minecraft:entity.firework_rocket.blast', n:'花火音' },
  { id:'minecraft:entity.lightning_bolt.impact', n:'雷鳴' },
  // ブロック
  { id:'minecraft:block.anvil.land', n:'金床落下音' },
  { id:'minecraft:block.chest.open', n:'チェスト開閉音' },
  { id:'minecraft:block.beacon.activate', n:'ビーコン起動音' },
  { id:'minecraft:block.amethyst_block.hit', n:'アメジストブロック音' },
  // 1.21 トライアル
  { id:'minecraft:block.trial_spawner.detect_player', n:'トライアルスポナー検知音' },
  { id:'minecraft:block.trial_spawner.spawn_mob', n:'トライアルスポナーMOB出現音' },
  { id:'minecraft:block.vault.open_shutter', n:'ヴォルト開放音' },
  { id:'minecraft:entity.player.hurt', n:'プレイヤーダメージ音' },
  { id:'minecraft:entity.generic.explode', n:'爆発音' },
];

const MC_COLORS = ['red','blue','green','yellow','aqua','gold','light_purple','dark_red','dark_blue','dark_green','dark_aqua','dark_purple','gray','dark_gray','white','black'];

const MC_COLOR_HEX = {
  red:'#FF5555', blue:'#5555FF', green:'#55FF55', yellow:'#FFFF55', aqua:'#55FFFF', gold:'#FFAA00',
  light_purple:'#FF55FF', dark_red:'#AA0000', dark_blue:'#0000AA', dark_green:'#00AA00', dark_aqua:'#00AAAA',
  dark_purple:'#AA00AA', gray:'#AAAAAA', dark_gray:'#555555', white:'#FFFFFF', black:'#000000',
};

// ════════════════════════════════════════════════════════════
// MINECRAFT WIKI ICON SYSTEM
// ════════════════════════════════════════════════════════════

const WIKI_ICON_MAP = {
  // 特殊名称マッピング (minecraft_id → Wiki_File_Name)
  ender_eye: "Eye_of_Ender.png", experience_bottle: "Bottle_o%27_Enchanting.png",
  redstone: "Redstone_Dust.png", map: "Map_(item).png", filled_map: "Map_(item).png",
  nether_star: "Nether_Star.png", fire_charge: "Fire_Charge.png",
  // アニメーション付き (.gif)
  enchanted_golden_apple: "Enchanted_Golden_Apple.gif", enchanted_book: "Enchanted_Book.gif",
  command_block: "Command_Block.gif", chain_command_block: "Chain_Command_Block.gif",
  repeating_command_block: "Repeating_Command_Block.gif",
  // 原石・鉱石
  raw_iron: "Raw_Iron.png", raw_gold: "Raw_Gold.png", raw_copper: "Raw_Copper.png",
  // ポーション系
  potion: "Potion.png", splash_potion: "Splash_Potion.png", lingering_potion: "Lingering_Potion.png",
  // 特殊ブロック
  grass_block: "Grass_Block.png", podzol: "Podzol.png", mycelium: "Mycelium.png",
  farmland: "Farmland.png", dirt_path: "Dirt_Path.png",
  // 略称・別名
  oak_planks: "Oak_Planks.png", spruce_planks: "Spruce_Planks.png",
  // レッドストーン
  redstone_torch: "Redstone_Torch.png", repeater: "Redstone_Repeater.png", comparator: "Redstone_Comparator.png",
  // 頭
  player_head: "Player_Head.png", zombie_head: "Zombie_Head.png",
  skeleton_skull: "Skeleton_Skull.png", creeper_head: "Creeper_Head.png",
  wither_skeleton_skull: "Wither_Skeleton_Skull.png", dragon_head: "Dragon_Head.png",
  piglin_head: "Piglin_Head.png",
  // 1.21 トライアルチャンバー
  trial_spawner: "Trial_Spawner.png", vault: "Vault.png", heavy_core: "Heavy_Core.png",
  wind_charge: "Wind_Charge.png", breeze_rod: "Breeze_Rod.png", mace: "Mace.png",
  trial_key: "Trial_Key.png", ominous_trial_key: "Ominous_Trial_Key.png", ominous_bottle: "Ominous_Bottle.png",
  // 防具テンプレート
  netherite_upgrade_smithing_template: "Netherite_Upgrade.png",
  // ディスク
  music_disc_13: "Music_Disc_13.png", music_disc_cat: "Music_Disc_Cat.png",
  music_disc_blocks: "Music_Disc_Blocks.png", music_disc_chirp: "Music_Disc_Chirp.png",
  music_disc_pigstep: "Music_Disc_Pigstep.png", music_disc_otherside: "Music_Disc_Otherside.png",
  music_disc_5: "Music_Disc_5.png", music_disc_relic: "Music_Disc_Relic.png",
  music_disc_precipice: "Music_Disc_Precipice.png", music_disc_creator: "Music_Disc_Creator.png",
  // 染色系
  white_wool: "White_Wool.png", white_bed: "White_Bed.png", white_banner: "White_Banner.png",
  // 食料
  cooked_beef: "Steak.png", cooked_porkchop: "Cooked_Porkchop.png",
  cooked_chicken: "Cooked_Chicken.png", cooked_mutton: "Cooked_Mutton.png",
  baked_potato: "Baked_Potato.png", pumpkin_pie: "Pumpkin_Pie.png",
  golden_apple: "Golden_Apple.png", golden_carrot: "Golden_Carrot.png",
  // エンティティ関連
  armor_stand: "Armor_Stand.png", elytra: "Elytra.png",
  totem_of_undying: "Totem_of_Undying.png", shield: "Shield.png",
  // チェスト・シュルカー
  chest: "Chest.png", ender_chest: "Ender_Chest.png",
  trapped_chest: "Trapped_Chest.png", barrel: "Barrel.png",
  // 看板
  oak_sign: "Oak_Sign.png", spruce_sign: "Spruce_Sign.png",
  // その他
  structure_block: "Structure_Block.png", barrier: "Barrier.png",
  spawner: "Spawner.png", bedrock: "Bedrock.png",
  name_tag: "Name_Tag.png", lead: "Lead.png", saddle: "Saddle.png",
  carrot_on_a_stick: "Carrot_on_a_Stick.png",
  // TNT・爆発物
  tnt: "TNT.png", tnt_minecart: "TNT_Minecart.png",
  firework_rocket: "Firework_Rocket.png", firework_star: "Firework_Star.png",
  // Codex検証済み: 特殊ID→表示名マッピング
  writable_book: "Book_and_Quill.png", turtle_helmet: "Turtle_Shell.png",
  scute: "Turtle_Scute.png", quartz: "Nether_Quartz.png",
  furnace_minecart: "Minecart_with_Furnace.png", chest_minecart: "Minecart_with_Chest.png",
  hopper_minecart: "Minecart_with_Hopper.png", tnt_minecart: "Minecart_with_TNT.png",
  command_block_minecart: "Minecart_with_Command_Block.png",
  oak_boat: "Oak_Boat.png", oak_chest_boat: "Oak_Boat_with_Chest.png",
  lapis_block: "Block_of_Lapis_Lazuli.png", iron_block: "Block_of_Iron.png",
  gold_block: "Block_of_Gold.png", diamond_block: "Block_of_Diamond.png",
  emerald_block: "Block_of_Emerald.png", netherite_block: "Block_of_Netherite.png",
  copper_block: "Block_of_Copper.png", redstone_block: "Block_of_Redstone.png",
  coal_block: "Block_of_Coal.png", amethyst_block: "Block_of_Amethyst.png",
  bamboo_block: "Block_of_Bamboo.png",
  rotten_flesh: "Rotten_Flesh.png", red_banner: "Red_Banner.png", compass: "Compass.png",
  crafting_table: "Crafting_Table.png", wither_skeleton_skull: "Wither_Skeleton_Skull.png",
  // 黄金系
  golden_boots: "Golden_Boots.png", golden_helmet: "Golden_Helmet.png",
  golden_chestplate: "Golden_Chestplate.png", golden_leggings: "Golden_Leggings.png",
  golden_sword: "Golden_Sword.png", golden_pickaxe: "Golden_Pickaxe.png",
  // ブリック
  bricks: "Bricks.png", nether_bricks: "Nether_Bricks.png",
  // その他
  spawner: "Spawner.gif", conduit: "Conduit.gif",
  end_crystal: "End_Crystal.png", glow_ink_sac: "Glow_Ink_Sac.png",
  recovery_compass: "Recovery_Compass.gif", clock: "Clock.gif",
};

const WIKI_BASE = 'https://minecraft.wiki/images/Invicon_';

function getInviconUrl(id) {
  const name = id.replace('minecraft:', '');
  if (WIKI_ICON_MAP[name]) return `https://minecraft.wiki/images/Invicon_${WIKI_ICON_MAP[name]}`;
  const titleCase = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
  return `${WIKI_BASE}${titleCase}.png`;
}

function getEffectIconUrl(id) {
  const name = id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
  return `https://minecraft.wiki/images/Effect_${name}_JE.png`;
}

function getSpawnEggUrl(entityId) {
  const name = entityId.replace('minecraft:', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
  return `${WIKI_BASE}${name}_Spawn_Egg.png`;
}

function McIcon({ id, size = 24, type = 'item', className = '' }) {
  const [errored, setErrored] = useState(false);
  const url = type === 'effect' ? getEffectIconUrl(id) : type === 'entity' ? getSpawnEggUrl(id) : getInviconUrl(id);
  if (errored) {
    return (
      <span className={`inline-flex items-center justify-center rounded ${className}`}
        style={{ width: size, height: size, background: 'linear-gradient(135deg, #555 0%, #333 100%)', fontSize: size * 0.5 }}>
        ?
      </span>
    );
  }
  return (
    <img src={url} alt={id} width={size} height={size} loading="lazy"
      className={`inline-block ${className}`}
      style={{ imageRendering: 'pixelated' }}
      onError={() => setErrored(true)} />
  );
}

function McInvSlot({ id, size = 48, count, onClick, selected, children }) {
  return (
    <div onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-all ${onClick ? 'cursor-pointer hover:brightness-125' : ''} ${selected ? 'ring-2 ring-yellow-400' : ''}`}
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #8b8b8b 0%, #373737 100%)',
        border: '2px solid', borderColor: '#555 #1a1a1a #1a1a1a #555',
        boxShadow: 'inset 1px 1px 0 #636363, inset -1px -1px 0 #2a2a2a',
      }}>
      {children || (id ? <McIcon id={id} size={Math.round(size * 0.7)} /> : null)}
      {count > 1 && (
        <span className="absolute bottom-0 right-0.5 text-white font-bold leading-none"
          style={{ fontSize: size * 0.28, textShadow: '1px 1px 0 #3f3f3f' }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISUAL COMMAND BUILDER DEFINITIONS
// ════════════════════════════════════════════════════════════

const COMMAND_BUILDER_DEFS = [
  {
    id: 'give', name: 'アイテム付与', icon: '🎒', cat: 'アイテム',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p','@r','@e'], def:'@a' },
      { key:'item', label:'アイテム', type:'mc_item', def:'minecraft:diamond_sword' },
      { key:'count', label:'個数', type:'number', min:1, max:64, def:1 },
    ],
    build: (f) => `give ${f.target} ${f.item} ${f.count}`,
  },
  {
    id: 'clear', name: 'アイテム消去', icon: '🗑️', cat: 'アイテム',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'item', label:'アイテム(空=全部)', type:'mc_item_optional', def:'' },
    ],
    build: (f) => f.item ? `clear ${f.target} ${f.item}` : `clear ${f.target}`,
  },
  {
    id: 'effect_give', name: 'エフェクト付与', icon: '✨', cat: 'エフェクト',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p','@e'], def:'@a' },
      { key:'effect', label:'エフェクト', type:'mc_effect', def:'speed' },
      { key:'duration', label:'秒数', type:'number', min:1, max:999999, def:10 },
      { key:'amplifier', label:'レベル(0=Lv1)', type:'number', min:0, max:255, def:0 },
      { key:'hide', label:'パーティクル非表示', type:'checkbox', def:false },
    ],
    build: (f) => `effect give ${f.target} ${f.effect} ${f.duration} ${f.amplifier}${f.hide ? ' true' : ''}`,
  },
  {
    id: 'effect_clear', name: 'エフェクト解除', icon: '🚫', cat: 'エフェクト',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'effect', label:'エフェクト(空=全部)', type:'mc_effect_optional', def:'' },
    ],
    build: (f) => f.effect ? `effect clear ${f.target} ${f.effect}` : `effect clear ${f.target}`,
  },
  {
    id: 'tp', name: 'テレポート', icon: '🌀', cat: '移動',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p','@e'], def:'@a' },
      { key:'x', label:'X座標', type:'text', def:'~' },
      { key:'y', label:'Y座標', type:'text', def:'~' },
      { key:'z', label:'Z座標', type:'text', def:'~' },
    ],
    build: (f) => `tp ${f.target} ${f.x} ${f.y} ${f.z}`,
  },
  {
    id: 'summon', name: 'エンティティ召喚', icon: '👾', cat: '移動',
    fields: [
      { key:'entity', label:'エンティティ', type:'mc_entity', def:'minecraft:zombie' },
      { key:'x', label:'X座標', type:'text', def:'~' },
      { key:'y', label:'Y座標', type:'text', def:'~' },
      { key:'z', label:'Z座標', type:'text', def:'~' },
      { key:'nbt', label:'NBTデータ', type:'text', def:'{}' },
    ],
    build: (f) => f.nbt && f.nbt !== '{}' ? `summon ${f.entity} ${f.x} ${f.y} ${f.z} ${f.nbt}` : `summon ${f.entity} ${f.x} ${f.y} ${f.z}`,
  },
  {
    id: 'title', name: 'タイトル表示', icon: '📺', cat: 'テキスト',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'position', label:'表示位置', type:'select', options:['title','subtitle','actionbar'], def:'title' },
      { key:'richtext', label:'テキスト', type:'mc_richtext', def:'{"text":"Hello!","color":"gold","bold":true}' },
    ],
    build: (f) => `title ${f.target} ${f.position} ${f.richtext}`,
  },
  {
    id: 'tellraw', name: 'チャットメッセージ', icon: '💬', cat: 'テキスト',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'richtext', label:'テキスト', type:'mc_richtext', def:'{"text":"メッセージ","color":"green"}' },
    ],
    build: (f) => `tellraw ${f.target} ${f.richtext}`,
  },
  {
    id: 'give_named', name: 'カスタム名アイテム', icon: '🏷️', cat: 'アイテム',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'item', label:'アイテム', type:'mc_item', def:'minecraft:diamond_sword' },
      { key:'count', label:'個数', type:'number', min:1, max:64, def:1 },
      { key:'name', label:'カスタム名', type:'mc_richtext', def:'{"text":"伝説の剣","color":"gold","bold":true,"italic":false}' },
      { key:'lore1', label:'説明文1行目', type:'mc_richtext', def:'{"text":"攻撃力+10","color":"gray","italic":true}' },
    ],
    build: (f) => `give ${f.target} ${f.item}[custom_name=${f.name},lore=[${f.lore1}]] ${f.count}`,
  },
  {
    id: 'playsound', name: 'サウンド再生', icon: '🔊', cat: '演出',
    fields: [
      { key:'sound', label:'サウンド', type:'mc_sound', def:'minecraft:entity.experience_orb.pickup' },
      { key:'source', label:'カテゴリ', type:'select', options:['master','music','record','weather','block','hostile','neutral','player','ambient','voice'], def:'master' },
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
    ],
    build: (f) => `playsound ${f.sound} ${f.source} ${f.target}`,
  },
  {
    id: 'particle', name: 'パーティクル', icon: '🎆', cat: '演出',
    fields: [
      { key:'particle', label:'パーティクル', type:'mc_particle', def:'flame' },
      { key:'x', label:'X', type:'text', def:'~ ~1 ~' },
      { key:'delta', label:'広がり', type:'text', def:'0.5 0.5 0.5' },
      { key:'speed', label:'速度', type:'number', min:0, max:10, def:0.1, step:0.01 },
      { key:'count', label:'数', type:'number', min:1, max:1000, def:20 },
    ],
    build: (f) => `particle ${f.particle} ${f.x} ${f.delta} ${f.speed} ${f.count}`,
  },
  {
    id: 'scoreboard_add', name: 'スコアボード作成', icon: '📊', cat: 'スコア',
    fields: [
      { key:'name', label:'目的名', type:'text', def:'my_score' },
      { key:'criteria', label:'基準', type:'select', options:['dummy','deathCount','playerKillCount','totalKillCount','health','food','air','armor','level','xp','trigger','minecraft.used:minecraft.carrot_on_a_stick','minecraft.custom:minecraft.jump'], def:'dummy' },
      { key:'display', label:'表示名', type:'text', def:'スコア' },
    ],
    build: (f) => `scoreboard objectives add ${f.name} ${f.criteria} "${f.display}"`,
  },
  {
    id: 'scoreboard_set', name: 'スコア設定', icon: '🔢', cat: 'スコア',
    fields: [
      { key:'action', label:'操作', type:'select', options:['set','add','remove'], def:'set' },
      { key:'target', label:'対象', type:'select', options:['@s','@a','@p','#変数'], def:'@s' },
      { key:'objective', label:'目的', type:'text', def:'my_score' },
      { key:'value', label:'値', type:'number', min:-2147483648, max:2147483647, def:0 },
    ],
    build: (f) => `scoreboard players ${f.action} ${f.target} ${f.objective} ${f.value}`,
  },
  {
    id: 'gamemode', name: 'ゲームモード', icon: '🎮', cat: 'ゲーム管理',
    fields: [
      { key:'mode', label:'モード', type:'select', options:['adventure','survival','creative','spectator'], def:'adventure' },
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
    ],
    build: (f) => `gamemode ${f.mode} ${f.target}`,
  },
  {
    id: 'tag', name: 'タグ操作', icon: '🏷️', cat: 'タグ管理',
    fields: [
      { key:'action', label:'操作', type:'select', options:['add','remove','list'], def:'add' },
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p','@e'], def:'@a' },
      { key:'tag', label:'タグ名', type:'text', def:'my_tag' },
    ],
    build: (f) => f.action === 'list' ? `tag ${f.target} list` : `tag ${f.target} ${f.action} ${f.tag}`,
  },
  {
    id: 'tag_conditional', name: 'タグ条件付与', icon: '🔖', cat: 'タグ管理',
    fields: [
      { key:'condition', label:'条件', type:'select', options:['if entity','if score','unless entity','unless score'], def:'if entity' },
      { key:'condParam', label:'条件パラメータ', type:'text', def:'@s[type=player]' },
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p','@e'], def:'@s' },
      { key:'action', label:'操作', type:'select', options:['add','remove'], def:'add' },
      { key:'tag', label:'タグ名', type:'text', def:'my_tag' },
    ],
    build: (f) => `execute ${f.condition} ${f.condParam} run tag ${f.target} ${f.action} ${f.tag}`,
  },
  {
    id: 'tag_selector', name: 'タグ付きセレクター', icon: '🎯', cat: 'タグ管理',
    fields: [
      { key:'base', label:'ベース', type:'select', options:['@a','@e','@s','@p'], def:'@a' },
      { key:'tag', label:'タグ名', type:'text', def:'my_tag' },
      { key:'negate', label:'タグなし(!)', type:'checkbox', def:false },
      { key:'cmd', label:'実行コマンド', type:'text', def:'say タグ付きです' },
    ],
    build: (f) => `execute as ${f.base}[tag=${f.negate ? '!' : ''}${f.tag}] run ${f.cmd}`,
  },
  {
    id: 'team_add', name: 'チーム作成', icon: '👥', cat: 'チーム',
    fields: [
      { key:'name', label:'チーム名', type:'text', def:'team_red' },
      { key:'display', label:'表示名', type:'text', def:'赤チーム' },
      { key:'color', label:'色', type:'mc_color', def:'red' },
      { key:'ff', label:'フレンドリーファイア', type:'checkbox', def:false },
    ],
    build: (f) => `team add ${f.name} "${f.display}"\nteam modify ${f.name} color ${f.color}\nteam modify ${f.name} friendlyFire ${f.ff}`,
  },
  {
    id: 'team_join', name: 'チーム参加', icon: '➕', cat: 'チーム',
    fields: [
      { key:'team', label:'チーム名', type:'text', def:'team_red' },
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
    ],
    build: (f) => `team join ${f.team} ${f.target}`,
  },
  {
    id: 'bossbar_add', name: 'ボスバー作成', icon: '📏', cat: 'ボスバー',
    fields: [
      { key:'id', label:'ID', type:'text', def:'my_bar' },
      { key:'name', label:'表示名', type:'text', def:'タイマー' },
      { key:'color', label:'色', type:'select', options:['red','blue','green','yellow','purple','pink','white'], def:'yellow' },
      { key:'max', label:'最大値', type:'number', min:1, max:99999, def:300 },
      { key:'style', label:'スタイル', type:'select', options:['progress','notched_6','notched_10','notched_12','notched_20'], def:'notched_10' },
    ],
    build: (f) => `bossbar add ${f.id} "${f.name}"\nbossbar set ${f.id} color ${f.color}\nbossbar set ${f.id} max ${f.max}\nbossbar set ${f.id} value ${f.max}\nbossbar set ${f.id} style ${f.style}\nbossbar set ${f.id} players @a`,
  },
  {
    id: 'execute_if', name: '条件実行 (execute)', icon: '⚡', cat: '条件分岐',
    fields: [
      { key:'condition', label:'条件タイプ', type:'select', options:['if score','if entity','if block','unless score','unless entity'], def:'if score' },
      { key:'param1', label:'パラメータ1', type:'text', def:'#game game_state matches 1' },
      { key:'run', label:'実行コマンド', type:'text', def:'say ゲーム中' },
    ],
    build: (f) => `execute ${f.condition} ${f.param1} run ${f.run}`,
  },
  {
    id: 'execute_as', name: '対象として実行 (execute)', icon: '👤', cat: '条件分岐',
    fields: [
      { key:'target', label:'対象セレクター', type:'select', options:['@a','@s','@p','@e','@a[scores={alive=1}]'], def:'@a' },
      { key:'at', label:'at @s も付ける', type:'checkbox', def:true },
      { key:'run', label:'実行コマンド', type:'text', def:'say hello' },
    ],
    build: (f) => `execute as ${f.target}${f.at ? ' at @s' : ''} run ${f.run}`,
  },
  {
    id: 'setblock', name: 'ブロック設置', icon: '🧱', cat: 'ブロック',
    fields: [
      { key:'x', label:'X', type:'text', def:'~' },
      { key:'y', label:'Y', type:'text', def:'~' },
      { key:'z', label:'Z', type:'text', def:'~' },
      { key:'block', label:'ブロック', type:'text', def:'minecraft:stone' },
      { key:'mode', label:'モード', type:'select', options:['replace','destroy','keep'], def:'replace' },
    ],
    build: (f) => `setblock ${f.x} ${f.y} ${f.z} ${f.block} ${f.mode}`,
  },
  {
    id: 'fill', name: 'ブロック一括設置', icon: '⬜', cat: 'ブロック',
    fields: [
      { key:'from', label:'開始座標', type:'text', def:'~-5 ~ ~-5' },
      { key:'to', label:'終了座標', type:'text', def:'~5 ~3 ~5' },
      { key:'block', label:'ブロック', type:'text', def:'minecraft:stone' },
      { key:'mode', label:'モード', type:'select', options:['replace','destroy','hollow','outline','keep'], def:'replace' },
    ],
    build: (f) => `fill ${f.from} ${f.to} ${f.block} ${f.mode}`,
  },
  {
    id: 'spawnpoint', name: 'スポーン地点設定', icon: '🛏️', cat: 'ゲーム管理',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@a','@s','@p'], def:'@a' },
      { key:'x', label:'X', type:'text', def:'~' },
      { key:'y', label:'Y', type:'text', def:'~' },
      { key:'z', label:'Z', type:'text', def:'~' },
    ],
    build: (f) => `spawnpoint ${f.target} ${f.x} ${f.y} ${f.z}`,
  },
  // ── Attribute commands ──
  {
    id: 'attribute_base_set', name: '属性値設定/リセット', icon: '📈', cat: '属性(attribute)',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@s','@a','@p','@e'], def:'@s' },
      { key:'attr', label:'属性', type:'select', options:[
        'max_health','movement_speed','attack_damage','attack_speed','armor','armor_toughness',
        'knockback_resistance','flying_speed','follow_range','luck','spawn_reinforcements',
        'jump_strength','block_interaction_range','entity_interaction_range','block_break_speed',
        'burning_time','explosion_knockback_resistance','gravity','mining_efficiency',
        'movement_efficiency','oxygen_bonus','safe_fall_distance','scale','step_height',
        'submerged_mining_speed','sweeping_damage_ratio','tempt_range','water_movement_efficiency',
      ], def:'movement_speed' },
      { key:'action', label:'操作', type:'select', options:['set','reset'], def:'set' },
      { key:'value', label:'値(set時)', type:'text', def:'0.1' },
    ],
    build: (f) => f.action === 'reset'
      ? `attribute ${f.target} minecraft:${f.attr} base reset`
      : `attribute ${f.target} minecraft:${f.attr} base set ${f.value}`,
  },
  {
    id: 'attribute_base_get', name: '属性値取得', icon: '📊', cat: '属性(attribute)',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@s','@a','@p'], def:'@s' },
      { key:'attr', label:'属性', type:'select', options:[
        'max_health','movement_speed','attack_damage','attack_speed','armor','armor_toughness',
        'knockback_resistance','follow_range','luck','scale','gravity',
      ], def:'movement_speed' },
      { key:'scale', label:'スケール', type:'number', min:0.01, max:100, def:1, step:0.01 },
    ],
    build: (f) => `attribute ${f.target} minecraft:${f.attr} base get ${f.scale}`,
  },
  {
    id: 'attribute_modifier', name: '属性モディファイア', icon: '🔧', cat: '属性(attribute)',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@s','@a','@p','@e'], def:'@s' },
      { key:'attr', label:'属性', type:'select', options:[
        'max_health','movement_speed','attack_damage','attack_speed','armor','armor_toughness',
        'knockback_resistance','scale','gravity',
      ], def:'movement_speed' },
      { key:'action', label:'操作', type:'select', options:['add','remove'], def:'add' },
      { key:'id', label:'モディファイアID', type:'text', def:'mypack:speed_boost' },
      { key:'value', label:'値(add時)', type:'text', def:'0.05' },
      { key:'operation', label:'演算(add時)', type:'select', options:['add_value','add_multiplied_base','add_multiplied_total'], def:'add_value' },
    ],
    build: (f) => f.action === 'remove'
      ? `attribute ${f.target} minecraft:${f.attr} modifier remove ${f.id}`
      : `attribute ${f.target} minecraft:${f.attr} modifier add ${f.id} ${f.value} ${f.operation}`,
  },
  // ── Enhanced Scoreboard commands ──
  {
    id: 'scoreboard_display', name: 'スコア表示切替', icon: '📺', cat: 'スコア',
    fields: [
      { key:'slot', label:'表示位置', type:'select', options:['sidebar','list','below_name'], def:'sidebar' },
      { key:'objective', label:'目的', type:'text', def:'my_score' },
    ],
    build: (f) => `scoreboard objectives setdisplay ${f.slot} ${f.objective}`,
  },
  {
    id: 'scoreboard_remove', name: 'スコアボード削除', icon: '❌', cat: 'スコア',
    fields: [
      { key:'objective', label:'目的名', type:'text', def:'my_score' },
    ],
    build: (f) => `scoreboard objectives remove ${f.objective}`,
  },
  {
    id: 'scoreboard_operation', name: 'スコア演算', icon: '🔢', cat: 'スコア',
    fields: [
      { key:'target', label:'対象', type:'select', options:['@s','@a','@p','#変数'], def:'@s' },
      { key:'targetObj', label:'対象の目的', type:'text', def:'my_score' },
      { key:'operation', label:'演算子', type:'select', options:['=','+=','-=','*=','/=','%=','>','<','><'], def:'+=' },
      { key:'source', label:'参照', type:'text', def:'#変数' },
      { key:'sourceObj', label:'参照の目的', type:'text', def:'my_score' },
    ],
    build: (f) => `scoreboard players operation ${f.target} ${f.targetObj} ${f.operation} ${f.source} ${f.sourceObj}`,
  },
  {
    id: 'scoreboard_conditional', name: 'スコア条件実行', icon: '⚡', cat: 'スコア',
    fields: [
      { key:'check', label:'判定', type:'select', options:['if','unless'], def:'if' },
      { key:'target', label:'対象', type:'text', def:'@s' },
      { key:'objective', label:'目的', type:'text', def:'my_score' },
      { key:'range', label:'範囲(例: 1..)', type:'text', def:'1..' },
      { key:'run', label:'実行コマンド', type:'text', def:'say スコア条件成立' },
    ],
    build: (f) => `execute ${f.check} score ${f.target} ${f.objective} matches ${f.range} run ${f.run}`,
  },
];
const COMMAND_BUILDER_CATS = [...new Set(COMMAND_BUILDER_DEFS.map(d=>d.cat))];

// ════════════════════════════════════════════════════════════
// COMMAND SNIPPETS (for CommandReference)
// ════════════════════════════════════════════════════════════

const COMMAND_SNIPPETS = [
  {
    category: 'スコアボード',
    icon: Target,
    items: [
      { label: 'ダミースコア作成', code: 'scoreboard objectives add <名前> dummy "表示名"', desc: '数値を保存するスコアボード' },
      { label: '死亡カウント作成', code: 'scoreboard objectives add deaths deathCount "死亡"', desc: '死亡回数を自動カウント' },
      { label: 'スコア設定', code: 'scoreboard players set @s <目的> <値>', desc: 'プレイヤーのスコアを設定' },
      { label: 'スコア加算', code: 'scoreboard players add @s <目的> 1', desc: 'スコアを1加算' },
      { label: 'フェイクプレイヤー', code: 'scoreboard players set #変数名 <目的> 0', desc: '#で始まる名前は非表示の変数として使える' },
    ],
  },
  {
    category: 'チーム',
    icon: Users,
    items: [
      { label: 'チーム作成', code: 'team add <名前> "表示名"', desc: 'チームを新規作成' },
      { label: 'チーム色設定', code: 'team modify <名前> color red', desc: 'red/blue/green/yellow等' },
      { label: 'チーム参加', code: 'team join <名前> @a', desc: 'プレイヤーをチームに参加させる' },
      { label: 'FF無効化', code: 'team modify <名前> friendlyFire false', desc: '味方への攻撃を無効化' },
      { label: 'ネームタグ非表示', code: 'team modify <名前> nametagVisibility hideForOtherTeams', desc: '敵チームからネームタグを隠す' },
    ],
  },
  {
    category: 'execute（条件実行）',
    icon: Zap,
    items: [
      { label: 'スコア条件', code: 'execute if score #game state matches 1 run ...', desc: 'スコアが条件を満たすとき実行' },
      { label: 'エンティティ条件', code: 'execute if entity @a[tag=winner] run ...', desc: '条件に合うエンティティが存在するとき' },
      { label: 'プレイヤーとして実行', code: 'execute as @a run ...', desc: '各プレイヤーとして実行' },
      { label: '位置で実行', code: 'execute at @a run ...', desc: 'プレイヤーの位置で実行' },
      { label: '結果を保存', code: 'execute store result score #count obj run ...', desc: 'コマンド結果をスコアに保存' },
    ],
  },
  {
    category: 'ボスバー',
    icon: Layers,
    items: [
      { label: 'ボスバー作成', code: 'bossbar add <ns>:timer "タイマー"', desc: 'ボスバーを作成' },
      { label: '表示対象設定', code: 'bossbar set <ns>:timer players @a', desc: '表示するプレイヤーを設定' },
      { label: '最大値/値設定', code: 'bossbar set <ns>:timer max 300', desc: '最大値を設定' },
      { label: '色・スタイル', code: 'bossbar set <ns>:timer color yellow', desc: 'red/blue/green/yellow/purple/pink/white' },
      { label: '削除', code: 'bossbar remove <ns>:timer', desc: 'ボスバーを削除' },
    ],
  },
  {
    category: 'エフェクト・テレポート',
    icon: Sparkles,
    items: [
      { label: 'エフェクト付与', code: 'effect give @a speed 10 1 true', desc: '10秒間スピードLv2（trueで粒子非表示）' },
      { label: 'エフェクト解除', code: 'effect clear @a', desc: '全エフェクトを解除' },
      { label: 'テレポート', code: 'tp @a ~ ~ ~', desc: '指定座標にテレポート' },
      { label: 'スポーン設定', code: 'spawnpoint @a ~ ~ ~', desc: 'リスポーン地点を設定' },
      { label: '属性変更', code: 'attribute @s movement_speed base set 0.1', desc: '移動速度を変更（デフォルト0.1）', v: '1.16' },
    ],
  },
  {
    category: 'テキスト表示',
    icon: BookOpen,
    items: [
      { label: 'タイトル表示', code: 'title @a title {"text":"タイトル","bold":true,"color":"gold"}', desc: '画面中央に大きく表示' },
      { label: 'サブタイトル', code: 'title @a subtitle {"text":"説明文","color":"yellow"}', desc: 'タイトルの下に表示' },
      { label: 'アクションバー', code: 'title @a actionbar {"text":"情報","color":"white"}', desc: '画面下部に情報表示' },
      { label: 'チャットメッセージ', code: 'tellraw @a {"text":"メッセージ","color":"green"}', desc: 'チャット欄に装飾テキスト' },
      { label: 'セレクター表示', code: 'tellraw @a [{"selector":"@s"},{"text":"がゴール！"}]', desc: 'プレイヤー名を含むメッセージ' },
    ],
  },
  {
    category: 'ゲーム管理',
    icon: Settings,
    items: [
      { label: 'ゲームモード変更', code: 'gamemode adventure @a', desc: 'adventure/survival/spectator/creative' },
      { label: 'アイテム消去', code: 'clear @a', desc: '全アイテムを消去' },
      { label: 'アイテム付与', code: 'give @a diamond_sword 1', desc: 'アイテムを付与' },
      { label: 'サウンド再生', code: 'execute at @s run playsound minecraft:ui.toast.challenge_complete master @s', desc: '進捗達成音を再生' },
      { label: 'タグ付与', code: 'tag @a add my_tag', desc: 'プレイヤーにタグを付与' },
      { label: 'タグ削除', code: 'tag @a remove my_tag', desc: 'プレイヤーからタグを削除' },
      { label: 'タグ確認', code: 'tag @s list', desc: '自分のタグ一覧を表示' },
    ],
  },
  {
    category: 'タグ管理',
    icon: Tag,
    items: [
      { label: 'タグ付与', code: 'tag @a add my_tag', desc: '全プレイヤーにタグ付与' },
      { label: 'タグ削除', code: 'tag @a remove my_tag', desc: 'タグを削除' },
      { label: 'タグ一覧', code: 'tag @s list', desc: '自分のタグ一覧を表示' },
      { label: 'タグ条件付与', code: 'execute as @a[scores={alive=1}] run tag @s add survivor', desc: 'スコア条件付きタグ付与' },
      { label: 'タグで選別', code: 'execute as @a[tag=my_tag] run say タグ持ち', desc: 'タグ付きプレイヤーに実行' },
      { label: '否定タグ', code: 'execute as @a[tag=!my_tag] run tag @s add my_tag', desc: 'タグがない人に付与' },
      { label: '複数タグ条件', code: '@a[tag=team_red,tag=!dead]', desc: '複数タグのAND条件' },
    ],
  },
  {
    category: '属性(attribute)',
    icon: Zap,
    items: [
      { label: '移動速度設定', code: 'attribute @s minecraft:movement_speed base set 0.15', desc: 'デフォルト0.1、0.15で1.5倍速' },
      { label: '最大体力変更', code: 'attribute @s minecraft:max_health base set 40', desc: 'デフォルト20（ハート10個）' },
      { label: '攻撃力設定', code: 'attribute @s minecraft:attack_damage base set 10', desc: '攻撃ダメージ量' },
      { label: 'サイズ変更', code: 'attribute @s minecraft:scale base set 2.0', desc: 'エンティティのサイズ（1.20.5+）' },
      { label: '重力変更', code: 'attribute @s minecraft:gravity base set 0.04', desc: 'デフォルト0.08、低重力' },
      { label: '属性リセット', code: 'attribute @s minecraft:movement_speed base reset', desc: '属性をデフォルト値にリセット' },
      { label: 'モディファイア追加', code: 'attribute @s minecraft:movement_speed modifier add mypack:speed_boost 0.05 add_value', desc: '属性にモディファイアを追加' },
      { label: 'モディファイア削除', code: 'attribute @s minecraft:movement_speed modifier remove mypack:speed_boost', desc: 'モディファイアを削除' },
    ],
  },
  {
    category: 'バージョン別の注意',
    icon: Info,
    items: [
      { label: 'マクロ ($)', code: '$execute if score #var obj matches 1 run say $(name)', desc: 'マクロ構文は1.20.2以降で使用可能', v: '1.20.2' },
      { label: 'return コマンド', code: 'return 1', desc: '関数の戻り値。1.20以降', v: '1.20' },
      { label: 'ride コマンド', code: 'ride @s mount @e[type=horse,limit=1,sort=nearest]', desc: '騎乗操作。1.19.4以降', v: '1.19.4' },
      { label: 'damage コマンド', code: 'damage @s 5 minecraft:generic', desc: 'ダメージ付与。1.19.4以降', v: '1.19.4' },
      { label: '@n セレクター', code: '@n[type=zombie]', desc: '最寄りエンティティ。1.21以降', v: '1.21' },
      { label: 'tick コマンド', code: 'tick rate 40', desc: 'ティック操作。1.20.3以降', v: '1.20.3' },
      { label: 'random コマンド', code: 'random value 1..6', desc: '乱数生成。1.20.2以降', v: '1.20.2' },
    ],
  },
];

// ════════════════════════════════════════════════════════════
// MINECRAFT COMMAND AUTOCOMPLETE DATABASE
// ════════════════════════════════════════════════════════════

const MC_AUTO = {
  _root: [
    { l: 'execute', d: '条件付きコマンド実行' }, { l: 'scoreboard', d: 'スコアボード操作' },
    { l: 'team', d: 'チーム管理' }, { l: 'tag', d: 'タグ操作' },
    { l: 'effect', d: 'エフェクト操作' }, { l: 'give', d: 'アイテム付与' },
    { l: 'clear', d: 'アイテム消去' }, { l: 'tp', d: 'テレポート' },
    { l: 'teleport', d: 'テレポート' }, { l: 'kill', d: 'エンティティ消去' },
    { l: 'summon', d: 'エンティティ召喚' }, { l: 'setblock', d: 'ブロック設置' },
    { l: 'fill', d: '範囲ブロック設置' }, { l: 'clone', d: 'ブロック複製' },
    { l: 'gamemode', d: 'ゲームモード変更' }, { l: 'difficulty', d: '難易度変更' },
    { l: 'title', d: 'タイトル表示' }, { l: 'tellraw', d: 'JSONテキスト表示' },
    { l: 'say', d: 'チャットメッセージ' }, { l: 'bossbar', d: 'ボスバー操作' },
    { l: 'function', d: '関数実行' }, { l: 'schedule', d: '遅延実行', v: '1.14' },
    { l: 'data', d: 'NBTデータ操作' }, { l: 'particle', d: 'パーティクル表示' },
    { l: 'playsound', d: 'サウンド再生' }, { l: 'stopsound', d: 'サウンド停止' },
    { l: 'advancement', d: '進捗操作' }, { l: 'recipe', d: 'レシピ操作' },
    { l: 'weather', d: '天候変更' }, { l: 'time', d: '時刻操作' },
    { l: 'gamerule', d: 'ゲームルール変更' }, { l: 'worldborder', d: 'ワールドボーダー' },
    { l: 'spawnpoint', d: 'スポーンポイント設定' }, { l: 'setworldspawn', d: 'ワールドスポーン設定' },
    { l: 'spreadplayers', d: 'プレイヤー散布' }, { l: 'forceload', d: 'チャンク強制読込' },
    { l: 'reload', d: 'データパック再読込' }, { l: 'attribute', d: '属性操作', v: '1.16' },
    { l: 'enchant', d: 'エンチャント付与' }, { l: 'experience', d: '経験値操作' },
    { l: 'xp', d: '経験値操作' },
    { l: 'replaceitem', d: 'アイテム置換', rm: '1.17' },
    { l: 'item', d: 'アイテム操作', v: '1.17' },
    { l: 'loot', d: 'ルートテーブル実行', v: '1.14' }, { l: 'trigger', d: 'トリガー操作' },
    { l: 'spectate', d: 'スペクテイター操作', v: '1.15' },
    { l: 'locatebiome', d: 'バイオーム検索', v: '1.16', rm: '1.19' },
    { l: 'placefeature', d: '地物配置', v: '1.18.2', rm: '1.19' },
    { l: 'place', d: '構造物配置', v: '1.19' },
    { l: 'fillbiome', d: 'バイオーム充填', v: '1.19.3' },
    { l: 'ride', d: '騎乗操作', v: '1.19.4' }, { l: 'damage', d: 'ダメージ付与', v: '1.19.4' },
    { l: 'return', d: '関数戻り値', v: '1.20' }, { l: 'random', d: '乱数生成', v: '1.20.2' },
    { l: 'tick', d: 'ティック操作', v: '1.20.3' },
    { l: 'transfer', d: 'サーバー転送', v: '1.20.5' },
    { l: 'rotate', d: 'エンティティ回転', v: '1.21.2' },
    { l: 'test', d: 'テスト実行', v: '1.21.5' },
    { l: 'dialog', d: 'ダイアログ表示', v: '1.21.6' },
    { l: 'fetchprofile', d: 'プロフィール取得', v: '1.21.9' },
    { l: 'locate', d: '構造物/バイオーム検索' },
    { l: 'datapack', d: 'データパック管理' },
    { l: 'me', d: 'アクションメッセージ' }, { l: 'teammsg', d: 'チームチャット' }, { l: 'tm', d: 'チームチャット' },
    { l: 'msg', d: '個人メッセージ' }, { l: 'tell', d: '個人メッセージ' }, { l: 'w', d: '個人メッセージ' },
    { l: 'help', d: 'ヘルプ表示' }, { l: '?', d: 'ヘルプ表示' },
    { l: 'stopwatch', d: 'ストップウォッチ', v: '1.21.11' },
    { l: 'defaultgamemode', d: 'デフォルトゲームモード' },
  ],
  execute: [
    { l: 'as', d: 'エンティティとして実行' }, { l: 'at', d: 'エンティティの位置で' },
    { l: 'positioned', d: '指定座標で' }, { l: 'rotated', d: '回転を変更' },
    { l: 'facing', d: '方向を変更' }, { l: 'in', d: 'ディメンション指定' },
    { l: 'if', d: '条件が真なら実行' }, { l: 'unless', d: '条件が偽なら実行' },
    { l: 'store', d: '結果を保存' }, { l: 'run', d: 'コマンドを実行' },
    { l: 'anchored', d: 'アンカー位置' }, { l: 'align', d: '座標を整列' },
    { l: 'on', d: '関係エンティティ', v: '1.19.4' }, { l: 'summon', d: '召喚して実行', v: '1.19.4' },
  ],
  'execute.if': [
    { l: 'entity', d: 'エンティティ存在判定' }, { l: 'block', d: 'ブロック判定' },
    { l: 'blocks', d: 'ブロック範囲判定' }, { l: 'score', d: 'スコア条件判定' },
    { l: 'predicate', d: '条件判定', v: '1.15' }, { l: 'data', d: 'NBTデータ存在判定' },
    { l: 'biome', d: 'バイオーム判定', v: '1.19' }, { l: 'loaded', d: 'チャンクロード判定', v: '1.19.4' },
    { l: 'dimension', d: 'ディメンション判定', v: '1.19.4' },
    { l: 'function', d: '関数戻り値判定', v: '1.20.3' }, { l: 'items', d: 'アイテム判定', v: '1.20.5' },
    { l: 'stopwatch', d: 'ストップウォッチ判定', v: '1.21.11' },
  ],
  'execute.if.data': [
    { l: 'block', d: 'ブロックNBT' }, { l: 'entity', d: 'エンティティNBT' },
    { l: 'storage', d: 'ストレージNBT' },
  ],
  'execute.if.items': [
    { l: 'block', d: 'ブロック内アイテム', v: '1.20.5' },
    { l: 'entity', d: 'エンティティ内アイテム', v: '1.20.5' },
  ],
  'execute.store': [
    { l: 'result', d: '結果を保存' }, { l: 'success', d: '成功フラグを保存' },
  ],
  'execute.store.result': [
    { l: 'score', d: 'スコアに保存' }, { l: 'bossbar', d: 'ボスバーに保存' },
    { l: 'storage', d: 'ストレージに保存' }, { l: 'entity', d: 'エンティティに保存' },
    { l: 'block', d: 'ブロックに保存' },
  ],
  scoreboard: [
    { l: 'objectives', d: '目的管理' }, { l: 'players', d: 'プレイヤースコア管理' },
  ],
  'scoreboard.objectives': [
    { l: 'add', d: '目的を追加' }, { l: 'remove', d: '目的を削除' },
    { l: 'list', d: '目的一覧' }, { l: 'setdisplay', d: '表示設定' },
    { l: 'modify', d: '目的を変更' },
  ],
  'scoreboard.players': [
    { l: 'set', d: 'スコア設定' }, { l: 'add', d: 'スコア加算' },
    { l: 'remove', d: 'スコア減算' }, { l: 'reset', d: 'スコアリセット' },
    { l: 'get', d: 'スコア取得' }, { l: 'operation', d: 'スコア演算' },
    { l: 'enable', d: 'トリガー有効化' }, { l: 'display', d: '表示設定' },
  ],
  team: [
    { l: 'add', d: 'チーム追加' }, { l: 'remove', d: 'チーム削除' },
    { l: 'join', d: 'チーム参加' }, { l: 'leave', d: 'チーム脱退' },
    { l: 'modify', d: 'チーム設定変更' }, { l: 'empty', d: '全員脱退' },
    { l: 'list', d: 'チーム一覧' },
  ],
  'team.modify': [
    { l: 'color', d: 'チーム色' }, { l: 'friendlyFire', d: '味方攻撃' },
    { l: 'seeFriendlyInvisibles', d: '味方透明表示' }, { l: 'nametagVisibility', d: 'ネームタグ' },
    { l: 'deathMessageVisibility', d: '死亡メッセージ' }, { l: 'collisionRule', d: '当たり判定' },
    { l: 'prefix', d: 'プレフィックス' }, { l: 'suffix', d: 'サフィックス' },
  ],
  effect: [{ l: 'give', d: 'エフェクト付与' }, { l: 'clear', d: 'エフェクト解除' }],
  bossbar: [
    { l: 'add', d: '追加' }, { l: 'remove', d: '削除' },
    { l: 'set', d: '設定' }, { l: 'get', d: '取得' }, { l: 'list', d: '一覧' },
  ],
  'bossbar.set': [
    { l: 'name', d: '表示名' }, { l: 'color', d: '色' },
    { l: 'style', d: 'スタイル' }, { l: 'max', d: '最大値' },
    { l: 'value', d: '値' }, { l: 'visible', d: '表示/非表示' },
    { l: 'players', d: '表示対象' },
  ],
  gamemode: [
    { l: 'survival', d: 'サバイバル' }, { l: 'creative', d: 'クリエイティブ' },
    { l: 'adventure', d: 'アドベンチャー' }, { l: 'spectator', d: 'スペクテイター' },
  ],
  data: [
    { l: 'get', d: 'データ取得' }, { l: 'merge', d: 'データ統合' },
    { l: 'modify', d: 'データ変更' }, { l: 'remove', d: 'データ削除' },
  ],
  'data.get': [
    { l: 'entity', d: 'エンティティのNBT取得' }, { l: 'block', d: 'ブロックのNBT取得' },
    { l: 'storage', d: 'ストレージのデータ取得' },
  ],
  'data.merge': [
    { l: 'entity', d: 'エンティティにNBT統合' }, { l: 'block', d: 'ブロックにNBT統合' },
    { l: 'storage', d: 'ストレージにデータ統合' },
  ],
  'data.modify': [
    { l: 'entity', d: 'エンティティNBT変更' }, { l: 'block', d: 'ブロックNBT変更' },
    { l: 'storage', d: 'ストレージデータ変更' },
  ],
  'data.remove': [
    { l: 'entity', d: 'エンティティNBT削除' }, { l: 'block', d: 'ブロックNBT削除' },
    { l: 'storage', d: 'ストレージデータ削除' },
  ],
  title: [
    { l: 'title', d: 'タイトル表示' }, { l: 'subtitle', d: 'サブタイトル' },
    { l: 'actionbar', d: 'アクションバー' }, { l: 'clear', d: 'クリア' },
    { l: 'reset', d: 'リセット' }, { l: 'times', d: '表示時間設定' },
  ],
  advancement: [{ l: 'grant', d: '進捗付与' }, { l: 'revoke', d: '進捗取消' }],
  time: [{ l: 'set', d: '時刻設定' }, { l: 'add', d: '時刻加算' }, { l: 'query', d: '時刻取得' }],
  weather: [{ l: 'clear', d: '晴れ' }, { l: 'rain', d: '雨' }, { l: 'thunder', d: '雷雨' }],
  difficulty: [
    { l: 'peaceful', d: 'ピースフル' }, { l: 'easy', d: 'イージー' },
    { l: 'normal', d: 'ノーマル' }, { l: 'hard', d: 'ハード' },
  ],
  schedule: [{ l: 'function', d: '関数遅延実行' }, { l: 'clear', d: 'スケジュール解除' }],
  item: [{ l: 'modify', d: 'アイテム変更' }, { l: 'replace', d: 'アイテム置換' }],
  rotate: [
    { l: '~', d: '相対角度 (yaw pitch)' }, { l: '@s', d: '実行者を回転' },
    { l: '@e', d: 'エンティティを回転' }, { l: '@p', d: '最寄りプレイヤーを回転' },
  ],
  test: [
    { l: 'run', d: 'テスト実行', v: '1.21.5' }, { l: 'runclosest', d: '最寄りテスト実行', v: '1.21.5' },
    { l: 'runthat', d: '注視先テスト実行', v: '1.21.5' }, { l: 'runthese', d: '全テスト実行', v: '1.21.5' },
    { l: 'runmultiple', d: '複数回テスト', v: '1.21.5' }, { l: 'runfailed', d: '失敗テスト再実行', v: '1.21.5' },
    { l: 'create', d: 'テスト作成', v: '1.21.5' }, { l: 'locate', d: 'テスト検索', v: '1.21.5' },
    { l: 'pos', d: '相対位置取得', v: '1.21.5' }, { l: 'stop', d: 'テスト停止', v: '1.21.5' },
    { l: 'verify', d: 'テスト検証', v: '1.21.5' },
    { l: 'clearall', d: 'テスト結果クリア', v: '1.21.5' }, { l: 'clearthat', d: '注視先クリア', v: '1.21.5' },
    { l: 'clearthese', d: '範囲内クリア', v: '1.21.5' },
    { l: 'resetclosest', d: '最寄りリセット', v: '1.21.5' }, { l: 'resetthat', d: '注視先リセット', v: '1.21.5' },
    { l: 'resetthese', d: '範囲内リセット', v: '1.21.5' },
    { l: 'export', d: 'テストエクスポート', v: '1.21.5' },
    { l: 'exportclosest', d: '最寄りエクスポート', v: '1.21.5' },
    { l: 'exportthat', d: '注視先エクスポート', v: '1.21.5' },
    { l: 'exportthese', d: '範囲内エクスポート', v: '1.21.5' },
  ],
  fetchprofile: [
    { l: 'name', d: 'プレイヤー名で検索', v: '1.21.9' },
    { l: 'id', d: 'UUIDで検索', v: '1.21.9' },
  ],
  rotate: [
    { l: '@s', d: '実行者を回転' }, { l: '@e', d: 'エンティティを回転' },
    { l: '@p', d: '最寄りプレイヤーを回転' }, { l: '@a', d: '全プレイヤーを回転' },
  ],
  'rotate.facing': [
    { l: 'entity', d: 'エンティティに向ける', v: '1.21.2' },
  ],
  locate: [
    { l: 'structure', d: '構造物検索' }, { l: 'biome', d: 'バイオーム検索', v: '1.19' },
    { l: 'poi', d: 'POI検索', v: '1.19' },
  ],
  datapack: [
    { l: 'enable', d: 'データパック有効化' }, { l: 'disable', d: 'データパック無効化' },
    { l: 'list', d: 'データパック一覧' },
  ],
  stopwatch: [
    { l: 'create', d: 'ストップウォッチ作成', v: '1.21.11' }, { l: 'query', d: '値取得', v: '1.21.11' },
    { l: 'restart', d: '再スタート', v: '1.21.11' }, { l: 'remove', d: '削除', v: '1.21.11' },
  ],
  dialog: [
    { l: 'show', d: 'ダイアログ表示', v: '1.21.6' }, { l: 'clear', d: 'ダイアログ消去', v: '1.21.6' },
  ],
  place: [
    { l: 'feature', d: '地物配置', v: '1.19' }, { l: 'template', d: 'テンプレート配置', v: '1.19' },
    { l: 'jigsaw', d: 'ジグソー配置', v: '1.19' },
  ],
  damage: [
    { l: '@s', d: '実行者にダメージ' }, { l: '@e', d: 'エンティティにダメージ' },
    { l: '@p', d: '最寄りプレイヤーにダメージ' }, { l: '@a', d: '全プレイヤーにダメージ' },
  ],
  tick: [
    { l: 'rate', d: 'ティックレート設定', v: '1.20.3' }, { l: 'step', d: '1ティック進める', v: '1.20.3' },
    { l: 'freeze', d: 'ティック停止', v: '1.20.3' }, { l: 'unfreeze', d: 'ティック再開', v: '1.20.3' },
    { l: 'sprint', d: '高速実行', v: '1.20.3' }, { l: 'query', d: '現在のレート取得', v: '1.20.3' },
  ],
  random: [
    { l: 'value', d: '乱数値を取得', v: '1.20.2' }, { l: 'roll', d: '乱数をチャットに表示', v: '1.20.2' },
    { l: 'reset', d: '乱数シードリセット', v: '1.20.2' },
  ],
  attribute: [
    { l: '@s', d: '実行者' }, { l: '@p', d: '最寄りプレイヤー' },
    { l: '@e', d: 'エンティティ' }, { l: '@a', d: '全プレイヤー' },
  ],
  'attribute.action': [
    { l: 'get', d: '現在の属性値取得' }, { l: 'base', d: '基本値操作(set/get/reset)' },
    { l: 'modifier', d: '修飾子操作(add/remove/value get)' },
  ],
  experience: [
    { l: 'add', d: '経験値加算' }, { l: 'set', d: '経験値設定' }, { l: 'query', d: '経験値取得' },
  ],
  xp: [
    { l: 'add', d: '経験値加算' }, { l: 'set', d: '経験値設定' }, { l: 'query', d: '経験値取得' },
  ],
  worldborder: [
    { l: 'set', d: 'サイズ設定' }, { l: 'add', d: 'サイズ増減' },
    { l: 'center', d: '中心設定' }, { l: 'damage', d: 'ダメージ設定' },
    { l: 'get', d: '現在値取得' }, { l: 'warning', d: '警告設定' },
  ],
  'worldborder.damage': [
    { l: 'amount', d: 'ダメージ量' }, { l: 'buffer', d: 'バッファ距離' },
  ],
  'worldborder.warning': [
    { l: 'distance', d: '警告距離' }, { l: 'time', d: '警告時間' },
  ],
  forceload: [
    { l: 'add', d: 'チャンク追加' }, { l: 'remove', d: 'チャンク解除' },
    { l: 'query', d: '読込状況確認' },
  ],
  loot: [
    { l: 'give', d: 'プレイヤーに付与', v: '1.14' }, { l: 'insert', d: 'コンテナに挿入', v: '1.14' },
    { l: 'spawn', d: 'ワールドにスポーン', v: '1.14' }, { l: 'replace', d: 'スロット置換', v: '1.14' },
  ],
  recipe: [
    { l: 'give', d: 'レシピ解放' }, { l: 'take', d: 'レシピ剥奪' },
  ],
  stopsound: [
    { l: '@s', d: '実行者' }, { l: '@a', d: '全プレイヤー' }, { l: '@p', d: '最寄りプレイヤー' },
  ],
  fillbiome: [
    { l: '~', d: '相対座標', v: '1.19.3' }, { l: '^', d: 'ローカル座標', v: '1.19.3' },
  ],
  'return': [
    { l: 'run', d: '関数の戻り値をrun', v: '1.20.2' }, { l: 'fail', d: '失敗を返す', v: '1.20.2' },
  ],
  defaultgamemode: [
    { l: 'survival', d: 'サバイバル' }, { l: 'creative', d: 'クリエイティブ' },
    { l: 'adventure', d: 'アドベンチャー' }, { l: 'spectator', d: 'スペクテイター' },
  ],
  clone: [
    { l: '~', d: '相対座標' }, { l: '^', d: 'ローカル座標' },
  ],
  tag: [
    { l: '@s', d: '実行者のタグ' }, { l: '@a', d: '全プレイヤーのタグ' },
    { l: '@e', d: '全エンティティのタグ' }, { l: '@p', d: '最寄りプレイヤーのタグ' },
  ],
  'tag.action': [
    { l: 'add', d: 'タグ追加' }, { l: 'remove', d: 'タグ削除' }, { l: 'list', d: 'タグ一覧' },
  ],
  trigger: [
    { l: 'set', d: '値設定' }, { l: 'add', d: '値加算' },
  ],
  'scoreboard.objectives.setdisplay': [
    { l: 'sidebar', d: 'サイドバー' }, { l: 'list', d: 'タブリスト' },
    { l: 'belowName', d: '名前の下', rm: '1.20.2' },
    { l: 'below_name', d: '名前の下', v: '1.20.2' },
  ],
  'team.modify.color': [
    { l: 'red', d: '赤' }, { l: 'blue', d: '青' }, { l: 'green', d: '緑' },
    { l: 'yellow', d: '黄' }, { l: 'aqua', d: '水色' }, { l: 'white', d: '白' },
    { l: 'black', d: '黒' }, { l: 'dark_red', d: '暗い赤' }, { l: 'dark_blue', d: '暗い青' },
    { l: 'dark_green', d: '暗い緑' }, { l: 'dark_aqua', d: '暗い水色' },
    { l: 'dark_purple', d: '紫' }, { l: 'gold', d: '金' }, { l: 'gray', d: '灰' },
    { l: 'dark_gray', d: '暗い灰' }, { l: 'light_purple', d: '薄紫' },
    { l: 'reset', d: 'リセット' },
  ],
  'bossbar.set.color': [
    { l: 'blue', d: '青' }, { l: 'green', d: '緑' }, { l: 'pink', d: 'ピンク' },
    { l: 'purple', d: '紫' }, { l: 'red', d: '赤' }, { l: 'white', d: '白' },
    { l: 'yellow', d: '黄' },
  ],
  'bossbar.set.style': [
    { l: 'progress', d: 'プログレスバー' }, { l: 'notched_6', d: '6分割' },
    { l: 'notched_10', d: '10分割' }, { l: 'notched_12', d: '12分割' },
    { l: 'notched_20', d: '20分割' },
  ],
  'execute.if.score': [
    { l: '@s', d: '実行者スコア' }, { l: '@p', d: '最寄りプレイヤー' },
    { l: '#', d: 'フェイクプレイヤー (#名前)' },
  ],
  'execute.in': [
    { l: 'minecraft:overworld', d: 'オーバーワールド' },
    { l: 'minecraft:the_nether', d: 'ネザー' },
    { l: 'minecraft:the_end', d: 'ジ・エンド' },
  ],
  'execute.on': [
    { l: 'passengers', d: '乗客', v: '1.19.4' }, { l: 'vehicle', d: '乗り物', v: '1.19.4' },
    { l: 'origin', d: '発射元', v: '1.19.4' }, { l: 'owner', d: '飼い主', v: '1.19.4' },
    { l: 'leasher', d: 'リード繋ぎ先', v: '1.19.4' }, { l: 'target', d: '攻撃対象', v: '1.19.4' },
    { l: 'attacker', d: '攻撃者', v: '1.19.4' },
  ],
  'execute.positioned': [
    { l: 'as', d: 'エンティティの位置' }, { l: 'over', d: 'ハイトマップ上', v: '1.20.2' },
  ],
  'execute.positioned.over': [
    { l: 'world_surface', d: 'ワールド表面', v: '1.20.2' },
    { l: 'ocean_floor', d: '海底', v: '1.20.2' },
    { l: 'motion_blocking', d: '動作ブロック上', v: '1.20.2' },
    { l: 'motion_blocking_no_leaves', d: '動作ブロック(葉除く)', v: '1.20.2' },
  ],
  ride: [
    { l: '@s', d: '実行者' }, { l: '@e', d: 'エンティティ' },
    { l: '@p', d: '最寄りプレイヤー' }, { l: '@a', d: '全プレイヤー' },
  ],
  'ride.action': [
    { l: 'mount', d: '乗せる', v: '1.19.4' }, { l: 'dismount', d: '降ろす', v: '1.19.4' },
  ],
  'item.replace': [
    { l: 'entity', d: 'エンティティのスロット', v: '1.17' },
    { l: 'block', d: 'ブロックのスロット', v: '1.17' },
  ],
  'item.modify': [
    { l: 'entity', d: 'エンティティのアイテム変更', v: '1.17' },
    { l: 'block', d: 'ブロックのアイテム変更', v: '1.17' },
  ],
  'locate.structure': [
    { l: 'minecraft:village_plains', d: '平原の村' }, { l: 'minecraft:village_desert', d: '砂漠の村' },
    { l: 'minecraft:mansion', d: '森の洋館' }, { l: 'minecraft:monument', d: '海底神殿' },
    { l: 'minecraft:stronghold', d: '要塞' }, { l: 'minecraft:fortress', d: 'ネザー要塞' },
    { l: 'minecraft:bastion_remnant', d: '砦の遺跡' }, { l: 'minecraft:end_city', d: 'エンドシティ' },
    { l: 'minecraft:mineshaft', d: '廃坑' }, { l: 'minecraft:buried_treasure', d: '埋もれた宝' },
    { l: 'minecraft:shipwreck', d: '難破船' }, { l: 'minecraft:ruined_portal', d: '荒廃したポータル' },
    { l: 'minecraft:ancient_city', d: '古代都市', v: '1.19' },
    { l: 'minecraft:trail_ruins', d: 'トレイル遺跡', v: '1.20' },
    { l: 'minecraft:trial_chambers', d: 'トライアルチャンバー', v: '1.21' },
  ],
  'locate.biome': [
    { l: 'minecraft:plains', d: '平原' }, { l: 'minecraft:desert', d: '砂漠' },
    { l: 'minecraft:forest', d: '森林' }, { l: 'minecraft:taiga', d: 'タイガ' },
    { l: 'minecraft:swamp', d: '湿地' }, { l: 'minecraft:jungle', d: 'ジャングル' },
    { l: 'minecraft:snowy_plains', d: '雪原' }, { l: 'minecraft:dark_forest', d: '暗い森' },
    { l: 'minecraft:mushroom_fields', d: 'キノコ島' }, { l: 'minecraft:badlands', d: '荒野' },
    { l: 'minecraft:cherry_grove', d: 'サクラの林', v: '1.20' },
    { l: 'minecraft:deep_dark', d: 'ディープダーク', v: '1.19' },
    { l: 'minecraft:lush_caves', d: '繁茂した洞窟' },
    { l: 'minecraft:dripstone_caves', d: '鍾乳洞' },
    { l: 'minecraft:pale_garden', d: 'ペイルガーデン', v: '1.21.4' },
    { l: 'minecraft:nether_wastes', d: 'ネザー荒地' },
    { l: 'minecraft:soul_sand_valley', d: 'ソウルサンドの谷' },
    { l: 'minecraft:crimson_forest', d: '真紅の森' },
    { l: 'minecraft:warped_forest', d: '歪んだ森' },
    { l: 'minecraft:basalt_deltas', d: '玄武岩デルタ' },
  ],
  _attributes: [
    { l: 'generic.max_health', d: '最大HP' }, { l: 'generic.follow_range', d: '追跡範囲' },
    { l: 'generic.knockback_resistance', d: 'ノックバック耐性' },
    { l: 'generic.movement_speed', d: '移動速度' }, { l: 'generic.attack_damage', d: '攻撃力' },
    { l: 'generic.armor', d: '防御力' }, { l: 'generic.armor_toughness', d: '防御強度' },
    { l: 'generic.attack_knockback', d: '攻撃ノックバック' },
    { l: 'generic.attack_speed', d: '攻撃速度' }, { l: 'generic.luck', d: '幸運' },
    { l: 'generic.flying_speed', d: '飛行速度' },
    { l: 'generic.scale', d: 'スケール', v: '1.20.5' },
    { l: 'generic.step_height', d: '段差高さ', v: '1.20.5' },
    { l: 'generic.gravity', d: '重力', v: '1.20.5' },
    { l: 'generic.safe_fall_distance', d: '安全落下距離', v: '1.20.5' },
    { l: 'generic.fall_damage_multiplier', d: '落下ダメージ倍率', v: '1.20.5' },
    { l: 'generic.jump_strength', d: 'ジャンプ力', v: '1.20.5' },
    { l: 'generic.burning_time', d: '燃焼時間', v: '1.21' },
    { l: 'generic.explosion_knockback_resistance', d: '爆発ノックバック耐性', v: '1.21' },
    { l: 'generic.mining_efficiency', d: '採掘効率', v: '1.21' },
    { l: 'generic.movement_efficiency', d: '移動効率', v: '1.21' },
    { l: 'generic.oxygen_bonus', d: '酸素ボーナス', v: '1.21' },
    { l: 'generic.sneaking_speed', d: 'スニーク速度', v: '1.21' },
    { l: 'generic.submerged_mining_speed', d: '水中採掘速度', v: '1.21' },
    { l: 'generic.sweeping_damage_ratio', d: '範囲攻撃比率', v: '1.21' },
    { l: 'generic.water_movement_efficiency', d: '水中移動効率', v: '1.21' },
    { l: 'player.block_interaction_range', d: 'ブロック操作範囲', v: '1.20.5' },
    { l: 'player.entity_interaction_range', d: 'エンティティ操作範囲', v: '1.20.5' },
    { l: 'player.block_break_speed', d: 'ブロック破壊速度', v: '1.20.5' },
    { l: 'player.mining_efficiency', d: '採掘効率', v: '1.21' },
    { l: 'zombie.spawn_reinforcements', d: 'ゾンビ増援' },
    { l: 'horse.jump_strength', d: '馬ジャンプ力' },
  ],
  _selectors: [
    { l: '@a', d: '全プレイヤー' }, { l: '@p', d: '最寄りプレイヤー' },
    { l: '@r', d: 'ランダムプレイヤー' }, { l: '@s', d: '実行者' },
    { l: '@e', d: '全エンティティ' }, { l: '@n', d: '最寄りエンティティ', v: '1.21' },
  ],
  _selector_args: [
    { l: 'tag=', d: 'タグフィルター' }, { l: 'scores=', d: 'スコアフィルター' },
    { l: 'distance=', d: '距離フィルター' }, { l: 'type=', d: 'エンティティタイプ' },
    { l: 'name=', d: '名前フィルター' }, { l: 'limit=', d: '数量制限' },
    { l: 'sort=', d: 'ソート' }, { l: 'level=', d: 'レベルフィルター' },
    { l: 'gamemode=', d: 'ゲームモードフィルター' }, { l: 'nbt=', d: 'NBTフィルター' },
    { l: 'x=', d: 'X座標' }, { l: 'y=', d: 'Y座標' }, { l: 'z=', d: 'Z座標' },
    { l: 'dx=', d: 'X範囲' }, { l: 'dy=', d: 'Y範囲' }, { l: 'dz=', d: 'Z範囲' },
    { l: 'predicate=', d: '条件フィルター', v: '1.15' },
  ],
  _gamerules: [
    { l: 'doDaylightCycle', d: '昼夜サイクル' }, { l: 'doMobSpawning', d: 'モブスポーン' },
    { l: 'keepInventory', d: '死亡時インベントリ保持' }, { l: 'doWeatherCycle', d: '天候サイクル' },
    { l: 'commandBlockOutput', d: 'コマンドブロック出力' }, { l: 'sendCommandFeedback', d: 'コマンドフィードバック' },
    { l: 'doFireTick', d: '火の延焼' }, { l: 'mobGriefing', d: 'モブの破壊' },
    { l: 'naturalRegeneration', d: '自然回復' }, { l: 'pvp', d: 'PvP' },
    { l: 'showDeathMessages', d: '死亡メッセージ' },
    { l: 'doInsomnia', d: 'ファントム出現', v: '1.15' },
    { l: 'doImmediateRespawn', d: '即時リスポーン', v: '1.15' },
    { l: 'drowningDamage', d: '溺死ダメージ', v: '1.15' },
    { l: 'fallDamage', d: '落下ダメージ', v: '1.15' },
    { l: 'fireDamage', d: '火災ダメージ', v: '1.15' },
    { l: 'randomTickSpeed', d: 'ランダムティック速度' },
    { l: 'maxCommandChainLength', d: 'コマンドチェーン最大長' },
    { l: 'spawnRadius', d: 'スポーン半径' }, { l: 'doTileDrops', d: 'ブロックドロップ' },
    { l: 'doPatrolSpawning', d: 'パトロールスポーン', v: '1.14' },
    { l: 'doTraderSpawning', d: '行商人スポーン', v: '1.14' },
    { l: 'forgiveDeadPlayers', d: '死亡プレイヤー許し', v: '1.16' },
    { l: 'universalAnger', d: '集団敵対', v: '1.16' },
    { l: 'freezeDamage', d: '凍結ダメージ', v: '1.17' },
    { l: 'playersSleepingPercentage', d: '睡眠割合', v: '1.17' },
    { l: 'doWardenSpawning', d: 'ウォーデンスポーン', v: '1.19' },
    { l: 'commandModificationBlockLimit', d: 'ブロック変更制限', v: '1.19.4' },
    { l: 'doVinesSpread', d: 'ツタの伸長', v: '1.19.4' },
    { l: 'enderPearlsVanishOnDeath', d: 'エンダーパール消失', v: '1.20.2' },
    { l: 'maxCommandForkCount', d: 'コマンドフォーク上限', v: '1.20.2' },
    { l: 'spawnChunkRadius', d: 'スポーンチャンク半径', v: '1.20.5' },
    { l: 'fireSpreadRadiusAroundPlayer', d: '火の延焼距離', v: '1.21.11' },
  ],
  _dimensions: [
    { l: 'minecraft:overworld', d: 'オーバーワールド' },
    { l: 'minecraft:the_nether', d: 'ネザー' },
    { l: 'minecraft:the_end', d: 'ジ・エンド' },
  ],
  _structures: [
    { l: 'minecraft:village_plains', d: '平原の村' }, { l: 'minecraft:village_desert', d: '砂漠の村' },
    { l: 'minecraft:village_taiga', d: 'タイガの村' }, { l: 'minecraft:village_snowy', d: '雪の村' },
    { l: 'minecraft:village_savanna', d: 'サバンナの村' },
    { l: 'minecraft:mansion', d: '森の洋館' }, { l: 'minecraft:monument', d: '海底神殿' },
    { l: 'minecraft:stronghold', d: '要塞' }, { l: 'minecraft:fortress', d: 'ネザー要塞' },
    { l: 'minecraft:bastion_remnant', d: '砦の遺跡' },
    { l: 'minecraft:end_city', d: 'エンドシティ' }, { l: 'minecraft:mineshaft', d: '廃坑' },
    { l: 'minecraft:buried_treasure', d: '埋もれた宝' }, { l: 'minecraft:shipwreck', d: '難破船' },
    { l: 'minecraft:ocean_ruin_warm', d: '海底遺跡(暖)' }, { l: 'minecraft:ocean_ruin_cold', d: '海底遺跡(冷)' },
    { l: 'minecraft:ruined_portal', d: '荒廃したポータル' },
    { l: 'minecraft:ancient_city', d: '古代都市', v: '1.19' },
    { l: 'minecraft:trail_ruins', d: 'トレイル遺跡', v: '1.20' },
    { l: 'minecraft:trial_chambers', d: 'トライアルチャンバー', v: '1.21' },
  ],
  _time_presets: [
    { l: '1t', d: '1ティック (0.05秒)' }, { l: '20t', d: '1秒' }, { l: '1s', d: '1秒' },
    { l: '5s', d: '5秒' }, { l: '10s', d: '10秒' }, { l: '1d', d: '1日(ゲーム内)' },
  ],
  _items: [
    'stone','granite','diorite','andesite','deepslate','cobblestone','oak_planks','spruce_planks','birch_planks',
    'jungle_planks','acacia_planks','dark_oak_planks','cherry_planks','bamboo_planks','mangrove_planks',
    'crimson_planks','warped_planks','oak_log','spruce_log','birch_log','jungle_log','acacia_log','dark_oak_log',
    'cherry_log','mangrove_log','bamboo_block','glass','tinted_glass','sand','red_sand','gravel','coal_ore',
    'iron_ore','copper_ore','gold_ore','diamond_ore','emerald_ore','lapis_ore','redstone_ore','nether_gold_ore',
    'quartz_ore','ancient_debris','coal_block','iron_block','copper_block','gold_block','diamond_block',
    'emerald_block','lapis_block','redstone_block','netherite_block','amethyst_block','raw_iron_block',
    'raw_copper_block','raw_gold_block','dirt','grass_block','podzol','mycelium','farmland','clay',
    'bricks','stone_bricks','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks',
    'obsidian','crying_obsidian','bedrock','netherrack','end_stone','end_stone_bricks','purpur_block',
    'prismarine','dark_prismarine','sea_lantern','glowstone','shroomlight','torch','lantern','soul_lantern',
    'campfire','soul_campfire','chest','ender_chest','barrel','shulker_box','hopper','dropper','dispenser',
    'furnace','blast_furnace','smoker','crafting_table','smithing_table','cartography_table','fletching_table',
    'brewing_stand','enchanting_table','anvil','grindstone','stonecutter','loom','lectern','composter',
    'cauldron','bell','lodestone','respawn_anchor','beacon','conduit','lightning_rod',
    'note_block','jukebox','observer','piston','sticky_piston','slime_block','honey_block','tnt',
    'redstone','redstone_torch','repeater','comparator','lever','oak_button','stone_button',
    'oak_pressure_plate','stone_pressure_plate','heavy_weighted_pressure_plate','light_weighted_pressure_plate',
    'tripwire_hook','daylight_detector','target','sculk_sensor','calibrated_sculk_sensor',
    'oak_door','iron_door','oak_trapdoor','iron_trapdoor','oak_fence','oak_fence_gate',
    'ladder','scaffolding','rail','powered_rail','detector_rail','activator_rail',
    'oak_sign','spruce_sign','birch_sign','oak_hanging_sign','bamboo_hanging_sign',
    'white_bed','orange_bed','red_bed','blue_bed','green_bed','yellow_bed','black_bed',
    'painting','item_frame','glow_item_frame','armor_stand','flower_pot',
    'white_wool','orange_wool','red_wool','blue_wool','green_wool','yellow_wool','black_wool',
    'white_carpet','white_concrete','white_concrete_powder','white_terracotta','white_glazed_terracotta',
    'white_stained_glass','white_stained_glass_pane','white_banner','white_candle',
    'water_bucket','lava_bucket','milk_bucket','powder_snow_bucket','axolotl_bucket','tadpole_bucket',
    'bucket','wooden_sword','stone_sword','iron_sword','golden_sword','diamond_sword','netherite_sword',
    'wooden_pickaxe','stone_pickaxe','iron_pickaxe','golden_pickaxe','diamond_pickaxe','netherite_pickaxe',
    'wooden_axe','stone_axe','iron_axe','golden_axe','diamond_axe','netherite_axe',
    'wooden_shovel','stone_shovel','iron_shovel','golden_shovel','diamond_shovel','netherite_shovel',
    'wooden_hoe','stone_hoe','iron_hoe','golden_hoe','diamond_hoe','netherite_hoe',
    'bow','crossbow','trident','mace','shield','fishing_rod','shears','flint_and_steel',
    'leather_helmet','leather_chestplate','leather_leggings','leather_boots',
    'chainmail_helmet','chainmail_chestplate','chainmail_leggings','chainmail_boots',
    'iron_helmet','iron_chestplate','iron_leggings','iron_boots',
    'golden_helmet','golden_chestplate','golden_leggings','golden_boots',
    'diamond_helmet','diamond_chestplate','diamond_leggings','diamond_boots',
    'netherite_helmet','netherite_chestplate','netherite_leggings','netherite_boots',
    'turtle_helmet','elytra','totem_of_undying',
    'apple','golden_apple','enchanted_golden_apple','bread','steak','cooked_porkchop','cooked_chicken',
    'cooked_mutton','cooked_salmon','cooked_cod','baked_potato','pumpkin_pie','cake','cookie',
    'melon_slice','sweet_berries','glow_berries','dried_kelp','honey_bottle','chorus_fruit',
    'beef','porkchop','chicken','mutton','rabbit','salmon','cod','tropical_fish','potato','carrot',
    'beetroot','wheat','sugar_cane','bamboo','cactus','kelp','vine','lily_pad','cocoa_beans',
    'arrow','spectral_arrow','tipped_arrow','firework_rocket','firework_star',
    'potion','splash_potion','lingering_potion','experience_bottle',
    'ender_pearl','ender_eye','blaze_rod','blaze_powder','nether_star','ghast_tear','magma_cream',
    'slime_ball','bone','bone_meal','gunpowder','string','feather','leather','rabbit_hide',
    'phantom_membrane','ink_sac','glow_ink_sac','spider_eye','fermented_spider_eye',
    'coal','charcoal','raw_iron','raw_copper','raw_gold','iron_ingot','copper_ingot','gold_ingot',
    'diamond','emerald','lapis_lazuli','quartz','netherite_scrap','netherite_ingot','amethyst_shard',
    'redstone','glowstone_dust','prismarine_shard','prismarine_crystals',
    'stick','flint','paper','book','writable_book','written_book','knowledge_book',
    'compass','recovery_compass','clock','map','spyglass','name_tag','lead','saddle',
    'minecart','chest_minecart','hopper_minecart','tnt_minecart','furnace_minecart',
    'oak_boat','spruce_boat','birch_boat','oak_chest_boat',
    'white_dye','orange_dye','red_dye','blue_dye','green_dye','yellow_dye','black_dye',
    'light_blue_dye','magenta_dye','pink_dye','cyan_dye','purple_dye','brown_dye',
    'lime_dye','gray_dye','light_gray_dye',
    'music_disc_13','music_disc_cat','music_disc_blocks','music_disc_chirp','music_disc_far',
    'music_disc_mall','music_disc_mellohi','music_disc_stal','music_disc_strad','music_disc_ward',
    'music_disc_11','music_disc_wait','music_disc_otherside','music_disc_5','music_disc_pigstep','music_disc_relic',
    'goat_horn','brush','trial_key','ominous_trial_key','wind_charge','breeze_rod',
    'command_block','chain_command_block','repeating_command_block','structure_block','jigsaw','barrier',
    'light','spawner','trial_spawner','vault',
    'player_head','zombie_head','skeleton_skull','wither_skeleton_skull','creeper_head','piglin_head','dragon_head',
    'egg','snowball','fire_charge','heart_of_the_sea','nautilus_shell','conduit','shulker_shell',
    'dragon_breath','rabbit_foot','rabbit_stew','suspicious_stew','beetroot_soup','mushroom_stew',
    'pufferfish','tropical_fish','globe_banner_pattern','creeper_banner_pattern','skull_banner_pattern',
    'flower_banner_pattern','mojang_banner_pattern','piglin_banner_pattern',
    'wolf_armor','air',
  ],
  _entities: [
    'player','zombie','skeleton','creeper','spider','enderman','witch','pillager','vindicator',
    'evoker','ravager','phantom','drowned','husk','stray','wither_skeleton','blaze','ghast',
    'magma_cube','slime','silverfish','endermite','guardian','elder_guardian','shulker',
    'warden','wither','ender_dragon','piglin','piglin_brute','hoglin','zoglin','zombified_piglin',
    'breeze','bogged',
    'cow','pig','sheep','chicken','horse','donkey','mule','llama','wolf','cat','ocelot',
    'parrot','rabbit','fox','bee','goat','frog','tadpole','axolotl','camel','sniffer','armadillo',
    'turtle','dolphin','squid','glow_squid','panda','polar_bear','mooshroom',
    'villager','wandering_trader','iron_golem','snow_golem','allay',
    'bat','cod','salmon','tropical_fish','pufferfish','strider',
    'armor_stand','item_frame','glow_item_frame','painting','minecart','boat',
    'tnt','falling_block','area_effect_cloud','marker','interaction','display','text_display',
    'item_display','block_display','experience_orb','arrow','spectral_arrow','firework_rocket',
    'ender_pearl','eye_of_ender','fireball','small_fireball','wither_skull','wind_charge',
    'lightning_bolt','item','leash_knot','fishing_bobber',
  ],
  _effects: [
    'speed','slowness','haste','mining_fatigue','strength','instant_health','instant_damage',
    'jump_boost','nausea','regeneration','resistance','fire_resistance','water_breathing',
    'invisibility','blindness','night_vision','hunger','weakness','poison','wither',
    'health_boost','absorption','saturation','glowing','levitation','luck','unluck',
    'slow_falling','conduit_power','dolphins_grace','bad_omen','hero_of_the_village',
    'darkness','trial_omen','raid_omen','wind_charged','weaving','oozing','infested',
  ],
  _enchantments: [
    'sharpness','smite','bane_of_arthropods','knockback','fire_aspect','looting','sweeping_edge',
    'efficiency','silk_touch','fortune','unbreaking','mending','vanishing_curse','binding_curse',
    'power','punch','flame','infinity','protection','fire_protection','blast_protection',
    'projectile_protection','feather_falling','respiration','aqua_affinity','thorns',
    'depth_strider','frost_walker','soul_speed','swift_sneak','luck_of_the_sea','lure',
    'riptide','loyalty','channeling','impaling','multishot','piercing','quick_charge',
    'density','breach','wind_burst',
  ],
  _particles: [
    'flame','soul_fire_flame','smoke','large_smoke','cloud','explosion','explosion_emitter',
    'heart','angry_villager','happy_villager','crit','enchanted_hit',
    'portal','enchant','witch','note','dust','totem_of_undying','campfire_cosy_smoke',
    'dripping_water','dripping_lava','end_rod','snowflake','cherry_leaves','trial_spawner_detection',
    'gust','small_gust','gust_emitter_large','gust_emitter_small','infested','item_cobweb',
    'raid_omen','trial_omen','ominous_spawning','vault_connection',
  ],
  _sounds_common: [
    'entity.experience_orb.pickup','entity.player.levelup','entity.ender_dragon.growl',
    'entity.wither.spawn','entity.lightning_bolt.thunder','block.note_block.pling',
    'block.note_block.bell','block.note_block.chime','block.note_block.harp',
    'block.anvil.use','block.chest.open','block.chest.close','block.beacon.activate',
    'entity.firework_rocket.launch','entity.firework_rocket.blast','entity.generic.explode',
    'item.totem.use','item.trident.thunder','ui.button.click','ui.toast.challenge_complete',
    'entity.villager.celebrate','entity.player.attack.sweep','entity.player.attack.strong',
    'entity.arrow.shoot','entity.arrow.hit_player','entity.blaze.shoot',
    'entity.ghast.shoot','entity.ghast.scream','entity.wolf.howl',
    'music.game','music.creative','music.end','music.dragon','music.nether.basalt_deltas',
  ],
};

// ════════════════════════════════════════════════════════════
// AI CONSTANTS
// ════════════════════════════════════════════════════════════

const AI_GEMINI_KEY = 'mc-datapack-ai-gemini-key';
const AI_OPENAI_KEY = 'mc-datapack-ai-openai-key';
const AI_ANTHROPIC_KEY = 'mc-datapack-ai-anthropic-key';
const AI_MODEL_KEY = 'mc-datapack-ai-model';

const AI_MODELS = [
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'gemini', apiModel: 'gemini-3-flash-preview', thinking: null, desc: '高速・無料' },
  { id: 'gemini-3-flash-thinking', label: 'Gemini 3 Flash Thinking', provider: 'gemini', apiModel: 'gemini-3-flash-preview', thinking: 'high', desc: '深い推論' },
  { id: 'gemini-3-pro', label: 'Gemini 3 Pro', provider: 'gemini', apiModel: 'gemini-3-pro-preview', thinking: null, desc: '高性能' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', apiModel: 'claude-sonnet-4-5-20250929', thinking: null, desc: '高性能バランス' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', apiModel: 'claude-haiku-4-5-20251001', thinking: null, desc: '高速・低コスト' },
  { id: 'gpt-5.3-codex', label: 'GPT 5.3 Codex', provider: 'openai', apiModel: 'gpt-5.3-codex', thinking: null, desc: 'デスクトップ版で対応予定（CORS制限）', comingSoon: true },
];

const AI_PROVIDERS = {
  gemini: { name: 'Google Gemini', storageKey: AI_GEMINI_KEY, link: 'https://aistudio.google.com/apikey', linkLabel: 'Google AI Studio' },
  anthropic: { name: 'Anthropic Claude', storageKey: AI_ANTHROPIC_KEY, link: 'https://console.anthropic.com/settings/keys', linkLabel: 'Anthropic Console' },
  openai: { name: 'OpenAI', storageKey: AI_OPENAI_KEY, link: 'https://platform.openai.com/api-keys', linkLabel: 'OpenAI Platform' },
};

const AI_SYSTEM_PROMPT = (namespace, targetVersion) => {
  // バージョン比較ヘルパー
  const v = (ver) => {
    const p = ver.split('.').map(Number);
    return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0);
  };
  const tv = v(targetVersion);
  const gte = (ver) => tv >= v(ver);
  const lt = (ver) => tv < v(ver);

  // pack_format (1.21.9+はセマンティックバージョニング: [major, minor])
  let packFormat = 10;
  let packFormatMinor = 0;
  if (gte('1.21.11')) { packFormat = 94; packFormatMinor = 1; }
  else if (gte('1.21.9')) packFormat = 88;
  else if (gte('1.21.7')) packFormat = 81;
  else if (gte('1.21.6')) packFormat = 80;
  else if (gte('1.21.5')) packFormat = 71;
  else if (gte('1.21.4')) packFormat = 61;
  else if (gte('1.21.2')) packFormat = 57;
  else if (gte('1.21')) packFormat = 48;
  else if (gte('1.20.5')) packFormat = 41;
  else if (gte('1.20.2')) packFormat = 18;
  else if (gte('1.20')) packFormat = 15;
  else if (gte('1.19.4')) packFormat = 12;
  else if (gte('1.19')) packFormat = 10;
  else if (gte('1.18.2')) packFormat = 9;
  else if (gte('1.18')) packFormat = 8;
  else if (gte('1.17')) packFormat = 7;
  else if (gte('1.16.2')) packFormat = 6;
  else if (gte('1.15')) packFormat = 5;
  else if (gte('1.13')) packFormat = 4;

  // フォルダ名
  const useSingular = gte('1.21');
  const funcFolder = useSingular ? 'function' : 'functions';
  const recipeFolder = useSingular ? 'recipe' : 'recipes';
  const advFolder = useSingular ? 'advancement' : 'advancements';
  const lootFolder = useSingular ? 'loot_table' : 'loot_tables';
  const predFolder = useSingular ? 'predicate' : 'predicates';
  const tagFuncFolder = useSingular ? 'function' : 'functions';
  const tagBlockFolder = useSingular ? 'block' : 'blocks';
  const tagItemFolder = useSingular ? 'item' : 'items';

  // 機能フラグ
  const hasPredicates = gte('1.15');
  const hasItemModifiers = gte('1.17');
  const hasComponents = gte('1.20.5');
  const hasFunctionMacros = gte('1.20.2');
  const hasReturnCmd = gte('1.20.2');
  const hasRandomCmd = gte('1.20.2');
  const hasSimplifiedIngredients = gte('1.21.2');
  const hasSNBTText = gte('1.21.5');
  const hasDamageType = gte('1.19.4');
  const hasEnchantmentRegistry = gte('1.21');
  const hasExecuteOn = gte('1.19.4');
  const hasItemCmd = gte('1.17');
  const hasTickCmd = gte('1.21');
  const hasDisplayName = gte('1.20.2');
  const hasRotateCmd = gte('1.21.2');
  const hasDamageCmd = gte('1.19.4');
  const hasPlaceCmd = gte('1.19.3');
  const hasTestCmd = gte('1.21.5');
  const hasStopwatchCmd = gte('1.21.11');
  const hasDialogCmd = gte('1.21.10');
  const hasPaleGarden = gte('1.21.4');
  const hasSpringToLife = gte('1.21.5');
  const hasSpear = gte('1.21.11');
  const hasNautilus = gte('1.21.11');
  const hasTimeline = gte('1.21.11');
  const hasEnvAttribute = gte('1.21.11');
  const hasExecuteFunction = gte('1.20.2');
  const hasPositionedOver = gte('1.20.2');

  // レシピ形式
  const recipeResultNote = hasComponents
    ? '"result": { "id": "minecraft:...", "count": 1 }  ※1.20.5+形式'
    : '"result": { "item": "minecraft:...", "count": 1 }  ※~1.20.4形式';
  const ingredientNote = hasSimplifiedIngredients
    ? '材料は文字列形式: "minecraft:stone"、タグは "#minecraft:planks"'
    : '材料はオブジェクト形式: { "item": "minecraft:stone" }、タグは { "tag": "minecraft:planks" }';

  // コマンド構文
  let commandNotes = `
- /execute は 1.13+ 形式のみ: execute as @e at @s run <command>
- 数値ID・データ値は使用禁止。名前空間付き文字列ID（minecraft:stone）を使用
- ブロック状態: minecraft:oak_log[axis=x] 形式`;

  if (hasComponents) {
    commandNotes += `
- アイテム: コンポーネント形式[...]を使用（NBT{...}は禁止）
  give @s minecraft:diamond_sword[damage=5,enchantments={levels:{"minecraft:sharpness":5}}]
  主要コンポーネント: custom_name, item_name, lore, enchantments, stored_enchantments, damage, max_damage, unbreakable, custom_data, item_model, custom_model_data, attribute_modifiers, potion_contents, food, tool, rarity, enchantment_glint_override, max_stack_size, repair_cost, repairable, can_break, can_place_on, dyed_color, trim, fireworks, firework_explosion, lodestone_tracker, map_id, map_color, profile, banner_patterns, container, bucket_entity_data, block_entity_data, block_state, entity_data, instrument, jukebox_playable, recipes, writable_book_content, written_book_content, charged_projectiles, bundle_contents, debug_stick_state, intangible_projectile, use_cooldown, use_remainder, tooltip_display, tooltip_style, lock, pot_decorations, note_block_sound, base_color, suspicious_stew_effects, ominous_bottle_amplifier, enchantable${hasSimplifiedIngredients ? `, consumable, equippable, glider, damage_resistant, death_protection, blocks_attacks, break_sound, provides_trim_material, provides_banner_patterns
  consumable={consume_seconds:1.6,animation:"eat",on_consume_effects:[...]}
  equippable={slot:"head",equip_sound:"...",asset_id:"...",swappable:true}
  glider={}  ※エリトラのように滑空可能
  damage_resistant={types:"#minecraft:is_fire"}
  death_protection={death_effects:[...]}  ※不死のトーテム効果
  blocks_attacks={block_delay_seconds:0.25,damage_reductions:[...]}  ※盾ブロック` : ''}${hasNautilus ? `
  1.21.11新規: attack_range={min_reach,max_reach,hitbox_margin,mob_factor}, damage_type="minecraft:spear", kinetic_weapon={delay_ticks,damage_multiplier,forward_movement,sound,...}, piercing_weapon={deals_knockback,dismounts,sound,...}, minimum_attack_charge=0.0-1.0, swing_animation={type:"stab"|"whack"|"none",duration:ticks}, use_effects={can_sprint,speed_multiplier}` : ''}`;
  } else {
    commandNotes += `
- アイテムNBT: give @s minecraft:diamond_sword{Damage:5,Enchantments:[{id:"minecraft:sharpness",lvl:5}]}`;
  }

  if (hasSNBTText) {
    commandNotes += `
- テキスト: インラインSNBT形式 custom_name={text:'名前',color:'gold'}`;
  } else {
    commandNotes += `
- テキスト: JSON文字列形式 custom_name='{"text":"名前","color":"gold"}'`;
  }

  if (hasFunctionMacros) {
    commandNotes += `
- 関数マクロ: $行で$(変数)展開
  $say $(message)
  呼び出し: function ${namespace}:func {message:"hello"}
  ストレージから: function ${namespace}:func with storage ${namespace}:data
  エンティティから: function ${namespace}:func with entity @s
  ブロックから: function ${namespace}:func with block ~ ~ ~`;
  }
  if (hasReturnCmd) commandNotes += `
- /return <値> で関数から整数値を返却
  /return run <コマンド> でコマンド結果を返却
  /return fail で失敗として終了`;
  if (hasItemCmd) commandNotes += `\n- /item コマンドでアイテム操作（/replaceitemの後継）`;
  if (hasTickCmd) commandNotes += `\n- /tick freeze|unfreeze|rate <tps>|step <time>|sprint <time>|query`;
  if (hasRandomCmd) commandNotes += `\n- /random value <min>..<max> でランダム整数生成`;
  if (hasDamageCmd) commandNotes += `\n- /damage <target> <amount> [<damageType>] [at <pos>] [by <entity>] [from <entity>]`;
  if (hasPlaceCmd) commandNotes += `\n- /place feature <feature> [<pos>] | template <template> [<pos>] | jigsaw <pool> <element> <depth> [<pos>]`;
  if (hasRotateCmd) commandNotes += `\n- /rotate <target> <yaw> <pitch>  ※エンティティの向き変更`;
  if (hasTestCmd) commandNotes += `\n- /test run <tests> [回数] [失敗まで] [回転] [行数] | runthese | runclosest | runfailed | clearall | create <id> [w] [h d] | locate | export | stop | verify`;
  if (hasStopwatchCmd) commandNotes += `\n- /stopwatch create <id> | query <id> [<scale>] | restart <id> | remove <id>  ※ゲームティック非依存のリアルタイム計測`;
  if (hasDialogCmd) commandNotes += `\n- /dialog show <targets> <dialog> | clear <targets>  ※ダイアログUI表示
  タイプ: notice(情報+OK), confirmation(Yes/No), multi_action(ボタンリスト), dialog_list(サブダイアログ)
  定義: data/${namespace}/dialog/<id>.json  アクション: run_command, open_url, custom_click`;

  // データパック構造
  let structureNote = `data/
  minecraft/
    tags/${tagFuncFolder}/
      load.json  → { "values": ["${namespace}:load"] }
      tick.json  → { "values": ["${namespace}:tick"] }
  ${namespace}/
    ${funcFolder}/       → .mcfunction ファイル
    ${recipeFolder}/      → レシピJSON
    ${advFolder}/ → 進捗JSON
    ${lootFolder}/  → ルートテーブルJSON
    tags/${tagBlockFolder}/  → ブロックタグ
    tags/${tagItemFolder}/   → アイテムタグ
    tags/${tagFuncFolder}/   → 関数タグ`;
  if (hasPredicates) structureNote += `\n    ${predFolder}/   → 条件JSON`;
  if (hasItemModifiers) structureNote += `\n    ${useSingular ? 'item_modifier' : 'item_modifiers'}/  → アイテム修飾子`;
  if (hasDamageType) structureNote += `\n    damage_type/  → ダメージタイプ`;
  if (hasEnchantmentRegistry) structureNote += `\n    enchantment/  → エンチャント定義`;
  if (hasDialogCmd) structureNote += `\n    dialog/  → ダイアログUI定義（1.21.10+）`;
  if (hasEnvAttribute) structureNote += `\n    environment_attribute/  → 環境属性（1.21.11+）`;
  if (hasTimeline) structureNote += `\n    timeline/  → タイムライン定義（1.21.11+）`;
  if (hasTestCmd) structureNote += `\n    test_instance/  → テストインスタンス（1.21.5+）\n    test_environment/  → テスト環境（1.21.5+）`;

  // バージョン別変更タイムライン
  let versionTimeline = `
【バージョン別・破壊的変更タイムライン】※対象は ${targetVersion} のみ生成
`;
  if (lt('1.14')) {
    versionTimeline += `- 1.13 "The Flattening": 数値ID→文字列ID完全移行、/execute新構文、名前空間必須化
`;
  }
  if (gte('1.14') && lt('1.15')) {
    versionTimeline += `- 1.13: 数値ID廃止→文字列ID、/execute新構文
- 1.14: Predicate条件なし（1.15で導入）、村人刷新、略奪者追加
`;
  }
  if (gte('1.15')) {
    versionTimeline += `- 1.13: The Flattening（数値ID→文字列ID）
- 1.14: 村人取引刷新、略奪者追加
- 1.15: predicate（条件JSON）導入、ミツバチ追加
`;
  }
  if (gte('1.16')) {
    versionTimeline += `- 1.16: ネザーアップデート、ネザライト、UUID配列形式[I;a,b,c,d]、Piglin追加
`;
  }
  if (gte('1.17')) {
    versionTimeline += `- 1.17: /item コマンド導入（/replaceitem廃止）、item_modifier追加、銅・アメジスト
`;
  }
  if (gte('1.19')) {
    versionTimeline += `- 1.19: chat_type、ウォーデン、アレイ、execute on/summon（1.19.4）、damage_type（1.19.4）
`;
  }
  if (gte('1.20')) {
    versionTimeline += `- 1.20: マクロ $() 構文（1.20.2）、/return コマンド（1.20.2）、/random（1.20.2）
`;
  }
  if (gte('1.20.5')) {
    versionTimeline += `- 1.20.5: ★最大の破壊的変更★ NBT→コンポーネント完全移行
  アイテム: {Damage:5} → [damage=5]、CustomModelData→custom_model_data
  give/clear/replaceitemの構文が全て変更。NBT形式は使用不可
`;
  }
  if (gte('1.21')) {
    versionTimeline += `- 1.21: フォルダ名単数形化、エンチャントレジストリ、/tick、Trial Chamber
`;
  }
  if (gte('1.21.2')) {
    versionTimeline += `- 1.21.2: レシピ材料簡略化（オブジェクト→文字列）、/rotate
`;
  }
  if (gte('1.21.5')) {
    versionTimeline += `- 1.21.5: SNBT形式テキスト、/test コマンド、動物バリアント（cold_pig等）
`;
  }
  if (gte('1.21.10')) {
    versionTimeline += `- 1.21.10: /dialog コマンド（NPC UI）、ダイアログシステム
`;
  }
  if (gte('1.21.11')) {
    versionTimeline += `- 1.21.11: /stopwatch、環境属性、タイムライン、槍（Spear）、ノーチラス、pack_format=[94,1]
`;
  }

  return `あなたはMinecraft Java Edition データパック専門のAIアシスタントです。
ユーザーの指示に従い、正確なデータパックファイルを生成してください。
初心者にも分かりやすく、高度なミニゲームやシステムも構築できます。
バイブコーディング形式: ユーザーが自然言語で「こんなの作って」と言えば、完動するデータパックを丸ごと生成します。

【対象: Minecraft ${targetVersion} / pack_format: ${packFormat}】
名前空間: ${namespace}
${versionTimeline}
【pack.mcmeta（必須）】
\`\`\`json:pack.mcmeta
${gte('1.21.9') ? `{"pack":{"pack_format":${packFormat},"description":"${namespace} datapack","supported_formats":{"min_inclusive":[${packFormat},${packFormatMinor}],"max_inclusive":[${packFormat},${packFormatMinor}]}}}` : `{"pack":{"pack_format":${packFormat},"description":"${namespace} datapack"}}`}
\`\`\`

【ファイル出力形式 ※必須】
ファイルを生成する場合、必ず以下のコードブロック形式で出力:
\`\`\`mcfunction:data/${namespace}/${funcFolder}/example.mcfunction
# コマンド
say Hello!
\`\`\`
\`\`\`json:data/${namespace}/${recipeFolder}/example.json
{"type":"minecraft:crafting_shaped"}
\`\`\`
形式: \`\`\`言語:ファイルパス （言語は mcfunction または json）

【レシピ形式（${targetVersion}）】
- ${recipeResultNote}
- ${ingredientNote}
- タイプ: crafting_shaped, crafting_shapeless, smelting${gte('1.14') ? ', blasting, smoking, campfire_cooking, stonecutting' : ''}${gte('1.20') ? ', smithing_transform, smithing_trim' : ''}${hasSimplifiedIngredients ? ', crafting_transmute' : ''}

【コマンド構文（${targetVersion}）】${commandNotes}

【データパック構造（${targetVersion}）】
${useSingular ? '※1.21+: フォルダ名は単数形' : '※~1.20: フォルダ名は複数形'}
${structureNote}

【execute構文（${targetVersion}全サブコマンド）】
execute as <ターゲット> at @s run <コマンド>
execute at <ターゲット> run <コマンド>
execute positioned <x> <y> <z> run <コマンド>
execute positioned as <ターゲット> run <コマンド>
execute rotated <y> <x> run <コマンド>
execute rotated as <ターゲット> run <コマンド>
execute facing <x> <y> <z> run <コマンド>
execute facing entity <ターゲット> <feet|eyes> run <コマンド>
execute align <axes: xyz> run <コマンド>
execute anchored <feet|eyes> run <コマンド>
execute in <dimension> run <コマンド>
execute if/unless score <ターゲット> <目的> matches <範囲> run <コマンド>
execute if/unless score <t1> <o1> <op> <t2> <o2> run <コマンド>  (op: <, <=, =, >=, >)
execute if/unless entity <セレクタ> run <コマンド>
execute if/unless block <座標> <ブロック> run <コマンド>
execute if/unless blocks <begin> <end> <dest> <all|masked> run <コマンド>
execute if/unless data entity/block/storage <source> <path> run <コマンド>
execute store result/success score <ターゲット> <目的> run <コマンド>
execute store result/success entity <ターゲット> <path> <type> <scale> run <コマンド>
execute store result/success bossbar <id> <value|max> run <コマンド>
execute store result/success storage <namespace> <path> <type> <scale> run <コマンド>
${hasPredicates ? 'execute if/unless predicate <名前空間:パス> run <コマンド>' : ''}
${hasExecuteOn ? `execute on <relation> run <コマンド>  (relation: passengers, vehicle, owner, leasher, controller, origin, attacker, target)
execute summon <entity_type> run <コマンド>` : ''}
${gte('1.19.4') ? 'execute if/unless biome <pos> <biome> run <コマンド>' : ''}
${gte('1.19.4') ? 'execute if/unless dimension <dimension> run <コマンド>' : ''}
${gte('1.20') ? 'execute if/unless loaded <pos> run <コマンド>' : ''}
${hasComponents ? 'execute if/unless items entity/block <source> <slots> <predicate> run <コマンド>' : ''}
${hasExecuteFunction ? 'execute if/unless function <namespace:function> run <コマンド>  ※関数戻り値で条件分岐' : ''}
${hasPositionedOver ? 'execute positioned over <heightmap> run <コマンド>  (heightmap: world_surface, motion_blocking, motion_blocking_no_leaves, ocean_floor)' : ''}

【スコアボード操作】
scoreboard objectives add <名前> <基準> [表示名]
基準: dummy, trigger, deathCount, playerKillCount, totalKillCount, health, xp, level, food, armor
  minecraft.custom:minecraft.<stat> (play_time, jump, sneak_time等)
  minecraft.mined/crafted/used/broken/picked_up:minecraft:<id>
  minecraft.killed/killed_by:minecraft:<entity>
scoreboard players set/add/remove <ターゲット> <目的> <値>
scoreboard players reset/get <ターゲット> <目的>
scoreboard players operation <t1> <o1> <op> <t2> <o2>  (op: +=, -=, *=, /=, %=, =, <, >, ><)
scoreboard objectives setdisplay sidebar/list/below_name <目的>
scoreboard objectives modify <目的> displayname <JSON>
${hasDisplayName ? 'scoreboard players display name <ターゲット> <目的> <JSON>  ※表示名変更' : ''}
${hasDisplayName ? 'scoreboard objectives modify <目的> numberformat blank/styled/fixed  ※数値表示形式' : ''}

【bossbar操作】
bossbar add <id> <name>
bossbar set <id> name/color/style/value/max/visible/players <値>
bossbar remove <id>
color: blue, green, pink, purple, red, white, yellow
style: progress, notched_6, notched_10, notched_12, notched_20
execute store result bossbar <id> value run <コマンド>  ※タイマー連動

【チーム操作】
team add <名前> [表示名]
team modify <名前> color <色>
team modify <名前> friendlyFire <true|false>
team modify <名前> seeFriendlyInvisibles <true|false>
team modify <名前> nametagVisibility <always|hideForOwnTeam|hideForOtherTeams|never>
team modify <名前> collisionRule <always|pushOtherTeams|pushOwnTeam|never>
team join <名前> <ターゲット>
team leave <ターゲット>

【data storage操作】
data modify storage ${namespace}:<key> <path> set value <SNBTデータ>
data modify storage ${namespace}:<key> <path> set from entity/block/storage <source> <path>
data get storage ${namespace}:<key> <path>
data remove storage ${namespace}:<key> <path>
execute store result storage ${namespace}:<key> <path> int 1 run <コマンド>
※関数マクロと組み合わせ: function ${namespace}:func with storage ${namespace}:<key>

【進捗（advancement）形式】
- icon: ${hasComponents ? '{ "id": "minecraft:..." }' : '{ "item": "minecraft:..." }'}
- items条件: ${hasComponents ? '{ "items": "minecraft:diamond" }' : '{ "items": [{ "items": ["minecraft:diamond"] }] }'}
- トリガー全種: inventory_changed, player_killed_entity, entity_killed_player, player_hurt_entity, entity_hurt_player, enter_block, placed_block, item_used_on_block, consume_item, changed_dimension, player_interacted_with_entity, tick, recipe_unlocked, recipe_crafted, summoned_entity, bred_animals, levitation, fall_from_height, using_item, enchanted_item, effects_changed, slept_in_bed, hero_of_the_village, villager_trade, brewed_potion, filled_bucket, fishing_rod_hooked, channeled_lightning, construct_beacon, cured_zombie_villager, tame_animal, shot_crossbow, killed_by_arrow, nether_travel, used_totem, used_ender_eye, item_durability_changed, location, started_riding, ride_entity_in_lava, slide_down_block, bee_nest_destroyed, target_hit, any_block_use, default_block_use, allay_drop_item_on_block, avoid_vibration, kill_mob_near_sculk_catalyst, thrown_item_picked_up_by_entity, thrown_item_picked_up_by_player, player_generates_container_loot, player_sheared_equipment, impossible${gte('1.21') ? ', crafter_recipe_crafted, fall_after_explosion' : ''}${hasNautilus ? ', spear_mobs' : ''}, voluntary_exile, lightning_strike
- rewards: function, experience, loot, recipes
- フレーム: task(通常), challenge(金枠), goal(丸枠)

${hasPredicates ? `【predicate（条件）全19タイプ】
entity_properties (エンティティ状態・装備・スロット), entity_scores (スコアボード値), block_state_property (ブロック状態), match_tool (ツール判定), damage_source_properties (ダメージ源), location_check (位置/バイオーム/構造物), weather_check (天候: raining, thundering), time_check (時刻: value, period), random_chance (確率: chance), random_chance_with_enchanted_bonus (エンチャントレベル確率), all_of (全条件AND), any_of (いずれかOR), inverted (否定NOT), value_check (数値比較), survives_explosion (爆発生存確率), reference (外部predicate参照), table_bonus (エンチャントパワー確率テーブル), killed_by_player (プレイヤーキル判定), enchantment_active_check (エンチャント有効判定)` : ''}
${hasEnchantmentRegistry ? `
【エンチャントレジストリ（1.21+）】
data/${namespace}/enchantment/<名前>.json で独自エンチャント定義可能
構造: { description, supported_items, weight, max_level, min_cost, max_cost, anvil_cost, slots, effects }` : ''}
${hasItemModifiers ? `
【item_modifier（アイテム修飾子）関数タイプ】
基本: set_count (個数), set_damage (耐久値), set_name (名前), set_lore (説明文)
エンチャント: set_enchantments (直接設定), enchant_randomly (ランダム), enchant_with_levels (レベル指定)
属性: set_attributes (攻撃力/速度等), ${hasComponents ? 'set_components (全コンポーネント), copy_components (コピー), set_custom_data (カスタムデータ), copy_custom_data' : 'set_nbt, copy_nbt'}
コンテナ: set_contents (中身), set_loot_table (ルートテーブル紐付)
特殊: set_potion (ポーション), set_stew_effect (シチュー効果), set_banner_pattern (旗模様), fill_player_head (プレイヤー頭), set_instrument (楽器)
本: set_book_cover, set_writable_book_pages, set_written_book_pages
花火: set_fireworks, set_firework_explosion
計算: apply_bonus (幸運ボーナス), looting_enchant (ドロップ増加), limit_count (個数制限), explosion_decay (爆発減衰)
コピー: copy_name (名前コピー)
制御: sequence (順次実行), reference (別ファイル参照), filtered (条件付き適用)
${hasComponents ? 'set_item (ID変更), toggle_tooltips (ツールチップ切替), modify_contents (中身修飾), set_ominous_bottle_amplifier, set_custom_model_data (モデルデータ), set_random_dyes (ランダム染料), set_random_potion (ランダムポーション)' : ''}
${hasNautilus ? 'discard (アイテム破棄 ※1.21.11新規)' : ''}` : ''}

【武器・ツール一覧】
剣: wooden_sword, stone_sword, iron_sword, golden_sword, diamond_sword${gte('1.16') ? ', netherite_sword' : ''}
斧: wooden_axe, stone_axe, iron_axe, golden_axe, diamond_axe${gte('1.16') ? ', netherite_axe' : ''}
ツルハシ: wooden_pickaxe, stone_pickaxe, iron_pickaxe, golden_pickaxe, diamond_pickaxe${gte('1.16') ? ', netherite_pickaxe' : ''}
シャベル: wooden_shovel, stone_shovel, iron_shovel, golden_shovel, diamond_shovel${gte('1.16') ? ', netherite_shovel' : ''}
クワ: wooden_hoe, stone_hoe, iron_hoe, golden_hoe, diamond_hoe${gte('1.16') ? ', netherite_hoe' : ''}
遠距離: bow, crossbow, trident${gte('1.21') ? ', mace, wind_charge' : ''}
${hasSpear ? '槍: wooden_spear, stone_spear, copper_spear, iron_spear, golden_spear, diamond_spear, netherite_spear  ※突き・チャージ攻撃' : ''}
その他: fishing_rod, shears, flint_and_steel, carrot_on_a_stick${gte('1.16') ? ', warped_fungus_on_a_stick' : ''}${gte('1.19') ? ', brush' : ''}${gte('1.21') ? ', breeze_rod, trial_key, ominous_trial_key, ominous_bottle' : ''}

【防具一覧】
素材: leather, chainmail, iron, golden, diamond${gte('1.16') ? ', netherite' : ''}
部位: helmet, chestplate, leggings, boots  形式: minecraft:{素材}_{部位}
その他: shield, turtle_helmet, carved_pumpkin, elytra${gte('1.21') ? ', wolf_armor' : ''}
${gte('1.20') ? `トリムパターン: coast, dune, eye, host, raiser, rib, sentry, shaper, silence, snout, spire, tide, vex, ward, wayfinder, wild${gte('1.21') ? ', bolt, flow' : ''}
トリム素材: amethyst, copper, diamond, emerald, gold, iron, lapis, netherite, quartz, redstone${gte('1.21') ? ', resin_brick' : ''}` : ''}

【エンチャント一覧（最大レベル）】
剣: sharpness(5), smite(5), bane_of_arthropods(5), knockback(2), fire_aspect(2), looting(3), sweeping_edge(3)${gte('1.21') ? ', breach(4), density(5)' : ''}
弓: power(5), punch(2), flame(1), infinity(1)
クロスボウ: quick_charge(3), multishot(1), piercing(4)
${gte('1.21') ? 'メイス: wind_burst(3), breach(4), density(5)' : ''}
${hasSpear ? '槍: lunge(3)  ※突き攻撃時に水平推進' : ''}
ツルハシ/斧: efficiency(5), fortune(3), silk_touch(1)
防具共通: protection(4), fire_protection(4), blast_protection(4), projectile_protection(4), thorns(3), unbreaking(3), mending(1)
ヘルメット: respiration(3), aqua_affinity(1)
ブーツ: feather_falling(4), depth_strider(3), frost_walker(2), soul_speed(3)${gte('1.19') ? ', swift_sneak(3)' : ''}
トライデント: loyalty(3), riptide(3), channeling(1), impaling(5)
釣竿: luck_of_the_sea(3), lure(3)

【エンティティ一覧】
敵対: zombie, skeleton, creeper, spider, cave_spider, enderman, witch, slime, magma_cube, phantom, blaze, ghast, wither_skeleton, guardian, elder_guardian, endermite, silverfish, vex, vindicator, evoker, shulker, drowned, husk, stray${gte('1.14') ? ', pillager, ravager' : ''}${gte('1.16') ? ', hoglin, piglin, piglin_brute, zoglin' : ''}${gte('1.19') ? ', warden' : ''}${gte('1.21') ? ', breeze, bogged' : ''}${hasPaleGarden ? ', creaking' : ''}${hasNautilus ? ', zombie_nautilus, camel_husk, parched' : ''}
友好: pig, cow, sheep, chicken, horse, donkey, mule, rabbit, ocelot, wolf, cat, parrot, mooshroom, turtle, squid, bat, villager, wandering_trader${gte('1.14') ? ', fox' : ''}${gte('1.16') ? ', strider' : ''}${gte('1.17') ? ', axolotl, goat, glow_squid' : ''}${gte('1.19') ? ', frog, tadpole, allay' : ''}${gte('1.20') ? ', camel, sniffer' : ''}${gte('1.21') ? ', armadillo' : ''}${hasNautilus ? ', nautilus' : ''}
${hasSpringToLife ? `動物バリアント: cold_pig, warm_pig, cold_cow, warm_cow, cold_chicken, warm_chicken  ※バイオーム固有
` : ''}中立: bee, dolphin, llama, polar_bear, iron_golem, snow_golem, ${gte('1.16') ? 'zombified_piglin' : 'zombie_pigman'}, panda, trader_llama
ボス: ender_dragon, wither
マーカー: armor_stand (Invisible:true, NoGravity:true, Tags:["marker"])
乗り物: minecart, boat${gte('1.19') ? ', chest_boat' : ''}

【ポーション効果一覧】
有益: speed, haste, strength, instant_health, jump_boost, regeneration, resistance, fire_resistance, water_breathing, invisibility, night_vision, absorption, saturation, luck, slow_falling, conduit_power, hero_of_the_village${gte('1.21') ? ', wind_charged, raid_omen, trial_omen' : ''}${hasNautilus ? ', breath_of_the_nautilus' : ''}
有害: slowness, mining_fatigue, instant_damage, nausea, blindness, hunger, weakness, poison, wither, levitation${gte('1.19') ? ', darkness' : ''}${gte('1.21') ? ', infested, oozing, weaving' : ''}

【主要アイテム/素材】
鉱石: coal, raw_iron, raw_gold, raw_copper, diamond, emerald, lapis_lazuli, redstone, quartz, amethyst_shard${gte('1.16') ? ', ancient_debris, netherite_scrap, gold_nugget' : ''}
インゴット: iron_ingot, gold_ingot, copper_ingot${gte('1.16') ? ', netherite_ingot' : ''}
食料: apple, golden_apple, enchanted_golden_apple, bread, cooked_beef, cooked_porkchop, cooked_chicken, baked_potato, cookie, cake${gte('1.19') ? ', glow_berries' : ''}
便利: ender_pearl, blaze_rod, nether_star, elytra, totem_of_undying, name_tag, saddle, lead, compass, clock, map, experience_bottle
レッドストーン: redstone, repeater, comparator, piston, sticky_piston, observer, dropper, dispenser, hopper, lever${gte('1.21') ? ', crafter' : ''}
${gte('1.21') ? '1.21新規: trial_spawner, vault, heavy_core, mace, breeze_rod, wind_charge, copper_bulb, crafter' : ''}
${hasPaleGarden ? '1.21.4新規: pale_oak_planks, pale_oak_log, creaking_heart, pale_moss_block, pale_hanging_moss, eyeblossom, resin_clump, resin_block, resin_bricks' : ''}
${hasSpringToLife ? '1.21.5新規: leaf_litter, wildflowers, bush, firefly_bush, cactus_flower, short_dry_grass, tall_dry_grass, test_block, blue_egg, brown_egg' : ''}
${hasNautilus ? '1.21.11新規: spear(全素材), nautilus_armor, netherite_horse_armor, stopwatch' : ''}

【ターゲットセレクタ】
@a=全プレイヤー, @p=最寄りプレイヤー, @r=ランダムプレイヤー, @s=実行者, @e=全エンティティ${gte('1.20.2') ? ', @n=最寄りエンティティ' : ''}
引数: type(!で否定可), name, tag, scores={obj=min..max}, nbt={...}, distance=..10, dx/dy/dz(ボリューム判定), x/y/z(基準座標), sort(nearest|furthest|random|arbitrary), limit, level, gamemode(!creative等), team(!team等), x_rotation, y_rotation${hasComponents ? ', predicate=namespace:path' : ''}
例: @a[tag=playing,scores={kills=5..},distance=..20,team=red]
  @e[type=zombie,limit=1,sort=nearest,nbt={NoAI:1b}]
  @a[x=-50,z=-50,dx=100,dz=100]  ※エリア内プレイヤー（矩形判定）
${hasDialogCmd ? `
【ダイアログ定義（1.21.10+）】
data/${namespace}/dialog/<id>.json に定義。/dialog show @a ${namespace}:<id> で表示。
■ notice（情報表示）:
  {"type":"minecraft:notice","title":"タイトル","body":{"type":"minecraft:plain_text","text":"本文"},"can_close_with_escape":true,"button":{"label":"OK","action":{"type":"run_command","command":"say OK!"}}}
■ confirmation（Yes/No選択）:
  {"type":"minecraft:confirmation","title":"確認","body":{"type":"minecraft:plain_text","text":"実行しますか？"},"yes":{"label":"はい","action":{"type":"run_command","command":"function ${namespace}:yes"}},"no":{"label":"いいえ","action":{"type":"run_command","command":"dialog clear @s"}}}
■ multi_action（複数ボタン）:
  {"type":"minecraft:multi_action","title":"選択","body":{"type":"minecraft:plain_text","text":"選んでね"},"buttons":[{"label":"選択1","action":{"type":"run_command","command":"function ${namespace}:choice1"}},{"label":"選択2","action":{"type":"run_command","command":"function ${namespace}:choice2"}}],"exit_action":{"type":"run_command","command":"say キャンセル"}}
■ dialog_list（サブダイアログ）:
  {"type":"minecraft:dialog_list","title":"メニュー","buttons":[{"label":"設定","dialog":"${namespace}:settings"},{"label":"ヘルプ","dialog":"${namespace}:help"}]}` : ''}
${hasTimeline ? `
【タイムライン定義（1.21.11+）】
data/${namespace}/timeline/<id>.json で絶対ゲーム時間に基づく環境変化を定義。
  {"period_ticks":24000,"tracks":{"minecraft:sky_color":{"ease":"linear","keyframes":[{"ticks":0,"value":{"type":"override","value":"#87CEEB"}},{"ticks":12000,"value":{"type":"override","value":"#FF4500"}}]}}}
イージング: constant, linear, ease_in_quad/cubic/quart/quint/sine/expo/circ/back/elastic/bounce, ease_out_*, ease_in_out_*, cubic_bezier
タグ: #universal, #in_overworld, #in_nether, #in_end` : ''}
${hasEnvAttribute ? `
【環境属性（Environment Attributes, 1.21.11+）】
data/${namespace}/environment_attribute/<id>.json でバイオーム/ディメンションのビジュアルやゲームプレイを制御。
■ ビジュアル: fog_color, fog_start/end_distance, water_fog_color, sky_color, sky_light_color, cloud_color, cloud_height, sun_angle, moon_angle, star_brightness, ambient_particles, sunrise_sunset_color
■ オーディオ: background_music (default/underwater/creative), music_volume, ambient_sounds, firefly_bush_sounds
■ ゲームプレイ: water_evaporates, bed_rule, respawn_anchor_works, fast_lava, monsters_burn, snow_golem_melts, sky_light_level, creaking_active, surface_slime_spawn_chance
■ 優先度: Dimensions > Biomes > Timelines > Weather
■ モディファイア: override, add, subtract, multiply, minimum, maximum, alpha_blend, and, or, xor` : ''}

【ミニゲーム実装パターン（実際のデータパックから抽出）】
■ 基本構成:
  reload.mcfunction → スコアボード初期化、ゲーム状態リセット
  main.mcfunction → 毎tick実行（ゲームループ）
  start.mcfunction → ゲーム開始処理
  end.mcfunction → ゲーム終了処理
■ ゲーム状態管理:
  scoreboard objectives add gameState dummy
  scoreboard players set #state gameState 0  (0=待機, 1=プレイ中, 2=終了)
  execute if score #state gameState matches 1 run function ${namespace}:game_loop
■ タイマー（bossbar連動）:
  bossbar add ${namespace}:timer "残り時間"
  bossbar set ${namespace}:timer max 6000  (5分=6000tick)
  bossbar set ${namespace}:timer color green
  bossbar set ${namespace}:timer style notched_10
  bossbar set ${namespace}:timer players @a[tag=playing]
  execute store result bossbar ${namespace}:timer value run scoreboard players get #timer ${namespace}
■ チーム対戦:
  team add red "赤チーム"
  team modify red color red
  team modify red friendlyFire false
  team join red @s
■ リスポーンシステム:
  マーカーarmor_standにタグ付き→tp先として使用
  scoreboard objectives add deaths deathCount
  execute as @a[scores={deaths=1..}] run function ${namespace}:on_death
■ カウントダウン演出:
  execute if score #cd ${namespace} matches 60 run title @a title {"text":"3","bold":true}
  execute if score #cd ${namespace} matches 40 run title @a title {"text":"2","bold":true}
  execute if score #cd ${namespace} matches 20 run title @a title {"text":"1","bold":true}
  execute if score #cd ${namespace} matches 1 run title @a title {"text":"START!","color":"gold"}
  playsound minecraft:entity.experience_orb.pickup master @a ~ ~ ~ 1
■ サイドバー（マクロ活用）:
  execute store result storage ${namespace}:sidebar score int 1 run scoreboard players get #score ${namespace}
  function ${namespace}:update_sidebar with storage ${namespace}:sidebar
■ 村人NPC（カスタム取引）:
  summon villager ~ ~ ~ {VillagerData:{profession:"none",level:5,type:"plains"},CustomName:'"ショップ"',Invulnerable:1b,Silent:1b,NoAI:1b,PersistenceRequired:1b,Offers:{Recipes:[{buy:{id:"emerald",count:1},sell:{id:"diamond_sword",count:1},rewardExp:0b,maxUses:10000}]}}
■ レイキャスト:
  execute anchored eyes positioned ^ ^ ^0.1 run function ${namespace}:raycast/loop
  # raycast/loop.mcfunction内:
  particle crit ~ ~ ~ 0 0 0 0 1
  execute if block ~ ~ ~ #minecraft:impermeable run return 0
  execute as @e[distance=..0.5,limit=1,type=!player] run function ${namespace}:raycast/hit
  execute positioned ^ ^ ^0.1 run function ${namespace}:raycast/loop
■ アイテム配布（全プレイヤー）:
  clear @a[tag=playing]
  effect clear @a[tag=playing]
  give @a[tag=playing] minecraft:iron_sword[enchantments={levels:{"minecraft:sharpness":2}}] 1
  give @a[tag=playing] minecraft:bow 1
  give @a[tag=playing] minecraft:arrow 64
  give @a[tag=playing] minecraft:iron_chestplate 1
■ エリア境界（ワールドボーダー的）:
  execute as @a[tag=playing] at @s unless entity @s[x=-50,z=-50,dx=100,dz=100] run tp @s 0 64 0
  execute as @a[tag=playing] at @s unless entity @s[y=0,dy=256] run kill @s
■ スコア表示マクロ（sidebar2.mcfunction）:
  $scoreboard players display name score_line minecrant [{"text":"スコア: ","color":"aqua"},{"text":"$(val)","color":"yellow"}]
  ※with storageで呼び出し: function ${namespace}:sidebar2 with storage ${namespace}:display
■ 条件JSON（predicate）例:
  {"condition":"minecraft:any_of","terms":[{"condition":"minecraft:entity_properties","entity":"this","predicate":{"equipment":{"mainhand":{"items":"minecraft:diamond_sword"}}}},{"condition":"minecraft:entity_properties","entity":"this","predicate":{"equipment":{"mainhand":{"items":"minecraft:iron_sword"}}}}]}
■ 進捗JSON（advancement）トリガー例:
  {"criteria":{"custom_trigger":{"trigger":"minecraft:player_interacted_with_entity","conditions":{"entity":[{"condition":"minecraft:entity_properties","predicate":{"type":"minecraft:villager","nbt":"{Tags:[\\"shop\\"]}"}}]}}},"rewards":{"function":"${namespace}:on_shop"}}
■ ルートテーブル（条件付きドロップ）:
  {"pools":[{"rolls":1,"bonus_rolls":0,"entries":[{"type":"minecraft:item","name":"minecraft:diamond","weight":1,"functions":[{"function":"minecraft:set_count","count":{"min":1,"max":3,"type":"minecraft:uniform"}}]}],"conditions":[{"condition":"minecraft:killed_by_player"}]}]}
  エントリタイプ: item, loot_table, dynamic, empty, tag, group, alternatives, sequence
■ advancement→function→revokeループ（イベント検出の定番パターン）:
  advancement JSON: {"criteria":{"trigger_name":{"trigger":"minecraft:using_item","conditions":{"item":{"items":"minecraft:shield","predicates":{"minecraft:custom_data":{"action":true}}}}}},"rewards":{"function":"${namespace}:on_trigger"}}
  function内で即revoke: advancement revoke @s only ${namespace}:trigger_name
  ※using_item, placed_block, item_used_on_block等のトリガーで繰返しイベント検出可能
■ マクロ+storageパイプライン（データパック解析から抽出）:
  # Step1: エンティティ/ブロックデータをstorageに転写
  data modify storage ${namespace}:temp id set from entity @s SelectedItem.id
  data modify storage ${namespace}:temp count set from entity @s Inventory[{Slot:-106b}].count
  # Step2: マクロで動的コマンド生成
  $summon item ~ ~ ~ {Item:{count:$(count),id:"$(id)"}}
  $execute if block ~$(x) ~$(y) ~$(z) minecraft:white_wool run scoreboard players add @s check 1
■ item_display/text_display活用:
  # 3Dオブジェクト配置(transformation付き)
  summon item_display ~ ~ ~ {item:{id:"minecraft:command_block",count:1,components:{"minecraft:item_model":custom_model}},transformation:{left_rotation:{angle:0,axis:[0,0,0]},translation:[0.0f,0.5f,0.0f],right_rotation:{angle:0,axis:[0,0,0]},scale:[1.0f,1.0f,1.0f]},brightness:{sky:15,block:15},Tags:["display"]}
  # text_display動的更新(マクロ)
  $data modify entity @s text set value ["",{"text":"経過: ","color":"yellow"},{"text":"$(time)","color":"aqua"},{"text":"秒"}]
■ 透明エンティティ乗り物:
  summon pig ~ ~ ~ {Saddle:1b,NoAI:1b,NoGravity:1b,active_effects:[{id:"minecraft:invisibility",duration:-1,show_particles:0b},{id:"minecraft:resistance",duration:-1,amplifier:5,show_particles:0b}],Silent:1b,PersistenceRequired:1b,Tags:["vehicle"]}
  execute as @e[tag=vehicle] at @s rotated 180 -8.2 run tp @s ^ ^ ^0.6  ※斜め移動
  execute as @e[tag=vehicle] on passengers run ride @s dismount  ※降車
■ 精密ボリューム判定:
  execute at @e[tag=marker] align xyz positioned ~-0.375 ~ ~-0.375 if entity @s[dx=0] positioned ~0.75 ~ ~0.75 if entity @s[dx=0] run ...
  ※2段positioned+dx=0で0.75ブロック幅の精密検出
■ scoreboard全演算子活用（タイマー→分:秒変換）:
  scoreboard players operation #sec timer = #ticks timer
  scoreboard players operation #sec timer /= 20 const  ※tick→秒
  scoreboard players operation #min timer = #sec timer
  scoreboard players operation #min timer /= 60 const  ※秒→分
  scoreboard players operation #sec_rem timer = #sec timer
  scoreboard players operation #sec_rem timer %= 60 const  ※秒の余り
■ ディメンション移動検知+制限:
  advancement: {"criteria":{"nether":{"trigger":"minecraft:changed_dimension","conditions":{"to":"minecraft:the_nether"}}},"rewards":{"function":"${namespace}:deny_nether"}}
  function: tellraw @s {"text":"ネザーは禁止です！","color":"red"} → kill @s → advancement revoke
■ カスタムレシピJSON例（1.21.2+簡略形式）:
  shaped: {"type":"minecraft:crafting_shaped","pattern":["DDD","DSD","DDD"],"key":{"D":"minecraft:diamond_block","S":"minecraft:nether_star"},"result":{"id":"minecraft:diamond_sword","count":1,"components":{"minecraft:enchantments":{"levels":{"minecraft:sharpness":10}},"minecraft:custom_name":"{\\"text\\":\\"伝説の剣\\",\\"color\\":\\"gold\\",\\"bold\\":true}","minecraft:unbreakable":true}}}
  shapeless: {"type":"minecraft:crafting_shapeless","ingredients":["minecraft:diamond","minecraft:emerald"],"result":{"id":"minecraft:diamond","count":2}}
  smithing: {"type":"minecraft:smithing_transform","template":"minecraft:netherite_upgrade_smithing_template","base":"minecraft:diamond_sword","addition":"minecraft:netherite_ingot","result":{"id":"minecraft:netherite_sword"}}
${hasEnchantmentRegistry ? `■ カスタムエンチャント定義例（1.21+）:
  data/${namespace}/enchantment/lifesteal.json:
  {"description":{"translate":"enchantment.${namespace}.lifesteal"},"supported_items":"#minecraft:enchantable/sword","weight":5,"max_level":3,"min_cost":{"base":10,"per_level_above_first":10},"max_cost":{"base":50,"per_level_above_first":10},"anvil_cost":4,"slots":["mainhand"],"effects":{"minecraft:post_attack":[{"effect":{"type":"minecraft:run_function","function":"${namespace}:enchant/lifesteal"}}]}}` : ''}
${hasDialogCmd ? `■ ダイアログ活用パターン（1.21.10+）:
  # ショップUI
  /dialog show @s ${namespace}:shop
  # dialog/shop.json: multi_action → 各ボタンがfunction実行 → アイテム付与
  # NPCとの対話 → advancement trigger → function → /dialog show` : ''}
■ data storage活用（動的データ管理）:
  # プレイヤー固有データの保存
  execute store result storage ${namespace}:players this.health int 1 run data get entity @s Health
  # 座標を保存してtp先に使用
  data modify storage ${namespace}:temp pos set from entity @s Pos
  # リスト操作
  data modify storage ${namespace}:queue list append value {name:"player1",score:0}
  data remove storage ${namespace}:queue list[0]  ※先頭削除（キュー）
${hasFunctionMacros ? `■ 高度なマクロ活用パターン:
  # 動的コマンド生成: ストレージ→マクロで任意のID/座標を展開
  data modify storage ${namespace}:temp item set from entity @s SelectedItem.id
  function ${namespace}:give_item with storage ${namespace}:temp
  # give_item.mcfunction: $give @s $(item) 1
  # 複数プレイヤーへの個別メッセージ
  execute as @a run function ${namespace}:personal_msg
  # personal_msg.mcfunction:
  # execute store result storage ${namespace}:msg score int 1 run scoreboard players get @s kills
  # function ${namespace}:show_msg with storage ${namespace}:msg
  # show_msg.mcfunction: $tellraw @s [{"text":"あなたのキル数: "},{"text":"$(score)","color":"gold"}]` : ''}
■ パーティクル演出パターン:
  # 円形パーティクル（三角関数マクロ）
  scoreboard players set #angle ${namespace} 0
  function ${namespace}:circle_step
  # circle_step.mcfunction:
  execute store result storage ${namespace}:circle x double 0.05 run scoreboard players get #cos ${namespace}
  execute store result storage ${namespace}:circle z double 0.05 run scoreboard players get #sin ${namespace}
  # 渦巻き: y += 0.1 per step, radius *= 0.98
■ ゲームモード一覧と用途:
  gamemode adventure @a[tag=playing]  ※ミニゲーム中（ブロック破壊/設置不可）
  gamemode spectator @a[tag=dead]  ※死亡→観戦
  gamemode survival @a  ※終了後リセット
  gamemode creative @a[tag=builder]  ※建築モード
■ 音響演出（playsound）:
  playsound minecraft:entity.experience_orb.pickup master @a ~ ~ ~ 1 1  ※レベルアップ音
  playsound minecraft:entity.ender_dragon.growl master @a ~ ~ ~ 1 0.5  ※ボス出現
  playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 0.8 1  ※緊迫感
  playsound minecraft:ui.toast.challenge_complete master @a ~ ~ ~ 1 1  ※達成音
  playsound minecraft:block.note_block.pling master @a ~ ~ ~ 1 2  ※高音通知
${hasTimeline ? `■ タイムラインと環境属性の連携（1.21.11+）:
  # カスタムワールドの昼夜サイクル色変更
  # timeline/sky.json: period=24000, tracks: sky_color, fog_color
  # environment_attribute/horror.json: fog_start_distance=0, fog_end_distance=30, sky_light_level=0
  # 夜だけ暗くなるホラーマップ等に活用` : ''}

【バージョン固有の重要ルール】
- 対象は Minecraft ${targetVersion} のみ（pack_format: ${packFormat}）
- ${useSingular ? 'フォルダ名は単数形（function, recipe, advancement等）' : 'フォルダ名は複数形（functions, recipes, advancements等）'}
${hasComponents ? '- ★重要★ NBT形式({...})は完全禁止。必ずコンポーネント形式[...]を使用\n  give @s diamond_sword{Enchantments:[...]} ← 絶対NG\n  give @s minecraft:diamond_sword[enchantments={levels:{"minecraft:sharpness":5}}] ← 正しい' : '- アイテムデータはNBT形式{...}を使用（コンポーネント形式は1.20.5以降）'}
${hasSNBTText ? '- テキストはインラインSNBT形式: custom_name={text:"名前",color:"gold"}（JSON文字列非推奨）' : '- テキストはJSON文字列形式: custom_name=\'{"text":"名前","color":"gold"}\''}
${hasFunctionMacros ? '- 関数マクロ: $行で$(変数)展開。呼出し時にwith句でデータソース指定' : '- 関数マクロは未対応（1.20.2以降）'}
${hasReturnCmd ? '- /return で関数から値を返却可能（return <値>, return run <cmd>, return fail）' : ''}
${gte('1.21.9') ? '- pack_formatはセマンティック形式: supported_formats: {"min_inclusive":[' + packFormat + ',' + packFormatMinor + '],"max_inclusive":[' + packFormat + ',' + packFormatMinor + ']}' : ''}

【注意事項】
- 名前空間は必ず "${namespace}" を使用
- ファイル名は英小文字・数字・アンダースコア・ハイフンのみ
- JSONは有効な形式。コメント不可。末尾カンマ不可
- mcfunctionのコメントは # で開始
- 説明はコードブロック外に日本語で記述
- 数値ID・データ値は絶対に使用しない（1.13 The Flattening以降）
- セレクタ引数のスペースは禁止: @a[tag=playing] ○、@a[ tag = playing ] ×
- ブロック状態とNBT/コンポーネントの構文を混同しない
  ブロック状態: minecraft:oak_door[half=upper,facing=north]
  ${hasComponents ? 'アイテムコンポーネント: minecraft:diamond_sword[damage=5,enchantments={...}]' : 'アイテムNBT: minecraft:diamond_sword{Damage:5}'}
- execute chainは必ず run で終端: execute as @a at @s run say hello
- 座標: 絶対(x y z)、相対(~ ~ ~)、ローカル(^ ^ ^) は混在不可`;
};

const MC_ALL_COMMANDS = new Set(MC_AUTO._root.map(c => c.l));

function getValidCommands(targetVersion) {
  return new Set(filterByVersion(MC_AUTO._root, targetVersion).map(c => c.l));
}

// Helper: convert plain string array to autocomplete items with optional category label
function stringsToAcItems(arr, prefix, category) {
  const lc = prefix.toLowerCase();
  return arr.filter(s => s.startsWith(lc)).slice(0, 15).map(s => ({ l: s, d: category || '' }));
}

// Command argument type definitions for contextual completion
// null = selector/coords/other (no special completion), string = type key
const CMD_ARG_TYPES = {
  give: [null, 'item', 'number'],
  clear: [null, 'item', 'number'],
  item: [null, null, null, 'item'],
  summon: ['entity', 'coordinate', 'coordinate', 'coordinate'],
  kill: [null],
  tp: [null, null, null, null],  // tp <target> <x> <y> <z> or <target> <target>
  teleport: [null, null, null, null],
  effect: [null, null, 'effect'],
  'effect.give': [null, 'effect', 'number', 'number'],
  'effect.clear': [null, 'effect'],
  enchant: [null, 'enchantment', 'number'],
  playsound: ['sound', null, null],
  particle: ['particle', null, null, null],
  setblock: [null, null, null, 'block'],
  fill: [null, null, null, null, null, null, 'block'],
  gamemode: ['gamemode', null],
  difficulty: ['difficulty'],
  weather: ['weather'],
  'time.set': ['time_value'],
  'time.add': ['time_value'],
  title: [null, 'title_position'],
  ride: [null],
  damage: [null, 'number', 'damage_type'],
  attribute: [null, null, 'attribute_action'],
  'data.get': [null, null],
  'data.merge': [null, null],
  'scoreboard.objectives.add': [null, 'criteria'],
  'scoreboard.objectives.setdisplay': ['display_slot'],
  'scoreboard.players.set': [null, null, 'number'],
  'scoreboard.players.add': [null, null, 'number'],
  'scoreboard.players.remove': [null, null, 'number'],
  'scoreboard.players.operation': [null, null, 'score_operation'],
  spawnpoint: [null, null, null, null],
  setworldspawn: [null, null, null],
  spreadplayers: [null, null, null, null, null],
  'bossbar.set': [null, 'bossbar_property'],
  'bossbar.set.color': ['bossbar_color'],
  'bossbar.set.style': ['bossbar_style'],
  clone: [null, null, null, null, null, null, null, null, null, 'clone_mode'],
  'team.modify': [null, 'team_option'],
  'team.modify.color': ['mc_color'],
  stopsound: [null, 'sound_source', 'sound'],
  fillbiome: [null, null, null, null, null, null, 'biome'],
  defaultgamemode: ['gamemode'],
  'experience.add': [null, 'number'],
  'xp.add': [null, 'number'],
  'worldborder.set': ['number'],
  'worldborder.add': ['number'],
  'tick.rate': ['number'],
  'random.value': ['number'],
};

// Additional completion data for special types
const SPECIAL_TYPE_COMPLETIONS = {
  gamemode: ['survival','creative','adventure','spectator'],
  difficulty: ['peaceful','easy','normal','hard'],
  weather: ['clear','rain','thunder'],
  time_value: ['day','noon','night','midnight','0','1000','6000','12000','18000'],
  title_position: ['title','subtitle','actionbar','clear','reset','times'],
  criteria: ['dummy','deathCount','playerKillCount','totalKillCount','health','food','air','armor','level','xp','trigger',
    'minecraft.mined','minecraft.broken','minecraft.crafted','minecraft.used','minecraft.picked_up','minecraft.dropped','minecraft.killed','minecraft.killed_by',
    'minecraft.custom'],
  bossbar_property: ['value','max','color','name','style','visible','players'],
  bossbar_color: ['blue','green','pink','purple','red','white','yellow'],
  bossbar_style: ['progress','notched_6','notched_10','notched_12','notched_20'],
  block: null, // uses _items (blocks are a subset)
  attribute_action: ['get','base','modifier'],
  display_slot: ['sidebar','list','below_name','sidebar.team.red','sidebar.team.blue','sidebar.team.green','sidebar.team.yellow',
    'sidebar.team.aqua','sidebar.team.white','sidebar.team.black','sidebar.team.dark_red','sidebar.team.dark_blue',
    'sidebar.team.dark_green','sidebar.team.dark_aqua','sidebar.team.dark_purple','sidebar.team.gold','sidebar.team.gray','sidebar.team.dark_gray'],
  score_operation: ['+=','-=','*=','/=','%=','<','>','><','='],
  clone_mode: ['replace','masked','filtered','force','move','normal'],
  item_slot: ['weapon.mainhand','weapon.offhand','armor.head','armor.chest','armor.legs','armor.feet',
    'container.0','container.1','container.2','container.3','container.4','container.5',
    'container.6','container.7','container.8','hotbar.0','hotbar.1','hotbar.2','hotbar.3',
    'hotbar.4','hotbar.5','hotbar.6','hotbar.7','hotbar.8',
    'inventory.0','inventory.1','inventory.2','inventory.3','inventory.4',
    'enderchest.0','horse.saddle','horse.chest','horse.armor','horse.0','horse.1',
    'villager.0','villager.1','villager.2','villager.3','villager.4',
    'villager.5','villager.6','villager.7'],
  mc_color: ['red','blue','green','yellow','aqua','white','black','dark_red','dark_blue','dark_green','dark_aqua',
    'dark_purple','gold','gray','dark_gray','light_purple','reset'],
  team_option: ['color','friendlyFire','seeFriendlyInvisibles','nametagVisibility','deathMessageVisibility','collisionRule','prefix','suffix'],
  sound_source: ['master','music','record','weather','block','hostile','neutral','player','ambient','voice'],
  damage_type: ['minecraft:generic','minecraft:player_attack','minecraft:mob_attack','minecraft:arrow','minecraft:falling_block',
    'minecraft:fall','minecraft:drown','minecraft:on_fire','minecraft:lava','minecraft:lightning_bolt','minecraft:explosion',
    'minecraft:wither','minecraft:magic','minecraft:starve','minecraft:freeze','minecraft:sonic_boom'],
  biome: ['plains','desert','forest','taiga','swamp','river','frozen_river','snowy_plains','mushroom_fields',
    'beach','jungle','sparse_jungle','deep_ocean','stony_shore','old_growth_birch_forest','dark_forest','snowy_beach',
    'windswept_hills','windswept_forest','windswept_gravelly_hills','ocean','warm_ocean','lukewarm_ocean','cold_ocean','frozen_ocean',
    'deep_lukewarm_ocean','deep_cold_ocean','deep_frozen_ocean','sunflower_plains','flower_forest','ice_spikes',
    'old_growth_pine_taiga','old_growth_spruce_taiga','badlands','eroded_badlands','wooded_badlands',
    'meadow','grove','snowy_slopes','frozen_peaks','jagged_peaks','stony_peaks',
    'cherry_grove','savanna','savanna_plateau','windswept_savanna','bamboo_jungle','mangrove_swamp',
    'the_nether','nether_wastes','soul_sand_valley','crimson_forest','warped_forest','basalt_deltas',
    'the_end','end_highlands','end_midlands','small_end_islands','end_barrens',
    'deep_dark','dripstone_caves','lush_caves','the_void','pale_garden'],
};

function getAutocompleteSuggestions(lineText, cursorCol, targetVersion) {
  const text = lineText.substring(0, cursorCol).trimStart();
  if (!text || text.startsWith('#')) return [];

  const tokens = text.split(/\s+/);
  const currentWord = tokens[tokens.length - 1] || '';
  const completed = tokens.slice(0, -1);
  const cw = currentWord.toLowerCase();

  // Inside selector brackets
  const lastOpen = text.lastIndexOf('[');
  const lastClose = text.lastIndexOf(']');
  if (lastOpen > lastClose) {
    const inside = text.substring(lastOpen + 1);
    const parts = inside.split(',');
    const lastPart = parts[parts.length - 1].trim();
    // After type= suggest entities
    if (lastPart.startsWith('type=')) {
      const partial = lastPart.substring(5).replace(/^!?minecraft:/, '').replace(/^!/, '');
      return stringsToAcItems(MC_AUTO._entities, partial, 'エンティティ');
    }
    // After gamemode= suggest gamemodes
    if (lastPart.startsWith('gamemode=')) {
      const partial = lastPart.substring(9).replace(/^!/, '');
      return ['survival','creative','adventure','spectator'].filter(s => s.startsWith(partial)).map(s => ({ l: s, d: '' }));
    }
    return filterByVersion(MC_AUTO._selector_args, targetVersion).filter(s => s.l.startsWith(lastPart.toLowerCase()));
  }

  // Selector (@)
  if (currentWord.startsWith('@') && currentWord.length <= 2) {
    return filterByVersion(MC_AUTO._selectors, targetVersion).filter(s => s.l.startsWith(currentWord));
  }

  // Root commands
  if (completed.length === 0) {
    if (!currentWord) return filterByVersion(MC_AUTO._root, targetVersion).slice(0, 15);
    return filterByVersion(MC_AUTO._root, targetVersion).filter(s => s.l.startsWith(cw));
  }

  const cmd = completed[0].toLowerCase();

  // Execute chain: find 'run' and delegate to the run command's completion
  if (cmd === 'execute') {
    // Find the last 'run' token to extract the actual command after it
    let runIndex = -1;
    for (let i = completed.length - 1; i >= 1; i--) {
      if (completed[i].toLowerCase() === 'run') { runIndex = i; break; }
    }

    if (runIndex >= 0) {
      // There's a 'run' in the completed tokens - delegate to normal command completion
      const afterRun = completed.slice(runIndex + 1);
      if (afterRun.length === 0) {
        // Cursor is right after 'run ' - show root commands
        if (!currentWord) return filterByVersion(MC_AUTO._root, targetVersion).slice(0, 15);
        return filterByVersion(MC_AUTO._root, targetVersion).filter(s => s.l.startsWith(cw));
      }
      // Rebuild a fake line as if the command after 'run' is the top-level command
      // e.g., "execute as @a run give @s " -> treat as "give @s " for completion
      const fakeTokens = [...afterRun, currentWord];
      const fakeLine = fakeTokens.join(' ');
      return getAutocompleteSuggestions(fakeLine, fakeLine.length, targetVersion);
    }

    // No 'run' yet - provide execute subcommand suggestions
    let ctx = 'execute';
    let expectArg = false;
    for (let i = 1; i < completed.length; i++) {
      const tok = completed[i].toLowerCase();
      if (expectArg) { expectArg = false; continue; }
      if (tok === 'if' || tok === 'unless') { ctx = 'execute.if'; expectArg = false; continue; }
      if (tok === 'store') { ctx = 'execute.store'; expectArg = false; continue; }
      if (tok === 'result' || tok === 'success') { ctx = 'execute.store.result'; expectArg = false; continue; }
      if (['as', 'at'].includes(tok)) { expectArg = true; ctx = 'execute'; continue; }
      if (tok === 'on') { ctx = 'execute.on'; expectArg = false; continue; }
      if (tok === 'positioned') {
        const next = completed[i + 1]?.toLowerCase();
        if (next === 'over') { ctx = 'execute.positioned.over'; i += 1; continue; }
        if (next === 'as') { i += 2; } else { i += 2; }
        ctx = 'execute'; continue;
      }
      if (['rotated'].includes(tok)) {
        const next = completed[i + 1]?.toLowerCase();
        if (next === 'as') { i += 2; } else { i += 2; }
        ctx = 'execute'; continue;
      }
      if (tok === 'facing') { i += 2; ctx = 'execute'; continue; }
      if (tok === 'in') { ctx = 'execute.in'; expectArg = false; continue; }
      if (tok === 'anchored') { expectArg = true; ctx = 'execute'; continue; }
      if (tok === 'align') { expectArg = true; ctx = 'execute'; continue; }
      if (tok === 'summon') { expectArg = true; ctx = 'execute'; continue; }
    }
    const items = filterByVersion(MC_AUTO[ctx] || [], targetVersion);
    if (!currentWord) return items.slice(0, 15);
    return items.filter(s => s.l.toLowerCase().startsWith(cw));
  }

  // Check for contextual item/entity/effect completion
  const argIdx = completed.length - 1; // 0-based index after command
  const checkContextTypes = (key) => {
    const argTypes = CMD_ARG_TYPES[key];
    if (!argTypes || argIdx >= argTypes.length) return null;
    const expectedType = argTypes[argIdx];
    if (!expectedType) return null;
    const cleanWord = cw.replace(/^minecraft:/, '');
    if (expectedType === 'item' || expectedType === 'block') return stringsToAcItems(MC_AUTO._items, cleanWord, expectedType === 'block' ? 'ブロック' : 'アイテムID');
    if (expectedType === 'entity') return stringsToAcItems(MC_AUTO._entities, cleanWord, 'エンティティ');
    if (expectedType === 'effect') return stringsToAcItems(MC_AUTO._effects, cleanWord, 'エフェクト');
    if (expectedType === 'enchantment') return stringsToAcItems(MC_AUTO._enchantments, cleanWord, 'エンチャント');
    if (expectedType === 'sound') return stringsToAcItems(MC_AUTO._sounds_common, cleanWord, 'サウンド');
    if (expectedType === 'particle') return stringsToAcItems(MC_AUTO._particles, cleanWord, 'パーティクル');
    // Check special types
    const specialList = SPECIAL_TYPE_COMPLETIONS[expectedType];
    if (specialList && Array.isArray(specialList)) {
      return specialList.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: expectedType }));
    }
    return null;
  };

  // First try compound key (e.g. effect.give)
  if (completed.length >= 2) {
    const sub = completed[1].toLowerCase();
    const compoundKey = `${cmd}.${sub}`;
    const ctxResult = checkContextTypes(compoundKey);
    if (ctxResult && ctxResult.length > 0) return ctxResult;
  }
  // Try simple command key
  const ctxResult = checkContextTypes(cmd);
  if (ctxResult && ctxResult.length > 0) return ctxResult;

  // Gamerule: show gamerule names
  if (cmd === 'gamerule' && completed.length === 1) {
    return filterByVersion(MC_AUTO._gamerules, targetVersion).filter(s => s.l.toLowerCase().startsWith(cw));
  }

  // Title: skip selector token
  if (cmd === 'title' && completed.length >= 2 && completed[1].startsWith('@')) {
    const items = filterByVersion(MC_AUTO.title || [], targetVersion);
    return items.filter(s => s.l.toLowerCase().startsWith(cw));
  }

  // Give/Clear/Summon: item/entity completion at correct arg position
  if ((cmd === 'give' || cmd === 'clear') && completed.length === 2) {
    return stringsToAcItems(MC_AUTO._items, cw.replace(/^minecraft:/, ''), 'アイテムID');
  }
  if (cmd === 'summon' && completed.length === 1) {
    return stringsToAcItems(MC_AUTO._entities, cw.replace(/^minecraft:/, ''), 'エンティティ');
  }
  if (cmd === 'enchant' && completed.length === 2) {
    return stringsToAcItems(MC_AUTO._enchantments, cw.replace(/^minecraft:/, ''), 'エンチャント');
  }
  if (cmd === 'playsound' && completed.length === 1) {
    return stringsToAcItems(MC_AUTO._sounds_common, cw, 'サウンド');
  }
  if (cmd === 'particle' && completed.length === 1) {
    return stringsToAcItems(MC_AUTO._particles, cw, 'パーティクル');
  }
  if ((cmd === 'effect') && completed.length >= 2) {
    const sub = completed[1]?.toLowerCase();
    if ((sub === 'give' && completed.length === 3) || (sub === 'clear' && completed.length === 3)) {
      return stringsToAcItems(MC_AUTO._effects, cw.replace(/^minecraft:/, ''), 'エフェクト');
    }
    if (completed.length === 2 && completed[1]?.startsWith('@')) {
      return stringsToAcItems(MC_AUTO._effects, cw.replace(/^minecraft:/, ''), 'エフェクト');
    }
  }

  // NBT autocomplete: detect { } context in summon/data/execute store
  const lastBrace = text.lastIndexOf('{');
  const lastBraceClose = text.lastIndexOf('}');
  if (lastBrace > lastBraceClose && lastBrace < text.length) {
    // We're inside a { } block - offer NBT keys
    const inside = text.substring(lastBrace + 1);
    // Find the last key being typed (after , or { or : )
    const keyMatch = inside.match(/(?:^|,|\{)\s*([A-Za-z_]*)$/);
    if (keyMatch) {
      const partial = keyMatch[1].toLowerCase();
      // Determine entity type from summon context
      let entityId = null;
      if (cmd === 'summon' && completed.length >= 2) entityId = completed[1];
      if (cmd === 'data' && completed.length >= 4) entityId = null; // generic
      const nbtKeys = getNBTKeysForEntity(entityId);
      const results = Object.entries(nbtKeys)
        .filter(([k]) => k.toLowerCase().startsWith(partial))
        .map(([k, v]) => ({ l: k + ':', d: `${v.d} (${v.t})`, _nbt: true }))
        .slice(0, 15);
      if (results.length > 0) return results;
    }
  }

  // Commands where arg[1] is a selector and arg[2] is a subcommand (tag @s add, attribute @s ...)
  const SELECTOR_THEN_SUB = ['tag', 'ride'];
  if (SELECTOR_THEN_SUB.includes(cmd) && completed.length >= 2) {
    if (completed[1]?.startsWith('@') || completed[1]?.match(/^[A-Za-z0-9_]+$/)) {
      const actionKey = `${cmd}.action`;
      if (completed.length === 2) {
        const actionItems = filterByVersion(MC_AUTO[actionKey] || [], targetVersion);
        if (actionItems.length > 0) {
          if (!currentWord) return actionItems;
          return actionItems.filter(s => s.l.toLowerCase().startsWith(cw));
        }
      }
    }
  }

  // attribute @s <attribute_name> <action>: selector, then attribute name, then action
  if (cmd === 'attribute' && completed.length >= 2) {
    if (completed[1]?.startsWith('@') || completed[1]?.match(/^[A-Za-z0-9_]+$/)) {
      if (completed.length === 2) {
        // Show attribute names
        const cleanWord = cw.replace(/^minecraft:/, '');
        const attrs = filterByVersion(MC_AUTO._attributes || [], targetVersion);
        return attrs.filter(s => s.l.startsWith(cleanWord)).slice(0, 15);
      }
      if (completed.length === 3) {
        // Show actions (get/base/modifier)
        const actionItems = filterByVersion(MC_AUTO['attribute.action'] || [], targetVersion);
        if (!currentWord) return actionItems;
        return actionItems.filter(s => s.l.toLowerCase().startsWith(cw));
      }
    }
  }

  // team modify <team> <option> [value]: option at pos 3, value at pos 4
  if (cmd === 'team' && completed.length >= 2 && completed[1]?.toLowerCase() === 'modify') {
    if (completed.length === 3) {
      // After 'team modify <team> ' -> show options
      const optItems = filterByVersion(MC_AUTO['team.modify'] || [], targetVersion);
      if (!currentWord) return optItems;
      return optItems.filter(s => s.l.toLowerCase().startsWith(cw));
    }
    if (completed.length === 4) {
      // After 'team modify <team> color ' -> show values
      const opt = completed[3]?.toLowerCase();
      const valueKey = `team.modify.${opt}`;
      const valueItems = filterByVersion(MC_AUTO[valueKey] || [], targetVersion);
      if (valueItems.length > 0) {
        if (!currentWord) return valueItems;
        return valueItems.filter(s => s.l.toLowerCase().startsWith(cw));
      }
    }
  }

  // scoreboard objectives setdisplay <slot>: skip objective name
  if (cmd === 'scoreboard' && completed.length >= 3) {
    const sub1 = completed[1]?.toLowerCase();
    const sub2 = completed[2]?.toLowerCase();
    if (sub1 === 'objectives' && sub2 === 'setdisplay' && completed.length === 3) {
      const slots = SPECIAL_TYPE_COMPLETIONS.display_slot || [];
      return slots.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: '表示スロット' }));
    }
    if (sub1 === 'objectives' && sub2 === 'add' && completed.length === 4) {
      const criteria = SPECIAL_TYPE_COMPLETIONS.criteria || [];
      return criteria.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: '目的の基準' }));
    }
    if (sub1 === 'players' && sub2 === 'operation' && completed.length === 5) {
      const ops = SPECIAL_TYPE_COMPLETIONS.score_operation || [];
      return ops.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: 'スコア演算' }));
    }
  }

  // locate structure/biome: show list after subtype
  if (cmd === 'locate' && completed.length === 2) {
    const sub = completed[1]?.toLowerCase();
    if (sub === 'structure') {
      const items = filterByVersion(MC_AUTO['locate.structure'] || [], targetVersion);
      if (!currentWord) return items.slice(0, 15);
      return items.filter(s => s.l.toLowerCase().includes(cw));
    }
    if (sub === 'biome') {
      const items = filterByVersion(MC_AUTO['locate.biome'] || [], targetVersion);
      if (!currentWord) return items.slice(0, 15);
      return items.filter(s => s.l.toLowerCase().includes(cw));
    }
  }

  // item replace entity <target> <slot>: show slot names
  if (cmd === 'item' && completed.length >= 2 && completed[1]?.toLowerCase() === 'replace') {
    if (completed.length === 4) {
      const slots = SPECIAL_TYPE_COMPLETIONS.item_slot || [];
      return slots.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: 'スロット名' }));
    }
  }

  // advancement grant/revoke <target> <mode>: show modes
  if (cmd === 'advancement' && completed.length === 3) {
    const modes = ['everything','only','from','through','until'];
    return modes.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: '進捗モード' }));
  }

  // damage <target> <amount> <type>: show damage types
  if (cmd === 'damage' && completed.length === 3) {
    const types = SPECIAL_TYPE_COMPLETIONS.damage_type || [];
    return types.filter(s => s.includes(cw)).map(s => ({ l: s, d: 'ダメージタイプ' }));
  }

  // bossbar set <id> <property> [value]: property at pos 3, value at pos 4
  if (cmd === 'bossbar' && completed.length >= 2 && completed[1]?.toLowerCase() === 'set') {
    if (completed.length === 3) {
      // After 'bossbar set <id> ' -> show properties
      const propItems = filterByVersion(MC_AUTO['bossbar.set'] || [], targetVersion);
      if (!currentWord) return propItems;
      return propItems.filter(s => s.l.toLowerCase().startsWith(cw));
    }
    if (completed.length === 4) {
      // After 'bossbar set <id> color ' -> show color values etc.
      const prop = completed[3]?.toLowerCase();
      const valueKey = `bossbar.set.${prop}`;
      const valueItems = filterByVersion(MC_AUTO[valueKey] || [], targetVersion);
      if (valueItems.length > 0) {
        if (!currentWord) return valueItems;
        return valueItems.filter(s => s.l.toLowerCase().startsWith(cw));
      }
    }
  }

  // stopsound: skip selector, then offer sound_source, then sound
  if (cmd === 'stopsound' && completed.length === 2 && completed[1]?.startsWith('@')) {
    const sources = SPECIAL_TYPE_COMPLETIONS.sound_source || [];
    return sources.filter(s => s.startsWith(cw)).map(s => ({ l: s, d: 'サウンドソース' }));
  }
  if (cmd === 'stopsound' && completed.length === 3 && completed[1]?.startsWith('@')) {
    return stringsToAcItems(MC_AUTO._sounds_common, cw, 'サウンド');
  }

  // General: build context key from completed tokens
  let contextKey = cmd;
  if (completed.length >= 2) {
    const sub = completed[1].toLowerCase();
    if (MC_AUTO[`${cmd}.${sub}`]) contextKey = `${cmd}.${sub}`;
  }
  if (completed.length >= 3 && MC_AUTO[`${contextKey}.${completed[2]?.toLowerCase()}`]) {
    contextKey = `${contextKey}.${completed[2].toLowerCase()}`;
  }
  // 4th level context (e.g. team.modify.color -> team.modify.color)
  if (completed.length >= 4 && MC_AUTO[`${contextKey}.${completed[3]?.toLowerCase()}`]) {
    contextKey = `${contextKey}.${completed[3].toLowerCase()}`;
  }

  const items = filterByVersion(MC_AUTO[contextKey] || [], targetVersion);
  if (!currentWord) return items.slice(0, 15);
  return items.filter(s => s.l.toLowerCase().startsWith(cw));
}

// ========================================================================
// NBT Tag Schema (Entity-specific NBT fields for autocomplete)
// ========================================================================
const NBT_COMMON = {
  entity: {
    Air: { t: 'short', d: '呼吸可能時間(tick)' }, CustomName: { t: 'string', d: '表示名(JSONテキスト)' },
    CustomNameVisible: { t: 'byte', d: '常時名前表示(0/1)' }, Fire: { t: 'short', d: '炎上残り(tick)' },
    Glowing: { t: 'byte', d: '発光(0/1)' }, HasVisualFire: { t: 'byte', d: '見た目のみ炎上(0/1)' },
    Invulnerable: { t: 'byte', d: '無敵(0/1)' }, Motion: { t: 'list<double>', d: '[dx,dy,dz]' },
    NoGravity: { t: 'byte', d: '重力無効(0/1)' }, Passengers: { t: 'list<compound>', d: '騎乗エンティティ' },
    Pos: { t: 'list<double>', d: '[x,y,z]' }, Rotation: { t: 'list<float>', d: '[yaw,pitch]' },
    Silent: { t: 'byte', d: '無音(0/1)' }, Tags: { t: 'list<string>', d: 'タグ配列' },
    TicksFrozen: { t: 'int', d: '凍結tick' }, fall_distance: { t: 'double', d: '落下距離' },
    data: { t: 'compound', d: 'カスタムデータ' },
  },
  mob: {
    Health: { t: 'float', d: '体力' }, NoAI: { t: 'byte', d: 'AI無効(0/1)' },
    CanPickUpLoot: { t: 'byte', d: '装備拾得(0/1)' }, PersistenceRequired: { t: 'byte', d: 'デスポーン抑止(0/1)' },
    LeftHanded: { t: 'byte', d: '左利き(0/1)' }, equipment: { t: 'compound', d: '装備(1.21.5+)' },
    drop_chances: { t: 'compound', d: 'ドロップ率' }, DeathLootTable: { t: 'string', d: 'ルートテーブル' },
    leash: { t: 'compound', d: 'リード情報' },
  },
  breedable: {
    Age: { t: 'int', d: '年齢(負=子供)' }, ForcedAge: { t: 'int', d: '成長補正' },
    InLove: { t: 'int', d: '繁殖ハートtick' },
  },
  tameable: {
    Owner: { t: 'int[]', d: '飼い主UUID' }, Sitting: { t: 'byte', d: '座り(0/1)' },
  },
  angerable: {
    AngerTime: { t: 'int', d: '敵対残りtick' }, AngryAt: { t: 'int[]', d: '敵対対象UUID' },
  },
};
const NBT_ENTITIES = {
  armor_stand: { _inh: ['entity','mob'], DisabledSlots: { t:'int', d:'装備操作禁止ビットマスク' }, Invisible: { t:'byte', d:'透明(0/1)' }, Marker: { t:'byte', d:'極小ヒットボックス(0/1)' }, NoBasePlate: { t:'byte', d:'台座非表示(0/1)' }, ShowArms: { t:'byte', d:'腕表示(0/1)' }, Small: { t:'byte', d:'小型(0/1)' }, Pose: { t:'compound', d:'Head/Body/Arms/Legsの回転' } },
  creeper: { _inh: ['entity','mob'], ExplosionRadius: { t:'byte', d:'爆発半径' }, Fuse: { t:'short', d:'起爆tick(30)' }, ignited: { t:'byte', d:'着火(0/1)' }, powered: { t:'byte', d:'帯電(0/1)' } },
  zombie: { _inh: ['entity','mob'], CanBreakDoors: { t:'byte', d:'ドア破壊(0/1)' }, IsBaby: { t:'byte', d:'子供(0/1)' }, DrownedConversionTime: { t:'int', d:'溺死変換tick' } },
  skeleton: { _inh: ['entity','mob'], StrayConversionTime: { t:'int', d:'ストレイ化tick' } },
  zombie_villager: { _inh: ['entity','mob'], ConversionTime: { t:'int', d:'治療完了tick(-1=未治療)' }, VillagerData: { t:'compound', d:'職業データ(level/profession/type)' } },
  villager: { _inh: ['entity','mob','breedable'], VillagerData: { t:'compound', d:'職業データ' }, Xp: { t:'int', d:'村人経験値' }, Offers: { t:'compound', d:'取引データ' }, Inventory: { t:'list<compound>', d:'インベントリ(最大8)' }, Willing: { t:'byte', d:'繁殖意欲(0/1)' } },
  enderman: { _inh: ['entity','mob','angerable'], carriedBlockState: { t:'compound', d:'保持ブロック(Name/Properties)' } },
  piglin: { _inh: ['entity','mob'], IsBaby: { t:'byte', d:'子供(0/1)' }, IsImmuneToZombification: { t:'byte', d:'ゾンビ化耐性(0/1)' }, CannotHunt: { t:'byte', d:'ホグリン狩り禁止(0/1)' }, Inventory: { t:'list<compound>', d:'インベントリ' } },
  ender_dragon: { _inh: ['entity','mob'], DragonPhase: { t:'int', d:'行動フェーズ(0-10)' } },
  wither: { _inh: ['entity','mob'], Invul: { t:'int', d:'召喚無敵tick' } },
  shulker: { _inh: ['entity','mob'], AttachFace: { t:'byte', d:'付着面(0-5)' }, Color: { t:'byte', d:'色(0-16)' }, Peek: { t:'byte', d:'開閉量' } },
  bee: { _inh: ['entity','mob','breedable','angerable'], HasNectar: { t:'byte', d:'花粉所持(0/1)' }, HasStung: { t:'byte', d:'刺針済(0/1)' }, CannotEnterHiveTicks: { t:'int', d:'巣に戻れないtick' }, flower_pos: { t:'int[]', d:'記憶花座標' }, hive_pos: { t:'int[]', d:'巣座標' } },
  slime: { _inh: ['entity','mob'], Size: { t:'int', d:'サイズ(0-126)' } },
  magma_cube: { _inh: ['entity','mob'], Size: { t:'int', d:'サイズ(0-126)' } },
  phantom: { _inh: ['entity','mob'], size: { t:'int', d:'サイズ(0-64)' }, anchor_pos: { t:'int[]', d:'周回中心座標' } },
  wolf: { _inh: ['entity','mob','breedable','tameable','angerable'], CollarColor: { t:'byte', d:'首輪色(0-15)' }, variant: { t:'string', d:'バリアントID' } },
  cat: { _inh: ['entity','mob','breedable','tameable'], CollarColor: { t:'byte', d:'首輪色(0-15)' }, variant: { t:'string', d:'猫バリアントID' } },
  horse: { _inh: ['entity','mob','breedable'], Tame: { t:'byte', d:'調教済(0/1)' }, Temper: { t:'int', d:'なつき値(0-100)' }, Variant: { t:'int', d:'毛色/模様' } },
  sheep: { _inh: ['entity','mob','breedable'], Color: { t:'byte', d:'羊毛色(0-15)' }, Sheared: { t:'byte', d:'毛刈り済(0/1)' } },
  cow: { _inh: ['entity','mob','breedable'], variant: { t:'string', d:'バリアントID' } },
  chicken: { _inh: ['entity','mob','breedable'], EggLayTime: { t:'int', d:'産卵までtick' }, IsChickenJockey: { t:'byte', d:'ジョッキー(0/1)' } },
  pig: { _inh: ['entity','mob','breedable'] },
  goat: { _inh: ['entity','mob','breedable'], HasLeftHorn: { t:'byte', d:'左角(0/1)' }, HasRightHorn: { t:'byte', d:'右角(0/1)' }, IsScreamingGoat: { t:'byte', d:'叫ぶヤギ(0/1)' } },
  fox: { _inh: ['entity','mob','breedable'], Crouching: { t:'byte', d:'しゃがみ(0/1)' }, Sleeping: { t:'byte', d:'睡眠(0/1)' }, Type: { t:'string', d:'キツネ種ID' } },
  rabbit: { _inh: ['entity','mob','breedable'], RabbitType: { t:'int', d:'見た目バリアント' } },
  axolotl: { _inh: ['entity','mob','breedable'], FromBucket: { t:'byte', d:'バケツ由来(0/1)' }, Variant: { t:'int', d:'ウーパールーパー種ID' } },
  frog: { _inh: ['entity','mob','breedable'], variant: { t:'string', d:'種別(temperate/warm/cold)' } },
  allay: { _inh: ['entity','mob'], DuplicationCooldown: { t:'long', d:'複製クールダウン' }, Inventory: { t:'list<compound>', d:'回収アイテム' } },
  warden: { _inh: ['entity','mob'], anger: { t:'compound', d:'怒り値データ' } },
  item: { _inh: ['entity'], Item: { t:'compound', d:'アイテムデータ(id/count)' }, Age: { t:'short', d:'存在tick(-32768=無限)' }, PickupDelay: { t:'short', d:'拾得不可tick' } },
  arrow: { _inh: ['entity'], damage: { t:'double', d:'ダメージ値' }, pickup: { t:'byte', d:'拾得可否(0-2)' }, crit: { t:'byte', d:'クリティカル(0/1)' } },
};
function getNBTKeysForEntity(entityId) {
  const e = entityId ? entityId.replace(/^minecraft:/, '') : null;
  const spec = e && NBT_ENTITIES[e];
  const result = {};
  const visited = new Set();
  function addCommon(cat) {
    if (visited.has(cat) || !NBT_COMMON[cat]) return;
    visited.add(cat);
    Object.entries(NBT_COMMON[cat]).forEach(([k, v]) => { result[k] = v; });
  }
  if (spec) {
    if (spec._inh) spec._inh.forEach(addCommon);
    Object.entries(spec).forEach(([k, v]) => { if (k !== '_inh') result[k] = v; });
  } else {
    addCommon('entity'); addCommon('mob');
  }
  return result;
}

// ========================================================================
// Command Guide & Preview Data (30 commands)
// ========================================================================
const COMMAND_GUIDE = {
  give: { d: 'プレイヤーにアイテムを与えます', a: [{ n:'target', d:'対象(@s等)', t:'selector' }, { n:'item', d:'アイテムID', t:'item' }, { n:'count', d:'個数(省略可)', t:'int' }], p: '{target} に {item} を {count}個 与える', ex: ['give @s diamond 64','give @a golden_apple'] },
  summon: { d: 'エンティティを召喚します', a: [{ n:'entity', d:'エンティティID', t:'entity' }, { n:'pos', d:'座標(省略可)', t:'pos' }, { n:'nbt', d:'NBTデータ(省略可)', t:'nbt' }], p: '{pos} に {entity} を召喚', ex: ['summon zombie ~ ~ ~','summon creeper ~ ~ ~ {powered:1b}'] },
  effect: { d: 'ステータス効果を付与/解除します', a: [{ n:'action', d:'give/clear', t:'enum', o:['give','clear'] }, { n:'target', d:'対象', t:'selector' }, { n:'effect', d:'効果ID', t:'effect' }, { n:'seconds', d:'秒数', t:'int' }, { n:'amplifier', d:'レベル-1', t:'int' }], p: '{target} に {effect} Lv.{amplifier} を {seconds}秒 付与', ex: ['effect give @a speed 30 1','effect clear @s'] },
  tp: { d: 'テレポートさせます', a: [{ n:'target', d:'対象', t:'selector' }, { n:'dest', d:'座標 or 対象', t:'pos' }], p: '{target} を {dest} へテレポート', ex: ['tp @s ~ ~10 ~','tp @e[type=cow] @s'] },
  teleport: { d: 'テレポートさせます (tpと同じ)', a: [{ n:'target', d:'対象', t:'selector' }, { n:'dest', d:'座標 or 対象', t:'pos' }], p: '{target} を {dest} へテレポート', ex: ['teleport @s 0 64 0'] },
  execute: { d: '条件付きでコマンドを実行します', a: [{ n:'subcommand', d:'as/at/if/run等', t:'enum', o:['as','at','if','unless','run','store','positioned','facing'] }], p: '条件・文脈を変えてコマンド実行', ex: ['execute as @a run say hi','execute if score @s val matches 1.. run say ok'] },
  scoreboard: { d: 'スコアボード（変数）を管理します', a: [{ n:'category', d:'objectives/players', t:'enum', o:['objectives','players'] }, { n:'action', d:'add/set/remove等', t:'string' }], p: 'スコアボード操作: {category} {action}', ex: ['scoreboard objectives add hp health','scoreboard players set @s score 10'] },
  title: { d: '画面にテキストを表示します', a: [{ n:'target', d:'対象', t:'selector' }, { n:'slot', d:'title/subtitle/actionbar', t:'enum', o:['title','subtitle','actionbar','times','clear'] }, { n:'text', d:'JSONテキスト', t:'json' }], p: '{target} の {slot} にテキスト表示', ex: ['title @a title {"text":"Hello!","color":"gold"}'] },
  tellraw: { d: 'チャットに装飾付きメッセージを表示', a: [{ n:'target', d:'対象', t:'selector' }, { n:'message', d:'JSONテキスト', t:'json' }], p: '{target} にメッセージ送信', ex: ['tellraw @a {"text":"Hi","color":"green"}'] },
  bossbar: { d: 'ボスバーを作成・操作します', a: [{ n:'action', d:'add/set/remove/list', t:'enum', o:['add','set','remove','list','get'] }, { n:'id', d:'バーID', t:'id' }], p: 'ボスバー {id} を {action}', ex: ['bossbar add ns:bar "Timer"','bossbar set ns:bar value 50'] },
  team: { d: 'チームを管理します', a: [{ n:'action', d:'add/join/leave/modify', t:'enum', o:['add','join','leave','modify','remove','list'] }, { n:'team', d:'チーム名', t:'string' }], p: 'チーム {team} を {action}', ex: ['team add red','team join red @s'] },
  particle: { d: 'パーティクルを表示します', a: [{ n:'name', d:'パーティクル名', t:'particle' }, { n:'pos', d:'座標', t:'pos' }, { n:'delta', d:'拡散(dx dy dz)', t:'vec3' }, { n:'speed', d:'速度', t:'float' }, { n:'count', d:'個数', t:'int' }], p: '{pos} に {name} を {count}個 表示', ex: ['particle flame ~ ~1 ~ 0.2 0.2 0.2 0.05 20'] },
  playsound: { d: 'サウンドを再生します', a: [{ n:'sound', d:'サウンドID', t:'sound' }, { n:'source', d:'カテゴリ', t:'enum', o:['master','music','record','weather','block','hostile','neutral','player','ambient','voice'] }, { n:'target', d:'対象', t:'selector' }], p: '{target} に {sound} を再生', ex: ['playsound minecraft:entity.experience_orb.pickup master @a'] },
  setblock: { d: '指定座標にブロックを設置します', a: [{ n:'pos', d:'座標(x y z)', t:'pos' }, { n:'block', d:'ブロックID', t:'block' }, { n:'mode', d:'モード(省略可)', t:'enum', o:['replace','destroy','keep'] }], p: '{pos} を {block} に設置', ex: ['setblock ~ ~-1 ~ stone','setblock 0 64 0 air destroy'] },
  fill: { d: '範囲をブロックで埋めます', a: [{ n:'from', d:'始点(x y z)', t:'pos' }, { n:'to', d:'終点(x y z)', t:'pos' }, { n:'block', d:'ブロックID', t:'block' }, { n:'mode', d:'モード(省略可)', t:'enum', o:['replace','destroy','keep','hollow','outline'] }], p: '{from}~{to} を {block} で fill', ex: ['fill ~-5 ~ ~-5 ~5 ~3 ~5 stone hollow'] },
  clone: { d: '範囲のブロックをコピーします', a: [{ n:'from', d:'始点', t:'pos' }, { n:'to', d:'終点', t:'pos' }, { n:'dest', d:'コピー先', t:'pos' }], p: '{from}~{to} を {dest} にコピー', ex: ['clone 0 60 0 10 70 10 100 60 100'] },
  damage: { d: 'ダメージを与えます', a: [{ n:'target', d:'対象', t:'selector' }, { n:'amount', d:'ダメージ量', t:'float' }, { n:'type', d:'ダメージタイプ(省略可)', t:'damage_type' }], p: '{target} に {amount} ダメージ ({type})', ex: ['damage @s 5 minecraft:magic'] },
  ride: { d: 'エンティティを乗降させます', a: [{ n:'target', d:'対象', t:'selector' }, { n:'action', d:'mount/dismount', t:'enum', o:['mount','dismount'] }, { n:'vehicle', d:'乗り物(mount時)', t:'selector' }], p: '{target} を {action}', ex: ['ride @s mount @e[type=horse,limit=1]'] },
  item: { d: 'アイテムを操作・置換します', a: [{ n:'action', d:'replace/modify', t:'enum', o:['replace','modify'] }, { n:'type', d:'entity/block', t:'string' }], p: 'アイテム操作: {action} {type}', ex: ['item replace entity @s weapon.mainhand with diamond_sword'] },
  attribute: { d: '属性（HP、速度、攻撃力等）を変更します', a: [{ n:'target', d:'対象', t:'selector' }, { n:'attr', d:'属性名(max_health,movement_speed等)', t:'attribute' }, { n:'action', d:'base set/base get/modifier add/modifier remove', t:'string' }], p: '{target} の {attr} を操作', ex: ['attribute @s minecraft:max_health base set 40','attribute @s minecraft:movement_speed base set 0.15','attribute @s minecraft:scale base set 2.0','attribute @s minecraft:movement_speed modifier add mypack:buff 0.05 add_value'] },
  schedule: { d: '関数を遅延実行します', a: [{ n:'action', d:'function/clear', t:'enum', o:['function','clear'] }, { n:'function', d:'関数ID', t:'function' }, { n:'time', d:'遅延(1s,20t)', t:'time' }], p: '{time} 後に {function} を実行', ex: ['schedule function ns:tick 1s'] },
  forceload: { d: 'チャンクを強制読み込みします', a: [{ n:'action', d:'add/remove/query', t:'enum', o:['add','remove','query'] }, { n:'pos', d:'座標(XZ)', t:'pos' }], p: 'チャンクの強制読み込みを {action}', ex: ['forceload add ~ ~'] },
  worldborder: { d: 'ワールドボーダーを設定します', a: [{ n:'action', d:'set/add/center/get', t:'enum', o:['set','add','center','get','warning','damage'] }, { n:'value', d:'値', t:'float' }], p: 'ボーダーを {action} {value}', ex: ['worldborder set 100 10','worldborder center 0 0'] },
  random: { d: '乱数を生成します', a: [{ n:'action', d:'value/roll/reset', t:'enum', o:['value','roll','reset'] }, { n:'range', d:'範囲(min..max)', t:'range' }], p: '{range} で乱数 ({action})', ex: ['random value 1..100'] },
  tag: { d: 'エンティティにタグを付け外しします。タグはセレクターの[tag=xxx]で使えます', a: [{ n:'target', d:'対象', t:'selector' }, { n:'action', d:'add/remove/list', t:'enum', o:['add','remove','list'] }, { n:'name', d:'タグ名(自由に命名可)', t:'string' }], p: '{target} のタグ {name} を {action}', ex: ['tag @a add my_tag','tag @s remove my_tag','tag @s list','execute as @a[tag=my_tag] run say タグ持ち','execute as @a[tag=!my_tag] run tag @s add my_tag'] },
  loot: { d: 'ルートテーブルからアイテム生成', a: [{ n:'target', d:'give/spawn/insert/replace', t:'enum', o:['give','spawn','insert','replace'] }, { n:'source', d:'loot/kill/mine', t:'string' }], p: 'ルートテーブルからアイテム生成: {target}', ex: ['loot give @s loot minecraft:chests/simple_dungeon'] },
  kill: { d: 'エンティティを消去します', a: [{ n:'target', d:'対象', t:'selector' }], p: '{target} をキル', ex: ['kill @e[type=zombie]','kill @e[type=!player]'] },
  gamemode: { d: 'ゲームモードを変更します', a: [{ n:'mode', d:'モード', t:'enum', o:['survival','creative','adventure','spectator'] }, { n:'target', d:'対象(省略可)', t:'selector' }], p: '{target} を {mode} モードに変更', ex: ['gamemode creative @s'] },
  gamerule: { d: 'ゲームルールを設定します', a: [{ n:'rule', d:'ルール名', t:'gamerule' }, { n:'value', d:'true/false or 数値', t:'string' }], p: 'ルール {rule} = {value}', ex: ['gamerule keepInventory true','gamerule randomTickSpeed 100'] },
  clear: { d: 'インベントリからアイテムを除去します', a: [{ n:'target', d:'対象', t:'selector' }, { n:'item', d:'アイテム(省略=全部)', t:'item' }, { n:'count', d:'個数(省略=全部)', t:'int' }], p: '{target} から {item} を {count}個 除去', ex: ['clear @s diamond 10','clear @a'] },
  data: { d: 'エンティティ/ブロックのNBTを読み書きします', a: [{ n:'action', d:'get/merge/modify/remove', t:'enum', o:['get','merge','modify','remove'] }, { n:'type', d:'entity/block/storage', t:'enum', o:['entity','block','storage'] }, { n:'target', d:'対象/座標', t:'string' }, { n:'path', d:'NBTパス(省略可)', t:'string' }], p: '{type} {target} のデータを {action}', ex: ['data get entity @s Pos','data merge entity @s {Invulnerable:1b}','data modify storage ns:temp val set value 1'] },
  function: { d: '他のmcfunction関数を呼び出します', a: [{ n:'function_id', d:'名前空間:パス', t:'function' }], p: '関数 {function_id} を呼び出し', ex: ['function mypack:init','function mypack:game/start'] },
  enchant: { d: 'エンチャントを付与します', a: [{ n:'target', d:'対象', t:'selector' }, { n:'enchantment', d:'エンチャントID', t:'enchantment' }, { n:'level', d:'レベル(省略=1)', t:'int' }], p: '{target} に {enchantment} Lv.{level}', ex: ['enchant @s sharpness 5','enchant @a mending'] },
  experience: { d: '経験値を操作します (xpと同じ)', a: [{ n:'action', d:'add/set/query', t:'enum', o:['add','set','query'] }, { n:'target', d:'対象', t:'selector' }, { n:'amount', d:'量', t:'int' }], p: '{target} の経験値を {action} {amount}', ex: ['experience add @s 10 levels','experience set @s 0 points'] },
  xp: { d: '経験値を操作します (experienceと同じ)', a: [{ n:'action', d:'add/set/query', t:'enum', o:['add','set','query'] }, { n:'target', d:'対象', t:'selector' }, { n:'amount', d:'量', t:'int' }], p: '{target} のXPを {action} {amount}', ex: ['xp add @s 30 levels'] },
  difficulty: { d: '難易度を設定します', a: [{ n:'difficulty', d:'難易度', t:'enum', o:['peaceful','easy','normal','hard'] }], p: '難易度を {difficulty} に設定', ex: ['difficulty hard'] },
  weather: { d: '天候を変更します', a: [{ n:'weather', d:'天候', t:'enum', o:['clear','rain','thunder'] }, { n:'duration', d:'秒数(省略可)', t:'int' }], p: '天候を {weather} に変更', ex: ['weather clear','weather rain 600'] },
  time: { d: 'ゲーム内時間を操作します', a: [{ n:'action', d:'set/add/query', t:'enum', o:['set','add','query'] }, { n:'value', d:'時間値', t:'time' }], p: 'ゲーム時間を {action} {value}', ex: ['time set day','time add 1000','time query daytime'] },
  locate: { d: '構造物やバイオームの位置を検索します', a: [{ n:'type', d:'structure/biome/poi', t:'enum', o:['structure','biome','poi'] }, { n:'name', d:'名前', t:'string' }], p: '{type} {name} を検索', ex: ['locate structure minecraft:village_plains','locate biome minecraft:cherry_grove'] },
  advancement: { d: '進捗を付与/取り消します', a: [{ n:'action', d:'grant/revoke', t:'enum', o:['grant','revoke'] }, { n:'target', d:'対象', t:'selector' }, { n:'mode', d:'everything/only/from/through/until', t:'string' }], p: '{target} の進捗を {action}', ex: ['advancement grant @s only mypack:my_adv','advancement revoke @a everything'] },
  trigger: { d: 'トリガーの値を操作します (プレイヤーが実行)', a: [{ n:'objective', d:'目的名', t:'string' }, { n:'action', d:'add/set(省略可)', t:'enum', o:['add','set'] }, { n:'value', d:'値(省略可)', t:'int' }], p: 'トリガー {objective} を操作', ex: ['trigger my_trigger','trigger my_trigger set 1'] },
  reload: { d: 'データパックを再読み込みします', a: [], p: 'データパックをリロード', ex: ['reload'] },
  say: { d: 'チャットにメッセージを表示', a: [{ n:'message', d:'メッセージ', t:'string' }], p: 'メッセージ送信', ex: ['say Hello World','say ゲーム開始！'] },
};

// Set of all known item IDs for validation
const MC_ITEM_SET = new Set(MC_AUTO._items);
const MC_ENTITY_SET = new Set(MC_AUTO._entities);
const MC_EFFECT_SET = new Set(MC_AUTO._effects);

function validateMcfunctionLine(line, lineNum, targetVersion) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Handle $ prefix (macro lines in 1.20.2+)
  const isMacro = trimmed.startsWith('$');
  const cmdLine = isMacro ? trimmed.substring(1).trim() : trimmed;
  const tokens = cmdLine.split(/\s+/);
  const cmd = tokens[0]?.toLowerCase();

  if (!cmd) return null;

  // Check for leading slash (not needed in mcfunction)
  if (trimmed.startsWith('/')) {
    return { line: lineNum, msg: '.mcfunction では先頭の "/" は不要です', type: 'warning',
      fix: { label: '"/" を削除', apply: (l) => l.replace(/^\s*\//, '') } };
  }

  // Check for fullwidth spaces
  if (/\u3000/.test(line)) {
    return { line: lineNum, msg: '全角スペースが含まれています', type: 'error',
      fix: { label: '全角→半角スペースに変換', apply: (l) => l.replace(/\u3000/g, ' ') } };
  }

  // Check macro version compatibility
  if (isMacro && targetVersion && !versionAtLeast(targetVersion, '1.20.2')) {
    return { line: lineNum, msg: `マクロ($)は 1.20.2 以降で使用可能です（現在: ${targetVersion}）`, type: 'error' };
  }

  // Legacy/removed command detection with migration suggestions
  const LEGACY_COMMANDS = {
    entitydata: { replacement: 'data merge entity', msg: '"entitydata" は削除されました — "data merge entity" を使ってください' },
    testfor: { replacement: 'execute if entity', msg: '"testfor" は削除されました — "execute if entity" を使ってください' },
    testforblock: { replacement: 'execute if block', msg: '"testforblock" は削除されました — "execute if block" を使ってください' },
    testforblocks: { replacement: 'execute if blocks', msg: '"testforblocks" は削除されました — "execute if blocks" を使ってください' },
    blockdata: { replacement: 'data merge block', msg: '"blockdata" は削除されました — "data merge block" を使ってください' },
    stats: { replacement: 'execute store', msg: '"stats" は削除されました — "execute store" を使ってください' },
    toggledownfall: { replacement: 'weather', msg: '"toggledownfall" は削除されました — "weather clear/rain/thunder" を使ってください' },
  };
  if (LEGACY_COMMANDS[cmd]) {
    const lc = LEGACY_COMMANDS[cmd];
    return { line: lineNum, msg: lc.msg, type: 'error',
      fix: { label: `${lc.replacement} に変更`, apply: (l) => l.replace(new RegExp(`\\b${cmd}\\b`, 'i'), lc.replacement) } };
  }

  // 'scoreboard players tag' → 'tag' migration
  if (cmd === 'scoreboard' && tokens[1]?.toLowerCase() === 'players' && tokens[2]?.toLowerCase() === 'tag') {
    return { line: lineNum, msg: '"scoreboard players tag" は削除されました — "tag" コマンドを使ってください', type: 'error',
      fix: { label: '"tag" コマンドに変更', apply: (l) => l.replace(/scoreboard\s+players\s+tag\s*/i, 'tag ') } };
  }

  // Check if command exists at all
  if (!MC_ALL_COMMANDS.has(cmd)) {
    // Try to suggest the closest known command
    const similar = MC_AUTO._root.find(c => {
      const d = cmd.length > 3 ? 2 : 1;
      let diff = 0;
      const a = c.l, b = cmd;
      if (Math.abs(a.length - b.length) > d) return false;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) diff++;
      }
      return diff <= d;
    });
    const hint = similar ? ` — もしかして: ${similar.l}` : ' — コマンドのスペルを確認してください';
    return { line: lineNum, msg: `不明なコマンド: "${cmd}"${hint}`, type: 'error',
      fix: similar ? { label: `"${similar.l}" に修正`, apply: (l) => l.replace(new RegExp(`\\b${cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), similar.l) } : undefined };
  }

  // Check version-specific command availability
  if (targetVersion) {
    const cmdEntry = MC_AUTO._root.find(c => c.l === cmd);
    if (cmdEntry) {
      if (cmdEntry.v && !versionAtLeast(targetVersion, cmdEntry.v)) {
        return { line: lineNum, msg: `"${cmd}" は バージョン ${cmdEntry.v} 以降で使えます（現在: ${targetVersion}）`, type: 'error' };
      }
      if (cmdEntry.rm && versionAtLeast(targetVersion, cmdEntry.rm)) {
        return { line: lineNum, msg: `"${cmd}" は バージョン ${cmdEntry.rm} で削除されました（現在: ${targetVersion}）`, type: 'error' };
      }
    }
  }

  // Check unmatched brackets
  let squareDepth = 0, curlyDepth = 0;
  for (const ch of trimmed) {
    if (ch === '[') squareDepth++;
    if (ch === ']') squareDepth--;
    if (ch === '{') curlyDepth++;
    if (ch === '}') curlyDepth--;
    if (squareDepth < 0) return { line: lineNum, msg: '"]" に対応する "[" がありません — 閉じカッコが多すぎます', type: 'error' };
    if (curlyDepth < 0) return { line: lineNum, msg: '"}" に対応する "{" がありません — 閉じカッコが多すぎます', type: 'error' };
  }
  if (squareDepth !== 0) return { line: lineNum, msg: '"[" が閉じられていません — "]" を追加してください', type: 'error' };
  if (curlyDepth !== 0) return { line: lineNum, msg: '"{" が閉じられていません — "}" を追加してください', type: 'error' };

  // Check selector format - version-aware for @n
  if (targetVersion && !versionAtLeast(targetVersion, '1.21')) {
    const nSelectorMatch = trimmed.match(/@n(?:\[|\s|$)/);
    if (nSelectorMatch) {
      return { line: lineNum, msg: `@n セレクターは 1.21 以降で使用可能です（現在: ${targetVersion}）`, type: 'warning' };
    }
    const selectorMatch = trimmed.match(/@[^aeprs\s\[]/);
    if (selectorMatch) {
      return { line: lineNum, msg: `不正なセレクター: ${selectorMatch[0]} — 使えるのは @a/@e/@p/@r/@s です`, type: 'warning' };
    }
  } else {
    const selectorMatch = trimmed.match(/@[^aeprsn\s\[]/);
    if (selectorMatch) {
      return { line: lineNum, msg: `不正なセレクター: ${selectorMatch[0]} — 使えるのは @a/@e/@p/@r/@s/@n です`, type: 'warning' };
    }
  }

  // Validate item IDs for give/clear commands
  if ((cmd === 'give' || cmd === 'clear') && tokens.length >= 3) {
    const itemArg = tokens[2].toLowerCase().replace(/^minecraft:/, '').split('[')[0].split('{')[0];
    if (itemArg && !isMacro && !itemArg.startsWith('$') && !MC_ITEM_SET.has(itemArg) && itemArg !== '*') {
      return { line: lineNum, msg: `アイテムID "${itemArg}" は見つかりません — スペルを確認するか、補完機能(Tab)を使ってください`, type: 'warning' };
    }
  }

  // Validate entity IDs for summon
  if (cmd === 'summon' && tokens.length >= 2) {
    const entityArg = tokens[1].toLowerCase().replace(/^minecraft:/, '');
    if (entityArg && !isMacro && !entityArg.startsWith('$') && !MC_ENTITY_SET.has(entityArg)) {
      return { line: lineNum, msg: `エンティティID "${entityArg}" は見つかりません — summon の後にはエンティティ名を指定してください`, type: 'warning' };
    }
  }

  // Validate effect IDs
  if (cmd === 'effect' && tokens.length >= 3) {
    const sub = tokens[1]?.toLowerCase();
    let effectIdx = (sub === 'give' || sub === 'clear') ? 3 : 2;
    if (tokens[effectIdx]) {
      const effectArg = tokens[effectIdx].toLowerCase().replace(/^minecraft:/, '');
      if (effectArg && !isMacro && !effectArg.startsWith('$') && !effectArg.startsWith('@') && !MC_EFFECT_SET.has(effectArg)) {
        return { line: lineNum, msg: `エフェクトID "${effectArg}" は見つかりません — 補完機能(Tab)で正しいIDを選べます`, type: 'warning' };
      }
    }
  }

  // Check execute: must end with 'run <command>' (only warn if > 3 tokens and no 'run')
  // BUT: execute ending with if/unless conditions is valid (returns success/fail without run)
  if (cmd === 'execute' && tokens.length >= 4 && !trimmed.includes(' run ') && !trimmed.endsWith(' run')) {
    // Allow execute chains ending with condition subcommands (if/unless) — these return success/fail
    const hasCondition = /\b(if|unless)\s+\S+/.test(trimmed);
    // Allow execute chains ending with store (stores a result)
    const hasStore = /\bstore\s+\S+/.test(trimmed);
    if (!hasCondition && !hasStore) {
      return { line: lineNum, msg: 'execute に "run" がありません — execute ... run <コマンド> の形式で書いてください', type: 'warning' };
    }
  }
  // Check execute run with nothing after
  if (cmd === 'execute' && /\brun\s*$/.test(trimmed)) {
    return { line: lineNum, msg: '"run" の後に実行するコマンドがありません', type: 'error' };
  }
  // Check that the command after 'run' is valid
  if (cmd === 'execute') {
    const runMatch = trimmed.match(/\brun\s+(\S+)/);
    if (runMatch) {
      const runCmd = runMatch[1].toLowerCase();
      // 'run' の後に execute サブコマンドを書いてしまうミス
      // 注: 'summon' はexecuteサブコマンドかつ独立コマンドなので除外
      const execOnlySubs = new Set(['as', 'at', 'if', 'unless', 'positioned', 'rotated', 'facing', 'in', 'store', 'anchored', 'align', 'on']);
      if (execOnlySubs.has(runCmd)) {
        return { line: lineNum, msg: `"run ${runCmd}" — "run" の後にはコマンドを書いてください。"${runCmd}" は execute サブコマンドです`, type: 'error',
          fix: { label: `"run" を削除して "${runCmd}" を直接使用`, apply: (l) => l.replace(/\brun\s+/, '') } };
      }
      if (!MC_ALL_COMMANDS.has(runCmd)) {
        const similar = MC_AUTO._root.find(c => {
          let diff = 0;
          const a = c.l, b = runCmd;
          if (Math.abs(a.length - b.length) > 2) return false;
          for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i] !== b[i]) diff++; }
          return diff <= 2;
        });
        const hint = similar ? ` — もしかして: ${similar.l}` : '';
        return { line: lineNum, msg: `"run" 後の不明なコマンド: "${runCmd}"${hint}`, type: 'error' };
      }
    }
  }

  // Detect connected coordinates without spaces (e.g. ~1~2~3 → ~1 ~2 ~3)
  const connectedCoordMatch = trimmed.match(/([~^]-?\d*\.?\d+)([~^]-?\d*\.?\d+)([~^]-?\d*\.?\d+)/);
  if (connectedCoordMatch) {
    const fixed = `${connectedCoordMatch[1]} ${connectedCoordMatch[2]} ${connectedCoordMatch[3]}`;
    return { line: lineNum, msg: `座標にスペースがありません: "${connectedCoordMatch[0]}" → "${fixed}"`, type: 'error',
      fix: { label: 'スペースを挿入', apply: (l) => l.replace(connectedCoordMatch[0], fixed) } };
  }

  // Detect comma-separated coordinates (e.g. 1,2,3 → 1 2 3)
  if ((cmd === 'tp' || cmd === 'teleport' || cmd === 'setblock' || cmd === 'fill' || cmd === 'summon' || cmd === 'clone' || cmd === 'particle') && tokens.length >= 2) {
    for (let i = 1; i < tokens.length; i++) {
      const commaCoord = tokens[i].match(/^(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      if (commaCoord) {
        return { line: lineNum, msg: `座標はカンマではなくスペースで区切ります: "${tokens[i]}" → "${commaCoord[1]} ${commaCoord[2]} ${commaCoord[3]}"`, type: 'error',
          fix: { label: 'カンマ → スペースに変換', apply: (l) => l.replace(tokens[i], `${commaCoord[1]} ${commaCoord[2]} ${commaCoord[3]}`) } };
      }
    }
  }

  // Check for mixed coordinate types (^ and ~ mixed) — only for non-execute commands
  // execute chains can legitimately use different coordinate types across subcommands
  // e.g. execute positioned ~ ~ ~ run tp @s ^ ^ ^1
  if (cmd !== 'execute') {
    const coordMatches = trimmed.match(/[~^][^\s]*/g);
    if (coordMatches && coordMatches.length >= 2) {
      const hasRelative = coordMatches.some(c => c.startsWith('~'));
      const hasLocal = coordMatches.some(c => c.startsWith('^'));
      if (hasRelative && hasLocal) {
        return { line: lineNum, msg: '~(相対座標)と^(ローカル座標)が混在しています — どちらか一方に統一してください', type: 'error' };
      }
    }
  }

  // Validate scoreboard subcommand structure + argument count
  if (cmd === 'scoreboard' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    if (sub !== 'objectives' && sub !== 'players') {
      return { line: lineNum, msg: `scoreboard のサブコマンドは "objectives" か "players" です（"${sub}" は不正）`, type: 'warning' };
    }
    if (sub === 'objectives') {
      const action = tokens[2]?.toLowerCase();
      const validActions = new Set(['list', 'add', 'remove', 'setdisplay', 'modify']);
      if (action && !validActions.has(action)) {
        return { line: lineNum, msg: `scoreboard objectives のサブコマンドが不正: "${action}" — list/add/remove/setdisplay/modify`, type: 'warning' };
      }
      if (action === 'add' && tokens.length < 5) {
        return { line: lineNum, msg: 'scoreboard objectives add: 引数不足 — scoreboard objectives add <名前> <基準> [表示名]', type: 'error' };
      }
      if (action === 'remove' && tokens.length < 4) {
        return { line: lineNum, msg: 'scoreboard objectives remove: 引数不足 — scoreboard objectives remove <名前>', type: 'error' };
      }
    }
    if (sub === 'players') {
      const action = tokens[2]?.toLowerCase();
      const validActions = new Set(['list', 'get', 'set', 'add', 'remove', 'reset', 'enable', 'operation', 'display', 'numberformat']);
      if (action && !validActions.has(action)) {
        return { line: lineNum, msg: `scoreboard players のサブコマンドが不正: "${action}" — list/get/set/add/remove/reset/enable/operation`, type: 'warning' };
      }
      if ((action === 'set' || action === 'add' || action === 'remove') && tokens.length < 5) {
        return { line: lineNum, msg: `scoreboard players ${action}: 引数不足 — scoreboard players ${action} <対象> <目的> <値>`, type: 'error' };
      }
      if ((action === 'get' || action === 'enable') && tokens.length < 5) {
        return { line: lineNum, msg: `scoreboard players ${action}: 引数不足 — scoreboard players ${action} <対象> <目的>`, type: 'error' };
      }
      if (action === 'operation' && tokens.length < 7) {
        return { line: lineNum, msg: 'scoreboard players operation: 引数不足 — scoreboard players operation <対象> <目的> <演算子> <ソース対象> <ソース目的>', type: 'error' };
      }
      if (action === 'operation' && tokens.length >= 6) {
        const op = tokens[5];
        const validOps = new Set(['+=', '-=', '*=', '/=', '%=', '=', '<', '>', '><']);
        if (!validOps.has(op)) {
          return { line: lineNum, msg: `scoreboard players operation: 不正な演算子 "${op}" — 使用可能: +=, -=, *=, /=, %=, =, <, >, ><`, type: 'error' };
        }
      }
    }
  }

  // Validate effect subcommand
  if (cmd === 'effect' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    if (sub !== 'give' && sub !== 'clear' && !sub.startsWith('@')) {
      return { line: lineNum, msg: `effect のサブコマンドは "give" か "clear" です（"${sub}" は不正）`, type: 'warning' };
    }
  }

  // Validate give command has required arguments
  if (cmd === 'give' && tokens.length < 3) {
    return { line: lineNum, msg: 'give: 引数が不足 — give <対象> <アイテム> [数量] の形式', type: 'error' };
  }

  // Validate summon has entity argument
  if (cmd === 'summon' && tokens.length < 2) {
    return { line: lineNum, msg: 'summon: エンティティIDが必要です — summon <エンティティ> [座標]', type: 'error' };
  }

  // Validate setblock has enough arguments
  if (cmd === 'setblock' && tokens.length < 5) {
    return { line: lineNum, msg: 'setblock: 引数が不足 — setblock <x> <y> <z> <ブロック>', type: 'error' };
  }

  // Validate fill has enough arguments
  if (cmd === 'fill' && tokens.length < 8) {
    return { line: lineNum, msg: 'fill: 引数が不足 — fill <x1> <y1> <z1> <x2> <y2> <z2> <ブロック>', type: 'error' };
  }

  // Validate tp/teleport has target
  if ((cmd === 'tp' || cmd === 'teleport') && tokens.length < 2) {
    return { line: lineNum, msg: `${cmd}: 対象が必要です — ${cmd} <対象> <座標/対象>`, type: 'error' };
  }

  // Info: suggest using minecraft: namespace prefix
  if ((cmd === 'give' || cmd === 'summon' || cmd === 'setblock' || cmd === 'fill') && tokens.length >= 2) {
    for (let i = 1; i < tokens.length; i++) {
      const tok = tokens[i];
      // Check if it looks like an ID without namespace
      if (/^[a-z_]+$/.test(tok) && (MC_ITEM_SET.has(tok) || MC_ENTITY_SET.has(tok)) && !tok.startsWith('@') && !tok.startsWith('~') && !tok.startsWith('^') && !/^\d/.test(tok)) {
        // Only suggest for the appropriate argument position
        if ((cmd === 'give' && i === 2) || (cmd === 'summon' && i === 1) ||
            (cmd === 'setblock' && i === 4) || (cmd === 'fill' && i === 7)) {
          return { line: lineNum, msg: `"minecraft:" 名前空間を付けることを推奨: minecraft:${tok}`, type: 'info',
            fix: { label: `minecraft:${tok} に変更`, apply: (l) => l.replace(new RegExp(`\\b${tok}\\b`), `minecraft:${tok}`) } };
        }
      }
    }
  }

  // Validate JSON text in tellraw/title (basic check)
  if ((cmd === 'tellraw' || cmd === 'title') && trimmed.includes('{')) {
    const jsonStart = trimmed.indexOf('{', trimmed.indexOf(cmd));
    if (jsonStart >= 0) {
      const jsonPart = trimmed.substring(jsonStart);
      // Check for common JSON mistakes — only flag single-quoted keys, not values
      if (/'\s*text\s*'\s*:/.test(jsonPart) || /'\s*color\s*'\s*:/.test(jsonPart) || /'\s*bold\s*'\s*:/.test(jsonPart)) {
        return { line: lineNum, msg: 'JSONではシングルクォート(\')ではなくダブルクォート(")を使用してください', type: 'error',
          fix: { label: "' → \" に変換", apply: (l) => l.replace(/'/g, '"') } };
      }
      if (/\{[^}]*text\s*:/.test(jsonPart) && !/\{[^}]*"text"\s*:/.test(jsonPart)) {
        return { line: lineNum, msg: 'JSONのキーはダブルクォートで囲む必要があります — 例: {"text":"hello"}', type: 'error' };
      }
      // Trailing comma before }
      if (/,\s*\}/.test(jsonPart)) {
        return { line: lineNum, msg: 'JSONの最後にカンマがあります — "}" の前のカンマ(,)を削除してください', type: 'error',
          fix: { label: '末尾カンマを削除', apply: (l) => l.replace(/,(\s*\})/g, '$1') } };
      }
    }
  }

  // Validate selector argument values
  const selectorBlocks = trimmed.match(/@[aeprsn]\[([^\]]*)\]/g);
  if (selectorBlocks) {
    for (const sel of selectorBlocks) {
      const inner = sel.match(/@[aeprsn]\[([^\]]*)\]/)?.[1];
      if (!inner) continue;
      // Check for negative distance
      if (/distance\s*=\s*-/.test(inner)) {
        return { line: lineNum, msg: 'distance の値は負にできません — 0以上の数値を指定してください', type: 'error' };
      }
      // Check limit with 0
      if (/limit\s*=\s*0(?!\.)/.test(inner)) {
        return { line: lineNum, msg: 'limit=0 は無効です — 1以上の数値を指定してください', type: 'error' };
      }
      // Check for duplicate selector keys
      // Note: type, gamemode, name CAN be duplicated with negation (e.g. type=!zombie,type=!skeleton)
      const keyMatches = inner.match(/([a-z_]+)\s*=/g);
      if (keyMatches) {
        const keys = keyMatches.map(k => k.replace(/\s*=/, ''));
        const noDupKeys = ['distance', 'limit', 'sort', 'level'];
        for (const k of noDupKeys) {
          if (keys.filter(kk => kk === k).length > 1) {
            return { line: lineNum, msg: `セレクター引数 "${k}" が重複しています — 同じ引数を2回指定できません`, type: 'warning' };
          }
        }
      }
      // Check for unknown selector args — strip scores={...} and advancements={...} inner content first
      const cleanedInner = inner.replace(/scores\s*=\s*\{[^}]*\}/g, 'scores={}').replace(/advancements\s*=\s*\{[^}]*\}/g, 'advancements={}');
      const allKeys = cleanedInner.match(/([a-z_]+)\s*=/g);
      if (allKeys) {
        const validKeys = new Set(['tag','scores','distance','type','name','limit','sort','level','gamemode','nbt','x','y','z','dx','dy','dz','predicate','x_rotation','y_rotation','team','advancements']);
        for (const km of allKeys) {
          const k = km.replace(/\s*=/, '');
          if (!validKeys.has(k)) {
            return { line: lineNum, msg: `不明なセレクター引数: "${k}" — tag, scores, distance, type 等を使用してください`, type: 'warning' };
          }
        }
      }
    }
  }

  // Validate coordinate format (basic)
  if ((cmd === 'tp' || cmd === 'teleport' || cmd === 'setblock' || cmd === 'fill' || cmd === 'summon') && tokens.length >= 3) {
    for (let i = 1; i < tokens.length && i < 8; i++) {
      const tok = tokens[i];
      if (/^[~^]/.test(tok)) {
        const numPart = tok.substring(1);
        if (numPart && !/^-?\d*\.?\d*$/.test(numPart)) {
          return { line: lineNum, msg: `座標値 "${tok}" のフォーマットが不正です — ~5, ~-3.5, ^2 のように数値を指定してください`, type: 'warning' };
        }
      }
    }
  }

  // Validate NBT basic syntax (check for common mistakes)
  if (trimmed.includes('{') && (cmd === 'summon' || cmd === 'data' || cmd === 'give')) {
    const nbtStart = trimmed.indexOf('{');
    const nbtPart = trimmed.substring(nbtStart);
    // Check for = instead of : in NBT
    if (/\{[^}]*[A-Za-z_]+=/.test(nbtPart) && !/\{[^}]*[A-Za-z_]+:/.test(nbtPart)) {
      return { line: lineNum, msg: 'NBTでは "=" ではなく ":" を使います — 例: {Health:20}', type: 'error',
        fix: { label: '= → : に変換', apply: (l) => { const i = l.indexOf('{'); return i >= 0 ? l.substring(0, i) + l.substring(i).replace(/(\w)=([^=])/g, '$1:$2') : l; } } };
    }
    // Check for missing value after key
    if (/[A-Za-z_]+:\s*[,}]/.test(nbtPart)) {
      return { line: lineNum, msg: 'NBTキーの後に値がありません — {Key:Value} の形式で指定してください', type: 'error' };
    }
  }

  // Validate attribute command structure
  if (cmd === 'attribute' && tokens.length >= 2 && tokens.length < 4) {
    return { line: lineNum, msg: 'attribute: 引数が不足 — attribute <対象> <属性名> <base/get/modifier> ...', type: 'error' };
  }

  // Validate tag command structure
  if (cmd === 'tag' && tokens.length >= 2 && tokens.length < 3) {
    return { line: lineNum, msg: 'tag: 引数が不足 — tag <対象> <add/remove/list> [タグ名]', type: 'error' };
  }
  if (cmd === 'tag' && tokens.length >= 3) {
    const sub = tokens[2]?.toLowerCase();
    if (sub !== 'add' && sub !== 'remove' && sub !== 'list') {
      return { line: lineNum, msg: `tag のサブコマンドは "add", "remove", "list" です（"${sub}" は不正）`, type: 'warning' };
    }
    if ((sub === 'add' || sub === 'remove') && tokens.length < 4) {
      return { line: lineNum, msg: `tag ${sub}: タグ名が必要です — tag <対象> ${sub} <タグ名>`, type: 'error' };
    }
  }

  // Validate schedule subcommand and time format
  if (cmd === 'schedule' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    if (sub !== 'function' && sub !== 'clear') {
      return { line: lineNum, msg: `schedule のサブコマンドは "function" か "clear" です（"${sub}" は不正）`, type: 'warning' };
    }
    if (sub === 'function' && tokens.length >= 4) {
      const timeArg = tokens[3];
      if (timeArg && !/^\d+[tsd]?$/.test(timeArg) && timeArg !== 'append' && timeArg !== 'replace') {
        return { line: lineNum, msg: `schedule の時間形式が不正: "${timeArg}" — 例: 20t(ティック), 1s(秒), 1d(日)`, type: 'warning' };
      }
    }
  }

  // Validate team subcommand
  if (cmd === 'team' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    const validSubs = new Set(['add', 'remove', 'join', 'leave', 'modify', 'list', 'empty']);
    if (!validSubs.has(sub)) {
      return { line: lineNum, msg: `team のサブコマンドが不正: "${sub}" — add/remove/join/leave/modify/list`, type: 'warning' };
    }
  }

  // Validate bossbar subcommand
  if (cmd === 'bossbar' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    const validSubs = new Set(['add', 'remove', 'set', 'get', 'list']);
    if (!validSubs.has(sub)) {
      return { line: lineNum, msg: `bossbar のサブコマンドが不正: "${sub}" — add/remove/set/get/list`, type: 'warning' };
    }
  }

  // Validate data subcommand
  if (cmd === 'data' && tokens.length >= 2) {
    const sub = tokens[1]?.toLowerCase();
    const validSubs = new Set(['get', 'merge', 'modify', 'remove']);
    if (!validSubs.has(sub)) {
      return { line: lineNum, msg: `data のサブコマンドが不正: "${sub}" — get/merge/modify/remove`, type: 'warning' };
    }
  }

  // Info: long command line warning
  if (trimmed.length > 300) {
    return { line: lineNum, msg: `行が ${trimmed.length} 文字です — 長いコマンドは関数に分割することを検討してください`, type: 'info' };
  }

  return null;
}

// ════════════════════════════════════════════════════════════
// MULTI-PROJECT STORAGE
// ════════════════════════════════════════════════════════════

const PROJECTS_KEY = 'mc-dp-projects';
const projectDataKey = (id) => `mc-dp-proj-${id}`;

function loadProjectsList() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }
  catch { return []; }
}
function saveProjectsList(list) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }
function loadProjectData(id) {
  try { return JSON.parse(localStorage.getItem(projectDataKey(id))); }
  catch { return null; }
}
function saveProjectData(id, data) { localStorage.setItem(projectDataKey(id), JSON.stringify(data)); }
function deleteProjectData(id) { localStorage.removeItem(projectDataKey(id)); }

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════

let _idCounter = Date.now();
const genId = () => `f${++_idCounter}`;

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
function versionAtLeast(target, min) { return compareVersions(target, min) >= 0; }
function filterByVersion(items, ver) {
  if (!ver) return items;
  return items.filter(item => {
    if (item.v && !versionAtLeast(ver, item.v)) return false;
    if (item.rm && versionAtLeast(ver, item.rm)) return false;
    return true;
  });
}

function generatePackMcmeta(project) {
  const ver = VERSION_FORMATS[project.targetVersion];
  if (!ver) return { pack: { pack_format: 48, description: project.description } };

  if (ver.useNewFormat) {
    const packFormat = Array.isArray(ver.min) ? ver.min[0] : ver.min;
    return {
      pack: {
        pack_format: packFormat,
        description: project.description,
        supported_formats: {
          min_inclusive: Array.isArray(ver.min) ? ver.min[0] : ver.min,
          max_inclusive: Array.isArray(ver.max) ? ver.max[0] : ver.max
        }
      }
    };
  }
  return {
    pack: {
      pack_format: ver.format,
      description: project.description
    }
  };
}

const isValidNamespace = (ns) => /^[a-z0-9_-]+$/.test(ns) && ns.length > 0;
const isValidFileName = (name) => /^[a-z0-9_.-]+$/.test(name) && name.length > 0 && !name.includes('..');

function tryParseJSON(str) {
  try { JSON.parse(str); return { valid: true, error: null }; }
  catch (e) { return { valid: false, error: e.message }; }
}

function getFullPath(files, fileId, _visited) {
  const seen = _visited || new Set();
  if (seen.has(fileId)) return '';
  seen.add(fileId);
  const file = files.find(f => f.id === fileId);
  if (!file) return '';
  if (!file.parentId) return file.name;
  const parentPath = getFullPath(files, file.parentId, seen);
  return parentPath ? parentPath + '/' + file.name : file.name;
}

function getChildren(files, parentId) {
  return files
    .filter(f => f.parentId === parentId)
    .sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
}

function deleteRecursive(files, fileId) {
  const children = files.filter(f => f.parentId === fileId);
  let result = files.filter(f => f.id !== fileId);
  children.forEach(child => { result = deleteRecursive(result, child.id); });
  return result;
}

function getFileIcon(name, type) {
  if (type === 'folder') return null;
  if (name.endsWith('.mcfunction')) return FileCode;
  if (name.endsWith('.json') || name.endsWith('.mcmeta')) return FileText;
  if (name.endsWith('.png')) return Image;
  return File;
}

function getFileType(name) {
  if (name.endsWith('.mcfunction')) return 'mcfunction';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.mcmeta')) return 'mcmeta';
  if (name.endsWith('.nbt')) return 'nbt';
  if (name.endsWith('.png')) return 'png';
  return 'text';
}

function ensureParentFolders(files, parentId, folderNames) {
  let currentParent = parentId;
  const newFiles = [...files];
  for (const fname of folderNames) {
    const existing = newFiles.find(f => f.parentId === currentParent && f.name === fname && f.type === 'folder');
    if (existing) {
      currentParent = existing.id;
    } else {
      const id = genId();
      newFiles.push({ id, name: fname, type: 'folder', content: null, parentId: currentParent });
      currentParent = id;
    }
  }
  return { files: newFiles, parentId: currentParent };
}

function createInitialFiles(namespace, options = {}) {
  const files = [];
  const id = () => genId();

  const dataId = id();
  files.push({ id: dataId, name: 'data', type: 'folder', content: null, parentId: null });

  const nsId = id();
  files.push({ id: nsId, name: namespace, type: 'folder', content: null, parentId: dataId });

  if (options.tickLoad) {
    const funcId = id();
    files.push({ id: funcId, name: 'function', type: 'folder', content: null, parentId: nsId });
    files.push({
      id: id(), name: 'load.mcfunction', type: 'mcfunction',
      content: `# === load ===\n# ロード時に実行される関数\n\nsay ${namespace} が読み込まれました！`,
      parentId: funcId
    });
    files.push({
      id: id(), name: 'tick.mcfunction', type: 'mcfunction',
      content: `# === tick ===\n# 毎tick実行される関数\n`,
      parentId: funcId
    });

    const mcId = id();
    files.push({ id: mcId, name: 'minecraft', type: 'folder', content: null, parentId: dataId });
    const tagsId = id();
    files.push({ id: tagsId, name: 'tags', type: 'folder', content: null, parentId: mcId });
    const tagFuncId = id();
    files.push({ id: tagFuncId, name: 'function', type: 'folder', content: null, parentId: tagsId });
    files.push({
      id: id(), name: 'load.json', type: 'json',
      content: JSON.stringify({ values: [`${namespace}:load`] }, null, 2),
      parentId: tagFuncId
    });
    files.push({
      id: id(), name: 'tick.json', type: 'json',
      content: JSON.stringify({ values: [`${namespace}:tick`] }, null, 2),
      parentId: tagFuncId
    });
  }

  if (options.sampleRecipe) {
    const recipeId = id();
    files.push({ id: recipeId, name: 'recipe', type: 'folder', content: null, parentId: nsId });
    files.push({
      id: id(), name: 'example_shaped.json', type: 'json',
      content: TEMPLATES.recipe_shaped.content('example_shaped', namespace, options.targetVersion),
      parentId: recipeId
    });
  }

  if (options.sampleAdvancement) {
    const advId = id();
    files.push({ id: advId, name: 'advancement', type: 'folder', content: null, parentId: nsId });
    files.push({
      id: id(), name: 'example.json', type: 'json',
      content: TEMPLATES.advancement.content('example', namespace, options.targetVersion),
      parentId: advId
    });
  }

  if (options.sampleLootTable) {
    const lootId = id();
    files.push({ id: lootId, name: 'loot_table', type: 'folder', content: null, parentId: nsId });
    files.push({
      id: id(), name: 'example.json', type: 'json',
      content: TEMPLATES.loot_table.content(),
      parentId: lootId
    });
  }

  return files;
}

// ════════════════════════════════════════════════════════════
// AI UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

function parseAICodeBlocks(text) {
  const blocks = [];
  const regex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      lang: match[1],
      path: match[2].trim(),
      content: match[3].trimEnd(),
    });
  }
  return blocks;
}

function callGeminiStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal, thinkingLevel) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const genConfig = { temperature: 0.7, maxOutputTokens: 8192 };
  if (thinkingLevel) {
    genConfig.thinkingConfig = { thinkingLevel };
  }

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: genConfig,
  };

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
    .then(response => {
      if (!response.ok) {
        const status = response.status;
        if (status === 400 || status === 401 || status === 403) {
          throw new Error('APIキーが無効です。正しいGemini APIキーを設定してください。');
        } else if (status === 429) {
          throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
        } else {
          throw new Error(`APIエラー (${status})`);
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            onDone(fullText);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed?.candidates?.[0]?.content?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.thought) continue;
                  if (part.text) { fullText += part.text; onChunk(fullText); }
                }
              }
            } catch {}
          }

          read();
        }).catch(err => {
          if (err.name === 'AbortError') {
            onDone(fullText);
          } else {
            onError(err.message || 'ストリーム読み取りエラー');
          }
        });
      }

      read();
    })
    .catch(err => {
      if (err.name === 'AbortError') return;
      onError(err.message || 'ネットワークエラーが発生しました。');
    });
}

function callOpenAIStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal) {
  const url = 'https://api.openai.com/v1/responses';

  const input = [
    { role: 'developer', content: [{ type: 'input_text', text: systemPrompt }] },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: [{ type: m.role === 'user' ? 'input_text' : 'output_text', text: m.content }],
    })),
  ];

  const body = { model: modelId, input, stream: true };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })
    .then(response => {
      if (!response.ok) {
        const status = response.status;
        if (status === 401) throw new Error('APIキーが無効です。正しいOpenAI APIキーを設定してください。');
        if (status === 429) throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
        if (status === 404) throw new Error('モデルが見つかりません。APIアクセスがまだ有効でない可能性があります。');
        throw new Error(`OpenAI APIエラー (${status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) { onDone(fullText); return; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                fullText += parsed.delta;
                onChunk(fullText);
              }
            } catch {}
          }
          read();
        }).catch(err => {
          if (err.name === 'AbortError') { onDone(fullText); }
          else { onError(err.message || 'ストリーム読み取りエラー'); }
        });
      }
      read();
    })
    .catch(err => {
      if (err.name === 'AbortError') return;
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        onError('ネットワークエラー: OpenAI APIはブラウザからの直接呼び出し(CORS)に対応していない場合があります。');
      } else {
        onError(err.message || 'ネットワークエラーが発生しました。');
      }
    });
}

function callAnthropicStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal) {
  const url = 'https://api.anthropic.com/v1/messages';

  const apiMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const body = {
    model: modelId,
    max_tokens: 8192,
    system: systemPrompt,
    messages: apiMessages,
    stream: true,
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  })
    .then(response => {
      if (!response.ok) {
        const status = response.status;
        if (status === 401) throw new Error('APIキーが無効です。正しいAnthropic APIキーを設定してください。');
        if (status === 429) throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
        if (status === 400) throw new Error('リクエストが不正です。入力内容を確認してください。');
        if (status === 529) throw new Error('Anthropic APIが過負荷状態です。しばらく待ってから再試行してください。');
        throw new Error(`Anthropic APIエラー (${status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) { onDone(fullText); return; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                fullText += parsed.delta.text;
                onChunk(fullText);
              }
            } catch {}
          }
          read();
        }).catch(err => {
          if (err.name === 'AbortError') { onDone(fullText); }
          else { onError(err.message || 'ストリーム読み取りエラー'); }
        });
      }
      read();
    })
    .catch(err => {
      if (err.name === 'AbortError') return;
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        onError('ネットワークエラー: Anthropic APIへの接続に失敗しました。');
      } else {
        onError(err.message || 'ネットワークエラーが発生しました。');
      }
    });
}

function callAIStream(provider, apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal, thinkingLevel) {
  if (provider === 'anthropic') {
    callAnthropicStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal);
  } else if (provider === 'openai') {
    callOpenAIStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal);
  } else {
    callGeminiStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal, thinkingLevel);
  }
}

// ════════════════════════════════════════════════════════════
// AGENT TOOLS & AGENTIC LOOP
// ════════════════════════════════════════════════════════════

const AGENT_TOOL_DECLARATIONS = [
  {
    name: 'create_files',
    description: 'データパックにファイルを作成・更新する。複数ファイルを一度に作成可能。',
    parameters: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: '作成するファイルの配列',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'ファイルパス (例: data/ns/function/load.mcfunction)' },
              content: { type: 'string', description: 'ファイル内容' },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['files'],
    },
  },
  {
    name: 'read_files',
    description: 'プロジェクト内の既存ファイルの内容を読み取る。',
    parameters: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: '読み取るファイルパスの配列' },
      },
      required: ['paths'],
    },
  },
  {
    name: 'list_project_files',
    description: 'プロジェクト内の全ファイル一覧をパス付きで取得する。',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'delete_files',
    description: 'プロジェクトからファイルを削除する。',
    parameters: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' }, description: '削除するファイルパスの配列' },
      },
      required: ['paths'],
    },
  },
  {
    name: 'validate_mcfunction',
    description: 'mcfunctionファイルの構文を検証する。',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'mcfunction内容' },
        version: { type: 'string', description: '対象Minecraftバージョン' },
      },
      required: ['content'],
    },
  },
];

function callGeminiAgent(apiKey, modelId, conversationHistory, systemPrompt, tools, onStep, onChunk, onDone, onError, signal, thinkingLevel) {
  const maxIterations = 8;
  let iteration = 0;
  let allContents = conversationHistory.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: m.functionCall ? [{ functionCall: m.functionCall }]
      : m.functionResponse ? [{ functionResponse: m.functionResponse }]
      : [{ text: m.content }],
  }));

  function iterate() {
    if (iteration >= maxIterations) {
      onDone({ type: 'max_iterations' });
      return;
    }
    iteration++;
    const genConfig = { temperature: 0.7, maxOutputTokens: 16384 };
    if (thinkingLevel) genConfig.thinkingConfig = { thinkingLevel };

    const body = {
      contents: allContents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: genConfig,
      tools: [{ function_declarations: tools }],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
      .then(r => {
        if (!r.ok) {
          if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error('APIキーが無効です。');
          if (r.status === 429) throw new Error('レート制限に達しました。');
          throw new Error(`APIエラー (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        const candidate = data?.candidates?.[0];
        if (!candidate?.content?.parts) {
          onDone({ type: 'empty' });
          return;
        }

        const parts = candidate.content.parts;
        const textParts = parts.filter(p => p.text && !p.thought).map(p => p.text);
        const functionCalls = parts.filter(p => p.functionCall);

        if (textParts.length > 0) {
          const text = textParts.join('');
          onChunk(text);
        }

        if (functionCalls.length > 0) {
          allContents.push({ role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc.functionCall })) });

          const results = [];
          for (const fc of functionCalls) {
            const result = onStep(fc.functionCall.name, fc.functionCall.args);
            results.push({
              functionResponse: { name: fc.functionCall.name, response: { result: result } },
            });
          }

          allContents.push({ role: 'user', parts: results });
          iterate();
        } else {
          onDone({ type: 'complete', text: textParts.join('') });
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') { onDone({ type: 'aborted' }); return; }
        onError(err.message || 'エージェントエラー');
      });
  }

  iterate();
}

function convertToolsToAnthropicFormat(tools) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: t.parameters.type || 'object',
      properties: t.parameters.properties || {},
      required: t.parameters.required || [],
    },
  }));
}

function callAnthropicAgent(apiKey, modelId, conversationHistory, systemPrompt, tools, onStep, onChunk, onDone, onError, signal) {
  const maxIterations = 8;
  let iteration = 0;
  const anthropicTools = convertToolsToAnthropicFormat(tools);

  let allMessages = conversationHistory.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.toolUse ? m.toolUse
      : m.toolResult ? m.toolResult
      : m.content,
  }));

  function iterate() {
    if (iteration >= maxIterations) {
      onDone({ type: 'max_iterations' });
      return;
    }
    iteration++;

    const body = {
      model: modelId,
      max_tokens: 16384,
      system: systemPrompt,
      messages: allMessages,
      tools: anthropicTools,
    };

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    })
      .then(r => {
        if (!r.ok) {
          if (r.status === 401) throw new Error('APIキーが無効です。');
          if (r.status === 429) throw new Error('レート制限に達しました。');
          if (r.status === 529) throw new Error('Anthropic APIが過負荷状態です。');
          throw new Error(`APIエラー (${r.status})`);
        }
        return r.json();
      })
      .then(data => {
        if (!data.content || data.content.length === 0) {
          onDone({ type: 'empty' });
          return;
        }

        const textParts = data.content.filter(b => b.type === 'text').map(b => b.text);
        const toolUseParts = data.content.filter(b => b.type === 'tool_use');

        if (textParts.length > 0) {
          onChunk(textParts.join(''));
        }

        if (toolUseParts.length > 0) {
          allMessages.push({ role: 'assistant', content: data.content });

          const toolResults = [];
          for (const tu of toolUseParts) {
            const result = onStep(tu.name, tu.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            });
          }

          allMessages.push({ role: 'user', content: toolResults });
          iterate();
        } else {
          onDone({ type: 'complete', text: textParts.join('') });
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') { onDone({ type: 'aborted' }); return; }
        onError(err.message || 'エージェントエラー');
      });
  }

  iterate();
}

function validateProject(project, files) {
  const errors = [];
  if (!project.name.trim()) errors.push({ type: 'error', msg: 'パック名が空です' });
  if (!project.namespace.trim()) {
    errors.push({ type: 'error', msg: '名前空間が空です' });
  } else if (!isValidNamespace(project.namespace)) {
    errors.push({ type: 'error', msg: '名前空間に使用できない文字が含まれています（a-z, 0-9, _, - のみ）' });
  }

  const paths = new Map();
  files.forEach(f => {
    const p = getFullPath(files, f.id);
    if (paths.has(p)) errors.push({ type: 'error', msg: `パスが重複: ${p}` });
    paths.set(p, f.id);
  });

  files.forEach(f => {
    if ((f.type === 'json' || f.type === 'mcmeta') && f.content) {
      const r = tryParseJSON(f.content);
      if (!r.valid) {
        errors.push({ type: 'error', msg: `JSON構文エラー: ${f.name} — ${r.error}` });
      }
    }
  });

  files.filter(f => f.type === 'folder').forEach(folder => {
    const ch = files.filter(f => f.parentId === folder.id);
    if (ch.length === 0) {
      errors.push({ type: 'warning', msg: `空のフォルダ: ${getFullPath(files, folder.id)}` });
    }
  });

  return errors;
}

function highlightJSON(code) {
  if (!code) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokenRe = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g;
  let result = '';
  let lastIndex = 0;
  let m;
  while ((m = tokenRe.exec(code)) !== null) {
    result += esc(code.slice(lastIndex, m.index));
    if (m[1]) {
      result += m[2]
        ? `<span class="text-sky-300">${esc(m[1])}</span>${esc(m[2])}`
        : `<span class="text-green-300">${esc(m[1])}</span>`;
    } else if (m[3]) {
      result += `<span class="text-orange-300">${esc(m[3])}</span>`;
    } else if (m[4]) {
      result += `<span class="text-purple-300">${esc(m[4])}</span>`;
    }
    lastIndex = tokenRe.lastIndex;
  }
  result += esc(code.slice(lastIndex));
  return result;
}

function highlightMcfunction(code) {
  if (!code) return '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const CMDS = new Set(['say','give','execute','run','as','at','in','if','unless','store','summon','tp','teleport','kill','effect','gamemode','setblock','fill','clone','scoreboard','tag','function','schedule','data','title','tellraw','bossbar','team','trigger','advancement','recipe','loot','particle','playsound','clear','enchant','experience','xp','weather','time','difficulty','gamerule','defaultgamemode','worldborder','spreadplayers','spawnpoint','setworldspawn','forceload','reload','return','ride','damage','place','random','tick']);
  return code.split('\n').map(line => {
    if (line.trimStart().startsWith('#')) {
      return `<span class="text-gray-500 italic">${esc(line)}</span>`;
    }
    const tokenRe = /(@[apers](?:\[[^\]]*\])?)|(\b[a-z_]+\b)/g;
    let result = '';
    let last = 0;
    let m;
    while ((m = tokenRe.exec(line)) !== null) {
      result += esc(line.slice(last, m.index));
      if (m[1]) {
        result += `<span class="text-orange-300">${esc(m[1])}</span>`;
      } else if (m[2] && CMDS.has(m[2])) {
        result += `<span class="text-sky-300">${esc(m[2])}</span>`;
      } else {
        result += esc(m[0]);
      }
      last = tokenRe.lastIndex;
    }
    result += esc(line.slice(last));
    return result;
  }).join('\n');
}

async function generateZip(project, files) {
  const zip = new JSZip();
  const mcmeta = generatePackMcmeta(project);
  zip.file('pack.mcmeta', JSON.stringify(mcmeta, null, 2));

  if (project.packIcon) {
    const base64 = project.packIcon.split(',')[1];
    if (base64) zip.file('pack.png', base64, { base64: true });
  }

  files.forEach(file => {
    if (file.type !== 'folder' && file.content != null) {
      const path = getFullPath(files, file.id);
      zip.file(path, file.content);
    }
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'datapack'}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ════════════════════════════════════════════════════════════
// FILE IMPORT UTILITIES
// ════════════════════════════════════════════════════════════

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`ファイル読み取りエラー: ${file.name}`));
    reader.readAsText(file);
  });
}

async function importFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const pathContents = [];
  const entries = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir) entries.push({ relativePath, entry });
  });
  for (const { relativePath, entry } of entries) {
    const normalized = relativePath.replace(/\\/g, '/');
    if (normalized.startsWith('__MACOSX/') || normalized.includes('.DS_Store')) continue;
    const ext = normalized.split('.').pop()?.toLowerCase();
    const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'nbt', 'dat'].includes(ext);
    let content;
    if (isBinary) {
      if (ext === 'png') {
        const base64 = await entry.async('base64');
        content = `data:image/png;base64,${base64}`;
      } else {
        content = `[バイナリファイル: ${normalized}]`;
      }
    } else {
      content = await entry.async('string');
    }
    pathContents.push({ path: normalized, content });
  }
  return pathContents;
}

async function importFromFileList(fileList) {
  const pathContents = [];
  for (const file of fileList) {
    const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    if (relativePath.includes('.DS_Store') || relativePath.includes('__MACOSX')) continue;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'nbt', 'dat'].includes(ext);
    let content;
    if (isBinary) {
      if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
        const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };
        content = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = () => rej(new Error(`読み取りエラー: ${file.name}`));
          r.readAsDataURL(file);
        });
      } else {
        content = `[バイナリファイル: ${file.name}]`;
      }
    } else {
      content = await readFileAsText(file);
    }
    pathContents.push({ path: relativePath, content });
  }
  return pathContents;
}

// Recursively read directory entries from drag & drop using webkitGetAsEntry API
function readEntryAsFile(entry) {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function readDirectoryEntries(dirReader) {
  return new Promise((resolve, reject) => {
    dirReader.readEntries(resolve, reject);
  });
}

async function traverseEntry(entry, basePath, results) {
  if (entry.isFile) {
    try {
      const file = await readEntryAsFile(entry);
      const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      if (fullPath.includes('.DS_Store') || fullPath.includes('__MACOSX')) return;
      const ext = entry.name.split('.').pop()?.toLowerCase();
      const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'nbt', 'dat'].includes(ext);
      let content;
      if (isBinary) {
        if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
          content = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(new Error(`読み取りエラー: ${entry.name}`));
            r.readAsDataURL(file);
          });
        } else {
          content = `[バイナリファイル: ${entry.name}]`;
        }
      } else {
        content = await readFileAsText(file);
      }
      results.push({ path: fullPath, content });
    } catch (err) {
      console.warn(`ファイル読取スキップ: ${entry.name}`, err);
    }
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    let allEntries = [];
    // readEntries may return partial results, need to call repeatedly
    let batch;
    do {
      batch = await readDirectoryEntries(dirReader);
      allEntries = allEntries.concat(Array.from(batch));
    } while (batch.length > 0);
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    for (const child of allEntries) {
      await traverseEntry(child, dirPath, results);
    }
  }
}

async function importFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items;
  if (!items || items.length === 0) return [];

  // Check for single ZIP file first (by name, not MIME - more reliable)
  const firstFile = dataTransfer.files?.[0];
  if (dataTransfer.files?.length === 1 && firstFile?.name?.toLowerCase().endsWith('.zip')) {
    return await importFromZip(firstFile);
  }

  // Try webkitGetAsEntry for folder support
  const entries = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.() || items[i].getAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length > 0) {
    const results = [];
    for (const entry of entries) {
      await traverseEntry(entry, '', results);
    }
    if (results.length > 0) return results;
  }

  // Fallback: use dataTransfer.files (no folder structure for plain D&D)
  const files = [];
  for (let i = 0; i < dataTransfer.files.length; i++) {
    files.push(dataTransfer.files[i]);
  }
  if (files.length === 0) return [];
  // Check again for zip in case the entry approach missed it
  if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
    return await importFromZip(files[0]);
  }
  return await importFromFileList(files);
}

function detectDatapackInfo(pathContents) {
  let name = '';
  let description = '';
  let namespace = '';
  let targetVersion = '1.21.11';
  const mcmetaEntry = pathContents.find(p => p.path.endsWith('pack.mcmeta'));
  if (mcmetaEntry) {
    try {
      const meta = JSON.parse(mcmetaEntry.content);
      const pack = meta.pack || {};
      description = typeof pack.description === 'string' ? pack.description : '';
      const fmt = pack.pack_format;
      if (fmt) {
        const versionMap = {
          15: '1.20', 18: '1.20.2', 26: '1.20.4', 41: '1.20.5',
          48: '1.21', 57: '1.21.2', 71: '1.21.5', 80: '1.21.6',
          81: '1.21.8', 88: '1.21.10', 94: '1.21.11',
        };
        targetVersion = versionMap[fmt] || '1.21.11';
      }
    } catch {}
  }
  const nsSet = new Set();
  for (const p of pathContents) {
    const m = p.path.match(/^(?:[^/]+\/)?data\/([a-z0-9_.-]+)\//);
    if (m && m[1] !== 'minecraft') nsSet.add(m[1]);
  }
  if (nsSet.size > 0) namespace = [...nsSet][0];
  const topFolder = pathContents[0]?.path.split('/')[0] || '';
  if (topFolder && !topFolder.includes('.')) name = topFolder;
  else if (namespace) name = namespace + '-datapack';
  return { name, description, namespace, targetVersion };
}

function stripTopFolder(pathContents) {
  if (pathContents.length === 0) return pathContents;
  const firstParts = pathContents[0].path.split('/');
  if (firstParts.length <= 1) return pathContents;
  const topFolder = firstParts[0];
  const allHaveTop = pathContents.every(p => p.path.startsWith(topFolder + '/'));
  if (!allHaveTop) return pathContents;
  return pathContents.map(p => ({ ...p, path: p.path.substring(topFolder.length + 1) }));
}

// ── ImportModal Component ──

function ImportModal({ onImport, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const zipRef = useRef(null);
  const folderRef = useRef(null);

  const processFiles = async (pathContents) => {
    if (pathContents.length === 0) { setError('ファイルが見つかりませんでした'); return; }
    const info = detectDatapackInfo(pathContents);
    const stripped = stripTopFolder(pathContents);
    const hasMcmeta = stripped.some(p => p.path === 'pack.mcmeta' || p.path.endsWith('/pack.mcmeta'));
    setPreview({ pathContents: stripped, info, fileCount: stripped.length, hasMcmeta });
  };

  const handleZipSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(null); setPreview(null);
    try {
      const pathContents = await importFromZip(file);
      await processFiles(pathContents);
    } catch (err) { setError(`ZIP読み取りエラー: ${err.message}`); }
    setLoading(false);
  };

  const handleFolderSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setLoading(true); setError(null); setPreview(null);
    try {
      const pathContents = await importFromFileList(fileList);
      await processFiles(pathContents);
    } catch (err) { setError(`フォルダ読み取りエラー: ${err.message}`); }
    setLoading(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault(); setDragging(false);
    setLoading(true); setError(null); setPreview(null);
    try {
      const pathContents = await importFromDataTransfer(e.dataTransfer);
      await processFiles(pathContents);
    } catch (err) { setError(`インポートエラー: ${err.message}`); }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (preview) onImport(preview.pathContents, preview.info);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-lg mx-4 anim-scale overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-mc-border">
          <div className="flex items-center gap-2">
            <UploadCloud size={16} className="text-mc-info" />
            <span className="text-sm font-semibold">データパックをインポート</span>
          </div>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragging ? 'border-mc-info bg-mc-info/10' : 'border-mc-border hover:border-mc-muted'
            }`}
            onClick={() => zipRef.current?.click()}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader size={24} className="text-mc-info animate-spin" />
                <span className="text-sm text-mc-muted">読み込み中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud size={32} className="text-mc-muted" />
                <span className="text-sm text-mc-text">ZIP / フォルダをドロップ、またはクリックして選択</span>
                <span className="text-xs text-mc-muted">データパックのZIPファイルやフォルダをドロップでインポート</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => zipRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-mc-dark border border-mc-border rounded hover:border-mc-muted transition-colors"
            >
              <Package size={14} /> ZIPファイル
            </button>
            <button
              onClick={() => folderRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-mc-dark border border-mc-border rounded hover:border-mc-muted transition-colors"
            >
              <FolderInput size={14} /> フォルダ選択
            </button>
          </div>

          <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={handleZipSelect} />
          <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={handleFolderSelect} />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-mc-dark rounded border border-mc-border p-4 space-y-3 anim-fade">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-mc-success" />
                <span className="text-sm font-medium text-mc-success">インポート準備完了</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-mc-muted">ファイル数:</span> <span className="text-mc-text">{preview.fileCount}</span></div>
                <div><span className="text-mc-muted">pack.mcmeta:</span> <span className={preview.hasMcmeta ? 'text-mc-success' : 'text-mc-warning'}>{preview.hasMcmeta ? '検出' : '未検出'}</span></div>
                {preview.info.name && <div><span className="text-mc-muted">パック名:</span> <span className="text-mc-text">{preview.info.name}</span></div>}
                {preview.info.namespace && <div><span className="text-mc-muted">名前空間:</span> <span className="text-mc-keyword">{preview.info.namespace}</span></div>}
                {preview.info.targetVersion && <div><span className="text-mc-muted">バージョン:</span> <span className="text-mc-text">{preview.info.targetVersion}</span></div>}
              </div>
              {!preview.hasMcmeta && (
                <div className="flex items-center gap-2 text-xs text-mc-warning">
                  <AlertTriangle size={12} /> pack.mcmetaが見つかりません。通常のフォルダとしてインポートされます。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-mc-muted hover:text-mc-text transition-colors">キャンセル</button>
          <button
            onClick={handleConfirm}
            disabled={!preview}
            className="px-5 py-2 text-sm font-medium rounded bg-mc-info hover:bg-mc-info/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <UploadCloud size={14} /> インポート
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MINIGAME FILE GENERATORS
// ════════════════════════════════════════════════════════════

function addFilesFromPaths(existingFiles, pathContents) {
  let files = [...existingFiles];
  for (const { path, content, merge } of pathContents) {
    const parts = path.split('/');
    const fileName = parts.pop();
    let parentId = null;
    for (const folderName of parts) {
      const existing = files.find(f => f.parentId === parentId && f.name === folderName && f.type === 'folder');
      if (existing) {
        parentId = existing.id;
      } else {
        const id = genId();
        files.push({ id, name: folderName, type: 'folder', content: null, parentId });
        parentId = id;
      }
    }
    // Check if file already exists at this location
    const existingFile = files.find(f => f.parentId === parentId && f.name === fileName && f.type !== 'folder');
    if (existingFile) {
      if (merge && existingFile.content) {
        // Merge JSON arrays (for load.json/tick.json)
        try {
          const oldData = JSON.parse(existingFile.content);
          const newData = JSON.parse(content);
          if (oldData.values && newData.values) {
            const merged = [...new Set([...oldData.values, ...newData.values])];
            existingFile.content = JSON.stringify({ ...oldData, values: merged }, null, 2);
          } else {
            existingFile.content = content;
          }
        } catch { existingFile.content = content; }
      } else {
        existingFile.content = content;
      }
    } else {
      const id = genId();
      const type = getFileType(fileName);
      files.push({ id, name: fileName, type, content, parentId });
    }
  }
  return files;
}

function generateMinigameFiles(ns, gameType, settings) {
  const gt = settings.gameTime || 300;
  const pTag = settings.playerTag || '';
  const P = pTag ? `@a[tag=${pTag}]` : '@a'; // Player selector
  const files = [];

  // ── Common: load.json / tick.json (merge with existing) ──
  files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:reload`] }, null, 2), merge: true });
  files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:main`] }, null, 2), merge: true });

  if (gameType === 'tag_game') {
    const tA = settings.teamA || '鬼';
    const tB = settings.teamB || '逃走者';
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ 初期化（データパック読み込み時） ═══
# スコアボード作成
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add alive dummy "生存"
scoreboard objectives add deaths deathCount "死亡検知"
scoreboard objectives add team_count dummy "人数"

# チーム作成
team add chaser "${tA}"
team add runner "${tB}"
team modify chaser color ${settings.colorA || 'red'}
team modify runner color ${settings.colorB || 'blue'}
team modify chaser seeFriendlyInvisibles true

scoreboard players set #game game_state 0
say [${tA}ごっこ] データパックが読み込まれました！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`# ═══ メインループ（毎tick実行） ═══
# ゲーム中のみ game_loop を呼び出す
execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ ゲーム開始 ═══
# 事前準備:
#   tag @a add player    (参加者全員)
#   tag <鬼> add chaser_pick (鬼に選ばれたプレイヤー)

# チーム振り分け
tag @a[tag=chaser_pick] add chaser_tag
tag @a[tag=player,tag=!chaser_tag] add runner_tag
team join chaser @a[tag=chaser_tag]
team join runner @a[tag=runner_tag]
tag @a remove chaser_pick

# リセット
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 1
scoreboard players set ${P} deaths 0
gamemode adventure ${P}

# タイマー設定（${gt}秒）
scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

# ボスバー
bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow
bossbar set ${ns}:timer style notched_10

# ゲーム開始
scoreboard players set #game game_state 1
title ${P} title {"text":"${tA}ごっこ","bold":true,"color":"gold"}
title ${P} subtitle {"text":"まもなく開始...","color":"yellow"}
playsound minecraft:block.note_block.pling master ${P}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ ゲームループ（ゲーム中毎tick） ═══

# ── ゲームモード管理 ──
gamemode adventure @a[tag=player,scores={alive=1}]
gamemode spectator @a[tag=player,scores={alive=0}]

# ── 死亡検知（${tB}が死亡→捕まった） ──
execute as @a[tag=runner_tag,scores={deaths=1..}] run scoreboard players set @s alive 0
execute as @a[tag=runner_tag,scores={deaths=1..}] run tellraw ${P} [{"selector":"@s","color":"${settings.colorB || 'blue'}"},{"text":" が捕まった！","color":"yellow"}]
scoreboard players set ${P} deaths 0

# ── 開始カウントダウン（3秒） ──
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"スタート！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1 run tellraw @a[tag=chaser_tag] {"text":"あなたは${tA}です！全員捕まえろ！","color":"${settings.colorA || 'red'}","bold":true}
execute if score #timer pre_count matches 1 run tellraw @a[tag=runner_tag] {"text":"あなたは${tB}です！逃げろ！","color":"${settings.colorB || 'blue'}","bold":true}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# ── タイマー処理（カウントダウン後） ──
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1

# ── ボスバー更新 ──
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec
bossbar set ${ns}:timer name ["",{"text":"残り ","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"aqua"},{"text":" 秒","color":"yellow"}]

# ── HUD表示 ──
scoreboard players set #runner_count team_count 0
execute as @a[tag=runner_tag,scores={alive=1}] run scoreboard players add #runner_count team_count 1
title ${P} actionbar ["",{"text":"${tA} ","bold":true,"color":"${settings.colorA || 'red'}"},{"text":"vs ","color":"gray"},{"text":"${tB} 残り","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#runner_count","objective":"team_count"},"color":"white"},{"text":"人","color":"${settings.colorB || 'blue'}"}]

# ── 勝利判定 ──
execute if score #runner_count team_count matches 0 run function ${ns}:win_chaser
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_runner` });

    files.push({ path: `data/${ns}/function/win_chaser.mcfunction`, content:
`# ═══ ${tA}の勝利 ═══
title ${P} title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
title ${P} subtitle {"text":"全員捕まえた！","color":"yellow"}
tellraw ${P} {"text":"═══ ゲーム終了 ═══","color":"gold","bold":true}
execute as @a[tag=chaser_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_runner.mcfunction`, content:
`# ═══ ${tB}の勝利 ═══
title ${P} title {"text":"逃走成功！","bold":true,"color":"${settings.colorB || 'blue'}"}
title ${P} subtitle {"text":"${tB}の勝利！","color":"yellow"}
tellraw ${P} {"text":"═══ ゲーム終了 ═══","color":"gold","bold":true}
execute as @a[tag=runner_tag,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`# ═══ ゲーム終了 & リセット ═══
scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 0
tag @a remove chaser_tag
tag @a remove runner_tag
team empty chaser
team empty runner
tellraw ${P} {"text":"ゲームがリセットされました","color":"gray"}` });

  } else if (gameType === 'pvp_arena') {
    const tA = settings.teamA || '赤チーム';
    const tB = settings.teamB || '青チーム';
    const tk = settings.targetKills || 10;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ PvPアリーナ 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add kills dummy "キル数"
scoreboard objectives add deaths deathCount "死亡検知"

team add team_a "${tA}"
team add team_b "${tB}"
team modify team_a color ${settings.colorA || 'red'}
team modify team_b color ${settings.colorB || 'blue'}
team modify team_a friendlyFire false
team modify team_b friendlyFire false

scoreboard players set #game game_state 0
say [PvPアリーナ] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ PvPアリーナ 開始 ═══
# 事前: tag @a add player / tag <赤> add team_a_pick
team join team_a @a[tag=team_a_pick]
team join team_b @a[tag=player,tag=!team_a_pick]
tag @a[tag=player,tag=!team_a_pick] add team_b_tag
tag @a[tag=team_a_pick] add team_a_tag
tag @a remove team_a_pick

clear ${P}
effect clear ${P}
scoreboard players set ${P} kills 0
scoreboard players set ${P} deaths 0
scoreboard players set #team_a kills 0
scoreboard players set #team_b kills 0
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow

give ${P} iron_sword
give ${P} bow
give ${P} arrow 16

scoreboard players set #game game_state 1
title ${P} title {"text":"PvPアリーナ","bold":true,"color":"gold"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ PvPアリーナ ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"戦え！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# キル検知
execute as @a[tag=team_a_tag,scores={deaths=1..}] run scoreboard players add #team_b kills 1
execute as @a[tag=team_b_tag,scores={deaths=1..}] run scoreboard players add #team_a kills 1
execute as @a[scores={deaths=1..}] run tellraw ${P} [{"selector":"@s"},{"text":" がやられた！","color":"gray"}]
scoreboard players set @a deaths 0

# HUD
bossbar set ${ns}:timer name ["",{"text":"${tA}: ","color":"${settings.colorA || 'red'}"},{"score":{"name":"#team_a","objective":"kills"}},{"text":" | ${tB}: ","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#team_b","objective":"kills"}},{"text":" (${tk}キルで勝利)","color":"gray"}]

# 勝利判定
execute if score #team_a kills matches ${tk}.. run function ${ns}:win_a
execute if score #team_b kills matches ${tk}.. run function ${ns}:win_b
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_check` });

    files.push({ path: `data/${ns}/function/win_a.mcfunction`, content:
`title ${P} title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
execute as @a[tag=team_a_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_b.mcfunction`, content:
`title ${P} title {"text":"${tB}の勝利！","bold":true,"color":"${settings.colorB || 'blue'}"}
execute as @a[tag=team_b_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_check.mcfunction`, content:
`# 時間切れ: キル数が多いチームが勝利
execute if score #team_a kills > #team_b kills run function ${ns}:win_a
execute if score #team_b kills > #team_a kills run function ${ns}:win_b
execute if score #team_a kills = #team_b kills run tellraw ${P} {"text":"引き分け！","color":"yellow","bold":true}
execute if score #team_a kills = #team_b kills run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
tag @a remove team_a_tag
tag @a remove team_b_tag
team empty team_a
team empty team_b
tellraw ${P} {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'spleef') {
    const fallY = settings.fallY || 50;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ スプリーフ 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add alive dummy "生存"
scoreboard players set #game game_state 0
say [スプリーフ] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ スプリーフ 開始 ═══
# 事前: tag @a add player
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 1
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60
scoreboard players set #alive_count alive 0

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color aqua

# プレイヤーにシャベルを配布
give ${P} diamond_shovel

scoreboard players set #game game_state 1
title ${P} title {"text":"スプリーフ","bold":true,"color":"aqua"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ スプリーフ ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"掘れ！","bold":true,"color":"aqua"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# 落下検知（Y=${fallY}以下で脱落）
execute as @a[tag=player,scores={alive=1}] at @s if entity @s[y=-64,dy=${fallY + 64}] run scoreboard players set @s alive 0
execute as @a[tag=player,scores={alive=0}] run gamemode spectator @s

# 生存者カウント
scoreboard players set #alive_count alive 0
execute as @a[tag=player,scores={alive=1}] run scoreboard players add #alive_count alive 1

# HUD
bossbar set ${ns}:timer name ["",{"text":"生存者: ","color":"aqua"},{"score":{"name":"#alive_count","objective":"alive"},"color":"white"},{"text":"人 | 残り","color":"aqua"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒","color":"aqua"}]

# 勝利判定（残り1人）
execute if score #alive_count alive matches ..1 run function ${ns}:win` });

    files.push({ path: `data/${ns}/function/win.mcfunction`, content:
`# ═══ 勝者決定 ═══
execute as @a[tag=player,scores={alive=1}] run title ${P} title [{"selector":"@s","bold":true,"color":"gold"},{"text":"の勝利！","bold":true,"color":"yellow"}]
execute as @a[tag=player,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 0
tag @a remove player
tellraw @a {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'race') {
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ レース 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "経過秒数"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add checkpoint dummy "チェックポイント"
scoreboard objectives add finished dummy "ゴール済み"
scoreboard players set #game game_state 0
say [レース] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ レース 開始 ═══
# 事前: tag @a add player
clear ${P}
effect clear ${P}
scoreboard players set ${P} checkpoint 0
scoreboard players set ${P} finished 0
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec 0
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value 0
bossbar set ${ns}:timer color green

scoreboard players set #game game_state 1
title ${P} title {"text":"レース","bold":true,"color":"green"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ レース ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"GO！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー（経過時間カウントアップ）
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 run scoreboard players add #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# チェックポイント検知（エンティティにタグを付けて座標に置く）
# 例: /summon marker ~ ~ ~ {Tags:["cp1"]} をコース上に配置
# execute as @a[tag=player,scores={checkpoint=0}] at @s if entity @e[tag=cp1,distance=..3] run function ${ns}:checkpoint

# HUD
bossbar set ${ns}:timer name ["",{"text":"経過: ","color":"green"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒","color":"green"}]
title ${P} actionbar ["",{"text":"チェックポイント: ","color":"green"},{"score":{"name":"@s","objective":"checkpoint"},"color":"white"}]

# 制限時間チェック
execute if score #timer timer_sec matches ${gt}.. run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/goal.mcfunction`, content:
`# ═══ ゴール処理 ═══
# ゴール地点で: execute as @a[tag=player,scores={finished=0}] at @s if entity @e[tag=goal,distance=..3] run function ${ns}:goal
scoreboard players set @s finished 1
tellraw ${P} [{"selector":"@s","color":"gold","bold":true},{"text":" がゴール！ （","color":"green"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒）","color":"green"}]
title @s title {"text":"ゴール！","bold":true,"color":"gold"}
playsound minecraft:ui.toast.challenge_complete master @s` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
tag @a remove player
tellraw @a {"text":"レース終了！","color":"gold","bold":true}` });

  } else if (gameType === 'treasure_hunt') {
    const item = settings.targetItem || 'minecraft:diamond';
    const itemName = item.replace('minecraft:', '');
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ 宝探し 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add score dummy "スコア"
scoreboard objectives add pickup minecraft.picked_up:${item} "アイテム取得"
scoreboard players set #game game_state 0
say [宝探し] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ 宝探し 開始 ═══
clear ${P}
effect clear ${P}
scoreboard players set ${P} score 0
scoreboard players set ${P} pickup 0
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color purple

scoreboard players set #game game_state 1
title ${P} title {"text":"宝探し","bold":true,"color":"light_purple"}
title ${P} subtitle {"text":"${itemName}を集めろ！","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ 宝探し ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"探せ！","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# アイテム取得検知
execute as @a[tag=player,scores={pickup=1..}] run scoreboard players operation @s score += @s pickup
execute as @a[tag=player,scores={pickup=1..}] run tellraw ${P} [{"selector":"@s","color":"gold"},{"text":" が${itemName}を見つけた！(計","color":"yellow"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個)","color":"yellow"}]
scoreboard players set ${P} pickup 0

# HUD
bossbar set ${ns}:timer name ["",{"text":"残り ","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"aqua"},{"text":"秒","color":"yellow"}]
title ${P} actionbar ["",{"text":"スコア: ","color":"light_purple"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個","color":"light_purple"}]

# 時間切れ
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:result` });

    files.push({ path: `data/${ns}/function/result.mcfunction`, content:
`# ═══ 結果発表 ═══
tellraw ${P} {"text":"═══ 宝探し終了！ ═══","color":"gold","bold":true}
tellraw ${P} {"text":"--- スコアボード ---","color":"yellow"}
execute as ${P} run tellraw ${P} [{"selector":"@s"},{"text":": ","color":"gray"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個","color":"gray"}]
title ${P} title {"text":"終了！","bold":true,"color":"gold"}
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
tag @a remove player
tellraw @a {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'king_of_hill') {
    const tA = settings.teamA || '赤チーム';
    const tB = settings.teamB || '青チーム';
    const ts = settings.targetScore || 100;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ 陣取り 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add hill_score dummy "占領ポイント"
scoreboard objectives add on_hill dummy "丘の上"

team add team_a "${tA}"
team add team_b "${tB}"
team modify team_a color ${settings.colorA || 'red'}
team modify team_b color ${settings.colorB || 'blue'}
team modify team_a friendlyFire false
team modify team_b friendlyFire false

scoreboard players set #game game_state 0
scoreboard players set #team_a hill_score 0
scoreboard players set #team_b hill_score 0
say [陣取り] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ 陣取り 開始 ═══
# 事前: tag @a add player / tag <赤> add team_a_pick
team join team_a @a[tag=team_a_pick]
team join team_b @a[tag=player,tag=!team_a_pick]
tag @a[tag=player,tag=!team_a_pick] add team_b_tag
tag @a[tag=team_a_pick] add team_a_tag
tag @a remove team_a_pick

clear ${P}
effect clear ${P}
scoreboard players set #team_a hill_score 0
scoreboard players set #team_b hill_score 0
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow

scoreboard players set #game game_state 1
title ${P} title {"text":"陣取り","bold":true,"color":"gold"}
title ${P} subtitle {"text":"丘を制圧せよ！","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ 陣取り ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"占領開始！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# ── 丘の上の判定（タグ "hill_zone" のマーカー周辺3ブロック） ──
# 事前に /summon marker <x> <y> <z> {Tags:["hill_zone"]} を配置
scoreboard players set ${P} on_hill 0
execute as ${P} at @s if entity @e[tag=hill_zone,distance=..5] run scoreboard players set @s on_hill 1

# 毎秒ポイント加算
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 as @a[tag=team_a_tag,scores={on_hill=1}] run scoreboard players add #team_a hill_score 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 as @a[tag=team_b_tag,scores={on_hill=1}] run scoreboard players add #team_b hill_score 1

# HUD
bossbar set ${ns}:timer name ["",{"text":"${tA}: ","color":"${settings.colorA || 'red'}"},{"score":{"name":"#team_a","objective":"hill_score"}},{"text":" | ${tB}: ","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#team_b","objective":"hill_score"}},{"text":" / ${ts}","color":"gray"}]

# 勝利判定
execute if score #team_a hill_score matches ${ts}.. run function ${ns}:win_a
execute if score #team_b hill_score matches ${ts}.. run function ${ns}:win_b
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_check` });

    files.push({ path: `data/${ns}/function/win_a.mcfunction`, content:
`title ${P} title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
execute as @a[tag=team_a_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_b.mcfunction`, content:
`title ${P} title {"text":"${tB}の勝利！","bold":true,"color":"${settings.colorB || 'blue'}"}
execute as @a[tag=team_b_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_check.mcfunction`, content:
`# 時間切れ: スコアが多いチームの勝利
execute if score #team_a hill_score > #team_b hill_score run function ${ns}:win_a
execute if score #team_b hill_score > #team_a hill_score run function ${ns}:win_b
execute if score #team_a hill_score = #team_b hill_score run tellraw ${P} {"text":"引き分け！","color":"yellow","bold":true}
execute if score #team_a hill_score = #team_b hill_score run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
tag @a remove team_a_tag
tag @a remove team_b_tag
team empty team_a
team empty team_b
tellraw ${P} {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'zombie_survival') {
    const maxW = settings.maxWaves || 10;
    const zpw = settings.zombiesPerWave || 5;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ ゾンビサバイバル 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add wave dummy "ウェーブ"
scoreboard objectives add alive dummy "生存"
scoreboard objectives add deaths deathCount "死亡検知"
scoreboard objectives add kills dummy "キル数"
scoreboard objectives add wave_mobs dummy "残りモブ"
scoreboard players set #game game_state 0
say [ゾンビサバイバル] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ ゾンビサバイバル 開始 ═══
# 事前: tag @a add player
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 1
scoreboard players set ${P} deaths 0
scoreboard players set ${P} kills 0
gamemode adventure ${P}

scoreboard players set #wave wave 0
scoreboard players set #wave_mobs wave_mobs 0
scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color green

# 装備付与
give ${P} iron_sword
give ${P} bow
give ${P} arrow 32

scoreboard players set #game game_state 1
title ${P} title {"text":"ゾンビサバイバル","bold":true,"color":"dark_green"}
title ${P} subtitle {"text":"生き残れ！","color":"green"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ ゾンビサバイバル ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"サバイバル開始！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# 死亡検知
execute as @a[tag=player,scores={deaths=1..}] run scoreboard players set @s alive 0
execute as @a[tag=player,scores={deaths=1..}] run tellraw ${P} [{"selector":"@s","color":"red"},{"text":" がやられた！","color":"gray"}]
execute as @a[tag=player,scores={alive=0}] run gamemode spectator @s
scoreboard players set ${P} deaths 0

# ── ウェーブ管理（残りモブ0で次ウェーブ） ──
execute store result score #wave_mobs wave_mobs run execute if entity @e[tag=${ns}_zombie]
execute if score #timer pre_count matches 0 if score #wave_mobs wave_mobs matches 0 if score #wave wave matches ..${maxW - 1} run function ${ns}:next_wave

# HUD
bossbar set ${ns}:timer name ["",{"text":"Wave ","color":"dark_green"},{"score":{"name":"#wave","objective":"wave"},"color":"green"},{"text":"/${maxW} | 残り: ","color":"gray"},{"score":{"name":"#wave_mobs","objective":"wave_mobs"},"color":"white"},{"text":"体","color":"gray"}]

# 全員死亡 → ゲームオーバー
scoreboard players set #alive_count alive 0
execute as @a[tag=player,scores={alive=1}] run scoreboard players add #alive_count alive 1
execute if score #alive_count alive matches 0 run function ${ns}:game_over

# 全ウェーブクリア判定
execute if score #wave wave matches ${maxW}.. if score #wave_mobs wave_mobs matches 0 run function ${ns}:win

# 時間切れ
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:game_over` });

    files.push({ path: `data/${ns}/function/next_wave.mcfunction`, content:
`# ═══ 次ウェーブ ═══
scoreboard players add #wave wave 1

# ウェーブ数に応じてゾンビ召喚数を増加
# 基本${zpw}体 + ウェーブ数×2
tellraw ${P} ["",{"text":"Wave ","color":"dark_green","bold":true},{"score":{"name":"#wave","objective":"wave"},"color":"green","bold":true},{"text":" 開始！","color":"yellow"}]
title ${P} title ["",{"text":"Wave ","color":"dark_green"},{"score":{"name":"#wave","objective":"wave"},"color":"green"}]
playsound minecraft:entity.wither.spawn master ${P}

# ゾンビ召喚（プレイヤーの近くにランダム配置）
# 実際のゲームではここを調整してください
execute at @a[tag=player,scores={alive=1},limit=1,sort=random] run summon zombie ~5 ~ ~5 {Tags:["${ns}_zombie"],CustomName:'"サバイバルゾンビ"'}
execute at @a[tag=player,scores={alive=1},limit=1,sort=random] run summon zombie ~-5 ~ ~5 {Tags:["${ns}_zombie"]}
execute at @a[tag=player,scores={alive=1},limit=1,sort=random] run summon zombie ~5 ~ ~-5 {Tags:["${ns}_zombie"]}
execute at @a[tag=player,scores={alive=1},limit=1,sort=random] run summon zombie ~-5 ~ ~-5 {Tags:["${ns}_zombie"]}
execute at @a[tag=player,scores={alive=1},limit=1,sort=random] run summon zombie ~3 ~ ~0 {Tags:["${ns}_zombie"]}` });

    files.push({ path: `data/${ns}/function/win.mcfunction`, content:
`# ═══ サバイバル成功！ ═══
title ${P} title {"text":"サバイバル成功！","bold":true,"color":"gold"}
title ${P} subtitle {"text":"全ウェーブクリア！","color":"green"}
tellraw ${P} {"text":"═══ 生存者の勝利！ ═══","color":"gold","bold":true}
execute as @a[tag=player,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/game_over.mcfunction`, content:
`# ═══ ゲームオーバー ═══
title ${P} title {"text":"ゲームオーバー","bold":true,"color":"red"}
title ${P} subtitle ["",{"text":"Wave ","color":"gray"},{"score":{"name":"#wave","objective":"wave"},"color":"yellow"},{"text":" まで到達","color":"gray"}]
tellraw ${P} {"text":"═══ 全滅... ═══","color":"red","bold":true}
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
kill @e[tag=${ns}_zombie]
gamemode adventure ${P}
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 0
tag @a remove player
tellraw @a {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'build_battle') {
    const bt = settings.buildTime || 180;
    const vt = settings.voteTime || 60;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ 建築バトル 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add phase dummy "フェーズ"
scoreboard objectives add votes dummy "投票数"
scoreboard objectives add vote_trigger trigger "投票"
scoreboard players set #game game_state 0
say [建築バトル] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ 建築バトル 開始 ═══
# 事前: tag @a add player
clear ${P}
effect clear ${P}
scoreboard players set ${P} votes 0
gamemode creative ${P}

scoreboard players set #phase phase 1
scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${bt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${bt}
bossbar set ${ns}:timer value ${bt}
bossbar set ${ns}:timer color yellow

scoreboard players set #game game_state 1
title ${P} title {"text":"建築バトル","bold":true,"color":"gold"}
title ${P} subtitle {"text":"建築時間: ${bt}秒","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ 建築バトル ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 if score #phase phase matches 1 run title ${P} title {"text":"建築開始！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1 if score #phase phase matches 2 run title ${P} title {"text":"投票開始！","bold":true,"color":"aqua"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# HUD
execute if score #phase phase matches 1 run bossbar set ${ns}:timer name ["",{"text":"建築中 | 残り ","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒","color":"yellow"}]
execute if score #phase phase matches 2 run bossbar set ${ns}:timer name ["",{"text":"投票中 | 残り ","color":"aqua"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒","color":"aqua"}]

# フェーズ遷移: 建築時間終了 → 投票フェーズ
execute if score #phase phase matches 1 if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:start_vote

# 投票フェーズ終了 → 結果発表
execute if score #phase phase matches 2 if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:result` });

    files.push({ path: `data/${ns}/function/start_vote.mcfunction`, content:
`# ═══ 投票フェーズ開始 ═══
scoreboard players set #phase phase 2
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${vt}
scoreboard players set #timer pre_count 40
bossbar set ${ns}:timer max ${vt}
bossbar set ${ns}:timer value ${vt}
bossbar set ${ns}:timer color aqua

title ${P} title {"text":"建築終了！","bold":true,"color":"red"}
title ${P} subtitle {"text":"投票が始まります...","color":"yellow"}
tellraw ${P} {"text":"投票するには /trigger vote_trigger set <番号> を使ってください","color":"aqua"}` });

    files.push({ path: `data/${ns}/function/result.mcfunction`, content:
`# ═══ 結果発表 ═══
title ${P} title {"text":"結果発表！","bold":true,"color":"gold"}
tellraw ${P} {"text":"═══ 建築バトル結果 ═══","color":"gold","bold":true}
execute as ${P} run tellraw ${P} [{"selector":"@s"},{"text":": ","color":"gray"},{"score":{"name":"@s","objective":"votes"},"color":"white"},{"text":"票","color":"gray"}]
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
tag @a remove player
tellraw ${P} {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'capture_flag') {
    const tA = settings.teamA || '赤チーム';
    const tB = settings.teamB || '青チーム';
    const cn = settings.capturesNeeded || 3;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ 旗取り(CTF) 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add captures dummy "奪取回数"
scoreboard objectives add has_flag dummy "旗を持っている"
scoreboard objectives add deaths deathCount "死亡検知"

team add team_a "${tA}"
team add team_b "${tB}"
team modify team_a color ${settings.colorA || 'red'}
team modify team_b color ${settings.colorB || 'blue'}
team modify team_a friendlyFire false
team modify team_b friendlyFire false

scoreboard players set #game game_state 0
scoreboard players set #team_a captures 0
scoreboard players set #team_b captures 0
say [旗取り(CTF)] 読み込み完了！` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ 旗取り(CTF) 開始 ═══
# 事前: tag @a add player / tag <赤> add team_a_pick
# 旗のマーカー配置: /summon marker <x> <y> <z> {Tags:["flag_a"]}
#                    /summon marker <x> <y> <z> {Tags:["flag_b"]}
# 自陣マーカー:      /summon marker <x> <y> <z> {Tags:["base_a"]}
#                    /summon marker <x> <y> <z> {Tags:["base_b"]}

team join team_a @a[tag=team_a_pick]
team join team_b @a[tag=player,tag=!team_a_pick]
tag @a[tag=player,tag=!team_a_pick] add team_b_tag
tag @a[tag=team_a_pick] add team_a_tag
tag @a remove team_a_pick

clear ${P}
effect clear ${P}
scoreboard players set #team_a captures 0
scoreboard players set #team_b captures 0
scoreboard players set ${P} has_flag 0
scoreboard players set ${P} deaths 0
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow

give ${P} iron_sword
give ${P} bow
give ${P} arrow 16

scoreboard players set #game game_state 1
title ${P} title {"text":"旗取り(CTF)","bold":true,"color":"gold"}
title ${P} subtitle {"text":"相手の旗を奪え！","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ 旗取り(CTF) ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"開戦！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# ── 旗の取得判定 ──
# チームAが敵旗(flag_b)を取得
execute as @a[tag=team_a_tag,scores={has_flag=0}] at @s if entity @e[tag=flag_b,distance=..3] run scoreboard players set @s has_flag 1
execute as @a[tag=team_a_tag,scores={has_flag=0}] at @s if entity @e[tag=flag_b,distance=..3] run tellraw ${P} [{"selector":"@s","color":"${settings.colorA || 'red'}"},{"text":" が旗を奪った！","color":"yellow"}]
execute as @a[tag=team_a_tag,scores={has_flag=0}] at @s if entity @e[tag=flag_b,distance=..3] run playsound minecraft:entity.experience_orb.pickup master ${P}

# チームBが敵旗(flag_a)を取得
execute as @a[tag=team_b_tag,scores={has_flag=0}] at @s if entity @e[tag=flag_a,distance=..3] run scoreboard players set @s has_flag 1
execute as @a[tag=team_b_tag,scores={has_flag=0}] at @s if entity @e[tag=flag_a,distance=..3] run tellraw ${P} [{"selector":"@s","color":"${settings.colorB || 'blue'}"},{"text":" が旗を奪った！","color":"yellow"}]

# ── 旗を自陣に持ち帰り判定 ──
execute as @a[tag=team_a_tag,scores={has_flag=1}] at @s if entity @e[tag=base_a,distance=..3] run function ${ns}:capture_a
execute as @a[tag=team_b_tag,scores={has_flag=1}] at @s if entity @e[tag=base_b,distance=..3] run function ${ns}:capture_b

# ── 旗持ちが死亡したら旗ドロップ ──
execute as @a[tag=player,scores={has_flag=1,deaths=1..}] run scoreboard players set @s has_flag 0
execute as @a[tag=player,scores={has_flag=1,deaths=1..}] run tellraw ${P} [{"selector":"@s"},{"text":" が旗を落とした！","color":"red"}]
scoreboard players set ${P} deaths 0

# 旗持ちにエフェクト（光る）
effect give @a[tag=player,scores={has_flag=1}] glowing 2 0 true

# HUD
bossbar set ${ns}:timer name ["",{"text":"${tA}: ","color":"${settings.colorA || 'red'}"},{"score":{"name":"#team_a","objective":"captures"}},{"text":" | ${tB}: ","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#team_b","objective":"captures"}},{"text":" (${cn}奪取で勝利)","color":"gray"}]

# 勝利判定
execute if score #team_a captures matches ${cn}.. run function ${ns}:win_a
execute if score #team_b captures matches ${cn}.. run function ${ns}:win_b
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_check` });

    files.push({ path: `data/${ns}/function/capture_a.mcfunction`, content:
`# チームAの奪取成功
scoreboard players add #team_a captures 1
scoreboard players set @s has_flag 0
title ${P} title {"text":"${tA}が奪取！","bold":true,"color":"${settings.colorA || 'red'}"}
playsound minecraft:ui.toast.challenge_complete master @a[tag=team_a_tag]` });

    files.push({ path: `data/${ns}/function/capture_b.mcfunction`, content:
`# チームBの奪取成功
scoreboard players add #team_b captures 1
scoreboard players set @s has_flag 0
title ${P} title {"text":"${tB}が奪取！","bold":true,"color":"${settings.colorB || 'blue'}"}
playsound minecraft:ui.toast.challenge_complete master @a[tag=team_b_tag]` });

    files.push({ path: `data/${ns}/function/win_a.mcfunction`, content:
`title ${P} title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
execute as @a[tag=team_a_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_b.mcfunction`, content:
`title ${P} title {"text":"${tB}の勝利！","bold":true,"color":"${settings.colorB || 'blue'}"}
execute as @a[tag=team_b_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_check.mcfunction`, content:
`execute if score #team_a captures > #team_b captures run function ${ns}:win_a
execute if score #team_b captures > #team_a captures run function ${ns}:win_b
execute if score #team_a captures = #team_b captures run tellraw ${P} {"text":"引き分け！","color":"yellow","bold":true}
execute if score #team_a captures = #team_b captures run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
scoreboard players set ${P} has_flag 0
tag @a remove team_a_tag
tag @a remove team_b_tag
team empty team_a
team empty team_b
tellraw ${P} {"text":"ゲームリセット完了","color":"gray"}` });

  } else if (gameType === 'tnt_run') {
    const fallY = settings.fallY || 0;
    const layers = settings.layerCount || 3;
    files.push({ path: `data/${ns}/function/reload.mcfunction`, content:
`# ═══ TNTラン 初期化 ═══
scoreboard objectives add game_state dummy "ゲーム状態"
scoreboard objectives add timer_tick dummy "tick"
scoreboard objectives add timer_sec dummy "秒"
scoreboard objectives add pre_count dummy "カウントダウン"
scoreboard objectives add alive dummy "生存"
scoreboard players set #game game_state 0
say [TNTラン] 読み込み完了！
# 注: フロアはTNTの上にサンド/砂利を置いてください（${layers}層推奨）` });

    files.push({ path: `data/${ns}/function/main.mcfunction`, content:
`execute if score #game game_state matches 1 run function ${ns}:game_loop` });

    files.push({ path: `data/${ns}/function/start.mcfunction`, content:
`# ═══ TNTラン 開始 ═══
# 事前: tag @a add player
# フロア構造: TNTの上にサンド/砂利を配置（複数層）
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 1
gamemode adventure ${P}

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players ${P}
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color red

scoreboard players set #game game_state 1
title ${P} title {"text":"TNTラン","bold":true,"color":"red"}
title ${P} subtitle {"text":"走れ！止まるな！","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ TNTラン ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title ${P} title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title ${P} title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title ${P} title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title ${P} title {"text":"走れ！","bold":true,"color":"red"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# ── 足元のブロックを遅延消去（プレイヤーの足元を3tick後に消す） ──
execute if score #timer pre_count matches 0 as @a[tag=player,scores={alive=1}] at @s run function ${ns}:remove_block

# ── 落下検知（Y=${fallY}以下で脱落） ──
execute as @a[tag=player,scores={alive=1}] at @s if entity @s[y=-64,dy=${fallY + 64}] run scoreboard players set @s alive 0
execute as @a[tag=player,scores={alive=0}] run gamemode spectator @s
execute as @a[tag=player,scores={alive=0}] run tellraw ${P} [{"selector":"@s","color":"red"},{"text":" が落ちた！","color":"gray"}]
execute as @a[tag=player,scores={alive=0}] run scoreboard players set @s alive -1

# 生存者カウント
scoreboard players set #alive_count alive 0
execute as @a[tag=player,scores={alive=1}] run scoreboard players add #alive_count alive 1

# HUD
bossbar set ${ns}:timer name ["",{"text":"生存者: ","color":"red"},{"score":{"name":"#alive_count","objective":"alive"},"color":"white"},{"text":"人 | 残り","color":"red"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒","color":"red"}]

# 勝利判定（残り1人以下）
execute if score #alive_count alive matches ..1 run function ${ns}:win
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win` });

    files.push({ path: `data/${ns}/function/remove_block.mcfunction`, content:
`# ═══ 足元のブロック消去 ═══
# プレイヤーの足元のブロックをairに置換（2tick遅延風の演出）
# sand/gravel の場合は自然落下するので TNT+sand の構造が推奨
execute at @s run setblock ~ ~-1 ~ air replace` });

    files.push({ path: `data/${ns}/function/win.mcfunction`, content:
`# ═══ 勝者決定 ═══
execute as @a[tag=player,scores={alive=1}] run title ${P} title [{"selector":"@s","bold":true,"color":"gold"},{"text":"の勝利！","bold":true,"color":"yellow"}]
execute as @a[tag=player,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
execute unless entity @a[tag=player,scores={alive=1}] run title ${P} title {"text":"全員落下！","bold":true,"color":"red"}
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure ${P}
clear ${P}
effect clear ${P}
scoreboard players set ${P} alive 0
tag @a remove player
tellraw @a {"text":"ゲームリセット完了","color":"gray"}` });
  }

  return files;
}

// ════════════════════════════════════════════════════════════
// SYSTEM FILE GENERATOR
// ════════════════════════════════════════════════════════════

function generateSystemFiles(ns, systemType, settings) {
  const files = [];

  if (systemType === 'custom_weapon') {
    const wName = settings.weaponName || '炎の剣';
    const wItem = settings.weaponItem || 'minecraft:diamond_sword';
    const particle = settings.particleEffect || 'flame';
    const dmg = settings.damage || 10;
    const cd = settings.cooldown || 60;

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:weapon/setup`] }, null, 2), merge: true });
    files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:weapon/tick`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/weapon/setup.mcfunction`, content:
`# ═══ カスタム武器: ${wName} セットアップ ═══
scoreboard objectives add ${ns}_cd dummy "クールダウン"
scoreboard objectives add ${ns}_use minecraft.used:minecraft.carrot_on_a_stick "使用検知"
say [カスタム武器] ${wName} が読み込まれました！` });

    files.push({ path: `data/${ns}/function/weapon/tick.mcfunction`, content:
`# ═══ カスタム武器 Tick処理 ═══
# クールダウン減少
execute as @a[scores={${ns}_cd=1..}] run scoreboard players remove @s ${ns}_cd 1

# 使用検知（carrot_on_a_stickを右クリック）
execute as @a[scores={${ns}_use=1..},nbt={SelectedItem:{tag:{${ns}_weapon:1b}}}] run function ${ns}:weapon/activate
scoreboard players set @a ${ns}_use 0` });

    files.push({ path: `data/${ns}/function/weapon/activate.mcfunction`, content:
`# ═══ ${wName} スキル発動 ═══
# クールダウンチェック
execute if score @s ${ns}_cd matches 1.. run tellraw @s {"text":"クールダウン中...","color":"red"}
execute if score @s ${ns}_cd matches 1.. run return 0

# スキル発動
scoreboard players set @s ${ns}_cd ${cd}
title @s actionbar {"text":"${wName} 発動！","color":"gold","bold":true}
playsound minecraft:entity.blaze.shoot master @s

# 前方のエンティティにダメージ
execute at @s anchored eyes run damage @e[distance=..5,limit=3,sort=nearest,tag=!${ns}_immune] ${dmg} minecraft:magic by @s

# パーティクル演出
execute at @s run particle ${particle} ~ ~1 ~ 0.5 0.5 0.5 0.1 30` });

    files.push({ path: `data/${ns}/function/weapon/give.mcfunction`, content:
`# ═══ ${wName} を付与 ═══
give @s ${wItem}{display:{Name:'[{"text":"${wName}","italic":false,"color":"gold","bold":true}]',Lore:['[{"text":"右クリックでスキル発動","italic":true,"color":"gray"}]']},${ns}_weapon:1b}
tellraw @s [{"text":"[武器] ","color":"gold"},{"text":"${wName}","color":"yellow","bold":true},{"text":" を入手！","color":"gold"}]` });

  } else if (systemType === 'shop_npc') {
    const sName = settings.shopName || 'ショップ';
    const cur = settings.currency || 'coins';
    const itemCount = settings.items || 3;

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:shop/setup`] }, null, 2), merge: true });
    files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:shop/tick`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/shop/setup.mcfunction`, content:
`# ═══ ${sName} セットアップ ═══
scoreboard objectives add ${cur} dummy "${sName}の通貨"
scoreboard objectives add shop_trigger trigger "${sName}"

# NPC召喚コマンド（任意の場所で実行）:
# summon villager ~ ~ ~ {CustomName:'"${sName}"',NoAI:1b,Invulnerable:1b,Tags:["${ns}_shop"]}

say [${sName}] ショップシステムが読み込まれました！
tellraw @a {"text":"ショップを利用するには /trigger shop_trigger set <番号>","color":"green"}` });

    files.push({ path: `data/${ns}/function/shop/tick.mcfunction`, content:
`# ═══ ${sName} Tick処理 ═══
# triggerの処理
execute as @a[scores={shop_trigger=1}] run function ${ns}:shop/buy_1
execute as @a[scores={shop_trigger=2}] run function ${ns}:shop/buy_2
execute as @a[scores={shop_trigger=3}] run function ${ns}:shop/buy_3

# triggerリセット
scoreboard players set @a shop_trigger 0
scoreboard players enable @a shop_trigger

# NPC近くにいるプレイヤーにメニュー表示
execute as @a at @s if entity @e[tag=${ns}_shop,distance=..3] run title @s actionbar ["",{"text":"${sName} ","color":"green","bold":true},{"text":"| /trigger shop_trigger set <番号>","color":"gray"}]` });

    files.push({ path: `data/${ns}/function/shop/menu.mcfunction`, content:
`# ═══ ${sName} メニュー表示 ═══
tellraw @s {"text":"","extra":[{"text":"═══ ${sName} ═══","color":"gold","bold":true}]}
tellraw @s {"text":"","extra":[{"text":"所持金: ","color":"gray"},{"score":{"name":"@s","objective":"${cur}"},"color":"yellow"},{"text":" コイン","color":"gray"}]}
tellraw @s {"text":""}
tellraw @s [{"text":"[1] ","color":"green","clickEvent":{"action":"run_command","value":"/trigger shop_trigger set 1"}},{"text":"鉄の剣 - 10コイン","color":"white"}]
tellraw @s [{"text":"[2] ","color":"green","clickEvent":{"action":"run_command","value":"/trigger shop_trigger set 2"}},{"text":"弓 - 15コイン","color":"white"}]
tellraw @s [{"text":"[3] ","color":"green","clickEvent":{"action":"run_command","value":"/trigger shop_trigger set 3"}},{"text":"金リンゴ - 20コイン","color":"white"}]` });

    files.push({ path: `data/${ns}/function/shop/buy_1.mcfunction`, content:
`# ═══ 商品1: 鉄の剣（10コイン） ═══
execute if score @s ${cur} matches 10.. run scoreboard players remove @s ${cur} 10
execute if score @s ${cur} matches 10.. run give @s iron_sword
execute if score @s ${cur} matches 10.. run tellraw @s {"text":"鉄の剣を購入しました！","color":"green"}
execute unless score @s ${cur} matches 10.. run tellraw @s {"text":"コインが足りません！","color":"red"}` });

    files.push({ path: `data/${ns}/function/shop/buy_2.mcfunction`, content:
`# ═══ 商品2: 弓（15コイン） ═══
execute if score @s ${cur} matches 15.. run scoreboard players remove @s ${cur} 15
execute if score @s ${cur} matches 15.. run give @s bow
execute if score @s ${cur} matches 15.. run give @s arrow 16
execute if score @s ${cur} matches 15.. run tellraw @s {"text":"弓を購入しました！","color":"green"}
execute unless score @s ${cur} matches 15.. run tellraw @s {"text":"コインが足りません！","color":"red"}` });

    files.push({ path: `data/${ns}/function/shop/buy_3.mcfunction`, content:
`# ═══ 商品3: 金リンゴ（20コイン） ═══
execute if score @s ${cur} matches 20.. run scoreboard players remove @s ${cur} 20
execute if score @s ${cur} matches 20.. run give @s golden_apple
execute if score @s ${cur} matches 20.. run tellraw @s {"text":"金リンゴを購入しました！","color":"green"}
execute unless score @s ${cur} matches 20.. run tellraw @s {"text":"コインが足りません！","color":"red"}` });

    files.push({ path: `data/${ns}/function/shop/add_coins.mcfunction`, content:
`# ═══ コイン付与 ═══
# 使い方: execute as <プレイヤー> run function ${ns}:shop/add_coins
scoreboard players add @s ${cur} 10
tellraw @s [{"text":"[+10] ","color":"gold"},{"score":{"name":"@s","objective":"${cur}"},"color":"yellow"},{"text":" コイン","color":"gray"}]
playsound minecraft:entity.experience_orb.pickup master @s` });

  } else if (systemType === 'teleport_system') {
    const pc = settings.pointCount || 3;

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:teleport/setup`] }, null, 2), merge: true });
    files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:teleport/tick`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/teleport/setup.mcfunction`, content:
`# ═══ テレポートシステム セットアップ ═══
scoreboard objectives add tp_trigger trigger "テレポート"
scoreboard players enable @a tp_trigger

# ワープポイントの設置:
${Array.from({length: pc}, (_, i) => `# ポイント${i+1}: /summon marker <x> <y> <z> {Tags:["${ns}_tp${i+1}"],CustomName:'"ポイント${i+1}"'}`).join('\n')}

say [テレポート] システムが読み込まれました！
tellraw @a {"text":"/trigger tp_trigger set <番号> でテレポート","color":"aqua"}` });

    files.push({ path: `data/${ns}/function/teleport/tick.mcfunction`, content:
`# ═══ テレポートシステム Tick処理 ═══
${Array.from({length: pc}, (_, i) => `execute as @a[scores={tp_trigger=${i+1}}] run function ${ns}:teleport/go_${i+1}`).join('\n')}

# triggerリセット
scoreboard players set @a tp_trigger 0
scoreboard players enable @a tp_trigger` });

    for (let i = 1; i <= pc; i++) {
      files.push({ path: `data/${ns}/function/teleport/go_${i}.mcfunction`, content:
`# ═══ ポイント${i}にテレポート ═══
execute at @e[tag=${ns}_tp${i},limit=1] run tp @s ~ ~ ~
title @s actionbar {"text":"ポイント${i}にテレポート！","color":"aqua"}
playsound minecraft:entity.enderman.teleport master @s
particle portal ~ ~1 ~ 0.5 1 0.5 0.1 50` });
    }

    files.push({ path: `data/${ns}/function/teleport/menu.mcfunction`, content:
`# ═══ テレポートメニュー ═══
tellraw @s {"text":"═══ テレポート ═══","color":"aqua","bold":true}
${Array.from({length: pc}, (_, i) => `tellraw @s [{"text":"[${i+1}] ","color":"aqua","clickEvent":{"action":"run_command","value":"/trigger tp_trigger set ${i+1}"}},{"text":"ポイント${i+1}","color":"white"}]`).join('\n')}` });

  } else if (systemType === 'loot_box') {
    const bName = settings.boxName || '宝箱';
    const cost = settings.cost || 10;
    const cur = settings.currency || 'coins';

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:lootbox/setup`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/lootbox/setup.mcfunction`, content:
`# ═══ ${bName}（ルートボックス）セットアップ ═══
scoreboard objectives add ${cur} dummy "通貨"
scoreboard objectives add loot_trigger trigger "${bName}"
scoreboard players enable @a loot_trigger
say [${bName}] ルートボックスシステムが読み込まれました！` });

    files.push({ path: `data/${ns}/function/lootbox/open.mcfunction`, content:
`# ═══ ${bName}を開ける ═══
# コスト: ${cost}コイン
execute unless score @s ${cur} matches ${cost}.. run tellraw @s {"text":"コインが足りません！（${cost}コイン必要）","color":"red"}
execute unless score @s ${cur} matches ${cost}.. run return 0

scoreboard players remove @s ${cur} ${cost}
title @s title {"text":"${bName}","bold":true,"color":"gold"}
playsound minecraft:block.chest.open master @s
playsound minecraft:entity.player.levelup master @s

# ランダム抽選（loot_tableを使用）
loot give @s loot ${ns}:lootbox/common
tellraw @s [{"text":"[${bName}] ","color":"gold"},{"text":"アイテムを入手！","color":"yellow"}]` });

    files.push({ path: `data/${ns}/loot_table/lootbox/common.json`, content: JSON.stringify({
      pools: [{
        rolls: 1,
        entries: [
          { type: "minecraft:item", name: "minecraft:iron_ingot", weight: 40, functions: [{ function: "minecraft:set_count", count: { min: 1, max: 5 } }] },
          { type: "minecraft:item", name: "minecraft:gold_ingot", weight: 30, functions: [{ function: "minecraft:set_count", count: { min: 1, max: 3 } }] },
          { type: "minecraft:item", name: "minecraft:diamond", weight: 20 },
          { type: "minecraft:item", name: "minecraft:emerald", weight: 8, functions: [{ function: "minecraft:set_count", count: { min: 1, max: 3 } }] },
          { type: "minecraft:item", name: "minecraft:netherite_ingot", weight: 2 },
        ]
      }]
    }, null, 2) });

    files.push({ path: `data/${ns}/loot_table/lootbox/rare.json`, content: JSON.stringify({
      pools: [{
        rolls: 1,
        entries: [
          { type: "minecraft:item", name: "minecraft:diamond", weight: 40, functions: [{ function: "minecraft:set_count", count: { min: 1, max: 3 } }] },
          { type: "minecraft:item", name: "minecraft:emerald_block", weight: 25 },
          { type: "minecraft:item", name: "minecraft:netherite_ingot", weight: 20 },
          { type: "minecraft:item", name: "minecraft:enchanted_golden_apple", weight: 10 },
          { type: "minecraft:item", name: "minecraft:totem_of_undying", weight: 5 },
        ]
      }]
    }, null, 2) });

  } else if (systemType === 'recipe_set') {
    const rType = settings.recipeType || 'weapon';
    const rCount = settings.recipeCount || 3;

    if (rType === 'weapon') {
      files.push({ path: `data/${ns}/recipe/fire_sword.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["B","S","S"],
        key: { B: "minecraft:blaze_powder", S: "minecraft:iron_sword" },
        result: { id: "minecraft:iron_sword", count: 1 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/thunder_axe.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["LL","LS"," S"],
        key: { L: "minecraft:lightning_rod", S: "minecraft:stick" },
        result: { id: "minecraft:diamond_axe", count: 1 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/ender_bow.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: [" ES","E S"," ES"],
        key: { E: "minecraft:ender_pearl", S: "minecraft:string" },
        result: { id: "minecraft:bow", count: 1 }
      }, null, 2) });
    } else if (rType === 'armor') {
      files.push({ path: `data/${ns}/recipe/reinforced_helmet.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["DID","I I"],
        key: { D: "minecraft:diamond", I: "minecraft:iron_ingot" },
        result: { id: "minecraft:diamond_helmet", count: 1 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/reinforced_chestplate.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["D D","DID","DID"],
        key: { D: "minecraft:diamond", I: "minecraft:iron_ingot" },
        result: { id: "minecraft:diamond_chestplate", count: 1 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/reinforced_boots.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["D D","I I"],
        key: { D: "minecraft:diamond", I: "minecraft:iron_ingot" },
        result: { id: "minecraft:diamond_boots", count: 1 }
      }, null, 2) });
    } else if (rType === 'food') {
      files.push({ path: `data/${ns}/recipe/super_stew.json`, content: JSON.stringify({
        type: "minecraft:crafting_shapeless",
        ingredients: ["minecraft:mushroom_stew", "minecraft:golden_carrot", "minecraft:honey_bottle"],
        result: { id: "minecraft:suspicious_stew", count: 1 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/golden_bread.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["GGG"],
        key: { G: "minecraft:gold_nugget" },
        result: { id: "minecraft:bread", count: 3 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/energy_cookie.json`, content: JSON.stringify({
        type: "minecraft:crafting_shapeless",
        ingredients: ["minecraft:cookie", "minecraft:sugar", "minecraft:glowstone_dust"],
        result: { id: "minecraft:cookie", count: 8 }
      }, null, 2) });
    } else {
      files.push({ path: `data/${ns}/recipe/packed_cobble.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["CCC","CCC","CCC"],
        key: { C: "minecraft:cobblestone" },
        result: { id: "minecraft:stone", count: 9 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/easy_chain.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["N","I","N"],
        key: { N: "minecraft:iron_nugget", I: "minecraft:iron_ingot" },
        result: { id: "minecraft:chain", count: 2 }
      }, null, 2) });
      files.push({ path: `data/${ns}/recipe/compact_quartz.json`, content: JSON.stringify({
        type: "minecraft:crafting_shaped",
        pattern: ["QQ","QQ"],
        key: { Q: "minecraft:quartz" },
        result: { id: "minecraft:quartz_block", count: 1 }
      }, null, 2) });
    }

  } else if (systemType === 'boss_fight') {
    const bossName = settings.bossName || 'ドラゴンロード';
    const bossEntity = settings.bossEntity || 'minecraft:wither_skeleton';
    const bossHp = settings.bossHp || 100;
    const phases = settings.phases || 3;

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:boss/setup`] }, null, 2), merge: true });
    files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:boss/tick`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/boss/setup.mcfunction`, content:
`# ═══ ボス戦: ${bossName} セットアップ ═══
scoreboard objectives add boss_hp dummy "ボスHP"
scoreboard objectives add boss_phase dummy "フェーズ"
scoreboard objectives add boss_active dummy "ボス活性"
scoreboard players set #boss boss_hp ${bossHp}
scoreboard players set #boss boss_phase 1
scoreboard players set #boss boss_active 0
say [ボス戦] ${bossName} システムが読み込まれました！` });

    files.push({ path: `data/${ns}/function/boss/tick.mcfunction`, content:
`# ═══ ボス戦 Tick処理 ═══
execute if score #boss boss_active matches 1 run function ${ns}:boss/loop` });

    files.push({ path: `data/${ns}/function/boss/summon.mcfunction`, content:
`# ═══ ${bossName} 召喚 ═══
# ボスを召喚
summon ${bossEntity} ~ ~ ~ {CustomName:'"${bossName}"',CustomNameVisible:1b,Tags:["${ns}_boss"],PersistenceRequired:1b,Attributes:[{Name:"generic.max_health",Base:${bossHp}},{Name:"generic.attack_damage",Base:10}],Health:${bossHp}f}

# ボスバー作成
bossbar add ${ns}:boss "${bossName}"
bossbar set ${ns}:boss players @a[distance=..50]
bossbar set ${ns}:boss max ${bossHp}
bossbar set ${ns}:boss value ${bossHp}
bossbar set ${ns}:boss color red

scoreboard players set #boss boss_hp ${bossHp}
scoreboard players set #boss boss_phase 1
scoreboard players set #boss boss_active 1

title @a[distance=..50] title {"text":"${bossName}","bold":true,"color":"dark_red"}
title @a[distance=..50] subtitle {"text":"フェーズ 1","color":"red"}
playsound minecraft:entity.wither.spawn master @a[distance=..50]` });

    files.push({ path: `data/${ns}/function/boss/loop.mcfunction`, content:
`# ═══ ${bossName} ループ ═══
# ボスHP同期
execute store result score #boss boss_hp run data get entity @e[tag=${ns}_boss,limit=1] Health

# ボスバー更新
execute store result bossbar ${ns}:boss value run scoreboard players get #boss boss_hp
bossbar set ${ns}:boss name ["",{"text":"${bossName} ","color":"dark_red","bold":true},{"text":"[フェーズ ","color":"gray"},{"score":{"name":"#boss","objective":"boss_phase"},"color":"yellow"},{"text":"/${phases}]","color":"gray"}]

# フェーズ遷移
${Array.from({length: phases - 1}, (_, i) => {
  const threshold = Math.floor(bossHp * (phases - i - 1) / phases);
  return `execute if score #boss boss_phase matches ${i+1} if score #boss boss_hp matches ..${threshold} run function ${ns}:boss/phase_${i+2}`;
}).join('\n')}

# ボス死亡判定
execute unless entity @e[tag=${ns}_boss] run function ${ns}:boss/defeated

# ボススキル（各フェーズで毎秒異なるスキル）
execute if score #boss boss_phase matches 1 at @e[tag=${ns}_boss,limit=1] run particle flame ~ ~2 ~ 1 1 1 0.05 10
execute if score #boss boss_phase matches 2 at @e[tag=${ns}_boss,limit=1] run particle soul_fire_flame ~ ~2 ~ 1 1 1 0.05 15
execute if score #boss boss_phase matches ${phases} at @e[tag=${ns}_boss,limit=1] run particle dragon_breath ~ ~2 ~ 2 1 2 0.02 20` });

    for (let p = 2; p <= phases; p++) {
      files.push({ path: `data/${ns}/function/boss/phase_${p}.mcfunction`, content:
`# ═══ ${bossName} フェーズ${p} ═══
scoreboard players set #boss boss_phase ${p}
title @a[distance=..50] title {"text":"フェーズ ${p}","bold":true,"color":"red"}
playsound minecraft:entity.ender_dragon.growl master @a[distance=..50]
# フェーズ${p}の強化（速度UP・攻撃力UP）
effect give @e[tag=${ns}_boss,limit=1] speed ${10 + p * 5} ${p - 1} true
effect give @e[tag=${ns}_boss,limit=1] strength ${10 + p * 5} ${p - 1} true
tellraw @a[distance=..50] {"text":"${bossName}がフェーズ${p}に移行！","color":"red","bold":true}` });
    }

    files.push({ path: `data/${ns}/function/boss/defeated.mcfunction`, content:
`# ═══ ${bossName} 撃破！ ═══
scoreboard players set #boss boss_active 0
bossbar remove ${ns}:boss
title @a[distance=..50] title {"text":"${bossName} 撃破！","bold":true,"color":"gold"}
playsound minecraft:ui.toast.challenge_complete master @a[distance=..50]

# 報酬ドロップ
loot give @a[distance=..50,limit=1,sort=nearest] loot ${ns}:boss/reward
tellraw @a[distance=..50] {"text":"═══ 報酬を獲得！ ═══","color":"gold","bold":true}` });

    files.push({ path: `data/${ns}/loot_table/boss/reward.json`, content: JSON.stringify({
      pools: [{
        rolls: { min: 2, max: 4 },
        entries: [
          { type: "minecraft:item", name: "minecraft:diamond", weight: 30, functions: [{ function: "minecraft:set_count", count: { min: 3, max: 8 } }] },
          { type: "minecraft:item", name: "minecraft:netherite_ingot", weight: 15 },
          { type: "minecraft:item", name: "minecraft:enchanted_golden_apple", weight: 10 },
          { type: "minecraft:item", name: "minecraft:totem_of_undying", weight: 5 },
          { type: "minecraft:item", name: "minecraft:experience_bottle", weight: 40, functions: [{ function: "minecraft:set_count", count: { min: 5, max: 15 } }] },
        ]
      }]
    }, null, 2) });

  } else if (systemType === 'lobby_system') {
    const lName = settings.lobbyName || 'ロビー';
    const minP = settings.minPlayers || 2;
    const maxP = settings.maxPlayers || 16;
    const cd = settings.countdown || 30;

    files.push({ path: `data/minecraft/tags/function/load.json`, content: JSON.stringify({ values: [`${ns}:lobby/setup`] }, null, 2), merge: true });
    files.push({ path: `data/minecraft/tags/function/tick.json`, content: JSON.stringify({ values: [`${ns}:lobby/tick`] }, null, 2), merge: true });

    files.push({ path: `data/${ns}/function/lobby/setup.mcfunction`, content:
`# ═══ ${lName} セットアップ ═══
scoreboard objectives add lobby_state dummy "ロビー状態"
scoreboard objectives add lobby_count dummy "参加人数"
scoreboard objectives add lobby_cd dummy "カウントダウン"
scoreboard objectives add lobby_ready dummy "準備完了"
scoreboard objectives add ready_trigger trigger "準備"

scoreboard players set #lobby lobby_state 0
scoreboard players set #lobby lobby_cd ${cd}
scoreboard players enable @a ready_trigger

# ロビーのスポーン地点にマーカー配置:
# /summon marker <x> <y> <z> {Tags:["${ns}_lobby_spawn"]}

say [${lName}] ロビーシステムが読み込まれました！` });

    files.push({ path: `data/${ns}/function/lobby/tick.mcfunction`, content:
`# ═══ ${lName} Tick処理 ═══
# 準備完了トリガー処理
execute as @a[scores={ready_trigger=1..}] run function ${ns}:lobby/toggle_ready
scoreboard players set @a ready_trigger 0
scoreboard players enable @a ready_trigger

# 参加者カウント
scoreboard players set #lobby lobby_count 0
execute as @a[tag=lobby_player] run scoreboard players add #lobby lobby_count 1

# 準備完了者カウント
scoreboard players set #ready_count lobby_ready 0
execute as @a[tag=lobby_player,scores={lobby_ready=1}] run scoreboard players add #ready_count lobby_ready 1

# 待機中 → 全員準備完了かつ最低人数以上でカウントダウン開始
execute if score #lobby lobby_state matches 0 if score #lobby lobby_count matches ${minP}.. if score #ready_count lobby_ready >= #lobby lobby_count run scoreboard players set #lobby lobby_state 1

# カウントダウン中
execute if score #lobby lobby_state matches 1 run function ${ns}:lobby/countdown

# HUD
execute as @a[tag=lobby_player] run title @s actionbar ["",{"text":"${lName} ","color":"green","bold":true},{"text":"| ","color":"gray"},{"score":{"name":"#lobby","objective":"lobby_count"},"color":"white"},{"text":"/${maxP}人 ","color":"gray"},{"text":"| /trigger ready_trigger で準備完了","color":"aqua"}]` });

    files.push({ path: `data/${ns}/function/lobby/join.mcfunction`, content:
`# ═══ ${lName}に参加 ═══
# 使い方: 参加したいプレイヤーとして実行
execute if score #lobby lobby_count matches ${maxP}.. run tellraw @s {"text":"ロビーが満員です！","color":"red"}
execute if score #lobby lobby_count matches ${maxP}.. run return 0

tag @s add lobby_player
scoreboard players set @s lobby_ready 0
gamemode adventure @s
tellraw @a[tag=lobby_player] [{"selector":"@s","color":"green"},{"text":" がロビーに参加！","color":"yellow"}]
playsound minecraft:entity.experience_orb.pickup master @a[tag=lobby_player]
tellraw @s {"text":"準備ができたら /trigger ready_trigger set 1","color":"aqua"}` });

    files.push({ path: `data/${ns}/function/lobby/leave.mcfunction`, content:
`# ═══ ${lName}から退出 ═══
tag @s remove lobby_player
scoreboard players set @s lobby_ready 0
tellraw @a[tag=lobby_player] [{"selector":"@s","color":"red"},{"text":" がロビーから退出","color":"gray"}]` });

    files.push({ path: `data/${ns}/function/lobby/toggle_ready.mcfunction`, content:
`# ═══ 準備完了/解除 ═══
execute if score @s lobby_ready matches 0 run scoreboard players set @s lobby_ready 1
execute if score @s lobby_ready matches 0 run tellraw @a[tag=lobby_player] [{"selector":"@s","color":"green"},{"text":" が準備完了！","color":"yellow"}]
execute if score @s lobby_ready matches 1 run scoreboard players set @s lobby_ready 0
execute if score @s lobby_ready matches 1 run tellraw @a[tag=lobby_player] [{"selector":"@s","color":"red"},{"text":" が準備解除","color":"gray"}]` });

    files.push({ path: `data/${ns}/function/lobby/countdown.mcfunction`, content:
`# ═══ カウントダウン ═══
scoreboard players add #lobby_tick lobby_cd 1
execute if score #lobby_tick lobby_cd matches 20.. run scoreboard players set #lobby_tick lobby_cd 0
execute if score #lobby_tick lobby_cd matches 0 run scoreboard players remove #lobby lobby_cd 1

# カウント表示
execute if score #lobby lobby_cd matches 10 run title @a[tag=lobby_player] title {"text":"10","bold":true,"color":"yellow"}
execute if score #lobby lobby_cd matches 5 run title @a[tag=lobby_player] title {"text":"5","bold":true,"color":"gold"}
execute if score #lobby lobby_cd matches 3 run title @a[tag=lobby_player] title {"text":"3","bold":true,"color":"red"}
execute if score #lobby lobby_cd matches 2 run title @a[tag=lobby_player] title {"text":"2","bold":true,"color":"red"}
execute if score #lobby lobby_cd matches 1 run title @a[tag=lobby_player] title {"text":"1","bold":true,"color":"dark_red"}

# 人数不足で中断
execute unless score #lobby lobby_count matches ${minP}.. run scoreboard players set #lobby lobby_state 0
execute unless score #lobby lobby_count matches ${minP}.. run scoreboard players set #lobby lobby_cd ${cd}
execute unless score #lobby lobby_count matches ${minP}.. run tellraw @a[tag=lobby_player] {"text":"人数不足でカウントダウン中断","color":"red"}

# ゲーム開始
execute if score #lobby lobby_cd matches 0 run function ${ns}:lobby/start_game` });

    files.push({ path: `data/${ns}/function/lobby/start_game.mcfunction`, content:
`# ═══ ゲーム開始！ ═══
scoreboard players set #lobby lobby_state 2
title @a[tag=lobby_player] title {"text":"ゲーム開始！","bold":true,"color":"green"}
playsound minecraft:ui.toast.challenge_complete master @a[tag=lobby_player]
tellraw @a[tag=lobby_player] {"text":"═══ ゲームがスタートしました！ ═══","color":"gold","bold":true}

# ここにゲーム開始のロジックを追加
# 例: function ${ns}:game/start` });

    files.push({ path: `data/${ns}/function/lobby/reset.mcfunction`, content:
`# ═══ ロビーリセット ═══
scoreboard players set #lobby lobby_state 0
scoreboard players set #lobby lobby_cd ${cd}
scoreboard players set @a lobby_ready 0
tag @a remove lobby_player
tellraw @a {"text":"ロビーがリセットされました","color":"gray"}` });
  }

  return files;
}

// ════════════════════════════════════════════════════════════
// SETUP WIZARD
// ════════════════════════════════════════════════════════════

function SetupWizard({ onComplete, onCancel, onImport }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    name: 'my-datapack',
    description: 'カスタムデータパック',
    targetVersion: '1.21.11',
    namespace: 'mypack',
    tickLoad: true,
    sampleRecipe: false,
    sampleAdvancement: false,
    sampleLootTable: false,
  });

  const nsValid = isValidNamespace(config.namespace);
  const nameValid = config.name.trim().length > 0;

  const steps = [
    { title: 'パック設定', desc: '基本情報を入力' },
    { title: '名前空間', desc: 'ユニークな識別子' },
    { title: 'テンプレート', desc: '初期ファイルを選択' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-lg mx-4 anim-scale overflow-hidden">
        {/* Progress */}
        <div className="flex border-b border-mc-border">
          {steps.map((s, i) => (
            <div key={i} className={`flex-1 px-4 py-3 text-center text-xs font-medium transition-colors ${
              i === step ? 'bg-mc-info text-white' : i < step ? 'bg-mc-success/20 text-mc-success' : 'text-mc-muted'
            }`}>
              <div className="text-[10px] opacity-60">STEP {i + 1}</div>
              {s.title}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4 anim-fade">
              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">パック名</label>
                <input
                  className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none transition-colors"
                  value={config.name}
                  onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                  placeholder="my-datapack"
                />
                {!nameValid && config.name !== '' && (
                  <p className="text-mc-accent text-xs mt-1">パック名を入力してください</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">説明文</label>
                <textarea
                  className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none transition-colors resize-none"
                  rows={2}
                  value={config.description}
                  onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
                  placeholder="データパックの説明"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">ターゲットバージョン</label>
                <select
                  className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none transition-colors"
                  value={config.targetVersion}
                  onChange={e => setConfig(c => ({ ...c, targetVersion: e.target.value }))}
                >
                  {VERSION_LIST.map(v => (
                    <option key={v} value={v}>{formatVersionLabel(v)}</option>
                  ))}
                </select>
              </div>
              {onImport && (
                <div className="pt-2 border-t border-mc-border/50">
                  <button
                    onClick={onImport}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-mc-muted hover:text-mc-info border border-dashed border-mc-border hover:border-mc-info rounded transition-colors"
                  >
                    <UploadCloud size={14} /> 既存のデータパックをインポート
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 anim-fade">
              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">名前空間</label>
                <input
                  className={`w-full bg-mc-dark border rounded px-3 py-2 text-sm focus:outline-none transition-colors ${
                    nsValid ? 'border-mc-border focus:border-mc-info' : 'border-mc-accent'
                  }`}
                  value={config.namespace}
                  onChange={e => setConfig(c => ({ ...c, namespace: e.target.value.toLowerCase() }))}
                  placeholder="mypack"
                />
                {!nsValid && (
                  <p className="text-mc-accent text-xs mt-1">小文字英数字、アンダースコア、ハイフンのみ使用可能</p>
                )}
              </div>
              <div className="bg-mc-dark/50 rounded p-3 text-xs text-mc-muted space-y-1">
                <p><span className="text-mc-text font-medium">使用可能:</span> a-z, 0-9, _, -</p>
                <p><span className="text-mc-text font-medium">例:</span> mypack, cool_items, rpg-skills</p>
                <p className="text-mc-warning">minecraft は上書き用の特別な名前空間です</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 anim-fade">
              <p className="text-xs text-mc-muted mb-2">初期構造に含めるテンプレートを選択してください</p>
              {[
                { key: 'tickLoad', label: 'tick / load 関数セットアップ', desc: '毎tick実行とロード時実行の基本関数' },
                { key: 'sampleRecipe', label: 'サンプルレシピ', desc: '固定レシピのサンプル' },
                { key: 'sampleAdvancement', label: 'サンプル進捗', desc: 'アイテム取得トリガーの進捗サンプル' },
                { key: 'sampleLootTable', label: 'サンプルルートテーブル', desc: 'ダイヤモンドドロップのサンプル' },
              ].map(opt => (
                <label key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                    config[opt.key] ? 'border-mc-info bg-mc-info/10' : 'border-mc-border bg-mc-dark/30 hover:border-mc-border/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={config[opt.key]}
                    onChange={e => setConfig(c => ({ ...c, [opt.key]: e.target.checked }))}
                    className="mt-0.5 accent-mc-info"
                  />
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-mc-muted">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center px-6 pb-6">
          <button
            onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
            className="px-4 py-2 text-sm text-mc-muted hover:text-mc-text transition-colors"
          >
            {step === 0 ? 'キャンセル' : '戻る'}
          </button>
          <button
            onClick={() => {
              if (step < 2) setStep(s => s + 1);
              else onComplete(config);
            }}
            disabled={(step === 0 && !nameValid) || (step === 1 && !nsValid)}
            className="px-6 py-2 text-sm font-medium rounded bg-mc-info hover:bg-mc-info/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {step < 2 ? (<>次へ <ArrowRight size={14} /></>) : (<>作成 <Wand2 size={14} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CONTEXT MENU
// ════════════════════════════════════════════════════════════

function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-mc-sidebar border border-mc-border rounded shadow-xl py-1 min-w-[180px] anim-scale"
      style={{ left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - 200) }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="border-t border-mc-border my-1" />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${
              item.danger ? 'text-mc-accent hover:bg-mc-accent/10' : 'text-mc-text hover:bg-mc-info/20'
            }`}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TEMPLATE SELECTOR MODAL
// ════════════════════════════════════════════════════════════

function TemplateSelector({ namespace, parentId, onSelect, onClose, targetVersion }) {
  const [selectedCat, setSelectedCat] = useState('function');
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [fileName, setFileName] = useState('');

  const filteredCategories = useMemo(() => {
    return TEMPLATE_CATEGORIES.filter(c => {
      if (!c.v || !targetVersion) return true;
      return versionAtLeast(targetVersion, c.v);
    });
  }, [targetVersion]);

  const cat = filteredCategories.find(c => c.key === selectedCat);
  const templates = cat ? cat.templates.map(k => ({ key: k, ...TEMPLATES[k] })) : [];

  useEffect(() => {
    if (templates.length > 0 && !selectedTpl) {
      setSelectedTpl(templates[0].key);
      const tpl = TEMPLATES[templates[0].key];
      setFileName(`example${tpl.ext}`);
    }
  }, [selectedCat]);

  const handleSelect = () => {
    if (!selectedTpl || !fileName) return;
    const tpl = TEMPLATES[selectedTpl];
    const content = tpl.content(fileName.replace(tpl.ext, ''), namespace, targetVersion);
    onSelect({
      category: tpl.category,
      fileName: fileName.endsWith(tpl.ext) ? fileName : fileName + tpl.ext,
      content,
      parentId,
    });
  };

  const fnameValid = fileName && isValidFileName(fileName.replace(/\.\w+$/, ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-2xl mx-4 anim-scale overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border">
          <h3 className="text-sm font-semibold">テンプレートからファイルを作成</h3>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text"><X size={16} /></button>
        </div>

        <div className="flex" style={{ height: '400px' }}>
          {/* Categories */}
          <div className="w-44 border-r border-mc-border overflow-y-auto p-2 space-y-0.5">
            {filteredCategories.map(c => {
              const Icon = c.icon;
              return (
                <button key={c.key}
                  onClick={() => { setSelectedCat(c.key); setSelectedTpl(null); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                    selectedCat === c.key ? 'bg-mc-info/30 text-white' : 'text-mc-muted hover:bg-mc-dark/50'
                  }`}
                >
                  <Icon size={14} /> {c.label}
                </button>
              );
            })}
          </div>

          {/* Templates */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {templates.map(tpl => (
                <button key={tpl.key}
                  onClick={() => {
                    setSelectedTpl(tpl.key);
                    setFileName(`example${tpl.ext}`);
                  }}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedTpl === tpl.key
                      ? 'border-mc-info bg-mc-info/10'
                      : 'border-mc-border/50 hover:border-mc-border bg-mc-dark/20'
                  }`}
                >
                  <div className="text-sm font-medium">{tpl.label}</div>
                  <div className="text-xs text-mc-muted mt-1 font-mono">{tpl.ext}</div>
                </button>
              ))}
            </div>

            {/* File name input */}
            <div className="p-3 border-t border-mc-border space-y-2">
              <div>
                <label className="block text-xs text-mc-muted mb-1">ファイル名</label>
                <input
                  className={`w-full bg-mc-dark border rounded px-3 py-1.5 text-sm font-mono focus:outline-none transition-colors ${
                    fnameValid ? 'border-mc-border focus:border-mc-info' : 'border-mc-accent'
                  }`}
                  value={fileName}
                  onChange={e => setFileName(e.target.value.toLowerCase())}
                  placeholder="example.json"
                />
              </div>
              <button
                onClick={handleSelect}
                disabled={!selectedTpl || !fnameValid}
                className="w-full py-2 text-sm font-medium rounded bg-mc-success/80 hover:bg-mc-success/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ファイルを作成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FILE TREE NODE
// ════════════════════════════════════════════════════════════

function FileTreeNode({ file, files, depth, selectedId, expanded, onSelect, onToggle, onContextMenu, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(file.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const isFolder = file.type === 'folder';
  const isExpanded = expanded.has(file.id);
  const isSelected = selectedId === file.id;
  const children = isFolder ? getChildren(files, file.id) : [];
  const IconComponent = getFileIcon(file.name, file.type);

  const startRename = useCallback(() => {
    setRenameName(file.name);
    setRenaming(true);
  }, [file.name]);

  useEffect(() => {
    if (file._startRename) {
      startRename();
      onRename(file.id, null, true);
    }
  }, [file._startRename]);

  const commitRename = () => {
    if (renameName.trim() && renameName !== file.name) {
      onRename(file.id, renameName.trim());
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center h-7 px-2 cursor-pointer select-none transition-colors group ${
          isSelected ? 'bg-mc-info/20 text-white' : 'hover:bg-mc-dark/40 text-mc-text'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => { if (isFolder) onToggle(file.id); onSelect(file.id); }}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file); }}
        onDoubleClick={() => { if (!isFolder) return; onToggle(file.id); }}
      >
        {isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center mr-1 text-mc-muted">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-4 h-4 mr-1" />
        )}

        {isFolder ? (
          isExpanded ? <FolderOpen size={14} className="text-yellow-400/80 mr-1.5 flex-shrink-0" /> : <Folder size={14} className="text-yellow-400/80 mr-1.5 flex-shrink-0" />
        ) : (
          IconComponent && <IconComponent size={14} className={`mr-1.5 flex-shrink-0 ${
            file.name.endsWith('.mcfunction') ? 'text-emerald-400/80' : 'text-sky-400/80'
          }`} />
        )}

        {renaming ? (
          <input
            ref={inputRef}
            className="bg-mc-dark border border-mc-info rounded px-1 py-0 text-xs font-mono flex-1 min-w-0 outline-none"
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs truncate font-mono">{file.name}</span>
        )}
      </div>

      {isFolder && isExpanded && children.map(child => (
        <FileTreeNode
          key={child.id}
          file={child}
          files={files}
          depth={depth + 1}
          selectedId={selectedId}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CODE EDITOR with syntax highlighting overlay
// ════════════════════════════════════════════════════════════

function CodeEditor({ file, onChange, targetVersion, guideMode = false, onToggleGuide }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumRef = useRef(null);

  // Autocomplete state
  const [acItems, setAcItems] = useState([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acPos, setAcPos] = useState({ top: 0, left: 0 });
  const acRafRef = useRef(null);
  const [cursorLineText, setCursorLineText] = useState('');

  const content = file?.content ?? '';
  const lines = content.split('\n');
  const lineCount = lines.length;

  const isJSON = file?.type === 'json' || file?.type === 'mcmeta';
  const isMcfunction = file?.type === 'mcfunction';

  // Reset autocomplete when file changes & cleanup RAF on unmount
  useEffect(() => {
    setAcItems([]);
    return () => { if (acRafRef.current) cancelAnimationFrame(acRafRef.current); };
  }, [file?.id]);

  const jsonError = useMemo(() => {
    if (!isJSON || !content.trim()) return null;
    const r = tryParseJSON(content);
    return r.valid ? null : r.error;
  }, [content, isJSON]);

  // mcfunction line validation
  const lineErrors = useMemo(() => {
    if (!isMcfunction || !content) return {};
    const errs = {};
    content.split('\n').forEach((line, i) => {
      const result = validateMcfunctionLine(line, i + 1, targetVersion);
      if (result) errs[i + 1] = result;
    });
    return errs;
  }, [content, isMcfunction, targetVersion]);

  const mcfErrorCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'error').length, [lineErrors]);
  const mcfWarnCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'warning').length, [lineErrors]);
  const mcfInfoCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'info').length, [lineErrors]);

  const highlighted = useMemo(() => {
    if (isJSON) return highlightJSON(content);
    if (isMcfunction) return highlightMcfunction(content);
    return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }, [content, isJSON, isMcfunction]);

  const handleScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    setAcItems(prev => prev.length > 0 ? [] : prev);
  };

  // Calculate cursor pixel position for autocomplete popup
  const getCursorPixelPos = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return { top: 0, left: 0 };
    const val = ta.value.substring(0, ta.selectionStart);
    const rowLines = val.split('\n');
    const row = rowLines.length - 1;
    const col = rowLines[rowLines.length - 1].length;
    const lineH = 20.8; // 13px font * 1.6 line-height
    const charW = 7.8;  // ~13px monospace char width
    return {
      top: (row + 1) * lineH - ta.scrollTop,
      left: Math.min(col * charW + 8 - ta.scrollLeft, ta.clientWidth - 200),
    };
  }, []);

  // Trigger autocomplete from current cursor position
  const triggerAutocomplete = useCallback(() => {
    if (!isMcfunction) { setAcItems([]); return; }
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineText = before.substring(lineStart);
    const col = pos - lineStart;
    const suggestions = getAutocompleteSuggestions(lineText, col, targetVersion);
    if (suggestions.length > 0) {
      setAcItems(suggestions.slice(0, 10));
      setAcIndex(0);
      setAcPos(getCursorPixelPos());
    } else {
      setAcItems([]);
    }
  }, [isMcfunction, getCursorPixelPos, targetVersion]);

  // Insert the selected autocomplete item then re-trigger for chained completion
  const insertCompletion = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = ta.value;
    const before = val.substring(0, pos);
    const match = before.match(/[\w@._:-]*$/);
    const wordStart = pos - (match ? match[0].length : 0);
    // Don't add trailing space for selector args (tag=, scores=, etc.) or inside brackets
    const inBracket = before.lastIndexOf('[') > before.lastIndexOf(']');
    const suffix = (text.endsWith('=') || inBracket) ? '' : ' ';
    const newVal = val.substring(0, wordStart) + text + suffix + val.substring(pos);
    onChange(newVal);
    const newPos = wordStart + text.length + suffix.length;
    setAcItems([]);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
      // Re-trigger autocomplete immediately after insertion for chained completion
      requestAnimationFrame(() => triggerAutocomplete());
    });
  }, [onChange, triggerAutocomplete]);

  const handleKeyDown = (e) => {
    // Autocomplete navigation
    if (acItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAcIndex(i => (i + 1) % acItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAcIndex(i => (i - 1 + acItems.length) % acItems.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (acItems[acIndex]) {
          e.preventDefault();
          insertCompletion(acItems[acIndex].l);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAcItems([]);
        return;
      }
    }

    // Tab indent (when no autocomplete)
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-mc-muted">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ファイルを選択してください</p>
          <p className="text-xs mt-1 opacity-60">左のツリーからファイルをクリック</p>
        </div>
      </div>
    );
  }

  if (file.type === 'folder') {
    const children = file._children || [];
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={20} className="text-yellow-400" />
          <h2 className="text-lg font-semibold">{file.name}</h2>
        </div>
        <p className="text-xs text-mc-muted mb-3">{children.length} 個のアイテム</p>
        <div className="space-y-1">
          {children.map(c => (
            <div key={c.id} className="flex items-center gap-2 text-sm text-mc-text/70 py-1">
              {c.type === 'folder' ? <Folder size={14} className="text-yellow-400/60" /> : <FileText size={14} className="text-sky-400/60" />}
              <span className="font-mono text-xs">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (file.type === 'nbt' || file.type === 'png') {
    return (
      <div className="flex-1 flex items-center justify-center text-mc-muted">
        <div className="text-center">
          <AlertTriangle size={32} className="mx-auto mb-2 text-mc-warning" />
          <p className="text-sm">このファイル形式はエディターで編集できません</p>
          <p className="text-xs mt-1">{file.type === 'nbt' ? 'NBTファイルはバイナリ形式です' : '画像ファイルです'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Editor header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-mc-dark/50 border-b border-mc-border text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-mc-text">{file.name}</span>
          <span className="text-mc-muted px-1.5 py-0.5 rounded bg-mc-dark text-[10px] uppercase">{file.type}</span>
        </div>
        {isJSON && (
          <div className={`flex items-center gap-1 ${jsonError ? 'text-mc-accent' : 'text-mc-success'}`}>
            {jsonError ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
            <span>{jsonError ? 'JSON構文エラー' : 'JSON OK'}</span>
          </div>
        )}
        {isMcfunction && (
          <div className="flex items-center gap-2">
            {mcfErrorCount > 0 && (
              <span className="flex items-center gap-1 text-mc-accent text-[10px]">
                <span>●</span> {mcfErrorCount}
              </span>
            )}
            {mcfWarnCount > 0 && (
              <span className="flex items-center gap-1 text-mc-warning text-[10px]">
                <span>▲</span> {mcfWarnCount}
              </span>
            )}
            {mcfInfoCount > 0 && (
              <span className="flex items-center gap-1 text-mc-info text-[10px]">
                <span>ℹ</span> {mcfInfoCount}
              </span>
            )}
            {mcfErrorCount === 0 && mcfWarnCount === 0 && mcfInfoCount === 0 && content.trim() && (
              <span className="flex items-center gap-1 text-mc-success">
                <CheckCircle size={12} /> OK
              </span>
            )}
          </div>
        )}
      </div>

      {/* Editor body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="bg-mc-darker/50 py-2 pr-2 pl-3 text-right select-none overflow-hidden border-r border-mc-border/50 flex-shrink-0"
          style={{ width: `${Math.max(3, String(lineCount).length) * 10 + 24}px` }}
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const err = lineErrors[i + 1];
            const errColor = err ? (err.type === 'error' ? 'text-mc-accent' : err.type === 'warning' ? 'text-mc-warning' : 'text-mc-info') : 'text-mc-muted/40';
            const errIcon = err ? (err.type === 'error' ? '●' : err.type === 'warning' ? '▲' : 'ℹ') : (i + 1);
            return (
              <div key={i} className={`line-num ${errColor}`} title={err ? err.msg : undefined}>
                {errIcon}
              </div>
            );
          })}
        </div>

        {/* Code area with overlay */}
        <div className="relative flex-1 min-w-0">
          <pre
            ref={preRef}
            className="absolute inset-0 overflow-auto py-2 px-3 editor-area whitespace-pre pointer-events-none"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
          />
          <textarea
            ref={textareaRef}
            className={`absolute inset-0 bg-transparent text-transparent caret-gray-300 py-2 px-3 editor-area whitespace-pre resize-none outline-none w-full h-full overflow-auto ${
              jsonError ? 'ring-1 ring-mc-accent/50' : ''
            }`}
            value={content}
            onChange={e => { onChange(e.target.value); if (acRafRef.current) cancelAnimationFrame(acRafRef.current); acRafRef.current = requestAnimationFrame(triggerAutocomplete); }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onClick={() => { setAcItems([]); const ta=textareaRef.current; if(ta){const pos=ta.selectionStart;const ls=ta.value.split('\n');let c=0;for(const l of ls){if(c+l.length>=pos){setCursorLineText(l);break;}c+=l.length+1;}} }}
            onSelect={() => { const ta=textareaRef.current; if(ta&&isMcfunction){const pos=ta.selectionStart;const ls=ta.value.split('\n');let c=0;for(const l of ls){if(c+l.length>=pos){setCursorLineText(l);break;}c+=l.length+1;}} }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* Autocomplete popup */}
          {acItems.length > 0 && (
            <div
              className="absolute z-50 bg-mc-panel border border-mc-border rounded shadow-xl max-h-52 overflow-y-auto anim-scale"
              style={{ top: acPos.top, left: Math.max(0, acPos.left) }}
            >
              {acItems.map((item, i) => (
                <div
                  key={item.l}
                  className={`px-3 py-1.5 text-xs cursor-pointer flex items-center gap-3 min-w-[200px] ${
                    i === acIndex ? 'bg-mc-info/30 text-white' : 'text-mc-text hover:bg-mc-dark'
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); insertCompletion(item.l); }}
                >
                  <span className={`font-mono font-medium ${item._nbt ? 'text-orange-400' : 'text-sky-300'}`}>{item.l}</span>
                  {item.v && <span className="text-[9px] px-1 py-0.5 rounded bg-mc-info/20 text-mc-info flex-shrink-0">{item.v}+</span>}
                  <span className="text-mc-muted text-[10px] truncate">{item.d}</span>
                </div>
              ))}
              <div className="px-3 py-1 text-[9px] text-mc-muted/50 border-t border-mc-border/30">
                ↑↓選択 Tab/Enter確定 Esc閉じる
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {jsonError && (
        <div className="px-3 py-1.5 bg-mc-accent/10 border-t border-mc-accent/30 text-xs text-mc-accent flex items-center gap-2">
          <AlertTriangle size={12} />
          <span className="truncate">{jsonError}</span>
        </div>
      )}
      {isMcfunction && (mcfErrorCount > 0 || mcfWarnCount > 0 || mcfInfoCount > 0) && (
        <div className="bg-mc-dark/80 border-t border-mc-border/30 text-[10px] max-h-36 overflow-y-auto">
          <div className="flex items-center gap-3 px-3 py-1 border-b border-mc-border/20 sticky top-0 bg-mc-dark/95 z-10">
            <span className="font-semibold text-mc-text text-[11px]">Problems</span>
            {mcfErrorCount > 0 && <span className="flex items-center gap-1 text-mc-accent"><span>●</span>{mcfErrorCount}</span>}
            {mcfWarnCount > 0 && <span className="flex items-center gap-1 text-mc-warning"><span>▲</span>{mcfWarnCount}</span>}
            {mcfInfoCount > 0 && <span className="flex items-center gap-1 text-mc-info"><span>ℹ</span>{mcfInfoCount}</span>}
          </div>
          {Object.entries(lineErrors).slice(0, 16).map(([ln, e]) => {
            const color = e.type === 'error' ? 'text-mc-accent' : e.type === 'warning' ? 'text-mc-warning' : 'text-mc-info';
            const icon = e.type === 'error' ? '●' : e.type === 'warning' ? '▲' : 'ℹ';
            return (
              <div key={ln} className={`flex items-center gap-2 py-0.5 px-3 cursor-pointer hover:bg-mc-hover/30 ${color}`}
                onClick={() => {
                  const ta = textareaRef.current;
                  if (ta) {
                    const lines = ta.value.split('\n');
                    let pos = 0;
                    for (let i = 0; i < parseInt(ln) - 1 && i < lines.length; i++) pos += lines[i].length + 1;
                    ta.selectionStart = ta.selectionEnd = pos;
                    ta.focus();
                    ta.scrollTop = Math.max(0, (parseInt(ln) - 3) * 20.8);
                  }
                }}>
                <span className="flex-shrink-0 w-3 text-center">{icon}</span>
                <span className="font-mono w-8 text-right flex-shrink-0 text-mc-muted">{ln}行</span>
                <span className="truncate flex-1">{e.msg}</span>
                {e.fix && (
                  <button className="flex-shrink-0 px-1.5 py-0 rounded bg-mc-info/20 text-mc-info hover:bg-mc-info/40 text-[9px] font-medium"
                    title={`Quick Fix: ${e.fix.label}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      const ta = textareaRef.current;
                      if (!ta) return;
                      const lines = ta.value.split('\n');
                      const lineIdx = parseInt(ln) - 1;
                      if (lineIdx < lines.length) {
                        lines[lineIdx] = e.fix.apply(lines[lineIdx]);
                        const newContent = lines.join('\n');
                        onChange(newContent);
                      }
                    }}>
                    {e.fix.label}
                  </button>
                )}
              </div>
            );
          })}
          {Object.keys(lineErrors).length > 16 && (
            <div className="text-mc-muted/50 py-0.5 px-3">...他 {Object.keys(lineErrors).length - 16}件</div>
          )}
        </div>
      )}
      {/* Command Guide Panel */}
      {guideMode && isMcfunction && (() => {
        const trimLine = cursorLineText.trim();
        const cmd = trimLine.split(/\s+/)[0]?.replace(/^\//,'');
        const guide = cmd && COMMAND_GUIDE[cmd];
        if (!guide && !trimLine) return (
          <div className="bg-mc-dark/90 border-t border-mc-border/30 text-[10px] px-3 py-1.5 anim-fade flex items-center justify-between">
            <div><span className="text-mc-info">📖 ガイド:</span> <span className="text-mc-muted">コマンドを入力すると引数のヒントが表示されます。Tab で補完、Ctrl+K でパレット</span></div>
            {onToggleGuide && <button onClick={onToggleGuide} className="text-mc-muted/50 hover:text-mc-info text-[9px] px-1">ガイドOFF</button>}
          </div>
        );
        if (!guide) return null;
        const tokens = trimLine.split(/\s+/);
        const curArgIdx = Math.max(0, tokens.length - 2);
        const curArg = guide.a[curArgIdx];
        const typeHints = { selector:'@a=全員 @s=自分 @p=最寄り @e=全体 @r=ランダム', item:'アイテムID (例: diamond)', entity:'エンティティID (例: zombie)', effect:'エフェクトID (例: speed)', pos:'座標: 絶対=数値 / 相対=~ / ローカル=^', int:'整数', float:'数値(小数OK)', json:'JSON', nbt:'NBTデータ', enum:'選択肢' };
        return (
          <div className="bg-mc-dark/90 border-t border-mc-border/30 text-[10px] max-h-36 overflow-y-auto px-3 py-1.5 anim-fade">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-mc-info font-semibold text-[11px]">📖 {cmd}</span>
              <span className="text-mc-muted">{guide.d}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {guide.a.map((arg, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded border text-[9px] ${i === curArgIdx ? 'border-mc-info bg-mc-info/15 text-mc-info' : 'border-mc-border/30 text-mc-muted'}`}>
                  <span className="opacity-60">{arg.t} </span>{arg.n}{arg.o ? ` (${arg.o.slice(0,3).join('/')})` : ''}{i === curArgIdx && <span className="text-mc-info ml-1">← 入力中</span>}
                </span>
              ))}
            </div>
            {curArg && (
              <div className="flex items-center gap-1 mb-0.5 pl-2">
                <span className="text-mc-info text-[9px] font-semibold">→ {curArg.n}:</span>
                <span className="text-mc-muted text-[9px]">{curArg.d}</span>
                {curArg.o && <span className="text-mc-muted/50 text-[8px] font-mono">[{curArg.o.join(' | ')}]</span>}
                {!curArg.o && typeHints[curArg.t] && <span className="text-mc-muted/50 text-[8px]">{typeHints[curArg.t]}</span>}
              </div>
            )}
            <div className="text-mc-success/80 font-mono text-[9px]">▶ {guide.p.replace(/\{(\w+)\}/g, (_, k) => {
              const idx = guide.a.findIndex(a => a.n === k);
              return idx >= 0 && tokens[idx + 1] ? tokens[idx + 1] : `[${k}]`;
            })}</div>
            {tokens.length <= 2 && guide.ex.length > 0 && <div className="text-mc-muted/60 mt-0.5 text-[9px]">例: {guide.ex[0]}</div>}
          </div>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MC RICH TEXT EDITOR (JSON Text Component WYSIWYG)
// ════════════════════════════════════════════════════════════

const EMPTY_SEGMENT = { text: '', color: 'white', bold: false, italic: false, underlined: false, strikethrough: false, obfuscated: false };

function segmentsToJson(segments) {
  if (!segments || segments.length === 0) return '{"text":""}';
  const clean = segments.map(s => {
    const obj = { text: s.text };
    if (s.color && s.color !== 'white') obj.color = s.color;
    if (s.bold) obj.bold = true;
    if (s.italic) obj.italic = true;
    if (s.underlined) obj.underlined = true;
    if (s.strikethrough) obj.strikethrough = true;
    if (s.obfuscated) obj.obfuscated = true;
    if (s.clickAction && s.clickValue) obj.clickEvent = { action: s.clickAction, value: s.clickValue };
    if (s.hoverText) obj.hoverEvent = { action: 'show_text', contents: s.hoverText };
    return obj;
  });
  return clean.length === 1 ? JSON.stringify(clean[0]) : JSON.stringify(clean);
}

function parseSegmentsFromJson(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    const toSeg = (obj) => ({
      text: obj.text || '', color: obj.color || 'white', bold: !!obj.bold, italic: !!obj.italic,
      underlined: !!obj.underlined, strikethrough: !!obj.strikethrough, obfuscated: !!obj.obfuscated,
      clickAction: obj.clickEvent?.action || '', clickValue: obj.clickEvent?.value || '',
      hoverText: typeof obj.hoverEvent?.contents === 'string' ? obj.hoverEvent.contents : '',
    });
    if (Array.isArray(parsed)) return parsed.filter(p => typeof p === 'object').map(toSeg);
    if (typeof parsed === 'object') return [toSeg(parsed)];
  } catch {}
  return [{ ...EMPTY_SEGMENT, text: jsonStr || '' }];
}

function McRichTextEditor({ value, onChange, compact }) {
  const [segments, setSegments] = useState(() => parseSegmentsFromJson(value || ''));
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const active = segments[activeIdx] || { ...EMPTY_SEGMENT };

  const updateSegments = (newSegs) => {
    setSegments(newSegs);
    onChange(segmentsToJson(newSegs));
  };

  const updateActive = (key, val) => {
    const newSegs = [...segments];
    newSegs[activeIdx] = { ...active, [key]: val };
    updateSegments(newSegs);
  };

  const addSegment = () => {
    const newSegs = [...segments, { ...EMPTY_SEGMENT }];
    updateSegments(newSegs);
    setActiveIdx(newSegs.length - 1);
  };

  const removeSegment = (idx) => {
    if (segments.length <= 1) return;
    const newSegs = segments.filter((_, i) => i !== idx);
    updateSegments(newSegs);
    setActiveIdx(Math.min(activeIdx, newSegs.length - 1));
  };

  const FmtBtn = ({ prop, label, title, style: btnStyle }) => (
    <button onClick={() => updateActive(prop, !active[prop])} title={title}
      style={{padding: compact ? '2px 5px' : '3px 8px', fontSize: compact ? 10 : 11, borderRadius:3, border:'1px solid', cursor:'pointer',
        borderColor: active[prop] ? '#4fc3f7' : '#333', background: active[prop] ? '#4fc3f720' : '#1a1a2e', color: active[prop] ? '#4fc3f7' : '#888', fontWeight: active[prop] ? 700 : 400, ...btnStyle}}>
      {label}
    </button>
  );

  return (
    <div style={{border:'1px solid #2a2a4a',borderRadius:6,background:'#0d0d1a',overflow:'hidden'}}>
      {/* Segment tabs */}
      <div style={{display:'flex',alignItems:'center',gap:2,padding:'4px 6px',background:'#111122',borderBottom:'1px solid #2a2a4a',flexWrap:'wrap'}}>
        {segments.map((seg, i) => (
          <div key={i} onClick={() => setActiveIdx(i)}
            style={{display:'flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:4,cursor:'pointer',fontSize:10,
              background: i === activeIdx ? '#2a2a4a' : 'transparent',border: i === activeIdx ? '1px solid #4fc3f7' : '1px solid transparent',
              color: MC_COLOR_HEX[seg.color] || '#fff', fontWeight: seg.bold ? 700 : 400, fontStyle: seg.italic ? 'italic' : 'normal',
              textDecoration: `${seg.underlined ? 'underline' : ''} ${seg.strikethrough ? 'line-through' : ''}`.trim() || 'none'}}>
            <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{seg.text || '(空)'}</span>
            {segments.length > 1 && (
              <button onClick={e => { e.stopPropagation(); removeSegment(i); }} style={{background:'none',border:'none',color:'#666',cursor:'pointer',fontSize:10,padding:0,lineHeight:1}}>x</button>
            )}
          </div>
        ))}
        <button onClick={addSegment} title="テキスト部品を追加"
          style={{padding:'2px 6px',fontSize:10,borderRadius:3,border:'1px dashed #4fc3f7',background:'transparent',color:'#4fc3f7',cursor:'pointer'}}>
          + 追加
        </button>
      </div>

      {/* Text input */}
      <div style={{padding:'6px 8px'}}>
        <input type="text" value={active.text} onChange={e => updateActive('text', e.target.value)} placeholder="テキストを入力..."
          style={{width:'100%',padding:'5px 8px',fontSize:12,borderRadius:4,border:'1px solid #333',background:'#1a1a2e',
            color: MC_COLOR_HEX[active.color] || '#fff', fontWeight: active.bold ? 700 : 400, fontStyle: active.italic ? 'italic' : 'normal',
            textDecoration: `${active.underlined ? 'underline' : ''} ${active.strikethrough ? 'line-through' : ''}`.trim() || 'none', outline:'none'}} />
      </div>

      {/* Formatting toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:3,padding:'4px 8px',flexWrap:'wrap'}}>
        <FmtBtn prop="bold" label="B" title="太字" style={{fontWeight:800}} />
        <FmtBtn prop="italic" label="I" title="斜体" style={{fontStyle:'italic'}} />
        <FmtBtn prop="underlined" label="U" title="下線" style={{textDecoration:'underline'}} />
        <FmtBtn prop="strikethrough" label="S" title="打消線" style={{textDecoration:'line-through'}} />
        <FmtBtn prop="obfuscated" label="?" title="難読化 (文字化け)" />
        <div style={{width:1,height:16,background:'#333',margin:'0 2px'}} />
        <span style={{fontSize:9,color:'#666'}}>色:</span>
      </div>

      {/* Color picker */}
      <div style={{display:'flex',flexWrap:'wrap',gap:2,padding:'2px 8px 6px'}}>
        {MC_COLORS.map(c => (
          <button key={c} onClick={() => updateActive('color', c)} title={c}
            style={{width: compact ? 16 : 20, height: compact ? 16 : 20, borderRadius:3,cursor:'pointer',
              border: active.color === c ? '2px solid #fff' : '1px solid #444', background: MC_COLOR_HEX[c] || '#888'}} />
        ))}
      </div>

      {/* Advanced options toggle */}
      <div style={{borderTop:'1px solid #1a1a2e'}}>
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          style={{width:'100%',padding:'3px 8px',fontSize:9,background:'transparent',border:'none',color:'#555',cursor:'pointer',textAlign:'left'}}>
          {showAdvanced ? '▼' : '▶'} クリックイベント / ホバー (上級者向け)
        </button>
        {showAdvanced && (
          <div style={{padding:'4px 8px 8px',display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <label style={{fontSize:9,color:'#888',width:60,flexShrink:0}}>クリック:</label>
              <select value={active.clickAction || ''} onChange={e => updateActive('clickAction', e.target.value)}
                style={{flex:'0 0 auto',padding:'2px 4px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                <option value="">なし</option>
                <option value="run_command">コマンド実行</option>
                <option value="suggest_command">コマンド候補</option>
                <option value="open_url">URLを開く</option>
                <option value="copy_to_clipboard">クリップボード</option>
              </select>
              {active.clickAction && (
                <input type="text" value={active.clickValue || ''} onChange={e => updateActive('clickValue', e.target.value)}
                  placeholder={active.clickAction === 'open_url' ? 'https://...' : '/command...'} style={{flex:1,padding:'2px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}} />
              )}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <label style={{fontSize:9,color:'#888',width:60,flexShrink:0}}>ホバー:</label>
              <input type="text" value={active.hoverText || ''} onChange={e => updateActive('hoverText', e.target.value)}
                placeholder="マウスを乗せた時のテキスト" style={{flex:1,padding:'2px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}} />
            </div>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div style={{borderTop:'1px solid #2a2a4a',padding:'6px 8px',background:'#0a0a14'}}>
        <div style={{fontSize:9,color:'#555',marginBottom:3}}>プレビュー (ゲーム内表示イメージ):</div>
        <div style={{padding:'6px 10px',background:'#000',borderRadius:4,fontFamily:'"Minecraft","Courier New",monospace',fontSize: compact ? 12 : 14,lineHeight:1.4,minHeight:24}}>
          {segments.map((seg, i) => (
            <span key={i} style={{
              color: MC_COLOR_HEX[seg.color] || '#fff', fontWeight: seg.bold ? 700 : 400, fontStyle: seg.italic ? 'italic' : 'normal',
              textDecoration: `${seg.underlined ? 'underline' : ''} ${seg.strikethrough ? 'line-through' : ''}`.trim() || 'none',
              ...(seg.obfuscated ? {background:'#666',color:'transparent',borderRadius:2} : {}),
            }}>{seg.text || (segments.length === 1 ? 'テキストを入力...' : '')}</span>
          ))}
        </div>
        <div style={{fontSize:8,color:'#444',marginTop:3,fontFamily:'monospace',wordBreak:'break-all',maxHeight:40,overflow:'hidden'}}>
          {segmentsToJson(segments)}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MCFUNCTION VISUAL EDITOR
// ════════════════════════════════════════════════════════════

const QUICK_COMMANDS = [
  { label: 'say', icon: '💬', tpl: 'say メッセージ', desc: 'チャットメッセージ' },
  { label: 'give', icon: '🎒', tpl: 'give @a minecraft:diamond 1', desc: 'アイテム付与' },
  { label: 'tp', icon: '🌀', tpl: 'tp @a ~ ~ ~', desc: 'テレポート' },
  { label: 'effect', icon: '✨', tpl: 'effect give @a speed 10 0', desc: 'エフェクト' },
  { label: 'title', icon: '📺', tpl: 'title @a title {"text":"タイトル","color":"gold","bold":true}', desc: 'タイトル表示' },
  { label: 'playsound', icon: '🔊', tpl: 'playsound minecraft:entity.experience_orb.pickup master @a', desc: 'サウンド' },
  { label: 'scoreboard', icon: '📊', tpl: 'scoreboard players add @s score 1', desc: 'スコア操作' },
  { label: 'summon', icon: '👾', tpl: 'summon minecraft:zombie ~ ~ ~', desc: 'エンティティ召喚' },
  { label: 'kill', icon: '💀', tpl: 'kill @e[type=!player,distance=..30]', desc: 'エンティティ削除' },
  { label: 'tag', icon: '🏷️', tpl: 'tag @s add mytag', desc: 'タグ操作' },
  { label: 'execute', icon: '⚡', tpl: 'execute as @a at @s run ', desc: '条件実行' },
  { label: 'function', icon: '📂', tpl: 'function namespace:path/name', desc: '関数呼出し' },
  { label: '#コメント', icon: '📝', tpl: '# ===== コメント =====', desc: 'コメント行' },
  { label: 'gamemode', icon: '🎮', tpl: 'gamemode adventure @a', desc: 'ゲームモード' },
  { label: 'setblock', icon: '🧱', tpl: 'setblock ~ ~ ~ minecraft:stone', desc: 'ブロック配置' },
  { label: 'fill', icon: '📐', tpl: 'fill ~-5 ~ ~-5 ~5 ~3 ~5 minecraft:air', desc: 'ブロック充填' },
];

function parseMcfLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'empty', raw: line };
  if (trimmed.startsWith('#')) return { type: 'comment', raw: line, text: trimmed.slice(1).trim() };
  const cmd = trimmed.split(/\s+/)[0].replace(/^\//, '');
  return { type: 'command', raw: line, cmd, args: trimmed.slice(cmd.length + (trimmed.startsWith('/') ? 1 : 0)).trim() };
}

const MCF_CMD_ICONS = {
  say:'💬', tell:'💬', tellraw:'💬', msg:'💬',
  give:'🎒', clear:'🗑️',
  tp:'🌀', teleport:'🌀', spreadplayers:'🌀',
  effect:'✨',
  title:'📺',
  playsound:'🔊', stopsound:'🔇',
  scoreboard:'📊',
  summon:'👾', kill:'💀',
  tag:'🏷️',
  execute:'⚡',
  function:'📂',
  gamemode:'🎮',
  setblock:'🧱', fill:'📐',
  particle:'🎆',
  team:'👥',
  bossbar:'🟩',
  schedule:'⏱️',
  forceload:'📍',
  data:'💾', attribute:'📈',
  advancement:'🏆', recipe:'📖',
  enchant:'🔮', xp:'⭐', experience:'⭐',
  weather:'🌤️', time:'🕐', difficulty:'⚙️',
  spawnpoint:'🏠', setworldspawn:'🌍',
  replaceitem:'🔄', item:'🔄', loot:'🎲',
  default:'▶️',
};

const MCF_CMD_ITEMS = {
  give:'minecraft:chest', clear:'minecraft:barrier', tp:'minecraft:ender_pearl',
  effect:'minecraft:potion', summon:'minecraft:spawner', kill:'minecraft:diamond_sword',
  title:'minecraft:name_tag', playsound:'minecraft:note_block', scoreboard:'minecraft:book',
  tag:'minecraft:name_tag', execute:'minecraft:command_block', function:'minecraft:writable_book',
  gamemode:'minecraft:grass_block', setblock:'minecraft:stone', fill:'minecraft:stone',
  particle:'minecraft:firework_rocket', team:'minecraft:shield', bossbar:'minecraft:end_crystal',
  enchant:'minecraft:enchanted_book', xp:'minecraft:experience_bottle',
};

function McfunctionVisualEditor({ file, onChange }) {
  const content = file?.content ?? '';
  const lines = content.split('\n');
  const parsed = lines.map(parseMcfLine);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const updateLine = (idx, newText) => {
    const newLines = [...lines];
    newLines[idx] = newText;
    onChange(newLines.join('\n'));
  };

  const deleteLine = (idx) => {
    const newLines = lines.filter((_, i) => i !== idx);
    onChange(newLines.join('\n'));
  };

  const insertLineAt = (idx, text) => {
    const newLines = [...lines];
    newLines.splice(idx + 1, 0, text);
    onChange(newLines.join('\n'));
    setShowQuickAdd(false);
  };

  const appendLine = (text) => {
    const newContent = content + (content && !content.endsWith('\n') ? '\n' : '') + text;
    onChange(newContent);
    setShowQuickAdd(false);
  };

  const moveLine = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= lines.length) return;
    const newLines = [...lines];
    [newLines[idx], newLines[newIdx]] = [newLines[newIdx], newLines[idx]];
    onChange(newLines.join('\n'));
  };

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditText(lines[idx]);
  };

  const confirmEdit = () => {
    if (editingIdx !== null) {
      updateLine(editingIdx, editText);
      setEditingIdx(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-mc-dark/50 border-b border-mc-border overflow-x-auto flex-shrink-0">
        <span className="text-[10px] text-mc-muted mr-1 flex-shrink-0">挿入:</span>
        {QUICK_COMMANDS.slice(0, 10).map(qc => (
          <button key={qc.label} onClick={() => appendLine(qc.tpl)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-mc-dark border border-mc-border/50 hover:border-mc-info hover:bg-mc-info/10 transition-colors flex-shrink-0"
            title={qc.desc}>
            <span className="text-xs">{qc.icon}</span> {qc.label}
          </button>
        ))}
        <button onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-mc-info/20 text-mc-info border border-mc-info/30 hover:bg-mc-info/30 transition-colors flex-shrink-0">
          <Plus size={10} /> 他
        </button>
      </div>

      {/* Quick add expanded */}
      {showQuickAdd && (
        <div className="px-2 py-2 bg-mc-dark/80 border-b border-mc-border grid grid-cols-4 gap-1">
          {QUICK_COMMANDS.map(qc => (
            <button key={qc.label} onClick={() => appendLine(qc.tpl)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] bg-mc-sidebar border border-mc-border/50 hover:border-mc-info hover:bg-mc-info/10 transition-colors text-left">
              <span>{qc.icon}</span>
              <div>
                <div className="font-medium text-mc-text">{qc.label}</div>
                <div className="text-[9px] text-mc-muted">{qc.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Visual command list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {parsed.map((p, idx) => {
          if (editingIdx === idx) {
            return (
              <div key={idx} className="flex gap-1 items-start">
                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                  className="flex-1 bg-mc-dark border border-mc-info rounded px-2 py-1.5 text-xs font-mono focus:outline-none resize-none"
                  rows={1} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(); } if (e.key === 'Escape') setEditingIdx(null); }} />
                <button onClick={confirmEdit} className="p-1 text-mc-success hover:bg-mc-dark rounded"><Check size={14} /></button>
                <button onClick={() => setEditingIdx(null)} className="p-1 text-mc-muted hover:bg-mc-dark rounded"><X size={14} /></button>
              </div>
            );
          }

          if (p.type === 'empty') {
            return (
              <div key={idx} className="h-3 group relative flex items-center">
                <div className="flex-1 border-t border-mc-border/20" />
                <div className="absolute right-0 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                  <button onClick={() => deleteLine(idx)} className="p-0.5 text-mc-muted hover:text-mc-accent"><Trash2 size={10} /></button>
                </div>
              </div>
            );
          }

          if (p.type === 'comment') {
            const isSectionHeader = p.text.includes('===') || p.text.includes('---') || p.text.includes('***');
            return (
              <div key={idx} className={`group flex items-center gap-2 px-2 py-1 rounded ${isSectionHeader ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-mc-dark/30'}`}>
                <span className="text-[10px] text-mc-muted/40 w-5 text-right flex-shrink-0">{idx + 1}</span>
                <span className="text-xs">📝</span>
                <span className={`flex-1 text-xs ${isSectionHeader ? 'font-semibold text-emerald-400' : 'text-mc-muted italic'}`}>
                  {p.text || '(空コメント)'}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                  <button onClick={() => startEdit(idx)} className="p-0.5 text-mc-muted hover:text-mc-info"><Edit3 size={10} /></button>
                  <button onClick={() => moveLine(idx, -1)} className="p-0.5 text-mc-muted hover:text-mc-info">↑</button>
                  <button onClick={() => moveLine(idx, 1)} className="p-0.5 text-mc-muted hover:text-mc-info">↓</button>
                  <button onClick={() => deleteLine(idx)} className="p-0.5 text-mc-muted hover:text-mc-accent"><Trash2 size={10} /></button>
                </div>
              </div>
            );
          }

          // Command card
          const cmdIcon = MCF_CMD_ICONS[p.cmd] || MCF_CMD_ICONS.default;
          const cmdItem = MCF_CMD_ITEMS[p.cmd];
          return (
            <div key={idx} className="group flex items-center gap-1.5 px-2 py-1.5 rounded border border-mc-border/30 bg-mc-dark/20 hover:bg-mc-dark/40 hover:border-mc-border/60 transition-colors">
              <span className="text-[10px] text-mc-muted/40 w-5 text-right flex-shrink-0">{idx + 1}</span>
              {cmdItem ? <McIcon id={cmdItem} size={20} /> : <span className="text-sm w-5 text-center">{cmdIcon}</span>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-sky-400 font-mono">{p.cmd}</span>
                  <span className="text-[10px] text-mc-text font-mono truncate">{p.args}</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity flex-shrink-0">
                <button onClick={() => startEdit(idx)} className="p-0.5 text-mc-muted hover:text-mc-info" title="編集"><Edit3 size={10} /></button>
                <button onClick={() => insertLineAt(idx, '')} className="p-0.5 text-mc-muted hover:text-mc-info" title="下に行追加"><Plus size={10} /></button>
                <button onClick={() => moveLine(idx, -1)} className="p-0.5 text-mc-muted hover:text-mc-info" title="上に移動">↑</button>
                <button onClick={() => moveLine(idx, 1)} className="p-0.5 text-mc-muted hover:text-mc-info" title="下に移動">↓</button>
                <button onClick={() => deleteLine(idx)} className="p-0.5 text-mc-muted hover:text-mc-accent" title="削除"><Trash2 size={10} /></button>
              </div>
            </div>
          );
        })}

        {/* Add command area */}
        <div className="mt-2 pt-2 border-t border-mc-border/30">
          <div className="flex flex-wrap gap-1">
            {QUICK_COMMANDS.slice(0, 8).map(qc => (
              <button key={qc.label} onClick={() => appendLine(qc.tpl)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-mc-border/40 text-[10px] text-mc-muted hover:border-mc-info hover:text-mc-info transition-colors">
                <span>{qc.icon}</span> {qc.desc}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// INTEGRATED MCFUNCTION EDITOR (VS Code + Command Builder Hybrid)
// ════════════════════════════════════════════════════════════

const SNIPPET_TEMPLATES = [
  { id:'timer', name:'タイマーシステム', icon:'⏱️', desc:'ボスバーでカウントダウン', lines:[
    '# ===== タイマーシステム =====','bossbar add namespace:timer "残り時間"','bossbar set namespace:timer max 300','bossbar set namespace:timer color yellow','bossbar set namespace:timer style notched_10','bossbar set namespace:timer players @a','bossbar set namespace:timer visible true','','# タイマー減算 (毎tick呼び出し)','scoreboard players remove #timer timer 1','execute store result bossbar namespace:timer value run scoreboard players get #timer timer','','# 時間切れチェック','execute if score #timer timer matches ..0 run function namespace:time_up',
  ]},
  { id:'pvp_setup', name:'PVP初期化', icon:'⚔️', desc:'チーム分け＋装備配布', lines:[
    '# ===== PVP初期化 =====','team add red "赤チーム"','team modify red color red','team modify red friendlyFire false','team add blue "青チーム"','team modify blue color blue','team modify blue friendlyFire false','','# 装備配布','clear @a','gamemode adventure @a','give @a minecraft:iron_sword 1','give @a minecraft:bow 1','give @a minecraft:arrow 32','give @a minecraft:iron_chestplate 1','','# エフェクト','effect give @a saturation 999999 0 true',
  ]},
  { id:'lobby', name:'ロビー帰還', icon:'🏠', desc:'ゲーム終了→ロビー', lines:[
    '# ===== ロビー帰還 =====','title @a title {"text":"ゲーム終了！","color":"gold","bold":true}','title @a subtitle {"text":"ロビーに戻ります...","color":"yellow"}','playsound minecraft:ui.toast.challenge_complete master @a','','# 3秒後にテレポート','schedule function namespace:lobby_tp 60t','','# ステート変更','scoreboard players set #game state 0',
  ]},
  { id:'kill_reward', name:'キル報酬', icon:'💀', desc:'敵撃破時の報酬', lines:[
    '# ===== キル報酬 (advancement rewardで呼出) =====','# キルしたプレイヤーのスコア加算','scoreboard players add @s kills 1','','# 報酬付与','give @s minecraft:golden_apple 1','playsound minecraft:entity.experience_orb.pickup master @s','title @s actionbar {"text":"+1 キル！","color":"green","bold":true}','','# エフェクト','effect give @s speed 3 0 true','effect give @s regeneration 3 0 true',
  ]},
  { id:'countdown', name:'カウントダウン', icon:'🔢', desc:'3,2,1,Go!演出', lines:[
    '# ===== カウントダウン開始 =====','scoreboard players set #countdown timer 4','schedule function namespace:countdown_tick 20t',
    '','# --- countdown_tick.mcfunction ---','# scoreboard players remove #countdown timer 1','# execute if score #countdown timer matches 3 run title @a title {"text":"3","color":"red","bold":true}','# execute if score #countdown timer matches 2 run title @a title {"text":"2","color":"yellow","bold":true}','# execute if score #countdown timer matches 1 run title @a title {"text":"1","color":"green","bold":true}','# execute if score #countdown timer matches 0 run title @a title {"text":"GO!","color":"gold","bold":true}','# execute if score #countdown timer matches 0 run function namespace:game_start','# execute if score #countdown timer matches 1.. run schedule function namespace:countdown_tick 20t',
  ]},
];

function IntegratedMcfEditor({ file, onChange, targetVersion, namespace, guideMode = false, onToggleGuide }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumRef = useRef(null);

  const [cmdSidebarOpen, setCmdSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('quick'); // 'quick' | 'builder' | 'snippets'
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  // Builder state
  const [builderCmd, setBuilderCmd] = useState(null);
  const [builderFields, setBuilderFields] = useState({});
  const [builderCat, setBuilderCat] = useState(null);

  // Autocomplete state
  const [acItems, setAcItems] = useState([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acPos, setAcPos] = useState({ top: 0, left: 0 });
  const acRafRef = useRef(null);

  const content = file?.content ?? '';
  const lines = content.split('\n');
  const lineCount = lines.length;

  useEffect(() => { setAcItems([]); return () => { if (acRafRef.current) cancelAnimationFrame(acRafRef.current); }; }, [file?.id]);

  const lineErrors = useMemo(() => {
    if (!content) return {};
    const errs = {};
    content.split('\n').forEach((line, i) => {
      const result = validateMcfunctionLine(line, i + 1, targetVersion);
      if (result) errs[i + 1] = result;
    });
    return errs;
  }, [content, targetVersion]);

  const mcfErrorCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'error').length, [lineErrors]);
  const mcfWarnCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'warning').length, [lineErrors]);
  const mcfInfoCount = useMemo(() => Object.values(lineErrors).filter(e => e.type === 'info').length, [lineErrors]);
  const cmdCount = useMemo(() => lines.filter(l => l.trim() && !l.trim().startsWith('#')).length, [lines]);

  const highlighted = useMemo(() => highlightMcfunction(content), [content]);

  // Cursor tracking
  const updateCursorInfo = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = ta.value.substring(0, ta.selectionStart);
    const rowLines = val.split('\n');
    setCursorInfo({ line: rowLines.length, col: rowLines[rowLines.length - 1].length + 1 });
  }, []);

  // Insert at cursor position
  const insertAtCursor = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) { onChange((content ? content + '\n' : '') + text); return; }
    const pos = ta.selectionStart;
    const val = ta.value;
    const before = val.substring(0, pos);
    const after = val.substring(ta.selectionEnd);
    const needPrefixNL = before.length > 0 && !before.endsWith('\n');
    const needSuffixNL = after.length > 0 && !after.startsWith('\n');
    const insert = (needPrefixNL ? '\n' : '') + text + (needSuffixNL ? '\n' : '');
    const newVal = before + insert + after;
    onChange(newVal);
    const newPos = before.length + insert.length - (needSuffixNL ? 1 : 0);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newPos; ta.focus(); });
  }, [content, onChange]);

  const getCursorPixelPos = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return { top: 0, left: 0 };
    const val = ta.value.substring(0, ta.selectionStart);
    const rowLines = val.split('\n');
    const row = rowLines.length - 1;
    const col = rowLines[rowLines.length - 1].length;
    return { top: (row + 1) * 20.8 - ta.scrollTop, left: Math.min(col * 7.8 + 8 - ta.scrollLeft, ta.clientWidth - 200) };
  }, []);

  const triggerAutocomplete = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineText = before.substring(lineStart);
    const col = pos - lineStart;
    const suggestions = getAutocompleteSuggestions(lineText, col, targetVersion);
    if (suggestions.length > 0) {
      setAcItems(suggestions.slice(0, 10));
      setAcIndex(0);
      setAcPos(getCursorPixelPos());
    } else { setAcItems([]); }
  }, [getCursorPixelPos, targetVersion]);

  const insertCompletion = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = ta.value;
    const before = val.substring(0, pos);
    const match = before.match(/[\w@._:-]*$/);
    const wordStart = pos - (match ? match[0].length : 0);
    const inBracket = before.lastIndexOf('[') > before.lastIndexOf(']');
    const suffix = (text.endsWith('=') || inBracket) ? '' : ' ';
    const newVal = val.substring(0, wordStart) + text + suffix + val.substring(pos);
    onChange(newVal);
    const newPos = wordStart + text.length + suffix.length;
    setAcItems([]);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
      // Re-trigger autocomplete immediately for chained completion
      requestAnimationFrame(() => triggerAutocomplete());
    });
  }, [onChange, triggerAutocomplete]);

  const handleScroll = () => {
    if (preRef.current && textareaRef.current) { preRef.current.scrollTop = textareaRef.current.scrollTop; preRef.current.scrollLeft = textareaRef.current.scrollLeft; }
    if (lineNumRef.current && textareaRef.current) { lineNumRef.current.scrollTop = textareaRef.current.scrollTop; }
    setAcItems(prev => prev.length > 0 ? [] : prev);
  };

  const handleKeyDown = (e) => {
    if (acItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIndex(i => (i + 1) % acItems.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAcIndex(i => (i - 1 + acItems.length) % acItems.length); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { if (acItems[acIndex]) { e.preventDefault(); insertCompletion(acItems[acIndex].l); return; } }
      if (e.key === 'Escape') { e.preventDefault(); setAcItems([]); return; }
    }
    // Command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowPalette(true); setPaletteSearch(''); return; }
    // Tab indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target; const start = ta.selectionStart; const end = ta.selectionEnd;
      const newVal = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  // Builder helpers
  const selectBuilderCmd = (cmd) => {
    setBuilderCmd(cmd);
    const defaults = {};
    cmd.fields.forEach(f => { defaults[f.key] = f.def ?? ''; });
    setBuilderFields(defaults);
  };
  const builderPreview = builderCmd ? builderCmd.build(builderFields) : '';
  const insertBuilderResult = () => { if (builderPreview) insertAtCursor(builderPreview); };

  // Palette filtering
  const paletteItems = useMemo(() => {
    const all = [];
    QUICK_COMMANDS.forEach(q => all.push({ type:'quick', label: q.label, desc: q.desc, icon: q.icon, tpl: q.tpl }));
    COMMAND_BUILDER_DEFS.forEach(c => all.push({ type:'builder', label: c.name, desc: c.cat, icon: c.icon, cmd: c }));
    SNIPPET_TEMPLATES.forEach(s => all.push({ type:'snippet', label: s.name, desc: s.desc, icon: s.icon, lines: s.lines }));
    if (!paletteSearch) return all;
    const q = paletteSearch.toLowerCase();
    return all.filter(a => a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
  }, [paletteSearch]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',background:'#12121e',borderBottom:'1px solid #2a2a4a',flexShrink:0,overflow:'hidden'}}>
        <span style={{fontSize:11,color:'#4fc3f7',fontWeight:700,marginRight:4}}>⚡ {file?.name || 'mcfunction'}</span>
        <div style={{display:'flex',gap:2,overflow:'auto',flex:1}}>
          {QUICK_COMMANDS.slice(0, 12).map(qc => (
            <button key={qc.label} onClick={() => insertAtCursor(qc.tpl)} title={qc.desc}
              style={{display:'flex',alignItems:'center',gap:3,padding:'2px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#aaa',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              <span style={{fontSize:12}}>{qc.icon}</span>{qc.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowPalette(true); setPaletteSearch(''); }} title="コマンドパレット (Ctrl+K)"
          style={{padding:'2px 8px',fontSize:10,borderRadius:3,border:'1px solid #4fc3f7',background:'#4fc3f720',color:'#4fc3f7',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
          ⌘K パレット
        </button>
        <button onClick={() => setCmdSidebarOpen(p => !p)} title={cmdSidebarOpen ? 'サイドバーを閉じる' : 'コマンドツール'}
          style={{padding:'2px 8px',fontSize:10,borderRadius:3,border:'1px solid #555',background: cmdSidebarOpen ? '#4fc3f730' : '#1a1a2e',color: cmdSidebarOpen ? '#4fc3f7' : '#888',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
          {cmdSidebarOpen ? '◀ ツール' : '▶ ツール'}
        </button>
      </div>

      {/* Main content: editor + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Code Editor Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Editor header */}
          <div className="flex items-center justify-between px-3 py-1 bg-mc-dark/50 border-b border-mc-border text-xs" style={{flexShrink:0}}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-mc-muted" style={{fontSize:10}}>{file?.path || file?.name}</span>
            </div>
            <div className="flex items-center gap-2" style={{fontSize:10}}>
              {mcfErrorCount > 0 && <span className="flex items-center gap-1 text-mc-accent"><span>●</span>{mcfErrorCount}</span>}
              {mcfWarnCount > 0 && <span className="flex items-center gap-1 text-mc-warning"><span>▲</span>{mcfWarnCount}</span>}
              {mcfInfoCount > 0 && <span className="flex items-center gap-1 text-mc-info"><span>ℹ</span>{mcfInfoCount}</span>}
              {mcfErrorCount === 0 && mcfWarnCount === 0 && mcfInfoCount === 0 && content.trim() && <span className="flex items-center gap-1 text-mc-success"><CheckCircle size={10} /> OK</span>}
            </div>
          </div>

          {/* Editor body with line numbers */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div ref={lineNumRef} className="bg-mc-darker/50 py-2 pr-2 pl-3 text-right select-none overflow-hidden border-r border-mc-border/50 flex-shrink-0"
              style={{ width: `${Math.max(3, String(lineCount).length) * 10 + 24}px` }}>
              {Array.from({ length: lineCount }, (_, i) => {
                const err = lineErrors[i + 1];
                return (
                  <div key={i} className={`line-num ${err ? (err.type === 'error' ? 'text-mc-accent' : err.type === 'warning' ? 'text-mc-warning' : 'text-mc-info') : 'text-mc-muted/40'}`}
                    title={err ? err.msg : undefined} style={{fontSize:13,lineHeight:'20.8px'}}>
                    {err ? (err.type === 'error' ? '●' : err.type === 'warning' ? '▲' : 'ℹ') : (i + 1)}
                  </div>
                );
              })}
            </div>
            <div className="relative flex-1 min-w-0">
              <pre ref={preRef} className="absolute inset-0 overflow-auto py-2 px-3 editor-area whitespace-pre pointer-events-none"
                aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} />
              <textarea ref={textareaRef}
                className="absolute inset-0 bg-transparent text-transparent caret-gray-300 py-2 px-3 editor-area whitespace-pre resize-none outline-none w-full h-full overflow-auto"
                value={content} onChange={e => { onChange(e.target.value); if (acRafRef.current) cancelAnimationFrame(acRafRef.current); acRafRef.current = requestAnimationFrame(triggerAutocomplete); }}
                onScroll={handleScroll} onKeyDown={handleKeyDown}
                onClick={() => { setAcItems([]); updateCursorInfo(); }}
                onKeyUp={updateCursorInfo} onSelect={updateCursorInfo}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" />
              {/* Autocomplete popup */}
              {acItems.length > 0 && (
                <div className="absolute z-50 bg-mc-panel border border-mc-border rounded shadow-xl max-h-52 overflow-y-auto anim-scale"
                  style={{ top: acPos.top, left: Math.max(0, acPos.left) }}>
                  {acItems.map((item, i) => (
                    <div key={item.l} className={`px-3 py-1.5 text-xs cursor-pointer flex items-center gap-3 min-w-[200px] ${i === acIndex ? 'bg-mc-info/30 text-white' : 'text-mc-text hover:bg-mc-dark'}`}
                      onMouseDown={(e) => { e.preventDefault(); insertCompletion(item.l); }}>
                      <span className={`font-mono font-medium ${item._nbt ? 'text-orange-400' : 'text-sky-300'}`}>{item.l}</span>
                      {item.v && <span className="text-[9px] px-1 py-0.5 rounded bg-mc-info/20 text-mc-info flex-shrink-0">{item.v}+</span>}
                      <span className="text-mc-muted text-[10px] truncate">{item.d}</span>
                    </div>
                  ))}
                  <div className="px-3 py-1 text-[9px] text-mc-muted/50 border-t border-mc-border/30">↑↓選択 Tab/Enter確定 Esc閉じる</div>
                </div>
              )}
            </div>
          </div>

          {/* Problems panel */}
          {(mcfErrorCount > 0 || mcfWarnCount > 0 || mcfInfoCount > 0) && (
            <div style={{background:'#0a0a18',borderTop:'1px solid #2a2a4a',fontSize:10,maxHeight:130,overflowY:'auto',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'2px 10px',borderBottom:'1px solid #1a1a3a',position:'sticky',top:0,background:'#0a0a18',zIndex:5}}>
                <span style={{fontWeight:600,color:'#ccc',fontSize:11}}>Problems</span>
                {mcfErrorCount > 0 && <span style={{color:'#f14c4c',display:'flex',alignItems:'center',gap:2}}>● {mcfErrorCount}</span>}
                {mcfWarnCount > 0 && <span style={{color:'#cca700',display:'flex',alignItems:'center',gap:2}}>▲ {mcfWarnCount}</span>}
                {mcfInfoCount > 0 && <span style={{color:'#3794ff',display:'flex',alignItems:'center',gap:2}}>ℹ {mcfInfoCount}</span>}
              </div>
              {Object.entries(lineErrors).slice(0, 16).map(([ln, e]) => {
                const clr = e.type === 'error' ? '#f14c4c' : e.type === 'warning' ? '#cca700' : '#3794ff';
                const icon = e.type === 'error' ? '●' : e.type === 'warning' ? '▲' : 'ℹ';
                return (
                  <div key={ln} style={{display:'flex',alignItems:'center',gap:6,padding:'1px 10px',cursor:'pointer',color:clr}}
                    onMouseEnter={ev => ev.currentTarget.style.background='#1a1a3a'}
                    onMouseLeave={ev => ev.currentTarget.style.background='transparent'}
                    onClick={() => {
                      const ta = textareaRef.current;
                      if (ta) {
                        const ls = ta.value.split('\n');
                        let pos = 0;
                        for (let i = 0; i < parseInt(ln) - 1 && i < ls.length; i++) pos += ls[i].length + 1;
                        ta.selectionStart = ta.selectionEnd = pos;
                        ta.focus();
                        ta.scrollTop = Math.max(0, (parseInt(ln) - 3) * 20.8);
                      }
                    }}>
                    <span style={{flexShrink:0,width:10,textAlign:'center'}}>{icon}</span>
                    <span style={{fontFamily:'monospace',width:30,textAlign:'right',flexShrink:0,color:'#888'}}>{ln}行</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.msg}</span>
                    {e.fix && (
                      <button style={{flexShrink:0,padding:'0 5px',borderRadius:3,background:'rgba(55,148,255,0.15)',color:'#3794ff',border:'none',cursor:'pointer',fontSize:9,fontWeight:500}}
                        title={`Quick Fix: ${e.fix.label}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const ta = textareaRef.current;
                          if (!ta) return;
                          const ls = ta.value.split('\n');
                          const idx = parseInt(ln) - 1;
                          if (idx < ls.length) {
                            ls[idx] = e.fix.apply(ls[idx]);
                            onChange(ls.join('\n'));
                          }
                        }}>
                        {e.fix.label}
                      </button>
                    )}
                  </div>
                );
              })}
              {Object.keys(lineErrors).length > 16 && (
                <div style={{color:'#555',padding:'1px 10px'}}>...他 {Object.keys(lineErrors).length - 16}件</div>
              )}
            </div>
          )}

          {/* Inline Guide Panel */}
          {guideMode && (() => {
            const ls = content.split('\n');
            const curLine = ls[cursorInfo.line - 1] || '';
            const trimLine = curLine.trim();
            const cmd = trimLine.split(/\s+/)[0]?.replace(/^\//,'');
            const guide = cmd && COMMAND_GUIDE[cmd];
            if (!guide && !trimLine) return (
              <div style={{background:'#0d0d1a',borderTop:'1px solid #1a1a3a',padding:'5px 10px',fontSize:10,flexShrink:0}}>
                <span style={{color:'#4fc3f7'}}>📖 ガイド:</span> <span style={{color:'#888'}}>コマンドを入力すると引数のヒントが表示されます。Tab で補完、Ctrl+K でパレット検索</span>
              </div>
            );
            if (!guide) return null;
            const tokens = trimLine.split(/\s+/);
            const curArgIdx = Math.max(0, tokens.length - 2);
            const curArg = guide.a[curArgIdx];
            // 引数タイプに応じたヒント
            const typeHints = { selector:'@a=全員, @s=自分, @p=最寄り, @e=全エンティティ, @r=ランダム', item:'アイテムIDを入力 (例: diamond, golden_apple)', entity:'エンティティIDを入力 (例: zombie, armor_stand)', effect:'エフェクトIDを入力 (例: speed, strength)', pos:'座標を入力 — 絶対:数値 / 相対:~数値 / ローカル:^数値', int:'整数値を入力 (例: 1, 30, 100)', float:'数値を入力 (小数OK: 1.5, 0.3)', string:'テキストを入力', json:'JSONテキスト (例: {"text":"Hello","color":"green"})', nbt:'NBTデータ (例: {Health:20,NoAI:1b})', enum:'選択肢から入力' };
            return (
              <div style={{background:'#0d0d1a',borderTop:'1px solid #1a1a3a',padding:'4px 10px',fontSize:10,flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{color:'#4fc3f7',fontWeight:700,fontFamily:'monospace'}}>📖 {cmd}</span>
                  <span style={{color:'#777'}}>{guide.d}</span>
                  {guide.a.map((arg, i) => (
                    <span key={i} style={{padding:'0 4px',borderRadius:2,fontSize:9,
                      border: i === curArgIdx ? '1px solid #4fc3f7' : '1px solid #222',
                      background: i === curArgIdx ? '#4fc3f715' : 'transparent',
                      color: i === curArgIdx ? '#4fc3f7' : '#555'}}>
                      {arg.n}{arg.o ? ` (${arg.o.slice(0,3).join('/')})` : ''}
                    </span>
                  ))}
                  <span style={{color:'#4ec9b0',fontFamily:'monospace',fontSize:9,marginLeft:'auto'}}>▶ {guide.p.replace(/\{(\w+)\}/g, (_, k) => {
                    const idx = guide.a.findIndex(a => a.n === k);
                    return idx >= 0 && tokens[idx + 1] ? tokens[idx + 1] : `[${k}]`;
                  })}</span>
                </div>
                {curArg && (
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2,paddingLeft:20}}>
                    <span style={{color:'#4fc3f7',fontSize:9,fontWeight:600}}>→ {curArg.n}:</span>
                    <span style={{color:'#aaa',fontSize:9}}>{curArg.d}</span>
                    {curArg.o && <span style={{color:'#666',fontSize:8,fontFamily:'monospace'}}>[{curArg.o.join(' | ')}]</span>}
                    {!curArg.o && typeHints[curArg.t] && <span style={{color:'#666',fontSize:8}}>{typeHints[curArg.t]}</span>}
                  </div>
                )}
                {tokens.length === 1 && guide.ex && guide.ex[0] && (
                  <div style={{marginTop:2,paddingLeft:20,fontSize:9,color:'#555'}}>
                    例: <span style={{color:'#888',fontFamily:'monospace'}}>{guide.ex[0]}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Status bar */}
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'2px 12px',background:'#0d0d1a',borderTop:'1px solid #2a2a4a',fontSize:10,color:'#666',flexShrink:0}}>
            <span style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8}} title="Problems パネルを表示">
              {mcfErrorCount > 0 && <span style={{color:'#f14c4c',display:'flex',alignItems:'center',gap:2}}>● {mcfErrorCount}</span>}
              {mcfWarnCount > 0 && <span style={{color:'#cca700',display:'flex',alignItems:'center',gap:2}}>▲ {mcfWarnCount}</span>}
              {mcfInfoCount > 0 && <span style={{color:'#3794ff',display:'flex',alignItems:'center',gap:2}}>ℹ {mcfInfoCount}</span>}
              {mcfErrorCount === 0 && mcfWarnCount === 0 && mcfInfoCount === 0 && <span style={{color:'#4ec9b0'}}>OK</span>}
            </span>
            <span>行 {cursorInfo.line}, 列 {cursorInfo.col}</span>
            <span>{cmdCount} コマンド</span>
            <span onClick={onToggleGuide} style={{marginLeft:'auto',color: guideMode ? '#4fc3f7' : '#555',cursor:'pointer',padding:'0 4px',borderRadius:3,border: guideMode ? '1px solid #4fc3f740' : '1px solid transparent'}} title={guideMode ? 'クリックでガイドOFF' : 'クリックでガイドON'}>
              {guideMode ? '📖 ガイド ON' : '📖 ガイド OFF'}
            </span>
            <span>mcfunction</span>
            <span>UTF-8</span>
            <span>{lineCount} 行</span>
          </div>
        </div>

        {/* Command Sidebar */}
        {cmdSidebarOpen && (
          <div style={{width:280,borderLeft:'1px solid #2a2a4a',display:'flex',flexDirection:'column',background:'#111122',flexShrink:0}}>
            {/* Sidebar tabs */}
            <div style={{display:'flex',borderBottom:'1px solid #2a2a4a',flexShrink:0}}>
              {[{id:'quick',label:'クイック',icon:'⚡'},{id:'builder',label:'ビルダー',icon:'🔧'},{id:'snippets',label:'テンプレ',icon:'📋'},{id:'guide',label:'ガイド',icon:'📖'}].map(t => (
                <button key={t.id} onClick={() => setSidebarTab(t.id)}
                  style={{flex:1,padding:'6px 4px',fontSize:10,border:'none',cursor:'pointer',borderBottom: sidebarTab === t.id ? '2px solid #4fc3f7' : '2px solid transparent',
                    background:'transparent',color: sidebarTab === t.id ? '#4fc3f7' : '#888'}}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Sidebar content */}
            <div style={{flex:1,overflowY:'auto',padding:8}}>
              {/* QUICK TAB */}
              {sidebarTab === 'quick' && (
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  <div style={{fontSize:10,color:'#888',padding:'2px 4px',marginBottom:2}}>クリックでカーソル位置に挿入</div>
                  {QUICK_COMMANDS.map(qc => (
                    <button key={qc.label} onClick={() => insertAtCursor(qc.tpl)}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:4,border:'1px solid #2a2a4a',background:'#1a1a2e',cursor:'pointer',textAlign:'left'}}>
                      {MCF_CMD_ITEMS[qc.label] ? <McIcon id={MCF_CMD_ITEMS[qc.label]} size={20} /> : <span style={{fontSize:16,width:20,textAlign:'center'}}>{qc.icon}</span>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:'#ddd',fontWeight:600}}>{qc.label}</div>
                        <div style={{fontSize:9,color:'#777',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{qc.desc}</div>
                      </div>
                      <Plus size={12} style={{color:'#4fc3f7',flexShrink:0}} />
                    </button>
                  ))}
                </div>
              )}

              {/* BUILDER TAB */}
              {sidebarTab === 'builder' && (
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {!builderCmd ? (
                    <>
                      {/* Category filter */}
                      <div style={{display:'flex',flexWrap:'wrap',gap:2,marginBottom:4}}>
                        <button onClick={() => setBuilderCat(null)} style={{padding:'2px 6px',fontSize:9,borderRadius:3,border:'1px solid #333',
                          background: !builderCat ? '#4fc3f730' : '#1a1a2e',color: !builderCat ? '#4fc3f7' : '#888',cursor:'pointer'}}>全て</button>
                        {COMMAND_BUILDER_CATS.map(cat => (
                          <button key={cat} onClick={() => setBuilderCat(cat)} style={{padding:'2px 6px',fontSize:9,borderRadius:3,border:'1px solid #333',
                            background: builderCat === cat ? '#4fc3f730' : '#1a1a2e',color: builderCat === cat ? '#4fc3f7' : '#888',cursor:'pointer'}}>{cat}</button>
                        ))}
                      </div>
                      {/* Command list */}
                      {COMMAND_BUILDER_DEFS.filter(c => !builderCat || c.cat === builderCat).map(cmd => (
                        <button key={cmd.id} onClick={() => selectBuilderCmd(cmd)}
                          style={{display:'flex',alignItems:'center',gap:6,padding:'5px 8px',borderRadius:4,border:'1px solid #2a2a4a',background:'#1a1a2e',cursor:'pointer',textAlign:'left'}}>
                          <span style={{fontSize:14}}>{cmd.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,color:'#ddd'}}>{cmd.name}</div>
                            <div style={{fontSize:9,color:'#666'}}>{cmd.cat}</div>
                          </div>
                          <ChevronRight size={12} style={{color:'#555'}} />
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Builder form */}
                      <button onClick={() => setBuilderCmd(null)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 6px',fontSize:10,color:'#4fc3f7',background:'none',border:'none',cursor:'pointer'}}>
                        <ChevronLeft size={12} /> 戻る
                      </button>
                      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:4,background:'#1e1e3a',border:'1px solid #3a3a5a'}}>
                        <span style={{fontSize:18}}>{builderCmd.icon}</span>
                        <div><div style={{fontSize:12,color:'#fff',fontWeight:700}}>{builderCmd.name}</div><div style={{fontSize:9,color:'#888'}}>{builderCmd.cat}</div></div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                        {builderCmd.fields.map(field => (
                          <div key={field.key}>
                            <label style={{fontSize:10,color:'#aaa',display:'block',marginBottom:2}}>{field.label}</label>
                            {field.type === 'select' ? (
                              <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:11,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#ccc',cursor:'pointer'}}>
                                <input type="checkbox" checked={!!builderFields[field.key]} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.checked}))} />
                                {field.label}
                              </label>
                            ) : field.type === 'number' ? (
                              <input type="number" value={builderFields[field.key] ?? ''} min={field.min} max={field.max} step={field.step || 1}
                                onChange={e => setBuilderFields(p => ({...p, [field.key]: Number(e.target.value)}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:11,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}} />
                            ) : field.type === 'mc_item' || field.type === 'mc_item_optional' ? (
                              <div style={{display:'flex',alignItems:'center',gap:4}}>
                                <McIcon id={builderFields[field.key] || 'minecraft:stone'} size={20} />
                                <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                  style={{flex:1,padding:'4px 4px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                  {field.type === 'mc_item_optional' && <option value="">なし</option>}
                                  {MC_ITEMS.map(it => <option key={it} value={`minecraft:${it}`}>minecraft:{it}</option>)}
                                </select>
                              </div>
                            ) : field.type === 'mc_entity' ? (
                              <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                {MC_ENTITIES.map(en => <option key={en} value={`minecraft:${en}`}>minecraft:{en}</option>)}
                              </select>
                            ) : field.type === 'mc_effect' || field.type === 'mc_effect_optional' ? (
                              <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                {field.type === 'mc_effect_optional' && <option value="">なし</option>}
                                {MC_EFFECTS.map(ef => <option key={ef} value={ef}>{ef}</option>)}
                              </select>
                            ) : field.type === 'mc_sound' ? (
                              <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                {MC_SOUNDS.map(s => <option key={s} value={`minecraft:${s}`}>minecraft:{s}</option>)}
                              </select>
                            ) : field.type === 'mc_particle' ? (
                              <select value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:10,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}}>
                                {MC_PARTICLES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                              </select>
                            ) : field.type === 'mc_color' ? (
                              <div style={{display:'flex',flexWrap:'wrap',gap:2}}>
                                {MC_COLORS.map(c => (
                                  <button key={c} onClick={() => setBuilderFields(p => ({...p, [field.key]: c}))}
                                    style={{width:20,height:20,borderRadius:3,border: builderFields[field.key] === c ? '2px solid #fff' : '1px solid #333',
                                      background: MC_COLOR_HEX[c] || '#888',cursor:'pointer',fontSize:0}} title={c}>{c}</button>
                                ))}
                              </div>
                            ) : field.type === 'mc_richtext' ? (
                              <McRichTextEditor value={builderFields[field.key] || field.def || ''} onChange={v => setBuilderFields(p => ({...p, [field.key]: v}))} compact />
                            ) : (
                              <input type="text" value={builderFields[field.key] || ''} onChange={e => setBuilderFields(p => ({...p, [field.key]: e.target.value}))}
                                style={{width:'100%',padding:'4px 6px',fontSize:11,borderRadius:3,border:'1px solid #333',background:'#1a1a2e',color:'#ddd'}} />
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Preview */}
                      {builderPreview && (
                        <div style={{marginTop:8,padding:8,borderRadius:4,background:'#0a0a1a',border:'1px solid #2a2a4a'}}>
                          <div style={{fontSize:9,color:'#888',marginBottom:4}}>プレビュー:</div>
                          <pre style={{fontSize:10,color:'#4fc3f7',whiteSpace:'pre-wrap',wordBreak:'break-all',margin:0,fontFamily:'monospace'}}>{builderPreview}</pre>
                        </div>
                      )}
                      <button onClick={insertBuilderResult} disabled={!builderPreview}
                        style={{marginTop:6,padding:'6px 12px',fontSize:11,fontWeight:700,borderRadius:4,border:'none',
                          background: builderPreview ? '#4fc3f7' : '#333',color: builderPreview ? '#000' : '#666',cursor: builderPreview ? 'pointer' : 'default'}}>
                        ⚡ カーソル位置に挿入
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* SNIPPETS TAB */}
              {sidebarTab === 'snippets' && (
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <div style={{fontSize:10,color:'#888',padding:'2px 4px',marginBottom:2}}>ミニゲーム用テンプレート</div>
                  {SNIPPET_TEMPLATES.map(sn => (
                    <div key={sn.id} style={{borderRadius:4,border:'1px solid #2a2a4a',background:'#1a1a2e',overflow:'hidden'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px'}}>
                        <span style={{fontSize:16}}>{sn.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:'#ddd',fontWeight:600}}>{sn.name}</div>
                          <div style={{fontSize:9,color:'#777'}}>{sn.desc} ({sn.lines.length}行)</div>
                        </div>
                        <button onClick={() => insertAtCursor(sn.lines.join('\n'))}
                          style={{padding:'3px 8px',fontSize:10,borderRadius:3,border:'1px solid #4fc3f7',background:'#4fc3f720',color:'#4fc3f7',cursor:'pointer'}}>
                          挿入
                        </button>
                      </div>
                      <pre style={{margin:0,padding:'4px 8px',fontSize:9,color:'#666',background:'#0a0a16',maxHeight:60,overflow:'hidden',whiteSpace:'pre',borderTop:'1px solid #222'}}>
                        {sn.lines.slice(0, 5).join('\n')}{sn.lines.length > 5 ? '\n...' : ''}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* GUIDE TAB */}
              {sidebarTab === 'guide' && (() => {
                const ls = content.split('\n');
                const curLine = ls[cursorInfo.line - 1] || '';
                const cmd = curLine.trim().split(/\s+/)[0]?.replace(/^\//,'');
                const guide = cmd && COMMAND_GUIDE[cmd];
                const tokens = curLine.trim().split(/\s+/);
                const curArgIdx = Math.max(0, tokens.length - 2);

                // NBT info for summon/data context
                let nbtInfo = null;
                if (cmd === 'summon' && tokens.length >= 2) {
                  const eid = tokens[1]?.replace(/^minecraft:/, '');
                  const nbtKeys = getNBTKeysForEntity(eid);
                  nbtInfo = { entityId: eid, keys: Object.entries(nbtKeys).slice(0, 20) };
                }

                return (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{fontSize:10,color:'#888',padding:'2px 4px'}}>カーソル行のコマンドガイド</div>
                    {guide ? (
                      <div style={{background:'#1a1a2e',border:'1px solid #2a2a4a',borderRadius:4,padding:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                          <span style={{fontSize:13,color:'#4fc3f7',fontWeight:700,fontFamily:'monospace'}}>/{cmd}</span>
                          <span style={{fontSize:9,color:'#aaa'}}>{guide.d}</span>
                        </div>
                        {/* Argument chips */}
                        <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
                          {guide.a.map((arg, i) => (
                            <span key={i} style={{padding:'2px 5px',borderRadius:3,fontSize:9,
                              border: i === curArgIdx ? '1px solid #4fc3f7' : '1px solid #333',
                              background: i === curArgIdx ? '#4fc3f720' : 'transparent',
                              color: i === curArgIdx ? '#4fc3f7' : '#888'}}>
                              <span style={{opacity:0.6}}>{arg.t} </span>{arg.n}
                              {i === curArgIdx && <span style={{color:'#4fc3f7',marginLeft:3}}>←</span>}
                            </span>
                          ))}
                        </div>
                        {/* Current arg detail */}
                        {guide.a[curArgIdx] && (
                          <div style={{background:'#0d0d1a',borderRadius:3,padding:'4px 6px',fontSize:9,color:'#7ec8e3',borderLeft:'2px solid #4fc3f7',marginBottom:4}}>
                            <b>{guide.a[curArgIdx].n}:</b> {guide.a[curArgIdx].d}
                            {guide.a[curArgIdx].o && <div style={{color:'#666',marginTop:2}}>候補: {guide.a[curArgIdx].o.join(', ')}</div>}
                          </div>
                        )}
                        {/* Preview */}
                        <div style={{background:'#0a0a16',borderRadius:3,padding:'4px 6px',fontSize:9,fontFamily:'monospace'}}>
                          <span style={{color:'#666'}}>▶ </span>
                          <span style={{color:'#4ec9b0'}}>{guide.p.replace(/\{(\w+)\}/g, (_, k) => {
                            const idx = guide.a.findIndex(a => a.n === k);
                            return idx >= 0 && tokens[idx + 1] ? tokens[idx + 1] : `[${k}]`;
                          })}</span>
                        </div>
                        {/* Examples */}
                        <div style={{marginTop:4,fontSize:9,color:'#555'}}>
                          {guide.ex.map((e, i) => <div key={i} style={{fontFamily:'monospace'}}>例: {e}</div>)}
                        </div>
                      </div>
                    ) : (
                      <div style={{fontSize:10,color:'#555',padding:8,textAlign:'center'}}>
                        {cmd ? `"${cmd}" のガイドはありません` : 'コマンド行にカーソルを移動してください'}
                      </div>
                    )}
                    {/* NBT Reference */}
                    {nbtInfo && (
                      <div style={{background:'#1a1a2e',border:'1px solid #2a2a4a',borderRadius:4,padding:8}}>
                        <div style={{fontSize:10,color:'#f0a040',fontWeight:600,marginBottom:4}}>🏷️ NBTタグ: {nbtInfo.entityId}</div>
                        <div style={{display:'flex',flexDirection:'column',gap:2}}>
                          {nbtInfo.keys.map(([k, v]) => (
                            <div key={k} style={{display:'flex',gap:4,fontSize:9,cursor:'pointer',padding:'1px 3px',borderRadius:2}}
                              onMouseEnter={e => e.currentTarget.style.background='#2a2a4a'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}
                              onClick={() => insertAtCursor(k + ':')}>
                              <span style={{color:'#f0a040',fontFamily:'monospace',minWidth:90}}>{k}</span>
                              <span style={{color:'#666'}}>{v.t}</span>
                              <span style={{color:'#555',flex:1}}>{v.d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* General guide: all commands */}
                    {!guide && !nbtInfo && (
                      <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:4}}>
                        <div style={{fontSize:10,color:'#888',padding:'2px 4px'}}>コマンド一覧</div>
                        {Object.entries(COMMAND_GUIDE).slice(0, 25).map(([name, g]) => (
                          <div key={name} style={{display:'flex',gap:4,fontSize:9,cursor:'pointer',padding:'2px 4px',borderRadius:2}}
                            onMouseEnter={e => e.currentTarget.style.background='#2a2a4a'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}
                            onClick={() => insertAtCursor(name + ' ')}>
                            <span style={{color:'#4fc3f7',fontFamily:'monospace',minWidth:80}}>{name}</span>
                            <span style={{color:'#666'}}>{g.d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Command Palette Modal */}
      {showPalette && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}}
          onClick={() => setShowPalette(false)}>
          <div style={{width:480,maxHeight:'60vh',background:'#1a1a2e',border:'1px solid #4fc3f7',borderRadius:8,boxShadow:'0 20px 60px rgba(0,0,0,0.8)',display:'flex',flexDirection:'column'}}
            onClick={e => e.stopPropagation()}>
            <div style={{padding:'8px 12px',borderBottom:'1px solid #2a2a4a',display:'flex',alignItems:'center',gap:8}}>
              <Search size={14} style={{color:'#4fc3f7'}} />
              <input value={paletteSearch} onChange={e => setPaletteSearch(e.target.value)} autoFocus placeholder="コマンドを検索... (例: give, タイマー, PVP)"
                style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:13}}
                onKeyDown={e => { if (e.key === 'Escape') setShowPalette(false); }} />
              <span style={{fontSize:9,color:'#666'}}>Esc で閉じる</span>
            </div>
            <div style={{flex:1,overflowY:'auto',maxHeight:'50vh'}}>
              {paletteItems.slice(0, 20).map((item, idx) => (
                <button key={`${item.type}-${item.label}-${idx}`}
                  onClick={() => {
                    if (item.type === 'quick') insertAtCursor(item.tpl);
                    else if (item.type === 'snippet') insertAtCursor(item.lines.join('\n'));
                    else if (item.type === 'builder') { setSidebarTab('builder'); selectBuilderCmd(item.cmd); setCmdSidebarOpen(true); }
                    setShowPalette(false);
                  }}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'none',borderBottom:'1px solid #1a1a30',background:'transparent',cursor:'pointer',textAlign:'left',color:'#ddd'}}
                  onMouseEnter={e => e.currentTarget.style.background='#2a2a4a'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span style={{fontSize:16,width:24,textAlign:'center'}}>{item.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600}}>{item.label}</div>
                    <div style={{fontSize:10,color:'#777'}}>{item.desc}</div>
                  </div>
                  <span style={{fontSize:9,padding:'1px 6px',borderRadius:3,background: item.type === 'quick' ? '#4fc3f720' : item.type === 'builder' ? '#4caf5020' : '#ff980020',
                    color: item.type === 'quick' ? '#4fc3f7' : item.type === 'builder' ? '#4caf50' : '#ff9800'}}>
                    {item.type === 'quick' ? '即挿入' : item.type === 'builder' ? 'ビルダー' : 'テンプレ'}
                  </span>
                </button>
              ))}
              {paletteItems.length === 0 && (
                <div style={{padding:20,textAlign:'center',color:'#666',fontSize:12}}>該当なし</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error display - improved */}
      {(mcfErrorCount > 0 || mcfWarnCount > 0) && (
        <div className="px-3 py-1.5 bg-mc-dark/80 border-t border-mc-border/30 text-[10px] max-h-28 overflow-y-auto" style={{flexShrink:0}}>
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-mc-border/20">
            <span className="font-semibold text-mc-text">
              {mcfErrorCount > 0 && <span className="text-mc-accent">● {mcfErrorCount}個のエラー</span>}
              {mcfErrorCount > 0 && mcfWarnCount > 0 && <span className="text-mc-muted mx-1">|</span>}
              {mcfWarnCount > 0 && <span className="text-mc-warning">▲ {mcfWarnCount}個の警告</span>}
            </span>
          </div>
          {Object.entries(lineErrors).slice(0, 12).map(([ln, e]) => (
            <div key={ln} className={`flex items-center gap-2 py-0.5 cursor-pointer hover:bg-mc-hover/30 rounded px-1 ${e.type === 'error' ? 'text-mc-accent' : 'text-mc-warning'}`}
              onClick={() => {
                const ta = textareaRef.current;
                if (ta) {
                  const lines = ta.value.split('\n');
                  let pos = 0;
                  for (let i = 0; i < parseInt(ln) - 1 && i < lines.length; i++) pos += lines[i].length + 1;
                  ta.selectionStart = ta.selectionEnd = pos;
                  ta.focus();
                  ta.scrollTop = Math.max(0, (parseInt(ln) - 3) * 20.8);
                }
              }}>
              <span className="flex-shrink-0">{e.type === 'error' ? '●' : '▲'}</span>
              <span className="font-mono w-8 text-right flex-shrink-0">{ln}行</span>
              <span className="truncate">{e.msg}</span>
            </div>
          ))}
          {Object.keys(lineErrors).length > 12 && <div className="text-mc-muted/50 py-0.5 pl-5">...他 {Object.keys(lineErrors).length - 12}件</div>}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SPLIT JSON EDITOR (Visual + Code side by side)
// ════════════════════════════════════════════════════════════

function SplitJsonEditor({ file, onChange, namespace, targetVersion, VisualComponent, visualProps }) {
  const [splitMode, setSplitMode] = useState('visual'); // 'visual' | 'split' | 'code'
  const jsonError = useMemo(() => {
    if (!file?.content?.trim()) return null;
    const r = tryParseJSON(file.content);
    return r.valid ? null : r.error;
  }, [file?.content]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Mode toggle bar */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',background:'#12121e',borderBottom:'1px solid #2a2a4a',flexShrink:0}}>
        {[{id:'visual',label:'🎨 ビジュアル'},{id:'split',label:'⬛ 分割'},{id:'code',label:'📝 コード'}].map(m => (
          <button key={m.id} onClick={() => setSplitMode(m.id)}
            style={{padding:'3px 10px',fontSize:11,borderRadius:4,border:'none',cursor:'pointer',
              background: splitMode === m.id ? '#4fc3f7' : '#2a2a4a',
              color: splitMode === m.id ? '#000' : '#aaa', fontWeight: splitMode === m.id ? 700 : 400}}>
            {m.label}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:10,color:'#555'}}>
          {jsonError ? <span style={{color:'#f44'}}>JSON エラー</span> : <span style={{color:'#4caf50'}}>JSON OK</span>}
        </span>
      </div>
      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {(splitMode === 'visual' || splitMode === 'split') && (
          <div className="flex-1 min-h-0" style={{overflow:'auto', borderRight: splitMode === 'split' ? '1px solid #2a2a4a' : 'none'}}>
            <VisualComponent file={file} onChange={onChange} namespace={namespace} {...visualProps} />
          </div>
        )}
        {(splitMode === 'code' || splitMode === 'split') && (
          <div className={splitMode === 'split' ? 'flex-1 min-h-0' : 'flex-1 min-h-0'}>
            <CodeEditor file={file} onChange={onChange} targetVersion={targetVersion} />
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ADVANCEMENT VISUAL EDITOR
// ════════════════════════════════════════════════════════════

const ADV_TRIGGERS = [
  { id: 'minecraft:impossible', n: '手動付与のみ' },
  { id: 'minecraft:player_killed_entity', n: 'エンティティ撃破' },
  { id: 'minecraft:inventory_changed', n: 'インベントリ変更' },
  { id: 'minecraft:enter_block', n: 'ブロックに入る' },
  { id: 'minecraft:location', n: '特定の場所' },
  { id: 'minecraft:tick', n: '毎tick' },
  { id: 'minecraft:recipe_unlocked', n: 'レシピ解除' },
  { id: 'minecraft:consume_item', n: 'アイテム消費' },
  { id: 'minecraft:bred_animals', n: '動物繁殖' },
  { id: 'minecraft:placed_block', n: 'ブロック設置' },
];

const ADV_FRAME_TYPES = [
  { id: 'task', n: '通常', icon: '🔲' },
  { id: 'goal', n: 'ゴール', icon: '🔵' },
  { id: 'challenge', n: 'チャレンジ', icon: '🔷' },
];

function AdvancementVisualEditor({ file, onChange, namespace }) {
  const [adv, setAdv] = useState(() => {
    try { return JSON.parse(file?.content || '{}'); } catch { return {}; }
  });

  const update = (key, val) => {
    const newAdv = { ...adv, [key]: val };
    setAdv(newAdv);
    const json = JSON.stringify(newAdv, null, 2);
    if (onChange && json !== file?.content) onChange(json);
  };

  const updateDisplay = (key, val) => {
    const display = { ...(adv.display || {}), [key]: val };
    update('display', display);
  };

  const updateCriteria = (name, trigger) => {
    const criteria = { ...(adv.criteria || {}), [name]: { trigger } };
    update('criteria', criteria);
  };

  const display = adv.display || {};
  const criteria = adv.criteria || {};
  const rewards = adv.rewards || {};

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <McIcon id="minecraft:knowledge_book" size={28} />
        <span className="text-sm font-semibold">進捗ビジュアルエディター</span>
        <span className="text-[10px] text-mc-muted bg-mc-dark px-2 py-0.5 rounded">{file?.name}</span>
      </div>

      {/* Display settings */}
      <div className="border border-mc-border rounded-lg p-3 space-y-3">
        <h4 className="text-xs font-semibold text-mc-text flex items-center gap-1.5">
          <Eye size={12} /> 表示設定
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">タイトル</label>
            <input className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
              value={typeof display.title === 'string' ? display.title : display.title?.text || ''}
              onChange={e => updateDisplay('title', e.target.value)}
              placeholder="進捗タイトル" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">説明</label>
            <input className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
              value={typeof display.description === 'string' ? display.description : display.description?.text || ''}
              onChange={e => updateDisplay('description', e.target.value)}
              placeholder="進捗の説明文" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">アイコン</label>
            <div className="flex items-center gap-2">
              <McInvSlot id={display.icon?.id || display.icon?.item || 'minecraft:stone'} size={36} />
              <select className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
                value={display.icon?.id || display.icon?.item || 'minecraft:stone'}
                onChange={e => updateDisplay('icon', { id: e.target.value })}>
                {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">フレーム</label>
            <div className="flex gap-1.5">
              {ADV_FRAME_TYPES.map(f => (
                <button key={f.id} onClick={() => updateDisplay('frame', f.id)}
                  className={`flex-1 px-2 py-1.5 rounded border text-[11px] flex items-center justify-center gap-1 transition-colors ${
                    (display.frame || 'task') === f.id ? 'border-mc-info bg-mc-info/20 text-white' : 'border-mc-border bg-mc-dark text-mc-muted hover:border-mc-muted'}`}>
                  <span>{f.icon}</span> {f.n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={display.show_toast !== false} onChange={e => updateDisplay('show_toast', e.target.checked)} className="accent-mc-info" />
            <span className="text-mc-text">トースト通知</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={display.announce_to_chat !== false} onChange={e => updateDisplay('announce_to_chat', e.target.checked)} className="accent-mc-info" />
            <span className="text-mc-text">チャット通知</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={!!display.hidden} onChange={e => updateDisplay('hidden', e.target.checked)} className="accent-mc-info" />
            <span className="text-mc-text">非表示</span>
          </label>
        </div>
      </div>

      {/* Criteria */}
      <div className="border border-mc-border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-mc-text flex items-center gap-1.5">
            <Target size={12} /> 達成条件
          </h4>
          <button onClick={() => {
            const name = `condition_${Object.keys(criteria).length + 1}`;
            updateCriteria(name, 'minecraft:impossible');
          }} className="text-[10px] text-mc-info hover:text-mc-info/80 flex items-center gap-1">
            <Plus size={10} /> 条件追加
          </button>
        </div>
        {Object.entries(criteria).map(([name, crit]) => (
          <div key={name} className="flex items-center gap-2 bg-mc-dark/30 rounded p-2">
            <input className="w-28 bg-mc-dark border border-mc-border rounded px-2 py-1 text-xs font-mono focus:border-mc-info focus:outline-none"
              value={name} readOnly />
            <select className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1 text-xs focus:border-mc-info focus:outline-none"
              value={crit.trigger || ''} onChange={e => updateCriteria(name, e.target.value)}>
              {ADV_TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.n} ({t.id})</option>)}
            </select>
            <button onClick={() => {
              const newCrit = { ...criteria };
              delete newCrit[name];
              update('criteria', newCrit);
            }} className="p-1 text-mc-muted hover:text-mc-accent"><Trash2 size={12} /></button>
          </div>
        ))}
        {Object.keys(criteria).length === 0 && (
          <p className="text-[10px] text-mc-muted text-center py-2">条件がありません。「条件追加」で追加してください。</p>
        )}
      </div>

      {/* Rewards */}
      <div className="border border-mc-border rounded-lg p-3 space-y-3">
        <h4 className="text-xs font-semibold text-mc-text flex items-center gap-1.5">
          <Gift size={12} /> 報酬
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">経験値</label>
            <input type="number" min={0}
              className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
              value={rewards.experience || 0}
              onChange={e => update('rewards', { ...rewards, experience: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-1">実行する関数</label>
            <input className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs font-mono focus:border-mc-info focus:outline-none"
              value={rewards.function || ''}
              onChange={e => update('rewards', { ...rewards, function: e.target.value || undefined })}
              placeholder={`${namespace}:reward_function`} />
          </div>
        </div>
      </div>

      {/* Parent */}
      <div>
        <label className="block text-[10px] font-medium text-mc-muted mb-1">親の進捗 (空=ルート)</label>
        <input className="w-full max-w-md bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs font-mono focus:border-mc-info focus:outline-none"
          value={adv.parent || ''}
          onChange={e => {
            const newAdv = { ...adv };
            if (e.target.value) newAdv.parent = e.target.value; else delete newAdv.parent;
            setAdv(newAdv);
            onChange(JSON.stringify(newAdv, null, 2));
          }}
          placeholder={`${namespace}:path/parent_advancement`} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PREVIEW PANEL (pack.mcmeta + tree + validation)
// ════════════════════════════════════════════════════════════

function PreviewPanel({ project, files, errors }) {
  const [tab, setTab] = useState('mcmeta');

  const mcmeta = useMemo(() => generatePackMcmeta(project), [project]);
  const mcmetaStr = JSON.stringify(mcmeta, null, 2);

  const hasMcf = useMemo(() => files.some(f => f.name?.endsWith('.mcfunction')), [files]);

  const buildTreeText = (parentId, prefix) => {
    const children = getChildren(files, parentId);
    return children.map((child, i) => {
      const isLast = i === children.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      let result = prefix + connector + child.name + '\n';
      if (child.type === 'folder') {
        result += buildTreeText(child.id, childPrefix);
      }
      return result;
    }).join('');
  };

  const treeText = useMemo(() => {
    let text = `${project.name}/\n`;
    text += '├── pack.mcmeta\n';
    if (project.packIcon) text += '├── pack.png\n';
    const roots = files.filter(f => !f.parentId);
    roots.forEach((root, i) => {
      const isLast = i === roots.length - 1;
      text += (isLast ? '└── ' : '├── ') + root.name + '/\n';
      text += buildTreeText(root.id, isLast ? '    ' : '│   ');
    });
    return text;
  }, [files, project]);

  const errCount = errors.filter(e => e.type === 'error').length;
  const warnCount = errors.filter(e => e.type === 'warning').length;

  const tabs = [
    { key: 'mcmeta', label: 'pack.mcmeta' },
    { key: 'tree', label: '構造プレビュー' },
    { key: 'validation', label: `検証 ${errCount > 0 ? `(${errCount})` : ''}` },
    ...(hasMcf ? [{ key: 'simulator', label: '🧪 シミュレーション' }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-mc-border">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-white border-b-2 border-mc-info' : 'text-mc-muted hover:text-mc-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {tab === 'mcmeta' && (
          <div className="anim-fade">
            <div className="text-xs text-mc-muted mb-2">生成される pack.mcmeta:</div>
            <pre className="bg-mc-dark rounded p-3 text-sm font-mono overflow-auto editor-area"
              dangerouslySetInnerHTML={{ __html: highlightJSON(mcmetaStr) }}
            />
            <div className="mt-3 text-xs text-mc-muted space-y-1">
              <p>バージョン: Minecraft {project.targetVersion}</p>
              <p>フォーマット: {VERSION_FORMATS[project.targetVersion]?.useNewFormat ? '新形式 (min_format/max_format)' : '旧形式 (pack_format)'}</p>
            </div>
          </div>
        )}

        {tab === 'tree' && (
          <div className="anim-fade">
            <div className="text-xs text-mc-muted mb-2">ZIP内のフォルダ構造:</div>
            <pre className="bg-mc-dark rounded p-3 text-xs font-mono whitespace-pre overflow-auto text-mc-text/80">
              {treeText}
            </pre>
          </div>
        )}

        {tab === 'validation' && (
          <div className="anim-fade space-y-2">
            {errors.length === 0 ? (
              <div className="flex items-center gap-2 text-mc-success text-sm py-4">
                <CheckCircle size={16} />
                問題は検出されませんでした
              </div>
            ) : (
              <>
                <div className="text-xs text-mc-muted mb-2">
                  {errCount > 0 && <span className="text-mc-accent">{errCount}件のエラー</span>}
                  {errCount > 0 && warnCount > 0 && ' / '}
                  {warnCount > 0 && <span className="text-mc-warning">{warnCount}件の警告</span>}
                </div>
                {errors.map((err, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${
                    err.type === 'error' ? 'bg-mc-accent/10 text-mc-accent' : 'bg-mc-warning/10 text-mc-warning'
                  }`}>
                    {err.type === 'error' ? <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> : <Info size={12} className="mt-0.5 flex-shrink-0" />}
                    <span>{err.msg}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'simulator' && (
          <div className="anim-fade" style={{margin:'-12px',flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
            <SimulatorPanel project={project} files={files} />
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DATAPACK SIMULATOR - 仮実行テスト
// ════════════════════════════════════════════════════════════

class MCSimState {
  constructor() { this.reset(); }
  reset() {
    this.objectives = {};   // { name: { criteria, display } }
    this.scores = {};       // { "player:objective": value }
    this.tags = {};         // { player: Set<tag> }
    this.teams = {};        // { name: { color, display, members:Set } }
    this.bossbars = {};     // { id: { name, max, value, color, style, visible } }
    this.gamerules = {};    // { rule: value }
    this.chatLog = [];      // [{ type, text, color, time }]
    this.titleDisplay = null; // { title, subtitle, actionbar }
    this.effects = {};      // { "player:effect": { dur, amp } }
    this.tickCount = 0;
    this.executedFunctions = []; // tracking
    this.warnings = [];
    this.errors = [];
  }

  log(type, text, color) {
    this.chatLog.push({ type, text, color: color || '#ccc', time: this.tickCount });
  }
  warn(msg) { this.warnings.push({ tick: this.tickCount, msg }); }
  error(msg) { this.errors.push({ tick: this.tickCount, msg }); }

  getScore(player, obj) {
    return this.scores[`${player}:${obj}`] ?? null;
  }
  setScore(player, obj, val) {
    if (!this.objectives[obj]) { this.warn(`スコアボード "${obj}" が未作成です`); return; }
    this.scores[`${player}:${obj}`] = val;
  }
}

function simulateCommand(line, state, files, namespace, depth) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  if (depth > 50) { state.error('関数の再帰が深すぎます (50超)'); return; }

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0].toLowerCase();

  // Handle execute chains - extract the run command
  if (cmd === 'execute') {
    const runIdx = tokens.indexOf('run');
    if (runIdx >= 0 && runIdx < tokens.length - 1) {
      const runLine = tokens.slice(runIdx + 1).join(' ');
      simulateCommand(runLine, state, files, namespace, depth);
    } else {
      state.warn(`execute に run が見つかりません: ${trimmed.substring(0, 60)}...`);
    }
    return;
  }

  // scoreboard objectives add <name> <criteria> [display]
  if (cmd === 'scoreboard') {
    const sub1 = tokens[1]?.toLowerCase();
    const sub2 = tokens[2]?.toLowerCase();
    if (sub1 === 'objectives') {
      if (sub2 === 'add' && tokens[3]) {
        state.objectives[tokens[3]] = { criteria: tokens[4] || 'dummy', display: tokens.slice(5).join(' ') || tokens[3] };
        state.log('system', `スコアボード "${tokens[3]}" を作成 (${tokens[4] || 'dummy'})`, '#4fc3f7');
      } else if (sub2 === 'remove' && tokens[3]) {
        delete state.objectives[tokens[3]];
        // Remove all scores for this objective
        Object.keys(state.scores).forEach(k => { if (k.endsWith(':' + tokens[3])) delete state.scores[k]; });
        state.log('system', `スコアボード "${tokens[3]}" を削除`, '#ff9800');
      } else if (sub2 === 'setdisplay' && tokens[3]) {
        state.log('system', `スコアボード表示: ${tokens[3]} = ${tokens[4] || '(なし)'}`, '#888');
      }
    } else if (sub1 === 'players') {
      const target = tokens[3] || '@s';
      const obj = tokens[4];
      if (!obj) return;
      const val = parseInt(tokens[5]) || 0;
      const players = resolveSelector(target);
      players.forEach(p => {
        if (sub2 === 'set') { state.setScore(p, obj, val); state.log('score', `${p} の ${obj} = ${val}`, '#b5cea8'); }
        else if (sub2 === 'add') { const cur = state.getScore(p, obj) || 0; state.setScore(p, obj, cur + val); state.log('score', `${p} の ${obj} += ${val} → ${cur + val}`, '#b5cea8'); }
        else if (sub2 === 'remove') { const cur = state.getScore(p, obj) || 0; state.setScore(p, obj, cur - val); state.log('score', `${p} の ${obj} -= ${val} → ${cur - val}`, '#b5cea8'); }
        else if (sub2 === 'reset') { delete state.scores[`${p}:${obj}`]; state.log('score', `${p} の ${obj} をリセット`, '#ff9800'); }
        else if (sub2 === 'operation' && tokens[6] && tokens[7]) {
          const op = tokens[5]; const srcPlayer = resolveSelector(tokens[6])[0]; const srcObj = tokens[7];
          const a = state.getScore(p, obj) || 0; const b = state.getScore(srcPlayer, srcObj) || 0;
          let result = a;
          if (op === '+=') result = a + b;
          else if (op === '-=') result = a - b;
          else if (op === '*=') result = a * b;
          else if (op === '/=') result = b !== 0 ? Math.trunc(a / b) : 0;
          else if (op === '%=') result = b !== 0 ? a % b : 0;
          else if (op === '=') result = b;
          else if (op === '<') result = Math.min(a, b);
          else if (op === '>') result = Math.max(a, b);
          else if (op === '><') { state.setScore(p, obj, b); state.setScore(srcPlayer, srcObj, a); return; }
          state.setScore(p, obj, result);
          state.log('score', `${p}.${obj} ${op} ${srcPlayer}.${srcObj} → ${result}`, '#b5cea8');
        }
      });
    }
    return;
  }

  // tag <target> add/remove <tag>
  if (cmd === 'tag') {
    const target = tokens[1] || '@s';
    const action = tokens[2]?.toLowerCase();
    const tagName = tokens[3];
    if (!tagName) return;
    const players = resolveSelector(target);
    players.forEach(p => {
      if (!state.tags[p]) state.tags[p] = new Set();
      if (action === 'add') { state.tags[p].add(tagName); state.log('tag', `${p} にタグ "${tagName}" を追加`, '#ce93d8'); }
      else if (action === 'remove') { state.tags[p].delete(tagName); state.log('tag', `${p} からタグ "${tagName}" を削除`, '#ff9800'); }
    });
    return;
  }

  // team add/remove/join/modify
  if (cmd === 'team') {
    const sub = tokens[1]?.toLowerCase();
    if (sub === 'add' && tokens[2]) {
      state.teams[tokens[2]] = { color: 'white', display: tokens.slice(3).join(' ') || tokens[2], members: new Set() };
      state.log('team', `チーム "${tokens[2]}" を作成`, '#4fc3f7');
    } else if (sub === 'remove' && tokens[2]) {
      delete state.teams[tokens[2]];
      state.log('team', `チーム "${tokens[2]}" を削除`, '#ff9800');
    } else if (sub === 'join' && tokens[2]) {
      const team = tokens[2];
      const members = tokens[3] ? resolveSelector(tokens[3]) : ['@s'];
      if (state.teams[team]) { members.forEach(m => state.teams[team].members.add(m)); }
      state.log('team', `${members.join(',')} がチーム "${team}" に参加`, '#66bb6a');
    } else if (sub === 'modify' && tokens[2] && tokens[3]) {
      if (state.teams[tokens[2]]) {
        if (tokens[3] === 'color') state.teams[tokens[2]].color = tokens[4] || 'white';
      }
    }
    return;
  }

  // bossbar
  if (cmd === 'bossbar') {
    const sub = tokens[1]?.toLowerCase();
    if (sub === 'add' && tokens[2]) {
      state.bossbars[tokens[2]] = { name: tokens.slice(3).join(' ') || tokens[2], max: 100, value: 0, color: 'white', visible: true };
      state.log('bossbar', `ボスバー "${tokens[2]}" を作成`, '#e91e63');
    } else if (sub === 'set' && tokens[2]) {
      const id = tokens[2]; const prop = tokens[3]?.toLowerCase(); const val = tokens.slice(4).join(' ');
      if (state.bossbars[id]) {
        if (prop === 'value') state.bossbars[id].value = parseInt(val) || 0;
        else if (prop === 'max') state.bossbars[id].max = parseInt(val) || 100;
        else if (prop === 'color') state.bossbars[id].color = val;
        else if (prop === 'name') state.bossbars[id].name = val;
        else if (prop === 'visible') state.bossbars[id].visible = val === 'true';
      }
    } else if (sub === 'remove' && tokens[2]) {
      delete state.bossbars[tokens[2]];
    }
    return;
  }

  // gamerule
  if (cmd === 'gamerule' && tokens[1]) {
    state.gamerules[tokens[1]] = tokens[2] || 'true';
    state.log('gamerule', `ゲームルール ${tokens[1]} = ${tokens[2] || 'true'}`, '#888');
    return;
  }

  // say
  if (cmd === 'say') {
    state.log('chat', `[Server] ${tokens.slice(1).join(' ')}`, '#ccc');
    return;
  }

  // tellraw
  if (cmd === 'tellraw') {
    const jsonStr = tokens.slice(2).join(' ');
    try {
      const parsed = JSON.parse(jsonStr);
      const extract = (obj) => {
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) return obj.map(extract).join('');
        return (obj.text || '') + (obj.extra ? obj.extra.map(extract).join('') : '');
      };
      const text = extract(parsed);
      const color = (typeof parsed === 'object' && parsed.color) ? (MC_COLOR_HEX[parsed.color] || '#ccc') : '#ccc';
      state.log('tellraw', text, color);
    } catch { state.log('tellraw', jsonStr, '#ccc'); }
    return;
  }

  // title
  if (cmd === 'title') {
    const pos = tokens[2]?.toLowerCase(); // title, subtitle, actionbar
    const jsonStr = tokens.slice(3).join(' ');
    let text = jsonStr;
    try { const p = JSON.parse(jsonStr); text = typeof p === 'string' ? p : (p.text || jsonStr); } catch {}
    if (!state.titleDisplay) state.titleDisplay = {};
    if (pos === 'title') { state.titleDisplay.title = text; state.log('title', `タイトル表示: ${text}`, '#fdd835'); }
    else if (pos === 'subtitle') { state.titleDisplay.subtitle = text; state.log('title', `サブタイトル: ${text}`, '#ddd'); }
    else if (pos === 'actionbar') { state.titleDisplay.actionbar = text; state.log('title', `アクションバー: ${text}`, '#aaa'); }
    else if (pos === 'clear') state.titleDisplay = null;
    return;
  }

  // effect give/clear
  if (cmd === 'effect') {
    const sub = tokens[1]?.toLowerCase();
    if (sub === 'give' && tokens[2] && tokens[3]) {
      const targets = resolveSelector(tokens[2]);
      const effect = tokens[3].replace(/^minecraft:/, '');
      const dur = parseInt(tokens[4]) || 30;
      const amp = parseInt(tokens[5]) || 0;
      targets.forEach(p => { state.effects[`${p}:${effect}`] = { dur, amp }; });
      state.log('effect', `${targets.join(',')} に ${effect} Lv${amp + 1} (${dur}秒)`, '#ce93d8');
    } else if (sub === 'clear' && tokens[2]) {
      const targets = resolveSelector(tokens[2]);
      targets.forEach(p => {
        if (tokens[3]) { delete state.effects[`${p}:${tokens[3].replace(/^minecraft:/, '')}`]; }
        else { Object.keys(state.effects).forEach(k => { if (k.startsWith(p + ':')) delete state.effects[k]; }); }
      });
      state.log('effect', `エフェクトクリア: ${targets.join(',')}`, '#ff9800');
    }
    return;
  }

  // function namespace:path
  if (cmd === 'function') {
    const funcPath = tokens[1];
    if (!funcPath) return;
    state.executedFunctions.push(funcPath);
    // Find the file in the project
    const [ns, ...pathParts] = funcPath.split(':');
    const relPath = pathParts.join(':');
    const fileName = relPath + '.mcfunction';
    // Search for matching file
    const targetFile = files.find(f => {
      if (f.type === 'folder') return false;
      const fullPath = getFilePath(f, files);
      return fullPath === `data/${ns}/function/${fileName}`;
    });
    if (targetFile) {
      state.log('function', `→ function ${funcPath}`, '#569cd6');
      const lines = (targetFile.content || '').split('\n');
      lines.forEach(l => simulateCommand(l, state, files, namespace, depth + 1));
      state.log('function', `← function ${funcPath} 完了`, '#569cd6');
    } else {
      state.warn(`関数 "${funcPath}" のファイルが見つかりません`);
      state.log('function', `? function ${funcPath} (見つかりません)`, '#f44336');
    }
    return;
  }

  // give, summon, tp, kill, setblock, fill - just log
  if (cmd === 'give') { state.log('cmd', `アイテム付与: ${tokens.slice(1).join(' ')}`, '#4caf50'); return; }
  if (cmd === 'summon') { state.log('cmd', `エンティティ召喚: ${tokens[1] || '?'} (${tokens[2] || '~'} ${tokens[3] || '~'} ${tokens[4] || '~'})`, '#ff9800'); return; }
  if (cmd === 'tp' || cmd === 'teleport') { state.log('cmd', `テレポート: ${tokens.slice(1).join(' ')}`, '#4fc3f7'); return; }
  if (cmd === 'kill') { state.log('cmd', `キル: ${tokens[1] || '@s'}`, '#f44336'); return; }
  if (cmd === 'setblock') { state.log('cmd', `ブロック設置: ${tokens[4] || '?'} at ${tokens[1] || '~'} ${tokens[2] || '~'} ${tokens[3] || '~'}`, '#888'); return; }
  if (cmd === 'fill') { state.log('cmd', `ブロック充填: ${tokens.slice(1,7).join(' ')} → ${tokens[7] || '?'}`, '#888'); return; }
  if (cmd === 'playsound') { state.log('cmd', `サウンド: ${tokens[1] || '?'}`, '#ab47bc'); return; }
  if (cmd === 'particle') { state.log('cmd', `パーティクル: ${tokens[1] || '?'}`, '#ab47bc'); return; }
  if (cmd === 'gamemode') { state.log('cmd', `ゲームモード変更: ${tokens[2] || tokens[1] || '?'} → ${tokens[1] || '?'}`, '#888'); return; }
  if (cmd === 'spawnpoint') { state.log('cmd', `スポーン設定: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'difficulty') { state.log('cmd', `難易度: ${tokens[1] || '?'}`, '#888'); return; }
  if (cmd === 'weather') { state.log('cmd', `天候: ${tokens[1] || '?'}`, '#888'); return; }
  if (cmd === 'time') { state.log('cmd', `時刻: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'experience' || cmd === 'xp') { state.log('cmd', `経験値: ${tokens.slice(1).join(' ')}`, '#b5cea8'); return; }
  if (cmd === 'enchant') { state.log('cmd', `エンチャント: ${tokens.slice(1).join(' ')}`, '#ce93d8'); return; }
  if (cmd === 'clear') { state.log('cmd', `アイテムクリア: ${tokens.slice(1).join(' ')}`, '#ff9800'); return; }
  if (cmd === 'advancement') { state.log('cmd', `進捗操作: ${tokens.slice(1).join(' ')}`, '#fdd835'); return; }
  if (cmd === 'schedule') { state.log('cmd', `スケジュール: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'reload') { state.log('system', '/reload が実行されます', '#888'); return; }
  if (cmd === 'data') { state.log('cmd', `NBTデータ: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'worldborder') { state.log('cmd', `ワールドボーダー: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'forceload') { state.log('cmd', `チャンク: ${tokens.slice(1).join(' ')}`, '#888'); return; }
  if (cmd === 'spreadplayers') { state.log('cmd', `散布: ${tokens.slice(1).join(' ')}`, '#888'); return; }

  // Fallback
  state.log('cmd', `${trimmed.substring(0, 80)}`, '#999');
}

function resolveSelector(sel) {
  if (!sel.startsWith('@')) return [sel]; // literal player name
  const base = sel.substring(0, 2);
  if (base === '@s') return ['自分'];
  if (base === '@p') return ['最寄りのプレイヤー'];
  if (base === '@r') return ['ランダムプレイヤー'];
  if (base === '@a') return ['Player1', 'Player2', 'Player3'];
  if (base === '@e') return ['Entity1', 'Entity2'];
  if (base === '@n') return ['最近のエンティティ'];
  return [sel];
}

function getFilePath(file, files) {
  const parts = [file.name];
  let cur = file;
  while (cur.parentId) {
    const parent = files.find(f => f.id === cur.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    cur = parent;
  }
  return parts.join('/');
}

function SimulatorPanel({ project, files }) {
  const [simState, setSimState] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState('__load__');
  const [tickCount, setTickCount] = useState(0);
  const [viewTab, setViewTab] = useState('log');
  const logRef = useRef(null);

  // Find all mcfunction files
  const mcfFiles = useMemo(() => {
    return files.filter(f => f.name?.endsWith('.mcfunction')).map(f => ({
      file: f,
      path: getFilePath(f, files),
      funcId: (() => {
        const fp = getFilePath(f, files);
        // data/namespace/function/path.mcfunction -> namespace:path
        const m = fp.match(/^data\/([^/]+)\/function\/(.+)\.mcfunction$/);
        return m ? `${m[1]}:${m[2]}` : f.name;
      })(),
    }));
  }, [files]);

  // Find tick and load functions from tags
  const { loadFuncs, tickFuncs } = useMemo(() => {
    const load = []; const tick = [];
    files.forEach(f => {
      const fp = getFilePath(f, files);
      if (fp.endsWith('tags/function/load.json') || fp.endsWith('tags/functions/load.json')) {
        try { const parsed = JSON.parse(f.content || '{}'); (parsed.values || []).forEach(v => load.push(v)); } catch {}
      }
      if (fp.endsWith('tags/function/tick.json') || fp.endsWith('tags/functions/tick.json')) {
        try { const parsed = JSON.parse(f.content || '{}'); (parsed.values || []).forEach(v => tick.push(v)); } catch {}
      }
    });
    return { loadFuncs: load, tickFuncs: tick };
  }, [files]);

  const runSimulation = useCallback(() => {
    const state = new MCSimState();
    setSimRunning(true);

    if (selectedFunc === '__load__') {
      // Run load functions
      state.log('system', '=== /reload 実行 (load関数) ===', '#4fc3f7');
      if (loadFuncs.length === 0) {
        state.warn('load.json が見つかりません。tags/function/load.json を作成してください。');
      }
      loadFuncs.forEach(funcId => {
        simulateCommand(`function ${funcId}`, state, files, project.namespace, 0);
      });
    } else if (selectedFunc === '__tick__') {
      // Run load first, then tick N times
      state.log('system', '=== /reload + tick シミュレーション ===', '#4fc3f7');
      loadFuncs.forEach(funcId => {
        simulateCommand(`function ${funcId}`, state, files, project.namespace, 0);
      });
      const ticks = tickCount || 1;
      for (let t = 0; t < ticks; t++) {
        state.tickCount = t + 1;
        state.log('system', `--- tick ${t + 1} ---`, '#555');
        tickFuncs.forEach(funcId => {
          simulateCommand(`function ${funcId}`, state, files, project.namespace, 0);
        });
      }
    } else {
      // Run specific function
      state.log('system', `=== function ${selectedFunc} を実行 ===`, '#4fc3f7');
      simulateCommand(`function ${selectedFunc}`, state, files, project.namespace, 0);
    }

    state.log('system', `=== 実行完了 (${state.chatLog.length}ステップ) ===`, '#4caf50');
    setSimState(state);
    setSimRunning(false);
    requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; });
  }, [selectedFunc, tickCount, files, project, loadFuncs, tickFuncs]);

  const logTypeIcons = { system: '⚙️', chat: '💬', tellraw: '📝', title: '📺', score: '📊', tag: '🏷️', team: '👥', bossbar: '📏', gamerule: '🎮', effect: '✨', function: '📂', cmd: '▶️' };
  const viewTabs = [
    { key:'log', label:'実行ログ', icon:'📋' },
    { key:'scores', label:'スコアボード', icon:'📊' },
    { key:'tags', label:'タグ/チーム', icon:'🏷️' },
    { key:'bossbars', label:'ボスバー', icon:'📏' },
    { key:'summary', label:'サマリー', icon:'📝' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#111122'}}>
      {/* Control bar */}
      <div style={{padding:'8px 12px',borderBottom:'1px solid #2a2a4a',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontSize:14}}>🧪</span>
        <select value={selectedFunc} onChange={e => setSelectedFunc(e.target.value)}
          style={{flex:1,padding:'4px 8px',fontSize:11,borderRadius:4,border:'1px solid #3a3a5a',background:'#1a1a2e',color:'#ddd',maxWidth:280}}>
          <option value="__load__">📦 /reload (load関数を実行)</option>
          <option value="__tick__">⏱️ /reload + tick ({tickCount || 1}回)</option>
          <optgroup label="個別の関数">
            {mcfFiles.map(f => (
              <option key={f.funcId} value={f.funcId}>📄 {f.funcId}</option>
            ))}
          </optgroup>
        </select>
        {selectedFunc === '__tick__' && (
          <input type="number" value={tickCount || 1} onChange={e => setTickCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
            style={{width:50,padding:'4px 6px',fontSize:11,borderRadius:4,border:'1px solid #3a3a5a',background:'#1a1a2e',color:'#ddd',textAlign:'center'}}
            title="tickの回数" min={1} max={200} />
        )}
        <button onClick={runSimulation} disabled={simRunning}
          style={{padding:'5px 14px',fontSize:11,fontWeight:700,borderRadius:4,border:'none',
            background: simRunning ? '#333' : '#4caf50',color: simRunning ? '#666' : '#fff',cursor: simRunning ? 'default' : 'pointer'}}>
          ▶ 実行
        </button>
        {simState && (
          <button onClick={() => setSimState(null)}
            style={{padding:'5px 10px',fontSize:10,borderRadius:4,border:'1px solid #3a3a5a',background:'#1a1a2e',color:'#aaa',cursor:'pointer'}}>
            クリア
          </button>
        )}
      </div>

      {!simState ? (
        // Initial state - show instructions
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{textAlign:'center',maxWidth:400}}>
            <div style={{fontSize:40,marginBottom:12}}>🧪</div>
            <h3 style={{fontSize:14,fontWeight:700,color:'#ddd',marginBottom:8}}>データパック シミュレーター</h3>
            <p style={{fontSize:11,color:'#999',lineHeight:1.6,marginBottom:16}}>
              実際のサーバーに入れずに、コマンドの動作をテストできます。<br/>
              スコアボード操作・タグ管理・チーム設定・ボスバーなどの<br/>
              状態変化を追跡し、結果を表示します。
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,textAlign:'left'}}>
              <div style={{padding:8,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#4caf50',marginBottom:4}}>✅ シミュレート可能</div>
                <div style={{fontSize:10,color:'#999',lineHeight:1.5}}>scoreboard操作、tag操作、team管理、bossbar、gamerule、say/tellraw/title、effect、function呼び出しチェーン</div>
              </div>
              <div style={{padding:8,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#ff9800',marginBottom:4}}>⚠️ ログのみ</div>
                <div style={{fontSize:10,color:'#999',lineHeight:1.5}}>give/summon/tp/kill/setblock/fill 等（ワールドに影響するコマンドは実行結果をログ表示）</div>
              </div>
            </div>
            <div style={{marginTop:16,padding:8,borderRadius:6,background:'#0a2a0a',border:'1px solid #4caf5040'}}>
              <div style={{fontSize:10,color:'#a5d6a7'}}>💡 上部のプルダウンから関数を選んで「▶ 実行」をクリック</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Result view tabs */}
          <div style={{display:'flex',gap:0,borderBottom:'1px solid #2a2a4a',flexShrink:0}}>
            {viewTabs.map(t => (
              <button key={t.key} onClick={() => setViewTab(t.key)}
                style={{padding:'6px 12px',fontSize:10,fontWeight:600,border:'none',borderBottom: viewTab === t.key ? '2px solid #4fc3f7' : '2px solid transparent',
                  background:'transparent',color: viewTab === t.key ? '#fff' : '#888',cursor:'pointer'}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div ref={logRef} style={{flex:1,overflowY:'auto',padding:8}}>
            {viewTab === 'log' && (
              <div style={{fontFamily:'monospace',fontSize:11}}>
                {simState.chatLog.map((entry, i) => (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,padding:'2px 4px',borderRadius:3,
                    background: i % 2 === 0 ? 'transparent' : '#ffffff05'}}>
                    <span style={{fontSize:11,flexShrink:0,width:16,textAlign:'center'}}>{logTypeIcons[entry.type] || '▶️'}</span>
                    {entry.time > 0 && <span style={{fontSize:9,color:'#555',flexShrink:0,width:24,textAlign:'right'}}>t{entry.time}</span>}
                    <span style={{color: entry.color,wordBreak:'break-all'}}>{entry.text}</span>
                  </div>
                ))}
                {simState.warnings.length > 0 && (
                  <div style={{marginTop:8,padding:8,borderRadius:4,background:'#3a2a0a',border:'1px solid #ff980040'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#ff9800',marginBottom:4}}>⚠️ 警告 ({simState.warnings.length}件)</div>
                    {simState.warnings.map((w, i) => (
                      <div key={i} style={{fontSize:10,color:'#ffcc80',marginBottom:2}}>• {w.msg}</div>
                    ))}
                  </div>
                )}
                {simState.errors.length > 0 && (
                  <div style={{marginTop:8,padding:8,borderRadius:4,background:'#3a0a0a',border:'1px solid #f4474740'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#f44747',marginBottom:4}}>❌ エラー ({simState.errors.length}件)</div>
                    {simState.errors.map((e, i) => (
                      <div key={i} style={{fontSize:10,color:'#ef9a9a',marginBottom:2}}>• {e.msg}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {viewTab === 'scores' && (
              <div>
                {Object.keys(simState.objectives).length === 0 ? (
                  <div style={{textAlign:'center',padding:24,color:'#666',fontSize:11}}>スコアボードが作成されていません</div>
                ) : (
                  Object.entries(simState.objectives).map(([name, obj]) => (
                    <div key={name} style={{marginBottom:12,borderRadius:6,border:'1px solid #2a2a4a',overflow:'hidden'}}>
                      <div style={{padding:'6px 10px',background:'#1a1a2e',borderBottom:'1px solid #2a2a4a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:11,fontWeight:700,color:'#4fc3f7'}}>{obj.display || name}</span>
                        <span style={{fontSize:9,color:'#666'}}>{obj.criteria}</span>
                      </div>
                      <div style={{padding:4}}>
                        {Object.entries(simState.scores)
                          .filter(([k]) => k.endsWith(':' + name))
                          .map(([k, v]) => {
                            const player = k.split(':')[0];
                            return (
                              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 10px',fontSize:11}}>
                                <span style={{color:'#ddd'}}>{player}</span>
                                <span style={{color:'#b5cea8',fontWeight:700,fontFamily:'monospace'}}>{v}</span>
                              </div>
                            );
                          })}
                        {Object.entries(simState.scores).filter(([k]) => k.endsWith(':' + name)).length === 0 && (
                          <div style={{padding:'4px 10px',fontSize:10,color:'#555'}}>スコアなし</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {viewTab === 'tags' && (
              <div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#ce93d8',marginBottom:6}}>🏷️ タグ</div>
                  {Object.keys(simState.tags).length === 0 ? (
                    <div style={{fontSize:10,color:'#555'}}>タグなし</div>
                  ) : (
                    Object.entries(simState.tags).map(([player, tags]) => (
                      <div key={player} style={{marginBottom:6,padding:6,borderRadius:4,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                        <div style={{fontSize:10,color:'#ddd',marginBottom:3}}>{player}</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                          {[...tags].map(t => (
                            <span key={t} style={{padding:'2px 8px',borderRadius:10,background:'#ce93d820',border:'1px solid #ce93d840',fontSize:9,color:'#ce93d8'}}>{t}</span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'#4fc3f7',marginBottom:6}}>👥 チーム</div>
                  {Object.keys(simState.teams).length === 0 ? (
                    <div style={{fontSize:10,color:'#555'}}>チームなし</div>
                  ) : (
                    Object.entries(simState.teams).map(([name, team]) => (
                      <div key={name} style={{marginBottom:6,padding:6,borderRadius:4,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                        <div style={{fontSize:10,fontWeight:600,color: MC_COLOR_HEX[team.color] || '#ddd'}}>{team.display || name}</div>
                        <div style={{fontSize:9,color:'#888',marginTop:2}}>
                          メンバー: {team.members.size > 0 ? [...team.members].join(', ') : 'なし'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {viewTab === 'bossbars' && (
              <div>
                {Object.keys(simState.bossbars).length === 0 ? (
                  <div style={{textAlign:'center',padding:24,color:'#666',fontSize:11}}>ボスバーがありません</div>
                ) : (
                  Object.entries(simState.bossbars).map(([id, bb]) => (
                    <div key={id} style={{marginBottom:12,padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#ddd',marginBottom:6,textAlign:'center'}}>{bb.name}</div>
                      <div style={{height:16,borderRadius:3,background:'#0a0a0a',overflow:'hidden',position:'relative'}}>
                        <div style={{height:'100%',width:`${bb.max > 0 ? (bb.value / bb.max * 100) : 0}%`,borderRadius:3,
                          background: bb.color === 'red' ? '#e91e63' : bb.color === 'green' ? '#4caf50' : bb.color === 'blue' ? '#2196f3' :
                            bb.color === 'yellow' ? '#fdd835' : bb.color === 'pink' ? '#ff80ab' : bb.color === 'purple' ? '#ce93d8' : '#4fc3f7',
                          transition:'width 0.3s'}} />
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',textShadow:'0 1px 2px #000'}}>
                          {bb.value} / {bb.max}
                        </div>
                      </div>
                      <div style={{fontSize:9,color:'#666',marginTop:4,display:'flex',justifyContent:'space-between'}}>
                        <span>ID: {id}</span>
                        <span>{bb.visible ? '表示中' : '非表示'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {viewTab === 'summary' && (
              <div style={{fontSize:11}}>
                <div style={{padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a',marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#ddd',marginBottom:8}}>📝 実行サマリー</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    <div style={{padding:6,borderRadius:4,background:'#0a0a1a'}}>
                      <div style={{fontSize:9,color:'#888'}}>実行コマンド数</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#4fc3f7'}}>{simState.chatLog.length}</div>
                    </div>
                    <div style={{padding:6,borderRadius:4,background:'#0a0a1a'}}>
                      <div style={{fontSize:9,color:'#888'}}>関数呼び出し</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#569cd6'}}>{simState.executedFunctions.length}</div>
                    </div>
                    <div style={{padding:6,borderRadius:4,background:'#0a0a1a'}}>
                      <div style={{fontSize:9,color:'#888'}}>スコアボード</div>
                      <div style={{fontSize:16,fontWeight:700,color:'#b5cea8'}}>{Object.keys(simState.objectives).length}</div>
                    </div>
                    <div style={{padding:6,borderRadius:4,background:'#0a0a1a'}}>
                      <div style={{fontSize:9,color:'#888'}}>警告/エラー</div>
                      <div style={{fontSize:16,fontWeight:700,color: (simState.errors.length > 0) ? '#f44747' : '#ff9800'}}>{simState.warnings.length + simState.errors.length}</div>
                    </div>
                  </div>
                </div>
                {simState.executedFunctions.length > 0 && (
                  <div style={{padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a',marginBottom:8}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#569cd6',marginBottom:6}}>📂 呼び出された関数</div>
                    {[...new Set(simState.executedFunctions)].map((f, i) => (
                      <div key={i} style={{fontSize:10,color:'#ddd',padding:'2px 0',fontFamily:'monospace'}}>{f}</div>
                    ))}
                  </div>
                )}
                {Object.keys(simState.gamerules).length > 0 && (
                  <div style={{padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a',marginBottom:8}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#888',marginBottom:6}}>🎮 ゲームルール変更</div>
                    {Object.entries(simState.gamerules).map(([k, v]) => (
                      <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'2px 0'}}>
                        <span style={{color:'#ddd'}}>{k}</span>
                        <span style={{color:'#b5cea8',fontFamily:'monospace'}}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(simState.effects).length > 0 && (
                  <div style={{padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #2a2a4a'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#ce93d8',marginBottom:6}}>✨ アクティブエフェクト</div>
                    {Object.entries(simState.effects).map(([k, v]) => (
                      <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'2px 0'}}>
                        <span style={{color:'#ddd'}}>{k}</span>
                        <span style={{color:'#ce93d8',fontFamily:'monospace'}}>Lv{v.amp + 1} ({v.dur}s)</span>
                      </div>
                    ))}
                  </div>
                )}
                {simState.titleDisplay && (
                  <div style={{padding:10,borderRadius:6,background:'#1a1a2e',border:'1px solid #fdd83540',marginTop:8,textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#888',marginBottom:6}}>📺 タイトル表示</div>
                    {simState.titleDisplay.title && <div style={{fontSize:18,fontWeight:800,color:'#fdd835'}}>{simState.titleDisplay.title}</div>}
                    {simState.titleDisplay.subtitle && <div style={{fontSize:12,color:'#ddd',marginTop:2}}>{simState.titleDisplay.subtitle}</div>}
                    {simState.titleDisplay.actionbar && <div style={{fontSize:10,color:'#aaa',marginTop:4}}>{simState.titleDisplay.actionbar}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SETTINGS PANEL
// ════════════════════════════════════════════════════════════

function SettingsPanel({ project, setProject, onClose, guideMode, setGuideMode }) {
  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProject(prev => ({ ...prev, packIcon: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-md mx-4 anim-scale">
        <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Settings size={14} /> プロジェクト設定</h3>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-mc-muted mb-1">パック名</label>
            <input
              className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
              value={project.name}
              onChange={e => setProject(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mc-muted mb-1">説明文</label>
            <textarea
              className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none resize-none"
              rows={2}
              value={project.description}
              onChange={e => setProject(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mc-muted mb-1">ターゲットバージョン</label>
            <select
              className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
              value={project.targetVersion}
              onChange={e => setProject(p => ({ ...p, targetVersion: e.target.value }))}
            >
              {VERSION_LIST.map(v => <option key={v} value={v}>{formatVersionLabel(v)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-mc-muted mb-1">名前空間</label>
            <input
              className={`w-full bg-mc-dark border rounded px-3 py-2 text-sm focus:outline-none ${
                isValidNamespace(project.namespace) ? 'border-mc-border focus:border-mc-info' : 'border-mc-accent'
              }`}
              value={project.namespace}
              onChange={e => setProject(p => ({ ...p, namespace: e.target.value.toLowerCase() }))}
            />
            {!isValidNamespace(project.namespace) && (
              <p className="text-mc-accent text-xs mt-1">a-z, 0-9, _, - のみ</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-mc-muted mb-1">pack.png（任意）</label>
            <div className="flex items-center gap-3">
              {project.packIcon ? (
                <div className="relative">
                  <img src={project.packIcon} className="w-16 h-16 rounded border border-mc-border" alt="icon" />
                  <button
                    onClick={() => setProject(p => ({ ...p, packIcon: null }))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-mc-accent rounded-full flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <label className="w-16 h-16 rounded border border-dashed border-mc-border flex items-center justify-center cursor-pointer hover:border-mc-info transition-colors">
                  <Image size={20} className="text-mc-muted" />
                  <input type="file" accept="image/png" className="hidden" onChange={handleIconUpload} />
                </label>
              )}
              <span className="text-xs text-mc-muted">64x64 PNG推奨</span>
            </div>
          </div>
          {/* Guide Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-medium text-mc-muted mb-0.5">コマンドガイド</label>
              <span className="text-[10px] text-mc-muted/70">コマンド入力時にガイド・プレビュー・NBT補完を表示</span>
            </div>
            <button
              onClick={() => setGuideMode && setGuideMode(p => !p)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                guideMode ? 'bg-mc-info text-white' : 'bg-mc-dark border border-mc-border text-mc-muted'
              }`}
            >
              {guideMode ? '📖 ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full py-2 text-sm font-medium rounded bg-mc-info hover:bg-mc-info/80 transition-colors">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MINIGAME WIZARD
// ════════════════════════════════════════════════════════════

function MinigameWizard({ namespace, onComplete, onClose, targetVersion }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState('tag_game');
  const [settings, setSettings] = useState({ gameTime: 300, teamA: '鬼', teamB: '逃走者', colorA: 'red', colorB: 'blue', targetKills: 10, fallY: 50, targetItem: 'minecraft:diamond', playerTag: '' });

  const gameType = MINIGAME_TYPES.find(t => t.id === selectedType);

  const handleComplete = () => {
    const mergedSettings = { ...gameType.defaults, ...settings };
    onComplete(selectedType, mergedSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-2xl mx-4 anim-scale overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Gamepad2 size={16} /> ミニゲーム作成ウィザード</h3>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text"><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-mc-border">
          {['ゲーム選択', '設定', '確認'].map((s, i) => (
            <div key={i} className={`flex-1 px-4 py-2 text-center text-xs font-medium transition-colors ${
              i === step ? 'bg-mc-info text-white' : i < step ? 'bg-mc-success/20 text-mc-success' : 'text-mc-muted'
            }`}>
              <div className="text-[10px] opacity-60">STEP {i + 1}</div>{s}
            </div>
          ))}
        </div>

        <div className="p-5" style={{ minHeight: '340px' }}>
          {/* Step 0: Game type selection */}
          {step === 0 && (
            <div className="space-y-2 anim-fade">
              <p className="text-xs text-mc-muted mb-3">作りたいミニゲームのタイプを選んでください</p>
              {MINIGAME_TYPES.map(gt => (
                <button key={gt.id}
                  onClick={() => { setSelectedType(gt.id); setSettings(s => ({ ...s, ...gt.defaults })); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                    selectedType === gt.id ? 'border-mc-info bg-mc-info/10 scale-[1.01]' : 'border-mc-border/50 hover:border-mc-border bg-mc-dark/20'
                  }`}
                >
                  <McInvSlot id={GALLERY_MINIGAME_ICONS[gt.id]} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${gt.color}`}>{gt.name}</div>
                    <div className="text-xs text-mc-muted mt-0.5 leading-relaxed">{gt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Settings */}
          {step === 1 && gameType && (
            <div className="space-y-4 anim-fade">
              <div className="flex items-center gap-2 mb-3">
                <McIcon id={GALLERY_MINIGAME_ICONS[gameType.id]} size={24} />
                <span className="text-sm font-semibold">{gameType.name} の設定</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">制限時間（秒）</label>
                <input type="number" min={30} max={3600}
                  className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                  value={settings.gameTime}
                  onChange={e => setSettings(s => ({ ...s, gameTime: parseInt(e.target.value) || 300 }))}
                />
                <p className="text-[10px] text-mc-muted mt-1">{settings.gameTime}秒 = {Math.floor(settings.gameTime / 60)}分{settings.gameTime % 60}秒</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-mc-muted mb-1">プレイヤータグ（任意）</label>
                <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm font-mono focus:border-mc-info focus:outline-none"
                  placeholder="空欄 = @a（全プレイヤー）"
                  value={settings.playerTag}
                  onChange={e => setSettings(s => ({ ...s, playerTag: e.target.value.replace(/\s/g, '') }))} />
                <p className="text-[10px] text-mc-muted mt-1">
                  {settings.playerTag ? `セレクター: @a[tag=${settings.playerTag}]` : 'セレクター: @a（タグなし、全プレイヤー対象）'}
                </p>
              </div>

              {(selectedType === 'tag_game' || selectedType === 'pvp_arena') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームA名</label>
                      <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.teamA} onChange={e => setSettings(s => ({ ...s, teamA: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームB名</label>
                      <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.teamB} onChange={e => setSettings(s => ({ ...s, teamB: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームA色</label>
                      <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.colorA} onChange={e => setSettings(s => ({ ...s, colorA: e.target.value }))}>
                        {['red','blue','green','yellow','aqua','gold','light_purple','dark_red','dark_blue','dark_green','white'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームB色</label>
                      <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.colorB} onChange={e => setSettings(s => ({ ...s, colorB: e.target.value }))}>
                        {['red','blue','green','yellow','aqua','gold','light_purple','dark_red','dark_blue','dark_green','white'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'pvp_arena' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">目標キル数</label>
                  <input type="number" min={1} max={100}
                    className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.targetKills}
                    onChange={e => setSettings(s => ({ ...s, targetKills: parseInt(e.target.value) || 10 }))} />
                </div>
              )}

              {selectedType === 'spleef' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">落下判定Y座標</label>
                  <input type="number"
                    className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.fallY}
                    onChange={e => setSettings(s => ({ ...s, fallY: parseInt(e.target.value) || 50 }))} />
                  <p className="text-[10px] text-mc-muted mt-1">この高さ以下に落ちたプレイヤーは脱落</p>
                </div>
              )}

              {selectedType === 'treasure_hunt' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">収集アイテム</label>
                  <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm font-mono focus:border-mc-info focus:outline-none"
                    value={settings.targetItem}
                    onChange={e => setSettings(s => ({ ...s, targetItem: e.target.value }))} />
                  <p className="text-[10px] text-mc-muted mt-1">例: minecraft:diamond, minecraft:gold_ingot</p>
                </div>
              )}

              {(selectedType === 'king_of_hill' || selectedType === 'capture_flag') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームA名</label>
                      <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.teamA} onChange={e => setSettings(s => ({ ...s, teamA: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームB名</label>
                      <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.teamB} onChange={e => setSettings(s => ({ ...s, teamB: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームA色</label>
                      <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.colorA} onChange={e => setSettings(s => ({ ...s, colorA: e.target.value }))}>
                        {['red','blue','green','yellow','aqua','gold','light_purple','dark_red','dark_blue','dark_green','white'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">チームB色</label>
                      <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.colorB} onChange={e => setSettings(s => ({ ...s, colorB: e.target.value }))}>
                        {['red','blue','green','yellow','aqua','gold','light_purple','dark_red','dark_blue','dark_green','white'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'king_of_hill' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">目標占領ポイント</label>
                  <input type="number" min={10} max={1000}
                    className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.targetScore}
                    onChange={e => setSettings(s => ({ ...s, targetScore: parseInt(e.target.value) || 100 }))} />
                  <p className="text-[10px] text-mc-muted mt-1">毎秒、丘の上にいるプレイヤー1人につき1ポイント</p>
                </div>
              )}

              {selectedType === 'capture_flag' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">勝利に必要な奪取回数</label>
                  <input type="number" min={1} max={10}
                    className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.capturesNeeded}
                    onChange={e => setSettings(s => ({ ...s, capturesNeeded: parseInt(e.target.value) || 3 }))} />
                </div>
              )}

              {selectedType === 'zombie_survival' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">最大ウェーブ数</label>
                      <input type="number" min={1} max={50}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.maxWaves}
                        onChange={e => setSettings(s => ({ ...s, maxWaves: parseInt(e.target.value) || 10 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">基本ゾンビ数/Wave</label>
                      <input type="number" min={1} max={50}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.zombiesPerWave}
                        onChange={e => setSettings(s => ({ ...s, zombiesPerWave: parseInt(e.target.value) || 5 }))} />
                    </div>
                  </div>
                  <p className="text-[10px] text-mc-muted">ウェーブが進むごとにゾンビが増加します</p>
                </>
              )}

              {selectedType === 'build_battle' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">建築時間（秒）</label>
                    <input type="number" min={30} max={600}
                      className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.buildTime}
                      onChange={e => setSettings(s => ({ ...s, buildTime: parseInt(e.target.value) || 180 }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">投票時間（秒）</label>
                    <input type="number" min={10} max={300}
                      className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.voteTime}
                      onChange={e => setSettings(s => ({ ...s, voteTime: parseInt(e.target.value) || 60 }))} />
                  </div>
                </div>
              )}

              {selectedType === 'tnt_run' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">落下判定Y座標</label>
                    <input type="number"
                      className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.fallY}
                      onChange={e => setSettings(s => ({ ...s, fallY: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">フロア層数</label>
                    <input type="number" min={1} max={10}
                      className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.layerCount}
                      onChange={e => setSettings(s => ({ ...s, layerCount: parseInt(e.target.value) || 3 }))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && gameType && (
            <div className="anim-fade">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{gameType.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{gameType.name}</div>
                  <div className="text-xs text-mc-muted">名前空間: {namespace}</div>
                </div>
              </div>

              <div className="bg-mc-dark rounded p-3 space-y-2 text-xs mb-4">
                <div className="flex justify-between"><span className="text-mc-muted">制限時間</span><span>{settings.gameTime}秒（{Math.floor(settings.gameTime / 60)}分{settings.gameTime % 60}秒）</span></div>
                {(selectedType === 'tag_game' || selectedType === 'pvp_arena') && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">チームA</span><span style={{color: settings.colorA === 'gold' ? '#FFD700' : settings.colorA}}>{settings.teamA}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">チームB</span><span style={{color: settings.colorB === 'gold' ? '#FFD700' : settings.colorB}}>{settings.teamB}</span></div>
                  </>
                )}
                {selectedType === 'pvp_arena' && <div className="flex justify-between"><span className="text-mc-muted">目標キル数</span><span>{settings.targetKills}キル</span></div>}
                {selectedType === 'spleef' && <div className="flex justify-between"><span className="text-mc-muted">落下判定Y</span><span>Y={settings.fallY}</span></div>}
                {selectedType === 'treasure_hunt' && <div className="flex justify-between"><span className="text-mc-muted">収集アイテム</span><span className="font-mono">{settings.targetItem}</span></div>}
                {(selectedType === 'king_of_hill' || selectedType === 'capture_flag') && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">チームA</span><span style={{color: settings.colorA === 'gold' ? '#FFD700' : settings.colorA}}>{settings.teamA}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">チームB</span><span style={{color: settings.colorB === 'gold' ? '#FFD700' : settings.colorB}}>{settings.teamB}</span></div>
                  </>
                )}
                {selectedType === 'king_of_hill' && <div className="flex justify-between"><span className="text-mc-muted">目標スコア</span><span>{settings.targetScore}pt</span></div>}
                {selectedType === 'capture_flag' && <div className="flex justify-between"><span className="text-mc-muted">必要奪取数</span><span>{settings.capturesNeeded}回</span></div>}
                {selectedType === 'zombie_survival' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">最大ウェーブ</span><span>{settings.maxWaves}Wave</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">基本ゾンビ数</span><span>{settings.zombiesPerWave}体/Wave</span></div>
                  </>
                )}
                {selectedType === 'build_battle' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">建築時間</span><span>{settings.buildTime}秒</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">投票時間</span><span>{settings.voteTime}秒</span></div>
                  </>
                )}
                {selectedType === 'tnt_run' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">落下判定Y</span><span>Y={settings.fallY}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">フロア層数</span><span>{settings.layerCount}層</span></div>
                  </>
                )}
              </div>

              <div className="bg-mc-dark/50 rounded p-3 text-xs text-mc-muted">
                <p className="font-medium text-mc-text mb-2">生成されるファイル:</p>
                <div className="space-y-1 font-mono text-[11px]">
                  <p>data/minecraft/tags/function/load.json</p>
                  <p>data/minecraft/tags/function/tick.json</p>
                  <p>data/{namespace}/function/reload.mcfunction</p>
                  <p>data/{namespace}/function/main.mcfunction</p>
                  <p>data/{namespace}/function/start.mcfunction</p>
                  <p>data/{namespace}/function/game_loop.mcfunction</p>
                  <p>data/{namespace}/function/end.mcfunction</p>
                  <p className="text-mc-muted italic">+ ゲーム固有のファイル</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-mc-warning/10 border border-mc-warning/30 rounded text-xs text-mc-warning flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>既存のファイルがある場合は上書きされます。新しいプロジェクトで使用することを推奨します。</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center px-5 pb-5">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-4 py-2 text-sm text-mc-muted hover:text-mc-text transition-colors">
            {step === 0 ? 'キャンセル' : '戻る'}
          </button>
          <button onClick={() => { if (step < 2) setStep(s => s + 1); else handleComplete(); }}
            className="px-6 py-2 text-sm font-medium rounded bg-mc-info hover:bg-mc-info/80 transition-colors flex items-center gap-2">
            {step < 2 ? (<>次へ <ArrowRight size={14} /></>) : (<>ミニゲームを作成 <Gamepad2 size={14} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AI SETTINGS INLINE
// ════════════════════════════════════════════════════════════

function AISettingsInline({ selectedModel, setSelectedModel, apiKey, setApiKey }) {
  const [input, setInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  const model = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const provider = AI_PROVIDERS[model.provider];
  const isComingSoon = model.comingSoon;

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    localStorage.setItem(provider.storageKey, trimmed);
    setApiKey(trimmed);
    setInput('');
  };

  const handleDelete = () => {
    localStorage.removeItem(provider.storageKey);
    setApiKey('');
  };

  const handleModelChange = (e) => {
    const newModelId = e.target.value;
    setSelectedModel(newModelId);
    localStorage.setItem(AI_MODEL_KEY, newModelId);
    const newModel = AI_MODELS.find(m => m.id === newModelId) || AI_MODELS[0];
    const newProvider = AI_PROVIDERS[newModel.provider];
    setApiKey(localStorage.getItem(newProvider.storageKey) || '');
    setShowKey(false);
    setInput('');
  };

  return (
    <div className="px-3 py-2 bg-mc-titlebar border-b border-mc-border space-y-2">
      {/* API required banner */}
      {!apiKey && !isComingSoon && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded bg-mc-info/10 border border-mc-info/30 text-xs text-mc-info">
          <Key size={12} className="flex-shrink-0" />
          <span className="font-medium">AI機能を使うにはAPIキーが必須です。</span>
        </div>
      )}

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <Bot size={12} className="text-mc-info flex-shrink-0" />
        <select
          value={selectedModel}
          onChange={handleModelChange}
          className="flex-1 bg-mc-input border border-mc-border rounded px-2 py-1 text-xs text-mc-text focus:outline-none focus:border-mc-focus cursor-pointer"
        >
          {AI_MODELS.map(m => (
            <option key={m.id} value={m.id} disabled={m.comingSoon}>
              {m.label} — {m.desc}{m.comingSoon ? ' (準備中)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Coming soon notice */}
      {isComingSoon ? (
        <div className="px-3 py-3 rounded bg-mc-dark border border-mc-border/50 text-center space-y-1.5">
          <p className="text-xs font-medium text-mc-muted">{model.label}</p>
          <span className="inline-block px-2 py-0.5 rounded-full bg-mc-warning/15 border border-mc-warning/30 text-[10px] text-mc-warning font-medium">
            デスクトップ版で対応予定
          </span>
          <p className="text-[10px] text-mc-muted/60">
            OpenAI APIはブラウザからの直接呼び出し（CORS）に対応していないため、
            デスクトップアプリ版（Tauri/Electron）で対応予定です。
          </p>
          <p className="text-[10px] text-mc-muted/60">
            代わりに <span className="text-mc-info font-medium">Claude Sonnet 4.5</span> または <span className="text-mc-info font-medium">Gemini 3</span> をお試しください。
          </p>
        </div>
      ) : apiKey ? (
        <div className="flex items-center gap-2 text-xs">
          <Key size={12} className="text-mc-success flex-shrink-0" />
          <span className="text-mc-muted flex-shrink-0">{provider.name}:</span>
          <code className="text-[11px] text-mc-text truncate flex-1 font-mono">
            {showKey ? apiKey : apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4)}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="text-mc-muted hover:text-mc-text text-[10px] flex-shrink-0">
            {showKey ? '隠す' : '表示'}
          </button>
          <button onClick={handleDelete} className="text-mc-accent hover:text-red-400 flex-shrink-0" title="APIキーを削除">
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={`${provider.name} APIキーをペースト...`}
              className="flex-1 bg-mc-input border border-mc-border rounded px-2 py-1.5 text-xs text-mc-text placeholder-mc-muted/50 focus:outline-none focus:border-mc-focus"
            />
            <button onClick={handleSave} disabled={!input.trim()} className="px-3 py-1.5 text-xs font-medium rounded bg-mc-info hover:bg-mc-info/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              設定
            </button>
          </div>
          <div className="text-[10px] text-mc-muted/70 space-y-1">
            <p>
              <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-mc-info hover:underline inline-flex items-center gap-1">
                {provider.linkLabel} <ExternalLink size={9} />
              </a>
              でAPIキーを取得してください（必須）。
            </p>
            {model.provider === 'openai' && (
              <p className="flex items-start gap-1 text-mc-warning/70">
                <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
                OpenAI APIはブラウザからの直接呼び出し(CORS)に対応していない場合があります。
              </p>
            )}
            <p className="flex items-start gap-1 text-mc-warning/70">
              <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
              キーはブラウザのlocalStorageに保存されます。共有PCでの使用にご注意ください。
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AI MESSAGE BUBBLE
// ════════════════════════════════════════════════════════════

function AIMessageBubble({ message, onApply }) {
  const isUser = message.role === 'user';
  const codeBlocks = useMemo(() => isUser ? [] : parseAICodeBlocks(message.content), [message.content, isUser]);
  const hasFiles = codeBlocks.length > 0;
  const modelLabel = message.modelLabel || 'AI';

  const renderContent = (text) => {
    if (isUser) {
      return <p className="text-sm whitespace-pre-wrap">{text}</p>;
    }

    const parts = [];
    const regex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <p key={`t${idx}`} className="text-sm whitespace-pre-wrap mb-2">
            {text.slice(lastIndex, match.index)}
          </p>
        );
      }

      const lang = match[1];
      const filePath = match[2].trim();
      const code = match[3].trimEnd();

      parts.push(
        <div key={`c${idx}`} className="my-2 rounded overflow-hidden border border-mc-border">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-mc-titlebar text-[10px] text-mc-muted font-mono border-b border-mc-border">
            <FileCode size={10} className="text-mc-info" />
            <span className="truncate text-mc-text">{filePath}</span>
            <span className="ml-auto px-1.5 py-0.5 rounded bg-mc-badge/50 text-mc-muted/70 text-[9px]">{lang}</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-mc-text bg-mc-darker overflow-x-auto leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
      idx++;
    }

    if (lastIndex < text.length) {
      parts.push(
        <p key={`t${idx}`} className="text-sm whitespace-pre-wrap">
          {text.slice(lastIndex)}
        </p>
      );
    }

    return parts;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%]`}>
        <div className="flex items-center gap-1.5 mb-1">
          {!isUser && <Bot size={12} className="text-mc-info" />}
          {isUser && <span className="w-3 h-3 rounded-full bg-mc-success/60 flex-shrink-0" />}
          <span className="text-[10px] text-mc-muted font-medium">
            {isUser ? 'あなた' : modelLabel}
          </span>
        </div>
        <div className={`rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-mc-info/15 border border-mc-info/25'
            : 'bg-mc-sidebar border border-mc-border'
        }`}>
          {renderContent(message.content)}
        </div>
        {hasFiles && !message.streaming && (
          <button
            onClick={() => onApply(codeBlocks)}
            className="mt-2 px-4 py-2 text-xs font-medium rounded bg-mc-success/15 border border-mc-success/30 text-mc-success hover:bg-mc-success/25 transition-all flex items-center gap-2"
          >
            <Play size={12} />
            プロジェクトに適用（{codeBlocks.length}ファイル）
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AI CHAT PANEL
// ════════════════════════════════════════════════════════════

function AIChatPanel({ project, files, setFiles, setExpanded }) {
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(AI_MODEL_KEY) || AI_MODELS[0].id);
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const currentProvider = AI_PROVIDERS[currentModel.provider];
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(currentProvider.storageKey) || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [agentMode, setAgentMode] = useState(true);
  const [agentSteps, setAgentSteps] = useState([]);
  const abortRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, agentSteps]);

  // エージェントツール実行
  const executeAgentTool = useCallback((toolName, args) => {
    const currentFiles = filesRef.current;
    switch (toolName) {
      case 'create_files': {
        const pathContents = (args.files || []).map(f => ({ path: f.path, content: f.content }));
        const newFiles = addFilesFromPaths(currentFiles, pathContents);
        setFiles(newFiles);
        filesRef.current = newFiles;
        const allFolderIds = new Set();
        newFiles.filter(f => f.type === 'folder').forEach(f => allFolderIds.add(f.id));
        setExpanded(allFolderIds);
        setAgentSteps(prev => [...prev, { tool: toolName, status: 'done', detail: `${pathContents.length}ファイル作成` }]);
        return { success: true, created: pathContents.map(f => f.path) };
      }
      case 'read_files': {
        const results = {};
        for (const path of (args.paths || [])) {
          const file = currentFiles.find(f => f.type !== 'folder' && getFullPath(currentFiles, f.id) === path);
          results[path] = file ? file.content : '[ファイルが見つかりません]';
        }
        setAgentSteps(prev => [...prev, { tool: toolName, status: 'done', detail: `${Object.keys(results).length}ファイル読取` }]);
        return results;
      }
      case 'list_project_files': {
        const paths = currentFiles.filter(f => f.type !== 'folder').map(f => getFullPath(currentFiles, f.id));
        setAgentSteps(prev => [...prev, { tool: toolName, status: 'done', detail: `${paths.length}ファイル` }]);
        return { files: paths };
      }
      case 'delete_files': {
        let newFiles = [...currentFiles];
        const deleted = [];
        for (const path of (args.paths || [])) {
          const file = newFiles.find(f => f.type !== 'folder' && getFullPath(newFiles, f.id) === path);
          if (file) { newFiles = newFiles.filter(f => f.id !== file.id); deleted.push(path); }
        }
        setFiles(newFiles);
        filesRef.current = newFiles;
        setAgentSteps(prev => [...prev, { tool: toolName, status: 'done', detail: `${deleted.length}ファイル削除` }]);
        return { success: true, deleted };
      }
      case 'validate_mcfunction': {
        const lines = (args.content || '').split('\n');
        const ver = args.version || project.targetVersion;
        const errors = [];
        lines.forEach((line, i) => {
          const result = validateMcfunctionLine(line, i + 1, ver);
          if (result) errors.push(result);
        });
        setAgentSteps(prev => [...prev, { tool: toolName, status: errors.length ? 'warn' : 'done', detail: errors.length ? `${errors.length}件の問題` : '問題なし' }]);
        return { valid: errors.length === 0, errors };
      }
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }, [project.targetVersion, setFiles, setExpanded]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !apiKey || streaming || currentModel.comingSoon) return;

    setError('');
    setAgentSteps([]);
    const fileList = files
      .filter(f => f.type !== 'folder')
      .map(f => getFullPath(files, f.id))
      .join('\n');

    const contextNote = fileList
      ? `\n\n[現在のプロジェクトファイル一覧]\n${fileList}`
      : '\n\n[プロジェクトにはまだファイルがありません]';

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setStreamingText('');

    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = AI_SYSTEM_PROMPT(project.namespace, project.targetVersion);
    const modelLabel = currentModel.label;

    // エージェントモード: Gemini / Anthropic function calling
    if (agentMode && (currentModel.provider === 'gemini' || currentModel.provider === 'anthropic')) {
      const agentSystemPrompt = systemPrompt + `\n\n【エージェントモード】
あなたはデータパックビルダーのAIエージェントです。以下のツールを使ってプロジェクトを直接操作できます:
- create_files: ファイルを作成・更新（自動でプロジェクトに適用される）
- read_files: 既存ファイルの内容を読み取る
- list_project_files: プロジェクト内の全ファイル一覧を取得
- delete_files: ファイルを削除
- validate_mcfunction: mcfunction構文を検証

【ワークフロー】
1. list_project_filesで現在のファイル一覧を確認
2. read_filesで既存のload/tick/main等の内容を読む
3. 設計: 必要なファイル群を計画（pack.mcmeta, load.json, tick.json, 各function, recipe, advancement等）
4. create_filesで全ファイルを一括作成（パスとコンテンツの配列）
5. validate_mcfunctionで全mcfunctionを検証、エラーがあれば修正

【ミニゲーム作成時の定番構成】
- reload.mcfunction: scoreboard objectives add, team add, bossbar add等の初期化
- main.mcfunction: 毎tick実行のゲームループ（状態分岐、タイマー減算、判定）
- start.mcfunction: ゲーム開始（gamemode変更、clear、effect clear、tp、アイテム配布）
- end.mcfunction: ゲーム終了（勝敗判定、title表示、リセット）
- ゲーム状態管理: scoreboard players set #state game 0(待機)/1(プレイ中)/2(終了)
- タイマー: bossbar + execute store result bossbar value run scoreboard players get
- チーム: team add/join/modify color/friendlyFire
- リスポーン: deathCount + function on_death + spawnpoint
- 演出: title, playsound, particle
- イベント検出: advancement trigger → rewards function → advancement revoke（ループ）
- マクロパイプライン: execute store result storage → function ... with storage

必ずツールを使ってファイルを作成してください。コードブロック形式での出力は不要です。`;

      const apiMessages = newMessages.map((m, i) => {
        if (m.role === 'user' && i === newMessages.length - 1) {
          return { ...m, content: m.content + contextNote };
        }
        return m;
      });

      setAgentSteps([{ tool: 'agent', status: 'running', detail: 'エージェント起動...' }]);

      const agentCallbacks = {
        onStep: (toolName, toolArgs) => {
          setAgentSteps(prev => [...prev, { tool: toolName, status: 'running', detail: '実行中...' }]);
          return executeAgentTool(toolName, toolArgs);
        },
        onChunk: (text) => setStreamingText(prev => prev + text),
        onDone: (result) => {
          const finalText = result.text || streamingText || 'エージェントタスク完了。';
          setMessages(prev => [...prev, { role: 'assistant', content: finalText, modelLabel, agentSteps: agentSteps }]);
          setStreamingText('');
          setStreaming(false);
          setAgentSteps(prev => {
            const updated = prev.filter(s => s.status !== 'running');
            return [...updated, { tool: 'agent', status: 'done', detail: '完了' }];
          });
          abortRef.current = null;
        },
        onError: (errMsg) => {
          setError(errMsg);
          setStreaming(false);
          setStreamingText('');
          setAgentSteps(prev => [...prev, { tool: 'agent', status: 'error', detail: errMsg }]);
          abortRef.current = null;
        },
      };

      if (currentModel.provider === 'anthropic') {
        callAnthropicAgent(
          apiKey, currentModel.apiModel, apiMessages, agentSystemPrompt, AGENT_TOOL_DECLARATIONS,
          agentCallbacks.onStep, agentCallbacks.onChunk, agentCallbacks.onDone, agentCallbacks.onError,
          controller.signal,
        );
      } else {
        callGeminiAgent(
          apiKey, currentModel.apiModel, apiMessages, agentSystemPrompt, AGENT_TOOL_DECLARATIONS,
          agentCallbacks.onStep, agentCallbacks.onChunk, agentCallbacks.onDone, agentCallbacks.onError,
          controller.signal, currentModel.thinking,
        );
      }
      return;
    }

    // 通常チャットモード
    const apiMessages = newMessages.map((m, i) => {
      if (m.role === 'user' && i === newMessages.length - 1) {
        return { ...m, content: m.content + contextNote };
      }
      return m;
    });

    callAIStream(
      currentModel.provider,
      apiKey,
      currentModel.apiModel,
      apiMessages,
      systemPrompt,
      (text) => setStreamingText(text),
      (finalText) => {
        setMessages(prev => [...prev, { role: 'assistant', content: finalText, modelLabel }]);
        setStreamingText('');
        setStreaming(false);
        abortRef.current = null;
      },
      (errMsg) => {
        setError(errMsg);
        setStreaming(false);
        setStreamingText('');
        abortRef.current = null;
      },
      controller.signal,
      currentModel.thinking,
    );
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleApply = (codeBlocks) => {
    const pathContents = codeBlocks.map(block => ({
      path: block.path,
      content: block.content,
    }));
    const newFiles = addFilesFromPaths(files, pathContents);
    setFiles(newFiles);
    const allFolderIds = new Set();
    newFiles.filter(f => f.type === 'folder').forEach(f => allFolderIds.add(f.id));
    setExpanded(allFolderIds);
  };

  const handleReset = () => {
    setMessages([]);
    setStreamingText('');
    setError('');
    setAgentSteps([]);
  };

  const samplePrompts = [
    { icon: '🎮', text: 'チーム対戦PvPミニゲームを作って（赤vs青、タイマー付き、リスポーンあり）', category: 'ミニゲーム' },
    { icon: '👹', text: '鬼ごっこミニゲームを作って（鬼はスピードUP、逃走者は透明化可能）', category: 'ミニゲーム' },
    { icon: '⚔️', text: 'ネザライトの最強武器セットを全プレイヤーに配布する関数を作って', category: '装備' },
    { icon: '🏪', text: 'ダイヤモンドで買い物ができるショップ村人NPCを作って', category: 'NPC' },
    { icon: '🎯', text: 'スニークで弾を発射するレイキャスト銃を作って', category: '高度' },
    { icon: '🏆', text: 'サイドバーにキル数ランキングを表示するシステムを作って', category: 'UI' },
    { icon: '⏱️', text: 'ボスバーでカウントダウンタイマーを表示するシステムを作って', category: 'UI' },
    { icon: '🧩', text: 'ダイヤモンドソードの特殊レシピ（エメラルド+ネザースターで作成）を作って', category: 'レシピ' },
    { icon: '🗡️', text: 'クリーパーを倒したら特殊アイテムがドロップするルートテーブルを作って', category: 'ルート' },
    { icon: '🌟', text: 'プレイヤーの足元にパーティクルが出続けるエフェクトを作って', category: '演出' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AISettingsInline selectedModel={selectedModel} setSelectedModel={setSelectedModel} apiKey={apiKey} setApiKey={setApiKey} />
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-mc-border bg-mc-titlebar">
        <button
          onClick={() => setAgentMode(false)}
          className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${!agentMode ? 'bg-mc-info text-white' : 'text-mc-muted hover:text-mc-text hover:bg-mc-active'}`}
        >
          <MessageSquare size={10} className="inline mr-1" />Chat
        </button>
        <button
          onClick={() => setAgentMode(true)}
          className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${agentMode ? 'bg-mc-success/80 text-white' : 'text-mc-muted hover:text-mc-text hover:bg-mc-active'}`}
        >
          <Zap size={10} className="inline mr-1" />Agent
        </button>
        {agentMode && <span className="text-[9px] text-mc-success/70 ml-1">自動ファイル操作・検証・修正</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-mc-info/10 border border-mc-info/20 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-mc-info" />
            </div>
            <p className="text-base font-semibold text-mc-text mb-1">AI Datapack Assistant</p>
            <p className="text-xs text-mc-muted mb-1">
              自然言語で指示するだけで、データパックのファイルを自動生成します。
            </p>
            <p className="text-[10px] text-mc-muted/70 mb-3">
              ミニゲーム / カスタム武器 / NPC / 演出 / レシピ / ルートテーブル 等に対応
            </p>
            {!apiKey && !currentModel.comingSoon && (
              <div className="w-full max-w-sm mb-4 px-4 py-3 rounded-lg bg-mc-dark border border-mc-info/30 space-y-2">
                <div className="flex items-center justify-center gap-2 text-mc-info text-xs font-medium">
                  <Key size={14} />
                  APIキーが必要です
                </div>
                <p className="text-[11px] text-mc-muted">
                  AI機能を利用するには、上のフォームからAPIキーを設定してください。
                  APIキーは各プロバイダーのサイトで無料で取得できます。
                </p>
              </div>
            )}
            {apiKey && (
              <div className="w-full max-w-lg">
                <p className="text-[10px] text-mc-muted mb-3 flex items-center gap-1.5">
                  <MessageSquare size={10} />
                  サンプルプロンプト - クリックで入力:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {samplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(prompt.text); inputRef.current?.focus(); }}
                      className="text-left px-3 py-2.5 text-xs rounded border border-mc-border/50 bg-mc-sidebar hover:bg-mc-active hover:border-mc-info/40 text-mc-muted hover:text-mc-text transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm flex-shrink-0">{prompt.icon}</span>
                        <div className="min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-mc-info/15 text-mc-info mb-1">{prompt.category}</span>
                          <p className="text-[11px] leading-snug line-clamp-2">{prompt.text}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <AIMessageBubble key={i} message={msg} onApply={handleApply} />
        ))}

        {streaming && streamingText && (
          <AIMessageBubble
            message={{ role: 'assistant', content: streamingText, streaming: true, modelLabel: currentModel.label }}
            onApply={handleApply}
          />
        )}

        {agentSteps.length > 0 && streaming && (
          <div className="mb-3 rounded-lg border border-mc-border bg-mc-sidebar/50 overflow-hidden">
            <div className="px-3 py-1.5 bg-mc-titlebar text-[10px] text-mc-muted font-medium flex items-center gap-1.5">
              <Zap size={10} className="text-mc-success" />
              エージェント実行ログ
            </div>
            <div className="px-3 py-2 space-y-1">
              {agentSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {step.status === 'running' ? <Loader size={10} className="animate-spin text-mc-info" /> :
                   step.status === 'done' ? <CheckCircle size={10} className="text-mc-success" /> :
                   step.status === 'warn' ? <AlertTriangle size={10} className="text-mc-warning" /> :
                   <AlertTriangle size={10} className="text-mc-accent" />}
                  <span className="text-mc-muted font-mono">{step.tool}</span>
                  <span className="text-mc-text">{step.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {streaming && !streamingText && agentSteps.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-mc-muted py-2">
            <Loader size={12} className="animate-spin" />
            {currentModel.label} が考えています...
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded bg-mc-accent/10 border border-mc-accent/30 text-xs text-mc-accent flex items-start gap-2">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-mc-border p-3 bg-mc-sidebar">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleReset}
              className="text-[10px] text-mc-muted hover:text-mc-text flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-mc-active"
            >
              <RotateCcw size={10} />
              チャットをリセット
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={currentModel.comingSoon ? `${currentModel.label} はデスクトップ版で対応予定です（CORS制限）` : apiKey ? (agentMode ? 'エージェントに指示... (例: PvPミニゲームを作って) ※自動でファイル操作' : 'AIに指示を入力... (例: 鬼ごっこミニゲームを作って)') : 'APIキーを設定してください（必須）'}
            disabled={!apiKey || streaming || currentModel.comingSoon}
            className="flex-1 bg-mc-input border border-mc-border rounded px-3 py-2 text-sm text-mc-text placeholder-mc-muted/60 focus:outline-none focus:border-mc-focus disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="px-3 py-2 rounded bg-mc-accent/20 border border-mc-accent/40 text-mc-accent hover:bg-mc-accent/30 transition-colors"
              title="生成を停止"
            >
              <StopCircle size={16} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !apiKey || currentModel.comingSoon}
              className="px-3 py-2 rounded bg-mc-info hover:bg-mc-info/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="送信"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMMAND REFERENCE PANEL
// ════════════════════════════════════════════════════════════

function CommandReference({ namespace, targetVersion }) {
  const [openCat, setOpenCat] = useState(COMMAND_SNIPPETS[0]?.category);
  const [copied, setCopied] = useState(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  const filteredSnippets = useMemo(() => {
    return COMMAND_SNIPPETS.map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (!item.v || !targetVersion) return true;
        return versionAtLeast(targetVersion, item.v);
      }),
    }));
  }, [targetVersion]);

  const copyCode = (code, idx) => {
    const resolved = code.replace(/<ns>/g, namespace || 'mypack');
    try {
      navigator.clipboard.writeText(resolved).then(() => {
        setCopied(idx);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(null), 1500);
      });
    } catch {
      // Fallback: select text via prompt
      prompt('コピーしてください:', resolved);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-mc-border bg-mc-dark/30">
        <div className="flex items-center gap-2 text-xs font-semibold text-mc-muted">
          <BookOpen size={12} />
          コマンドリファレンス
          <span className="text-[10px] text-mc-muted/60 ml-auto">クリックでコピー</span>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Category list */}
        <div className="w-36 border-r border-mc-border overflow-y-auto py-1 flex-shrink-0">
          {filteredSnippets.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.category}
                onClick={() => setOpenCat(cat.category)}
                className={`w-full text-left px-2 py-1.5 text-[11px] flex items-center gap-1.5 transition-colors ${
                  openCat === cat.category ? 'bg-mc-info/20 text-white' : 'text-mc-muted hover:bg-mc-dark/50'
                }`}>
                <Icon size={12} /> {cat.category}
              </button>
            );
          })}
        </div>
        {/* Snippets */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredSnippets.find(c => c.category === openCat)?.items.map((item, idx) => (
            <div key={idx}
              onClick={() => copyCode(item.code, `${openCat}-${idx}`)}
              className="bg-mc-dark/50 rounded p-2 cursor-pointer hover:bg-mc-dark/80 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-mc-text">{item.label}</span>
                  {item.v && <span className="text-[9px] px-1 py-0.5 rounded bg-mc-info/20 text-mc-info">{item.v}+</span>}
                </div>
                <span className="text-[10px] text-mc-muted group-hover:text-mc-success transition-colors">
                  {copied === `${openCat}-${idx}` ? '✓ コピー済み' : <Clipboard size={10} />}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-sky-300/80 whitespace-pre-wrap break-all">{item.code}</pre>
              <p className="text-[10px] text-mc-muted mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// VISUAL COMMAND BUILDER PANEL
// ════════════════════════════════════════════════════════════

function CommandBuilderPanel({ namespace, file, onInsert }) {
  const [selectedCat, setSelectedCat] = useState(COMMAND_BUILDER_CATS[0]);
  const [selectedCmd, setSelectedCmd] = useState(COMMAND_BUILDER_DEFS[0].id);
  const [fields, setFields] = useState({});
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const cmd = COMMAND_BUILDER_DEFS.find(d => d.id === selectedCmd);
  const catCmds = COMMAND_BUILDER_DEFS.filter(d => d.cat === selectedCat);

  useEffect(() => {
    if (cmd) {
      const defaults = {};
      cmd.fields.forEach(f => { defaults[f.key] = f.def; });
      setFields(defaults);
    }
  }, [selectedCmd]);

  const preview = cmd ? cmd.build(fields) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInsert = () => {
    if (onInsert && preview) {
      onInsert(preview);
      setHistory(h => [{ cmd: selectedCmd, preview, time: Date.now() }, ...h].slice(0, 20));
    }
  };

  const [openPicker, setOpenPicker] = useState(null);
  const [pickerFilter, setPickerFilter] = useState('');

  const McPicker = ({ type, value, onChange, optional }) => {
    const isOpen = openPicker === type;
    const items = type === 'mc_item' ? MC_ITEMS : type === 'mc_entity' ? MC_ENTITIES : MC_EFFECTS;
    const iconType = type === 'mc_entity' ? 'entity' : type === 'mc_effect' ? 'effect' : 'item';
    const current = items.find(i => i.id === value);
    const cats = [...new Set(items.map(i => i.c).filter(Boolean))];
    const [filterCat, setFilterCat] = useState('');
    const filtered = items.filter(i => {
      if (filterCat && i.c !== filterCat) return false;
      if (pickerFilter && !i.n.includes(pickerFilter) && !i.id.includes(pickerFilter)) return false;
      return true;
    });

    return (
      <div className="relative">
        <button onClick={() => { setOpenPicker(isOpen ? null : type); setPickerFilter(''); setFilterCat(''); }}
          className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs text-left flex items-center gap-2 hover:border-mc-info transition-colors focus:border-mc-info focus:outline-none">
          {value ? <McIcon id={value} size={20} type={iconType} /> : <span className="w-5 h-5 bg-mc-border/30 rounded" />}
          <span className="flex-1 truncate">{current ? `${current.n} (${current.id.replace('minecraft:','')})` : optional ? '（全て）' : '選択...'}</span>
          <ChevronDown size={12} className={`text-mc-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-mc-sidebar border border-mc-border rounded-lg shadow-xl max-h-72 flex flex-col overflow-hidden"
            style={{ minWidth: 280 }}>
            <div className="p-2 border-b border-mc-border/50 space-y-1.5">
              <input autoFocus placeholder="検索..." value={pickerFilter} onChange={e => setPickerFilter(e.target.value)}
                className="w-full bg-mc-dark border border-mc-border/50 rounded px-2 py-1 text-xs focus:border-mc-info focus:outline-none" />
              {cats.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setFilterCat('')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${!filterCat ? 'bg-mc-info/30 text-white' : 'text-mc-muted hover:bg-mc-dark'}`}>全て</button>
                  {cats.map(c => (
                    <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${filterCat === c ? 'bg-mc-info/30 text-white' : 'text-mc-muted hover:bg-mc-dark'}`}>{c}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {optional && (
                <button onClick={() => { onChange(''); setOpenPicker(null); }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-mc-muted hover:bg-mc-dark/50 flex items-center gap-2">
                  <X size={14} /> （全て）
                </button>
              )}
              {filtered.map(i => (
                <button key={i.id} onClick={() => { onChange(i.id); setOpenPicker(null); }}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-2 transition-colors ${value === i.id ? 'bg-mc-info/20 text-white' : 'text-mc-text hover:bg-mc-dark/50'}`}>
                  <McIcon id={i.id} size={20} type={iconType} />
                  <span className="flex-1 truncate">{i.n}</span>
                  <span className="text-[9px] text-mc-muted">{i.c}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-[10px] text-mc-muted py-4">一致するアイテムがありません</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderField = (f) => {
    const val = fields[f.key] ?? f.def;
    const update = (v) => setFields(prev => ({ ...prev, [f.key]: v }));

    if (f.type === 'select') {
      return (
        <select className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
          value={val} onChange={e => update(e.target.value)}>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'mc_item' || f.type === 'mc_item_optional') {
      return <McPicker type="mc_item" value={val} onChange={update} optional={f.type === 'mc_item_optional'} />;
    }
    if (f.type === 'mc_entity') {
      return <McPicker type="mc_entity" value={val} onChange={update} />;
    }
    if (f.type === 'mc_effect' || f.type === 'mc_effect_optional') {
      return <McPicker type="mc_effect" value={val} onChange={update} optional={f.type === 'mc_effect_optional'} />;
    }
    if (f.type === 'mc_particle') {
      return (
        <select className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
          value={val} onChange={e => update(e.target.value)}>
          {MC_PARTICLES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      );
    }
    if (f.type === 'mc_sound') {
      return (
        <select className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
          value={val} onChange={e => update(e.target.value)}>
          {MC_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.n}</option>)}
        </select>
      );
    }
    if (f.type === 'mc_color') {
      return (
        <div className="flex flex-wrap gap-1">
          {MC_COLORS.map(c => (
            <button key={c} onClick={() => update(c)}
              className={`w-6 h-6 rounded border-2 transition-all ${val === c ? 'border-white scale-110' : 'border-mc-border/50 hover:border-mc-muted'}`}
              style={{ backgroundColor: MC_COLOR_HEX[c] }}
              title={c} />
          ))}
        </div>
      );
    }
    if (f.type === 'number') {
      return (
        <input type="number" min={f.min} max={f.max} step={f.step || 1}
          className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
          value={val} onChange={e => update(f.step ? parseFloat(e.target.value) : parseInt(e.target.value))} />
      );
    }
    if (f.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!val} onChange={e => update(e.target.checked)} className="accent-mc-info" />
          <span className="text-xs">{val ? 'ON' : 'OFF'}</span>
        </label>
      );
    }
    if (f.type === 'mc_richtext') {
      return <McRichTextEditor value={val || f.def || ''} onChange={update} />;
    }
    return (
      <input className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs font-mono focus:border-mc-info focus:outline-none"
        value={val} onChange={e => update(e.target.value)} />
    );
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: Category & command selector */}
      <div className="w-48 border-r border-mc-border flex flex-col overflow-hidden">
        <div className="p-2 border-b border-mc-border/50">
          <p className="text-[10px] text-mc-muted uppercase tracking-wider font-semibold">カテゴリ</p>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {COMMAND_BUILDER_CATS.map(cat => (
            <div key={cat}>
              <button onClick={() => { setSelectedCat(cat); const first = COMMAND_BUILDER_DEFS.find(d=>d.cat===cat); if(first) setSelectedCmd(first.id); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors ${selectedCat===cat ? 'bg-mc-info/20 text-white' : 'text-mc-muted hover:bg-mc-dark/50'}`}>
                {cat}
              </button>
              {selectedCat === cat && (
                <div className="ml-2 space-y-0.5 mt-0.5">
                  {catCmds.map(c => (
                    <button key={c.id} onClick={() => setSelectedCmd(c.id)}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-1.5 transition-colors ${selectedCmd===c.id ? 'bg-mc-info/30 text-white' : 'text-mc-muted hover:text-mc-text hover:bg-mc-dark/30'}`}>
                      <span>{c.icon}</span> {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Builder form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {cmd ? (
          <>
            <div className="p-3 border-b border-mc-border/50">
              <div className="flex items-center gap-3">
                <span className="text-lg">{cmd.icon}</span>
                <div>
                  <span className="text-sm font-semibold">{cmd.name}</span>
                  <span className="text-[10px] text-mc-muted ml-2 font-mono">/{cmd.id.replace('_',' ')}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {cmd.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-medium text-mc-muted mb-1 uppercase tracking-wider">{f.label}</label>
                  {renderField(f)}
                </div>
              ))}
            </div>

            {/* Preview with icon */}
            <div className="border-t border-mc-border p-3 space-y-2">
              <p className="text-[10px] text-mc-muted uppercase tracking-wider font-semibold">プレビュー</p>
              <div className="flex items-start gap-2">
                {fields.item && <McInvSlot id={fields.item} size={40} />}
                {fields.entity && <McInvSlot id={fields.entity} size={40}><McIcon id={fields.entity} size={28} type="entity" /></McInvSlot>}
                <pre className="flex-1 bg-mc-dark rounded p-2 text-xs font-mono text-mc-bright whitespace-pre-wrap break-all border border-mc-border/50 max-h-24 overflow-y-auto">{preview}</pre>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-mc-border hover:bg-mc-dark transition-colors flex items-center justify-center gap-1.5">
                  {copied ? <><CheckCircle size={12} className="text-mc-success" /> コピー済み</> : <><Clipboard size={12} /> コピー</>}
                </button>
                <button onClick={handleInsert}
                  disabled={!file}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-mc-info hover:bg-mc-info/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5">
                  <ArrowRight size={12} /> ファイルに挿入
                </button>
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="border-t border-mc-border/50 p-2 max-h-28 overflow-y-auto">
                <p className="text-[10px] text-mc-muted mb-1">履歴 (クリックでコピー)</p>
                {history.map((h, i) => (
                  <button key={i} onClick={() => { navigator.clipboard.writeText(h.preview); }}
                    className="w-full text-left text-[10px] font-mono text-mc-muted hover:text-mc-text px-1 py-0.5 rounded hover:bg-mc-dark/50 truncate block">
                    {h.preview}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-mc-muted text-xs">
            左からコマンドを選択してください
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RECIPE VISUAL EDITOR
// ════════════════════════════════════════════════════════════

function RecipeVisualEditor({ file, onChange, namespace }) {
  const [recipe, setRecipe] = useState(() => {
    try { return JSON.parse(file?.content || '{}'); } catch { return {}; }
  });
  const [recipeType, setRecipeType] = useState(recipe?.type || 'minecraft:crafting_shaped');
  const [grid, setGrid] = useState(() => {
    if (recipe?.pattern) {
      const rows = recipe.pattern.map(r => r.split(''));
      while (rows.length < 3) rows.push([' ',' ',' ']);
      return rows.map(r => { while (r.length < 3) r.push(' '); return r; });
    }
    return [[' ',' ',' '],[' ',' ',' '],[' ',' ',' ']];
  });
  const [keys, setKeys] = useState(() => {
    if (!recipe?.key) return {};
    const k = {};
    Object.entries(recipe.key).forEach(([letter, val]) => {
      k[letter] = typeof val === 'string' ? val : val?.item || val?.id || '';
    });
    return k;
  });
  const [resultItem, setResultItem] = useState(
    recipe?.result?.id || recipe?.result?.item || recipe?.result || 'minecraft:diamond'
  );
  const [resultCount, setResultCount] = useState(recipe?.result?.count || 1);
  const [ingredients, setIngredients] = useState(() => {
    if (!recipe?.ingredients) return ['minecraft:diamond'];
    return recipe.ingredients.map(i => typeof i === 'string' ? i : i?.item || '');
  });

  const allLetters = useMemo(() => {
    const set = new Set();
    grid.forEach(row => row.forEach(c => { if (c.trim()) set.add(c); }));
    return [...set].sort();
  }, [grid]);

  const updateOutput = useCallback(() => {
    let obj = {};
    if (recipeType === 'minecraft:crafting_shaped') {
      const pattern = grid.map(row => row.join(''));
      const keyObj = {};
      allLetters.forEach(l => { if (keys[l]) keyObj[l] = keys[l]; });
      obj = { type: recipeType, pattern, key: keyObj, result: { id: resultItem, count: resultCount } };
    } else if (recipeType === 'minecraft:crafting_shapeless') {
      obj = { type: recipeType, ingredients: ingredients.filter(Boolean), result: { id: resultItem, count: resultCount } };
    } else if (recipeType === 'minecraft:smelting' || recipeType === 'minecraft:blasting' || recipeType === 'minecraft:smoking') {
      obj = { type: recipeType, ingredient: ingredients[0] || 'minecraft:iron_ore', result: { id: resultItem }, experience: 0.7, cookingtime: 200 };
    } else if (recipeType === 'minecraft:stonecutting') {
      obj = { type: recipeType, ingredient: ingredients[0] || 'minecraft:stone', result: resultItem, count: resultCount };
    }
    const json = JSON.stringify(obj, null, 2);
    if (onChange && json !== file?.content) onChange(json);
  }, [recipeType, grid, keys, resultItem, resultCount, ingredients, allLetters]);

  useEffect(() => { updateOutput(); }, [recipeType, grid, keys, resultItem, resultCount, ingredients]);

  const setGridCell = (r, c, val) => {
    const g = grid.map(row => [...row]);
    g[r][c] = val || ' ';
    setGrid(g);
  };

  const isShaped = recipeType === 'minecraft:crafting_shaped';
  const isShapeless = recipeType === 'minecraft:crafting_shapeless';
  const isFurnace = ['minecraft:smelting','minecraft:blasting','minecraft:smoking'].includes(recipeType);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <McIcon id="minecraft:crafting_table" size={28} />
        <span className="text-sm font-semibold">レシピビジュアルエディター</span>
        <span className="text-[10px] text-mc-muted bg-mc-dark px-2 py-0.5 rounded">{file?.name}</span>
      </div>

      {/* Recipe Type */}
      <div>
        <label className="block text-[10px] font-medium text-mc-muted mb-1 uppercase tracking-wider">レシピタイプ</label>
        <select className="w-full max-w-xs bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
          value={recipeType} onChange={e => setRecipeType(e.target.value)}>
          <option value="minecraft:crafting_shaped">固定レシピ（shaped）</option>
          <option value="minecraft:crafting_shapeless">不定形レシピ（shapeless）</option>
          <option value="minecraft:smelting">精錬レシピ（smelting）</option>
          <option value="minecraft:blasting">溶鉱炉（blasting）</option>
          <option value="minecraft:smoking">燻製器（smoking）</option>
          <option value="minecraft:stonecutting">石切台（stonecutting）</option>
        </select>
      </div>

      {/* Shaped: Grid */}
      {isShaped && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">クラフトグリッド (3x3)</label>
            <div className="flex items-center gap-4">
              {/* 3x3 Grid with MC inventory slots */}
              <div className="inline-grid grid-cols-3 gap-0.5 p-2 rounded" style={{ background: '#c6c6c6', border: '3px solid', borderColor: '#fff #555 #555 #fff' }}>
                {grid.map((row, r) => row.map((cell, c) => {
                  const itemId = cell.trim() && keys[cell.trim()] ? keys[cell.trim()] : null;
                  return (
                    <div key={`${r}-${c}`} className="relative group">
                      <McInvSlot id={itemId} size={48}>
                        {!itemId && (
                          <input
                            className="absolute inset-0 w-full h-full text-center bg-transparent text-white text-sm font-mono font-bold focus:outline-none uppercase z-10"
                            maxLength={1} value={cell.trim()} placeholder=""
                            onChange={e => setGridCell(r, c, e.target.value.toUpperCase() || ' ')} />
                        )}
                      </McInvSlot>
                      {itemId && (
                        <button onClick={() => setGridCell(r, c, ' ')}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">x</button>
                      )}
                      {!itemId && cell.trim() && (
                        <span className="absolute top-0.5 left-1 text-[10px] font-mono font-bold text-yellow-400 z-10" style={{ textShadow: '1px 1px 0 #000' }}>{cell.trim()}</span>
                      )}
                    </div>
                  );
                }))}
              </div>
              {/* Arrow */}
              <div className="text-2xl text-mc-muted">→</div>
              {/* Result slot */}
              <div className="text-center">
                <McInvSlot id={resultItem} size={56} count={resultCount} />
                <p className="text-[9px] text-mc-muted mt-1">{MC_ITEMS.find(i => i.id === resultItem)?.n || resultItem}</p>
              </div>
            </div>
            <p className="text-[10px] text-mc-muted mt-2">各マスに1文字のキー(A,B,Cなど)を入力。下のキーマッピングでアイテムを割り当て</p>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">キー → アイテム対応</label>
            <div className="space-y-2">
              {allLetters.map(letter => {
                const itemId = keys[letter] || '';
                return (
                  <div key={letter} className="flex items-center gap-2">
                    <McInvSlot size={32}>
                      <span className="text-xs font-mono font-bold text-yellow-300" style={{ textShadow: '1px 1px 0 #000' }}>{letter}</span>
                    </McInvSlot>
                    <span className="text-mc-muted">=</span>
                    {itemId && <McIcon id={itemId} size={24} />}
                    <select className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
                      value={itemId} onChange={e => setKeys(k => ({...k, [letter]: e.target.value}))}>
                      <option value="">（選択してください）</option>
                      {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n} ({i.id.replace('minecraft:','')})</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shapeless: Ingredients list */}
      {isShapeless && (
        <div>
          <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">材料 (不定形)</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="relative group">
                <McInvSlot id={ing} size={44} />
                <button onClick={() => setIngredients(ingredients.filter((_,j)=>j!==i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">x</button>
              </div>
            ))}
            <button onClick={() => setIngredients([...ingredients, 'minecraft:stone'])}
              className="w-11 h-11 border-2 border-dashed border-mc-border rounded flex items-center justify-center text-mc-muted hover:border-mc-info hover:text-mc-info transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <McIcon id={ing} size={20} />
                <select className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
                  value={ing} onChange={e => { const a=[...ingredients]; a[i]=e.target.value; setIngredients(a); }}>
                  {MC_ITEMS.map(item => <option key={item.id} value={item.id}>{item.n} ({item.id.replace('minecraft:','')})</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Furnace: Single ingredient */}
      {isFurnace && (
        <div>
          <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">入力アイテム</label>
          <div className="flex items-center gap-3">
            <McInvSlot id={ingredients[0]} size={48} />
            <div className="text-xl text-mc-muted">→</div>
            <McInvSlot id={resultItem} size={48} />
          </div>
          <select className="w-full max-w-xs bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none mt-2"
            value={ingredients[0] || ''} onChange={e => setIngredients([e.target.value])}>
            {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n} ({i.id.replace('minecraft:','')})</option>)}
          </select>
        </div>
      )}

      {/* Stonecutting */}
      {recipeType === 'minecraft:stonecutting' && (
        <div>
          <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">入力アイテム</label>
          <div className="flex items-center gap-3">
            <McInvSlot id={ingredients[0]} size={48} />
            <div className="text-xl text-mc-muted">→</div>
            <McInvSlot id={resultItem} size={48} count={resultCount} />
          </div>
          <select className="w-full max-w-xs bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none mt-2"
            value={ingredients[0] || ''} onChange={e => setIngredients([e.target.value])}>
            {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n} ({i.id.replace('minecraft:','')})</option>)}
          </select>
        </div>
      )}

      {/* Result */}
      <div className="border-t border-mc-border pt-3">
        <label className="block text-[10px] font-medium text-mc-muted mb-2 uppercase tracking-wider">完成アイテム</label>
        <div className="flex items-center gap-3">
          <McInvSlot id={resultItem} size={48} count={resultCount > 1 ? resultCount : undefined} />
          <div className="flex-1">
            <select className="w-full bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs focus:border-mc-info focus:outline-none"
              value={resultItem} onChange={e => setResultItem(e.target.value)}>
              {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n} ({i.id.replace('minecraft:','')})</option>)}
            </select>
            {!isFurnace && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-mc-muted">個数:</span>
                <input type="number" min={1} max={64}
                  className="w-14 bg-mc-dark border border-mc-border rounded px-2 py-1 text-xs text-center focus:border-mc-info focus:outline-none"
                  value={resultCount} onChange={e => setResultCount(parseInt(e.target.value) || 1)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LOOT TABLE VISUAL EDITOR
// ════════════════════════════════════════════════════════════

function LootTableVisualEditor({ file, onChange }) {
  const [loot, setLoot] = useState(() => {
    try { return JSON.parse(file?.content || '{"pools":[]}'); } catch { return { pools: [] }; }
  });

  const updateOutput = useCallback((newLoot) => {
    const json = JSON.stringify(newLoot, null, 2);
    if (onChange && json !== file?.content) onChange(json);
  }, []);

  const addPool = () => {
    const newLoot = { ...loot, pools: [...(loot.pools||[]), { rolls: 1, entries: [{ type:'minecraft:item', name:'minecraft:diamond', weight:1 }] }] };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  const removePool = (idx) => {
    const newLoot = { ...loot, pools: loot.pools.filter((_,i)=>i!==idx) };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  const addEntry = (poolIdx) => {
    const newLoot = { ...loot, pools: loot.pools.map((p,i) => i===poolIdx ? {...p, entries:[...p.entries, {type:'minecraft:item',name:'minecraft:iron_ingot',weight:1}]} : p) };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  const removeEntry = (poolIdx, entryIdx) => {
    const newLoot = { ...loot, pools: loot.pools.map((p,i) => i===poolIdx ? {...p, entries:p.entries.filter((_,j)=>j!==entryIdx)} : p) };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  const updatePoolRolls = (poolIdx, rolls) => {
    const newLoot = { ...loot, pools: loot.pools.map((p,i) => i===poolIdx ? {...p, rolls} : p) };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  const updateEntry = (poolIdx, entryIdx, key, value) => {
    const newLoot = { ...loot, pools: loot.pools.map((p,i) => i===poolIdx ? {...p, entries: p.entries.map((e,j) => j===entryIdx ? {...e, [key]:value} : e)} : p) };
    setLoot(newLoot);
    updateOutput(newLoot);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <McIcon id="minecraft:chest" size={28} />
          <span className="text-sm font-semibold">ルートテーブルエディター</span>
          <span className="text-[10px] text-mc-muted bg-mc-dark px-2 py-0.5 rounded">{file?.name}</span>
        </div>
        <button onClick={addPool} className="text-xs px-2 py-1 bg-mc-info/20 text-mc-info rounded hover:bg-mc-info/30 flex items-center gap-1">
          <Plus size={12} /> プール追加
        </button>
      </div>

      {(loot.pools||[]).map((pool, pi) => (
        <div key={pi} className="border border-mc-border rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mc-text">プール {pi+1}</span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-mc-muted flex items-center gap-1">
                ロール回数:
                <input type="number" min={1} max={100}
                  className="w-14 bg-mc-dark border border-mc-border rounded px-1 py-0.5 text-xs text-center focus:border-mc-info focus:outline-none"
                  value={typeof pool.rolls === 'number' ? pool.rolls : 1} onChange={e => updatePoolRolls(pi, parseInt(e.target.value)||1)} />
              </label>
              <button onClick={() => removePool(pi)} className="text-mc-accent hover:text-red-400 p-0.5"><Trash2 size={12} /></button>
            </div>
          </div>

          <div className="space-y-1.5">
            {(pool.entries||[]).map((entry, ei) => (
              <div key={ei} className="flex items-center gap-2 bg-mc-dark/50 rounded p-1.5">
                <McInvSlot id={entry.name} size={32} />
                <select className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1 text-xs focus:border-mc-info focus:outline-none"
                  value={entry.name||''} onChange={e => updateEntry(pi, ei, 'name', e.target.value)}>
                  {MC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.n} ({i.id.replace('minecraft:','')})</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-mc-muted">重み:</span>
                  <input type="number" min={1} max={1000}
                    className="w-14 bg-mc-dark border border-mc-border rounded px-1 py-1 text-xs text-center focus:border-mc-info focus:outline-none"
                    value={entry.weight||1} onChange={e => updateEntry(pi, ei, 'weight', parseInt(e.target.value)||1)} />
                </div>
                <button onClick={() => removeEntry(pi, ei)} className="text-mc-accent hover:text-red-400 p-0.5"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          <button onClick={() => addEntry(pi)} className="text-[11px] text-mc-info hover:text-mc-info/80 flex items-center gap-1">
            <Plus size={11} /> エントリー追加
          </button>

          {/* Weight visualization */}
          {pool.entries && pool.entries.length > 1 && (
            <div className="space-y-0.5">
              <p className="text-[10px] text-mc-muted">ドロップ確率:</p>
              {(() => {
                const totalW = pool.entries.reduce((s,e)=>s+(e.weight||1),0);
                return pool.entries.map((e,i) => {
                  const pct = ((e.weight||1)/totalW*100).toFixed(1);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <McIcon id={e.name} size={16} />
                      <span className="w-20 truncate text-mc-muted">{(e.name||'').replace('minecraft:','')}</span>
                      <div className="flex-1 bg-mc-dark rounded-full h-2.5 overflow-hidden">
                        <div className="h-full bg-mc-info rounded-full transition-all" style={{width:`${pct}%`}} />
                      </div>
                      <span className="w-10 text-right text-mc-text font-medium">{pct}%</span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      ))}

      {(!loot.pools || loot.pools.length === 0) && (
        <div className="text-center py-8 text-mc-muted">
          <Package size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs">プールがありません</p>
          <button onClick={addPool} className="text-xs text-mc-info hover:underline mt-1">プールを追加</button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PROJECT TABS
// ════════════════════════════════════════════════════════════

function ProjectTabs({ projects, currentId, onSwitch, onCreate, onDelete, onRename }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (renamingId && inputRef.current) inputRef.current.focus();
  }, [renamingId]);

  return (
    <div className="flex items-center bg-mc-darker border-b border-mc-border/50 px-1 h-8 flex-shrink-0 overflow-x-auto gap-0.5">
      {projects.map(p => (
        <div
          key={p.id}
          className={`group flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-t cursor-pointer min-w-0 max-w-[160px] transition-colors ${
            p.id === currentId
              ? 'bg-mc-sidebar text-mc-bright border-t border-x border-mc-border/50'
              : 'text-mc-muted hover:text-mc-text hover:bg-mc-dark/50'
          }`}
          onClick={() => onSwitch(p.id)}
          onDoubleClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
        >
          <Package size={10} className="flex-shrink-0" />
          {renamingId === p.id ? (
            <input
              ref={inputRef}
              className="bg-mc-dark border border-mc-border rounded px-1 text-[11px] w-20 outline-none text-mc-bright"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(p.id, renameVal); setRenamingId(null); }
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onBlur={() => { if (renameVal.trim()) onRename(p.id, renameVal); setRenamingId(null); }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{p.name}</span>
          )}
          {projects.length > 1 && (
            <button
              className="opacity-0 group-hover:opacity-100 text-mc-muted hover:text-mc-accent transition-opacity flex-shrink-0"
              onClick={e => { e.stopPropagation(); onDelete(p.id); }}
              title="プロジェクトを削除"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onCreate}
        className="flex items-center gap-1 px-2 py-1 text-[11px] text-mc-muted hover:text-mc-success transition-colors flex-shrink-0"
        title="新規プロジェクト"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SYSTEM WIZARD
// ════════════════════════════════════════════════════════════

function SystemWizard({ namespace, onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState('custom_weapon');
  const [settings, setSettings] = useState({ ...SYSTEM_TYPES[0].defaults });

  const sysType = SYSTEM_TYPES.find(t => t.id === selectedType);

  const handleComplete = () => {
    const mergedSettings = { ...sysType.defaults, ...settings };
    onComplete(selectedType, mergedSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-mc-sidebar border border-mc-border rounded-lg w-full max-w-2xl mx-4 anim-scale overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-mc-border">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Settings size={16} /> システム作成ウィザード</h3>
          <button onClick={onClose} className="text-mc-muted hover:text-mc-text"><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-mc-border">
          {['システム選択', '設定', '確認'].map((s, i) => (
            <div key={i} className={`flex-1 px-4 py-2 text-center text-xs font-medium transition-colors ${
              i === step ? 'bg-mc-info text-white' : i < step ? 'bg-mc-success/20 text-mc-success' : 'text-mc-muted'
            }`}>
              <div className="text-[10px] opacity-60">STEP {i + 1}</div>{s}
            </div>
          ))}
        </div>

        <div className="p-5 overflow-y-auto" style={{ minHeight: '340px', maxHeight: '60vh' }}>
          {/* Step 0: System type selection */}
          {step === 0 && (
            <div className="space-y-2 anim-fade">
              <p className="text-xs text-mc-muted mb-3">作りたいシステムのタイプを選んでください</p>
              {SYSTEM_TYPES.map(st => (
                <button key={st.id}
                  onClick={() => { setSelectedType(st.id); setSettings(s => ({ ...s, ...st.defaults })); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                    selectedType === st.id ? 'border-mc-info bg-mc-info/10 scale-[1.01]' : 'border-mc-border/50 hover:border-mc-border bg-mc-dark/20'
                  }`}
                >
                  <McInvSlot id={GALLERY_SYSTEM_ICONS[st.id]} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${st.color}`}>{st.name}</div>
                    <div className="text-xs text-mc-muted mt-0.5 leading-relaxed">{st.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Settings */}
          {step === 1 && sysType && (
            <div className="space-y-4 anim-fade">
              <div className="flex items-center gap-2 mb-3">
                <McIcon id={GALLERY_SYSTEM_ICONS[sysType.id]} size={24} />
                <span className="text-sm font-semibold">{sysType.name} の設定</span>
              </div>

              {selectedType === 'custom_weapon' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">武器名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.weaponName} onChange={e => setSettings(s => ({ ...s, weaponName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ベースアイテム</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm font-mono focus:border-mc-info focus:outline-none"
                      value={settings.weaponItem} onChange={e => setSettings(s => ({ ...s, weaponItem: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">ダメージ量</label>
                      <input type="number" min={1} max={100}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.damage} onChange={e => setSettings(s => ({ ...s, damage: parseInt(e.target.value) || 10 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">クールダウン(tick)</label>
                      <input type="number" min={0} max={6000}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.cooldown} onChange={e => setSettings(s => ({ ...s, cooldown: parseInt(e.target.value) || 60 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">パーティクル</label>
                    <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.particleEffect} onChange={e => setSettings(s => ({ ...s, particleEffect: e.target.value }))}>
                      {['flame','soul_fire_flame','end_rod','heart','crit','enchanted_hit','smoke','portal','dragon_breath','witch'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              )}

              {selectedType === 'shop_npc' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ショップ名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.shopName} onChange={e => setSettings(s => ({ ...s, shopName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">通貨スコア名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm font-mono focus:border-mc-info focus:outline-none"
                      value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} />
                    <p className="text-[10px] text-mc-muted mt-1">スコアボードの名前（例: coins, money）</p>
                  </div>
                </>
              )}

              {selectedType === 'teleport_system' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">ワープポイント数</label>
                  <input type="number" min={2} max={20}
                    className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.pointCount} onChange={e => setSettings(s => ({ ...s, pointCount: parseInt(e.target.value) || 3 }))} />
                  <p className="text-[10px] text-mc-muted mt-1">各ポイントごとにテレポートコマンドが生成されます</p>
                </div>
              )}

              {selectedType === 'loot_box' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ルートボックス名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.boxName} onChange={e => setSettings(s => ({ ...s, boxName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">開封コスト</label>
                      <input type="number" min={0} max={1000}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.cost} onChange={e => setSettings(s => ({ ...s, cost: parseInt(e.target.value) || 10 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">通貨スコア名</label>
                      <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm font-mono focus:border-mc-info focus:outline-none"
                        value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'recipe_set' && (
                <div>
                  <label className="block text-xs font-medium text-mc-muted mb-1">レシピカテゴリ</label>
                  <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                    value={settings.recipeType} onChange={e => setSettings(s => ({ ...s, recipeType: e.target.value }))}>
                    <option value="weapon">武器レシピ</option>
                    <option value="armor">防具レシピ</option>
                    <option value="food">食料レシピ</option>
                    <option value="utility">便利レシピ</option>
                  </select>
                  <p className="text-[10px] text-mc-muted mt-1">カテゴリごとに3つのサンプルレシピが生成されます</p>
                </div>
              )}

              {selectedType === 'boss_fight' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ボス名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.bossName} onChange={e => setSettings(s => ({ ...s, bossName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ベースエンティティ</label>
                    <select className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.bossEntity} onChange={e => setSettings(s => ({ ...s, bossEntity: e.target.value }))}>
                      {['minecraft:wither_skeleton','minecraft:zombie','minecraft:skeleton','minecraft:vindicator','minecraft:pillager','minecraft:evoker','minecraft:blaze','minecraft:warden'].map(e => <option key={e} value={e}>{e.replace('minecraft:','')}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">ボスHP</label>
                      <input type="number" min={20} max={1000}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.bossHp} onChange={e => setSettings(s => ({ ...s, bossHp: parseInt(e.target.value) || 100 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">フェーズ数</label>
                      <input type="number" min={1} max={5}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.phases} onChange={e => setSettings(s => ({ ...s, phases: parseInt(e.target.value) || 3 }))} />
                    </div>
                  </div>
                </>
              )}

              {selectedType === 'lobby_system' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-mc-muted mb-1">ロビー名</label>
                    <input className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                      value={settings.lobbyName} onChange={e => setSettings(s => ({ ...s, lobbyName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">最少人数</label>
                      <input type="number" min={1} max={32}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.minPlayers} onChange={e => setSettings(s => ({ ...s, minPlayers: parseInt(e.target.value) || 2 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">最大人数</label>
                      <input type="number" min={2} max={100}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.maxPlayers} onChange={e => setSettings(s => ({ ...s, maxPlayers: parseInt(e.target.value) || 16 }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-mc-muted mb-1">CD秒数</label>
                      <input type="number" min={5} max={120}
                        className="w-full bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm focus:border-mc-info focus:outline-none"
                        value={settings.countdown} onChange={e => setSettings(s => ({ ...s, countdown: parseInt(e.target.value) || 30 }))} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && sysType && (
            <div className="anim-fade">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{sysType.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{sysType.name}</div>
                  <div className="text-xs text-mc-muted">名前空間: {namespace}</div>
                </div>
              </div>

              <div className="bg-mc-dark rounded p-3 space-y-2 text-xs mb-4">
                {selectedType === 'custom_weapon' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">武器名</span><span>{settings.weaponName}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">ベースアイテム</span><span className="font-mono">{settings.weaponItem}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">ダメージ</span><span>{settings.damage}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">クールダウン</span><span>{settings.cooldown}tick ({(settings.cooldown/20).toFixed(1)}秒)</span></div>
                  </>
                )}
                {selectedType === 'shop_npc' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">ショップ名</span><span>{settings.shopName}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">通貨</span><span className="font-mono">{settings.currency}</span></div>
                  </>
                )}
                {selectedType === 'teleport_system' && (
                  <div className="flex justify-between"><span className="text-mc-muted">ポイント数</span><span>{settings.pointCount}箇所</span></div>
                )}
                {selectedType === 'loot_box' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">名前</span><span>{settings.boxName}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">開封コスト</span><span>{settings.cost} {settings.currency}</span></div>
                  </>
                )}
                {selectedType === 'recipe_set' && (
                  <div className="flex justify-between"><span className="text-mc-muted">カテゴリ</span><span>{{weapon:'武器',armor:'防具',food:'食料',utility:'便利'}[settings.recipeType]}</span></div>
                )}
                {selectedType === 'boss_fight' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">ボス名</span><span>{settings.bossName}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">エンティティ</span><span className="font-mono">{settings.bossEntity}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">HP</span><span>{settings.bossHp}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">フェーズ数</span><span>{settings.phases}</span></div>
                  </>
                )}
                {selectedType === 'lobby_system' && (
                  <>
                    <div className="flex justify-between"><span className="text-mc-muted">ロビー名</span><span>{settings.lobbyName}</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">人数</span><span>{settings.minPlayers}~{settings.maxPlayers}人</span></div>
                    <div className="flex justify-between"><span className="text-mc-muted">カウントダウン</span><span>{settings.countdown}秒</span></div>
                  </>
                )}
              </div>

              <div className="mt-3 p-3 bg-mc-warning/10 border border-mc-warning/30 rounded text-xs text-mc-warning flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>既存のファイルがある場合は上書きされます。新しいプロジェクトで使用することを推奨します。</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center px-5 pb-5">
          <button onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="px-4 py-2 text-sm text-mc-muted hover:text-mc-text transition-colors">
            {step === 0 ? 'キャンセル' : '戻る'}
          </button>
          <button onClick={() => { if (step < 2) setStep(s => s + 1); else handleComplete(); }}
            className="px-6 py-2 text-sm font-medium rounded bg-mc-info hover:bg-mc-info/80 transition-colors flex items-center gap-2">
            {step < 2 ? (<>次へ <ArrowRight size={14} /></>) : (<>システムを作成 <Settings size={14} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// GALLERY LANDING (when no file is selected)
// ════════════════════════════════════════════════════════════

const GALLERY_MINIGAME_ICONS = {
  tag_game: 'minecraft:leather_boots', pvp_arena: 'minecraft:diamond_sword', spleef: 'minecraft:diamond_shovel',
  race: 'minecraft:golden_boots', treasure_hunt: 'minecraft:chest', king_of_hill: 'minecraft:golden_helmet',
  zombie_survival: 'minecraft:rotten_flesh', build_battle: 'minecraft:bricks', capture_flag: 'minecraft:red_banner',
  tnt_run: 'minecraft:tnt',
};
const GALLERY_SYSTEM_ICONS = {
  custom_weapon: 'minecraft:netherite_sword', shop_npc: 'minecraft:emerald', teleport_system: 'minecraft:ender_pearl',
  loot_box: 'minecraft:chest', recipe_set: 'minecraft:crafting_table', boss_fight: 'minecraft:wither_skeleton_skull',
  lobby_system: 'minecraft:compass',
};

// ════════════════════════════════════════════════════════════
// VISUAL GUIDE (Interactive tutorial overlay)
// ════════════════════════════════════════════════════════════

const GUIDE_PAGES = [
  {
    id: 'welcome',
    title: 'DataPack Builder へようこそ！',
    subtitle: 'ノーコードでMinecraftデータパックが作れるツール',
    icon: 'minecraft:crafting_table',
    color: '#4fc3f7',
    content: [
      { type:'hero', items:['minecraft:diamond_pickaxe','minecraft:crafting_table','minecraft:command_block','minecraft:enchanted_book','minecraft:chest'] },
      { type:'text', text:'このツールでは、プログラミング不要でMinecraft Java Edition 1.21対応のデータパックを作成できます。' },
      { type:'features', items:[
        { icon:'minecraft:diamond_sword', title:'ミニゲーム作成', desc:'10種のミニゲームをウィザードで自動生成', color:'#4caf50' },
        { icon:'minecraft:redstone', title:'システム部品', desc:'7種のゲームシステムを一括生成', color:'#ab47bc' },
        { icon:'minecraft:command_block', title:'コマンドビルダー', desc:'22種のコマンドをボタンで組み立て', color:'#4fc3f7' },
        { icon:'minecraft:writable_book', title:'VS Code風エディタ', desc:'構文ハイライト＋オートコンプリート搭載', color:'#ff9800' },
      ]},
    ],
  },
  {
    id: 'setup',
    title: 'STEP 1: プロジェクト作成',
    subtitle: '初期設定ウィザードでパックの基本情報を入力',
    icon: 'minecraft:compass',
    color: '#4caf50',
    content: [
      { type:'steps', items:[
        { num:'1', icon:'minecraft:name_tag', title:'パック名を入力', desc:'データパックの名前を設定します（例: my-pvp-game）' },
        { num:'2', icon:'minecraft:oak_sign', title:'名前空間を設定', desc:'一意の識別子です。英数字とアンダーバーが使えます（例: mygame）' },
        { num:'3', icon:'minecraft:paper', title:'バージョン選択', desc:'対象のMinecraftバージョンを選びます（1.21〜1.21.11対応）' },
        { num:'4', icon:'minecraft:chest', title:'テンプレート選択', desc:'tick/load関数やサンプルレシピなど初期ファイルを選べます' },
      ]},
      { type:'tip', text:'名前空間は他のデータパックと被らないユニークな名前にしましょう。チーム名やプロジェクト名がおすすめです。' },
    ],
  },
  {
    id: 'minigame',
    title: 'STEP 2: ミニゲーム / システム作成',
    subtitle: 'ウィザードでテンプレートを選んで自動生成',
    icon: 'minecraft:diamond_sword',
    color: '#f44336',
    content: [
      { type:'text', text:'「ミニゲーム作成」または「システム部品」ボタンからウィザードを開きます。3ステップで完成！' },
      { type:'grid', columns:5, items:[
        { icon:'minecraft:leather_boots', name:'鬼ごっこ', color:'#4caf50' },
        { icon:'minecraft:diamond_sword', name:'PVP', color:'#f44336' },
        { icon:'minecraft:diamond_shovel', name:'スプリーフ', color:'#4fc3f7' },
        { icon:'minecraft:golden_boots', name:'レース', color:'#ff9800' },
        { icon:'minecraft:chest', name:'宝探し', color:'#ab47bc' },
        { icon:'minecraft:golden_helmet', name:'陣取り', color:'#fdd835' },
        { icon:'minecraft:rotten_flesh', name:'ゾンビ', color:'#8bc34a' },
        { icon:'minecraft:bricks', name:'建築', color:'#78909c' },
        { icon:'minecraft:red_banner', name:'旗取り', color:'#e91e63' },
        { icon:'minecraft:tnt', name:'TNTラン', color:'#ff5722' },
      ]},
      { type:'steps', items:[
        { num:'1', icon:'minecraft:diamond_sword', title:'種類を選択', desc:'10種のミニゲームまたは7種のシステムから選択' },
        { num:'2', icon:'minecraft:anvil', title:'設定カスタマイズ', desc:'チーム数、制限時間、範囲、報酬などを調整' },
        { num:'3', icon:'minecraft:writable_book', title:'自動生成', desc:'必要なmcfunction/JSONファイルが全て生成されます' },
      ]},
    ],
  },
  {
    id: 'editor',
    title: 'STEP 3: 統合エディタで編集',
    subtitle: 'VS Code風コードエディタ＋コマンドツールが一体化',
    icon: 'minecraft:command_block',
    color: '#4fc3f7',
    content: [
      { type:'text', text:'.mcfunction ファイルを選択すると、VS Code風エディタが開きます。右サイドバーにコマンドツールが統合されています。' },
      { type:'editorLayout', sections:[
        { area:'left', title:'コードエディタ', items:['シンタックスハイライト（コマンド: 青、セレクター: オレンジ）','行番号 + エラー/警告マーカー','オートコンプリート（入力中に自動表示）','ステータスバー（行/列、エラー数）'] },
        { area:'right', title:'コマンドツール', items:['クイック: 16種ワンクリック挿入','ビルダー: フォームでコマンド組立','テンプレ: ミニゲーム用スニペット','Ctrl+K: コマンドパレット検索'] },
      ]},
      { type:'tip', text:'Ctrl+K でコマンドパレットを開くと、全コマンド・テンプレートを横断検索して即挿入できます！' },
    ],
  },
  {
    id: 'visual_editors',
    title: 'STEP 4: ビジュアルエディタ',
    subtitle: 'JSON ファイルはビジュアルで直感的に編集',
    icon: 'minecraft:crafting_table',
    color: '#ff9800',
    content: [
      { type:'text', text:'レシピ・ルートテーブル・進捗のJSONファイルは、自動的にビジュアルエディタに切り替わります。' },
      { type:'editorTypes', items:[
        { icon:'minecraft:crafting_table', name:'レシピエディタ', desc:'MC風3x3クラフトグリッドでレシピ編集。インベントリスロットにアイテムをドロップ＆設定', color:'#8bc34a' },
        { icon:'minecraft:chest', name:'ルートテーブルエディタ', desc:'確率バーでドロップ率を視覚調整。各エントリにアイテムアイコン表示', color:'#ff9800' },
        { icon:'minecraft:golden_apple', name:'進捗エディタ', desc:'表示名・アイコン・条件・報酬をフォームで設定。フレームタイプ選択可', color:'#4fc3f7' },
      ]},
      { type:'modes', items:[
        { label:'ビジュアル', desc:'ビジュアルエディタのみ表示', icon:'🎨' },
        { label:'分割', desc:'ビジュアル＋コードを並列表示', icon:'⬛' },
        { label:'コード', desc:'JSONを直接編集', icon:'📝' },
      ]},
    ],
  },
  {
    id: 'builder_tab',
    title: 'コマンドビルダータブ',
    subtitle: 'フルサイズのコマンド組み立てパネル',
    icon: 'minecraft:experience_bottle',
    color: '#ab47bc',
    content: [
      { type:'text', text:'「ビルダー」タブでは、さらに詳細にコマンドを組み立てられます。カテゴリから選んでフォームに入力するだけ！' },
      { type:'grid', columns:4, items:[
        { icon:'minecraft:chest', name:'アイテム', color:'#4caf50' },
        { icon:'minecraft:potion', name:'エフェクト', color:'#e91e63' },
        { icon:'minecraft:ender_pearl', name:'移動', color:'#4fc3f7' },
        { icon:'minecraft:name_tag', name:'テキスト', color:'#ff9800' },
        { icon:'minecraft:firework_rocket', name:'演出', color:'#ab47bc' },
        { icon:'minecraft:book', name:'スコア', color:'#8bc34a' },
        { icon:'minecraft:grass_block', name:'ゲーム管理', color:'#795548' },
        { icon:'minecraft:shield', name:'チーム/BB', color:'#607d8b' },
      ]},
      { type:'tip', text:'ビルダーで生成したコマンドは「ファイルに挿入」ボタンで、選択中の.mcfunctionファイルに直接追加されます。' },
    ],
  },
  {
    id: 'download',
    title: 'STEP 5: ダウンロード & 使い方',
    subtitle: 'ZIPでエクスポートしてMinecraftに導入',
    icon: 'minecraft:chest',
    color: '#fdd835',
    content: [
      { type:'steps', items:[
        { num:'1', icon:'minecraft:writable_book', title:'プレビュー確認', desc:'「プレビュー」タブでファイル構造とエラーを確認' },
        { num:'2', icon:'minecraft:chest', title:'ZIPダウンロード', desc:'ヘッダーの「ZIPダウンロード」ボタンをクリック' },
        { num:'3', icon:'minecraft:grass_block', title:'datapacks に配置', desc:'.minecraft/saves/(ワールド名)/datapacks/ にZIPを置く' },
        { num:'4', icon:'minecraft:command_block', title:'/reload 実行', desc:'ゲーム内で /reload を実行してデータパックを読み込み' },
      ]},
      { type:'tip', text:'datapacks フォルダにZIPファイルをそのまま置くだけでOK！展開する必要はありません。' },
      { type:'shortcuts', items:[
        { key:'Ctrl+K', desc:'コマンドパレットを開く' },
        { key:'Tab', desc:'オートコンプリート確定 / インデント' },
        { key:'↑↓', desc:'補完候補の選択' },
        { key:'Esc', desc:'補完/パレットを閉じる' },
      ]},
    ],
  },
  // --- ここからデータパック導入の詳細ガイド ---
  {
    id: 'what_is_datapack',
    title: 'データパックとは？',
    subtitle: 'MODなしでMinecraftを拡張する公式の仕組み',
    icon: 'minecraft:knowledge_book',
    color: '#66bb6a',
    content: [
      { type:'hero', items:['minecraft:command_block','minecraft:writable_book','minecraft:crafting_table','minecraft:enchanting_table','minecraft:chest'] },
      { type:'text', text:'データパックは、Minecraft Java Edition公式のカスタマイズ機能です。MODとは違い、追加ソフトなしで使えます。' },
      { type:'features', items:[
        { icon:'minecraft:command_block', title:'コマンド関数', desc:'複数コマンドをまとめた.mcfunctionファイル', color:'#4fc3f7' },
        { icon:'minecraft:crafting_table', title:'カスタムレシピ', desc:'新しいクラフトレシピを追加・変更', color:'#ff9800' },
        { icon:'minecraft:chest', title:'ルートテーブル', desc:'チェスト・モブのドロップ品を変更', color:'#ab47bc' },
        { icon:'minecraft:golden_apple', title:'進捗（実績）', desc:'オリジナルの実績を作成', color:'#fdd835' },
      ]},
      { type:'text', text:'このツールで作ったデータパックは、ZIPファイルとしてダウンロードされます。それをMinecraftのワールドに入れるだけで動きます！' },
      { type:'tip', text:'データパックはワールドごとに管理されます。別のワールドで使いたい場合は、そのワールドにも配置が必要です。' },
    ],
  },
  {
    id: 'install_singleplay',
    title: '導入方法（シングルプレイ）',
    subtitle: 'WindowsでのZIPファイルの配置手順を解説',
    icon: 'minecraft:grass_block',
    color: '#4caf50',
    content: [
      { type:'text', text:'ダウンロードしたZIPファイルを、ワールドのdatapacksフォルダに入れるだけでOK！解凍は不要です。' },
      { type:'steps', items:[
        { num:'1', icon:'minecraft:chest', title:'ZIPをダウンロード', desc:'このツールの「ZIPダウンロード」ボタンでファイルを保存' },
        { num:'2', icon:'minecraft:oak_door', title:'Minecraftフォルダを開く', desc:'Windowsキー+R →「%AppData%\\.minecraft」と入力してEnter' },
        { num:'3', icon:'minecraft:grass_block', title:'saves → ワールド名を選択', desc:'savesフォルダの中から、データパックを入れたいワールドを選ぶ' },
        { num:'4', icon:'minecraft:barrel', title:'datapacks フォルダへ配置', desc:'ワールドフォルダ内の datapacks フォルダにZIPをコピー' },
        { num:'5', icon:'minecraft:command_block', title:'ゲーム内で /reload', desc:'ワールドに入って /reload コマンドを実行' },
      ]},
      { type:'folderTree', title:'配置先のフォルダ構造', items:[
        { depth:0, name:'.minecraft', icon:'📁' },
        { depth:1, name:'saves', icon:'📁' },
        { depth:2, name:'あなたのワールド名', icon:'🌍' },
        { depth:3, name:'datapacks', icon:'📁', highlight:true },
        { depth:4, name:'my-datapack.zip ← ここに配置！', icon:'📦', highlight:true },
      ]},
      { type:'warning', text:'チートがOFFだと /reload コマンドが使えません！ワールド設定で「チートの許可」をONにしてください。(LANに公開 → チートON でも可)' },
      { type:'tip', text:'datapacksフォルダが無い場合は、一度そのワールドに入ってから確認してください。自動で生成されます。' },
    ],
  },
  {
    id: 'install_server',
    title: '導入方法（マルチプレイ）',
    subtitle: 'サーバーでのデータパック導入手順',
    icon: 'minecraft:ender_pearl',
    color: '#7c4dff',
    content: [
      { type:'text', text:'マルチプレイサーバーでも同じ仕組みです。サーバーのワールドフォルダに配置します。' },
      { type:'steps', items:[
        { num:'1', icon:'minecraft:redstone', title:'サーバーを停止（推奨）', desc:'安全のため、サーバーを一度止めてから作業しましょう' },
        { num:'2', icon:'minecraft:compass', title:'ワールドフォルダを特定', desc:'server.properties の level-name を確認（デフォルトは「world」）' },
        { num:'3', icon:'minecraft:barrel', title:'datapacks に配置', desc:'world/datapacks/ にZIPファイルを置く' },
        { num:'4', icon:'minecraft:lever', title:'サーバー起動 or /reload', desc:'サーバーを起動するか、コンソールで reload コマンドを実行' },
        { num:'5', icon:'minecraft:spyglass', title:'動作確認', desc:'/datapack list enabled で有効になっているか確認' },
      ]},
      { type:'folderTree', title:'サーバーのフォルダ構造', items:[
        { depth:0, name:'server/', icon:'📁' },
        { depth:1, name:'server.properties', icon:'⚙️' },
        { depth:1, name:'server.jar', icon:'☕' },
        { depth:1, name:'world/ (level-nameで指定)', icon:'🌍' },
        { depth:2, name:'datapacks', icon:'📁', highlight:true },
        { depth:3, name:'my-datapack.zip ← ここに配置！', icon:'📦', highlight:true },
      ]},
      { type:'tip', text:'Realmsの場合: ワールドをダウンロード → データパック配置 → 再アップロード が必要です。' },
    ],
  },
  {
    id: 'commands_guide',
    title: 'データパック管理コマンド',
    subtitle: 'ゲーム内で使えるコマンド一覧',
    icon: 'minecraft:command_block',
    color: '#4fc3f7',
    content: [
      { type:'text', text:'データパックの読み込み・確認・実行に使うコマンドを覚えましょう。' },
      { type:'commandList', items:[
        { cmd:'/reload', desc:'全データパックを再読み込み。ファイルを変更した後はこれを実行！', color:'#4caf50' },
        { cmd:'/datapack list', desc:'有効・無効なデータパック一覧を表示', color:'#4fc3f7' },
        { cmd:'/datapack list enabled', desc:'現在有効なデータパックだけ表示', color:'#4fc3f7' },
        { cmd:'/datapack enable "file/パック名.zip"', desc:'データパックを有効化', color:'#66bb6a' },
        { cmd:'/datapack disable "file/パック名.zip"', desc:'データパックを無効化', color:'#f44336' },
        { cmd:'/function 名前空間:パス', desc:'指定した関数を手動実行（例: /function mygame:start）', color:'#ff9800' },
      ]},
      { type:'tip', text:'/function で実行するとき、.mcfunction の拡張子は書きません。data/mygame/function/utils/reset.mcfunction なら /function mygame:utils/reset です。' },
      { type:'warning', text:'コマンドを使うにはOP権限が必要です。シングルプレイではチートをONにしてください。' },
    ],
  },
  {
    id: 'folder_structure',
    title: 'データパックの構造',
    subtitle: 'フォルダとファイルの役割を理解しよう',
    icon: 'minecraft:bookshelf',
    color: '#ff9800',
    content: [
      { type:'text', text:'データパックには決まったフォルダ構造があります。このツールが自動で正しい構造を作ってくれるので安心！' },
      { type:'folderTree', title:'基本構造（1.21）', items:[
        { depth:0, name:'my-datapack.zip', icon:'📦' },
        { depth:1, name:'pack.mcmeta (必須！パックの情報)', icon:'📄' },
        { depth:1, name:'pack.png (任意 - パックのアイコン)', icon:'🖼️' },
        { depth:1, name:'data/', icon:'📁' },
        { depth:2, name:'名前空間/', icon:'📁' },
        { depth:3, name:'function/ (コマンド関数)', icon:'⚡' },
        { depth:3, name:'recipe/ (レシピ)', icon:'🔨' },
        { depth:3, name:'loot_table/ (ルートテーブル)', icon:'🎲' },
        { depth:3, name:'advancement/ (進捗)', icon:'⭐' },
        { depth:3, name:'predicate/ (条件判定)', icon:'❓' },
        { depth:3, name:'item_modifier/ (アイテム変更)', icon:'🔧' },
        { depth:3, name:'tags/ (タグ定義)', icon:'🏷️' },
        { depth:4, name:'function/ (関数タグ)', icon:'📋' },
      ]},
      { type:'warning', text:'1.21以降、フォルダ名は functions ではなく function（単数形）です！tags/functions も tags/function です。間違えると動きません。' },
      { type:'text', text:'tick.json と load.json は特別なタグです：' },
      { type:'features', items:[
        { icon:'minecraft:clock', title:'tick.json', desc:'毎ティック（1/20秒）自動実行される関数を登録', color:'#4fc3f7' },
        { icon:'minecraft:command_block', title:'load.json', desc:'/reload 時に一度だけ実行される関数を登録', color:'#66bb6a' },
      ]},
    ],
  },
  {
    id: 'troubleshoot',
    title: 'よくあるトラブル & 解決法',
    subtitle: '困ったときはここをチェック！',
    icon: 'minecraft:barrier',
    color: '#f44336',
    content: [
      { type:'text', text:'データパックが動かない？よくある原因と解決方法をまとめました。' },
      { type:'troubleList', items:[
        {
          problem:'データパックが認識されない',
          icon:'❌',
          causes:['ZIPの構造が間違っている（pack.mcmetaが最上位にない）','datapacks フォルダの場所が間違っている','pack_format の値がバージョンと合っていない'],
          solution:'ZIPを開いて最上位に pack.mcmeta と data/ があるか確認。このツールで作成したZIPは正しい構造です。',
        },
        {
          problem:'関数（function）が実行できない',
          icon:'⚠️',
          causes:['フォルダ名が functions になっている（正しくは function）','名前空間やパスが /function コマンドと一致しない','.mcfunction の拡張子を /function コマンドに含めてしまっている'],
          solution:'/function 名前空間:パス でパスを確認。拡張子は不要です。',
        },
        {
          problem:'コマンドが使えない / 権限エラー',
          icon:'🔒',
          causes:['シングルプレイでチートがOFFになっている','マルチプレイでOP権限がない'],
          solution:'シングル: ESC → LANに公開 → チートON。マルチ: /op コマンドでOP権限を付与。',
        },
        {
          problem:'/reload しても変更が反映されない',
          icon:'🔄',
          causes:['JSONファイルの構文エラー（カンマやカッコの不足）','ファイルのエンコードがUTF-8でない','キャッシュが残っている'],
          solution:'F3+T で再読み込み、またはワールドに入り直してみてください。',
        },
        {
          problem:'pack_format が合わないと表示される',
          icon:'📋',
          causes:['Minecraftのバージョンとpack_formatの値が一致しない'],
          solution:'このツールではバージョン選択で自動設定されるので、正しいバージョンを選んでください。\n1.21=48, 1.21.2=57, 1.21.5=71',
        },
      ]},
      { type:'tip', text:'このツールで作成したデータパックは、自動的に正しいフォルダ構造・pack_formatで生成されます。手動で構造を変えなければ基本的に問題は起きません。' },
    ],
  },
  {
    id: 'tips_advanced',
    title: 'ヒント & 次のステップ',
    subtitle: 'データパック作成をもっと楽しもう！',
    icon: 'minecraft:nether_star',
    color: '#fdd835',
    content: [
      { type:'hero', items:['minecraft:nether_star','minecraft:diamond','minecraft:emerald','minecraft:totem_of_undying','minecraft:enchanted_golden_apple'] },
      { type:'text', text:'おめでとう！ここまでで基本はマスターしました。さらにスキルアップするためのヒントです。' },
      { type:'features', items:[
        { icon:'minecraft:redstone', title:'tick関数を活用', desc:'毎ティック実行でゲームループを作ろう（タイマー、スコア判定）', color:'#f44336' },
        { icon:'minecraft:name_tag', title:'スコアボードを使う', desc:'プレイヤーのスコアを管理してゲーム進行を制御', color:'#4fc3f7' },
        { icon:'minecraft:armor_stand', title:'マーカーエンティティ', desc:'Armor Standをマーカーにして座標管理に活用', color:'#ff9800' },
        { icon:'minecraft:writable_book', title:'tellraw で演出', desc:'カラフルなチャットメッセージでプレイヤーに情報を伝える', color:'#66bb6a' },
      ]},
      { type:'steps', items:[
        { num:'✓', icon:'minecraft:crafting_table', title:'まずはテンプレートから始める', desc:'ミニゲームウィザードで自動生成 → 中身を読んで学ぶ' },
        { num:'✓', icon:'minecraft:anvil', title:'少しずつカスタマイズ', desc:'生成されたコマンドを変更して、動きの違いを確認' },
        { num:'✓', icon:'minecraft:enchanting_table', title:'オリジナル機能を追加', desc:'コマンドビルダーで新しいコマンドを組み立てて追加' },
        { num:'✓', icon:'minecraft:nether_star', title:'完全オリジナルを作成', desc:'空のプロジェクトから自分だけのゲームを作ろう！' },
      ]},
      { type:'tip', text:'このガイドはいつでも「ガイド」ボタンから開けます。困ったら何度でも見返してください！' },
    ],
  },
  // --- ここからコマンド学習ガイド ---
  {
    id: 'cmd_basics',
    title: 'コマンドの基礎',
    subtitle: 'mcfunctionファイルの書き方を一から学ぼう',
    icon: 'minecraft:writable_book',
    color: '#4fc3f7',
    content: [
      { type:'text', text:'データパックの中心は「コマンド」です。コマンドは、ゲーム内で何かを実行する指示文です。チャットで / を付けて入力するものと同じですが、.mcfunction ファイルでは / は不要です。' },
      { type:'commandList', items:[
        { cmd:'say Hello World', desc:'チャットにメッセージを表示する — 最もシンプルなコマンド', color:'#4caf50' },
        { cmd:'give @s diamond 1', desc:'自分にダイヤモンドを1個与える — <対象> <アイテム> <数量>', color:'#4fc3f7' },
        { cmd:'effect give @a speed 30 1', desc:'全員に30秒間のスピードLv2を付与 — エフェクトの基本', color:'#ab47bc' },
        { cmd:'tp @s 0 64 0', desc:'自分を座標(0, 64, 0)にテレポート — 座標指定の基本', color:'#ff9800' },
      ]},
      { type:'text', text:'コマンドの基本構造: コマンド名 → 対象（誰に） → 何を → どうする' },
      { type:'features', items:[
        { icon:'minecraft:command_block', title:'コマンド名', desc:'give, effect, tp, summon など実行する動作', color:'#4fc3f7' },
        { icon:'minecraft:player_head', title:'対象 (セレクター)', desc:'@a (全員), @s (自分), @p (最寄り) で対象を指定', color:'#ff9800' },
        { icon:'minecraft:diamond', title:'引数', desc:'アイテム名・座標・数値など、コマンドに渡す情報', color:'#66bb6a' },
        { icon:'minecraft:book', title:'コメント', desc:'# で始まる行はコメント（メモ）。実行されません', color:'#999' },
      ]},
      { type:'tip', text:'.mcfunctionファイルでは1行に1コマンドを書きます。# で始まる行はコメント（説明メモ）になります。' },
      { type:'warning', text:'よくあるミス: .mcfunction では先頭の / は不要です！/ を付けるとエラーになります。チャットでは / が必要ですが、ファイルでは省略します。' },
      { type:'tip', text:'行末に \\ を書くと次の行に続けることができます（1.20.2+）。長いコマンドを見やすく改行できます。' },
    ],
  },
  {
    id: 'selectors_guide',
    title: 'セレクター完全ガイド',
    subtitle: '@ マークの後の文字で「誰を対象にするか」を決める',
    icon: 'minecraft:player_head',
    color: '#ff9800',
    content: [
      { type:'text', text:'セレクターは「誰を対象にするか」を指定する記号です。@の後に1文字で対象が変わります。' },
      { type:'features', items:[
        { icon:'minecraft:player_head', title:'@a — 全プレイヤー', desc:'サーバー内の全プレイヤーが対象になります', color:'#4caf50' },
        { icon:'minecraft:compass', title:'@p — 最寄りのプレイヤー', desc:'コマンドの実行位置から一番近いプレイヤー1人', color:'#4fc3f7' },
        { icon:'minecraft:ender_pearl', title:'@r — ランダムなプレイヤー', desc:'プレイヤーの中からランダムに1人を選びます', color:'#ab47bc' },
        { icon:'minecraft:armor_stand', title:'@s — 実行者自身', desc:'コマンドを実行したエンティティ（自分自身）', color:'#ff9800' },
        { icon:'minecraft:zombie_head', title:'@e — 全エンティティ', desc:'モブ・防具立てなど全てのエンティティ（プレイヤー含む）', color:'#f44336' },
        { icon:'minecraft:spyglass', title:'@n — 最寄りエンティティ', desc:'1.21+で追加。プレイヤー以外も含む最寄り1体', color:'#fdd835' },
      ]},
      { type:'text', text:'セレクター引数: [ ] の中に条件を書くと、対象を絞り込めます。' },
      { type:'commandList', items:[
        { cmd:'@a[tag=mytag]', desc:'「mytag」タグを持つ全プレイヤー', color:'#4caf50' },
        { cmd:'@e[type=zombie,distance=..10]', desc:'半径10ブロック以内の全ゾンビ', color:'#f44336' },
        { cmd:'@a[scores={point=10..}]', desc:'「point」スコアが10以上の全プレイヤー', color:'#4fc3f7' },
        { cmd:'@e[type=!player,limit=5,sort=nearest]', desc:'プレイヤー以外で最寄り5体', color:'#ab47bc' },
        { cmd:'@a[gamemode=survival]', desc:'サバイバルモードの全プレイヤー', color:'#ff9800' },
      ]},
      { type:'tip', text:'引数はカンマで区切って複数指定できます。tag, type, distance, limit, sort が最もよく使います。' },
      { type:'warning', text:'@e はプレイヤーも含みます！モブだけを対象にしたい場合は @e[type=!player] と書きましょう。' },
      { type:'tip', text:'tp や data merge のように「対象が1体だけ」のコマンドで @a を使うとエラーになることがあります。その場合は @a[limit=1] や @p を使いましょう。' },
    ],
  },
  {
    id: 'coordinates_guide',
    title: '座標の使い方',
    subtitle: '3種類の座標を使い分けよう — 絶対・相対・ローカル',
    icon: 'minecraft:map',
    color: '#66bb6a',
    content: [
      { type:'text', text:'Minecraftの座標は X(東西), Y(上下), Z(南北) の3つの数値です。座標の指定方法は3種類あります。' },
      { type:'features', items:[
        { icon:'minecraft:compass', title:'絶対座標（数値のみ）', desc:'0 64 0 → ワールドの固定位置を直接指定', color:'#4fc3f7' },
        { icon:'minecraft:ender_pearl', title:'相対座標（~ チルダ）', desc:'~ ~2 ~ → 現在位置からの相対距離（+2ブロック上）', color:'#ff9800' },
        { icon:'minecraft:spyglass', title:'ローカル座標（^ キャレット）', desc:'^ ^ ^5 → 視線方向に5ブロック前（向きに依存）', color:'#ab47bc' },
      ]},
      { type:'commandList', items:[
        { cmd:'tp @s 100 64 200', desc:'絶対座標: X=100, Y=64, Z=200 にテレポート', color:'#4fc3f7' },
        { cmd:'tp @s ~ ~10 ~', desc:'相対座標: 今の位置から10ブロック上にテレポート', color:'#ff9800' },
        { cmd:'tp @s ~ ~ ~5', desc:'相対座標: 今の位置から南に5ブロック移動', color:'#ff9800' },
        { cmd:'summon creeper ~ ~ ~3', desc:'相対座標: 自分の3ブロック南にクリーパーを出す', color:'#66bb6a' },
        { cmd:'particle flame ^ ^ ^2', desc:'ローカル座標: 顔の前方2ブロックにパーティクル', color:'#ab47bc' },
      ]},
      { type:'text', text:'Y座標の目安: 海面=Y63, ダイヤ鉱石=Y-60～16, ネザー天井=Y128, ビルド上限=Y320' },
      { type:'tip', text:'~ だけ書くと「今の位置と同じ」（= ~0）です。~ ~1 ~ は「1ブロック上」を意味します。' },
      { type:'warning', text:'~ と ^ は混ぜて使えません！ ~5 ~ ^3 はエラーになります。3つとも同じ種類で揃えてください。' },
    ],
  },
  {
    id: 'scoreboard_guide',
    title: 'スコアボード入門',
    subtitle: 'スコアで数値を管理して、ゲームのロジックを作ろう',
    icon: 'minecraft:experience_bottle',
    color: '#4fc3f7',
    content: [
      { type:'text', text:'スコアボードは「プレイヤーごとに数値を記録する仕組み」です。タイマー、ポイント、フラグなど様々な用途に使えます。' },
      { type:'steps', items:[
        { num:'1', icon:'minecraft:writable_book', title:'目的(objective)を作る', desc:'scoreboard objectives add point dummy "ポイント"' },
        { num:'2', icon:'minecraft:experience_bottle', title:'値を設定する', desc:'scoreboard players set @a point 0  ← 全員のpointを0に' },
        { num:'3', icon:'minecraft:golden_apple', title:'値を増減する', desc:'scoreboard players add @s point 1  ← 自分のpointを+1' },
        { num:'4', icon:'minecraft:spyglass', title:'値を確認する', desc:'scoreboard players get @s point  ← 自分のpointを表示' },
        { num:'5', icon:'minecraft:name_tag', title:'サイドバーに表示', desc:'scoreboard objectives setdisplay sidebar point  ← 常時表示' },
      ]},
      { type:'text', text:'よく使う基準(criteria):' },
      { type:'features', items:[
        { icon:'minecraft:paper', title:'dummy', desc:'コマンドでのみ変化。最も汎用的（ポイント、フラグ等）', color:'#4fc3f7' },
        { icon:'minecraft:diamond_sword', title:'playerKillCount', desc:'プレイヤーキル数で自動増加', color:'#f44336' },
        { icon:'minecraft:skull_banner_pattern', title:'deathCount', desc:'死亡回数で自動増加', color:'#999' },
        { icon:'minecraft:redstone', title:'trigger', desc:'プレイヤー自身が /trigger で操作可能', color:'#ff9800' },
      ]},
      { type:'commandList', items:[
        { cmd:'execute if score @s point matches 10.. run say 10点達成！', desc:'ポイントが10以上なら実行する条件分岐', color:'#66bb6a' },
        { cmd:'scoreboard players operation @s point += @s kills', desc:'killsの値をpointに加算（演算）', color:'#ab47bc' },
      ]},
      { type:'tip', text:'dummy がオールマイティで一番使います。タイマー・フラグ・カウンターなど何にでも使えます。' },
    ],
  },
  {
    id: 'tag_execute_guide',
    title: 'タグと execute',
    subtitle: 'エンティティの分類と条件付き実行をマスターしよう',
    icon: 'minecraft:name_tag',
    color: '#ab47bc',
    content: [
      { type:'text', text:'タグ: エンティティに「ラベル」を付ける機能です。セレクターで [tag=xxx] を使って、タグを持つエンティティだけを対象にできます。' },
      { type:'commandList', items:[
        { cmd:'tag @s add runner', desc:'自分に「runner」タグを追加', color:'#4caf50' },
        { cmd:'tag @s remove runner', desc:'自分から「runner」タグを削除', color:'#f44336' },
        { cmd:'tag @s list', desc:'自分のタグ一覧を表示', color:'#4fc3f7' },
        { cmd:'give @a[tag=runner] leather_boots', desc:'runnerタグを持つプレイヤーにブーツを付与', color:'#ff9800' },
        { cmd:'execute as @a[tag=!runner] run say 鬼です', desc:'runnerタグを持たない人がメッセージ送信', color:'#ab47bc' },
      ]},
      { type:'text', text:'execute: 最も強力なコマンド。「誰として」「どこで」「どんな条件で」コマンドを実行するかを指定できます。' },
      { type:'features', items:[
        { icon:'minecraft:player_head', title:'as <対象>', desc:'「誰として」実行するかを変更。@sが変わる', color:'#4fc3f7' },
        { icon:'minecraft:compass', title:'at <対象>', desc:'「どの位置で」実行するかを変更。~ ~ ~が変わる', color:'#ff9800' },
        { icon:'minecraft:redstone', title:'if <条件>', desc:'条件が真のときだけ実行する（スコア判定、エンティティ存在等）', color:'#66bb6a' },
        { icon:'minecraft:barrier', title:'unless <条件>', desc:'条件が偽のときだけ実行する（ifの逆）', color:'#f44336' },
        { icon:'minecraft:ender_pearl', title:'in <ディメンション>', desc:'指定ディメンションで実行（overworld/the_nether/the_end）', color:'#ab47bc' },
        { icon:'minecraft:chest', title:'store result', desc:'コマンドの実行結果をスコアやNBTに保存', color:'#fdd835' },
      ]},
      { type:'commandList', items:[
        { cmd:'execute as @a at @s run particle flame ~ ~1 ~', desc:'全プレイヤーの頭上にパーティクル', color:'#4caf50' },
        { cmd:'execute if entity @e[type=zombie,distance=..5] run say ゾンビが近い！', desc:'近くにゾンビがいれば警告', color:'#f44336' },
        { cmd:'execute as @a if score @s timer matches 0 run title @s title {"text":"スタート！","color":"green"}', desc:'タイマーが0の人にタイトル表示', color:'#ff9800' },
      ]},
      { type:'tip', text:'execute は「as → at → if/unless → run」の順に書くのが基本パターンです。run の後に実行したいコマンドを書きます。' },
      { type:'warning', text:'as と at は別物です！as は「誰として（@sが変わる）」、at は「どこで（座標が変わる）」です。モブの位置でコマンドを実行するなら両方必要: execute as @e at @s run ...' },
    ],
  },
  {
    id: 'practice_steps',
    title: '実践: データパック構築ステップ',
    subtitle: 'ゼロから完成まで — この順番で進めれば迷わない！',
    icon: 'minecraft:golden_pickaxe',
    color: '#fdd835',
    content: [
      { type:'text', text:'データパックを一から作る場合の推奨手順です。このツールのウィザードで自動生成した後に、カスタマイズする際にも参考になります。' },
      { type:'steps', items:[
        { num:'1', icon:'minecraft:crafting_table', title:'プロジェクト初期設定', desc:'名前・名前空間・バージョンを決める。tick.json と load.json テンプレートを選ぶ' },
        { num:'2', icon:'minecraft:command_block', title:'load関数を作る', desc:'初期化処理を書く: scoreboard objectives add, team add, gamerule 設定など' },
        { num:'3', icon:'minecraft:clock', title:'tick関数を作る', desc:'毎秒実行したい処理: タイマー減算、スコア判定、エリア判定など' },
        { num:'4', icon:'minecraft:diamond_sword', title:'ゲーム開始関数', desc:'start.mcfunction: チーム振り分け、tp、アイテム配布、スコアリセット' },
        { num:'5', icon:'minecraft:golden_apple', title:'ゲーム進行関数', desc:'条件分岐でイベント発生: if score → 報酬、if entity → 敵出現など' },
        { num:'6', icon:'minecraft:firework_rocket', title:'ゲーム終了関数', desc:'end.mcfunction: 勝者判定、タイトル表示、スコアリセット、初期化' },
        { num:'7', icon:'minecraft:writable_book', title:'テスト & 調整', desc:'/reload → /function で実行テスト。tellraw でデバッグ出力' },
      ]},
      { type:'text', text:'典型的なファイル構成例:' },
      { type:'folderTree', title:'ミニゲーム型データパック例', items:[
        { depth:0, name:'data/mygame/', icon:'📁' },
        { depth:1, name:'function/', icon:'📁' },
        { depth:2, name:'load.mcfunction (初期化)', icon:'⚡' },
        { depth:2, name:'tick.mcfunction (毎tick処理)', icon:'🔄' },
        { depth:2, name:'start.mcfunction (ゲーム開始)', icon:'▶️' },
        { depth:2, name:'end.mcfunction (ゲーム終了)', icon:'⏹️' },
        { depth:2, name:'join.mcfunction (参加処理)', icon:'➕' },
        { depth:2, name:'utils/', icon:'📁' },
        { depth:3, name:'reset.mcfunction (リセット)', icon:'🔄' },
        { depth:3, name:'timer.mcfunction (タイマー)', icon:'⏱️' },
      ]},
      { type:'commandList', items:[
        { cmd:'# load.mcfunction の例', desc:'ゲーム初期化 — リロード時に1回実行', color:'#66bb6a' },
        { cmd:'scoreboard objectives add timer dummy', desc:'タイマー用スコアボードを作成', color:'#4fc3f7' },
        { cmd:'scoreboard objectives add point dummy "ポイント"', desc:'ポイント用スコアボードを作成', color:'#4fc3f7' },
        { cmd:'team add red "赤チーム"', desc:'赤チームを作成', color:'#f44336' },
        { cmd:'team add blue "青チーム"', desc:'青チームを作成', color:'#4fc3f7' },
        { cmd:'team modify red color red', desc:'赤チームの色を設定', color:'#f44336' },
        { cmd:'team modify blue color blue', desc:'青チームの色を設定', color:'#4fc3f7' },
        { cmd:'gamerule sendCommandFeedback false', desc:'コマンド実行ログを非表示に', color:'#999' },
        { cmd:'tellraw @a {"text":"データパック読込完了！","color":"green"}', desc:'読み込み完了メッセージ', color:'#66bb6a' },
      ]},
      { type:'warning', text:'load関数はプレイヤーがワールドに入る前に実行されます！load.mcfunction で @a を使った tellraw や title は、タイミング次第で見えないことがあります。表示系は start 関数に書きましょう。' },
      { type:'tip', text:'まずはウィザードでミニゲームを自動生成して、そのコードを読んで学ぶのが最速です！理解できたら少しずつ書き換えてみましょう。' },
    ],
  },
  {
    id: 'cmd_categories',
    title: 'コマンドカテゴリ一覧',
    subtitle: '目的別にコマンドを探そう — 何をしたいかで選ぶ',
    icon: 'minecraft:book',
    color: '#e91e63',
    content: [
      { type:'text', text:'「何がしたいか」から使うコマンドを見つけましょう。データパックでよく使うコマンドをカテゴリ別に紹介します。' },
      { type:'features', items:[
        { icon:'minecraft:diamond_sword', title:'アイテム系', desc:'give (付与) / clear (除去) / item replace (スロット操作) / loot (ルートテーブル)', color:'#4caf50' },
        { icon:'minecraft:ender_pearl', title:'移動・配置系', desc:'tp (テレポート) / summon (召喚) / setblock (ブロック) / fill (範囲ブロック)', color:'#4fc3f7' },
        { icon:'minecraft:potion', title:'エフェクト系', desc:'effect give/clear (状態効果) / attribute (ステータス変更) / damage (ダメージ)', color:'#ab47bc' },
        { icon:'minecraft:name_tag', title:'表示・演出系', desc:'title (タイトル) / tellraw (装飾メッセージ) / bossbar (ボスバー) / particle (パーティクル)', color:'#ff9800' },
        { icon:'minecraft:redstone', title:'制御・ロジック系', desc:'execute (条件実行) / scoreboard (スコア管理) / tag (ラベル) / function (関数呼出)', color:'#f44336' },
        { icon:'minecraft:grass_block', title:'ゲーム管理系', desc:'gamemode / gamerule / difficulty / weather / time / worldborder', color:'#795548' },
        { icon:'minecraft:shield', title:'チーム・協力系', desc:'team (チーム管理) / bossbar (共有UI) / schedule (遅延実行)', color:'#607d8b' },
        { icon:'minecraft:clock', title:'タイミング系', desc:'schedule (遅延実行) / tick.json (毎tick) / load.json (初回実行)', color:'#fdd835' },
      ]},
      { type:'text', text:'初心者がまず覚えるべきコマンド TOP 10:' },
      { type:'commandList', items:[
        { cmd:'1. give', desc:'アイテムを渡す — 報酬配布に必須', color:'#4caf50' },
        { cmd:'2. tp', desc:'テレポート — ゲーム開始時のスポーン移動', color:'#4fc3f7' },
        { cmd:'3. effect', desc:'状態効果 — スピード/耐性/暗視など', color:'#ab47bc' },
        { cmd:'4. scoreboard', desc:'スコア管理 — ポイント/タイマーの記録', color:'#f44336' },
        { cmd:'5. execute', desc:'条件実行 — 「もし〇〇なら」の制御', color:'#ff9800' },
        { cmd:'6. tag', desc:'タグ管理 — チーム分け/状態フラグ', color:'#66bb6a' },
        { cmd:'7. title', desc:'タイトル表示 — 大きなテキスト演出', color:'#fdd835' },
        { cmd:'8. tellraw', desc:'装飾メッセージ — カラフルなチャット', color:'#e91e63' },
        { cmd:'9. function', desc:'関数呼出 — 他のファイルを実行', color:'#795548' },
        { cmd:'10. summon', desc:'エンティティ召喚 — モブ/防具立て出現', color:'#607d8b' },
      ]},
      { type:'tip', text:'このツールの「コマンドビルダー」タブで、これら全てをボタンで組み立てられます！引数を覚える必要はありません。' },
    ],
  },
];

function VisualGuide({ onClose }) {
  const [page, setPage] = useState(0);
  const current = GUIDE_PAGES[page];
  const isFirst = page === 0;
  const isLast = page === GUIDE_PAGES.length - 1;

  const renderContent = (block, idx) => {
    switch (block.type) {
      case 'hero':
        return (
          <div key={idx} style={{display:'flex',justifyContent:'center',gap:8,padding:'12px 0'}}>
            {block.items.map(id => <McInvSlot key={id} id={id} size={48} />)}
          </div>
        );
      case 'text':
        return <p key={idx} style={{fontSize:13,color:'#ccc',lineHeight:1.7,margin:'8px 0'}}>{block.text}</p>;
      case 'features':
        return (
          <div key={idx} style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,margin:'12px 0'}}>
            {block.items.map((f,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'#1a1a2e',border:`1px solid ${f.color}30`}}>
                <McInvSlot id={f.icon} size={36} />
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:f.color}}>{f.title}</div>
                  <div style={{fontSize:10,color:'#999'}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'steps':
        return (
          <div key={idx} style={{display:'flex',flexDirection:'column',gap:6,margin:'12px 0'}}>
            {block.items.map((s,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:'#12121e',border:'1px solid #2a2a4a'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'#4fc3f720',border:'2px solid #4fc3f7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#4fc3f7',flexShrink:0}}>{s.num}</div>
                <McIcon id={s.icon} size={24} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#eee'}}>{s.title}</div>
                  <div style={{fontSize:10,color:'#999'}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'grid':
        return (
          <div key={idx} style={{display:'grid',gridTemplateColumns:`repeat(${block.columns},1fr)`,gap:6,margin:'12px 0'}}>
            {block.items.map((g,i) => (
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'8px 4px',borderRadius:6,background:'#12121e',border:'1px solid #2a2a4a'}}>
                <McInvSlot id={g.icon} size={32} />
                <span style={{fontSize:10,fontWeight:600,color:g.color,textAlign:'center'}}>{g.name}</span>
              </div>
            ))}
          </div>
        );
      case 'tip':
        return (
          <div key={idx} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',borderRadius:8,background:'#1a3a1a',border:'1px solid #4caf5040',margin:'8px 0'}}>
            <span style={{fontSize:16,flexShrink:0}}>💡</span>
            <p style={{fontSize:11,color:'#a5d6a7',lineHeight:1.6,margin:0}}>{block.text}</p>
          </div>
        );
      case 'editorLayout':
        return (
          <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'12px 0'}}>
            {block.sections.map((sec,i) => (
              <div key={i} style={{padding:12,borderRadius:8,background: sec.area === 'left' ? '#0d1a2a' : '#1a0d2a',border:`1px solid ${sec.area === 'left' ? '#4fc3f730' : '#ab47bc30'}`}}>
                <div style={{fontSize:12,fontWeight:700,color: sec.area === 'left' ? '#4fc3f7' : '#ce93d8',marginBottom:8,display:'flex',alignItems:'center',gap:4}}>
                  {sec.area === 'left' ? '📝' : '🔧'} {sec.title}
                </div>
                <ul style={{margin:0,paddingLeft:16,listStyleType:'disc'}}>
                  {sec.items.map((item,j) => (
                    <li key={j} style={{fontSize:10,color:'#bbb',marginBottom:3,lineHeight:1.5}}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      case 'editorTypes':
        return (
          <div key={idx} style={{display:'flex',flexDirection:'column',gap:8,margin:'12px 0'}}>
            {block.items.map((ed,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'#12121e',border:`1px solid ${ed.color}30`}}>
                <McInvSlot id={ed.icon} size={40} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:ed.color}}>{ed.name}</div>
                  <div style={{fontSize:10,color:'#999',lineHeight:1.5}}>{ed.desc}</div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'modes':
        return (
          <div key={idx} style={{display:'flex',gap:6,justifyContent:'center',margin:'12px 0'}}>
            {block.items.map((m,i) => (
              <div key={i} style={{padding:'8px 16px',borderRadius:6,background:'#1a1a2e',border:'1px solid #3a3a5a',textAlign:'center',flex:1}}>
                <div style={{fontSize:20,marginBottom:4}}>{m.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#ddd'}}>{m.label}</div>
                <div style={{fontSize:9,color:'#888'}}>{m.desc}</div>
              </div>
            ))}
          </div>
        );
      case 'shortcuts':
        return (
          <div key={idx} style={{margin:'12px 0'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:6}}>キーボードショートカット</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {block.items.map((sc,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 8px',borderRadius:4,background:'#12121e'}}>
                  <kbd style={{padding:'2px 8px',borderRadius:3,background:'#2a2a4a',border:'1px solid #444',fontSize:10,fontFamily:'monospace',color:'#4fc3f7',whiteSpace:'nowrap'}}>{sc.key}</kbd>
                  <span style={{fontSize:10,color:'#999'}}>{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'warning':
        return (
          <div key={idx} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',borderRadius:8,background:'#3a1a1a',border:'1px solid #f4474740',margin:'8px 0'}}>
            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
            <p style={{fontSize:11,color:'#ef9a9a',lineHeight:1.6,margin:0}}>{block.text}</p>
          </div>
        );
      case 'folderTree':
        return (
          <div key={idx} style={{margin:'12px 0',padding:12,borderRadius:8,background:'#0a0a1a',border:'1px solid #2a2a4a'}}>
            {block.title && <div style={{fontSize:11,fontWeight:700,color:'#aaa',marginBottom:8}}>{block.title}</div>}
            {block.items.map((item,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:6,paddingLeft: item.depth * 20,paddingTop:3,paddingBottom:3}}>
                <span style={{fontSize:13,flexShrink:0}}>{item.icon}</span>
                <span style={{fontSize:11,color: item.highlight ? '#4fc3f7' : '#bbb',fontWeight: item.highlight ? 700 : 400,fontFamily:'monospace'}}>{item.name}</span>
              </div>
            ))}
          </div>
        );
      case 'commandList':
        return (
          <div key={idx} style={{display:'flex',flexDirection:'column',gap:6,margin:'12px 0'}}>
            {block.items.map((c,i) => (
              <div key={i} style={{padding:'8px 12px',borderRadius:8,background:'#0a0a1a',border:`1px solid ${c.color}30`}}>
                <code style={{fontSize:12,fontWeight:700,color:c.color,fontFamily:'monospace',display:'block',marginBottom:4}}>{c.cmd}</code>
                <div style={{fontSize:10,color:'#999'}}>{c.desc}</div>
              </div>
            ))}
          </div>
        );
      case 'troubleList':
        return (
          <div key={idx} style={{display:'flex',flexDirection:'column',gap:8,margin:'12px 0'}}>
            {block.items.map((t,i) => (
              <div key={i} style={{padding:12,borderRadius:8,background:'#12121e',border:'1px solid #3a3a5a'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <span style={{fontSize:16}}>{t.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'#ff8a80'}}>{t.problem}</span>
                </div>
                <div style={{fontSize:10,color:'#999',marginBottom:6}}>
                  <div style={{fontWeight:600,color:'#aaa',marginBottom:2}}>よくある原因:</div>
                  <ul style={{margin:0,paddingLeft:16}}>
                    {t.causes.map((c,j) => <li key={j} style={{marginBottom:2,lineHeight:1.4}}>{c}</li>)}
                  </ul>
                </div>
                <div style={{fontSize:11,color:'#a5d6a7',padding:'6px 8px',borderRadius:4,background:'#1a3a1a',border:'1px solid #4caf5020'}}>
                  💡 {t.solution}
                </div>
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={onClose}>
      <div style={{width:640,maxHeight:'85vh',background:'#111122',border:'1px solid #3a3a5a',borderRadius:12,boxShadow:'0 24px 80px rgba(0,0,0,0.9)',display:'flex',flexDirection:'column',overflow:'hidden'}}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:`2px solid ${current.color}40`,background:`linear-gradient(135deg, ${current.color}10, transparent)`,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <McInvSlot id={current.icon} size={40} />
            <div style={{flex:1}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:800,color:'#fff'}}>{current.title}</h2>
              <p style={{margin:0,fontSize:12,color:'#999'}}>{current.subtitle}</p>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',color:'#666',cursor:'pointer',fontSize:20,padding:4}}>✕</button>
          </div>
          {/* Page indicators */}
          <div style={{display:'flex',gap:4,marginTop:10}}>
            {GUIDE_PAGES.map((p,i) => (
              <button key={p.id} onClick={() => setPage(i)}
                style={{flex:1,height:4,borderRadius:2,border:'none',cursor:'pointer',background: i === page ? current.color : i < page ? `${current.color}60` : '#2a2a4a',transition:'background 0.3s'}} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
          {current.content.map(renderContent)}
        </div>

        {/* Footer navigation */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderTop:'1px solid #2a2a4a',flexShrink:0}}>
          <button onClick={() => setPage(p => p - 1)} disabled={isFirst}
            style={{padding:'6px 16px',fontSize:12,borderRadius:6,border:'1px solid #3a3a5a',background: isFirst ? '#1a1a2e' : '#2a2a4a',
              color: isFirst ? '#444' : '#ddd',cursor: isFirst ? 'default' : 'pointer',fontWeight:600}}>
            ← 前へ
          </button>
          <span style={{fontSize:11,color:'#666'}}>{page + 1} / {GUIDE_PAGES.length}</span>
          {isLast ? (
            <button onClick={onClose}
              style={{padding:'6px 20px',fontSize:12,borderRadius:6,border:'none',background:'#4fc3f7',color:'#000',cursor:'pointer',fontWeight:700}}>
              始める！
            </button>
          ) : (
            <button onClick={() => setPage(p => p + 1)}
              style={{padding:'6px 16px',fontSize:12,borderRadius:6,border:'none',background:current.color,color:'#000',cursor:'pointer',fontWeight:700}}>
              次へ →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryLanding({ onMinigame, onSystem, onBuilder, onGuide }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <McIcon id="minecraft:diamond_pickaxe" size={40} />
            <McIcon id="minecraft:crafting_table" size={40} />
            <McIcon id="minecraft:command_block" size={40} />
          </div>
          <h2 className="text-xl font-bold text-mc-bright mb-1">Minecraft DataPack Builder</h2>
          <p className="text-sm text-mc-muted max-w-md mx-auto">ボタンを選択するだけでMinecraftデータパックが完成。コーディング不要！</p>
          {onGuide && (
            <button onClick={onGuide}
              style={{marginTop:10,padding:'6px 20px',fontSize:12,borderRadius:6,border:'1px solid #4fc3f7',background:'#4fc3f715',color:'#4fc3f7',cursor:'pointer',fontWeight:600}}>
              📖 使い方ガイドを見る
            </button>
          )}
        </div>

        {/* Quick Start */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={onMinigame}
            className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 transition-all text-left group hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-2">
              <McIcon id="minecraft:diamond_sword" size={24} />
              <span className="text-sm font-bold text-emerald-400">ミニゲーム作成</span>
            </div>
            <div className="flex gap-1 mb-2">
              {['minecraft:bow','minecraft:golden_apple','minecraft:leather_boots'].map(id => (
                <McInvSlot key={id} id={id} size={28} />
              ))}
            </div>
            <p className="text-[11px] text-mc-muted leading-relaxed">{MINIGAME_TYPES.length}種のミニゲームをウィザードで作成</p>
          </button>
          <button onClick={onSystem}
            className="p-4 rounded-lg border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 transition-all text-left group hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-2">
              <McIcon id="minecraft:redstone" size={24} />
              <span className="text-sm font-bold text-violet-400">システム部品</span>
            </div>
            <div className="flex gap-1 mb-2">
              {['minecraft:emerald','minecraft:ender_pearl','minecraft:chest'].map(id => (
                <McInvSlot key={id} id={id} size={28} />
              ))}
            </div>
            <p className="text-[11px] text-mc-muted leading-relaxed">{SYSTEM_TYPES.length}種のシステムを一括生成</p>
          </button>
          <button onClick={onBuilder}
            className="p-4 rounded-lg border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/15 transition-all text-left group hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-2">
              <McIcon id="minecraft:command_block" size={24} />
              <span className="text-sm font-bold text-sky-400">コマンドビルダー</span>
            </div>
            <div className="flex gap-1 mb-2">
              {['minecraft:experience_bottle','minecraft:name_tag','minecraft:firework_rocket'].map(id => (
                <McInvSlot key={id} id={id} size={28} />
              ))}
            </div>
            <p className="text-[11px] text-mc-muted leading-relaxed">{COMMAND_BUILDER_DEFS.length}種のコマンドをボタン選択だけで生成</p>
          </button>
        </div>

        {/* Minigames Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-mc-text flex items-center gap-2">
              <McIcon id="minecraft:diamond_sword" size={18} /> ミニゲーム一覧
            </h3>
            <button onClick={onMinigame} className="text-[10px] text-mc-info hover:underline">ウィザードを開く →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {MINIGAME_TYPES.map(mg => (
              <button key={mg.id} onClick={onMinigame}
                className="p-3 rounded-lg border border-mc-border/50 hover:border-mc-info bg-mc-dark/30 hover:bg-mc-info/10 transition-all text-center group hover:scale-[1.03]"
              >
                <McInvSlot id={GALLERY_MINIGAME_ICONS[mg.id]} size={40} />
                <span className={`text-[11px] font-medium ${mg.color} group-hover:text-white transition-colors block mt-1.5`}>{mg.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Systems Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-mc-text flex items-center gap-2">
              <McIcon id="minecraft:redstone" size={18} /> システム部品一覧
            </h3>
            <button onClick={onSystem} className="text-[10px] text-mc-info hover:underline">ウィザードを開く →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {SYSTEM_TYPES.map(st => (
              <button key={st.id} onClick={onSystem}
                className="p-3 rounded-lg border border-mc-border/50 hover:border-mc-info bg-mc-dark/30 hover:bg-mc-info/10 transition-all text-center group hover:scale-[1.03]"
              >
                <McInvSlot id={GALLERY_SYSTEM_ICONS[st.id]} size={40} />
                <span className={`text-[11px] font-medium ${st.color} group-hover:text-white transition-colors block mt-1.5`}>{st.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-mc-dark/30 rounded-lg p-4 border border-mc-border/30">
          <h3 className="text-sm font-semibold text-mc-text mb-3 flex items-center gap-2">
            <McIcon id="minecraft:book" size={18} /> 使い方
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            {[
              { step:'1', itemId:'minecraft:compass', text:'ゲームまたはシステムを選択' },
              { step:'2', itemId:'minecraft:redstone', text:'設定をカスタマイズ' },
              { step:'3', itemId:'minecraft:writable_book', text:'ファイルが自動生成' },
              { step:'4', itemId:'minecraft:chest', text:'ZIPでダウンロード' },
            ].map(s => (
              <div key={s.step} className="space-y-1.5">
                <McInvSlot id={s.itemId} size={40} />
                <div className="text-[10px] text-mc-info font-semibold">STEP {s.step}</div>
                <div className="text-[11px] text-mc-muted">{s.text}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-mc-muted">
          ファイルを選択するとエディター表示 | レシピ・ルートテーブルは自動でビジュアルエディターに切替
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════

export default function App() {
  // ── Multi-project state ──
  const [projectsList, setProjectsList] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // ── Current project state ──
  const [project, setProject] = useState({
    name: 'my-datapack',
    description: 'カスタムデータパック',
    targetVersion: '1.21.11',
    namespace: 'mypack',
    packIcon: null,
  });
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showMinigameWizard, setShowMinigameWizard] = useState(false);
  const [showSystemWizard, setShowSystemWizard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarDragOver, setSidebarDragOver] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideMode, setGuideMode] = useState(() => {
    try { return localStorage.getItem('dp_guide_mode') !== 'false'; } catch { return true; }
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimerRef = useRef(null);
  const saveStatusTimerRef = useRef(null);

  // ── Load from localStorage (with migration) ──
  useEffect(() => {
    let list = loadProjectsList();

    // Migration: convert old single-project format to multi-project
    if (list.length === 0) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          const id = `proj_${++_idCounter}`;
          const entry = { id, name: data.project?.name || 'my-datapack', createdAt: Date.now() };
          list = [entry];
          saveProjectsList(list);
          saveProjectData(id, { project: data.project, files: data.files });
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }

    if (list.length > 0) {
      setProjectsList(list);
      const firstId = list[0].id;
      setCurrentProjectId(firstId);
      loadProject(firstId);
    } else {
      // No projects at all - show wizard
      const id = `proj_${++_idCounter}`;
      const entry = { id, name: 'my-datapack', createdAt: Date.now() };
      setProjectsList([entry]);
      setCurrentProjectId(id);
      saveProjectsList([entry]);
      setShowWizard(true);
      // Show guide on first ever visit
      try {
        if (!localStorage.getItem('dp_guide_seen')) {
          setShowGuide(true);
          localStorage.setItem('dp_guide_seen', '1');
        }
      } catch {}
    }
    setInitialized(true);
  }, []);

  // Persist guide mode preference
  useEffect(() => { try { localStorage.setItem('dp_guide_mode', guideMode ? 'true' : 'false'); } catch {} }, [guideMode]);

  // Load a project's data from localStorage
  const loadProject = (id) => {
    const data = loadProjectData(id);
    if (data && data.project) {
      setProject(data.project);
      if (data.files && data.files.length > 0) {
        setFiles(data.files);
        const ids = new Set();
        data.files.filter(f => f.type === 'folder').forEach(f => ids.add(f.id));
        setExpanded(ids);
        setShowWizard(false);
      } else {
        setFiles([]);
        setExpanded(new Set());
        setShowWizard(true);
      }
    } else {
      setProject({ name: 'my-datapack', description: 'カスタムデータパック', targetVersion: '1.21.11', namespace: 'mypack', packIcon: null });
      setFiles([]);
      setExpanded(new Set());
      setShowWizard(true);
    }
    setSelectedId(null);
  };

  // ── Save current project to localStorage (debounced) ──
  useEffect(() => {
    if (!initialized || !currentProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        saveProjectData(currentProjectId, { project, files, savedAt: Date.now() });
        // Update project name in list if it changed
        setProjectsList(prev => {
          const updated = prev.map(p => p.id === currentProjectId ? { ...p, name: project.name } : p);
          saveProjectsList(updated);
          return updated;
        });
        setSaveStatus('saved');
        if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 2000);
      } catch (e) {
        console.error('Save failed:', e);
      }
    }, 500);
  }, [project, files, initialized, currentProjectId]);

  // ── Cleanup debounce timer on unmount ──
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // ── Project switching ──
  const switchProject = useCallback((id) => {
    if (id === currentProjectId) return;
    // Cancel pending debounce save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // Save current before switching
    if (currentProjectId) {
      saveProjectData(currentProjectId, { project, files, savedAt: Date.now() });
    }
    setCurrentProjectId(id);
    loadProject(id);
  }, [currentProjectId, project, files]);

  const createNewProject = useCallback(() => {
    // Cancel pending debounce save and save current first
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (currentProjectId) {
      saveProjectData(currentProjectId, { project, files, savedAt: Date.now() });
    }
    const id = `proj_${++_idCounter}`;
    const entry = { id, name: '新規プロジェクト', createdAt: Date.now() };
    const newList = [...projectsList, entry];
    setProjectsList(newList);
    saveProjectsList(newList);
    setCurrentProjectId(id);
    setProject({ name: '新規プロジェクト', description: 'カスタムデータパック', targetVersion: '1.21.11', namespace: 'mypack', packIcon: null });
    setFiles([]);
    setExpanded(new Set());
    setSelectedId(null);
    setShowWizard(true);
  }, [currentProjectId, project, files, projectsList]);

  const deleteProject = useCallback((id) => {
    if (projectsList.length <= 1) return;
    if (!confirm('このプロジェクトを削除しますか？')) return;
    // Cancel pending debounce save before deleting
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    deleteProjectData(id);
    const newList = projectsList.filter(p => p.id !== id);
    setProjectsList(newList);
    saveProjectsList(newList);
    if (id === currentProjectId) {
      const nextId = newList[0].id;
      setCurrentProjectId(nextId);
      loadProject(nextId);
    }
  }, [projectsList, currentProjectId]);

  const renameProject = useCallback((id, newName) => {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    const newList = projectsList.map(p => p.id === id ? { ...p, name: trimmed } : p);
    setProjectsList(newList);
    saveProjectsList(newList);
    if (id === currentProjectId) {
      setProject(prev => ({ ...prev, name: trimmed }));
    } else {
      // Also update stored project data for non-active projects
      const data = loadProjectData(id);
      if (data && data.project) {
        data.project.name = trimmed;
        saveProjectData(id, data);
      }
    }
  }, [projectsList, currentProjectId]);

  // ── Validation ──
  const errors = useMemo(() => validateProject(project, files), [project, files]);

  // ── Selected file ──
  const selectedFile = useMemo(() => {
    const file = files.find(f => f.id === selectedId);
    if (!file) return null;
    if (file.type === 'folder') {
      return { ...file, _children: getChildren(files, file.id) };
    }
    return file;
  }, [selectedId, files]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (currentProjectId) {
            saveProjectData(currentProjectId, { project, files, savedAt: Date.now() });
          }
          setSaveStatus('saved');
          if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
          saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 2000);
        }
        if (e.shiftKey && e.key === 'D') {
          e.preventDefault();
          generateZip(project, files);
        }
      }
      if (isEditing) return;
      if (e.key === 'F2' && selectedId) {
        e.preventDefault();
        setFiles(prev => prev.map(f => f.id === selectedId ? { ...f, _startRename: Date.now() } : f));
      }
      if (e.key === 'Delete' && selectedId) {
        const file = files.find(f => f.id === selectedId);
        if (file && file.parentId) {
          if (confirm(`"${file.name}" を削除しますか？`)) {
            setFiles(prev => deleteRecursive(prev, selectedId));
            setSelectedId(null);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, project, files]);

  // ── Actions ──
  const handleWizardComplete = (config) => {
    setProject({
      name: config.name,
      description: config.description,
      targetVersion: config.targetVersion,
      namespace: config.namespace,
      packIcon: null,
    });
    const newFiles = createInitialFiles(config.namespace, {
      tickLoad: config.tickLoad,
      sampleRecipe: config.sampleRecipe,
      sampleAdvancement: config.sampleAdvancement,
      sampleLootTable: config.sampleLootTable,
      targetVersion: config.targetVersion,
    });
    setFiles(newFiles);
    const allIds = new Set();
    newFiles.filter(f => f.type === 'folder').forEach(f => allIds.add(f.id));
    setExpanded(allIds);
    setShowWizard(false);
    // Update project name in projects list
    if (currentProjectId) {
      setProjectsList(prev => {
        const updated = prev.map(p => p.id === currentProjectId ? { ...p, name: config.name } : p);
        saveProjectsList(updated);
        return updated;
      });
    }
  };

  const toggleExpand = useCallback((id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const isDescendantOf = useCallback((files, nodeId, ancestorId) => {
    let current = nodeId;
    const seen = new Set();
    while (current) {
      if (seen.has(current)) return false;
      seen.add(current);
      if (current === ancestorId) return true;
      const node = files.find(f => f.id === current);
      current = node?.parentId || null;
    }
    return false;
  }, []);

  const handleContextMenu = useCallback((e, file) => {
    e.preventDefault();
    const menuItems = [];
    if (file.type === 'folder') {
      menuItems.push({ label: '新規ファイル（テンプレート）', icon: FilePlus, action: () => { setSelectedId(file.id); setShowTemplateSelector(true); } });
      menuItems.push({ label: '新規フォルダ', icon: FolderPlus, action: () => addFolder(file.id) });
      menuItems.push({ label: '空のファイルを追加', icon: File, action: () => addEmptyFile(file.id) });
      menuItems.push({ separator: true });
    }
    menuItems.push({ label: 'リネーム', icon: Edit3, action: () => {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, _startRename: Date.now() } : f));
    }});
    menuItems.push({ label: '複製', icon: Copy, action: () => {
      setFiles(prev => {
        const original = prev.find(f => f.id === file.id);
        if (!original) return prev;
        const newId = genId();
        const nameParts = original.name.split('.');
        const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
        const baseName = nameParts.join('.');
        const newName = `${baseName}_copy${ext}`;
        return [...prev, { id: newId, name: newName, type: original.type, content: original.content ?? null, parentId: original.parentId }];
      });
    }});
    if (file.parentId) {
      menuItems.push({ separator: true });
      menuItems.push({ label: '削除', icon: Trash2, danger: true, action: () => {
        if (confirm(`"${file.name}" を削除しますか？`)) {
          setFiles(prev => {
            const newFiles = deleteRecursive(prev, file.id);
            return newFiles;
          });
          setSelectedId(prev => {
            if (!prev) return null;
            if (prev === file.id) return null;
            return isDescendantOf(files, prev, file.id) ? null : prev;
          });
        }
      }});
    }
    setContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
  }, [files, isDescendantOf]);

  const handleRename = useCallback((id, newName, clearFlag) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        if (clearFlag) return { ...f, _startRename: undefined };
        return { ...f, name: newName, _startRename: undefined };
      }
      return f;
    }));
  }, []);

  const handleFileContentChange = useCallback((content) => {
    if (!selectedId) return;
    setFiles(prev => prev.map(f => f.id === selectedId ? { ...f, content } : f));
  }, [selectedId]);

  const addFolder = (parentId) => {
    const name = prompt('フォルダ名を入力:', 'new_folder');
    if (!name) return;
    if (!isValidFileName(name)) { alert('無効なフォルダ名です（小文字英数字、_, -, . のみ）'); return; }
    const id = genId();
    setFiles(prev => [...prev, { id, name: name.toLowerCase(), type: 'folder', content: null, parentId }]);
    setExpanded(prev => new Set([...prev, parentId, id]));
  };

  const addEmptyFile = (parentId) => {
    const name = prompt('ファイル名を入力:', 'new_file.json');
    if (!name) return;
    if (!isValidFileName(name)) { alert('無効なファイル名です'); return; }
    const type = getFileType(name);
    const content = type === 'json' ? '{\n  \n}' : type === 'mcfunction' ? '# 新しい関数\n' : '';
    const id = genId();
    setFiles(prev => [...prev, { id, name: name.toLowerCase(), type, content, parentId }]);
    setExpanded(prev => new Set([...prev, parentId]));
    setSelectedId(id);
  };


  const handleTemplateSelect = ({ category, fileName, content, parentId }) => {
    const targetParent = parentId || selectedId;
    if (!targetParent) return;

    let updatedFiles = [...files];
    let finalParent = targetParent;

    const parentFile = updatedFiles.find(f => f.id === targetParent);
    if (parentFile) {
      const parentChildren = updatedFiles.filter(f => f.parentId === targetParent);
      const catFolder = parentChildren.find(f => f.name === category && f.type === 'folder');
      if (catFolder) {
        finalParent = catFolder.id;
      } else {
        if (parentFile.name !== category) {
          const catId = genId();
          updatedFiles.push({ id: catId, name: category, type: 'folder', content: null, parentId: targetParent });
          finalParent = catId;
          setExpanded(prev => new Set([...prev, targetParent, catId]));
        }
      }
    }

    const newId = genId();
    updatedFiles.push({
      id: newId,
      name: fileName,
      type: getFileType(fileName),
      content,
      parentId: finalParent,
    });

    setFiles(updatedFiles);
    setExpanded(prev => new Set([...prev, finalParent]));
    setSelectedId(newId);
    setShowTemplateSelector(false);
  };

  const handleMinigameComplete = (gameType, settings) => {
    const mgFiles = generateMinigameFiles(project.namespace, gameType, settings);
    const newFiles = addFilesFromPaths(files, mgFiles);
    setFiles(newFiles);
    const allFolderIds = new Set();
    newFiles.filter(f => f.type === 'folder').forEach(f => allFolderIds.add(f.id));
    setExpanded(allFolderIds);
    setShowMinigameWizard(false);
  };

  const handleSystemComplete = (systemType, settings) => {
    const sysFiles = generateSystemFiles(project.namespace, systemType, settings);
    const newFiles = addFilesFromPaths(files, sysFiles);
    setFiles(newFiles);
    const allFolderIds = new Set();
    newFiles.filter(f => f.type === 'folder').forEach(f => allFolderIds.add(f.id));
    setExpanded(allFolderIds);
    setShowSystemWizard(false);
  };

  const handleDownload = async () => {
    const errs = errors.filter(e => e.type === 'error');
    if (errs.length > 0) {
      if (!confirm(`${errs.length}件のエラーがあります。それでもダウンロードしますか？`)) return;
    }
    try {
      await generateZip(project, files);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert(`ZIPの生成に失敗しました: ${err.message}`);
    }
  };

  const handleReset = () => {
    if (confirm('このプロジェクトをリセットして初期設定ウィザードを開きますか？\n現在のデータは失われます。')) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setInitialized(false);
      if (currentProjectId) deleteProjectData(currentProjectId);
      setProject({ name: 'my-datapack', description: 'カスタムデータパック', targetVersion: '1.21.11', namespace: 'mypack', packIcon: null });
      setFiles([]);
      setSelectedId(null);
      setShowWizard(true);
      requestAnimationFrame(() => setInitialized(true));
    }
  };

  const handleImport = (pathContents, info) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (currentProjectId) {
      saveProjectData(currentProjectId, { project, files, savedAt: Date.now() });
    }
    const id = `proj_${++_idCounter}`;
    const pName = info.name || 'imported-datapack';
    const entry = { id, name: pName, createdAt: Date.now() };
    const newList = [...projectsList, entry];
    setProjectsList(newList);
    saveProjectsList(newList);
    setCurrentProjectId(id);
    const newProject = {
      name: pName,
      description: info.description || '',
      targetVersion: info.targetVersion || '1.21.11',
      namespace: info.namespace || 'mypack',
      packIcon: null,
    };
    setProject(newProject);
    const importedFiles = addFilesFromPaths([], pathContents.map(p => ({ path: p.path, content: p.content })));
    setFiles(importedFiles);
    const allFolderIds = new Set();
    importedFiles.filter(f => f.type === 'folder').forEach(f => allFolderIds.add(f.id));
    setExpanded(allFolderIds);
    setSelectedId(null);
    setShowWizard(false);
    setShowImportModal(false);
    saveProjectData(id, { project: newProject, files: importedFiles, savedAt: Date.now() });
  };

  const handleSidebarDrop = async (e) => {
    e.preventDefault();
    setSidebarDragOver(false);
    const dt = e.dataTransfer;
    if (!dt) return;

    let pathContents = [];
    try {
      pathContents = await importFromDataTransfer(dt);
      pathContents = stripTopFolder(pathContents);
    } catch (err) {
      console.error('Import error:', err);
      alert(`インポートエラー: ${err.message}`);
      return;
    }

    if (pathContents.length === 0) return;

    // If current project has no files, treat as full import (new project setup)
    if (files.length === 0) {
      const info = detectDatapackInfo(pathContents);
      const updates = {};
      if (info.name) updates.name = info.name;
      if (info.namespace) updates.namespace = info.namespace;
      if (info.description) updates.description = info.description;
      if (info.targetVersion) updates.targetVersion = info.targetVersion;
      if (Object.keys(updates).length > 0) setProject(prev => ({ ...prev, ...updates }));
      const newFiles = addFilesFromPaths([], pathContents.map(p => ({ path: p.path, content: p.content })));
      setFiles(newFiles);
      const allIds = new Set();
      newFiles.filter(f => f.type === 'folder').forEach(f => allIds.add(f.id));
      setExpanded(allIds);
      setShowWizard(false);
    } else {
      // Merge into existing project
      const newFiles = addFilesFromPaths(files, pathContents.map(p => ({ path: p.path, content: p.content })));
      setFiles(newFiles);
      const allIds = new Set(expanded);
      newFiles.filter(f => f.type === 'folder').forEach(f => allIds.add(f.id));
      setExpanded(allIds);
    }
  };

  // ── Derived ──
  const rootFiles = files.filter(f => !f.parentId);
  const fileCount = files.filter(f => f.type !== 'folder').length;
  const folderCount = files.filter(f => f.type === 'folder').length;
  const errCount = errors.filter(e => e.type === 'error').length;
  const warnCount = errors.filter(e => e.type === 'warning').length;

  // Find namespace folder for template selector
  const nsFolder = useMemo(() => {
    const dataFolder = files.find(f => f.name === 'data' && !f.parentId);
    if (!dataFolder) return null;
    return files.find(f => f.parentId === dataFolder.id && f.name === project.namespace);
  }, [files, project.namespace]);

  // ── Render ──
  return (
    <div className="h-screen flex flex-col font-sans select-none">
      {/* ═══ HEADER ═══ */}
      <header className="h-12 bg-mc-sidebar border-b border-mc-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(s => !s)} className="text-mc-muted hover:text-mc-text lg:hidden">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⛏️</span>
            <span className="text-sm font-semibold text-mc-bright hidden sm:block">Datapack Builder</span>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-3">
            <span className="text-xs font-mono text-mc-text bg-mc-dark px-2 py-0.5 rounded">{project.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-mc-info/20 text-sky-300 font-mono">MC {project.targetVersion}</span>
          </div>
          {saveStatus && (
            <span className="text-[10px] text-mc-success flex items-center gap-1 anim-fade">
              <CheckCircle size={10} /> 保存済み
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowMinigameWizard(true)}
            className="text-xs px-2.5 py-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-mc-dark rounded transition-colors flex items-center gap-1.5"
            title="ミニゲーム作成"
          >
            <Gamepad2 size={13} /> <span className="hidden sm:inline">ミニゲーム</span>
          </button>
          <button onClick={() => setShowSystemWizard(true)}
            className="text-xs px-2.5 py-1.5 text-violet-400 hover:text-violet-300 hover:bg-mc-dark rounded transition-colors flex items-center gap-1.5"
            title="システム部品作成"
          >
            <Layers size={13} /> <span className="hidden sm:inline">システム</span>
          </button>
          <button onClick={() => setShowWizard(true)}
            className="text-xs px-2.5 py-1.5 text-mc-muted hover:text-mc-text hover:bg-mc-dark rounded transition-colors flex items-center gap-1.5"
            title="セットアップウィザード"
          >
            <Wand2 size={13} /> <span className="hidden sm:inline">ウィザード</span>
          </button>
          <button onClick={() => setShowSettings(true)}
            className="text-xs px-2.5 py-1.5 text-mc-muted hover:text-mc-text hover:bg-mc-dark rounded transition-colors flex items-center gap-1.5"
            title="プロジェクト設定"
          >
            <Settings size={13} /> <span className="hidden sm:inline">設定</span>
          </button>
          <button onClick={() => setShowImportModal(true)}
            className="text-xs px-2.5 py-1.5 text-mc-muted hover:text-mc-text hover:bg-mc-dark rounded transition-colors flex items-center gap-1.5"
            title="データパックをインポート"
          >
            <UploadCloud size={13} /> <span className="hidden sm:inline">インポート</span>
          </button>
          <button onClick={handleReset}
            className="text-xs px-2.5 py-1.5 text-mc-muted hover:text-mc-text hover:bg-mc-dark rounded transition-colors"
            title="リセット"
          >
            <RefreshCcw size={13} />
          </button>
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 bg-mc-success/80 hover:bg-mc-success/60 text-white font-medium rounded transition-colors flex items-center gap-1.5"
          >
            <Download size={13} /> ZIP
          </button>
        </div>
      </header>

      {/* ═══ PROJECT TABS ═══ */}
      {projectsList.length > 0 && (
        <ProjectTabs
          projects={projectsList}
          currentId={currentProjectId}
          onSwitch={switchProject}
          onCreate={createNewProject}
          onDelete={deleteProject}
          onRename={renameProject}
        />
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ── SIDEBAR ── */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-mc-sidebar border-r border-mc-border flex flex-col transition-all duration-200 overflow-hidden`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-mc-border/50">
            <span className="text-xs font-semibold text-mc-muted uppercase tracking-wider">ファイル</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => nsFolder && setShowTemplateSelector(true)}
                disabled={!nsFolder}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${nsFolder ? 'text-mc-muted hover:text-mc-success hover:bg-mc-dark' : 'text-mc-muted/30 cursor-not-allowed'}`}
                title="テンプレートから追加"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => { const root = files.find(f => !f.parentId); if (root) addFolder(root.id); }}
                disabled={!files.some(f => !f.parentId)}
                className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${files.some(f => !f.parentId) ? 'text-mc-muted hover:text-yellow-400 hover:bg-mc-dark' : 'text-mc-muted/30 cursor-not-allowed'}`}
                title="フォルダを追加"
              >
                <FolderPlus size={14} />
              </button>
            </div>
          </div>

          {/* File tree */}
          <div
            className={`flex-1 overflow-y-auto py-1 transition-colors ${sidebarDragOver ? 'bg-mc-info/10 ring-1 ring-inset ring-mc-info/40' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setSidebarDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); setSidebarDragOver(true); }}
            onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setSidebarDragOver(false); }}
            onDrop={handleSidebarDrop}
          >
            {sidebarDragOver ? (
              <div className="flex flex-col items-center justify-center h-full text-mc-info anim-fade">
                <UploadCloud size={28} className="mb-2 opacity-80" />
                <p className="text-xs font-medium">ここにドロップしてインポート</p>
                <p className="text-[10px] text-mc-muted mt-1">ZIP / ファイル / フォルダ</p>
              </div>
            ) : rootFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-mc-muted">
                <UploadCloud size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">ファイルがありません</p>
                <p className="text-[10px] mt-1 opacity-60">ファイルをドラッグ&ドロップ</p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="text-[10px] text-mc-info hover:underline"
                  >
                    ウィザードで作成
                  </button>
                  <span className="text-[10px] opacity-30">|</span>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="text-[10px] text-mc-info hover:underline"
                  >
                    インポート
                  </button>
                </div>
              </div>
            ) : (
              rootFiles.map(file => (
                <FileTreeNode
                  key={file.id}
                  file={file}
                  files={files}
                  depth={0}
                  selectedId={selectedId}
                  expanded={expanded}
                  onSelect={setSelectedId}
                  onToggle={toggleExpand}
                  onContextMenu={handleContextMenu}
                  onRename={handleRename}
                />
              ))
            )}
          </div>

          {/* Quick actions */}
          <div className="border-t border-mc-border/50 p-2 space-y-1">
            <button
              onClick={() => nsFolder && setShowTemplateSelector(true)}
              disabled={!nsFolder}
              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center gap-2 ${nsFolder ? 'text-mc-muted hover:text-mc-text hover:bg-mc-dark' : 'text-mc-muted/30 cursor-not-allowed'}`}
            >
              <FilePlus size={12} /> テンプレートからファイル作成
            </button>
          </div>
        </div>

        {/* ── Sidebar toggle (when closed) ── */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-shrink-0 w-8 bg-mc-sidebar border-r border-mc-border flex items-center justify-center text-mc-muted hover:text-mc-text transition-colors"
          >
            <PanelLeftOpen size={14} />
          </button>
        )}

        {/* ── EDITOR AREA ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor tabs */}
          <div className="flex items-center border-b border-mc-border bg-mc-dark/30 px-2">
            {[
              { key: 'editor', label: 'エディター', icon: Code },
              { key: 'builder', label: 'ビルダー', icon: Zap },
              { key: 'preview', label: 'プレビュー', icon: Eye },
              { key: 'commands', label: 'コマンド', icon: BookOpen },
              { key: 'ai', label: 'AI', icon: Sparkles },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === t.key
                    ? 'text-white border-mc-info'
                    : 'text-mc-muted border-transparent hover:text-mc-text'
                }`}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}

            <button
              onClick={() => setShowGuide(true)}
              className="ml-auto px-2 py-1.5 text-xs text-mc-muted hover:text-mc-info transition-colors flex items-center gap-1"
              title="使い方ガイド"
            >
              <HelpCircle size={12} /> ガイド
            </button>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-mc-muted hover:text-mc-text px-2 hidden lg:block"
                title="サイドバーを閉じる"
              >
                <PanelLeftClose size={14} />
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'editor' ? (
              selectedFile ? (() => {
                /* Smart Editor: detect file type and route to appropriate editor */
                const isMcfunction = selectedFile.name?.endsWith('.mcfunction');
                const isRecipeJson = selectedFile.name?.endsWith('.json') && selectedFile.content?.includes('"type"') && selectedFile.content?.includes('crafting');
                const isLootTable = selectedFile.name?.endsWith('.json') && selectedFile.content?.includes('"pools"');
                const isAdvancement = selectedFile.name?.endsWith('.json') && (
                  selectedFile.path?.includes('/advancements/') || selectedFile.path?.includes('/advancement/') ||
                  (selectedFile.content?.includes('"criteria"') && selectedFile.content?.includes('"display"'))
                );

                // mcfunction → IntegratedMcfEditor (VS Code + command builder hybrid, always)
                if (isMcfunction) {
                  return <IntegratedMcfEditor file={selectedFile} onChange={handleFileContentChange} targetVersion={project.targetVersion} namespace={project.namespace} guideMode={guideMode} onToggleGuide={() => setGuideMode(g => !g)} />;
                }

                // Recipe JSON → SplitJsonEditor with RecipeVisualEditor
                if (isRecipeJson) {
                  return <SplitJsonEditor file={selectedFile} onChange={handleFileContentChange} namespace={project.namespace}
                    targetVersion={project.targetVersion} VisualComponent={RecipeVisualEditor} visualProps={{}} />;
                }

                // Loot table → SplitJsonEditor with LootTableVisualEditor
                if (isLootTable) {
                  return <SplitJsonEditor file={selectedFile} onChange={handleFileContentChange} namespace={project.namespace}
                    targetVersion={project.targetVersion} VisualComponent={LootTableVisualEditor} visualProps={{}} />;
                }

                // Advancement → SplitJsonEditor with AdvancementVisualEditor
                if (isAdvancement) {
                  return <SplitJsonEditor file={selectedFile} onChange={handleFileContentChange} namespace={project.namespace}
                    targetVersion={project.targetVersion} VisualComponent={AdvancementVisualEditor} visualProps={{}} />;
                }

                // Other files → standard CodeEditor
                return <CodeEditor file={selectedFile} onChange={handleFileContentChange} targetVersion={project.targetVersion} guideMode={guideMode} onToggleGuide={() => setGuideMode(g => !g)} />;
              })() : (
                <GalleryLanding onMinigame={() => setShowMinigameWizard(true)} onSystem={() => setShowSystemWizard(true)} onBuilder={() => setActiveTab('builder')} onGuide={() => setShowGuide(true)} />
              )
            ) : activeTab === 'builder' ? (
              <CommandBuilderPanel
                namespace={project.namespace}
                file={selectedFile}
                onInsert={(cmd) => {
                  if (selectedFile && selectedFile.name?.endsWith('.mcfunction')) {
                    const newContent = (selectedFile.content || '') + (selectedFile.content ? '\n' : '') + cmd;
                    handleFileContentChange(newContent);
                  }
                }}
              />
            ) : activeTab === 'commands' ? (
              <CommandReference namespace={project.namespace} targetVersion={project.targetVersion} />
            ) : activeTab === 'ai' ? (
              <AIChatPanel project={project} files={files} setFiles={setFiles} setExpanded={setExpanded} />
            ) : (
              <PreviewPanel project={project} files={files} errors={errors} />
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <footer className="h-7 bg-mc-darker flex items-center justify-between px-4 text-[10px] text-mc-muted border-t border-mc-border/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          {errCount > 0 && (
            <span className="flex items-center gap-1 text-mc-accent cursor-pointer" onClick={() => setActiveTab('preview')}>
              <AlertTriangle size={10} /> {errCount} エラー
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-mc-warning cursor-pointer" onClick={() => setActiveTab('preview')}>
              <Info size={10} /> {warnCount} 警告
            </span>
          )}
          {errCount === 0 && warnCount === 0 && (
            <span className="flex items-center gap-1 text-mc-success">
              <CheckCircle size={10} /> OK
            </span>
          )}
          <span>{fileCount} ファイル / {folderCount} フォルダ</span>
        </div>
        <div className="flex items-center gap-4">
          <span>MC {project.targetVersion}</span>
          <span className="hidden sm:inline">Ctrl+S: 保存 / Ctrl+Shift+D: ダウンロード</span>
        </div>
      </footer>

      {/* ═══ MODALS ═══ */}
      {showWizard && (
        <SetupWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
          onImport={() => { setShowWizard(false); setShowImportModal(true); }}
        />
      )}
      {showSettings && (
        <SettingsPanel
          project={project}
          setProject={setProject}
          onClose={() => setShowSettings(false)}
          guideMode={guideMode}
          setGuideMode={setGuideMode}
        />
      )}
      {showTemplateSelector && (
        <TemplateSelector
          namespace={project.namespace}
          parentId={nsFolder?.id}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
          targetVersion={project.targetVersion}
        />
      )}
      {showMinigameWizard && (
        <MinigameWizard
          namespace={project.namespace}
          onComplete={handleMinigameComplete}
          onClose={() => setShowMinigameWizard(false)}
          targetVersion={project.targetVersion}
        />
      )}
      {showSystemWizard && (
        <SystemWizard
          namespace={project.namespace}
          onComplete={handleSystemComplete}
          onClose={() => setShowSystemWizard(false)}
        />
      )}
      {showGuide && (
        <VisualGuide onClose={() => setShowGuide(false)} />
      )}
      {showImportModal && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
