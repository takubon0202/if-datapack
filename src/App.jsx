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
} from 'lucide-react';

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const STORAGE_KEY = 'mc-datapack-builder-v1';

const VERSION_FORMATS = {
  '1.21.11': { min: [94, 1], max: [94, 1], useNewFormat: true },
  '1.21.10': { min: [88, 0], max: [88, 0], useNewFormat: true },
  '1.21.9':  { min: [88, 0], max: [88, 0], useNewFormat: true },
  '1.21.4':  { format: 61, useNewFormat: false },
  '1.21.2':  { format: 57, useNewFormat: false },
  '1.21':    { format: 48, useNewFormat: false },
  '1.20.6':  { format: 41, useNewFormat: false },
  '1.20.4':  { format: 26, useNewFormat: false },
  '1.20.2':  { format: 18, useNewFormat: false },
};

const VERSION_LIST = Object.keys(VERSION_FORMATS);

const DATAPACK_FOLDERS = [
  { name: 'advancement', label: '進捗' },
  { name: 'banner_pattern', label: '旗の模様' },
  { name: 'cat_variant', label: 'ネコの亜種' },
  { name: 'chat_type', label: 'チャットタイプ' },
  { name: 'damage_type', label: 'ダメージタイプ' },
  { name: 'dimension', label: 'ディメンション' },
  { name: 'dimension_type', label: 'ディメンションタイプ' },
  { name: 'enchantment', label: 'エンチャント' },
  { name: 'enchantment_provider', label: 'エンチャントプロバイダー' },
  { name: 'function', label: '関数' },
  { name: 'instrument', label: '楽器' },
  { name: 'item_modifier', label: 'アイテム修飾子' },
  { name: 'loot_table', label: 'ルートテーブル' },
  { name: 'painting_variant', label: '絵画の亜種' },
  { name: 'predicate', label: '条件' },
  { name: 'recipe', label: 'レシピ' },
  { name: 'structure', label: '構造物' },
  { name: 'tags', label: 'タグ' },
  { name: 'timeline', label: 'タイムライン', minVersion: '1.21.11' },
  { name: 'trim_material', label: '装飾の素材' },
  { name: 'trim_pattern', label: '装飾の模様' },
  { name: 'wolf_variant', label: 'オオカミの亜種' },
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
  { key: 'predicate', label: '条件', icon: HelpCircle, templates: ['predicate'] },
  { key: 'timeline', label: 'タイムライン', icon: Layers, templates: ['timeline'] },
  { key: 'damage_type', label: 'ダメージタイプ', icon: Zap, templates: ['damage_type'] },
];

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════

let _idCounter = Date.now();
const genId = () => `f${++_idCounter}`;

function generatePackMcmeta(project) {
  const ver = VERSION_FORMATS[project.targetVersion];
  if (!ver) return { pack: { pack_format: 48, description: project.description } };

  if (ver.useNewFormat) {
    return {
      pack: {
        description: project.description,
        min_format: ver.min,
        max_format: ver.max
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
                    <option key={v} value={v}>
                      Minecraft {v} (format: {VERSION_FORMATS[v].useNewFormat
                        ? (Array.isArray(VERSION_FORMATS[v].min) ? `${VERSION_FORMATS[v].min[0]}.${VERSION_FORMATS[v].min[1]}` : VERSION_FORMATS[v].min)
                        : VERSION_FORMATS[v].format})
                    </option>
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

function TemplateSelector({ namespace, parentId, onSelect, onClose }) {
  const [selectedCat, setSelectedCat] = useState('function');
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [fileName, setFileName] = useState('');

  const cat = TEMPLATE_CATEGORIES.find(c => c.key === selectedCat);
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
            {TEMPLATE_CATEGORIES.map(c => {
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

function CodeEditor({ file, onChange }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumRef = useRef(null);

  const content = file?.content ?? '';
  const lines = content.split('\n');
  const lineCount = lines.length;

  const isJSON = file?.type === 'json' || file?.type === 'mcmeta';
  const isMcfunction = file?.type === 'mcfunction';

  const jsonError = useMemo(() => {
    if (!isJSON || !content.trim()) return null;
    const r = tryParseJSON(content);
    return r.valid ? null : r.error;
  }, [content, isJSON]);

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
  };

  const handleKeyDown = (e) => {
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
      </div>

      {/* Editor body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="bg-mc-darker/50 py-2 pr-2 pl-3 text-right select-none overflow-hidden border-r border-mc-border/50 flex-shrink-0"
          style={{ width: `${Math.max(3, String(lineCount).length) * 10 + 24}px` }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="line-num text-mc-muted/40">{i + 1}</div>
          ))}
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
            onChange={e => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Error display */}
      {jsonError && (
        <div className="px-3 py-1.5 bg-mc-accent/10 border-t border-mc-accent/30 text-xs text-mc-accent flex items-center gap-2">
          <AlertTriangle size={12} />
          <span className="truncate">{jsonError}</span>
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
              {VERSION_LIST.map(v => <option key={v} value={v}>Minecraft {v}</option>)}
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
// MAIN APP
// ════════════════════════════════════════════════════════════

export default function App() {
  // ── State ──
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
  const [contextMenu, setContextMenu] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const saveTimerRef = useRef(null);

  // ── Load from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.project) setProject(data.project);
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
          const ids = new Set();
          data.files.filter(f => f.type === 'folder').forEach(f => ids.add(f.id));
          setExpanded(ids);
          setInitialized(true);
        } else {
          setShowWizard(true);
        }
      } else {
        setShowWizard(true);
      }
    } catch {
      setShowWizard(true);
    }
    setInitialized(true);
  }, []);

  // ── Save to localStorage (debounced) ──
  useEffect(() => {
    if (!initialized) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, files, savedAt: Date.now() }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (e) {
        console.error('Save failed:', e);
      }
    }, 500);
  }, [project, files, initialized]);

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
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, files, savedAt: Date.now() }));
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
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
    });
    setFiles(newFiles);
    const allIds = new Set();
    newFiles.filter(f => f.type === 'folder').forEach(f => allIds.add(f.id));
    setExpanded(allIds);
    setShowWizard(false);
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

  const handleDownload = async () => {
    const errs = errors.filter(e => e.type === 'error');
    if (errs.length > 0) {
      if (!confirm(`${errs.length}件のエラーがあります。それでもダウンロードしますか？`)) return;
    }
    await generateZip(project, files);
  };

  const handleReset = () => {
    if (confirm('プロジェクトをリセットして初期設定ウィザードを開きますか？\n現在のデータは失われます。')) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setInitialized(false);
      localStorage.removeItem(STORAGE_KEY);
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
                className="w-6 h-6 flex items-center justify-center text-mc-muted hover:text-mc-success hover:bg-mc-dark rounded transition-colors"
                title="テンプレートから追加"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => { const root = files.find(f => !f.parentId); if (root) addFolder(root.id); }}
                className="w-6 h-6 flex items-center justify-center text-mc-muted hover:text-yellow-400 hover:bg-mc-dark rounded transition-colors"
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
              className="w-full text-left px-2 py-1.5 text-xs text-mc-muted hover:text-mc-text hover:bg-mc-dark rounded transition-colors flex items-center gap-2"
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
              <CodeEditor file={selectedFile} onChange={handleFileContentChange} />
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
          onCancel={() => { if (files.length > 0) setShowWizard(false); }}
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
