# Version 2.0 Changelog: Immersive 3D Glass Update

## Major Features

### 1. Immersive 3D Environment
- **3D Room**: Implemented a full 3D scene using `@react-three/fiber` and `@react-three/drei`.
- **Camera**: Added `PerspectiveCamera` and `OrbitControls` for a dynamic view.
- **Interactive Screens**: Created `ExpandableScreen` components for the **Shop** and **Status** panels that animate open/closed in 3D space.

### 2. Dynamic Video Background
- **Animated Cockpit**: Integrated `Animatedcockpit.mp4` as a panoramic video background using `useVideoTexture`.
- **Debug Controls**: Added real-time controls (`bgX`, `bgY`, `bgZ`, `bgScale`) to adjust the background position and scale.
- **Starfield**: Maintained the scrolling starfield effect for added depth.

### 3. Global Glass UI (Glassmorphism)
- **Translucent Design**: All UI panels (Game Board, Shop, Status, HUD) now feature a semi-transparent "glass" look.
- **CSS Variables**: Defined `--glass-bg` (20% black), `--glass-border` (30% white), and `--glass-backdrop` (blur 5px) for consistent styling.
- **Transparent Elements**:
    - **Buttons**: 30% black with blur.
    - **Cards**: 10% white glass look.
    - **Table**: Fully transparent center container.

### 4. UI Scaling & Readability
- **Super-Sized Text**: Significantly increased font sizes for Shop titles (`3em`), items (`2.5em`), and HUD stats (`2.5rem`).
- **Scaled Screens**: Increased the 3D scale of the Center Screen to `1.2` and Side Screens to `0.4` for better visibility.
- **Refined Layout**: Moved controls down to prevent overlapping with chips and removed borders from player hands.

### 5. Interaction Improvements
- **Independent Windows**: Shop and Status windows can now be toggled independently.
- **Zoom Disabled**: Removed zoom-on-click behavior for easier interaction with UI elements.
- **Pressed State**: Added visual feedback for 3D buttons (Shop/Status) when active.
- **Camera**: Fixed camera target to `[2, 1, 0]` and raised starting height to `5.0` (adjustable via `camY`).
- **Static View**: Removed parallax effect to ensure stable UI positioning.
- **Outlines Only**: Styled the main game board with a minimalist "outlines only" look (transparent background, subtle white border) to blend seamlessly with the cockpit.
- **Floating Controls**: Removed borders and background from the controls container, leaving only the buttons visible.
- **Controls Style**: Lifted controls up slightly (`margin-bottom: 4rem`) and changed button color to **cyan** to match the cockpit theme.

## Technical Details
- **Tech Stack**: React, Three.js, React Spring, Leva.
- **Assets**: Added `Animatedcockpit.mp4` and `cockpit2.png`.
- **Optimization**: Used `NearestFilter` for crisp pixel art rendering. Color** (Magenta for Shop, Green for Status) via `box-shadow`.
    - **Interaction**: 
        - **Independent Toggle**: Windows can be open simultaneously.
        - **Active State**: Button remains visible, background turns to **Theme Color**, text turns **Black**.
        - **Pressed Effect**: Button shifts down (`translate(2px, 2px)`) and shadow disappears when active.
        - **Decoupled Animation**: Window animates from button position while button stays static.
    - **Transition**: Window appears below the button.
    - Clicking 'X' minimizes the window.
- **Content Scaling**: Increased font sizes for better readability:
    - **Shop**: Title (`2em`), Chips (`1.5em`), Items (`1.5em`), Desc (`1.2em`).
    - **Status/HUD**: Labels (`0.8rem`), Values (`1.5rem`), Buff Icons (`50px`).
- Increased Side Screen resolution (`1000x1500`) and scale (`0.3`) for maximum visibility.
- Fixed background occlusion by setting `renderOrder={-1}` and `depthWrite={false}`.
- Added 3-state interaction: `Closed` (Button) -> `Open` (Angled Side) -> `Focused` (Zoomed).
- Fixed `Text` component naming conflict by aliasing as `DreiText`.
- **Debug Controls**: 
    - **Button Position**: `lbx`, `lby`, `lbz` (Left Button), `rbx`, `rby`, `rbz` (Right Button).
    - **Window Position**: `shopWinX` (-8.5), `statusWinX` (11.8), `winY`, `winZ`.
    - **Center Screen**: `cy` updated to `2.6`.
    - **UI Sizes**: Increased font sizes for Status window and Shop buttons.
    - **Background**: `bgX`, `bgY`, `bgZ`, `bgScale` (Adjust position and scale).
    - **Fix**: Updated `CockpitBackground` to accept dynamic props.
    - **Fix**: Resolved `ReferenceError` for `camY`.
    - **Fix**: Added 3-second delay at end of round to show final hand result.
    - **Feature**: Added **Start Menu** (Resume, New Game, Settings, Quit).
    - **Feature**: Added "MENU" button to HUD.
    - **Task Update**: Added new buff ideas to `task.md`.
    - **Feature**: Moved Start Menu to a 3D `ExpandableScreen` between Shop and Status.
    - **Refactor**: Reverted Menu Window to 2D overlay (per user request) but kept 3D Button.
    - **Fix**: Resolved `ReferenceError: menuOpen is not defined` by exposing state in `LayoutContext`.
    - **Cleanup**: Removed 2D "MENU" button and debug controls.
    - **Verification**: Confirmed `Safety Net` and `High Roller` buffs apply to all split hands.

### 6. Shiny Cards & New Buffs (v2.1)
- **Holographic Cards**: Implemented a stunning 3D holographic shiny effect for **ALL** cards.
    - **Interactive**: The effect reacts to mouse movement, creating a realistic foil look.
    - **Reset**: Cards snap back to their original state when the mouse leaves.
- **New Shop Buffs**:
    - **Pair Perfection**: Grants **100% of bet** if dealt a pair.
    - **Suit Synergy**: Grants **50% of bet** if dealt two cards of the same suit.
    - **Split Master**: Grants **150% of bet** instantly when splitting.
    - **Flush Fortune**: Winning with a Flush pays **3x** (3:1 odds).
    - **Poker Face**: Rewards 3-card poker hands (Player's 2 + Dealer's Up Card) with massive multipliers:
        - **Straight Flush**: 50x Bet
        - **Three of a Kind**: 30x Bet
        - **Straight**: 10x Bet
        - **Flush**: 5x Bet
- **Balance Tweaks**:
    - **Loaded Dice**: Now guarantees a starting hand of **17+** (was 19+).

## Verification Results

### Automated Tests
- N/A (Visual change)

### Manual Verification
- [x] Launch the app and verify the background is visible.
- [x] Check if the stars from `StarField` are visible through any transparent parts of the cockpit image.
- [x] Ensure the UI screens are still clearly visible and accessible.
- [x] Verify Shiny effect on cards.
- [x] Verify new Buffs appear in Shop and trigger correctly.
- [x] Verify Poker Face payouts.
