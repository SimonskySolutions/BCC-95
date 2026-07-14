# Офериране — процес стъпка по стъпка (VSM Фаза 1)

От момента, в който се натисне **„Ново запитване"**, до **приемане на офертата от клиента**.
Разделено по фази за по-лесно вграждане. Покрива всяко действие на потребителя, всяко действие на
системата и всички сценарии (разклонения).

**Легенда** — 👤 действие на потребителя · ⚙ действие на системата/услугата · ◇ решение/проверка · 🔴 краен (отказан/затворен) · 🟢 приет.

Под-състояния (от `offerSubStateMachine.js`):
`inquiry_received → intake_complete → feasibility_done → tech_review_done → costing_done → quote_drafted → approved → sent → decided_accepted`

---

## Фаза 1.1 — Ново запитване

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    START(["👤 Натиска „Ново запитване""]):::user
    F1["👤 Попълва NewInquiryForm:<br/>клиент (избор/нов), продукт,<br/>канал, количества, срок,<br/>спецификация, файлове,<br/>доп. продукти, отговорници"]:::user
    F1SUB["👤 Изпраща"]:::user
    VAL{"⚙ Валидация"}:::dec
    ERRV["⚠ Грешка: липсва име/канал/<br/>клиент не е намерен"]:::term
    SVC["⚙ startNewInquiry():<br/>намира или създава клиент<br/>(+ език за комуникация)"]:::sys
    PROD["⚙ createConceptProduct():<br/>продукт draft, фаза=concept<br/>+ lifecycle + audit product.created"]:::sys
    REG["⚙ registerInquiry():<br/>чернова + изчисляване на<br/>липсващи полета + audit"]:::sys
    GATE["⚙ ensureQuotationGateTasks():<br/>автом. 2 задачи (draft, висок приоритет):<br/>тех. преглед → технолог<br/>калкулация → планов отдел"]:::sys
    EXTRA["⚙ За всеки доп. продукт:<br/>собствен продукт + собствени задачи"]:::sys
    NEXT(["→ Фаза 1.2"]):::sys

    START --> F1 --> F1SUB --> VAL
    VAL -- невалидно --> ERRV -.-> F1
    VAL -- валидно --> SVC --> PROD --> REG --> GATE --> EXTRA --> NEXT
```

---

## Фаза 1.2 — Пълнота на входните данни

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    IN(["← от Фаза 1.1"]):::sys
    CHK{"⚙ Няма липсващи полета?<br/>(чертежи, количество, срок,<br/>спецификация, изисквания)"}:::dec
    PENDING["Състояние: intake_pending"]:::sys
    OPEN["👤 Отваря InquiryIntakeForm,<br/>добавя данни / „без файлове""]:::user
    UPD["⚙ updateInquiry():<br/>преизчислява липсващите полета"]:::sys
    COMPLETE["⚙ status=intake_complete<br/>+ audit inquiry.intakeComplete"]:::sys
    CLOSE["👤 Затваря запитването"]:::user
    CLOSED["⚙ closeInquiryRejected():<br/>closed_rejected + audit"]:::sys
    ENDCLOSED(["🔴 КРАЙ · Запитването е затворено"]):::term
    NEXT(["→ Фаза 1.3"]):::sys

    IN --> CHK
    CHK -- "липсват полета" --> PENDING --> OPEN --> UPD --> CHK
    CHK -- "всички налични" --> COMPLETE --> NEXT
    PENDING -.-> CLOSE
    OPEN -.-> CLOSE
    CLOSE --> CLOSED --> ENDCLOSED
```

---

## Фаза 1.3 — Оценка за изпълнимост

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    IN(["← от Фаза 1.2"]):::sys
    FEAS["👤 FeasibilityPanel:<br/>резултат за всеки продукт"]:::user
    FREC["⚙ recordFeasibility / recordProductFeasibility<br/>+ audit inquiry.feasibilityRecorded"]:::sys
    FDEC{"Резултат?"}:::dec
    FBLOCK["⚙ всички блокирани →<br/>status=closed_rejected"]:::sys
    ENDBLOCK(["🔴 КРАЙ · Неизпълнимо"]):::term
    FOK["⚙ изпълнимо / с условия →<br/>status=feasibility_done<br/>(мулти: изпълнимо ако ПОНЕ ЕДНО)"]:::sys
    NEXT(["→ Фаза 1.4"]):::sys

    IN --> FEAS --> FREC --> FDEC
    FDEC -- "блокирано (всички)" --> FBLOCK --> ENDBLOCK
    FDEC -- "изпълнимо" --> FOK --> NEXT
```

---

## Фаза 1.4 — Задачи (гейтове), Калкулация и Чернова на оферта

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    IN(["← от Фаза 1.3"]):::sys
    TASKS["👤 GateTasksPanel:<br/>решава 2-те задължителни задачи"]:::user
    TRES["⚙ patchTask status=resolved<br/>tech_review_done / costing_done"]:::sys
    ENSUREQ["⚙ ensureQuoteForProduct():<br/>оферта draft, EUR, език на клиента"]:::sys
    COST["👤 CostSheetPanel — калкулация:<br/>материали/операции/инструменти/<br/>общи/логистика, методи,<br/>марж %, ценови стъпки,<br/>амортизация vs отделна оферта"]:::user
    DRAFT["👤 Чернова на версия (OfferWizard)"]:::user
    READY{"⚙ evaluateQuotationTaskReadiness:<br/>и двете задачи решени?"}:::dec
    BLOCKT["⚠ tasks_incomplete"]:::term
    MKVER["⚙ draftQuoteVersion():<br/>нова непроменима версия (vN),<br/>предв. попълва шапка,<br/>снимка на калкулацията+редовете,<br/>замества последната изпратена<br/>+ audit quote.drafted"]:::sys
    NEXT(["→ Одобрение"]):::sys

    IN --> TASKS --> TRES --> ENSUREQ --> COST --> DRAFT --> READY
    READY -- "нерешени" --> BLOCKT -.-> TASKS
    READY -- "решени" --> MKVER --> NEXT
```

---

## Одобрение (мениджърски гейт)

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    IN(["← от Фаза 1.4"]):::sys
    APPROVE["👤 submitApproval (одобряващ)"]:::user
    ACHK{"⚙ Проверки:<br/>версия=draft? има право?<br/>не е автора? редове+сума>0?<br/>срок+валидност зададени?"}:::dec
    AERR["⚠ invalid_state / not_approver /<br/>self_approval / missing_fields"]:::term
    ADEC{"Решение"}:::dec
    AREJ["⚙ отказано →<br/>quote.status=draft + audit"]:::sys
    AOK["⚙ версия=approved,<br/>оферта=pending_approval<br/>+ audit quote.approved"]:::sys
    BACKEDIT(["↩ обратно към калкулация/чернова"]):::sys
    NEXT(["→ Изпращане"]):::sys

    IN --> APPROVE --> ACHK
    ACHK -- "грешка" --> AERR -.-> BACKEDIT
    ACHK -- "ок" --> ADEC
    ADEC -- "отказано" --> AREJ --> BACKEDIT
    ADEC -- "одобрено" --> AOK --> NEXT
```

---

## Изпращане до клиента

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;

    IN(["← Одобрение"]):::sys
    SEND["👤 OfferSendDialog:<br/>от/до/копие, тема, текст, прикачени"]:::user
    SCHK{"⚙ версия=approved<br/>и има одобрение?"}:::dec
    SERR["⚠ not_approved"]:::term
    SOUT["⚙ sendOffer():<br/>генерира PDF, токен+линк,<br/>QuoteDocuments, изходящ имейл (BG/EN),<br/>версия=sent (sentAt, lockedAt),<br/>оферта=sent + audit quote.sent"]:::sys
    RESEND["👤 Повторно изпращане:<br/>нов линк/имейл, без смяна на статус"]:::user
    NEXT(["→ Решение на клиента"]):::sys

    IN --> SEND --> SCHK
    SCHK -- "не" --> SERR -.-> SEND
    SCHK -- "да" --> SOUT --> NEXT
    SOUT -.-> RESEND -.-> NEXT
```

---

## Решение на клиента (публична страница `/offer-accept/{token}`)

```mermaid
flowchart TD
    classDef user fill:#1e3a8a,stroke:#3b82f6,color:#fff;
    classDef sys fill:#064e3b,stroke:#10b981,color:#fff;
    classDef dec fill:#78350f,stroke:#f59e0b,color:#fff;
    classDef term fill:#3f0d0d,stroke:#ef4444,color:#fff;
    classDef good fill:#14532d,stroke:#22c55e,color:#fff;

    IN(["← Изпращане"]):::sys
    WAIT["⚙ resolveAcceptanceToken → показва офертата<br/>Състояние: чака клиента"]:::sys
    EXP{"⚙ isOfferExpired?<br/>(validUntil < днес)"}:::dec
    REQNEW["👤 Клиентът иска нова оферта<br/>⚙ requestNewOffer(): revision_requested<br/>(изтекла), известява отговорниците"]:::user
    CDEC{"👤 Клиентът избира"}:::dec
    DGUARD{"⚙ версия=sent и<br/>не е вече решена?"}:::dec
    DERR["⚠ already_decided / not_sent"]:::term
    ACC["⚙ версия=decided, оферта=accepted,<br/>attemptPhaseTransition concept→design<br/>+ audit quote.customer.accepted"]:::sys
    REV["⚙ decided, revision_requested,<br/>reviseOffer(): нова чернова (копирана калкулация)"]:::sys
    REJ["⚙ версия=decided, оферта=rejected"]:::sys
    BACKEDIT(["↩ обратно към калкулация"]):::sys
    ENDACC(["🟢 КРАЙ · ОФЕРТАТА Е ПРИЕТА<br/>продуктът влиза във фаза Design"]):::good
    ENDREJ(["🔴 КРАЙ · Офертата е отказана"]):::term

    IN --> WAIT --> EXP
    EXP -- "изтекла" --> REQNEW -.-> BACKEDIT
    EXP -- "валидна" --> CDEC --> DGUARD
    DGUARD -- "не" --> DERR
    DGUARD -- "приема" --> ACC --> ENDACC
    DGUARD -- "иска корекция" --> REV -.-> BACKEDIT
    DGUARD -- "отказва" --> REJ --> ENDREJ
```
