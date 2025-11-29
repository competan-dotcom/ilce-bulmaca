import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
// import { GoogleGenAI } from "@google/genai"; 
import { 
  Question, 
  GameState, 
  User, 
  HighScore 
} from './types';
import { APP_TITLE, DISTRICT_DATABASE, MAX_SCORE_KEY, GOOGLE_CLIENT_ID } from './constants';
// Firebase servislerini import ediyoruz
import { getOrCreateUser, updateUserStats, getHighScores, getTotalUserCount } from './firebaseService';

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

// GÜNCELLENMİŞ ARKA PLAN: Izgara yok, temiz ve modern geçişli renkler.
const ModernBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-gray-50 overflow-hidden">
    {/* Hafif Gradient Geçiş */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-red-50 opacity-80"></div>
    
    {/* Dekoratif Bulanık Toplar - Daha yumuşak */}
    <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-blue-100 opacity-40 blur-[120px]"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-red-100 opacity-40 blur-[120px]"></div>
  </div>
);

// MODERN FOOTER: Ortalanmış, İçeriğe Yakınlaştırılmış
const Footer = ({ onClick }: { onClick?: () => void }) => (
  <div className="w-full py-6 flex justify-center items-center gap-6 relative z-50 mt-10 select-none">
    
    {/* Sol Taraf: Ana Sayfa Butonu (Varsa gösterilir) */}
    {onClick && (
      <button 
        onClick={onClick} 
        className="text-gray-500 hover:text-red-600 transition-colors text-xs font-bold tracking-widest uppercase flex items-center gap-2"
      >
        <span>←</span> ANA SAYFA
      </button>
    )}

    {/* Ortada Ayırıcı Çizgi (Sadece buton varsa görünür) */}
    {onClick && <div className="w-px h-3 bg-gray-300"></div>}

    {/* Sağ Taraf: İmza (Marka Fontuyla) */}
    <div 
      className="text-gray-400 text-xs tracking-widest" 
      style={{ fontFamily: "'Righteous', cursive" }}
    >
      Z_BILGIN 2025
    </div>

  </div>
);

const generateJaggedPath = (seed: number) => {
    const random = (x: number) => {
        const n = Math.sin(seed + x) * 10000;
        return n - Math.floor(n);
    };

    let points = [];
    const numPoints = 12 + Math.floor(random(0) * 8);
    const centerX = 100;
    const centerY = 50;
    const radiusX = 80;
    const radiusY = 30;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const rVar = 0.7 + random(i) * 0.6;
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
      <div className="bg-[#0057D9] rounded-lg shadow-xl border-[3px] border-white relative overflow-hidden px-4 min-h-[140px] flex flex-col items-center pt-3 pb-2">
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center"><div className="w-full h-[1px] bg-gray-400 transform rotate-45"></div></div>
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center"><div className="w-full h-[1px] bg-gray-400 transform -rotate-45"></div></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center"><div className="w-full h-[1px] bg-gray-400 transform rotate-12"></div></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gray-200 border border-gray-400 shadow-inner flex items-center justify-center"><div className="w-full h-[1px] bg-gray-400 transform -rotate-12"></div></div>

        <h2 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-md text-center leading-tight z-20">
          {district}
        </h2>
        <div className="w-3/4 h-1 bg-white mt-1 mb-1 rounded-full shadow-sm z-20"></div>
        <div className="flex items-center justify-center opacity-20 z-0 pointer-events-none mt-1">
             <svg width="140" height="50" viewBox="0 0 200 100">
                <path d={pathData} fill="white" stroke="none" />
             </svg>
        </div>
      </div>
      <div className="w-4 h-12 bg-gray-400 mx-auto -mt-1 relative z-0 shadow-inner rounded-b-full"></div>
      <div className="w-24 h-4 bg-black/10 mx-auto rounded-[100%] blur-sm -mt-2"></div>
    </div>
  );
};



const HighScoreList = ({ scores, currentScore, totalPlayers }: { scores: HighScore[], currentScore?: number, totalPlayers?: number }) => {
  
  // İsim Formatlama Fonksiyonu
  const formatName = (fullName: string) => {
    if (!fullName) return "İsimsiz";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].toLocaleUpperCase('tr-TR');
    const lastName = parts.pop(); 
    const firstName = parts.join(' ');
    return `${firstName.toLocaleUpperCase('tr-TR')} ${lastName?.charAt(0).toLocaleUpperCase('tr-TR')}.`;
  };

  const displayCount = totalPlayers || scores.length;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 w-full max-w-sm mx-auto flex flex-col max-h-[60vh]">
      {/* BAŞLIK GÜNCELLENDİ: İLK 20 YAPILDI */}
      <h3 className="text-sm font-bold text-gray-500 tracking-tight mb-3 text-center border-b border-gray-100 pb-2 flex justify-center items-center gap-2 whitespace-nowrap flex-shrink-0">
        <span className="uppercase">PUAN DURUMU (İLK 20)</span>
        <span className="text-gray-400 font-normal normal-case text-xs">
          (Toplam: {displayCount})
        </span>
      </h3>
      
      {/* LİSTE İÇERİĞİ: Scroll (Kaydırma) özelliği eklendi */}
      <div className="overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {scores.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4 italic">
            Henüz şampiyon yok. İlk sen ol!
          </div>
        ) : (
          scores.map((score, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg text-sm bg-gray-50 mr-1">
              <div className="flex items-center gap-3">
                <span className={`
                  w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs flex-shrink-0
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-gray-200 text-gray-700' : 
                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500 border border-gray-200'}
                `}>
                  {index + 1}
                </span>
                <span className="font-semibold text-gray-700 truncate max-w-[140px]">
                  {formatName(score.name)}
                </span>
              </div>
              <div className="font-mono font-bold text-blue-600">
                {score.score}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};




// --- Main App Logic ---

const App = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); 
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

// --- YENİ: Firebase'den Liderlik Tablosunu ve Sayıyı Çek ---
  useEffect(() => {
    const fetchScores = async () => {
        try {
            const scores = await getHighScores();
            setHighScores(scores);
            
            // Toplam sayıyı çek
            const count = await getTotalUserCount();
            setTotalUserCount(count);
        } catch (error) {
            console.error("Skorlar çekilemedi:", error);
        }
    };
    fetchScores();
  }, [gameState]);






// Initialize Google OAuth Client (Beklemeli Versiyon)
  useEffect(() => {
    const initializeGoogle = () => {
      // Google scripti ve accounts modülü yüklenmiş mi kontrol et
      if (typeof window !== 'undefined' && window.google && window.google.accounts) {
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
                   
                   // --- YENİ: Firebase'den Kullanıcıyı Getir/Oluştur ---
                   const appUser = await getOrCreateUser(profile.email, profile.name || "İsimsiz Oyuncu");
                   
                   setUser(appUser);
                   setGameState(GameState.LOBBY);

               } catch (error) {
                   console.error("Giriş hatası:", error);
                   alert("Giriş yapılırken bir hata oluştu.");
               }
            }
          },
        });
        setTokenClient(client);
        return true; // Başarıyla yüklendi
      }
      return false; // Henüz yüklenmedi
    };

    // İlk yüklemede kontrol et, yoksa gelene kadar zamanlayıcı kur
    if (!initializeGoogle()) {
      const intervalId = setInterval(() => {
        if (initializeGoogle()) {
          clearInterval(intervalId); // Yüklendiğinde zamanlayıcıyı durdur
        }
      }, 100); // 100ms'de bir kontrol et
      return () => clearInterval(intervalId);
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



// GÜNCELLENMİŞ: Sadece puanı kaydeder (Oyun sayısı girişte artırılmıştı)
  const handleSessionOver = async () => {
    setGameState(GameState.SESSION_OVER);
    
    if (user) {
        const finalSessionScore = scoreRef.current; 
        const today = new Date().toISOString().split('T')[0];
        
        // Yeni verileri hazırla
        const newDailyScore = (user.stats.dailyScore || 0) + finalSessionScore;
        const newCumulativeScore = (user.stats.cumulativeScore || 0) + finalSessionScore;
        
        // DİKKAT: newGamesPlayed hesaplamasını kaldırdık çünkü girişte artırmıştık.
        // Mevcut user state'indeki dailyGamesPlayed zaten güncel.

        const updatedUser = {
            ...user,
            stats: {
                ...user.stats,
                dailyScore: newDailyScore,
                cumulativeScore: newCumulativeScore,
                // dailyGamesPlayed'i değiştirmiyoruz, olduğu gibi kalıyor
                lastPlayedDate: today
            }
        };

        setUser(updatedUser);

        try {
            await updateUserStats(updatedUser);
            const scores = await getHighScores();
            setHighScores(scores);
        } catch (error) {
            console.error("Puan kaydedilemedi:", error);
        }
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

// GÜNCELLENMİŞ: Oyuna başlarken hakkı hemen düşer.
  const handleStartGame = async () => {
    if (!user) return;
    if ((user.stats.dailyGamesPlayed || 0) >= 2) return;

    // 1. Önce kullanıcının hakkını düşürelim (Local State)
    const updatedUser = {
      ...user,
      stats: {
        ...user.stats,
        dailyGamesPlayed: (user.stats.dailyGamesPlayed || 0) + 1
      }
    };
    setUser(updatedUser);

    // 2. Firebase'e bu değişikliği hemen yazalım (Kaçakları önlemek için)
    try {
      updateUserStats(updatedUser).catch(err => console.error("Hak düşülemedi:", err));
    } catch (error) {
      console.error("Firebase hatası:", error);
    }

    // 3. Oyunu başlatalım
    setScore(0);
    scoreRef.current = 0; 
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
                <p className="text-xs text-gray-400">
                    sadece Google hesabınla oyuna giriş yapabilirsin.
                </p>
            </div>
        </div>
        
        <Footer onClick={handleLogout} />
      </div>
    );
  }

  if (gameState === GameState.LOBBY) {
    const gamesLeft = Math.max(0, 2 - (user?.stats.dailyGamesPlayed || 0));
    const canPlay = gamesLeft > 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        <ModernBackground />
        
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl w-full max-w-md relative z-10 text-center border border-white">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Hoş geldin, {user?.name}</h2>
            <p className="text-gray-500 text-sm">60 saniyede maksimum doğru cevabı hedefle!</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8">
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <div className="text-xs text-gray-400 font-bold mb-1">Kredi</div>
                <div className={`text-2xl font-black ${gamesLeft === 0 ? 'text-red-500' : 'text-blue-600'}`}>{gamesLeft}/2</div>
            </div>
            <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
                <div className="text-xs text-gray-400 font-bold mb-1">Günlük</div>
                <div className="text-2xl font-black text-green-600">{user?.stats.dailyScore || 0}</div>
            </div>
             <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
                <div className="text-xs text-gray-400 font-bold mb-1">Toplam</div>
                <div className="text-2xl font-black text-purple-600">{user?.stats.cumulativeScore || 0}</div>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={!canPlay}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 mb-6
              transition-all duration-200 transform hover:-translate-y-1
              ${canPlay 
                ? 'bg-gradient-to-r from-[#E30A17] to-red-600 text-white hover:shadow-red-200' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {canPlay ? (
                <>
                 <GamepadIcon />
                 Oyuna Başla
                </>
            ) : (
                '[ 2 ] hakkın doldu. Yarın yine gel!'
            )}
          </button>
          
          <HighScoreList 
    scores={highScores} 
    currentScore={user?.stats.cumulativeScore} 
    totalPlayers={totalUserCount} 
/>
        </div>
        <Footer onClick={handleLogout} />
      </div>
    );
  }

  if (gameState === GameState.PLAYING) {
    const timerColor = timeLeft > 30 ? 'text-green-500' : timeLeft > 10 ? 'text-orange-500' : 'text-red-500 animate-pulse';
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        <ModernBackground />
        
        <div className="w-full max-w-lg grid grid-cols-3 items-center mb-8 relative z-20 bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/50 shadow-sm">
            <div className="flex items-center gap-2">
                <UserIcon />
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-800 text-sm truncate">{user?.name}</span>
                </div>
            </div>

            <div className="flex justify-center">
                 <div className={`text-4xl font-black ${timerColor} tabular-nums tracking-tighter drop-shadow-sm`}>
                    {timeLeft}
                 </div>
            </div>

            <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PUAN</span>
                <span className="text-2xl font-black text-gray-800 leading-none tabular-nums">{score}</span>
                <span className="text-xs font-bold text-gray-400 tabular-nums">
                    ({score / 100}/{totalAttempts})
                </span>
            </div>
        </div>

        <div className="w-full flex flex-col items-center justify-center max-w-lg relative z-10">
            {question && (
                <>
                    <Tabela district={question.district} mapShapeIndex={question.mapShapeIndex} />

                    <div className="mt-8 mb-4 text-center">
                        <h3 className="text-gray-500 font-bold text-sm tracking-widest uppercase">Hangi İlimize Bağlıdır?</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-full">
                        {question.options.map((opt, idx) => {
                            let btnClass = "bg-white text-gray-700 hover:bg-gray-50 border-gray-200";
                            
                            if (selectedAnswer === opt) {
                                if (opt === question.province) {
                                    btnClass = "bg-green-500 text-white border-green-600 shadow-green-200 ring-2 ring-green-300";
                                } else {
                                    btnClass = "bg-red-500 text-white border-red-600 shadow-red-200 ring-2 ring-red-300 shake";
                                }
                            } else if (selectedAnswer && opt === question.province) {
                                btnClass = "bg-green-100 text-green-700 border-green-300 ring-2 ring-green-200";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(opt)}
                                    disabled={selectedAnswer !== null}
                                    className={`
                                        w-full py-4 rounded-xl font-bold text-lg shadow-sm border-b-4 transition-all duration-100
                                        active:border-b-0 active:translate-y-1
                                        ${btnClass}
                                    `}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button 
                        onClick={handleSkip}
                        className="mt-1.5 mb-4 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors flex items-center gap-1"
                    >
                        &gt; bu soruyu pas geç
                    </button>
                </>
            )}
        </div>
        
        <Footer onClick={handleLogout} />
      </div>
    );
  }

  if (gameState === GameState.SESSION_OVER) {
    let message = "Canın Sağolsun";
    let icon = "👏";
    if (score > 1500) { message = "Efsane!"; icon = "🏆"; }
    else if (score >= 500) { message = "Harika!"; icon = "🌟"; }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-y-auto">
        <ModernBackground />
        
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center w-full max-w-sm relative z-10 animate-scale-in border border-gray-100">
            <div className="text-6xl mb-4 animate-bounce-short">{icon}</div>
            <h2 className="text-3xl font-black text-gray-800 mb-1">{message}</h2>
            <p className="text-gray-500 mb-8">Oyun tamamlandı</p>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">BU OYUN SKORUN</div>
                <div className="text-5xl font-black text-blue-600 tracking-tighter">{score}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-gray-50 p-3 rounded-xl">
                    <div className="text-xs text-gray-400">Doğru</div>
                    <div className="font-bold text-green-600 text-xl">{score / 100}</div>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-xl">
                    <div className="text-xs text-gray-400">Günlük Toplam</div>
                    <div className="font-bold text-gray-700 text-xl">{user?.stats.dailyScore || 0}</div>
                 </div>
            </div>

            <button 
                onClick={() => setGameState(GameState.LOBBY)}
                className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-700 transition-all hover:-translate-y-1 mb-3"
            >
                DEVAM ET
            </button>

            <button 
                onClick={handleLogout}
                className="w-full bg-white text-gray-500 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
                Ana Sayfaya Dön
            </button>
        </div>
        <Footer onClick={handleLogout} />
      </div>
    );
  }

  return null;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
