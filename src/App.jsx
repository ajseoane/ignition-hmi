import React, { useEffect, useMemo, useState } from "react";

const initialMachines = [
  { id: "M1", target: 120, output: 92, status: "Running", temp: 71, speed: 68, tank: 72 },
  { id: "M2", target: 100, output: 61, status: "Stopped", temp: 64, speed: 0, tank: 38 },
  { id: "M3", target: 110, output: 85, status: "Running", temp: 73, speed: 77, tank: 81 },
];

function calculateEfficiency(output, target) {
  if (!target) return 0;
  return Math.round((output / target) * 100);
}

function getAlarm(machine) {
  if (machine.temp > 90) return "High Temperature";
  if (machine.tank < 20) return "Low Tank Level";
  if (machine.status === "Stopped") return "Machine Stopped";
  return "Normal";
}

function statusColor(status) {
  if (status === "Running") return "#22c55e";
  if (status === "Alarm") return "#ef4444";
  return "#94a3b8";
}

function Tank({ level, label }) {
  return (
    <div style={styles.tankWrap}>
      <div style={styles.tankLabel}>{label}</div>
      <div style={styles.tankOuter}>
        <div style={{ ...styles.tankFill, height: `${level}%` }} />
      </div>
      <div style={styles.tankValue}>{level}%</div>
    </div>
  );
}

function TrendChart({ data }) {
  const width = 520;
  const height = 180;
  const pad = 18;

  if (!data.length) return null;

  const maxVal = 100;
  const minVal = 0;

  const points = data
    .map((v, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((v - minVal) / (maxVal - minVal)) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "180px" }}>
      <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="12" />
      {[0, 25, 50, 75, 100].map((g) => {
        const y = height - pad - (g / 100) * (height - pad * 2);
        return (
          <g key={g}>
            <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="#334155" strokeWidth="1" />
            <text x="2" y={y + 4} fill="#94a3b8" fontSize="10">
              {g}
            </text>
          </g>
        );
      })}
      <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={points} />
    </svg>
  );
}

export default function App() {
  const [machines, setMachines] = useState(initialMachines);
  const [selectedMachine, setSelectedMachine] = useState("M1");
  const [machineStartTag, setMachineStartTag] = useState(0);
  const [apiStatus, setApiStatus] = useState("Idle");
  const [apiPayload, setApiPayload] = useState(null);
  const [dbRows, setDbRows] = useState([]);
  const [manualTarget, setManualTarget] = useState("120");
  const [eventLog, setEventLog] = useState([
    "Gateway connected",
    "system.tag.readBlocking(['[default]Machine/Speed'])",
    "Perspective session started",
  ]);
  const [trend, setTrend] = useState([68, 70, 67, 72, 74, 71, 76, 73, 78, 80]);

  const currentMachine = useMemo(
    () => machines.find((m) => m.id === selectedMachine) || machines[0],
    [machines, selectedMachine]
  );

  const machineSpeedTag = currentMachine?.speed ?? 0;
  const alarmText = getAlarm(currentMachine);
  const displayedStatus =
    alarmText !== "Normal" && currentMachine.status === "Running"
      ? "Alarm"
      : currentMachine.status;

  useEffect(() => {
    const timer = setInterval(() => {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.status === "Stopped") {
            return {
              ...m,
              speed: 0,
              temp: Math.max(60, m.temp - 1),
              tank: Math.max(5, m.tank - Math.round(Math.random() * 2)),
            };
          }

          const speed = Math.max(45, Math.min(100, m.speed + (Math.random() * 10 - 5)));
          const output = Math.max(0, Math.min(m.target, m.output + (Math.random() * 8 - 1)));
          const temp = Math.max(65, Math.min(96, m.temp + (Math.random() * 5 - 1.2)));
          const tank = Math.max(0, Math.min(100, m.tank + (Math.random() * 6 - 3)));

          return {
            ...m,
            speed: Math.round(speed),
            output: Math.round(output),
            temp: Math.round(temp),
            tank: Math.round(tank),
          };
        })
      );
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrend((prev) => [...prev.slice(-19), machineSpeedTag]);
    }, 1200);

    return () => clearInterval(timer);
  }, [machineSpeedTag]);

  function addLog(message) {
    setEventLog((prev) => [`${new Date().toLocaleTimeString()}  ${message}`, ...prev].slice(0, 10));
  }

  function readTag() {
    addLog(`Read tag [default]Machine/Speed = ${machineSpeedTag}`);
  }

  function writeStartTag(value) {
    setMachineStartTag(value);
    setMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachine
          ? {
              ...m,
              status: value === 1 ? "Running" : "Stopped",
              speed: value === 1 ? Math.max(55, m.speed || 60) : 0,
            }
          : m
      )
    );
    addLog(`Write tag [default]Machine/Start = ${value}`);
  }

  function acknowledgeAlarm() {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === selectedMachine
          ? { ...m, temp: Math.min(m.temp, 88), tank: Math.max(m.tank, 25) }
          : m
      )
    );
    addLog(`Alarm acknowledged for ${selectedMachine}`);
  }

  function runDatabaseQuery() {
    const rows = machines.map((m) => ({
      machine_id: m.id,
      status: getAlarm(m) !== "Normal" && m.status === "Running" ? "Alarm" : m.status,
      speed: m.speed,
      tank: `${m.tank}%`,
      efficiency: `${calculateEfficiency(m.output, m.target)}%`,
    }));
    setDbRows(rows);
    addLog("Run query: SELECT * FROM machines");
  }

  function callApi() {
    setApiStatus("Calling API...");
    addLog("system.net.httpGet('https://api.example.com/data')");
    setTimeout(() => {
      const payload = {
        line: currentMachine.id,
        timestamp: new Date().toLocaleTimeString(),
        quality: currentMachine.temp > 88 ? "Warning" : "Good",
        recommendedSpeed: currentMachine.temp > 88 ? 55 : 80,
      };
      setApiPayload(payload);
      setApiStatus("Success");
    }, 900);
  }

  function updateTarget() {
    const parsed = Number(manualTarget);
    if (!parsed || parsed < 1) return;
    setMachines((prev) =>
      prev.map((m) => (m.id === selectedMachine ? { ...m, target: parsed } : m))
    );
    addLog(`Target updated for ${selectedMachine}: ${parsed}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Ignition Perspective-Style HMI</h1>
            <p style={styles.subtitle}>
              Tanks, alarms, controls, live tags, mock DB query, API panel, and speed trend
            </p>
          </div>
          <div style={styles.buttonGroup}>
            {machines.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMachine(m.id)}
                style={{
                  ...styles.button,
                  backgroundColor: selectedMachine === m.id ? "#2563eb" : "#334155",
                }}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.bannerRow}>
          <div
            style={{
              ...styles.alarmBanner,
              backgroundColor: alarmText === "Normal" ? "#14532d" : "#7f1d1d",
            }}
          >
            <strong>Alarm Status:</strong> {alarmText}
          </div>
          <div style={styles.tagBanner}>[default]Machine/Speed = {machineSpeedTag}</div>
        </div>

        <div style={styles.gridTop}>
          <div style={styles.cardLarge}>
            <h2 style={styles.cardTitle}>Process Overview</h2>
            <div style={styles.processArea}>
              <Tank level={currentMachine.tank} label="Feed Tank" />

              <div style={styles.processCenter}>
                <div style={styles.machineBox}>
                  <div style={styles.machineName}>{currentMachine.id}</div>
                  <div
                    style={{
                      ...styles.statusLamp,
                      backgroundColor: statusColor(displayedStatus),
                    }}
                  />
                  <div style={styles.machineMeta}>Status: {displayedStatus}</div>
                  <div style={styles.machineMeta}>Temp: {currentMachine.temp}°F</div>
                  <div style={styles.machineMeta}>Speed: {machineSpeedTag}</div>
                </div>
                <div style={styles.pipeRow}>
                  <div style={styles.pipe} />
                  <div style={styles.pipeArrow}>▶</div>
                  <div style={styles.pipe} />
                </div>
              </div>

              <Tank
                level={Math.min(100, calculateEfficiency(currentMachine.output, currentMachine.target))}
                label="Output Tank"
              />
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={styles.label}>Speed</div>
                <div style={styles.bigValue}>{machineSpeedTag}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.label}>Temperature</div>
                <div style={styles.bigValue}>{currentMachine.temp}°F</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.label}>Tank Level</div>
                <div style={styles.bigValue}>{currentMachine.tank}%</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.label}>Efficiency</div>
                <div style={styles.bigValue}>
                  {calculateEfficiency(currentMachine.output, currentMachine.target)}%
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Controls</h2>
            <button onClick={readTag} style={styles.fullButton}>
              Read Speed Tag
            </button>
            <button onClick={() => writeStartTag(1)} style={styles.greenButtonWide}>
              Start Machine
            </button>
            <button onClick={() => writeStartTag(0)} style={styles.redButtonWide}>
              Stop Machine
            </button>
            <button onClick={acknowledgeAlarm} style={styles.fullButton}>
              Acknowledge Alarm
            </button>
            <button onClick={runDatabaseQuery} style={styles.fullButton}>
              Run DB Query
            </button>
            <button onClick={callApi} style={styles.fullButton}>
              Call API
            </button>

            <div style={styles.innerPanel}>
              <div style={styles.label}>Target Override</div>
              <div style={styles.row}>
                <input
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                  style={styles.input}
                />
                <button onClick={updateTarget} style={styles.button}>
                  Apply
                </button>
              </div>
              <div style={styles.smallText}>[default]Machine/Start = {machineStartTag}</div>
            </div>

            <div style={styles.innerPanel}>
              <div style={styles.label}>Logic Example</div>
              <div style={styles.codeBox}>{machineSpeedTag > 5 ? "High" : "Low"}</div>
            </div>
          </div>
        </div>

        <div style={styles.gridBottom}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Speed Trend</h2>
            <TrendChart data={trend} />
            <div style={styles.smallText}>Simulated live trend for selected machine speed</div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Database Query Results</h2>
            {dbRows.length === 0 ? (
              <p style={styles.smallText}>
                Press Run DB Query to simulate system.db.runQuery("SELECT * FROM machines")
              </p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Machine</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Speed</th>
                    <th style={styles.th}>Tank</th>
                    <th style={styles.th}>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {dbRows.map((row) => (
                    <tr key={row.machine_id}>
                      <td style={styles.td}>{row.machine_id}</td>
                      <td style={styles.td}>{row.status}</td>
                      <td style={styles.td}>{row.speed}</td>
                      <td style={styles.td}>{row.tank}</td>
                      <td style={styles.td}>{row.efficiency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={styles.gridBottom}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>API Panel</h2>
            <div style={styles.innerPanel}>
              <div style={styles.label}>API Status</div>
              <div style={styles.mediumValue}>{apiStatus}</div>
              {apiPayload && (
                <div style={styles.smallText}>
                  <div>Line: {apiPayload.line}</div>
                  <div>Time: {apiPayload.timestamp}</div>
                  <div>Quality: {apiPayload.quality}</div>
                  <div>Recommended Speed: {apiPayload.recommendedSpeed}</div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Event Log</h2>
            <div style={styles.innerPanel}>
              {eventLog.map((item, idx) => (
                <div key={idx} style={styles.logLine}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#020617",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: "24px",
  },
  container: {
    maxWidth: "1280px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  title: {
    fontSize: "32px",
    margin: 0,
  },
  subtitle: {
    color: "#cbd5e1",
    marginTop: "8px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  bannerRow: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: "16px",
    marginBottom: "20px",
  },
  alarmBanner: {
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "16px",
  },
  tagBanner: {
    borderRadius: "12px",
    padding: "14px 16px",
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    fontFamily: "monospace",
  },
  button: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    color: "white",
    cursor: "pointer",
  },
  gridTop: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  gridBottom: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  cardLarge: {
    backgroundColor: "#111827",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #1f2937",
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #1f2937",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "22px",
  },
  processArea: {
    display: "grid",
    gridTemplateColumns: "180px 1fr 180px",
    gap: "20px",
    alignItems: "center",
    marginBottom: "20px",
  },
  tankWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  tankLabel: {
    color: "#cbd5e1",
    fontSize: "14px",
  },
  tankOuter: {
    width: "90px",
    height: "220px",
    border: "3px solid #94a3b8",
    borderRadius: "14px",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
  },
  tankFill: {
    width: "100%",
    background: "linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)",
    transition: "height 0.8s ease",
  },
  tankValue: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  processCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  machineBox: {
    width: "260px",
    borderRadius: "16px",
    padding: "20px",
    backgroundColor: "#0f172a",
    border: "2px solid #334155",
    textAlign: "center",
  },
  machineName: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  statusLamp: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    margin: "0 auto 12px auto",
    boxShadow: "0 0 12px rgba(255,255,255,0.25)",
  },
  machineMeta: {
    color: "#cbd5e1",
    marginTop: "6px",
  },
  pipeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pipe: {
    width: "120px",
    height: "12px",
    borderRadius: "999px",
    backgroundColor: "#64748b",
  },
  pipeArrow: {
    fontSize: "22px",
    color: "#e2e8f0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginTop: "8px",
  },
  statBox: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "16px",
  },
  label: {
    fontSize: "14px",
    color: "#94a3b8",
    marginBottom: "8px",
  },
  bigValue: {
    fontSize: "28px",
    fontWeight: "bold",
  },
  mediumValue: {
    fontSize: "22px",
    fontWeight: "bold",
    marginTop: "10px",
  },
  smallText: {
    fontSize: "13px",
    color: "#cbd5e1",
    marginTop: "8px",
    lineHeight: 1.5,
  },
  innerPanel: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "12px",
  },
  row: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #475569",
    backgroundColor: "#0f172a",
    color: "white",
    minWidth: "120px",
  },
  fullButton: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#334155",
    color: "white",
  },
  greenButtonWide: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#16a34a",
    color: "white",
  },
  redButtonWide: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#dc2626",
    color: "white",
  },
  codeBox: {
    backgroundColor: "#0f172a",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "8px",
    fontFamily: "monospace",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #475569",
    padding: "10px",
  },
  td: {
    borderBottom: "1px solid #334155",
    padding: "10px",
  },
  logLine: {
    fontFamily: "monospace",
    fontSize: "13px",
    marginTop: "6px",
    color: "#e2e8f0",
  },
};