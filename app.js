const { useState, useEffect, useRef } = React;

// --- CONFIGURACIÓN ---
const GAME_DURATION = 180; // 3 Minutos
const MAX_BEDS_UCE = 3;
const MAX_BEDS_OBS = 4;

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
    Siren: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H7v-6Z" /><path d="M5 20a2 2 0 0 1 2-2h10a2 0 0 1 2 2v2H5v-2Z" /><path d="M21 12h1" /><path d="M18.5 4.5 18 5" /><path d="M2 12h1" /><path d="M12 2v1" /><path d="m4.929 4.929.707.707" /><path d="M12 12v6" /></svg>,
    Bed: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
    Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
    if (vitals.includes("temp") || vitals.includes("fiebre") || vitals.includes("38") || vitals.includes("39")) clues.push("Fiebre/posible causa médica.");
    if (vitals.includes("hipotens") || vitals.includes("90/") || vitals.includes("85/")) clues.push("Inestabilidad hemodinámica.");
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

const Bed = ({ type, patient, onClear, id }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval;
        if (patient) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    const speed = type === 'UCE' ? 2 : 5;
                    return p + speed;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [patient]);

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
                        <button onClick={() => onClear(id, type)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] py-1.5 rounded-lg font-bold animate-bounce shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1">
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
            <div key={patient.uniqueId} className="bg-slate-900/90 text-slate-100 p-6 rounded-3xl w-full max-w-md transform transition-all patient-enter shadow-2xl relative overflow-hidden group">
                {/* Holographic header effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 opacity-80"></div>
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase border border-teal-500/30 px-2 py-0.5 rounded-full bg-teal-500/10">Paciente</span>
                            <span className="text-[10px] font-mono text-slate-500">ID: {patient.id.toString().padStart(4, '0')}</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{patient.name}</h2>
                        <span className="text-sm text-slate-400 font-medium">{patient.age} años</span>
                    </div>
                    <div className="text-6xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500">{patient.sprite}</div>
                </div>

                <div className="space-y-4 mb-6 relative z-10">
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                        <div className="text-[10px] text-red-400 font-bold uppercase mb-1 tracking-wider flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Motivo de Consulta
                        </div>
                        <p className="text-base font-medium leading-normal text-red-100/90">"{patient.complaint}"</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-mono bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-slate-300">
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

const MainMenu = ({ onStart }) => (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 p-4 game-background">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 filter contrast-150"></div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="text-8xl mb-6 filter drop-shadow-[0_0_25px_rgba(20,184,166,0.5)] animate-bounce">🚨</div>
            <h1 className="text-5xl md:text-8xl font-black text-white hud-font tracking-widest mb-4 text-center">
                TRIAGE<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">TYCOON</span>
            </h1>

            <ElectricBorder color="#2dd4bf" speed={2} borderRadius={20} className="mt-8">
                <button
                    onClick={onStart}
                    className="bg-slate-900/80 hover:bg-teal-900/50 text-white font-bold py-6 px-12 rounded-xl backdrop-blur-md transition-all hover:scale-105 group"
                >
                    <span className="text-xl tracking-widest flex items-center gap-4 group-hover:text-teal-300 transition-colors">
                        <Icons.Siren /> INICIAR GUARDIA <Icons.Siren />
                    </span>
                </button>
            </ElectricBorder>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl w-full px-4">
                <div className="glass p-4 rounded-xl text-center border-t-2 border-red-500">
                    <div className="text-red-400 font-bold mb-1">UCE (ROJO)</div>
                    <p className="text-[10px] text-slate-400">Peligro de muerte inminente. Prioridad máxima.</p>
                </div>
                <div className="glass p-4 rounded-xl text-center border-t-2 border-amber-500">
                    <div className="text-amber-400 font-bold mb-1">OBS (AMARILLO)</div>
                    <p className="text-[10px] text-slate-400">Requiere vigilancia o estabilización.</p>
                </div>
                <div className="glass p-4 rounded-xl text-center border-t-2 border-emerald-500">
                    <div className="text-emerald-400 font-bold mb-1">ALTA (VERDE)</div>
                    <p className="text-[10px] text-slate-400">Patología leve. Casa y cuidados.</p>
                </div>
            </div>

            <div className="absolute bottom-8 text-[10px] text-slate-600 font-mono">
                SYSTEM_READY // VER 2.0.0 PRO
            </div>
        </div>
    </div>
);

const PauseMenu = ({ onResume, onRestart }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-800 p-8 rounded-2xl border-2 border-slate-600 text-center max-w-sm w-full shadow-2xl pop-in">
            <h2 className="text-3xl font-bold text-white mb-6 hud-font">PAUSA</h2>
            <div className="space-y-3">
                <button onClick={onResume} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    CONTINUAR
                </button>
                <button onClick={onRestart} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                    REINICIAR NIVEL
                </button>
            </div>
        </div>
    </div>
);

const GameOver = ({ score, reason, onRetry }) => (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-800 p-8 rounded-2xl border-4 border-red-500 text-center max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.5)] pop-in">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-3xl font-bold text-white mb-2 hud-font">GUARDIA TERMINADA</h2>
            <p className="text-red-400 mb-6 font-mono text-lg">{reason}</p>
            <div className="bg-slate-900 p-6 rounded-lg mb-8 border border-slate-700">
                <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Puntaje Final</div>
                <div className="text-5xl font-black text-teal-400 tracking-tighter">$ {score}</div>
            </div>
            <button onClick={onRetry} className="w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-xl hover:bg-slate-200 transition-transform hover:scale-105">
                NUEVA GUARDIA
            </button>
        </div>
    </div>
);

const GameHeader = ({ timeLeft, score, streak, pressure }) => (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 glass p-4 rounded-2xl z-10 gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                <Icons.Siren />
            </div>
            <div>
                <h1 className="text-2xl font-black text-white hud-font tracking-widest uppercase flex items-center gap-2">
                    Triage Tycoon <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">PRO</span>
                </h1>
                <div className="text-[10px] text-teal-500/80 font-mono tracking-widest uppercase">Guardia Nocturna // Nivel 1</div>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 font-mono">
            {/* Time */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${timeLeft < 30 ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-900/50 border-slate-700 text-slate-200'}`}>
                <Icons.Clock />
                <span className="text-xl font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3 bg-slate-900/50 px-5 py-3 rounded-xl border border-slate-700 text-emerald-400">
                <span className="text-lg">$</span>
                <span className="text-xl font-bold">{score}</span>
            </div>

            {/* Stats */}
            <div className="flex flex-col justify-center gap-1.5 px-2 min-w-[120px]">
                <div className="flex justify-between items-end">
                    <span className="uppercase tracking-widest text-[9px] text-slate-500 font-bold">Presión</span>
                    <span className={`text-xs font-bold ${pressure > 70 ? 'text-red-400' : pressure > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{pressure}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pressure > 70 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : pressure > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pressure}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-600">
                    <span>Racha</span>
                    <span className="text-teal-400 font-bold">{streak} 🔥</span>
                </div>
            </div>
        </div>
    </div>
);

const BedsColumn = ({ title, accent, beds, maxBeds, type, onClear, columns }) => (
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
            {beds.map((p, i) => <Bed key={i} id={i} type={type} patient={p} onClear={onClear} />)}
        </div>
    </div>
);

const FeedbackToast = ({ feedback }) => (
    <div key={feedback.id} className={`absolute top-4 z-30 px-8 py-3 rounded-full font-bold shadow-2xl pop-in border-2 text-center ${feedback.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-green-600 border-green-400 text-white'}`}>
        {feedback.msg}
    </div>
);

const ControlPanel = ({ onDecision, disabled }) => {
    const btnBase = "btn-premium relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all h-28 sm:h-32 group overflow-hidden";

    return (
        <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 p-4 glass rounded-3xl">
            <button
                onClick={() => onDecision('UCE')}
                disabled={disabled}
                style={{ '--btn-bg': '#7f1d1d', '--btn-border': '#b91c1c', '--btn-shadow': '#450a0a' }}
                className={`${btnBase} text-red-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-3 bg-red-800/80 rounded-full mb-2 shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform"><Icons.Siren /></div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest relative z-10">Hospitalizar</span>
                <span className="text-[9px] opacity-60 font-mono relative z-10">UCE</span>
            </button>

            <button
                onClick={() => onDecision('OBS')}
                disabled={disabled}
                style={{ '--btn-bg': '#78350f', '--btn-border': '#d97706', '--btn-shadow': '#451a03' }}
                className={`${btnBase} text-amber-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-3 bg-amber-700/80 rounded-full mb-2 shadow-lg shadow-amber-900/50 group-hover:scale-110 transition-transform"><Icons.Bed /></div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest relative z-10">Observación</span>
                <span className="text-[9px] opacity-60 font-mono relative z-10">OBS</span>
            </button>

            <button
                onClick={() => onDecision('ALTA')}
                disabled={disabled}
                style={{ '--btn-bg': '#064e3b', '--btn-border': '#059669', '--btn-shadow': '#022c22' }}
                className={`${btnBase} text-emerald-100`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="p-3 bg-emerald-700/80 rounded-full mb-2 shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform"><Icons.Home /></div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest relative z-10">Alta Médica</span>
                <span className="text-[9px] opacity-60 font-mono relative z-10">CASA</span>
            </button>
        </div>
    );
};

const PatientArea = ({ currentPatient }) => (
    <div className="mb-4 sm:mb-6 w-full flex justify-center min-h-[18rem] sm:h-72 items-center relative">
        {currentPatient ? (
            <PatientCard patient={currentPatient} />
        ) : (
            <div className="text-slate-500 font-mono animate-pulse text-center flex flex-col items-center justify-center h-full opacity-30">
                <div className="text-6xl mb-4 grayscale">🏥</div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold">Sala de Espera</div>
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
                                <span className="px-2 py-0.5 bg-slate-900 rounded text-[9px] text-slate-500">REAL: <span className="text-slate-300">{entry.correctTriage}</span></span>
                                <span className="px-2 py-0.5 bg-slate-900 rounded text-[9px] text-slate-500">TÚ: <span className={`font-bold ${entry.correct ? 'text-emerald-400' : 'text-red-400'}`}>{entry.decision}</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}    </div>
    </div>
);

const QueueColumn = ({ queue, caseLog, pressure }) => (
    <div className="w-full lg:w-1/3 bg-slate-800/50 border-l border-slate-700 flex flex-col rounded-xl lg:rounded-none overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex justify-between">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {queue.map((p, i) => (
                <div key={p.uniqueId} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center border border-slate-600 hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-xl opacity-70">{p.sprite}</span>
                        <div>
                            <div className="font-bold text-xs text-white">{p.name}</div>
                            <div className="text-[10px] text-slate-400 truncate w-24">{p.complaint}</div>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">#{i + 1}</div>
                </div>
            ))}
            {queue.length === 0 && (
                <div className="text-center text-slate-600 text-xs mt-10">Sala vacía... por ahora.</div>
            )}
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-700">
            <div className="p-3 bg-blue-900/20 rounded border border-blue-500/20 text-[10px] text-blue-300 leading-relaxed flex gap-2">
                <span className="text-lg">ℹ️</span>
                <div>
                    <strong>TIP CLÍNICO:</strong> Revisa la GLUCOSA y TEMPERATURA. Algunos pacientes psiquiátricos en realidad tienen urgencias médicas (hipoglucemia, encefalitis) y requieren UCE inmediata.
                </div>
            </div>
            <CaseLog entries={caseLog} />
        </div>
    </div>
);

// --- MOTOR DEL JUEGO ---
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

    const deckRef = useRef(createDeck());
    const lastPatientIdRef = useRef(null);
    const lastTriagesRef = useRef([]);

    // Limpiar feedback automáticamente
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 1500); // Desaparece en 1.5s
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Inicializar y Timer Global
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
                if (elapsed > 60) setSpawnRate(3000);
                if (elapsed > 120) setSpawnRate(2000);
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    // Spawner dinámico
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const spawner = setInterval(() => {
            if (queue.length < 8) addPatientToQueue();
        }, spawnRate);
        return () => clearInterval(spawner);
    }, [spawnRate, queue.length, gameState]);

    // Procesar cola
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
        while (guard < 6) {
            const lastId = lastPatientIdRef.current;
            const lastTriages = lastTriagesRef.current;
            const recentSameTriage = lastTriages.length >= 2 && lastTriages.every((t) => t === nextTemplate.triaje);
            if (nextTemplate.id !== lastId && !recentSameTriage) break;
            deckRef.current.push(nextTemplate);
            nextTemplate = deckRef.current.shift();
            guard += 1;
        }

        lastPatientIdRef.current = nextTemplate.id;
        lastTriagesRef.current = [...lastTriagesRef.current.slice(-1), nextTemplate.triaje];
        return createPatient(nextTemplate);
    };

    const addPatientToQueue = () => {
        const newPatient = drawPatient();
        setQueue(prev => [...prev, newPatient]);
    };

    const addCaseLog = (entry) => {
        setCaseLog(prev => [entry, ...prev].slice(0, 5));
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
            setStreak(0);
        }

        if (!isCorrect && pointsChange === 0) {
            pointsChange = -50;
            message = `Incorrecto. ${currentPatient.name} necesitaba ${currentPatient.triaje}.`;
            severity = "error";
            setStreak(0);
        }

        if (isCorrect) {
            // Gestión de Camas
            if (type === 'UCE') {
                const emptyIdx = bedsUCE.findIndex(b => b === null);
                if (emptyIdx === -1) {
                    setFeedback({ type: 'error', msg: "¡UCE LLENA! Libera camas o deriva.", id: Date.now() });
                    return;
                }
                const newBeds = [...bedsUCE];
                newBeds[emptyIdx] = currentPatient;
                setBedsUCE(newBeds);
            }
            else if (type === 'OBS') {
                const emptyIdx = bedsOBS.findIndex(b => b === null);
                if (emptyIdx === -1) {
                    setFeedback({ type: 'error', msg: "¡OBSERVACIÓN LLENA! Da altas.", id: Date.now() });
                    return;
                }
                const newBeds = [...bedsOBS];
                newBeds[emptyIdx] = currentPatient;
                setBedsOBS(newBeds);
            }
        }

        if (isCorrect) {
            const nextStreak = streak + 1;
            setStreak(nextStreak);
            const bonus = nextStreak % 3 === 0 ? 50 : 0;
            pointsChange = 100 + bonus;
            message = bonus > 0 ? `¡Triaje Correcto! +100 (+${bonus} racha)` : "¡Triaje Correcto! +100";
            severity = "success";
        }

        if (!isCorrect) {
            shakeScreen();
        }

        if (pointsChange !== 0) {
            setScore(s => Math.max(0, s + pointsChange));
        }

        if (message) {
            setFeedback({ type: severity, msg: message, id: Date.now() });
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
        floating.style.position = 'absolute';
        floating.style.left = '50%';
        floating.style.top = '50%';
        floating.style.color = '#4ade80';
        floating.style.fontWeight = 'bold';
        floating.className = 'animate-bounce';
        document.body.appendChild(floating);
        setTimeout(() => document.body.removeChild(floating), 1000);
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

        // Pre-fill queue slightly
        deckRef.current = createDeck();
        setQueue([drawPatient(), drawPatient()]);

        setGameState('PLAYING');
    };

    if (gameState === 'MENU') return <MainMenu onStart={startGame} />;

    const pressure = Math.min(100, Math.round((queue.length / 8) * 100));

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 p-3 sm:p-4 overflow-hidden relative font-sans game-background">
            {/* OVERLAYS */}
            {gameState === 'GAMEOVER' && <GameOver score={score} reason={gameOver} onRetry={() => setGameState('MENU')} />}
            {gameState === 'PAUSED' && <PauseMenu onResume={() => setGameState('PLAYING')} onRestart={() => setGameState('MENU')} />}

            {/* HEADER */}
            <div className="relative">
                <GameHeader timeLeft={timeLeft} score={score} streak={streak} pressure={pressure} />
                <button
                    onClick={() => setGameState('PAUSED')}
                    className="absolute top-4 right-4 sm:top-5 sm:right-6 bg-slate-700/80 hover:bg-slate-600 text-white p-2 rounded-lg backdrop-blur-sm transition-colors border border-slate-600 z-20"
                    title="Pausar"
                >
                    ⏸
                </button>
            </div>

            {/* GAME AREA */}
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">

                {/* LEFT: BEDS MANAGEMENT */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    {/* UCE BEDS */}
                    <BedsColumn
                        title="Unidad Cuidados Especiales (UCE)"
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
                        columns="grid-cols-1"
                        onClear={clearBed}
                    />

                    {/* OBS BEDS */}
                    <BedsColumn
                        title="Observación (OBS)"
                        accent={{
                            bg: "bg-yellow-950/30",
                            border: "border-yellow-900/50",
                            bar: "bg-yellow-600",
                            text: "text-yellow-400",
                            countBg: "bg-yellow-900/50"
                        }}
                        beds={bedsOBS}
                        maxBeds={MAX_BEDS_OBS}
                        type="OBS"
                        columns="grid-cols-2"
                        onClear={clearBed}
                    />
                </div>

                {/* CENTER: CURRENT PATIENT & ACTIONS */}
                <div className="w-full lg:w-1/3 flex flex-col items-center justify-center relative gap-4">
                    {/* FEEDBACK POPUP - Fixed Key to avoid re-render loop */}
                    {feedback && (
                        <FeedbackToast feedback={feedback} />
                    )}

                    <PatientArea currentPatient={currentPatient} />
                    <CluesPanel patient={currentPatient} />

                    {/* CONTROL PANEL */}
                    <ControlPanel onDecision={handleDecision} disabled={!currentPatient} />
                </div>

                {/* RIGHT: QUEUE & INFO */}
                <QueueColumn queue={queue} caseLog={caseLog} pressure={pressure} />
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Game />);
