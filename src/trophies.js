export const TROPHIES = {
    DSM5: { id: 'dsm5', name: 'DSM-5 de Oro', icon: '📘', desc: 'Identificar 10 casos psiquiátricos seguidos sin error.' },
    STETHOSCOPE: { id: 'steth', name: 'Estetoscopio Pro', icon: '🩺', desc: 'Detectar un caso orgánico (UCE) disfrazado de psiquiátrico.' },
    ECT: { id: 'ect', name: 'Máquina TEC', icon: '⚡', desc: 'Alcanzar una racha supersónica de 20.' },
    COFFEE: { id: 'coffee', name: 'Café Infinito', icon: '☕', desc: 'Sobrevivir un turno completo con >90% de presión.' }
};

export const TrophySys = (() => {
    const getUnlocked = () => JSON.parse(localStorage.getItem('triage_trophies') || '[]');

    const unlock = (trophyId) => {
        const unlocked = getUnlocked();
        if (!unlocked.includes(trophyId)) {
            unlocked.push(trophyId);
            localStorage.setItem('triage_trophies', JSON.stringify(unlocked));
            return TROPHIES[Object.keys(TROPHIES).find(k => TROPHIES[k].id === trophyId)];
        }
        return null;
    };

    const has = (trophyId) => getUnlocked().includes(trophyId);

    return {
        check: (state) => {
            // Logic checked externally or simple helpers
        },
        unlock,
        has,
        getAll: () => TROPHIES,
        getUnlocked: getUnlocked
    };
})();
