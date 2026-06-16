import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { GridCellComponent } from './GridCell';
import { Building } from './Building';
import { GRID_SIZE } from '../utils/constants';

export const FloatingIsland: React.FC = () => {
  const {
    grid,
    selectedTool,
    placeOrRemove,
    rotateCell,
    repairCell,
    dayTime,
    activeSnapshotId,
    snapshots,
    computeDiff,
  } = useGameStore();

  const handleCellClick = (x: number, y: number) => {
    const cell = grid[y][x];
    if (cell.faulty) {
      repairCell(x, y);
    } else {
      placeOrRemove(x, y);
    }
  };

  const handleCellRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    const cell = grid[y][x];
    if (cell.type === 'wire' && !cell.faulty) {
      rotateCell(x, y);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        const hovered = document.querySelector('.grid-cell:hover') as HTMLElement | null;
        if (hovered) {
          const x = parseInt(hovered.dataset.x || '0');
          const y = parseInt(hovered.dataset.y || '0');
          const cell = grid[y][x];
          if (cell.type === 'wire' && !cell.faulty) {
            rotateCell(x, y);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, rotateCell]);

  const isNight = dayTime >= 50;
  const storedPower = useGameStore((s) => s.storedPower);
  const satisfaction = useGameStore((s) => s.satisfaction);
  const totalGeneration = useGameStore((s) => s.totalGeneration);
  const totalConsumption = useGameStore((s) => s.totalConsumption);

  const { diffMap, activeSnapshot, snapshotPoweredSet } = useMemo(() => {
    const snapshot = snapshots.find((s) => s.id === activeSnapshotId) || null;
    const diff = computeDiff();
    const poweredSet = snapshot ? new Set(snapshot.poweredCells) : null;
    return { diffMap: diff, activeSnapshot: snapshot, snapshotPoweredSet: poweredSet };
  }, [
    activeSnapshotId,
    snapshots,
    computeDiff,
    grid,
    storedPower,
    satisfaction,
    totalGeneration,
    totalConsumption,
  ]);

  return (
    <div className="relative">
      <div
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-32 rounded-[50%] blur-2xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
        }}
      />

      <div
        className="relative p-8 rounded-3xl animate-[float_6s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(180deg, #8D6E63 0%, #6D4C41 100%)',
          boxShadow: `
            0 20px 60px rgba(0,0,0,0.3),
            inset 0 2px 0 rgba(255,255,255,0.1)
          `,
        }}
      >
        <div
          className="absolute -top-4 left-4 right-4 h-8 rounded-t-full"
          style={{
            background: isNight
              ? 'linear-gradient(180deg, #2D5016 0%, #1B3D0F 100%)'
              : 'linear-gradient(180deg, #7CB342 0%, #558B2F 100%)',
          }}
        />
        <div
          className="absolute -top-2 left-8 right-8 h-4 rounded-t-full"
          style={{
            background: isNight
              ? 'linear-gradient(180deg, #3D6B1E 0%, #2D5016 100%)'
              : 'linear-gradient(180deg, #8BC34A 0%, #7CB342 100%)',
          }}
        />

        <div className="relative">
          {activeSnapshot && snapshotPoweredSet && (
            <div
              className="absolute inset-0 grid gap-0.5 p-2 rounded-2xl pointer-events-none z-0"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                opacity: 0.55,
                transform: 'translate(5px, 5px)',
              }}
            >
              {activeSnapshot.grid.map((row, y) =>
                row.map((cell, x) => {
                  const key = `${x},${y}`;
                  const wasPowered = snapshotPoweredSet.has(key);
                  const shadowCell = {
                    ...cell,
                    powered: wasPowered,
                    faulty: false,
                  };
                  return (
                    <div
                      key={`shadow-${x}-${y}`}
                      className={`
                        w-14 h-14 border rounded-[4px] transition-all relative overflow-hidden
                        ${
                          cell.type !== 'empty'
                            ? wasPowered
                              ? 'border-blue-400/70 border-dashed bg-blue-100/40'
                              : 'border-indigo-400/50 border-dashed bg-indigo-200/20'
                            : 'border-transparent bg-transparent'
                        }
                      `}
                      style={{
                        borderRadius: '4px',
                      }}
                    >
                      {cell.type !== 'empty' && (
                        <div className="absolute inset-0" style={{ filter: 'saturate(0.6)' }}>
                          <Building cell={shadowCell} />
                        </div>
                      )}
                      {wasPowered && cell.type !== 'empty' && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 8px rgba(59, 130, 246, 0.35)',
                            borderRadius: '4px',
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div
            className="grid gap-0.5 p-2 rounded-2xl relative z-10"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              background: isNight
                ? 'linear-gradient(135deg, #1a3a0f 0%, #0f2a08 100%)'
                : 'linear-gradient(135deg, #8BC34A 0%, #689F38 100%)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const key = `${x},${y}`;
                const diff = diffMap?.get(key) || null;
                let snapshotCell = null;
                if (activeSnapshot && snapshotPoweredSet) {
                  const raw = activeSnapshot.grid[y][x];
                  snapshotCell = {
                    ...raw,
                    powered: snapshotPoweredSet.has(key),
                    faulty: false,
                  };
                }
                return (
                  <div key={`${x}-${y}`} className="grid-cell" data-x={x} data-y={y}>
                    <GridCellComponent
                      cell={cell}
                      selectedTool={selectedTool}
                      onClick={() => handleCellClick(x, y)}
                      onRightClick={(e) => handleCellRightClick(e, x, y)}
                      diff={diff}
                      snapshotCell={snapshotCell}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {activeSnapshot && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-indigo-500/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
            <span>🔮</span>
            <span>对比中：{activeSnapshot.name}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};
