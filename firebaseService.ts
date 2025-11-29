// firebaseService.ts
import { initializeApp } from "firebase/app";
// Bak buraya 'getCountFromServer' eklendi:
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, orderBy, limit, getDocs, getCountFromServer } from "firebase/firestore";
import { User, HighScore } from './types';


// Config artık ortam değişkenlerinden geliyor:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Fonksiyonlar ---

// Kullanıcıyı getir veya oluştur
export const getOrCreateUser = async (email: string, name: string): Promise<User> => {
  const userRef = doc(db, "users", email);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data() as User;
    // Günlük sıfırlama kontrolü burada da olsun (Client tarafında da var ama yedek)
    const today = new Date().toISOString().split('T')[0];
    if (userData.stats.lastPlayedDate !== today) {
        await updateDoc(userRef, {
            "stats.dailyGamesPlayed": 0,
            "stats.dailyScore": 0,
            "stats.lastPlayedDate": today
        });
        userData.stats.dailyGamesPlayed = 0;
        userData.stats.dailyScore = 0;
        userData.stats.lastPlayedDate = today;
    }
    return userData;
  } else {
    // Yeni kullanıcı oluştur
    const newUser: User = {
      email,
      name,
      isAdmin: false,
      playHistory: [],
      gameHistory: [],
      stats: {
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
      }
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
};

// Kullanıcıyı güncelle (Puan ekle)
export const updateUserStats = async (user: User) => {
  const userRef = doc(db, "users", user.email);
  await setDoc(userRef, user, { merge: true }); // merge: true ile sadece değişenleri güncelleriz ama full user atmak daha güvenli şimdilik
};

// Liderlik tablosunu getir (En yüksek 10 kümülatif puan)
export const getHighScores = async (): Promise<HighScore[]> => {
  const usersRef = collection(db, "users");
  // Kümülatif skora göre azalan sırala, ilk 10'u al
  const q = query(usersRef, orderBy("stats.cumulativeScore", "desc"), limit(20));
  
  const querySnapshot = await getDocs(q);
  const scores: HighScore[] = [];
  
  querySnapshot.forEach((doc) => {
    const data = doc.data() as User;
    // Sadece puanı 0'dan büyük olanları listeye alalım
    if (data.stats.cumulativeScore > 0) {
        scores.push({
          score: data.stats.cumulativeScore,
          date: Date.now(), // Tarih şu anlık temsili
          name: data.name,
          correct: 0
        });
    }
  });
  
  return scores;
};


// Toplam Oyuncu Sayısını Getir
export const getTotalUserCount = async (): Promise<number> => {
  const usersRef = collection(db, "users");
  const snapshot = await getCountFromServer(usersRef);
  return snapshot.data().count;
};
