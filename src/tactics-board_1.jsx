import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, RotateCcw, Grid3x3, Shield, Swords, MousePointer2,
  ArrowUpRight, Trash2, Eye, EyeOff, Pencil, Check, X as XIcon,
  Users, Camera, Save, FolderOpen, Calendar, FileText
} from 'lucide-react';

// 写真を正方形にリサイズしてJPEG化する (ストレージ節約)
const resizePhoto = (file, size = 220) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width  - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) { reject(err); }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ===== 初期データ =====
const makeDefaultPlayers = () => [
  // 自チーム (青・下側、上に向かって攻撃) - 2-3-2 フォーメーション
  { id: 'h1', team: 'home', x: 25, y: 62, num: 1, name: 'GK',  photo: null },
  { id: 'h2', team: 'home', x: 14, y: 52, num: 2, name: 'LB',  photo: null },
  { id: 'h3', team: 'home', x: 36, y: 52, num: 3, name: 'RB',  photo: null },
  { id: 'h4', team: 'home', x: 9,  y: 41, num: 4, name: 'LM',  photo: null },
  { id: 'h5', team: 'home', x: 25, y: 41, num: 5, name: 'CM',  photo: null },
  { id: 'h6', team: 'home', x: 41, y: 41, num: 6, name: 'RM',  photo: null },
  { id: 'h7', team: 'home', x: 17, y: 29, num: 7, name: 'LF',  photo: null },
  { id: 'h8', team: 'home', x: 33, y: 29, num: 8, name: 'RF',  photo: null },
  // 相手チーム (赤・上側、下に向かって攻撃)
  { id: 'a1', team: 'away', x: 25, y: 6,  num: 1, name: '相手GK',  photo: null },
  { id: 'a2', team: 'away', x: 36, y: 16, num: 2, name: '相手LB',  photo: null },
  { id: 'a3', team: 'away', x: 14, y: 16, num: 3, name: '相手RB',  photo: null },
  { id: 'a4', team: 'away', x: 41, y: 27, num: 4, name: '相手LM',  photo: null },
  { id: 'a5', team: 'away', x: 25, y: 27, num: 5, name: '相手CM',  photo: null },
  { id: 'a6', team: 'away', x: 9,  y: 27, num: 6, name: '相手RM',  photo: null },
  { id: 'a7', team: 'away', x: 33, y: 39, num: 7, name: '相手LF',  photo: null },
  { id: 'a8', team: 'away', x: 17, y: 39, num: 8, name: '相手RF',  photo: null },
];

// ピッチサイズ (50m × 68m に相当する作業座標)
const PITCH_W = 50;
const PITCH_H = 68;

// FC TRIANELLO Machida のロゴカラーで統一したパレット
const NAVY_DEEP   = '#0c1735';
const NAVY_BG     = '#131e48';
const NAVY_PANEL  = '#1a2a5f';
const NAVY_BORDER = '#2d4087';
const NAVY_SOFT   = '#24357a';
const GOLD        = '#f4c52e';
const GOLD_LIGHT  = '#ffe066';
const GOLD_DIM    = '#b88a12';

const HOME_COLOR  = '#1e3a8a';  // ロゴのネイビー
const HOME_BORDER = '#f4c52e';  // ロゴのゴールド
const AWAY_COLOR  = '#dc2626';  // 相手は赤でコントラスト
const AWAY_BORDER = '#fca5a5';

const CLUB_LOGO_SRC = "data:image/jpeg;base64,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";

export default function TacticsBoard() {
  const [players, setPlayers] = useState(makeDefaultPlayers);
  const [hidden, setHidden] = useState(() => new Set());
  const [zoom, setZoom] = useState('full');        // 'full' | 'home' | 'away'
  const [tool, setTool] = useState('move');        // 'move' | 'arrow'
  const [arrowKind, setArrowKind] = useState('pass'); // 'pass' | 'run'
  const [arrows, setArrows] = useState([]);
  const [drawing, setDrawing] = useState(null);    // 現在描画中の矢印
  const [dragId, setDragId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [activeTeamTab, setActiveTeamTab] = useState('home');

  // ボール
  const [ball, setBall] = useState({ x: PITCH_W / 2, y: PITCH_H / 2 });
  const [ballDragging, setBallDragging] = useState(false);

  // 保存機能の状態
  const [saves, setSaves] = useState([]);
  const [savesLoaded, setSavesLoaded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState('');
  const [saveNoteDraft, setSaveNoteDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const fieldRef = useRef(null);
  const photoInputRef = useRef(null);
  const pendingPhotoIdRef = useRef(null);

  // トースト表示
  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  };

  // ===== 保存データの読み書き =====
  const refreshSaves = async () => {
    try {
      const listRes = await window.storage.list('save:');
      if (!listRes?.keys || listRes.keys.length === 0) {
        setSaves([]);
        setSavesLoaded(true);
        return;
      }
      const results = await Promise.all(
        listRes.keys.map(async (key) => {
          try {
            const r = await window.storage.get(key);
            return r ? JSON.parse(r.value) : null;
          } catch { return null; }
        })
      );
      setSaves(results.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp));
      setSavesLoaded(true);
    } catch (e) {
      console.error('保存一覧の取得エラー:', e);
      setSavesLoaded(true);
    }
  };

  useEffect(() => { refreshSaves(); }, []);

  const openSaveDialog = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    setSaveNameDraft(`${now.getMonth() + 1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())} の作戦`);
    setSaveNoteDraft('');
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    const name = saveNameDraft.trim();
    if (!name) return;
    setBusy(true);
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      name,
      note: saveNoteDraft.trim(),
      timestamp: Date.now(),
      players,
      hidden: Array.from(hidden),
      arrows,
      zoom,
      ball,
    };
    try {
      await window.storage.set(`save:${id}`, JSON.stringify(record));
      await refreshSaves();
      setShowSaveDialog(false);
      showToast('保存しました', 'success');
    } catch (e) {
      console.error(e);
      showToast('保存に失敗しました。写真の容量を減らしてみてください', 'error');
    }
    setBusy(false);
  };

  const loadSave = (record) => {
    setPlayers(record.players || makeDefaultPlayers());
    setHidden(new Set(record.hidden || []));
    setArrows(record.arrows || []);
    if (record.zoom) setZoom(record.zoom);
    setBall(record.ball || { x: PITCH_W / 2, y: PITCH_H / 2 });
    setShowLibrary(false);
    showToast(`「${record.name}」を読み込みました`, 'success');
  };

  const deleteSave = async (record) => {
    if (!window.confirm(`「${record.name}」を削除しますか？`)) return;
    try {
      await window.storage.delete(`save:${record.id}`);
      await refreshSaves();
      showToast('削除しました');
    } catch (e) {
      showToast('削除に失敗しました', 'error');
    }
  };

  // ===== ビューポート (どの範囲をピッチとして見せるか) =====
  const vb = zoom === 'home'
    ? { x: 0, y: PITCH_H / 2, w: PITCH_W, h: PITCH_H / 2 }   // 自陣
    : zoom === 'away'
    ? { x: 0, y: 0,           w: PITCH_W, h: PITCH_H / 2 }   // 敵陣
    : { x: 0, y: 0,           w: PITCH_W, h: PITCH_H };      // 全体

  const aspectRatio = `${vb.w} / ${vb.h}`;

  const worldToPct = (wx, wy) => ({
    left: `${((wx - vb.x) / vb.w) * 100}%`,
    top:  `${((wy - vb.y) / vb.h) * 100}%`,
  });

  const inView = (wy) => wy >= vb.y - 1 && wy <= vb.y + vb.h + 1;

  const getWorldFromEvent = (e) => {
    const rect = fieldRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(PITCH_W, vb.x + fx * vb.w)),
      y: Math.max(0, Math.min(PITCH_H, vb.y + fy * vb.h)),
    };
  };

  // ===== 選手ドラッグ =====
  const onPlayerPointerDown = (e, id) => {
    if (tool !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDragId(id);
    setSelectedId(id);
  };

  const onPlayerPointerMove = (e, id) => {
    if (dragId !== id) return;
    const { x, y } = getWorldFromEvent(e);
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  };

  const onPlayerPointerUp = (e, id) => {
    if (dragId === id) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setDragId(null);
    }
  };

  // ===== ボールドラッグ =====
  const onBallPointerDown = (e) => {
    if (tool !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setBallDragging(true);
  };

  const onBallPointerMove = (e) => {
    if (!ballDragging) return;
    setBall(getWorldFromEvent(e));
  };

  const onBallPointerUp = (e) => {
    if (ballDragging) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setBallDragging(false);
    }
  };

  // ===== 矢印描画 =====
  const onFieldPointerDown = (e) => {
    if (tool !== 'arrow') return;
    // 選手上でのイベントは stopPropagation されない(必要なら上にも描ける)
    const pos = getWorldFromEvent(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDrawing({ from: pos, to: pos, kind: arrowKind });
  };

  const onFieldPointerMove = (e) => {
    if (!drawing) return;
    const pos = getWorldFromEvent(e);
    setDrawing(d => d ? { ...d, to: pos } : d);
  };

  const onFieldPointerUp = (e) => {
    if (!drawing) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const dx = drawing.to.x - drawing.from.x;
    const dy = drawing.to.y - drawing.from.y;
    if (Math.hypot(dx, dy) > 1.5) {
      setArrows(prev => [...prev, { ...drawing, id: `ar_${Date.now()}` }]);
    }
    setDrawing(null);
  };

  // ===== 写真アップロード =====
  const triggerPhotoUpload = (id) => {
    pendingPhotoIdRef.current = id;
    setSelectedId(id);
    photoInputRef.current?.click();
  };

  const onPhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    const targetId = pendingPhotoIdRef.current;
    if (!file || !targetId) {
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await resizePhoto(file, 220);
      setPlayers(prev => prev.map(p =>
        p.id === targetId ? { ...p, photo: dataUrl } : p
      ));
      pendingPhotoIdRef.current = null;
    } catch (err) {
      console.error(err);
      showToast('画像を読み込めませんでした', 'error');
    }
    e.target.value = '';
  };

  const clearPhoto = (id) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, photo: null } : p));
  };

  // ===== 選手編集 =====
  const startEditName = (p) => {
    setEditingId(p.id);
    setEditDraft(p.name);
  };
  const commitEditName = () => {
    if (!editingId) return;
    setPlayers(prev => prev.map(p =>
      p.id === editingId ? { ...p, name: editDraft.trim() || p.name } : p
    ));
    setEditingId(null);
    setEditDraft('');
  };

  const toggleHidden = (id) => {
    setHidden(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ===== シナリオプリセット（ズーム切り替えのみ。選手の表示/位置は変えない） =====
  const showAll = () => {
    setZoom('full');
  };

  const defenseScenario = () => {
    setZoom('home');
  };

  const offenseScenario = () => {
    setZoom('away');
  };

  const resetAll = () => {
    if (!window.confirm('ポジションを初期配置に戻します。よろしいですか？')) return;
    setPlayers(makeDefaultPlayers());
    setHidden(new Set());
    setArrows([]);
    setZoom('full');
    setBall({ x: PITCH_W / 2, y: PITCH_H / 2 });
  };

  // ===== 描画ヘルパー =====
  const homeList = players.filter(p => p.team === 'home');
  const awayList = players.filter(p => p.team === 'away');

  return (
    <div
      className="min-h-screen lg:h-screen w-full select-none lg:overflow-hidden overflow-y-auto"
      style={{
        color: '#e6ecff',
        background:
          `radial-gradient(1200px 600px at 15% -10%, ${NAVY_PANEL} 0%, ${NAVY_BG} 45%, ${NAVY_DEEP} 100%)`,
        fontFamily:
          '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", system-ui, sans-serif',
        overflowX: 'hidden',
        overscrollBehaviorX: 'none',
        position: 'relative',
      }}
    >
      {/* 隠し file input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={onPhotoSelected}
        className="hidden"
      />

      {/* カスタムカラーのスタイル定義 (FC TRIANELLO パレット) */}
      <style>{`
        .tb-toolgroup {
          background: ${NAVY_PANEL}aa;
          border: 1px solid ${NAVY_BORDER};
        }
        .tb-clearbtn {
          background: ${NAVY_PANEL}aa;
          border: 1px solid ${NAVY_BORDER};
          color: #cdd7f4;
        }
        .tb-clearbtn:hover { background: #5a1a1a; border-color: #7f1d1d; color: #fecaca; }
        .tb-panel {
          background: ${NAVY_PANEL}99;
          border: 1px solid ${NAVY_BORDER};
          backdrop-filter: blur(8px);
        }
        .tb-row {
          border-bottom: 1px solid ${NAVY_SOFT}66;
        }
        .tb-row:hover { background: ${NAVY_SOFT}55; }
        .tb-row-selected { background: ${NAVY_SOFT} !important; }
        .tb-input-sm, .tb-input {
          background: ${NAVY_DEEP};
          border: 1px solid ${NAVY_BORDER};
        }
        .tb-input-sm:focus, .tb-input:focus {
          border-color: ${GOLD};
          box-shadow: 0 0 0 1px ${GOLD};
        }
        .tb-check-btn { color: ${GOLD}; }
        .tb-check-btn:hover { background: ${NAVY_SOFT}; }
        .tb-panel-footer {
          background: ${NAVY_DEEP}aa;
          border-top: 1px solid ${NAVY_SOFT};
        }
        .tb-summary {
          background: ${NAVY_DEEP}80;
          border: 1px solid ${NAVY_BORDER};
          color: #8ea0cc;
        }
        .tb-ghost-btn { color: #cdd7f4; background: transparent; }
        .tb-ghost-btn:hover { background: ${NAVY_SOFT}; }
        .tb-primary-btn {
          background: linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%);
          color: ${NAVY_DEEP};
          box-shadow: 0 3px 10px -3px ${GOLD}66;
        }
        .tb-primary-btn:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .tb-save-card {
          background: ${NAVY_PANEL}99;
          border: 1px solid ${NAVY_BORDER};
        }
        .tb-save-card:hover { border-color: ${GOLD}; }
        .tb-delete-btn {
          background: ${NAVY_SOFT};
          border: 1px solid ${NAVY_BORDER};
          color: #cdd7f4;
        }
        .tb-delete-btn:hover {
          background: #5a1a1a;
          border-color: #7f1d1d;
          color: #fecaca;
        }
        .tb-text-dim    { color: #8ea0cc; }
        .tb-text-dimmer { color: #6b7aa0; }
        .tb-text-bright { color: #e6ecff; }
        .tb-num-badge-ring { box-shadow: 0 0 0 2px ${NAVY_DEEP}; }
        .tb-field-ring { box-shadow: 0 0 0 1px ${NAVY_BORDER}, 0 12px 40px -12px rgba(0,0,0,0.8); }
      `}</style>

      <div className="mx-auto px-4 py-3 overflow-x-hidden" style={{ maxWidth: 1400 }}>
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-3 flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <img
              src={CLUB_LOGO_SRC}
              alt="FC TRIANELLO Machida"
              draggable={false}
              className="object-contain shrink-0 w-8 h-8 sm:w-[44px] sm:h-[44px]"
              style={{ mixBlendMode: 'screen' }}
            />
            <div className="min-w-0">
              <h1
                className="text-sm sm:text-2xl font-black tracking-tight leading-none truncate"
                style={{ color: GOLD_LIGHT }}
              >
                FC TRIANELLO Machida
              </h1>
              <p className="text-[9px] sm:text-xs mt-0.5 tracking-wide truncate" style={{ color: '#a3b3d9' }}>
                8人制 作戦ボード
              </p>
            </div>
            <img
              src={`${import.meta.env.BASE_URL}mascot.png`}
              alt="マスコット"
              draggable={false}
              className="object-contain shrink-0 h-9 sm:h-12"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={openSaveDialog}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold active:scale-95 transition flex items-center gap-1 sm:gap-2"
              style={{
                background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                color: NAVY_DEEP,
                boxShadow: `0 4px 14px -4px ${GOLD}80`,
              }}
            >
              <Save size={14} /> 保存
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold active:scale-95 transition flex items-center gap-1 sm:gap-2"
              style={{
                background: NAVY_PANEL,
                border: `1px solid ${NAVY_BORDER}`,
                color: GOLD_LIGHT,
              }}
            >
              <FolderOpen size={14} /> 履歴
              {saves.length > 0 && (
                <span
                  className="inline-flex items-center justify-center text-[10px] sm:text-xs font-black rounded-full"
                  style={{
                    minWidth: 18, height: 18, padding: '0 4px',
                    background: GOLD, color: NAVY_DEEP,
                  }}
                >
                  {saves.length}
                </span>
              )}
            </button>
            <button
              onClick={resetAll}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold active:scale-95 transition flex items-center gap-1 sm:gap-2"
              style={{
                background: 'transparent',
                border: `1px solid ${NAVY_BORDER}`,
                color: '#a3b3d9',
              }}
            >
              <RotateCcw size={14} /> リセット
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-3 items-start">
          {/* 左: ピッチエリア */}
          <div className="flex-1 min-w-0 w-full">
            {/* ツールバー */}
            <div className="mb-2 flex flex-wrap gap-2 items-center shrink-0">
              {/* シナリオ切り替え */}
              <div className="flex rounded-xl overflow-hidden shadow-sm tb-toolgroup">
                <ScenarioBtn
                  active={zoom === 'full'}
                  onClick={showAll}
                  icon={<Grid3x3 size={15} />}
                  label="試合全体"
                />
                <ScenarioBtn
                  active={zoom === 'home'}
                  onClick={defenseScenario}
                  icon={<Shield size={15} />}
                  label="守備シーン"
                />
                <ScenarioBtn
                  active={zoom === 'away'}
                  onClick={offenseScenario}
                  icon={<Swords size={15} />}
                  label="攻撃シーン"
                />
              </div>

              {/* ツール */}
              <div className="flex rounded-xl overflow-hidden shadow-sm tb-toolgroup">
                <ToolBtn
                  active={tool === 'move'}
                  onClick={() => setTool('move')}
                  icon={<MousePointer2 size={15} />}
                  label="動かす"
                />
                <ToolBtn
                  active={tool === 'arrow'}
                  onClick={() => setTool('arrow')}
                  icon={<ArrowUpRight size={15} />}
                  label="矢印"
                />
              </div>

              {/* 矢印タイプ (arrow モード時のみ) */}
              {tool === 'arrow' && (
                <div className="flex rounded-xl overflow-hidden shadow-sm tb-toolgroup">
                  <ArrowTypeBtn
                    active={arrowKind === 'pass'}
                    onClick={() => setArrowKind('pass')}
                    color="#facc15"
                    label="パス"
                  />
                  <ArrowTypeBtn
                    active={arrowKind === 'run'}
                    onClick={() => setArrowKind('run')}
                    color="#22d3ee"
                    label="走り"
                  />
                </div>
              )}

              {arrows.length > 0 && (
                <button
                  onClick={() => setArrows([])}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 tb-clearbtn"
                >
                  <Trash2 size={13} /> 矢印を消す ({arrows.length})
                </button>
              )}

              <div className="ml-auto text-xs tb-text-dim tracking-wide hidden sm:block">
                {tool === 'move' ? '選手をドラッグして移動' : 'ピッチ上でドラッグして矢印を描く'}
              </div>
            </div>

            {/* ピッチ */}
            <div
              ref={fieldRef}
              onPointerDown={onFieldPointerDown}
              onPointerMove={onFieldPointerMove}
              onPointerUp={onFieldPointerUp}
              onPointerCancel={onFieldPointerUp}
              className="relative rounded-2xl overflow-hidden shadow-2xl tb-field-ring"
              style={{
                aspectRatio,
                ...(zoom === 'full'
                  ? { maxHeight: 'calc(100vh - 220px)', width: 'auto', margin: '0 auto' }
                  : {}),
                touchAction: 'none',
                cursor: tool === 'arrow' ? 'crosshair' : 'default',
                background: 'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)',
              }}
            >
              {/* ピッチ線 SVG */}
              <svg
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <defs>
                  {/* 芝のしま模様 */}
                  <pattern id="stripes" width={PITCH_W} height={8} patternUnits="userSpaceOnUse">
                    <rect width={PITCH_W} height="4" fill="rgba(255,255,255,0.04)" />
                    <rect y="4" width={PITCH_W} height="4" fill="rgba(0,0,0,0.06)" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width={PITCH_W} height={PITCH_H} fill="url(#stripes)" />

                {(() => {
                  const EDGE = 0.3;              // ピッチ線のインセット
                  const GY_TOP = EDGE;           // 敵陣のゴールライン
                  const GY_BOT = PITCH_H - EDGE; // 自陣のゴールライン
                  const GX_L = EDGE;
                  const GX_R = PITCH_W - EDGE;
                  const PA_W = 27, PA_H = 13;    // ペナルティエリア
                  const GA_W = 9, GA_H = 4;      // ゴールエリア
                  const GOAL_W = 5;              // ゴール幅
                  const PK_DIST = 8;             // PKスポットまでの距離
                  const lineColor = 'rgba(255,255,255,0.9)';
                  const sw = 0.3;
                  return (
                    <g>
                      {/* 外枠 */}
                      <rect
                        x={GX_L} y={GY_TOP}
                        width={GX_R - GX_L} height={GY_BOT - GY_TOP}
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      {/* ハーフウェイライン */}
                      <line
                        x1={GX_L} y1={PITCH_H / 2}
                        x2={GX_R} y2={PITCH_H / 2}
                        stroke={lineColor} strokeWidth={sw}
                      />
                      {/* センターサークル */}
                      <circle
                        cx={PITCH_W / 2} cy={PITCH_H / 2} r="6.5"
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="0.45" fill="white" />

                      {/* 自陣 (下) */}
                      <rect
                        x={(PITCH_W - PA_W) / 2} y={GY_BOT - PA_H}
                        width={PA_W} height={PA_H}
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      <rect
                        x={(PITCH_W - GA_W) / 2} y={GY_BOT - GA_H}
                        width={GA_W} height={GA_H}
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      <rect
                        x={(PITCH_W - GOAL_W) / 2} y={GY_BOT - 0.35}
                        width={GOAL_W} height="0.7"
                        fill="white"
                      />
                      <circle cx={PITCH_W / 2} cy={GY_BOT - PK_DIST} r="0.45" fill="white" />

                      {/* 敵陣 (上) */}
                      <rect
                        x={(PITCH_W - PA_W) / 2} y={GY_TOP}
                        width={PA_W} height={PA_H}
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      <rect
                        x={(PITCH_W - GA_W) / 2} y={GY_TOP}
                        width={GA_W} height={GA_H}
                        fill="none" stroke={lineColor} strokeWidth={sw}
                      />
                      <rect
                        x={(PITCH_W - GOAL_W) / 2} y={GY_TOP - 0.35}
                        width={GOAL_W} height="0.7"
                        fill="white"
                      />
                      <circle cx={PITCH_W / 2} cy={GY_TOP + PK_DIST} r="0.45" fill="white" />
                    </g>
                  );
                })()}
              </svg>

              {/* 矢印レイヤー */}
              <svg
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <defs>
                  <marker id="arrHeadPass" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15" />
                  </marker>
                  <marker id="arrHeadRun" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
                  </marker>
                </defs>
                {arrows.map(a => {
                  const isPass = a.kind === 'pass';
                  return (
                    <line
                      key={a.id}
                      x1={a.from.x} y1={a.from.y}
                      x2={a.to.x}   y2={a.to.y}
                      stroke={isPass ? '#facc15' : '#22d3ee'}
                      strokeWidth="0.55"
                      strokeLinecap="round"
                      strokeDasharray={isPass ? 'none' : '1.2,1.0'}
                      markerEnd={isPass ? 'url(#arrHeadPass)' : 'url(#arrHeadRun)'}
                    />
                  );
                })}
                {drawing && (
                  <line
                    x1={drawing.from.x} y1={drawing.from.y}
                    x2={drawing.to.x}   y2={drawing.to.y}
                    stroke={drawing.kind === 'pass' ? '#facc15' : '#22d3ee'}
                    strokeWidth="0.55"
                    strokeLinecap="round"
                    strokeDasharray="1.2,1.0"
                    opacity="0.8"
                  />
                )}
              </svg>

              {/* 選手 */}
              {players.map(p => {
                if (hidden.has(p.id)) return null;
                if (!inView(p.y)) return null;
                const pos = worldToPct(p.x, p.y);
                const isHome = p.team === 'home';
                const isSelected = selectedId === p.id;
                const isDragging = dragId === p.id;
                return (
                  <div
                    key={p.id}
                    onPointerDown={(e) => onPlayerPointerDown(e, p.id)}
                    onPointerMove={(e) => onPlayerPointerMove(e, p.id)}
                    onPointerUp={(e) => onPlayerPointerUp(e, p.id)}
                    onPointerCancel={(e) => onPlayerPointerUp(e, p.id)}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      transform: 'translate(-50%, -50%)',
                      touchAction: 'none',
                      cursor: tool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      zIndex: isDragging ? 30 : isSelected ? 20 : 10,
                      transition: isDragging ? 'none' : 'transform 0.06s',
                    }}
                  >
                    {/* 選手コマ */}
                    <div
                      className="relative rounded-full flex items-center justify-center font-black overflow-hidden"
                      style={{
                        width: zoom === 'full' ? 'min(32px, 7vw)' : 'min(56px, 10vw)',
                        height: zoom === 'full' ? 'min(32px, 7vw)' : 'min(56px, 10vw)',
                        background: isHome ? HOME_COLOR : AWAY_COLOR,
                        border: `2.5px solid ${isHome ? HOME_BORDER : AWAY_BORDER}`,
                        color: 'white',
                        fontSize: zoom === 'full' ? 'min(11px, 2.5vw)' : 'min(20px, 3.5vw)',
                        boxShadow: isSelected
                          ? `0 0 0 3px ${isHome ? GOLD_LIGHT : '#fca5a5'}, 0 8px 20px rgba(0,0,0,0.5)`
                          : '0 4px 12px rgba(0,0,0,0.45)',
                      }}
                    >
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={p.name}
                          draggable={false}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{p.num}</span>
                      )}
                    </div>
                    {/* 名前ラベル */}
                    <div
                      className={`${zoom === 'full' ? 'mt-0.5 px-1 py-0' : 'mt-1 px-1.5 py-0.5'} rounded font-bold whitespace-nowrap`}
                      style={{
                        fontSize: zoom === 'full' ? 'min(9px, 2vw)' : 'min(12px, 2.8vw)',
                        background: `${NAVY_DEEP}d9`,
                        color: 'white',
                        letterSpacing: '0.02em',
                        border: `1px solid ${NAVY_BORDER}aa`,
                      }}
                    >
                      {p.name}
                    </div>
                  </div>
                );
              })}

              {/* ボール */}
              {inView(ball.y) && (
                <div
                  onPointerDown={onBallPointerDown}
                  onPointerMove={onBallPointerMove}
                  onPointerUp={onBallPointerUp}
                  onPointerCancel={onBallPointerUp}
                  className="absolute"
                  style={{
                    ...worldToPct(ball.x, ball.y),
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                    cursor: tool === 'move' ? (ballDragging ? 'grabbing' : 'grab') : 'default',
                    zIndex: ballDragging ? 35 : 25,
                    transition: ballDragging ? 'none' : 'transform 0.06s',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))',
                  }}
                >
                  <SoccerBall size={zoom === 'full' ? 20 : Math.min(36, window.innerWidth * 0.07)} />
                </div>
              )}

              {/* ズームモード表示バッジ */}
              {zoom !== 'full' && (
                <div
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase"
                  style={{
                    background: `${NAVY_DEEP}cc`,
                    color: GOLD_LIGHT,
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${GOLD}55`,
                  }}
                >
                  {zoom === 'home' ? '自陣フォーカス' : '敵陣フォーカス'}
                </div>
              )}
            </div>

            {/* 操作ヒント */}
            <div className="mt-2 text-xs leading-relaxed px-1 shrink-0" style={{ color: '#8ea0cc' }}>
              <span className="inline-block mr-3">● 選手・ボールをドラッグで移動</span>
              <span className="inline-block mr-3">● 右側パネルで写真・名前を変更</span>
              <span className="inline-block">● 矢印モードでパス・走りのコースを描画</span>
            </div>
          </div>

          {/* 右: 選手リスト */}
          <aside
            className="w-full rounded-2xl overflow-hidden tb-panel"
            style={{ maxWidth: '100%', flexBasis: 340, flexShrink: 0 }}
          >
            {/* タブ */}
            <div className="flex">
              <TeamTab
                active={activeTeamTab === 'home'}
                onClick={() => setActiveTeamTab('home')}
                color={HOME_COLOR}
                label="自チーム"
                count={homeList.filter(p => !hidden.has(p.id)).length}
                total={homeList.length}
              />
              <TeamTab
                active={activeTeamTab === 'away'}
                onClick={() => setActiveTeamTab('away')}
                color={AWAY_COLOR}
                label="相手"
                count={awayList.filter(p => !hidden.has(p.id)).length}
                total={awayList.length}
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {(activeTeamTab === 'home' ? homeList : awayList).map(p => {
                const isHome = p.team === 'home';
                const isHidden = hidden.has(p.id);
                const isSelected = selectedId === p.id;
                const isEditing = editingId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors tb-row ${isSelected ? 'tb-row-selected' : ''} ${isHidden ? 'opacity-45' : ''}`}
                  >
                    {/* アバター */}
                    <div
                      className="relative rounded-full flex items-center justify-center font-black overflow-hidden shrink-0"
                      style={{
                        width: 42, height: 42,
                        background: isHome ? HOME_COLOR : AWAY_COLOR,
                        border: `2px solid ${isHome ? HOME_BORDER : AWAY_BORDER}`,
                        color: 'white',
                        fontSize: 15,
                      }}
                    >
                      {p.photo ? (
                        <img src={p.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.num}</span>
                      )}
                    </div>

                    {/* 名前 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold tb-text-dimmer tracking-wider">
                        #{p.num}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditName();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            maxLength={12}
                            className="w-full rounded px-1.5 py-0.5 text-sm font-semibold text-white focus:outline-none tb-input-sm"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); commitEditName(); }}
                            className="p-1 rounded tb-check-btn"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-bold truncate">{p.name}</div>
                      )}
                    </div>

                    {/* アクション */}
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <IconBtn
                          title="名前を編集"
                          onClick={(e) => { e.stopPropagation(); startEditName(p); }}
                        >
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn
                          title={p.photo ? '写真を変更' : '写真をアップロード'}
                          onClick={(e) => { e.stopPropagation(); triggerPhotoUpload(p.id); }}
                          active={!!p.photo}
                        >
                          {p.photo ? <Camera size={13} /> : <Upload size={13} />}
                        </IconBtn>
                        {p.photo && (
                          <IconBtn
                            title="写真を削除"
                            onClick={(e) => { e.stopPropagation(); clearPhoto(p.id); }}
                          >
                            <XIcon size={13} />
                          </IconBtn>
                        )}
                        <IconBtn
                          title={isHidden ? 'ボードに表示' : 'ボードから隠す'}
                          onClick={(e) => { e.stopPropagation(); toggleHidden(p.id); }}
                        >
                          {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </IconBtn>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* フッター情報 */}
            <div className="p-3 tb-panel-footer">
              <div className="text-xs tb-text-dim leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1">
                  <Upload size={11} /> <span>顔写真をアップロードして選手を識別</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <EyeOff size={11} /> <span>「相手」タブで不要な相手選手を非表示に</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Pencil size={11} /> <span>鉛筆マークで選手名を子どもの名前に変更</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* フッター凡例 */}
        <div className="mt-2 flex flex-wrap gap-4 text-xs tb-text-dim px-1">
          <LegendItem color="#facc15" label="パス" />
          <LegendItem color="#22d3ee" label="走り込み(点線)" />
          <LegendItem color={HOME_COLOR} label="自チーム" circle />
          <LegendItem color={AWAY_COLOR} label="相手チーム" circle />
        </div>
      </div>

      {/* 保存ダイアログ */}
      {showSaveDialog && (
        <Modal onClose={() => !busy && setShowSaveDialog(false)}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: GOLD}}>
              <Save size={18} className="text-white" />
            </div>
            <h2 className="text-lg font-black">作戦を保存</h2>
          </div>

          <label className="block text-xs font-bold tb-text-dim mb-1.5 tracking-wider">
            名前
          </label>
          <input
            autoFocus
            value={saveNameDraft}
            onChange={(e) => setSaveNameDraft(e.target.value)}
            maxLength={40}
            placeholder="例: 守備ブロック案1"
            className="w-full rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none tb-input"
          />

          <label className="block text-xs font-bold tb-text-dim mb-1.5 mt-4 tracking-wider">
            メモ (任意)
          </label>
          <textarea
            value={saveNoteDraft}
            onChange={(e) => setSaveNoteDraft(e.target.value)}
            maxLength={140}
            rows={3}
            placeholder="議論のポイント、狙いなど"
            className="w-full rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none tb-input"
          />

          <div className="mt-4 px-3 py-2.5 rounded-lg text-xs tb-summary">
            <div className="flex justify-between mb-1">
              <span>選手数</span>
              <span className="tb-text-bright font-bold">{players.length - hidden.size} / 16 人</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>矢印</span>
              <span className="tb-text-bright font-bold">{arrows.length} 本</span>
            </div>
            <div className="flex justify-between">
              <span>表示</span>
              <span className="tb-text-bright font-bold">
                {zoom === 'full' ? '試合全体' : zoom === 'home' ? '自陣' : '敵陣'}
              </span>
            </div>
          </div>

          <div className="mt-5 flex gap-2 justify-end">
            <button
              onClick={() => setShowSaveDialog(false)}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold tb-ghost-btn"
            >
              キャンセル
            </button>
            <button
              onClick={confirmSave}
              disabled={busy || !saveNameDraft.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 tb-primary-btn"
            >
              <Save size={14} /> {busy ? '保存中...' : '保存する'}
            </button>
          </div>
        </Modal>
      )}

      {/* 履歴モーダル */}
      {showLibrary && (
        <Modal onClose={() => setShowLibrary(false)} wide>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background: NAVY_SOFT}}>
                <FolderOpen size={18} style={{color: GOLD}} />
              </div>
              <div>
                <h2 className="text-lg font-black">保存した作戦</h2>
                <p className="text-xs tb-text-dim">
                  {savesLoaded ? `${saves.length} 件保存されています` : '読み込み中...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLibrary(false)}
              className="p-2 rounded-lg tb-ghost-btn"
            >
              <XIcon size={18} />
            </button>
          </div>

          {saves.length === 0 && savesLoaded && (
            <div className="py-14 text-center tb-text-dim">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
              <div className="text-sm font-semibold mb-1">まだ保存された作戦はありません</div>
              <div className="text-xs tb-text-dimmer">
                配置を決めたら右上の「保存」ボタンで残せます
              </div>
            </div>
          )}

          {saves.length > 0 && (
            <div
              className="grid gap-3 overflow-y-auto pr-1"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                maxHeight: '60vh',
              }}
            >
              {saves.map(s => (
                <SaveCard
                  key={s.id}
                  save={s}
                  onLoad={() => loadSave(s)}
                  onDelete={() => deleteSave(s)}
                />
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* トースト */}
      {toast && (
        <div
          className="fixed left-1/2 bottom-6 px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold flex items-center gap-2"
          style={{
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: toast.type === 'error' ? '#7f1d1d'
                      : toast.type === 'success' ? '#065f46'
                      : '#1e293b',
            borderColor: toast.type === 'error' ? '#b91c1c'
                       : toast.type === 'success' ? '#10b981'
                       : '#475569',
            color: 'white',
          }}
        >
          {toast.type === 'success' && <Check size={16} />}
          {toast.type === 'error' && <XIcon size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ===== 小さいサブコンポーネント =====
function ScenarioBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors"
      style={
        active
          ? { background: GOLD, color: NAVY_DEEP }
          : { background: 'transparent', color: '#cdd7f4' }
      }
    >
      {icon} {label}
    </button>
  );
}

function ToolBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors"
      style={
        active
          ? { background: GOLD, color: NAVY_DEEP }
          : { background: 'transparent', color: '#cdd7f4' }
      }
    >
      {icon} {label}
    </button>
  );
}

function ArrowTypeBtn({ active, onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors"
      style={
        active
          ? { background: NAVY_SOFT, color: 'white' }
          : { background: 'transparent', color: '#cdd7f4' }
      }
    >
      <span
        className="inline-block w-3 rounded"
        style={{ height: 2, background: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }}
      />
      {label}
    </button>
  );
}

function TeamTab({ active, onClick, color, label, count, total }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-3 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
      style={{
        background: active ? NAVY_SOFT : 'transparent',
        color: active ? 'white' : '#8ea0cc',
        borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
      }}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
      <span className="text-xs font-semibold" style={{ color: '#6b7aa0', fontSize: 10 }}>
        {count}/{total}
      </span>
    </button>
  );
}

function IconBtn({ children, onClick, title, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        color: active ? GOLD : '#8ea0cc',
        background: 'transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = NAVY_SOFT; e.currentTarget.style.color = 'white'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = active ? GOLD : '#8ea0cc'; }}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label, circle }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block"
        style={{
          width: circle ? 10 : 16,
          height: circle ? 10 : 2.5,
          background: color,
          borderRadius: circle ? '50%' : 2,
        }}
      />
      {label}
    </div>
  );
}

// ===== サッカーボール SVG (クラシックな白×黒パネル) =====
function SoccerBall({ size = 28 }) {
  // 指定の中心(cx,cy)・外接半径r・回転角で正五角形の頂点を生成
  const penta = (cx, cy, r, rot = -Math.PI / 2) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = rot + i * 2 * Math.PI / 5;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  const BLACK = '#0f172a';

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <defs>
        <clipPath id="soccerBallClip">
          <circle cx="20" cy="20" r="17" />
        </clipPath>
      </defs>

      {/* 白いベース */}
      <circle cx="20" cy="20" r="17" fill="white" />

      {/* 黒い五角形パネル (ボール内でクリップ) */}
      <g clipPath="url(#soccerBallClip)" fill={BLACK}>
        {/* 中央 */}
        <polygon points={penta(20, 20, 5.2)} />
        {/* 上 (下向きに反転) */}
        <polygon points={penta(20, 5.5, 3.2, Math.PI / 2)} />
        {/* 右上 */}
        <polygon points={penta(33, 14.5, 3.2, Math.PI)} />
        {/* 左上 */}
        <polygon points={penta(7, 14.5, 3.2, 0)} />
        {/* 右下 */}
        <polygon points={penta(28.5, 31, 3.2, -Math.PI * 3 / 4)} />
        {/* 左下 */}
        <polygon points={penta(11.5, 31, 3.2, -Math.PI / 4)} />
      </g>

      {/* 外枠 */}
      <circle cx="20" cy="20" r="17" fill="none" stroke={BLACK} strokeWidth="1.8" />
    </svg>
  );
}

// ===== モーダル =====
function Modal({ children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 90,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-2xl shadow-2xl p-5"
        style={{
          background: `linear-gradient(180deg, ${NAVY_PANEL} 0%, ${NAVY_BG} 100%)`,
          border: `1px solid ${NAVY_BORDER}`,
          color: '#e6ecff',
          maxWidth: wide ? 880 : 420,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ===== 保存カード (履歴モーダル内) =====
const PITCH_W_PREVIEW = 50;
const PITCH_H_PREVIEW = 68;

function SaveCard({ save, onLoad, onDelete }) {
  const hidden = new Set(save.hidden || []);
  const visiblePlayers = (save.players || []).filter(p => !hidden.has(p.id));
  const arrows = save.arrows || [];
  const date = new Date(save.timestamp);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors flex flex-col tb-save-card"
    >
      {/* ミニピッチプレビュー */}
      <div
        className="relative cursor-pointer group"
        onClick={onLoad}
        style={{ aspectRatio: '50 / 68', background: '#166534' }}
      >
        <svg
          viewBox={`0 0 ${PITCH_W_PREVIEW} ${PITCH_H_PREVIEW}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* 芝縞 */}
          <defs>
            <pattern id={`stripes_${save.id}`} width={PITCH_W_PREVIEW} height="6" patternUnits="userSpaceOnUse">
              <rect width={PITCH_W_PREVIEW} height="3" fill="rgba(255,255,255,0.04)" />
              <rect y="3" width={PITCH_W_PREVIEW} height="3" fill="rgba(0,0,0,0.06)" />
            </pattern>
          </defs>
          <rect width={PITCH_W_PREVIEW} height={PITCH_H_PREVIEW} fill={`url(#stripes_${save.id})`} />
          {(() => {
            const E = 0.3;
            const lc = 'rgba(255,255,255,0.75)';
            const sw = 0.25;
            return (
              <g>
                <rect x={E} y={E} width={PITCH_W_PREVIEW - 2*E} height={PITCH_H_PREVIEW - 2*E}
                      fill="none" stroke={lc} strokeWidth={sw} />
                <line x1={E} y1={PITCH_H_PREVIEW / 2} x2={PITCH_W_PREVIEW - E} y2={PITCH_H_PREVIEW / 2}
                      stroke={lc} strokeWidth={sw} />
                <circle cx={PITCH_W_PREVIEW / 2} cy={PITCH_H_PREVIEW / 2} r="5"
                        fill="none" stroke={lc} strokeWidth={sw} />
                <rect x={(PITCH_W_PREVIEW - 27) / 2} y={PITCH_H_PREVIEW - E - 13} width="27" height="13"
                      fill="none" stroke={lc} strokeWidth={sw} />
                <rect x={(PITCH_W_PREVIEW - 27) / 2} y={E} width="27" height="13"
                      fill="none" stroke={lc} strokeWidth={sw} />
              </g>
            );
          })()}

          {/* 矢印 */}
          {arrows.map((a, i) => (
            <line key={i}
              x1={a.from.x} y1={a.from.y}
              x2={a.to.x} y2={a.to.y}
              stroke={a.kind === 'pass' ? '#facc15' : '#22d3ee'}
              strokeWidth="0.45"
              strokeLinecap="round"
              strokeDasharray={a.kind === 'pass' ? 'none' : '1,0.8'}
              opacity="0.95"
            />
          ))}

          {/* 選手 */}
          {visiblePlayers.map(p => (
            <circle key={p.id}
              cx={p.x} cy={p.y} r="1.9"
              fill={p.team === 'home' ? HOME_COLOR : AWAY_COLOR}
              stroke="white" strokeWidth="0.25"
            />
          ))}

          {/* ボール */}
          {save.ball && (
            <g>
              <circle
                cx={save.ball.x} cy={save.ball.y} r="1.3"
                fill="white" stroke="#0f172a" strokeWidth="0.35"
              />
              <circle
                cx={save.ball.x} cy={save.ball.y} r="0.4"
                fill="#0f172a"
              />
            </g>
          )}
        </svg>

        {/* ズームモードバッジ */}
        {save.zoom && save.zoom !== 'full' && (
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
            style={{
              background: `${NAVY_DEEP}e0`,
              color: GOLD_LIGHT,
              fontSize: 9,
              letterSpacing: '0.05em',
              border: `1px solid ${GOLD}66`,
            }}
          >
            {save.zoom === 'home' ? '自陣' : '敵陣'}
          </div>
        )}

        {/* ホバー時の「読み込む」オーバーレイ */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `${GOLD}d9` }}
        >
          <div className="font-black flex items-center gap-1.5" style={{ color: NAVY_DEEP }}>
            <FolderOpen size={18} /> 読み込む
          </div>
        </div>
      </div>

      {/* カード下部 */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="font-bold text-sm text-white truncate mb-1" title={save.name}>
          {save.name}
        </div>
        <div className="flex items-center gap-1 text-xs mb-2" style={{ color: '#8ea0cc' }}>
          <Calendar size={11} /> {dateStr}
        </div>
        {save.note && (
          <div
            className="text-xs mb-2 flex gap-1 items-start"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: '#cdd7f4',
            }}
          >
            <FileText size={11} className="shrink-0 mt-0.5 opacity-60" />
            <span>{save.note}</span>
          </div>
        )}
        <div className="flex gap-1.5 mt-auto pt-2">
          <button
            onClick={onLoad}
            className="flex-1 px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1 tb-primary-btn"
          >
            <FolderOpen size={12} /> 読み込む
          </button>
          <button
            onClick={onDelete}
            className="px-2.5 py-1.5 rounded-md text-xs font-bold tb-delete-btn"
            title="削除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
