export const INITIAL_CHIPS = 100;
export const INITIAL_DEBT = 100;
export const HANDS_PER_ROUND = 5;

export const PAYOUTS = {
    WIN: 2, // Multiplier of bet (1:1 payout + bet returned)
    BLACKJACK: 2.5, // 3:2 payout + bet returned
    PUSH: 1, // Bet returned
    LOSS: 0
};

export function calculateDebt(round, modifiers = []) {
    // Debt increases by 50% each round by default
    let rate = 1.6;

    if (modifiers.includes('charity')) {
        rate = 1.3; // 20% slower increase (approx)
    }

    return Math.floor(INITIAL_DEBT * Math.pow(rate, round - 1));
}

export function calculatePayout(result, bet = 10, modifiers = []) {
    let multiplier = 0;

    switch (result) {
        case 'win': multiplier = PAYOUTS.WIN; break;
        case 'blackjack': multiplier = PAYOUTS.BLACKJACK; break;
        case 'push': multiplier = PAYOUTS.PUSH; break;
        default: multiplier = 0;
    }

    // Apply modifiers here later
    return Math.floor(bet * multiplier);
}
