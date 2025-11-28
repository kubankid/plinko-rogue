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
import StartMenu from './components/StartMenu';
import { soundManager } from './lib/audio';
import './index.css';

import Room from './components/Room';

import { createPortal } from 'react-dom';
import { useLayout } from './components/LayoutContext';

function Game() {
  // Game State
  const [deck, setDeck] = useState(new Deck());
  const [playerHands, setPlayerHands] = useState([]); // Array of { cards: [], bet: number, status: 'playing'|'stood'|'busted'|'blackjack' }
  const [currentHandIndex, setCurrentHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameState, setGameState] = useState('initial'); // initial, playing, finished, shop, gameover, start_menu
  const [message, setMessage] = useState('');

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

  // Layout Debugger State
  const [showDebugger, setShowDebugger] = useState(true); // Show for adjustments
  const [tableOffsetY, setTableOffsetY] = useState(-1.5);
  const [tableOffsetX, setTableOffsetX] = useState(0);
  const [dealerCardsOffsetY, setDealerCardsOffsetY] = useState(0);
  const [messageAreaOffsetY, setMessageAreaOffsetY] = useState(-1.5);
  const [playerCardsOffsetY, setPlayerCardsOffsetY] = useState(3);
  const [playerCardsOffsetX, setPlayerCardsOffsetX] = useState(0);
  const [gameplayButtonsOffsetY, setGameplayButtonsOffsetY] = useState(3.5);
  const [gameplayButtonsOffsetX, setGameplayButtonsOffsetX] = useState(0);
  const [bettingScreenOffsetY, setBettingScreenOffsetY] = useState(4);
  const [bettingScreenOffsetX, setBettingScreenOffsetX] = useState(0);



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

  const { leftNode, centerNode, rightNode, menuNode, menuOpen, setMenuOpen } = useLayout();

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  const handleQuit = () => {
    window.close();
  };

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
      // Force first two cards to be high value (e.g., 10 and 7/8/9/10/A)
      newDeck.manipulateNextDraw(10);
      newDeck.manipulateNextDraw(7);
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
      handleRoundEnd([{ cards: pHand, bet: currentBet, status: 'blackjack' }], dHand);
    } else {
      // Apply Deal Buffs
      let bonusChips = 0;
      let buffMessages = [];

      // Pair Perfection
      if (inventory.some(i => i.id === 'pair_perfection')) {
        if (pHand[0].rank === pHand[1].rank) {
          const bonus = Math.floor(currentBet * 1.0);
          bonusChips += bonus;
          buffMessages.push(`Pair Perfection! +${bonus}`);
        }
      }

      // Suit Synergy
      if (inventory.some(i => i.id === 'suit_synergy')) {
        if (pHand[0].suit === pHand[1].suit) {
          const bonus = Math.floor(currentBet * 0.5);
          bonusChips += bonus;
          buffMessages.push(`Suit Synergy! +${bonus}`);
        }
      }

      // Poker Face
      if (inventory.some(i => i.id === 'poker_face')) {
        const pokerCards = [...pHand, dHand[0]];
        const pokerResult = evaluatePokerHand(pokerCards);
        if (pokerResult) {
          const bonus = Math.floor(currentBet * pokerResult.multiplier);
          bonusChips += bonus;
          buffMessages.push(`${pokerResult.name}! +${bonus}`);
        }
      }

      if (bonusChips > 0) {
        setChips(prev => prev + bonusChips);
        soundManager.playChip();
        setMessage(prev => prev ? `${prev} | ${buffMessages.join(' | ')}` : buffMessages.join(' | '));
      }
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
    const allBusted = hands.every(h => h.status === 'busted');

    if (!allBusted) {
      while (shouldDealerHit(currentDealerHand, dealerTrait)) {
        currentDealerHand.push(deck.draw());
      }
      setDealerHand(currentDealerHand);
    }

    const dValue = calculateHandValue(currentDealerHand);
    const dBlackjack = isBlackjack(currentDealerHand);

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

    if (chips < currentHand.bet) {
      setMessage('Not enough chips to Split!');
      return;
    }

    if (currentHand.cards.length !== 2) return;

    const card1Value = calculateHandValue([currentHand.cards[0]]);
    const card2Value = calculateHandValue([currentHand.cards[1]]);

    if (card1Value !== card2Value) {
      setMessage('Cannot split unlike cards!');
      return;
    }

    // Deduct bet for new hand
    setChips(prev => prev - currentHand.bet);

    // Split Master Buff
    if (inventory.some(i => i.id === 'split_master')) {
      const bonus = Math.floor(currentHand.bet * 1.5);
      setChips(prev => prev + bonus);
      setMessage(`Split Master! +${bonus} Chips`);
    }

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
    newHands.splice(currentHandIndex, 1, hand1, hand2);

    setPlayerHands(newHands);
    setMessage('Split!');
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
        result = 'blackjack';
      } else {
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

      // Flush Fortune Buff
      if ((result === 'win' || result === 'blackjack') && inventory.some(i => i.id === 'flush_fortune')) {
        const firstSuit = hand.cards[0].suit;
        const isFlush = hand.cards.every(c => c.suit === firstSuit);
        if (isFlush) {
          // 3x Payout (3:1 odds) -> Return 4x bet (original bet + 3x winnings)
          // Standard win is 2x bet (original bet + 1x winnings)
          // So we add 2x bet to the payout
          payout += (hand.bet * 2);
          roundMessages.push(`Hand ${index + 1}: Flush Fortune! (3x Payout)`);
        }
      }

      // Apply Buffs
      const hasSafetyNet = inventory.some(i => i.id === 'safety_net');
      if (payout === 0 && hasSafetyNet) {
        payout += 5;
      }

      const hasHighRoller = inventory.some(i => i.id === 'high_roller');
      if (result === 'blackjack' && hasHighRoller) {
        payout *= 2;
      }

      totalPayout += payout;
    });

    if (totalPayout > 0 && !roundMessages.some(m => m.includes('Win') || m.includes('Blackjack'))) {
      // soundManager.playChip(); 
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

      if (newHandIndex === HANDS_PER_ROUND) {
        setGameState('round_resolution');

        setTimeout(() => {
          const currentDebt = calculateDebt(round, inventory.some(i => i.id === 'charity') ? ['charity'] : []);

          if (newChips < currentDebt) {
            setGameState('gameover');
            setMessage(`Game Over! You can't afford your debt of $${currentDebt}.`);
          } else {
            setGameState('debt_due');
            setMessage(`Round ${round} complete! You must pay your debt of $${currentDebt}.`);
          }
          setHandIndex(newHandIndex);
        }, 3000);
        return;
      }

      if (newChips < currentBet) {
        setGameState('betting');
      } else {
        setGameState('finished');
      }
      setHandIndex(newHandIndex);
    } else {
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

      const modifiers = [];
      if (inventory.some(i => i.id === 'charity')) modifiers.push('charity');

      setDebt(calculateDebt(round + 1, modifiers));
      setRound(prev => prev + 1);
      setHandIndex(0);
      setGameState('betting');

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
      setGameState(previousGameState || 'initial');
      setPreviousGameState(null);
    } else {
      setPreviousGameState(gameState);
      setGameState('shop');
    }
  };

  return (
    <>
      {/* Layout Debugger */}
      {showDebugger && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '15px',
          borderRadius: '8px',
          zIndex: 10000,
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '12px',
          border: '2px solid #00ffff',
          maxHeight: '90vh',
          overflowY: 'auto',
          minWidth: '250px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#00ffff', textAlign: 'center' }}>Layout Debugger</h3>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ff00ff' }}>Entire Table</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {tableOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={tableOffsetY}
              onChange={(e) => setTableOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <label style={{ display: 'block', marginBottom: '5px' }}>X Offset: {tableOffsetX}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={tableOffsetX}
              onChange={(e) => setTableOffsetX(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>Dealer Cards</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {dealerCardsOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={dealerCardsOffsetY}
              onChange={(e) => setDealerCardsOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00ff00' }}>Message Area</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {messageAreaOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={messageAreaOffsetY}
              onChange={(e) => setMessageAreaOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ffff00' }}>Player Cards</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {playerCardsOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={playerCardsOffsetY}
              onChange={(e) => setPlayerCardsOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <label style={{ display: 'block', marginBottom: '5px' }}>X Offset: {playerCardsOffsetX}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={playerCardsOffsetX}
              onChange={(e) => setPlayerCardsOffsetX(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ffff00' }}>Gameplay Buttons</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {gameplayButtonsOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={gameplayButtonsOffsetY}
              onChange={(e) => setGameplayButtonsOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <label style={{ display: 'block', marginBottom: '5px' }}>X Offset: {gameplayButtonsOffsetX}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={gameplayButtonsOffsetX}
              onChange={(e) => setGameplayButtonsOffsetX(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ffff00' }}>Betting Screen</h4>
            <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {bettingScreenOffsetY}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={bettingScreenOffsetY}
              onChange={(e) => setBettingScreenOffsetY(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <label style={{ display: 'block', marginBottom: '5px' }}>X Offset: {bettingScreenOffsetX}rem</label>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={bettingScreenOffsetX}
              onChange={(e) => setBettingScreenOffsetX(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <button onClick={() => {
            console.log('Layout Values:', {
              tableOffsetY,
              tableOffsetX,
              dealerCardsOffsetY,
              messageAreaOffsetY,
              playerCardsOffsetY,
              playerCardsOffsetX,
              gameplayButtonsOffsetY,
              gameplayButtonsOffsetX,
              bettingScreenOffsetY,
              bettingScreenOffsetX
            });
            alert('Values logged to console!');
          }} style={{
            width: '100%',
            padding: '8px',
            background: '#00ffff',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}>
            Log Values
          </button>
        </div>
      )}

      <button
        onClick={() => setShowDebugger(!showDebugger)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          zIndex: 10000,
          padding: '8px 12px',
          background: '#333',
          color: '#fff',
          border: '2px solid #00ffff',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '11px'
        }}
      >
        {showDebugger ? 'Hide Debugger' : 'Show Debugger'}
      </button>

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
        <div className="app" style={{
          background: 'transparent',
          position: 'relative',
          transform: `translate(${tableOffsetX}rem, ${tableOffsetY}rem)`
        }}>
          {/* Menu Overlay */}
          {menuOpen && (
            <StartMenu
              onResume={() => setMenuOpen(false)}
              onNewGame={() => {
                restartGame();
                setMenuOpen(false);
              }}
              onSettings={() => setMessage("Settings not implemented yet.")}
              onQuit={handleQuit}
            />
          )}

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
              <div className="hand-area" style={{
                transform: `translateY(${dealerCardsOffsetY}rem)`
              }}>
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
                        <Card
                          card={card}
                          shiny={true}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="message-area" style={{
                transform: `translateY(${messageAreaOffsetY}rem)`
              }}>
                <h3>{message}</h3>
              </div>

              <div className="game-board" style={{ height: '100%', border: 'none', boxShadow: 'none' }}>
                <div className="hand-area" style={{
                  position: 'relative',
                  transform: `translate(${playerCardsOffsetX}rem, ${playerCardsOffsetY - 1}rem)`
                }}>

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
                        {/* Bet Stack for this hand - moved above cards */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                          <ChipStack amount={hand.bet} isBet={true} />
                        </div>
                        <div className="cards">
                          {hand.cards.map((card, i) => (
                            <Card
                              key={i}
                              card={card}
                              shiny={true}
                            />
                          ))}
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
                  gameplayButtonsOffsetX={gameplayButtonsOffsetX}
                  gameplayButtonsOffsetY={gameplayButtonsOffsetY}
                  bettingScreenOffsetX={bettingScreenOffsetX}
                  bettingScreenOffsetY={bettingScreenOffsetY}
                />
              </div>
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
            <h3 style={{ color: '#00ffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Active Buffs</h3>
            <BuffDisplay inventory={inventory} onSell={sellItem} />
          </div>

          <div style={{ border: '2px solid #333', padding: '0.5rem' }}>
            <h3 style={{ color: '#ffff00', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Info</h3>
            <p style={{ fontSize: '1rem', color: '#aaa', margin: '0.2rem 0' }}>Dealer Trait: {dealerTrait}</p>
            <p style={{ fontSize: '1rem', color: '#aaa', margin: '0.2rem 0' }}>Next Debt: ${calculateDebt(round + 1, inventory.some(i => i.id === 'charity') ? ['charity'] : [])}</p>
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

function evaluatePokerHand(cards) {
  const ranks = cards.map(c => {
    if (c.rank === 'A') return 14;
    if (c.rank === 'K') return 13;
    if (c.rank === 'Q') return 12;
    if (c.rank === 'J') return 11;
    return parseInt(c.rank);
  }).sort((a, b) => a - b);

  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Check Straight
  let isStraight = (ranks[2] - ranks[1] === 1) && (ranks[1] - ranks[0] === 1);
  // Special case: A-2-3 (14, 2, 3) -> sorted: 2, 3, 14
  if (!isStraight && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14) {
    isStraight = true;
  }

  // Check Three of a Kind
  const isTrips = ranks[0] === ranks[1] && ranks[1] === ranks[2];

  if (isFlush && isStraight) return { name: 'Straight Flush', multiplier: 50 };
  if (isTrips) return { name: 'Three of a Kind', multiplier: 30 };
  if (isStraight) return { name: 'Straight', multiplier: 10 };
  if (isFlush) return { name: 'Flush', multiplier: 5 };

  return null;
}
