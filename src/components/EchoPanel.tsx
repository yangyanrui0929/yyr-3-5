import React, { useState } from 'react';
import { useGameStore, GridSnapshot } from '../store/useGameStore';
import { Camera, Trash2, Eye, EyeOff, Edit3, Check, X, Zap, Battery, Smile } from 'lucide-react';

export const EchoPanel: React.FC = () => {
  const {
    snapshots,
    activeSnapshotId,
    saveSnapshot,
    selectSnapshot,
    deleteSnapshot,
    renameSnapshot,
    clearSnapshots,
    satisfaction,
    storedPower,
    maxStorage,
    totalGeneration,
    totalConsumption,
  } = useGameStore();

  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleConfirmSave = () => {
    saveSnapshot(newSnapshotName);
    setNewSnapshotName('');
    setShowNameInput(false);
  };

  const handleCancelSave = () => {
    setNewSnapshotName('');
    setShowNameInput(false);
  };

  const startEditing = (s: GridSnapshot) => {
    setEditingId(s.id);
    setEditingName(s.name);
  };

  const confirmRename = () => {
    if (editingId) {
      renameSnapshot(editingId, editingName);
      setEditingId(null);
      setEditingName('');
    }
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${MM}/${dd} ${hh}:${mm}`;
  };

  const activeSnapshot = snapshots.find((s) => s.id === activeSnapshotId);

  const getSatDelta = (s: GridSnapshot) => (satisfaction - s.satisfaction).toFixed(1);
  const getPowerDelta = (s: GridSnapshot) => (storedPower - s.storedPower).toFixed(1);
  const getGenDelta = (s: GridSnapshot) => (totalGeneration - s.totalGeneration).toFixed(1);
  const getConsDelta = (s: GridSnapshot) => (totalConsumption - s.totalConsumption).toFixed(1);

  const DeltaTag: React.FC<{ value: string; positiveGood?: boolean }> = ({
    value,
    positiveGood = true,
  }) => {
    const num = parseFloat(value);
    if (num === 0) return <span className="text-gray-400 text-[10px] ml-1">±0</span>;
    const good = positiveGood ? num > 0 : num < 0;
    return (
      <span
        className={`text-[10px] ml-1 font-semibold ${good ? 'text-green-600' : 'text-red-500'}`}
      >
        {num > 0 ? '+' : ''}
        {value}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>🔮</span>
          电力回声
        </h3>

        {showNameInput ? (
          <div className="mb-3">
            <input
              type="text"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              placeholder="输入快照名称..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSave();
                if (e.key === 'Escape') handleCancelSave();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmSave}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
                确认保存
              </button>
              <button
                onClick={handleCancelSave}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNameInput(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 text-sm mb-2"
          >
            <Camera size={16} />
            保存当前快照
          </button>
        )}

        {activeSnapshot && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
              📍 对比中：{activeSnapshot.name}
            </p>
            <div className="space-y-1 text-[11px] text-gray-600">
              <div className="flex justify-between items-center">
                <span>
                  满意度 {activeSnapshot.satisfaction.toFixed(1)} → {satisfaction.toFixed(1)}
                </span>
                <DeltaTag value={getSatDelta(activeSnapshot)} />
              </div>
              <div className="flex justify-between items-center">
                <span>
                  蓄电 {activeSnapshot.storedPower.toFixed(0)}/{activeSnapshot.maxStorage} →{' '}
                  {storedPower.toFixed(0)}/{maxStorage}
                </span>
                <DeltaTag value={getPowerDelta(activeSnapshot)} />
              </div>
              <div className="flex justify-between items-center">
                <span>
                  发电 +{activeSnapshot.totalGeneration} → +{totalGeneration}
                </span>
                <DeltaTag value={getGenDelta(activeSnapshot)} />
              </div>
              <div className="flex justify-between items-center">
                <span>
                  耗电 -{activeSnapshot.totalConsumption} → -{totalConsumption}
                </span>
                <DeltaTag value={getConsDelta(activeSnapshot)} positiveGood={false} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span>📜</span>
            历史快照
            <span className="text-xs font-normal text-gray-400">({snapshots.length})</span>
          </h3>
          {snapshots.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定清空所有快照吗？')) clearSnapshots();
              }}
              className="text-[10px] text-red-500 hover:text-red-600"
            >
              清空
            </button>
          )}
        </div>

        {snapshots.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            <p>还没有保存快照</p>
            <p className="mt-1">保存后可对比电网演化过程</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...snapshots]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((s) => {
                const isActive = s.id === activeSnapshotId;
                const isEditing = editingId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl p-2.5 border transition-all ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex gap-1 mb-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename();
                            if (e.key === 'Escape') cancelRename();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={confirmRename}
                          className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-700"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{formatTime(s.timestamp)}</p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button
                            onClick={() => startEditing(s)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500"
                            title="重命名"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => selectSnapshot(isActive ? null : s.id)}
                            className={`p-1 rounded ${
                              isActive
                                ? 'bg-indigo-500 text-white'
                                : 'hover:bg-gray-200 text-gray-500'
                            }`}
                            title={isActive ? '取消对比' : '对比此快照'}
                          >
                            {isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`删除快照 "${s.name}" 吗？`)) deleteSnapshot(s.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-500">
                        <div className="flex items-center gap-0.5">
                          <Smile size={10} className="text-pink-400 shrink-0" />
                          <span>{s.satisfaction.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Battery size={10} className="text-amber-500 shrink-0" />
                          <span>{s.storedPower.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Zap size={10} className="text-blue-500 shrink-0" />
                          <span>
                            +{s.totalGeneration}/-{s.totalConsumption}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50">
        <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
          <span>🎨</span>
          差异图例
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-400/60 border border-green-500"></span>
            <span className="text-gray-600">新增</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-400/60 border border-red-500"></span>
            <span className="text-gray-600">移除</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-400/60 border border-yellow-500"></span>
            <span className="text-gray-600">修改</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-300/40 border border-indigo-400 border-dashed"></span>
            <span className="text-gray-600">历史影子</span>
          </div>
        </div>
      </div>
    </div>
  );
};
