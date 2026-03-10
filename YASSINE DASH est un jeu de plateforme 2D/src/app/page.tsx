'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Zap, Star, Gamepad2, Rocket, Circle, Waves, ChevronRight, AlertTriangle, ArrowUp, Sparkles, MoveUp } from 'lucide-react'

// ==================== TYPES ====================
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
  type?: 'trail' | 'explosion' | 'sparkle' | 'float'
}

interface Obstacle {
  x: number
  y: number
  width: number
  height: number
  type: 'spike' | 'block' | 'gap'
  passed: boolean
}

interface JumpPad {
  x: number
  y: number
  width: number
  height: number
  type: 'yellow' | 'pink' | 'red'
  used: boolean
}

interface JumpRing {
  x: number
  y: number
  radius: number
  type: 'yellow' | 'pink' | 'green'
  used: boolean
}

interface Portal {
  x: number
  y: number
  width: number
  height: number
  type: 'gravity' | 'speed-up' | 'ship' | 'ball' | 'wave' | 'cube'
}

interface Level {
  name: string
  targetScore: number
  speedMultiplier: number
  obstacleFrequency: number
  backgroundColor: string
  secondaryColor: string
  accentColor: string
  patterns: string[]
  groundColor: string
}

type GameMode = 'cube' | 'ship' | 'ball' | 'wave'

// ==================== GAME CONFIGURATION ====================
const GRAVITY = 0.6
const JUMP_FORCE = 12
const PAD_JUMP_FORCE = 16
const RING_JUMP_FORCE = 14
const BASE_SPEED = 6
const PLAYER_SIZE = 40
const GROUND_HEIGHT = 80

const LEVELS: Level[] = [
  {
    name: 'Débutant',
    targetScore: 500,
    speedMultiplier: 1,
    obstacleFrequency: 0.012,
    backgroundColor: '#0a0a1a',
    secondaryColor: '#1a1a3a',
    accentColor: '#00ff88',
    patterns: ['single', 'single', 'pad'],
    groundColor: '#00ff88'
  },
  {
    name: 'Intermédiaire',
    targetScore: 1200,
    speedMultiplier: 1.3,
    obstacleFrequency: 0.018,
    backgroundColor: '#1a0a2e',
    secondaryColor: '#2a1a4e',
    accentColor: '#ff6b6b',
    patterns: ['single', 'double', 'ring', 'pad'],
    groundColor: '#ff6b6b'
  },
  {
    name: 'Avancé',
    targetScore: 2500,
    speedMultiplier: 1.6,
    obstacleFrequency: 0.022,
    backgroundColor: '#0a2a3a',
    secondaryColor: '#1a4a5a',
    accentColor: '#ffd93d',
    patterns: ['double', 'triple', 'ring', 'portal-gravity', 'pad'],
    groundColor: '#ffd93d'
  },
  {
    name: 'Expert',
    targetScore: 4000,
    speedMultiplier: 2,
    obstacleFrequency: 0.028,
    backgroundColor: '#2a0a1a',
    secondaryColor: '#4a1a2a',
    accentColor: '#ff00ff',
    patterns: ['triple', 'gap', 'ring', 'portal-ship', 'portal-speed'],
    groundColor: '#ff00ff'
  },
  {
    name: 'Maître',
    targetScore: 6000,
    speedMultiplier: 2.5,
    obstacleFrequency: 0.032,
    backgroundColor: '#0a0a0a',
    secondaryColor: '#1a1a1a',
    accentColor: '#00ffff',
    patterns: ['triple', 'gap', 'ring', 'portal-wave', 'portal-ball', 'gravity'],
    groundColor: '#00ffff'
  }
]

// ==================== GAME STATE INTERFACE ====================
interface GameState {
  player: {
    x: number
    y: number
    vy: number
    rotation: number
    onGround: boolean
    isDead: boolean
    gravityFlipped: boolean
  }
  obstacles: Obstacle[]
  particles: Particle[]
  jumpPads: JumpPad[]
  jumpRings: JumpRing[]
  portals: Portal[]
  backgroundOffset: number
  speed: number
  frameCount: number
  beatPhase: number
  gameMode: GameMode
  holdingJump: boolean
  score: number
  currentLevel: number
  groundY: number
}

// ==================== MENU BACKGROUND COMPONENT ====================
function MenuBackground({ currentLevelIndex }: { currentLevelIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize floating particles
    for (let i = 0; i < 50; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 1,
        color: LEVELS[currentLevelIndex].accentColor,
        life: 1,
        maxLife: 1,
        type: 'float'
      })
    }

    const animate = () => {
      const { width, height } = canvas
      const level = LEVELS[currentLevelIndex]
      frameRef.current++

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, level.backgroundColor)
      bgGradient.addColorStop(0.5, level.secondaryColor)
      bgGradient.addColorStop(1, level.backgroundColor)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Animated grid
      const gridSize = 50
      const offset = (frameRef.current * 2) % gridSize
      
      ctx.strokeStyle = `${level.accentColor}15`
      ctx.lineWidth = 1
      for (let x = -offset; x < width + gridSize; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Animated ground line (like in game)
      const groundY = height - 60
      ctx.strokeStyle = level.groundColor
      ctx.lineWidth = 2
      ctx.shadowColor = level.groundColor
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(width, groundY)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Ground fill
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height)
      groundGradient.addColorStop(0, `${level.groundColor}40`)
      groundGradient.addColorStop(1, `${level.groundColor}10`)
      ctx.fillStyle = groundGradient
      ctx.fillRect(0, groundY, width, height - groundY)

      // Floating particles
      particlesRef.current = particlesRef.current.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + (Math.random() - 0.5) * 0.1,
        vx: p.vx + (Math.random() - 0.5) * 0.1,
      }))

      // Wrap particles
      particlesRef.current = particlesRef.current.map(p => ({
        ...p,
        x: p.x < 0 ? width : p.x > width ? 0 : p.x,
        y: p.y < 0 ? height : p.y > height ? 0 : p.y,
      }))

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.globalAlpha = 0.6
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Decorative spikes
      const spikeOffset = (frameRef.current * 3) % 200
      ctx.fillStyle = level.accentColor
      ctx.shadowColor = level.accentColor
      ctx.shadowBlur = 15
      for (let x = -spikeOffset; x < width + 100; x += 200) {
        ctx.beginPath()
        ctx.moveTo(x, groundY)
        ctx.lineTo(x + 25, groundY - 40)
        ctx.lineTo(x + 50, groundY)
        ctx.closePath()
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // Floating cubes in background
      const cubeOffset = (frameRef.current * 1.5) % 300
      for (let x = -cubeOffset; x < width + 100; x += 300) {
        const cubeY = 100 + Math.sin(frameRef.current * 0.02 + x * 0.01) * 30
        ctx.save()
        ctx.translate(x + 20, cubeY + 20)
        ctx.rotate(frameRef.current * 0.02)
        ctx.strokeStyle = `${level.accentColor}40`
        ctx.lineWidth = 2
        ctx.strokeRect(-15, -15, 30, 30)
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentLevelIndex])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  )
}

// ==================== MAIN GAME COMPONENT ====================
export default function YassineDash() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gameStateRef = useRef<GameState | null>(null)
  
  // UI State
  const [uiState, setUiState] = useState<{
    gameState: 'menu' | 'playing' | 'paused' | 'gameOver'
    score: number
    highScore: number
    currentLevel: number
    levelProgress: number
    soundEnabled: boolean
    currentMode: GameMode
  }>({
    gameState: 'menu',
    score: 0,
    highScore: 0,
    currentLevel: 0,
    levelProgress: 0,
    soundEnabled: true,
    currentMode: 'cube'
  })

  // ==================== AUDIO SYSTEM ====================
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    if (!uiState.soundEnabled) return
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Audio not supported
    }
  }, [uiState.soundEnabled])

  // ==================== PARTICLE HELPERS ====================
  const createParticles = useCallback((x: number, y: number, color: string, count: number, type: 'explosion' | 'sparkle' | 'trail' = 'explosion') => {
    if (!gameStateRef.current) return
    const state = gameStateRef.current
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = type === 'explosion' ? Math.random() * 10 + 5 : Math.random() * 3 + 1
      state.particles.push({
        x,
        y,
        vx: type === 'trail' ? -2 : Math.cos(angle) * speed,
        vy: type === 'trail' ? (Math.random() - 0.5) * 2 : Math.sin(angle) * speed + (type === 'sparkle' ? -Math.random() * 3 : 0),
        size: Math.random() * 6 + 2,
        color,
        life: 1,
        maxLife: Math.random() * 0.5 + 0.5,
        type
      })
    }
  }, [])

  // ==================== OBSTACLE GENERATION ====================
  const generateObstacle = useCallback((canvasWidth: number, groundY: number) => {
    if (!gameStateRef.current) return
    const state = gameStateRef.current
    const level = LEVELS[state.currentLevel]
    
    const patterns = level.patterns
    const patternType = patterns[Math.floor(Math.random() * patterns.length)]
    
    switch (patternType) {
      case 'single':
        state.obstacles.push({
          x: canvasWidth + 100,
          y: groundY - 40,
          width: 40,
          height: 40,
          type: 'spike',
          passed: false
        })
        break
      case 'double':
        state.obstacles.push(
          { x: canvasWidth + 100, y: groundY - 40, width: 40, height: 40, type: 'spike', passed: false },
          { x: canvasWidth + 150, y: groundY - 40, width: 40, height: 40, type: 'spike', passed: false }
        )
        break
      case 'triple':
        for (let i = 0; i < 3; i++) {
          state.obstacles.push({
            x: canvasWidth + 100 + i * 50,
            y: groundY - 40,
            width: 40,
            height: 40,
            type: 'spike',
            passed: false
          })
        }
        break
      case 'gap':
        state.obstacles.push({
          x: canvasWidth + 100,
          y: groundY,
          width: 100,
          height: GROUND_HEIGHT,
          type: 'gap',
          passed: false
        })
        break
      case 'pad':
        state.jumpPads.push({
          x: canvasWidth + 100,
          y: groundY - 12,
          width: 50,
          height: 12,
          type: 'yellow',
          used: false
        })
        break
      case 'ring':
        state.jumpRings.push({
          x: canvasWidth + 150,
          y: groundY - 80,
          radius: 18,
          type: 'yellow',
          used: false
        })
        break
      case 'portal-gravity':
        state.portals.push({
          x: canvasWidth + 100,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'gravity'
        })
        break
      case 'portal-ship':
        state.portals.push({
          x: canvasWidth + 100,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'ship'
        })
        break
      case 'portal-ball':
        state.portals.push({
          x: canvasWidth + 100,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'ball'
        })
        break
      case 'portal-wave':
        state.portals.push({
          x: canvasWidth + 100,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'wave'
        })
        break
      case 'portal-speed':
        state.portals.push({
          x: canvasWidth + 100,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'speed-up'
        })
        break
      case 'gravity':
        state.obstacles.push(
          { x: canvasWidth + 100, y: groundY - 40, width: 40, height: 40, type: 'spike', passed: false }
        )
        state.portals.push({
          x: canvasWidth + 200,
          y: 50,
          width: 25,
          height: groundY - 100,
          type: 'gravity'
        })
        break
    }
  }, [])

  // ==================== JUMP HANDLER ====================
  const handleJump = useCallback((isHolding: boolean = true) => {
    const state = gameStateRef.current
    
    if (uiState.gameState === 'menu') {
      setUiState(prev => ({ ...prev, gameState: 'playing' }))
      return
    }
    
    if (uiState.gameState !== 'playing' || !state || state.player.isDead) return
    
    state.holdingJump = isHolding
    
    const player = state.player
    const groundY = state.groundY
    
    // Check for ring activation
    for (let i = 0; i < state.jumpRings.length; i++) {
      const ring = state.jumpRings[i]
      if (!ring.used) {
        const distance = Math.sqrt(
          Math.pow(player.x + PLAYER_SIZE / 2 - ring.x, 2) + 
          Math.pow(player.y + PLAYER_SIZE / 2 - ring.y, 2)
        )
        
        if (distance < ring.radius + PLAYER_SIZE / 2) {
          state.jumpRings[i] = { ...ring, used: true }
          player.vy = player.gravityFlipped ? RING_JUMP_FORCE : -RING_JUMP_FORCE
          player.onGround = false
          playTone(600, 0.1, 'square', 0.12)
          playTone(900, 0.15, 'sine', 0.1)
          createParticles(ring.x, ring.y, LEVELS[state.currentLevel].accentColor, 15, 'sparkle')
          return
        }
      }
    }
    
    // Normal jump based on mode
    const mode = state.gameMode
    if (mode === 'cube') {
      if (player.onGround) {
        player.vy = player.gravityFlipped ? JUMP_FORCE : -JUMP_FORCE
        player.onGround = false
        playTone(400, 0.1, 'sine', 0.12)
        createParticles(player.x + PLAYER_SIZE / 2, groundY, LEVELS[state.currentLevel].accentColor, 8)
      }
    } else if (mode === 'ball') {
      if (player.onGround) {
        player.gravityFlipped = !player.gravityFlipped
        player.vy = 0
        playTone(400, 0.1, 'sine', 0.12)
        createParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE, LEVELS[state.currentLevel].accentColor, 8)
      }
    }
  }, [uiState.gameState, playTone, createParticles])

  const handleJumpRelease = useCallback(() => {
    if (gameStateRef.current) {
      gameStateRef.current.holdingJump = false
    }
  }, [])

  // ==================== GAME CONTROLS ====================
  const startGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const groundY = canvas.height - GROUND_HEIGHT
    
    gameStateRef.current = {
      player: { 
        x: 100, 
        y: groundY - PLAYER_SIZE,
        vy: 0, 
        rotation: 0, 
        onGround: true, 
        isDead: false, 
        gravityFlipped: false 
      },
      obstacles: [],
      particles: [],
      jumpPads: [],
      jumpRings: [],
      portals: [],
      backgroundOffset: 0,
      speed: BASE_SPEED,
      frameCount: 0,
      beatPhase: 0,
      gameMode: 'cube',
      holdingJump: false,
      score: 0,
      currentLevel: 0,
      groundY
    }
    setUiState(prev => ({
      ...prev,
      gameState: 'playing',
      score: 0,
      currentLevel: 0,
      levelProgress: 0,
      currentMode: 'cube'
    }))
  }, [])

  // ==================== GAME LOOP ====================
  useEffect(() => {
    if (uiState.gameState !== 'playing') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    
    const gameLoop = () => {
      if (!gameStateRef.current) return
      
      const { width, height } = canvas
      const groundY = height - GROUND_HEIGHT
      const state = gameStateRef.current
      const level = LEVELS[state.currentLevel]
      const player = state.player
      const mode = state.gameMode
      
      state.frameCount++
      state.speed = BASE_SPEED * level.speedMultiplier
      state.backgroundOffset += state.speed
      state.groundY = groundY
      
      // Beat phase for music
      state.beatPhase += 0.05
      if (state.beatPhase > Math.PI * 2) {
        state.beatPhase = 0
        if (state.frameCount % 20 === 0 && uiState.soundEnabled) {
          playTone(110 + Math.random() * 110, 0.15, 'square', 0.06)
        }
      }
      
      // ==================== UPDATE PLAYER ====================
      if (!player.isDead) {
        const gravityDir = player.gravityFlipped ? -1 : 1
        
        // Ship mode - hold to go up
        if (mode === 'ship') {
          if (state.holdingJump) {
            player.vy -= 0.8 * gravityDir
          } else {
            player.vy += GRAVITY * gravityDir
          }
          player.vy = Math.max(-8, Math.min(8, player.vy))
        }
        // Wave mode
        else if (mode === 'wave') {
          player.vy = state.holdingJump ? -6 * gravityDir : 6 * gravityDir
        }
        // Cube/Ball mode - apply gravity
        else {
          player.vy += GRAVITY * gravityDir
        }
        
        // Update position
        player.y += player.vy
        
        // Check if player is over a gap
        let overGap = false
        for (const obs of state.obstacles) {
          if (obs.type === 'gap') {
            if (player.x + PLAYER_SIZE > obs.x && player.x < obs.x + obs.width) {
              overGap = true
              break
            }
          }
        }
        
        // Ground collision (normal gravity)
        if (!player.gravityFlipped) {
          // Ground - only if NOT over a gap
          if (!overGap && player.y >= groundY - PLAYER_SIZE) {
            player.y = groundY - PLAYER_SIZE
            player.vy = 0
            player.onGround = true
          } else if (overGap) {
            // Over gap - no ground, keep falling if going down
            player.onGround = false
            // If fallen too deep into gap, die
            if (player.y > groundY) {
              player.isDead = true
              playTone(200, 0.3, 'sawtooth', 0.15)
              setUiState(prev => ({ ...prev, gameState: 'gameOver' }))
            }
          }
          // Ceiling - only for ship/wave causes death, cube just bounces back
          if (player.y < 0) {
            player.y = 0
            if (mode === 'ship' || mode === 'wave') {
              player.isDead = true
              playTone(200, 0.3, 'sawtooth', 0.15)
              setUiState(prev => ({ ...prev, gameState: 'gameOver' }))
            } else {
              // For cube/ball: give small downward velocity to ensure falling
              player.vy = 1
            }
          }
        } 
        // Flipped gravity
        else {
          // Ground (now at top) - only if NOT over a gap
          if (!overGap && player.y <= 0) {
            player.y = 0
            player.vy = 0
            player.onGround = true
          } else if (overGap) {
            player.onGround = false
            if (player.y < -PLAYER_SIZE) {
              player.isDead = true
              playTone(200, 0.3, 'sawtooth', 0.15)
              setUiState(prev => ({ ...prev, gameState: 'gameOver' }))
            }
          }
          // Ceiling (now at bottom)
          if (player.y > groundY - PLAYER_SIZE) {
            player.y = groundY - PLAYER_SIZE
            if (mode === 'ship' || mode === 'wave') {
              player.isDead = true
              playTone(200, 0.3, 'sawtooth', 0.15)
              setUiState(prev => ({ ...prev, gameState: 'gameOver' }))
            } else {
              // For cube/ball: give small upward velocity to ensure falling
              player.vy = -1
            }
          }
        }
        
        // Rotation
        if (mode === 'cube') {
          if (!player.onGround) {
            player.rotation += 5 * gravityDir
          } else {
            player.rotation = Math.round(player.rotation / 90) * 90
          }
        } else if (mode === 'ball') {
          player.rotation += 6 * (player.gravityFlipped ? -1 : 1)
        } else {
          player.rotation = player.vy * 3
        }
        
        // Update score
        state.score += Math.floor(state.speed)
        const progress = (state.score / level.targetScore) * 100
        
        // Level up
        if (state.score >= level.targetScore && state.currentLevel < LEVELS.length - 1) {
          state.currentLevel++
          const notes = [523, 659, 784, 1047]
          notes.forEach((note, i) => {
            setTimeout(() => playTone(note, 0.2, 'sine', 0.1), i * 100)
          })
          createParticles(width / 2, height / 2, level.accentColor, 40, 'explosion')
        }
        
        // Update UI
        setUiState(prev => ({
          ...prev,
          score: state.score,
          currentLevel: state.currentLevel,
          levelProgress: Math.min(progress, 100),
          currentMode: mode,
          highScore: Math.max(prev.highScore, state.score)
        }))
        
        // Trail particles
        if (state.frameCount % 4 === 0) {
          createParticles(player.x, player.y + PLAYER_SIZE / 2, level.accentColor, 1, 'trail')
        }
      }
      
      // ==================== GENERATE OBSTACLES ====================
      if (Math.random() < level.obstacleFrequency && !player.isDead) {
        const lastObs = state.obstacles[state.obstacles.length - 1]
        const lastPad = state.jumpPads[state.jumpPads.length - 1]
        const lastPortal = state.portals[state.portals.length - 1]
        
        const lastX = Math.max(
          lastObs?.x || 0,
          lastPad?.x || 0,
          lastPortal?.x || 0
        )
        
        if (!lastX || lastX < width - 350) {
          generateObstacle(width, groundY)
        }
      }
      
      // ==================== MOVE OBSTACLES ====================
      state.obstacles = state.obstacles
        .map(obs => ({ ...obs, x: obs.x - state.speed }))
        .filter(obs => obs.x > -200)
      
      state.jumpPads = state.jumpPads
        .map(pad => ({ ...pad, x: pad.x - state.speed }))
        .filter(pad => pad.x > -200)
      
      state.jumpRings = state.jumpRings
        .map(ring => ({ ...ring, x: ring.x - state.speed }))
        .filter(ring => ring.x > -200)
      
      state.portals = state.portals
        .map(portal => ({ ...portal, x: portal.x - state.speed }))
        .filter(portal => portal.x > -200)
      
      // ==================== CHECK PAD COLLISIONS ====================
      for (const pad of state.jumpPads) {
        if (!pad.used) {
          const playerBottom = player.y + PLAYER_SIZE
          const playerRight = player.x + PLAYER_SIZE
          
          if (playerRight > pad.x && player.x < pad.x + pad.width &&
              playerBottom >= pad.y && playerBottom <= pad.y + pad.height + 10) {
            pad.used = true
            player.vy = player.gravityFlipped ? PAD_JUMP_FORCE : -PAD_JUMP_FORCE
            player.onGround = false
            playTone(500, 0.15, 'triangle', 0.12)
            createParticles(pad.x + pad.width / 2, pad.y, '#ffdd00', 12, 'sparkle')
          }
        }
      }
      
      // ==================== CHECK PORTAL COLLISIONS ====================
      for (let i = state.portals.length - 1; i >= 0; i--) {
        const portal = state.portals[i]
        const playerCenterX = player.x + PLAYER_SIZE / 2
        const playerCenterY = player.y + PLAYER_SIZE / 2
        
        if (playerCenterX > portal.x && playerCenterX < portal.x + portal.width &&
            playerCenterY > portal.y && playerCenterY < portal.y + portal.height) {
          
          switch (portal.type) {
            case 'gravity':
              player.gravityFlipped = !player.gravityFlipped
              break
            case 'speed-up':
              state.speed *= 1.3
              break
            case 'ship':
              state.gameMode = 'ship'
              break
            case 'ball':
              state.gameMode = 'ball'
              break
            case 'wave':
              state.gameMode = 'wave'
              break
            case 'cube':
              state.gameMode = 'cube'
              break
          }
          playTone(400, 0.2, 'sine', 0.1)
          createParticles(portal.x + portal.width / 2, playerCenterY, '#00ffff', 15, 'sparkle')
          state.portals.splice(i, 1)
        }
      }
      
      // ==================== CHECK OBSTACLE COLLISIONS ====================
      for (const obstacle of state.obstacles) {
        if (!obstacle.passed && !player.isDead) {
          if (obstacle.type === 'spike') {
            const spikeCenterX = obstacle.x + obstacle.width / 2
            const playerCenterX = player.x + PLAYER_SIZE / 2
            const dx = Math.abs(playerCenterX - spikeCenterX)
            
            if (dx < PLAYER_SIZE / 2 + obstacle.width / 4) {
              const playerBottom = player.y + PLAYER_SIZE
              if (playerBottom > obstacle.y + 10) {
                player.isDead = true
                playTone(200, 0.3, 'sawtooth', 0.15)
                createParticles(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, '#ff0000', 30, 'explosion')
                setUiState(prev => ({ ...prev, gameState: 'gameOver' }))
                break
              }
            }
          }
          
          if (obstacle.x + obstacle.width < player.x) {
            obstacle.passed = true
          }
        }
      }
      
      // ==================== UPDATE PARTICLES ====================
      state.particles = state.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.type === 'trail' ? p.vy : p.vy + 0.2,
          life: p.life - 0.025 / p.maxLife,
          size: p.size * 0.97
        }))
        .filter(p => p.life > 0)
      
      // ==================== RENDER ====================
      
      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, level.backgroundColor)
      bgGradient.addColorStop(0.5, level.secondaryColor)
      bgGradient.addColorStop(1, level.backgroundColor)
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)
      
      // Grid
      ctx.strokeStyle = `${level.accentColor}12`
      ctx.lineWidth = 1
      const gridSize = 40
      const offset = state.backgroundOffset % gridSize
      
      for (let x = -offset; x < width + gridSize; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, groundY)
        ctx.stroke()
      }
      for (let y = 0; y < groundY; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      // Ground
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height)
      groundGradient.addColorStop(0, level.groundColor)
      groundGradient.addColorStop(1, `${level.groundColor}30`)
      ctx.fillStyle = groundGradient
      ctx.fillRect(0, groundY, width, GROUND_HEIGHT)
      
      ctx.shadowColor = level.groundColor
      ctx.shadowBlur = 15
      ctx.strokeStyle = level.groundColor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(width, groundY)
      ctx.stroke()
      ctx.shadowBlur = 0
      
      // Ground pattern
      ctx.strokeStyle = `${level.accentColor}25`
      ctx.lineWidth = 1
      for (let x = -offset; x < width; x += 15) {
        ctx.beginPath()
        ctx.moveTo(x, groundY + 5)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      
      // Portals
      for (const portal of state.portals) {
        const portalColor = portal.type === 'gravity' ? '#ff00ff' :
                            portal.type === 'speed-up' ? '#ff6600' :
                            portal.type === 'ship' ? '#00ffff' :
                            portal.type === 'ball' ? '#00ff00' :
                            portal.type === 'wave' ? '#ff00ff' : '#ffffff'
        
        ctx.save()
        ctx.globalAlpha = 0.6 + Math.sin(state.frameCount * 0.1) * 0.3
        ctx.shadowColor = portalColor
        ctx.shadowBlur = 25
        ctx.strokeStyle = portalColor
        ctx.lineWidth = 3
        
        ctx.beginPath()
        ctx.ellipse(portal.x + portal.width / 2, (50 + groundY) / 2, 15, (groundY - 50) / 3, 0, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.strokeStyle = '#ffffff60'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(portal.x + portal.width / 2, (50 + groundY) / 2, 10, (groundY - 50) / 4, 0, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.restore()
      }
      
      // Jump pads
      for (const pad of state.jumpPads) {
        ctx.save()
        ctx.shadowColor = '#ffdd00'
        ctx.shadowBlur = 12
        ctx.fillStyle = '#ffdd00'
        ctx.beginPath()
        ctx.moveTo(pad.x, pad.y + pad.height)
        ctx.lineTo(pad.x + pad.width / 2, pad.y - 8)
        ctx.lineTo(pad.x + pad.width, pad.y + pad.height)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      }
      
      // Jump rings
      for (const ring of state.jumpRings) {
        ctx.save()
        const ringColor = ring.type === 'yellow' ? '#ffdd00' : ring.type === 'pink' ? '#ff66ff' : '#44ff44'
        ctx.shadowColor = ringColor
        ctx.shadowBlur = 15
        ctx.strokeStyle = ringColor
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = '#ffffff60'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.radius - 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()
      }
      
      // Obstacles
      for (const obstacle of state.obstacles) {
        if (obstacle.type === 'spike') {
          ctx.save()
          ctx.shadowColor = level.accentColor
          ctx.shadowBlur = 15
          ctx.fillStyle = level.accentColor
          ctx.beginPath()
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y)
          ctx.lineTo(obstacle.x, obstacle.y + obstacle.height)
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height)
          ctx.closePath()
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.restore()
        } else if (obstacle.type === 'gap') {
          ctx.fillStyle = '#000000'
          ctx.fillRect(obstacle.x, groundY, obstacle.width, GROUND_HEIGHT)
          ctx.strokeStyle = '#ff000060'
          ctx.lineWidth = 2
          ctx.strokeRect(obstacle.x, groundY, obstacle.width, GROUND_HEIGHT)
        }
      }
      
      // Trail particles
      for (const particle of state.particles) {
        if (particle.type === 'trail') {
          ctx.globalAlpha = particle.life * 0.4
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      
      // Player
      if (!player.isDead) {
        ctx.save()
        ctx.translate(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2)
        ctx.rotate((player.rotation * Math.PI) / 180)
        
        ctx.shadowColor = level.accentColor
        ctx.shadowBlur = 20
        
        if (mode === 'cube') {
          const gradient = ctx.createLinearGradient(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2)
          gradient.addColorStop(0, '#ffffff')
          gradient.addColorStop(0.5, level.accentColor)
          gradient.addColorStop(1, '#ffffff')
          ctx.fillStyle = gradient
          ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE)
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE)
          ctx.fillStyle = '#ffffff30'
          ctx.fillRect(-PLAYER_SIZE / 4, -PLAYER_SIZE / 4, PLAYER_SIZE / 2, PLAYER_SIZE / 2)
        } else if (mode === 'ship') {
          ctx.fillStyle = level.accentColor
          ctx.beginPath()
          ctx.moveTo(PLAYER_SIZE / 2, 0)
          ctx.lineTo(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2)
          ctx.lineTo(-PLAYER_SIZE / 3, 0)
          ctx.lineTo(-PLAYER_SIZE / 2, PLAYER_SIZE / 2)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (mode === 'ball') {
          const ballGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, PLAYER_SIZE / 2)
          ballGradient.addColorStop(0, '#ffffff')
          ballGradient.addColorStop(0.5, level.accentColor)
          ballGradient.addColorStop(1, level.accentColor)
          ctx.fillStyle = ballGradient
          ctx.beginPath()
          ctx.arc(0, 0, PLAYER_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (mode === 'wave') {
          ctx.fillStyle = level.accentColor
          ctx.beginPath()
          ctx.moveTo(0, -PLAYER_SIZE / 2)
          ctx.lineTo(PLAYER_SIZE / 2, 0)
          ctx.lineTo(0, PLAYER_SIZE / 2)
          ctx.lineTo(-PLAYER_SIZE / 2, 0)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        
        ctx.shadowBlur = 0
        ctx.restore()
      }
      
      // Other particles
      for (const particle of state.particles) {
        if (particle.type !== 'trail') {
          ctx.globalAlpha = particle.life
          ctx.fillStyle = particle.color
          ctx.shadowColor = particle.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }
      ctx.globalAlpha = 1
      
      // Continue loop
      if (uiState.gameState === 'playing' && !player.isDead) {
        animationId = requestAnimationFrame(gameLoop)
      }
    }
    
    animationId = requestAnimationFrame(gameLoop)
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [uiState.gameState, uiState.soundEnabled, playTone, createParticles, generateObstacle])

  // ==================== EVENT LISTENERS ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        handleJump(true)
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleJumpRelease()
      }
      if (e.code === 'Enter' && uiState.gameState === 'gameOver') {
        startGame()
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        handleJumpRelease()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleJump, handleJumpRelease, uiState.gameState, startGame])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ==================== RENDER UI ====================
  const getModeIcon = (mode: GameMode) => {
    switch (mode) {
      case 'cube': return <Gamepad2 className="w-4 h-4" />
      case 'ship': return <Rocket className="w-4 h-4" />
      case 'ball': return <Circle className="w-4 h-4" />
      case 'wave': return <Waves className="w-4 h-4" />
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      {/* Menu Background */}
      {uiState.gameState === 'menu' && (
        <MenuBackground currentLevelIndex={uiState.currentLevel} />
      )}

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={() => handleJump(true)}
        onMouseUp={handleJumpRelease}
        onTouchStart={(e) => {
          e.preventDefault()
          handleJump(true)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          handleJumpRelease()
        }}
        className={`absolute inset-0 w-full h-full cursor-pointer touch-none ${uiState.gameState !== 'playing' ? 'opacity-0 pointer-events-none' : ''}`}
      />
      
      {/* HUD */}
      {uiState.gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="text-white border-white/30 bg-black/50 backdrop-blur-sm text-lg px-4 py-2">
              <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
              Score: {uiState.score}
            </Badge>
            <Badge variant="outline" className="text-white border-white/30 bg-black/50 backdrop-blur-sm text-sm px-4 py-1">
              Record: {uiState.highScore}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-white border-white/30 bg-black/50 backdrop-blur-sm text-base px-3 py-2">
                {getModeIcon(uiState.currentMode)}
                <span className="ml-2">{uiState.currentMode.toUpperCase()}</span>
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 bg-black/50 backdrop-blur-sm text-base px-3 py-2">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                Niv. {uiState.currentLevel + 1}
              </Badge>
            </div>
            <div className="w-40">
              <Progress value={uiState.levelProgress} className="h-2 bg-black/50" />
            </div>
          </div>
        </div>
      )}
      
      {/* Menu Overlay */}
      {uiState.gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-center space-y-8 px-4">
            {/* Animated Title */}
            <div className="space-y-4 relative">
              {/* Glow effect behind title */}
              <div className="absolute inset-0 blur-3xl opacity-50">
                <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-gradient-to-r from-cyan-400 via-green-400 to-emerald-400 bg-clip-text">
                  YASSINE DASH
                </h1>
              </div>
              
              <h1 className="relative text-6xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">
                YASSINE DASH
              </h1>
              
              <p className="text-lg md:text-2xl text-gray-300/80 tracking-wider">
                Inspiré de Geometry Dash
              </p>
            </div>
            
            {/* Game Modes */}
            <div className="flex justify-center gap-6 md:gap-8">
              {[
                { mode: 'cube', icon: Gamepad2, color: 'text-cyan-400', border: 'border-cyan-400/50' },
                { mode: 'ship', icon: Rocket, color: 'text-pink-400', border: 'border-pink-400/50' },
                { mode: 'ball', icon: Circle, color: 'text-green-400', border: 'border-green-400/50' },
                { mode: 'wave', icon: Waves, color: 'text-purple-400', border: 'border-purple-400/50' }
              ].map(({ mode, icon: Icon, color, border }) => (
                <div key={mode} className="flex flex-col items-center gap-1 group">
                  <div className={`p-3 rounded-xl bg-black/40 backdrop-blur-sm border ${border} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{mode}</span>
                </div>
              ))}
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
              <Badge variant="outline" className="text-sm px-4 py-2 border-white/20 bg-black/30 backdrop-blur-sm text-gray-300">
                ESPACE / CLIC = Sauter
              </Badge>
              <Badge variant="outline" className="text-sm px-4 py-2 border-white/20 bg-black/30 backdrop-blur-sm text-gray-300">
                5 Niveaux de difficulté
              </Badge>
            </div>
            
            {/* Obstacles Guide */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 max-w-2xl mx-auto">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-4 text-center">🎮 Guide des Obstacles</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {/* Spike */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-red-500/30 hover:border-red-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">🔺</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Pics</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Sauter AVANT</p>
                  </div>
                </div>
                
                {/* Gap */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-gray-500/30 hover:border-gray-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">🕳️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Trous</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Sauter par-dessus</p>
                  </div>
                </div>
                
                {/* Jump Pad */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-yellow-500/30 hover:border-yellow-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">🔶</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Jump Pad</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Saut automatique</p>
                  </div>
                </div>
                
                {/* Jump Ring */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-orange-500/30 hover:border-orange-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">⭕</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Jump Ring</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Clic = double saut</p>
                  </div>
                </div>
                
                {/* Portal */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-purple-500/30 hover:border-purple-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">🌀</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Portails</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Change le mode</p>
                  </div>
                </div>
                
                {/* Cube */}
                <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-500/60 transition-colors">
                  <div className="text-2xl md:text-3xl">⬜</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm md:text-base">Ton Cube</p>
                    <p className="text-gray-400 text-xs md:text-sm truncate">Évite tout !</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Play Button */}
            <div className="relative group">
              {/* Button glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-green-500 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
              
              <Button
                onClick={startGame}
                size="lg"
                className="relative text-2xl px-14 py-8 bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-black font-bold rounded-full shadow-2xl transition-all hover:scale-105 active:scale-100"
              >
                <Play className="w-8 h-8 mr-3" fill="currentColor" />
                JOUER
              </Button>
            </div>
            
            {/* High Score */}
            {uiState.highScore > 0 && (
              <div className="flex items-center justify-center gap-3 text-xl">
                <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-yellow-400 font-medium">Record: {uiState.highScore}</span>
                <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
              </div>
            )}
            
            {/* Level selection hint */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <ChevronRight className="w-4 h-4 animate-bounce" />
              <span>Cliquez sur JOUER pour commencer</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over Overlay */}
      {uiState.gameState === 'gameOver' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-20">
          <div className="text-center space-y-6 px-4 animate-in fade-in zoom-in duration-500">
            <div className="space-y-2">
              <h2 className="text-5xl md:text-7xl font-bold text-red-500 drop-shadow-lg drop-shadow-red-500/50">
                GAME OVER
              </h2>
              <p className="text-3xl text-white font-light">Score: {uiState.score}</p>
              {uiState.score >= uiState.highScore && uiState.score > 0 && (
                <p className="text-xl text-yellow-400 animate-pulse flex items-center justify-center gap-2">
                  <Star className="w-5 h-5" />
                  Nouveau Record !
                  <Star className="w-5 h-5" />
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="outline" className="text-lg px-5 py-3 border-cyan-500/50 text-cyan-400 bg-black/30">
                <Zap className="w-5 h-5 mr-2" />
                Niveau {uiState.currentLevel + 1}
              </Badge>
              <Badge variant="outline" className="text-lg px-5 py-3 border-yellow-500/50 text-yellow-400 bg-black/30">
                <Trophy className="w-5 h-5 mr-2" />
                Record: {uiState.highScore}
              </Badge>
              <Badge variant="outline" className="text-lg px-5 py-3 border-pink-500/50 text-pink-400 bg-black/30">
                {getModeIcon(uiState.currentMode)}
                <span className="ml-2">{uiState.currentMode.toUpperCase()}</span>
              </Badge>
            </div>
            
            <Button
              onClick={startGame}
              size="lg"
              className="text-xl px-12 py-7 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold rounded-full shadow-xl shadow-red-500/30 transition-all hover:scale-105"
            >
              <RotateCcw className="w-6 h-6 mr-3" />
              REJOUER
            </Button>
            
            <p className="text-gray-500 text-sm">Appuie sur ENTRÉE pour rejouer</p>
          </div>
        </div>
      )}
      
      {/* Sound Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setUiState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
        className="absolute bottom-4 right-4 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm z-30 border border-white/10"
      >
        {uiState.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </Button>
      
      {uiState.gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 text-white/40 text-xs md:hidden pointer-events-none z-10">
          Touche pour sauter
        </div>
      )}
    </div>
  )
}
