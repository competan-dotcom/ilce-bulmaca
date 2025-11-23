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
import { getOrCreateUser, updateUserStats, getHighScores } from './firebaseService';

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

// GÜNCELLENMİŞ FOOTER: Sola yaslı 'Ana Sayfa', Sağa yaslı İmza, Siyah Renk.
const Footer = ({ onClick }: { onClick?: () => void }) => (
  <div className="w-full max-w-lg mx-auto mt-8 py-4 flex justify-between items-center relative z-50 text-black text-xs font-bold tracking-widest uppercase select-none px-4">
    {/* Sol Taraf: Ana Sayfa Butonu (Tıklanabilirse göster) */}
    <div>
      {onClick ? (
        <button 
          onClick={onClick} 
          className="hover:opacity-60 transition-opacity flex items-center gap-1"
        >
          <span>←</span> ANA SAYFA
        </button>
      ) : (
        /* Tıklama yoksa boşluk bırak ki hizalama bozulmasın */
        <span className="opacity-0">.</span>
      )}
    </div>

    {/* Sağ Taraf: İmza */}
    <div>
      Z_BILGIN 2025
    </div>
  </div>
);


const generateJaggedPath = (seed: number) => {
    const random = (x: number
