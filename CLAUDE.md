# Летописи 1812 — инструкции для Claude Code

Историческая 2D-RPG о молодом лавочнике Андрее (Москва, 1812). Работа ведётся
с помощью Claude Code Game Studios (CCGS) v1.2.0: агенты, навыки (slash-команды),
hooks и правила лежат в `.claude/`, настройки процесса — в `project.yaml`.

## Правила проекта (важнее правил шаблона CCGS)

- **Отвечаем и пишем документы по-русски.** Названия файлов — латиницей, без пробелов (`andrey_walk.png`).
- **Технология не меняется.** Игра — чистый HTML5 Canvas + JavaScript без движка,
  без сборки и без зависимостей. Не переносить на Godot, Unity, Unreal или другой
  движок, не запускать `/setup-engine` с выбором движка, не добавлять фреймворки,
  npm-пакеты и шаг сборки. Сетка сцены 480×270, графика пиксельная, палитра `assets/palette.png`.
- **Структура не меняется.** `index.html` — движок (сцена, камера, диалоги,
  торговля, заметки, сохранение), содержимого не хранит. `data.js` — всё
  содержимое и настройки; первая строка `DATA_VERSION` должна совпадать с
  проверкой в `index.html`. Реплики и числа правятся в `data.js`.
  Графика — `assets/characters/<имя>/`, `assets/places/<место>/`, исходники в `source/`.
  `tools/` — вспомогательные скрипты (Python), игре не нужны.
- **Сюжет и историческое содержание** утверждает Кирилл. Не переписывать сюжет,
  даты, персонажей и утверждённые ассеты без его решения; тексты и цифры справок — черновик до проверки.
- **Состояние проекта** — `PROJECT_STATE.md` (что утверждено, сделано, проверено, открыто).
  После законченной задачи обновить его. Один файл одновременно редактирует один участник.
- **Ветки.** `main` — согласованная рабочая сборка, напрямую в неё не загружаем.
  Изменения идут через отдельную ветку и Pull request. При конфликте не перезаписывать чужую работу.
- **Без разрешения не делать push** и не открывать PR.
- Не загружать пароли, ключи API (`PIXELLAB_API_TOKEN` и др.), `node_modules` и временные файлы.
- Подробности команды, запуска и структуры — `README.md`; требования к графике —
  `docs/ART_REQUIREMENTS.md`, `docs/ANIMATION_SPEC.md`; сцены-ролики — `docs/CUTSCENES.md`.

## Запуск и проверка

- Запуск: открыть `index.html` в браузере (file:// работает, сервер не нужен).
  Сразу к сцене пожара: `index.html?scene=fire`.
- Автоматических тестов и `commands.*` нет. Видимое изменение проверяем в
  Chromium без окна (Playwright) при 1280×720: снимок экрана, ошибки консоли,
  открытие через file://. Снимки-доказательства — в `production/qa/evidence/<задача>/`.
- Что звучит и как ощущается, оценивают люди; в отчёте так и писать.

## Технологии

- **Движок**: нет — собственный код в `index.html` (HTML5 Canvas 2D)
- **Язык**: JavaScript (ES2015+, без модулей и сборки), данные в `data.js`
- **Контроль версий**: Git, ветки + Pull request в `main`
- **Сборка**: нет
- **Ассеты**: PNG в `assets/`, подготовка скриптами `tools/*.py`

> В CCGS есть агенты-специалисты только для Godot, Unity и Unreal. У нас
> `engine.name` не задан намеренно: навыки, которым нужен движок, сообщат
> «engine unset / NOT ASSESSED» — это ожидаемо.

## Структура проекта (CCGS)

@.claude/docs/directory-structure.md

Для этой игры каталог кода — корень репозитория (`index.html`, `data.js`), а не `src/`.

## Настройки процесса

`project.yaml` — основной источник настроек (`modes.rigor: minimal`: без GDD,
краткие документы, минимум QA, без ревью директоров). Менять через `/settings`.
`.claude/docs/technical-preferences.md` — устаревший запасной вариант.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **Существующий проект.** Не запускать `/start` как для новой игры. Начинать с
> `/project-stage-detect` и `/adopt`; новую работу — `/quick-design` или `/create-stories`.

## Coding Standards

@.claude/docs/coding-standards.md

Применять с поправкой на проект: значения игры — в `data.js`, а не в `index.html`.

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
