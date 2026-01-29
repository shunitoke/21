# Design System (Shadcn + Tailwind)

## EN
### Principles
- Use **shadcn/ui components first** (Dialog, Button, Input, Select, Tabs, Card, Switch, etc.).
- Keep spacing consistent with Tailwind scale (`gap-2/3/4/6`, `p-3/4/5/6`).
- Typography: headings `text-[18px] font-semibold`, body `text-sm`, captions `text-xs text-muted-foreground`.
- Buttons:
  - Primary action: `Button` default.
  - Secondary: `variant="outline"`.
  - Tertiary: `variant="ghost"`.
  - Icon: `size="icon" | "icon-sm"`.
- Cards:
  - Use `Card` with `p-4` or `p-5`.
  - Nested blocks use `Card className="p-3"`.
- Dialogs:
  - Always use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`.
  - `DialogContent` max width: `max-w-[520px]` or `max-w-[560px]`.
- Forms:
  - Labels: `text-xs text-muted-foreground`.
  - Inputs: `Input`, `Textarea`, `Select` only.
- Animations: keep to `transition-all` + Tailwind motion tokens; avoid custom CSS animations unless required.

### Component Checklist
- No `app-card`, `modal-*`, `form-*`, or custom modal shells.
- All modals use `Dialog`.
- All buttons use `Button`.
- All layout blocks use `Card`.

---

## RU
### Принципы
- Всегда используем **shadcn/ui компоненты** (Dialog, Button, Input, Select, Tabs, Card, Switch и т.д.).
- Отступы только из Tailwind шкалы (`gap-2/3/4/6`, `p-3/4/5/6`).
- Типографика: заголовки `text-[18px] font-semibold`, основной текст `text-sm`, подписи `text-xs text-muted-foreground`.
- Кнопки:
  - Основное действие: `Button` default.
  - Второстепенное: `variant="outline"`.
  - Третьестепенное: `variant="ghost"`.
  - Иконка: `size="icon" | "icon-sm"`.
- Карточки:
  - Используем `Card` с `p-4` или `p-5`.
  - Вложенные блоки — `Card className="p-3"`.
- Диалоги:
  - Только `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`.
  - Ширина `DialogContent`: `max-w-[520px]` или `max-w-[560px]`.
- Формы:
  - Лейблы: `text-xs text-muted-foreground`.
  - Инпуты: только `Input`, `Textarea`, `Select`.
- Анимации: только Tailwind-транзишены; кастомные CSS-анимации — по необходимости.

### Чеклист компонентов
- Никаких `app-card`, `modal-*`, `form-*` и кастомных оболочек модалок.
- Все модалки через `Dialog`.
- Все кнопки через `Button`.
- Все блоки через `Card`.
