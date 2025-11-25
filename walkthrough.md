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
    - **Window Position**: `shopWinX`, `statusWinX`, `winY`, `winZ`.
    - **Background**: `bgX`, `bgY`, `bgZ`, `bgScale` (Adjust position and scale).
    - **Fix**: Updated `CockpitBackground` to accept dynamic props.
    - **Debug Card Button**: Removed (Verified & Integrated).

## Verification Results

### Automated Tests
- N/A (Visual change)

### Manual Verification
- [ ] Launch the app and verify the background is visible.
- [ ] Check if the stars from `StarField` are visible through any transparent parts of the cockpit image.
- [ ] Ensure the UI screens are still clearly visible and accessible.
