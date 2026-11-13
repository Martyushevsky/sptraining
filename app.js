/* ==========================================================================
   ITEM NAMES — EDIT HERE
   --------------------------------------------------------------------------
   Rename any item by changing the text after each colon. These values feed
   the inventory labels, totals, "Limited by" badges, crystal table headers
   and the copied summary, so you only need to change them in this block.
   Some items have singular and plural entries — update both when renaming.
   Keep the keys on the left unchanged.
   ========================================================================== */

const NAMES = {
  // Inventory group names, singular and plural
  bead: 'bead',
  beads: 'Beads',
  crystal: 'crystal',
  crystals: 'Crystals',

  // Resources
  gold: 'Hologold',
  hololium: 'Hololium',

  // Bead rows
  beadSmall: 'Beads Bundle S',
  beadMedium: 'Beads Bundle M',
  beadLarge: 'Beads Bundle L',
  beadPink: 'Cute (Pink)',
  beadGreen: 'Pure (Green)',
  beadYellow: 'Happy (Yellow)',

  // Crystal rows
  crystalSmall: 'A Jar of Crystals S',
  crystalMedium: 'A Jar of Crystals M',
  crystalLarge: 'A Jar of Crystals L',
  crystalPink: 'Cute (Pink)',
  crystalGreen: 'Pure (Green)',
  crystalYellow: 'Happy (Yellow)',
};

const lowerName = (name) => name.toLowerCase();

const MODEL = {
  beadSizes: [
    { key: 'beadSmall', label: NAMES.beadSmall, mult: 10 },
    { key: 'beadMedium', label: NAMES.beadMedium, mult: 100 },
    { key: 'beadLarge', label: NAMES.beadLarge, mult: 300 },
  ],
  beadColors: [
    { key: 'beadPink', label: NAMES.beadPink },
    { key: 'beadGreen', label: NAMES.beadGreen },
    { key: 'beadYellow', label: NAMES.beadYellow },
  ],
  crystalSizes: [
    { key: 'crystalSmall', label: NAMES.crystalSmall, mult: 10 },
    { key: 'crystalMedium', label: NAMES.crystalMedium, mult: 100 },
    { key: 'crystalLarge', label: NAMES.crystalLarge, mult: 300 },
  ],
  crystalColors: [
    { key: 'crystalPink', label: NAMES.crystalPink },
    { key: 'crystalGreen', label: NAMES.crystalGreen },
    { key: 'crystalYellow', label: NAMES.crystalYellow },
  ],
  tiers: [
    {
      key: '5',
      label: '5★',
      beads: [300, 900, 900, 900],
      gold: [75000, 300000, 750000, 1500000],
      crystals: [0, 150, 750, 1900],
      hololium: [0, 0, 1, 4],
    },
    {
      key: '4',
      label: '4★',
      beads: [200, 600, 1200, 2000],
      gold: [35000, 140000, 350000, 700000],
      crystals: [0, 100, 300, 700],
      hololium: [0, 0, 0, 1],
    },
    {
      key: '3',
      label: '3★',
      beads: [100, 300, 700, 1300],
      gold: [20000, 80000, 200000, 400000],
      crystals: [0, 0, 100, 300],
      hololium: [0, 0, 0, 0],
    },
  ],
};

const INPUT_IDS = [
  ...MODEL.beadSizes.map((row) => row.key),
  ...MODEL.beadColors.map((row) => row.key),
  ...MODEL.crystalSizes.map((row) => row.key),
  ...MODEL.crystalColors.map((row) => row.key),
  'gold',
  'hololium',
];

const STORAGE_KEY = 'holo-inventory:v1';
const BEADS_PER_CRYSTAL = 3;

/* 12 digits keeps the worst-case bead total + 3 × crystal total under 2^53. */
const MAX_AMOUNT = 999_999_999_999;
const RESOURCE_NAMES = { beads: NAMES.beads, gold: NAMES.gold, hololium: NAMES.hololium };

const els = {
  tiers: document.getElementById('tiers'),
  costs: document.getElementById('costs'),
};

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function format(n) {
  return Number.isFinite(n) ? numberFormat.format(n).replace(/,/g, ' ') : '--';
}

const COMPACT_UNITS = ['M', 'B', 'T', 'Q'];

/**
 * Exact below one million, then a short value with up to three significant
 * digits (1.23 M, 34.6 M, 123 M). The exact figure goes in the tooltip.
 */
function formatCompact(n) {
  if (!Number.isFinite(n)) return format(n);

  const abs = Math.abs(n);
  if (abs < 1e6) return format(n);

  if (abs >= 1e18) {
    return n.toExponential(2).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }

  let unit = Math.min(Math.floor(Math.log10(abs) / 3) - 2, COMPACT_UNITS.length - 1);
  let scaled = n / 1000 ** (unit + 2);
  let digits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
  let rounded = Number(scaled.toFixed(digits));

  // 999.6 M rounds to 1 000 M: step up to the next suffix instead.
  if (Math.abs(rounded) >= 1000 && unit < COMPACT_UNITS.length - 1) {
    unit += 1;
    scaled = n / 1000 ** (unit + 2);
    digits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
    rounded = Number(scaled.toFixed(digits));
  }

  return `${format(rounded)} ${COMPACT_UNITS[unit]}`;
}

/** Writes a compact number and keeps the exact figure in the tooltip. */
function setNumberCell(el, value, fallback = '--') {
  if (!Number.isFinite(value)) {
    el.textContent = fallback;
    el.removeAttribute('title');
    return;
  }

  const exact = format(value);
  el.textContent = formatCompact(value);
  if (el.textContent === exact) {
    el.removeAttribute('title');
  } else {
    el.title = exact;
  }
}

function floorDiv(a, b) {
  return b > 0 ? Math.floor(a / b) : Infinity;
}

function parseNumber(raw) {
  const cleaned = String(raw).replace(/[\s,]/g, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function groupDigits(raw) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatField(field) {
  const raw = field.value;
  if (raw === '') return;

  const caret = field.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
  const formatted = groupDigits(raw);
  if (formatted === raw) return;

  field.value = formatted;

  let pos = 0;
  let seen = 0;
  while (pos < formatted.length && seen < digitsBefore) {
    if (/\d/.test(formatted[pos])) seen += 1;
    pos += 1;
  }
  field.setSelectionRange(pos, pos);
}

function formatAllFields() {
  INPUT_IDS.forEach((id) => formatField(document.getElementById(id)));
}

function readAmount(id) {
  const raw = document.getElementById(id).value.trim();
  if (raw === '') return 0;
  const n = parseNumber(raw);
  if (!Number.isFinite(n) || n > MAX_AMOUNT) return NaN;
  return Math.max(0, n);
}

/** Everything the sheet calculates, in sheet order. */
function calculate() {
  const beadSizes = MODEL.beadSizes.map((row) => ({
    ...row,
    amount: readAmount(row.key),
    result: readAmount(row.key) * row.mult,
  }));
  const beadColors = MODEL.beadColors.map((row) => {
    const amount = readAmount(row.key);
    return { ...row, amount, converted: Math.floor(amount / BEADS_PER_CRYSTAL) };
  });

  const beadSizeTotal = beadSizes.reduce((sum, row) => sum + row.result, 0); // D5
  const beadColorTotal = beadColors.reduce((sum, row) => sum + row.amount, 0); // D10
  const beadTotal = beadSizeTotal + beadColorTotal; // D12
  const beadConvertedSize = Math.floor(beadSizeTotal / BEADS_PER_CRYSTAL); // F5
  const beadConvertedColor = Math.floor(beadColorTotal / BEADS_PER_CRYSTAL); // F10
  const beadConverted = beadConvertedSize + beadConvertedColor; // F12

  const crystalSizes = MODEL.crystalSizes.map((row) => ({
    ...row,
    amount: readAmount(row.key),
    result: readAmount(row.key) * row.mult,
  }));
  const crystalColors = MODEL.crystalColors.map((row) => ({
    ...row,
    amount: readAmount(row.key),
  }));

  const crystalSizeTotal = crystalSizes.reduce((sum, row) => sum + row.result, 0); // D19
  const crystalColorTotal = crystalColors.reduce((sum, row) => sum + row.amount, 0); // D24
  const crystalTotal = crystalSizeTotal + crystalColorTotal; // D26
  const crystalAll = crystalTotal + beadConverted; // D27

  const gold = readAmount('gold');
  const hololium = readAmount('hololium');

  const tiers = MODEL.tiers.map((tier) => ({
    ...tier,
    options: tier.beads.map((beadCost, index) => {
      const crystalCost = tier.crystals[index];
      const goldCost = tier.gold[index];
      const hololiumCost = tier.hololium[index];
      const beadEqCost = beadCost + BEADS_PER_CRYSTAL * crystalCost;

      // Beads limit is the sheet's exact MIN(INT(D12/cost), INT((D12+3*D26)/beadEqCost)).
      const beadsLimit = Math.min(floorDiv(beadTotal, beadCost), floorDiv(beadTotal + BEADS_PER_CRYSTAL * crystalTotal, beadEqCost));
      const limits = {
        beads: beadsLimit,
        gold: floorDiv(gold, goldCost),
        hololium: floorDiv(hololium, hololiumCost),
      };
      const max = Math.min(limits.beads, limits.gold, limits.hololium);
      const binding = ['beads', 'gold', 'hololium'].find((name) => limits[name] === max) ?? 'none';

      return { beadCost, crystalCost, goldCost, hololiumCost, limits, max, binding };
    }),
  }));

  const valid =
    Number.isFinite(beadTotal) &&
    Number.isFinite(beadConverted) &&
    Number.isFinite(crystalTotal) &&
    Number.isFinite(crystalAll) &&
    Number.isFinite(gold) &&
    Number.isFinite(hololium);

  return {
    beadSizes,
    beadColors,
    beadSizeTotal,
    beadColorTotal,
    beadTotal,
    beadConvertedSize,
    beadConverted,
    crystalSizes,
    crystalColors,
    crystalSizeTotal,
    crystalColorTotal,
    crystalTotal,
    crystalAll,
    tiers,
    gold,
    hololium,
    valid,
  };
}

/** Applies the editable NAMES block to the static labels in index.html. */
function renderNames() {
  document.querySelectorAll('[data-name]').forEach((el) => {
    const name = NAMES[el.dataset.name];
    if (typeof name !== 'string') return;
    el.textContent = el.dataset.case === 'lower' ? lowerName(name) : name;
  });

  document.querySelectorAll('[data-name-template]').forEach((el) => {
    const text = el.dataset.nameTemplate.replace(/\{(\w+)\}/g, (_, key) => lowerName(NAMES[key] ?? key));
    el.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  });
}

function render() {
  const data = calculate();

  // Group totals
  setNumberCell(document.getElementById('beadTotal'), data.valid ? data.beadTotal : NaN);
  setNumberCell(document.getElementById('beadConverted'), data.valid ? data.beadConverted : NaN);
  setNumberCell(document.getElementById('crystalTotal'), data.valid ? data.crystalTotal : NaN);
  setNumberCell(document.getElementById('crystalAll'), data.valid ? data.crystalAll : NaN);

  renderTiers(data, data.valid);
  renderCosts();

  markInvalidFields();
}

/** Shared stage header for the affordability and cost tables. */
function createStageHead() {
  const stages = MODEL.tiers[0].beads.length;
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = 'Practice stage';
  headRow.append(corner);

  for (let stage = 1; stage <= stages; stage += 1) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = String(stage);
    headRow.append(th);
  }

  thead.append(headRow);
  return thead;
}

/** Group label row shared by the affordability and cost tables. */
function createTierRow(label) {
  const row = document.createElement('tr');
  row.className = 'row--tier';
  const th = document.createElement('th');
  th.scope = 'rowgroup';
  th.colSpan = MODEL.tiers[0].beads.length + 1;
  th.textContent = label;
  row.append(th);
  return row;
}

function renderTiers(data, valid) {
  const table = document.createElement('table');
  table.className = 'tier-table';
  table.setAttribute('aria-label', 'Affordability by tier and stage');

  const bodies = data.tiers.map((tier) => {
    const tbody = document.createElement('tbody');
    tbody.append(createTierRow(tier.label));

    const maxRow = document.createElement('tr');
    maxRow.className = 'row--max';
    const maxLabel = document.createElement('th');
    maxLabel.scope = 'row';
    maxLabel.textContent = 'Max members';
    maxRow.append(maxLabel);
    tier.options.forEach((option) => {
      const td = document.createElement('td');
      setNumberCell(td, valid ? option.max : NaN, valid ? 'unlimited' : '--');
      maxRow.append(td);
    });

    const statRows = [
      { key: 'beads', label: `${NAMES.beads} allow` },
      { key: 'gold', label: `${NAMES.gold} allows` },
      { key: 'hololium', label: `${NAMES.hololium} allows` },
    ].map(({ key, label }) => {
      const row = document.createElement('tr');
      row.className = 'row--stat';
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = label;
      row.append(th);
      tier.options.forEach((option) => {
        const td = document.createElement('td');
        setNumberCell(td, valid ? option.limits[key] : NaN, valid ? '∞' : '--');
        row.append(td);
      });
      return row;
    });

    const limitRow = document.createElement('tr');
    limitRow.className = 'row--limit';
    const limitLabel = document.createElement('th');
    limitLabel.scope = 'row';
    limitLabel.textContent = 'Limited by';
    limitRow.append(limitLabel);
    tier.options.forEach((option) => {
      const td = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge badge--${option.binding}`;
      badge.textContent = valid
        ? option.binding === 'none'
          ? 'Unlimited'
          : RESOURCE_NAMES[option.binding]
        : '--';
      td.append(badge);
      limitRow.append(td);
    });

    tbody.append(...statRows, limitRow, maxRow);
    return tbody;
  });

  table.append(createStageHead(), ...bodies);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.append(table);
  els.tiers.replaceChildren(wrap);
}

/** Constant costs from the sheet's Beads/Gold/Crystals/hololium cost rows. */
function renderCosts() {
  const table = document.createElement('table');
  table.className = 'tier-table';
  table.setAttribute('aria-label', 'Constant cost requirements by tier and stage');

  const bodies = MODEL.tiers.map((tier) => {
    const tbody = document.createElement('tbody');
    tbody.append(createTierRow(tier.label));

    const rows = [
      { label: NAMES.beads, values: tier.beads },
      { label: NAMES.gold, values: tier.gold },
      { label: NAMES.crystals, values: tier.crystals },
      { label: NAMES.hololium, values: tier.hololium },
      {
        label: `Cost in ${lowerName(NAMES.beads)}`,
        values: tier.beads.map((beads, index) => beads + BEADS_PER_CRYSTAL * tier.crystals[index]),
      },
    ];

    rows.forEach(({ label, values }) => {
      const row = document.createElement('tr');
      row.className = 'row--cost';
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = label;
      row.append(th);
      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = format(value);
        row.append(td);
      });
      tbody.append(row);
    });

    return tbody;
  });

  table.append(createStageHead(), ...bodies);
  els.costs.replaceChildren(table);
}

function markInvalidFields() {
  INPUT_IDS.forEach((id) => {
    const field = document.getElementById(id);
    const raw = field.value.trim();
    const n = parseNumber(raw);
    const invalid = raw !== '' && (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT);
    field.classList.toggle('is-invalid', invalid);
    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
      field.title = `Use at most ${format(MAX_AMOUNT)}.`;
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('title');
    }
  });
}

function save() {
  const state = {};
  INPUT_IDS.forEach((id) => {
    state[id] = document.getElementById(id).value;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage disabled — page still works */
  }
}

function restore() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    state = null;
  }
  if (!state || typeof state !== 'object') return;

  INPUT_IDS.forEach((id) => {
    if (typeof state[id] === 'string') document.getElementById(id).value = state[id];
  });
}

document.addEventListener('input', (event) => {
  if (!event.target.matches('input[inputmode="numeric"]')) return;
  formatField(event.target);
  render();
  save();
});

restore();
formatAllFields();
renderNames();
render();
