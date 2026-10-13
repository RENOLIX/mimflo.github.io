// A progressive practice index. Model posterior is evidence, not a learner grade.
const vowels = { i: [0, 0, 0, 0], y: [0, 0, 1, 0], u: [0, 1, 1, 0], e: [.3, 0, 0, 0], 'ø': [.3, 0, 1, 0], o: [.3, 1, 1, 0], 'ɛ': [.6, 0, 0, 0], 'œ': [.6, 0, 1, 0], 'ɔ': [.6, 1, 1, 0], a: [1, .25, 0, 0], 'ɑ': [1, .65, 0, 0], 'ə': [.5, .5, 0, 0], 'ɑ̃': [1, .65, 0, 1], 'ɛ̃': [.6, 0, 0, 1], 'œ̃': [.6, 0, 1, 1], 'ɔ̃': [.6, 1, 1, 1] };
const consonants = { p: [0, 0, 0], b: [0, 0, 1], t: [0, .5, 0], d: [0, .5, 1], k: [0, 1, 0], 'ɡ': [0, 1, 1], f: [1, .15, 0], v: [1, .15, 1], s: [1, .5, 0], z: [1, .5, 1], 'ʃ': [1, .7, 0], 'ʒ': [1, .7, 1], m: [2, 0, 1], n: [2, .5, 1], 'ɲ': [2, .8, 1], 'ŋ': [2, 1, 1], l: [3, .5, 1], j: [4, .8, 1], w: [4, 1, 1], 'ɥ': [4, .5, 1] };
const rhotics = new Set(['ʁ', 'r', 'ɾ', 'ɹ']);
export function phoneSimilarity(expected, heard) {
    if (expected === heard)
        return 1;
    if (rhotics.has(expected) && rhotics.has(heard))
        return .95;
    const a = vowels[expected], b = vowels[heard];
    if (a && b) {
        const distance = Math.abs(a[0] - b[0]) * 1.3 + Math.abs(a[1] - b[1]) * .8 + Math.abs(a[2] - b[2]) * .8 + Math.abs(a[3] - b[3]) * 1.4;
        return Math.max(0, 1 - distance / 2);
    }
    const c = consonants[expected], d = consonants[heard];
    if (c && d) {
        const distance = (c[0] === d[0] ? 0 : 1.4) + Math.abs(c[1] - d[1]) * 1.2 + Math.abs(c[2] - d[2]) * .7;
        return Math.max(0, 1 - distance / 2);
    }
    return 0;
}
export function phonePracticeScore(phone) {
    if (!phone.expected || phone.status === 'missing')
        return 0;
    const confidence = Math.max(0, Math.min(100, Number(phone.confidence) || 0));
    if (phone.status === 'match')
        return Math.round(85 + .15 * confidence);
    return Math.round(75 * phoneSimilarity(phone.expected, phone.heard || '') + .25 * confidence);
}
export function pronunciationPracticeScore(phones) {
    const expected = phones.filter(p => p.expected);
    if (!expected.length)
        return 0;
    return Math.round(expected.reduce((sum, p) => sum + phonePracticeScore(p), 0) / expected.length);
}
