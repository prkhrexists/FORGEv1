# Frontend Guide

## Overview

The frontend is a React 19 + TypeScript application built with Vite, featuring a 3D simulation workspace rendered with Three.js and a suite of career-oriented UI panels.

## Entry Points

| File | Purpose |
|------|---------|
| `index.html` | HTML shell with meta tags and root div |
| `src/main.tsx` | React DOM bootstrap |
| `src/App.tsx` | Root component — layout, routing, modal orchestration |
| `src/index.css` | Global styles, Tailwind import, custom theme |

## Component Architecture

### Layout Structure

The app uses a **fixed viewport layout** with three regions:

```
┌──────────────────────────────────────────────────┐
│  Header (mode switcher, controls, branding)       │
├──────────────────────────────────────────────────┤
│  PhaseOneControlPanel (brief input bar)           │
├────────┬─────────────────────────────┬───────────┤
│        │                             │           │
│ Action │    SimulationView           │ Inspector │
│  Log   │    (3D Canvas)              │   Panel   │
│ Panel  │                             │           │
│        │                             │           │
│        ├─────────────────────────────┤           │
│        │  KanbanPanel (task board)   │           │
├────────┴─────────────────────────────┴───────────┤
│  [Modals: ResumeForge, NexusHunter, NexusMirror] │
└──────────────────────────────────────────────────┘
```

### Key Components

#### Panels (Always Visible)

| Component | File | Purpose |
|-----------|------|---------|
| `Header` | `interface/Header.tsx` | Top bar with mode switcher, BYOK, pricing, info |
| `PhaseOneControlPanel` | `interface/PhaseOneControlPanel.tsx` | Brief input, reference images, project launch |
| `ActionLogPanel` | `interface/ActionLogPanel.tsx` | Left sidebar — real-time agent activity feed |
| `InspectorPanel` | `interface/InspectorPanel.tsx` | Right sidebar — selected agent info, debug logs |
| `KanbanPanel` | `interface/KanbanPanel.tsx` | Bottom drawer — task pipeline board |
| `SimulationView` | `interface/SimulationView.tsx` | 3D canvas container with fullscreen toggle |

#### Modals (On-Demand)

| Component | File | Trigger |
|-----------|------|---------|
| `ResumeForgeModal` | `interface/ResumeForgeModal.tsx` | Header "Resume Forge" button |
| `NexusHunterModal` | `interface/NexusHunterModal.tsx` | Header "Job Hunter" button |
| `NexusMirrorModal` | `interface/NexusMirrorModal.tsx` | Header "Nexus-Mirror" button |
| `FinalOutputModal` | `interface/FinalOutputModal.tsx` | Auto-opens on project completion |
| `OutputReviewModal` | `interface/OutputReviewModal.tsx` | HITL review checkpoint |
| `AuditModal` | `interface/AuditModal.tsx` | Task audit/detail view |
| `BYOKModal` | `interface/BYOKModal.tsx` | Bring Your Own Key API config |
| `PricingModal` | `interface/PricingModal.tsx` | Token usage & cost estimation |
| `InfoModal` | `interface/InfoModal.tsx` | About/help dialog |
| `DeleteTaskModal` | `interface/DeleteTaskModal.tsx` | Task deletion confirmation |
| `ResetModal` | `interface/ResetModal.tsx` | Project reset confirmation |
| `TeamFlowModal` | `interface/TeamFlowModal.tsx` | Team configuration details |

#### Visual Configurator (React Flow)

| Component | File | Purpose |
|-----------|------|---------|
| `VisualConfigurator` | `VisualConfigurator/VisualConfigurator.tsx` | Main flow editor |
| `AgentConfigPanel` | `VisualConfigurator/AgentConfigPanel.tsx` | Agent settings sidebar |
| `TeamCard` | `VisualConfigurator/TeamCard.tsx` | Team preset selection |
| `TeamsPanel` | `VisualConfigurator/TeamsPanel.tsx` | Team list panel |
| `VisualFlowNode` | `VisualConfigurator/nodes/VisualFlowNode.tsx` | Custom flow node |
| `DirectionalEdge` | `VisualConfigurator/edges/DirectionalEdge.tsx` | Custom flow edge |
| `ColorPicker` | `VisualConfigurator/ColorPicker.tsx` | Agent color selector |

#### Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| `Avatar` | `components/Avatar.tsx` | Agent avatar with expression system |
| `InfoBubble` | `components/InfoBubble.tsx` | Floating info tooltip |
| `InfoTooltip` | `components/InfoTooltip.tsx` | Hover tooltip |
| `ReferenceImages` | `components/ReferenceImages.tsx` | Reference image carousel |
| `TeamBadge` | `components/TeamBadge.tsx` | Team identifier badge |
| `TeamOutputBadge` | `components/TeamOutputBadge.tsx` | Output type indicator |

## State Management

Three Zustand stores manage all application state:

### `coreStore` (775 lines)
The main store—handles project lifecycle, tasks, action/debug logs, career data, resume analysis, job discovery results, and interview sessions.

### `teamStore`
Manages agent team configurations, custom agentic systems, and the active team selection.

### `uiStore`
Character-level UI state: selected/hovered NPCs, chat state, BYOK config, screen positions.

## 3D Simulation Engine

Located in `src/simulation/`:

| Module | Purpose |
|--------|---------|
| `SceneManager` | Three.js scene lifecycle, camera, lights, renderer |
| `CharacterController` | High-level character management |
| `CharacterManager` | GPU-instanced mesh, animations, expressions |
| `CharacterStateMachine` | State → animation declarative mapping |
| `AgentStateBuffer` | Float32Array agent state synchronization |
| `ExpressionBuffer` | Facial expression atlas management |
| `DriverManager` | Registers per-agent behavior drivers |
| `NpcAgentDriver` | AI-controlled NPC behavior (goal-seeking) |
| `PlayerInputDriver` | User-controlled character input |
| `NavMeshManager` | Three-pathfinding navmesh loading |
| `PathAgent` | Individual pathfinding agent |
| `InputManager` | Mouse/keyboard input handling |
| `PoiManager` | Points-of-interest management |
| `WorldManager` | World geometry and environment |

## Styling

- **TailwindCSS v4** via `@tailwindcss/vite` plugin
- **Inter** font from Google Fonts
- Custom theme token: `--color-darkDelegation: #313437`
- Markdown content styles defined in `index.css`

## Type System

Core types are defined in `src/types.ts`:
- `CharacterState`, `AgentState` — 3D character state
- `AnimationName`, `CharacterStateKey` — animation system
- `PoiDef` — points of interest
- `ICharacterDriver`, `IAgentDriver` — driver interfaces
- `ExpressionKey`, `ExpressionConfig` — facial expressions

Agent-specific types are in `src/data/agents.ts`:
- `AgentNode`, `AgenticSystem`, `OutputType`
