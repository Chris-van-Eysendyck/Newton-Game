/**
 * NEWTON - Educational Math Game
 * Copyright (c) 2025 Christophe van Eysendyck
 * Licensed under the MIT License
 * https://github.com/Chris-van-Eysendyck/Newton-Game
 *
 * Parent screen: profiles, table unlocks, planet mapping, the data view, export/import.
 * An HTML overlay on top of the canvas, because it needs real form controls and a
 * scrollable grid. See docs/maaltafels-handover.md §9.
 */

import { openProfileStore } from '../storage.js';
import { INPUT_MODES, setPlanetTable, setTableUnlocked } from '../core/config.js';
import { MULTIPLIERS } from '../core/facts.js';
import { STATES, refreshThreshold } from '../core/mastery.js';
import { KEY_PREFIX, createProfile, exportProfile, slugify } from '../core/profile.js';
import { factGrid, planetProgress, thresholdStatus } from '../core/report.js';

const STATE_LABELS = {
    [STATES.UNTESTED]: 'niet getest',
    [STATES.LEREN]: 'leren',
    [STATES.VLOT]: 'vlot',
    [STATES.BEHEERST]: 'beheerst',
};
const STATE_LETTERS = { [STATES.LEREN]: 'L', [STATES.VLOT]: 'V', [STATES.BEHEERST]: 'B' };
const MODE_LABELS = { [INPUT_MODES.TYPED]: 'Typen (De Reis)', [INPUT_MODES.MC]: 'Meerkeuze (Warp)' };
const LEVEL_LABELS = { reis: 'De Reis', warp: 'Warp' };
const ERROR_LABELS = {
    missing: 'Dit profiel bestaat niet (meer).',
    corrupt: 'Dit profiel is beschadigd en kan niet gelezen worden.',
    'newer-version': 'Dit profiel komt uit een nieuwere versie van het spel.',
    'no-migration': 'Dit profiel kan niet omgezet worden naar deze versie van het spel.',
    exists: 'Er bestaat al een profiel met die naam.',
    'invalid-name': 'Geef een naam met minstens één letter of cijfer.',
};

const seconds = ms => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const duration = ms => {
    const total = Math.round(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const formatDate = iso => new Date(iso).toLocaleDateString('nl-BE');

/** Tiny DOM builder. Text always goes in as text, never as HTML: names come from user input. */
function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (key in node) node[key] = value;
        else node.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false) continue;
        node.append(child instanceof Node ? child : String(child));
    }
    return node;
}

const section = (title, ...children) =>
    el('section', { className: 'np-section' }, el('h2', { textContent: title }), children);

export class ParentConfig extends Phaser.Scene {

    constructor() {
        super('ParentConfig');
    }

    create() {
        injectStyles();
        this.root = el('div', { className: 'np-overlay' });
        document.body.append(this.root);

        // Let typing reach the form fields instead of Phaser's keyboard capture.
        this.input.keyboard.disableGlobalCapture();
        this.events.once('shutdown', () => {
            this.root.remove();
            this.input.keyboard.enableGlobalCapture();
        });

        this.notice = null;
        this.selected = this.registry.get('activeProfile') ?? null;
        try {
            this.store = openProfileStore();
        } catch (error) {
            console.error('Profiles unavailable', error);
            this.store = null;
            this.notice = { kind: 'error', text: `Deze browser laat niet toe om profielen te bewaren: ${error.message}` };
        }
        this.render();
    }

    render() {
        const scroll = this.root.scrollTop;
        const parts = [this.header()];
        if (this.notice) {
            parts.push(el('p', { className: `np-notice np-${this.notice.kind}`, textContent: this.notice.text }));
        }
        if (this.store) {
            const entries = this.store.list();
            if (!entries.some(entry => entry.slug === this.selected)) this.selected = entries[0]?.slug ?? null;
            parts.push(this.profilesSection(entries), this.profileSections());
        }
        this.root.replaceChildren(el('div', { className: 'np-wrap' }, parts));
        this.root.scrollTop = scroll;
    }

    /** Run a change, show its outcome, redraw. `action` may return a success message. */
    act(action) {
        try {
            const message = action();
            this.notice = message ? { kind: 'ok', text: message } : null;
        } catch (error) {
            console.error(error);
            this.notice = { kind: 'error', text: ERROR_LABELS[error.code] ?? error.message };
        }
        this.render();
    }

    header() {
        return el('div', { className: 'np-header' },
            el('h1', { textContent: 'Ouderscherm' }),
            el('button', { type: 'button', textContent: 'Terug naar het spel', onClick: () => this.scene.start('Start') }));
    }

    profilesSection(entries) {
        const nameInput = el('input', { type: 'text', placeholder: 'Naam van de piloot', maxLength: 40 });
        const importText = el('textarea', { placeholder: 'Plak hier een geëxporteerd profiel' });

        const picker = entries.length === 0
            ? el('p', { className: 'np-hint', textContent: 'Nog geen profielen op dit toestel.' })
            : el('label', { className: 'np-row' }, 'Profiel ',
                el('select', {
                    onChange: event => {
                        this.selected = event.target.value;
                        this.notice = null;
                        this.render();
                    },
                }, entries.map(entry => el('option', {
                    value: entry.slug,
                    selected: entry.slug === this.selected,
                    textContent: entry.ok ? entry.name : `${entry.slug} (beschadigd)`,
                }))));

        return section('Profielen',
            picker,
            el('form', {
                className: 'np-row',
                onSubmit: event => {
                    event.preventDefault();
                    this.act(() => {
                        const profile = this.store.create(nameInput.value);
                        this.selected = slugify(profile.name);
                        return `Profiel "${profile.name}" gemaakt.`;
                    });
                },
            }, nameInput, el('button', { type: 'submit', textContent: 'Nieuw profiel' })),
            el('details', {},
                el('summary', { textContent: 'Profiel importeren' }),
                importText,
                el('div', { className: 'np-row' },
                    el('button', { type: 'button', textContent: 'Importeer', onClick: () => this.importProfile(importText.value) }))));
    }

    profileSections() {
        if (!this.selected) return [];
        let profile;
        try {
            profile = this.store.load(this.selected);
        } catch (error) {
            return [this.brokenSection(error)];
        }
        const save = (next, message) => this.act(() => {
            this.store.save(next);
            return message;
        });
        return [
            this.unlockSection(profile, save),
            this.planetSection(profile, save),
            this.factSection(profile),
            this.thresholdSection(profile, save),
            this.sessionSection(profile),
            this.manageSection(profile),
        ];
    }

    /** A profile that cannot be read: say so, show the raw data, overwrite nothing. */
    brokenSection(error) {
        const slug = this.selected;
        let raw = null;
        try {
            raw = window.localStorage.getItem(KEY_PREFIX + slug);
        } catch {
            // shown as unavailable below
        }
        return section(`Profiel "${slug}" kan niet gelezen worden`,
            el('p', { className: 'np-notice np-error', textContent: ERROR_LABELS[error.code] ?? error.message }),
            el('p', { className: 'np-hint', textContent: `Technisch: ${error.message}` }),
            el('p', { textContent: 'Er is niets overschreven of gewist. Kopieer de ruwe gegevens hieronder voor je dit profiel verwijdert.' }),
            el('textarea', { readOnly: true, value: raw ?? '(niet beschikbaar)' }),
            el('div', { className: 'np-row' },
                el('button', { type: 'button', className: 'np-danger', textContent: 'Verwijder dit profiel', onClick: () => this.removeProfile(slug) })));
    }

    unlockSection(profile, save) {
        const { unlockedTables } = profile.config;
        return section('Tafels vrijgeven',
            el('p', { className: 'np-hint', textContent: 'Zet een tafel pas aan als ze in de klas is aangebracht. Niets gaat vanzelf open.' }),
            el('div', { className: 'np-tables' }, MULTIPLIERS.map(table => el('label', {},
                el('input', {
                    type: 'checkbox',
                    checked: unlockedTables.includes(table),
                    onChange: event => save(
                        { ...profile, config: setTableUnlocked(profile.config, table, event.target.checked) },
                        `Tafel van ${table} ${event.target.checked ? 'vrijgegeven' : 'weer vergrendeld'}.`),
                }),
                ` Tafel van ${table}`))));
    }

    planetSection(profile, save) {
        const progress = planetProgress(profile);
        const planetsPerTable = new Map();
        for (const { table } of progress) planetsPerTable.set(table, (planetsPerTable.get(table) ?? 0) + 1);
        const doubled = [...planetsPerTable].filter(([table, count]) => table !== null && count > 1).map(([table]) => table);

        return section('Planeten',
            el('p', { className: 'np-hint', textContent: 'Welke tafel bij welke planeet hoort. Voortgang telt de tien feiten van die tafel per toestand.' }),
            doubled.length > 0 && el('p', { className: 'np-warn', textContent: `Let op: tafel ${doubled.join(', ')} hangt aan meer dan één planeet.` }),
            el('div', { className: 'np-scroll' }, el('table', {},
                el('thead', {}, el('tr', {}, ['Planeet', 'Tafel', 'Vrij', 'Voortgang', 'Al eens juist'].map(h => el('th', { textContent: h })))),
                el('tbody', {}, progress.map(planet => el('tr', {},
                    el('td', { textContent: planet.name }),
                    el('td', {}, el('select', {
                        onChange: event => save(
                            { ...profile, config: setPlanetTable(profile.config, planet.planetId, Number(event.target.value)) },
                            `${planet.name} oefent nu de tafel van ${event.target.value}.`),
                    },
                    planet.table === null && el('option', { value: '', selected: true, textContent: '?' }),
                    MULTIPLIERS.map(table => el('option', { value: String(table), selected: table === planet.table, textContent: String(table) })))),
                    el('td', { textContent: planet.unlocked ? 'ja' : 'nee' }),
                    el('td', { textContent: Object.values(STATES).map(state => `${planet.counts[state]} ${STATE_LABELS[state]}`).join(' · ') }),
                    el('td', { textContent: `${planet.answeredCorrectly} / ${planet.total}` })))))));
    }

    factSection(profile) {
        return section('Feiten',
            el('p', { className: 'np-hint', textContent: 'Rij = tafel, kolom = vermenigvuldiger. L leren, V vlot, B beheerst, met de mediane reactietijd bij typen. Grijs = nog niet getest. Beweeg over een vakje voor details.' }),
            el('div', { className: 'np-scroll' }, el('table', { className: 'np-grid' },
                el('thead', {}, el('tr', {}, el('th', { textContent: '×' }), MULTIPLIERS.map(b => el('th', { textContent: String(b) })))),
                el('tbody', {}, factGrid(profile).map(row => el('tr', {},
                    el('th', { textContent: String(row.table) }),
                    row.facts.map(cell => this.factCell(cell))))))));
    }

    factCell(cell) {
        const [a, b] = cell.id.split('x');
        if (cell.state === STATES.UNTESTED) {
            return el('td', { className: 'np-untested', title: `${a} × ${b}: niet getest`, textContent: '—' });
        }
        const typed = cell.medianMs[INPUT_MODES.TYPED];
        const mc = cell.medianMs[INPUT_MODES.MC];
        const title = `${a} × ${b}: ${STATE_LABELS[cell.state]} · ${cell.correct} juist, ${cell.wrong} fout`
            + ` · mediaan typen ${typed === null ? '–' : seconds(typed)}, meerkeuze ${mc === null ? '–' : seconds(mc)}`;
        const text = typed === null ? STATE_LETTERS[cell.state] : `${STATE_LETTERS[cell.state]} ${seconds(typed)}`;
        return el('td', { className: `np-${cell.state}`, title, textContent: text });
    }

    thresholdSection(profile, save) {
        return section('Snelheidsdrempels',
            el('p', { className: 'np-hint', textContent: 'Een feit wordt pas "beheerst" als het in De Reis sneller dan de drempel getypt wordt. De eerste 7 speeldagen per soort meten we alleen.' }),
            Object.values(INPUT_MODES).map(mode => {
                const status = thresholdStatus(profile, mode);
                const text = status.calibrating
                    ? `nog aan het meten: ${status.daysLogged} van ${status.daysNeeded} speeldagen`
                    : `${seconds(status.ms)}, ${status.source === 'fallback'
                        ? 'standaardwaarde (nog te weinig metingen)'
                        : `berekend uit ${status.samples} metingen`}${status.computedAt ? ` op ${formatDate(status.computedAt)}` : ''}`;
                return el('div', { className: 'np-row' },
                    el('strong', { textContent: `${MODE_LABELS[mode]}:` }),
                    el('span', { textContent: text }),
                    el('button', {
                        type: 'button',
                        textContent: 'Herbereken',
                        disabled: status.calibrating,
                        onClick: () => save(refreshThreshold(profile, mode, Date.now(), { force: true }),
                            `Drempel voor ${MODE_LABELS[mode]} herberekend.`),
                    }));
            }));
    }

    sessionSection(profile) {
        const sessions = [...profile.sessions].reverse();
        return section('Speelsessies',
            sessions.length === 0
                ? el('p', { className: 'np-hint', textContent: 'Nog geen sessies gespeeld.' })
                : el('div', { className: 'np-scroll' }, el('table', {},
                    el('thead', {}, el('tr', {}, ['Datum', 'Spel', 'Vragen', 'Juist', 'Duur'].map(h => el('th', { textContent: h })))),
                    el('tbody', {}, sessions.map(session => el('tr', {},
                        el('td', { textContent: session.date }),
                        el('td', { textContent: LEVEL_LABELS[session.mode] ?? session.mode }),
                        el('td', { textContent: String(session.questions) }),
                        el('td', { textContent: String(session.correct) }),
                        el('td', { textContent: duration(session.durationMs) })))))));
    }

    manageSection(profile) {
        const output = el('textarea', { readOnly: true, placeholder: 'Druk op Exporteer om het profiel hier als tekst te krijgen.' });
        const status = el('span', { className: 'np-hint' });
        const fill = () => {
            output.value = exportProfile(profile);
            output.select();
        };
        const copy = async () => {
            if (!output.value) fill();
            try {
                await navigator.clipboard.writeText(output.value);
                status.textContent = 'Gekopieerd naar het klembord.';
            } catch {
                output.select();
                status.textContent = 'Kopiëren lukt hier niet: selecteer de tekst en kopieer ze zelf.';
            }
        };

        return section('Exporteren, resetten, verwijderen',
            el('p', { className: 'np-hint', textContent: 'Voortgang staat alleen in deze browser op dit toestel. Exporteer om te verhuizen of een reservekopie te bewaren.' }),
            el('div', { className: 'np-row' },
                el('button', { type: 'button', textContent: 'Exporteer', onClick: fill }),
                el('button', { type: 'button', textContent: 'Kopieer', onClick: copy }),
                el('button', { type: 'button', className: 'np-danger', textContent: 'Reset voortgang', onClick: () => this.resetProfile(profile) }),
                el('button', { type: 'button', className: 'np-danger', textContent: 'Verwijder profiel', onClick: () => this.removeProfile(slugify(profile.name), profile.name) }),
                status),
            output);
    }

    importProfile(json) {
        this.act(() => {
            let profile;
            try {
                profile = this.store.import(json);
            } catch (error) {
                if (error.code !== 'exists') throw error;
                if (!window.confirm(`Er bestaat al een profiel "${error.slug}". Overschrijven met het geïmporteerde profiel?`)) {
                    return 'Import geannuleerd, er is niets veranderd.';
                }
                profile = this.store.import(json, { overwrite: true });
            }
            this.selected = slugify(profile.name);
            return `Profiel "${profile.name}" geïmporteerd.`;
        });
    }

    /** Wipes progress; keeps the name, the unlocked tables and the planet mapping. */
    resetProfile(profile) {
        if (!window.confirm(`Alle voortgang van "${profile.name}" wissen? Vrijgegeven tafels en planeten blijven. Exporteer eerst als je twijfelt.`)) return;
        this.act(() => {
            const fresh = createProfile(profile.name);
            fresh.config = {
                ...fresh.config,
                unlockedTables: profile.config.unlockedTables,
                tableForPlanet: profile.config.tableForPlanet,
            };
            this.store.save(fresh);
            return `Voortgang van "${profile.name}" gewist.`;
        });
    }

    removeProfile(slug, name = slug) {
        if (!window.confirm(`Profiel "${name}" definitief verwijderen? Exporteer het eerst als je de voortgang wil bewaren.`)) return;
        this.act(() => {
            this.store.remove(slug);
            this.selected = null;
            return `Profiel "${name}" verwijderd.`;
        });
    }
}

const CSS = `
.np-overlay { position: fixed; inset: 0; z-index: 10; overflow: auto; background: #040218; color: #e8e8f0;
  font: 16px/1.45 Arial, sans-serif; padding: 20px; box-sizing: border-box; }
.np-overlay * { box-sizing: border-box; }
.np-wrap { max-width: 980px; margin: 0 auto; }
.np-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.np-overlay h1 { color: #00ff00; font-size: 28px; margin: 0; }
.np-overlay h2 { color: #ffff66; font-size: 19px; margin: 0 0 8px; }
.np-section { background: rgba(68, 68, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px;
  padding: 16px; margin-bottom: 16px; }
.np-overlay button { font: inherit; background: #4444ff; color: #fff; border: 2px solid #fff; border-radius: 6px;
  padding: 6px 12px; cursor: pointer; }
.np-overlay button:hover:not(:disabled) { background: #6666ff; }
.np-overlay button:disabled { opacity: 0.4; cursor: default; }
.np-overlay button.np-danger { background: #992222; }
.np-overlay input[type=text], .np-overlay select, .np-overlay textarea { font: inherit; background: #0d0b2a; color: #fff;
  border: 1px solid #666; border-radius: 4px; padding: 6px; }
.np-overlay textarea { display: block; width: 100%; min-height: 110px; margin-top: 8px; font: 12px/1.3 monospace; }
.np-overlay summary { cursor: pointer; margin-top: 8px; }
.np-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
.np-hint { color: #a0a0b8; font-size: 14px; margin: 4px 0 8px; }
.np-notice { padding: 8px 12px; border-radius: 6px; margin: 0 0 16px; }
.np-ok { background: rgba(0, 170, 0, 0.22); }
.np-error { background: rgba(200, 0, 0, 0.35); }
.np-warn { color: #ffaa44; }
.np-scroll { overflow-x: auto; }
.np-overlay table { border-collapse: collapse; }
.np-overlay th, .np-overlay td { padding: 4px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: left; white-space: nowrap; }
.np-grid th, .np-grid td { text-align: center; }
.np-grid td { min-width: 62px; font-size: 12px; border: 2px solid #040218; }
.np-untested { background: #2a2a3a; color: #77778a; }
.np-leren { background: #7a3d00; }
.np-vlot { background: #1d4f91; }
.np-beheerst { background: #1f6b2f; }
.np-tables { display: flex; flex-wrap: wrap; gap: 8px 18px; }
`;

function injectStyles() {
    if (document.getElementById('np-styles')) return;
    document.head.append(el('style', { id: 'np-styles', textContent: CSS }));
}
