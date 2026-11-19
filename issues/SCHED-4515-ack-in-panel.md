---
id: SCHED-4515
title: Ack moves from the row to an incident panel
status: done
plan: R2, R7
---

Product's decision on the step-1 report: new incidents stay live at the top; Ack leaves the row. A row opens
its incident panel, and Ack lives there.

- Picking a row opens the incident panel (`data-testid="incident-panel"`), which names the incident id.
- The panel's Ack (`data-testid="panel-ack"`) acks the incident the panel names and marks its row acked.
- Rows lose their Ack button (`data-testid="ack"` retired).
- New incidents are prepended; existing rows are never removed or re-created (R7).

Acceptance: a new incident landing during a click can open the wrong panel, but the panel names it, so the
ack only ever goes to the incident on screen in the panel.
