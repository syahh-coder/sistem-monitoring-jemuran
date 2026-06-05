import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Activity, Wifi, WifiOff, Clock, Volume2, VolumeX,
  CloudRain, Cloud, Sun, Database, Settings, Trash2, LogOut,
  RefreshCw, Shield, BarChart2, Play, ServerCrash,
} from "lucide-react";
import { api } from "./api";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const fmt = (value) =>
  value ? new Date(value).toLocaleString("id-ID") : "-";

function weatherIcon(status, size = 22) {
  if (status === "CERAH")   return <Sun   size={size} />;
  if (status === "GERIMIS") return <Cloud size={size} />;
  if (status === "HUJAN")   return <CloudRain size={size} />;
  return <Activity size={size} />;
}

function statusClass(status) {
  if (status === "CERAH")   return "cerah";
  if (status === "GERIMIS") return "gerimis";
  if (status === "HUJAN")   return "hujan";
  return "";
}

function StatusBadge({ status }) {
  const cls = statusClass(status);
  return (
    <span className={`badge badge-${cls || "default"}`}>
      {weatherIcon(status, 11)}
      {status || "-"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* App root                                                             */
/* ------------------------------------------------------------------ */
export default function App() {
  const [page, setPage]       = useState("dashboard");
  const [status, setStatus]   = useState(null);
  const [hist, setHist]       = useState([]);
  const [sess, setSess]       = useState({ authenticated: false });
  const [settings, setSettings] = useState(null);
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [statusData, historyData] = await Promise.all([
        api.status(),
        api.history(),
      ]);
      setStatus(statusData);
      setHist(historyData);
      setErr("");
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSess = useCallback(async () => {
    try {
      const sessionData = await api.session();
      setSess(sessionData);
      if (sessionData.authenticated) {
        setSettings(await api.settings());
      }
    } catch {
      setSess({ authenticated: false });
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshSess();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh, refreshSess]);

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.login(form.get("username"), form.get("password"));
      await refreshSess();
      setErr("");
    } catch (error) {
      setErr(error.message);
    }
  }

  async function logout() {
    await api.logout();
    setSess({ authenticated: false });
    setSettings(null);
    setPage("dashboard");
  }

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.saveSettings({
        dry_threshold:  Number(form.get("dry_threshold")),
        rain_threshold: Number(form.get("rain_threshold")),
        read_interval:  Number(form.get("read_interval")),
        serial_port:    form.get("serial_port"),
        buzzer_enabled: form.get("buzzer_enabled") === "on",
      });
      setSettings(result.settings);
      setErr("");
      alert("Pengaturan berhasil disimpan.");
    } catch (error) {
      setErr(error.message);
    }
  }

  async function mock(sensorValue) {
    try {
      await api.setMock(sensorValue);
      await refresh();
    } catch (error) {
      setErr(error.message);
    }
  }

  async function setAuto() {
    try {
      await api.setAuto();
      await refresh();
    } catch (error) {
      setErr(error.message);
    }
  }

  async function deleteOne(id) {
    if (!confirm("Hapus data riwayat ini?")) return;
    try {
      await api.deleteOne(id);
      await refresh();
    } catch (error) {
      setErr(error.message);
    }
  }

  async function clearHistory() {
    if (!confirm("Hapus seluruh riwayat? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await api.clear();
      await refresh();
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <>
      <Header page={page} setPage={setPage} />

      {err && (
        <div className="error-banner">
          <div className="error-banner-inner">
            <ServerCrash size={18} />
            <span>
              {err.includes("Failed to fetch")
                ? "Tidak dapat terhubung ke backend. Pastikan server Flask sedang berjalan."
                : err}
            </span>
          </div>
        </div>
      )}

      {page === "dashboard" ? (
        <Dashboard status={status} hist={hist} loading={loading} />
      ) : (
        <AdminPage
          sess={sess}
          settings={settings}
          status={status}
          hist={hist}
          login={login}
          logout={logout}
          save={save}
          mock={mock}
          setAuto={setAuto}
          deleteOne={deleteOne}
          clearHistory={clearHistory}
          err={err}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                               */
/* ------------------------------------------------------------------ */
function Header({ page, setPage }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">
            <Sun size={20} />
          </div>
          <div className="header-title">
            <span className="eyebrow">Smart Home Monitoring</span>
            <h1>Sistem Monitoring Jemuran</h1>
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-btn ${page === "dashboard" ? "active" : ""}`}
            onClick={() => setPage("dashboard")}
          >
            <BarChart2 size={16} />
            Dashboard
          </button>
          <button
            className={`nav-btn ${page === "admin" ? "active" : ""}`}
            onClick={() => setPage("admin")}
          >
            <Shield size={16} />
            Admin
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard (public)                                                   */
/* ------------------------------------------------------------------ */
function Dashboard({ status, hist, loading }) {
  if (loading) {
    return (
      <div className="page-content">
        <div className="cards-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
        <div className="card">
          <div className="skeleton skeleton-row" style={{ width: "40%", marginBottom: 20 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  const sc = statusClass(status?.status);

  return (
    <div className="page-content">
      {status?.status === "HUJAN" && (
        <div className="rain-alert">
          <AlertTriangle size={22} />
          Hujan terdeteksi — segera angkat pakaian!
        </div>
      )}

      <div className="cards-grid">
        {/* Card 1 – Status Cuaca */}
        <div className={`card status-card ${sc}`}>
          <div className="card-label">
            <Activity size={13} />
            STATUS CUACA
          </div>
          <div className="status-icon">
            {weatherIcon(status?.status, 22)}
          </div>
          <div className="card-value">{status?.status || "-"}</div>
          <div className="card-sub">{status?.laundry_condition || "-"}</div>
        </div>

        {/* Card 2 – Nilai Sensor */}
        <div className="card">
          <div className="card-label">
            <Activity size={13} />
            NILAI SENSOR
          </div>
          <div className="card-value">{status?.sensor ?? "-"}</div>
          <div className="card-sub">Rentang 0 – 1023</div>
          {status?.sensor != null && (
            <div className="sensor-bar-track">
              <div
                className="sensor-bar-fill"
                style={{ width: `${(status.sensor / 1023) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Card 3 – Status Perangkat */}
        <div className="card">
          <div className="card-label">
            {status?.device_connected
              ? <Wifi size={13} />
              : <WifiOff size={13} />}
            PERANGKAT
          </div>
          <div className="card-value" style={{ fontSize: "1.25rem" }}>
            <span
              className={`device-pill ${status?.device_connected ? "connected" : "disconnected"}`}
            >
              <span className="dot" />
              {status?.device_connected ? "Terhubung" : "Terputus"}
            </span>
          </div>
          <div className="card-sub">
            Sumber data:{" "}
            <span className="source-tag">
              <Database size={11} />
              {status?.source || "-"}
            </span>
          </div>
        </div>

        {/* Card 4 – Update Terakhir */}
        <div className="card">
          <div className="card-label">
            <Clock size={13} />
            UPDATE TERAKHIR
          </div>
          <div className="card-value" style={{ fontSize: "1rem", fontWeight: 600 }}>
            {fmt(status?.updated_at)}
          </div>
          <div className="card-sub mt-8">
            Buzzer:{" "}
            <span className={`buzzer-pill ${status?.buzzer_active ? "on" : "off"}`}>
              {status?.buzzer_active
                ? <><Volume2 size={12} /> Aktif</>
                : <><VolumeX size={12} /> Mati</>}
            </span>
          </div>
        </div>
      </div>

      {/* History table */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">
            <BarChart2 size={18} />
            Riwayat Kondisi Cuaca
          </h2>
        </div>

        <HistoryTable hist={hist} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History table (shared)                                               */
/* ------------------------------------------------------------------ */
function HistoryTable({ hist, onDelete }) {
  if (hist.length === 0) {
    return (
      <div className="empty-state">
        <BarChart2 size={36} />
        <p>Belum ada riwayat kondisi cuaca.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Nilai Sensor</th>
            <th>Status</th>
            <th>Kondisi Jemuran</th>
            <th>Sumber</th>
            {onDelete && <th className="table-action-cell">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {hist.map((item) => (
            <tr key={item.id}>
              <td>{fmt(item.recorded_at)}</td>
              <td>{item.sensor_value}</td>
              <td><StatusBadge status={item.weather_status} /></td>
              <td>{item.laundry_condition}</td>
              <td>
                <span className="source-tag">
                  <Database size={10} />
                  {item.source}
                </span>
              </td>
              {onDelete && (
                <td className="table-action-cell">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin page                                                           */
/* ------------------------------------------------------------------ */
function AdminPage({
  sess, settings, status, hist,
  login, logout, save, mock, setAuto, deleteOne, clearHistory, err,
}) {
  if (!sess.authenticated) {
    return (
      <div className="page-narrow">
        <LoginCard login={login} err={err} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="page-content">
        <div className="loading-page">
          <div className="spinner" />
          <span>Memuat pengaturan sistem…</span>
        </div>
      </div>
    );
  }

  const isMock = status?.source === "mock";

  return (
    <div className="page-content">
      <div className="admin-page-header">
        <h2 className="admin-page-title">
          <Shield size={22} />
          Panel Admin
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          <LogOut size={15} />
          Logout
        </button>
      </div>

      <div className="admin-grid">
        {/* System Info */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Activity size={16} />
              Informasi Sistem
            </h3>
          </div>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key"><Wifi size={14} /> Status Perangkat</span>
              <span
                className={`device-pill ${status?.device_connected ? "connected" : "disconnected"}`}
              >
                <span className="dot" />
                {status?.device_connected ? "Terhubung" : "Terputus"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key"><Database size={14} /> Sumber Data</span>
              <span className="source-tag">
                <Database size={11} />
                {status?.source || "-"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key"><Clock size={14} /> Update Terakhir</span>
              <span className="info-val">{fmt(status?.updated_at)}</span>
            </div>
            <div className="info-row">
              <span className="info-key"><Volume2 size={14} /> Status Buzzer</span>
              <span className={`buzzer-pill ${status?.buzzer_active ? "on" : "off"}`}>
                {status?.buzzer_active
                  ? <><Volume2 size={12} /> Aktif</>
                  : <><VolumeX size={12} /> Mati</>}
              </span>
            </div>
          </div>
        </div>

        {/* Simulation — mock only */}
        {isMock && (
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <Play size={16} />
                Kontrol Simulasi
              </h3>
              <span className="source-tag">
                <Database size={11} /> mock mode
              </span>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              Digunakan selama hardware belum tersedia. Pilih kondisi yang ingin disimulasikan.
            </p>
            <div className="sim-grid">
              <button
                className="btn sim-btn-cerah"
                onClick={() => mock(920)}
              >
                <Sun size={15} /> Cerah
              </button>
              <button
                className="btn sim-btn-gerimis"
                onClick={() => mock(650)}
              >
                <Cloud size={15} /> Gerimis
              </button>
              <button
                className="btn sim-btn-hujan"
                onClick={() => mock(250)}
              >
                <CloudRain size={15} /> Hujan
              </button>
              <button
                className="btn btn-secondary"
                onClick={setAuto}
              >
                <RefreshCw size={15} /> Otomatis
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <Settings size={16} />
              Pengaturan Sistem
            </h3>
          </div>
          <form onSubmit={save} className="form-grid">
            <div className="form-row-2">
              <div className="form-field">
                <label className="form-label" htmlFor="dry_threshold">
                  <Sun size={14} /> Threshold Cerah
                </label>
                <input
                  id="dry_threshold"
                  className="form-input"
                  type="number"
                  name="dry_threshold"
                  defaultValue={settings.dry_threshold}
                  required
                />
                <span className="form-hint">
                  Nilai sensor di atas angka ini dianggap cerah (0–1023)
                </span>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="rain_threshold">
                  <CloudRain size={14} /> Threshold Hujan
                </label>
                <input
                  id="rain_threshold"
                  className="form-input"
                  type="number"
                  name="rain_threshold"
                  defaultValue={settings.rain_threshold}
                  required
                />
                <span className="form-hint">
                  Nilai sensor di bawah angka ini dianggap hujan (0–1023)
                </span>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label className="form-label" htmlFor="read_interval">
                  <Clock size={14} /> Interval Pembacaan (detik)
                </label>
                <input
                  id="read_interval"
                  className="form-input"
                  type="number"
                  name="read_interval"
                  defaultValue={settings.read_interval}
                  required
                />
                <span className="form-hint">Seberapa sering sensor dibaca</span>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="serial_port">
                  <Activity size={14} /> Port Serial
                </label>
                <input
                  id="serial_port"
                  className="form-input"
                  name="serial_port"
                  defaultValue={settings.serial_port}
                  placeholder="Contoh: COM3 atau /dev/ttyUSB0"
                  required
                />
                <span className="form-hint">Port USB Arduino yang terhubung</span>
              </div>
            </div>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="buzzer_enabled"
                defaultChecked={settings.buzzer_enabled}
              />
              <span className="checkbox-label">
                Aktifkan buzzer saat hujan terdeteksi
              </span>
            </label>

            <button type="submit" className="btn btn-primary btn-lg">
              <Settings size={16} />
              Simpan Pengaturan
            </button>
          </form>
        </div>

        {/* History management */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <BarChart2 size={16} />
              Kelola Riwayat
            </h3>
            <button
              className="btn btn-danger btn-sm"
              onClick={clearHistory}
            >
              <Trash2 size={14} />
              Hapus Seluruh Riwayat
            </button>
          </div>

          <HistoryTable hist={hist} onDelete={deleteOne} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Login card                                                           */
/* ------------------------------------------------------------------ */
function LoginCard({ login, err }) {
  return (
    <div className="card">
      <div className="login-icon">
        <Shield size={26} />
      </div>
      <h2 className="login-title">Login Admin</h2>
      <p className="login-sub">Masuk untuk mengakses panel pengelolaan sistem</p>

      {err && (
        <div className="error-banner-inner" style={{ marginBottom: 16, borderRadius: 8 }}>
          <AlertTriangle size={16} />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={login} className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="form-input"
            name="username"
            defaultValue="admin"
            autoComplete="username"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="form-input"
            type="password"
            name="password"
            defaultValue="admin123"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg">
          <LogOut size={16} style={{ transform: "rotate(180deg)" }} />
          Login
        </button>
      </form>

      <div className="demo-note">
        <strong>Akun Demo (Development)</strong><br />
        Username: <code>admin</code> &nbsp;|&nbsp; Password: <code>admin123</code>
      </div>
    </div>
  );
}
