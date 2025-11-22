import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
// import { GoogleGenAI } from "@google/genai"; 
import { 
  Question, 
  GameState, 
  User, 
  // UserStats, 
  // GameResult, 
  HighScore 
} from './types';
import { APP_TITLE, DISTRICT_DATABASE, MAX_SCORE_KEY, GOOGLE_CLIENT_ID } from './constants';

// Declare global google object
declare global {
  interface Window {
    google: any;
  }
}

// --- Assets & Icons ---
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-600">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
  </svg>
);

const GamepadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

// --- Sounds ---
const soundManager = {
  playClick: () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  },
  playCorrect: () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.4);
    });
  },
  playWrong: () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.3);
  },
  playTick: () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
  }
};

// --- Components ---

const ModernBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#f8fafc] overflow-hidden">
    {/* Architectural Grid */}
    <div 
      className="absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage: `
            linear-gradient(45deg, #64748b 25%, transparent 25%), 
            linear-gradient(-45deg, #64748b 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #64748b 75%), 
            linear-gradient(-45deg, transparent 75%, #64748b 75%)
        `,
        backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
        backgroundSize: '40px 40px'
      }}
    ></div>

    {/* Soft Ambient Glows - Corner placements */}
    <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400 opacity-[0.08] blur-[100px]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400 opacity-[0.08] blur-[100px]"></div>
  </div>
);

const Footer = ({ onClick }: { onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`mt-8 py-2 text-center text-[#800020] text-xs font-bold font-mono tracking-widest select-none relative z-50 animate-pulse-slow ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
  >
    z_bilgin  2025
  </div>
);

// Dynamic Jagged Landmass Generator
const generateJaggedPath = (seed: number) => {
    const random = (x: number) => {
        const n = Math.sin(seed + x) * 10000;
        return n - Math.floor(n);
    };

    let points = [];
    const numPoints = 12 + Math.floor(random(0) * 8); // 12-20 points
    const centerX = 100;
    const centerY = 50;
    const radiusX = 80;
    const radiusY = 30;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const rVar = 0.7 + random(i) * 0.6; // 0.7 - 1.3 variation
        const px = centerX + Math.cos(angle) * radiusX * rVar;
        const py = centerY + Math.sin(angle) * radiusY * rVar;
        points.push(`${px},${py}`);
    }

    return `M ${points[0]} L ${points.slice(1).join(' ')} Z`;
};

const Tabela = ({ district, mapShapeIndex }: { district: string, mapShapeIndex: number }) => {
  const pathData = generateJaggedPath(mapShapeIndex);

  return (
    <div className="relative z-10 w-full max-w-sm mx-auto mb-1">
      {/* Signboard */}
      <div className="bg-[#0057D9] rounded-lg shadow-xl border-[3px] border-white relative overflow-hidden px-4 min-h-[140px] flex flex-col items-center pt-3 pb-2">
        
        {/* Screws */}
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center">
            <div className="w-full h-[1px] bg-gray-400 transform rotate-45"></div>
        </div>
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center">
            <div className="w-full h-[1px] bg-gray-400 transform -rotate-45"></div>
        </div>
        <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center">
             <div className="w-full h-[1px] bg-gray-400 transform rotate-12"></div>
        </div>
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center">
             <div className="w-full h-[1px] bg-gray-400 transform -rotate-12"></div>
        </div>

        {/* Text */}
        <h2 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-md text-center leading-tight z-20">
          {district}
        </h2>
        
        {/* Divider Line */}
        <div className="w-3/4 h-1 bg-white mt-1 mb-1 rounded-full shadow-sm z-20"></div>

        {/* Abstract Map Shape */}
        <div className="flex items-center justify-center opacity-20 z-0 pointer-events-none mt-1">
             <svg width="140" height="50" viewBox="0 0 200 100">
                <path d={pathData} fill="white" stroke="none" />
             </svg>
        </div>
      </div>

      {/* Pole */}
      <div className="w-4 h-12 bg-gray-400 mx-auto -mt-1 relative z-0 shadow-inner rounded-b-full"></div>
      <div className="w-24 h-4 bg-black/10 mx-auto rounded-[100%] blur-sm -mt-2"></div>
    </div>
  );
};

const HighScoreList = ({ scores, currentScore }: { scores: HighScore[], currentScore?: number }) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 w-full max-w-sm mx-auto">
      <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-3 text-center border-b border-gray-100 pb-2">
        Puan Durumu
      </h3>
      {scores.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-4 italic">
          Henüz kayıtlı skor yok. İlk sen ol!
        </div>
      ) : (
        <div className="space-y-2">
          {scores.slice(0, 5).map((score, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                currentScore === score.score ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-gray-200 text-gray-700' : 
                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500 border border-gray-200'}
                `}>
                  {index + 1}
                </span>
                <span className="font-semibold text-gray-700 truncate max-w-[120px]">
                  {score.name}
                </span>
              </div>
              <div className="font-mono font-bold text-blue-600">
                {score.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main App Logic ---

const App = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [user, setUser] = useState<User | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // FIX: Use ref for sync score access
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load High Scores
  useEffect(() => {
    const stored = localStorage.getItem(MAX_SCORE_KEY);
    if (stored) {
      setHighScores(JSON.parse(stored));
    }
  }, []);

  // Initialize Google OAuth Client
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
             try {
                 const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                   headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                 });
                 const profile = await res.json();
                 
                 // User is authenticated, load or create stats
                 const storedUserStr = localStorage.getItem(`ilce_bulmaca_user_${profile.email}`);
                 
                 const defaultStats = {
                    totalGames: 0,
                    totalScore: 0,
                    cumulativeScore: 0,
                    dailyScore: 0,
                    dailyGamesPlayed: 0,
                    lastPlayedDate: new Date().toISOString().split('T')[0],
                    maxScore: 0,
                    totalCorrect: 0,
                    totalWrong: 0,
                    bestStreak: 0
                 };

                 let appUser: User;

                 if (storedUserStr) {
                    const parsed = JSON.parse(storedUserStr);
                    // Reset logic happens in useEffect below, but handle it here for safety too
                    const today = new Date().toISOString().split('T')[0];
                    let currentStats = { ...defaultStats, ...parsed.stats };

                    if (currentStats.lastPlayedDate !== today) {
                       currentStats.dailyGamesPlayed = 0;
                       currentStats.dailyScore = 0;
                       currentStats.lastPlayedDate = today;
                    }

                    appUser = {
                        ...parsed,
                        name: profile.given_name || profile.name,
                        email: profile.email,
                        stats: currentStats
                    };
                    // Save reset immediately
                    localStorage.setItem(`ilce_bulmaca_user_${profile.email}`, JSON.stringify(appUser));
                 } else {
                    appUser = {
                        email: profile.email,
                        name: profile.given_name || profile.name,
                        isAdmin: false,
                        playHistory: [],
                        gameHistory: [],
                        stats: defaultStats
                    };
                 }
                 
                 setUser(appUser);
                 setGameState(GameState.LOBBY);

             } catch (error) {
                 console.error("Failed to fetch user profile", error);
             }
          }
        },
      });
      setTokenClient(client);
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 6 && prev > 0) { 
             soundManager.playTick();
          }
          if (prev <= 1) {
            // Don't call handleSessionOver here directly to avoid stale closure issues with user state
            // Just set to 0, the effect below will trigger
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Trigger Game Over when time hits 0
  useEffect(() => {
      if (timeLeft === 0 && gameState === GameState.PLAYING) {
          handleSessionOver();
      }
  }, [timeLeft, gameState]);

  // Check Daily Reset on load/updates
  useEffect(() => {
    if (user) {
        const today = new Date().toISOString().split('T')[0];
        if (user.stats.lastPlayedDate !== today) {
            const updatedUser = {
                ...user,
                stats: {
                    ...user.stats,
                    dailyGamesPlayed: 0,
                    dailyScore: 0,
                    lastPlayedDate: today
                }
            };
            setUser(updatedUser);
            localStorage.setItem(`ilce_bulmaca_user_${user.email}`, JSON.stringify(updatedUser));
        }
    }
  }, [gameState]);

  const handleSessionOver = () => {
    setGameState(GameState.SESSION_OVER);
    if (user) {
      // FIX: Use ref value for calculation to ensure it's current
      const finalSessionScore = scoreRef.current; 
      
      const today = new Date().toISOString().split('T')[0];
      const currentDaily = user.stats.dailyScore || 0;
      const currentCumulative = user.stats.cumulativeScore || 0;
      
      const newDailyScore = currentDaily + finalSessionScore;
      const newCumulativeScore = currentCumulative + finalSessionScore;
      
      const updatedUser = {
        ...user,
        stats: {
          ...user.stats,
          dailyScore: newDailyScore,
          cumulativeScore: newCumulativeScore,
          dailyGamesPlayed: (user.stats.dailyGamesPlayed || 0) + 1,
          lastPlayedDate: today
        }
      };
      setUser(updatedUser);
      localStorage.setItem(`ilce_bulmaca_user_${user.email}`, JSON.stringify(updatedUser));

      const newEntry: HighScore = {
        score: newCumulativeScore, 
        date: Date.now(),
        name: user.name,
        correct: 0 
      };

      setHighScores(prev => {
        const filtered = prev.filter(p => p.name !== user.name);
        const newScores = [...filtered, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
        localStorage.setItem(MAX_SCORE_KEY, JSON.stringify(newScores));
        return newScores;
      });
    }
  };

  const generateQuestion = () => {
    const randomIdx = Math.floor(Math.random() * DISTRICT_DATABASE.length);
    const item = DISTRICT_DATABASE[randomIdx];
    
    const options = new Set<string>();
    options.add(item.province);
    while (options.size < 4) {
      const randomOpt = DISTRICT_DATABASE[Math.floor(Math.random() * DISTRICT_DATABASE.length)].province;
      options.add(randomOpt);
    }

    setQuestion({
      district: item.district,
      province: item.province,
      wrong_answers: [],
      options: Array.from(options).sort(() => Math.random() - 0.5),
      mapShapeIndex: Math.floor(Math.random() * 1000)
    });
    
    setSelectedAnswer(null);
    setCorrectAnswer(null);
  };

  const handleStartGame = () => {
    if (!user) return;
    // Check credit based on latest user state
    if ((user.stats.dailyGamesPlayed || 0) >= 2) return;

    setScore(0);
    scoreRef.current = 0; // Reset ref
    setTimeLeft(60);
    setTotalAttempts(0);
    generateQuestion();
    setGameState(GameState.PLAYING);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return; 
    
    setTotalAttempts(prev => prev + 1);
    soundManager.playClick();
    setSelectedAnswer(answer);

    if (question && answer === question.province) {
      soundManager.playCorrect();
      // Update both state and ref
      setScore(s => s + 100);
      scoreRef.current += 100; 

      setCorrectAnswer(answer); 
      setTimeout(() => {
          generateQuestion();
      }, 600);
    } else {
      soundManager.playWrong();
      setCorrectAnswer(question!.province); 
      setTimeout(() => {
          generateQuestion();
      }, 1200);
    }
  };

  const handleSkip = () => {
    setTotalAttempts(prev => prev + 1);
    soundManager.playClick();
    generateQuestion();
  };

  const handleGoogleLogin = () => {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        alert("Google servisi yüklenemedi. Sayfayı yenilemeyi dene.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setGameState(GameState.START);
  };

  // --- Screens ---

  if (gameState === GameState.START) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-y-auto font-sans text-gray-800">
        <ModernBackground />
        
        <div className="mb-6 mt-10 animate-bounce relative z-10">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-[#E30A17] drop-shadow-2xl">
             <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
           </svg>
           <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-[100%] blur-sm animate-pulse"></div>
        </div>

        <h1 className="text-5xl text-gray-800 mb-2 relative z-10 tracking-tight lowercase" style={{ fontFamily: "'Righteous', cursive" }}>
            {APP_TITLE}
        </h1>
        <p className="text-gray-500 mb-10 text-sm tracking-widest lowercase relative z-10 font-bold">
            81 il, 922 ilçe, tek şampiyon
        </p>

        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 border border-gray-100">
            <div className="mb-8 text-center">
                <h2 className="text-xl font-bold text-gray-800 lowercase border-b-2 border-red-500 inline-block pb-1">oyuncu girişi</h2>
            </div>
            
            <button 
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>google ile bağlan</span>
            </button>
            
            <div className="mt-6 text-center">
