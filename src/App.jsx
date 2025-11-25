import React, { useState, useEffect } from 'react';
import { Deck } from './lib/deck';
import { calculateHandValue, isBust, isBlackjack, shouldDealerHit } from './lib/blackjack';
import { INITIAL_CHIPS, INITIAL_DEBT, HANDS_PER_ROUND, calculateDebt, calculatePayout } from './lib/economy';
import { BUFFS } from './lib/buffs';
import Card from './components/Card';
import Controls from './components/Controls';
import BettingControls from './components/BettingControls';
import BuffDisplay from './components/BuffDisplay';
import HUD from './components/HUD';
import ChipStack from './components/ChipStack';

import Shop from './components/Shop';
import { soundManager } from './lib/audio';
import './index.css';

import Room from './components/Room';

import { createPortal } from 'react-dom';
import { useLayout } from './components/LayoutContext';
import { useControls } from 'leva';

function Game() {
  // Debug Button Position Controls
  const { debugX, debugY } = useControls('Debug Button Pos', {
    debugX: { value: 10, min: 0, max: 2000, step: 1 },
    debugY: { value: 10, min: 0, max: 1000, step: 1 }
  });

  // Game State
  const [deck, setDeck] = useState(new Deck());
  const [playerHands, setPlayerHands] = useState([]); // Array of { cards: [], bet: number, status: 'playing'|'stood'|'busted'|'blackjack' }
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameState, setGameState] = useState('initial'); // initial, playing, finished, shop, gameover
  const [message, setMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Economy & Progression State
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [debt, setDebt] = useState(INITIAL_DEBT);
  const [round, setRound] = useState(1);
  const [handIndex, setHandIndex] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [dealerTrait, setDealerTrait] = useState('standard'); // standard, aggressive, conservative
  const [currentBet, setCurrentBet] = useState(10);
  const [previousGameState, setPreviousGameState] = useState(null);

  // Shop State
  const [shopItems, setShopItems] = useState([]);
  const [refreshCost, setRefreshCost] = useState(5);

  // Initialize shop items on mount
  useEffect(() => {
    refreshShopItems();
  }, []);

  const refreshShopItems = () => {
    const shuffled = [...BUFFS].sort(() => 0.5 - Math.random());
    setShopItems(shuffled.slice(0, 3));
  };

  const handleRefreshShop = () => {
    if (chips >= refreshCost) {
      setChips(prev => prev - refreshCost);
      setRefreshCost(prev => prev + 5);
      refreshShopItems();
    }
  };

  const { leftNode, centerNode, rightNode } = useLayout();

  const deal = () => {
    if (handIndex >= HANDS_PER_ROUND) {
      setGameState('shop');
      return;
    }

    if (chips < currentBet) {
      setMessage('Not enough chips to bet!');
      return;
    }

    setChips(prev => prev - currentBet);
    soundManager.playChip();

    const newDeck = new Deck();
    newDeck.shuffle();
    soundManager.playDeal();

    // Apply Loaded Dice: Ensure player starts with > 18
    const hasLoadedDice = inventory.some(i => i.id === 'loaded_dice');
    if (hasLoadedDice) {
      // Force first two cards to be high value (e.g., 10 and 9/10/A)
      newDeck.manipulateNextDraw(10);
      newDeck.manipulateNextDraw(9);
    }

    // Apply Ace in the Hole: Ensure one card is an Ace
    // This can stack with Loaded Dice - if both are active, player gets high cards AND an Ace
    const hasAceInHole = inventory.some(i => i.id === 'ace_in_hole');
    if (hasAceInHole) {
      // Our Deck class uses 'A' rank. manipulateNextDraw takes a min value. Ace value is 11.
      newDeck.manipulateNextDraw(11);
    }

    const pHand = [newDeck.draw(), newDeck.draw()];
    const dHand = [newDeck.draw(), newDeck.draw()];

    setDeck(newDeck);

    // Initialize Player Hands (Start with 1 hand)
    setPlayerHands([{
      cards: pHand,
      bet: currentBet,
      status: 'playing'
    }]);
    setCurrentHandIndex(0);

    setDealerHand(dHand);
    setGameState('playing');
    setMessage('');

    // Check for immediate Blackjack
    if (isBlackjack(pHand)) {
      // If blackjack, we need to resolve immediately. 
      // Since we just set state, we can't rely on it yet. 
      // But for single hand blackjack, it's simple.
      // We'll handle it via a slightly modified handleRoundEnd or just call it here.
      // However, handleRoundEnd now needs to handle multiple hands.
      // For now, let's just mark the hand as blackjack and resolve.

      // Actually, let's defer resolution to a useEffect or just call a modified resolve
      // But to keep it simple for this step, let's just call handleRoundEnd with the single hand structure
      // We will need to refactor handleRoundEnd next.

      // Temporary: passing array as before to not break everything immediately, 
      // but we will refactor handleRoundEnd to take hands array.
      handleRoundEnd([{ cards: pHand, bet: currentBet, status: 'blackjack' }], dHand);
    }
  };

  const keepBet = () => {
    // Check if player can afford current bet
    if (chips >= currentBet) {
      deal();
    } else {
      setPlayerHands([]);
      setCurrentHandIndex(0);
      setDealerHand([]);
      setGameState('betting');
      setMessage('Not enough chips for current bet. Please adjust.');
    }
  };

  const rebet = () => {
    setPlayerHands([]);
    setCurrentHandIndex(0);
    setDealerHand([]);
    setGameState('betting');
  };

  const hit = () => {
    soundManager.playDeal();

    // Clone hands to avoid mutation
    const newHands = [...playerHands];
    const currentHand = { ...newHands[currentHandIndex] };

    // Draw card
    const newCards = [...currentHand.cards, deck.draw()];
    currentHand.cards = newCards;

    // Update hand in array
    newHands[currentHandIndex] = currentHand;
    setPlayerHands(newHands);

    if (isBust(newCards)) {
      // Apply Second Chance: Ignore first bust per round
      const hasSecondChance = inventory.some(i => i.id === 'second_chance');

      if (hasSecondChance) {
        const savedCards = newCards.slice(0, -1); // Remove the bust card
        currentHand.cards = savedCards;
        newHands[currentHandIndex] = currentHand;
        setPlayerHands(newHands);

        setMessage('Second Chance! Bust avoided.');
        setInventory(prev => prev.filter(i => i.id !== 'second_chance'));
        return;
      }

      // Mark as busted
      currentHand.status = 'busted';
      newHands[currentHandIndex] = currentHand;
      setPlayerHands(newHands);

      setMessage('Bust!');

      // Move to next hand or end round
      handleHandComplete(newHands);
    }
  };

  const stand = () => {
    const newHands = [...playerHands];
    newHands[currentHandIndex].status = 'stood';
    setPlayerHands(newHands);
    handleHandComplete(newHands);
  };

  const handleHandComplete = (hands) => {
    if (currentHandIndex < hands.length - 1) {
      // Move to next hand
      setCurrentHandIndex(prev => prev + 1);
      setMessage(`Hand ${currentHandIndex + 2} Action`);
    } else {
      // All hands played, resolve round
      resolveRound(hands);
    }
  };

  const resolveRound = (hands) => {
    let currentDealerHand = [...dealerHand];

    // Dealer plays according to trait
    // Dealer only plays if at least one player hand is NOT busted/blackjack (optional rule, but standard is dealer plays out)
    // Actually, if all player hands are busted, dealer doesn't need to play.
    const allBusted = hands.every(h => h.status === 'busted');

    if (!allBusted) {
      while (shouldDealerHit(currentDealerHand, dealerTrait)) {
        currentDealerHand.push(deck.draw());
      }
      setDealerHand(currentDealerHand);
    } else {
      // Reveal dealer cards if they haven't been fully revealed (though they are usually hidden until now)
      // If we want to show the hole card, we just set the state.
      // But wait, if dealer doesn't play, we still want to show their hand?
      // Yes, usually.
    }

    const dValue = calculateHandValue(currentDealerHand);
    const dBlackjack = isBlackjack(currentDealerHand);

    // Calculate results for each hand
    // We need to pass the results to handleRoundEnd
    // But handleRoundEnd expects to calculate payouts.
    // Let's refactor handleRoundEnd to accept the final hands state and dealer hand.

    handleRoundEnd(hands, currentDealerHand);
  };

  const double = () => {
    const currentHand = playerHands[currentHandIndex];

    if (chips < currentHand.bet) {
      setMessage('Not enough chips to Double!');
      return;
    }

    // Double Down: Deduct bet again
    setChips(prev => prev - currentHand.bet);
    soundManager.playChip();

    // Draw 1 card, then Stand
    soundManager.playDeal();

    const newHands = [...playerHands];
    const updatedHand = { ...newHands[currentHandIndex] };

    updatedHand.bet *= 2;
    updatedHand.cards = [...updatedHand.cards, deck.draw()];

    newHands[currentHandIndex] = updatedHand;
    setPlayerHands(newHands);

    if (isBust(updatedHand.cards)) {
      // Check Second Chance
      const hasSecondChance = inventory.some(i => i.id === 'second_chance');
      if (hasSecondChance) {
        const savedCards = updatedHand.cards.slice(0, -1);
        updatedHand.cards = savedCards;
        // Revert bet doubling? Usually second chance saves the bust, but does it revert the double?
        // Let's say it keeps the double bet but saves the hand.

        newHands[currentHandIndex] = updatedHand;
        setPlayerHands(newHands);

        setMessage('Second Chance! Bust avoided. (Double Down)');
        setInventory(prev => prev.filter(i => i.id !== 'second_chance'));

        // Force stand after double
        updatedHand.status = 'stood';
        handleHandComplete(newHands);
        return;
      }

      updatedHand.status = 'busted';
      setMessage('Bust! (Double Down)');
      handleHandComplete(newHands);
    } else {
      updatedHand.status = 'stood';
      handleHandComplete(newHands);
    }
  };

  const split = () => {
    const currentHand = playerHands[currentHandIndex];

    // Validation (should be handled by UI disable state too)
    if (chips < currentHand.bet) {
      setMessage('Not enough chips to Split!');
      return;
    }

    if (currentHand.cards.length !== 2) return;

    // Check rank equality (or value equality? Standard is rank, but 10-J-Q-K are all 10 value)
    // Let's go with strict rank equality for now to be safe, or value equality if we want to be generous.
    // Standard blackjack usually allows splitting 10-value cards (e.g. J and K).
    // Let's use value equality.
    const card1Value = calculateHandValue([currentHand.cards[0]]);
    const card2Value = calculateHandValue([currentHand.cards[1]]);

    if (card1Value !== card2Value) {
      setMessage('Cannot split unlike cards!');
      return;
    }

    // Deduct bet for new hand
    setChips(prev => prev - currentHand.bet);
    soundManager.playChip();
    soundManager.playDeal();

    const newHands = [...playerHands];

    // Create two new hands
    const hand1 = {
      cards: [currentHand.cards[0], deck.draw()],
      bet: currentHand.bet,
      status: 'playing'
    };

    const hand2 = {
      cards: [currentHand.cards[1], deck.draw()],
      bet: currentHand.bet,
      status: 'playing'
    };

    // Replace current hand with these two
    // We insert them at currentHandIndex
    newHands.splice(currentHandIndex, 1, hand1, hand2);

    setPlayerHands(newHands);
    setMessage('Split!');

    // Check for Aces split - usually you only get one card and then stand.
    // But for simplicity, let's treat them as normal hands for now unless we want strict rules.
    // Strict rule: Split Aces get 1 card only.
    // Let's keep it simple: Normal play.
  };

  const handleRoundEnd = (hands, dHand) => {
    let totalPayout = 0;
    let roundMessages = [];
    const dValue = calculateHandValue(dHand);
    const dBlackjack = isBlackjack(dHand);

    hands.forEach((hand, index) => {
      const pValue = calculateHandValue(hand.cards);
      const pBlackjack = isBlackjack(hand.cards);
      let result = '';
      let payout = 0;

      if (hand.status === 'busted') {
        result = 'bust';
      } else if (hand.status === 'blackjack') {
        // If we marked it as blackjack during deal/split
        result = 'blackjack';
      } else {
        // Compare with dealer
        if (pBlackjack) {
          if (dBlackjack) {
            result = 'push';
          } else {
            result = 'blackjack';
          }
        } else if (dBlackjack) {
          result = 'loss';
        } else if (dValue > 21) {
          result = 'win';
        } else if (dValue > pValue) {
          result = 'loss';
        } else if (dValue < pValue) {
          result = 'win';
        } else {
          result = 'push';
        }
      }

      // Calculate Payout
      if (result === 'blackjack') {
        payout = calculatePayout('blackjack', hand.bet);
        soundManager.playWin();
        roundMessages.push(`Hand ${index + 1}: Blackjack!`);
      } else if (result === 'bust') {
        payout = calculatePayout('loss', hand.bet);
        roundMessages.push(`Hand ${index + 1}: Bust.`);
      } else if (result === 'win') {
        payout = calculatePayout('win', hand.bet);
        soundManager.playWin();
        roundMessages.push(`Hand ${index + 1}: Win!`);
      } else if (result === 'loss') {
        payout = calculatePayout('loss', hand.bet);
        roundMessages.push(`Hand ${index + 1}: Loss.`);
      } else if (result === 'push') {
        payout = calculatePayout('push', hand.bet);
        soundManager.playChip();
        roundMessages.push(`Hand ${index + 1}: Push.`);
      }

      // Apply Buffs
      const hasSafetyNet = inventory.some(i => i.id === 'safety_net');
      if (payout === 0 && hasSafetyNet) {
        payout += 5;
        // Only apply once per round or per hand? Let's say per hand for now to be generous
      }

      const hasHighRoller = inventory.some(i => i.id === 'high_roller');
      if (result === 'blackjack' && hasHighRoller) {
        payout *= 2;
      }

      totalPayout += payout;
    });

    if (totalPayout > 0 && !roundMessages.some(m => m.includes('Win') || m.includes('Blackjack'))) {
      // If we got money back but didn't win (e.g. push or safety net), play chip sound if not already played
      // soundManager.playChip(); // Already played in loop if push
    } else if (totalPayout === 0) {
      soundManager.playLose();
    }

    setChips(prev => {
      const newChips = prev + totalPayout;
      if (newChips < 10) {
        setTimeout(() => {
          setGameState('gameover');
          setMessage('Game Over! You went broke.');
        }, 1500);
      }
      return newChips;
    });

    setMessage(`${roundMessages.join(' | ')} (+$${totalPayout})`);

    if (chips + totalPayout >= 10) {
      const newChips = chips + totalPayout;
      const newHandIndex = handIndex + 1;

      // Check if we just completed the 5th hand (end of round)
      if (newHandIndex === HANDS_PER_ROUND) {
        // Debt enforcement: must pay debt before continuing
        const currentDebt = calculateDebt(round, inventory.some(i => i.id === 'charity') ? ['charity'] : []);

        if (newChips < currentDebt) {
          // Can't afford debt - game over
          setTimeout(() => {
            setGameState('gameover');
            setMessage(`Game Over! You can't afford your debt of $${currentDebt}.`);
          }, 1500);
        } else {
          // Can afford debt - force payment
          setGameState('debt_due');
          setMessage(`Round ${round} complete! You must pay your debt of $${currentDebt}.`);
        }
        setHandIndex(newHandIndex);
        return;
      }

      // If player can't afford current bet, force them to adjust
      if (newChips < currentBet) {
        setGameState('betting');
      } else {
        setGameState('finished');
      }
      setHandIndex(newHandIndex);
    } else {
      // Player is going broke, but we want to show the result (reveal cards) 
      // during the timeout before the Game Over screen appears.
      setGameState('finished');
    }
  };

  const buyItem = (item) => {
    if (chips >= item.cost) {
      setChips(prev => prev - item.cost);
      setInventory(prev => [...prev, item]);
      soundManager.playChip();
    }
  };

  const sellItem = (item) => {
    setInventory(prev => prev.filter(i => i.id !== item.id));
    const sellValue = Math.floor(item.cost / 2);
    setChips(prev => prev + sellValue);
    soundManager.playChip();
    setMessage(`Sold ${item.name} for $${sellValue}`);
  };

  const payDebt = () => {
    if (chips >= debt && debt > 0) {
      setChips(prev => prev - debt);
      soundManager.playChip();

      // Calculate new debt and advance round
      const modifiers = [];
      if (inventory.some(i => i.id === 'charity')) modifiers.push('charity');

      setDebt(calculateDebt(round + 1, modifiers));
      setRound(prev => prev + 1);
      setHandIndex(0);
      setGameState('betting');

      // Randomize Dealer Trait for next round
      const traits = ['standard', 'aggressive', 'conservative'];
      setDealerTrait(traits[Math.floor(Math.random() * traits.length)]);

      setMessage('Debt paid! Round ' + (round + 1) + ' starting...');
    }
  };

  const nextRound = () => {
    if (chips >= debt) {
      setChips(prev => prev - debt);

      const modifiers = [];
      if (inventory.some(i => i.id === 'charity')) modifiers.push('charity');

      setDebt(calculateDebt(round + 1, modifiers));
      setRound(prev => prev + 1);
      setHandIndex(0);
      setGameState('initial');

      // Randomize Dealer Trait for next round
      const traits = ['standard', 'aggressive', 'conservative'];
      setDealerTrait(traits[Math.floor(Math.random() * traits.length)]);

      setMessage('Round ' + (round + 1) + ' Start! Dealer is ' + dealerTrait);
    } else {
      setGameState('gameover');
      setMessage('Game Over! Not enough chips to pay debt.');
    }
  };

  const restartGame = () => {
    setChips(INITIAL_CHIPS);
    setDebt(INITIAL_DEBT);
    setRound(1);
    setHandIndex(0);
    setInventory([]);
    setPlayerHands([]);
    setCurrentHandIndex(0);
    setDealerHand([]);
    setGameState('initial');
    setMessage('New Game Started');
  };

  const toggleShop = () => {
    if (gameState === 'shop') {
      // Return to previous state
      setGameState(previousGameState || 'initial');
      setPreviousGameState(null);
    } else {
      // Go to shop
      setPreviousGameState(gameState);
      setGameState('shop');
    }
  };

  // Render Logic
  return (
    <>
      {/* Left Screen: Shop */}
      {leftNode && createPortal(
        <Shop
          items={shopItems}
          ownedItems={inventory}
          buyItem={buyItem}
          chips={chips}
          onClose={toggleShop}
          refreshCost={refreshCost}
          onRefresh={handleRefreshShop}
        />,
        leftNode
      )}

      {/* Center Screen: Game Board */}
      {centerNode && createPortal(
        <div className="app" style={{ background: 'transparent' }}>
          {gameState === 'shop' ? (
            <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <Shop
                items={shopItems}
                ownedItems={inventory}
                buyItem={buyItem}
                chips={chips}
                onClose={() => setGameState('betting')}
                refreshCost={refreshCost}
                onRefresh={handleRefreshShop}
              />
            </div>
          ) : gameState === 'debt_due' ? (
            <div style={{ textAlign: 'center', marginTop: '2rem', padding: '2rem', background: 'rgba(255, 0, 0, 0.1)', border: '3px solid #ff0000', borderRadius: '10px' }}>
              <h1 style={{ color: '#ff0000', fontSize: '2.5rem', marginBottom: '1rem' }}>DEBT DUE!</h1>
              <p className="message-area" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{message}</p>
              <p style={{ fontSize: '1rem', color: '#aaa', marginBottom: '2rem' }}>
                You must pay your debt to continue to the next round.
              </p>
              <button
                onClick={payDebt}
                style={{
                  fontSize: '1.5rem',
                  padding: '1rem 2rem',
                  background: '#ff0000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                PAY DEBT
              </button>
            </div>
          ) : gameState === 'gameover' ? (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <h1 style={{ color: 'red', fontSize: '3rem' }}>GAME OVER</h1>
              <p className="message-area">{message}</p>
              <button onClick={restartGame} style={{ fontSize: '1.5rem', padding: '1rem 2rem' }}>TRY AGAIN</button>
            </div>
          ) : (
            <div className="game-board" style={{ height: '100%', border: 'none', boxShadow: 'none' }}>
              <div className="hand-area">
                <h2>Dealer ({gameState === 'playing' ? '?' : calculateHandValue(dealerHand)}) <span style={{ fontSize: '0.8rem', color: '#aaa' }}>[{dealerTrait}]</span></h2>
                <div className="cards">
                  {dealerHand.map((card, i) => (
                    <div key={i}>
                      {gameState === 'playing' && i === 1 ? (
                        <div className="card-wrapper card-animate">
                          <img
                            src="./cards/tile000.png"
                            alt="Card Back"
                            className="pixel-card"
                            style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="card-back"></div>';
                            }}
                          />
                        </div>
                      ) : (
                        <Card card={card} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="message-area">
                <h3>{message}</h3>
              </div>

              <div className="hand-area" style={{ position: 'relative' }}>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                  {playerHands.map((hand, index) => (
                    <div
                      key={index}
                      style={{
                        opacity: index === currentHandIndex ? 1 : 0.5,
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                    >
                      <h2 style={{ fontSize: '1rem', marginBottom: '5px' }}>
                        Hand {index + 1} ({calculateHandValue(hand.cards)})
                      </h2>
                      <div className="cards">
                        {hand.cards.map((card, i) => (
                          <Card key={i} card={card} />
                        ))}
                      </div>
                      <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#aaa' }}>
                        Bet: ${hand.bet}
                      </div>
                      {/* Bet Stack for this hand */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                        <ChipStack amount={hand.bet} isBet={true} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Controls
                onHit={hit}
                onStand={stand}
                onDouble={double}
                onSplit={split}
                onDeal={deal}
                onKeepBet={keepBet}
                onRebet={rebet}
                gameState={gameState}
                canDouble={
                  playerHands[currentHandIndex] &&
                  playerHands[currentHandIndex].cards.length === 2 &&
                  chips >= playerHands[currentHandIndex].bet
                }
                canSplit={
                  playerHands[currentHandIndex] &&
                  playerHands[currentHandIndex].cards.length === 2 &&
                  calculateHandValue([playerHands[currentHandIndex].cards[0]]) === calculateHandValue([playerHands[currentHandIndex].cards[1]]) &&
                  chips >= playerHands[currentHandIndex].bet
                }
                onToggleShop={toggleShop}
                currentBet={currentBet}
                onChangeBet={setCurrentBet}
                chips={chips}
              />
            </div>
          )}
        </div>,
        centerNode
      )}

      {/* Right Screen: Stats & HUD */}
      {rightNode && createPortal(
        <div className="status-panel">
          <h2 style={{ color: '#00ff00', textAlign: 'center', margin: 0 }}>STATUS</h2>

          <HUD chips={chips} debt={debt} round={round} handIndex={handIndex} totalHands={HANDS_PER_ROUND} onPayDebt={payDebt} />

          <div style={{ flex: 1, border: '2px solid #333', padding: '0.5rem', overflowY: 'auto' }}>
            <h3 style={{ color: '#00ffff', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Active Buffs</h3>
            <BuffDisplay inventory={inventory} onSell={sellItem} />
          </div>

          <div style={{ border: '2px solid #333', padding: '0.5rem' }}>
            <h3 style={{ color: '#ffff00', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Info</h3>
            <p style={{ fontSize: '0.6rem', color: '#aaa', margin: '0.2rem 0' }}>Dealer Trait: {dealerTrait}</p>
            <p style={{ fontSize: '0.6rem', color: '#aaa', margin: '0.2rem 0' }}>Next Debt: ${calculateDebt(round + 1, inventory.some(i => i.id === 'charity') ? ['charity'] : [])}</p>
          </div>
        </div>,
        rightNode
      )}


    </>
  );


}

function App() {
  return (
    <Room>
      <Game />
    </Room>
  );
}

export default App;
