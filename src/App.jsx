import React, { useState, useEffect } from 'react';
import { PlinkoEngine } from './lib/plinko';
import { INITIAL_CHIPS, INITIAL_DEBT, calculateDebt } from './lib/economy';
import { BUFFS } from './lib/buffs';
import PlinkoBoard from './components/PlinkoBoard';
import BuffDisplay from './components/BuffDisplay';
import HUD from './components/HUD';
import Shop from './components/Shop';
import StartMenu from './components/StartMenu';
import { soundManager } from './lib/audio';
import './index.css';

function Game() {
  // Game State
  const [engine, setEngine] = useState(null);
  const [gameState, setGameState] = useState('initial'); // initial, playing, shop, gameover, start_menu
  const [message, setMessage] = useState('');

  // Economy & Progression State
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [debt, setDebt] = useState(INITIAL_DEBT);
  const [round, setRound] = useState(1);
  const [ballsDropped, setBallsDropped] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [currentBet, setCurrentBet] = useState(1);

  // Shop State
  const [shopItems, setShopItems] = useState([]);
  const [refreshCost, setRefreshCost] = useState(5);

  // Initialize shop items on mount
  useEffect(() => {
    refreshShopItems();
  }, []);

  // Initialize Engine
  useEffect(() => {
    const newEngine = new PlinkoEngine({
      rows: 15,
      gravity: 0.25,
      friction: 0.972,
      elasticity: 0.42
    });

    newEngine.onSlotHit = (multiplier, betValue, slot) => {
      handlePayout(multiplier, betValue, slot);
    };

    setEngine(newEngine);

    // Game Loop
    const interval = setInterval(() => {
      if (newEngine) {
        newEngine.update();
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  // Apply Buffs to Engine
  useEffect(() => {
    if (!engine) return;

    // Reset defaults
    engine.elasticity = 0.42;
    engine.gravity = 0.25;

    // Apply Inventory
    if (inventory.some(i => i.id === 'bouncy_balls')) engine.elasticity = 0.9;
    if (inventory.some(i => i.id === 'heavy_metal')) {
      engine.elasticity = 0.3;
      engine.gravity = 0.4;
    }
    if (inventory.some(i => i.id === 'gravity_well')) engine.gravity = 0.35;

    engine.hasMitosis = inventory.some(i => i.id === 'mitosis');
    engine.hasGhostProtocol = inventory.some(i => i.id === 'ghost_protocol');
    engine.hasPegSmasher = inventory.some(i => i.id === 'peg_smasher');
    engine.hasSecondWind = inventory.some(i => i.id === 'second_wind');
    engine.hasSniperSight = inventory.some(i => i.id === 'sniper_sight');

    const hasExpansion = inventory.some(i => i.id === 'expansion');
    if (engine.hasExpansion !== hasExpansion) {
      engine.hasExpansion = hasExpansion;
      engine.generateBoard(); // Regenerate board to add slot
    }

    // Safety Net
    if (inventory.some(i => i.id === 'safety_net')) {
      engine.slots.forEach(s => {
        if (s.multiplier < 0.5) {
          s.multiplier = 0.5;
          s.color = engine.getMultiplierColor(0.5);
        }
      });
    }

  }, [inventory, engine]);

  // Check for Round End
  useEffect(() => {
    if (ballsDropped >= 10) {
      // Wait a bit for the last ball to settle? 
      // For now, let's just trigger it immediately or maybe after a short delay if we had a way to track active balls.
      // Since we don't track active balls in state easily without frequent updates, we'll just trigger it.
      // Ideally, we should wait for engine.balls.length === 0.

      const checkEnd = setInterval(() => {
        if (engine && engine.balls.length === 0) {
          clearInterval(checkEnd);

          // Compound Interest
          if (inventory.some(i => i.id === 'compound_interest')) {
            const interest = Math.floor(chips * 0.05);
            if (interest > 0) {
              setChips(prev => prev + interest);
              setMessage(`Compound Interest: +$${interest}`);
            }
          }

          if (chips < debt) {
            setGameState('gameover');
            soundManager.playLose();
          } else {
            setGameState('round_complete');
            soundManager.playWin();
          }
        }
      }, 500);

      return () => clearInterval(checkEnd);
    }
  }, [ballsDropped, chips, debt, engine, inventory]);

  const [lastHitSlotIndex, setLastHitSlotIndex] = useState(-1);

  const handlePayout = (multiplier, betValue, slot) => {
    let finalMult = finalMultiplier(multiplier);

    // Combo Master
    if (inventory.some(i => i.id === 'combo_master')) {
      // Find slot index
      const slotIndex = engine.slots.indexOf(slot);
      if (slotIndex !== -1 && slotIndex === lastHitSlotIndex) {
        finalMult += 0.5;
        setMessage(`COMBO! +0.5x`);
      }
      setLastHitSlotIndex(slotIndex);
    }

    const payout = Math.floor(betValue * finalMult);

    setChips(prev => prev + payout);
    soundManager.playChip();

    if (payout > betValue) {
      soundManager.playWin();
      setMessage(`Win! ${finalMult}x (+$${payout})`);
    } else {
      setMessage(`Hit: ${finalMult}x (+$${payout})`);
    }
  };

  const finalMultiplier = (m) => {
    // Wall Bounce Buff Logic could go here if we tracked wall hits
    return m;
  }

  const refreshShopItems = () => {
    const shuffled = [...BUFFS].sort(() => 0.5 - Math.random());
    setShopItems(shuffled.slice(0, 4));
  };

  const handleRefreshShop = () => {
    if (chips >= refreshCost) {
      setChips(prev => prev - refreshCost);
      setRefreshCost(prev => prev + 10);
      refreshShopItems();
    }
  };

  const dropBall = () => {
    if (ballsDropped >= 10) return; // Prevent dropping more

    if (chips < currentBet) {
      setMessage('Not enough chips!');
      return;
    }

    setChips(prev => prev - currentBet);
    soundManager.playDeal();

    if (engine) {
      engine.dropBall(0, currentBet);
      setBallsDropped(prev => prev + 1);

      // Multi-Ball Buff
      if (inventory.some(i => i.id === 'multi_ball') && Math.random() < 0.1) {
        setTimeout(() => {
          engine.dropBall(10, currentBet);
          setMessage('Multi-Ball Bonus!');
        }, 200);
      }
    }
  };

  const buyItem = (item) => {
    const inflation = Math.pow(1.1, round - 1);
    const cost = Math.floor(item.cost * inflation);

    if (chips >= cost) {
      setChips(prev => prev - cost);
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
      setDebt(calculateDebt(round + 1, modifiers));
      setRound(prev => prev + 1);
      setBallsDropped(0);
      setGameState('playing');

      setMessage('Debt paid! Round ' + (round + 1) + ' starting...');
    } else {
      setMessage('Not enough chips to pay debt!');
    }
  };

  return (
    <div className="app-container">
      <div className="scanline"></div>

      {/* Header / HUD */}
      <header className="game-header">
        <h1 className="game-title">PLINKO PIT</h1>
        <HUD chips={chips} debt={debt} round={round} drops={ballsDropped} message={message} />
      </header>

      <main className="game-main">
        {/* Left Column: Shop */}
        <section className="panel left-panel">
          <Shop
            items={shopItems}
            inventory={inventory}
            buyItem={buyItem}
            onRefresh={handleRefreshShop}
            refreshCost={refreshCost}
            chips={chips}
            round={round}
          />
        </section>

        {/* Center Column: Board */}
        <section className="panel center-panel">
          <div className="board-container">
            <PlinkoBoard engine={engine} />
          </div>
        </section>

        {/* Right Column: Controls */}
        <section className="panel right-panel">
          <div className="controls-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3>BET: $</h3>
              <input
                type="number"
                min="1"
                max={chips}
                value={currentBet}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val > chips) val = chips;
                  if (val < 1) val = 1;
                  setCurrentBet(val);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '2px solid #00ff00',
                  color: '#00ff00',
                  fontFamily: '"Press Start 2P", cursive',
                  fontSize: '1.2rem',
                  width: '100px',
                  textAlign: 'right'
                }}
              />
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, chips)}
              step="1"
              value={currentBet}
              onChange={(e) => setCurrentBet(parseInt(e.target.value))}
              className="retro-slider"
            />
            <button onClick={dropBall} className="retro-btn primary-btn">DROP BALL</button>
          </div>

          <div className="controls-group">
            <button
              onClick={payDebt}
              disabled={chips < debt}
              className={`retro-btn ${chips >= debt ? 'success-btn' : 'disabled-btn'}`}
            >
              PAY DEBT (${debt})
            </button>
          </div>

          <div className="controls-group">
            <h3>INVENTORY</h3>
            <BuffDisplay inventory={inventory} onSell={sellItem} />
          </div>
        </section>
      </main>

      {/* Round Complete Overlay */}
      {gameState === 'round_complete' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', height: 'auto' }}>
            <h2 style={{ color: '#00ff00', fontSize: '2rem', marginBottom: '20px' }}>ROUND COMPLETE</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>You have survived another round.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '30px', color: '#ff0000' }}>DEBT DUE: ${debt}</p>

            <button
              onClick={payDebt}
              className="retro-btn success-btn"
              style={{ fontSize: '1.5rem', padding: '20px' }}
            >
              PAY DEBT & CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', height: 'auto' }}>
            <h2 style={{ color: '#ff0000', fontSize: '3rem', marginBottom: '20px' }}>GAME OVER</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>You failed to pay your debt.</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '30px', color: '#ffd700' }}>FINAL SCORE: Round {round}</p>

            <button
              onClick={() => window.location.reload()}
              className="retro-btn primary-btn"
              style={{ fontSize: '1.5rem', padding: '20px' }}
            >
              RESTART
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
