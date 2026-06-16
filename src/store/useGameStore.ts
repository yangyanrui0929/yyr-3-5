import { create } from 'zustand';
import {
  GridCell,
  ToolType,
  GRID_SIZE,
  DAY_LENGTH,
  FAULT_CHANCE,
  BUILDING_STATS,
  DAY_THRESHOLD,
} from '../utils/constants';
import { calculatePowerNetwork, countPoweredBuildings } from '../utils/powerCalculator';

const STORAGE_KEY = 'floating-island-grid-game-save';
const SNAPSHOT_KEY = 'floating-island-grid-snapshots';

interface PersistedState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  satisfaction: number;
}

export interface GridSnapshot {
  id: string;
  name: string;
  timestamp: number;
  grid: GridCell[][];
  poweredCells: string[];
  satisfaction: number;
  storedPower: number;
  maxStorage: number;
  totalGeneration: number;
  totalConsumption: number;
  dayTime: number;
}

type CellDiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface CellDiff {
  type: CellDiffType;
  oldType?: string;
  newType?: string;
  oldRotation?: number;
  newRotation?: number;
}

interface GameState {
  grid: GridCell[][];
  dayTime: number;
  storedPower: number;
  maxStorage: number;
  satisfaction: number;
  selectedTool: ToolType;
  poweredCells: Set<string>;
  totalGeneration: number;
  totalConsumption: number;
  showSettlement: boolean;
  snapshots: GridSnapshot[];
  activeSnapshotId: string | null;
  setSelectedTool: (tool: ToolType) => void;
  placeOrRemove: (x: number, y: number) => void;
  rotateCell: (x: number, y: number) => void;
  repairCell: (x: number, y: number) => void;
  tick: () => void;
  resetGame: () => void;
  openSettlement: () => void;
  closeSettlement: () => void;
  saveSnapshot: (name?: string) => string;
  selectSnapshot: (id: string | null) => void;
  deleteSnapshot: (id: string) => void;
  renameSnapshot: (id: string, name: string) => void;
  clearSnapshots: () => void;
  computeDiff: () => Map<string, CellDiff> | null;
}

function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({
        x,
        y,
        type: 'empty',
        rotation: 0,
        powered: false,
        faulty: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

function saveToLocalStorage(state: PersistedState): void {
  try {
    const data = JSON.stringify({
      grid: state.grid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // ignore storage errors
  }
}

function loadFromLocalStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.grid && Array.isArray(data.grid)) {
      return {
        grid: data.grid,
        dayTime: data.dayTime ?? 20,
        storedPower: data.storedPower ?? 10,
        satisfaction: data.satisfaction ?? 50,
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveSnapshotsToLocalStorage(snapshots: GridSnapshot[]): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
  } catch {
    // ignore storage errors
  }
}

function loadSnapshotsFromLocalStorage(): GridSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.filter(
        (s) =>
          s &&
          typeof s.id === 'string' &&
          s.grid &&
          Array.isArray(s.grid)
      );
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function recalcGrid(grid: GridCell[][], dayTime: number, storedPower: number) {
  const { poweredCells, totalGeneration, totalConsumption, batteryCapacity } =
    calculatePowerNetwork(grid, dayTime, storedPower);

  const newGrid = grid.map((row) => row.map((c) => ({ ...c })));
  for (let yy = 0; yy < GRID_SIZE; yy++) {
    for (let xx = 0; xx < GRID_SIZE; xx++) {
      newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
    }
  }

  return { newGrid, poweredCells, totalGeneration, totalConsumption, batteryCapacity };
}

function initGame(): Omit<GameState, keyof GameStateActions> {
  const saved = loadFromLocalStorage();
  const grid = saved ? saved.grid : createEmptyGrid();
  const dayTime = saved ? saved.dayTime : 20;
  const storedPower = saved ? saved.storedPower : 10;
  const satisfaction = saved ? saved.satisfaction : 50;
  const snapshots = loadSnapshotsFromLocalStorage();

  const { newGrid, poweredCells, totalGeneration, totalConsumption, batteryCapacity } =
    recalcGrid(grid, dayTime, storedPower);

  return {
    grid: newGrid,
    dayTime,
    storedPower,
    maxStorage: batteryCapacity,
    satisfaction,
    selectedTool: 'windmill',
    poweredCells,
    totalGeneration,
    totalConsumption,
    showSettlement: false,
    snapshots,
    activeSnapshotId: null,
  };
}

type GameStateActions = Pick<
  GameState,
  | 'setSelectedTool'
  | 'placeOrRemove'
  | 'rotateCell'
  | 'repairCell'
  | 'tick'
  | 'resetGame'
  | 'openSettlement'
  | 'closeSettlement'
  | 'saveSnapshot'
  | 'selectSnapshot'
  | 'deleteSnapshot'
  | 'renameSnapshot'
  | 'clearSnapshots'
  | 'computeDiff'
>;

export const useGameStore = create<GameState>((set, get) => ({
  ...initGame(),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  placeOrRemove: (x, y) => {
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    const cell = newGrid[y][x];
    const tool = state.selectedTool;

    if (tool === 'remove') {
      if (cell.type !== 'empty') {
        newGrid[y][x] = {
          ...cell,
          type: 'empty',
          rotation: 0,
          powered: false,
          faulty: false,
        };
      }
    } else {
      newGrid[y][x] = {
        ...cell,
        type: tool,
        rotation: tool === 'wire' ? cell.rotation % 6 : 0,
        powered: false,
        faulty: false,
      };
    }

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  rotateCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (cell.type !== 'wire') return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    newGrid[y][x].rotation = (cell.rotation + 1) % 6;

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  repairCell: (x, y) => {
    const state = get();
    const cell = state.grid[y][x];
    if (!cell.faulty) return;

    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));
    newGrid[y][x].faulty = false;

    const result = recalcGrid(newGrid, state.dayTime, state.storedPower);

    const nextState = {
      grid: result.newGrid,
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      maxStorage: result.batteryCapacity,
    };

    saveToLocalStorage({
      grid: result.newGrid,
      dayTime: state.dayTime,
      storedPower: state.storedPower,
      satisfaction: state.satisfaction,
    });

    set(nextState);
  },

  tick: () => {
    const state = get();
    const newGrid = state.grid.map((row) => row.map((c) => ({ ...c })));

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = newGrid[y][x];
        if (cell.type !== 'empty' && !cell.faulty && Math.random() < FAULT_CHANCE) {
          newGrid[y][x].faulty = true;
        }
      }
    }

    const newDayTime = (state.dayTime + 0.5) % DAY_LENGTH;

    const { poweredCells, totalGeneration, totalConsumption, batteryCapacity } =
      calculatePowerNetwork(newGrid, newDayTime, state.storedPower);

    for (let yy = 0; yy < GRID_SIZE; yy++) {
      for (let xx = 0; xx < GRID_SIZE; xx++) {
        newGrid[yy][xx].powered = poweredCells.has(`${xx},${yy}`);
      }
    }

    const netPower = totalGeneration - totalConsumption;
    let newStoredPower = state.storedPower;
    const isDay = newDayTime < DAY_THRESHOLD;

    if (batteryCapacity > 0) {
      if (netPower > 0) {
        newStoredPower = Math.min(batteryCapacity, state.storedPower + netPower * 0.3);
      } else if (netPower < 0 && !isDay) {
        const deficit = -netPower;
        const discharge = Math.min(state.storedPower, deficit * 0.5);
        newStoredPower = Math.max(0, state.storedPower - discharge);
      }
    }

    const { houses, poweredHouses, factories, poweredFactories } = countPoweredBuildings(
      newGrid,
      poweredCells
    );
    const totalBuildings = houses + factories;
    const totalPowered = poweredHouses + poweredFactories;
    let coverage = totalBuildings > 0 ? totalPowered / totalBuildings : 1;

    let newSatisfaction = state.satisfaction;
    if (coverage >= 0.8) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.2);
    } else if (coverage >= 0.5) {
      newSatisfaction = Math.min(100, state.satisfaction + 0.05);
    } else {
      newSatisfaction = Math.max(0, state.satisfaction - 0.3);
    }

    saveToLocalStorage({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      satisfaction: newSatisfaction,
    });

    set({
      grid: newGrid,
      dayTime: newDayTime,
      storedPower: newStoredPower,
      maxStorage: batteryCapacity,
      satisfaction: newSatisfaction,
      poweredCells,
      totalGeneration,
      totalConsumption,
    });
  },

  resetGame: () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = createEmptyGrid();
    const result = recalcGrid(fresh, 20, 10);
    set({
      grid: result.newGrid,
      dayTime: 20,
      storedPower: 10,
      maxStorage: result.batteryCapacity,
      satisfaction: 50,
      selectedTool: 'windmill',
      poweredCells: result.poweredCells,
      totalGeneration: result.totalGeneration,
      totalConsumption: result.totalConsumption,
      showSettlement: false,
    });
  },

  openSettlement: () => set({ showSettlement: true }),
  closeSettlement: () => set({ showSettlement: false }),

  saveSnapshot: (name) => {
    const state = get();
    const id =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const snapshotName =
      name?.trim() || `快照 ${state.snapshots.length + 1}`;

    const snapshot: GridSnapshot = {
      id,
      name: snapshotName,
      timestamp: Date.now(),
      grid: state.grid.map((row) => row.map((c) => ({ ...c }))),
      poweredCells: Array.from(state.poweredCells),
      satisfaction: state.satisfaction,
      storedPower: state.storedPower,
      maxStorage: state.maxStorage,
      totalGeneration: state.totalGeneration,
      totalConsumption: state.totalConsumption,
      dayTime: state.dayTime,
    };

    const newSnapshots = [...state.snapshots, snapshot];
    saveSnapshotsToLocalStorage(newSnapshots);
    set({ snapshots: newSnapshots });
    return id;
  },

  selectSnapshot: (id) => set({ activeSnapshotId: id }),

  deleteSnapshot: (id) => {
    const state = get();
    const newSnapshots = state.snapshots.filter((s) => s.id !== id);
    saveSnapshotsToLocalStorage(newSnapshots);
    set({
      snapshots: newSnapshots,
      activeSnapshotId: state.activeSnapshotId === id ? null : state.activeSnapshotId,
    });
  },

  renameSnapshot: (id, name) => {
    const state = get();
    const newSnapshots = state.snapshots.map((s) =>
      s.id === id ? { ...s, name: name.trim() || s.name } : s
    );
    saveSnapshotsToLocalStorage(newSnapshots);
    set({ snapshots: newSnapshots });
  },

  clearSnapshots: () => {
    saveSnapshotsToLocalStorage([]);
    set({ snapshots: [], activeSnapshotId: null });
  },

  computeDiff: () => {
    const state = get();
    if (!state.activeSnapshotId) return null;

    const snapshot = state.snapshots.find((s) => s.id === state.activeSnapshotId);
    if (!snapshot) return null;

    const diff = new Map<string, CellDiff>();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const oldCell = snapshot.grid[y][x];
        const newCell = state.grid[y][x];

        const oldEmpty = oldCell.type === 'empty';
        const newEmpty = newCell.type === 'empty';

        if (oldEmpty && newEmpty) {
          diff.set(key, { type: 'unchanged' });
        } else if (oldEmpty && !newEmpty) {
          diff.set(key, {
            type: 'added',
            newType: newCell.type,
            newRotation: newCell.rotation,
          });
        } else if (!oldEmpty && newEmpty) {
          diff.set(key, {
            type: 'removed',
            oldType: oldCell.type,
            oldRotation: oldCell.rotation,
          });
        } else if (
          oldCell.type !== newCell.type ||
          (oldCell.type === 'wire' && oldCell.rotation !== newCell.rotation)
        ) {
          diff.set(key, {
            type: 'modified',
            oldType: oldCell.type,
            newType: newCell.type,
            oldRotation: oldCell.rotation,
            newRotation: newCell.rotation,
          });
        } else {
          diff.set(key, { type: 'unchanged' });
        }
      }
    }

    return diff;
  },
}));
