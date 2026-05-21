'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v24
//  EXACT PHOTO CLONE — Ultra Glossy Engine
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, goalText;
const R = 18, rowHeight = 32, SPEED = 32;
// CEILING_Y is set dynamically in startGame() based on actual HUD height
window.CEILING_Y = 0;


const COLORS = ['#ff4d4d', '#3399ff', '#33cc33', '#ffcc00', '#cc33ff', '#00f2fe'];

// Maps generator color names → hex used by renderer
const COLORS_MAP = {
    red:    '#ff4d4d',
    blue:   '#3399ff',
    green:  '#33cc33',
    yellow: '#ffcc00',
    purple: '#cc33ff',
    cyan:   '#00f2fe'
};
const GEN_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];

// 🧠 Difficulty Config
function getDifficulty(level, failCount) {
  let config = {
    rows: 5,
    cols: 11, // Standardize column count to make bubble sizes constant and small
    colorCount: 3,
    hardChance: 0,
    gapChance: 0
  };

  // pehle 1-70 level aasan ho (Keep levels 1-70 strictly at the easy baseline config)
  if (level <= 70) {
    return config;
  }

  // Shift level so progressive difficulty progression starts organically from Level 71
  const effectiveLevel = level - 50; // Level 71 becomes effectiveLevel 21, triggering the first bump

  // 📈 Progressive Difficulty
  if (effectiveLevel > 20) {
    config.rows = 6;
    config.colorCount = 4;
  }

  if (effectiveLevel > 50) {
    config.rows = 7;
    config.gapChance = 0.05;
  }

  if (effectiveLevel > 80) {
    config.rows = 8;
    config.hardChance = 0.08;
  }

  if (effectiveLevel > 160) {
    config.rows = 9;
    config.hardChance = 0.15;
    config.gapChance = 0.1;
  }

  // 🧠 Adaptive Easy Mode
  if (failCount >= 3) {
    config.colorCount = Math.max(2, config.colorCount - 1);
    config.hardChance = 0;
    config.gapChance = 0;

    console.log("Easy Mode Activated");
  }

  return config;
}

// 🔵 Normal Bubble
function normalBubble(color, theme = 'normal') {
  return {
    type: "normal",
    color,
    hp: 1,
    theme
  };
}

// 🪨 Hard Bubble
function hardBubble(color, theme = 'normal') {
  let hp = 2; // ice, chain, spike
  if (theme === 'fire') hp = 3;
  else if (theme === 'void') hp = 4;
  else if (theme === 'cosmic') hp = 5;
  else if (theme === 'metal') hp = 6;
  return {
    type: "hard",
    color,
    hp,
    theme
  };
}

// Dynamically select appropriate visual themes for hard bubbles based on level milestone
function pickTheme(level) {
  let themes = [];
  if (level >= 71) themes.push('ice');
  if (level >= 110) themes.push('chain');
  if (level >= 160) themes.push('stone');
  if (level >= 220) themes.push('fire');
  if (level >= 300) themes.push('void');
  if (level >= 400) themes.push('cosmic');
  if (level >= 500) themes.push('metal');
  if (level >= 600) themes.push('spike');
  if (themes.length === 0) return 'normal';
  return themes[Math.floor(Math.random() * themes.length)];
}

function getLevelConfig(level) {
  const config = getDifficulty(level, S.playerFails);
  return {
    start: level,
    end: level,
    colors: config.colorCount,
    rows: config.rows,
    cols: config.cols,
    hardChance: config.hardChance,
    gapChance: config.gapChance,
    features: pickFeatures(level)
  };
}

function pickFeatures(level) {
  let features = [];
  if (level >= 71) features.push('ice');
  if (level >= 110) features.push('chain');
  if (level >= 160) features.push('stone');
  if (level >= 220) features.push('fire');
  if (level >= 300) features.push('void');
  if (level >= 400) features.push('cosmic');
  if (level >= 500) features.push('metal');
  if (level >= 600) features.push('spike');
  return features;
}

// 🎯 Generate Level Grid
function generateLevel(level, failCount = 0) {
  const config = getDifficulty(level, failCount);

  const activeColors = GEN_COLORS.slice(
    0,
    config.colorCount
  );

  const grid = [];

  for (let row = 0; row < config.rows; row++) {
    const currentRow = [];

    for (let col = 0; col < config.cols; col++) {

      // 🕳 Create small gaps (restricted to levels > 70 to keep 1-70 easy)
      if (
        level > 70 &&
        Math.random() < config.gapChance
      ) {
        currentRow.push(null);
        continue;
      }

      const color =
        activeColors[
          Math.floor(
            Math.random() * activeColors.length
          )
        ];

      // 🪨 Hard bubble (restricted to levels > 70 to keep 1-70 easy)
      if (
        level > 70 &&
        Math.random() < config.hardChance
      ) {
        const theme = pickTheme(level);
        currentRow.push(hardBubble(color, theme));
      } else {
        currentRow.push(normalBubble(color, 'normal'));
      }
    }

    grid.push(currentRow);
  }

  return grid;
}

// 🎯 SMART NEXT BALL SYSTEM
// Gives useful colors more often, mapped dynamically to hex colors
function getNextBallColor(aliveBubbles, failCount = 0) {
  const colorMap = {};

  // Count colors in grid
  aliveBubbles.forEach(ball => {
    if (ball && ball.alive && ball.color) {
      colorMap[ball.color] =
        (colorMap[ball.color] || 0) + 1;
    }
  });

  const availableColors = Object.keys(colorMap);
  if (availableColors.length === 0) {
    return COLORS[0];
  }

  // 🧠 If player struggling or near win → helpful colors (highest frequency matching)
  if (failCount >= 2 || availableColors.length <= 4) {
    const sorted = availableColors.sort((a, b) => colorMap[b] - colorMap[a]);
    return sorted[0];
  }

  // 🎲 Normal random
  return availableColors[
    Math.floor(
      Math.random() * availableColors.length
    )
  ];
}

// 🎮 CHECK LEVEL WIN
function checkWin(grid) {
  for (let row of grid) {
    for (let ball of row) {
      if (ball !== null) {
        return false;
      }
    }
  }

  return true;
}

// 💀 CHECK LEVEL LOSE
function checkLose(grid) {
  const lastRow = grid[grid.length - 1];

  return lastRow.some(ball => ball !== null);
}


let S = {
    score: 0, coins: Number(localStorage.getItem('bs_coins')) || 1250, ammo: 25,
    currentLevel: Number(localStorage.getItem('bs_level')) || 1,
    unlockedLevels: Number(localStorage.getItem('bs_unlocked')) || 1,
    levelStars: JSON.parse(localStorage.getItem('bs_stars')) || {},
    powerups: JSON.parse(localStorage.getItem('bs_powerups')) || { bomb: 3, aim: 3, fireball: 1 },
    playerFails: 0,          // Tracks consecutive fails for Adaptive Easy Mode
    objective: { count: 0, total: 6 },
    settings: JSON.parse(localStorage.getItem('bs_settings')) || { sound: true, music: true },
    dailyLogin: JSON.parse(localStorage.getItem('bs_daily_login')) || { lastClaimedDate: null, currentDay: 0, claimedDays: [] },
    missions: JSON.parse(localStorage.getItem('bs_missions')) || {
        easy: { progress: 0, target: 150, claimed: false },
        medium: { progress: 0, target: 3, claimed: false },
        hard: { progress: 0, target: 10000, claimed: false }
    },
    dailyBonus: JSON.parse(localStorage.getItem('bs_daily_bonus')) || { lastSpinTime: 0 }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let clusterOffset = 0; // For dynamic vertical shift
let introAnimFrame = 0;
let mouseX = 195, mouseY = 100, shakeFrames = 0;

let activeColor = COLORS[0], reserveColor = COLORS[1];
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    isGameActive = (id === 'gameplayScreen');
    if (id === 'mapScreen') {
        renderMap();
        if (window.renderMissions) window.renderMissions();
    }
    updateUI();
}

// ──────── MAP ENGINE (UNCHANGED) ────────
function renderMap() {
    const path = document.getElementById('levelPath');
    if (!path) return;
    path.innerHTML = '';
    const totalLevels = 5000;
    
    // Extremely wavy levels with exactly 4 turns (bends) per page (viewport) (amplitude 80, frequency 65)
    const center = 165, amplitude = 80, frequency = 65;
    const totalHeight = totalLevels * 130 + 150;
    path.style.height = `${totalHeight}px`;
    
    // ── STEP 1: Generate smooth SVG winding road ribbon behind nodes ──
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("style", "position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;");
    
    let pathD = "";
    // Sample wave coordinates every 10px to draw a perfectly smooth highway/ribbon
    for (let y = totalHeight; y >= 0; y -= 10) {
        const nodeXCenter = center + Math.sin(y / frequency) * amplitude + 28; // 28px is half of node width (56px)
        if (y === totalHeight) {
            pathD += `M ${nodeXCenter} ${y}`;
        } else {
            pathD += ` L ${nodeXCenter} ${y}`;
        }
    }
    
    // 1. Neon Outer Glow Border
    const roadBorder = document.createElementNS(svgNS, "path");
    roadBorder.setAttribute("d", pathD);
    roadBorder.setAttribute("fill", "none");
    roadBorder.setAttribute("stroke", "rgba(99, 102, 241, 0.25)"); 
    roadBorder.setAttribute("stroke-width", "95"); 
    roadBorder.setAttribute("stroke-linecap", "round");
    roadBorder.setAttribute("stroke-linejoin", "round");
    svg.appendChild(roadBorder);

    // 2. Main Road Ribbon Track
    const roadPath = document.createElementNS(svgNS, "path");
    roadPath.setAttribute("d", pathD);
    roadPath.setAttribute("fill", "none");
    roadPath.setAttribute("stroke", "rgba(129, 140, 248, 0.45)"); 
    roadPath.setAttribute("stroke-width", "85"); 
    roadPath.setAttribute("stroke-linecap", "round");
    roadPath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(roadPath);

    // 3. Inner Rich Royal Road Core
    const roadCore = document.createElementNS(svgNS, "path");
    roadCore.setAttribute("d", pathD);
    roadCore.setAttribute("fill", "none");
    roadCore.setAttribute("stroke", "rgba(49, 46, 129, 0.4)"); 
    roadCore.setAttribute("stroke-width", "75"); 
    roadCore.setAttribute("stroke-linecap", "round");
    roadCore.setAttribute("stroke-linejoin", "round");
    svg.appendChild(roadCore);

    // 4. White Dashed Center Lane Marker
    const roadCenter = document.createElementNS(svgNS, "path");
    roadCenter.setAttribute("d", pathD);
    roadCenter.setAttribute("fill", "none");
    roadCenter.setAttribute("stroke", "rgba(255, 255, 255, 0.7)"); 
    roadCenter.setAttribute("stroke-width", "4"); 
    roadCenter.setAttribute("stroke-dasharray", "12, 16"); 
    roadCenter.setAttribute("stroke-linecap", "round");
    svg.appendChild(roadCenter);
    path.appendChild(svg);
    
    // ── STEP 2: Generate Level Circles (Nodes) ──
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= totalLevels; i++) {
        const node = document.createElement('div');
        
        // Determine difficulty type and classes (Only apply hard badges to levels > 70)
        let difficultyClass = '';
        let fireBadgeHtml = '';
        if (i > 70) {
            if (i % 60 === 0) {
                difficultyClass = 'difficulty-super-hard';
                fireBadgeHtml = `<div class="fire-badge super-hard-badge">
                                   <svg class="fire-svg" viewBox="0 0 24 24" style="width:34px; height:40px; display:block;">
                                     <defs>
                                       <linearGradient id="superGrad-${i}" x1="0%" y1="100%" x2="0%" y2="0%">
                                         <stop offset="0%" stop-color="#4a0000" />
                                         <stop offset="35%" stop-color="#cc0000" />
                                         <stop offset="75%" stop-color="#ff3b30" />
                                         <stop offset="100%" stop-color="#ff8800" />
                                       </linearGradient>
                                     </defs>
                                     <path d="M17.55 11.2C17.3 10.3 16.5 9.5 15.7 9.1c-1.4-.7-2-.8-3.1-1.6c-.7-.5-1.2-1.3-1-2.2c0-.1 0-.2.1-.3c.1-.4.4-.7.8-.8c.1 0 .2 0 .2-.1c-.7-.3-1.4-.4-2.2-.4C8.4 3.7 6.7 5.6 6.7 8c0 .3 0 .7.1 1c.1.6.3 1.1.7 1.5c.1.1.2.2.2.3c.4.4.9.7 1.4.9c.5.2.9.5 1.2 1c.5.7.4 1.7-.2 2.3c-.4.4-.9.6-1.5.6c-.5 0-1-.2-1.4-.5c-.9-.7-1.2-1.9-.9-2.9c-.3.2-.6.5-.9.9c-.7.9-1.1 2.1-1.1 3.3c0 3.3 2.7 6 6 6s6-2.7 6-6c0-1.8-.7-3.4-1.9-4.5c.3-.1.6-.2.8-.4c.7-.6 1.2-1.4 1.3-2.3z" fill="url(#superGrad-${i})"/>
                                   </svg>
                                 </div>`;
            } else if (i % 30 === 0) {
                difficultyClass = 'difficulty-very-hard';
                fireBadgeHtml = `<div class="fire-badge very-hard-badge">
                                   <svg class="fire-svg" viewBox="0 0 24 24" style="width:34px; height:40px; display:block;">
                                     <defs>
                                       <linearGradient id="veryHardGrad-${i}" x1="0%" y1="100%" x2="0%" y2="0%">
                                         <stop offset="0%" stop-color="#cc0000" />
                                         <stop offset="50%" stop-color="#ff8800" />
                                         <stop offset="100%" stop-color="#ffcc00" />
                                       </linearGradient>
                                     </defs>
                                     <path d="M17.55 11.2C17.3 10.3 16.5 9.5 15.7 9.1c-1.4-.7-2-.8-3.1-1.6c-.7-.5-1.2-1.3-1-2.2c0-.1 0-.2.1-.3c.1-.4.4-.7.8-.8c.1 0 .2 0 .2-.1c-.7-.3-1.4-.4-2.2-.4C8.4 3.7 6.7 5.6 6.7 8c0 .3 0 .7.1 1c.1.6.3 1.1.7 1.5c.1.1.2.2.2.3c.4.4.9.7 1.4.9c.5.2.9.5 1.2 1c.5.7.4 1.7-.2 2.3c-.4.4-.9.6-1.5.6c-.5 0-1-.2-1.4-.5c-.9-.7-1.2-1.9-.9-2.9c-.3.2-.6.5-.9.9c-.7.9-1.1 2.1-1.1 3.3c0 3.3 2.7 6 6 6s6-2.7 6-6c0-1.8-.7-3.4-1.9-4.5c.3-.1.6-.2.8-.4c.7-.6 1.2-1.4 1.3-2.3z" fill="url(#veryHardGrad-${i})"/>
                                   </svg>
                                 </div>`;
            } else if (i % 15 === 0) {
                difficultyClass = 'difficulty-hard';
                fireBadgeHtml = `<div class="fire-badge hard-badge">
                                   <svg class="fire-svg" viewBox="0 0 24 24" style="width:34px; height:40px; display:block;">
                                     <defs>
                                       <linearGradient id="hardGrad-${i}" x1="0%" y1="100%" x2="0%" y2="0%">
                                         <stop offset="0%" stop-color="#ff6600" />
                                         <stop offset="60%" stop-color="#ffcc00" />
                                         <stop offset="100%" stop-color="#ffe680" />
                                       </linearGradient>
                                     </defs>
                                     <path d="M17.55 11.2C17.3 10.3 16.5 9.5 15.7 9.1c-1.4-.7-2-.8-3.1-1.6c-.7-.5-1.2-1.3-1-2.2c0-.1 0-.2.1-.3c.1-.4.4-.7.8-.8c.1 0 .2 0 .2-.1c-.7-.3-1.4-.4-2.2-.4C8.4 3.7 6.7 5.6 6.7 8c0 .3 0 .7.1 1c.1.6.3 1.1.7 1.5c.1.1.2.2.2.3c.4.4.9.7 1.4.9c.5.2.9.5 1.2 1c.5.7.4 1.7-.2 2.3c-.4.4-.9.6-1.5.6c-.5 0-1-.2-1.4-.5c-.9-.7-1.2-1.9-.9-2.9c-.3.2-.6.5-.9.9c-.7.9-1.1 2.1-1.1 3.3c0 3.3 2.7 6 6 6s6-2.7 6-6c0-1.8-.7-3.4-1.9-4.5c.3-.1.6-.2.8-.4c.7-.6 1.2-1.4 1.3-2.3z" fill="url(#hardGrad-${i})"/>
                                   </svg>
                                 </div>`;
            }
        }
        
        node.className = `node-premium ${difficultyClass}`;
        
        // Invert Y coordinate so Level 1 is at the bottom (130px spacing)
        const yPos = totalHeight - (i * 130); 
        // Align horizontal placement precisely using the node's vertical center (yPos + 28)
        const xPos = center + Math.sin((yPos + 28) / frequency) * amplitude;
        node.style.top = `${yPos}px`; node.style.left = `${xPos}px`;
        
        if (i <= S.unlockedLevels) {
            node.classList.add('unlocked');
            // Fix: use string key for reliable lookup (JSON parse produces string keys)
            let stars = S.levelStars[i] || S.levelStars[String(i)] || 0;
            let starHtml = '';
            if (stars > 0) {
                let starsStr = '';
                for (let s = 0; s < 3; s++) {
                    starsStr += `<span style="color:${s < stars ? '#ffd700' : 'rgba(255,255,255,0.3)'}; font-size:9px; margin:0 0.5px; text-shadow:0 1px 3px rgba(0,0,0,0.7);">★</span>`;
                }
                starHtml = `<div style="position:absolute; bottom:-10px; left:50%; transform:translateX(-50%); display:flex; padding:1px 4px; background:rgba(0,0,0,0.55); border-radius:7px; border:0.5px solid rgba(255,255,255,0.15); z-index:4; pointer-events:none; white-space:nowrap;">${starsStr}</div>`;
            }
            node.innerHTML = `<span>${i}</span>
                              ${starHtml}
                              ${fireBadgeHtml}`;
            node.onclick = () => { S.currentLevel = i; startGame(); };
        } else { 
            // Position lock at the TOP of the circle
            node.innerHTML = `<span>${i}</span>
                              <div style="position:absolute;top:-23px;width:100%;text-align:center;font-size:14px;text-shadow:0 1px 3px rgba(0,0,0,0.4);z-index:4;pointer-events:none;">🔒</div>
                              ${fireBadgeHtml}`; 
        }
        fragment.appendChild(node);
    }
    path.appendChild(fragment);
    
    setTimeout(() => {
        const targetLevel = S.currentLevel || 1;
        const nodes = document.querySelectorAll('.node-premium.unlocked');
        if (nodes.length > 0) {
            const activeNode = nodes[targetLevel - 1];
            if (activeNode) activeNode.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }, 100);
    
    // Add scroll listener for the FAB
    const scroller = document.getElementById('mapScrollArea');
    const focusBtn = document.getElementById('focusCurrentBtn');
    if (scroller && focusBtn) {
        scroller.addEventListener('scroll', () => {
            const targetLevel = S.currentLevel || 1;
            const nodes = document.querySelectorAll('.node-premium.unlocked');
            if (nodes.length > 0) {
                const activeNode = nodes[targetLevel - 1];
                if (activeNode) {
                    const rect = activeNode.getBoundingClientRect();
                    // mapScrollArea takes up most of the screen. We check if node is in viewport.
                    const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight);
                    if (!isVisible) {
                        focusBtn.classList.remove('hidden');
                        const svgArrow = focusBtn.querySelector('svg');
                        if (svgArrow) {
                            // If node is above viewport (rect.top < 0), point UP. Otherwise DOWN.
                            if (rect.top < 0) svgArrow.style.transform = 'rotate(180deg)';
                            else svgArrow.style.transform = 'rotate(0deg)';
                        }
                    } else {
                        focusBtn.classList.add('hidden');
                    }
                }
            }
        });
    }
}

function scrollToCurrentLevel() {
    const targetLevel = S.currentLevel || 1;
    const nodes = document.querySelectorAll('.node-premium.unlocked');
    if (nodes.length > 0) {
        const activeNode = nodes[targetLevel - 1];
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    // Make canvas internal resolution match display size
    canvas.width = canvas.clientWidth || window.innerWidth || 390;
    canvas.height = canvas.clientHeight || window.innerHeight || 844;
    
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentBallEl = document.getElementById('currentBall');
    nextBallEl = document.getElementById('nextBall');
    goalText = document.getElementById('goal-val');

    loadState();
    initFloaters();
    animate();
    
    // Initialize the map screen on load
    showScreen('mapScreen');
}



function startGame() {
    showScreen('gameplayScreen');
    
    // Ensure canvas dimensions are correct now that it's visible
    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;
    
    // 🔑 Dynamically measure HUD height — first bubble row sticks to this boundary
    const hudEl = document.querySelector('#gameplayScreen .hud-top-premium');
    if (hudEl) {
        const cRect = canvas.getBoundingClientRect();
        const hudRect = hudEl.getBoundingClientRect();
        window.CEILING_Y = Math.max(0, hudRect.bottom - cRect.top);
    } else {
        window.CEILING_Y = 0;
    }
    
    // Bind pointerdown for unified mouse/touch handling on canvas
    canvas.onpointerdown = (e) => {
        shoot(e);
    };
    canvas.onpointermove = (e) => {
        const cRect = canvas.getBoundingClientRect();
        mouseX = e.clientX - cRect.left;
        mouseY = e.clientY - cRect.top;
    };

    const width = canvas.width;
    // ── Smart Level Generator ──────────────────────────────
    const diff = getLevelConfig(S.currentLevel);
    let { rows, cols, colors, hardChance } = diff;

    // Apply Hard / Very Hard / Super Hard gameplay difficulty scaling (Only for levels > 70)
    if (S.currentLevel > 70) {
        if (S.currentLevel % 60 === 0) {
            // Super Hard: +3 rows, +1 color (max 6), +15% hardChance
            rows += 3;
            colors = Math.min(6, colors + 1);
            hardChance = Math.min(0.4, hardChance + 0.15);
            console.log(`[Super Hard Level] Level: ${S.currentLevel} | Rows: ${rows} | Colors: ${colors} | HardChance: ${hardChance}`);
        } else if (S.currentLevel % 30 === 0) {
            // Very Hard: +2 rows, +10% hardChance
            rows += 2;
            hardChance = Math.min(0.35, hardChance + 0.1);
            console.log(`[Very Hard Level] Level: ${S.currentLevel} | Rows: ${rows} | HardChance: ${hardChance}`);
        } else if (S.currentLevel % 15 === 0) {
            // Hard: +1 row, +5% hardChance
            rows += 1;
            hardChance = Math.min(0.3, hardChance + 0.05);
            console.log(`[Hard Level] Level: ${S.currentLevel} | Rows: ${rows} | HardChance: ${hardChance}`);
        }
    }

    // Adaptive Easy Mode: if player failed 3+ times, reduce difficulty
    if (S.playerFails >= 3) {
        hardChance = 0;
        colors = Math.max(2, colors - 1);
        console.log(`[EasyMode] Level ${S.currentLevel} | Colors: ${colors}`);
    }

    const levelGrid = generateLevel(S.currentLevel, S.playerFails);
    const numCols = cols;
    const spacingX = width / numCols;
    const dynamicR = spacingX / 2; // User requested tight lines, no visual gaps
    window.activeR = dynamicR;
    window.numCols = numCols;

    // Dynamically calculate moves based on the number of rows and columns to clear
    S.ammo = Math.max(25, Math.round(rows * cols * 0.45));
    S.score = 0; S.objective.count = 0;
    bubbles = [];
    const spacingY = spacingX * 0.866;
    introAnimFrame = 60;
    
    if (window.startLevelAnimation) window.startLevelAnimation(S.currentLevel);

    levelGrid.forEach((rowData, row) => {
        const isOffset = row % 2 !== 0;
        const startX = isOffset ? spacingX / 2 : 0;
        rowData.forEach((cell, col) => {
            if (!cell) return; // null = gap
            const x = startX + col * spacingX + (spacingX / 2);
            const targetY = row * spacingY + (spacingX / 2) + window.CEILING_Y; // stuck to HUD bottom
            bubbles.push({
                x, targetY,
                y: canvas.height + 100,
                color: COLORS_MAP[cell.color] || COLORS[0],
                type: cell.type,
                hp: cell.hp,
                theme: cell.theme,   // ← THIS was missing — fix for visual themes
                alive: true, falling: false, r: dynamicR, row
            });
        });
    });

    // Helpful Groups logic for Anti-Frustration
    if (S.playerFails >= 3) {
        for(let i=0; i<6; i++){
            const normals = bubbles.filter(b => b.alive && b.theme === 'normal');
            if (normals.length > 0) {
                const centerB = normals[Math.floor(Math.random() * normals.length)];
                bubbles.forEach(b => {
                    if (b.alive && b.theme === 'normal' && Math.hypot(b.x - centerB.x, b.targetY - centerB.targetY) < spacingX * 1.5) {
                        b.color = centerB.color;
                    }
                });
            }
        }
    }

    activeColor = getSmartShooterColor();
    reserveColor = getSmartShooterColor();

    updateUI();
}







function getShooterPos() {
    const el = document.getElementById('currentBall');
    if (!el) return { x: canvas.width / 2, y: canvas.height - 150 };
    const rect = el.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    return {
        x: rect.left - cRect.left + rect.width / 2,
        y: rect.top - cRect.top + rect.height / 2
    };
}

function shoot(e) {
    if (projectile || !isGameActive || introAnimFrame > 0 || S.ammo <= 0) return;
    initAudio();
    
    S.ammo--;
    updateUI();
    
    const pos = getShooterPos();
    const cRect = canvas.getBoundingClientRect();
    
    // Get correct click coordinates
    let tx, ty;
    if (e && e.clientX !== undefined) {
        tx = e.clientX - cRect.left;
        ty = e.clientY - cRect.top;
    } else {
        tx = mouseX;
        ty = mouseY;
    }

    const ang = Math.atan2(ty - pos.y, tx - pos.x); 
    // Allow shooting in any upward direction
    if (ty > pos.y) return; 
    
    let vx = Math.cos(ang) * SPEED;
    let vy = Math.sin(ang) * SPEED;

    // Fireball always goes straight up
    if (activeColor === 'fireball') {
        vx = 0;
        vy = -SPEED * 1.2; // slightly faster
    }

    projectile = { 
        x: pos.x, 
        y: pos.y, 
        color: activeColor, 
        vx: vx, 
        vy: vy 
    };
    window.superAimActive = false; // Turn off super aim after shot
    prepNext(); 
    updateUI();
}

function snap() {
    if (!projectile) return;
    const curR = window.activeR || 18;
    const numCols = window.numCols || 10;
    const spacingX = canvas.width / numCols;
    const spacingY = spacingX * 0.866;
    
    let bestDist = Infinity;
    let bestCell = null;

    const TOP_HUD_OFFSET = window.CEILING_Y || 0;
    const estRow = Math.round((projectile.y - clusterOffset - TOP_HUD_OFFSET - (spacingX / 2)) / spacingY);
    
    for (let r = Math.max(0, estRow - 2); r <= estRow + 2; r++) {
        const isOffset = r % 2 !== 0;
        const rowWidth = isOffset ? numCols - 1 : numCols;
        const startX = isOffset ? spacingX / 2 : 0;
        
        for (let c = 0; c < rowWidth; c++) {
            const nx = startX + c * spacingX + (spacingX / 2);
            const ny = r * spacingY + (spacingX / 2) + TOP_HUD_OFFSET;
            const absoluteNy = ny + clusterOffset;
            
            let occupied = false;
            for (let b of bubbles) {
                if (b.alive && !b.falling && Math.hypot(b.x - nx, b.targetY - ny) < curR * 0.8) {
                    occupied = true; break;
                }
            }
            
            if (!occupied) {
                const dist = Math.hypot(projectile.x - nx, projectile.y - absoluteNy);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestCell = { nx, ny, row: r };
                }
            }
        }
    }
    
    if (!bestCell) return;
    
    // POWER-UP: Bomb Destruction
    if (projectile.color === 'bomb') {
        const boomX = bestCell.nx, boomY = bestCell.ny;
        bubbles.forEach(b => {
            if (b.alive && Math.hypot(b.x - boomX, b.targetY - boomY) <= spacingX * 2.5) {
                b.alive = false;
                createParticles(b.x, b.targetY, b.color);
                S.score += 50;
            }
        });
        if (window.screenShake) screenShake();
        if(S.settings.sound) playSFX('pop');
        projectile = null; checkEnd(); updateUI(); return;
    }

    const finalVisualY = bestCell.ny + clusterOffset;
    
    // Check if player hit a Spike bubble directly
    let hitSpike = false;
    for(let b of bubbles) {
        if(b.alive && b.theme === 'spike' && Math.hypot(b.x - bestCell.nx, b.targetY - bestCell.ny) < spacingX) {
            hitSpike = true; break;
        }
    }
    
    if (hitSpike) {
        // Spike destroys the projectile instantly, no matching!
        createParticles(bestCell.nx, bestCell.ny, projectile.color);
        if(S.settings.sound) playSFX('pop');
        if (window.screenShake) screenShake();
        projectile = null; checkEnd(); updateUI(); return;
    }

    const newB = { 
        x: bestCell.nx, targetY: bestCell.ny, y: finalVisualY, 
        color: projectile.color, alive: true, falling: false, 
        r: curR, row: bestCell.row, hp: 1, type: 'normal'
    };
    bubbles.push(newB);

    const visited = new Set(), matches = [];
    function dfs(b) {
        if(!b || visited.has(b)) return; visited.add(b); matches.push(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(n => { 
            if(n.color === newB.color) dfs(n); 
        });
    }
    dfs(newB);

    if (matches.length >= 3) {
        const poppedPositions = [];
        matches.forEach(b => {
            if (b.theme !== 'normal' && b.hp >= 2) {
                b.hp--;
                createParticles(b.x, b.y, '#aaaaaa');
                S.score += 50;
                if (window.showPoints) showPoints(b.x, b.y - 20, '+50');
            } else {
                b.alive = false;
                poppedPositions.push({ x: b.x, targetY: b.targetY });
                createParticles(b.x, b.y, b.color);
                if (window.animateBubblePop) animateBubblePop(b.x, b.y, b.color);
                if (window.showPoints) showPoints(b.x, b.y - 20, '+100');
                S.score += 100;
            }
        });
        // 🎯 Easy Mission: count popped bubbles
        const numPopped = poppedPositions.length;
        if (numPopped > 0 && S.missions && !S.missions.easy.claimed) {
            S.missions.easy.progress = Math.min(S.missions.easy.target, S.missions.easy.progress + numPopped);
        }
        // 💎 Hard Mission: track score accumulation
        if (S.missions && !S.missions.hard.claimed) {
            S.missions.hard.progress = Math.min(S.missions.hard.target, (S.missions.hard.progress || 0) + numPopped * 100);
        }
        shakeFrames = 15;
        if (window.screenShake) screenShake();
        if (window.increaseCombo) increaseCombo();
        if(S.settings.sound) playSFX('pop');

        // Adjacent difficulty balls take 1 damage when normal balls pop next to them
        if (poppedPositions.length > 0) {
            bubbles.forEach(b => {
                if (!b.alive || b.falling || b.theme === 'normal') return;
                const isAdjacentToPop = poppedPositions.some(p =>
                    Math.hypot(b.x - p.x, b.targetY - p.targetY) < spacingX * 1.3
                );
                if (isAdjacentToPop) {
                    if (b.theme === 'stone') {
                        // Stone never breaks from adjacent damage, just shake
                        if (window.screenShake) screenShake();
                        return;
                    }
                    if (b.theme === 'chain') {
                        b.hp--;
                        if (b.hp <= 1) {
                            b.theme = 'normal'; // Chain breaks, becomes normal!
                            createParticles(b.x, b.y, '#778899');
                            S.score += 100;
                            if (window.showPoints) showPoints(b.x, b.y - 20, 'UNLOCKED!');
                            if (window.screenShake) screenShake();
                            return; 
                        }
                    }
                    
                    b.hp--;
                    
                    // Specific particles based on theme
                    let pColor = '#ccccff';
                    if (b.theme === 'fire') pColor = '#ff6600';
                    if (b.theme === 'void') pColor = '#cc00ff';
                    if (b.theme === 'cosmic') pColor = '#00ffff';
                    if (b.theme === 'metal') pColor = '#555555';
                    if (b.theme === 'spike') pColor = '#222222';
                    createParticles(b.x, b.y, pColor);
                    
                    if (b.hp <= 0) {
                        b.alive = false;
                        S.score += 150; // Bonus for clearing a blocker
                    }
                }
            });
        }

        // Orphan detection: start from ALL bubbles in the very top row (smallest targetY)
        const minY = Math.min(...bubbles.filter(b => b.alive && !b.falling).map(b => b.targetY));
        const con = new Set();
        function mark(b) { 
            if(con.has(b)) return; con.add(b); 
            bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(mark); 
        }
        bubbles.filter(b => b.alive && !b.falling && b.targetY <= minY + spacingY * 0.5).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    projectile = null; checkEnd(); updateUI();
}




function checkEnd() {
    const remaining = bubbles.filter(b => b.alive);
    if (remaining.length === 0 || S.objective.count >= S.objective.total) {
        if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++;
        
        // Calculate and save stars based on ammo
        let newStars = 1;
        if (S.ammo >= 15) newStars = 3;
        else if (S.ammo >= 7) newStars = 2;
        
        // Fix: save with both numeric and string key for compatibility
        const curStars = S.levelStars[S.currentLevel] || S.levelStars[String(S.currentLevel)] || 0;
        S.levelStars[S.currentLevel] = Math.max(newStars, curStars);
        S.levelStars[String(S.currentLevel)] = S.levelStars[S.currentLevel]; // also store string key
        S.playerFails = 0;
        // 🏆 Medium Mission: track level wins
        if (S.missions && !S.missions.medium.claimed) {
            S.missions.medium.progress = Math.min(S.missions.medium.target, S.missions.medium.progress + 1);
        }
        saveState();

        // Use premium modal if available, else fallback
        if (window.showLevelComplete) showLevelComplete();
        else { alert('LEVEL CLEAR! 🎉'); showScreen('mapScreen'); }
    } else if (S.ammo <= 0) {
        // Only lose if no bubbles are falling/animating and no projectile
        const active = bubbles.some(b => b.falling || b.y < b.targetY);
        if (!active && !projectile) {
            S.playerFails++;
            if (window.showLevelFailed) showLevelFailed();
            else { alert("OUT OF MOVES! 😢\nTry again."); showScreen('mapScreen'); }
        }
    }
}

function updateUI() {
    if(scoreVal) scoreVal.innerText = S.score.toLocaleString();
    const ammoEl = document.getElementById('ammo-val');
    if(ammoEl) ammoEl.innerText = S.ammo;
    
    // Update progress bar and stars
    const maxScore = 5000; // Example target for 3 stars
    const progress = Math.min((S.score / maxScore) * 100, 100);
    const fillEl = document.querySelector('.star-progress-fill');
    if (fillEl) fillEl.style.width = progress + '%';
    
    const stars = document.querySelectorAll('.p-star');
    if (stars.length === 3) {
        if (progress >= 33) stars[0].classList.add('active'); else stars[0].classList.remove('active');
        if (progress >= 66) stars[1].classList.add('active'); else stars[1].classList.remove('active');
        if (progress >= 100) stars[2].classList.add('active'); else stars[2].classList.remove('active');
    }
    
    const curR = window.activeR || 20;
    if (currentBallEl) {
        currentBallEl.style.background = activeColor;
        currentBallEl.style.width = (curR * 2) + 'px';
        currentBallEl.style.height = (curR * 2) + 'px';
        currentBallEl.style.borderRadius = '50%';
    }
    if (nextBallEl) {
        nextBallEl.style.background = reserveColor;
        nextBallEl.style.width = (curR * 2) + 'px';
        nextBallEl.style.height = (curR * 2) + 'px';
        nextBallEl.style.borderRadius = '50%';
    }
    const mc = document.getElementById('map-coins');
    if(mc) mc.innerText = S.coins.toLocaleString();
    const sc = document.getElementById('shop-coins');
    if(sc) sc.innerText = S.coins.toLocaleString();
    const stc = document.getElementById('storeCoinsDisplay');
    if(stc) stc.innerText = S.coins.toLocaleString();
    
    // Update powerup badges
    const bb = document.getElementById('badge-bomb');
    if(bb && S.powerups) bb.innerText = S.powerups.bomb;
    const ba = document.getElementById('badge-aim');
    if(ba && S.powerups) ba.innerText = S.powerups.aim;
    const bf = document.getElementById('badge-fireball');
    if(bf && S.powerups) bf.innerText = S.powerups.fireball;

    // Update settings buttons (iOS Switch Style)
    const sBtn = document.getElementById('toggleSoundBtn');
    if(sBtn) {
        sBtn.innerText = ""; 
        if (S.settings.sound) sBtn.classList.remove('off');
        else sBtn.classList.add('off');
    }
    const mBtn = document.getElementById('toggleMusicBtn');
    if(mBtn) {
        mBtn.innerText = "";
        if (S.settings.music) mBtn.classList.remove('off');
        else mBtn.classList.add('off');
    }

    saveState();
}


function getBestMatchingColor() {
    const colorCount = {};
    bubbles.forEach(b => {
        if (!b.alive || b.theme !== 'normal') return;
        colorCount[b.color] = (colorCount[b.color] || 0) + 1;
    });
    const sorted = Object.keys(colorCount).sort((a,b) => colorCount[b] - colorCount[a]);
    return sorted[0] || COLORS[0];
}

function getSmartShooterColor() {
    const alive = bubbles.filter(b => b.alive);
    if (alive.length === 0) return COLORS[0];
    
    // 🎯 Delegate to Advanced Smart Ball System
    // Near Win (<=8 remaining) or player struggling → best matching color
    if (S.playerFails >= 2 || alive.length <= 8) {
        return getNextBallColor(alive, S.playerFails);
    }

    // Normal: use smart color counting among normal bubbles
    const normals = alive.filter(b => b.theme === 'normal');
    if (normals.length === 0) return getNextBallColor(alive, S.playerFails);
    return getNextBallColor(normals, S.playerFails);
}

function prepNext() {
    activeColor = reserveColor; 
    reserveColor = getSmartShooterColor();
    updateUI();
}

// ──────── ULTRA-GLOSSY 3D BUBBLES ────────
function drawBall(x, y, color, r, hp, theme) {
    const radius = r || window.activeR || 18;
    const isDamaged = (theme !== 'normal' && hp === 1);
    ctx.save();
    const finalY = y;

    // ── STEP 1: Always draw the color base first ──────────────
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    
    if (color === 'bomb') {
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = `${radius}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💣', x, finalY + 2);
        ctx.restore(); return;
    } else if (color === 'fireball') {
        ctx.fillStyle = '#ff6600';
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = `${radius}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('☄️', x, finalY + 2);
        ctx.restore(); return;
    }

    const grad = ctx.createRadialGradient(x-radius*0.35,finalY-radius*0.35,radius*0.05,x,finalY,radius);
    grad.addColorStop(0,'#fff'); grad.addColorStop(0.2,shadeColor(color,30));
    grad.addColorStop(0.5,color); grad.addColorStop(1,shadeColor(color,-60));
    ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();

    // ── STEP 2: Theme overlay ─
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    function drawBubbleDamage(dx, dy, dr, dHp, maxHp) {
        if (dHp >= maxHp) return;
        const damage = 1 - (dHp / maxHp);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        if(damage > 0.2){ ctx.beginPath(); ctx.moveTo(dx-dr*0.3, dy-dr*0.3); ctx.lineTo(dx+dr*0.25, dy+dr*0.15); ctx.stroke(); }
        if(damage > 0.5){ ctx.beginPath(); ctx.moveTo(dx+dr*0.2, dy-dr*0.35); ctx.lineTo(dx-dr*0.2, dy+dr*0.3); ctx.stroke(); }
        if(damage > 0.7){ ctx.beginPath(); ctx.moveTo(dx-dr*0.4, dy+dr*0.1); ctx.lineTo(dx+dr*0.3, dy-dr*0.15); ctx.stroke(); }
    }

    if (theme === 'stone') {
        const sGrad = ctx.createRadialGradient(x-radius*0.25, finalY-radius*0.25, radius*0.2, x, finalY, radius);
        sGrad.addColorStop(0, "#9e9e9e"); sGrad.addColorStop(0.5, "#666"); sGrad.addColorStop(1, "#2e2e2e");
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fillStyle = sGrad; ctx.fill();
        // rock cracks
        ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x-radius*0.35, finalY-radius*0.3); ctx.lineTo(x+radius*0.2, finalY+radius*0.1); ctx.lineTo(x-radius*0.15, finalY+radius*0.4); ctx.stroke();
        // rock texture
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath(); ctx.arc(x-radius*0.25, finalY-radius*0.2, radius*0.15, 0, Math.PI * 2); ctx.fill();
        drawBubbleDamage(x, finalY, radius, hp, 2);

    } else if (theme === 'ice') {
        const iGrad = ctx.createRadialGradient(x-radius*0.3, finalY-radius*0.3, radius*0.2, x, finalY, radius);
        iGrad.addColorStop(0, "rgba(255,255,255,0.95)"); iGrad.addColorStop(0.4, "rgba(180,220,255,0.8)"); iGrad.addColorStop(1, "rgba(100,180,255,0.45)");
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fillStyle = iGrad; ctx.fill();
        // icy glow
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.stroke();
        // shine
        ctx.beginPath(); ctx.arc(x-radius*0.4, finalY-radius*0.4, radius*0.25, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
        // frost texture
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.beginPath();
        ctx.moveTo(x-radius*0.4, finalY); ctx.lineTo(x+radius*0.4, finalY);
        ctx.moveTo(x, finalY-radius*0.4); ctx.lineTo(x, finalY+radius*0.4); ctx.stroke();
        drawBubbleDamage(x, finalY, radius, hp, 2);

    } else if (theme === 'chain') {
        // Realistic Iron Chain & Lock
        ctx.save();
        
        // 1. Cross Chains (Metallic Iron)
        const chainGrad = ctx.createLinearGradient(x-radius, finalY-radius, x+radius, finalY+radius);
        chainGrad.addColorStop(0, "#4a4a4a"); chainGrad.addColorStop(0.5, "#a0a0a0"); chainGrad.addColorStop(1, "#2a2a2a");
        ctx.strokeStyle = chainGrad; ctx.lineWidth = radius * 0.4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x-radius*0.7, finalY-radius*0.7); ctx.lineTo(x+radius*0.7, finalY+radius*0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+radius*0.7, finalY-radius*0.7); ctx.lineTo(x-radius*0.7, finalY+radius*0.7); ctx.stroke();
        
        // Chain link inner shadows for 3D realism
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = radius * 0.15;
        ctx.beginPath(); ctx.moveTo(x-radius*0.7, finalY-radius*0.7); ctx.lineTo(x+radius*0.7, finalY+radius*0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+radius*0.7, finalY-radius*0.7); ctx.lineTo(x-radius*0.7, finalY+radius*0.7); ctx.stroke();

        // 2. Heavy Iron Padlock
        const lockW = radius * 0.6;
        const lockH = radius * 0.5;
        const lockY = finalY + radius * 0.1;
        
        // Lock body (Dark Steel)
        const lockGrad = ctx.createLinearGradient(x, lockY-lockH/2, x, lockY+lockH/2);
        lockGrad.addColorStop(0, "#555"); lockGrad.addColorStop(0.3, "#999"); lockGrad.addColorStop(1, "#222");
        ctx.fillStyle = lockGrad;
        ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        ctx.fillRect(x - lockW/2, lockY - lockH/2, lockW, lockH);
        
        // Lock shackle (Top loop)
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = "#888"; ctx.lineWidth = radius * 0.15;
        ctx.beginPath(); ctx.arc(x, lockY - lockH/2, lockW * 0.35, Math.PI, 0); ctx.stroke();
        
        // Keyhole
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(x, lockY - radius*0.05, radius*0.08, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - radius*0.06, lockY - radius*0.05);
        ctx.lineTo(x + radius*0.06, lockY - radius*0.05);
        ctx.lineTo(x + radius*0.1, lockY + radius*0.15);
        ctx.lineTo(x - radius*0.1, lockY + radius*0.15); ctx.fill();
        
        ctx.restore();
        drawBubbleDamage(x, finalY, radius, hp, 2);

    } else if (theme === 'fire') {
        // Flame glow overlay — orange
        ctx.shadowColor='rgba(255,120,0,0.8)'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(255,100,0,0.28)'; ctx.fill();
        ctx.strokeStyle='rgba(255,200,50,0.75)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(x,finalY-radius*0.7); ctx.bezierCurveTo(x+radius*0.5,finalY-radius*0.2,x-radius*0.4,finalY+radius*0.2,x,finalY+radius*0.65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x-radius*0.3,finalY-radius*0.5); ctx.bezierCurveTo(x+radius*0.3,finalY,x-radius*0.2,finalY+radius*0.3,x+radius*0.1,finalY+radius*0.65); ctx.stroke();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(255,100,0,0.9)'; ctx.lineWidth=2.5; ctx.stroke();
        drawBubbleDamage(x, finalY, radius, hp, 3);

    } else if (theme === 'void') {
        // Dark purple energy overlay
        ctx.shadowColor='rgba(180,0,255,0.8)'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(20,0,50,0.45)'; ctx.fill();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(200,0,255,0.9)'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x,finalY,radius*0.55,0,Math.PI*2); ctx.strokeStyle='rgba(220,100,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle='rgba(200,80,255,0.4)'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(x-radius*0.55,finalY); ctx.lineTo(x+radius*0.55,finalY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,finalY-radius*0.55); ctx.lineTo(x,finalY+radius*0.55); ctx.stroke();
        drawBubbleDamage(x, finalY, radius, hp, 4);

    } else if (theme === 'cosmic') {
        // Rainbow shimmer overlay
        const t = Date.now()/800;
        ctx.shadowColor=`hsl(${(t*60)%360},100%,60%)`; ctx.shadowBlur=18;
        const cg = ctx.createLinearGradient(x-radius,finalY-radius,x+radius,finalY+radius);
        cg.addColorStop(0,`hsla(${(t*80)%360},100%,70%,0.5)`);
        cg.addColorStop(0.5,`hsla(${(t*80+120)%360},100%,70%,0.5)`);
        cg.addColorStop(1,`hsla(${(t*80+240)%360},100%,70%,0.5)`);
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2);
        ctx.strokeStyle=`hsl(${(t*90)%360},100%,75%)`; ctx.lineWidth=2.5; ctx.stroke();
        drawBubbleDamage(x, finalY, radius, hp, 5);

    } else if (theme === 'metal') {
        // Heavy Tungsten Metal
        const mGrad = ctx.createRadialGradient(x-radius*0.4, finalY-radius*0.4, radius*0.1, x, finalY, radius);
        mGrad.addColorStop(0, "#fff"); mGrad.addColorStop(0.3, "#888"); mGrad.addColorStop(0.8, "#333"); mGrad.addColorStop(1, "#111");
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fillStyle = mGrad; ctx.fill();
        ctx.beginPath(); ctx.arc(x, finalY, radius-1, 0, Math.PI * 2); ctx.strokeStyle = "#555"; ctx.lineWidth=2; ctx.stroke();
        // Heavy bolts
        ctx.fillStyle="#000";
        ctx.beginPath(); ctx.arc(x-radius*0.4, finalY-radius*0.4, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+radius*0.4, finalY-radius*0.4, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, finalY+radius*0.5, 2, 0, Math.PI*2); ctx.fill();
        drawBubbleDamage(x, finalY, radius, hp, 6);

    } else if (theme === 'spike') {
        // Dangerous Spikes (kills projectile)
        ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI * 2); ctx.fillStyle = "#222"; ctx.fill();
        ctx.fillStyle = "#ff0000"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10;
        for(let i=0; i<8; i++){
            const angle = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle)*radius*0.5, finalY + Math.sin(angle)*radius*0.5);
            ctx.lineTo(x + Math.cos(angle+0.2)*radius*0.5, finalY + Math.sin(angle+0.2)*radius*0.5);
            ctx.lineTo(x + Math.cos(angle+0.1)*radius*1.2, finalY + Math.sin(angle+0.1)*radius*1.2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        drawBubbleDamage(x, finalY, radius, hp, 2);

    } else {
        // Normal: just add star ✶
        ctx.save(); ctx.font=`${radius*1.2}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('✶',x,finalY+(radius*0.08)); ctx.restore();
    }

    // ── STEP 3: Damaged crack (red) ───────────────────────────
    if (isDamaged) {
        ctx.strokeStyle='rgba(255,60,60,0.9)'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(x-radius*0.4,finalY-radius*0.7); ctx.lineTo(x+radius*0.1,finalY); ctx.lineTo(x-radius*0.1,finalY+radius*0.7); ctx.stroke();
    }

    // ── STEP 4: Universal top-left shine ─────────────────────
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.ellipse(x-radius*0.4,finalY-radius*0.4,radius*0.4,radius*0.25,Math.PI/4,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.fill();

    ctx.restore();
}



function shadeColor(color, percent) {
    let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p/100)+R)*0x10000+(Math.round((t-G)*p/100)+G)*0x100+(Math.round((t-B)*p/100)+B)).toString(16).slice(1);
}

function updateClusterPosition() {
    if (introAnimFrame > 0) return; 
    const activeBubbles = bubbles.filter(b => b.alive && !b.falling);
    if (activeBubbles.length === 0) return;
    // Pin cluster to the top — never scroll down regardless of how few balls are left
    // clusterOffset = 0: bubbles are anchored at window.CEILING_Y directly
    clusterOffset = 0;
}


function swapBubbles() {
    const temp = activeColor;
    activeColor = reserveColor;
    reserveColor = temp;
    updateUI();
}

function animate() {
    if(!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
    const curR = window.activeR || 18;
    updateClusterPosition();
    if (shakeFrames > 0) { 
        ctx.translate((Math.random()-0.5)*3, (Math.random()-0.5)*3); // Reduced from 10 to 3
        shakeFrames--; 
    }
    drawFloaters();
    bubbles.forEach(b => { 
        if (b.alive) {
            if (introAnimFrame > 0) {
                b.y += (b.targetY - b.y) * 0.15;
            } else if (!b.falling) {
                const currentTarget = b.targetY + clusterOffset;
                b.y += (currentTarget - b.y) * 0.1;
            } else {
                b.y += 10;
                if (b.y > canvas.height) b.alive = false;
            }
            drawBall(b.x, b.y, b.color, b.r, b.hp, b.theme);
        }
    });
    if (introAnimFrame > 0) introAnimFrame--;
    if (projectile) {
        let hit = false;
        let steps = 4; // Sub-stepping for precise collision
        let stepVx = projectile.vx / steps;
        let stepVy = projectile.vy / steps;
        
        for (let i = 0; i < steps; i++) {
            projectile.x += stepVx; 
            projectile.y += stepVy;
            
            // Clamp x and only reflect if moving toward that wall (direction-aware)
            if (projectile.x < curR) {
                projectile.x = curR;
                if (projectile.vx < 0) { projectile.vx *= -1; stepVx *= -1; }
            } else if (projectile.x > canvas.width - curR) {
                projectile.x = canvas.width - curR;
                if (projectile.vx > 0) { projectile.vx *= -1; stepVx *= -1; }
            }
            
            // Fireball: pierce through bubbles — pop each one it touches, never snap
            if (projectile.color === 'fireball') {
                for (let b of bubbles) {
                    if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, (b.targetY + clusterOffset) - projectile.y) < curR * 1.9) {
                        b.alive = false;
                        createParticles(b.x, b.targetY + clusterOffset, b.color);
                        S.score += 50;
                        if (S.missions && !S.missions.easy.claimed)
                            S.missions.easy.progress = Math.min(S.missions.easy.target, S.missions.easy.progress + 1);
                        if (S.settings && S.settings.sound) playSFX('pop');
                    }
                }
                // Fireball dies past top of canvas
                if (projectile.y < -curR * 2) {
                    // draw meteor tail before removing
                    projectile = null;
                    checkEnd(); updateUI();
                    return;
                }
                continue; // skip snap check for fireball
            }
            
            if (projectile.y < curR + clusterOffset + (window.CEILING_Y || 0)) hit = true; 
            else {
                for (let b of bubbles) {
                    if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, (b.targetY + clusterOffset) - projectile.y) < curR * 1.8) {
                        hit = true; break;
                    }
                }
            }
            if (hit) break; // Stop moving exactly at the collision point
        }
        
        // Draw fireball as meteor with glowing tail
        if (projectile && projectile.color === 'fireball') {
            const px = projectile.x, py = projectile.y;
            // Draw tail particles (orange trail going downward)
            const tailLen = 35;
            const grad = ctx.createLinearGradient(px, py, px, py + tailLen);
            grad.addColorStop(0, 'rgba(255,220,50,0.95)');
            grad.addColorStop(0.3, 'rgba(255,100,0,0.7)');
            grad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px - curR * 0.4, py);
            ctx.quadraticCurveTo(px, py + tailLen, px + curR * 0.4, py);
            ctx.fillStyle = grad;
            ctx.fill();
            // Left streak
            ctx.beginPath();
            ctx.moveTo(px - curR * 0.2, py + 5);
            ctx.lineTo(px - curR * 0.5, py + tailLen * 0.7);
            ctx.strokeStyle = 'rgba(255,150,0,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Right streak  
            ctx.beginPath();
            ctx.moveTo(px + curR * 0.2, py + 5);
            ctx.lineTo(px + curR * 0.5, py + tailLen * 0.7);
            ctx.stroke();
            ctx.restore();
            // Draw glowing meteor head
            ctx.save();
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(px, py, curR, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = `${curR}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('☄️', px, py + 2);
            ctx.restore();
        } else if (projectile) {
            drawBall(projectile.x, projectile.y, projectile.color, curR);
        }
        if (hit) snap();
        if (projectile && projectile.y > canvas.height) projectile = null;
    }
    drawVFX();

    if (isGameActive && !projectile && introAnimFrame <= 0) {
        const pos = getShooterPos();
        const ang = Math.atan2(mouseY - pos.y, mouseX - pos.x);
        if (ang < 0) {
            let tx = pos.x, ty = pos.y;
            let vx = Math.cos(ang) * SPEED;
            let vy = Math.sin(ang) * SPEED;
            let steps = 4;
            let stepVx = vx / steps;
            let stepVy = vy / steps;

            let path = [{ x: tx, y: ty }];
            let hit = false;
            let maxSimSteps = 400; // safe limit for performance
            
            for (let step = 0; step < maxSimSteps; step++) {
                tx += stepVx;
                ty += stepVy;

                if (tx < curR) {
                    tx = curR;
                    stepVx *= -1;
                } else if (tx > canvas.width - curR) {
                    tx = canvas.width - curR;
                    stepVx *= -1;
                }

                // Check ceiling
                if (ty < curR + clusterOffset + (window.CEILING_Y || 0)) {
                    hit = true;
                    break;
                }

                // Check bubble collision
                for (let b of bubbles) {
                    if (b.alive && !b.falling && Math.hypot(b.x - tx, (b.targetY + clusterOffset) - ty) < curR * 1.8) {
                        hit = true;
                        break;
                    }
                }

                if (hit) break;
                
                // Store path points periodically or on boundary change for rendering
                if (step % 4 === 0) {
                    path.push({ x: tx, y: ty });
                }
            }
            path.push({ x: tx, y: ty });

            // Draw guideline
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.strokeStyle = window.superAimActive ? 'rgba(61,220,132,0.8)' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = window.superAimActive ? 4 : 2;
            ctx.setLineDash(window.superAimActive ? [10, 10] : [5, 10]);
            ctx.stroke(); ctx.setLineDash([]);

            // Draw snap preview bubble at endpoint to show exactly where it will land!
            let bestDist = Infinity;
            let bestCell = null;
            const numCols = window.numCols || 10;
            const spacingX = canvas.width / numCols;
            const spacingY = spacingX * 0.866;
            const estRow = Math.round((ty - clusterOffset - (window.CEILING_Y || 0) - (spacingX / 2)) / spacingY);
            
            for (let r = Math.max(0, estRow - 2); r <= estRow + 2; r++) {
                const isOffset = r % 2 !== 0;
                const rowWidth = isOffset ? numCols - 1 : numCols;
                const startX = isOffset ? spacingX / 2 : 0;
                
                for (let c = 0; c < rowWidth; c++) {
                    const nx = startX + c * spacingX + (spacingX / 2);
                    const ny = r * spacingY + (spacingX / 2) + (window.CEILING_Y || 0);
                    const absoluteNy = ny + clusterOffset;
                    
                    let occupied = false;
                    for (let b of bubbles) {
                        if (b.alive && !b.falling && Math.hypot(b.x - nx, b.targetY - ny) < curR * 0.8) {
                            occupied = true; break;
                        }
                    }
                    
                    if (!occupied) {
                        const dist = Math.hypot(tx - nx, ty - absoluteNy);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestCell = { nx, ny: absoluteNy };
                        }
                    }
                }
            }

            if (bestCell) {
                // Draw a beautiful glowing preview of the snapped location
                ctx.beginPath();
                ctx.arc(bestCell.nx, bestCell.ny, curR, 0, Math.PI * 2);
                ctx.fillStyle = activeColor;
                ctx.globalAlpha = 0.25;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = window.superAimActive ? 'rgba(61,220,132,0.8)' : 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }

    ctx.restore(); requestAnimationFrame(animate);
}




function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() { particles = particles.filter(p => p.a > 0); particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); }); ctx.globalAlpha = 1; }
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); }); }
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); if(type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1); } }
function saveState() { 
    localStorage.setItem('bs_level', S.currentLevel); 
    localStorage.setItem('bs_unlocked', S.unlockedLevels); 
    localStorage.setItem('bs_stars', JSON.stringify(S.levelStars || {}));
    localStorage.setItem('bs_coins', S.coins);
    localStorage.setItem('bs_powerups', JSON.stringify(S.powerups || {}));
    localStorage.setItem('bs_settings', JSON.stringify(S.settings || {}));
    localStorage.setItem('bs_daily_login', JSON.stringify(S.dailyLogin || { lastClaimedDate: null, currentDay: 0, claimedDays: [] }));
    localStorage.setItem('bs_missions', JSON.stringify(S.missions || {
        easy: { progress: 0, target: 150, claimed: false },
        medium: { progress: 0, target: 3, claimed: false },
        hard: { progress: 0, target: 10000, claimed: false }
    }));
    localStorage.setItem('bs_daily_bonus', JSON.stringify(S.dailyBonus || { lastSpinTime: 0 }));
}
function loadState() { 
    const l = localStorage.getItem('bs_level'); 
    if(l) S.currentLevel = Number(l); 
    // Force all 5000 levels unlocked — override any old saved value
    S.unlockedLevels = 5000;
    localStorage.setItem('bs_unlocked', '5000');
    
    const s = localStorage.getItem('bs_stars');
    if(s) S.levelStars = JSON.parse(s);
    
    const c = localStorage.getItem('bs_coins');
    if(c) S.coins = Number(c);
    
    const pu = localStorage.getItem('bs_powerups');
    if(pu) S.powerups = JSON.parse(pu);
    
    const st = localStorage.getItem('bs_settings');
    if(st) S.settings = JSON.parse(st);

    const dl = localStorage.getItem('bs_daily_login');
    if(dl) S.dailyLogin = JSON.parse(dl);
    else S.dailyLogin = { lastClaimedDate: null, currentDay: 0, claimedDays: [] };

    const ms = localStorage.getItem('bs_missions');
    if(ms) S.missions = JSON.parse(ms);
    else S.missions = {
        easy: { progress: 0, target: 150, claimed: false },
        medium: { progress: 0, target: 3, claimed: false },
        hard: { progress: 0, target: 10000, claimed: false }
    };

    const db = localStorage.getItem('bs_daily_bonus');
    if(db) S.dailyBonus = JSON.parse(db);
    else S.dailyBonus = { lastSpinTime: 0 };
}

// ──────── SHOP & POWERUPS ────────
window.buyItem = function(item, cost) {
    if (S.coins >= cost) {
        S.coins -= cost;
        if (!S.powerups) S.powerups = { bomb:0, aim:0, fireball:0 };
        S.powerups[item] = (S.powerups[item] || 0) + 1;
        saveState();
        updateUI();
        if(window.showPoints) showPoints(window.innerWidth/2, window.innerHeight/2, 'PURCHASED!');
    } else {
        alert("Not enough coins! 😢");
    }
}

window.usePowerup = function(item) {
    if (!S.powerups || S.powerups[item] <= 0) {
        alert("You don't have this power-up! Buy it in the shop.");
        return;
    }
    if (projectile || introAnimFrame > 0) return; // Only allow when idle

    if (item === 'bomb') {
        S.powerups.bomb--;
        activeColor = 'bomb';
        const cb = document.getElementById('currentBall');
        if(cb) { cb.style.background = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'80\' font-size=\'80\'>💣</text></svg>") center/contain no-repeat'; cb.style.boxShadow = '0 0 25px red'; }
    } else if (item === 'aim') {
        S.powerups.aim--;
        window.superAimActive = true;
    } else if (item === 'fireball') {
        S.powerups.fireball--;
        activeColor = 'fireball';
        const cb = document.getElementById('currentBall');
        if(cb) { cb.style.background = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'80\' font-size=\'80\'>☄️</text></svg>") center/contain no-repeat'; cb.style.boxShadow = '0 0 25px orange'; }
    }
    saveState();
    updateUI();
}

window.toggleSound = function() { S.settings.sound = !S.settings.sound; saveState(); updateUI(); }
window.toggleMusic = function() { S.settings.music = !S.settings.music; saveState(); updateUI(); }
window.resetProgress = function() {
    if(confirm("Are you sure you want to reset all progress?")) {
        localStorage.clear();
        location.reload();
    }
}

// ──────── LEVEL START ANIMATION ────────
window.startLevelAnimation = function(level) {
    const island = document.getElementById('dynamicIsland');
    const islandText = document.getElementById('island-text');
    if (island && islandText) {
        islandText.innerText = `⚡ LEVEL ${level} STARTING`;
        island.classList.add('expanded');
        setTimeout(() => {
            islandText.innerText = `Level ${level}`;
            island.classList.remove('expanded');
        }, 2200);
    }

    const div = document.createElement("div");
    div.innerText = `LEVEL ${level}`;
    div.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:50px;color:#fff;font-weight:900;text-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:9999;pointer-events:none;";
    document.body.appendChild(div);
    if (window.gsap) {
        gsap.fromTo(div, {scale:0.5, opacity:0}, {scale:1, opacity:1, duration:0.4});
        gsap.to(div, {opacity:0, y:"-120px", delay:1.2, duration:0.4, onComplete:()=>div.remove()});
    } else {
        setTimeout(() => div.remove(), 1500);
    }
}

// ──────── STORE & DAILY LOGIN MODAL LOGIC ────────
const dailyRewards = [
    { day: 1, name: "500 Coins", icon: "🪙", value: 500, type: "coins" },
    { day: 2, name: "100 Coins", icon: "💎", value: 100, type: "coins" },
    { day: 3, name: "Super Aim", icon: "🎯", value: 1, type: "aim" },
    { day: 4, name: "Bomb", icon: "💣", value: 1, type: "bomb" },
    { day: 5, name: "1000 Coins", icon: "🪙", value: 1000, type: "coins" },
    { day: 6, name: "2 Fireballs", icon: "⚡", value: 2, type: "fireball" },
    { day: 7, name: "Mega Chest", icon: "🎁", value: { coins: 500, bomb: 1, aim: 1, fireball: 1 }, type: "chest" }
];

window.openStoreModal = function() {
    const modal = document.getElementById('storeModal');
    if (modal) {
        modal.style.display = 'flex';
        updateUI();
    }
};

window.closeStoreModal = function() {
    const modal = document.getElementById('storeModal');
    if (modal) modal.style.display = 'none';
};

window.buyCoins = function() {
    S.coins += 1000;
    saveState();
    updateUI();
    if(window.showPoints) {
        showPoints(window.innerWidth/2, window.innerHeight/2, '+1000 Coins! 🪙');
    } else {
        alert("Awesome! You received 1000 coins! 🪙");
    }
};

window.openDailyLoginModal = function() {
    const modal = document.getElementById('dailyLoginModal');
    if (modal) {
        modal.style.display = 'flex';
        window.renderDailyGrid();
    }
};

window.closeDailyLoginModal = function() {
    const modal = document.getElementById('dailyLoginModal');
    if (modal) modal.style.display = 'none';
};

window.renderDailyGrid = function() { // PREMIUM 2-ROW
    const grid = document.getElementById('dailyGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const todayStr = new Date().toDateString();
    const canClaimToday = S.dailyLogin.lastClaimedDate !== todayStr;
    const currentDay = S.dailyLogin.currentDay; // 0 to 6
    
    dailyRewards.forEach((reward, index) => {
        const isClaimed = S.dailyLogin.claimedDays.includes(reward.day);
        const isCurrent = (index === currentDay);
        
        let cardBg = 'rgba(255, 255, 255, 0.05)';
        let cardBorder = '1px solid rgba(255, 255, 255, 0.1)';
        let badgeHtml = '';
        let footerText = `DAY ${reward.day}`;
        let footerColor = '#aaa';
        let iconOpacity = '1';
        
        if (isClaimed) {
            cardBg = 'rgba(76, 175, 80, 0.15)';
            cardBorder = '2px solid #4caf50';
            badgeHtml = '<div style="position:absolute; top:2px; right:2px; background:#4caf50; color:#fff; border-radius:50%; width:14px; height:14px; font-size:9px; display:flex; align-items:center; justify-content:center; font-weight:bold;">✓</div>';
            footerText = 'CLAIMED';
            footerColor = '#4caf50';
            iconOpacity = '0.6';
        } else if (isCurrent) {
            if (canClaimToday) {
                cardBg = 'rgba(255, 215, 0, 0.15)';
                cardBorder = '2px solid #ffd700';
                footerText = 'CLAIM';
                footerColor = '#ffd700';
            } else {
                cardBg = 'rgba(0, 122, 255, 0.1)';
                cardBorder = '1px dashed #007aff';
                footerText = 'TOMORROW';
                footerColor = '#007aff';
            }
        } else if (index < currentDay) {
            footerText = 'MISSED';
            footerColor = '#ff3b30';
        } else {
            iconOpacity = '0.4';
            footerText = `DAY ${reward.day}`;
        }
        
        const card = document.createElement('div');
        card.style.cssText = `
            background: ${cardBg};
            border: ${cardBorder};
            border-radius: 12px;
            padding: 8px 4px;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            min-height: 80px;
        `;
        
        card.innerHTML = `
            ${badgeHtml}
            <div style="font-size: 10px; color: rgba(255,255,255,0.6); font-weight: 600;">Day ${reward.day}</div>
            <div style="font-size: 26px; margin: 4px 0; opacity: ${iconOpacity}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${reward.icon}</div>
            <div style="font-size: 8px; color: #fff; font-weight: 800;">${reward.name}</div>
            <div style="font-size: 8px; color: ${footerColor}; font-weight: 900; margin-top: 4px; letter-spacing: 0.3px;">${footerText}</div>
        `;
        
        grid.appendChild(card);
    });
    
    const btn = document.getElementById('dailyClaimBtn');
    if (btn) {
        if (canClaimToday && currentDay < 7) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.background = 'linear-gradient(90deg,#4caf50,#8bc34a)';
            btn.style.boxShadow = '0 6px 20px rgba(76,175,80,0.5)';
            btn.innerText = '⭐ CLAIM NOW ⭐';
        } else if (currentDay >= 7) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.background = '#888';
            btn.style.boxShadow = 'none';
            btn.innerText = 'ALL CLAIMED';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.background = 'linear-gradient(90deg,#555,#777)';
            btn.style.boxShadow = 'none';
            btn.innerText = 'TOMORROW';
        }
    }
};

window.claimDailyReward = function() {
    const todayStr = new Date().toDateString();
    if (S.dailyLogin.lastClaimedDate === todayStr) {
        alert("You have already claimed today's reward! Come back tomorrow.");
        return;
    }
    const currentDay = S.dailyLogin.currentDay;
    if (currentDay >= 7) {
        alert("All rewards claimed!");
        return;
    }
    
    const reward = dailyRewards[currentDay];
    
    if (reward.type === "coins") {
        S.coins += reward.value;
    } else if (reward.type === "aim") {
        S.powerups.aim = (S.powerups.aim || 0) + reward.value;
    } else if (reward.type === "bomb") {
        S.powerups.bomb = (S.powerups.bomb || 0) + reward.value;
    } else if (reward.type === "fireball") {
        S.powerups.fireball = (S.powerups.fireball || 0) + reward.value;
    } else if (reward.type === "chest") {
        S.coins += reward.value.coins;
        S.powerups.aim = (S.powerups.aim || 0) + reward.value.aim;
        S.powerups.bomb = (S.powerups.bomb || 0) + reward.value.bomb;
        S.powerups.fireball = (S.powerups.fireball || 0) + reward.value.fireball;
    }
    
    S.dailyLogin.claimedDays.push(reward.day);
    S.dailyLogin.currentDay += 1;
    S.dailyLogin.lastClaimedDate = todayStr;
    
    saveState();
    updateUI();
    window.renderDailyGrid();
    
    if(window.showPoints) {
        showPoints(window.innerWidth/2, window.innerHeight/2, `Claimed: ${reward.name}! 🎉`);
    } else {
        alert(`Congratulations! You claimed ${reward.name}! 🎉`);
    }
};

// ──────── MISSIONS LOGIC ────────
window.toggleMissions = function() {
    const container = document.getElementById('missionsContainer');
    if (!container) return;
    if (container.classList.contains('collapsed')) {
        container.classList.remove('collapsed');
        container.classList.add('expanded');
    } else {
        container.classList.remove('expanded');
        container.classList.add('collapsed');
    }
};

window.renderMissions = function() {
    const track = document.getElementById('missionsTrack');
    if (!track) return;
    if (!S.missions) S.missions = {
        easy: { progress: 0, target: 150, claimed: false },
        medium: { progress: 0, target: 3, claimed: false },
        hard: { progress: 0, target: 10000, claimed: false }
    };
    const defs = [
        { key: 'easy',   badge: 'EASY',   color: '#4caf50', icon: '🫧', title: 'Pop 150 Bubbles',     reward: '+200 🪙' },
        { key: 'medium', badge: 'MEDIUM', color: '#ff9800', icon: '🏆', title: 'Win 3 Levels',         reward: '+1 💣' },
        { key: 'hard',   badge: 'HARD',   color: '#f44336', icon: '⚡', title: 'Earn 10,000 Points',  reward: '+1 🎯' }
    ];
    track.innerHTML = '';
    let activeSet = false;
    defs.forEach((d, i) => {
        const m = S.missions[d.key];
        const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
        const done = m.progress >= m.target;
        const isActive = !activeSet && !m.claimed;
        if (isActive) activeSet = true;
        const card = document.createElement('div');
        card.className = 'mission-card' + (isActive ? ' active-collapsed' : '');
        card.innerHTML = `
            <div class="mission-header">
                <span class="mission-badge ${d.key}">${d.badge}</span>
                <span class="mission-reward">${d.reward}</span>
            </div>
            <div class="mission-title">${d.icon} ${d.title}</div>
            <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
            <div class="mission-footer">
                <span class="mission-status">${m.claimed ? '✓ DONE' : m.progress + ' / ' + m.target}</span>
                <button class="mission-claim-btn${done && !m.claimed ? ' claimable' : m.claimed ? ' claimed' : ''}" onclick="claimMissionReward('${d.key}')">${m.claimed ? 'CLAIMED' : done ? 'CLAIM!' : 'IN PROGRESS'}</button>
            </div>
        `;
        track.appendChild(card);
    });
};

window.claimMissionReward = function(key) {
    if (!S.missions || !S.missions[key]) return;
    const m = S.missions[key];
    if (m.claimed || m.progress < m.target) return;
    if (key === 'easy') {
        S.coins += 200;
        if(window.showPoints) showPoints(window.innerWidth/2, window.innerHeight/2, '+200 Coins! 🪙');
    } else if (key === 'medium') {
        S.powerups = S.powerups || {};
        S.powerups.bomb = (S.powerups.bomb || 0) + 1;
        if(window.showPoints) showPoints(window.innerWidth/2, window.innerHeight/2, '+1 Bomb! 💣');
    } else if (key === 'hard') {
        S.powerups = S.powerups || {};
        S.powerups.aim = (S.powerups.aim || 0) + 1;
        if(window.showPoints) showPoints(window.innerWidth/2, window.innerHeight/2, '+1 Super Aim! 🎯');
    }
    m.claimed = true;
    // Reset progress for next cycle
    m.progress = 0;
    m.claimed = false;
    // Actually mark claimed for current
    S.missions[key].claimed = true;
    S.missions[key].progress = 0;
    saveState();
    updateUI();
    window.renderMissions();
};

// ──────── DAILY BONUS (SPIN WHEEL) LOGIC ────────
const SPIN_REWARDS = [
    { label: '100 Coins',  type: 'coins',    value: 100 },
    { label: 'Super Aim',  type: 'aim',      value: 1   },
    { label: '250 Coins',  type: 'coins',    value: 250 },
    { label: 'Bomb',       type: 'bomb',     value: 1   },
    { label: '500 Coins',  type: 'coins',    value: 500 },
    { label: 'Fireball',   type: 'fireball', value: 1   },
    { label: '1000 Coins', type: 'coins',    value: 1000 },
    { label: 'Mega Chest', type: 'chest',    value: { coins:300, bomb:1, aim:1, fireball:1 } }
];

let _wheelSpinning = false;
let _wheelCurrentDeg = 0;
let _spinCooldownTimer = null;

function _updateSpinCooldown() {
    const el = document.getElementById('spinCooldownText');
    if (!el) return;
    const now = Date.now();
    const last = (S.dailyBonus && S.dailyBonus.lastSpinTime) || 0;
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    const diff = cooldown - (now - last);
    if (diff <= 0 || last === 0) {
        el.style.color = '#00ff88';
        el.innerText = '🎡 SPIN IS AVAILABLE!';
        const btn = document.querySelector('.wheel-center-glow');
        if(btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.style.color = '#ff9500';
        el.innerText = `⏳ Next spin in: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const btn = document.querySelector('.wheel-center-glow');
        if(btn) { btn.style.opacity = '0.45'; btn.style.pointerEvents = 'none'; }
    }
}

window.openDailyBonusModal = function() {
    const modal = document.getElementById('dailyBonusModal');
    if (!modal) return;
    modal.style.display = 'flex';
    _updateSpinCooldown();
    clearInterval(_spinCooldownTimer);
    _spinCooldownTimer = setInterval(_updateSpinCooldown, 1000);
};

window.closeDailyBonusModal = function() {
    const modal = document.getElementById('dailyBonusModal');
    if (modal) modal.style.display = 'none';
    clearInterval(_spinCooldownTimer);
};

window.spinWheel = function() {
    if (_wheelSpinning) return;
    const now = Date.now();
    const last = (S.dailyBonus && S.dailyBonus.lastSpinTime) || 0;
    if (last !== 0 && (now - last) < 24 * 60 * 60 * 1000) {
        _updateSpinCooldown();
        return;
    }
    _wheelSpinning = true;
    const plate = document.getElementById('wheelPlate');
    if (!plate) { _wheelSpinning = false; return; }

    // Pick a random sector (0-7)
    const winIndex = Math.floor(Math.random() * SPIN_REWARDS.length);
    // Each sector is 45 degrees. Center of sector i is at 22.5 + i*45 degrees.
    // To land sector i under the 12 o'clock pointer: rotate so that
    // the pointer (at 0deg / top) aligns with the sector center.
    const sectorCenter = 22.5 + winIndex * 45;
    // We spin multiple full rotations + the offset to land correctly
    const extraSpins = 1800; // 5 full rotations
    const targetAngle = extraSpins + (360 - sectorCenter);
    _wheelCurrentDeg = targetAngle;

    plate.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.3, 1)';
    plate.style.transform = `rotate(${_wheelCurrentDeg}deg)`;

    plate.addEventListener('transitionend', function onDone() {
        plate.removeEventListener('transitionend', onDone);
        _wheelSpinning = false;
        // Normalize angle to prevent overflow on next spin
        _wheelCurrentDeg = _wheelCurrentDeg % 360;
        plate.style.transition = 'none';
        plate.style.transform = `rotate(${_wheelCurrentDeg}deg)`;

        // Award the reward
        const reward = SPIN_REWARDS[winIndex];
        S.powerups = S.powerups || {};
        if (reward.type === 'coins') {
            S.coins += reward.value;
        } else if (reward.type === 'aim') {
            S.powerups.aim = (S.powerups.aim || 0) + reward.value;
        } else if (reward.type === 'bomb') {
            S.powerups.bomb = (S.powerups.bomb || 0) + reward.value;
        } else if (reward.type === 'fireball') {
            S.powerups.fireball = (S.powerups.fireball || 0) + reward.value;
        } else if (reward.type === 'chest') {
            S.coins += reward.value.coins;
            S.powerups.bomb = (S.powerups.bomb || 0) + reward.value.bomb;
            S.powerups.aim = (S.powerups.aim || 0) + reward.value.aim;
            S.powerups.fireball = (S.powerups.fireball || 0) + reward.value.fireball;
        }

        S.dailyBonus = S.dailyBonus || {};
        S.dailyBonus.lastSpinTime = Date.now();
        saveState();
        updateUI();
        _updateSpinCooldown();

        // Show reward popup
        setTimeout(() => {
            alert(`🎉 You won: ${reward.label}!`);
        }, 200);
    }, { once: true });
};

document.addEventListener('DOMContentLoaded', init);
