import React, { useState, useEffect, useRef } from 'react';
import { PATIENT_POOL } from './patients.js';
import { AudioSys } from './audio.js';
import { TrophySys, TROPHIES } from './trophies.js';

// --- CONFIGURACIÓN ---
const GAME_DURATION = 180; // 3 Minutos
const MAX_BEDS_UCE = 3;
const MAX_BEDS_OBS = 4;

// --- HELPERS PERSISTENCIA ---
const getHighScore = () => parseInt(localStorage.getItem('triage_highscore') || '0');
const saveHighScore = (score) => {
    const current = getHighScore();
    if (score > current) {
        localStorage.setItem('triage_highscore', score.toString());
        return true;
    }
    return false;
};

// --- COMPONENTS UTILS ---
const ElectricBorder = ({ color = "#5227FF", speed = 1, chaos = 0.12, borderRadius = 24, children, className = "" }) => {
    return (
        <div className={`relative isolate ${className}`} style={{ borderRadius }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius }}>
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <rect
                        x="0" y="0" width="100%" height="100%"
                        rx={borderRadius} ry={borderRadius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="2"
                        strokeDasharray="100 200"
                        strokeLinecap="round"
                    >
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 50 50"
                            to="360 50 50"
                            dur={`${10 / speed}s`}
                            repeatCount="indefinite"
                        />
                        <animate
                            attributeName="stroke-dashoffset"
                            values="0;1000"
                            dur={`${5 / speed}s`}
                            repeatCount="indefinite"
                        />
                    </rect>
                </svg>
                <div className="absolute inset-0 opacity-20" style={{
                    background: `radial-gradient(circle at 50% 50%, ${color}, transparent 70%)`
                }}></div>
            </div>
            {children}
        </div>
    );
};

// --- ICONOS SVG (Lucide Style) ---
const Icons = {
    Siren: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H7v-6Z" /><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5v-2Z" /><path d="M21 12h1" /><path d="M18.5 4.5 18 5" /><path d="M2 12h1" /><path d="M12 2v1" /><path d="m4.929 4.929.707.707" /><path d="M12 12v6" /></svg>,
    Bed: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
    Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Supervisor: () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48"><circle cx="12" cy="12" r="10" /><path d="M7 15.5c.5.5 1.5.5 2 0" /><path d="M15 15.5c.5.5 1.5.5 2 0" /><path d="M10 10h.01" /><path d="M14 10h.01" /><path d="M8 18h8" /></svg>
};

// --- FORMATO DE CASO CLÍNICO ---
// {
//   id: number,            // ID único en el pool (estable)
//   name: string,          // Nombre del paciente
//   age: number,           // Edad en años
//   complaint: string,     // Motivo de consulta (texto corto)
//   vitals: string,        // Signos vitales / datos clave
//   diagnosis: string,     // Diagnóstico sugerido
//   triaje: "UCE" | "OBS" | "ALTA", // Destino clínico correcto
//   sprite: string         // Emoji o icono corto
// }

const validatePatientPool = (pool) => {
    const seenIds = new Set();
    const required = ["id", "name", "age", "complaint", "vitals", "diagnosis", "triaje", "sprite"];

    pool.forEach((patient) => {
        const missing = required.filter((key) => patient[key] === undefined);
        if (missing.length) {
            console.warn("Paciente con campos faltantes:", patient, "faltan:", missing);
        }
        if (seenIds.has(patient.id)) {
            console.warn("ID duplicado en PATIENT_POOL:", patient.id, patient);
        }
        seenIds.add(patient.id);
    });
};

validatePatientPool(PATIENT_POOL);

// --- HELPERS ---
const createPatient = (template) => ({
    ...template,
    uniqueId: `${template.id}-${Date.now()}-${Math.random()}`
});

const shuffleArray = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const createDeck = () => shuffleArray(PATIENT_POOL);

const extractClinicalClues = (patient) => {
    if (!patient) return [];
    const clues = [];
    const complaint = patient.complaint.toLowerCase();
    const vitals = patient.vitals.toLowerCase();

    if (vitals.includes("glasgow") || vitals.includes("somnol")) clues.push("Compromiso del estado de conciencia.");
    if (vitals.includes("sato2") || vitals.includes("bradipnea") || vitals.includes("hipox")) clues.push("Posible compromiso respiratorio.");
    if (vitals.match(/3[89][.,]?\d*\s*°?c/i) || vitals.includes("temp") || vitals.includes("fiebre")) clues.push("Fiebre/posible causa médica.");
    if (vitals.match(/(?:85|90)\/\d{2,3}/) || vitals.includes("hipotens")) clues.push("Inestabilidad hemodinámica.");
    if (vitals.includes("hipogluc")) clues.push("Hipoglucemia: corregir urgente.");
    if (complaint.includes("suicid") || complaint.includes("infantic")) clues.push("Riesgo autolesivo/heteroagresivo.");
    if (complaint.includes("dolor pecho") || vitals.includes("dolor pecho")) clues.push("Dolor torácico: descartar causa orgánica.");
    if (complaint.includes("agresiv") || vitals.includes("amenaz")) clues.push("Riesgo de agitación/agresión.");

    if (clues.length === 0) {
        clues.push("Sin signos de alarma evidentes; prioriza contención y seguimiento.");
    }

    return clues.slice(0, 3);
};

const getTeachingTip = (patient) => {
    if (!patient) return "";
    if (patient.triaje === "UCE") {
        return "UCE se reserva para compromiso vital, alteración de conciencia o riesgo médico agudo.";
    }
    if (patient.triaje === "OBS") {
        return "OBS requiere vigilancia, contención y reevaluación antes de alta.";
    }
    return "Alta con plan de seguridad, educación y seguimiento ambulatorio.";
};

// --- COMPONENTES ---

const Bed = ({ type, patient, onClear, id, active = true }) => {
    const [progress, setProgress] = useState(0);

    // Reiniciar la barra solo cuando cambia el paciente (no al pausar/reanudar)
    useEffect(() => {
        setProgress(0);
    }, [patient]);

    useEffect(() => {
        if (!patient || !active) return;
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) return 100;
                const speed = type === 'UCE' ? 2 : 5;
                return Math.min(100, p + speed);
            });
        }, 500);
        return () => clearInterval(interval);
    }, [patient, active, type]);

    const isDone = progress >= 100;
    const barColor = type === 'UCE' ? 'bg-red-500' : 'bg-amber-400';
    const borderColor = type === 'UCE' ? 'border-red-500/30' : 'border-amber-400/30';

    return (
        <div className={`relative p-3 rounded-xl border h-28 flex flex-col items-center justify-center transition-all duration-300 ${patient ? 'bg-slate-800/80' : 'bg-slate-900/30 border-dashed border-slate-700'} ${borderColor}`}>
            <div className="absolute top-2 left-3 text-[10px] text-slate-500 font-black tracking-widest uppercase">{type}-{id + 1}</div>
            {patient ? (
                <>
                    <div className="text-3xl mb-1 filter drop-shadow animate-float">{patient.sprite}</div>
                    <div className="text-xs font-bold text-white mb-0.5 truncate w-full text-center">{patient.name}</div>
                    <div className="text-[10px] text-slate-400 mb-2 truncate w-full text-center px-2">{patient.diagnosis}</div>

                    {isDone ? (
                        <button onClick={() => { AudioSys.playSuccess(); onClear(id, type); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] py-1.5 rounded-lg font-bold animate-bounce shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1">
                            <Icons.Check /> ALTA
                        </button>
                    ) : (
                        <div className="w-full bg-slate-900/50 h-1.5 rounded-full overflow-hidden mt-auto border border-white/5">
                            <div className={`${barColor} h-full transition-all duration-300`} style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-slate-600/50 text-xs font-black tracking-widest">VACÍO</div>
            )}
        </div>
    );
};

const PatientCard = ({ patient }) => {
    // Determine card theme based on stats (just for visual flair)
    return (
        <ElectricBorder color="#2dd4bf" speed={1.5}>
            <div key={patient.uniqueId} className="bg-slate-900/90 text-slate-100 p-4 rounded-3xl w-full max-w-sm transform transition-all patient-enter shadow-2xl relative overflow-hidden group">
                {/* Holographic header effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 opacity-80"></div>
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all"></div>

                <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase border border-teal-500/30 px-2 py-0.5 rounded-full bg-teal-500/10">Paciente</span>
                            <span className="text-[10px] font-mono text-slate-500">ID: {patient.id.toString().padStart(4, '0')}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{patient.name}</h2>
                        <span className="text-xs text-slate-400 font-medium">{patient.age} años</span>
                    </div>
                    <div className="text-5xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500">{patient.sprite}</div>
                </div>

                <div className="space-y-3 mb-3 relative z-10">
                    <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                        <div className="text-[10px] text-red-400 font-bold uppercase mb-1 tracking-wider flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Motivo de Consulta
                        </div>
                        <p className="text-sm font-medium leading-normal text-red-100/90">"{patient.complaint}"</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 text-slate-300">
                        <span className="text-teal-400"><Icons.Activity /></span>
                        <span className="">{patient.vitals}</span>
                    </div>
                </div>

                <div className="text-[10px] text-center text-slate-500 uppercase tracking-[0.2em] font-bold animate-pulse">
                    Esperando Diagnóstico
                </div>
            </div>
        </ElectricBorder>
    );
};

const MainMenu = ({ onStart }) => {
    const [showTutorial, setShowTutorial] = useState(false);
    const [highScore, setHighScore] = useState(getHighScore());
    const [showTrophies, setShowTrophies] = useState(false);

    useEffect(() => {
        // Inicializar audio al primer toque
        const initAudio = () => AudioSys.init();
        window.addEventListener('click', initAudio, { once: true });

        // Auto-show tutorial if first time
        if (!localStorage.getItem('triage_tutorial_seen')) {
            setShowTutorial(true);
            localStorage.setItem('triage_tutorial_seen', 'true');
        }

        return () => window.removeEventListener('click', initAudio);
    }, []);

    const unlockedTrophies = TrophySys.getUnlocked();
    const allTrophies = TrophySys.getAll();

    if (showTutorial) {
        return (
            <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 border-2 border-teal-500 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in fade-in zoom-in duration-300">
                    <button onClick={() => { AudioSys.playClick(); setShowTutorial(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                    <h2 className="text-3xl font-bold text-teal-400 mb-6 hud-font">MANUAL DE GUARDIA 2.0</h2>

                    <div className="space-y-6 text-slate-200">
                        <section>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Icons.Siren /> TU MISIÓN</h3>
                            <p>Eres el jefe de guardia. Tienes 3 minutos para triar. ¡La velocidad y precisión te dan TIEMPO EXTRA!</p>
                        </section>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-red-900/30 p-4 rounded-xl border border-red-500/30">
                                <h4 className="font-bold text-red-400 mb-1">UCE (ROJO)</h4>
                                <p className="text-xs text-slate-300"> Riesgo vital inmediato. ¡Cuidado con los falsos psiquiátricos!</p>
                            </div>
                            <div className="bg-amber-900/30 p-4 rounded-xl border border-amber-500/30">
                                <h4 className="font-bold text-amber-400 mb-1">OBS (AMARILLO)</h4>
                                <p className="text-xs text-slate-300">Vigilancia. Pánico, Intoxicación leve.</p>
                            </div>
                            <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-500/30">
                                <h4 className="font-bold text-emerald-400 mb-1">ALTA (VERDE)</h4>
                                <p className="text-xs text-slate-300">Casa. Leve o crónico estable.</p>
                            </div>
                        </div>

                        <section className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                            <h3 className="font-bold text-purple-300 mb-2">🏆 PREMIOS Y SECRETOS</h3>
                            <p className="text-sm">Juega perfecto para desbloquear objetos legendarios como el <strong>DSM-5 de Oro</strong> o el <strong>Estetoscopio Pro</strong>.</p>
                        </section>

                        <button onClick={() => { AudioSys.playSuccess(); setShowTutorial(false); }} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl mt-4 animate-pulse">
                            ¡A LA GUARDIA!
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showTrophies) {
        return (
            <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 border-2 border-purple-500 rounded-2xl p-6 max-w-md w-full relative">
                    <button onClick={() => { AudioSys.playClick(); setShowTrophies(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                    <h2 className="text-2xl font-bold text-purple-400 mb-6 hud-font text-center">🏆 SALA DE TROFEOS</h2>
                    <div className="space-y-4">
                        {Object.values(allTrophies).map(t => {
                            const isUnlocked = unlockedTrophies.includes(t.id);
                            return (
                                <div key={t.id} className={`flex items-center gap-4 p-3 rounded-xl border ${isUnlocked ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-900 border-slate-700 opacity-50'}`}>
                                    <div className="text-3xl filter drop-shadow-lg">{isUnlocked ? t.icon : '🔒'}</div>
                                    <div>
                                        <div className={`font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{t.name}</div>
                                        <div className="text-[10px] text-slate-400">{t.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 p-4 game-background">
            <div className="relative z-10 flex flex-col items-center">
                <div className="text-8xl mb-6 filter drop-shadow-[0_0_25px_rgba(20,184,166,0.5)] animate-bounce">🚨</div>
                <h1 className="text-5xl md:text-8xl font-black text-white hud-font tracking-widest mb-4 text-center">
                    TRIAGE<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">TYCOON</span>
                </h1>

                {highScore > 0 && (
                    <div className="mb-6 flex gap-4">
                        <div className="bg-slate-900/60 px-6 py-2 rounded-full border border-amber-500/30 text-amber-400 font-mono text-sm tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            🏆 ELITE: ${highScore}
                        </div>
                    </div>
                )}

                <ElectricBorder color="#2dd4bf" speed={2} borderRadius={20} className="mt-4">
                    <button
                        onClick={() => { AudioSys.playSiren(); onStart(); }}
                        className="bg-slate-900/80 hover:bg-teal-900/50 text-white font-bold py-6 px-12 rounded-xl backdrop-blur-md transition-all hover:scale-105 group"
                    >
                        <span className="text-xl tracking-widest flex items-center gap-4 group-hover:text-teal-300 transition-colors">
                            <Icons.Siren /> INICIAR GUARDIA <Icons.Siren />
                        </span>
                    </button>
                </ElectricBorder>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={() => { AudioSys.playClick(); setShowTutorial(true); }}
                        className="text-slate-400 hover:text-white underline underline-offset-4 text-xs font-mono transition-colors"
                    >
                        [ MANUAL ]
                    </button>
                    <button
                        onClick={() => { AudioSys.playClick(); setShowTrophies(true); }}
                        className="text-purple-400 hover:text-purple-300 underline underline-offset-4 text-xs font-mono transition-colors"
                    >
                        [ TROFEOS ({unlockedTrophies.length}/{Object.keys(allTrophies).length}) ]
                    </button>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl w-full px-4">
                    <div className="glass p-4 rounded-xl text-center border-t-2 border-red-500">
                        <div className="text-red-400 font-bold mb-1">UCE (ROJO)</div>
                        <p className="text-[10px] text-slate-400">Peligro de muerte inminente. Prioridad máxima.</p>
                    </div>
                    <div className="glass p-4 rounded-xl text-center border-t-2 border-amber-500">
                        <div className="text-amber-400 font-bold mb-1">OBS (AMARILLO)</div>
                        <p className="text-[10px] text-slate-400">Requieren vigilancia o estabilización.</p>
                    </div>
                    <div className="glass p-4 rounded-xl text-center border-t-2 border-emerald-500">
                        <div className="text-emerald-400 font-bold mb-1">ALTA (VERDE)</div>
                        <p className="text-[10px] text-slate-400">Patología leve. Casa y cuidados.</p>
                    </div>
                </div>

                <div className="absolute bottom-4 text-[10px] text-slate-600 font-mono">
                    SYSTEM_READY // VER 3.0.0 GAMIFIED
                </div>
            </div>
        </div>
    );
};

const PauseMenu = ({ onResume, onRestart }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 text-center max-w-sm w-full shadow-2xl pop-in">
            <h2 className="text-3xl font-bold text-white mb-6 hud-font">PAUSA</h2>
            <div className="space-y-3">
                <button onClick={() => { AudioSys.playClick(); onResume(); }} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    CONTINUAR
                </button>
                <button onClick={() => { AudioSys.playClick(); onRestart(); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    REINICIAR NIVEL
                </button>
            </div>
        </div>
    </div>
);

const GameOver = ({ score, reason, onRetry, sessionTrophies = [] }) => {
    // Guardar el récord una sola vez al montar (no como efecto secundario del render)
    const [isNewRecord] = useState(() => saveHighScore(score));
    const trophyById = (id) => Object.values(TrophySys.getAll()).find(t => t.id === id);
    const unlocked = sessionTrophies;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-2xl border-4 border-red-500 text-center max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.5)] pop-in">
                <div className="text-6xl mb-4">🚨</div>
                <h2 className="text-3xl font-bold text-white mb-2 hud-font">GUARDIA TERMINADA</h2>
                <p className="text-red-400 mb-6 font-mono text-lg">{reason}</p>
                {/* Highscore alert */}
                <div className="bg-slate-900 p-6 rounded-lg mb-4 border border-slate-700 relative overflow-hidden">
                    {isNewRecord && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-1 rotate-12 translate-x-3 -translate-y-1 shadow-lg">NUEVO RÉCORD</div>
                    )}
                    <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Puntaje Final</div>
                    <div className="text-5xl font-black text-teal-400 tracking-tighter">$ {score}</div>
                </div>

                <div className="flex gap-2 mb-6 justify-center">
                    {unlocked.map(id => (
                        <div key={id} className="text-2xl" title={trophyById(id)?.name}>
                            {trophyById(id)?.icon || '🏆'}
                        </div>
                    ))}
                    {unlocked.length === 0 && <div className="text-xs text-slate-500 italic">Aún sin trofeos desbloqueados...</div>}
                </div>
                <button onClick={() => { AudioSys.playClick(); onRetry(); }} className="w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-xl hover:bg-slate-200 transition-transform hover:scale-105">
                    NUEVA GUARDIA
                </button>
            </div>
        </div>
    );
};

const GameHeader = ({ timeLeft, score, streak, pressure }) => (
    <div className="flex justify-between items-center mb-2 glass p-2 pr-20 sm:pr-24 rounded-xl z-10 gap-2">
        <div className="flex items-center gap-2">
            <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                <div className="w-5 h-5"><Icons.Siren /></div>
            </div>
            <div>
                <h1 className="text-lg font-black text-white hud-font tracking-widest uppercase flex items-center gap-2">
                    Triage Tycoon
                </h1>
                <div className="text-[10px] text-teal-500/80 font-mono tracking-widest uppercase">Guardia Nocturna</div>
            </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
            {/* Time */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${timeLeft < 30 ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-900/50 border-slate-700 text-slate-200'}`}>
                <div className="w-4 h-4"><Icons.Clock /></div>
                <span className="text-base font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 text-emerald-400">
                <span className="text-base">$</span>
                <span className="text-base font-bold">{score}</span>
            </div>

            {/* Streak */}
            {streak > 1 && (
                <div className="hidden sm:flex items-center gap-1 bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-500/40 text-orange-400">
                    <span className="text-base">🔥</span>
                    <span className="text-base font-bold">x{streak}</span>
                </div>
            )}

            {/* Scale hidden on small */}
            <div className="hidden sm:flex flex-col justify-center gap-1 px-2 min-w-[80px]">
                <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Presión</span>
                    <span className={`${pressure > 70 ? 'text-red-400' : 'text-emerald-400'}`}>{pressure}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pressure > 70 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pressure}%` }}></div>
                </div>
            </div>
        </div>
    </div>
);

const BedsColumn = ({ title, accent, beds, maxBeds, type, onClear, columns, active }) => (
    <div className={`glass p-4 rounded-2xl flex-1 flex flex-col relative overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${accent.bar} opacity-50`}></div>
        <div className="font-bold mb-4 flex justify-between items-center text-xs tracking-widest pl-1">
            <span className={`${accent.text} flex items-center gap-2`}>
                <div className={`w-2 h-2 rounded-full ${accent.bar} shadow-[0_0_8px_currentColor]`}></div>
                {title}
            </span>
            <span className="bg-slate-900/50 px-2 py-1 rounded text-slate-400 font-mono border border-white/5">{beds.filter(b => b).length}/{maxBeds}</span>
        </div>
        <div className={`grid ${columns} gap-3 overflow-y-auto pr-1 custom-scrollbar`}>
            {beds.map((p, i) => <Bed key={i} id={i} type={type} patient={p} onClear={onClear} active={active} />)}
        </div>
    </div>
);

const Supervisor = ({ feedback }) => {
    if (!feedback) return null;

    const isGood = feedback.type === 'success' || feedback.type === 'trophy';
    const isBad = feedback.type === 'error';
    // Colores base para el supervisor
    const color = isGood ? 'text-emerald-400' : isBad ? 'text-red-400' : 'text-blue-400';
    const border = isGood ? 'border-emerald-500' : isBad ? 'border-red-500' : 'border-blue-500';
    const bg = isGood ? 'bg-emerald-900/90' : isBad ? 'bg-red-900/90' : 'bg-slate-800/90';

    return (
        <div key={feedback.id} className={`absolute top-1/4 right-4 md:right-1/4 z-50 flex items-start gap-4 max-w-sm pop-in pointer-events-none`}>
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full bg-slate-800 border-2 ${border} flex items-center justify-center overflow-hidden shadow-2xl relative flex-shrink-0`}>
                <div className={`${color} transform scale-125`}>
                    <Icons.Supervisor />
                </div>
            </div>

            {/* Bubble */}
            <div className={`flex-1 p-4 rounded-2xl rounded-tl-none border ${border} ${bg} backdrop-blur-md shadow-2xl text-white`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${color}`}>
                    Dr. Bleuler (Supervisor)
                </div>
                <p className="text-sm font-medium leading-relaxed">
                    "{feedback.msg}"
                </p>
                {feedback.tip && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-300 italic">
                        💡 {feedback.tip}
                    </div>
                )}
            </div>
        </div>
    );
};

const ControlPanel = ({ onDecision, disabled }) => {
    const btnBase = "btn-premium relative flex flex-col items-center justify-center p-2 rounded-xl transition-all h-20 sm:h-24 group overflow-hidden";

    return (
        <div className="w-full grid grid-cols-3 gap-2 p-2 glass rounded-2xl">
            <button
                onClick={() => { AudioSys.playClick(); onDecision('UCE'); }}
                disabled={disabled}
                style={{ '--btn-bg': '#7f1d1d', '--btn-border': '#b91c1c', '--btn-shadow': '#450a0a' }}
                className={`${btnBase} text-red-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-1.5 bg-red-800/80 rounded-full mb-1 shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform"><Icons.Siren /></div>
                <span className="text-[10px] sm:text-[10px] font-black uppercase tracking-widest relative z-10">Hospitalizar</span>
                <span className="text-[10px] opacity-60 font-mono relative z-10">UCE</span>
            </button>

            <button
                onClick={() => { AudioSys.playClick(); onDecision('OBS'); }}
                disabled={disabled}
                style={{ '--btn-bg': '#78350f', '--btn-border': '#d97706', '--btn-shadow': '#451a03' }}
                className={`${btnBase} text-amber-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-1.5 bg-amber-700/80 rounded-full mb-1 shadow-lg shadow-amber-900/50 group-hover:scale-110 transition-transform"><Icons.Bed /></div>
                <span className="text-[10px] sm:text-[10px] font-black uppercase tracking-widest relative z-10">Observación</span>
                <span className="text-[10px] opacity-60 font-mono relative z-10">OBS</span>
            </button>

            <button
                onClick={() => { AudioSys.playClick(); onDecision('ALTA'); }}
                disabled={disabled}
                style={{ '--btn-bg': '#064e3b', '--btn-border': '#059669', '--btn-shadow': '#022c22' }}
                className={`${btnBase} text-emerald-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-1.5 bg-emerald-700/80 rounded-full mb-1 shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform"><Icons.Home /></div>
                <span className="text-[10px] sm:text-[10px] font-black uppercase tracking-widest relative z-10">Alta Médica</span>
                <span className="text-[10px] opacity-60 font-mono relative z-10">CASA</span>
            </button>
        </div>
    );
};

const PatientArea = ({ currentPatient }) => (
    <div className="mb-2 w-full flex justify-center flex-1 items-center relative min-h-[160px]">
        {currentPatient ? (
            <PatientCard patient={currentPatient} />
        ) : (
            <div className="text-slate-500 font-mono animate-pulse text-center flex flex-col items-center justify-center h-full opacity-30">
                <div className="text-4xl mb-2 grayscale">🏥</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold">Sala de Espera</div>
            </div>
        )}
    </div>
);

const CluesPanel = ({ patient }) => {
    const clues = extractClinicalClues(patient);
    return (
        <div className="w-full bg-slate-800/70 rounded-xl border border-slate-700 p-4 text-xs text-slate-200 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Claves clínicas del caso</div>
            {patient ? (
                <ul className="space-y-1 list-disc list-inside text-slate-200">
                    {clues.map((clue, index) => (
                        <li key={`${patient.uniqueId}-clue-${index}`}>{clue}</li>
                    ))}
                </ul>
            ) : (
                <div className="text-slate-500">Espera un nuevo caso para analizar.</div>
            )}
        </div>
    );
};

const CaseLog = ({ entries }) => (
    <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 flex-shrink-0">Aprendizajes recientes</div>
        <div className="overflow-y-auto custom-scrollbar pr-1 flex-1">
            {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500/50">
                    <Icons.Activity />
                    <div className="text-[10px] mt-2 font-mono">SIN REGISTROS</div>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map((entry) => (
                        <div key={entry.id} className={`p-3 rounded-lg border text-xs relative overflow-hidden ${entry.correct ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                            {/* Glow indicator */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${entry.correct ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                            <div className="flex justify-between items-center pl-2 mb-1">
                                <span className="font-bold text-slate-200">{entry.name}</span>
                                {entry.correct && <span className="text-emerald-400 font-bold">+$100</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 pl-2 mb-2">{entry.diagnosis}</div>
                            <div className="flex gap-2 pl-2">
                                <span className="px-2 py-0.5 bg-slate-900 rounded text-[10px] text-slate-500">REAL: <span className="text-slate-300">{entry.correctTriage}</span></span>
                                <span className="px-2 py-0.5 bg-slate-900 rounded text-[10px] text-slate-500">TÚ: <span className={`font-bold ${entry.correct ? 'text-emerald-400' : 'text-red-400'}`}>{entry.decision}</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}    </div>
    </div>
);

const QueueColumn = ({ queue, caseLog, pressure }) => (
    <div className="w-full h-full bg-slate-800/50 border-l border-slate-700 flex flex-col rounded-xl overflow-hidden min-h-0">
        {/* Header Fixed */}
        <div className="p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex justify-between">
                <span>Sala de Espera</span>
                <span>{queue.length} Pacientes</span>
            </h3>
            <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest">
                    <span>Presión asistencial</span>
                    <span className={`${pressure > 70 ? 'text-red-400' : pressure > 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>{pressure}%</span>
                </div>
                <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`${pressure > 70 ? 'bg-red-500' : pressure > 40 ? 'bg-yellow-500' : 'bg-emerald-500'} h-full transition-all`} style={{ width: `${pressure}%` }}></div>
                </div>
            </div>
        </div>

        {/* Top: Queue List (Flexible 40%) */}
        <div className="flex-[0.4] overflow-y-auto p-3 space-y-2 custom-scrollbar border-b border-slate-700 min-h-0">
            {queue.map((p, i) => (
                <div key={p.uniqueId} className="bg-slate-700/50 p-2 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-lg opacity-70 flex-shrink-0">{p.sprite}</span>
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{p.complaint}</div>
                            <div className="w-full h-1 bg-slate-800 mt-1 rounded-full overflow-hidden">
                                <div className={`h-full transition-all ${(p.waitTime || 0) > 30 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, ((p.waitTime || 0) / 45) * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">#{i + 1}</div>
                </div>
            ))}
            {queue.length === 0 && (
                <div className="text-center text-slate-600 text-[10px] mt-4">Sala vacía...</div>
            )}
        </div>

        {/* Bottom: Info & Logs (Flexible 60%) */}
        <div className="flex-[0.6] bg-slate-900 flex flex-col overflow-hidden min-h-0">
            <div className="p-3 flex-shrink-0">
                <div className="p-2 bg-blue-900/20 rounded border border-blue-500/20 text-[10px] text-blue-300 leading-snug flex gap-2">
                    <span className="text-base">ℹ️</span>
                    <div>
                        <strong>TIP:</strong> Revisa GLUCOSA y T°. Algunos "psiquiátricos" son orgánicos (hipoglucemia, etc) → UCE.
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden px-3 pb-3 flex flex-col min-h-0">
                <CaseLog entries={caseLog} />
            </div>
        </div>
    </div>
);

// --- MOTOR DEL JUEGO ---
const Game = () => {
    const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, PAUSED, GAMEOVER
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [queue, setQueue] = useState([]);
    const [bedsUCE, setBedsUCE] = useState(Array(MAX_BEDS_UCE).fill(null));
    const [bedsOBS, setBedsOBS] = useState(Array(MAX_BEDS_OBS).fill(null));
    const [currentPatient, setCurrentPatient] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [gameOver, setGameOver] = useState(null);
    const [spawnRate, setSpawnRate] = useState(3500); // ms
    const [streak, setStreak] = useState(0);
    const [caseLog, setCaseLog] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [pressurePenalty, setPressurePenalty] = useState(0);
    const [sessionTrophies, setSessionTrophies] = useState([]);

    const deckRef = useRef(createDeck());
    const lastPatientIdRef = useRef([]); // Stores array of recent IDs
    const pressureRef = useRef(0); // Valor vivo para leerlo dentro del timer

    // Limpiar feedback automáticamente
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 1500); // Desaparece en 1.5s
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Inicializar y Timer Global
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Asegurar que haya un paciente inicial si la cola está vacía al empezar
        if (queue.length === 0 && !currentPatient) {
            addPatientToQueue();
        }

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    setGameState('GAMEOVER');
                    setGameOver("Se acabó el tiempo del turno.");
                    return 0;
                }
                const elapsed = GAME_DURATION - t;
                if (elapsed > 120) setSpawnRate(1800); // Slightly faster in late game

                if (t === 1 && pressureRef.current > 90) {
                    const unlocked = TrophySys.unlock('coffee');
                    if (unlocked) {
                        setFeedback({ type: 'trophy', msg: `¡Impresionante resistencia! Has ganado: ${unlocked.name}`, id: Date.now() });
                        setSessionTrophies(prev => [...prev, 'coffee']);
                    }
                }

                // Tick sound last 10 secs
                if (t <= 10) AudioSys.playPop();

                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    // Spawner dinámico
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const spawner = setInterval(() => {
            if (queue.length < 8) {
                addPatientToQueue();
                AudioSys.playPop(); // Sonido suave al llegar paciente
            }
        }, spawnRate);
        return () => clearInterval(spawner);
    }, [spawnRate, queue.length, gameState]);

    // Deterioro de pacientes
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const queueTimer = setInterval(() => {
            setQueue(prev => {
                let deteriorated = false;
                const nextQueue = prev.map(p => {
                    const waitTime = (p.waitTime || 0) + 1;
                    if (waitTime === 45) {
                        deteriorated = true;
                    }
                    return { ...p, waitTime };
                });
                
                if (deteriorated) {
                    setPressurePenalty(p => p + 15);
                    setFeedback({ 
                        type: 'error', 
                        msg: '¡Un paciente ha empeorado por la espera! Aumenta la presión.', 
                        id: Date.now() 
                    });
                    AudioSys.playError();
                }
                return nextQueue;
            });
        }, 1000);
        return () => clearInterval(queueTimer);
    }, [gameState]);

    // Procesar cola
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        if (!currentPatient && queue.length > 0) {
            const next = queue[0];
            setCurrentPatient(next);
            setQueue(q => q.slice(1));
        }
    }, [queue, currentPatient, gameState]);

    const drawPatient = () => {
        if (deckRef.current.length === 0) {
            deckRef.current = createDeck();
        }

        let nextTemplate = deckRef.current.shift();
        let guard = 0;

        // Anti-repetition logic: Check last 12 IDs
        while (guard < 10) {
            if (!lastPatientIdRef.current.includes(nextTemplate.id)) {
                break;
            }
            deckRef.current.push(nextTemplate);
            nextTemplate = deckRef.current.shift();
            guard++;
        }

        // Update History
        const newHistory = [nextTemplate.id, ...lastPatientIdRef.current].slice(0, 12);
        lastPatientIdRef.current = newHistory;

        return createPatient(nextTemplate);
    };

    const addPatientToQueue = () => {
        const newPatient = drawPatient();
        setQueue(prev => [...prev, newPatient]);
    };

    const addCaseLog = (entry) => {
        setCaseLog(prev => {
            const newLog = [entry, ...prev].slice(0, 15); // Log limit

            // Check for DSM-5 Trophy (10 correct streak in logs? No, check STREAK state)
            return newLog;
        });
    };

    const handleDecision = (type) => {
        if (!currentPatient) return;

        // Lógica de Evaluación
        const isCorrect = type === currentPatient.triaje;
        let pointsChange = 0;
        let message = "";
        let severity = "success";

        if (!isCorrect && currentPatient.triaje === 'UCE' && type === 'ALTA') {
            pointsChange = -200;
            message = `¡NEGLIGENCIA! ${currentPatient.name} tenía riesgo vital.`;
            severity = "error";
            AudioSys.playError();
            setStreak(0);
        }

        if (!isCorrect && pointsChange === 0) {
            pointsChange = -50;
            message = `Incorrecto. ${currentPatient.name} necesitaba ${currentPatient.triaje}.`;
            severity = "error";
            AudioSys.playError();
            setStreak(0);
        }

        if (isCorrect) {
            // Gestión de Camas
            if (type === 'UCE') {
                const emptyIdx = bedsUCE.findIndex(b => b === null);
                if (emptyIdx === -1) {
                    setFeedback({ type: 'error', msg: "¡No tengo camas en UCE! Tienes que liberar espacio primero.", tip: "Haz clic en un paciente de UCE para darle el alta si ya está estable.", id: Date.now() });
                    AudioSys.playError();
                    return;
                }
                const newBeds = [...bedsUCE];
                newBeds[emptyIdx] = currentPatient;
                setBedsUCE(newBeds);
            }
            else if (type === 'OBS') {
                const emptyIdx = bedsOBS.findIndex(b => b === null);
                if (emptyIdx === -1) {
                    setFeedback({ type: 'error', msg: "¡Observación saturada! Necesitamos mover pacientes.", tip: "Revisa quiénes ya cumplieron su tiempo en OBS.", id: Date.now() });
                    AudioSys.playError();
                    return;
                }
                const newBeds = [...bedsOBS];
                newBeds[emptyIdx] = currentPatient;
                setBedsOBS(newBeds);
            }

            // Streak & Rewards Logic
            const nextStreak = streak + 1;
            setStreak(nextStreak);
            const bonus = nextStreak % 3 === 0 ? 50 : 0;

            // Time Bonus logic: Reward speed/accuracy
            setTimeLeft(t => Math.min(t + 5, GAME_DURATION));

            pointsChange = 100 + bonus;
            message = bonus > 0 ? `¡Correcto! +100 (+${bonus} Racha) +5s` : "¡Correcto! +100 +5s";
            severity = "success";

            // Trophy Checks
            if (nextStreak === 20) {
                const unlocked = TrophySys.unlock('ect');
                if (unlocked) {
                    setTimeout(() => setFeedback({ type: 'trophy', msg: `¡Increíble racha! Te has ganado la ${unlocked.name}.`, id: Date.now() + 1000 }), 1500);
                    setSessionTrophies(prev => [...prev, 'ect']);
                }
            }
            if (nextStreak === 10) {
                const unlocked = TrophySys.unlock('dsm5');
                if (unlocked) {
                    setTimeout(() => setFeedback({ type: 'trophy', msg: `¡Estás en racha! Toma este ${unlocked.name}.`, id: Date.now() + 1000 }), 1500);
                    setSessionTrophies(prev => [...prev, 'dsm5']);
                }
            }
            if (type === 'UCE' && (currentPatient.diagnosis.includes("Delirium") || currentPatient.diagnosis.includes("Sepsis") || currentPatient.diagnosis.includes("Tiroidea") || currentPatient.diagnosis.includes("Hipoglucemia"))) {
                const unlocked = TrophySys.unlock('steth');
                if (unlocked) {
                    setTimeout(() => setFeedback({ type: 'trophy', msg: `¡Excelente diagnóstico diferencial! Te mereces el ${unlocked.name}.`, id: Date.now() + 1000 }), 1500);
                    setSessionTrophies(prev => [...prev, 'steth']);
                }
            }
        }

        if (!isCorrect) {
            shakeScreen();
        }

        if (pointsChange !== 0) {
            setScore(s => Math.max(0, s + pointsChange));
        }

        if (message) {
            setFeedback({ type: severity, msg: message, id: Date.now(), tip: getTeachingTip(currentPatient) });
        }

        addCaseLog({
            id: Date.now(),
            name: currentPatient.name,
            diagnosis: currentPatient.diagnosis,
            correctTriage: currentPatient.triaje,
            decision: type,
            correct: isCorrect,
            points: pointsChange,
            tip: getTeachingTip(currentPatient)
        });

        setCurrentPatient(null);
    };

    const clearBed = (index, type) => {
        if (type === 'UCE') {
            const newBeds = [...bedsUCE];
            newBeds[index] = null;
            setBedsUCE(newBeds);
        } else {
            const newBeds = [...bedsOBS];
            newBeds[index] = null;
            setBedsOBS(newBeds);
        }
        setScore(s => s + 50);
        addCaseLog({
            id: Date.now(),
            name: type === 'UCE' ? `Alta UCE #${index + 1}` : `Alta OBS #${index + 1}`,
            diagnosis: "Paciente estabilizado",
            correctTriage: "ALTA",
            decision: "ALTA",
            correct: true,
            points: 50,
            tip: "Completar alta libera recursos y mejora el flujo."
        });

        // Feedback visual sutil
        const floating = document.createElement('div');
        floating.innerText = "+50";
        floating.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);color:#4ade80;font-weight:bold;font-size:1.5rem;z-index:60;pointer-events:none;text-shadow:0 2px 8px rgba(0,0,0,0.6);';
        floating.className = 'animate-bounce';
        document.body.appendChild(floating);
        setTimeout(() => floating.remove(), 1000);
    };

    const shakeScreen = () => {
        document.body.classList.add('animate-shake');
        setTimeout(() => document.body.classList.remove('animate-shake'), 500);
    };

    const startGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setQueue([]);
        setBedsUCE(Array(MAX_BEDS_UCE).fill(null));
        setBedsOBS(Array(MAX_BEDS_OBS).fill(null));
        setCurrentPatient(null);
        setGameOver(null);
        setStreak(0);
        setCaseLog([]);
        setPressurePenalty(0);
        setSessionTrophies([]);

        // Pre-fill queue slightly
        deckRef.current = createDeck();
        setQueue([drawPatient(), drawPatient()]);

        setGameState('PLAYING');
    };

    const basePressure = Math.min(100, Math.round((queue.length / 8) * 100));
    const pressure = Math.min(100, basePressure + pressurePenalty);
    pressureRef.current = pressure;

    if (gameState === 'MENU') return <MainMenu onStart={startGame} />;

    return (
        <div className="h-screen w-full bg-slate-900 p-2 overflow-hidden relative font-sans game-background grid grid-rows-[auto_1fr] gap-2">
            {/* OVERLAYS */}
            {gameState === 'GAMEOVER' && <GameOver score={score} reason={gameOver} onRetry={() => setGameState('MENU')} sessionTrophies={sessionTrophies} />}
            {gameState === 'PAUSED' && <PauseMenu onResume={() => setGameState('PLAYING')} onRestart={() => setGameState('MENU')} />}

            {/* HEADER */}
            <div className="relative z-20">
                <GameHeader timeLeft={timeLeft} score={score} streak={streak} pressure={pressure} />
                <div className="absolute top-2 right-4 sm:top-3 sm:right-6 flex gap-1.5 z-20">
                    <button
                        onClick={() => setIsMuted(AudioSys.toggleMute())}
                        className="bg-slate-700/80 hover:bg-slate-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors border border-slate-600"
                        title={isMuted ? "Activar sonido" : "Silenciar"}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    <button
                        onClick={() => { AudioSys.playClick(); setGameState('PAUSED'); }}
                        className="bg-slate-700/80 hover:bg-slate-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors border border-slate-600"
                        title="Pausar"
                    >
                        ⏸
                    </button>
                </div>
            </div>

            {/* GAME AREA - GRID LAYOUT 12 COLS (scroll vertical en pantallas pequeñas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-y-auto lg:overflow-hidden custom-scrollbar min-h-0 relative">

                {/* LEFT: BEDS (3/12 = 25%) */}
                <div className="flex flex-col gap-2 overflow-hidden lg:col-span-3">
                    <BedsColumn
                        title="UCE"
                        accent={{
                            bg: "bg-red-950/30",
                            border: "border-red-900/50",
                            bar: "bg-red-600",
                            text: "text-red-400",
                            countBg: "bg-red-900/50"
                        }}
                        beds={bedsUCE}
                        maxBeds={MAX_BEDS_UCE}
                        type="UCE"
                        onClear={clearBed}
                        columns="grid-cols-1"
                        active={gameState === 'PLAYING'}
                    />
                    <BedsColumn
                        title="OBS"
                        accent={{
                            bg: "bg-amber-950/30",
                            border: "border-amber-900/50",
                            bar: "bg-amber-500",
                            text: "text-amber-400",
                            countBg: "bg-amber-900/50"
                        }}
                        beds={bedsOBS}
                        maxBeds={MAX_BEDS_OBS}
                        type="OBS"
                        onClear={clearBed}
                        columns="grid-cols-2"
                        active={gameState === 'PLAYING'}
                    />
                </div>

                {/* CENTER: DASHBOARD (5/12 = 41.6%) */}
                <div className="flex flex-col relative min-h-0 lg:col-span-5 bg-slate-800/20 rounded-xl border border-white/5 overflow-hidden">
                    {/* SUPERVISOR MESSAGE */}
                    <Supervisor feedback={feedback} />

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-4">
                        <PatientArea currentPatient={currentPatient} />
                    </div>

                    <div className="p-2 w-full max-w-2xl mx-auto z-20 bg-slate-900/80 backdrop-blur-md border-t border-white/10">
                        <ControlPanel onDecision={handleDecision} disabled={!currentPatient} />
                    </div>
                </div>

                {/* RIGHT: QUEUE (4/12 = 33.3%) */}
                <div className="flex flex-col gap-2 overflow-hidden lg:col-span-4 pl-1">
                    <QueueColumn queue={queue} caseLog={caseLog} pressure={pressure} />
                    <div className="flex-shrink-0">
                        <CluesPanel patient={currentPatient} />
                    </div>
                </div>

            </div>
        </div>
    );
};

export { Game };
