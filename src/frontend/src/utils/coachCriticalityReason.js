/** Referencia del listado. El MultiPV de la posición abierta no usa estas reglas. */
export const COACH_CRITICALITY_REFERENCE = [
    {
        title: 'Qué entra al listado',
        body: 'Hasta 5 jugadas del jugador analizado, con puntaje de 0 a 10. Entra si el puntaje es 3 o más. Cada motivo suma 3 y el tope es 10.',
    },
    {
        title: 'Niveles',
        body: 'De 3 a menos de 6 el nivel es Relevante. Desde 6 es Crítica. Desde 8,5 es Muy crítica.',
    },
    {
        title: 'Caída de evaluación',
        body: 'La jugada pierde 150 cp o más. El peso es 3 × pérdida / 150 y puede llegar solo a 10.',
    },
    {
        title: 'Amenaza inmediata',
        body: 'Antes de mover hay jaque, una pieza colgada o el rival puede dar jaque.',
    },
    {
        title: 'Cambio de carácter',
        body: 'Ruptura o captura de peón, baja el escudo del rey, enroques en flancos opuestos o el rey se mueve.',
    },
    {
        title: 'Decisión irreversible',
        body: 'Captura de pieza mayor, cambio de damas, sacrificio, promoción o un peón que cruza la mitad.',
    },
    {
        title: 'Qué no usa este puntaje',
        body: 'Una única jugada suficiente y una posición compleja no suman. Las líneas MultiPV son las mejores de Stockfish en la posición abierta; no eligen este listado.',
    },
]

const LEVEL_LABEL = {
    Routine: 'Rutinaria',
    Relevant: 'Relevante',
    Critical: 'Crítica',
    HighlyCritical: 'Muy crítica',
}

const TYPE_LABEL = {
    EVALUATION_DROP: 'Caída de evaluación',
    POSITION_TRANSFORMATION: 'Cambio de carácter',
    IMMEDIATE_THREAT: 'Amenaza inmediata',
    IRREVERSIBLE_DECISION: 'Decisión irreversible',
    ONLY_MOVE: 'Única jugada suficiente',
    COMPLEX_POSITION: 'Posición compleja',
}

const TAG_LABEL = {
    PAWN_BREAK: 'ruptura o captura de peón',
    SHIELD_DROP: 'baja el escudo del rey',
    OPPOSITE_CASTLING: 'enroques en flancos opuestos',
    KING_WALK: 'el rey se mueve',
    IN_CHECK: 'jaque',
    FORCING_CHECK: 'el rival puede dar jaque',
    MAJOR_CAPTURE: 'captura de pieza mayor',
    QUEEN_EXCHANGE: 'cambio de damas',
    MATERIAL_SACRIFICE: 'sacrificio',
    PROMOTION: 'promoción',
    PAWN_DOUBLE_STEP: 'avance doble de peón',
    IRREVERSIBLE_PAWN: 'el peón cruza la mitad',
}

function tagLabel(tag) {
    if (TAG_LABEL[tag]) return TAG_LABEL[tag]
    const hanging = /^HANGING_([A-Z]+)_([a-h][1-8])$/.exec(tag)
    if (hanging) return `pieza colgada en ${hanging[2]}`
    return tag.toLowerCase().replaceAll('_', ' ')
}

function reasonDetail(reason) {
    const description = String(reason?.description || '')
    const loss = /eval_loss (\d+) cp/.exec(description)
    if (loss) return `${loss[1]} cp, umbral 150`
    const tags = description
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map(tagLabel)
    return tags.join(', ')
}

export function formatCriticalityLevel(level) {
    return LEVEL_LABEL[level] || ''
}

export function formatCriticalityReason(reason) {
    const label = TYPE_LABEL[reason?.type] || reason?.type || 'Motivo'
    const detail = reasonDetail(reason)
    return detail ? `${label}: ${detail}` : label
}

export function formatCriticalityReasons(reasons) {
    if (!Array.isArray(reasons) || !reasons.length) return ''
    return reasons.map(formatCriticalityReason).join(' · ')
}

export function criticalitySummary(decision) {
    const pack = decision?.review_pack?.criticality
    const score = pack?.score ?? decision?.criticality
    const scoreText = Number.isFinite(Number(score)) ? Number(score).toFixed(1) : ''
    const level = formatCriticalityLevel(pack?.level)
    const reasons = formatCriticalityReasons(pack?.reasons)
    const head = [scoreText && `Puntaje ${scoreText}`, level].filter(Boolean).join(' · ')
    return [head, reasons].filter(Boolean).join('. ')
}
