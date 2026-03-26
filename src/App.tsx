import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Terminal } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const BASE_SPEED = 120;

const TRACKS = [
  {
    id: 1,
    title: "ERR_0x01: NEON_DECAY",
    artist: "SYS.ADMIN",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/glitch1/200/200?grayscale"
  },
  {
    id: 2,
    title: "MEM_LEAK_DETECTED",
    artist: "NULL_PTR",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/glitch2/200/200?grayscale"
  },
  {
    id: 3,
    title: "SECTOR_FAULT",
    artist: "GHOST_IN_MACHINE",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/glitch3/200/200?grayscale"
  }
];

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
  const [shake, setShake] = useState(false);

  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Game Refs (Mutable state for game loop)
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Point>({ x: 0, y: -1 });
  const nextDirRef = useRef<Point>({ x: 0, y: -1 });
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  const spawnParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
    particlesRef.current.push(...newParticles);
  };

  const generateFood = (snake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    foodRef.current = newFood;
  };

  const resetGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    scoreRef.current = 0;
    setScore(0);
    particlesRef.current = [];
    generateFood(snakeRef.current);
    setGameState('PLAYING');
    lastTimeRef.current = performance.now();
    requestAnimationFrame(gameLoop);
  };

  const gameOver = () => {
    setGameState('GAME_OVER');
    triggerShake();
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
    }
  };

  const updateGame = () => {
    const snake = snakeRef.current;
    dirRef.current = nextDirRef.current;
    const head = snake[0];
    const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // Self collision
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      gameOver();
      return;
    }

    snake.unshift(newHead);

    // Food collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      triggerShake();
      spawnParticles(foodRef.current.x, foodRef.current.y, '#FF00FF');
      generateFood(snake);
    } else {
      snake.pop();
    }
  };

  const drawGame = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas with glitchy background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines (subtle cyan)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Draw Food (Magenta)
    ctx.fillStyle = '#FF00FF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF00FF';
    ctx.fillRect(foodRef.current.x * CELL_SIZE + 2, foodRef.current.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.shadowBlur = 0;

    // Draw Snake (Cyan)
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#FFFFFF' : '#00FFFF';
      ctx.shadowBlur = index === 0 ? 15 : 5;
      ctx.shadowColor = '#00FFFF';
      ctx.fillRect(segment.x * CELL_SIZE + 1, segment.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.shadowBlur = 0;
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1.0;
    });
  };

  const gameLoop = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    accumulatorRef.current += deltaTime;

    // Speed increases slightly with score
    const currentSpeed = Math.max(50, BASE_SPEED - Math.floor(scoreRef.current / 50) * 5);

    while (accumulatorRef.current >= currentSpeed) {
      updateGame();
      accumulatorRef.current -= currentSpeed;
    }

    // Update particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawGame(ctx);
    }

    requestAnimationFrame(gameLoop);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      lastTimeRef.current = performance.now();
      requestAnimationFrame(gameLoop);
    } else {
      // Draw initial or game over state
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawGame(ctx);
      }
    }
  }, [gameState, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && gameState !== 'PLAYING') {
        resetGame();
        return;
      }

      if (gameState !== 'PLAYING') return;

      const { x, y } = dirRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (y === 0) nextDirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (y === 0) nextDirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (x === 0) nextDirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (x === 0) nextDirRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Audio Logic
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const playNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  const playPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-black text-[#00FFFF] font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-static z-0" />
      <div className="scanline" />

      {/* Header */}
      <header className="mb-8 text-center z-10">
        <h1 className="text-4xl md:text-6xl font-mono font-black uppercase tracking-tighter glitch" data-text="SYS.SNAKE_OS">
          SYS.SNAKE_OS
        </h1>
        <p className="text-[#FF00FF] mt-2 text-sm uppercase tracking-widest font-bold">
          [ STATUS: ONLINE // AWAITING_INPUT ]
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl items-center lg:items-start justify-center z-10">
        
        {/* Game Container */}
        <div className={`flex flex-col items-center bg-[#050505] p-4 border-2 border-[#00FFFF] shadow-[4px_4px_0px_#FF00FF] ${shake ? 'shake' : ''}`}>
          {/* Score Board */}
          <div className="flex justify-between w-full mb-4 px-2 font-mono text-sm uppercase">
            <div className="flex flex-col">
              <span className="text-[#FF00FF]">MEM_ALLOC</span>
              <span className="text-2xl">{score} BYTES</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#FF00FF]">PEAK_MEM</span>
              <span className="text-2xl">{highScore} BYTES</span>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative border-2 border-[#FF00FF] bg-black">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block"
              style={{ width: '100%', maxWidth: '400px', height: 'auto', aspectRatio: '1/1' }}
            />

            {/* Overlays */}
            {gameState === 'IDLE' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <p className="text-[#00FFFF] font-mono text-xl mb-4 animate-pulse">PRESS SPACE TO INIT</p>
                <p className="text-[#FF00FF] text-xs font-mono">[ WASD // ARROWS ]</p>
              </div>
            )}

            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <h2 className="text-4xl font-mono text-[#FF00FF] mb-2 glitch" data-text="FATAL_ERR">FATAL_ERR</h2>
                <p className="text-[#00FFFF] mb-6 font-mono text-lg">SEGMENTATION_FAULT</p>
                <button 
                  onClick={resetGame}
                  className="px-4 py-2 bg-transparent text-[#00FFFF] border-2 border-[#00FFFF] font-mono uppercase hover:bg-[#00FFFF] hover:text-black transition-colors"
                >
                  REBOOT_SYS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Music Player Container */}
        <div className="w-full max-w-md bg-[#050505] p-6 border-2 border-[#FF00FF] shadow-[4px_4px_0px_#00FFFF] flex flex-col font-mono">
          <div className="flex items-center gap-2 mb-6 border-b-2 border-[#00FFFF] pb-2">
            <Terminal size={16} className="text-[#FF00FF]" />
            <span className="text-sm text-[#00FFFF] uppercase tracking-widest">AUDIO_SUBSYSTEM</span>
            <div className={`ml-auto w-3 h-3 rounded-full ${isPlaying ? 'bg-[#00FFFF] animate-pulse' : 'bg-gray-600'}`} />
          </div>

          {/* Album Art */}
          <div className="relative w-full aspect-square overflow-hidden mb-6 border-2 border-[#00FFFF] group">
            <img 
              src={currentTrack.cover} 
              alt={currentTrack.title}
              className={`w-full h-full object-cover filter contrast-150 saturate-200 hue-rotate-90 ${isPlaying ? 'animate-pulse' : 'grayscale'}`}
              referrerPolicy="no-referrer"
            />
            {/* Glitch Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] pointer-events-none mix-blend-overlay" />
            
            {isPlaying && (
              <div className="absolute inset-0 flex flex-col justify-end p-2">
                <div className="flex gap-1 items-end h-16">
                  {[...Array(16)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-[#FF00FF] opacity-80"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animation: `pulse-height ${0.1 + Math.random() * 0.3}s steps(3) infinite alternate`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#00FFFF] truncate uppercase">&gt; {currentTrack.title}</h3>
            <p className="text-xs text-[#FF00FF] mt-1 uppercase">AUTHOR: {currentTrack.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6 border-t-2 border-b-2 border-[#333] py-4">
            <button 
              onClick={playPrev}
              className="p-2 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors border-2 border-transparent hover:border-[#00FFFF]"
            >
              <SkipBack size={24} />
            </button>
            
            <button 
              onClick={togglePlay}
              className="p-3 bg-transparent text-[#FF00FF] border-2 border-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-colors"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            
            <button 
              onClick={playNext}
              className="p-2 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-colors border-2 border-transparent hover:border-[#00FFFF]"
            >
              <SkipForward size={24} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
              className="text-[#FF00FF]"
            >
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#333] appearance-none cursor-pointer accent-[#00FFFF]"
              style={{
                background: `linear-gradient(to right, #00FFFF ${volume * 100}%, #333 ${volume * 100}%)`
              }}
            />
          </div>

          {/* Hidden Audio Element */}
          <audio 
            ref={audioRef}
            src={currentTrack.url}
            onEnded={playNext}
            loop={false}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-height {
          0% { height: 10%; }
          100% { height: 100%; }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 8px;
          background: #FF00FF;
          cursor: pointer;
          border-radius: 0;
        }
      `}} />
    </div>
  );
}
