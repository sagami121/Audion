import { state } from './state';
import { translations } from './translations';
import { updateEqGains, updateCompSettings, updateEffectsSettings } from './visualizer';

export function updateCompValuesUI(
  valThreshold: HTMLElement | null,
  valKnee: HTMLElement | null,
  valRatio: HTMLElement | null,
  valAttack: HTMLElement | null,
  valRelease: HTMLElement | null,
  valMakeup: HTMLElement | null
) {
  if (valThreshold) valThreshold.textContent = `${state.compSettings.threshold} dB`;
  if (valKnee) valKnee.textContent = `${state.compSettings.knee} dB`;
  if (valRatio) valRatio.textContent = `${state.compSettings.ratio.toFixed(1)}:1`;
  if (valAttack) valAttack.textContent = `${Math.round(state.compSettings.attack * 1000)} ms`;
  if (valRelease) valRelease.textContent = `${Math.round(state.compSettings.release * 1000)} ms`;
  if (valMakeup) valMakeup.textContent = `${state.compSettings.makeup} dB`;
}

export function updateEqUI(
  eqContainer: HTMLElement | null,
  populatePresetSelect: () => void,
  checkEq: HTMLInputElement | null,
  eqStatusText: HTMLElement | null,
  eqSliders: NodeListOf<HTMLInputElement> | null,
  compThreshold: HTMLInputElement | null,
  compKnee: HTMLInputElement | null,
  compRatio: HTMLInputElement | null,
  compAttack: HTMLInputElement | null,
  compRelease: HTMLInputElement | null,
  compMakeup: HTMLInputElement | null,
  checkReverb: HTMLInputElement | null,
  reverbLevel: HTMLInputElement | null,
  reverbType: HTMLSelectElement | null,
  checkDelay: HTMLInputElement | null,
  delayLevel: HTMLInputElement | null,
  delayTime: HTMLInputElement | null,
  delayFeedback: HTMLInputElement | null,
  updateCompValuesUIFn: () => void
) {
  if (!eqContainer) return;

  populatePresetSelect();

  const activeTabBtn = document.querySelector('.eq-tab-btn.active') as HTMLElement | null;
  const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'eq';
  let enabled = false;
  if (activeTab === 'eq') enabled = state.eqEnabled;
  else if (activeTab === 'comp') enabled = state.compEnabled;
  else if (activeTab === 'fx') enabled = state.reverbEnabled || state.delayEnabled;

  if (checkEq) checkEq.checked = enabled;
  const dict = translations[state.lang] || translations.ja;
  if (eqStatusText) eqStatusText.textContent = enabled ? (dict.eq_on || "ON") : (dict.eq_off || "OFF");

  const hdrCtrl = document.getElementById('eqHeaderControls');
  if (hdrCtrl) {
    hdrCtrl.style.display = activeTab === 'fx' ? 'none' : 'flex';
  }

  eqSliders?.forEach((slider, i) => {
    slider.value = state.eqGains[i].toString();
    const animBar = slider.parentElement?.querySelector('.eq-bar-anim') as HTMLElement | null;
    if (animBar) {
      const h = ((state.eqGains[i] + 12) / 24) * 140;
      animBar.style.height = `${h}px`;
    }
  });

  if (compThreshold) compThreshold.value = state.compSettings.threshold.toString();
  if (compKnee) compKnee.value = state.compSettings.knee.toString();
  if (compRatio) compRatio.value = state.compSettings.ratio.toString();
  if (compAttack) compAttack.value = state.compSettings.attack.toString();
  if (compRelease) compRelease.value = state.compSettings.release.toString();
  if (compMakeup) compMakeup.value = state.compSettings.makeup.toString();

  if (checkReverb) checkReverb.checked = state.reverbEnabled;
  if (reverbLevel) reverbLevel.value = state.reverbLevel.toString();
  if (reverbType) reverbType.value = state.reverbType;
  
  if (checkDelay) checkDelay.checked = state.delayEnabled;
  if (delayLevel) delayLevel.value = state.delayLevel.toString();
  if (delayTime) delayTime.value = state.delayTime.toString();
  if (delayFeedback) delayFeedback.value = state.delayFeedback.toString();

  updateCompValuesUIFn();

  updateEqGains(state.eqGains, state.eqEnabled);
  updateCompSettings(state.compSettings, state.compEnabled);
  updateEffectsSettings(
    { enabled: state.reverbEnabled, level: state.reverbLevel, type: state.reverbType },
    { enabled: state.delayEnabled, level: state.delayLevel, time: state.delayTime, feedback: state.delayFeedback }
  );
}
