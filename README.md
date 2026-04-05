# Ignition HMI Simulation

A React + Vite simulation project that mimics SCADA/HMI behavior for demo and learning purposes.

## ⚡ Real-World Analogy (SCADA Simulation Architecture)

This project mirrors a simplified industrial SCADA/HMI stack using modern web technologies.

| Component | Role |
|----------|------|
| **Node.js** | Runtime environment that executes the application |
| **Vite** | Fast project builder and development server |
| **React** | HMI (Human-Machine Interface) user interface layer |
| **Custom Code** | Simulated SCADA logic (machine states, data processing, events) |

---

## 🧠 How It Maps to SCADA

- **React UI → HMI Screens**
  - Displays machine status, alarms, and metrics

- **JavaScript Logic → PLC / Control Logic Simulation**
  - Mimics decision-making (e.g., thresholds, conditions)

- **State Management → Tags / Variables**
  - Represents real-time data like speed, temperature, output

- **Events & Functions → Automation Behavior**
  - Simulates triggers, alerts, and system responses

---

## 🚀 How It Works

1. **Vite** starts a local development server  
2. **Node.js** runs the backend tooling  
3. **React** renders the UI in the browser  
4. **Your logic** simulates industrial processes  

---

## 📊 Example Simulation Logic

```javascript
const machines = ["M1", "M2", "M3"];

machines.forEach((m) => {
  console.log(`Machine running: ${m}`);
});

function calculateEfficiency(output, target) {
  return (output / target) * 100;
}
```
---

## Run locally (VS Code)
- Creates a new React app called ignition-hmi using Vite (dependencies, React, dev server)
```bash
npx create-vite@latest ignition-hmi --template react
```
- It will ask:
    - Project name → press Enter
    - Framework → React
    - Variant → JavaScript

- Downloads all required libraries
```bash
cd ignition-hmi
npm install
```
- Starts your app locally
```bash
npm run dev
```

<p align="left">
  <img src="ignition-hmi/src/assets/vite.png" width="300"/>
</p>

---

## 👉 Open this in your browser:
```bash
http://localhost:5173/
```
<p align="left">
  <img src="ignition-hmi/src/assets/ignition_hmi.png" width="700"/>
</p>
