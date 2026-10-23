/**
 * IndieBookShop: publish Sheet changes to the website.
 *
 * Paste this into the Sheet (Extensions → Apps Script), then follow
 * docs/setup/PUBLISHING.md. It adds an "IndieBookShop → Publish changes" menu,
 * and (after running installAutoPublish once) publishes automatically within
 * the hour after someone edits the Bookstores, Features, or Events tab.
 *
 * Publishing calls a Vercel Deploy Hook, which rebuilds the site from the Sheet
 * (about 2–3 minutes). If the Sheet's data looks broken, the build fails and
 * the current site stays up.
 */

const HOOK_PROPERTY = 'VERCEL_DEPLOY_HOOK_URL';
const EDITED_PROPERTY = 'EDITED_AT';
const DATA_TABS = ['Bookstores', 'Features', 'Events'];
/** Auto-publish waits until nobody has edited for this long, so a burst of edits is one deploy. */
const QUIET_MINUTES = 10;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('IndieBookShop')
    .addItem('Publish changes to the website', 'publishChanges')
    .addToUi();
}

/** Simple trigger: remember that a data tab was edited (form tabs like Newsletter don't count). */
function onEdit(e) {
  const tab = e && e.range && e.range.getSheet().getName();
  if (DATA_TABS.indexOf(tab) === -1) return;
  PropertiesService.getScriptProperties().setProperty(EDITED_PROPERTY, String(Date.now()));
}

/** Menu item: publish now. */
function publishChanges() {
  const ui = SpreadsheetApp.getUi();
  const result = triggerDeploy_();
  ui.alert(result.ok ? 'Publishing started. The website updates in about 2–3 minutes.' : 'Publishing failed: ' + result.message);
}

/** Hourly (installed by installAutoPublish): publish if the data tabs were edited and editing has stopped. */
function publishIfEdited() {
  const props = PropertiesService.getScriptProperties();
  const editedAt = Number(props.getProperty(EDITED_PROPERTY) || 0);
  if (!editedAt || Date.now() - editedAt < QUIET_MINUTES * 60 * 1000) return;
  const result = triggerDeploy_();
  if (result.ok) props.deleteProperty(EDITED_PROPERTY);
  else console.error('Auto-publish failed: ' + result.message);
}

/** Run once from the Apps Script editor to turn on hourly auto-publish. */
function installAutoPublish() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'publishIfEdited')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('publishIfEdited').timeBased().everyHours(1).create();
}

function triggerDeploy_() {
  const url = PropertiesService.getScriptProperties().getProperty(HOOK_PROPERTY);
  if (!url) return { ok: false, message: 'the ' + HOOK_PROPERTY + ' script property is not set (see docs/setup/PUBLISHING.md).' };
  const res = UrlFetchApp.fetch(url, { method: 'post', muteHttpExceptions: true });
  const code = res.getResponseCode();
  return code < 300 ? { ok: true } : { ok: false, message: 'Vercel answered ' + code + ': ' + res.getContentText().slice(0, 200) };
}
