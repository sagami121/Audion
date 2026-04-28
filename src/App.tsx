import React, { useEffect } from 'react';
import settingsIcon from './assets/settings.png';
import effectsIcon from './assets/audioeffects.png';
import appIcon from './assets/app_icon.jpg';

const App: React.FC = () => {
  useEffect(() => {
    // Initial theme / volume sync that used to be in index.html inline script
    try {
      const settings = JSON.parse(localStorage.getItem('af_settings') || '{}');
      const theme = settings.theme || 'dark';
      document.documentElement.classList.add(theme + '-theme');

      const savedW = localStorage.getItem('af_sidebar_w');
      if (savedW) {
        document.documentElement.style.setProperty('--sidebar-w', savedW);
      }

      const vol = settings.volume !== undefined ? settings.volume : 0.8;
      const volPct = (settings.muted ? 0 : vol) * 100;
      document.documentElement.style.setProperty('--init-vol', volPct + '%');
    } catch (e) {
      console.error("Init sync error:", e);
    }
  }, []);

  return (
    <>
      <div className="titlebar">
        <div className="titlebar-drag-region" data-tauri-drag-region></div>
        <div className="titlebar-logo">
          ▶ Audion
        </div>
        <div className="titlebar-controls">
          <button className="tb-btn tb-mini" id="btnMiniMode" title="ミニプレイヤー">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 7l2 2-2 2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button className="tb-btn tb-settings" id="btnSettings" title="設定">
            <img src={settingsIcon} alt="Settings" width="16" height="16" />
          </button>
          <button className="tb-btn tb-min" id="tbMin" title="最小化">
            <svg width="10" height="1" viewBox="0 0 10 1">
              <rect width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button className="tb-btn tb-max" id="tbMax" title="最大化">
            <svg width="9" height="9" viewBox="0 0 9 9">
              <rect x="0.5" y="0.5" width="8" height="8" stroke="currentColor" fill="none" />
            </svg>
          </button>
          <button className="tb-btn tb-close" id="tbClose" title="閉じる">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`app pl-${localStorage.getItem('af_settings') ? JSON.parse(localStorage.getItem('af_settings') || '{}').playlistPosition || 'left' : 'left'}`}>
        <aside className="sidebar" id="sidebar">
          <div className="sidebar-inner">
            <div className="add-bar">
              <button className="btn-primary" id="btnOpenFiles" title="ファイルを個別に選択" data-i18n-title="add_file">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                <span data-i18n="add_file">ファイル</span>
              </button>
              <button className="btn-primary" id="btnOpenFolder" title="フォルダ内の曲をすべて追加" data-i18n-title="add_folder">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10 8v4M8 10h4" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span data-i18n="add_folder">フォルダ</span>
              </button>
            </div>

            <div className="search-bar">
              <div className="search-input-wrap">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input type="search" id="plSearch" placeholder="曲名、アーティスト名で検索..." data-i18n-placeholder="search_placeholder" autoComplete="off" />
              </div>
            </div>

            <div className="pl-views">
              <button className="pl-view-btn active" data-view="all" data-i18n="view_all">すべて</button>
              <button className="pl-view-btn" data-view="recent" data-i18n="view_recent">最近追加</button>
              <button className="pl-view-btn" data-view="popular" data-i18n="popular">人気順</button>
              <button className="pl-view-btn" data-view="favorites" data-i18n="favorites">お気に入り</button>
              </div>

            <div className="playlist-hdr">
              <span className="lbl-sm" data-i18n="playlist">プレイリスト</span>
              <div className="playlist-hdr-actions">
                <button className="icon-btn-sm" id="btnSavePlaylist" title="保存" data-i18n-title="save">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M5 2v4h5V2M5 15v-4h6v4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
                <button className="icon-btn-sm" id="btnLoadPlaylist" title="読み込み" data-i18n-title="load">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4a2 2 0 012-2h3l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 7v6M6 11l2 2 2-2" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
                <span className="playlist-count" id="playlistCount">0 曲</span>
                <button className="icon-btn-sm" id="btnClearAll" title="全て削除" data-i18n-title="clear_all">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3h10M5 3V2h4v1M11 3l-.7 8.3A1 1 0 019.3 12H4.7a1 1 0 01-1-.7L3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="drop-hint" id="dropHint">
              <div className="drop-hint-icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M18 7v14M11 14l7-7 7 7" stroke="url(#dhg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 26a3 3 0 003 3h16a3 3 0 003-3" stroke="url(#dhg)" strokeWidth="2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="dhg" x1="7" y1="7" x2="29" y2="29">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <p data-i18n="drop_hint">ここに音楽ファイルを<br />ドラッグ＆ドロップ</p>
            </div>

            <ul className="playlist" id="playlist" role="listbox" aria-label="プレイリスト"></ul>
          </div>
        </aside>

        <div className="resizer" id="sidebarResizer"></div>
        <main className="player">
          <div className="art-section">
            <div className="art-glow" id="artGlow"></div>
            <div className="art-rings">
              <div className="art-ring r1"></div>
              <div className="art-ring r2"></div>
            </div>
            <div className="album-art" id="albumArt">
              <div className="art-default" id="artDefault">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="18" stroke="url(#dg)" strokeWidth="1.5" />
                  <circle cx="28" cy="28" r="5" fill="url(#dg)" />
                  <path d="M21 12v7l7-3.5-7-3.5z" fill="url(#dg)" />
                  <defs>
                    <linearGradient id="dg" x1="10" y1="10" x2="46" y2="46">
                      <stop offset="0%" stopColor="var(--accent-color, #a78bfa)" />
                      <stop offset="100%" stopColor="var(--glow-color, #38bdf8)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <img id="artImg" alt="Album Art" style={{ display: 'none' }} crossOrigin="anonymous" />
            </div>
            <div className="vinyl-center" id="vinylCenter"></div>
            <div className="lyrics-container" id="lyricsContainer">
              <div className="lyrics-inner" id="lyricsInner"></div>
            </div>
          </div>

          <div className="eq-overlay" id="eqOverlay">
            <div className="eq-header">
              <div className="eq-tabs">
                <button className="eq-tab-btn active" data-tab="eq" data-i18n="equalizer">イコライザー</button>
                <button className="eq-tab-btn" data-tab="comp" data-i18n="compressor">コンプレッサー</button>
                <button className="eq-tab-btn" data-tab="fx" data-i18n="fx">エフェクト</button>
              </div>
              <div id="eqHeaderControls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="theme-btn" id="btnEqReset" data-i18n="reset" style={{ padding: '4px 12px', fontSize: '11px' }}>リセット</button>
                <label className="setting-lbl" id="eqToggleLabel" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" id="checkEq" />
                  <span id="eqStatusText" style={{ fontSize: '11px', fontWeight: 600 }}>OFF</span>
                </label>
              </div>
            </div>

            <div id="eqTabContent" className="tab-content active" style={{ flexDirection: 'column' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="lbl-sm" data-i18n="presets">プリセット</span>
                <select id="eqPresetsSelect" className="select-input" style={{ flex: 1, padding: '4px 10px', fontSize: '11px' }}></select>
              </div>
              <div className="eq-container" id="eqContainer">
                {[...Array(10)].map((_, i) => (
                  <div className="eq-band" key={i}>
                    <input type="range" className="eq-slider" min="-12" max="12" defaultValue="0" data-index={i} />
                    <div className="eq-bar-anim"></div>
                    <span>{[32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="compTabContent" className="tab-content">
              <div className="comp-container" id="compContainer">
                <div className="comp-band">
                  <span data-i18n="threshold">閾値</span>
                  <input type="range" className="comp-slider" id="compThreshold" min="-100" max="0" step="1" defaultValue="-24" />
                  <span className="comp-val" id="valThreshold">-24 dB</span>
                </div>
                <div className="comp-band">
                  <span data-i18n="knee">Knee 半径</span>
                  <input type="range" className="comp-slider" id="compKnee" min="0" max="40" step="1" defaultValue="30" />
                  <span className="comp-val" id="valKnee">30 dB</span>
                </div>
                <div className="comp-band">
                  <span data-i18n="ratio">比率</span>
                  <input type="range" className="comp-slider" id="compRatio" min="1" max="20" step="0.1" defaultValue="12" />
                  <span className="comp-val" id="valRatio">12:1</span>
                </div>
                <div className="comp-band">
                  <span data-i18n="attack">アタック</span>
                  <input type="range" className="comp-slider" id="compAttack" min="0" max="1" step="0.001" defaultValue="0.003" />
                  <span className="comp-val" id="valAttack">3 ms</span>
                </div>
                <div className="comp-band">
                  <span data-i18n="release">リリース</span>
                  <input type="range" className="comp-slider" id="compRelease" min="0" max="1" step="0.01" defaultValue="0.25" />
                  <span className="comp-val" id="valRelease">250 ms</span>
                </div>
                <div className="comp-band">
                  <span data-i18n="makeup">Makeup ゲイン</span>
                  <input type="range" className="comp-slider" id="compMakeup" min="0" max="20" step="0.1" defaultValue="0" />
                  <span className="comp-val" id="valMakeup">0 dB</span>
                </div>
              </div>
            </div>

            <div id="fxTabContent" className="tab-content">
              <div className="fx-container">
                <div className="fx-group" id="reverbGroup">
                  <div className="fx-hdr">
                    <span className="lbl-sm" data-i18n="reverb">リバーブ</span>
                    <input type="checkbox" id="checkReverb" />
                  </div>
                  <div className="fx-controls">
                    <div className="fx-row">
                      <span data-i18n="dry_wet">Dry / Wet</span>
                      <input type="range" id="reverbLevel" min="0" max="1" step="0.01" defaultValue="0.4" />
                    </div>
                    <div className="fx-row">
                      <span data-i18n="type">タイプ</span>
                      <select id="reverbType" className="select-input" style={{ padding: '2px 8px', fontSize: '11px' }}>
                        <option value="room" data-i18n="room">部屋</option>
                        <option value="hall" data-i18n="hall">ホール</option>
                        <option value="cave" data-i18n="cave">洞窟</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="setting-divider" style={{ margin: '8px 0' }}></div>

                <div className="fx-group" id="delayGroup">
                  <div className="fx-hdr">
                    <span className="lbl-sm" data-i18n="delay">ディレイ</span>
                    <input type="checkbox" id="checkDelay" />
                  </div>
                  <div className="fx-controls">
                    <div className="fx-row">
                      <span data-i18n="dry_wet">Dry / Wet</span>
                      <input type="range" id="delayLevel" min="0" max="1" step="0.01" defaultValue="0.3" />
                    </div>
                    <div className="fx-row">
                      <span data-i18n="time">時間</span>
                      <input type="range" id="delayTime" min="0" max="2" step="0.01" defaultValue="0.4" />
                    </div>
                    <div className="fx-row">
                      <span data-i18n="feedback">フィードバック</span>
                      <input type="range" id="delayFeedback" min="0" max="0.9" step="0.01" defaultValue="0.3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="track-section">
            <div className="track-title-wrap" id="trackTitleWrap">
              <h1 className="track-title" id="trackTitle" data-i18n="select_track">曲を選択してください</h1>
            </div>
            <p className="track-sub" id="trackSub" data-i18n="welcome">Audion へようこそ</p>
          </div>

          <div className="progress-section">
            <span className="time-lbl" id="curTime">0:00</span>
            <div className="seeker" id="seeker" role="slider" tabIndex={0} aria-label="再生位置" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
              <div className="seeker-buf" id="seekBuf"></div>
              <div className="seeker-fill" id="seekFill"></div>
              <div className="seeker-thumb" id="seekThumb"></div>
            </div>
            <span className="time-lbl" id="durTime">0:00</span>
          </div>

          <div className="controls-section">
            <button className="ctrl-icon" id="shuffleBtn" title="シャッフル" data-i18n-title="shuffle">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 5h3l7 10h5M17 5h-3l-2 2.5M13.5 12.5l1 1.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 3l2 2-2 2M15 13l2 2-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="ctrl-icon ctrl-md" id="prevBtn" title="前の曲" data-i18n-title="prev">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 4v14M17 4L8 11l9 7V4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="play-btn" id="playBtn" data-i18n-label="play_pause" aria-label="再生/一時停止">
              <svg className="ic-play" width="26" height="26" viewBox="0 0 26 26">
                <path d="M8 5l14 8-14 8V5z" fill="currentColor" />
              </svg>
              <svg className="ic-pause" width="26" height="26" viewBox="0 0 26 26" style={{ display: 'none' }}>
                <rect x="5" y="4" width="5" height="18" rx="2" fill="currentColor" />
                <rect x="16" y="4" width="5" height="18" rx="2" fill="currentColor" />
              </svg>
            </button>
            <button className="ctrl-icon ctrl-md" id="nextBtn" title="次の曲" data-i18n-title="next">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M17 4v14M5 4l9 7-9 7V4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="ctrl-icon" id="repeatBtn" title="リピート" data-i18n-title="repeat">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 7V5a2 2 0 012-2h8l2 2M17 13v2a2 2 0 01-2 2H7l-2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 3l2 2-2 2M7 17l-2-2 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="repeat-badge" id="repeatBadge" style={{ display: 'none' }}>1</span>
            </button>
            <button className="ctrl-icon" id="btnShowEq" title="オーディオエフェクト" data-i18n-title="audioeffects">
              <img src={effectsIcon} alt="Audio Effects" width="18" height="18" />
            </button>
          </div>

          <div className="volume-section">
            <button className="ctrl-icon" id="muteBtn" title="ミュート" data-i18n-title="mute">
              <div id="volIcon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor" />
                  <path d="M11 6a4 4 0 010 6M13.5 3.5a8 8 0 010 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </button>
            <div className="vol-bar" id="volBar" role="slider" tabIndex={0} data-i18n-label="volume" aria-label="音量" aria-valuemin={0} aria-valuemax={100}>
              <div className="vol-fill" id="volFill" style={{ width: 'var(--init-vol, 0%)' }}></div>
              <div className="vol-thumb" id="volThumb" style={{ left: 'var(--init-vol, 0%)' }}></div>
            </div>
            <span className="vol-lbl" id="volLbl">0%</span>
          </div>

          <div className="speed-ctrl">
            <span data-i18n="speed">速度</span>
            <input type="range" id="speedSlider" className="speed-slider" min="0.5" max="2.0" step="0.1" defaultValue="1.0" />
            <span className="speed-lbl" id="speedLbl">1.0x</span>
          </div>
        </main>
      </div>

      <div className="drop-overlay" id="dropOverlay">
        <div className="drop-overlay-content">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M32 14v28M20 28l12-14 12 14" stroke="url(#dog)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 50a4 4 0 004 4h28a4 4 0 004-4" stroke="url(#dog)" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="dog" x1="14" y1="14" x2="50" y2="50">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
          <p data-i18n="drop_overlay">ドロップして追加</p>
        </div>
      </div>

      <div className="modal-overlay" id="settingsModal">
        <div className="modal-card settings-card">
          <div className="modal-hdr">
            <h3 data-i18n="settings">設定</h3>
            <button className="modal-close" id="btnCloseSettings">&times;</button>
          </div>
          <div className="settings-layout">
            <aside className="settings-sidebar">
              <button className="settings-nav-btn active" data-tab="general">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                <span data-i18n="setting_general">一般</span>
              </button>
              <button className="settings-nav-btn" data-tab="appearance">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0-10 10h20a10 10 0 0 0-10-10z"></path></svg>
                <span data-i18n="setting_appearance">外観</span>
              </button>
              <button className="settings-nav-btn" data-tab="other">
                <img src={settingsIcon} width="18" height="18" style={{ flexShrink: 0, opacity: 0.8, filter: 'var(--icon-filter)' }} alt="Settings" />
                <span data-i18n="setting_other">その他</span>
              </button>
              <button className="settings-nav-btn" data-tab="feedback">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.5 8.5 0 0 1 4.7 1.4L21 4.5z"></path></svg>
                <span data-i18n="setting_feedback">フィードバック</span>
              </button>
              <button className="settings-nav-btn" data-tab="version">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span data-i18n="version">バージョン</span>
              </button>
            </aside>
            <div className="settings-content">
              <div className="settings-section active" id="settings-general">
                <div className="setting-item">
                  <label className="setting-lbl">
                    <span data-i18n="always_on_top">ウインドウを常に手前に表示</span>
                    <input type="checkbox" id="checkOnTop" />
                  </label>
                </div>
                <div className="setting-item">
                  <label className="setting-lbl">
                    <span data-i18n="restore_session">起動時に前回の状態を復元する</span>
                    <input type="checkbox" id="checkRestoreSession" />
                  </label>
                </div>
                <div className="setting-item">
                  <label className="setting-lbl">
                    <span data-i18n="show_lyrics">歌詞を表示する</span>
                    <input type="checkbox" id="checkShowLyrics" />
                  </label>
                </div>
                <div className="setting-item">
                  <label className="setting-lbl">
                    <span data-i18n="discord_rpc">Discord Rich Presence</span>
                    <input type="checkbox" id="checkDiscordRPC" />
                  </label>
                </div>
              </div>

              <div className="settings-section" id="settings-appearance">
                <div className="setting-item">
                  <label className="form-group">
                    <span data-i18n="theme">テーマ</span>
                    <div className="theme-toggle-wrap" style={{ marginTop: '8px' }}>
                      <button className="theme-btn" id="btnThemeDark" data-theme="dark" data-i18n="theme_dark">ダーク</button>
                      <button className="theme-btn" id="btnThemeLight" data-theme="light" data-i18n="theme_light">ライト</button>
                    </div>
                  </label>
                </div>
                <div className="setting-item">
                  <label className="form-group">
                    <span data-i18n="language">言語</span>
                    <select id="langSelect" className="select-input" style={{ marginTop: '8px' }}>
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="zh">简体中文</option>
                    </select>
                  </label>
                </div>
                <div className="setting-item">
                  <label className="form-group">
                    <div className="opacity-row">
                      <span data-i18n="ui_opacity">UI透明度</span>
                      <span className="opacity-lbl-val" id="opacityLbl">40%</span>
                    </div>
                    <input type="range" id="opacitySlider" min="0" max="100" step="1" defaultValue="40" />
                  </label>
                </div>
              </div>

              <div className="settings-section" id="settings-other">
                <div className="setting-item">
                  <button className="btn-secondary" id="btnViewLogs" style={{ width: '100%', marginBottom: '12px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span data-i18n="setting_view_logs">ログを表示</span>
                  </button>
                </div>

                <div className="setting-item">
                  <label className="setting-lbl">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span data-i18n="setting_hw_accel">ハードウェアアクセラレーション</span>
                      <span className="setting-hint" style={{ textAlign: 'left', marginTop: '0', fontSize: '10px' }} data-i18n="setting_hw_accel_hint">※変更を反映するにはアプリの再起動が必要です</span>
                    </div>
                    <input type="checkbox" id="checkHwAccel" />
                  </label>
                </div>

                <div className="setting-divider"></div>

                <div className="setting-item">
                  <button className="btn-secondary" id="btnResetSettings" style={{ width: '100%', color: '#ff8a80', borderColor: 'rgba(255, 138, 128, 0.3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                    <span data-i18n="setting_reset">設定を初期化</span>
                  </button>
                </div>

                <p style={{ opacity: 0.6, fontSize: '11px', textAlign: 'center', padding: '20px 0' }} data-i18n="auto_save_hint">※設定は自動的に保存されます</p>
              </div>

              <div className="settings-section" id="settings-feedback">
                <div className="bug-layout">
                  <aside className="bug-sidebar">
                    <button className="bug-nav-btn active" data-category="bug">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><path d="M18 6L6 18M6 6l12 12"></path></svg>
                      <span data-i18n="category_bug">不具合報告</span>
                    </button>
                    <button className="bug-nav-btn" data-category="request">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><path d="M12 5v14M5 12l7 7 7-7"></path></svg>
                      <span data-i18n="category_request">要望・要望</span>
                    </button>
                    <button className="bug-nav-btn" data-category="other">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, minWidth: '18px', overflow: 'visible' }}><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
                      <span data-i18n="category_other">その他</span>
                    </button>
                    <input type="hidden" id="bugCategory" value="bug" />
                  </aside>
                  <div className="bug-content">
                    <div className="form-group">
                      <label htmlFor="bugTitle" data-i18n="bug_form_title">件名</label>
                      <input type="text" id="bugTitle" placeholder="不具合の要約" data-i18n-placeholder="bug_form_placeholder_title" className="form-input" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bugDesc" data-i18n="bug_form_desc">詳細</label>
                      <textarea id="bugDesc" placeholder="発生手順や期待される動作など..." data-i18n-placeholder="bug_form_placeholder_desc" className="form-input" rows={6} style={{ resize: 'none' }}></textarea>
                    </div>
                    <div className="form-error" id="bugError" hidden></div>
                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                      <p className="setting-hint" style={{ fontSize: '11px', opacity: 0.6, margin: 0 }} data-i18n="bug_hint">※開発者に報告内容が送信されます</p>
                      <button className="btn-primary" id="btnSubmitBug" style={{ minWidth: '120px' }} data-i18n="bug_submit">送信する</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-section" id="settings-version">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <img src={appIcon} width="64" height="64" style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} alt="App Icon" />
                  </div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Audion</h4>
                  <p className="version-text" style={{ fontSize: '12px', opacity: 0.7, margin: '0 0 20px 0' }}>Version <span id="appVersion">0.0.0</span></p>
                  
                  <button className="btn-secondary" id="btnCheckUpdate" style={{ width: '100%' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span data-i18n="check_update">アップデートを確認</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-primary" id="btnSaveSettings" style={{ width: '100%' }} data-i18n="save_settings">設定を保存</button>
          </div>
        </div>
      </div>


      <div className="modal-overlay" id="logModal">
        <div className="modal-card" style={{ maxWidth: '600px', width: '90%', height: '80%' }}>
          <div className="modal-hdr">
            <h3 data-i18n="log_title">アプリログ</h3>
            <button className="modal-close" id="btnCloseLogs">&times;</button>
          </div>
          <div className="modal-body" style={{ height: 'calc(100% - 110px)', padding: '0' }}>
            <textarea id="logArea" readOnly style={{ width: '100%', height: '100%', background: '#000', color: '#0f0', border: 'none', padding: '15px', fontFamily: 'monospace', fontSize: '11px', outline: 'none', resize: 'none' }}></textarea>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" id="btnClearLogs" style={{ minWidth: '100px' }} data-i18n="clear_all">全て削除</button>
          </div>
        </div>
      </div>

      <div className="modal-overlay" id="releaseNotesModal">
        <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }}>
          <div className="modal-hdr">
            <h3 data-i18n="release_notes">更新内容</h3>
            <button className="modal-close" id="btnCloseReleaseNotes">&times;</button>
          </div>
          <div className="modal-body">
            <div className="release-notes-content" id="releaseNotesContent" style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', color: 'var(--text)', marginBottom: '15px', padding: '10px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}></div>
            <button className="btn-primary" id="btnReleaseNotesOk" style={{ width: '100%' }}>OK</button>
          </div>
        </div>
      </div>

      <div className="toast" id="toast"></div>

      <div className="update-toast" id="updateToast">
        <div className="update-toast-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="update-toast-content">
          <div className="update-toast-title" data-i18n="update_available">アップデートがあります</div>
          <div className="update-toast-desc" data-i18n="update_desc">新機能と修正が含まれています</div>
          <div className="update-toast-actions">
            <button className="update-btn-now" id="btnUpdateNow" data-i18n="update_now">今すぐ更新</button>
            <button className="update-btn-later" id="btnUpdateLater" data-i18n="update_later">後で通知</button>
            <button className="update-btn-info" id="btnUpdateInfo" data-i18n-title="release_notes" title="更新内容">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <audio id="audio" crossOrigin="anonymous"></audio>
      <canvas id="colorCanvas" style={{ display: 'none' }}></canvas>

      <div className="context-menu" id="contextMenu">
        <div className="context-menu-item" id="cmMoveUp">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span data-i18n="move_up">一つ上へ</span>
        </div>
        <div className="context-menu-item" id="cmMoveDown">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span data-i18n="move_down">一つ下へ</span>
        </div>
        <div className="context-menu-divider"></div>
        <div className="context-menu-item" id="cmMoveTop">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M17 11l-5-5-5 5M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span data-i18n="move_top">一番上へ</span>
        </div>
        <div className="context-menu-item" id="cmMoveBottom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span data-i18n="move_bottom">一番下へ</span>
        </div>
      </div>

      <div className="context-menu" id="sidebarContextMenu">
        <div className="context-menu-label" data-i18n="pl_pos">再生リストの位置</div>
        <div className="context-menu-divider"></div>
        <div className="context-menu-item" id="cmPosLeft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 3v18" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span data-i18n="pl_left">左</span>
        </div>
        <div className="context-menu-item" id="cmPosRight">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 3v18" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span data-i18n="pl_right">右</span>
        </div>
      </div>
    </>
  );
};

export default App;
