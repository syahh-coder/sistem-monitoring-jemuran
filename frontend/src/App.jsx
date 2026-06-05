import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const fmt = (value) =>
  value ? new Date(value).toLocaleString("id-ID") : "-";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [status, setStatus] = useState(null);
  const [hist, setHist] = useState([]);
  const [sess, setSess] = useState({ authenticated: false });
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState("");

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
        dry_threshold: Number(form.get("dry_threshold")),
        rain_threshold: Number(form.get("rain_threshold")),
        read_interval: Number(form.get("read_interval")),
        serial_port: form.get("serial_port"),
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
    if (!confirm("Hapus seluruh riwayat?")) return;

    try {
      await api.clear();
      await refresh();
    } catch (error) {
      setErr(error.message);
    }
  }

  return (
    <>
      <header>
        <div>
          <small>SMART HOME MONITORING</small>
          <h1>Sistem Monitoring Jemuran</h1>
        </div>

        <nav>
          <button onClick={() => setPage("dashboard")}>
            Dashboard
          </button>

          <button onClick={() => setPage("admin")}>
            Admin
          </button>
        </nav>
      </header>

      {err && <div className="error">{err}</div>}

      {page === "dashboard" ? (
        <Dashboard status={status} hist={hist} />
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
        />
      )}
    </>
  );
}

function Dashboard({ status, hist }) {
  return (
    <main>
      <section className="cards">
        <article
          className={`card hero ${(status?.status || "").toLowerCase()}`}
        >
          <small>STATUS CUACA</small>
          <h2>{status?.status || "-"}</h2>
          <p>{status?.laundry_condition || "-"}</p>
        </article>

        <article className="card">
          <small>NILAI SENSOR</small>
          <h2>{status?.sensor ?? "-"}</h2>
          <p>Rentang 0–1023</p>
        </article>

        <article className="card">
            <small>KONDISI JEMURAN</small>
            <h2>{status?.laundry_condition || "-"}</h2>
            <p>
            Indikator:{" "}
            {status?.status === "CERAH"
            ? "Hijau"
            : status?.status === "GERIMIS"
            ? "Kuning"
            : status?.status === "HUJAN"
            ? "Merah"
            : "-"}
            </p>
        </article>

        <article className="card">
          <small>UPDATE</small>
          <h3>{fmt(status?.updated_at)}</h3>
          <p>Buzzer: {status?.buzzer_active ? "Aktif" : "Mati"}</p>
        </article>
      </section>

      {status?.status === "HUJAN" && (
        <div className="alert">
          ⚠ Segera angkat pakaian!
        </div>
      )}

      <section className="card">
        <h2>Riwayat Kondisi</h2>

        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Sensor</th>
              <th>Status</th>
              <th>Kondisi</th>
              <th>Sumber</th>
            </tr>
          </thead>

          <tbody>
            {hist.length === 0 ? (
              <tr>
                <td colSpan="5">Belum ada data riwayat.</td>
              </tr>
            ) : (
              hist.map((item) => (
                <tr key={item.id}>
                  <td>{fmt(item.recorded_at)}</td>
                  <td>{item.sensor_value}</td>
                  <td>{item.weather_status}</td>
                  <td>{item.laundry_condition}</td>
                  <td>{item.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function AdminPage({
  sess,
  settings,
  status,
  hist,
  login,
  logout,
  save,
  mock,
  setAuto,
  deleteOne,
  clearHistory,
}) {
  if (!sess.authenticated) {
    return (
      <main className="narrow">
        <section className="card">
          <h2>Login Admin</h2>

          <form onSubmit={login}>
            <label>
              Username
              <input
                name="username"
                defaultValue="admin"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                defaultValue="admin123"
                required
              />
            </label>

            <button>Login</button>
          </form>

          <p>Akun demo: admin / admin123</p>
        </section>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="narrow">
        <p>Memuat pengaturan...</p>
      </main>
    );
  }

  return (
    <main className="narrow">
      <section className="card">
        <div className="row">
          <h2>Informasi Sistem</h2>
          <button onClick={logout}>Logout</button>
        </div>

        <p>
          <b>Status Perangkat:</b>{" "}
          {status?.device_connected ? "Terhubung" : "Terputus"}
        </p>

        <p>
          <b>Sumber Data:</b> {status?.source || "-"}
        </p>

        <p>
          <b>Update Terakhir:</b> {fmt(status?.updated_at)}
        </p>
      </section>

      <section className="card mock">
        <div>
          <h2>Kontrol Simulasi</h2>
          <p>
            Digunakan selama hardware belum tersedia.
          </p>
        </div>

        <div>
          <button onClick={() => mock(920)}>
            Cerah
          </button>

          <button onClick={() => mock(650)}>
            Gerimis
          </button>

          <button onClick={() => mock(250)}>
            Hujan
          </button>

          <button onClick={setAuto}>
            Otomatis
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Pengaturan Sistem</h2>

        <form onSubmit={save}>
          <label>
            Threshold Cerah
            <input
              type="number"
              name="dry_threshold"
              defaultValue={settings.dry_threshold}
              required
            />
          </label>

          <label>
            Threshold Hujan
            <input
              type="number"
              name="rain_threshold"
              defaultValue={settings.rain_threshold}
              required
            />
          </label>

          <label>
            Interval Pembacaan (detik)
            <input
              type="number"
              name="read_interval"
              defaultValue={settings.read_interval}
              required
            />
          </label>

          <label>
            Port Serial
            <input
              name="serial_port"
              defaultValue={settings.serial_port}
              required
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              name="buzzer_enabled"
              defaultChecked={settings.buzzer_enabled}
            />
            Aktifkan buzzer
          </label>

          <button>Simpan Pengaturan</button>
        </form>
      </section>

      <section className="card">
        <div className="row">
          <h2>Kelola Riwayat</h2>

          <button
            className="danger"
            onClick={clearHistory}
          >
            Hapus Seluruh Riwayat
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {hist.length === 0 ? (
              <tr>
                <td colSpan="3">Belum ada data riwayat.</td>
              </tr>
            ) : (
              hist.map((item) => (
                <tr key={item.id}>
                  <td>{fmt(item.recorded_at)}</td>
                  <td>{item.weather_status}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => deleteOne(item.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

