// Behaviour on every page: copy buttons, install tabs, the `/` shortcut and the mobile menu.
import t from './i18n.js';

const root = document.documentElement.dataset.root || './';
const live = document.getElementById('announce');
const timers = new WeakMap();

// Re-announces identical messages by toggling an invisible character.
let flip = false;
export function announce(message) {
  flip = !flip;
  live.textContent = message + (flip ? '​' : '');
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr-only';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    area.remove();
    return ok;
  }
}

function swapIcon(button, from, to) {
  const use = button.querySelector('use');
  if (use) use.setAttribute('href', use.getAttribute('href').replace(`#${from}`, `#${to}`));
}

// Shows "Copied" for two seconds; screen readers hear the button's message.
function feedback(button, ok) {
  const label = button.querySelector('.label');
  if (label && !button.dataset.idleLabel) button.dataset.idleLabel = label.textContent;
  clearTimeout(timers.get(button));
  button.classList.add('copied');
  swapIcon(button, 'copy', 'check');
  if (label) label.textContent = ok ? t.copy.copied : t.copy.failed;
  announce(ok ? button.dataset.copyMessage || t.copy.done : t.copy.failedMessage);
  timers.set(
    button,
    setTimeout(() => {
      button.classList.remove('copied');
      swapIcon(button, 'check', 'copy');
      if (label) label.textContent = button.dataset.idleLabel;
    }, 2000),
  );
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy], [data-copy-code]');
  if (!button) return;
  event.preventDefault();
  const text = button.hasAttribute('data-copy') ? button.dataset.copy : button.parentElement.querySelector('pre').textContent;
  feedback(button, await writeClipboard(text));
});

// Install tabs: arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
for (const box of document.querySelectorAll('[data-tabs]')) {
  const tabs = [...box.querySelectorAll('[role="tab"]')];
  const select = (selected) => {
    for (const tab of tabs) {
      const on = tab === selected;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).toggleAttribute('data-inactive', !on);
    }
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const i = tabs.indexOf(tab);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      select(target);
      target.focus();
    });
  }
}

const menu = document.querySelector('.menu');
document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
    const search = document.getElementById('q');
    event.preventDefault();
    if (search && !search.disabled) {
      search.focus();
      search.select();
    } else if (!search) {
      location.href = `${root}#search`;
    }
  }
  if (event.key === 'Escape' && menu?.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
document.addEventListener('click', (event) => {
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});

// Back from a plugin page returns to the search the visitor came from.
const back = document.querySelector('[data-back]');
if (back && document.referrer) {
  try {
    const from = new URL(document.referrer);
    const home = new URL(root, location.href);
    if (from.origin === home.origin && from.pathname === home.pathname && from.search) {
      back.href = from.href;
      back.querySelector('span').textContent = t.plugin.backToSearch;
    }
  } catch {}
}

if (document.body.dataset.page === 'home') import('./home.js');
