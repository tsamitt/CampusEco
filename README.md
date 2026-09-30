# CampusEco

**MNSU-CampusEco** is a full-stack logistics system that coordinates the delivery of student packages, mail, and campus equipment from a single central hub to residence halls, offices, and academic buildings using electric delivery carts operated by student workers.

Built for **CIS 483/583: Web Applications & User Interface Design** — Minnesota State University, Mankato, Fall 2026.

## The Problem

MNSU is consolidating campus deliveries at one central hub instead of allowing independent couriers to drive around campus. CampusEco is the software that makes that hub actually work: it routes packages from intake to final destination, gives delivery crews a live queue to work from, and lets recipients track and confirm their own deliveries.

## Who Uses It

The system serves three distinct user types, each with their own dedicated portal:

| Portal | User | What they do |
|---|---|---|
| `operator.html` | **Central Hub Operators** | Check packages in: scan a tracking barcode, log weight and dimensions, assign a destination building and locker array, flag urgent shipments |
| `courier.html` | **Eco-Transit Crews** | View their route queue, claim deliveries, update transit milestones (Loaded → En Route → Delivered), report electric cart battery status |
| `tracking.html` | **Students, Faculty & Staff** | Look up a package by tracking number, view live delivery status, electronically sign off on receipt, set delivery preferences, and see their carbon footprint impact |

## Project Structure

```
CampusEco/
├── README.md
├── operator.html      Central Hub Operator portal
├── courier.html       Eco-Transit Crew portal
└── tracking.html       End-user tracking portal
```

## Team — Girlboss

| Name | Portal Owned |
|---|---|
| Caleb Witthuhn | Operator Portal (`operator.html`) |
| Braden Thooft | Courier Portal (`courier.html`) |
| Sasmit Tomar | End-User Portal (`tracking.html`) |
| Md Ashik Mollah | Design System & Styling |

## Project Phases

This project follows a strict linear waterfall: each phase must be fully complete before the next begins.

- [x] **Phase 1 — Frontend & Static UI Layout** *(due Oct 5)*
  Static HTML5 markup, external CSS with campus-themed styling, and native HTML5 form validation. No data is saved or fetched yet.
- [ ] **Phase 2 — Client Interactivity & Responsiveness** *(due Oct 26)*
  Native JavaScript objects and event handling, jQuery DOM manipulation, and mobile-first responsive design with media queries.
- [ ] **Phase 3 — Server Backends & Live Endpoints** *(due Nov 9)*
  AJAX/JSON, a Node.js backend, AngularJS data binding, and a PHP + MySQL/MariaDB relational data layer.

## Running Locally

These are static HTML pages for now — no build step required.

1. Clone the repo
2. Open any of the three portal pages in a browser, or use the VS Code **Live Server** extension for auto-refresh on save

## Git Workflow

To keep individual contributions visible in the commit history:

- Each person works primarily in their own portal file to avoid merge conflicts
- Commit under your own name, in small chunks, as you go — not one giant commit at the deadline
- Pull before pushing if you've touched a shared file

## License

Coursework for CIS 483/583, Fall 2026. Not licensed for reuse outside the course.
