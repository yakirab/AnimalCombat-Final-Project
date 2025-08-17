import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { StyleSheet, Text, View, Image, PanResponder, Dimensions, TouchableOpacity, Alert } from 'react-native';

import { useBackground } from './BackgroundContext';

import { authentication, firebase, database, firestore } from './Config';
import { doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';

import { useNavigation, useRoute } from '@react-navigation/native';
import soundManager from './SoundManager';

const { width, height } = Dimensions.get('window');

// Screen scaling constants (based on 1929x2000 as normal size)
const NORMAL_WIDTH = 1929;
const NORMAL_HEIGHT = 2000;
const SCALE_X = width / NORMAL_WIDTH;
const SCALE_Y = height / NORMAL_HEIGHT;
const SCALE = Math.min(SCALE_X, SCALE_Y); // Use the smaller scale to maintain proportions

// Fighting game constants (scaled to screen size)
const CHARACTER_SIZE = 750 * SCALE; // Scaled character size

// Collision detection utility at module scope for stable reference
const HITBOX_SIZE = CHARACTER_SIZE * 0.4; // Hitbox is 40% of character size (reduced from 60%)
function checkCollision(x1, y1, x2, y2) {
  const distance = Math.abs(x1 - x2);
  return distance < HITBOX_SIZE;
}

// Attack range constants
const ATTACK_RANGES = {
  light: CHARACTER_SIZE * 0.6, // Light attacks have shorter range
  heavy: CHARACTER_SIZE * 0.8, // Heavy attacks have longer range
  special: CHARACTER_SIZE * 1.0, // Special attacks have longest range (except chameleon)
};

// Combat utility functions
function checkAttackRange(attackerX, attackerFacing, targetX, attackType) {
  const range = ATTACK_RANGES[attackType] || ATTACK_RANGES.light;
  const distance = Math.abs(attackerX - targetX);
  
  // Check if target is in front of attacker
  const isInFront = attackerFacing ? targetX > attackerX : targetX < attackerX;
  
  return distance <= range && isInFront;
}

function calculateDamage(attackerStats, attackType, isBlocking = false) {
  let baseDamage = 0;
  
  if (attackType === 'light') {
    baseDamage = attackerStats.light;
  } else if (attackType === 'heavy') {
    baseDamage = attackerStats.heavy;
  } else if (attackType === 'special' && typeof attackerStats.special === 'number') {
    baseDamage = attackerStats.special;
  }
  
  // Blocking fully negates damage
  if (isBlocking) {
    baseDamage = 0;
  }
  
  return baseDamage;
}

// Network optimization constants
const NETWORK_THROTTLE_MS = 90; // flush at most ~11 fps (anti-spam)
const POSITION_THRESHOLD = 2; // Only send position updates if moved more than 2 pixels
const WALK_FRAME_MS = 120; // Walk animation cadence

// Performance monitoring
const PERFORMANCE_MONITOR = {
  frameCount: 0,
  lastFPSCheck: 0,
  currentFPS: 60,
  animationQuality: 1.0, // 1.0 = full quality, 0.5 = half quality for performance
};

// Real-time animation state manager for DOM-like responsiveness
class AnimationStateManager {
  constructor() {
    this.states = new Map();
    this.listeners = new Map();
  }
  
  setState(id, newState) {
    const oldState = this.states.get(id);
    this.states.set(id, { ...oldState, ...newState });
    
    // Notify listeners immediately (DOM-like)
    const listener = this.listeners.get(id);
    if (listener) {
      listener(this.states.get(id));
    }
  }
  
  getState(id) {
    return this.states.get(id);
  }
  
  subscribe(id, listener) {
    this.listeners.set(id, listener);
  }
  
  unsubscribe(id) {
    this.listeners.delete(id);
  }
}

const animationManager = new AnimationStateManager();

const images = [
  require('./assets/MenuBackGround/background/bg1.png'),
  require('./assets/MenuBackGround/background/bg2.png'),
  require('./assets/MenuBackGround/background/bg3.png'),
  require('./assets/MenuBackGround/background/bg4.png'),
  require('./assets/MenuBackGround/background/bg5.png'),
  require('./assets/MenuBackGround/background/bg6.png'),
  require('./assets/MenuBackGround/background/bg7.png'),
  require('./assets/MenuBackGround/background/bg8.png'),
  require('./assets/MenuBackGround/background/bg9.png'),
  require('./assets/MenuBackGround/background/bg10.png'),
  require('./assets/MenuBackGround/background/bg11.png'),
  require('./assets/MenuBackGround/background/bg12.png'),
  require('./assets/MenuBackGround/background/bg13.png'),
  require('./assets/MenuBackGround/background/bg132.png'),
  require('./assets/MenuBackGround/background/bg133.png'),
  require('./assets/MenuBackGround/background/bg14.png'),
  require('./assets/MenuBackGround/background/bg15.png'),
  require('./assets/MenuBackGround/background/bg16.png'),
  require('./assets/MenuBackGround/background/bg17.png'),
  require('./assets/MenuBackGround/background/bg18.png'),
  require('./assets/MenuBackGround/background/bg19.png'),
  require('./assets/MenuBackGround/background/bg20.png'),
  require('./assets/MenuBackGround/background/bg21.png'),
  require('./assets/MenuBackGround/background/bg22.png'),
  require('./assets/MenuBackGround/background/bg23.png'),
  require('./assets/MenuBackGround/background/bg24.png'),
  require('./assets/MenuBackGround/background/bg25.png'),
  require('./assets/MenuBackGround/background/bg26.png'),
  require('./assets/MenuBackGround/background/bg27.png'),
  require('./assets/MenuBackGround/background/bg28.png'),
  require('./assets/MenuBackGround/background/bg29.png'),
  require('./assets/MenuBackGround/background/bg30.png'),
  require('./assets/MenuBackGround/background/bg31.png'),
  require('./assets/MenuBackGround/background/bg32.png'),
  require('./assets/MenuBackGround/background/bg33.png'),
  require('./assets/MenuBackGround/background/bg34.png'),
  require('./assets/MenuBackGround/background/bg35.png'),
  require('./assets/MenuBackGround/background/bg36.png'),
  require('./assets/MenuBackGround/background/bg37.png')
];

// Title explanations for achievements
const TITLE_EXPLANATIONS = {
  'Obvious Liar': 'Have an age > 100 years or < 1.5 years based on your birth date.',
  'Did the Impossible': 'Win against an opponent who is at least 200 years older than you.',
  'Spammer': 'Win a match using only one move type (only light, only heavy, or only special).',
  'Winner': 'Achieve a win rate of 60% or higher.',
  'Master': 'Unlock all other achievements: Obvious Liar, Did the Impossible, Spammer, and Winner.'
};

const CHARACTER_STATS = {
  Chameleon: {
    hp: 100,
    speed: 15, // Increased walking speed
    heavy: 15,
    light: 5,
    special: "invisible"
  },
  Tiger: {
    hp: 110,
    speed: 18, // Increased walking speed
    heavy: 10,
    light: 5,
    special: 20
  },
  Cow: {
    hp: 130,
    speed: 12, // Increased walking speed
    heavy: 12,
    light: 5,
    special: "milk"
  }
};

// Chameleon
const chameleonIdle = [
  require('./assets/charactermovements/chameleon/Idle/Idle1.png'),
  require('./assets/charactermovements/chameleon/Idle/idle2.png'),
];
const chameleonWalk = [
  require('./assets/charactermovements/chameleon/walk/walk1.png'),
  require('./assets/charactermovements/chameleon/walk/walk2.png'),
  require('./assets/charactermovements/chameleon/walk/walk3.png'),
];
const chameleonLight = [
  require('./assets/charactermovements/chameleon/punch/punch1.png'),
  require('./assets/charactermovements/chameleon/punch/punch2.png'),
];
const chameleonHeavy = [
  require('./assets/charactermovements/chameleon/lickattack/LA1.png'),
  require('./assets/charactermovements/chameleon/lickattack/LA2.png'),
  require('./assets/charactermovements/chameleon/lickattack/LA3.png'),
  require('./assets/charactermovements/chameleon/lickattack/LA4.png'),
];
const chameleonBlock = [
  require('./assets/charactermovements/chameleon/block/block.png'),
];

const chameleonDead = [
  require('./assets/charactermovements/chameleon/dead/dead1.png'),
  require('./assets/charactermovements/chameleon/dead/dead2.png'),
  require('./assets/charactermovements/chameleon/dead/dead3.png'),
  require('./assets/charactermovements/chameleon/dead/dead4.png'),
  require('./assets/charactermovements/chameleon/dead/dead5.png'),
  require('./assets/charactermovements/chameleon/dead/dead7.png'),
  require('./assets/charactermovements/chameleon/dead/dead8.png'),
  require('./assets/charactermovements/chameleon/dead/dead9.png'),
  require('./assets/charactermovements/chameleon/dead/dead10.png'),
  require('./assets/charactermovements/chameleon/dead/dead11.png'),
  require('./assets/charactermovements/chameleon/dead/dead12.png'),
];
const chameleonFinish = [
  require('./assets/charactermovements/chameleon/FINISHHIM/finish1.png'),
  require('./assets/charactermovements/chameleon/FINISHHIM/finish2.png'),
  require('./assets/charactermovements/chameleon/FINISHHIM/finish3.png'),
];

// Tiger
const tigerIdle = [
  require('./assets/charactermovements/tiger/Idle/idle1.png'),
  require('./assets/charactermovements/tiger/Idle/idle2.png'),
  require('./assets/charactermovements/tiger/Idle/idle3.png'),
];
const tigerWalk = [
  require('./assets/charactermovements/tiger/walk/walk1.png'),
  require('./assets/charactermovements/tiger/walk/walk2.png'),
  require('./assets/charactermovements/tiger/walk/walk3.png'),
  require('./assets/charactermovements/tiger/walk/walk4.png'),
  require('./assets/charactermovements/tiger/walk/walk5.png'),
];
const tigerLight = [
  require('./assets/charactermovements/tiger/punch/punch1.png'),
  require('./assets/charactermovements/tiger/punch/punch2.png'),
  require('./assets/charactermovements/tiger/punch/punch3.png'),
  require('./assets/charactermovements/tiger/punch/punch4.png'),
  require('./assets/charactermovements/tiger/punch/punch5.png'),
];
const tigerHeavy = [
  require('./assets/charactermovements/tiger/scratch/scratch1.png'),
  require('./assets/charactermovements/tiger/scratch/scratch2.png'),
  require('./assets/charactermovements/tiger/scratch/scratch3.png'),
  require('./assets/charactermovements/tiger/scratch/scratch4.png'),
];
const tigerBlock = [
  // Removed block1.png (first frame)
  require('./assets/charactermovements/tiger/block/block2.png'),
];

const tigerSpecial = [
  require('./assets/charactermovements/tiger/smash/smash1.png'),
  require('./assets/charactermovements/tiger/smash/smash2.png'),
  require('./assets/charactermovements/tiger/smash/smash3.png'),
  require('./assets/charactermovements/tiger/smash/smash4.png'),
  require('./assets/charactermovements/tiger/smash/smash5.png'),
  require('./assets/charactermovements/tiger/smash/smash6.png'),
];
const tigerDead = [
  require('./assets/charactermovements/tiger/dead/dead1.png'),
  require('./assets/charactermovements/tiger/dead/dead2.png'),
  require('./assets/charactermovements/tiger/dead/dead3.png'),
  require('./assets/charactermovements/tiger/dead/dead4.png'),
  require('./assets/charactermovements/tiger/dead/dead5.png'),
  require('./assets/charactermovements/tiger/dead/dead6.png'),
];
const tigerFinish = [
  require('./assets/charactermovements/tiger/FinishHim/finish1.png'),
  require('./assets/charactermovements/tiger/FinishHim/finish2.png'),
  require('./assets/charactermovements/tiger/FinishHim/finish3.png'),
];

// Cow
const cowIdle = [
  require('./assets/charactermovements/cow/Idle/cowidle1.png'),
  require('./assets/charactermovements/cow/Idle/cowidle2.png'),
  require('./assets/charactermovements/cow/Idle/cowidle3.png'),
];
const cowWalk = [
  require('./assets/charactermovements/cow/walking/walk1.png'),
  require('./assets/charactermovements/cow/walking/walk2.png'),
  require('./assets/charactermovements/cow/walking/walk3.png'),
  require('./assets/charactermovements/cow/walking/walk4.png'),
  require('./assets/charactermovements/cow/walking/walk5.png'),
];
const cowLight = [
  require('./assets/charactermovements/cow/PUNCH/cowpunch1.png'),
  require('./assets/charactermovements/cow/PUNCH/cowpunch2.png'),
  require('./assets/charactermovements/cow/PUNCH/cowpunch3.png'),
  require('./assets/charactermovements/cow/PUNCH/cowpunch4.png'),
  require('./assets/charactermovements/cow/PUNCH/punch5.png'),
];
const cowHeavy = [
  require('./assets/charactermovements/cow/jumpkick/jumpkick1.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick2.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick3.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick4.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick5.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick6.png'),
  require('./assets/charactermovements/cow/jumpkick/jumpkick7.png'),
];
const cowBlock = [
  // Removed block1.png (first frame)
  require('./assets/charactermovements/cow/block/block2.png'),
];

const cowSpecial = [
  require('./assets/charactermovements/cow/milk shotting/cowmilkshot1.png'),
  require('./assets/charactermovements/cow/milk shotting/cowmilkshot2.png'),
  require('./assets/charactermovements/cow/milk shotting/cowmilkshot3.png'),
  require('./assets/charactermovements/cow/milk shotting/cowmilkshot4.png'),
  require('./assets/charactermovements/cow/milk shotting/cowmilkshot5.png'),
];
const cowMilk = [
  require('./assets/charactermovements/cow/milk/milk1.png'),
  require('./assets/charactermovements/cow/milk/milk2.png'),
  require('./assets/charactermovements/cow/milk/milk3.png'),
  require('./assets/charactermovements/cow/milk/milk4.png'),
  require('./assets/charactermovements/cow/milk/milk5.png'),
  require('./assets/charactermovements/cow/milk/milk6.png'),
];
const cowDead = [
  require('./assets/charactermovements/cow/cow finished/dead1.png'),
  require('./assets/charactermovements/cow/cow finished/dead2.png'),
  require('./assets/charactermovements/cow/cow finished/dead3.png'),
];
const cowFinish = [
  require('./assets/charactermovements/cow/FinishHim/finish1.png'),
  require('./assets/charactermovements/cow/FinishHim/finish2.png'),
  require('./assets/charactermovements/cow/FinishHim/finish3.png'),
];

const CHARACTER_ANIMATIONS = {
  Chameleon: {
    idle: chameleonIdle,
    walk: chameleonWalk,
    light: chameleonLight,
    heavy: chameleonHeavy,
    block: chameleonBlock,
    dead: chameleonDead,
    finish: chameleonFinish,
    // special handled in code (color/invisible)
  },
  Tiger: {
    idle: tigerIdle,
    walk: tigerWalk,
    light: tigerLight,
    heavy: tigerHeavy,
    block: tigerBlock,
    special: tigerSpecial,
    dead: tigerDead,
    finish: tigerFinish,
  },
  Cow: {
    idle: cowIdle,
    walk: cowWalk,
    light: cowLight,
    heavy: cowHeavy,
    block: cowBlock,
    special: cowSpecial,
    milk: cowMilk,
    dead: cowDead,
    finish: cowFinish,
  }
};

const Game = () => {
  const { currentIndex } = useBackground();
  const navigation = useNavigation();
  const route = useRoute();
  const { gameRoomId, playerNumber, character, opponent } = route.params;
  const ALL_CHARACTER_NAMES = ['Cow', 'Tiger', 'Chameleon'];
  const encodeEmail = (email) => email.replace(/\./g, ',');
  
  // Fighting game constants (scaled)
  const FLOOR_Y = height - (100 * SCALE); // Characters stand on this Y position (scaled)
  const LEFT_BORDER = 100 * SCALE;
  const RIGHT_BORDER = width - (400 * SCALE);
  
  // Network optimization refs
  const lastNetworkUpdate = useRef(0);
  const lastSentPosition = useRef({ x: 0, y: 0 });
  const pendingUpdates = useRef({});
  const updateQueue = useRef([]);
  
  const [playerState, setPlayerState] = useState({
    ...CHARACTER_STATS[character.name],
    character: { name: character.name },
    x: playerNumber === 1 ? 150 : RIGHT_BORDER - 150,
    y: FLOOR_Y,
    hp: CHARACTER_STATS[character.name].hp,
    isBlocking: false,
    facingRight: playerNumber === 1, // Player 1 faces right, Player 2 faces left
    currentAction: 'idle',
    animationFrame: 0,
    lastActionTime: 0,
    lastLightAttackTime: 0, // Individual cooldown for light attacks
    lastHeavyAttackTime: 0, // Individual cooldown for heavy attacks
    lastSpecialAttackTime: 0, // Individual cooldown for special attacks
    isAttacking: false, // Track if currently attacking
    attackStartTime: 0, // Track when attack started
    specialStartX: playerNumber === 1 ? 150 : RIGHT_BORDER - 150, // Start X for specials like tiger lunge
    isInvisible: false, // For chameleon special ability
    invisibilityStartTime: 0, // When invisibility started
    invisibilityCooldownEnd: 0, // When invisibility cooldown ends
    isDead: false, // Whether player is dead and can't move
    isFinishHim: false, // Whether player is in finish him state (0 HP but not dead yet)
    finishHimStartTime: 0, // When finish him state started (for 5 second timeout)
    hasHitThisAttack: false, // Track if we've already hit with current attack
    blocksRemaining: 3, // Number of blocks remaining before cooldown
    blockCooldownEnd: 0, // When block cooldown ends
    canBlock: true, // Whether player can currently block
  });
  
  // Track pressed keys for simultaneous actions
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const pressedKeysRef = useRef(pressedKeys);
  useEffect(() => { pressedKeysRef.current = pressedKeys; }, [pressedKeys]);
  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  const [opponentState, setOpponentState] = useState({
    ...CHARACTER_STATS[opponent.character?.name || opponent.name],
    character: { name: opponent.character?.name || opponent.name },
    x: playerNumber === 1 ? RIGHT_BORDER - 150 : 150,
    y: FLOOR_Y,
    hp: CHARACTER_STATS[opponent.character?.name || opponent.name]?.hp ?? 0,
    isBlocking: false,
    facingRight: playerNumber === 2, // Opponent faces opposite direction
    currentAction: 'idle',
    animationFrame: 0,
    lastActionTime: 0,
    lastAttackTime: 0,
    isAttacking: false,
    attackStartTime: 0,
    isInvisible: false, // For chameleon special ability
    isDead: false, // Whether opponent is dead
    isFinishHim: false, // Whether opponent is in finish him state
    finishHimStartTime: 0, // When opponent's finish him state started
    hasHitThisAttack: false, // Track if opponent has already hit with current attack
    blocksRemaining: 3, // Number of blocks remaining before cooldown
    blockCooldownEnd: 0, // When block cooldown ends
    canBlock: true, // Whether opponent can currently block
  });
  const [gameStatus, setGameStatus] = useState('playing');
  const [transientBanners, setTransientBanners] = useState([]);
  const [playerDisplayName, setPlayerDisplayName] = useState('');
  const [opponentDisplayName, setOpponentDisplayName] = useState('');
  const [keybinds, setKeybinds] = useState({ left: 'a', right: 'd', block: 'f', light: 'e', heavy: 'q', special: 'r' });

  const normalizeControls = useCallback((controls) => {
    const toKey = (v, fb) => {
      const s = (v || '').toString().trim().toLowerCase();
      return s ? s[0] : fb;
    };
    return {
      left: toKey(controls?.left, 'a'),
      right: toKey(controls?.right, 'd'),
      block: toKey(controls?.block, 'f'),
      light: toKey(controls?.light, 'e'),
      heavy: toKey(controls?.heavy, 'q'),
      special: toKey(controls?.special, 'r'),
    };
  }, []);
  const playerMovesUsedRef = useRef({ light: 0, heavy: 0, special: 0 });
  const hasFinalizedRef = useRef(false);
  const [playerTitle, setPlayerTitle] = useState(null);
  const [opponentTitle, setOpponentTitle] = useState(null);

  // Refs for accessing latest state in game loop
  const opponentStateRef = useRef(opponentState);
  useEffect(() => { 
    opponentStateRef.current = opponentState; 
  }, [opponentState]);

  // Milk projectiles state for cow special attack
  const [milkProjectiles, setMilkProjectiles] = useState([]);
  const milkProjectilesRef = useRef([]);
  const projectileSyncTimesRef = useRef({});
  
  // Update milk projectiles ref when state changes
  useEffect(() => { 
    milkProjectilesRef.current = milkProjectiles; 
  }, [milkProjectiles]);

  const gameRoomRef = useRef(firebase.database().ref(`gameRooms/${gameRoomId}`));

  // Optimized Firebase update function with batching, throttling, and error handling
  const batchedFirebaseUpdate = useCallback((updates) => {
    const now = Date.now();
    
    // Add to pending updates
    Object.assign(pendingUpdates.current, updates);
    
    // Throttle network requests
    if (now - lastNetworkUpdate.current < NETWORK_THROTTLE_MS) {
      return;
    }
    
    // Send batched updates with error handling
    if (Object.keys(pendingUpdates.current).length > 0) {
      try {
        gameRoomRef.current.update(pendingUpdates.current)
          .catch((error) => {
            // Retry once on network error
            setTimeout(() => {
              try {
                gameRoomRef.current.update(pendingUpdates.current);
              } catch (retryError) {
                // Silent fail - game continues locally
              }
            }, 1000);
          });
        pendingUpdates.current = {};
        lastNetworkUpdate.current = now;
      } catch (error) {
        // Continue game locally if network fails
        pendingUpdates.current = {};
      }
    }
  }, []);

  // Sync action to Firebase
  const syncAction = useCallback((action, facingRight, isInvisible = false, isDead = false, isFinishHim = false) => {
    const actionKey = playerNumber === 1 ? 'player1/action' : 'player2/action';
    batchedFirebaseUpdate({
      [actionKey]: { 
        currentAction: action, 
        facingRight, 
        isInvisible, 
        isDead, 
        isFinishHim, 
        timestamp: Date.now() 
      }
    });
  }, [playerNumber, batchedFirebaseUpdate]);

  // Apply damage to opponent
  const applyDamageToOpponent = useCallback((damage) => {
    const opponentKey = playerNumber === 1 ? 'player2/hp' : 'player1/hp';
    
    // Get current opponent HP and calculate new HP
    const currentHp = opponentState.hp;
    const newHp = Math.max(0, currentHp - damage);
    
    // Update Firebase immediately with new HP
    const updates = {
      [opponentKey]: newHp
    };
    
    // Send to Firebase immediately (not batched for HP updates)
    gameRoomRef.current.update(updates).catch(error => {
      console.error('Failed to update opponent HP:', error);
    });
    
    // Update local opponent state
    setOpponentState(prev => ({
      ...prev,
      hp: newHp,
      isFinishHim: newHp === 0 && !prev.isDead,
    }));
  }, [playerNumber, opponentState.hp]);

  // Apply damage to player (from opponent attacks or projectiles)
  // Note: This is now mainly for local projectile damage, HP sync happens via Firebase listener
  const applyDamageToPlayer = useCallback((damage) => {
    setPlayerState(prev => {
      const newHp = Math.max(0, prev.hp - damage);
      
      // Update Firebase with player's new HP
      const playerKey = playerNumber === 1 ? 'player1/hp' : 'player2/hp';
      const updates = {
        [playerKey]: newHp
      };
      
      // Send to Firebase immediately
      gameRoomRef.current.update(updates).catch(error => {
        console.error('Failed to update player HP:', error);
      });
      
      return {
        ...prev,
        hp: newHp,
        isFinishHim: newHp === 0 && !prev.isDead,
      };
    });
  }, [playerNumber]);

  // Create milk projectile for cow special attack
  const createMilkProjectile = useCallback((startX, startY, direction) => {
    const cowSpeed = CHARACTER_STATS.Cow.speed;
    const milkSpeed = cowSpeed * 1.5; // 1.5x faster than cow
    // Create Firebase-safe ID (no dots, special characters)
    const safeId = `${playerNumber}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const newProjectile = {
      id: safeId, // Firebase-safe unique ID
      x: startX,
      y: startY,
      direction: direction, // 1 for right, -1 for left
      speed: milkSpeed,
      animationFrame: 0,
      lastAnimationTime: Date.now(),
      isHit: false,
      hitStartTime: 0,
      ownerPlayer: playerNumber // Track which player created this projectile
    };
    
    // Add to local state
    setMilkProjectiles(prev => [...prev, newProjectile]);
    
    // Sync to Firebase so opponent can see it
    const projectileKey = `projectiles/${safeId}`;
    gameRoomRef.current.child(projectileKey).set({
      x: startX,
      y: startY,
      direction: direction,
      speed: milkSpeed,
      ownerPlayer: playerNumber,
      timestamp: Date.now()
    });
  }, [playerNumber]);

  // Optimized position update with movement threshold and collision detection
  const updatePlayerPosition = useCallback((newX, newY) => {
    // Check collision with opponent first
    const opponentX = opponentState.x;
    const opponentY = opponentState.y;
    
    if (checkCollision(newX, newY, opponentX, opponentY)) {
      // Collision detected - don't move
      return;
    }
    
    // Keep character within screen bounds
    const boundedX = Math.max(LEFT_BORDER, Math.min(RIGHT_BORDER, newX));
    const boundedY = newY;
    
    const dx = Math.abs(boundedX - lastSentPosition.current.x);
    const dy = Math.abs(boundedY - lastSentPosition.current.y);
    
    // Update local state immediately for responsiveness
    setPlayerState(prev => ({
      ...prev,
      x: boundedX,
      y: boundedY
    }));
    
    // Only send position updates if movement is significant
    if (dx > POSITION_THRESHOLD || dy > POSITION_THRESHOLD) {
      const playerKey = playerNumber === 1 ? 'player1/position' : 'player2/position';
      const updates = {
        [playerKey]: { x: boundedX, y: boundedY }
      };
      
      batchedFirebaseUpdate(updates);
      lastSentPosition.current = { x: boundedX, y: boundedY };
    }
  }, [playerNumber, batchedFirebaseUpdate, opponentState.x, opponentState.y]);

  useEffect(() => {
    // Set initial position and sync to Firebase immediately
    const initialX = playerNumber === 1 ? 150 : RIGHT_BORDER - 150;
    const initialY = FLOOR_Y;
    const initialFacingRight = playerNumber === 1;
    
    // Update local state
    setPlayerState(prev => ({
      ...prev,
      x: initialX,
      y: initialY,
      facingRight: initialFacingRight
    }));
    
    // Sync initial position to Firebase
    const playerRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player1/position' : 'player2/position'
    );
    playerRef.set({ x: initialX, y: initialY });
    
    // Sync initial action to Firebase
    const actionRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player1/action' : 'player2/action'
    );
    actionRef.set({ 
      currentAction: 'idle',
      facingRight: initialFacingRight,
      timestamp: Date.now()
    });
    
    // Sync initial HP to Firebase
    const hpRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player1/hp' : 'player2/hp'
    );
    hpRef.set(CHARACTER_STATS[character.name].hp);
    
    // Listen for opponent's position updates with real-time optimization
    const opponentRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player2/position' : 'player1/position'
    );

    opponentRef.on('value', (snapshot) => {
      const position = snapshot.val();
      if (position) {
        // Immediate DOM-like update for ultra-responsive feel
        setOpponentState(prev => ({
          ...prev,
          x: position.x,
          y: position.y,
        }));
      }
    });

    // Listen for opponent's action updates with batched processing
    const opponentActionRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player2/action' : 'player1/action'
    );

    opponentActionRef.on('value', (snapshot) => {
      const action = snapshot.val();
      if (action) {
        // Determine opponent character from live state (avoid stale route params)
        const liveOpponentName = opponentStateRef.current?.character?.name
          || opponentState.character?.name
          || opponent.character?.name
          || opponent.name;

        // Play sound effects for opponent actions
        if (action.currentAction === 'light') {
          soundManager.playPunch(); // All light attacks use punch sound
        } else if (action.currentAction === 'heavy') {
          // Character-specific heavy attack sounds
          if (liveOpponentName === 'Cow') {
            soundManager.playKick();
          } else if (liveOpponentName === 'Chameleon') {
            soundManager.playLick();
          } else if (liveOpponentName === 'Tiger') {
            soundManager.playScratch();
          }
        } else if (action.currentAction === 'special') {
          // Character-specific special attack sounds
          if (liveOpponentName === 'Cow') {
            soundManager.playMilk();
          } else if (liveOpponentName === 'Tiger') {
            soundManager.playSmash();
          } else if (liveOpponentName === 'Chameleon') {
            soundManager.playInvisible();
          }
        }
        
        setOpponentState(prev => ({
          ...prev,
          currentAction: action.currentAction,
          facingRight: action.facingRight,
          lastActionTime: action.timestamp || prev.lastActionTime,
          animationFrame: 0,
          isAttacking: ['light', 'heavy', 'special'].includes(action.currentAction),
          attackStartTime: ['light', 'heavy', 'special'].includes(action.currentAction) ? action.timestamp : prev.attackStartTime,
          hasHitThisAttack: ['light', 'heavy', 'special'].includes(action.currentAction) ? false : prev.hasHitThisAttack, // Reset hit tracking for new attacks
          isInvisible: action.isInvisible || false, // Sync invisibility state
          isDead: action.isDead || false,
          isFinishHim: action.isFinishHim || false,
          isBlocking: action.currentAction === 'block', // Sync blocking state
        }));
      }
    });

    // Listen for opponent HP changes
    const opponentHpRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player2/hp' : 'player1/hp'
    );
    opponentHpRef.on('value', (snapshot) => {
      const hp = snapshot.val();
      if (hp !== null && hp !== undefined) {
        setOpponentState(prev => ({
          ...prev,
          hp: hp,
          isFinishHim: hp === 0 && !prev.isDead,
          finishHimStartTime: (hp === 0 && !prev.isDead && !prev.isFinishHim) ? Date.now() : prev.finishHimStartTime, // Start timer when entering finish him
        }));
      }
    });

    // Listen for player's own HP changes (when opponent damages us)
    const playerHpRef = gameRoomRef.current.child(
      playerNumber === 1 ? 'player1/hp' : 'player2/hp'
    );
    playerHpRef.on('value', (snapshot) => {
      const hp = snapshot.val();
      if (hp !== null && hp !== undefined) {
        setPlayerState(prev => {
          // Only update if the HP is different from what we have locally
          // This prevents infinite loops from our own HP updates
          if (prev.hp !== hp) {
            console.log(`Player ${playerNumber} HP updated from Firebase: ${prev.hp} -> ${hp}`);
            return {
              ...prev,
              hp: hp,
              isFinishHim: hp === 0 && !prev.isDead,
              finishHimStartTime: (hp === 0 && !prev.isDead && !prev.isFinishHim) ? Date.now() : prev.finishHimStartTime, // Start timer when entering finish him
            };
          }
          return prev;
        });
      }
    });

    // Listen for game status changes
    gameRoomRef.current.child('status').on('value', (snapshot) => {
      const status = snapshot.val();
      if (status === 'ended') {
        setGameStatus('ended');
      }
    });

    // Listen for opponent's projectiles
    const projectilesRef = gameRoomRef.current.child('projectiles');
    projectilesRef.on('child_added', (snapshot) => {
      const projectileData = snapshot.val();
      const projectileId = snapshot.key;
      
      // Only add projectiles created by opponent
      if (projectileData && projectileData.ownerPlayer !== playerNumber) {
        // Use current opponent position for consistent height
        const adjustedY = opponentState.y - (CHARACTER_SIZE * 0.4); // Same offset as player projectiles
        
        const newProjectile = {
          id: projectileId,
          x: projectileData.x,
          y: adjustedY, // Use adjusted Y based on current opponent position
          direction: projectileData.direction,
          speed: projectileData.speed,
          animationFrame: 0,
          lastAnimationTime: Date.now(),
          isHit: false,
          hitStartTime: 0,
          ownerPlayer: projectileData.ownerPlayer,
          isEnemyProjectile: true // Mark as enemy projectile
        };
        
        setMilkProjectiles(prev => {
          // Check if projectile already exists to avoid duplicates
          const exists = prev.some(p => p.id === projectileId);
          if (!exists) {
            return [...prev, newProjectile];
          }
          return prev;
        });
      }
    });

    // Listen for projectile hits to sync hit animations
    projectilesRef.on('child_changed', (snapshot) => {
      const projectileData = snapshot.val();
      const projectileId = snapshot.key;
      
      if (projectileData && projectileData.hit) {
        // Update local projectile to show hit animation
        setMilkProjectiles(prev => {
          return prev.map(projectile => {
            if (projectile.id === projectileId && !projectile.isHit) {
              return {
                ...projectile,
                isHit: true,
                x: projectileData.hit.hitX,
                hitStartTime: Date.now(),
                animationFrame: 0
              };
            }
            return projectile;
          });
        });
      }
    });

    // Clean up listeners
    return () => {
      opponentRef.off();
      opponentActionRef.off();
      opponentHpRef.off();
      playerHpRef.off();
      projectilesRef.off();
      gameRoomRef.current.child('status').off();
    };
  }, [playerNumber, batchedFirebaseUpdate]);

  // Fetch and display selected titles and display names for both players
  useEffect(() => {
    const fetchTitles = async () => {
      try {
        const me = authentication.currentUser;
        if (me?.email) {
          const meSnap = await getDoc(doc(firestore, 'Users', encodeEmail(me.email)));
          if (meSnap.exists()) {
            const myData = meSnap.data();
            if (myData?.selectedTitle) setPlayerTitle(myData.selectedTitle);
            if (myData?.name) setPlayerDisplayName(myData.name);
            if (myData?.controls) setKeybinds(prev => ({ ...prev, ...normalizeControls(myData.controls) }));
            else setPlayerDisplayName(me.displayName || (me.email?.split('@')[0]) || 'You');
          }
          else setPlayerDisplayName(me.displayName || (me.email?.split('@')[0]) || 'You');
        }
        if (opponent?.email) {
          const oppSnap = await getDoc(doc(firestore, 'Users', encodeEmail(opponent.email)));
          if (oppSnap.exists()) {
            const oppData = oppSnap.data();
            if (oppData?.selectedTitle) setOpponentTitle(oppData.selectedTitle);
            if (oppData?.name) setOpponentDisplayName(oppData.name);
            else setOpponentDisplayName(opponent.displayName || (opponent.email?.split('@')[0]) || 'Opponent');
          }
          else setOpponentDisplayName(opponent.displayName || (opponent.email?.split('@')[0]) || 'Opponent');
        }
      } catch {}
    };
    fetchTitles();
  }, [opponent?.email, normalizeControls]);

  useEffect(() => {
    let finishTimeout = null;

    // Helper: compute age
    const computeAgeYears = (bd) => {
      if (!bd || typeof bd.year !== 'number' || typeof bd.month !== 'number' || typeof bd.day !== 'number') return null;
      const birth = new Date(bd.year, Math.max(0, bd.month - 1), bd.day);
      const now = new Date();
      const diffMs = now.getTime() - birth.getTime();
      return diffMs / (365.25 * 24 * 60 * 60 * 1000);
    };

    // Finalize game results, stats, unlocks, achievements
    const finalizeGameAndAwards = async () => {
      if (hasFinalizedRef.current) return;
      hasFinalizedRef.current = true;
      try {
        const iWon = opponentStateRef.current.isDead && !playerStateRef.current.isDead;
        const iLost = playerStateRef.current.isDead && !opponentStateRef.current.isDead;
        if (!iWon && !iLost) return; // no result yet

        const me = authentication.currentUser;
        if (!me?.email) return;
        const myDocRef = doc(firestore, 'Users', encodeEmail(me.email));
        const oppDocRef = opponent?.email ? doc(firestore, 'Users', encodeEmail(opponent.email)) : null;

        const [mySnap, oppSnap] = await Promise.all([
          getDoc(myDocRef),
          oppDocRef ? getDoc(oppDocRef) : Promise.resolve({ exists: () => false }),
        ]);

        const myData = mySnap.exists() ? mySnap.data() : {};
        const oppData = oppSnap.exists() ? oppSnap.data() : {};

        const prevWins = Number(myData?.wins || 0);
        const prevLosses = Number(myData?.losses || 0);
        const prevPlayed = Number(myData?.gamesPlayed || (prevWins + prevLosses));
        const prevUnlocked = Array.isArray(myData?.unlockedCharacters) ? myData.unlockedCharacters : [];
        const prevAchievements = {
          obviousLiar: !!myData?.achievements?.obviousLiar,
          didTheImpossible: !!myData?.achievements?.didTheImpossible,
          spammer: !!myData?.achievements?.spammer,
          winner: !!myData?.achievements?.winner,
          master: !!myData?.achievements?.master,
        };
        const prevTitles = Array.isArray(myData?.titles) ? myData.titles : [];

        const newWins = prevWins + (iWon ? 1 : 0);
        const newLosses = prevLosses + (iLost ? 1 : 0);
        const newPlayed = prevPlayed + 1;

        // Unlock after first game
        let unlocked = [...prevUnlocked];
        let newUnlocks = [];
        if (prevPlayed === 0) {
          const remaining = ALL_CHARACTER_NAMES.filter(c => !unlocked.includes(c));
          if (remaining.length > 0) {
            const rand = remaining[Math.floor(Math.random() * remaining.length)];
            unlocked.push(rand);
            newUnlocks.push(`🎮 Character Unlocked: ${rand}!`);
          }
        }
        // Unlock after win
        if (iWon) {
          const remaining = ALL_CHARACTER_NAMES.filter(c => !unlocked.includes(c));
          if (remaining.length > 0) {
            const rand = remaining[Math.floor(Math.random() * remaining.length)];
            unlocked.push(rand);
            newUnlocks.push(`🏆 Victory Reward - Character Unlocked: ${rand}!`);
          }
        }

        // Achievements
        const myAge = computeAgeYears(myData?.birthDate);
        const oppAge = computeAgeYears(oppData?.birthDate);
        const movesUsed = playerMovesUsedRef.current || { light: 0, heavy: 0, special: 0 };
        const usedTypes = Object.keys(movesUsed).filter(k => movesUsed[k] > 0);
        const obviousLiarAch = prevAchievements.obviousLiar || (myAge !== null && (myAge > 100 || myAge < 1.5));
        const didImpossibleAch = prevAchievements.didTheImpossible || (iWon && oppAge !== null && myAge !== null && (oppAge - myAge >= 200));
        const spammerAch = prevAchievements.spammer || (iWon && usedTypes.length === 1);
        const winnerAch = prevAchievements.winner || (newWins / newPlayed >= 0.6);
        // Master requires all four achievements, including Obvious Liar
        const masterAch = prevAchievements.master || (
          !!obviousLiarAch && !!didImpossibleAch && !!spammerAch && !!winnerAch
        );

        // Check current win rate for title requirements
        const currentWinRate = newWins / newPlayed;
        
        // Check which titles should be removed based on current stats
        const titlesToRemove = [];
        const currentTitles = [...prevTitles];
        
        // Check Winner title - requires 60% win rate
        if (currentTitles.includes('Winner') && currentWinRate < 0.6) {
          titlesToRemove.push('Winner');
          currentTitles.splice(currentTitles.indexOf('Winner'), 1);
        }
        
        // Check Master title - requires all other titles
        if (currentTitles.includes('Master')) {
          const hasAllRequiredTitles = obviousLiarAch && didImpossibleAch && spammerAch && winnerAch;
          if (!hasAllRequiredTitles) {
            titlesToRemove.push('Master');
            currentTitles.splice(currentTitles.indexOf('Master'), 1);
          }
        }
        
        // Titles for newly unlocked achievements
        const newTitles = [];
        if (obviousLiarAch && !prevAchievements.obviousLiar) newTitles.push('Obvious Liar');
        if (didImpossibleAch && !prevAchievements.didTheImpossible) newTitles.push('Did the Impossible');
        if (spammerAch && !prevAchievements.spammer) newTitles.push('Spammer');
        if (winnerAch && !prevAchievements.winner) newTitles.push('Winner');
        if (masterAch && !prevAchievements.master) newTitles.push('Master');

        const achievementsUpdate = {
          obviousLiar: obviousLiarAch,
          didTheImpossible: didImpossibleAch,
          spammer: spammerAch,
          winner: winnerAch,
          master: masterAch,
        };

        // Persist
        const updates = {
          gamesPlayed: newPlayed,
          wins: newWins,
          losses: newLosses,
          unlockedCharacters: unlocked,
          achievements: achievementsUpdate,
        };
        await setDoc(myDocRef, updates, { merge: true });
        
                // Update titles - add new ones and remove invalid ones
        if (newTitles.length > 0 || titlesToRemove.length > 0) {
          // First add new titles
          if (newTitles.length > 0) {
            await updateDoc(myDocRef, { titles: arrayUnion(...newTitles) });
          }
          
          // Then remove titles that no longer qualify
          if (titlesToRemove.length > 0) {
            await updateDoc(myDocRef, { titles: currentTitles });
            
            // Check if the player's selected title was removed
            const currentSelectedTitle = myData?.selectedTitle;
            if (currentSelectedTitle && titlesToRemove.includes(currentSelectedTitle)) {
              await updateDoc(myDocRef, { selectedTitle: null });
            }
          }
        }
        
        // Show notifications (toast-like): render transient banners via local state
        if (newUnlocks.length > 0 || newTitles.length > 0 || titlesToRemove.length > 0) {
          const messages = [];
          if (newUnlocks.length > 0) messages.push(...newUnlocks);
          if (newTitles.length > 0) {
            const titleMessage = newTitles.length === 1 
              ? `🏆 Achievement Unlocked: "${newTitles[0]}"` 
              : `🏆 Achievements Unlocked: ${newTitles.map(t => `"${t}"`).join(', ')}`;
            messages.push(titleMessage);
          }
          if (titlesToRemove.length > 0) {
            const removedMessage = titlesToRemove.length === 1 
              ? `❌ Title Lost: "${titlesToRemove[0]}" - Requirements no longer met` 
              : `❌ Titles Lost: ${titlesToRemove.map(t => `"${t}"`).join(', ')} - Requirements no longer met`;
            messages.push(removedMessage);
          }
          setTransientBanners(messages);
          // Auto-hide after 9s
          setTimeout(() => setTransientBanners([]), 9000);
        }
      } catch {}
    };

    // If either player is dead, finalize, then end game after 3 seconds
    if ((playerState.isDead || opponentState.isDead) && gameStatus !== 'ended') {
      finalizeGameAndAwards();
      finishTimeout = setTimeout(() => {
        setGameStatus('ended');
        gameRoomRef.current.off();
      }, 3000);
    }

    return () => {
      if (finishTimeout) clearTimeout(finishTimeout);
    };
  }, [playerState.isDead, opponentState.isDead, gameStatus, navigation, opponent?.email]);

  // Initialize game sounds and start fighting music
  useEffect(() => {
    // Start fighting music when game loads
    soundManager.playBackgroundMusic(true);
    
    // Cleanup: return to menu music when game ends
    return () => {
      soundManager.playBackgroundMusic(false);
    };
  }, []);

  // Animation and physics timer - optimized for performance
  useEffect(() => {
    let lastTick = Date.now();
    const gameLoop = setInterval(() => {
      const now = Date.now();
      const deltaMs = Math.max(1, now - lastTick);
      lastTick = now;

      // CONTINUOUS WALKING while move keys held (time-based speed)
      const keys = pressedKeysRef.current;
      const ps = playerStateRef.current;
      let nextX = ps.x;
      let moved = false;
      if (!ps.isAttacking && !ps.isBlocking && !ps.isDead && !ps.isFinishHim) {
        const pixelsPerSecond = ps.speed * 4; // convert existing speed unit -> tune factor
        const dx = (pixelsPerSecond * deltaMs) / 1000;
        if (keys.has(keybinds.left) && !keys.has(keybinds.right)) {
          nextX = Math.max(LEFT_BORDER, ps.x - dx);
          moved = true;
        } else if (keys.has(keybinds.right) && !keys.has(keybinds.left)) {
          nextX = Math.min(RIGHT_BORDER, ps.x + dx);
          moved = true;
        }
      }
      if (moved) {
        // Start continuous walking sound loop
        soundManager.playWalk();
        
        updatePlayerPosition(nextX, ps.y); // throttled network inside
        setPlayerState(prev => ({
            ...prev,
          x: nextX,
          currentAction: prev.isAttacking ? prev.currentAction : 'walk', // Don't override attack animations
        }));
      } else {
        // Stop walking sound when not moving
        soundManager.stopWalk();
      }

      // Check if player should be idle when not moving
      const isMoving = moved;
      if (!isMoving && ps.currentAction === 'walk' && !ps.isAttacking && !ps.isBlocking && !ps.isDead && !ps.isFinishHim) {
        setPlayerState(prev => ({
            ...prev,
          currentAction: 'idle',
          animationFrame: 0,
          lastActionTime: now
        }));
        syncAction('idle', ps.facingRight, ps.isInvisible, ps.isDead, ps.isFinishHim);
      }

      // Player animation and physics
      setPlayerState(prev => {
        let newState = { ...prev };

        // Always stay on ground
        newState.y = FLOOR_Y;

        // Handle HP states
        if (prev.hp <= 0) {
          if (!prev.isDead && !prev.isFinishHim) {
            // First time reaching 0 HP - enter finish him state
            newState.isFinishHim = true;
            newState.finishHimStartTime = now; // Start the 5 second timer
            newState.currentAction = 'finish'; // Set to finish animation
            newState.animationFrame = 0; // Reset animation frame
            
            // Sync finish him state to Firebase
            syncAction('finish', prev.facingRight, prev.isInvisible, prev.isDead, true);
          } else if (prev.isFinishHim && prev.hp <= 0) {
            // Stay in finish him state - animation will be handled below
            newState.currentAction = 'finish';
            
            // Check if 5 seconds have passed in finish him state
            if (prev.finishHimStartTime > 0 && now - prev.finishHimStartTime >= 5000) {
              // 5 seconds passed - player dies automatically
              newState.isDead = true;
              newState.isFinishHim = false;
              newState.currentAction = 'dead';
              newState.animationFrame = 0;
              newState.lastActionTime = now;
              
              // Sync death state to Firebase
              syncAction('dead', prev.facingRight, prev.isInvisible, true, false);
            }
          }
        }

        // Handle chameleon invisibility timer (10 seconds max)
        if (prev.character?.name === 'Chameleon' && prev.isInvisible && prev.invisibilityStartTime > 0) {
          const invisibleDuration = now - prev.invisibilityStartTime;
          if (invisibleDuration >= 10000) { // 10 seconds
            newState.isInvisible = false;
            newState.invisibilityStartTime = 0;
            newState.invisibilityCooldownEnd = now + 5000; // 5 second cooldown
            syncAction('idle', prev.facingRight, false, prev.isDead, prev.isFinishHim); // Sync becoming visible
          }
        }

        // Handle block cooldown timer
        if (!prev.canBlock && prev.blockCooldownEnd > 0 && now >= prev.blockCooldownEnd) {
          // Block cooldown ended - restore blocking ability
          newState.canBlock = true;
          newState.blocksRemaining = 3;
          newState.blockCooldownEnd = 0;
        }

        // Check for attack hits on opponent - only check once per attack  
        // Allow hitting opponents in finish him state to kill them
        if (prev.isAttacking && !opponentState.isDead) {
          const attackType = prev.currentAction;
          const isInRange = checkAttackRange(prev.x, prev.facingRight, opponentState.x, attackType);
          
          if (isInRange && ['light', 'heavy', 'special'].includes(attackType)) {
            // Only apply damage once per attack - use a much tighter window and track last hit
            const attackJustStarted = now - prev.attackStartTime < 50; // Within 50ms of attack start
            const hasntHitYet = !prev.hasHitThisAttack;
            
            if (attackJustStarted && hasntHitYet) {
              // Mark that we've hit with this attack
              newState.hasHitThisAttack = true;
              // Track move usage for achievements
              if (attackType === 'light' || attackType === 'heavy' || attackType === 'special') {
                playerMovesUsedRef.current[attackType] = (playerMovesUsedRef.current[attackType] || 0) + 1;
              }
              
              // If opponent is in finish him state, they die (no damage calculation needed)
              if (opponentState.isFinishHim) {
                // Sync death state to Firebase
                const opponentActionKey = playerNumber === 1 ? 'player2/action' : 'player1/action';
                gameRoomRef.current.update({
                  [opponentActionKey]: { 
                    currentAction: 'dead', 
                    facingRight: opponentState.facingRight,
                    isInvisible: false,
                    isDead: true, 
                    isFinishHim: false, 
                    timestamp: Date.now() 
                  }
                });
                
                setOpponentState(prevOpp => ({
                  ...prevOpp,
                  isDead: true,
                  isFinishHim: false,
                  currentAction: 'dead',
                  animationFrame: 0,
                  lastActionTime: now
                }));
              } else {
                // Check if opponent is properly blocking (facing attacker and has blocks remaining)
                const isProperlyBlocking = opponentState.isBlocking && 
                                         opponentState.canBlock && 
                                         opponentState.blocksRemaining > 0 &&
                                         ((prev.facingRight && !opponentState.facingRight) || (!prev.facingRight && opponentState.facingRight)); // Must face each other
                
                // Debug blocking
                console.log(`BLOCK DEBUG: opponentBlocking=${opponentState.isBlocking}, canBlock=${opponentState.canBlock}, blocksLeft=${opponentState.blocksRemaining}, attackerFacing=${prev.facingRight}, defenderFacing=${opponentState.facingRight}, properBlock=${isProperlyBlocking}`);
                
                // Normal damage calculation for alive opponents
                const damage = calculateDamage(CHARACTER_STATS[character.name], attackType, isProperlyBlocking);
                console.log(`${character.name} ${attackType} attack: damage=${damage}, blocked=${isProperlyBlocking}, stats:`, CHARACTER_STATS[character.name]);
                
                if (isProperlyBlocking) {
                  // Successfully blocked - reduce block count
                  setOpponentState(prevOpp => ({
                    ...prevOpp,
                    blocksRemaining: prevOpp.blocksRemaining - 1,
                    canBlock: prevOpp.blocksRemaining - 1 > 0, // Can't block if no blocks left
                    blockCooldownEnd: prevOpp.blocksRemaining - 1 <= 0 ? now + 3000 : prevOpp.blockCooldownEnd // 3 second cooldown
                  }));
                }
                
                if (damage > 0) {
                  applyDamageToOpponent(damage);
                }
              }
            }
          }
        }

        // Tiger special lunge based on frames progress
        if (character.name === 'Tiger' && prev.currentAction === 'special') {
          const anims = CHARACTER_ANIMATIONS[character.name].special;
          const maxFrames = anims.length;
          const framesPassed = Math.max(prev.animationFrame, 0);
          const progress = framesPassed / maxFrames; // 0..1
          if (progress > 0.25) {
            const lungeProgress = (progress - 0.25) / 0.75;
            const lungeDistance = 600 * SCALE; // Increased from 300 to 600
            const direction = prev.facingRight ? 1 : -1;
            let targetX = prev.specialStartX + direction * lungeDistance * lungeProgress;
            targetX = Math.max(LEFT_BORDER, Math.min(RIGHT_BORDER, targetX));
            if (!checkCollision(targetX, prev.y, opponentState.x, opponentState.y)) {
              newState.x = targetX;
              updatePlayerPosition(targetX, prev.y);
            }
          }
        }

        // Cow jumpkick (heavy attack) lunge
        if (prev.character?.name === 'Cow' && prev.currentAction === 'heavy') {
          const anims = CHARACTER_ANIMATIONS[prev.character.name].heavy;
          const maxFrames = anims.length;
          const framesPassed = Math.max(prev.animationFrame, 0);
          const progress = framesPassed / maxFrames; // 0..1
          if (progress > 0.3 && progress < 0.8) { // Lunge during middle of animation
            const lungeProgress = (progress - 0.3) / 0.5;
            const lungeDistance = 200 * SCALE; // Shorter lunge than tiger
            const direction = prev.facingRight ? 1 : -1;
            let targetX = prev.specialStartX + direction * lungeDistance * lungeProgress;
            targetX = Math.max(LEFT_BORDER, Math.min(RIGHT_BORDER, targetX));
            if (!checkCollision(targetX, prev.y, opponentState.x, opponentState.y)) {
              newState.x = targetX;
              updatePlayerPosition(targetX, prev.y);
            }
          }
        }

        // Animation cadence
        const timeSinceLastAction = now - prev.lastActionTime;
        const animationSpeed = prev.currentAction === 'walk' ? WALK_FRAME_MS : 120;
        if (timeSinceLastAction > animationSpeed) {
          const animations = CHARACTER_ANIMATIONS[character.name];
          const currentAnim = animations[prev.currentAction];
          const maxFrames = currentAnim ? currentAnim.length : 1;

          if (prev.isDead) {
            // Dead animation plays once and sticks to last frame
            if (prev.animationFrame < maxFrames - 1) {
              newState.animationFrame = prev.animationFrame + 1;
            }
          } else if (prev.isFinishHim) {
            // Finish him animation loops - make sure we're using finish animation
            if (animations.finish) {
              newState.currentAction = 'finish';
              const finishFrames = animations.finish.length;
              newState.animationFrame = (prev.animationFrame + 1) % finishFrames;
            } else {
              // Fallback to idle if no finish animation
              newState.currentAction = 'idle';
              newState.animationFrame = (prev.animationFrame + 1) % maxFrames;
            }
          } else if (prev.currentAction === 'block') {
            if (prev.animationFrame < maxFrames - 1) newState.animationFrame = prev.animationFrame + 1;
          } else if (prev.currentAction === 'walk') {
            newState.animationFrame = (prev.animationFrame + 1) % maxFrames;
          } else if (prev.isAttacking) {
            if (prev.animationFrame >= maxFrames - 1) {
              newState.currentAction = 'idle';
              newState.isAttacking = false;
              newState.animationFrame = 0;
              newState.hasHitThisAttack = false; // Reset hit tracking when attack ends
            } else newState.animationFrame = prev.animationFrame + 1;
          } else {
            newState.animationFrame = (prev.animationFrame + 1) % maxFrames;
          }

          newState.lastActionTime = now;
        }

        return newState;
      });

      // Opponent animation and physics with attack processing
      setOpponentState(prev => {
        let newState = { ...prev };
        // No local physics for opponent - position comes from sync

        // Handle opponent block cooldown timer
        if (!prev.canBlock && prev.blockCooldownEnd > 0 && now >= prev.blockCooldownEnd) {
          // Block cooldown ended - restore blocking ability
          newState.canBlock = true;
          newState.blocksRemaining = 3;
          newState.blockCooldownEnd = 0;
        }

        // Check if opponent is attacking the player (symmetric to player attack logic)
        if (prev.isAttacking && !playerStateRef.current.isDead) {
          const attackType = prev.currentAction;
          const isInRange = checkAttackRange(prev.x, prev.facingRight, playerStateRef.current.x, attackType);
          
          if (isInRange && ['light', 'heavy', 'special'].includes(attackType)) {
            // Only apply damage once per attack - use timing check
            const attackJustStarted = now - prev.attackStartTime < 50; // Within 50ms of attack start
            const hasntHitYet = !prev.hasHitThisAttack;
            
            if (attackJustStarted && hasntHitYet) {
              // Mark that opponent has hit with this attack
              newState.hasHitThisAttack = true;
              
              // If player is in finish him state, they die (no damage calculation needed)
              if (playerStateRef.current.isFinishHim) {
                // Sync death state to Firebase
                const playerActionKey = playerNumber === 1 ? 'player1/action' : 'player2/action';
                gameRoomRef.current.update({
                  [playerActionKey]: { 
                    currentAction: 'dead', 
                    facingRight: playerStateRef.current.facingRight,
                    isInvisible: false,
                    isDead: true, 
                    isFinishHim: false, 
                    timestamp: Date.now() 
                  }
                });
                
                setPlayerState(prevPlayer => ({
                  ...prevPlayer,
                  isDead: true,
                  isFinishHim: false,
                  currentAction: 'dead',
                  animationFrame: 0,
                  lastActionTime: now
                }));
              } else {
                // Check if player is properly blocking (facing attacker and has blocks remaining)
                const isProperlyBlocking = playerStateRef.current.isBlocking && 
                                         playerStateRef.current.canBlock && 
                                         playerStateRef.current.blocksRemaining > 0 &&
                                         ((prev.facingRight && !playerStateRef.current.facingRight) || (!prev.facingRight && playerStateRef.current.facingRight)); // Must face each other
                
                // Debug blocking (opponent attacking player)
                console.log(`PLAYER BLOCK DEBUG: playerBlocking=${playerStateRef.current.isBlocking}, canBlock=${playerStateRef.current.canBlock}, blocksLeft=${playerStateRef.current.blocksRemaining}, attackerFacing=${prev.facingRight}, defenderFacing=${playerStateRef.current.facingRight}, properBlock=${isProperlyBlocking}`);
                
                // Normal damage calculation for alive players
                const opponentCharacterName = opponent.character?.name || opponent.name;
                const damage = calculateDamage(CHARACTER_STATS[opponentCharacterName], attackType, isProperlyBlocking);
                
                if (isProperlyBlocking) {
                  // Successfully blocked - reduce block count
                  setPlayerState(prevPlayer => ({
                    ...prevPlayer,
                    blocksRemaining: prevPlayer.blocksRemaining - 1,
                    canBlock: prevPlayer.blocksRemaining - 1 > 0, // Can't block if no blocks left
                    blockCooldownEnd: prevPlayer.blocksRemaining - 1 <= 0 ? now + 3000 : prevPlayer.blockCooldownEnd // 3 second cooldown
                  }));
                }
                
                if (damage > 0) {
                  applyDamageToPlayer(damage);
                }
              }
            }
          }
        }

        const timeSinceLastAction = now - prev.lastActionTime;
        const animationSpeed = prev.currentAction === 'walk' ? WALK_FRAME_MS : 120;
        if (timeSinceLastAction > animationSpeed) {
          const animations = CHARACTER_ANIMATIONS[opponent.character?.name || opponent.name];
          const currentAnim = animations?.[prev.currentAction];
          const maxFrames = currentAnim ? currentAnim.length : 1;

          if (prev.isDead) {
            // Dead animation plays once and sticks to last frame
            if (prev.animationFrame < maxFrames - 1) {
              newState.animationFrame = prev.animationFrame + 1;
            }
          } else if (prev.isFinishHim) {
            // Finish him animation loops
            if (animations.finish) {
              newState.currentAction = 'finish';
              const finishFrames = animations.finish.length;
              newState.animationFrame = (prev.animationFrame + 1) % finishFrames;
            }
            
            // Check if opponent has been in finish him state for 5 seconds
            if (prev.finishHimStartTime > 0 && now - prev.finishHimStartTime >= 5000) {
              // 5 seconds passed - opponent dies automatically
              newState.isDead = true;
              newState.isFinishHim = false;
              newState.currentAction = 'dead';
              newState.animationFrame = 0;
              newState.lastActionTime = now;
            }
          } else if (prev.currentAction === 'block') {
            if (prev.animationFrame < maxFrames - 1) newState.animationFrame = prev.animationFrame + 1;
          } else if (prev.currentAction === 'walk') {
            newState.animationFrame = (prev.animationFrame + 1) % maxFrames;
          } else if (prev.isAttacking) {
            if (prev.animationFrame >= maxFrames - 1) {
              newState.currentAction = 'idle';
              newState.isAttacking = false;
              newState.animationFrame = 0;
              newState.hasHitThisAttack = false; // Reset hit tracking when opponent attack ends
            } else newState.animationFrame = prev.animationFrame + 1;
          } else {
            newState.animationFrame = (prev.animationFrame + 1) % maxFrames;
          }
          newState.lastActionTime = now;
        }
        return newState;
      });

      // Update milk projectiles
      setMilkProjectiles(prevProjectiles => {
        return prevProjectiles.map(projectile => {
          let updatedProjectile = { ...projectile };
          
          if (!projectile.isHit) {
            // Move projectile
            const deltaX = projectile.speed * projectile.direction * deltaMs / 16; // Normalize to 60fps
            const nextX = updatedProjectile.x + deltaX;
            
            // Handle collision differently for own vs enemy projectiles
            if (projectile.isEnemyProjectile) {
          // Enemy projectile - check collision with local player using refined horizontal logic
              const targetX = playerStateRef.current.x;
              const targetY = playerStateRef.current.y;
              const isTargetHittable = !playerStateRef.current.isDead;

              let collisionOccurred = false;
              let snapX = nextX;

              if (projectile.direction === 1) { // Right-moving projectile
                const projectileRightEdge = nextX + (CHARACTER_SIZE * 0.4);
                const targetHitPoint = targetX + (CHARACTER_SIZE * 0.5); // Hit point is target's center
                if (projectileRightEdge >= targetHitPoint - (CHARACTER_SIZE * 0.08) && // Adjusted hit range
                    projectileRightEdge <= targetHitPoint + (CHARACTER_SIZE * 0.08)) {
                  collisionOccurred = true;
                  snapX = targetHitPoint - (CHARACTER_SIZE * 0.4); // Snap projectile's left edge
                }
              } else { // Left-moving projectile
                const projectileLeftEdge = nextX;
                const targetHitPoint = targetX + CHARACTER_SIZE - (CHARACTER_SIZE * 0.2); // Target's right edge - 20%
                if (projectileLeftEdge <= targetHitPoint + (CHARACTER_SIZE * 0.05) &&
                    projectileLeftEdge >= targetHitPoint - (CHARACTER_SIZE * 0.05)) {
                  collisionOccurred = true;
                  snapX = targetHitPoint;
                }
              }

              if (collisionOccurred && isTargetHittable) {
                console.log(`Enemy milk projectile HIT player! Applying damage.`);
                updatedProjectile.isHit = true;
                updatedProjectile.hitStartTime = now;
                updatedProjectile.animationFrame = 0;
                updatedProjectile.x = snapX; // Apply snap position
                
                // Sync hit animation to Firebase so both players see it
                gameRoomRef.current.child(`projectiles/${projectile.id}/hit`).set({
                  isHit: true,
                  hitX: updatedProjectile.x,
                  hitTime: now,
                  timestamp: Date.now()
                });

                const targetState = playerStateRef.current;
                const isProperlyBlocking = targetState.isBlocking && 
                                         targetState.canBlock && 
                                         targetState.blocksRemaining > 0 &&
                                         ((projectile.direction === 1 && !targetState.facingRight) || 
                                          (projectile.direction === -1 && targetState.facingRight));
                console.log(`ENEMY MILKSHOT BLOCK DEBUG: playerBlocking=${targetState.isBlocking}, canBlock=${targetState.canBlock}, blocksLeft=${targetState.blocksRemaining}, projectileDir=${projectile.direction}, playerFacing=${targetState.facingRight}, properBlock=${isProperlyBlocking}`);
                const milkDamage = isProperlyBlocking ? 0 : 5;
                
                if (isProperlyBlocking) {
                  setPlayerState(prevPlayer => ({
                    ...prevPlayer,
                    blocksRemaining: prevPlayer.blocksRemaining - 1,
                    canBlock: prevPlayer.blocksRemaining - 1 > 0,
                    blockCooldownEnd: prevPlayer.blocksRemaining - 1 <= 0 ? now + 3000 : prevPlayer.blockCooldownEnd
                  }));
                }
                
                if (milkDamage > 0) {
                  applyDamageToPlayer(milkDamage);
                }
              } else {
                updatedProjectile.x = nextX; // No hit -> advance
              }
            } else {
          // Own projectile - check collision with opponent using refined horizontal logic
              const targetX = opponentStateRef.current.x;
              const targetY = opponentStateRef.current.y;
              const isTargetHittable = !opponentStateRef.current.isDead;

              let collisionOccurred = false;
              let snapX = nextX;

              if (projectile.direction === 1) { // Right-moving projectile
                const projectileRightEdge = nextX + (CHARACTER_SIZE * 0.4);
                const targetHitPoint = targetX + (CHARACTER_SIZE * 0.5); // Hit point is target's center
                if (projectileRightEdge >= targetHitPoint - (CHARACTER_SIZE * 0.08) && // Adjusted hit range
                    projectileRightEdge <= targetHitPoint + (CHARACTER_SIZE * 0.08)) {
                  collisionOccurred = true;
                  snapX = targetHitPoint - (CHARACTER_SIZE * 0.4); // Snap projectile's left edge
                }
              } else { // Left-moving projectile
                const projectileLeftEdge = nextX;
                const targetHitPoint = targetX + CHARACTER_SIZE - (CHARACTER_SIZE * 0.2); // Target's right edge - 20%
                if (projectileLeftEdge <= targetHitPoint + (CHARACTER_SIZE * 0.05) &&
                    projectileLeftEdge >= targetHitPoint - (CHARACTER_SIZE * 0.05)) {
                  collisionOccurred = true;
                  snapX = targetHitPoint;
                }
              }

              if (collisionOccurred && isTargetHittable) {
                console.log(`Own milk projectile HIT opponent! Applying damage.`);
                updatedProjectile.isHit = true;
                updatedProjectile.hitStartTime = now;
                updatedProjectile.animationFrame = 0;
                updatedProjectile.x = snapX; // Apply snap position
                
                // Sync hit animation to Firebase so both players see it
                gameRoomRef.current.child(`projectiles/${projectile.id}/hit`).set({
                  isHit: true,
                  hitX: updatedProjectile.x,
                  hitTime: now,
                  timestamp: Date.now()
                });

                const targetState = opponentStateRef.current;
                const isProperlyBlocking = targetState.isBlocking && 
                                         targetState.canBlock && 
                                         targetState.blocksRemaining > 0 &&
                                         ((projectile.direction === 1 && !targetState.facingRight) || 
                                          (projectile.direction === -1 && targetState.facingRight));
                console.log(`OWN MILKSHOT BLOCK DEBUG: opponentBlocking=${targetState.isBlocking}, canBlock=${targetState.canBlock}, blocksLeft=${targetState.blocksRemaining}, projectileDir=${projectile.direction}, opponentFacing=${targetState.facingRight}, properBlock=${isProperlyBlocking}`);
                const milkDamage = isProperlyBlocking ? 0 : 5;
                
                if (isProperlyBlocking) {
                  setOpponentState(prevOpp => ({
                    ...prevOpp,
                    blocksRemaining: prevOpp.blocksRemaining - 1,
                    canBlock: prevOpp.blocksRemaining - 1 > 0,
                    blockCooldownEnd: prevOpp.blocksRemaining - 1 <= 0 ? now + 3000 : prevOpp.blockCooldownEnd
                  }));
                }
                
                if (milkDamage > 0) {
                  applyDamageToOpponent(milkDamage);
                }
              } else {
                updatedProjectile.x = nextX; // No hit -> advance
              }
            }
            
            // Check screen boundaries
            if (nextX < 0 || nextX > width) {
              updatedProjectile.isHit = true;
              updatedProjectile.hitStartTime = now;
              updatedProjectile.animationFrame = 0;
            }
          }
          
          // Update animation
          const animSpeed = 100; // Animation speed for milk
          if (now - updatedProjectile.lastAnimationTime > animSpeed) {
            if (updatedProjectile.isHit) {
              // Hit animation (milk5-6)
              if (updatedProjectile.animationFrame < 1) { // 2 frames for hit
                updatedProjectile.animationFrame++;
              }
            } else {
              // Travel animation (milk1-4)
              updatedProjectile.animationFrame = (updatedProjectile.animationFrame + 1) % 4;
            }
            updatedProjectile.lastAnimationTime = now;
          }
          
          return updatedProjectile;
        }).filter(projectile => {
          // Remove projectiles that have finished hit animation
          if (projectile.isHit && now - projectile.hitStartTime > 500) { // 500ms hit duration
            // Clean up projectile from Firebase if it's our own projectile
            if (!projectile.isEnemyProjectile) {
              gameRoomRef.current.child(`projectiles/${projectile.id}`).remove();
            }
            return false;
          }
          return true;
        });
      });

      // Flush any pending network batched updates if throttle window passed
      batchedFirebaseUpdate({});
    }, 16); // ~60 FPS

    return () => clearInterval(gameLoop);
  }, [character.name, opponent.name, updatePlayerPosition, batchedFirebaseUpdate, syncAction, applyDamageToOpponent, keybinds]);

  const handleKeyDown = useCallback((e) => {
    if (playerState.hp <= 0 || playerState.isDead || playerState.isFinishHim) return; // Prevent input if dead or in finish him state
    const now = Date.now();
    const me = authentication.currentUser;
    const controls = (me && me.email) ? (opponentDisplayName === null ? {} : {}) : {}; // placeholder
    // Load from Firestore-loaded controls if desired in the future
    const key = e.key.toLowerCase();
    
    // Add key to pressed keys
    setPressedKeys(prev => new Set(prev).add(key));
    
    switch (key) {
      case keybinds.left: // Walk left
        {
          const newFacing = false;
          const newAction = playerState.isAttacking ? playerState.currentAction : 'walk'; // Don't override attacks
          if (playerState.currentAction !== newAction || playerState.facingRight !== newFacing) {
            if (!playerState.isAttacking) { // Only sync if not attacking
              syncAction(newAction, newFacing, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
            }
          }
          setPlayerState((prev) => {
            const actionChanged = prev.currentAction !== newAction && !prev.isAttacking;
            const newXLeft = Math.max(LEFT_BORDER, prev.x - prev.speed);
            updatePlayerPosition(newXLeft, prev.y);
            return {
              ...prev,
              x: newXLeft,
              facingRight: newFacing,
              currentAction: prev.isAttacking ? prev.currentAction : newAction, // Don't override attacks
              animationFrame: actionChanged ? 0 : prev.animationFrame,
              lastActionTime: actionChanged ? now : prev.lastActionTime
            };
          });
        }
          break;
        case keybinds.right: // Walk right
        {
          const newFacing = true;
          const newAction = playerState.isAttacking ? playerState.currentAction : 'walk'; // Don't override attacks
          if (playerState.currentAction !== newAction || playerState.facingRight !== newFacing) {
            if (!playerState.isAttacking) { // Only sync if not attacking
              syncAction(newAction, newFacing, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
            }
          }
          setPlayerState((prev) => {
            const actionChanged = prev.currentAction !== newAction && !prev.isAttacking;
            const newXRight = Math.min(RIGHT_BORDER, prev.x + prev.speed);
            updatePlayerPosition(newXRight, prev.y);
            return {
            ...prev,
              x: newXRight,
              facingRight: newFacing,
              currentAction: prev.isAttacking ? prev.currentAction : newAction, // Don't override attacks
              animationFrame: actionChanged ? 0 : prev.animationFrame,
              lastActionTime: actionChanged ? now : prev.lastActionTime
            };
          });
        }
          break;
      case keybinds.block: // Block (hold)
        if (playerState.canBlock) { // Only allow blocking if not on cooldown
          setPlayerState((prev) => ({
            ...prev,
            isBlocking: true,
            currentAction: 'block',
            animationFrame: 0,
            lastActionTime: now
          }));
          if (playerState.currentAction !== 'block') {
            syncAction('block', playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
          }
        }
          break;
      case keybinds.light: // Light
                if (!playerState.isAttacking && now - playerState.lastLightAttackTime > 800) { // 0.8 second cooldown for light
            // Play punch sound for light attacks
            soundManager.playPunch();
            
            setPlayerState((prev) => ({
              ...prev,
              currentAction: 'light',
            animationFrame: 0,
            lastActionTime: now,
            lastLightAttackTime: now,
            isAttacking: true,
            attackStartTime: now,
            hasHitThisAttack: false // Reset hit tracking for new attack
            }));
          if (playerState.currentAction !== 'light') {
            syncAction('light', playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
          }
          // Track move usage
          playerMovesUsedRef.current.light = (playerMovesUsedRef.current.light || 0) + 1;
          }
          break;
        case keybinds.heavy: // Heavy
                if (!playerState.isAttacking && now - playerState.lastHeavyAttackTime > 1200) { // 1.2 second cooldown for heavy
              // Play character-specific heavy attack sounds using current player character
            if (playerState.character?.name === 'Cow') {
                soundManager.playKick(); // Cow kick
              } else if (playerState.character?.name === 'Chameleon') {
                soundManager.playLick(); // Chameleon lick attack
              } else if (playerState.character?.name === 'Tiger') {
                soundManager.playScratch(); // Tiger scratch
              }
              
              setPlayerState((prev) => ({
                ...prev,
                currentAction: 'heavy',
            animationFrame: 0,
            lastActionTime: now,
            lastHeavyAttackTime: now,
            isAttacking: true,
            attackStartTime: now,
            specialStartX: prev.x, // Set start position for cow's jumpkick lunge
            hasHitThisAttack: false // Reset hit tracking for new attack
          }));
          if (playerState.currentAction !== 'heavy') {
            syncAction('heavy', playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
          }
          // Track move usage
          playerMovesUsedRef.current.heavy = (playerMovesUsedRef.current.heavy || 0) + 1;
          }
          break;
        case keybinds.special: // Special
        if (!playerState.isAttacking && now - playerState.lastSpecialAttackTime > 1500) { // 1.5 second cooldown for special
          // Handle chameleon invisibility toggle with timer system
          if (playerState.character?.name === 'Chameleon') {
            // Check if cooldown is active
            if (now < playerState.invisibilityCooldownEnd) {
              break; // Can't use invisibility during cooldown
            }
            
            const newInvisibleState = !playerState.isInvisible;
            // Play invisibility sound
            soundManager.playInvisible();
            
            setPlayerState((prev) => ({
              ...prev,
              lastSpecialAttackTime: now,
              isInvisible: newInvisibleState,
              invisibilityStartTime: newInvisibleState ? now : 0,
              invisibilityCooldownEnd: !newInvisibleState ? now + 5000 : prev.invisibilityCooldownEnd // 5s cooldown when going visible
          }));
            syncAction('idle', playerState.facingRight, newInvisibleState, playerState.isDead, playerState.isFinishHim); // Stay in idle, sync new invisibility state
            // Track move usage as special toggle
            playerMovesUsedRef.current.special = (playerMovesUsedRef.current.special || 0) + 1;
          } else {
                        // Other characters use normal special attack
            // Play character-specific special attack sounds using current player character
            if (playerState.character?.name === 'Cow') {
              soundManager.playMilk(); // Cow milkshot
            } else if (playerState.character?.name === 'Tiger') {
              soundManager.playSmash(); // Tiger smash
            }
            
          setPlayerState((prev) => ({
            ...prev,
            currentAction: 'special',
              animationFrame: 0,
              lastActionTime: now,
              lastSpecialAttackTime: now,
              isAttacking: true,
              attackStartTime: now,
              specialStartX: prev.x,
              hasHitThisAttack: false // Reset hit tracking for new attack
            }));
            
                      // Create milk projectile for cow
          if (playerState.character?.name === 'Cow') {
            const direction = playerState.facingRight ? 1 : -1;
            let projectileStartX;
            
            if (playerState.facingRight) {
              // Facing right - keep current positioning
              projectileStartX = playerState.x + (CHARACTER_SIZE * 0.1);
            } else {
              // Facing left - start much more to the right (almost at cow center)
              projectileStartX = playerState.x + (CHARACTER_SIZE * 0.15); // Positive offset moves it to the right
            }
            
            const projectileStartY = playerState.y - (CHARACTER_SIZE * 0.4); // Higher from cow's center
            createMilkProjectile(projectileStartX, projectileStartY, direction);
          }
            
            if (playerState.currentAction !== 'special') {
              syncAction('special', playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
            }
            // Track move usage
            playerMovesUsedRef.current.special = (playerMovesUsedRef.current.special || 0) + 1;
          }
        }
          break;

        default:
          break;
      }
  }, [playerState, width, character.name, playerNumber, updatePlayerPosition, syncAction, createMilkProjectile, keybinds]);

  const handleKeyUp = useCallback((e) => {
      if (playerState.hp <= 0 || playerState.isDead || playerState.isFinishHim) return; // Prevent input if dead or in finish him state
    const now = Date.now();
    const key = e.key.toLowerCase();
    
    // Remove key from pressed keys
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    
    switch (key) {
        case 'f': // Stop blocking
        {
          const newAction = 'idle';
          if (playerState.currentAction !== newAction) {
            syncAction(newAction, playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
          }
          setPlayerState((prev) => ({
            ...prev,
            isBlocking: false,
            currentAction: newAction,
            animationFrame: 0,
            lastActionTime: now
          }));
        }
          break;
        case 'a':
        case 'd':
        {
          const keysHeld = pressedKeysRef.current;
          if (!keysHeld.has(keybinds.left) && !keysHeld.has(keybinds.right) && playerState.currentAction !== 'idle') {
            syncAction('idle', playerState.facingRight, playerState.isInvisible, playerState.isDead, playerState.isFinishHim);
          setPlayerState((prev) => ({
            ...prev,
            currentAction: 'idle',
              animationFrame: 0,
              lastActionTime: now
          }));
          }
        }
          break;
        default:
          break;
      }
  }, [playerState, syncAction, keybinds]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, keybinds]);

  // Cleanup Firebase connections when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all Firebase listeners when component unmounts
      if (gameRoomRef.current) {
        gameRoomRef.current.off();
      }
    };
  }, []);

  const endGame = () => {
    gameRoomRef.current.update({ status: 'ended' });
  };

  // Navigate away after game ends, outside of render to avoid cross-component update warnings
  useEffect(() => {
    if (gameStatus === 'ended') {
      soundManager.playBackgroundMusic(false);
      const navTimer = setTimeout(() => {
        navigation.navigate('CharacterChoosing');
      }, 0);
      return () => clearTimeout(navTimer);
    }
  }, [gameStatus, navigation]);

  // Consistent character sizing styles for all characters with performance optimization
  const getCharacterImageStyle = useCallback((characterName, action) => {
    const baseStyle = {
      width: CHARACTER_SIZE,
      height: CHARACTER_SIZE,
      resizeMode: 'contain'
    };
    
    // Removed special scaling for Cow to fix growing issue
    return {
      ...baseStyle,
      shouldRasterizeIOS: true,
      renderToHardwareTextureAndroid: true,
    };
  }, [CHARACTER_SIZE]);

  // Get milk projectile image based on state and frame
  const getMilkProjectileImage = useCallback((projectile) => {
    if (projectile.isHit) {
      // Hit animation (milk5-6)
      return projectile.animationFrame === 0 ? cowMilk[4] : cowMilk[5]; // milk5, milk6
    } else {
      // Travel animation (milk1-4)
      return cowMilk[projectile.animationFrame]; // milk1-4
    }
  }, []);

  // Milk projectile styling
  const getMilkProjectileStyle = useCallback(() => {
    return {
      width: CHARACTER_SIZE * 0.4, // Smaller than character
      height: CHARACTER_SIZE * 0.4,
      resizeMode: 'contain',
      position: 'absolute',
    };
  }, [CHARACTER_SIZE]);

  return (
    <View style={styles.container}>
      <Image source={images[currentIndex]} style={styles.backgroundImage} />

      {/* Health Bars */}
      <View style={styles.healthBarContainer}>
        {/* Player HP - top left */}
        <View style={styles.healthBarLeft}>
          <Text style={styles.healthBarLabel}>
            {playerDisplayName || 'You'}
            {playerTitle ? ' ' : ''}
            {playerTitle ? <Text style={styles.titleInlinePlayer}>[{playerTitle}]</Text> : null}
          </Text>
          <View style={styles.healthBarBg}>
            <View style={[styles.healthBarFill, { width: `${playerState.hp}%` }]} />
          </View>
          <Text style={styles.healthBarValue}>{playerState.hp}</Text>
        </View>
        {/* Opponent HP - top right */}
        <View style={styles.healthBarRight}>
          <Text style={styles.healthBarLabel}>
            {opponentDisplayName || 'Opponent'}
            {opponentTitle ? ' ' : ''}
            {opponentTitle ? <Text style={styles.titleInlineOpponent}>[{opponentTitle}]</Text> : null}
          </Text>
          <View style={styles.healthBarBg}>
            <View style={[styles.healthBarFill, { width: `${opponentState.hp}%`, backgroundColor: '#e74c3c' }]} />
          </View>
          <Text style={styles.healthBarValue}>{opponentState.hp}</Text>
        </View>
      </View>

      {/* Controls Display */}
      <View style={styles.controlsContainer}>
        <Text style={styles.controlsText}>A/D: Move | E: Light | Q: Heavy | F: Block | R: Special</Text>
      </View>

      {/* Fighting Game Arena */}
      <View style={styles.arena}>
        {/* Floor line */}
        <View style={styles.floor} />
        {/* Transient reward banners */}
        {transientBanners.length > 0 && (
          <View style={styles.bannerContainer}>
            {transientBanners.map((msg, idx) => (
              <View key={idx} style={styles.banner}>
                <Text style={styles.bannerText}>{msg}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Player Character */}
      <View
        style={[
          styles.characterContainer,
          {
              left: playerState.x,
              bottom: 0,
              transform: [{ scaleX: playerState.facingRight ? 1 : -1 }], // face based on direction
              opacity: playerState.isInvisible ? 0.3 : 1.0, // Semi-transparent when invisible (player can still see themselves)
          },
        ]}
      >
        <Image
            source={CHARACTER_ANIMATIONS[character.name]?.[playerState.currentAction]?.[playerState.animationFrame] || character.image}
            style={getCharacterImageStyle(character.name, playerState.currentAction)}
        />
      </View>

        {/* Opponent Character */}
      <View
        style={[
          styles.characterContainer,
          {
              left: opponentState.x,
              bottom: 0,
              transform: [{ scaleX: opponentState.facingRight ? 1 : -1 }], // face based on direction
              opacity: opponentState.isInvisible ? 0.0 : 1.0, // Fully invisible when opponent is invisible
          },
        ]}
      >
        <Image
            source={CHARACTER_ANIMATIONS[opponent.character?.name || opponent.name]?.[opponentState.currentAction]?.[opponentState.animationFrame] || opponent.character?.image || opponent.image}
            style={getCharacterImageStyle(opponent.character?.name || opponent.name, opponentState.currentAction)}
          />
        </View>

        {/* Milk Projectiles */}
        {milkProjectiles.map((projectile) => (
          <View
            key={projectile.id}
            style={[
              getMilkProjectileStyle(),
              {
                left: projectile.x - (CHARACTER_SIZE * 0.2), // Center the projectile
                bottom: height - projectile.y - (CHARACTER_SIZE * 0.2),
                transform: [{ scaleX: projectile.direction }], // Face direction of travel
              },
            ]}
          >
            <Image
              source={getMilkProjectileImage(projectile)}
              style={getMilkProjectileStyle()}
            />
          </View>
        ))}
      </View>

      {gameStatus === 'ended' && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Game Over</Text>
          <TouchableOpacity style={styles.button} onPress={endGame}>
            <Text style={styles.buttonText}>Return to Character Selection</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  healthBarContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 20,
    paddingHorizontal: 50,
  },
  healthBarLeft: {
    alignItems: 'flex-start',
    width: 400 * SCALE,
  },
  healthBarRight: {
    alignItems: 'flex-end',
    width: 400 * SCALE,
  },
  healthBarLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 50 * SCALE,
    marginBottom: 12 * SCALE,
    textShadowColor: 'black',
    textShadowOffset: { width: 5 * SCALE, height: 5 * SCALE },
    textShadowRadius: 7 * SCALE,
  },
  titleInlinePlayer: {
    color: '#4CAF50',
    fontSize: 36 * SCALE,
    fontWeight: '900',
  },
  titleInlineOpponent: {
    color: '#e91e63',
    fontSize: 36 * SCALE,
    fontWeight: '900',
  },
  healthBarBg: {
    width: 500 * SCALE,
    height: 62 * SCALE,
    backgroundColor: '#333',
    borderRadius: 30 * SCALE,
    overflow: 'hidden',
    marginBottom: 12 * SCALE,
  },
  healthBarFill: {
    height: 62 * SCALE,
    backgroundColor: '#27ae60',
    borderRadius: 30 * SCALE,
  },
  healthBarValue: {
    color: '#fff',
    fontSize: 45 * SCALE,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowOffset: { width: 2 * SCALE, height: 2 * SCALE },
    textShadowRadius: 5 * SCALE,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  controlsText: {
    color: '#fff',
    fontSize: 30 * SCALE,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowOffset: { width: 2 * SCALE, height: 2 * SCALE },
    textShadowRadius: 5 * SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 25 * SCALE,
    paddingVertical: 12 * SCALE,
    borderRadius: 12 * SCALE,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  arena: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  bannerContainer: {
    position: 'absolute',
    top: 120 * SCALE,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  banner: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 12 * SCALE,
    paddingHorizontal: 18 * SCALE,
    borderRadius: 12 * SCALE,
    marginVertical: 6 * SCALE,
  },
  bannerText: {
    color: '#fff',
    fontSize: 28 * SCALE,
    fontWeight: '900',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#8B4513',
    borderTopWidth: 2,
    borderTopColor: '#654321',
  },
  characterContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  characterImage: {
    width: CHARACTER_SIZE,
    height: CHARACTER_SIZE,
    resizeMode: 'contain',
  },
  gameOverContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -100 }],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  gameOverText: {
    fontSize: 32,
    color: 'white',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Game; 