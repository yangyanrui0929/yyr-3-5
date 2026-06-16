import React from 'react';
import { GridCell as GridCellType, ToolType } from '../utils/constants';
import { Building } from './Building';
import { CellDiff } from '../store/useGameStore';

interface GridCellProps {
  cell: GridCellType;
  selectedTool: ToolType;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
  diff?: CellDiff | null;
  snapshotCell?: GridCellType | null;
}

export const GridCellComponent: React.FC<GridCellProps> = ({
  cell,
  selectedTool,
  onClick,
  onRightClick,
  diff,
  snapshotCell,
}) => {
  const isEmpty = cell.type === 'empty';
  const canPlace = isEmpty && selectedTool !== 'remove';
  const canRemove = !isEmpty && selectedTool === 'remove';
  const canRepair = cell.faulty;

  const diffClass =
    diff?.type === 'added'
      ? 'ring-2 ring-green-500 ring-inset bg-green-300/40'
      : diff?.type === 'removed'
      ? 'ring-2 ring-red-500 ring-inset bg-red-200/30'
      : diff?.type === 'modified'
      ? 'ring-2 ring-yellow-500 ring-inset bg-yellow-200/30'
      : '';

  return (
    <div
      onClick={onClick}
      onContextMenu={onRightClick}
      className={`
        relative w-14 h-14 border border-green-600/30 cursor-pointer
        transition-all duration-150 select-none
        ${isEmpty ? 'bg-green-400/40 hover:bg-green-300/60' : 'bg-green-500/50'}
        ${canPlace ? 'hover:ring-2 hover:ring-blue-400 hover:ring-inset' : ''}
        ${canRemove ? 'hover:ring-2 hover:ring-red-400 hover:ring-inset' : ''}
        ${canRepair ? 'ring-2 ring-orange-400 ring-inset animate-pulse' : ''}
        ${cell.powered && !cell.faulty ? 'bg-green-400/60' : ''}
        ${diffClass}
      `}
      style={{
        borderRadius: '4px',
      }}
    >
      <Building cell={cell} />

      {snapshotCell && snapshotCell.type !== 'empty' && diff?.type === 'removed' && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            snapshotCell.powered ? 'opacity-75' : 'opacity-55'
          }`}
        >
          <div
            className={`absolute inset-0 rounded border-2 border-dashed ${
              snapshotCell.powered
                ? 'border-blue-400 bg-blue-100/40'
                : 'border-indigo-400 bg-indigo-200/30'
            }`}
          />
          <div
            className="absolute inset-0"
            style={{ filter: snapshotCell.powered ? 'saturate(0.85)' : 'saturate(0.5) opacity(0.85)' }}
          >
            <Building cell={snapshotCell} />
          </div>
          {snapshotCell.powered && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 8px rgba(59, 130, 246, 0.45)',
                borderRadius: '4px',
              }}
            />
          )}
        </div>
      )}

      {snapshotCell && snapshotCell.type !== 'empty' && diff?.type === 'modified' && (
        <div className="absolute top-0 left-0 pointer-events-none">
          <div
            className={`w-2.5 h-2.5 rounded-b-br rounded-tl opacity-90 border-b border-r border-dashed ${
              snapshotCell.powered
                ? 'bg-blue-400/60 border-blue-600'
                : 'bg-indigo-400/60 border-indigo-600'
            }`}
          />
        </div>
      )}

      {diff?.type === 'removed' && !snapshotCell && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
          <div className="w-full h-full border-2 border-dashed border-red-400 bg-red-200/20 rounded flex items-center justify-center">
            <span className="text-red-500 text-[10px] font-bold">✕</span>
          </div>
        </div>
      )}

      {canRepair && (
        <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20 z-10">
          <span className="text-xs font-bold text-white drop-shadow-lg">🔧维修</span>
        </div>
      )}

      {diff?.type === 'added' && (
        <div className="absolute top-0 right-0 pointer-events-none">
          <div className="w-2 h-2 rounded-bl-tr bg-green-500 opacity-80" />
        </div>
      )}
    </div>
  );
};
