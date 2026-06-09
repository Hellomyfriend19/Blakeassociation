import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const SENTENCES = [
  { text: 'You need a favor, you ask for it.', longPause: true },
  { text: 'Share info, get info.', longPause: false },
];

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

interface WordSpan {
  word: string;
  id: number;
  state: 'hidden' | 'visible' | 'exiting';
}

export const Login: React.FC = () => {
  const navigate = useNavigate();

  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  const [wordSpans, setWordSpans] = useState<WordSpan[]>([]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cyclingRef = useRef(true);
  const counterRef = useRef(0);

  const animateIn = useCallback(async (words: string[], stagger: number) => {
    const base = counterRef.current;
    const spans: WordSpan[] = words.map((w, i) => ({
      word: w,
      id: base + i,
      state: 'hidden',
    }));
    counterRef.current += words.length;
    setWordSpans(spans);
    await wait(30);
    for (let i = 0; i < spans.length; i++) {
      if (!cyclingRef.current) return;
      await wait(i === 0 ? 0 : stagger);
      setWordSpans(prev =>
        prev.map(s => (s.id === base + i ? { ...s, state: 'visible' } : s))
      );
    }
    await wait(500);
  }, []);

  const animateOut = useCallback(async (stagger: number) => {
    setWordSpans(prev => {
      const reversed = [...prev].reverse();
      return prev.map(s => s);
      // trigger below
    });
    // get current spans in reverse
    setWordSpans(prev => {
      const ids = [...prev].reverse().map(s => s.id);
      // schedule staggered exits
      ids.forEach((id, i) => {
        setTimeout(() => {
          setWordSpans(p =>
            p.map(s => (s.id === id ? { ...s, state: 'exiting' } : s))
          );
        }, i * stagger);
      });
      return prev;
    });
    // wait for all to exit
    const totalWait = wordSpans.length * stagger + 480;
    await wait(totalWait);
  }, [wordSpans.length]);

  useEffect(() => {
    let alive = true;
    cyclingRef.current = true;

    async function run() {
      await wait(600);
      if (!alive) return;
      setBtnVisible(true);

      while (cyclingRef.current && alive) {
        for (const { text, longPause } of SENTENCES) {
          if (!cyclingRef.current || !alive) return;
          const words = splitWords(text);
          const inStagger = longPause ? 140 : 100;
          const outStagger = longPause ? 100 : 70;

          await animateIn(words, inStagger);
          if (!cyclingRef.current || !alive) return;
          await wait(longPause ? 2400 : 1400);
          if (!cyclingRef.current || !alive) return;
          await animateOut(outStagger);
          await wait(500);
        }
      }
    }

    run();
    return () => { alive = false; cyclingRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignIn = () => {
    cyclingRef.current = false;
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
      setShowLogin(true);
    }, 700);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (usePin) {
        await AuthService.login(username, undefined, pin);
      } else {
        await AuthService.login(username, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Blue ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,80,200,0.18) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,40,0.65) 100%)' }}
      />

      {/* ── INTRO SCREEN ── */}
      {showIntro && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
          style={{ opacity: introFading ? 0 : 1 }}
        >
          {/* Cycling sentence */}
          <div
            className="flex flex-wrap justify-center relative z-10"
            style={{ gap: '0 10px', maxWidth: 560, lineHeight: 1.4 }}
          >
            {wordSpans.map(({ word, id, state }) => (
              <span
                key={id}
                style={{
                  display: 'inline-block',
                  fontFamily: 'Georgia, serif',
                  fontSize: 26,
                  fontWeight: 300,
                  color: '#c8d8ff',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  opacity: state === 'visible' ? 1 : 0,
                  transform: state === 'visible' ? 'translateY(0px)' : 'translateY(20px)',
                  filter: state === 'visible' ? 'blur(0px)' : 'blur(8px)',
                  transition: state === 'exiting'
                    ? 'opacity 380ms ease, transform 380ms ease, filter 380ms ease'
                    : 'opacity 500ms ease, transform 500ms ease, filter 500ms ease',
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Sign in button */}
          <button
            onClick={handleSignIn}
            className="absolute bottom-12 z-10"
            style={{
              background: 'transparent',
              border: '1px solid rgba(100,140,255,0.4)',
              color: 'rgba(180,200,255,0.7)',
              fontFamily: 'Georgia, serif',
              fontSize: 13,
              letterSpacing: '0.2em',
              padding: '10px 32px',
              cursor: 'pointer',
              borderRadius: 2,
              textTransform: 'uppercase',
              opacity: btnVisible ? 1 : 0,
              pointerEvents: btnVisible ? 'all' : 'none',
              transition: 'opacity 0.6s ease, border-color 0.3s, color 0.3s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(100,140,255,0.9)';
              (e.target as HTMLButtonElement).style.color = 'rgba(200,220,255,1)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(100,140,255,0.4)';
              (e.target as HTMLButtonElement).style.color = 'rgba(180,200,255,0.7)';
            }}
          >
            Sign in
          </button>
        </div>
      )}

      {/* ── LOGIN FORM ── */}
      {showLogin && (
        <div
          className="w-full max-w-md relative z-10"
          style={{
            animation: 'fadeInUp 0.7s ease forwards',
          }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(16px); filter: blur(6px); }
              to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
            }
          `}</style>

          <div
            className="p-8 relative"
            style={{
              border: '1px solid rgba(80,110,220,0.3)',
              background: 'rgba(0,0,10,0.6)',
            }}
          >
            {/* Top glow accent */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,60,180,0.12) 0%, transparent 60%)' }}
            />

            <div className="flex justify-center mb-8">
              <div
                className="h-10 w-10 flex items-center justify-center"
                style={{ border: '1px solid rgba(100,140,255,0.4)' }}
              >
                <Shield className="text-blue-300" size={18} />
              </div>
            </div>

            <h2
              className="text-center mb-1"
              style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 20, color: '#c8d8ff', letterSpacing: '0.04em' }}
            >
              Blake Association
            </h2>
            <p
              className="text-center mb-8 font-mono"
              style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(120,150,220,0.6)', textTransform: 'uppercase' }}
            >
              Secure Access Terminal
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter ID"
                className="bg-gray-900 border-gray-700 text-white"
              />

              {usePin ? (
                <Input
                  label="4-Digit PIN"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••"
                  className="tracking-widest bg-gray-900 border-gray-700 text-white"
                />
              ) : (
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setUsePin(!usePin)}
                  className="text-gray-500 hover:text-gray-300 transition-colors underline"
                >
                  {usePin ? 'Use Password' : 'Use Quick PIN'}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-gray-200"
                isLoading={isLoading}
              >
                {usePin ? 'Verify PIN' : 'Authenticate'}
              </Button>
            </form>

            <div className="mt-8 text-center" style={{ fontSize: 11, color: 'rgba(100,130,200,0.5)' }}>
              <span className="mr-2">Restricted Access.</span>
              <Link to="/register" className="text-gray-500 hover:text-gray-300">Request Invite (Register)</Link>
              <div className="mt-2">
                <Link to="/terms" className="text-gray-600 hover:text-gray-400 underline">Terms & Conditions</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
