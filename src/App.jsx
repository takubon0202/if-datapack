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
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mc-datapack-builder-v1';

const VERSION_FORMATS = {
  '1.21.11': { min: [94, 1], max: [94, 1], useNewFormat: true },
  '1.21.10': { min: [88, 0], max: [88, 0], useNewFormat: true },
  '1.21.9':  { min: [88, 0], max: [88, 0], useNewFormat: true },
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
    content: () => JSON.stringify({
      type: "minecraft:crafting_shaped",
      pattern: ["AAA", "ABA", "AAA"],
      key: { A: "minecraft:stone", B: "minecraft:diamond" },
      result: { id: "minecraft:diamond_block", count: 1 }
    }, null, 2),
  },
  recipe_shapeless: {
    category: 'recipe', label: '不定形レシピ（shapeless）', ext: '.json',
    content: () => JSON.stringify({
      type: "minecraft:crafting_shapeless",
      ingredients: ["minecraft:diamond", "minecraft:stick"],
      result: { id: "minecraft:diamond_sword", count: 1 }
    }, null, 2),
  },
  recipe_smelting: {
    category: 'recipe', label: '精錬レシピ', ext: '.json',
    content: () => JSON.stringify({
      type: "minecraft:smelting",
      ingredient: "minecraft:iron_ore",
      result: { id: "minecraft:iron_ingot" },
      experience: 0.7,
      cookingtime: 200
    }, null, 2),
  },
  advancement: {
    category: 'advancement', label: '進捗', ext: '.json',
    content: () => JSON.stringify({
      display: {
        title: "進捗タイトル",
        description: "進捗の説明",
        icon: { id: "minecraft:diamond" },
        frame: "task",
        show_toast: true,
        announce_to_chat: true
      },
      criteria: {
        requirement: {
          trigger: "minecraft:inventory_changed",
          conditions: { items: [{ items: "minecraft:diamond" }] }
        }
      }
    }, null, 2),
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
execute as @a[tag=player,scores={deaths=1..}] run tellraw @a[tag=player] [{"selector":"@s","color":"red"},{"text":" がやられた！","color":"gray"}]

# 死亡したプレイヤーをスペクテイターに
execute as @a[tag=player,scores={deaths=1..}] run gamemode spectator @s
execute as @a[tag=player,scores={deaths=1..}] run scoreboard players set @s alive 0

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
bossbar set ${ns}:timer players @a[tag=player]
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
];

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
      { label: 'チーム参加', code: 'team join <名前> @a[tag=team1]', desc: 'タグ付きプレイヤーを参加させる' },
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
      { label: 'プレイヤーとして実行', code: 'execute as @a[tag=player] run ...', desc: '各プレイヤーとして実行' },
      { label: '位置で実行', code: 'execute at @a[tag=player] run ...', desc: 'プレイヤーの位置で実行' },
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
      { label: 'エフェクト付与', code: 'effect give @a[tag=player] speed 10 1 true', desc: '10秒間スピードLv2（trueで粒子非表示）' },
      { label: 'エフェクト解除', code: 'effect clear @a[tag=player]', desc: '全エフェクトを解除' },
      { label: 'テレポート', code: 'tp @a[tag=player] ~ ~ ~', desc: '指定座標にテレポート' },
      { label: 'スポーン設定', code: 'spawnpoint @a[tag=player] ~ ~ ~', desc: 'リスポーン地点を設定' },
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
      { label: 'ゲームモード変更', code: 'gamemode adventure @a[tag=player]', desc: 'adventure/survival/spectator/creative' },
      { label: 'アイテム消去', code: 'clear @a[tag=player]', desc: '全アイテムを消去' },
      { label: 'アイテム付与', code: 'give @a[tag=player] diamond_sword 1', desc: 'アイテムを付与' },
      { label: 'サウンド再生', code: 'execute at @s run playsound minecraft:ui.toast.challenge_complete master @s', desc: '進捗達成音を再生' },
      { label: 'タグ管理', code: 'tag @a[distance=..5] add player', desc: '近くのプレイヤーにタグ付与' },
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
    { l: 'function', d: '関数戻り値判定', v: '1.20.3' }, { l: 'items', d: 'アイテム判定', v: '1.20.5' },
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
  ],
};

// ════════════════════════════════════════════════════════════
// AI CONSTANTS
// ════════════════════════════════════════════════════════════

const AI_GEMINI_KEY = 'mc-datapack-ai-gemini-key';
const AI_OPENAI_KEY = 'mc-datapack-ai-openai-key';
const AI_MODEL_KEY = 'mc-datapack-ai-model';

const AI_MODELS = [
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'gemini', apiModel: 'gemini-3-flash-preview', thinking: null, desc: '高速・無料' },
  { id: 'gemini-3-flash-thinking', label: 'Gemini 3 Flash Thinking', provider: 'gemini', apiModel: 'gemini-3-flash-preview', thinking: 'high', desc: '深い推論' },
  { id: 'gemini-3-pro', label: 'Gemini 3 Pro', provider: 'gemini', apiModel: 'gemini-3-pro-preview', thinking: null, desc: '高性能' },
  { id: 'gpt-5.3-codex', label: 'GPT 5.3 Codex', provider: 'openai', apiModel: 'gpt-5.3-codex', thinking: null, desc: '近日対応予定', comingSoon: true },
];

const AI_PROVIDERS = {
  gemini: { name: 'Google Gemini', storageKey: AI_GEMINI_KEY, link: 'https://aistudio.google.com/apikey', linkLabel: 'Google AI Studio' },
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

  // バージョンに応じたフォルダ名
  const useSingular = gte('1.21');
  const funcFolder = useSingular ? 'function' : 'functions';
  const recipeFolder = useSingular ? 'recipe' : 'recipes';
  const advFolder = useSingular ? 'advancement' : 'advancements';
  const lootFolder = useSingular ? 'loot_table' : 'loot_tables';
  const predFolder = useSingular ? 'predicate' : 'predicates';
  const tagFuncFolder = useSingular ? 'function' : 'functions';
  const tagBlockFolder = useSingular ? 'block' : 'blocks';
  const tagItemFolder = useSingular ? 'item' : 'items';

  // バージョン別機能フラグ
  const hasPredicates = gte('1.15');
  const hasItemModifiers = gte('1.17');
  const hasComponents = gte('1.20.5');
  const hasFunctionMacros = gte('1.20.2');
  const hasReturnCmd = gte('1.20.2');
  const hasSimplifiedIngredients = gte('1.21.2');
  const hasSNBTText = gte('1.21.5');
  const hasDamageType = gte('1.19.4');
  const hasEnchantmentRegistry = gte('1.21');
  const hasExecuteOn = gte('1.19.4');
  const hasItemCmd = gte('1.17');
  const hasTickCmd = gte('1.21');

  // バージョン別レシピ形式
  let recipeResultNote = '';
  if (hasComponents) {
    recipeResultNote = '"result": { "id": "minecraft:...", "count": 1 }  ※1.20.5+形式';
  } else {
    recipeResultNote = '"result": { "item": "minecraft:...", "count": 1 }  ※~1.20.4形式';
  }

  let ingredientNote = '';
  if (hasSimplifiedIngredients) {
    ingredientNote = `材料は文字列形式: "minecraft:stone"、タグは "#minecraft:planks"`;
  } else {
    ingredientNote = `材料はオブジェクト形式: { "item": "minecraft:stone" }、タグは { "tag": "minecraft:planks" }`;
  }

  // コマンド構文セクション
  let commandNotes = `
- /execute は 1.13+ 形式のみ: execute as @e at @s run <command>
- 数値ID・データ値は使用禁止。名前空間付き文字列ID（minecraft:stone）を使用
- ブロック状態: minecraft:oak_log[axis=x] 形式`;

  if (hasComponents) {
    commandNotes += `
- アイテム形式: コンポーネント方式を使用（NBT形式は禁止）
  例: give @s minecraft:diamond_sword[damage=5,enchantments={levels:{"minecraft:sharpness":5}}]
- custom_name, lore, enchantments, damage, unbreakable 等はコンポーネントとして指定`;
  } else {
    commandNotes += `
- アイテムNBT形式: give @s minecraft:diamond_sword{Damage:5,Enchantments:[{id:"minecraft:sharpness",lvl:5}]}`;
  }

  if (hasSNBTText) {
    commandNotes += `
- テキストコンポーネントはインラインSNBT形式: custom_name={text:'名前',color:'gold'}
  /tellraw, /title もSNBT形式を使用`;
  } else {
    commandNotes += `
- テキストコンポーネントはJSON文字列形式: custom_name='{"text":"名前","color":"gold"}'`;
  }

  if (hasFunctionMacros) {
    commandNotes += `
- 関数マクロ対応（$行で変数展開）: $say $(message)
  呼び出し: function ${namespace}:func {message:"hello"}`;
  }
  if (hasReturnCmd) commandNotes += `\n- /return <value> で関数から値を返却可能`;
  if (hasItemCmd) commandNotes += `\n- /item コマンドでアイテム操作（/replaceitemの後継）`;
  if (hasTickCmd) commandNotes += `\n- /tick コマンドでティック速度を制御可能`;
  if (hasExecuteOn) commandNotes += `\n- /execute on <relation> サブコマンド（passengers, vehicle, owner等）`;

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

  return `あなたはMinecraft Java Edition データパック専門のAIアシスタントです。
ユーザーの指示に従い、正確なデータパックファイルを生成してください。

【対象バージョン: Minecraft ${targetVersion}】
名前空間: ${namespace}

【ファイル出力形式 ※必須】
ファイルを生成する場合、必ず以下のコードブロック形式で出力:

\`\`\`mcfunction:data/${namespace}/${funcFolder}/example.mcfunction
# コマンド
say Hello!
\`\`\`

\`\`\`json:data/${namespace}/${recipeFolder}/example.json
{
  "type": "minecraft:crafting_shaped"
}
\`\`\`

形式: \`\`\`言語:ファイルパス （言語は mcfunction または json）

【レシピ形式（${targetVersion}）】
- ${recipeResultNote}
- ${ingredientNote}
- 利用可能なレシピタイプ: crafting_shaped, crafting_shapeless, smelting${gte('1.14') ? ', blasting, smoking, campfire_cooking, stonecutting' : ''}${gte('1.20') ? ', smithing_transform, smithing_trim' : ''}${hasSimplifiedIngredients ? ', crafting_transmute' : ''}

【コマンド構文（${targetVersion}）】${commandNotes}

【データパック構造（${targetVersion}）】
${useSingular ? '※1.21+: フォルダ名は単数形' : '※~1.20: フォルダ名は複数形'}
${structureNote}

【進捗（advancement）形式】
- icon: ${hasComponents ? '{ "id": "minecraft:..." }' : '{ "item": "minecraft:..." }'}
- items条件: ${hasComponents ? '{ "items": "minecraft:diamond" }  ※1.20.5+形式' : '{ "items": [{ "items": ["minecraft:diamond"] }] }'}

【バージョン固有の重要ルール】
- 対象は Minecraft ${targetVersion} のみ。このバージョンで存在しない機能は使用禁止
- ${useSingular ? 'フォルダ名は単数形（function, recipe, advancement等）' : 'フォルダ名は複数形（functions, recipes, advancements等）'}
- タグフォルダ: tags/${tagFuncFolder}/, tags/${tagBlockFolder}/, tags/${tagItemFolder}/
${hasComponents ? '- NBT形式({...})は禁止。必ずコンポーネント形式[...]を使用' : '- アイテムデータはNBT形式{...}を使用'}
${hasSNBTText ? '- テキストはSNBT形式（JSON文字列ではない）' : '- テキストはJSON文字列形式'}

【注意事項】
- 名前空間は必ず "${namespace}" を使用
- ファイル名は英小文字・数字・アンダースコア・ハイフンのみ
- JSONは必ず有効な形式。コメント不可
- mcfunctionのコメントは # で開始
- 説明・注意点はコードブロックの外に日本語で記述
- 数値ID・データ値は絶対に使用しない（1.13+のため）`;
};

const MC_ALL_COMMANDS = new Set(MC_AUTO._root.map(c => c.l));

function getValidCommands(targetVersion) {
  return new Set(filterByVersion(MC_AUTO._root, targetVersion).map(c => c.l));
}

function getAutocompleteSuggestions(lineText, cursorCol, targetVersion) {
  const text = lineText.substring(0, cursorCol).trimStart();
  if (!text || text.startsWith('#')) return [];

  const tokens = text.split(/\s+/);
  const currentWord = tokens[tokens.length - 1] || '';
  const completed = tokens.slice(0, -1);

  // Inside selector brackets
  const lastOpen = text.lastIndexOf('[');
  const lastClose = text.lastIndexOf(']');
  if (lastOpen > lastClose) {
    const inside = text.substring(lastOpen + 1);
    const parts = inside.split(',');
    const lastPart = parts[parts.length - 1].trim();
    return filterByVersion(MC_AUTO._selector_args, targetVersion).filter(s => s.l.startsWith(lastPart.toLowerCase()));
  }

  // Selector (@)
  if (currentWord.startsWith('@') && currentWord.length <= 2) {
    return filterByVersion(MC_AUTO._selectors, targetVersion).filter(s => s.l.startsWith(currentWord));
  }

  // Determine context
  if (completed.length === 0) {
    return filterByVersion(MC_AUTO._root, targetVersion).filter(s => s.l.startsWith(currentWord.toLowerCase()));
  }

  const cmd = completed[0].toLowerCase();

  // Execute chain: find last meaningful subcommand
  if (cmd === 'execute') {
    let ctx = 'execute';
    for (let i = 1; i < completed.length; i++) {
      const tok = completed[i].toLowerCase();
      if (tok === 'run') { ctx = '_root'; continue; }
      if (tok === 'if' || tok === 'unless') { ctx = 'execute.if'; continue; }
      if (tok === 'store') { ctx = 'execute.store'; continue; }
      if (tok === 'result' || tok === 'success') { ctx = 'execute.store.result'; continue; }
      if (['as', 'at', 'positioned', 'rotated', 'facing', 'in', 'anchored', 'align', 'on', 'summon'].includes(tok)) {
        ctx = 'execute'; // After argument, back to execute subcommands
      }
    }
    const items = filterByVersion(MC_AUTO[ctx] || [], targetVersion);
    if (!currentWord) return items.slice(0, 15);
    return items.filter(s => s.l.toLowerCase().startsWith(currentWord.toLowerCase()));
  }

  // Gamerule: show gamerule names
  if (cmd === 'gamerule' && completed.length === 1) {
    return filterByVersion(MC_AUTO._gamerules, targetVersion).filter(s => s.l.toLowerCase().startsWith(currentWord.toLowerCase()));
  }

  // Title: skip selector token
  if (cmd === 'title' && completed.length >= 2 && completed[1].startsWith('@')) {
    const items = filterByVersion(MC_AUTO.title || [], targetVersion);
    return items.filter(s => s.l.toLowerCase().startsWith(currentWord.toLowerCase()));
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

  const items = filterByVersion(MC_AUTO[contextKey] || [], targetVersion);
  if (!currentWord) return items.slice(0, 15);
  return items.filter(s => s.l.toLowerCase().startsWith(currentWord.toLowerCase()));
}

function validateMcfunctionLine(line, lineNum, targetVersion) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Handle $ prefix (macro lines in 1.20.2+)
  const isMacro = trimmed.startsWith('$');
  const cmdLine = isMacro ? trimmed.substring(1).trim() : trimmed;
  const tokens = cmdLine.split(/\s+/);
  const cmd = tokens[0]?.toLowerCase();

  if (!cmd) return null;

  // Check macro version compatibility
  if (isMacro && targetVersion && !versionAtLeast(targetVersion, '1.20.2')) {
    return { line: lineNum, msg: `マクロ($)は 1.20.2 以降で使用可能です（現在: ${targetVersion}）`, type: 'error' };
  }

  // Check if command exists at all
  if (!MC_ALL_COMMANDS.has(cmd)) {
    return { line: lineNum, msg: `不明なコマンド: ${cmd}`, type: 'error' };
  }

  // Check version-specific command availability
  if (targetVersion) {
    const cmdEntry = MC_AUTO._root.find(c => c.l === cmd);
    if (cmdEntry) {
      if (cmdEntry.v && !versionAtLeast(targetVersion, cmdEntry.v)) {
        return { line: lineNum, msg: `${cmd} は ${cmdEntry.v} 以降で使用可能です（現在: ${targetVersion}）`, type: 'error' };
      }
      if (cmdEntry.rm && versionAtLeast(targetVersion, cmdEntry.rm)) {
        return { line: lineNum, msg: `${cmd} は ${cmdEntry.rm} で削除されました（現在: ${targetVersion}）`, type: 'error' };
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
    if (squareDepth < 0) return { line: lineNum, msg: '"]" に対応する "[" がありません', type: 'error' };
    if (curlyDepth < 0) return { line: lineNum, msg: '"}" に対応する "{" がありません', type: 'error' };
  }
  if (squareDepth !== 0) return { line: lineNum, msg: '"[" が閉じられていません', type: 'error' };
  if (curlyDepth !== 0) return { line: lineNum, msg: '"{" が閉じられていません', type: 'error' };

  // Check selector format - version-aware for @n
  if (targetVersion && !versionAtLeast(targetVersion, '1.21')) {
    const nSelectorMatch = trimmed.match(/@n(?:\[|\s|$)/);
    if (nSelectorMatch) {
      return { line: lineNum, msg: `@n セレクターは 1.21 以降で使用可能です（現在: ${targetVersion}）`, type: 'warning' };
    }
    const selectorMatch = trimmed.match(/@[^aeprs\s\[]/);
    if (selectorMatch) {
      return { line: lineNum, msg: `不正なセレクター: ${selectorMatch[0]} (@a/@e/@p/@r/@s が有効)`, type: 'warning' };
    }
  } else {
    const selectorMatch = trimmed.match(/@[^aeprsn\s\[]/);
    if (selectorMatch) {
      return { line: lineNum, msg: `不正なセレクター: ${selectorMatch[0]} (@a/@e/@p/@r/@s/@n が有効)`, type: 'warning' };
    }
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
      content: TEMPLATES.recipe_shaped.content(),
      parentId: recipeId
    });
  }

  if (options.sampleAdvancement) {
    const advId = id();
    files.push({ id: advId, name: 'advancement', type: 'folder', content: null, parentId: nsId });
    files.push({
      id: id(), name: 'example.json', type: 'json',
      content: TEMPLATES.advancement.content(),
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

function callAIStream(provider, apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal, thinkingLevel) {
  if (provider === 'openai') {
    callOpenAIStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal);
  } else {
    callGeminiStream(apiKey, modelId, messages, systemPrompt, onChunk, onDone, onError, signal, thinkingLevel);
  }
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
  URL.revokeObjectURL(url);
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
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] alive 1
scoreboard players set @a[tag=player] deaths 0
gamemode adventure @a[tag=player]

# タイマー設定（${gt}秒）
scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

# ボスバー
bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players @a[tag=player]
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow
bossbar set ${ns}:timer style notched_10

# ゲーム開始
scoreboard players set #game game_state 1
title @a[tag=player] title {"text":"${tA}ごっこ","bold":true,"color":"gold"}
title @a[tag=player] subtitle {"text":"まもなく開始...","color":"yellow"}
playsound minecraft:block.note_block.pling master @a[tag=player]` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ ゲームループ（ゲーム中毎tick） ═══

# ── ゲームモード管理 ──
gamemode adventure @a[tag=player,scores={alive=1}]
gamemode spectator @a[tag=player,scores={alive=0}]

# ── 死亡検知（${tB}が死亡→捕まった） ──
execute as @a[tag=runner_tag,scores={deaths=1..}] run scoreboard players set @s alive 0
execute as @a[tag=runner_tag,scores={deaths=1..}] run tellraw @a[tag=player] [{"selector":"@s","color":"${settings.colorB || 'blue'}"},{"text":" が捕まった！","color":"yellow"}]
scoreboard players set @a[tag=player] deaths 0

# ── 開始カウントダウン（3秒） ──
execute if score #timer pre_count matches 60 run title @a[tag=player] title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title @a[tag=player] title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title @a[tag=player] title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title @a[tag=player] title {"text":"スタート！","bold":true,"color":"green"}
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
title @a[tag=player] actionbar ["",{"text":"${tA} ","bold":true,"color":"${settings.colorA || 'red'}"},{"text":"vs ","color":"gray"},{"text":"${tB} 残り","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#runner_count","objective":"team_count"},"color":"white"},{"text":"人","color":"${settings.colorB || 'blue'}"}]

# ── 勝利判定 ──
execute if score #runner_count team_count matches 0 run function ${ns}:win_chaser
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_runner` });

    files.push({ path: `data/${ns}/function/win_chaser.mcfunction`, content:
`# ═══ ${tA}の勝利 ═══
title @a[tag=player] title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
title @a[tag=player] subtitle {"text":"全員捕まえた！","color":"yellow"}
tellraw @a[tag=player] {"text":"═══ ゲーム終了 ═══","color":"gold","bold":true}
execute as @a[tag=chaser_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_runner.mcfunction`, content:
`# ═══ ${tB}の勝利 ═══
title @a[tag=player] title {"text":"逃走成功！","bold":true,"color":"${settings.colorB || 'blue'}"}
title @a[tag=player] subtitle {"text":"${tB}の勝利！","color":"yellow"}
tellraw @a[tag=player] {"text":"═══ ゲーム終了 ═══","color":"gold","bold":true}
execute as @a[tag=runner_tag,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`# ═══ ゲーム終了 & リセット ═══
scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure @a[tag=player]
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] alive 0
tag @a remove chaser_tag
tag @a remove runner_tag
team empty chaser
team empty runner
tellraw @a[tag=player] {"text":"ゲームがリセットされました","color":"gray"}` });

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

clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] kills 0
scoreboard players set @a[tag=player] deaths 0
scoreboard players set #team_a kills 0
scoreboard players set #team_b kills 0
gamemode adventure @a[tag=player]

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players @a[tag=player]
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color yellow

give @a[tag=player] iron_sword
give @a[tag=player] bow
give @a[tag=player] arrow 16

scoreboard players set #game game_state 1
title @a[tag=player] title {"text":"PvPアリーナ","bold":true,"color":"gold"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ PvPアリーナ ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title @a[tag=player] title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title @a[tag=player] title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title @a[tag=player] title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title @a[tag=player] title {"text":"戦え！","bold":true,"color":"green"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# キル検知
execute as @a[tag=team_a_tag,scores={deaths=1..}] run scoreboard players add #team_b kills 1
execute as @a[tag=team_b_tag,scores={deaths=1..}] run scoreboard players add #team_a kills 1
execute as @a[scores={deaths=1..}] run tellraw @a[tag=player] [{"selector":"@s"},{"text":" がやられた！","color":"gray"}]
scoreboard players set @a deaths 0

# HUD
bossbar set ${ns}:timer name ["",{"text":"${tA}: ","color":"${settings.colorA || 'red'}"},{"score":{"name":"#team_a","objective":"kills"}},{"text":" | ${tB}: ","color":"${settings.colorB || 'blue'}"},{"score":{"name":"#team_b","objective":"kills"}},{"text":" (${tk}キルで勝利)","color":"gray"}]

# 勝利判定
execute if score #team_a kills matches ${tk}.. run function ${ns}:win_a
execute if score #team_b kills matches ${tk}.. run function ${ns}:win_b
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:win_check` });

    files.push({ path: `data/${ns}/function/win_a.mcfunction`, content:
`title @a[tag=player] title {"text":"${tA}の勝利！","bold":true,"color":"${settings.colorA || 'red'}"}
execute as @a[tag=team_a_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_b.mcfunction`, content:
`title @a[tag=player] title {"text":"${tB}の勝利！","bold":true,"color":"${settings.colorB || 'blue'}"}
execute as @a[tag=team_b_tag] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/win_check.mcfunction`, content:
`# 時間切れ: キル数が多いチームが勝利
execute if score #team_a kills > #team_b kills run function ${ns}:win_a
execute if score #team_b kills > #team_a kills run function ${ns}:win_b
execute if score #team_a kills = #team_b kills run tellraw @a[tag=player] {"text":"引き分け！","color":"yellow","bold":true}
execute if score #team_a kills = #team_b kills run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure @a[tag=player]
clear @a[tag=player]
effect clear @a[tag=player]
tag @a remove team_a_tag
tag @a remove team_b_tag
team empty team_a
team empty team_b
tellraw @a[tag=player] {"text":"ゲームリセット完了","color":"gray"}` });

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
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] alive 1
gamemode adventure @a[tag=player]

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60
scoreboard players set #alive_count alive 0

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players @a[tag=player]
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color aqua

# プレイヤーにシャベルを配布
give @a[tag=player] diamond_shovel

scoreboard players set #game game_state 1
title @a[tag=player] title {"text":"スプリーフ","bold":true,"color":"aqua"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ スプリーフ ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title @a[tag=player] title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title @a[tag=player] title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title @a[tag=player] title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title @a[tag=player] title {"text":"掘れ！","bold":true,"color":"aqua"}
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
execute as @a[tag=player,scores={alive=1}] run title @a[tag=player] title [{"selector":"@s","bold":true,"color":"gold"},{"text":"の勝利！","bold":true,"color":"yellow"}]
execute as @a[tag=player,scores={alive=1}] at @s run playsound minecraft:ui.toast.challenge_complete master @s
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure @a[tag=player]
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] alive 0
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
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] checkpoint 0
scoreboard players set @a[tag=player] finished 0
gamemode adventure @a[tag=player]

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec 0
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players @a[tag=player]
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value 0
bossbar set ${ns}:timer color green

scoreboard players set #game game_state 1
title @a[tag=player] title {"text":"レース","bold":true,"color":"green"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ レース ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title @a[tag=player] title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title @a[tag=player] title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title @a[tag=player] title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title @a[tag=player] title {"text":"GO！","bold":true,"color":"green"}
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
title @a[tag=player] actionbar ["",{"text":"チェックポイント: ","color":"green"},{"score":{"name":"@s","objective":"checkpoint"},"color":"white"}]

# 制限時間チェック
execute if score #timer timer_sec matches ${gt}.. run function ${ns}:end` });

    files.push({ path: `data/${ns}/function/goal.mcfunction`, content:
`# ═══ ゴール処理 ═══
# ゴール地点で: execute as @a[tag=player,scores={finished=0}] at @s if entity @e[tag=goal,distance=..3] run function ${ns}:goal
scoreboard players set @s finished 1
tellraw @a[tag=player] [{"selector":"@s","color":"gold","bold":true},{"text":" がゴール！ （","color":"green"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"white"},{"text":"秒）","color":"green"}]
title @s title {"text":"ゴール！","bold":true,"color":"gold"}
playsound minecraft:ui.toast.challenge_complete master @s` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure @a[tag=player]
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
clear @a[tag=player]
effect clear @a[tag=player]
scoreboard players set @a[tag=player] score 0
scoreboard players set @a[tag=player] pickup 0
gamemode adventure @a[tag=player]

scoreboard players set #timer timer_tick 0
scoreboard players set #timer timer_sec ${gt}
scoreboard players set #timer pre_count 60

bossbar add ${ns}:timer ""
bossbar set ${ns}:timer players @a[tag=player]
bossbar set ${ns}:timer max ${gt}
bossbar set ${ns}:timer value ${gt}
bossbar set ${ns}:timer color purple

scoreboard players set #game game_state 1
title @a[tag=player] title {"text":"宝探し","bold":true,"color":"light_purple"}
title @a[tag=player] subtitle {"text":"${itemName}を集めろ！","color":"yellow"}` });

    files.push({ path: `data/${ns}/function/game_loop.mcfunction`, content:
`# ═══ 宝探し ゲームループ ═══

# カウントダウン
execute if score #timer pre_count matches 60 run title @a[tag=player] title {"text":"3","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 40 run title @a[tag=player] title {"text":"2","bold":true,"color":"yellow"}
execute if score #timer pre_count matches 20 run title @a[tag=player] title {"text":"1","bold":true,"color":"red"}
execute if score #timer pre_count matches 1 run title @a[tag=player] title {"text":"探せ！","bold":true,"color":"light_purple"}
execute if score #timer pre_count matches 1.. run scoreboard players remove #timer pre_count 1

# タイマー
execute if score #timer pre_count matches 0 run scoreboard players add #timer timer_tick 1
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 20.. run scoreboard players set #timer timer_tick 0
execute if score #timer pre_count matches 0 if score #timer timer_tick matches 0 if score #timer timer_sec matches 1.. run scoreboard players remove #timer timer_sec 1
execute store result bossbar ${ns}:timer value run scoreboard players get #timer timer_sec

# アイテム取得検知
execute as @a[tag=player,scores={pickup=1..}] run scoreboard players operation @s score += @s pickup
execute as @a[tag=player,scores={pickup=1..}] run tellraw @a[tag=player] [{"selector":"@s","color":"gold"},{"text":" が${itemName}を見つけた！(計","color":"yellow"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個)","color":"yellow"}]
scoreboard players set @a[tag=player] pickup 0

# HUD
bossbar set ${ns}:timer name ["",{"text":"残り ","color":"yellow"},{"score":{"name":"#timer","objective":"timer_sec"},"color":"aqua"},{"text":"秒","color":"yellow"}]
title @a[tag=player] actionbar ["",{"text":"スコア: ","color":"light_purple"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個","color":"light_purple"}]

# 時間切れ
execute if score #timer pre_count matches 0 if score #timer timer_sec matches 0 run function ${ns}:result` });

    files.push({ path: `data/${ns}/function/result.mcfunction`, content:
`# ═══ 結果発表 ═══
tellraw @a[tag=player] {"text":"═══ 宝探し終了！ ═══","color":"gold","bold":true}
tellraw @a[tag=player] {"text":"--- スコアボード ---","color":"yellow"}
execute as @a[tag=player] run tellraw @a[tag=player] [{"selector":"@s"},{"text":": ","color":"gray"},{"score":{"name":"@s","objective":"score"},"color":"white"},{"text":"個","color":"gray"}]
title @a[tag=player] title {"text":"終了！","bold":true,"color":"gold"}
function ${ns}:end` });

    files.push({ path: `data/${ns}/function/end.mcfunction`, content:
`scoreboard players set #game game_state 0
bossbar remove ${ns}:timer
gamemode adventure @a[tag=player]
clear @a[tag=player]
effect clear @a[tag=player]
tag @a remove player
tellraw @a {"text":"ゲームリセット完了","color":"gray"}` });
  }

  return files;
}

// ════════════════════════════════════════════════════════════
// SETUP WIZARD
// ════════════════════════════════════════════════════════════

function SetupWizard({ onComplete, onCancel }) {
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
                    className="mt-0.5 accent-[#0f3460]"
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
    const content = tpl.content(fileName.replace(tpl.ext, ''), namespace);
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

function CodeEditor({ file, onChange, targetVersion }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumRef = useRef(null);

  // Autocomplete state
  const [acItems, setAcItems] = useState([]);
  const [acIndex, setAcIndex] = useState(0);
  const [acPos, setAcPos] = useState({ top: 0, left: 0 });
  const acRafRef = useRef(null);

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

  // Insert the selected autocomplete item
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
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos;
      ta.focus();
    });
    setAcItems([]);
  }, [onChange]);

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
              <span className="flex items-center gap-1 text-mc-accent">
                <AlertTriangle size={12} /> {mcfErrorCount}エラー
              </span>
            )}
            {mcfWarnCount > 0 && (
              <span className="flex items-center gap-1 text-mc-warning">
                <Info size={12} /> {mcfWarnCount}警告
              </span>
            )}
            {mcfErrorCount === 0 && mcfWarnCount === 0 && content.trim() && (
              <span className="flex items-center gap-1 text-mc-success">
                <CheckCircle size={12} /> 構文OK
              </span>
            )}
            <span className="text-mc-muted/50 text-[10px]">補完: 入力中に候補表示</span>
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
            return (
              <div
                key={i}
                className={`line-num ${
                  err ? (err.type === 'error' ? 'text-mc-accent' : 'text-mc-warning') : 'text-mc-muted/40'
                }`}
                title={err ? err.msg : undefined}
              >
                {err ? (err.type === 'error' ? '●' : '▲') : (i + 1)}
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
            onClick={() => setAcItems([])}
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
                  <span className="font-mono text-sky-300 font-medium">{item.l}</span>
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
      {isMcfunction && (mcfErrorCount > 0 || mcfWarnCount > 0) && (
        <div className="px-3 py-1 bg-mc-dark/50 border-t border-mc-border/30 text-[10px] text-mc-muted max-h-20 overflow-y-auto">
          {Object.entries(lineErrors).slice(0, 8).map(([ln, e]) => (
            <div key={ln} className={`flex items-center gap-2 py-0.5 ${e.type === 'error' ? 'text-mc-accent' : 'text-mc-warning'}`}>
              <span className="font-mono w-8 text-right">{ln}行</span>
              <span className="truncate">{e.msg}</span>
            </div>
          ))}
          {Object.keys(lineErrors).length > 8 && (
            <div className="text-mc-muted/50 py-0.5">...他 {Object.keys(lineErrors).length - 8}件</div>
          )}
        </div>
      )}
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
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SETTINGS PANEL
// ════════════════════════════════════════════════════════════

function SettingsPanel({ project, setProject, onClose }) {
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
  const [settings, setSettings] = useState({ gameTime: 300, teamA: '鬼', teamB: '逃走者', colorA: 'red', colorB: 'blue', targetKills: 10, fallY: 50, targetItem: 'minecraft:diamond' });

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
                  className={`w-full text-left p-3 rounded border transition-colors flex items-start gap-3 ${
                    selectedType === gt.id ? 'border-mc-info bg-mc-info/10' : 'border-mc-border/50 hover:border-mc-border bg-mc-dark/20'
                  }`}
                >
                  <span className="text-2xl">{gt.icon}</span>
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
                <span className="text-xl">{gameType.icon}</span>
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
    <div className="px-3 py-2 bg-mc-dark/50 border-b border-mc-border space-y-2">
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
          className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1 text-xs text-mc-text focus:outline-none focus:border-mc-info cursor-pointer"
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
            近日対応予定
          </span>
          <p className="text-[10px] text-mc-muted/60">
            API公開後にAPIキーを設定することで利用可能になります。
          </p>
          <p className="text-[10px] text-mc-muted/60">
            <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-mc-info hover:underline inline-flex items-center gap-1">
              {provider.linkLabel} <ExternalLink size={9} />
            </a>
            でAPIキーを事前取得できます。
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
              className="flex-1 bg-mc-dark border border-mc-border rounded px-2 py-1.5 text-xs text-mc-text placeholder-mc-muted/50 focus:outline-none focus:border-mc-info"
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
        <div key={`c${idx}`} className="my-2 rounded overflow-hidden border border-mc-border/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-mc-darker text-[10px] text-mc-muted font-mono">
            <FileCode size={10} />
            <span className="truncate">{filePath}</span>
            <span className="ml-auto text-mc-muted/50">{lang}</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-mc-text bg-mc-dark overflow-x-auto leading-relaxed">
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
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {!isUser && <Bot size={12} className="text-mc-info" />}
          <span className="text-[10px] text-mc-muted">
            {isUser ? 'あなた' : modelLabel}
          </span>
        </div>
        <div className={`rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-mc-info/20 border border-mc-info/30'
            : 'bg-mc-dark border border-mc-border/50'
        }`}>
          {renderContent(message.content)}
        </div>
        {hasFiles && !message.streaming && (
          <button
            onClick={() => onApply(codeBlocks)}
            className="mt-2 px-3 py-1.5 text-xs font-medium rounded bg-mc-success/20 border border-mc-success/40 text-mc-success hover:bg-mc-success/30 transition-colors flex items-center gap-1.5"
          >
            <Play size={11} />
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
  const abortRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !apiKey || streaming || currentModel.comingSoon) return;

    setError('');
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

    const apiMessages = newMessages.map((m, i) => {
      if (m.role === 'user' && i === newMessages.length - 1) {
        return { ...m, content: m.content + contextNote };
      }
      return m;
    });

    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = AI_SYSTEM_PROMPT(project.namespace, project.targetVersion);
    const modelLabel = currentModel.label;

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
  };

  const samplePrompts = [
    'ダイヤモンドソードの強化レシピを作って',
    'ダイヤモンドを拾うと進捗が解除される仕組みを作って',
    '鬼ごっこミニゲームのデータパックを作って',
    'プレイヤーがスニークしたらパーティクルが出る仕組みを作って',
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AISettingsInline selectedModel={selectedModel} setSelectedModel={setSelectedModel} apiKey={apiKey} setApiKey={setApiKey} />

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles size={32} className="text-mc-info/40 mb-3" />
            <p className="text-sm font-medium text-mc-text mb-1">AI データパックアシスタント</p>
            <p className="text-xs text-mc-muted mb-2">
              自然言語で指示するだけで、データパックのファイルを自動生成します。
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
              <div className="space-y-2 w-full max-w-sm">
                <p className="text-[10px] text-mc-muted mb-2">試してみる:</p>
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 text-xs rounded border border-mc-border/50 bg-mc-dark/50 hover:bg-mc-dark hover:border-mc-info/30 text-mc-muted hover:text-mc-text transition-colors"
                  >
                    <MessageSquare size={10} className="inline mr-2 opacity-50" />
                    {prompt}
                  </button>
                ))}
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

        {streaming && !streamingText && (
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

      <div className="border-t border-mc-border p-3">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={handleReset}
              className="text-[10px] text-mc-muted hover:text-mc-text flex items-center gap-1 transition-colors"
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
            placeholder={currentModel.comingSoon ? `${currentModel.label} は近日対応予定です` : apiKey ? 'AIに指示を入力...' : 'APIキーを設定してください（必須）'}
            disabled={!apiKey || streaming || currentModel.comingSoon}
            className="flex-1 bg-mc-dark border border-mc-border rounded px-3 py-2 text-sm text-mc-text placeholder-mc-muted/50 focus:outline-none focus:border-mc-info disabled:opacity-40 disabled:cursor-not-allowed"
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
    }
    setInitialized(true);
  }, []);

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

  const handleDownload = async () => {
    const errs = errors.filter(e => e.type === 'error');
    if (errs.length > 0) {
      if (!confirm(`${errs.length}件のエラーがあります。それでもダウンロードしますか？`)) return;
    }
    await generateZip(project, files);
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
          <div className="flex-1 overflow-y-auto py-1">
            {rootFiles.length === 0 ? (
              <div className="text-center py-8 text-mc-muted">
                <Folder size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">ファイルがありません</p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="text-xs text-mc-info hover:underline mt-1"
                >
                  ウィザードで作成
                </button>
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

            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto text-mc-muted hover:text-mc-text px-2 hidden lg:block"
                title="サイドバーを閉じる"
              >
                <PanelLeftClose size={14} />
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex min-h-0">
            {activeTab === 'editor' ? (
              <CodeEditor file={selectedFile} onChange={handleFileContentChange} targetVersion={project.targetVersion} />
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
        />
      )}
      {showSettings && (
        <SettingsPanel
          project={project}
          setProject={setProject}
          onClose={() => setShowSettings(false)}
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
